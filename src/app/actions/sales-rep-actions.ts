'use server';

import { db } from '@/db';
import {
  storeVisits,
  visitOrders,
  orderItems,
  returnItems,
  salesStock,
  items,
} from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { getLocalDateString } from '@/lib/utils';

export async function checkInVisitAction(visitId: string, latitude?: number, longitude?: number) {
  await db.update(storeVisits)
    .set({
      status: 'CHECKED_IN',
      checkinTime: new Date(),
      latitude: latitude || null,
      longitude: longitude || null,
    })
    .where(eq(storeVisits.id, visitId));

  revalidatePath('/sales');
  revalidatePath('/monitor-sales');
  revalidatePath('/');
  return { success: true };
}

export async function processDropAndReturnAction(data: {
  visitId: string;
  storeId: string;
  salesId: string;
  transactionType?: 'DIRECT_DROP_BILL' | 'DROP_AND_COLLECT_PREV' | 'DROP_ONLY' | 'COLLECT_ONLY';
  dropItems: Array<{
    itemId: string;
    unitId?: string;
    unitName: string;
    conversionRate: number;
    quantity: number;
    quantityBase: number;
    unitPrice: number;
    subtotal: number;
  }>;
  returnItemsList: Array<{
    itemId: string;
    unitName: string;
    conversionRate: number;
    quantity: number;
    quantityBase: number;
    unitPrice?: number;
    subtotal?: number;
    condition: 'GOOD' | 'BROKEN';
    reason?: string;
  }>;
  settleInvoiceIds?: string[];
  collectedAmount?: number;
  discountAmount: number;
  paymentMethod: 'CASH' | 'TRANSFER' | 'TEMPO';
  notes?: string;
}) {
  const transactionType = data.transactionType || 'DIRECT_DROP_BILL';
  const invoiceNumber = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  // 1. Calculate totals for today's drop and deduct returns
  const totalAmount = data.dropItems.reduce((acc, curr) => acc + curr.subtotal, 0);
  const totalReturnAmount = (data.returnItemsList || []).reduce((acc, curr) => {
    return acc + (curr.subtotal || (curr.quantity * (curr.unitPrice || 0)));
  }, 0);

  // In DIRECT_DROP_BILL and DROP_ONLY, return directly offsets today's drop bill
  let netAmount = Math.max(0, totalAmount - (data.discountAmount || 0));
  if (transactionType === 'DIRECT_DROP_BILL' || transactionType === 'DROP_ONLY') {
    netAmount = Math.max(0, totalAmount - totalReturnAmount - (data.discountAmount || 0));
  }

  // Determine payment status & collected cash/transfer for this order
  let paymentStatus: 'PAID' | 'PENDING' | 'PARTIAL' = 'PAID';
  let collectedAmount = Number(data.collectedAmount) || 0;

  if (transactionType === 'DROP_ONLY') {
    paymentStatus = 'PENDING';
    collectedAmount = 0;
  } else if (transactionType === 'DROP_AND_COLLECT_PREV') {
    paymentStatus = 'PENDING'; // New drop is pending/tempo
    // collectedAmount represents the cash collected from previous invoices
  } else if (transactionType === 'COLLECT_ONLY') {
    paymentStatus = 'PAID';
    // collectedAmount represents cash collected from previous invoices
  } else {
    // DIRECT_DROP_BILL
    paymentStatus = data.paymentMethod === 'TEMPO' ? 'PENDING' : 'PAID';
    if (data.paymentMethod !== 'TEMPO' && !data.collectedAmount) {
      collectedAmount = netAmount;
    }
  }

  // 2. Create Order / Transaction Record
  const newOrder = await db.insert(visitOrders).values({
    invoiceNumber,
    visitId: data.visitId,
    salesId: data.salesId,
    storeId: data.storeId,
    transactionType,
    totalAmount,
    discountAmount: data.discountAmount || 0,
    taxAmount: 0,
    netAmount,
    collectedAmount,
    settledInvoiceIds:
      data.settleInvoiceIds && data.settleInvoiceIds.length > 0
        ? JSON.stringify(data.settleInvoiceIds)
        : null,
    paymentStatus,
    paymentMethod: transactionType === 'DROP_ONLY' ? 'TEMPO' : data.paymentMethod,
    notes: data.notes,
  }).returning().get();

  // 3. Mark Settled Previous Invoices as PAID
  if (data.settleInvoiceIds && data.settleInvoiceIds.length > 0) {
    for (const invId of data.settleInvoiceIds) {
      await db.update(visitOrders)
        .set({
          paymentStatus: 'PAID',
          paymentMethod: data.paymentMethod,
          notes: sql`COALESCE(notes, '') || ' [Dilunasi via ' || ${invoiceNumber} || ']'`,
        })
        .where(eq(visitOrders.id, invId));
    }
  }

  // 4. Insert Order Items & Deduct from Sales Rep Stock (if any dropped)
  for (const item of data.dropItems) {
    await db.insert(orderItems).values({
      orderId: newOrder.id,
      itemId: item.itemId,
      unitId: item.unitId,
      unitName: item.unitName,
      conversionRate: item.conversionRate,
      quantity: item.quantity,
      quantityBase: item.quantityBase,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    });

    // Deduct from sales rep stock
    const currentSalesStock = await db.query.salesStock.findFirst({
      where: and(eq(salesStock.userId, data.salesId), eq(salesStock.itemId, item.itemId)),
    });

    if (currentSalesStock) {
      await db.update(salesStock)
        .set({
          quantity: Math.max(0, currentSalesStock.quantity - item.quantityBase),
          updatedAt: new Date(),
        })
        .where(eq(salesStock.id, currentSalesStock.id));
    }
  }

  // 5. Process Return Items
  for (const ret of data.returnItemsList) {
    const isGood = ret.condition === 'GOOD';

    await db.insert(returnItems).values({
      orderId: newOrder.id,
      visitId: data.visitId,
      salesId: data.salesId,
      storeId: data.storeId,
      itemId: ret.itemId,
      unitName: ret.unitName,
      conversionRate: ret.conversionRate,
      quantity: ret.quantity,
      quantityBase: ret.quantityBase,
      unitPrice: ret.unitPrice || 0,
      subtotal: ret.subtotal || 0,
      condition: ret.condition,
      reason: ret.reason || 'Returned by store',
      restocked: isGood,
    });

    // If GOOD condition, restock back into sales rep bag stock
    if (isGood) {
      const existingStock = await db.query.salesStock.findFirst({
        where: and(eq(salesStock.userId, data.salesId), eq(salesStock.itemId, ret.itemId)),
      });

      if (existingStock) {
        await db.update(salesStock)
          .set({
            quantity: existingStock.quantity + ret.quantityBase,
            updatedAt: new Date(),
          })
          .where(eq(salesStock.id, existingStock.id));
      } else {
        await db.insert(salesStock).values({
          userId: data.salesId,
          itemId: ret.itemId,
          quantity: ret.quantityBase,
        });
      }
    }
  }

  // 6. Mark Current Visit as Completed
  await db.update(storeVisits)
    .set({
      status: 'COMPLETED',
      checkoutTime: new Date(),
      notes: data.notes || `Completed transaction ${invoiceNumber} (${transactionType})`,
    })
    .where(eq(storeVisits.id, data.visitId));

  // 7. Auto-Schedule Future Billing Visit if this order is TEMPO / PENDING
  if (paymentStatus === 'PENDING') {
    const currentVisit = await db.query.storeVisits.findFirst({
      where: eq(storeVisits.id, data.visitId),
    });

    const twoDaysLater = new Date();
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    const targetBillingDate =
      currentVisit?.billingDate || getLocalDateString(twoDaysLater);

    // Check if a scheduled visit already exists on the billing date for this store & sales
    const existingBillingVisit = await db.query.storeVisits.findFirst({
      where: and(
        eq(storeVisits.storeId, data.storeId),
        eq(storeVisits.salesId, data.salesId),
        eq(storeVisits.visitDate, targetBillingDate)
      ),
    });

    if (!existingBillingVisit) {
      await db.insert(storeVisits).values({
        salesId: data.salesId,
        storeId: data.storeId,
        visitDate: targetBillingDate,
        deliveryDate: currentVisit?.deliveryDate || currentVisit?.visitDate || getLocalDateString(),
        billingDate: targetBillingDate,
        assignedStockQty: 0,
        targetQuantity: 0, // Murni jadwal penagihan
        sequenceOrder: 99,
        status: 'SCHEDULED',
        notes: `Jadwal Penagihan Nota Tempo #${invoiceNumber}`,
      });
    }
  }

  revalidatePath('/sales');
  revalidatePath('/monitor-sales');
  revalidatePath('/reports');
  revalidatePath('/');

  return { success: true, order: newOrder, invoiceNumber };
}

export async function updateVisitTargetQtyAction(visitId: string, targetQuantity: number) {
  await db.update(storeVisits)
    .set({
      targetQuantity: Number(targetQuantity) || 0,
    })
    .where(eq(storeVisits.id, visitId));

  revalidatePath('/sales');
  revalidatePath('/monitor-sales');
  return { success: true };
}


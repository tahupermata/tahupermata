'use server';

import { db } from '@/db';
import { items, salesStock, stockMutations, itemBatches, users, storeVisits } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';

export async function assignStockToSalesAction(data: {
  userId: string;
  itemId: string;
  batchId?: string;
  quantityBase: number; // in base units
  unitName?: string;
  notes?: string;
}) {
  const currentUser = await getCurrentUser();

  // 1. Fetch item and check warehouse availability
  const item = await db.query.items.findFirst({
    where: eq(items.id, data.itemId),
  });

  if (!item) {
    return { error: 'Item not found' };
  }

  if (item.stockWarehouse < data.quantityBase) {
    return {
      error: `Insufficient warehouse stock. Available: ${item.stockWarehouse} ${item.baseUnit}, Requested: ${data.quantityBase} ${item.baseUnit}`,
    };
  }

  // If specific batch is selected, verify and deduct from itemBatches
  let batchInfo: any = null;
  if (data.batchId) {
    const batch = await db.query.itemBatches.findFirst({
      where: eq(itemBatches.id, data.batchId),
    });

    if (!batch) {
      return { error: 'Batch not found' };
    }

    if (batch.currentQuantity < data.quantityBase) {
      return {
        error: `Stok pada batch ${batch.batchNo} tidak mencukupi (Tersedia: ${batch.currentQuantity} ${item.baseUnit}, Diminta: ${data.quantityBase} ${item.baseUnit})`,
      };
    }

    await db.update(itemBatches)
      .set({
        currentQuantity: batch.currentQuantity - data.quantityBase,
        updatedAt: new Date(),
      })
      .where(eq(itemBatches.id, data.batchId));

    batchInfo = batch;
  }

  // 2. Deduct from master item warehouse stock
  await db.update(items)
    .set({
      stockWarehouse: item.stockWarehouse - data.quantityBase,
      updatedAt: new Date(),
    })
    .where(eq(items.id, data.itemId));

  // 3. Add to sales rep stock (upsert matching userId, itemId, and batchId)
  const existingSalesStock = await db.query.salesStock.findFirst({
    where: and(
      eq(salesStock.userId, data.userId),
      eq(salesStock.itemId, data.itemId),
      data.batchId ? eq(salesStock.batchId, data.batchId) : isNull(salesStock.batchId)
    ),
  });

  if (existingSalesStock) {
    await db.update(salesStock)
      .set({
        quantity: existingSalesStock.quantity + data.quantityBase,
        updatedAt: new Date(),
      })
      .where(eq(salesStock.id, existingSalesStock.id));
  } else {
    await db.insert(salesStock).values({
      userId: data.userId,
      itemId: data.itemId,
      batchId: data.batchId || null,
      quantity: data.quantityBase,
    });
  }

  // 4. Record stock mutation
  const notePrefix = batchInfo ? `[Batch: ${batchInfo.batchNo} (Exp: ${batchInfo.expireDate})] ` : '';
  await db.insert(stockMutations).values({
    itemId: data.itemId,
    batchId: data.batchId || null,
    type: 'ASSIGN_TO_SALES',
    quantity: -data.quantityBase,
    referenceId: data.userId,
    notes: (notePrefix + (data.notes || 'Assigned to sales rep')).trim(),
    performedBy: currentUser?.id,
  });

  revalidatePath('/assign-stock');
  revalidatePath('/stock');
  revalidatePath('/sales');
  return { success: true };
}

export async function returnStockToWarehouseAction(data: {
  salesStockId?: string;
  userId: string;
  itemId: string;
  batchId?: string;
  quantityBase: number;
  notes?: string;
}) {
  const currentUser = await getCurrentUser();

  // Check sales rep current stock
  let salesStockRecord: any = null;
  if (data.salesStockId) {
    salesStockRecord = await db.query.salesStock.findFirst({
      where: eq(salesStock.id, data.salesStockId),
    });
  } else {
    salesStockRecord = await db.query.salesStock.findFirst({
      where: and(
        eq(salesStock.userId, data.userId),
        eq(salesStock.itemId, data.itemId),
        data.batchId ? eq(salesStock.batchId, data.batchId) : isNull(salesStock.batchId)
      ),
    });
  }

  if (!salesStockRecord || salesStockRecord.quantity < data.quantityBase) {
    return { error: 'Sales representative does not have this quantity in vehicle/bag stock' };
  }

  // Deduct from sales stock
  if (salesStockRecord.quantity - data.quantityBase <= 0) {
    await db.delete(salesStock).where(eq(salesStock.id, salesStockRecord.id));
  } else {
    await db.update(salesStock)
      .set({
        quantity: salesStockRecord.quantity - data.quantityBase,
        updatedAt: new Date(),
      })
      .where(eq(salesStock.id, salesStockRecord.id));
  }

  // If has batchId, return to itemBatches
  const targetBatchId = salesStockRecord.batchId || data.batchId;
  let batchInfo: any = null;
  if (targetBatchId) {
    const batch = await db.query.itemBatches.findFirst({
      where: eq(itemBatches.id, targetBatchId),
    });
    if (batch) {
      await db.update(itemBatches)
        .set({
          currentQuantity: batch.currentQuantity + data.quantityBase,
          updatedAt: new Date(),
        })
        .where(eq(itemBatches.id, targetBatchId));
      batchInfo = batch;
    }
  }

  // Add back to warehouse
  const item = await db.query.items.findFirst({
    where: eq(items.id, data.itemId),
  });

  if (item) {
    await db.update(items)
      .set({
        stockWarehouse: item.stockWarehouse + data.quantityBase,
        updatedAt: new Date(),
      })
      .where(eq(items.id, data.itemId));
  }

  // Record mutation
  const notePrefix = batchInfo ? `[Batch: ${batchInfo.batchNo} (Exp: ${batchInfo.expireDate})] ` : '';
  await db.insert(stockMutations).values({
    itemId: data.itemId,
    batchId: targetBatchId || null,
    type: 'RETURN_FROM_SALES',
    quantity: data.quantityBase,
    referenceId: data.userId,
    notes: (notePrefix + (data.notes || 'Returned from sales rep to main warehouse')).trim(),
    performedBy: currentUser?.id,
  });

  revalidatePath('/assign-stock');
  revalidatePath('/stock');
  revalidatePath('/sales');
  return { success: true };
}

export async function createStoreScheduleAndStockAction(data: {
  salesId: string;
  storeId: string;
  itemId: string;
  batchId?: string;
  quantityBase: number;
  deliveryDate: string; // YYYY-MM-DD
  billingDate: string; // YYYY-MM-DD
  autoDeductWarehouseStock?: boolean;
  notes?: string;
}): Promise<{ success: boolean; error?: string; visit?: any }> {
  try {
    const currentUser = await getCurrentUser();

    // 1. Fetch item and check warehouse availability
    const item = await db.query.items.findFirst({
      where: eq(items.id, data.itemId),
    });

    if (!item) {
      return { success: false, error: 'Produk tidak ditemukan di database.' };
    }

    let batchInfo: any = null;
    if (data.batchId) {
      const batch = await db.query.itemBatches.findFirst({
        where: eq(itemBatches.id, data.batchId),
      });

      if (!batch) {
        return { success: false, error: 'Batch produk tidak ditemukan.' };
      }

      if (batch.currentQuantity < data.quantityBase) {
        return {
          success: false,
          error: `Stok pada batch ${batch.batchNo} tidak mencukupi! Tersedia: ${batch.currentQuantity} ${item.baseUnit}, Diminta: ${data.quantityBase} ${item.baseUnit}`,
        };
      }
      batchInfo = batch;
    }

    // If auto-deduct is enabled, check warehouse total stock
    if (data.autoDeductWarehouseStock && data.quantityBase > 0) {
      if (item.stockWarehouse < data.quantityBase) {
        return {
          success: false,
          error: `Stok di gudang utama tidak mencukupi! Tersedia: ${item.stockWarehouse} ${item.baseUnit}, Diminta: ${data.quantityBase} ${item.baseUnit}`,
        };
      }

      // Deduct from batch if selected
      if (data.batchId && batchInfo) {
        await db.update(itemBatches)
          .set({
            currentQuantity: batchInfo.currentQuantity - data.quantityBase,
            updatedAt: new Date(),
          })
          .where(eq(itemBatches.id, data.batchId));
      }

      // Deduct warehouse
      await db.update(items)
        .set({
          stockWarehouse: item.stockWarehouse - data.quantityBase,
          updatedAt: new Date(),
        })
        .where(eq(items.id, data.itemId));

      // Add to sales stock
      const existingSalesStock = await db.query.salesStock.findFirst({
        where: and(
          eq(salesStock.userId, data.salesId),
          eq(salesStock.itemId, data.itemId),
          data.batchId ? eq(salesStock.batchId, data.batchId) : isNull(salesStock.batchId)
        ),
      });

      if (existingSalesStock) {
        await db.update(salesStock)
          .set({
            quantity: existingSalesStock.quantity + data.quantityBase,
            updatedAt: new Date(),
          })
          .where(eq(salesStock.id, existingSalesStock.id));
      } else {
        await db.insert(salesStock).values({
          userId: data.salesId,
          itemId: data.itemId,
          batchId: data.batchId || null,
          quantity: data.quantityBase,
        });
      }

      // Record mutation
      const notePrefix = batchInfo ? `[Batch: ${batchInfo.batchNo} (Exp: ${batchInfo.expireDate})] ` : '';
      await db.insert(stockMutations).values({
        itemId: data.itemId,
        batchId: data.batchId || null,
        type: 'ASSIGN_TO_SALES',
        quantity: -data.quantityBase,
        referenceId: data.salesId,
        notes: (notePrefix + `Assign jadwal kirim ${data.deliveryDate} ke toko. ${data.notes || ''}`).trim(),
        performedBy: currentUser?.id,
      });
    }

    // 2. Create store_visits record for this schedule
    const newVisit = await db.insert(storeVisits).values({
      salesId: data.salesId,
      storeId: data.storeId,
      visitDate: data.deliveryDate,
      deliveryDate: data.deliveryDate,
      billingDate: data.billingDate,
      assignedItemId: data.itemId,
      assignedStockQty: data.quantityBase,
      targetQuantity: data.quantityBase,
      notes: data.notes || null,
      status: 'SCHEDULED',
    }).returning().get();

    revalidatePath('/assign-stock');
    revalidatePath('/stock');
    revalidatePath('/sales');
    revalidatePath('/monitor-sales');
    return { success: true, visit: newVisit };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal membuat jadwal pengantaran' };
  }
}

export async function updateStoreScheduleAction(data: {
  visitId: string;
  salesId: string;
  storeId: string;
  itemId?: string;
  batchId?: string;
  quantityBase?: number;
  deliveryDate: string;
  billingDate: string;
  adjustStock?: boolean;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    const existingVisit = await db.query.storeVisits.findFirst({
      where: eq(storeVisits.id, data.visitId),
    });

    if (!existingVisit) {
      return { success: false, error: 'Jadwal kunjungan toko tidak ditemukan.' };
    }

    const oldQty = existingVisit.assignedStockQty ?? existingVisit.targetQuantity ?? 0;
    const newQty = data.quantityBase !== undefined ? data.quantityBase : oldQty;
    const delta = newQty - oldQty;
    const targetItemId = data.itemId || existingVisit.assignedItemId;

    // If stock adjustment is requested and quantity has changed
    if (data.adjustStock && delta !== 0 && targetItemId) {
      const item = await db.query.items.findFirst({
        where: eq(items.id, targetItemId),
      });

      if (!item) {
        return { success: false, error: 'Produk tidak ditemukan.' };
      }

      // If increasing stock quantity, check warehouse & batch limit
      if (delta > 0) {
        if (item.stockWarehouse < delta) {
          return {
            success: false,
            error: `Stok gudang tidak mencukupi untuk penambahan! Sisa gudang: ${item.stockWarehouse} ${item.baseUnit}, Tambahan diminta: ${delta} ${item.baseUnit}`,
          };
        }

        if (data.batchId) {
          const batch = await db.query.itemBatches.findFirst({
            where: eq(itemBatches.id, data.batchId),
          });
          if (batch && batch.currentQuantity < delta) {
            return {
              success: false,
              error: `Stok pada batch ${batch.batchNo} tidak mencukupi! Tersedia: ${batch.currentQuantity} ${item.baseUnit}, Tambahan diminta: ${delta} ${item.baseUnit}`,
            };
          }
          if (batch) {
            await db.update(itemBatches)
              .set({ currentQuantity: batch.currentQuantity - delta, updatedAt: new Date() })
              .where(eq(itemBatches.id, data.batchId));
          }
        }

        // Deduct warehouse
        await db.update(items)
          .set({ stockWarehouse: item.stockWarehouse - delta, updatedAt: new Date() })
          .where(eq(items.id, targetItemId));

        // Add to sales stock
        const existingSalesStock = await db.query.salesStock.findFirst({
          where: and(
            eq(salesStock.userId, data.salesId),
            eq(salesStock.itemId, targetItemId),
            data.batchId ? eq(salesStock.batchId, data.batchId) : isNull(salesStock.batchId)
          ),
        });

        if (existingSalesStock) {
          await db.update(salesStock)
            .set({ quantity: existingSalesStock.quantity + delta, updatedAt: new Date() })
            .where(eq(salesStock.id, existingSalesStock.id));
        } else {
          await db.insert(salesStock).values({
            userId: data.salesId,
            itemId: targetItemId,
            batchId: data.batchId || null,
            quantity: delta,
          });
        }
      } else {
        // Decreasing stock quantity -> return Math.abs(delta) to warehouse
        const refundQty = Math.abs(delta);
        await db.update(items)
          .set({ stockWarehouse: item.stockWarehouse + refundQty, updatedAt: new Date() })
          .where(eq(items.id, targetItemId));

        if (data.batchId) {
          const batch = await db.query.itemBatches.findFirst({
            where: eq(itemBatches.id, data.batchId),
          });
          if (batch) {
            await db.update(itemBatches)
              .set({ currentQuantity: batch.currentQuantity + refundQty, updatedAt: new Date() })
              .where(eq(itemBatches.id, data.batchId));
          }
        }

        // Deduct from sales stock
        const existingSalesStock = await db.query.salesStock.findFirst({
          where: and(
            eq(salesStock.userId, data.salesId),
            eq(salesStock.itemId, targetItemId)
          ),
        });
        if (existingSalesStock) {
          const rem = Math.max(0, existingSalesStock.quantity - refundQty);
          await db.update(salesStock)
            .set({ quantity: rem, updatedAt: new Date() })
            .where(eq(salesStock.id, existingSalesStock.id));
        }
      }
    }

    // Update store visit
    await db.update(storeVisits)
      .set({
        salesId: data.salesId,
        storeId: data.storeId,
        visitDate: data.deliveryDate,
        deliveryDate: data.deliveryDate,
        billingDate: data.billingDate,
        assignedItemId: data.itemId || existingVisit.assignedItemId,
        assignedStockQty: newQty,
        targetQuantity: newQty,
        notes: data.notes || null,
      })
      .where(eq(storeVisits.id, data.visitId));

    revalidatePath('/assign-stock');
    revalidatePath('/stock');
    revalidatePath('/sales');
    revalidatePath('/monitor-sales');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal memperbarui jadwal' };
  }
}

export async function deleteStoreScheduleAction(visitId: string) {
  await db.delete(storeVisits).where(eq(storeVisits.id, visitId));

  revalidatePath('/assign-stock');
  revalidatePath('/sales');
  revalidatePath('/monitor-sales');
  return { success: true };
}

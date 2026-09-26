'use server';

import { db } from '@/db';
import { items, itemUnits, stockMutations, itemBatches } from '@/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { getLocalDateString } from '@/lib/utils';

export async function createItemAction(data: {
  sku: string;
  name: string;
  category: string;
  baseUnit: string;
  basePrice: number;
  imageUrl?: string;
  stockWarehouse: number;
  dynamicAttributes: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'select' | 'boolean';
    value: string | number | boolean | null;
  }>;
  units: Array<{
    unitName: string;
    conversionRate: number;
    price?: number;
    isDefault?: boolean;
  }>;
}) {
  const user = await getCurrentUser();

  const newItem = await db.insert(items).values({
    sku: data.sku,
    name: data.name,
    category: data.category || 'General',
    baseUnit: data.baseUnit || 'PCS',
    basePrice: Number(data.basePrice) || 0,
    imageUrl: data.imageUrl || null,
    dynamicAttributes: data.dynamicAttributes || [],
    stockWarehouse: Number(data.stockWarehouse) || 0,
  }).returning().get();

  // Insert unit conversions
  if (data.units && data.units.length > 0) {
    for (const u of data.units) {
      if (u.unitName && u.conversionRate > 0) {
        await db.insert(itemUnits).values({
          itemId: newItem.id,
          unitName: u.unitName.toUpperCase(),
          conversionRate: Number(u.conversionRate),
          price: u.price ? Number(u.price) : null,
          isDefault: Boolean(u.isDefault),
        });
      }
    }
  }

  // Record initial stock mutation if > 0
  if (data.stockWarehouse > 0) {
    await db.insert(stockMutations).values({
      itemId: newItem.id,
      type: 'IN',
      quantity: Number(data.stockWarehouse),
      notes: 'Initial inventory creation',
      performedBy: user?.id,
    });
  }

  revalidatePath('/stock');
  revalidatePath('/assign-stock');
  revalidatePath('/');
  return { success: true, item: newItem };
}

export async function updateItemAction(
  itemId: string,
  data: {
    sku: string;
    name: string;
    category: string;
    baseUnit: string;
    basePrice: number;
    imageUrl?: string;
    dynamicAttributes: Array<{
      key: string;
      label: string;
      type: 'text' | 'number' | 'date' | 'select' | 'boolean';
      value: string | number | boolean | null;
    }>;
    units: Array<{
      id?: string;
      unitName: string;
      conversionRate: number;
      price?: number;
      isDefault?: boolean;
    }>;
  }
) {
  await db.update(items)
    .set({
      sku: data.sku,
      name: data.name,
      category: data.category,
      baseUnit: data.baseUnit,
      basePrice: Number(data.basePrice),
      imageUrl: data.imageUrl,
      dynamicAttributes: data.dynamicAttributes,
      updatedAt: new Date(),
    })
    .where(eq(items.id, itemId));

  // Replace units
  await db.delete(itemUnits).where(eq(itemUnits.itemId, itemId));
  if (data.units && data.units.length > 0) {
    for (const u of data.units) {
      if (u.unitName && u.conversionRate > 0) {
        await db.insert(itemUnits).values({
          itemId: itemId,
          unitName: u.unitName.toUpperCase(),
          conversionRate: Number(u.conversionRate),
          price: u.price ? Number(u.price) : null,
          isDefault: Boolean(u.isDefault),
        });
      }
    }
  }

  revalidatePath('/stock');
  revalidatePath('/assign-stock');
  return { success: true };
}

export async function deleteItemAction(itemId: string) {
  await db.delete(items).where(eq(items.id, itemId));
  revalidatePath('/stock');
  revalidatePath('/assign-stock');
  return { success: true };
}

export async function adjustStockAction(data: {
  itemId: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number; // in base units
  notes?: string;
}) {
  const user = await getCurrentUser();
  const currentItem = await db.query.items.findFirst({
    where: eq(items.id, data.itemId),
  });

  if (!currentItem) return { error: 'Item not found' };

  let newWarehouseStock = currentItem.stockWarehouse;
  let mutationQty = Number(data.quantity);

  if (data.type === 'IN') {
    newWarehouseStock += mutationQty;
  } else if (data.type === 'OUT') {
    newWarehouseStock = Math.max(0, newWarehouseStock - mutationQty);
    mutationQty = -mutationQty;
  } else if (data.type === 'ADJUSTMENT') {
    const diff = mutationQty - currentItem.stockWarehouse;
    newWarehouseStock = mutationQty;
    mutationQty = diff;
  }

  await db.update(items)
    .set({
      stockWarehouse: newWarehouseStock,
      updatedAt: new Date(),
    })
    .where(eq(items.id, data.itemId));

  await db.insert(stockMutations).values({
    itemId: data.itemId,
    type: data.type,
    quantity: mutationQty,
    notes: data.notes || `Stock ${data.type} adjustment`,
    performedBy: user?.id,
  });

  revalidatePath('/stock');
  revalidatePath('/assign-stock');
  return { success: true, newStock: newWarehouseStock };
}

export async function quickStockInAction(data: {
  itemId?: string;
  presetName?: string;
  quantity: number;
  unitName?: string;
  expireDate?: string;
  batchNo?: string;
  notes?: string;
}) {
  const user = await getCurrentUser();
  let targetItem: any = null;

  if (data.itemId) {
    targetItem = await db.query.items.findFirst({
      where: eq(items.id, data.itemId),
      with: { units: true },
    });
  } else if (data.presetName) {
    const trimmed = data.presetName.trim();
    const existing = await db.query.items.findFirst({
      where: (items, { eq, sql }) => sql`lower(${items.name}) = lower(${trimmed})`,
      with: { units: true },
    });

    if (existing) {
      targetItem = existing;
    } else {
      // Auto create product master for this preset
      const generatedSku = `SKU-${trimmed.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'PROD'}-${Date.now().toString().slice(-4)}`;
      targetItem = await db.insert(items).values({
        sku: generatedSku,
        name: trimmed,
        category: 'Produk Utama',
        baseUnit: data.unitName || 'PCS',
        basePrice: 10000,
        stockWarehouse: 0,
        dynamicAttributes: [
          { key: 'expired_date', label: 'Expired Date', type: 'date', value: data.expireDate || null },
          { key: 'batch_no', label: 'Batch No', type: 'text', value: data.batchNo || null },
        ],
      }).returning().get();
    }
  }

  if (!targetItem) {
    return { error: 'Produk tidak ditemukan atau gagal dibuat' };
  }

  // Calculate base quantity if a specific unit is chosen
  let addedBaseQty = Number(data.quantity) || 0;
  if (data.unitName && targetItem.units) {
    const foundUnit = targetItem.units.find(
      (u: any) => u.unitName.toUpperCase() === data.unitName?.toUpperCase()
    );
    if (foundUnit && foundUnit.conversionRate > 0) {
      addedBaseQty = addedBaseQty * foundUnit.conversionRate;
    }
  }

  const newWarehouseStock = (targetItem.stockWarehouse || 0) + addedBaseQty;

  // Determine distinct Batch Number
  const targetExpireDate = data.expireDate || getLocalDateString();
  let requestedBatchNo = data.batchNo?.trim() || '';

  if (!requestedBatchNo) {
    const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}${mm}`;
    const dd = String(now.getDate()).padStart(2, '0');
    const month = MONTH_SHORT[now.getMonth()] || 'SEP';
    const yyyy = now.getFullYear();
    requestedBatchNo = `BATCH-${dd}_${month}_${yyyy}-${timeStr}`;
  }

  // Check if a batch with requestedBatchNo already exists
  const existingBatch = await db.query.itemBatches.findFirst({
    where: and(
      eq(itemBatches.itemId, targetItem.id),
      eq(itemBatches.batchNo, requestedBatchNo)
    ),
  });

  let savedBatch: any = null;

  if (existingBatch) {
    // If the existing batch has the EXACT SAME expire date, append quantity
    if (existingBatch.expireDate === targetExpireDate) {
      await db.update(itemBatches)
        .set({
          currentQuantity: existingBatch.currentQuantity + addedBaseQty,
          initialQuantity: existingBatch.initialQuantity + addedBaseQty,
          updatedAt: new Date(),
        })
        .where(eq(itemBatches.id, existingBatch.id));
      savedBatch = { ...existingBatch, currentQuantity: existingBatch.currentQuantity + addedBaseQty };
    } else {
      // DIFFERENT expire date -> MUST create a new distinct batch!
      const disambiguatedBatchNo = `${requestedBatchNo} (Exp ${targetExpireDate.replace(/-/g, '').slice(-4)})`;
      savedBatch = await db.insert(itemBatches).values({
        itemId: targetItem.id,
        batchNo: disambiguatedBatchNo,
        expireDate: targetExpireDate,
        initialQuantity: addedBaseQty,
        currentQuantity: addedBaseQty,
        unitName: data.unitName || targetItem.baseUnit,
        notes: data.notes || null,
      }).returning().get();
    }
  } else {
    // Create new batch
    savedBatch = await db.insert(itemBatches).values({
      itemId: targetItem.id,
      batchNo: requestedBatchNo,
      expireDate: targetExpireDate,
      initialQuantity: addedBaseQty,
      currentQuantity: addedBaseQty,
      unitName: data.unitName || targetItem.baseUnit,
      notes: data.notes || null,
    }).returning().get();
  }

  // Update item dynamic attributes with latest expired_date and batch_no
  const existingAttrs: any[] = Array.isArray(targetItem.dynamicAttributes) ? [...targetItem.dynamicAttributes] : [];
  const expIdx = existingAttrs.findIndex(a => a.key === 'expired_date');
  if (expIdx >= 0) {
    existingAttrs[expIdx].value = targetExpireDate;
  } else {
    existingAttrs.push({ key: 'expired_date', label: 'Expired Date', type: 'date', value: targetExpireDate });
  }

  const batchIdx = existingAttrs.findIndex(a => a.key === 'batch_no');
  if (batchIdx >= 0) {
    existingAttrs[batchIdx].value = savedBatch.batchNo;
  } else {
    existingAttrs.push({ key: 'batch_no', label: 'Batch No', type: 'text', value: savedBatch.batchNo });
  }

  await db.update(items)
    .set({
      stockWarehouse: newWarehouseStock,
      dynamicAttributes: existingAttrs,
      updatedAt: new Date(),
    })
    .where(eq(items.id, targetItem.id));

  // Mutation log
  const logDetails = [
    `Batch: ${savedBatch.batchNo}`,
    `Exp: ${targetExpireDate}`,
    data.unitName && data.unitName !== targetItem.baseUnit ? `Input: ${data.quantity} ${data.unitName} (= ${addedBaseQty} ${targetItem.baseUnit})` : null,
    data.notes ? data.notes : 'Quick Stock In',
  ].filter(Boolean).join(' | ');

  await db.insert(stockMutations).values({
    itemId: targetItem.id,
    type: 'IN',
    quantity: addedBaseQty,
    notes: logDetails,
    performedBy: user?.id,
  });

  revalidatePath('/stock');
  revalidatePath('/assign-stock');
  revalidatePath('/');
  return { success: true, item: targetItem, newStock: newWarehouseStock, batch: savedBatch };
}

export async function deleteBatchAction(batchId: string) {
  const user = await getCurrentUser();
  const batch = await db.query.itemBatches.findFirst({
    where: eq(itemBatches.id, batchId),
    with: { item: true },
  });

  if (!batch) return { error: 'Batch not found' };

  const qtyToRemove = batch.currentQuantity;
  const newStock = Math.max(0, (batch.item?.stockWarehouse || 0) - qtyToRemove);

  await db.update(items)
    .set({ stockWarehouse: newStock, updatedAt: new Date() })
    .where(eq(items.id, batch.itemId));

  await db.delete(itemBatches).where(eq(itemBatches.id, batchId));

  await db.insert(stockMutations).values({
    itemId: batch.itemId,
    type: 'OUT',
    quantity: -qtyToRemove,
    notes: `Batch ${batch.batchNo} (Exp: ${batch.expireDate}) deleted / removed`,
    performedBy: user?.id,
  });

  revalidatePath('/stock');
  revalidatePath('/assign-stock');
  return { success: true };
}

export async function updateBatchAction(
  batchId: string,
  data: {
    batchNo: string;
    expireDate: string;
    currentQuantity: number;
    notes?: string;
  }
) {
  const user = await getCurrentUser();
  const existingBatch = await db.query.itemBatches.findFirst({
    where: eq(itemBatches.id, batchId),
    with: { item: true },
  });

  if (!existingBatch) {
    return { error: 'Batch tidak ditemukan.' };
  }

  const newQty = Math.max(0, Number(data.currentQuantity) || 0);
  const diff = newQty - existingBatch.currentQuantity;
  const currentWarehouseStock = existingBatch.item?.stockWarehouse || 0;
  const newWarehouseStock = Math.max(0, currentWarehouseStock + diff);

  // Update item_batches
  await db.update(itemBatches)
    .set({
      batchNo: data.batchNo.trim(),
      expireDate: data.expireDate.trim(),
      currentQuantity: newQty,
      notes: data.notes || null,
      updatedAt: new Date(),
    })
    .where(eq(itemBatches.id, batchId));

  // If quantity was adjusted, sync items.stockWarehouse and record audit mutation
  if (diff !== 0) {
    await db.update(items)
      .set({
        stockWarehouse: newWarehouseStock,
        updatedAt: new Date(),
      })
      .where(eq(items.id, existingBatch.itemId));

    await db.insert(stockMutations).values({
      itemId: existingBatch.itemId,
      type: diff > 0 ? 'IN' : 'OUT',
      quantity: diff,
      notes: `Batch ${data.batchNo} edited: stock adjusted by ${diff > 0 ? `+${diff}` : diff} ${existingBatch.item?.baseUnit || 'PCS'}`,
      performedBy: user?.id,
    });
  }

  revalidatePath('/stock');
  revalidatePath('/assign-stock');
  revalidatePath('/');
  return { success: true };
}

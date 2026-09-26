'use server';

import { db } from '@/db';
import { stores, salesTargets, storeVisits } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { getLocalDateString } from '@/lib/utils';

export async function createStoreAction(data: {
  code: string;
  name: string;
  ownerName?: string;
  phone?: string;
  address: string;
  mapUrl?: string;
  latitude?: number;
  longitude?: number;
  assignedSalesId?: string;
  targetMonthlySales?: number;
  defaultDailyTargetQty?: number;
  imageUrl?: string;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('Unauthorized');
  }

  const isPrivileged =
    currentUser.role.id === 'role-superadmin' ||
    currentUser.role.id === 'role-admin' ||
    currentUser.role.permissions.includes('*');

  // If user is Sales (not privileged), strictly lock assignedSalesId to currentUser.id
  const effectiveSalesId = isPrivileged
    ? (data.assignedSalesId || null)
    : currentUser.id;

  const newStore = await db.insert(stores).values({
    code: data.code,
    name: data.name,
    ownerName: data.ownerName || null,
    phone: data.phone || null,
    address: data.address,
    mapUrl: data.mapUrl || null,
    latitude: data.latitude ? Number(data.latitude) : null,
    longitude: data.longitude ? Number(data.longitude) : null,
    assignedSalesId: effectiveSalesId,
    targetMonthlySales: Number(data.targetMonthlySales) || 0,
    defaultDailyTargetQty: Number(data.defaultDailyTargetQty) || 0,
    imageUrl: data.imageUrl || null,
  }).returning().get();

  // Create default target for current month if assigned
  if (effectiveSalesId && data.targetMonthlySales) {
    const now = new Date();
    await db.insert(salesTargets).values({
      userId: effectiveSalesId,
      storeId: newStore.id,
      targetAmount: Number(data.targetMonthlySales),
      targetQuantity: Number(data.defaultDailyTargetQty) || 0,
      periodMonth: now.getMonth() + 1,
      periodYear: now.getFullYear(),
    });
  }

  revalidatePath('/stores');
  revalidatePath('/sales');
  revalidatePath('/monitor-sales');
  return { success: true, store: newStore };
}

export async function updateStoreAction(
  storeId: string,
  data: {
    code: string;
    name: string;
    ownerName?: string;
    phone?: string;
    address: string;
    mapUrl?: string;
    latitude?: number;
    longitude?: number;
    assignedSalesId?: string;
    targetMonthlySales?: number;
    defaultDailyTargetQty?: number;
    imageUrl?: string;
  }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('Unauthorized');
  }

  const isPrivileged =
    currentUser.role.id === 'role-superadmin' ||
    currentUser.role.id === 'role-admin' ||
    currentUser.role.permissions.includes('*');

  const existingStore = await db.query.stores.findFirst({
    where: eq(stores.id, storeId),
  });

  if (!existingStore) {
    throw new Error('Store not found');
  }

  // If sales rep, ensure they only edit their own assigned store
  if (!isPrivileged && existingStore.assignedSalesId !== currentUser.id) {
    throw new Error('Forbidden: Anda hanya berhak mengedit data toko yang di-assign ke akun Anda.');
  }

  const effectiveSalesId = isPrivileged
    ? (data.assignedSalesId || null)
    : currentUser.id;

  await db.update(stores)
    .set({
      code: data.code,
      name: data.name,
      ownerName: data.ownerName,
      phone: data.phone,
      address: data.address,
      mapUrl: data.mapUrl || null,
      latitude: data.latitude ? Number(data.latitude) : null,
      longitude: data.longitude ? Number(data.longitude) : null,
      assignedSalesId: effectiveSalesId,
      targetMonthlySales: Number(data.targetMonthlySales) || 0,
      defaultDailyTargetQty: Number(data.defaultDailyTargetQty) || 0,
      imageUrl: data.imageUrl,
    })
    .where(eq(stores.id, storeId));

  revalidatePath('/stores');
  revalidatePath('/sales');
  revalidatePath('/monitor-sales');
  return { success: true };
}

export async function updateStoreDailyTargetAction(storeId: string, defaultDailyTargetQty: number) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('Unauthorized');
  }

  const isPrivileged =
    currentUser.role.id === 'role-superadmin' ||
    currentUser.role.id === 'role-admin' ||
    currentUser.role.permissions.includes('*');

  if (!isPrivileged) {
    const existingStore = await db.query.stores.findFirst({
      where: eq(stores.id, storeId),
    });
    if (!existingStore || existingStore.assignedSalesId !== currentUser.id) {
      throw new Error('Forbidden: Anda hanya berhak mengubah target toko Anda.');
    }
  }

  await db.update(stores)
    .set({ defaultDailyTargetQty: Number(defaultDailyTargetQty) || 0 })
    .where(eq(stores.id, storeId));

  revalidatePath('/stores');
  revalidatePath('/sales');
  return { success: true };
}

export async function deleteStoreAction(storeId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error('Unauthorized');
  }

  const isPrivileged =
    currentUser.role.id === 'role-superadmin' ||
    currentUser.role.id === 'role-admin' ||
    currentUser.role.permissions.includes('*');

  if (!isPrivileged) {
    throw new Error('Forbidden: Hanya Admin yang memiliki wewenang untuk menghapus data toko.');
  }

  await db.delete(stores).where(eq(stores.id, storeId));
  revalidatePath('/stores');
  revalidatePath('/sales');
  return { success: true };
}

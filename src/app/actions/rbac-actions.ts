'use server';

import { db } from '@/db';
import { roles, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function updateRolePermissionsAction(roleId: string, permissions: string[]) {
  // Ensure permissions are clean discrete strings and don't retain wildcard '*'
  const cleanPermissions = permissions.filter(p => p !== '*');

  await db.update(roles)
    .set({
      permissions: cleanPermissions,
    })
    .where(eq(roles.id, roleId));

  revalidatePath('/settings/rbac');
  revalidatePath('/sales');
  revalidatePath('/stock');
  revalidatePath('/assign-stock');
  revalidatePath('/stores');
  revalidatePath('/monitor-sales');
  revalidatePath('/reports');
  revalidatePath('/users');
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function createUserAction(data: {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  address?: string;
  joinDate?: string;
  roleId: string;
  avatarUrl?: string;
}): Promise<{ success: boolean; error?: string; user?: any }> {
  try {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, data.email),
    });

    if (existing) {
      return { success: false, error: 'Email sudah terdaftar. Gunakan email lain.' };
    }

    const newUser = await db.insert(users).values({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      address: data.address || null,
      joinDate: data.joinDate || new Date().toISOString().split('T')[0],
      roleId: data.roleId,
      avatarUrl: data.avatarUrl || null,
      passwordHash: data.password || 'password123',
      status: 'ACTIVE',
    }).returning().get();

    revalidatePath('/settings/rbac');
    return { success: true, user: newUser };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal membuat user baru' };
  }
}

export async function updateUserAction(
  userId: string,
  data: {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    address?: string;
    roleId: string;
    avatarUrl?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Record<string, any> = {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      address: data.address || null,
      roleId: data.roleId,
    };

    if (data.avatarUrl) {
      updateData.avatarUrl = data.avatarUrl;
    }

    if (data.password && data.password.trim() !== '') {
      updateData.passwordHash = data.password;
    }

    await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId));

    revalidatePath('/settings/rbac');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Gagal mengupdate user' };
  }
}

export async function updateUserRoleAction(userId: string, roleId: string) {
  await db.update(users)
    .set({
      roleId,
    })
    .where(eq(users.id, userId));

  revalidatePath('/settings/rbac');
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function deleteUserAction(userId: string) {
  await db.delete(users).where(eq(users.id, userId));
  revalidatePath('/settings/rbac');
  return { success: true };
}

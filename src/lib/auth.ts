import { cookies } from 'next/headers';
import { db } from '@/db';
import { users, roles } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  joinDate: string | null;
  avatarUrl: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  role: {
    id: string;
    name: string;
    description: string | null;
    permissions: string[];
  };
}

const SESSION_COOKIE_NAME = 'sales_mgmt_session_user_id';

export async function getCurrentUser(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const sessionUserId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionUserId) {
    return null;
  }

  try {
    const userRecord = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        address: users.address,
        joinDate: users.joinDate,
        avatarUrl: users.avatarUrl,
        status: users.status,
        roleId: roles.id,
        roleName: roles.name,
        roleDescription: roles.description,
        rolePermissions: roles.permissions,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, sessionUserId))
      .get();

    if (!userRecord) {
      console.log(`[AUTH] Session user ID ${sessionUserId} not found in DB`);
      return null;
    }

    return {
      id: userRecord.id,
      name: userRecord.name,
      email: userRecord.email,
      phone: userRecord.phone,
      address: userRecord.address,
      joinDate: userRecord.joinDate,
      avatarUrl: userRecord.avatarUrl,
      status: userRecord.status as 'ACTIVE' | 'INACTIVE',
      role: {
        id: userRecord.roleId,
        name: userRecord.roleName,
        description: userRecord.roleDescription,
        permissions: Array.isArray(userRecord.rolePermissions) ? userRecord.rolePermissions : [],
      },
    };
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

import { redirect } from 'next/navigation';

export function hasPermission(user: UserSession | null, permission: string): boolean {
  if (!user || !user.role) return false;
  const perms = Array.isArray(user.role.permissions) ? user.role.permissions : [];
  if (user.role.id === 'role-superadmin' || perms.includes('*')) return true;
  return perms.includes(permission);
}

export async function requireAuth(permission?: string): Promise<UserSession> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  if (permission && !hasPermission(user, permission)) {
    redirect('/');
  }
  return user;
}

export async function requireAuthAny(permissions: string[]): Promise<UserSession> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  const allowed = permissions.some((p) => hasPermission(user, p));
  if (!allowed) {
    redirect('/');
  }
  return user;
}



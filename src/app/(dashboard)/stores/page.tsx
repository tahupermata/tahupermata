import { db } from '@/db';
import { stores, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { getCurrentUser, hasPermission, requireAuth } from '@/lib/auth';
import { StoreTable } from '@/components/stores/store-table';

export default async function StoresPage() {
  const user = await requireAuth('stores:view');
  const isPrivileged =
    user.role.id === 'role-superadmin' ||
    user.role.id === 'role-admin' ||
    user.role.permissions.includes('*');

  const canManage = hasPermission(user, 'stores:manage');

  // If user is sales (not privileged), strictly only fetch stores assigned to this sales rep
  const allStores = await db.query.stores.findMany({
    where: isPrivileged ? undefined : eq(stores.assignedSalesId, user.id),
    with: {
      assignedSales: true,
    },
    orderBy: [desc(stores.createdAt)],
  });

  const salesUsers = await db.query.users.findMany({
    where: eq(users.roleId, 'role-sales'),
  });

  return (
    <StoreTable
      stores={allStores as any}
      salesUsers={salesUsers as any}
      canManage={canManage}
      currentUser={user}
      isPrivileged={isPrivileged}
    />
  );
}

import { db } from '@/db';
import { roles, users } from '@/db/schema';
import { requireAuth } from '@/lib/auth';
import { RbacManager } from '@/components/rbac/rbac-manager';

export default async function RbacPage() {
  await requireAuth('rbac:manage');
  const allRoles = await db.query.roles.findMany();
  const allUsers = await db.query.users.findMany({
    with: {
      role: true,
    },
  });

  return (
    <RbacManager
      rolesList={allRoles as any}
      usersList={allUsers as any}
    />
  );
}

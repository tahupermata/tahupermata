import { db } from '@/db';
import { items, users, salesStock, storeVisits, stores } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { getLocalDateString } from '@/lib/utils';
import { AssignStockManager } from '@/components/stock/assign-stock-manager';

export default async function AssignStockPage() {
  await requireAuth('stock:assign');
  const today = getLocalDateString();

  const salesUsers = await db.query.users.findMany({
    where: eq(users.roleId, 'role-sales'),
  });

  const allStores = await db.query.stores.findMany({
    where: eq(stores.status, 'ACTIVE'),
    orderBy: [stores.name],
  });

  const allItems = await db.query.items.findMany({
    with: {
      units: true,
      batches: true,
    },
    orderBy: [desc(items.createdAt)],
  });

  const salesStockRecords = await db.query.salesStock.findMany({
    with: {
      user: true,
      batch: true,
      item: {
        with: {
          units: true,
        },
      },
    },
  });

  const allAssignments = await db.query.storeVisits.findMany({
    with: {
      store: true,
      sales: true,
      assignedItem: true,
      orders: true,
    },
    orderBy: [desc(storeVisits.visitDate), desc(storeVisits.createdAt)],
  });

  return (
    <AssignStockManager
      salesUsers={salesUsers as any}
      storesList={allStores as any}
      items={allItems as any}
      salesStockData={salesStockRecords.filter((s) => s.quantity > 0) as any}
      assignmentsList={allAssignments as any}
    />
  );
}

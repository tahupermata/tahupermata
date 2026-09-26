import { db } from '@/db';
import { items, stockMutations } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { getCurrentUser, hasPermission, requireAuth } from '@/lib/auth';
import { StockTable } from '@/components/stock/stock-table';

export default async function StockPage() {
  const user = await requireAuth('stock:view');
  const canManage = hasPermission(user, 'stock:manage');

  const allItems = await db.query.items.findMany({
    with: {
      units: true,
      batches: true,
    },
    orderBy: [desc(items.createdAt)],
  });

  const allMutations = await db.query.stockMutations.findMany({
    orderBy: [desc(stockMutations.createdAt)],
    limit: 50,
    with: {
      item: true,
    },
  });

  return (
    <StockTable
      items={allItems as any}
      mutations={allMutations as any}
      canManage={canManage}
    />
  );
}

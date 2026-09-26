import { db } from '@/db';
import { visitOrders } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { ReportsView } from '@/components/reports/reports-view';

export default async function ReportsPage() {
  await requireAuth('reports:view');
  const allOrders = await db.query.visitOrders.findMany({
    with: {
      sales: true,
      store: true,
      items: {
        with: {
          item: true,
        },
      },
      returns: {
        with: {
          item: true,
        },
      },
    },
    orderBy: [desc(visitOrders.createdAt)],
  });

  return <ReportsView orders={allOrders as any} />;
}

import { db } from '@/db';
import { storeVisits, users, items, visitOrders } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { SalesMonitorView } from '@/components/monitor/sales-monitor-view';

export default async function MonitorSalesPage() {
  await requireAuth('monitor:view');
  const salesUsers = await db.query.users.findMany({
    where: eq(users.roleId, 'role-sales'),
  });

  const allItems = await db.query.items.findMany({
    with: {
      units: true,
    },
  });

  const allVisits = await db.query.storeVisits.findMany({
    with: {
      sales: true,
      store: true,
      assignedItem: true,
      orders: {
        with: {
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
      },
    },
    orderBy: [desc(storeVisits.visitDate), desc(storeVisits.checkinTime), desc(storeVisits.createdAt)],
  });

  const unpaidInvoices = await db.query.visitOrders.findMany({
    where: eq(visitOrders.paymentStatus, 'PENDING'),
    with: {
      store: true,
      sales: true,
      visit: true,
    },
    orderBy: [desc(visitOrders.createdAt)],
  });

  return (
    <SalesMonitorView
      salesUsers={salesUsers as any}
      itemsList={allItems as any}
      visits={allVisits as any}
      unpaidInvoices={unpaidInvoices as any}
    />
  );
}

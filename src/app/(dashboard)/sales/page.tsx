import { db } from '@/db';
import { storeVisits, salesStock, users, visitOrders, items } from '@/db/schema';
import { eq, desc, asc, or, isNull } from 'drizzle-orm';
import { getCurrentUser, requireAuth } from '@/lib/auth';
import { getLocalDateString } from '@/lib/utils';
import { SalesFieldDashboard } from '@/components/sales/sales-field-dashboard';

export default async function SalesPage({
  searchParams,
}: {
  searchParams?: Promise<{ salesId?: string }>;
}) {
  const currentUser = await requireAuth('sales:field');

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const isPrivileged =
    currentUser.role.id === 'role-superadmin' ||
    currentUser.role.id === 'role-admin' ||
    currentUser.role.permissions.includes('*');

  // Fetch all available sales reps
  const salesUsers = await db.query.users.findMany({
    where: eq(users.roleId, 'role-sales'),
    orderBy: [asc(users.name)],
  });

  // Determine which sales rep ID to display
  let activeSalesId = currentUser.id;
  if (isPrivileged) {
    if (resolvedSearchParams.salesId) {
      activeSalesId = resolvedSearchParams.salesId;
    } else if (salesUsers.length > 0) {
      activeSalesId = salesUsers[0].id;
    }
  }

  const todayStr = getLocalDateString();

  // Run all database queries in parallel
  const [salesUserRecord, allVisitsRaw, repStock, unpaidInvoices, allCatalogItems] = await Promise.all([
    db.query.users.findFirst({
      where: eq(users.id, activeSalesId),
    }),
    db.query.storeVisits.findMany({
      where: or(eq(storeVisits.salesId, activeSalesId), isNull(storeVisits.salesId)),
      with: {
        store: true,
        assignedItem: true,
        orders: {
          with: {
            items: { with: { item: true } },
            returns: { with: { item: true } },
          },
        },
      },
      orderBy: [asc(storeVisits.sequenceOrder)],
    }),
    db.query.salesStock.findMany({
      where: eq(salesStock.userId, activeSalesId),
      with: {
        batch: true,
        item: {
          with: {
            units: true,
          },
        },
      },
    }),
    db.query.visitOrders.findMany({
      where: eq(visitOrders.paymentStatus, 'PENDING'),
      with: {
        store: true,
        items: {
          with: {
            item: {
              with: {
                units: true,
              },
            },
          },
        },
      },
      orderBy: [desc(visitOrders.createdAt)],
    }),
    db.query.items.findMany({
      with: {
        units: true,
      },
      orderBy: [asc(items.name)],
    }),
  ]);

  // Filter out any corrupted visits that don't have a valid store
  const validVisits = allVisitsRaw.filter((v) => v.store != null);

  const todayVisits = validVisits.filter((v) => {
    const checkoutDate = v.checkoutTime ? getLocalDateString(v.checkoutTime) : null;
    const isCompletedToday = v.status === 'COMPLETED' && (checkoutDate === todayStr || (!checkoutDate && v.visitDate === todayStr));
    const isPastCompleted = v.status === 'COMPLETED' && !isCompletedToday;
    if (isPastCompleted) return false;

    // If scheduled visitDate is in the future, it does NOT belong to today
    if (v.visitDate && v.visitDate > todayStr && (!v.targetQuantity || v.targetQuantity === 0)) return false;
    if (isCompletedToday) return true;

    return v.visitDate === todayStr || (v.billingDate === todayStr && (!v.deliveryDate || v.deliveryDate <= todayStr));
  });

  const overdueVisits = validVisits.filter((v) => {
    const hasUnpaidPastOrder = v.orders?.some((o: any) => {
      const bDate = o.billingDate || v.billingDate || v.visitDate;
      return o.paymentStatus === 'PENDING' && Boolean(bDate && bDate <= todayStr);
    });

    if (hasUnpaidPastOrder) return true;

    if (v.status === 'COMPLETED' || v.status === 'SKIPPED') return false;
    const effectiveDate = v.billingDate || v.visitDate || v.deliveryDate;
    return Boolean(effectiveDate && effectiveDate < todayStr);
  });

  return (
    <SalesFieldDashboard
      salesUser={(salesUserRecord || currentUser) as any}
      salesUsersList={isPrivileged ? salesUsers : []}
      allVisits={validVisits as any}
      todayVisits={todayVisits as any}
      overdueVisits={overdueVisits as any}
      salesStockItems={repStock.filter((s) => s.quantity > 0 && s.item != null) as any}
      unpaidInvoices={unpaidInvoices as any}
      catalogItems={allCatalogItems as any}
    />
  );
}




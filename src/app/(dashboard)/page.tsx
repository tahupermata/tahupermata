import { db } from '@/db';
import { items, stores, users, visitOrders, storeVisits, returnItems } from '@/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { getCurrentUser, requireAuth } from '@/lib/auth';
import { formatRupiah, formatDate, getLocalDateString } from '@/lib/utils';
import {
  DollarSign,
  Store,
  Users,
  Package,
  TrendingUp,
  Truck,
  Smartphone,
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default async function DashboardPage() {
  const user = await requireAuth();
  const today = getLocalDateString();

  // Aggregate metrics
  const totalStores = await db.select({ count: sql<number>`count(*)` }).from(stores).get();
  const totalItems = await db.select({ count: sql<number>`count(*)` }).from(items).get();
  const totalSalesReps = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.roleId, 'role-sales')).get();

  const totalRevenue = await db.select({
    sum: sql<number>`COALESCE(sum(${visitOrders.netAmount}), 0)`,
    count: sql<number>`count(*)`,
  }).from(visitOrders).get();

  const todayVisits = await db.select().from(storeVisits).where(eq(storeVisits.visitDate, today)).all();
  const completedVisits = todayVisits.filter((v) => v.status === 'COMPLETED').length;
  const visitProgressPercent = todayVisits.length > 0 ? Math.round((completedVisits / todayVisits.length) * 100) : 0;

  const recentOrders = await db.query.visitOrders.findMany({
    orderBy: [desc(visitOrders.createdAt)],
    limit: 5,
    with: {
      store: true,
      sales: true,
      items: true,
    },
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-200 border-indigo-400/30">
            Welcome back, {user?.name}
          </Badge>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">
            Sales & Field Operations Dashboard
          </h1>
          <p className="text-sm text-indigo-200">
            Monitor real-time warehouse inventory, sales rep itinerary, store deliveries, and field returns.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/sales"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 transition-all cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Open Field Rep App</span>
          </Link>
          <Link
            href="/monitor-sales"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm backdrop-blur-xs transition-all border border-white/20 cursor-pointer"
          >
            <Activity className="w-4 h-4" />
            <span>Live Monitor</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Sales</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-slate-900">{formatRupiah(totalRevenue?.sum || 0)}</h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>{totalRevenue?.count || 0} Invoices generated</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Today Itinerary Progress */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today Visits</span>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-slate-900">
                {completedVisits} / {todayVisits.length} Toko
              </h3>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all"
                  style={{ width: `${visitProgressPercent}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Stores */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Stores</span>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-slate-900">{totalStores?.count || 0} Stores</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Assigned across {totalSalesReps?.count || 0} Sales Reps
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Warehouse SKU Catalog */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inventory SKUs</span>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Package className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <h3 className="text-2xl font-black text-slate-900">{totalItems?.count || 0} Products</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Multi-tier units & EAV Attributes
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Access Action Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/stock"
          className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-indigo-500 hover:shadow-md transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Manage Stock</h4>
              <p className="text-xs text-slate-500">Dynamic EAV & Units</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/assign-stock"
          className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-indigo-500 hover:shadow-md transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Assign Stock</h4>
              <p className="text-xs text-slate-500">Warehouse to Sales Rep</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/stores"
          className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-indigo-500 hover:shadow-md transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Store Targets</h4>
              <p className="text-xs text-slate-500">Toko DB & Routes</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/reports"
          className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs hover:border-indigo-500 hover:shadow-md transition-all group flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Reports & Export</h4>
              <p className="text-xs text-slate-500">Analytics & CSV/Excel</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* Recent Orders & Delivery Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Sales Transactions</CardTitle>
            <CardDescription>Latest invoices generated during field store visits</CardDescription>
          </div>
          <Link href="/monitor-sales" className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
            View Live Feed &rarr;
          </Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase bg-slate-50/50">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Store (Toko)</th>
                  <th className="py-3 px-4">Sales Rep</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Net Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500">
                      No transactions recorded yet today.
                    </td>
                  </tr>
                ) : (
                  recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 text-xs">
                        {ord.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {ord.store?.name || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {ord.sales?.name || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={ord.paymentStatus === 'PAID' ? 'success' : 'warning'}>
                          {ord.paymentStatus} ({ord.paymentMethod})
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900">
                        {formatRupiah(ord.netAmount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

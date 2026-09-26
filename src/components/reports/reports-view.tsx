'use client';

import * as React from 'react';
import { formatRupiah } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  BarChart3,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Award,
  Package,
  RotateCcw,
  FileSpreadsheet,
} from 'lucide-react';

interface ReportsViewProps {
  orders: Array<{
    id: string;
    invoiceNumber: string;
    totalAmount: number;
    discountAmount: number;
    netAmount: number;
    paymentStatus: string;
    paymentMethod: string;
    createdAt?: Date | null;
    sales: { name: string };
    store: { name: string; code: string };
    items: Array<{
      quantity: number;
      unitName: string;
      subtotal: number;
      item: { name: string; sku: string };
    }>;
    returns: Array<{
      quantity: number;
      condition: string;
      item: { name: string };
    }>;
  }>;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'];

export function ReportsView({ orders }: ReportsViewProps) {
  const [period, setPeriod] = React.useState<'DAILY' | 'MONTHLY' | 'YEARLY'>('MONTHLY');

  // Compute metrics
  const totalRevenue = orders.reduce((acc, o) => acc + o.netAmount, 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  const totalDeliveredQty = orders.reduce(
    (acc, o) => acc + o.items.reduce((s, it) => s + it.quantity, 0),
    0
  );

  const totalReturnedQty = orders.reduce(
    (acc, o) => acc + o.returns.reduce((s, ret) => s + ret.quantity, 0),
    0
  );

  const returnRatePercent =
    totalDeliveredQty > 0
      ? ((totalReturnedQty / (totalDeliveredQty + totalReturnedQty)) * 100).toFixed(1)
      : '0.0';

  // Rep Performance Data
  const repMap: Record<string, number> = {};
  orders.forEach((o) => {
    repMap[o.sales.name] = (repMap[o.sales.name] || 0) + o.netAmount;
  });
  const repPerformanceData = Object.entries(repMap).map(([name, revenue]) => ({
    name,
    revenue,
  }));

  // Top Products Data
  const productMap: Record<string, { name: string; count: number; revenue: number }> = {};
  orders.forEach((o) => {
    o.items.forEach((it) => {
      if (!productMap[it.item.name]) {
        productMap[it.item.name] = { name: it.item.name, count: 0, revenue: 0 };
      }
      productMap[it.item.name].count += it.quantity;
      productMap[it.item.name].revenue += it.subtotal;
    });
  });
  const topProductsData = Object.values(productMap).sort((a, b) => b.revenue - a.revenue);

  // Return Conditions Breakdown
  let goodReturns = 0;
  let brokenReturns = 0;
  orders.forEach((o) => {
    o.returns.forEach((r) => {
      if (r.condition === 'GOOD') goodReturns += r.quantity;
      else brokenReturns += r.quantity;
    });
  });

  const returnPieData =
    goodReturns > 0 || brokenReturns > 0
      ? [
          { name: 'Good (Re-sellable)', value: goodReturns, color: '#10b981' },
          { name: 'Broken (Damaged)', value: brokenReturns, color: '#ef4444' },
        ]
      : [];

  // Daily Trend computed dynamically from real orders in database
  const dailyTrendMap: Record<string, number> = {};
  orders.forEach((o) => {
    const d = o.createdAt
      ? new Date(o.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
      : 'Hari Ini';
    dailyTrendMap[d] = (dailyTrendMap[d] || 0) + o.netAmount;
  });
  const salesTrendData = Object.entries(dailyTrendMap).map(([date, revenue]) => ({
    date,
    revenue,
  }));

  // Export to Excel / CSV
  const handleExportExcel = () => {
    const exportRows = orders.map((o) => ({
      'Invoice Number': o.invoiceNumber,
      'Date': o.createdAt ? new Date(o.createdAt).toLocaleDateString('id-ID') : '',
      'Store Code': o.store.code,
      'Store Name': o.store.name,
      'Sales Rep': o.sales.name,
      'Gross Amount (Rp)': o.totalAmount,
      'Discount (Rp)': o.discountAmount,
      'Net Amount (Rp)': o.netAmount,
      'Payment Method': o.paymentMethod,
      'Payment Status': o.paymentStatus,
      'Items Dropped': o.items.map((i) => `${i.item.name} (${i.quantity} ${i.unitName})`).join('; '),
      'Returns': o.returns.map((r) => `[${r.condition}] ${r.item.name} (${r.quantity})`).join('; '),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales_Report');
    XLSX.writeFile(workbook, `Sales_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            <span>Sales Analytics & Performance Reports</span>
          </h2>
          <p className="text-sm text-slate-500">
            Interactive financial dashboards, moving product charts, and Excel/CSV export.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Period Selector */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
            {(['DAILY', 'MONTHLY', 'YEARLY'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  period === p
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <Button onClick={handleExportExcel} className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-sm cursor-pointer">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-indigo-100">
          <CardContent className="p-5">
            <span className="text-xs font-bold text-slate-500 uppercase">Total Revenue ({period})</span>
            <h3 className="text-2xl font-black text-indigo-700 mt-2">{formatRupiah(totalRevenue)}</h3>
            <p className="text-xs text-slate-500 mt-1">{orders.length} total completed orders</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-5">
            <span className="text-xs font-bold text-slate-500 uppercase">Avg. Order Value (AOV)</span>
            <h3 className="text-2xl font-black text-slate-900 mt-2">{formatRupiah(avgOrderValue)}</h3>
            <p className="text-xs text-slate-500 mt-1">Per store invoice</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-5">
            <span className="text-xs font-bold text-slate-500 uppercase">Total Units Dropped</span>
            <h3 className="text-2xl font-black text-slate-900 mt-2">{totalDeliveredQty} Units</h3>
            <p className="text-xs text-slate-500 mt-1">Across all product lines</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-5">
            <span className="text-xs font-bold text-slate-500 uppercase">Return Rate</span>
            <h3 className="text-2xl font-black text-amber-700 mt-2">{returnRatePercent}%</h3>
            <p className="text-xs text-slate-500 mt-1">{totalReturnedQty} returned units</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Revenue Trend Overview</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Daily revenue progression from completed store orders
            </CardDescription>
          </CardHeader>
          <CardContent>
            {salesTrendData.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesTrendData} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickFormatter={(v) => `Rp ${(v / 1000000).toFixed(0)}M`}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatRupiah(Number(val)), 'Revenue']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#4f46e5"
                      strokeWidth={3}
                      dot={{ fill: '#4f46e5', r: 5 }}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 w-full flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                <TrendingUp className="w-8 h-8 text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">Belum Ada Data Transaksi</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Grafik tren pendapatan akan muncul otomatis saat ada transaksi penjualan.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales Rep Performance Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600" />
              <span>Top-Performing Sales Reps</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Total revenue contribution per sales representative
            </CardDescription>
          </CardHeader>
          <CardContent>
            {repPerformanceData.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={repPerformanceData} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickFormatter={(v) => `Rp ${(v / 1000000).toFixed(0)}M`}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatRupiah(Number(val)), 'Sales Revenue']}
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                    <Bar dataKey="revenue" fill="#10b981" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 w-full flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                <Award className="w-8 h-8 text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">Belum Ada Performa Sales</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Peringkat kontribusi sales akan terhitung setelah ada faktur terbit.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Highest Moving Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-600" />
              <span>Highest Moving Items (Top Sellers)</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Top products ranked by gross field drop revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topProductsData.length > 0 ? (
              <div className="space-y-3">
                {topProductsData.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        #{idx + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900">{p.name}</h4>
                        <span className="text-slate-500">{p.count} units sold</span>
                      </div>
                    </div>
                    <span className="font-bold text-slate-900">{formatRupiah(p.revenue)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                <Package className="w-8 h-8 text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">Belum Ada Produk Terjual</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Daftar produk terlaris akan otomatis terisi dari barang yang diturunkan ke toko.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Good vs Broken Returns Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-amber-600" />
              <span>Return Condition Breakdown</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Re-sellable good items vs damaged/defect items
            </CardDescription>
          </CardHeader>
          <CardContent>
            {returnPieData.length > 0 ? (
              <>
                <div className="h-60 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={returnPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {returnPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any, name: any) => [`${val} Units`, name]}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 text-xs font-semibold pt-2">
                  <div className="flex items-center gap-1.5 text-emerald-700">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>Good (Re-sellable): {goodReturns} units</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-700">
                    <span className="w-3 h-3 rounded-full bg-rose-500" />
                    <span>Broken (Defect): {brokenReturns} units</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-64 w-full flex flex-col items-center justify-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                <RotateCcw className="w-8 h-8 text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">Tidak Ada Barang Retur</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Belum ada catatan pengembalian atau retur barang dari toko.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

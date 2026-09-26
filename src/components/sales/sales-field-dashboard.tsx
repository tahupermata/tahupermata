'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { DropReturnModal } from './drop-return-modal';
import { InvoiceModal } from './invoice-modal';
import { checkInVisitAction, updateVisitTargetQtyAction } from '@/app/actions/sales-rep-actions';
import { formatRupiah, formatBaseQuantityWithUnits, getLocalDateString } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';

import {
  Smartphone,
  MapPin,
  Phone,
  CheckCircle2,
  Clock,
  Navigation,
  Package,
  ArrowRight,
  Sparkles,
  MessageCircle,
  Truck,
  RotateCcw,
  Target,
  Edit2,
  Check,
  X,
  TrendingUp,
  AlertCircle,
  Wallet,
  Banknote,
  Landmark,
  Receipt,
  CheckCircle,
  Store,
  UserCheck,
} from 'lucide-react';

interface SalesFieldDashboardProps {
  salesUser: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  salesUsersList?: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  allVisits?: Array<any>;
  todayVisits?: Array<{
    id: string;
    salesId: string;
    visitDate: string;
    deliveryDate?: string | null;
    billingDate?: string | null;
    assignedItemId?: string | null;
    assignedStockQty?: number | null;
    assignedItem?: {
      id: string;
      name: string;
      sku: string;
    } | null;
    sequenceOrder: number;
    targetQuantity?: number | null;
    status: 'SCHEDULED' | 'CHECKED_IN' | 'COMPLETED' | 'SKIPPED';
    checkinTime?: Date | null;
    checkoutTime?: Date | null;
    notes?: string | null;
    store: {
      id: string;
      code: string;
      name: string;
      ownerName?: string | null;
      phone?: string | null;
      address: string;
      mapUrl?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      imageUrl?: string | null;
      targetMonthlySales?: number | null;
      defaultDailyTargetQty?: number | null;
    };
    orders?: Array<{
      id: string;
      invoiceNumber: string;
      transactionType?: 'DIRECT_DROP_BILL' | 'DROP_AND_COLLECT_PREV' | 'DROP_ONLY' | 'COLLECT_ONLY';
      totalAmount: number;
      discountAmount: number;
      netAmount: number;
      collectedAmount?: number | null;
      settledInvoiceIds?: string | null;
      paymentStatus: string;
      paymentMethod: string;
      items?: Array<{
        quantity: number;
        quantityBase: number;
        unitName?: string;
        unitPrice?: number;
        subtotal?: number;
        item?: { name: string };
      }>;
      returns?: Array<{
        quantity: number;
        condition: 'GOOD' | 'BROKEN';
        reason?: string;
        unitName?: string;
        item?: { name: string };
      }>;
    }>;
  }>;
  overdueVisits?: Array<{
    id: string;
    salesId: string;
    visitDate: string;
    deliveryDate?: string | null;
    billingDate?: string | null;
    assignedItemId?: string | null;
    assignedStockQty?: number | null;
    assignedItem?: {
      id: string;
      name: string;
      sku: string;
    } | null;
    sequenceOrder: number;
    targetQuantity?: number | null;
    status: 'SCHEDULED' | 'CHECKED_IN' | 'COMPLETED' | 'SKIPPED';
    checkinTime?: Date | null;
    checkoutTime?: Date | null;
    notes?: string | null;
    store: {
      id: string;
      code: string;
      name: string;
      ownerName?: string | null;
      phone?: string | null;
      address: string;
      mapUrl?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      imageUrl?: string | null;
      targetMonthlySales?: number | null;
      defaultDailyTargetQty?: number | null;
    };
    orders?: Array<{
      id: string;
      invoiceNumber: string;
      transactionType?: 'DIRECT_DROP_BILL' | 'DROP_AND_COLLECT_PREV' | 'DROP_ONLY' | 'COLLECT_ONLY';
      totalAmount: number;
      discountAmount: number;
      netAmount: number;
      collectedAmount?: number | null;
      settledInvoiceIds?: string | null;
      paymentStatus: string;
      paymentMethod: string;
      items?: Array<{
        quantity: number;
        quantityBase: number;
        unitName?: string;
        unitPrice?: number;
        subtotal?: number;
        item?: { name: string };
      }>;
      returns?: Array<{
        quantity: number;
        condition: 'GOOD' | 'BROKEN';
        reason?: string;
        unitName?: string;
        item?: { name: string };
      }>;
    }>;
  }>;
  salesStockItems: Array<{
    id: string;
    itemId: string;
    batchId?: string | null;
    quantity: number;
    batch?: {
      id: string;
      batchNo: string;
      expireDate: string;
    } | null;
    item: {
      id: string;
      sku: string;
      name: string;
      baseUnit: string;
      basePrice: number;
      imageUrl?: string | null;
      units: Array<{
        id: string;
        unitName: string;
        conversionRate: number;
        price?: number | null;
      }>;
    };
  }>;
  unpaidInvoices?: Array<{
    id: string;
    invoiceNumber: string;
    storeId: string;
    netAmount: number;
    paymentStatus: string;
    createdAt: any;
    visit?: {
      deliveryDate?: string | null;
      visitDate?: string | null;
      billingDate?: string | null;
    } | null;
    items?: Array<{
      quantity: number;
      unitName: string;
      unitPrice?: number | null;
      subtotal?: number | null;
      item: { name: string };
    }>;
  }>;
  catalogItems?: Array<{
    id: string;
    name: string;
    baseUnit: string;
    basePrice: number;
    units?: Array<{
      id: string;
      unitName: string;
      conversionRate: number;
      price?: number | null;
    }>;
  }>;
}

export function SalesFieldDashboard({
  salesUser,
  salesUsersList = [],
  allVisits = [],
  todayVisits = [],
  overdueVisits = [],
  salesStockItems = [],
  unpaidInvoices = [],
  catalogItems = [],
}: SalesFieldDashboardProps) {
  const router = useRouter();
  const todayStr = getLocalDateString();
  const [activeVisit, setActiveVisit] = React.useState<any | null>(null);
  const [isDropModalOpen, setIsDropModalOpen] = React.useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = React.useState(false);
  const [selectedInvoice, setSelectedInvoice] = React.useState<any | null>(null);
  const [isCheckingIn, setIsCheckingIn] = React.useState<string | null>(null);
  const [viewFilter, setViewFilter] = React.useState<'PENDING_FOCUS' | 'TODAY' | 'OVERDUE' | 'COMPLETED' | 'ALL'>('PENDING_FOCUS');
  const [completedDateFilter, setCompletedDateFilter] = React.useState<string>(todayStr);
  const [mobileDetailModal, setMobileDetailModal] = React.useState<'TRACKER_PHYSICAL' | 'TRACKER_FINANCE' | 'SALES_STOCK' | null>(null);

  // Scroll smoothly to the first overdue store
  const handleViewOverdue = () => {
    setViewFilter('OVERDUE');
    setTimeout(() => {
      const el = document.getElementById('route-itinerary-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  // Inline editing of target per visit
  const [editingTargetVisitId, setEditingTargetVisitId] = React.useState<string | null>(null);
  const [targetInputVal, setTargetInputVal] = React.useState<number>(0);
  const [isSavingTarget, setIsSavingTarget] = React.useState<boolean>(false);

  // Combine & annotate visits
  const combinedVisits = React.useMemo(() => {
    const map = new Map<string, any>();
    const sourceList = allVisits && allVisits.length > 0
      ? allVisits
      : [...(overdueVisits || []), ...(todayVisits || [])];

    sourceList.forEach((v) => {
      const checkoutDateStr = v.checkoutTime ? getLocalDateString(v.checkoutTime) : null;

      const hasUnpaidPastOrder = v.orders?.some((o: any) => {
        const bDate = o.billingDate || v.billingDate || v.visitDate;
        return o.paymentStatus === 'PENDING' && Boolean(bDate && bDate <= todayStr);
      });

      const isCompletedToday = v.status === 'COMPLETED' && (checkoutDateStr === todayStr || (!checkoutDateStr && v.visitDate === todayStr)) && !hasUnpaidPastOrder;
      const isPastCompleted = v.status === 'COMPLETED' && !isCompletedToday && !hasUnpaidPastOrder;

      // Scheduled in the future (tomorrow or beyond) and not completed, with no delivery today
      const isFuture = Boolean(
        v.status !== 'COMPLETED' &&
        v.visitDate &&
        v.visitDate > todayStr &&
        (!v.targetQuantity || v.targetQuantity === 0)
      );

      const isToday =
        !isFuture &&
        !isPastCompleted &&
        (isCompletedToday ||
          v.visitDate === todayStr ||
          (v.deliveryDate === todayStr && (v.targetQuantity || 0) > 0) ||
          (v.billingDate === todayStr && (!v.deliveryDate || v.deliveryDate <= todayStr)));

      const effectiveDate = v.billingDate || v.visitDate || v.deliveryDate;
      const isOverdue =
        Boolean(hasUnpaidPastOrder) ||
        (v.status !== 'COMPLETED' &&
        v.status !== 'SKIPPED' &&
        Boolean(effectiveDate && effectiveDate < todayStr));

      map.set(v.id, {
        ...v,
        isToday,
        isOverdue,
        isFuture,
        isPastCompleted,
        hasUnpaidPastOrder,
      });
    });

    return Array.from(map.values());
  }, [allVisits, todayVisits, overdueVisits, todayStr]);

  const activeVisitsList = React.useMemo(() => combinedVisits.filter((v) => !v.isFuture), [combinedVisits]);

  // Specific categorized visit groups
  const pendingFocusVisits = React.useMemo(() => {
    return activeVisitsList.filter(
      (v) => v.status !== 'COMPLETED' && v.status !== 'SKIPPED' && (v.isToday || v.isOverdue)
    );
  }, [activeVisitsList]);

  const todayVisitsList = React.useMemo(() => {
    return activeVisitsList.filter((v) => v.isToday);
  }, [activeVisitsList]);

  const overdueVisitsList = React.useMemo(() => {
    return activeVisitsList.filter((v) => v.isOverdue && v.status !== 'COMPLETED');
  }, [activeVisitsList]);

  const completedVisitsList = React.useMemo(() => {
    return activeVisitsList.filter((v) => v.status === 'COMPLETED');
  }, [activeVisitsList]);

  // Filtered visits based on active tab and optional date filter for completed
  const displayedVisits = React.useMemo(() => {
    if (viewFilter === 'PENDING_FOCUS') {
      return pendingFocusVisits;
    }
    if (viewFilter === 'OVERDUE') {
      return overdueVisitsList;
    }
    if (viewFilter === 'TODAY') {
      return todayVisitsList;
    }
    if (viewFilter === 'COMPLETED') {
      if (!completedDateFilter || completedDateFilter === 'ALL') {
        return completedVisitsList;
      }
      return completedVisitsList.filter((v) => {
        const cDate = v.checkoutTime
          ? getLocalDateString(v.checkoutTime)
          : (v.visitDate || v.deliveryDate);
        return cDate === completedDateFilter;
      });
    }
    return activeVisitsList;
  }, [
    activeVisitsList,
    viewFilter,
    pendingFocusVisits,
    overdueVisitsList,
    todayVisitsList,
    completedVisitsList,
    completedDateFilter,
  ]);

  const completedCount = activeVisitsList.filter((v) => v.status === 'COMPLETED').length;
  const progressPercent = activeVisitsList.length > 0 ? Math.round((completedCount / activeVisitsList.length) * 100) : 0;

  // 1. Calculate Physical Target (Pcs Tahu)
  const totalDailyTarget = activeVisitsList.reduce(
    (acc, v) => acc + (v.targetQuantity ?? v.store?.defaultDailyTargetQty ?? 0),
    0
  );

  const totalOverdueTarget = (overdueVisits || []).reduce(
    (acc, v) => acc + (v.targetQuantity ?? v.store?.defaultDailyTargetQty ?? 0),
    0
  );

  const totalDailyDelivered = activeVisitsList.reduce(
    (acc, v) =>
      acc +
      (v.orders?.reduce(
        (oAcc: number, ord: any) => oAcc + (ord.items?.reduce((iAcc: number, itm: any) => iAcc + (itm.quantityBase || 0), 0) || 0),
        0
      ) || 0),
    0
  );

  const totalRemainingTarget = Math.max(0, totalDailyTarget - totalDailyDelivered);
  const targetFulfillmentPercent =
    totalDailyTarget > 0 ? Math.min(100, Math.round((totalDailyDelivered / totalDailyTarget) * 100)) : 0;

  // 2. Calculate Money & Collection Metrics (Uang Setoran)
  const allTodayOrders = activeVisitsList.flatMap((v) => v.orders || []);

  const totalCashCollected = allTodayOrders.reduce((sum, ord) => {
    if (ord.paymentMethod === 'CASH') {
      return sum + (ord.collectedAmount !== null && ord.collectedAmount !== undefined ? ord.collectedAmount : (ord.paymentStatus === 'PAID' ? ord.netAmount : 0));
    }
    return sum;
  }, 0);

  const totalTransferCollected = allTodayOrders.reduce((sum, ord) => {
    if (ord.paymentMethod === 'TRANSFER') {
      return sum + (ord.collectedAmount !== null && ord.collectedAmount !== undefined ? ord.collectedAmount : (ord.paymentStatus === 'PAID' ? ord.netAmount : 0));
    }
    return sum;
  }, 0);

  const totalMoneyWajibSetor = totalCashCollected + totalTransferCollected;

  const totalTempoTitipToday = allTodayOrders.reduce((sum, ord) => {
    if (ord.paymentStatus === 'PENDING' || ord.paymentMethod === 'TEMPO') {
      return sum + (ord.netAmount || 0);
    }
    return sum;
  }, 0);

  const handleStartEditTarget = (visit: any) => {
    setEditingTargetVisitId(visit.id);
    setTargetInputVal(visit.targetQuantity ?? visit.store?.defaultDailyTargetQty ?? 200);
  };

  const handleSaveTarget = async (visitId: string) => {
    setIsSavingTarget(true);
    try {
      await updateVisitTargetQtyAction(visitId, targetInputVal);
      setEditingTargetVisitId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingTarget(false);
    }
  };

  const handleCheckIn = async (visitId: string) => {
    setIsCheckingIn(visitId);
    try {
      await checkInVisitAction(visitId);
    } catch (err) {
      console.error(err);
    } finally {
      setIsCheckingIn(null);
    }
  };

  const handleOpenDropReturn = (visit: any) => {
    setActiveVisit({
      ...visit,
      sales: salesUser,
    });
    setIsDropModalOpen(true);
  };

  const handleOrderCompleted = (invoiceData: any) => {
    setSelectedInvoice(invoiceData);
    setIsInvoiceModalOpen(true);
  };

  const handleViewInvoice = (visit: any) => {
    try {
      const ord = Array.isArray(visit.orders) && visit.orders.length > 0
        ? visit.orders[visit.orders.length - 1]
        : visit.orders?.[0];

      const isCollectOnly = ord?.transactionType === 'COLLECT_ONLY';
      const orderItemsList = ord?.items && ord.items.length > 0
        ? ord.items.map((oi: any) => ({
            name: oi.item?.name || visit.assignedItem?.name || 'Tahu',
            unitName: oi.unitName || 'PCS',
            quantity: oi.quantity || 0,
            unitPrice: oi.unitPrice || 1000,
            subtotal: oi.subtotal || (oi.quantity ? oi.quantity * 1000 : 0),
          }))
        : isCollectOnly
        ? []
        : [
            {
              name: visit.assignedItem?.name || 'Tahu',
              unitName: 'PCS',
              quantity: visit.assignedStockQty || visit.targetQuantity || 50,
              unitPrice: 1000,
              subtotal: ord?.totalAmount || ord?.netAmount || 50000,
            },
          ];

      const orderReturnsList = ord?.returns && ord.returns.length > 0
        ? ord.returns.map((r: any) => {
            const uPrice = r.unitPrice || r.item?.basePrice || 1000;
            const sub = r.subtotal || (uPrice * (r.quantity || 0));
            return {
              name: r.item?.name || visit.assignedItem?.name || 'Tahu',
              unitName: r.unitName || 'PCS',
              quantity: r.quantity || 0,
              unitPrice: uPrice,
              subtotal: sub,
              condition: r.condition || 'GOOD',
              reason: r.reason || '',
            };
          })
        : [];

      let settledList: any[] = [];
      if (ord?.settledInvoiceIds) {
        try {
          const ids: string[] = typeof ord.settledInvoiceIds === 'string' ? JSON.parse(ord.settledInvoiceIds) : ord.settledInvoiceIds;
          if (Array.isArray(ids)) {
            settledList = (unpaidInvoices || [])
              .filter((u) => ids.includes(u.id))
              .map((u) => ({
                invoiceNumber: u.invoiceNumber,
                netAmount: u.netAmount,
                createdAt: u.visit?.deliveryDate || u.visit?.visitDate || u.createdAt,
                items: (u.items || []).map((it: any) => ({
                  name: it.item?.name || 'Tahu',
                  unitName: it.unitName || 'PCS',
                  quantity: it.quantity,
                  unitPrice: it.unitPrice || 1000,
                  subtotal: it.subtotal,
                })),
              }));
          }
        } catch (e) {}
      }

      const payload = {
        invoiceNumber: ord?.invoiceNumber || (visit.id ? `INV-${visit.id.slice(0, 8)}` : 'INV-000000'),
        transactionType: ord?.transactionType || 'DIRECT_DROP_BILL',
        storeName: visit.store?.name || visit.storeName || 'Toko',
        storePhone: visit.store?.phone || null,
        storeAddress: visit.store?.address || '-',
        salesName: salesUser?.name || visit.sales?.name || 'Sales Rep',
        items: orderItemsList,
        returns: orderReturnsList,
        settledInvoices: settledList,
        totalAmount: ord?.totalAmount !== undefined ? ord.totalAmount : (ord?.netAmount || 0),
        discountAmount: ord?.discountAmount || 0,
        netAmount: ord?.netAmount !== undefined ? ord.netAmount : 0,
        collectedAmount: ord?.collectedAmount !== undefined ? ord.collectedAmount : (ord?.paymentStatus === 'PAID' ? ord?.netAmount : 0),
        paymentMethod: ord?.paymentMethod || 'CASH',
        createdAt: ord?.createdAt || visit.checkoutTime || visit.visitDate || new Date(),
      };

      setSelectedInvoice(payload);
      setIsInvoiceModalOpen(true);
    } catch (err) {
      console.error('Failed to open invoice:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full max-w-full overflow-x-hidden">
      {/* Admin / Multi-Sales Rep Switcher Bar */}
      {salesUsersList && salesUsersList.length > 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 border border-indigo-700/60 p-3.5 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">
                Mode Monitoring & Operasional
              </span>
              <p className="text-xs font-black text-white flex items-center gap-1.5">
                <span>Melihat Data Sales:</span>
                <span className="text-emerald-300 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-md font-mono">
                  {salesUser.name}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <label htmlFor="sales-rep-select" className="text-xs text-indigo-200 font-medium whitespace-nowrap">
              Ganti Sales:
            </label>
            <select
              id="sales-rep-select"
              value={salesUser.id}
              onChange={(e) => router.push(`/sales?salesId=${e.target.value}`)}
              className="bg-slate-900/90 border border-indigo-500/50 hover:border-indigo-400 text-white text-xs font-bold px-3 py-1.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer shadow-inner"
            >
              {salesUsersList.map((u) => (
                <option key={u.id} value={u.id} className="bg-slate-900 text-white">
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Mobile Top Header Banner */}
      <div className="rounded-2xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-indigo-900 p-5 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center font-bold text-emerald-300">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                Sales Rep Field Portal
              </span>
              <h2 className="text-xl font-black text-white">{salesUser.name}</h2>
            </div>
          </div>

          <Badge variant="success" className="bg-emerald-500/30 text-emerald-200 border-emerald-400/40">
            Active On-Field
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
          <span className="text-indigo-200">
            Progres Kunjungan: <strong>{completedCount} dari {activeVisitsList.length} Toko Selesai</strong>
          </span>
          <span className="font-bold text-white">{progressPercent}%</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2 mt-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-emerald-400 to-indigo-400 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* OVERDUE WARNING ALERT BANNER */}
      {overdueVisits && overdueVisits.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-500/15 via-amber-50 to-orange-50 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center gap-1.5 flex-wrap">
                <span>Perhatian: Ada {overdueVisits.length} Target Kunjungan Tertunda dari Kemarin!</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                  Perlu Ditindaklanjuti
                </span>
              </h4>
              <p className="text-xs text-amber-900 mt-0.5">
                Terdapat jadwal pengantaran atau penagihan kemarin ({totalOverdueTarget.toLocaleString('id-ID')} Pcs) yang belum diselesaikan. Anda dapat melakukan Check-In dan menyelesaikan transaksi toko sekarang.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Button
              size="sm"
              onClick={handleViewOverdue}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer shadow-xs"
            >
              Lihat Target Tertunda ({overdueVisits.length})
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MOBILE COMPACT 1-ROW WIDGET: TRACKER 1, TRACKER 2, STOK SALES (MOBILE)    */}
      {/* ========================================================================= */}
      <div className="block md:hidden">
        <div className="grid grid-cols-3 gap-2">
          {/* Tracker 1: Fisik (Pcs) */}
          <button
            type="button"
            onClick={() => setMobileDetailModal('TRACKER_PHYSICAL')}
            className="flex flex-col items-center text-center p-2.5 rounded-2xl bg-white border border-indigo-100 shadow-xs hover:border-indigo-300 active:scale-95 transition-all group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600 mb-1.5 shadow-2xs group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Package className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Fisik (Pcs)</span>
            <span className="text-xs font-black text-slate-900 leading-tight mt-0.5">
              {totalDailyDelivered.toLocaleString('id-ID')}/{totalDailyTarget.toLocaleString('id-ID')}
            </span>
            <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-full mt-1">
              {targetFulfillmentPercent}% Capai
            </span>
          </button>

          {/* Tracker 2: Setoran (Rp) */}
          <button
            type="button"
            onClick={() => setMobileDetailModal('TRACKER_FINANCE')}
            className="flex flex-col items-center text-center p-2.5 rounded-2xl bg-white border border-emerald-100 shadow-xs hover:border-emerald-300 active:scale-95 transition-all group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 mb-1.5 shadow-2xs group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Wajib Setor</span>
            <span className="text-[11px] font-black text-slate-900 leading-tight mt-0.5 truncate max-w-full">
              {formatRupiah(totalMoneyWajibSetor)}
            </span>
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full mt-1">
              Cash + Trf
            </span>
          </button>

          {/* Tracker 3: Stok Bawaan Sales */}
          <button
            type="button"
            onClick={() => setMobileDetailModal('SALES_STOCK')}
            className="flex flex-col items-center text-center p-2.5 rounded-2xl bg-white border border-blue-100 shadow-xs hover:border-blue-300 active:scale-95 transition-all group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 mb-1.5 shadow-2xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Truck className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Stok Sales</span>
            <span className="text-xs font-black text-slate-900 leading-tight mt-0.5">
              {salesStockItems.reduce((sum, s) => sum + s.quantity, 0).toLocaleString('id-ID')} Pcs
            </span>
            <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full mt-1">
              {salesStockItems.length} Produk
            </span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP VIEW: FULL TRACKERS & STOK SALES                                  */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-4">
        {/* ========================================================================= */}
        {/* DUAL TRACKER 1: FISIK BARANG (PCS TAHU)                                   */}
        {/* ========================================================================= */}
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
            <Package className="w-4 h-4 text-indigo-600" />
            <span>Tracker 1: Target & Realisasi Fisik Barang (Pcs)</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-gradient-to-br from-indigo-50/80 to-white border-indigo-100/80 shadow-xs">
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wide flex items-center gap-1">
                  <Target className="w-3.5 h-3.5 text-indigo-600" />
                  Target Kirim
                </span>
                <div className="text-xl font-black text-slate-900">
                  {totalDailyTarget.toLocaleString('id-ID')} <span className="text-xs font-semibold text-slate-500">Pcs</span>
                </div>
                <p className="text-[10px] text-slate-500">
                  {todayVisits.length} Hari Ini {overdueVisits.length > 0 ? `• ${overdueVisits.length} Tertunda` : ''}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-50/80 to-white border-emerald-100/80 shadow-xs">
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide flex items-center gap-1">
                  <Package className="w-3.5 h-3.5 text-emerald-600" />
                  Realisasi Drop
                </span>
                <div className="text-xl font-black text-emerald-950">
                  {totalDailyDelivered.toLocaleString('id-ID')} <span className="text-xs font-semibold text-slate-500">Pcs</span>
                </div>
                <p className="text-[10px] text-emerald-700 font-medium">{completedCount} Toko selesai</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50/80 to-white border-amber-100/80 shadow-xs">
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Sisa Target
                </span>
                <div className="text-xl font-black text-amber-950">
                  {totalRemainingTarget.toLocaleString('id-ID')} <span className="text-xs font-semibold text-slate-500">Pcs</span>
                </div>
                <p className="text-[10px] text-slate-500">{activeVisitsList.length - completedCount} Toko belum</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-violet-50/80 to-white border-violet-100/80 shadow-xs">
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] font-bold text-violet-700 uppercase tracking-wide flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-violet-600" />
                  Capaian Fisik
                </span>
                <div className="text-xl font-black text-violet-950">
                  {targetFulfillmentPercent}%
                </div>
                <div className="w-full bg-violet-100 rounded-full h-1.5 mt-1 overflow-hidden">
                  <div
                    className="bg-violet-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${targetFulfillmentPercent}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DUAL TRACKER 2: TARGET & ARUS UANG SETORAN (SETORAN KASIR)                 */}
        {/* ========================================================================= */}
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <span>Tracker 2: Uang Diterima & Wajib Setor Hari Ini</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Main Total Box */}
            <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-emerald-700 shadow-md">
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wide flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-emerald-200" />
                  Total Wajib Setor
                </span>
                <div className="text-xl font-black text-white">
                  {formatRupiah(totalMoneyWajibSetor)}
                </div>
                <p className="text-[10px] text-emerald-100">Uang tunai + transfer hari ini</p>
              </CardContent>
            </Card>

            {/* Cash in Hand */}
            <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200 shadow-xs">
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide flex items-center gap-1">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                  Uang Tunai (Cash)
                </span>
                <div className="text-lg font-black text-slate-900">
                  {formatRupiah(totalCashCollected)}
                </div>
                <p className="text-[10px] text-emerald-700 font-medium">Dipegang sales (setor kasir)</p>
              </CardContent>
            </Card>

            {/* Transfer Bank */}
            <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200 shadow-xs">
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide flex items-center gap-1">
                  <Landmark className="w-3.5 h-3.5 text-blue-600" />
                  Transfer Bank
                </span>
                <div className="text-lg font-black text-slate-900">
                  {formatRupiah(totalTransferCollected)}
                </div>
                <p className="text-[10px] text-blue-700 font-medium">Masuk rekening kantor</p>
              </CardContent>
            </Card>

            {/* Tempo / Konsinyasi Tertitip */}
            <Card className="bg-gradient-to-br from-slate-50 to-white border-slate-200 shadow-xs">
              <CardContent className="p-3.5 space-y-1">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Piutang Baru (Tempo)
                </span>
                <div className="text-lg font-black text-amber-950">
                  {formatRupiah(totalTempoTitipToday)}
                </div>
                <p className="text-[10px] text-amber-800">Ditagih kunjungan berikut</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bag / Vehicle Stock Inventory Accordion */}
        <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/40 to-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600" />
                <CardTitle className="text-sm">Stok di Sales (Kendaraan / Tas)</CardTitle>
              </div>
              <span className="text-xs font-bold text-indigo-700">
                {salesStockItems.length} Products Available
              </span>
            </div>
            <CardDescription className="text-xs">
              Stok yang saat ini dibawa sales siap untuk didrop ke toko
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {salesStockItems.length === 0 ? (
                <p className="text-xs text-slate-400 col-span-full">
                  Belum ada stok yang di-assign. Silakan minta assign stok di menu Assign Stock / Dispatch.
                </p>
              ) : (
                salesStockItems.map((stock) => (
                  <div
                    key={stock.id}
                    className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {stock.item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={stock.item.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                    <div className="truncate flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{stock.item.name}</p>
                      <p className="text-[11px] font-bold text-emerald-700">
                        {stock.quantity} {stock.item.baseUnit}{' '}
                        <span className="text-slate-400 font-normal">
                          ({formatBaseQuantityWithUnits(stock.quantity, stock.item.baseUnit, stock.item.units)})
                        </span>
                      </p>
                      {stock.batch && (
                        <p className="text-[10px] font-semibold text-indigo-700 truncate mt-0.5">
                          Batch: {stock.batch.batchNo} • Exp: {stock.batch.expireDate}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today Itinerary Stores Stack */}
      <div id="route-itinerary-section" className="space-y-4 scroll-mt-6 w-full max-w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full max-w-full">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2 shrink-0">
            <MapPin className="w-5 h-5 text-indigo-600" />
            <span>Rute Kunjungan Toko ({displayedVisits.length} Toko)</span>
          </h3>

          {/* Clean Filter Tabs without icons & responsive container */}
          <div className="w-full md:w-auto max-w-full overflow-x-auto flex items-center gap-1 bg-slate-100 p-1 rounded-xl no-scrollbar shrink-0 touch-pan-x">
            <button
              type="button"
              onClick={() => setViewFilter('PENDING_FOCUS')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                viewFilter === 'PENDING_FOCUS'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Perlu Selesai ({pendingFocusVisits.length})
            </button>

            <button
              type="button"
              onClick={() => setViewFilter('TODAY')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                viewFilter === 'TODAY'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Hari Ini ({todayVisitsList.length})
            </button>

            {overdueVisitsList.length > 0 && (
              <button
                type="button"
                onClick={() => setViewFilter('OVERDUE')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  viewFilter === 'OVERDUE'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-amber-800 hover:bg-amber-100/60'
                }`}
              >
                Tertunda ({overdueVisitsList.length})
              </button>
            )}

            <button
              type="button"
              onClick={() => setViewFilter('COMPLETED')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                viewFilter === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Selesai ({completedVisitsList.length})
            </button>

            <button
              type="button"
              onClick={() => setViewFilter('ALL')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                viewFilter === 'ALL'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Semua ({activeVisitsList.length})
            </button>
          </div>
        </div>

        {/* Date Filter Bar when Filter Selesai is active */}
        {viewFilter === 'COMPLETED' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-xs w-full max-w-full">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-emerald-950 whitespace-nowrap">Filter Tanggal:</span>
              <input
                type="date"
                value={completedDateFilter === 'ALL' ? '' : completedDateFilter}
                onChange={(e) => setCompletedDateFilter(e.target.value || 'ALL')}
                className="bg-white border border-emerald-300 px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer shadow-2xs"
              />
            </div>
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setCompletedDateFilter(todayStr)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  completedDateFilter === todayStr
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100/50'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setCompletedDateFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  completedDateFilter === 'ALL'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100/50'
                }`}
              >
                Semua Tanggal
              </button>
            </div>
          </div>
        )}

        {activeVisitsList.length === 0 ? (
          <Card className="p-8 text-center border-dashed border-2 border-slate-300 bg-white/80 rounded-2xl space-y-4 shadow-sm">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-100/80 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <Store className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base font-black text-slate-900">Belum Ada Rute / Jadwal Kunjungan Toko</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Sales Rep <strong>{salesUser.name}</strong> belum memiliki jadwal rute kunjungan toko atau stok alokasi untuk hari ini.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <a
                href="/assign-stock"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <Truck className="w-4 h-4" />
                <span>Assign Stok & Jadwalkan Kunjungan Toko</span>
              </a>
              <a
                href="/stores"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Store className="w-4 h-4" />
                <span>Lihat Data Toko & Target</span>
              </a>
            </div>
          </Card>
        ) : displayedVisits.length === 0 ? (
          <Card className="p-8 text-center text-slate-500 bg-white/60 border-slate-200">
            <p className="text-sm font-medium">
              {viewFilter === 'PENDING_FOCUS'
                ? 'Semua target kunjungan hari ini dan tertunda sudah selesai dikerjakan! 🎉'
                : viewFilter === 'TODAY'
                ? 'Tidak ada jadwal kunjungan toko untuk hari ini.'
                : viewFilter === 'OVERDUE'
                ? 'Tidak ada jadwal kunjungan yang tertunda.'
                : viewFilter === 'COMPLETED'
                ? completedDateFilter === 'ALL'
                  ? 'Belum ada kunjungan toko yang selesai.'
                  : `Tidak ada kunjungan toko yang selesai pada tanggal ${completedDateFilter}.`
                : 'Tidak ada daftar kunjungan toko.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {displayedVisits.map((visit, index) => {
              const isCheckedIn = visit.status === 'CHECKED_IN';
              const isCompleted = visit.status === 'COMPLETED';
              const isScheduled = visit.status === 'SCHEDULED';
              const isOverdue = visit.isOverdue && !isCompleted;

              const targetQty = visit.targetQuantity ?? visit.store?.defaultDailyTargetQty ?? 0;
              const deliveredQty =
                visit.orders?.reduce(
                  (acc: number, ord: any) =>
                    acc +
                    (ord.items?.reduce((iAcc: number, itm: any) => iAcc + (itm.quantityBase || 0), 0) || 0),
                  0
                ) || 0;

              const isEditingThisTarget = editingTargetVisitId === visit.id;

              // Unpaid invoices for this store
              const storeUnpaid = unpaidInvoices.filter((inv) => inv.storeId === visit.store?.id);
              const totalStoreUnpaidAmount = storeUnpaid.reduce((s, i) => s + i.netAmount, 0);

              // Latest completed order on this visit
              const latestOrder = visit.orders?.[0];

              return (
                <Card
                  key={visit.id}
                  className={`p-3.5 sm:p-4 rounded-2xl transition-all border ${
                    isCheckedIn
                      ? 'border-indigo-500 bg-white ring-2 ring-indigo-500/15 shadow-md'
                      : isCompleted
                      ? 'border-slate-200 bg-slate-50/70'
                      : isOverdue
                      ? 'border-amber-300 bg-amber-50/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  {/* Top Section: Store Info & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Sequence + Store Details */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-700'
                            : isCheckedIn
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : isOverdue
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
                            {visit.store?.name || 'Toko'}
                          </h4>
                          {visit.store?.code && (
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {visit.store.code}
                            </span>
                          )}
                          {isOverdue && (
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                              Tertunda
                            </span>
                          )}
                          {isCheckedIn && (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full animate-pulse">
                              Sedang Check-In
                            </span>
                          )}
                          {isCompleted && (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              Selesai
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 mt-0.5 truncate max-w-lg">
                          {visit.store?.address || '-'}
                        </p>
                      </div>
                    </div>

                    {/* Right: Quick Action Buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {/* Quick WA */}
                      {visit.store?.phone && (
                        <a
                          href={`https://wa.me/${visit.store.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                          title="Hubungi WhatsApp"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {/* Quick Maps */}
                      <a
                        href={
                          visit.store?.mapUrl
                            ? (visit.store.mapUrl.startsWith('http') ? visit.store.mapUrl : `https://${visit.store.mapUrl}`)
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(visit.store?.address || '')}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                        title="Buka Peta Lokasi"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                      </a>

                      {/* Primary Workflow CTA */}
                      {isScheduled && (
                        <Button
                          size="sm"
                          onClick={() => handleCheckIn(visit.id)}
                          disabled={isCheckingIn === visit.id}
                          className={`${
                            isOverdue
                              ? 'bg-amber-600 hover:bg-amber-700 text-white'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          } font-bold text-xs h-8 px-3 rounded-xl cursor-pointer shadow-xs`}
                        >
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          <span>{isCheckingIn === visit.id ? 'Loading...' : 'Check-In'}</span>
                        </Button>
                      )}

                      {isCheckedIn && (
                        <Button
                          size="sm"
                          onClick={() => handleOpenDropReturn(visit)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 px-3.5 rounded-xl cursor-pointer shadow-sm shadow-indigo-600/30"
                        >
                          <Package className="w-3.5 h-3.5 mr-1" />
                          <span>Proses Transaksi</span>
                        </Button>
                      )}

                      {isCompleted && (
                        <div className="flex items-center gap-1.5">
                          {visit.hasUnpaidPastOrder && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenDropReturn(visit)}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 px-3 rounded-xl cursor-pointer shadow-xs"
                            >
                              <Wallet className="w-3.5 h-3.5 mr-1" />
                              <span>Tagih Nota</span>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewInvoice(visit)}
                            className="text-xs font-bold h-8 px-3 rounded-xl text-indigo-700 border-indigo-200 hover:bg-indigo-50 cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                            <span>Nota / WA</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Notice / Catatan Khusus Warning Banner */}
                  {visit.notes && visit.notes.trim() !== '' && (
                    <div className="mt-2.5 flex items-start gap-2 p-2.5 rounded-xl bg-amber-50/90 border border-amber-300/80 text-amber-950 text-xs shadow-2xs">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="flex-1 leading-snug">
                        <span className="font-black text-amber-900 mr-1.5 uppercase tracking-wider text-[10px] bg-amber-200/90 px-1.5 py-0.5 rounded font-mono">
                          Catatan Khusus
                        </span>
                        <span className="font-semibold text-amber-950">{visit.notes}</span>
                      </div>
                    </div>
                  )}

                  {/* Bottom Strip: Concise Metrics (Target, Drop, Financials) */}
                  <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    {/* Target & Realisasi Drop */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-medium">Target:</span>
                        {isEditingThisTarget ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              value={targetInputVal}
                              onChange={(e) => setTargetInputVal(Math.max(0, Number(e.target.value)))}
                              className="w-16 h-6 px-1.5 text-xs font-bold text-slate-900 bg-white border border-indigo-500 rounded focus:outline-none"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveTarget(visit.id)}
                              disabled={isSavingTarget}
                              className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[10px] font-bold"
                            >
                              OK
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTargetVisitId(null)}
                              className="p-0.5 text-slate-400 hover:text-slate-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 font-bold text-slate-900">
                            <span>{targetQty.toLocaleString('id-ID')} Pcs</span>
                            <button
                              type="button"
                              onClick={() => handleStartEditTarget(visit)}
                              className="p-0.5 text-slate-400 hover:text-indigo-600 cursor-pointer"
                              title="Edit Target"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-slate-500 font-medium">Drop:</span>
                        <span className={`font-bold ${deliveredQty > 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                          {deliveredQty.toLocaleString('id-ID')} Pcs
                        </span>
                      </div>

                      {/* Unpaid Previous Debt Warning if exists */}
                      {storeUnpaid.length > 0 && !isCompleted && (
                        <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          Nota Belum Lunas: {formatRupiah(totalStoreUnpaidAmount)}
                        </span>
                      )}
                    </div>

                    {/* Financial result or transaction type when completed */}
                    {isCompleted && latestOrder && (
                      <div className="flex items-center gap-2 self-start sm:self-auto font-semibold">
                        <span className="text-slate-500">Uang Diterima:</span>
                        <span className="font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          {formatRupiah(latestOrder.collectedAmount ?? (latestOrder.paymentStatus === 'PAID' ? latestOrder.netAmount : 0))}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Drop & Return Modal with 4 Modes */}
      <DropReturnModal
        open={isDropModalOpen}
        onOpenChange={setIsDropModalOpen}
        visit={activeVisit}
        salesStockItems={salesStockItems}
        unpaidInvoices={unpaidInvoices}
        catalogItems={catalogItems}
        onOrderCompleted={handleOrderCompleted}
      />

      {/* Dynamic Invoice & WhatsApp Dispatch Modal */}
      <InvoiceModal
        open={isInvoiceModalOpen}
        onOpenChange={setIsInvoiceModalOpen}
        invoiceData={selectedInvoice}
      />

      {/* ========================================================================= */}
      {/* MOBILE POPUP DIALOGS FOR TRACKER 1, TRACKER 2 & SALES STOCK               */}
      {/* ========================================================================= */}

      {/* Modal Detail Tracker 1 (Fisik) */}
      <Dialog
        open={mobileDetailModal === 'TRACKER_PHYSICAL'}
        onOpenChange={(open) => !open && setMobileDetailModal(null)}
        title="Tracker 1: Fisik Barang (Pcs)"
        description="Detail target, realisasi drop, dan persentase capaian hari ini."
      >
        <div className="p-4 space-y-3 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-indigo-600" />
                Target Kirim
              </span>
              <div className="text-lg font-black text-slate-900">
                {totalDailyTarget.toLocaleString('id-ID')} <span className="text-xs font-semibold text-slate-500">Pcs</span>
              </div>
              <p className="text-[10px] text-slate-500">
                {todayVisits.length} Hari Ini {overdueVisits.length > 0 ? `• ${overdueVisits.length} Tertunda` : ''}
              </p>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-emerald-600" />
                Realisasi Drop
              </span>
              <div className="text-lg font-black text-emerald-950">
                {totalDailyDelivered.toLocaleString('id-ID')} <span className="text-xs font-semibold text-slate-500">Pcs</span>
              </div>
              <p className="text-[10px] text-emerald-700 font-medium">{completedCount} Toko selesai</p>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Sisa Target
              </span>
              <div className="text-lg font-black text-amber-950">
                {totalRemainingTarget.toLocaleString('id-ID')} <span className="text-xs font-semibold text-slate-500">Pcs</span>
              </div>
              <p className="text-[10px] text-slate-500">{activeVisitsList.length - completedCount} Toko belum</p>
            </div>

            <div className="p-3 bg-violet-50/70 border border-violet-100 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wide flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-violet-600" />
                Capaian Fisik
              </span>
              <div className="text-lg font-black text-violet-950">
                {targetFulfillmentPercent}%
              </div>
              <div className="w-full bg-violet-100 rounded-full h-1.5 mt-1 overflow-hidden">
                <div
                  className="bg-violet-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${targetFulfillmentPercent}%` }}
                />
              </div>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full mt-2 font-bold text-xs cursor-pointer"
            onClick={() => setMobileDetailModal(null)}
          >
            Tutup
          </Button>
        </div>
      </Dialog>

      {/* Modal Detail Tracker 2 (Setoran) */}
      <Dialog
        open={mobileDetailModal === 'TRACKER_FINANCE'}
        onOpenChange={(open) => !open && setMobileDetailModal(null)}
        title="Tracker 2: Uang Diterima & Setoran"
        description="Rekapitulasi setoran kasir, tunai, transfer, dan tempo hari ini."
      >
        <div className="p-4 space-y-3 max-h-[75vh] overflow-y-auto">
          <div className="p-4 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wide flex items-center gap-1">
              <Wallet className="w-4 h-4 text-emerald-200" />
              Total Wajib Setor
            </span>
            <div className="text-2xl font-black text-white">
              {formatRupiah(totalMoneyWajibSetor)}
            </div>
            <p className="text-[11px] text-emerald-100">Uang tunai + transfer yang harus disetorkan hari ini</p>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide flex items-center gap-1">
                <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                Uang Tunai (Cash)
              </span>
              <div className="text-lg font-black text-slate-900">
                {formatRupiah(totalCashCollected)}
              </div>
              <p className="text-[10px] text-emerald-700 font-medium">💵 Dipegang sales (disetor fisik ke kasir)</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide flex items-center gap-1">
                <Landmark className="w-3.5 h-3.5 text-blue-600" />
                Transfer Bank
              </span>
              <div className="text-lg font-black text-slate-900">
                {formatRupiah(totalTransferCollected)}
              </div>
              <p className="text-[10px] text-blue-700 font-medium">📱 Masuk langsung rekening kantor</p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Piutang Baru (Tempo)
              </span>
              <div className="text-lg font-black text-amber-950">
                {formatRupiah(totalTempoTitipToday)}
              </div>
              <p className="text-[10px] text-amber-800">Ditagih pada kunjungan berikutnya</p>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full mt-2 font-bold text-xs cursor-pointer"
            onClick={() => setMobileDetailModal(null)}
          >
            Tutup
          </Button>
        </div>
      </Dialog>

      {/* Modal Detail Stok di Sales */}
      <Dialog
        open={mobileDetailModal === 'SALES_STOCK'}
        onOpenChange={(open) => !open && setMobileDetailModal(null)}
        title="Stok di Sales (Kendaraan / Tas)"
        description={`Daftar ${salesStockItems.length} produk siap didistribusikan ke toko`}
      >
        <div className="p-4 space-y-3 max-h-[75vh] overflow-y-auto">
          <div className="flex items-center justify-between p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-950">Total Stok Dibawa</span>
            </div>
            <span className="text-xs font-black text-indigo-700">
              {salesStockItems.reduce((sum, s) => sum + s.quantity, 0).toLocaleString('id-ID')} Pcs ({salesStockItems.length} Produk)
            </span>
          </div>

          <div className="space-y-2">
            {salesStockItems.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Belum ada stok yang di-assign. Silakan minta assign stok di menu Assign Stock / Dispatch.
              </div>
            ) : (
              salesStockItems.map((stock) => (
                <div
                  key={stock.id}
                  className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-3"
                >
                  <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {stock.item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={stock.item.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="truncate flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{stock.item.name}</p>
                    <p className="text-[11px] font-bold text-emerald-700">
                      {stock.quantity} {stock.item.baseUnit}{' '}
                      <span className="text-slate-400 font-normal">
                        ({formatBaseQuantityWithUnits(stock.quantity, stock.item.baseUnit, stock.item.units)})
                      </span>
                    </p>
                    {stock.batch && (
                      <p className="text-[10px] font-semibold text-indigo-700 truncate mt-0.5">
                        Batch: {stock.batch.batchNo} • Exp: {stock.batch.expireDate}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <Button
            variant="outline"
            className="w-full mt-2 font-bold text-xs cursor-pointer"
            onClick={() => setMobileDetailModal(null)}
          >
            Tutup
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

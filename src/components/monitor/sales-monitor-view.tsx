'use client';

import * as React from 'react';
import { formatRupiah, formatDateTime, formatDate, getLocalDateString } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import {
  Activity,
  CheckCircle2,
  Clock,
  Store,
  DollarSign,
  RotateCcw,
  Truck,
  Filter,
  User,
  Package,
  Wallet,
  Receipt,
  ArrowDownRight,
  TrendingUp,
  CreditCard,
  Banknote,
  FileSpreadsheet,
  AlertTriangle,
  AlertCircle,
  Calendar,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Search,
  Navigation,
  Phone,
  Layers,
  X,
  SlidersHorizontal,
  Eye,
  MapPin,
  FileText,
  Check,
} from 'lucide-react';

interface SalesMonitorProps {
  salesUsers: Array<{ id: string; name: string; email?: string | null; avatarUrl?: string | null }>;
  itemsList?: Array<{ id: string; name: string; sku: string; basePrice: number; baseUnit: string }>;
  visits: Array<{
    id: string;
    visitDate: string;
    deliveryDate?: string | null;
    billingDate?: string | null;
    status: string;
    sequenceOrder?: number | null;
    targetQuantity?: number | null;
    assignedStockQty?: number | null;
    assignedItemId?: string | null;
    assignedItem?: {
      id: string;
      name: string;
      sku: string;
      basePrice?: number;
    } | null;
    checkinTime?: Date | null;
    checkoutTime?: Date | null;
    notes?: string | null;
    sales: {
      id: string;
      name: string;
      email?: string | null;
      avatarUrl?: string | null;
    };
    store: {
      id: string;
      code: string;
      name: string;
      address: string;
      ownerName?: string | null;
      phone?: string | null;
      mapUrl?: string | null;
      defaultDailyTargetQty?: number | null;
    };
    orders: Array<{
      id: string;
      invoiceNumber: string;
      netAmount: number;
      collectedAmount?: number | null;
      transactionType?: 'DIRECT_DROP_BILL' | 'DROP_AND_COLLECT_PREV' | 'DROP_ONLY' | 'COLLECT_ONLY' | null;
      settledInvoiceIds?: string | null;
      paymentStatus: string;
      paymentMethod: string;
      notes?: string | null;
      createdAt?: Date | null;
      items: Array<{
        id: string;
        unitName: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
        item: {
          name: string;
          sku: string;
        };
      }>;
      returns: Array<{
        id: string;
        unitName: string;
        quantity: number;
        condition: 'GOOD' | 'BROKEN';
        reason?: string | null;
        item: {
          name: string;
        };
      }>;
    }>;
  }>;
  unpaidInvoices?: Array<{
    id: string;
    invoiceNumber: string;
    netAmount: number;
    salesId: string;
    storeId: string;
    paymentStatus?: string | null;
    createdAt?: Date | null;
    visit?: {
      id: string;
      billingDate?: string | null;
      visitDate?: string | null;
    } | null;
    store?: {
      id: string;
      name: string;
    };
    sales?: {
      id: string;
      name: string;
    };
  }>;
}

export function SalesMonitorView({ salesUsers, itemsList = [], visits, unpaidInvoices = [] }: SalesMonitorProps) {
  const todayStr = getLocalDateString();

  // Calculate default price fallback
  const defaultUnitPrice = itemsList.length > 0 && itemsList[0].basePrice > 0 ? itemsList[0].basePrice : 1500;

  // Date Range state (Default: 'TODAY')
  const [datePreset, setDatePreset] = React.useState<'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'>('TODAY');
  const [customStartDate, setCustomStartDate] = React.useState<string>(todayStr);
  const [customEndDate, setCustomEndDate] = React.useState<string>(todayStr);

  // Filters state
  const [selectedRep, setSelectedRep] = React.useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('ALL');
  const [selectedType, setSelectedType] = React.useState<string>('ALL');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [isFilterExpanded, setIsFilterExpanded] = React.useState<boolean>(false);

  // Show only incomplete/past warning filter toggle
  const [showIncompleteOnly, setShowIncompleteOnly] = React.useState<boolean>(false);

  // Collapsed state per sales rep card (default: all collapsed / closed)
  const [collapsedSales, setCollapsedSales] = React.useState<{ [salesId: string]: boolean }>({});

  // Store Detail Popup Modal state
  const [selectedVisitDetail, setSelectedVisitDetail] = React.useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState<boolean>(false);

  const handleOpenDetail = (visit: any) => {
    setSelectedVisitDetail(visit);
    setIsDetailModalOpen(true);
  };

  const toggleSalesCollapse = (salesId: string) => {
    setCollapsedSales((prev) => {
      const isCurrentlyCollapsed = prev[salesId] !== undefined ? prev[salesId] : true;
      return { ...prev, [salesId]: !isCurrentlyCollapsed };
    });
  };

  const handleExpandAll = () => {
    const newState: { [id: string]: boolean } = {};
    salesUsers.forEach((u) => {
      newState[u.id] = false;
    });
    setCollapsedSales(newState);
  };

  const handleCollapseAll = () => {
    const newState: { [id: string]: boolean } = {};
    salesUsers.forEach((u) => {
      newState[u.id] = true;
    });
    setCollapsedSales(newState);
  };

  const handleToggleShowIncomplete = () => {
    const nextState = !showIncompleteOnly;
    setShowIncompleteOnly(nextState);
    if (nextState) {
      const newState: { [id: string]: boolean } = {};
      salesUsers.forEach((u) => {
        newState[u.id] = false;
      });
      setCollapsedSales(newState);
    }
  };

  // Helper to calculate Monday to Sunday for the current week
  const getStartAndEndOfWeek = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDay();
    const diffToMonday = (day + 6) % 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      startOfWeek: getLocalDateString(monday),
      endOfWeek: getLocalDateString(sunday),
    };
  };

  // 1. Identify past incomplete targets (Yesterday or older, not COMPLETED)
  const pastIncompleteVisits = React.useMemo(() => {
    return visits.filter((v) => {
      const effectiveDate = v.billingDate || v.visitDate || v.deliveryDate;
      return Boolean(effectiveDate && effectiveDate < todayStr && v.status !== 'COMPLETED');
    });
  }, [visits, todayStr]);

  // Total outstanding unpaid past invoices amount
  const totalPastUnpaidAmount = React.useMemo(() => {
    return unpaidInvoices.reduce((sum, inv) => sum + (inv.netAmount || 0), 0);
  }, [unpaidInvoices]);

  // 2. Filter visits by Date Range
  const dateFilteredVisits = React.useMemo(() => {
    if (showIncompleteOnly) {
      return pastIncompleteVisits;
    }

    return visits.filter((v) => {
      const checkoutDateStr = v.checkoutTime
        ? getLocalDateString(v.checkoutTime)
        : null;

      const isCompletedToday = v.status === 'COMPLETED' && (checkoutDateStr === todayStr || (!checkoutDateStr && v.visitDate === todayStr));
      const isPastCompleted = v.status === 'COMPLETED' && !isCompletedToday;

      const isPureFutureVisit =
        v.status !== 'COMPLETED' &&
        v.visitDate > todayStr &&
        (!v.targetQuantity || v.targetQuantity === 0);

      if (datePreset === 'TODAY') {
        if (isPastCompleted || isPureFutureVisit) return false;
        if (isCompletedToday) return true;

        const isToday =
          v.visitDate === todayStr ||
          (v.deliveryDate === todayStr && (v.targetQuantity || 0) > 0) ||
          (v.billingDate === todayStr && (!v.deliveryDate || v.deliveryDate <= todayStr));
        const effectiveDate = v.billingDate || v.visitDate || v.deliveryDate;
        const isOverdue =
          v.status !== 'COMPLETED' &&
          v.status !== 'SKIPPED' &&
          Boolean(effectiveDate && effectiveDate < todayStr);

        return isToday || isOverdue;
      }

      const vDate = v.visitDate;
      const bDate = v.billingDate || v.deliveryDate || v.visitDate;

      const checkDateMatch = (targetDate?: string | null) => {
        if (!targetDate) return false;

        if (datePreset === 'THIS_WEEK') {
          const { startOfWeek, endOfWeek } = getStartAndEndOfWeek(todayStr);
          return targetDate >= startOfWeek && targetDate <= endOfWeek;
        }

        if (datePreset === 'THIS_MONTH') {
          const currentMonth = todayStr.substring(0, 7);
          return targetDate.startsWith(currentMonth);
        }

        if (datePreset === 'CUSTOM') {
          return targetDate >= customStartDate && targetDate <= customEndDate;
        }

        return true;
      };

      if (checkoutDateStr && checkDateMatch(checkoutDateStr)) return true;

      return checkDateMatch(vDate) || checkDateMatch(bDate);
    });
  }, [visits, datePreset, customStartDate, customEndDate, showIncompleteOnly, pastIncompleteVisits, todayStr]);

  // 3. Apply secondary filters
  const finalFilteredVisits = React.useMemo(() => {
    return dateFilteredVisits.filter((v) => {
      const matchesRep = selectedRep === 'ALL' || v.sales?.id === selectedRep;
      const matchesStatus = selectedStatus === 'ALL' || v.status === selectedStatus;
      const orderType = v.orders?.[0]?.transactionType || 'DIRECT_DROP_BILL';
      const matchesType = selectedType === 'ALL' || orderType === selectedType;

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        v.store.name.toLowerCase().includes(q) ||
        v.sales.name.toLowerCase().includes(q) ||
        v.store.address.toLowerCase().includes(q);

      return matchesRep && matchesStatus && matchesType && matchesSearch;
    });
  }, [dateFilteredVisits, selectedRep, selectedStatus, selectedType, searchQuery]);

  // Helper to check if a specific date falls within the active preset filter
  const isDateInRange = React.useCallback(
    (targetDate?: string | null) => {
      if (!targetDate) return false;
      if (showIncompleteOnly) {
        return targetDate < todayStr;
      }
      if (datePreset === 'TODAY') {
        return targetDate === todayStr;
      }
      if (datePreset === 'THIS_WEEK') {
        const { startOfWeek, endOfWeek } = getStartAndEndOfWeek(todayStr);
        return targetDate >= startOfWeek && targetDate <= endOfWeek;
      }
      if (datePreset === 'THIS_MONTH') {
        const currentMonth = todayStr.substring(0, 7);
        return targetDate.startsWith(currentMonth);
      }
      if (datePreset === 'CUSTOM') {
        return targetDate >= customStartDate && targetDate <= customEndDate;
      }
      return true;
    },
    [datePreset, todayStr, customStartDate, customEndDate, showIncompleteOnly]
  );

  // 4. Calculate Aggregate Physical Stats
  const totalTargetQty = finalFilteredVisits.reduce((acc, v) => {
    const checkoutDateStr = v.checkoutTime
      ? getLocalDateString(v.checkoutTime)
      : null;
    const isExecutedToday = checkoutDateStr === todayStr || v.status === 'COMPLETED';
    const isPastIncomplete =
      v.status !== 'COMPLETED' &&
      v.status !== 'SKIPPED' &&
      Boolean((v.deliveryDate || v.visitDate || v.billingDate) && (v.deliveryDate || v.visitDate || v.billingDate)! < todayStr);
    const isDeliveryDue = isDateInRange(v.deliveryDate || v.visitDate) || (datePreset === 'TODAY' && (isPastIncomplete || isExecutedToday));
    if (!isDeliveryDue) return acc;
    return acc + (v.assignedStockQty ?? v.targetQuantity ?? v.store?.defaultDailyTargetQty ?? 0);
  }, 0);

  const totalDeliveredQty = finalFilteredVisits.reduce((acc, v) => {
    return (
      acc +
      (v.orders?.reduce((sum, o) => {
        return sum + (o.items?.reduce((itSum, item) => itSum + item.quantity, 0) || 0);
      }, 0) || 0)
    );
  }, 0);

  const totalReturnsQty = finalFilteredVisits.reduce((acc, v) => {
    return (
      acc +
      (v.orders?.reduce((sum, o) => {
        return sum + (o.returns?.reduce((retSum, ret) => retSum + ret.quantity, 0) || 0);
      }, 0) || 0)
    );
  }, 0);

  const physicalFulfillmentPct = totalTargetQty > 0 ? Math.min(100, Math.round((totalDeliveredQty / totalTargetQty) * 100)) : 100;

  // Helper to calculate Target Uang Setor Kasir
  const calculateTargetUang = React.useCallback(
    (filteredVisitsList: typeof visits, unpaidList: typeof unpaidInvoices) => {
      let targetUang = 0;
      const countedInvoiceIds = new Set<string>();

      filteredVisitsList.forEach((v) => {
        const bDate = v.billingDate || v.visitDate;
        if (bDate && bDate > todayStr) {
          return;
        }

        const order = v.orders?.[0];
        const targetPcs = v.assignedStockQty ?? v.targetQuantity ?? v.store?.defaultDailyTargetQty ?? 0;
        const price = v.assignedItem?.basePrice || defaultUnitPrice;

        const isDueToday = bDate === todayStr;
        const isDuePast = Boolean(bDate && bDate < todayStr);

        if (order) {
          countedInvoiceIds.add(order.id);
          if (order.invoiceNumber) countedInvoiceIds.add(order.invoiceNumber);

          if (order.transactionType === 'DROP_ONLY' && v.billingDate && v.billingDate > todayStr) {
            return;
          }

          if (isDueToday) {
            if (order.transactionType === 'COLLECT_ONLY') {
              targetUang += (order.collectedAmount !== null && order.collectedAmount !== undefined ? order.collectedAmount : (order.netAmount || 0));
            } else if (order.transactionType === 'DROP_AND_COLLECT_PREV') {
              targetUang += (order.collectedAmount !== null && order.collectedAmount !== undefined ? order.collectedAmount : (targetPcs * price));
            } else {
              targetUang += order.netAmount || (targetPcs * price);
            }
          } else if (isDuePast) {
            if (order.paymentStatus === 'PENDING') {
              targetUang += order.netAmount;
            }
          }
        } else {
          if (isDueToday) {
            targetUang += targetPcs * price;
          }
        }
      });

      unpaidList.forEach((inv) => {
        if (inv.paymentStatus === 'PENDING' && !countedInvoiceIds.has(inv.id) && (!inv.invoiceNumber || !countedInvoiceIds.has(inv.invoiceNumber))) {
          const invBillingDate = inv.visit?.billingDate || inv.visit?.visitDate || (inv.createdAt ? getLocalDateString(inv.createdAt) : null);
          if (invBillingDate && invBillingDate <= todayStr) {
            targetUang += (inv.netAmount || 0);
            countedInvoiceIds.add(inv.id);
          }
        }
      });

      return targetUang;
    },
    [todayStr, defaultUnitPrice]
  );

  // 5. Financial Stats
  const totalTargetUangWajibSetor = React.useMemo(() => {
    return calculateTargetUang(finalFilteredVisits, unpaidInvoices);
  }, [calculateTargetUang, finalFilteredVisits, unpaidInvoices]);

  const totalRealisasiUangDisetor = finalFilteredVisits.reduce((acc, v) => {
    const order = v.orders?.[0];
    if (!order) return acc;
    if (order.collectedAmount !== undefined && order.collectedAmount !== null) {
      return acc + order.collectedAmount;
    }
    return acc + (order.paymentStatus === 'PAID' ? order.netAmount : 0);
  }, 0);

  const cashInHand = finalFilteredVisits.reduce((acc, v) => {
    const order = v.orders?.[0];
    if (!order) return acc;
    const isCash = order.paymentMethod === 'CASH';
    const amt =
      order.collectedAmount !== undefined && order.collectedAmount !== null
        ? order.collectedAmount
        : order.paymentStatus === 'PAID'
        ? order.netAmount
        : 0;
    return acc + (isCash ? amt : 0);
  }, 0);

  const transferBank = finalFilteredVisits.reduce((acc, v) => {
    const order = v.orders?.[0];
    if (!order) return acc;
    const isTransfer = order.paymentMethod === 'TRANSFER';
    const amt =
      order.collectedAmount !== undefined && order.collectedAmount !== null
        ? order.collectedAmount
        : order.paymentStatus === 'PAID'
        ? order.netAmount
        : 0;
    return acc + (isTransfer ? amt : 0);
  }, 0);

  const newReceivablesTempo = finalFilteredVisits.reduce((acc, v) => {
    const order = v.orders?.[0];
    if (!order) return acc;
    if (order.transactionType === 'DROP_ONLY' || order.paymentStatus === 'PENDING') {
      return acc + (order.netAmount || 0);
    }
    return acc;
  }, 0);

  const sisaTargetUang = Math.max(0, totalTargetUangWajibSetor - totalRealisasiUangDisetor);
  const financialFulfillmentPct =
    totalTargetUangWajibSetor > 0
      ? Math.min(100, Math.round((totalRealisasiUangDisetor / totalTargetUangWajibSetor) * 100))
      : 100;

  // 6. Group visits by Sales
  const visitsGroupedBySales = React.useMemo(() => {
    const groups: { [salesId: string]: { sales: any; visits: typeof visits } } = {};

    salesUsers.forEach((u) => {
      if (selectedRep === 'ALL' || selectedRep === u.id) {
        groups[u.id] = {
          sales: u,
          visits: [],
        };
      }
    });

    finalFilteredVisits.forEach((v) => {
      const sId = v.sales?.id;
      if (sId) {
        if (!groups[sId]) {
          groups[sId] = { sales: v.sales, visits: [] };
        }
        groups[sId].visits.push(v);
      }
    });

    return Object.values(groups).filter((g) => g.visits.length > 0 || selectedRep === g.sales.id);
  }, [finalFilteredVisits, salesUsers, selectedRep]);

  const getTypeBadge = (type?: string | null) => {
    switch (type) {
      case 'DIRECT_DROP_BILL':
        return <Badge variant="success" className="text-[9px] font-bold">1. Bawa & Tagih</Badge>;
      case 'DROP_AND_COLLECT_PREV':
        return <Badge variant="purple" className="text-[9px] font-bold">2. Bawa + Tagih Kemarin</Badge>;
      case 'DROP_ONLY':
        return <Badge variant="warning" className="text-[9px] font-bold">3. Titip (Tempo)</Badge>;
      case 'COLLECT_ONLY':
        return <Badge variant="cyan" className="text-[9px] font-bold">4. Tagih Nota</Badge>;
      default:
        return <Badge variant="secondary" className="text-[9px] font-bold">Reguler</Badge>;
    }
  };

  const hasActiveFilters = selectedRep !== 'ALL' || selectedStatus !== 'ALL' || selectedType !== 'ALL' || searchQuery.length > 0;

  return (
    <div className="space-y-3 sm:space-y-5 max-w-full overflow-x-hidden">
      {/* ======================================================== */}
      {/* 1. COMPACT EXECUTIVE HEADER                              */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/10 border border-indigo-600/20 flex items-center justify-center text-indigo-600">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
                Monitoring Sales & Kasir
              </h2>
              <span className="text-[10px] sm:text-xs text-slate-500 font-medium">
                {visitsGroupedBySales.length} Sales &bull; {finalFilteredVisits.length} Toko
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold sm:hidden">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span>Live</span>
          </div>
        </div>

        {/* Date Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl overflow-x-auto max-w-full">
          {(
            [
              { id: 'TODAY', label: 'Hari Ini' },
              { id: 'THIS_WEEK', label: 'Minggu Ini' },
              { id: 'THIS_MONTH', label: 'Bulan Ini' },
              { id: 'CUSTOM', label: 'Kustom' },
            ] as const
          ).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setDatePreset(preset.id);
                setShowIncompleteOnly(false);
              }}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                datePreset === preset.id && !showIncompleteOnly
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {datePreset === 'CUSTOM' && (
        <div className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-xl text-xs">
          <span className="text-slate-500 text-[11px]">Dari:</span>
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => setCustomStartDate(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-900"
          />
          <span className="text-slate-400 text-[11px]">s/d</span>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => setCustomEndDate(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-900"
          />
        </div>
      )}

      {/* ⚠️ PAST INCOMPLETE TARGET WARNING (COMPACT) */}
      {pastIncompleteVisits.length > 0 && (
        <div className="p-2.5 sm:p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-2 text-amber-950">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-[11px] font-bold truncate">
              Ada {pastIncompleteVisits.length} Toko kemarin yang belum selesai dikunjungi!
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleToggleShowIncomplete}
            className={`text-[10px] font-bold h-7 px-2.5 rounded-lg shrink-0 ${
              showIncompleteOnly ? 'bg-amber-600 text-white' : 'bg-white text-amber-900 border-amber-300'
            }`}
          >
            {showIncompleteOnly ? 'Lihat Semua' : 'Lihat'}
          </Button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. EXECUTIVE DUAL TRACKER: STREAMLINED MOBILE & DESKTOP   */}
      {/* ======================================================== */}

      {/* MOBILE COMPACT 2-CARD GRID (< md) */}
      <div className="block md:hidden space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {/* Card 1: Fisik Tahu */}
          <div className="rounded-xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-3 text-white shadow-xs space-y-2 border border-indigo-800/40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                <Truck className="w-3 h-3 text-indigo-400" /> Fisik Tahu
              </span>
              <span className="text-xs font-black text-emerald-400">{physicalFulfillmentPct}%</span>
            </div>

            <div>
              <div className="text-base font-black leading-tight text-white">
                {totalDeliveredQty} <span className="text-[10px] font-normal text-indigo-300">/ {totalTargetQty} Pcs</span>
              </div>
              <p className="text-[9px] text-indigo-200 mt-0.5">
                Drop: {totalDeliveredQty} &bull; Retur: {totalReturnsQty}
              </p>
            </div>

            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, physicalFulfillmentPct)}%` }}
              />
            </div>
          </div>

          {/* Card 2: Keuangan / Setoran */}
          <div className="rounded-xl bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 p-3 text-white shadow-xs space-y-2 border border-emerald-800/40">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                <Wallet className="w-3 h-3 text-emerald-400" /> Setoran
              </span>
              <span className="text-xs font-black text-emerald-400">{financialFulfillmentPct}%</span>
            </div>

            <div>
              <div className="text-xs font-black leading-tight text-emerald-300 truncate">
                {formatRupiah(totalRealisasiUangDisetor)}
              </div>
              <p className="text-[9px] text-emerald-200/80 mt-0.5 truncate">
                Wajib: {formatRupiah(totalTargetUangWajibSetor)}
              </p>
            </div>

            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, financialFulfillmentPct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Micro Cash Breakdown Bar */}
        <div className="bg-white border border-slate-200 rounded-xl p-2 grid grid-cols-3 gap-1 text-center text-[10px]">
          <div className="bg-slate-50 p-1.5 rounded-lg">
            <span className="text-slate-400 block text-[9px] font-bold">TUNAI (CASH)</span>
            <span className="font-bold text-slate-900">{formatRupiah(cashInHand)}</span>
          </div>
          <div className="bg-slate-50 p-1.5 rounded-lg">
            <span className="text-slate-400 block text-[9px] font-bold">TRANSFER</span>
            <span className="font-bold text-blue-700">{formatRupiah(transferBank)}</span>
          </div>
          <div className="bg-slate-50 p-1.5 rounded-lg">
            <span className="text-slate-400 block text-[9px] font-bold">TEMPO BARU</span>
            <span className="font-bold text-amber-700">{formatRupiah(newReceivablesTempo)}</span>
          </div>
        </div>
      </div>

      {/* DESKTOP FULL DUAL CARDS (>= md) */}
      <div className="hidden md:grid md:grid-cols-2 gap-4">
        {/* TRACKER 1: FISIK */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl p-4 text-white shadow-md space-y-3">
          <div className="flex items-center justify-between border-b border-indigo-700/60 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/60 flex items-center justify-center">
                <Truck className="w-3.5 h-3.5 text-indigo-200" />
              </div>
              <div>
                <h3 className="font-black text-xs uppercase tracking-wider text-indigo-100">
                  Tracker Fisik Barang (Pcs Tahu)
                </h3>
                <p className="text-[10px] text-indigo-300">Target muatan vs drop toko</p>
              </div>
            </div>
            <span className="text-lg font-black text-emerald-400">{physicalFulfillmentPct}%</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/10 rounded-xl p-2.5">
              <span className="text-[10px] text-indigo-200 block">Total Target</span>
              <span className="text-base font-black">{totalTargetQty}</span>
              <span className="text-[9px] text-indigo-300 block">Pcs</span>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5">
              <span className="text-[10px] text-emerald-300 block">Realisasi Drop</span>
              <span className="text-base font-black text-emerald-400">{totalDeliveredQty}</span>
              <span className="text-[9px] text-indigo-300 block">Pcs</span>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5">
              <span className="text-[10px] text-amber-300 block">Total Retur</span>
              <span className="text-base font-black text-amber-300">{totalReturnsQty}</span>
              <span className="text-[9px] text-indigo-300 block">Pcs</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-indigo-200">
              <span>Capaian Drop Fisik</span>
              <span>{totalDeliveredQty} / {totalTargetQty} Pcs ({physicalFulfillmentPct}%)</span>
            </div>
            <div className="w-full bg-indigo-950/80 rounded-full h-2 overflow-hidden p-0.5 border border-indigo-700/50">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, physicalFulfillmentPct)}%` }}
              />
            </div>
          </div>
        </div>

        {/* TRACKER 2: FINANCIAL */}
        <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 rounded-2xl p-4 text-white shadow-md space-y-3">
          <div className="flex items-center justify-between border-b border-emerald-700/60 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600/60 flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5 text-emerald-200" />
              </div>
              <div>
                <h3 className="font-black text-xs uppercase tracking-wider text-emerald-100">
                  Target Uang Setoran Kasir
                </h3>
                <p className="text-[10px] text-emerald-300">Estimasi target vs realisasi uang masuk</p>
              </div>
            </div>
            <span className="text-lg font-black text-emerald-400">{financialFulfillmentPct}%</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/10 rounded-xl p-2">
              <span className="text-[10px] text-emerald-200 block">Target Wajib Setor</span>
              <span className="text-xs font-black text-white truncate block">{formatRupiah(totalTargetUangWajibSetor)}</span>
            </div>
            <div className="bg-white/10 rounded-xl p-2">
              <span className="text-[10px] text-emerald-300 block">Realisasi Setor</span>
              <span className="text-xs font-black text-emerald-400 truncate block">{formatRupiah(totalRealisasiUangDisetor)}</span>
            </div>
            <div className="bg-white/10 rounded-xl p-2">
              <span className="text-[10px] text-amber-300 block">Sisa Belum Setor</span>
              <span className="text-xs font-black text-amber-300 truncate block">{formatRupiah(sisaTargetUang)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="bg-emerald-950/70 border border-emerald-700/50 p-1.5 rounded-lg text-center">
              <span className="text-emerald-300 block text-[9px]">Cash: {formatRupiah(cashInHand)}</span>
            </div>
            <div className="bg-emerald-950/70 border border-emerald-700/50 p-1.5 rounded-lg text-center">
              <span className="text-blue-300 block text-[9px]">Trf: {formatRupiah(transferBank)}</span>
            </div>
            <div className="bg-emerald-950/70 border border-emerald-700/50 p-1.5 rounded-lg text-center">
              <span className="text-amber-300 block text-[9px]">Tempo: {formatRupiah(newReceivablesTempo)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. SEARCH & FILTER TOOLBAR                               */}
      {/* ======================================================== */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari toko, sales, alamat..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className={`h-8 px-2.5 text-xs font-bold rounded-lg border-slate-200 ${
              hasActiveFilters ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'text-slate-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 mr-1" />
            <span className="hidden xs:inline">Filter</span>
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 ml-1" />}
          </Button>
        </div>

        {/* Expandable Filter Selects */}
        {isFilterExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-100 animate-in fade-in duration-200">
            <select
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
              className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800"
            >
              <option value="ALL">Semua Sales</option>
              {salesUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800"
            >
              <option value="ALL">Semua 4 Tipe Sales</option>
              <option value="DIRECT_DROP_BILL">1. Bawa & Tagih Langsung</option>
              <option value="DROP_AND_COLLECT_PREV">2. Bawa + Tagih Kemarin</option>
              <option value="DROP_ONLY">3. Titip Saja (Tempo)</option>
              <option value="COLLECT_ONLY">4. Tagih Nota Kemarin</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800"
            >
              <option value="ALL">Semua Status Kunjungan</option>
              <option value="COMPLETED">Selesai (Completed)</option>
              <option value="CHECKED_IN">Sedang di Toko (Checked-In)</option>
              <option value="SCHEDULED">Belum Dikunjungi (Scheduled)</option>
            </select>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 4. SALES REPRESENTATIVE ACCORDION LIST                   */}
      {/* ======================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>Rincian Aktivitas per Sales ({visitsGroupedBySales.length})</span>
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleExpandAll}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 px-2 py-0.5 rounded-md hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              Buka Semua
            </button>
            <span className="text-slate-300 text-xs">&bull;</span>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="text-[10px] font-bold text-slate-500 hover:text-slate-800 px-2 py-0.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>

        {visitsGroupedBySales.length === 0 ? (
          <Card className="p-8 text-center text-slate-400 text-xs rounded-xl">
            <Store className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-600">Tidak ada data aktivitas sales untuk filter ini.</p>
          </Card>
        ) : (
          visitsGroupedBySales.map(({ sales, visits: salesVisits }) => {
            const isCollapsed = collapsedSales[sales.id] !== undefined ? collapsedSales[sales.id] : true;

            const salesTargetPcs = salesVisits.reduce((acc, v) => {
              const checkoutDateStr = v.checkoutTime
                ? getLocalDateString(v.checkoutTime)
                : null;
              const isExecutedToday = checkoutDateStr === todayStr || v.status === 'COMPLETED';
              const isPastIncomplete =
                v.status !== 'COMPLETED' &&
                v.status !== 'SKIPPED' &&
                Boolean((v.deliveryDate || v.visitDate || v.billingDate) && (v.deliveryDate || v.visitDate || v.billingDate)! < todayStr);
              const isDeliveryDue = isDateInRange(v.deliveryDate || v.visitDate) || (datePreset === 'TODAY' && (isPastIncomplete || isExecutedToday));
              if (!isDeliveryDue) return acc;
              return acc + (v.assignedStockQty ?? v.targetQuantity ?? v.store?.defaultDailyTargetQty ?? 0);
            }, 0);

            const salesDeliveredPcs = salesVisits.reduce((acc, v) => {
              return (
                acc +
                (v.orders?.reduce((sum, o) => {
                  return sum + (o.items?.reduce((itSum, item) => itSum + item.quantity, 0) || 0);
                }, 0) || 0)
              );
            }, 0);

            const salesUnpaidInvoices = unpaidInvoices.filter((inv) => inv.salesId === sales.id || inv.sales?.id === sales.id);
            const salesTargetUang = calculateTargetUang(salesVisits, salesUnpaidInvoices);

            const salesRealisasiUang = salesVisits.reduce((acc, v) => {
              const order = v.orders?.[0];
              if (!order) return acc;
              if (order.collectedAmount !== undefined && order.collectedAmount !== null) {
                return acc + order.collectedAmount;
              }
              return acc + (order.paymentStatus === 'PAID' ? order.netAmount : 0);
            }, 0);

            const salesCompletedVisits = salesVisits.filter((v) => v.status === 'COMPLETED').length;

            return (
              <div key={sales.id} className="overflow-hidden border border-slate-200 rounded-xl bg-white shadow-2xs transition-all">
                {/* SALES REP CARD HEADER */}
                <div
                  onClick={() => toggleSalesCollapse(sales.id)}
                  className="p-3 sm:p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between gap-2.5 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center font-black text-sm text-white shadow-sm shrink-0">
                      {sales.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={sales.avatarUrl} alt={sales.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        sales.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-xs sm:text-sm text-white truncate">{sales.name}</h4>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                          {salesCompletedVisits}/{salesVisits.length} Toko Selesai
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-indigo-300 mt-0.5">
                        <span>📦 {salesDeliveredPcs}/{salesTargetPcs} Pcs</span>
                        <span>&bull;</span>
                        <span className="text-emerald-300 font-bold">💰 {formatRupiah(salesRealisasiUang)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle Chevron */}
                  <div className="p-1.5 rounded-lg bg-white/10 text-white shrink-0">
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </div>
                </div>

                {/* STORE VISITS LIST */}
                {!isCollapsed && (
                  <div className="p-2 sm:p-3 bg-slate-50/70 space-y-2 divide-y divide-slate-100">
                    {salesVisits.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2 text-center">
                        Tidak ada toko yang dijadwalkan untuk sales ini pada rentang waktu terpilih.
                      </p>
                    ) : (
                      (() => {
                        const sortedVisits = [...salesVisits].sort((a, b) => {
                          const aCompleted = a.status === 'COMPLETED' ? 1 : 0;
                          const bCompleted = b.status === 'COMPLETED' ? 1 : 0;
                          // Incomplete visits stay at the top (0), completed visits go to the bottom (1)
                          if (aCompleted !== bCompleted) return aCompleted - bCompleted;

                          // For incomplete visits, checked in visits first
                          const aCheckedIn = a.status === 'CHECKED_IN' ? 1 : 0;
                          const bCheckedIn = b.status === 'CHECKED_IN' ? 1 : 0;
                          if (aCheckedIn !== bCheckedIn) return bCheckedIn - aCheckedIn;

                          return (a.sequenceOrder ?? 0) - (b.sequenceOrder ?? 0);
                        });

                        return sortedVisits.map((visit) => {
                          const isCompleted = visit.status === 'COMPLETED';
                          const isCheckedIn = visit.status === 'CHECKED_IN';
                          const order = visit.orders?.[0];

                          const totalDropPcs = order?.items?.reduce((s, i) => s + i.quantity, 0) || 0;
                          const totalReturPcs = order?.returns?.reduce((s, r) => s + r.quantity, 0) || 0;

                          const isDeliveryDue = isDateInRange(visit.deliveryDate || visit.visitDate);
                          const isBillingDue = isDateInRange(visit.billingDate || visit.deliveryDate || visit.visitDate);

                          const targetPcs = isDeliveryDue
                            ? (visit.assignedStockQty ?? visit.targetQuantity ?? visit.store.defaultDailyTargetQty ?? 0)
                            : 0;

                          const inferredType = order?.transactionType || (
                            isDeliveryDue && isBillingDue
                              ? 'DIRECT_DROP_BILL'
                              : isDeliveryDue && !isBillingDue
                              ? 'DROP_ONLY'
                              : 'COLLECT_ONLY'
                          );

                          const isBillingDueToday = !visit.billingDate || visit.billingDate === todayStr || (visit.billingDate <= todayStr);
                          const itemName = visit.assignedItem?.name || 'Tahu';
                          const estimatedBillAmount = targetPcs * (visit.assignedItem?.basePrice || defaultUnitPrice);

                          return (
                            <div
                              key={visit.id}
                              className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
                                isCompleted
                                  ? 'bg-emerald-50/20 border-emerald-400 ring-1 ring-emerald-400/20 shadow-2xs'
                                  : isCheckedIn
                                  ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                                  : 'bg-white border-slate-200 shadow-2xs'
                              }`}
                            >
                            {/* 1. Nama Toko & 2. Status */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <h5 className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                                  {visit.store.name}
                                </h5>
                                {visit.store.code && (
                                  <span className="text-[9px] font-mono text-slate-500 bg-slate-100 px-1 py-0.2 rounded shrink-0">
                                    {visit.store.code}
                                  </span>
                                )}
                              </div>

                              <Badge
                                variant={isCompleted ? 'success' : isCheckedIn ? 'default' : 'secondary'}
                                className="text-[9px] font-bold shrink-0 px-2 py-0.5"
                              >
                                {isCompleted ? 'Selesai' : isCheckedIn ? 'Sedang di Toko' : 'Terjadwal'}
                              </Badge>
                            </div>

                            {/* 3. Items yang perlu di drop & 4. Uang yang harus di bill */}
                            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-xs">
                              {/* 3. Item Drop */}
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block">
                                  📦 Item Drop
                                </span>
                                <div className="font-black text-slate-900 mt-0.5 text-xs">
                                  {isCompleted ? (
                                    <span>{totalDropPcs} Pcs <span className="text-[10px] text-slate-500 font-normal">({itemName})</span></span>
                                  ) : (
                                    <span>{targetPcs} Pcs <span className="text-[10px] text-slate-500 font-normal">({itemName})</span></span>
                                  )}
                                </div>
                              </div>

                              {/* 4. Uang Tagihan (Bill) */}
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block">
                                  💰 Tagihan (Bill)
                                </span>
                                <div className="font-black text-emerald-700 mt-0.5 text-xs truncate">
                                  {isCompleted && order ? (
                                    <span>
                                      {formatRupiah(order.collectedAmount !== null && order.collectedAmount !== undefined ? order.collectedAmount : order.netAmount)}
                                    </span>
                                  ) : isBillingDueToday ? (
                                    <span>{formatRupiah(estimatedBillAmount)}</span>
                                  ) : (
                                    <span className="text-slate-500 text-[10px] font-semibold">Rp 0 (Tempo)</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Footer: Action Button Lihat Detail */}
                            <div className="flex items-center justify-end mt-2 pt-1 border-t border-slate-100/80">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenDetail(visit)}
                                className="h-6 px-2.5 text-[10px] font-bold rounded-lg text-indigo-700 border-indigo-200 hover:bg-indigo-50 cursor-pointer shadow-2xs"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                <span>Lihat Detail</span>
                              </Button>
                            </div>
                          </div>
                        );
                        });
                      })()
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ======================================================== */}
      {/* 5. STORE VISIT DETAIL POPUP MODAL (POPUP DETAIL)        */}
      {/* ======================================================== */}
      {selectedVisitDetail && (
        <Dialog
          open={isDetailModalOpen}
          onOpenChange={setIsDetailModalOpen}
          title={`Detail Kunjungan: ${selectedVisitDetail.store.name}`}
          description="Rincian lengkap pengantaran barang, penagihan nota, dan status kunjungan."
          className="max-w-xl max-h-[92vh] overflow-y-auto"
        >
          <div className="space-y-3.5 pt-1 text-xs">
            {/* Store & Contact Banner */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-bold text-sm text-slate-900">{selectedVisitDetail.store.name}</h4>
                    {selectedVisitDetail.store.code && (
                      <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-1.5 py-0.2 rounded font-semibold">
                        {selectedVisitDetail.store.code}
                      </span>
                    )}
                    <Badge
                      variant={
                        selectedVisitDetail.status === 'COMPLETED'
                          ? 'success'
                          : selectedVisitDetail.status === 'CHECKED_IN'
                          ? 'default'
                          : 'secondary'
                      }
                      className="text-[10px] font-bold"
                    >
                      {selectedVisitDetail.status === 'COMPLETED'
                        ? 'Selesai'
                        : selectedVisitDetail.status === 'CHECKED_IN'
                        ? 'Sedang di Toko'
                        : 'Terjadwal'}
                    </Badge>
                  </div>

                  {selectedVisitDetail.store.ownerName && (
                    <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                      Pemilik: {selectedVisitDetail.store.ownerName}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {selectedVisitDetail.store.address}
                  </p>
                </div>

                {/* Quick Maps & WA */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedVisitDetail.store.phone && (
                    <a
                      href={`https://wa.me/${selectedVisitDetail.store.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center hover:bg-emerald-200 transition-colors"
                      title="WhatsApp Toko"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {selectedVisitDetail.store.mapUrl && (
                    <a
                      href={
                        selectedVisitDetail.store.mapUrl.startsWith('http')
                          ? selectedVisitDetail.store.mapUrl
                          : `https://${selectedVisitDetail.store.mapUrl}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center hover:bg-indigo-200 transition-colors"
                      title="Buka Maps"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Visit & Sales Meta */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-bold block text-[9px] uppercase">Sales</span>
                <span className="font-bold text-slate-900 block truncate mt-0.5">{selectedVisitDetail.sales?.name}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-bold block text-[9px] uppercase">🚚 Tgl Kirim</span>
                <span className="font-bold text-slate-900 block truncate mt-0.5">
                  {selectedVisitDetail.deliveryDate || selectedVisitDetail.visitDate || '-'}
                </span>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-bold block text-[9px] uppercase">📑 Tgl Tagih</span>
                <span className="font-bold text-slate-900 block truncate mt-0.5">
                  {selectedVisitDetail.billingDate || selectedVisitDetail.visitDate || '-'}
                </span>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-bold block text-[9px] uppercase">Tipe Transaksi</span>
                <span className="font-bold text-indigo-700 block truncate mt-0.5">
                  {selectedVisitDetail.orders?.[0]?.transactionType || 'Reguler'}
                </span>
              </div>
            </div>

            {/* Order Items & Financials Section */}
            {selectedVisitDetail.orders?.[0] ? (
              <div className="space-y-3">
                {/* Financial Summary Box */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between border-b border-emerald-200/60 pb-1.5">
                    <span className="font-bold text-emerald-950 flex items-center gap-1">
                      <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                      Faktur: <span className="font-mono">{selectedVisitDetail.orders[0].invoiceNumber}</span>
                    </span>
                    <Badge variant={selectedVisitDetail.orders[0].paymentStatus === 'PAID' ? 'success' : 'warning'}>
                      {selectedVisitDetail.orders[0].paymentStatus} ({selectedVisitDetail.orders[0].paymentMethod})
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-emerald-800 font-medium block">Total Belanja:</span>
                      <span className="font-black text-slate-900 text-xs">
                        {formatRupiah(selectedVisitDetail.orders[0].totalAmount || selectedVisitDetail.orders[0].netAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-emerald-800 font-medium block">Uang Masuk Kasir:</span>
                      <span className="font-black text-emerald-700 text-xs">
                        {selectedVisitDetail.orders[0].collectedAmount !== null && selectedVisitDetail.orders[0].collectedAmount !== undefined
                          ? formatRupiah(selectedVisitDetail.orders[0].collectedAmount)
                          : formatRupiah(selectedVisitDetail.orders[0].netAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-emerald-800 font-medium block">Diskon / Potongan:</span>
                      <span className="font-black text-slate-900 text-xs">
                        {formatRupiah(selectedVisitDetail.orders[0].discountAmount || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items Dropped List */}
                {selectedVisitDetail.orders[0].items && selectedVisitDetail.orders[0].items.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                      <Package className="w-3.5 h-3.5 text-indigo-600" />
                      Barang Diturunkan (Drop)
                    </span>
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {selectedVisitDetail.orders[0].items.map((it: any) => (
                        <div key={it.id} className="p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-900 block">{it.item?.name || 'Tahu'}</span>
                            <span className="text-[10px] text-slate-500">
                              {it.quantity} {it.unitName} &bull; @{formatRupiah(it.unitPrice)}
                            </span>
                          </div>
                          <span className="font-black text-slate-900">{formatRupiah(it.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Returns List */}
                {selectedVisitDetail.orders[0].returns && selectedVisitDetail.orders[0].returns.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1">
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                      Barang Retur Toko
                    </span>
                    <div className="bg-white border border-amber-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {selectedVisitDetail.orders[0].returns.map((ret: any) => (
                        <div key={ret.id} className="p-2.5 flex items-center justify-between text-xs bg-amber-50/40">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-amber-950">{ret.item?.name || 'Tahu'}</span>
                              <Badge variant={ret.condition === 'GOOD' ? 'success' : 'destructive'} className="text-[9px] py-0 px-1 font-bold">
                                {ret.condition === 'GOOD' ? 'Bagus' : 'Rusak'}
                              </Badge>
                            </div>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              Alasan: {ret.reason || 'Retur toko'}
                            </span>
                          </div>
                          <span className="font-bold text-amber-900">{ret.quantity} {ret.unitName}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
                <Clock className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                <p className="font-semibold text-slate-700">Belum Ada Transaksi Transaksi Selesai</p>
                <p className="text-[11px] text-slate-500">
                  Target pengantaran: <strong>{selectedVisitDetail.assignedStockQty ?? selectedVisitDetail.targetQuantity ?? 0} Pcs</strong>
                </p>
                {selectedVisitDetail.checkinTime && (
                  <p className="text-[10px] text-indigo-700 font-semibold pt-1">
                    Waktu Check-In: {formatDateTime(selectedVisitDetail.checkinTime)}
                  </p>
                )}
              </div>
            )}

            {/* Notes if any */}
            {selectedVisitDetail.notes && (
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Catatan Kunjungan:</span>
                <p className="text-slate-700 mt-0.5">{selectedVisitDetail.notes}</p>
              </div>
            )}

            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsDetailModalOpen(false)}
                className="font-bold text-xs"
              >
                Tutup
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

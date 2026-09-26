'use client';

import * as React from 'react';
import {
  assignStockToSalesAction,
  returnStockToWarehouseAction,
  createStoreScheduleAndStockAction,
  updateStoreScheduleAction,
  deleteStoreScheduleAction,
} from '@/app/actions/assign-stock-actions';
import { formatBaseQuantityWithUnits, formatRupiah, formatDate, getLocalDateString } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Truck,
  AlertTriangle,
  CheckCircle2,
  Package,
  RotateCcw,
  Tag,
  Calendar,
  Plus,
  Search,
  Filter,
  User,
  Users,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Clock,
  Sparkles,
  ArrowRight,
  Target,
  Edit2,
  Trash2,
  Store,
  Receipt,
  Check,
  CalendarDays,
  CalendarCheck2,
  CalendarClock,
  DollarSign,
  AlertCircle,
  X,
  Phone,
  MapPin,
} from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';

interface AssignStockManagerProps {
  salesUsers: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  }>;
  storesList: Array<{
    id: string;
    code: string;
    name: string;
    address: string;
    defaultDailyTargetQty?: number | null;
    assignedSalesId?: string | null;
  }>;
  items: Array<{
    id: string;
    sku: string;
    name: string;
    baseUnit: string;
    basePrice: number;
    stockWarehouse: number;
    imageUrl?: string | null;
    units: Array<{
      id: string;
      unitName: string;
      conversionRate: number;
      price?: number | null;
    }>;
    batches?: Array<{
      id: string;
      batchNo: string;
      expireDate: string;
      currentQuantity: number;
      unitName?: string | null;
    }>;
  }>;
  salesStockData: Array<{
    id: string;
    userId: string;
    batchId?: string | null;
    quantity: number;
    user: {
      id: string;
      name: string;
      email: string;
    };
    batch?: {
      id: string;
      batchNo: string;
      expireDate: string;
    } | null;
    item: {
      id: string;
      name: string;
      sku: string;
      baseUnit: string;
      units: Array<{
        id: string;
        unitName: string;
        conversionRate: number;
      }>;
    };
  }>;
  assignmentsList?: Array<{
    id: string;
    salesId: string;
    storeId: string;
    visitDate: string;
    deliveryDate?: string | null;
    billingDate?: string | null;
    targetQuantity?: number | null;
    assignedStockQty?: number | null;
    assignedItemId?: string | null;
    status: string;
    notes?: string | null;
    sales: {
      id: string;
      name: string;
    };
    store: {
      id: string;
      code: string;
      name: string;
      address: string;
      defaultDailyTargetQty?: number | null;
    };
    assignedItem?: {
      id: string;
      name: string;
      sku: string;
      baseUnit: string;
    } | null;
    orders?: Array<{
      id: string;
      invoiceNumber: string;
      netAmount: number;
      paymentStatus: string;
    }>;
  }>;
}

export function AssignStockManager({
  salesUsers,
  storesList,
  items,
  salesStockData,
  assignmentsList = [],
}: AssignStockManagerProps) {
  const todayStr = getLocalDateString();

  // Modals state
  const [scheduleModalOpen, setScheduleModalOpen] = React.useState(false);
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [selectedAssignmentToEdit, setSelectedAssignmentToEdit] = React.useState<any | null>(null);

  const [dispatchModalOpen, setDispatchModalOpen] = React.useState(false);
  const [returnModalOpen, setReturnModalOpen] = React.useState(false);
  const [itemToReturn, setItemToReturn] = React.useState<any | null>(null);
  const [returnQty, setReturnQty] = React.useState<string>('1');

  // New Schedule Form states
  const [schedSalesId, setSchedSalesId] = React.useState<string>(salesUsers[0]?.id || '');
  const [schedStoreId, setSchedStoreId] = React.useState<string>(storesList[0]?.id || '');
  const [schedItemId, setSchedItemId] = React.useState<string>(items[0]?.id || '');
  const [schedBatchId, setSchedBatchId] = React.useState<string>('');
  const [schedUnitType, setSchedUnitType] = React.useState<string>('BASE');
  const [schedQuantity, setSchedQuantity] = React.useState<string>('200');
  const [schedDeliveryDate, setSchedDeliveryDate] = React.useState<string>(todayStr);
  const [schedBillingDate, setSchedBillingDate] = React.useState<string>(todayStr);
  const [schedAutoDeduct, setSchedAutoDeduct] = React.useState<boolean>(true);
  const [schedNotes, setSchedNotes] = React.useState<string>('');

  // Edit Schedule Form states
  const [editSalesId, setEditSalesId] = React.useState<string>('');
  const [editStoreId, setEditStoreId] = React.useState<string>('');
  const [editItemId, setEditItemId] = React.useState<string>('');
  const [editBatchId, setEditBatchId] = React.useState<string>('');
  const [editQuantity, setEditQuantity] = React.useState<string>('200');
  const [editDeliveryDate, setEditDeliveryDate] = React.useState<string>(todayStr);
  const [editBillingDate, setEditBillingDate] = React.useState<string>(todayStr);
  const [editAdjustStock, setEditAdjustStock] = React.useState<boolean>(true);
  const [editNotes, setEditNotes] = React.useState<string>('');

  // General Dispatch Modal Form states
  const [dispatchUserId, setDispatchUserId] = React.useState<string>(salesUsers[0]?.id || '');
  const [dispatchItemId, setDispatchItemId] = React.useState<string>(items[0]?.id || '');
  const [dispatchBatchId, setDispatchBatchId] = React.useState<string>('');
  const [dispatchUnitType, setDispatchUnitType] = React.useState<string>('BASE');
  const [dispatchQuantity, setDispatchQuantity] = React.useState<string>('10');
  const [dispatchNotes, setDispatchNotes] = React.useState<string>('');

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [statusMessage, setStatusMessage] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters for schedules
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterDateBasis, setFilterDateBasis] = React.useState<'DELIVERY' | 'BILLING' | 'BOTH'>('BOTH');
  const [filterDatePreset, setFilterDatePreset] = React.useState<'ALL' | 'TODAY' | 'TOMORROW' | 'UPCOMING'>('TODAY');
  const [filterSalesRep, setFilterSalesRep] = React.useState<string>('ALL');
  const [filterStatus, setFilterStatus] = React.useState<string>('ALL');

  // Active Tab
  const [activeTab, setActiveTab] = React.useState<'schedules' | 'car-stock'>('schedules');

  // Helper: Get item & batch limits for New Schedule
  const selectedSchedItem = items.find((i) => i.id === schedItemId);
  const schedAvailableBatches = (selectedSchedItem?.batches || []).filter((b) => b.currentQuantity > 0);
  const selectedSchedBatch = schedAvailableBatches.find((b) => b.id === schedBatchId);

  const schedMaxAvailable = schedBatchId && selectedSchedBatch
    ? selectedSchedBatch.currentQuantity
    : (selectedSchedItem?.stockWarehouse || 0);

  const schedQtyNumber = parseFloat(schedQuantity) || 0;
  const schedIsOverLimit = schedAutoDeduct && schedQtyNumber > schedMaxAvailable;

  // Helper: Get item & batch limits for Edit Schedule
  const selectedEditItem = items.find((i) => i.id === editItemId);
  const editAvailableBatches = (selectedEditItem?.batches || []).filter((b) => b.currentQuantity > 0);
  const selectedEditBatch = editAvailableBatches.find((b) => b.id === editBatchId);

  const originalAssignedQty = selectedAssignmentToEdit?.assignedStockQty ?? selectedAssignmentToEdit?.targetQuantity ?? 0;
  const editWarehouseAvailable = editBatchId && selectedEditBatch
    ? selectedEditBatch.currentQuantity
    : (selectedEditItem?.stockWarehouse || 0);

  // Max stock the user can assign = currently held by this visit + remaining in warehouse
  const maxAllowedEditQty = originalAssignedQty + editWarehouseAvailable;
  const editQtyNumber = parseFloat(editQuantity) || 0;
  const editIsOverLimit = editAdjustStock && editQtyNumber > maxAllowedEditQty;

  // Auto set target quantity and assigned sales when store changes in schedule modal
  const handleStoreChange = (storeId: string) => {
    setSchedStoreId(storeId);
    const store = storesList.find((s) => s.id === storeId);
    if (store?.defaultDailyTargetQty) {
      setSchedQuantity(store.defaultDailyTargetQty.toString());
    }
    if (store?.assignedSalesId) {
      setSchedSalesId(store.assignedSalesId);
    }
  };

  // Auto sync billing date if delivery date changes and billing date was same-day or older
  const handleSchedDeliveryDateChange = (newDate: string) => {
    if (schedBillingDate === schedDeliveryDate || schedBillingDate < newDate) {
      setSchedBillingDate(newDate);
    }
    setSchedDeliveryDate(newDate);
  };

  const handleEditDeliveryDateChange = (newDate: string) => {
    if (editBillingDate === editDeliveryDate || editBillingDate < newDate) {
      setEditBillingDate(newDate);
    }
    setEditDeliveryDate(newDate);
  };

  // Open Edit Modal
  const handleOpenEdit = (assignment: any) => {
    setSelectedAssignmentToEdit(assignment);
    setEditSalesId(assignment.salesId);
    setEditStoreId(assignment.storeId);
    const itId = assignment.assignedItemId || items[0]?.id || '';
    setEditItemId(itId);
    setEditBatchId('');
    setEditQuantity((assignment.assignedStockQty ?? assignment.targetQuantity ?? 200).toString());
    setEditDeliveryDate(assignment.deliveryDate || assignment.visitDate || todayStr);
    setEditBillingDate(assignment.billingDate || assignment.deliveryDate || assignment.visitDate || todayStr);
    setEditAdjustStock(true);
    setEditNotes(assignment.notes || '');
    setEditModalOpen(true);
  };

  // Submit New Schedule & Assignment
  const handleCreateScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedSalesId || !schedStoreId || !schedItemId) {
      setStatusMessage({ type: 'error', text: 'Harap lengkapi sales, toko, dan item yang akan di-assign.' });
      return;
    }

    const item = items.find((i) => i.id === schedItemId);
    let qtyBase = parseFloat(schedQuantity) || 0;
    if (schedUnitType !== 'BASE' && item?.units) {
      const u = item.units.find((unit) => unit.id === schedUnitType);
      if (u) qtyBase = qtyBase * u.conversionRate;
    }

    if (qtyBase <= 0) {
      setStatusMessage({ type: 'error', text: 'Jumlah barang harus lebih dari 0.' });
      return;
    }

    if (schedAutoDeduct && qtyBase > schedMaxAvailable) {
      setStatusMessage({
        type: 'error',
        text: `Jumlah melebihi stok yang tersedia! Sisa stok: ${schedMaxAvailable} ${item?.baseUnit || 'Pcs'}, Diminta: ${qtyBase} Pcs`,
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await createStoreScheduleAndStockAction({
        salesId: schedSalesId,
        storeId: schedStoreId,
        itemId: schedItemId,
        batchId: schedBatchId || undefined,
        quantityBase: qtyBase,
        deliveryDate: schedDeliveryDate,
        billingDate: schedBillingDate,
        autoDeductWarehouseStock: schedAutoDeduct,
        notes: schedNotes,
      });

      if (res.error) {
        setStatusMessage({ type: 'error', text: res.error });
      } else {
        setScheduleModalOpen(false);
        setStatusMessage({ type: 'success', text: 'Jadwal pengantaran dan penagihan berhasil dibuat!' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Gagal membuat jadwal.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Schedule
  const handleEditScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentToEdit) return;

    const qty = parseFloat(editQuantity) || 0;
    if (editAdjustStock && qty > maxAllowedEditQty) {
      setStatusMessage({
        type: 'error',
        text: `Jumlah melebihi batas stok yang tersedia! Maksimal yang dapat di-assign: ${maxAllowedEditQty} Pcs (Stok Gudang: ${editWarehouseAvailable} Pcs)`,
      });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await updateStoreScheduleAction({
        visitId: selectedAssignmentToEdit.id,
        salesId: editSalesId,
        storeId: editStoreId,
        itemId: editItemId,
        batchId: editBatchId || undefined,
        quantityBase: qty,
        deliveryDate: editDeliveryDate,
        billingDate: editBillingDate,
        adjustStock: editAdjustStock,
        notes: editNotes,
      });

      if (res.error) {
        setStatusMessage({ type: 'error', text: res.error });
      } else {
        setEditModalOpen(false);
        setStatusMessage({ type: 'success', text: 'Perubahan jadwal berhasil disimpan!' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err?.message || 'Gagal menyimpan perubahan.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Schedule
  const handleDeleteSchedule = async (visitId: string, storeName: string) => {
    if (confirm(`Apakah Anda yakin ingin membatalkan/menghapus jadwal toko "${storeName}"?`)) {
      try {
        await deleteStoreScheduleAction(visitId);
        setStatusMessage({ type: 'success', text: 'Jadwal berhasil dihapus.' });
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: err?.message || 'Gagal menghapus jadwal.' });
      }
    }
  };

  // Filtered assignments
  const filteredAssignments = React.useMemo(() => {
    return assignmentsList.filter((a) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        a.store.name.toLowerCase().includes(q) ||
        a.sales.name.toLowerCase().includes(q) ||
        (a.assignedItem && a.assignedItem.name.toLowerCase().includes(q)) ||
        (a.notes && a.notes.toLowerCase().includes(q));

      const matchesSales = filterSalesRep === 'ALL' || a.salesId === filterSalesRep;
      const matchesStatus = filterStatus === 'ALL' || a.status === filterStatus;

      const dDate = a.deliveryDate || a.visitDate;
      const bDate = a.billingDate || a.deliveryDate || a.visitDate;

      const checkMatch = (targetDate: string) => {
        if (!targetDate) return false;
        if (filterDatePreset === 'TODAY') {
          return targetDate === todayStr;
        } else if (filterDatePreset === 'TOMORROW') {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          return targetDate === getLocalDateString(tomorrow);
        } else if (filterDatePreset === 'UPCOMING') {
          return targetDate >= todayStr;
        }
        return true; // ALL
      };

      let matchesDate = true;
      if (filterDateBasis === 'DELIVERY') {
        matchesDate = checkMatch(dDate);
      } else if (filterDateBasis === 'BILLING') {
        matchesDate = checkMatch(bDate);
      } else {
        matchesDate = checkMatch(dDate) || checkMatch(bDate);
      }

      return matchesSearch && matchesSales && matchesStatus && matchesDate;
    });
  }, [assignmentsList, searchQuery, filterSalesRep, filterStatus, filterDateBasis, filterDatePreset, todayStr]);

  // Statistics for today
  const todayDeliveryCount = assignmentsList.filter((a) => (a.deliveryDate || a.visitDate) === todayStr).length;
  const todayBillingCount = assignmentsList.filter((a) => a.billingDate === todayStr).length;
  const todayDeliveryPcs = assignmentsList
    .filter((a) => (a.deliveryDate || a.visitDate) === todayStr)
    .reduce((sum, a) => sum + (a.assignedStockQty ?? a.targetQuantity ?? 0), 0);
  const totalCarStockPcs = salesStockData.reduce((s, d) => s + d.quantity, 0);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 shrink-0" />
            <span>Alokasi Stok & Jadwal Toko</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 line-clamp-1 sm:line-clamp-none">
            Penjadwalan pengantaran, penagihan, dan muatan mobil sales terintegrasi stok gudang.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setSchedDeliveryDate(todayStr);
              setSchedBillingDate(todayStr);
              setSchedBatchId('');
              setScheduleModalOpen(true);
            }}
            className="flex-1 sm:flex-none gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm shadow-indigo-600/20 rounded-xl px-3 sm:px-4 py-2 text-xs cursor-pointer h-9"
          >
            <Plus className="w-4 h-4" />
            <span>+ Assign Toko</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setDispatchModalOpen(true)}
            className="gap-1.5 text-xs font-bold rounded-xl h-9 px-3 border-slate-300 hover:bg-slate-50"
            title="Muat stok langsung ke mobil sales tanpa toko spesifik"
          >
            <Truck className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden xs:inline">Muat Mobil</span>
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3 sm:p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* KPI METRICS: COMPACT ON MOBILE, FULL ON DESKTOP          */}
      {/* ======================================================== */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Metric 1: Kirim Hari Ini */}
        <div className="rounded-xl sm:rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white p-2.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-xs font-bold text-indigo-900 uppercase tracking-tight truncate">
              🚚 Kirim Hari Ini
            </span>
            <div className="hidden sm:flex w-8 h-8 rounded-xl bg-indigo-600 text-white items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1 sm:mt-2">
            <div className="text-base sm:text-2xl font-black text-indigo-950 leading-tight">
              {todayDeliveryCount} <span className="text-[10px] sm:text-xs font-semibold text-indigo-600">Toko</span>
            </div>
            <p className="text-[10px] sm:text-xs text-indigo-700 font-semibold mt-0.5 truncate">
              {todayDeliveryPcs} Pcs Tahu
            </p>
          </div>
        </div>

        {/* Metric 2: Tagih Hari Ini */}
        <div className="rounded-xl sm:rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white p-2.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-xs font-bold text-emerald-900 uppercase tracking-tight truncate">
              📑 Tagih Hari Ini
            </span>
            <div className="hidden sm:flex w-8 h-8 rounded-xl bg-emerald-600 text-white items-center justify-center shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1 sm:mt-2">
            <div className="text-base sm:text-2xl font-black text-emerald-950 leading-tight">
              {todayBillingCount} <span className="text-[10px] sm:text-xs font-semibold text-emerald-600">Toko</span>
            </div>
            <p className="text-[10px] sm:text-xs text-emerald-700 font-semibold mt-0.5 truncate">
              Faktur & Tempo
            </p>
          </div>
        </div>

        {/* Metric 3: Stok di Mobil Sales */}
        <div className="rounded-xl sm:rounded-2xl border border-slate-200 bg-white p-2.5 sm:p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-xs font-bold text-slate-600 uppercase tracking-tight truncate">
              📦 Stok Mobil
            </span>
            <div className="hidden sm:flex w-8 h-8 rounded-xl bg-slate-100 text-slate-700 items-center justify-center shrink-0">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1 sm:mt-2">
            <div className="text-base sm:text-2xl font-black text-slate-900 leading-tight">
              {totalCarStockPcs} <span className="text-[10px] sm:text-xs font-semibold text-slate-500">Pcs</span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 font-semibold mt-0.5 truncate">
              {salesUsers.length} Sales Rep
            </p>
          </div>
        </div>
      </div>

      {/* TABS VIEW: JADWAL & STOK MOBIL */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="bg-slate-100 p-1 rounded-xl w-full grid grid-cols-2">
          <TabsTrigger value="schedules" className="gap-1.5 font-bold text-xs rounded-lg py-1.5 cursor-pointer truncate">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Jadwal ({assignmentsList.length})</span>
          </TabsTrigger>
          <TabsTrigger value="car-stock" className="gap-1.5 font-bold text-xs rounded-lg py-1.5 cursor-pointer truncate">
            <Truck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Muatan Mobil ({salesStockData.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: SCHEDULES */}
        <TabsContent value="schedules" className="space-y-3 pt-1">
          {/* Responsive Filter Toolbar */}
          <div className="space-y-2 bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-2xs">
            {/* Top row: Search */}
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari toko, sales, atau tahu..."
                className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

            {/* Bottom row: Filter Chips & Selects */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              {/* Date Presets */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg overflow-x-auto max-w-full">
                {(
                  [
                    { id: 'ALL', label: 'Semua' },
                    { id: 'TODAY', label: 'Hari Ini' },
                    { id: 'TOMORROW', label: 'Besok' },
                    { id: 'UPCOMING', label: 'Mendatang' },
                  ] as const
                ).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setFilterDatePreset(preset.id)}
                    className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                      filterDatePreset === preset.id
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Dropdowns */}
              <div className="flex items-center gap-1.5 flex-1 sm:flex-none justify-end">
                <select
                  value={filterSalesRep}
                  onChange={(e) => setFilterSalesRep(e.target.value)}
                  className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ALL">Semua Sales</option>
                  {salesUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="SCHEDULED">Terjadwal</option>
                  <option value="CHECKED_IN">Di Toko</option>
                  <option value="COMPLETED">Selesai</option>
                </select>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* MOBILE VIEW: SLEEK NATIVE CARD LIST (< md)                */}
          {/* ======================================================== */}
          <div className="block md:hidden space-y-2.5">
            {filteredAssignments.length === 0 ? (
              <div className="py-8 text-center text-slate-400 bg-white rounded-xl border border-slate-200 p-4">
                <Store className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-xs text-slate-600">Tidak ada jadwal ditemukan</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Gunakan tombol <strong>+ Assign Toko</strong> untuk membuat jadwal baru.
                </p>
              </div>
            ) : (
              filteredAssignments.map((a) => {
                const delivery = a.deliveryDate || a.visitDate;
                const billing = a.billingDate || delivery;
                const isDeliveryToday = delivery === todayStr;
                const isBillingToday = billing === todayStr;
                const isCompleted = a.status === 'COMPLETED';
                const assignedQty = a.assignedStockQty ?? a.targetQuantity ?? 0;
                const itemName = a.assignedItem?.name || 'Tahu';

                return (
                  <div
                    key={a.id}
                    className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2.5 transition-all"
                  >
                    {/* Header: Store name + Code + Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-xs text-slate-900 leading-tight">
                            {a.store.name}
                          </h4>
                          {a.store.code && (
                            <span className="text-[9px] font-mono font-semibold text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
                              {a.store.code}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {a.store.address}
                        </p>
                      </div>

                      <Badge
                        variant={
                          isCompleted
                            ? 'success'
                            : a.status === 'CHECKED_IN'
                            ? 'default'
                            : 'secondary'
                        }
                        className="text-[9px] font-bold shrink-0 px-1.5 py-0.5"
                      >
                        {a.status === 'CHECKED_IN' ? 'Sedang Check-In' : a.status === 'COMPLETED' ? 'Selesai' : 'Terjadwal'}
                      </Badge>
                    </div>

                    {/* Meta Grid: 2 Columns */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50/80 rounded-lg p-2 text-[11px] border border-slate-100">
                      {/* Item & Sales */}
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block">
                          Barang & Sales
                        </span>
                        <p className="font-black text-indigo-900 mt-0.5">
                          {assignedQty} Pcs <span className="font-semibold text-slate-600 text-[10px]">({itemName})</span>
                        </p>
                        <p className="text-[10px] text-slate-600 font-medium truncate mt-0.5">
                          👤 {a.sales.name}
                        </p>
                      </div>

                      {/* Dates */}
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight block">
                          Jadwal Tanggal
                        </span>
                        <div className="mt-0.5 space-y-0.5">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500 font-mono">🚚 {delivery}</span>
                            {isDeliveryToday && (
                              <span className="text-[8px] font-bold bg-indigo-100 text-indigo-800 px-1 rounded">
                                Hari Ini
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-slate-500 font-mono">📑 {billing}</span>
                            {isBillingToday && (
                              <span className="text-[8px] font-bold bg-amber-100 text-amber-900 px-1 rounded animate-pulse">
                                Tempo
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Orders / Invoices tag if present */}
                    {a.orders?.[0] && (
                      <div className="flex items-center justify-between text-[10px] bg-indigo-50/60 border border-indigo-100 px-2 py-1 rounded-md">
                        <span className="font-mono font-bold text-indigo-700">
                          {a.orders[0].invoiceNumber}
                        </span>
                        <span className="font-semibold text-indigo-900">
                          Status: {a.orders[0].paymentStatus}
                        </span>
                      </div>
                    )}

                    {/* Actions bar (touch friendly) */}
                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-100">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEdit(a)}
                        className="h-7 px-2.5 text-[11px] font-bold rounded-lg border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-indigo-50"
                      >
                        <Edit2 className="w-3 h-3 mr-1" />
                        <span>Edit</span>
                      </Button>
                      {!isCompleted && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteSchedule(a.id, a.store.name)}
                          className="h-7 px-2 text-[11px] font-bold rounded-lg border-slate-200 text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ======================================================== */}
          {/* DESKTOP VIEW: FULL DATA TABLE (>= md)                    */}
          {/* ======================================================== */}
          <Card className="hidden md:block border-slate-200 shadow-xs overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase bg-slate-50/70">
                    <tr>
                      <th className="py-3 px-4">Toko Tujuan</th>
                      <th className="py-3 px-4">Sales Pengantar</th>
                      <th className="py-3 px-4">Barang & Pcs Assign</th>
                      <th className="py-3 px-4">🚚 Tgl Kirim</th>
                      <th className="py-3 px-4">📑 Tgl Tagih (Bill)</th>
                      <th className="py-3 px-4">Status & Invoice</th>
                      <th className="py-3 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredAssignments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400">
                          <p className="font-semibold">Belum ada jadwal penugasan stok untuk filter ini.</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Klik tombol <strong>&ldquo;+ Assign Toko&rdquo;</strong> di atas untuk membuat jadwal baru.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredAssignments.map((a) => {
                        const delivery = a.deliveryDate || a.visitDate;
                        const billing = a.billingDate || delivery;
                        const isDeliveryToday = delivery === todayStr;
                        const isBillingToday = billing === todayStr;
                        const isCompleted = a.status === 'COMPLETED';

                        const assignedQty = a.assignedStockQty ?? a.targetQuantity ?? 0;
                        const itemName = a.assignedItem?.name || 'Tahu Standar';

                        return (
                          <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-start gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                                  <Store className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-slate-900 text-sm">{a.store.name}</h4>
                                  <span className="text-[11px] text-slate-500 line-clamp-1">{a.store.address}</span>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-800 block">{a.sales.name}</span>
                              <span className="text-[10px] text-slate-400">Sales Lapangan</span>
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-bold text-indigo-900">
                                {assignedQty} Pcs
                              </div>
                              <span className="text-[11px] text-slate-500 font-medium">
                                {itemName}
                              </span>
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-semibold text-slate-800">{delivery}</span>
                                {isDeliveryToday && (
                                  <Badge variant="purple" className="text-[9px] py-0 px-1 font-bold">
                                    Hari Ini
                                  </Badge>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-semibold text-slate-800">{billing}</span>
                                {isBillingToday && (
                                  <Badge variant="warning" className="text-[9px] py-0 px-1 font-bold animate-pulse">
                                    Jatuh Tempo
                                  </Badge>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="space-y-1">
                                <Badge
                                  variant={
                                    isCompleted
                                      ? 'success'
                                      : a.status === 'CHECKED_IN'
                                      ? 'default'
                                      : 'secondary'
                                  }
                                  className="text-[10px] font-bold"
                                >
                                  {a.status}
                                </Badge>
                                {a.orders?.[0] && (
                                  <span className="font-mono text-[10px] text-indigo-600 block">
                                    {a.orders[0].invoiceNumber} ({a.orders[0].paymentStatus})
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEdit(a)}
                                  className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                  title="Edit Tanggal Kirim, Tanggal Bill, atau Jumlah Stok"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                {!isCompleted && (
                                  <button
                                    onClick={() => handleDeleteSchedule(a.id, a.store.name)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                    title="Hapus / Batalkan Jadwal"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: CAR STOCK OVERVIEW */}
        <TabsContent value="car-stock" className="space-y-3 pt-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {salesUsers.map((sales) => {
              const heldItems = salesStockData.filter((s) => s.userId === sales.id);
              const totalHeldPcs = heldItems.reduce((sum, it) => sum + it.quantity, 0);

              return (
                <Card key={sales.id} className="border-slate-200 shadow-xs overflow-hidden rounded-xl">
                  <div className="p-3 sm:p-4 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-black text-xs shrink-0">
                        {sales.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm leading-tight truncate">{sales.name}</h4>
                        <span className="text-[10px] sm:text-[11px] text-indigo-300 truncate block">{sales.email}</span>
                      </div>
                    </div>
                    <Badge variant="purple" className="font-bold text-xs bg-indigo-500/30 text-indigo-200 border-indigo-400/40 shrink-0">
                      {totalHeldPcs} Pcs
                    </Badge>
                  </div>

                  <CardContent className="p-3 sm:p-4 space-y-2">
                    <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Rincian Muatan di Mobil:
                    </span>
                    {heldItems.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-1">Belum ada muatan di mobil sales ini.</p>
                    ) : (
                      heldItems.map((itemStock) => (
                        <div
                          key={itemStock.id}
                          className="flex items-center justify-between p-2 sm:p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="font-bold text-slate-900 block truncate">{itemStock.item.name}</span>
                            <span className="text-[10px] text-slate-500 truncate block">
                              SKU: {itemStock.item.sku} {itemStock.batch ? `• Exp: ${itemStock.batch.expireDate}` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-black text-indigo-700 text-xs sm:text-sm">
                              {itemStock.quantity} {itemStock.item.baseUnit}
                            </span>
                            <button
                              onClick={() => {
                                setItemToReturn(itemStock);
                                setReturnQty(itemStock.quantity.toString());
                                setReturnModalOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                              title="Retur ke gudang utama"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* ======================================================== */}
      {/* MODAL 1: ASSIGN STOK KE TOKO & JADWAL PENAGIHAN */}
      {/* ======================================================== */}
      <Dialog
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        title="Assign Stok & Jadwal Toko"
        description="Tentukan toko tujuan, barang yang dibawa, tanggal pengantaran, dan tanggal penagihan."
        className="max-w-xl max-h-[92vh] overflow-y-auto"
      >
        <form onSubmit={handleCreateScheduleSubmit} className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Toko Tujuan */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                1. Toko Tujuan
              </label>
              <select
                value={schedStoreId}
                onChange={(e) => handleStoreChange(e.target.value)}
                className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
              >
                {storesList.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} {st.defaultDailyTargetQty ? `(Def: ${st.defaultDailyTargetQty} Pcs)` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Sales Representative */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                2. Sales Pengantar
              </label>
              <select
                value={schedSalesId}
                onChange={(e) => setSchedSalesId(e.target.value)}
                className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
              >
                {salesUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Item Produk */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  3. Produk Tahu
                </label>
                <span className={`text-[10px] font-bold ${selectedSchedItem && selectedSchedItem.stockWarehouse > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  Gudang: {selectedSchedItem?.stockWarehouse || 0} {selectedSchedItem?.baseUnit || 'Pcs'}
                </span>
              </div>
              <select
                value={schedItemId}
                onChange={(e) => {
                  setSchedItemId(e.target.value);
                  setSchedBatchId('');
                }}
                className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
              >
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name} ({it.stockWarehouse} {it.baseUnit})
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Selection */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Batch Pilihan
                </label>
                {selectedSchedBatch && (
                  <span className="text-[10px] font-bold text-indigo-700">
                    Sisa: {selectedSchedBatch.currentQuantity} Pcs
                  </span>
                )}
              </div>
              <select
                value={schedBatchId}
                onChange={(e) => setSchedBatchId(e.target.value)}
                className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="">Otomatis FIFO</option>
                {schedAvailableBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchNo} ({b.currentQuantity} Pcs • Exp: {b.expireDate})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                4. Jumlah Kirim (Pcs)
              </label>
              <span className="text-[10px] text-slate-500 font-semibold">
                Maks: <strong className="text-slate-900">{schedMaxAvailable} Pcs</strong>
              </span>
            </div>
            <div className="flex gap-1.5">
              <input
                type="number"
                min="1"
                max={schedAutoDeduct ? schedMaxAvailable : undefined}
                value={schedQuantity}
                onChange={(e) => setSchedQuantity(e.target.value)}
                className={`w-full h-9 px-2.5 bg-white border rounded-xl text-xs font-bold ${
                  schedIsOverLimit
                    ? 'border-rose-500 text-rose-700 bg-rose-50 ring-1 ring-rose-500/20'
                    : 'border-slate-300 text-indigo-700'
                }`}
                placeholder="200"
                required
              />
              <select
                value={schedUnitType}
                onChange={(e) => setSchedUnitType(e.target.value)}
                className="w-24 h-9 px-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="BASE">Pcs</option>
                {items.find((i) => i.id === schedItemId)?.units?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.unitName}
                  </option>
                ))}
              </select>
            </div>

            {schedIsOverLimit && (
              <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-1 bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Input ({schedQtyNumber} Pcs) melebihi sisa stok ({schedMaxAvailable} Pcs).</span>
              </p>
            )}
          </div>

          {/* DELIVERY & BILLING DATES */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-2">
            <h4 className="text-[11px] font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1">
              <CalendarClock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Jadwal Pengantaran & Penagihan</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  🚚 Tgl Kirim
                </label>
                <input
                  type="date"
                  value={schedDeliveryDate}
                  onChange={(e) => handleSchedDeliveryDateChange(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  📑 Tgl Tagih (Bill)
                </label>
                <input
                  type="date"
                  value={schedBillingDate}
                  onChange={(e) => setSchedBillingDate(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  required
                />
              </div>
            </div>

            {/* Quick Presets for Billing Date */}
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <span className="text-[9px] font-bold text-indigo-900">Preset:</span>
              <button
                type="button"
                onClick={() => setSchedBillingDate(schedDeliveryDate)}
                className="px-1.5 py-0.5 bg-white hover:bg-indigo-100 text-indigo-800 rounded text-[9px] font-bold border border-indigo-200 transition-colors cursor-pointer"
              >
                Hari Sama
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(schedDeliveryDate);
                  d.setDate(d.getDate() + 1);
                  setSchedBillingDate(getLocalDateString(d));
                }}
                className="px-1.5 py-0.5 bg-white hover:bg-indigo-100 text-indigo-800 rounded text-[9px] font-bold border border-indigo-200 transition-colors cursor-pointer"
              >
                Besok (+1)
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(schedDeliveryDate);
                  d.setDate(d.getDate() + 3);
                  setSchedBillingDate(getLocalDateString(d));
                }}
                className="px-1.5 py-0.5 bg-white hover:bg-indigo-100 text-indigo-800 rounded text-[9px] font-bold border border-indigo-200 transition-colors cursor-pointer"
              >
                +3 Hari
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date(schedDeliveryDate);
                  d.setDate(d.getDate() + 7);
                  setSchedBillingDate(getLocalDateString(d));
                }}
                className="px-1.5 py-0.5 bg-white hover:bg-indigo-100 text-indigo-800 rounded text-[9px] font-bold border border-indigo-200 transition-colors cursor-pointer"
              >
                +7 Hari
              </button>
            </div>
          </div>

          {/* Auto Deduct Option */}
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <input
              type="checkbox"
              id="autoDeduct"
              checked={schedAutoDeduct}
              onChange={(e) => setSchedAutoDeduct(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="autoDeduct" className="text-slate-700 text-[11px] font-medium cursor-pointer">
              Potong stok gudang & masukkan ke mobil sales
            </label>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Catatan (Opsional)
            </label>
            <input
              type="text"
              value={schedNotes}
              onChange={(e) => setSchedNotes(e.target.value)}
              placeholder="Contoh: Kirim pagi sebelum jam 8"
              className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setScheduleModalOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || schedIsOverLimit}
              className="bg-indigo-600 hover:bg-indigo-700 font-bold cursor-pointer"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan & Jadwalkan'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 2: EDIT JADWAL & STOK ASSIGNMENT */}
      {/* ======================================================== */}
      <Dialog
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        title="Edit Jadwal Toko"
        description="Perbarui tanggal pengantaran, penagihan, atau jumlah barang."
        className="max-w-xl max-h-[92vh] overflow-y-auto"
      >
        <form onSubmit={handleEditScheduleSubmit} className="space-y-3 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Toko Tujuan
              </label>
              <select
                value={editStoreId}
                onChange={(e) => setEditStoreId(e.target.value)}
                className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
              >
                {storesList.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Sales Pengantar
              </label>
              <select
                value={editSalesId}
                onChange={(e) => setEditSalesId(e.target.value)}
                className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
              >
                {salesUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Produk Tahu
                </label>
                <span className="text-[10px] font-bold text-emerald-700">
                  Gudang: {selectedEditItem?.stockWarehouse || 0} {selectedEditItem?.baseUnit || 'Pcs'}
                </span>
              </div>
              <select
                value={editItemId}
                onChange={(e) => {
                  setEditItemId(e.target.value);
                  setEditBatchId('');
                }}
                className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
              >
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name} ({it.stockWarehouse} {it.baseUnit})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Batch Pilihan
                </label>
                {selectedEditBatch && (
                  <span className="text-[10px] font-bold text-indigo-700">
                    Sisa: {selectedEditBatch.currentQuantity} Pcs
                  </span>
                )}
              </div>
              <select
                value={editBatchId}
                onChange={(e) => setEditBatchId(e.target.value)}
                className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="">Otomatis FIFO</option>
                {editAvailableBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchNo} ({b.currentQuantity} Pcs • Exp: {b.expireDate})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Jumlah Assign (Pcs)
              </label>
              <span className="text-[10px] text-slate-500 font-semibold">
                Maks: <strong className="text-slate-900">{maxAllowedEditQty} Pcs</strong>
              </span>
            </div>
            <input
              type="number"
              min="1"
              max={editAdjustStock ? maxAllowedEditQty : undefined}
              value={editQuantity}
              onChange={(e) => setEditQuantity(e.target.value)}
              className={`w-full h-9 px-2.5 bg-white border rounded-xl text-xs font-bold ${
                editIsOverLimit
                  ? 'border-rose-500 text-rose-700 bg-rose-50 ring-1 ring-rose-500/20'
                  : 'border-slate-300 text-indigo-700'
              }`}
              required
            />

            {editIsOverLimit && (
              <p className="text-[10px] font-bold text-rose-600 flex items-center gap-1 mt-1 bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Input ({editQtyNumber} Pcs) melebihi batas stok ({maxAllowedEditQty} Pcs).</span>
              </p>
            )}
          </div>

          {/* DATES EDIT */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-2">
            <h4 className="text-[11px] font-black text-indigo-950 uppercase tracking-wider">
              Ubah Tanggal Pengantaran & Penagihan
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  🚚 Tanggal Kirim
                </label>
                <input
                  type="date"
                  value={editDeliveryDate}
                  onChange={(e) => handleEditDeliveryDateChange(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">
                  📑 Tanggal Tagih (Bill)
                </label>
                <input
                  type="date"
                  value={editBillingDate}
                  onChange={(e) => setEditBillingDate(e.target.value)}
                  className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  required
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Catatan
            </label>
            <input
              type="text"
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full h-8 px-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditModalOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || editIsOverLimit}
              className="bg-indigo-600 hover:bg-indigo-700 font-bold cursor-pointer"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 3: QUICK CAR STOCK DISPATCH */}
      {/* ======================================================== */}
      <Dialog
        open={dispatchModalOpen}
        onOpenChange={setDispatchModalOpen}
        title="Muat Stok ke Mobil Sales"
        description="Tambahkan stok muatan fisik langsung ke mobil sales rep dari gudang utama."
        className="max-w-md max-h-[92vh] overflow-y-auto"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const item = items.find((i) => i.id === dispatchItemId);
            let qtyBase = parseFloat(dispatchQuantity) || 0;
            if (dispatchUnitType !== 'BASE' && item?.units) {
              const u = item.units.find((unit) => unit.id === dispatchUnitType);
              if (u) qtyBase = qtyBase * u.conversionRate;
            }

            if (item && qtyBase > item.stockWarehouse) {
              setStatusMessage({
                type: 'error',
                text: `Stok gudang tidak mencukupi! Tersedia: ${item.stockWarehouse} ${item.baseUnit}, Diminta: ${qtyBase} Pcs`,
              });
              return;
            }

            setIsSubmitting(true);
            try {
              const res = await assignStockToSalesAction({
                userId: dispatchUserId,
                itemId: dispatchItemId,
                batchId: dispatchBatchId || undefined,
                quantityBase: qtyBase,
                notes: dispatchNotes,
              });
              if (res.error) {
                setStatusMessage({ type: 'error', text: res.error });
              } else {
                setDispatchModalOpen(false);
                setStatusMessage({ type: 'success', text: 'Stok berhasil dimuat ke mobil sales!' });
              }
            } catch (err: any) {
              setStatusMessage({ type: 'error', text: err?.message || 'Gagal memuat stok.' });
            } finally {
              setIsSubmitting(false);
            }
          }}
          className="space-y-3 pt-1"
        >
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Sales Representative
            </label>
            <select
              value={dispatchUserId}
              onChange={(e) => setDispatchUserId(e.target.value)}
              className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
            >
              {salesUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Produk Tahu
              </label>
              <span className="text-[10px] font-bold text-emerald-700">
                Gudang: {items.find((i) => i.id === dispatchItemId)?.stockWarehouse || 0} Pcs
              </span>
            </div>
            <select
              value={dispatchItemId}
              onChange={(e) => setDispatchItemId(e.target.value)}
              className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name} ({it.stockWarehouse} {it.baseUnit})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Jumlah Muatan
            </label>
            <div className="flex gap-1.5">
              <input
                type="number"
                min="1"
                max={items.find((i) => i.id === dispatchItemId)?.stockWarehouse || undefined}
                value={dispatchQuantity}
                onChange={(e) => setDispatchQuantity(e.target.value)}
                className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-indigo-700"
                required
              />
              <select
                value={dispatchUnitType}
                onChange={(e) => setDispatchUnitType(e.target.value)}
                className="w-24 h-9 px-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="BASE">Pcs</option>
                {items.find((i) => i.id === dispatchItemId)?.units?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.unitName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDispatchModalOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 font-bold">
              {isSubmitting ? 'Memuat...' : 'Muat ke Mobil'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL 4: RETURN TO WAREHOUSE */}
      {/* ======================================================== */}
      <Dialog
        open={returnModalOpen}
        onOpenChange={setReturnModalOpen}
        title="Retur Stok ke Gudang"
        description={`Kembalikan ${itemToReturn?.item?.name || 'stok'} dari mobil sales ke gudang utama.`}
        className="max-w-md max-h-[92vh] overflow-y-auto"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!itemToReturn) return;

            setIsSubmitting(true);
            try {
              const res = await returnStockToWarehouseAction({
                salesStockId: itemToReturn.id,
                userId: itemToReturn.userId,
                itemId: itemToReturn.item.id,
                batchId: itemToReturn.batchId || undefined,
                quantityBase: parseFloat(returnQty) || 0,
                notes: 'Retur dari mobil sales ke gudang',
              });

              if (res.error) {
                setStatusMessage({ type: 'error', text: res.error });
              } else {
                setReturnModalOpen(false);
                setStatusMessage({ type: 'success', text: 'Stok berhasil dikembalikan ke gudang!' });
              }
            } catch (err: any) {
              setStatusMessage({ type: 'error', text: err?.message || 'Gagal retur stok.' });
            } finally {
              setIsSubmitting(false);
            }
          }}
          className="space-y-3 pt-1"
        >
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide">
              Jumlah Dikembalikan ({itemToReturn?.item?.baseUnit || 'Pcs'})
            </label>
            <input
              type="number"
              min="1"
              max={itemToReturn?.quantity || 1}
              value={returnQty}
              onChange={(e) => setReturnQty(e.target.value)}
              className="w-full h-9 px-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-amber-700"
              required
            />
            <span className="text-[10px] text-slate-400">
              Maksimal di mobil: {itemToReturn?.quantity || 0} {itemToReturn?.item?.baseUnit || 'Pcs'}
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReturnModalOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 font-bold">
              {isSubmitting ? 'Memproses...' : 'Kembalikan ke Gudang'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

'use client';

import * as React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { processDropAndReturnAction } from '@/app/actions/sales-rep-actions';
import { formatRupiah, formatDate, getLocalDateString } from '@/lib/utils';
import {
  Package,
  Plus,
  Trash2,
  ArrowDownCircle,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Receipt,
  CreditCard,
  Coins,
  CheckSquare,
  Square,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface DropReturnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visit: {
    id: string;
    salesId: string;
    visitDate?: string | null;
    deliveryDate?: string | null;
    billingDate?: string | null;
    assignedItemId?: string | null;
    assignedStockQty?: number | null;
    targetQuantity?: number | null;
    notes?: string | null;
    store: {
      id: string;
      name: string;
      phone?: string | null;
      address: string;
      ownerName?: string | null;
      defaultDailyTargetQty?: number | null;
    };
    sales: {
      id: string;
      name: string;
      phone?: string | null;
    };
  } | null;
  salesStockItems: Array<{
    id: string;
    itemId: string;
    quantity: number; // in base unit
    item: {
      id: string;
      sku: string;
      name: string;
      baseUnit: string;
      basePrice: number;
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
  onOrderCompleted: (invoiceData: any) => void;
}

export function DropReturnModal({
  open,
  onOpenChange,
  visit,
  salesStockItems,
  unpaidInvoices = [],
  catalogItems = [],
  onOrderCompleted,
}: DropReturnModalProps) {
  // 4 Sales Transaction Types
  const [transactionType, setTransactionType] = React.useState<
    'DIRECT_DROP_BILL' | 'DROP_AND_COLLECT_PREV' | 'DROP_ONLY' | 'COLLECT_ONLY'
  >('DIRECT_DROP_BILL');

  // Drop items state
  const [drops, setDrops] = React.useState<
    Array<{
      itemId: string;
      unitName: string;
      conversionRate: number;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }>
  >([]);

  // Return items state
  const [returns, setReturns] = React.useState<
    Array<{
      itemId: string;
      unitName: string;
      conversionRate: number;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      condition: 'GOOD' | 'BROKEN';
      reason: string;
    }>
  >([]);

  // Previous unpaid invoices selected to be settled
  const [selectedSettleInvoiceIds, setSelectedSettleInvoiceIds] = React.useState<string[]>([]);

  const [discountAmount, setDiscountAmount] = React.useState<number>(0);
  const [paymentMethod, setPaymentMethod] = React.useState<'CASH' | 'TRANSFER' | 'TEMPO'>('CASH');
  const [notes, setNotes] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  // Unpaid invoices for this specific store
  const storeUnpaidInvoices = React.useMemo(() => {
    if (!visit?.store?.id) return [];
    return unpaidInvoices.filter((inv) => inv.storeId === visit.store.id);
  }, [unpaidInvoices, visit?.store?.id]);

  const todayStr = getLocalDateString();
  const deliveryDate = (visit as any)?.deliveryDate || visit?.visitDate;
  const billingDate = (visit as any)?.billingDate;
  const hasAssignedDelivery = ((visit as any)?.assignedStockQty || visit?.targetQuantity || 0) > 0;
  const isDeliveringToday = deliveryDate === todayStr || (Boolean(deliveryDate) && deliveryDate <= todayStr && hasAssignedDelivery);
  const isBillingToday = !billingDate || billingDate === todayStr || (Boolean(billingDate) && billingDate <= todayStr);
  const isBillingFuture = Boolean(billingDate && billingDate > todayStr);
  const hasUnpaidInvoices = storeUnpaidInvoices.length > 0;

  // Catalog of items available for returns (combines catalog, sales truck stock, and previous delivered items)
  const availableReturnableItems = React.useMemo(() => {
    const itemMap = new Map<
      string,
      {
        id: string;
        name: string;
        baseUnit: string;
        basePrice: number;
        units: Array<{ id: string; unitName: string; conversionRate: number; price?: number | null }>;
      }
    >();

    // 1. From catalog items
    if (catalogItems && catalogItems.length > 0) {
      catalogItems.forEach((it) => {
        itemMap.set(it.id, {
          id: it.id,
          name: it.name,
          baseUnit: it.baseUnit,
          basePrice: it.basePrice,
          units: it.units || [],
        });
      });
    }

    // 2. From sales rep stock
    if (salesStockItems && salesStockItems.length > 0) {
      salesStockItems.forEach((st) => {
        if (st.item && !itemMap.has(st.itemId)) {
          itemMap.set(st.itemId, {
            id: st.itemId,
            name: st.item.name,
            baseUnit: st.item.baseUnit,
            basePrice: st.item.basePrice,
            units: st.item.units || [],
          });
        }
      });
    }

    // 3. From unpaid previous invoices
    if (storeUnpaidInvoices && storeUnpaidInvoices.length > 0) {
      storeUnpaidInvoices.forEach((inv) => {
        inv.items?.forEach((itm: any) => {
          if (itm.item && itm.item.id && !itemMap.has(itm.item.id)) {
            itemMap.set(itm.item.id, {
              id: itm.item.id,
              name: itm.item.name,
              baseUnit: itm.item.baseUnit || itm.unitName || 'PCS',
              basePrice: itm.item.basePrice || itm.unitPrice || 0,
              units: itm.item.units || [{ id: 'u-1', unitName: itm.unitName || 'PCS', conversionRate: 1, price: itm.unitPrice || 0 }],
            });
          }
        });
      });
    }

    return Array.from(itemMap.values());
  }, [catalogItems, salesStockItems, storeUnpaidInvoices]);

  // Compute smart recommended default transaction mode based on delivery date and billing date
  const recommendedMode = React.useMemo<'DIRECT_DROP_BILL' | 'DROP_AND_COLLECT_PREV' | 'DROP_ONLY' | 'COLLECT_ONLY'>(() => {
    // 1. Jika hari ini HANYA jadwal penagihan (tidak ada pengantaran barang hari ini)
    if (!isDeliveringToday && (isBillingToday || hasUnpaidInvoices)) {
      return 'COLLECT_ONLY';
    }
    // 2. Jika hari ini kirim barang, TETAPI tanggal penagihan barang baru di masa depan (tempo/titip) dan TIDAK ada nota kemarin
    if (isDeliveringToday && isBillingFuture && !hasUnpaidInvoices) {
      return 'DROP_ONLY';
    }
    // 3. Jika hari ini kirim barang, TETAPI tanggal penagihan barang baru di masa depan (tempo/titip), dan ADA nota kemarin yang ditagih
    if (isDeliveringToday && isBillingFuture && hasUnpaidInvoices) {
      return 'DROP_AND_COLLECT_PREV';
    }
    // 4. Default: Kirim hari ini & tagih langsung hari ini (Jatuh tempo hari ini / Cash & Carry)
    return 'DIRECT_DROP_BILL';
  }, [isDeliveringToday, isBillingToday, isBillingFuture, hasUnpaidInvoices]);

  React.useEffect(() => {
    if (open) {
      // Auto-set default transaction mode based on schedule
      setTransactionType(recommendedMode);

      const targetItem =
        salesStockItems.find((s) => s.itemId === (visit as any)?.assignedItemId) ||
        salesStockItems[0];
      const defaultUnit = targetItem?.item.units?.[0];
      const initialQty =
        (visit as any)?.assignedStockQty ||
        visit?.targetQuantity ||
        visit?.store?.defaultDailyTargetQty ||
        1;
      const unitPrice =
        defaultUnit?.price || (targetItem?.item.basePrice || 0) * (defaultUnit?.conversionRate || 1);

      if (recommendedMode === 'COLLECT_ONLY') {
        setDrops([]);
        setSelectedSettleInvoiceIds(storeUnpaidInvoices.length > 0 ? [storeUnpaidInvoices[0].id] : []);
        setPaymentMethod('CASH');
      } else if (recommendedMode === 'DROP_ONLY') {
        if (targetItem) {
          setDrops([
            {
              itemId: targetItem.itemId,
              unitName: defaultUnit ? defaultUnit.unitName : targetItem.item.baseUnit,
              conversionRate: defaultUnit ? defaultUnit.conversionRate : 1,
              quantity: initialQty,
              unitPrice: unitPrice,
              subtotal: unitPrice * initialQty,
            },
          ]);
        }
        setSelectedSettleInvoiceIds([]);
        setPaymentMethod('TEMPO');
      } else if (recommendedMode === 'DROP_AND_COLLECT_PREV') {
        if (targetItem) {
          setDrops([
            {
              itemId: targetItem.itemId,
              unitName: defaultUnit ? defaultUnit.unitName : targetItem.item.baseUnit,
              conversionRate: defaultUnit ? defaultUnit.conversionRate : 1,
              quantity: initialQty,
              unitPrice: unitPrice,
              subtotal: unitPrice * initialQty,
            },
          ]);
        }
        setSelectedSettleInvoiceIds(storeUnpaidInvoices.length > 0 ? [storeUnpaidInvoices[0].id] : []);
        setPaymentMethod('CASH');
      } else {
        // DIRECT_DROP_BILL
        if (targetItem) {
          setDrops([
            {
              itemId: targetItem.itemId,
              unitName: defaultUnit ? defaultUnit.unitName : targetItem.item.baseUnit,
              conversionRate: defaultUnit ? defaultUnit.conversionRate : 1,
              quantity: initialQty,
              unitPrice: unitPrice,
              subtotal: unitPrice * initialQty,
            },
          ]);
        }
        setSelectedSettleInvoiceIds([]);
        setPaymentMethod('CASH');
      }

      setReturns([]);
      setDiscountAmount(0);
      setNotes('');
    }
  }, [open, salesStockItems, storeUnpaidInvoices, visit, recommendedMode]);

  if (!visit) return null;

  // Change mode handler
  const handleModeChange = (
    newMode: 'DIRECT_DROP_BILL' | 'DROP_AND_COLLECT_PREV' | 'DROP_ONLY' | 'COLLECT_ONLY'
  ) => {
    setTransactionType(newMode);
    if (newMode === 'COLLECT_ONLY') {
      setDrops([]);
      setSelectedSettleInvoiceIds(storeUnpaidInvoices.length > 0 ? [storeUnpaidInvoices[0].id] : []);
      setPaymentMethod('CASH');
    } else if (newMode === 'DROP_ONLY') {
      setSelectedSettleInvoiceIds([]);
      setPaymentMethod('TEMPO');
      if (drops.length === 0 && salesStockItems.length > 0) {
        const first = salesStockItems[0];
        const defaultUnit = first.item.units?.[0];
        setDrops([
          {
            itemId: first.itemId,
            unitName: defaultUnit ? defaultUnit.unitName : first.item.baseUnit,
            conversionRate: defaultUnit ? defaultUnit.conversionRate : 1,
            quantity: 1,
            unitPrice: defaultUnit?.price || first.item.basePrice * (defaultUnit?.conversionRate || 1),
            subtotal: defaultUnit?.price || first.item.basePrice * (defaultUnit?.conversionRate || 1),
          },
        ]);
      }
    } else if (newMode === 'DROP_AND_COLLECT_PREV') {
      setSelectedSettleInvoiceIds(storeUnpaidInvoices.length > 0 ? [storeUnpaidInvoices[0].id] : []);
      setPaymentMethod('CASH');
      if (drops.length === 0 && salesStockItems.length > 0) {
        const first = salesStockItems[0];
        const defaultUnit = first.item.units?.[0];
        setDrops([
          {
            itemId: first.itemId,
            unitName: defaultUnit ? defaultUnit.unitName : first.item.baseUnit,
            conversionRate: defaultUnit ? defaultUnit.conversionRate : 1,
            quantity: 1,
            unitPrice: defaultUnit?.price || first.item.basePrice * (defaultUnit?.conversionRate || 1),
            subtotal: defaultUnit?.price || first.item.basePrice * (defaultUnit?.conversionRate || 1),
          },
        ]);
      }
    } else {
      // DIRECT_DROP_BILL
      setSelectedSettleInvoiceIds([]);
      setPaymentMethod('CASH');
      if (drops.length === 0 && salesStockItems.length > 0) {
        const first = salesStockItems[0];
        const defaultUnit = first.item.units?.[0];
        setDrops([
          {
            itemId: first.itemId,
            unitName: defaultUnit ? defaultUnit.unitName : first.item.baseUnit,
            conversionRate: defaultUnit ? defaultUnit.conversionRate : 1,
            quantity: 1,
            unitPrice: defaultUnit?.price || first.item.basePrice * (defaultUnit?.conversionRate || 1),
            subtotal: defaultUnit?.price || first.item.basePrice * (defaultUnit?.conversionRate || 1),
          },
        ]);
      }
    }
  };

  // Toggle invoice settlement checkbox
  const toggleSettleInvoice = (invId: string) => {
    setSelectedSettleInvoiceIds((prev) =>
      prev.includes(invId) ? prev.filter((id) => id !== invId) : [...prev, invId]
    );
  };

  // Add Drop Line
  const handleAddDrop = () => {
    const first = salesStockItems[0];
    if (!first) return;
    const defaultUnit = first.item.units?.[0];
    setDrops([
      ...drops,
      {
        itemId: first.itemId,
        unitName: defaultUnit ? defaultUnit.unitName : first.item.baseUnit,
        conversionRate: defaultUnit ? defaultUnit.conversionRate : 1,
        quantity: 1,
        unitPrice: defaultUnit?.price || first.item.basePrice * (defaultUnit?.conversionRate || 1),
        subtotal: defaultUnit?.price || first.item.basePrice * (defaultUnit?.conversionRate || 1),
      },
    ]);
  };

  const handleUpdateDrop = (index: number, field: string, value: any) => {
    const updated = [...drops];
    const current = updated[index];
    const stockItem = salesStockItems.find((s) => s.itemId === current.itemId);

    if (field === 'itemId') {
      const newStock = salesStockItems.find((s) => s.itemId === value);
      if (newStock) {
        current.itemId = value;
        current.unitName = newStock.item.baseUnit;
        current.conversionRate = 1;
        current.unitPrice = newStock.item.basePrice;
        current.subtotal = current.quantity * current.unitPrice;
      }
    } else if (field === 'unitName') {
      current.unitName = value;
      if (value === stockItem?.item.baseUnit) {
        current.conversionRate = 1;
        current.unitPrice = stockItem?.item.basePrice || 0;
      } else {
        const u = stockItem?.item.units?.find((unit) => unit.unitName === value);
        current.conversionRate = u?.conversionRate || 1;
        current.unitPrice = u?.price || (stockItem?.item.basePrice || 0) * current.conversionRate;
      }
      current.subtotal = current.quantity * current.unitPrice;
    } else if (field === 'quantity') {
      current.quantity = Math.max(1, Number(value));
      current.subtotal = current.quantity * current.unitPrice;
    }

    setDrops(updated);
  };

  const handleRemoveDrop = (index: number) => {
    setDrops(drops.filter((_, i) => i !== index));
  };

  // Add Return Line
  const handleAddReturn = () => {
    const first = availableReturnableItems[0];
    if (!first) return;
    const defaultUnit = first.units?.[0];
    const unitPrice = defaultUnit?.price || (first.basePrice * (defaultUnit?.conversionRate || 1));
    setReturns([
      ...returns,
      {
        itemId: first.id,
        unitName: defaultUnit ? defaultUnit.unitName : first.baseUnit,
        conversionRate: defaultUnit ? defaultUnit.conversionRate : 1,
        quantity: 1,
        unitPrice: unitPrice,
        subtotal: unitPrice * 1,
        condition: 'GOOD',
        reason: '',
      },
    ]);
  };

  const handleUpdateReturn = (index: number, field: string, value: any) => {
    const updated = [...returns];
    const current = updated[index];
    const itemDef = availableReturnableItems.find((s) => s.id === current.itemId);

    if (field === 'itemId') {
      const newItem = availableReturnableItems.find((s) => s.id === value);
      if (newItem) {
        current.itemId = value;
        const defaultUnit = newItem.units?.[0];
        current.unitName = defaultUnit ? defaultUnit.unitName : newItem.baseUnit;
        current.conversionRate = defaultUnit ? defaultUnit.conversionRate : 1;
        current.unitPrice = defaultUnit?.price || (newItem.basePrice * current.conversionRate);
        current.subtotal = current.quantity * current.unitPrice;
      }
    } else if (field === 'unitName') {
      current.unitName = value;
      if (value === itemDef?.baseUnit) {
        current.conversionRate = 1;
        current.unitPrice = itemDef?.basePrice || 0;
      } else {
        const u = itemDef?.units?.find((unit) => unit.unitName === value);
        current.conversionRate = u?.conversionRate || 1;
        current.unitPrice = u?.price || (itemDef?.basePrice || 0) * current.conversionRate;
      }
      current.subtotal = current.quantity * current.unitPrice;
    } else if (field === 'quantity') {
      current.quantity = Math.max(1, Number(value));
      current.subtotal = current.quantity * current.unitPrice;
    } else if (field === 'condition') {
      current.condition = value;
    } else if (field === 'reason') {
      current.reason = value;
    }

    setReturns(updated);
  };

  const handleRemoveReturn = (index: number) => {
    setReturns(returns.filter((_, i) => i !== index));
  };

  // Total Calculations for today's drop and return deduction
  const grossTotal = drops.reduce((acc, curr) => acc + curr.subtotal, 0);
  const totalReturnAmount = returns.reduce((acc, curr) => acc + curr.subtotal, 0);

  // Net bill for today's delivered items after deducting returns & discount
  const netTotal =
    transactionType === 'DIRECT_DROP_BILL' || transactionType === 'DROP_ONLY'
      ? Math.max(0, grossTotal - totalReturnAmount - discountAmount)
      : Math.max(0, grossTotal - discountAmount);

  // Total collected from previous settled invoices
  const totalSettledInvoicesAmount = storeUnpaidInvoices
    .filter((inv) => selectedSettleInvoiceIds.includes(inv.id))
    .reduce((sum, inv) => sum + inv.netAmount, 0);

  // Net settlement for Mode 2 / Mode 4 after deducting returns
  const netSettledAfterReturns =
    transactionType === 'DROP_AND_COLLECT_PREV' || transactionType === 'COLLECT_ONLY'
      ? Math.max(0, totalSettledInvoicesAmount - totalReturnAmount)
      : totalSettledInvoicesAmount;

  // Actual cash/transfer collected today based on mode
  const actualCollectedMoneyToday =
    transactionType === 'DIRECT_DROP_BILL'
      ? (paymentMethod === 'TEMPO' ? 0 : netTotal) + totalSettledInvoicesAmount
      : transactionType === 'DROP_AND_COLLECT_PREV'
      ? netSettledAfterReturns
      : transactionType === 'COLLECT_ONLY'
      ? netSettledAfterReturns
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (transactionType !== 'COLLECT_ONLY' && drops.length === 0) {
      alert('Pilih minimal 1 barang yang akan dikirim, atau pilih Mode 4 jika toko tidak menambah stok.');
      return;
    }

    if (
      (transactionType === 'DROP_AND_COLLECT_PREV' || transactionType === 'COLLECT_ONLY') &&
      selectedSettleInvoiceIds.length === 0
    ) {
      alert('Pilih minimal 1 Nota Sebelumnya yang ditagih / dibayar hari ini.');
      return;
    }

    setIsSubmitting(true);
    try {
      const dropPayload = drops.map((d) => ({
        itemId: d.itemId,
        unitName: d.unitName,
        conversionRate: d.conversionRate,
        quantity: d.quantity,
        quantityBase: d.quantity * d.conversionRate,
        unitPrice: d.unitPrice,
        subtotal: d.subtotal,
      }));

      const returnPayload = returns.map((r) => ({
        itemId: r.itemId,
        unitName: r.unitName,
        conversionRate: r.conversionRate,
        quantity: r.quantity,
        quantityBase: r.quantity * r.conversionRate,
        condition: r.condition,
        reason: r.reason,
      }));

      const settleInvoiceIdsToSend =
        selectedSettleInvoiceIds.length > 0 ? selectedSettleInvoiceIds : undefined;

      const res = await processDropAndReturnAction({
        visitId: visit.id,
        storeId: visit.store.id,
        salesId: visit.salesId,
        transactionType,
        dropItems: dropPayload,
        returnItemsList: returnPayload,
        settleInvoiceIds: settleInvoiceIdsToSend,
        collectedAmount: actualCollectedMoneyToday,
        discountAmount,
        paymentMethod: transactionType === 'DROP_ONLY' ? 'TEMPO' : paymentMethod,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        onOpenChange(false);
        // Trigger invoice / receipt view
        onOrderCompleted({
          invoiceNumber: res.invoiceNumber,
          transactionType,
          storeName: visit.store.name,
          storePhone: visit.store.phone,
          storeAddress: visit.store.address,
          salesName: visit.sales.name,
          items: drops.map((d) => {
            const it = salesStockItems.find((s) => s.itemId === d.itemId);
            return {
              name: it?.item.name || 'Tahu',
              unitName: d.unitName,
              quantity: d.quantity,
              unitPrice: d.unitPrice,
              subtotal: d.subtotal,
            };
          }),
          returns: returns.map((r) => {
            const it = availableReturnableItems.find((s) => s.id === r.itemId);
            return {
              name: it?.name || 'Tahu',
              unitName: r.unitName,
              quantity: r.quantity,
              unitPrice: r.unitPrice || 0,
              subtotal: r.subtotal || 0,
              condition: r.condition,
              reason: r.reason,
            };
          }),
          settledInvoices:
            selectedSettleInvoiceIds.length > 0
              ? storeUnpaidInvoices
                  .filter((inv) => selectedSettleInvoiceIds.includes(inv.id))
                  .map((inv) => ({
                    invoiceNumber: inv.invoiceNumber,
                    netAmount: inv.netAmount,
                    createdAt: inv.visit?.deliveryDate || inv.visit?.visitDate || inv.createdAt,
                    items: (inv.items || []).map((itm: any) => ({
                      name: itm.item?.name || 'Tahu',
                      unitName: itm.unitName,
                      quantity: itm.quantity,
                      unitPrice: itm.unitPrice,
                      subtotal: itm.subtotal,
                    })),
                  }))
              : undefined,
          collectedAmount: actualCollectedMoneyToday,
          totalAmount: grossTotal,
          discountAmount,
          netAmount: netTotal,
          paymentMethod: transactionType === 'DROP_ONLY' ? 'TEMPO' : paymentMethod,
          createdAt: new Date(),
        });
      }
    } catch (err) {
      console.error(err);
      alert('Gagal memproses transaksi kunjungan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Transaksi Kunjungan: ${visit.store.name}`}
      description="Pilih mode transaksi yang dilakukan di toko hari ini (Kirim baru, Tagih nota kemarin, atau Titip stok)."
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Catatan Kunjungan Warning Banner */}
        {visit.notes && visit.notes.trim() !== '' && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-300/90 text-amber-950 text-xs shadow-2xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">
              <span className="font-black text-amber-900 mr-1.5 uppercase tracking-wider text-[10px] bg-amber-200/90 px-1.5 py-0.5 rounded font-mono">
                Catatan Khusus Kunjungan
              </span>
              <span className="font-semibold text-amber-950">{visit.notes}</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4 SALES FLOW MODE SWITCHER TABS                                          */}
        {/* ========================================================================= */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700">
            Pilih Tipe Transaksi Sales:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Mode 1 */}
            <button
              type="button"
              onClick={() => handleModeChange('DIRECT_DROP_BILL')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 relative ${
                transactionType === 'DIRECT_DROP_BILL'
                  ? 'bg-indigo-50/80 border-indigo-500 ring-1 ring-indigo-500/30 text-slate-900 shadow-2xs'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 font-bold text-xs ${
                  transactionType === 'DIRECT_DROP_BILL' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                1
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <p className="text-xs font-bold text-slate-900">Bawa & Tagih Langsung</p>
                  {recommendedMode === 'DIRECT_DROP_BILL' && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Sesuai Jadwal
                    </span>
                  )}
                </div>
                <p className="text-[11px] leading-tight text-slate-500">
                  Kirim barang hari ini & langsung ditagih pembayarannya.
                </p>
              </div>
            </button>

            {/* Mode 2 */}
            <button
              type="button"
              onClick={() => handleModeChange('DROP_AND_COLLECT_PREV')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 relative ${
                transactionType === 'DROP_AND_COLLECT_PREV'
                  ? 'bg-indigo-50/80 border-indigo-500 ring-1 ring-indigo-500/30 text-slate-900 shadow-2xs'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 font-bold text-xs ${
                  transactionType === 'DROP_AND_COLLECT_PREV' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                2
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <p className="text-xs font-bold text-slate-900">Bawa Baru + Tagih Nota Kemarin</p>
                  {recommendedMode === 'DROP_AND_COLLECT_PREV' && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Sesuai Jadwal
                    </span>
                  )}
                </div>
                <p className="text-[11px] leading-tight text-slate-500">
                  Kirim barang baru (titip) & tagih uang nota sebelumnya.
                </p>
              </div>
            </button>

            {/* Mode 3 */}
            <button
              type="button"
              onClick={() => handleModeChange('DROP_ONLY')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 relative ${
                transactionType === 'DROP_ONLY'
                  ? 'bg-indigo-50/80 border-indigo-500 ring-1 ring-indigo-500/30 text-slate-900 shadow-2xs'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 font-bold text-xs ${
                  transactionType === 'DROP_ONLY' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                3
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <p className="text-xs font-bold text-slate-900">Bawa Saja (Titip / Tempo)</p>
                  {recommendedMode === 'DROP_ONLY' && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Sesuai Jadwal
                    </span>
                  )}
                </div>
                <p className="text-[11px] leading-tight text-slate-500">
                  Kirim barang saja tanpa tagih uang hari ini (tagih di jatuh tempo).
                </p>
              </div>
            </button>

            {/* Mode 4 */}
            <button
              type="button"
              onClick={() => handleModeChange('COLLECT_ONLY')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2.5 relative ${
                transactionType === 'COLLECT_ONLY'
                  ? 'bg-indigo-50/80 border-indigo-500 ring-1 ring-indigo-500/30 text-slate-900 shadow-2xs'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 font-bold text-xs ${
                  transactionType === 'COLLECT_ONLY' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                4
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 flex-wrap">
                  <p className="text-xs font-bold text-slate-900">Hanya Tagih Nota Kemarin</p>
                  {recommendedMode === 'COLLECT_ONLY' && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Sesuai Jadwal
                    </span>
                  )}
                </div>
                <p className="text-[11px] leading-tight text-slate-500">
                  Tanpa kirim barang, hanya menagih pembayaran nota sebelumnya.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Target Quota Status Banner (if delivering items) */}
        {transactionType !== 'COLLECT_ONLY' &&
          (() => {
            const storeTargetQty = visit.targetQuantity || visit.store.defaultDailyTargetQty || 0;
            const totalDroppedPcs = drops.reduce((acc, curr) => acc + curr.quantity * curr.conversionRate, 0);

            const handleApplyTargetQuota = () => {
              if (storeTargetQty <= 0 || salesStockItems.length === 0) return;
              const first = salesStockItems[0];
              const unit = first.item.units?.[0];
              const conv = unit ? unit.conversionRate : 1;
              const targetUnits = Math.max(1, Math.round(storeTargetQty / conv));
              setDrops([
                {
                  itemId: first.itemId,
                  unitName: unit ? unit.unitName : first.item.baseUnit,
                  conversionRate: conv,
                  quantity: targetUnits,
                  unitPrice: unit?.price || first.item.basePrice * conv,
                  subtotal: targetUnits * (unit?.price || first.item.basePrice * conv),
                },
              ]);
            };

            return (
              <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-emerald-500/10 border border-indigo-200/80 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-indigo-900 tracking-wide flex items-center gap-1">
                      🎯 Target Kirim Toko: <strong className="text-indigo-700 font-black">{storeTargetQty} Pcs</strong>
                    </span>
                    {totalDroppedPcs === storeTargetQty && storeTargetQty > 0 ? (
                      <Badge variant="success" className="text-[10px] font-bold">
                        ✅ Pas Sesuai Target
                      </Badge>
                    ) : totalDroppedPcs > storeTargetQty && storeTargetQty > 0 ? (
                      <Badge variant="warning" className="text-[10px] font-bold">
                        +{totalDroppedPcs - storeTargetQty} Pcs Di Atas Target
                      </Badge>
                    ) : storeTargetQty > 0 ? (
                      <Badge variant="secondary" className="text-[10px] font-bold">
                        {totalDroppedPcs} / {storeTargetQty} Pcs
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Kuantiti terisi saat ini: <strong>{totalDroppedPcs} Pcs</strong>
                  </p>
                </div>

                {storeTargetQty > 0 && totalDroppedPcs !== storeTargetQty && (
                  <button
                    type="button"
                    onClick={handleApplyTargetQuota}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Isi Sesuai Target ({storeTargetQty} Pcs)</span>
                  </button>
                )}
              </div>
            );
          })()}

        {/* ========================================================================= */}
        {/* SECTION 1: DELIVERED / DROPPED ITEMS (Hidden in Mode 4)                   */}
        {/* ========================================================================= */}
        {transactionType !== 'COLLECT_ONLY' && (
          <div className="space-y-3 bg-indigo-50/40 p-4 rounded-xl border border-indigo-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5 text-indigo-600" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {transactionType === 'DROP_ONLY' || transactionType === 'DROP_AND_COLLECT_PREV'
                      ? '1. Barang Tahu Baru Diturunkan (Titip / Tempo)'
                      : '1. Delivered / Dropped Items (Barang Turun)'}
                  </h4>
                  <p className="text-[11px] text-slate-500">Stok yang diturunkan ke toko dari mobil sales</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {storeUnpaidInvoices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleModeChange('COLLECT_ONLY')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/80 hover:bg-amber-200/80 border border-amber-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    title="Klik jika toko menolak tambah stok dan hanya ingin melunasi nota kemarin"
                  >
                    <span>🛑 Toko Tidak Tambah Stok (Hanya Tagih)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddDrop}
                  className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer px-2 py-1 rounded-lg hover:bg-indigo-50"
                >
                  <Plus className="w-4 h-4" /> Tambah Barang
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {drops.map((drop, idx) => {
                const currentStock = salesStockItems.find((s) => s.itemId === drop.itemId);
                const availableBase = currentStock?.quantity || 0;
                const requestedBase = drop.quantity * drop.conversionRate;
                const isShortage = requestedBase > availableBase;

                return (
                  <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
                      {/* Item selector */}
                      <div className="md:col-span-5">
                        <select
                          value={drop.itemId}
                          onChange={(e) => handleUpdateDrop(idx, 'itemId', e.target.value)}
                          className="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-slate-900"
                        >
                          {salesStockItems.map((s) => (
                            <option key={s.itemId} value={s.itemId}>
                              {s.item.name} (Stok: {s.quantity} {s.item.baseUnit})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Unit selector */}
                      <div className="md:col-span-3">
                        <select
                          value={drop.unitName}
                          onChange={(e) => handleUpdateDrop(idx, 'unitName', e.target.value)}
                          className="w-full text-xs font-semibold px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-slate-900"
                        >
                          <option value={currentStock?.item.baseUnit}>
                            {currentStock?.item.baseUnit} (1x Base)
                          </option>
                          {currentStock?.item.units?.map((u) => (
                            <option key={u.id} value={u.unitName}>
                              {u.unitName} ({u.conversionRate} {currentStock?.item.baseUnit})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={drop.quantity}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            handleUpdateDrop(idx, 'quantity', val);
                          }}
                          placeholder="1"
                          className="w-full text-xs font-bold text-right px-2.5 py-1.5 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                        />
                      </div>

                      {/* Subtotal & Delete */}
                      <div className="md:col-span-2 flex items-center justify-between">
                        <span className="text-xs font-black text-indigo-700">
                          {formatRupiah(drop.subtotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDrop(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isShortage && (
                      <p className="text-[11px] font-bold text-rose-600 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Melebihi stok di mobil/tas ({availableBase} {currentStock?.item.baseUnit} tersedia)
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION: PREVIOUS UNPAID INVOICES (For Mode 1, Mode 2 & Mode 4)           */}
        {/* ========================================================================= */}
        {(transactionType === 'DROP_AND_COLLECT_PREV' ||
          transactionType === 'COLLECT_ONLY' ||
          (transactionType === 'DIRECT_DROP_BILL' && storeUnpaidInvoices.length > 0)) && (
          <div className="space-y-3 bg-amber-50/50 p-4 rounded-xl border border-amber-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-amber-700" />
                <div>
                  <h4 className="text-sm font-black text-amber-950">
                    Tagih Nota / Bill Hari Sebelumnya ({storeUnpaidInvoices.length} Nota Tertunggak)
                  </h4>
                  <p className="text-[11px] text-amber-800">
                    Centang nota kemarin yang dibayarkan oleh pemilik toko hari ini.
                  </p>
                </div>
              </div>
            </div>

            {storeUnpaidInvoices.length === 0 ? (
              <div className="p-4 bg-white rounded-lg border border-amber-200 text-center text-xs text-slate-500">
                <p className="font-semibold text-emerald-700">
                  🎉 Toko ini tidak memiliki tagihan/nota kemarin yang tertunggak.
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Semua transaksi sebelumnya sudah lunas.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {storeUnpaidInvoices.map((inv) => {
                  const isSelected = selectedSettleInvoiceIds.includes(inv.id);
                  return (
                    <div
                      key={inv.id}
                      onClick={() => toggleSettleInvoice(inv.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                        isSelected
                          ? 'bg-amber-100/70 border-amber-400 shadow-2xs'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="text-amber-700 mt-0.5">
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-indigo-600" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-xs font-black text-slate-900">
                                {inv.invoiceNumber}
                              </span>
                              <Badge variant="warning" className="text-[10px] uppercase font-bold">
                                Belum Lunas
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 mt-0.5">
                              <span>
                                Tanggal Pengiriman:{' '}
                                <strong className="text-slate-700">
                                  {formatDate(inv.visit?.deliveryDate || inv.visit?.visitDate || inv.createdAt)}
                                </strong>
                              </span>
                              {inv.visit?.billingDate && (
                                <span className="text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded font-medium text-[10px]">
                                  Jatuh Tempo: {formatDate(inv.visit.billingDate)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-left sm:text-right pl-8 sm:pl-0">
                          <span className="text-sm font-black text-indigo-950 block">
                            {formatRupiah(inv.netAmount)}
                          </span>
                          <span className="text-[10px] text-slate-500">Total Tagihan</span>
                        </div>
                      </div>

                      {/* Detailed items breakdown in this unpaid invoice */}
                      {inv.items && inv.items.length > 0 && (
                        <div className="pt-2 border-t border-amber-200/70 bg-white/70 rounded-lg p-2.5 space-y-1.5 text-xs">
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                            📦 Rincian Barang di Nota Ini:
                          </span>
                          <div className="divide-y divide-slate-100">
                            {inv.items.map((itm, itmIdx) => (
                              <div key={itmIdx} className="py-1 flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-800">• {itm.item?.name || 'Item Tahu'}</span>
                                  <span className="text-indigo-700 font-semibold">
                                    ({itm.quantity} {itm.unitName})
                                  </span>
                                  <span className="text-slate-400">
                                    @ {formatRupiah(itm.unitPrice || 0)}
                                  </span>
                                </div>
                                <span className="font-bold text-slate-900 shrink-0">{formatRupiah(itm.subtotal || 0)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2: STORE RETURNS (Retur Toko)                                     */}
        {/* ========================================================================= */}
        <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-slate-600" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Retur Toko (Opsional)</h4>
                <p className="text-[10px] text-slate-500">Barang kondisi baik langsung masuk kembali ke stok tas/mobil sales</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddReturn}
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Retur
            </button>
          </div>

          <div className="space-y-2">
            {returns.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-0.5">Tidak ada barang retur pada kunjungan ini.</p>
            ) : (
              returns.map((ret, idx) => {
                const itemDef = availableReturnableItems.find((s) => s.id === ret.itemId);
                return (
                  <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                      <div className="md:col-span-3">
                        <select
                          value={ret.itemId}
                          onChange={(e) => handleUpdateReturn(idx, 'itemId', e.target.value)}
                          className="w-full text-xs font-semibold px-2 py-1.5 border border-slate-300 rounded-md bg-white text-slate-900"
                        >
                          {availableReturnableItems.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <select
                          value={ret.unitName}
                          onChange={(e) => handleUpdateReturn(idx, 'unitName', e.target.value)}
                          className="w-full text-xs font-semibold px-2 py-1.5 border border-slate-300 rounded-md bg-white text-slate-900"
                        >
                          <option value={itemDef?.baseUnit}>
                            {itemDef?.baseUnit}
                          </option>
                          {itemDef?.units?.map((u) => (
                            <option key={u.id} value={u.unitName}>
                              {u.unitName}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={ret.quantity}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            handleUpdateReturn(idx, 'quantity', val);
                          }}
                          placeholder="1"
                          className="w-full text-xs font-bold text-right px-2 py-1.5 border border-slate-300 rounded-md text-slate-900"
                        />
                      </div>

                      <div className="md:col-span-2 text-right">
                        <span className="text-xs font-black text-rose-700 block">
                          - {formatRupiah(ret.subtotal)}
                        </span>
                        <span className="text-[9px] text-slate-400">@ {formatRupiah(ret.unitPrice)}</span>
                      </div>

                      <div className="md:col-span-3 flex items-center gap-1.5">
                        <select
                          value={ret.condition}
                          onChange={(e) => handleUpdateReturn(idx, 'condition', e.target.value)}
                          className={`text-[11px] font-bold px-1.5 py-1.5 border rounded-md shrink-0 ${
                            ret.condition === 'GOOD'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}
                        >
                          <option value="GOOD">✨ Baik</option>
                          <option value="BROKEN">⚠️ Rusak</option>
                        </select>

                        <input
                          type="text"
                          placeholder="Alasan"
                          value={ret.reason}
                          onChange={(e) => handleUpdateReturn(idx, 'reason', e.target.value)}
                          className="w-full text-xs px-2 py-1.5 border border-slate-300 rounded-md text-slate-900"
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveReturn(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: RINGKASAN PEMBAYARAN & UANG SETORAN                            */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-xl border border-slate-800">
          <div className="space-y-3">
            {transactionType === 'DROP_ONLY' ? (
              <div className="p-3.5 bg-amber-500/15 rounded-xl border border-amber-500/30 space-y-1">
                <p className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" /> Mode Titip / Tempo (Tanpa Uang Hari Ini)
                </p>
                <p className="text-[11px] text-amber-100 leading-tight">
                  Tahu baru bersih senilai <strong className="text-white font-bold">{formatRupiah(netTotal)}</strong> dicatat sebagai piutang toko dan akan ditagih pada kunjungan berikutnya.
                  {totalReturnAmount > 0 && (
                    <span className="block mt-1 text-rose-300 text-[10px]">
                      * Sudah dipotong retur toko senilai {formatRupiah(totalReturnAmount)}.
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-black text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-indigo-400" />
                  <span>Metode Penerimaan Uang:</span>
                </label>

                {/* Interactive Card Selection for Payment Method */}
                <div className="grid grid-cols-1 gap-2">
                  {/* Cash */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      paymentMethod === 'CASH'
                        ? 'bg-emerald-600/30 text-white border-emerald-400 ring-2 ring-emerald-500/40'
                        : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        paymentMethod === 'CASH' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-700 text-slate-300'
                      }`}>
                        💵
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Tunai (Cash di Tangan)</p>
                        <p className="text-[10px] text-slate-300">Diterima sales & wajib disetor ke kasir</p>
                      </div>
                    </div>
                    {paymentMethod === 'CASH' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </button>

                  {/* Transfer */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('TRANSFER')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      paymentMethod === 'TRANSFER'
                        ? 'bg-blue-600/30 text-white border-blue-400 ring-2 ring-blue-500/40'
                        : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                        paymentMethod === 'TRANSFER' ? 'bg-blue-500 text-white shadow-sm' : 'bg-slate-700 text-slate-300'
                      }`}>
                        📱
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Transfer Bank</p>
                        <p className="text-[10px] text-slate-300">Masuk langsung ke rekening kantor/owner</p>
                      </div>
                    </div>
                    {paymentMethod === 'TRANSFER' && (
                      <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    )}
                  </button>

                  {/* Tempo (Only in Mode 1) */}
                  {transactionType === 'DIRECT_DROP_BILL' && (
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('TEMPO')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        paymentMethod === 'TEMPO'
                          ? 'bg-amber-600/30 text-white border-amber-400 ring-2 ring-amber-500/40'
                          : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          paymentMethod === 'TEMPO' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-700 text-slate-300'
                        }`}>
                          ⏳
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Tempo / Bayar Nanti</p>
                          <p className="text-[10px] text-slate-300">Catat piutang baru (belum bayar hari ini)</p>
                        </div>
                      </div>
                      {paymentMethod === 'TEMPO' && (
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1 pt-1">
              <label className="block text-xs font-bold text-slate-300">Catatan Kunjungan (Opsional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Pembayaran tunai lunas, sisa titipan aman..."
                className="w-full text-xs px-3 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>
          </div>

          {/* Money Summary Box */}
          <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-700 pt-3 md:pt-0 md:pl-5 flex flex-col justify-between">
            <div className="space-y-2 text-xs">
              {transactionType !== 'COLLECT_ONLY' && (
                <div className="space-y-1 bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
                  <div className="flex justify-between items-start text-slate-200">
                    <div>
                      <span className="font-semibold text-slate-300 block">
                        {transactionType === 'DROP_AND_COLLECT_PREV' || transactionType === 'DROP_ONLY' || paymentMethod === 'TEMPO'
                          ? 'Nilai Tahu Baru (Gross):'
                          : 'Nilai Tahu Baru (Gross):'}
                      </span>
                      {(transactionType === 'DROP_AND_COLLECT_PREV' || transactionType === 'DROP_ONLY' || paymentMethod === 'TEMPO') ? (
                        <span className="text-[10px] text-amber-300 font-bold block mt-0.5">
                          ⏳ Tempo (Ditagih di Jatuh Tempo)
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-400 font-medium block mt-0.5">
                          💵 Dibayar & Ditagih Hari Ini
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-slate-300 text-xs shrink-0">{formatRupiah(grossTotal)}</span>
                  </div>

                  {totalReturnAmount > 0 && (transactionType === 'DIRECT_DROP_BILL' || transactionType === 'DROP_ONLY') && (
                    <div className="flex justify-between items-center text-rose-300 text-[11px] pt-1 border-t border-slate-700">
                      <span>(-) Potongan Retur Toko:</span>
                      <span className="font-bold text-rose-300">- {formatRupiah(totalReturnAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-white pt-1 border-t border-slate-700 font-black text-sm">
                    <span className="text-xs text-indigo-300">Net Nilai Kiriman:</span>
                    <span className="text-white">{formatRupiah(netTotal)}</span>
                  </div>
                </div>
              )}

              {(transactionType === 'DROP_AND_COLLECT_PREV' || transactionType === 'COLLECT_ONLY' || (transactionType === 'DIRECT_DROP_BILL' && totalSettledInvoicesAmount > 0)) && (
                <div className="space-y-1 bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/50">
                  <div className="flex justify-between items-center text-amber-200">
                    <div>
                      <span className="font-semibold text-amber-300 block">Nota Kemarin Dilunasi:</span>
                      <span className="text-[10px] text-amber-400/80 font-medium">
                        {selectedSettleInvoiceIds.length} Nota Dipilih
                      </span>
                    </div>
                    <span className="font-bold text-amber-200 text-xs">{formatRupiah(totalSettledInvoicesAmount)}</span>
                  </div>

                  {totalReturnAmount > 0 && (transactionType === 'DROP_AND_COLLECT_PREV' || transactionType === 'COLLECT_ONLY') && (
                    <div className="flex justify-between items-center text-rose-300 text-[11px] pt-1 border-t border-amber-900/60">
                      <span>(-) Potongan Retur Barang Kemarin:</span>
                      <span className="font-bold text-rose-300">- {formatRupiah(totalReturnAmount)}</span>
                    </div>
                  )}

                  {(transactionType === 'DROP_AND_COLLECT_PREV' || transactionType === 'COLLECT_ONLY') && totalReturnAmount > 0 && (
                    <div className="flex justify-between items-center text-amber-100 pt-1 border-t border-amber-900/60 font-black text-xs">
                      <span>Net Pelunasan Kemarin:</span>
                      <span>{formatRupiah(netSettledAfterReturns)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2 p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl flex justify-between items-baseline">
                <div>
                  <span className="text-xs font-black uppercase text-emerald-300 block">
                    Total Uang Diterima:
                  </span>
                  <span className="text-[10px] text-emerald-400/80">
                    {transactionType === 'DROP_AND_COLLECT_PREV' || transactionType === 'COLLECT_ONLY'
                      ? 'Murni pelunasan nota kemarin setelah potong retur'
                      : transactionType === 'DROP_ONLY'
                      ? '0 (Tanpa penerimaan uang)'
                      : 'Total uang wajib setor'}
                  </span>
                </div>
                <span className="text-2xl font-black text-emerald-300">
                  {formatRupiah(actualCollectedMoneyToday)}
                </span>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-3 border-t border-slate-800/80">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="w-full sm:w-auto text-xs font-bold text-slate-200 border-slate-600 bg-slate-800 hover:bg-slate-700 hover:text-white cursor-pointer h-10 sm:h-9"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto text-xs sm:text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/40 cursor-pointer h-11 sm:h-9"
              >
                {isSubmitting ? 'Memproses...' : 'Simpan Transaksi & Terbitkan Nota'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Dialog>
  );
}

'use client';

import * as React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { quickStockInAction } from '@/app/actions/stock-actions';
import { getLocalDateString } from '@/lib/utils';
import {
  Zap,
  Package,
  Calendar,
  Layers,
  Check,
  Plus,
  Sparkles,
  BookmarkCheck,
  Tag,
  Sliders,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface QuickStockInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Array<{
    id: string;
    sku: string;
    name: string;
    baseUnit: string;
    stockWarehouse: number;
    units?: Array<{
      id: string;
      unitName: string;
      conversionRate: number;
    }>;
  }>;
}

export function QuickStockInModal({ open, onOpenChange, items }: QuickStockInModalProps) {
  // State for selected item or manual product entry
  const [selectedItemId, setSelectedItemId] = React.useState<string>('');
  const [productName, setProductName] = React.useState<string>('');
  const [quantity, setQuantity] = React.useState<string>('100');
  const [selectedUnit, setSelectedUnit] = React.useState<string>('PCS');
  const [expireDate, setExpireDate] = React.useState<string>('');
  const [batchNo, setBatchNo] = React.useState<string>('');
  const [notes, setNotes] = React.useState('');
  const [showDetails, setShowDetails] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const MONTH_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];

  const generateTodayBatchCode = (): string => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const month = MONTH_SHORT[now.getMonth()] || 'SEP';
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}${mm}`;
    return `BATCH-${dd}_${month}_${yyyy}-${timeStr}`;
  };

  // Helper to generate default batch no and exp date
  const initializeDefaults = React.useCallback((name: string, defaultUnit?: string) => {
    const today = new Date();
    
    // Default Expire Date: 7 days for Tahu, 30 days otherwise
    const expDays = name.toLowerCase().includes('tahu') ? 7 : 30;
    const expDateObj = new Date(today);
    expDateObj.setDate(expDateObj.getDate() + expDays);
    const expStr = getLocalDateString(expDateObj);
    
    // Auto-fill Batch Number based on TODAY (Stock Input Date): BATCH-DD_MMM_YYYY-HHMM (e.g. BATCH-25_SEP_2026-1420)
    setBatchNo(generateTodayBatchCode());
    setExpireDate(expStr);

    if (defaultUnit) {
      setSelectedUnit(defaultUnit);
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      // If user has existing items, pick the first or saved preset
      const savedPreset = typeof window !== 'undefined' ? localStorage.getItem('default_product_preset') : null;
      let initialName = '';
      let initialItemId = '';
      let initialUnit = 'PCS';

      if (savedPreset) {
        const matched = items.find((i) => i.name.toLowerCase() === savedPreset.toLowerCase());
        if (matched) {
          initialItemId = matched.id;
          initialName = matched.name;
          initialUnit = matched.baseUnit;
        } else {
          initialName = savedPreset;
        }
      } else if (items.length > 0) {
        initialItemId = items[0].id;
        initialName = items[0].name;
        initialUnit = items[0].baseUnit;
      }

      setSelectedItemId(initialItemId);
      setProductName(initialName);
      setSelectedUnit(initialUnit);
      initializeDefaults(initialName, initialUnit);
      setQuantity('100');
      setNotes('Produksi Harian');
      setSuccessMessage(null);
    }
  }, [open, items, initializeDefaults]);

  const handleSelectExistingItem = (item: (typeof items)[0]) => {
    setSelectedItemId(item.id);
    setProductName(item.name);
    setSelectedUnit(item.baseUnit);
    initializeDefaults(item.name, item.baseUnit);
  };

  const handleManualAddMode = () => {
    setSelectedItemId('');
    setProductName('');
    setSelectedUnit('PCS');
    initializeDefaults('', 'PCS');
  };

  const handleSetAsDefault = () => {
    const nameToSave = productName.trim();
    if (nameToSave && typeof window !== 'undefined') {
      localStorage.setItem('default_product_preset', nameToSave);
      setSuccessMessage(`Product "${nameToSave}" berhasil diset sebagai preset default.`);
      setTimeout(() => setSuccessMessage(null), 2500);
    }
  };

  const handleDateChange = (newDateStr: string) => {
    setExpireDate(newDateStr);
    // Note: Batch number intentionally remains the stock input date (today)
  };

  const handleQuickAddDays = (days: number) => {
    const today = new Date();
    today.setDate(today.getDate() + days);
    const str = getLocalDateString(today);
    setExpireDate(str);
    // Note: Batch number intentionally remains the stock input date (today)
  };

  const handleSetTodayBatch = () => {
    setBatchNo(generateTodayBatchCode());
  };

  const selectedItem = items.find((i) => i.id === selectedItemId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedQty = Math.max(1, parseInt(quantity, 10) || 0);
    const finalProductName = selectedItemId ? undefined : productName.trim();

    if (!selectedItemId && !finalProductName) return;

    setIsSubmitting(true);
    try {
      const res = await quickStockInAction({
        itemId: selectedItemId || undefined,
        presetName: finalProductName,
        quantity: parsedQty,
        unitName: selectedUnit,
        expireDate: expireDate || undefined,
        batchNo: batchNo || undefined,
        notes: notes || undefined,
      });

      if (res.success) {
        setSuccessMessage(`Berhasil menambahkan stok ${parsedQty} ${selectedUnit}!`);
        setTimeout(() => {
          onOpenChange(false);
          setSuccessMessage(null);
        }, 800);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Mode Cepat: Tambah Stok (Product Set)"
      description="Input stok cepat per produk & batch dengan tanggal kedaluwarsa otomatis."
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Success toast inside modal */}
        {successMessage && (
          <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Product Selector / Real Master Items */}
        <div className="space-y-1.5 bg-gradient-to-r from-indigo-50/70 via-slate-50 to-indigo-50/40 p-2.5 sm:p-3 rounded-xl border border-indigo-100">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Pilih Produk Terdaftar</span>
            </label>
            {productName.trim() && (
              <button
                type="button"
                onClick={handleSetAsDefault}
                className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <BookmarkCheck className="w-3 h-3" />
                <span>Set Default</span>
              </button>
            )}
          </div>

          {/* Real User Master Items Chips */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {items.map((item) => {
              const isSelected = selectedItemId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectExistingItem(item)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/20'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  <span>{item.name}</span>
                </button>
              );
            })}

            {/* Manual Add Chip */}
            <button
              type="button"
              onClick={handleManualAddMode}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                !selectedItemId
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50'
              }`}
            >
              <Plus className="w-3 h-3" />
              <span>Manual</span>
            </button>
          </div>
        </div>

        {/* Selected Product Info / Custom Name */}
        {!selectedItemId ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                Nama Produk Baru
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => {
                  setProductName(e.target.value);
                  initializeDefaults(e.target.value, selectedUnit);
                }}
                placeholder="Ketik nama produk, misal: Keripik"
                required
                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
                Satuan (Unit)
              </label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="PCS">PCS (Satuan Dasar)</option>
                <option value="BOX">BOX</option>
                <option value="PACK">PACK</option>
                <option value="KARTON">KARTON</option>
                <option value="KG">KG</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-500">Satuan Input:</span>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="h-8 px-2.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={selectedItem?.baseUnit || 'PCS'}>
                  {selectedItem?.baseUnit || 'PCS'} (Satuan Dasar)
                </option>
                {selectedItem?.units?.map((u) => (
                  <option key={u.id} value={u.unitName}>
                    {u.unitName} (x{u.conversionRate} {selectedItem.baseUnit})
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[11px] text-slate-500">
              Stok Gudang: <b className="text-slate-900">{selectedItem?.stockWarehouse} {selectedItem?.baseUnit}</b>
            </span>
          </div>
        )}

        {/* Quantity Input with Fast Addition Buttons */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide">
            Jumlah Stok Masuk ({selectedUnit})
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              setQuantity(val);
            }}
            required
            className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-base font-black text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {/* Quick Quantity Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-400 font-semibold mr-0.5 shrink-0">Pintasan:</span>
            {[50, 100, 250, 500, 1000].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setQuantity(String(num))}
                className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-md text-[11px] font-bold text-slate-600 transition-colors cursor-pointer shrink-0"
              >
                +{num}
              </button>
            ))}
          </div>
        </div>

        {/* Expired Date with Quick Helpers */}
        <div className="space-y-1.5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:items-center justify-between gap-1.5">
            <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Tanggal Expire (Expired Date)</span>
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleQuickAddDays(7)}
                className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-100 text-slate-700 cursor-pointer shrink-0"
              >
                +7 Hari
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddDays(14)}
                className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-100 text-slate-700 cursor-pointer shrink-0"
              >
                +14 Hari
              </button>
              <button
                type="button"
                onClick={() => handleQuickAddDays(30)}
                className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-100 text-slate-700 cursor-pointer shrink-0"
              >
                +1 Bln
              </button>
            </div>
          </div>
          <Input
            type="date"
            value={expireDate}
            onChange={(e) => handleDateChange(e.target.value)}
            required
          />
        </div>

        {/* Collapsible Detailed Info (Batch Number, Shift/Notes, Projections) */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/60">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="w-full px-3 py-2 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer gap-2"
          >
            <span className="flex items-center gap-1.5 min-w-0">
              <Sliders className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="truncate">Info Detail & Batch</span>
            </span>
            <span className="text-[11px] text-indigo-600 flex items-center gap-1 font-semibold shrink-0">
              {showDetails ? 'Tutup' : 'Buka Detail'}
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </span>
          </button>

          {showDetails && (
            <div className="p-3.5 pt-2 space-y-3 border-t border-slate-200/80 bg-white">
              {/* Batch Number & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      Nama / Nomor Batch
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleSetTodayBatch}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                      >
                        📅 Reset Batch Hari Ini
                      </button>
                    </div>
                  </div>
                  <Input
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                    placeholder="e.g. BATCH-25_SEP_2026-1420"
                    helperText="Format otomatis: BATCH-{TGL}_{BLN}_{THN}-{JAM} atau bebas ketik manual."
                  />
                </div>
                <Input
                  label="Catatan / Shift"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Produksi Pagi / Supplier Tahu"
                />
              </div>

              {/* Projected Stock Calculation */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Total Stok Gudang Setelah Input:</span>
                <span className="font-black text-emerald-600 text-sm">
                  +{(Number(quantity) || 0).toLocaleString()} {selectedUnit}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-md shadow-emerald-600/20"
          >
            <Zap className="w-4 h-4" />
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Stok Masuk'}</span>
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

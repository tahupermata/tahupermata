'use client';

import * as React from 'react';
import { ItemModal } from './item-modal';
import { StockAdjustmentModal } from './stock-adjustment-modal';
import { QuickStockInModal } from './quick-stock-in-modal';
import { EditBatchModal } from './edit-batch-modal';
import { deleteItemAction, deleteBatchAction } from '@/app/actions/stock-actions';
import { formatRupiah, formatBaseQuantityWithUnits } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ArrowUpDown,
  Layers,
  Sparkles,
  Sliders,
  History,
  Package,
  Zap,
  Tag,
  Calendar,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { DynamicAttribute } from '@/db/schema';

interface StockTableProps {
  items: Array<{
    id: string;
    sku: string;
    name: string;
    category: string;
    baseUnit: string;
    basePrice: number;
    imageUrl?: string | null;
    stockWarehouse: number;
    dynamicAttributes: DynamicAttribute[];
    units: Array<{
      id: string;
      unitName: string;
      conversionRate: number;
      price?: number | null;
      isDefault: boolean;
    }>;
    batches?: Array<{
      id: string;
      batchNo: string;
      expireDate: string;
      initialQuantity: number;
      currentQuantity: number;
      unitName?: string | null;
      notes?: string | null;
      createdAt?: Date | null;
    }>;
  }>;
  mutations: Array<{
    id: string;
    type: string;
    quantity: number;
    notes?: string | null;
    createdAt?: Date | null;
    item: {
      name: string;
      sku: string;
      baseUnit: string;
    };
    user?: {
      name: string;
    } | null;
  }>;
  canManage: boolean;
}

export function StockTable({ items, mutations, canManage }: StockTableProps) {
  const [search, setSearch] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('ALL');
  const [isItemModalOpen, setIsItemModalOpen] = React.useState(false);
  const [itemToEdit, setItemToEdit] = React.useState<any | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = React.useState(false);
  const [itemToAdjust, setItemToAdjust] = React.useState<any | null>(null);
  const [isQuickStockOpen, setIsQuickStockOpen] = React.useState(false);
  const [isEditBatchModalOpen, setIsEditBatchModalOpen] = React.useState(false);
  const [batchToEdit, setBatchToEdit] = React.useState<any | null>(null);

  // Extract unique categories
  const categories = ['ALL', ...Array.from(new Set(items.map((i) => i.category)))];

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.dynamicAttributes.some((attr) =>
        String(attr.value || '').toLowerCase().includes(search.toLowerCase())
      );
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleCreateNew = () => {
    setItemToEdit(null);
    setIsItemModalOpen(true);
  };

  const handleEdit = (item: any) => {
    setItemToEdit(item);
    setIsItemModalOpen(true);
  };

  const handleAdjust = (item: any) => {
    setItemToAdjust(item);
    setIsAdjustModalOpen(true);
  };

  const handleEditBatch = (batch: any) => {
    setBatchToEdit(batch);
    setIsEditBatchModalOpen(true);
  };

  // Extract all batches across all items
  const allBatches = React.useMemo(() => {
    return items.flatMap((item) =>
      (item.batches || []).map((batch) => ({
        ...batch,
        item,
      }))
    ).sort((a, b) => a.expireDate.localeCompare(b.expireDate));
  }, [items]);

  const handleDelete = async (itemId: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      await deleteItemAction(itemId);
    }
  };

  const handleDeleteBatch = async (batchId: string, batchNo: string, expDate: string) => {
    if (confirm(`Hapus batch "${batchNo}" (Exp: ${expDate})? Stok gudang akan otomatis dikurangi sejumlah stok batch ini.`)) {
      await deleteBatchAction(batchId);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
            <span>Stock & Inventory Management</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola master item, pelacakan batch & tanggal expire, dan konversi multi-tier unit.
          </p>
        </div>

        {canManage && (
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
            <Button
              onClick={() => setIsQuickStockOpen(true)}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 text-xs sm:text-sm h-10 px-3 justify-center"
            >
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-white shrink-0" />
              <span className="truncate">Tambah Stok Cepat</span>
            </Button>
            <Button
              onClick={handleCreateNew}
              variant="outline"
              className="gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs sm:text-sm h-10 px-3 justify-center"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">Master Item Baru</span>
            </Button>
          </div>
        )}
      </div>

      {/* Quick Presets Shortcut Bar - Generated from Real Database Items */}
      {canManage && items.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-transparent p-2.5 sm:p-3 rounded-2xl border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-emerald-600 text-white shrink-0">
              <Zap className="w-3 h-3" />
            </span>
            <p className="text-xs font-black text-slate-900">Pintasan Tambah Stok Produk:</p>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {items.slice(0, 6).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setIsQuickStockOpen(true)}
                className="px-2.5 py-1 rounded-xl bg-white hover:bg-emerald-50 text-slate-800 border border-slate-200 hover:border-emerald-300 text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <Tag className="w-3 h-3 text-emerald-600" />
                <span>+ {item.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="inventory">
        <TabsList className="w-full overflow-x-auto flex-nowrap scrollbar-none justify-start sm:justify-center p-1 bg-slate-100 rounded-xl gap-1">
          <TabsTrigger value="inventory" className="gap-1.5 text-xs font-bold whitespace-nowrap px-3 py-2 shrink-0">
            <Package className="w-3.5 h-3.5" />
            <span>Warehouse Inventory ({items.length})</span>
          </TabsTrigger>
          <TabsTrigger value="batches" className="gap-1.5 text-xs font-bold whitespace-nowrap px-3 py-2 shrink-0">
            <Calendar className="w-3.5 h-3.5" />
            <span>Daftar Batch & Expire ({allBatches.length})</span>
          </TabsTrigger>
          <TabsTrigger value="mutations" className="gap-1.5 text-xs font-bold whitespace-nowrap px-3 py-2 shrink-0">
            <History className="w-3.5 h-3.5" />
            <span>Stock Mutations ({mutations.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* Tab 1: Warehouse Inventory */}
        {/* ========================================================================= */}
        <TabsContent value="inventory" className="space-y-3 sm:space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-2.5 w-full sm:w-80 h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Cari SKU, nama, atau atribut..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-full bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap mr-1">Kategori:</span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop View Table */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase bg-slate-50/70">
                    <tr>
                      <th className="py-3.5 px-4">Item & SKU</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Base Unit & Price</th>
                      <th className="py-3.5 px-4">Multi-Tier Units</th>
                      <th className="py-3.5 px-4">Dynamic Attributes</th>
                      <th className="py-3.5 px-4 text-center">Warehouse Stock</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400 text-sm">
                          Tidak ada produk yang cocok dengan filter pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* Item Name & Image */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                                {item.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Package className="w-6 h-6 text-slate-400" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm">{item.name}</h4>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-mono font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                    {item.sku}
                                  </span>
                                  {item.batches && item.batches.length > 0 && (
                                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                      {item.batches.length} Batch Aktif
                                    </span>
                                  )}
                                </div>

                                {/* Active Batches Badges */}
                                {item.batches && item.batches.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5 max-w-sm">
                                    {item.batches.map((b) => {
                                      const daysLeft = Math.ceil((new Date(b.expireDate).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
                                      const isExpired = daysLeft < 0;
                                      const isExpiringSoon = daysLeft >= 0 && daysLeft <= 7;
                                      return (
                                        <button
                                          key={b.id}
                                          type="button"
                                          onClick={() => handleEditBatch({ ...b, item })}
                                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border transition-all cursor-pointer hover:shadow-xs ${
                                            isExpired
                                              ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                                              : isExpiringSoon
                                              ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                          }`}
                                          title={`Klik untuk edit batch: ${b.batchNo} | Expire: ${b.expireDate} | Sisa: ${b.currentQuantity} ${item.baseUnit}`}
                                        >
                                          <Tag className="w-2.5 h-2.5 text-slate-400" />
                                          <span>{b.batchNo}</span>
                                          <span className="text-slate-400">•</span>
                                          <span>Exp: {b.expireDate}</span>
                                          <span className="text-slate-400">•</span>
                                          <span className="text-indigo-600">{b.currentQuantity} {item.baseUnit}</span>
                                          <Edit2 className="w-2.5 h-2.5 text-slate-400 ml-0.5 opacity-60" />
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3.5 px-4 text-xs font-semibold text-slate-600">
                            {item.category}
                          </td>

                          {/* Base Unit & Price */}
                          <td className="py-3.5 px-4">
                            <div className="text-xs">
                              <span className="font-bold text-slate-900">
                                {formatRupiah(item.basePrice)}
                              </span>
                              <span className="text-slate-500 font-medium"> / {item.baseUnit}</span>
                            </div>
                          </td>

                          {/* Multi-tier Units */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              <Badge variant="outline" className="text-[11px] bg-slate-50">
                                1 {item.baseUnit} (Base)
                              </Badge>
                              {item.units?.map((u) => (
                                <Badge
                                  key={u.id}
                                  variant="success"
                                  className="text-[11px] bg-emerald-50 text-emerald-800 border-emerald-200"
                                >
                                  1 {u.unitName} = {u.conversionRate} {item.baseUnit} (
                                  {formatRupiah(u.price || u.conversionRate * item.basePrice)})
                                </Badge>
                              ))}
                            </div>
                          </td>

                          {/* Dynamic Attributes (JSON) */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {item.dynamicAttributes && item.dynamicAttributes.length > 0 ? (
                                item.dynamicAttributes.map((attr, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200/80 px-2 py-0.5 rounded-md"
                                  >
                                    <strong className="text-purple-900">{attr.label}:</strong>{' '}
                                    {String(attr.value || '-')}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-slate-400 italic">No custom fields</span>
                              )}
                            </div>
                          </td>

                          {/* Warehouse Stock */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex flex-col items-center">
                              <span
                                className={`text-sm font-black px-2.5 py-1 rounded-lg ${
                                  item.stockWarehouse > 50
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : item.stockWarehouse > 0
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {item.stockWarehouse} {item.baseUnit}
                              </span>
                              <span className="text-[10px] text-slate-500 mt-0.5">
                                ≈ {formatBaseQuantityWithUnits(item.stockWarehouse, item.baseUnit, item.units)}
                              </span>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleAdjust(item)}
                                title="Mutate / Adjust Stock"
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <ArrowUpDown className="w-4 h-4 text-amber-600" />
                              </button>
                              {canManage && (
                                <>
                                  <button
                                    onClick={() => handleEdit(item)}
                                    title="Edit Item"
                                    className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="w-4 h-4 text-indigo-600" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(item.id, item.name)}
                                    title="Delete Item"
                                    className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Mobile Card List View (Clean & Touch-Friendly) */}
          <div className="block md:hidden space-y-3">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-xs">
                Tidak ada produk yang cocok dengan pencarian.
              </div>
            ) : (
              filteredItems.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-2xs space-y-3">
                  {/* Top Row: Thumbnail + Item info + Stock Badge */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{item.name}</h4>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className="text-[10px] font-mono font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {item.sku}
                          </span>
                          <span className="text-[10px] text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Stock Badge */}
                    <div className="text-right shrink-0">
                      <span
                        className={`text-xs font-black px-2.5 py-1 rounded-lg inline-block ${
                          item.stockWarehouse > 50
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.stockWarehouse > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.stockWarehouse} {item.baseUnit}
                      </span>
                    </div>
                  </div>

                  {/* Price & Conversions Summary */}
                  <div className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Harga Dasar:</span>
                      <span className="font-bold text-slate-900">{formatRupiah(item.basePrice)} / {item.baseUnit}</span>
                    </div>
                    {item.units && item.units.length > 0 && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500">Konversi:</span>
                        <div className="flex flex-wrap gap-1 justify-end">
                          {item.units.map((u) => (
                            <span key={u.id} className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                              1 {u.unitName} = {u.conversionRate} {item.baseUnit}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Active Batches Chips */}
                  {item.batches && item.batches.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                        Batch Aktif ({item.batches.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {item.batches.map((b) => {
                          const daysLeft = Math.ceil((new Date(b.expireDate).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
                          const isExpired = daysLeft < 0;
                          const isExpiringSoon = daysLeft >= 0 && daysLeft <= 7;
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => handleEditBatch({ ...b, item })}
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                                isExpired
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : isExpiringSoon
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-indigo-50/50 text-indigo-900 border-indigo-200'
                              }`}
                            >
                              <Tag className="w-2.5 h-2.5 text-slate-400" />
                              <span>{b.batchNo}</span>
                              <span>•</span>
                              <span>Exp: {b.expireDate}</span>
                              <span>•</span>
                              <span className="text-indigo-600 font-black">{b.currentQuantity} {item.baseUnit}</span>
                              <Edit2 className="w-2.5 h-2.5 text-slate-400 ml-0.5" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons Row */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleAdjust(item)}
                      className="flex-1 py-2 px-3 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ArrowUpDown className="w-3.5 h-3.5" />
                      <span>Mutasi Stok</span>
                    </button>
                    {canManage && (
                      <>
                        <button
                          onClick={() => handleEdit(item)}
                          className="py-2 px-3 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="Edit Item"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.name)}
                          className="py-2 px-3 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="Hapus Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* Tab 2: Batches & Expire Tracking */}
        {/* ========================================================================= */}
        <TabsContent value="batches" className="space-y-3 sm:space-y-4">
          {/* Batches Overview Banner - 3 Columns on Mobile for Clean Compact Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="p-2.5 sm:p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-3 text-center sm:text-left">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Total Batch</span>
                <p className="text-base sm:text-xl font-black text-slate-900">{allBatches.length}</p>
              </div>
            </div>

            <div className="p-2.5 sm:p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-3 text-center sm:text-left">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wide block">≤ 7 Hari</span>
                <p className="text-base sm:text-xl font-black text-amber-700">
                  {allBatches.filter((b) => {
                    const days = Math.ceil((new Date(b.expireDate).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
                    return days >= 0 && days <= 7;
                  }).length}
                </p>
              </div>
            </div>

            <div className="p-2.5 sm:p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center sm:items-start gap-1 sm:gap-3 text-center sm:text-left">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Expired</span>
                <p className="text-base sm:text-xl font-black text-rose-700">
                  {allBatches.filter((b) => {
                    const days = Math.ceil((new Date(b.expireDate).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
                    return days < 0;
                  }).length}
                </p>
              </div>
            </div>
          </div>

          {/* Desktop View Table */}
          <Card className="hidden md:block">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span>Daftar Seluruh Batch & Tanggal Expire</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Setiap penambahan stok dengan tanggal expire berbeda otomatis dipisahkan ke dalam batch tersendiri.
                </CardDescription>
              </div>
              {canManage && (
                <Button
                  onClick={() => setIsQuickStockOpen(true)}
                  size="sm"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Batch Baru</span>
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase bg-slate-50/70">
                    <tr>
                      <th className="py-3.5 px-4">Produk</th>
                      <th className="py-3.5 px-4">Nomor Batch</th>
                      <th className="py-3.5 px-4">Tanggal Expire & Status</th>
                      <th className="py-3.5 px-4 text-right">Sisa Stok Batch</th>
                      <th className="py-3.5 px-4">Catatan / Shift</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allBatches.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                          Belum ada data batch. Gunakan tombol &quot;Tambah Stok Cepat (Product Set)&quot; untuk mencatat batch pertama.
                        </td>
                      </tr>
                    ) : (
                      allBatches.map((b) => {
                        const daysLeft = Math.ceil((new Date(b.expireDate).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
                        const isExpired = daysLeft < 0;
                        const isExpiringSoon = daysLeft >= 0 && daysLeft <= 7;

                        return (
                          <tr key={b.id} className="hover:bg-slate-50/80 transition-colors text-xs">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900 text-sm">{b.item.name}</div>
                              <span className="text-[11px] font-mono text-slate-500">{b.item.sku}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                                {b.batchNo}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800">{b.expireDate}</span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    isExpired
                                      ? 'bg-rose-100 text-rose-800'
                                      : isExpiringSoon
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {isExpired
                                    ? `Kedaluwarsa (${Math.abs(daysLeft)} hr lalu)`
                                    : isExpiringSoon
                                    ? `Segera Expire (${daysLeft} hr lagi)`
                                    : `Segar (${daysLeft} hari lagi)`}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="font-black text-slate-900 text-sm">
                                {b.currentQuantity.toLocaleString()}
                              </span>
                              <span className="text-slate-500 text-xs ml-1">{b.item.baseUnit}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-500">
                              {b.notes || '-'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {canManage && (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => handleEditBatch(b)}
                                    title="Edit rincian Batch ini"
                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteBatch(b.id, b.batchNo, b.expireDate)}
                                    title="Hapus Batch ini"
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
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

          {/* Mobile Card List View for Batches (Clean & Organized) */}
          <div className="block md:hidden space-y-3">
            {allBatches.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-xs">
                Belum ada data batch tercatat.
              </div>
            ) : (
              allBatches.map((b) => {
                const daysLeft = Math.ceil((new Date(b.expireDate).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24));
                const isExpired = daysLeft < 0;
                const isExpiringSoon = daysLeft >= 0 && daysLeft <= 7;

                return (
                  <div key={b.id} className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-2xs space-y-2.5">
                    {/* Top Header: Product Name + Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{b.item.name}</h4>
                        <span className="text-[11px] font-mono text-slate-400">{b.item.sku}</span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                          isExpired
                            ? 'bg-rose-100 text-rose-800'
                            : isExpiringSoon
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isExpired
                          ? `Kedaluwarsa (${Math.abs(daysLeft)} hr lalu)`
                          : isExpiringSoon
                          ? `Segera Expire (${daysLeft} hr lagi)`
                          : `Segar (${daysLeft} hr lagi)`}
                      </span>
                    </div>

                    {/* Batch Details Box */}
                    <div className="p-2.5 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Nomor Batch:</span>
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-[11px]">
                          {b.batchNo}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Tanggal Expire:</span>
                        <span className="font-bold text-slate-900">{b.expireDate}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500">Sisa Stok:</span>
                        <span className="font-black text-slate-900 text-sm">
                          {b.currentQuantity.toLocaleString()} {b.item.baseUnit}
                        </span>
                      </div>
                      {b.notes && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                          <span className="text-slate-400">Catatan:</span>
                          <span className="text-slate-600 italic">{b.notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    {canManage && (
                      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                        <button
                          onClick={() => handleEditBatch(b)}
                          className="flex-1 py-2 px-3 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit Batch</span>
                        </button>
                        <button
                          onClick={() => handleDeleteBatch(b.id, b.batchNo, b.expireDate)}
                          className="py-2 px-3 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* Tab 3: Stock Mutation Logs */}
        {/* ========================================================================= */}
        <TabsContent value="mutations" className="space-y-3 sm:space-y-4">
          {/* Desktop Table View */}
          <Card className="hidden md:block">
            <CardHeader>
              <CardTitle className="text-base">Stock Mutation Audit Trail</CardTitle>
              <CardDescription>
                Full historical log of stock receipts, adjustments, and field sales rep dispatches
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase bg-slate-50/70">
                    <tr>
                      <th className="py-3.5 px-4">Date & Time</th>
                      <th className="py-3.5 px-4">Item (SKU)</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4 text-center">Quantity</th>
                      <th className="py-3.5 px-4">Notes / Reference</th>
                      <th className="py-3.5 px-4">Performed By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mutations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Belum ada mutasi stok tercatat.
                        </td>
                      </tr>
                    ) : (
                      mutations.map((m) => (
                        <tr key={m.id} className="hover:bg-slate-50/80 transition-colors text-xs">
                          <td className="py-3.5 px-4 text-slate-500 font-mono">
                            {m.createdAt ? new Date(m.createdAt).toLocaleString('id-ID') : '-'}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {m.item?.name} ({m.item?.sku})
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant={
                                m.type === 'IN' || m.type === 'RETURN_FROM_SALES'
                                  ? 'success'
                                  : m.type === 'OUT' || m.type === 'ASSIGN_TO_SALES'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                            >
                              {m.type}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold font-mono">
                            <span
                              className={
                                m.quantity > 0
                                  ? 'text-emerald-700'
                                  : m.quantity < 0
                                  ? 'text-rose-700'
                                  : 'text-slate-700'
                              }
                            >
                              {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {m.item?.baseUnit}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{m.notes || '-'}</td>
                          <td className="py-3.5 px-4 text-slate-600 font-medium">
                            {m.user?.name || 'System'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Mobile View for Mutations */}
          <div className="block md:hidden space-y-2.5">
            {mutations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-xs">
                Belum ada riwayat mutasi stok.
              </div>
            ) : (
              mutations.map((m) => (
                <div key={m.id} className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-2xs space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{m.item?.name}</span>
                    <Badge
                      variant={
                        m.type === 'IN' || m.type === 'RETURN_FROM_SALES'
                          ? 'success'
                          : m.type === 'OUT' || m.type === 'ASSIGN_TO_SALES'
                          ? 'destructive'
                          : 'secondary'
                      }
                      className="text-[10px]"
                    >
                      {m.type}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-mono">
                      {m.createdAt ? new Date(m.createdAt).toLocaleString('id-ID') : '-'}
                    </span>
                    <span className={`font-mono font-black text-sm ${
                      m.quantity > 0 ? 'text-emerald-700' : m.quantity < 0 ? 'text-rose-700' : 'text-slate-700'
                    }`}>
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {m.item?.baseUnit}
                    </span>
                  </div>
                  {m.notes && (
                    <p className="text-[11px] text-slate-500 bg-slate-50 p-1.5 rounded-lg">
                      {m.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Stock In Modal (Product Set / Simple Mode) */}
      <QuickStockInModal
        open={isQuickStockOpen}
        onOpenChange={setIsQuickStockOpen}
        items={items}
      />

      {/* Item Modal (Create/Edit) */}
      <ItemModal
        open={isItemModalOpen}
        onOpenChange={setIsItemModalOpen}
        itemToEdit={itemToEdit}
      />

      {/* Stock Adjustment Modal */}
      <StockAdjustmentModal
        open={isAdjustModalOpen}
        onOpenChange={setIsAdjustModalOpen}
        item={itemToAdjust}
      />

      {/* Edit Batch Modal */}
      <EditBatchModal
        open={isEditBatchModalOpen}
        onOpenChange={setIsEditBatchModalOpen}
        batch={batchToEdit}
      />
    </div>
  );
}

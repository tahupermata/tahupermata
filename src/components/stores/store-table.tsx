'use client';

import * as React from 'react';
import { StoreModal } from './store-modal';
import { deleteStoreAction } from '@/app/actions/store-actions';
import { formatRupiah } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import {
  Store,
  Plus,
  Search,
  MapPin,
  Phone,
  User,
  Edit2,
  Trash2,
  ExternalLink,
  Target,
  Eye,
  MessageCircle,
} from 'lucide-react';

interface StoreTableProps {
  stores: Array<{
    id: string;
    code: string;
    name: string;
    ownerName?: string | null;
    phone?: string | null;
    address: string;
    mapUrl?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    targetMonthlySales?: number | null;
    defaultDailyTargetQty?: number | null;
    imageUrl?: string | null;
    status: string;
    assignedSales?: {
      id: string;
      name: string;
    } | null;
    totalOrdersMonth?: number;
  }>;
  salesUsers: Array<{ id: string; name: string }>;
  canManage: boolean;
  currentUser?: any;
  isPrivileged?: boolean;
}

export function StoreTable({ stores, salesUsers, canManage, currentUser, isPrivileged = false }: StoreTableProps) {
  const [search, setSearch] = React.useState('');
  const [selectedRep, setSelectedRep] = React.useState('ALL');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [storeToEdit, setStoreToEdit] = React.useState<any | null>(null);
  const [selectedDetailStore, setSelectedDetailStore] = React.useState<any | null>(null);

  const filteredStores = stores.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase()) ||
      (s.ownerName || '').toLowerCase().includes(search.toLowerCase()) ||
      s.address.toLowerCase().includes(search.toLowerCase());

    const matchesRep = !isPrivileged || selectedRep === 'ALL' || s.assignedSales?.id === selectedRep;

    return matchesSearch && matchesRep;
  });

  const handleCreateNew = () => {
    setStoreToEdit(null);
    setIsModalOpen(true);
  };

  const handleEdit = (store: any) => {
    setSelectedDetailStore(null);
    setStoreToEdit({
      ...store,
      assignedSalesId: store.assignedSales?.id || (!isPrivileged ? currentUser?.id : ''),
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (storeId: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      await deleteStoreAction(storeId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Store className="w-6 h-6 text-indigo-600" />
            <span>Toko & Target Management</span>
          </h2>
          <p className="text-sm text-slate-500">
            {isPrivileged
              ? 'Customer directory, field route assignment, and monthly store sales targets.'
              : `Daftar toko dan pelanggan yang ditugaskan kepada Anda (${currentUser?.name || 'Sales Rep'}).`}
          </p>
        </div>

        {canManage && (
          <Button onClick={handleCreateNew} className="gap-2 shadow-md shadow-indigo-600/20">
            <Plus className="w-4 h-4" />
            <span>Register New Store</span>
          </Button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2.5 w-full sm:w-80 h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search store name, owner, or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-full bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isPrivileged ? (
            <>
              <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Assigned Rep:</span>
              <select
                value={selectedRep}
                onChange={(e) => setSelectedRep(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold text-slate-800"
              >
                <option value="ALL">All Sales Reps</option>
                {salesUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Toko Anda: {filteredStores.length} Toko</span>
            </span>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. MOBILE VIEW: SIMPLE CLEAN CARD LIST (md:hidden)                       */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-3">
        {filteredStores.length === 0 ? (
          <Card className="p-8 text-center text-slate-400 text-sm border-dashed">
            Tidak ada toko yang sesuai pencarian.
          </Card>
        ) : (
          filteredStores.map((s) => {
            const mapHref = s.mapUrl
              ? (s.mapUrl.startsWith('http') ? s.mapUrl : `https://${s.mapUrl}`)
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`;

            const cleanPhone = (s.phone || '').replace(/[^0-9]/g, '');
            const waHref = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

            return (
              <Card key={s.id} className="p-4 bg-white border border-slate-200/80 shadow-2xs rounded-2xl space-y-3">
                {/* Header: Store Name + Quick Action Links */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">{s.name}</h4>
                      <span className="font-mono text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.2 rounded">
                        {s.code}
                      </span>
                    </div>
                    {s.ownerName && (
                      <p className="text-[11px] text-slate-500 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{s.ownerName}</span>
                      </p>
                    )}
                  </div>

                  {/* 2 & 3: Logo Phone (WA) & Logo Map */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {waHref && (
                      <a
                        href={waHref}
                        target="_blank"
                        rel="noreferrer"
                        title="Chat WhatsApp"
                        className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center transition-colors shadow-2xs"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                    <a
                      href={mapHref}
                      target="_blank"
                      rel="noreferrer"
                      title="Buka Google Maps"
                      className="w-9 h-9 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-200 flex items-center justify-center transition-colors shadow-2xs"
                    >
                      <MapPin className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* 4. Alamat */}
                <div className="flex items-start gap-1.5 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2 leading-relaxed">{s.address}</span>
                </div>

                {/* 5. Button View Detail + Edit */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDetailStore(s)}
                    className="flex-1 h-9 text-xs font-bold text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 border-indigo-200/80 rounded-xl cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    <span>View Detail</span>
                  </Button>
                  {canManage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(s)}
                      className="h-9 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      <span>Edit</span>
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. DESKTOP VIEW: FULL TABLE (hidden md:block)                             */}
      {/* ========================================================================= */}
      <Card className="hidden md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase bg-slate-50/70">
                <tr>
                  <th className="py-3.5 px-4">Store Info</th>
                  <th className="py-3.5 px-4">Owner & Contact</th>
                  <th className="py-3.5 px-4">Address & Location</th>
                  <th className="py-3.5 px-4">Assigned Sales Rep</th>
                  <th className="py-3.5 px-4 text-right">Monthly Target</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStores.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                      No stores found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredStores.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors text-xs">
                      {/* Store Name & Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                            {s.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={s.imageUrl}
                                alt={s.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Store className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">{s.name}</h4>
                            <span className="font-mono text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                              {s.code}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Owner & Phone */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{s.ownerName || 'Unknown'}</span>
                          </p>
                          {s.phone && (
                            <a
                              href={`https://wa.me/${s.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-700 hover:underline flex items-center gap-1 text-[11px] font-medium"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{s.phone}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Address & Google Maps Link */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="space-y-1">
                          <div className="flex items-start gap-1 text-slate-700">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="truncate font-medium">{s.address}</span>
                          </div>
                          {s.mapUrl ? (
                            <a
                              href={s.mapUrl.startsWith('http') ? s.mapUrl : `https://${s.mapUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Buka Google Maps</span>
                            </a>
                          ) : (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-600 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Cari di Maps</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Assigned Rep */}
                      <td className="py-3.5 px-4">
                        {s.assignedSales ? (
                          <Badge variant="purple" className="font-bold">
                            {s.assignedSales.name}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400">
                            Unassigned
                          </Badge>
                        )}
                      </td>

                      {/* Target */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="space-y-1">
                          <span className="font-black text-slate-900 block text-xs">
                            {formatRupiah(s.targetMonthlySales || 0)}
                          </span>
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-1.5 py-0.5 rounded-md font-bold inline-flex items-center gap-1">
                              <Target className="w-3 h-3 text-indigo-600" />
                              <span>{s.defaultDailyTargetQty || 0} pcs/hari</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              / bln
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedDetailStore(s)}
                            title="View Detail"
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4 text-indigo-600" />
                          </button>
                          {canManage && (
                            <button
                              onClick={() => handleEdit(s)}
                              title="Edit Store"
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4 text-slate-500" />
                            </button>
                          )}
                          {isPrivileged && (
                            <button
                              onClick={() => handleDelete(s.id, s.name)}
                              title="Delete Store"
                              className="p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

      {/* ========================================================================= */}
      {/* 3. STORE DETAIL MODAL POPUP (Dialog)                                     */}
      {/* ========================================================================= */}
      {selectedDetailStore && (
        <Dialog
          open={Boolean(selectedDetailStore)}
          onOpenChange={(open) => {
            if (!open) setSelectedDetailStore(null);
          }}
          title={selectedDetailStore.name}
          description={`Kode Toko: ${selectedDetailStore.code}`}
          className="max-w-md"
        >
          <div className="space-y-4 text-xs">
            {/* Store Photo if Available */}
            {selectedDetailStore.imageUrl && (
              <div className="w-full h-40 rounded-xl border border-slate-200 overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedDetailStore.imageUrl}
                  alt={selectedDetailStore.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Info Items List */}
            <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              {/* Owner & Phone */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Pemilik Toko</span>
                  <span className="font-semibold text-slate-900">{selectedDetailStore.ownerName || '-'}</span>
                </div>
                {selectedDetailStore.phone && (
                  <a
                    href={`https://wa.me/${selectedDetailStore.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-white" />
                    <span>Chat WA</span>
                  </a>
                )}
              </div>

              {/* Address & Map */}
              <div className="space-y-1.5 border-b border-slate-200/80 pb-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Alamat Lengkap</span>
                <p className="text-slate-800 leading-relaxed">{selectedDetailStore.address}</p>
                <a
                  href={
                    selectedDetailStore.mapUrl
                      ? (selectedDetailStore.mapUrl.startsWith('http') ? selectedDetailStore.mapUrl : `https://${selectedDetailStore.mapUrl}`)
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedDetailStore.address)}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline pt-0.5"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Buka di Google Maps ↗</span>
                </a>
              </div>

              {/* Assigned Sales */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Sales Rep Penanggung Jawab</span>
                  <span className="font-bold text-indigo-900">{selectedDetailStore.assignedSales?.name || 'Unassigned'}</span>
                </div>
              </div>

              {/* Target */}
              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-medium block">Target Kirim Harian</span>
                  <span className="font-black text-slate-900 text-sm">
                    {selectedDetailStore.defaultDailyTargetQty || 0} <span className="text-xs font-normal text-slate-500">Pcs</span>
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-0.5">
                  <span className="text-[10px] text-slate-500 font-medium block">Target Omzet Bulanan</span>
                  <span className="font-black text-slate-900 text-xs">
                    {formatRupiah(selectedDetailStore.targetMonthlySales || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              {canManage && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(selectedDetailStore)}
                  className="text-xs font-semibold gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Data Toko</span>
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSelectedDetailStore(null)}
                className="text-xs font-semibold"
              >
                Tutup
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Store Create/Edit Modal */}
      <StoreModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        salesUsers={salesUsers}
        storeToEdit={storeToEdit}
        currentUser={currentUser}
        isPrivileged={isPrivileged}
      />
    </div>
  );
}

'use client';

import * as React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { createStoreAction, updateStoreAction } from '@/app/actions/store-actions';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Upload, Store, MapPin, User } from 'lucide-react';

interface StoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salesUsers: Array<{ id: string; name: string }>;
  currentUser?: any;
  isPrivileged?: boolean;
  storeToEdit?: {
    id: string;
    code: string;
    name: string;
    ownerName?: string | null;
    phone?: string | null;
    address: string;
    mapUrl?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    assignedSalesId?: string | null;
    targetMonthlySales?: number | null;
    defaultDailyTargetQty?: number | null;
    imageUrl?: string | null;
  } | null;
}

export function StoreModal({
  open,
  onOpenChange,
  salesUsers,
  storeToEdit,
  currentUser,
  isPrivileged = false,
}: StoreModalProps) {
  const [code, setCode] = React.useState('');
  const [name, setName] = React.useState('');
  const [ownerName, setOwnerName] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [mapUrl, setMapUrl] = React.useState('');
  const [assignedSalesId, setAssignedSalesId] = React.useState<string>('');
  const [targetMonthlySales, setTargetMonthlySales] = React.useState<number>(10000000);
  const [defaultDailyTargetQty, setDefaultDailyTargetQty] = React.useState<number>(200);
  const [imageUrl, setImageUrl] = React.useState<string>('');
  const [isUploading, setIsUploading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (storeToEdit) {
      setCode(storeToEdit.code);
      setName(storeToEdit.name);
      setOwnerName(storeToEdit.ownerName || '');
      setPhone(storeToEdit.phone || '');
      setAddress(storeToEdit.address);
      setMapUrl(storeToEdit.mapUrl || '');
      setAssignedSalesId(
        !isPrivileged ? (currentUser?.id || '') : (storeToEdit.assignedSalesId || '')
      );
      setTargetMonthlySales(storeToEdit.targetMonthlySales || 0);
      setDefaultDailyTargetQty(storeToEdit.defaultDailyTargetQty ?? 200);
      setImageUrl(storeToEdit.imageUrl || '');
    } else {
      setCode(`TKO-${Date.now().toString().slice(-4)}`);
      setName('');
      setOwnerName('');
      setPhone('+62');
      setAddress('');
      setMapUrl('');
      setAssignedSalesId(
        !isPrivileged ? (currentUser?.id || '') : (salesUsers[0]?.id || '')
      );
      setTargetMonthlySales(15000000);
      setDefaultDailyTargetQty(200);
      setImageUrl('');
    }
  }, [storeToEdit, open, salesUsers, isPrivileged, currentUser]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await uploadToCloudinary(file, 'stores');
      setImageUrl(res.url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code || !address) return;

    const effectiveAssignedSalesId = isPrivileged
      ? (assignedSalesId || undefined)
      : (currentUser?.id || undefined);

    setIsSubmitting(true);
    try {
      if (storeToEdit) {
        await updateStoreAction(storeToEdit.id, {
          code,
          name,
          ownerName,
          phone,
          address,
          mapUrl: mapUrl.trim() || undefined,
          assignedSalesId: effectiveAssignedSalesId,
          targetMonthlySales,
          defaultDailyTargetQty,
          imageUrl,
        });
      } else {
        await createStoreAction({
          code,
          name,
          ownerName,
          phone,
          address,
          mapUrl: mapUrl.trim() || undefined,
          assignedSalesId: effectiveAssignedSalesId,
          targetMonthlySales,
          defaultDailyTargetQty,
          imageUrl,
        });
      }
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Gagal menyimpan data toko');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={storeToEdit ? 'Edit Toko / Store' : 'Register New Store (Toko)'}
      description="Profil toko, target kirim harian default (pcs), sales penanggung jawab, dan link lokasi Google Maps."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Store Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <div className="sm:col-span-2">
            <Input
              label="Store Name (Nama Toko)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Toko Kelontong Berkah Jaya"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Owner / Contact Name"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="e.g. Haji Ahmad Fauzi"
          />
          <Input
            label="WhatsApp / Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+628123456789"
          />
        </div>

        <Input
          label="Full Address (Alamat Lengkap)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Jl. Palmerah Barat No. 18, Jakarta Barat"
          required
        />

        {/* Google Maps URL Link */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Link Google Maps (URL / Share Link)
            </label>
            {mapUrl && (
              <a
                href={mapUrl.startsWith('http') ? mapUrl : `https://${mapUrl}`}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-indigo-600 hover:underline flex items-center gap-1"
              >
                <MapPin className="w-3 h-3" />
                <span>Test Buka Link</span>
              </a>
            )}
          </div>
          <Input
            value={mapUrl}
            onChange={(e) => setMapUrl(e.target.value)}
            placeholder="https://maps.app.goo.gl/... atau paste link Google Maps toko"
            helperText="Salin & tempel URL share dari Google Maps agar sales rep dapat langsung membuka rute navigasi."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Assigned Sales Rep
            </label>
            {isPrivileged ? (
              <select
                value={assignedSalesId}
                onChange={(e) => setAssignedSalesId(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
              >
                <option value="">-- None (Unassigned) --</option>
                {salesUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="w-full h-10 px-3 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span className="truncate">{currentUser?.name || 'Akun Anda'} (Otomatis)</span>
              </div>
            )}
          </div>

          <Input
            label="Default Target Kirim Harian (Pcs)"
            type="number"
            value={defaultDailyTargetQty}
            onChange={(e) => setDefaultDailyTargetQty(Number(e.target.value))}
            placeholder="e.g. 200"
            helperText="Quota otomatis per hari (bisa diubah)."
          />

          <Input
            label="Target Monthly Sales (Rp)"
            type="number"
            value={targetMonthlySales}
            onChange={(e) => setTargetMonthlySales(Number(e.target.value))}
          />
        </div>

        {/* Store Photo Upload */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Store Front Photo (Cloudinary)
          </label>
          <div className="flex items-center gap-3">
            {imageUrl ? (
              <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden shrink-0 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Store Preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0 bg-slate-50">
                <Store className="w-6 h-6" />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUploading}
              className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : storeToEdit ? 'Save Changes' : 'Register Store'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

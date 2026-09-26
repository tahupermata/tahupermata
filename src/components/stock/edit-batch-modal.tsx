'use client';

import * as React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateBatchAction } from '@/app/actions/stock-actions';
import { Tag, Calendar, Package, AlertCircle } from 'lucide-react';

interface EditBatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: {
    id: string;
    batchNo: string;
    expireDate: string;
    currentQuantity: number;
    notes?: string | null;
    unitName?: string | null;
    item?: {
      name: string;
      sku: string;
      baseUnit: string;
    };
  } | null;
}

export function EditBatchModal({ open, onOpenChange, batch }: EditBatchModalProps) {
  const [batchNo, setBatchNo] = React.useState('');
  const [expireDate, setExpireDate] = React.useState('');
  const [quantity, setQuantity] = React.useState<string>('0');
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (batch && open) {
      setBatchNo(batch.batchNo);
      setExpireDate(batch.expireDate);
      setQuantity(String(batch.currentQuantity));
      setNotes(batch.notes || '');
      setError(null);
    }
  }, [batch, open]);

  if (!batch) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchNo.trim() || !expireDate.trim()) {
      setError('Nomor batch dan tanggal expire wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await updateBatchAction(batch.id, {
        batchNo: batchNo.trim(),
        expireDate: expireDate.trim(),
        currentQuantity: Math.max(0, parseInt(quantity, 10) || 0),
        notes: notes.trim() || undefined,
      });

      if (res.error) {
        setError(res.error);
      } else {
        onOpenChange(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Gagal mengupdate batch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const baseUnit = batch.item?.baseUnit || batch.unitName || 'PCS';

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Batch & Tanggal Expire"
      description={`Koreksi rincian batch untuk ${batch.item?.name || 'Produk'} (${batch.item?.sku || ''})`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Product Info Banner */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-600" />
            <span className="font-bold text-slate-800">{batch.item?.name || 'Item'}</span>
            <span className="font-mono text-slate-500">({batch.item?.sku || '-'})</span>
          </div>
          <span className="font-bold text-slate-600">Satuan: {baseUnit}</span>
        </div>

        {/* Nomor Batch */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>Nama / Nomor Batch</span>
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];
                  const hh = String(now.getHours()).padStart(2, '0');
                  const mm = String(now.getMinutes()).padStart(2, '0');
                  const timeStr = `${hh}${mm}`;
                  if (expireDate) {
                    const parts = expireDate.split('-');
                    if (parts.length === 3) {
                      const yyyy = parts[0];
                      const monthIdx = parseInt(parts[1], 10) - 1;
                      const dd = String(parseInt(parts[2], 10)).padStart(2, '0');
                      const month = months[monthIdx] || 'SEP';
                      setBatchNo(`BATCH-${dd}_${month}_${yyyy}-${timeStr}`);
                      return;
                    }
                  }
                  const dd = String(now.getDate()).padStart(2, '0');
                  const month = months[now.getMonth()];
                  const yyyy = now.getFullYear();
                  setBatchNo(`BATCH-${dd}_${month}_${yyyy}-${timeStr}`);
                }}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
              >
                📅 Format Baru
              </button>
            </div>
          </div>
          <input
            type="text"
            value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)}
            placeholder="e.g. BATCH-25_SEP_2026-1420"
            required
            className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Tanggal Expire */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Tanggal Expire (Expired Date)</span>
          </label>
          <Input
            type="date"
            value={expireDate}
            onChange={(e) => setExpireDate(e.target.value)}
            required
          />
        </div>

        {/* Stok Batch Ini */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
              Stok Batch Ini ({baseUnit})
            </label>
            <span className="text-[11px] text-slate-400">
              Koreksi jika ada selisih fisik
            </span>
          </div>
          <input
            type="text"
            inputMode="numeric"
            value={quantity}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              setQuantity(val);
            }}
            required
            className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm font-black text-right text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Catatan / Keterangan */}
        <Input
          label="Catatan / Shift / Keterangan"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Koreksi stok opname / batch revisi"
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan Batch'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

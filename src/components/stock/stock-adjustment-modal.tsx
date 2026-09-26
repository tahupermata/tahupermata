'use client';

import * as React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { adjustStockAction } from '@/app/actions/stock-actions';
import { ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

interface StockAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: string;
    name: string;
    sku: string;
    baseUnit: string;
    stockWarehouse: number;
  } | null;
}

export function StockAdjustmentModal({ open, onOpenChange, item }: StockAdjustmentModalProps) {
  const [type, setType] = React.useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
  const [quantity, setQuantity] = React.useState<number>(10);
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setQuantity(10);
      setNotes('');
      setType('IN');
    }
  }, [open]);

  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await adjustStockAction({
        itemId: item.id,
        type,
        quantity,
        notes,
      });
      onOpenChange(false);
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
      title="Warehouse Stock Mutation"
      description={`Update warehouse inventory count for ${item.name} (${item.sku})`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Current Stock Banner */}
        <div className="p-3 bg-slate-100 rounded-xl flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">Current Warehouse Stock:</span>
          <span className="text-base font-black text-slate-900">
            {item.stockWarehouse} {item.baseUnit}
          </span>
        </div>

        {/* Mutation Type */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Mutation Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setType('IN')}
              className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                type === 'IN'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-600" /> Stock In
            </button>
            <button
              type="button"
              onClick={() => setType('OUT')}
              className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                type === 'OUT'
                  ? 'bg-rose-50 border-rose-500 text-rose-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ArrowDownRight className="w-4 h-4 text-rose-600" /> Stock Out
            </button>
            <button
              type="button"
              onClick={() => setType('ADJUSTMENT')}
              className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                type === 'ADJUSTMENT'
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <RefreshCw className="w-4 h-4 text-indigo-600" /> Opname
            </button>
          </div>
        </div>

        {/* Quantity */}
        <Input
          label={type === 'ADJUSTMENT' ? `New Total Quantity (${item.baseUnit})` : `Quantity to ${type} (${item.baseUnit})`}
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          required
        />

        {/* Notes */}
        <Input
          label="Reason / Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Restock supplier PO-992, Damaged in transit, Stock opname variance"
          required
        />

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
            {isSubmitting ? 'Saving...' : 'Confirm Mutation'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

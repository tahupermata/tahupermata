'use client';

import * as React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { createItemAction, updateItemAction } from '@/app/actions/stock-actions';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Plus, Trash2, Upload, Sparkles, Layers, Sliders } from 'lucide-react';
import type { DynamicAttribute } from '@/db/schema';

interface ItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemToEdit?: {
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
      id?: string;
      unitName: string;
      conversionRate: number;
      price?: number | null;
      isDefault?: boolean;
    }>;
  } | null;
}

export function ItemModal({ open, onOpenChange, itemToEdit }: ItemModalProps) {
  const [sku, setSku] = React.useState('');
  const [name, setName] = React.useState('');
  const [category, setCategory] = React.useState('General');
  const [baseUnit, setBaseUnit] = React.useState('PCS');
  const [basePrice, setBasePrice] = React.useState<number>(0);
  const [stockWarehouse, setStockWarehouse] = React.useState<number>(0);
  const [imageUrl, setImageUrl] = React.useState<string>('');
  const [isUploading, setIsUploading] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Dynamic EAV attributes state
  const [attributes, setAttributes] = React.useState<DynamicAttribute[]>([]);

  // Multi-tier units state
  const [units, setUnits] = React.useState<
    Array<{ unitName: string; conversionRate: number; price?: number; isDefault?: boolean }>
  >([]);

  React.useEffect(() => {
    if (itemToEdit) {
      setSku(itemToEdit.sku);
      setName(itemToEdit.name);
      setCategory(itemToEdit.category);
      setBaseUnit(itemToEdit.baseUnit);
      setBasePrice(itemToEdit.basePrice);
      setStockWarehouse(itemToEdit.stockWarehouse);
      setImageUrl(itemToEdit.imageUrl || '');
      setAttributes(itemToEdit.dynamicAttributes || []);
      setUnits(
        itemToEdit.units?.map((u) => ({
          unitName: u.unitName,
          conversionRate: u.conversionRate,
          price: u.price || undefined,
          isDefault: u.isDefault,
        })) || []
      );
    } else {
      setSku(`SKU-${Date.now().toString().slice(-5)}`);
      setName('');
      setCategory('General');
      setBaseUnit('PCS');
      setBasePrice(10000);
      setStockWarehouse(100);
      setImageUrl('');
      setAttributes([
        { key: 'brand', label: 'Brand Principal', type: 'text', value: '' },
        { key: 'expired_date', label: 'Expired Date', type: 'date', value: '' },
      ]);
      setUnits([
        { unitName: 'BOX', conversionRate: 24, price: 230000, isDefault: true },
      ]);
    }
  }, [itemToEdit, open]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await uploadToCloudinary(file, 'items');
      setImageUrl(res.url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddAttribute = () => {
    setAttributes([
      ...attributes,
      {
        key: `custom_${Date.now().toString().slice(-4)}`,
        label: 'New Custom Field',
        type: 'text',
        value: '',
      },
    ]);
  };

  const handleRemoveAttribute = (index: number) => {
    setAttributes(attributes.filter((_, i) => i !== index));
  };

  const handleAddUnit = () => {
    setUnits([
      ...units,
      { unitName: 'KARTON', conversionRate: 12, price: basePrice * 12, isDefault: false },
    ]);
  };

  const handleRemoveUnit = (index: number) => {
    setUnits(units.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku) return;

    setIsSubmitting(true);
    try {
      if (itemToEdit) {
        await updateItemAction(itemToEdit.id, {
          sku,
          name,
          category,
          baseUnit,
          basePrice,
          imageUrl,
          dynamicAttributes: attributes,
          units,
        });
      } else {
        await createItemAction({
          sku,
          name,
          category,
          baseUnit,
          basePrice,
          imageUrl,
          stockWarehouse,
          dynamicAttributes: attributes,
          units,
        });
      }
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
      title={itemToEdit ? 'Edit Item & Dynamic Config' : 'Create New Item with Dynamic Attributes'}
      description="Configure multi-tier unit conversions and custom JSON attributes without migrations."
      className="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Attributes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="SKU / Barcode"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            required
          />
          <div className="md:col-span-2">
            <Input
              label="Item Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Indomie Mi Goreng Spesial 85g"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="Instant Noodles">Instant Noodles</option>
            <option value="Beverages / Dairy">Beverages / Dairy</option>
            <option value="Beverages / Tea">Beverages / Tea</option>
            <option value="Coffee & Tea">Coffee & Tea</option>
            <option value="Household & Laundry">Household & Laundry</option>
            <option value="Personal Care">Personal Care</option>
            <option value="Snacks & Biscuits">Snacks & Biscuits</option>
            <option value="General">General</option>
          </Select>

          <Input
            label="Base Unit (Smallest)"
            value={baseUnit}
            onChange={(e) => setBaseUnit(e.target.value.toUpperCase())}
            placeholder="PCS"
            required
          />

          <Input
            label="Base Unit Price (Rp)"
            type="number"
            value={basePrice}
            onChange={(e) => setBasePrice(Number(e.target.value))}
            required
          />
        </div>

        {!itemToEdit && (
          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                Initial Warehouse Stock
              </span>
              <p className="text-xs text-indigo-700">Initial quantity in {baseUnit}</p>
            </div>
            <input
              type="number"
              value={stockWarehouse}
              onChange={(e) => setStockWarehouse(Number(e.target.value))}
              className="w-32 bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-sm font-bold text-right text-slate-800"
            />
          </div>
        )}

        {/* Image Upload / Cloudinary */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
            Product Image (Cloudinary)
          </label>
          <div className="flex items-center gap-4">
            {imageUrl ? (
              <div className="w-16 h-16 rounded-xl border border-slate-200 overflow-hidden shrink-0 bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0 bg-slate-50">
                <Upload className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1 space-y-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isUploading}
                className="text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
              <p className="text-[11px] text-slate-400">
                {isUploading ? 'Uploading image...' : 'Direct image upload with Cloudinary support'}
              </p>
            </div>
          </div>
        </div>

        {/* Section 1: Dynamic Attributes (JSON / EAV) */}
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-purple-100 text-purple-700 flex items-center justify-center">
                <Sliders className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                Dynamic Attributes (JSON EAV)
              </h4>
            </div>
            <button
              type="button"
              onClick={handleAddAttribute}
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Attribute Field
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Add flexible product specifications (e.g. Expired Date, Batch No, Flavor, Storage Temp).
          </p>

          <div className="space-y-2">
            {attributes.map((attr, idx) => (
              <div key={idx} className="flex flex-wrap md:flex-nowrap items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <input
                  type="text"
                  placeholder="Field Label (e.g. Brand)"
                  value={attr.label}
                  onChange={(e) => {
                    const next = [...attributes];
                    next[idx].label = e.target.value;
                    next[idx].key = e.target.value.toLowerCase().replace(/\s+/g, '_');
                    setAttributes(next);
                  }}
                  className="w-full md:w-40 text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-slate-900 font-medium placeholder:text-slate-400"
                />

                <select
                  value={attr.type}
                  onChange={(e) => {
                    const next = [...attributes];
                    next[idx].type = e.target.value as any;
                    setAttributes(next);
                  }}
                  className="text-xs px-2 py-1.5 border border-slate-300 rounded-md bg-white text-slate-900 font-medium"
                >
                  <option value="text">Text</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="boolean">Boolean</option>
                </select>

                <div className="flex-1">
                  {attr.type === 'boolean' ? (
                    <select
                      value={String(attr.value)}
                      onChange={(e) => {
                        const next = [...attributes];
                        next[idx].value = e.target.value === 'true';
                        setAttributes(next);
                      }}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-slate-900 font-medium"
                    >
                      <option value="true">Yes / True</option>
                      <option value="false">No / False</option>
                    </select>
                  ) : (
                    <input
                      type={attr.type === 'number' ? 'number' : attr.type === 'date' ? 'date' : 'text'}
                      placeholder="Value"
                      value={String(attr.value ?? '')}
                      onChange={(e) => {
                        const next = [...attributes];
                        next[idx].value = attr.type === 'number' ? Number(e.target.value) : e.target.value;
                        setAttributes(next);
                      }}
                      className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-slate-900 font-medium placeholder:text-slate-400"
                    />
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveAttribute(idx)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Multi-Tier Unit Conversion System */}
        <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                Multi-Tier Unit Conversions
              </h4>
            </div>
            <button
              type="button"
              onClick={handleAddUnit}
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-800 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add Higher Unit
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Define multi-tier conversion rates relative to the base unit (<strong>1 {baseUnit}</strong>).
          </p>

          <div className="space-y-2">
            {units.map((unit, idx) => (
              <div key={idx} className="flex flex-wrap md:flex-nowrap items-center gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <div className="w-28">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Unit Name</span>
                  <input
                    type="text"
                    placeholder="e.g. BOX"
                    value={unit.unitName}
                    onChange={(e) => {
                      const next = [...units];
                      next[idx].unitName = e.target.value.toUpperCase();
                      setUnits(next);
                    }}
                    className="w-full text-xs font-bold uppercase px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-slate-900 placeholder:text-slate-400"
                  />
                </div>

                <div className="w-36">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Rate (= X {baseUnit})
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={unit.conversionRate}
                    onChange={(e) => {
                      const next = [...units];
                      next[idx].conversionRate = Number(e.target.value);
                      if (!next[idx].price) {
                        next[idx].price = Number(e.target.value) * basePrice;
                      }
                      setUnits(next);
                    }}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-slate-900 font-bold text-right"
                  />
                </div>

                <div className="flex-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Tier Price (Rp)
                  </span>
                  <input
                    type="number"
                    value={unit.price || unit.conversionRate * basePrice}
                    onChange={(e) => {
                      const next = [...units];
                      next[idx].price = Number(e.target.value);
                      setUnits(next);
                    }}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-md bg-white text-emerald-700 font-bold text-right"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveUnit(idx)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md transition-colors self-end mb-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : itemToEdit ? 'Save Changes' : 'Create Item'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

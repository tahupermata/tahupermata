'use client';

import * as React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { updateCompanySettingsAction } from '@/app/actions/company-actions';
import { Building2, Image as ImageIcon, Save, CheckCircle2, AlertCircle, Phone, Mail, MapPin, FileText } from 'lucide-react';

interface CompanySettingsViewProps {
  initialSettings: {
    id: string;
    companyName: string;
    tagline?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    logoUrl?: string | null;
    invoiceFooterNote?: string | null;
  };
}

export function CompanySettingsView({ initialSettings }: CompanySettingsViewProps) {
  const [companyName, setCompanyName] = React.useState(initialSettings.companyName || 'DISTRIBUSI TAHU SUPER');
  const [tagline, setTagline] = React.useState(initialSettings.tagline || '');
  const [address, setAddress] = React.useState(initialSettings.address || '');
  const [phone, setPhone] = React.useState(initialSettings.phone || '');
  const [email, setEmail] = React.useState(initialSettings.email || '');
  const [logoUrl, setLogoUrl] = React.useState(initialSettings.logoUrl || '');
  const [invoiceFooterNote, setInvoiceFooterNote] = React.useState(initialSettings.invoiceFooterNote || '');

  const [isSaving, setIsSaving] = React.useState(false);
  const [statusMsg, setStatusMsg] = React.useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setStatusMsg({ type: 'error', text: 'Nama perusahaan wajib diisi.' });
      return;
    }

    setIsSaving(true);
    setStatusMsg(null);
    try {
      const res = await updateCompanySettingsAction({
        companyName,
        tagline,
        address,
        phone,
        email,
        logoUrl,
        invoiceFooterNote,
      });

      if (res.success) {
        setStatusMsg({ type: 'success', text: 'Pengaturan profil perusahaan & logo berhasil disimpan!' });
      } else {
        setStatusMsg({ type: 'error', text: res.error || 'Gagal menyimpan pengaturan.' });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-indigo-600" />
            <span>Pengaturan Profil Perusahaan & Faktur</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kelola nama perusahaan, logo, kontak, dan catatan kaki yang muncul pada faktur resmi dan kuitansi cetak.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2.5 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Inputs */}
        <div className="lg:col-span-7 space-y-5">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Informasi Utama Bisnis</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Data ini akan menjadi kop surat dan identitas resmi pada faktur A4.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Perusahaan / Bisnis <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. PT DISTRIBUSI TAHU SUPER INDONESIA"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tagline / Deskripsi Usaha</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Pusat Distribusi & Pemasaran Produk Tahu Berkualitas"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>URL Logo Perusahaan (Opsional)</span>
                </label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://domain.com/logo.png atau data:image/..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Masukkan URL gambar logo PNG/JPG transparan. Jika kosong, sistem otomatis menampilkan inisial teks elegan.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>Alamat Lengkap Perusahaan / Gudang</span>
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Jl. Industri Pangan Raya No. 88, Sentra Distribusi Tahu Nusantara"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500" />
                    <span>No. Telepon / WhatsApp</span>
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0812-3456-7890"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>Email Resmi</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. operasional@tahusuper.id"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  <span>Catatan Kaki Faktur (Footer Note)</span>
                </label>
                <input
                  type="text"
                  value={invoiceFooterNote}
                  onChange={(e) => setInvoiceFooterNote(e.target.value)}
                  placeholder="e.g. Dokumen ini merupakan bukti transaksi sah dari PT Distribusi Tahu Super."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={isSaving}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 cursor-pointer flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan Pengaturan...' : 'Simpan Profil Perusahaan'}</span>
          </Button>
        </div>

        {/* Live Preview of Invoice Header */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-slate-200 shadow-sm sticky top-4">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                <span>👁️ Preview Live Kop Faktur</span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Real-time Preview
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-300 bg-white space-y-3 shadow-2xs">
                {/* Header preview */}
                <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt="Logo"
                          className="w-8 h-8 rounded-lg object-contain border border-slate-200"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-indigo-700 text-white flex items-center justify-center font-black text-sm">
                          {companyName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-black text-slate-950 uppercase leading-none">
                          {companyName || 'NAMA PERUSAHAAN'}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {tagline || 'Tagline / Deskripsi Perusahaan'}
                        </p>
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-500 leading-tight pt-1">
                      {address || 'Alamat Perusahaan...'}<br />
                      Telp/WA: {phone || '08xx-xxxx-xxxx'} {email ? `| Email: ${email}` : ''}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white text-[9px] font-black uppercase">
                      FAKTUR RESMI
                    </span>
                    <p className="font-mono text-[10px] font-bold text-slate-800 mt-0.5">INV-20260926-XXXX</p>
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-50 border border-slate-200 text-[10px] text-slate-600 space-y-1">
                  <p className="font-bold text-slate-800">Toko: Toko Contoh Pelanggan</p>
                  <p>Alamat: Jl. Raya No. 123</p>
                  <p>Petugas Sales: Budi Santoso</p>
                </div>

                <div className="border-t border-slate-200 pt-2 text-[9px] text-slate-400 italic">
                  * {invoiceFooterNote || 'Catatan kaki faktur...'}
                </div>
              </div>

              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Otomatis Sinkron</span>
                </p>
                <p className="text-indigo-800/80 leading-relaxed">
                  Perubahan nama perusahaan, kontak, dan logo di halaman ini langsung aktif dan tampil di seluruh surat jalan, faktur cetak PDF A4, struk tanda terima, dan pesan WhatsApp.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}

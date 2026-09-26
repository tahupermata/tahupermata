'use client';

import * as React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatRupiah, formatDate } from '@/lib/utils';
import { MessageCircle, Printer, FileText, Bluetooth, CheckCircle2 } from 'lucide-react';
import { getCompanySettingsAction } from '@/app/actions/company-actions';
import { BluetoothThermalPrinter } from '@/lib/bluetooth-thermal-printer';

interface InvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceData: {
    invoiceNumber: string;
    transactionType?: 'DIRECT_DROP_BILL' | 'DROP_AND_COLLECT_PREV' | 'DROP_ONLY' | 'COLLECT_ONLY';
    storeName: string;
    storePhone?: string | null;
    storeAddress: string;
    salesName: string;
    salesPhone?: string | null;
    items: Array<{
      name: string;
      unitName: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }>;
    returns: Array<{
      name: string;
      unitName: string;
      quantity: number;
      unitPrice?: number;
      subtotal?: number;
      condition: 'GOOD' | 'BROKEN';
      reason?: string;
    }>;
    settledInvoices?: Array<{
      invoiceNumber: string;
      netAmount: number;
      createdAt?: Date | string;
      items?: Array<{
        name: string;
        unitName: string;
        quantity: number;
        unitPrice?: number;
        subtotal?: number;
      }>;
    }>;
    totalAmount: number;
    discountAmount: number;
    netAmount: number;
    collectedAmount?: number;
    paymentMethod: string;
    createdAt?: Date | string;
  } | null;
}

export function InvoiceModal({ open, onOpenChange, invoiceData }: InvoiceModalProps) {
  const [companyProfile, setCompanyProfile] = React.useState({
    companyName: 'DISTRIBUSI TAHU SUPER',
    tagline: 'Pusat Distribusi & Pemasaran Produk Tahu Berkualitas',
    address: 'Jl. Industri Pangan Raya No. 88, Sentra Distribusi Tahu Nusantara',
    phone: '0812-3456-7890',
    email: 'operasional@tahusuper.id',
    logoUrl: null as string | null,
    invoiceFooterNote: 'Dokumen ini merupakan bukti transaksi sah dari PT Distribusi Tahu Super.',
  });

  const [isBluetoothPrinting, setIsBluetoothPrinting] = React.useState(false);
  const [bluetoothStatus, setBluetoothStatus] = React.useState<string | null>(null);
  const [connectedPrinterName, setConnectedPrinterName] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      if (BluetoothThermalPrinter.isConnected()) {
        setConnectedPrinterName(BluetoothThermalPrinter.getConnectedDeviceName());
      }
      getCompanySettingsAction()
        .then((res: any) => {
          if (res) {
            setCompanyProfile({
              companyName: res.companyName || 'DISTRIBUSI TAHU SUPER',
              tagline: res.tagline || 'Pusat Distribusi & Pemasaran Produk Tahu Berkualitas',
              address: res.address || 'Jl. Industri Pangan Raya No. 88, Sentra Distribusi Tahu Nusantara',
              phone: res.phone || '0812-3456-7890',
              email: res.email || 'operasional@tahusuper.id',
              logoUrl: res.logoUrl || null,
              invoiceFooterNote: res.invoiceFooterNote || 'Dokumen ini merupakan bukti transaksi sah dari PT Distribusi Tahu Super.',
            });
          }
        })
        .catch(console.error);
    }
  }, [open]);

  if (!invoiceData) return null;

  // Safe fallback values to prevent any runtime crash
  const safeStoreName = invoiceData.storeName || 'Toko';
  const safeStoreAddress = invoiceData.storeAddress || '-';
  const safeStorePhone = invoiceData.storePhone || null;
  const safeSalesName = invoiceData.salesName || 'Sales Rep';
  const safeInvoiceNumber = invoiceData.invoiceNumber || 'INV-000000';
  const safeCompanyName = companyProfile?.companyName || 'DISTRIBUSI TAHU SUPER';
  const safeTagline = companyProfile?.tagline || 'Pusat Distribusi & Pemasaran Produk Tahu Berkualitas';
  const safeAddress = companyProfile?.address || 'Jl. Industri Pangan Raya No. 88, Sentra Distribusi Tahu Nusantara';
  const safePhone = companyProfile?.phone || '0812-3456-7890';
  const safeEmail = companyProfile?.email || 'operasional@tahusuper.id';
  const safeFooterNote = companyProfile?.invoiceFooterNote || 'Dokumen ini merupakan bukti transaksi sah dari PT Distribusi Tahu Super.';

  const modeTitle =
    invoiceData.transactionType === 'DROP_AND_COLLECT_PREV'
      ? 'SURAT TITIP TAHU + BUKTI PELUNASAN'
      : invoiceData.transactionType === 'DROP_ONLY'
      ? 'SURAT JALAN & TITIP TAHU (TEMPO)'
      : invoiceData.transactionType === 'COLLECT_ONLY'
      ? 'KUITANSI PELUNASAN NOTA SEBELUMNYA'
      : 'FAKTUR PENJUALAN & PENGIRIMAN TAHU';

  const collectedAmt = invoiceData.collectedAmount !== undefined ? invoiceData.collectedAmount : (invoiceData.netAmount || 0);
  const totalReturnAmount =
    invoiceData.returns?.reduce((acc, r) => {
      const sub = r.subtotal || (r.unitPrice ? r.unitPrice * r.quantity : (r.quantity ? r.quantity * 200 : 0));
      return acc + sub;
    }, 0) || 0;

  // Determine section existence and detailed transaction statuses
  const hasDeliveredItems = Boolean(invoiceData.items && invoiceData.items.length > 0);
  const isTodayDeliveryTempo =
    invoiceData.transactionType === 'DROP_ONLY' ||
    invoiceData.transactionType === 'DROP_AND_COLLECT_PREV' ||
    invoiceData.paymentMethod === 'TEMPO';
  const isTodayPaid = !isTodayDeliveryTempo && (invoiceData.netAmount > 0);
  const hasSettledInvoices = Boolean(invoiceData.settledInvoices && invoiceData.settledInvoices.length > 0);
  const hasPaymentCollection = isTodayPaid || hasSettledInvoices || collectedAmt > 0;
  const hasReturns = Boolean(invoiceData.returns && invoiceData.returns.length > 0);

  // Status labels for clear distinction between goods delivery and payment receipt
  const deliveryStatusText = !hasDeliveredItems
    ? '— (Tanpa Kiriman Baru)'
    : isTodayDeliveryTempo
    ? '⏳ TEMPO (Belum Lunas)'
    : `✅ LUNAS (${invoiceData.paymentMethod || 'TUNAI'})`;

  const paymentCollectionStatusText = collectedAmt > 0
    ? `✅ DITERIMA (${formatRupiah(collectedAmt)})`
    : '⏳ NIHIL (Tanpa Bayar)';

  // Dynamically calculate sequential section numbering letters (A, B, C...)
  let sectionIndex = 0;
  const alphabet = ['A', 'B', 'C', 'D', 'E'];

  const deliveredSectionLetter = hasDeliveredItems ? alphabet[sectionIndex++] : '';
  const paymentSectionLetter = hasPaymentCollection ? alphabet[sectionIndex++] : '';
  const returnsSectionLetter = hasReturns ? alphabet[sectionIndex++] : '';

  // Build formatted WhatsApp message
  const rawPhone = (safeStorePhone || '').replace(/[^0-9]/g, '');
  const cleanPhone = rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : rawPhone;

  const itemsListText = hasDeliveredItems && invoiceData.items
    ? invoiceData.items
        .map(
          (it) =>
            `• ${it.name}: ${it.quantity} ${it.unitName} @ ${formatRupiah(it.unitPrice)} = ${formatRupiah(it.subtotal)}`
        )
        .join('\n')
    : '• (Tidak ada pengiriman barang baru hari ini)';

  let paymentListText = '';
  if (hasPaymentCollection) {
    const lines: string[] = [];
    const showTodayDeliveryPayment =
      hasDeliveredItems &&
      Boolean(invoiceData.items && invoiceData.items.length > 0) &&
      (isTodayPaid || (invoiceData.transactionType === 'DIRECT_DROP_BILL' && !hasSettledInvoices));

    if (showTodayDeliveryPayment) {
      if (totalReturnAmount > 0) {
        const grossToday = invoiceData.totalAmount || (invoiceData.netAmount + totalReturnAmount + (invoiceData.discountAmount || 0));
        lines.push(`• *Nilai Kiriman Hari Ini:* ${formatRupiah(grossToday)}`);
      } else {
        lines.push(`• *Pembayaran Kiriman Hari Ini:* ${formatRupiah(invoiceData.netAmount)} *(LUNAS - ${invoiceData.paymentMethod || 'TUNAI'})*`);
      }
    }

    if (hasSettledInvoices && invoiceData.settledInvoices && invoiceData.settledInvoices.length > 0) {
      invoiceData.settledInvoices.forEach((s) => {
        const dateStr = s.createdAt ? ` (${formatDate(s.createdAt)})` : '';
        const itemsBreakdown =
          s.items && s.items.length > 0
            ? '\n' +
              s.items
                .map(
                  (it) =>
                    `   ↳ ${it.name}: ${it.quantity} ${it.unitName} @ ${formatRupiah(it.unitPrice || 0)} = ${formatRupiah(it.subtotal || 0)}`
                )
                .join('\n')
            : '';
        lines.push(`• *Pelunasan Nota (${s.invoiceNumber})*${dateStr} = ${formatRupiah(s.netAmount)} *(LUNAS)*${itemsBreakdown}`);
      });
    } else if (!showTodayDeliveryPayment && (collectedAmt > 0 || (totalReturnAmount > 0 && !isTodayPaid))) {
      const grossSettled = collectedAmt + totalReturnAmount;
      lines.push(`• *Pelunasan Tagihan / Nota:* ${formatRupiah(grossSettled)} *(DITAGIH)*`);
    }

    if (totalReturnAmount > 0) {
      lines.push(`• *(-) Potongan Retur Toko:* -${formatRupiah(totalReturnAmount)} *(POTONG TAGIHAN)*`);
      lines.push(`• *Total Bersih Diterima Hari Ini:* ${formatRupiah(collectedAmt)} *(LUNAS - ${invoiceData.paymentMethod || 'TUNAI'})*`);
    }
    paymentListText = `\n\n*${paymentSectionLetter}. Rincian Penerimaan Pembayaran / Tagihan:*\n` + lines.join('\n');
  }

  const returnsText = hasReturns && invoiceData.returns
    ? `\n\n*${returnsSectionLetter}. Pengembalian (Retur Toko):*\n` +
      invoiceData.returns
        .map(
          (r) =>
            `• [${r.condition === 'GOOD' ? 'Baik' : 'Rusak'}] ${r.name} (${r.quantity} ${r.unitName}${r.subtotal ? ` @ ${formatRupiah(r.unitPrice || 0)} = -${formatRupiah(r.subtotal)}` : ''}) - Alasan: ${r.reason || '-'}`
        )
        .join('\n') +
      (totalReturnAmount > 0 ? `\n*Total Potongan Retur:* -${formatRupiah(totalReturnAmount)}` : '')
    : '';

  const waMessage = encodeURIComponent(
    `*${modeTitle}*\n` +
      `*No. Transaksi:* ${safeInvoiceNumber}\n` +
      `----------------------------------------\n` +
      `*Perusahaan:* ${safeCompanyName}\n` +
      `*Toko:* ${safeStoreName}\n` +
      `*Sales Rep:* ${safeSalesName}\n` +
      `*Tanggal:* ${formatDate(invoiceData.createdAt || new Date())}\n\n` +
      (hasDeliveredItems
        ? `*${deliveredSectionLetter}. Rincian Barang Diturunkan Hari Ini (${isTodayDeliveryTempo ? 'TEMPO' : 'LUNAS'}):*\n${itemsListText}\n`
        : '') +
      `${paymentListText}` +
      `${returnsText}\n\n` +
      `----------------------------------------\n` +
      (hasDeliveredItems ? `*Nilai Barang Kiriman Hari Ini:* ${formatRupiah(invoiceData.totalAmount - (invoiceData.discountAmount || 0))} (${isTodayDeliveryTempo ? 'TEMPO' : 'LUNAS'})\n` : '') +
      `*TOTAL UANG DITERIMA HARI INI:* ${formatRupiah(collectedAmt)}\n` +
      (collectedAmt > 0 ? `*Metode Pembayaran:* ${invoiceData.paymentMethod || 'TUNAI'}\n` : '') +
      `----------------------------------------\n` +
      `Terima kasih telah bermitra dengan ${safeCompanyName}!`
  );

  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${waMessage}`
    : `https://api.whatsapp.com/send?text=${waMessage}`;

  // 1-Click Print via Android Bluetooth Print App (mate.bluetoothprint)
  const handlePrintViaApp = () => {
    if (typeof window !== 'undefined') {
      const responseUrl = `${window.location.origin}/api/print/invoice?invoiceNumber=${encodeURIComponent(safeInvoiceNumber)}`;
      window.location.href = `my.bluetoothprint.scheme://${responseUrl}`;
    }
  };

  // Direct Web Bluetooth ESC/POS Printing
  const handleDirectBluetoothPrint = async () => {
    if (!BluetoothThermalPrinter.isSupported()) {
      handlePrintThermal();
      return;
    }

    setIsBluetoothPrinting(true);
    setBluetoothStatus('Mencari & menghubungkan printer Bluetooth...');
    try {
      const payloadBytes = BluetoothThermalPrinter.buildReceipt({
        companyName: safeCompanyName,
        companyAddress: safeAddress,
        companyPhone: safePhone,
        invoiceNumber: safeInvoiceNumber,
        dateStr: formatDate(invoiceData.createdAt || new Date()),
        storeName: safeStoreName,
        salesName: safeSalesName,
        paymentMethod: invoiceData.paymentMethod || 'TUNAI',
        items: invoiceData.items,
        discountAmount: invoiceData.discountAmount,
        totalAmount: invoiceData.totalAmount,
        settledInvoices: invoiceData.settledInvoices?.map((s) => ({
          invoiceNumber: s.invoiceNumber,
          netAmount: s.netAmount,
        })),
        returns: invoiceData.returns?.map((r) => ({
          name: r.name,
          quantity: r.quantity,
          unitName: r.unitName,
          subtotal: r.subtotal,
          reason: r.reason,
        })),
        collectedAmount: collectedAmt,
        footerNote: safeFooterNote,
        paperWidthChars: 32,
      });

      setBluetoothStatus('Mengirim data struk...');
      await BluetoothThermalPrinter.printRaw(payloadBytes);
      const name = BluetoothThermalPrinter.getConnectedDeviceName() || 'Printer';
      setConnectedPrinterName(name);
      setBluetoothStatus(`✅ Struk berhasil dicetak ke ${name}!`);
      setTimeout(() => setBluetoothStatus(null), 4000);
    } catch (err: any) {
      console.warn('Bluetooth print skipped/failed:', err);
      if (err?.name !== 'NotFoundError') {
        handlePrintThermal();
      }
      setBluetoothStatus(null);
    } finally {
      setIsBluetoothPrinting(false);
    }
  };

  const handleConnectPrinter = async () => {
    try {
      setIsBluetoothPrinting(true);
      const res = await BluetoothThermalPrinter.connect();
      setConnectedPrinterName(res.name);
      setBluetoothStatus(`✅ Terhubung ke ${res.name}`);
      setTimeout(() => setBluetoothStatus(null), 3000);
    } catch (e: any) {
      console.warn(e);
    } finally {
      setIsBluetoothPrinting(false);
    }
  };

  // Standard Web Thermal Print Preview Mechanism (58mm roll)
  const handlePrintThermal = () => {
    let printFrame = document.getElementById('thermal-print-frame') as HTMLIFrameElement;
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'thermal-print-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (!frameDoc) {
      window.print();
      return;
    }

    // Build thermal sections
    let itemsThermal = '';
    if (hasDeliveredItems && invoiceData.items && invoiceData.items.length > 0) {
      itemsThermal = `
        <div class="bold uppercase section-title">${deliveredSectionLetter}. Kiriman Barang (${isTodayDeliveryTempo ? 'TEMPO' : 'LUNAS'})</div>
        ${invoiceData.items
          .map(
            (it) => `
          <div style="margin-top:2px;">
            <div>${it.name}</div>
            <div class="row">
              <span>${it.quantity} ${it.unitName} x ${formatRupiah(it.unitPrice)}</span>
              <span class="bold">${formatRupiah(it.subtotal)}</span>
            </div>
          </div>
        `
          )
          .join('')}
        ${
          invoiceData.discountAmount && invoiceData.discountAmount > 0
            ? `
          <div class="row" style="margin-top:2px;">
            <span>(-) Diskon:</span>
            <span>-${formatRupiah(invoiceData.discountAmount)}</span>
          </div>
        `
            : ''
        }
        <div class="row bold" style="margin-top:3px; border-top: 1px dotted #000; padding-top:2px;">
          <span>Total Kiriman Hari Ini:</span>
          <span>${formatRupiah(invoiceData.totalAmount - (invoiceData.discountAmount || 0))}</span>
        </div>
        <div class="dashed"></div>
      `;
    }

    let paymentThermal = '';
    if (hasPaymentCollection) {
      const showTodayDeliveryPayment =
        hasDeliveredItems &&
        Boolean(invoiceData.items && invoiceData.items.length > 0) &&
        (isTodayPaid || (invoiceData.transactionType === 'DIRECT_DROP_BILL' && !hasSettledInvoices));

      const grossToday =
        totalReturnAmount > 0
          ? invoiceData.totalAmount || (invoiceData.netAmount + totalReturnAmount + (invoiceData.discountAmount || 0))
          : invoiceData.netAmount;

      const grossSettled = collectedAmt + totalReturnAmount;

      paymentThermal = `
        <div class="bold uppercase section-title">${paymentSectionLetter}. Penerimaan Pembayaran / Tagihan</div>
        ${
          showTodayDeliveryPayment
            ? `
          <div class="row" style="margin-top:2px;">
            <span>1. Kiriman Hari Ini:</span>
            <span class="bold">${formatRupiah(grossToday)}</span>
          </div>
        `
            : ''
        }
        ${
          hasSettledInvoices && invoiceData.settledInvoices && invoiceData.settledInvoices.length > 0
            ? invoiceData.settledInvoices
                .map(
                  (s, idx) => `
            <div class="row" style="margin-top:2px;">
              <span>${(showTodayDeliveryPayment ? 1 : 0) + idx + 1}. Nota (${s.invoiceNumber}):</span>
              <span class="bold">${formatRupiah(s.netAmount)}</span>
            </div>
          `
                )
                .join('')
            : !showTodayDeliveryPayment && (collectedAmt > 0 || (totalReturnAmount > 0 && !isTodayPaid))
            ? `
            <div class="row" style="margin-top:2px;">
              <span>1. Pelunasan Nota:</span>
              <span class="bold">${formatRupiah(grossSettled)}</span>
            </div>
          `
            : ''
        }
        ${
          totalReturnAmount > 0
            ? `
          <div class="row" style="margin-top:2px;">
            <span>(-) Potongan Retur Toko:</span>
            <span class="bold">-${formatRupiah(totalReturnAmount)}</span>
          </div>
        `
            : ''
        }
        <div class="row bold" style="margin-top:3px; border-top: 1px dotted #000; padding-top:2px;">
          <span>Total Diterima Hari Ini:</span>
          <span>${formatRupiah(collectedAmt)}</span>
        </div>
        <div class="dashed"></div>
      `;
    }

    let returnsThermal = '';
    if (hasReturns && invoiceData.returns && invoiceData.returns.length > 0) {
      returnsThermal = `
        <div class="bold uppercase section-title">${returnsSectionLetter}. Retur Barang (Fisik)</div>
        ${invoiceData.returns
          .map(
            (r) => `
          <div style="margin-top:2px;">
            <div class="row">
              <span>[${r.condition === 'GOOD' ? 'Baik' : 'Rusak'}] ${r.name} (${r.quantity} ${r.unitName})</span>
              ${r.subtotal ? `<span class="bold">-${formatRupiah(r.subtotal)}</span>` : ''}
            </div>
            ${r.reason ? `<div style="font-size: 8.5px; color: #333;">Ket: ${r.reason}</div>` : ''}
          </div>
        `
          )
          .join('')}
        ${
          totalReturnAmount > 0
            ? `
          <div class="row bold" style="margin-top:2px; border-top: 1px dotted #000; padding-top:2px;">
            <span>Total Potongan Retur:</span>
            <span>-${formatRupiah(totalReturnAmount)}</span>
          </div>
        `
            : ''
        }
        <div class="dashed"></div>
      `;
    }

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Struk - ${safeInvoiceNumber}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            @page {
              margin: 0;
              size: auto;
            }
            body {
              font-family: 'Courier New', Courier, monospace, monospace;
              font-size: 9.5px;
              line-height: 1.25;
              color: #000;
              background: #fff;
              width: 100%;
              max-width: 58mm;
              margin: 0 auto;
              padding: 4px 6px;
              box-sizing: border-box;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .dashed { border-top: 1px dashed #000; margin: 4px 0; }
            .double-dashed { border-top: 1px double #000; margin: 4px 0; }
            .row { display: flex; justify-content: space-between; gap: 4px; }
            .section-title { font-size: 9px; margin-top: 3px; margin-bottom: 2px; }
            .grand-total-box {
              border-top: 1.5px solid #000;
              border-bottom: 1.5px solid #000;
              padding: 3px 0;
              margin: 5px 0;
              text-align: center;
            }
            .grand-total-amount { font-size: 13px; font-weight: 900; }
            .company-title { font-size: 11px; font-weight: 900; text-transform: uppercase; }
            .sign-grid {
              display: flex;
              justify-content: space-between;
              margin-top: 10px;
              font-size: 8.5px;
              text-align: center;
            }
            .sign-box { width: 45%; }
            .sign-line { border-bottom: 1px solid #000; margin-top: 25px; margin-bottom: 2px; }
          </style>
        </head>
        <body onload="window.focus();">
          <div class="center">
            <div class="company-title">${safeCompanyName}</div>
            <div style="font-size: 8.5px; margin-top: 1px;">${safeAddress}</div>
            <div style="font-size: 8.5px;">Telp: ${safePhone}</div>
          </div>
          <div class="double-dashed"></div>

          <div style="font-size: 9px;">
            <div class="row">
              <span>No. Nota:</span>
              <span class="bold">${safeInvoiceNumber}</span>
            </div>
            <div class="row">
              <span>Tanggal:</span>
              <span>${formatDate(invoiceData.createdAt || new Date())}</span>
            </div>
            <div class="row">
              <span>Toko:</span>
              <span class="bold">${safeStoreName}</span>
            </div>
            <div class="row">
              <span>Sales:</span>
              <span>${safeSalesName}</span>
            </div>
            <div class="row">
              <span>Metode:</span>
              <span class="bold uppercase">${collectedAmt > 0 ? (invoiceData.paymentMethod || 'TUNAI') : 'TEMPO'}</span>
            </div>
          </div>
          <div class="dashed"></div>

          ${itemsThermal}
          ${paymentThermal}
          ${returnsThermal}

          <div class="grand-total-box">
            <div style="font-size: 8.5px; text-transform: uppercase;">TOTAL UANG DITERIMA</div>
            <div class="grand-total-amount">${formatRupiah(collectedAmt)}</div>
            <div style="font-size: 8.5px; font-weight: 700; margin-top: 1px;">
              ${collectedAmt > 0 ? `LUNAS (${invoiceData.paymentMethod || 'TUNAI'})` : 'TEMPO (NIHIL)'}
            </div>
          </div>

          <div class="sign-grid">
            <div class="sign-box">
              <div>Penerima / Toko</div>
              <div class="sign-line"></div>
              <div>( ${safeStoreName.slice(0, 15)} )</div>
            </div>
            <div class="sign-box">
              <div>Petugas Sales</div>
              <div class="sign-line"></div>
              <div>( ${safeSalesName.slice(0, 15)} )</div>
            </div>
          </div>

          <div class="center" style="margin-top: 8px; font-size: 8px; color: #444;">
            <div>* ${safeFooterNote}</div>
            <div style="margin-top: 2px;">Terima kasih atas kerja samanya!</div>
          </div>
        </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
    }, 400);
  };

  // Full A4 Corporate Invoice Print Mechanism
  const handlePrintA4 = () => {
    const invoiceEl = document.getElementById('printable-invoice');
    if (!invoiceEl) {
      window.print();
      return;
    }

    let printFrame = document.getElementById('invoice-print-frame') as HTMLIFrameElement;
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'invoice-print-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (!frameDoc) {
      window.print();
      return;
    }

    // Capture all existing application CSS and Tailwind stylesheets for 100% exact rendering
    const appStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join('\n');

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${safeInvoiceNumber} - ${safeStoreName}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          ${appStyles}
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 14mm;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              background: #ffffff !important;
              color: #0f172a !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            }
            .page-break-avoid {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            table {
              border-collapse: collapse !important;
              width: 100% !important;
            }
          </style>
        </head>
        <body class="bg-white text-slate-900 text-xs">
          <div style="width: 100%; max-width: 100%; box-sizing: border-box; padding: 2px;">
            ${invoiceEl.innerHTML}
          </div>
        </body>
      </html>
    `);
    frameDoc.close();

    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
    }, 400);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title="Faktur Transaksi & Bagikan Nota"
        description="Faktur resmi berhasil diterbitkan dan tersimpan rapi ke sistem."
        className="max-w-3xl"
      >
        <div className="space-y-4">
          {/* ========================================================================= */}
          {/* PRINTABLE CORPORATE INVOICE                                               */}
          {/* ========================================================================= */}
          <div
            id="printable-invoice"
            className="p-6 sm:p-8 rounded-xl border border-slate-300 bg-white text-slate-900 space-y-6 shadow-sm print:p-0 print:border-0 print:shadow-none"
          >
            {/* 1. Formal Corporate Header */}
            <div className="border-b-2 border-slate-800 pb-4 mb-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                {/* Company Branding */}
                <div className="flex items-start gap-3.5">
                  {companyProfile.logoUrl ? (
                    <img
                      src={companyProfile.logoUrl}
                      alt="Logo"
                      className="w-12 h-12 rounded-lg object-contain border border-slate-200 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-lg tracking-wider shrink-0 shadow-sm">
                      {safeCompanyName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 uppercase leading-snug">
                      {safeCompanyName}
                    </h1>
                    <p className="text-xs text-slate-600 font-medium leading-none">
                      {safeTagline}
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed pt-0.5">
                      {safeAddress}
                    </p>
                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 pt-0.5">
                      <span className="whitespace-nowrap">
                        Telp/WA: <strong className="text-slate-700 font-semibold">{safePhone}</strong>
                      </span>
                      {safeEmail && (
                        <>
                          <span className="text-slate-300 hidden sm:inline">|</span>
                          <span className="whitespace-nowrap">
                            Email: <strong className="text-slate-700 font-semibold">{safeEmail}</strong>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Invoice Document Header Info */}
                <div className="sm:text-right shrink-0 flex flex-col sm:items-end justify-between self-stretch pt-1 sm:pt-0">
                  <div>
                    <div className="inline-block px-3 py-1 rounded bg-slate-100 text-slate-900 border border-slate-300 font-bold text-xs uppercase tracking-wider">
                      {modeTitle}
                    </div>
                    <div className="mt-2.5 space-y-0.5">
                      <div className="text-[11px] text-slate-500">
                        No. Faktur: <span className="font-mono font-bold text-slate-900 text-xs">{safeInvoiceNumber}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Tanggal: <span className="font-semibold text-slate-800">{formatDate(invoiceData.createdAt || new Date())}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Customer & Transaction Meta Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mt-5">
              {/* Customer Info */}
              <div className="rounded-lg border border-slate-200 p-3.5 bg-slate-50/60 space-y-1.5">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-200 pb-1 flex items-center justify-between">
                  <span>Tujuan Pengantaran / Toko</span>
                  <span className="text-[10px] font-normal lowercase text-slate-400">customer</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{safeStoreName}</h3>
                  <p className="text-slate-600 text-[11px] leading-relaxed mt-0.5">{safeStoreAddress}</p>
                  {safeStorePhone && (
                    <p className="text-[11px] text-slate-600 mt-1">
                      No. Telp / WA: <span className="font-semibold text-slate-800">{safeStorePhone}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Delivery & Payment Meta */}
              <div className="rounded-lg border border-slate-200 p-3.5 bg-slate-50/60 space-y-1.5">
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-200 pb-1 flex items-center justify-between">
                  <span>Informasi Pengiriman & Penagihan</span>
                  <span className="text-[10px] font-normal lowercase text-slate-400">delivery info</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] pt-0.5">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Petugas Sales:</span>
                    <span className="font-semibold text-slate-800">{safeSalesName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Metode Bayar:</span>
                    <span className="font-bold text-slate-900 uppercase">
                      {collectedAmt > 0 ? (invoiceData.paymentMethod || 'TUNAI') : 'TEMPO'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Status Kiriman:</span>
                    <span className={`font-semibold ${
                      isTodayDeliveryTempo ? 'text-amber-700' : hasDeliveredItems ? 'text-emerald-700' : 'text-slate-600'
                    }`}>
                      {hasDeliveredItems ? (isTodayDeliveryTempo ? 'Titip / Tempo' : 'Lunas') : 'Tanpa Kiriman'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Penerimaan Kas:</span>
                    <span className={`font-semibold ${collectedAmt > 0 ? 'text-emerald-700' : 'text-slate-600'}`}>
                      {collectedAmt > 0 ? `Diterima (${formatRupiah(collectedAmt)})` : 'Nihil (Rp 0)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Main Table: Delivered Items */}
            {hasDeliveredItems && invoiceData.items && invoiceData.items.length > 0 && (
              <div className="space-y-2.5 pt-2 page-break-avoid">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[9px] font-bold flex items-center justify-center">
                      {deliveredSectionLetter}
                    </span>
                    <span className="text-xs font-bold uppercase text-slate-900 tracking-wide">
                      Rincian Barang Diturunkan Hari Ini
                    </span>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                    isTodayDeliveryTempo
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    {isTodayDeliveryTempo ? 'Status: Tagihan Tempo' : `Status: Lunas (${invoiceData.paymentMethod || 'TUNAI'})`}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 font-bold text-[10px] uppercase tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-3 text-center w-10 text-slate-400">NO</th>
                        <th className="py-2.5 px-3">NAMA PRODUK</th>
                        <th className="py-2.5 px-3 text-center w-20">JUMLAH</th>
                        <th className="py-2.5 px-3 text-center w-16">SATUAN</th>
                        <th className="py-2.5 px-3 text-right w-28">HARGA SATUAN</th>
                        <th className="py-2.5 px-3 text-right w-32">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoiceData.items.map((it, idx) => (
                        <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}>
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{it.name}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-800">{it.quantity}</td>
                          <td className="py-2.5 px-3 text-center text-slate-600">{it.unitName}</td>
                          <td className="py-2.5 px-3 text-right text-slate-700 font-mono">{formatRupiah(it.unitPrice)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">{formatRupiah(it.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-slate-200 bg-slate-50/80 font-semibold text-slate-800">
                      {Boolean(invoiceData.discountAmount && invoiceData.discountAmount > 0) && (
                        <>
                          <tr className="border-b border-slate-100">
                            <td colSpan={5} className="py-2 px-3 text-right text-slate-500 font-normal text-[11px]">
                              Subtotal Nilai Barang:
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-800">
                              {formatRupiah(invoiceData.totalAmount)}
                            </td>
                          </tr>
                          <tr className="border-b border-slate-100">
                            <td colSpan={5} className="py-2 px-3 text-right text-rose-600 font-normal text-[11px]">
                              (-) Diskon Khusus:
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-rose-600 font-bold">
                              -{formatRupiah(invoiceData.discountAmount)}
                            </td>
                          </tr>
                        </>
                      )}
                      <tr>
                        <td colSpan={5} className="py-2.5 px-3 text-right text-slate-900 text-xs uppercase font-bold">
                          Total Nilai Barang ({isTodayDeliveryTempo ? 'Tagihan Tempo' : 'Lunas'}):
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono text-xs">
                          {formatRupiah(invoiceData.totalAmount - (invoiceData.discountAmount || 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* 4. Payment Collection Breakdown Table */}
            {hasPaymentCollection && (
              <div className="space-y-2.5 pt-2 page-break-avoid">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[9px] font-bold flex items-center justify-center">
                      {paymentSectionLetter}
                    </span>
                    <span className="text-xs font-bold uppercase text-slate-900 tracking-wide">
                      Rincian Penerimaan Pembayaran / Tagihan Hari Ini
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-emerald-50 text-emerald-800 border-emerald-200">
                    Kas Diterima: {formatRupiah(collectedAmt)}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 font-bold text-[10px] uppercase tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-3 text-center w-10 text-slate-400">NO</th>
                        <th className="py-2.5 px-3 w-44">DOKUMEN / SUMBER</th>
                        <th className="py-2.5 px-3 w-28">TANGGAL</th>
                        <th className="py-2.5 px-3">RINCIAN / CATATAN</th>
                        <th className="py-2.5 px-3 text-right w-28">NOMINAL</th>
                        <th className="py-2.5 px-3 text-center w-24">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(() => {
                        let rowIdx = 0;
                        const rows = [];

                        // 1. Kiriman Hari Ini
                        const showTodayDeliveryPayment =
                          hasDeliveredItems &&
                          Boolean(invoiceData.items && invoiceData.items.length > 0) &&
                          (isTodayPaid || (invoiceData.transactionType === 'DIRECT_DROP_BILL' && !hasSettledInvoices));

                        if (showTodayDeliveryPayment) {
                          rowIdx++;
                          const grossVal =
                            totalReturnAmount > 0
                              ? invoiceData.totalAmount || (invoiceData.netAmount + totalReturnAmount + (invoiceData.discountAmount || 0))
                              : invoiceData.netAmount;

                          rows.push(
                            <tr key="today-delivery" className="bg-white">
                              <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{rowIdx}</td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">
                                <div>Kiriman Hari Ini</div>
                                <div className="font-mono text-[10px] text-slate-500">{safeInvoiceNumber}</div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                                {formatDate(invoiceData.createdAt || new Date())}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                                {invoiceData.items?.map((it) => `${it.name} (${it.quantity} ${it.unitName})`).join(', ')}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                                {formatRupiah(grossVal)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {totalReturnAmount > 0 ? 'Ditagih' : `Lunas (${invoiceData.paymentMethod || 'TUNAI'})`}
                                </span>
                              </td>
                            </tr>
                          );
                        }

                        // 2. Settled Invoices
                        if (hasSettledInvoices && invoiceData.settledInvoices && invoiceData.settledInvoices.length > 0) {
                          invoiceData.settledInvoices.forEach((s, idx) => {
                            rowIdx++;
                            rows.push(
                              <tr key={`settled-${idx}`} className="bg-white">
                                <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{rowIdx}</td>
                                <td className="py-2.5 px-3 font-semibold text-slate-900">
                                  <div>Pelunasan Nota</div>
                                  <div className="font-mono text-[10px] text-slate-500">{s.invoiceNumber}</div>
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                                  {s.createdAt ? formatDate(s.createdAt) : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                                  {s.items && s.items.length > 0
                                    ? s.items.map((it) => `${it.name} (${it.quantity} ${it.unitName})`).join(', ')
                                    : 'Pelunasan piutang tempo'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                                  {formatRupiah(s.netAmount)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    {totalReturnAmount > 0 ? 'Ditagih' : 'Lunas'}
                                  </span>
                                </td>
                              </tr>
                            );
                          });
                        } else if (
                          !showTodayDeliveryPayment &&
                          (collectedAmt > 0 || (totalReturnAmount > 0 && !isTodayPaid))
                        ) {
                          rowIdx++;
                          const grossSettled = collectedAmt + totalReturnAmount;
                          rows.push(
                            <tr key="fallback-settled" className="bg-white">
                              <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{rowIdx}</td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">
                                <div>Pelunasan Tagihan / Nota</div>
                                <div className="font-mono text-[10px] text-slate-500">Piutang Toko</div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                                {formatDate(invoiceData.createdAt || new Date())}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                                Pelunasan tagihan tempo transaksi sebelumnya
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                                {formatRupiah(grossSettled)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {totalReturnAmount > 0 ? 'Ditagih' : `Lunas (${invoiceData.paymentMethod || 'TUNAI'})`}
                                </span>
                              </td>
                            </tr>
                          );
                        }

                        // 3. Potongan Retur Toko
                        if (totalReturnAmount > 0 && invoiceData.returns && invoiceData.returns.length > 0) {
                          rowIdx++;
                          rows.push(
                            <tr key="return-deduction" className="bg-amber-50/40">
                              <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{rowIdx}</td>
                              <td className="py-2.5 px-3 font-semibold text-amber-900">
                                <div>Potongan Retur Toko</div>
                                <div className="text-[10px] text-amber-700">Pengurangan Tagihan</div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                                {formatDate(invoiceData.createdAt || new Date())}
                              </td>
                              <td className="py-2.5 px-3 text-amber-800 text-[11px]">
                                {invoiceData.returns.map((r) => `${r.name} (${r.quantity} ${r.unitName})`).join(', ')}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                                -{formatRupiah(totalReturnAmount)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                  Potong Nota
                                </span>
                              </td>
                            </tr>
                          );
                        }

                        return rows;
                      })()}
                    </tbody>
                    <tfoot className="border-t border-slate-200 bg-slate-50/80 font-semibold text-slate-800">
                      <tr>
                        <td colSpan={4} className="py-2.5 px-3 text-right text-slate-900 text-xs uppercase font-bold">
                          Total Pembayaran Diterima Hari Ini:
                        </td>
                        <td colSpan={2} className="py-2.5 px-3 text-right font-bold text-emerald-800 font-mono text-xs">
                          {formatRupiah(collectedAmt)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* 5. Returns Table (if any) */}
            {invoiceData.returns && invoiceData.returns.length > 0 && (
              <div className="space-y-2.5 pt-2 page-break-avoid">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-900 text-white text-[9px] font-bold flex items-center justify-center">
                      {returnsSectionLetter}
                    </span>
                    <span className="text-xs font-bold uppercase text-slate-900 tracking-wide">
                      Barang Retur / Pengembalian Dari Toko
                    </span>
                  </div>
                  {Boolean(totalReturnAmount > 0) && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-amber-50 text-amber-800 border-amber-200">
                      Potongan Tagihan: -{formatRupiah(totalReturnAmount)}
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 font-bold text-[10px] uppercase tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-3 text-center w-10 text-slate-400">NO</th>
                        <th className="py-2.5 px-3">NAMA PRODUK</th>
                        <th className="py-2.5 px-3 text-center w-16">JUMLAH</th>
                        <th className="py-2.5 px-3 text-center w-16">SATUAN</th>
                        <th className="py-2.5 px-3 text-center w-20">KONDISI</th>
                        <th className="py-2.5 px-3">ALASAN / KETERANGAN</th>
                        <th className="py-2.5 px-3 text-right w-28">NILAI RETUR</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoiceData.returns.map((r, idx) => (
                        <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'}>
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900">{r.name}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-800">{r.quantity}</td>
                          <td className="py-2.5 px-3 text-center text-slate-600">{r.unitName}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              r.condition === 'GOOD' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {r.condition === 'GOOD' ? 'Baik' : 'Rusak'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px]">{r.reason || '-'}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-amber-700">
                            {(() => {
                              const itemSub = r.subtotal || (r.unitPrice ? r.unitPrice * r.quantity : (r.quantity ? r.quantity * 200 : 0));
                              return itemSub > 0 ? `-${formatRupiah(itemSub)}` : '-';
                            })()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {Boolean(totalReturnAmount > 0) && (
                      <tfoot className="border-t border-slate-200 bg-slate-50/80 font-semibold text-slate-800">
                        <tr>
                          <td colSpan={6} className="py-2.5 px-3 text-right text-slate-900 text-xs uppercase font-bold">
                            Total Nilai Potongan Retur:
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600 font-mono text-xs">
                            -{formatRupiah(totalReturnAmount)}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* 6. Structured Financial Summary Layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 page-break-avoid">
              {/* Left Notes */}
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5 text-xs text-slate-600 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200 pb-1">
                  Catatan & Keterangan Transaksi
                </div>
                <div className="text-xs">
                  Metode Pembayaran: <strong className="text-slate-900 uppercase">{collectedAmt > 0 ? (invoiceData.paymentMethod || 'TUNAI') : 'TEMPO'}</strong>
                </div>
                {invoiceData.transactionType === 'DROP_AND_COLLECT_PREV' && (
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Penerimaan uang merupakan <strong>pelunasan nota</strong>. Kiriman barang baru ({formatRupiah(invoiceData.netAmount)}) berstatus <strong>TEMPO</strong>.
                  </p>
                )}
                {invoiceData.transactionType === 'DROP_ONLY' && (
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Pengiriman barang berstatus <strong>TEMPO</strong> tanpa penerimaan kas hari ini.
                  </p>
                )}
                {invoiceData.transactionType === 'COLLECT_ONLY' && (
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Tanda terima resmi atas pelunasan tagihan tempo transaksi sebelumnya.
                  </p>
                )}
              </div>

              {/* Right Summary Table */}
              <div className="rounded-lg border border-slate-200 overflow-hidden bg-white text-xs">
                <table className="w-full border-collapse">
                  <tbody className="divide-y divide-slate-100">
                    {hasDeliveredItems && (
                      <tr>
                        <td className="py-2 px-3 text-slate-600">Nilai Kiriman Hari Ini</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                          {formatRupiah(invoiceData.totalAmount - (invoiceData.discountAmount || 0))}
                        </td>
                      </tr>
                    )}
                    {totalReturnAmount > 0 && (
                      <tr>
                        <td className="py-2 px-3 text-amber-900">(-) Potongan Retur Toko</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                          -{formatRupiah(totalReturnAmount)}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-slate-900 text-white font-bold">
                      <td className="py-2.5 px-3 uppercase text-[11px] tracking-wide">TOTAL UANG DITERIMA</td>
                      <td className="py-2.5 px-3 text-right font-mono text-sm">{formatRupiah(collectedAmt)}</td>
                    </tr>
                    <tr className="bg-slate-50/60">
                      <td className="py-1.5 px-3 text-[10px] text-slate-500">Status Pembayaran Kas</td>
                      <td className="py-1.5 px-3 text-right font-bold text-[10px]">
                        <span className={collectedAmt > 0 ? 'text-emerald-700' : 'text-amber-800'}>
                          {collectedAmt > 0 ? `LUNAS (${invoiceData.paymentMethod || 'TUNAI'})` : 'TEMPO (NIHIL)'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 7. Signatures / Pengesahan (3 Columns) */}
            <div className="border-t border-slate-300 pt-7 pb-3 mt-6 hidden sm:grid print:grid grid-cols-3 gap-4 text-center text-xs text-slate-700 page-break-avoid">
              <div className="flex flex-col items-center justify-between min-h-[115px]">
                <p className="font-semibold text-[11px] text-slate-600 uppercase">Penerima / Toko</p>
                <div className="w-full flex flex-col items-center pt-8 pb-3">
                  <div className="border-b border-slate-400 w-32 sm:w-40 mb-2" />
                  <p className="text-[11px] font-medium text-slate-800 truncate max-w-[170px]">
                    ( {safeStoreName} )
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-between min-h-[115px]">
                <p className="font-semibold text-[11px] text-slate-600 uppercase">Petugas Sales</p>
                <div className="w-full flex flex-col items-center pt-8 pb-3">
                  <div className="border-b border-slate-400 w-32 sm:w-40 mb-2" />
                  <p className="text-[11px] font-medium text-slate-800 truncate max-w-[170px]">
                    ( {safeSalesName} )
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-between min-h-[115px]">
                <p className="font-semibold text-[11px] text-slate-600 uppercase">Admin / Kasir</p>
                <div className="w-full flex flex-col items-center pt-8 pb-3">
                  <div className="border-b border-slate-400 w-32 sm:w-40 mb-2" />
                  <p className="text-[11px] font-medium text-slate-500">
                    ( .............................. )
                  </p>
                </div>
              </div>
            </div>

            {/* 8. Corporate Terms & Footer */}
            <div className="border-t border-slate-200 pt-4 mt-3 text-[10px] text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-1 page-break-avoid">
              <p>
                * {safeFooterNote}
              </p>
              <p className="font-mono text-[9px] text-slate-400">
                Dicetak pada: {new Date().toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ACTION BUTTONS: BALANCED, CONSISTENT & POLISHED                           */}
          {/* ========================================================================= */}
          {bluetoothStatus && (
            <div className="no-print p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <Bluetooth className="w-4 h-4 text-indigo-600 animate-pulse shrink-0" />
              <span>{bluetoothStatus}</span>
            </div>
          )}

          <div className="no-print flex flex-col sm:flex-row items-center gap-2 pt-1 flex-wrap">
            {/* 1-Click Android Bluetooth Print App Trigger (Instant Native Connection) */}
            <Button
              type="button"
              onClick={handlePrintViaApp}
              className="h-10 w-full sm:flex-1 gap-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white cursor-pointer font-bold text-xs px-4 rounded-xl shadow-md shadow-emerald-700/20"
            >
              <Printer className="w-4 h-4 text-white" />
              <span>Cetak Bluetooth Thermal (App)</span>
            </Button>

            {/* Direct Web Bluetooth ESC/POS Print */}
            <Button
              type="button"
              variant="outline"
              onClick={handleDirectBluetoothPrint}
              disabled={isBluetoothPrinting}
              className="h-10 w-full sm:w-auto gap-1.5 bg-slate-900 text-white hover:bg-slate-800 border-slate-900 cursor-pointer font-semibold text-xs px-3 rounded-xl"
            >
              <Bluetooth className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isBluetoothPrinting ? 'Cetak...' : 'Web Bluetooth'}</span>
            </Button>

            {/* WhatsApp Direct Share Button */}
            <a
              href={waUrl}
              target="_blank"
              rel="noreferrer"
              className="h-10 w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition-colors cursor-pointer border border-emerald-500"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Kirim WA</span>
            </a>

            {/* Optional A4 Print */}
            <Button
              type="button"
              variant="outline"
              onClick={handlePrintA4}
              className="h-10 w-full sm:w-auto gap-1.5 text-slate-700 border-slate-300 hover:bg-slate-100 cursor-pointer font-semibold text-xs px-3 rounded-xl"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>A4</span>
            </Button>

            {/* Done / Close Button */}
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              className="h-10 w-full sm:w-auto text-xs font-semibold px-4 rounded-xl border border-slate-200 hover:bg-slate-100 cursor-pointer text-slate-600"
            >
              Tutup
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

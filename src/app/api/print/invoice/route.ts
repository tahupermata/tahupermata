import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { visitOrders, companySettings, storeVisits } from '@/db/schema';
import { eq, or } from 'drizzle-orm';
import { formatDate } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const invoiceNumber = searchParams.get('invoiceNumber') || searchParams.get('id');

  const createJsonObjectResponse = (items: any[]) => {
    const responseObj: Record<string, any> = {};
    items.forEach((item, idx) => {
      responseObj[String(idx)] = item;
    });
    return NextResponse.json(responseObj, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
      },
    });
  };

  if (!invoiceNumber) {
    return createJsonObjectResponse([
      { type: 0, content: 'Invoice number required', bold: 1, align: 1, format: 0 }
    ]);
  }

  // 1. Fetch Company Settings
  const company = await db.query.companySettings.findFirst();
  const companyName = company?.companyName || 'DISTRIBUSI TAHU SUPER';
  const companyAddress = company?.address || 'Jl. Industri Pangan Raya No. 88, Sentra Distribusi Tahu Nusantara';
  const companyPhone = company?.phone || '0812-3456-7890';
  const footerNote = company?.invoiceFooterNote || 'Dokumen ini bukti transaksi sah.';

  // 2. Fetch Order Data
  let order = await db.query.visitOrders.findFirst({
    where: eq(visitOrders.invoiceNumber, invoiceNumber),
    with: {
      store: true,
      sales: true,
      visit: true,
      items: {
        with: {
          item: true,
        },
      },
      returns: {
        with: {
          item: true,
        },
      },
    },
  });

  let storeName = order?.store?.name || 'Toko Pelanggan';
  let salesName = order?.sales?.name || 'Sales Representative';
  let dateStr = formatDate(order?.createdAt || new Date());
  let paymentMethod = order?.paymentMethod || 'TUNAI';
  let collectedAmt: number = (order?.collectedAmount !== null && order?.collectedAmount !== undefined) 
    ? order.collectedAmount 
    : (order?.netAmount || 0);

  if (!order) {
    // If order record is not yet in visitOrders, look up by visitId
    const visit = await db.query.storeVisits.findFirst({
      where: eq(storeVisits.id, invoiceNumber),
      with: {
        store: true,
        sales: true,
        assignedItem: true,
        orders: {
          with: {
            items: { with: { item: true } },
            returns: { with: { item: true } },
          },
        },
      },
    });

    if (!visit) {
      return createJsonObjectResponse([
        { type: 0, content: `Invoice #${invoiceNumber} tidak ditemukan.`, bold: 1, align: 1, format: 0 },
      ]);
    }

    order = visit.orders?.[0] as any;
    storeName = visit.store?.name || 'Toko Pelanggan';
    salesName = visit.sales?.name || 'Sales Representative';
    dateStr = formatDate(visit.createdAt || new Date());
    paymentMethod = order?.paymentMethod || 'TUNAI';
    collectedAmt = (order?.collectedAmount !== null && order?.collectedAmount !== undefined)
      ? order.collectedAmount
      : (order?.netAmount || 0);
  }

  const printItems: any[] = [];
  const width = 32; // 58mm standard 32 columns

  const row = (left: string, right: string) => {
    const space = width - (left.length + right.length);
    if (space > 0) {
      return left + ' '.repeat(space) + right;
    }
    const truncatedLeft = left.slice(0, Math.max(6, width - right.length - 1));
    const rem = Math.max(1, width - (truncatedLeft.length + right.length));
    return truncatedLeft + ' '.repeat(rem) + right;
  };

  const formatRp = (val: number) => {
    return 'Rp ' + Math.round(val).toLocaleString('id-ID');
  };

  // 1. Header
  printItems.push({
    type: 0,
    content: companyName.toUpperCase(),
    bold: 1,
    align: 1, // center
    format: 2, // double height + width
  });

  printItems.push({
    type: 0,
    content: `${companyAddress}\nTelp: ${companyPhone}`,
    bold: 0,
    align: 1,
    format: 0,
  });

  printItems.push({
    type: 0,
    content: '='.repeat(width),
    bold: 0,
    align: 1,
    format: 0,
  });

  // 2. Info Block
  const infoLines = [
    row('No. Nota:', invoiceNumber),
    row('Tanggal :', dateStr),
    row('Toko    :', storeName),
    row('Sales   :', salesName),
    row('Metode  :', collectedAmt > 0 ? paymentMethod : 'TEMPO'),
  ].join('\n');

  printItems.push({
    type: 0,
    content: infoLines,
    bold: 0,
    align: 0, // left
    format: 0,
  });

  printItems.push({
    type: 0,
    content: '-'.repeat(width),
    bold: 0,
    align: 0,
    format: 0,
  });

  // 3. Section A: Barang Kiriman Baru
  if (order?.items && order.items.length > 0) {
    printItems.push({
      type: 0,
      content: 'A. RINCIAN BARANG KIRIMAN',
      bold: 1,
      align: 0,
      format: 0,
    });

    const itemLines: string[] = [];
    order.items.forEach((it) => {
      const name = it.item?.name || it.unitName || 'Tahu';
      itemLines.push(name);
      const subLeft = ` ${it.quantity} ${it.unitName} x ${formatRp(it.unitPrice)}`;
      const subRight = formatRp(it.subtotal);
      itemLines.push(row(subLeft, subRight));
    });

    if (order.discountAmount && order.discountAmount > 0) {
      itemLines.push(row('(-) Diskon:', `-${formatRp(order.discountAmount)}`));
    }

    itemLines.push(row('Total Nilai Barang:', formatRp(order.totalAmount - (order.discountAmount || 0))));

    printItems.push({
      type: 0,
      content: itemLines.join('\n'),
      bold: 0,
      align: 0,
      format: 0,
    });

    printItems.push({
      type: 0,
      content: '-'.repeat(width),
      bold: 0,
      align: 0,
      format: 0,
    });
  }

  // 4. Section B: Penerimaan Pembayaran / Pelunasan
  printItems.push({
    type: 0,
    content: 'B. PENERIMAAN PEMBAYARAN',
    bold: 1,
    align: 0,
    format: 0,
  });

  const payLines: string[] = [];
  if (order?.settledInvoiceIds) {
    try {
      const ids: string[] = typeof order.settledInvoiceIds === 'string' ? JSON.parse(order.settledInvoiceIds) : order.settledInvoiceIds;
      if (Array.isArray(ids) && ids.length > 0) {
        const settledOrders = await db.query.visitOrders.findMany({
          where: or(...ids.map((id) => eq(visitOrders.id, id))),
        });
        settledOrders.forEach((s) => {
          payLines.push(row(`Nota (${s.invoiceNumber}):`, formatRp(s.netAmount)));
        });
      }
    } catch (e) {}
  }

  if (payLines.length === 0) {
    if (collectedAmt > 0) {
      payLines.push(row('Tagihan Terbayar:', formatRp(collectedAmt)));
    } else {
      payLines.push(row('Status Tagihan:', 'TEMPO (Rp 0)'));
    }
  }

  // Return deduction
  let totalReturnVal = 0;
  if (order?.returns && order.returns.length > 0) {
    totalReturnVal = order.returns.reduce((sum, r) => sum + (r.subtotal || (r.unitPrice ? r.unitPrice * r.quantity : (r.quantity ? r.quantity * 200 : 0))), 0);
    if (totalReturnVal > 0) {
      payLines.push(row('(-) Potongan Retur:', `-${formatRp(totalReturnVal)}`));
    }
  }

  printItems.push({
    type: 0,
    content: payLines.join('\n'),
    bold: 0,
    align: 0,
    format: 0,
  });

  printItems.push({
    type: 0,
    content: '-'.repeat(width),
    bold: 0,
    align: 0,
    format: 0,
  });

  // 5. Section C: Retur Fisik Toko (if any)
  if (order?.returns && order.returns.length > 0) {
    printItems.push({
      type: 0,
      content: 'C. RETUR BARANG (FISIK)',
      bold: 1,
      align: 0,
      format: 0,
    });

    const retLines: string[] = [];
    order.returns.forEach((r) => {
      const name = r.item?.name || 'Tahu';
      const sub = r.subtotal || (r.unitPrice ? r.unitPrice * r.quantity : 0);
      retLines.push(row(`• ${name} (${r.quantity} ${r.unitName})`, sub > 0 ? `-${formatRp(sub)}` : 'Rp 0'));
      if (r.reason) {
        retLines.push(`  Alasan: ${r.reason}`);
      }
    });

    printItems.push({
      type: 0,
      content: retLines.join('\n'),
      bold: 0,
      align: 0,
      format: 0,
    });

    printItems.push({
      type: 0,
      content: '-'.repeat(width),
      bold: 0,
      align: 0,
      format: 0,
    });
  }

  // 6. Grand Total
  printItems.push({
    type: 0,
    content: 'TOTAL UANG DITERIMA',
    bold: 1,
    align: 1, // center
    format: 0,
  });

  printItems.push({
    type: 0,
    content: formatRp(collectedAmt),
    bold: 1,
    align: 1, // center
    format: 2, // double height + width
  });

  printItems.push({
    type: 0,
    content: collectedAmt > 0 ? `LUNAS (${paymentMethod.toUpperCase()})` : 'TEMPO (NIHIL)',
    bold: 1,
    align: 1,
    format: 0,
  });

  printItems.push({
    type: 0,
    content: '='.repeat(width),
    bold: 0,
    align: 1,
    format: 0,
  });

  // 7. Signatures
  printItems.push({
    type: 0,
    content: row('Penerima / Toko', 'Petugas Sales') + '\n\n\n' + row(`( ${storeName.slice(0, 12)} )`, `( ${salesName.slice(0, 12)} )`),
    bold: 0,
    align: 0,
    format: 0,
  });

  // 8. Footer
  printItems.push({
    type: 0,
    content: `\n* ${footerNote}\nTerima kasih atas kerja samanya!\n\n\n`,
    bold: 0,
    align: 1, // center
    format: 0,
  });

  return createJsonObjectResponse(printItems);
}


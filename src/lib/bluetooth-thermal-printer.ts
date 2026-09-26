/**
 * Web Bluetooth Direct ESC/POS Thermal Printer Driver
 * Supports standard 58mm (32 chars) & 80mm (48 chars) Bluetooth Thermal Printers
 * (Panda, Eppos, Zjiang, Goojprt, Iware, RPP02N, PT-210, MPT-II, etc.)
 */

// Common Bluetooth GATT Services for ESC/POS Thermal Printers
const COMMON_POS_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Service
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / CC2540 BLE module
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Rongta / ZJ-58
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent UART
  '0000ff00-0000-1000-8000-00805f9b34fb', // Generic BLE UART
  '0000ae00-0000-1000-8000-00805f9b34fb', // Cashino / MPT series
];

export interface PrinterDevice {
  id: string;
  name: string;
  connected: boolean;
}

export class BluetoothThermalPrinter {
  private static activeCharacteristic: any = null;
  private static activeDevice: any = null;

  /**
   * Check if Web Bluetooth API is supported by the current browser
   */
  public static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  /**
   * Request user to pair/select a Bluetooth thermal printer device
   */
  public static async connect(): Promise<{ name: string }> {
    if (!this.isSupported()) {
      throw new Error(
        'Browser ini belum mendukung Web Bluetooth API. Gunakan Google Chrome di Android atau aktifkan browser Bluetooth.'
      );
    }

    // 1. Prompt browser native Bluetooth device picker
    const nav: any = navigator;
    const device = await nav.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: COMMON_POS_SERVICES,
    });

    if (!device) {
      throw new Error('Tidak ada printer yang dipilih.');
    }

    // 2. Connect to GATT Server
    const server = await device.gatt.connect();

    // 3. Find writable characteristic across common services
    let writeChar: any = null;

    // Try finding service from known list
    for (const serviceUuid of COMMON_POS_SERVICES) {
      try {
        const service = await server.getPrimaryService(serviceUuid);
        const chars = await service.getCharacteristics();
        for (const c of chars) {
          if (c.properties.write || c.properties.writeWithoutResponse) {
            writeChar = c;
            break;
          }
        }
        if (writeChar) break;
      } catch (e) {
        // Continue searching next service
      }
    }

    // If not found in known services, inspect all primary services
    if (!writeChar) {
      try {
        const services = await server.getPrimaryServices();
        for (const service of services) {
          try {
            const chars = await service.getCharacteristics();
            for (const c of chars) {
              if (c.properties.write || c.properties.writeWithoutResponse) {
                writeChar = c;
                break;
              }
            }
            if (writeChar) break;
          } catch (e) {}
        }
      } catch (e) {}
    }

    if (!writeChar) {
      throw new Error(
        `Berhasil terhubung ke ${device.name || 'Printer'}, namun tidak menemukan jalur kirim data print. Pastikan printer dalam keadaan ON.`
      );
    }

    this.activeDevice = device;
    this.activeCharacteristic = writeChar;

    device.addEventListener('gattserverdisconnected', () => {
      this.activeCharacteristic = null;
      this.activeDevice = null;
    });

    return { name: device.name || 'Bluetooth Printer' };
  }

  /**
   * Check if a printer is currently connected and ready
   */
  public static isConnected(): boolean {
    return Boolean(this.activeCharacteristic && this.activeDevice?.gatt?.connected);
  }

  /**
   * Get connected printer name
   */
  public static getConnectedDeviceName(): string | null {
    if (this.isConnected()) {
      return this.activeDevice?.name || 'Bluetooth Printer';
    }
    return null;
  }

  /**
   * Send binary ESC/POS payload to connected Bluetooth printer in safe chunks
   */
  public static async printRaw(data: Uint8Array): Promise<void> {
    if (!this.isConnected()) {
      await this.connect();
    }

    if (!this.activeCharacteristic) {
      throw new Error('Printer Bluetooth belum siap.');
    }

    // BLE packets have maximum MTU (safely chunk in 100 bytes)
    const CHUNK_SIZE = 100;
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      if (this.activeCharacteristic.writeValueWithResponse) {
        await this.activeCharacteristic.writeValueWithResponse(chunk);
      } else if (this.activeCharacteristic.writeValueWithoutResponse) {
        await this.activeCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await this.activeCharacteristic.writeValue(chunk);
      }
      // Small delay between chunks to prevent printer buffer overflow
      await new Promise((r) => setTimeout(r, 20));
    }
  }

  /**
   * Build complete ESC/POS receipt bytes for 58mm / 80mm format
   */
  public static buildReceipt(params: {
    companyName: string;
    companyAddress: string;
    companyPhone: string;
    invoiceNumber: string;
    dateStr: string;
    storeName: string;
    salesName: string;
    paymentMethod: string;
    items?: Array<{ name: string; quantity: number; unitName: string; unitPrice: number; subtotal: number }>;
    discountAmount?: number;
    totalAmount?: number;
    settledInvoices?: Array<{ invoiceNumber: string; netAmount: number }>;
    returns?: Array<{ name: string; quantity: number; unitName: string; subtotal?: number; reason?: string }>;
    collectedAmount: number;
    footerNote?: string;
    paperWidthChars?: number; // 32 for 58mm (default), 48 for 80mm
  }): Uint8Array {
    const width = params.paperWidthChars || 32;
    const encoder = new TextEncoder();
    const bytes: number[] = [];

    // Helper to push raw ASCII/ESC commands
    const pushBytes = (...arr: number[]) => {
      bytes.push(...arr);
    };

    const pushText = (str: string) => {
      const encoded = encoder.encode(str);
      for (let i = 0; i < encoded.length; i++) {
        bytes.push(encoded[i]);
      }
    };

    const pushLine = (str: string = '') => {
      pushText(str + '\n');
    };

    const formatCurrency = (val: number) => {
      return 'Rp ' + Math.round(val).toLocaleString('id-ID');
    };

    const pushTwoColumnRow = (left: string, right: string) => {
      const space = width - (left.length + right.length);
      if (space > 0) {
        pushLine(left + ' '.repeat(space) + right);
      } else {
        // Truncate left if overflow
        const truncatedLeft = left.slice(0, Math.max(8, width - right.length - 1));
        const remSpace = Math.max(1, width - (truncatedLeft.length + right.length));
        pushLine(truncatedLeft + ' '.repeat(remSpace) + right);
      }
    };

    // 1. Initialize Printer (ESC @)
    pushBytes(0x1b, 0x40);

    // 2. Center Align (ESC a 1)
    pushBytes(0x1b, 0x61, 0x01);

    // Double Height / Bold Header (ESC ! 0x30 / 0x08)
    pushBytes(0x1b, 0x45, 0x01); // Bold ON
    pushBytes(0x1d, 0x21, 0x11); // Double width & height
    pushLine(params.companyName.toUpperCase());
    pushBytes(0x1d, 0x21, 0x00); // Normal size
    pushBytes(0x1b, 0x45, 0x00); // Bold OFF

    pushLine(params.companyAddress);
    pushLine(`Telp: ${params.companyPhone}`);
    pushLine('='.repeat(width));

    // 3. Left Align Info Block
    pushBytes(0x1b, 0x61, 0x00);
    pushTwoColumnRow('No. Nota:', params.invoiceNumber);
    pushTwoColumnRow('Tanggal :', params.dateStr);
    pushTwoColumnRow('Toko    :', params.storeName);
    pushTwoColumnRow('Sales   :', params.salesName);
    pushTwoColumnRow('Metode  :', params.collectedAmount > 0 ? params.paymentMethod.toUpperCase() : 'TEMPO');
    pushLine('-'.repeat(width));

    // 4. Section A: Barang Kiriman Baru (if any)
    if (params.items && params.items.length > 0) {
      pushBytes(0x1b, 0x45, 0x01);
      pushLine(`A. BARANG KIRIMAN`);
      pushBytes(0x1b, 0x45, 0x00);

      params.items.forEach((it) => {
        pushLine(`${it.name}`);
        const leftSub = ` ${it.quantity} ${it.unitName} x ${formatCurrency(it.unitPrice)}`;
        const rightSub = formatCurrency(it.subtotal);
        pushTwoColumnRow(leftSub, rightSub);
      });

      if (params.discountAmount && params.discountAmount > 0) {
        pushTwoColumnRow('(-) Diskon:', `-${formatCurrency(params.discountAmount)}`);
      }

      if (params.totalAmount !== undefined) {
        pushBytes(0x1b, 0x45, 0x01);
        pushTwoColumnRow('Total Nilai Barang:', formatCurrency(params.totalAmount - (params.discountAmount || 0)));
        pushBytes(0x1b, 0x45, 0x00);
      }
      pushLine('-'.repeat(width));
    }

    // 5. Section B: Pembayaran / Pelunasan
    pushBytes(0x1b, 0x45, 0x01);
    pushLine(`B. PENERIMAAN UANG / TAGIHAN`);
    pushBytes(0x1b, 0x45, 0x00);

    if (params.settledInvoices && params.settledInvoices.length > 0) {
      params.settledInvoices.forEach((s) => {
        pushTwoColumnRow(`Nota (${s.invoiceNumber}):`, formatCurrency(s.netAmount));
      });
    } else if (params.collectedAmount > 0) {
      pushTwoColumnRow('Tagihan Terbayar:', formatCurrency(params.collectedAmount));
    } else {
      pushTwoColumnRow('Status Tagihan:', 'TEMPO (Rp 0)');
    }

    // Returns deduction
    let totalReturnVal = 0;
    if (params.returns && params.returns.length > 0) {
      totalReturnVal = params.returns.reduce((sum, r) => sum + (r.subtotal || 0), 0);
      if (totalReturnVal > 0) {
        pushTwoColumnRow('(-) Potongan Retur:', `-${formatCurrency(totalReturnVal)}`);
      }
    }
    pushLine('-'.repeat(width));

    // 6. Section C: Retur Fisik Toko (if any)
    if (params.returns && params.returns.length > 0) {
      pushBytes(0x1b, 0x45, 0x01);
      pushLine(`C. RETUR BARANG (FISIK)`);
      pushBytes(0x1b, 0x45, 0x00);

      params.returns.forEach((r) => {
        pushTwoColumnRow(`• ${r.name} (${r.quantity} ${r.unitName})`, r.subtotal ? `-${formatCurrency(r.subtotal)}` : 'Rp 0');
        if (r.reason) {
          pushLine(`  Alasan: ${r.reason}`);
        }
      });
      pushLine('-'.repeat(width));
    }

    // 7. Grand Total Box (Double Height / Bold)
    pushBytes(0x1b, 0x61, 0x01); // Center
    pushBytes(0x1b, 0x45, 0x01); // Bold ON
    pushLine('TOTAL UANG DITERIMA');
    pushBytes(0x1d, 0x21, 0x11); // Double size
    pushLine(formatCurrency(params.collectedAmount));
    pushBytes(0x1d, 0x21, 0x00); // Normal size
    pushLine(params.collectedAmount > 0 ? `LUNAS (${params.paymentMethod.toUpperCase()})` : 'TEMPO (NIHIL)');
    pushBytes(0x1b, 0x45, 0x00); // Bold OFF
    pushLine('='.repeat(width));

    // 8. Signatures
    pushBytes(0x1b, 0x61, 0x00);
    pushTwoColumnRow('Penerima / Toko', 'Petugas Sales');
    pushLine('');
    pushLine('');
    pushTwoColumnRow(`( ${params.storeName.slice(0, 12)} )`, `( ${params.salesName.slice(0, 12)} )`);

    // 9. Footer & Feed Paper
    pushBytes(0x1b, 0x61, 0x01); // Center
    pushLine('');
    pushLine(`* ${params.footerNote || 'Bukti transaksi sah.'}`);
    pushLine('Terima kasih atas kerja samanya!');
    pushLine('');
    pushLine('');
    pushLine(''); // 3 empty lines feed

    // Cut Paper (GS V 66 0)
    pushBytes(0x1d, 0x56, 0x42, 0x00);

    return new Uint8Array(bytes);
  }
}

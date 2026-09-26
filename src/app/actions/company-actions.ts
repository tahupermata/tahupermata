'use server';

import { db } from '@/db';
import { companySettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export interface CompanySettingsData {
  companyName: string;
  tagline?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  invoiceFooterNote?: string;
}

export async function getCompanySettingsAction() {
  try {
    const settings = await db.query.companySettings.findFirst({
      where: eq(companySettings.id, 'default'),
    });
    if (settings) return settings;

    // Fallback default
    return {
      id: 'default',
      companyName: 'DISTRIBUSI TAHU SUPER',
      tagline: 'Pusat Distribusi & Pemasaran Produk Tahu Berkualitas',
      address: 'Jl. Industri Pangan Raya No. 88, Sentra Distribusi Tahu Nusantara',
      phone: '0812-3456-7890',
      email: 'operasional@tahusuper.id',
      logoUrl: null,
      invoiceFooterNote: 'Dokumen ini merupakan bukti transaksi sah dari PT Distribusi Tahu Super.',
    };
  } catch (err) {
    console.error('Error fetching company settings:', err);
    return {
      id: 'default',
      companyName: 'DISTRIBUSI TAHU SUPER',
      tagline: 'Pusat Distribusi & Pemasaran Produk Tahu Berkualitas',
      address: 'Jl. Industri Pangan Raya No. 88, Sentra Distribusi Tahu Nusantara',
      phone: '0812-3456-7890',
      email: 'operasional@tahusuper.id',
      logoUrl: null,
      invoiceFooterNote: 'Dokumen ini merupakan bukti transaksi sah dari PT Distribusi Tahu Super.',
    };
  }
}

export async function updateCompanySettingsAction(data: CompanySettingsData) {
  try {
    const existing = await db.query.companySettings.findFirst({
      where: eq(companySettings.id, 'default'),
    });

    if (existing) {
      await db.update(companySettings)
        .set({
          companyName: data.companyName.trim() || 'DISTRIBUSI TAHU SUPER',
          tagline: data.tagline?.trim() || null,
          address: data.address?.trim() || null,
          phone: data.phone?.trim() || null,
          email: data.email?.trim() || null,
          logoUrl: data.logoUrl?.trim() || null,
          invoiceFooterNote: data.invoiceFooterNote?.trim() || null,
          updatedAt: new Date(),
        })
        .where(eq(companySettings.id, 'default'));
    } else {
      await db.insert(companySettings).values({
        id: 'default',
        companyName: data.companyName.trim() || 'DISTRIBUSI TAHU SUPER',
        tagline: data.tagline?.trim() || null,
        address: data.address?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        logoUrl: data.logoUrl?.trim() || null,
        invoiceFooterNote: data.invoiceFooterNote?.trim() || null,
        updatedAt: new Date(),
      });
    }

    revalidatePath('/settings');
    revalidatePath('/sales');
    revalidatePath('/monitor-sales');
    revalidatePath('/reports');
    revalidatePath('/');

    return { success: true };
  } catch (err: any) {
    console.error('Error updating company settings:', err);
    return { success: false, error: err.message };
  }
}

import { db } from './index';
import { sql } from 'drizzle-orm';

async function migrate() {
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS company_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      company_name TEXT NOT NULL DEFAULT 'DISTRIBUSI TAHU SUPER',
      tagline TEXT DEFAULT 'Pusat Distribusi & Pemasaran Produk Tahu Berkualitas',
      address TEXT DEFAULT 'Jl. Industri Pangan Raya No. 88, Sentra Distribusi',
      phone TEXT DEFAULT '0812-3456-7890',
      email TEXT DEFAULT 'operasional@tahusuper.id',
      logo_url TEXT,
      invoice_footer_note TEXT DEFAULT 'Dokumen ini merupakan bukti transaksi sah dari PT Distribusi Tahu Super.',
      updated_at INTEGER
    );
  `);

  // Insert default company settings if not exists
  const existing = await db.run(sql`SELECT count(*) as cnt FROM company_settings WHERE id = 'default'`);
  if (Number(existing.rows[0]?.cnt || 0) === 0) {
    await db.run(sql`
      INSERT INTO company_settings (id, company_name, tagline, address, phone, email, logo_url, invoice_footer_note, updated_at)
      VALUES (
        'default',
        'DISTRIBUSI TAHU SUPER',
        'Pusat Distribusi & Pemasaran Produk Tahu Berkualitas',
        'Jl. Industri Pangan Raya No. 88, Sentra Distribusi Tahu Nusantara',
        '0812-3456-7890',
        'operasional@tahusuper.id',
        NULL,
        'Dokumen ini merupakan bukti transaksi sah dari PT Distribusi Tahu Super.',
        ${Date.now()}
      )
    `);
    console.log('✅ Default company settings initialized.');
  } else {
    console.log('✅ Company settings table verified.');
  }
}

migrate().catch(console.error);

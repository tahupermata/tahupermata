import { client, db } from './index';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('🔄 Checking and applying database migration for 4 Sales Transaction Types & Collected Cash Tracker...');

  const columnsToAdd = [
    { table: 'visit_orders', column: 'transaction_type', type: `TEXT DEFAULT 'DIRECT_DROP_BILL'` },
    { table: 'visit_orders', column: 'collected_amount', type: `REAL DEFAULT 0` },
    { table: 'visit_orders', column: 'settled_invoice_ids', type: `TEXT` },
  ];

  for (const { table, column, type } of columnsToAdd) {
    try {
      await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
      console.log(`✅ Added ${column} to ${table}`);
    } catch (e: any) {
      if (e.message?.includes('duplicate column name') || e.message?.includes('already exists')) {
        console.log(`ℹ️ ${column} already exists in ${table}`);
      } else {
        console.log(`Warning on ${table}.${column}:`, e.message);
      }
    }
  }

  // Update existing orders to have collected_amount = net_amount if paymentStatus === 'PAID'
  await db.run(sql`UPDATE visit_orders SET collected_amount = net_amount WHERE payment_status = 'PAID' AND (collected_amount IS NULL OR collected_amount = 0)`);
  console.log('✅ Updated existing orders collected_amount');

  console.log('🎉 Migration for 4 Sales Types completed successfully!');
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });

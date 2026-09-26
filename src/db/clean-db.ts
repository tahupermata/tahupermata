import { db } from './index';
import { sql } from 'drizzle-orm';

async function cleanDatabase() {
  console.log('🧹 Starting Database Cleanup...');

  // Delete all transaction and inventory tables
  const tablesToClear = [
    'order_items',
    'return_items',
    'visit_orders',
    'store_visits',
    'sales_targets',
    'sales_stock',
    'stock_mutations',
    'item_batches',
    'item_units',
    'items',
  ];

  for (const table of tablesToClear) {
    try {
      await db.run(sql.raw(`DELETE FROM ${table}`));
      console.log(`✅ Cleared table: ${table}`);
    } catch (err: any) {
      console.error(`❌ Error clearing table ${table}:`, err.message);
    }
  }

  console.log('\n📊 Database Row Counts After Cleanup:');
  const allTables = [
    'roles',
    'users',
    'stores',
    'items',
    'item_units',
    'item_batches',
    'stock_mutations',
    'sales_stock',
    'sales_targets',
    'store_visits',
    'visit_orders',
    'order_items',
    'return_items',
  ];

  for (const t of allTables) {
    try {
      const res = await db.run(sql.raw(`SELECT count(*) as count FROM ${t}`));
      console.log(`- ${t}:`, res.rows[0]);
    } catch (e: any) {
      console.log(`- ${t}: error (${e.message})`);
    }
  }

  console.log('\n✨ Database cleaned successfully. Only User data and Store data are preserved.');
}

cleanDatabase().catch((err) => {
  console.error('Fatal error during database cleanup:', err);
  process.exit(1);
});

import { client } from './index';

async function migrateScheduleFields() {
  console.log('Migrating store_visits table to add delivery_date, billing_date, assigned_item_id, and assigned_stock_qty...');

  try {
    await client.execute(`
      ALTER TABLE store_visits ADD COLUMN delivery_date TEXT;
    `);
    console.log('Added delivery_date column');
  } catch (err: any) {
    console.log('delivery_date already exists or skipped:', err?.message);
  }

  try {
    await client.execute(`
      ALTER TABLE store_visits ADD COLUMN billing_date TEXT;
    `);
    console.log('Added billing_date column');
  } catch (err: any) {
    console.log('billing_date already exists or skipped:', err?.message);
  }

  try {
    await client.execute(`
      ALTER TABLE store_visits ADD COLUMN assigned_item_id TEXT;
    `);
    console.log('Added assigned_item_id column');
  } catch (err: any) {
    console.log('assigned_item_id already exists or skipped:', err?.message);
  }

  try {
    await client.execute(`
      ALTER TABLE store_visits ADD COLUMN assigned_stock_qty INTEGER DEFAULT 0;
    `);
    console.log('Added assigned_stock_qty column');
  } catch (err: any) {
    console.log('assigned_stock_qty already exists or skipped:', err?.message);
  }

  // Backfill existing rows with delivery_date = visit_date and billing_date = visit_date if null
  try {
    await client.execute(`
      UPDATE store_visits 
      SET delivery_date = COALESCE(delivery_date, visit_date),
          billing_date = COALESCE(billing_date, visit_date),
          assigned_stock_qty = COALESCE(assigned_stock_qty, target_quantity, 0);
    `);
    console.log('Backfilled existing visits with delivery_date & billing_date');
  } catch (err: any) {
    console.log('Error backfilling:', err?.message);
  }

  console.log('Migration completed successfully!');
}

migrateScheduleFields().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});

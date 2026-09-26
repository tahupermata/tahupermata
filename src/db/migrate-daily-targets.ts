import { client, db } from './index';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

async function migrate() {
  console.log('🔄 Checking and applying database migration for Daily Targets...');

  try {
    await client.execute(`ALTER TABLE stores ADD COLUMN default_daily_target_qty INTEGER DEFAULT 0`);
    console.log('✅ Added default_daily_target_qty to stores');
  } catch (e: any) {
    if (e.message?.includes('duplicate column name') || e.message?.includes('already exists')) {
      console.log('ℹ️ default_daily_target_qty already exists in stores');
    } else {
      console.log('Stores alter warning:', e.message);
    }
  }

  try {
    await client.execute(`ALTER TABLE store_visits ADD COLUMN target_quantity INTEGER DEFAULT 0`);
    console.log('✅ Added target_quantity to store_visits');
  } catch (e: any) {
    if (e.message?.includes('duplicate column name') || e.message?.includes('already exists')) {
      console.log('ℹ️ target_quantity already exists in store_visits');
    } else {
      console.log('Store visits alter warning:', e.message);
    }
  }

  // Update existing stores with default targets if 0
  const allStores = await db.query.stores.findMany();
  for (const store of allStores) {
    let defaultQty = store.defaultDailyTargetQty || 0;
    if (defaultQty === 0) {
      if (store.code === 'TKO-001' || store.name.includes('Berkah')) {
        defaultQty = 200;
      } else if (store.code === 'TKO-002' || store.name.includes('Sumber')) {
        defaultQty = 400;
      } else if (store.code === 'TKO-003' || store.name.includes('Makmur')) {
        defaultQty = 500;
      } else {
        defaultQty = 200;
      }
      await db.run(sql`UPDATE stores SET default_daily_target_qty = ${defaultQty} WHERE id = ${store.id}`);
      console.log(`🎯 Set default target for ${store.name}: ${defaultQty} pcs`);
    }
  }

  // Update today's visits to have target_quantity populated from store default if 0
  const allVisits = await db.query.storeVisits.findMany({ with: { store: true } });
  for (const visit of allVisits) {
    if (!visit.targetQuantity || visit.targetQuantity === 0) {
      const storeTarget = visit.store?.defaultDailyTargetQty || 200;
      await db.run(sql`UPDATE store_visits SET target_quantity = ${storeTarget} WHERE id = ${visit.id}`);
      console.log(`🎯 Set visit target for ${visit.store?.name}: ${storeTarget} pcs`);
    }
  }

  console.log('🎉 Migration completed successfully!');
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  });

import { db } from './index';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function resetCleanDatabase() {
  console.log('🧹 Cleaning all dummy records from Turso database...');

  // Ensure tables exist
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      permissions TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      role_id TEXT NOT NULL REFERENCES roles(id),
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT,
      address TEXT,
      join_date TEXT,
      avatar_url TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      password_hash TEXT NOT NULL,
      created_at INTEGER
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      base_unit TEXT NOT NULL DEFAULT 'PCS',
      base_price REAL NOT NULL DEFAULT 0,
      image_url TEXT,
      dynamic_attributes TEXT NOT NULL DEFAULT '[]',
      stock_warehouse INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER,
      updated_at INTEGER
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS item_units (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      unit_name TEXT NOT NULL,
      conversion_rate INTEGER NOT NULL,
      price REAL,
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS stock_mutations (
      id TEXT PRIMARY KEY,
      item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_id TEXT,
      reference_id TEXT,
      notes TEXT,
      performed_by TEXT REFERENCES users(id),
      created_at INTEGER
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS sales_stock (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      owner_name TEXT,
      phone TEXT,
      address TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      assigned_sales_id TEXT REFERENCES users(id),
      target_monthly_sales REAL DEFAULT 0,
      image_url TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at INTEGER
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS sales_targets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      store_id TEXT REFERENCES stores(id) ON DELETE CASCADE,
      target_amount REAL NOT NULL DEFAULT 0,
      target_quantity INTEGER DEFAULT 0,
      period_month INTEGER NOT NULL,
      period_year INTEGER NOT NULL,
      created_at INTEGER
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS store_visits (
      id TEXT PRIMARY KEY,
      sales_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      visit_date TEXT NOT NULL,
      sequence_order INTEGER DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'SCHEDULED',
      checkin_time INTEGER,
      checkout_time INTEGER,
      latitude REAL,
      longitude REAL,
      notes TEXT,
      photo_url TEXT,
      created_at INTEGER
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS visit_orders (
      id TEXT PRIMARY KEY,
      invoice_number TEXT NOT NULL UNIQUE,
      visit_id TEXT REFERENCES store_visits(id),
      sales_id TEXT NOT NULL REFERENCES users(id),
      store_id TEXT NOT NULL REFERENCES stores(id),
      total_amount REAL NOT NULL DEFAULT 0,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      net_amount REAL NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'PAID',
      payment_method TEXT NOT NULL DEFAULT 'CASH',
      payment_proof_url TEXT,
      notes TEXT,
      created_at INTEGER
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES visit_orders(id) ON DELETE CASCADE,
      item_id TEXT NOT NULL REFERENCES items(id),
      unit_id TEXT,
      unit_name TEXT NOT NULL,
      conversion_rate INTEGER NOT NULL DEFAULT 1,
      quantity INTEGER NOT NULL,
      quantity_base INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL
    );
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS return_items (
      id TEXT PRIMARY KEY,
      order_id TEXT REFERENCES visit_orders(id) ON DELETE CASCADE,
      visit_id TEXT REFERENCES store_visits(id) ON DELETE CASCADE,
      sales_id TEXT NOT NULL REFERENCES users(id),
      store_id TEXT NOT NULL REFERENCES stores(id),
      item_id TEXT NOT NULL REFERENCES items(id),
      unit_name TEXT NOT NULL DEFAULT 'PCS',
      conversion_rate INTEGER NOT NULL DEFAULT 1,
      quantity INTEGER NOT NULL,
      quantity_base INTEGER NOT NULL,
      condition TEXT NOT NULL DEFAULT 'GOOD',
      reason TEXT,
      restocked INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER
    );
  `);

  // Clear all transactional, inventory and dummy store data
  await db.delete(schema.returnItems).all();
  await db.delete(schema.orderItems).all();
  await db.delete(schema.visitOrders).all();
  await db.delete(schema.storeVisits).all();
  await db.delete(schema.salesTargets).all();
  await db.delete(schema.stores).all();
  await db.delete(schema.salesStock).all();
  await db.delete(schema.stockMutations).all();
  await db.delete(schema.itemUnits).all();
  await db.delete(schema.items).all();
  await db.delete(schema.users).all();
  await db.delete(schema.roles).all();

  console.log('👑 Re-creating System Roles...');
  const superadminRole = await db.insert(schema.roles).values({
    id: 'role-superadmin',
    name: 'Superadmin / Master',
    description: 'Full access to all system modules, inventory, sales, users, and reports',
    permissions: [
      '*',
      'stock:view',
      'stock:manage',
      'stock:assign',
      'stores:view',
      'stores:manage',
      'sales:field',
      'monitor:view',
      'reports:view',
      'rbac:manage',
      'settings:manage',
    ],
  }).returning().get();

  await db.insert(schema.roles).values([
    {
      id: 'role-admin',
      name: 'Admin Operational',
      description: 'Inventory control, store assignment, live monitor, and sales reports',
      permissions: [
        'stock:view',
        'stock:manage',
        'stock:assign',
        'stores:view',
        'stores:manage',
        'monitor:view',
        'reports:view',
      ],
    },
    {
      id: 'role-sales',
      name: 'Sales Representative',
      description: 'Field sales rep with daily itinerary, drop/return, and invoice generation',
      permissions: [
        'sales:field',
        'stores:view',
        'stock:view',
      ],
    },
    {
      id: 'role-warehouse',
      name: 'Warehouse Manager',
      description: 'Warehouse stock mutations and sales rep inventory dispatch',
      permissions: [
        'stock:view',
        'stock:manage',
        'stock:assign',
      ],
    },
  ]);

  console.log('👤 Creating Master Account ONLY...');
  const masterUser = await db.insert(schema.users).values({
    id: 'user-master-tahupermata',
    roleId: superadminRole.id,
    name: 'Master Tahu Permata',
    email: 'tahupermata@proton.me',
    phone: '+628123456789',
    address: 'Kantor Pusat',
    joinDate: new Date().toISOString().split('T')[0],
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    status: 'ACTIVE',
    passwordHash: 'tahupermata@123A!',
  }).returning().get();

  console.log('✅ Database is now 100% CLEAN & FRESH!');
  console.log('---------------------------------------------------------');
  console.log(`Master Account Email    : ${masterUser.email}`);
  console.log(`Master Account Password : tahupermata@123A!`);
  console.log('All dummy items, stores, and transactions have been purged.');
  console.log('---------------------------------------------------------');
}

resetCleanDatabase().catch((err) => {
  console.error('❌ Reset failed:', err);
  process.exit(1);
});

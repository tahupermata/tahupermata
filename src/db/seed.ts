import { db } from './index';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function seed() {
  console.log('🌱 Starting database seeding...');

  // Create tables if using local SQLite and not yet migrated
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
      default_daily_target_qty INTEGER DEFAULT 0,
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
      target_quantity INTEGER DEFAULT 0,
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

  // Clear existing records for clean seed
  console.log('🧹 Cleaning old test data...');
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

  console.log('👑 Creating Roles & Permissions...');
  const superadminRole = await db.insert(schema.roles).values({
    id: 'role-superadmin',
    name: 'Superadmin / Master',
    description: 'Full access to all system modules, inventory, sales, users, and reports',
    permissions: [
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

  const adminRole = await db.insert(schema.roles).values({
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
  }).returning().get();

  const salesRole = await db.insert(schema.roles).values({
    id: 'role-sales',
    name: 'Sales Representative',
    description: 'Field sales rep with daily itinerary, drop/return, and invoice generation',
    permissions: [
      'sales:field',
      'stores:view',
      'stock:view',
    ],
  }).returning().get();

  const warehouseRole = await db.insert(schema.roles).values({
    id: 'role-warehouse',
    name: 'Warehouse Manager',
    description: 'Warehouse stock mutations and sales rep inventory dispatch',
    permissions: [
      'stock:view',
      'stock:manage',
      'stock:assign',
    ],
  }).returning().get();

  console.log('👤 Creating Users...');
  const userMaster = await db.insert(schema.users).values({
    id: 'user-master-tahupermata',
    roleId: superadminRole.id,
    name: 'Master Tahu Permata',
    email: 'tahupermata@proton.me',
    phone: '+628123456789',
    address: 'Kantor Pusat Tahu Permata',
    joinDate: '2023-01-01',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    status: 'ACTIVE',
    passwordHash: 'tahupermata@123A!',
  }).returning().get();

  const userAdmin = await db.insert(schema.users).values({
    id: 'user-admin-1',
    roleId: superadminRole.id,
    name: 'Alex Tanuwijaya (Master)',
    email: 'admin@salescorp.com',
    phone: '+628119876543',
    address: 'Jl. Sudirman No. 45, Jakarta Pusat',
    joinDate: '2023-01-15',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    status: 'ACTIVE',
    passwordHash: 'password123', // In production use bcrypt
  }).returning().get();

  const userSales1 = await db.insert(schema.users).values({
    id: 'user-sales-1',
    roleId: salesRole.id,
    name: 'Budi Santoso',
    email: 'budi@salescorp.com',
    phone: '+6281234567890',
    address: 'Jl. Merdeka Barat No. 12, Jakarta Barat',
    joinDate: '2024-03-01',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    status: 'ACTIVE',
    passwordHash: 'password123',
  }).returning().get();

  const userSales2 = await db.insert(schema.users).values({
    id: 'user-sales-2',
    roleId: salesRole.id,
    name: 'Siti Rahmawati',
    email: 'siti@salescorp.com',
    phone: '+6281398765432',
    address: 'Jl. Kemang Raya No. 88, Jakarta Selatan',
    joinDate: '2024-06-10',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    status: 'ACTIVE',
    passwordHash: 'password123',
  }).returning().get();

  const userWarehouse = await db.insert(schema.users).values({
    id: 'user-wh-1',
    roleId: warehouseRole.id,
    name: 'Joko Widodo Warehouse',
    email: 'warehouse@salescorp.com',
    phone: '+6281555666777',
    address: 'Kawasan Industri Pulogadung Blok C-4, Jakarta Timur',
    joinDate: '2023-08-20',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    status: 'ACTIVE',
    passwordHash: 'password123',
  }).returning().get();

  console.log('📦 Creating Items with Dynamic Attributes (EAV/JSON) & Multi-tier Units...');
  
  // Item 1: Indomie Goreng
  const indomie = await db.insert(schema.items).values({
    id: 'item-indomie-grg',
    sku: 'FMCG-INDO-001',
    name: 'Indomie Mi Goreng Spesial 85g',
    category: 'Instant Noodles',
    baseUnit: 'PCS',
    basePrice: 3100,
    imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400',
    dynamicAttributes: [
      { key: 'brand', label: 'Brand Principal', type: 'text', value: 'Indofood CBP' },
      { key: 'flavor', label: 'Varian Rasa', type: 'text', value: 'Original Spesial' },
      { key: 'expired_date', label: 'Tanggal Kadaluarsa', type: 'date', value: '2026-12-31' },
      { key: 'halal_certified', label: 'Sertifikasi Halal', type: 'boolean', value: true },
      { key: 'shelf_life_months', label: 'Masa Simpan (Bulan)', type: 'number', value: 12 },
    ],
    stockWarehouse: 2400, // 60 Dus
  }).returning().get();

  await db.insert(schema.itemUnits).values([
    {
      itemId: indomie.id,
      unitName: 'BOX', // 1 Dus = 40 Pcs
      conversionRate: 40,
      price: 120000, // Discounted from 40*3100 = 124,000
      isDefault: true,
    },
    {
      itemId: indomie.id,
      unitName: 'CARTON', // 1 Karton = 80 Pcs (2 Dus)
      conversionRate: 80,
      price: 238000,
      isDefault: false,
    },
  ]);

  // Item 2: Ultra Milk Full Cream
  const ultraMilk = await db.insert(schema.items).values({
    id: 'item-ultra-milk-1l',
    sku: 'BEV-ULTRA-002',
    name: 'Ultra Milk UHT Full Cream 1000ml',
    category: 'Beverages / Dairy',
    baseUnit: 'PCS',
    basePrice: 19500,
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400',
    dynamicAttributes: [
      { key: 'brand', label: 'Brand', type: 'text', value: 'Ultrajaya' },
      { key: 'volume', label: 'Volume Bersih', type: 'text', value: '1000 ml' },
      { key: 'storage_temp', label: 'Suhu Penyimpanan', type: 'select', value: 'Room Temp / Chilled', options: ['Room Temp', 'Room Temp / Chilled', 'Frozen'] },
      { key: 'fat_content_percent', label: 'Kandungan Lemak (%)', type: 'number', value: 3.5 },
    ],
    stockWarehouse: 850,
  }).returning().get();

  await db.insert(schema.itemUnits).values([
    {
      itemId: ultraMilk.id,
      unitName: 'KARTON', // 1 Karton = 12 Pcs
      conversionRate: 12,
      price: 228000,
      isDefault: true,
    },
  ]);

  // Item 3: Teh Botol Sosro
  const tehBotol = await db.insert(schema.items).values({
    id: 'item-teh-botol-250',
    sku: 'BEV-SOSRO-003',
    name: 'Teh Botol Sosro Kotak 250ml',
    category: 'Beverages / Tea',
    baseUnit: 'PCS',
    basePrice: 3500,
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400',
    dynamicAttributes: [
      { key: 'brand', label: 'Brand', type: 'text', value: 'Sosro' },
      { key: 'sugar_level', label: 'Kadar Gula', type: 'select', value: 'Normal', options: ['Less Sugar', 'Normal', 'No Sugar'] },
      { key: 'expired_date', label: 'Tanggal Kadaluarsa', type: 'date', value: '2026-10-15' },
    ],
    stockWarehouse: 1200,
  }).returning().get();

  await db.insert(schema.itemUnits).values([
    {
      itemId: tehBotol.id,
      unitName: 'CRATE', // 1 Krat = 24 Pcs
      conversionRate: 24,
      price: 80000,
      isDefault: true,
    },
  ]);

  // Item 4: Kopi Kapal Api Special Mix
  const kopiKapalApi = await db.insert(schema.items).values({
    id: 'item-kopi-kapal-api',
    sku: 'FMCG-KOPI-004',
    name: 'Kopi Kapal Api Special Mix 24g',
    category: 'Coffee & Tea',
    baseUnit: 'PCS',
    basePrice: 1500,
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400',
    dynamicAttributes: [
      { key: 'brand', label: 'Brand', type: 'text', value: 'Kapal Api' },
      { key: 'packaging_type', label: 'Kemasan', type: 'text', value: 'Sachet Sachet Renceng' },
      { key: 'expired_date', label: 'Tanggal Kadaluarsa', type: 'date', value: '2027-02-01' },
    ],
    stockWarehouse: 5000,
  }).returning().get();

  await db.insert(schema.itemUnits).values([
    {
      itemId: kopiKapalApi.id,
      unitName: 'RENCENG', // 1 Renceng = 10 Pcs
      conversionRate: 10,
      price: 14000,
      isDefault: true,
    },
    {
      itemId: kopiKapalApi.id,
      unitName: 'DUS', // 1 Dus = 120 Pcs (12 Renceng)
      conversionRate: 120,
      price: 160000,
      isDefault: false,
    },
  ]);

  // Item 5: Rinso Deterjen Cair
  const rinso = await db.insert(schema.items).values({
    id: 'item-rinso-molto',
    sku: 'HOU-RINSO-005',
    name: 'Rinso Molto Deterjen Cair 750ml Refill',
    category: 'Household & Laundry',
    baseUnit: 'PCS',
    basePrice: 18500,
    imageUrl: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400',
    dynamicAttributes: [
      { key: 'brand', label: 'Brand', type: 'text', value: 'Unilever Rinso' },
      { key: 'fragrance', label: 'Aroma', type: 'text', value: 'Rose Fresh & Perfume Essence' },
      { key: 'variant', label: 'Tipe', type: 'select', value: 'Anti Noda + Molto', options: ['Anti Noda', 'Anti Noda + Molto', 'Micellar Soft'] },
    ],
    stockWarehouse: 400,
  }).returning().get();

  await db.insert(schema.itemUnits).values([
    {
      itemId: rinso.id,
      unitName: 'DUS', // 1 Dus = 12 Pcs
      conversionRate: 12,
      price: 215000,
      isDefault: true,
    },
  ]);

  console.log('📋 Recording Initial Stock Mutations...');
  await db.insert(schema.stockMutations).values([
    {
      itemId: indomie.id,
      type: 'IN',
      quantity: 2400,
      notes: 'Initial warehouse opening stock PO#202609-01',
      performedBy: userWarehouse.id,
    },
    {
      itemId: ultraMilk.id,
      type: 'IN',
      quantity: 850,
      notes: 'Initial warehouse opening stock PO#202609-02',
      performedBy: userWarehouse.id,
    },
    {
      itemId: tehBotol.id,
      type: 'IN',
      quantity: 1200,
      notes: 'Initial warehouse opening stock PO#202609-03',
      performedBy: userWarehouse.id,
    },
    {
      itemId: kopiKapalApi.id,
      type: 'IN',
      quantity: 5000,
      notes: 'Initial warehouse opening stock PO#202609-04',
      performedBy: userWarehouse.id,
    },
    {
      itemId: rinso.id,
      type: 'IN',
      quantity: 400,
      notes: 'Initial warehouse opening stock PO#202609-05',
      performedBy: userWarehouse.id,
    },
  ]);

  console.log('🚚 Assigning Demo Stock to Sales Reps (Field Car/Bag Inventory)...');
  // Assign Budi stock: 120 Indomie (3 dus), 36 Ultra Milk (3 karton), 48 Teh Botol (2 crate), 300 Kopi (2.5 dus)
  await db.insert(schema.salesStock).values([
    {
      userId: userSales1.id,
      itemId: indomie.id,
      quantity: 120, // 3 Boxes
    },
    {
      userId: userSales1.id,
      itemId: ultraMilk.id,
      quantity: 36, // 3 Cartons
    },
    {
      userId: userSales1.id,
      itemId: tehBotol.id,
      quantity: 48, // 2 Crates
    },
    {
      userId: userSales1.id,
      itemId: kopiKapalApi.id,
      quantity: 300,
    },
    {
      userId: userSales1.id,
      itemId: rinso.id,
      quantity: 24,
    },
  ]);

  // Record mutation for assignment
  await db.insert(schema.stockMutations).values([
    {
      itemId: indomie.id,
      type: 'ASSIGN_TO_SALES',
      quantity: -120,
      referenceId: userSales1.id,
      notes: 'Dispatched to Sales Budi Santoso (Van #B-1234-XYZ)',
      performedBy: userWarehouse.id,
    },
    {
      itemId: ultraMilk.id,
      type: 'ASSIGN_TO_SALES',
      quantity: -36,
      referenceId: userSales1.id,
      notes: 'Dispatched to Sales Budi Santoso (Van #B-1234-XYZ)',
      performedBy: userWarehouse.id,
    },
  ]);

  console.log('🏪 Creating Toko / Stores Database...');
  const store1 = await db.insert(schema.stores).values({
    id: 'store-berkah-jaya',
    code: 'TKO-001',
    name: 'Toko Kelontong Berkah Jaya',
    ownerName: 'Haji Ahmad Fauzi',
    phone: '+6281211223344',
    address: 'Jl. Palmerah Barat No. 18, RT 02/05, Jakarta Barat',
    latitude: -6.2088,
    longitude: 106.7972,
    assignedSalesId: userSales1.id,
    targetMonthlySales: 15000000,
    imageUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400',
    status: 'ACTIVE',
  }).returning().get();

  const store2 = await db.insert(schema.stores).values({
    id: 'store-sumber-rezeki',
    code: 'TKO-002',
    name: 'Minimarket Sumber Rezeki',
    ownerName: 'Ibu Linda Susanti',
    phone: '+6281388776655',
    address: 'Jl. Kebayoran Lama No. 42, Kebayoran Lama, Jakarta Selatan',
    latitude: -6.2345,
    longitude: 106.7842,
    assignedSalesId: userSales1.id,
    targetMonthlySales: 22000000,
    imageUrl: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=400',
    status: 'ACTIVE',
  }).returning().get();

  const store3 = await db.insert(schema.stores).values({
    id: 'store-makmur-abadi',
    code: 'TKO-003',
    name: 'Grosir Makmur Abadi',
    ownerName: 'Ko Hendra Wijaya',
    phone: '+6281900112233',
    address: 'Jl. Pos Pengumben Raya No. 10B, Kebon Jeruk, Jakarta Barat',
    latitude: -6.2198,
    longitude: 106.7725,
    assignedSalesId: userSales1.id,
    targetMonthlySales: 35000000,
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400',
    status: 'ACTIVE',
  }).returning().get();

  const store4 = await db.insert(schema.stores).values({
    id: 'store-warung-barokah',
    code: 'TKO-004',
    name: 'Warung Barokah 24 Jam',
    ownerName: 'Pak Dedi Mulyadi',
    phone: '+628176543210',
    address: 'Jl. Rawa Belong No. 89, Palmerah, Jakarta Barat',
    latitude: -6.2023,
    longitude: 106.7811,
    assignedSalesId: userSales2.id,
    targetMonthlySales: 8000000,
    imageUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400',
    status: 'ACTIVE',
  }).returning().get();

  console.log('🎯 Setting Monthly Sales Targets...');
  await db.insert(schema.salesTargets).values([
    {
      userId: userSales1.id,
      storeId: store1.id,
      targetAmount: 15000000,
      targetQuantity: 200,
      periodMonth: 9,
      periodYear: 2026,
    },
    {
      userId: userSales1.id,
      storeId: store2.id,
      targetAmount: 22000000,
      targetQuantity: 300,
      periodMonth: 9,
      periodYear: 2026,
    },
    {
      userId: userSales1.id,
      storeId: store3.id,
      targetAmount: 35000000,
      targetQuantity: 450,
      periodMonth: 9,
      periodYear: 2026,
    },
  ]);

  console.log('🗺️ Creating Today Itinerary & Visits for Budi Santoso...');
  const today = new Date().toISOString().split('T')[0];

  const visit1 = await db.insert(schema.storeVisits).values({
    id: 'visit-today-01',
    salesId: userSales1.id,
    storeId: store1.id,
    visitDate: today,
    sequenceOrder: 1,
    status: 'COMPLETED',
    checkinTime: new Date(Date.now() - 3600000 * 3),
    checkoutTime: new Date(Date.now() - 3600000 * 2.5),
    latitude: -6.2088,
    longitude: 106.7972,
    notes: 'Pemilik toko ramah. Memesan 1 Dus Indomie & 1 Karton Ultra Milk.',
  }).returning().get();

  const visit2 = await db.insert(schema.storeVisits).values({
    id: 'visit-today-02',
    salesId: userSales1.id,
    storeId: store2.id,
    visitDate: today,
    sequenceOrder: 2,
    status: 'CHECKED_IN',
    checkinTime: new Date(Date.now() - 1800000),
    latitude: -6.2345,
    longitude: 106.7842,
    notes: 'Sedang proses pengecekan stock rak dan negosiasi order baru.',
  }).returning().get();

  const visit3 = await db.insert(schema.storeVisits).values({
    id: 'visit-today-03',
    salesId: userSales1.id,
    storeId: store3.id,
    visitDate: today,
    sequenceOrder: 3,
    status: 'SCHEDULED',
    notes: 'Jadwal kunjungan siang setelah istirahat.',
  }).returning().get();

  console.log('🧾 Creating Completed Order & Drop/Return Samples for Visit 1...');
  const order1 = await db.insert(schema.visitOrders).values({
    id: 'ord-20260922-001',
    invoiceNumber: 'INV-20260922-001',
    visitId: visit1.id,
    salesId: userSales1.id,
    storeId: store1.id,
    totalAmount: 348000,
    discountAmount: 10000,
    taxAmount: 0,
    netAmount: 338000,
    paymentStatus: 'PAID',
    paymentMethod: 'CASH',
    notes: 'Lunas tunai di tempat. Diterima oleh Pak Haji Ahmad.',
  }).returning().get();

  await db.insert(schema.orderItems).values([
    {
      orderId: order1.id,
      itemId: indomie.id,
      unitName: 'BOX',
      conversionRate: 40,
      quantity: 1,
      quantityBase: 40,
      unitPrice: 120000,
      subtotal: 120000,
    },
    {
      orderId: order1.id,
      itemId: ultraMilk.id,
      unitName: 'KARTON',
      conversionRate: 12,
      quantity: 1,
      quantityBase: 12,
      unitPrice: 228000,
      subtotal: 228000,
    },
  ]);

  // Sample return: 2 Pcs Indomie broken box from past batch, 1 Pcs Ultra Milk good condition re-stocked
  await db.insert(schema.returnItems).values([
    {
      orderId: order1.id,
      visitId: visit1.id,
      salesId: userSales1.id,
      storeId: store1.id,
      itemId: indomie.id,
      unitName: 'PCS',
      conversionRate: 1,
      quantity: 2,
      quantityBase: 2,
      condition: 'BROKEN',
      reason: 'Kemasan sobek dari pengiriman sebelumnya',
      restocked: false,
    },
    {
      orderId: order1.id,
      visitId: visit1.id,
      salesId: userSales1.id,
      storeId: store1.id,
      itemId: ultraMilk.id,
      unitName: 'PCS',
      conversionRate: 1,
      quantity: 1,
      quantityBase: 1,
      condition: 'GOOD',
      reason: 'Kelebihan stok toko kemarin, ditukar varian',
      restocked: true,
    },
  ]);

  console.log('✅ Seeding completed successfully!');
  console.log('---------------------------------------------------------');
  console.log('Demo Login Accounts:');
  console.log('1. Superadmin : admin@salescorp.com    / password123');
  console.log('2. Sales Rep  : budi@salescorp.com     / password123');
  console.log('3. Sales Rep 2: siti@salescorp.com     / password123');
  console.log('4. Warehouse  : warehouse@salescorp.com / password123');
  console.log('---------------------------------------------------------');
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});

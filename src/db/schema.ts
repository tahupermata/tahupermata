import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

// ==========================================
// 1. RBAC (Roles & Permissions)
// ==========================================
export const roles = sqliteTable('roles', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(), // e.g. "Superadmin", "Admin", "Sales", "Warehouse"
  description: text('description'),
  // Array of permission strings e.g. ["stock:view", "stock:manage", "sales:field", "monitor:view", "reports:view"]
  permissions: text('permissions', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  roleId: text('role_id').notNull().references(() => roles.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  address: text('address'),
  joinDate: text('join_date'), // YYYY-MM-DD
  avatarUrl: text('avatar_url'),
  status: text('status', { enum: ['ACTIVE', 'INACTIVE'] }).default('ACTIVE').notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ==========================================
// 2. Dynamic Items & Multi-tier Units (EAV / JSONB Pattern)
// ==========================================
export interface DynamicAttribute {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  value: string | number | boolean | null;
  options?: string[]; // for select type
}

export const items = sqliteTable('items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull().default('General'),
  baseUnit: text('base_unit').notNull().default('PCS'), // e.g. "PCS", "KG", "LITER"
  basePrice: real('base_price').notNull().default(0), // Price per base unit
  imageUrl: text('image_url'),
  // Dynamic EAV attributes stored as structured JSON array/object
  dynamicAttributes: text('dynamic_attributes', { mode: 'json' }).$type<DynamicAttribute[]>().notNull().default(sql`'[]'`),
  stockWarehouse: integer('stock_warehouse').notNull().default(0), // Quantity in base unit
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const itemUnits = sqliteTable('item_units', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  itemId: text('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  unitName: text('unit_name').notNull(), // e.g. "BOX", "PACK", "CARTON", "LUSIN"
  conversionRate: integer('conversion_rate').notNull(), // How many baseUnits equal 1 of this unit (e.g. 1 Box = 24 PCS)
  price: real('price'), // Optional explicit price override for this unit; if null, basePrice * conversionRate
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const itemBatches = sqliteTable('item_batches', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  itemId: text('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  batchNo: text('batch_no').notNull(),
  expireDate: text('expire_date').notNull(), // YYYY-MM-DD
  initialQuantity: integer('initial_quantity').notNull().default(0), // in base units
  currentQuantity: integer('current_quantity').notNull().default(0), // in base units
  unitName: text('unit_name').default('PCS'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ==========================================
// 3. Warehouse Stock Mutations & Sales Rep Assigned Stock
// ==========================================
export const stockMutations = sqliteTable('stock_mutations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  itemId: text('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  batchId: text('batch_id').references(() => itemBatches.id, { onDelete: 'set null' }),
  type: text('type', { 
    enum: ['IN', 'OUT', 'ADJUSTMENT', 'ASSIGN_TO_SALES', 'RETURN_FROM_SALES'] 
  }).notNull(),
  quantity: integer('quantity').notNull(), // In base unit (positive or negative)
  unitId: text('unit_id'), // Optional unit used when entered
  referenceId: text('reference_id'), // e.g. sales rep user_id, order_id, or adjustment code
  notes: text('notes'),
  performedBy: text('performed_by').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const salesStock = sqliteTable('sales_stock', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull().references(() => items.id, { onDelete: 'cascade' }),
  batchId: text('batch_id').references(() => itemBatches.id, { onDelete: 'set null' }),
  quantity: integer('quantity').notNull().default(0), // Total base units currently held by sales rep
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ==========================================
// 4. Toko / Store Management & Targets
// ==========================================
export const stores = sqliteTable('stores', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  code: text('code').notNull().unique(), // e.g. "TKO-001"
  name: text('name').notNull(),
  ownerName: text('owner_name'),
  phone: text('phone'),
  address: text('address').notNull(),
  mapUrl: text('map_url'), // Google Maps Share URL (e.g. https://maps.app.goo.gl/...)
  latitude: real('latitude'),
  longitude: real('longitude'),
  assignedSalesId: text('assigned_sales_id').references(() => users.id, { onDelete: 'set null' }),
  targetMonthlySales: real('target_monthly_sales').default(0),
  defaultDailyTargetQty: integer('default_daily_target_qty').default(0),
  imageUrl: text('image_url'),
  status: text('status', { enum: ['ACTIVE', 'INACTIVE'] }).default('ACTIVE').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const salesTargets = sqliteTable('sales_targets', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  storeId: text('store_id').references(() => stores.id, { onDelete: 'cascade' }),
  targetAmount: real('target_amount').notNull().default(0),
  targetQuantity: integer('target_quantity').default(0),
  periodMonth: integer('period_month').notNull(), // 1 - 12
  periodYear: integer('period_year').notNull(), // e.g. 2026
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ==========================================
// 5. Store Visits (Daily Itinerary)
// ==========================================
export const storeVisits = sqliteTable('store_visits', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  salesId: text('sales_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  storeId: text('store_id').notNull().references(() => stores.id, { onDelete: 'cascade' }),
  visitDate: text('visit_date').notNull(), // YYYY-MM-DD
  deliveryDate: text('delivery_date'), // Tanggal Pengantaran / Pengiriman (default = visitDate)
  billingDate: text('billing_date'), // Tanggal Penagihan / Bill Date / Jatuh Tempo
  assignedItemId: text('assigned_item_id').references(() => items.id, { onDelete: 'set null' }),
  assignedStockQty: integer('assigned_stock_qty').default(0), // Jumlah stok spesifik yang di-assign untuk toko ini
  sequenceOrder: integer('sequence_order').default(1),
  targetQuantity: integer('target_quantity').default(0), // Target pengiriman harian (pcs) untuk kunjungan ini
  status: text('status', { 
    enum: ['SCHEDULED', 'CHECKED_IN', 'COMPLETED', 'SKIPPED'] 
  }).notNull().default('SCHEDULED'),
  checkinTime: integer('checkin_time', { mode: 'timestamp' }),
  checkoutTime: integer('checkout_time', { mode: 'timestamp' }),
  latitude: real('latitude'),
  longitude: real('longitude'),
  notes: text('notes'),
  photoUrl: text('photo_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ==========================================
// 6. Visit Orders & Drop / Return System
// ==========================================
export const visitOrders = sqliteTable('visit_orders', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  invoiceNumber: text('invoice_number').notNull().unique(), // e.g. "INV-20260922-001"
  visitId: text('visit_id').references(() => storeVisits.id, { onDelete: 'set null' }),
  salesId: text('sales_id').notNull().references(() => users.id),
  storeId: text('store_id').notNull().references(() => stores.id),
  transactionType: text('transaction_type', {
    enum: ['DIRECT_DROP_BILL', 'DROP_AND_COLLECT_PREV', 'DROP_ONLY', 'COLLECT_ONLY']
  }).default('DIRECT_DROP_BILL'),
  totalAmount: real('total_amount').notNull().default(0),
  discountAmount: real('discount_amount').notNull().default(0),
  taxAmount: real('tax_amount').notNull().default(0),
  netAmount: real('net_amount').notNull().default(0),
  collectedAmount: real('collected_amount').default(0), // Total uang (cash/transfer) yang diterima sales hari ini
  settledInvoiceIds: text('settled_invoice_ids'), // JSON array or comma separated ID nota lama yang dilunasi
  paymentStatus: text('payment_status', { 
    enum: ['PAID', 'PENDING', 'PARTIAL'] 
  }).notNull().default('PAID'),
  paymentMethod: text('payment_method', { 
    enum: ['CASH', 'TRANSFER', 'TEMPO'] 
  }).notNull().default('CASH'),
  paymentProofUrl: text('payment_proof_url'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: text('order_id').notNull().references(() => visitOrders.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull().references(() => items.id),
  unitId: text('unit_id'), // reference to item_units or base unit
  unitName: text('unit_name').notNull(),
  conversionRate: integer('conversion_rate').notNull().default(1),
  quantity: integer('quantity').notNull(), // Quantity in selected unit
  quantityBase: integer('quantity_base').notNull(), // quantity * conversionRate
  unitPrice: real('unit_price').notNull(),
  subtotal: real('subtotal').notNull(),
});

export const returnItems = sqliteTable('return_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  orderId: text('order_id').references(() => visitOrders.id, { onDelete: 'cascade' }),
  visitId: text('visit_id').references(() => storeVisits.id, { onDelete: 'cascade' }),
  salesId: text('sales_id').notNull().references(() => users.id),
  storeId: text('store_id').notNull().references(() => stores.id),
  itemId: text('item_id').notNull().references(() => items.id),
  unitName: text('unit_name').notNull().default('PCS'),
  conversionRate: integer('conversion_rate').notNull().default(1),
  quantity: integer('quantity').notNull(), // in selected unit
  quantityBase: integer('quantity_base').notNull(), // in base unit
  unitPrice: integer('unit_price').notNull().default(0),
  subtotal: integer('subtotal').notNull().default(0),
  condition: text('condition', { enum: ['GOOD', 'BROKEN'] }).notNull().default('GOOD'),
  reason: text('reason'),
  restocked: integer('restocked', { mode: 'boolean' }).notNull().default(false), // If GOOD, restocked to sales stock
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// ==========================================
// Table Relations Definitions
// ==========================================
export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  assignedStores: many(stores),
  salesStock: many(salesStock),
  storeVisits: many(storeVisits),
  orders: many(visitOrders),
  returns: many(returnItems),
}));

export const itemsRelations = relations(items, ({ many }) => ({
  units: many(itemUnits),
  batches: many(itemBatches),
  mutations: many(stockMutations),
  salesStock: many(salesStock),
  orderItems: many(orderItems),
  returnItems: many(returnItems),
}));

export const itemBatchesRelations = relations(itemBatches, ({ one, many }) => ({
  item: one(items, {
    fields: [itemBatches.itemId],
    references: [items.id],
  }),
  salesStock: many(salesStock),
  mutations: many(stockMutations),
}));

export const itemUnitsRelations = relations(itemUnits, ({ one }) => ({
  item: one(items, {
    fields: [itemUnits.itemId],
    references: [items.id],
  }),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
  assignedSales: one(users, {
    fields: [stores.assignedSalesId],
    references: [users.id],
  }),
  visits: many(storeVisits),
  orders: many(visitOrders),
  targets: many(salesTargets),
}));

export const storeVisitsRelations = relations(storeVisits, ({ one, many }) => ({
  sales: one(users, {
    fields: [storeVisits.salesId],
    references: [users.id],
  }),
  store: one(stores, {
    fields: [storeVisits.storeId],
    references: [stores.id],
  }),
  assignedItem: one(items, {
    fields: [storeVisits.assignedItemId],
    references: [items.id],
  }),
  orders: many(visitOrders),
  returns: many(returnItems),
}));

export const visitOrdersRelations = relations(visitOrders, ({ one, many }) => ({
  visit: one(storeVisits, {
    fields: [visitOrders.visitId],
    references: [storeVisits.id],
  }),
  store: one(stores, {
    fields: [visitOrders.storeId],
    references: [stores.id],
  }),
  sales: one(users, {
    fields: [visitOrders.salesId],
    references: [users.id],
  }),
  items: many(orderItems),
  returns: many(returnItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(visitOrders, {
    fields: [orderItems.orderId],
    references: [visitOrders.id],
  }),
  item: one(items, {
    fields: [orderItems.itemId],
    references: [items.id],
  }),
}));

export const returnItemsRelations = relations(returnItems, ({ one }) => ({
  order: one(visitOrders, {
    fields: [returnItems.orderId],
    references: [visitOrders.id],
  }),
  visit: one(storeVisits, {
    fields: [returnItems.visitId],
    references: [storeVisits.id],
  }),
  sales: one(users, {
    fields: [returnItems.salesId],
    references: [users.id],
  }),
  store: one(stores, {
    fields: [returnItems.storeId],
    references: [stores.id],
  }),
  item: one(items, {
    fields: [returnItems.itemId],
    references: [items.id],
  }),
}));

export const stockMutationsRelations = relations(stockMutations, ({ one }) => ({
  item: one(items, {
    fields: [stockMutations.itemId],
    references: [items.id],
  }),
  batch: one(itemBatches, {
    fields: [stockMutations.batchId],
    references: [itemBatches.id],
  }),
  performedByUser: one(users, {
    fields: [stockMutations.performedBy],
    references: [users.id],
  }),
}));

export const salesStockRelations = relations(salesStock, ({ one }) => ({
  user: one(users, {
    fields: [salesStock.userId],
    references: [users.id],
  }),
  item: one(items, {
    fields: [salesStock.itemId],
    references: [items.id],
  }),
  batch: one(itemBatches, {
    fields: [salesStock.batchId],
    references: [itemBatches.id],
  }),
}));

export const salesTargetsRelations = relations(salesTargets, ({ one }) => ({
  user: one(users, {
    fields: [salesTargets.userId],
    references: [users.id],
  }),
  store: one(stores, {
    fields: [salesTargets.storeId],
    references: [stores.id],
  }),
}));

// ==========================================
// 7. Company Settings & Profile Configuration
// ==========================================
export const companySettings = sqliteTable('company_settings', {
  id: text('id').primaryKey().$defaultFn(() => 'default'),
  companyName: text('company_name').notNull().default('DISTRIBUSI TAHU SUPER'),
  tagline: text('tagline').default('Pusat Distribusi & Pemasaran Produk Tahu Berkualitas'),
  address: text('address').default('Jl. Industri Pangan Raya No. 88, Sentra Distribusi'),
  phone: text('phone').default('0812-3456-7890'),
  email: text('email').default('operasional@tahusuper.id'),
  logoUrl: text('logo_url'),
  invoiceFooterNote: text('invoice_footer_note').default('Dokumen ini merupakan bukti transaksi sah dari PT Distribusi Tahu Super.'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});



import { db } from './index';
import * as schema from './schema';
import * as dotenv from 'dotenv';
import { eq, sql } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function createMasterUser() {
  console.log('👑 Creating / Updating Master Account...');

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
      avatarUrl TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      password_hash TEXT NOT NULL,
      created_at INTEGER
    );
  `);

  // Ensure Superadmin Role exists
  let superadminRole = await db.query.roles.findFirst({
    where: eq(schema.roles.id, 'role-superadmin'),
  });

  if (!superadminRole) {
    superadminRole = await db.insert(schema.roles).values({
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
    console.log('✅ Superadmin role created.');
  }

  const email = 'tahupermata@proton.me';
  const password = 'tahupermata@123A!';
  const name = 'Master Tahu Permata';

  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });

  if (existingUser) {
    await db.update(schema.users)
      .set({
        name,
        roleId: superadminRole.id,
        passwordHash: password,
        status: 'ACTIVE',
      })
      .where(eq(schema.users.id, existingUser.id));
    console.log(`✅ User ${email} already existed and has been updated to Superadmin role with new password.`);
  } else {
    const newUser = await db.insert(schema.users).values({
      id: 'user-master-tahupermata',
      roleId: superadminRole.id,
      name,
      email,
      phone: '+628123456789',
      address: 'Kantor Pusat Tahu Permata',
      joinDate: new Date().toISOString().split('T')[0],
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      status: 'ACTIVE',
      passwordHash: password,
    }).returning().get();
    console.log(`✅ Master user created successfully! ID: ${newUser.id}, Email: ${newUser.email}`);
  }

  console.log('---------------------------------------------------------');
  console.log('Login Credentials:');
  console.log(`Email    : ${email}`);
  console.log(`Password : ${password}`);
  console.log(`Role     : Superadmin / Master`);
  console.log('---------------------------------------------------------');
}

createMasterUser().catch((err) => {
  console.error('❌ Failed to create master user:', err);
  process.exit(1);
});

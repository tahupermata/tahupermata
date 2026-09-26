import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

let url = process.env.TURSO_DATABASE_URL || 'file:local.db';
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

// Convert libsql:// to https:// for fast, reliable stateless HTTP requests
if (url.startsWith('libsql://')) {
  url = url.replace('libsql://', 'https://');
}

export const client = createClient({
  url,
  authToken,
});

export const db = drizzle(client, { schema });
export * from './schema';

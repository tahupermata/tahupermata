'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

const SESSION_COOKIE_NAME = 'sales_mgmt_session_user_id';

export async function switchUserAction(userId: string) {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, userId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function loginAction(prevState: any, formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '').trim();

  if (!email || !password) {
    return { error: 'Email dan password wajib diisi.' };
  }

  const allUsers = await db.query.users.findMany();
  const user = allUsers.find(
    (u) => u.email.trim().toLowerCase() === email
  );

  if (!user) {
    return { error: 'Email atau password salah.' };
  }

  if (user.passwordHash !== password) {
    return { error: 'Email atau password salah.' };
  }

  if (user.status === 'INACTIVE') {
    return { error: 'Akun Anda sedang dinonaktifkan. Hubungi admin.' };
  }

  const isProd = process.env.NODE_ENV === 'production';
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, user.id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd,
    maxAge: 60 * 60 * 24 * 30,
  });

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  revalidatePath('/', 'layout');
  redirect('/login');
}


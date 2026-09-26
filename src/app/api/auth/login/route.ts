import { NextResponse } from 'next/server';
import { db } from '@/db';
import { cookies } from 'next/headers';

const SESSION_COOKIE_NAME = 'sales_mgmt_session_user_id';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '').trim();

    if (!cleanEmail || !cleanPassword) {
      return NextResponse.json({ error: 'Email dan password wajib diisi.' }, { status: 400 });
    }

    const allUsers = await db.query.users.findMany();
    const user = allUsers.find(
      (u) => u.email.trim().toLowerCase() === cleanEmail
    );

    if (!user) {
      return NextResponse.json({ error: 'Email atau password salah.' }, { status: 401 });
    }

    if (user.passwordHash !== cleanPassword) {
      return NextResponse.json({ error: 'Email atau password salah.' }, { status: 401 });
    }

    if (user.status === 'INACTIVE') {
      return NextResponse.json({ error: 'Akun Anda sedang dinonaktifkan. Hubungi admin.' }, { status: 403 });
    }

    // Set cookie on both headers and response
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, user.id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });

    // Explicitly set cookie on NextResponse for mobile/network HTTP browsers
    response.cookies.set(SESSION_COOKIE_NAME, user.id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: 'Terjadi kesalahan server saat login.' }, { status: 500 });
  }
}


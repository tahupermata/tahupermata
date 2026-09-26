import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static files, api routes, icons, and login page
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.') ||
    pathname === '/login'
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('sales_mgmt_session_user_id');

  // If unauthenticated and trying to access protected dashboard routes, redirect to login
  if (!sessionCookie?.value) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};


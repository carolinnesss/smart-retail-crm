import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import {
  SESSION_COOKIE_NAME,
  KASIR_SESSION_COOKIE_NAME,
  CUSTOMER_SESSION_COOKIE_NAME,
} from './src/lib/auth/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Skip static assets, Next internal files, and diagnostic test-runner
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname === '/favicon.ico' ||
    pathname === '/api/test-runner'
  ) {
    return NextResponse.next();
  }

  // 2. Redirect legacy /kasir or /kasir/* to /login or /persetujuan
  if (pathname.startsWith('/kasir/persetujuan')) {
    return NextResponse.redirect(new URL('/persetujuan', request.url));
  }
  if (pathname === '/kasir' || pathname.startsWith('/kasir/')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Define public auth endpoints
  const isPublicAuthRoute =
    pathname === '/login' ||
    pathname === '/pelanggan/login' ||
    pathname === '/pelanggan/register' ||
    pathname === '/api/auth/login' ||
    pathname === '/api/pelanggan/login' ||
    pathname === '/api/pelanggan/register';

  const isSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
  );

  let isOwnerAuthenticated = false;
  let isOwnerActive = true;

  let isCustomerAuthenticated = false;
  let customerAccountId: string | null = null;

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 4. Resolve Owner Session
  if (isSupabase) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options) {
            request.cookies.set({ name, value, ...options });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options) {
            request.cookies.set({ name, value: '', ...options });
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            });
            response.cookies.set({ name, value: '', ...options });
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      isOwnerAuthenticated = true;
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single();

      if (profile) {
        isOwnerActive = profile.is_active !== false;
      }
    }
  } else {
    // Zero-Config Mock Auth for Owner
    const staffCookie =
      request.cookies.get(SESSION_COOKIE_NAME) ||
      request.cookies.get(KASIR_SESSION_COOKIE_NAME);

    if (staffCookie?.value) {
      try {
        const decoded = JSON.parse(
          Buffer.from(staffCookie.value, 'base64').toString('utf-8')
        );
        if (decoded?.userId) {
          isOwnerAuthenticated = true;
          if (decoded.isActive === false) {
            isOwnerActive = false;
          }
        }
      } catch {
        isOwnerAuthenticated = false;
      }
    }
  }

  // 5. Resolve Customer Session
  const customerCookie = request.cookies.get(CUSTOMER_SESSION_COOKIE_NAME);
  if (customerCookie?.value) {
    try {
      const decodedCust = JSON.parse(
        Buffer.from(customerCookie.value, 'base64').toString('utf-8')
      );
      if (decodedCust?.accountId && decodedCust.role === 'CUSTOMER') {
        isCustomerAuthenticated = true;
        customerAccountId = decodedCust.accountId;
      }
    } catch {
      isCustomerAuthenticated = false;
    }
  }

  // 6. Handle Public Auth Routes Redirection if already authenticated
  if (isPublicAuthRoute) {
    if (pathname === '/login' && isOwnerAuthenticated && isOwnerActive) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    if ((pathname === '/pelanggan/login' || pathname === '/pelanggan/register') && isCustomerAuthenticated) {
      return NextResponse.redirect(new URL('/pelanggan/portal', request.url));
    }
    return response;
  }

  // 7. Route Guard for Customer Portal (/pelanggan/*)
  if (pathname.startsWith('/pelanggan/')) {
    if (!isCustomerAuthenticated) {
      const custLoginUrl = new URL('/pelanggan/login', request.url);
      custLoginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(custLoginUrl);
    }
    return response;
  }

  // 8. Route Guard for Customer API (/api/pelanggan/*)
  if (pathname.startsWith('/api/pelanggan/')) {
    if (!isCustomerAuthenticated) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Sesi pelanggan tidak valid atau belum login.' },
        { status: 401 }
      );
    }
    return response;
  }

  // 9. Strict Isolation: If user is authenticated as CUSTOMER only, BLOCK from owner pages & owner APIs
  if (isCustomerAuthenticated && !isOwnerAuthenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        {
          success: false,
          error: `Akses ditolak: Peran Pelanggan (CUSTOMER) dilarang mengakses fungsi Owner (${pathname}).`,
        },
        { status: 403 }
      );
    }
    return NextResponse.redirect(new URL('/pelanggan/portal', request.url));
  }

  // 10. Public Landing Page (/) is accessible to all
  if (pathname === '/') {
    return response;
  }

  // 11. Owner Route Protection (/dashboard, /pos, /crm, /inventory, /radar, /audit, /persetujuan, /api/*)
  if (!isOwnerAuthenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Sesi Owner tidak valid atau belum login.' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 12. Inactive Owner Protection
  if (!isOwnerActive) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Akun Anda telah dinonaktifkan.' },
        { status: 403 }
      );
    }
    const kickUrl = new URL('/login', request.url);
    kickUrl.searchParams.set('error', 'inactive');
    const kickResponse = NextResponse.redirect(kickUrl);
    kickResponse.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: '',
      maxAge: 0,
      path: '/',
    });
    return kickResponse;
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

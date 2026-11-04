import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase';
import { loginMockUser, isMockAuthAllowed } from '@/lib/auth/mock-auth';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { createServerClient } from '@supabase/ssr';

// In-memory rate limiting map (IP / email based)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record) return true;

  if (now > record.resetAt) {
    loginAttempts.delete(key);
    return true;
  }

  return record.count < MAX_ATTEMPTS;
}

function recordFailedAttempt(key: string) {
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record || now > record.resetAt) {
    loginAttempts.set(key, { count: 1, resetAt: now + LOCKOUT_WINDOW_MS });
  } else {
    record.count += 1;
  }
}

function clearRateLimit(key: string) {
  loginAttempts.delete(key);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email dan kata sandi wajib diisi.' },
        { status: 400 }
      );
    }

    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown-ip';
    const rateLimitKey = `${clientIp}:${email.toLowerCase().trim()}`;

    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Terlalu banyak percobaan login yang gagal. Demi keamanan, akun terkunci sementara. Silakan coba lagi dalam 15 menit.',
        },
        { status: 429 }
      );
    }

    // --- Mode 1: Supabase Connected Mode ---
    if (isSupabaseConfigured()) {
      let response = NextResponse.json({ success: true, message: 'Login berhasil.' });

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value;
            },
            set(name: string, value: string, options) {
              response.cookies.set({ name, value, ...options });
            },
            remove(name: string, options) {
              response.cookies.set({ name, value: '', ...options });
            },
          },
        }
      );

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (authError || !authData.user) {
        recordFailedAttempt(rateLimitKey);
        return NextResponse.json(
          {
            success: false,
            error: 'Email atau kata sandi tidak valid.',
          },
          { status: 401 }
        );
      }

      // Check profile is_active status
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profile && !profile.is_active) {
        await supabase.auth.signOut();
        return NextResponse.json(
          {
            success: false,
            error:
              'Akun Anda dinonaktifkan oleh pemilik toko. Hubungi admin untuk mengaktifkan kembali.',
          },
          { status: 403 }
        );
      }

      clearRateLimit(rateLimitKey);

      return NextResponse.json({
        success: true,
        message: 'Login berhasil.',
        user: {
          id: authData.user.id,
          email: authData.user.email,
        },
        profile,
      });
    }

    // --- Mode 2: Zero-Config Mock Mode ---
    if (isMockAuthAllowed()) {
      const result = await loginMockUser(email, password);

      if (!result.success || !result.session) {
        recordFailedAttempt(rateLimitKey);
        return NextResponse.json(
          { success: false, error: result.error || 'Email atau kata sandi tidak valid.' },
          { status: 401 }
        );
      }

      clearRateLimit(rateLimitKey);

      const response = NextResponse.json({
        success: true,
        message: 'Login demo berhasil.',
        user: result.session.user,
        profile: result.session.profile,
      });

      // Set httpOnly session cookie
      const sessionPayload = Buffer.from(
        JSON.stringify({
          userId: result.session.profile.id,
          role: result.session.profile.role,
          email: result.session.profile.email,
          createdAt: Date.now(),
        })
      ).toString('base64');

      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: sessionPayload,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
      });

      return response;
    }

    return NextResponse.json(
      { success: false, error: 'Layanan autentikasi tidak tersedia.' },
      { status: 500 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memproses login.' },
      { status: 500 }
    );
  }
}

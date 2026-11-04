import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: NextRequest) {
  try {
    const response = NextResponse.json({
      success: true,
      message: 'Berhasil keluar (logout).',
    });

    // 1. Supabase Mode Logout
    if (isSupabaseConfigured()) {
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
      await supabase.auth.signOut();
    }

    // 2. Clear Mock Session Cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: '',
      httpOnly: true,
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memproses logout.' },
      { status: 500 }
    );
  }
}

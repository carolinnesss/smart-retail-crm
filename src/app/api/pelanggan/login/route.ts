import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { authenticateCustomerAccount } from '@/lib/auth/rbac-guard';
import { CUSTOMER_SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { normalizeIndonesianPhone } from '@/lib/whatsapp';

// In-memory rate limiting map (IP / WhatsApp based)
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
    const { whatsapp_number, password } = body;

    if (!whatsapp_number || !password) {
      return NextResponse.json(
        { success: false, error: 'Nomor WhatsApp dan kata sandi wajib diisi.' },
        { status: 400 }
      );
    }

    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown-ip';

    const normalizedPhone = normalizeIndonesianPhone(whatsapp_number) || whatsapp_number;
    const rateLimitKey = `${clientIp}:${normalizedPhone}`;

    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Terlalu banyak percobaan login yang gagal. Demi keamanan, akun terkunci sementara selama 15 menit. Silakan coba lagi nanti.',
        },
        { status: 429 }
      );
    }

    const repo = getRepository();
    const authResult = await authenticateCustomerAccount(repo, whatsapp_number, password);

    if (!authResult.success || !authResult.session) {
      recordFailedAttempt(rateLimitKey);
      return NextResponse.json(
        { success: false, error: authResult.error },
        { status: authResult.status }
      );
    }

    // Success: clear rate limit counter
    clearRateLimit(rateLimitKey);

    const response = NextResponse.json({
      success: true,
      message: 'Login pelanggan berhasil.',
      session: authResult.session,
    });

    // Set isolated customer session cookie
    const sessionPayload = Buffer.from(
      JSON.stringify({
        accountId: authResult.session.accountId,
        customerId: authResult.session.customerId,
        role: 'CUSTOMER',
        name: authResult.session.name,
        whatsapp_number: authResult.session.whatsapp_number,
        createdAt: Date.now(),
      })
    ).toString('base64');

    response.cookies.set({
      name: CUSTOMER_SESSION_COOKIE_NAME,
      value: sessionPayload,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memproses login pelanggan.' },
      { status: 500 }
    );
  }
}

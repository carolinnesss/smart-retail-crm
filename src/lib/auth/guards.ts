import { NextResponse } from 'next/server';
import { getServerSession, getCustomerServerSession, CustomerSessionPayload } from './session';
import { AuthSession } from './types';
import { UserRole } from '../types';

export class AuthError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode: number = 401) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

/**
 * Requires an active, authenticated user session.
 * Throws AuthError(401) if no valid session or user is inactive.
 */
export async function requireUser(): Promise<AuthSession> {
  const session = await getServerSession();
  if (!session) {
    throw new AuthError('Sesi tidak valid atau telah berakhir. Silakan login kembali.', 401);
  }

  if (!session.profile.is_active) {
    throw new AuthError('Akun Anda telah dinonaktifkan. Silakan hubungi pemilik toko.', 403);
  }

  return session;
}

/**
 * Requires an active user session with one of the allowed roles (e.g. ['OWNER']).
 * Throws AuthError(403) if the user's role is not permitted.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<AuthSession> {
  const session = await requireUser();

  if (!allowedRoles.includes(session.profile.role)) {
    throw new AuthError(
      `Akses ditolak: Operasi ini membutuhkan peran ${allowedRoles.join(' atau ')}.`,
      403
    );
  }

  return session;
}

/**
 * Strictly requires Owner role.
 * Blocks non-OWNER and CUSTOMER roles with 403.
 */
export async function requireOwner(): Promise<AuthSession> {
  const session = await requireUser();
  if (session.profile.role !== 'OWNER') {
    throw new AuthError(
      'Akses ditolak: Operasi ini hanya dapat diakses oleh Pemilik Toko (OWNER).',
      403
    );
  }
  return session;
}

/**
 * Alias for backward compatibility while migrating to single OWNER role.
 */
export const requireCashierOrOwner = requireOwner;

/**
 * Strictly requires an authenticated customer session.
 * Throws AuthError(401) if no valid customer session.
 */
export async function requireCustomer(): Promise<CustomerSessionPayload> {
  const session = await getCustomerServerSession();
  if (!session) {
    throw new AuthError(
      'Sesi pelanggan tidak valid atau telah berakhir. Silakan login kembali.',
      401
    );
  }
  return session;
}

/**
 * Catches auth errors and formats standard JSON error responses.
 */
export function handleAuthError(error: unknown) {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.statusCode }
    );
  }

  const errMessage = (error as any)?.message || 'Terjadi kesalahan autentikasi.';
  return NextResponse.json(
    { success: false, error: errMessage },
    { status: 500 }
  );
}

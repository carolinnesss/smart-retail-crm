import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { requireOwner, handleAuthError, AuthError } from '@/lib/auth/guards';

export async function POST(request: NextRequest) {
  try {
    const session = await requireOwner();
    const body = await request.json();
    const { account_id, rejection_reason } = body;

    if (!account_id) {
      return NextResponse.json(
        { success: false, error: 'ID akun pelanggan pendaftar wajib diisi.' },
        { status: 400 }
      );
    }

    if (!rejection_reason || typeof rejection_reason !== 'string' || rejection_reason.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Alasan penolakan wajib diisi untuk transparansi kepada pelanggan.' },
        { status: 400 }
      );
    }

    const repo = getRepository();
    const updatedAccount = await repo.rejectCustomerAccount({
      account_id,
      rejected_by: session.profile.id,
      rejection_reason: rejection_reason.trim(),
    });

    return NextResponse.json({
      success: true,
      message: 'Pendaftaran pelanggan telah ditolak.',
      data: updatedAccount,
    });
  } catch (error: any) {
    if (error instanceof AuthError) return handleAuthError(error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal menolak pendaftaran pelanggan' },
      { status: 400 }
    );
  }
}

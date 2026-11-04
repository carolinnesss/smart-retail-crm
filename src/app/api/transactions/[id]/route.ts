import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { requireOwner, handleAuthError, AuthError } from '@/lib/auth/guards';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOwner();
    const { id } = params;
    const repo = getRepository();
    const transaction = await repo.getTransactionById(id);

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Faktur transaksi tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return NextResponse.json(
      { success: false, error: (error as any)?.message || 'Gagal memuat detail transaksi' },
      { status: 500 }
    );
  }
}

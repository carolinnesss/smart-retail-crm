import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { requireCustomer, handleAuthError, AuthError } from '@/lib/auth/guards';

export async function GET() {
  try {
    const session = await requireCustomer();

    if (!session.customerId) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    const repo = getRepository();
    // Strictly scoped to session customer ID (IDOR guard)
    const transactions = await repo.getTransactions({
      customer_id: session.customerId,
      limit: 50,
    });

    return NextResponse.json({
      success: true,
      data: transactions,
    });
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return NextResponse.json(
      { success: false, error: (error as any)?.message || 'Gagal memuat histori transaksi' },
      { status: 500 }
    );
  }
}

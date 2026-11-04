import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { CreateTransactionSchema } from '@/lib/validations';
import { requireOwner, handleAuthError, AuthError } from '@/lib/auth/guards';

export async function GET(request: NextRequest) {
  try {
    await requireOwner();

    const { searchParams } = new URL(request.url);
    const customer_id = searchParams.get('customer_id') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const repo = getRepository();
    const transactions = await repo.getTransactions({ customer_id, limit });

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

export async function POST(request: NextRequest) {
  try {
    const session = await requireOwner();
    const rawBody = await request.json();
    const parseResult = CreateTransactionSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    // Anti-Spoofing: Cashier ID is strictly derived from the verified server session
    const transactionData = {
      ...parseResult.data,
      cashier_id: session.profile.id,
    };

    const repo = getRepository();
    const createdTransaction = await repo.createTransaction(transactionData as any);
    createdTransaction.cashier_id = session.profile.id;
    createdTransaction.cashier_name = session.profile.full_name;

    return NextResponse.json(
      { success: true, data: createdTransaction },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return NextResponse.json(
      { success: false, error: (error as any)?.message || 'Gagal memproses transaksi kasir' },
      { status: 400 }
    );
  }
}

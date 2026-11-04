import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { CreateDebtPaymentSchema } from '@/lib/validations';
import { requireOwner, handleAuthError, AuthError } from '@/lib/auth/guards';

export async function GET(request: NextRequest) {
  try {
    await requireOwner();

    const { searchParams } = new URL(request.url);
    const customer_id = searchParams.get('customer_id') || undefined;

    const repo = getRepository();
    const payments = await repo.getDebtPayments(customer_id);

    return NextResponse.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return NextResponse.json(
      { success: false, error: (error as any)?.message || 'Gagal memuat histori pembayaran kasbon' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireOwner();
    const rawBody = await request.json();
    const parseResult = CreateDebtPaymentSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    const repo = getRepository();
    const paymentData = {
      ...parseResult.data,
      cashier_id: session.profile.id,
    };

    const payment = await repo.createDebtPayment(paymentData);

    return NextResponse.json(
      { success: true, data: payment },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return NextResponse.json(
      { success: false, error: (error as any)?.message || 'Gagal memproses pembayaran kasbon' },
      { status: 400 }
    );
  }
}

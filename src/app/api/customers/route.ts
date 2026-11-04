import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { CreateCustomerSchema } from '@/lib/validations';
import { requireOwner, handleAuthError, AuthError } from '@/lib/auth/guards';

export async function GET(request: NextRequest) {
  try {
    await requireOwner();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const type = searchParams.get('type') || undefined;
    const hasDebtParam = searchParams.get('hasDebt');
    const hasDebt = hasDebtParam !== null ? hasDebtParam === 'true' : undefined;

    const repo = getRepository();
    const customers = await repo.getCustomers({ search, type, hasDebt });

    return NextResponse.json({
      success: true,
      data: customers,
    });
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return NextResponse.json(
      { success: false, error: (error as any)?.message || 'Gagal memuat data pelanggan' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireOwner();
    const rawBody = await request.json();
    const parseResult = CreateCustomerSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    const customerData = { ...parseResult.data };

    const repo = getRepository();
    const newCustomer = await repo.createCustomer(customerData);

    return NextResponse.json(
      { success: true, data: newCustomer },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return NextResponse.json(
      { success: false, error: (error as any)?.message || 'Gagal menambahkan pelanggan' },
      { status: 400 }
    );
  }
}

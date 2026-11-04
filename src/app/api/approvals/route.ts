import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { requireOwner, handleAuthError, AuthError } from '@/lib/auth/guards';

export async function GET() {
  try {
    await requireOwner();
    const repo = getRepository();

    const [pendingAccounts, existingCustomers] = await Promise.all([
      repo.getCustomerAccounts('PENDING'),
      repo.getCustomers({ search: '' }),
    ]);

    return NextResponse.json({
      success: true,
      pending_accounts: pendingAccounts,
      existing_customers: existingCustomers.map((c) => ({
        id: c.id,
        name: c.name,
        whatsapp_number: c.phone || '',
        customer_type: c.customer_type,
        total_debt: c.current_debt,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return NextResponse.json(
      { success: false, error: (error as any)?.message || 'Gagal memuat antrean persetujuan' },
      { status: 500 }
    );
  }
}

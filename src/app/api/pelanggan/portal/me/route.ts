import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { requireCustomer, handleAuthError, AuthError } from '@/lib/auth/guards';
import { IDebtLedger } from '@/lib/types';

export async function GET() {
  try {
    const session = await requireCustomer();
    const repo = getRepository();

    if (!session.customerId) {
      return NextResponse.json({
        success: true,
        data: {
          id: session.accountId,
          name: session.name,
          whatsapp_number: session.whatsapp_number,
          customer_type: 'Eceran',
          total_debt: 0,
          max_credit_limit: 0,
          remaining_credit: 0,
          debt_due_date: null,
          is_debt_overdue: false,
          overdue_days: 0,
        },
      });
    }

    const customer = await repo.getCustomerById(session.customerId);
    const debtEntries: IDebtLedger[] = repo.getDebtLedger
      ? await repo.getDebtLedger(session.customerId)
      : [];

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Profil pelanggan toko tidak ditemukan.' },
        { status: 404 }
      );
    }

    const remainingCredit = Math.max(0, customer.max_credit_limit - customer.current_debt);

    let debtDueDate: string | null = null;
    let isOverdue = false;
    let overdueDays = 0;

    if (customer.current_debt > 0 && debtEntries.length > 0) {
      const withDueDate = debtEntries.filter((d) => Boolean(d.due_date));
      if (withDueDate.length > 0) {
        withDueDate.sort(
          (a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
        );
        debtDueDate = withDueDate[0].due_date || null;
        if (debtDueDate) {
          const now = Date.now();
          const dueTime = new Date(debtDueDate).getTime();
          if (now > dueTime) {
            isOverdue = true;
            overdueDays = Math.ceil((now - dueTime) / (1000 * 60 * 60 * 24));
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: customer.id,
        name: customer.name,
        whatsapp_number: customer.phone,
        customer_type: customer.customer_type,
        total_debt: customer.current_debt,
        max_credit_limit: customer.max_credit_limit,
        remaining_credit: remainingCredit,
        debt_due_date: debtDueDate,
        is_debt_overdue: isOverdue,
        overdue_days: overdueDays,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return NextResponse.json(
      { success: false, error: (error as any)?.message || 'Gagal memuat profil pelanggan' },
      { status: 500 }
    );
  }
}

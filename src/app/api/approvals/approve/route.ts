import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { requireOwner, handleAuthError, AuthError } from '@/lib/auth/guards';

export async function POST(request: NextRequest) {
  try {
    const session = await requireOwner();
    const body = await request.json();
    const { account_id, mode, choice, existing_customer_id } = body;
    const finalChoice = choice || mode;

    if (!account_id) {
      return NextResponse.json(
        { success: false, error: 'ID akun pelanggan pendaftar wajib diisi.' },
        { status: 400 }
      );
    }

    if (finalChoice !== 'LINK_EXISTING' && finalChoice !== 'CREATE_NEW') {
      return NextResponse.json(
        {
          success: false,
          error: "Opsi persetujuan tidak valid. Wajib memilih 'LINK_EXISTING' (Hubungkan ke pelanggan yang ada) atau 'CREATE_NEW' (Buat pelanggan baru).",
        },
        { status: 400 }
      );
    }

    if (finalChoice === 'LINK_EXISTING' && !existing_customer_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID pelanggan yang akan dihubungkan wajib dipilih.',
        },
        { status: 400 }
      );
    }

    const repo = getRepository();
    const result = await repo.approveCustomerAccount({
      account_id,
      approved_by: session.profile.id,
      choice: finalChoice,
      existing_customer_id,
    });

    return NextResponse.json({
      success: true,
      message: 'Pendaftaran pelanggan berhasil disetujui.',
      data: result.account,
      customer: result.customer,
    });
  } catch (error: any) {
    if (error instanceof AuthError) return handleAuthError(error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal menyetujui pendaftaran pelanggan' },
      { status: 400 }
    );
  }
}

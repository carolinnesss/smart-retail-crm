import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { UpdateCustomerSchema } from '@/lib/validations';
import { requireOwner, handleAuthError, AuthError } from '@/lib/auth/guards';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOwner();
    const { id } = params;
    const repo = getRepository();
    const customer = await repo.getCustomerById(id);

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Pelanggan tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return NextResponse.json(
      { success: false, error: (error as any)?.message || 'Gagal memuat profil pelanggan' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOwner();
    const { id } = params;
    const rawBody = await request.json();

    const parseResult = UpdateCustomerSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    const repo = getRepository();
    const updated = await repo.updateCustomer(id, parseResult.data);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return NextResponse.json(
      { success: false, error: (error as any)?.message || 'Gagal memperbarui data pelanggan' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOwner();

    const { id } = params;
    const repo = getRepository();
    const deactivated = await repo.updateCustomer(id, { is_active: false });

    return NextResponse.json({
      success: true,
      data: deactivated,
      message: 'Pelanggan berhasil dinonaktifkan.',
    });
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return NextResponse.json(
      { success: false, error: (error as any)?.message || 'Gagal menonaktifkan pelanggan' },
      { status: 500 }
    );
  }
}

export const PATCH = PUT;

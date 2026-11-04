import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { UpdateProductSchema } from '@/lib/validations';
import { requireOwner, handleAuthError, AuthError } from '@/lib/auth/guards';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOwner();
    const { id } = params;
    const repo = getRepository();
    const product = await repo.getProductById(id);

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Produk tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return NextResponse.json(
      { success: false, error: (error as any)?.message || 'Gagal memuat detail produk' },
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
    const parseResult = UpdateProductSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    const body = parseResult.data;
    if (
      body.wholesale_price !== undefined &&
      body.retail_price !== undefined &&
      Number(body.wholesale_price) > Number(body.retail_price)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Harga grosir tidak boleh lebih besar dari harga eceran.',
        },
        { status: 400 }
      );
    }

    const repo = getRepository();
    const updated = await repo.updateProduct(id, body);

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return NextResponse.json(
      { success: false, error: (error as any)?.message || 'Gagal memperbarui data produk' },
      { status: 400 }
    );
  }
}

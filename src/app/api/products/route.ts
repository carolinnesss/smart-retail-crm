import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { CreateProductSchema } from '@/lib/validations';
import { requireOwner, handleAuthError, AuthError } from '@/lib/auth/guards';

export async function GET(request: NextRequest) {
  try {
    await requireOwner();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const category = searchParams.get('category') || undefined;
    const lowStockParam = searchParams.get('lowStock');
    const lowStock = lowStockParam !== null ? lowStockParam === 'true' : undefined;

    const repo = getRepository();
    const products = await repo.getProducts({ search, category, lowStock });

    return NextResponse.json({
      success: true,
      data: products,
    });
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return NextResponse.json(
      { success: false, error: (error as any)?.message || 'Gagal memuat katalog produk' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireOwner();

    const rawBody = await request.json();
    const parseResult = CreateProductSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((i) => i.message).join(', ');
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 400 }
      );
    }

    const repo = getRepository();
    const newProduct = await repo.createProduct(parseResult.data);

    return NextResponse.json(
      { success: true, data: newProduct },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return NextResponse.json(
      { success: false, error: (error as any)?.message || 'Gagal menambahkan produk' },
      { status: 400 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { requireRole, handleAuthError, AuthError } from '@/lib/auth/guards';

export async function GET(request: NextRequest) {
  try {
    // Only OWNER can access restock radar heuristics
    await requireRole(['OWNER']);

    const { searchParams } = new URL(request.url);
    const alphaParam = searchParams.get('alpha');
    const alpha = alphaParam ? parseFloat(alphaParam) : undefined;

    const repo = getRepository();
    const predictions = await repo.getRestockPredictions(alpha);

    return NextResponse.json({
      success: true,
      data: predictions,
    });
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return NextResponse.json(
      { success: false, error: (error as any)?.message || 'Gagal memuat radar restok' },
      { status: 500 }
    );
  }
}

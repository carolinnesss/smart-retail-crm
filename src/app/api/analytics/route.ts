import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { requireRole, handleAuthError, AuthError } from '@/lib/auth/guards';

export async function GET() {
  try {
    // Only OWNER can access financial analytics
    await requireRole(['OWNER']);

    const repo = getRepository();
    const [kpis, restockPredictions] = await Promise.all([
      repo.getFinancialKPIs(),
      repo.getRestockPredictions(),
    ]);

    return NextResponse.json({
      success: true,
      kpis,
      restock_predictions: restockPredictions,
    });
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return NextResponse.json(
      { success: false, error: (error as any)?.message || 'Gagal memuat analitik toko' },
      { status: 500 }
    );
  }
}

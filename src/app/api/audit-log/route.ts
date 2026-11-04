import { NextRequest, NextResponse } from 'next/server';
import { requireRole, handleAuthError, AuthError } from '@/lib/auth/guards';
import { isSupabaseConfigured } from '@/lib/supabase';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getMockAuditLogs } from '@/lib/auth/mock-auth';

export async function GET(request: NextRequest) {
  try {
    // Only OWNER can view the audit log
    await requireRole(['OWNER']);

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || undefined;
    const entity = searchParams.get('entity') || undefined;

    if (isSupabaseConfigured()) {
      const supabase = createServerSupabaseClient();
      if (!supabase) {
        return NextResponse.json(
          { success: false, error: 'Database tidak terhubung.' },
          { status: 500 }
        );
      }

      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (action) {
        query = query.eq('action', action);
      }
      if (entity) {
        query = query.eq('entity', entity);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({
        success: true,
        data: data || [],
      });
    }

    // Mock Mode
    const logs = getMockAuditLogs({ action, entity });
    return NextResponse.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    if (error instanceof AuthError) return handleAuthError(error);
    return NextResponse.json(
      { success: false, error: (error as any)?.message || 'Gagal memuat audit log' },
      { status: 500 }
    );
  }
}

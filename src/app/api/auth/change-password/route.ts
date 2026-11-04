import { NextRequest, NextResponse } from 'next/server';
import { requireUser, handleAuthError } from '@/lib/auth/guards';
import { isSupabaseConfigured } from '@/lib/supabase';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { updateMockUser } from '@/lib/auth/mock-auth';

export async function POST(request: NextRequest) {
  try {
    const session = await requireUser();
    const body = await request.json();
    const { new_password } = body;

    if (!new_password || typeof new_password !== 'string' || new_password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: 'Kata sandi baru minimal harus terdiri dari 6 karakter.',
        },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured()) {
      const supabase = createServerSupabaseClient();
      if (!supabase) {
        return NextResponse.json(
          { success: false, error: 'Database tidak terhubung.' },
          { status: 500 }
        );
      }

      const { error } = await supabase.auth.updateUser({
        password: new_password,
      });

      if (error) {
        return NextResponse.json(
          { success: false, error: `Gagal mengubah kata sandi: ${error.message}` },
          { status: 400 }
        );
      }
    } else {
      updateMockUser(session.profile.id, { password: new_password });
    }

    return NextResponse.json({
      success: true,
      message: 'Kata sandi berhasil diperbarui.',
    });
  } catch (error) {
    return handleAuthError(error);
  }
}

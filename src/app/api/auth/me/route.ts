import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Sesi tidak aktif atau belum login.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: session.user,
      profile: session.profile,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal memuat sesi profil.' },
      { status: 500 }
    );
  }
}

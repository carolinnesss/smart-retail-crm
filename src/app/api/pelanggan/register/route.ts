import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/repository';
import { normalizeIndonesianPhone } from '@/lib/whatsapp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, whatsapp_number, password } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Nama lengkap wajib diisi minimal 2 karakter.' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizeIndonesianPhone(whatsapp_number || '');
    if (!normalizedPhone) {
      return NextResponse.json(
        { success: false, error: 'Nomor WhatsApp tidak valid. Gunakan format Indonesia (contoh: 08123456789).' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Kata sandi minimal 6 karakter.' },
        { status: 400 }
      );
    }

    const repo = getRepository();
    const account = await repo.registerCustomerAccount({
      name: name.trim(),
      whatsapp_number: normalizedPhone,
      password,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Pendaftaran berhasil. Akun Anda berstatus PENDING dan sedang menunggu persetujuan kasir toko.',
        data: {
          id: account.id,
          name: account.name,
          whatsapp_number: account.whatsapp_number,
          status: account.status,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    const message = error?.message || 'Gagal memproses pendaftaran pelanggan.';
    const isConflict = message.toLowerCase().includes('sudah terdaftar');
    return NextResponse.json(
      { success: false, error: message },
      { status: isConflict ? 400 : 500 }
    );
  }
}

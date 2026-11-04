'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, Lock, Phone, User, CheckCircle2, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function PelangganRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ name: string; whatsapp_number: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    if (password.length < 6) {
      setError('Kata sandi harus minimal 6 karakter.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/pelanggan/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          whatsapp_number: whatsappNumber.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Pendaftaran gagal. Silakan periksa kembali data Anda.');
        setLoading(false);
        return;
      }

      setSuccessData({
        name: data.data.name,
        whatsapp_number: data.data.whatsapp_number,
      });
    } catch {
      setError('Gagal menghubungi server. Periksa koneksi internet Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 px-6 py-8">
      {/* Top Header */}
      <div className="flex items-center gap-2 mb-6">
        <Link
          href="/pelanggan/login"
          className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          Portal Pelanggan
        </span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Daftar Akun Baru</h1>
        <p className="text-sm text-slate-500 mt-1">
          Buka akun pelanggan mandiri untuk memantau tabungan dan kasbon sembako Anda.
        </p>
      </div>

      {successData ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-4 my-auto">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-emerald-900">Pendaftaran Berhasil!</h2>
            <p className="text-xs font-semibold text-emerald-700 mt-1">
              Status: <span className="underline">PENDING (Menunggu Persetujuan)</span>
            </p>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Terima kasih, <strong>{successData.name}</strong>. Pendaftaran akun Anda sedang menunggu konfirmasi
            dari pihak kasir / pemilik toko. Anda dapat mengabari kasir saat bertransaksi di toko.
          </p>
          <div className="pt-2">
            <Link
              href="/pelanggan/login"
              className="inline-block w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors text-center shadow-md shadow-emerald-600/20"
            >
              Ke Halaman Masuk
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-800">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Persetujuan Kasir:</strong> Demi keamanan data utang & tabungan toko, akun baru otomatis berstatus <strong>PENDING</strong> dan harus disetujui terlebih dahulu oleh staf kasir / pemilik di akun kasir/owner sebelum Anda dapat masuk.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nama Lengkap
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bu Siti Aminah"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Nomor WhatsApp
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  placeholder="08xxxxxxxxxx"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Wajib aktif untuk verifikasi transaksi & tagihan kasbon.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Konfirmasi Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="Ulangi kata sandi"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 leading-relaxed">
              <strong>Catatan:</strong> Akun baru berstatus <em>PENDING</em> dan belum dapat login langsung.
              Kasir atau pemilik toko akan menyetujui akun Anda terlebih dahulu.
            </div>
          </div>

          <div className="pt-6 space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>{loading ? 'Mendaftarkan...' : 'Kirim Pendaftaran'}</span>
            </button>

            <div className="text-center text-xs text-slate-500 pt-2">
              Sudah memiliki akun?{' '}
              <Link href="/pelanggan/login" className="font-bold text-emerald-700 hover:underline">
                Masuk di sini
              </Link>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

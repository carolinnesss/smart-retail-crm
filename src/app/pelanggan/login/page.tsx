'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, Lock, Phone, AlertCircle, ShoppingBag, ShieldAlert } from 'lucide-react';

export default function PelangganLoginPage() {
  const router = useRouter();
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRejected, setIsRejected] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsRejected(false);
    setLoading(true);

    try {
      const res = await fetch('/api/pelanggan/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsapp_number: whatsappNumber.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Nomor WhatsApp atau kata sandi tidak valid.');
        if (data.error && data.error.toLowerCase().includes('ditolak')) {
          setIsRejected(true);
        }
        setLoading(false);
        return;
      }

      // Success: redirect to customer portal
      router.push('/pelanggan/portal');
    } catch {
      setError('Gagal menghubungi server. Periksa koneksi internet Anda.');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 px-6 py-8 justify-between">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 mb-8 pt-4">
          <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/30">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Akses Mandiri
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              Portal Pelanggan
            </h1>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Selamat Datang</h2>
          <p className="text-sm text-slate-500 mt-1">
            Masuk dengan nomor WhatsApp dan kata sandi Anda untuk memantau tabungan dan kasbon.
          </p>
        </div>

        {error && (
          <div
            className={`p-3.5 mb-5 rounded-xl border flex items-start gap-2.5 text-xs ${
              isRejected
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {isRejected ? (
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <span>{error}</span>
              {isRejected && (
                <div className="pt-1">
                  <Link
                    href="/pelanggan/register"
                    className="font-bold underline text-amber-950 hover:text-black"
                  >
                    Daftar Ulang Sekarang &rarr;
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-50 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Memeriksa...' : 'Masuk Portal'}</span>
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-500 mb-2">Belum memiliki akun pelanggan?</p>
          <Link
            href="/pelanggan/register"
            className="inline-block w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors text-center"
          >
            Daftar Akun Mandiri
          </Link>
        </div>
      </div>

      {/* Cashier Door Switch */}
      <div className="mt-8 text-center pt-4 border-t border-slate-100">
        <p className="text-[11px] text-slate-400 mb-1">Apakah Anda Pemilik atau Kasir Toko?</p>
        <Link
          href="/login"
          className="text-xs font-bold text-slate-600 hover:text-emerald-700 transition-colors"
        >
          Masuk ke Portal Kasir &rarr;
        </Link>
      </div>
    </div>
  );
}

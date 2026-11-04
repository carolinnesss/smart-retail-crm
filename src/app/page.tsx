import React from 'react';
import Link from 'next/link';
import {
  Store,
  ShoppingCart,
  Users,
  CreditCard,
  Wallet,
  Activity,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Sparkles,
  Lock,
} from 'lucide-react';
import { getRepository } from '@/lib/repository';

export const revalidate = 0;

export default async function PublicLandingPage() {
  const repo = getRepository();
  const [storeSettings, pendingAccounts] = await Promise.all([
    repo.getStoreSettings(),
    repo.getCustomerAccounts('PENDING'),
  ]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-emerald-500 selection:text-white flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight block">
                {storeSettings.store_name}
              </span>
              <span className="text-[11px] text-emerald-400 font-medium block">
                Pemilik: {storeSettings.owner_name} &bull; Smart Retail CRM & POS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/pelanggan/login"
              className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              Portal Pelanggan
            </Link>
            <Link
              href="/login"
              className="px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Masuk Owner</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-24 border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-emerald-500/10 blur-3xl pointer-events-none rounded-full" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-semibold mb-6 border border-emerald-500/30 shadow-inner">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Digitalisasi Operasional Toko Sembako Modern</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto">
            Sistem Kasir Pintar, Buku Kasbon Digital, & Loyalitas Pelanggan Sembako
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Menghubungkan operasional harian warung sembako secara <em>end-to-end</em>: harga otomatis grosir/eceran,
            batas aman utang kasbon digital, dompet tabungan mandiri, serta prediksi restok EWMA berbasis data riil.
          </p>

          {/* Dual Main Doorways Cards (Owner & Pelanggan) */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
            {/* Pintu 1: Pemilik Toko (Owner) */}
            <div className="bg-gradient-to-b from-slate-800/90 to-slate-900/90 rounded-2xl p-7 border border-slate-700/80 hover:border-emerald-500/60 transition shadow-xl flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <ShoppingCart className="w-7 h-7" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    Pintu Masuk Pemilik
                  </span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    OWNER
                  </span>
                </div>
                <h3 className="text-2xl font-extrabold text-white">Pemilik Toko (Owner)</h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Akses operasional kasir POS pintar, dashboard finansial omzet, manajemen stok & inventaris, 
                  buku kasbon & tabungan nasabah, radar restok EWMA, serta antrean persetujuan pendaftaran pelanggan baru.
                </p>
              </div>

              <div className="mt-8 pt-5 border-t border-slate-800">
                <Link
                  href="/login"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition"
                >
                  <span>Masuk sebagai Owner</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                {pendingAccounts.length > 0 && (
                  <div className="mt-3 text-xs text-amber-400 font-semibold flex items-center gap-1.5 justify-center">
                    <UserCheck className="w-4 h-4" />
                    <span>{pendingAccounts.length} akun pelanggan menunggu persetujuan</span>
                  </div>
                )}
              </div>
            </div>

            {/* Pintu 2: Portal Pelanggan */}
            <div className="bg-gradient-to-b from-slate-800/90 to-slate-900/90 rounded-2xl p-7 border border-slate-700/80 hover:border-blue-500/60 transition shadow-xl flex flex-col justify-between group">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform">
                  <Users className="w-7 h-7" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">
                    Akses Mandiri
                  </span>
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                    PELANGGAN
                  </span>
                </div>
                <h3 className="text-2xl font-extrabold text-white">Portal Pelanggan Toko</h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Pelanggan terdaftar dapat memeriksa sisa kasbon, tanggal jatuh tempo, plafon kredit toko, 
                  saldo dompet tabungan mandiri, dan riwayat belanja transparan secara real-time.
                </p>
              </div>

              <div className="mt-8 pt-5 border-t border-slate-800 space-y-3">
                <Link
                  href="/pelanggan/login"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition"
                >
                  <span>Buka Portal Pelanggan</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <div className="text-center">
                  <Link
                    href="/pelanggan/register"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    <span>Belum punya akun? Daftar Akun Baru &rarr;</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Transparent Registration & Approval Flow Explainer */}
      <section className="py-16 bg-slate-950 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
              Keamanan & Verifikasi Toko
            </h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Alur Pendaftaran & Persetujuan Akun Pelanggan
            </h3>
            <p className="mt-3 text-sm text-slate-400">
              Untuk melindungi privasi transaksi dan mencegah penyalahgunaan kasbon, setiap akun yang mendaftar
              secara online wajib diverifikasi oleh pemilik toko (Owner Oline).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Step 1 */}
            <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 relative">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 font-extrabold flex items-center justify-center text-lg mb-4">
                1
              </div>
              <h4 className="text-base font-bold text-white">Pelanggan Mendaftar Mandiri</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Pelanggan mengisi formulir pendaftaran: nama lengkap, nomor WhatsApp unik, dan kata sandi rahasia. 
                Status awal akun otomatis menjadi <strong>PENDING</strong> (belum bisa login).
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-900/80 rounded-2xl p-6 border border-amber-500/50 relative shadow-lg shadow-amber-500/5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 font-extrabold flex items-center justify-center text-lg mb-4">
                2
              </div>
              <h4 className="text-base font-bold text-white">Persetujuan di Akun Owner</h4>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Owner Oline membuka menu <strong>Persetujuan Pelanggan (/persetujuan)</strong>. 
                Owner memilih: menghubungkan ke catatan pelanggan lama warung atau membuat profil pelanggan baru.
              </p>
              <div className="mt-3 text-[11px] bg-amber-500/10 text-amber-300 p-2 rounded-lg border border-amber-500/20 font-medium">
                🛡️ Fitur persetujuan ini hanya ada di akun Owner dan terblokir 403 dari pelanggan.
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-900/80 rounded-2xl p-6 border border-slate-800 relative">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 font-extrabold flex items-center justify-center text-lg mb-4">
                3
              </div>
              <h4 className="text-base font-bold text-white">Akun Aktif & Portal Terbuka</h4>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                Setelah disetujui, status berubah menjadi <strong>AKTIF</strong>. Pelanggan dapat langsung login ke 
                Portal Pelanggan untuk memantau tabungan, sisa plafon, dan riwayat belanjanya.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5 Core Feature Highlights */}
      <section className="py-16 bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
              Fitur End-to-End
            </h2>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
              Operasional Lengkap Sembako Digital
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/60">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-base">Kasir POS Harga Otomatis</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Sistem otomatis mendeteksi apakah pelanggan berhak mendapat harga 
                grosir (warung) atau eceran saat namanya dipilih di antarmuka POS kasir.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/60">
              <div className="w-10 h-10 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3">
                <CreditCard className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-base">Buku Kasbon & Proteksi Limit</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Pencatatan digital anti-bon manual yang otomatis menolak transaksi jika nominal utang pelanggan 
                melewati batas plafon kredit toko (Kasbon Guard).
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/60">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
                <Wallet className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-base">Dompet Tabungan & Split Payment</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Pelanggan bisa menabung uang, menarik tunai, atau membayar belanjaan dengan split 3 arah 
                (Tunai + Saldo Tabungan + Kasbon).
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/60">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                <Activity className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-base">Radar Restok EWMA</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Prediksi otomatis saat stok kebutuhan pokok langganan (beras, minyak, gula, telur, tepung) 
                sudah mau habis dengan tombol outreach WhatsApp satu-klik.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/60">
              <div className="w-10 h-10 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-base">CRM 360° & Jejak Audit</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Setiap profil memiliki riwayat belanja kasir, mutasi keluar-masuk uang tabungan, 
                buku cicilan pelunasan kasbon real-time, dan jejak audit aktivitas sensitif.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/60">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-base">Isolasi Hak Akses & Privasi</h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Pelanggan diisolasi ketat di sisi server (403 Forbidden pada seluruh endpoint kasir/owner). Hanya Owner Oline 
                yang berwenang mengubah plafon kasbon.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-slate-950 border-t border-slate-800 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-400">
          {storeSettings.store_name} &bull; Pemilik: {storeSettings.owner_name}
        </p>
        <p className="mt-1">
          {storeSettings.address} &bull; WhatsApp: {storeSettings.phone}
        </p>
        <p className="mt-2 text-[11px] text-slate-600">
          Dilindungi oleh Row-Level Security (RLS) & Server-Side RBAC Guard.
        </p>
      </footer>
    </div>
  );
}

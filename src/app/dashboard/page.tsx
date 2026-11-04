import React from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  CreditCard,
  Wallet,
  Users,
  AlertTriangle,
  ArrowRight,
  ShoppingCart,
  Package,
  MessageCircle,
  Clock,
  Sparkles,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { getRepository } from '@/lib/repository';
import { formatIDR, formatDate } from '@/lib/formatters';
import { getServerSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export const revalidate = 0; // Fresh on every request

export default async function SmartDashboardPage() {
  const session = await getServerSession();
  if (!session) {
    redirect('/kasir/login?next=/dashboard');
  }
  if (session.profile.role === 'CUSTOMER') {
    redirect('/pelanggan/portal');
  }
  if (session.profile.role === 'CASHIER') {
    redirect('/pos');
  }

  const repo = getRepository();
  const [kpis, predictions, recentTransactions, storeSettings, pendingAccounts] = await Promise.all([
    repo.getFinancialKPIs(),
    repo.getRestockPredictions(),
    repo.getTransactions({ limit: 5 }),
    repo.getStoreSettings(),
    repo.getCustomerAccounts('PENDING'),
  ]);

  const urgentPredictions = predictions.filter(
    (p) => p.status === 'CRITICAL' || p.status === 'URGENT'
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-emerald-500/10 -skew-x-12 transform pointer-events-none" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3 border border-emerald-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smart Retail CRM & Kasir Pintar Sembako</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Smart Dashboard Toko Sembako {storeSettings.owner_name}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-emerald-100 leading-relaxed">
            Pusat pemantauan finansial, rekap omzet harian, sisa piutang di luar, perlindungan plafon utang,
            dan radar prediksi restok sembako EWMA.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/pos"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-900 font-bold text-sm shadow hover:bg-emerald-50 transition-colors"
            >
              <ShoppingCart className="w-4 h-4 text-emerald-700" />
              <span>Buka Kasir POS Pintar</span>
            </Link>
            <Link
              href="/crm"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700/60 text-white font-semibold text-sm border border-emerald-500/40 hover:bg-emerald-700 transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>Kelola Buku CRM & Kasbon</span>
            </Link>
            <Link
              href="/persetujuan"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/80 hover:bg-amber-500 text-white font-semibold text-sm transition-colors border border-amber-400/50 shadow-sm"
            >
              <UserCheck className="w-4 h-4" />
              <span>Persetujuan Akun Pelanggan ({pendingAccounts.length})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Pending Customer Approvals Alert (Only shown if pending accounts exist) */}
      {pendingAccounts.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-50 border-2 border-amber-400/80 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-pulse-subtle">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20 shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white uppercase tracking-wider">
                  Menunggu Persetujuan
                </span>
                <span className="text-xs text-amber-800 font-medium">
                  {pendingAccounts.length} Akun Baru
                </span>
              </div>
              <h3 className="font-extrabold text-amber-950 text-sm sm:text-base mt-0.5">
                Pendaftaran Akun Pelanggan Memerlukan Verifikasi Owner
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                Pelanggan telah mendaftar mandiri via nomor WhatsApp. Akun berstatus PENDING hingga disetujui di sisi Owner.
              </p>
            </div>
          </div>
          <Link
            href="/persetujuan"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-sm shrink-0"
          >
            <span>Tinjau & Setujui Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* KPI Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today Sales */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Omzet Penjualan Hari Ini
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {formatIDR(kpis.today_sales)}
            </div>
            <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Transaksi hari ini</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Month Sales */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Omzet Bulan Ini
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {formatIDR(kpis.month_sales)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Total omzet kalender berjalan
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Total Piutang Kasbon */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Total Piutang Kasbon
            </span>
            <div className="text-2xl font-black text-rose-600 mt-1">
              {formatIDR(kpis.total_active_debt)}
            </div>
            <div className="text-xs text-rose-600 mt-1 font-medium">
              {kpis.active_debtors_count} debitur aktif di luar
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Total Pelanggan */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-start justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Pelanggan Terdaftar
            </span>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {kpis.total_customers}
            </div>
            <div className="text-xs text-indigo-600 mt-1 font-medium">
              Warung mitra & pembeli eceran
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
            <Users className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Restock Heuristic Widget & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Restock Heuristic Warnings (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Radar Prediksi Restok Sembako (EWMA)
                </h2>
                <p className="text-xs text-slate-500">
                  Analisis otomatis interval siklus konsumsi beras, minyak, gula, telur & tepung
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                {urgentPredictions.length} Perlu Tindakan
              </span>
              <Link
                href="/radar"
                className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-0.5"
              >
                <span>Buka Radar Lengkap</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {predictions.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">
                Belum ada data riwayat belanja komoditas sembako.
              </p>
            ) : (
              predictions.slice(0, 4).map((p, idx) => (
                <div
                  key={`${p.customer_id}-${p.commodity}-${idx}`}
                  className={`p-4 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    p.status === 'CRITICAL'
                      ? 'bg-rose-50/60 border-rose-200'
                      : p.status === 'URGENT'
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-slate-50/80 border-slate-200'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">
                        {p.customer_name}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          p.status === 'CRITICAL'
                            ? 'bg-rose-600 text-white'
                            : p.status === 'URGENT'
                            ? 'bg-amber-500 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {p.status_label}
                      </span>
                    </div>

                    <div className="mt-1 text-xs text-slate-600">
                      Komoditas:{' '}
                      <span className="font-semibold text-slate-800">
                        {p.commodity}
                      </span>{' '}
                      • Siklus: {p.avg_interval_days} hari • Sisa estimasi:{' '}
                      <span
                        className={`font-bold ${
                          p.days_remaining <= 0 ? 'text-rose-600' : 'text-slate-800'
                        }`}
                      >
                        {p.days_remaining <= 0
                          ? 'Habis!'
                          : `${p.days_remaining} hari lagi`}
                      </span>
                    </div>

                    <p className="mt-1 text-[11px] text-slate-500 italic">
                      {p.recommended_action}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {p.wa_link && (
                      <a
                        href={p.wa_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Chat WA</span>
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Recent Transactions & Shortcuts */}
        <div className="space-y-6">
          {/* Recent Invoices */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <h3 className="text-sm font-bold text-slate-900">
                  Transaksi Terakhir
                </h3>
              </div>
              <Link
                href="/crm"
                className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-0.5"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {recentTransactions.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  Belum ada transaksi.
                </p>
              ) : (
                recentTransactions.map((tx) => (
                  <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {tx.customer_name || 'Pelanggan Umum'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {tx.invoice_number} • {formatDate(tx.created_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">
                        {formatIDR(tx.final_amount)}
                      </div>
                      <span
                        className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          tx.payment_method === 'TUNAI'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {tx.payment_method}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-400" />
              <span>Inventaris Sembako</span>
            </h4>
            <p className="mt-2 text-xs text-slate-300 leading-relaxed">
              Tersedia 30 SKU sembako master (Beras, Minyakita, Gulaku, Telur Segar, Tepung Bogasari)
              dengan penyesuaian harga grosir otomatis saat memilih pelanggan warung.
            </p>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-400">Peringatan Stok Rendah:</span>
              <span className="font-bold text-amber-400">
                {kpis.total_low_stock_items} produk
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

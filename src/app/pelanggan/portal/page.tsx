'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Receipt,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { formatIDR, formatDate } from '@/lib/formatters';

interface CustomerProfile {
  id: string;
  name: string;
  whatsapp_number: string;
  customer_type: 'Eceran' | 'Grosir' | 'Warung / Grosir';
  total_debt: number;
  max_credit_limit: number;
  remaining_credit: number;
  debt_due_date: string | null;
  is_debt_overdue: boolean;
  overdue_days: number;
}

interface TransactionItem {
  id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Transaction {
  id: string;
  invoice_number: string;
  created_at: string;
  final_amount: number;
  payment_method: string;
  cash_amount: number;
  cash_tendered?: number;
  change_amount?: number;
  debt_amount: number;
  due_date?: string | null;
  items?: TransactionItem[];
}

export default function PelangganPortalPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [resProfile, resTx] = await Promise.all([
          fetch('/api/pelanggan/portal/me'),
          fetch('/api/pelanggan/portal/transactions'),
        ]);

        if (resProfile.status === 401) {
          router.push('/pelanggan/login');
          return;
        }

        const dataProfile = await resProfile.json();
        const dataTx = await resTx.json();

        if (!isMounted) return;

        if (dataProfile.success) {
          setProfile(dataProfile.data);
        } else {
          setError(dataProfile.error || 'Gagal memuat profil');
        }

        if (dataTx.success) {
          setTransactions(dataTx.data || []);
        }
      } catch {
        if (isMounted) setError('Gagal memuat data dari server. Periksa koneksi Anda.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/pelanggan/logout', { method: 'POST' });
    } finally {
      router.push('/pelanggan/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Memuat Portal Pelanggan...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header Mobile / Top bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-3.5 flex items-center justify-between shadow-2xs">
        <div>
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
            Portal Pelanggan
          </span>
          <h1 className="text-base font-extrabold text-slate-900 leading-tight">
            {profile?.name || 'Pelanggan'}
          </h1>
          <p className="text-[11px] text-slate-500">{profile?.whatsapp_number}</p>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
          title="Keluar"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Error state */}
      {error && (
        <div className="m-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main KPI Cards: Kasbon Aktif & Limit Kredit */}
      <div className="px-4 py-4 space-y-3">
        {/* Kasbon Aktif & Jatuh Tempo */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                  (profile?.total_debt || 0) > 0
                    ? profile?.is_debt_overdue
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}
              >
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                  Kasbon Aktif
                </span>
                <span
                  className={`text-lg font-black tracking-tight ${
                    (profile?.total_debt || 0) > 0 ? 'text-rose-600' : 'text-slate-900'
                  }`}
                >
                  {formatIDR(profile?.total_debt || 0)}
                </span>
              </div>
            </div>

            {(profile?.total_debt || 0) > 0 ? (
              profile?.is_debt_overdue ? (
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    Jatuh Tempo!
                  </span>
                  <span className="block text-[10px] text-rose-600 font-semibold mt-0.5">
                    Lewat {profile?.overdue_days} hari
                  </span>
                </div>
              ) : (
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <Clock className="w-3 h-3" />
                    Aktif
                  </span>
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    {profile?.debt_due_date ? formatDate(profile.debt_due_date) : '-'}
                  </span>
                </div>
              )
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Lunas
              </span>
            )}
          </div>

          {/* Limit Progress */}
          <div className="pt-2 border-t border-slate-100 text-xs">
            <div className="flex justify-between text-slate-500 text-[11px] mb-1">
              <span>Sisa Plafon Kredit:</span>
              <span className="font-bold text-slate-800">
                {formatIDR(profile?.remaining_credit || 0)}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full ${
                  profile?.is_debt_overdue ? 'bg-rose-500' : 'bg-amber-500'
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    ((profile?.total_debt || 0) / (profile?.max_credit_limit || 1)) * 100
                  )}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Plafon: {formatIDR(profile?.max_credit_limit || 0)}</span>
              <span>
                {Math.round(
                  ((profile?.total_debt || 0) / (profile?.max_credit_limit || 1)) * 100
                )}
                % terpakai
              </span>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 leading-relaxed">
          💡 <strong>Informasi:</strong> Riwayat kasir mencatat pembayaran secara transparan. Jika ingin melunasi kasbon, harap hubungi kasir toko.
        </div>
      </div>

      {/* History Header */}
      <div className="px-4 mt-2">
        <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-emerald-600" />
          <span>Riwayat Belanja Kasir ({transactions.length})</span>
        </div>
      </div>

      {/* Transactions List */}
      <div className="px-4 py-4 flex-1">
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              Belum ada transaksi belanja yang tercatat.
            </div>
          ) : (
            transactions.map((tx) => {
              const isExpanded = expandedInvoice === tx.invoice_number;
              return (
                <div
                  key={tx.id}
                  className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-800">
                      {tx.invoice_number}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDate(tx.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-500 text-[11px]">Total Belanja:</span>
                    <span className="text-emerald-700 font-extrabold text-sm">
                      {formatIDR(tx.final_amount)}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                    <span>
                      Metode:{' '}
                      <strong className="text-slate-800 uppercase">
                        {tx.payment_method}
                      </strong>
                    </span>
                    {tx.payment_method === 'KASBON' && tx.due_date && (
                      <span className="text-rose-600 font-medium">
                        Jatuh Tempo: {formatDate(tx.due_date)}
                      </span>
                    )}
                  </div>

                  {/* Items dropdown */}
                  <button
                    onClick={() => setExpandedInvoice(isExpanded ? null : tx.invoice_number)}
                    className="w-full pt-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-between border-t border-slate-100 mt-2"
                  >
                    <span>Lihat {tx.items?.length || 0} Barang</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {isExpanded && tx.items && (
                    <div className="pt-2 space-y-1.5 border-t border-slate-100">
                      {tx.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] text-slate-600">
                          <div>
                            <span className="font-medium text-slate-800">{item.product_name || 'Produk'}</span>
                            <span className="text-[10px] text-slate-400 block">
                              {item.quantity} x {formatIDR(item.unit_price)}
                            </span>
                          </div>
                          <span className="font-semibold text-slate-700">{formatIDR(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Store,
  User,
  CreditCard,
  Wallet,
  ShoppingCart,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertTriangle,
  RefreshCw,
  Edit,
  Sparkles,
  Receipt,
  FileText,
  Calendar,
} from 'lucide-react';
import {
  ICustomer,
  ITransaction,
  IDebtPayment,
} from '@/lib/types';
import { formatIDR, formatDate } from '@/lib/formatters';
import { CustomerModal } from '@/components/crm/CustomerModal';
import { DebtPaymentModal } from '@/components/crm/DebtPaymentModal';

export default function CustomerProfilePage() {
  const params = useParams();
  const customerId = params?.id as string;
  const router = useRouter();

  const [customer, setCustomer] = useState<ICustomer | null>(null);
  const [transactions, setTransactions] = useState<ITransaction[]>([]);
  const [debtPayments, setDebtPayments] = useState<IDebtPayment[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'transactions' | 'debt'>('transactions');

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState<boolean>(false);

  const loadCustomerData = useCallback(async () => {
    if (!customerId) return;
    setIsLoading(true);
    try {
      const [resCust, resTx, resDebt] = await Promise.all([
        fetch(`/api/customers/${customerId}`),
        fetch(`/api/transactions?customer_id=${customerId}`),
        fetch(`/api/debt?customer_id=${customerId}`),
      ]);

      const dataCust = await resCust.json();
      const dataTx = await resTx.json();
      const dataDebt = await resDebt.json();

      if (dataCust.success && dataCust.data) {
        setCustomer(dataCust.data);
      }
      if (dataTx.success && Array.isArray(dataTx.data)) {
        setTransactions(dataTx.data);
      }
      if (dataDebt.success && Array.isArray(dataDebt.data)) {
        setDebtPayments(dataDebt.data);
      }
    } catch (err) {
      console.error('Error fetching customer profile', err);
    } finally {
      setIsLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    loadCustomerData();
  }, [loadCustomerData]);

  // Calculations
  const totalLifetimeSpent = useMemo(() => {
    return transactions.reduce((acc, tx) => acc + (tx.final_amount || 0), 0);
  }, [transactions]);

  if (isLoading && !customer) {
    return (
      <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        <p className="text-sm">Memuat profil dan audit trail pelanggan...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-lg mx-auto my-12">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Pelanggan Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500 mt-1">
          ID pelanggan tidak valid atau telah dihapus dari sistem.
        </p>
        <Link
          href="/crm"
          className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Direktori CRM</span>
        </Link>
      </div>
    );
  }

  const debtPercent =
    customer.max_credit_limit > 0
      ? Math.min(100, Math.round((customer.current_debt / customer.max_credit_limit) * 100))
      : 0;
  const availableCredit = Math.max(0, customer.max_credit_limit - customer.current_debt);

  return (
    <div className="space-y-6">
      {/* Back button and quick actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/crm"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Buku CRM & Kasbon</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadCustomerData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Profil</span>
          </button>
        </div>
      </div>

      {/* Customer Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Identity */}
          <div className="flex items-start gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                customer.customer_type === 'Warung / Grosir'
                  ? 'bg-purple-100 text-purple-700 shadow-md shadow-purple-600/10'
                  : 'bg-emerald-100 text-emerald-700 shadow-md shadow-emerald-600/10'
              }`}
            >
              {customer.customer_type === 'Warung / Grosir' ? (
                <Store className="w-7 h-7" />
              ) : (
                <User className="w-7 h-7" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {customer.name}
                </h1>
                {customer.customer_type === 'Warung / Grosir' ? (
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    Mitra Warung (Harga Grosir)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Pelanggan Eceran (Harga Normal)
                  </span>
                )}
              </div>

              <div className="mt-1 text-xs text-slate-500 space-y-0.5 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
                <span className="font-semibold text-slate-700">📱 {customer.phone}</span>
                {customer.address && <span>📍 {customer.address}</span>}
                <span>📅 Terdaftar: {formatDate(customer.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={customer.current_debt <= 0}
              onClick={() => setIsDebtModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-40 rounded-xl shadow-sm transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              <span>Pelunasan Kasbon</span>
            </button>
          </div>
        </div>

        {/* 2 Financial Status Cards */}
        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Kasbon & Limit */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                  Utang Kasbon Berjalan
                </span>
                <span className="text-xs text-slate-500">
                  Limit: {formatIDR(customer.max_credit_limit)}
                </span>
              </div>
              <div className="text-2xl font-black text-rose-600 mt-1">
                {formatIDR(customer.current_debt)}
              </div>
            </div>

            <div className="mt-2">
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    debtPercent >= 90
                      ? 'bg-rose-500'
                      : debtPercent >= 60
                      ? 'bg-amber-500'
                      : 'bg-indigo-600'
                  }`}
                  style={{ width: `${debtPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>Pemakaian: {debtPercent}%</span>
                <span>Sisa Kredit: {formatIDR(availableCredit)}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Total Belanja */}
          <div className="bg-indigo-50/60 border border-indigo-200/70 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-indigo-800 uppercase tracking-wider block">
                Total Belanja Kumulatif
              </span>
              <div className="text-2xl font-black text-indigo-950 mt-1">
                {formatIDR(totalLifetimeSpent)}
              </div>
            </div>
            <p className="text-[11px] text-indigo-700 mt-2">
              Total {transactions.length} transaksi kasir tercatat di toko.
            </p>
          </div>
        </div>
      </div>

      {/* 3-Tab Comprehensive Audit Trail */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Tab Headers */}
        <div className="flex items-center border-b border-slate-200 px-6 pt-4 gap-6 text-sm overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`pb-3 font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'transactions'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>1. Histori Belanja Kasir ({transactions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('debt')}
            className={`pb-3 font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'debt'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>2. Riwayat Pembayaran Kasbon ({debtPayments.length})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* TAB 1: Transaksi Belanja */}
          {activeTab === 'transactions' && (
            <div>
              {transactions.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Belum ada riwayat transaksi</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Transaksi kasir pelanggan ini akan otomatis dicatat di sini.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 transition-colors bg-slate-50/50 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-black text-sm text-slate-900">
                            {tx.invoice_number}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDate(tx.created_at)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-900 text-white">
                            {tx.payment_method}
                          </span>
                          <span className="font-extrabold text-sm text-slate-900">
                            {formatIDR(tx.final_amount)}
                          </span>
                        </div>
                      </div>

                      {/* Items summary */}
                      <div className="text-xs text-slate-600 space-y-1">
                        {(tx.items || []).map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span>
                              • <strong>{it.product_name}</strong> ({it.quantity}x @{formatIDR(it.unit_price)})
                            </span>
                            <span className="font-semibold text-slate-800">
                              {formatIDR(it.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Tender breakdown */}
                      <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span>
                          Metode Bayar: <strong className="text-slate-800">{tx.payment_method}</strong>
                        </span>
                        {tx.payment_method === 'TUNAI' && tx.cash_tendered !== undefined && (
                          <span>
                            Uang Diterima: <strong className="text-slate-800">{formatIDR(tx.cash_tendered)}</strong>
                          </span>
                        )}
                        {tx.payment_method === 'TUNAI' && tx.change_amount !== undefined && tx.change_amount > 0 && (
                          <span>
                            Kembalian: <strong className="text-emerald-700">{formatIDR(tx.change_amount)}</strong>
                          </span>
                        )}
                        {tx.payment_method === 'KASBON' && tx.due_date && (
                          <span>
                            Jatuh Tempo: <strong className="text-rose-600">{formatDate(tx.due_date)}</strong>
                          </span>
                        )}
                        {tx.discount_amount > 0 && (
                          <span>
                            Diskon: <strong className="text-rose-600">-{formatIDR(tx.discount_amount)}</strong>
                          </span>
                        )}
                        {tx.notes && (
                          <span className="text-slate-400 italic">Catatan: {tx.notes}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Riwayat Pembayaran Kasbon */}
          {activeTab === 'debt' && (
            <div>
              {debtPayments.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">Belum ada riwayat cicilan kasbon</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Pembayaran kasbon tunai atau cicilan akan dicatat di buku ini.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4 rounded-l-xl">Tanggal</th>
                        <th className="py-3 px-4">Tipe Pembayaran</th>
                        <th className="py-3 px-4 text-right">Nominal Bayar</th>
                        <th className="py-3 px-4 rounded-r-xl">Keterangan / Berita</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {debtPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {formatDate(p.payment_date || p.created_at)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800">
                              Pelunasan Kasbon
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold text-emerald-600 whitespace-nowrap">
                            {formatIDR(p.payment_amount)}
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                            {p.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CustomerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        customer={customer}
        onSaved={loadCustomerData}
      />

      <DebtPaymentModal
        isOpen={isDebtModalOpen}
        onClose={() => setIsDebtModalOpen(false)}
        customer={customer}
        onSaved={loadCustomerData}
      />
    </div>
  );
}

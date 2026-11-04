'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  UserPlus,
  CreditCard,
  Wallet,
  Store,
  User,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Edit,
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { ICustomer } from '@/lib/types';
import { formatIDR } from '@/lib/formatters';
import { CustomerModal } from '@/components/crm/CustomerModal';
import { DebtPaymentModal } from '@/components/crm/DebtPaymentModal';

export default function CrmPage() {
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'Warung / Grosir' | 'Eceran' | 'debt'>('all');

  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<ICustomer | null>(null);

  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtCustomer, setDebtCustomer] = useState<ICustomer | null>(null);

  const fetchCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/customers');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCustomers(json.data);
      }
    } catch (err) {
      console.error('Error fetching customers', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const totalDebt = customers.reduce((acc, c) => acc + (c.current_debt || 0), 0);
    const activeDebtors = customers.filter((c) => (c.current_debt || 0) > 0).length;
    return { totalCustomers, totalDebt, activeDebtors };
  }, [customers]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      // Tab filter
      if (activeTab === 'Warung / Grosir' && c.customer_type !== 'Warung / Grosir') return false;
      if (activeTab === 'Eceran' && c.customer_type !== 'Eceran') return false;
      if (activeTab === 'debt' && c.current_debt <= 0) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesPhone = c.phone.replace(/\D/g, '').includes(q.replace(/\D/g, ''));
        const matchesAddress = c.address ? c.address.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesPhone && !matchesAddress) return false;
      }

      return true;
    });
  }, [customers, activeTab, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-600/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Buku CRM, Kasbon & Tabungan Pelanggan
            </h1>
            <p className="text-xs text-slate-500">
              Kelola profil langganan warung, audit saldo tabungan & proteksi limit kasbon digital
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchCustomers}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingCustomer(null);
              setIsCustomerModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Pelanggan</span>
          </button>
        </div>
      </div>

      {/* Aggregate Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total Customers */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Pelanggan Terdaftar
            </span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {stats.totalCustomers}
            </div>
            <span className="text-[11px] text-slate-400">Warung mitra & eceran</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Total Kasbon di Luar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Total Piutang Kasbon
            </span>
            <div className="text-2xl font-black text-rose-600 mt-0.5">
              {formatIDR(stats.totalDebt)}
            </div>
            <span className="text-[11px] text-rose-600 font-medium">
              {stats.activeDebtors} pelanggan belum lunas
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main CRM Content Table / Card Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Search & Tabs Navigation */}
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Cari nama warung, nomor HP, atau alamat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 hover:bg-white transition-colors"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  activeTab === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('Warung / Grosir')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  activeTab === 'Warung / Grosir'
                    ? 'bg-purple-700 text-white'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                Warung / Grosir
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('Eceran')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  activeTab === 'Eceran'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Eceran
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('debt')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                  activeTab === 'debt'
                    ? 'bg-rose-700 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                Punya Kasbon ({stats.activeDebtors})
              </button>
            </div>
          </div>
        </div>

        {/* Customer Directory List */}
        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
              <span>Memuat buku pelanggan...</span>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">Tidak ada pelanggan ditemukan</p>
              <p className="text-xs text-slate-400 mt-1">
                Coba sesuaikan kata kunci pencarian atau tab filter.
              </p>
            </div>
          ) : (
            filteredCustomers.map((cust) => {
              const debtPercent =
                cust.max_credit_limit > 0
                  ? Math.min(100, Math.round((cust.current_debt / cust.max_credit_limit) * 100))
                  : 0;
              const availableCredit = Math.max(0, cust.max_credit_limit - cust.current_debt);

              return (
                <div
                  key={cust.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left Column: Info */}
                  <div className="flex items-start gap-3.5 min-w-[260px]">
                    <div
                      className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                        cust.customer_type === 'Warung / Grosir'
                          ? 'bg-purple-100 text-purple-700 shadow-sm'
                          : 'bg-emerald-100 text-emerald-700 shadow-sm'
                      }`}
                    >
                      {cust.customer_type === 'Warung / Grosir' ? (
                        <Store className="w-5 h-5" />
                      ) : (
                        <User className="w-5 h-5" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/crm/${cust.id}`}
                          className="font-bold text-slate-900 text-base hover:text-indigo-600 transition-colors"
                        >
                          {cust.name}
                        </Link>
                        {cust.customer_type === 'Warung / Grosir' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            Warung / Grosir
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Eceran
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-700">{cust.phone}</span>
                        {cust.address && <span>• {cust.address}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Middle Column: Balances (Kasbon) */}
                  <div className="flex-1 max-w-sm">
                    {/* Kasbon Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                            <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                            <span>Utang Kasbon:</span>
                          </span>
                          <span className={`font-extrabold text-sm ${cust.current_debt > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                            {formatIDR(cust.current_debt)}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden my-1.5">
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

                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>Limit: {formatIDR(cust.max_credit_limit)}</span>
                          <span>Sisa: {formatIDR(availableCredit)}</span>
                        </div>
                      </div>

                      <div className="mt-2 pt-1 border-t border-slate-200/70 flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={cust.current_debt <= 0}
                          onClick={() => {
                            setDebtCustomer(cust);
                            setIsDebtModalOpen(true);
                          }}
                          className="w-full py-1 px-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-[10px] font-bold transition-colors flex items-center justify-center gap-1"
                        >
                          <CreditCard className="w-3 h-3" />
                          <span>Bayar Cicilan</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Profile Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCustomer(cust);
                        setIsCustomerModalOpen(true);
                      }}
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                      title="Edit Data / Atur Limit Kredit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <Link
                      href={`/crm/${cust.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
                    >
                      <span>Lihat Histori</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Customer Add/Edit Modal */}
      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        customer={editingCustomer}
        onSaved={fetchCustomers}
      />

      {/* Debt Payment Modal */}
      <DebtPaymentModal
        isOpen={isDebtModalOpen}
        onClose={() => setIsDebtModalOpen(false)}
        customer={debtCustomer}
        onSaved={fetchCustomers}
      />
    </div>
  );
}

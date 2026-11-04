'use client';

import React, { useState, useMemo } from 'react';
import {
  User,
  Users,
  Search,
  X,
  CreditCard,
  Wallet,
  Check,
  AlertTriangle,
  ChevronDown,
  Sparkles,
  Store,
} from 'lucide-react';
import { ICustomer } from '@/lib/types';
import { formatIDR } from '@/lib/formatters';

interface CustomerSelectorProps {
  customers: ICustomer[];
  selectedCustomer: ICustomer | null;
  onSelectCustomer: (customer: ICustomer | null) => void;
  isLoading?: boolean;
  onOpenDebtModal?: () => void;
}

export function CustomerSelector({
  customers,
  selectedCustomer,
  onSelectCustomer,
  isLoading = false,
  onOpenDebtModal,
}: CustomerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Warung / Grosir' | 'Eceran'>('all');

  const filteredCustomers = useMemo(() => {
    let list = customers.filter((c) => c.is_active);

    if (filterType !== 'all') {
      list = list.filter((c) => c.customer_type === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
      );
    }

    return list;
  }, [customers, filterType, searchQuery]);

  // Credit calculation
  const creditUsagePercent = useMemo(() => {
    if (!selectedCustomer || selectedCustomer.max_credit_limit <= 0) return 0;
    return Math.min(
      100,
      Math.round((selectedCustomer.current_debt / selectedCustomer.max_credit_limit) * 100)
    );
  }, [selectedCustomer]);

  const availableCredit = useMemo(() => {
    if (!selectedCustomer) return 0;
    return Math.max(0, selectedCustomer.max_credit_limit - selectedCustomer.current_debt);
  }, [selectedCustomer]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      {/* Header / Active Customer Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              selectedCustomer?.customer_type === 'Warung / Grosir'
                ? 'bg-purple-100 text-purple-700'
                : selectedCustomer
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {selectedCustomer?.customer_type === 'Warung / Grosir' ? (
              <Store className="w-5 h-5" />
            ) : (
              <User className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-900 text-base">
                {selectedCustomer ? selectedCustomer.name : 'Pelanggan Umum (Walk-in)'}
              </span>

              {/* Dynamic Tier Badge */}
              {selectedCustomer?.customer_type === 'Warung / Grosir' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  Warung / Grosir (Harga Grosir)
                </span>
              ) : selectedCustomer ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Eceran (Harga Normal)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  Non-Member
                </span>
              )}
            </div>

            <p className="text-xs text-slate-500 mt-0.5">
              {selectedCustomer ? (
                <>
                  <span className="font-medium text-slate-600">{selectedCustomer.phone}</span>
                  {selectedCustomer.address && (
                    <span className="ml-2 text-slate-400">({selectedCustomer.address})</span>
                  )}
                </>
              ) : (
                'Transaksi tunai eceran standar tanpa pencatatan kasbon'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
          {selectedCustomer && onOpenDebtModal && (
            <button
              type="button"
              onClick={onOpenDebtModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-2xs transition-colors"
              title="Bayar Cicilan / Pelunasan Kasbon"
            >
              <CreditCard className="w-3.5 h-3.5 text-rose-600" />
              <span>Bayar Kasbon</span>
            </button>
          )}

          {selectedCustomer && (
            <button
              type="button"
              onClick={() => onSelectCustomer(null)}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title="Reset ke Pelanggan Umum"
            >
              Reset Umum
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            <span>{selectedCustomer ? 'Ganti Pelanggan' : 'Pilih Pelanggan'}</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>
        </div>
      </div>

      {/* Financial Status Panel (If registered customer is selected) */}
      {selectedCustomer && (
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          {/* Credit Limit & Current Debt */}
          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/70 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-slate-600 mb-1">
                <span className="flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  <span>Limit Kredit:</span>
                </span>
                <span className="font-bold text-slate-900">
                  {formatIDR(selectedCustomer.max_credit_limit)}
                </span>
              </div>

              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden my-1">
                <div
                  className={`h-full transition-all duration-300 ${
                    creditUsagePercent >= 90
                      ? 'bg-rose-500'
                      : creditUsagePercent >= 60
                      ? 'bg-amber-500'
                      : 'bg-blue-600'
                  }`}
                  style={{ width: `${creditUsagePercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                <span>
                  Utang: <strong className="text-slate-800">{formatIDR(selectedCustomer.current_debt)}</strong>
                </span>
                <span>
                  Sisa: <strong className="text-emerald-700">{formatIDR(availableCredit)}</strong>
                </span>
              </div>
            </div>

            {onOpenDebtModal && (
              <button
                type="button"
                onClick={onOpenDebtModal}
                className="mt-2 w-full py-1 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors"
              >
                <CreditCard className="w-3 h-3" />
                <span>Bayar Kasbon</span>
              </button>
            )}
          </div>

          {/* Active Pricing Notice */}
          <div
            className={`rounded-xl p-2.5 border flex items-center gap-2 ${
              selectedCustomer.customer_type === 'Warung / Grosir'
                ? 'bg-purple-50/80 border-purple-200 text-purple-900'
                : 'bg-blue-50/80 border-blue-200 text-blue-900'
            }`}
          >
            {selectedCustomer.customer_type === 'Warung / Grosir' ? (
              <>
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="text-[11px] leading-tight">
                  Katalog otomatis menggunakan <strong>Harga Grosir</strong> yang lebih murah untuk mitra warung.
                </span>
              </>
            ) : (
              <>
                <User className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-[11px] leading-tight">
                  Katalog menggunakan <strong>Harga Eceran</strong> standar toko.
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Customer Selection Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Pilih Pelanggan Kasir</h3>
                <p className="text-xs text-slate-500">
                  Harga katalog akan disesuaikan otomatis berdasarkan tier pelanggan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="p-3 bg-slate-50 border-b border-slate-100 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama pelanggan atau nomor HP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-white"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterType('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterType === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  Semua ({customers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('Warung / Grosir')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterType === 'Warung / Grosir'
                      ? 'bg-purple-700 text-white'
                      : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-200'
                  }`}
                >
                  Warung / Grosir
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('Eceran')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterType === 'Eceran'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                  }`}
                >
                  Eceran
                </button>
              </div>
            </div>

            {/* Customer List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {/* Option: Walk-in / Non-Member */}
              <button
                type="button"
                onClick={() => {
                  onSelectCustomer(null);
                  setIsOpen(false);
                }}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                  selectedCustomer === null
                    ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-slate-900">
                      Pelanggan Umum (Walk-in / Eceran)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Tanpa pencatatan kasbon/tabungan. Menggunakan harga eceran.
                    </p>
                  </div>
                </div>
                {selectedCustomer === null && (
                  <Check className="w-4 h-4 text-slate-900 shrink-0" />
                )}
              </button>

              {/* Registered Customers */}
              {isLoading ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Memuat data pelanggan...
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Tidak ada pelanggan yang cocok dengan pencarian &quot;{searchQuery}&quot;.
                </div>
              ) : (
                filteredCustomers.map((c) => {
                  const isSelected = selectedCustomer?.id === c.id;
                  const isWholesale = c.customer_type === 'Warung / Grosir';

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onSelectCustomer(c);
                        setIsOpen(false);
                      }}
                      className={`w-full p-3 rounded-xl border text-left flex items-start justify-between gap-3 transition-all ${
                        isSelected
                          ? isWholesale
                            ? 'border-purple-600 bg-purple-50/60 ring-1 ring-purple-600'
                            : 'border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600'
                          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                            isWholesale
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {isWholesale ? (
                            <Store className="w-4 h-4" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-xs text-slate-900">
                              {c.name}
                            </span>
                            <span
                              className={`px-2 py-0.2 rounded-full text-[10px] font-semibold ${
                                isWholesale
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {c.customer_type}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {c.phone} {c.address ? `• ${c.address}` : ''}
                          </p>

                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-600">
                            <span>
                              Utang: <strong>{formatIDR(c.current_debt)}</strong>
                            </span>
                            <span className="text-slate-300">|</span>
                            <span>
                              Limit: <strong>{formatIDR(c.max_credit_limit)}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div
                          className={`p-1 rounded-full ${
                            isWholesale ? 'bg-purple-600' : 'bg-emerald-600'
                          } text-white shrink-0`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

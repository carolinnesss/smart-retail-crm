'use client';

import React from 'react';
import {
  X,
  AlertTriangle,
  ShieldAlert,
  CreditCard,
  Banknote,
  Wallet,
  ArrowRight,
  UserCheck,
  ChevronRight,
} from 'lucide-react';
import { ICustomer } from '@/lib/types';
import { formatIDR } from '@/lib/formatters';

interface KasbonGuardModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: ICustomer | null;
  requestedDebt: number;
  onPayDebt?: () => void;
  onAdjustTender?: () => void;
}

export function KasbonGuardModal({
  isOpen,
  onClose,
  customer,
  requestedDebt,
  onPayDebt,
  onAdjustTender,
}: KasbonGuardModalProps) {
  if (!isOpen || !customer) return null;

  const maxCreditLimit = customer.max_credit_limit;
  const currentDebt = customer.current_debt;
  const projectedDebt = currentDebt + requestedDebt;
  const overLimitDeficit = Math.max(0, projectedDebt - maxCreditLimit);
  const availableHeadroom = Math.max(0, maxCreditLimit - currentDebt);

  // Utilization calculation
  const currentUsagePercent = maxCreditLimit > 0
    ? Math.min(100, Math.round((currentDebt / maxCreditLimit) * 100))
    : 100;
  const projectedUsagePercent = maxCreditLimit > 0
    ? Math.round((projectedDebt / maxCreditLimit) * 100)
    : 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-rose-200 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header with High-Visibility Warning */}
        <div className="p-5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/30">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <span>Proteksi Kasbon: Limit Terlampaui</span>
              </h3>
              <p className="text-xs text-rose-700 font-medium">
                Transaksi kasbon melebihi batas plafon kredit toko
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Customer Profile Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Informasi Pelanggan
                </span>
                <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                  {customer.name}
                </h4>
                <p className="text-xs text-slate-500">{customer.phone}</p>
              </div>

              <div className="text-right">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    customer.customer_type === 'Warung / Grosir'
                      ? 'bg-purple-100 text-purple-800 border border-purple-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {customer.customer_type}
                </span>
              </div>
            </div>
          </div>

          {/* Deficit Alert Banner */}
          <div className="p-4 rounded-2xl bg-rose-500 text-white shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-rose-100 block">
                Defisit Over-Limit (Kelebihan Kasbon):
              </span>
              <div className="text-2xl font-black mt-0.5">
                +{formatIDR(overLimitDeficit)}
              </div>
              <span className="text-[11px] text-rose-100">
                Maksimal kasbon yang dizinkan saat ini:{' '}
                <strong>{formatIDR(availableHeadroom)}</strong>
              </span>
            </div>
            <div className="p-2.5 bg-rose-600/60 rounded-2xl border border-rose-400/40">
              <AlertTriangle className="w-8 h-8 text-rose-100" />
            </div>
          </div>

          {/* Credit Ledger Calculations */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Batas Limit Kredit Toko (Plafon):</span>
              <span className="font-bold text-slate-900">{formatIDR(maxCreditLimit)}</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Utang Kasbon Berjalan Saat Ini:</span>
              <span className="font-bold text-rose-700">{formatIDR(currentDebt)}</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Kasbon Baru yang Diajukan di Kasir:</span>
              <span className="font-bold text-indigo-700">+{formatIDR(requestedDebt)}</span>
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm">
              <span className="text-slate-800">Total Proyeksi Utang:</span>
              <span className="text-rose-600">
                {formatIDR(projectedDebt)} ({projectedUsagePercent}%)
              </span>
            </div>

            {/* Credit Utilization Bar */}
            <div className="pt-1">
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-rose-600 transition-all duration-300"
                  style={{ width: `${Math.min(100, projectedUsagePercent)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Kapasitas kredit terpakai {currentUsagePercent}% sebelum transaksi. Penambahan ini akan melebihi 100% plafon limit.
              </p>
            </div>
          </div>

          {/* Recommended Resolution Actions */}
          <div className="space-y-2 pt-1">
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Opsi Solusi untuk Kasir & Pelanggan:
            </h5>

            {/* Option 1: Bayar Cicilan Kasbon terlebih dahulu */}
            {onPayDebt && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPayDebt();
                }}
                className="w-full p-3 rounded-2xl border border-rose-200 bg-rose-50/50 hover:bg-rose-100/70 text-left transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h6 className="font-bold text-xs text-rose-950">
                      Bayar Cicilan / Lunasi Utang Lama
                    </h6>
                    <p className="text-[11px] text-rose-800">
                      Pelanggan membayar cicilan kasbon untuk membebaskan sisa limit kredit.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-600 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </button>
            )}

            {/* Option 2: Tutup & Beralih ke Pembayaran Tunai */}
            <button
              type="button"
              onClick={() => {
                if (onAdjustTender) {
                  onAdjustTender();
                } else {
                  onClose();
                }
              }}
              className="w-full p-3 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <h6 className="font-bold text-xs text-slate-900">
                    Tutup & Pilih Bayar Tunai
                  </h6>
                  <p className="text-[11px] text-slate-500">
                    Selesaikan transaksi dengan pembayaran uang tunai (Quick Cash).
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
          >
            Mengerti & Kembali ke Kasir
          </button>
        </div>
      </div>
    </div>
  );
}

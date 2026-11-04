'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ArrowDownRight,
  Banknote,
  Building,
} from 'lucide-react';
import { ICustomer } from '@/lib/types';
import { formatIDR } from '@/lib/formatters';

interface DebtPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: ICustomer | null;
  onSuccess: () => Promise<void> | void;
}

const PRESET_PAYMENTS = [20000, 50000, 100000, 200000, 500000];

export function DebtPaymentModal({
  isOpen,
  onClose,
  customer,
  onSuccess,
}: DebtPaymentModalProps) {
  const [amountInput, setAmountInput] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && customer) {
      setAmountInput(customer.current_debt > 0 ? String(customer.current_debt) : '0');
      setPaymentMethod('cash');
      setNotes('Cicilan kasbon toko sembako');
      setErrorMessage(null);
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  const currentDebt = customer.current_debt;
  const maxCreditLimit = customer.max_credit_limit;
  const numAmount = Math.max(0, parseInt(amountInput.replace(/\D/g, ''), 10) || 0);

  const isOverpaying = numAmount > currentDebt;
  const remainingDebtAfter = Math.max(0, currentDebt - numAmount);
  const availableCreditAfter = Math.min(
    maxCreditLimit,
    Math.max(0, maxCreditLimit - remainingDebtAfter)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) {
      setErrorMessage('Nominal pembayaran kasbon harus lebih besar dari Rp 0.');
      return;
    }

    if (numAmount > currentDebt) {
      setErrorMessage(
        `Nominal pelunasan tidak boleh melebihi total utang kasbon berjalan (${formatIDR(currentDebt)}).`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const fullNotes = [
        paymentMethod === 'transfer' ? '[Transfer/QRIS]' : '[Tunai]',
        notes.trim(),
      ]
        .filter(Boolean)
        .join(' ');

      const res = await fetch('/api/debt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customer.id,
          payment_amount: numAmount,
          notes: fullNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memproses pembayaran kasbon.');
      }

      await onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-600/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Bayar Kasbon & Cicilan Utang
              </h3>
              <p className="text-xs text-slate-500">
                {customer.name} ({customer.phone})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Current Debt Banner */}
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider block">
                Total Utang Kasbon Berjalan
              </span>
              <div className="text-2xl font-black text-rose-950 mt-0.5">
                {formatIDR(currentDebt)}
              </div>
              <span className="text-[11px] text-rose-700 mt-1 block">
                Plafon Limit Kredit: {formatIDR(maxCreditLimit)}
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-700">
              <ArrowDownRight className="w-6 h-6" />
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Metode Pembayaran Kasbon
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  paymentMethod === 'cash'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>Uang Tunai (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  paymentMethod === 'transfer'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>Transfer Bank / QRIS</span>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Nominal Pembayaran / Cicilan *
              </label>
              {currentDebt > 0 && (
                <button
                  type="button"
                  onClick={() => setAmountInput(String(currentDebt))}
                  className="text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-rose-100 hover:bg-rose-200 px-2 py-0.5 rounded-md transition-colors"
                >
                  Lunasi Semua (Lump-Sum)
                </button>
              )}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">Rp</span>
              <input
                type="text"
                required
                value={amountInput}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setAmountInput(raw);
                }}
                className={`w-full pl-10 pr-3 py-2 text-base font-bold text-slate-900 rounded-xl border focus:outline-none focus:ring-2 ${
                  isOverpaying
                    ? 'border-rose-400 focus:ring-rose-500'
                    : 'border-slate-300 focus:ring-rose-500'
                }`}
              />
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PRESET_PAYMENTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={amt > currentDebt}
                  onClick={() => setAmountInput(String(amt))}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-semibold transition-colors"
                >
                  +{formatIDR(amt)}
                </button>
              ))}
            </div>

            {isOverpaying && (
              <div className="mt-2 text-xs text-rose-600 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Pembayaran melebihi sisa utang kasbon berjalan.</span>
              </div>
            )}
          </div>

          {/* Notes Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Catatan Pembayaran (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Cicilan mingguan tunai di kasir"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          {/* Status Breakdown Post Payment */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between items-center text-slate-600">
              <span>Sisa Utang Setelah Pembayaran:</span>
              <span
                className={`font-bold ${
                  remainingDebtAfter === 0 ? 'text-emerald-700 font-black' : 'text-slate-900'
                }`}
              >
                {remainingDebtAfter === 0 ? 'LUNAS (Rp 0)' : formatIDR(remainingDebtAfter)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Sisa Plafon Kredit Tersedia:</span>
              <span className="font-bold text-emerald-700">
                {formatIDR(availableCreditAfter)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || numAmount <= 0 || isOverpaying}
              className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <span>Konfirmasi Pembayaran</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

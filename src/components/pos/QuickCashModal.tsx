'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Banknote,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { ICustomer } from '@/lib/types';
import { formatIDR } from '@/lib/formatters';

interface QuickCashModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  customer: ICustomer | null;
  onConfirmPayment: (tenderAmount: number) => Promise<void>;
  isProcessing?: boolean;
}

const PRESET_DENOMINATIONS = [50000, 100000, 200000, 500000];

export function QuickCashModal({
  isOpen,
  onClose,
  grandTotal,
  customer,
  onConfirmPayment,
  isProcessing = false,
}: QuickCashModalProps) {
  const [tenderAmount, setTenderAmount] = useState<number>(grandTotal);
  const [inputVal, setInputVal] = useState<string>(String(grandTotal));

  // Reset tender amount when modal opens or grandTotal changes
  useEffect(() => {
    if (isOpen) {
      setTenderAmount(grandTotal);
      setInputVal(String(grandTotal));
    }
  }, [isOpen, grandTotal]);

  if (!isOpen) return null;

  const changeAmount = tenderAmount - grandTotal;
  const isSufficient = tenderAmount >= grandTotal;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = raw ? parseInt(raw, 10) : 0;
    setInputVal(raw);
    setTenderAmount(num);
  };

  const handleSelectPreset = (nominal: number) => {
    setTenderAmount(nominal);
    setInputVal(String(nominal));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSufficient || isProcessing) return;
    await onConfirmPayment(tenderAmount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Pembayaran Tunai Cepat</h3>
              <p className="text-xs text-slate-500">
                {customer ? `Pelanggan: ${customer.name}` : 'Pelanggan Umum (Eceran)'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Bill Summary */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 text-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Total Tagihan Belanja
            </span>
            <div className="text-3xl font-black mt-1 tracking-tight">
              {formatIDR(grandTotal)}
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-2">
              Pilihan Nominal Uang Tunai
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Uang Pas Button */}
              <button
                type="button"
                onClick={() => handleSelectPreset(grandTotal)}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
                  tenderAmount === grandTotal
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                Uang Pas
              </button>

              {PRESET_DENOMINATIONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
                    tenderAmount === preset
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {preset >= 1000 ? `${preset / 1000}k` : preset} ({formatIDR(preset)})
                </button>
              ))}
            </div>
          </div>

          {/* Custom Nominal Input */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Nominal Uang Diterima (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-sm font-bold text-slate-400">
                Rp
              </span>
              <input
                type="text"
                value={inputVal}
                onChange={handleInputChange}
                autoFocus
                className="w-full pl-11 pr-4 py-2.5 text-base font-extrabold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent bg-slate-50/50"
                placeholder="0"
              />
            </div>
          </div>

          {/* Kembalian / Kekurangan Alert */}
          <div
            className={`rounded-2xl p-4 border transition-all ${
              isSufficient
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isSufficient ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isSufficient ? 'Uang Kembalian' : 'Pembayaran Kurang'}
                </span>
              </div>
              <div
                className={`text-2xl font-black ${
                  isSufficient ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {formatIDR(Math.abs(changeAmount))}
              </div>
            </div>

            {!isSufficient && (
              <p className="text-xs text-rose-600 mt-1 font-medium">
                Uang yang diterima kurang {formatIDR(grandTotal - tenderAmount)}. Masukkan nominal yang cukup.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={!isSufficient || isProcessing}
              className="flex-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5"
            >
              {isProcessing ? (
                <span>Menyimpan Transaksi...</span>
              ) : (
                <>
                  <span>Selesaikan & Cetak Struk</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

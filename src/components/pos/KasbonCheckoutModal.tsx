'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Calendar,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { ICustomer } from '@/lib/types';
import { formatIDR, formatDate } from '@/lib/formatters';

interface KasbonCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  customer: ICustomer | null;
  onConfirmKasbon: (dueDate: string, notes?: string) => Promise<void>;
  isProcessing?: boolean;
}

export function KasbonCheckoutModal({
  isOpen,
  onClose,
  grandTotal,
  customer,
  onConfirmKasbon,
  isProcessing = false,
}: KasbonCheckoutModalProps) {
  // Default due date: 14 days from today
  const defaultDueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const [dueDate, setDueDate] = useState<string>(defaultDueDate);
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setDueDate(
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10)
      );
      setNotes('');
    }
  }, [isOpen]);

  if (!isOpen || !customer) return null;

  const currentDebt = customer.current_debt;
  const maxLimit = customer.max_credit_limit;
  const projectedDebt = currentDebt + grandTotal;
  const remainingHeadroomAfter = Math.max(0, maxLimit - projectedDebt);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueDate || isProcessing) return;
    await onConfirmKasbon(new Date(dueDate).toISOString(), notes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-indigo-100 max-w-md w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Pembayaran Kasbon (Kredit)</h3>
              <p className="text-xs text-indigo-700 font-medium">
                Pencatatan utang ke buku besar pelanggan
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Bill Summary */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 text-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Total Tagihan Kasbon
            </span>
            <div className="text-3xl font-black mt-1 tracking-tight text-indigo-300">
              {formatIDR(grandTotal)}
            </div>
          </div>

          {/* Customer Credit Info */}
          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 space-y-2 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="font-semibold text-slate-600">Pelanggan:</span>
              <span className="font-bold text-slate-900">{customer.name}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Plafon Limit Kredit:</span>
              <span className="font-semibold">{formatIDR(maxLimit)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Utang Berjalan Saat Ini:</span>
              <span className="font-semibold text-rose-600">{formatIDR(currentDebt)}</span>
            </div>
            <div className="flex justify-between text-slate-700 font-bold pt-1 border-t border-slate-200">
              <span>Total Proyeksi Utang:</span>
              <span className="text-indigo-700">{formatIDR(projectedDebt)}</span>
            </div>
            <div className="flex justify-between text-slate-500 text-[11px]">
              <span>Sisa Plafon Setelah Transaksi:</span>
              <span className="font-bold text-emerald-600">{formatIDR(remainingHeadroomAfter)}</span>
            </div>
          </div>

          {/* Due Date Picker */}
          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Tanggal Jatuh Tempo (Wajib)</span>
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-800 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white shadow-2xs"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Default 14 hari dari hari ini.
            </p>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Catatan Transaksi (Opsional)</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: Belanja mingguan warung"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent bg-white"
            />
          </div>

          {/* Actions */}
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
              disabled={isProcessing || !dueDate}
              className="flex-2 py-3 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              {isProcessing ? (
                <span>Menyimpan Kasbon...</span>
              ) : (
                <>
                  <span>Konfirmasi & Cetak Struk</span>
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

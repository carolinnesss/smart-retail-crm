'use client';

import React from 'react';
import {
  Printer,
  CheckCircle2,
  X,
  MessageCircle,
  ShoppingBag,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { ITransaction, ICustomer } from '@/lib/types';
import { formatIDR, formatDate } from '@/lib/formatters';
import { buildReceiptWhatsAppMessage, buildWhatsAppLink } from '@/lib/whatsapp';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: ITransaction | null;
  customer?: ICustomer | null;
  cashTendered?: number;
  onNewTransaction?: () => void;
}

export function ReceiptModal({
  isOpen,
  onClose,
  transaction,
  customer,
  cashTendered,
  onNewTransaction,
}: ReceiptModalProps) {
  if (!isOpen || !transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleNewOrder = () => {
    if (onNewTransaction) {
      onNewTransaction();
    }
    onClose();
  };

  const cashChange =
    cashTendered && cashTendered > transaction.cash_amount
      ? cashTendered - transaction.cash_amount
      : 0;

  // WhatsApp receipt text generator
  const generateWhatsAppReceipt = () => {
    if (!customer?.phone) return;
    const msg = buildReceiptWhatsAppMessage(transaction, 'Toko Sembako Berkah Mandiri');
    const link = buildWhatsAppLink(customer.phone, msg);
    if (link) {
      window.open(link, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Top Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Transaksi Berhasil!</h3>
              <p className="text-[11px] text-slate-500">Struk digital kasir otomatis tercetak</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Paper Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          <div
            id="thermal-receipt"
            className="bg-white text-slate-800 p-5 rounded-lg shadow-sm border border-slate-300 w-full max-w-sm font-mono text-xs leading-tight"
          >
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-400">
              <h2 className="font-bold text-sm tracking-wider uppercase text-slate-900">
                TOKO BERKAH MANDIRI
              </h2>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Pusat Sembako Grosir & Eceran Terpercaya
              </p>
              <p className="text-[10px] text-slate-500">
                Jl. Raya Pasar Minggu No. 45, Jakarta Selatan
              </p>
              <p className="text-[10px] text-slate-500">Telp: 0812-9876-5432</p>
            </div>

            {/* Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px] space-y-0.5">
              <div className="flex justify-between">
                <span>No. Nota:</span>
                <span className="font-bold text-slate-900">{transaction.invoice_number}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu:</span>
                <span>{formatDate(transaction.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span>Pelanggan:</span>
                <span className="font-semibold text-slate-900">
                  {transaction.customer_name || 'Pelanggan Umum'}
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>Kasir:</span>
                <span className="font-medium text-slate-800">
                  {transaction.cashier_name || 'Kasir Bertugas'}
                </span>
              </div>
              {customer && (
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>Tipe Harga:</span>
                  <span>{customer.customer_type}</span>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-2">
              {(transaction.items || []).map((it, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="font-bold text-slate-900 truncate">
                    {it.product_name || 'Produk Sembako'}
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600 pl-2">
                    <span>
                      {it.quantity} x {formatIDR(it.unit_price)}{' '}
                      {it.price_type === 'wholesale' && (
                        <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1 rounded">
                          GROSIR
                        </span>
                      )}
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatIDR(it.subtotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatIDR(transaction.total_amount)}</span>
              </div>

              {transaction.discount_amount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Diskon:</span>
                  <span>-{formatIDR(transaction.discount_amount)}</span>
                </div>
              )}

              <div className="pt-1 border-t border-slate-300 flex justify-between font-bold text-sm text-slate-900">
                <span>TOTAL AKHIR:</span>
                <span>{formatIDR(transaction.final_amount)}</span>
              </div>
            </div>

            {/* Payment Method Details */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
              <div className="flex justify-between font-bold text-slate-800">
                <span>Metode Bayar:</span>
                <span className="uppercase text-emerald-800">{transaction.payment_method}</span>
              </div>

              {transaction.payment_method === 'TUNAI' && (
                <>
                  <div className="flex justify-between pl-2">
                    <span>• Uang Diterima:</span>
                    <span className="font-semibold">
                      {formatIDR(transaction.cash_tendered ?? cashTendered ?? transaction.final_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-700 pl-2">
                    <span>• Kembalian Tunai:</span>
                    <span>
                      {formatIDR(
                        transaction.change_amount ??
                          cashChange ??
                          Math.max(
                            0,
                            (transaction.cash_tendered ?? cashTendered ?? transaction.final_amount) -
                              transaction.final_amount
                          )
                      )}
                    </span>
                  </div>
                </>
              )}

              {transaction.payment_method === 'KASBON' && (
                <>
                  <div className="flex justify-between pl-2 text-rose-800">
                    <span>• Kasbon Baru:</span>
                    <span className="font-semibold">{formatIDR(transaction.final_amount)}</span>
                  </div>
                  {transaction.due_date && (
                    <div className="flex justify-between pl-2 text-slate-700">
                      <span>• Jatuh Tempo:</span>
                      <span className="font-semibold">{formatDate(transaction.due_date)}</span>
                    </div>
                  )}
                  {customer && (
                    <div className="flex justify-between pl-2 font-bold text-rose-700 pt-1 border-t border-slate-200">
                      <span>• Sisa Utang Terbaru:</span>
                      <span>{formatIDR(customer.current_debt)}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Customer Post-Transaction Balances (Kasbon info) */}
            {customer && transaction.payment_method === 'KASBON' && (
              <div className="py-2.5 border-b border-dashed border-slate-400 text-[10px] space-y-0.5 text-slate-600 bg-slate-50 p-2 rounded">
                <div className="font-bold text-slate-700 mb-0.5">STATUS KASBON PELANGGAN:</div>
                <div className="flex justify-between">
                  <span>Total Utang Berjalan:</span>
                  <span className="font-bold text-rose-700">
                    {formatIDR(customer.current_debt)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Sisa Limit Kredit:</span>
                  <span className="font-bold text-slate-800">
                    {formatIDR(Math.max(0, customer.max_credit_limit - customer.current_debt))}
                  </span>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="text-center pt-3 text-[10px] text-slate-500 space-y-1">
              <p className="font-semibold text-slate-700">TERIMA KASIH ATAS KUNJUNGAN ANDA</p>
              <p>Barang sembako yang sudah dibeli tidak dapat ditukar kembali.</p>
              <p className="text-[9px] text-slate-400">Smart Retail CRM & POS Toko Sembako</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Struk</span>
            </button>

            {customer?.phone && (
              <button
                type="button"
                onClick={generateWhatsAppReceipt}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Kirim WA</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleNewOrder}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors ml-auto"
          >
            <span>Transaksi Baru</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

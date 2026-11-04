'use client';

import React, { useState } from 'react';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Tag,
  Percent,
  Sparkles,
  ArrowRight,
  RotateCcw,
  AlertCircle,
  Banknote,
  Layers,
} from 'lucide-react';
import { ICustomer } from '@/lib/types';
import { CartItem } from '@/hooks/useCart';
import { formatIDR } from '@/lib/formatters';

interface CartSummaryProps {
  items: CartItem[];
  customer: ICustomer | null;
  subtotal: number;
  cartDiscount: number;
  grandTotal: number;
  totalQuantity: number;
  totalItems: number;
  totalSavings: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onIncrementQuantity: (productId: string, step?: number) => void;
  onDecrementQuantity: (productId: string, step?: number) => void;
  onSetItemDiscount: (productId: string, discount: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onSetCartDiscount: (discount: number) => void;
  onCheckout: () => void;
  onPayKasbon?: () => void;
  isSubmitting?: boolean;
}

export function CartSummary({
  items,
  customer,
  subtotal,
  cartDiscount,
  grandTotal,
  totalQuantity,
  totalItems,
  totalSavings,
  onUpdateQuantity,
  onIncrementQuantity,
  onDecrementQuantity,
  onSetItemDiscount,
  onRemoveItem,
  onClearCart,
  onSetCartDiscount,
  onCheckout,
  onPayKasbon,
  isSubmitting = false,
}: CartSummaryProps) {
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);
  const [discountInputs, setDiscountInputs] = useState<Record<string, string>>({});
  const [cartDiscountInput, setCartDiscountInput] = useState<string>(
    cartDiscount > 0 ? String(cartDiscount) : ''
  );

  const isWholesaleCustomer = customer?.customer_type === 'Warung / Grosir';

  const handleApplyItemDiscount = (productId: string) => {
    const rawVal = discountInputs[productId];
    const num = rawVal ? Math.max(0, parseInt(rawVal.replace(/\D/g, ''), 10) || 0) : 0;
    onSetItemDiscount(productId, num);
    setEditingDiscountId(null);
  };

  const handleApplyCartDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    const num = cartDiscountInput ? Math.max(0, parseInt(cartDiscountInput.replace(/\D/g, ''), 10) || 0) : 0;
    onSetCartDiscount(num);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
      {/* Cart Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Keranjang Kasir</h3>
            <span className="text-[11px] text-slate-500">
              {totalItems} item ({totalQuantity} unit)
            </span>
          </div>
        </div>

        {items.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Kosongkan semua barang di keranjang?')) {
                onClearCart();
              }
            }}
            className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition-colors font-medium"
            title="Kosongkan Keranjang"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Kosongkan</span>
          </button>
        )}
      </div>

      {/* Cart Item List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {items.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
              <ShoppingCart className="w-7 h-7 text-slate-300" />
            </div>
            <h4 className="font-bold text-slate-700 text-sm">Keranjang Masih Kosong</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
              Klik produk pada katalog sembako di sebelah kiri untuk menambahkan.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const isKgUnit = item.product.unit.toLowerCase() === 'kg';
            const step = isKgUnit ? 0.5 : 1;
            const isEditingDiscount = editingDiscountId === item.product.id;

            return (
              <div
                key={item.product.id}
                className="bg-slate-50/70 hover:bg-slate-50 rounded-xl p-3 border border-slate-200/80 transition-colors"
              >
                {/* Item Info Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="font-bold text-xs text-slate-900 truncate">
                        {item.product.name}
                      </h4>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                          item.priceType === 'wholesale'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {item.priceType === 'wholesale' ? 'Grosir' : 'Eceran'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 mt-0.5">
                      <span>{formatIDR(item.appliedPrice)}</span>
                      <span className="text-slate-400"> / {item.product.unit}</span>
                      {item.priceType === 'wholesale' &&
                        item.appliedPrice < item.product.retail_price && (
                          <span className="ml-1 text-[10px] text-purple-600 font-medium">
                            (hemat {formatIDR(item.product.retail_price - item.appliedPrice)})
                          </span>
                        )}
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.product.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors"
                    title="Hapus dari keranjang"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quantity Controls & Line Subtotal */}
                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-200/50">
                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => onDecrementQuantity(item.product.id, step)}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      title="Kurangi"
                    >
                      <Minus className="w-3 h-3" />
                    </button>

                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val >= 0) {
                          onUpdateQuantity(item.product.id, val);
                        }
                      }}
                      className="w-16 text-center text-xs font-bold text-slate-900 focus:outline-none bg-transparent"
                    />

                    <button
                      type="button"
                      onClick={() => onIncrementQuantity(item.product.id, step)}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                      title="Tambah"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Line Subtotal */}
                  <div className="text-right">
                    {item.itemDiscount > 0 && (
                      <div className="text-[10px] text-rose-600 font-medium">
                        Diskon: -{formatIDR(item.itemDiscount)}
                      </div>
                    )}
                    <div className="text-sm font-extrabold text-slate-900">
                      {formatIDR(item.lineSubtotal)}
                    </div>
                  </div>
                </div>

                {/* Line Item Discount Row */}
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  {isEditingDiscount ? (
                    <div className="flex items-center gap-1.5 w-full mt-1">
                      <input
                        type="text"
                        placeholder="Potongan Rp..."
                        value={
                          discountInputs[item.product.id] ??
                          (item.itemDiscount > 0 ? String(item.itemDiscount) : '')
                        }
                        onChange={(e) =>
                          setDiscountInputs({
                            ...discountInputs,
                            [item.product.id]: e.target.value,
                          })
                        }
                        autoFocus
                        className="flex-1 px-2 py-1 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyItemDiscount(item.product.id)}
                        className="px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded-md"
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingDiscountId(null)}
                        className="px-2 py-1 bg-slate-200 text-slate-700 text-[10px] font-medium rounded-md"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDiscountId(item.product.id);
                        setDiscountInputs({
                          ...discountInputs,
                          [item.product.id]: item.itemDiscount > 0 ? String(item.itemDiscount) : '',
                        });
                      }}
                      className="text-slate-400 hover:text-slate-700 inline-flex items-center gap-1 hover:underline"
                    >
                      <Tag className="w-3 h-3" />
                      <span>
                        {item.itemDiscount > 0
                          ? `Edit Diskon: ${formatIDR(item.itemDiscount)}`
                          : '+ Tambah Diskon Item'}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cart Summary & Checkout Footer */}
      {items.length > 0 && (
        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
          {/* Subtotal & Cart Discount */}
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal Belanja:</span>
              <span className="font-semibold text-slate-900">{formatIDR(subtotal)}</span>
            </div>

            {/* Global Cart Discount Input */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-slate-600 flex items-center gap-1">
                <Percent className="w-3 h-3 text-slate-400" />
                <span>Diskon Keranjang:</span>
              </span>
              <div className="flex items-center gap-1 w-32">
                <input
                  type="text"
                  placeholder="Rp 0"
                  value={cartDiscountInput}
                  onChange={(e) => setCartDiscountInput(e.target.value)}
                  onBlur={() => {
                    const num = cartDiscountInput
                      ? Math.max(0, parseInt(cartDiscountInput.replace(/\D/g, ''), 10) || 0)
                      : 0;
                    onSetCartDiscount(num);
                  }}
                  className="w-full text-right px-2 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
                />
              </div>
            </div>

            {cartDiscount > 0 && (
              <div className="flex justify-between text-rose-600 font-medium">
                <span>Potongan Tambahan:</span>
                <span>-{formatIDR(cartDiscount)}</span>
              </div>
            )}
          </div>

          {/* Wholesale Savings Notification */}
          {totalSavings > 0 && (
            <div className="bg-emerald-100/70 border border-emerald-300/60 rounded-xl px-3 py-2 flex items-center gap-2 text-xs text-emerald-900">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Total Hemat:{' '}
                <strong className="text-emerald-950 font-bold">{formatIDR(totalSavings)}</strong>{' '}
                {isWholesaleCustomer && '(Grosir + Diskon)'}
              </span>
            </div>
          )}

          {/* Grand Total */}
          <div className="pt-2 border-t border-slate-200 flex items-baseline justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Total Tagihan
              </span>
              <span className="text-[11px] text-slate-400">
                {customer ? `Pelanggan: ${customer.name}` : 'Pelanggan Umum'}
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              {formatIDR(grandTotal)}
            </div>
          </div>

          {/* Checkout Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={onCheckout}
              disabled={isSubmitting || grandTotal <= 0}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Memproses...</span>
              ) : (
                <>
                  <Banknote className="w-4 h-4" />
                  <span>Bayar Tunai</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {onPayKasbon && (
              <button
                type="button"
                onClick={onPayKasbon}
                disabled={isSubmitting || grandTotal <= 0}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Layers className="w-4 h-4" />
                <span>Bayar Kasbon</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Store,
  RefreshCw,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import { ICustomer, IProduct, ITransaction, CreateTransactionInput } from '@/lib/types';
import { useCart } from '@/hooks/useCart';
import { CustomerSelector } from '@/components/pos/CustomerSelector';
import { ProductCatalogGrid } from '@/components/pos/ProductCatalogGrid';
import { CartSummary } from '@/components/pos/CartSummary';
import { QuickCashModal } from '@/components/pos/QuickCashModal';
import { KasbonCheckoutModal } from '@/components/pos/KasbonCheckoutModal';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import { KasbonGuardModal } from '@/components/pos/KasbonGuardModal';
import { DebtPaymentModal } from '@/components/pos/DebtPaymentModal';

export default function PosPage() {
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);

  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [isQuickCashOpen, setIsQuickCashOpen] = useState<boolean>(false);
  const [isKasbonCheckoutOpen, setIsKasbonCheckoutOpen] = useState<boolean>(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [isKasbonGuardOpen, setIsKasbonGuardOpen] = useState<boolean>(false);
  const [kasbonGuardDebt, setKasbonGuardDebt] = useState<number>(0);
  const [isDebtPaymentModalOpen, setIsDebtPaymentModalOpen] = useState<boolean>(false);
  const [completedTransaction, setCompletedTransaction] = useState<ITransaction | null>(null);
  const [lastCashTendered, setLastCashTendered] = useState<number>(0);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);

  // Cart Hook
  const cart = useCart(selectedCustomer);

  // Fetch initial products and customers
  const loadInitialData = useCallback(async () => {
    setIsLoadingData(true);
    setErrorMessage(null);
    try {
      const [resCust, resProd, resAppr] = await Promise.all([
        fetch('/api/customers'),
        fetch('/api/products'),
        fetch('/api/approvals').catch(() => null),
      ]);

      const dataCust = await resCust.json();
      const dataProd = await resProd.json();
      if (resAppr && resAppr.ok) {
        const dataAppr = await resAppr.json();
        if (dataAppr.success && Array.isArray(dataAppr.pending_accounts)) {
          setPendingApprovalsCount(dataAppr.pending_accounts.length);
        }
      }

      let freshCustomers: ICustomer[] = [];
      let freshProducts: IProduct[] = [];

      if (dataCust.success && Array.isArray(dataCust.data)) {
        freshCustomers = dataCust.data;
        setCustomers(freshCustomers);
      }
      if (dataProd.success && Array.isArray(dataProd.data)) {
        freshProducts = dataProd.data;
        setProducts(freshProducts);
      }
      return { customers: freshCustomers, products: freshProducts };
    } catch (err: any) {
      setErrorMessage('Gagal memuat data POS dari server. Coba muat ulang.');
      return null;
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Handle Customer Selection
  const handleSelectCustomer = (customer: ICustomer | null) => {
    setSelectedCustomer(customer);
    cart.setCustomer(customer);
  };

  // Add product to cart with check
  const handleAddToCart = (product: IProduct) => {
    const res = cart.addItem(product, 1);
    if (!res.success && res.message) {
      alert(res.message);
    }
  };

  // Process Transaction Checkout
  const handleCheckoutSubmission = async (paymentData: {
    payment_method: 'TUNAI' | 'KASBON';
    cash_amount?: number;
    cash_tendered?: number;
    change_amount?: number;
    debt_amount?: number;
    due_date?: string;
    notes?: string;
  }) => {
    if (cart.items.length === 0) {
      alert('Keranjang belanja masih kosong!');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const totalLineDiscounts = cart.items.reduce((acc, it) => acc + (it.itemDiscount || 0), 0);
    const grossTotal = cart.items.reduce(
      (acc, it) => acc + Math.round(it.quantity * it.appliedPrice),
      0
    );
    const totalDiscount = Math.min(grossTotal, totalLineDiscounts + (cart.cartDiscount || 0));

    const payload: CreateTransactionInput = {
      customer_id: selectedCustomer ? selectedCustomer.id : null,
      items: cart.items.map((it) => ({
        product_id: it.product.id,
        quantity: it.quantity,
        unit_price: it.appliedPrice,
        price_type: it.priceType,
      })),
      discount_amount: totalDiscount,
      payment_method: paymentData.payment_method,
      cash_amount: paymentData.cash_amount ?? 0,
      cash_tendered: paymentData.cash_tendered,
      change_amount: paymentData.change_amount ?? 0,
      debt_amount: paymentData.debt_amount ?? 0,
      due_date: paymentData.due_date,
      notes: paymentData.notes,
    };

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.error && (json.error.includes('melebihi limit kredit') || json.error.includes('Kasbon ditolak'))) {
          setKasbonGuardDebt(cart.grandTotal);
          setIsKasbonGuardOpen(true);
        }
        throw new Error(json.error || 'Terjadi kesalahan saat memproses checkout.');
      }

      const createdTx: ITransaction = json.data;
      setCompletedTransaction(createdTx);

      // Refresh products and customers data
      const freshData = await loadInitialData();

      // If customer was selected, re-select from fresh loaded data
      if (selectedCustomer && freshData) {
        const freshCust = freshData.customers.find((c) => c.id === selectedCustomer.id);
        if (freshCust) {
          setSelectedCustomer(freshCust);
          cart.setCustomer(freshCust);
        }
      }

      // Close checkout modals and open receipt modal
      setIsQuickCashOpen(false);
      setIsKasbonCheckoutOpen(false);
      setIsReceiptOpen(true);

      // Reset cart
      cart.clearCart();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan transaksi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Cash Confirmation (TUNAI)
  const handleConfirmQuickCash = async (tenderAmount: number) => {
    setLastCashTendered(tenderAmount);
    await handleCheckoutSubmission({
      payment_method: 'TUNAI',
      cash_amount: cart.grandTotal,
      cash_tendered: tenderAmount,
      change_amount: Math.max(0, tenderAmount - cart.grandTotal),
    });
  };

  // Initiate Kasbon Checkout
  const handleInitiateKasbon = () => {
    if (cart.items.length === 0) {
      alert('Keranjang belanja masih kosong!');
      return;
    }

    if (!selectedCustomer) {
      alert('Pembeli umum (walk-in) dilarang menggunakan kasbon. Wajib memilih pelanggan terdaftar.');
      return;
    }

    // Kasbon Guard check
    const projectedDebt = selectedCustomer.current_debt + cart.grandTotal;
    if (projectedDebt > selectedCustomer.max_credit_limit) {
      setKasbonGuardDebt(cart.grandTotal);
      setIsKasbonGuardOpen(true);
      return;
    }

    setIsKasbonCheckoutOpen(true);
  };

  // Confirm Kasbon Checkout
  const handleConfirmKasbon = async (dueDate: string, notes?: string) => {
    await handleCheckoutSubmission({
      payment_method: 'KASBON',
      debt_amount: cart.grandTotal,
      due_date: dueDate,
      notes,
    });
  };

  return (
    <div className="space-y-4">
      {/* Top POS Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/20">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Kasir POS Pintar Sembako
            </h1>
            <p className="text-xs text-slate-500">
              Penyesuaian otomatis harga grosir vs eceran & proteksi limit kasbon
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadInitialData}
            disabled={isLoadingData}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            title="Muat Ulang Katalog & Data Pelanggan"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>

          <Link
            href="/crm"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
          >
            <span>Buku CRM & Kasbon</span>
          </Link>

          <Link
            href="/persetujuan"
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl transition-colors ${
              pendingApprovalsCount > 0
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30 hover:bg-amber-600 animate-pulse'
                : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
            }`}
            title="Antrean Persetujuan Akun Pelanggan Baru"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Persetujuan ({pendingApprovalsCount})</span>
          </Link>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Customer Selector Bar */}
      <CustomerSelector
        customers={customers}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={handleSelectCustomer}
        isLoading={isLoadingData}
        onOpenDebtModal={() => setIsDebtPaymentModalOpen(true)}
      />

      {/* Main Cashier Workspace (Catalog Grid + Cart Summary) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Product Catalog Grid (7 Columns on LG) */}
        <div className="lg:col-span-7 xl:col-span-8 min-h-[580px]">
          <ProductCatalogGrid
            products={products}
            activeCustomer={selectedCustomer}
            onAddToCart={handleAddToCart}
            cartItems={cart.items}
            isLoading={isLoadingData}
          />
        </div>

        {/* Cart Summary (5 Columns on LG) */}
        <div className="lg:col-span-5 xl:col-span-4 min-h-[580px]">
          <CartSummary
            items={cart.items}
            customer={selectedCustomer}
            subtotal={cart.subtotal}
            cartDiscount={cart.cartDiscount}
            grandTotal={cart.grandTotal}
            totalQuantity={cart.totalQuantity}
            totalItems={cart.totalItems}
            totalSavings={cart.totalSavings}
            onUpdateQuantity={(id, q) => {
              const res = cart.updateQuantity(id, q);
              if (!res.success && res.message) alert(res.message);
            }}
            onIncrementQuantity={(id, step) => {
              const res = cart.incrementQuantity(id, step);
              if (!res.success && res.message) alert(res.message);
            }}
            onDecrementQuantity={cart.decrementQuantity}
            onSetItemDiscount={cart.setItemDiscount}
            onRemoveItem={cart.removeItem}
            onClearCart={cart.clearCart}
            onSetCartDiscount={cart.setCartDiscount}
            onCheckout={() => setIsQuickCashOpen(true)}
            onPayKasbon={handleInitiateKasbon}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>

      {/* Quick Cash Checkout Modal (TUNAI) */}
      <QuickCashModal
        isOpen={isQuickCashOpen}
        onClose={() => setIsQuickCashOpen(false)}
        grandTotal={cart.grandTotal}
        customer={selectedCustomer}
        onConfirmPayment={handleConfirmQuickCash}
        isProcessing={isSubmitting}
      />

      {/* Kasbon Checkout Modal (KASBON) */}
      <KasbonCheckoutModal
        isOpen={isKasbonCheckoutOpen}
        onClose={() => setIsKasbonCheckoutOpen(false)}
        grandTotal={cart.grandTotal}
        customer={selectedCustomer}
        onConfirmKasbon={handleConfirmKasbon}
        isProcessing={isSubmitting}
      />

      {/* Kasbon Credit Limit Guard Modal */}
      <KasbonGuardModal
        isOpen={isKasbonGuardOpen}
        onClose={() => setIsKasbonGuardOpen(false)}
        customer={selectedCustomer}
        requestedDebt={kasbonGuardDebt}
        onPayDebt={() => {
          setIsDebtPaymentModalOpen(true);
        }}
        onAdjustTender={() => {
          setIsKasbonGuardOpen(false);
          setIsQuickCashOpen(true);
        }}
      />

      {/* Debt Payment Modal (Installments & Full Settlement) */}
      <DebtPaymentModal
        isOpen={isDebtPaymentModalOpen}
        onClose={() => setIsDebtPaymentModalOpen(false)}
        customer={selectedCustomer}
        onSuccess={async () => {
          const fresh = await loadInitialData();
          if (selectedCustomer && fresh) {
            const updated = fresh.customers.find((c) => c.id === selectedCustomer.id);
            if (updated) {
              setSelectedCustomer(updated);
              cart.setCustomer(updated);
            }
          }
        }}
      />

      {/* Realistic Indonesian Thermal Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        transaction={completedTransaction}
        customer={selectedCustomer}
        cashTendered={lastCashTendered}
        onNewTransaction={() => {
          cart.clearCart();
        }}
      />
    </div>
  );
}

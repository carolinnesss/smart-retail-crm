'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Receipt,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ShoppingBag,
  Search,
  X,
  Plus,
  Minus,
  Trash2,
  Package,
  Sparkles,
  Tag,
  MessageCircle,
  Copy,
  Check,
  Store,
  ArrowRight,
  Calculator,
} from 'lucide-react';
import { formatIDR, formatDate, formatDecimalQty } from '@/lib/formatters';
import { CustomerType } from '@/lib/types';
import {
  ICustomerCatalogItem,
  ICustomerStoreContact,
  IEstimationItem,
  EstimationPaymentPlan,
  filterCatalogProducts,
  upsertEstimationItem,
  setEstimationItemQty,
  reconcileEstimationItems,
  summarizeEstimation,
  supportsDecimalQuantity,
  buildCustomerEstimateMessage,
  buildCustomerEstimateWhatsAppLink,
} from '@/lib/customer-catalog';

interface CustomerProfile {
  id: string;
  name: string;
  whatsapp_number: string;
  customer_type: CustomerType;
  total_debt: number;
  max_credit_limit: number;
  remaining_credit: number;
  debt_due_date: string | null;
  is_debt_overdue: boolean;
  overdue_days: number;
}

interface TransactionItem {
  id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface Transaction {
  id: string;
  invoice_number: string;
  created_at: string;
  final_amount: number;
  payment_method: string;
  cash_amount: number;
  cash_tendered?: number;
  change_amount?: number;
  debt_amount: number;
  due_date?: string | null;
  items?: TransactionItem[];
}

type PortalTab = 'overview' | 'catalog' | 'estimate';
type StockFilter = 'ALL' | 'AVAILABLE' | 'LOW_STOCK';

function EstimationQtyInput({
  value,
  max,
  isDecimal,
  onCommit,
}: {
  value: number;
  max: number;
  isDecimal: boolean;
  onCommit: (nextQty: number) => void;
}) {
  const [draft, setDraft] = useState<string>(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commitDraft = () => {
    const normalized = draft.replace(',', '.').trim();
    if (!normalized) {
      setDraft(String(value));
      return;
    }
    const parsed = Number(normalized);
    if (isNaN(parsed) || parsed <= 0) {
      setDraft(String(value));
      return;
    }
    onCommit(parsed);
    if (parsed > max) {
      setDraft(String(value));
    }
  };

  return (
    <input
      type="text"
      inputMode={isDecimal ? 'decimal' : 'numeric'}
      value={draft}
      onChange={(e) => {
        const nextText = e.target.value;
        setDraft(nextText);
        const normalized = nextText.replace(',', '.').trim();
        if (normalized && !normalized.endsWith('.')) {
          const parsed = Number(normalized);
          if (!isNaN(parsed) && parsed > 0 && parsed <= max) {
            onCommit(parsed);
          }
        }
      }}
      onBlur={commitDraft}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      aria-label="Jumlah barang"
      className="w-16 text-center text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500"
    />
  );
}

export default function PelangganPortalPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);

  // Catalog & Estimation State
  const [activeTab, setActiveTab] = useState<PortalTab>('overview');
  const [catalogProducts, setCatalogProducts] = useState<ICustomerCatalogItem[]>([]);
  const [categories, setCategories] = useState<string[]>(['Semua']);
  const [storeInfo, setStoreInfo] = useState<ICustomerStoreContact | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [stockFilter, setStockFilter] = useState<StockFilter>('ALL');

  const [estimationItems, setEstimationItems] = useState<IEstimationItem[]>([]);
  const [paymentPlan, setPaymentPlan] = useState<EstimationPaymentPlan>('TUNAI');
  const [estimateNotes, setEstimateNotes] = useState('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draftStorageKey = profile?.id
    ? `pelanggan_estimasi_${profile.id}`
    : null;

  const loadData = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setCatalogError(null);

      try {
        const [resProfile, resTx, resCatalog] = await Promise.all([
          fetch('/api/pelanggan/portal/me'),
          fetch('/api/pelanggan/portal/transactions'),
          fetch('/api/pelanggan/portal/catalog').catch(() => null),
        ]);

        if (
          resProfile.status === 401 ||
          (resCatalog && resCatalog.status === 401)
        ) {
          router.push('/pelanggan/login');
          return;
        }

        const dataProfile = await resProfile.json();
        const dataTx = await resTx.json();

        let loadedProfile: CustomerProfile | null = null;
        if (dataProfile.success) {
          loadedProfile = dataProfile.data;
          setProfile(dataProfile.data);
        } else {
          setError(dataProfile.error || 'Gagal memuat profil');
        }

        if (dataTx.success) {
          setTransactions(dataTx.data || []);
        }

        if (resCatalog && resCatalog.ok) {
          const dataCatalog = await resCatalog.json();
          if (dataCatalog.success && dataCatalog.data) {
            const fetchedProducts: ICustomerCatalogItem[] =
              dataCatalog.data.products || [];
            setCatalogProducts(fetchedProducts);
            setCategories(dataCatalog.data.categories || ['Semua']);
            setStoreInfo(dataCatalog.data.store || null);

            // Reconcile existing in-memory estimation OR restore sessionStorage draft on first load
            setEstimationItems((prev) => {
              if (prev.length > 0) {
                return reconcileEstimationItems(prev, fetchedProducts);
              }
              if (loadedProfile?.id && typeof window !== 'undefined') {
                try {
                  const raw = window.sessionStorage.getItem(
                    `pelanggan_estimasi_${loadedProfile.id}`
                  );
                  if (raw) {
                    const parsed = JSON.parse(raw) as {
                      items?: IEstimationItem[];
                      paymentPlan?: EstimationPaymentPlan;
                      notes?: string;
                    };
                    if (parsed.paymentPlan === 'KASBON' || parsed.paymentPlan === 'TUNAI') {
                      setPaymentPlan(parsed.paymentPlan);
                    }
                    if (typeof parsed.notes === 'string') {
                      setEstimateNotes(parsed.notes);
                    }
                    if (Array.isArray(parsed.items)) {
                      return reconcileEstimationItems(
                        parsed.items,
                        fetchedProducts
                      );
                    }
                  }
                } catch {
                  // Ignore invalid cached draft
                }
              }
              return prev;
            });
          } else {
            setCatalogError(
              dataCatalog.error || 'Gagal memuat katalog produk toko.'
            );
          }
        } else {
          setCatalogError('Katalog produk sedang tidak dapat dimuat.');
        }
      } catch {
        setError('Gagal memuat data dari server. Periksa koneksi Anda.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  // Save draft to sessionStorage
  useEffect(() => {
    if (!draftStorageKey || typeof window === 'undefined' || loading) return;
    try {
      window.sessionStorage.setItem(
        draftStorageKey,
        JSON.stringify({
          items: estimationItems,
          paymentPlan,
          notes: estimateNotes,
        })
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [draftStorageKey, estimationItems, paymentPlan, estimateNotes, loading]);

  // Clear inline notice automatically
  useEffect(() => {
    if (!actionNotice) return;
    const timer = setTimeout(() => setActionNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [actionNotice]);

  const handleLogout = async () => {
    if (draftStorageKey && typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(draftStorageKey);
      } catch {
        // ignore
      }
    }
    try {
      await fetch('/api/pelanggan/logout', { method: 'POST' });
    } finally {
      router.push('/pelanggan/login');
    }
  };

  const customerType: CustomerType =
    profile?.customer_type === 'Warung / Grosir' ? 'Warung / Grosir' : 'Eceran';
  const isWholesaleTier = customerType === 'Warung / Grosir';

  const filteredProducts = useMemo(() => {
    return filterCatalogProducts(catalogProducts, {
      search: searchQuery,
      category: selectedCategory,
      stockFilter,
    });
  }, [catalogProducts, searchQuery, selectedCategory, stockFilter]);

  const estimationQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of estimationItems) {
      map.set(item.product.id, item.quantity);
    }
    return map;
  }, [estimationItems]);

  const estimationSummary = useMemo(() => {
    return summarizeEstimation(
      estimationItems,
      paymentPlan,
      profile?.remaining_credit || 0
    );
  }, [estimationItems, paymentPlan, profile?.remaining_credit]);

  const storeName = storeInfo?.store_name || 'Toko Sembako Berkah Mandiri';
  const ownerName = storeInfo?.owner_name || 'Pemilik Toko';
  const storePhone = storeInfo?.phone || '';

  const estimateMessageText = useMemo(() => {
    if (estimationItems.length === 0) return '';
    return buildCustomerEstimateMessage({
      storeName,
      ownerName,
      customerName: profile?.name || 'Pelanggan',
      customerWhatsapp: profile?.whatsapp_number,
      customerType,
      items: estimationItems,
      paymentPlan,
      remainingCredit: profile?.remaining_credit || 0,
      notes: estimateNotes,
    });
  }, [
    estimationItems,
    storeName,
    ownerName,
    profile?.name,
    profile?.whatsapp_number,
    profile?.remaining_credit,
    customerType,
    paymentPlan,
    estimateNotes,
  ]);

  const estimateWaLink = useMemo(() => {
    if (estimationItems.length === 0 || !storePhone) return '';
    return buildCustomerEstimateWhatsAppLink({
      storePhone,
      storeName,
      ownerName,
      customerName: profile?.name || 'Pelanggan',
      customerWhatsapp: profile?.whatsapp_number,
      customerType,
      items: estimationItems,
      paymentPlan,
      remainingCredit: profile?.remaining_credit || 0,
      notes: estimateNotes,
    });
  }, [
    estimationItems,
    storePhone,
    storeName,
    ownerName,
    profile?.name,
    profile?.whatsapp_number,
    profile?.remaining_credit,
    customerType,
    paymentPlan,
    estimateNotes,
  ]);

  const handleAddOrAdjustCatalog = (
    product: ICustomerCatalogItem,
    delta: number
  ) => {
    setActionNotice(null);
    if (delta > 0) {
      const res = upsertEstimationItem(estimationItems, product, delta);
      if (!res.success && res.message) {
        setActionNotice(res.message);
        return;
      }
      setEstimationItems(res.items);
    } else {
      const currentQty = estimationQtyMap.get(product.id) || 0;
      const nextQty = Math.round((currentQty + delta) * 1000) / 1000;
      const res = setEstimationItemQty(estimationItems, product.id, nextQty);
      if (!res.success && res.message) {
        setActionNotice(res.message);
        return;
      }
      setEstimationItems(res.items);
    }
  };

  const handleSetItemQuantity = (productId: string, nextQty: number) => {
    setActionNotice(null);
    const res = setEstimationItemQty(estimationItems, productId, nextQty);
    if (!res.success && res.message) {
      setActionNotice(res.message);
      return;
    }
    setEstimationItems(res.items);
  };

  const handleCopyEstimate = async () => {
    if (!estimateMessageText) return;
    try {
      await navigator.clipboard.writeText(estimateMessageText);
      setCopiedNotice(true);
      setTimeout(() => setCopiedNotice(false), 2500);
    } catch {
      setActionNotice(
        'Browser tidak mengizinkan salin otomatis. Silakan kirim langsung via WhatsApp.'
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">
          Memuat Portal Pelanggan...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24">
      {/* Header Mobile / Top bar + Navigation Tabs */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="px-4 md:px-6 py-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                Portal Pelanggan
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  isWholesaleTier
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {isWholesaleTier ? (
                  <>
                    <Sparkles className="w-2.5 h-2.5" />
                    Harga Grosir
                  </>
                ) : (
                  <>
                    <Tag className="w-2.5 h-2.5" />
                    Harga Eceran
                  </>
                )}
              </span>
            </div>
            <h1 className="text-base font-extrabold text-slate-900 leading-tight truncate mt-0.5">
              {profile?.name || 'Pelanggan'}
            </h1>
            <p className="text-[11px] text-slate-500 truncate">
              {profile?.whatsapp_number}
              {storeInfo?.store_name ? ` • ${storeInfo.store_name}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
              title="Muat Ulang Data & Stok"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`}
              />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3-Tab Switcher */}
        <div className="px-4 md:px-6 pb-3">
          <div className="grid grid-cols-3 gap-1 md:gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                activeTab === 'overview'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 shrink-0" />
              <span>Ringkasan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`py-2 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                activeTab === 'catalog'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
              <span>Katalog</span>
              {catalogProducts.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {catalogProducts.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('estimate')}
              className={`py-2 px-2 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                activeTab === 'estimate'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 shrink-0" />
              <span>Estimasi</span>
              {estimationSummary.itemCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-600 text-white">
                  {estimationSummary.itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* General Error state */}
      {error && (
        <div className="mx-4 md:mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action Feedback Banner (e.g. Stock Limit Alert) */}
      {actionNotice && (
        <div className="mx-4 md:mx-6 mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-start justify-between gap-2 font-medium">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{actionNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-amber-600 hover:text-amber-900"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ==================== TAB 1: RINGKASAN & RIWAYAT ==================== */}
      {activeTab === 'overview' && (
        <>
          {/* Main KPI Cards: Kasbon Aktif & Limit Kredit */}
          <div className="px-4 md:px-6 py-4 flex flex-col md:grid md:grid-cols-2 gap-3 md:gap-4">
            {/* Kasbon Aktif & Jatuh Tempo */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm space-y-3 md:order-1 md:flex md:flex-col md:justify-between">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                      (profile?.total_debt || 0) > 0
                        ? profile?.is_debt_overdue
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block uppercase tracking-wider">
                      Kasbon Aktif
                    </span>
                    <span
                      className={`text-lg font-black tracking-tight ${
                        (profile?.total_debt || 0) > 0
                          ? 'text-rose-600'
                          : 'text-slate-900'
                      }`}
                    >
                      {formatIDR(profile?.total_debt || 0)}
                    </span>
                  </div>
                </div>

                {(profile?.total_debt || 0) > 0 ? (
                  profile?.is_debt_overdue ? (
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Jatuh Tempo!
                      </span>
                      <span className="block text-[10px] text-rose-600 font-semibold mt-0.5">
                        Lewat {profile?.overdue_days} hari
                      </span>
                    </div>
                  ) : (
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        <Clock className="w-3 h-3" />
                        Aktif
                      </span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">
                        {profile?.debt_due_date
                          ? formatDate(profile.debt_due_date)
                          : '-'}
                      </span>
                    </div>
                  )
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Lunas
                  </span>
                )}
              </div>

              {/* Limit Progress */}
              <div className="pt-2 border-t border-slate-100 text-xs">
                <div className="flex justify-between text-slate-500 text-[11px] mb-1">
                  <span>Sisa Plafon Kredit:</span>
                  <span className="font-bold text-slate-800">
                    {formatIDR(profile?.remaining_credit || 0)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full ${
                      profile?.is_debt_overdue ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        ((profile?.total_debt || 0) /
                          (profile?.max_credit_limit || 1)) *
                          100
                      )}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>
                    Plafon: {formatIDR(profile?.max_credit_limit || 0)}
                  </span>
                  <span>
                    {Math.round(
                      ((profile?.total_debt || 0) /
                        (profile?.max_credit_limit || 1)) *
                        100
                    )}
                    % terpakai
                  </span>
                </div>
              </div>
            </div>

            {/* Quick CTA to Catalog & Estimation */}
            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className="w-full text-left bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-md shadow-emerald-600/20 flex items-center justify-between gap-3 active:scale-[0.99] transition-transform md:order-3 md:col-span-2"
            >
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-100 block">
                  {isWholesaleTier
                    ? 'Harga Grosir Warung Aktif'
                    : 'Cek Harga & Stok Hari Ini'}
                </span>
                <p className="text-sm font-extrabold mt-0.5">
                  Katalog Produk &amp; Estimasi Belanja
                </p>
                <p className="text-[11px] text-emerald-50 mt-0.5">
                  Cek stok toko secara langsung dan kirim daftar belanja ke WhatsApp pemilik toko.
                </p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <ArrowRight className="w-5 h-5" />
              </div>
            </button>

            {/* Info Box */}
            <div className="p-3 md:p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl md:rounded-2xl text-[11px] text-indigo-900 leading-relaxed md:order-2 md:flex md:items-center">
              <div>
                💡 <strong>Informasi:</strong> Riwayat toko mencatat pembayaran secara transparan. Jika ingin melunasi kasbon, harap hubungi pemilik toko.
              </div>
            </div>
          </div>

          {/* History Header */}
          <div className="px-4 md:px-6 mt-1">
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>Riwayat Belanja ({transactions.length})</span>
            </div>
          </div>

          {/* Transactions List */}
          <div className="px-4 md:px-6 py-4 flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 items-start">
              {transactions.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs md:col-span-2">
                  Belum ada transaksi belanja yang tercatat.
                </div>
              ) : (
                transactions.map((tx) => {
                  const isExpanded = expandedInvoice === tx.invoice_number;
                  return (
                    <div
                      key={tx.id}
                      className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-sm space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-800">
                          {tx.invoice_number}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatDate(tx.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-500 text-[11px]">
                          Total Belanja:
                        </span>
                        <span className="text-emerald-700 font-extrabold text-sm">
                          {formatIDR(tx.final_amount)}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                        <span>
                          Metode:{' '}
                          <strong className="text-slate-800 uppercase">
                            {tx.payment_method}
                          </strong>
                        </span>
                        {tx.payment_method === 'KASBON' && tx.due_date && (
                          <span className="text-rose-600 font-medium">
                            Jatuh Tempo: {formatDate(tx.due_date)}
                          </span>
                        )}
                      </div>

                      {/* Items dropdown */}
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedInvoice(
                            isExpanded ? null : tx.invoice_number
                          )
                        }
                        className="w-full pt-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-between border-t border-slate-100 mt-2"
                      >
                        <span>Lihat {tx.items?.length || 0} Barang</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {isExpanded && tx.items && (
                        <div className="pt-2 space-y-1.5 border-t border-slate-100">
                          {tx.items.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex justify-between text-[11px] text-slate-600"
                            >
                              <div>
                                <span className="font-medium text-slate-800">
                                  {item.product_name || 'Produk'}
                                </span>
                                <span className="text-[10px] text-slate-400 block">
                                  {item.quantity} x {formatIDR(item.unit_price)}
                                </span>
                              </div>
                              <span className="font-semibold text-slate-700">
                                {formatIDR(item.subtotal)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* ==================== TAB 2: KATALOG & CEK STOK ==================== */}
      {activeTab === 'catalog' && (
        <div className="px-4 md:px-6 py-4 space-y-3 md:space-y-4 flex-1">
          {/* Tier Explanation Banner */}
          <div
            className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              isWholesaleTier
                ? 'bg-purple-50 border-purple-200 text-purple-900'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
            }`}
          >
            {isWholesaleTier ? (
              <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            ) : (
              <Store className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div className="text-[11px] leading-relaxed">
              {isWholesaleTier ? (
                <>
                  <strong>Harga Grosir Warung Aktif:</strong> Semua harga produk di bawah otomatis menampilkan tarif grosir khusus mitra warung Anda.
                </>
              ) : (
                <>
                  <strong>Harga Eceran &amp; Cek Stok Toko:</strong> Pantau stok barang yang tersedia hari ini dan tambahkan ke daftar estimasi belanja Anda.
                </>
              )}
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2.5 shadow-sm">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari beras, minyak, gula, atau SKU..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto md:flex-wrap md:overflow-visible pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Stock Filter + Result Count */}
            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: 'ALL', label: 'Semua' },
                    { id: 'AVAILABLE', label: 'Tersedia' },
                    { id: 'LOW_STOCK', label: 'Menipis' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStockFilter(opt.id)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors ${
                      stockFilter === opt.id
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-slate-400 font-medium">
                {filteredProducts.length} barang
              </span>
            </div>
          </div>

          {/* Catalog Error Fallback */}
          {catalogError && (
            <div className="p-4 bg-white border border-rose-200 rounded-2xl text-center space-y-2">
              <p className="text-xs text-rose-700 font-medium">{catalogError}</p>
              <button
                type="button"
                onClick={() => loadData(true)}
                className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100"
              >
                Coba Muat Ulang
              </button>
            </div>
          )}

          {/* Product List */}
          {!catalogError && filteredProducts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 py-12 px-4 text-center text-slate-400 space-y-1.5">
              <Package className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-600">
                Produk tidak ditemukan
              </p>
              <p className="text-[11px]">
                Coba ubah kata kunci pencarian atau pilih kategori &quot;Semua&quot;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 md:gap-3.5">
              {filteredProducts.map((product) => {
                const qtyInCart = estimationQtyMap.get(product.id) || 0;
                const isOut = product.stock_status === 'HABIS';
                const isLow = product.stock_status === 'MENIPIS';
                const stepAmount = supportsDecimalQuantity(product.unit)
                  ? 0.5
                  : 1;

                return (
                  <div
                    key={product.id}
                    className={`bg-white rounded-2xl border p-3.5 flex flex-col justify-between h-full transition-all ${
                      isOut
                        ? 'border-slate-200 opacity-65 bg-slate-50/70'
                        : qtyInCart > 0
                        ? 'border-emerald-400 shadow-sm ring-1 ring-emerald-100'
                        : 'border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {product.category}
                          </span>
                          {isOut ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                              Stok Habis
                            </span>
                          ) : isLow ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              Menipis: {formatDecimalQty(product.stock_quantity, product.unit)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                              Stok: {formatDecimalQty(product.stock_quantity, product.unit)}
                            </span>
                          )}
                        </div>
                        <h3 className="text-xs font-extrabold text-slate-900 leading-snug">
                          {product.name}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          SKU {product.sku} &bull; Satuan {product.unit}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div>
                        {product.price_type === 'wholesale' &&
                        product.unit_savings > 0 ? (
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] text-slate-400 line-through">
                                {formatIDR(product.retail_price)}
                              </span>
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                                Hemat {formatIDR(product.unit_savings)}
                              </span>
                            </div>
                            <div className="text-sm font-black text-purple-700">
                              {formatIDR(product.applied_price)}
                              <span className="text-[10px] font-semibold text-purple-500 ml-1">
                                / {product.unit}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="text-[10px] text-slate-400 block font-medium">
                              {product.price_type === 'wholesale'
                                ? 'Harga Grosir'
                                : 'Harga Eceran'}
                            </span>
                            <div className="text-sm font-black text-slate-900">
                              {formatIDR(product.applied_price)}
                              <span className="text-[10px] font-medium text-slate-400 ml-1">
                                / {product.unit}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {isOut ? (
                        <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 text-[11px] font-bold">
                          Habis
                        </span>
                      ) : qtyInCart === 0 ? (
                        <button
                          type="button"
                          onClick={() => handleAddOrAdjustCatalog(product, 1)}
                          className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-all"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Estimasi</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleAddOrAdjustCatalog(product, -stepAmount)
                            }
                            className="w-7 h-7 rounded-lg bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-600 flex items-center justify-center border border-slate-200 transition-colors"
                            title="Kurangi"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('estimate')}
                            className="min-w-[2.4rem] text-center text-xs font-extrabold text-emerald-800 px-1"
                            title="Ubah di tab Estimasi"
                          >
                            {formatDecimalQty(qtyInCart)}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleAddOrAdjustCatalog(product, stepAmount)
                            }
                            disabled={qtyInCart >= product.stock_quantity}
                            className="w-7 h-7 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 flex items-center justify-center transition-colors"
                            title="Tambah"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== TAB 3: ESTIMASI BELANJA & WHATSAPP ==================== */}
      {activeTab === 'estimate' && (
        <div className="px-4 md:px-6 py-4 space-y-3 md:space-y-4 flex-1">
          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 leading-relaxed">
            🧮 <strong>Estimasi Belanja:</strong> Hitung perkiraan total belanja Anda (otomatis memakai{' '}
            <strong>
              {isWholesaleTier ? 'Harga Grosir Warung' : 'Harga Eceran'}
            </strong>
            ), lalu kirim daftarnya ke WhatsApp pemilik toko untuk disiapkan.
          </div>

          {estimationItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-800">
                  Daftar Estimasi Masih Kosong
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Pilih barang sembako dari katalog untuk menghitung perkiraan biaya belanja Anda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('catalog')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors"
              >
                <span>Buka Katalog &amp; Cek Stok</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-12 md:gap-5 md:items-start">
              {/* Item List */}
              <div className="md:col-span-7 space-y-3">
                <div className="space-y-2.5">
                {estimationItems.map((item) => {
                  const isDecimalUnit = supportsDecimalQuantity(
                    item.product.unit
                  );
                  const stepVal = isDecimalUnit ? 0.5 : 1;

                  return (
                    <div
                      key={item.product.id}
                      className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-2xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-xs font-extrabold text-slate-900 leading-snug">
                            {item.product.name}
                          </h3>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {formatIDR(item.product.applied_price)} /{' '}
                            {item.product.unit}
                            {item.product.price_type === 'wholesale' && (
                              <span className="ml-1.5 text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded">
                                Grosir
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Tersedia di toko:{' '}
                            {formatDecimalQty(
                              item.product.stock_quantity,
                              item.product.unit
                            )}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleSetItemQuantity(item.product.id, 0)
                          }
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                          title="Hapus dari estimasi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleSetItemQuantity(
                                item.product.id,
                                Math.round((item.quantity - stepVal) * 1000) /
                                  1000
                              )
                            }
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <EstimationQtyInput
                            value={item.quantity}
                            max={item.product.stock_quantity}
                            isDecimal={isDecimalUnit}
                            onCommit={(nextQty) =>
                              handleSetItemQuantity(item.product.id, nextQty)
                            }
                          />

                          <button
                            type="button"
                            onClick={() =>
                              handleSetItemQuantity(
                                item.product.id,
                                Math.round((item.quantity + stepVal) * 1000) /
                                  1000
                              )
                            }
                            disabled={
                              item.quantity >= item.product.stock_quantity
                            }
                            className="w-7 h-7 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-black text-slate-900">
                            {formatIDR(item.line_subtotal)}
                          </div>
                          {item.line_savings > 0 && (
                            <div className="text-[10px] font-bold text-purple-700">
                              Hemat {formatIDR(item.line_savings)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Barang Lain
                </button>
                <button
                  type="button"
                  onClick={() => setEstimationItems([])}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                >
                  Kosongkan Daftar
                </button>
              </div>
              </div>

              {/* Payment Plan Simulation & Summary Column */}
              <div className="md:col-span-5 space-y-3 md:sticky md:top-36">
              {/* Payment Plan Simulation */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                <div>
                  <span className="text-xs font-extrabold text-slate-800 block">
                    Rencana Metode Pembayaran
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Untuk simulasi batas kasbon &amp; info ke pemilik toko
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentPlan('TUNAI')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                      paymentPlan === 'TUNAI'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Tunai
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentPlan('KASBON')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                      paymentPlan === 'KASBON'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Ajukan Kasbon
                  </button>
                </div>

                {paymentPlan === 'KASBON' && (
                  <div
                    className={`p-3 rounded-xl border text-[11px] leading-relaxed ${
                      (profile?.max_credit_limit || 0) <= 0
                        ? 'bg-amber-50 border-amber-200 text-amber-900'
                        : estimationSummary.fitsCreditLimit
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <div className="font-bold mb-0.5">
                      Sisa Plafon Kasbon Anda:{' '}
                      {formatIDR(profile?.remaining_credit || 0)}
                    </div>
                    {(profile?.max_credit_limit || 0) <= 0 ? (
                      <span>
                        Akun Anda belum memiliki plafon kasbon aktif. Silakan pilih pembayaran Tunai atau hubungi pemilik toko.
                      </span>
                    ) : estimationSummary.fitsCreditLimit ? (
                      <span>
                        Estimasi ini mencukupi batas plafon. Perkiraan sisa plafon setelah transaksi:{' '}
                        <strong>
                          {formatIDR(estimationSummary.projectedRemainingCredit)}
                        </strong>
                        .
                      </span>
                    ) : (
                      <span>
                        Perkiraan belanja melebihi sisa plafon sebesar{' '}
                        <strong>
                          {formatIDR(estimationSummary.creditShortfall)}
                        </strong>
                        . Selisihnya perlu dibayar tunai atau kurangi daftar belanja.
                      </span>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan untuk Pemilik Toko (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    value={estimateNotes}
                    onChange={(e) => setEstimateNotes(e.target.value)}
                    placeholder="Contoh: Diambil jam 4 sore, atau mohon diantar ke warung..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Total Estimation Card & WhatsApp Actions */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Total Barang</span>
                    <span className="font-semibold text-slate-800">
                      {estimationSummary.itemCount} jenis (
                      {formatDecimalQty(estimationSummary.totalQuantity)} unit)
                    </span>
                  </div>

                  {estimationSummary.totalWholesaleSavings > 0 && (
                    <div className="flex justify-between text-purple-700 font-semibold">
                      <span>Hemat Harga Grosir</span>
                      <span>
                        -{formatIDR(estimationSummary.totalWholesaleSavings)}
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800">
                      Total Estimasi
                    </span>
                    <span className="text-xl font-black text-emerald-700">
                      {formatIDR(estimationSummary.estimatedTotal)}
                    </span>
                  </div>
                </div>

                {storeInfo && (
                  <div className="text-[11px] text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                    Tujuan WhatsApp: <strong>{ownerName}</strong> ({storePhone || '-'})
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  {estimateWaLink ? (
                    <a
                      href={estimateWaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Kirim Estimasi ke WhatsApp Pemilik Toko</span>
                    </a>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 text-center">
                      Nomor WhatsApp pemilik toko belum tersedia. Gunakan tombol salin di bawah untuk mengirim manual.
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleCopyEstimate}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    {copiedNotice ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-700">
                          Rincian Estimasi Tersalin!
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Salin Teks Estimasi Belanja</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Bottom Bar when browsing Overview/Catalog with items in Estimate */}
      {activeTab !== 'estimate' && estimationSummary.itemCount > 0 && (
        <div className="fixed bottom-4 inset-x-0 mx-auto w-full max-w-md md:max-w-[1100px] px-4 md:px-6 z-40 pointer-events-none">
          <button
            type="button"
            onClick={() => setActiveTab('estimate')}
            className="pointer-events-auto w-full bg-slate-900 hover:bg-slate-800 text-white rounded-2xl px-4 py-3 shadow-xl shadow-slate-900/25 flex items-center justify-between gap-3 transition-colors"
          >
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold">
                  {estimationSummary.itemCount} Barang di Estimasi
                </span>
                {estimationSummary.totalWholesaleSavings > 0 && (
                  <span className="text-[10px] font-bold bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded">
                    Hemat {formatIDR(estimationSummary.totalWholesaleSavings)}
                  </span>
                )}
              </div>
              <div className="text-sm font-black text-emerald-400">
                {formatIDR(estimationSummary.estimatedTotal)}
              </div>
            </div>
            <span className="inline-flex items-center gap-1 bg-emerald-600 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0">
              <span>Lihat &amp; Kirim</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

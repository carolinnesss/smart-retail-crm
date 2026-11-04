'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  RefreshCw,
  Tag,
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle,
  X,
  Edit,
} from 'lucide-react';
import { IProduct } from '@/lib/types';
import { formatIDR } from '@/lib/formatters';

const CATEGORIES = [
  'Semua',
  'Beras',
  'Minyak Goreng',
  'Gula Pasir',
  'Telur Ayam',
  'Tepung Terigu',
  'Mie Instan',
  'Bumbu Dapur',
  'Susu & Minuman',
];

export default function InventoryPage() {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [showLowStockOnly, setShowLowStockOnly] = useState<boolean>(false);

  // Edit stock modal
  const [selectedProduct, setSelectedProduct] = useState<IProduct | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState<boolean>(false);
  const [newStockInput, setNewStockInput] = useState<string>('');
  const [isUpdatingStock, setIsUpdatingStock] = useState<boolean>(false);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/products');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setProducts(json.data);
      }
    } catch (err) {
      console.error('Error fetching inventory products', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Stock stats
  const stats = useMemo(() => {
    const totalItems = products.length;
    const lowStockCount = products.filter(
      (p) => p.stock_quantity <= p.min_stock_alert
    ).length;
    const totalStockUnits = products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0);
    return { totalItems, lowStockCount, totalStockUnits };
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'Semua' && p.category !== selectedCategory) return false;
      if (showLowStockOnly && p.stock_quantity > p.min_stock_alert) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = p.sku.toLowerCase().includes(q);
        if (!matchesName && !matchesSku) return false;
      }

      return true;
    });
  }, [products, selectedCategory, showLowStockOnly, searchQuery]);

  const handleOpenStockModal = (prod: IProduct) => {
    setSelectedProduct(prod);
    setNewStockInput(String(prod.stock_quantity));
    setIsStockModalOpen(true);
  };

  const handleUpdateStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const stockNum = parseFloat(newStockInput);
    if (isNaN(stockNum) || stockNum < 0) {
      alert('Kuantitas stok harus angka positif!');
      return;
    }

    setIsUpdatingStock(true);
    try {
      const res = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stock_quantity: stockNum,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memperbarui stok.');
      }

      await fetchProducts();
      setIsStockModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Gagal mengubah stok.');
    } finally {
      setIsUpdatingStock(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Katalog & Inventaris Master Sembako
            </h1>
            <p className="text-xs text-slate-500">
              30 SKU komprehensif, harga grosir vs eceran, barcode EAN-13, dan batas peringatan stok
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchProducts}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>

          <Link
            href="/pos"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors"
          >
            <span>Buka Kasir POS</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Total Master SKU
            </span>
            <div className="text-2xl font-black text-slate-900 mt-0.5">
              {stats.totalItems} Produk
            </div>
            <span className="text-[11px] text-slate-400">Katalog sembako aktif</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Peringatan Stok Menipis
            </span>
            <div className="text-2xl font-black text-amber-600 mt-0.5">
              {stats.lowStockCount} SKU
            </div>
            <span className="text-[11px] text-amber-600 font-medium">
              Di bawah batas minimum aman
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
              Total Akumulasi Fisik Stok
            </span>
            <div className="text-2xl font-black text-emerald-600 mt-0.5">
              {stats.totalStockUnits.toLocaleString('id-ID')} Unit
            </div>
            <span className="text-[11px] text-slate-400">Tersedia di etalase & gudang</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {/* Search and Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Cari nama barang sembako atau SKU/Barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50/50 hover:bg-white transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                  showLowStockOnly
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Filter Stok Menipis ({stats.lowStockCount})</span>
              </button>
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Inventory Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">SKU / Barcode</th>
                <th className="py-3 px-4">Nama Produk Sembako</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-right">Harga Eceran</th>
                <th className="py-3 px-4 text-right">Harga Grosir (Warung)</th>
                <th className="py-3 px-4 text-center">Stok Fisik</th>
                <th className="py-3 px-4 text-center">Batas Aman</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-slate-400" />
                    <span>Memuat katalog inventaris sembako...</span>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Tidak ada produk yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.stock_quantity <= p.min_stock_alert;

                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isLow ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        {p.sku}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 text-sm block">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-slate-400">Satuan: {p.unit}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                        {formatIDR(p.retail_price)}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-purple-700">
                        {formatIDR(p.wholesale_price)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            isLow
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {p.stock_quantity} {p.unit}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-500 font-medium">
                        {p.min_stock_alert} {p.unit}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleOpenStockModal(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Atur Stok</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {isStockModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">Update Stok Fisik</h3>
              <button
                type="button"
                onClick={() => setIsStockModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStock} className="p-5 space-y-4">
              <div>
                <span className="font-bold text-slate-900 text-sm block">
                  {selectedProduct.name}
                </span>
                <span className="text-xs text-slate-500">
                  SKU: {selectedProduct.sku} • Satuan: {selectedProduct.unit}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jumlah Stok Baru ({selectedProduct.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="0"
                  value={newStockInput}
                  onChange={(e) => setNewStockInput(e.target.value)}
                  className="w-full px-3.5 py-2 text-base font-bold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Batas peringatan stok minimum: {selectedProduct.min_stock_alert} {selectedProduct.unit}
                </span>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  disabled={isUpdatingStock}
                  className="flex-1 py-2 px-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingStock}
                  className="flex-1 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-sm"
                >
                  {isUpdatingStock ? 'Menyimpan...' : 'Simpan Stok'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

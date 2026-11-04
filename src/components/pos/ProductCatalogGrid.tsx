'use client';

import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  Plus,
  Package,
  AlertCircle,
  Tag,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { IProduct, ICustomer } from '@/lib/types';
import { CartItem, determineProductPrice } from '@/hooks/useCart';
import { formatIDR } from '@/lib/formatters';

interface ProductCatalogGridProps {
  products: IProduct[];
  activeCustomer: ICustomer | null;
  onAddToCart: (product: IProduct) => void;
  cartItems: CartItem[];
  isLoading?: boolean;
}

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

export function ProductCatalogGrid({
  products,
  activeCustomer,
  onAddToCart,
  cartItems,
  isLoading = false,
}: ProductCatalogGridProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isWholesaleTier = activeCustomer?.customer_type === 'Warung / Grosir';

  // Map product ID to quantity already in cart
  const cartQtyMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of cartItems) {
      map.set(item.product.id, item.quantity);
    }
    return map;
  }, [cartItems]);

  // Filter products by category and search query
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.is_active) return false;

      // Category filter
      if (selectedCategory !== 'Semua' && p.category !== selectedCategory) {
        return false;
      }

      // Search query (name or sku)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSku = p.sku.toLowerCase().includes(q);
        if (!matchesName && !matchesSku) return false;
      }

      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
      {/* Top Search & Filter Bar */}
      <div className="p-4 border-b border-slate-100 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari nama barang atau barcode/SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-slate-50/50 hover:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Tier indicator pill */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shrink-0 border ${
              isWholesaleTier
                ? 'bg-purple-50 text-purple-800 border-purple-200'
                : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            {isWholesaleTier ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Tier: Warung (Harga Grosir)</span>
              </>
            ) : (
              <>
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <span>Tier: Eceran (Harga Normal)</span>
              </>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 text-xs">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Grid Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <Package className="w-10 h-10 animate-bounce mb-2 text-slate-300" />
            <p className="text-sm">Memuat katalog sembako...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <AlertCircle className="w-10 h-10 mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">Tidak ada produk ditemukan</p>
            <p className="text-xs text-slate-400 mt-1">
              Coba kata kunci lain atau ubah filter kategori.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const inCartQty = cartQtyMap.get(product.id) || 0;
              const isOutOfStock = product.stock_quantity <= 0;
              const isLowStock =
                !isOutOfStock && product.stock_quantity <= product.min_stock_alert;

              const { price: appliedPrice, priceType } = determineProductPrice(
                product,
                activeCustomer
              );

              const hasWholesaleDiscount =
                isWholesaleTier &&
                product.wholesale_price > 0 &&
                product.wholesale_price < product.retail_price;

              return (
                <div
                  key={product.id}
                  onClick={() => !isOutOfStock && onAddToCart(product)}
                  className={`group relative rounded-2xl border p-3 flex flex-col justify-between transition-all duration-200 ${
                    isOutOfStock
                      ? 'border-slate-200 bg-slate-50/70 opacity-60 cursor-not-allowed'
                      : inCartQty > 0
                      ? 'border-emerald-500 bg-emerald-50/20 shadow-sm hover:shadow-md cursor-pointer hover:border-emerald-600'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md cursor-pointer'
                  }`}
                >
                  {/* Top Header: Category & In-Cart Badge */}
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 truncate">
                        {product.category}
                      </span>

                      {inCartQty > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white shrink-0">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>{inCartQty}</span>
                        </span>
                      )}
                    </div>

                    {/* Product Name */}
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-snug">
                      {product.name}
                    </h4>

                    {/* SKU & Unit */}
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {product.sku} • per {product.unit}
                    </p>
                  </div>

                  {/* Stock & Dynamic Price */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col justify-end">
                    {/* Stock Status Badge */}
                    <div className="mb-1.5">
                      {isOutOfStock ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          Stok Habis
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Sisa {product.stock_quantity} {product.unit}
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                          Stok: {product.stock_quantity} {product.unit}
                        </span>
                      )}
                    </div>

                    {/* Dynamic Pricing Display */}
                    <div className="flex items-end justify-between gap-2">
                      <div>
                        {hasWholesaleDiscount ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-slate-400 line-through">
                                {formatIDR(product.retail_price)}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                                Grosir
                              </span>
                            </div>
                            <div className="text-sm sm:text-base font-extrabold text-purple-700">
                              {formatIDR(appliedPrice)}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-[10px] text-slate-400 font-medium">
                              Harga Eceran
                            </div>
                            <div className="text-sm sm:text-base font-extrabold text-slate-900">
                              {formatIDR(appliedPrice)}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Add Button */}
                      {!isOutOfStock && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart(product);
                          }}
                          className={`w-7 h-7 rounded-xl flex items-center justify-center transition-transform active:scale-95 ${
                            inCartQty > 0
                              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-900 hover:text-white'
                          }`}
                          title="Tambah ke keranjang"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

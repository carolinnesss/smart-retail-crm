'use client';

import { useState, useCallback, useMemo } from 'react';
import { ICustomer, IProduct } from '@/lib/types';

export interface CartItem {
  product: IProduct;
  quantity: number;
  appliedPrice: number;
  priceType: 'retail' | 'wholesale';
  itemDiscount: number;
  lineSubtotal: number;
}

export interface UseCartReturn {
  items: CartItem[];
  customer: ICustomer | null;
  cartDiscount: number;
  setCustomer: (customer: ICustomer | null) => void;
  clearCustomer: () => void;
  addItem: (product: IProduct, quantity?: number) => { success: boolean; message?: string };
  updateQuantity: (productId: string, quantity: number) => { success: boolean; message?: string };
  incrementQuantity: (productId: string, step?: number) => { success: boolean; message?: string };
  decrementQuantity: (productId: string, step?: number) => void;
  setItemDiscount: (productId: string, discount: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  setCartDiscount: (discount: number) => void;
  subtotal: number;
  grandTotal: number;
  totalQuantity: number;
  totalItems: number;
  totalSavings: number;
  getItem: (productId: string) => CartItem | undefined;
  hasItem: (productId: string) => boolean;
}

/**
 * Determines whether a product should be priced at wholesale or retail based on customer tier.
 * Fallback: If wholesale_price is missing or <= 0, falls back to retail_price.
 */
export function determineProductPrice(
  product: IProduct,
  customer: ICustomer | null
): { price: number; priceType: 'retail' | 'wholesale' } {
  const isWholesale = customer?.customer_type === 'Warung / Grosir';

  if (isWholesale && product.wholesale_price && product.wholesale_price > 0) {
    return {
      price: product.wholesale_price,
      priceType: 'wholesale',
    };
  }

  return {
    price: product.retail_price,
    priceType: 'retail',
  };
}

/**
 * Computes line item subtotal: max(0, (quantity * unitPrice) - itemDiscount)
 * Uses Math.round to safely preserve IDR integer accuracy for fractional quantities.
 */
export function computeLineSubtotal(
  quantity: number,
  unitPrice: number,
  itemDiscount: number = 0
): number {
  const gross = Math.round(quantity * unitPrice);
  const clampedDiscount = Math.max(0, Math.min(itemDiscount, gross));
  return Math.max(0, gross - clampedDiscount);
}

/**
 * Dynamically re-evaluates all items in cart when customer selection changes,
 * preserving existing quantities and line discounts.
 */
export function recalculateCartItems(
  items: CartItem[],
  customer: ICustomer | null
): CartItem[] {
  return items.map((item) => {
    const { price, priceType } = determineProductPrice(item.product, customer);
    const gross = Math.round(item.quantity * price);
    const clampedDiscount = Math.max(0, Math.min(item.itemDiscount, gross));
    const lineSubtotal = Math.max(0, gross - clampedDiscount);
    return {
      ...item,
      appliedPrice: price,
      priceType,
      itemDiscount: clampedDiscount,
      lineSubtotal,
    };
  });
}

/**
 * Pure helper for adding a product or consolidating an existing item in the cart.
 * Validates stock limits synchronously and preserves decimal accuracy.
 */
export function addItemToCart(
  currentItems: CartItem[],
  product: IProduct,
  qtyToAdd: number = 1,
  customer: ICustomer | null = null
): { success: boolean; message?: string; items: CartItem[] } {
  if (qtyToAdd <= 0) {
    return { success: false, message: 'Kuantitas harus lebih besar dari 0.', items: currentItems };
  }

  if (product.stock_quantity <= 0) {
    return { success: false, message: `Stok produk "${product.name}" habis!`, items: currentItems };
  }

  const existingIndex = currentItems.findIndex((it) => it.product.id === product.id);

  if (existingIndex > -1) {
    // Consolidate quantity on existing line item
    const existing = currentItems[existingIndex];
    const targetQty = Math.round((existing.quantity + qtyToAdd) * 100) / 100;

    if (targetQty > product.stock_quantity) {
      return {
        success: false,
        message: `Stok "${product.name}" tidak mencukupi (Tersedia: ${product.stock_quantity} ${product.unit}, sudah ada ${existing.quantity} di keranjang).`,
        items: currentItems,
      };
    }

    const updated = [...currentItems];
    const lineSubtotal = computeLineSubtotal(
      targetQty,
      existing.appliedPrice,
      existing.itemDiscount
    );
    updated[existingIndex] = {
      ...existing,
      quantity: targetQty,
      lineSubtotal,
    };
    return { success: true, items: updated };
  } else {
    // New cart line item
    if (qtyToAdd > product.stock_quantity) {
      return {
        success: false,
        message: `Stok "${product.name}" tidak mencukupi (Tersedia: ${product.stock_quantity} ${product.unit}).`,
        items: currentItems,
      };
    }

    const { price, priceType } = determineProductPrice(product, customer);
    const lineSubtotal = computeLineSubtotal(qtyToAdd, price, 0);

    const newItem: CartItem = {
      product,
      quantity: qtyToAdd,
      appliedPrice: price,
      priceType,
      itemDiscount: 0,
      lineSubtotal,
    };
    return { success: true, items: [...currentItems, newItem] };
  }
}

/**
 * Pure helper for updating item quantity in cart.
 * Validates stock limits synchronously against current items.
 */
export function updateCartItemQuantity(
  currentItems: CartItem[],
  productId: string,
  newQty: number
): { success: boolean; message?: string; items: CartItem[] } {
  if (newQty <= 0) {
    return {
      success: true,
      items: currentItems.filter((it) => it.product.id !== productId),
    };
  }

  const itemIndex = currentItems.findIndex((it) => it.product.id === productId);
  if (itemIndex === -1) {
    return { success: false, message: 'Item tidak ditemukan di keranjang.', items: currentItems };
  }

  const item = currentItems[itemIndex];
  const roundedQty = Math.round(newQty * 100) / 100;

  if (roundedQty > item.product.stock_quantity) {
    return {
      success: false,
      message: `Stok "${item.product.name}" tidak mencukupi (Tersedia: ${item.product.stock_quantity} ${item.product.unit}).`,
      items: currentItems,
    };
  }

  const updated = [...currentItems];
  const gross = Math.round(roundedQty * item.appliedPrice);
  const clampedDiscount = Math.max(0, Math.min(item.itemDiscount, gross));
  const lineSubtotal = Math.max(0, gross - clampedDiscount);
  updated[itemIndex] = {
    ...item,
    quantity: roundedQty,
    itemDiscount: clampedDiscount,
    lineSubtotal,
  };
  return { success: true, items: updated };
}

/**
 * Calculates total savings realized by customer compared to standard retail prices,
 * including dynamic tier discount differences, line item discounts, and global cart discount.
 */
export function calculateTotalSavings(
  items: CartItem[],
  cartDiscount: number = 0
): number {
  let savings = 0;
  for (const it of items) {
    const retailGross = Math.round(it.quantity * it.product.retail_price);
    const diff = retailGross - it.lineSubtotal;
    if (diff > 0) {
      savings += diff;
    }
  }
  savings += Math.max(0, cartDiscount);
  return savings;
}

/**
 * Main Cart Hook for POS Cashier.
 */
export function useCart(initialCustomer: ICustomer | null = null): UseCartReturn {
  const [customer, setCustomerState] = useState<ICustomer | null>(initialCustomer);
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartDiscount, setCartDiscountState] = useState<number>(0);

  // Set customer and dynamically re-price all cart items
  const setCustomer = useCallback((newCustomer: ICustomer | null) => {
    setCustomerState(newCustomer);
    setItems((prev) => recalculateCartItems(prev, newCustomer));
  }, []);

  const clearCustomer = useCallback(() => {
    setCustomer(null);
  }, [setCustomer]);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((it) => it.product.id !== productId));
  }, []);

  // Update quantity (with decimal support) - validated synchronously against current items state
  const updateQuantity = useCallback(
    (productId: string, newQty: number): { success: boolean; message?: string } => {
      const res = updateCartItemQuantity(items, productId, newQty);
      if (!res.success) {
        return { success: false, message: res.message };
      }
      setItems(res.items);
      return { success: true };
    },
    [items]
  );

  // Add product to cart with duplicate SKU consolidation - validated synchronously against current items state
  const addItem = useCallback(
    (product: IProduct, qtyToAdd: number = 1): { success: boolean; message?: string } => {
      const res = addItemToCart(items, product, qtyToAdd, customer);
      if (!res.success) {
        return { success: false, message: res.message };
      }
      setItems(res.items);
      return { success: true };
    },
    [items, customer]
  );

  const incrementQuantity = useCallback(
    (productId: string, step: number = 1) => {
      const item = items.find((it) => it.product.id === productId);
      if (!item) return { success: false, message: 'Item tidak ditemukan di keranjang.' };
      return updateQuantity(productId, item.quantity + step);
    },
    [items, updateQuantity]
  );

  const decrementQuantity = useCallback(
    (productId: string, step: number = 1) => {
      const item = items.find((it) => it.product.id === productId);
      if (!item) return;
      const targetQty = Math.round((item.quantity - step) * 100) / 100;
      if (targetQty <= 0) {
        removeItem(productId);
      } else {
        updateQuantity(productId, targetQty);
      }
    },
    [items, removeItem, updateQuantity]
  );

  const setItemDiscount = useCallback((productId: string, discount: number) => {
    setItems((prev) => {
      return prev.map((item) => {
        if (item.product.id !== productId) return item;
        const gross = Math.round(item.quantity * item.appliedPrice);
        const sanitizedDiscount = Math.max(0, Math.min(Math.round(discount), gross));
        const lineSubtotal = Math.max(0, gross - sanitizedDiscount);
        return {
          ...item,
          itemDiscount: sanitizedDiscount,
          lineSubtotal,
        };
      });
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCartDiscountState(0);
  }, []);

  const setCartDiscount = useCallback((discount: number) => {
    setCartDiscountState(Math.max(0, Math.round(discount)));
  }, []);

  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + it.lineSubtotal, 0);
  }, [items]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - cartDiscount);
  }, [subtotal, cartDiscount]);

  const totalQuantity = useMemo(() => {
    return items.reduce((sum, it) => sum + it.quantity, 0);
  }, [items]);

  const totalItems = items.length;

  const totalSavings = useMemo(() => {
    return calculateTotalSavings(items, cartDiscount);
  }, [items, cartDiscount]);

  const getItem = useCallback(
    (productId: string) => items.find((it) => it.product.id === productId),
    [items]
  );

  const hasItem = useCallback(
    (productId: string) => items.some((it) => it.product.id === productId),
    [items]
  );

  return {
    items,
    customer,
    cartDiscount,
    setCustomer,
    clearCustomer,
    addItem,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    setItemDiscount,
    removeItem,
    clearCart,
    setCartDiscount,
    subtotal,
    grandTotal,
    totalQuantity,
    totalItems,
    totalSavings,
    getItem,
    hasItem,
  };
}

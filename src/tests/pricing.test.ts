import { describe, it, expect } from 'vitest';
import {
  calculateItemPrice,
  roundQuantity,
  calculateItemSubtotal,
  calculateCartTotals,
} from '@/lib/pricing';
import { IProduct } from '@/lib/types';

describe('Pricing Engine & Decimal Quantities', () => {
  const sampleRice: IProduct = {
    id: 'prod-rice-1',
    sku: 'RICE-001',
    name: 'Beras Setra Ramos 5kg',
    category: 'Beras',
    unit: 'karung 5kg',
    retail_price: 74000,
    wholesale_price: 68000,
    stock_quantity: 50,
    min_stock_alert: 5,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const sampleBulkEgg: IProduct = {
    id: 'prod-egg-bulk',
    sku: 'EGG-001',
    name: 'Telur Ayam Curah',
    category: 'Telur Ayam',
    unit: 'kg',
    retail_price: 28000,
    wholesale_price: 25000,
    stock_quantity: 100,
    min_stock_alert: 10,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  describe('1. Automatic Tier Pricing (Zero-Memory)', () => {
    it('applies wholesale_price automatically for "Warung / Grosir" customer type', () => {
      const price = calculateItemPrice(sampleRice, 'Warung / Grosir');
      expect(price.unitPrice).toBe(68000);
      expect(price.priceType).toBe('wholesale');
    });

    it('applies retail_price automatically for "Eceran" customer type', () => {
      const price = calculateItemPrice(sampleRice, 'Eceran');
      expect(price.unitPrice).toBe(74000);
      expect(price.priceType).toBe('retail');
    });

    it('applies retail_price automatically for unregistered Walk-in guest (null customer)', () => {
      const price = calculateItemPrice(sampleRice, null);
      expect(price.unitPrice).toBe(74000);
      expect(price.priceType).toBe('retail');
    });

    it('applies retail_price automatically for undefined customer', () => {
      const price = calculateItemPrice(sampleRice, undefined);
      expect(price.unitPrice).toBe(74000);
      expect(price.priceType).toBe('retail');
    });
  });

  describe('2. Decimal Quantities Support (3 Decimals Precision)', () => {
    it('accurately calculates 1.5 kg of bulk goods', () => {
      const qty = 1.5;
      const subtotal = calculateItemSubtotal(qty, sampleBulkEgg.retail_price);
      expect(subtotal.grossSubtotal).toBe(42000); // 1.5 * 28000
      expect(subtotal.netSubtotal).toBe(42000);
    });

    it('accurately calculates 0.75 kg with 3-decimal precision', () => {
      const qty = 0.75;
      const subtotal = calculateItemSubtotal(qty, sampleBulkEgg.retail_price);
      expect(subtotal.grossSubtotal).toBe(21000); // 0.75 * 28000
      expect(subtotal.netSubtotal).toBe(21000);
    });

    it('accurately calculates 2.375 kg of weighed bulk commodity', () => {
      const qty = 2.375;
      const subtotal = calculateItemSubtotal(qty, sampleBulkEgg.wholesale_price);
      expect(subtotal.grossSubtotal).toBe(59375); // 2.375 * 25000
    });

    it('rounds quantities with excessive floating decimals to 3 decimal places', () => {
      const rounded = roundQuantity(1.333333333);
      expect(rounded).toBe(1.333);
    });
  });

  describe('3. Discount Clamping & Pricing Invariants', () => {
    it('clamps discount when discount is smaller than subtotal', () => {
      const subtotal = calculateItemSubtotal(2, 50000, 20000);
      expect(subtotal.grossSubtotal).toBe(100000);
      expect(subtotal.clampedDiscount).toBe(20000);
      expect(subtotal.netSubtotal).toBe(80000);
    });

    it('clamps discount to gross amount when discount exceeds subtotal (subtotal never negative)', () => {
      const subtotal = calculateItemSubtotal(1, 50000, 999999);
      expect(subtotal.grossSubtotal).toBe(50000);
      expect(subtotal.clampedDiscount).toBe(50000);
      expect(subtotal.netSubtotal).toBe(0);
    });

    it('ignores negative discounts and treats them as 0', () => {
      const subtotal = calculateItemSubtotal(1, 50000, -10000);
      expect(subtotal.clampedDiscount).toBe(0);
      expect(subtotal.netSubtotal).toBe(50000);
    });

    it('clamps cart-level discounts to ensure finalAmount >= 0', () => {
      const cart = [
        { quantity: 2, unitPrice: 20000 },
        { quantity: 1, unitPrice: 10000 },
      ]; // total 50000
      const totals = calculateCartTotals(cart, 100000);
      expect(totals.totalGross).toBe(50000);
      expect(totals.clampedDiscount).toBe(50000);
      expect(totals.finalAmount).toBe(0);
    });
  });
});

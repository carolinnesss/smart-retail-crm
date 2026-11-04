import { describe, it, expect } from 'vitest';
import {
  CreateCustomerSchema,
  CreateProductSchema,
  CreateTransactionSchema,
  CreateDebtPaymentSchema,
} from '@/lib/validations';

describe('Zod API Input Validation Schemas', () => {
  describe('1. CreateCustomerSchema', () => {
    it('accepts valid customer input', () => {
      const valid = {
        name: 'Warung Barokah',
        phone: '081234567890',
        address: 'Jl. Melati No. 5',
        customer_type: 'Warung / Grosir',
        max_credit_limit: 2000000,
        is_active: true,
      };
      const res = CreateCustomerSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it('rejects too short name (< 2 chars)', () => {
      const invalid = {
        name: 'A',
        phone: '081234567890',
      };
      const res = CreateCustomerSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });

    it('rejects negative credit limit', () => {
      const invalid = {
        name: 'Pak Budi',
        phone: '081234567890',
        max_credit_limit: -50000,
      };
      const res = CreateCustomerSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });
  });

  describe('2. CreateProductSchema', () => {
    it('accepts valid product with wholesale <= retail', () => {
      const valid = {
        sku: 'BRS-001',
        name: 'Beras Ramos 5kg',
        category: 'Beras',
        unit: 'karung 5kg',
        retail_price: 75000,
        wholesale_price: 70000,
        stock_quantity: 50,
      };
      const res = CreateProductSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it('REJECTS product when wholesale_price > retail_price', () => {
      const invalid = {
        sku: 'BRS-002',
        name: 'Beras Ramos 5kg',
        category: 'Beras',
        unit: 'karung 5kg',
        retail_price: 60000,
        wholesale_price: 70000, // Invalid! Wholesale higher than retail
        stock_quantity: 50,
      };
      const res = CreateProductSchema.safeParse(invalid);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('Harga grosir tidak boleh lebih besar');
      }
    });

    it('rejects negative stock or negative price', () => {
      const invalid = {
        sku: 'BRS-003',
        name: 'Beras Ramos 5kg',
        category: 'Beras',
        unit: 'karung 5kg',
        retail_price: -10000,
        wholesale_price: -20000,
        stock_quantity: -5,
      };
      const res = CreateProductSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });
  });

  describe('3. CreateTransactionSchema & Guest Protection', () => {
    const validItem = {
      product_id: 'prod-123',
      quantity: 2,
      unit_price: 50000,
      price_type: 'retail' as const,
    };

    it('accepts valid member transaction with TUNAI', () => {
      const valid = {
        customer_id: 'cust-uuid-1',
        items: [validItem],
        payment_method: 'TUNAI' as const,
        cash_tendered: 100000,
        change_amount: 0,
      };
      const res = CreateTransactionSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it('accepts valid member transaction with KASBON', () => {
      const valid = {
        customer_id: 'cust-uuid-1',
        items: [validItem],
        payment_method: 'KASBON' as const,
        debt_amount: 100000,
        due_date: '2026-11-15T00:00:00Z',
      };
      const res = CreateTransactionSchema.safeParse(valid);
      expect(res.success).toBe(true);
    });

    it('accepts valid walk-in guest with TUNAI', () => {
      const validGuest = {
        customer_id: null,
        items: [validItem],
        payment_method: 'TUNAI' as const,
        cash_tendered: 100000,
        change_amount: 0,
      };
      const res = CreateTransactionSchema.safeParse(validGuest);
      expect(res.success).toBe(true);
    });

    it('REJECTS walk-in guest when KASBON is requested in payload', () => {
      const invalidGuest = {
        customer_id: null,
        items: [validItem],
        payment_method: 'KASBON' as const,
        debt_amount: 100000,
      };
      const res = CreateTransactionSchema.safeParse(invalidGuest);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('Pembeli umum (walk-in) dilarang menggunakan metode bayar KASBON');
      }
    });

    it('rejects empty items cart', () => {
      const invalid = {
        customer_id: 'cust-1',
        items: [],
        payment_method: 'TUNAI' as const,
        cash_tendered: 50000,
      };
      const res = CreateTransactionSchema.safeParse(invalid);
      expect(res.success).toBe(false);
    });
  });

  describe('4. Debt Mutation Schema', () => {
    it('accepts valid debt payment input', () => {
      const valid = {
        customer_id: 'cust-1',
        payment_amount: 250000,
        notes: 'Cicilan pelunasan',
      };
      expect(CreateDebtPaymentSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects zero or negative debt payment amount', () => {
      const invalid = {
        customer_id: 'cust-1',
        payment_amount: -1000,
      };
      expect(CreateDebtPaymentSchema.safeParse(invalid).success).toBe(false);
    });
  });
});

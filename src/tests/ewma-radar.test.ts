import { describe, it, expect } from 'vitest';
import {
  calculateEWMA,
  getUrgencyStatus,
  calculateRestockPredictions,
  isMonitoredCommodity,
  MONITORED_COMMODITIES,
} from '@/lib/ewma-radar';
import { ICustomer, IProduct, ITransaction } from '@/lib/types';

describe('Restock Radar & EWMA Heuristics', () => {
  describe('1. EWMA Formula & Alpha Configuration', () => {
    it('calculates EWMA with default alpha = 0.3 for series of intervals', () => {
      // Intervals: [10, 8, 6]
      // S1 = 10
      // S2 = 0.3 * 8 + 0.7 * 10 = 2.4 + 7.0 = 9.4
      // S3 = 0.3 * 6 + 0.7 * 9.4 = 1.8 + 6.58 = 8.38
      const ewma = calculateEWMA([10, 8, 6], 0.3);
      expect(ewma).toBe(8.38);
    });

    it('calculates EWMA with custom alpha = 0.5', () => {
      // Intervals: [14, 7]
      // S1 = 14
      // S2 = 0.5 * 7 + 0.5 * 14 = 10.5
      const ewma = calculateEWMA([14, 7], 0.5);
      expect(ewma).toBe(10.5);
    });

    it('returns first interval if only one interval exists', () => {
      const ewma = calculateEWMA([7], 0.3);
      expect(ewma).toBe(7);
    });

    it('returns 0 for empty intervals array', () => {
      const ewma = calculateEWMA([], 0.3);
      expect(ewma).toBe(0);
    });
  });

  describe('2. Urgency Status Ratio Thresholds', () => {
    it('categorizes ratio < 0.7 as NORMAL (Stok Aman)', () => {
      const res = getUrgencyStatus(0.5);
      expect(res.status).toBe('NORMAL');
      expect(res.statusLabel).toContain('Normal');
    });

    it('categorizes 0.7 <= ratio < 1.0 as SOON (Mendekati Habis)', () => {
      const res1 = getUrgencyStatus(0.7);
      expect(res1.status).toBe('SOON');
      expect(res1.statusLabel).toContain('Mendekati Habis');

      const res2 = getUrgencyStatus(0.95);
      expect(res2.status).toBe('SOON');
    });

    it('categorizes 1.0 <= ratio < 1.3 as URGENT (Perlu Restok Segera)', () => {
      const res1 = getUrgencyStatus(1.0);
      expect(res1.status).toBe('URGENT');
      expect(res1.statusLabel).toContain('Mendesak');

      const res2 = getUrgencyStatus(1.25);
      expect(res2.status).toBe('URGENT');
    });

    it('categorizes ratio >= 1.3 as CRITICAL (Stok Kritis / Habis)', () => {
      const res1 = getUrgencyStatus(1.3);
      expect(res1.status).toBe('CRITICAL');
      expect(res1.statusLabel).toContain('Kritis');

      const res2 = getUrgencyStatus(2.0);
      expect(res2.status).toBe('CRITICAL');
    });
  });

  describe('3. Monitored Sembako Commodities', () => {
    it('monitors exactly the 5 specified commodities', () => {
      expect(MONITORED_COMMODITIES).toEqual([
        'Beras',
        'Minyak Goreng',
        'Gula Pasir',
        'Telur Ayam',
        'Tepung Terigu',
      ]);
      expect(isMonitoredCommodity('Beras')).toBe(true);
      expect(isMonitoredCommodity('Minyak Goreng')).toBe(true);
      expect(isMonitoredCommodity('Gula Pasir')).toBe(true);
      expect(isMonitoredCommodity('Telur Ayam')).toBe(true);
      expect(isMonitoredCommodity('Tepung Terigu')).toBe(true);
    });

    it('ignores non-staple commodities', () => {
      expect(isMonitoredCommodity('Mie Instan')).toBe(false);
      expect(isMonitoredCommodity('Bumbu Dapur')).toBe(false);
      expect(isMonitoredCommodity('Susu & Minuman')).toBe(false);
    });
  });

  describe('4. Minimum 3 Purchases Rule (Aturan Minimal 3 Data Pembelian)', () => {
    const customer: ICustomer = {
      id: 'cust-1',
      name: 'Warung Barokah',
      phone: '081234567890',
      address: 'Jl. Pasar No. 1',
      customer_type: 'Warung / Grosir',
      max_credit_limit: 5000000,
      current_debt: 0,
      savings_balance: 0,
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    };

    const riceProduct: IProduct = {
      id: 'prod-rice',
      sku: 'RICE-01',
      name: 'Beras Ramos 25kg',
      category: 'Beras',
      unit: 'karung',
      retail_price: 350000,
      wholesale_price: 330000,
      stock_quantity: 20,
      min_stock_alert: 5,
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    };

    it('does NOT display restock prediction when customer has ONLY 1 purchase', () => {
      const txs: ITransaction[] = [
        {
          id: 'tx-1',
          invoice_number: 'INV-1',
          customer_id: customer.id,
          total_amount: 330000,
          discount_amount: 0,
          final_amount: 330000,
          payment_method: 'cash',
          cash_amount: 330000,
          savings_amount: 0,
          debt_amount: 0,
          status: 'completed',
          created_at: '2026-10-20T10:00:00Z',
          items: [
            {
              id: 'item-1',
              transaction_id: 'tx-1',
              product_id: riceProduct.id,
              quantity: 1,
              unit_price: 330000,
              price_type: 'wholesale',
              subtotal: 330000,
            },
          ],
        },
      ];

      const predictions = calculateRestockPredictions([customer], [riceProduct], txs);
      expect(predictions.length).toBe(0);
    });

    it('does NOT display restock prediction when customer has ONLY 2 purchases (< 3)', () => {
      const txs: ITransaction[] = [
        {
          id: 'tx-1',
          invoice_number: 'INV-1',
          customer_id: customer.id,
          total_amount: 330000,
          discount_amount: 0,
          final_amount: 330000,
          payment_method: 'cash',
          cash_amount: 330000,
          savings_amount: 0,
          debt_amount: 0,
          status: 'completed',
          created_at: '2026-10-10T10:00:00Z',
          items: [
            {
              id: 'item-1',
              transaction_id: 'tx-1',
              product_id: riceProduct.id,
              quantity: 1,
              unit_price: 330000,
              price_type: 'wholesale',
              subtotal: 330000,
            },
          ],
        },
        {
          id: 'tx-2',
          invoice_number: 'INV-2',
          customer_id: customer.id,
          total_amount: 330000,
          discount_amount: 0,
          final_amount: 330000,
          payment_method: 'cash',
          cash_amount: 330000,
          savings_amount: 0,
          debt_amount: 0,
          status: 'completed',
          created_at: '2026-10-20T10:00:00Z',
          items: [
            {
              id: 'item-2',
              transaction_id: 'tx-2',
              product_id: riceProduct.id,
              quantity: 1,
              unit_price: 330000,
              price_type: 'wholesale',
              subtotal: 330000,
            },
          ],
        },
      ];

      const predictions = calculateRestockPredictions([customer], [riceProduct], txs);
      expect(predictions.length).toBe(0);
    });

    it('DISPLAYS restock prediction when customer has 3 or more purchases', () => {
      const txs: ITransaction[] = [
        {
          id: 'tx-1',
          invoice_number: 'INV-1',
          customer_id: customer.id,
          total_amount: 330000,
          discount_amount: 0,
          final_amount: 330000,
          payment_method: 'cash',
          cash_amount: 330000,
          savings_amount: 0,
          debt_amount: 0,
          status: 'completed',
          created_at: '2026-10-01T10:00:00Z',
          items: [
            {
              id: 'item-1',
              transaction_id: 'tx-1',
              product_id: riceProduct.id,
              quantity: 1,
              unit_price: 330000,
              price_type: 'wholesale',
              subtotal: 330000,
            },
          ],
        },
        {
          id: 'tx-2',
          invoice_number: 'INV-2',
          customer_id: customer.id,
          total_amount: 330000,
          discount_amount: 0,
          final_amount: 330000,
          payment_method: 'cash',
          cash_amount: 330000,
          savings_amount: 0,
          debt_amount: 0,
          status: 'completed',
          created_at: '2026-10-11T10:00:00Z',
          items: [
            {
              id: 'item-2',
              transaction_id: 'tx-2',
              product_id: riceProduct.id,
              quantity: 1,
              unit_price: 330000,
              price_type: 'wholesale',
              subtotal: 330000,
            },
          ],
        },
        {
          id: 'tx-3',
          invoice_number: 'INV-3',
          customer_id: customer.id,
          total_amount: 330000,
          discount_amount: 0,
          final_amount: 330000,
          payment_method: 'cash',
          cash_amount: 330000,
          savings_amount: 0,
          debt_amount: 0,
          status: 'completed',
          created_at: '2026-10-21T10:00:00Z',
          items: [
            {
              id: 'item-3',
              transaction_id: 'tx-3',
              product_id: riceProduct.id,
              quantity: 1,
              unit_price: 330000,
              price_type: 'wholesale',
              subtotal: 330000,
            },
          ],
        },
      ];

      // Evaluation at 2026-11-01 (11 days after last purchase on 10-21)
      // Intervals: [10, 10] -> EWMA = 10
      // Days elapsed = 11 days. Ratio = 11 / 10 = 1.1 -> URGENT
      const predictions = calculateRestockPredictions(
        [customer],
        [riceProduct],
        txs,
        { now: new Date('2026-11-01T10:00:00Z') }
      );

      expect(predictions.length).toBe(1);
      expect(predictions[0].purchase_count).toBe(3);
      expect(predictions[0].avg_interval_days).toBe(10);
      expect(predictions[0].ratio).toBe(1.1);
      expect(predictions[0].status).toBe('URGENT');
      expect(predictions[0].wa_link).toContain('https://wa.me/6281234567890');
    });
  });
});

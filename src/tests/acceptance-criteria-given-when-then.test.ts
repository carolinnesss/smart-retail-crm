import { describe, it, expect, beforeEach } from 'vitest';
import { checkCreditLimit, processDebtInstallment } from '@/lib/credit-guard';
import { validateGuestCheckoutRules } from '@/lib/guest-rules';
import { calculateRestockPredictions } from '@/lib/ewma-radar';
import { MockDataRepository } from '@/lib/repository/mock-repo';
import { ICustomer, IProduct, ITransaction, CreateTransactionInput } from '@/lib/types';

describe('PRD Acceptance Criteria (Given / When / Then)', () => {
  let repo: MockDataRepository;

  beforeEach(async () => {
    repo = MockDataRepository.getInstance();
    await repo.resetMockData();
  });

  // --------------------------------------------------------------------------
  // AC 1: Kasbon tepat di limit
  // --------------------------------------------------------------------------
  describe('Skenario 1: Kasbon tepat di limit kredit', () => {
    it('Given pelanggan memiliki sisa plafon tertentu, When kasbon diajukan TEPAT di limit, Then transaksi disetujui tanpa pelanggaran', () => {
      // Given: Limit 1.000.000, utang saat ini 750.000 -> sisa plafon tepat 250.000
      const customerName = 'Warung Bu Siti';
      const currentDebt = 750000;
      const maxCreditLimit = 1000000;
      const kasbonAmount = 250000; // Tepat di batas limit

      // When: Kasir memproses transaksi dengan kasbon tepat 250.000
      const result = checkCreditLimit(customerName, currentDebt, maxCreditLimit, kasbonAmount);

      // Then: Transaksi disetujui, utang terproyeksi menjadi 1.000.000, sisa plafon menjadi 0, defisit 0
      expect(result.isAllowed).toBe(true);
      expect(result.projectedDebt).toBe(1000000);
      expect(result.remainingCeiling).toBe(0);
      expect(result.deficit).toBe(0);
      expect(result.errorMessage).toBeUndefined();
    });

    it('Given pelanggan memiliki sisa plafon tertentu, When kasbon melebihi limit meski 1 Rupiah, Then sistem melakukan HARD-BLOCK', () => {
      // Given
      const customerName = 'Warung Bu Siti';
      const currentDebt = 750000;
      const maxCreditLimit = 1000000;
      const kasbonAmount = 250001; // Melebihi limit 1 Rupiah

      // When
      const result = checkCreditLimit(customerName, currentDebt, maxCreditLimit, kasbonAmount);

      // Then
      expect(result.isAllowed).toBe(false);
      expect(result.deficit).toBe(1);
      expect(result.errorMessage).toContain('Kasbon ditolak');
      expect(result.errorMessage).toContain('Sisa plafon: Rp 250.000');
    });
  });

  // --------------------------------------------------------------------------
  // AC 2: Validasi Uang Diterima Tunai (TUNAI)
  // --------------------------------------------------------------------------
  describe('Skenario 2: Pembayaran TUNAI dengan uang diterima kurang', () => {
    it('Given total belanja Rp 100.000, When uang tunai diterima kurang dari total (Rp 80.000), Then transaksi ditolak dengan pesan kesalahan', async () => {
      const product = (await repo.getProducts())[0];
      const input: CreateTransactionInput = {
        customer_id: null,
        items: [
          {
            product_id: product.id,
            quantity: 1,
            unit_price: product.retail_price,
            price_type: 'retail',
          },
        ],
        payment_method: 'TUNAI',
        cash_tendered: product.retail_price - 10000, // Kurang 10.000
      };

      await expect(repo.createTransaction(input)).rejects.toThrow(/kurang dari total tagihan/i);
    });
  });

  // --------------------------------------------------------------------------
  // AC 3: Perhitungan Kembalian Pembayaran Tunai
  // --------------------------------------------------------------------------
  describe('Skenario 3: Pembayaran TUNAI sukses dan hitung kembalian otomatis', () => {
    it('Given total belanja Rp 72.000 dan uang diterima Rp 100.000, When checkout TUNAI, Then kembalian dihitung tepat Rp 28.000', async () => {
      const product = (await repo.getProductById('20000000-0000-0000-0000-000000000006'))!;
      const input: CreateTransactionInput = {
        customer_id: null,
        items: [
          {
            product_id: product.id,
            quantity: 2,
            unit_price: 36000,
            price_type: 'wholesale',
          },
        ], // total = 72.000
        payment_method: 'TUNAI',
        cash_tendered: 100000,
      };

      const tx = await repo.createTransaction(input);
      expect(tx.final_amount).toBe(72000);
      expect(tx.cash_tendered).toBe(100000);
      expect(tx.change_amount).toBe(28000);
      expect(tx.payment_method).toBe('TUNAI');
    });
  });

  // --------------------------------------------------------------------------
  // AC 4: Tamu memakai kasbon (Walk-in Guest Protection)
  // --------------------------------------------------------------------------
  describe('Skenario 4: Pelanggan tamu (walk-in) memakai kasbon', () => {
    it('Given transaksi dengan pelanggan umum/tamu (customer_id = null), When kasir mencoba memakai KASBON, Then transaksi ditolak tegas', () => {
      const res = validateGuestCheckoutRules(null, 'KASBON');
      expect(res.isValid).toBe(false);
      expect(res.errorMessage).toContain('Pelanggan non-member/umum (walk-in) dilarang menggunakan kasbon');
    });

    it('Given transaksi dengan pelanggan umum/tamu, When membayar TUNAI, Then transaksi diizinkan', () => {
      const res = validateGuestCheckoutRules(null, 'TUNAI');
      expect(res.isValid).toBe(true);
      expect(res.errorMessage).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // AC 5: Restok dengan data kurang dari 3 pembelian
  // --------------------------------------------------------------------------
  describe('Skenario 5: Prediksi restok EWMA dengan data kurang dari 3 pembelian', () => {
    const customer: ICustomer = {
      id: 'cust-test-01',
      name: 'Warung Barokah Test',
      phone: '081234567890',
      address: 'Jl. Melati No. 5',
      customer_type: 'Warung / Grosir',
      max_credit_limit: 2000000,
      current_debt: 0,
      savings_balance: 0,
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    };

    const riceProduct: IProduct = {
      id: 'prod-rice-01',
      sku: 'RICE-01',
      name: 'Beras Ramos 25kg',
      category: 'Beras',
      unit: 'karung',
      retail_price: 350000,
      wholesale_price: 330000,
      stock_quantity: 50,
      min_stock_alert: 5,
      is_active: true,
      created_at: '2026-10-01T00:00:00Z',
      updated_at: '2026-10-01T00:00:00Z',
    };

    it('Given pelanggan hanya memiliki 1 transaksi pembelian beras, When prediksi restok dihitung, Then TIDAK DITAMPILKAN (< 3 data)', () => {
      const txs: ITransaction[] = [
        {
          id: 'tx-1',
          invoice_number: 'INV-001',
          customer_id: customer.id,
          total_amount: 330000,
          discount_amount: 0,
          final_amount: 330000,
          payment_method: 'TUNAI',
          cash_tendered: 330000,
          change_amount: 0,
          status: 'completed',
          created_at: '2026-10-25T10:00:00Z',
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

    it('Given pelanggan hanya memiliki 2 transaksi pembelian beras, When prediksi restok dihitung, Then TIDAK DITAMPILKAN (< 3 data)', () => {
      const txs: ITransaction[] = [
        {
          id: 'tx-1',
          invoice_number: 'INV-001',
          customer_id: customer.id,
          total_amount: 330000,
          discount_amount: 0,
          final_amount: 330000,
          payment_method: 'TUNAI',
          cash_tendered: 330000,
          change_amount: 0,
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
          invoice_number: 'INV-002',
          customer_id: customer.id,
          total_amount: 330000,
          discount_amount: 0,
          final_amount: 330000,
          payment_method: 'TUNAI',
          cash_tendered: 330000,
          change_amount: 0,
          status: 'completed',
          created_at: '2026-10-17T10:00:00Z',
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

    it('Given pelanggan memiliki TEPAT atau LEBIH DARI 3 transaksi pembelian, When prediksi restok dihitung, Then radar MENAMPILKAN prediksi', () => {
      const txs: ITransaction[] = [
        {
          id: 'tx-1',
          invoice_number: 'INV-001',
          customer_id: customer.id,
          total_amount: 330000,
          discount_amount: 0,
          final_amount: 330000,
          payment_method: 'TUNAI',
          cash_tendered: 330000,
          change_amount: 0,
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
          invoice_number: 'INV-002',
          customer_id: customer.id,
          total_amount: 330000,
          discount_amount: 0,
          final_amount: 330000,
          payment_method: 'TUNAI',
          cash_tendered: 330000,
          change_amount: 0,
          status: 'completed',
          created_at: '2026-10-08T10:00:00Z',
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
          invoice_number: 'INV-003',
          customer_id: customer.id,
          total_amount: 330000,
          discount_amount: 0,
          final_amount: 330000,
          payment_method: 'TUNAI',
          cash_tendered: 330000,
          change_amount: 0,
          status: 'completed',
          created_at: '2026-10-15T10:00:00Z',
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

      const predictions = calculateRestockPredictions([customer], [riceProduct], txs);
      expect(predictions.length).toBe(1);
      expect(predictions[0].customer_name).toBe(customer.name);
      expect(predictions[0].category).toBe('Beras');
      expect(predictions[0].commodity).toBe('Beras Ramos 25kg');
      expect(predictions[0].purchase_count).toBe(3);
    });
  });

  // --------------------------------------------------------------------------
  // AC 6: Cicilan kasbon membuka plafon kredit
  // --------------------------------------------------------------------------
  describe('Skenario 6: Pelunasan cicilan kasbon membuka kembali plafon kredit', () => {
    it('Given utang pelanggan 750.000 dari limit 1.000.000, When membayar cicilan 350.000, Then sisa utang berkurang dan plafon terbuka', () => {
      const res = processDebtInstallment('Warung Bu Siti', 750000, 1000000, 350000);
      expect(res.isValid).toBe(true);
      expect(res.newDebt).toBe(400000);
      expect(res.reopenedCeiling).toBe(600000);
    });
  });

  // --------------------------------------------------------------------------
  // AC 7: Atomisitas rollback multi-pos
  // --------------------------------------------------------------------------
  describe('Skenario 7: Rollback atomik saat terjadi error di tengah checkout', () => {
    it('Given transaksi dengan kasbon melebihi limit, When createTransaction dijalankan, Then seluruh operasi dibatalkan dan stok utuh', async () => {
      const customer = (await repo.getCustomerById('10000000-0000-0000-0000-000000000002'))!;
      const product = (await repo.getProductById('20000000-0000-0000-0000-000000000006'))!;
      const initialStock = product.stock_quantity;
      // Turunkan limit kredit agar transaksi kasbon 177.500 melebihi limit (utang 750.000 + 177.500 > limit 800.000)
      await repo.updateCustomer(customer.id, { max_credit_limit: 800000 });
      const initialDebt = customer.current_debt;

      const input: CreateTransactionInput = {
        customer_id: customer.id,
        items: [
          {
            product_id: product.id,
            quantity: 5,
            unit_price: product.wholesale_price,
            price_type: 'wholesale',
          },
        ],
        payment_method: 'KASBON',
      };

      await expect(repo.createTransaction(input)).rejects.toThrow('Kasbon ditolak');

      // Pastikan stok dan utang tetap utuh (rollback)
      const prodAfter = (await repo.getProductById(product.id))!;
      const custAfter = (await repo.getCustomerById(customer.id))!;
      expect(prodAfter.stock_quantity).toBe(initialStock);
      expect(custAfter.current_debt).toBe(initialDebt);
    });
  });
});

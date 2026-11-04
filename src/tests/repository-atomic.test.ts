import { describe, it, expect, beforeEach } from 'vitest';
import { MockDataRepository } from '@/lib/repository/mock-repo';
import { CreateTransactionInput } from '@/lib/types';

describe('Repository Layer & Atomic Transaction Rollback', () => {
  let repo: MockDataRepository;

  beforeEach(async () => {
    repo = MockDataRepository.getInstance();
    await repo.resetMockData();
  });

  describe('1. Atomic Checkout & Ledger Sync', () => {
    it('successfully processes TUNAI checkout and updates stock', async () => {
      const customer = (await repo.getCustomerById('10000000-0000-0000-0000-000000000002'))!;
      const product = (await repo.getProductById('20000000-0000-0000-0000-000000000006'))!; // Bimoli 2L, wholesale: 36.000
      const initialStock = product.stock_quantity;

      const input: CreateTransactionInput = {
        customer_id: customer.id,
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

      expect(tx).toBeDefined();
      expect(tx.final_amount).toBe(72000);
      expect(tx.cash_tendered).toBe(100000);
      expect(tx.change_amount).toBe(28000);

      // Verify stock was decremented
      const updatedProduct = (await repo.getProductById(product.id))!;
      expect(updatedProduct.stock_quantity).toBe(initialStock - 2);
    });

    it('successfully processes KASBON checkout, updates stock and creates debt_ledger record', async () => {
      const customer = (await repo.getCustomerById('10000000-0000-0000-0000-000000000002'))!;
      const product = (await repo.getProductById('20000000-0000-0000-0000-000000000006'))!;
      const initialStock = product.stock_quantity;
      const initialDebt = customer.current_debt;

      const input: CreateTransactionInput = {
        customer_id: customer.id,
        items: [
          {
            product_id: product.id,
            quantity: 2,
            unit_price: 36000,
            price_type: 'wholesale',
          },
        ], // total = 72.000
        payment_method: 'KASBON',
        due_date: '2026-11-20T00:00:00Z',
      };

      const tx = await repo.createTransaction(input);

      expect(tx).toBeDefined();
      expect(tx.final_amount).toBe(72000);
      expect(tx.payment_method).toBe('KASBON');

      // Verify stock was decremented
      const updatedProduct = (await repo.getProductById(product.id))!;
      expect(updatedProduct.stock_quantity).toBe(initialStock - 2);

      // Verify customer debt increased
      const updatedCustomer = (await repo.getCustomerById(customer.id))!;
      expect(updatedCustomer.current_debt).toBe(initialDebt + 72000);

      // Verify debt ledger audit record
      const debtLedger = (await repo.getDebtLedger?.(customer.id)) || [];
      expect(debtLedger.length).toBeGreaterThan(0);
      const latestDebt = debtLedger[0];
      expect(latestDebt.entry_type).toBe('charge');
      expect(latestDebt.amount).toBe(72000);
      expect(latestDebt.debt_before).toBe(initialDebt);
      expect(latestDebt.debt_after).toBe(initialDebt + 72000);
    });
  });

  describe('2. Atomic Rollback Guarantees (Zero Partial State)', () => {
    it('ROLLS BACK when 2nd item has insufficient stock (1st item stock preserved)', async () => {
      const customer = (await repo.getCustomerById('10000000-0000-0000-0000-000000000002'))!;
      const prod1 = (await repo.getProductById('20000000-0000-0000-0000-000000000006'))!; // Bimoli stock: ~50
      const prod2 = (await repo.getProductById('20000000-0000-0000-0000-000000000001'))!; // Rice stock: ~45
      const initialStock1 = prod1.stock_quantity;
      const initialStock2 = prod2.stock_quantity;

      const input: CreateTransactionInput = {
        customer_id: customer.id,
        items: [
          {
            product_id: prod1.id,
            quantity: 5,
            unit_price: 36000,
            price_type: 'wholesale',
          },
          {
            product_id: prod2.id,
            quantity: 999999, // Impossible stock quantity!
            unit_price: 68000,
            price_type: 'wholesale',
          },
        ],
        payment_method: 'TUNAI',
        cash_tendered: 200000,
      };

      await expect(repo.createTransaction(input)).rejects.toThrow('tidak mencukupi');

      // Verify complete rollback: prod1 stock must remain untouched
      const checkedProd1 = (await repo.getProductById(prod1.id))!;
      const checkedProd2 = (await repo.getProductById(prod2.id))!;

      expect(checkedProd1.stock_quantity).toBe(initialStock1);
      expect(checkedProd2.stock_quantity).toBe(initialStock2);
    });

    it('ROLLS BACK when kasbon exceeds limit (stock and debt untouched)', async () => {
      const customer = (await repo.getCustomerById('10000000-0000-0000-0000-000000000002'))!;
      const prod = (await repo.getProductById('20000000-0000-0000-0000-000000000002'))!; // Karung 25kg (340.000)
      const initialStock = prod.stock_quantity;
      const initialDebt = customer.current_debt;

      // Credit limit is 3.000.000, current debt is 750.000. Max kasbon allowed is 2.250.000.
      // Trying to take 10 bags = 3.400.000 via kasbon!
      const input: CreateTransactionInput = {
        customer_id: customer.id,
        items: [
          {
            product_id: prod.id,
            quantity: 10,
            unit_price: 340000,
            price_type: 'wholesale',
          },
        ],
        payment_method: 'KASBON',
        due_date: '2026-11-20T00:00:00Z',
      };

      await expect(repo.createTransaction(input)).rejects.toThrow('Kasbon ditolak');

      // Verify stock & customer debt are unchanged
      const checkedProd = (await repo.getProductById(prod.id))!;
      const checkedCustomer = (await repo.getCustomerById(customer.id))!;

      expect(checkedProd.stock_quantity).toBe(initialStock);
      expect(checkedCustomer.current_debt).toBe(initialDebt);
    });

    it('ROLLS BACK when walk-in guest attempts to use kasbon', async () => {
      const prod = (await repo.getProductById('20000000-0000-0000-0000-000000000006'))!;
      const initialStock = prod.stock_quantity;

      const input: CreateTransactionInput = {
        customer_id: null, // Walk-in
        items: [
          {
            product_id: prod.id,
            quantity: 1,
            unit_price: 38500,
            price_type: 'retail',
          },
        ],
        payment_method: 'KASBON',
      };

      await expect(repo.createTransaction(input)).rejects.toThrow('Pelanggan non-member/umum');
      const checkedProd = (await repo.getProductById(prod.id))!;
      expect(checkedProd.stock_quantity).toBe(initialStock);
    });
  });

  describe('3. Kasbon Debt Installment Repayment', () => {
    it('reduces current debt and creates audit record', async () => {
      const customer = (await repo.getCustomerById('10000000-0000-0000-0000-000000000002'))!;
      const initialDebt = customer.current_debt;

      const payment = await repo.createDebtPayment({
        customer_id: customer.id,
        payment_amount: 200000,
        notes: 'Cicilan kasbon mingguan',
      });

      expect(payment.entry_type).toBe('payment');
      expect(payment.debt_before).toBe(initialDebt);
      expect(payment.debt_after).toBe(initialDebt - 200000);

      const updated = (await repo.getCustomerById(customer.id))!;
      expect(updated.current_debt).toBe(initialDebt - 200000);
    });

    it('rejects installment payment greater than current debt', async () => {
      const customer = (await repo.getCustomerById('10000000-0000-0000-0000-000000000002'))!;
      const initialDebt = customer.current_debt;

      await expect(
        repo.createDebtPayment({
          customer_id: customer.id,
          payment_amount: initialDebt + 50000,
        })
      ).rejects.toThrow('melebihi total kasbon');
    });
  });

  describe('4. Financial KPIs Summary', () => {
    it('aggregates store financial KPIs accurately', async () => {
      const kpis = await repo.getFinancialKPIs();

      expect(kpis.total_active_debt).toBeGreaterThan(0);
      expect(kpis.total_customers).toBeGreaterThan(0);
      expect(kpis.active_debtors_count).toBeGreaterThan(0);
    });
  });
});

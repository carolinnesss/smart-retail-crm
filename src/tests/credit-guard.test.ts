import { describe, it, expect } from 'vitest';
import { checkCreditLimit, processDebtInstallment } from '@/lib/credit-guard';

describe('Kasbon Credit Limit Guard & Debt Installments', () => {
  const customerName = 'Warung Bu Siti';
  const currentDebt = 750000;
  const maxCreditLimit = 1000000; // remaining ceiling = 250.000

  describe('1. Kasbon Limit Guard (Hard-Blocking)', () => {
    it('accepts kasbon within remaining credit ceiling', () => {
      // 200.000 < 250.000 ceiling
      const res = checkCreditLimit(customerName, currentDebt, maxCreditLimit, 200000);
      expect(res.isAllowed).toBe(true);
      expect(res.projectedDebt).toBe(950000);
      expect(res.remainingCeiling).toBe(50000);
      expect(res.deficit).toBe(0);
      expect(res.errorMessage).toBeUndefined();
    });

    it('accepts kasbon EXACTLY at the credit limit (boundary test)', () => {
      // exactly 250.000 -> projectedDebt = 1.000.000 == limit
      const res = checkCreditLimit(customerName, currentDebt, maxCreditLimit, 250000);
      expect(res.isAllowed).toBe(true);
      expect(res.projectedDebt).toBe(1000000);
      expect(res.remainingCeiling).toBe(0);
      expect(res.deficit).toBe(0);
    });

    it('HARD-BLOCKS kasbon when exceeding credit limit by 1 Rupiah', () => {
      // 250.001 -> projectedDebt = 1.000.001 > 1.000.000
      const res = checkCreditLimit(customerName, currentDebt, maxCreditLimit, 250001);
      expect(res.isAllowed).toBe(false);
      expect(res.projectedDebt).toBe(1000001);
      expect(res.deficit).toBe(1);
      expect(res.errorMessage).toContain('Kasbon ditolak');
      expect(res.errorMessage).toContain('Sisa plafon: Rp 250.000');
    });

    it('HARD-BLOCKS huge kasbon with detailed deficit alert message', () => {
      // 500.000 kasbon -> deficit of 250.000
      const res = checkCreditLimit(customerName, currentDebt, maxCreditLimit, 500000);
      expect(res.isAllowed).toBe(false);
      expect(res.projectedDebt).toBe(1250000);
      expect(res.deficit).toBe(250000);
      expect(res.errorMessage).toContain('Defisit: Rp 250.000');
    });

    it('allows 0 kasbon amount', () => {
      const res = checkCreditLimit(customerName, currentDebt, maxCreditLimit, 0);
      expect(res.isAllowed).toBe(true);
      expect(res.projectedDebt).toBe(currentDebt);
    });
  });

  describe('2. Debt Installments & Plafon Re-opening', () => {
    it('successfully processes debt installment and re-opens credit ceiling', () => {
      // Pay 350.000 of 750.000 debt
      const res = processDebtInstallment(customerName, currentDebt, maxCreditLimit, 350000);
      expect(res.isValid).toBe(true);
      expect(res.newDebt).toBe(400000);
      expect(res.reopenedCeiling).toBe(600000); // 1.000.000 - 400.000
      expect(res.errorMessage).toBeUndefined();
    });

    it('allows full debt settlement (pelunasan total)', () => {
      const res = processDebtInstallment(customerName, currentDebt, maxCreditLimit, 750000);
      expect(res.isValid).toBe(true);
      expect(res.newDebt).toBe(0);
      expect(res.reopenedCeiling).toBe(1000000); // full limit available
    });

    it('rejects installment payment exceeding current debt', () => {
      // Trying to pay 800.000 when debt is 750.000
      const res = processDebtInstallment(customerName, currentDebt, maxCreditLimit, 800000);
      expect(res.isValid).toBe(false);
      expect(res.newDebt).toBe(currentDebt);
      expect(res.errorMessage).toContain('melebihi total kasbon');
    });

    it('rejects 0 or negative installment payment amounts', () => {
      const resZero = processDebtInstallment(customerName, currentDebt, maxCreditLimit, 0);
      expect(resZero.isValid).toBe(false);
      expect(resZero.errorMessage).toContain('lebih besar dari Rp 0');

      const resNeg = processDebtInstallment(customerName, currentDebt, maxCreditLimit, -50000);
      expect(resNeg.isValid).toBe(false);
      expect(resNeg.errorMessage).toContain('lebih besar dari Rp 0');
    });
  });
});

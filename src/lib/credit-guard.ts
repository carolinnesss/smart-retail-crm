import { formatIDR } from './formatters';

export interface CreditLimitCheckResult {
  isAllowed: boolean;
  projectedDebt: number;
  remainingCeiling: number;
  deficit: number;
  errorMessage?: string;
}

/**
 * Validates kasbon credit limit guard.
 * HARD BLOCK: if current_debt + requestedDebt > max_credit_limit, transaction is rejected.
 * Exactly at limit (current_debt + requestedDebt === max_credit_limit) is accepted.
 */
export function checkCreditLimit(
  customerName: string,
  currentDebt: number,
  maxCreditLimit: number,
  requestedDebt: number
): CreditLimitCheckResult {
  const req = Math.max(0, requestedDebt || 0);
  const cur = Math.max(0, currentDebt || 0);
  const lim = Math.max(0, maxCreditLimit || 0);

  const projectedDebt = Number((cur + req).toFixed(2));
  const remainingCeiling = Math.max(0, Number((lim - cur).toFixed(2)));

  if (projectedDebt > lim) {
    const deficit = Number((projectedDebt - lim).toFixed(2));
    return {
      isAllowed: false,
      projectedDebt,
      remainingCeiling,
      deficit,
      errorMessage: `Kasbon ditolak: Total utang ${customerName} akan menjadi ${formatIDR(
        projectedDebt
      )}, melebihi limit kredit ${formatIDR(lim)}. Utang saat ini: ${formatIDR(
        cur
      )}, Sisa plafon: ${formatIDR(remainingCeiling)}, Defisit: ${formatIDR(deficit)}.`,
    };
  }

  return {
    isAllowed: true,
    projectedDebt,
    remainingCeiling: Math.max(0, Number((lim - projectedDebt).toFixed(2))),
    deficit: 0,
  };
}

export interface DebtInstallmentResult {
  isValid: boolean;
  newDebt: number;
  reopenedCeiling: number;
  errorMessage?: string;
}

/**
 * Validates debt installment repayment.
 * Reduces current_debt and re-opens credit ceiling.
 * Cannot pay more than current_debt.
 */
export function processDebtInstallment(
  customerName: string,
  currentDebt: number,
  maxCreditLimit: number,
  paymentAmount: number
): DebtInstallmentResult {
  if (paymentAmount <= 0) {
    return {
      isValid: false,
      newDebt: currentDebt,
      reopenedCeiling: Math.max(0, maxCreditLimit - currentDebt),
      errorMessage: 'Nominal pembayaran cicilan harus lebih besar dari Rp 0.',
    };
  }

  if (paymentAmount > currentDebt) {
    return {
      isValid: false,
      newDebt: currentDebt,
      reopenedCeiling: Math.max(0, maxCreditLimit - currentDebt),
      errorMessage: `Pembayaran cicilan (${formatIDR(paymentAmount)}) melebihi total kasbon ${customerName} (${formatIDR(
        currentDebt
      )}).`,
    };
  }

  const newDebt = Number((currentDebt - paymentAmount).toFixed(2));
  const reopenedCeiling = Number((maxCreditLimit - newDebt).toFixed(2));

  return {
    isValid: true,
    newDebt,
    reopenedCeiling,
  };
}

export interface GuestRuleValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Validates guest (walk-in) customer checkout rules.
 * Unregistered/guest customers (customer_id is null/undefined/empty) are strictly forbidden
 * from using KASBON.
 */
export function validateGuestCheckoutRules(
  customerId: string | null | undefined,
  paymentMethodOrDebtAmount: string | number = 'TUNAI',
  debtAmount: number = 0
): GuestRuleValidationResult {
  const isGuest = !customerId || customerId.trim() === '';

  if (isGuest) {
    if (typeof paymentMethodOrDebtAmount === 'string') {
      if (paymentMethodOrDebtAmount === 'KASBON' || debtAmount > 0) {
        return {
          isValid: false,
          errorMessage: 'Pelanggan non-member/umum (walk-in) dilarang menggunakan kasbon.',
        };
      }
    } else {
      // paymentMethodOrDebtAmount is a number (legacy signature savingsAmount, debtAmount)
      if (debtAmount > 0 || paymentMethodOrDebtAmount > 0) {
        return {
          isValid: false,
          errorMessage: 'Pelanggan non-member/umum (walk-in) dilarang menggunakan kasbon.',
        };
      }
    }
  }

  return {
    isValid: true,
  };
}

import { describe, it, expect } from 'vitest';
import { validateGuestCheckoutRules } from '@/lib/guest-rules';

describe('Walk-in Guest Rules (Aturan Pelanggan Tamu)', () => {
  it('allows walk-in guest (null customer) to pay with TUNAI', () => {
    const res = validateGuestCheckoutRules(null, 'TUNAI');
    expect(res.isValid).toBe(true);
    expect(res.errorMessage).toBeUndefined();
  });

  it('allows walk-in guest (empty customer id) to pay with TUNAI', () => {
    const res = validateGuestCheckoutRules('', 'TUNAI');
    expect(res.isValid).toBe(true);
  });

  it('REJECTS walk-in guest trying to use KASBON', () => {
    const res = validateGuestCheckoutRules(null, 'KASBON');
    expect(res.isValid).toBe(false);
    expect(res.errorMessage).toContain('Pelanggan non-member/umum (walk-in) dilarang menggunakan kasbon');
  });

  it('REJECTS walk-in guest trying to use debt amount > 0', () => {
    const res = validateGuestCheckoutRules(null, 0, 50000);
    expect(res.isValid).toBe(false);
    expect(res.errorMessage).toContain('Pelanggan non-member/umum (walk-in) dilarang menggunakan kasbon');
  });

  it('allows registered customer to use KASBON', () => {
    const res = validateGuestCheckoutRules('customer-uuid-12345', 'KASBON');
    expect(res.isValid).toBe(true);
    expect(res.errorMessage).toBeUndefined();
  });
});

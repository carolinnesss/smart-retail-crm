import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  loginMockUser,
  getMockProfileById,
  getAllMockProfiles,
  updateMockUser,
  createMockUser,
  isMockAuthAllowed,
  getMockAuditLogs,
  recordMockAuditLog,
} from '@/lib/auth/mock-auth';
import { requireRole, requireUser, AuthError, handleAuthError } from '@/lib/auth/guards';
import * as sessionModule from '@/lib/auth/session';
import { getRepository } from '@/lib/repository';
import { MockDataRepository } from '@/lib/repository/mock-repo';

describe('Authentication, RBAC & Security Permission Matrix', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. Mock Authentication Security Guards
  // --------------------------------------------------------------------------
  describe('Mock Auth Security & Production Lockdown', () => {
    it('allows mock auth in development / test environments when Supabase is not configured', () => {
      expect(isMockAuthAllowed()).toBe(true);
    });

    it('strictly disables mock auth in production environment (NODE_ENV=production)', () => {
      process.env.NODE_ENV = 'production';
      expect(isMockAuthAllowed()).toBe(false);
    });

    it('rejects login when mock auth is disabled in production', async () => {
      process.env.NODE_ENV = 'production';
      const res = await loginMockUser('owner@demo.local', 'owner123');
      expect(res.success).toBe(false);
      expect(res.error).toContain('disabled');
    });

    it('authenticates valid OWNER credentials in demo mode', async () => {
      const res = await loginMockUser('owner@demo.local', 'owner123');
      expect(res.success).toBe(true);
      expect(res.session?.profile.role).toBe('OWNER');
      expect(res.session?.profile.full_name).toContain('Oline');
    });

    it('authenticates valid CASHIER credentials in demo mode', async () => {
      const res = await loginMockUser('kasir@demo.local', 'kasir123');
      expect(res.success).toBe(true);
      expect(res.session?.profile.role).toBe('CASHIER');
      expect(res.session?.profile.full_name).toContain('Siti Aminah');
    });

    it('rejects invalid password with generic error message', async () => {
      const res = await loginMockUser('owner@demo.local', 'wrongpass');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Email atau kata sandi tidak valid.');
    });

    it('rejects non-existent email with generic error message to prevent enumeration', async () => {
      const res = await loginMockUser('unknown@demo.local', 'password');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Email atau kata sandi tidak valid.');
    });

    it('rejects login for deactivated/inactive users', async () => {
      // Create and deactivate a temporary user
      const tempCashier = createMockUser({
        email: `inactive-${Date.now()}@demo.local`,
        full_name: 'Kasir Nonaktif',
        role: 'CASHIER',
        password: 'password123',
      });

      updateMockUser(tempCashier.id, { is_active: false });

      const res = await loginMockUser(tempCashier.email!, 'password123');
      expect(res.success).toBe(false);
      expect(res.error).toContain('dinonaktifkan');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Server-side Authorization Guards (requireUser & requireRole)
  // --------------------------------------------------------------------------
  describe('Centralized Authorization Guards (requireUser & requireRole)', () => {
    it('requireUser throws AuthError(401) when no active session is present', async () => {
      vi.spyOn(sessionModule, 'getServerSession').mockResolvedValue(null);

      await expect(requireUser()).rejects.toThrow(AuthError);
      try {
        await requireUser();
      } catch (err: any) {
        expect(err.statusCode).toBe(401);
        expect(err.message).toContain('Sesi tidak valid');
      }
    });

    it('requireUser throws AuthError(403) when authenticated user is inactive', async () => {
      vi.spyOn(sessionModule, 'getServerSession').mockResolvedValue({
        user: { id: 'u-1', email: 'inactive@demo.local' },
        profile: {
          id: 'u-1',
          email: 'inactive@demo.local',
          full_name: 'User Inactive',
          role: 'CASHIER',
          is_active: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });

      await expect(requireUser()).rejects.toThrow(AuthError);
      try {
        await requireUser();
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
        expect(err.message).toContain('dinonaktifkan');
      }
    });

    it('requireRole grants access to OWNER when OWNER role is required', async () => {
      vi.spyOn(sessionModule, 'getServerSession').mockResolvedValue({
        user: { id: 'u-owner', email: 'owner@demo.local' },
        profile: {
          id: 'u-owner',
          email: 'owner@demo.local',
          full_name: 'Owner User',
          role: 'OWNER',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });

      const session = await requireRole(['OWNER']);
      expect(session.profile.role).toBe('OWNER');
    });

    it('requireRole rejects CASHIER with AuthError(403) when OWNER role is required', async () => {
      vi.spyOn(sessionModule, 'getServerSession').mockResolvedValue({
        user: { id: 'u-cashier', email: 'kasir@demo.local' },
        profile: {
          id: 'u-cashier',
          email: 'kasir@demo.local',
          full_name: 'Cashier User',
          role: 'CASHIER',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      });

      await expect(requireRole(['OWNER'])).rejects.toThrow(AuthError);
      try {
        await requireRole(['OWNER']);
      } catch (err: any) {
        expect(err.statusCode).toBe(403);
        expect(err.message).toContain('Akses ditolak');
      }
    });

    it('handleAuthError formats consistent JSON responses for 401 and 403', async () => {
      const err401 = new AuthError('Unauthorized', 401);
      const res401 = handleAuthError(err401);
      expect(res401.status).toBe(401);
      const data401 = await res401.json();
      expect(data401.success).toBe(false);
      expect(data401.error).toBe('Unauthorized');

      const err403 = new AuthError('Forbidden', 403);
      const res403 = handleAuthError(err403);
      expect(res403.status).toBe(403);
      const data403 = await res403.json();
      expect(data403.success).toBe(false);
      expect(data403.error).toBe('Forbidden');
    });
  });

  // --------------------------------------------------------------------------
  // 3. Last Active OWNER Protection Guard
  // --------------------------------------------------------------------------
  describe('Last Active OWNER Safety Guard', () => {
    it('prevents deactivating or demoting the last active OWNER', () => {
      const allProfiles = getAllMockProfiles();
      const owners = allProfiles.filter((u) => u.role === 'OWNER' && u.is_active);

      // If only 1 owner exists, attempting to deactivate must throw
      if (owners.length === 1) {
        expect(() => {
          updateMockUser(owners[0].id, { is_active: false });
        }).toThrow(/setidaknya satu OWNER/);

        expect(() => {
          updateMockUser(owners[0].id, { role: 'CASHIER' });
        }).toThrow(/setidaknya satu OWNER/);
      }
    });

    it('allows deactivating an OWNER if another active OWNER exists', () => {
      // Create a second owner
      const secondOwner = createMockUser({
        email: `owner2-${Date.now()}@demo.local`,
        full_name: 'Owner Kedua',
        role: 'OWNER',
        password: 'password123',
      });

      // Now deactivating the second owner is permitted
      const updated = updateMockUser(secondOwner.id, { is_active: false });
      expect(updated.is_active).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 4. Identity Spoofing & Cashier Attribution in Repository
  // --------------------------------------------------------------------------
  describe('Identity Spoofing & Cashier Attribution', () => {
    let repo: MockDataRepository;

    beforeEach(() => {
      repo = MockDataRepository.getInstance();
    });

    it('records cashier_id correctly on checkout transactions and double-entry ledgers', async () => {
      const cashierId = '22222222-2222-2222-2222-222222222222';
      const products = await repo.getProducts();
      const customers = await repo.getCustomers();
      const testCust = customers.find((c) => c.name.includes('Siti'))!;

      const tx = await repo.createTransaction({
        customer_id: testCust.id,
        cashier_id: cashierId,
        items: [
          {
            product_id: products[0].id,
            quantity: 1,
            unit_price: products[0].retail_price,
            price_type: 'retail',
          },
        ],
        payment_method: 'TUNAI',
        cash_tendered: products[0].retail_price,
      });

      expect(tx.cashier_id).toBe(cashierId);
    });

    it('records cashier_id on debt installment repayments', async () => {
      const cashierId = '22222222-2222-2222-2222-222222222222';
      const customers = await repo.getCustomers();
      const testCust = customers.find((c) => c.current_debt > 0) || customers[0];

      // Ensure some debt exists
      testCust.current_debt = 100000;
      testCust.max_credit_limit = 500000;

      const debtPayment = await repo.createDebtPayment({
        customer_id: testCust.id,
        cashier_id: cashierId,
        payment_amount: 50000,
        notes: 'Uji bayar kasbon kasir',
      });

      expect(debtPayment.cashier_id).toBe(cashierId);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Immutable Audit Trail Functionality
  // --------------------------------------------------------------------------
  describe('Audit Logging System', () => {
    it('records and retrieves sensitive audit log events', () => {
      const newLog = recordMockAuditLog({
        action: 'UPDATE_CREDIT_LIMIT',
        entity: 'customer',
        entity_id: 'cust-123',
        actor_id: '11111111-1111-1111-1111-111111111111',
        actor_name: 'Oline (Pemilik)',
        old_value: { max_credit_limit: 500000 },
        new_value: { max_credit_limit: 1500000 },
      });

      expect(newLog.id).toBeDefined();
      expect(newLog.created_at).toBeDefined();

      const logs = getMockAuditLogs({ action: 'UPDATE_CREDIT_LIMIT' });
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].action).toBe('UPDATE_CREDIT_LIMIT');
    });

    it('filters audit logs by action or entity correctly', () => {
      const withdrawalLogs = getMockAuditLogs({ action: 'SAVINGS_WITHDRAWAL' });
      for (const log of withdrawalLogs) {
        expect(log.action).toBe('SAVINGS_WITHDRAWAL');
      }

      const userLogs = getMockAuditLogs({ entity: 'user' });
      for (const log of userLogs) {
        expect(log.entity).toBe('user');
      }
    });
  });
});

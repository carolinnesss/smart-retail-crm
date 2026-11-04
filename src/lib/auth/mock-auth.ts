import { IUserProfile, UserRole } from '../types';
import { AuthSession } from './types';
import { isSupabaseConfigured } from '../supabase';

interface MockUserRecord {
  id: string;
  email: string;
  password: string; // Plaintext for local zero-config demo only
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// In-memory demo users
const INITIAL_MOCK_USERS: MockUserRecord[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'owner@demo.local',
    password: 'owner123',
    full_name: 'Oline (Pemilik)',
    role: 'OWNER',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    email: 'kasir@demo.local',
    password: 'kasir123',
    full_name: 'Siti Aminah (Kasir)',
    role: 'CASHIER',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

let mockUsers: MockUserRecord[] = JSON.parse(JSON.stringify(INITIAL_MOCK_USERS));

/**
 * Strict Security Guard:
 * Mock authentication is ONLY permitted in non-production environments
 * when Supabase is NOT configured.
 *
 * In production OR when Supabase environment variables are provided,
 * MockAuth is completely disabled.
 */
export function isMockAuthAllowed(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  if (isSupabaseConfigured()) {
    return false;
  }
  return true;
}

/**
 * Validates mock credentials and returns an active AuthSession.
 */
export async function loginMockUser(
  email: string,
  pass: string
): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
  if (!isMockAuthAllowed()) {
    return {
      success: false,
      error: 'Mock authentication is disabled in this environment.',
    };
  }

  const user = mockUsers.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase()
  );

  if (!user || user.password !== pass) {
    return {
      success: false,
      error: 'Email atau kata sandi tidak valid.',
    };
  }

  if (!user.is_active) {
    return {
      success: false,
      error: 'Akun Anda dinonaktifkan. Silakan hubungi pemilik toko.',
    };
  }

  const session: AuthSession = {
    user: { id: user.id, email: user.email },
    profile: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
  };

  return { success: true, session };
}

/**
 * Retrieves a mock user profile by user id.
 */
export function getMockProfileById(userId: string): IUserProfile | null {
  if (!isMockAuthAllowed()) return null;
  const user = mockUsers.find((u) => u.id === userId);
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

/**
 * Retrieves all mock user profiles (for Owner staff management).
 */
export function getAllMockProfiles(): IUserProfile[] {
  if (!isMockAuthAllowed()) return [];
  return mockUsers.map((u) => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    role: u.role,
    is_active: u.is_active,
    created_at: u.created_at,
    updated_at: u.updated_at,
  }));
}

/**
 * Updates a mock user's role or active status.
 */
export function updateMockUser(
  userId: string,
  updates: Partial<Pick<MockUserRecord, 'role' | 'is_active' | 'full_name' | 'password'>>
): IUserProfile {
  if (!isMockAuthAllowed()) {
    throw new Error('Mock authentication is disabled in this environment.');
  }

  const user = mockUsers.find((u) => u.id === userId);
  if (!user) {
    throw new Error('Pengguna tidak ditemukan.');
  }

  // Guard: Protect last active OWNER
  if (
    user.role === 'OWNER' &&
    ((updates.role && updates.role !== 'OWNER') || updates.is_active === false)
  ) {
    const activeOwners = mockUsers.filter(
      (u) => u.role === 'OWNER' && u.is_active && u.id !== userId
    );
    if (activeOwners.length === 0) {
      throw new Error(
        'Operasi ditolak: Toko harus memiliki setidaknya satu OWNER yang aktif.'
      );
    }
  }

  if (updates.role) user.role = updates.role;
  if (updates.is_active !== undefined) user.is_active = updates.is_active;
  if (updates.full_name) user.full_name = updates.full_name;
  if (updates.password) user.password = updates.password;
  user.updated_at = new Date().toISOString();

  return {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

/**
 * Creates a new mock staff user account.
 */
export function createMockUser(params: {
  email: string;
  password?: string;
  full_name: string;
  role: UserRole;
}): IUserProfile {
  if (!isMockAuthAllowed()) {
    throw new Error('Mock authentication is disabled in this environment.');
  }

  const existing = mockUsers.find(
    (u) => u.email.toLowerCase() === params.email.trim().toLowerCase()
  );
  if (existing) {
    throw new Error('Email sudah terdaftar untuk pengguna lain.');
  }

  const id = `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const now = new Date().toISOString();
  const newUser: MockUserRecord = {
    id,
    email: params.email.trim().toLowerCase(),
    password: params.password || 'kasir123',
    full_name: params.full_name,
    role: params.role || 'CASHIER',
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  mockUsers.push(newUser);

  recordMockAuditLog({
    action: 'USER_CREATE',
    entity: 'user',
    entity_id: newUser.id,
    actor_id: '11111111-1111-1111-1111-111111111111',
    actor_name: 'Oline (Pemilik)',
    new_value: { email: newUser.email, full_name: newUser.full_name, role: newUser.role },
  });

  return {
    id: newUser.id,
    email: newUser.email,
    full_name: newUser.full_name,
    role: newUser.role,
    is_active: newUser.is_active,
    created_at: newUser.created_at,
    updated_at: newUser.updated_at,
  };
}

// In-memory Audit Log Store
export interface MockAuditEntry {
  id: string;
  actor_id?: string | null;
  actor_name?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  old_value?: Record<string, any> | null;
  new_value?: Record<string, any> | null;
  created_at: string;
}

const INITIAL_MOCK_AUDIT_LOGS: MockAuditEntry[] = [
  {
    id: 'log-001',
    actor_id: '11111111-1111-1111-1111-111111111111',
    actor_name: 'Oline (Pemilik)',
    action: 'UPDATE_CREDIT_LIMIT',
    entity: 'customer',
    entity_id: '10000000-0000-0000-0000-000000000001',
    old_value: { max_credit_limit: 1000000 },
    new_value: { max_credit_limit: 2000000, customer_name: 'Warung Bu Siti' },
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'log-002',
    actor_id: '11111111-1111-1111-1111-111111111111',
    actor_name: 'Oline (Pemilik)',
    action: 'UPDATE_PRODUCT_PRICE',
    entity: 'product',
    entity_id: '00000000-0000-0000-0000-000000000001',
    old_value: { retail_price: 76000, wholesale_price: 70000 },
    new_value: { retail_price: 78000, wholesale_price: 72000, product_name: 'Beras Pandan Wangi 5kg' },
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    id: 'log-003',
    actor_id: '11111111-1111-1111-1111-111111111111',
    actor_name: 'Oline (Pemilik)',
    action: 'SAVINGS_WITHDRAWAL',
    entity: 'savings',
    entity_id: '50000000-0000-0000-0000-000000000001',
    old_value: { balance_before: 150000 },
    new_value: { amount: 50000, balance_after: 100000, customer_name: 'Warung Bu Siti' },
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
];

let mockAuditLogs: MockAuditEntry[] = [...INITIAL_MOCK_AUDIT_LOGS];

export function recordMockAuditLog(entry: Omit<MockAuditEntry, 'id' | 'created_at'>): MockAuditEntry {
  const newEntry: MockAuditEntry = {
    ...entry,
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    created_at: new Date().toISOString(),
  };
  mockAuditLogs.unshift(newEntry);
  return newEntry;
}

export function getMockAuditLogs(filter?: { action?: string; entity?: string }): MockAuditEntry[] {
  let result = [...mockAuditLogs];
  if (filter?.action) {
    result = result.filter((l) => l.action.toLowerCase() === filter.action!.toLowerCase());
  }
  if (filter?.entity) {
    result = result.filter((l) => l.entity.toLowerCase() === filter.entity!.toLowerCase());
  }
  return result;
}


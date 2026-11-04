import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserRole, IUserProfile } from '../types';
import { isSupabaseConfigured } from '../supabase';
import {
  createMockUser,
  updateMockUser,
  getAllMockProfiles,
  isMockAuthAllowed,
} from './mock-auth';

let adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY is required for administrative user management operations.'
      );
    }

    adminClient = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}

/**
 * Creates a new cashier / staff account.
 * Uses Supabase Admin API in Supabase mode, or MockAuth in zero-config mode.
 */
export async function createStaffAccount(params: {
  email: string;
  password?: string;
  full_name: string;
  role: UserRole;
}): Promise<IUserProfile> {
  const client = getAdminClient();

  if (!client) {
    if (isMockAuthAllowed()) {
      return createMockUser(params);
    }
    throw new Error('Database is not configured for user creation.');
  }

  const { data: authData, error: authError } = await client.auth.admin.createUser({
    email: params.email,
    password: params.password || 'kasir123',
    email_confirm: true,
    user_metadata: {
      full_name: params.full_name,
      role: params.role || 'CASHIER',
    },
  });

  if (authError || !authData.user) {
    throw new Error(`Gagal membuat akun pengguna: ${authError?.message}`);
  }

  // Profile is created automatically by database trigger 'on_auth_user_created'
  // Fetch the created profile to return
  const { data: profileData, error: profileError } = await client
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profileData) {
    return {
      id: authData.user.id,
      email: authData.user.email,
      full_name: params.full_name,
      role: params.role,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  return {
    ...profileData,
    email: authData.user.email,
  };
}

/**
 * Lists all staff profiles.
 */
export async function listStaffAccounts(): Promise<IUserProfile[]> {
  const client = getAdminClient();

  if (!client) {
    if (isMockAuthAllowed()) {
      return getAllMockProfiles();
    }
    return [];
  }

  const { data, error } = await client
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Gagal memuat daftar pengguna: ${error.message}`);
  }

  return (data || []) as IUserProfile[];
}

/**
 * Updates staff user role or active status.
 */
export async function updateStaffAccount(
  userId: string,
  updates: { is_active?: boolean; role?: UserRole; full_name?: string }
): Promise<IUserProfile> {
  const client = getAdminClient();

  if (!client) {
    if (isMockAuthAllowed()) {
      return updateMockUser(userId, updates);
    }
    throw new Error('Database is not configured for user updates.');
  }

  // Check last active owner guard
  if (updates.role !== undefined || updates.is_active === false) {
    const { data: targetProfile } = await client
      .from('profiles')
      .select('role, is_active')
      .eq('id', userId)
      .single();

    if (targetProfile && targetProfile.role === 'OWNER') {
      const { count } = await client
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'OWNER')
        .eq('is_active', true)
        .neq('id', userId);

      if ((count || 0) === 0) {
        throw new Error(
          'Operasi ditolak: Toko harus memiliki setidaknya satu OWNER yang aktif.'
        );
      }
    }
  }

  const { data, error } = await client
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Gagal memperbarui pengguna: ${error?.message}`);
  }

  return data as IUserProfile;
}

/**
 * Resets a staff user's password.
 */
export async function resetStaffPassword(
  userId: string,
  newPassword: string
): Promise<void> {
  const client = getAdminClient();

  if (!client) {
    if (isMockAuthAllowed()) {
      updateMockUser(userId, { password: newPassword });
      return;
    }
    throw new Error('Database is not configured for password resets.');
  }

  const { error } = await client.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    throw new Error(`Gagal mereset kata sandi: ${error.message}`);
  }
}

import { cookies } from 'next/headers';
import { AuthSession } from './types';
import { createServerSupabaseClient } from '../supabase/server';
import { isSupabaseConfigured } from '../supabase';
import { getMockProfileById, isMockAuthAllowed } from './mock-auth';
import { getRepository } from '../repository';

export const SESSION_COOKIE_NAME = 'smart_pos_session';
export const KASIR_SESSION_COOKIE_NAME = 'kasir_session';
export const CUSTOMER_SESSION_COOKIE_NAME = 'pelanggan_session';

export interface CustomerSessionPayload {
  accountId: string;
  customerId: string | null;
  role: 'CUSTOMER';
  name: string;
  whatsapp_number: string;
  createdAt: number;
}

/**
 * Resolves the authenticated customer session from request cookies.
 */
export async function getCustomerServerSession(): Promise<CustomerSessionPayload | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(CUSTOMER_SESSION_COOKIE_NAME);
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
    ) as CustomerSessionPayload;

    if (!parsed?.accountId || parsed.role !== 'CUSTOMER') {
      return null;
    }

    const repo = getRepository();
    const account = await repo.getCustomerAccountById(parsed.accountId);
    if (!account || account.status !== 'AKTIF') {
      return null;
    }

    return {
      accountId: account.id,
      customerId: account.customer_id,
      role: 'CUSTOMER',
      name: account.name,
      whatsapp_number: account.whatsapp_number,
      createdAt: parsed.createdAt || Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Resolves the authenticated user session from request cookies.
 * Handles Cashier/Owner session first, and customer session if cashier session is absent.
 */
export async function getServerSession(): Promise<AuthSession | null> {
  const cookieStore = cookies();

  // 1. Supabase Mode (Cashier/Owner)
  if (isSupabaseConfigured()) {
    const supabase = createServerSupabaseClient();
    if (supabase) {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (!userError && user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!profileError && profile && profile.is_active) {
            return {
              user: {
                id: user.id,
                email: user.email || '',
              },
              profile: {
                ...profile,
                email: user.email,
              },
            };
          }
        }
      } catch {
        // Continue to check other sessions
      }
    }
  }

  // 2. Mock Mode (Zero-Config Cashier/Owner)
  if (isMockAuthAllowed()) {
    const sessionCookie =
      cookieStore.get(SESSION_COOKIE_NAME) || cookieStore.get(KASIR_SESSION_COOKIE_NAME);

    if (sessionCookie && sessionCookie.value) {
      try {
        const parsed = JSON.parse(
          Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
        );
        if (parsed?.userId) {
          const profile = getMockProfileById(parsed.userId);
          if (profile && profile.is_active) {
            return {
              user: {
                id: profile.id,
                email: profile.email || '',
              },
              profile,
            };
          }
        }
      } catch {
        // Continue to check customer session
      }
    }
  }

  // 3. Customer Session (for identifying authenticated CUSTOMER role)
  const customerSession = await getCustomerServerSession();
  if (customerSession) {
    return {
      user: {
        id: customerSession.accountId,
        email: customerSession.whatsapp_number,
      },
      profile: {
        id: customerSession.accountId,
        role: 'CUSTOMER',
        full_name: customerSession.name,
        email: customerSession.whatsapp_number,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
  }

  return null;
}

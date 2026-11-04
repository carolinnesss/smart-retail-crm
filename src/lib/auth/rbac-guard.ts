import { IDataRepository } from '../repository/interface';
import { UserRole, ICustomerAccount } from '../types';
import { normalizeIndonesianPhone } from '../whatsapp';

export interface CustomerAuthResult {
  success: boolean;
  status: number;
  error?: string;
  account?: ICustomerAccount;
  session?: {
    accountId: string;
    customerId: string | null;
    role: 'CUSTOMER';
    name: string;
    whatsapp_number: string;
  };
}

export interface AccessCheckResult {
  isAllowed: boolean;
  statusCode: number;
  error?: string;
}

/**
 * Authenticates a customer account with anti-enumeration protection and status check.
 */
export async function authenticateCustomerAccount(
  repo: IDataRepository,
  phoneInput: string,
  passwordInput: string
): Promise<CustomerAuthResult> {
  const genericError = 'Nomor WhatsApp atau kata sandi tidak valid.';
  const normalized = normalizeIndonesianPhone(phoneInput);

  if (!normalized || !passwordInput) {
    return {
      success: false,
      status: 401,
      error: genericError,
    };
  }

  const account = await repo.getCustomerAccountByWhatsApp(normalized);

  // Anti-enumeration: if account does not exist, return generic error
  if (!account) {
    return {
      success: false,
      status: 401,
      error: genericError,
    };
  }

  // If status is PENDING, explicitly notify user
  if (account.status === 'PENDING') {
    return {
      success: false,
      status: 403,
      error: 'Pendaftaran akun Anda sedang menunggu persetujuan kasir/pemilik toko. Silakan hubungi kasir toko.',
    };
  }

  // If status is DITOLAK, explicitly notify user and allow re-registration
  if (account.status === 'DITOLAK') {
    return {
      success: false,
      status: 403,
      error: `Pendaftaran akun Anda ditolak: ${account.rejection_reason || 'Data tidak memenuhi syarat'}. Anda dapat melakukan pendaftaran ulang.`,
    };
  }

  // Verify password (plain comparison in demo mock mode)
  if (account.password_hash !== passwordInput) {
    return {
      success: false,
      status: 401,
      error: genericError, // Anti-enumeration: exact same message as non-existent user
    };
  }

  return {
    success: true,
    status: 200,
    account,
    session: {
      accountId: account.id,
      customerId: account.customer_id,
      role: 'CUSTOMER',
      name: account.name,
      whatsapp_number: account.whatsapp_number,
    },
  };
}

/**
 * Validates that a user role is permitted to call cashier endpoints.
 * Customers are strictly forbidden (403) from accessing any cashier API.
 */
export function validateCashierEndpointAccess(
  role: UserRole | string | undefined,
  endpointPath: string
): AccessCheckResult {
  if (role === 'CUSTOMER') {
    return {
      isAllowed: false,
      statusCode: 403,
      error: `Akses ditolak: Peran Pelanggan (CUSTOMER) dilarang mengakses fungsi kasir (${endpointPath}).`,
    };
  }

  return {
    isAllowed: true,
    statusCode: 200,
  };
}

/**
 * Validates that a customer can only access their own data (IDOR protection).
 */
export function validateCustomerDataAccess(
  sessionCustomerId: string | null | undefined,
  requestedCustomerId: string | null | undefined
): AccessCheckResult {
  if (!sessionCustomerId || !requestedCustomerId || sessionCustomerId !== requestedCustomerId) {
    return {
      isAllowed: false,
      statusCode: 403,
      error: 'Akses ditolak: Anda hanya memiliki izin untuk melihat dan mengelola data akun Anda sendiri.',
    };
  }

  return {
    isAllowed: true,
    statusCode: 200,
  };
}

/**
 * Validates permission for updating customer tier and credit ceiling.
 * STRICT PRD RULE: Only OWNER is allowed to modify customer_type or max_credit_limit.
 */
export function validateCustomerCreditLimitUpdatePermission(
  role: UserRole | string | undefined,
  payload: Record<string, any>
): AccessCheckResult {
  const isAttemptingCreditChange =
    payload.max_credit_limit !== undefined || payload.customer_type !== undefined;

  if (isAttemptingCreditChange && role !== 'OWNER') {
    return {
      isAllowed: false,
      statusCode: 403,
      error: 'Akses ditolak: Hanya Pemilik Toko (Owner) yang berwenang mengubah tipe pelanggan dan plafon kasbon.',
    };
  }

  return {
    isAllowed: true,
    statusCode: 200,
  };
}

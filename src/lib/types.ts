export type CustomerType = 'Warung / Grosir' | 'Eceran';

export interface ICustomer {
  id: string;
  name: string;
  phone: string;
  address: string;
  customer_type: CustomerType;
  max_credit_limit: number;
  current_debt: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SembakoCategory =
  | 'Beras'
  | 'Minyak Goreng'
  | 'Gula Pasir'
  | 'Telur Ayam'
  | 'Tepung Terigu'
  | 'Mie Instan'
  | 'Bumbu Dapur'
  | 'Susu & Minuman'
  | string;

export interface IProduct {
  id: string;
  sku: string;
  name: string;
  category: SembakoCategory;
  unit: string;
  retail_price: number;
  wholesale_price: number;
  stock_quantity: number; // Decimal precision (NUMERIC(12, 3))
  min_stock_alert: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ITransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  product_name?: string;
  quantity: number; // Decimal precision
  unit_price: number;
  price_type: 'retail' | 'wholesale';
  subtotal: number;
  created_at?: string;
}

export type PaymentMethod = 'TUNAI' | 'KASBON';
export type TransactionStatus = 'completed' | 'cancelled' | 'refunded';

export interface ITransaction {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  customer_name?: string;
  cashier_id?: string | null;
  cashier_name?: string;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_method: PaymentMethod;
  cash_amount: number;
  cash_tendered?: number;
  change_amount?: number;
  debt_amount: number;
  due_date?: string | null;
  status: TransactionStatus;
  notes?: string;
  items?: ITransactionItem[];
  created_at: string;
  updated_at?: string;
}

export type DebtEntryType = 'charge' | 'payment';

export interface IDebtLedger {
  id: string;
  customer_id: string;
  cashier_id?: string | null;
  entry_type: DebtEntryType;
  amount: number;
  debt_before: number;
  debt_after: number;
  reference_id?: string | null;
  due_date?: string | null;
  notes?: string;
  created_at: string;
}

// Backwards-compatibility alias for payment records
export interface IDebtPayment {
  id: string;
  customer_id: string;
  transaction_id?: string | null;
  payment_amount: number;
  payment_date: string;
  notes?: string;
  created_at: string;
}

export interface IStoreSettings {
  id: string;
  store_name: string;
  owner_name: string;
  phone: string;
  address: string;
  header_note?: string;
  footer_note?: string;
  low_stock_threshold_default: number;
  created_at?: string;
  updated_at?: string;
}

export type RestockUrgencyStatus = 'NORMAL' | 'SOON' | 'URGENT' | 'CRITICAL';

export interface IRestockPrediction {
  customer_id: string;
  customer_name: string;
  phone: string;
  commodity: string;
  category: string;
  last_purchased_date: string;
  last_quantity: number;
  unit: string;
  purchase_count: number;
  avg_interval_days: number;
  days_since_last: number;
  ratio: number;
  days_remaining: number;
  status: RestockUrgencyStatus;
  status_label: string;
  recommended_action: string;
  suggested_quantity: number;
  suggested_price_type: 'retail' | 'wholesale';
  estimated_price: number;
  wa_link: string;
}

export interface IFinancialKPIs {
  today_sales: number;
  month_sales: number;
  total_active_debt: number;
  active_debtors_count: number;
  total_customers: number;
  total_low_stock_items: number;
  net_cash_flow?: number;
}

export interface CreateTransactionItemInput {
  product_id: string;
  quantity: number;
  unit_price: number;
  price_type: 'retail' | 'wholesale';
}

export interface CreateTransactionInput {
  customer_id: string | null;
  cashier_id?: string | null;
  items: CreateTransactionItemInput[];
  discount_amount?: number;
  payment_method: PaymentMethod;
  cash_amount?: number;
  cash_tendered?: number;
  change_amount?: number;
  debt_amount?: number;
  due_date?: string | null;
  notes?: string;
}

export interface CreateDebtPaymentInput {
  customer_id: string;
  cashier_id?: string | null;
  payment_amount: number;
  transaction_id?: string | null;
  notes?: string;
}

export type UserRole = 'OWNER' | 'CASHIER' | 'CUSTOMER';

export type CustomerAccountStatus = 'PENDING' | 'AKTIF' | 'DITOLAK';

export interface ICustomerAccount {
  id: string;
  customer_id: string | null;
  name: string;
  whatsapp_number: string;
  password_hash: string;
  status: CustomerAccountStatus;
  rejection_reason?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegisterCustomerAccountInput {
  name: string;
  whatsapp_number: string;
  password: string;
}

export interface ApproveCustomerAccountInput {
  account_id: string;
  approved_by: string;
  choice: 'LINK_EXISTING' | 'CREATE_NEW';
  existing_customer_id?: string;
}

export interface RejectCustomerAccountInput {
  account_id: string;
  rejected_by: string;
  rejection_reason: string;
}

export interface IUserProfile {
  id: string;
  email?: string;
  whatsapp_number?: string;
  customer_id?: string | null;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IAuditLog {
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

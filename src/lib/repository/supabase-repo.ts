import { SupabaseClient } from '@supabase/supabase-js';
import {
  IDataRepository,
  CustomerFilter,
  ProductFilter,
  TransactionFilter,
} from './interface';
import {
  ICustomer,
  IProduct,
  ITransaction,
  ITransactionItem,
  IDebtLedger,
  IDebtPayment,
  IStoreSettings,
  IRestockPrediction,
  IFinancialKPIs,
  CreateTransactionInput,
  CreateDebtPaymentInput,
  ICustomerAccount,
  CustomerAccountStatus,
  RegisterCustomerAccountInput,
  ApproveCustomerAccountInput,
  RejectCustomerAccountInput,
} from '../types';
import { getSupabaseClient } from '../supabase';
import { calculateRestockPredictions } from '../ewma-radar';
import { roundQuantity } from '../pricing';
import { normalizeIndonesianPhone } from '../whatsapp';

export class SupabaseDataRepository implements IDataRepository {
  private client: SupabaseClient;

  constructor() {
    const c = getSupabaseClient();
    if (!c) {
      throw new Error(
        'Supabase client is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
      );
    }
    this.client = c;
  }

  // --- Store Settings ---
  public async getStoreSettings(): Promise<IStoreSettings> {
    const { data, error } = await this.client
      .from('store_settings')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error(`Failed to fetch store settings: ${error?.message || 'Not found'}`);
    }
    return data as IStoreSettings;
  }

  public async updateStoreSettings(
    settings: Partial<IStoreSettings>
  ): Promise<IStoreSettings> {
    const current = await this.getStoreSettings();
    const { data, error } = await this.client
      .from('store_settings')
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq('id', current.id)
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(`Failed to update store settings: ${error?.message}`);
    }
    return data as IStoreSettings;
  }

  // --- Customers ---
  public async getCustomers(filter?: CustomerFilter): Promise<ICustomer[]> {
    let query = this.client
      .from('customers')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (filter?.search) {
      const q = filter.search.trim();
      query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,address.ilike.%${q}%`);
    }

    if (filter?.type) {
      query = query.eq('customer_type', filter.type);
    }

    if (filter?.hasDebt !== undefined) {
      if (filter.hasDebt) {
        query = query.gt('current_debt', 0);
      } else {
        query = query.eq('current_debt', 0);
      }
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch customers: ${error.message}`);
    }
    return (data || []) as ICustomer[];
  }

  public async getCustomerById(id: string): Promise<ICustomer | null> {
    const { data, error } = await this.client
      .from('customers')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch customer: ${error.message}`);
    }
    return data ? (data as ICustomer) : null;
  }

  public async createCustomer(
    data: Omit<ICustomer, 'id' | 'current_debt' | 'created_at' | 'updated_at'>
  ): Promise<ICustomer> {
    const now = new Date().toISOString();
    const { data: inserted, error } = await this.client
      .from('customers')
      .insert({
        ...data,
        current_debt: 0,
        created_at: now,
        updated_at: now,
      })
      .select('*')
      .single();

    if (error || !inserted) {
      throw new Error(`Failed to create customer: ${error?.message}`);
    }
    return inserted as ICustomer;
  }

  public async updateCustomer(
    id: string,
    data: Partial<ICustomer>
  ): Promise<ICustomer> {
    const { data: updated, error } = await this.client
      .from('customers')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update customer ${id}: ${error?.message}`);
    }
    return updated as ICustomer;
  }

  // --- Products ---
  public async getProducts(filter?: ProductFilter): Promise<IProduct[]> {
    let query = this.client
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (filter?.search) {
      const q = filter.search.trim();
      query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%,category.ilike.%${q}%`);
    }

    if (filter?.category) {
      query = query.eq('category', filter.category);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`);
    }

    let products = (data || []) as IProduct[];
    if (filter?.lowStock) {
      products = products.filter((p) => p.stock_quantity <= p.min_stock_alert);
    }

    return products;
  }

  public async getProductById(id: string): Promise<IProduct | null> {
    const { data, error } = await this.client
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch product: ${error.message}`);
    }
    return data ? (data as IProduct) : null;
  }

  public async createProduct(
    data: Omit<IProduct, 'id' | 'created_at' | 'updated_at'>
  ): Promise<IProduct> {
    if (data.wholesale_price > data.retail_price) {
      throw new Error('Harga grosir tidak boleh lebih besar dari harga eceran.');
    }

    const { data: inserted, error } = await this.client
      .from('products')
      .insert({
        ...data,
        stock_quantity: roundQuantity(data.stock_quantity),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error || !inserted) {
      throw new Error(`Failed to create product: ${error?.message}`);
    }
    return inserted as IProduct;
  }

  public async updateProduct(
    id: string,
    data: Partial<IProduct>
  ): Promise<IProduct> {
    const payload = {
      ...data,
      stock_quantity:
        data.stock_quantity !== undefined
          ? roundQuantity(data.stock_quantity)
          : undefined,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await this.client
      .from('products')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update product ${id}: ${error?.message}`);
    }
    return updated as IProduct;
  }

  // --- Transactions & POS (ATOMIC RPC execute_checkout) ---
  public async createTransaction(data: CreateTransactionInput): Promise<ITransaction> {
    const itemsPayload = data.items.map((it) => ({
      product_id: it.product_id,
      quantity: roundQuantity(it.quantity),
      unit_price: it.unit_price,
      price_type: it.price_type,
    }));

    // Call atomic stored procedure
    const { data: rpcResult, error: rpcError } = await this.client.rpc(
      'execute_checkout',
      {
        p_customer_id: data.customer_id || null,
        p_items: itemsPayload,
        p_discount_amount: data.discount_amount || 0,
        p_payment_method: data.payment_method,
        p_cash_amount: data.cash_amount || 0,
        p_debt_amount: data.debt_amount || 0,
        p_notes: data.notes || null,
      }
    );

    if (rpcError) {
      throw new Error(rpcError.message);
    }

    // Fetch full transaction with items
    const txId = (rpcResult as any)?.id;
    if (txId) {
      const fullTx = await this.getTransactionById(txId);
      if (fullTx) return fullTx;
    }

    return rpcResult as ITransaction;
  }

  public async getTransactions(filter?: TransactionFilter): Promise<ITransaction[]> {
    let query = this.client
      .from('transactions')
      .select('*, customers(name), transaction_items(*)')
      .order('created_at', { ascending: false });

    if (filter?.customer_id) {
      query = query.eq('customer_id', filter.customer_id);
    }

    if (filter?.limit) {
      query = query.limit(filter.limit);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch transactions: ${error.message}`);
    }

    return (data || []).map((t: any) => ({
      ...t,
      customer_name: t.customers?.name || t.customer_name || 'Pelanggan Umum (Walk-in)',
      items: t.transaction_items || [],
    })) as ITransaction[];
  }

  public async getTransactionById(id: string): Promise<ITransaction | null> {
    const { data, error } = await this.client
      .from('transactions')
      .select('*, customers(name), transaction_items(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch transaction ${id}: ${error.message}`);
    }
    if (!data) return null;

    return {
      ...data,
      customer_name: (data as any).customers?.name || data.customer_name || 'Pelanggan Umum (Walk-in)',
      items: (data as any).transaction_items || [],
    } as ITransaction;
  }

  // --- Debt & Kasbon Installments ---
  public async createDebtPayment(
    data: CreateDebtPaymentInput
  ): Promise<IDebtLedger> {
    const { data: result, error } = await this.client.rpc(
      'record_debt_payment',
      {
        p_customer_id: data.customer_id,
        p_payment_amount: data.payment_amount,
        p_transaction_id: data.transaction_id || null,
        p_notes: data.notes || null,
      }
    );

    if (error) {
      throw new Error(error.message);
    }

    return result as IDebtLedger;
  }

  public async getDebtPayments(customer_id?: string): Promise<IDebtPayment[]> {
    let query = this.client
      .from('debt_payments')
      .select('*')
      .order('payment_date', { ascending: false });

    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch debt payments: ${error.message}`);
    }
    return (data || []) as IDebtPayment[];
  }

  public async getDebtLedger(customer_id?: string): Promise<IDebtLedger[]> {
    let query = this.client
      .from('debt_ledger')
      .select('*')
      .order('created_at', { ascending: false });

    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch debt ledger: ${error.message}`);
    }
    return (data || []) as IDebtLedger[];
  }

  // --- Analytics & Restock Predictions ---
  public async getFinancialKPIs(): Promise<IFinancialKPIs> {
    const { data, error } = await this.client.rpc('get_store_financial_summary');

    if (!error && data && data.length > 0) {
      const row = data[0];
      return {
        today_sales: parseFloat(row.today_sales || '0'),
        month_sales: parseFloat(row.month_sales || '0'),
        total_active_debt: parseFloat(row.total_active_debt || '0'),
        active_debtors_count: parseInt(row.active_debtors_count || '0', 10),
        total_customers: parseInt(row.total_customers || '0', 10),
        total_low_stock_items: parseInt(row.total_low_stock_items || '0', 10),
      };
    }

    // Fallback: aggregate locally
    const [customers, products, transactions] = await Promise.all([
      this.getCustomers(),
      this.getProducts(),
      this.getTransactions({ limit: 100 }),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = new Date().toISOString().slice(0, 7);

    const todaySales = transactions
      .filter((t) => t.status === 'completed' && t.created_at.slice(0, 10) === today)
      .reduce((sum, t) => sum + t.final_amount, 0);

    const monthSales = transactions
      .filter((t) => t.status === 'completed' && t.created_at.slice(0, 7) === thisMonth)
      .reduce((sum, t) => sum + t.final_amount, 0);

    const totalActiveDebt = customers.reduce((sum, c) => sum + c.current_debt, 0);
    const activeDebtorsCount = customers.filter((c) => c.current_debt > 0).length;
    const totalLowStock = products.filter((p) => p.stock_quantity <= p.min_stock_alert).length;

    return {
      today_sales: todaySales,
      month_sales: monthSales,
      total_active_debt: totalActiveDebt,
      active_debtors_count: activeDebtorsCount,
      total_customers: customers.length,
      total_low_stock_items: totalLowStock,
    };
  }

  public async getRestockPredictions(alpha?: number): Promise<IRestockPrediction[]> {
    const [customers, products, transactions, settings] = await Promise.all([
      this.getCustomers(),
      this.getProducts(),
      this.getTransactions({ limit: 200 }),
      this.getStoreSettings(),
    ]);

    return calculateRestockPredictions(customers, products, transactions, {
      alpha: alpha ?? 0.3,
      storeName: settings.store_name,
      now: new Date(),
    });
  }

  // --- Customer Accounts & Approval Queue ---
  public async getCustomerAccountByWhatsApp(phone: string): Promise<ICustomerAccount | null> {
    const normalized = normalizeIndonesianPhone(phone);
    if (!normalized) return null;
    const { data, error } = await this.client
      .from('customer_accounts')
      .select('*')
      .eq('whatsapp_number', normalized)
      .maybeSingle();
    if (error || !data) return null;
    return data as ICustomerAccount;
  }

  public async getCustomerAccountById(id: string): Promise<ICustomerAccount | null> {
    const { data, error } = await this.client
      .from('customer_accounts')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return data as ICustomerAccount;
  }

  public async getCustomerAccounts(status?: CustomerAccountStatus): Promise<ICustomerAccount[]> {
    let query = this.client.from('customer_accounts').select('*').order('created_at', { ascending: false });
    if (status) {
      query = query.eq('status', status);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return data as ICustomerAccount[];
  }

  public async registerCustomerAccount(
    input: RegisterCustomerAccountInput
  ): Promise<ICustomerAccount> {
    const normalized = normalizeIndonesianPhone(input.whatsapp_number);
    if (!normalized) {
      throw new Error('Nomor WhatsApp tidak valid. Gunakan format nomor telepon Indonesia.');
    }

    if (!input.name || !input.name.trim()) {
      throw new Error('Nama lengkap wajib diisi.');
    }

    if (!input.password || input.password.length < 6) {
      throw new Error('Kata sandi minimal 6 karakter.');
    }

    const existing = await this.getCustomerAccountByWhatsApp(normalized);
    if (existing) {
      if (existing.status === 'DITOLAK') {
        const { data, error } = await this.client
          .from('customer_accounts')
          .update({
            name: input.name.trim(),
            password_hash: input.password,
            status: 'PENDING',
            rejection_reason: null,
            rejected_by: null,
            rejected_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();
        if (error || !data) throw new Error(error?.message || 'Gagal mendaftar ulang.');
        return data as ICustomerAccount;
      }
      throw new Error('Nomor WhatsApp sudah terdaftar.');
    }

    const { data, error } = await this.client
      .from('customer_accounts')
      .insert({
        name: input.name.trim(),
        whatsapp_number: normalized,
        password_hash: input.password,
        status: 'PENDING',
        rejection_reason: null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Gagal mendaftarkan akun pelanggan.');
    }
    return data as ICustomerAccount;
  }

  public async approveCustomerAccount(
    input: ApproveCustomerAccountInput
  ): Promise<{ account: ICustomerAccount; customer: ICustomer }> {
    const account = await this.getCustomerAccountById(input.account_id);
    if (!account) throw new Error('Akun pendaftaran tidak ditemukan.');
    if (account.status !== 'PENDING') {
      throw new Error(`Akun sudah diproses dengan status: ${account.status}`);
    }

    let customer: ICustomer;

    if (input.choice === 'LINK_EXISTING') {
      if (!input.existing_customer_id) {
        throw new Error('ID pelanggan lama wajib dipilih.');
      }
      const existing = await this.getCustomerById(input.existing_customer_id);
      if (!existing) throw new Error('Pelanggan lama tidak ditemukan.');
      customer = existing;
    } else {
      // Create new customer: Eceran with credit limit 0
      customer = await this.createCustomer({
        name: account.name,
        phone: account.whatsapp_number,
        address: '-',
        customer_type: 'Eceran',
        max_credit_limit: 0,
        is_active: true,
      });
    }

    const { data: updatedAccount, error } = await this.client
      .from('customer_accounts')
      .update({
        customer_id: customer.id,
        status: 'AKTIF',
        approved_by: input.approved_by,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id)
      .select()
      .single();

    if (error || !updatedAccount) {
      throw new Error(error?.message || 'Gagal menyetujui akun pelanggan.');
    }

    return { account: updatedAccount as ICustomerAccount, customer };
  }

  public async rejectCustomerAccount(
    input: RejectCustomerAccountInput
  ): Promise<ICustomerAccount> {
    const account = await this.getCustomerAccountById(input.account_id);
    if (!account) throw new Error('Akun pendaftaran tidak ditemukan.');
    if (account.status !== 'PENDING') {
      throw new Error(`Akun sudah diproses dengan status: ${account.status}`);
    }

    if (!input.rejection_reason || !input.rejection_reason.trim()) {
      throw new Error('Alasan penolakan wajib diisi.');
    }

    const { data: updatedAccount, error } = await this.client
      .from('customer_accounts')
      .update({
        status: 'DITOLAK',
        rejection_reason: input.rejection_reason.trim(),
        rejected_by: input.rejected_by,
        rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', account.id)
      .select()
      .single();

    if (error || !updatedAccount) {
      throw new Error(error?.message || 'Gagal menolak akun pelanggan.');
    }

    return updatedAccount as ICustomerAccount;
  }
}

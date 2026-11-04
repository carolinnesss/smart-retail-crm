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
import {
  INITIAL_CUSTOMERS,
  INITIAL_PRODUCTS,
  INITIAL_TRANSACTIONS,
  INITIAL_DEBT_LEDGER,
  INITIAL_STORE_SETTINGS,
  INITIAL_CUSTOMER_ACCOUNTS,
} from '../mock-data';
import { calculateRestockPredictions } from '../ewma-radar';
import { formatIDR } from '../formatters';
import { checkCreditLimit, processDebtInstallment } from '../credit-guard';
import { validateGuestCheckoutRules } from '../guest-rules';
import { roundQuantity } from '../pricing';
import { normalizeIndonesianPhone } from '../whatsapp';

const globalRepo = globalThis as unknown as { __mockRepoInstance?: MockDataRepository };

export class MockDataRepository implements IDataRepository {
  private static instance: MockDataRepository | null = null;

  private settings: IStoreSettings;
  private customers: ICustomer[];
  private products: IProduct[];
  private transactions: ITransaction[];
  private debtLedger: IDebtLedger[];
  private customerAccounts: ICustomerAccount[] = [];

  private constructor() {
    this.settings = JSON.parse(JSON.stringify(INITIAL_STORE_SETTINGS));
    this.customers = JSON.parse(JSON.stringify(INITIAL_CUSTOMERS));
    this.products = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
    this.transactions = JSON.parse(JSON.stringify(INITIAL_TRANSACTIONS));
    this.debtLedger = JSON.parse(JSON.stringify(INITIAL_DEBT_LEDGER));
    this.customerAccounts = JSON.parse(JSON.stringify(INITIAL_CUSTOMER_ACCOUNTS));
  }

  public static getInstance(): MockDataRepository {
    if (!globalRepo.__mockRepoInstance) {
      globalRepo.__mockRepoInstance = new MockDataRepository();
    }
    MockDataRepository.instance = globalRepo.__mockRepoInstance;
    return globalRepo.__mockRepoInstance;
  }

  public async resetMockData(): Promise<void> {
    this.settings = JSON.parse(JSON.stringify(INITIAL_STORE_SETTINGS));
    this.customers = JSON.parse(JSON.stringify(INITIAL_CUSTOMERS));
    this.products = JSON.parse(JSON.stringify(INITIAL_PRODUCTS));
    this.transactions = JSON.parse(JSON.stringify(INITIAL_TRANSACTIONS));
    this.debtLedger = JSON.parse(JSON.stringify(INITIAL_DEBT_LEDGER));
    this.customerAccounts = JSON.parse(JSON.stringify(INITIAL_CUSTOMER_ACCOUNTS));
  }

  // --- Store Settings ---
  public async getStoreSettings(): Promise<IStoreSettings> {
    return { ...this.settings };
  }

  public async updateStoreSettings(
    newSettings: Partial<IStoreSettings>
  ): Promise<IStoreSettings> {
    this.settings = {
      ...this.settings,
      ...newSettings,
      updated_at: new Date().toISOString(),
    };
    return { ...this.settings };
  }

  // --- Customers ---
  public async getCustomers(filter?: CustomerFilter): Promise<ICustomer[]> {
    let result = [...this.customers].filter((c) => c.is_active);

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q)
      );
    }

    if (filter?.type) {
      result = result.filter(
        (c) => c.customer_type.toLowerCase() === filter.type?.toLowerCase()
      );
    }

    if (filter?.hasDebt !== undefined) {
      if (filter.hasDebt) {
        result = result.filter((c) => c.current_debt > 0);
      } else {
        result = result.filter((c) => c.current_debt === 0);
      }
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  public async getCustomerById(id: string): Promise<ICustomer | null> {
    const cust = this.customers.find((c) => c.id === id);
    return cust ? { ...cust } : null;
  }

  public async createCustomer(
    data: Omit<ICustomer, 'id' | 'current_debt' | 'created_at' | 'updated_at'>
  ): Promise<ICustomer> {
    const now = new Date().toISOString();
    const newCust: ICustomer = {
      ...data,
      id: `10000000-0000-0000-0000-${String(this.customers.length + 1).padStart(12, '0')}`,
      current_debt: 0,
      created_at: now,
      updated_at: now,
    };
    this.customers.push(newCust);
    return { ...newCust };
  }

  public async updateCustomer(
    id: string,
    data: Partial<ICustomer>
  ): Promise<ICustomer> {
    const idx = this.customers.findIndex((c) => c.id === id);
    if (idx === -1) {
      throw new Error(`Pelanggan dengan ID ${id} tidak ditemukan.`);
    }

    const current = this.customers[idx];
    const updated: ICustomer = {
      ...current,
      ...data,
      updated_at: new Date().toISOString(),
    };

    if (updated.max_credit_limit < 0) {
      throw new Error('Limit kredit tidak boleh bernilai negatif.');
    }
    if (updated.current_debt < 0) {
      throw new Error('Total utang kasbon tidak boleh bernilai negatif.');
    }
    if (updated.current_debt > updated.max_credit_limit) {
      throw new Error('Utang berjalan tidak boleh melebihi batas limit kredit pelanggan.');
    }

    this.customers[idx] = updated;
    return { ...updated };
  }

  // --- Products ---
  public async getProducts(filter?: ProductFilter): Promise<IProduct[]> {
    let result = [...this.products].filter((p) => p.is_active);

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    if (filter?.category) {
      result = result.filter(
        (p) => p.category.toLowerCase() === filter.category?.toLowerCase()
      );
    }

    if (filter?.lowStock) {
      result = result.filter((p) => p.stock_quantity <= p.min_stock_alert);
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  public async getProductById(id: string): Promise<IProduct | null> {
    const prod = this.products.find((p) => p.id === id);
    return prod ? { ...prod } : null;
  }

  public async createProduct(
    data: Omit<IProduct, 'id' | 'created_at' | 'updated_at'>
  ): Promise<IProduct> {
    if (data.wholesale_price > data.retail_price) {
      throw new Error('Harga grosir tidak boleh lebih besar dari harga eceran.');
    }
    if (data.stock_quantity < 0) {
      throw new Error('Stok barang tidak boleh bernilai negatif.');
    }

    const now = new Date().toISOString();
    const newProd: IProduct = {
      ...data,
      stock_quantity: roundQuantity(data.stock_quantity),
      id: `20000000-0000-0000-0000-${String(this.products.length + 1).padStart(12, '0')}`,
      created_at: now,
      updated_at: now,
    };
    this.products.unshift(newProd);
    return { ...newProd };
  }

  public async updateProduct(
    id: string,
    data: Partial<IProduct>
  ): Promise<IProduct> {
    const idx = this.products.findIndex((p) => p.id === id);
    if (idx === -1) {
      throw new Error(`Produk dengan ID ${id} tidak ditemukan.`);
    }

    const current = this.products[idx];
    const updated: IProduct = {
      ...current,
      ...data,
      stock_quantity:
        data.stock_quantity !== undefined
          ? roundQuantity(data.stock_quantity)
          : current.stock_quantity,
      updated_at: new Date().toISOString(),
    };

    if (updated.wholesale_price > updated.retail_price) {
      throw new Error('Harga grosir tidak boleh lebih besar dari harga eceran.');
    }
    if (updated.stock_quantity < 0) {
      throw new Error('Stok barang tidak boleh bernilai negatif.');
    }

    this.products[idx] = updated;
    return { ...updated };
  }

  // --- Transactions & POS Checkout (ATOMIC TRANSACTION WITH ROLLBACK) ---
  public async createTransaction(data: CreateTransactionInput): Promise<ITransaction> {
    if (!data.items || data.items.length === 0) {
      throw new Error('Keranjang belanja tidak boleh kosong.');
    }

    const now = new Date().toISOString();
    const txId = `30000000-0000-0000-0000-${String(Date.now()).slice(-12)}`;

    // Snapshot state for atomic rollback guarantee
    const customersBackup = JSON.stringify(this.customers);
    const productsBackup = JSON.stringify(this.products);
    const transactionsBackup = JSON.stringify(this.transactions);
    const debtLedgerBackup = JSON.stringify(this.debtLedger);

    try {
      // 1. Walk-in guest checkout validation
      const guestCheck = validateGuestCheckoutRules(
        data.customer_id,
        data.payment_method,
        data.debt_amount || 0
      );
      if (!guestCheck.isValid) {
        throw new Error(guestCheck.errorMessage);
      }

      // 2. Validate items, calculate gross subtotal, and check stock availability
      let calculatedTotal = 0;
      const validatedItems: ITransactionItem[] = [];
      const productQtyMap = new Map<string, number>();

      for (const it of data.items) {
        const roundedQty = roundQuantity(it.quantity);
        productQtyMap.set(
          it.product_id,
          roundQuantity((productQtyMap.get(it.product_id) || 0) + roundedQty)
        );
      }

      for (let i = 0; i < data.items.length; i++) {
        const it = data.items[i];
        const prod = this.products.find((p) => p.id === it.product_id);
        if (!prod) {
          throw new Error(`Produk dengan ID ${it.product_id} tidak ditemukan.`);
        }
        if (it.quantity <= 0) {
          throw new Error(`Kuantitas item untuk "${prod.name}" harus lebih besar dari 0.`);
        }

        const totalRequested = productQtyMap.get(it.product_id) || it.quantity;
        if (prod.stock_quantity < totalRequested) {
          throw new Error(
            `Stok produk "${prod.name}" tidak mencukupi (Tersedia: ${prod.stock_quantity} ${prod.unit}, Diminta: ${totalRequested} ${prod.unit}).`
          );
        }

        const subtotal = Number((roundQuantity(it.quantity) * it.unit_price).toFixed(2));
        calculatedTotal += subtotal;

        validatedItems.push({
          id: `40000000-0000-0000-0000-${String(Date.now() + i).slice(-12)}`,
          transaction_id: txId,
          product_id: prod.id,
          product_name: prod.name,
          quantity: roundQuantity(it.quantity),
          unit_price: it.unit_price,
          price_type: it.price_type,
          subtotal,
          created_at: now,
        });
      }

      calculatedTotal = Number(calculatedTotal.toFixed(2));

      // 3. Discount Clamping
      const rawDiscount = Math.max(0, data.discount_amount || 0);
      const discountAmount = Math.min(calculatedTotal, rawDiscount);
      const finalAmount = Math.max(0, Number((calculatedTotal - discountAmount).toFixed(2)));

      // 4. Payment Method Validation & Handling
      let cashAmount = 0;
      let debtAmount = 0;
      let cashTendered = data.cash_tendered;
      let changeAmount = 0;
      let dueDate: string | null = null;
      let customer: ICustomer | null = null;

      if (data.customer_id) {
        customer = this.customers.find((c) => c.id === data.customer_id) || null;
        if (!customer) {
          throw new Error(`Pelanggan dengan ID ${data.customer_id} tidak ditemukan.`);
        }
      }

      if (data.payment_method === 'TUNAI') {
        cashAmount = finalAmount;
        if (cashTendered !== undefined) {
          if (cashTendered < finalAmount) {
            throw new Error(
              `Uang tunai yang diterima (${formatIDR(cashTendered)}) kurang dari total tagihan (${formatIDR(finalAmount)}).`
            );
          }
          changeAmount = Number((cashTendered - finalAmount).toFixed(2));
        } else {
          cashTendered = finalAmount;
          changeAmount = 0;
        }
      } else if (data.payment_method === 'KASBON') {
        if (!customer) {
          throw new Error('Pembeli umum (walk-in) dilarang menggunakan kasbon. Wajib memilih pelanggan terdaftar.');
        }
        debtAmount = finalAmount;

        // Kasbon Guard: tolak jika total + sisa utang berjalan melebihi plafon
        const creditCheck = checkCreditLimit(
          customer.name,
          customer.current_debt,
          customer.max_credit_limit,
          debtAmount
        );
        if (!creditCheck.isAllowed) {
          throw new Error(creditCheck.errorMessage);
        }

        // Tanggal jatuh tempo wajib diisi (default 14 hari)
        if (data.due_date && data.due_date.trim() !== '') {
          dueDate = data.due_date;
        } else {
          dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
        }
      } else {
        throw new Error(`Metode pembayaran tidak valid: ${data.payment_method}`);
      }

      // 5. Deduct product stock (atomic for both methods)
      for (const it of data.items) {
        const prod = this.products.find((p) => p.id === it.product_id)!;
        prod.stock_quantity = roundQuantity(prod.stock_quantity - it.quantity);
        prod.updated_at = now;
      }

      // 6. Generate Invoice Number
      const dateStr = now.slice(0, 10).replace(/-/g, '');
      const seq = String(this.transactions.length + 1).padStart(4, '0');
      const invoiceNumber = `INV-${dateStr}-${seq}`;

      // 7. Update Customer Balances and Debt Ledger for KASBON
      if (customer && debtAmount > 0) {
        const debtBefore = customer.current_debt;
        customer.current_debt = Number((customer.current_debt + debtAmount).toFixed(2));

        const debtEntry: IDebtLedger = {
          id: `70000000-0000-0000-0000-${String(Date.now()).slice(-12)}`,
          customer_id: customer.id,
          cashier_id: data.cashier_id || null,
          entry_type: 'charge',
          amount: debtAmount,
          debt_before: debtBefore,
          debt_after: customer.current_debt,
          reference_id: txId,
          due_date: dueDate,
          notes: `Kasbon transaksi kasir No. ${invoiceNumber}`,
          created_at: now,
        };
        this.debtLedger.unshift(debtEntry);
        customer.updated_at = now;
      }

      // 8. Create Transaction Record
      const newTx: ITransaction = {
        id: txId,
        invoice_number: invoiceNumber,
        customer_id: customer ? customer.id : null,
        customer_name: customer ? customer.name : 'Pelanggan Umum (Walk-in)',
        cashier_id: data.cashier_id || null,
        cashier_name: data.cashier_id ? 'Kasir Bertugas' : undefined,
        total_amount: calculatedTotal,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        payment_method: data.payment_method,
        cash_amount: cashAmount,
        cash_tendered: cashTendered,
        change_amount: changeAmount,
        debt_amount: debtAmount,
        due_date: dueDate,
        status: 'completed',
        notes: data.notes || '',
        items: validatedItems,
        created_at: now,
        updated_at: now,
      };

      this.transactions.unshift(newTx);
      return { ...newTx };
    } catch (err) {
      // Atomic Rollback: Restore exact previous state
      this.customers = JSON.parse(customersBackup);
      this.products = JSON.parse(productsBackup);
      this.transactions = JSON.parse(transactionsBackup);
      this.debtLedger = JSON.parse(debtLedgerBackup);
      throw err;
    }
  }

  public async getTransactions(filter?: TransactionFilter): Promise<ITransaction[]> {
    let result = [...this.transactions];

    if (filter?.customer_id) {
      result = result.filter((t) => t.customer_id === filter.customer_id);
    }

    result.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (filter?.limit) {
      result = result.slice(0, filter.limit);
    }

    return result;
  }

  public async getTransactionById(id: string): Promise<ITransaction | null> {
    const tx = this.transactions.find((t) => t.id === id);
    return tx ? { ...tx } : null;
  }

  // --- Debt & Kasbon Installments ---
  public async createDebtPayment(
    data: CreateDebtPaymentInput
  ): Promise<IDebtLedger> {
    const cust = this.customers.find((c) => c.id === data.customer_id);
    if (!cust) {
      throw new Error(`Pelanggan dengan ID ${data.customer_id} tidak ditemukan.`);
    }

    const installmentCheck = processDebtInstallment(
      cust.name,
      cust.current_debt,
      cust.max_credit_limit,
      data.payment_amount
    );

    if (!installmentCheck.isValid) {
      throw new Error(installmentCheck.errorMessage);
    }

    const debtBefore = cust.current_debt;
    const now = new Date().toISOString();

    cust.current_debt = installmentCheck.newDebt;
    cust.updated_at = now;

    const debtEntry: IDebtLedger = {
      id: `60000000-0000-0000-0000-${String(Date.now()).slice(-12)}`,
      customer_id: cust.id,
      cashier_id: data.cashier_id || null,
      entry_type: 'payment',
      amount: data.payment_amount,
      debt_before: debtBefore,
      debt_after: cust.current_debt,
      reference_id: data.transaction_id || null,
      notes: data.notes || 'Pembayaran cicilan / pelunasan kasbon',
      created_at: now,
    };

    this.debtLedger.unshift(debtEntry);
    return { ...debtEntry };
  }

  public async getDebtPayments(customer_id?: string): Promise<IDebtPayment[]> {
    let result = this.debtLedger.filter((d) => d.entry_type === 'payment');
    if (customer_id) {
      result = result.filter((p) => p.customer_id === customer_id);
    }
    return result.map((d) => ({
      id: d.id,
      customer_id: d.customer_id,
      transaction_id: d.reference_id || null,
      payment_amount: d.amount,
      payment_date: d.created_at,
      notes: d.notes,
      created_at: d.created_at,
    }));
  }

  public async getDebtLedger(customer_id?: string): Promise<IDebtLedger[]> {
    let result = [...this.debtLedger];
    if (customer_id) {
      result = result.filter((d) => d.customer_id === customer_id);
    }
    return result;
  }

  // --- Financial Analytics & Restock Predictions ---
  public async getFinancialKPIs(): Promise<IFinancialKPIs> {
    const today = new Date().toISOString().slice(0, 10);
    const thisMonth = new Date().toISOString().slice(0, 7);

    let todaySales = 0;
    let monthSales = 0;

    for (const t of this.transactions) {
      if (t.status !== 'completed') continue;
      const tDate = t.created_at.slice(0, 10);
      const tMonth = t.created_at.slice(0, 7);

      if (tDate === today) {
        todaySales += t.final_amount;
      }
      if (tMonth === thisMonth) {
        monthSales += t.final_amount;
      }
    }

    let totalActiveDebt = 0;
    let activeDebtorsCount = 0;

    for (const c of this.customers) {
      if (!c.is_active) continue;
      totalActiveDebt += c.current_debt;
      if (c.current_debt > 0) {
        activeDebtorsCount += 1;
      }
    }

    const totalCustomers = this.customers.filter((c) => c.is_active).length;
    const totalLowStock = this.products.filter(
      (p) => p.is_active && p.stock_quantity <= p.min_stock_alert
    ).length;

    return {
      today_sales: todaySales,
      month_sales: monthSales,
      total_active_debt: totalActiveDebt,
      active_debtors_count: activeDebtorsCount,
      total_customers: totalCustomers,
      total_low_stock_items: totalLowStock,
    };
  }

  public async getRestockPredictions(alpha?: number): Promise<IRestockPrediction[]> {
    return calculateRestockPredictions(
      this.customers,
      this.products,
      this.transactions,
      {
        alpha: alpha ?? 0.3,
        storeName: this.settings.store_name,
        now: new Date(),
      }
    );
  }

  // --- Customer Accounts & Approval Queue ---
  public async getCustomerAccountByWhatsApp(phone: string): Promise<ICustomerAccount | null> {
    const normalized = normalizeIndonesianPhone(phone);
    if (!normalized) return null;
    const account = this.customerAccounts.find((a) => a.whatsapp_number === normalized);
    return account ? { ...account } : null;
  }

  public async getCustomerAccountById(id: string): Promise<ICustomerAccount | null> {
    const account = this.customerAccounts.find((a) => a.id === id);
    return account ? { ...account } : null;
  }

  public async getCustomerAccounts(status?: CustomerAccountStatus): Promise<ICustomerAccount[]> {
    let list = [...this.customerAccounts];
    if (status) {
      list = list.filter((a) => a.status === status);
    }
    return list.map((a) => ({ ...a }));
  }

  public async registerCustomerAccount(
    data: RegisterCustomerAccountInput
  ): Promise<ICustomerAccount> {
    const normalizedPhone = normalizeIndonesianPhone(data.whatsapp_number);
    if (!normalizedPhone) {
      throw new Error('Nomor WhatsApp tidak valid. Gunakan format nomor telepon Indonesia.');
    }

    if (!data.name || !data.name.trim()) {
      throw new Error('Nama lengkap wajib diisi.');
    }

    if (!data.password || data.password.length < 6) {
      throw new Error('Kata sandi minimal 6 karakter.');
    }

    const existingIndex = this.customerAccounts.findIndex(
      (a) => a.whatsapp_number === normalizedPhone
    );

    if (existingIndex >= 0) {
      const existing = this.customerAccounts[existingIndex];
      // Jika statusnya DITOLAK, boleh mendaftar ulang
      if (existing.status === 'DITOLAK') {
        const updated: ICustomerAccount = {
          ...existing,
          name: data.name.trim(),
          password_hash: data.password, // In mock mode we store password directly
          status: 'PENDING',
          rejection_reason: null,
          rejected_by: null,
          rejected_at: null,
          updated_at: new Date().toISOString(),
        };
        this.customerAccounts[existingIndex] = updated;
        return { ...updated };
      } else {
        // Status PENDING atau AKTIF -> pendaftaran ditolak
        throw new Error('Nomor WhatsApp sudah terdaftar.');
      }
    }

    const newAccount: ICustomerAccount = {
      id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      customer_id: null,
      name: data.name.trim(),
      whatsapp_number: normalizedPhone,
      password_hash: data.password,
      status: 'PENDING',
      rejection_reason: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.customerAccounts.unshift(newAccount);
    return { ...newAccount };
  }

  public async approveCustomerAccount(
    input: ApproveCustomerAccountInput
  ): Promise<{ account: ICustomerAccount; customer: ICustomer }> {
    const accountIndex = this.customerAccounts.findIndex((a) => a.id === input.account_id);
    if (accountIndex === -1) {
      throw new Error('Akun pendaftaran tidak ditemukan.');
    }

    const account = this.customerAccounts[accountIndex];
    if (account.status !== 'PENDING') {
      throw new Error(`Akun sudah diproses sebelumnya dengan status: ${account.status}`);
    }

    let linkedCustomer: ICustomer;

    if (input.choice === 'LINK_EXISTING') {
      if (!input.existing_customer_id) {
        throw new Error('ID pelanggan lama wajib dipilih untuk menghubungkan akun.');
      }
      const existingCust = this.customers.find((c) => c.id === input.existing_customer_id);
      if (!existingCust) {
        throw new Error('Pelanggan lama yang dipilih tidak ditemukan di database.');
      }
      linkedCustomer = existingCust;
    } else {
      // Choice === 'CREATE_NEW'
      // PRD Rule: Pelanggan baru otomatis ECERAN dengan plafon kasbon 0
      const newCust: ICustomer = {
        id: `cust-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: account.name,
        phone: account.whatsapp_number,
        address: '-',
        customer_type: 'Eceran',
        max_credit_limit: 0,
        current_debt: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.customers.push(newCust);
      linkedCustomer = newCust;
    }

    const updatedAccount: ICustomerAccount = {
      ...account,
      customer_id: linkedCustomer.id,
      status: 'AKTIF',
      approved_by: input.approved_by,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.customerAccounts[accountIndex] = updatedAccount;
    return { account: { ...updatedAccount }, customer: { ...linkedCustomer } };
  }

  public async rejectCustomerAccount(
    input: RejectCustomerAccountInput
  ): Promise<ICustomerAccount> {
    const accountIndex = this.customerAccounts.findIndex((a) => a.id === input.account_id);
    if (accountIndex === -1) {
      throw new Error('Akun pendaftaran tidak ditemukan.');
    }

    const account = this.customerAccounts[accountIndex];
    if (account.status !== 'PENDING') {
      throw new Error(`Akun sudah diproses sebelumnya dengan status: ${account.status}`);
    }

    if (!input.rejection_reason || !input.rejection_reason.trim()) {
      throw new Error('Alasan penolakan wajib diisi.');
    }

    const updatedAccount: ICustomerAccount = {
      ...account,
      status: 'DITOLAK',
      rejection_reason: input.rejection_reason.trim(),
      rejected_by: input.rejected_by,
      rejected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.customerAccounts[accountIndex] = updatedAccount;
    return { ...updatedAccount };
  }
}

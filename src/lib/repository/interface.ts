import {
  ICustomer,
  IProduct,
  ITransaction,
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

export interface CustomerFilter {
  search?: string;
  type?: string;
  hasDebt?: boolean;
}

export interface ProductFilter {
  search?: string;
  category?: string;
  lowStock?: boolean;
}

export interface TransactionFilter {
  customer_id?: string;
  limit?: number;
}

export interface IDataRepository {
  // Store settings
  getStoreSettings(): Promise<IStoreSettings>;
  updateStoreSettings(settings: Partial<IStoreSettings>): Promise<IStoreSettings>;

  // Customers
  getCustomers(filter?: CustomerFilter): Promise<ICustomer[]>;
  getCustomerById(id: string): Promise<ICustomer | null>;
  createCustomer(
    data: Omit<ICustomer, 'id' | 'current_debt' | 'created_at' | 'updated_at'>
  ): Promise<ICustomer>;
  updateCustomer(id: string, data: Partial<ICustomer>): Promise<ICustomer>;

  // Products
  getProducts(filter?: ProductFilter): Promise<IProduct[]>;
  getProductById(id: string): Promise<IProduct | null>;
  createProduct(
    data: Omit<IProduct, 'id' | 'created_at' | 'updated_at'>
  ): Promise<IProduct>;
  updateProduct(id: string, data: Partial<IProduct>): Promise<IProduct>;

  // Transactions & POS
  createTransaction(data: CreateTransactionInput): Promise<ITransaction>;
  getTransactions(filter?: TransactionFilter): Promise<ITransaction[]>;
  getTransactionById(id: string): Promise<ITransaction | null>;

  // Debt & Kasbon
  createDebtPayment(data: CreateDebtPaymentInput): Promise<IDebtLedger>;
  getDebtPayments(customer_id?: string): Promise<IDebtPayment[]>;
  getDebtLedger?(customer_id?: string): Promise<IDebtLedger[]>;

  // Analytics & Restock Heuristics
  getFinancialKPIs(): Promise<IFinancialKPIs>;
  getRestockPredictions(alpha?: number): Promise<IRestockPrediction[]>;

  // Customer Accounts & Approval Queue
  getCustomerAccountByWhatsApp(phone: string): Promise<ICustomerAccount | null>;
  getCustomerAccountById(id: string): Promise<ICustomerAccount | null>;
  getCustomerAccounts(status?: CustomerAccountStatus): Promise<ICustomerAccount[]>;
  registerCustomerAccount(data: RegisterCustomerAccountInput): Promise<ICustomerAccount>;
  approveCustomerAccount(input: ApproveCustomerAccountInput): Promise<{ account: ICustomerAccount; customer: ICustomer }>;
  rejectCustomerAccount(input: RejectCustomerAccountInput): Promise<ICustomerAccount>;

  // Optional reset method for testing / demo reset
  resetMockData?(): Promise<void>;
}

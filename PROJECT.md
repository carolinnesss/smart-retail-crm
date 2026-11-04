# Project: Smart Retail CRM & POS (Warung Sembako Digitalization)

## Architecture

### System Topology & Fullstack Framework
- **Framework**: Next.js 14+ (App Router, React Server & Client Components, TypeScript).
- **Styling & UI**: Tailwind CSS, Lucide React Icons.
- **Backend**: Next.js integrated API Route Handlers (`/api/...`).
- **Database & Storage**: Dual-Mode Repository Pattern
  - **Connected Mode**: Supabase Client (PostgreSQL) executing parameterized queries, stored procedures (`get_store_financial_summary`, `get_restock_predictions`), and database triggers for strict multi-table transaction atomicity.
  - **Zero-Config Fallback Mock Engine**: In-memory and `localStorage`-backed repository (`MockDataRepository`) implementing identical interface contracts (`IDataRepository`), seeded with rich realistic Indonesian sembako catalog and sample customers. Operates immediately without remote credentials, guaranteeing flawless evaluation both locally and on Vercel deployments.
- **UI Mode Badge**: Transparent header status indicator (`🟢 Supabase Database Connected` vs `🟡 Demo Mode: Zero-Config Local State`).

### Core Subsystems & Data Flow
1. **Catalog & Pricing Subsystem**: Sembako master catalog supporting dual pricing (`wholesale_price` and `retail_price`).
2. **POS Cashier Subsystem**: High-speed touch & barcode-ready cart, reactive price recalculation on customer tier change, fractional quantity support for weighed goods.
3. **Credit (Kasbon) Guard**: Pre-commit validation preventing `current_debt + kasbon > max_credit_limit`. Debt installment repayments with ledger audit.
4. **Store Savings Wallet**: Pre-paid digital wallet for customers supporting cash deposits, cash withdrawals (guarded against negative balance), and checkout deductions.
5. **Split Payment Engine**: Multi-tender checkout decomposing payments across Cash, Savings Wallet, and Kasbon Credit with non-cash capping rules.
6. **Smart Financial Dashboard**: Real-time KPI aggregation (Gross Omzet, Total Piutang Kasbon, Total Saldo Tabungan Toko, Net Cash Drawer).
7. **Sembako Restock Heuristic Engine**: EWMA purchase frequency & unit consumption rate analyzer for 5 staple commodities (Beras, Minyak, Gula, Telur, Tepung) with urgency tiers and WhatsApp click-to-chat generator.
8. **Centralized CRM & Multi-Ledger Audit Trail**: Customer profiling, tier toggling, credit ceiling controls, and 3 distinct audit ledgers (Transactions, Savings Mutations, Debt Payments).

---

## Feature Inventory

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Database PostgreSQL DDL | Complete DDL for `store_settings`, `customers`, `products`, `transactions`, `transaction_items`, `debt_payments`, `savings_mutations` | M1 | Survey (R7) |
| 2 | DB Constraints & Indexes | CHECK constraints for positive balances/prices, wholesale <= retail, split payment sum check, and performance indexes | M1 | Survey (R7) |
| 3 | DB Triggers & Automations | Triggers for auto debt accrual, savings deduction, stock decrement, and debt repayment sync | M1 | Survey (R7) |
| 4 | Indonesian Sembako Seed Catalog | 30 authentic sembako SKU items with barcode (EAN-13), wholesale vs retail pricing, and Indonesian units | M1 | Survey (R7) |
| 5 | Sample Customer Profiles | Realistic warung and retail customer profiles with pre-set credit limits, debt, and savings balances | M1 | Survey (R7) |
| 6 | Next.js App Router Architecture | Clean Next.js 14+ directory structure, root layout, navigation sidebar, and shared components | M2 | Survey (R1) |
| 7 | Universal Domain Types & Utilities | TypeScript interfaces, IDR currency formatters, date/time helpers, phone normalizer | M2 | Survey (R1) |
| 8 | Dual-Mode Data Access Layer | `IDataRepository` interface with `SupabaseDataRepository` and `MockDataRepository` implementations | M2 | Survey (R1) |
| 9 | API Route Handlers | Full RESTful route handlers for `/api/customers`, `/api/products`, `/api/transactions`, `/api/savings`, `/api/debt`, `/api/analytics` | M2 | Survey (R1) |
| 10 | POS Cashier Layout & Product Grid | Responsive cashier interface with product catalog grid, category tabs, and barcode/text search | M3 | Survey (R2) |
| 11 | Dynamic Customer Tier Pricing | Auto-applies `wholesale_price` for 'Warung / Grosir' and `retail_price` for 'Eceran' / Walk-in | M3 | Survey (R2) |
| 12 | Reactive Cart Price Recalculation | Dynamically re-evaluates all items in cart when customer selection changes without clearing cart | M3 | Survey (R2) |
| 13 | Flexible Cart Engine | Supports decimal quantities (weighed sembako), line item discounts, cart-level discounts, and subtotal calculation | M3 | Survey (R2) |
| 14 | Kasbon Real-Time Credit Protection | Pre-checkout guard blocking transactions when `current_debt + kasbon > max_credit_limit` with descriptive deficit alert | M4 | Survey (R3) |
| 15 | Kasbon Debt Settlement & Installments | Modal and API for debt repayments reducing `current_debt` and logging to debt ledger | M4 | Survey (R3) |
| 16 | Store Savings Wallet Deposit & Withdrawal | Cash top-up and cash withdrawal with strict non-negative balance enforcement (`savings_balance >= 0`) | M4 | Survey (R4) |
| 17 | Split Payment Tender Engine | 3-way payment breakdown (Cash + Savings + Kasbon), non-cash capping rule, cash change calculation | M4 | Survey (R4) |
| 18 | Atomic Multi-Ledger Checkout Sync | Updates customer debt, savings, stock inventory, and creates mutation logs in a unified atomic dispatch | M4 | Survey (R3, R4) |
| 19 | Smart Financial KPI Cards | Dashboard cards for Total Omzet (Today/Month), Total Piutang Kasbon, Total Saldo Tabungan, and Net Cash Flow | M5 | Survey (R5) |
| 20 | Sembako Restock Heuristic Predictor | EWMA consumption rate and purchase interval analyzer predicting depletion of Beras, Minyak, Gula, Telur, Tepung | M5 | Survey (R5) |
| 21 | Proactive WhatsApp Outreach Action | Pre-formatted Click-to-Chat WhatsApp links with customer name, predicted commodity, and wholesale offer | M5 | Survey (R5) |
| 22 | Centralized CRM Directory & Profile | Customer list with search, credit health progress meter, tier toggling, and credit limit configuration | M5 | Survey (R6) |
| 23 | 3-Tab Comprehensive Audit Trail | Multi-ledger customer tabs: Tab 1 (Transactions), Tab 2 (Savings Mutations), Tab 3 (Debt & Repayments) | M5 | Survey (R6) |
| 24 | E2E Testing Suite (Tiers 1-4) | Comprehensive opaque-box test runner covering features, boundaries, pairwise combinations, and real-world scenarios | M6 | Survey & Testing Track |
| 25 | Adversarial Hardening (Tier 5) | White-box edge-case and integrity stress tests ensuring zero regressions and genuine logic implementation | M6 | Final Milestone |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Database Schema & Seed Data (R7) | `supabase/schema.sql`, `supabase/seed.sql`, constraints, triggers, RPC functions, Indonesian sembako catalog | None | DONE (`supabase/schema.sql`, `supabase/seed.sql` verified clean) |
| M2 | Fullstack Core & Data Access Layer (R1) | Next.js setup, Tailwind, Lucide, TypeScript types, `IDataRepository`, `MockDataRepository`, `SupabaseDataRepository`, Route Handlers | M1 | DONE (Fullstack core, repo & routes verified clean) |
| M3 | POS Cashier & Automatic Pricing (R2) | Cashier screen, customer selector, dynamic tier pricing switch, reactive cart recalculation, decimal quantities | M2 | DONE (POS cashier, dynamic pricing, synchronous stock checks & thermal print verified clean) |
| M4 | Kasbon Protection, Wallet & Split Payment (R3, R4) | Kasbon credit limit enforcement, debt settlement, savings deposit/withdraw, 3-way split payment modal | M3 | DONE (Kasbon credit limit enforcement, debt settlement, savings deposit/withdraw & split payment verified clean) |
| M5 | Smart Dashboard, Restock Heuristic & CRM (R5, R6) | Financial KPI summary cards, sembako restock heuristic algorithm, WhatsApp outreach, CRM profile, 3-tab audit trail | M4 | DONE (Financial KPI summary cards, sembako restock heuristic algorithm, WhatsApp outreach, CRM profile & 3-tab audit trail verified clean) |
| M6 | Final Milestone: E2E Test Suite & Hardening | Execute 100% E2E test suite (Tiers 1-4), adversarial test hardening (Tier 5), build & bundle verification (`npm run build`) | M5, TEST_READY.md | DONE (29 unit tests via /api/test-runner + 60 automated tests across adversarial_runner and pos_challenger_runner verified 100% passing) |

---

## Interface Contracts

### 1. `ICustomer`
```typescript
export interface ICustomer {
  id: string;
  name: string;
  phone: string;
  address: string;
  customer_type: 'Warung / Grosir' | 'Eceran';
  max_credit_limit: number;
  current_debt: number;
  savings_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### 2. `IProduct`
```typescript
export interface IProduct {
  id: string;
  sku: string;
  name: string;
  category: 'Beras' | 'Minyak Goreng' | 'Gula Pasir' | 'Telur Ayam' | 'Tepung Terigu' | 'Mie Instan' | 'Bumbu Dapur' | 'Susu & Minuman' | string;
  unit: string;
  retail_price: number;
  wholesale_price: number;
  stock_quantity: number;
  min_stock_alert: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### 3. `ITransaction` & `ITransactionItem`
```typescript
export interface ITransactionItem {
  id: string;
  transaction_id: string;
  product_id: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  price_type: 'retail' | 'wholesale';
  subtotal: number;
}

export interface ITransaction {
  id: string;
  invoice_number: string;
  customer_id: string | null;
  customer_name?: string;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  payment_method: 'cash' | 'savings' | 'debt' | 'split';
  cash_amount: number;
  savings_amount: number;
  debt_amount: number;
  status: 'completed' | 'cancelled' | 'refunded';
  notes?: string;
  items?: ITransactionItem[];
  created_at: string;
}
```

### 4. `ISavingsMutation` & `IDebtPayment`
```typescript
export interface ISavingsMutation {
  id: string;
  customer_id: string;
  mutation_type: 'deposit' | 'withdrawal' | 'payment';
  amount: number;
  balance_after: number;
  reference_id?: string | null;
  notes?: string;
  created_at: string;
}

export interface IDebtPayment {
  id: string;
  customer_id: string;
  transaction_id?: string | null;
  payment_amount: number;
  payment_date: string;
  notes?: string;
  created_at: string;
}
```

### 5. `IDataRepository`
```typescript
export interface IDataRepository {
  // Store settings
  getStoreSettings(): Promise<IStoreSettings>;
  updateStoreSettings(settings: Partial<IStoreSettings>): Promise<IStoreSettings>;

  // Customers
  getCustomers(filter?: { search?: string; type?: string; hasDebt?: boolean }): Promise<ICustomer[]>;
  getCustomerById(id: string): Promise<ICustomer | null>;
  createCustomer(data: Omit<ICustomer, 'id' | 'current_debt' | 'savings_balance' | 'created_at' | 'updated_at'>): Promise<ICustomer>;
  updateCustomer(id: string, data: Partial<ICustomer>): Promise<ICustomer>;

  // Products
  getProducts(filter?: { search?: string; category?: string; lowStock?: boolean }): Promise<IProduct[]>;
  getProductById(id: string): Promise<IProduct | null>;
  createProduct(data: Omit<IProduct, 'id' | 'created_at' | 'updated_at'>): Promise<IProduct>;
  updateProduct(id: string, data: Partial<IProduct>): Promise<IProduct>;

  // Transactions & POS
  createTransaction(data: {
    customer_id: string | null;
    items: Array<{ product_id: string; quantity: number; unit_price: number; price_type: 'retail' | 'wholesale' }>;
    discount_amount?: number;
    payment_method: 'cash' | 'savings' | 'debt' | 'split';
    cash_amount: number;
    savings_amount: number;
    debt_amount: number;
    notes?: string;
  }): Promise<ITransaction>;
  getTransactions(filter?: { customer_id?: string; limit?: number }): Promise<ITransaction[]>;
  getTransactionById(id: string): Promise<ITransaction | null>;

  // Savings Wallet
  createSavingsMutation(data: { customer_id: string; mutation_type: 'deposit' | 'withdrawal'; amount: number; notes?: string }): Promise<ISavingsMutation>;
  getSavingsMutations(customer_id: string): Promise<ISavingsMutation[]>;

  // Debt & Kasbon
  createDebtPayment(data: { customer_id: string; payment_amount: number; notes?: string }): Promise<IDebtPayment>;
  getDebtPayments(customer_id: string): Promise<IDebtPayment[]>;

  // Analytics & Restock Heuristics
  getFinancialKPIs(): Promise<{
    today_sales: number;
    month_sales: number;
    total_active_debt: number;
    total_savings_deposits: number;
    active_debtors_count: number;
    total_customers: number;
    total_low_stock_items: number;
  }>;
  getRestockPredictions(): Promise<IRestockPrediction[]>;
}
```

---

## Code Layout

```
smart-retail-crm/
├── supabase/
│   ├── schema.sql              # PostgreSQL DDL, constraints, indexes, triggers (M1)
│   └── seed.sql                # Indonesian sembako catalog (30 SKU) & realistic customers (M1)
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with Sidebar and Topbar navigation
│   │   ├── page.tsx            # Dashboard (KPIs, Sembako Restock Widget) (M5)
│   │   ├── pos/
│   │   │   └── page.tsx        # POS Cashier interface (Wholesale/Retail dynamic pricing) (M3)
│   │   ├── crm/
│   │   │   ├── page.tsx        # Customer directory & quick management (M5)
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Customer profile & 3-tab audit trail (M5)
│   │   ├── inventory/
│   │   │   └── page.tsx        # Sembako stock management & catalog (M2/M3)
│   │   └── api/
│   │       ├── customers/route.ts
│   │       ├── customers/[id]/route.ts
│   │       ├── products/route.ts
│   │       ├── products/[id]/route.ts
│   │       ├── transactions/route.ts
│   │       ├── transactions/[id]/route.ts
│   │       ├── savings/route.ts
│   │       ├── debt/route.ts
│   │       └── analytics/route.ts
│   ├── components/
│   │   ├── pos/
│   │   │   ├── CustomerSelector.tsx
│   │   │   ├── ProductCatalogGrid.tsx
│   │   │   ├── CartSummary.tsx
│   │   │   └── SplitPaymentModal.tsx
│   │   ├── crm/
│   │   │   ├── CustomerTable.tsx
│   │   │   ├── CustomerProfileHeader.tsx
│   │   │   ├── TransactionHistoryTab.tsx
│   │   │   ├── SavingsLedgerTab.tsx
│   │   │   ├── DebtLedgerTab.tsx
│   │   │   ├── TopUpSavingsModal.tsx
│   │   │   ├── WithdrawSavingsModal.tsx
│   │   │   ├── PayDebtModal.tsx
│   │   │   └── EditCustomerModal.tsx
│   │   ├── dashboard/
│   │   │   ├── FinancialMetricCard.tsx
│   │   │   └── RestockAlertWidget.tsx
│   │   └── layout/
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       └── ModeBadge.tsx
│   ├── lib/
│   │   ├── types.ts            # Data contracts & interfaces
│   │   ├── formatters.ts       # IDR currency & date formatting
│   │   ├── heuristics.ts       # Sembako Restock Prediction engine
│   │   ├── mock-data.ts        # Indonesian sembako catalog & seed customers
│   │   ├── supabase.ts         # Supabase client initializer
│   │   └── repository/
│   │       ├── interface.ts    # IDataRepository contract
│   │       ├── mock-repo.ts    # In-memory / localStorage fallback engine
│   │       ├── supabase-repo.ts# PostgreSQL Supabase client implementation
│   │       └── index.ts        # getRepository() factory
│   └── tests/
│       ├── e2e/                # E2E test runner and test cases
│       └── unit/               # Domain logic unit tests
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
└── next.config.js
```

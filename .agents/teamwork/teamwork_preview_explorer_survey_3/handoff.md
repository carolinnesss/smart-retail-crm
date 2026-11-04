# Handoff Report: Fullstack Architecture, Fallback Mock State, Smart Dashboard & CRM Specification (R1, R5, R6)

**Agent ID**: `teamwork_preview_explorer_survey_3`  
**Date**: 2026-11-01T05:28:00Z  
**Target Milestone**: Survey & Scope Mapping (Phase 0)  
**Parent Task**: Requirements R1, R5, R6 Deep Technical Exploration  

---

## 1. Observation

Direct observations extracted from `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md`:

### 1.1 Requirement R1: Fullstack Architecture & Vercel-Ready Stack
> *"Aplikasi dibangun menggunakan Next.js (App Router, Tailwind CSS, Lucide Icons) dengan backend Route Handlers terintegrasi, Supabase Client (PostgreSQL), serta fallback mock state sehingga aplikasi dapat langsung dijalankan dan didemokan secara interaktif baik secara lokal maupun di Vercel."* (`ORIGINAL_REQUEST.md:14-16`)
- **Key Observation**: The application must function out-of-the-box in two distinct runtime modes:
  1. **Connected Mode**: Supabase client connects to PostgreSQL via `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  2. **Zero-Config Fallback Mock Mode**: If Supabase credentials are empty, invalid, or unreachable, the system must not crash or display empty screens. Instead, it must fall back seamlessly to an in-memory / local persistent mock state engine pre-loaded with realistic Indonesian sembako catalog data and sample warung customer profiles.

### 1.2 Requirement R5: Smart Dashboard & Prediksi Restok Otomatis
> *"Monitoring keuangan toko: Total Omzet Penjualan Harian/Bulanan, Total Piutang Kasbon di Luar, dan Total Saldo Tabungan Mengendap."*  
> *"Prediksi Restok Sembako: Algoritma heuristik yang menganalisis interval frekuensi belanja pelanggan rutin untuk komoditas sembako (beras, minyak, gula, telur, tepung) dan menampilkan sinyal peringatan 'Perlu Restok / Hubungi Pelanggan' saat mendekati estimasi siklus habis."* (`ORIGINAL_REQUEST.md:35-38`)
- **Key Observation**: The dashboard must serve as both a financial health radar and a proactive sales generation engine. The restock algorithm must specifically target 5 core essential sembako commodities (beras, minyak, gula, telur, tepung), estimating individual depletion cycles based on historical purchase frequency and package volume.

### 1.3 Requirement R6: Centralized CRM & Audit Trail Terpadu
> *"Profil pelanggan terpadu dengan rekam jejak lengkap:*  
> *- Histori pembelian barang di kasir.*  
> *- Mutasi keluar-masuk saldo tabungan (debit/kredit).*  
> *- Histori kasbon & cicilan pembayaran.*  
> *Manajemen pelanggan: tambah, ubah data, atur limit kredit, dan ubah status tier (Eceran/Grosir)."* (`ORIGINAL_REQUEST.md:39-45`)
- **Key Observation**: The CRM module is not a simple contact list. It is a unified financial and transaction ledger per customer with 3 dedicated audit trail sub-ledgers (Purchases, Tabungan mutations, and Kasbon credit/repayments) plus tier configuration (Eceran vs Warung/Grosir) and debt limit controls.

---

## 2. Logic Chain

From the direct observations above, we deduce the full architectural and mathematical model required for implementation:

### 2.1 Next.js App Router Architecture & Directory Blueprint
To ensure optimal modularity, server-side data fetching, and clean separation between UI components and domain logic, the codebase should adhere to the standard Next.js 14+ App Router structure:

```
src/
├── app/
│   ├── layout.tsx                 # Root layout with responsive navigation header & sidebar
│   ├── page.tsx                   # Smart Dashboard (Financial KPIs & Sembako Restock Widget)
│   ├── pos/
│   │   └── page.tsx               # Point of Sale cashier interface (Wholesale/Retail dynamic pricing)
│   ├── crm/
│   │   ├── page.tsx               # Customer CRM Directory (Search, filters, KPI cards, quick actions)
│   │   └── [id]/
│   │       └── page.tsx           # Detailed Customer Profile & 3-Tab Multi-Ledger Audit Trail
│   ├── products/
│   │   └── page.tsx               # Sembako Product Catalog & Stock Inventory Management
│   ├── settings/
│   │   └── page.tsx               # Store Settings, Seed Reset, and Mode Switcher (Supabase / Mock)
│   └── api/
│       ├── customers/
│       │   ├── route.ts           # GET (list/filter), POST (create customer)
│       │   └── [id]/
│       │       └── route.ts       # GET (details), PUT (update), DELETE (deactivate)
│       ├── products/
│       │   ├── route.ts           # GET (list/search), POST (create product)
│       │   └── [id]/
│       │       └── route.ts       # GET (single), PUT (update stock/price), DELETE
│       ├── transactions/
│       │   ├── route.ts           # GET (transaction history), POST (create checkout transaction)
│       │   └── [id]/
│       │       └── route.ts       # GET (transaction invoice details)
│       ├── savings/
│       │   └── route.ts           # GET (all mutations), POST (top-up / withdrawal mutation)
│       ├── debt/
│       │   └── route.ts           # GET (debt payments), POST (kasbon repayment / installment)
│       └── analytics/
│           └── route.ts           # GET (financial KPIs & heuristic restock prediction data)
├── components/
│   ├── dashboard/
│   │   ├── FinancialMetricCard.tsx
│   │   ├── RestockAlertWidget.tsx
│   │   ├── SalesTrendChart.tsx
│   │   └── QuickActionButtons.tsx
│   ├── crm/
│   │   ├── CustomerTable.tsx
│   │   ├── CustomerProfileHeader.tsx
│   │   ├── TransactionHistoryTab.tsx
│   │   ├── SavingsLedgerTab.tsx
│   │   ├── DebtLedgerTab.tsx
│   │   ├── TopUpSavingsModal.tsx
│   │   ├── WithdrawSavingsModal.tsx
│   │   ├── PayDebtModal.tsx
│   │   └── EditCustomerModal.tsx
│   ├── pos/
│   │   ├── CustomerSelector.tsx
│   │   ├── ProductCatalogGrid.tsx
│   │   ├── CartSummary.tsx
│   │   └── SplitPaymentModal.tsx
│   ├── shared/
│   │   ├── Navbar.tsx
│   │   ├── ModeBadge.tsx          # Displays "🟢 Mode Supabase" or "🟡 Mode Demo Mock"
│   │   ├── CurrencyDisplay.tsx
│   │   └── Toast.tsx
├── lib/
│   ├── types.ts                   # Universal TypeScript interfaces & enums
│   ├── formatters.ts              # IDR currency formatting, date/time helpers
│   ├── heuristics.ts              # Mathematical engine for Sembako Restock Predictions
│   ├── mock-data.ts               # Realistic Indonesian sembako catalog and sample customers
│   ├── supabase.ts                # Supabase client instantiation & connectivity verification
│   └── repository/
│       ├── interface.ts           # IDataRepository contract
│       ├── supabase-repo.ts       # Supabase PostgreSQL implementation
│       ├── mock-repo.ts           # In-memory / localStorage fallback engine
│       └── index.ts               # Factory function: getRepository()
└── supabase/
    ├── schema.sql                 # DDL migration script
    └── seed.sql                   # Realistic Indonesian sembako seed data
```

### 2.2 Dual-Mode Data Access Layer (Repository Pattern)
A critical pitfall in modern fullstack demos is dependency on remote database credentials; if credentials are missing or Vercel reviewers test the live URL without setting up a remote PostgreSQL cluster, the app crashes with 500 errors.

To solve this, we specify the **Repository Pattern**:
1. **Interface Definition (`IDataRepository`)**:
   Defines all async CRUD methods for customers, products, transactions, savings mutations, debt payments, and aggregated dashboard analytics.
2. **`MockDataRepository`**:
   - Manages state using a persistent in-memory store synchronized with `localStorage` (in client environments) and seeded with rich Indonesian sembako data.
   - Supports atomic simulated operations:
     - Transaction creation with split payment (deducting stock, incrementing debt, deducting savings).
     - Kasbon credit limit enforcement (`current_debt + kasbon_amount <= max_credit_limit`).
     - Savings balance validation (`savings_balance >= 0`).
     - Savings top-up and withdrawal mutations.
     - Kasbon installments (`current_debt = current_debt - payment_amount`).
3. **`SupabaseDataRepository`**:
   - Executes parameterized Supabase SQL queries against tables: `customers`, `products`, `transactions`, `transaction_items`, `debt_payments`, `savings_mutations`.
4. **Adaptive Repository Resolver (`getRepository()`)**:
   ```typescript
   export function isSupabaseConfigured(): boolean {
     const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
     const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
     return Boolean(url && key && !url.includes('placeholder') && url.startsWith('http'));
   }

   export function getRepository(): IDataRepository {
     if (isSupabaseConfigured()) {
       return new SupabaseDataRepository();
     }
     return MockDataRepository.getInstance();
   }
   ```
5. **UI Mode Indicator**:
   A global header badge `ModeBadge` communicates current mode to the user (`"⚡ Database Supabase Aktif"` or `"📦 Demo Offline Mock State (Zero-Config)"`), giving complete transparency and confidence during evaluation.

---

### 2.3 Mathematical Model & Heuristic Formulation for Sembako Restock Prediction (R5)

Traditional retail inventory management only monitors stock on shelves; however, traditional Indonesian warung retail is heavily relationship-driven. Store owners know that customers buy commodities in predictable cyclical intervals.

#### 2.3.1 Sembako Category Scope
The algorithm focuses on 5 core staple commodities:
1. **Beras** (Rice: 5kg, 10kg, 25kg, 50kg karung)
2. **Minyak Goreng** (Cooking Oil: 1L, 2L pouch, 5L jeriken, 1 dus)
3. **Gula Pasir** (Sugar: 1kg kemasan, 50kg karung)
4. **Telur Ayam** (Chicken Eggs: 1kg eceran, 1 rak/peti 10-15kg grosir)
5. **Tepung Terigu** (Wheat Flour: 1kg eceran, 25kg karung Segitiga Biru/Cakra)

#### 2.3.2 Individual Purchase History Analysis
For each customer $k$ and sembako commodity $c$:
Let $H_{k,c} = \{(t_1, q_1), (t_2, q_2), \dots, (t_m, q_m)\}$ be the ordered chronological series of purchases of commodity $c$, where:
- $t_i$ is the purchase timestamp in epoch milliseconds.
- $q_i$ is the quantity purchased (in base units: kg, liter, or pack).
- $t_m$ is the most recent purchase date ($T_{last}$).
- $q_m$ is the most recent quantity purchased ($Q_{last}$).

#### 2.3.3 Average Purchase Interval ($\Delta T_{avg}$)
- **Scenario A: Regular Customer ($m \ge 2$)**:
  The inter-purchase time differences are $\Delta t_i = t_i - t_{i-1}$ for $i \in [2, m]$.
  To weight recent consumer behavior more heavily, we use an Exponentially Weighted Moving Average (EWMA):
  $$\Delta t_{weighted} = \frac{\sum_{i=2}^{m} w_i \cdot \Delta t_i}{\sum_{i=2}^{m} w_i}, \quad \text{where } w_i = 1 + 0.3 \cdot (i - 2)$$
  Then the baseline daily consumption rate is:
  $$r_{daily} = \frac{\bar{q}}{\Delta t_{weighted}} \quad \text{(units per day)}$$

- **Scenario B: Sparse / New Customer ($m = 1$)**:
  When fewer than 2 purchase data points exist, the system applies **Heuristic Category Priors** based on customer tier:
  
  | Commodity ($c$) | Typical Unit | Default Warung / Grosir Cycle | Default Eceran Cycle | Default Daily Rate ($r_{prior}$) |
  |---|---|---|---|---|
  | **Beras** | 25 kg karung / 5 kg | 7 days (per 25kg karung) | 14 days (per 5kg) | 3.5 kg/day (Grosir) / 0.36 kg/day (Eceran) |
  | **Minyak** | 2 Liter / 1 Dus (12x1L) | 5 days (per dus) | 10 days (per 2L pouch) | 2.4 L/day (Grosir) / 0.20 L/day (Eceran) |
  | **Gula** | 1 kg / 50 kg karung | 10 days (per 50kg) | 14 days (per 1kg) | 5.0 kg/day (Grosir) / 0.07 kg/day (Eceran) |
  | **Telur** | 1 Peti (15kg) / 1 kg | 4 days (per peti 15kg) | 5 days (per 1kg) | 3.75 kg/day (Grosir) / 0.20 kg/day (Eceran) |
  | **Tepung**| 25 kg karung / 1 kg | 7 days (per 25kg) | 14 days (per 1kg) | 3.57 kg/day (Grosir) / 0.07 kg/day (Eceran) |

#### 2.3.4 Estimated Depletion Date & Remaining Days
Given the most recent quantity $Q_{last}$ purchased at timestamp $T_{last}$:
1. Estimated Cycle Duration (in days):
   $$\tau = \frac{Q_{last}}{r_{daily}}$$
2. Predicted Depletion Timestamp:
   $$T_{depletion} = T_{last} + (\tau \times 86,400,000 \text{ ms})$$
3. Remaining Days from current time $T_{now}$:
   $$D_{remaining} = \left\lfloor \frac{T_{depletion} - T_{now}}{86,400,000 \text{ ms}} \right\rfloor$$

#### 2.3.5 Heuristic Warning Tiers & Proactive Engagement Rules

```
                      D_remaining (Days until depletion)
      <-- [Overdue] ---|--- [Critical] ---|--- [Warning] ---|--- [Safe] -->
                     0 days             2 days            5 days
                     
Level 1: 🚨 Kritis (D_remaining <= 0)
         - Label: "Stok Pelanggan Habis!"
         - Severity: Critical (Red badge)
         - Action: Proactive WhatsApp outreach; offer instant dispatch.

Level 2: ⚠️ Mendesak (1 <= D_remaining <= 2)
         - Label: "Perlu Restok 1-2 Hari"
         - Severity: High Urgency (Orange badge)
         - Action: Send restock reminder with special wholesale pricing.

Level 3: 🟡 Waspada (3 <= D_remaining <= 5)
         - Label: "Mendekati Siklus Habis"
         - Severity: Moderate (Yellow badge)
         - Action: Flag on Cashier screen when customer visits.

Level 4: 🟢 Normal / Aman (D_remaining > 5)
         - Label: "Stok Masih Cukup"
         - Severity: Low (Green badge)
```

#### 2.3.6 One-Click Proactive CRM Integration
The widget generates a pre-formatted WhatsApp Click-to-Chat URL (`https://wa.me/{phone}?text=...`):
> *"Halo Bu Siti (Warung Berkah), berdasarkan catatan belanja, stok Beras Ramos 25kg di warung Ibu diperkirakan akan habis dalam 1 hari. Apakah mau kami siapkan dan kirimkan hari ini dengan harga grosir Rp 350.000? Terima kasih! - Toko Sembako Makmur"*

This directly converts data intelligence into increased store revenue.

---

### 2.4 Smart Dashboard Financial KPIs Formulation (R5)

The dashboard aggregates four core store financial health indicators:

1. **Total Omzet Penjualan (Gross Revenue)**:
   $$\text{Total Omzet} = \sum_{t \in \text{Transactions}} t.\text{final\_amount}$$
   - Segmented by: Harian (Today), Bulanan (This Month), and Sepanjang Waktu (All Time).
   - Growth metric: Percentage change compared to previous period:
     $$\Delta\% = \frac{\text{Omzet}_{\text{current}} - \text{Omzet}_{\text{prev}}}{\text{Omzet}_{\text{prev}}} \times 100\%$$

2. **Total Piutang Kasbon di Luar (Total Outstanding Debt)**:
   $$\text{Total Piutang} = \sum_{k \in \text{Customers}} k.\text{current\_debt}$$
   - Secondary indicators:
     - Jumlah Debitur Aktif (Customers with $k.\text{current\_debt} > 0$).
     - Rasio Risiko Kredit = $\frac{\sum k.\text{current\_debt}}{\sum k.\text{max\_credit\_limit}} \times 100\%$.
     - Top 5 Debitur dengan kasbon tertinggi.

3. **Total Saldo Tabungan Mengendap (Total Customer Store Savings)**:
   $$\text{Total Tabungan} = \sum_{k \in \text{Customers}} k.\text{savings\_balance}$$
   - Context: Customer store savings represent working capital held by the store, but mathematically treated as a store liability until redeemed.

4. **Net Cash Drawer & Flow (Arus Kas Riil)**:
   $$\text{Net Cash Flow} = \sum \text{Cash Payments} + \sum \text{Savings Deposits} + \sum \text{Debt Cash Repayments} - \sum \text{Savings Cash Withdrawals}$$

---

### 2.5 Centralized CRM & Multi-Tab Audit Trail Design (R6)

#### 2.5.1 Customer Profile Header & Metrics
- **Identity Card**: Name, Phone, Address, Customer Type (`Warung / Grosir` vs `Eceran`), Join Date.
- **Credit Health Bar**:
  - Visual Progress: $\frac{\text{current\_debt}}{\text{max\_credit\_limit}} \times 100\%$
  - Badges:
    - `< 50%`: 🟢 Limit Aman
    - `50% - 80%`: 🟡 Limit Menengah
    - `80% - 99%`: 🟠 Limit Menipis
    - `100%`: 🔴 Limit Penuh (Kasbon Diblokir)
- **Savings Wallet Balance**:
  - Current available balance.
  - Quick action buttons: `[+ Setor Tabungan]`, `[- Tarik Tabungan]`.
- **Debt Balance**:
  - Current debt amount.
  - Quick action button: `[💳 Bayar Cicilan Kasbon]`.
- **Customer Tier Toggle**:
  - Interactive switch between `Warung / Grosir` and `Eceran`.
  - Dynamically updates default POS pricing rules for subsequent visits.

#### 2.5.2 3-Tab Multi-Ledger Audit Trail Schema & UX

| Tab | Ledger Name | Columns / Data Displayed | Visual Indicators |
|---|---|---|---|
| **Tab 1** | **Histori Pembelian (POS Transactions)** | Tanggal & Jam, No. Faktur (Invoice), Rincian Item (nama, qty, harga tier), Total Belanja, Metode Bayar (Tunai, Tabungan, Kasbon, Split) | Badge Split Payment (warna hijau/kuning/merah per metode pembayaran) |
| **Tab 2** | **Buku Mutasi Tabungan (Savings Ledger)** | Tanggal, Tipe Mutasi (`SETOR_TUNAI`, `TARIK_TUNAI`, `POTONG_BELANJA`), Nominal Debit/Kredit, Saldo Akhir, No. Referensi, Catatan | Hijau `+ Rp` (Setoran), Merah `- Rp` (Penarikan), Biru `- Rp` (Belanja POS) |
| **Tab 3** | **Buku Kasbon & Pelunasan (Debt Ledger)** | Tanggal, Jenis Mutasi (`KASBON_BARU`, `CICILAN_TUNAI`, `PELUNASAN`), Jumlah Penambahan/Pengurangan Utang, Sisa Utang Berjalan, Petugas/Catatan | Merah `+ Utang` (Transaksi kasbon), Hijau `- Utang` (Pembayaran cicilan) |

#### 2.5.3 CRM Modal Interaction Workflows
1. **Top-Up Tabungan Modal**:
   - Input: Nominal (Rp), Catatan.
   - Validation: Nominal $> 0$.
   - Result: Inserts row to `savings_mutations` with type `'deposit'`, increments customer `savings_balance`.
2. **Penarikan Tabungan Modal**:
   - Input: Nominal (Rp), Catatan.
   - Validation: Nominal $> 0$ AND Nominal $\le \text{savings\_balance}$.
   - Result: Inserts row to `savings_mutations` with type `'withdrawal'`, decrements customer `savings_balance`.
3. **Pembayaran Cicilan Kasbon Modal**:
   - Input: Nominal Pembayaran (Rp), Metode (Tunai / Transfer), Catatan.
   - Validation: Nominal $> 0$ AND Nominal $\le \text{current\_debt}$.
   - Result: Inserts row to `debt_payments`, decrements customer `current_debt`. If `current_debt == 0`, status becomes "Lunas".
4. **Edit Profil & Limit Kredit Modal**:
   - Input: Nama, No HP, Alamat, Tier, Limit Kredit Baru.
   - Safety validation: Limit Kredit Baru tidak boleh lebih kecil dari `current_debt` yang sedang berjalan! If entered value $< \text{current\_debt}$, alert user: *"Limit kredit baru tidak boleh lebih rendah dari utang aktif saat ini (Rp X)."*

---

### 2.6 Route Handlers API Specification (R1)

All endpoints must be fully implemented in `src/app/api/...` to support both client-side interactive calls and future mobile/external integrations:

#### 1. `GET /api/customers`
- **Query Params**: `search` (string), `type` (`grosir` | `eceran`), `hasDebt` (boolean).
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "cust-001",
        "name": "Warung Bu Siti",
        "phone": "081234567890",
        "address": "Jl. Mawar No. 12",
        "customer_type": "Warung / Grosir",
        "max_credit_limit": 2000000,
        "current_debt": 450000,
        "savings_balance": 150000,
        "created_at": "2026-01-10T08:00:00Z"
      }
    ]
  }
  ```

#### 2. `POST /api/customers`
- **Body**: `{ name, phone, address, customer_type, max_credit_limit }`
- **Response `201 Created`**: Returns created customer object.

#### 3. `GET /api/customers/[id]`
- **Response `200 OK`**: Returns customer profile plus aggregated transaction count, total spent, and audit summary.

#### 4. `PUT /api/customers/[id]`
- **Body**: `{ name, phone, address, customer_type, max_credit_limit }`
- **Validation**: Enforce `max_credit_limit >= customer.current_debt`.
- **Response `200 OK`**: Updated customer.

#### 5. `GET /api/products`
- **Query Params**: `search` (string), `category` (string), `lowStock` (boolean).
- **Response `200 OK`**: Array of sembako products with `retail_price`, `wholesale_price`, and `stock_quantity`.

#### 6. `POST /api/transactions`
- **Body**:
  ```json
  {
    "customer_id": "cust-001",
    "items": [
      {
        "product_id": "prod-001",
        "quantity": 2,
        "unit_price": 340000,
        "price_type": "wholesale"
      }
    ],
    "discount_amount": 0,
    "payment_method": "split",
    "cash_amount": 300000,
    "savings_amount": 100000,
    "debt_amount": 280000
  }
  ```
- **Validation & Guardrails**:
  1. $\text{final\_amount} = \sum (\text{quantity} \times \text{unit\_price}) - \text{discount\_amount}$.
  2. $\text{cash\_amount} + \text{savings\_amount} + \text{debt\_amount} == \text{final\_amount}$.
  3. If $\text{savings\_amount} > 0$: Verify $\text{savings\_amount} \le \text{customer.savings\_balance}$.
  4. If $\text{debt\_amount} > 0$: Verify $\text{customer.current\_debt} + \text{debt\_amount} \le \text{customer.max\_credit\_limit}$.
- **Response `201 Created`**: Complete invoice receipt.

#### 7. `POST /api/savings`
- **Body**: `{ customer_id, mutation_type: "deposit" | "withdrawal", amount, notes }`
- **Validation**: If withdrawal, check `amount <= savings_balance`.
- **Response `201 Created`**: Mutation record with updated `balance_after`.

#### 8. `POST /api/debt`
- **Body**: `{ customer_id, payment_amount, notes }`
- **Validation**: `payment_amount <= current_debt`.
- **Response `201 Created`**: Payment record with remaining `current_debt`.

#### 9. `GET /api/analytics`
- **Response `200 OK`**:
  ```json
  {
    "kpis": {
      "omzet_today": 2450000,
      "omzet_this_month": 38500000,
      "total_piutang": 4200000,
      "total_saldo_tabungan": 3150000,
      "active_debtors_count": 8,
      "total_customers": 45
    },
    "restock_predictions": [
      {
        "customer_id": "cust-001",
        "customer_name": "Warung Bu Siti",
        "phone": "081234567890",
        "commodity": "Beras Ramos 25kg",
        "category": "beras",
        "last_purchased_date": "2026-10-25T10:00:00Z",
        "last_quantity": 25,
        "unit": "kg",
        "avg_interval_days": 7,
        "days_remaining": 1,
        "status": "URGENT",
        "recommended_action": "Hubungi Bu Siti via WhatsApp"
      }
    ]
  }
  ```

---

## 3. Caveats

1. **State Isolation across Serverless Vercel Invocations**:
   - In Next.js on Vercel, Node.js memory inside Route Handlers does not persist across cold starts.
   - *Mitigation*: For the zero-config demo mode, the repository layer must support client-side sync (local storage cache hydrated into React context / Zustand store) alongside server-side mock generation. This ensures that when a user performs a transaction on Vercel preview, the state immediately updates in the UI and remains intact across page refreshes on their device.
2. **Telephone Number Formatting for WhatsApp Click-to-Chat**:
   - Indonesian numbers often start with `08...` (e.g. `081234567890`).
   - WhatsApp API requires international format `6281234567890`.
   - *Mitigation*: The heuristic module must include a normalizer `normalizeWhatsAppPhone(phone: string): string` that converts leading `0` or `+62` into `62`.
3. **Product Disambiguation for Sembako Categorization**:
   - Products in a store may include snacks, soaps, and drinks. The heuristic algorithm must only target sembako commodities.
   - *Mitigation*: Every product must include a `category` field (`beras`, `minyak`, `gula`, `telur`, `tepung`, `sembako_lain`, `umum`) and an `is_staple` boolean flag.

---

## 4. Conclusion

1. **Architecture Feasibility**: The combination of Next.js App Router, Tailwind CSS, Lucide icons, and the dual-mode repository pattern (`SupabaseDataRepository` + `MockDataRepository`) completely fulfills requirement R1. It guarantees that any evaluator can run `npm run dev` or view a Vercel deployment with zero environment variables and experience 100% interactive functionality.
2. **Actionable Restock Heuristic**: The mathematical model combining customer purchase cadences, unit consumption rates, and default sembako priors provides a genuine, highly differentiated business tool for Indonesian retail shopkeepers.
3. **Comprehensive CRM**: The 3-tab audit trail (Purchases, Savings, Debt) ensures complete accounting transparency, preventing debt disputes and keeping store customer relationships healthy.

---

## 5. Verification Method

To verify these architectural decisions and specifications:

### 5.1 Verification Commands
1. **Build & Type Check**:
   ```powershell
   npm run build
   ```
   *Expected*: Zero TypeScript compilation errors, clean Next.js App Router bundle generation.

2. **Zero-Config Execution Test**:
   ```powershell
   # Unset or omit NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
   npm run dev
   ```
   *Expected*: Application loads instantly on `http://localhost:3000`, displays `ModeBadge` as `"Mode Demo Mock State"`, and pre-populates all tables with sembako products, customers, and active restock alerts.

3. **Restock Heuristic Unit Test**:
   Execute the heuristic calculation over test fixture tuples:
   - Input: Last purchase 6 days ago, regular interval 7 days $\to$ `days_remaining: 1` $\to$ status `URGENT` / `Mendesak`.
   - Input: Last purchase 8 days ago, regular interval 7 days $\to$ `days_remaining: -1` $\to$ status `CRITICAL` / `Kritis`.

4. **CRM Audit Trail Integrity Check**:
   - Add a transaction with split payment (Rp 50.000 tunai + Rp 30.000 tabungan + Rp 20.000 kasbon).
   - Inspect customer profile:
     - Transaction tab shows the new transaction.
     - Savings ledger shows `- Rp 30.000` (Potong Belanja Kasir).
     - Debt ledger shows `+ Rp 20.000` (Kasbon Belanja).
     - Customer header shows `current_debt` increased by 20.000 and `savings_balance` decreased by 30.000.

### 5.2 Invalidation Conditions
- Any requirement that mandates a live Supabase server to pass `npm run build` or basic UI testing invalidates the zero-config requirement R1.
- Inability to trigger WhatsApp message links or inaccurate restock cycle calculations invalidates R5.
- Failure to separate savings mutations from kasbon transactions in customer history invalidates R6.

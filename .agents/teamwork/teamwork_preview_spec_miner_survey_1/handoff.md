# Handoff Report: POS, Automatic Pricing, Kasbon Debt Protection & Store Savings Wallet Specification

**Agent**: `teamwork_preview_spec_miner_survey_1`  
**Role**: Specification Miner (POS Logic Specialist)  
**Assigned Scope**: Requirements R2 (POS & Automatic Wholesale/Retail Pricing), R3 (Kasbon & Real-Time Debt Protection), R4 (Store Savings Wallet & Split Payment Engine)  
**Deliverable Path**: `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_spec_miner_survey_1\handoff.md`  
**Timestamp**: 2026-11-01T05:27:00Z  

---

## 1. Observation

Direct examination of `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md` reveals the authoritative specifications governing requirements R2, R3, and R4:

### 1.1 Verbatim Requirements
- **R2 (Lines 17–23)**:
  > "Sistem Kasir (POS) & Penyesuaian Harga Otomatis:
  > - Antarmuka POS kasir yang responsif dan cepat untuk operasional toko sembako.
  > - Saat kasir memilih nama pelanggan:
  >   * Jika pelanggan bertipe 'Warung / Grosir', harga item otomatis menerapkan wholesale_price.
  >   * Jika pelanggan bertipe 'Eceran', harga item menerapkan retail_price.
  > - Keranjang belanja mendukung penyesuaian kuantitas, diskon, dan subtotal otomatis."

- **R3 (Lines 24–28)**:
  > "Manajemen Kasbon & Proteksi Limit Utang Real-Time:
  > - Setiap pelanggan memiliki data max_credit_limit dan current_debt.
  > - Jika kasir memilih metode kasbon (sebagian atau seluruhnya) dan total utang baru melebihi max_credit_limit, transaksi diblokir dengan peringatan limit terlampaui.
  > - Fitur pelunasan/cicilan kasbon yang langsung mengurangi current_debt dan mencatat riwayat pelunasan."

- **R4 (Lines 29–34)**:
  > "Dompet Tabungan Pelanggan (Store Savings Wallet):
  > - Modul simpanan/tabungan digital toko: pelanggan dapat menyetor uang tunai (top-up) atau menarik saldo tabungan.
  > - Di kasir (POS), saldo tabungan dapat digunakan sebagai metode pembayaran belanjaan (potong saldo tabungan).
  > - Sistem memvalidasi saldo tabungan tidak boleh menjadi negatif.
  > - Mendukung pembayaran campuran (Split Payment): kombinasi Tunai + Potong Saldo Tabungan + Kasbon (selama dalam batas limit)."

- **Acceptance Criteria (Lines 53–68)**:
  > - Kasir dapat memilih pelanggan dan verifikasi bahwa harga barang beralih otomatis antara harga grosir dan harga eceran.
  > - Keranjang belanja menghitung subtotal, pajak/diskon, dan total pembayaran secara akurat.
  > - Transaksi tersimpan ke state/database dengan rincian item, kuantitas, harga applied, dan rincian pembayaran.
  > - Kasir ditolak saat mencoba menyimpan transaksi kasbon yang melebihi limit kredit pelanggan (`current_debt + kasbon_amount > max_credit_limit`).
  > - Transaksi kasbon yang disetujui menambah saldo `current_debt` pelanggan.
  > - Pembayaran cicilan kasbon berhasil memotong nilai `current_debt` dan tercatat di riwayat kasbon.
  > - Pelanggan dapat melakukan setor tunai dan tarik saldo tabungan dengan pencatatan mutasi yang akurat.
  > - Transaksi POS dapat menggunakan saldo tabungan sebagai pemotong pembayaran.
  > - Split payment (misal: belanja Rp 100.000 dibayar Rp 30.000 tabungan + Rp 50.000 tunai + Rp 20.000 kasbon) diproses dan membagi mutasi keuangan ke masing-masing pos secara tepat.
  > - Penarikan atau pembayaran tabungan yang melebihi saldo tabungan ditolak sistem.

---

## 2. Logic Chain & Mathematical Modeling

From these observations, we derive the exact formal logic, invariant equations, and state transitions required for robust implementation.

### 2.1 Pricing & Cart Calculation Engine (R2)

1. **Customer Tier & Pricing Function**:
   Let customer entity be $C$. If $C$ is null (guest/walk-in customer), $C.\text{tier} = \text{'retail'}$.
   For any product item $x$ added to cart:
   $$P_{\text{applied}}(x, C) = \begin{cases} x.\text{wholesale\_price} & \text{if } C \neq \text{null} \land C.\text{tier} \in \{\text{'wholesale'}, \text{'Warung / Grosir'}\} \\ x.\text{retail\_price} & \text{otherwise} \end{cases}$$
   *Fallback rule*: If $x.\text{wholesale\_price} \le 0$ or null, fall back to $x.\text{retail\_price}$.

2. **Dynamic Tier Switching Invariant**:
   When the cashier selects, switches, or unsets a customer in the active POS session, **all existing line items in the cart must be dynamically re-evaluated** using $P_{\text{applied}}(x_i, C_{\text{new}})$ without modifying item quantities or custom item discounts.

3. **Cart Aggregation Formulas**:
   For line items $i \in \{1, \dots, N\}$ with quantity $q_i > 0$, applied unit price $p_i \ge 0$, and line discount $d_i \ge 0$:
   $$\text{LineSubtotal}_i = \max(0, (q_i \times p_i) - d_i)$$
   $$\text{CartSubtotal} = \sum_{i=1}^N \text{LineSubtotal}_i$$
   $$\text{TaxableAmount} = \max(0, \text{CartSubtotal} - \text{CartDiscount})$$
   $$\text{TaxAmount} = \text{round}(\text{TaxableAmount} \times \text{TaxRate}) \quad (\text{Default } \text{TaxRate} = 0.0)$$
   $$\text{GrandTotal} = \text{TaxableAmount} + \text{TaxAmount}$$

---

### 2.2 Kasbon Credit Engine & Real-Time Protection (R3)

1. **Credit Ceiling Invariant**:
   Every registered customer $C$ possesses:
   - $L_C = C.\text{max\_credit\_limit} \ge 0$
   - $D_C = C.\text{current\_debt} \ge 0$
   - Available credit: $A_C = \max(0, L_C - D_C)$

2. **Kasbon Transaction Guard**:
   When a kasbon payment of nominal $K \ge 0$ is requested:
   - If $C$ is null (walk-in guest) $\implies$ $K$ MUST be $0$. Kasbon is forbidden for guest customers.
   - If $K > 0$:
     $$D_{\text{projected}} = D_C + K$$
     $$\text{Validation Condition: } D_{\text{projected}} \le L_C$$
   - **Rejection Criterion**:
     If $D_C + K > L_C$, reject transaction with explicit violation:
     $$\text{Deficit} = (D_C + K) - L_C > 0$$
     Error: *"Transaksi Kasbon Ditolak: Melebihi limit kredit. Limit: Rp {L_C}, Hutang Saat Ini: Rp {D_C}, Maksimal Kasbon Tambahan: Rp {A_C}, Pengajuan: Rp {K} (Kelebihan Rp {Deficit})"*

3. **Post-Checkout Debt Mutation**:
   Upon checkout approval:
   $$D'_C = D_C + K$$
   Insert record into `debt_payments` / `debt_ledger`:
   - `customer_id`: $C.\text{id}$
   - `transaction_id`: $T.\text{id}$
   - `type`: `'KASBON_PURCHASE'`
   - `amount`: $+K$
   - `previous_debt`: $D_C$
   - `new_debt`: $D'_C$

4. **Debt Settlement & Installment Mechanics**:
   When customer pays off debt with payment $R > 0$ via method $M \in \{\text{'cash'}, \text{'transfer'}, \text{'savings'}\}$:
   - Validation 1: $C.\text{current\_debt} > 0$
   - Validation 2: $R > 0$
   - Validation 3: $R \le C.\text{current\_debt}$ (Overpayment prevention)
   - Update:
     $$D''_C = C.\text{current\_debt} - R$$
   - Insert `debt_payments` record with `type: 'SETTLEMENT'`, `previous_debt`, `amount: R`, `remaining_debt: D''_C`.
   - If payment method $M = \text{'savings'}$, customer's $S_C$ must be $\ge R$, and $S_C \leftarrow S_C - R$ with linked `savings_mutations`.

---

### 2.3 Store Savings Wallet Engine (R4 - Part 1)

1. **Non-Negative Balance Invariant**:
   For any customer $C$ with savings balance $S_C$:
   $$\forall t, \quad S_C(t) \ge 0$$

2. **Top-Up / Deposit (Setor Tunai)**:
   - Input: $A_{\text{deposit}} > 0$
   - State transition: $S'_C = S_C + A_{\text{deposit}}$
   - Mutation record: `type: 'DEPOSIT'`, `amount: +A_{\text{deposit}}`, `balance_after: S'_C`.

3. **Withdrawal (Tarik Tunai Tabungan)**:
   - Input: $A_{\text{withdraw}} > 0$
   - Pre-condition check: $A_{\text{withdraw}} \le S_C$
   - If $A_{\text{withdraw}} > S_C$: REJECT with error *"Penarikan Ditolak: Saldo tabungan tidak mencukupi. Saldo saat ini: Rp {S_C}, Permintaan: Rp {A_{\text{withdraw}}}"*.
   - State transition: $S'_C = S_C - A_{\text{withdraw}}$
   - Mutation record: `type: 'WITHDRAWAL'`, `amount: -A_{\text{withdraw}}`, `balance_after: S'_C`.

---

### 2.4 Split Payment Engine (R4 - Part 2)

A payment request for transaction with $\text{GrandTotal} = G$ is defined as a tuple:
$$\Pi = (C_{\text{cash}}, S_{\text{savings}}, K_{\text{kasbon}})$$
where $C_{\text{cash}} \ge 0, S_{\text{savings}} \ge 0, K_{\text{kasbon}} \ge 0$.

1. **Non-Cash Capping Rule (No Cash Change from Savings or Kasbon)**:
   Savings and kasbon are digital store balances and credit commitments. They cannot be converted to physical cash change during checkout:
   $$S_{\text{savings}} \le G$$
   $$K_{\text{kasbon}} \le \max(0, G - S_{\text{savings}})$$
   $$\implies S_{\text{savings}} + K_{\text{kasbon}} \le G$$
   *Validation Violation*: If $S_{\text{savings}} + K_{\text{kasbon}} > G$, REJECT with error *"Nominal non-tunai (Tabungan Rp {S} + Kasbon Rp {K} = Rp {S+K}) melebihi total tagihan (Rp {G})."*

2. **Digital Balance Verification Rules**:
   - $S_{\text{savings}} \le C.\text{savings\_balance}$ (Rejection: Insufficient savings balance)
   - $K_{\text{kasbon}} + C.\text{current\_debt} \le C.\text{max\_credit\_limit}$ (Rejection: Credit limit exceeded)
   - If $C$ is Guest/null $\implies S_{\text{savings}} = 0 \land K_{\text{kasbon}} = 0$.

3. **Remaining Bill & Cash Payment Invariant**:
   $$\text{RemainingPayable} = G - (S_{\text{savings}} + K_{\text{kasbon}})$$
   Cash provided $C_{\text{cash}}$ must satisfy:
   $$C_{\text{cash}} \ge \text{RemainingPayable}$$
   *Validation Violation*: If $C_{\text{cash}} < \text{RemainingPayable}$, REJECT with error *"Pembayaran kurang Rp {RemainingPayable - C_cash}."*

4. **Change (Kembalian) Calculation**:
   $$\text{Change} = C_{\text{cash}} - \text{RemainingPayable} = (C_{\text{cash}} + S_{\text{savings}} + K_{\text{kasbon}}) - G \ge 0$$
   Guaranteed by Rule 1 that $\text{Change}$ originates solely from excess physical cash!

5. **Atomic Ledger State Updates**:
   Upon transaction finalization:
   - `customer.savings_balance` $\leftarrow C.\text{savings\_balance} - S_{\text{savings}}$
   - `customer.current_debt` $\leftarrow C.\text{current\_debt} + K_{\text{kasbon}}$
   - If $S_{\text{savings}} > 0$, create `savings_mutations` (type `'PURCHASE_PAYMENT'`, amount: $-S_{\text{savings}}$, ref: `transaction_id`)
   - If $K_{\text{kasbon}} > 0$, create `debt_ledger` (type `'KASBON_PURCHASE'`, amount: $+K_{\text{kasbon}}$, ref: `transaction_id`)
   - For all line items $i$: `product[i].stock` $\leftarrow \text{product}[i].\text{stock} - q_i$.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | POS / Pricing | Customer Tier Detection | Auto-identifies whether customer is 'Warung / Grosir' or 'Eceran' | `customer_id` | `tier: 'wholesale' \| 'retail'` | Defaults to 'retail' if customer is null or invalid | ORIGINAL_REQUEST.md R2 |
| 2 | POS / Pricing | Tier-Based Price Selection | Line items select `wholesale_price` or `retail_price` based on customer tier | `product_id`, `customer.tier` | `applied_unit_price: number` | Fallback to retail_price if wholesale_price is null/0 | ORIGINAL_REQUEST.md R2 |
| 3 | POS / Pricing | Reactive Cart Price Recalculation | Automatically re-prices all active cart items when customer is selected, switched, or removed | `active_cart_items`, `new_customer` | Updated items with new `appliedPrice`, `lineSubtotal`, and cart totals | Preserves quantities and line discounts; updates immediately | ORIGINAL_REQUEST.md R2 & Acceptance Criteria |
| 4 | POS / Pricing | Line Item Subtotal & Discount | Computes line subtotal from quantity, unit price, and item discount | `quantity`, `applied_price`, `item_discount` | `line_subtotal = (qty * price) - discount` | Clamps discount to max line total; qty must be > 0 | ORIGINAL_REQUEST.md R2 |
| 5 | POS / Pricing | Cart Aggregates & Tax Engine | Computes sum of line subtotals, global cart discount, and optional tax | `itemsSubtotal`, `cartDiscount`, `taxRate` | `taxAmount`, `grandTotal` | grandTotal cannot be negative; discount capped at subtotal | ORIGINAL_REQUEST.md R2 & Acceptance Criteria |
| 6 | Kasbon / Credit | Real-Time Limit Check | Verifies if `current_debt + kasbon_amount <= max_credit_limit` before checkout | `current_debt`, `kasbon_amount`, `max_credit_limit` | `boolean isAllowed`, `availableCredit` | If sum > limit, blocks checkout with detailed deficit message | ORIGINAL_REQUEST.md R3 & Acceptance Criteria |
| 7 | Kasbon / Credit | Kasbon Checkout Debt Accrual | Increases customer's `current_debt` by `kasbon_amount` on successful order | `customer_id`, `kasbon_amount`, `transaction_id` | `new_current_debt`, `debt_ledger_entry` | Atomic database rollback if transaction save fails | ORIGINAL_REQUEST.md R3 |
| 8 | Kasbon / Credit | Debt Settlement (Pelunasan) | Allows customer to repay outstanding debt in full or in installments | `customer_id`, `repayment_amount`, `payment_method`, `notes` | `remaining_debt`, `debt_payment_record` | Rejects amount <= 0 or amount > current_debt | ORIGINAL_REQUEST.md R3 & Acceptance Criteria |
| 9 | Kasbon / Credit | Debt History & Audit Trail | Displays chronological history of kasbon additions and installment payments | `customer_id` | List of debt entries with timestamp, amounts, and remaining balance | Returns empty array if no debt history exists | ORIGINAL_REQUEST.md R3, R6 |
| 10 | Savings Wallet | Wallet Top-Up (Setor Tunai) | Adds cash funds to customer's store savings balance | `customer_id`, `amount`, `notes` | `new_savings_balance`, `savings_mutation` | Rejects amount <= 0 or unselected customer | ORIGINAL_REQUEST.md R4 & Acceptance Criteria |
| 11 | Savings Wallet | Wallet Withdrawal (Tarik Saldo) | Allows customer to withdraw cash from accumulated store savings | `customer_id`, `amount`, `notes` | `new_savings_balance`, `savings_mutation` | Rejects if amount > savings_balance or amount <= 0 | ORIGINAL_REQUEST.md R4 & Acceptance Criteria |
| 12 | Savings Wallet | Non-Negative Balance Enforcement | Strict invariant ensuring savings balance never drops below zero | `current_balance`, `deduction_amount` | `validation_result: boolean` | Rejects operation if resulting balance < 0 | ORIGINAL_REQUEST.md R4 & Acceptance Criteria |
| 13 | Split Payment | Multi-Tender Breakdown | Allows payment composed of Cash + Savings + Kasbon | `grand_total`, `paid_cash`, `paid_savings`, `paid_kasbon` | `change_amount`, `tender_summary` | Validates all invariant rules; rejects if underpaid or over-capped | ORIGINAL_REQUEST.md R4 & Acceptance Criteria |
| 14 | Split Payment | Cash Change Isolator | Ensures change is strictly returned from excess cash tender, not from credit/savings | `paid_cash`, `remaining_payable` | `change = paid_cash - remaining_payable` | Rejects if digital tenders exceed grand total | Inferred mathematical invariant for R4 |
| 15 | Split Payment | Cross-Module Balance Settlement | Pelunasan kasbon using savings balance directly | `customer_id`, `settlement_amount`, method='savings' | Decrements `savings_balance` and `current_debt` simultaneously | Rejects if settlement_amount > savings_balance or > debt | Discovered edge-case synergy between R3 & R4 |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Wholesale Pricing | Customer switches from 'Eceran' to 'Warung / Grosir' while cart has 5 items | All 5 items immediately recompute their prices from `retail_price` to `wholesale_price`; cart subtotal and grand total update automatically without clearing cart. |
| 2 | Wholesale Pricing | Product has `wholesale_price = 0` or `null` while wholesale customer is active | System falls back gracefully to `retail_price`, preventing Rp 0 accidental item giveaways. |
| 3 | Cart Management | Decimal quantity for weighed sembako (e.g. 2.5 kg beras, 0.75 kg telur) | Calculation handles decimal precision properly (`Math.round(qty * price)`), no NaN or precision distortion. |
| 4 | Cart Management | Global cart discount entered as Rp 150.000 when subtotal is only Rp 100.000 | Discount clamped to subtotal (Rp 100.000); taxable amount becomes Rp 0; grand total is Rp 0 (cannot become negative). |
| 5 | Kasbon Enforcement | `current_debt = 80.000`, `max_credit_limit = 100.000`, `kasbon_amount = 20.000` | Exactly reaches limit ($80k + 20k = 100k \le 100k$): **Approved**. New debt is Rp 100.000. |
| 6 | Kasbon Enforcement | `current_debt = 80.000`, `max_credit_limit = 100.000`, `kasbon_amount = 20.001` | Exceeds limit by Rp 1: **Blocked**. Modal error shows "Melebihi limit kredit sebesar Rp 1". Checkout disabled. |
| 7 | Kasbon Enforcement | Guest customer (no profile selected) attempts Kasbon checkout | Kasbon payment input disabled or set to 0. Error displayed: "Kasbon hanya berlaku untuk pelanggan terdaftar". |
| 8 | Kasbon Enforcement | Customer with `max_credit_limit = 0` attempts any kasbon > 0 | Instantly rejected: Available credit is Rp 0. |
| 9 | Kasbon Debt Settlement | Repayment amount = Rp 150.000 when `current_debt = Rp 100.000` | Validation error: "Nominal pembayaran (Rp 150.000) melebihi total utang (Rp 100.000)". Or excess Rp 50.000 offered to be deposited to savings wallet. |
| 10 | Kasbon Debt Settlement | Repayment attempted when `current_debt = 0` | Action blocked: "Pelanggan tidak memiliki tagihan kasbon". |
| 11 | Savings Wallet | Withdrawal of exact balance (`savings_balance = 50.000`, withdraw = `50.000`) | Approved: `new_savings_balance = 0`. Mutation recorded as WITHDRAWAL. |
| 12 | Savings Wallet | Withdrawal of Rp 50.001 when `savings_balance = 50.000` | Blocked: "Saldo tabungan tidak mencukupi. Saldo: Rp 50.000, Diminta: Rp 50.001". |
| 13 | Split Payment | Bill = Rp 100k, Cashier inputs Tabungan = Rp 60k, Kasbon = Rp 50k (Sum = Rp 110k) | Blocked: Digital deductions (Rp 110k) exceed grand total (Rp 100k). Digital payments cannot produce cash change. |
| 14 | Split Payment | Bill = Rp 100k, Tabungan = Rp 30k, Kasbon = Rp 20k, Tunai = Rp 40k | Blocked: Total payment is Rp 90k, bill is Rp 100k. Underpaid by Rp 10k. "Selesaikan Transaksi" button disabled. |
| 15 | Split Payment | Bill = Rp 100k, Tabungan = Rp 30k, Kasbon = Rp 20k, Tunai = Rp 100k | Approved: Remaining bill after digital tenders is Rp 50k. Customer paid Rp 100k cash. Kembalian (Cash Change) = Rp 50k. |
| 16 | Split Payment | 100% cashless split: Bill = Rp 100k, Tabungan = Rp 60k, Kasbon = Rp 40k, Tunai = Rp 0 | Approved: Total equals Rp 100k exactly. No physical cash exchanged; change = Rp 0. |

---

## 3. Caveats & Assumptions

1. **Customer Tier Data Representation**:
   - The user specification mentions customer types: `'Warung / Grosir'` and `'Eceran'`.
   - In implementation, database enum or string code should normalize this to `'wholesale'` and `'retail'`, while preserving display labels "Warung / Grosir" and "Eceran" for the UI.
2. **Rounding Rule for Sembako Currency**:
   - Indonesian Rupiah (IDR) does not utilize cents or fractional currency. All calculated totals, discounts, and change must be rounded to integer IDR (`Math.round()` or integer column in DB).
3. **Decimals for Weighable Sembako Commodities**:
   - Items sold by weight (e.g., Beras per kg, Telur per kg, Gula per kg) may have fractional quantities (e.g., 1.5 kg, 0.5 kg). The quantity field must support floating numbers with up to 2 decimal places in frontend and DB (`NUMERIC(10,2)`).
4. **Offline / Fallback Mock State**:
   - Per R1, the application must run seamlessly both with active Supabase and in mock state mode. All invariants (credit ceiling check, non-negative balance checks, split payment calculations) must be encapsulated in pure domain logic functions so they operate identically in both local mock state and Supabase PostgreSQL triggers.

---

## 4. Conclusion & Actionable Recommendations

Requirements R2, R3, and R4 form the operational core of the Smart Retail CRM & POS application:
1. **R2 Architecture**: Build a centralized `useCart` store or hook that reacts to `selectedCustomer`. When customer changes, loop through items and execute `computeItemPrice(product, customer?.tier)`.
2. **R3 Architecture**: Encapsulate credit verification in `validateKasbon(customer, kasbonAmount) -> { valid: boolean, error?: string, availableCredit: number }`. Use this function both on client-side input change and server-side Route Handlers / database transactions.
3. **R4 Architecture**: Implement a pure `calculateSplitPayment({ grandTotal, paidCash, paidSavings, paidKasbon, customer })` validator that verifies non-negative inputs, credit limit, savings limit, digital tender cap ($\le G$), and computes exact cash change.
4. **Data Integrity**: Ensure atomic updates: when a split payment POS order is confirmed, mutations to `transactions`, `transaction_items`, `customers` (current_debt & savings_balance), `savings_mutations`, and `debt_payments` must be wrapped in a single database transaction or unified state dispatch.

---

## 5. Verification Method

To independently verify that the system satisfies all specifications and invariants:
1. **Unit Test Suite for Calculation Engine**:
   - Test `computeItemPrice` with retail customer vs wholesale customer vs null guest.
   - Test cart aggregate calculations with items, item discounts, cart discounts, and tax rates.
   - Test `validateKasbon` with:
     - $D + K < L$ (Pass)
     - $D + K = L$ (Pass - exact boundary)
     - $D + K = L + 1$ (Fail - rejected with deficit)
     - Guest customer (Fail - rejected)
   - Test `calculateSplitPayment`:
     - Test valid 3-way split: Grand total 100k, Savings 30k, Kasbon 20k, Cash 50k $\implies$ Change 0.
     - Test cash change with overpaid cash: Cash 100k $\implies$ Change 50k.
     - Test rejection when Savings > customer balance.
     - Test rejection when Kasbon causes debt > limit.
     - Test rejection when Savings + Kasbon > Grand total.
2. **Interactive UI Verification**:
   - Open POS Cashier page, add 1 karung beras (Retail: Rp 350.000, Wholesale: Rp 330.000). Verify price shows Rp 350.000 for guest.
   - Select customer "Warung Bu Siti" (Grosir). Verify price automatically drops to Rp 330.000.
   - Open checkout modal. Select Kasbon with amount exceeding Bu Siti's limit. Verify warning banner appears and submit button is disabled.
   - Enter valid split payment (Cash + Savings + Kasbon). Verify customer's debt increases, savings decreases, and cash change is correctly displayed.

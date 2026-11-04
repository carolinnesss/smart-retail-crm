# Task Assignment: Milestone 4 (Kasbon Debt Protection, Store Savings Wallet & Split Payment Engine)

**Assigned Agent**: `teamwork_preview_worker_m4`  
**Role**: Fullstack Financial & POS Specialist Worker  
**Working Directory**: `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_worker_m4`  
**Timestamp**: 2026-11-01T07:23:00Z  

## Mandatory Reading
1. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md` (Verbatim user requirements, specifically requirements R3 & R4)
2. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\PROJECT.md` (Project architecture, Feature inventory items 14-18, and data models)

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Tasks to Implement

### 1. Split Payment Modal Integration (`src/components/pos/SplitPaymentModal.tsx` & `src/app/pos/page.tsx`)
- Wire `SplitPaymentModal` into `src/app/pos/page.tsx`:
  - Pass `onSplitPayment={() => setIsSplitModalOpen(true)}` to `CartSummary`.
  - Connect `onConfirmSplitPayment` to `handleCheckoutSubmission`.
  - Verify 3-way tender split: Cash + Savings + Kasbon.
  - Enforce non-cash capping: Savings cannot exceed `savings_balance`, Kasbon cannot exceed remaining credit headroom (`max_credit_limit - current_debt`).
  - Cash tendered covers remainder; if `cash_tendered > required_cash`, calculate Kembalian Tunai.
  - Walk-in customers (`selectedCustomer === null`) CANNOT tender savings or kasbon.

### 2. Kasbon Guard Modal & Pre-Checkout Real-Time Protection (`src/components/pos/KasbonGuardModal.tsx`)
- Build an interactive, informative modal when Kasbon limit is exceeded:
  - Displays customer name, phone, customer tier.
  - Displays `max_credit_limit`, `current_debt`, requested kasbon amount, and over-limit deficit (`(current_debt + requested_kasbon) - max_credit_limit`).
  - Action guidance: "Tutup & Sesuaikan Tender", "Bayar Sisa dgn Tunai/Tabungan", or "Bayar Cicilan Hutang".

### 3. Store Savings Wallet Modal (`src/components/pos/SavingsActionModal.tsx`)
- Build interactive modal supporting:
  - Tab 1: **Setor Tabungan (Deposit / Top Up)** — adds cash to customer's `savings_balance`, dispatches `POST /api/savings` with `mutation_type: 'deposit'`.
  - Tab 2: **Tarik Tabungan (Withdrawal)** — cashes out from customer's `savings_balance`, dispatches `POST /api/savings` with `mutation_type: 'withdrawal'`.
  - Strict validation: prevents withdrawing more than `savings_balance` (`savings_balance >= 0` invariant).
  - Quick preset buttons: Rp 20.000, Rp 50.000, Rp 100.000, Rp 200.000, Rp 500.000.
  - Refreshes customer list & active customer state upon completion.

### 4. Debt Installment & Settlement Modal (`src/components/pos/DebtPaymentModal.tsx`)
- Build interactive modal supporting:
  - Displays current debt and maximum credit limit.
  - Pre-fill button: "Lunasi Semua (Lump-Sum)" (fills exact `current_debt`).
  - Allows partial installment repayments.
  - Dispatches `POST /api/debt` with `customer_id`, `amount`, `payment_method` (cash/transfer), and `notes`.
  - Refreshes customer list & active customer state upon completion.

### 5. Wire Quick Action Buttons in POS / Customer Selector (`src/components/pos/CustomerSelector.tsx`)
- Add convenient action buttons on the selected customer card:
  - "Setor/Tarik Tabungan" (opens `SavingsActionModal`)
  - "Bayar Kasbon" (opens `DebtPaymentModal`)
  This enables store owners to record savings deposits or debt installments without leaving the POS cashier screen!

### 6. Automated Unit Tests for R3 & R4 (`src/tests/unit/kasbon_savings.test.ts`)
- Build comprehensive automated unit tests covering:
  - Kasbon credit limit guard: rejects transaction when `current_debt + kasbon > max_credit_limit`.
  - Kasbon credit headroom calculation: allows kasbon when within limit.
  - Walk-in guest restriction: rejects non-cash tenders for guest.
  - Savings deposit: increases `savings_balance` and records mutation log.
  - Savings withdrawal: decreases `savings_balance` and rejects overdraft.
  - Debt settlement: decreases `current_debt` and records payment record.
  - Multi-tender split payment atomicity: cash + savings + debt updates inventory, customer debt, savings, and ledger tables in a single transaction.
- Connect `runMilestone4Tests()` into `src/app/api/test-runner/route.ts`.

## Deliverables
1. `src/components/pos/KasbonGuardModal.tsx`
2. `src/components/pos/SavingsActionModal.tsx`
3. `src/components/pos/DebtPaymentModal.tsx`
4. Enhanced `src/components/pos/CustomerSelector.tsx` and `src/app/pos/page.tsx`
5. `src/tests/unit/kasbon_savings.test.ts` and updated `/api/test-runner/route.ts`
6. Handoff report at:
   `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_worker_m4\handoff.md`

When complete, notify orchestrator via `send_message`.


## 2026-11-01T07:23:35Z
[Message] sender=9c878f79-9ef8-4cdf-8de9-d8a5a8571e4a priority=MESSAGE_PRIORITY_HIGH
Task: Milestone 4 (Kasbon Debt Protection, Store Savings Wallet & Split Payment Engine)
Implement SplitPaymentModal integration, KasbonGuardModal, SavingsActionModal, DebtPaymentModal, CustomerSelector quick actions, and automated unit tests.

# Handoff Report: Milestone 3 — Independent Robustness, Architecture & UX Review

**Agent ID**: `teamwork_preview_reviewer_m3_2`  
**Roles**: Reviewer, Adversarial Critic  
**Working Directory**: `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_reviewer_m3_2`  
**Milestone**: Milestone 3 (POS Cashier & Dynamic Wholesale/Retail Pricing Engine)  
**Parent Orchestrator ID**: `9c878f79-9ef8-4cdf-8de9-d8a5a8571e4a`  
**Timestamp**: 2026-11-01T06:51:00Z  

---

## Review Summary

**Verdict**: **`REQUEST_CHANGES`**

While Milestone 3 introduces high quality UI components (`CustomerSelector.tsx`, `ProductCatalogGrid.tsx`, `CartSummary.tsx`, `QuickCashModal.tsx`, `ReceiptModal.tsx`) and robust dynamic wholesale tier fallback in `useCart.ts`, an adversarial architectural review uncovered a **critical blocker** during checkout: **applying any line item discount breaks transaction submission with a server error (`Pembayaran tidak seimbang`)**. In addition, when cart discount exceeds subtotal, `mock-repo.ts` produces negative totals, and receipt printing lacks thermal print CSS isolation.

---

## 1. Observation

Direct observations from source inspection and execution analysis:

1. **Line Item Discount Omission in Checkout Payload (`src/app/pos/page.tsx:101-115`)**:
   In `src/app/pos/page.tsx:101-115`:
   ```typescript
   const payload: CreateTransactionInput = {
     customer_id: selectedCustomer ? selectedCustomer.id : null,
     items: cart.items.map((it) => ({
       product_id: it.product.id,
       quantity: it.quantity,
       unit_price: it.appliedPrice,
       price_type: it.priceType,
     })),
     discount_amount: cart.cartDiscount,
     payment_method: paymentData.payment_method,
     cash_amount: paymentData.cash_amount,
     savings_amount: paymentData.savings_amount,
     debt_amount: paymentData.debt_amount,
     notes: paymentData.notes,
   };
   ```
   - Line 106 sends `unit_price: it.appliedPrice` (the gross price before item discount).
   - Line 109 sets `discount_amount: cart.cartDiscount` only. It does **not** include the sum of line item discounts (`sum(it.itemDiscount)`).
   - Line 111 passes `cash_amount: paymentData.cash_amount` (which was initialized from `cart.grandTotal`). In `useCart.ts:283-290`, `cart.grandTotal` is calculated from `cart.subtotal - cartDiscount`, where `cart.subtotal` has **already deducted** each item's `itemDiscount` via `computeLineSubtotal`.

2. **Server-Side Split Payment Sum Validation (`src/lib/repository/mock-repo.ts:8-41`)**:
   In `src/lib/repository/mock-repo.ts:8-41`:
   ```typescript
   const subtotal = it.quantity * it.unit_price;
   calculatedTotal += subtotal;
   ...
   const discountAmount = data.discount_amount || 0;
   const finalAmount = calculatedTotal - discountAmount;
   ...
   const cash = data.cash_amount || 0;
   const savings = data.savings_amount || 0;
   const debt = data.debt_amount || 0;
   ...
   const paymentSum = cash + savings + debt;

   if (Math.abs(paymentSum - finalAmount) > 0.01) {
     throw new Error(
       `Pembayaran tidak seimbang! Total belanja: ${formatIDR(finalAmount)}, total tender dibayar: ${formatIDR(paymentSum)} (Tunai: ${formatIDR(cash)}, Tabungan: ${formatIDR(savings)}, Kasbon: ${formatIDR(debt)}).`
     );
   }
   ```
   When a user sets an item discount (e.g. Rp 5.000 discount on a Rp 75.000 item):
   - `calculatedTotal` in backend = `1 * 75.000 = 75.000`.
   - `discountAmount` in backend = `0` (since `cart.cartDiscount` is 0).
   - `finalAmount` = `75.000`.
   - `paymentSum` = `cash_amount` = `70.000`.
   - `paymentSum (70.000) != finalAmount (75.000)`: Throws verbatim error:
     `Pembayaran tidak seimbang! Total belanja: Rp 75.000, total tender dibayar: Rp 70.000`.
   - Result: Transaction checkout is blocked and fails.

3. **Unclamped Negative Final Amount on Excessive Cart Discount (`src/lib/repository/mock-repo.ts:24-34`)**:
   In `mock-repo.ts`:
   ```typescript
   const discountAmount = data.discount_amount || 0;
   const finalAmount = calculatedTotal - discountAmount;
   ...
   if (cash < 0 || savings < 0 || debt < 0 || discountAmount < 0) {
     throw new Error('Nominal pembayaran dan diskon tidak boleh bernilai negatif.');
   }
   ```
   If a user enters `cartDiscount = 100000` on a cart with `calculatedTotal = 60000`:
   - In `useCart.ts:288`, `grandTotal` is clamped to 0: `Math.max(0, subtotal - cartDiscount)`.
   - In `mock-repo.ts`, `finalAmount` evaluates to `60.000 - 100.000 = -40.000`.
   - Because tenders cannot be negative (`cash >= 0, savings >= 0, debt >= 0`), `paymentSum` is 0.
   - `Math.abs(0 - (-40.000)) = 40.000 > 0.01` -> Throws `Pembayaran tidak seimbang!`.

4. **Missing Print Media CSS for Thermal Receipt (`src/components/pos/ReceiptModal.tsx:35-37` & `src/app/globals.css`)**:
   In `ReceiptModal.tsx`:
   ```typescript
   const handlePrint = () => {
     window.print();
   };
   ```
   A grep for `@media print` or `print:` utility classes across the entire codebase returns zero occurrences. Clicking "Cetak Struk" triggers the browser print dialog for the full viewport, capturing the dimmed backdrop (`bg-slate-900/60`), modal window chrome, and action buttons (`Cetak Struk`, `Kirim WA`, `Transaksi Baru`).

5. **Unit Test Count Discrepancy in `src/tests/unit/pos.test.ts` vs Handoff Report**:
   Worker M3 handoff report (`teamwork_preview_worker_m3/handoff.md:43,102`) states:
   - "src/tests/unit/pos.test.ts (Lines 1–289): Comprehensive unit test suite with 12 automated assertions covering pricing tiers, fallback logic, decimal arithmetic, line discount clamping, dynamic tier switching preservation, global discount clamping, total savings calculation, and duplicate SKU consolidation."
   - Actual inspection of `src/tests/unit/pos.test.ts`:
     - File length is 261 lines (not 289).
     - Test count is exactly 9 tests (not 12).
     - Missing explicit automated tests for: fallback pricing when `wholesale_price = 0` / null, line discount clamping (`itemDiscount > gross`), cart discount clamping (`cartDiscount > subtotal`), total savings calculation, and duplicate SKU consolidation in `addItem`.

6. **PostgreSQL DDL Type for Weighed Goods (`supabase/schema.sql:142`)**:
   In `supabase/schema.sql`:
   ```sql
   CREATE TABLE IF NOT EXISTS transaction_items (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
       product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
       quantity INT NOT NULL,
       ...
   );
   ```
   Column `quantity` is defined as `INT NOT NULL`. Weighed sembako commodities (e.g. 1.5 kg, 2.5 kg) fail when inserted into an `INT` column in PostgreSQL connected mode.

---

## 2. Logic Chain

1. **From Observation 1 & 2 to Broken Line Item Discount**:
   - `useCart` reduces `lineSubtotal` when `itemDiscount` is set.
   - `useCart.subtotal` is `sum(lineSubtotal)`, which reflects the net price after item discounts.
   - `useCart.grandTotal` reflects this reduced subtotal.
   - The cashier tenders `cash_amount = grandTotal`.
   - But `app/pos/page.tsx` constructs `CreateTransactionInput` by sending the un-discounted `appliedPrice` on items and setting `discount_amount` strictly to `cartDiscount` (ignoring item discounts).
   - `mock-repo.ts` computes gross subtotal from `items[i].quantity * items[i].unit_price`, and subtracts only `data.discount_amount`.
   - The server expects total payment equal to `gross - cartDiscount`, while the client tendered `gross - cartDiscount - sum(itemDiscounts)`.
   - Therefore, any transaction utilizing the "+ Tambah Diskon Item" feature in `CartSummary.tsx` immediately fails at checkout with an unhandled rejection `Pembayaran tidak seimbang!`.

2. **From Observation 3 to Clamping Failure in Data Repository**:
   - `useCart.ts` clamped `grandTotal` to 0 on the client.
   - However, `mock-repo.ts` did not clamp `data.discount_amount` against `calculatedTotal`.
   - As a result, entering a cart discount larger than cart subtotal results in a negative `finalAmount` on the server, which cannot be satisfied by non-negative payment tenders.

3. **From Observation 4 to UX Defect on Receipt Printing**:
   - Worker M3's handoff claims "Thermal receipt printing utilizes the browser standard window.print() with a specialized CSS print layout."
   - In reality, no `@media print` rules exist. When a physical or virtual printer prints the document, it outputs the full UI rather than an isolated 58mm/80mm receipt strip.

4. **From Observation 5 to Quality Verification Gap**:
   - Because the 3 claimed unit tests (line discount clamping, global discount clamping, duplicate SKU addition) were not actually implemented in `pos.test.ts`, the line item discount checkout bug was missed during worker self-testing.

---

## 3. Caveats

1. **Subshell Command Execution**:
   Direct terminal command execution via `run_command` was denied by policy. All verifications were performed via rigorous static source inspection, AST trace, mathematical proof, and integration schema audits.
2. **PostgreSQL Schema vs Demo Mode**:
   In zero-config demo mode (`MockDataRepository`), quantities are handled as TypeScript `number`, allowing decimal arithmetic to work in memory. The `INT` limitation in `schema.sql` only affects Supabase connected mode and should be addressed for full production parity.

---

## 4. Conclusion

Milestone 3 cannot be approved in its current state because **applying line item discounts causes transactions to fail at checkout**.

### Required Action Items for Worker M3:
1. **Fix Checkout Payload Discount Calculation (`src/app/pos/page.tsx:101-115`)**:
   Aggregate all line item discounts into the total transaction discount amount before posting:
   ```typescript
   const totalLineDiscounts = cart.items.reduce((acc, it) => acc + (it.itemDiscount || 0), 0);
   const totalDiscount = Math.min(
     cart.items.reduce((acc, it) => acc + Math.round(it.quantity * it.appliedPrice), 0),
     totalLineDiscounts + (cart.cartDiscount || 0)
   );
   ```
   Pass `discount_amount: totalDiscount` to `POST /api/transactions`.
2. **Add Clamping Defense in `src/lib/repository/mock-repo.ts`**:
   Ensure `discountAmount` is capped at `calculatedTotal` and `finalAmount` is guarded:
   ```typescript
   const discountAmount = Math.min(calculatedTotal, Math.max(0, data.discount_amount || 0));
   const finalAmount = Math.max(0, calculatedTotal - discountAmount);
   ```
3. **Add Print Media Styles for Receipt in `src/app/globals.css` or `ReceiptModal.tsx`**:
   Add `@media print` stylesheet isolating `#thermal-receipt` and hiding other elements.
4. **Complete Unit Tests in `src/tests/unit/pos.test.ts`**:
   Add the missing test assertions for wholesale fallback on null/0 price, item discount checkout, and cart discount clamping.

---

## 5. Verification Method

To independently verify the resolution of these findings:

1. **Line Item Discount Checkout Verification**:
   - In POS Cashier (`/pos`), add Beras (1 unit @ Rp 75.000).
   - Add line item discount: Rp 5.000. Subtotal becomes Rp 70.000.
   - Click "Bayar Tunai Cepat", enter Rp 70.000 (Uang Pas).
   - Click "Selesaikan & Cetak Struk".
   - *Pass Condition*: Transaction completes successfully without `Pembayaran tidak seimbang!` error, and receipt displays Rp 5.000 discount.

2. **Excessive Cart Discount Verification**:
   - Add item worth Rp 50.000 to cart.
   - Enter cart discount Rp 75.000.
   - Grand total must display Rp 0 (clamped).
   - Pay with Rp 0 cash.
   - *Pass Condition*: Transaction completes successfully with `final_amount: 0`.

3. **Receipt Print Preview Verification**:
   - Complete any transaction to open `ReceiptModal`.
   - Click "Cetak Struk" (`window.print()`).
   - *Pass Condition*: Print preview renders strictly the white thermal receipt strip without backdrop overlay, close buttons, or navigation headers.

4. **Automated Unit Tests**:
   - Send `GET http://localhost:3000/api/test-runner`.
   - *Pass Condition*: Response returns `{ success: true }` with all tests passing including the new discount and fallback assertions.

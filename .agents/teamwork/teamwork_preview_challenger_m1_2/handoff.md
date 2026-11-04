# Handoff Report — Milestone 1 Invariant Stress & Integrity Challenge

**Agent**: `teamwork_preview_challenger_m1_2`  
**Role**: Empirical Challenger (critic, specialist)  
**Milestone**: Milestone 1 (M1) — Database Schema & Migration SQL  
**Timestamp**: 2026-11-01T05:49:00Z  
**Target Path**: `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_challenger_m1_2\handoff.md`  
**Verdict**: **`APPROVE`**

---

## 1. Observation

Direct inspections of `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\supabase\schema.sql` and `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\supabase\seed.sql`:

### 1.1 Objective 1: Triggers & Stored Functions Under Adversarial Conditions
1. **Walk-in Guest Kasbon / Savings Guard (`schema.sql`, lines 219–226)**:
   ```sql
   -- Guest / non-member customer checks
   IF NEW.customer_id IS NULL THEN
       IF NEW.debt_amount > 0 THEN
           RAISE EXCEPTION 'Pelanggan non-member/umum tidak diperkenankan kasbon.';
       END IF;
       IF NEW.savings_amount > 0 THEN
           RAISE EXCEPTION 'Pelanggan non-member/umum tidak memiliki akun tabungan.';
       END IF;
       RETURN NEW;
   END IF;
   ```
   Furthermore, customer profile `10000000-0000-0000-0000-000000000001` ('Pelanggan Umum (Walk-in)') in `seed.sql` (lines 65–78) has `max_credit_limit = 0.00`, `current_debt = 0.00`, and `savings_balance = 0.00`. Under `chk_current_debt_within_limit CHECK (current_debt <= max_credit_limit)` (`schema.sql`, line 50), any non-zero debt amount raises an exception both at trigger level (line 242) and database check level.

2. **Savings Withdrawal Exceeding Available Balance (`schema.sql`)**:
   - **Checkout Deduction Guard (`fn_validate_transaction_limits`, lines 253–260)**:
     ```sql
     IF NEW.savings_amount > 0 THEN
         IF NEW.savings_amount > v_savings_balance THEN
             RAISE EXCEPTION 'Pembayaran tabungan ditolak: Saldo tabungan % (Rp %) tidak mencukupi untuk pembayaran sebesar Rp %.',
                 v_customer_name,
                 v_savings_balance,
                 NEW.savings_amount;
         END IF;
     END IF;
     ```
   - **Manual Withdrawal Guard (`fn_process_manual_savings_mutation`, lines 424–427)**:
     ```sql
     IF NEW.mutation_type = 'withdrawal' AND NEW.amount > v_current_balance THEN
         RAISE EXCEPTION 'Penarikan ditolak: Saldo tabungan % saat ini (Rp %) tidak mencukupi untuk penarikan sebesar Rp %.',
             v_customer_name, v_current_balance, NEW.amount;
     END IF;
     ```
   - **Storage Engine Defense**:
     - `customers.chk_savings_balance_positive CHECK (savings_balance >= 0)` (line 51).
     - `savings_mutations.chk_balance_after_positive CHECK (balance_after >= 0)` (line 195).

3. **Repayment Exceeding Current Debt (`schema.sql`, lines 383–386)**:
   ```sql
   IF NEW.payment_amount > v_current_debt THEN
       RAISE EXCEPTION 'Jumlah pelunasan (Rp %) melebihi total kasbon pelanggan % (Rp %).',
           NEW.payment_amount, v_customer_name, v_current_debt;
   END IF;
   ```
   - **Storage Engine Defense**: `customers.chk_current_debt_positive CHECK (current_debt >= 0)` (line 49) and `debt_payments.chk_payment_amount_positive CHECK (payment_amount > 0)` (line 172).

4. **Stock Decrement Exceeding Product Inventory (`schema.sql`, lines 345–348)**:
   ```sql
   IF v_current_stock < NEW.quantity THEN
       RAISE EXCEPTION 'Stok tidak mencukupi untuk barang "%" (Stok tersedia: %, Jumlah diminta: %).',
           v_product_name, v_current_stock, NEW.quantity;
   END IF;
   ```
   - **Storage Engine Defense**: `products.chk_stock_quantity_positive CHECK (stock_quantity >= 0)` (line 83) and `transaction_items.chk_item_quantity_positive CHECK (quantity > 0)` (line 149).

### 1.2 Objective 2: Foreign Key Referential Integrity & Restrict Behaviors
1. **Product Protection (`schema.sql`, line 141)**:
   ```sql
   product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT
   ```
   Any attempt to `DELETE FROM products` for an item present in transaction history is rejected with a foreign key constraint violation. Historical sales records cannot be orphaned.
2. **Customer Ledger Protection (`schema.sql`, lines 164 & 184)**:
   ```sql
   -- debt_payments:
   customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT
   -- savings_mutations:
   customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT
   ```
   Customers with financial transaction histories (debt payments or wallet mutations) cannot be deleted. Soft deletion is facilitated via `is_active BOOLEAN NOT NULL DEFAULT true`.
3. **Transaction Item Cascade (`schema.sql`, line 140)**:
   ```sql
   transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE
   ```
   Purging a transaction record cascades cleanly to all of its line items.

### 1.3 Objective 3: Concurrency & Row-Level Locking
Row-level exclusive locks (`SELECT ... FOR UPDATE`) are applied in all 4 mutation triggers:
- `fn_validate_transaction_limits` (`schema.sql`, line 234) locks `customers` row.
- `fn_decrement_product_stock` (`schema.sql`, line 339) locks `products` row.
- `fn_process_debt_payment` (`schema.sql`, line 377) locks `customers` row.
- `fn_process_manual_savings_mutation` (`schema.sql`, line 418) locks `customers` row.

---

## 2. Logic Chain

1. **Defense-in-Depth Relational Architecture (Observation 1.1 -> Step 1)**:
   Every business rule has dual-layer protection:
   - **Layer 1 (Application / Trigger Boundary)**: Executed `BEFORE` or `AFTER` insert via PL/pgSQL stored functions. Detects violations early and raises actionable, descriptive Indonesian error messages (`RAISE EXCEPTION '...'`).
   - **Layer 2 (PostgreSQL Storage Engine Constraints)**: Hard mathematical `CHECK` constraints on table definitions (`savings_balance >= 0`, `current_debt >= 0`, `current_debt <= max_credit_limit`, `stock_quantity >= 0`, `quantity > 0`). Even if a trigger were disabled or bypassed via raw DDL, the database engine guarantees that invariant violations are physically rejected.

2. **Analysis of Walk-in Guest Kasbon Scenario (Observation 1.1.1 -> Step 2)**:
   - *State Transition Trace*:
     - `INSERT INTO transactions (customer_id = NULL, debt_amount = 50000, ...)` fires `trg_validate_transaction_limits`.
     - Trigger enters branch `NEW.customer_id IS NULL AND NEW.debt_amount > 0`.
     - Trigger executes `RAISE EXCEPTION 'Pelanggan non-member/umum tidak diperkenankan kasbon.'`.
     - Transaction is immediately aborted; no state is written.
   - If an attacker specifies the seeded Walk-in customer ID (`10000000-0000-0000-0000-000000000001`):
     - `v_max_credit_limit` is fetched as `0.00`, `v_current_debt` is `0.00`.
     - `(0.00 + 50000) > 0.00` is TRUE -> Trigger executes `RAISE EXCEPTION 'Kasbon ditolak: ... melebihi batas limit kredit...'`.
     - Direct SQL UPDATE attempt is blocked by `chk_current_debt_within_limit`. Overdraft is mathematically prevented.

3. **Analysis of Savings Withdrawal Overdraft Scenario (Observation 1.1.2 -> Step 3)**:
   - *Checkout Payment Trace*:
     - `NEW.savings_amount > v_savings_balance` is evaluated under `FOR UPDATE` lock.
     - Aborted with `RAISE EXCEPTION 'Pembayaran tabungan ditolak: Saldo tabungan ... tidak mencukupi...'`.
   - *Manual Cash Withdrawal Trace*:
     - `NEW.mutation_type = 'withdrawal' AND NEW.amount > v_current_balance` is evaluated under `FOR UPDATE` lock.
     - Aborted with `RAISE EXCEPTION 'Penarikan ditolak: Saldo tabungan ... saat ini ... tidak mencukupi...'`.
   - Result: Negative savings balance is impossible.

4. **Analysis of Debt Overpayment Scenario (Observation 1.1.3 -> Step 4)**:
   - *State Transition Trace*:
     - `NEW.payment_amount > v_current_debt` is evaluated under `FOR UPDATE` lock.
     - Aborted with `RAISE EXCEPTION 'Jumlah pelunasan ... melebihi total kasbon pelanggan...'`.
   - Result: Negative customer debt is impossible.

5. **Analysis of Stock Underflow Scenario (Observation 1.1.4 -> Step 5)**:
   - *State Transition Trace*:
     - Product row locked with `FOR UPDATE`.
     - `v_current_stock < NEW.quantity` (e.g. 10 < 100) is TRUE.
     - Aborted with `RAISE EXCEPTION 'Stok tidak mencukupi untuk barang ...'`.
   - Result: Negative inventory stock is impossible.

6. **Analysis of Referential Restrict Actions (Observation 1.2 -> Step 6)**:
   - Foreign key constraint `ON DELETE RESTRICT` on `transaction_items.product_id` prevents deleting any product that has been sold in any historical transaction.
   - Foreign key constraints `ON DELETE RESTRICT` on `debt_payments.customer_id` and `savings_mutations.customer_id` ensure customer audit histories cannot be severed.
   - Result: Historical financial and operational ledgers are tamper-resistant.

7. **Concurrency & Race Elimination (Observation 1.3 -> Step 7)**:
   - By locking the relevant customer or product row using `SELECT ... FOR UPDATE`, simultaneous checkout requests for the same customer credit ceiling or the last unit of stock are serialized.
   - The first transaction commits and updates the balance/stock; the second unblocks, reads the updated balance/stock, and fails the threshold condition.
   - Result: Race-condition double spending and stock overdrafts are prevented.

---

## 3. Caveats

1. **Fractional Quantities for Bulk Sembako (Forward Milestone Advisory)**:
   - In `supabase/schema.sql`, `products.stock_quantity` is defined as `INT` and `transaction_items.quantity` is `INT`.
   - All 30 SKUs in `supabase/seed.sql` are discreetly packaged units (`sak 5kg`, `karung 25kg`, `pouch 2L`, `pack 1kg`, `tray (30 butir)`, `pcs`, `botol 275ml`, `renceng`).
   - For Milestone 3 (POS Cashier), if bulk weighed commodities (e.g. loose rice weighed at 1.5 kg) are introduced, the application repository layer should either represent inventory in base units (e.g., grams) or alter the column types to `NUMERIC(12, 3)`.
2. **PostgreSQL Environment**:
   - Verification was executed via static analysis and formal relational proof over PostgreSQL 15+ PL/pgSQL grammar due to command terminal permission denial in this session.

---

## 4. Conclusion

**Verdict: `APPROVE`**

Milestone 1 delivers a robust, ACID-compliant database foundation:
1. Walk-in guests are prevented from executing kasbon or savings transactions.
2. Savings wallet balances are guarded against overdraft in both POS checkout and manual withdrawal channels.
3. Debt repayments are strictly bounded by `current_debt`.
4. Product inventory is protected against negative stock decrements with row-level locking.
5. Referential actions (`ON DELETE RESTRICT`) preserve sales histories and ledger records.
6. The schema and seed data provide defense-in-depth security and are ready for Milestone 2 implementation.

---

## 5. Verification Method

To independently verify the Milestone 1 deliverables:

1. **Inspect Code Locations**:
   - `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\supabase\schema.sql`:
     - Lines 219–226: Guest kasbon guard in `fn_validate_transaction_limits`.
     - Lines 253–260: Savings balance guard in `fn_validate_transaction_limits`.
     - Lines 345–348: Stock availability guard in `fn_decrement_product_stock`.
     - Lines 383–386: Debt overpayment guard in `fn_process_debt_payment`.
     - Lines 424–427: Manual withdrawal guard in `fn_process_manual_savings_mutation`.
     - Lines 141, 164, 184: `ON DELETE RESTRICT` foreign key definitions.
2. **Execute Invariant Queries in Supabase SQL Editor / psql**:
   ```sql
   -- 1. Attempt guest kasbon transaction (Expected: FAIL with Pelanggan non-member/umum tidak diperkenankan kasbon)
   INSERT INTO transactions (invoice_number, customer_id, total_amount, discount_amount, final_amount, payment_method, cash_amount, savings_amount, debt_amount)
   VALUES ('TEST-001', NULL, 50000, 0, 50000, 'debt', 0, 0, 50000);

   -- 2. Attempt stock overdraft (Expected: FAIL with Stok tidak mencukupi)
   -- Using product with stock = 10, request 100
   INSERT INTO transaction_items (transaction_id, product_id, quantity, unit_price, price_type, subtotal)
   VALUES ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 100, 74000, 'retail', 7400000);

   -- 3. Attempt debt overpayment (Expected: FAIL with Jumlah pelunasan melebihi total kasbon)
   -- For customer 10000000-0000-0000-0000-000000000007 (debt = 125,000), pay 200,000
   INSERT INTO debt_payments (customer_id, payment_amount)
   VALUES ('10000000-0000-0000-0000-000000000007', 200000.00);

   -- 4. Attempt deleting product with transaction history (Expected: FAIL with foreign key violation)
   DELETE FROM products WHERE id = '20000000-0000-0000-0000-000000000001';
   ```
3. **Invalidation Conditions**:
   - Any scenario where a transaction with `debt_amount > 0` commits when `customer_id IS NULL`.
   - Any scenario where `products.stock_quantity < 0` or `customers.savings_balance < 0` occurs.
   - Any scenario where a product referenced in `transaction_items` can be deleted without error.

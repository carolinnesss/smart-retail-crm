# Task Assignment: Milestone 1 — Database Schema & Migration SQL (schema.sql & seed.sql)

## Mandatory Constraints
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Mandatory Inputs to Read
1. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md` (Authoritative user request)
2. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\PROJECT.md` (Global project architecture, milestones, interface contracts)
3. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_spec_miner_survey_2\handoff.md` (Deep database specification, DDL drafts, and seed catalog specifications)

## Scope & Exclusive File Ownership
You exclusively own and must create:
- `supabase/schema.sql` (at project root `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\supabase\schema.sql`)
- `supabase/seed.sql` (at project root `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\supabase\seed.sql`)

## Specific Requirements to Implement
1. **`supabase/schema.sql`**:
   - `store_settings`: single-row store identity & metadata.
   - `customers`: id, name, phone, address, customer_type ('Warung / Grosir' | 'Eceran'), max_credit_limit, current_debt, savings_balance, is_active, created_at, updated_at. Include CHECK constraints: `customer_type IN ('Warung / Grosir', 'Eceran')`, `current_debt <= max_credit_limit`, `current_debt >= 0`, `savings_balance >= 0`.
   - `products`: id, sku (unique), name, category, unit, retail_price, wholesale_price, stock_quantity, min_stock_alert, is_active. Include CHECK constraints: `retail_price > 0`, `wholesale_price > 0`, `wholesale_price <= retail_price`, `stock_quantity >= 0`.
   - `transactions`: id, invoice_number (unique), customer_id (FK), total_amount, discount_amount, final_amount, payment_method ('cash'|'savings'|'debt'|'split'), cash_amount, savings_amount, debt_amount, status ('completed'|'cancelled'|'refunded'), notes, created_at, updated_at. Include CHECK constraints: `final_amount = total_amount - discount_amount`, `final_amount = cash_amount + savings_amount + debt_amount`, components >= 0.
   - `transaction_items`: id, transaction_id (FK), product_id (FK), quantity, unit_price, price_type ('retail'|'wholesale'), subtotal. CHECK constraints: `quantity > 0`, `unit_price > 0`, `subtotal = quantity * unit_price`.
   - `debt_payments`: id, customer_id (FK), transaction_id (FK nullable), payment_amount (> 0), payment_date, notes.
   - `savings_mutations`: id, customer_id (FK), mutation_type ('deposit'|'withdrawal'|'payment'), amount (> 0), balance_after (>= 0), reference_id, notes.
   - Performance indexes on phones, names, categories, foreign keys, and status flags.
   - Automated triggers and functions:
     - `fn_validate_transaction_limits`: BEFORE INSERT ON transactions; validates debt limit (`current_debt + debt_amount <= max_credit_limit`) and savings balance (`savings_amount <= savings_balance`).
     - `fn_sync_transaction_balances`: AFTER INSERT ON transactions; updates `customers.current_debt` and `customers.savings_balance`, inserts audit record into `savings_mutations`.
     - `fn_decrement_product_stock`: AFTER INSERT ON transaction_items; validates stock and decrements `products.stock_quantity`.
     - `fn_process_debt_payment`: AFTER INSERT ON debt_payments; decrements `customers.current_debt` ensuring no overpayment.
     - `fn_process_manual_savings_mutation`: BEFORE INSERT ON savings_mutations; syncs `customers.savings_balance` on deposits and withdrawals, blocking overdraft.
   - Analytics RPC functions:
     - `get_store_financial_summary()`: returns today_sales, month_sales, total_active_debt, total_savings_deposits, total_low_stock_items.
     - `get_restock_predictions()`: heuristic EWMA analysis of customer purchase frequency and consumption cycle for staple sembako (Beras, Minyak Goreng, Gula Pasir, Telur Ayam, Tepung Terigu).

2. **`supabase/seed.sql`**:
   - `store_settings`: 'Toko Sembako Berkah Mandiri'.
   - `customers`: 7 realistic Indonesian profiles (Walk-in guest, Warung Bu Siti, Pak Joko Grosir, Warung Kopi Mas Dimas, Ibu Rini Eceran, Pak Bambang Guru Tetangga, Mbak Dewi Laundry) with pre-set credit limits, debts, and savings.
   - `products`: 30 authentic Indonesian sembako SKUs (Beras Ramos/Pandan Wangi, Minyak Bimoli/Filma/SunCo/Minyakita, Gulaku, Telur Negeri & Bebek, Tepung Segitiga Biru & Cakra, Indomie Goreng/Kuah & Mie Sedaap, Kecap Bango, Kopi Kapal Api) with authentic EAN-13 barcodes, wholesale vs retail prices, and Indonesian packaging units.
   - Sample historical transactions showcasing cash, kasbon, savings, and split payment with matching items and ledger entries.

## Verification
- Verify that SQL syntax is valid PostgreSQL 15+.
- Document your verification in your handoff report.

Write your report to:
`C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_worker_m1\handoff.md`
Notify the orchestrator via `send_message` when complete.


## 2026-11-01T05:30:51Z
Received dispatch from parent (9c878f79-9ef8-4cdf-8de9-d8a5a8571e4a):
Role: teamwork_preview_worker_m1
Task: Implement Milestone 1:
1. Create C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\supabase\schema.sql
2. Create C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\supabase\seed.sql

Implement complete PostgreSQL/Supabase DDL, CHECK constraints, foreign keys, indexes, triggers/functions for auto-balance and debt calculations, and analytics RPCs.
Implement 30 authentic Indonesian sembako catalog products and realistic customer profiles with historical transactions.

Write handoff report to C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_worker_m1\handoff.md
When complete, notify orchestrator via send_message.

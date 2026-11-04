# Reviewer 1 Task Assignment: Milestone 1 Database Verification

## Mandatory Inputs to Read
1. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md` (Authoritative user request)
2. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\PROJECT.md` (Project architecture, interface contracts, feature inventory)
3. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_worker_m1\handoff.md` (Worker M1 report)
4. Target files to review:
   - `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\supabase\schema.sql`
   - `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\supabase\seed.sql`

## Review Objectives
1. Verify schema correctness, completeness, data types, and PostgreSQL 15+ syntax validity.
2. Verify all 7 tables exist: `store_settings`, `customers`, `products`, `transactions`, `transaction_items`, `debt_payments`, `savings_mutations`.
3. Verify CHECK constraints: positive prices/stock, wholesale <= retail, split payment sums, non-negative debt and savings.
4. Verify trigger logic: `fn_validate_transaction_limits`, `fn_sync_transaction_balances`, `fn_decrement_product_stock`, `fn_process_debt_payment`, `fn_process_manual_savings_mutation`.
5. Verify RPC functions: `get_store_financial_summary()`, `get_restock_predictions()`.
6. Verify seed data authenticity: 30 sembako SKUs with EAN-13 barcodes, wholesale vs retail prices, 7 customer profiles, sample transactions.
7. Output your explicit verdict: `APPROVE` or `REQUEST_CHANGES` in your handoff report.

Write your report to:
`C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_reviewer_m1_1\handoff.md`
Notify the orchestrator via `send_message`.

## 2026-11-01T05:41:30Z
You are teamwork_preview_reviewer_m1_1.
Your working directory is:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_reviewer_m1_1

MANDATORY: Read the authoritative user request at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md
Also read the project architecture at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\PROJECT.md
And your task assignment at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_reviewer_m1_1\DISPATCH.md

Review C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\supabase\schema.sql and supabase\seed.sql.
Examine schema correctness, PostgreSQL 15+ syntax validity, constraints, triggers, and seed data.
Provide your verdict (APPROVE or REQUEST_CHANGES) in your handoff.md:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_reviewer_m1_1\handoff.md
When finished, notify orchestrator via send_message.

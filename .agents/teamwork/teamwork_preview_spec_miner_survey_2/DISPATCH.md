# Task Assignment: Database Schema & Migration Specification Mining

## Objective
Analyze ORIGINAL_REQUEST.md located at `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md` to design and extract the exact database specifications for:
1. R7: Complete PostgreSQL & Supabase schema:
   - `customers` (id, name, phone, address, customer_type: 'Warung / Grosir' | 'Eceran', max_credit_limit, current_debt, savings_balance, created_at, updated_at).
   - `products` (id, sku/barcode, name, category, unit, retail_price, wholesale_price, stock_quantity, min_stock_alert, is_active).
   - `transactions` (id, invoice_number, customer_id, total_amount, discount_amount, final_amount, payment_method: 'cash' | 'savings' | 'debt' | 'split', cash_amount, savings_amount, debt_amount, status, created_at).
   - `transaction_items` (id, transaction_id, product_id, quantity, unit_price, price_type: 'retail' | 'wholesale', subtotal).
   - `debt_payments` (id, customer_id, transaction_id, payment_amount, payment_date, notes).
   - `savings_mutations` (id, customer_id, mutation_type: 'deposit' | 'withdrawal' | 'payment', amount, balance_after, reference_id, notes, created_at).
   - `store_settings` (store_name, address, phone, header_note, footer_note).
2. Data integrity constraints (CHECK current_debt <= max_credit_limit, savings_balance >= 0, prices > 0, etc.).
3. Triggers/Functions for automatic balance & debt synchronization upon transactions, debt payments, and savings mutations.
4. Realistic Indonesian sembako catalog seed data (Beras Ramos/Pandan Wangi, Minyak Goreng Bimoli/Filma, Gula Pasir Gulaku, Telur Ayam Negeri, Tepung Terigu Segitiga Biru, Mie Instan Indomie, etc.) with wholesale and retail pricing, plus sample customer profiles (Warung Bu Siti, Pak Joko Grosir, Ibu Rini Eceran, etc.).

## Instructions
- Read `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md`.
- Produce a detailed schema and data specification report in your working directory:
  `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_spec_miner_survey_2\handoff.md`
- Include complete DDL designs, trigger logic, index strategy, and seed catalog specifications.
- Notify the orchestrator when completed via `send_message`.


## 2026-11-01T05:24:55Z
[Message] timestamp=2026-11-01T05:24:55Z sender=9c878f79-9ef8-4cdf-8de9-d8a5a8571e4a priority=MESSAGE_PRIORITY_HIGH content=You are teamwork_preview_spec_miner_survey_2.
Your working directory is:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_spec_miner_survey_2

MANDATORY: Read the authoritative user request at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md
Also read your task assignment at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_spec_miner_survey_2\DISPATCH.md

Your role is to deeply analyze requirement R7 and data architecture:
- Complete PostgreSQL & Supabase database schema (customers, products, transactions, transaction_items, debt_payments, savings_mutations, store_settings).
- Data integrity constraints, indexes, triggers and stored functions for auto-calculating debt and savings balances.
- Comprehensive realistic Indonesian sembako catalog seed data with wholesale & retail pricing and sample customer profiles.

Write your findings to:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_spec_miner_survey_2\handoff.md

When finished, use send_message to report completion to the orchestrator.

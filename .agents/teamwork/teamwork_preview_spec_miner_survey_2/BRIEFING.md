# BRIEFING — 2026-11-01T05:25:00Z

## Mission
Deeply analyze requirement R7 and data architecture: complete PostgreSQL & Supabase database schema, triggers, integrity constraints, indexes, and comprehensive realistic Indonesian sembako seed data catalog.

## 🔒 My Identity
- Archetype: SPECIFICATION MINER
- Roles: Database & Schema Specification Miner
- Working directory: C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_spec_miner_survey_2
- Original parent: 9c878f79-9ef8-4cdf-8de9-d8a5a8571e4a
- Milestone: Survey & Specification Mining (M1)

## 🔒 Key Constraints
- Read-only analysis: do not implement application code.
- Prioritize authoritative sources (ORIGINAL_REQUEST.md and DISPATCH.md).
- Enumerate full schema, constraints, triggers, indexes, and realistic Indonesian sembako catalog seeds.
- Document in handoff.md using Specification Miner tables (Features Discovered, Edge Cases) + 5-Component Handoff Report.

## Current Parent
- Conversation ID: 9c878f79-9ef8-4cdf-8de9-d8a5a8571e4a
- Updated: not yet

## Task Summary
- **What to build**: PostgreSQL & Supabase database schema specification (customers, products, transactions, transaction_items, debt_payments, savings_mutations, store_settings), SQL triggers & functions for debt and savings mutations, indexes, constraints, and Indonesian sembako seed data.
- **Success criteria**: Exhaustive schema DDL specification, trigger logic, index strategy, constraints, edge cases, and realistic sembako seed data catalog.
- **Interface contracts**: ORIGINAL_REQUEST.md R7 & R1-R6
- **Code layout**: Database schema and seed data specifications in handoff.md

## Loaded Skills
- None provided in dispatch.

## Key Decisions Made
- Use UUID primary keys (gen_random_uuid()) for Supabase compatibility and offline/client ID generation safety.
- Explicit CHECK constraints on credit limit and savings balances to guarantee database-level financial integrity.
- Design idempotent triggers for balance calculation on `transactions`, `debt_payments`, and `savings_mutations`.
- Structure realistic Indonesian sembako seed data covering Beras, Minyak Goreng, Gula Pasir, Telur Ayam, Tepung Terigu, Mie Instan, Susu & Kopi, Bumbu Dapur with both wholesale (karton/bal/karung) and retail (pcs/kg/liter) pricing.

## Artifact Index
- handoff.md — Complete Database Schema & Migration Specification Report

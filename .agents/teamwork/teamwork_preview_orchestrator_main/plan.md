# Plan — Smart Retail CRM & POS

## Objective
Deliver a production-grade, interactive Smart Retail CRM & POS web application for traditional Indonesian sembako stores (warung sembako) meeting all requirements R1-R7 and acceptance criteria in ORIGINAL_REQUEST.md.

## Execution Strategy (Project Orchestration)
1. **Phase 0: Survey & Scope Mapping**
   - Dispatch 3 parallel Explorers / Spec Miners:
     - Spec Miner 1: POS, Pricing, Kasbon Credit Enforcement, Savings Wallet & Split Payment logic.
     - Spec Miner 2: Database Schema (PostgreSQL/Supabase), Tables, Constraints, Triggers/Functions, Seed Data.
     - Spec Miner 3: Frontend Architecture, Route Handlers, Fallback Mock State, Dashboard & Restock Heuristics, CRM UI.
   - Synthesize findings into `PROJECT.md` (Architecture, Feature Inventory, Milestones, Interface Contracts, Code Layout).
2. **Phase 1: Database Foundation & Seed Data**
   - Implement `supabase/schema.sql` and `supabase/seed.sql` with full Indonesian sembako catalog, customer profiles, triggers, functions, and constraints.
3. **Phase 2: Fullstack Core & Data Access Layer**
   - Next.js (App Router, Tailwind CSS, Lucide Icons) with route handlers and universal data repository (Supabase client + realistic mock state fallback for instant zero-config preview and Vercel readiness).
4. **Phase 3: POS Cashier & Wholesale/Retail Pricing Engine**
   - Cashier interface, customer selector with dynamic pricing (wholesale_price vs retail_price), responsive cart, item discounts.
5. **Phase 4: Kasbon Protection & Debt Settlement**
   - Real-time limit check (current_debt + kasbon <= max_credit_limit), blocking violations, debt settlement/installment module.
6. **Phase 5: Store Savings Wallet & Split Payment**
   - Top-up, withdrawal, non-negative checks, split payment calculation (Cash + Savings + Kasbon).
7. **Phase 6: Smart Dashboard & Restock Heuristics**
   - Financial KPI cards (Omzet, Piutang, Saldo Tabungan), restock prediction algorithm for sembako essentials (beras, minyak, gula, telur, tepung).
8. **Phase 7: Centralized CRM & Audit Trail**
   - Customer profile, transaction history, savings mutations, debt history, customer tier management.
9. **Phase 8: Dual-Track E2E Testing & Hardening**
   - E2E tests, build verification (`npm run build`), unit/integration tests, forensic auditor verification.

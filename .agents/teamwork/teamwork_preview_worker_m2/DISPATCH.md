# Task Assignment: Milestone 2 — Fullstack Core, Universal Data Repository & API Route Handlers

## Mandatory Constraints
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Mandatory Inputs to Read
1. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md` (Authoritative user request)
2. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\PROJECT.md` (Project architecture, interface contracts, feature inventory, code layout)
3. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_explorer_survey_3\handoff.md` (Fullstack & repository architectural blueprint)
4. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\supabase\schema.sql` & `supabase\seed.sql` (Database schemas & seed data reference)

## Scope & Exclusive File Ownership
You exclusively own and must create:
- Project root config files: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `next.config.js`, `.env.example`
- Domain types & utils:
  - `src/lib/types.ts`: `ICustomer`, `IProduct`, `ITransaction`, `ITransactionItem`, `ISavingsMutation`, `IDebtPayment`, `IStoreSettings`, `IRestockPrediction`, `IFinancialKPIs`
  - `src/lib/formatters.ts`: `formatIDR()`, `formatDate()`, `normalizeWhatsAppPhone()`
  - `src/lib/heuristics.ts`: Sembako restock EWMA calculation engine for Beras, Minyak Goreng, Gula Pasir, Telur Ayam, Tepung Terigu
  - `src/lib/mock-data.ts`: Complete TypeScript seed data mirroring `supabase/seed.sql` (30 sembako SKUs, 7 customers, initial transactions & mutations)
  - `src/lib/supabase.ts`: Supabase client helper with graceful fallback check
- Universal Repository Layer (`src/lib/repository/`):
  - `interface.ts`: `IDataRepository` interface definition
  - `mock-repo.ts`: `MockDataRepository` (singleton, in-memory + optional localStorage/file persistence, atomic balance sync, credit limit validation, savings balance validation, stock decrement, restock predictions)
  - `supabase-repo.ts`: `SupabaseDataRepository` (Supabase PostgreSQL client implementation)
  - `index.ts`: `getRepository()` resolver checking if Supabase credentials are configured
- API Route Handlers:
  - `src/app/api/customers/route.ts` & `src/app/api/customers/[id]/route.ts`
  - `src/app/api/products/route.ts` & `src/app/api/products/[id]/route.ts`
  - `src/app/api/transactions/route.ts` & `src/app/api/transactions/[id]/route.ts`
  - `src/app/api/savings/route.ts`
  - `src/app/api/debt/route.ts`
  - `src/app/api/analytics/route.ts`
- Base Layout & Navigation Components:
  - `src/app/layout.tsx`: Root layout with font, metadata, Sidebar and Header
  - `src/app/page.tsx`: Foundation landing / dashboard view
  - `src/components/layout/Sidebar.tsx`: Navigation menu (Dashboard, Kasir POS, CRM Pelanggan, Inventaris Sembako)
  - `src/components/layout/Header.tsx`: Store header with ModeBadge
  - `src/components/layout/ModeBadge.tsx`: Displays `🟢 Supabase Connected` or `🟡 Mode Demo Mock State (Zero-Config)`

## Execution & Build Verification Requirement
- Install dependencies using `npm install` (Next.js, React, React-DOM, Tailwind CSS, Lucide React, @supabase/supabase-js, etc.).
- Run `npm run build` and ensure clean compilation with 0 TypeScript/ESLint errors.
- Document build commands and exact test output in your handoff report.

Write your report to:
`C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_worker_m2\handoff.md`
Notify the orchestrator via `send_message` when complete.

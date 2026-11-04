# Task Assignment: Milestone 3 — POS Cashier & Automatic Wholesale/Retail Pricing Engine

## Mandatory Constraints
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Mandatory Inputs to Read
1. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md` (Authoritative user request, R2 & AC: Kasir & POS)
2. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\PROJECT.md` (Project architecture, interface contracts, feature inventory, code layout)
3. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_spec_miner_survey_1\handoff.md` (Pricing logic, dynamic tier switching formulas, edge cases)
4. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_reviewer_m2_1\handoff.md` (Finding 1: Consolidate duplicate cart line items by SKU)

## Scope & Exclusive File Ownership
You exclusively own and must create/modify:
- `src/hooks/useCart.ts` (or `src/lib/cart-context.tsx`): Cart state manager reacting to customer tier changes.
- `src/components/pos/CustomerSelector.tsx`: Searchable customer selector showing tier badge ('Warung / Grosir' vs 'Eceran'), credit limit bar, current debt, and savings balance.
- `src/components/pos/ProductCatalogGrid.tsx`: Responsive product grid with category filter tabs (Semua, Beras, Minyak Goreng, Gula Pasir, Telur Ayam, Tepung Terigu, Mie Instan, Bumbu Dapur, Susu & Minuman), search bar, stock badges, and dynamic price tag reflecting active tier.
- `src/components/pos/CartSummary.tsx`: Interactive cart with item quantity controls (+/-, decimal support), line item discounts, item delete, subtotal, cart discount, grand total, and clear cart.
- `src/components/pos/QuickCashModal.tsx`: Cash checkout modal with preset denominations (Uang Pas, 50k, 100k, 200k, 500k) and cash change calculation.
- `src/components/pos/ReceiptModal.tsx`: Realistic Indonesian thermal receipt modal (Toko Sembako Berkah Mandiri) with print and new transaction actions.
- `src/app/pos/page.tsx`: Complete POS page integrating all components with real-time API sync (`/api/customers`, `/api/products`, `/api/transactions`).

## Core Business Requirements to Implement
1. **Dynamic Tier Price Switching**:
   - When customer is 'Warung / Grosir' -> item price automatically uses `product.wholesale_price`.
   - When customer is 'Eceran' or null -> item price automatically uses `product.retail_price`.
   - Switching or selecting a customer dynamically updates ALL items currently in the cart to the new tier price without clearing the cart.
2. **Duplicate Line Item Consolidation**:
   - Adding an item that already exists in the cart increments its quantity rather than appending a separate duplicate row.
3. **Cart Arithmetic & Discounts**:
   - `lineSubtotal = (quantity * appliedPrice) - itemDiscount`
   - `cartSubtotal = sum(lineSubtotals)`
   - `finalAmount = max(0, cartSubtotal - cartDiscount)`
4. **Checkout Execution**:
   - POSTs checkout payload to `/api/transactions`.
   - On success: decrements catalog stock in UI, displays thermal receipt modal, and resets cart.
   - On failure: displays descriptive error banner.

## Verification
- Test customer selection switching between Bu Siti (Grosir) and Ibu Rini (Eceran) -> verify prices switch automatically.
- Verify checkout creates transactions and receipt.
- Document verification steps and commands in handoff report.

Write your report to:
`C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_worker_m3\handoff.md`
Notify the orchestrator via `send_message` when complete.


## 2026-11-01T06:25:28Z
[Message] sender=9c878f79-9ef8-4cdf-8de9-d8a5a8571e4a priority=MESSAGE_PRIORITY_HIGH
You are teamwork_preview_worker_m3.
Your working directory is:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_worker_m3

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY: Read the authoritative user request at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md
Also read the project architecture at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\PROJECT.md
And your task assignment at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_worker_m3\DISPATCH.md
And spec miner 1 report at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_spec_miner_survey_1\handoff.md

Your task is to implement Milestone 3 (POS Cashier & Dynamic Pricing):
1. Build cart state manager in src/hooks/useCart.ts with automatic tier recalculation.
2. Build CustomerSelector component with instant search and tier badges.
3. Build ProductCatalogGrid with category tabs, search, and dynamic price tags.
4. Build CartSummary with quantity controls, line discounts, totals, and clear cart.
5. Build QuickCashModal with preset denominations and cash change.
6. Build ReceiptModal for Indonesian thermal receipt preview.
7. Integrate everything in src/app/pos/page.tsx connecting to /api/customers, /api/products, and /api/transactions.

Write your handoff report to:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_worker_m3\handoff.md

When complete, notify orchestrator via send_message.

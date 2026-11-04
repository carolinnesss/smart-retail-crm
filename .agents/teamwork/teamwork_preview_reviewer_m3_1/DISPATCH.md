# Reviewer 1 Task Assignment: Milestone 3 POS Cashier & Pricing Verification

## Mandatory Inputs to Read
1. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md` (Authoritative user request: R2 & POS acceptance criteria)
2. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\PROJECT.md` (Project architecture, interface contracts, feature inventory)
3. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_worker_m3\handoff.md` (Worker M3 report)
4. Target files to review:
   - `src/hooks/useCart.ts`
   - `src/components/pos/CustomerSelector.tsx`
   - `src/components/pos/ProductCatalogGrid.tsx`
   - `src/components/pos/CartSummary.tsx`
   - `src/components/pos/QuickCashModal.tsx`
   - `src/components/pos/ReceiptModal.tsx`
   - `src/app/pos/page.tsx`
   - `src/tests/unit/pos.test.ts`

## Review Objectives
1. Verify dynamic tier pricing switch:
   - Does item price switch automatically between `wholesale_price` (Warung / Grosir) and `retail_price` (Eceran / Walk-in)?
   - When customer changes, do existing line items in the cart recompute prices and subtotals automatically without clearing the cart?
2. Verify duplicate SKU consolidation:
   - When adding an existing product to the cart, does it increment quantity instead of adding a duplicate row?
3. Verify cart calculations:
   - Line subtotal = `quantity * appliedPrice - itemDiscount`.
   - Cart subtotal, global discount, and grand total.
4. Verify Quick Cash Modal & Thermal Receipt preview.
5. Verify unit tests in `src/tests/unit/pos.test.ts`.
6. Output explicit verdict: `APPROVE` or `REQUEST_CHANGES` in your handoff report.

Write your report to:
`C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_reviewer_m3_1\handoff.md`
Notify the orchestrator via `send_message`.

## 2026-11-01T06:40:01Z
[Message] sender=9c878f79-9ef8-4cdf-8de9-d8a5a8571e4a
You are teamwork_preview_reviewer_m3_1.
Your working directory is:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_reviewer_m3_1

MANDATORY: Read the authoritative user request at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md
Also read the project architecture at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\PROJECT.md
And your task assignment at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_reviewer_m3_1\DISPATCH.md

Review Milestone 3 implementation:
- src/hooks/useCart.ts (dynamic tier price switching, duplicate SKU consolidation, decimal arithmetic).
- POS components (CustomerSelector, ProductCatalogGrid, CartSummary, QuickCashModal, ReceiptModal).
- src/app/pos/page.tsx and unit test pos.test.ts.
Provide your verdict (APPROVE or REQUEST_CHANGES) in:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_reviewer_m3_1\handoff.md
When finished, notify orchestrator via send_message.

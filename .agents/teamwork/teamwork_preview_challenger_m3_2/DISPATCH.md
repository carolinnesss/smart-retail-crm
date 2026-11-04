# Challenger 2 Task Assignment: Milestone 3 Adversarial Invariants & Checkout Stress Testing

## Mandatory Inputs to Read
1. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md` (Authoritative user request)
2. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\PROJECT.md` (Project architecture, interface contracts, feature inventory)
3. Target files to verify:
   - `src/hooks/useCart.ts`
   - `src/app/pos/page.tsx`
   - `src/lib/repository/mock-repo.ts`

## Challenger Objectives
1. Empirically verify boundary invariants and checkout edge cases:
   - What happens when a product with 0 stock is clicked? (Must be disabled or blocked)
   - What happens when quantity reaches maximum stock in cart?
   - Duplicate SKU rapid clicking: does it maintain accurate consolidated quantities?
   - Cash payment with exact change (Kembalian = 0) vs overpayment (Kembalian > 0) vs underpayment (blocked).
2. Output explicit confirmation of correctness and verdict: `APPROVE` or `REQUEST_CHANGES` in your handoff report.

Write your report to:
`C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_challenger_m3_2\handoff.md`
Notify the orchestrator via `send_message`.

## 2026-11-01T06:40:01Z
You are teamwork_preview_challenger_m3_2.
Your working directory is:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_challenger_m3_2

MANDATORY: Read the authoritative user request at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md
Also read the project architecture at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\PROJECT.md
And your task assignment at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_challenger_m3_2\DISPATCH.md

Empirically verify boundary invariants and checkout edge cases:
- 0 stock products, max stock limits in cart.
- Rapid duplicate SKU additions.
- Cash change calculations and underpayment handling.
- End-to-end checkout flow.
Provide your verdict (APPROVE or REQUEST_CHANGES) in:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_challenger_m3_2\handoff.md
When finished, notify orchestrator via send_message.

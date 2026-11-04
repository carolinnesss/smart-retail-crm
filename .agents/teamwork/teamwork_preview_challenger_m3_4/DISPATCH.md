# Task Assignment: Milestone 3 Empirical Challenger 2 (Iteration 2)

**Assigned Agent**: `teamwork_preview_challenger_m3_4`  
**Role**: Empirical Challenger 2 (Checkout Invariants, Line Discounts & Edge Cases)  
**Working Directory**: `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_challenger_m3_4`  
**Timestamp**: 2026-11-01T07:15:00Z  

## Mandatory Reading
1. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md` (Verbatim user requirements)
2. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\PROJECT.md` (Project blueprint and architecture)
3. Worker M3_2 Remediation Handoff: `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_worker_m3_2\handoff.md`

## Verification Scope
Empirically test checkout invariants and stress-test boundary scenarios:
- Line item discount checkout flow: verify that applying item discounts does NOT throw `Pembayaran tidak seimbang`.
- Cart discount clamping in repository: verify that `cartDiscount > calculatedTotal` clamps `finalAmount` to `0` without error.
- Synchronous stock limit rejection: verify that adding or incrementing quantity beyond available stock immediately returns `{ success: false }` with zero state leakage.
- Customer re-selection post-checkout: verify that `selectedCustomer` is refreshed with authoritative server balances.

Provide your verdict (**APPROVE** or **REQUEST_CHANGES**) in:
`C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_challenger_m3_4\handoff.md`

When finished, notify orchestrator via `send_message`.

# Task Assignment: Milestone 4 Empirical Challenger 2 (Boundary Invariants & Adversarial Stress Tests)

**Assigned Agent**: `teamwork_preview_challenger_m4_2`  
**Role**: Empirical Challenger 2 (Invariants, Overdrafts & Checkout Defenses)  
**Working Directory**: `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_challenger_m4_2`  
**Timestamp**: 2026-11-01T07:42:00Z  

## Mandatory Reading
1. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md` (Verbatim user requirements R3 & R4)
2. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\PROJECT.md` (Project blueprint and architecture)
3. Worker M4 Handoff: `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_worker_m4\handoff.md`

## Verification Scope
Empirically stress-test boundary invariants and adversarial scenarios:
- Over-limit kasbon transactions: verify that `current_debt + requestedKasbon > max_credit_limit` is strictly blocked and triggers `KasbonGuardModal`.
- Savings overdrafts: verify that attempting to withdraw more than `savings_balance` is blocked with `savings_balance >= 0` invariant preserved.
- Walk-in customer restriction: verify that unauthenticated walk-in guests (`customer === null`) cannot use savings or kasbon.
- Debt overpayment: verify that paying more than `current_debt` is rejected.
- Negative tender exploit: verify that negative cash, savings, or debt amounts are rejected.

Provide your verdict (**APPROVE** or **REQUEST_CHANGES**) in:
`C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_challenger_m4_2\handoff.md`

When finished, notify orchestrator via `send_message`.

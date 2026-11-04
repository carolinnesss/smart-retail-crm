# Task Assignment: Milestone 4 Empirical Challenger 1 (Math & Split Payment Arithmetic)

**Assigned Agent**: `teamwork_preview_challenger_m4_1`  
**Role**: Empirical Challenger 1 (Math, Calculations & Test Suite)  
**Working Directory**: `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_challenger_m4_1`  
**Timestamp**: 2026-11-01T07:42:00Z  

## Mandatory Reading
1. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md` (Verbatim user requirements R3 & R4)
2. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\PROJECT.md` (Project blueprint and architecture)
3. Worker M4 Handoff: `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_worker_m4\handoff.md`

## Verification Scope
Empirically verify the mathematical equations and split payment allocations:
- 3-way split payment sum: verify that `cash_amount + savings_amount + debt_amount === final_amount` across various combinations (e.g. Rp 100.000 paid via Rp 30.000 savings + Rp 50.000 cash + Rp 20.000 debt).
- Cash change calculations when cash tendered exceeds required cash.
- Non-cash capping rules: savings capped to balance, kasbon capped to headroom.
- All 12 automated unit tests in `src/tests/unit/kasbon_savings.test.ts`.

Provide your verdict (**APPROVE** or **REQUEST_CHANGES**) in:
`C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_challenger_m4_1\handoff.md`

When finished, notify orchestrator via `send_message`.


## 2026-11-01T07:40:41Z
Received dispatch from 9c878f79-9ef8-4cdf-8de9-d8a5a8571e4a:
You are teamwork_preview_challenger_m4_1.
Empirically verify the mathematical equations and split payment allocations:
1. 3-way split payment sum: verify that cash_amount + savings_amount + debt_amount === final_amount across various combinations.
2. Cash change calculations when cash tendered exceeds required cash.
3. Non-cash capping rules: savings capped to balance, kasbon capped to headroom.
4. All 12 automated unit tests in src/tests/unit/kasbon_savings.test.ts.

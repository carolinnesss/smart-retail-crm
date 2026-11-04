# Dispatch Assignment for Challenger 2 (Milestone 5)

## Identity
- Role: Adversarial CRM & Ledger Invariant Challenger
- Working Directory: `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_challenger_m5_2`

## Mandatory Documents to Read
1. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md` (Authoritative user request)
2. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\PROJECT.md` (System architecture & feature inventory)
3. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_orchestrator_main\GATE_STATUS.md`

## Challenge Scope & Adversarial Testing
1. Stress-test customer CRUD operations in CRM:
   - Creating customer with blank name or invalid phone number.
   - Updating customer tier ('Warung / Grosir' <-> 'Eceran') and verifying that prices adapt correctly in future POS carts.
   - Updating credit limits: reducing `max_credit_limit` below `current_debt` (verifying warning and credit lock).
2. Stress-test the 3-Tab Multi-Ledger:
   - Ensure customer A's ledger entries (transactions, savings mutations, debt payments) never leak into customer B's tabs.
   - Test empty state handling when a brand-new customer has 0 transactions, 0 savings mutations, and 0 debt payments.
   - Verify ledger pagination or chronological sorting (newest first).
3. Test savings deposit and withdrawal from CRM modal:
   - Attempting withdrawal exceeding savings balance (must fail with non-negative invariant preserved).
   - Paying debt installment exceeding current debt (must fail or clamp).

## Deliverable
Write your complete test report with explicit verdict (**APPROVE** or **REQUEST_CHANGES**) to:
`C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_challenger_m5_2\handoff.md`
Notify the orchestrator via `send_message` when complete.

## 2026-11-01T07:55:40Z
[Message] timestamp=2026-11-01T07:55:40Z sender=9c878f79-9ef8-4cdf-8de9-d8a5a8571e4a priority=MESSAGE_PRIORITY_HIGH content=You are teamwork_preview_challenger_m5_2.
Your working directory is:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_challenger_m5_2

MANDATORY: Read the authoritative user request at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md
Also read the project architecture at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\PROJECT.md
And your task assignment at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_challenger_m5_2\DISPATCH.md

Empirically stress-test boundary invariants and adversarial scenarios for CRM and ledgers:
1. Customer lifecycle and validation: creating customer with edge cases, tier switching reflection.
2. Credit ceiling manipulation: reducing max_credit_limit below current_debt.
3. 3-Tab Multi-Ledger isolation: verify strict customer ID filtering so no cross-customer data leakage occurs across transactions, savings mutations, and debt installments.
4. Edge cases: customers with 0 transactions, 0 savings, 0 debt.
5. Savings withdrawal and debt payment boundary violations.

Provide your explicit verdict (APPROVE or REQUEST_CHANGES) in:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_challenger_m5_2\handoff.md
When finished, notify orchestrator via send_message.

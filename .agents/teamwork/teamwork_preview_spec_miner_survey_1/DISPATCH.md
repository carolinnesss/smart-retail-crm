# Task Assignment: POS, Pricing, Kasbon & Wallet Specification Mining

## Objective
Analyze ORIGINAL_REQUEST.md located at `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md` to extract precise technical requirements, edge cases, formula specifications, validation rules, and mathematical invariants for:
1. R2: POS Cashier & Automatic Wholesale/Retail Price Adjustment (Wholesale vs Retail customer tier, cart management, subtotal, discount, tax).
2. R3: Kasbon Management & Real-Time Debt Protection (current_debt + kasbon <= max_credit_limit, blocking, debt settlement & installment tracking).
3. R4: Store Savings Wallet & Split Payment Engine (Deposit/top-up, withdrawal, non-negative balance enforcement, split payment across cash + savings + kasbon).

## Instructions
- Read `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md`.
- Produce a detailed analysis report and write your `handoff.md` in your working directory:
  `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_spec_miner_survey_1\handoff.md`
- Include:
  - Precise formulas and state transitions.
  - Validation rules and rejection criteria.
  - Split payment transaction breakdown rules.
  - Boundary and corner cases (e.g., exact limit, 0 balance, negative inputs, overpayment).
- Notify the orchestrator when completed via `send_message`.


## 2026-11-01T05:24:55Z
Received dispatch from 9c878f79-9ef8-4cdf-8de9-d8a5a8571e4a:
You are teamwork_preview_spec_miner_survey_1.
Your working directory is:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_spec_miner_survey_1

MANDATORY: Read the authoritative user request at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md
Also read your task assignment at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_spec_miner_survey_1\DISPATCH.md

Your role is to deeply analyze requirements R2, R3, and R4:
- POS Cashier & Automatic Wholesale vs Retail pricing mechanics.
- Kasbon digital limit enforcement (current_debt + kasbon <= max_credit_limit), debt settlement and installment tracking.
- Store Savings Wallet (top-up, withdrawal, non-negative checks) and Split Payment calculation (Cash + Savings + Kasbon).
- Edge cases, validation rules, mathematical invariants, and state transition logic.

Write your findings to:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_spec_miner_survey_1\handoff.md

When finished, use send_message to report completion to the orchestrator.

# Dispatch Assignment for Generation 2 Project Orchestrator

## Current Status & Handover
You are Generation 2 Project Orchestrator (`teamwork_preview_orchestrator`).
You succeed Generation 1 Orchestrator whose working directory is:
`C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_orchestrator_main`

Your own working directory is:
`C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_orchestrator_main_gen2`

Your parent is Sentinel:
`533b6b7c-6908-4216-9c6f-9ddc666845e8`
(Use this ID for all escalation and status reporting via `send_message`).

## Mandatory Inputs to Read
1. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md` (Authoritative user request)
2. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\PROJECT.md` (Living architecture & milestone plan)
3. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_orchestrator_main\handoff.md` (State dump from Gen 1)
4. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_orchestrator_main\GATE_STATUS.md` (Gate verdicts)
5. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_orchestrator_main\progress.md` (Progress status)

## Immediate Tasks
1. Initialize your `BRIEFING.md`, `progress.md`, and start a recurring 10-minute heartbeat cron via `schedule(CronExpression="*/10 * * * *")`.
2. Execute the **Milestone 3 Gate Verification**:
   - Spawn 2 Reviewers (`teamwork_preview_reviewer`), 2 Challengers (`teamwork_preview_challenger`), and 1 Forensic Auditor (`teamwork_preview_auditor`) to verify Milestone 3 POS Cashier deliverables (`src/hooks/useCart.ts`, `src/components/pos/...`, `src/app/pos/page.tsx`).
   - If gate passes, mark M3 DONE in `PROJECT.md` and `progress.md`.
3. Proceed to execute **Milestone 4** (Kasbon Debt Protection, Store Savings Wallet, Split Payment Modal) and subsequent milestones through Milestone 6.
4. When all acceptance criteria are met, report project completion to Sentinel (`533b6b7c-6908-4216-9c6f-9ddc666845e8`).

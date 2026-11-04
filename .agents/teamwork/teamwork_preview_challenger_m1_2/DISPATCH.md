# Challenger 2 Task Assignment: Milestone 1 Stress Verification & Integrity Invariants

## Mandatory Inputs to Read
1. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md` (Authoritative user request)
2. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\PROJECT.md` (Project architecture, interface contracts, feature inventory)
3. Target files to verify:
   - `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\supabase\schema.sql`
   - `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\supabase\seed.sql`

## Challenger Objectives
1. Verify database triggers and stored functions under adversarial conditions:
   - What happens when a walk-in guest attempts a kasbon transaction?
   - What happens if savings withdrawal exceeds available balance?
   - What happens if repayment exceeds current debt?
   - What happens if someone purchases 100 units when stock is 10?
2. Verify foreign key referential actions (e.g. `ON DELETE RESTRICT` on products preventing orphan transaction items).
3. Confirm whether `schema.sql` and `seed.sql` provide robust defensive guarantees.
4. Output your explicit confirmation of correctness and verdict: `APPROVE` or `REQUEST_CHANGES` in your handoff report.

Write your report to:
`C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_challenger_m1_2\handoff.md`
Notify the orchestrator via `send_message`.

## 2026-11-01T05:41:30Z
You are teamwork_preview_challenger_m1_2.
Your working directory is:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_challenger_m1_2

MANDATORY: Read the authoritative user request at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md
Also read the project architecture at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\PROJECT.md
And your task assignment at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_challenger_m1_2\DISPATCH.md

Empirically stress-test triggers, boundary invariants, overdraft defenses, and stock enforcement logic in supabase\schema.sql.
Provide your verdict (APPROVE or REQUEST_CHANGES) in your handoff.md:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_challenger_m1_2\handoff.md
When finished, notify orchestrator via send_message.

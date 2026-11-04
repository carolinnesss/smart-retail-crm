# Challenger 1 Task Assignment: Milestone 2 Empirical Stress & Logic Verification

## Mandatory Inputs to Read
1. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md` (Authoritative user request)
2. `C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\PROJECT.md` (Project architecture, interface contracts, feature inventory)
3. Target files to verify:
   - `src/lib/repository/mock-repo.ts`
   - `src/lib/heuristics.ts`
   - `src/lib/formatters.ts`
   - `src/tests/unit/repository.test.ts`

## Challenger Objectives
1. Perform static and structural empirical analysis of `mock-repo.ts` and `heuristics.ts`.
2. Test mathematical correctness:
   - Verify `calculateSplitPayment` logic and invariant defenses in `mock-repo.ts`.
   - Verify `validateKasbonLimit`: what happens when limit is exactly met? What happens when exceeded by Rp 1?
   - Verify `validateSavingsBalance`: what happens when balance is exactly met? What happens when exceeded by Rp 1?
   - Verify EWMA restock prediction math: test against customer purchase date intervals and category priors.
3. Check `src/tests/unit/repository.test.ts` test coverage.
4. Output explicit confirmation of correctness and verdict: `APPROVE` or `REQUEST_CHANGES` in your handoff report.

Write your report to:
`C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_challenger_m2_1\handoff.md`
Notify the orchestrator via `send_message`.


## 2026-11-01T06:03:04Z
You are teamwork_preview_challenger_m2_1.
Your working directory is:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_challenger_m2_1

MANDATORY: Read the authoritative user request at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\ORIGINAL_REQUEST.md
Also read the project architecture at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\PROJECT.md
And your task assignment at:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_challenger_m2_1\DISPATCH.md

Empirically verify the mathematical and algorithmic correctness of Milestone 2:
- MockDataRepository transaction calculations, split payments, credit ceiling limits, savings guards.
- Heuristics EWMA restock prediction math for the 5 staple sembako categories (Beras, Minyak Goreng, Gula Pasir, Telur Ayam, Tepung Terigu).
- Check unit test suite in src/tests/unit/repository.test.ts.
Provide your verdict (APPROVE or REQUEST_CHANGES) in:
C:\Users\lenovo\.gemini\antigravity\scratch\smart-retail-crm\.agents\teamwork\teamwork_preview_challenger_m2_1\handoff.md
When finished, notify orchestrator via send_message.

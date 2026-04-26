# Changelog

All changes to the CGM Ventures Deal Calculator are recorded here.
Format: `[Phase] Date — What changed and why.`

---

## Phase 1 — Calculator Logic ✅ Complete

**All formulas implemented and verified against `Deal Calc CGM V2.xlsx` column C (Anna TX deal, col 18).**

### Built
- Property input form: address, PP, ARV, rehab, rent, all expenses, overrides
- Custom expense line items with funded/not-funded toggle
- Property management: percent or fixed dollar
- Lender settings panel: HML + Refi, fully configurable per deal
- Scenario Analysis: HML and Cash (tabs mobile / two columns desktop)
- Cash-Out Refinance card
- Monthly Cash Flow / PITI card
- Maximum Allowable Offer card
- `?` hover tooltip on every calculated field
- At-a-Glance summary bar: ARV, All-In, Equity, Monthly NOI
- Deal score: Equity + ROI + Location (sum out of 30)
- Excel verification scripts: `scripts/verify_excel.py` + `scripts/run_calc.mjs`

### Bugs fixed during validation
1. HML rehab financing fallback — `hmlLoanRehab = 0` incorrectly fell back to leverage % when dollar-amount mode was active
2. Cash money-in-deal — missing `otherAdjustmentsAtClose` deduction
3. `ppFinancedAmt` / `rehabFinancedAmt` not included in `DealResults` return
4. `refiTitleCosts` naming mismatch between `calculations.ts` and `RefiCard.tsx`

---

## Phase 1.5 — UI/UX Overhaul ⚠️ Status Unknown

Planned per `docs/new/SPEC.md` v2.0 and `docs/new/PLAN.md`.
**Completion not yet confirmed.** Verify current UI state before starting Phase 2.

Sub-phases planned:
- **A** — Custom expense data model (frequency: one-time / monthly / annual)
- **B** — Formula modal (click-triggered, `FormulaModal.tsx`, `formulaRegistry.ts`)
- **C** — Two-panel layout (inputs left 320px sticky / results right scrollable)
- **D** — Results panel content (KPI strip, 3 scenario tabs, scorecard, MAO block, custom expense summary)

**Action required:** At the start of the next session, inspect the current codebase and update this
entry to mark each sub-phase ✅ or ❌, then update this file accordingly before proceeding to Phase 2.

---

## Phase 2 — Google Sheets API + Deal Persistence 🔜 Next

See `docs/new/PLAN.md` for full spec.

Key decision: deals are saved to a new **`DEALS_APP` tab** in the existing `Deal Calc CGM V2`
Google Sheet. The `CALC - BRRRR` tab is never modified by the app.

---

## How to Update This File

After completing each phase, add an entry here:

```
### Phase X — [Name] ✅ Complete
Date: YYYY-MM-DD

**Changed:**
- `file` — [what changed]

**Verified:** Excel verification script passed all 12 checks.
```

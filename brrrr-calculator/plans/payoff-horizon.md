# Plan: Payoff Horizon Analysis (Refi Term Sheets)

> Source: melted design session 2026-07-07 (review of an external claude.ai prompt; all its
> golden fixtures were independently re-verified to the dollar before adoption).

## Architectural decisions

Durable decisions that apply across all phases:

- **Motivation**: the optimal refi choice depends on *when* the loan is paid off (sale, next
  refi). Three costs trade off: upfront closing costs (including rate-buydown points),
  cumulative interest, and the prepayment penalty (PPP). The matrix makes the tradeoff visible
  per deal.
- **Buydown is points, not dollars**: new Deal field `refiBuydownPoints` (whole-number percent
  of the refi loan, default `0`) — distinct from `refiPoints` (origination: pure cost) because
  buydown purchases a benefit (lower rate / better PPP). Stored as a percent so it stays
  correct when ARV/LTV changes the loan amount.
- **Deliberate, user-approved engine change (the only one)**: `calcRefi()` in
  `lib/deal-model.ts` adds buydown dollars (`refiLoan × refiBuydownPoints / 100`) into
  `totalRefiClosing`. With the `0` default every existing golden value is unchanged — goldens
  must pass byte-identical *before* new golden cases with nonzero buydown are added. Record as
  ADR-0004.
- **PPP fields are engine-inert Deal fields**: `refiPppSchedule: number[]` (yearly penalty
  percentages, e.g. `[5,5,5]`; empty = no PPP; default `[]`) lives on `Deal` so the Term Sheet
  machinery (extract/apply/sync/persist/draft) handles it for free. `calcRefi()` never reads
  it. Both new fields join `REFI_TERM_FIELDS` in `lib/term-sheets.ts`. Refi role only — HMLs
  are short-term, no PPP modeling.
- **Cell formula — full closing costs, not buydown-only**:
  `cell(sheet, H) = totalRefiClosing(sheet) + cumulativeInterest(H) + penalty(H)`.
  Principal is excluded (cancels when loan amounts are equal; term-length differences never
  break comparability because `scheduledPrincipalPaid + remainingBalance = L` at every
  horizon). Fee differences between lenders count. Nominal sums only — no NPV/discounting.
- **Penalty**: `penalty(H) = schedule[ceil(H×12/12) − 1] / 100 × remainingBalance(H×12)` when
  `H×12 ≤ schedule.length×12`, else `0`. **Boundary convention: payoff at exactly the end of
  the final PPP year is penalty-free** (`payoffMonth > pppMonths` → free; month 36 of a 3-year
  PPP pays nothing). Basis is always remaining balance (original-balance basis cut as YAGNI).
  Code comment: verify the convention against each lender's actual note language.
- **Cut from scope (decided, not forgotten)**: interest-only periods (`ioMonths`) — the frozen
  engine's cashflow/DSCR/IRR would contradict the matrix on the same page; `pppBasis` toggle;
  per-deal editable horizons.
- **Horizons**: fixed module constant `[3, 5, 7, 10, 15, 20]` years. Nothing persisted,
  no editor. Changing defaults later is a one-line commit.
- **Pure module**: `lib/payoff-horizon.ts` — no React, no I/O, no imports from the engine.
  Takes `{ loanAmount, annualRatePct, termYears, pppSchedule, upfrontCost }` per sheet plus the
  horizon list; returns cumulative interest, remaining balance, penalty, and total per cell.
  The caller (comparison UI) supplies `upfrontCost` from the engine's own `totalRefiClosing`
  per candidate — the module never re-derives closing costs.
- **UI placement**: matrix inside the existing Refi comparison section. Rows = horizons,
  columns = Refi Term Sheets. Cheapest cell per row gets the existing "winner" treatment; cells
  with an active penalty carry an indicator (tooltip/badge with the penalty amount). Column
  headers show each sheet's monthly P&I (from the engine run) and, when loan amounts differ,
  each column's loan amount plus a one-line warning that costs are not directly comparable —
  no normalization. Recomputes live with the comparison rows.
- **Persistence**: the new fields ride inside each sheet's `terms` (`Partial<Deal>`) in the
  column-I blob — codec and `BLOB_VERSION` unchanged. Older deals/drafts/blobs without the
  fields load with defaults (`0`, `[]`) — zero migration, same as ADR-0003. Bad-blob
  (`unreadable`) behavior is untouched.
- **PPP input UI**: one text field per the selected sheet, accepting `5,5,5` or `5/5/5`,
  parsed to the array on blur (blur-to-commit, `FormControls.tsx` pattern); unparseable input
  shows a validation hint and does not commit.
- **Gates every phase**: `npm test`, `npx tsc --noEmit`, `npm run build` — then commit + push.

---

## Phase 1: Buydown + PPP fields — engine, form, persistence

### What to build

The two new Deal fields end-to-end. `refiBuydownPoints` (default 0) and `refiPppSchedule`
(default `[]`) added to the `Deal` interface and `DEFAULT_DEAL`; the one-line approved change
in `calcRefi()` folding buydown dollars into `totalRefiClosing`; ADR-0004 recording the
deliberate engine change; both fields in `REFI_TERM_FIELDS`; form inputs in the refi section
(numeric buydown-points field, PPP schedule text field with parse-on-blur); saved-deal loading
defaults missing fields. User-visible result: entering buydown points changes total cash in /
money left in deal / CoC, and each Refi Term Sheet remembers its own buydown and PPP schedule
across select-swaps, saves, and drafts.

### Acceptance criteria

- [x] All existing golden tests pass **unchanged** with the engine edit in place (zero-default
      proof), and new golden cases cover nonzero `refiBuydownPoints`
- [x] ADR-0004 documents the approved `totalRefiClosing` change
- [x] Buydown points and PPP schedule are editable per selected Refi Term Sheet; switching
      sheets swaps both values losslessly; the PPP text field round-trips `5,5,5` and `5/4/3/2/1`
      and rejects garbage without committing
- [x] Save/reload and localStorage drafts restore both fields per sheet; a pre-existing saved
      deal (or old draft) opens with buydown 0 and no PPP — no migration, no crash
- [x] Gates pass: goldens green, tsc clean, production build succeeds

---

## Phase 2: Payoff Horizon matrix

### What to build

`lib/payoff-horizon.ts` (amortization, cumulative interest, remaining balance, step-down
penalty with the boundary convention, total per cell) with its own golden tests pinned to the
verified fixtures below — then the matrix UI in the Refi comparison section: one row per
horizon, one column per Refi Term Sheet, currency cells, cheapest-per-row highlighted, penalty
indicator with amount, P&I (and loan amount when amounts differ) in column headers, the
unequal-loan-amounts warning line, live recompute on any input/sheet change.

### Golden fixtures (independently verified; L = $210,000, 30-year fixed, tolerance ±$1)

P&I: 7.000% → $1,397.14 · 7.375% → $1,450.42 · 7.625% → $1,486.37

| Rate | Horizon | cumInterest | Balance | Penalty (5% sched) |
|---|---|---|---|---|
| 7.375%, PPP [5,5,5] | 3 yr | $45,798 | $203,583 | $0 — window just closed |
| 7.625%, PPP [5,5,5] | 3 yr | $47,383 | $203,874 | $0 |
| 7.250%, PPP [5,5,5,5,5] | 3 yr | $45,007 | $203,434 | $10,172 |
| 7.000%, PPP [5,5,5,5,5] | 5 yr | $71,504 | $197,676 | $0 |
| 7.000%, PPP [5,5,5,5,5] | 20 yr | $245,643 | $120,330 | $0 |

Edge cases: payoff at exactly `pppMonths` → penalty 0; month 48 with a 5-year PPP → year-4
percentage applies; empty schedule → always 0; horizon ≥ loan term → balance 0, penalty 0,
cumInterest = total loan interest; differing terms (30-yr vs 40-yr, same L) → identity
`scheduledPrincipalPaid + balance = L` holds at every horizon.

### Acceptance criteria

- [x] `payoff-horizon` unit tests pin all fixtures and edge cases above
- [x] Matrix renders in the Refi comparison section with winner-per-row highlighting and
      penalty indicators showing the penalty amount
- [x] Column headers show each sheet's monthly P&I; with differing loan amounts the headers
      show loan amounts and the warning line appears; with equal amounts it doesn't
- [x] Editing any deal input or Term Sheet updates the matrix immediately, consistent with the
      existing comparison table
- [x] Cell totals equal `totalRefiClosing + cumInterest + penalty` using the engine's own
      closing-cost figure per candidate sheet
- [x] Gates pass: goldens green, tsc clean, production build succeeds

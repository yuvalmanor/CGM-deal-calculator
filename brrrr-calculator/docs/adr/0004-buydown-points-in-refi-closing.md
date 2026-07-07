# Rate-buydown points are a refi closing cost in the frozen engine

Status: accepted (2026-07-07)

The Payoff Horizon feature needs rate-buydown points modeled per Refi Term Sheet: paying
points upfront to buy a lower rate (or a better prepayment-penalty schedule) is exactly the
tradeoff the horizon matrix exists to expose. This ADR records the **one deliberate,
user-approved change** to the otherwise frozen engine (`lib/deal-model.ts`):

- New `Deal` field `refiBuydownPoints` (whole-number percent of the refi loan, default `0`).
  It is a percent, not dollars, so the cost stays correct when ARV or LTV changes the loan
  amount. It is distinct from `refiPoints` (origination — a pure cost) because buydown
  purchases a benefit; keeping them separate keeps Term Sheets honest when comparing lenders.
- `calcRefi()` adds the buydown dollars (`refiLoan × refiBuydownPoints / 100`) into
  `totalRefiClosing`, so buydown flows into total cash in, cash returned at refi, money in
  deal, and CoC like any other closing cost.
- New `Deal` field `refiPppSchedule: number[]` (prepayment-penalty percent per year, e.g.
  `[5,5,5]`; empty = none, default `[]`) rides along as an **engine-inert** field: it lives on
  `Deal` so the Term Sheet extract/apply/sync/persist machinery handles it for free, but
  `calcRefi()` never reads it — only the payoff-horizon analysis does.

## Zero-default proof

With the `0` / `[]` defaults, every pre-existing golden value is unchanged. The change was
landed in this order: engine edit first, full golden suite passing **byte-identical**, and
only then were new golden cases with nonzero `refiBuydownPoints` (and a nonzero, provably
ignored `refiPppSchedule`) captured and reviewed. Older saved deals, localStorage drafts, and
settings-column blobs that lack the fields load with the defaults — zero migration, same
posture as ADR-0003.

## Consequences

- `docs/brrrr-cheat-sheet.md` and the old workbook know nothing of buydown points; this
  divergence is deliberate (see ADR-0002 for the general rule).
- Any future engine change still requires this same process: explicit user approval, the
  zero-default (or equivalent) proof, golden re-capture with a reviewed diff, and an ADR.

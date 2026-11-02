# Engine-inert Deal fields, and new Scenarios outside the frozen engine

Status: accepted (2026-10-31)

The Buy & Hold Scenario (`plans/buy-and-hold.md`) needs new per-Deal inputs and its own
math, while the formula engine stays frozen (ADR-0002) and its goldens stay byte-identical.
This ADR records how both are allowed.

## Engine-inert fields may be added to `Deal`

The `Deal` interface and `DEFAULT_DEAL` live in `lib/deal-model.ts` beside the frozen
formulas. A field **no engine function reads** may be added there — the interface gains the
field, `DEFAULT_DEAL` gains an inert value — with no other line of the file touched. This
follows the `refiPppSchedule` precedent (ADR-0004), and the user chose it over declaring the
fields from a side file (2026-10-31): one place lists every field a Deal stores, and every
field always has a value, so no reader handles "missing".

Buy & Hold adds three: `bnhLoanPct` (80, a Refi lender term in `REFI_TERM_FIELDS`),
`bnhValueBasis` (`'arv'`) and `strategy` (`'brrrr'`). A fourth, `bnhTitleCost`, was
removed on 2026-11-02 (the title policy is an Additional Refi Fee instead); removing an
engine-inert field follows the same rule as adding one. Old saved rows, drafts and Term
Sheets load with `BLANK_DEAL`'s values for them — zero migration, same posture as ADR-0003.

**Proof each time:** the golden suite passes with no golden file changed. A field that
changes any golden value is not engine-inert and goes through ADR-0004's engine-change
process instead.

## New Scenarios live outside the engine

A new Scenario is its own pure module (`lib/buy-hold.ts`) that imports only the engine's
**exported** building blocks (`monthlyOpExpenses`, `totalRehab`; later `calcDealScore` and
`calcMAO`). Private engine helpers are never exported to serve it — the module carries its
own amortization/IRR helpers. Scoring rules are reused through the engine's scoring
function, never copied.

## Consequences

- A formula that turns out wrong in a new Scenario is fixed in that Scenario's module, never
  in the engine.
- New Scenario math is tested in its own suite with hand-worked expected values; the golden
  suite keeps proving the engine untouched.
- Some duplication with the engine (amortization) is accepted as the price of the freeze.

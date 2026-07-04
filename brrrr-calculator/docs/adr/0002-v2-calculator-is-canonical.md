# The V2 calculator is canonical; V1 is retired

The repo once contained two complete calculators. V1 (`components/DealCalculator.tsx` → `components/sections/*` → `lib/calculations.ts`, with a `(DealInputs, LenderSettings)` two-object model) was the original build, verified cell-by-cell against the `CALC - BRRRR` Excel tab by `scripts/verify_excel.py`. V2 (`components/cgm/*` → `lib/deal-model.ts`, with a single flat `Deal` model) was built later and became the calculator every route actually renders — but the docs and the mandatory verification gate still described V1. In July 2026 a feature plan was authored against the dead V1 model before anyone noticed; that incident triggered the retire-legacy-calculator plan (`plans/retire-legacy-calculator.md`), which deleted the entire V1 tree. Git history is the archive — there are no in-repo compatibility shims, and the historical V1 docs live in `docs/archive/` with banners.

Two consequences of that decision need to stay on the record:

1. **The Excel verification gate was replaced by golden-value tests.** `scripts/verify_excel.py` verified V1's formulas against the workbook; it could not verify V2 and was deleted together with the engine it checked. The formula gate is now `tests/deal-model.golden.test.ts` — golden-value snapshots of `calcBRRRR`, `calcFlipCash`, `calcFlipHML`, `calcMAO`, and `calcDealScore`, run via `npm test`. The golden numbers were captured from the live engine and eyeballed/approved by the owner (2026-07-04, cross-checked against the live saved Anna TX deal).

2. **`lib/deal-model.ts` formulas intentionally diverge from the old Excel workbook.** V2 is not a port of V1 or of `Deal Calc CGM V2.xlsx`; it deliberately changes several formulas — e.g. HML interest carry runs to `max(rehabMonths, refiSeasoningMonths)` rather than the stated rehab months, DSCR follows the cheat-sheet definition `rent / (P&I + tax + ins)`, flip carry uses all operating expenses, and MAO adds the 70%-rule constraint. A difference between `deal-model.ts` and the workbook (or the archived V1 docs) is not a bug. The business-side description of the original workbook is kept at `docs/brrrr-cheat-sheet.md`; the engine's own reference is `docs/calculations.md`.

## Consequences

- `lib/deal-model.ts` is the sacred engine: do not modify it; suspected formula bugs are reported, never fixed silently. A deliberate, user-approved formula change re-captures goldens with `UPDATE_GOLDEN=1 npm test` and the diff must be reviewed.
- The mandatory gates are `npm test` + `npx tsc --noEmit` + `npm run build`. Nothing references `verify_excel` anymore; do not resurrect it.
- The API accepts only the flat V2 payload (`Deal` JSON in `inputsJson`, `"v2"` sentinel in `settingsJson`). Saved rows with unrecognized shapes fail loudly on load (`lib/parse-saved-deal.ts`) instead of being backfilled with defaults.
- Anything in `docs/archive/` describes the retired calculator and must not be treated as a spec.

# Technical Architecture

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Vercel-native; server components + API routes keep the Sheets credentials server-side |
| Language | TypeScript | Type safety across the calculation pipeline — the `Deal` model has ~60 fields feeding ~70 outputs |
| Styling | Tailwind CSS | Mobile-first utility classes, no runtime overhead |
| Components | Custom (no external library) | The UI requirements are simple enough to implement directly |
| State | React `useState` + `useMemo` | All outputs are pure functions of the `Deal` — no state manager needed |
| Tests | Vitest | Golden-value tests freeze the formula engine (`npm test`) |
| Database | Google Sheets (`DEALS_APP` tab) | Owner-specified; human-inspectable |
| Hosting | Vercel | Auto-deploys on push to `main` |

---

## Project Structure

```
brrrr-calculator/
├── app/
│   ├── layout.tsx                    Root layout, sticky header, nav
│   ├── page.tsx                      Dashboard (server component, cached deal list)
│   ├── api/deals/route.ts            GET list + POST new deal
│   ├── api/deals/[id]/route.ts       GET + PUT + DELETE by id
│   └── deal/
│       ├── new/page.tsx              Blank calculator (seeded from DEFAULT_DEAL)
│       └── [id]/page.tsx             Server component — loads a saved deal
│
├── components/
│   ├── DealCalculator.tsx            Main calculator — owns all deal state
│   ├── DealCard.tsx                  Dashboard deal summary card (with delete)
│   ├── DealFilters.tsx               Dashboard text search + address dropdown
│   ├── cgm/                          Calculator UI (CGM brand namespace)
│   │   ├── DashboardBar.tsx          KPI strip + scorecard
│   │   ├── InputForm.tsx             Left-panel input form
│   │   ├── ScenarioPanel.tsx         Rental BRRRR / Flip-Cash / Flip-HML tabs
│   │   └── FormControls.tsx          Numeric inputs (blur-to-commit), toggles
│   └── ui/FormulaModal.tsx           `?` formula explanation modal
│
├── lib/
│   ├── deal-model.ts                 Deal model + formula engine — DO NOT MODIFY
│   ├── formulaRegistry.ts            Content for every FormulaModal entry
│   ├── modalContext.ts               React context for the formula modal
│   ├── parse-saved-deal.ts           Validates saved-row JSON is a V2 Deal shape
│   └── sheets.ts                     Google Sheets wrapper — SERVER-SIDE ONLY
│
├── tests/
│   ├── deal-model.golden.test.ts     Golden tests freezing the engine
│   ├── golden/                       Captured golden values
│   └── parse-saved-deal.test.ts      Saved-shape validation tests
│
└── docs/                             This documentation (archive/ = retired V1 docs)
```

---

## Data Flow

```
User edits a field (blur-to-commit, FormControls.tsx)
        │
        ▼  onChange(Partial<Deal>)
DealCalculator.tsx  ←── holds useState<Deal>; drafts persist to
        │               localStorage key 'cgm-deal-calc-v2'
        ▼  useMemo([deal])
calcBRRRR(deal) / calcFlipCash(deal) / calcFlipHML(deal) /
calcMAO(deal) / calcDealScore(deal, brrrr, mao)      ← pure functions
        │
        ├── DashboardBar (KPI strip + scorecard)
        ├── ScenarioPanel (Rental BRRRR / Flip-Cash / Flip-HML)
        └── FormulaModal (live numbers via lib/formulaRegistry.ts)

Save:  POST /api/deals            → sheets.saveDeal()  → revalidateTag('deals')
Update: PUT /api/deals/[id]       → sheets.updateDeal() → revalidateTag('deals')
Load:  app/deal/[id]/page.tsx     → sheets.loadDeal() → parseSavedDeal() → DealCalculator
Dashboard: app/page.tsx → listDeals() via unstable_cache (tag 'deals', TTL 60s)
Delete: DELETE /api/deals/[id]    → sheets.deleteDeal() → revalidateTag('deals')
```

All outputs recompute on every committed input change — plain synchronous arithmetic, no debounce needed.

---

## Core Calculation Engine

`lib/deal-model.ts` is self-contained: the `Deal` interface, `DEFAULT_DEAL` (a pre-filled worked example — the Anna TX deal), formatting helpers, and five pure calc functions:

| Function | Returns | Answers |
|---|---|---|
| `calcBRRRR(deal)` | `BRRRRResult` | The rental BRRRR scenario: project cost, HML carry, refi, cashflow, CoC, DSCR, equity views, cap rate, GRM, ROE, 5-yr IRR |
| `calcFlipCash(deal)` | `FlipCashResult` | All-cash fix-and-flip profit/ROI |
| `calcFlipHML(deal)` | `FlipHMLResult` | Hard-money-financed flip profit/ROI |
| `calcMAO(deal)` | `MAOResult` | Max allowable offer under three constraints (70% rule, money-in-deal cap, post-refi equity) |
| `calcDealScore(deal, brrrr, mao)` | `DealScore` | 0–10 composite score (CoC / equity / location) + GO/NO-GO verdict |

The engine is **frozen by golden tests** (`tests/deal-model.golden.test.ts`): any change to any formula fails `npm test`. See `docs/adr/0002-v2-calculator-is-canonical.md` — its formulas intentionally diverge from the old Excel workbook. Formula reference: `docs/calculations.md`.

### Input conventions (read `Deal` in `lib/deal-model.ts` before touching inputs)

- **Percentages are whole numbers** (`hmlRate: 11.0` = 11%/yr, `refiLtv: 65` = 65%), not decimals.
- **`mo`/`yr` units**: taxes, insurance, HOA, state income tax, and `additionalMonthly` lines each carry a unit; `toMonthly()` normalizes.
- **pct-vs-fixed modes**: change orders (`changeOrdersMode`), capex/vacancy (`capexVacancyMode`), management (`mgmtMode`) each switch between a percent and a dollar field.
- **Auto sentinel**: `refiTitleEscrow = 0` means "auto: ARV × 2% + $500"; `> 0` is an exact override.
- **Funded flag**: each `rehabAdditionalCosts` line is HML-financed (`funded: true`) or out-of-pocket.

---

## State Ownership

`components/DealCalculator.tsx` owns the entire `Deal` state plus `dealId`/`saveStatus`. Child components receive props only — no child holds deal state. Unsaved edits persist to `localStorage` under `cgm-deal-calc-v2` (key kept from before the V1 retirement so existing drafts survive).

---

## Persistence

### Sheets wrapper (`lib/sheets.ts`)

Server-side only — never import from a client component. Exports `listDeals`, `loadDeal`, `saveDeal`, `updateDeal`, `deleteDeal` (plus internals `getClient`, `ensureDealsTab`, `findRowById`). Auth is a Google Service Account whose JSON key lives in `GOOGLE_SERVICE_ACCOUNT_KEY`; the spreadsheet id in `GOOGLE_SHEET_ID`.

### Storage

One flat row per deal in the `DEALS_APP` tab of the `Deal Calc CGM V2` spreadsheet (columns A–I: id, address, savedAt, score, arv, moneyInDeal, monthlyNOI, `inputsJson` = full `Deal` JSON, `settingsJson` = `"v2"` shape marker, reserved). The manual `CALC - BRRRR` tab is never touched by the app.

### Load-path validation

`app/deal/[id]/page.tsx` runs the stored `inputsJson` through `parseSavedDeal()` (`lib/parse-saved-deal.ts`), which checks for V2 marker keys. Unrecognized shapes render an explicit error page — saved deals are never silently backfilled with `DEFAULT_DEAL` values. (New blank deals at `/deal/new` deliberately seed from the Anna TX `DEFAULT_DEAL` as a worked example.)

### Caching

The dashboard reads `listDeals()` through `unstable_cache` with tag `deals` and a 60s TTL. **Every mutation route (POST, PUT, DELETE) must call `revalidateTag('deals')`** so the next dashboard load is fresh.

---

## Verification Gates

Run after any file change, in this order — all must pass:

```bash
npm test           # golden tests — the formula engine is untouched
npx tsc --noEmit   # zero TypeScript errors
npm run build      # the same build Vercel runs
```

A deliberate, user-approved formula change re-captures goldens with `UPDATE_GOLDEN=1 npm test`; the golden diff must be reviewed and approved.

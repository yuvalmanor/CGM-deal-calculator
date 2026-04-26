# CLAUDE.md — AI Assistant Guidance

This file is the entry point for any AI assistant working on this codebase.
Read this file first, then follow the reading order below before writing any code.

---

## Current State

| Layer | Status |
|---|---|
| Formula engine (`lib/calculations.ts`) | ✅ Complete and verified |
| UI/UX overhaul (Phase 1.5: A–D) | ⚠️ Unknown — verify on session start |
| Google Sheets API + deal persistence (Phase 2) | 🔜 Active phase |
| Dashboard + deal management (Phase 3) | ⏳ After Phase 2 |
| Vercel deployment (Phase 4) | ⏳ After Phase 3 |

---

## Required Reading Order

Read in this exact order before writing any code:

1. `docs/new/PLAN.md` — current phase, what's done, what's next, acceptance criteria
2. `docs/new/CHANGELOG.md` — what has been built and verified
3. `docs/new/SPEC.md` — UI/UX ground truth (reference if fixing UI bugs)
4. `docs/calculations.md` — formula engine reference (do not modify)
5. `docs/architecture.md` — stack, data flow, component patterns

---

## Ground Rules

### Formula engine is sacred
`lib/calculations.ts` is a verified pure function. Do not modify it.
If you suspect a bug, stop and report — do not fix silently.

### Run Excel verification after every file change
```bash
python scripts/verify_excel.py
```
All 12 checks must pass. Zero tolerance — any failure stops work immediately.
See `docs/new/VERIFY_GUIDE.md` for full details.

### TypeScript must compile clean after every change
```bash
npx tsc --noEmit
```
Zero errors before moving to the next task.

### API routes are server-side only
All Google Sheets API calls go through Next.js API routes in `app/api/`.
Never import `lib/sheets.ts` from any client component.

### Never expose credentials to the client
The Google Service Account JSON key lives only in environment variables.
It must never appear in any file committed to git.
Confirm `.env.local` is in `.gitignore` before any git operations.

### Execute one phase at a time
Complete all acceptance criteria in `PLAN.md` for the current phase.
Report which criteria are passing before declaring a phase done.
Update `CHANGELOG.md` after each completed phase.

---

## Database Architecture — Important

The app uses the existing **`Deal Calc CGM V2`** Google Sheet file as the database,
but writes only to a **new tab called `DEALS_APP`** — NOT to the existing `CALC - BRRRR` tab.

**Do not modify the `CALC - BRRRR` tab in any way.** It is a manual working document with
complex formulas, merged cells, and 16 existing deals. Any programmatic writes to it risk
breaking it permanently.

The `DEALS_APP` tab is a flat table: one row per deal, columns A–I, no formulas.
The app creates it automatically on first save if it doesn't exist.

See `docs/new/PLAN.md` Phase 2 for the full column spec.

---

## What Is Complete — Do Not Rebuild

### Formula engine
- `lib/calculations.ts` — all formulas, verified against Excel column C (Anna TX deal)
- `lib/types.ts` — all interfaces
- `lib/defaults.ts` — default values
- `lib/format.ts` — formatting helpers
- `scripts/verify_excel.py` + `scripts/run_calc.mjs` — verification scripts

### UI (Phase 1.5 — verify status before assuming complete)
- `components/ui/FormField.tsx` — blur-to-commit input pattern
- `components/ui/Card.tsx` — collapsible card wrapper
- Two-panel layout in `DealCalculator.tsx`
- Deal header, KPI strip, scenario tabs, scorecard, MAO block
- Formula modal system (`FormulaModal.tsx`, `formulaRegistry.ts`)

---

## Key Architectural Patterns

### State ownership
`DealCalculator.tsx` owns all deal state. Child components receive props only.

### Data flow
```
User input → DealCalculator state → calculateDeal() → DealResults (display)
                                                     ↓
                                        (on Save) POST /api/deals
                                        (on Load) GET  /api/deals/[id]
```

### Sentinel values for overrides
- `closingCostsBuyOverride = -1` → auto (2% of PP)
- `rehabMonthsManual = 0` → auto-calculate
- `refiLTVOverride = 0` → auto back-solve
- `hmlLoanPP = 0` → use leverage %

### HML dollar-amount mode
If `hmlLoanPP > 0` OR `hmlLoanRehab > 0`, both are treated as exact dollars. Do not break this.

### FormField blur-to-commit
All numeric inputs: raw digits while focused, formatted at rest. Empty → commits as `0`.

---

## File Placement Reference

```
brrrr-calculator/
├── app/
│   ├── api/
│   │   ├── deals/
│   │   │   ├── route.ts              ← Phase 2: GET list + POST new
│   │   │   └── [id]/
│   │   │       └── route.ts          ← Phase 2: GET + PUT + DELETE by id
│   ├── deal/
│   │   ├── new/page.tsx              ← existing
│   │   └── [id]/page.tsx             ← Phase 2: load saved deal
│   └── page.tsx                      ← Phase 3: dashboard
├── lib/
│   ├── sheets.ts                     ← Phase 2: Sheets API wrapper (server-side only)
│   └── ... existing files
├── components/
│   ├── DealCard.tsx                  ← Phase 3: deal summary card
│   └── ... existing files
├── docs/
│   ├── new/
│   │   ├── PLAN.md                   ← execution plan (this is the source of truth)
│   │   ├── SPEC.md                   ← UI/UX ground truth
│   │   ├── CHANGELOG.md              ← what's done
│   │   ├── DECISIONS.md              ← rationale for key decisions
│   │   ├── VERIFY_GUIDE.md           ← Excel verification guide
│   │   └── FORMULA_REGISTRY_GUIDE.md
│   └── ... existing docs
├── scripts/
│   ├── verify_excel.py               ← run after every file change
│   └── run_calc.mjs
└── CLAUDE.md                         ← this file
```

---

## Dependencies

| Package | Purpose | Phase added |
|---|---|---|
| `googleapis` | Google Sheets API client | Phase 2 — add with `npm install googleapis` |

---

## Common Mistakes — Avoid These

1. **Writing to `CALC - BRRRR` tab.** Only `DEALS_APP` tab is touched by the app.
2. **Importing `lib/sheets.ts` in a client component.** API routes only.
3. **Committing `.env.local`.** Contains the service account key — must stay local.
4. **Modifying `lib/calculations.ts`** for non-formula reasons.
5. **Skipping Excel verification** after a file change.
6. **Not handling 404** in `/deal/[id]` — deal may have been deleted.
7. **Hardcoding the spreadsheet ID** anywhere other than environment variables.

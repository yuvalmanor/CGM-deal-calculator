# CLAUDE.md — AI Assistant Guidance

This file is the entry point for any AI assistant working on this codebase.
Read this file first, then follow the reading order below before writing any code.

---

## Current State

All four phases are complete. The app is live on Vercel.

| Layer | Status |
|---|---|
| Formula engine (`lib/calculations.ts`) | ✅ Complete and verified |
| UI/UX overhaul (Phase 1.5: A–D) | ✅ Complete |
| Google Sheets API + deal persistence (Phase 2) | ✅ Complete |
| Dashboard + deal management (Phase 3) | ✅ Complete |
| Vercel deployment (Phase 4) | ✅ Complete — app is live |

---

## Required Reading Order

Read in this exact order before writing any code:

1. `docs/new/CHANGELOG.md` — what has been built and verified
2. `docs/new/PLAN.md` — phase history and acceptance criteria
3. `docs/new/SPEC.md` — UI/UX ground truth (reference if fixing UI bugs)
4. `docs/calculations.md` — formula engine reference (do not modify)
5. `docs/architecture.md` — stack, data flow, component patterns

---

## How to Update the App

This is the standard process for any change — formula fix, layout tweak, new feature, or bug fix.

### 1. Make the change locally

Edit the relevant file(s). Then:

```bash
# Always run after any change to verify formulas are untouched
python scripts/verify_excel.py

# Always run after any change to verify TypeScript compiles
npx tsc --noEmit
```

Both must pass with zero errors before proceeding.

### 2. Commit and push to GitHub

```bash
git add <changed files>
git commit -m "Short description of what changed and why"
git push
```

The remote is `git@github-personal:yuvalmanor/CGM-deal-calculator.git`.
The SSH alias `github-personal` is defined in `~/.ssh/config` and uses `~/.ssh/id_personal`.

### 3. Vercel auto-deploys

Vercel detects the new commit automatically. Within ~60 seconds the live app updates.
No action needed in Vercel — just watch the Deployments tab if you want to confirm.

### Adding a new environment variable

If a change requires a new secret (e.g. a new API key), add it in two places:
- `.env.local` — for local development (never commit this file)
- Vercel dashboard → Project → Settings → Environment Variables — for the live app

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

### Cache invalidation on every mutation
Any route that writes to Sheets (POST, PUT, DELETE) must call `revalidateTag('deals')`
so the dashboard cache is purged immediately. Do not skip this on new mutation routes.

---

## Database Architecture

The app uses the existing **`Deal Calc CGM V2`** Google Sheet file as the database,
but writes only to a **new tab called `DEALS_APP`** — NOT to the existing `CALC - BRRRR` tab.

**Do not modify the `CALC - BRRRR` tab in any way.** It is a manual working document with
complex formulas, merged cells, and 16 existing deals. Any programmatic writes to it risk
breaking it permanently.

The `DEALS_APP` tab is a flat table: one row per deal, columns A–I, no formulas.
The app creates it automatically on first save if it doesn't exist.

| Col | Field | Notes |
|---|---|---|
| A | `id` | UUID |
| B | `address` | From `inputs.address` |
| C | `savedAt` | ISO timestamp |
| D | `score` | Overall score (X.X) at save time |
| E | `arv` | For quick reading in Sheets |
| F | `moneyInDeal` | For quick reading in Sheets |
| G | `monthlyNOI` | For quick reading in Sheets |
| H | `inputsJson` | Full `DealInputs` as JSON |
| I | `settingsJson` | Full `LenderSettings` as JSON |

---

## What Is Complete — Do Not Rebuild

### Formula engine
- `lib/calculations.ts` — all formulas, verified against Excel column C (Anna TX deal)
- `lib/types.ts` — all interfaces
- `lib/defaults.ts` — default values
- `lib/format.ts` — formatting helpers
- `scripts/verify_excel.py` + `scripts/run_calc.mjs` — verification scripts

### UI (Phase 1 + 1.5)
- `components/ui/FormField.tsx` — blur-to-commit input pattern
- `components/ui/Card.tsx` — collapsible card wrapper
- Two-panel layout in `DealCalculator.tsx`
- Deal header, KPI strip, scenario tabs, scorecard, MAO block
- Formula modal system (`FormulaModal.tsx`, `formulaRegistry.ts`)

### Persistence (Phase 2)
- `lib/sheets.ts` — Google Sheets API wrapper (server-side only)
- `app/api/deals/route.ts` — GET list + POST new
- `app/api/deals/[id]/route.ts` — GET + PUT + DELETE
- `app/deal/[id]/page.tsx` — server component that loads a saved deal
- Save/Update button in `DealCalculator.tsx`

### Dashboard (Phase 3)
- `app/page.tsx` — server component dashboard with `unstable_cache` (tag: `deals`, TTL: 60s)
- `components/DealCard.tsx` — deal summary card with delete
- `components/DealFilters.tsx` — real-time text search + address dropdown

---

## Key Architectural Patterns

### State ownership
`DealCalculator.tsx` owns all deal state. Child components receive props only.

### Data flow
```
User input → DealCalculator state → calculateDeal() → DealResults (display)
                                                     ↓
                                        (on Save) POST /api/deals → revalidateTag('deals')
                                        (on Load) GET  /api/deals/[id]

Dashboard: GET /api/deals → unstable_cache (tag: deals, 60s TTL)
           Any mutation   → revalidateTag('deals') → next load hits Sheets fresh
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
│   │   └── deals/
│   │       ├── route.ts              ← GET list + POST new
│   │       └── [id]/route.ts         ← GET + PUT + DELETE by id
│   ├── deal/
│   │   ├── new/page.tsx              ← blank calculator
│   │   └── [id]/page.tsx             ← load saved deal
│   └── page.tsx                      ← dashboard (server component, cached)
├── lib/
│   ├── calculations.ts               ← formula engine (do not modify)
│   ├── sheets.ts                     ← Sheets API wrapper (server-side only)
│   ├── types.ts                      ← all TypeScript interfaces
│   ├── defaults.ts                   ← default input values
│   ├── format.ts                     ← number formatting helpers
│   ├── formulaRegistry.ts            ← formula modal content
│   └── modalContext.ts               ← React context for formula modal
├── components/
│   ├── DealCalculator.tsx            ← main calculator, owns all state
│   ├── DealCard.tsx                  ← dashboard deal card
│   ├── DealFilters.tsx               ← search + address dropdown
│   ├── sections/                     ← all input/output panel sections
│   └── ui/                           ← FormField, Card, FormulaModal, etc.
├── docs/
│   └── new/
│       ├── PLAN.md                   ← phase history + acceptance criteria
│       ├── SPEC.md                   ← UI/UX ground truth
│       ├── CHANGELOG.md              ← what's done and when
│       ├── DECISIONS.md              ← rationale for key decisions
│       └── VERIFY_GUIDE.md           ← Excel verification guide
├── scripts/
│   ├── verify_excel.py               ← run after every file change
│   └── run_calc.mjs
└── CLAUDE.md                         ← this file
```

---

## Dependencies

| Package | Purpose |
|---|---|
| `next` 14 | Framework — App Router, server components, API routes |
| `react` | UI |
| `tailwindcss` | Styling |
| `googleapis` | Google Sheets API client (server-side only) |

---

## Common Mistakes — Avoid These

1. **Writing to `CALC - BRRRR` tab.** Only `DEALS_APP` tab is touched by the app.
2. **Importing `lib/sheets.ts` in a client component.** API routes and server components only.
3. **Committing `.env.local`.** Contains the service account key — must stay local.
4. **Modifying `lib/calculations.ts`** for non-formula reasons.
5. **Skipping Excel verification** after a file change.
6. **Skipping `revalidateTag('deals')`** in a new mutation route.
7. **Calling hooks after a conditional return** — ESLint will catch it, but Vercel build will fail.
8. **Hardcoding the spreadsheet ID** anywhere other than environment variables.

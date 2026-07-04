# CLAUDE.md — AI Assistant Guidance

This file is the entry point for any AI assistant working on this codebase.
Read this file first, then follow the reading order below before writing any code.

---

## Current State

All four phases are complete. The app is live on Vercel.

| Layer | Status |
|---|---|
| Formula engine (`lib/deal-model.ts`) | ✅ Complete — frozen by golden tests |
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
# Always run after any change — golden tests prove formulas are untouched
npm test

# TypeScript must compile clean
npx tsc --noEmit

# Production build must succeed
npm run build
```

All three must pass with zero errors before proceeding.

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
`lib/deal-model.ts` is the live calculator engine — do not modify it.
Its formulas are frozen by golden-value tests (`tests/deal-model.golden.test.ts`):
run `npm test` after any change; all tests must pass.
If you suspect a formula bug, stop and report — never fix silently.
A deliberate, user-approved formula change re-captures goldens with
`UPDATE_GOLDEN=1 npm test`, and the diff must be reviewed and approved.

(The legacy V1 engine and its Excel verification script were deleted in the
retire-legacy-calculator cleanup — golden tests are now the only formula gate.)

### Run the golden tests after every file change
```bash
npm test
```
All tests must pass. Zero tolerance — any failure stops work immediately.

### TypeScript must compile clean after every change
```bash
npx tsc --noEmit
```
Zero errors before moving to the next task.

### Production build must succeed before shipping
```bash
npm run build
```
Vercel runs the same build — a local failure means a failed deploy.

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
| H | `inputsJson` | Full `Deal` (see `lib/deal-model.ts`) as JSON |
| I | `settingsJson` | `"v2"` shape marker (reserved) |

---

## What Is Complete — Do Not Rebuild

### Formula engine
- `lib/deal-model.ts` — `Deal` model, all formulas, defaults, formatting helpers
- `tests/deal-model.golden.test.ts` — golden-value tests freezing the engine

### UI
- `components/DealCalculator.tsx` — main calculator, owns all state
- `components/cgm/*` — dashboard bar, scenario panel, input form, form controls
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
User input → DealCalculator state → calcBRRRR()/calcFlipCash()/calcFlipHML()/
                                    calcMAO()/calcDealScore() → display
                                                     ↓
                                        (on Save) POST /api/deals → revalidateTag('deals')
                                        (on Load) GET  /api/deals/[id]

Dashboard: GET /api/deals → unstable_cache (tag: deals, 60s TTL)
           Any mutation   → revalidateTag('deals') → next load hits Sheets fresh
```

### Input and override conventions
The `Deal` model and its field conventions (units, pct-vs-dollar modes, auto
sentinels) are defined in `lib/deal-model.ts` — read the interface and its
comments before touching inputs. Numeric inputs use the blur-to-commit
pattern in `components/cgm/FormControls.tsx`.

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
│   ├── deal-model.ts                 ← Deal model + formula engine (do not modify)
│   ├── sheets.ts                     ← Sheets API wrapper (server-side only)
│   ├── formulaRegistry.ts            ← formula modal content
│   └── modalContext.ts               ← React context for formula modal
├── components/
│   ├── DealCalculator.tsx            ← main calculator, owns all state
│   ├── DealCard.tsx                  ← dashboard deal card
│   ├── DealFilters.tsx               ← search + address dropdown
│   ├── cgm/                          ← dashboard bar, scenario panel, input form
│   └── ui/                           ← FormulaModal
├── tests/
│   └── deal-model.golden.test.ts     ← golden tests freezing the engine
├── docs/
│   └── new/
│       ├── PLAN.md                   ← phase history + acceptance criteria
│       ├── SPEC.md                   ← UI/UX ground truth
│       ├── CHANGELOG.md              ← what's done and when
│       └── DECISIONS.md              ← rationale for key decisions
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
4. **Modifying `lib/deal-model.ts`** for any reason — it is the sacred engine.
5. **Skipping the gates** (`npm test`, `npx tsc --noEmit`, `npm run build`) after a file change.
6. **Skipping `revalidateTag('deals')`** in a new mutation route.
7. **Calling hooks after a conditional return** — ESLint will catch it, but Vercel build will fail.
8. **Hardcoding the spreadsheet ID** anywhere other than environment variables.

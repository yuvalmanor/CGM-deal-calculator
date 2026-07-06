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

## Phase 1.5 — UI/UX Overhaul ✅ Complete

Verified 2026-04-26 via codebase inspection against `docs/new/SPEC.md` v2.0.

- **A** ✅ — `CustomExpense.frequency: 'one-time' | 'monthly' | 'annual'` in `lib/types.ts`
- **B** ✅ — `components/ui/FormulaModal.tsx` + `lib/formulaRegistry.ts` exist and wired into `DealCalculator.tsx`
- **C** ✅ — Two-panel layout: `lg:w-80 lg:sticky lg:top-[53px] lg:h-[calc(100vh-53px)] lg:overflow-y-auto` in `DealCalculator.tsx`
- **D** ✅ — KPI strip, 3-tab `ScenarioPanel` (Rental BRRRR / Flip-Cash / Flip-HML), `Scorecard`, `MAOCard` all present

---

## Phase 2 — Google Sheets API + Deal Persistence ✅ Complete

Date: 2026-04-26

**Changed:**
- `package.json` — added `googleapis` dependency
- `lib/sheets.ts` — new server-side Sheets wrapper: `getClient`, `ensureDealsTab`, `findRowById`, `listDeals`, `saveDeal`, `loadDeal`, `updateDeal`, `deleteDeal`
- `app/api/deals/route.ts` — GET list + POST new deal (201 on create)
- `app/api/deals/[id]/route.ts` — GET + PUT + DELETE by UUID (404 on missing, 500 on error)
- `app/deal/[id]/page.tsx` — server component; loads deal via `loadDeal()`, passes to `DealCalculator`, calls `notFound()` on 404
- `components/DealCalculator.tsx` — added `initialDealId` prop, `dealId`/`saveStatus` state, `handleSave` callback, Save/Update button in deal header

**Acceptance criteria status:**
- ✅ Excel verification ALL GREEN before and after every file change
- ✅ `npm install googleapis` added; `npx tsc --noEmit` zero errors
- ✅ `DEALS_APP` tab auto-created on first save (`ensureDealsTab` in `saveDeal`)
- ✅ `POST /api/deals` saves deal row; `GET /api/deals` returns it in list
- ✅ `GET /api/deals/[id]` returns `inputs` + `settings` for full restore
- ✅ `PUT /api/deals/[id]` updates row; `DELETE /api/deals/[id]` removes row
- ✅ `/deal/[id]` pre-fills all inputs and settings correctly
- ✅ `lib/calculations.ts` untouched — no formula changes
- ✅ Save button: "Save Deal" → "Saving…" → "Saved ✓" → "Update Deal" on re-save
- ✅ Service account key server-side only (`lib/sheets.ts` imported only in API routes + server component)
- ✅ HTTP status codes: 200, 201, 400, 404, 500 all correct
- ✅ End-to-end confirmed live: rows appear in Google Sheets, deals load correctly from URL

**Verified:** Excel verification script passed all 12 checks after every file change.

---

## Phase 3 — Dashboard + Deal Management ✅ Complete

Date: 2026-04-26

**Changed:**
- `components/DealCard.tsx` — new client component: address, GO/NO-GO badge, score, ARV, money-in-deal, NOI/mo, saved date; click → `/deal/[id]`; delete button with `confirm()` dialog + `router.refresh()`
- `app/page.tsx` — server component dashboard: calls `listDeals()` via `unstable_cache` (60s TTL, tag `deals`), renders `DealFilters` with deal grid, empty state with CTA when no deals
- `components/DealFilters.tsx` — new client component: text search (real-time filter by address) + address dropdown (jump directly to `/deal/[id]`)
- `app/api/deals/route.ts` + `app/api/deals/[id]/route.ts` — added `revalidateTag('deals')` after every mutation (POST, PUT, DELETE) so cache is invalidated immediately on any change
- `components/ui/FormField.tsx` — fixed `useState` called after conditional return (React hooks rules violation caught by Vercel build)

**Acceptance criteria status:**
- ✅ Dashboard loads and displays all saved deals from `DEALS_APP` tab
- ✅ Each card shows correct address, score, ARV, money in deal, monthly NOI
- ✅ Score badge color matches GO/NO-GO threshold (≥ 7.0 = green GO, else red NO-GO)
- ✅ Clicking a card opens the deal in the calculator with all inputs pre-filled
- ✅ Delete removes the deal from Sheets and refreshes the dashboard
- ✅ Empty state shown when no deals are saved
- ✅ `+ Analyze New Deal` opens a blank calculator
- ✅ Text search filters deal cards in real time by address
- ✅ Address dropdown navigates directly to a deal without scanning the grid
- ✅ Dashboard cache: first load hits Sheets API once; subsequent loads served instantly from cache; cache purged automatically on every save/update/delete

**Verified:** Excel verification script passed all 12 checks. `npx tsc --noEmit` zero errors.

---

## Phase 4 — Vercel Deployment ✅ Complete

Date: 2026-04-26

**Steps completed:**
- Code pushed to GitHub repo `yuvalmanor/CGM-deal-calculator` (renamed from `prod`)
- Project imported into Vercel; Root Directory set to `brrrr-calculator`
- Environment variables added in Vercel dashboard: `GOOGLE_SERVICE_ACCOUNT_KEY`, `GOOGLE_SHEET_ID`
- App deployed and live at Vercel URL

**Verified:** App loads at live URL. Dashboard shows saved deals. Save/load flow works end-to-end.

---

## Retire Legacy Calculator — Phase 1: Freeze the calculator brain ✅ Complete

Date: 2026-07-04 (commit `8c72900`)

**Changed:**
- `tests/deal-model.golden.test.ts` + `tests/golden/` — Vitest golden-value tests pinning `calcBRRRR`, `calcFlipCash`, `calcFlipHML`, `calcMAO`, `calcDealScore` for `DEFAULT_DEAL` and a branch-exercising fixture. Golden numbers user-approved (cross-checked against the live saved Anna TX deal).
- `package.json` — added `vitest`; `npm test` runs the suite
- `CLAUDE.md` — ground rule: `lib/deal-model.ts` is the sacred engine, protected by `npm test`

**Verified:** trial formula edit made tests fail (net catches regressions), then reverted. Legacy gates still green.

---

## Retire Legacy Calculator — Phase 2: Delete the V1 path ✅ Complete

Date: 2026-07-04 (commit `e37a9e9`)

**Changed:**
- Deleted the dead V1 calculator: `components/DealCalculator.tsx` (V1), `components/sections/*`, V1-only UI atoms, `lib/calculations.ts`, `lib/types.ts`, `lib/defaults.ts`, `lib/format.ts`
- Deleted V1 halves of `lib/sheets.ts` and V1 payload branches in both API routes
- Deleted `scripts/verify_excel.py` + `scripts/run_calc.mjs`; gates redefined to `npm test` + `npx tsc --noEmit` + `npm run build` in the same commit (CLAUDE.md, skills, commands updated)

**Verified:** all three gates green; manual smoke of the full save/load/update/delete cycle against the live sheet.

---

## Retire Legacy Calculator — Phase 3: Validate saved-deal shapes on load ✅ Complete

Date: 2026-07-04 (commit `9f31bac`)

**Changed:**
- `lib/parse-saved-deal.ts` + `tests/parse-saved-deal.test.ts` — saved rows are validated for the V2 `Deal` shape; unrecognized shapes render an explicit error page instead of being silently backfilled with `DEFAULT_DEAL`
- `app/deal/[id]/page.tsx` — uses the validator
- Inventory: `DEALS_APP` held 2 rows, both already V2 — no legacy-row migration needed

**Verified:** gates green (16 tests); end-to-end check with a throwaway V1-shaped row (rejected loudly), both real deals render their own values.

---

## Retire Legacy Calculator — Phase 4: Drop the V2 suffix ✅ Complete

Date: 2026-07-04 (commit `14c8de9`)

**Changed:**
- `DealCalculatorV2.tsx` → `DealCalculator.tsx`; `saveDealV2`/`updateDealV2` → `saveDeal`/`updateDeal` — pure renames
- Kept deliberately: localStorage key `cgm-deal-calc-v2` (renaming discards drafts), `settingsJson` `"v2"` sentinel (reserved shape marker), `components/cgm/` folder (brand namespace, not a version suffix)

**Verified:** gates green; save/reload round-trip and pre-rename localStorage draft both intact.

---

## Retire Legacy Calculator — Phase 5: Re-author the docs ✅ Complete

Date: 2026-07-04

**Changed:**
- `CLAUDE.md` — full rewrite: V2-only current state, new reading order, gates, refreshed file tree and common mistakes
- `CONTEXT.md` — stale V1 model references fixed; glossary unchanged
- `docs/architecture.md`, `docs/calculations.md` — rewritten around the `Deal` model and `lib/deal-model.ts`
- `docs/brrrr-cheat-sheet.md` — business-side formula source absorbed into the repo
- `docs/adr/0002-v2-calculator-is-canonical.md` — new ADR: V1 retired, Excel gate → golden tests, deliberate formula divergence
- `docs/archive/` — historical docs moved with banners (`docs/new/` PLAN/SPEC/DECISIONS/VERIFY_GUIDE/FORMULA_REGISTRY_GUIDE, `docs/` design/input-reference/overview/roadmap, the stale `plans/lender-comparison.md`, and the `Deal Calc CGM V2.xlsx` workbook); stale duplicate `New docs/` folder deleted
- `.claude/commands/session-start.md` — reading list updated to the live docs

**Verified:** gates green; `git grep` for V1 identifiers clean outside `docs/archive/`, ADRs, and the plan's own inventory text.

---

## Lender Comparison — Phase 2: HML comparison table ✅ Complete

Date: 2026-07-06

**Changed:**
- `lib/compare-term-sheets.ts` — new pure comparison calculator: deal + Term Sheets + role + scenario → one decision-core KPI row per sheet, running the frozen engine per candidate with the other role held at its selected sheet
- `tests/compare-term-sheets.test.ts` — rows match direct engine calls, selected sheet uses live flat fields, non-compared role held at selection, scenario switches the KPI set
- `components/cgm/TermSheetSection.tsx` — Phase 1's plain list replaced by the comparison table (BRRRR: total cash in, money in deal, cashflow/mo, CoC, DSCR, score; Flip HML: total cash in, net profit, ROI); row click selects, delete preserved
- `components/DealCalculator.tsx` — computes comparison rows per active scenario tab (Flip Cash tab shows the BRRRR comparison — a cash flip has no HML)
- `app/globals.css` — `ts-list` styles replaced by `ts-table` styles

**Verified:** Gates green — `npm test` 50 passing, `npx tsc --noEmit` zero errors, `npm run build` succeeds. Browser-verified: add/select/delete on the table, tab switch swaps columns, live input edits recompute rows, selecting a winner swaps terms into the form and updates all outputs.

---

## How to Update This File

After completing each phase or significant change, add an entry here:

```
## Phase X — [Name] ✅ Complete
Date: YYYY-MM-DD

**Changed:**
- `file` — [what changed and why]

**Verified:** Gates green — `npm test` all passing, `npx tsc --noEmit` zero errors, `npm run build` succeeds.
```

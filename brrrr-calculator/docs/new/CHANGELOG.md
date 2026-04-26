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

## How to Update This File

After completing each phase or significant change, add an entry here:

```
## Phase X — [Name] ✅ Complete
Date: YYYY-MM-DD

**Changed:**
- `file` — [what changed and why]

**Verified:** Excel verification script passed all 12 checks. `npx tsc --noEmit` zero errors.
```

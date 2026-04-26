# Decision Log

Running record of product, design, and technical decisions made during development.
Every significant choice lives here with its rationale and the date it was made.
When in doubt about why something is built a certain way — check here first.

---

## Database

### Use `DEALS_APP` tab in existing sheet — not a new file, not columns in `CALC - BRRRR`

**Decision:** Save deals to a new tab called `DEALS_APP` inside the existing `Deal Calc CGM V2`
Google Sheet file. One row per deal. Do not write to the `CALC - BRRRR` tab.

**Rationale:**
- The `CALC - BRRRR` tab has 120+ formula rows, merged cells, a colors legend, and 16 existing
  deals with slight per-column variations. Writing new columns programmatically risks breaking
  formulas and formatting that weren't designed to be touched by an API.
- A column-per-deal approach in `CALC - BRRRR` would require the app to replicate the exact
  formatting of each existing column including all lender settings rows (96–113), formulas,
  and cell styles — fragile and complex to maintain.
- A flat row-per-deal table in `DEALS_APP` is simple, reliable, and easy to extend.
- The original `CALC - BRRRR` tab continues to work as a manual calculator without any risk.
- You can still open the Google Sheet in a browser and read all saved deals in a clean table.

**Alternative considered:** Adding new columns to `CALC - BRRRR` (column-per-deal, mirroring
the existing layout). Rejected: too brittle, too complex, risk of corrupting existing deal data.

**Alternative considered:** A separate new Google Sheet file. Rejected: unnecessary — the
existing file is already shared and accessible; a second file adds account/permission complexity.

**Decided:** April 2026.

---

## Layout

### Two-panel side-by-side (Desktop)
**Decision:** Left panel = inputs (320px, sticky), Right panel = results (scrollable).
**Rationale:** Inputs and results must be visible simultaneously. Primary use pattern: change a
number, immediately see the effect on all outputs without scrolling.
**Alternative considered:** Single scrolling column (Phase 1 design). Rejected.
**Decided:** SPEC v2.0 discussion.

### Mobile: single column, inputs above results
**Decision:** On mobile (< 900px), panels stack vertically — inputs on top, results below.
**Rationale:** Used on a phone while walking properties. Single-column is simpler to tap and scroll.
**Decided:** SPEC v2.0 discussion.

### Scenario Analysis: tabs on all screen sizes
**Decision:** Three scenario tabs (Rental BRRRR, Flip-Cash, Flip-HML) on all screen sizes.
**Rationale:** Three scenarios side-by-side is too cramped. Tabs keep results focused.
**Alternative considered:** Two columns (HML / Cash) on desktop, matching Phase 1 design. Rejected
when a third Flip-HML scenario was added.
**Decided:** SPEC v2.0 discussion.

---

## Custom Expenses

### Frequency: one-time / monthly / annual
**Decision:** Each custom expense has a three-way frequency toggle.
**Rationale:** An annual city inspection ($300/yr) should be entered as $300/yr, not $25/mo.
The app converts to monthly for P&L automatically. One-time expenses belong in deal anatomy, not P&L.
**Decided:** SPEC v2.0 discussion.

### Funded toggle: stub only
**Decision:** The "Funded" option is displayed but non-functional.
**Rationale:** Future intent: funded expenses roll into the loan amount, not cash flow. Not yet built.
**Decided:** Phase 1. Remains stub in Phase 1.5.

---

## Formula Disclosure

### Modal on click (not hover tooltip)
**Decision:** `?` button opens a centered modal, not a hover popup.
**Rationale:** Mobile — hover doesn't work on touch. Click works everywhere. Modal has more space.
**Alternative considered:** Hover tooltip (Phase 1). Replaced in Phase 1.5.
**Decided:** SPEC v2.0 discussion.

### No `position: fixed` on modal
**Decision:** FormulaModal uses `position: absolute` within a `position: relative` container.
**Rationale:** `position: fixed` breaks in iframe environments and interferes with sticky panels.
**Decided:** SPEC v2.0, Section 8.

### Central formulaRegistry
**Decision:** All modal content lives in `lib/formulaRegistry.ts`, not inline in JSX.
**Rationale:** Easy to audit, update, and keep consistent. Scattered inline strings go stale.
**Decided:** SPEC v2.0 discussion.

---

## Scoring

### Average of three categories (0–10 each) → X.X/10
**Decision:** Overall score = average of equity + ROI + location, displayed as X.X/10.
**Alternative considered:** Sum (0–30 total, Phase 1 implementation). Replaced for cleaner UX.
**GO threshold:** ≥ 7.0/10.
**Decided:** SPEC v2.0.

### Equity score brackets
**Decision:** 35%=10, 30%=9, 20%=8, else 0.
**Rationale:** Preserves Phase 1 verified implementation. 20% floor matches MAO-2 minimum equity.
**Decided:** SPEC v2.0 discussion (Phase 1 brackets kept as-is).

---

## Data & State

### Formula engine is a pure function — never modified except where PLAN.md says
**Decision:** `lib/calculations.ts` is off-limits for undocumented changes.
**Rationale:** Verified against Excel. Silent changes create calculation bugs that are hard to catch.
**Decided:** Phase 1 completion. Reinforced in CLAUDE.md.

### Sentinel values for overrides
**Decision:** Use -1/0/>0 rather than null/undefined to distinguish auto/zero/custom.
**Rationale:** Simpler TypeScript. No null checks in the calculation pipeline.
**Decided:** Phase 1 architecture.

### Per-deal lender settings
**Decision:** HML and Refi settings stored per-deal, not globally.
**Rationale:** Every deal has different lender terms. The Excel source has different settings per column.
**Decided:** Phase 1 architecture (from Excel analysis).

---

## Verification

### Python script against Excel column C (Anna TX deal, col 18)
**Decision:** Every code modification must be followed by `python scripts/verify_excel.py`.
**Rationale:** UI changes should never break calculations. Running after every change catches
regressions immediately.
**Zero tolerance:** Any failing check = stop and fix immediately.
**Decided:** PLAN.md v2.0.

---

## Deployment

### Vercel + GitHub (monorepo subfolder)
**Decision:** Host on Vercel, connected to `yuvalmanor/CGM-deal-calculator` GitHub repo.
Vercel Root Directory set to `brrrr-calculator` so only the Next.js app is deployed.
**Rationale:** Vercel is purpose-built for Next.js — zero config for server components, API routes,
and environment variables. Auto-deploys on every push to `main`.
**Alternative considered:** Dedicated GitHub repo per project. Rejected because the existing `prod`
repo (renamed to `CGM-deal-calculator`) already contained only this project — no benefit to splitting.
**Decided:** Phase 4, April 2026.

### Dashboard caching: `unstable_cache` + `revalidateTag`
**Decision:** Wrap `listDeals()` in Next.js `unstable_cache` with tag `deals` and a 60-second TTL.
All mutation routes (POST, PUT, DELETE) call `revalidateTag('deals')` immediately after writing to Sheets.
**Rationale:** The Sheets API round-trip is 300–600ms regardless of data size. Fetching addresses-only
would have the same latency with less useful dashboard data. Caching eliminates the round-trip on
repeat loads while tag-based invalidation keeps the dashboard consistent after any mutation.
**Alternative considered:** Addresses-only initial load, full data on selection. Rejected: same latency,
worse UX (dashboard cards would show no score/ARV/NOI).
**Alternative considered:** Pagination. Rejected: overkill for expected scale; adds API complexity.
**Decided:** Phase 3, April 2026.

### Dashboard filtering: client-side, no server round-trip
**Decision:** `DealFilters.tsx` filters the full deal list in memory on every keystroke.
The address dropdown navigates directly to `/deal/[id]` on selection.
**Rationale:** The full metadata list (A–G only, no JSON blobs) is small even at hundreds of deals.
Client-side filtering is instant; server-side filtering would add a round-trip per keystroke.
**Decided:** Phase 3, April 2026.

---

## Future Decisions (Deferred)

| Topic | Status | Notes |
|---|---|---|
| Funded expenses calculation | Stub | When built: funded expenses roll into loan, not cashflow |
| PM rate in MAO formula | Known gap | MAO assumes 10% PM regardless of input. Needs algebraic fix. |
| Multi-user auth | Deferred | Single user for now |
| Dark mode | Deferred | Tailwind `class` strategy when requested |
| Import from Excel | Deferred | Parse a column from `CALC - BRRRR` to pre-fill the app |
| Comparison view | Deferred | Show multiple saved deals side-by-side (like original spreadsheet) |

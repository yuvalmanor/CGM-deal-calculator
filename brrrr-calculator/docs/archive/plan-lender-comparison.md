> **Historical — authored against the retired V1 calculator's data model.** Do not build from this plan. The lender-comparison feature will be re-planned against the live `Deal` model (`lib/deal-model.ts`). The domain language (Lender Library, Lender Profile, Term Sheet) in `CONTEXT.md` and ADR-0001 remains live.

# Plan: Lender Comparison — Lender Library + per-deal Term Sheets

> Feature: Lender Comparison (slug: `lender-comparison`) — implement with `/build-phase lender-comparison`
> Source PRD: https://github.com/yuvalmanor/CGM-deal-calculator/issues/1
> Language: `CONTEXT.md` · Key decision: `docs/adr/0001-term-sheets-are-snapshots.md`

## Architectural decisions

Durable decisions that apply across all phases:

- **Key models**: `LenderProfile` (library-level: id, name, role `hml | refi`, baseline terms) and `TermSheet` (deal-level: id, `profileId: string | null` for provenance only, lender name, role-specific terms). Term Sheets are copies, never references (ADR-0001). Ad-hoc Term Sheets (`profileId: null`) are first-class.
- **Field ownership**: everything the lender controls lives on the Term Sheet — rates, points, leverage %, fixed fees, custom fee line items, HML negotiated dollar amounts (PP/rehab), refi LTV override. Deal-level fields stay on the Deal: title costs override, other adjustments at close, seasoning, MAO targets.
- **Engine boundary**: the formula engine is never modified. A pure adapter composes the two Active Term Sheets + deal-level fields into the legacy `(DealInputs, LenderSettings)` shape at call time. `python scripts/verify_excel.py` (all 12 checks) and `npx tsc --noEmit` are mandatory gates after every change, every phase.
- **Deal persistence**: Term Sheets and active-sheet ids serialize inside the deal's existing `settingsJson` column — no `DEALS_APP` schema change. Legacy deals migrate **on read** (old shape → one ad-hoc Active Term Sheet per role, folding in the lender fields that used to live in `inputsJson`). No bulk rewrite of stored rows.
- **Library persistence**: new flat `LENDERS_APP` tab in the existing spreadsheet — columns: `id`, `name`, `role`, `termsJson` — auto-created on first write. The manual `CALC - BRRRR` tab is never touched.
- **Routes**: `/lenders` (library page), `/api/lenders` (GET list, POST), `/api/lenders/[id]` (PUT, DELETE). Every lender mutation calls `revalidateTag('lenders')`; deal mutations keep `revalidateTag('deals')`.
- **Comparison semantics**: one full engine recompute per Term Sheet column, holding the other role's Active Term Sheet constant. Fixed metric rows — HML: cash to close, total HML cost (fees + interest), total debt, money in deal, equity %, total score. Refi: monthly P&I, total PITI, annual cashflow, DSCR, net cash at closing, money in deal, total score.
- **Testing**: Vitest (`npm test`), introduced in Phase 1. Automated tests cover the engine adapter + legacy migration only; they test external behavior (state in → engine args/results out) against the Excel golden values (Anna TX deal). Other modules rely on the tsc + Excel gates.

---

## Phase 1: Term Sheet spine

**User stories**: 12, 15, 16, 17, 19

### What to build

Move the deal's lender state from the single `LenderSettings` object to Term Sheets with one Active Term Sheet per role, end to end: state, adapter into the untouched engine, save/reload through `settingsJson`, legacy migration on read, and one visible UI change — each role's card shows the active lender's name. New blank deals seed one ad-hoc Term Sheet per role from the built-in defaults. Vitest lands with adapter + migration tests.

### Acceptance criteria

- [ ] A new blank deal renders and calculates exactly as before (seeded ad-hoc Term Sheets carry today's defaults).
- [ ] A deal saved **before** this phase loads with byte-identical results; a migration test proves a legacy-shaped `settingsJson`/`inputsJson` pair becomes one ad-hoc Active Term Sheet per role reproducing the original numbers.
- [ ] Saving and reloading a deal round-trips its Term Sheets and active selections.
- [ ] Each role's card displays the Active Term Sheet's lender name.
- [ ] `npm test` passes (adapter composition + migration golden-value tests); Excel verification and tsc pass.

---

## Phase 2: HML comparison with ad-hoc Term Sheets

**User stories**: 7, 8, 9, 11, 13, 14, 18, 20

### What to build

The "Compare lenders" modal on the HML card, working entirely with ad-hoc Term Sheets (no Library yet). Add a blank Term Sheet, edit its terms inline (including per-sheet custom fee line items and negotiated dollar amounts), see one column per Term Sheet with the six HML metric rows recomputed in full, set any column active, remove a column. Deal input tweaks (PP, rehab, rent) update all columns live.

### Acceptance criteria

- [ ] Two hand-typed HML offers — one dollar-mode, one leverage-mode — display side by side with correct, independent numbers; switching the active sheet never leaks one sheet's negotiated dollars into the other.
- [ ] Setting a column active updates the deal's headline KPIs, scorecard, and the name on the HML card.
- [ ] Term Sheets added/edited/removed in the modal survive save + reload.
- [ ] The active column is visually marked; exactly one column is active at all times (the last remaining sheet cannot be removed).
- [ ] Excel verification and tsc pass; `npm test` still green.

---

## Phase 3: Refi comparison

**User stories**: 10, 11, 12, 20

### What to build

The same comparison machinery on the Refi card: modal with one column per Refi Term Sheet and the seven Refi metric rows, inline editing (including refi LTV override and custom fees per sheet), set active, remove. Both modals coexist on one deal; each holds the other role's Active Term Sheet constant.

### Acceptance criteria

- [ ] Two Refi Term Sheets with different rates/points/LTV show correct independent P&I, PITI, cashflow, DSCR, net cash at closing, money in deal, and score.
- [ ] Changing the active HML Term Sheet updates the Refi comparison columns (and vice versa) — the constant-other-role rule is observable.
- [ ] Refi Term Sheets survive save + reload alongside HML ones.
- [ ] Excel verification, tsc, and `npm test` pass.

---

## Phase 4: Lender Library end-to-end

**User stories**: 1, 2, 3, 4, 5, 21, 23

### What to build

The cross-deal Lender Library: `LENDERS_APP` tab (auto-created on first write), lender CRUD API routes with `revalidateTag('lenders')`, and the `/lenders` page linked from the dashboard — profiles listed by role, add/edit/delete with the same form patterns as the deal panels. Deleting a profile is allowed regardless of deals that copied it (snapshots keep them intact).

### Acceptance criteria

- [ ] Creating a Lender Profile on `/lenders` writes a row to `LENDERS_APP` visible in Google Sheets; the `CALC - BRRRR` tab is untouched.
- [ ] Editing a profile persists and is reflected after the cache tag invalidation; deleting removes the row.
- [ ] Profiles are grouped/filterable by role (HML vs Refi).
- [ ] The dashboard links to `/lenders`.
- [ ] Excel verification, tsc, and `npm test` pass.

---

## Phase 5: Pull from Library + quick-create

**User stories**: 6, 22 (+ copy-semantics halves of 3, 4, 5, 8)

### What to build

Connect the Library to the deal: the compare modal's "Add lender" picker lists Lender Profiles for that role; picking one creates a Term Sheet **copy** (with `profileId` provenance). Quick-create inside the picker adds a new profile to the Library and pulls it in one step. Local edits to a pulled Term Sheet never write back; Library edits/deletes never touch existing Term Sheets.

### Acceptance criteria

- [ ] Pulling a profile creates a Term Sheet with its terms; editing that Term Sheet then reopening `/lenders` shows the profile's baseline unchanged.
- [ ] Updating or deleting a profile in the Library leaves previously pulled Term Sheets (and their deals' results) byte-identical — the ADR-0001 scenario demoed end to end.
- [ ] Quick-create from the picker persists the profile to `LENDERS_APP` **and** adds the Term Sheet to the deal in one flow.
- [ ] Excel verification, tsc, and `npm test` pass.

---

## Phase 6: Docs closeout

**User stories**: none — project documentation requirement.

### What to build

Bring the project docs in line with the shipped feature: SPEC (new modal + page UX), CHANGELOG (per-phase entries if missed), architecture doc (Term Sheet model, adapter boundary, `LENDERS_APP` tab, lenders cache tag), and CLAUDE.md (database architecture section gains the `LENDERS_APP` schema; file placement reference gains the new routes/pages).

### Acceptance criteria

- [ ] CLAUDE.md documents the `LENDERS_APP` tab schema and the Term Sheet ↔ engine adapter rule alongside the existing ground rules.
- [ ] SPEC and architecture docs describe the compare modals, `/lenders` page, and Library/Term Sheet model in glossary terms.
- [ ] CHANGELOG records all phases.
- [ ] Excel verification and tsc still pass (docs-only phase, but the gates are unconditional).

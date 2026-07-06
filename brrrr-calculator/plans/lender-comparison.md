# Plan: Lender Comparison

> Source PRD: `docs/prd/lender-comparison.md` (feature: lender-comparison)

## Architectural decisions

Durable decisions that apply across all phases (see ADR-0003 and CONTEXT.md):

- **Key model**: **Term Sheet** — one candidate set of lender terms for one role (HML or Refi) on one Deal. Per-deal snapshots; no cross-deal lender entity. Exactly one selected per role.
- **Selected sheet IS the flat fields**: the existing flat `hml*`/`refi*` field groups on `Deal` remain the engine-facing terms and always mirror the selected Term Sheet. The frozen engine, the input form, and the saved-deal inputs contract are never modified. Selecting a sheet writes the current flat fields back into the previously selected sheet, then applies the new sheet onto the flat fields.
- **Schema**: alternates + selection metadata serialize to a JSON blob in the `DEALS_APP` column I (`settingsJson`). `inputsJson` stays exactly a flat `Deal`. Legacy `"v2"` marker or empty cell parses as "no Term Sheets" → deal loads as one Term Sheet per role, selected (zero migration). A malformed blob loads the deal with a visible notice, and saves write the raw value back unchanged — never destroy what couldn't be parsed.
- **Comparison semantics**: full engine run per candidate (other role held at its selected sheet), decision-core KPI columns, following the active scenario tab — HML compares under BRRRR or Flip HML; Refi compares under BRRRR only. "Scenario" stays reserved for exit strategies.
- **UI placement**: a comparison section per lender role inside the calculator page; `DealCalculator` owns all Term Sheet state. Select-to-edit: only the selected sheet is editable, via the existing input form.
- **Drafts**: the localStorage key `cgm-deal-calc-v2` is unchanged; the stored value's shape is extended to carry Term Sheets, and a draft without them loads as the zero-migration case.
- **Gates every phase**: `npm test` (goldens untouched), `npx tsc --noEmit`, `npm run build` — then commit and push.

---

## Phase 1: HML Term Sheets — add, select, persist

**User stories**: 1, 3, 4, 10, 11, 12, 13, 14, 15, 16, 19, 21

### What to build

The Term Sheet core as a deep, pure module — Term Sheet types, extract/apply between a sheet and a role's flat field group, and the column-I blob codec (serialize/parse, legacy `"v2"`/empty → "no Term Sheets", malformed → explicit error carrying the raw string) — plus a minimal HML-only management UI in the calculator: a list of the deal's HML Term Sheets by lender name, with add (duplicates the selected sheet), select (swap into the flat fields; the input form now edits that sheet), and delete. Term Sheets round-trip through save/load via the settings column and live in the localStorage draft. Deals saved before this feature open unchanged as one selected HML sheet.

### Acceptance criteria

- [x] Core module unit tests pass: extract/apply round-trip, blob codec round-trip, legacy `"v2"`/empty → no sheets, malformed blob → explicit error preserving raw string, selection swap loses no terms
- [x] In the calculator, an HML Term Sheet can be added (copy of selected), selected, and deleted; the input form always shows and edits the selected sheet's terms
- [x] Save then reload restores all HML Term Sheets and the selection; the dashboard summary reflects the selected sheet
- [x] A pre-existing saved deal opens exactly as before, showing one selected HML Term Sheet
- [x] A page refresh with unsaved Term Sheets restores them from the draft
- [x] With a single Term Sheet per role, the calculator looks and behaves as it does today
- [x] Gates pass: goldens untouched, tsc clean, production build succeeds

---

## Phase 2: HML comparison table

**User stories**: 5, 6, 7, 9, 20

### What to build

The comparison calculator as a pure function — deal + Term Sheets + role + active scenario → one row of decision-core KPIs per sheet, produced by running the frozen engine with each candidate applied and the other role held at its selected sheet — and the real comparison table replacing Phase 1's plain list in the HML section. On the BRRRR tab the columns are total cash in, money left in deal, monthly cashflow, cash-on-cash, DSCR, and deal score; on the Flip HML tab they are total cash in, net profit, and ROI. The table recomputes immediately on any deal-input edit and marks the selected row.

### Acceptance criteria

- [ ] Comparison calculator unit tests pass: rows match direct engine calls per candidate, the non-compared role is held at its selected sheet, scenario switch changes the KPI set
- [ ] The HML section shows one row per Term Sheet with the decision-core columns for the active scenario tab, and switching tabs (BRRRR ↔ Flip HML) switches the columns
- [ ] Editing any deal input updates the comparison rows immediately
- [ ] Selecting a winner from the table swaps its terms into the input form and updates all deal outputs
- [ ] Gates pass: goldens untouched, tsc clean, production build succeeds

---

## Phase 3: Refi Term Sheets and comparison

**User stories**: 2, 8

### What to build

Generalize Phases 1–2 to the Refi role: a Refi comparison section with the same add/select/delete management and comparison table, always showing BRRRR KPIs (a refi only exists in BRRRR), with the HML side held at its selected sheet. Refi Term Sheets persist, draft, and zero-migrate exactly like HML ones.

### Acceptance criteria

- [ ] Refi Term Sheets can be added, selected, and deleted; the input form edits the selected refi sheet
- [ ] The Refi comparison table shows BRRRR decision-core KPIs regardless of the active scenario tab
- [ ] Save/reload restores both roles' Term Sheets and selections; pre-existing deals open as one selected sheet per role
- [ ] Core and comparison unit tests cover the Refi role
- [ ] Gates pass: goldens untouched, tsc clean, production build succeeds

---

## Phase 4: Bad-blob resilience

**User stories**: 17, 18

### What to build

The failure path for an unreadable settings column: the deal opens normally (selected terms live in the inputs column, so the engine sees a complete deal), the comparison sections show an explicit "saved Term Sheets could not be read" notice instead of alternates, and any save while in that state writes the raw column value back unchanged so the unread data is never destroyed.

### Acceptance criteria

- [ ] A saved row with garbage in the settings column opens as a working deal with the explicit notice in the comparison sections
- [ ] Saving that deal leaves the settings column byte-for-byte unchanged, and the deal's other columns update normally
- [ ] Unit tests cover the preserve-on-save behavior
- [ ] Gates pass: goldens untouched, tsc clean, production build succeeds

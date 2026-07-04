# Plan: Retire Legacy Calculator — delete the dead V1 path, make the repo tell one coherent story

> Feature: Retire Legacy Calculator (slug: `retire-legacy-calculator`) — implement with `/build-phase retire-legacy-calculator`
> **Sequencing: this plan runs FIRST, before the lender-comparison feature is re-planned.** Lender-comparison planning restarts only after this plan completes, against the cleaned-up repo. `plans/lender-comparison.md` is stale (authored against the dead V1 model) and is archived in Phase 5; do not build from it.
> Origin: discovered 2026-07-04 while attempting `/build-phase lender-comparison` — the live app runs an entirely different calculator than the one CLAUDE.md and the docs describe.

## Why this plan exists

The repo contains two complete calculators:

- **V1 (dead)**: `components/DealCalculator.tsx` → `components/sections/*` → `lib/calculations.ts` with the `(DealInputs, LenderSettings)` model. **No route imports it.** It is unreachable from the running app.
- **V2 (live)**: `app/deal/new` and `app/deal/[id]` render `components/DealCalculatorV2.tsx` → `components/cgm/*` → `lib/deal-model.ts` (flat `Deal` model, self-contained engine with deliberately different formulas — carry to seasoning, cheat-sheet DSCR, etc.).

Consequences today:
- CLAUDE.md, CONTEXT.md, `docs/new/SPEC.md`, `docs/architecture.md` all describe V1 as current — which caused a feature plan to be authored against the dead model.
- The mandatory gate `scripts/verify_excel.py` verifies **V1's** formulas (via `scripts/run_calc.mjs`, a standalone JS copy of `lib/calculations.ts`). **The live V2 engine has no automated verification at all.**
- `lib/sheets.ts` and both API routes carry parallel V1/V2 code paths; V2 marks `settingsJson` with the sentinel string `"v2"`.

## Architectural decisions

Durable decisions that apply across all phases:

- **V2 is the only calculator.** The V1 tree is deleted, not archived in-repo — git history is the archive. No compatibility shims for the V1 UI.
- **Nothing is deleted before the calculator brain is frozen.** Phase 1 lands golden-value tests (Vitest) pinning the outputs of `calcBRRRR` / `calcFlipCash` / `calcFlipHML` / `calcMAO` / `calcDealScore` **before** any file is removed. From that point on, any change — accidental or deliberate — to any formula in `lib/deal-model.ts` fails `npm test`, and every later phase runs `npm test` as a mandatory gate. This is the "formulas won't be touched" guarantee for the whole plan, and it carries forward into future feature work (lender-comparison inherits the suite).
- **Gate redefinition.** Phase 1 runs the full legacy gates (`python scripts/verify_excel.py` + `npx tsc --noEmit`). From Phase 2 onward — once the script and the engine it verifies are gone — the mandatory gates are: `npm test` (all green) + `npx tsc --noEmit` (zero errors) + `npm run build` (succeeds). This supersedes CLAUDE.md's verify_excel rule from Phase 2 on; CLAUDE.md itself is updated in the same commit that deletes the script (never a window where the docs demand a gate that doesn't exist).
- **"Formula engine is sacred" transfers to `lib/deal-model.ts`.** Same rule, new target: golden tests pin its behavior; suspected bugs are reported, not silently fixed. Deleting `lib/calculations.ts` is not a violation — it is this plan's explicit purpose, recorded in ADR-0002.
- **API drops V1 payload support.** The `{ inputs, settings, results }` branches in `POST /api/deals` and `PUT /api/deals/[id]` are removed; only the flat V2 payload remains. Acceptable break: the only V1 client is the dead UI being deleted.
- **Docs strategy: rewrite the living, archive the historical.** CLAUDE.md, CONTEXT.md, `docs/architecture.md`, `docs/calculations.md` are rewritten to describe V2 only. Phase-history docs (`docs/new/PLAN.md`, `docs/new/SPEC.md`, `docs/new/DECISIONS.md`, `docs/new/VERIFY_GUIDE.md`, and stale V1 docs like `docs/input-reference.md`, `docs/design.md`) move to `docs/archive/` with a one-line "historical — describes the retired V1 calculator" banner. `docs/new/CHANGELOG.md` stays live and gains entries for these phases.
- **Names lose the V2 suffix once V1 is gone.** `DealCalculatorV2` → `DealCalculator`, `saveDealV2`/`updateDealV2` → `saveDeal`/`updateDeal` (deleting the old functions first frees the names). Pure renames — no behavior change, gates prove it.

## Dead-code inventory (as of 2026-07-04 — re-verify with grep before deleting)

| Area | Files | Notes |
|---|---|---|
| V1 root component | `components/DealCalculator.tsx` | Imported nowhere |
| V1 sections | all 18 files in `components/sections/` | Imported only by V1 root |
| V1-only UI atoms | `components/ui/FormField.tsx`, `Card.tsx`, `ResultRow.tsx`, `Tooltip.tsx` | Confirm each with grep — `FormulaModal.tsx` is **live** (V2 uses it) |
| V1 engine + model | `lib/calculations.ts`, `lib/types.ts`, `lib/defaults.ts`, `lib/format.ts` | `lib/sheets.ts` imports types from `lib/types.ts` — untangle there first |
| V1 persistence halves | in `lib/sheets.ts`: `saveDeal`, `updateDeal`, `buildRow`, `overallScore`, `locationScore` + the `DealInputs`/`LenderSettings`/`DealResults` imports | Keep: `getClient`, `ensureDealsTab`, `findRowById`, `listDeals`, `loadDeal`, `saveDealV2`, `updateDealV2`, `deleteDeal` |
| V1 API branches | v1-payload branches in `app/api/deals/route.ts` + `app/api/deals/[id]/route.ts` | Keep V2 branches + `revalidateTag('deals')` |
| V1 verification | `scripts/verify_excel.py`, `scripts/run_calc.mjs` | Retire together with the engine they verify, same commit as the CLAUDE.md gate update |
| Gate references outside code | `.claude/skills/brrrr-fix/SKILL.md`, `.claude/skills/build-phase/SKILL.md`, `.claude/commands/session-start.md` | All name verify_excel — update to the new gates |

**Live V2 surface (do not touch except renames):** `DealCalculatorV2.tsx`, `components/cgm/*`, `lib/deal-model.ts`, `lib/formulaRegistry.ts`, `lib/modalContext.ts`, `components/ui/FormulaModal.tsx`, dashboard (`app/page.tsx`, `DealCard.tsx`, `DealFilters.tsx`), layouts, V2 halves of `lib/sheets.ts` and the API routes.

---

## Phase 1: Freeze the calculator brain — golden tests before anything else

### What to build

The safety mechanism that guarantees the formulas are never silently touched, landed **before any cleanup begins**. Introduce Vitest and golden-value tests that snapshot the full numeric output of `calcBRRRR`, `calcFlipCash`, `calcFlipHML`, `calcMAO`, `calcDealScore` for (a) `DEFAULT_DEAL` (Anna TX) and (b) at least one hand-built fixture exercising the non-default branches: `yr` units, `pctOfRehab` change orders, pct-mode capex/mgmt, funded + not-funded `rehabAdditionalCosts`, extra fees on both lenders, `refiTitleEscrow = 0` (auto) vs explicit. Golden numbers are captured from the current engine and reviewed by the user for plausibility before being frozen — they define "correct" from then on. Also add the ground rule to CLAUDE.md in this phase (not Phase 5): `lib/deal-model.ts` is the sacred formula engine — do not modify; suspected bugs are reported, never fixed silently.

### Acceptance criteria

- [ ] `npm test` runs golden tests covering all five calc functions and both fixtures, all green.
- [ ] Changing any formula constant in `lib/deal-model.ts` (trial edit, then revert) makes at least one test fail — the net actually catches regressions.
- [ ] User has eyeballed and approved the golden numbers.
- [ ] CLAUDE.md's ground rules name `lib/deal-model.ts` as the untouchable engine, protected by `npm test`.
- [ ] Legacy gates still pass: `python scripts/verify_excel.py` (all 12) + `npx tsc --noEmit`.

---

## Phase 2: Delete the V1 path

### What to build

Remove everything in the dead-code inventory: V1 component tree, V1 engine/model/format libs, V1 halves of `lib/sheets.ts`, V1 payload branches in both API routes, and `scripts/verify_excel.py` + `scripts/run_calc.mjs`. In the **same commit**: update CLAUDE.md's gate commands ("How to Update the App" + Ground Rules) to the new gate set, and update `.claude/skills/brrrr-fix/SKILL.md`, `.claude/skills/build-phase/SKILL.md`, `.claude/commands/session-start.md` so no instruction file demands the deleted script. (Full CLAUDE.md re-author waits for Phase 5 — this phase only keeps the gates truthful.)

### Acceptance criteria

- [ ] `git grep` finds no references to `calculations.ts`, `DealInputs`, `LenderSettings`, `verify_excel`, or `run_calc` outside `docs/` archives and git history.
- [ ] New gates all pass: `npm test`, `npx tsc --noEmit`, `npm run build`.
- [ ] Manual smoke on the running app: dashboard lists deals → open a saved deal → edit a field → Update → re-open shows the edit → delete a throwaway deal works.
- [ ] No instruction file (CLAUDE.md, skills, commands) references a gate or file that no longer exists.

---

## Phase 3: Legacy data and the load path

### What to build

Deal with rows in `DEALS_APP` saved by the V1 calculator (shape: `inputsJson` = `DealInputs`, `settingsJson` = `LenderSettings` JSON — not the `"v2"` sentinel). First **inventory**: script or manual check of how many such rows exist. Then a **user decision** (stop and ask, per inventory results): (a) migrate on read into `Deal` shape, (b) one-time manual re-entry of the few affected deals, or (c) delete stale rows. Independently, fix the known load-path wart in `app/deal/[id]/page.tsx`: it spreads whatever JSON it finds into `DEFAULT_DEAL`, silently backfilling missing fields with Anna TX values — decide whether saved-deal loads should instead fail loudly on unknown shapes, and whether new blank deals should keep seeding from the pre-filled Anna TX `DEFAULT_DEAL` at all.

### Acceptance criteria

- [ ] Count of pre-V2 rows in `DEALS_APP` is known and reported.
- [ ] User has decided the legacy-row treatment; it is implemented (or explicitly recorded as "no legacy rows exist — nothing to do").
- [ ] Loading every existing deal in `DEALS_APP` renders without silently substituting Anna TX defaults for that deal's actual data.
- [ ] Gates pass: `npm test`, `npx tsc --noEmit`, `npm run build`.

---

## Phase 4: Rename for coherence

### What to build

Pure renames, zero behavior change: `DealCalculatorV2.tsx` → `DealCalculator.tsx` (component `DealCalculator`), `saveDealV2`/`updateDealV2` → `saveDeal`/`updateDeal`, and a decision on the `components/cgm/` folder name (keep as brand or fold into `components/`). Keep the `settingsJson` `"v2"` sentinel as-is for now, documented in the code + CLAUDE.md schema table as "reserved — currently a shape marker"; the upcoming lender-comparison re-plan is free to claim the column (e.g. for Term Sheets) later. Keep the localStorage key `cgm-deal-calc-v2` as-is (changing it silently discards users' drafts) unless the user opts to migrate it.

### Acceptance criteria

- [ ] No identifier, filename, or comment contains a `V2`/`v2` suffix except deliberate persistence artifacts (localStorage key, `settingsJson` sentinel if retained) — each carrying a comment saying why.
- [ ] `git grep -i "dealcalculatorv2\|savedealv2\|updatedealv2"` returns nothing.
- [ ] Gates pass: `npm test`, `npx tsc --noEmit`, `npm run build`; smoke: save + reload a deal still round-trips.

---

## Phase 5: Re-author the docs — one true story

### What to build

Make every document describe the repo as it now is:

- **CLAUDE.md** — full rewrite: current state table (V2-only), required reading order, new gates, `DEALS_APP` schema (with whatever `settingsJson` now holds), file placement reference matching the real tree, ground rules with `lib/deal-model.ts` as the sacred engine, common-mistakes list refreshed.
- **CONTEXT.md** — fix the stale "(today: the two halves of `LenderSettings`)" line and any other V1 references; glossary stays.
- **docs/architecture.md** — rewrite around: `Deal` model, `deal-model.ts` engine, cgm component tree, dashboard, Sheets persistence, cache tags.
- **docs/calculations.md** — currently a hybrid (V1 reference + appended V2 entries). Rebuild as the V2 formula reference; consider absorbing the untracked `../BRRRR_Cheat_Sheet.md` into the repo as the formulas' business-side source.
- **docs/archive/** — move `docs/new/PLAN.md`, `docs/new/SPEC.md`, `docs/new/DECISIONS.md`, `docs/new/VERIFY_GUIDE.md`, `docs/design.md`, `docs/input-reference.md` (+ review `docs/overview.md`, `docs/roadmap.md`, `docs/new/FORMULA_REGISTRY_GUIDE.md` individually: rewrite, archive, or delete) with a historical banner on each. Also archive the stale `plans/lender-comparison.md` — it targets the deleted V1 model; the feature gets a fresh plan afterwards. CONTEXT.md's glossary and ADR-0001 (Term Sheets are snapshots) remain live — they describe the upcoming feature's domain, not V1.
- **docs/adr/0002-v2-calculator-is-canonical.md** — new ADR recording: V1 retired, why the Excel gate was replaced by golden tests, and that `deal-model.ts` formulas intentionally diverge from the old Excel workbook.
- **docs/new/CHANGELOG.md** — entries for all phases of this plan.

### Acceptance criteria

- [ ] A cold read of CLAUDE.md's required reading order describes only files and commands that exist, and nothing it says contradicts the code.
- [ ] `git grep -l "LenderSettings\|DealInputs\|calculateDeal"` outside `docs/archive/` and ADRs returns nothing.
- [ ] ADR-0002 exists and is linked from the plan/docs where relevant.
- [ ] Gates pass: `npm test`, `npx tsc --noEmit`, `npm run build` (docs-only phase, but gates are unconditional).

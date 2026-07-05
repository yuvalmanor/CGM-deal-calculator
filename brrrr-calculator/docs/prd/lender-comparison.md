# PRD: Lender Comparison — compare Term Sheets per lender role on a deal

Feature: lender-comparison
Status: ready-for-agent
Date: 2026-07-05

## Problem Statement

When underwriting a deal I shop it to several hard-money lenders and several refi lenders, each quoting different leverage, rates, points, and fees. Today the calculator holds exactly one HML and one Refi Lender per deal, so comparing quotes means manually retyping each lender's terms, writing down the resulting KPIs, retyping the next one, and trying to remember what the losing quotes were. The quotes themselves are lost the moment I overwrite them, so I can't revisit a decision or show why a lender was rejected.

## Solution

A deal can hold multiple **Term Sheets** per lender role (HML and Refi). Exactly one per role is **selected** and drives the deal's real numbers, exactly as lender terms work today. A comparison section in the calculator shows, for every Term Sheet of a role, the full deal outcome with that candidate swapped in — decision-core KPIs, following whichever exit scenario I'm looking at — so I can see at a glance which lender wins for this deal and this exit. Selecting a winner is one click. All Term Sheets save with the deal and survive reload, so the losing quotes remain on record.

## User Stories

1. As an investor, I want to add a second HML Term Sheet to a deal, so that I can compare two hard-money quotes without losing the first one.
2. As an investor, I want to add a second Refi Term Sheet to a deal, so that I can compare takeout options the same way.
3. As an investor, I want a new Term Sheet to start as a copy of the currently selected one, so that I only edit the terms that differ between quotes.
4. As an investor, I want each Term Sheet labeled by its lender name, so that I can tell quotes apart in the comparison table.
5. As an investor, I want the comparison table to show the full deal outcome per Term Sheet — not just that lender's fees — so that I pick the lender that makes the *deal* best, not the one that merely looks cheapest.
6. As an investor, I want the HML comparison to show total cash in, money left in deal, monthly cashflow, cash-on-cash, DSCR, and deal score when I'm on the BRRRR scenario, so that I see the decision-core numbers side by side.
7. As an investor, I want the HML comparison to show total cash in, net profit, and ROI when I'm on the Flip HML scenario, so that the comparison answers the question for the exit I'm actually underwriting.
8. As an investor, I want the Refi comparison to always show BRRRR outcomes, so that the numbers make sense for the only scenario a refi exists in.
9. As an investor, I want the comparison for one role to hold the other role at its selected Term Sheet, so that each table varies exactly one thing at a time.
10. As an investor, I want to select a Term Sheet as the winner with one click, so that its terms immediately drive the deal's inputs, outputs, and score.
11. As an investor, I want my edits in the input form to apply to the currently selected Term Sheet, so that there is only ever one editing surface and no drift between form and comparison.
12. As an investor, I want to tweak an alternate quote by selecting it, editing in the form, and selecting back, so that I never need a second form.
13. As an investor, I want to delete a Term Sheet I'm no longer considering, so that the comparison stays readable.
14. As an investor, I want all Term Sheets saved with the deal, so that reopening it months later shows every quote I gathered and which one I chose.
15. As an investor, I want my unsaved Term Sheets kept in the browser draft, so that a refresh doesn't lose quotes I haven't saved yet.
16. As an investor, I want deals saved before this feature to open unchanged, with their current lender terms appearing as the single selected Term Sheet per role, so that nothing I've already underwritten is disturbed.
17. As an investor, I want the deal to still open normally if its stored Term Sheet data is unreadable, with an explicit notice in the comparison section, so that auxiliary data problems never lock me out of a valid deal.
18. As an investor, I want a save performed while Term Sheet data was unreadable to leave that stored data untouched, so that a glitch never silently destroys the quotes on record.
19. As an investor, I want a deal with only one Term Sheet per role to look and behave exactly like today's calculator, so that the feature costs nothing when I'm not comparing.
20. As an investor, I want the comparison to recompute immediately when I edit any deal input, so that the table always reflects the deal as currently entered.
21. As an investor, I want the deal's saved score, ARV, and money-in-deal summary columns to reflect the selected Term Sheets, so that the dashboard ranks deals by the terms I actually chose.

## Implementation Decisions

Decisions below were resolved in the melt session of 2026-07-05 and recorded in the domain glossary (CONTEXT.md) and ADR-0003.

- **Term Sheets are per-deal snapshots, not a cross-deal lender library.** No new persistent lender entity; a Term Sheet is one candidate set of terms for one role on one deal. A library can be layered on later since sheets are snapshots.
- **Exactly one selected Term Sheet per role, and the selected sheet IS the flat field group.** The existing flat `hml*`/`refi*` fields on the Deal remain the live, engine-facing terms; they always mirror the selected Term Sheet. The frozen formula engine, the input form, and the saved-deal validator are untouched. Selecting a different sheet writes the current flat fields back into the previously selected sheet, then copies the new sheet's terms into the flat fields.
- **Comparison = full engine run per candidate.** For each Term Sheet of a role, run the engine with that candidate applied and the other role held at its selected sheet; the engine is pure, so N runs are free. "Scenario" remains reserved for exit strategies (BRRRR / Flip Cash / Flip HML); the comparison follows the active scenario tab (HML: BRRRR or Flip HML; Refi: BRRRR only).
- **Persistence claims the reserved settings column** of the saved-deal row (ADR-0003): alternates + selection metadata serialize to a JSON blob there, while the inputs column stays exactly a flat Deal. Pre-existing rows (legacy `"v2"` marker or empty cell) load as "one Term Sheet per role, selected" — zero migration. A malformed blob loads the deal with a visible warning, and saves write the raw unparsed value back unchanged.
- **Modules.** (1) *Term Sheet core* — deep, pure module: Term Sheet types; extract/apply between a sheet and the flat field groups; the blob codec with legacy-marker and malformed-blob handling. (2) *Comparison calculator* — pure function from deal + sheets + role + scenario to KPI rows. (3) *Comparison UI section* — per-role panel in the calculator: table, add (duplicates selected), select, delete, bad-blob notice. (4) *Wiring* — calculator state ownership, localStorage draft extension (existing key, value shape extended), save/load threading of the settings column.
- The localStorage draft key is unchanged (renaming it silently discards drafts); only the stored value's shape is extended, and a draft without Term Sheet data loads as the zero-migration case above.
- Mutation routes are unchanged in contract; they already carry the settings column through, and cache invalidation on save applies as it does today.

## Testing Decisions

- Good tests assert external behavior through the module's public interface — inputs to outputs — never internal representation. Prior art: the saved-shape validation tests (feed shapes in, assert Deal-or-null out) and the golden tests that freeze the engine.
- **Term Sheet core is tested**: round-trip extract/apply against flat fields; blob serialize/parse round-trip; legacy `"v2"` and empty cell parse as "no Term Sheets"; malformed blob returns an explicit error that preserves the raw string; selection swap preserves all terms.
- **Comparison calculator is tested**: given a deal and known Term Sheets, rows carry the engine's own outputs for each candidate (spot-checked against direct engine calls); the non-compared role is held at its selected sheet; scenario switch changes the KPI set.
- UI section and wiring get no dedicated tests; they are covered by the existing gates (golden tests, type-check, production build).
- The golden tests must pass untouched throughout — this feature never changes an engine formula.

## Out of Scope

- A cross-deal lender library or any reusable lender entity (explicitly deferred; snapshots make it easy to add later).
- Cross-product comparison of HML × Refi pairings, or named whole-deal pairings.
- Comparing Term Sheets across different deals.
- Editing alternates anywhere other than the existing input form (no inline-editable table, no per-row drawer).
- Any change to the formula engine, the saved-deal inputs contract, the dashboard, or the manual `CALC - BRRRR` sheet tab.
- Fetching or syncing real lender rates from anywhere.

## Further Notes

- The previous lender-comparison design (and its ADR) was deliberately deleted on 2026-07-05; this PRD is the fresh start. The term "Term Sheet" was deliberately re-adopted — only the old artifacts stay gone.
- Domain language for this feature (Term Sheet, Scenario, selection relationships) is recorded in CONTEXT.md; the persistence decision is ADR-0003.
- Next step: /plan-phases lender-comparison to produce the phased plan.

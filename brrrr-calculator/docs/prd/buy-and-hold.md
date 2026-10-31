# PRD: Buy & Hold Scenario

**Feature:** `buy-and-hold` · Plan: `plans/buy-and-hold.md` (to be created with `/plan-phases`) · Implement with `/build-phase buy-and-hold`

## Problem Statement

I underwrite every Deal as a BRRRR, and I can check the two Flip exits next to it. Some properties aren't BRRRR candidates, though. They are rent-ready, or need only light work, and the plan is to buy them with a long-term loan and hold. For those deals the calculator gives me the wrong picture:

- It assumes a hard-money purchase and a refi at ARV.
- Its "money in deal" assumes most of my cash comes back at the refi.
- The score, the top bar and the dashboard all judge the deal as a BRRRR.

To check a buy-and-hold purchase today, I would have to do the math by hand, or bend the HML and refi inputs into a shape they weren't designed for. Then the saved deal would show misleading BRRRR numbers on the dashboard.

## Solution

Add a fourth **Scenario** tab, **Buy & Hold (B&H)**, next to BRRRR, Flip Cash and Flip HML. It uses the same Deal inputs, with one difference: the property is bought with a single long-term loan at purchase.

- **The loan.** It is a share of the purchase price, 80% by default. Its rate, term, points and fees come from the selected **Refi Lender** Term Sheet. A loan % of 0 means an all-cash purchase.
- **Rehab** is paid in cash, and the rehab months cost both the usual holding costs and the mortgage payment.
- **Property value.** A toggle on the B&H tab chooses ARV or purchase price. It drives equity, cap rate, GRM and the 5-year IRR exit. The choice is saved per Deal and starts on ARV.
- **KPIs** use the same formulas as BRRRR, fed with the B&H loan and B&H cash in. The Deal Score uses the same rules, fed with B&H Cash-on-Cash and Equity %.
- **The top bar** switches to B&H numbers, score included, when the B&H tab is open.
- **Strategy.** Each Deal remembers whether it is a BRRRR or a B&H deal. Saving from either of those tabs sets the strategy; saving from a Flip tab keeps it. The dashboard card shows that strategy's score with a BRRRR / B&H tag.
- **Lender quotes.** On the B&H tab, the Refi Term Sheet comparison and the early-payoff table use B&H results and the B&H loan size.
- **Max offer** on the B&H tab is the same number as BRRRR's.

The frozen engine is not modified. All B&H math lives in a new, separate module.

## User Stories

1. As an investor, I want a Buy & Hold tab next to the BRRRR and Flip tabs, so that I can evaluate a long-term purchase without leaving the calculator.
2. As an investor, I want the B&H tab to use the same Deal inputs I already entered (price, ARV, rent, expenses, rehab), so that I don't retype anything to compare strategies.
3. As an investor, I want the B&H loan sized as a percentage of the purchase price, so that it matches how purchase loans are actually quoted.
4. As an investor, I want the B&H loan % to start at 80% on every new Deal, so that I only change it when a lender quotes differently.
5. As an investor, I want the B&H loan % to belong to the Refi Lender's terms, so that switching between Refi Term Sheets also switches the loan %.
6. As an investor, I want a loan % of 0 to model an all-cash purchase, so that I don't need a separate cash/financed switch.
7. As an investor, I want the B&H loan to use the selected Refi Term Sheet's rate, term, origination points and buydown points, so that I maintain one set of long-term lender terms.
8. As an investor, I want the B&H loan costs to include the appraisal, underwriting, other misc and extra fees from the Refi Term Sheet, so that my cash in reflects every lender charge.
9. As an investor, I want points and buydown points calculated on the B&H loan amount, not on the refi loan, so that the costs match the loan I'm actually taking.
10. As an investor, I want a separate B&H title cost input, so that the lender's title policy is counted without double-counting the escrow already in my buy closing costs.
11. As an investor, I want the B&H title cost to start blank on every Deal, so that a cost nobody entered never appears as a number.
12. As an investor, I want the refi title/escrow and seasoning fields ignored on B&H, so that BRRRR-only charges don't leak into a purchase loan.
13. As an investor, I want the B&H inputs placed in the Refi section under a "Buy & Hold" sub-heading, so that they sit next to the lender terms they belong with.
14. As an investor, I want rehab, change orders and every additional rehab cost paid in cash on B&H, so that my cash in shows the full out-of-pocket amount when no hard-money lender is involved.
15. As an investor, I want the rehab months to cost the same holding cost as BRRRR plus the mortgage payment, so that I see the true cost of carrying a financed property with no rent.
16. As an investor, I want one-time costs and buy closing costs included in B&H cash in, and credits at close subtracted from it, so that cash in matches what I wire at closing and spend before the first rent.
17. As an investor, I want to see the down payment, loan amount, loan costs, title, closing costs, rehab and holding costs as separate rows adding up to Cash In, so that I can audit every dollar.
18. As an investor, I want B&H cashflow calculated as rent minus operating expenses minus the mortgage payment, so that it is comparable with BRRRR cashflow.
19. As an investor, I want cashflow both with and without the CapEx/vacancy reserve, as on BRRRR, so that I can see the reserve's effect.
20. As an investor, I want B&H Cash-on-Cash calculated as yearly cashflow divided by cash in, so that I can compare the return on my cash across strategies.
21. As an investor, I want B&H DSCR calculated as rent divided by (mortgage + taxes + insurance), so that I know whether a DSCR lender will approve the loan.
22. As an investor, I want a toggle on the B&H tab between ARV and purchase price as the property's value, so that I can see both an optimistic and a conservative picture.
23. As an investor, I want the value toggle to start on ARV and be saved with the Deal, so that the dashboard and a reload show the numbers I chose.
24. As an investor, I want the value toggle to drive equity, cap rate, GRM and the IRR exit price, so that every value-based number agrees with my choice.
25. As an investor, I want B&H Equity % measured as (equity − cash in) ÷ cash in, the same way as BRRRR, so that the two tabs are comparable side by side.
26. As an investor, I want B&H equity in dollars shown as value minus loan, so that I see what I own on day one.
27. As an investor, I want B&H cap rate, GRM and return on equity in the advanced metrics, so that the B&H tab is as deep as the BRRRR tab.
28. As an investor, I want a 5-year IRR at 2%, 3% and 4% appreciation on B&H, calculated like BRRRR's (yearly cashflow, then a year-5 sale minus selling costs and the remaining loan balance), so that I can compare long-term returns.
29. As an investor, I want every B&H number to open a formula explanation when clicked, so that I can check how it was calculated.
30. As an investor, I want the B&H tab laid out like the BRRRR tab (summary tiles, cost breakdown, monthly cashflow, advanced metrics), so that I don't have to learn a new screen.
31. As an investor, I want the B&H tiles colored green/amber/red against my buy-box thresholds, so that weak spots stand out the same way as on BRRRR.
32. As an investor, I want B&H cash in judged against my existing Max Money in Deal threshold, so that I keep one cash limit across strategies.
33. As an investor, I want the top bar to show B&H Cashflow, CoC, DSCR, Equity, Cash In and Score while the B&H tab is open, so that the headline numbers match the tab I'm on.
34. As an investor, I want the top bar to keep showing BRRRR numbers on the Flip tabs, as it does today, so that existing behavior doesn't change.
35. As an investor, I want a B&H Deal Score built from the same rules and GO/NO-GO cutoff as BRRRR, using B&H CoC and Equity % plus Location, so that scores are comparable across strategies.
36. As an investor, I want the max offer price on the B&H tab to be the same number as on BRRRR, so that I have one offer ceiling per Deal.
37. As an investor, I want each Deal to remember whether it is a BRRRR or a B&H deal, so that it is judged by the strategy I intend to use.
38. As an investor, I want saving from the BRRRR or B&H tab to set the Deal's strategy, so that I don't need a separate control to choose it.
39. As an investor, I want saving from a Flip tab to keep the Deal's last strategy, so that peeking at a flip doesn't reclassify the Deal.
40. As an investor, I want new Deals and every existing saved Deal to start as BRRRR, so that nothing on my dashboard changes until I decide.
41. As an investor, I want each dashboard card to show its strategy's score with a small BRRRR / B&H tag, so that I know which lens each score comes from.
42. As an investor, I want dashboard sorting by score to use each Deal's strategy score, so that the ranking reflects how I'd actually buy each property.
43. As an investor, I want the Sheet's summary columns (score, money in deal) to hold the strategy's values for B&H deals, so that the spreadsheet agrees with the dashboard.
44. As an investor, I want the Refi Term Sheet comparison on the B&H tab to show each quote's B&H Cash In, Cashflow, CoC, DSCR and Score, so that I pick the best lender for a hold.
45. As an investor, I want the HML comparison on the B&H tab to keep showing BRRRR results, as Flip Cash does, so that the section isn't empty when no HML is involved.
46. As an investor, I want the early-payoff table (interest plus prepayment penalty by year) sized on the B&H loan while the B&H tab is open, so that it matches the comparison above it.
47. As an investor, I want saved Deals created before this feature to open without errors, with the B&H inputs at their defaults (80% loan, blank title, ARV value, BRRRR strategy), so that nothing breaks.
48. As an investor, I want my unsaved draft to keep the new B&H inputs across a reload, so that I don't lose work.
49. As an investor, I want Reset to put the B&H inputs back to their defaults, so that a reset Deal is clean.
50. As an investor, I want every existing BRRRR and Flip number to stay exactly the same after this ships, so that I can trust past analyses.

## Implementation Decisions

### Modules

**1. Buy & Hold calculator (new, deep module).** A pure function that takes a Deal and returns a full B&H result. It sits outside the frozen engine and imports only the engine's exported building blocks: the monthly operating-expense breakdown, total rehab, and the scoring rules. The formulas:

- **Loan.** Loan = purchase price × B&H loan %. Down payment = purchase price − loan.
- **Loan costs.** These come from the selected Refi Term Sheet, applied to the B&H loan amount:
  - origination points (on the loan)
  - buydown points (on the loan)
  - appraisal
  - underwriting
  - other misc
  - extra fees
  - B&H title cost

  Excluded: refi title/escrow (including its ARV-based auto value), refi LTV, and seasoning.
- **Mortgage payment.** Standard amortization at the refi rate over the refi term. A zero rate divides evenly; a zero loan gives a zero payment.
- **Rehab paid in cash.** Total rehab (estimate + change orders) plus *all* additional rehab costs. The funded/not-funded flag is ignored, because there is no HML.
- **Holding.** Holding = rehab months × (taxes + insurance + state income tax + HOA + $300 + mortgage payment). This is the BRRRR holding formula plus the mortgage.
- **Cash In.** Cash In = down payment + buy closing costs + loan costs + cash rehab + one-time costs + holding − credits at close (project cost adjustments).
- **Value.** Value = ARV or purchase price, per the saved value toggle.
- **Income metrics:**
  - NOI = rent − operating expenses
  - Cashflow = NOI − mortgage. The no-CapEx variant adds the CapEx/vacancy reserve back.
  - CoC = yearly cashflow ÷ cash in, with the same zero/infinite handling as BRRRR
  - DSCR = rent ÷ (mortgage + taxes + insurance)
  - The lender ratio is the same as BRRRR's
- **Value metrics:**
  - Equity $ = value − loan
  - Equity % = (Equity $ − Cash In) ÷ Cash In
  - Cap rate = NOI × 12 ÷ value
  - GRM = value ÷ (rent × 12)
  - ROE = yearly cashflow ÷ Equity $
- **5-year IRR** at 2/3/4% appreciation. The flows match BRRRR's:
  - −Cash In at month 0
  - monthly cashflow for 60 months
  - at month 60: value × (1 + g)^5 × (1 − selling costs %) − remaining loan balance after 60 payments

  The engine's IRR helpers are private, so the new module carries its own amortization and IRR helpers rather than exporting them from the frozen file.
- **Score.** The B&H score feeds B&H CoC and Equity % into the engine's existing scoring function, through a BRRRR-shaped adapter. The scoring rules are reused, not copied.
- **Max offer.** The engine's existing max-offer result, unchanged.

**2. Strategy picker (new, small deep module).**
- A Deal's strategy is BRRRR or Buy & Hold. The picker returns that strategy's headline KPIs and Deal Score:
  - cashflow, CoC, DSCR, Equity %, Equity $
  - money in deal / cash in
  - score
- It is the single source for the dashboard card score (the recomputed listing score), the Sheet summary columns written on save, and the strategy tag.
- When the B&H tab is open, the top bar reads the B&H result directly. On every other tab it shows BRRRR, as today.
- One rule decides the strategy to save: the BRRRR or B&H tab sets it, and a Flip tab keeps the current value.

**3. Term Sheet comparison (extended).**
- The comparison scenario gains a `buyHold` mode, with its own KPI set: Cash In, Cashflow/mo, CoC, DSCR, Score.
- On the B&H tab, the Refi role compares under `buyHold` and the HML role compares under BRRRR.
- The payoff-horizon columns take the loan amount from the active scenario: the B&H loan on the B&H tab, the refi loan elsewhere. The prepayment-penalty schedule and horizons are unchanged.

**4. Deal inputs (extended, schema change).** Four new fields are added to the Deal model. The engine ignores all of them, like the existing prepayment-penalty schedule:

| Field (concept) | Kind | Default | Blank-deal group |
|---|---|---|---|
| B&H loan % of purchase price | whole-number percent | 80 | Lender term — added to the Refi Term Sheet field set, so it travels with each Refi Term Sheet |
| B&H title cost | dollars | 0 (blank) | Deal number — per Deal |
| B&H value basis | enum: ARV / purchase price | ARV | Mode enum — kept |
| Strategy | enum: BRRRR / Buy & Hold | BRRRR | Mode enum — kept |

- The golden fixture (the default deal) gains these fields with inert values. The golden *outputs* do not change.
- Saved-deal parsing already backfills missing keys from the blank deal, so old rows load with the defaults. The marker keys stay the same.
- Existing Refi Term Sheets saved before this feature lack the loan % key. Applying one keeps the Deal's current loan %. This needs a check during implementation.
- The localStorage draft key stays unchanged.

**5. Screens.**
- **B&H tab** in the scenario panel, mirroring the BRRRR view. It has summary tiles, the value toggle, and three groups of rows:
  - Costs: price, down payment, loan, loan costs, title, closing, rehab, holding → Cash In
  - Monthly: rent, expenses, mortgage → cashflow with and without CapEx
  - Advanced: equity, cap rate, GRM, ROE, IRR at 2/3/4%
- **Top bar** accepts the active strategy's KPIs. On B&H, the "Money in Deal" tile reads "Cash In" and is still colored against Max Money in Deal. The max offer always shows BRRRR's.
- **Input form.** The Refi section gains a "Buy & Hold" sub-heading with the loan % and title cost.
- **Formula registry.** It gains B&H entries. The formula modal needs access to the B&H result when it computes live values.
- **Deal card.** It shows a BRRRR / B&H tag next to the score.

**6. Docs.**
- A new ADR: the Deal model may grow engine-inert fields, and new Scenarios live outside the frozen engine and reuse its exported building blocks without changing goldens.
- CONTEXT.md updates:
  - **Scenario** now includes Buy & Hold.
  - New term **Strategy**: the Deal's chosen lens, BRRRR or Buy & Hold, that drives its dashboard score. Avoid calling it "scenario".
  - The Refi Lender also funds the B&H purchase loan.

### Persistence
- There is no new Sheet column. The new inputs ride in the full-Deal JSON column.
- For B&H-strategy Deals, the score column holds the B&H score and the money-in-deal column holds B&H Cash In. ARV and monthly NOI are unaffected.
- The settings column (Term Sheets) is unchanged apart from the loan % now being part of each Refi Term Sheet's terms.

## Testing Decisions

- Good tests here exercise external behavior only: give the module a Deal and assert on the returned numbers and choices. Never assert on intermediate helpers.
- **Buy & Hold calculator** gets a hand-checked fixture whose expected values are worked out independently, plus edge cases:
  - all-cash (loan % = 0, no mortgage, DSCR denominator without P&I)
  - value basis = purchase price vs ARV (equity, cap rate, GRM, IRR change; cashflow, CoC and DSCR don't)
  - zero rehab months (no holding)
  - zero rent (no division blow-ups)
  - funded additional rehab costs still counted as cash
  - title and loan costs computed on the B&H loan, not the refi loan
  - the B&H score equals the engine's scoring rules applied to B&H CoC/Equity %
- **Strategy picker:**
  - a BRRRR Deal returns BRRRR KPIs and score
  - a B&H Deal returns B&H KPIs and score
  - a Deal missing the strategy field reads as BRRRR
  - the save-strategy rule: the BRRRR and B&H tabs set it; Flip tabs keep it
- **Prior art:**
  - fixture-plus-expected-values style, as in the comparison and payoff-horizon tests
  - pure-function tests over saved-row JSON, as in the deal-rows tests
  - optionally, golden-file capture of the B&H result for regression, as in the golden tests
- The existing golden suite must pass unchanged. That proves the frozen engine was not modified.
- No new tests are planned for the comparison extension, saved-deal loading, or UI. The existing suites for those areas must keep passing.

## Out of Scope

- Flip as a saved Strategy, and Flip results on dashboard cards.
- A separate "Purchase Lender" role or its own Term Sheets. The Refi Lender covers it.
- A B&H-specific max offer (for example, the highest price that still meets cashflow, CoC and DSCR) or a separate B&H cash limit.
- Interest-only B&H loans, PMI, ARMs, or seller financing.
- Rent growth, expense growth, tax/depreciation modeling, or exit horizons other than 5 years.
- Renaming Sheet columns or adding new ones.
- Any change to BRRRR, Flip Cash, Flip HML, max-offer or scoring formulas.

## Further Notes

- **Proposed default, to confirm during planning:** a saved Deal opens on its strategy's tab (B&H Deals on the B&H tab).
- On a no-rehab, rent-ready deal the user enters ARV = price. With the value toggle on purchase price, Equity % is typically negative, because cash in exceeds the down payment by the closing and loan costs. That is expected, not a bug.
- The B&H title cost is a per-Deal input even though it sits in the Refi section, because title cost depends on the title company, not the lender. The loan % is a lender term.
- The engine stays frozen (ADR-0002). If a B&H formula later turns out wrong, it is fixed in the B&H module only.

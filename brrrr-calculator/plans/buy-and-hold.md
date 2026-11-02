# Plan: Buy & Hold Scenario

> Source PRD: `docs/prd/buy-and-hold.md` (50 user stories). Breakdown approved 2026-10-31.

## Architectural decisions

Durable decisions that apply across all phases:

- **Frozen engine stays frozen**: `lib/deal-model.ts` is not modified (ADR-0002). All B&H
  math lives in a new pure module, outside the engine, that imports only the engine's exported
  building blocks: the monthly operating-expense breakdown, total rehab, the scoring function and
  the max-offer result. The engine's amortization/IRR helpers are private, so the new module
  carries its own and does not export them out of the frozen file. The golden suite passes
  **byte-identical** in every phase, and the golden *fixture* (`DEFAULT_DEAL`) only gains the
  new fields with inert values.
- **New ADR (written in phase 1)**: the Deal model may grow engine-inert fields, and new
  Scenarios live outside the frozen engine, reuse its exported building blocks, and never
  change goldens.
- **Deal model: three new engine-inert fields** (the engine ignores them, like `refiPppSchedule`).
  A fourth, `bnhTitleCost`, shipped in phase 1 and was removed 2026-11-02 (user decision): the
  lender's title policy is entered as an Additional Refi Fee and sums into loan costs.

  | Field | Kind | Default | Blank-deal group |
  |---|---|---|---|
  | `bnhLoanPct` | whole-number percent of purchase price | `80` | Lender term: joins `REFI_TERM_FIELDS` |
  | `bnhValueBasis` | `'arv' \| 'purchase'` | `'arv'` | Mode enum (kept) |
  | `strategy` | `'brrrr' \| 'buyHold'` | `'brrrr'` | Mode enum (kept) |

- **Scenario keys**: the scenario panel gains the key `buyHold` next to `brrrr`, `flipCash` and
  `flipHml`. The tab label is "Buy & Hold". The comparison scenario type also gains `buyHold`.
- **B&H formulas** (exactly as in the PRD; fixed in the B&H module only if one turns out wrong):
  - Loan = price × `bnhLoanPct`. Down payment = price − loan. A loan % of 0 means all cash.
  - Loan costs come from the selected Refi Term Sheet, applied to the **B&H loan**:
    origination points + buydown points + appraisal + underwriting + other misc + extra fees
    (the lender's title policy is one of the extra fees) + refi title/escrow at the same value
    BRRRR uses, its ARV-based auto value included (user decision 2026-11-02). Refi LTV and
    seasoning are excluded. All cash (loan % = 0) has no lender, so the flat fees (appraisal,
    underwriting, other misc, extra fees, title/escrow) are not charged either (user decision
    2026-11-02).
  - Mortgage = standard amortization at the refi rate over the refi term. A zero rate divides
    evenly, and a zero loan gives a zero payment.
  - Cash rehab = total rehab (estimate + change orders) + **all** additional rehab costs. The
    funded flag is ignored.
  - Holding = rehab months × (taxes + insurance + state income tax + HOA + $300 + mortgage).
  - Cash In = down payment + buy closing costs + loan costs + cash rehab + one-time costs +
    holding − credits at close.
  - NOI = rent − opex. Cashflow = NOI − mortgage, and the no-CapEx variant adds the reserve
    back. CoC = yearly cashflow ÷ Cash In, with the same zero/infinite handling as BRRRR.
    DSCR = rent ÷ (mortgage + taxes + insurance). The lender ratio is the same as BRRRR's.
  - Value = ARV or purchase price per `bnhValueBasis`. Equity $ = value − loan.
    Equity % = (Equity $ − Cash In) ÷ Cash In. Cap rate = NOI × 12 ÷ value.
    GRM = value ÷ (rent × 12). ROE = yearly cashflow ÷ Equity $.
  - 5-year IRR at 2/3/4%: −Cash In at month 0, the monthly cashflow for 60 months, and at
    month 60 value × (1+g)^5 × (1 − selling %) − remaining balance after 60 payments.
  - Score = the engine's scoring function fed B&H CoC and Equity % through a BRRRR-shaped
    adapter. The scoring rules are reused, never copied. The GO/NO-GO cutoff is the same.
  - Max offer = the engine's existing result, unchanged.
- **Strategy picker**: one pure module returns the active strategy's headline KPIs (cashflow,
  CoC, DSCR, Equity %, Equity $, money in deal / Cash In) and score. A missing `strategy` reads
  as BRRRR. It is the single source for the dashboard card score, the Sheet summary columns and
  the strategy tag. One rule decides the strategy to save: the `brrrr` and `buyHold` tabs set
  it, and the Flip tabs keep it.
- **Persistence**: no new Sheet column and no Sheet schema change. The new fields ride in the
  full-Deal JSON (column H). For B&H-strategy Deals, column D (score) holds the B&H score and
  column F (money in deal) holds B&H Cash In. Columns E (ARV) and G (monthly NOI) are
  unchanged. `bnhLoanPct` rides inside each Refi Term Sheet's `terms` in the column-I blob, and
  the codec and blob version are unchanged.
- **Backward compatibility**: saved-deal parsing already backfills missing keys from
  `BLANK_DEAL`, so old rows load with the defaults and the marker keys are unchanged. Applying an
  old Refi Term Sheet that has no `bnhLoanPct` key keeps the Deal's current loan % (a spread
  that skips missing keys). The localStorage key `cgm-deal-calc-v2` is unchanged.
- **Routes**: no new routes. `/deal/new`, `/deal/[id]` and `/api/deals/*` are unchanged. A
  saved Deal opens on its strategy's tab.
- **Gates every phase**: `npm test`, `npx tsc --noEmit`, `npm run build`, then commit + push.

---

## Phase 1: B&H tab — Cash In and cashflow

**User stories**: 1–21, 29–32, 47–50

### What to build

The tracer bullet. Add the new Deal fields to the model, the golden fixture (inert
values) and `BLANK_DEAL` (in their groups). Add `bnhLoanPct` to the Refi Term Sheet field set.
Add the new B&H calculator module, covering the loan, loan costs, mortgage, cash rehab, holding,
Cash In, NOI, cashflow (with and without CapEx), CoC, DSCR and lender ratio. The Refi section of
the input form gains a "Buy & Hold" sub-heading with the loan %, using
blur-to-commit inputs. The scenario panel gains a Buy & Hold tab laid out like BRRRR: summary
tiles colored against the buy-box thresholds, with Cash In judged against Max Money in Deal; a
cost breakdown (price, down payment, loan, loan costs, closing, rehab, holding → Cash In);
and monthly rows (rent, expenses, mortgage → cashflow with and without CapEx). Each B&H number
opens a formula explanation. The formula modal can compute live values from the B&H result.
Write the new ADR.

User-visible result: on any Deal, the B&H tab shows a correct, auditable Cash In and monthly
cashflow. The loan % follows the selected Refi Term Sheet. Drafts, Reset and old saved deals
behave correctly. Every BRRRR and Flip number is unchanged.

### Acceptance criteria

- [x] Golden suite passes unchanged. The engine file has no formula diff — only the
      engine-inert fields on `Deal` and `DEFAULT_DEAL` (ADR-0005, user-approved 2026-10-31).
- [x] B&H module tests: a hand-checked fixture with independently worked expected values for
      every phase-1 output, plus edge cases: all cash (loan % = 0: no mortgage, DSCR denominator
      without P&I), zero rehab months (no holding), zero rent (no division blow-ups), funded
      additional rehab costs still counted as cash, and points/buydown computed on the B&H loan,
      not the refi loan.
- [x] Refi LTV and seasoning have no effect on any B&H number. (Refi title/escrow joined B&H
      loan costs 2026-11-02, at BRRRR's value.)
- [x] A new Deal and Reset show loan % = 80. A saved Deal from before this feature opens
      without error with the defaults (80%, ARV, BRRRR). (Title cost removed 2026-11-02.)
- [x] Switching Refi Term Sheets switches the loan %. Applying a sheet saved before this
      feature keeps the Deal's current loan % (covered by a term-sheet test).
- [x] The B&H inputs survive a page reload as an unsaved draft.
- [x] Each B&H row and tile opens its formula explanation with live values.
- [x] The B&H tiles are green/amber/red against the thresholds, and Cash In against Max Money
      in Deal.
- [x] ADR written: engine-inert Deal fields + new Scenarios outside the frozen engine.

---

## Phase 2: Value toggle and advanced metrics

**User stories**: 22–28

### What to build

Add a toggle on the B&H tab between ARV and purchase price, bound to `bnhValueBasis`. It starts
on ARV and saves with the Deal. Extend the B&H module with Equity $, Equity %, cap rate, GRM,
ROE and the 5-year IRR at 2/3/4% appreciation, all driven by the chosen value. The B&H tab shows
Equity in its summary and gets an advanced-metrics section like BRRRR's (equity, cap rate, GRM,
ROE, IRR table). Each new number opens its formula explanation.

User-visible result: flipping the toggle changes equity, cap rate, GRM and IRR, and leaves
cashflow, CoC and DSCR unchanged. A reload or reopened Deal keeps the chosen basis.

### Acceptance criteria

- [x] The B&H fixture is extended with independently worked Equity $/%, cap rate, GRM, ROE and
      IRR values.
- [x] Test: value basis = purchase price vs ARV changes equity, cap rate, GRM and IRR, and does
      not change cashflow, CoC or DSCR.
- [x] IRR flows match the stated formula (month-0 Cash In, 60 monthly cashflows, year-5 sale
      net of selling costs and remaining balance). Zero rent and zero loan don't throw.
- [x] The toggle persists through save/load and draft reload. Old Deals open on ARV.
- [x] Every new metric opens its formula explanation with live values.
- [x] Golden suite passes unchanged.

---

## Phase 3: B&H score and top bar

**User stories**: 33–36

### What to build

Add the B&H Deal Score: the engine's scoring function fed B&H CoC and Equity % (plus Location)
through a BRRRR-shaped adapter, with the same GO/NO-GO cutoff. While the B&H tab is open, the
top bar shows B&H Cashflow, CoC, DSCR, Equity, Cash In (tile relabeled "Cash In", still colored
against Max Money in Deal) and Score. On every other tab it shows BRRRR numbers, as today. The
max offer always shows BRRRR's, including on the B&H tab. The B&H tab shows the score, and the
score opens its formula explanation.

User-visible result: switching to the B&H tab changes the headline numbers and score to the
B&H lens. Switching to a Flip tab shows BRRRR, exactly as before.

### Acceptance criteria

- [x] Test: the B&H score equals the engine's scoring rules applied to B&H CoC/Equity %, with
      the same GO/NO-GO cutoff.
- [x] The top bar shows B&H KPIs and score on the B&H tab, and BRRRR on the BRRRR, Flip Cash and
      Flip HML tabs.
- [x] The "Cash In" tile on B&H is colored against Max Money in Deal.
- [x] Max offer is identical on the BRRRR and B&H tabs.
- [x] Golden suite passes unchanged.

---

## Phase 4: Strategy on save and on the dashboard

**User stories**: 37–43

### What to build

Add the strategy picker module and the save-strategy rule. Saving from the BRRRR or B&H tab sets
`strategy`, and saving from a Flip tab keeps it. On save, the Sheet's score and money-in-deal
columns hold the picker's values (the B&H score and Cash In for B&H Deals). The dashboard's
recomputed listing score goes through the picker, so each card shows its strategy's score with
a small BRRRR / B&H tag, and sorting by score uses that score. A saved Deal opens on its
strategy's tab. CONTEXT.md is updated: Scenario now includes Buy & Hold; new term **Strategy**
(the Deal's chosen lens, BRRRR or Buy & Hold, which drives its dashboard score; avoid calling it
"scenario"); the Refi Lender also funds the B&H purchase loan.

User-visible result: save a Deal from the B&H tab, and the dashboard card shows its B&H score
tagged "B&H", ranks by it, and reopens on the B&H tab. Every existing Deal still reads BRRRR.

### Acceptance criteria

- [x] Picker tests: a BRRRR Deal returns BRRRR KPIs and score, a B&H Deal returns B&H KPIs and
      score, and a Deal missing `strategy` reads as BRRRR.
- [x] Save-rule test: the `brrrr` and `buyHold` tabs set the strategy, and `flipCash`/`flipHml`
      keep the current value.
- [x] Listing-score tests over saved-row JSON: a B&H row scores with the B&H lens, and old rows
      score as BRRRR.
- [x] Columns D and F hold the strategy's values on save. Columns E and G are unchanged.
- [x] Cards show the strategy tag next to the score. Sorting by score uses the strategy score.
      (The dashboard had no score sort before; phase 4 added "Score: high → low / low → high".)
- [x] A saved Deal opens on its strategy's tab. `/deal/new` opens on BRRRR.
- [x] Mutation routes still call `revalidateTag('deals')`.
- [x] CONTEXT.md updated (Scenario, Strategy, Refi Lender).
- [x] Golden suite and existing deal-rows / deal-sort / parse-saved-deal suites pass.

---

## Phase 5: Lender quotes on the B&H tab

**User stories**: 44–46

### What to build

The Term Sheet comparison gains a `buyHold` scenario with its own KPI set: Cash In,
Cashflow/mo, CoC, DSCR and Score, each candidate computed through the B&H module. On the B&H
tab, the Refi role compares under `buyHold` and the HML role compares under BRRRR (as Flip Cash
does). The payoff-horizon columns take their loan amount from the active scenario: the B&H loan
on the B&H tab and the refi loan elsewhere. The PPP schedule and horizons are unchanged.

User-visible result: on the B&H tab, comparing Refi quotes ranks lenders by B&H Cash In,
cashflow and score, and the early-payoff table matches the B&H loan size.

### Acceptance criteria

- [ ] On the B&H tab, the Refi comparison shows B&H Cash In, Cashflow/mo, CoC, DSCR and Score
      per sheet, each candidate using its own loan % and terms.
- [ ] On the B&H tab, the HML comparison shows BRRRR KPIs.
- [ ] On the B&H tab, the payoff-horizon matrix is sized on each sheet's B&H loan. On other tabs
      it is unchanged.
- [ ] Existing compare-term-sheets and payoff-horizon suites pass unchanged.
- [ ] Golden suite passes unchanged.

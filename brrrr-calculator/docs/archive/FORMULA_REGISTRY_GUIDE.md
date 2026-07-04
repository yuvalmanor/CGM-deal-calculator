> **Historical — describes the retired V1 calculator.** Kept for project history only; do not follow. The live app is documented in `CLAUDE.md`, `docs/architecture.md`, and `docs/calculations.md`. See `docs/adr/0002-v2-calculator-is-canonical.md`.

# Formula Registry Guide

This file is the content reference for `lib/formulaRegistry.ts`.
Every entry defines what appears in the FormulaModal when a user clicks a `?` button.

Each entry must have:
- `title` — metric name as shown in the modal header
- `formula` — human-readable formula string (monospace)
- `calcFn` — function that receives `(results: DealResults, inputs: DealInputs)` and returns a formatted string showing the live calculation with actual values
- `note` — context, thresholds, or caveats shown below the divider

---

## KPI Strip Modals

### `'cf'` — Monthly cashflow
- **Title:** Monthly cashflow
- **Formula:** `Gross Rent − Total Monthly Expenses − Custom Expenses`
- **Calc example:** `$2,434 − $1,943 − $105 = $386`
- **Note:** Target: ≥ $300/mo. Includes all non-funded custom expenses (monthly + annual÷12). Does not include one-time expenses.

### `'roi'` — Cash-on-cash ROI
- **Title:** Cash-on-cash ROI
- **Formula:** `(Net Cashflow × 12) ÷ Money Left in Deal`
- **Calc example:** `($386 × 12) ÷ $60,208 = 7.7%`
- **Note:** Uses the HML scenario money-in-deal. If money-in-deal is ≤ $0 (full BRRRR with cash back), ROI is theoretically infinite.

### `'equity_kpi'` — Equity post-Refi
- **Title:** Equity post-Refi
- **Formula:** `ARV − Refi Loan Amount`
- **Calc example:** `$300,000 − $195,000 = $105,000 → after sale costs: $80,500`
- **Note:** This is your equity cushion after refinancing. Higher equity = lower risk and more exit options.

### `'dscr'` — DSCR
- **Title:** DSCR (Debt Service Coverage Ratio)
- **Formula:** `Gross Rent ÷ (Mortgage PI + Insurance + Property Tax)`
- **Calc example:** `$2,434 ÷ ($1,297 + $143 + $470) = 1.27`
- **Note:** Most DSCR lenders require ≥ 1.25 to approve a cash-out refinance. Values below 1.0 mean the property doesn't cover its debt service.

---

## Deal Anatomy Modals

### `'pp'` — Purchase price
- **Title:** Purchase price
- **Formula:** `Input — asking / negotiated price`
- **Calc example:** `$230,000`
- **Note:** `PPSQFT = $230,000 ÷ 1,621 sqft = $141.89/sqft`

### `'rehab_total'` — Total rehab
- **Title:** Total rehab
- **Formula:** `Rehab Estimate + Change Orders`
- **Calc example:** `$14,080 + $2,970 = $17,050`
- **Note:** Change orders are paid out-of-pocket (not financed by HML). Add a 10–20% buffer for surprises.

### `'closing_buy'` — Closing costs on purchase
- **Title:** Closing costs — purchase
- **Formula:** `Purchase Price × 2%` (or manual override)
- **Calc example:** `$230,000 × 2% = $4,600`
- **Note:** Covers title, escrow, and lender fees. Override to $0 if seller is paying closing costs.

### `'holding'` — Holding costs
- **Title:** Holding costs during rehab
- **Formula:** `(Tax + Insurance + HOA + State Tax + $300 buffer) × Rehab Months`
- **Calc example:** `($470 + $143 + $32 + $0 + $300) × 1 mo = $945`
- **Note:** The $300/mo buffer covers utilities and incidentals. Holding costs stop when the property is rented or sold.

### `'all_in'` — All-in cost
- **Title:** All-in cost (cash)
- **Formula:** `PP + Closing Costs + Rehab + Change Orders + Holding Costs`
- **Calc example:** `$230,000 + $4,600 + $14,080 + $2,970 + $945 = $252,595`
- **Note:** This is your total cash deployed before any financing. The benchmark for evaluating all-cash deals.

### `'money_in_deal'` — Money left in deal
- **Title:** Money left in deal
- **Formula:** `All-in Cost − Cash Received from Refi Lender − Other Adjustments at Close`
- **Calc example (HML):** `$88,000 − $15,977 − $0 = $60,208 (via HML)`  
  `$252,595 − $183,771 − $0 = $60,208 (via cash)`
- **Note:** Capital permanently tied up in this asset after refinancing. Full BRRRR = $0 or negative (cash back). Lower is better.

---

## Monthly P&L Modals

### `'mortgage_pi'` — Mortgage (PI)
- **Title:** Mortgage payment (Principal + Interest)
- **Formula:** `Loan × (monthly rate) ÷ (1 − (1 + monthly rate)^−360)`
- **Calc example:** `$195,000 × 0.5833% ÷ (1 − (1.005833)^−360) = $1,297/mo`
- **Note:** 30-year fixed amortization at 7.0% annual rate. P+I only — tax and insurance are listed separately.

### `'prop_tax'` — Property tax
- **Title:** Property tax
- **Formula:** `Annual property tax ÷ 12`
- **Calc example:** `$5,640/yr ÷ 12 = $470/mo`
- **Note:** Find the annual tax bill on the county appraisal district website. Texas has no state income tax but property taxes are high.

### `'insurance'` — Insurance
- **Title:** Landlord insurance
- **Formula:** `Annual premium ÷ 12`
- **Calc example:** `$1,720/yr ÷ 12 = $143/mo`
- **Note:** Landlord policies (DP3) are different from homeowner's policies. Budget $100–$200/mo for SFR in Texas.

### `'capex'` — CapEx + vacancy reserve
- **Title:** CapEx + vacancy reserve
- **Formula:** `Gross Rent × 15%`
- **Calc example:** `$2,434 × 15% = $365/mo`
- **Note:** Covers capital expenditures (roof, HVAC, appliances), repairs, and vacancy periods. Conservative default. Adjust for property age and condition.

### `'pm'` — Property management
- **Title:** Property management fee
- **Formula (percent):** `Gross Rent × PM Rate`  
  **Formula (fixed):** `Fixed monthly amount`
- **Calc example:** `$2,434 × 0% = $0/mo` (self-managed)
- **Note:** Professional PMs typically charge 8–12% in DFW. Factor in vacancy coverage and lease-up fees.

### `'net_cashflow'` — Net cashflow
- **Title:** Net monthly cashflow
- **Formula:** `Gross Rent − Mortgage PI − Tax − Insurance − HOA − CapEx − PM − Custom Expenses`
- **Calc example:** `$2,434 − $1,297 − $470 − $143 − $32 − $365 − $0 − $105 = $22`
- **Note:** This is your monthly take-home after all operating expenses. Target: ≥ $300/mo for a solid deal.

---

## HML Expense Modals

### `'hml_principal'` — HML loan principal
- **Title:** HML loan amount
- **Formula:** `min(PP × Leverage%, ARV × 75%)`
- **Calc example:** `min($230,000 × 69.6%, $300,000 × 75%) = min($160,080, $225,000) = $160,000`
- **Note:** Hard-capped at 75% of ARV regardless of leverage setting. This is the amount you borrow from the hard money lender.

### `'hml_interest'` — HML total interest
- **Title:** HML total interest paid
- **Formula:** `HML Loan × Monthly Rate × Months to Refi`
- **Calc example:** `$160,000 × 0.83%/mo × 1 mo = $1,327`
- **Note:** This is the total interest cost until you refinance. Short hold time is key — every extra month adds $1,327 here.

### `'hml_points'` — HML points
- **Title:** HML origination points
- **Formula:** `HML Loan × Points %`
- **Calc example:** `$160,000 × 2% = $3,200`
- **Note:** Points are paid at closing and are a one-time cost. Negotiable with repeat lenders.

### `'hml_total'` — Total HML cost
- **Title:** Total hard money cost
- **Formula:** `Principal + Interest + Points + Underwriting + Appraisal + Other Fees`
- **Calc example:** `$160,000 + $1,327 + $3,200 + $1,295 + $0 + $495 = $166,317`
- **Note:** This is the full amount you owe the HML lender at payoff. Compare this against the Refi cash you receive.

---

## Refi Expense Modals

### `'refi_loan'` — Refi loan amount
- **Title:** Refinance loan amount
- **Formula:** `ARV × LTV%`
- **Calc example:** `$300,000 × 65% = $195,000`
- **Note:** DSCR lenders typically offer 65% LTV for investment properties. The auto-solve finds the highest LTV that still produces $300/mo cashflow.

### `'refi_points'` — Refi points
- **Title:** Refinance origination points
- **Formula:** `Refi Loan × Points %`
- **Calc example:** `$195,000 × 1.5% = $2,925`
- **Note:** Points paid at the long-term loan closing. Factor these into your total Refi cost.

### `'refi_total'` — Total Refi closing cost
- **Title:** Total refinance closing cost
- **Formula:** `Points + Underwriting + Appraisal + Other/Escrow + Title Costs`
- **Calc example:** `$2,925 + $1,599 + $750 + $500 + $5,455 = $11,229`
- **Note:** This reduces the cash you receive from the lender. The actual cash in your pocket is the loan amount minus these closing costs.

### `'cash_from_lender'` — Cash from Refi lender
- **Title:** Cash received from Refi lender
- **Formula:** `Refi Loan Amount − Refi Fees − Refi Title Costs`
- **Calc example:** `$195,000 − $5,774 − $5,455 = $183,771`
- **Note:** This is the actual check you receive at the refi closing. It first pays off the HML; any remainder is your cash back.

### `'net_cash_closing'` — Net cash at closing
- **Title:** Net cash at Refi closing
- **Formula:** `Cash from Lender − HML Total Debt`
- **Calc example:** `$183,771 − $167,794 = $15,977`
- **Note:** Positive = full BRRRR (you get cash back after paying off HML). Negative = partial BRRRR (you bring cash to closing to make up the difference).

---

## Scorecard Modals

### `'score_equity'` — Equity score
- **Title:** Equity score
- **Formula:** `Equity % → bracket → score (0–10)`
- **Calc example (HML):** `$80,500 ÷ $300,000 = 26.8% → bracket ≥20% → score 8/10`
- **Note:** Scoring: ≥35%=10, ≥30%=9, ≥20%=8, else 0. Uses equity post-Refi in HML scenario, equity vs all-in in Cash scenario.

### `'score_roi'` — ROI score
- **Title:** ROI score
- **Formula:** `CoC ROI % → bracket → score (0–10)`
- **Calc example:** `7.7% → bracket ≥7% → score 7/10`
- **Note:** Scoring: ≥10%=10, ≥9%=9, ≥8%=8, ≥7%=7, ≥6%=6, ≥5%=5, else 0.

### `'score_location'` — Location score
- **Title:** Location / school district score
- **Formula:** `School grade → bracket → score (0–10)`
- **Calc example:** `Grade 12 (B) → score 9/10`
- **Note:** Scoring: 15=10, 12=9, 10=8, 9=7, else 0. Use GreatSchools.org to find the school district score. Higher-rated schools = lower tenant turnover and stronger appreciation.

---

## MAO Modals

### `'mao1'` — MAO (max money in deal)
- **Title:** MAO — max $ in deal
- **Formula:** Algebraic solve for PP such that `moneyInDeal ≤ maxMoneyInDeal`
- **Calc example:** `Solving for PP with max $65,000 in deal → PP ≤ $220,246`
- **Note:** At $230,000 asking price, you need to negotiate $9,754 (4.2%) below asking to keep your trapped capital under $65,000.

### `'mao2'` — MAO (min equity)
- **Title:** MAO — min equity %
- **Formula:** Algebraic solve for PP such that `equity post-refi ≥ minEquityPct`
- **Calc example:** `Solving for PP with min 20% equity → PP ≤ $221,245`
- **Note:** Ensures you maintain a minimum equity cushion after refinancing. Protects against market downturns.

---

## One-Time Custom Expense Modal Template

For any one-time custom expense, the modal is dynamically generated:

- **Title:** `[Expense Name] — one-time`
- **Formula:** `One-time expense entered manually`
- **Calc example:** `$[amount]`
- **Note:** One-time expense — added to deal anatomy as an acquisition cost. Not included in monthly P&L.

## Annual Custom Expense Modal Template

For any annual custom expense:

- **Title:** `[Expense Name] — annual expense`
- **Formula:** `Annual cost ÷ 12 months`
- **Calc example:** `$[amount]/yr ÷ 12 = $[amount/12]/mo`
- **Note:** Annual expense converted to monthly for P&L. Included in PITI and reduces monthly cashflow.

> **Business-side reference.** This documents the owner's manual `CALC - BRRRR` Excel tab — the business logic the app's engine grew out of. The live engine (`lib/deal-model.ts`, reference: `docs/calculations.md`) intentionally diverges in places (carry months, DSCR variants, MAO-70, advanced metrics) — see `docs/adr/0002-v2-calculator-is-canonical.md`. Where they differ, the engine + golden tests win.

# CGM Ventures — CALC - BRRRR Cheat Sheet

---

## FLOWCHART: How the Calculator Works

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          STEP 1 — FILL IN INPUTS                           │
│                                                                             │
│  Property Address · Seller · Type · Sqft · Year Built                      │
│  Purchase Price (PP) · Rehab Estimate · Change Orders                      │
│  Market Rent · ARV (After Repair Value)                                     │
│  Exit Strategy: "flip" or "rental"                                          │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     STEP 2 — CALCULATED PROPERTY METRICS                   │
│                                                                             │
│  · Price per sqft (purchase & ARV)                                          │
│  · Closing costs on purchase (2% of PP)                                    │
│  · Rehab duration in months  (~$1,000/day)                                  │
│  · Holding costs during rehab (taxes + insurance + $300/mo misc)           │
│  · Total All-In Cash Cost (PP + closing + rehab + holding)                 │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
              ┌────────────────────┴─────────────────────┐
              ▼                                           ▼
┌─────────────────────────┐               ┌──────────────────────────────────┐
│  SCENARIO A: ALL CASH   │               │  SCENARIO B: HARD MONEY (HML)    │
│                         │               │                                  │
│  Pay 100% out of pocket │               │  HML finances 75% of PP          │
│  No lender involved     │               │  + 100% of rehab                 │
│  at acquisition         │               │  You bring only the gap          │
└───────────┬─────────────┘               └────────────────┬─────────────────┘
            │                                              │
            ▼                                              ▼
┌─────────────────────────┐               ┌──────────────────────────────────┐
│  FLIP ANALYSIS (Cash)   │               │  FLIP ANALYSIS (HML)             │
│                         │               │                                  │
│  Profit = ARV           │               │  Profit = ARV                    │
│    - All-In Cost        │               │    - HML total debt              │
│    - Sale closing (2%)  │               │    - Cash you brought in         │
│    - Agent fees (6%+500)│               │    - Sale closing (2%)           │
│  ROI = Profit / All-In  │               │    - Agent fees (6%+500)         │
└───────────┬─────────────┘               │  ROI = Profit / Cash-In          │
            │                             └────────────────┬─────────────────┘
            │                                              │
            └────────────────────┬─────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      STEP 3 — CASH-OUT REFINANCE (REFI)                    │
│                                                                             │
│  Refi Loan  = ARV × LTV%  (LTV capped at 65%, or lower if needed          │
│                             to ensure $300+/mo cash flow)                   │
│  Cash Out   = Refi Loan − Refi Fees − Closing Costs                        │
│  Net Effect = Cash Out − HML Total Debt                                    │
│    → Positive: lender gives you money at closing (full BRRRR)              │
│    → Negative: you owe money at closing (partial BRRRR)                    │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   STEP 4 — MONTHLY RENTAL CASH FLOW (PITI)                 │
│                                                                             │
│  Gross Income  = Market Rent                                                │
│  Expenses:                                                                  │
│    · Property Tax /mo           (manual input)                              │
│    · Insurance /mo              (manual input)                              │
│    · CapEx / Maintenance / Vacancy  = Rent × 15%                           │
│    · Property Management            = Rent × 10%                           │
│    · Mortgage P+I  = PMT(rate/12, 360 months, −LTV × ARV)                  │
│       OR  Mortgage Interest-Only    (manual input)                          │
│  DSCR = Rent / (Mortgage + Insurance + Tax)                                │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              STEP 5 — BOTTOM LINE  (two scenarios side-by-side)            │
│                                                                             │
│  CASH scenario             │  HML scenario                                 │
│  ─────────────────────     │  ──────────────────────────                   │
│  Money In = All-In − Refi  │  Money In = HML cash-in − (Cash Out − HML)   │
│  Equity $ = ARV − All-In   │  Equity $ Post-Refi = ARV − Refi Loan        │
│  Monthly NOI = Rent − PITI │  (same NOI formulas)                          │
│  Annual ROI = NOI×12 / In  │  Annual ROI = NOI×12 / Money In              │
│                                                                             │
│  DEAL SCORE (out of 30)                                                    │
│    Equity Score  (35%→10, 30%→9, 20%→8, else 0)                           │
│    ROI Score     (10%→10, 9%→9 ... 5%→5, <5%→0)                           │
│    Location Score (school district grade — manual)                          │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STEP 6 — MAXIMUM ALLOWABLE OFFER (MAO)                  │
│                                                                             │
│  MAO-1: keeps ≤ $65k of your own money in the deal after Refi              │
│  MAO-2: keeps ≥ 20% equity in the property after Refi                      │
│  % Below Asking = MAX(discount needed for MAO-1, MAO-2)                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## SECTION 1 — Property Details (Rows 2–16)

These are the **primary inputs** and derived property metrics. Yellow/user-filled cells feed the rest of the sheet.

| Row | Label | Formula | Explanation |
|-----|-------|---------|-------------|
| 2 | Seller / Agent | *(manual)* | Name and source of the deal |
| 3 | Property Type | *(manual)* | e.g. "SFR 3/1", "duplex 4/2" |
| 4 | Sqft | *(manual)* | Total livable square footage |
| 5 | Year Built | *(manual)* | Used to gauge rehab risk |
| 6 | Asking Price (PP) | *(manual)* | Purchase price you're evaluating |
| 7 | PPSQFT Purchase | `= PP / sqft` | How much you're paying per sqft — benchmark for the market |
| 8 | PPSQFT Sale (ARV) | `= ARV / sqft` | Implied sale price per sqft — confirm it matches comps |
| 9 | Closing Costs (Buy) | `= PP × 2%` | Estimated title/escrow/transfer costs at acquisition |
| 10 | Rehab Estimate | *(manual)* | Contractor scope-of-work estimate |
| 11 | Change Orders / Appliances | *(manual)* | Buffer for overruns and appliances (out-of-pocket, not financed) |
| 12 | Months of Rehab | `= (rehab + change_orders) / 30,000` | Assumes ~$1,000/day of work; sets the holding period |
| 13 | Market Rent | *(manual)* | Gross monthly rent at stabilization |
| 14 | Holding Costs | `= months × (tax + ins + HOA + state_tax) + (300 × months)` | Carries cost during rehab: real expenses + $300/mo misc |
| 15 | All-In Cash Cost | `= PP + closing_costs + rehab + change_orders + holding_costs` | Total cash needed if buying with no financing |
| 16 | ARV | *(manual)* | After-Repair Value — appraised or comparable-based estimate |

---

## SECTION 2 — Cash Flip Analysis (Rows 17–20)

Answers: *"If I buy all-cash and flip immediately after rehab, what do I make?"*

| Row | Label | Formula | Explanation |
|-----|-------|---------|-------------|
| 17 | Closing Costs (Sell) | `= ARV × 2%` | Title/escrow/transfer on the sale side |
| 18 | Sale Costs (Agent + Notary) | `= (ARV × 6%) + $500` | 6% agent commissions plus notary/misc |
| 19 | Net Profit — Cash Flip | `= ARV − (All-In + sale_closing + agent_costs)` | Raw dollar profit from a cash fix-and-flip |
| 20 | Net ROI — Cash Flip | `= net_profit / all_in_cost` | Return on every dollar deployed (all cash) |

---

## SECTION 3 — HML (Hard Money Loan) Analysis (Rows 21–32)

Answers: *"If I use a hard money lender to buy and rehab, what does the flip look like?"*

| Row | Label | Formula | Explanation |
|-----|-------|---------|-------------|
| 21 | PP Financed (HML) | `= HML_leverage% × PP` | How much of the purchase the HML lender covers (default 75%) |
| 22 | Rehab Financed (HML) | `= HML_rehab% × rehab` | How much of the rehab the HML lender covers (default 100%) |
| 23 | Total HML Loan | `= IF (PP_fin + rehab_fin) > ARV×75% → ARV×75%; ELSE → PP_fin + rehab_fin` | HML loan is **capped at 75% of ARV** to protect the lender; you can never borrow more than that |
| 24 | Cash to Close (HML) | `= all_in_cost − HML_loan` | Out-of-pocket cash you bring to the HML deal |
| 25 | Months to Refi/Sale | *(manual)* | Seasoning period before you can refinance or sell |
| 26 | Monthly Interest | `= HML_monthly_rate% × HML_loan` | Dollar interest cost per month (default 1%/mo = 12% annual) |
| 27 | Total Interest Paid | `= months × monthly_interest` | Interest accumulated over the full rehab/hold period |
| 28 | Total HML Debt | `= HML_loan + total_interest + HML_fees` | Everything you owe to the HML lender at payoff |
| 29 | Closing Costs (Sell) | `= ARV × 2%` | Same as row 17 — sale-side title/escrow |
| 30 | Sale Costs (Agent) | `= (ARV × 6%) + $500` | Same as row 18 — agent commissions |
| 31 | Net Profit — HML Flip | `= ARV − (HML_debt + cash_brought_in + sale_closing + agent_costs)` | Flip profit when using hard money |
| 32 | Net ROI — HML Flip | `= HML_net_profit / cash_brought_in` | Cash-on-cash return — much higher than cash flip because leverage amplifies returns |

---

## SECTION 4 — Cash-Out Refinance (Rows 33–38)

Answers: *"After rehab, how much cash does the bank give me back?"*

| Row | Label | Formula | Explanation |
|-----|-------|---------|-------------|
| 33 | Refi Loan Amount | `= ARV × LTV%` | Bank lends against the appraised ARV (LTV from row 106) |
| 34 | Refi Fees & Escrows | `= total_refi_legal_fees` *(from row 113)* | All lender fees: appraisal + underwriting + points + misc |
| 35 | Fees as % of Loan | `= refi_fees / refi_loan` | Sanity check — typically 4–10% |
| 36 | Closing Costs (Title) | `= (ARV × 2%) + $500` | Title insurance + notary at refi closing |
| 37 | Net Cash from Lender | `= refi_loan − refi_fees − closing_costs` | Actual cash deposited into your account at refi closing |
| 38 | Net Cash In/Out | `= cash_from_lender − HML_total_debt` | **Positive** = bank pays off HML and hands you leftover cash (full BRRRR). **Negative** = you owe money at closing (partial BRRRR) |

---

## SECTION 5 — Monthly Rental Cash Flow / PITI (Rows 39–52)

Answers: *"After the refi, how much does this property cash flow every month?"*

| Row | Label | Formula | Explanation |
|-----|-------|---------|-------------|
| 39 | Money Left in Deal | `= HML_cash_in − net_cash_in_out` | How much of your own money is permanently tied up in this asset after refi |
| 40 | Gross Rent | `= market_rent` *(ref row 13)* | Monthly gross income |
| 41 | Property Tax /mo | *(manual)* | Annual tax ÷ 12 |
| 42 | Insurance /mo | *(manual)* | Annual insurance ÷ 12 |
| 43 | State Income Tax /mo | *(manual, optional)* | State-level landlord income tax if applicable |
| 44 | HOA /mo | *(manual, optional)* | Homeowner association dues |
| 45 | CapEx / Maintenance / Vacancy | `= rent × 15%` | Reserve for repairs, capital improvements, and vacancy (15% of rent) |
| 46 | Property Management | `= rent × 10%` | PM company fee (10% of rent) |
| 47 | Mortgage P+I | `= PMT(annual_rate/12, 360, −LTV × ARV)` | Standard 30-year fixed amortized payment |
| 48 | LTV for Min $300 Cash Flow | `= PV(rate/12, 360, −(rent − tax − ins − capex − PM − $300)) / ARV` | Back-solves: *what is the max LTV where you still pocket $300/mo?* — used to set the Refi LTV cap |
| 49 | Mortgage Interest Only | *(manual)* | Alternative IO payment for comparison |
| 50 | Total PITI Expenses | `= SUM(tax + ins + HOA + capex + PM + mortgage_PI)` | All monthly costs including P+I mortgage |
| 51 | Total Expenses (IO) | `= tax + ins + HOA + capex + PM + mortgage_IO` | Same but using interest-only payment |
| 52 | DSCR | `= rent / (mortgage_PI + insurance + tax)` | Debt Service Coverage Ratio — lenders want ≥ 1.25; your deal quality indicator |

---

## SECTION 6 — Bottom Line: Cash Scenario (Rows 54–68)

Answers: *"If I bought all-cash then refi'd, where does the deal stand?"*

| Row | Label | Formula | Explanation |
|-----|-------|---------|-------------|
| 54 | Cash Out at Refi | `= net_cash_from_lender` *(ref row 37)* | Refi proceeds |
| 55 | Money Left in Deal | `= all_in_cost − cash_from_refi` | Your sunk equity still tied up |
| 56 | Equity $ | `= ARV − all_in_cost` | Paper equity created through value-add |
| 57 | Equity % | `= (ARV − all_in_cost) / all_in_cost` | Equity as a percentage of your total cost basis |
| 58 | Monthly NOI (P+I) | `= rent − total_PITI_expenses` | Net operating income using amortized mortgage |
| 59 | Annual ROI (P+I) | `= (monthly_NOI × 12) / money_left_in_deal` | Annual return on the cash you still have in the deal |
| 60 | Monthly NOI (IO) | `= rent − total_IO_expenses` | Net operating income using interest-only payment |
| 61 | Annual ROI (IO) | `= (monthly_NOI_IO × 12) / money_left_in_deal` | Same as row 59 but with IO loan |
| 62 | Equity Score | `= IF equity% ≥ 35% → 10 \| ≥ 30% → 9 \| ≥ 20% → 8 \| else → 0` | Scores the deal's equity cushion out of 10 |
| 63 | ROI Score | `= IF ROI ≥ 10% → 10 \| ≥ 9% → 9 \| ... \| ≥ 5% → 5 \| < 5% → 0` | Scores the deal's return out of 10 |
| 64 | Location Score | *(manual)* | School district grade: A=10, B=9, C=8 etc. |
| 65 | Total Score | `= equity_score + ROI_score + location_score` | Deal quality score out of 30 |
| 66 | MAO (≤$65k in deal) | `= ($65k − (change_orders + holding + HML_fees + rehab×(1 + HML_cost_factor))) / (1 + 2% + HML_leverage×HML_cost_factor)` | Max purchase price that keeps your money-in-deal below $65k after refi |
| 67 | MAO (≥20% equity) | `= (equity_target / (1 + 20%)) − (all_rehab_costs + all_fees − refi_loan×(1−points%)) / (1.02 + HML_leverage×HML_cost_factor)` | Max purchase price that ensures ≥20% equity post-refi |
| 68 | % Below Asking Needed | `= MAX((asking − MAO1)/asking, (asking − MAO2)/asking)` | How much you need to negotiate down from the asking price |

---

## SECTION 7 — Bottom Line: HML Scenario (Rows 69–87)

Answers: *"If I used hard money then refi'd, where does the deal stand?"*  
*(Same logic as Section 6 — just different starting cash amounts)*

| Row | Label | Formula | Explanation |
|-----|-------|---------|-------------|
| 69 | All-In (HML) | `= cash_to_close_HML` *(ref row 24)* | Cash you brought in at acquisition with HML |
| 70 | Cash In/Out at Refi | `= net_cash_in_out` *(ref row 38)* | Net cash movement at refi closing |
| 71 | Money Left in Deal | `= money_in_deal_HML` *(ref row 39)* | Cash still committed to the asset |
| 72 | Equity $ Post-Refi | `= property_equity_post_refi` *(ref row 89)* | ARV minus refi loan minus sale costs |
| 73 | Equity % Post-Refi | `= (equity_post_refi − money_in_deal) / money_in_deal` | Equity return relative to cash still deployed |
| 74 | Equity $ (of ARV) | `= ARV − all_in_cost` | Same as row 56 |
| 75 | Equity % (of ARV) | `= (ARV − all_in_cost) / all_in_cost` | Same as row 57 |
| 76 | Monthly NOI (P+I) | `= rent − total_PITI` | Same as row 58 |
| 77 | Annual ROI (P+I) | `= (NOI × 12) / money_in_deal_HML` | ROI against HML cash-in |
| 78 | Monthly NOI (IO) | `= rent − total_IO_expenses` | Same as row 60 |
| 79 | Annual ROI (IO) | `= (NOI_IO × 12) / money_in_deal_HML` | IO-based ROI against HML cash-in |
| 80 | Equity Score | `= IF equity_post_refi% ≥ 35% → 10 \| ≥ 30% → 9 \| ≥ 20% → 8 \| < 20% → 0` | Scores post-refi equity (same scale as row 62) |
| 81 | ROI Score | `= IF ROI ≥ 10% → 10 \| ... \| < 5% → 0` | Scores post-refi ROI |
| 82 | Location Score | *(manual)* | Same manual input as row 64 |
| 83 | Total Score | `= equity_score + ROI_score + location_score` | Deal quality score out of 30 |
| 88 | Exit Strategy | *(manual: "flip" or "rental")* | Switches ROI cells to show "SOLD" if flip, or annual % if rental |
| 89 | Property Equity Post-Refi | `= ARV − refi_loan − (sale_closing + agent_costs)` | Net equity if you sold tomorrow after refi (after agent/title) |
| 90 | Comments | *(manual)* | Notes on deal structure, financing, contacts |

---

## SECTION 8 — Lender Settings (Rows 95–113)

These are **global inputs** that drive all financing calculations. Change once — updates all properties.

### Hard Money Lender (HML) Settings

| Row | Label | Default | Explanation |
|-----|-------|---------|-------------|
| 96 | Leverage % of PP | 75% | HML lends 75 cents on every dollar of purchase price |
| 97 | Leverage % of Rehab | 100% | HML covers all rehab costs |
| 98 | Monthly Interest Rate | 1% /mo | = 12% annualized (typical private lender rate) |
| 99 | Appraisal / BPO Cost | $500 | HML appraisal fee |
| 100 | Underwriting Fees | $800 | HML underwriting/origination admin fee |
| 101 | Points % | 1% | Origination fee as % of loan (1 point = 1%) |
| 102 | Points $ | `= points% × HML_loan` | Dollar amount of origination points |
| 103 | Other Misc Fees | $2,000 | Post-closing misc (legal, draw fees, etc.) |
| 104 | **Total HML Fees** | `= appraisal + underwriting + other + points_$` | All-in HML cost excluding interest |

### Refi (Long-Term) Lender Settings

| Row | Label | Default | Explanation |
|-----|-------|---------|-------------|
| 106 | LTV % (Cash-Out Refi) | `= MIN(LTV_for_$300_cashflow, 65%)` | Automatically picks the lower of the $300 cash-flow LTV and 65% hard cap |
| 107 | Annual Interest Rate | 7% | Fixed 30-year rate |
| 108 | Appraisal / BPO Cost | $500 | Refi appraisal fee |
| 109 | Underwriting Fees | $1,200 | Refi lender underwriting fee |
| 110 | Points % | 3% (template) | Origination points on refi loan |
| 111 | Points $ | `= points% × refi_loan` | Dollar amount of refi points |
| 112 | Other Misc / Impound | $3,500 | Post-closing misc + impound account setup |
| 113 | **Total Refi Fees** | `= appraisal + underwriting + points_$ + other` | All-in refi cost (feeds row 34) |

---

## SECTION 9 — MAO Constants (Rows 121–122)

| Row | Label | Default | Explanation |
|-----|-------|---------|-------------|
| 121 | Max Money in Deal | $65,000 | The maximum cash you're willing to have permanently in one deal |
| 122 | Min Equity Post-Refi % | 20% | The minimum equity cushion required after the cash-out refi |

---

## KEY CONCEPTS GLOSSARY

| Term | Definition |
|------|-----------|
| **BRRRR** | Buy · Rehab · Rent · Refinance · Repeat — strategy to recycle capital across multiple rentals |
| **ARV** | After-Repair Value — what the property is worth fully renovated, based on comps |
| **PP** | Purchase Price — what you offer/pay for the property |
| **HML** | Hard Money Lender — short-term, asset-based lender; typically 1%/mo, 75% LTV |
| **Cash-Out Refi** | Replace the HML with a long-term mortgage and extract equity as cash |
| **LTV** | Loan-to-Value ratio — how much the bank lends relative to the property value |
| **PITI** | Principal + Interest + Taxes + Insurance — total monthly housing payment |
| **DSCR** | Debt Service Coverage Ratio — Rent / (P+I+T+I); lenders want ≥ 1.25 |
| **NOI** | Net Operating Income — rent minus all operating expenses |
| **MAO** | Maximum Allowable Offer — highest price you can pay and still hit your targets |
| **CapEx** | Capital Expenditure reserve — savings for roof, HVAC, appliance replacements |
| **Change Orders** | Extra costs beyond the original rehab estimate; paid out-of-pocket (not financed) |
| **Seasoning** | Minimum time a lender requires before allowing a cash-out refi (typically 3–6 months) |
| **Cash-on-Cash ROI** | Annual net income ÷ actual cash invested — measures real return on your capital |
| **Equity Score** | 10-point rating: ≥35% equity→10, ≥30%→9, ≥20%→8, else→0 |
| **ROI Score** | 10-point rating: ≥10% ROI→10, each 1% less → −1 point, <5%→0 |

---

## QUICK DECISION RULES

```
DSCR ≥ 1.25         → Lender will likely approve the refi
Money in deal < $65k → You can recycle capital into the next deal
Equity % ≥ 20%       → Adequate buffer against market dip
ROI ≥ 8%             → Solid cash flow return
Total Score ≥ 24/30  → Green-light deal
MAO discount ≤ 10%   → Realistic negotiation target
MAO discount > 25%   → Deal needs motivated seller or off-market price
```

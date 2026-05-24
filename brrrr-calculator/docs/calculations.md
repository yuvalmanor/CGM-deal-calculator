# Calculation Reference

All formulas implemented in `lib/calculations.ts`. Numbers are stored as raw decimals (rates as `0.07`, not `7`). Dollar amounts are plain JavaScript numbers.

---

## Inputs

### DealInputs — Property Fields

| Field | Type | Default | Notes |
|---|---|---|---|
| `purchasePrice` | number | 0 | Purchase price you're evaluating |
| `rehabEstimate` | number | 0 | Contractor scope-of-work estimate |
| `changeOrders` | number | 0 | Buffer for overruns; paid out-of-pocket, not financed |
| `marketRent` | number | 0 | Gross monthly rental income at stabilization |
| `arv` | number | 0 | After-Repair Value — appraised or comp-based |
| `sqft` | number | 0 | Livable square footage |
| `exitStrategy` | `'rental'\|'flip'` | `'rental'` | Determines ROI display (switches to "SOLD" for flip) |

### DealInputs — Overrides

| Field | Sentinel | Behavior |
|---|---|---|
| `rehabMonthsManual` | `0` | Auto: `(rehab + changeOrders) / 30,000` |
| `rehabMonthsManual` | `> 0` | Use this value directly |
| `closingCostsBuyOverride` | `-1` | Auto: `PP × 2%` |
| `closingCostsBuyOverride` | `0` | Exactly $0 |
| `closingCostsBuyOverride` | `> 0` | Exact dollar amount |
| `hmlLoanPP` | `0` | Use `hmlLeveragePP × PP` from LenderSettings |
| `hmlLoanRehab` | `0` | Use `hmlLeverageRehab × rehab` — OR `$0` if `hmlLoanPP > 0` |
| `refiLTVOverride` | `0` | Auto back-solve for $300/mo cash flow, cap 65% |
| `refiLTVOverride` | `> 0` | Use this LTV (e.g. `0.65`) |
| `refiTitleCostsOverride` | `0` | Auto: `ARV × 2% + $500` |
| `refiTitleCostsOverride` | `> 0` | Exact dollar amount |
| `otherAdjustmentsAtClose` | any | Deducted from money-in-deal in both scenarios (credits, prepaid items) |

### DealInputs — Monthly Expenses

| Field | Default | Notes |
|---|---|---|
| `propertyTaxMonthly` | 125 | Annual tax ÷ 12 |
| `insuranceMonthly` | 100 | Annual premium ÷ 12 |
| `hoaMonthly` | 0 | HOA dues |
| `stateIncomeTaxMonthly` | 0 | State landlord income tax if applicable |
| `mortgageIOMonthly` | 0 | Interest-only payment for comparison; not calculated |
| `pmMode` | `'percent'` | `'percent'` or `'fixed'` |
| `pmRate` | `0.10` | Used when `pmMode = 'percent'` |
| `pmFixed` | `0` | Used when `pmMode = 'fixed'` |
| `customExpenses` | `[]` | Array of `CustomExpense` objects |

### CustomExpense

```typescript
{ id: string, name: string, amountMonthly: number, funded: boolean }
```

`funded = false` → included in `totalPITI` and reduces NOI.
`funded = true` → displayed but excluded from all calculations (stub).

### LenderSettings — HML

| Field | Default | Notes |
|---|---|---|
| `hmlLeveragePP` | `0.75` | % of PP financed (used when `hmlLoanPP = 0`) |
| `hmlLeverageRehab` | `1.0` | % of rehab financed (used when in leverage mode) |
| `hmlMonthlyRate` | `0.01` | Monthly interest rate (1%/mo = 12%/yr) |
| `hmlPointsPct` | `0.01` | Origination points as % of loan |
| `hmlAppraisalCost` | `500` | BPO/appraisal fee |
| `hmlUnderwritingFees` | `800` | Admin/underwriting fee |
| `hmlOtherFees` | `2000` | Misc post-closing fees |
| `hmlExtraFees` | `0` | Any additional deal-specific fees |

### LenderSettings — Refi

| Field | Default | Notes |
|---|---|---|
| `refiAnnualRate` | `0.07` | 30-yr fixed rate |
| `refiPointsPct` | `0.03` | Origination points |
| `refiAppraisalCost` | `500` | Refi appraisal |
| `refiUnderwritingFees` | `1200` | Refi underwriting |
| `refiOtherFees` | `3500` | Misc + impound setup |

### LenderSettings — MAO Targets

| Field | Default | Meaning |
|---|---|---|
| `maxMoneyInDeal` | `65000` | Max capital you'll leave in one deal after refi |
| `minEquityPct` | `0.20` | Min equity % required post-refi |

---

## Section 1 — Property Metrics

```
rehabMonths   = rehabMonthsManual > 0
                  ? rehabMonthsManual
                  : (rehab + changeOrders) / 30,000

closingCostsBuy = closingCostsBuyOverride >= 0
                    ? closingCostsBuyOverride
                    : PP × 0.02

holdingCosts  = rehabMonths × (tax + ins + hoa + stateTax) + $300 × rehabMonths

totalRehab        = rehabEstimate + changeOrders
additionalCosts   = Σ rehabAdditionalCosts[].amount    // funded + unfunded
oneTimeCosts      = Σ oneTimeCosts[].amount

totalProjectCost  = PP
                  + totalRehab
                  + additionalCosts
                  + closingCostsBuy
                  + oneTimeCosts
                  + holdingCosts

ppsqftPurchase = PP / sqft
ppsqftSale     = ARV / sqft
```

**Holding costs** use the actual monthly expenses entered for the property (not estimated). The `$300/mo` is a misc buffer.

**Total project cost** is the all-in unfinanced cost of acquiring and rehabbing the property. Both funded and unfunded rehab additional costs are included — "funded" only controls whether HML lends against the amount, not whether it contributes to the total cost.

---

## Section 2 — Cash Flip

```
closingCostsSell = ARV × 0.02
agentCosts       = (ARV × 0.06) + $500
cashFlipProfit   = ARV − (allInCost + closingCostsSell + agentCosts)
cashFlipROI      = cashFlipProfit / allInCost
```

---

## Section 3 — HML Loan

```
useHmlDollars    = (hmlLoanPP > 0) OR (hmlLoanRehab > 0)

ppFinancedAmt    = useHmlDollars ? hmlLoanPP    : hmlLeveragePP × PP
rehabFinancedAmt = useHmlDollars ? hmlLoanRehab : hmlLeverageRehab × rehab

hmlLoanRaw = ppFinancedAmt + rehabFinancedAmt
hmlLoan    = min(hmlLoanRaw, ARV × 0.75)          ← hard cap at 75% of ARV

hmlCashToClose   = allInCost − hmlLoan
hmlMonthlyInterest = hmlMonthlyRate × hmlLoan
hmlTotalInterest   = seasoningMonths × hmlMonthlyInterest
hmlPointsDollar    = hmlPointsPct × hmlLoan
hmlTotalFees       = hmlAppraisalCost + hmlUnderwritingFees
                     + hmlOtherFees + hmlPointsDollar + hmlExtraFees
hmlTotalDebt       = hmlLoan + hmlTotalInterest + hmlTotalFees

hmlFlipProfit = ARV − (hmlTotalDebt + hmlCashToClose + closingCostsSell + agentCosts)
hmlFlipROI    = hmlFlipProfit / hmlCashToClose
```

---

## Section 4 — Property Management

```
pmFee = (pmMode = 'fixed') ? pmFixed : rent × pmRate
```

---

## Section 5 — Custom Expenses

```
customExpenseTotal = Σ { e.amountMonthly | e.funded = false }
```

Funded expenses are stored but not included in any calculation (stub for future use).

---

## Section 6 — Refi LTV

The LTV is back-solved from the target cash flow using the **Present Value of an Annuity** formula:

```
targetPayment = rent − tax − ins − hoa − stateTax − capexReserve − pmFee − $300

PV(r, n, pmt) = pmt × (1 − (1+r)^−n) / r
  where r = refiAnnualRate / 12,  n = 360

ltv300cashflow = PV(refiAnnualRate, 360, targetPayment) / ARV

refiLTV = (refiLTVOverride > 0)
            ? refiLTVOverride
            : min(max(ltv300cashflow, 0), 0.65)
```

This answers: "What is the highest LTV at which this deal still produces $300/mo net cash flow?" The result is then hard-capped at 65%.

---

## Section 7 — Cash-Out Refi

```
refiLoanAmount   = ARV × refiLTV
refiPointsDollar = refiPointsPct × refiLoanAmount
refiFees         = refiAppraisalCost + refiUnderwritingFees
                   + refiPointsDollar + refiOtherFees
refiFeePct       = refiFees / refiLoanAmount

refiTitleCosts   = (refiTitleCostsOverride > 0)
                     ? refiTitleCostsOverride
                     : ARV × 0.02 + $500

cashFromLender   = refiLoanAmount − refiFees − refiTitleCosts
netCashAtClosing = cashFromLender − hmlTotalDebt
```

`netCashAtClosing ≥ 0` → full BRRRR (lender pays off HML and gives you cash back).
`netCashAtClosing < 0` → partial BRRRR (you owe money at closing to pay off HML).

---

## Section 8 — PITI / Monthly Cash Flow

```
capexReserve  = rent × 0.15
mortgagePI    = PMT(refiAnnualRate/12, 360, refiLoanAmount)

  PMT(r, n, P) = P × r / (1 − (1+r)^−n)

totalPITI     = tax + ins + hoa + stateTax + capexReserve + pmFee
                + mortgagePI + customExpenseTotal

totalIOExpenses = tax + ins + hoa + stateTax + capexReserve + pmFee
                  + mortgageIOMonthly + customExpenseTotal

dscr = rent / (mortgagePI + ins + tax)
```

**DSCR ≥ 1.25** is typically required by lenders to approve a cash-out refi.

---

## Section 9 — Money in Deal

```
totalCashIn        = totalProjectCost − hmlPrincipal + hmlTotalCost
cashReturnedAtRefi = refiLoan − hmlTotalDebt − refiTotalClosing
moneyInDeal        = totalCashIn − cashReturnedAtRefi
```

Where:
- `totalProjectCost` = PP + total rehab + additional rehab costs + closing costs (buy) + one-time costs + holding costs − project cost adjustments (seller concessions, EM credits, etc.)
- `hmlPrincipal` = PP × hmlLevPP% + rehab × hmlLevRehab% + additionalFunded
- `hmlTotalCost` = points + lender fees + post-closing misc + extra fees (fees only, excludes interest carry)
- `hmlTotalDebt` = HML principal + accrued interest carry (paid off at refi)
- `refiTotalClosing` = refi points + title/escrow + appraisal + underwriting + other + extras

`moneyInDeal` is the capital permanently tied up after the cash-out refinance. $0 or negative = full BRRRR (cash back). Project cost adjustments (seller concessions, EM credits) flow through `totalProjectCost` and so reduce both equity-side and cash-in-side calculations consistently.

---

## Section 10 — Bottom Line: Cash Scenario

```
cashEquityDollar = ARV − allInCost
cashEquityPct    = cashEquityDollar / allInCost

cashNOI_PI = rent − totalPITI
cashNOI_IO = rent − totalIOExpenses

cashROI_PI = (cashNOI_PI × 12) / cashMoneyLeftInDeal   [if rental]
cashROI_IO = (cashNOI_IO × 12) / cashMoneyLeftInDeal   [if rental]
```

### Scoring

```
equityScore = cashEquityPct ≥ 35% → 10
              cashEquityPct ≥ 30% → 9
              cashEquityPct ≥ 20% → 8
              else                → 0

roiScore    = cashROI_PI ≥ 10% → 10
              cashROI_PI ≥  9% → 9
              ...
              cashROI_PI ≥  5% → 5
              else              → 0

totalScore  = equityScore + roiScore + locationScore   (out of 30)
```

---

## Section 11 — Bottom Line: HML Scenario

```
propertyEquityPostRefi = ARV − refiLoanAmount − (closingCostsSell + agentCosts)

hmlEquityPctPostRefi = (propertyEquityPostRefi − moneyInDeal) / moneyInDeal

hmlEquityDollar = ARV − allInCost
hmlEquityPct    = hmlEquityDollar / allInCost

hmlNOI_PI = rent − totalPITI          (same as Cash scenario)
hmlNOI_IO = rent − totalIOExpenses

hmlROI_PI = (hmlNOI_PI × 12) / moneyInDeal   [if rental]
hmlROI_IO = (hmlNOI_IO × 12) / moneyInDeal   [if rental]
```

Scoring uses the same `scoreEquity` / `scoreROI` functions, but applies to `hmlEquityPctPostRefi` and `hmlROI_PI`.

---

## Section 12 — Maximum Allowable Offer (MAO)

Three constraints solve for PP algebraically; binding MAO is the lowest. All three share the same linear expansion `moneyInDeal(PP) = ppCoef × PP + C`.

```
carryMonths = max(rehabMonths, refiSeasoningMonths)
k           = hmlPointsPct + hmlMonthlyRate × carryMonths
ppCoef      = 1 + hmlLeveragePP × k

lenderMisc  = hmlLenderFees + hmlPostClosingMisc + Σ hmlExtraFees
hmlFinancedRehab = rehab × hmlLeverageRehab + additionalFunded

C = rehab × (1 − hmlLeverageRehab)
  + additionalNotFunded
  + closingCostsBuy
  + oneTimeCosts
  + holdingCosts
  − projectCostAdjustments
  + lenderMisc
  + hmlFinancedRehab × (1 + k)
  − refiLoan
  + refiTotalClosing
```

```
MAO-1 (Money-in-Deal cap):
  moneyInDeal ≤ maxMoneyInDeal
  ⇒ MAO-1 = (maxMoneyInDeal − C) / ppCoef

MAO-2 (Post-Refi equity ratio, Excel row 67):
  (propEquityPostRefi − moneyInDeal) / moneyInDeal ≥ minEquityPct
  ⇒ moneyInDeal ≤ propEquityPostRefi / (1 + minEquityPct)
  ⇒ MAO-2 = (propEquityPostRefi / (1 + minEquityPct) − C) / ppCoef

  where propEquityPostRefi = ARV × (1 − sellingCostsPct) − refiLoan

MAO-70 (classic wholesaler rule):
  MAO-70 = ARV × 0.70 − rehab

MAO     = min(MAO-1, MAO-2, MAO-70)
```

MAO-2 uses **leverage-aware equity** — equity relative to capital deployed, not relative to all-in cost. This is intentionally distinct from the dashboard's `Equity %` KPI (which is forced equity, `(ARV − totalProjectCost) / totalProjectCost`). MAO-2 enforces a leverage safety margin; the KPI measures value created vs. cost.

---

## Section 13 — Advanced Metrics

### Cap Rate

```
capRate = (monthlyNOI × 12) / arv
```

The property's annual return assuming no mortgage. NOI includes all operating expenses (taxes, insurance, HOA, CapEx, mgmt, custom expenses) but excludes debt service. Financing-independent — used to compare properties across markets.

**Thresholds:**

| Cap Rate | Interpretation |
|---|---|
| `< 5%` | Weak |
| `5–7%` | Healthy |
| `7–9%` | Strong |
| `> 9%` | High risk or exceptional — verify area quality |

### GRM (Gross Rent Multiplier)

```
grm = arv / (monthlyRent × 12)
```

A quick valuation ratio — how many years of gross rent would equal the property's value. Ignores expenses and financing, so it's a screening tool only. Lower = cheaper relative to rent.

**Thresholds:**

| GRM | Interpretation |
|---|---|
| `< 8` | Strong |
| `8–12` | Healthy |
| `12–15` | Thin |
| `> 15` | Cashflow unlikely |

### Forced Equity ROI

```
forcedEquityROI = (arv − allInCost) / allInCost
```

How much equity was created relative to the total capital deployed (your cash + loan). Measures how efficiently the deal converted invested capital into equity, independent of financing structure. Equivalent to the "Forced Equity %" dashboard KPI.

**Thresholds:**

| Forced Equity ROI | Interpretation |
|---|---|
| `< 20%` | Weak |
| `20–30%` | Acceptable |
| `30–35%` | Good |
| `> 35%` | Strong |

### Return on Equity (ROE)

```
roe = (monthlyCashflow × 12) / (arv − refiLoan)
```

How hard your equity is working. Denominator is **book equity post-refi** (ARV minus refi loan balance), not money-in-deal. Unlike CoC, ROE decreases over time as equity grows through appreciation and amortization — even if cashflow stays flat. Used as a hold/refi/sell trigger.

**Thresholds:**

| ROE | Interpretation |
|---|---|
| `< 4%` | Weak |
| `4–7%` | Acceptable |
| `7–10%` | Healthy |
| `> 10%` | Strong |

### 5-Year IRR (appreciation scenarios)

```
cashflows = [−hmlMoneyInDeal, monthlyCF × 59, monthlyCF + exitProceeds]
exitProceeds = arv × (1 + appreciationRate)^5 × (1 − sellingCostsPct/100) − remainingLoanBalance
irr = (1 + monthlyIRR)^12 − 1
```

Annualized total return over 5 years — combines monthly cashflow, loan paydown, appreciation, and net sale proceeds. Solved iteratively (bisection / Newton-Raphson) on the monthly cashflow stream, then annualized. Returns 0 if `hmlMoneyInDeal ≤ 0` (full BRRRR — infinite return). Run across 3 appreciation scenarios (2%, 3%, 4%) for stress-testing.

**Thresholds:**

| 5-Year IRR | Interpretation |
|---|---|
| `< 8%` | Weak |
| `8–12%` | Acceptable |
| `12–18%` | Healthy |
| `18–25%` | Strong |
| `> 25%` | Verify assumptions |

### Annual Cashflow

```
annualCashflow         = monthlyCashflow × 12
annualCashflowNoCapex  = (monthlyCashflow + capexVacancy) × 12
```

Total annual income after all operating expenses and refi debt service. The Advanced Metrics cell offers a toggle between two views:

- **w/ capex** — uses `monthlyCashflow`, which deducts the CapEx/vacancy reserve. This is the true long-run cashflow once you've set money aside for repairs and turnover.
- **no capex** — adds the CapEx/vacancy reserve back. This is the cashflow before reserving — useful for comparing against properties that exclude reserves from their pro-forma.

The toggle does not affect any other metric (ROE, CoC, scoring, IRR all continue to use the with-CapEx cashflow as the source of truth).

### Equity Margin on ARV

```
equityMarginOnArv = (arv − allInCost) / arv
```

The cushion between what you spent and the property's market value, as a percentage of ARV. Directly reflects the 70% rule — a 30% margin means you're all-in at 70% of ARV. Distinct from **Forced Equity ROI** (which divides the same numerator by All-In Cost instead).

**Thresholds:**

| Equity Margin on ARV | Interpretation |
|---|---|
| `< 20%` | Dangerous |
| `20–25%` | Minimum |
| `25–35%` | Healthy |
| `> 35%` | Strong |

---

## Validation

All formulas were verified against column YB of `Deal Calc CGM V2.xlsx` (1805 Cedar Wood Trl, Anna TX) using Python:

```python
# Key verified results
holding_costs  → 945.33   ✓
all_in_cost    → 247,995.33  ✓
hml_loan       → 160,000  ✓
hml_total_debt → 167,793.67  ✓
refi_loan      → 195,000  ✓
cash_from_lender → 183,771  ✓
net_cash_close  → 15,977.33  ✓
money_in_deal   → 60,208  ✓
mortgage_pi     → 1,297.34  ✓
dscr            → 1.2739  ✓
prop_equity     → 80,500  ✓
```

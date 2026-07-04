# Calculation Reference — `lib/deal-model.ts`

The single formula engine for the app. Self-contained: the `Deal` model, `DEFAULT_DEAL`, formatters, and five pure calc functions — `calcBRRRR`, `calcFlipCash`, `calcFlipHML`, `calcMAO`, `calcDealScore`.

**The engine is frozen by golden tests** (`tests/deal-model.golden.test.ts`, run via `npm test`). Do not modify it; report suspected formula bugs instead of fixing them. Its formulas intentionally diverge from the old Excel workbook — see `docs/adr/0002-v2-calculator-is-canonical.md`. The business-side description of the original workbook lives in `docs/brrrr-cheat-sheet.md`.

## Conventions

- **Percentages are whole numbers**: `hmlRate: 11.0` = 11%/yr, `refiLtv: 65` = 65%, `capexVacancyPct: 15` = 15%.
- **`mo`/`yr` units**: `taxes`, `insurance`, `hoa`, `stateIncTax`, and each `additionalMonthly` line carry a unit; yearly values are divided by 12 (`toMonthly`).
- **pct-vs-fixed modes**: `changeOrdersMode` (`pctOfRehab`/`fixed`), `capexVacancyMode` and `mgmtMode` (`pct`/`fixed`).
- **Auto sentinel**: `refiTitleEscrow = 0` → auto `ARV × 2% + $500`; `> 0` → exact dollar override.
- **Funded flag**: each `RehabAdditionalCost` is either HML-financed (`funded: true`) or cash out-of-pocket.
- **Extra-fee lists**: `hmlExtraFees`, `refiExtraFees`, `oneTimeCosts` are `{ label, amount }` line items, summed where noted.

---

## Section 1 — Rehab & Total Project Cost

```
changeOrders = changeOrdersMode = 'pctOfRehab'
                 ? rehabEstimate × changeOrdersPct%
                 : changeOrdersFixed
rehab        = rehabEstimate + changeOrders            ← totalRehab()

additionalFunded    = Σ rehabAdditionalCosts[funded]
additionalNotFunded = Σ rehabAdditionalCosts[!funded]
oneTime             = Σ oneTimeCosts

holdingCosts = rehabMonths × (taxes + insurance + stateIncTax + HOA + $300)
               (monthly-normalized values; $300/mo is a misc buffer)

totalProjectCost = purchasePrice + rehab
                 + additionalFunded + additionalNotFunded
                 + closingCostsBuy + oneTime + holdingCosts
                 − projectCostAdjustments
```

`projectCostAdjustments` are credits at close (seller concessions, EM credits) — they reduce the project cost, and therefore both the cash-in and equity sides consistently. "Funded" controls whether the HML lends against an additional cost, not whether it belongs in the project cost.

---

## Section 2 — Monthly Operating Expenses

`monthlyOpExpenses(deal)`:

```
capexVacancy = capexVacancyMode = 'pct' ? rent × capexVacancyPct% : capexVacancyFixed
mgmt         = mgmtMode = 'pct'         ? rent × mgmtPct%         : mgmtFixed
extras       = Σ additionalMonthly (each normalized to monthly)

totalOpex        = taxes + ins + hoa + stateIncTax + capexVacancy + mgmt + extras
totalOpexNoCapex = totalOpex − capexVacancy
```

---

## Section 3 — HML Loan & Carry

```
hmlPrincipal       = PP × hmlLevPP% + rehab × hmlLevRehab% + additionalFunded
hmlPointsDollar    = hmlPrincipal × hmlPoints%
hmlMonthlyInterest = hmlPrincipal × hmlRate% / 12
hmlTotalInterest   = hmlMonthlyInterest × rehabMonths          (label use)

hmlCarryMonths     = max(rehabMonths, refiSeasoningMonths)
hmlCarryInterest   = hmlMonthlyInterest × hmlCarryMonths       (cash impact)

hmlTotalCost = hmlPointsDollar + hmlLenderFees + hmlPostClosingMisc + Σ hmlExtraFees
               (fees only — excludes interest carry)
hmlTotalDebt = hmlPrincipal + hmlCarryInterest                 (paid off at refi)
```

The carry deliberately runs to the **later** of rehab completion and the refi seasoning requirement — you keep paying HML interest until you can actually refinance.

---

## Section 4 — Cash In & Money in Deal

```
totalCashIn = totalProjectCost − hmlPrincipal + hmlTotalCost

cashReturnedAtRefi = refiLoan − hmlTotalDebt − refiTotalClosing
moneyInDeal        = totalCashIn − cashReturnedAtRefi          (alias: cashLeftIn)
```

`moneyInDeal` is the capital permanently tied up after the cash-out refi. ≤ $0 = full BRRRR (all capital recycled). Status: good ≤ 0, warn ≤ `maxMoneyInDeal` (default $65k), bad above.

---

## Section 5 — Cash-Out Refinance

```
refiLoan         = ARV × refiLtv%
refiPointsDollar = refiLoan × refiPoints%
refiTitleEscrow  = refiTitleEscrow > 0 ? refiTitleEscrow : ARV × 2% + $500
refiTotalClosing = refiPointsDollar + refiTitleEscrow + refiAppraisal
                 + refiUnderwriting + refiOtherMisc + Σ refiExtraFees

refiPI = PMT(refiRate%/12, refiTermYears × 12, refiLoan)
  PMT(r, n, P) = P × r / (1 − (1+r)^−n)
```

---

## Section 6 — Cashflow, CoC, DSCR

```
cashflow        = rent − totalOpex − refiPI
cashflowNoCapex = cashflow + capexVacancy
annualCashflow  = cashflow × 12
noi             = rent − totalOpex

coc        = moneyInDeal > 0 ? (cashflow × 12) / moneyInDeal × 100
             : (cashflow > 0 ? ∞ : 0)
cocNoCapex = same with cashflowNoCapex

dscr       = rent / (refiPI + taxes + ins)                  ← cheat-sheet row 52
lenderDscr = rent / (taxes + ins + stateIncTax + hoa)       ← no-mortgage variant
```

DSCR ≥ 1.25 (`minDscr`) is the typical lender approval bar. The Advanced Metrics "no capex" cashflow toggle affects display only — CoC, scoring, and IRR always use the with-capex cashflow.

---

## Section 7 — Equity Views

```
equityDollar     = ARV − refiLoan                            (book equity post-refi)
equityPct        = (equityDollar − moneyInDeal) / moneyInDeal × 100
                   (return on money left in deal; 0 if moneyInDeal ≤ 0)

equityForcedDollar = ARV − totalProjectCost                  (forced equity)
equityMarginArv    = equityForcedDollar / totalProjectCost × 100   ("Forced Equity ROI")
equityMarginOnArv  = equityForcedDollar / ARV × 100          ("Margin on ARV")

trueEquityBook   = (ARV − refiLoan) / ARV × 100
equityMultiplier = (ARV − refiLoan + cashReturnedAtRefi) / totalCashIn

equityLiquidationDollar = ARV × (1 − sellingCostsPct%) − refiLoan
equityLiquidationPct    = equityLiquidationDollar / ARV × 100
```

Liquidation equity is what you'd net selling tomorrow after selling costs — it is also the equity measure MAO-2 constrains (Section 10).

---

## Section 8 — Flip, All-Cash (`calcFlipCash`)

```
holdingCarry = totalOpex × holdMonthsForFlip        ← ALL operating expenses
totalCashIn  = PP + rehab + Σ rehabAdditionalCosts (all)
             + closingCostsBuy + oneTime + holdingCarry

sellingCosts  = ARV × sellingCostsPct%
grossProceeds = ARV − sellingCosts
profit        = grossProceeds − totalCashIn
roi           = profit / totalCashIn × 100
annualizedRoi = roi × 12 / max(1, holdMonthsForFlip)
```

---

## Section 9 — Flip, HML-Financed (`calcFlipHML`)

```
acqGap      = max(0, PP × (1 − hmlLevPP%) + rehab × (1 − hmlLevRehab%) + additionalNotFunded)
cashInAcq   = acqGap + closingCostsBuy + hmlPointsDollar + hmlLenderFees
            + hmlPostClosingMisc + Σ hmlExtraFees + oneTime
cashHolding = hmlTotalInterest + totalOpex × rehabMonths
cashIn      = cashInAcq + cashHolding

netToInvestor = (ARV − sellingCosts) − hmlPrincipal
profit        = netToInvestor − cashIn
roi           = profit / cashIn × 100
annualizedRoi = roi × 12 / max(1, rehabMonths)
```

---

## Section 10 — Maximum Allowable Offer (`calcMAO`)

Three constraints each solve for PP; the binding MAO is the lowest. MAO-1 and MAO-2 share the linear expansion `moneyInDeal(PP) = ppCoef × PP + C` (the algebraic inverse of Section 4):

```
carryMonths = max(rehabMonths, refiSeasoningMonths)
k           = hmlPoints% + hmlRate%/12 × carryMonths
ppCoef      = 1 + hmlLevPP% × k

lenderMisc       = hmlLenderFees + hmlPostClosingMisc + Σ hmlExtraFees
hmlFinancedRehab = rehab × hmlLevRehab% + additionalFunded

C = rehab × (1 − hmlLevRehab%) + additionalNotFunded
  + closingCostsBuy + oneTime + holdingCosts − projectCostAdjustments
  + lenderMisc + hmlFinancedRehab × (1 + k)
  − refiLoan + refiTotalClosing
```

```
MAO-70 (classic wholesaler rule):
  mao70 = ARV × 0.70 − rehab

MAO-1 (money-in-deal cap):
  moneyInDeal ≤ maxMoneyInDeal
  ⇒ maoMoneyInDeal = (maxMoneyInDeal − C) / ppCoef

MAO-2 (post-refi equity ratio, Excel row 67):
  (propEquityPostRefi − moneyInDeal) / moneyInDeal ≥ minEquityPct%
  ⇒ moneyInDeal ≤ propEquityPostRefi / (1 + minEquityPct%)
  ⇒ maoEquity = (propEquityPostRefi / (1 + minEquityPct%) − C) / ppCoef
  where propEquityPostRefi = ARV × (1 − sellingCostsPct%) − refiLoan

mao = min(mao70, maoMoneyInDeal, maoEquity)
deltaToOffer = mao − purchasePrice
```

MAO-2 uses **leverage-aware equity** — equity relative to capital still deployed, not relative to cost. This is intentionally distinct from the dashboard's forced-equity KPI (`equityMarginArv`): MAO-2 enforces a leverage safety margin; the KPI measures value created vs. cost.

---

## Section 11 — Deal Score (`calcDealScore`)

Three equally weighted 0–10 components, averaged:

```
cocScore = coc ≥ 10 → 10 | ≥ 9 → 9 | ≥ 8 → 8 | ≥ 7 → 7 | ≥ 6 → 6 | else → 0
           (infinite CoC — moneyInDeal ≤ 0 with positive cashflow — scores 10)

eqScore  = equityMarginArv ≥ 35 → 10 | ≥ 30 → 9 | ≥ 25 → 8 | ≥ 20 → 7 | else → 0

locScore = mapLocationScore(schoolGrade):
           ≥ 15 → 10 | ≥ 12 → 9 | ≥ 10 → 8 | ≥ 9 → 7 | ≥ 7 → 6 | else → 0

score   = (cocScore + eqScore + locScore) / 3
verdict = score ≥ 8 → 'GO' | else → 'NO-GO'
```

---

## Section 12 — Advanced Metrics

Status thresholds below come from `statusFor()` in `deal-model.ts`.

### Cap Rate

```
capRate = (noi × 12) / ARV × 100
```

Financing-independent annual return. bad < 5%, warn 5–7%, good 7–9%, warn > 9% (verify area quality).

### GRM (Gross Rent Multiplier)

```
grm = ARV / (rent × 12)
```

Years of gross rent equal to the property's value — screening tool only. good < 8, warn 8–15, bad > 15.

### Forced Equity ROI

```
forcedEquityROI = equityMarginArv = (ARV − totalProjectCost) / totalProjectCost × 100
```

Equity created per dollar of total capital deployed. bad < 20%, warn 20–30%, good ≥ 30%.

### Equity Margin on ARV

```
equityMarginOnArv = (ARV − totalProjectCost) / ARV × 100
```

Cushion between all-in cost and market value, as a % of ARV — the 70%-rule view (30% margin = all-in at 70% of ARV). bad < 20%, warn 20–25%, good ≥ 25%.

### Return on Equity (ROE)

```
roe = (cashflow × 12) / (ARV − refiLoan) × 100
```

How hard the post-refi book equity is working. Unlike CoC, ROE falls as equity grows — a hold/refi/sell trigger. bad < 4%, warn 4–7%, good ≥ 7%.

### 5-Year IRR (`irr2pct` / `irr3pct` / `irr4pct`)

```
cashflows    = [−moneyInDeal, monthlyCF × 59, monthlyCF + exitProceeds]
exitProceeds = ARV × (1 + appreciation)^5 × (1 − sellingCostsPct%) − remainingBalance(60 payments)
irr          = (1 + monthlyIRR)^12 − 1   (Newton-Raphson on the monthly stream)
```

Annualized 5-year total return: cashflow + loan paydown + appreciation + net sale. Returns 0 when `moneyInDeal ≤ 0` (full BRRRR — return undefined/infinite). Run at 2% / 3% / 4% appreciation for stress-testing. bad < 8%, warn 8–12%, good 12–25%, warn > 25% (verify assumptions).

### Annual Cashflow toggle

```
annualCashflow        = cashflow × 12                  (w/ capex reserve)
annualCashflowNoCapex = (cashflow + capexVacancy) × 12 (reserve added back)
```

Display toggle only — every other metric keeps using the with-capex cashflow.

---

## Verification

The engine's outputs for `DEFAULT_DEAL` (Anna TX) and a branch-exercising fixture are pinned by golden-value tests:

```bash
npm test                    # must be all green after any change
UPDATE_GOLDEN=1 npm test    # deliberate formula change only — diff must be user-approved
```

Golden values were captured 2026-07-04 and cross-checked against the live saved Anna TX deal.

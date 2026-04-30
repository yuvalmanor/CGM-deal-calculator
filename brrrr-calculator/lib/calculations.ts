import type { DealInputs, LenderSettings, DealResults } from './types'

function scoreEquity(pct: number): number {
  if (pct >= 0.35) return 10
  if (pct >= 0.30) return 9
  if (pct >= 0.20) return 8
  return 0
}

function scoreROI(roi: number): number {
  if (roi >= 0.10) return 10
  if (roi >= 0.09) return 9
  if (roi >= 0.08) return 8
  if (roi >= 0.07) return 7
  if (roi >= 0.06) return 6
  if (roi >= 0.05) return 5
  return 0
}

function pmt(annualRate: number, periods: number, principal: number): number {
  if (principal === 0) return 0
  const r = annualRate / 12
  if (r === 0) return principal / periods
  return (principal * r) / (1 - Math.pow(1 + r, -periods))
}

function pv(annualRate: number, periods: number, payment: number): number {
  const r = annualRate / 12
  if (r === 0) return payment * periods
  return payment * (1 - Math.pow(1 + r, -periods)) / r
}

// Remaining mortgage principal after `paymentsMade` payments
function remainingBalance(annualRate: number, periods: number, principal: number, paymentsMade: number): number {
  const r = annualRate / 12
  const payment = pmt(annualRate, periods, principal)
  if (r === 0) return principal - payment * paymentsMade
  return principal * Math.pow(1 + r, paymentsMade) - payment * (Math.pow(1 + r, paymentsMade) - 1) / r
}

// Newton-Raphson IRR on a monthly cashflow array; returns annualised rate
function irrAnnual(cashflows: number[]): number {
  if (cashflows[0] >= 0) return 0
  const MAX_ITER = 300
  const TOL = 1e-8
  let r = 0.005 // initial guess: 0.5%/month

  for (let iter = 0; iter < MAX_ITER; iter++) {
    let npv = 0
    let dnpv = 0
    for (let t = 0; t < cashflows.length; t++) {
      const factor = Math.pow(1 + r, t)
      npv  += cashflows[t] / factor
      dnpv -= t * cashflows[t] / (factor * (1 + r))
    }
    if (Math.abs(dnpv) < 1e-14) break
    const dr = npv / dnpv
    r -= dr
    if (Math.abs(dr) < TOL) break
  }
  // Guard against unreasonable rates
  if (!isFinite(r) || r <= -1) return 0
  return Math.pow(1 + r, 12) - 1
}

function computeIRR5Year(
  hmlMoneyInDeal: number,
  hmlAnnualCashflow: number,
  arv: number,
  appreciationRate: number,
  refiLoanAmount: number,
  refiAnnualRate: number,
): number {
  if (hmlMoneyInDeal <= 0) return 0

  const projectedARV   = arv * Math.pow(1 + appreciationRate, 5)
  const netSalePrice   = projectedARV * (1 - 0.08)
  const loanBalance    = remainingBalance(refiAnnualRate, 360, refiLoanAmount, 60)
  const exitProceeds   = netSalePrice - loanBalance

  const monthlyOp = hmlAnnualCashflow / 12
  const cfs: number[] = [-hmlMoneyInDeal]
  for (let m = 1; m <= 59; m++) cfs.push(monthlyOp)
  cfs.push(monthlyOp + exitProceeds)

  return irrAnnual(cfs)
}

export function calculateDeal(inputs: DealInputs, s: LenderSettings): DealResults {
  const {
    purchasePrice: pp,
    rehabEstimate: rehab,
    changeOrders,
    marketRent: rent,
    arv,
    sqft,
    seasoningMonths: months,
    propertyTaxMonthly: tax,
    insuranceMonthly: ins,
    hoaMonthly: hoa,
    stateIncomeTaxMonthly: stateTax,
    mortgageIOMonthly: mortgageIO,
    locationScore,
    exitStrategy,
    rehabMonthsManual,
    closingCostsBuyOverride,
    hmlLoanPP,
    hmlLoanRehab,
    refiLTVOverride,
    refiTitleCostsOverride,
    otherAdjustmentsAtClose,
    pmMode,
    pmRate,
    pmFixed,
    customExpenses,
    hmlCustomFees,
    refiCustomFees,
  } = inputs

  // ── Rehab months ──────────────────────────────────────────────────────────
  const rehabMonths = rehabMonthsManual > 0
    ? rehabMonthsManual
    : (rehab + changeOrders) / 30000

  // ── Closing costs on purchase ─────────────────────────────────────────────
  const closingCostsBuy = closingCostsBuyOverride >= 0
    ? closingCostsBuyOverride
    : pp * 0.02

  // ── Property Metrics ──────────────────────────────────────────────────────
  const ppsqftPurchase = sqft > 0 ? pp / sqft : 0
  const ppsqftSale     = sqft > 0 ? arv / sqft : 0

  // Fix D: flips carry holding costs for the full rehab + sell period; rentals only rehab period
  const holdMonths  = exitStrategy === 'flip' ? rehabMonths + months : rehabMonths
  const holdingCosts = holdMonths * (tax + ins + hoa + stateTax + 300)
  const allInCost    = pp + closingCostsBuy + rehab + changeOrders + holdingCosts

  // ── Cash Flip ─────────────────────────────────────────────────────────────
  const closingCostsSell = arv * 0.02
  const agentCosts       = arv * 0.06 + 500
  const cashFlipProfit   = arv - (allInCost + closingCostsSell + agentCosts)
  const cashFlipROI      = allInCost > 0 ? cashFlipProfit / allInCost : 0

  // ── HML loan ──────────────────────────────────────────────────────────────
  const useHmlDollars    = hmlLoanPP > 0 || hmlLoanRehab > 0
  const ppFinancedAmt    = useHmlDollars ? hmlLoanPP    : s.hmlLeveragePP * pp
  const rehabFinancedAmt = useHmlDollars ? hmlLoanRehab : s.hmlLeverageRehab * rehab
  const hmlLoanRaw       = ppFinancedAmt + rehabFinancedAmt
  const hmlLoan          = hmlLoanRaw > 0 ? Math.min(hmlLoanRaw, arv * 0.75) : 0

  const hmlMonthlyInterest = s.hmlMonthlyRate * hmlLoan
  const hmlTotalInterest   = months * hmlMonthlyInterest
  const hmlPointsDollar    = s.hmlPointsPct * hmlLoan
  const hmlCustomFeesTotal = hmlCustomFees.reduce((acc, f) => acc + f.amount, 0)
  const hmlTotalFees       = s.hmlAppraisalCost + s.hmlUnderwritingFees
    + s.hmlOtherFees + hmlPointsDollar + s.hmlExtraFees + hmlCustomFeesTotal

  // Fix B: HML fees are paid in cash at closing, not future debt
  const hmlCashToClose = allInCost - hmlLoan + hmlTotalFees
  const hmlTotalDebt   = hmlLoan + hmlTotalInterest

  const hmlFlipProfit = arv - (hmlTotalDebt + hmlCashToClose + closingCostsSell + agentCosts)
  const hmlFlipROI    = hmlCashToClose > 0 ? hmlFlipProfit / hmlCashToClose : 0

  // ── Property management ───────────────────────────────────────────────────
  const pmFee = pmMode === 'fixed' ? pmFixed : rent * pmRate

  // ── Custom expenses ───────────────────────────────────────────────────────
  const customMonthly = customExpenses
    .filter(e => e.frequency === 'monthly' && !e.funded)
    .reduce((s, e) => s + e.amount, 0)
  const customAnnual = customExpenses
    .filter(e => e.frequency === 'annual' && !e.funded)
    .reduce((s, e) => s + e.amount / 12, 0)
  const customOneTime = customExpenses
    .filter(e => e.frequency === 'one-time' && !e.funded)
    .reduce((s, e) => s + e.amount, 0)
  const customExpenseTotal = customMonthly + customAnnual

  // ── Refi LTV ──────────────────────────────────────────────────────────────
  const capexReserve  = rent * 0.15
  const targetPayment = rent - tax - ins - hoa - stateTax - capexReserve - pmFee - 300

  const ltv300cashflow = arv > 0
    ? pv(s.refiAnnualRate, 360, targetPayment) / arv
    : 0

  const refiLTV = refiLTVOverride > 0
    ? refiLTVOverride
    : Math.min(Math.max(ltv300cashflow, 0), 0.65)

  // ── Refi ──────────────────────────────────────────────────────────────────
  const refiLoanAmount    = arv * refiLTV
  const refiPointsDollar  = s.refiPointsPct * refiLoanAmount
  const refiCustomFeesTotal = refiCustomFees.reduce((acc, f) => acc + f.amount, 0)
  const refiFees          = s.refiAppraisalCost + s.refiUnderwritingFees
    + refiPointsDollar + s.refiOtherFees + refiCustomFeesTotal
  const refiFeePct        = refiLoanAmount > 0 ? refiFees / refiLoanAmount : 0
  const refiTitleCosts    = refiTitleCostsOverride > 0
    ? refiTitleCostsOverride
    : (arv > 0 ? arv * 0.02 + 500 : 0)

  const cashFromLender   = refiLoanAmount - refiFees - refiTitleCosts
  const netCashAtClosing = cashFromLender - hmlTotalDebt

  // ── moneyInDeal (pre-seasoning deficit) ──────────────────────────────────
  const moneyInDeal = hmlCashToClose - netCashAtClosing - otherAdjustmentsAtClose

  // ── PITI / Monthly Cash Flow ───────────────────────────────────────────────
  const mortgagePI = pmt(s.refiAnnualRate, 360, refiLoanAmount)

  // Fix A: DSCR includes HOA in denominator
  const dscrDenominator = mortgagePI + ins + tax + hoa
  const dscr = dscrDenominator > 0 ? rent / dscrDenominator : 0

  const totalPITI      = tax + ins + hoa + stateTax + capexReserve + pmFee + mortgagePI + customExpenseTotal
  const totalIOExpenses = tax + ins + hoa + stateTax + capexReserve + pmFee + mortgageIO + customExpenseTotal

  // PITI sub-totals (Part 4)
  const pitiSum               = mortgagePI + tax + ins + hoa + stateTax
  const totalOperatingExpenses = pitiSum + capexReserve + pmFee + customExpenseTotal

  // ── Bottom Line – Cash ─────────────────────────────────────────────────────
  const cashMoneyLeftInDeal = allInCost - cashFromLender - otherAdjustmentsAtClose
  const cashEquityDollar    = arv - allInCost
  const cashEquityPct       = allInCost > 0 ? cashEquityDollar / allInCost : 0
  const cashNOI_PI          = rent - totalPITI
  const cashNOI_IO          = rent - totalIOExpenses
  const cashROI_PI          = cashMoneyLeftInDeal > 0 && exitStrategy === 'rental'
    ? (cashNOI_PI * 12) / cashMoneyLeftInDeal : 0
  const cashROI_IO          = cashMoneyLeftInDeal > 0 && exitStrategy === 'rental'
    ? (cashNOI_IO * 12) / cashMoneyLeftInDeal : 0
  const cashAnnualCashflow_PI = cashNOI_PI * 12
  const cashAnnualCashflow_IO = cashNOI_IO * 12
  const cashROE = cashNOI_PI > 0 && arv > 0 ? cashAnnualCashflow_PI / arv : 0

  // ── Equity metrics (unleveraged) ──────────────────────────────────────────
  const forcedEquityROI   = allInCost > 0 ? (arv - allInCost) / allInCost : 0
  const equityMarginOnARV = arv > 0 ? (arv - allInCost) / arv : 0

  // Part 3: equity scoring uses forcedEquityROI
  const cashEquityScore = scoreEquity(forcedEquityROI)
  const cashROIScore    = exitStrategy === 'rental' ? scoreROI(cashROI_PI) : 0
  const cashTotalScore  = cashEquityScore + cashROIScore + locationScore

  // ── Bottom Line – HML ─────────────────────────────────────────────────────
  const hmlNOI_PI = rent - totalPITI
  const hmlNOI_IO = rent - totalIOExpenses

  // Fix C: negative monthly cashflow during seasoning adds real acquisition capital
  const seasoningDeficit = hmlNOI_PI < 0 ? Math.abs(hmlNOI_PI) * months : 0
  const hmlMoneyInDeal   = moneyInDeal + seasoningDeficit

  const hmlROI_PI = hmlMoneyInDeal > 0 && exitStrategy === 'rental'
    ? (hmlNOI_PI * 12) / hmlMoneyInDeal : 0
  const hmlROI_IO = hmlMoneyInDeal > 0 && exitStrategy === 'rental'
    ? (hmlNOI_IO * 12) / hmlMoneyInDeal : 0
  const hmlAnnualCashflow_PI = hmlNOI_PI * 12
  const hmlAnnualCashflow_IO = hmlNOI_IO * 12

  // Fix E: book equity excludes sale costs; liquidation equity includes them
  const propertyEquityPostRefi    = arv - refiLoanAmount
  const propertyEquityLiquidation = arv - refiLoanAmount - closingCostsSell - agentCosts
  const equityPctBook             = arv > 0 ? propertyEquityPostRefi / arv : 0

  const hmlEquityPostRefi    = propertyEquityPostRefi
  const hmlEquityPctPostRefi = hmlMoneyInDeal > 0
    ? (hmlEquityPostRefi - hmlMoneyInDeal) / hmlMoneyInDeal : 0
  const hmlEquityDollar      = arv - allInCost
  const hmlEquityPct         = allInCost > 0 ? hmlEquityDollar / allInCost : 0

  const hmlROE = hmlNOI_PI > 0 && propertyEquityPostRefi > 0
    ? hmlAnnualCashflow_PI / propertyEquityPostRefi : 0

  // ── Additional metrics ────────────────────────────────────────────────────
  const annualNOI = (rent - tax - ins - hoa - stateTax - capexReserve - pmFee - customExpenseTotal) * 12
  const capRate   = arv > 0 ? annualNOI / arv : 0
  const grm       = rent > 0 && arv > 0 ? arv / (rent * 12) : 0

  // ── 5-Year IRR ────────────────────────────────────────────────────────────
  const irr2pct = computeIRR5Year(hmlMoneyInDeal, hmlAnnualCashflow_PI, arv, 0.02, refiLoanAmount, s.refiAnnualRate)
  const irr3pct = computeIRR5Year(hmlMoneyInDeal, hmlAnnualCashflow_PI, arv, 0.03, refiLoanAmount, s.refiAnnualRate)
  const irr4pct = computeIRR5Year(hmlMoneyInDeal, hmlAnnualCashflow_PI, arv, 0.04, refiLoanAmount, s.refiAnnualRate)

  // ── Scoring ───────────────────────────────────────────────────────────────
  const hmlEquityScore = scoreEquity(forcedEquityROI)
  const hmlROIScore    = exitStrategy === 'rental' ? scoreROI(hmlROI_PI) : 0
  const hmlTotalScore  = hmlEquityScore + hmlROIScore + locationScore

  // ── MAO ───────────────────────────────────────────────────────────────────
  const hmlCostFactor = s.hmlMonthlyRate * months + s.hmlPointsPct
  const hmlFixedFees  = s.hmlAppraisalCost + s.hmlUnderwritingFees + s.hmlOtherFees + s.hmlExtraFees

  const mao1 = (s.maxMoneyInDeal
    - (changeOrders + holdingCosts + hmlFixedFees
       + rehab * (1 + s.hmlLeverageRehab * hmlCostFactor)
       - cashFromLender))
    / (1 + 0.02 + s.hmlLeveragePP * hmlCostFactor)

  const refiFixedFees = s.refiAppraisalCost + s.refiUnderwritingFees + s.refiOtherFees
  const mao2 = (propertyEquityPostRefi / (1 + s.minEquityPct)
    - (rehab + changeOrders + holdingCosts
       + s.hmlLeverageRehab * rehab * hmlCostFactor
       + hmlFixedFees
       + refiFixedFees
       + 0.02 * arv + 500
       - refiLoanAmount * (1 - s.refiPointsPct)))
    / (1.02 + s.hmlLeveragePP * hmlCostFactor)

  const maoDiscount = pp > 0
    ? Math.max((pp - mao1) / pp, (pp - mao2) / pp)
    : 0

  return {
    rehabMonths, closingCostsBuy, holdingCosts, allInCost,
    ppsqftPurchase, ppsqftSale,
    closingCostsSell, agentCosts, cashFlipProfit, cashFlipROI,
    ppFinancedAmt, rehabFinancedAmt,
    hmlLoan, hmlCashToClose,
    hmlMonthlyInterest, hmlTotalInterest, hmlPointsDollar, hmlTotalFees, hmlTotalDebt,
    hmlFlipProfit, hmlFlipROI,
    refiLTV, refiLoanAmount, refiPointsDollar, refiFees, refiFeePct,
    refiTitleCosts, cashFromLender, netCashAtClosing,
    moneyInDeal, capexReserve, pmFee, customExpenseTotal, customOneTime, mortgagePI, ltv300cashflow,
    totalPITI, totalIOExpenses, dscr,
    pitiSum, totalOperatingExpenses,
    cashMoneyLeftInDeal, cashEquityDollar, cashEquityPct,
    cashNOI_PI, cashROI_PI, cashNOI_IO, cashROI_IO,
    cashAnnualCashflow_PI, cashAnnualCashflow_IO, cashROE,
    cashEquityScore, cashROIScore, cashTotalScore,
    propertyEquityPostRefi, propertyEquityLiquidation,
    hmlMoneyInDeal,
    hmlEquityPostRefi, hmlEquityPctPostRefi,
    hmlEquityDollar, hmlEquityPct,
    hmlNOI_PI, hmlROI_PI, hmlNOI_IO, hmlROI_IO,
    hmlAnnualCashflow_PI, hmlAnnualCashflow_IO, hmlROE,
    hmlEquityScore, hmlROIScore, hmlTotalScore,
    hmlCustomFeesTotal, refiCustomFeesTotal,
    forcedEquityROI, equityMarginOnARV, equityPctBook,
    capRate, grm,
    irr2pct, irr3pct, irr4pct,
    mao1, mao2, maoDiscount,
  }
}

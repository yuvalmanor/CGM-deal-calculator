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
  // -1 = auto (2%), 0 = none, any positive = exact dollar amount
  const closingCostsBuy = closingCostsBuyOverride >= 0
    ? closingCostsBuyOverride
    : pp * 0.02

  // ── Property Metrics ──────────────────────────────────────────────────────
  const ppsqftPurchase = sqft > 0 ? pp / sqft : 0
  const ppsqftSale     = sqft > 0 ? arv / sqft : 0
  const holdingCosts   = rehabMonths * (tax + ins + hoa + stateTax) + 300 * rehabMonths
  const allInCost      = pp + closingCostsBuy + rehab + changeOrders + holdingCosts

  // ── Cash Flip ─────────────────────────────────────────────────────────────
  const closingCostsSell = arv * 0.02
  const agentCosts       = arv * 0.06 + 500
  const cashFlipProfit   = arv - (allInCost + closingCostsSell + agentCosts)
  const cashFlipROI      = allInCost > 0 ? cashFlipProfit / allInCost : 0

  // ── HML loan ──────────────────────────────────────────────────────────────
  // If ANY dollar amount is entered, both fields are treated as dollars.
  // hmlLoanRehab = 0 means "don't finance rehab", not "use leverage %".
  const useHmlDollars    = hmlLoanPP > 0 || hmlLoanRehab > 0
  const ppFinancedAmt    = useHmlDollars ? hmlLoanPP    : s.hmlLeveragePP * pp
  const rehabFinancedAmt = useHmlDollars ? hmlLoanRehab : s.hmlLeverageRehab * rehab
  const hmlLoanRaw       = ppFinancedAmt + rehabFinancedAmt
  const hmlLoan          = hmlLoanRaw > 0 ? Math.min(hmlLoanRaw, arv * 0.75) : 0

  const hmlCashToClose     = allInCost - hmlLoan
  const hmlMonthlyInterest = s.hmlMonthlyRate * hmlLoan
  const hmlTotalInterest   = months * hmlMonthlyInterest
  const hmlPointsDollar    = s.hmlPointsPct * hmlLoan
  const hmlCustomFeesTotal = hmlCustomFees.reduce((acc, f) => acc + f.amount, 0)
  const hmlTotalFees       = s.hmlAppraisalCost + s.hmlUnderwritingFees
    + s.hmlOtherFees + hmlPointsDollar + s.hmlExtraFees + hmlCustomFeesTotal
  const hmlTotalDebt       = hmlLoan + hmlTotalInterest + hmlTotalFees

  const hmlFlipProfit = arv - (hmlTotalDebt + hmlCashToClose + closingCostsSell + agentCosts)
  const hmlFlipROI    = hmlCashToClose > 0 ? hmlFlipProfit / hmlCashToClose : 0

  // ── Property management ───────────────────────────────────────────────────
  const pmFee = pmMode === 'fixed' ? pmFixed : rent * pmRate

  // ── Custom expenses (non-funded only affect cash flow) ────────────────────
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
  const refiLoanAmount   = arv * refiLTV
  const refiPointsDollar   = s.refiPointsPct * refiLoanAmount
  const refiCustomFeesTotal = refiCustomFees.reduce((acc, f) => acc + f.amount, 0)
  const refiFees            = s.refiAppraisalCost + s.refiUnderwritingFees
    + refiPointsDollar + s.refiOtherFees + refiCustomFeesTotal
  const refiFeePct       = refiLoanAmount > 0 ? refiFees / refiLoanAmount : 0
  const refiTitleCosts   = refiTitleCostsOverride > 0
    ? refiTitleCostsOverride
    : (arv > 0 ? arv * 0.02 + 500 : 0)

  const cashFromLender   = refiLoanAmount - refiFees - refiTitleCosts
  const netCashAtClosing = cashFromLender - hmlTotalDebt

  // ── PITI / Monthly Cash Flow ───────────────────────────────────────────────
  const moneyInDeal  = hmlCashToClose - netCashAtClosing - otherAdjustmentsAtClose
  const mortgagePI   = pmt(s.refiAnnualRate, 360, refiLoanAmount)
  const totalPITI    = tax + ins + hoa + stateTax + capexReserve + pmFee + mortgagePI + customExpenseTotal
  const totalIOExpenses = tax + ins + hoa + stateTax + capexReserve + pmFee + mortgageIO + customExpenseTotal
  const dscr         = (mortgagePI + ins + tax) > 0 ? rent / (mortgagePI + ins + tax) : 0

  // ── Bottom Line – Cash Scenario ───────────────────────────────────────────
  // Sheet row 55 applies the same close-adjustments as row 39 (HML)
  const cashMoneyLeftInDeal = allInCost - cashFromLender - otherAdjustmentsAtClose
  const cashEquityDollar    = arv - allInCost
  const cashEquityPct       = allInCost > 0 ? cashEquityDollar / allInCost : 0
  const cashNOI_PI          = rent - totalPITI
  const cashROI_PI          = cashMoneyLeftInDeal > 0 && exitStrategy === 'rental'
    ? (cashNOI_PI * 12) / cashMoneyLeftInDeal : 0
  const cashNOI_IO          = rent - totalIOExpenses
  const cashROI_IO          = cashMoneyLeftInDeal > 0 && exitStrategy === 'rental'
    ? (cashNOI_IO * 12) / cashMoneyLeftInDeal : 0
  const cashEquityScore = scoreEquity(cashEquityPct)
  const cashROIScore    = exitStrategy === 'rental' ? scoreROI(cashROI_PI) : 0
  const cashTotalScore  = cashEquityScore + cashROIScore + locationScore

  // ── Bottom Line – HML Scenario ────────────────────────────────────────────
  const propertyEquityPostRefi = arv - refiLoanAmount - (closingCostsSell + agentCosts)
  const hmlMoneyInDeal         = moneyInDeal
  const hmlEquityPostRefi      = propertyEquityPostRefi
  const hmlEquityPctPostRefi   = hmlMoneyInDeal > 0
    ? (hmlEquityPostRefi - hmlMoneyInDeal) / hmlMoneyInDeal : 0
  const hmlEquityDollar        = arv - allInCost
  const hmlEquityPct           = allInCost > 0 ? hmlEquityDollar / allInCost : 0
  const hmlNOI_PI              = rent - totalPITI
  const hmlROI_PI              = hmlMoneyInDeal > 0 && exitStrategy === 'rental'
    ? (hmlNOI_PI * 12) / hmlMoneyInDeal : 0
  const hmlNOI_IO              = rent - totalIOExpenses
  const hmlROI_IO              = hmlMoneyInDeal > 0 && exitStrategy === 'rental'
    ? (hmlNOI_IO * 12) / hmlMoneyInDeal : 0
  const hmlEquityScore = scoreEquity(hmlEquityPctPostRefi)
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
    cashMoneyLeftInDeal, cashEquityDollar, cashEquityPct,
    cashNOI_PI, cashROI_PI, cashNOI_IO, cashROI_IO,
    cashEquityScore, cashROIScore, cashTotalScore,
    propertyEquityPostRefi, hmlMoneyInDeal,
    hmlEquityPostRefi, hmlEquityPctPostRefi,
    hmlEquityDollar, hmlEquityPct,
    hmlNOI_PI, hmlROI_PI, hmlNOI_IO, hmlROI_IO,
    hmlEquityScore, hmlROIScore, hmlTotalScore,
    hmlCustomFeesTotal, refiCustomFeesTotal,
    mao1, mao2, maoDiscount,
  }
}

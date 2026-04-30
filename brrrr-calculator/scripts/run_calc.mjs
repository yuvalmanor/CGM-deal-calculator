// scripts/run_calc.mjs
// Run with: node scripts/run_calc.mjs
// Self-contained JS translation of lib/calculations.ts (types stripped).
// Prints JSON of key DealResults fields for comparison against Excel column C.

function pmt(annualRate, periods, principal) {
  if (principal === 0) return 0
  const r = annualRate / 12
  if (r === 0) return principal / periods
  return (principal * r) / (1 - Math.pow(1 + r, -periods))
}

function pv(annualRate, periods, payment) {
  const r = annualRate / 12
  if (r === 0) return payment * periods
  return payment * (1 - Math.pow(1 + r, -periods)) / r
}

function calculateDeal(inputs, s) {
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
  } = inputs

  const rehabMonths = rehabMonthsManual > 0
    ? rehabMonthsManual
    : (rehab + changeOrders) / 30000

  const closingCostsBuy = closingCostsBuyOverride >= 0
    ? closingCostsBuyOverride
    : pp * 0.02

  // Fix D: flip uses rehabMonths + seasoning for holding; rental uses only rehabMonths
  const holdMonths  = exitStrategy === 'flip' ? rehabMonths + months : rehabMonths
  const holdingCosts = holdMonths * (tax + ins + hoa + stateTax + 300)
  const allInCost    = pp + closingCostsBuy + rehab + changeOrders + holdingCosts

  const closingCostsSell = arv * 0.02
  const agentCosts       = arv * 0.06 + 500

  const useHmlDollars    = hmlLoanPP > 0 || hmlLoanRehab > 0
  const ppFinancedAmt    = useHmlDollars ? hmlLoanPP    : s.hmlLeveragePP * pp
  const rehabFinancedAmt = useHmlDollars ? hmlLoanRehab : s.hmlLeverageRehab * rehab
  const hmlLoanRaw       = ppFinancedAmt + rehabFinancedAmt
  const hmlLoan          = hmlLoanRaw > 0 ? Math.min(hmlLoanRaw, arv * 0.75) : 0

  const hmlMonthlyInterest = s.hmlMonthlyRate * hmlLoan
  const hmlTotalInterest   = months * hmlMonthlyInterest
  const hmlPointsDollar    = s.hmlPointsPct * hmlLoan
  const hmlTotalFees       = s.hmlAppraisalCost + s.hmlUnderwritingFees
    + s.hmlOtherFees + hmlPointsDollar + s.hmlExtraFees

  // Fix B: fees are paid at closing (added to cash-to-close), not future debt
  const hmlCashToClose = allInCost - hmlLoan + hmlTotalFees
  const hmlTotalDebt   = hmlLoan + hmlTotalInterest

  const pmFee = pmMode === 'fixed' ? pmFixed : rent * pmRate

  const customMonthly = customExpenses
    .filter(e => e.frequency === 'monthly' && !e.funded)
    .reduce((s, e) => s + e.amount, 0)
  const customAnnual = customExpenses
    .filter(e => e.frequency === 'annual' && !e.funded)
    .reduce((s, e) => s + e.amount / 12, 0)
  const customExpenseTotal = customMonthly + customAnnual

  const capexReserve  = rent * 0.15
  const targetPayment = rent - tax - ins - hoa - stateTax - capexReserve - pmFee - 300

  const ltv300cashflow = arv > 0
    ? pv(s.refiAnnualRate, 360, targetPayment) / arv
    : 0

  const refiLTV = refiLTVOverride > 0
    ? refiLTVOverride
    : Math.min(Math.max(ltv300cashflow, 0), 0.65)

  const refiLoanAmount   = arv * refiLTV
  const refiPointsDollar = s.refiPointsPct * refiLoanAmount
  const refiFees         = s.refiAppraisalCost + s.refiUnderwritingFees
    + refiPointsDollar + s.refiOtherFees
  const refiTitleCosts   = refiTitleCostsOverride > 0
    ? refiTitleCostsOverride
    : (arv > 0 ? arv * 0.02 + 500 : 0)

  const cashFromLender   = refiLoanAmount - refiFees - refiTitleCosts
  const netCashAtClosing = cashFromLender - hmlTotalDebt

  const moneyInDeal  = hmlCashToClose - netCashAtClosing - otherAdjustmentsAtClose
  const mortgagePI   = pmt(s.refiAnnualRate, 360, refiLoanAmount)

  const totalPITI = tax + ins + hoa + stateTax + capexReserve + pmFee + mortgagePI + customExpenseTotal

  // Fix C: negative seasoning cashflow adds real capital cost
  const hmlNOI_PI        = rent - totalPITI
  const seasoningDeficit = hmlNOI_PI < 0 ? Math.abs(hmlNOI_PI) * months : 0
  const hmlMoneyInDeal   = moneyInDeal + seasoningDeficit

  // Fix A: DSCR denominator includes HOA
  const dscr = (mortgagePI + ins + tax + hoa) > 0 ? rent / (mortgagePI + ins + tax + hoa) : 0

  const cashMoneyLeftInDeal = allInCost - cashFromLender - otherAdjustmentsAtClose

  // Fix E: book equity = ARV - refi loan (no sale costs)
  const propertyEquityPostRefi = arv - refiLoanAmount

  return {
    holdingCosts, allInCost,
    hmlLoan, hmlTotalDebt,
    refiLoanAmount, cashFromLender, netCashAtClosing,
    moneyInDeal, hmlMoneyInDeal,
    cashMoneyLeftInDeal,
    mortgagePI, dscr,
    propertyEquityPostRefi,
  }
}

// ── Anna TX seed inputs (column C of Deal Calc CGM V2.xlsx) ──────────────────
const inputs = {
  address: '1805 Cedar Wood Trl, Anna TX 75409',
  source: 'BSJ',
  propertyType: 'SFR',
  bedBath: '4/2',
  sqft: 1621,
  yearBuilt: 2013,
  purchasePrice: 230000,
  closingCostsBuyOverride: 0,    // row 9 = empty in Excel → $0 closing costs
  rehabEstimate: 14080,
  changeOrders: 2970,
  rehabMonthsManual: 1,
  arv: 300000,
  marketRent: 2434,
  propertyTaxMonthly: 470,
  insuranceMonthly: 143,
  hoaMonthly: 32,
  stateIncomeTaxMonthly: 0,
  mortgageIOMonthly: 0,
  pmMode: 'percent',
  pmRate: 0,
  pmFixed: 0,
  hmlLoanPP: 160000,
  hmlLoanRehab: 0,
  refiLTVOverride: 0.65,
  refiTitleCostsOverride: 5455,
  otherAdjustmentsAtClose: 11810,
  exitStrategy: 'rental',
  locationScore: 9,
  seasoningMonths: 3,           // row 25 = 3 months to refi
  customExpenses: [],
  hmlCustomFees: [],
  refiCustomFees: [],
  seller: '',
  comments: '',
}

const settings = {
  hmlLenderName: '',
  hmlLeveragePP: 0.696,
  hmlLeverageRehab: 0,
  hmlMonthlyRate: 0.008292,
  hmlPointsPct: 0.02,
  hmlAppraisalCost: 0,
  hmlUnderwritingFees: 1295,
  hmlOtherFees: 495,
  hmlExtraFees: 1477,           // row 104 formula has hardcoded +1477 extra fee
  refiLenderName: '',
  refiAnnualRate: 0.07,
  refiPointsPct: 0.015,
  refiAppraisalCost: 750,
  refiUnderwritingFees: 1599,
  refiOtherFees: 500,
  maxMoneyInDeal: 65000,
  minEquityPct: 0.20,
}

const r = calculateDeal(inputs, settings)

console.log(JSON.stringify({
  holding_costs:      r.holdingCosts,
  all_in_cost:        r.allInCost,
  hml_loan:           r.hmlLoan,
  hml_total_debt:     r.hmlTotalDebt,
  refi_loan:          r.refiLoanAmount,
  cash_from_lender:   r.cashFromLender,
  net_cash_closing:   r.netCashAtClosing,
  money_in_deal_hml:  r.hmlMoneyInDeal,
  money_in_deal_cash: r.cashMoneyLeftInDeal,
  mortgage_pi:        r.mortgagePI,
  dscr:               r.dscr,
  prop_equity:        r.propertyEquityPostRefi,
}))

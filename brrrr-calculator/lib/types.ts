export interface LenderFee {
  id: string
  name: string
  amount: number
}

export interface RehabCost {
  id: string
  name: string
  amount: number
  funded: boolean
  isDefault?: boolean
}

export interface CustomExpense {
  id: string
  name: string
  amount: number
  frequency: 'one-time' | 'monthly' | 'annual'
  funded: boolean  // funded = stub (excluded from cash flow; full implementation pending)
}

export interface DealInputs {
  // Identity
  address: string
  seller: string
  propertyType: string
  sqft: number
  yearBuilt: number

  // Deal numbers
  purchasePrice: number
  rehabEstimate: number
  changeOrders: number
  marketRent: number
  arv: number
  exitStrategy: 'flip' | 'rental'

  // Rehab months — manual (0 = auto from (rehab+CO)/30,000)
  rehabMonthsManual: number

  // Closing costs on purchase — override (-1 = auto 2% of PP, ≥0 = exact $)
  closingCostsBuyOverride: number

  // Seasoning
  seasoningMonths: number

  // Monthly expenses
  propertyTaxMonthly: number
  insuranceMonthly: number
  hoaMonthly: number
  stateIncomeTaxMonthly: number
  mortgageIOMonthly: number

  // Property management
  pmMode: 'percent' | 'fixed'
  pmRate: number    // decimal, e.g. 0.10 = 10%
  pmFixed: number   // fixed $/mo when pmMode = 'fixed'

  // Custom expense line items
  customExpenses: CustomExpense[]

  // Rehab additional costs (display only; funded toggle is informational)
  rehabCustomCosts: RehabCost[]

  // Change orders mode (percent of rehab or fixed $)
  changeOrdersMode: 'percent' | 'fixed'
  changeOrdersPct: number  // decimal, e.g. 0.10 = 10%

  // Monthly expense input modes (user enters monthly or annual)
  propertyTaxMode: 'monthly' | 'annual'
  insuranceMode: 'monthly' | 'annual'
  hoaMode: 'monthly' | 'annual'
  stateTaxMode: 'monthly' | 'annual'

  // CapEx + Vacancy input mode (percent of rent or fixed $)
  capexMode: 'percent' | 'fixed'
  capexRate: number    // decimal, e.g. 0.15 = 15% (display only; calculations use hardcoded 15%)
  capexFixed: number   // fixed $/mo when capexMode = 'fixed' (display only)

  // Lender custom fees (one-time fixed amounts added to loan cost)
  hmlCustomFees: LenderFee[]
  refiCustomFees: LenderFee[]

  // HML loan amounts — actual dollars negotiated (0 = derive from leverage %)
  hmlLoanPP: number
  hmlLoanRehab: number

  // Refi overrides
  refiLTVOverride: number         // 0 = auto; >0 = use this (e.g. 0.65)
  refiTitleCostsOverride: number  // 0 = auto (ARV×2%+500); >0 = exact $

  // Extra cash adjustments at refi close (credits, prepaid items, etc.)
  otherAdjustmentsAtClose: number

  // Deal score
  locationScore: number
  comments: string
}

export interface LenderSettings {
  // HML defaults (used when hmlLoanPP / hmlLoanRehab are 0)
  hmlLenderName: string
  hmlLeveragePP: number
  hmlLeverageRehab: number
  hmlMonthlyRate: number
  hmlAppraisalCost: number
  hmlUnderwritingFees: number
  hmlPointsPct: number
  hmlOtherFees: number
  hmlExtraFees: number

  // Refi lender
  refiLenderName: string
  refiAnnualRate: number
  refiAppraisalCost: number
  refiUnderwritingFees: number
  refiPointsPct: number
  refiOtherFees: number

  // MAO targets
  maxMoneyInDeal: number
  minEquityPct: number
}

export interface DealResults {
  // Derived inputs
  rehabMonths: number
  closingCostsBuy: number
  allInCost: number
  holdingCosts: number

  // Per-sqft
  ppsqftPurchase: number
  ppsqftSale: number

  // Cash flip
  closingCostsSell: number
  agentCosts: number
  cashFlipProfit: number
  cashFlipROI: number

  // HML
  ppFinancedAmt: number
  rehabFinancedAmt: number
  hmlLoan: number
  hmlCashToClose: number
  hmlMonthlyInterest: number
  hmlTotalInterest: number
  hmlPointsDollar: number
  hmlTotalFees: number
  hmlTotalDebt: number
  hmlFlipProfit: number
  hmlFlipROI: number

  // Refi
  refiLTV: number
  refiLoanAmount: number
  refiPointsDollar: number
  refiFees: number
  refiFeePct: number
  refiTitleCosts: number
  cashFromLender: number
  netCashAtClosing: number

  // PITI / cash flow
  moneyInDeal: number
  capexReserve: number
  pmFee: number
  customExpenseTotal: number
  customOneTime: number
  mortgagePI: number
  ltv300cashflow: number
  totalPITI: number
  totalIOExpenses: number
  dscr: number

  // Bottom Line – Cash
  cashMoneyLeftInDeal: number
  cashEquityDollar: number
  cashEquityPct: number
  cashNOI_PI: number
  cashROI_PI: number
  cashNOI_IO: number
  cashROI_IO: number
  cashEquityScore: number
  cashROIScore: number
  cashTotalScore: number

  // Bottom Line – HML
  propertyEquityPostRefi: number
  propertyEquityLiquidation: number
  hmlMoneyInDeal: number
  hmlEquityPostRefi: number
  hmlEquityPctPostRefi: number
  hmlEquityDollar: number
  hmlEquityPct: number
  hmlNOI_PI: number
  hmlROI_PI: number
  hmlNOI_IO: number
  hmlROI_IO: number
  hmlAnnualCashflow_PI: number
  hmlAnnualCashflow_IO: number
  hmlEquityScore: number
  hmlROIScore: number
  hmlTotalScore: number

  // Annual cashflow – Cash
  cashAnnualCashflow_PI: number
  cashAnnualCashflow_IO: number

  // Lender custom fee totals
  hmlCustomFeesTotal: number
  refiCustomFeesTotal: number

  // Phase 5 — new metrics
  pitiSum: number
  totalOperatingExpenses: number
  capRate: number
  grm: number
  cashROE: number
  hmlROE: number
  forcedEquityROI: number
  equityMarginOnARV: number
  equityPctBook: number
  irr2pct: number
  irr3pct: number
  irr4pct: number

  // MAO
  mao1: number
  mao2: number
  maoDiscount: number
}

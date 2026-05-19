// New deal model for CGM Design v2
// Self-contained: types, defaults, and all calc functions

export interface ExtraFee {
  id: string
  label: string
  amount: number
}

export interface MonthlyLine {
  id: string
  label: string
  amount: number
  unit: 'mo' | 'yr'
}

export interface RehabAdditionalCost {
  id: string
  label: string
  amount: number
  funded: boolean   // true = HML finances 100% of this cost; false = cash out-of-pocket
}

export interface Deal {
  // Property
  address: string
  sellerAgent: string
  propertyType: string
  sqft: number
  yearBuilt: number
  schoolGrade: number   // total school grade (e.g. 9, 12, 15) — maps to location score 0–10

  // Deal numbers
  purchasePrice: number
  arv: number
  monthlyRent: number
  closingCostsBuy: number

  // Rehab
  rehabEstimate: number
  changeOrdersMode: 'pctOfRehab' | 'fixed'
  changeOrdersPct: number
  changeOrdersFixed: number
  rehabMonths: number
  rehabAdditionalCosts: RehabAdditionalCost[]

  // Monthly expenses
  taxes: number
  taxesUnit: 'mo' | 'yr'
  insurance: number
  insuranceUnit: 'mo' | 'yr'
  hoa: number
  hoaUnit: 'mo' | 'yr'
  stateIncTax: number
  stateIncTaxUnit: 'mo' | 'yr'
  capexVacancyMode: 'pct' | 'fixed'
  capexVacancyPct: number
  capexVacancyFixed: number
  mgmtMode: 'pct' | 'fixed'
  mgmtPct: number
  mgmtFixed: number
  additionalMonthly: MonthlyLine[]

  // HML
  hmlName: string
  hmlLevPP: number
  hmlLevRehab: number
  hmlRate: number
  hmlPoints: number
  hmlLenderFees: number
  hmlPostClosingMisc: number
  hmlExtraFees: ExtraFee[]

  // Refi
  refiName: string
  refiRate: number
  refiPoints: number
  refiTermYears: number
  refiAppraisal: number
  refiUnderwriting: number
  refiOtherMisc: number
  refiSeasoningMonths: number
  refiLtv: number
  refiTitleEscrow: number
  refiExtraFees: ExtraFee[]

  // One-time
  oneTimeCosts: ExtraFee[]

  // Settings
  sellingCostsPct: number
  holdMonthsForFlip: number
  maxMoneyInDeal: number          // MAO-1 threshold (default $65k)
  projectCostAdjustments: number // credits at close (seller concessions, EM credits, etc.) — subtracted from Total Project Cost

  // Thresholds
  minCashflow: number
  minCoC: number
  minDscr: number
  minEquityPct: number
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}

export const DEFAULT_DEAL: Deal = {
  address: '1805 Cedar Wood, Anna TX, 75409',
  sellerAgent: 'BSJ',
  propertyType: 'SFR',
  sqft: 1621,
  yearBuilt: 2013,
  schoolGrade: 9,

  purchasePrice: 230000,
  arv: 300000,
  monthlyRent: 2434,
  closingCostsBuy: 4600,

  rehabEstimate: 14080,
  changeOrdersMode: 'fixed',
  changeOrdersPct: 10,
  changeOrdersFixed: 2970,
  rehabMonths: 1,
  rehabAdditionalCosts: [],

  taxes: 470, taxesUnit: 'mo',
  insurance: 143, insuranceUnit: 'mo',
  hoa: 32, hoaUnit: 'mo',
  stateIncTax: 0, stateIncTaxUnit: 'yr',
  capexVacancyMode: 'pct',
  capexVacancyPct: 15,
  capexVacancyFixed: 365,
  mgmtMode: 'fixed',
  mgmtPct: 8,
  mgmtFixed: 13,
  additionalMonthly: [
    { id: uid(), label: 'Inspection City of Anna', amount: 25, unit: 'mo' },
  ],

  hmlName: 'Marshall Reddick',
  hmlLevPP: 69.565,
  hmlLevRehab: 0,
  hmlRate: 11.0,
  hmlPoints: 2.0,
  hmlLenderFees: 496,
  hmlPostClosingMisc: 495,
  hmlExtraFees: [],

  refiName: 'ABC bank',
  refiRate: 7.0,
  refiPoints: 1.5,
  refiTermYears: 30,
  refiAppraisal: 750,
  refiUnderwriting: 1,
  refiOtherMisc: 500,
  refiSeasoningMonths: 3,
  refiLtv: 65,
  refiTitleEscrow: 0,
  refiExtraFees: [],

  oneTimeCosts: [
    { id: uid(), label: 'Photographer', amount: 180 },
    { id: uid(), label: 'Clean up', amount: 300 },
    { id: uid(), label: 'Inspection', amount: 550 },
  ],

  sellingCostsPct: 8,
  holdMonthsForFlip: 6,
  maxMoneyInDeal: 65000,
  projectCostAdjustments: 0,

  minCashflow: 200,
  minCoC: 8,
  minDscr: 1.25,
  minEquityPct: 20,
}

// ---- Formatters ----

export function fmtCurrency(n: number | null | undefined, opts: { decimals?: number; signed?: boolean } = {}): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  const { decimals = 0, signed = false } = opts
  const sign = n < 0 ? '-' : signed && n > 0 ? '+' : ''
  const abs = Math.abs(n)
  return sign + '$' + abs.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function fmtPct(n: number | null | undefined, decimals = 1): string {
  if (n === null || n === undefined || Number.isNaN(n) || !Number.isFinite(n)) return '—'
  return n.toFixed(decimals) + '%'
}

export function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined || Number.isNaN(n) || !Number.isFinite(n)) return '—'
  return n.toFixed(decimals)
}

// ---- Location score mapping ----

export function mapLocationScore(grade: number): number {
  if (grade >= 15) return 10
  if (grade >= 12) return 9
  if (grade >= 10) return 8
  if (grade >= 9)  return 7
  if (grade >= 7)  return 6
  return 0
}

// ---- IRR helpers (ported from lib/calculations.ts) ----

function pmtCalc(annualRate: number, periods: number, principal: number): number {
  if (principal === 0) return 0
  const r = annualRate / 12
  if (r === 0) return principal / periods
  return (principal * r) / (1 - Math.pow(1 + r, -periods))
}

function remainingBalance(annualRate: number, periods: number, principal: number, paymentsMade: number): number {
  const r = annualRate / 12
  const payment = pmtCalc(annualRate, periods, principal)
  if (r === 0) return principal - payment * paymentsMade
  return principal * Math.pow(1 + r, paymentsMade) - payment * (Math.pow(1 + r, paymentsMade) - 1) / r
}

function irrAnnual(cashflows: number[]): number {
  if (cashflows[0] >= 0) return 0
  let r = 0.005
  for (let iter = 0; iter < 300; iter++) {
    let npv = 0, dnpv = 0
    for (let t = 0; t < cashflows.length; t++) {
      const factor = Math.pow(1 + r, t)
      npv  += cashflows[t] / factor
      dnpv -= t * cashflows[t] / (factor * (1 + r))
    }
    if (Math.abs(dnpv) < 1e-14) break
    const dr = npv / dnpv
    r -= dr
    if (Math.abs(dr) < 1e-8) break
  }
  if (!isFinite(r) || r <= -1) return 0
  return (Math.pow(1 + r, 12) - 1) * 100
}

function computeIRR5Year(
  moneyInDeal: number,
  annualCashflow: number,
  arv: number,
  appreciationRate: number,
  refiLoan: number,
  refiAnnualRate: number,
  refiTermYears: number,
  sellingCostsPct: number,
): number {
  if (moneyInDeal <= 0) return 0
  const projectedARV = arv * Math.pow(1 + appreciationRate, 5)
  const netSalePrice = projectedARV * (1 - sellingCostsPct / 100)
  const loanBalance  = remainingBalance(refiAnnualRate, refiTermYears * 12, refiLoan, 60)
  const exitProceeds = netSalePrice - loanBalance
  const monthlyOp = annualCashflow / 12
  const cfs: number[] = [-moneyInDeal]
  for (let m = 1; m <= 59; m++) cfs.push(monthlyOp)
  cfs.push(monthlyOp + exitProceeds)
  return irrAnnual(cfs)
}

// ---- Internal helpers ----

function toMonthly(val: number, unit: 'mo' | 'yr'): number {
  return unit === 'yr' ? val / 12 : val
}

// Base rehab (rehabEstimate + changeOrders), before additional costs
export function totalRehab(d: Deal): number {
  const co = d.changeOrdersMode === 'pctOfRehab'
    ? d.rehabEstimate * (d.changeOrdersPct / 100)
    : d.changeOrdersFixed
  return d.rehabEstimate + co
}

export interface OpExpenses {
  taxes: number; ins: number; hoa: number; sit: number
  capV: number; mgmt: number; extras: number; total: number
  totalNoCapex: number
}

export function monthlyOpExpenses(d: Deal): OpExpenses {
  const taxes = toMonthly(d.taxes, d.taxesUnit)
  const ins    = toMonthly(d.insurance, d.insuranceUnit)
  const hoa    = toMonthly(d.hoa, d.hoaUnit)
  const sit    = toMonthly(d.stateIncTax, d.stateIncTaxUnit)
  const capV   = d.capexVacancyMode === 'pct'
    ? d.monthlyRent * (d.capexVacancyPct / 100)
    : d.capexVacancyFixed
  const mgmt   = d.mgmtMode === 'pct'
    ? d.monthlyRent * (d.mgmtPct / 100)
    : d.mgmtFixed
  const extras = (d.additionalMonthly || []).reduce((s, r) => s + toMonthly(r.amount || 0, r.unit), 0)
  const total = taxes + ins + hoa + sit + capV + mgmt + extras
  const totalNoCapex = taxes + ins + hoa + sit + mgmt + extras
  return { taxes, ins, hoa, sit, capV, mgmt, extras, total, totalNoCapex }
}

interface HMLCalc {
  principal: number; points: number; monthlyInterest: number
  totalInterest: number; lenderFees: number; postClosingMisc: number
  extraFees: number; totalCost: number  // fees only (points + lender fees), excludes interest
}

function calcHML(d: Deal, additionalFunded: number = 0): HMLCalc {
  const rehab = totalRehab(d)
  const principal = d.purchasePrice * (d.hmlLevPP / 100) + rehab * (d.hmlLevRehab / 100) + additionalFunded
  const points = principal * (d.hmlPoints / 100)
  const extraFees = (d.hmlExtraFees || []).reduce((s, f) => s + (f.amount || 0), 0)
  const monthlyInterest = (principal * (d.hmlRate / 100)) / 12
  const totalInterest = monthlyInterest * d.rehabMonths
  // totalCost = fees only (points + lender fees + misc); interest carry shown separately
  const totalCost = points + d.hmlLenderFees + d.hmlPostClosingMisc + extraFees
  return { principal, points, monthlyInterest, totalInterest, lenderFees: d.hmlLenderFees, postClosingMisc: d.hmlPostClosingMisc, extraFees, totalCost }
}

interface RefiCalc {
  refiLoan: number; points: number; titleEscrow: number
  totalRefiClosing: number; extraFees: number; pi: number
}

function calcRefi(d: Deal): RefiCalc {
  const refiLoan = d.arv * (d.refiLtv / 100)
  const points = refiLoan * (d.refiPoints / 100)
  const titleEscrow = d.refiTitleEscrow > 0 ? d.refiTitleEscrow : d.arv * 0.02 + 500
  const extraFees = (d.refiExtraFees || []).reduce((s, f) => s + (f.amount || 0), 0)
  const totalRefiClosing = points + titleEscrow + d.refiAppraisal + d.refiUnderwriting + d.refiOtherMisc + extraFees
  const r = d.refiRate / 100 / 12
  const n = d.refiTermYears * 12
  const pi = r === 0 ? refiLoan / n : (refiLoan * r) / (1 - Math.pow(1 + r, -n))
  return { refiLoan, points, titleEscrow, totalRefiClosing, extraFees, pi }
}

// ---- Scenario results ----

export interface BRRRRResult {
  rehab: number
  rehabEstimate: number    // d.rehabEstimate (funded portion)
  changeOrders: number     // rehab - rehabEstimate (not-funded portion)
  totalProjectCost: number
  // HML
  hmlPrincipal: number
  hmlPointsDollar: number
  hmlMonthlyInterest: number
  hmlTotalInterest: number   // interest for stated rehabMonths (label use)
  hmlCarryMonths: number     // actual carry = max(rehabMonths, refiSeasoningMonths)
  hmlCarryInterest: number   // interest for actual carry months (cash impact)
  hmlTotalCost: number     // fees only (points + lender fees + misc), excludes interest
  hmlTotalDebt: number     // total HML obligation: principal + carry interest
  // Cash flows
  acqGap: number
  cashInAcq: number
  holdingCosts: number     // property carrying costs during rehab (taxes+ins+sit+hoa+$300) × months
  cashInHolding: number    // alias for holdingCosts
  totalCashIn: number
  // Refi
  refiLoan: number
  refiPointsDollar: number
  refiTitleEscrow: number
  refiTotalClosing: number
  refiPI: number
  cashReturnedAtRefi: number
  moneyInDeal: number        // = totalCashIn - cashReturnedAtRefi
  cashLeftIn: number         // alias for moneyInDeal (backward compat)
  // Operating
  totalOpex: number
  totalOpexNoCapex: number   // opex excluding capex/vacancy reserve
  totalOpexWithPI: number    // total opex + refi P&I (PITI-inclusive)
  totalOpexNoCapexWithPI: number // opex w/o capex + refi P&I
  capexVacancy: number       // capex + vacancy dollar amount
  noi: number
  cashflow: number
  annualCashflow: number
  cashflowNoCapex: number
  coc: number
  cocNoCapex: number
  dscr: number               // rent / (PI + tax + ins) — per cheat sheet row 52
  lenderDscr: number         // rent / (tax + ins + stateIncTax + hoa) — no mortgage
  // Equity (book)
  equityDollar: number
  equityPct: number
  equityMarginArv: number    // (ARV - totalProjectCost) / totalProjectCost — "forced equity"
  equityForcedDollar: number // ARV - totalProjectCost
  trueEquityBook: number
  equityMultiplier: number
  // Equity (liquidation) - Fix E
  equityLiquidationDollar: number
  equityLiquidationPct: number
  // Advanced metrics
  capRate: number
  grm: number
  roe: number
  irr2pct: number
  irr3pct: number
  irr4pct: number
  monthlyRent: number
}

export function calcBRRRR(d: Deal): BRRRRResult {
  const rehab = totalRehab(d)
  const changeOrders = rehab - d.rehabEstimate
  const additionalFunded    = (d.rehabAdditionalCosts || []).filter(c => c.funded).reduce((s, c)  => s + (c.amount || 0), 0)
  const additionalNotFunded = (d.rehabAdditionalCosts || []).filter(c => !c.funded).reduce((s, c) => s + (c.amount || 0), 0)
  const oneTime = (d.oneTimeCosts || []).reduce((s, c) => s + (c.amount || 0), 0)

  // op computed early — needed for holding costs (before totalProjectCost)
  const op = monthlyOpExpenses(d)
  // Holding costs = property carrying costs during rehab (taxes + ins + state tax + HOA + $300 misc)
  const holdingCosts = d.rehabMonths * (op.taxes + op.ins + op.sit + op.hoa + 300)

  const hml = calcHML(d, additionalFunded)
  const totalProjectCost = d.purchasePrice + rehab + additionalFunded + additionalNotFunded + d.closingCostsBuy + oneTime + holdingCosts - d.projectCostAdjustments

  // totalCashIn = Total Project Cost − HML loan + HML fees
  // Algebraically equals (PP×(1−levPP%) + rehab×(1−levRehab%) + additionalNotFunded)
  // + closingCostsBuy + oneTime + holdingCosts + fees − projectCostAdjustments
  const totalCashIn = totalProjectCost - hml.principal + hml.totalCost

  // Retained for backward compatibility (UI/scoring may reference these)
  const acqGap = d.purchasePrice * (1 - d.hmlLevPP / 100)
    + rehab * (1 - d.hmlLevRehab / 100)
    + additionalNotFunded
  const cashInAcq = acqGap + d.closingCostsBuy + hml.points + hml.lenderFees + hml.postClosingMisc + hml.extraFees + oneTime
  const cashInHolding = holdingCosts

  // Fix C: carry runs until the later of rehab completion or seasoning requirement
  const hmlCarryMonths = Math.max(d.rehabMonths, d.refiSeasoningMonths)
  const hmlCarryInterest = hml.monthlyInterest * hmlCarryMonths

  const refi = calcRefi(d)
  // HML total debt = principal + carry interest (paid off at refi close)
  const hmlTotalDebt = hml.principal + hmlCarryInterest
  const cashReturnedAtRefi = refi.refiLoan - hmlTotalDebt - refi.totalRefiClosing
  const moneyInDeal = totalCashIn - cashReturnedAtRefi
  const totalOpex = op.total
  const totalOpexNoCapex = op.totalNoCapex
  const totalOpexWithPI = totalOpex + refi.pi
  const totalOpexNoCapexWithPI = totalOpexNoCapex + refi.pi
  const capexVacancy = op.capV

  // Cashflow = rent - all opex - refi P&I
  const cashflow = d.monthlyRent - totalOpex - refi.pi
  const cashflowNoCapex = cashflow + op.capV

  const noi = d.monthlyRent - totalOpex

  // DSCR per cheat sheet row 52: rent / (PI + tax + ins)
  const dscrDenom = refi.pi + op.taxes + op.ins
  const dscr = dscrDenom > 0 ? d.monthlyRent / dscrDenom : 0

  // Lender DSCR (no mortgage): rent / (tax + ins + stateIncTax + hoa)
  const lenderDscrDenom = op.taxes + op.ins + op.sit + op.hoa
  const lenderDscr = lenderDscrDenom > 0 ? d.monthlyRent / lenderDscrDenom : 0

  const coc = moneyInDeal > 0
    ? ((cashflow * 12) / moneyInDeal) * 100
    : (cashflow > 0 ? Infinity : 0)
  const cocNoCapex = moneyInDeal > 0
    ? ((cashflowNoCapex * 12) / moneyInDeal) * 100
    : (cashflowNoCapex > 0 ? Infinity : 0)

  const equityDollar = d.arv - refi.refiLoan
  // Equity % = return on money left in deal: (Equity$ − Money in Deal) / Money in Deal
  const equityPct = moneyInDeal > 0 ? ((equityDollar - moneyInDeal) / moneyInDeal) * 100 : 0
  // Forced equity = (ARV - total project cost) / total project cost
  const equityForcedDollar = d.arv - totalProjectCost
  const equityMarginArv = totalProjectCost > 0 ? (equityForcedDollar / totalProjectCost) * 100 : 0
  const trueEquityBook = ((d.arv - refi.refiLoan) / d.arv) * 100
  const equityMultiplier = totalCashIn > 0 ? (d.arv - refi.refiLoan + cashReturnedAtRefi) / totalCashIn : 0

  // Fix E: liquidation equity = equity after selling costs
  const saleNetProceeds = d.arv * (1 - d.sellingCostsPct / 100)
  const equityLiquidationDollar = saleNetProceeds - refi.refiLoan
  const equityLiquidationPct = (equityLiquidationDollar / d.arv) * 100

  // Advanced metrics
  const capRate = d.arv > 0 ? (noi * 12) / d.arv * 100 : 0
  const grm = d.monthlyRent > 0 ? d.arv / (d.monthlyRent * 12) : 0
  const roe = equityDollar > 0 ? (cashflow * 12) / equityDollar * 100 : 0

  // 5-Year IRR
  const irr2pct = computeIRR5Year(moneyInDeal, cashflow * 12, d.arv, 0.02, refi.refiLoan, d.refiRate / 100, d.refiTermYears, d.sellingCostsPct)
  const irr3pct = computeIRR5Year(moneyInDeal, cashflow * 12, d.arv, 0.03, refi.refiLoan, d.refiRate / 100, d.refiTermYears, d.sellingCostsPct)
  const irr4pct = computeIRR5Year(moneyInDeal, cashflow * 12, d.arv, 0.04, refi.refiLoan, d.refiRate / 100, d.refiTermYears, d.sellingCostsPct)

  return {
    rehab, rehabEstimate: d.rehabEstimate, changeOrders,
    totalProjectCost,
    hmlPrincipal: hml.principal, hmlPointsDollar: hml.points,
    hmlMonthlyInterest: hml.monthlyInterest, hmlTotalInterest: hml.totalInterest,
    hmlCarryMonths, hmlCarryInterest, hmlTotalCost: hml.totalCost, hmlTotalDebt,
    acqGap, cashInAcq, holdingCosts, cashInHolding: holdingCosts, totalCashIn,
    refiLoan: refi.refiLoan, refiPointsDollar: refi.points, refiTitleEscrow: refi.titleEscrow,
    refiTotalClosing: refi.totalRefiClosing, refiPI: refi.pi,
    cashReturnedAtRefi, moneyInDeal, cashLeftIn: moneyInDeal,
    totalOpex, totalOpexNoCapex, totalOpexWithPI, totalOpexNoCapexWithPI, capexVacancy,
    noi, cashflow, annualCashflow: cashflow * 12, cashflowNoCapex,
    coc, cocNoCapex, dscr, lenderDscr,
    equityDollar, equityPct, equityMarginArv, equityForcedDollar,
    trueEquityBook, equityMultiplier,
    equityLiquidationDollar, equityLiquidationPct,
    capRate, grm, roe,
    irr2pct, irr3pct, irr4pct,
    monthlyRent: d.monthlyRent,
  }
}

export interface FlipCashResult {
  rehab: number
  holdingCarry: number
  totalCashIn: number
  sellingCosts: number
  grossProceeds: number
  profit: number
  roi: number
  annualizedRoi: number
  holdMonths: number
  arv: number
}

export function calcFlipCash(d: Deal): FlipCashResult {
  const rehab = totalRehab(d)
  const additionalAll = (d.rehabAdditionalCosts || []).reduce((s, c) => s + (c.amount || 0), 0)
  const oneTime = (d.oneTimeCosts || []).reduce((s, c) => s + (c.amount || 0), 0)
  const op = monthlyOpExpenses(d)
  // Fix D: flip carry uses ALL operating expenses, not just taxes+ins+HOA
  const holdingCarry = op.total * d.holdMonthsForFlip
  const totalCashIn = d.purchasePrice + rehab + additionalAll + d.closingCostsBuy + oneTime + holdingCarry
  const sellingCosts = d.arv * (d.sellingCostsPct / 100)
  const grossProceeds = d.arv - sellingCosts
  const profit = grossProceeds - totalCashIn
  const roi = totalCashIn > 0 ? (profit / totalCashIn) * 100 : 0
  const annualizedRoi = roi * (12 / Math.max(1, d.holdMonthsForFlip))
  return { rehab, holdingCarry, totalCashIn, sellingCosts, grossProceeds, profit, roi, annualizedRoi, holdMonths: d.holdMonthsForFlip, arv: d.arv }
}

export interface FlipHMLResult {
  rehab: number
  hmlPrincipal: number
  cashInAcq: number
  cashHolding: number
  cashIn: number
  sellingCosts: number
  grossProceeds: number
  netToInvestor: number
  profit: number
  roi: number
  annualizedRoi: number
  holdMonths: number
}

export function calcFlipHML(d: Deal): FlipHMLResult {
  const rehab = totalRehab(d)
  const additionalFunded    = (d.rehabAdditionalCosts || []).filter(c => c.funded).reduce((s, c)  => s + (c.amount || 0), 0)
  const additionalNotFunded = (d.rehabAdditionalCosts || []).filter(c => !c.funded).reduce((s, c) => s + (c.amount || 0), 0)
  const oneTime = (d.oneTimeCosts || []).reduce((s, c) => s + (c.amount || 0), 0)
  const hml = calcHML(d, additionalFunded)
  const op = monthlyOpExpenses(d)
  const acqGap = Math.max(0, d.purchasePrice * (1 - d.hmlLevPP / 100) + rehab * (1 - d.hmlLevRehab / 100) + additionalNotFunded)
  const cashInAcq = acqGap + d.closingCostsBuy + hml.points + hml.lenderFees + hml.postClosingMisc + hml.extraFees + oneTime
  // Fix D: flip HML carry uses ALL operating expenses
  const cashHolding = hml.totalInterest + op.total * d.rehabMonths
  const cashIn = cashInAcq + cashHolding
  const sellingCosts = d.arv * (d.sellingCostsPct / 100)
  const grossProceeds = d.arv - sellingCosts
  const netToInvestor = grossProceeds - hml.principal
  const profit = netToInvestor - cashIn
  const roi = cashIn > 0 ? (profit / cashIn) * 100 : 0
  const annualizedRoi = roi * (12 / Math.max(1, d.rehabMonths))
  return { rehab, hmlPrincipal: hml.principal, cashInAcq, cashHolding, cashIn, sellingCosts, grossProceeds, netToInvestor, profit, roi, annualizedRoi, holdMonths: d.rehabMonths }
}

export interface MAOResult {
  mao70: number
  maoMoneyInDeal: number   // MAO-1: money in deal ≤ maxMoneyInDeal (replaces old maoBrrrr)
  maoEquity: number        // MAO-2: forced equity ≥ minEquityPct
  mao: number
  constraint: string
  deltaToOffer: number
}

export function calcMAO(d: Deal): MAOResult {
  const rehab = totalRehab(d)
  const additionalFunded    = (d.rehabAdditionalCosts || []).filter(c => c.funded).reduce((s, c)  => s + (c.amount || 0), 0)
  const additionalNotFunded = (d.rehabAdditionalCosts || []).filter(c => !c.funded).reduce((s, c) => s + (c.amount || 0), 0)
  const oneTime = (d.oneTimeCosts || []).reduce((s, c) => s + (c.amount || 0), 0)
  const op = monthlyOpExpenses(d)
  const holdingCosts = d.rehabMonths * (op.taxes + op.ins + op.sit + op.hoa + 300)

  const mao70 = d.arv * 0.70 - rehab

  const refi = calcRefi(d)
  const ltcPP = d.hmlLevPP / 100
  const ltcRehab = d.hmlLevRehab / 100
  const pts = d.hmlPoints / 100
  const r_mo = d.hmlRate / 100 / 12
  const carryMonths = Math.max(d.rehabMonths, d.refiSeasoningMonths)
  const lenderMisc = d.hmlLenderFees + d.hmlPostClosingMisc + (d.hmlExtraFees || []).reduce((s, f) => s + (f.amount || 0), 0)

  // moneyInDeal(PP) = ppCoef*PP + C, derived by inverting calcBRRRR's moneyInDeal.
  // Shared by MAO-1 and MAO-2 — both solve linearly for PP given a moneyInDeal cap.
  const ppCoef = 1 + ltcPP * (pts + r_mo * carryMonths)
  const hmlFinancedRehab = rehab * ltcRehab + additionalFunded
  const C = rehab * (1 - ltcRehab)
    + additionalNotFunded
    + d.closingCostsBuy
    + oneTime
    + holdingCosts
    - d.projectCostAdjustments
    + lenderMisc
    + hmlFinancedRehab * (1 + pts + r_mo * carryMonths)
    - refi.refiLoan
    + refi.totalRefiClosing

  // MAO-1: max PP where moneyInDeal ≤ maxMoneyInDeal
  const maoMoneyInDeal = ppCoef > 0 ? (d.maxMoneyInDeal - C) / ppCoef : 0

  // MAO-2 (Excel row 67 — leverage-aware post-Refi equity):
  //   (propEquityPostRefi − moneyInDeal) / moneyInDeal ≥ minEquityPct
  //   ⇔ moneyInDeal ≤ propEquityPostRefi / (1 + minEquityPct)
  // propEquityPostRefi = ARV × (1 − sellingCostsPct) − refiLoan (matches equityLiquidationDollar)
  const propEquityPostRefi = d.arv * (1 - d.sellingCostsPct / 100) - refi.refiLoan
  const moneyInDealEqCap = propEquityPostRefi / (1 + d.minEquityPct / 100)
  const maoEquity = ppCoef > 0 ? (moneyInDealEqCap - C) / ppCoef : 0

  const mao = Math.min(mao70, maoMoneyInDeal, maoEquity)
  const constraints = [
    { val: mao70,           label: '70% Rule' },
    { val: maoMoneyInDeal,  label: `Money in deal ≤ $${(d.maxMoneyInDeal / 1000).toFixed(0)}k` },
    { val: maoEquity,       label: `Equity post-Refi ≥ ${d.minEquityPct}%` },
  ]
  const binding = constraints.reduce((a, b) => a.val <= b.val ? a : b)
  return { mao70, maoMoneyInDeal, maoEquity, mao, constraint: binding.label, deltaToOffer: mao - d.purchasePrice }
}

export interface ScoreComponent {
  key: string
  label: string
  weight: number
  score: number
  value: string
  target: string
}

export interface DealScore {
  score: number
  components: ScoreComponent[]
  weakest: ScoreComponent[]
  verdict: 'GO' | 'MAYBE' | 'NO-GO'
}

export function calcDealScore(d: Deal, brrrr: BRRRRResult, _mao: MAOResult): DealScore {
  // CoC step: ≥10→10, ≥9→9, ≥8→8, ≥7→7, ≥6→6, <6→0
  const coc = Number.isFinite(brrrr.coc) ? brrrr.coc : 100
  const cocScore = coc >= 10 ? 10 : coc >= 9 ? 9 : coc >= 8 ? 8 : coc >= 7 ? 7 : coc >= 6 ? 6 : 0

  // Equity step: ≥35%→10, ≥30%→9, ≥25%→8, ≥20%→7, else→0
  const eq = brrrr.equityMarginArv
  const eqScore = eq >= 35 ? 10 : eq >= 30 ? 9 : eq >= 25 ? 8 : eq >= 20 ? 7 : 0

  // Location: school grade mapped (15→10, 12→9, 10→8, 9→7, 7→6, else→0)
  const locScore = Math.min(10, Math.max(0, mapLocationScore(d.schoolGrade)))

  const w = 1 / 3
  const components: ScoreComponent[] = [
    { key: 'coc',      label: 'Cash-on-Cash', weight: w, score: cocScore, value: Number.isFinite(brrrr.coc) ? fmtPct(brrrr.coc) : '∞', target: '≥10%' },
    { key: 'equity',   label: 'Equity %',     weight: w, score: eqScore,  value: fmtPct(brrrr.equityMarginArv), target: '≥20%' },
    { key: 'location', label: 'Location',     weight: w, score: locScore, value: `${mapLocationScore(d.schoolGrade)}/10`, target: '≥7' },
  ]
  const total = (cocScore + eqScore + locScore) / 3
  const weakest = [...components].sort((a, b) => a.score - b.score).slice(0, 2)
  const verdict: 'GO' | 'MAYBE' | 'NO-GO' = total >= 8 ? 'GO' : 'NO-GO'
  return { score: total, components, weakest, verdict }
}

export type Status = 'good' | 'warn' | 'bad' | 'neutral'

export function statusFor(metric: string, value: number, d: Deal): Status {
  const v = Number.isFinite(value) ? value : 0
  switch (metric) {
    case 'cashflow':     return v >= d.minCashflow ? 'good' : v >= d.minCashflow * 0.5 ? 'warn' : 'bad'
    case 'coc':          return v >= d.minCoC ? 'good' : v >= d.minCoC * 0.6 ? 'warn' : 'bad'
    case 'dscr':         return v >= d.minDscr ? 'good' : v >= 1.05 ? 'warn' : 'bad'
    case 'equity':       return v >= d.minEquityPct ? 'good' : v >= d.minEquityPct * 0.6 ? 'warn' : 'bad'
    case 'moneyInDeal':
    case 'cashLeftIn':   return v <= 0 ? 'good' : v <= d.maxMoneyInDeal ? 'warn' : 'bad'
    case 'score':        return v >= 8 ? 'good' : v >= 5 ? 'warn' : 'bad'
    case 'roi':          return v >= 20 ? 'good' : v >= 10 ? 'warn' : 'bad'
    case 'irr':          return v >= 15 ? 'good' : v >= 8 ? 'warn' : 'bad'
    case 'capRate':      return v < 5 ? 'bad' : v < 7 ? 'warn' : v <= 9 ? 'good' : 'warn'
    case 'grm':          return v <= 0 ? 'neutral' : v < 8 ? 'good' : v <= 15 ? 'warn' : 'bad'
    default: return 'neutral'
  }
}

export function newUid(): string { return uid() }

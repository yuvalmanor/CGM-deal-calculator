// Buy & Hold calculator — a Scenario that lives outside the frozen engine (ADR-0005).
//
// Pure function: Deal → B&H result. The property is bought with one long-term
// loan at purchase (bnhLoanPct of the price; 0 = all cash) on the selected Refi
// Term Sheet's rate, term, points and fees. Rehab is paid in cash, and the rehab
// months carry both the usual holding costs and the mortgage.
//
// Imports only the engine's exported building blocks. The engine's amortization
// helper is private, so this module carries its own rather than exporting it out
// of the frozen file. Refi LTV and seasoning are BRRRR-only and never read here.
// Refi title/escrow is charged at the exact value BRRRR uses (typed, or its auto
// value when blank), read from calcBRRRR's result so the auto rule is never copied.
//
// Value metrics (equity, cap rate, GRM, ROE, IRR) are measured against ARV or the
// purchase price, per bnhValueBasis. Income metrics never read the value.
//
// The B&H Deal Score reuses the engine's scoring function: B&H CoC and Equity %
// go in through a BRRRR-shaped adapter, so the scoring rules and the GO/NO-GO
// cutoff are never copied here.

import {
  calcBRRRR, calcDealScore, calcMAO, monthlyOpExpenses, totalRehab,
  type Deal, type DealScore, type MAOResult,
} from './deal-model'

export interface BuyHoldResult {
  // Loan
  loan: number
  downPayment: number
  loanPointsDollar: number    // origination points on the B&H loan
  loanBuydownDollar: number   // rate-buydown points on the B&H loan
  titleEscrow: number         // Refi title/escrow, same value as BRRRR's (0 when all cash)
  loanCosts: number           // points + buydown + appraisal + underwriting + other misc + extra fees + title/escrow
  mortgagePI: number
  // Cash In
  cashRehab: number           // total rehab + every additional rehab cost — no HML, so all cash
  oneTimeCosts: number
  holdingCosts: number        // rehab months × (tax + ins + state tax + HOA + $300 + mortgage)
  cashIn: number
  // Monthly operating
  monthlyRent: number
  totalOpex: number
  totalOpexNoCapex: number
  totalOpexWithPI: number
  totalOpexNoCapexWithPI: number
  capexVacancy: number
  noi: number
  cashflow: number
  cashflowNoCapex: number
  annualCashflow: number
  coc: number
  cocNoCapex: number
  dscr: number                // rent / (mortgage + tax + ins)
  lenderDscr: number          // rent / (tax + ins + state tax + HOA) — same as BRRRR's
  // Value metrics — measured against `value` (ARV or purchase price, per bnhValueBasis)
  value: number
  equityDollar: number        // value − loan
  equityPct: number           // (Equity $ − Cash In) / Cash In
  capRate: number             // NOI × 12 / value
  grm: number                 // value / (rent × 12)
  roe: number                 // yearly cashflow / Equity $
  remainingBalance60: number  // loan balance after 60 payments — the IRR exit pays it off
  irr2pct: number
  irr3pct: number
  irr4pct: number
}

const sum = (rows: { amount: number }[] | undefined) =>
  (rows || []).reduce((s, r) => s + (r.amount || 0), 0)

function monthlyPayment(principal: number, annualRatePct: number, termYears: number): number {
  const n = termYears * 12
  if (principal === 0 || n <= 0) return 0
  const r = annualRatePct / 100 / 12
  if (r === 0) return principal / n
  return (principal * r) / (1 - Math.pow(1 + r, -n))
}

function balanceAfter(principal: number, annualRatePct: number, termYears: number, paymentsMade: number): number {
  if (principal === 0) return 0
  const payment = monthlyPayment(principal, annualRatePct, termYears)
  const r = annualRatePct / 100 / 12
  if (r === 0) return Math.max(0, principal - payment * paymentsMade)
  const g = Math.pow(1 + r, paymentsMade)
  return Math.max(0, principal * g - payment * (g - 1) / r)
}

// Annualized IRR (%) of monthly flows; 0 when it can't be solved, same as BRRRR's
function irrAnnualPct(flows: number[]): number {
  if (flows[0] >= 0) return 0
  let r = 0.005
  for (let iter = 0; iter < 300; iter++) {
    let npv = 0, dnpv = 0
    for (let t = 0; t < flows.length; t++) {
      const f = Math.pow(1 + r, t)
      npv += flows[t] / f
      dnpv -= t * flows[t] / (f * (1 + r))
    }
    if (Math.abs(dnpv) < 1e-14) break
    const dr = npv / dnpv
    r -= dr
    if (Math.abs(dr) < 1e-8) break
  }
  if (!Number.isFinite(r) || r <= -1) return 0
  return (Math.pow(1 + r, 12) - 1) * 100
}

// −Cash In at month 0, the monthly cashflow for 60 months, and at month 60 the sale:
// value × (1+g)^5 × (1 − selling %) − the loan balance after 60 payments
function irr5Year(cashIn: number, cashflow: number, value: number, appreciation: number, sellingPct: number, balance60: number): number {
  if (cashIn <= 0) return 0
  const exit = value * Math.pow(1 + appreciation, 5) * (1 - sellingPct / 100) - balance60
  const flows = [-cashIn]
  for (let m = 1; m <= 59; m++) flows.push(cashflow)
  flows.push(cashflow + exit)
  return irrAnnualPct(flows)
}

export function calcBuyHold(d: Deal): BuyHoldResult {
  const loan = d.purchasePrice * (d.bnhLoanPct / 100)
  const downPayment = d.purchasePrice - loan

  const loanPointsDollar = loan * (d.refiPoints / 100)
  const loanBuydownDollar = loan * ((d.refiBuydownPoints || 0) / 100)
  // All cash (no loan) means no lender, so none of the Refi lender's flat fees apply
  const titleEscrow = loan > 0 ? calcBRRRR(d).refiTitleEscrow : 0
  const lenderFlatFees = loan > 0
    ? d.refiAppraisal + d.refiUnderwriting + d.refiOtherMisc + sum(d.refiExtraFees) + titleEscrow
    : 0
  const loanCosts = loanPointsDollar + loanBuydownDollar + lenderFlatFees
  const mortgagePI = monthlyPayment(loan, d.refiRate, d.refiTermYears)

  const op = monthlyOpExpenses(d)
  const cashRehab = totalRehab(d) + sum(d.rehabAdditionalCosts)
  const oneTimeCosts = sum(d.oneTimeCosts)
  const holdingCosts = d.rehabMonths * (op.taxes + op.ins + op.sit + op.hoa + 300 + mortgagePI)
  const cashIn = downPayment + d.closingCostsBuy + loanCosts
    + cashRehab + oneTimeCosts + holdingCosts - d.projectCostAdjustments

  const noi = d.monthlyRent - op.total
  const cashflow = noi - mortgagePI
  const cashflowNoCapex = cashflow + op.capV

  // Same zero/infinite handling as BRRRR's CoC
  const coc = cashIn > 0 ? ((cashflow * 12) / cashIn) * 100 : (cashflow > 0 ? Infinity : 0)
  const cocNoCapex = cashIn > 0 ? ((cashflowNoCapex * 12) / cashIn) * 100 : (cashflowNoCapex > 0 ? Infinity : 0)

  const dscrDenom = mortgagePI + op.taxes + op.ins
  const dscr = dscrDenom > 0 ? d.monthlyRent / dscrDenom : 0
  const lenderDscrDenom = op.taxes + op.ins + op.sit + op.hoa
  const lenderDscr = lenderDscrDenom > 0 ? d.monthlyRent / lenderDscrDenom : 0

  const value = d.bnhValueBasis === 'purchase' ? d.purchasePrice : d.arv
  const equityDollar = value - loan
  const equityPct = cashIn > 0 ? ((equityDollar - cashIn) / cashIn) * 100 : 0
  const capRate = value > 0 ? (noi * 12) / value * 100 : 0
  const grm = d.monthlyRent > 0 ? value / (d.monthlyRent * 12) : 0
  const roe = equityDollar > 0 ? (cashflow * 12) / equityDollar * 100 : 0
  const remainingBalance60 = balanceAfter(loan, d.refiRate, d.refiTermYears, 60)
  const irr = (g: number) => irr5Year(cashIn, cashflow, value, g, d.sellingCostsPct, remainingBalance60)

  return {
    loan, downPayment, loanPointsDollar, loanBuydownDollar, titleEscrow, loanCosts, mortgagePI,
    cashRehab, oneTimeCosts, holdingCosts, cashIn,
    monthlyRent: d.monthlyRent,
    totalOpex: op.total,
    totalOpexNoCapex: op.totalNoCapex,
    totalOpexWithPI: op.total + mortgagePI,
    totalOpexNoCapexWithPI: op.totalNoCapex + mortgagePI,
    capexVacancy: op.capV,
    noi, cashflow, cashflowNoCapex, annualCashflow: cashflow * 12,
    coc, cocNoCapex, dscr, lenderDscr,
    value, equityDollar, equityPct, capRate, grm, roe, remainingBalance60,
    irr2pct: irr(0.02), irr3pct: irr(0.03), irr4pct: irr(0.04),
  }
}

// The engine scores a BRRRRResult on its CoC and Equity % (plus the Deal's Location).
// Feed it BRRRR's own result with those two swapped for B&H's.
export function calcBuyHoldScore(d: Deal, bnh: BuyHoldResult = calcBuyHold(d), mao: MAOResult = calcMAO(d)): DealScore {
  return calcDealScore(d, { ...calcBRRRR(d), coc: bnh.coc, equityPct: bnh.equityPct }, mao)
}

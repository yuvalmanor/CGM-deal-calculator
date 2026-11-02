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

import { calcBRRRR, monthlyOpExpenses, totalRehab, type Deal } from './deal-model'

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
  }
}

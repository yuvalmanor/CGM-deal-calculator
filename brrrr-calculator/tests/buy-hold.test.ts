// Tests for the Buy & Hold calculator (lib/buy-hold.ts).
//
// The fixture's expected values were worked out by hand, independently of the
// module (round inputs; only the mortgage needs a calculator):
//   loan        = 200,000 × 80%                      = 160,000   down payment 40,000
//   loan costs  = 1% + 0.5% of 160,000 (2,400) + 600 + 1,000 + 400 + 250 + 1,200 title = 5,850
//   mortgage    = PMT(6%/12, 360, 160,000)           = 959.2808
//   cash rehab  = 10,000 + 1,000 CO + 1,500 funded + 500 cash = 13,000
//   holding     = 2 mo × (300 + 100 + 50 + 25 + 300 + 959.2808) = 3,468.5617
//   Cash In     = 40,000 + 4,000 + 5,850 + 13,000 + 300 + 3,468.5617 − 1,000 = 65,618.5617
//   opex        = 300 tax + 100 ins + 25 HOA + 50 SIT + 200 capex + 160 mgmt = 835
//   NOI 1,165 · cashflow 205.7192 · w/o capex 405.7192
//   CoC 3.7621% · w/o capex 7.4196% · DSCR 2,000 ÷ 1,359.2808 = 1.4714 · lender 2,000 ÷ 475 = 4.2105

import { describe, it, expect } from 'vitest'
import { type Deal } from '../lib/deal-model'
import { BLANK_DEAL } from '../lib/blank-deal'
import { calcBuyHold, type BuyHoldResult } from '../lib/buy-hold'

const BH_DEAL: Deal = {
  ...BLANK_DEAL,
  purchasePrice: 200000,
  arv: 250000,
  monthlyRent: 2000,
  closingCostsBuy: 4000,

  rehabEstimate: 10000,
  changeOrdersMode: 'fixed',
  changeOrdersFixed: 1000,
  rehabMonths: 2,
  rehabAdditionalCosts: [
    { id: 'a1', label: 'Roof', amount: 1500, funded: true },
    { id: 'a2', label: 'Paint', amount: 500, funded: false },
  ],

  taxes: 3600, taxesUnit: 'yr',
  insurance: 100, insuranceUnit: 'mo',
  hoa: 25, hoaUnit: 'mo',
  stateIncTax: 600, stateIncTaxUnit: 'yr',
  capexVacancyMode: 'pct', capexVacancyPct: 10,
  mgmtMode: 'pct', mgmtPct: 8,
  additionalMonthly: [],

  refiRate: 6,
  refiTermYears: 30,
  refiPoints: 1,
  refiBuydownPoints: 0.5,
  refiAppraisal: 600,
  refiUnderwriting: 1000,
  refiOtherMisc: 400,
  refiExtraFees: [
    { id: 'f1', label: 'Rate lock', amount: 250 },
    { id: 'f2', label: 'Title (lender policy)', amount: 1200 },
  ],
  refiTitleEscrow: 3000,
  refiLtv: 75,
  refiSeasoningMonths: 6,

  bnhLoanPct: 80,

  oneTimeCosts: [{ id: 'o1', label: 'Inspection', amount: 300 }],
  projectCostAdjustments: 1000,
}

function allFinite(r: BuyHoldResult) {
  for (const [k, v] of Object.entries(r)) expect(Number.isFinite(v), `${k} should be finite`).toBe(true)
}

describe('calcBuyHold: hand-checked fixture', () => {
  const r = calcBuyHold(BH_DEAL)

  it('sizes the loan and down payment on the purchase price', () => {
    expect(r.loan).toBe(160000)
    expect(r.downPayment).toBe(40000)
  })

  it('charges the Refi Term Sheet costs on the B&H loan', () => {
    expect(r.loanPointsDollar).toBeCloseTo(1600, 6)
    expect(r.loanBuydownDollar).toBeCloseTo(800, 6)
    expect(r.loanCosts).toBeCloseTo(5850, 6)
  })

  it('amortizes the mortgage at the refi rate and term', () => {
    expect(r.mortgagePI).toBeCloseTo(959.2808, 4)
  })

  it('adds up Cash In', () => {
    expect(r.cashRehab).toBe(13000)
    expect(r.oneTimeCosts).toBe(300)
    expect(r.holdingCosts).toBeCloseTo(3468.5617, 4)
    expect(r.cashIn).toBeCloseTo(65618.5617, 4)
  })

  it('computes NOI, cashflow, CoC, DSCR and the lender ratio', () => {
    expect(r.totalOpex).toBeCloseTo(835, 6)
    expect(r.totalOpexNoCapex).toBeCloseTo(635, 6)
    expect(r.capexVacancy).toBeCloseTo(200, 6)
    expect(r.totalOpexWithPI).toBeCloseTo(1794.2808, 4)
    expect(r.noi).toBeCloseTo(1165, 6)
    expect(r.cashflow).toBeCloseTo(205.7192, 4)
    expect(r.cashflowNoCapex).toBeCloseTo(405.7192, 4)
    expect(r.annualCashflow).toBeCloseTo(2468.6299, 3)
    expect(r.coc).toBeCloseTo(3.7621, 4)
    expect(r.cocNoCapex).toBeCloseTo(7.4196, 4)
    expect(r.dscr).toBeCloseTo(1.4714, 4)
    expect(r.lenderDscr).toBeCloseTo(4.2105, 4)
  })
})

describe('calcBuyHold: edge cases', () => {
  it('loan % = 0 is an all-cash purchase: no mortgage, DSCR without P&I', () => {
    const r = calcBuyHold({ ...BH_DEAL, bnhLoanPct: 0 })
    expect(r.loan).toBe(0)
    expect(r.downPayment).toBe(200000)
    expect(r.mortgagePI).toBe(0)
    expect(r.loanPointsDollar).toBe(0)
    expect(r.loanBuydownDollar).toBe(0)
    expect(r.loanCosts).toBe(0)        // no lender → no appraisal, underwriting, misc or extra fees (title included)
    expect(r.cashflow).toBeCloseTo(1165, 6)
    expect(r.dscr).toBeCloseTo(2000 / 400, 6)
    // holding: 2 × (300 + 100 + 50 + 25 + 300) = 1,550
    // Cash In: 200,000 + 4,000 + 0 + 13,000 + 300 + 1,550 − 1,000 = 217,850
    expect(r.holdingCosts).toBeCloseTo(1550, 6)
    expect(r.cashIn).toBeCloseTo(217850, 6)
    expect(r.coc).toBeCloseTo(1165 * 12 / 217850 * 100, 6)  // 6.4172%
  })

  it('zero rehab months means no holding costs', () => {
    const r = calcBuyHold({ ...BH_DEAL, rehabMonths: 0 })
    expect(r.holdingCosts).toBe(0)
    expect(r.cashIn).toBeCloseTo(65618.5617 - 3468.5617, 4)
  })

  it('zero rent never blows up', () => {
    const r = calcBuyHold({ ...BH_DEAL, monthlyRent: 0 })
    allFinite(r)
    expect(r.dscr).toBe(0)
    expect(r.lenderDscr).toBe(0)
    expect(r.cashflow).toBeLessThan(0)
  })

  it('a blank deal never blows up', () => {
    allFinite(calcBuyHold(BLANK_DEAL))
  })

  it('counts funded additional rehab costs as cash — the funded flag is ignored', () => {
    const flipped = calcBuyHold({
      ...BH_DEAL,
      rehabAdditionalCosts: BH_DEAL.rehabAdditionalCosts.map(c => ({ ...c, funded: !c.funded })),
    })
    expect(flipped).toEqual(calcBuyHold(BH_DEAL))
  })

  it('computes points and buydown on the B&H loan, not the refi loan', () => {
    // Moving ARV moves the refi loan (ARV × LTV) but not the B&H loan
    const r = calcBuyHold({ ...BH_DEAL, arv: 400000 })
    expect(r.loanPointsDollar).toBeCloseTo(160000 * 0.01, 6)
    expect(r.loanBuydownDollar).toBeCloseTo(160000 * 0.005, 6)
    expect(r.loanCosts).toBeCloseTo(5850, 6)
  })

  it('ignores refi title/escrow (incl. its auto value), refi LTV and seasoning', () => {
    const base = calcBuyHold(BH_DEAL)
    expect(calcBuyHold({ ...BH_DEAL, refiTitleEscrow: 0 })).toEqual(base)   // 0 = ARV-based auto in BRRRR
    expect(calcBuyHold({ ...BH_DEAL, refiTitleEscrow: 9999 })).toEqual(base)
    expect(calcBuyHold({ ...BH_DEAL, refiLtv: 0 })).toEqual(base)
    expect(calcBuyHold({ ...BH_DEAL, refiLtv: 80 })).toEqual(base)
    expect(calcBuyHold({ ...BH_DEAL, refiSeasoningMonths: 0 })).toEqual(base)
    expect(calcBuyHold({ ...BH_DEAL, refiSeasoningMonths: 12 })).toEqual(base)
  })

  it('a zero rate divides the loan evenly over the term', () => {
    expect(calcBuyHold({ ...BH_DEAL, refiRate: 0 }).mortgagePI).toBeCloseTo(160000 / 360, 6)
  })

  it('CoC is infinite when credits cover all cash in and cashflow is positive', () => {
    const r = calcBuyHold({ ...BH_DEAL, projectCostAdjustments: 100000 })
    expect(r.cashIn).toBeLessThan(0)
    expect(r.coc).toBe(Infinity)
  })
})

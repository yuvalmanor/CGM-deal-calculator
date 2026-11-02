// Tests for the Buy & Hold calculator (lib/buy-hold.ts).
//
// The fixture's expected values were worked out by hand, independently of the
// module (round inputs; only the mortgage needs a calculator):
//   loan        = 200,000 × 80%                      = 160,000   down payment 40,000
//   loan costs  = 1% + 0.5% of 160,000 (2,400) + 600 + 1,000 + 400 + 250 + 1,200 title + 3,000 title/escrow = 8,850
//   mortgage    = PMT(6%/12, 360, 160,000)           = 959.2808
//   cash rehab  = 10,000 + 1,000 CO + 1,500 funded + 500 cash = 13,000
//   holding     = 2 mo × (300 + 100 + 50 + 25 + 300 + 959.2808) = 3,468.5617
//   Cash In     = 40,000 + 4,000 + 8,850 + 13,000 + 300 + 3,468.5617 − 1,000 = 68,618.5617
//   opex        = 300 tax + 100 ins + 25 HOA + 50 SIT + 200 capex + 160 mgmt = 835
//   NOI 1,165 · cashflow 205.7192 · w/o capex 405.7192
//   CoC 3.5976% · w/o capex 7.0952% · DSCR 2,000 ÷ 1,359.2808 = 1.4714 · lender 2,000 ÷ 475 = 4.2105
//
// Value metrics (phase 2), selling costs 8%. The balance after 60 payments was found
// by stepping the schedule month by month, and the IRRs by bisection on the NPV —
// not with the module's closed form or Newton solver:
//   balance after 60 payments = 148,886.9709
//   ARV basis (250,000):      Equity $ 90,000 · Equity % 31.1598 · cap 5.592% · GRM 10.4167 · ROE 2.7429%
//                             IRR 2% 12.1297 · 3% 14.5461 · 4% 16.8539
//   Purchase basis (200,000): Equity $ 40,000 · Equity % −41.7067 · cap 6.99% · GRM 8.3333 · ROE 6.1716%
//                             IRR 2% −0.6520 · 3% 2.4734 · 4% 5.3503
//   All cash, ARV, 3%:        IRR 10.3583 (no balance; Cash In 217,850, cashflow 1,165)

import { describe, it, expect } from 'vitest'
import { calcBRRRR, type Deal } from '../lib/deal-model'
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
    expect(r.titleEscrow).toBe(3000)
    expect(r.loanCosts).toBeCloseTo(8850, 6)
  })

  it('amortizes the mortgage at the refi rate and term', () => {
    expect(r.mortgagePI).toBeCloseTo(959.2808, 4)
  })

  it('adds up Cash In', () => {
    expect(r.cashRehab).toBe(13000)
    expect(r.oneTimeCosts).toBe(300)
    expect(r.holdingCosts).toBeCloseTo(3468.5617, 4)
    expect(r.cashIn).toBeCloseTo(68618.5617, 4)
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
    expect(r.coc).toBeCloseTo(3.5976, 4)
    expect(r.cocNoCapex).toBeCloseTo(7.0952, 4)
    expect(r.dscr).toBeCloseTo(1.4714, 4)
    expect(r.lenderDscr).toBeCloseTo(4.2105, 4)
  })
})

describe('calcBuyHold: value metrics (hand-checked)', () => {
  it('measures equity, cap rate, GRM, ROE and IRR against ARV by default', () => {
    const r = calcBuyHold(BH_DEAL)
    expect(r.value).toBe(250000)
    expect(r.equityDollar).toBe(90000)
    expect(r.equityPct).toBeCloseTo(31.1598, 4)
    expect(r.capRate).toBeCloseTo(5.592, 6)
    expect(r.grm).toBeCloseTo(10.4167, 4)
    expect(r.roe).toBeCloseTo(2.7429, 4)
    expect(r.remainingBalance60).toBeCloseTo(148886.9709, 3)
    expect(r.irr2pct).toBeCloseTo(12.1297, 3)
    expect(r.irr3pct).toBeCloseTo(14.5461, 3)
    expect(r.irr4pct).toBeCloseTo(16.8539, 3)
  })

  it('measures them against the purchase price when the basis is purchase', () => {
    const r = calcBuyHold({ ...BH_DEAL, bnhValueBasis: 'purchase' })
    expect(r.value).toBe(200000)
    expect(r.equityDollar).toBe(40000)
    expect(r.equityPct).toBeCloseTo(-41.7067, 4)
    expect(r.capRate).toBeCloseTo(6.99, 6)
    expect(r.grm).toBeCloseTo(8.3333, 4)
    expect(r.roe).toBeCloseTo(6.1716, 4)
    expect(r.irr2pct).toBeCloseTo(-0.6520, 3)
    expect(r.irr3pct).toBeCloseTo(2.4734, 3)
    expect(r.irr4pct).toBeCloseTo(5.3503, 3)
  })

  it('the basis changes value metrics only — never cashflow, CoC, DSCR or Cash In', () => {
    const arv = calcBuyHold({ ...BH_DEAL, bnhValueBasis: 'arv' })
    const pp = calcBuyHold({ ...BH_DEAL, bnhValueBasis: 'purchase' })
    for (const k of ['equityDollar', 'equityPct', 'capRate', 'grm', 'irr2pct', 'irr3pct', 'irr4pct'] as const) {
      expect(pp[k], k).not.toBeCloseTo(arv[k], 2)
    }
    for (const k of ['cashflow', 'cashflowNoCapex', 'coc', 'cocNoCapex', 'dscr', 'lenderDscr', 'cashIn', 'noi', 'mortgagePI'] as const) {
      expect(pp[k], k).toBe(arv[k])
    }
  })

  it('IRR flows: −Cash In, 60 monthly cashflows, year-5 sale net of selling costs and the balance', () => {
    // Rebuild the flows here and check the result zeroes their NPV
    const r = calcBuyHold(BH_DEAL)
    for (const [g, irr] of [[0.02, r.irr2pct], [0.03, r.irr3pct], [0.04, r.irr4pct]] as const) {
      const exit = 250000 * Math.pow(1 + g, 5) * (1 - 0.08) - 148886.9709
      const flows = [-r.cashIn, ...Array(59).fill(r.cashflow), r.cashflow + exit]
      const m = Math.pow(1 + irr / 100, 1 / 12) - 1
      const npv = flows.reduce((s, c, t) => s + c / Math.pow(1 + m, t), 0)
      expect(Math.abs(npv)).toBeLessThan(0.05)
    }
  })

  it('all cash: no balance to pay off at the sale', () => {
    const r = calcBuyHold({ ...BH_DEAL, bnhLoanPct: 0 })
    expect(r.remainingBalance60).toBe(0)
    expect(r.equityDollar).toBe(250000)
    expect(r.irr3pct).toBeCloseTo(10.3583, 3)
  })

  it('no IRR when credits cover all of Cash In', () => {
    const r = calcBuyHold({ ...BH_DEAL, projectCostAdjustments: 100000 })
    expect(r.irr3pct).toBe(0)
    expect(r.equityPct).toBe(0)
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
    expect(r.loanCosts).toBe(0)        // no lender → no appraisal, underwriting, misc, extra fees or title/escrow
    expect(r.titleEscrow).toBe(0)
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
    expect(r.cashIn).toBeCloseTo(68618.5617 - 3468.5617, 4)
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
    expect(r.loanCosts).toBeCloseTo(8850, 6)
  })

  it('charges refi title/escrow at the same value BRRRR uses, auto value included', () => {
    const typed = calcBuyHold(BH_DEAL)
    expect(typed.titleEscrow).toBe(calcBRRRR(BH_DEAL).refiTitleEscrow)
    // Blank (0) = BRRRR's auto value: ARV × 2% + $500 = 250,000 × 2% + 500 = 5,500
    const auto: Deal = { ...BH_DEAL, refiTitleEscrow: 0 }
    const r = calcBuyHold(auto)
    expect(r.titleEscrow).toBe(5500)
    expect(r.titleEscrow).toBe(calcBRRRR(auto).refiTitleEscrow)
    expect(r.loanCosts).toBeCloseTo(8850 - 3000 + 5500, 6)
  })

  it('ignores refi LTV and seasoning', () => {
    const base = calcBuyHold(BH_DEAL)
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

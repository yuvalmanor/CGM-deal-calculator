// Golden tests for lib/payoff-horizon.ts, pinned to the independently
// verified fixtures in plans/payoff-horizon.md (L = $210,000, 30-year fixed,
// tolerance ±$1).

import { describe, it, expect } from 'vitest'
import { monthlyPayment, payoffHorizonColumn, PAYOFF_HORIZONS_YEARS } from '../lib/payoff-horizon'

const L = 210_000

function column(annualRatePct: number, pppSchedule: number[], opts: { termYears?: number; upfrontCost?: number } = {}) {
  return payoffHorizonColumn({
    loanAmount: L,
    annualRatePct,
    termYears: opts.termYears ?? 30,
    pppSchedule,
    upfrontCost: opts.upfrontCost ?? 0,
  })
}

function cellAt(cells: ReturnType<typeof column>, horizonYears: number) {
  const cell = cells.find((c) => c.horizonYears === horizonYears)
  if (!cell) throw new Error(`no cell for horizon ${horizonYears}`)
  return cell
}

describe('monthlyPayment — P&I fixtures', () => {
  it('matches the verified payments to the cent', () => {
    expect(monthlyPayment(L, 7.0, 30)).toBeCloseTo(1397.14, 2)
    expect(monthlyPayment(L, 7.375, 30)).toBeCloseTo(1450.42, 2)
    expect(monthlyPayment(L, 7.625, 30)).toBeCloseTo(1486.37, 2)
  })

  it('zero rate amortizes linearly', () => {
    expect(monthlyPayment(120_000, 0, 10)).toBeCloseTo(1000, 6)
  })
})

describe('payoffHorizonColumn — verified fixtures (±$1)', () => {
  const cases: {
    rate: number; ppp: number[]; horizon: number
    cumInterest: number; balance: number; penalty: number
  }[] = [
    { rate: 7.375, ppp: [5, 5, 5], horizon: 3, cumInterest: 45_798, balance: 203_583, penalty: 0 },
    { rate: 7.625, ppp: [5, 5, 5], horizon: 3, cumInterest: 47_383, balance: 203_874, penalty: 0 },
    { rate: 7.25, ppp: [5, 5, 5, 5, 5], horizon: 3, cumInterest: 45_007, balance: 203_434, penalty: 10_172 },
    { rate: 7.0, ppp: [5, 5, 5, 5, 5], horizon: 5, cumInterest: 71_504, balance: 197_676, penalty: 0 },
    { rate: 7.0, ppp: [5, 5, 5, 5, 5], horizon: 20, cumInterest: 245_643, balance: 120_330, penalty: 0 },
  ]

  for (const c of cases) {
    it(`${c.rate}% PPP [${c.ppp}] @ ${c.horizon} yr`, () => {
      const cell = cellAt(column(c.rate, c.ppp), c.horizon)
      expect(Math.abs(cell.cumInterest - c.cumInterest)).toBeLessThanOrEqual(1)
      expect(Math.abs(cell.remainingBalance - c.balance)).toBeLessThanOrEqual(1)
      expect(Math.abs(cell.penalty - c.penalty)).toBeLessThanOrEqual(1)
    })
  }

  it('total = upfrontCost + cumInterest + penalty', () => {
    const upfront = 6_543.21
    const cells = column(7.25, [5, 5, 5, 5, 5], { upfrontCost: upfront })
    for (const cell of cells) {
      expect(cell.total).toBeCloseTo(upfront + cell.cumInterest + cell.penalty, 6)
    }
  })
})

describe('penalty boundary convention', () => {
  it('payoff at exactly pppMonths is penalty-free (month 36 of a 3-year PPP)', () => {
    expect(cellAt(column(7.375, [5, 5, 5]), 3).penalty).toBe(0)
  })

  it('month 48 of a 5-year step-down applies the year-4 percentage', () => {
    const cell = payoffHorizonColumn(
      { loanAmount: L, annualRatePct: 7.0, termYears: 30, pppSchedule: [5, 4, 3, 2, 1], upfrontCost: 0 },
      [4],
    )[0]
    expect(cell.penalty).toBeCloseTo((2 / 100) * cell.remainingBalance, 6)
  })

  it('empty schedule is always penalty-free', () => {
    for (const cell of column(7.375, [])) expect(cell.penalty).toBe(0)
  })
})

describe('horizons at or beyond the loan term', () => {
  it('balance 0, penalty 0, cumInterest = total loan interest', () => {
    const termYears = 15
    const pay = monthlyPayment(L, 7.0, termYears)
    const cell = cellAt(column(7.0, [5, 5, 5], { termYears }), 20)
    expect(cell.remainingBalance).toBe(0)
    expect(cell.penalty).toBe(0)
    expect(Math.abs(cell.cumInterest - (pay * termYears * 12 - L))).toBeLessThanOrEqual(1)
  })
})

describe('comparability identity across differing terms', () => {
  it('scheduledPrincipalPaid + remainingBalance = L at every horizon (30-yr vs 40-yr)', () => {
    for (const termYears of [30, 40]) {
      const pay = monthlyPayment(L, 7.0, termYears)
      const cells = column(7.0, [], { termYears })
      for (const cell of cells) {
        const months = Math.min(cell.horizonYears * 12, termYears * 12)
        const principalPaid = pay * months - cell.cumInterest
        expect(principalPaid + cell.remainingBalance).toBeCloseTo(L, 4)
      }
    }
  })
})

describe('module constants', () => {
  it('horizons are the fixed list from the plan', () => {
    expect([...PAYOFF_HORIZONS_YEARS]).toEqual([3, 5, 7, 10, 15, 20])
  })
})

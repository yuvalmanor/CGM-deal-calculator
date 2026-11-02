// Tests for the Strategy picker (lib/strategy.ts) — the single source for a Deal's
// dashboard score, the Sheet's summary columns D/F and the card's strategy tag.

import { describe, it, expect } from 'vitest'
import { DEFAULT_DEAL, calcBRRRR, calcMAO, calcDealScore, type Deal } from '../lib/deal-model'
import { calcBuyHold, calcBuyHoldScore } from '../lib/buy-hold'
import { strategyOf, strategyKpis, strategyForSave, STRATEGY_TAG } from '../lib/strategy'

const BRRRR_DEAL: Deal = { ...DEFAULT_DEAL, strategy: 'brrrr' }
const BNH_DEAL: Deal = { ...DEFAULT_DEAL, strategy: 'buyHold' }

describe('strategyKpis', () => {
  it('returns BRRRR KPIs and score for a BRRRR Deal', () => {
    const brrrr = calcBRRRR(BRRRR_DEAL)
    expect(strategyKpis(BRRRR_DEAL)).toEqual({
      strategy: 'brrrr',
      cashflow: brrrr.cashflow,
      coc: brrrr.coc,
      dscr: brrrr.dscr,
      equityPct: brrrr.equityPct,
      equityDollar: brrrr.equityDollar,
      moneyInDeal: brrrr.moneyInDeal,
      score: calcDealScore(BRRRR_DEAL, brrrr, calcMAO(BRRRR_DEAL)).score,
    })
  })

  it('returns B&H KPIs, Cash In and the B&H score for a B&H Deal', () => {
    const bnh = calcBuyHold(BNH_DEAL)
    expect(strategyKpis(BNH_DEAL)).toEqual({
      strategy: 'buyHold',
      cashflow: bnh.cashflow,
      coc: bnh.coc,
      dscr: bnh.dscr,
      equityPct: bnh.equityPct,
      equityDollar: bnh.equityDollar,
      moneyInDeal: bnh.cashIn,
      score: calcBuyHoldScore(BNH_DEAL, bnh).score,
    })
  })

  it('tells the two lenses apart on the fixture (so the tests above mean something)', () => {
    expect(strategyKpis(BNH_DEAL).score).not.toBe(strategyKpis(BRRRR_DEAL).score)
    expect(strategyKpis(BNH_DEAL).moneyInDeal).not.toBe(strategyKpis(BRRRR_DEAL).moneyInDeal)
  })

  it('reads a Deal missing `strategy` as BRRRR', () => {
    const { strategy: _omit, ...legacy } = DEFAULT_DEAL
    expect(strategyKpis(legacy as Deal)).toEqual(strategyKpis(BRRRR_DEAL))
  })
})

describe('strategyOf', () => {
  it('reads buyHold as B&H and anything else as BRRRR', () => {
    expect(strategyOf({ strategy: 'buyHold' })).toBe('buyHold')
    expect(strategyOf({ strategy: 'brrrr' })).toBe('brrrr')
    expect(strategyOf({})).toBe('brrrr')
    expect(strategyOf({ strategy: 'flipCash' })).toBe('brrrr')
  })

  it('has a tag for every Strategy', () => {
    expect(STRATEGY_TAG).toEqual({ brrrr: 'BRRRR', buyHold: 'B&H' })
  })
})

describe('strategyForSave', () => {
  it('the BRRRR and B&H tabs set the Strategy', () => {
    expect(strategyForSave('brrrr', 'buyHold')).toBe('brrrr')
    expect(strategyForSave('buyHold', 'brrrr')).toBe('buyHold')
    expect(strategyForSave('brrrr', 'brrrr')).toBe('brrrr')
    expect(strategyForSave('buyHold', 'buyHold')).toBe('buyHold')
  })

  it('the Flip tabs keep the current Strategy', () => {
    expect(strategyForSave('flipCash', 'brrrr')).toBe('brrrr')
    expect(strategyForSave('flipCash', 'buyHold')).toBe('buyHold')
    expect(strategyForSave('flipHml', 'brrrr')).toBe('brrrr')
    expect(strategyForSave('flipHml', 'buyHold')).toBe('buyHold')
  })
})

// Strategy picker — the Deal's chosen lens (BRRRR or Buy & Hold) and its headline numbers.
//
// The single source for every place a Deal is judged by one number: the dashboard
// card score (the recomputed listing score), the Sheet's summary columns written on
// save (D = score, F = money in deal) and the card's strategy tag. Flip is never a
// Strategy — a Flip tab is only a peek, so saving from one keeps the current value.
//
// Pure: imports the engine's exported functions and the B&H module, nothing else.

import { calcBRRRR, calcDealScore, calcMAO, type Deal } from './deal-model'
import { calcBuyHold, calcBuyHoldScore } from './buy-hold'

export type Strategy = Deal['strategy']

/** The scenario panel's tab keys. Only `brrrr` and `buyHold` are Strategies. */
export type ScenarioTab = 'brrrr' | 'buyHold' | 'flipCash' | 'flipHml'

/** The short tag the dashboard card shows next to the score. */
export const STRATEGY_TAG: Record<Strategy, string> = { brrrr: 'BRRRR', buyHold: 'B&H' }

/**
 * The Deal's Strategy. Anything other than `'buyHold'` — including a missing field
 * on a row saved before Buy & Hold existed — reads as BRRRR.
 */
export function strategyOf(deal: Pick<Deal, 'strategy'> | { strategy?: unknown }): Strategy {
  return deal.strategy === 'buyHold' ? 'buyHold' : 'brrrr'
}

/** The headline KPIs and Deal Score of the Deal's Strategy. */
export interface StrategyKpis {
  strategy: Strategy
  cashflow: number
  coc: number
  dscr: number
  equityPct: number
  equityDollar: number
  /** BRRRR money in deal, or B&H Cash In — what the Sheet's column F holds. */
  moneyInDeal: number
  score: number
}

export function strategyKpis(deal: Deal): StrategyKpis {
  const strategy = strategyOf(deal)
  const mao = calcMAO(deal)
  if (strategy === 'buyHold') {
    const bnh = calcBuyHold(deal)
    return {
      strategy,
      cashflow: bnh.cashflow, coc: bnh.coc, dscr: bnh.dscr,
      equityPct: bnh.equityPct, equityDollar: bnh.equityDollar,
      moneyInDeal: bnh.cashIn,
      score: calcBuyHoldScore(deal, bnh, mao).score,
    }
  }
  const brrrr = calcBRRRR(deal)
  return {
    strategy,
    cashflow: brrrr.cashflow, coc: brrrr.coc, dscr: brrrr.dscr,
    equityPct: brrrr.equityPct, equityDollar: brrrr.equityDollar,
    moneyInDeal: brrrr.moneyInDeal,
    score: calcDealScore(deal, brrrr, mao).score,
  }
}

/**
 * The Strategy to save: the BRRRR and B&H tabs set it, a Flip tab keeps `current`.
 */
export function strategyForSave(tab: ScenarioTab, current: Strategy): Strategy {
  return tab === 'brrrr' || tab === 'buyHold' ? tab : current
}

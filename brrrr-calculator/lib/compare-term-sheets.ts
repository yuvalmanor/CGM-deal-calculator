// Comparison calculator for Term Sheets (lender comparison, ADR-0003).
//
// Pure function: deal + Term Sheets + role + comparison scenario → one row of
// decision-core KPIs per sheet, produced by running the frozen engine with
// each candidate's terms applied and the other role held at its selected
// sheet (which already lives in the deal's flat fields). The selected sheet
// of the compared role is the deal itself — its live terms ARE the flat
// fields, which may be ahead of the sheet's stored terms.
//
// HML compares under BRRRR or Flip HML; Refi compares under BRRRR or Buy &
// Hold (the Refi Lender also funds the B&H purchase loan). Callers never pass
// 'flipHml' for the refi role or 'buyHold' for the HML role.

import { calcBRRRR, calcFlipHML, calcMAO, calcDealScore, type Deal } from './deal-model'
import { calcBuyHold, calcBuyHoldScore } from './buy-hold'
import { applyTerms, type TermSheetState, type LenderRole } from './term-sheets'
import { payoffHorizonColumn, PAYOFF_HORIZONS_YEARS, type PayoffCell } from './payoff-horizon'

export type ComparisonScenario = 'brrrr' | 'flipHml' | 'buyHold'

export interface BrrrrKpis {
  scenario: 'brrrr'
  totalCashIn: number
  moneyInDeal: number
  cashflow: number   // monthly
  coc: number
  dscr: number
  score: number      // overall deal score (X.X / 10)
}

export interface FlipHmlKpis {
  scenario: 'flipHml'
  totalCashIn: number
  profit: number
  roi: number
}

export interface BuyHoldKpis {
  scenario: 'buyHold'
  cashIn: number
  cashflow: number   // monthly
  coc: number
  dscr: number
  score: number      // B&H deal score (X.X / 10)
}

export type ComparisonKpis = BrrrrKpis | FlipHmlKpis | BuyHoldKpis

export interface ComparisonRow {
  id: string
  name: string
  selected: boolean
  kpis: ComparisonKpis
}

function kpisFor(deal: Deal, scenario: ComparisonScenario): ComparisonKpis {
  if (scenario === 'flipHml') {
    const flip = calcFlipHML(deal)
    return { scenario: 'flipHml', totalCashIn: flip.cashIn, profit: flip.profit, roi: flip.roi }
  }
  if (scenario === 'buyHold') {
    const bnh = calcBuyHold(deal)
    return {
      scenario: 'buyHold',
      cashIn: bnh.cashIn,
      cashflow: bnh.cashflow,
      coc: bnh.coc,
      dscr: bnh.dscr,
      score: calcBuyHoldScore(deal, bnh).score,
    }
  }
  const brrrr = calcBRRRR(deal)
  const score = calcDealScore(deal, brrrr, calcMAO(deal))
  return {
    scenario: 'brrrr',
    totalCashIn: brrrr.totalCashIn,
    moneyInDeal: brrrr.moneyInDeal,
    cashflow: brrrr.cashflow,
    coc: brrrr.coc,
    dscr: brrrr.dscr,
    score: score.score,
  }
}

export function compareTermSheets(
  deal: Deal,
  state: TermSheetState,
  role: LenderRole,
  scenario: ComparisonScenario,
): ComparisonRow[] {
  const { sheets, selectedId } = state[role]
  const nameField = role === 'hml' ? 'hmlName' : 'refiName'
  return sheets.map((sheet) => {
    const selected = sheet.id === selectedId
    const candidate = selected ? deal : applyTerms(deal, sheet.terms)
    return {
      id: sheet.id,
      name: String(candidate[nameField] ?? ''),
      selected,
      kpis: kpisFor(candidate, scenario),
    }
  })
}

// ---- Payoff Horizon matrix (refi role only — HMLs are short-term, no PPP) ----

export interface PayoffColumn {
  id: string
  name: string
  selected: boolean
  pi: number          // monthly P&I for this candidate's loan
  loanAmount: number  // the refi loan, or the B&H loan under 'buyHold'
  cells: PayoffCell[] // one per PAYOFF_HORIZONS_YEARS entry, in order
}

/**
 * One matrix column per Refi Term Sheet, run per candidate (selected sheet =
 * the deal's live flat fields). The loan comes from the active scenario: under
 * BRRRR the frozen engine supplies the refi loan, its P&I and `upfrontCost`
 * from its own `totalRefiClosing`; under 'buyHold' the B&H module supplies the
 * B&H loan, its mortgage and its loan costs. The payoff module never re-derives
 * either. Rate, term and PPP schedule are the sheet's in both.
 */
export function comparePayoffHorizons(
  deal: Deal,
  state: TermSheetState,
  scenario: 'brrrr' | 'buyHold' = 'brrrr',
): PayoffColumn[] {
  const { sheets, selectedId } = state.refi
  return sheets.map((sheet) => {
    const selected = sheet.id === selectedId
    const candidate = selected ? deal : applyTerms(deal, sheet.terms)
    let loanAmount: number, pi: number, upfrontCost: number
    if (scenario === 'buyHold') {
      const bnh = calcBuyHold(candidate)
      loanAmount = bnh.loan; pi = bnh.mortgagePI; upfrontCost = bnh.loanCosts
    } else {
      const brrrr = calcBRRRR(candidate)
      loanAmount = brrrr.refiLoan; pi = brrrr.refiPI; upfrontCost = brrrr.refiTotalClosing
    }
    return {
      id: sheet.id,
      name: String(candidate.refiName ?? ''),
      selected,
      pi,
      loanAmount,
      cells: payoffHorizonColumn({
        loanAmount,
        annualRatePct: candidate.refiRate,
        termYears: candidate.refiTermYears,
        pppSchedule: candidate.refiPppSchedule ?? [],
        upfrontCost,
      }, PAYOFF_HORIZONS_YEARS),
    }
  })
}

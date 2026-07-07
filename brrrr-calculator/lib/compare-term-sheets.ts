// Comparison calculator for Term Sheets (lender comparison, ADR-0003).
//
// Pure function: deal + Term Sheets + role + comparison scenario → one row of
// decision-core KPIs per sheet, produced by running the frozen engine with
// each candidate's terms applied and the other role held at its selected
// sheet (which already lives in the deal's flat fields). The selected sheet
// of the compared role is the deal itself — its live terms ARE the flat
// fields, which may be ahead of the sheet's stored terms.
//
// HML compares under BRRRR or Flip HML; Refi compares under BRRRR only
// (callers pass 'brrrr' for the refi role — a refi only exists in BRRRR).

import { calcBRRRR, calcFlipHML, calcMAO, calcDealScore, type Deal } from './deal-model'
import { applyTerms, type TermSheetState, type LenderRole } from './term-sheets'
import { payoffHorizonColumn, PAYOFF_HORIZONS_YEARS, type PayoffCell } from './payoff-horizon'

export type ComparisonScenario = 'brrrr' | 'flipHml'

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

export type ComparisonKpis = BrrrrKpis | FlipHmlKpis

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
  pi: number          // the engine's monthly P&I for this candidate
  loanAmount: number  // the engine's refi loan for this candidate
  cells: PayoffCell[] // one per PAYOFF_HORIZONS_YEARS entry, in order
}

/**
 * One matrix column per Refi Term Sheet: the frozen engine runs per candidate
 * (selected sheet = the deal's live flat fields) and supplies `upfrontCost`
 * from its own `totalRefiClosing` — the payoff module never re-derives it.
 */
export function comparePayoffHorizons(deal: Deal, state: TermSheetState): PayoffColumn[] {
  const { sheets, selectedId } = state.refi
  return sheets.map((sheet) => {
    const selected = sheet.id === selectedId
    const candidate = selected ? deal : applyTerms(deal, sheet.terms)
    const brrrr = calcBRRRR(candidate)
    return {
      id: sheet.id,
      name: String(candidate.refiName ?? ''),
      selected,
      pi: brrrr.refiPI,
      loanAmount: brrrr.refiLoan,
      cells: payoffHorizonColumn({
        loanAmount: brrrr.refiLoan,
        annualRatePct: candidate.refiRate,
        termYears: candidate.refiTermYears,
        pppSchedule: candidate.refiPppSchedule ?? [],
        upfrontCost: brrrr.refiTotalClosing,
      }, PAYOFF_HORIZONS_YEARS),
    }
  })
}

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

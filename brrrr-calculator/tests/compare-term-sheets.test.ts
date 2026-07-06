// Tests for the comparison calculator (lib/compare-term-sheets.ts).
//
// The contract: one row per Term Sheet of the compared role, each row's KPIs
// equal to a direct engine call with that candidate's terms applied, the
// other role held at its selected sheet (the deal's flat fields), and the
// KPI set following the comparison scenario.

import { describe, it, expect } from 'vitest'
import { DEFAULT_DEAL, calcBRRRR, calcFlipHML, calcMAO, calcDealScore, type Deal } from '../lib/deal-model'
import {
  initialTermSheetState, addTermSheet, applyTerms, extractTerms,
  type TermSheetState,
} from '../lib/term-sheets'
import { compareTermSheets } from '../lib/compare-term-sheets'

const deal: Deal = { ...DEFAULT_DEAL, hmlName: 'Lender A', hmlRate: 11, hmlPoints: 2 }

// Two HML sheets: A (initial, stored) and B (selected — its live terms are the flat fields)
function twoSheetSetup(): { state: TermSheetState; dealB: Deal; idA: string; idB: string } {
  const s0 = initialTermSheetState(deal)
  const s1 = addTermSheet(s0, deal, 'hml')
  const dealB: Deal = { ...deal, hmlName: 'Lender B', hmlRate: 13, hmlPoints: 1 }
  return { state: s1, dealB, idA: s0.hml.selectedId, idB: s1.hml.selectedId }
}

describe('compareTermSheets — BRRRR', () => {
  it('produces one row per sheet whose KPIs match direct engine calls per candidate', () => {
    const { state, dealB, idA, idB } = twoSheetSetup()
    const rows = compareTermSheets(dealB, state, 'hml', 'brrrr')
    expect(rows).toHaveLength(2)

    // Row A: engine run with sheet A's stored terms applied onto the deal
    const candidateA = applyTerms(dealB, state.hml.sheets.find(s => s.id === idA)!.terms)
    const brrrrA = calcBRRRR(candidateA)
    const rowA = rows.find(r => r.id === idA)!
    expect(rowA.selected).toBe(false)
    expect(rowA.name).toBe('Lender A')
    expect(rowA.kpis).toEqual({
      scenario: 'brrrr',
      totalCashIn: brrrrA.totalCashIn,
      moneyInDeal: brrrrA.moneyInDeal,
      cashflow: brrrrA.cashflow,
      coc: brrrrA.coc,
      dscr: brrrrA.dscr,
      score: calcDealScore(candidateA, brrrrA, calcMAO(candidateA)).score,
    })

    // Row B (selected): engine run on the deal as-is — live flat fields
    const brrrrB = calcBRRRR(dealB)
    const rowB = rows.find(r => r.id === idB)!
    expect(rowB.selected).toBe(true)
    expect(rowB.name).toBe('Lender B')
    expect(rowB.kpis).toEqual({
      scenario: 'brrrr',
      totalCashIn: brrrrB.totalCashIn,
      moneyInDeal: brrrrB.moneyInDeal,
      cashflow: brrrrB.cashflow,
      coc: brrrrB.coc,
      dscr: brrrrB.dscr,
      score: calcDealScore(dealB, brrrrB, calcMAO(dealB)).score,
    })
  })

  it('uses the selected sheet\'s LIVE terms (the flat fields), even if its stored terms lag', () => {
    const s0 = initialTermSheetState(deal)
    const edited: Deal = { ...deal, hmlRate: 8.5 } // unsaved form edit, sheet not synced
    const rows = compareTermSheets(edited, s0, 'hml', 'brrrr')
    expect(rows[0].kpis).toMatchObject({ moneyInDeal: calcBRRRR(edited).moneyInDeal })
    expect(rows[0].kpis).not.toMatchObject({ moneyInDeal: calcBRRRR(deal).moneyInDeal })
  })

  it('holds the non-compared role at its selected sheet regardless of its alternates', () => {
    const { state, dealB, idA } = twoSheetSetup()
    // Add a refi alternate with wildly different terms; selection stays on the initial refi sheet
    const dealAltRefi: Deal = { ...dealB, refiRate: 12, refiLtv: 50 }
    const withRefiAlt: TermSheetState = {
      ...state,
      refi: {
        sheets: [...state.refi.sheets, { id: 'refi-alt', terms: extractTerms(dealAltRefi, 'refi') }],
        selectedId: state.refi.selectedId,
      },
    }
    const rows = compareTermSheets(dealB, withRefiAlt, 'hml', 'brrrr')
    // Every row must be computed with the deal's flat refi fields (the selected refi sheet)
    const candidateA = applyTerms(dealB, state.hml.sheets.find(s => s.id === idA)!.terms)
    expect(rows.find(r => r.id === idA)!.kpis).toMatchObject({
      moneyInDeal: calcBRRRR(candidateA).moneyInDeal,
      dscr: calcBRRRR(candidateA).dscr,
    })
    expect(rows).toEqual(compareTermSheets(dealB, state, 'hml', 'brrrr'))
  })
})

describe('compareTermSheets — scenario switch', () => {
  it('flipHml rows carry the Flip HML KPI set and match direct engine calls', () => {
    const { state, dealB, idA, idB } = twoSheetSetup()
    const rows = compareTermSheets(dealB, state, 'hml', 'flipHml')

    const candidateA = applyTerms(dealB, state.hml.sheets.find(s => s.id === idA)!.terms)
    const flipA = calcFlipHML(candidateA)
    expect(rows.find(r => r.id === idA)!.kpis).toEqual({
      scenario: 'flipHml', totalCashIn: flipA.cashIn, profit: flipA.profit, roi: flipA.roi,
    })

    const flipB = calcFlipHML(dealB)
    expect(rows.find(r => r.id === idB)!.kpis).toEqual({
      scenario: 'flipHml', totalCashIn: flipB.cashIn, profit: flipB.profit, roi: flipB.roi,
    })
  })

  it('the same setup yields different KPI sets per scenario', () => {
    const { state, dealB } = twoSheetSetup()
    const brrrrKpis = compareTermSheets(dealB, state, 'hml', 'brrrr')[0].kpis
    const flipKpis  = compareTermSheets(dealB, state, 'hml', 'flipHml')[0].kpis
    expect(brrrrKpis.scenario).toBe('brrrr')
    expect(flipKpis.scenario).toBe('flipHml')
    expect('dscr' in brrrrKpis).toBe(true)
    expect('dscr' in flipKpis).toBe(false)
    expect('profit' in flipKpis).toBe(true)
  })
})

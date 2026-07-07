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
import { compareTermSheets, comparePayoffHorizons } from '../lib/compare-term-sheets'
import { PAYOFF_HORIZONS_YEARS } from '../lib/payoff-horizon'

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

describe('compareTermSheets — refi role', () => {
  // Two refi sheets: A (initial, stored) and B (selected — live terms are the flat fields)
  function twoRefiSheetSetup(): { state: TermSheetState; dealB: Deal; idA: string; idB: string } {
    const base: Deal = { ...deal, refiName: 'Bank A', refiRate: 6.75 }
    const s0 = initialTermSheetState(base)
    const s1 = addTermSheet(s0, base, 'refi')
    const dealB: Deal = { ...base, refiName: 'Bank B', refiRate: 7.5, refiLtv: 70 }
    return { state: s1, dealB, idA: s0.refi.selectedId, idB: s1.refi.selectedId }
  }

  it('produces BRRRR rows per refi sheet matching direct engine calls per candidate', () => {
    const { state, dealB, idA, idB } = twoRefiSheetSetup()
    const rows = compareTermSheets(dealB, state, 'refi', 'brrrr')
    expect(rows).toHaveLength(2)

    const candidateA = applyTerms(dealB, state.refi.sheets.find(s => s.id === idA)!.terms)
    const brrrrA = calcBRRRR(candidateA)
    const rowA = rows.find(r => r.id === idA)!
    expect(rowA.selected).toBe(false)
    expect(rowA.name).toBe('Bank A')
    expect(rowA.kpis).toEqual({
      scenario: 'brrrr',
      totalCashIn: brrrrA.totalCashIn,
      moneyInDeal: brrrrA.moneyInDeal,
      cashflow: brrrrA.cashflow,
      coc: brrrrA.coc,
      dscr: brrrrA.dscr,
      score: calcDealScore(candidateA, brrrrA, calcMAO(candidateA)).score,
    })

    const brrrrB = calcBRRRR(dealB)
    const rowB = rows.find(r => r.id === idB)!
    expect(rowB.selected).toBe(true)
    expect(rowB.name).toBe('Bank B')
    expect(rowB.kpis).toMatchObject({
      scenario: 'brrrr',
      moneyInDeal: brrrrB.moneyInDeal,
      dscr: brrrrB.dscr,
    })
  })

  it('holds the HML role at its selected sheet (the flat fields) regardless of HML alternates', () => {
    const { state, dealB, idA } = twoRefiSheetSetup()
    const dealAltHml: Deal = { ...dealB, hmlRate: 15, hmlPoints: 4 }
    const withHmlAlt: TermSheetState = {
      ...state,
      hml: {
        sheets: [...state.hml.sheets, { id: 'hml-alt', terms: extractTerms(dealAltHml, 'hml') }],
        selectedId: state.hml.selectedId,
      },
    }
    const rows = compareTermSheets(dealB, withHmlAlt, 'refi', 'brrrr')
    const candidateA = applyTerms(dealB, state.refi.sheets.find(s => s.id === idA)!.terms)
    expect(rows.find(r => r.id === idA)!.kpis).toMatchObject({
      moneyInDeal: calcBRRRR(candidateA).moneyInDeal,
      dscr: calcBRRRR(candidateA).dscr,
    })
    expect(rows).toEqual(compareTermSheets(dealB, state, 'refi', 'brrrr'))
  })
})

describe('comparePayoffHorizons', () => {
  function twoRefiSheetSetup(): { state: TermSheetState; dealB: Deal; idA: string; idB: string } {
    const base: Deal = { ...deal, refiName: 'Bank A', refiRate: 6.75, refiPppSchedule: [5, 5, 5] }
    const s0 = initialTermSheetState(base)
    const s1 = addTermSheet(s0, base, 'refi')
    const dealB: Deal = { ...base, refiName: 'Bank B', refiRate: 7.5, refiBuydownPoints: 1, refiPppSchedule: [] }
    return { state: s1, dealB, idA: s0.refi.selectedId, idB: s1.refi.selectedId }
  }

  it('one column per refi sheet, cells totalling the ENGINE\'s closing costs + interest + penalty', () => {
    const { state, dealB, idA, idB } = twoRefiSheetSetup()
    const cols = comparePayoffHorizons(dealB, state)
    expect(cols.map((c) => c.id)).toEqual([idA, idB])

    // Column A: stored terms applied; column B (selected): the live flat fields
    const candidates: Record<string, Deal> = {
      [idA]: applyTerms(dealB, state.refi.sheets.find((s) => s.id === idA)!.terms),
      [idB]: dealB,
    }
    for (const col of cols) {
      const brrrr = calcBRRRR(candidates[col.id])
      expect(col.pi).toBe(brrrr.refiPI)
      expect(col.loanAmount).toBe(brrrr.refiLoan)
      expect(col.cells.map((c) => c.horizonYears)).toEqual([...PAYOFF_HORIZONS_YEARS])
      for (const cell of col.cells) {
        // upfrontCost is the engine's own totalRefiClosing (incl. buydown), never re-derived
        expect(cell.total).toBeCloseTo(brrrr.refiTotalClosing + cell.cumInterest + cell.penalty, 6)
      }
    }
    expect(cols.find((c) => c.id === idB)!.selected).toBe(true)
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

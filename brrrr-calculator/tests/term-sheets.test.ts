// Tests for the Term Sheet core (lib/term-sheets.ts).
//
// The contract (ADR-0003): the selected Term Sheet IS the flat `hml*`/`refi*`
// fields; swapping selection loses no terms; the settings-column blob
// round-trips; legacy `"v2"` / empty parse as "no Term Sheets"; a malformed
// blob is reported as unreadable with its raw string preserved exactly.

import { describe, it, expect } from 'vitest'
import { DEFAULT_DEAL, type Deal } from '../lib/deal-model'
import {
  extractTerms, applyTerms, initialTermSheetState, syncSelected,
  addTermSheet, selectTermSheet, deleteTermSheet,
  serializeSettings, parseSettings,
} from '../lib/term-sheets'

const deal: Deal = {
  ...DEFAULT_DEAL,
  hmlName: 'Lender A',
  hmlRate: 10.5,
  hmlPoints: 2.5,
  hmlExtraFees: [{ id: 'f1', label: 'Doc fee', amount: 250 }],
  refiName: 'Bank A',
  refiRate: 6.75,
}

describe('extractTerms / applyTerms', () => {
  it('round-trips a role\'s terms onto another deal without touching other fields', () => {
    const terms = extractTerms(deal, 'hml')
    const applied = applyTerms(DEFAULT_DEAL, terms)
    expect(applied.hmlName).toBe('Lender A')
    expect(applied.hmlRate).toBe(10.5)
    expect(applied.hmlExtraFees).toEqual(deal.hmlExtraFees)
    // non-HML fields untouched
    expect(applied.purchasePrice).toBe(DEFAULT_DEAL.purchasePrice)
    expect(applied.refiName).toBe(DEFAULT_DEAL.refiName)
  })

  it('extracts only the role\'s fields', () => {
    expect(Object.keys(extractTerms(deal, 'hml')).every(k => k.startsWith('hml'))).toBe(true)
    expect(Object.keys(extractTerms(deal, 'refi')).every(k => k.startsWith('refi'))).toBe(true)
  })

  it('never shares extra-fee arrays between a sheet and the deal', () => {
    const terms = extractTerms(deal, 'hml')
    ;(terms.hmlExtraFees!)[0].amount = 999
    expect(deal.hmlExtraFees[0].amount).toBe(250)

    const applied = applyTerms(DEFAULT_DEAL, extractTerms(deal, 'hml'))
    applied.hmlExtraFees[0].amount = 111
    expect(deal.hmlExtraFees[0].amount).toBe(250)
  })
})

describe('selection swap', () => {
  it('loses no terms across select → edit → select back', () => {
    // Start: one sheet per role, selected (sheet A mirrors the deal)
    const s0 = initialTermSheetState(deal)
    const idA = s0.hml.selectedId

    // Add sheet B (copy of A, becomes selected), then edit the live fields — edits belong to B
    const s1 = addTermSheet(s0, deal, 'hml')
    const idB = s1.hml.selectedId
    expect(idB).not.toBe(idA)
    const dealB: Deal = { ...deal, hmlName: 'Lender B', hmlRate: 12, hmlPoints: 1 }

    // Select A back: B's edited terms must be written into sheet B, A's terms applied
    const r1 = selectTermSheet(s1, dealB, 'hml', idA)
    expect(r1.deal.hmlName).toBe('Lender A')
    expect(r1.deal.hmlRate).toBe(10.5)
    const storedB = r1.state.hml.sheets.find(s => s.id === idB)!
    expect(storedB.terms.hmlName).toBe('Lender B')
    expect(storedB.terms.hmlRate).toBe(12)

    // Select B again: full round trip, nothing lost
    const r2 = selectTermSheet(r1.state, r1.deal, 'hml', idB)
    expect(r2.deal.hmlName).toBe('Lender B')
    expect(r2.deal.hmlRate).toBe(12)
    expect(r2.deal.hmlPoints).toBe(1)
    const storedA = r2.state.hml.sheets.find(s => s.id === idA)!
    expect(storedA.terms).toEqual(extractTerms(deal, 'hml'))
  })

  it('selecting the already-selected sheet or an unknown id is a no-op', () => {
    const s0 = initialTermSheetState(deal)
    expect(selectTermSheet(s0, deal, 'hml', s0.hml.selectedId)).toEqual({ state: s0, deal })
    expect(selectTermSheet(s0, deal, 'hml', 'nope')).toEqual({ state: s0, deal })
  })
})

describe('addTermSheet', () => {
  it('duplicates the selected sheet\'s live terms and selects the new sheet', () => {
    const s0 = initialTermSheetState(deal)
    const edited: Deal = { ...deal, hmlRate: 9.9 } // unsaved form edit on the selected sheet
    const s1 = addTermSheet(s0, edited, 'hml')
    expect(s1.hml.sheets).toHaveLength(2)
    const added = s1.hml.sheets.find(s => s.id === s1.hml.selectedId)!
    expect(added.terms).toEqual(extractTerms(edited, 'hml'))
    // the previously selected sheet was synced from the live fields first
    const prev = s1.hml.sheets.find(s => s.id === s0.hml.selectedId)!
    expect(prev.terms.hmlRate).toBe(9.9)
    // other role untouched
    expect(s1.refi).toEqual(s0.refi)
  })
})

describe('deleteTermSheet', () => {
  it('removes a non-selected sheet without touching the deal', () => {
    const s1 = addTermSheet(initialTermSheetState(deal), deal, 'hml')
    const nonSelected = s1.hml.sheets.find(s => s.id !== s1.hml.selectedId)!
    const r = deleteTermSheet(s1, deal, 'hml', nonSelected.id)
    expect(r.state.hml.sheets).toHaveLength(1)
    expect(r.deal).toBe(deal)
  })

  it('deleting the selected sheet selects the first remaining one and applies its terms', () => {
    const s0 = initialTermSheetState(deal)
    const idA = s0.hml.selectedId
    const s1 = addTermSheet(s0, deal, 'hml')
    const dealB: Deal = { ...deal, hmlName: 'Lender B' }
    const r = deleteTermSheet(s1, dealB, 'hml', s1.hml.selectedId)
    expect(r.state.hml.sheets).toHaveLength(1)
    expect(r.state.hml.selectedId).toBe(idA)
    expect(r.deal.hmlName).toBe('Lender A')
  })

  it('refuses to delete the last sheet of a role', () => {
    const s0 = initialTermSheetState(deal)
    const r = deleteTermSheet(s0, deal, 'hml', s0.hml.selectedId)
    expect(r.state).toBe(s0)
    expect(r.deal).toBe(deal)
  })
})

describe('settings blob codec', () => {
  it('round-trips serialize → parse', () => {
    const state = syncSelected(addTermSheet(initialTermSheetState(deal), deal, 'hml'), deal)
    const parsed = parseSettings(serializeSettings(state))
    expect(parsed).toEqual({ kind: 'sheets', state })
  })

  it('parses the legacy "v2" marker and empty cell as no Term Sheets', () => {
    expect(parseSettings('"v2"')).toEqual({ kind: 'none' })
    expect(parseSettings('')).toEqual({ kind: 'none' })
    expect(parseSettings('   ')).toEqual({ kind: 'none' })
    expect(parseSettings(null)).toEqual({ kind: 'none' })
    expect(parseSettings(undefined)).toEqual({ kind: 'none' })
  })

  it('reports a malformed blob as unreadable, preserving the raw string exactly', () => {
    const cases = ['not json {', '{"version":99,"termSheets":{}}', '[1,2,3]', '"v3"', '{"termSheets":null}']
    for (const raw of cases) {
      expect(parseSettings(raw)).toEqual({ kind: 'unreadable', raw })
    }
  })

  it('rejects a blob whose selectedId matches no sheet', () => {
    const state = initialTermSheetState(deal)
    const broken = { version: 1, termSheets: { ...state, hml: { ...state.hml, selectedId: 'ghost' } } }
    const raw = JSON.stringify(broken)
    expect(parseSettings(raw)).toEqual({ kind: 'unreadable', raw })
  })
})

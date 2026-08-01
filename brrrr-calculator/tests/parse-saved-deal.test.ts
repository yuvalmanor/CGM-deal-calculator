// Tests for the saved-deal load path (lib/parse-saved-deal.ts).
//
// The contract: a saved row's actual data is never silently replaced, and a
// field the row doesn't carry loads blank — never another property's number.
// Unrecognized shapes (legacy V1 rows, corrupt JSON values) return null so the
// page can fail loudly; recognized rows keep every saved field, with BLANK_DEAL
// filling the rest (blanks for deal facts, kept cross-deal settings).

import { describe, it, expect } from 'vitest'
import { DEFAULT_DEAL, type Deal } from '../lib/deal-model'
import { BLANK_DEAL } from '../lib/blank-deal'
import { parseSavedDeal } from '../lib/parse-saved-deal'

const savedDeal: Deal = {
  ...DEFAULT_DEAL,
  address: '6427 Miranda Dr, Fort Worth, TX 76131',
  purchasePrice: 199000,
  arv: 285000,
  monthlyRent: 2100,
  hmlLevPP: 75,
  refiLtv: 70,
  additionalMonthly: [],
}

describe('parseSavedDeal', () => {
  it('returns a complete saved deal unchanged — no default substitution', () => {
    expect(parseSavedDeal(JSON.parse(JSON.stringify(savedDeal)))).toEqual(savedDeal)
  })

  it('rejects non-object values', () => {
    expect(parseSavedDeal(null)).toBeNull()
    expect(parseSavedDeal(undefined)).toBeNull()
    expect(parseSavedDeal('v2')).toBeNull()
    expect(parseSavedDeal(42)).toBeNull()
    expect(parseSavedDeal([savedDeal])).toBeNull()
  })

  it('rejects a legacy V1-shaped row instead of rendering it as defaults', () => {
    // Representative retired-V1 keys — no hmlLevPP/refiLtv; lender terms lived on a separate settings object
    const v1Row = {
      address: '123 Legacy Ln',
      purchasePrice: 150000,
      arv: 220000,
      monthlyRent: 1800,
      hmlCustomFees: [],
      hmlLoanPP: 105000,
    }
    expect(parseSavedDeal(v1Row)).toBeNull()
  })

  it('rejects an object missing any Deal marker key', () => {
    const { hmlLevPP: _dropped, ...partial } = savedDeal
    expect(parseSavedDeal(partial)).toBeNull()
  })

  it('fills a threshold added to the model after the row was saved', () => {
    const { minDscr: _dropped, ...olderRow } = savedDeal
    const parsed = parseSavedDeal(olderRow)
    expect(parsed).not.toBeNull()
    expect(parsed!.minDscr).toBe(BLANK_DEAL.minDscr) // buy-box policy, kept
    expect(parsed!.address).toBe(savedDeal.address)  // saved data still wins
  })

  it('leaves a deal fact blank when the row omits it — no worked-example numbers', () => {
    const { rehabEstimate: _dropped, ...olderRow } = savedDeal
    const parsed = parseSavedDeal(olderRow)
    expect(parsed!.rehabEstimate).toBe(0)
    expect(parsed!.rehabEstimate).not.toBe(DEFAULT_DEAL.rehabEstimate)
  })

  it('loads a partial triage row blank apart from cross-deal settings', () => {
    // A real dd- row: 7 keys, the 5 markers plus address and yearBuilt.
    const triageRow = {
      address: '7134 Kings Dr', arv: 0, hmlLevPP: 69.565,
      monthlyRent: 0, purchasePrice: 125000, refiLtv: 65.0, yearBuilt: 1974,
    }
    const parsed = parseSavedDeal(triageRow)
    expect(parsed).not.toBeNull()

    // What triage wrote survives
    expect(parsed!.purchasePrice).toBe(125000)
    expect(parsed!.yearBuilt).toBe(1974)

    // What it didn't write is blank, not the Anna TX example
    expect(parsed!.rehabEstimate).toBe(0)
    expect(parsed!.taxes).toBe(0)
    expect(parsed!.insurance).toBe(0)
    expect(parsed!.sellerAgent).toBe('')
    expect(parsed!.oneTimeCosts).toEqual([])
    expect(parsed!.additionalMonthly).toEqual([])

    // Cross-deal settings still fill in: lender terms, thresholds, exit settings
    expect(parsed!.refiRate).toBe(DEFAULT_DEAL.refiRate)
    expect(parsed!.hmlName).toBe(DEFAULT_DEAL.hmlName)
    expect(parsed!.minCoC).toBe(DEFAULT_DEAL.minCoC)
    expect(parsed!.sellingCostsPct).toBe(DEFAULT_DEAL.sellingCostsPct)
  })

  it('migrates otherAdjustmentsAtClose → projectCostAdjustments only when the new name is absent', () => {
    const { projectCostAdjustments: _dropped, ...renamedAway } = savedDeal
    const oldName = { ...renamedAway, otherAdjustmentsAtClose: 1234 }
    expect(parseSavedDeal(oldName)!.projectCostAdjustments).toBe(1234)

    const bothNames = { ...savedDeal, projectCostAdjustments: 500, otherAdjustmentsAtClose: 1234 }
    expect(parseSavedDeal(bothNames)!.projectCostAdjustments).toBe(500)
  })
})

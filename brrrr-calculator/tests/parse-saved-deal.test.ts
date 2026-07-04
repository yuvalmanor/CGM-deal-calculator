// Tests for the saved-deal load path (lib/parse-saved-deal.ts).
//
// The contract: a saved row's actual data is never silently replaced by
// DEFAULT_DEAL. Unrecognized shapes (legacy V1 rows, corrupt JSON values)
// return null so the page can fail loudly; recognized V2 rows keep every
// saved field, with defaults filling only fields added to the model later.

import { describe, it, expect } from 'vitest'
import { DEFAULT_DEAL, type Deal } from '../lib/deal-model'
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
  it('returns a complete V2 deal unchanged — no default substitution', () => {
    expect(parseSavedDeal(JSON.parse(JSON.stringify(savedDeal)))).toEqual(savedDeal)
  })

  it('rejects non-object values', () => {
    expect(parseSavedDeal(null)).toBeNull()
    expect(parseSavedDeal(undefined)).toBeNull()
    expect(parseSavedDeal('v2')).toBeNull()
    expect(parseSavedDeal(42)).toBeNull()
    expect(parseSavedDeal([savedDeal])).toBeNull()
  })

  it('rejects a legacy V1 DealInputs shape instead of rendering it as defaults', () => {
    // Representative V1 keys — no hmlLevPP/refiLtv, lender terms lived in LenderSettings
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

  it('rejects an object missing any V2 marker key', () => {
    const { hmlLevPP: _dropped, ...partial } = savedDeal
    expect(parseSavedDeal(partial)).toBeNull()
  })

  it('fills fields added to the model after the row was saved from DEFAULT_DEAL', () => {
    const { minDscr: _dropped, ...olderRow } = savedDeal
    const parsed = parseSavedDeal(olderRow)
    expect(parsed).not.toBeNull()
    expect(parsed!.minDscr).toBe(DEFAULT_DEAL.minDscr)
    expect(parsed!.address).toBe(savedDeal.address) // saved data still wins
  })

  it('migrates otherAdjustmentsAtClose → projectCostAdjustments only when the new name is absent', () => {
    const { projectCostAdjustments: _dropped, ...renamedAway } = savedDeal
    const oldName = { ...renamedAway, otherAdjustmentsAtClose: 1234 }
    expect(parseSavedDeal(oldName)!.projectCostAdjustments).toBe(1234)

    const bothNames = { ...savedDeal, projectCostAdjustments: 500, otherAdjustmentsAtClose: 1234 }
    expect(parseSavedDeal(bothNames)!.projectCostAdjustments).toBe(500)
  })
})

// Tests for BLANK_DEAL (lib/blank-deal.ts) — the starting point for a deal
// nobody has filled in, and the backfill base for partially-saved rows.
//
// The contract: property facts and deal numbers are blank; cross-deal settings
// (lender terms, buy-box thresholds, exit settings, mode/unit enums) carry the
// DEFAULT_DEAL values. DEFAULT_DEAL itself stays untouched — it is the Anna TX
// worked example and a golden-test fixture.

import { describe, it, expect } from 'vitest'
import { DEFAULT_DEAL, type Deal } from '../lib/deal-model'
import { BLANK_DEAL } from '../lib/blank-deal'
import { HML_TERM_FIELDS, REFI_TERM_FIELDS } from '../lib/term-sheets'

describe('BLANK_DEAL', () => {
  it('keeps every lender term from DEFAULT_DEAL', () => {
    for (const field of [...HML_TERM_FIELDS, ...REFI_TERM_FIELDS]) {
      expect(BLANK_DEAL[field], `${field} should carry the default lender term`)
        .toEqual(DEFAULT_DEAL[field])
    }
  })

  it('keeps buy-box thresholds and exit settings', () => {
    const kept: (keyof Deal)[] = [
      'minCashflow', 'minCoC', 'minDscr', 'minEquityPct', 'maxMoneyInDeal',
      'sellingCostsPct', 'holdMonthsForFlip',
    ]
    for (const field of kept) {
      expect(BLANK_DEAL[field], `${field} should be kept`).toBe(DEFAULT_DEAL[field])
    }
  })

  it('keeps the mode and unit toggles — enums have no blank state', () => {
    const modes: (keyof Deal)[] = [
      'changeOrdersMode', 'capexVacancyMode', 'mgmtMode',
      'taxesUnit', 'insuranceUnit', 'hoaUnit', 'stateIncTaxUnit',
    ]
    for (const field of modes) {
      expect(BLANK_DEAL[field], `${field} should be kept`).toBe(DEFAULT_DEAL[field])
    }
  })

  it('blanks every property fact and deal number', () => {
    expect(BLANK_DEAL.address).toBe('')
    expect(BLANK_DEAL.sellerAgent).toBe('')
    expect(BLANK_DEAL.propertyType).toBe('')
    expect(BLANK_DEAL.sqft).toBe(0)
    expect(BLANK_DEAL.yearBuilt).toBe(0)
    expect(BLANK_DEAL.schoolGrade).toBe(0)
    expect(BLANK_DEAL.purchasePrice).toBe(0)
    expect(BLANK_DEAL.arv).toBe(0)
    expect(BLANK_DEAL.monthlyRent).toBe(0)
    expect(BLANK_DEAL.closingCostsBuy).toBe(0)
    expect(BLANK_DEAL.rehabEstimate).toBe(0)
    expect(BLANK_DEAL.changeOrdersPct).toBe(0)
    expect(BLANK_DEAL.changeOrdersFixed).toBe(0)
    expect(BLANK_DEAL.rehabMonths).toBe(0)
    expect(BLANK_DEAL.taxes).toBe(0)
    expect(BLANK_DEAL.insurance).toBe(0)
    expect(BLANK_DEAL.hoa).toBe(0)
    expect(BLANK_DEAL.stateIncTax).toBe(0)
    expect(BLANK_DEAL.capexVacancyPct).toBe(0)
    expect(BLANK_DEAL.capexVacancyFixed).toBe(0)
    expect(BLANK_DEAL.mgmtPct).toBe(0)
    expect(BLANK_DEAL.mgmtFixed).toBe(0)
    expect(BLANK_DEAL.projectCostAdjustments).toBe(0)
  })

  it('starts every line-item list empty', () => {
    expect(BLANK_DEAL.rehabAdditionalCosts).toEqual([])
    expect(BLANK_DEAL.additionalMonthly).toEqual([])
    expect(BLANK_DEAL.oneTimeCosts).toEqual([])
    expect(BLANK_DEAL.hmlExtraFees).toEqual([])
    expect(BLANK_DEAL.refiExtraFees).toEqual([])
  })

  it('does not share array references with DEFAULT_DEAL', () => {
    expect(BLANK_DEAL.refiPppSchedule).not.toBe(DEFAULT_DEAL.refiPppSchedule)
    expect(BLANK_DEAL.hmlExtraFees).not.toBe(DEFAULT_DEAL.hmlExtraFees)
    expect(BLANK_DEAL.refiExtraFees).not.toBe(DEFAULT_DEAL.refiExtraFees)
  })

  it('leaves DEFAULT_DEAL as the fully worked Anna TX example', () => {
    expect(DEFAULT_DEAL.address).toBe('1805 Cedar Wood, Anna TX, 75409')
    expect(DEFAULT_DEAL.purchasePrice).toBe(230000)
    expect(DEFAULT_DEAL.rehabEstimate).toBe(14080)
  })
})

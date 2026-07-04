// Golden-value tests for the live calculator engine (lib/deal-model.ts).
//
// These tests freeze the numeric output of the five calc functions. Any change
// to a formula — accidental or deliberate — fails this suite. The golden files
// in tests/golden/ are the reviewed, approved definition of "correct".
//
// To deliberately re-capture goldens after an approved formula change:
//   UPDATE_GOLDEN=1 npm test   (then review the diff and get it approved)

import { describe, it, expect } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_DEAL,
  calcBRRRR,
  calcFlipCash,
  calcFlipHML,
  calcMAO,
  calcDealScore,
  type Deal,
} from '../lib/deal-model'

const GOLDEN_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'golden')

// Round every number to 6 decimals so goldens are stable across JS engines
// (Math.pow etc. are implementation-approximated); a real formula change moves
// values by far more than 1e-6.
function normalize(value: unknown): unknown {
  if (typeof value === 'number') {
    expect(Number.isFinite(value), 'golden values must be finite numbers').toBe(true)
    return Math.round(value * 1e6) / 1e6
  }
  if (Array.isArray(value)) return value.map(normalize)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, normalize(v)]),
    )
  }
  return value
}

function checkGolden(name: string, actual: unknown): void {
  const file = path.join(GOLDEN_DIR, `${name}.json`)
  const normalized = normalize(actual)
  if (process.env.UPDATE_GOLDEN === '1') {
    fs.mkdirSync(GOLDEN_DIR, { recursive: true })
    fs.writeFileSync(file, JSON.stringify(normalized, null, 2) + '\n')
  }
  if (!fs.existsSync(file)) {
    throw new Error(`Golden file missing: ${file}. Run UPDATE_GOLDEN=1 npm test to capture, then review.`)
  }
  expect(normalized).toEqual(JSON.parse(fs.readFileSync(file, 'utf8')))
}

// Hand-built fixture exercising the branches DEFAULT_DEAL does not:
// yr expense units, pctOfRehab change orders, fixed capex/vacancy, pct mgmt,
// funded + not-funded additional rehab costs, extra fees on both lenders,
// explicit refiTitleEscrow, rehab leverage > 0, rehabMonths > seasoning,
// non-zero projectCostAdjustments.
const BRANCH_DEAL: Deal = {
  address: '742 Evergreen Terrace, Springfield TX',
  sellerAgent: 'MLS',
  propertyType: 'SFR',
  sqft: 1850,
  yearBuilt: 1998,
  schoolGrade: 12,

  purchasePrice: 180000,
  arv: 265000,
  monthlyRent: 2150,
  closingCostsBuy: 3800,

  rehabEstimate: 30000,
  changeOrdersMode: 'pctOfRehab',
  changeOrdersPct: 10,
  changeOrdersFixed: 0,
  rehabMonths: 4,
  rehabAdditionalCosts: [
    { id: 'rac1', label: 'Foundation repair', amount: 5000, funded: true },
    { id: 'rac2', label: 'Landscaping', amount: 2500, funded: false },
  ],

  taxes: 5640, taxesUnit: 'yr',
  insurance: 1716, insuranceUnit: 'yr',
  hoa: 384, hoaUnit: 'yr',
  stateIncTax: 600, stateIncTaxUnit: 'yr',
  capexVacancyMode: 'fixed',
  capexVacancyPct: 15,
  capexVacancyFixed: 280,
  mgmtMode: 'pct',
  mgmtPct: 8,
  mgmtFixed: 0,
  additionalMonthly: [
    { id: 'am1', label: 'Pest control', amount: 420, unit: 'yr' },
    { id: 'am2', label: 'Lawn service', amount: 45, unit: 'mo' },
  ],

  hmlName: 'Test HML',
  hmlLevPP: 80,
  hmlLevRehab: 100,
  hmlRate: 12.0,
  hmlPoints: 2.5,
  hmlLenderFees: 995,
  hmlPostClosingMisc: 350,
  hmlExtraFees: [
    { id: 'hef1', label: 'Draw fees', amount: 800 },
  ],

  refiName: 'Test Bank',
  refiRate: 6.5,
  refiPoints: 1.0,
  refiTermYears: 30,
  refiAppraisal: 650,
  refiUnderwriting: 995,
  refiOtherMisc: 400,
  refiSeasoningMonths: 3,
  refiLtv: 70,
  refiTitleEscrow: 3200,
  refiExtraFees: [
    { id: 'ref1', label: 'Rate lock', amount: 350 },
  ],

  oneTimeCosts: [
    { id: 'otc1', label: 'Inspection', amount: 500 },
  ],

  sellingCostsPct: 8,
  holdMonthsForFlip: 5,
  maxMoneyInDeal: 65000,
  projectCostAdjustments: 1500,

  minCashflow: 200,
  minCoC: 8,
  minDscr: 1.25,
  minEquityPct: 20,
}

const FIXTURES: Array<{ name: string; deal: Deal }> = [
  { name: 'default-deal', deal: DEFAULT_DEAL },
  { name: 'branch-deal', deal: BRANCH_DEAL },
]

describe.each(FIXTURES)('golden: $name', ({ name, deal }) => {
  it('calcBRRRR', () => {
    checkGolden(`${name}.brrrr`, calcBRRRR(deal))
  })

  it('calcFlipCash', () => {
    checkGolden(`${name}.flip-cash`, calcFlipCash(deal))
  })

  it('calcFlipHML', () => {
    checkGolden(`${name}.flip-hml`, calcFlipHML(deal))
  })

  it('calcMAO', () => {
    checkGolden(`${name}.mao`, calcMAO(deal))
  })

  it('calcDealScore', () => {
    checkGolden(`${name}.score`, calcDealScore(deal, calcBRRRR(deal), calcMAO(deal)))
  })
})

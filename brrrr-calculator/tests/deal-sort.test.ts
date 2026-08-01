import { describe, it, expect } from 'vitest'
import { DEFAULT_SORT, SORT_OPTIONS, sortDeals, type SortKey } from '../lib/deal-sort'

function deal(
  address: string,
  savedAt: string,
  purchasePrice: number,
  yearBuilt: number,
) {
  return { address, savedAt, purchasePrice, yearBuilt }
}

const DEALS = [
  deal('B St', '2026-03-10T00:00:00.000Z', 174000, 1963),
  deal('A St', '2026-01-05T00:00:00.000Z', 125000, 1974),
  deal('C St', '2026-07-15T00:00:00.000Z', 230000, 2013),
]

function order(key: SortKey, deals = DEALS) {
  return sortDeals(deals, key).map(d => d.address)
}

describe('sortDeals', () => {
  it('sorts by save date, newest and oldest first', () => {
    expect(order('savedAt-desc')).toEqual(['C St', 'B St', 'A St'])
    expect(order('savedAt-asc')).toEqual(['A St', 'B St', 'C St'])
  })

  it('sorts by purchase price', () => {
    expect(order('price-desc')).toEqual(['C St', 'B St', 'A St'])
    expect(order('price-asc')).toEqual(['A St', 'B St', 'C St'])
  })

  it('sorts by year built', () => {
    expect(order('year-desc')).toEqual(['C St', 'A St', 'B St'])
    expect(order('year-asc')).toEqual(['B St', 'A St', 'C St'])
  })

  it('leaves the input array untouched', () => {
    const input = [...DEALS]
    sortDeals(input, 'price-asc')
    expect(input.map(d => d.address)).toEqual(['B St', 'A St', 'C St'])
  })

  it('sinks unknown values to the bottom in BOTH directions', () => {
    // 0 means "never captured", not "cheapest" / "built in year 0" — a triage
    // row with no price must not head the price-ascending list.
    const withGaps = [...DEALS, deal('Z St', '2026-02-01T00:00:00.000Z', 0, 0)]
    expect(order('price-asc', withGaps).at(-1)).toBe('Z St')
    expect(order('price-desc', withGaps).at(-1)).toBe('Z St')
    expect(order('year-asc', withGaps).at(-1)).toBe('Z St')
    expect(order('year-desc', withGaps).at(-1)).toBe('Z St')
  })

  it('treats a blank or unparseable savedAt as unknown, not as the epoch', () => {
    const withGaps = [...DEALS, deal('Y St', '', 100000, 1990), deal('X St', 'not a date', 100000, 1990)]
    expect(order('savedAt-asc', withGaps).slice(-2)).toEqual(['X St', 'Y St'])
    expect(order('savedAt-desc', withGaps).slice(-2)).toEqual(['X St', 'Y St'])
  })

  it('breaks ties by address so the order never depends on sheet row order', () => {
    const sameYear = [
      deal('Cedar', '2026-01-01T00:00:00.000Z', 100000, 1974),
      deal('Ash', '2026-01-02T00:00:00.000Z', 200000, 1974),
      deal('Birch', '2026-01-03T00:00:00.000Z', 300000, 1974),
    ]
    expect(order('year-desc', sameYear)).toEqual(['Ash', 'Birch', 'Cedar'])
    expect(order('year-asc', sameYear)).toEqual(['Ash', 'Birch', 'Cedar'])
  })

  it('handles empty and single-deal lists', () => {
    expect(sortDeals([], 'price-desc')).toEqual([])
    expect(order('price-desc', [DEALS[0]])).toEqual(['B St'])
  })

  it('offers every sort key exactly once, including the default', () => {
    const values = SORT_OPTIONS.map(o => o.value)
    expect(new Set(values).size).toBe(values.length)
    expect(values).toContain(DEFAULT_SORT)
  })
})

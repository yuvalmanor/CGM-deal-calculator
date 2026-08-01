// Sort order for the deal lists (dashboard + Deal Desk), kept pure so the
// comparator can be tested without the Sheets client or a React tree.

export type SortKey =
  | 'savedAt-desc'
  | 'savedAt-asc'
  | 'price-desc'
  | 'price-asc'
  | 'year-desc'
  | 'year-asc'

/** Most recently saved first — the order the lists open in. */
export const DEFAULT_SORT: SortKey = 'savedAt-desc'

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'savedAt-desc', label: 'Newest saved' },
  { value: 'savedAt-asc',  label: 'Oldest saved' },
  { value: 'price-desc',   label: 'Price: high → low' },
  { value: 'price-asc',    label: 'Price: low → high' },
  { value: 'year-desc',    label: 'Year built: newest → oldest' },
  { value: 'year-asc',     label: 'Year built: oldest → newest' },
]

/** The fields a deal list sorts on — a structural subset of DealSummary. */
export interface SortableDeal {
  address: string
  savedAt: string
  purchasePrice: number
  yearBuilt: number
}

/**
 * The value a key sorts on, or NaN for "unknown".
 *
 * A triage row can carry no price or year built (0 in the template), and a row
 * written by hand can carry an unparseable savedAt. Those are missing data, not
 * a price of zero or a house built in year 0, so they get NaN and sink to the
 * bottom rather than colonising one end of the range.
 */
function sortValue(deal: SortableDeal, key: SortKey): number {
  switch (key) {
    case 'savedAt-desc':
    case 'savedAt-asc':
      return Date.parse(deal.savedAt) // NaN when blank or unparseable
    case 'price-desc':
    case 'price-asc':
      return deal.purchasePrice > 0 ? deal.purchasePrice : NaN
    case 'year-desc':
    case 'year-asc':
      return deal.yearBuilt > 0 ? deal.yearBuilt : NaN
  }
}

function byAddress(a: SortableDeal, b: SortableDeal): number {
  return a.address.localeCompare(b.address)
}

/**
 * Sort a deal list by `key`, returning a new array (the input is left alone —
 * callers hold it as React state).
 *
 * Ties and unknowns fall back to address A→Z so the order is deterministic
 * whatever the sheet's row order happens to be.
 */
export function sortDeals<T extends SortableDeal>(deals: T[], key: SortKey): T[] {
  const descending = key.endsWith('-desc')
  return [...deals].sort((a, b) => {
    const va = sortValue(a, key)
    const vb = sortValue(b, key)
    const aUnknown = Number.isNaN(va)
    const bUnknown = Number.isNaN(vb)
    if (aUnknown || bUnknown) {
      if (aUnknown && bUnknown) return byAddress(a, b)
      return aUnknown ? 1 : -1 // unknowns last, in both directions
    }
    if (va !== vb) return descending ? vb - va : va - vb
    return byAddress(a, b)
  })
}

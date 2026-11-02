// Row-number arithmetic for the DEALS_APP tab, kept pure so it can be tested
// without the Sheets client.

import { parseSavedDeal } from './parse-saved-deal'
import { strategyKpis, strategyOf, type Strategy } from './strategy'

/**
 * Map deal ids to the 1-based sheet row numbers holding them, sorted DESCENDING.
 *
 * `idColumn` is the raw `DEALS_APP!A:A` values array — row 0 is the header.
 *
 * Descending order is the whole point: each deleteDimension request shifts every
 * row below it up by one, so a multi-row delete has to remove the bottom-most row
 * first or it starts deleting the wrong deals. Ids that are not in the sheet are
 * dropped (nothing to delete) and duplicate ids collapse to a single row.
 */
export function rowsToDelete(idColumn: string[][], ids: string[]): number[] {
  const wanted = new Set(ids)
  const rows = new Set<number>()
  idColumn.forEach((row, i) => {
    if (i === 0) return // header
    const id = String(row?.[0] ?? '')
    if (id && wanted.has(id)) rows.add(i + 1) // 0-based index → 1-based row number
  })
  return Array.from(rows).sort((a, b) => b - a)
}

/** Ids from `ids` that have no row in the sheet. */
export function missingIds(idColumn: string[][], ids: string[]): string[] {
  const present = new Set(idColumn.slice(1).map(row => String(row?.[0] ?? '')))
  return ids.filter(id => !present.has(id))
}

/** The deal's own numbers the deal lists sort on and the cards show, lifted out of a row's inputsJson. */
export interface ListingFacts {
  purchasePrice: number
  arv: number
  sqft: number
  yearBuilt: number
}

const NO_FACTS: ListingFacts = { purchasePrice: 0, arv: 0, sqft: 0, yearBuilt: 0 }

function finiteNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

/**
 * Read the deal's own numbers out of a row's `inputsJson` (column H).
 *
 * The blob is the saved deal itself, so it is the source of truth for every
 * figure that is an *input* — edit one in the calculator, save, and the card
 * reads the new value here. Only purchase price, sqft and year built have no
 * summary column at all; `arv` is also read here rather than from column E so
 * the card can never show an ARV the deal no longer holds.
 *
 * The parse is deliberately forgiving: a triage row can hold a partial Deal, and
 * one malformed blob must never take the whole list down (same principle as the
 * Term Sheet codec, ADR-0003). Missing or non-numeric values read as 0 —
 * "unknown", which sortDeals() sinks to the end and the card renders as a dash.
 */
export function listingFacts(inputsJson: string): ListingFacts {
  try {
    const parsed: unknown = JSON.parse(inputsJson)
    if (typeof parsed !== 'object' || parsed === null) return NO_FACTS
    const deal = parsed as Record<string, unknown>
    return {
      purchasePrice: finiteNumber(deal.purchasePrice),
      arv:           finiteNumber(deal.arv),
      sqft:          finiteNumber(deal.sqft),
      yearBuilt:     finiteNumber(deal.yearBuilt),
    }
  } catch {
    return NO_FACTS
  }
}

/**
 * The Strategy a row's `inputsJson` was saved under. A blob that is missing the
 * field — every row saved before Buy & Hold — or that cannot be read at all
 * reads as BRRRR, the same forgiving posture as listingFacts().
 */
export function listingStrategy(inputsJson: string): Strategy {
  try {
    const parsed: unknown = JSON.parse(inputsJson)
    if (typeof parsed !== 'object' || parsed === null) return 'brrrr'
    return strategyOf(parsed as { strategy?: unknown })
  } catch {
    return 'brrrr'
  }
}

/**
 * The deal score recomputed from a row's `inputsJson`, under the Deal's own
 * Strategy (the B&H score for a B&H Deal), or `null` when the blob is not a
 * recognizable Deal.
 *
 * Column D holds the score as it stood when the row was last saved, so it goes
 * stale the moment the engine's scoring changes — every row saved before a
 * change keeps showing the old number until someone re-saves it. Recomputing
 * from the blob keeps the dashboard agreeing with the calculator without
 * rewriting the sheet, for the same reason `arv` is read from column H rather
 * than its summary column E.
 *
 * `null` means "could not recompute" (unreadable blob, or a partial triage row
 * that is not a full Deal), and the caller falls back to column D. It never
 * means "scores 0" — a row with no score at all is what `analyzed` is for.
 */
export function listingScore(inputsJson: string): number | null {
  try {
    const deal = parseSavedDeal(JSON.parse(inputsJson))
    if (!deal) return null
    return strategyKpis(deal).score
  } catch {
    return null
  }
}

// Row-number arithmetic for the DEALS_APP tab, kept pure so it can be tested
// without the Sheets client.

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

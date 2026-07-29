// Where a DEALS_APP row came from.
//
// The calculator's own saves mint an id with crypto.randomUUID() (lib/sheets.ts).
// The CGM-DealDesk triage tool writes its rows straight into the DEALS_APP tab
// with its own `dd-<hex>-<n>` id scheme, so the id prefix is the source marker —
// no extra column, and nothing to backfill on the 24 rows already in the sheet.
//
// The marker is deliberately permanent: updateDeal() keeps the row's id, so a
// triage deal stays in the Deal Desk folder however much it is edited. The folder
// answers "where did this come from", not "have I dealt with it yet".

export const DEAL_DESK_ID_PREFIX = 'dd-'

export function isDealDeskDeal(id: string): boolean {
  return id.startsWith(DEAL_DESK_ID_PREFIX)
}

/** Split a deal list into the user's own deals and the Deal Desk (triage) deals. */
export function splitBySource<T extends { id: string }>(deals: T[]): { own: T[]; dealDesk: T[] } {
  const own: T[] = []
  const dealDesk: T[] = []
  for (const deal of deals) {
    ;(isDealDeskDeal(deal.id) ? dealDesk : own).push(deal)
  }
  return { own, dealDesk }
}

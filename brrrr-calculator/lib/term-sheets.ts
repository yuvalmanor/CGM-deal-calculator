// Term Sheet core — pure module for the Lender Comparison feature (ADR-0003).
//
// A Term Sheet is one candidate set of lender terms for one role (HML or Refi)
// on one Deal. Exactly one sheet per role is selected, and the selected sheet's
// terms ARE the flat `hml*`/`refi*` fields on the Deal — the engine and input
// form only ever see the flat fields. A selected sheet's stored `terms` may
// therefore lag the live deal; `syncSelected` writes the flat fields back
// before any serialization, and `selectTermSheet` does the same before swapping.
//
// Alternates + selection metadata persist as a JSON blob in the DEALS_APP
// settings column (column I). The legacy `"v2"` marker or an empty cell parses
// as "no Term Sheets"; anything else unrecognizable parses as `unreadable`
// carrying the raw string so callers can write it back untouched.

import { newUid, type Deal } from './deal-model'

export type LenderRole = 'hml' | 'refi'

export const HML_TERM_FIELDS = [
  'hmlName', 'hmlLevPP', 'hmlLevRehab', 'hmlRate', 'hmlPoints',
  'hmlLenderFees', 'hmlPostClosingMisc', 'hmlExtraFees',
] as const

export const REFI_TERM_FIELDS = [
  'refiName', 'refiRate', 'refiPoints', 'refiBuydownPoints', 'refiPppSchedule',
  'refiTermYears', 'refiAppraisal', 'refiUnderwriting', 'refiOtherMisc',
  'refiSeasoningMonths', 'refiLtv', 'refiTitleEscrow', 'refiExtraFees',
] as const

export type LenderTerms = Partial<Deal>  // exactly one role's term fields

export interface TermSheet {
  id: string
  terms: LenderTerms
}

interface RoleState {
  sheets: TermSheet[]
  selectedId: string
}

export interface TermSheetState {
  hml: RoleState
  refi: RoleState
}

function fieldsFor(role: LenderRole): readonly (keyof Deal)[] {
  return role === 'hml' ? HML_TERM_FIELDS : REFI_TERM_FIELDS
}

/** Copy one role's term fields out of a Deal (deep copy — extra-fee arrays are never shared). */
export function extractTerms(deal: Deal, role: LenderRole): LenderTerms {
  const terms: Record<string, unknown> = {}
  for (const f of fieldsFor(role)) terms[f] = structuredClone(deal[f])
  return terms as LenderTerms
}

/** Return a new Deal with a sheet's terms written over the flat fields. */
export function applyTerms(deal: Deal, terms: LenderTerms): Deal {
  return { ...deal, ...structuredClone(terms) }
}

/** One Term Sheet per role, seeded from the deal's flat fields and selected — the zero-migration shape. */
export function initialTermSheetState(deal: Deal): TermSheetState {
  const hmlSheet: TermSheet = { id: newUid(), terms: extractTerms(deal, 'hml') }
  const refiSheet: TermSheet = { id: newUid(), terms: extractTerms(deal, 'refi') }
  return {
    hml: { sheets: [hmlSheet], selectedId: hmlSheet.id },
    refi: { sheets: [refiSheet], selectedId: refiSheet.id },
  }
}

function withSheet(role: RoleState, id: string, terms: LenderTerms): RoleState {
  return { ...role, sheets: role.sheets.map(s => (s.id === id ? { ...s, terms } : s)) }
}

/** Write the deal's live flat fields into each role's selected sheet (call before serializing). */
export function syncSelected(state: TermSheetState, deal: Deal): TermSheetState {
  return {
    hml: withSheet(state.hml, state.hml.selectedId, extractTerms(deal, 'hml')),
    refi: withSheet(state.refi, state.refi.selectedId, extractTerms(deal, 'refi')),
  }
}

/** Add a copy of the selected sheet (its live terms are the flat fields) and select it. Deal is unchanged. */
export function addTermSheet(state: TermSheetState, deal: Deal, role: LenderRole): TermSheetState {
  const synced = withSheet(state[role], state[role].selectedId, extractTerms(deal, role))
  const sheet: TermSheet = { id: newUid(), terms: extractTerms(deal, role) }
  return { ...state, [role]: { sheets: [...synced.sheets, sheet], selectedId: sheet.id } }
}

/**
 * Select a different sheet: the current flat fields are written back into the
 * previously selected sheet, then the target sheet's terms are applied onto
 * the deal — no terms are lost in the swap.
 */
export function selectTermSheet(
  state: TermSheetState, deal: Deal, role: LenderRole, id: string,
): { state: TermSheetState; deal: Deal } {
  const roleState = state[role]
  const target = roleState.sheets.find(s => s.id === id)
  if (!target || id === roleState.selectedId) return { state, deal }
  const synced = withSheet(roleState, roleState.selectedId, extractTerms(deal, role))
  return {
    state: { ...state, [role]: { sheets: synced.sheets, selectedId: id } },
    deal: applyTerms(deal, target.terms),
  }
}

/**
 * Delete a sheet. The last sheet of a role can't be deleted. Deleting the
 * selected sheet selects the first remaining one and applies its terms.
 */
export function deleteTermSheet(
  state: TermSheetState, deal: Deal, role: LenderRole, id: string,
): { state: TermSheetState; deal: Deal } {
  const roleState = state[role]
  if (roleState.sheets.length <= 1 || !roleState.sheets.some(s => s.id === id)) return { state, deal }
  const remaining = roleState.sheets.filter(s => s.id !== id)
  if (id !== roleState.selectedId) {
    return { state: { ...state, [role]: { ...roleState, sheets: remaining } }, deal }
  }
  const next = remaining[0]
  return {
    state: { ...state, [role]: { sheets: remaining, selectedId: next.id } },
    deal: applyTerms(deal, next.terms),
  }
}

// ---- Settings-column blob codec ----

const BLOB_VERSION = 1

export type ParsedSettings =
  | { kind: 'sheets'; state: TermSheetState }
  | { kind: 'none' }                          // legacy "v2" marker or empty cell — no Term Sheets yet
  | { kind: 'unreadable'; raw: string }       // preserve raw; callers must write it back unchanged

export function serializeSettings(state: TermSheetState): string {
  return JSON.stringify({ version: BLOB_VERSION, termSheets: state })
}

/**
 * The settings-column value a save must write. When the stored blob was
 * unreadable at load time, its raw string is written back byte-for-byte —
 * a save must never destroy what couldn't be parsed (ADR-0003).
 */
export function settingsJsonForSave(state: TermSheetState, unreadableRaw?: string): string {
  return unreadableRaw !== undefined ? unreadableRaw : serializeSettings(state)
}

function isRoleState(v: unknown): v is RoleState {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  if (typeof r.selectedId !== 'string' || !Array.isArray(r.sheets) || r.sheets.length === 0) return false
  const sheetsOk = r.sheets.every(
    (s: unknown) => typeof s === 'object' && s !== null
      && typeof (s as TermSheet).id === 'string'
      && typeof (s as TermSheet).terms === 'object' && (s as TermSheet).terms !== null,
  )
  return sheetsOk && r.sheets.some((s: TermSheet) => s.id === r.selectedId)
}

export function isTermSheetState(v: unknown): v is TermSheetState {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return isRoleState(s.hml) && isRoleState(s.refi)
}

export function parseSettings(raw: string | null | undefined): ParsedSettings {
  if (raw == null || raw.trim() === '') return { kind: 'none' }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { kind: 'unreadable', raw }
  }
  if (parsed === 'v2' || parsed === null) return { kind: 'none' }
  if (
    typeof parsed === 'object'
    && (parsed as Record<string, unknown>).version === BLOB_VERSION
    && isTermSheetState((parsed as Record<string, unknown>).termSheets)
  ) {
    return { kind: 'sheets', state: (parsed as { termSheets: TermSheetState }).termSheets }
  }
  return { kind: 'unreadable', raw }
}

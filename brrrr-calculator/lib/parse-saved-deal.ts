import { BLANK_DEAL } from './blank-deal'
import type { Deal } from './deal-model'

// Keys every save has written since the current engine shipped. A saved row
// missing any of these is not a recognizable Deal (e.g. a row from the retired
// V1 calculator) and must be rejected — never rendered as defaults with
// the row's data silently lost.
const DEAL_MARKER_KEYS = ['purchasePrice', 'arv', 'monthlyRent', 'hmlLevPP', 'refiLtv'] as const

/**
 * Validate and normalize a saved deal's parsed `inputsJson`.
 * Returns `null` when the shape is not a recognizable `Deal` — callers must
 * fail loudly, not fall back to defaults.
 */
export function parseSavedDeal(raw: unknown): Deal | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const obj: Record<string, unknown> = { ...(raw as Record<string, unknown>) }
  if (DEAL_MARKER_KEYS.some(k => !(k in obj))) return null

  // Migrate legacy field name: `otherAdjustmentsAtClose` → `projectCostAdjustments`
  // (semantic also changed: was a money-in-deal deduction, now a Total Project Cost credit)
  if ('otherAdjustmentsAtClose' in obj && !('projectCostAdjustments' in obj)) {
    obj.projectCostAdjustments = obj.otherAdjustmentsAtClose
  }

  // Every field the row actually has wins. What the row is missing comes from
  // BLANK_DEAL, so a partial row (e.g. a triage row carrying only 5–7 keys)
  // shows blanks for what it doesn't know — never another property's numbers.
  // Only cross-deal settings (lender terms, thresholds, exit settings) fill in.
  return { ...BLANK_DEAL, ...(obj as Partial<Deal>) }
}

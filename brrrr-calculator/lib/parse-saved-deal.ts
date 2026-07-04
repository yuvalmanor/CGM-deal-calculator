import { DEFAULT_DEAL } from './deal-model'
import type { Deal } from './deal-model'

// Keys every V2 save has written since the engine shipped. A saved row missing
// any of these is not a V2 Deal (e.g. a legacy V1 DealInputs row) and must be
// rejected — never rendered as DEFAULT_DEAL with the row's data silently lost.
const V2_MARKER_KEYS = ['purchasePrice', 'arv', 'monthlyRent', 'hmlLevPP', 'refiLtv'] as const

/**
 * Validate and normalize a saved deal's parsed `inputsJson`.
 * Returns `null` when the shape is not a recognizable V2 `Deal` — callers must
 * fail loudly, not fall back to defaults.
 */
export function parseSavedDeal(raw: unknown): Deal | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const obj: Record<string, unknown> = { ...(raw as Record<string, unknown>) }
  if (V2_MARKER_KEYS.some(k => !(k in obj))) return null

  // Migrate legacy field name: `otherAdjustmentsAtClose` → `projectCostAdjustments`
  // (semantic also changed: was a money-in-deal deduction, now a Total Project Cost credit)
  if ('otherAdjustmentsAtClose' in obj && !('projectCostAdjustments' in obj)) {
    obj.projectCostAdjustments = obj.otherAdjustmentsAtClose
  }

  // Saved rows always hold the complete Deal at save time, so the defaults only
  // fill fields added to the model after the row was saved; every field the
  // row actually has wins over DEFAULT_DEAL.
  return { ...DEFAULT_DEAL, ...(obj as Partial<Deal>) }
}

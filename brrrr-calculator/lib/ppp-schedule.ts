// Prepayment-penalty schedule text codec for the PPP input field.
// The schedule itself lives on Deal as `refiPppSchedule: number[]` (ADR-0004).

export function formatPppSchedule(schedule: number[]): string {
  return (schedule || []).join(', ')
}

/** Parse "5,5,5" / "5/4/3" (empty = no PPP) to yearly percentages; null = unparseable. */
export function parsePppSchedule(raw: string): number[] | null {
  const trimmed = raw.trim()
  if (trimmed === '') return []
  const tokens = trimmed.split(/[,/]/).map((t) => t.trim())
  const parsed = tokens.map((t) => (t === '' ? NaN : Number(t)))
  if (parsed.some((n) => !Number.isFinite(n) || n < 0)) return null
  return parsed
}

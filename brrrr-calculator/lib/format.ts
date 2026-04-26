export function fmtCurrency(value: number, compact = false): string {
  if (!isFinite(value)) return '—'
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function fmtPct(value: number, decimals = 1): string {
  if (!isFinite(value)) return '—'
  return (value * 100).toFixed(decimals) + '%'
}

export function fmtNumber(value: number, decimals = 2): string {
  if (!isFinite(value)) return '—'
  return value.toFixed(decimals)
}

export function parseCurrency(raw: string): number {
  const clean = raw.replace(/[$,\s]/g, '')
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : n
}

export function parsePct(raw: string): number {
  const clean = raw.replace(/[%\s]/g, '')
  const n = parseFloat(clean)
  return isNaN(n) ? 0 : n / 100
}

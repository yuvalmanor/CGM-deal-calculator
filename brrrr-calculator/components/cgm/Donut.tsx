'use client'
// Hand-drawn SVG donut for the deal page (no chart library). Built only from
// numbers already shown in the card's table. Zero (or negative / non-finite)
// slices are skipped; percentages are of the slices shown. Hover or tap a
// slice (or its legend line) to see its name, $ and %. All slices zero →
// an empty grey ring with no percentages.
import { useState } from 'react'
import { fmtCurrency } from '@/lib/deal-model'

export interface DonutSlice { label: string; value: number }

// Categorical hues in fixed order (dataviz reference palette, light mode).
// A slice keeps the color of its position in the full list, so a skipped
// zero slice never repaints the others.
const SLICE_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']

const R = 54
const STROKE = 20
const C = 2 * Math.PI * R
const GAP = 2   // surface gap between slices, in px along the ring

export function Donut({ slices, ariaLabel }: { slices: DonutSlice[]; ariaLabel: string }) {
  const [active, setActive] = useState<number | null>(null)
  const shown = slices
    .map((s, i) => ({ ...s, color: SLICE_COLORS[i % SLICE_COLORS.length], index: i }))
    .filter((s) => Number.isFinite(s.value) && s.value > 0)
  const total = shown.reduce((sum, s) => sum + s.value, 0)
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0)
  const fmtShare = (v: number) => pct(v).toFixed(1) + '%'
  const hit = active !== null ? shown.find((s) => s.index === active) : undefined

  let offset = 0
  return (
    <div className="donut" onMouseLeave={() => setActive(null)}>
      <div className="donut-chart">
        <svg viewBox="0 0 140 140" role="img" aria-label={ariaLabel}>
          <circle cx="70" cy="70" r={R} fill="none" stroke="var(--donut-empty)" strokeWidth={STROKE} />
          {shown.map((s) => {
            const len = (s.value / total) * C
            const drawn = shown.length > 1 ? Math.max(len - GAP, 0.5) : len
            const el = (
              <circle
                key={s.index}
                className={`donut-slice${active === s.index ? ' active' : ''}${active !== null && active !== s.index ? ' dim' : ''}`}
                cx="70" cy="70" r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={STROKE}
                strokeDasharray={`${drawn} ${C - drawn}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 70 70)"
                onMouseEnter={() => setActive(s.index)}
                onClick={() => setActive(s.index)}
              />
            )
            offset += len
            return el
          })}
        </svg>
        {hit && (
          <div className="donut-center" aria-live="polite">
            <div className="donut-center-label">{hit.label}</div>
            <div className="donut-center-value">{fmtCurrency(hit.value)}</div>
            <div className="donut-center-pct">{fmtShare(hit.value)}</div>
          </div>
        )}
      </div>
      {shown.length > 0 && (
        <ul className="donut-legend">
          {shown.map((s) => (
            <li
              key={s.index}
              className={`donut-legend-item${active === s.index ? ' active' : ''}`}
              onMouseEnter={() => setActive(s.index)}
              onClick={() => setActive(s.index)}
            >
              <span className="donut-swatch" style={{ background: s.color }} />
              <span className="donut-legend-label">{s.label}</span>
              <span className="donut-legend-pct">{fmtShare(s.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** A row table with its donut beside it (under it on narrow screens). */
export function TableWithDonut({ children, donut }: { children: React.ReactNode; donut: React.ReactNode }) {
  return (
    <div className="table-donut">
      <div className="table-donut-table">{children}</div>
      <div className="table-donut-chart">{donut}</div>
    </div>
  )
}

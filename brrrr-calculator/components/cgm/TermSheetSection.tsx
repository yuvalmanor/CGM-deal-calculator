'use client'

// Per-role Term Sheet comparison table: one row per sheet with the
// decision-core KPIs for the active comparison scenario, plus add (copy of
// selected), select (swap into the flat fields), and delete. Rows come from
// compareTermSheets — this component only renders.

import { useState } from 'react'
import { fmtCurrency, fmtPct, fmtNum } from '@/lib/deal-model'
import type { ComparisonRow, ComparisonKpis } from '@/lib/compare-term-sheets'

interface Props {
  title: string
  rows: ComparisonRow[]
  onAdd: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  /** The deal's stored Term Sheets couldn't be read — show a notice instead of alternates (ADR-0003). */
  unreadable?: boolean
  /** Extra content rendered inside the section, after the comparison table (e.g. the Payoff Horizon matrix). */
  children?: React.ReactNode
  /** The title toggles the table open/closed (starts open) — used inside the Financing card. */
  collapsible?: boolean
}

const KPI_HEADERS: Record<ComparisonKpis['scenario'], string[]> = {
  brrrr:   ['Total cash in', 'Money in deal', 'Cashflow /mo', 'CoC', 'DSCR', 'Score'],
  flipHml: ['Total cash in', 'Net profit', 'ROI'],
  buyHold: ['Cash In', 'Cashflow /mo', 'CoC', 'DSCR', 'Score'],
}

function kpiCells(kpis: ComparisonKpis): string[] {
  if (kpis.scenario === 'flipHml') {
    return [fmtCurrency(kpis.totalCashIn), fmtCurrency(kpis.profit), fmtPct(kpis.roi)]
  }
  if (kpis.scenario === 'buyHold') {
    return [
      fmtCurrency(kpis.cashIn),
      fmtCurrency(kpis.cashflow),
      Number.isFinite(kpis.coc) ? fmtPct(kpis.coc) : '∞',
      fmtNum(kpis.dscr),
      kpis.score.toFixed(1),
    ]
  }
  return [
    fmtCurrency(kpis.totalCashIn),
    fmtCurrency(kpis.moneyInDeal),
    fmtCurrency(kpis.cashflow),
    Number.isFinite(kpis.coc) ? fmtPct(kpis.coc) : '∞',
    fmtNum(kpis.dscr),
    kpis.score.toFixed(1),
  ]
}

export function TermSheetSection({ title, rows, onAdd, onSelect, onDelete, unreadable, children, collapsible }: Props) {
  const scenario = rows[0]?.kpis.scenario ?? 'brrrr'
  const [open, setOpen] = useState(true)
  const expanded = !collapsible || open
  if (unreadable) {
    // The deal itself works (its selected terms live in the inputs column);
    // only the alternates are unreadable. Saving writes the stored value back
    // unchanged, so managing sheets here would be lost work — don't offer it.
    return (
      <section className="ts-section">
        <div className="ts-header">
          <div className="out-group-title">{title}</div>
        </div>
        <div className="ts-notice" role="alert">
          This deal&apos;s saved Term Sheets could not be read, so they aren&apos;t shown. The deal
          itself is intact and uses its saved lender terms. Saving will leave the stored Term
          Sheet data untouched — inspect the <code>settingsJson</code> column in Google Sheets.
        </div>
      </section>
    )
  }
  return (
    <section className={`ts-section${collapsible ? ' ts-collapsible' : ''}${expanded ? '' : ' ts-closed'}`}>
      <div className="ts-header">
        {collapsible ? (
          <button
            className="ts-toggle"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            title={open ? `Hide ${title}` : `Show ${title}`}
          >
            <svg className="ts-caret" viewBox="0 0 10 10" aria-hidden="true" focusable="false">
              <path d="M2 3.5 5 6.5 8 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="out-group-title">{title}</span>
          </button>
        ) : (
          <div className="out-group-title">{title}</div>
        )}
        {expanded && (
          <button className="ts-add" onClick={onAdd} title="Add a Term Sheet (copy of the selected one)">
            + Add Term Sheet
          </button>
        )}
      </div>
      {expanded && (<>
      <div className="ts-table-wrap">
        <table className="ts-table">
          <thead>
            <tr>
              <th>Lender</th>
              {KPI_HEADERS[scenario].map((h) => <th key={h}>{h}</th>)}
              <th className="ts-del-cell" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className={r.selected ? 'selected' : undefined}
                onClick={() => onSelect(r.id)}
                title={r.selected ? 'Selected — the input form edits this Term Sheet' : 'Select this Term Sheet'}
              >
                <td>
                  <span className="ts-lender">
                    <span className="ts-radio" aria-hidden="true" />
                    <span className="ts-name">{r.name || 'Unnamed lender'}</span>
                    {r.selected && <span className="ts-badge">Selected</span>}
                  </span>
                </td>
                {kpiCells(r.kpis).map((v, i) => <td key={i} className="mono">{v}</td>)}
                <td className="ts-del-cell">
                  {rows.length > 1 && (
                    <button
                      className="ts-delete"
                      onClick={(e) => { e.stopPropagation(); onDelete(r.id) }}
                      aria-label={`Delete Term Sheet ${r.name || 'Unnamed lender'}`}
                      title="Delete this Term Sheet"
                    >×</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {children}
      </>)}
    </section>
  )
}

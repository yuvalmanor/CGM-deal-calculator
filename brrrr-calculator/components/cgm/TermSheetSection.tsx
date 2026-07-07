'use client'

// Per-role Term Sheet comparison table: one row per sheet with the
// decision-core KPIs for the active comparison scenario, plus add (copy of
// selected), select (swap into the flat fields), and delete. Rows come from
// compareTermSheets — this component only renders.

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
}

const KPI_HEADERS: Record<ComparisonKpis['scenario'], string[]> = {
  brrrr:   ['Total cash in', 'Money in deal', 'Cashflow /mo', 'CoC', 'DSCR', 'Score'],
  flipHml: ['Total cash in', 'Net profit', 'ROI'],
}

function kpiCells(kpis: ComparisonKpis): string[] {
  if (kpis.scenario === 'flipHml') {
    return [fmtCurrency(kpis.totalCashIn), fmtCurrency(kpis.profit), fmtPct(kpis.roi)]
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

export function TermSheetSection({ title, rows, onAdd, onSelect, onDelete, unreadable, children }: Props) {
  const scenario = rows[0]?.kpis.scenario ?? 'brrrr'
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
    <section className="ts-section">
      <div className="ts-header">
        <div className="out-group-title">{title}</div>
        <button className="ts-add" onClick={onAdd} title="Add a Term Sheet (copy of the selected one)">
          + Add Term Sheet
        </button>
      </div>
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
    </section>
  )
}

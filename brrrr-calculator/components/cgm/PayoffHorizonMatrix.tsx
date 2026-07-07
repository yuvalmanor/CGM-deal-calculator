'use client'

// Payoff Horizon matrix — one row per horizon year, one column per Refi Term
// Sheet. Each cell is the nominal cost of that refi if paid off at that
// horizon: closing costs + cumulative interest + prepayment penalty
// (principal excluded — see lib/payoff-horizon.ts). Cheapest cell per row is
// highlighted; cells with an active penalty show the penalty amount. Columns
// come from comparePayoffHorizons — this component only renders.

import { fmtCurrency } from '@/lib/deal-model'
import { PAYOFF_HORIZONS_YEARS } from '@/lib/payoff-horizon'
import type { PayoffColumn } from '@/lib/compare-term-sheets'

export function PayoffHorizonMatrix({ columns }: { columns: PayoffColumn[] }) {
  if (columns.length === 0) return null
  const amounts = columns.map((c) => c.loanAmount)
  const amountsDiffer = amounts.some((a) => Math.abs(a - amounts[0]) > 0.005)
  return (
    <div className="ph-block">
      <div className="ph-title">Payoff Horizon — total loan cost if paid off at…</div>
      {amountsDiffer && (
        <div className="ph-warning" role="note">
          Loan amounts differ between Term Sheets — totals are not directly comparable.
        </div>
      )}
      <div className="ts-table-wrap">
        <table className="ts-table ph-table">
          <thead>
            <tr>
              <th>Horizon</th>
              {columns.map((c) => (
                <th key={c.id}>
                  <div className="ph-col-name">
                    {c.name || 'Unnamed lender'}
                    {c.selected && <span className="ts-badge"> · Selected</span>}
                  </div>
                  <div className="ph-col-sub">{fmtCurrency(c.pi, { decimals: 2 })}/mo P&I</div>
                  {amountsDiffer && <div className="ph-col-sub">{fmtCurrency(c.loanAmount)} loan</div>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PAYOFF_HORIZONS_YEARS.map((h, row) => {
              const best = Math.min(...columns.map((c) => c.cells[row].total))
              return (
                <tr key={h}>
                  <td>{h} yr</td>
                  {columns.map((c) => {
                    const cell = c.cells[row]
                    const win = columns.length > 1 && cell.total <= best + 0.005
                    return (
                      <td key={c.id} className={`mono${win ? ' ph-win' : ''}`}>
                        {fmtCurrency(cell.total)}
                        {cell.penalty > 0 && (
                          <span
                            className="ph-pen"
                            title={`Includes a ${fmtCurrency(cell.penalty)} prepayment penalty on the remaining balance`}
                          >
                            incl. {fmtCurrency(cell.penalty)} PPP
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

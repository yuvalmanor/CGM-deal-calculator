import ResultRow from '@/components/ui/ResultRow'
import { fmtCurrency, fmtPct } from '@/lib/format'
import type { DealResults, DealInputs } from '@/lib/types'

interface Props { results: DealResults; inputs: DealInputs }

export default function ScenarioFlipHML({ results: r, inputs: i }: Props) {
  const profitColor = r.hmlFlipProfit >= 0 ? 'green' : 'red'

  return (
    <div className="space-y-4">

      {/* ── Deal Anatomy ─────────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Deal Anatomy</p>
        <div className="space-y-1">
          <ResultRow label="Cash to Close" value={fmtCurrency(r.hmlCashToClose)} bold metricId="hml_cash_to_close" />
          <ResultRow label="Sale Price (ARV)" value={fmtCurrency(i.arv)} metricId="arv" />
          <ResultRow label="Agent Commissions" value={fmtCurrency(r.agentCosts)} indent metricId="sale_costs" />
          <ResultRow label="Closing Costs on Sale" value={fmtCurrency(r.closingCostsSell)} indent />
          <ResultRow label="HML Payoff" value={fmtCurrency(r.hmlLoan)} indent metricId="hml_principal" />
          <ResultRow
            label="Net Profit"
            value={fmtCurrency(r.hmlFlipProfit)}
            bold separator
            highlight={profitColor}
            metricId="hml_flip_profit"
          />
          <ResultRow
            label="CoC ROI %"
            value={fmtPct(r.hmlFlipROI)}
            bold
            highlight={profitColor}
            metricId="hml_flip_roi"
          />
        </div>
      </div>

      {/* ── HML Expenses ─────────────────────────────────────────── */}
      <div className="rounded-lg bg-blue-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-500">HML Expenses</p>
        <div className="space-y-1">
          <ResultRow label="HML Loan Principal" value={fmtCurrency(r.hmlLoan)} bold metricId="hml_principal" />
          <ResultRow label="Total Interest" value={fmtCurrency(r.hmlTotalInterest)} indent metricId="hml_interest" />
          <ResultRow label="Points" value={fmtCurrency(r.hmlPointsDollar)} indent metricId="hml_points" />
          <ResultRow label="Lender Fees" value={fmtCurrency(r.hmlTotalFees - r.hmlPointsDollar - r.hmlCustomFeesTotal)} indent metricId="hml_fees" />
          {i.hmlCustomFees.map(f => (
            <ResultRow key={f.id} label={f.name || 'Custom Fee'} value={fmtCurrency(f.amount)} indent />
          ))}
          <ResultRow label="Total HML Cost" value={fmtCurrency(r.hmlTotalDebt)} bold separator metricId="hml_total" />
        </div>
      </div>

    </div>
  )
}

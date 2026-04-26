import ResultRow from '@/components/ui/ResultRow'
import { fmtCurrency, fmtPct } from '@/lib/format'
import type { DealResults, DealInputs } from '@/lib/types'

interface Props { results: DealResults; inputs: DealInputs }

export default function ScenarioCash({ results: r, inputs: i }: Props) {
  const profitColor = r.cashFlipProfit >= 0 ? 'green' : 'red'

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Deal Anatomy</p>
      <div className="space-y-1">
        <ResultRow label="All-in (Cash)" value={fmtCurrency(r.allInCost)} bold metricId="all_in" />
        <ResultRow label="Sale Price (ARV)" value={fmtCurrency(i.arv)} metricId="arv" />
        <ResultRow label="Agent Commissions" value={fmtCurrency(r.agentCosts)} indent metricId="sale_costs" />
        <ResultRow label="Closing Costs on Sale" value={fmtCurrency(r.closingCostsSell)} indent />
        <ResultRow label="Holding Costs" value={fmtCurrency(r.holdingCosts)} indent sub={`${r.rehabMonths.toFixed(1)} mo`} metricId="holding" />
        <ResultRow
          label="Net Profit"
          value={fmtCurrency(r.cashFlipProfit)}
          bold separator
          highlight={profitColor}
          metricId="cash_flip_profit"
        />
        <ResultRow
          label="Cash ROI %"
          value={fmtPct(r.cashFlipROI)}
          bold
          highlight={profitColor}
          metricId="cash_flip_roi"
        />
      </div>
    </div>
  )
}

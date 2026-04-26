import ResultRow from '@/components/ui/ResultRow'
import { fmtCurrency, fmtPct, fmtNumber } from '@/lib/format'
import type { DealInputs, DealResults } from '@/lib/types'

interface Props { results: DealResults; inputs: DealInputs }

export default function CashFlowCard({ results: r, inputs }: Props) {
  const dscrColor = r.dscr >= 1.25 ? 'green' : r.dscr >= 1.0 ? 'yellow' : 'red'
  const noiColor  = r.cashNOI_PI >= 300 ? 'green' : r.cashNOI_PI >= 0 ? 'yellow' : 'red'
  const grossRent = r.cashNOI_PI + r.totalPITI

  const pmLabel = inputs.pmMode === 'percent'
    ? `Property Management (${(inputs.pmRate * 100).toFixed(0)}%)`
    : 'Property Management (fixed)'

  const fixedExpenses = r.totalPITI - r.mortgagePI - r.capexReserve - r.pmFee - r.customExpenseTotal

  return (
    <div className="space-y-1">
      <ResultRow label="Gross Rent /mo" value={fmtCurrency(grossRent)} bold />

      <ResultRow label="CapEx / Maint / Vacancy (15%)" value={fmtCurrency(r.capexReserve)} indent metricId="capex" />

      <ResultRow label={pmLabel} value={fmtCurrency(r.pmFee)} indent metricId="pm" />

      <ResultRow label="Mortgage P+I" value={fmtCurrency(r.mortgagePI)} indent metricId="mortgage_pi" />

      <ResultRow label="Tax + Insurance + HOA" value={fmtCurrency(fixedExpenses)} indent metricId="tax_ins_hoa" />

      {r.customExpenseTotal > 0 && (
        <ResultRow label="Custom Expenses" value={fmtCurrency(r.customExpenseTotal)} indent metricId="custom_exp" />
      )}

      {/* Individual monthly/annual custom expense lines (one-time goes in deal anatomy) */}
      {inputs.customExpenses.filter(e => !e.funded && e.frequency !== 'one-time').map(e => {
        const monthlyAmt = e.frequency === 'annual' ? e.amount / 12 : e.amount
        const label = e.frequency === 'annual'
          ? `    ${e.name || 'Unnamed'} (annual ÷ 12)`
          : `    ${e.name || 'Unnamed'}`
        return (
          <ResultRow key={e.id} label={label} value={fmtCurrency(monthlyAmt)} indent />
        )
      })}

      <ResultRow label="Total PITI /mo" value={fmtCurrency(r.totalPITI)} bold separator metricId="total_piti" />

      <ResultRow label="Net Cash Flow /mo (P+I)"
        value={fmtCurrency(r.cashNOI_PI)}
        highlight={noiColor} bold
        metricId="net_cashflow" />

      <ResultRow label="Net Cash Flow /mo (IO)"
        value={fmtCurrency(r.cashNOI_IO)}
        sub="interest-only loan"
        metricId="net_cashflow_io" />

      <ResultRow label="DSCR"
        value={fmtNumber(r.dscr)}
        highlight={dscrColor}
        sub="≥ 1.25 = lender approved"
        separator
        metricId="dscr" />

      <ResultRow label="Refi LTV" value={fmtPct(r.refiLTV)}
        sub={r.refiLTV === 0.65 ? 'at 65% hard cap' : 'auto-calculated'}
        metricId="refi_ltv" />

      <ResultRow label="LTV for $300 cash flow" value={fmtPct(r.ltv300cashflow)}
        metricId="ltv_300" />
    </div>
  )
}

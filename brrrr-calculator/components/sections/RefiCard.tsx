import ResultRow from '@/components/ui/ResultRow'
import { fmtCurrency, fmtPct } from '@/lib/format'
import type { DealResults } from '@/lib/types'

interface Props { results: DealResults }

export default function RefiCard({ results: r }: Props) {
  const netColor = r.netCashAtClosing >= 0 ? 'green' : 'red'

  return (
    <div className="space-y-1">
      <ResultRow label="Refi Loan Amount" value={fmtCurrency(r.refiLoanAmount)} bold metricId="refi_loan" />

      <ResultRow label="  Appraisal + Underwriting" value={fmtCurrency(r.refiFees - r.refiPointsDollar)} indent metricId="refi_fees_fixed" />

      <ResultRow label="  Points" value={fmtCurrency(r.refiPointsDollar)} indent sub={fmtPct(r.refiFeePct) + ' of loan'} metricId="refi_points" />

      <ResultRow label="  Title / Closing" value={fmtCurrency(r.refiTitleCosts)} indent metricId="refi_title" />

      <ResultRow label="Total Fees" value={fmtCurrency(r.refiFees + r.refiTitleCosts)} separator metricId="refi_total" />

      <ResultRow label="Cash from Lender" value={fmtCurrency(r.cashFromLender)} bold metricId="cash_from_lender" />

      <ResultRow label="HML Total Debt" value={fmtCurrency(r.hmlTotalDebt)} metricId="hml_total" />

      <ResultRow
        label="Net Cash at Closing"
        value={fmtCurrency(r.netCashAtClosing)}
        highlight={netColor} bold
        sub={r.netCashAtClosing >= 0 ? 'lender pays you (full BRRRR)' : 'you owe at closing (partial BRRRR)'}
        separator
        metricId="net_cash_closing"
      />
    </div>
  )
}

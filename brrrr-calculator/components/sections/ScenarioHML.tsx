import ResultRow from '@/components/ui/ResultRow'
import { fmtCurrency, fmtPct } from '@/lib/format'
import type { DealResults, DealInputs } from '@/lib/types'

interface Props { results: DealResults; inputs: DealInputs }

export default function ScenarioHML({ results: r, inputs: i }: Props) {
  const pmLabel = i.pmMode === 'percent'
    ? `Property Mgmt (${(i.pmRate * 100).toFixed(0)}%)`
    : 'Property Mgmt (fixed)'

  const oneTimeExpenses  = i.customExpenses.filter(e => !e.funded && e.frequency === 'one-time')
  const recurringExpenses = i.customExpenses.filter(e => !e.funded && e.frequency !== 'one-time')

  return (
    <div className="space-y-4">

      {/* ── Deal Anatomy ─────────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Deal Anatomy</p>
        <div className="space-y-1">
          <ResultRow label="Purchase Price" value={fmtCurrency(i.purchasePrice)} metricId="pp" />
          <ResultRow label="Total Rehab" value={fmtCurrency(i.rehabEstimate + i.changeOrders)} metricId="rehab_total" />
          <ResultRow label="Closing Costs" value={fmtCurrency(r.closingCostsBuy)} metricId="closing_buy" />
          <ResultRow label="Holding Costs" value={fmtCurrency(r.holdingCosts)} sub={`${r.rehabMonths.toFixed(1)} mo`} metricId="holding" />
          <ResultRow label="All-in (Cash)" value={fmtCurrency(r.allInCost)} bold separator metricId="all_in" />
          {oneTimeExpenses.map(e => (
            <ResultRow key={e.id} label={`${e.name || 'Unnamed'} (one-time)`} value={fmtCurrency(e.amount)} indent />
          ))}
          <ResultRow label="ARV" value={fmtCurrency(i.arv)} metricId="arv" />
          <ResultRow label="Refi Loan" value={fmtCurrency(r.refiLoanAmount)} metricId="refi_loan" />
          <ResultRow label="Refi Closing Costs" value={fmtCurrency(r.refiFees + r.refiTitleCosts)} metricId="refi_total" />
          <ResultRow label="Cash from Lender" value={fmtCurrency(r.cashFromLender)} metricId="cash_from_lender" />
          <ResultRow
            label="Money Left in Deal"
            value={fmtCurrency(r.hmlMoneyInDeal)}
            bold separator
            highlight={r.hmlMoneyInDeal <= 0 ? 'green' : undefined}
            sub={r.netCashAtClosing >= 0 ? 'full BRRRR' : 'partial BRRRR'}
            metricId="money_in_deal"
          />
        </div>
      </div>

      {/* ── Monthly P&L ──────────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Monthly P&L</p>
        <div className="space-y-1">
          <ResultRow label="Gross Rent" value={fmtCurrency(i.marketRent)} bold metricId="gross_rent" />
          <ResultRow label="Mortgage P+I" value={fmtCurrency(r.mortgagePI)} indent metricId="mortgage_pi" />
          <ResultRow label="Property Tax" value={fmtCurrency(i.propertyTaxMonthly)} indent metricId="prop_tax" />
          <ResultRow label="Insurance" value={fmtCurrency(i.insuranceMonthly)} indent metricId="insurance" />
          {i.hoaMonthly > 0 && (
            <ResultRow label="HOA" value={fmtCurrency(i.hoaMonthly)} indent metricId="hoa" />
          )}
          {i.stateIncomeTaxMonthly > 0 && (
            <ResultRow label="State Income Tax" value={fmtCurrency(i.stateIncomeTaxMonthly)} indent metricId="state_tax" />
          )}
          <ResultRow label="CapEx + Vacancy (15%)" value={fmtCurrency(r.capexReserve)} indent metricId="capex" />
          <ResultRow label={pmLabel} value={fmtCurrency(r.pmFee)} indent metricId="pm" />
          {recurringExpenses.map(e => {
            const monthlyAmt = e.frequency === 'annual' ? e.amount / 12 : e.amount
            const label = e.frequency === 'annual'
              ? `${e.name || 'Unnamed'} (annual ÷ 12)`
              : (e.name || 'Unnamed')
            return <ResultRow key={e.id} label={label} value={fmtCurrency(monthlyAmt)} indent />
          })}
          <ResultRow
            label="Net Cashflow /mo"
            value={fmtCurrency(r.cashNOI_PI)}
            bold separator
            highlight={r.cashNOI_PI >= 300 ? 'green' : r.cashNOI_PI >= 0 ? 'yellow' : 'red'}
            metricId="net_cashflow"
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

      {/* ── Refi Expenses ────────────────────────────────────────── */}
      <div className="rounded-lg bg-blue-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-500">Refi Expenses</p>
        <div className="space-y-1">
          <ResultRow label="Refi Loan Amount" value={fmtCurrency(r.refiLoanAmount)} bold metricId="refi_loan" />
          <ResultRow label="Points" value={fmtCurrency(r.refiPointsDollar)} indent metricId="refi_points" />
          <ResultRow label="Appraisal + Underwriting" value={fmtCurrency(r.refiFees - r.refiPointsDollar - r.refiCustomFeesTotal)} indent metricId="refi_fees_fixed" />
          {i.refiCustomFees.map(f => (
            <ResultRow key={f.id} label={f.name || 'Custom Fee'} value={fmtCurrency(f.amount)} indent />
          ))}
          <ResultRow label="Title / Closing" value={fmtCurrency(r.refiTitleCosts)} indent metricId="refi_title" />
          <ResultRow label="Total Refi Cost" value={fmtCurrency(r.refiFees + r.refiTitleCosts)} bold separator metricId="refi_total" />
        </div>
      </div>

    </div>
  )
}

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
  const rehabCosts = i.rehabCustomCosts ?? []
  const oneTimeTotal = oneTimeExpenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className="space-y-4">

      {/* ── Deal Anatomy ─────────────────────────────────────────── */}
      <div className="rounded-xl bg-amber-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">Deal Anatomy</p>
        <div className="space-y-1">
          <ResultRow label="Purchase Price" value={fmtCurrency(i.purchasePrice)} metricId="pp" />
          {/* Rehab Estimate + Change Orders split with funding badges */}
          <div className="flex items-center justify-between py-1 pl-3">
            <div className="flex items-center gap-1.5 min-w-0 mr-2">
              <span className="text-xs text-gray-500 truncate">Rehab Estimate</span>
              <span className="flex-shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">Funded</span>
            </div>
            <span className="text-sm font-medium text-gray-800">{fmtCurrency(i.rehabEstimate)}</span>
          </div>
          <div className="flex items-center justify-between py-1 pl-3">
            <div className="flex items-center gap-1.5 min-w-0 mr-2">
              <span className="text-xs text-gray-500 truncate">Change Orders</span>
              <span className="flex-shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Not Funded</span>
            </div>
            <span className="text-sm font-medium text-gray-800">{fmtCurrency(i.changeOrders)}</span>
          </div>
          <ResultRow label="Total Rehab" value={fmtCurrency(i.rehabEstimate + i.changeOrders)} bold metricId="rehab_total" />

          {/* Rehab additional costs */}
          {rehabCosts.map(c => (
            <ResultRow
              key={c.id}
              label={`${c.name || 'Rehab extra'} (${c.funded ? 'funded' : 'cash'})`}
              value={fmtCurrency(c.amount)}
              indent
            />
          ))}

          <ResultRow label="Closing Costs" value={fmtCurrency(r.closingCostsBuy)} metricId="closing_buy" />
          <ResultRow label="Holding Costs" value={fmtCurrency(r.holdingCosts)} sub={`${r.rehabMonths.toFixed(1)} mo`} metricId="holding" />
          <ResultRow label="All-in (Cash)" value={fmtCurrency(r.allInCost)} bold separator metricId="all_in" />

          {/* One-Time Costs subtotal block */}
          {oneTimeExpenses.length > 0 && (
            <>
              <div className="my-1 border-t border-amber-200" />
              <p className="py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-600">One-Time Costs</p>
              {oneTimeExpenses.map(e => (
                <ResultRow key={e.id} label={e.name || 'Unnamed'} value={fmtCurrency(e.amount)} indent />
              ))}
              <ResultRow label="One-Time Costs Total" value={fmtCurrency(oneTimeTotal)} bold />
              <div className="my-1 border-t border-amber-200" />
            </>
          )}

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
      <div className="rounded-xl bg-green-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-700">Monthly P&L</p>
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
          <ResultRow label="PITI (PI + Tax + Ins + HOA)" value={fmtCurrency(r.pitiSum)} indent metricId="piti_sum" />
          <ResultRow label="Total Operating Expenses (PITI + CapEx + PM + Custom)" value={fmtCurrency(r.totalOperatingExpenses)} indent metricId="total_operating_expenses" />
          <ResultRow
            label="Net Cashflow /mo"
            value={fmtCurrency(r.cashNOI_PI)}
            bold separator
            highlight={r.cashNOI_PI >= 300 ? 'green' : r.cashNOI_PI >= 0 ? 'yellow' : 'red'}
            metricId="net_cashflow"
          />
          <ResultRow
            label="Net Cashflow (w/o CapEx)"
            value={fmtCurrency(r.cashNOI_PI + r.capexReserve)}
            indent
          />
          <ResultRow label="CoC ROI (w/ CapEx)"  value={fmtPct(r.hmlROI_PI)}  indent metricId="roi" />
          <ResultRow
            label="CoC ROI (w/o CapEx)"
            value={r.hmlMoneyInDeal > 0 ? fmtPct((r.hmlNOI_PI + r.capexReserve) * 12 / r.hmlMoneyInDeal) : '—'}
            indent
          />
        </div>
      </div>

      {/* ── HML Expenses ─────────────────────────────────────────── */}
      <div className="rounded-xl bg-sky-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-700">HML Expenses</p>
        <div className="space-y-1">
          <ResultRow label="HML Loan Principal" value={fmtCurrency(r.hmlLoan)} bold metricId="hml_principal" />
          <ResultRow label="Total Interest" value={fmtCurrency(r.hmlTotalInterest)} indent metricId="hml_interest" />
          <ResultRow label="Interest / mo" value={fmtCurrency(r.hmlMonthlyInterest)} indent />
          <ResultRow label="Points" value={fmtCurrency(r.hmlPointsDollar)} indent metricId="hml_points" />
          <ResultRow label="Lender Fees" value={fmtCurrency(r.hmlTotalFees - r.hmlPointsDollar - r.hmlCustomFeesTotal)} indent metricId="hml_fees" />
          {i.hmlCustomFees.map(f => (
            <ResultRow key={f.id} label={f.name || 'Custom Fee'} value={fmtCurrency(f.amount)} indent />
          ))}
          <ResultRow label="Total HML Cost" value={fmtCurrency(r.hmlTotalDebt)} bold separator metricId="hml_total" />
        </div>
      </div>

      {/* ── Refi Expenses ────────────────────────────────────────── */}
      <div className="rounded-xl bg-teal-50 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-teal-700">Refi Expenses</p>
        <div className="space-y-1">
          <ResultRow label="Refi Loan Amount" value={fmtCurrency(r.refiLoanAmount)} bold metricId="refi_loan" />
          <ResultRow label="Points" value={fmtCurrency(r.refiPointsDollar)} indent metricId="refi_points" />
          <ResultRow label="Appraisal + Underwriting" value={fmtCurrency(r.refiFees - r.refiPointsDollar - r.refiCustomFeesTotal)} indent metricId="refi_fees_fixed" />
          {i.refiCustomFees.map(f => (
            <ResultRow key={f.id} label={f.name || 'Custom Fee'} value={fmtCurrency(f.amount)} indent />
          ))}
          <ResultRow label="Title / Closing" value={fmtCurrency(r.refiTitleCosts)} indent metricId="refi_title" />
          <ResultRow label="Total Refi Cost" value={fmtCurrency(r.refiFees + r.refiTitleCosts)} bold separator metricId="refi_total" />
          <ResultRow label="Mortgage / mo (P+I)" value={fmtCurrency(r.mortgagePI)} indent metricId="mortgage_pi" />
        </div>
      </div>

    </div>
  )
}

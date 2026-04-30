'use client'
import { useModal } from '@/lib/modalContext'
import { fmtCurrency, fmtPct, fmtNumber } from '@/lib/format'
import type { DealResults } from '@/lib/types'

function MetricItem({ label, value, metricId }: { label: string; value: string; metricId?: string }) {
  const openModal = useModal()
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2">
      <div className="flex min-w-0 items-center gap-1">
        <span className="truncate text-xs text-gray-500">{label}</span>
        {metricId && (
          <button
            type="button"
            onClick={() => openModal(metricId)}
            className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-colors"
            aria-label="Show formula"
          >?</button>
        )}
      </div>
      <span className="flex-shrink-0 text-xs font-semibold text-gray-900">{value}</span>
    </div>
  )
}

interface Props { results: DealResults }

export default function AdvancedMetrics({ results: r }: Props) {
  const openModal = useModal()

  return (
    <div className="space-y-4">

      {/* Valuation */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Valuation</p>
        <div className="grid grid-cols-2 gap-2">
          <MetricItem label="Cap Rate" value={fmtPct(r.capRate)} metricId="cap_rate" />
          <MetricItem label="GRM" value={fmtNumber(r.grm, 1) + '×'} metricId="grm" />
        </div>
      </div>

      {/* Equity */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Equity</p>
        <div className="grid grid-cols-2 gap-2">
          <MetricItem label="Forced Equity ROI" value={fmtPct(r.forcedEquityROI)} metricId="forced_equity_roi" />
          <MetricItem label="Equity Margin on ARV" value={fmtPct(r.equityMarginOnARV)} metricId="equity_margin_arv" />
          <MetricItem label="True Equity % (book)" value={fmtPct(r.equityPctBook)} metricId="equity_pct_book" />
        </div>
      </div>

      {/* Annual Cash Flow */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Annual Cash Flow</p>
        <div className="grid grid-cols-2 gap-2">
          <MetricItem label="HML · PI" value={fmtCurrency(r.hmlAnnualCashflow_PI)} metricId="annual_cashflow" />
          <MetricItem label="HML · IO" value={fmtCurrency(r.hmlAnnualCashflow_IO)} metricId="annual_cashflow" />
          <MetricItem label="Cash · PI" value={fmtCurrency(r.cashAnnualCashflow_PI)} metricId="annual_cashflow" />
          <MetricItem label="Cash · IO" value={fmtCurrency(r.cashAnnualCashflow_IO)} metricId="annual_cashflow" />
        </div>
      </div>

      {/* Return on Equity */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Return on Equity</p>
        <div className="grid grid-cols-2 gap-2">
          <MetricItem label="HML ROE" value={fmtPct(r.hmlROE)} metricId="roe" />
          <MetricItem label="Cash ROE" value={fmtPct(r.cashROE)} metricId="roe" />
        </div>
      </div>

      {/* 5-Year IRR */}
      <div>
        <div className="mb-2 flex items-center gap-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">5-Year IRR</p>
          <button
            type="button"
            onClick={() => openModal('irr_scenarios')}
            className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-colors"
            aria-label="Show formula"
          >?</button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([
            { label: '2% appr.', value: r.irr2pct },
            { label: '3% appr.', value: r.irr3pct },
            { label: '4% appr.', value: r.irr4pct },
          ] as const).map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-gray-50 px-3 py-2 text-center">
              <p className="mb-1 text-[10px] text-gray-400">{label}</p>
              <p className="text-sm font-semibold text-gray-900">{fmtPct(value)}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}

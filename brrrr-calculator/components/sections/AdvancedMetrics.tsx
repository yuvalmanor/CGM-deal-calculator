'use client'
import { useModal } from '@/lib/modalContext'
import { fmtCurrency, fmtPct, fmtNumber } from '@/lib/format'
import type { DealResults, DealInputs } from '@/lib/types'
import Scorecard from './Scorecard'

const clickableLabelCls = 'truncate text-xs text-gray-500 text-left underline decoration-dashed decoration-gray-300 underline-offset-2 hover:text-blue-500 hover:decoration-blue-300 transition-colors cursor-pointer'

type ValueTone = 'good' | 'warn' | 'bad' | 'neutral'

const toneClass: Record<ValueTone, string> = {
  good: 'text-green-600',
  warn: 'text-amber-500',
  bad: 'text-red-500',
  neutral: 'text-gray-900',
}

function MetricItem({ label, value, metricId, tone = 'neutral' }: { label: string; value: string; metricId?: string; tone?: ValueTone }) {
  const openModal = useModal()
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2">
      <div className="flex min-w-0 items-center">
        {metricId ? (
          <button
            type="button"
            onClick={() => openModal(metricId)}
            className={clickableLabelCls}
            aria-label={`Show formula for ${label}`}
          >
            {label}
          </button>
        ) : (
          <span className="truncate text-xs text-gray-500">{label}</span>
        )}
      </div>
      <span className={`flex-shrink-0 text-xs font-semibold ${toneClass[tone]}`}>{value}</span>
    </div>
  )
}

function capRateTone(v: number): ValueTone {
  if (!Number.isFinite(v)) return 'neutral'
  const pct = v * 100
  if (pct < 5) return 'bad'
  if (pct < 7) return 'warn'
  if (pct <= 9) return 'good'
  return 'warn'
}

interface Props { results: DealResults; inputs: DealInputs }

export default function AdvancedMetrics({ results: r, inputs }: Props) {
  const openModal = useModal()
  const isFlip = inputs.exitStrategy === 'flip'

  return (
    <div className="space-y-4">

      {/* Scorecard — first item inside Advanced Metrics */}
      {!isFlip && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Scorecard</p>
          <Scorecard results={r} inputs={inputs} />
        </div>
      )}

      {/* Valuation */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Valuation</p>
        <div className="grid grid-cols-2 gap-2">
          <MetricItem label="Cap Rate" value={fmtPct(r.capRate)} metricId="cap_rate" tone={capRateTone(r.capRate)} />
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
          <MetricItem
            label="Equity Multiplier"
            value={r.hmlMoneyInDeal > 0 ? fmtNumber(r.propertyEquityPostRefi / r.hmlMoneyInDeal, 2) + '×' : '—'}
            metricId="equity_multiplier"
          />
        </div>
      </div>

      {/* Annual Cash Flow */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Annual Cash Flow</p>
        <div className="grid grid-cols-2 gap-2">
          <MetricItem label="HML · PI" value={fmtCurrency(r.hmlAnnualCashflow_PI)} metricId="annual_cashflow_hml_pi" />
          <MetricItem label="HML · IO" value={fmtCurrency(r.hmlAnnualCashflow_IO)} metricId="annual_cashflow_hml_io" />
          <MetricItem label="Cash · PI" value={fmtCurrency(r.cashAnnualCashflow_PI)} metricId="annual_cashflow_cash_pi" />
          <MetricItem label="Cash · IO" value={fmtCurrency(r.cashAnnualCashflow_IO)} metricId="annual_cashflow_cash_io" />
        </div>
      </div>

      {/* Return on Equity */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Return on Equity</p>
        <div className="grid grid-cols-2 gap-2">
          <MetricItem label="HML ROE" value={fmtPct(r.hmlROE)} metricId="roe_hml" />
          <MetricItem label="Cash ROE" value={fmtPct(r.cashROE)} metricId="roe_cash" />
        </div>
      </div>

      {/* 5-Year IRR */}
      <div>
        <button
          type="button"
          onClick={() => openModal('irr_scenarios')}
          className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400 underline decoration-dashed decoration-gray-300 underline-offset-2 hover:text-blue-500 hover:decoration-blue-300 transition-colors cursor-pointer"
          aria-label="Show formula for 5-Year IRR"
        >
          5-Year IRR
        </button>
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

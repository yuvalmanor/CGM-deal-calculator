'use client'
import { useModal } from '@/lib/modalContext'
import { fmtCurrency, fmtPct, fmtNumber } from '@/lib/format'
import type { DealResults } from '@/lib/types'

interface Props { results: DealResults }

interface KPIProps {
  label: string
  value: string
  sub?: string
  colorClass: string
  metricId: string
}

function KPICard({ label, value, sub, colorClass, metricId }: KPIProps) {
  const openModal = useModal()
  return (
    <div className="relative flex flex-col rounded-lg bg-gray-50 px-4 py-3">
      <button
        type="button"
        onClick={() => openModal(metricId)}
        className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-colors"
        aria-label="Show formula"
      >
        ?
      </button>
      <span className={`text-lg font-bold ${colorClass}`}>{value}</span>
      {sub && <span className="mt-0.5 text-xs text-gray-500">{sub}</span>}
      <span className="mt-0.5 text-xs text-gray-400">{label}</span>
    </div>
  )
}

export default function SummaryBar({ results: r }: Props) {
  const cashflowColor = r.hmlNOI_PI >= 300 ? 'text-green-600' : r.hmlNOI_PI >= 100 ? 'text-amber-500' : 'text-red-500'
  const roiColor      = r.hmlROI_PI >= 0.08 ? 'text-green-600' : r.hmlROI_PI >= 0.05 ? 'text-amber-500' : 'text-red-500'
  const dscrColor     = r.dscr >= 1.25 ? 'text-green-600' : r.dscr >= 1.0 ? 'text-amber-500' : 'text-red-500'
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <KPICard
        label="Monthly Cashflow"
        value={fmtCurrency(r.hmlNOI_PI)}
        colorClass={cashflowColor}
        metricId="cf"
      />
      <KPICard
        label="CoC ROI"
        value={fmtPct(r.hmlROI_PI)}
        colorClass={roiColor}
        metricId="roi"
      />
      <KPICard
        label="Equity post-Refi"
        value={fmtCurrency(r.hmlEquityPostRefi)}
        sub={r.hmlMoneyInDeal > 0 ? fmtPct(r.hmlEquityPctPostRefi) + ' return on capital' : undefined}
        colorClass="text-gray-900"
        metricId="equity_kpi"
      />
      <KPICard
        label="DSCR"
        value={fmtNumber(r.dscr)}
        colorClass={dscrColor}
        metricId="dscr"
      />
    </div>
  )
}

'use client'
import { useState } from 'react'
import { useModal } from '@/lib/modalContext'
import { fmtCurrency, fmtPct, fmtNumber } from '@/lib/format'
import type { DealResults } from '@/lib/types'

const clickableLabelCls = 'mt-0.5 text-left text-xs text-gray-400 underline decoration-dashed decoration-gray-300 underline-offset-2 hover:text-blue-500 hover:decoration-blue-300 transition-colors cursor-pointer'

interface KPIProps {
  label: string
  value: string
  sub?: string
  colorClass: string
  metricId?: string
}

function KPICard({ label, value, sub, colorClass, metricId }: KPIProps) {
  const openModal = useModal()
  return (
    <div className="flex flex-col rounded-lg bg-gray-50 px-4 py-3">
      <span className={`text-lg font-bold ${colorClass}`}>{value}</span>
      {sub && <span className="mt-0.5 text-xs text-gray-500">{sub}</span>}
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
        <span className="mt-0.5 text-left text-xs text-gray-400">{label}</span>
      )}
    </div>
  )
}

interface Props { results: DealResults }

export default function SummaryBar({ results: r }: Props) {
  const openModal = useModal()
  const [equityView, setEquityView] = useState<'book' | 'liquidation'>('book')

  const equityValue = equityView === 'book' ? r.propertyEquityPostRefi : r.propertyEquityLiquidation
  const equitySub = equityView === 'book'
    ? (r.hmlMoneyInDeal > 0 ? fmtPct(r.hmlEquityPctPostRefi) + ' vs capital' : undefined)
    : 'after 8% sale costs'

  const cashflowColor = r.hmlNOI_PI >= 300 ? 'text-green-600' : r.hmlNOI_PI >= 100 ? 'text-amber-500' : 'text-red-500'
  const roiColor      = r.hmlROI_PI >= 0.08 ? 'text-green-600' : r.hmlROI_PI >= 0.05 ? 'text-amber-500' : 'text-red-500'
  const dscrColor     = r.dscr >= 1.25 ? 'text-green-600' : r.dscr >= 1.0 ? 'text-amber-500' : 'text-red-500'

  const cocNoCapex = r.hmlMoneyInDeal > 0 ? (r.hmlNOI_PI + r.capexReserve) * 12 / r.hmlMoneyInDeal : 0
  const cocNoCapexColor = cocNoCapex >= 0.10 ? 'text-green-600' : cocNoCapex >= 0.06 ? 'text-amber-500' : 'text-red-500'
  const midColor = r.hmlMoneyInDeal <= 0 ? 'text-green-600' : r.hmlMoneyInDeal <= 65000 ? 'text-gray-900' : 'text-amber-600'

  return (
    <div className="space-y-2">
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

      {/* Equity card with book / liquidation toggle */}
      <div className="flex flex-col rounded-lg bg-gray-50 px-4 py-3">
        <span className="text-lg font-bold text-gray-900">{fmtCurrency(equityValue)}</span>
        {equitySub && <span className="mt-0.5 text-xs text-gray-500">{equitySub}</span>}
        <button
          type="button"
          onClick={() => openModal('equity_kpi')}
          className={clickableLabelCls}
          aria-label="Show formula for Equity post-Refi"
        >
          Equity post-Refi
        </button>
        <div className="mt-2 flex gap-1">
          <button
            type="button"
            onClick={() => setEquityView('book')}
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
              equityView === 'book'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
            }`}
          >Book</button>
          <button
            type="button"
            onClick={() => setEquityView('liquidation')}
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
              equityView === 'liquidation'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
            }`}
          >Liquidation</button>
        </div>
      </div>

      <KPICard
        label="DSCR"
        value={fmtNumber(r.dscr)}
        colorClass={dscrColor}
        metricId="dscr"
      />
    </div>

    {/* Secondary row: derived metrics */}
    <div className="grid grid-cols-3 gap-2">
      <KPICard
        label="CoC (w/o CapEx)"
        value={fmtPct(cocNoCapex)}
        colorClass={cocNoCapexColor}
      />
      <KPICard
        label="Money in Deal"
        value={fmtCurrency(r.hmlMoneyInDeal)}
        colorClass={midColor}
        metricId="money_in_deal"
      />
      <KPICard
        label="equity_SummaryBar"
        value={fmtPct(r.hmlEquityPctPostRefi)}
        colorClass="text-gray-900"
        metricId="equity_kpi"
      />
    </div>
    </div>
  )
}

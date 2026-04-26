'use client'
import { useModal } from '@/lib/modalContext'
import { fmtCurrency, fmtPct } from '@/lib/format'
import type { DealInputs, DealResults } from '@/lib/types'

interface Props { results: DealResults; inputs: DealInputs }

interface MAOMetricProps {
  label: string
  value: number
  pctBelow: number
  metricId: string
}

function MAOMetricCard({ label, value, pctBelow, metricId }: MAOMetricProps) {
  const openModal = useModal()
  return (
    <div className="flex flex-col rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <button
          type="button"
          onClick={() => openModal(metricId)}
          className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-[10px] font-bold text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-colors"
          aria-label="Show formula"
        >
          ?
        </button>
      </div>
      <span className="mt-1 text-xl font-bold text-gray-900">{fmtCurrency(value)}</span>
      {pctBelow > 0
        ? <span className="mt-0.5 text-xs text-gray-400">{fmtPct(pctBelow)} below asking</span>
        : <span className="mt-0.5 text-xs text-green-600">at or above asking</span>
      }
    </div>
  )
}

export default function MAOCard({ results: r, inputs: i }: Props) {
  const disc1 = i.purchasePrice > 0 ? (i.purchasePrice - r.mao1) / i.purchasePrice : 0
  const disc2 = i.purchasePrice > 0 ? (i.purchasePrice - r.mao2) / i.purchasePrice : 0
  const recommended   = Math.min(r.mao1, r.mao2)
  const discountColor = r.maoDiscount <= 0.1 ? 'text-green-600' : r.maoDiscount <= 0.2 ? 'text-amber-500' : 'text-red-500'

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <MAOMetricCard
          label="MAO — max $ in deal"
          value={r.mao1}
          pctBelow={disc1}
          metricId="mao1"
        />
        <MAOMetricCard
          label="MAO — min equity %"
          value={r.mao2}
          pctBelow={disc2}
          metricId="mao2"
        />
      </div>
      <div className="rounded-lg bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Recommended MAO</span>
          <span className={`text-lg font-bold ${discountColor}`}>{fmtCurrency(recommended)}</span>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          Use the lower of the two MAOs to satisfy both constraints.
        </p>
      </div>
    </div>
  )
}

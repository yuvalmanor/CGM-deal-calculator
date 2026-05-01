'use client'
import { useModal } from '@/lib/modalContext'
import type { DealResults, DealInputs } from '@/lib/types'

function mapLocationScore(raw: number): number {
  return raw >= 15 ? 10 : raw >= 12 ? 9 : raw >= 10 ? 8 : raw >= 9 ? 7 : 0
}

interface ScoreItemProps {
  label: string
  score: number
  bracket: string
  metricId: string
}

function ScoreItem({ label, score, bracket, metricId }: ScoreItemProps) {
  const openModal = useModal()
  const color = score >= 8 ? 'text-green-600' : score >= 5 ? 'text-amber-500' : 'text-red-500'

  return (
    <div className="flex flex-col items-center rounded-lg bg-gray-50 px-3 py-3 text-center">
      <button
        type="button"
        onClick={() => openModal(metricId)}
        className="text-xs font-medium text-gray-600 underline decoration-dashed decoration-gray-300 underline-offset-2 hover:text-blue-500 hover:decoration-blue-300 transition-colors cursor-pointer"
        aria-label={`Show formula for ${label}`}
      >
        {label}
      </button>
      <span className={`mt-1 text-xl font-bold ${color}`}>
        {score}<span className="text-sm font-normal text-gray-400">/10</span>
      </span>
      <span className="mt-1 text-[10px] leading-tight text-gray-400">{bracket}</span>
    </div>
  )
}

interface Props { results: DealResults; inputs: DealInputs }

export default function Scorecard({ results: r, inputs: i }: Props) {
  const locationScore = mapLocationScore(i.locationScore)
  const overall = (r.hmlEquityScore + r.hmlROIScore + locationScore) / 3
  const isGo = overall >= 7.0

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <ScoreItem
          label="Equity return"
          score={r.hmlEquityScore}
          bracket="equity vs capital · 35%=10 · 30%=9 · 20%=8"
          metricId="score_equity"
        />
        <ScoreItem
          label="ROI"
          score={r.hmlROIScore}
          bracket="10%=10 · 9%=9 · 8%=8 · 7%=7 · 6%=6 · 5%=5 · else 0"
          metricId="score_roi"
        />
        <ScoreItem
          label="Location"
          score={locationScore}
          bracket="A(15)=10 · B(12)=9 · C(10)=8 · D(9)=7 · else 0"
          metricId="score_location"
        />
      </div>
      <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
        <span className="text-sm font-medium text-gray-600">Overall Score</span>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">
            {overall.toFixed(1)}<span className="text-xs font-normal text-gray-400">/10</span>
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${isGo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {isGo ? 'GO' : 'NO-GO'}
          </span>
        </div>
      </div>
    </div>
  )
}

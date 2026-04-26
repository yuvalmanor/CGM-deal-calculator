'use client'
import { useState } from 'react'
import ScenarioHML    from './ScenarioHML'
import ScenarioCash   from './ScenarioCash'
import ScenarioFlipHML from './ScenarioFlipHML'
import type { DealResults, DealInputs } from '@/lib/types'

interface Props { results: DealResults; inputs: DealInputs }

type Tab = 'brrrr' | 'flip-cash' | 'flip-hml'

const TABS: { id: Tab; label: string }[] = [
  { id: 'brrrr',     label: 'Rental (BRRRR)' },
  { id: 'flip-cash', label: 'Fix & Flip – Cash' },
  { id: 'flip-hml',  label: 'Fix & Flip – HML' },
]

export default function ScenarioPanel({ results, inputs }: Props) {
  const [tab, setTab] = useState<Tab>('brrrr')

  return (
    <div>
      <div className="mb-4 flex rounded-xl border border-gray-200 bg-gray-50 p-1">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg py-2 text-xs font-medium transition-all ${
              tab === t.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'brrrr'     && <ScenarioHML     results={results} inputs={inputs} />}
      {tab === 'flip-cash' && <ScenarioCash    results={results} inputs={inputs} />}
      {tab === 'flip-hml'  && <ScenarioFlipHML results={results} inputs={inputs} />}
    </div>
  )
}

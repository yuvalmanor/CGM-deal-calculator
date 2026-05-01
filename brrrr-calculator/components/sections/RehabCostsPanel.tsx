'use client'
import type { RehabCost } from '@/lib/types'

interface Props {
  costs: RehabCost[]
  onChange: (costs: RehabCost[]) => void
}

function newCost(): RehabCost {
  return { id: Math.random().toString(36).slice(2), name: '', amount: 0, funded: false }
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

export default function RehabCostsPanel({ costs, onChange }: Props) {
  const update = (id: string, patch: Partial<RehabCost>) =>
    onChange(costs.map(c => c.id === id ? { ...c, ...patch } : c))

  const remove = (id: string) => onChange(costs.filter(c => c.id !== id))

  return (
    <div className="space-y-2">
      {costs.map(cost => (
        <div
          key={cost.id}
          className={`rounded-lg border px-3 py-2 transition-colors ${
            cost.funded ? 'border-sky-100 bg-sky-50/60' : 'border-amber-100 bg-amber-50/60'
          }`}
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={cost.name}
              onChange={e => update(cost.id, { name: e.target.value })}
              placeholder="Cost description"
              className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-amber-400 focus:outline-none"
            />
            <div className="relative flex-shrink-0">
              <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-sm text-gray-400">$</span>
              <input
                type="number"
                min="0"
                value={cost.amount || ''}
                onChange={e => update(cost.id, { amount: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className="w-24 rounded-md border border-gray-200 bg-white py-1.5 pl-6 pr-2 text-sm focus:border-amber-400 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => remove(cost.id)}
              className="flex-shrink-0 text-gray-300 transition-colors hover:text-red-400"
              aria-label="Remove cost"
            >
              <TrashIcon />
            </button>
          </div>

          {/* Funded / Not Funded pill toggle */}
          <div className="mt-1.5 flex">
            <div className="flex overflow-hidden rounded-full border border-gray-200 text-xs font-medium">
              <button
                type="button"
                onClick={() => update(cost.id, { funded: false })}
                className={`px-3 py-1 transition-colors ${
                  !cost.funded
                    ? 'bg-amber-500 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                Not Funded
              </button>
              <button
                type="button"
                onClick={() => update(cost.id, { funded: true })}
                className={`border-l border-gray-200 px-3 py-1 transition-colors ${
                  cost.funded
                    ? 'bg-sky-500 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                Funded
              </button>
            </div>
            <span className="ml-2 self-center text-[10px] text-gray-400">
              {cost.funded ? 'Added to HML loan' : 'Out-of-pocket'}
            </span>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...costs, newCost()])}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-gray-600"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        + Add rehab cost
      </button>
    </div>
  )
}

'use client'
import type { LenderFee } from '@/lib/types'

interface Props {
  fees: LenderFee[]
  onChange: (fees: LenderFee[]) => void
  label?: string
}

function newFee(): LenderFee {
  return { id: Math.random().toString(36).slice(2), name: '', amount: 0 }
}

export default function LenderCustomFeesPanel({ fees, onChange, label = 'Additional Fees' }: Props) {
  const update = (id: string, patch: Partial<LenderFee>) =>
    onChange(fees.map(f => f.id === id ? { ...f, ...patch } : f))

  const remove = (id: string) => onChange(fees.filter(f => f.id !== id))

  return (
    <div className="space-y-2">
      {fees.length > 0 && (
        <p className="text-xs font-medium text-gray-500">{label}</p>
      )}

      {fees.map(fee => (
        <div key={fee.id} className="flex items-center gap-2">
          <input
            type="text"
            value={fee.name}
            onChange={e => update(fee.id, { name: e.target.value })}
            placeholder="Fee name"
            className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-orange-400 focus:outline-none"
          />
          <div className="relative flex-shrink-0">
            <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-sm text-gray-400">$</span>
            <input
              type="number"
              min="0"
              value={fee.amount || ''}
              onChange={e => update(fee.id, { amount: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="w-24 rounded-md border border-gray-200 bg-white py-1.5 pl-6 pr-2 text-sm focus:border-orange-400 focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => remove(fee.id)}
            className="flex-shrink-0 text-gray-300 transition-colors hover:text-red-400"
            aria-label="Remove fee"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...fees, newFee()])}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-gray-600"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add fee
      </button>
    </div>
  )
}

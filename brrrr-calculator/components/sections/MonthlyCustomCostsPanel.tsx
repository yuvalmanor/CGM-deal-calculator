'use client'
import type { CustomExpense } from '@/lib/types'

interface Props {
  items: CustomExpense[]
  onChange: (items: CustomExpense[]) => void
}

function newItem(): CustomExpense {
  return { id: Math.random().toString(36).slice(2), name: '', amount: 0, frequency: 'monthly', funded: false }
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

export default function MonthlyCustomCostsPanel({ items, onChange }: Props) {
  const update = (id: string, patch: Partial<CustomExpense>) =>
    onChange(items.map(i => i.id === id ? { ...i, ...patch } : i))

  const remove = (id: string) => onChange(items.filter(i => i.id !== id))

  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className="flex items-center gap-2">
          <input
            type="text"
            value={item.name}
            onChange={e => update(item.id, { name: e.target.value })}
            placeholder="Expense name"
            className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-green-500 focus:outline-none"
          />
          <div className="relative flex-shrink-0">
            <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-sm text-gray-400">$</span>
            <input
              type="number"
              min="0"
              value={item.amount || ''}
              onChange={e => update(item.id, { amount: parseFloat(e.target.value) || 0 })}
              placeholder="0"
              className="w-28 rounded-md border border-gray-200 bg-white py-1.5 pl-6 pr-2 text-sm focus:border-green-500 focus:outline-none"
            />
            <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-gray-400">/mo</span>
          </div>
          <button
            type="button"
            onClick={() => remove(item.id)}
            className="flex-shrink-0 text-gray-300 transition-colors hover:text-red-400"
            aria-label="Remove expense"
          >
            <TrashIcon />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...items, newItem()])}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-gray-600"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        + Add monthly expense
      </button>
    </div>
  )
}

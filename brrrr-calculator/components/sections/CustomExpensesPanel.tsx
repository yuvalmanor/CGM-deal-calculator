'use client'
import type { CustomExpense } from '@/lib/types'

interface Props {
  expenses: CustomExpense[]
  onChange: (expenses: CustomExpense[]) => void
}

function newExpense(): CustomExpense {
  return { id: Math.random().toString(36).slice(2), name: '', amount: 0, frequency: 'monthly', funded: false }
}

const FREQ_LABELS: Record<CustomExpense['frequency'], string> = {
  'monthly': '$/mo',
  'annual': '$/yr',
  'one-time': '$',
}

export default function CustomExpensesPanel({ expenses, onChange }: Props) {
  const update = (id: string, patch: Partial<CustomExpense>) =>
    onChange(expenses.map(e => e.id === id ? { ...e, ...patch } : e))

  const remove = (id: string) => onChange(expenses.filter(e => e.id !== id))

  const hasFunded = expenses.some(e => e.funded)

  return (
    <div className="space-y-2">
      {expenses.length === 0 && (
        <p className="py-4 text-center text-sm text-gray-400">
          No custom expenses yet — add utilities, landscaping, HOA, etc.
        </p>
      )}

      {expenses.map(expense => (
        <div
          key={expense.id}
          className={`rounded-lg border px-3 py-2 transition-colors ${
            expense.funded
              ? 'border-blue-100 bg-blue-50/50'
              : 'border-gray-200 bg-gray-50'
          }`}
        >
          {/* Row 1: name + amount */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={expense.name}
              onChange={e => update(expense.id, { name: e.target.value })}
              placeholder="Expense name"
              className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:border-green-500 focus:outline-none"
            />

            <div className="relative flex-shrink-0">
              <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-sm text-gray-400">$</span>
              <input
                type="number"
                min="0"
                value={expense.amount || ''}
                onChange={e => update(expense.id, { amount: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className="w-28 rounded-md border border-gray-200 bg-white py-1.5 pl-6 pr-2 text-sm focus:border-green-500 focus:outline-none"
              />
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-gray-400">
                {FREQ_LABELS[expense.frequency]}
              </span>
            </div>

            {/* Delete */}
            <button
              type="button"
              onClick={() => remove(expense.id)}
              className="flex-shrink-0 text-gray-300 transition-colors hover:text-red-400"
              aria-label="Remove expense"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Row 2: frequency + funded toggles */}
          <div className="mt-1.5 flex flex-wrap gap-2">
            {/* Frequency pill toggle */}
            <div className="flex overflow-hidden rounded-md border border-gray-200 text-xs font-medium">
              {(['one-time', 'monthly', 'annual'] as const).map(freq => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => update(expense.id, { frequency: freq })}
                  className={`px-2.5 py-1 capitalize transition-colors ${
                    expense.frequency === freq
                      ? 'bg-gray-700 text-white'
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  } ${freq !== 'one-time' ? 'border-l border-gray-200' : ''}`}
                >
                  {freq}
                </button>
              ))}
            </div>

            {/* Funded toggle */}
            <div className="flex overflow-hidden rounded-md border border-gray-200 text-xs font-medium">
              <button
                type="button"
                onClick={() => update(expense.id, { funded: false })}
                className={`px-2.5 py-1 transition-colors ${
                  !expense.funded
                    ? 'bg-gray-700 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                Not funded
              </button>
              <button
                type="button"
                disabled
                title="Coming soon — funded expenses will be added to the loan amount"
                className="cursor-not-allowed border-l border-gray-200 bg-white px-2.5 py-1 text-gray-300"
              >
                Funded (soon)
              </button>
            </div>
          </div>
        </div>
      ))}

      {hasFunded && (
        <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-500">
          · Funded expenses are shown but not yet included in loan or cash flow calculations — full support coming soon.
        </p>
      )}

      <button
        type="button"
        onClick={() => onChange([...expenses, newExpense()])}
        className="flex items-center gap-1.5 text-sm font-medium text-green-600 transition-colors hover:text-green-700"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Add Expense
      </button>
    </div>
  )
}

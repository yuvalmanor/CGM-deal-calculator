import { fmtCurrency } from '@/lib/format'
import type { CustomExpense } from '@/lib/types'

interface Props { expenses: CustomExpense[] }

const FREQ_LABEL: Record<CustomExpense['frequency'], string> = {
  'one-time': '$ one-time',
  monthly:    '$/mo',
  annual:     '$/yr',
}

export default function CustomExpensesSummary({ expenses }: Props) {
  const visible = expenses.filter(e => !e.funded)
  if (visible.length === 0) return null

  return (
    <div className="space-y-2">
      {visible.map(e => {
        const flow = e.frequency === 'one-time' ? 'Deal anatomy — one-time' : 'Monthly P&L'
        return (
          <div key={e.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="text-sm text-gray-700">{e.name || 'Unnamed'}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{fmtCurrency(e.amount)}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                {FREQ_LABEL[e.frequency]}
              </span>
              <span className="text-xs text-gray-400">{flow}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

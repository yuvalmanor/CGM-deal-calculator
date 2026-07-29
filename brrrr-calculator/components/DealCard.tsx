'use client'
import { useRouter } from 'next/navigation'
import type { DealSummary } from '@/lib/sheets'

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function DealCard({
  deal,
  selectable = false,
  selected = false,
  onToggleSelect,
}: {
  deal: DealSummary
  /** In select mode the card toggles selection instead of opening the deal. */
  selectable?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}) {
  const router = useRouter()
  const isGo = deal.score >= 7.0
  const date = new Date(deal.savedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  // A row the calculator has never saved (a raw CGM-DealDesk triage row) has no
  // score or NOI — showing 0.0/NO-GO/$0 would read as a verdict on the deal
  // rather than "not run yet", so those figures are withheld until it is analyzed.
  const dash = <span className="text-gray-300">—</span>

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Delete "${deal.address || 'this deal'}"? This cannot be undone.`)) return
    await fetch(`/api/deals/${deal.id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div
      onClick={() => (selectable ? onToggleSelect?.(deal.id) : router.push(`/deal/${deal.id}`))}
      className={`cursor-pointer rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow ${
        selected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        {selectable && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect?.(deal.id)}
            onClick={e => e.stopPropagation()}
            aria-label={`Select ${deal.address || 'Untitled Deal'}`}
            className="mt-1 h-4 w-4 flex-shrink-0 cursor-pointer accent-blue-600"
          />
        )}
        <h3 className="min-w-0 flex-1 font-semibold text-gray-900 leading-snug line-clamp-2">
          {deal.address || 'Untitled Deal'}
        </h3>
        {deal.analyzed ? (
          <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${isGo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
            {isGo ? 'GO' : 'NO-GO'}
          </span>
        ) : (
          <span className="flex-shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
            NEW
          </span>
        )}
      </div>

      <p className="text-xs text-gray-400 mb-3">
        {deal.analyzed ? `${deal.score.toFixed(1)}/10` : 'Not analyzed yet'}
      </p>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-gray-400">ARV</p>
          <p className="text-sm font-medium text-gray-800">{deal.arv ? fmt(deal.arv) : dash}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">In Deal</p>
          <p className="text-sm font-medium text-gray-800">
            {deal.analyzed ? fmt(deal.moneyInDeal) : dash}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">NOI/mo</p>
          <p className={`text-sm font-medium ${deal.monthlyNOI >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {deal.analyzed ? fmt(deal.monthlyNOI) : dash}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">{date}</span>
        {/* In select mode the toolbar's bulk delete owns deleting — a second,
            single-deal Delete here only invites a mis-click. */}
        {!selectable && (
          <button
            type="button"
            onClick={handleDelete}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

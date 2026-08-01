'use client'
import { useRouter } from 'next/navigation'
import type { DealSummary } from '@/lib/sheets'

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

/** One figure in the card's grid. A missing number reads as a dash, never as $0. */
function Fact({ label, value, className = 'text-gray-800' }: {
  label: string
  value: React.ReactNode
  className?: string
}) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-sm font-medium ${className}`}>{value}</p>
    </div>
  )
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

  // Any figure can be 0 on a triage row that never captured it — an unknown, so
  // it shows as a dash rather than "Built 0" / "$0". Likewise a row the
  // calculator has never saved has no score, money-in-deal or NOI: showing
  // 0.0/NO-GO/$0 would read as a verdict on the deal rather than "not run yet",
  // so those two are withheld until it is analyzed.
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

      {/* Property facts first, then what the analysis made of them. */}
      <div className="grid grid-cols-3 gap-x-3 gap-y-2">
        <Fact label="Purchase" value={deal.purchasePrice > 0 ? fmt(deal.purchasePrice) : dash} />
        <Fact label="SqFt" value={deal.sqft > 0 ? deal.sqft.toLocaleString('en-US') : dash} />
        <Fact label="Built" value={deal.yearBuilt > 0 ? String(deal.yearBuilt) : dash} />
        <Fact label="ARV" value={deal.arv > 0 ? fmt(deal.arv) : dash} />
        <Fact label="In Deal" value={deal.analyzed ? fmt(deal.moneyInDeal) : dash} />
        <Fact
          label="NOI/mo"
          value={deal.analyzed ? fmt(deal.monthlyNOI) : dash}
          className={deal.monthlyNOI >= 0 ? 'text-green-700' : 'text-red-600'}
        />
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

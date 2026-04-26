'use client'
import { useRouter } from 'next/navigation'
import type { DealSummary } from '@/lib/sheets'

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function DealCard({ deal }: { deal: DealSummary }) {
  const router = useRouter()
  const isGo = deal.score >= 7.0
  const date = new Date(deal.savedAt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm(`Delete "${deal.address || 'this deal'}"? This cannot be undone.`)) return
    await fetch(`/api/deals/${deal.id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div
      onClick={() => router.push(`/deal/${deal.id}`)}
      className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2">
          {deal.address || 'Untitled Deal'}
        </h3>
        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${isGo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          {isGo ? 'GO' : 'NO-GO'}
        </span>
      </div>

      <p className="text-xs text-gray-400 mb-3">{deal.score.toFixed(1)}/10</p>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-xs text-gray-400">ARV</p>
          <p className="text-sm font-medium text-gray-800">{fmt(deal.arv)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">In Deal</p>
          <p className="text-sm font-medium text-gray-800">{fmt(deal.moneyInDeal)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">NOI/mo</p>
          <p className={`text-sm font-medium ${deal.monthlyNOI >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {fmt(deal.monthlyNOI)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">{date}</span>
        <button
          type="button"
          onClick={handleDelete}
          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

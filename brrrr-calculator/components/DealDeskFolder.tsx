import Link from 'next/link'
import type { DealSummary } from '@/lib/sheets'

/**
 * Folder tile for deals pushed in by CGM-DealDesk triage.
 * Renders nothing when there are none, so the dashboard is unchanged for anyone
 * whose sheet has no triage rows.
 */
export default function DealDeskFolder({ deals }: { deals: DealSummary[] }) {
  if (deals.length === 0) return null

  const unreviewed = deals.filter(d => !d.analyzed).length
  const latest = deals.reduce<string>((max, d) => (d.savedAt > max ? d.savedAt : max), '')
  const latestLabel = latest
    ? new Date(latest).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null

  return (
    <Link
      href="/deal-desk"
      className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 6v3.776" />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-semibold text-gray-900">Deal Desk</h2>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {deals.length} {deals.length === 1 ? 'deal' : 'deals'}
          </span>
          {unreviewed > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {unreviewed} not analyzed
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-sm text-gray-400">
          Pushed in from CGM-DealDesk triage
          {latestLabel && ` · latest ${latestLabel}`}
        </p>
      </div>

      <span className="flex-shrink-0 text-gray-300 transition-colors group-hover:text-gray-500" aria-hidden="true">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </span>
    </Link>
  )
}

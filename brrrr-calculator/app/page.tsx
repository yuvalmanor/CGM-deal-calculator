import { getDeals } from '@/lib/cached-deals'
import { splitBySource } from '@/lib/deal-source'
import DealFilters from '@/components/DealFilters'
import DealDeskFolder from '@/components/DealDeskFolder'
import SiteHeader from '@/components/SiteHeader'

export default async function DashboardPage() {
  // Deal Desk (triage) deals live in their own folder at /deal-desk, not here.
  const { own, dealDesk } = splitBySource(await getDeals())

  return (
    <div className="min-h-full bg-gray-50">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Deals</h1>
          <p className="text-sm text-gray-400 mt-1">All saved BRRRR analyses</p>
        </div>
        <a
          href="/deal/new"
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition"
        >
          + Analyze New Deal
        </a>
      </div>

      <DealDeskFolder deals={dealDesk} />

      {own.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-gray-700">No deals saved yet</h2>
          <p className="mt-1 text-sm text-gray-400">
            Analyze a deal and click &ldquo;Save Deal&rdquo; to see it here.
          </p>
          <a
            href="/deal/new"
            className="mt-4 inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition"
          >
            Analyze New Deal
          </a>
        </div>
      ) : (
        <DealFilters deals={own} />
      )}
    </div>
      </main>
    </div>
  )
}

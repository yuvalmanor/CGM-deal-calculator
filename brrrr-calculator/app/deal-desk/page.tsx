import Link from 'next/link'
import { getDeals } from '@/lib/cached-deals'
import { splitBySource } from '@/lib/deal-source'
import DealFilters from '@/components/DealFilters'
import SiteHeader from '@/components/SiteHeader'

export const metadata = {
  title: 'Deal Desk — CGM Ventures Deal Calculator',
}

export default async function DealDeskPage() {
  const { dealDesk } = splitBySource(await getDeals())
  const unreviewed = dealDesk.filter(d => !d.analyzed).length

  return (
    <div className="min-h-full bg-gray-50">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="space-y-6">
          <div>
            <Link href="/" className="text-sm text-gray-400 transition hover:text-gray-700">
              ← My Deals
            </Link>
            <div className="mt-2 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Deal Desk</h1>
                <p className="mt-1 text-sm text-gray-400">
                  Deals pushed in from CGM-DealDesk triage
                  {unreviewed > 0 && ` · ${unreviewed} not analyzed yet`}
                </p>
              </div>
            </div>
          </div>

          {dealDesk.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white px-6 py-16 text-center">
              <h2 className="text-base font-semibold text-gray-700">Nothing from Deal Desk yet</h2>
              <p className="mt-1 text-sm text-gray-400">
                Deals sent over by triage show up here automatically.
              </p>
            </div>
          ) : (
            <DealFilters deals={dealDesk} />
          )}
        </div>
      </main>
    </div>
  )
}

// server-side only — wraps listDeals() so the dashboard and the Deal Desk folder
// share one cache entry instead of each holding its own copy of the same fetch.
import { unstable_cache } from 'next/cache'
import { listDeals } from '@/lib/sheets'
import type { DealSummary } from '@/lib/sheets'

const getCachedDeals = unstable_cache(
  () => listDeals(),
  ['deals-list'],
  { revalidate: 60, tags: ['deals'] },
)

/** All saved deals, or [] when Sheets is unconfigured/unreachable (callers show an empty state). */
export async function getDeals(): Promise<DealSummary[]> {
  try {
    return await getCachedDeals()
  } catch {
    return []
  }
}

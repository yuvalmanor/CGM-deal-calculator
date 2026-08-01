// server-side only — wraps listDeals() so the dashboard and the Deal Desk folder
// share one cache entry instead of each holding its own copy of the same fetch.
import { unstable_cache } from 'next/cache'
import { listDeals } from '@/lib/sheets'
import type { DealSummary } from '@/lib/sheets'

// The key is versioned, and the version MUST be bumped whenever DealSummary
// gains or loses a field. Vercel's Data Cache outlives a deployment: a new build
// prerenders against whatever the old build left under this key, so adding a
// field without bumping ships a dashboard rendering deals that are missing it
// until something calls revalidateTag('deals'). v2 = purchasePrice + yearBuilt.
const getCachedDeals = unstable_cache(
  () => listDeals(),
  ['deals-list-v2'],
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

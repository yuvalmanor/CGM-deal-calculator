// server-side only — wraps listDeals() so the dashboard and the Deal Desk folder
// share one cache entry instead of each holding its own copy of the same fetch.
import { unstable_cache } from 'next/cache'
import { listDeals } from '@/lib/sheets'
import type { DealSummary } from '@/lib/sheets'

// The key is versioned, and the version MUST be bumped whenever DealSummary
// gains or loses a field. Vercel's Data Cache outlives a deployment: a new build
// prerenders against whatever the old build left under this key, so adding a
// field without bumping ships a dashboard rendering deals that are missing it
// until something calls revalidateTag('deals'). Bump it too when a field's
// derivation changes, not just its presence: the cached rows are already-computed
// values, so a stale entry serves the old derivation. v2 = purchasePrice +
// yearBuilt, v3 = sqft (and arv now read from inputsJson rather than column E),
// v4 = score recomputed from inputsJson rather than read from column D,
// v5 = strategy + score under the Deal's Strategy (B&H score for B&H Deals).
const getCachedDeals = unstable_cache(
  () => listDeals(),
  ['deals-list-v5'],
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

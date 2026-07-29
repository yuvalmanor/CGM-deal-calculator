import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { deleteDeals } from '@/lib/sheets'

// POST rather than DELETE: the id list travels in the body, and bodies on DELETE
// requests are not reliably forwarded by every proxy in front of the app.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const ids: unknown = body?.ids

    if (!Array.isArray(ids) || ids.length === 0 || !ids.every(id => typeof id === 'string' && id)) {
      return NextResponse.json({ error: 'Expected a non-empty ids array' }, { status: 400 })
    }

    const result = await deleteDeals(ids as string[])
    revalidateTag('deals')
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('POST /api/deals/bulk-delete', err)
    return NextResponse.json({ error: 'Failed to delete deals' }, { status: 500 })
  }
}

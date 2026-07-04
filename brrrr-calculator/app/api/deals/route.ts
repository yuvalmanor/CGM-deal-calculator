import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { listDeals, saveDealV2 } from '@/lib/sheets'

export async function GET() {
  try {
    const deals = await listDeals()
    return NextResponse.json(deals)
  } catch (err) {
    console.error('GET /api/deals', err)
    return NextResponse.json({ error: 'Failed to load deals' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // flat payload: { address, score, arv, moneyInDeal, monthlyNOI, inputsJson, settingsJson }
    if (body.inputsJson === undefined) {
      return NextResponse.json({ error: 'Missing inputsJson' }, { status: 400 })
    }
    const id = await saveDealV2(body)
    revalidateTag('deals')
    return NextResponse.json({ id }, { status: 201 })
  } catch (err) {
    console.error('POST /api/deals', err)
    return NextResponse.json({ error: 'Failed to save deal' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { loadDeal, updateDealV2, deleteDeal } from '@/lib/sheets'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const deal = await loadDeal(params.id)
    return NextResponse.json(deal)
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('GET /api/deals/[id]', err)
    return NextResponse.json({ error: 'Failed to load deal' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json()

    // flat payload: { address, score, arv, moneyInDeal, monthlyNOI, inputsJson, settingsJson }
    if (body.inputsJson === undefined) {
      return NextResponse.json({ error: 'Missing inputsJson' }, { status: 400 })
    }
    await updateDealV2(params.id, body)
    revalidateTag('deals')
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('PUT /api/deals/[id]', err)
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    await deleteDeal(params.id)
    revalidateTag('deals')
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    console.error('DELETE /api/deals/[id]', err)
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 })
  }
}

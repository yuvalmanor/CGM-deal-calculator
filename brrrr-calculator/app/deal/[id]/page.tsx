import Link from 'next/link'
import { notFound } from 'next/navigation'
import { loadDeal } from '@/lib/sheets'
import DealCalculatorV2 from '@/components/DealCalculatorV2'
import { parseSavedDeal } from '@/lib/parse-saved-deal'

interface Props {
  params: { id: string }
}

export default async function DealPage({ params }: Props) {
  let rawInputs: unknown
  try {
    ;({ inputs: rawInputs } = await loadDeal(params.id))
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') notFound()
    throw err
  }

  const deal = parseSavedDeal(rawInputs)
  if (!deal) {
    // Fail loudly: rendering an unrecognized row as DEFAULT_DEAL would show
    // Anna TX numbers in place of the deal's actual data.
    return (
      <main className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-red-700">Can&apos;t open this deal</h1>
        <p className="mt-4 text-sm text-gray-600">
          The saved data for deal <code className="rounded bg-gray-100 px-1">{params.id}</code> is
          not in a shape this calculator recognizes, so it was not loaded. The row in{' '}
          <code className="rounded bg-gray-100 px-1">DEALS_APP</code> is untouched — inspect its{' '}
          <code className="rounded bg-gray-100 px-1">inputsJson</code> column in Google Sheets.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-blue-600 hover:underline">
          ← Back to dashboard
        </Link>
      </main>
    )
  }

  return <DealCalculatorV2 initialDeal={deal} initialDealId={params.id} />
}

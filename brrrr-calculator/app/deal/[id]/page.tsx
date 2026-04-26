import { notFound } from 'next/navigation'
import { loadDeal } from '@/lib/sheets'
import DealCalculator from '@/components/DealCalculator'

interface Props {
  params: { id: string }
}

export default async function DealPage({ params }: Props) {
  let inputs, settings
  try {
    ;({ inputs, settings } = await loadDeal(params.id))
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') notFound()
    throw err
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <a
          href="/"
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-700 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Deals
        </a>
        <span className="text-gray-300">/</span>
        <h1 className="text-lg font-semibold text-gray-900">{inputs.address || 'Deal'}</h1>
      </div>
      <DealCalculator initialInputs={inputs} initialSettings={settings} initialDealId={params.id} />
    </div>
  )
}

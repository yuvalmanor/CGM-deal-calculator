import DealCalculator from '@/components/DealCalculator'

export default function NewDealPage() {
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
        <h1 className="text-lg font-semibold text-gray-900">New Deal</h1>
      </div>
      <DealCalculator />
    </div>
  )
}

'use client'
import { useEffect } from 'react'
import { formulaRegistry } from '@/lib/formulaRegistry'
import type { DealInputs, DealResults } from '@/lib/types'

interface Props {
  isOpen: boolean
  onClose: () => void
  metricId: string | null
  results: DealResults
  inputs: DealInputs
}

export default function FormulaModal({ isOpen, onClose, metricId, results, inputs }: Props) {
  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen || !metricId) return null

  const entry = formulaRegistry[metricId]
  if (!entry) return null

  const liveCalc = entry.calcFn(results, inputs)

  return (
    // Backdrop — fills the position:relative parent (right panel)
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
      onClick={onClose}
    >
      {/* Modal card */}
      <div
        className="relative w-full max-w-sm rounded-xl border border-gray-200 bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <h3 className="text-sm font-semibold text-gray-900">{entry.title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3 px-5 py-4">
          {/* Formula */}
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Formula</p>
            <p className="rounded-md bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700 whitespace-pre-wrap">
              {entry.formula}
            </p>
          </div>

          {/* Live calculation */}
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Live values</p>
            <p className="rounded-md bg-gray-50 px-3 py-2 font-mono text-xs text-gray-700 whitespace-pre-wrap">
              {liveCalc}
            </p>
          </div>

          {/* Note */}
          {entry.note && (
            <>
              <div className="border-t border-gray-100" />
              <p className="text-xs leading-relaxed text-gray-500">{entry.note}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

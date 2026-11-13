'use client'
import { useEffect } from 'react'
import { formulaRegistry } from '@/lib/formulaRegistry'
import type { Deal, BRRRRResult, MAOResult, DealScore } from '@/lib/deal-model'
import type { BuyHoldResult } from '@/lib/buy-hold'

interface Props {
  isOpen: boolean
  onClose: () => void
  metricId: string | null
  deal: Deal
  brrrr: BRRRRResult
  mao: MAOResult
  score: DealScore
  bnh: BuyHoldResult
  bnhScore: DealScore
}

export default function FormulaModal({ isOpen, onClose, metricId, deal, brrrr, mao, score, bnh, bnhScore }: Props) {
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen || !metricId) return null
  const entry = formulaRegistry[metricId]
  if (!entry) return null

  const liveCalc = entry.calcFn(deal, brrrr, mao, score, bnh, bnhScore)

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-xl border border-[color:var(--line)] bg-[color:var(--bg-card)] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[color:var(--line-faint)] px-5 py-4">
          <h3 className="text-sm font-semibold text-[color:var(--text)]">{entry.title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-md p-1 text-[color:var(--text-faint)] hover:bg-[color:var(--bg-card-2)] hover:text-[color:var(--text)] transition-colors"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--accent)]">Formula</p>
            <p className="rounded-md bg-[color:var(--bg)] px-3 py-2 tabular-nums text-xs text-[color:var(--text)] whitespace-pre-wrap">{entry.formula}</p>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[color:var(--accent)]">Live values</p>
            <p className="rounded-md bg-[color:var(--bg)] px-3 py-2 tabular-nums text-xs text-[color:var(--text)] whitespace-pre-wrap">{liveCalc}</p>
          </div>
          {entry.note && (
            <>
              <div className="border-t border-[color:var(--line-faint)]" />
              <p className="text-xs leading-relaxed text-[color:var(--text-mute)]">{entry.note}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

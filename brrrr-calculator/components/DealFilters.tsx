'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DealCard from './DealCard'
import { DEFAULT_SORT, SORT_OPTIONS, sortDeals, type SortKey } from '@/lib/deal-sort'
import type { DealSummary } from '@/lib/sheets'

/** Addresses listed in the confirm dialog before the rest are summarised. */
const CONFIRM_LIST_LIMIT = 10

export default function DealFilters({ deals }: { deals: DealSummary[] }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Sort once and reuse: the cards and the "Jump to deal…" list stay in step.
  const ordered = sortDeals(deals, sort)
  const q = search.trim().toLowerCase()
  const filtered = q
    ? ordered.filter(d => d.address.toLowerCase().includes(q))
    : ordered

  // A selected deal that the search has since hidden stays selected — the confirm
  // dialog names every deal by address, so nothing gets deleted unseen.
  const selectedDeals = deals.filter(d => selected.includes(d.id))
  const allVisibleSelected =
    filtered.length > 0 && filtered.every(d => selected.includes(d.id))

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value
    if (id) router.push(`/deal/${id}`)
  }

  function toggle(id: string) {
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelected([])
    setError(null)
  }

  function toggleAllVisible() {
    const visibleIds = filtered.map(d => d.id)
    setSelected(prev =>
      allVisibleSelected
        ? prev.filter(id => !visibleIds.includes(id))
        : [...prev, ...visibleIds.filter(id => !prev.includes(id))],
    )
  }

  function confirmMessage() {
    const names = selectedDeals.map(d => d.address || 'Untitled Deal')
    const shown = names.slice(0, CONFIRM_LIST_LIMIT).map(n => `• ${n}`).join('\n')
    const rest = names.length - CONFIRM_LIST_LIMIT
    const more = rest > 0 ? `\n…and ${rest} more` : ''
    const count = `${names.length} ${names.length === 1 ? 'deal' : 'deals'}`
    return `Delete ${count}?\n\n${shown}${more}\n\nThis cannot be undone.`
  }

  async function handleBulkDelete() {
    if (selectedDeals.length === 0 || deleting) return
    if (!confirm(confirmMessage())) return

    setDeleting(true)
    setError(null)
    try {
      const res = await fetch('/api/deals/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedDeals.map(d => d.id) }),
      })
      if (!res.ok) throw new Error(`Delete failed (${res.status})`)
      exitSelectMode()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Search by address…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={sort}
          onChange={e => setSort(e.target.value as SortKey)}
          aria-label="Sort deals"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-56"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          defaultValue=""
          onChange={handleSelect}
          aria-label="Jump to deal"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-60"
        >
          <option value="" disabled>Jump to deal…</option>
          {ordered.map(d => (
            <option key={d.id} value={d.id}>
              {d.address || 'Untitled Deal'}
            </option>
          ))}
        </select>
      </div>

      {selectMode ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
          <span className="text-sm font-medium text-gray-700">
            {selectedDeals.length} selected
          </span>
          <button
            type="button"
            onClick={toggleAllVisible}
            disabled={filtered.length === 0}
            className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-300"
          >
            {allVisibleSelected ? 'Deselect all' : 'Select all'}
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={exitSelectMode}
              className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={selectedDeals.length === 0 || deleting}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400"
            >
              {deleting ? 'Deleting…' : `Delete${selectedDeals.length ? ` (${selectedDeals.length})` : ''}`}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setSelectMode(true)}
            className="text-sm text-gray-500 transition hover:text-gray-800"
          >
            Select deals
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">
          No deals match &ldquo;{search}&rdquo;
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(deal => (
            <DealCard
              key={deal.id}
              deal={deal}
              selectable={selectMode}
              selected={selected.includes(deal.id)}
              onToggleSelect={toggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

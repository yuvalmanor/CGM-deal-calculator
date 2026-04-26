'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DealCard from './DealCard'
import type { DealSummary } from '@/lib/sheets'

export default function DealFilters({ deals }: { deals: DealSummary[] }) {
  const [search, setSearch] = useState('')
  const router = useRouter()

  const q = search.trim().toLowerCase()
  const filtered = q
    ? deals.filter(d => d.address.toLowerCase().includes(q))
    : deals

  function handleSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value
    if (id) router.push(`/deal/${id}`)
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
          defaultValue=""
          onChange={handleSelect}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-72"
        >
          <option value="" disabled>Jump to deal…</option>
          {deals.map(d => (
            <option key={d.id} value={d.id}>
              {d.address || 'Untitled Deal'}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-gray-400">
          No deals match &ldquo;{search}&rdquo;
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(deal => (
            <DealCard key={deal.id} deal={deal} />
          ))}
        </div>
      )}
    </div>
  )
}

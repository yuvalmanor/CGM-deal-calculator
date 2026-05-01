'use client'
interface Props {
  title: string
  subtitle?: string
  accent?: string
  bg?: string
  children: React.ReactNode
  className?: string
  collapsible?: boolean
  defaultOpen?: boolean
}

import { useState } from 'react'

export default function Card({ title, subtitle, accent, bg, children, className = '', collapsible = false, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className={`rounded-xl border border-gray-200 ${bg ?? 'bg-white'} shadow-sm ${className}`}>
      <div
        className={`flex items-center justify-between px-5 py-4 ${collapsible ? 'cursor-pointer select-none' : ''}`}
        onClick={collapsible ? () => setOpen(o => !o) : undefined}
      >
        <div className="flex items-center gap-3">
          {accent && (
            <div className={`h-5 w-1 rounded-full ${accent}`} />
          )}
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>
        </div>
        {collapsible && (
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </div>
      {open && (
        <div className="border-t border-gray-100 px-5 py-4">
          {children}
        </div>
      )}
    </div>
  )
}

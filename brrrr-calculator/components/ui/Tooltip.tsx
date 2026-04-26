'use client'
import { useState } from 'react'

interface Props {
  content: string
  formula?: string
}

export default function Tooltip({ content, formula }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative inline-flex flex-shrink-0">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-colors cursor-help"
        aria-label="Show formula"
      >
        ?
      </button>
      {open && (
        <div className="absolute right-0 top-5 z-50 w-60 rounded-lg border border-gray-200 bg-white p-3 shadow-xl pointer-events-none">
          <p className="text-xs text-gray-600 leading-relaxed">{content}</p>
          {formula && (
            <p className="mt-2 rounded-md bg-gray-50 border border-gray-100 px-2 py-1.5 font-mono text-[11px] text-gray-700 leading-relaxed whitespace-pre-wrap">
              {formula}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

'use client'
import { useModal } from '@/lib/modalContext'

interface Props {
  label: string
  value: string
  sub?: string
  highlight?: 'green' | 'red' | 'yellow' | 'blue' | 'none'
  bold?: boolean
  indent?: boolean
  separator?: boolean
  metricId?: string
}

export default function ResultRow({
  label, value, sub,
  highlight = 'none', bold = false, indent = false, separator = false,
  metricId,
}: Props) {
  const openModal = useModal()

  const valueColors: Record<string, string> = {
    green:  'text-green-600',
    red:    'text-red-500',
    yellow: 'text-amber-500',
    blue:   'text-blue-600',
    none:   'text-gray-800',
  }

  return (
    <>
      {separator && <div className="my-2 border-t border-gray-100" />}
      <div className={`flex items-center justify-between py-1 ${indent ? 'pl-3' : ''}`}>
        <div className="flex items-center gap-1 min-w-0 mr-2">
          <span className={`text-sm ${bold ? 'font-semibold text-gray-800' : 'text-gray-500'} ${indent ? 'text-xs' : ''} truncate`}>
            {label}
          </span>
          {metricId && (
            <button
              type="button"
              onClick={() => openModal(metricId)}
              className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-400 hover:bg-blue-50 hover:text-blue-500 transition-colors cursor-pointer"
              aria-label="Show formula"
            >
              ?
            </button>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <span className={`text-sm font-medium ${valueColors[highlight]} ${bold ? 'font-bold' : ''}`}>
            {value}
          </span>
          {sub && <p className="text-xs text-gray-400">{sub}</p>}
        </div>
      </div>
    </>
  )
}

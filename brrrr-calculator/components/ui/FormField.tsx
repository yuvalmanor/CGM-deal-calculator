'use client'
import { useState, useRef } from 'react'
import { parseCurrency, parsePct } from '@/lib/format'

interface BaseProps {
  label: string
  hint?: string
  className?: string
}

interface TextFieldProps extends BaseProps {
  type: 'text'
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

interface NumberFieldProps extends BaseProps {
  type: 'currency' | 'percent' | 'integer'
  value: number
  onChange: (v: number) => void
  placeholder?: string
}

interface SelectFieldProps extends BaseProps {
  type: 'select'
  value: string
  onChange: (v: string) => void
  options: { label: string; value: string }[]
}

type Props = TextFieldProps | NumberFieldProps | SelectFieldProps

function formatDisplay(type: 'currency' | 'percent' | 'integer', value: number): string {
  if (value === 0) return ''
  if (type === 'currency') {
    return new Intl.NumberFormat('en-US').format(value)
  }
  if (type === 'percent') {
    return (value * 100).toString()
  }
  return value.toString()
}

export default function FormField(props: Props) {
  const { label, hint, className = '' } = props
  const [focused, setFocused] = useState(false)
  const [rawText, setRawText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const baseInput =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 ' +
    'placeholder-gray-400 shadow-sm transition focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20'

  if (props.type === 'select') {
    return (
      <div className={className}>
        <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
        <select
          value={props.value}
          onChange={e => props.onChange(e.target.value)}
          className={baseInput + ' cursor-pointer'}
        >
          {props.options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      </div>
    )
  }

  if (props.type === 'text') {
    return (
      <div className={className}>
        <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
        <input
          type="text"
          value={props.value}
          onChange={e => props.onChange(e.target.value)}
          placeholder={props.placeholder ?? ''}
          className={baseInput}
        />
        {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      </div>
    )
  }

  // numeric types
  const { type, value, onChange } = props as NumberFieldProps

  const displayValue = focused ? rawText : (value === 0 ? '' : formatDisplay(type, value))
  const prefix = type === 'currency' ? '$' : null
  const suffix = type === 'percent' ? '%' : null

  function handleFocus() {
    setRawText(value === 0 ? '' : formatDisplay(type, value))
    setFocused(true)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9.]/g, '')
    setRawText(raw)
  }

  function handleBlur() {
    setFocused(false)
    const n = parseFloat(rawText)
    if (isNaN(n)) { onChange(0); return }
    onChange(type === 'percent' ? n / 100 : n)
  }

  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-gray-400">
            {prefix}
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onFocus={handleFocus}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={props.placeholder ?? '0'}
          className={baseInput + (prefix ? ' pl-7' : '') + (suffix ? ' pr-8' : '')}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-gray-400">
            {suffix}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

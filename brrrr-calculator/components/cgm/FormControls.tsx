'use client'
import { useState, useEffect } from 'react'
import type { Deal, ExtraFee, MonthlyLine, RehabAdditionalCost } from '@/lib/deal-model'
import { newUid } from '@/lib/deal-model'
import { formatPppSchedule, parsePppSchedule } from '@/lib/ppp-schedule'

// ---- FieldLabel ----
interface FieldLabelProps {
  label: string
  hint?: string
  right?: React.ReactNode
}
export function FieldLabel({ label, hint, right }: FieldLabelProps) {
  return (
    <div className="field-label">
      <span>{label}</span>
      {hint && <span className="field-hint" title={hint}>?</span>}
      {right && <span className="field-label-right">{right}</span>}
    </div>
  )
}

// ---- NumberField ----
interface NumberFieldProps {
  label: string
  value: number
  onChange: (v: number) => void
  prefix?: string
  suffix?: string
  hint?: string
  labelRight?: React.ReactNode
  helper?: string
}
// A field nobody has filled in holds 0, and shows as an empty box rather than
// a literal "0" — blank and zero are the same number to the engine.
function display(value: number): string {
  return value === 0 ? '' : String(value ?? '')
}

export function NumberField({ label, value, onChange, prefix, suffix, hint, labelRight, helper }: NumberFieldProps) {
  const [local, setLocal] = useState(() => display(value))
  useEffect(() => { setLocal(display(value)) }, [value])

  const commit = (v: string) => {
    const cleaned = v.replace(/,/g, '')
    const num = cleaned === '' || cleaned === '-' ? 0 : Number(cleaned)
    if (!Number.isNaN(num)) onChange(num)
  }

  return (
    <label className="field">
      <FieldLabel label={label} hint={hint} right={labelRight} />
      <div className={`input-shell${prefix ? ' has-prefix' : ''}${suffix ? ' has-suffix' : ''}`}>
        {prefix && <span className="affix">{prefix}</span>}
        <input
          type="text"
          inputMode="decimal"
          value={local}
          placeholder="0"
          onChange={(e) => setLocal(e.target.value.replace(/[^0-9.\-]/g, ''))}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        />
        {suffix && <span className="affix suffix">{suffix}</span>}
      </div>
      {helper && <div className="field-helper">{helper}</div>}
    </label>
  )
}

// ---- PppScheduleField ----
// Yearly prepayment-penalty percentages as one text field: "5,5,5" or "5/4/3".
// Blur-to-commit like NumberField; unparseable input shows a hint and does not commit.

interface PppScheduleFieldProps {
  label: string
  value: number[]
  onChange: (v: number[]) => void
  hint?: string
  helper?: string
}
export function PppScheduleField({ label, value, onChange, hint, helper }: PppScheduleFieldProps) {
  const [local, setLocal] = useState(formatPppSchedule(value))
  const [invalid, setInvalid] = useState(false)
  useEffect(() => { setLocal(formatPppSchedule(value)); setInvalid(false) }, [value])

  const commit = (raw: string) => {
    const parsed = parsePppSchedule(raw)
    if (parsed === null) { setInvalid(true); return }
    setInvalid(false)
    onChange(parsed)
    setLocal(formatPppSchedule(parsed))
  }

  return (
    <label className="field">
      <FieldLabel label={label} hint={hint} />
      <div className="input-shell">
        <input
          type="text"
          inputMode="decimal"
          value={local}
          placeholder="e.g. 5, 5, 5"
          onChange={(e) => setLocal(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        />
      </div>
      {invalid
        ? <div className="field-helper" style={{ color: 'var(--bad, #b4382a)' }}>Use yearly percents like 5, 5, 5 or 5/4/3 — not saved</div>
        : helper && <div className="field-helper">{helper}</div>}
    </label>
  )
}

// ---- TextField ----
interface TextFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: string
  wide?: boolean
}
export function TextField({ label, value, onChange, placeholder, hint, wide }: TextFieldProps) {
  return (
    <label className={`field${wide ? ' field-wide' : ''}`}>
      <FieldLabel label={label} hint={hint} />
      <div className="input-shell">
        <input
          type="text"
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </label>
  )
}

// ---- SelectField ----
interface SelectFieldProps {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<string | { value: string; label: string }>
  hint?: string
}
export function SelectField({ label, value, onChange, options, hint }: SelectFieldProps) {
  return (
    <label className="field">
      <FieldLabel label={label} hint={hint} />
      <div className="input-shell select-shell">
        <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => {
            const v = typeof o === 'string' ? o : o.value
            const l = typeof o === 'string' ? o : o.label
            return <option key={v} value={v}>{l}</option>
          })}
        </select>
        <span className="select-caret">▾</span>
      </div>
    </label>
  )
}

// ---- SegToggle ----
interface SegOption { value: string; label: string }
interface SegToggleProps {
  value: string
  onChange: (v: string) => void
  options: SegOption[]
}
export function SegToggle({ value, onChange, options }: SegToggleProps) {
  return (
    <div className="seg-toggle">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={`seg-opt${value === o.value ? ' active' : ''}`}
          onClick={() => onChange(o.value)}
        >{o.label}</button>
      ))}
    </div>
  )
}

// ---- Section ----
interface SectionProps {
  id: string
  eyebrow: string
  title: string
  subtitle?: string
  children: React.ReactNode
}
export function Section({ id, eyebrow, title, subtitle, children }: SectionProps) {
  return (
    <section className="form-section" data-section-id={id}>
      <header className="section-header">
        <div className="section-eyebrow">{eyebrow}</div>
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="section-subtitle">{subtitle}</p>}
      </header>
      <div className="field-grid">{children}</div>
    </section>
  )
}

// ---- Repeater (no unit) ----
interface RepeaterRowProps {
  row: ExtraFee
  onChange: (r: ExtraFee) => void
  onRemove: () => void
}
function RepeaterRow({ row, onChange, onRemove }: RepeaterRowProps) {
  return (
    <div className="repeater-row">
      <div className="input-shell">
        <input type="text" value={row.label ?? ''} placeholder="Description"
          onChange={(e) => onChange({ ...row, label: e.target.value })} />
      </div>
      <div className="input-shell has-prefix">
        <span className="affix">$</span>
        <input type="text" inputMode="decimal" value={row.amount ?? 0}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9.\-]/g, '')
            onChange({ ...row, amount: v === '' ? 0 : Number(v) })
          }} />
      </div>
      <button className="repeater-remove" onClick={onRemove} aria-label="Remove">×</button>
    </div>
  )
}

interface RepeaterProps {
  rows: ExtraFee[]
  onChange: (rows: ExtraFee[]) => void
  onAdd: () => void
  addLabel: string
}
export function Repeater({ rows, onChange, onAdd, addLabel }: RepeaterProps) {
  return (
    <div className="repeater field-wide">
      {(rows || []).map((r, i) => (
        <RepeaterRow
          key={r.id || i}
          row={r}
          onChange={(updated) => { const next = [...rows]; next[i] = updated; onChange(next) }}
          onRemove={() => onChange(rows.filter((_, j) => j !== i))}
        />
      ))}
      <button className="repeater-add" onClick={onAdd} type="button">+ {addLabel}</button>
    </div>
  )
}

// ---- Funded Repeater (for rehab additional costs with funded toggle) ----

interface FundedRepeaterRowProps {
  row: RehabAdditionalCost
  onChange: (r: RehabAdditionalCost) => void
  onRemove: () => void
}
function FundedRepeaterRow({ row, onChange, onRemove }: FundedRepeaterRowProps) {
  return (
    <div className="repeater-row repeater-row-funded">
      <div className="input-shell">
        <input type="text" value={row.label ?? ''} placeholder="Description"
          onChange={(e) => onChange({ ...row, label: e.target.value })} />
      </div>
      <div className="input-shell has-prefix">
        <span className="affix">$</span>
        <input type="text" inputMode="decimal" value={row.amount ?? 0}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9.\-]/g, '')
            onChange({ ...row, amount: v === '' ? 0 : Number(v) })
          }} />
      </div>
      <button
        type="button"
        className={`funded-toggle${row.funded ? ' funded' : ' unfunded'}`}
        onClick={() => onChange({ ...row, funded: !row.funded })}
        title={row.funded ? 'HML-funded — click to make cash' : 'Cash out-of-pocket — click to make HML-funded'}
      >
        {row.funded ? 'HML' : 'Cash'}
      </button>
      <button className="repeater-remove" onClick={onRemove} aria-label="Remove">×</button>
    </div>
  )
}

interface FundedRepeaterProps {
  rows: RehabAdditionalCost[]
  onChange: (rows: RehabAdditionalCost[]) => void
  onAdd: () => void
  addLabel: string
}
export function FundedRepeater({ rows, onChange, onAdd, addLabel }: FundedRepeaterProps) {
  return (
    <div className="repeater field-wide">
      {(rows || []).map((r, i) => (
        <FundedRepeaterRow
          key={r.id || i}
          row={r}
          onChange={(updated) => { const next = [...rows]; next[i] = updated; onChange(next) }}
          onRemove={() => onChange(rows.filter((_, j) => j !== i))}
        />
      ))}
      <button className="repeater-add" onClick={onAdd} type="button">+ {addLabel}</button>
    </div>
  )
}

// ---- Monthly Repeater (with /mo · /yr toggle) ----
const moYrOptions: SegOption[] = [{ value: 'mo', label: '/mo' }, { value: 'yr', label: '/yr' }]

interface MonthlyRepeaterRowProps {
  row: MonthlyLine
  onChange: (r: MonthlyLine) => void
  onRemove: () => void
}
function MonthlyRepeaterRow({ row, onChange, onRemove }: MonthlyRepeaterRowProps) {
  return (
    <div className="repeater-row">
      <div className="input-shell">
        <input type="text" value={row.label ?? ''} placeholder="Description"
          onChange={(e) => onChange({ ...row, label: e.target.value })} />
      </div>
      <div className="input-shell has-prefix">
        <span className="affix">$</span>
        <input type="text" inputMode="decimal" value={row.amount ?? 0}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9.\-]/g, '')
            onChange({ ...row, amount: v === '' ? 0 : Number(v) })
          }} />
      </div>
      <SegToggle
        value={row.unit || 'mo'}
        onChange={(v) => onChange({ ...row, unit: v as 'mo' | 'yr' })}
        options={moYrOptions}
      />
      <button className="repeater-remove" onClick={onRemove} aria-label="Remove">×</button>
    </div>
  )
}

interface MonthlyRepeaterProps {
  rows: MonthlyLine[]
  onChange: (rows: MonthlyLine[]) => void
  onAdd: () => void
  addLabel: string
}
export function MonthlyRepeater({ rows, onChange, onAdd, addLabel }: MonthlyRepeaterProps) {
  return (
    <div className="repeater field-wide">
      {(rows || []).map((r, i) => (
        <MonthlyRepeaterRow
          key={r.id || i}
          row={r}
          onChange={(updated) => { const next = [...rows]; next[i] = updated; onChange(next) }}
          onRemove={() => onChange(rows.filter((_, j) => j !== i))}
        />
      ))}
      <button className="repeater-add" onClick={onAdd} type="button">+ {addLabel}</button>
    </div>
  )
}

'use client'

// Per-role Term Sheet management: list by lender name, add (copy of selected),
// select (swap into the flat fields), delete. Phase 1 renders a plain list;
// the comparison table replaces it in a later phase.

export interface TermSheetRow {
  id: string
  name: string
  selected: boolean
}

interface Props {
  title: string
  rows: TermSheetRow[]
  onAdd: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export function TermSheetSection({ title, rows, onAdd, onSelect, onDelete }: Props) {
  return (
    <section className="ts-section">
      <div className="ts-header">
        <div className="out-group-title">{title}</div>
        <button className="ts-add" onClick={onAdd} title="Add a Term Sheet (copy of the selected one)">
          + Add Term Sheet
        </button>
      </div>
      <ul className="ts-list">
        {rows.map((r) => (
          <li key={r.id} className={`ts-item${r.selected ? ' selected' : ''}`}>
            <button
              className="ts-pick"
              onClick={() => onSelect(r.id)}
              title={r.selected ? 'Selected — the input form edits this Term Sheet' : 'Select this Term Sheet'}
            >
              <span className="ts-radio" aria-hidden="true" />
              <span className="ts-name">{r.name || 'Unnamed lender'}</span>
              {r.selected && <span className="ts-badge">Selected</span>}
            </button>
            {rows.length > 1 && (
              <button
                className="ts-delete"
                onClick={() => onDelete(r.id)}
                aria-label={`Delete Term Sheet ${r.name || 'Unnamed lender'}`}
                title="Delete this Term Sheet"
              >×</button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

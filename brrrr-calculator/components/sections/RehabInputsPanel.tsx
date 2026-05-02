'use client'
import FormField from '@/components/ui/FormField'
import RehabCostsPanel from './RehabCostsPanel'
import { fmtCurrency } from '@/lib/format'
import type { DealInputs } from '@/lib/types'

interface Props {
  inputs: DealInputs
  onChange: (updates: Partial<DealInputs>) => void
}

export default function RehabInputsPanel({ inputs, onChange }: Props) {
  const set = <K extends keyof DealInputs>(key: K) =>
    (v: DealInputs[K]) => onChange({ [key]: v } as Partial<DealInputs>)

  const autoRehabMonths = (inputs.rehabEstimate + inputs.changeOrders) / 30000
  const coMode = inputs.changeOrdersMode ?? 'percent'
  const coPct  = inputs.changeOrdersPct  ?? 0.10

  const defaultCosts = (inputs.rehabCustomCosts ?? []).filter(c => c.isDefault)
  const customCosts  = (inputs.rehabCustomCosts ?? []).filter(c => !c.isDefault)

  function handleRehabEstimateChange(v: number) {
    const updates: Partial<DealInputs> = { rehabEstimate: v }
    if (coMode === 'percent') updates.changeOrders = v * coPct
    onChange(updates)
  }

  function updateDefaultAmount(id: string, amount: number) {
    onChange({
      rehabCustomCosts: (inputs.rehabCustomCosts ?? []).map(c =>
        c.id === id ? { ...c, amount } : c
      ),
    })
  }

  return (
    <div className="space-y-3">

      {/* Rehab Estimate */}
      <FormField
        type="currency"
        label="Rehab Estimate"
        value={inputs.rehabEstimate}
        onChange={handleRehabEstimateChange}
        placeholder="30,000"
      />

      {/* Change Orders — % or $ toggle */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Change Orders</label>
        <div className="flex items-center gap-2">
          <div className="flex flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <button
              type="button"
              onClick={() => onChange({ changeOrdersMode: 'percent', changeOrders: inputs.rehabEstimate * coPct })}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${coMode === 'percent' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              % of Rehab
            </button>
            <button
              type="button"
              onClick={() => onChange({ changeOrdersMode: 'fixed' })}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${coMode === 'fixed' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Fixed $
            </button>
          </div>
          {coMode === 'percent' ? (
            <FormField
              type="percent"
              label=""
              value={coPct}
              onChange={v => onChange({ changeOrdersPct: v, changeOrders: inputs.rehabEstimate * v })}
              hint={inputs.rehabEstimate > 0 ? `≈ ${fmtCurrency(inputs.rehabEstimate * coPct)}` : 'of rehab'}
              placeholder="10"
              className="flex-1"
            />
          ) : (
            <FormField
              type="currency"
              label=""
              value={inputs.changeOrders}
              onChange={set('changeOrders')}
              placeholder="5,000"
              className="flex-1"
            />
          )}
        </div>
      </div>

      {/* Rehab Months */}
      <FormField
        type="integer"
        label="Rehab Months"
        value={inputs.rehabMonthsManual}
        onChange={set('rehabMonthsManual')}
        hint={`0 = auto (${autoRehabMonths.toFixed(1)} mo)`}
        placeholder="0"
      />

      {/* Pre-filled default entries */}
      {defaultCosts.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-gray-500">Default Entries</p>
          <div className="space-y-2">
            {defaultCosts.map(c => (
              <div key={c.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 rounded-md border border-transparent bg-amber-50/80 px-3 py-2 text-sm text-gray-700">
                  {c.name}
                </span>
                <div className="relative flex-shrink-0">
                  <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-sm text-gray-400">$</span>
                  <input
                    type="number"
                    min="0"
                    value={c.amount || ''}
                    onChange={e => updateDefaultAmount(c.id, parseFloat(e.target.value) || 0)}
                    className="w-28 rounded-md border border-gray-200 bg-white py-2 pl-7 pr-3 text-sm focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional rehab costs (user-added, non-default) */}
      <div>
        <p className="mb-2 text-xs font-medium text-gray-500">Additional Costs</p>
        <RehabCostsPanel
          costs={customCosts}
          onChange={updated => {
            const defaults = (inputs.rehabCustomCosts ?? []).filter(c => c.isDefault)
            onChange({ rehabCustomCosts: [...defaults, ...updated] })
          }}
        />
      </div>

    </div>
  )
}

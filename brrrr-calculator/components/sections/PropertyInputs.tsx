'use client'
import FormField from '@/components/ui/FormField'
import { fmtCurrency } from '@/lib/format'
import type { DealInputs } from '@/lib/types'

type Section = 'all' | 'property' | 'purchase' | 'piti' | 'settings'

interface Props {
  inputs: DealInputs
  onChange: (updates: Partial<DealInputs>) => void
  autoRehabMonths: number
  section?: Section
}

/* ── Frequency toggle ($/mo | $/yr) used for each monthly-expense field ── */
function FreqToggle({
  mode,
  onChange,
}: {
  mode: 'monthly' | 'annual'
  onChange: (m: 'monthly' | 'annual') => void
}) {
  return (
    <div className="flex flex-shrink-0 overflow-hidden rounded-md border border-gray-200 text-[10px] font-medium">
      <button
        type="button"
        onClick={() => onChange('monthly')}
        className={`px-2 py-0.5 transition-colors ${mode === 'monthly' ? 'bg-gray-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
      >
        /mo
      </button>
      <button
        type="button"
        onClick={() => onChange('annual')}
        className={`border-l border-gray-200 px-2 py-0.5 transition-colors ${mode === 'annual' ? 'bg-gray-700 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
      >
        /yr
      </button>
    </div>
  )
}

/* Wraps a currency FormField with a label + freq toggle above it */
function MonthlyAnnualField({
  label,
  monthly,
  mode,
  onValueChange,
  onModeChange,
  placeholder,
}: {
  label: string
  monthly: number
  mode: 'monthly' | 'annual'
  onValueChange: (monthly: number) => void
  onModeChange: (m: 'monthly' | 'annual') => void
  placeholder?: string
}) {
  const displayed = mode === 'annual' ? monthly * 12 : monthly
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-1">
        <label className="text-xs font-medium text-gray-600 truncate">{label}</label>
        <FreqToggle mode={mode} onChange={onModeChange} />
      </div>
      <FormField
        type="currency"
        label=""
        value={displayed}
        onChange={v => onValueChange(mode === 'annual' ? v / 12 : v)}
        placeholder={placeholder}
      />
    </div>
  )
}

export default function PropertyInputs({ inputs, onChange, autoRehabMonths, section = 'all' }: Props) {
  const set = <K extends keyof DealInputs>(key: K) =>
    (v: DealInputs[K]) => onChange({ [key]: v } as Partial<DealInputs>)

  const show = (s: Section) => section === 'all' || section === s

  return (
    <div className="space-y-6">

      {/* ── Property Info ────────────────────────────────────────── */}
      {show('property') && (
        <div>
          {section === 'all' && (
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Property Info</h3>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField type="text" label="Address" value={inputs.address} onChange={set('address')}
              placeholder="123 Main St, Dallas TX" className="sm:col-span-2" />
            <FormField type="text" label="Seller / Agent" value={inputs.seller} onChange={set('seller')} placeholder="wholesaler name" />
            <FormField type="select" label="Property Type" value={inputs.propertyType} onChange={set('propertyType')}
              options={[
                { label: 'SFR', value: 'SFR' },
                { label: 'Duplex', value: 'Duplex' },
                { label: 'Triplex', value: 'Triplex' },
                { label: 'Fourplex', value: 'Fourplex' },
                { label: 'Other', value: 'Other' },
              ]} />
            <FormField type="integer" label="Sqft" value={inputs.sqft} onChange={set('sqft')} placeholder="1500" />
            <FormField type="integer" label="Year Built" value={inputs.yearBuilt} onChange={set('yearBuilt')} placeholder="1975" />
          </div>
        </div>
      )}

      {/* ── Deal Numbers ─────────────────────────────────────────── */}
      {show('purchase') && (
        <div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField type="currency" label="Purchase Price (PP)" value={inputs.purchasePrice} onChange={set('purchasePrice')} placeholder="230,000" />
            <FormField type="currency" label="ARV" value={inputs.arv} onChange={set('arv')} hint="After-Repair Value" placeholder="300,000" />
            <FormField type="currency" label="Market Rent / mo" value={inputs.marketRent} onChange={set('marketRent')} placeholder="1,400" />
            <FormField
              type="currency"
              label="Closing Costs — Purchase"
              value={inputs.closingCostsBuyOverride < 0 ? 0 : inputs.closingCostsBuyOverride}
              onChange={v => onChange({ closingCostsBuyOverride: v })}
              hint={inputs.closingCostsBuyOverride < 0 ? 'Auto: 2% of PP' : 'Overriding auto (2%)'}
              placeholder={inputs.purchasePrice > 0 ? String(Math.round(inputs.purchasePrice * 0.02)) : '4,600'}
            />
          </div>
        </div>
      )}

      {/* ── PITI / Monthly Expenses ──────────────────────────────── */}
      {show('piti') && (
        <div>
          {section === 'all' && (
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Monthly Expenses</h3>
          )}

          {/* 2×2 grid with annual/monthly toggles */}
          <div className="grid grid-cols-2 gap-3">
            <MonthlyAnnualField
              label="Property Tax"
              monthly={inputs.propertyTaxMonthly}
              mode={inputs.propertyTaxMode ?? 'monthly'}
              onValueChange={v => onChange({ propertyTaxMonthly: v })}
              onModeChange={m => onChange({ propertyTaxMode: m })}
              placeholder="125"
            />
            <MonthlyAnnualField
              label="Insurance"
              monthly={inputs.insuranceMonthly}
              mode={inputs.insuranceMode ?? 'monthly'}
              onValueChange={v => onChange({ insuranceMonthly: v })}
              onModeChange={m => onChange({ insuranceMode: m })}
              placeholder="100"
            />
            <MonthlyAnnualField
              label="HOA"
              monthly={inputs.hoaMonthly}
              mode={inputs.hoaMode ?? 'monthly'}
              onValueChange={v => onChange({ hoaMonthly: v })}
              onModeChange={m => onChange({ hoaMode: m })}
              placeholder="0"
            />
            <MonthlyAnnualField
              label="State Income Tax"
              monthly={inputs.stateIncomeTaxMonthly}
              mode={inputs.stateTaxMode ?? 'monthly'}
              onValueChange={v => onChange({ stateIncomeTaxMonthly: v })}
              onModeChange={m => onChange({ stateTaxMode: m })}
              placeholder="0"
            />
          </div>

          {/* CapEx + Vacancy */}
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-gray-600">CapEx + Vacancy</label>
            <div className="flex items-center gap-2">
              <div className="flex flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                <button
                  type="button"
                  onClick={() => onChange({ capexMode: 'percent' })}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${(inputs.capexMode ?? 'percent') === 'percent' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  % of Rent
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ capexMode: 'fixed' })}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${(inputs.capexMode ?? 'percent') === 'fixed' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Fixed $
                </button>
              </div>
              {(inputs.capexMode ?? 'percent') === 'percent' ? (
                <FormField
                  type="percent"
                  label=""
                  value={inputs.capexRate ?? 0.15}
                  onChange={v => onChange({ capexRate: v })}
                  hint={inputs.marketRent > 0 ? `≈ ${fmtCurrency(inputs.marketRent * (inputs.capexRate ?? 0.15))}/mo` : '15% default'}
                  placeholder="15"
                  className="w-36"
                />
              ) : (
                <FormField
                  type="currency"
                  label=""
                  value={inputs.capexFixed ?? 0}
                  onChange={v => onChange({ capexFixed: v })}
                  hint="/mo fixed"
                  placeholder="210"
                  className="w-36"
                />
              )}
            </div>
          </div>

          {/* Property Management */}
          <div className="mt-3">
            <label className="mb-2 block text-xs font-medium text-gray-600">Property Management</label>
            <div className="flex items-center gap-2">
              <div className="flex flex-shrink-0 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                <button type="button"
                  onClick={() => onChange({ pmMode: 'percent' })}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${inputs.pmMode === 'percent' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                  % of Rent
                </button>
                <button type="button"
                  onClick={() => onChange({ pmMode: 'fixed' })}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${inputs.pmMode === 'fixed' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                  Fixed $
                </button>
              </div>
              {inputs.pmMode === 'percent' ? (
                <FormField type="percent" label="" value={inputs.pmRate} onChange={v => onChange({ pmRate: v })}
                  hint={inputs.marketRent > 0 ? `= ${fmtCurrency(inputs.marketRent * inputs.pmRate)}/mo` : 'of rent'}
                  placeholder="10" className="w-36" />
              ) : (
                <FormField type="currency" label="" value={inputs.pmFixed} onChange={v => onChange({ pmFixed: v })}
                  hint="/mo fixed" placeholder="200" className="w-36" />
              )}
            </div>
          </div>

        </div>
      )}

      {/* ── Settings ─────────────────────────────────────────────── */}
      {show('settings') && (
        <div>
          {section === 'all' && (
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Settings</h3>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField
              type="select"
              label="Exit Strategy"
              value={inputs.exitStrategy}
              onChange={v => onChange({ exitStrategy: v as 'flip' | 'rental' })}
              options={[
                { label: 'Rental (BRRRR)', value: 'rental' },
                { label: 'Flip', value: 'flip' },
              ]}
            />
            <FormField
              type="select"
              label="Location Score"
              value={String(inputs.locationScore)}
              onChange={v => onChange({ locationScore: Number(v) })}
              options={[
                { label: '0 — N/A', value: '0' },
                ...Array.from({ length: 11 }, (_, i) => ({
                  label: String(i + 5),
                  value: String(i + 5),
                })),
              ]}
              hint="School district score (5–15)"
            />
          </div>

          <div className="mt-3">
            <FormField
              type="currency"
              label="Other Adjustments at Close"
              value={inputs.otherAdjustmentsAtClose}
              onChange={set('otherAdjustmentsAtClose')}
              hint="Credits, prepaid items — reduces money-in-deal"
              placeholder="0"
            />
          </div>

          <div className="mt-3">
            <FormField type="text" label="Comments" value={inputs.comments} onChange={set('comments')} placeholder="cash+HML+Refi, notes..." />
          </div>
        </div>
      )}

    </div>
  )
}

'use client'
import { useState } from 'react'
import FormField from '@/components/ui/FormField'
import { fmtCurrency } from '@/lib/format'
import type { DealInputs } from '@/lib/types'

type Section = 'all' | 'property' | 'purchase' | 'market' | 'piti' | 'settings'

interface Props {
  inputs: DealInputs
  onChange: (updates: Partial<DealInputs>) => void
  autoRehabMonths: number
  section?: Section
}

export default function PropertyInputs({ inputs, onChange, autoRehabMonths, section = 'all' }: Props) {
  const [showHmlOverride, setShowHmlOverride] = useState(
    inputs.hmlLoanPP > 0 || inputs.hmlLoanRehab > 0
  )
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

      {/* ── Purchase & Rehab ─────────────────────────────────────── */}
      {show('purchase') && (
        <div>
          {section === 'all' && (
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Deal Numbers</h3>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField type="currency" label="Purchase Price (PP)" value={inputs.purchasePrice} onChange={set('purchasePrice')} placeholder="230,000" />
            <FormField type="currency" label="Rehab Estimate" value={inputs.rehabEstimate} onChange={set('rehabEstimate')} placeholder="30,000" />
            <FormField type="currency" label="Change Orders / Appliances" value={inputs.changeOrders} onChange={set('changeOrders')} hint="Out-of-pocket buffer" placeholder="5,000" />
            <FormField
              type="integer"
              label="Rehab Months"
              value={inputs.rehabMonthsManual}
              onChange={set('rehabMonthsManual')}
              hint={`0 = auto (${autoRehabMonths.toFixed(1)} mo)`}
              placeholder="0"
            />
            <FormField
              type="currency"
              label="Closing Costs — Purchase"
              value={inputs.closingCostsBuyOverride < 0 ? 0 : inputs.closingCostsBuyOverride}
              onChange={v => onChange({ closingCostsBuyOverride: v })}
              hint={inputs.closingCostsBuyOverride < 0 ? 'Auto: 2% of PP' : 'Overriding auto (2%)'}
              placeholder={inputs.purchasePrice > 0 ? String(Math.round(inputs.purchasePrice * 0.02)) : '4,600'}
            />
            <FormField
              type="currency"
              label="Seasoning Months"
              value={inputs.seasoningMonths}
              onChange={set('seasoningMonths')}
              hint="Months before refi / sale"
              placeholder="4"
            />
          </div>

          {/* HML dollar override — collapsed by default; open when lender quotes exact amounts */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowHmlOverride(o => !o)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
              <svg className={`h-3 w-3 transition-transform ${showHmlOverride ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Lender quoted exact dollar amounts
            </button>
            {showHmlOverride && (
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FormField
                  type="currency"
                  label="PP Financed by HML ($)"
                  value={inputs.hmlLoanPP}
                  onChange={set('hmlLoanPP')}
                  hint="0 = use leverage % from HML settings"
                  placeholder="0"
                />
                <FormField
                  type="currency"
                  label="Rehab Financed by HML ($)"
                  value={inputs.hmlLoanRehab}
                  onChange={set('hmlLoanRehab')}
                  hint="0 = use leverage % from HML settings"
                  placeholder="0"
                />
              </div>
            )}
          </div>

        </div>
      )}

      {/* ── Market ───────────────────────────────────────────────── */}
      {show('market') && (
        <div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField type="currency" label="ARV" value={inputs.arv} onChange={set('arv')} hint="After-Repair Value" placeholder="300,000" />
            <FormField type="currency" label="Market Rent / mo" value={inputs.marketRent} onChange={set('marketRent')} placeholder="1,400" />
          </div>
        </div>
      )}

      {/* ── PITI / Monthly Expenses ──────────────────────────────── */}
      {show('piti') && (
        <div>
          {section === 'all' && (
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">Monthly Expenses</h3>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <FormField type="currency" label="Property Tax" value={inputs.propertyTaxMonthly} onChange={set('propertyTaxMonthly')} placeholder="125" />
            <FormField type="currency" label="Insurance" value={inputs.insuranceMonthly} onChange={set('insuranceMonthly')} placeholder="100" />
            <FormField type="currency" label="HOA" value={inputs.hoaMonthly} onChange={set('hoaMonthly')} placeholder="0" />
            <FormField type="currency" label="State Income Tax" value={inputs.stateIncomeTaxMonthly} onChange={set('stateIncomeTaxMonthly')} placeholder="0" />
          </div>

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
            <FormField type="select" label="Exit Strategy" value={inputs.exitStrategy}
              onChange={v => onChange({ exitStrategy: v as 'flip' | 'rental' })}
              options={[
                { label: 'Rental (BRRRR)', value: 'rental' },
                { label: 'Flip', value: 'flip' },
              ]} />
            <FormField type="select" label="Location / School Score" value={String(inputs.locationScore)}
              onChange={v => onChange({ locationScore: Number(v) })}
              options={[
                { label: 'A (15)', value: '15' },
                { label: 'A (12)', value: '12' },
                { label: 'B (10)', value: '10' },
                { label: 'C (9)', value: '9' },
                { label: 'Other (0)', value: '0' },
              ]}
              hint="School district grade" />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField
              type="percent"
              label="Refi LTV %"
              value={inputs.refiLTVOverride}
              onChange={set('refiLTVOverride')}
              hint="0 = auto (capped at 65%)"
              placeholder="0"
            />
            <FormField
              type="currency"
              label="Refi Title / Escrow ($)"
              value={inputs.refiTitleCostsOverride}
              onChange={set('refiTitleCostsOverride')}
              hint={inputs.refiTitleCostsOverride > 0 ? 'Overriding auto — clear to reset' : 'Auto: ARV×2% + $500'}
              placeholder="0"
            />
            <FormField
              type="currency"
              label="Other Adjustments at Close"
              value={inputs.otherAdjustmentsAtClose}
              onChange={set('otherAdjustmentsAtClose')}
              hint="Credits, prepaid items — reduces money-in-deal"
              placeholder="0"
              className="sm:col-span-2"
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

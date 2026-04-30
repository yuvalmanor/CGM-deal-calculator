'use client'
import { useState, useMemo, useCallback } from 'react'
import PropertyInputs         from './sections/PropertyInputs'
import LenderSettingsPanel    from './sections/LenderSettingsPanel'
import SummaryBar             from './sections/SummaryBar'
import ScenarioPanel          from './sections/ScenarioPanel'
import MAOCard                from './sections/MAOCard'
import Scorecard              from './sections/Scorecard'
import CustomExpensesPanel    from './sections/CustomExpensesPanel'
import CustomExpensesSummary  from './sections/CustomExpensesSummary'
import LenderCustomFeesPanel  from './sections/LenderCustomFeesPanel'
import AdvancedMetrics         from './sections/AdvancedMetrics'
import Card                   from './ui/Card'
import FormulaModal           from './ui/FormulaModal'
import { calculateDeal }      from '@/lib/calculations'
import { DEFAULT_DEAL_INPUTS, DEFAULT_LENDER_SETTINGS } from '@/lib/defaults'
import { ModalContext }       from '@/lib/modalContext'
import type { CustomExpense, LenderFee, DealInputs, LenderSettings } from '@/lib/types'

interface Props {
  initialInputs?: Partial<DealInputs>
  initialSettings?: Partial<LenderSettings>
  initialDealId?: string
}

function mapLocationScore(raw: number): number {
  return raw >= 15 ? 10 : raw >= 12 ? 9 : raw >= 10 ? 8 : raw >= 9 ? 7 : 0
}

function LeftSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p>
      {children}
    </div>
  )
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function DealCalculator({ initialInputs, initialSettings, initialDealId }: Props) {
  const [inputs, setInputs] = useState<DealInputs>({
    ...DEFAULT_DEAL_INPUTS,
    ...initialInputs,
  })
  const [settings, setSettings] = useState<LenderSettings>({
    ...DEFAULT_LENDER_SETTINGS,
    ...initialSettings,
  })
  const [modalMetricId, setModalMetricId] = useState<string | null>(null)
  const [dealId, setDealId] = useState<string | null>(initialDealId ?? null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const updateInputs   = (updates: Partial<DealInputs>)    => setInputs(prev  => ({ ...prev,  ...updates }))
  const updateSettings = (updates: Partial<LenderSettings>) => setSettings(prev => ({ ...prev, ...updates }))

  const results = useMemo(() => calculateDeal(inputs, settings), [inputs, settings])

  const openModal  = useCallback((id: string) => setModalMetricId(id), [])
  const closeModal = useCallback(() => setModalMetricId(null), [])

  const handleSave = useCallback(async () => {
    setSaveStatus('saving')
    try {
      if (dealId) {
        await fetch(`/api/deals/${dealId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs, settings, results }),
        })
      } else {
        const res = await fetch('/api/deals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs, settings, results }),
        })
        const data = await res.json()
        setDealId(data.id)
      }
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    }
  }, [dealId, inputs, settings, results])

  const autoRehabMonths = (inputs.rehabEstimate + inputs.changeOrders) / 30000
  const locationScore   = mapLocationScore(inputs.locationScore)
  const score           = (results.hmlEquityScore + results.hmlROIScore + locationScore) / 3
  const isGo            = score >= 7.0
  const isFlip          = inputs.exitStrategy === 'flip'
  const exitLabel       = isFlip ? 'Flip' : 'BRRRR'

  const subLine = [
    inputs.propertyType,
    inputs.sqft > 0 && `${inputs.sqft.toLocaleString()} sqft`,
    inputs.yearBuilt > 0 && `built ${inputs.yearBuilt}`,
    inputs.seller && `via ${inputs.seller}`,
  ].filter(Boolean).join(' · ')

  return (
    <ModalContext.Provider value={openModal}>
      <div className="flex flex-col gap-6 lg:flex-row">

        {/* ── Left panel: inputs ────────────────────────────────── */}
        <div className="lg:w-80 lg:flex-shrink-0 lg:sticky lg:top-[53px] lg:h-[calc(100vh-53px)] lg:overflow-y-auto">
          <div className="space-y-5 pb-8">

            <LeftSection title="Property Info">
              <PropertyInputs inputs={inputs} onChange={updateInputs}
                autoRehabMonths={autoRehabMonths} section="property" />
            </LeftSection>

            <hr className="border-gray-100" />

            <LeftSection title="Deal Numbers">
              <PropertyInputs inputs={inputs} onChange={updateInputs}
                autoRehabMonths={autoRehabMonths} section="purchase" />
            </LeftSection>

            <hr className="border-gray-100" />

            <LeftSection title="Market">
              <PropertyInputs inputs={inputs} onChange={updateInputs}
                autoRehabMonths={autoRehabMonths} section="market" />
            </LeftSection>

            <hr className="border-gray-100" />

            <Card title="Hard Money Lender" accent="bg-orange-400" collapsible defaultOpen={true}>
              <LenderSettingsPanel settings={settings} onChange={updateSettings} section="hml" />
              <hr className="my-3 border-gray-100" />
              <LenderCustomFeesPanel
                fees={inputs.hmlCustomFees}
                onChange={(hmlCustomFees: LenderFee[]) => updateInputs({ hmlCustomFees })}
              />
            </Card>

            <Card title="Refi (Long-Term)" accent="bg-violet-400" collapsible defaultOpen={true}>
              <LenderSettingsPanel settings={settings} onChange={updateSettings} section="refi" />
              <hr className="my-3 border-gray-100" />
              <LenderCustomFeesPanel
                fees={inputs.refiCustomFees}
                onChange={(refiCustomFees: LenderFee[]) => updateInputs({ refiCustomFees })}
              />
            </Card>

            <hr className="border-gray-100" />

            <LeftSection title="Monthly Expenses">
              <PropertyInputs inputs={inputs} onChange={updateInputs}
                autoRehabMonths={autoRehabMonths} section="piti" />
            </LeftSection>

            <hr className="border-gray-100" />

            <LeftSection title="Custom Expenses">
              <CustomExpensesPanel
                expenses={inputs.customExpenses}
                onChange={(customExpenses: CustomExpense[]) => updateInputs({ customExpenses })}
              />
            </LeftSection>

            <hr className="border-gray-100" />

            <LeftSection title="Settings">
              <PropertyInputs inputs={inputs} onChange={updateInputs}
                autoRehabMonths={autoRehabMonths} section="settings" />
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-gray-500">MAO Targets</p>
                <LenderSettingsPanel settings={settings} onChange={updateSettings} section="mao" />
              </div>
            </LeftSection>

          </div>
        </div>

        {/* ── Right panel: results ──────────────────────────────── */}
        <div className="relative min-w-0 flex-1">
          <FormulaModal
            isOpen={modalMetricId !== null}
            onClose={closeModal}
            metricId={modalMetricId}
            results={results}
            inputs={inputs}
          />

          {/* Deal header — sticky below global nav */}
          <div className="sticky top-[53px] z-10 -mx-4 mb-4 border-b border-gray-200 bg-white px-4 py-3 lg:mx-0 lg:rounded-xl lg:border lg:shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-gray-900">
                  {inputs.address || 'New Deal'}
                </h2>
                {subLine && (
                  <p className="mt-0.5 truncate text-xs text-gray-400">{subLine}</p>
                )}
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {exitLabel}
                </span>
                {!isFlip && (
                  <>
                    <div className="text-right">
                      <span className="text-base font-bold text-gray-900">
                        {score.toFixed(1)}
                      </span>
                      <span className="text-xs font-normal text-gray-400">/10</span>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${isGo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {isGo ? 'GO' : 'NO-GO'}
                    </span>
                  </>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saveStatus === 'saving'}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    saveStatus === 'saved'
                      ? 'bg-green-100 text-green-700'
                      : saveStatus === 'error'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60'
                  }`}
                >
                  {saveStatus === 'saving' ? 'Saving…'
                    : saveStatus === 'saved' ? 'Saved ✓'
                    : saveStatus === 'error' ? 'Error — retry'
                    : dealId ? 'Update Deal'
                    : 'Save Deal'}
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">

            {/* KPI strip */}
            <div>
              <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-400">At a Glance</p>
              <SummaryBar results={results} />
            </div>

            {/* Advanced metrics */}
            <Card title="Advanced Metrics" accent="bg-purple-400" collapsible defaultOpen={false}>
              <AdvancedMetrics results={results} />
            </Card>

            {/* Scenario tabs */}
            <Card title="Scenario Analysis" subtitle="Rental (BRRRR) · Fix & Flip – Cash · Fix & Flip – HML" accent="bg-blue-400">
              <ScenarioPanel results={results} inputs={inputs} />
            </Card>

            {/* Scorecard */}
            {!isFlip && (
              <Card title="Scorecard" accent="bg-green-400">
                <Scorecard results={results} inputs={inputs} />
              </Card>
            )}

            {/* MAO block */}
            <Card title="Maximum Allowable Offer (MAO)" accent="bg-rose-400">
              <MAOCard results={results} inputs={inputs} />
            </Card>

            {/* Custom expenses summary */}
            {inputs.customExpenses.length > 0 && (
              <Card title="Custom Expenses" accent="bg-amber-400" collapsible defaultOpen>
                <CustomExpensesSummary expenses={inputs.customExpenses} />
              </Card>
            )}

          </div>
        </div>

      </div>
    </ModalContext.Provider>
  )
}

'use client'
import FormField from '@/components/ui/FormField'
import type { LenderSettings } from '@/lib/types'

type Section = 'all' | 'hml' | 'refi' | 'mao'

interface Props {
  settings: LenderSettings
  onChange: (updates: Partial<LenderSettings>) => void
  section?: Section
}

export default function LenderSettingsPanel({ settings, onChange, section = 'all' }: Props) {
  const set = <K extends keyof LenderSettings>(key: K) =>
    (v: LenderSettings[K]) => onChange({ [key]: v } as Partial<LenderSettings>)

  const show = (s: Exclude<Section, 'all'>) => section === 'all' || section === s

  return (
    <div className="space-y-6">

      {/* HML */}
      {show('hml') && (
        <div>
          {section === 'all' && (
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Hard Money Lender (HML)
            </h3>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField type="text" label="Lender Name" value={settings.hmlLenderName} onChange={set('hmlLenderName')} className="sm:col-span-2" />
            <FormField type="percent" label="Leverage % of PP" value={settings.hmlLeveragePP} onChange={set('hmlLeveragePP')} hint="default 75%" />
            <FormField type="percent" label="Leverage % of Rehab" value={settings.hmlLeverageRehab} onChange={set('hmlLeverageRehab')} hint="default 100%" />
            <FormField
              type="percent"
              label="Annual Interest Rate"
              value={settings.hmlMonthlyRate * 12}
              onChange={v => onChange({ hmlMonthlyRate: v / 12 })}
              hint={`${(settings.hmlMonthlyRate * 100).toFixed(3)}% /mo`}
            />
            <FormField type="percent" label="Points %" value={settings.hmlPointsPct} onChange={set('hmlPointsPct')} hint="origination fee" />
            <FormField type="currency" label="Appraisal / BPO" value={settings.hmlAppraisalCost} onChange={set('hmlAppraisalCost')} />
            <FormField type="currency" label="Underwriting Fees" value={settings.hmlUnderwritingFees} onChange={set('hmlUnderwritingFees')} />
            <FormField type="currency" label="Other Misc Fees" value={settings.hmlOtherFees} onChange={set('hmlOtherFees')} hint="post-closing misc" />
            <FormField type="currency" label="Extra / Additional Fees" value={settings.hmlExtraFees} onChange={set('hmlExtraFees')} hint="any deal-specific additions" />
          </div>
        </div>
      )}


      {/* Refi */}
      {show('refi') && (
        <div>
          {section === 'all' && (
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Refi (Long-Term Lender)
            </h3>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField type="text" label="Lender Name" value={settings.refiLenderName} onChange={set('refiLenderName')} className="sm:col-span-2" />
            <FormField type="percent" label="Annual Interest Rate" value={settings.refiAnnualRate} onChange={set('refiAnnualRate')} hint="30-yr fixed" />
            <FormField type="percent" label="Points %" value={settings.refiPointsPct} onChange={set('refiPointsPct')} hint="origination" />
            <FormField type="currency" label="Appraisal / BPO" value={settings.refiAppraisalCost} onChange={set('refiAppraisalCost')} />
            <FormField type="currency" label="Underwriting Fees" value={settings.refiUnderwritingFees} onChange={set('refiUnderwritingFees')} />
            <FormField type="currency" label="Other Misc / Impound" value={settings.refiOtherFees} onChange={set('refiOtherFees')} className="sm:col-span-2" />
          </div>
        </div>
      )}

      {/* MAO targets */}
      {show('mao') && (
        <div>
          {section === 'all' && (
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              MAO Targets
            </h3>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField type="currency" label="Max Money in Deal" value={settings.maxMoneyInDeal} onChange={set('maxMoneyInDeal')} hint="after refi" />
            <FormField type="percent" label="Min Equity % Post-Refi" value={settings.minEquityPct} onChange={set('minEquityPct')} hint="20% default" />
          </div>
        </div>
      )}

    </div>
  )
}

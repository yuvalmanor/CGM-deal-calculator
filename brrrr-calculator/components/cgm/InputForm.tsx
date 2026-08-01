'use client'
import type { Deal } from '@/lib/deal-model'
import { newUid } from '@/lib/deal-model'
import {
  NumberField, TextField, SelectField, SegToggle,
  Section, Repeater, MonthlyRepeater, FundedRepeater, PppScheduleField,
} from './FormControls'
import { mapLocationScore } from '@/lib/deal-model'

const SECTIONS = [
  { id: 'property',  label: 'Property',         num: '01' },
  { id: 'deal',      label: 'Deal Numbers',      num: '02' },
  { id: 'rehab',     label: 'Rehab',             num: '03' },
  { id: 'expenses',  label: 'Monthly Expenses',  num: '04' },
  { id: 'hml',       label: 'Hard Money',        num: '05' },
  { id: 'refi',      label: 'Refinance',         num: '06' },
  { id: 'onetime',   label: 'One-Time Costs',    num: '07' },
  { id: 'settings',  label: 'Settings',          num: '08' },
]

export { SECTIONS }

const moYr = [{ value: 'mo', label: '/mo' }, { value: 'yr', label: '/yr' }]
const pctFixed = [{ value: 'pct', label: '% of Rent' }, { value: 'fixed', label: 'Fixed $' }]
const pctFixedRehab = [{ value: 'pctOfRehab', label: '% of Rehab' }, { value: 'fixed', label: 'Fixed $' }]

interface Props {
  deal: Deal
  update: (patch: Partial<Deal>) => void
}

export function SectionNav({ activeId, onJump }: { activeId: string; onJump: (id: string) => void }) {
  return (
    <nav aria-label="Form sections">
      <div className="section-nav-eyebrow">Inputs</div>
      <ol className="section-nav-list">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <button
              className={`section-nav-link${activeId === s.id ? ' active' : ''}`}
              onClick={() => onJump(s.id)}
            >
              <span className="nav-num">{s.num}</span>
              <span className="nav-label">{s.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function InputForm({ deal, update }: Props) {
  const set = <K extends keyof Deal>(key: K) => (val: Deal[K]) => update({ [key]: val } as Partial<Deal>)

  return (
    <div className="input-form">

      {/* 01 · Property */}
      <Section id="property" eyebrow="01 · Property" title="Property Info" subtitle="Address, seller, and basic specs.">
        <TextField label="Address" value={deal.address} onChange={set('address')}
          placeholder="1805 Cedar Wood, Anna TX, 75409" wide />
        <TextField label="Seller / Agent" value={deal.sellerAgent} onChange={set('sellerAgent')} />
        {/* Leading blank option: an unfilled deal has no property type, and a
            select whose value matches no option would display a type nobody chose. */}
        <SelectField label="Property Type" value={deal.propertyType} onChange={set('propertyType')}
          options={[{ value: '', label: '—' }, 'SFR', 'Duplex', 'Triplex', 'Fourplex', 'Townhome', 'Condo', 'Mobile/MFG', 'Land']} />
        <NumberField label="SqFt" value={deal.sqft} onChange={set('sqft')} />
        <NumberField label="Year Built" value={deal.yearBuilt} onChange={set('yearBuilt')} />
        <NumberField label="School Grade (total)" value={deal.schoolGrade} onChange={set('schoolGrade')}
          helper={`Location score: ${mapLocationScore(deal.schoolGrade)}/10 · (15→10, 12→9, 10→8, 9→7, 7→6)`} />
      </Section>

      {/* 02 · Deal Numbers */}
      <Section id="deal" eyebrow="02 · Deal" title="Deal Numbers" subtitle="Purchase price, ARV, market rent. Drives everything downstream.">
        <NumberField label="Purchase Price (PP)" value={deal.purchasePrice} onChange={set('purchasePrice')} prefix="$" />
        <NumberField label="ARV" value={deal.arv} onChange={set('arv')} prefix="$" helper="After-Repair Value" />
        <NumberField label="Market Rent / mo" value={deal.monthlyRent} onChange={set('monthlyRent')} prefix="$" />
        <NumberField label="Closing Costs — Purchase" value={deal.closingCostsBuy} onChange={set('closingCostsBuy')} prefix="$" helper="Overriding auto (2%)" />
        <NumberField label="Project Cost Adjustments (−)" value={deal.projectCostAdjustments} onChange={set('projectCostAdjustments')} prefix="$"
          helper="Seller concessions, EM credits, etc. Subtracted from Total Project Cost." />
      </Section>

      {/* 03 · Rehab */}
      <Section id="rehab" eyebrow="03 · Rehab" title="Rehab" subtitle="Estimate, change orders, and how long the rehab runs.">
        <NumberField label="Rehab Estimate" value={deal.rehabEstimate} onChange={set('rehabEstimate')} prefix="$" />
        <NumberField
          label="Change Orders"
          value={deal.changeOrdersMode === 'pctOfRehab' ? deal.changeOrdersPct : deal.changeOrdersFixed}
          onChange={(v) => update(deal.changeOrdersMode === 'pctOfRehab' ? { changeOrdersPct: v } : { changeOrdersFixed: v })}
          prefix={deal.changeOrdersMode === 'fixed' ? '$' : undefined}
          suffix={deal.changeOrdersMode === 'pctOfRehab' ? '%' : undefined}
          labelRight={<SegToggle value={deal.changeOrdersMode} onChange={(v) => update({ changeOrdersMode: v as Deal['changeOrdersMode'] })} options={pctFixedRehab} />}
        />
        <NumberField label="Rehab Months" value={deal.rehabMonths} onChange={set('rehabMonths')} suffix="mo" helper="Hold duration during rehab" />
        <div className="field-wide repeater-block">
          <div className="repeater-title">Additional Rehab Costs</div>
          <div className="repeater-hint">HML = lender funds it · Cash = out-of-pocket</div>
          <FundedRepeater
            rows={deal.rehabAdditionalCosts}
            onChange={(rows) => update({ rehabAdditionalCosts: rows })}
            onAdd={() => update({ rehabAdditionalCosts: [...(deal.rehabAdditionalCosts || []), { id: newUid(), label: '', amount: 0, funded: true }] })}
            addLabel="Add rehab cost"
          />
        </div>
      </Section>

      {/* 04 · Monthly Expenses */}
      <Section id="expenses" eyebrow="04 · Expenses" title="Monthly Expenses" subtitle="Taxes, insurance, HOA, reserves, mgmt — and any custom recurring lines.">
        <NumberField label="Property Tax" value={deal.taxes} onChange={set('taxes')} prefix="$"
          labelRight={<SegToggle value={deal.taxesUnit} onChange={(v) => update({ taxesUnit: v as 'mo' | 'yr' })} options={moYr} />} />
        <NumberField label="Insurance" value={deal.insurance} onChange={set('insurance')} prefix="$"
          labelRight={<SegToggle value={deal.insuranceUnit} onChange={(v) => update({ insuranceUnit: v as 'mo' | 'yr' })} options={moYr} />} />
        <NumberField label="HOA" value={deal.hoa} onChange={set('hoa')} prefix="$"
          labelRight={<SegToggle value={deal.hoaUnit} onChange={(v) => update({ hoaUnit: v as 'mo' | 'yr' })} options={moYr} />} />
        <NumberField label="State Inc. Tax" value={deal.stateIncTax} onChange={set('stateIncTax')} prefix="$"
          labelRight={<SegToggle value={deal.stateIncTaxUnit} onChange={(v) => update({ stateIncTaxUnit: v as 'mo' | 'yr' })} options={moYr} />} />

        <NumberField
          label="CapEx + Vacancy"
          value={deal.capexVacancyMode === 'pct' ? deal.capexVacancyPct : deal.capexVacancyFixed}
          onChange={(v) => update(deal.capexVacancyMode === 'pct' ? { capexVacancyPct: v } : { capexVacancyFixed: v })}
          prefix={deal.capexVacancyMode === 'fixed' ? '$' : undefined}
          suffix={deal.capexVacancyMode === 'pct' ? '%' : undefined}
          helper={deal.capexVacancyMode === 'pct' ? `≈ $${Math.round(deal.monthlyRent * (deal.capexVacancyPct / 100)).toLocaleString()}/mo` : undefined}
          labelRight={<SegToggle value={deal.capexVacancyMode} onChange={(v) => update({ capexVacancyMode: v as 'pct' | 'fixed' })} options={pctFixed} />}
        />
        <NumberField
          label="Property Management"
          value={deal.mgmtMode === 'pct' ? deal.mgmtPct : deal.mgmtFixed}
          onChange={(v) => update(deal.mgmtMode === 'pct' ? { mgmtPct: v } : { mgmtFixed: v })}
          prefix={deal.mgmtMode === 'fixed' ? '$' : undefined}
          suffix={deal.mgmtMode === 'pct' ? '%' : undefined}
          helper={deal.mgmtMode === 'fixed' ? '/mo fixed' : undefined}
          labelRight={<SegToggle value={deal.mgmtMode} onChange={(v) => update({ mgmtMode: v as 'pct' | 'fixed' })} options={pctFixed} />}
        />

        <div className="field-wide repeater-block">
          <div className="repeater-title">Additional Monthly Costs</div>
          <MonthlyRepeater
            rows={deal.additionalMonthly}
            onChange={(rows) => update({ additionalMonthly: rows })}
            onAdd={() => update({ additionalMonthly: [...(deal.additionalMonthly || []), { id: newUid(), label: '', amount: 0, unit: 'mo' }] })}
            addLabel="Add monthly expense"
          />
        </div>
      </Section>

      {/* 05 · Hard Money Lender */}
      <Section id="hml" eyebrow="05 · HML" title="Hard Money Lender" subtitle="Acquisition + rehab financing during the value-add hold.">
        <TextField label="Lender Name" value={deal.hmlName} onChange={set('hmlName')} wide />
        <NumberField label="Leverage % of PP" value={deal.hmlLevPP} onChange={set('hmlLevPP')} suffix="%" helper="default 75%" />
        <NumberField label="Leverage % of Rehab" value={deal.hmlLevRehab} onChange={set('hmlLevRehab')} suffix="%" helper="default 100%" />
        <NumberField label="Annual Interest Rate" value={deal.hmlRate} onChange={set('hmlRate')} suffix="%" />
        <NumberField label="Points %" value={deal.hmlPoints} onChange={set('hmlPoints')} suffix="%" helper="origination" />
        <NumberField label="Lender Fees" value={deal.hmlLenderFees} onChange={set('hmlLenderFees')} prefix="$" />
        <NumberField label="Post-Closing Misc" value={deal.hmlPostClosingMisc} onChange={set('hmlPostClosingMisc')} prefix="$" />
        <div className="field-wide repeater-block">
          <div className="repeater-title">Additional HML Fees</div>
          <Repeater
            rows={deal.hmlExtraFees}
            onChange={(rows) => update({ hmlExtraFees: rows })}
            onAdd={() => update({ hmlExtraFees: [...(deal.hmlExtraFees || []), { id: newUid(), label: '', amount: 0 }] })}
            addLabel="Add HML fee"
          />
        </div>
      </Section>

      {/* 06 · Refinance */}
      <Section id="refi" eyebrow="06 · Refi" title="Refinance (Long-Term)" subtitle="Long-term debt that takes out the HML and stabilizes the BRRRR.">
        <TextField label="Lender Name" value={deal.refiName} onChange={set('refiName')} wide />
        <NumberField label="Annual Interest Rate" value={deal.refiRate} onChange={set('refiRate')} suffix="%" helper={`${deal.refiTermYears}-yr fixed`} />
        <NumberField label="Points %" value={deal.refiPoints} onChange={set('refiPoints')} suffix="%" helper="origination" />
        <NumberField label="Buydown Points %" value={deal.refiBuydownPoints} onChange={set('refiBuydownPoints')} suffix="%"
          helper="Rate buydown — % of refi loan, added to closing" />
        <PppScheduleField label="Prepayment Penalty (PPP)" value={deal.refiPppSchedule} onChange={set('refiPppSchedule')}
          helper="Yearly % of remaining balance — empty = none" />
        <NumberField label="Term" value={deal.refiTermYears} onChange={set('refiTermYears')} suffix="yr" />
        <NumberField label="Appraisal / BPO" value={deal.refiAppraisal} onChange={set('refiAppraisal')} prefix="$" />
        <NumberField label="Underwriting Fees" value={deal.refiUnderwriting} onChange={set('refiUnderwriting')} prefix="$" />
        <NumberField label="Other Misc / Impound" value={deal.refiOtherMisc} onChange={set('refiOtherMisc')} prefix="$" />
        <NumberField label="Seasoning Months" value={deal.refiSeasoningMonths} onChange={set('refiSeasoningMonths')} helper="Months before refi / sale" />
        <NumberField label="Refi LTV %" value={deal.refiLtv} onChange={set('refiLtv')} suffix="%" helper="0 = auto (capped at 65%)" />
        <NumberField label="Refi Title / Escrow" value={deal.refiTitleEscrow} onChange={set('refiTitleEscrow')} prefix="$" helper="Auto: ARV×2% + $500" />
        <div className="field-wide repeater-block">
          <div className="repeater-title">Additional Refi Fees</div>
          <Repeater
            rows={deal.refiExtraFees}
            onChange={(rows) => update({ refiExtraFees: rows })}
            onAdd={() => update({ refiExtraFees: [...(deal.refiExtraFees || []), { id: newUid(), label: '', amount: 0 }] })}
            addLabel="Add Refi fee"
          />
        </div>
      </Section>

      {/* 07 · One-Time Costs */}
      <Section id="onetime" eyebrow="07 · One-Time" title="One-Time Costs" subtitle="Anything else that hits the deal once (inspections, surveys, utilities, etc.).">
        <div className="field-wide repeater-block">
          <Repeater
            rows={deal.oneTimeCosts}
            onChange={(rows) => update({ oneTimeCosts: rows })}
            onAdd={() => update({ oneTimeCosts: [...(deal.oneTimeCosts || []), { id: newUid(), label: '', amount: 0 }] })}
            addLabel="Add one-time cost"
          />
        </div>
      </Section>

      {/* 08 · Settings */}
      <Section id="settings" eyebrow="08 · Settings" title="Settings & Thresholds" subtitle="Flip selling costs and the underwriting targets that drive the traffic-light indicators.">
        <NumberField label="Selling Costs" value={deal.sellingCostsPct} onChange={set('sellingCostsPct')} suffix="%" helper="Realtor + closing on resale" />
        <NumberField label="Flip Hold Months (cash)" value={deal.holdMonthsForFlip} onChange={set('holdMonthsForFlip')} suffix="mo" />
        <NumberField label="Min Cashflow / mo" value={deal.minCashflow} onChange={set('minCashflow')} prefix="$" />
        <NumberField label="Min CoC" value={deal.minCoC} onChange={set('minCoC')} suffix="%" />
        <NumberField label="Min DSCR" value={deal.minDscr} onChange={set('minDscr')} />
        <NumberField label="Min Equity %" value={deal.minEquityPct} onChange={set('minEquityPct')} suffix="%" />
        <NumberField label="Max money in deal" value={deal.maxMoneyInDeal} onChange={set('maxMoneyInDeal')} prefix="$"
          helper="MAO-1 threshold (default $65k)" />
      </Section>

    </div>
  )
}

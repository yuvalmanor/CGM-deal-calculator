'use client'
import { useState } from 'react'
import type { Deal, BRRRRResult, FlipCashResult, FlipHMLResult, MAOResult, DealScore, Status } from '@/lib/deal-model'
import { fmtCurrency, fmtPct, fmtNum, statusFor, monthlyOpExpenses } from '@/lib/deal-model'
import type { BuyHoldResult } from '@/lib/buy-hold'
import { SectionCard, InfoIcon } from './SectionCard'
import { Donut, TableWithDonut, type DonutSlice } from './Donut'

// ---- Primitives ----

function OutputRow({
  label, value, status, accent = false, metricId, onLabelClick,
}: {
  label: string; value: string; status?: Status; accent?: boolean
  metricId?: string; onLabelClick?: (id: string) => void
}) {
  const canClick = metricId && onLabelClick
  return (
    <div className={`out-row${status ? ' out-' + status : ''}${accent ? ' out-accent' : ''}`}>
      <div
        className={`out-label${canClick ? ' out-label-clickable' : ''}`}
        onClick={canClick ? () => onLabelClick(metricId) : undefined}
        title={canClick ? `Formula: ${label}` : undefined}
      >{canClick && <InfoIcon />}{label}</div>
      <div className="out-value mono">{value}</div>
    </div>
  )
}

function OutputGroup({ title, action, valueCaption, children }: {
  title: string
  /** A control on the title line (the Monthly / Yearly switch). */
  action?: React.ReactNode
  /** A caption above the values column (e.g. "Yearly"). */
  valueCaption?: string
  children: React.ReactNode
}) {
  return (
    <div className="out-group">
      {action ? (
        <div className="out-group-head">
          <div className="out-group-title">{title}</div>
          {action}
        </div>
      ) : (
        <div className="out-group-title">{title}</div>
      )}
      {valueCaption && <div className="out-group-value-caption">{valueCaption}</div>}
      <div className="out-group-rows">{children}</div>
    </div>
  )
}

/** Monthly / Yearly switch on the Monthly operating table. Screen only: Yearly
 *  shows each line × 12; nothing is saved or recalculated in a module. */
function PeriodSwitch({ yearly, onChange }: { yearly: boolean; onChange: (yearly: boolean) => void }) {
  return (
    <div className="period-switch" role="group" aria-label="Monthly or yearly values">
      {([false, true] as const).map((y) => (
        <button
          key={String(y)}
          type="button"
          className={`period-btn${yearly === y ? ' active' : ''}`}
          aria-pressed={yearly === y}
          onClick={() => onChange(y)}
        >{y ? 'Yearly' : 'Monthly'}</button>
      ))}
    </div>
  )
}

/** Expense donut slices (both rental tabs): the Monthly operating breakdown lines. */
function expenseSlices(op: ReturnType<typeof monthlyOpExpenses>, mortgagePI: number, k: number): DonutSlice[] {
  return [
    { label: 'Property Tax',             value: op.taxes * k },
    { label: 'Insurance',                value: op.ins * k },
    { label: 'HOA',                      value: op.hoa * k },
    { label: 'State income tax',         value: op.sit * k },
    { label: 'Property management',      value: op.mgmt * k },
    { label: 'Capex / vacancy',          value: op.capV * k },
    { label: 'Additional Monthly Costs', value: op.extras * k },
    { label: 'Mortgage P&I',             value: mortgagePI * k },
  ]
}

/** A collapsible header row inside a row table (expense breakdown, interest-only scenario). */
function CollapsibleRow({ label, open, onToggle, showTitle, hideTitle }: {
  label: string; open: boolean; onToggle: () => void; showTitle: string; hideTitle: string
}) {
  return (
    <div
      className="out-row out-label-clickable"
      onClick={onToggle}
      style={{ cursor: 'pointer', userSelect: 'none' }}
      title={open ? hideTitle : showTitle}
    >
      <div className="out-label">{open ? '▾' : '▸'} {label}</div>
      <div className="out-value mono"></div>
    </div>
  )
}

/** An Advanced Metrics tile; its label opens the formula. */
function AmCell({ label, value, status, metricId, onLabelClick }: {
  label: string; value: string; status: Status; metricId: string; onLabelClick?: (id: string) => void
}) {
  return (
    <div className={`am-cell am-${status}`}>
      <div className="am-label am-label-clickable" onClick={() => onLabelClick?.(metricId)} title={`Formula: ${label}`}>
        <InfoIcon />{label}
      </div>
      <div className="am-value">{value}</div>
    </div>
  )
}

/** The 4 summary cells, as a row of tiles above Purchase & Rehab (user, 2026-11-14). */
function SummaryStrip({ children }: { children: React.ReactNode }) {
  return (
    <div className="summary-strip">
      <div className="summary-grid">{children}</div>
    </div>
  )
}

/** The headline above a card's table (Annual cashflow / Net profit). */
function Headline({ eyebrow, value, status, sub, metricId, onLabelClick }: {
  eyebrow: string; value: string; status: Status; sub: string
  metricId?: string; onLabelClick?: (id: string) => void
}) {
  const canClick = metricId && onLabelClick
  return (
    <div className="scenario-summary">
      <div className="summary-pri">
        <div
          className={`summary-eyebrow${canClick ? ' am-label-clickable' : ''}`}
          onClick={canClick ? () => onLabelClick(metricId) : undefined}
          title={canClick ? `Formula: ${eyebrow}` : undefined}
        >{canClick && <InfoIcon />}{eyebrow}</div>
        <div className={`summary-value ${status}`}>{value}</div>
        <div className="summary-sub">{sub}</div>
      </div>
    </div>
  )
}

/** Purchase Criteria: max-offer rules beside the score breakdown. */
function CriteriaCard({ deal, mao, score, buyHold, onLabelClick }: {
  deal: Deal; mao: MAOResult; score: DealScore; buyHold?: boolean; onLabelClick?: (id: string) => void
}) {
  return (
    <SectionCard title="Purchase Criteria">
      <div className="criteria-grid">
        <MAODetail deal={deal} mao={mao} onLabelClick={onLabelClick} />
        <ScoreBreakdown score={score} buyHold={buyHold} onLabelClick={onLabelClick} />
      </div>
    </SectionCard>
  )
}

// ---- BRRRR tab: section cards ----
// Purchase & Rehab → Cash Flow → Financing → Valuation & Equity →
// Investment Returns → Financial Ratios → Purchase Criteria. Today's group
// titles survive as sub-headings inside the cards.

function BRRRRSections({ deal, brrrr, mao, score, onLabelClick, termSheetSections }: {
  deal: Deal; brrrr: BRRRRResult; mao: MAOResult; score: DealScore
  onLabelClick?: (id: string) => void; termSheetSections?: React.ReactNode
}) {
  const click = onLabelClick
  const [equityShowDollar, setEquityShowDollar] = useState(false)
  const [cocNoCapexView, setCocNoCapexView] = useState(false)
  const [opexExpanded, setOpexExpanded] = useState(true)
  const [ioExpanded, setIoExpanded] = useState(false)
  const [equityMode, setEquityMode] = useState<'book' | 'liquidation'>('book')
  const [annualCFNoCapex, setAnnualCFNoCapex] = useState(false)
  const [yearly, setYearly] = useState(false)
  const op = monthlyOpExpenses(deal)
  // Monthly operating values: × 12 on screen when the switch is on Yearly
  const k = yearly ? 12 : 1
  const $ = (n: number) => fmtCurrency(n * k)
  const additionalRehab = (deal.rehabAdditionalCosts || []).reduce((s, c) => s + (c.amount || 0), 0)
  const oneTime = (deal.oneTimeCosts || []).reduce((s, c) => s + (c.amount || 0), 0)

  const equityDollar = equityMode === 'book' ? brrrr.equityDollar : brrrr.equityLiquidationDollar
  const equityPct    = equityMode === 'book' ? brrrr.equityPct    : brrrr.equityLiquidationPct
  const equityMetricId = equityMode === 'book' ? 'equity_book' : 'equity_liquidation'

  return (
    <div className="section-stack">
      <SummaryStrip>
        <div
          className={`summary-cell ${statusFor('coc', cocNoCapexView ? brrrr.cocNoCapex : brrrr.coc, deal)}`}
          onClick={() => setCocNoCapexView((v) => !v)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          <div className="cell-label">Cash-on-Cash{cocNoCapexView ? ' (w/o CapEx)' : ''}</div>
          <div className="cell-value">{fmtPct(cocNoCapexView ? brrrr.cocNoCapex : brrrr.coc)}</div>
        </div>
        <div className={`summary-cell ${statusFor('dscr', brrrr.dscr, deal)}`}>
          <div className="cell-label">DSCR</div>
          <div className="cell-value">{fmtNum(brrrr.dscr)}</div>
        </div>
        <div
          className={`summary-cell ${statusFor('equity', brrrr.equityPct, deal)}`}
          onClick={() => setEquityShowDollar((v) => !v)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          <div className="cell-label">Equity {equityShowDollar ? '$' : '%'}</div>
          <div className="cell-value">
            {equityShowDollar ? fmtCurrency(brrrr.equityDollar) : fmtPct(brrrr.equityPct)}
          </div>
        </div>
        <div className={`summary-cell ${statusFor('moneyInDeal', brrrr.moneyInDeal, deal)}`}>
          <div className="cell-label">Money in deal</div>
          <div className="cell-value">{fmtCurrency(brrrr.moneyInDeal)}</div>
        </div>
      </SummaryStrip>

      <SectionCard title="Purchase & Rehab">
        <TableWithDonut donut={
          <Donut ariaLabel="Project cost breakdown" slices={[
            { label: 'Purchase price',          value: deal.purchasePrice },
            { label: 'Rehab Estimate (Funded)', value: brrrr.rehabEstimate },
            { label: 'Change Orders',           value: brrrr.changeOrders },
            { label: 'Additional rehab costs',  value: additionalRehab },
            { label: 'Closing costs',           value: deal.closingCostsBuy },
            { label: 'One-time costs',          value: oneTime },
            { label: 'Holding costs',           value: brrrr.cashInHolding },
          ]} />
        }>
          <OutputGroup title="Acquisition">
            <OutputRow label="Purchase price"          value={fmtCurrency(deal.purchasePrice)} metricId="pp" onLabelClick={click} />
            <OutputRow label="Rehab Estimate (Funded)" value={fmtCurrency(brrrr.rehabEstimate)} metricId="rehab_total" onLabelClick={click} />
            <OutputRow label="Change Orders (Not Funded)" value={fmtCurrency(brrrr.changeOrders)} />
            <OutputRow label="Additional rehab costs" value={fmtCurrency(additionalRehab)} />
            <OutputRow label="Closing costs"           value={fmtCurrency(deal.closingCostsBuy)} metricId="closing_buy" onLabelClick={click} />
            <OutputRow label="One-time costs"          value={fmtCurrency(oneTime)} />
            <OutputRow label="Holding costs"           value={fmtCurrency(brrrr.cashInHolding)} metricId="holding_costs" onLabelClick={click} />
            <OutputRow label="Project cost adjustments" value={'−' + fmtCurrency(deal.projectCostAdjustments)} />
            <OutputRow label="Total project cost"      value={fmtCurrency(brrrr.totalProjectCost)} metricId="total_project_cost" onLabelClick={click} accent />
          </OutputGroup>
        </TableWithDonut>
      </SectionCard>

      <SectionCard title="Cash Flow">
        <Headline
          eyebrow="Annual cashflow"
          value={fmtCurrency(brrrr.annualCashflow)}
          status={statusFor('cashflow', brrrr.cashflow, deal)}
          sub={`${fmtCurrency(brrrr.cashflow)} / month after debt service`}
        />

        <TableWithDonut donut={
          <Donut ariaLabel="Operating expense breakdown" slices={expenseSlices(op, brrrr.refiPI, k)} />
        }>
          <OutputGroup title="Monthly operating"
            action={<PeriodSwitch yearly={yearly} onChange={setYearly} />}
            valueCaption={yearly ? 'Yearly' : undefined}>
            <OutputRow label="Gross rent"                                     value={$(brrrr.monthlyRent)} metricId="gross_rent" onLabelClick={click} />
            <CollapsibleRow label="Expense breakdown" open={opexExpanded} onToggle={() => setOpexExpanded((v) => !v)}
              showTitle="Show breakdown" hideTitle="Hide breakdown" />
            {opexExpanded && (<>
              <OutputRow label="Property Tax"         value={'−' + $(op.taxes)} />
              <OutputRow label="Insurance"            value={'−' + $(op.ins)} />
              <OutputRow label="HOA"                  value={'−' + $(op.hoa)} />
              <OutputRow label="State income tax"     value={'−' + $(op.sit)} />
              <OutputRow label="Property management"  value={'−' + $(op.mgmt)} />
              <OutputRow label="Capex / vacancy"      value={'−' + $(op.capV)} />
              <OutputRow label="Additional Monthly Costs" value={'−' + $(op.extras)} />
              <OutputRow label="Mortgage P&I"         value={'−' + $(brrrr.refiPI)} metricId="mortgage_pi" onLabelClick={click} />
            </>)}
            <OutputRow label="Total Operating expenses (Include PITI) / w/o Capex"
              value={'−' + $(brrrr.totalOpexWithPI) + ' / −' + $(brrrr.totalOpexNoCapexWithPI)}
              metricId="total_opex" onLabelClick={click} />
            {/* Known display bug carried over verbatim (plan header): shows the cashflow values */}
            <OutputRow label="NOI / w/o Capex"
              value={$(brrrr.cashflow) + ' / ' + $(brrrr.cashflowNoCapex)}
              metricId="noi" onLabelClick={click} />
            <OutputRow label="Monthly cashflow / w/o Capex"
              value={$(brrrr.cashflow) + ' / ' + $(brrrr.cashflowNoCapex)}
              status={statusFor('cashflow', brrrr.cashflow, deal)} metricId="cashflow" onLabelClick={click} accent />
            {(() => {
              const ioMonthly = brrrr.refiLoan * (deal.refiRate / 100) / 12
              const totalOpexWithIO        = brrrr.totalOpexWithPI        - brrrr.refiPI + ioMonthly
              const totalOpexNoCapexWithIO = brrrr.totalOpexNoCapexWithPI - brrrr.refiPI + ioMonthly
              const cashflowIO        = brrrr.cashflow        + brrrr.refiPI - ioMonthly
              const cashflowNoCapexIO = brrrr.cashflowNoCapex + brrrr.refiPI - ioMonthly
              return (<>
                <CollapsibleRow label="Interest-only scenario" open={ioExpanded} onToggle={() => setIoExpanded((v) => !v)}
                  showTitle="Show interest-only breakdown" hideTitle="Hide interest-only breakdown" />
                {ioExpanded && (<>
                  <OutputRow label="Interest only mortgage monthly" value={'−' + $(ioMonthly)} />
                  <OutputRow label="Total Operating expenses (Include ITI) / w/o Capex"
                    value={'−' + $(totalOpexWithIO) + ' / −' + $(totalOpexNoCapexWithIO)} />
                  <OutputRow label="Monthly cashflow Interest-only / w/o Capex"
                    value={$(cashflowIO) + ' / ' + $(cashflowNoCapexIO)}
                    status={statusFor('cashflow', cashflowIO, deal)} accent />
                </>)}
              </>)
            })()}
          </OutputGroup>
        </TableWithDonut>
      </SectionCard>

      <SectionCard title="Financing">
        <div className="loan-cards">
          <div className="loan-card">
            <div className="loan-card-title">Loan 1 · Hard money</div>
            <OutputGroup title="Hard money loan">
              <OutputRow label={`HML principal (${deal.hmlLevPP.toFixed(1)}% LTC)`} value={fmtCurrency(brrrr.hmlPrincipal)} metricId="hml_principal" onLabelClick={click} />
              <OutputRow label={`Points (${deal.hmlPoints}%)`}      value={fmtCurrency(brrrr.hmlPointsDollar)} />
              <OutputRow label="Monthly interest"   value={fmtCurrency(brrrr.hmlMonthlyInterest)} metricId="hml_monthly_interest" onLabelClick={click} />
              <OutputRow label={`Interest carry (${brrrr.hmlCarryMonths} mo)`} value={fmtCurrency(brrrr.hmlCarryInterest)} metricId="hml_carry" onLabelClick={click} />
              <OutputRow label="Total HML cost (fees)"  value={fmtCurrency(brrrr.hmlTotalCost)} metricId="hml_total_cost" onLabelClick={click} accent />
              <OutputRow label="Total debt to HML"  value={fmtCurrency(brrrr.hmlTotalDebt)} />
              {(() => {
                // Same cashflow as post-refi, with the HML's interest-only payment as
                // the debt service instead of the refi P&I. Derived here, not in the
                // engine — same pattern as the interest-only block above.
                const cashflowHml        = brrrr.cashflow        + brrrr.refiPI - brrrr.hmlMonthlyInterest
                const cashflowHmlNoCapex = brrrr.cashflowNoCapex + brrrr.refiPI - brrrr.hmlMonthlyInterest
                return (
                  <OutputRow label="Monthly cashflow — HML phase / w/o Capex"
                    value={fmtCurrency(cashflowHml) + ' / ' + fmtCurrency(cashflowHmlNoCapex)}
                    status={statusFor('cashflow', cashflowHml, deal)}
                    metricId="cashflow_hml_phase" onLabelClick={click} accent />
                )
              })()}
            </OutputGroup>
          </div>
          <div className="loan-card">
            <div className="loan-card-title">Loan 2 · Refinance</div>
            <OutputGroup title="Refinance">
              <OutputRow label={`New loan (${deal.refiLtv}% LTV)`}  value={fmtCurrency(brrrr.refiLoan)} metricId="refi_loan" onLabelClick={click} />
              <OutputRow label="Refi closing + points"               value={fmtCurrency(brrrr.refiTotalClosing)} metricId="refi_total" onLabelClick={click} />
              <OutputRow label="Cash returned at refi"               value={fmtCurrency(brrrr.cashReturnedAtRefi)} metricId="cash_returned" onLabelClick={click} accent />
              <OutputRow label="Money in deal"                       value={fmtCurrency(brrrr.moneyInDeal)}
                status={statusFor('moneyInDeal', brrrr.moneyInDeal, deal)} metricId="moneyInDeal" onLabelClick={click} accent />
            </OutputGroup>
          </div>
        </div>
        {termSheetSections}
      </SectionCard>

      <SectionCard title="Valuation & Equity" caption="Advanced Metrics" half>
        <div className="am-panel">
          <div className="am-grid">
            <AmCell label="Margin/ARV" value={fmtPct(brrrr.equityMarginOnArv)} status={statusFor('marginOnArv', brrrr.equityMarginOnArv, deal)} metricId="equity_margin_arv" onLabelClick={click} />
            <AmCell label="Forced Equity ROI" value={fmtPct(brrrr.equityMarginArv)} status={statusFor('forcedEquityROI', brrrr.equityMarginArv, deal)} metricId="forced_equity_roi" onLabelClick={click} />
          </div>
          <div className="am-equity">
            <div className="am-equity-header">
              <div className="am-label am-label-clickable" onClick={() => click?.(equityMetricId)} title="Formula: Equity post-Refi">
                <InfoIcon />Equity post-Refi
              </div>
              <div className="am-equity-toggle">
                {(['book', 'liquidation'] as const).map((m) => (
                  <button
                    key={m}
                    className={`am-eq-btn${equityMode === m ? ' active' : ''}`}
                    onClick={() => setEquityMode(m)}
                  >{m === 'book' ? 'Book' : 'Liquidation'}</button>
                ))}
              </div>
            </div>
            <div className="am-equity-values">
              <span className="am-equity-dollar am-label-clickable" onClick={() => click?.(equityMetricId)}>
                {fmtCurrency(equityDollar)}
              </span>
              <span className="am-equity-pct">{fmtPct(equityPct)}</span>
            </div>
            {equityMode === 'liquidation' && (
              <div className="am-equity-note">After {deal.sellingCostsPct}% selling costs</div>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Investment Returns" caption="Advanced Metrics" half>
        <div className="am-panel">
          <div className="am-grid">
            <AmCell label="Cap Rate" value={fmtPct(brrrr.capRate)} status={statusFor('capRate', brrrr.capRate, deal)} metricId="cap_rate" onLabelClick={click} />
            <AmCell label="ROE" value={fmtPct(brrrr.roe)} status={statusFor('roe', brrrr.roe, deal)} metricId="roe" onLabelClick={click} />
            <div className="am-cell am-neutral">
              <div className="am-label am-label-clickable" onClick={() => click?.('annual_cashflow')}>
                <InfoIcon />Annual CF {annualCFNoCapex ? '(no capex)' : '(w/ capex)'}
              </div>
              <div
                className="am-value am-label-clickable"
                title="Click to toggle CapEx"
                onClick={() => setAnnualCFNoCapex((v) => !v)}
              >
                {fmtCurrency(annualCFNoCapex ? brrrr.cashflowNoCapex * 12 : brrrr.annualCashflow)}
              </div>
            </div>
          </div>
          <div className="am-irr">
            <div className="am-irr-title am-label-clickable" onClick={() => click?.('irr_scenarios')}>
              <InfoIcon />5-Year IRR
            </div>
            {brrrr.moneyInDeal <= 0 ? (
              <div className="am-irr-note">Full BRRRR — infinite return (no money left in deal)</div>
            ) : (
              <div className="am-irr-rows">
                {([['2%', brrrr.irr2pct], ['3%', brrrr.irr3pct], ['4%', brrrr.irr4pct]] as const).map(([label, v]) => (
                  <div className="am-irr-row" key={label}>
                    <span className="am-irr-label">{label} appreciation</span>
                    <span className={`am-irr-value am-${statusFor('irr', v, deal)}`}>{fmtPct(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Financial Ratios" caption="Advanced Metrics" half>
        <div className="am-panel">
          <div className="am-grid">
            <AmCell label="GRM" value={`${brrrr.grm.toFixed(1)}×`} status={statusFor('grm', brrrr.grm, deal)} metricId="grm" onLabelClick={click} />
            {/* Deliberate duplicate of the summary DSCR cell (plan header) */}
            <AmCell label="DSCR" value={fmtNum(brrrr.dscr)} status={statusFor('dscr', brrrr.dscr, deal)} metricId="dscr" onLabelClick={click} />
          </div>
        </div>
      </SectionCard>

      <CriteriaCard deal={deal} mao={mao} score={score} onLabelClick={click} />
    </div>
  )
}

// ---- Buy & Hold tab: section cards ----
// Same order as BRRRR. Advanced Metrics · Buy & Hold is folded into the
// Financing (Loan), Valuation & Equity, Investment Returns and Financial
// Ratios cards; Financial Ratios adds the deliberate second DSCR.

function BuyHoldSections({ deal, bnh, mao, score, onLabelClick, onUpdate, termSheetSections }: {
  deal: Deal; bnh: BuyHoldResult; mao: MAOResult; score: DealScore
  onLabelClick?: (id: string) => void; onUpdate?: (patch: Partial<Deal>) => void
  termSheetSections?: React.ReactNode
}) {
  const click = onLabelClick
  const [cocNoCapexView, setCocNoCapexView] = useState(false)
  const [equityShowDollar, setEquityShowDollar] = useState(false)
  const [opexExpanded, setOpexExpanded] = useState(true)
  const [annualCFNoCapex, setAnnualCFNoCapex] = useState(false)
  const [yearly, setYearly] = useState(false)
  const op = monthlyOpExpenses(deal)
  // Monthly operating values: × 12 on screen when the switch is on Yearly
  const k = yearly ? 12 : 1
  const $ = (n: number) => fmtCurrency(n * k)
  const basisLabel = deal.bnhValueBasis === 'purchase' ? 'purchase price' : 'ARV'
  // Tile labels open the formula modal; a tile that toggles a view keeps that on its value
  const tileLabel = (text: string, id: string) => (
    <div className="cell-label am-label-clickable" onClick={(e) => { e.stopPropagation(); click?.(id) }} title={`Formula: ${text}`}><InfoIcon />{text}</div>
  )

  return (
    <div className="section-stack">
      <SummaryStrip>
        <div
          className={`summary-cell ${statusFor('coc', cocNoCapexView ? bnh.cocNoCapex : bnh.coc, deal)}`}
          onClick={() => setCocNoCapexView((v) => !v)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          {tileLabel(`Cash-on-Cash${cocNoCapexView ? ' (w/o CapEx)' : ''}`, 'bnh_coc')}
          <div className="cell-value">{fmtPct(cocNoCapexView ? bnh.cocNoCapex : bnh.coc)}</div>
        </div>
        <div className={`summary-cell ${statusFor('dscr', bnh.dscr, deal)}`}>
          {tileLabel('DSCR', 'bnh_dscr')}
          <div className="cell-value">{fmtNum(bnh.dscr)}</div>
        </div>
        <div
          className={`summary-cell ${statusFor('equity', bnh.equityPct, deal)}`}
          onClick={() => setEquityShowDollar((v) => !v)}
          style={{ cursor: 'pointer', userSelect: 'none' }}
        >
          {tileLabel(`Equity ${equityShowDollar ? '$' : '%'}`, 'bnh_equity')}
          <div className="cell-value">
            {equityShowDollar ? fmtCurrency(bnh.equityDollar) : fmtPct(bnh.equityPct)}
          </div>
        </div>
        <div className={`summary-cell ${statusFor('moneyInDeal', bnh.cashIn, deal)}`}>
          {tileLabel('Cash In', 'bnh_cash_in')}
          <div className="cell-value">{fmtCurrency(bnh.cashIn)}</div>
        </div>
      </SummaryStrip>

      <SectionCard title="Purchase & Rehab">
        <TableWithDonut donut={
          // Purchase price and Loan are not slices: price = down payment + loan
          <Donut ariaLabel="Cash in breakdown" slices={[
            { label: 'Down payment',     value: bnh.downPayment },
            { label: 'Loan costs',       value: bnh.loanCosts },
            { label: 'Closing costs',    value: deal.closingCostsBuy },
            { label: 'Rehab (all cash)', value: bnh.cashRehab },
            { label: 'One-time costs',   value: bnh.oneTimeCosts },
            { label: 'Holding costs',    value: bnh.holdingCosts },
          ]} />
        }>
          <OutputGroup title="Purchase & cash in">
            <OutputRow label="Purchase price"                       value={fmtCurrency(deal.purchasePrice)} metricId="pp" onLabelClick={click} />
            <OutputRow label="Down payment"                         value={fmtCurrency(bnh.downPayment)} metricId="bnh_down_payment" onLabelClick={click} />
            <OutputRow label={`Loan (${deal.bnhLoanPct}% of price)`} value={fmtCurrency(bnh.loan)} metricId="bnh_loan" onLabelClick={click} />
            <OutputRow label="Loan costs (points + fees + title/escrow)" value={fmtCurrency(bnh.loanCosts)} metricId="bnh_loan_costs" onLabelClick={click} />
            <OutputRow label="Closing costs"                        value={fmtCurrency(deal.closingCostsBuy)} metricId="closing_buy" onLabelClick={click} />
            <OutputRow label="Rehab (all cash)"                     value={fmtCurrency(bnh.cashRehab)} metricId="bnh_cash_rehab" onLabelClick={click} />
            <OutputRow label="One-time costs"                       value={fmtCurrency(bnh.oneTimeCosts)} metricId="bnh_one_time" onLabelClick={click} />
            <OutputRow label={`Holding costs (${deal.rehabMonths} mo, incl. mortgage)`} value={fmtCurrency(bnh.holdingCosts)} metricId="bnh_holding" onLabelClick={click} />
            <OutputRow label="Credits at close"                     value={'−' + fmtCurrency(deal.projectCostAdjustments)} metricId="bnh_credits" onLabelClick={click} />
            <OutputRow label="Cash In"                              value={fmtCurrency(bnh.cashIn)}
              status={statusFor('moneyInDeal', bnh.cashIn, deal)} metricId="bnh_cash_in" onLabelClick={click} accent />
          </OutputGroup>
        </TableWithDonut>
      </SectionCard>

      <SectionCard title="Cash Flow">
        <Headline
          eyebrow="Annual cashflow"
          value={fmtCurrency(bnh.annualCashflow)}
          status={statusFor('cashflow', bnh.cashflow, deal)}
          sub={`${fmtCurrency(bnh.cashflow)} / month after the B&H mortgage`}
          metricId="bnh_cashflow" onLabelClick={click}
        />

        <TableWithDonut donut={
          <Donut ariaLabel="Operating expense breakdown" slices={expenseSlices(op, bnh.mortgagePI, k)} />
        }>
          <OutputGroup title="Monthly operating"
            action={<PeriodSwitch yearly={yearly} onChange={setYearly} />}
            valueCaption={yearly ? 'Yearly' : undefined}>
            <OutputRow label="Gross rent" value={$(bnh.monthlyRent)} metricId="gross_rent" onLabelClick={click} />
            <CollapsibleRow label="Expense breakdown" open={opexExpanded} onToggle={() => setOpexExpanded((v) => !v)}
              showTitle="Show breakdown" hideTitle="Hide breakdown" />
            {opexExpanded && (<>
              <OutputRow label="Property Tax"             value={'−' + $(op.taxes)}  metricId="bnh_total_opex" onLabelClick={click} />
              <OutputRow label="Insurance"                value={'−' + $(op.ins)}    metricId="bnh_total_opex" onLabelClick={click} />
              <OutputRow label="HOA"                      value={'−' + $(op.hoa)}    metricId="bnh_total_opex" onLabelClick={click} />
              <OutputRow label="State income tax"         value={'−' + $(op.sit)}    metricId="bnh_total_opex" onLabelClick={click} />
              <OutputRow label="Property management"      value={'−' + $(op.mgmt)}   metricId="bnh_total_opex" onLabelClick={click} />
              <OutputRow label="Capex / vacancy"          value={'−' + $(op.capV)}   metricId="bnh_total_opex" onLabelClick={click} />
              <OutputRow label="Additional Monthly Costs" value={'−' + $(op.extras)} metricId="bnh_total_opex" onLabelClick={click} />
              <OutputRow label="Mortgage P&I"             value={'−' + $(bnh.mortgagePI)} metricId="bnh_mortgage" onLabelClick={click} />
            </>)}
            <OutputRow label="Total Operating expenses (incl. P&I) / w/o Capex"
              value={'−' + $(bnh.totalOpexWithPI) + ' / −' + $(bnh.totalOpexNoCapexWithPI)}
              metricId="bnh_total_opex" onLabelClick={click} />
            <OutputRow label="NOI" value={$(bnh.noi)} metricId="bnh_noi" onLabelClick={click} />
            <OutputRow label="Monthly cashflow / w/o Capex"
              value={$(bnh.cashflow) + ' / ' + $(bnh.cashflowNoCapex)}
              status={statusFor('cashflow', bnh.cashflow, deal)} metricId="bnh_cashflow" onLabelClick={click} accent />
          </OutputGroup>
        </TableWithDonut>
      </SectionCard>

      <SectionCard title="Financing">
        <div className="loan-cards">
          <div className="loan-card">
            <div className="loan-card-title">Loan · Buy & Hold</div>
            <div className="am-panel">
              <div className="am-grid">
                <AmCell label={`Loan (${deal.bnhLoanPct}%)`} value={fmtCurrency(bnh.loan)} status="neutral" metricId="bnh_loan" onLabelClick={click} />
              </div>
            </div>
          </div>
        </div>
        {termSheetSections}
      </SectionCard>

      <SectionCard title="Valuation & Equity" caption="Advanced Metrics · Buy & Hold" half>
        <div className="am-panel">
          {/* Tiles first, so this card's tile row lines up with Investment Returns */}
          <div className="am-grid">
            <AmCell label={`Value (${basisLabel})`} value={fmtCurrency(bnh.value)} status="neutral" metricId="bnh_value" onLabelClick={click} />
          </div>
          <div className="bnh-basis">
            <span className="am-label am-label-clickable" onClick={() => click?.('bnh_value')} title="Formula: B&H property value">
              <InfoIcon />Property value
            </span>
            <div className="am-equity-toggle" role="group" aria-label="B&H property value">
              {(['arv', 'purchase'] as const).map((b) => (
                <button
                  key={b}
                  className={`am-eq-btn${deal.bnhValueBasis === b ? ' active' : ''}`}
                  aria-pressed={deal.bnhValueBasis === b}
                  onClick={() => onUpdate?.({ bnhValueBasis: b })}
                >{b === 'arv' ? 'ARV' : 'Purchase price'}</button>
              ))}
            </div>
            <span className="mono bnh-basis-value">{fmtCurrency(bnh.value)}</span>
          </div>
          <div className="am-equity">
            <div className="am-equity-header">
              <div className="am-label am-label-clickable" onClick={() => click?.('bnh_equity')} title="Formula: Equity at purchase">
                <InfoIcon />Equity at purchase
              </div>
            </div>
            <div className="am-equity-values">
              <span className="am-equity-dollar am-label-clickable" onClick={() => click?.('bnh_equity')}>
                {fmtCurrency(bnh.equityDollar)}
              </span>
              <span className="am-equity-pct">{fmtPct(bnh.equityPct)}</span>
            </div>
            <div className="am-equity-note">On {basisLabel}: value − B&H loan</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Investment Returns" caption="Advanced Metrics · Buy & Hold" half>
        <div className="am-panel">
          <div className="am-grid">
            <AmCell label="Cap Rate" value={fmtPct(bnh.capRate)} status={statusFor('capRate', bnh.capRate, deal)} metricId="bnh_cap_rate" onLabelClick={click} />
            <AmCell label="ROE" value={fmtPct(bnh.roe)} status={statusFor('roe', bnh.roe, deal)} metricId="bnh_roe" onLabelClick={click} />
            <div className="am-cell am-neutral">
              <div className="am-label am-label-clickable" onClick={() => click?.('bnh_cashflow')}>
                <InfoIcon />Annual CF {annualCFNoCapex ? '(no capex)' : '(w/ capex)'}
              </div>
              <div
                className="am-value am-label-clickable"
                title="Click to toggle CapEx"
                onClick={() => setAnnualCFNoCapex((v) => !v)}
              >
                {fmtCurrency(annualCFNoCapex ? bnh.cashflowNoCapex * 12 : bnh.annualCashflow)}
              </div>
            </div>
          </div>
          <div className="am-irr">
            <div className="am-irr-title am-label-clickable" onClick={() => click?.('bnh_irr')}>
              <InfoIcon />5-Year IRR
            </div>
            {bnh.cashIn <= 0 ? (
              <div className="am-irr-note">No cash in the deal — infinite return</div>
            ) : (
              <div className="am-irr-rows">
                {([['2%', bnh.irr2pct], ['3%', bnh.irr3pct], ['4%', bnh.irr4pct]] as const).map(([label, v]) => (
                  <div className="am-irr-row" key={label}>
                    <span className="am-irr-label">{label} appreciation</span>
                    <span className={`am-irr-value am-${statusFor('irr', v, deal)}`}>{fmtPct(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Financial Ratios" caption="Advanced Metrics · Buy & Hold" half>
        <div className="am-panel">
          <div className="am-grid">
            <AmCell label="GRM" value={`${bnh.grm.toFixed(1)}×`} status={statusFor('grm', bnh.grm, deal)} metricId="bnh_grm" onLabelClick={click} />
            {/* Deliberate duplicate of the summary DSCR cell (plan header) */}
            <AmCell label="DSCR" value={fmtNum(bnh.dscr)} status={statusFor('dscr', bnh.dscr, deal)} metricId="bnh_dscr" onLabelClick={click} />
          </div>
        </div>
      </SectionCard>

      <CriteriaCard deal={deal} mao={mao} score={score} buyHold onLabelClick={click} />
    </div>
  )
}

// ---- Flip tabs: section cards ----
// Purchase & Rehab (Net profit headline + Cash deployed) → Financing (Term
// Sheets) → Valuation & Equity (Sale) → Purchase Criteria. No Cash Flow,
// Investment Returns or Financial Ratios on a flip.

function FlipCashSections({ deal, flip, mao, score, onLabelClick, termSheetSections }: {
  deal: Deal; flip: FlipCashResult; mao: MAOResult; score: DealScore
  onLabelClick?: (id: string) => void; termSheetSections?: React.ReactNode
}) {
  const roiStatus = statusFor('roi', flip.roi, deal)
  const profitStatus: Status = flip.profit > 0 ? 'good' : 'bad'
  return (
    <div className="section-stack">
      <SummaryStrip>
        <div className={`summary-cell ${roiStatus}`}>
          <div className="cell-label">ROI</div>
          <div className="cell-value">{fmtPct(flip.roi)}</div>
        </div>
        <div className={`summary-cell ${statusFor('roi', flip.annualizedRoi, deal)}`}>
          <div className="cell-label">Annualized</div>
          <div className="cell-value">{fmtPct(flip.annualizedRoi)}</div>
        </div>
        <div className="summary-cell neutral">
          <div className="cell-label">Cash in</div>
          <div className="cell-value">{fmtCurrency(flip.totalCashIn)}</div>
        </div>
        <div className="summary-cell neutral">
          <div className="cell-label">ARV</div>
          <div className="cell-value">{fmtCurrency(flip.arv)}</div>
        </div>
      </SummaryStrip>

      <SectionCard title="Purchase & Rehab">
        <Headline eyebrow="Net profit" value={fmtCurrency(flip.profit)} status={profitStatus}
          sub={`After ${flip.holdMonths} mo hold + selling costs`} />
        <OutputGroup title="Cash deployed">
          <OutputRow label="Purchase + rehab + closing" value={fmtCurrency(deal.purchasePrice + flip.rehab + deal.closingCostsBuy)} />
          <OutputRow label={`Holding carry (${flip.holdMonths} mo, full opex)`} value={fmtCurrency(flip.holdingCarry)} />
          <OutputRow label="Total cash in" value={fmtCurrency(flip.totalCashIn)} accent />
        </OutputGroup>
      </SectionCard>

      <SectionCard title="Financing">{termSheetSections}</SectionCard>

      <SectionCard title="Valuation & Equity">
        <OutputGroup title="Sale">
          <OutputRow label="ARV / sale price"                         value={fmtCurrency(deal.arv)} />
          <OutputRow label={`Selling costs (${deal.sellingCostsPct}%)`} value={'−' + fmtCurrency(flip.sellingCosts)} />
          <OutputRow label="Gross proceeds"                           value={fmtCurrency(flip.grossProceeds)} />
          <OutputRow label="Net profit"                               value={fmtCurrency(flip.profit)}
            status={profitStatus} accent />
        </OutputGroup>
      </SectionCard>

      <CriteriaCard deal={deal} mao={mao} score={score} onLabelClick={onLabelClick} />
    </div>
  )
}

function FlipHMLSections({ deal, flip, mao, score, onLabelClick, termSheetSections }: {
  deal: Deal; flip: FlipHMLResult; mao: MAOResult; score: DealScore
  onLabelClick?: (id: string) => void; termSheetSections?: React.ReactNode
}) {
  const roiStatus = statusFor('roi', flip.roi, deal)
  const profitStatus: Status = flip.profit > 0 ? 'good' : 'bad'
  return (
    <div className="section-stack">
      <SummaryStrip>
        <div className={`summary-cell ${roiStatus}`}>
          <div className="cell-label">ROI on cash</div>
          <div className="cell-value">{fmtPct(flip.roi)}</div>
        </div>
        <div className={`summary-cell ${statusFor('roi', flip.annualizedRoi, deal)}`}>
          <div className="cell-label">Annualized</div>
          <div className="cell-value">{fmtPct(flip.annualizedRoi)}</div>
        </div>
        <div className="summary-cell neutral">
          <div className="cell-label">Cash in</div>
          <div className="cell-value">{fmtCurrency(flip.cashIn)}</div>
        </div>
        <div className="summary-cell neutral">
          <div className="cell-label">HML payoff</div>
          <div className="cell-value">{fmtCurrency(flip.hmlPrincipal)}</div>
        </div>
      </SummaryStrip>

      <SectionCard title="Purchase & Rehab">
        <Headline eyebrow="Net profit" value={fmtCurrency(flip.profit)} status={profitStatus}
          sub="Leveraged with hard money" />
        <OutputGroup title="Cash deployed">
          <OutputRow label="Acquisition gap + closing + points"               value={fmtCurrency(flip.cashInAcq)} />
          <OutputRow label={`Holding (HML interest + full opex, ${flip.holdMonths} mo)`} value={fmtCurrency(flip.cashHolding)} />
          <OutputRow label="Total cash in"                                    value={fmtCurrency(flip.cashIn)} accent />
        </OutputGroup>
      </SectionCard>

      <SectionCard title="Financing">{termSheetSections}</SectionCard>

      <SectionCard title="Valuation & Equity">
        <OutputGroup title="Sale">
          <OutputRow label="ARV / sale price"                               value={fmtCurrency(deal.arv)} />
          <OutputRow label={`Selling costs (${deal.sellingCostsPct}%)`}    value={'−' + fmtCurrency(flip.sellingCosts)} />
          <OutputRow label="HML payoff"                                     value={'−' + fmtCurrency(flip.hmlPrincipal)} />
          <OutputRow label="Net to investor"                                value={fmtCurrency(flip.netToInvestor)} />
          <OutputRow label="Net profit"                                     value={fmtCurrency(flip.profit)}
            status={profitStatus} accent />
        </OutputGroup>
      </SectionCard>

      <CriteriaCard deal={deal} mao={mao} score={score} onLabelClick={onLabelClick} />
    </div>
  )
}

// ---- MAO Detail ----

/** ✓ when the purchase price ≤ this rule's max offer — the same test as
 *  "below / ABOVE MAO", shown per rule. The mark is its own grid cell so the
 *  rule's label and value are unchanged. */
function RuleCheck({ deal, maxOffer }: { deal: Deal; maxOffer: number }) {
  const pass = maxOffer - deal.purchasePrice >= 0
  return (
    <span
      className={`mao-check ${pass ? 'mao-check-pass' : 'mao-check-fail'}`}
      role="img"
      aria-label={pass ? 'Purchase price within this max offer' : 'Purchase price above this max offer'}
      title={pass ? 'Purchase price ≤ this max offer' : 'Purchase price > this max offer'}
    >{pass ? '✓' : '✗'}</span>
  )
}

function MAODetail({ deal, mao, onLabelClick }: { deal: Deal; mao: MAOResult; onLabelClick?: (id: string) => void }) {
  const offerStatus: Status = mao.deltaToOffer >= 0 ? 'good' : 'bad'
  return (
    <div className="mao-detail">
      <div className="mao-detail-header">
        <div className="mao-detail-title">Maximum Allowable Offer</div>
        <div className={`mao-detail-value ${offerStatus}`}>{fmtCurrency(mao.mao)}</div>
      </div>
      <div className="mao-detail-rows">
        <div className="mao-detail-row">
          <RuleCheck deal={deal} maxOffer={mao.mao70} />
          <div className="mao-rule mao-rule-clickable" onClick={() => onLabelClick?.('mao_70')}><InfoIcon />70% Rule</div>
          <div className="mao-rule-formula">ARV × 70% − rehab</div>
          <div className="mao-rule-value">{fmtCurrency(mao.mao70)}</div>
        </div>
        <div className="mao-detail-row">
          <RuleCheck deal={deal} maxOffer={mao.maoMoneyInDeal} />
          <div className="mao-rule mao-rule-clickable" onClick={() => onLabelClick?.('mao_brrrr')}><InfoIcon />Money in deal ≤ ${(deal.maxMoneyInDeal / 1000).toFixed(0)}k</div>
          <div className="mao-rule-formula">money in deal = target</div>
          <div className="mao-rule-value">{fmtCurrency(mao.maoMoneyInDeal)}</div>
        </div>
        <div className="mao-detail-row">
          <RuleCheck deal={deal} maxOffer={mao.maoEquity} />
          <div className="mao-rule mao-rule-clickable" onClick={() => onLabelClick?.('mao_equity')}><InfoIcon />Equity post-Refi ≥ {deal.minEquityPct}%</div>
          <div className="mao-rule-formula">money in deal ≤ post-Refi equity ÷ (1 + {deal.minEquityPct}%)</div>
          <div className="mao-rule-value">{fmtCurrency(mao.maoEquity)}</div>
        </div>
        <div className="mao-detail-row mao-binding">
          <span className="mao-check" aria-hidden="true" />
          <div className="mao-rule">Binding constraint</div>
          <div className="mao-rule-formula">{mao.constraint}</div>
          <div className="mao-rule-value">{fmtCurrency(mao.mao)}</div>
        </div>
        <div className={`mao-detail-row mao-current ${offerStatus}`}>
          <span className="mao-check" aria-hidden="true" />
          <div className="mao-rule">Your offer</div>
          <div className="mao-rule-formula">
            {mao.deltaToOffer >= 0
              ? `${fmtCurrency(mao.deltaToOffer)} below MAO`
              : `${fmtCurrency(Math.abs(mao.deltaToOffer))} ABOVE MAO`}
          </div>
          <div className="mao-rule-value">{fmtCurrency(deal.purchasePrice)}</div>
        </div>
      </div>
    </div>
  )
}

// ---- Score Breakdown ----

function ScoreBreakdown({ score, buyHold, onLabelClick }: { score: DealScore; buyHold?: boolean; onLabelClick?: (id: string) => void }) {
  // On the B&H tab the score is B&H's: CoC and Equity % come from the B&H lens
  const scoreKeyToMetricId: Record<string, string> = buyHold
    ? { coc: 'bnh_score_coc', equity: 'bnh_score_equity', location: 'score_location' }
    : { coc: 'score_coc', equity: 'score_equity', location: 'score_location' }
  return (
    <div className="score-breakdown">
      <div className="breakdown-header">
        <div className="breakdown-title">{buyHold ? 'B&H Deal Score Breakdown' : 'Deal Score Breakdown'}</div>
        <div
          className={`breakdown-total${buyHold && onLabelClick ? ' bd-label-clickable' : ''}`}
          onClick={buyHold && onLabelClick ? () => onLabelClick('bnh_score') : undefined}
          title={buyHold ? 'Formula: B&H Deal Score' : undefined}
        >{buyHold && onLabelClick && <InfoIcon />}{score.score.toFixed(1)} <span>/ 10</span></div>
      </div>
      <ul className="breakdown-list">
        {score.components.map((c) => {
          const pct = (c.score / 10) * 100
          const st  = c.score >= 7 ? 'good' : c.score >= 4 ? 'warn' : 'bad'
          const metricId = scoreKeyToMetricId[c.key]
          return (
            <li key={c.key} className={`breakdown-item bd-${st}`}>
              <div className="bd-row1">
                <span
                  className={`bd-label${metricId && onLabelClick ? ' bd-label-clickable' : ''}`}
                  onClick={metricId && onLabelClick ? () => onLabelClick(metricId) : undefined}
                >{metricId && onLabelClick && <InfoIcon />}{c.label}</span>
                <span className="bd-value">{c.value}</span>
              </div>
              <div className="bd-bar">
                <div className="bd-fill" style={{ width: pct + '%' }} />
              </div>
              <div className="bd-row2">
                <span>target {c.target}</span>
                <span>weight {(c.weight * 100).toFixed(0)}%</span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ---- ScenarioPanel (exported) ----
// The Scenario tabs and the Edit deal button live in DealHeader; this panel
// renders the open tab's section cards. Each tab is its own component, so
// switching tabs remounts it and resets its view toggles.

type ScenarioKey = 'brrrr' | 'buyHold' | 'flipCash' | 'flipHml'

interface Props {
  deal: Deal
  brrrr: BRRRRResult
  buyHold: BuyHoldResult
  flipCash: FlipCashResult
  flipHml: FlipHMLResult
  mao: MAOResult
  score: DealScore           // B&H's score on the B&H tab, BRRRR's elsewhere
  scenario: ScenarioKey
  onLabelClick?: (id: string) => void
  onUpdate?: (patch: Partial<Deal>) => void  // the B&H value toggle writes bnhValueBasis
  termSheetSections?: React.ReactNode  // per-role Term Sheet panels, owned by DealCalculator
}

export function ScenarioPanel({ deal, brrrr, buyHold, flipCash, flipHml, mao, score, scenario, onLabelClick, onUpdate, termSheetSections }: Props) {
  const shared = { deal, mao, score, onLabelClick, termSheetSections }
  return (
    <div className="scenario-panel">
      {scenario === 'brrrr'    && <BRRRRSections    {...shared} brrrr={brrrr} />}
      {scenario === 'buyHold'  && <BuyHoldSections  {...shared} bnh={buyHold} onUpdate={onUpdate} />}
      {scenario === 'flipCash' && <FlipCashSections {...shared} flip={flipCash} />}
      {scenario === 'flipHml'  && <FlipHMLSections  {...shared} flip={flipHml} />}
    </div>
  )
}

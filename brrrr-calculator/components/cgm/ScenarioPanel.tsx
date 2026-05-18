'use client'
import { useState } from 'react'
import type { Deal, BRRRRResult, FlipCashResult, FlipHMLResult, MAOResult, DealScore, Status } from '@/lib/deal-model'
import { fmtCurrency, fmtPct, fmtNum, statusFor, monthlyOpExpenses } from '@/lib/deal-model'

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
      >{label}</div>
      <div className="out-value mono">{value}</div>
    </div>
  )
}

function OutputGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="out-group">
      <div className="out-group-title">{title}</div>
      <div className="out-group-rows">{children}</div>
    </div>
  )
}

// ---- BRRRR view ----

function BRRRRView({ deal, brrrr, onLabelClick }: { deal: Deal; brrrr: BRRRRResult; onLabelClick?: (id: string) => void }) {
  const click = onLabelClick
  const [equityShowDollar, setEquityShowDollar] = useState(false)
  const [cocNoCapexView, setCocNoCapexView] = useState(false)
  const [opexExpanded, setOpexExpanded] = useState(true)
  const [ioExpanded, setIoExpanded] = useState(false)
  return (
    <div className="scenario-view">
      <div className="scenario-summary">
        <div className="summary-pri">
          <div className="summary-eyebrow">Annual cashflow</div>
          <div className={`summary-value ${statusFor('cashflow', brrrr.cashflow, deal)}`}>
            {fmtCurrency(brrrr.annualCashflow)}
          </div>
          <div className="summary-sub">{fmtCurrency(brrrr.cashflow)} / month after debt service</div>
        </div>
        <div className="summary-grid">
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
        </div>
      </div>

      <OutputGroup title="Acquisition">
        <OutputRow label="Purchase price"          value={fmtCurrency(deal.purchasePrice)} metricId="pp" onLabelClick={click} />
        <OutputRow label="Rehab Estimate (Funded)" value={fmtCurrency(brrrr.rehabEstimate)} metricId="rehab_total" onLabelClick={click} />
        <OutputRow label="Change Orders (Not Funded)" value={fmtCurrency(brrrr.changeOrders)} />
        <OutputRow label="Additional rehab costs" value={fmtCurrency((deal.rehabAdditionalCosts || []).reduce((s, c) => s + (c.amount || 0), 0))} />
        <OutputRow label="Closing costs"           value={fmtCurrency(deal.closingCostsBuy)} metricId="closing_buy" onLabelClick={click} />
        <OutputRow label="One-time costs"          value={fmtCurrency((deal.oneTimeCosts || []).reduce((s, c) => s + (c.amount || 0), 0))} />
        <OutputRow label="Holding costs"           value={fmtCurrency(brrrr.cashInHolding)} metricId="hml_carry" onLabelClick={click} />
        <OutputRow label="Project cost adjustments" value={'−' + fmtCurrency(deal.projectCostAdjustments)} />
        <OutputRow label="Total project cost"      value={fmtCurrency(brrrr.totalProjectCost)} metricId="total_project_cost" onLabelClick={click} accent />
      </OutputGroup>

      {(() => {
        const op = monthlyOpExpenses(deal)
        return (
          <OutputGroup title="Monthly operating">
            <OutputRow label="Gross rent"                                     value={fmtCurrency(brrrr.monthlyRent)} metricId="gross_rent" onLabelClick={click} />
            <div
              className="out-row out-label-clickable"
              onClick={() => setOpexExpanded((v) => !v)}
              style={{ cursor: 'pointer', userSelect: 'none' }}
              title={opexExpanded ? 'Hide breakdown' : 'Show breakdown'}
            >
              <div className="out-label">{opexExpanded ? '▾' : '▸'} Expense breakdown</div>
              <div className="out-value mono"></div>
            </div>
            {opexExpanded && (<>
              <OutputRow label="Property Tax"         value={'−' + fmtCurrency(op.taxes)} />
              <OutputRow label="Insurance"            value={'−' + fmtCurrency(op.ins)} />
              <OutputRow label="HOA"                  value={'−' + fmtCurrency(op.hoa)} />
              <OutputRow label="State income tax"     value={'−' + fmtCurrency(op.sit)} />
              <OutputRow label="Property management"  value={'−' + fmtCurrency(op.mgmt)} />
              <OutputRow label="Capex / vacancy"      value={'−' + fmtCurrency(op.capV)} />
              <OutputRow label="Additional Monthly Costs" value={'−' + fmtCurrency(op.extras)} />
              <OutputRow label="Mortgage P&I"         value={'−' + fmtCurrency(brrrr.refiPI)} metricId="mortgage_pi" onLabelClick={click} />
            </>)}
            <OutputRow label="Total Operating expenses (Include PITI) / w/o Capex"
              value={'−' + fmtCurrency(brrrr.totalOpexWithPI) + ' / −' + fmtCurrency(brrrr.totalOpexNoCapexWithPI)}
              metricId="total_opex" onLabelClick={click} />
            <OutputRow label="NOI / w/o Capex"
              value={fmtCurrency(brrrr.cashflow) + ' / ' + fmtCurrency(brrrr.cashflowNoCapex)}
              metricId="noi" onLabelClick={click} />
            <OutputRow label="Monthly cashflow / w/o Capex"
              value={fmtCurrency(brrrr.cashflow) + ' / ' + fmtCurrency(brrrr.cashflowNoCapex)}
              status={statusFor('cashflow', brrrr.cashflow, deal)} metricId="cashflow" onLabelClick={click} accent />
            {(() => {
              const ioMonthly = brrrr.refiLoan * (deal.refiRate / 100) / 12
              const totalOpexWithIO        = brrrr.totalOpexWithPI        - brrrr.refiPI + ioMonthly
              const totalOpexNoCapexWithIO = brrrr.totalOpexNoCapexWithPI - brrrr.refiPI + ioMonthly
              const cashflowIO        = brrrr.cashflow        + brrrr.refiPI - ioMonthly
              const cashflowNoCapexIO = brrrr.cashflowNoCapex + brrrr.refiPI - ioMonthly
              return (<>
                <div
                  className="out-row out-label-clickable"
                  onClick={() => setIoExpanded((v) => !v)}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title={ioExpanded ? 'Hide interest-only breakdown' : 'Show interest-only breakdown'}
                >
                  <div className="out-label">{ioExpanded ? '▾' : '▸'} Interest-only scenario</div>
                  <div className="out-value mono"></div>
                </div>
                {ioExpanded && (<>
                  <OutputRow label="Interest only mortgage monthly" value={'−' + fmtCurrency(ioMonthly)} />
                  <OutputRow label="Total Operating expenses (Include ITI) / w/o Capex"
                    value={'−' + fmtCurrency(totalOpexWithIO) + ' / −' + fmtCurrency(totalOpexNoCapexWithIO)} />
                  <OutputRow label="Monthly cashflow Interest-only / w/o Capex"
                    value={fmtCurrency(cashflowIO) + ' / ' + fmtCurrency(cashflowNoCapexIO)}
                    status={statusFor('cashflow', cashflowIO, deal)} accent />
                </>)}
              </>)
            })()}
          </OutputGroup>
        )
      })()}

      <OutputGroup title="Hard money loan">
        <OutputRow label={`HML principal (${deal.hmlLevPP.toFixed(1)}% LTC)`} value={fmtCurrency(brrrr.hmlPrincipal)} metricId="hml_principal" onLabelClick={click} />
        <OutputRow label={`Points (${deal.hmlPoints}%)`}      value={fmtCurrency(brrrr.hmlPointsDollar)} />
        <OutputRow label="Monthly interest"   value={fmtCurrency(brrrr.hmlMonthlyInterest)} metricId="hml_monthly_interest" onLabelClick={click} />
        <OutputRow label={`Interest carry (${brrrr.hmlCarryMonths} mo)`} value={fmtCurrency(brrrr.hmlCarryInterest)} metricId="hml_carry" onLabelClick={click} />
        <OutputRow label="Total HML cost (fees)"  value={fmtCurrency(brrrr.hmlTotalCost)} metricId="hml_total_cost" onLabelClick={click} accent />
        <OutputRow label="Total debt to HML"  value={fmtCurrency(brrrr.hmlTotalDebt)} />
      </OutputGroup>

      <OutputGroup title="Refinance">
        <OutputRow label={`New loan (${deal.refiLtv}% LTV)`}  value={fmtCurrency(brrrr.refiLoan)} metricId="refi_loan" onLabelClick={click} />
        <OutputRow label="Refi closing + points"               value={fmtCurrency(brrrr.refiTotalClosing)} metricId="refi_total" onLabelClick={click} />
        <OutputRow label="Cash returned at refi"               value={fmtCurrency(brrrr.cashReturnedAtRefi)} metricId="cash_returned" onLabelClick={click} accent />
        <OutputRow label="Money in deal"                       value={fmtCurrency(brrrr.moneyInDeal)}
          status={statusFor('moneyInDeal', brrrr.moneyInDeal, deal)} metricId="moneyInDeal" onLabelClick={click} accent />
      </OutputGroup>
    </div>
  )
}

// ---- Flip Cash view ----

function FlipCashView({ deal, flip, onLabelClick }: { deal: Deal; flip: FlipCashResult; onLabelClick?: (id: string) => void }) {
  const roiStatus = statusFor('roi', flip.roi, deal)
  return (
    <div className="scenario-view">
      <div className="scenario-summary">
        <div className="summary-pri">
          <div className="summary-eyebrow">Net profit</div>
          <div className={`summary-value ${flip.profit > 0 ? 'good' : 'bad'}`}>{fmtCurrency(flip.profit)}</div>
          <div className="summary-sub">After {flip.holdMonths} mo hold + selling costs</div>
        </div>
        <div className="summary-grid">
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
        </div>
      </div>

      <OutputGroup title="Cash deployed">
        <OutputRow label="Purchase + rehab + closing" value={fmtCurrency(deal.purchasePrice + flip.rehab + deal.closingCostsBuy)} />
        <OutputRow label={`Holding carry (${flip.holdMonths} mo, full opex)`} value={fmtCurrency(flip.holdingCarry)} />
        <OutputRow label="Total cash in" value={fmtCurrency(flip.totalCashIn)} accent />
      </OutputGroup>

      <OutputGroup title="Sale">
        <OutputRow label="ARV / sale price"                         value={fmtCurrency(deal.arv)} />
        <OutputRow label={`Selling costs (${deal.sellingCostsPct}%)`} value={'−' + fmtCurrency(flip.sellingCosts)} />
        <OutputRow label="Gross proceeds"                           value={fmtCurrency(flip.grossProceeds)} />
        <OutputRow label="Net profit"                               value={fmtCurrency(flip.profit)}
          status={flip.profit > 0 ? 'good' : 'bad'} accent />
      </OutputGroup>
    </div>
  )
}

// ---- Flip HML view ----

function FlipHMLView({ deal, flip, onLabelClick }: { deal: Deal; flip: FlipHMLResult; onLabelClick?: (id: string) => void }) {
  const roiStatus = statusFor('roi', flip.roi, deal)
  return (
    <div className="scenario-view">
      <div className="scenario-summary">
        <div className="summary-pri">
          <div className="summary-eyebrow">Net profit</div>
          <div className={`summary-value ${flip.profit > 0 ? 'good' : 'bad'}`}>{fmtCurrency(flip.profit)}</div>
          <div className="summary-sub">Leveraged with hard money</div>
        </div>
        <div className="summary-grid">
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
        </div>
      </div>

      <OutputGroup title="Cash deployed">
        <OutputRow label="Acquisition gap + closing + points"               value={fmtCurrency(flip.cashInAcq)} />
        <OutputRow label={`Holding (HML interest + full opex, ${flip.holdMonths} mo)`} value={fmtCurrency(flip.cashHolding)} />
        <OutputRow label="Total cash in"                                    value={fmtCurrency(flip.cashIn)} accent />
      </OutputGroup>

      <OutputGroup title="Sale">
        <OutputRow label="ARV / sale price"                               value={fmtCurrency(deal.arv)} />
        <OutputRow label={`Selling costs (${deal.sellingCostsPct}%)`}    value={'−' + fmtCurrency(flip.sellingCosts)} />
        <OutputRow label="HML payoff"                                     value={'−' + fmtCurrency(flip.hmlPrincipal)} />
        <OutputRow label="Net to investor"                                value={fmtCurrency(flip.netToInvestor)} />
        <OutputRow label="Net profit"                                     value={fmtCurrency(flip.profit)}
          status={flip.profit > 0 ? 'good' : 'bad'} accent />
      </OutputGroup>
    </div>
  )
}

// ---- MAO Detail ----

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
          <div className="mao-rule mao-rule-clickable" onClick={() => onLabelClick?.('mao_70')}>70% Rule</div>
          <div className="mao-rule-formula">ARV × 70% − rehab</div>
          <div className="mao-rule-value">{fmtCurrency(mao.mao70)}</div>
        </div>
        <div className="mao-detail-row">
          <div className="mao-rule mao-rule-clickable" onClick={() => onLabelClick?.('mao_brrrr')}>Money in deal ≤ ${(deal.maxMoneyInDeal / 1000).toFixed(0)}k</div>
          <div className="mao-rule-formula">money in deal = target</div>
          <div className="mao-rule-value">{fmtCurrency(mao.maoMoneyInDeal)}</div>
        </div>
        <div className="mao-detail-row">
          <div className="mao-rule mao-rule-clickable" onClick={() => onLabelClick?.('mao_equity')}>Equity post-Refi ≥ {deal.minEquityPct}%</div>
          <div className="mao-rule-formula">money in deal ≤ post-Refi equity ÷ (1 + {deal.minEquityPct}%)</div>
          <div className="mao-rule-value">{fmtCurrency(mao.maoEquity)}</div>
        </div>
        <div className="mao-detail-row mao-binding">
          <div className="mao-rule">Binding constraint</div>
          <div className="mao-rule-formula">{mao.constraint}</div>
          <div className="mao-rule-value">{fmtCurrency(mao.mao)}</div>
        </div>
        <div className={`mao-detail-row mao-current ${offerStatus}`}>
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

function ScoreBreakdown({ score, onLabelClick }: { score: DealScore; onLabelClick?: (id: string) => void }) {
  const scoreKeyToMetricId: Record<string, string> = {
    coc: 'score_coc', equity: 'score_equity', location: 'score_location',
  }
  return (
    <div className="score-breakdown">
      <div className="breakdown-header">
        <div className="breakdown-title">Deal Score Breakdown</div>
        <div className="breakdown-total">{score.score.toFixed(1)} <span>/ 10</span></div>
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
                >{c.label}</span>
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

// ---- Advanced Metrics ----

function AdvancedMetrics({ deal, brrrr, onLabelClick }: { deal: Deal; brrrr: BRRRRResult; onLabelClick?: (id: string) => void }) {
  const [equityMode, setEquityMode] = useState<'book' | 'liquidation'>('book')
  const click = onLabelClick

  const irrStatus2 = statusFor('irr', brrrr.irr2pct, deal)
  const irrStatus3 = statusFor('irr', brrrr.irr3pct, deal)
  const irrStatus4 = statusFor('irr', brrrr.irr4pct, deal)
  const capRateStatus = statusFor('capRate', brrrr.capRate, deal)

  const equityDollar = equityMode === 'book' ? brrrr.equityDollar : brrrr.equityLiquidationDollar
  const equityPct    = equityMode === 'book' ? brrrr.equityPct    : brrrr.equityLiquidationPct

  return (
    <div className="advanced-metrics">
      <div className="adv-header">
        <div className="adv-title">Advanced Metrics</div>
      </div>

      <div className="adv-grid">
        <div className={`adv-cell adv-${capRateStatus}`}>
          <div className="adv-label adv-label-clickable" onClick={() => click?.('cap_rate')}>Cap Rate</div>
          <div className="adv-value">{fmtPct(brrrr.capRate)}</div>
        </div>
        <div className="adv-cell adv-neutral">
          <div className="adv-label adv-label-clickable" onClick={() => click?.('grm')}>GRM</div>
          <div className="adv-value">{brrrr.grm.toFixed(1)}×</div>
        </div>
        <div className="adv-cell adv-neutral">
          <div className="adv-label adv-label-clickable" onClick={() => click?.('noi')}>Monthly NOI</div>
          <div className="adv-value">{fmtCurrency(brrrr.noi)}</div>
        </div>
        <div className="adv-cell adv-neutral">
          <div className="adv-label adv-label-clickable" onClick={() => click?.('annual_cashflow')}>Annual CF</div>
          <div className="adv-value">{fmtCurrency(brrrr.annualCashflow)}</div>
        </div>
        <div className="adv-cell adv-neutral">
          <div className="adv-label adv-label-clickable" onClick={() => click?.('roe')}>ROE</div>
          <div className="adv-value">{fmtPct(brrrr.roe)}</div>
        </div>
        <div className="adv-cell adv-neutral">
          <div className="adv-label adv-label-clickable" onClick={() => click?.('equity_margin_arv')}>Margin/ARV</div>
          <div className="adv-value">{fmtPct(brrrr.equityMarginArv)}</div>
        </div>
      </div>

      <div className="adv-irr">
        <div className="adv-irr-title adv-label-clickable" onClick={() => click?.('irr_scenarios')}>
          5-Year IRR
        </div>
        {brrrr.moneyInDeal <= 0 ? (
          <div className="adv-irr-note">Full BRRRR — infinite return (no money left in deal)</div>
        ) : (
          <div className="adv-irr-rows">
            <div className="adv-irr-row">
              <span className="adv-irr-label">2% appreciation</span>
              <span className={`adv-irr-value adv-${irrStatus2}`}>{fmtPct(brrrr.irr2pct)}</span>
            </div>
            <div className="adv-irr-row">
              <span className="adv-irr-label">3% appreciation</span>
              <span className={`adv-irr-value adv-${irrStatus3}`}>{fmtPct(brrrr.irr3pct)}</span>
            </div>
            <div className="adv-irr-row">
              <span className="adv-irr-label">4% appreciation</span>
              <span className={`adv-irr-value adv-${irrStatus4}`}>{fmtPct(brrrr.irr4pct)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="adv-equity">
        <div className="adv-equity-header">
          <div className="adv-label">Equity post-Refi</div>
          <div className="adv-equity-toggle">
            {(['book', 'liquidation'] as const).map((m) => (
              <button
                key={m}
                className={`adv-eq-btn${equityMode === m ? ' active' : ''}`}
                onClick={() => setEquityMode(m)}
              >{m === 'book' ? 'Book' : 'Liquidation'}</button>
            ))}
          </div>
        </div>
        <div className="adv-equity-values">
          <span
            className="adv-equity-dollar adv-label-clickable"
            onClick={() => click?.(equityMode === 'book' ? 'equity_book' : 'equity_liquidation')}
          >{fmtCurrency(equityDollar)}</span>
          <span className="adv-equity-pct">{fmtPct(equityPct)}</span>
        </div>
        {equityMode === 'liquidation' && (
          <div className="adv-equity-note">After {deal.sellingCostsPct}% selling costs</div>
        )}
      </div>
    </div>
  )
}

// ---- ScenarioPanel (exported) ----

type ScenarioKey = 'brrrr' | 'flipCash' | 'flipHml'

interface Props {
  deal: Deal
  brrrr: BRRRRResult
  flipCash: FlipCashResult
  flipHml: FlipHMLResult
  mao: MAOResult
  score: DealScore
  scenario: ScenarioKey
  setScenario: (s: ScenarioKey) => void
  onLabelClick?: (id: string) => void
}

export function ScenarioPanel({ deal, brrrr, flipCash, flipHml, mao, score, scenario, setScenario, onLabelClick }: Props) {
  const tabs: { key: ScenarioKey; label: string; sub: string }[] = [
    { key: 'brrrr',    label: 'BRRRR',       sub: fmtCurrency(brrrr.cashflow) + '/mo' },
    { key: 'flipCash', label: 'Flip · Cash',  sub: fmtCurrency(flipCash.profit) + ' profit' },
    { key: 'flipHml',  label: 'Flip · HML',   sub: fmtCurrency(flipHml.profit) + ' profit' },
  ]

  return (
    <div className="scenario-panel">
      <div className="scenario-tabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`scenario-tab${scenario === t.key ? ' active' : ''}`}
            onClick={() => setScenario(t.key)}
          >
            <span className="tab-label">{t.label}</span>
            <span className="tab-sub">{t.sub}</span>
          </button>
        ))}
      </div>

      <div className="scenario-body">
        {scenario === 'brrrr'    && <BRRRRView    deal={deal} brrrr={brrrr} onLabelClick={onLabelClick} />}
        {scenario === 'flipCash' && <FlipCashView deal={deal} flip={flipCash} onLabelClick={onLabelClick} />}
        {scenario === 'flipHml'  && <FlipHMLView  deal={deal} flip={flipHml} onLabelClick={onLabelClick} />}
      </div>

      <MAODetail deal={deal} mao={mao} onLabelClick={onLabelClick} />
      <ScoreBreakdown score={score} onLabelClick={onLabelClick} />
      {scenario === 'brrrr' && <AdvancedMetrics deal={deal} brrrr={brrrr} onLabelClick={onLabelClick} />}
    </div>
  )
}

'use client'
import type { Deal, BRRRRResult, MAOResult, DealScore, Status } from '@/lib/deal-model'
import { fmtCurrency, fmtPct, fmtNum, statusFor } from '@/lib/deal-model'

function StatusDot({ status }: { status: Status }) {
  return <span className={`status-dot status-${status}`} aria-hidden="true" />
}

function VerdictPill({ verdict, status }: { verdict: string; status: Status }) {
  return <span className={`verdict-pill verdict-${status}`}>{verdict}</span>
}

interface MetricProps {
  label: string
  value: string
  status: Status
  sub?: string
  metricId?: string
  onLabelClick?: (id: string) => void
}
function Metric({ label, value, status, sub, metricId, onLabelClick }: MetricProps) {
  const canClick = metricId && onLabelClick
  return (
    <div className={`metric metric-${status}`}>
      <div
        className={`metric-label${canClick ? ' metric-label-clickable' : ''}`}
        onClick={canClick ? () => onLabelClick(metricId) : undefined}
        title={canClick ? `Formula: ${label}` : undefined}
      >
        <StatusDot status={status} />
        <span>{label}</span>
      </div>
      <div className="metric-value">{value}</div>
      {sub && <div className="metric-sub">{sub}</div>}
    </div>
  )
}

interface Props {
  deal: Deal
  brrrr: BRRRRResult
  mao: MAOResult
  score: DealScore
  onEdit: () => void
  onLabelClick?: (id: string) => void
}

export function DashboardBar({ deal, brrrr, mao, score, onEdit, onLabelClick }: Props) {
  const cfStatus   = statusFor('cashflow',    brrrr.cashflow,       deal)
  const cocStatus  = statusFor('coc',         brrrr.coc,            deal)
  const dscrStatus = statusFor('dscr',        brrrr.dscr,           deal)
  const eqStatus   = statusFor('equity',      brrrr.equityMarginArv, deal)
  const midStatus  = statusFor('moneyInDeal', brrrr.moneyInDeal,    deal)
  const scoreStatus = statusFor('score',      score.score,          deal)

  const maoDelta   = mao.deltaToOffer
  const maoStatus: Status = maoDelta >= 0 ? 'good' : maoDelta >= -10000 ? 'warn' : 'bad'
  const maoVerb    = maoDelta >= 0 ? 'under' : 'over'

  return (
    <header className="dashboard-bar">
      {/* Left: brand + address + edit button */}
      <div className="dashboard-left">
        <div className="dashboard-brand">
          <img src="/assets/cgm-logo.jpg" alt="CGM Ventures" className="brand-logo" />
          <div className="brand-meta">
            <div className="brand-name">CGM VENTURES</div>
            <div className="brand-sub">Deal Calculator · DFW</div>
          </div>
        </div>
        <div className="dashboard-address">
          <div className="addr-line1">{deal.address || 'Untitled property'}</div>
          <div className="addr-line2">
            <span>{deal.propertyType}</span>
            <span className="dot-sep">·</span>
            <span>{deal.sqft?.toLocaleString()} sqft</span>
            <span className="dot-sep">·</span>
            <span>built {deal.yearBuilt}</span>
            {deal.sellerAgent && <><span className="dot-sep">·</span><span>via {deal.sellerAgent}</span></>}
          </div>
        </div>
        <button className="edit-deal-btn" onClick={onEdit} title="Edit deal (E)">
          <span className="edb-icon" aria-hidden="true"><span /><span /><span /></span>
          <span>Edit deal</span>
          <kbd>E</kbd>
        </button>
      </div>

      {/* Center: 6 metric chips */}
      <div className="dashboard-metrics">
        <Metric label="Cashflow"      value={fmtCurrency(brrrr.cashflow) + '/mo'} status={cfStatus}
          sub={`w/o CapEx: ${fmtCurrency(brrrr.cashflowNoCapex)}/mo`} metricId="cashflow" onLabelClick={onLabelClick} />
        <Metric label="CoC"           value={fmtPct(brrrr.coc)}                   status={cocStatus}
          sub={`w/o CapEx: ${fmtPct(brrrr.cocNoCapex)}`} metricId="coc" onLabelClick={onLabelClick} />
        <Metric label="DSCR"          value={fmtNum(brrrr.dscr)}                  status={dscrStatus}
          sub={`lender ratio: ${fmtNum(brrrr.lenderDscr, 2)}`} metricId="dscr" onLabelClick={onLabelClick} />
        <Metric label="Equity"        value={fmtPct(brrrr.equityMarginArv)}       status={eqStatus}
          sub={fmtCurrency(brrrr.equityForcedDollar)} metricId="equity" onLabelClick={onLabelClick} />
        <Metric label="Money in Deal" value={fmtCurrency(brrrr.moneyInDeal)}      status={midStatus}
          sub={brrrr.moneyInDeal <= 0 ? 'infinite return' : `target ≤ $${(deal.maxMoneyInDeal / 1000).toFixed(0)}k`}
          metricId="moneyInDeal" onLabelClick={onLabelClick} />
        <Metric label="MAO"           value={fmtCurrency(mao.mao)}                status={maoStatus}
          sub={`${fmtCurrency(Math.abs(maoDelta))} ${maoVerb} · ${mao.constraint}`} metricId="mao" onLabelClick={onLabelClick} />
      </div>

      {/* Right: deal score hero */}
      <div className={`deal-score-hero deal-score-${scoreStatus}`}>
        <div className="hero-top">
          <div className="hero-label">
            <StatusDot status={scoreStatus} />
            <span>Deal Score</span>
          </div>
          <VerdictPill verdict={score.verdict} status={scoreStatus} />
        </div>
        <div className="hero-value">
          <span className="num">{score.score.toFixed(1)}</span>
          <span className="den">/10</span>
        </div>
        <div className="hero-weak">
          <span className="weak-hint">Weakest:</span>
          {score.weakest.map((w) => (
            <span key={w.key} className="weak-chip">
              {w.label} <span className="weak-chip-val">{w.value}</span>
            </span>
          ))}
        </div>
      </div>
    </header>
  )
}

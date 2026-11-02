'use client'
import Link from 'next/link'
import type { Deal, BRRRRResult, MAOResult, DealScore, Status } from '@/lib/deal-model'
import { fmtCurrency, fmtPct, fmtNum, statusFor } from '@/lib/deal-model'
import type { BuyHoldResult } from '@/lib/buy-hold'

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
  score: DealScore           // the score of the lens shown — B&H's when `bnh` is set
  bnh?: BuyHoldResult        // set while the B&H tab is open: headline KPIs switch to B&H
  onLabelClick?: (id: string) => void
}

export function DashboardBar({ deal, brrrr, mao, score, bnh, onLabelClick }: Props) {
  // The headline lens: B&H on the B&H tab, BRRRR everywhere else. MAO is always BRRRR's.
  const k = bnh
    ? { ...bnh, cashLabel: 'Cash In', cash: bnh.cashIn,
        ids: { cashflow: 'bnh_cashflow', coc: 'bnh_coc', dscr: 'bnh_dscr', equity: 'bnh_equity', cash: 'bnh_cash_in' } }
    : { ...brrrr, cashLabel: 'Money in Deal', cash: brrrr.moneyInDeal,
        ids: { cashflow: 'cashflow', coc: 'coc', dscr: 'dscr', equity: 'equity_book', cash: 'moneyInDeal' } }

  const cfStatus   = statusFor('cashflow',    k.cashflow,       deal)
  const cocStatus  = statusFor('coc',         k.coc,            deal)
  const dscrStatus = statusFor('dscr',        k.dscr,           deal)
  const eqStatus   = statusFor('equity',      k.equityPct,      deal)
  const midStatus  = statusFor('moneyInDeal', k.cash,           deal)
  const scoreStatus = statusFor('score',      score.score,      deal)

  const maoDelta   = mao.deltaToOffer
  const maoStatus: Status = maoDelta >= 0 ? 'good' : maoDelta >= -10000 ? 'warn' : 'bad'
  const maoVerb    = maoDelta >= 0 ? 'under' : 'over'

  return (
    <header className="dashboard-bar">
      {/* Left: brand + address + edit button */}
      <div className="dashboard-left">
        <div className="dashboard-brand">
          <Link href="/" className="back-to-dashboard" title="Back to all deals" aria-label="Back to all deals">
            <span aria-hidden="true">←</span>
          </Link>
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
      </div>

      {/* Center: 6 metric chips */}
      <div className="dashboard-metrics">
        <Metric label="Cashflow"      value={fmtCurrency(k.cashflow) + '/mo'}     status={cfStatus}
          sub={`w/o CapEx: ${fmtCurrency(k.cashflowNoCapex)}/mo`} metricId={k.ids.cashflow} onLabelClick={onLabelClick} />
        <Metric label="CoC"           value={fmtPct(k.coc)}                       status={cocStatus}
          sub={`w/o CapEx: ${fmtPct(k.cocNoCapex)}`} metricId={k.ids.coc} onLabelClick={onLabelClick} />
        <Metric label="DSCR"          value={fmtNum(k.dscr)}                      status={dscrStatus}
          sub={`lender ratio: ${fmtNum(k.lenderDscr, 2)}`} metricId={k.ids.dscr} onLabelClick={onLabelClick} />
        <Metric label="Equity"        value={fmtPct(k.equityPct)}                 status={eqStatus}
          sub={fmtCurrency(k.equityDollar)} metricId={k.ids.equity} onLabelClick={onLabelClick} />
        <Metric label={k.cashLabel}   value={fmtCurrency(k.cash)}                 status={midStatus}
          sub={k.cash <= 0 ? 'infinite return' : `target ≤ $${(deal.maxMoneyInDeal / 1000).toFixed(0)}k`}
          metricId={k.ids.cash} onLabelClick={onLabelClick} />
        <Metric label="MAO"           value={fmtCurrency(mao.mao)}                status={maoStatus}
          sub={`${fmtCurrency(Math.abs(maoDelta))} ${maoVerb} · ${mao.constraint}`} metricId="mao" onLabelClick={onLabelClick} />
      </div>

      {/* Right: deal score hero */}
      <div className={`deal-score-hero deal-score-${scoreStatus}`}>
        <div className="hero-top">
          <div className="hero-label">
            <StatusDot status={scoreStatus} />
            <span>{bnh ? 'B&H Deal Score' : 'Deal Score'}</span>
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

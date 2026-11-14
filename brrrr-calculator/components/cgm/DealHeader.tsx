'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type {
  Deal, BRRRRResult, FlipCashResult, FlipHMLResult, MAOResult, DealScore, Status,
} from '@/lib/deal-model'
import { fmtCurrency, fmtPct, fmtNum, statusFor } from '@/lib/deal-model'
import type { BuyHoldResult } from '@/lib/buy-hold'
import type { ScenarioTab } from '@/lib/strategy'
import { InfoIcon } from './SectionCard'

// Top of the deal page: header, Scenario tabs, headline tiles + Deal Score
// tile, and the slim bar that pins to the top once the tiles scroll away.
// Display only — every number comes from the results DealCalculator passes in.

function StatusDot({ status }: { status: Status }) {
  return <span className={`status-dot status-${status}`} aria-hidden="true" />
}

function VerdictPill({ verdict, status }: { verdict: string; status: Status }) {
  return <span className={`verdict-pill verdict-${status}`}>{verdict}</span>
}

interface TileProps {
  label: string
  value: string
  status: Status
  sub?: string
  metricId?: string
  onLabelClick?: (id: string) => void
}
function Tile({ label, value, status, sub, metricId, onLabelClick }: TileProps) {
  const canClick = metricId && onLabelClick
  return (
    <div className={`kpi-tile kpi-${status}`}>
      <div
        className={`kpi-label${canClick ? ' metric-label-clickable' : ''}`}
        onClick={canClick ? () => onLabelClick(metricId) : undefined}
        title={canClick ? `Formula: ${label}` : undefined}
      >
        <StatusDot status={status} />
        {canClick && <InfoIcon />}
        <span>{label}</span>
      </div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}

function EditButton({ onEdit }: { onEdit: () => void }) {
  return (
    <button className="edit-deal-btn" onClick={onEdit} title="Edit deal (E)">
      <span className="edb-icon" aria-hidden="true"><span /><span /><span /></span>
      <span>Edit deal</span>
      <kbd>E</kbd>
    </button>
  )
}

interface Props {
  deal: Deal
  brrrr: BRRRRResult
  buyHold: BuyHoldResult
  flipCash: FlipCashResult
  flipHml: FlipHMLResult
  mao: MAOResult
  score: DealScore           // the score of the lens shown — B&H's on the B&H tab
  scenario: ScenarioTab
  setScenario: (s: ScenarioTab) => void
  onEdit: () => void
  onLabelClick?: (id: string) => void
}

export function DealHeader({
  deal, brrrr, buyHold, flipCash, flipHml, mao, score, scenario, setScenario, onEdit, onLabelClick,
}: Props) {
  // The headline lens: B&H on the B&H tab, BRRRR everywhere else. MAO is always BRRRR's.
  const onBuyHold = scenario === 'buyHold'
  const k = onBuyHold
    ? { ...buyHold, cashLabel: 'Cash In', cash: buyHold.cashIn,
        ids: { cashflow: 'bnh_cashflow', coc: 'bnh_coc', dscr: 'bnh_dscr', equity: 'bnh_equity', cash: 'bnh_cash_in' } }
    : { ...brrrr, cashLabel: 'Money in Deal', cash: brrrr.moneyInDeal,
        ids: { cashflow: 'cashflow', coc: 'coc', dscr: 'dscr', equity: 'equity_book', cash: 'moneyInDeal' } }

  const cfStatus    = statusFor('cashflow',    k.cashflow,  deal)
  const cocStatus   = statusFor('coc',         k.coc,       deal)
  const dscrStatus  = statusFor('dscr',        k.dscr,      deal)
  const eqStatus    = statusFor('equity',      k.equityPct, deal)
  const midStatus   = statusFor('moneyInDeal', k.cash,      deal)
  const scoreStatus = statusFor('score',       score.score, deal)

  const maoDelta  = mao.deltaToOffer
  const maoStatus: Status = maoDelta >= 0 ? 'good' : maoDelta >= -10000 ? 'warn' : 'bad'
  const maoVerb   = maoDelta >= 0 ? 'under' : 'over'

  const address = deal.address || 'Untitled property'
  const scoreLabel = onBuyHold ? 'B&H Deal Score' : 'Deal Score'

  const tabs: { key: ScenarioTab; label: string; sub: string }[] = [
    { key: 'brrrr',    label: 'BRRRR',       sub: fmtCurrency(brrrr.cashflow) + '/mo' },
    { key: 'buyHold',  label: 'Buy & Hold',  sub: fmtCurrency(buyHold.cashflow) + '/mo' },
    { key: 'flipCash', label: 'Flip · Cash', sub: fmtCurrency(flipCash.profit) + ' profit' },
    { key: 'flipHml',  label: 'Flip · HML',  sub: fmtCurrency(flipHml.profit) + ' profit' },
  ]

  // The slim bar shows once the tiles have scrolled above the viewport.
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [pinned, setPinned] = useState(false)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setPinned(!e.isIntersecting && e.boundingClientRect.top < 0))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <>
      <header className="deal-header">
        <div className="dh-brand-row">
          <div className="dh-brand">
            <Link href="/" className="back-to-dashboard" title="Back to all deals" aria-label="Back to all deals">
              <span aria-hidden="true">←</span>
            </Link>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/cgm-logo.jpg" alt="CGM Ventures" className="brand-logo" />
            <div className="brand-meta">
              <div className="brand-name">CGM VENTURES</div>
              <div className="brand-sub">Deal Calculator · DFW</div>
            </div>
          </div>
          <EditButton onEdit={onEdit} />
        </div>

        <nav className="dh-breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Deals</Link>
          <span className="dh-crumb-sep" aria-hidden="true">/</span>
          <span className="dh-crumb-addr">{address}</span>
          <span className="dh-crumb-sep" aria-hidden="true">/</span>
          <span aria-current="page">Analysis</span>
        </nav>
        <h1 className="dh-address">{address}</h1>
        <div className="dh-facts">
          <span>{deal.propertyType}</span>
          <span className="dot-sep">·</span>
          <span>{deal.sqft?.toLocaleString()} sqft</span>
          <span className="dot-sep">·</span>
          <span>built {deal.yearBuilt}</span>
          {deal.sellerAgent && <><span className="dot-sep">·</span><span>via {deal.sellerAgent}</span></>}
        </div>
      </header>

      <nav className="strategy-tabs" aria-label="Scenario">
        {tabs.map((t) => (
          <button
            key={t.key}
            className={`scenario-tab${scenario === t.key ? ' active' : ''}`}
            aria-pressed={scenario === t.key}
            onClick={() => setScenario(t.key)}
          >
            <span className="tab-label">{t.label}</span>
            <span className="tab-sub">{t.sub}</span>
          </button>
        ))}
      </nav>

      <section className="kpi-band" aria-label="Headline numbers">
        <div className={`score-tile score-tile-${scoreStatus}`}>
          <div className="score-tile-top">
            <div className="score-tile-label">
              <StatusDot status={scoreStatus} />
              <span>{scoreLabel}</span>
            </div>
            <VerdictPill verdict={score.verdict} status={scoreStatus} />
          </div>
          <div className="score-tile-value">
            <span className="num">{score.score.toFixed(1)}</span>
            <span className="den">/10</span>
          </div>
          <div className="score-tile-weak">
            <span className="weak-hint">Weakest:</span>
            {score.weakest.map((w) => (
              <span key={w.key} className="weak-chip">
                {w.label} <span className="weak-chip-val">{w.value}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="kpi-tiles">
          <Tile label="Cashflow"    value={fmtCurrency(k.cashflow) + '/mo'} status={cfStatus}
            sub={`w/o CapEx: ${fmtCurrency(k.cashflowNoCapex)}/mo`} metricId={k.ids.cashflow} onLabelClick={onLabelClick} />
          <Tile label="CoC"         value={fmtPct(k.coc)}                   status={cocStatus}
            sub={`w/o CapEx: ${fmtPct(k.cocNoCapex)}`} metricId={k.ids.coc} onLabelClick={onLabelClick} />
          <Tile label="DSCR"        value={fmtNum(k.dscr)}                  status={dscrStatus}
            sub={`lender ratio: ${fmtNum(k.lenderDscr, 2)}`} metricId={k.ids.dscr} onLabelClick={onLabelClick} />
          <Tile label="Equity"      value={fmtPct(k.equityPct)}             status={eqStatus}
            sub={fmtCurrency(k.equityDollar)} metricId={k.ids.equity} onLabelClick={onLabelClick} />
          <Tile label={k.cashLabel} value={fmtCurrency(k.cash)}             status={midStatus}
            sub={k.cash <= 0 ? 'infinite return' : `target ≤ $${(deal.maxMoneyInDeal / 1000).toFixed(0)}k`}
            metricId={k.ids.cash} onLabelClick={onLabelClick} />
          <Tile label="MAO"         value={fmtCurrency(mao.mao)}            status={maoStatus}
            sub={`${fmtCurrency(Math.abs(maoDelta))} ${maoVerb} · ${mao.constraint}`} metricId="mao" onLabelClick={onLabelClick} />
        </div>
      </section>
      <div ref={sentinelRef} className="kpi-sentinel" aria-hidden="true" />

      <div className={`pinned-bar${pinned ? ' show' : ''}`} aria-hidden={!pinned}>
        <div className="pinned-inner">
          <div className="pinned-address">{address}</div>
          <div className="pinned-stats">
            <span className={`pinned-stat kpi-${cfStatus}`}>
              <span className="pinned-label">Cashflow</span>
              <span className="pinned-value">{fmtCurrency(k.cashflow) + '/mo'}</span>
            </span>
            <span className={`pinned-stat kpi-${cocStatus}`}>
              <span className="pinned-label">CoC</span>
              <span className="pinned-value">{fmtPct(k.coc)}</span>
            </span>
            <span className={`pinned-stat kpi-${midStatus}`}>
              <span className="pinned-label">{k.cashLabel}</span>
              <span className="pinned-value">{fmtCurrency(k.cash)}</span>
            </span>
            <span className={`pinned-stat kpi-${scoreStatus}`}>
              <span className="pinned-label">{scoreLabel}</span>
              <span className="pinned-value">{score.score.toFixed(1)}<span className="den">/10</span></span>
            </span>
          </div>
          <EditButton onEdit={onEdit} />
        </div>
      </div>
    </>
  )
}

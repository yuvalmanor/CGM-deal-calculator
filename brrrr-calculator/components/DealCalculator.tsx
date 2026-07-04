'use client'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  DEFAULT_DEAL, calcBRRRR, calcFlipCash, calcFlipHML, calcMAO, calcDealScore,
  type Deal,
} from '@/lib/deal-model'
import { ModalContext } from '@/lib/modalContext'
import { DashboardBar } from './cgm/DashboardBar'
import { ScenarioPanel } from './cgm/ScenarioPanel'
import { SectionNav, InputForm, SECTIONS } from './cgm/InputForm'
import FormulaModal from './ui/FormulaModal'

// The 'v2' in this key is a persisted artifact — changing it would silently
// discard users' in-progress drafts saved under the old key.
const STORAGE_KEY = 'cgm-deal-calc-v2'

function loadDeal(): Deal {
  if (typeof window === 'undefined') return DEFAULT_DEAL
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_DEAL
    return { ...DEFAULT_DEAL, ...JSON.parse(raw) }
  } catch { return DEFAULT_DEAL }
}

type ScenarioKey = 'brrrr' | 'flipCash' | 'flipHml'
type AccentKey = 'slate' | 'ember' | 'moss' | 'amber'
type DensityKey = 'comfortable' | 'compact'
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface Tweaks { accent: AccentKey; density: DensityKey }
const TWEAK_DEFAULTS: Tweaks = { accent: 'slate', density: 'comfortable' }

interface Props {
  initialDeal?: Deal
  initialDealId?: string
}

export default function DealCalculator({ initialDeal, initialDealId }: Props) {
  const [deal, setDeal] = useState<Deal>(() => initialDeal ?? loadDeal())
  const [scenario, setScenario] = useState<ScenarioKey>('brrrr')
  const [activeSection, setActiveSection] = useState('property')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tweaks, setTweaks] = useState<Tweaks>(TWEAK_DEFAULTS)
  const [tweaksOpen, setTweaksOpen] = useState(false)
  const [modalMetricId, setModalMetricId] = useState<string | null>(null)
  const [dealId, setDealId] = useState<string | null>(initialDealId ?? null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const inputsRef = useRef<HTMLDivElement>(null)

  // Persist to localStorage (skip if loaded from server)
  useEffect(() => {
    if (initialDeal) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(deal)) } catch {}
  }, [deal, initialDeal])

  // Apply tweaks to document root
  useEffect(() => {
    const r = document.documentElement
    r.dataset.accent  = tweaks.accent
    r.dataset.density = tweaks.density
  }, [tweaks])

  // Keyboard: E opens drawer, Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches('input, textarea, select')) return
      if (e.key === 'e' || e.key === 'E') { e.preventDefault(); setDrawerOpen((v) => !v) }
      if (e.key === 'Escape') { setDrawerOpen(false); setModalMetricId(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Track active section based on scroll inside drawer
  useEffect(() => {
    if (!drawerOpen) return
    const root = inputsRef.current
    if (!root) return
    const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-section-id]'))
    const onScroll = () => {
      const top = root.getBoundingClientRect().top + 120
      let active = sections[0]?.dataset.sectionId ?? 'property'
      for (const s of sections) {
        if (s.getBoundingClientRect().top <= top) active = s.dataset.sectionId!
      }
      setActiveSection(active)
    }
    root.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => root.removeEventListener('scroll', onScroll)
  }, [drawerOpen])

  const jumpTo = (id: string) => {
    const root = inputsRef.current
    const el = root?.querySelector<HTMLElement>(`[data-section-id="${id}"]`)
    if (!el || !root) return
    root.scrollBy({ top: el.getBoundingClientRect().top - root.getBoundingClientRect().top - 24, behavior: 'smooth' })
  }

  const update = useCallback((patch: Partial<Deal>) => setDeal((d) => ({ ...d, ...patch })), [])
  const reset  = useCallback(() => { setDeal(DEFAULT_DEAL); setDealId(null); setSaveStatus('idle') }, [])

  const brrrr   = useMemo(() => calcBRRRR(deal),   [deal])
  const flipCash = useMemo(() => calcFlipCash(deal), [deal])
  const flipHml  = useMemo(() => calcFlipHML(deal),  [deal])
  const mao      = useMemo(() => calcMAO(deal),      [deal])
  const score    = useMemo(() => calcDealScore(deal, brrrr, mao), [deal, brrrr, mao])

  const openModal = useCallback((id: string) => setModalMetricId(id), [])
  const closeModal = useCallback(() => setModalMetricId(null), [])

  const setTweak = (patch: Partial<Tweaks>) => setTweaks((t) => ({ ...t, ...patch }))

  async function handleSave() {
    setSaveStatus('saving')
    try {
      const payload = {
        address: deal.address,
        score: score.score,
        arv: deal.arv,
        moneyInDeal: brrrr.moneyInDeal,
        monthlyNOI: brrrr.noi,
        inputsJson: JSON.stringify(deal),
        settingsJson: '"v2"', // reserved — persisted shape marker for saved rows (see CLAUDE.md schema table)
      }
      const url = dealId ? `/api/deals/${dealId}` : '/api/deals'
      const method = dealId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Save failed')
      if (!dealId) {
        const { id } = await res.json()
        setDealId(id)
      }
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 4000)
    }
  }

  const ACCENT_OPTS: { key: AccentKey; label: string; color: string }[] = [
    { key: 'slate', label: 'Slate', color: '#3b577a' },
    { key: 'ember', label: 'Ember', color: '#b85a3e' },
    { key: 'moss',  label: 'Moss',  color: '#5a8a5a' },
    { key: 'amber', label: 'Amber', color: '#b4882a' },
  ]

  const saveLabel = saveStatus === 'saving' ? 'Saving…'
    : saveStatus === 'saved' ? 'Saved!'
    : saveStatus === 'error' ? 'Error'
    : dealId ? 'Update' : 'Save'

  return (
    <ModalContext.Provider value={openModal}>
      <div className="app-root">
        {/* Top dashboard bar */}
        <DashboardBar
          deal={deal}
          brrrr={brrrr}
          mao={mao}
          score={score}
          onLabelClick={openModal}
        />

        {/* Main output stage */}
        <main className="output-stage">
          <ScenarioPanel
            deal={deal}
            brrrr={brrrr}
            flipCash={flipCash}
            flipHml={flipHml}
            mao={mao}
            score={score}
            scenario={scenario}
            setScenario={setScenario}
            onEdit={() => setDrawerOpen(true)}
            onLabelClick={openModal}
          />
        </main>

        {/* Drawer scrim */}
        <div
          className={`drawer-scrim${drawerOpen ? ' open' : ''}`}
          onClick={() => setDrawerOpen(false)}
          aria-hidden={!drawerOpen}
        />

        {/* Inputs drawer */}
        <aside className={`drawer${drawerOpen ? ' open' : ''}`} aria-hidden={!drawerOpen}>
          <header className="drawer-header">
            <div>
              <div className="drawer-eyebrow">Edit Deal</div>
              <div className="drawer-title">{deal.address || 'Untitled property'}</div>
            </div>
            <div className="drawer-header-actions">
              <button
                className={`drawer-save${saveStatus === 'saved' ? ' saved' : saveStatus === 'error' ? ' error' : ''}`}
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                title={dealId ? 'Update saved deal' : 'Save deal to cloud'}
              >{saveLabel}</button>
              <button className="drawer-reset" onClick={reset} title="Reset to sample">Reset</button>
              <button className="drawer-close" onClick={() => setDrawerOpen(false)} aria-label="Close" title="Close (Esc)">×</button>
            </div>
          </header>
          <div className="drawer-body">
            <aside className="drawer-nav">
              <SectionNav activeId={activeSection} onJump={jumpTo} />
            </aside>
            <div className="drawer-inputs" ref={inputsRef}>
              <InputForm deal={deal} update={update} />
              <div className="inputs-spacer" />
            </div>
          </div>
        </aside>

{/* Tweaks panel */}
        {tweaksOpen && (
          <div className="tweaks-panel">
            <div className="tweaks-header">
              <span>Tweaks</span>
              <button className="tweaks-close" onClick={() => setTweaksOpen(false)}>×</button>
            </div>
            <div className="tweaks-body">
              <div>
                <div className="tweaks-label">Accent</div>
                <div className="tweaks-swatches">
                  {ACCENT_OPTS.map((a) => (
                    <button
                      key={a.key}
                      className={`swatch${tweaks.accent === a.key ? ' active' : ''}`}
                      style={{ '--s': a.color } as React.CSSProperties}
                      onClick={() => setTweak({ accent: a.key })}
                    >
                      <span className="swatch-chip" />
                      <span>{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="tweaks-label">Density</div>
                <div className="tweaks-radio">
                  {(['comfortable', 'compact'] as DensityKey[]).map((d) => (
                    <button
                      key={d}
                      className={`radio-opt${tweaks.density === d ? ' active' : ''}`}
                      onClick={() => setTweak({ density: d })}
                    >{d}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Formula modal */}
        <FormulaModal
          isOpen={modalMetricId !== null}
          onClose={closeModal}
          metricId={modalMetricId}
          deal={deal}
          brrrr={brrrr}
          mao={mao}
          score={score}
        />
      </div>
    </ModalContext.Provider>
  )
}

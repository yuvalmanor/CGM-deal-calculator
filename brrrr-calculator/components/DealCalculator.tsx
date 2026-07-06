'use client'
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  DEFAULT_DEAL, calcBRRRR, calcFlipCash, calcFlipHML, calcMAO, calcDealScore,
  type Deal,
} from '@/lib/deal-model'
import { ModalContext } from '@/lib/modalContext'
import {
  initialTermSheetState, isTermSheetState, syncSelected, serializeSettings,
  addTermSheet, selectTermSheet, deleteTermSheet,
  type TermSheetState, type LenderRole,
} from '@/lib/term-sheets'
import { compareTermSheets } from '@/lib/compare-term-sheets'
import { DashboardBar } from './cgm/DashboardBar'
import { ScenarioPanel } from './cgm/ScenarioPanel'
import { SectionNav, InputForm, SECTIONS } from './cgm/InputForm'
import { TermSheetSection } from './cgm/TermSheetSection'
import FormulaModal from './ui/FormulaModal'

// The 'v2' in this key is a persisted artifact — changing it would silently
// discard users' in-progress drafts saved under the old key.
const STORAGE_KEY = 'cgm-deal-calc-v2'

interface Draft { deal: Deal; termSheets: TermSheetState }

// Draft value shape: `{ deal, termSheets }`. Older drafts stored the Deal
// directly — they load as the zero-migration case (one sheet per role).
function loadDraft(): Draft {
  const fallback = () => ({ deal: DEFAULT_DEAL, termSheets: initialTermSheetState(DEFAULT_DEAL) })
  if (typeof window === 'undefined') return fallback()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback()
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && 'deal' in parsed && 'termSheets' in parsed) {
      const deal = { ...DEFAULT_DEAL, ...parsed.deal }
      return {
        deal,
        termSheets: isTermSheetState(parsed.termSheets) ? parsed.termSheets : initialTermSheetState(deal),
      }
    }
    const deal = { ...DEFAULT_DEAL, ...parsed }
    return { deal, termSheets: initialTermSheetState(deal) }
  } catch { return fallback() }
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
  initialTermSheets?: TermSheetState
}

export default function DealCalculator({ initialDeal, initialDealId, initialTermSheets }: Props) {
  const [deal, setDeal] = useState<Deal>(() => initialDeal ?? DEFAULT_DEAL)
  const [termSheets, setTermSheets] = useState<TermSheetState>(() =>
    initialDeal ? (initialTermSheets ?? initialTermSheetState(initialDeal)) : initialTermSheetState(DEFAULT_DEAL))
  // Draft restore happens after mount (localStorage doesn't exist during SSR;
  // reading it in the initial render makes server and client HTML disagree).
  // Until then the persist effect must not run, or it would clobber the draft.
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [scenario, setScenario] = useState<ScenarioKey>('brrrr')
  const [activeSection, setActiveSection] = useState('property')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [tweaks, setTweaks] = useState<Tweaks>(TWEAK_DEFAULTS)
  const [tweaksOpen, setTweaksOpen] = useState(false)
  const [modalMetricId, setModalMetricId] = useState<string | null>(null)
  const [dealId, setDealId] = useState<string | null>(initialDealId ?? null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  const inputsRef = useRef<HTMLDivElement>(null)

  // Restore the draft once, after hydration (skip if loaded from server)
  useEffect(() => {
    if (!initialDeal) {
      const draft = loadDraft()
      setDeal(draft.deal)
      setTermSheets(draft.termSheets)
    }
    setDraftLoaded(true)
  }, [initialDeal])

  // Persist to localStorage (skip if loaded from server)
  useEffect(() => {
    if (initialDeal || !draftLoaded) return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ deal, termSheets })) } catch {}
  }, [deal, termSheets, initialDeal, draftLoaded])

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
  const reset  = useCallback(() => {
    setDeal(DEFAULT_DEAL)
    setTermSheets(initialTermSheetState(DEFAULT_DEAL))
    setDealId(null)
    setSaveStatus('idle')
  }, [])

  // Term Sheet management — the selected sheet mirrors the flat fields, so
  // swaps go through the core module which never loses terms (ADR-0003).
  function handleAddSheet(role: LenderRole) {
    setTermSheets(addTermSheet(termSheets, deal, role))
  }
  function handleSelectSheet(role: LenderRole, id: string) {
    const r = selectTermSheet(termSheets, deal, role, id)
    setTermSheets(r.state)
    setDeal(r.deal)
  }
  function handleDeleteSheet(role: LenderRole, id: string) {
    const r = deleteTermSheet(termSheets, deal, role, id)
    setTermSheets(r.state)
    setDeal(r.deal)
  }

  // HML compares under BRRRR or Flip HML; the Flip Cash tab (no HML in that
  // exit) keeps showing the BRRRR comparison rather than an empty section.
  const hmlCompareScenario = scenario === 'flipHml' ? 'flipHml' : 'brrrr'
  const hmlCompareRows = useMemo(
    () => compareTermSheets(deal, termSheets, 'hml', hmlCompareScenario),
    [deal, termSheets, hmlCompareScenario],
  )

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
      // The selected sheets' stored terms may lag the live flat fields —
      // sync before serializing so the blob matches what's being saved.
      const synced = syncSelected(termSheets, deal)
      setTermSheets(synced)
      const payload = {
        address: deal.address,
        score: score.score,
        arv: deal.arv,
        moneyInDeal: brrrr.moneyInDeal,
        monthlyNOI: brrrr.noi,
        inputsJson: JSON.stringify(deal),
        settingsJson: serializeSettings(synced),
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
            termSheetSections={
              <TermSheetSection
                title="HML Term Sheets"
                rows={hmlCompareRows}
                onAdd={() => handleAddSheet('hml')}
                onSelect={(id) => handleSelectSheet('hml', id)}
                onDelete={(id) => handleDeleteSheet('hml', id)}
              />
            }
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

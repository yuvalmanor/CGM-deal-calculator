# Deal Page Redesign — Number Baseline

Captured 2026-11-13 by script from the **pre-redesign** deal page (branch `deal-page-redesign`
at 5a4993c, UI identical to `main` 5599d55), local dev against the live Sheet. Neither deal was
saved; the B&H property value toggle was flipped unsaved and restored.

| Deal | Strategy | id | savedAt at capture |
|---|---|---|---|
| 1805 Cedar Wood, Anna TX | BRRRR | `f1a508c3-5509-471a-9890-40be1a611d95` | 2026-09-26T14:25:23.109Z |
| 211 Fisherman Trl, Melissa TX | Buy & Hold | `e2646a7e-7a0c-4de0-ac27-e7e7a5bc5a76` | 2026-11-13T09:31:33.962Z |

## How to compare

- **Pass** = every `Label → Value` pair below is present with the same value on the new page,
  on the same tab and toggle state, with the same **Status** color and the same **Formula**
  behavior. Extra pairs (second DSCR, yearly values, donut %, ✓/✗) are fine.
- **Status** is the good / warn / bad / neutral class on the element (`win` = cheapest payoff
  cell, `selected` = selected Term Sheet row); blank = no status color.
- **Formula** `click` = the label opens a formula modal; for the top tiles it names the modal
  title opened (`modal: …`); blank = no formula. This is also phase 2's ⓘ list.
- **Section** is where the pair lived on the old page; the redesign moves pairs between sections
  on purpose, so match on label + value + tab/state, not on section.
- Labels/values were read with `innerText`, so CSS `text-transform: uppercase` shows in some labels
  (e.g. `CASH-ON-CASH`). Compare labels **case-insensitively**.
- A collapsible's header row is recorded with value `(collapsible)`; `▾` means it was open.
- Term Sheet rows are keyed `#<row> <lender> › <column>`; payoff cells `Payoff <horizon> › column <n>`.
- "Toggles flipped" tables list only the pairs that change when every view toggle on that tab is
  flipped (CoC cell, Equity cell, Annual CF value, Book → Liquidation).
- If a deal's `savedAt` differs from the table above, the deal was edited: re-capture its
  baseline from `main` before comparing.
- **Phase 1 re-check (2026-11-13): all 1,163 pairs matched.** For the phase-1 page the snippet's
  top-of-page selectors were swapped: `.addr-line1` → `.dh-address`, `.addr-line2` → `.dh-facts`,
  `.dashboard-bar .metric` → `.kpi-tile` (`.metric-label/-value/-sub` → `.kpi-label/-value/-sub`),
  `.deal-score-hero` → `.score-tile` (`.hero-label/-value/-weak` → `.score-tile-label/-value/-weak`).
  Later phases swap the section selectors the same way.
- **Phase 2 re-check (2026-11-13): all 1,163 pairs matched**, with the same phase-1 top-of-page
  swaps and no other selector change: the BRRRR section cards keep the inner classes
  (`.out-group`, `.summary-cell`, `.am-panel`/`.am-cell`, `.ts-section`, `.mao-detail`,
  `.score-breakdown`). Only extra pair: the second DSCR (Financial Ratios). Compare labels
  case-insensitively and ignore Section (the BRRRR Advanced Metrics cells now record an empty
  Section — the caption sits on the card header).
- **Phase 3 re-check (2026-11-14): all 1,163 pairs matched** (Anna 721, Melissa 442) with the
  same swaps and no other selector change — the B&H and Flip cards keep the inner classes too.
  Only extra pair: BRRRR's second DSCR. Note when building the check script on Windows: write
  `public/__baseline.md` with LF line endings, or the parser finds no headings (`checked: 0`).
- **Phase 4 re-check (2026-11-14): all 1,163 pairs matched** (Anna 721, Melissa 442) with the
  Monthly / Yearly switch on Monthly (its default) and no selector change. The ✓/✗ marks sit in
  their own `.mao-check` cell, so the max-offer rule labels and values are unchanged.
## Extraction snippet

Run on `/deal/<id>` in the browser (e.g. serve it from `public/` and load it with a `<script>`
tag, or paste it into the console), then `await captureDeal()` returns the Markdown below.
Selectors target the pre-redesign DOM.

```js
// Deal page baseline extractor (deal-page-redesign, phase 1).
// Load on /deal/<id>, then `await captureDeal()`: walks the 4 Scenario tabs,
// opens every collapsible, flips every view toggle, and returns
// Section | Label | Value | Status | Formula rows as Markdown.
//   Status  = good / warn / bad / neutral / win / selected, from the element's class ('' = none)
//   Formula = 'click' when the label opens a formula modal; for the top tiles,
//             the modal title it opens ('' = no formula)
// It never saves: the only deal write is the B&H property value toggle,
// which it restores to the deal's own value before returning.
// Selectors match the PRE-redesign page (main @ 5599d55).

function statusOf(el) {
  if (!el) return ''
  for (const c of el.classList) {
    const m = c.match(/(?:^|-)(good|warn|bad|neutral)$/)
    if (m) return m[1]
    if (c === 'ph-win') return 'win'
    if (c === 'selected') return 'selected'
  }
  return ''
}
const clickable = (el) => !!el && [...el.classList].some((c) => c.endsWith('-clickable'))

function extractPairs() {
  const T = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : '')
  const out = []
  const add = (section, label, value, statusEl, labelEl) =>
    out.push([section, label, value, statusOf(statusEl), clickable(labelEl) ? 'click' : ''])

  // Header + top bar (6 metrics + score)
  add('Header', 'Address', T(document.querySelector('.addr-line1')))
  add('Header', 'Facts', T(document.querySelector('.addr-line2')))
  document.querySelectorAll('.dashboard-bar .metric').forEach((m) => {
    const lEl = m.querySelector('.metric-label')
    const l = T(lEl)
    add('Top', l, T(m.querySelector('.metric-value')), m, lEl)
    add('Top', l + ' · sub', T(m.querySelector('.metric-sub')))
  })
  const h = document.querySelector('.deal-score-hero')
  if (h) {
    add('Top', T(h.querySelector('.hero-label')), T(h.querySelector('.hero-value')), h)
    add('Top', 'Verdict', T(h.querySelector('.verdict-pill')), h.querySelector('.verdict-pill'))
    add('Top', 'Weakest', T(h.querySelector('.hero-weak')))
  }

  // Scenario tabs and their sub-lines
  document.querySelectorAll('.scenario-tab').forEach((t) =>
    add('Tabs', T(t.querySelector('.tab-label')), T(t.querySelector('.tab-sub'))))

  // B&H property value toggle
  const basis = document.querySelector('.bnh-basis')
  if (basis) add('Property value', T(basis.querySelector('.am-eq-btn.active')), T(basis.querySelector('.bnh-basis-value')), null, basis.querySelector('.am-label'))

  // Scenario summary (headline + 4 cells)
  const pri = document.querySelector('.summary-pri')
  if (pri) {
    const eEl = pri.querySelector('.summary-eyebrow')
    const e = T(eEl)
    add('Summary', e, T(pri.querySelector('.summary-value')), pri.querySelector('.summary-value'), eEl)
    add('Summary', e + ' · sub', T(pri.querySelector('.summary-sub')))
  }
  document.querySelectorAll('.summary-cell').forEach((c) =>
    add('Summary', T(c.querySelector('.cell-label')), T(c.querySelector('.cell-value')), c, c.querySelector('.cell-label')))

  // Output groups (collapsible header rows have an empty value)
  document.querySelectorAll('.out-group').forEach((g) => {
    const title = T(g.querySelector('.out-group-title'))
    g.querySelectorAll('.out-row').forEach((r) => {
      const lEl = r.querySelector('.out-label')
      const value = T(r.querySelector('.out-value'))
      if (value === '') add(title, T(lEl), '(collapsible)')
      else add(title, T(lEl), value, r, lEl)
    })
  })

  // Term Sheet sections + Payoff Horizon matrix
  document.querySelectorAll('.ts-section').forEach((s) => {
    const title = T(s.querySelector('.ts-header .out-group-title'))
    const notice = s.querySelector('.ts-notice')
    if (notice) { add(title, 'Notice', T(notice)); return }
    const main = s.querySelector('.ts-table:not(.ph-table)')
    if (main) {
      const heads = [...main.querySelectorAll('thead th')].map(T)
      main.querySelectorAll('tbody tr').forEach((tr, i) => {
        const cells = [...tr.querySelectorAll('td')]
        const name = `#${i + 1} ${T(cells[0])}`
        cells.slice(1, -1).forEach((td, j) => add(title, `${name} › ${heads[j + 1]}`, T(td), tr))
      })
    }
    const ph = s.querySelector('.ph-block')
    if (ph) {
      add(title, 'Payoff title', T(ph.querySelector('.ph-title')))
      const warn = ph.querySelector('.ph-warning')
      if (warn) add(title, 'Payoff warning', T(warn))
      const heads = [...ph.querySelectorAll('thead th')].map(T)
      heads.slice(1).forEach((hd, j) => add(title, `Payoff column ${j + 1}`, hd))
      ph.querySelectorAll('tbody tr').forEach((tr) => {
        const cells = [...tr.querySelectorAll('td')]
        const horizon = T(cells[0])
        cells.slice(1).forEach((td, j) => add(title, `Payoff ${horizon} › column ${j + 1}`, T(td), td))
      })
    }
  })

  // Maximum Allowable Offer
  const mao = document.querySelector('.mao-detail')
  if (mao) {
    add('MAO', T(mao.querySelector('.mao-detail-title')), T(mao.querySelector('.mao-detail-value')), mao.querySelector('.mao-detail-value'))
    mao.querySelectorAll('.mao-detail-row').forEach((r) => {
      const lEl = r.querySelector('.mao-rule')
      add('MAO', T(lEl), `${T(r.querySelector('.mao-rule-formula'))} | ${T(r.querySelector('.mao-rule-value'))}`, r, lEl)
    })
  }

  // Deal Score breakdown
  const bd = document.querySelector('.score-breakdown')
  if (bd) {
    const title = T(bd.querySelector('.breakdown-title'))
    const tEl = bd.querySelector('.breakdown-total')
    add(title, 'Total', T(tEl), null, tEl)
    bd.querySelectorAll('.breakdown-item').forEach((li) => {
      const lEl = li.querySelector('.bd-label')
      const l = T(lEl)
      add(title, l, T(li.querySelector('.bd-value')), li, lEl)
      add(title, l + ' · target/weight', T(li.querySelector('.bd-row2')))
    })
  }

  // Advanced Metrics
  document.querySelectorAll('.am-panel').forEach((p) => {
    const title = T(p.querySelector('.am-title'))
    p.querySelectorAll('.am-cell').forEach((c) => {
      const lEl = c.querySelector('.am-label')
      add(title, T(lEl), T(c.querySelector('.am-value')), c, lEl)
    })
    const irrEl = p.querySelector('.am-irr-title')
    const irrTitle = T(irrEl)
    const note = p.querySelector('.am-irr-note')
    if (note) add(title, irrTitle, T(note), null, irrEl)
    p.querySelectorAll('.am-irr-row').forEach((r) => {
      const v = r.querySelector('.am-irr-value')
      add(title, `${irrTitle} · ${T(r.querySelector('.am-irr-label'))}`, T(v), v, irrEl)
    })
    const eq = p.querySelector('.am-equity')
    if (eq) {
      const active = T(eq.querySelector('.am-eq-btn.active'))
      const l = T(eq.querySelector('.am-equity-header .am-label')) + (active ? ` (${active})` : '')
      const dEl = eq.querySelector('.am-equity-dollar')
      add(title, l + ' $', T(dEl), null, dEl)
      add(title, l + ' %', T(eq.querySelector('.am-equity-pct')))
      const n = eq.querySelector('.am-equity-note')
      if (n) add(title, l + ' · note', T(n))
    }
  })
  return out
}

// Click each top tile's label and record the formula modal title it opens.
async function tileFormulas() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const res = []
  for (const m of document.querySelectorAll('.dashboard-bar .metric')) {
    const lEl = m.querySelector('.metric-label')
    lEl.click(); await sleep(120)
    const h3 = document.querySelector('.fixed.inset-0 h3')
    res.push([lEl.innerText.replace(/\s+/g, ' ').trim(), h3 ? h3.innerText.trim() : '(none)'])
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(80)
  }
  return res
}

async function captureDeal() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const tab = (name) => [...document.querySelectorAll('.scenario-tab')]
    .find((t) => t.querySelector('.tab-label').innerText.trim() === name)
  const openCollapsibles = async () => {
    for (const r of document.querySelectorAll('.out-row.out-label-clickable')) {
      if (r.innerText.trim().startsWith('▸')) { r.click(); await sleep(60) }
    }
  }
  const cellStartingWith = (prefix) => [...document.querySelectorAll('.summary-cell')]
    .find((c) => c.querySelector('.cell-label').innerText.trim().toLowerCase().startsWith(prefix.toLowerCase()))
  // Flip every view toggle on the current tab (each is independent)
  const flipToggles = async () => {
    cellStartingWith('Cash-on-Cash')?.click(); await sleep(60)
    cellStartingWith('Equity')?.click(); await sleep(60)
    document.querySelector('.am-panel .am-value.am-label-clickable')?.click(); await sleep(60)
    const liq = [...document.querySelectorAll('.am-equity .am-eq-btn')].find((b) => b.innerText.trim() === 'Liquidation')
    liq?.click(); await sleep(60)
  }
  const fmt = (pairs) => pairs.map((p) => `| ${p.join(' | ')} |`).join('\n')
  const HEAD = '| Section | Label | Value | Status | Formula |\n|---|---|---|---|---|\n'
  const diff = (base, next) => {
    const seen = new Set(base.map((p) => p.join('\u0001')))
    return next.filter((p) => !seen.has(p.join('\u0001')))
  }
  const sections = []
  const shot = async (heading) => {
    await openCollapsibles()
    const base = extractPairs()
    const tiles = await tileFormulas()
    for (const p of base) {
      if (p[0] !== 'Top') continue
      const t = tiles.find(([l]) => l === p[1])
      if (t) p[4] = `modal: ${t[1]}`
    }
    sections.push(`#### ${heading} — default view (all collapsibles open)\n\n${HEAD}${fmt(base)}`)
    await flipToggles()
    const flipped = diff(base.map((p) => p[0] === 'Top' && p[4].startsWith('modal') ? [...p.slice(0, 4), 'click'] : p), extractPairs())
    sections.push(`#### ${heading} — toggles flipped (CoC → w/o CapEx, Equity → $, Annual CF → no capex, Equity post-Refi → Liquidation): pairs that change\n\n` +
      (flipped.length ? HEAD + fmt(flipped) : '_No view toggles on this tab — nothing changes._'))
  }
  for (const name of ['BRRRR', 'Buy & Hold', 'Flip · Cash', 'Flip · HML']) {
    tab(name).click(); await sleep(200)
    if (name !== 'Buy & Hold') { await shot(name); continue }
    const basisBtns = () => [...document.querySelectorAll('.bnh-basis .am-eq-btn')]
    const original = basisBtns().find((b) => b.classList.contains('active')).innerText.trim()
    await shot(`Buy & Hold (Property value: ${original})`)
    // Re-mount the tab so its view toggles reset, then switch the basis (unsaved)
    tab('BRRRR').click(); await sleep(150); tab('Buy & Hold').click(); await sleep(150)
    const other = basisBtns().find((b) => !b.classList.contains('active'))
    const otherName = other.innerText.trim()
    other.click(); await sleep(200)
    await shot(`Buy & Hold (Property value: ${otherName}) — unsaved toggle`)
    basisBtns().find((b) => b.innerText.trim() === original).click(); await sleep(200)
  }
  tab('BRRRR').click(); await sleep(150)
  return sections.join('\n\n')
}
```

## Compare and ⓘ check (phase 2 onward)

Saved 2026-11-14 so later phases can re-run the check from a fresh session. Build one script:
the extraction snippet above with the phase-1 top-of-page swaps (`.addr-line1` → `.dh-address`,
`.addr-line2` → `.dh-facts`, `.dashboard-bar .metric` → `.kpi-tile`, `.metric-label/-value/-sub`
→ `.kpi-label/-value/-sub`, `.deal-score-hero` → `.score-tile`, `.hero-label/-value/-weak` →
`.score-tile-label/-value/-weak`), followed by the compare code below. Serve it and this file
temporarily from `public/` (`public/__p2check.js`, `public/__baseline.md` — delete both before
committing), open `/deal/<id>`, load the script with a `<script>` tag, then run
`await compareDeal('1805 Cedar Wood, Anna TX (BRRRR)')` (or the Melissa heading). It returns
`{ checked, missing, extras }`; **pass = `missing` is empty**. Never Save during the check.

```js
// Baseline pairs must be present on the new page (same tab/state heading; label
// case-insensitive; value, status and formula exact; Section ignored).
function parseTables(md) {
  const out = {}; let deal = null, head = null
  for (const line of md.split('\n')) {
    let m
    if ((m = line.match(/^## (.+)$/))) { deal = m[1]; continue }
    if ((m = line.match(/^#{3,4} (.+)$/))) { head = m[1].replace(/ — unsaved toggle/, ''); continue }
    if (deal && head && line.startsWith('| ') && !line.startsWith('| Section')) {
      const c = line.slice(2, -2).split(' | ')
      ;(out[deal + ' :: ' + head] ||= []).push(c)
    }
  }
  return out
}
const key = (c) => [c[1].toLowerCase(), c[2], c[3], c[4]].join('\u0001')
async function compareDeal(dealName) {
  const md = await fetch('/__baseline.md').then((r) => r.text())
  const base = parseTables(md)
  const now = parseTables(`## ${dealName}\n` + (await captureDeal()))
  const missing = []; let checked = 0
  for (const [k, rows] of Object.entries(base)) {
    if (!k.startsWith(dealName + ' :: ')) continue
    const got = now[k]
    if (!got) { missing.push(['NO SECTION', k]); continue }
    const set = new Set(got.map(key))
    for (const r of rows) { checked++; if (!set.has(key(r))) missing.push([k.split(' :: ')[1].slice(0, 40), ...r]) }
  }
  const extras = []
  for (const [k, rows] of Object.entries(now)) {
    const b = new Set((base[k] || []).map(key))
    for (const r of rows) if (!b.has(key(r))) extras.push([k.split(' :: ')[1].slice(0, 30), ...r])
  }
  return { checked, missing, extras }
}
```

ⓘ check — run on a tab that is in section cards (phase 2: BRRRR). Every label that opens a
formula must carry `.info-icon`, no icon may sit on a label without a formula, and icon and label
must open the same modal. Phase 2 result on Anna's BRRRR tab: 40 / 40, no mismatches.

```js
async function checkInfoIcons() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const T = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : '')
  const modalTitle = () => { const h = document.querySelector('.fixed.inset-0 h3'); return h ? h.innerText.trim() : null }
  const esc = async () => { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await sleep(60) }
  for (const r of document.querySelectorAll('.out-row.out-label-clickable')) if (T(r).startsWith('▸')) { r.click(); await sleep(60) }
  const scope = [...document.querySelectorAll('.kpi-tiles, .section-stack')]
  const res = { withFormula: 0, icons: 0, mismatch: [], noIcon: [], iconNoFormula: [] }
  for (const el of scope.flatMap((s) => [...s.querySelectorAll('[class*="-clickable"]')])) {
    if (el.classList.contains('out-row')) { if (el.querySelector(':scope > .out-label > .info-icon')) res.iconNoFormula.push(T(el)); continue } // collapsible headers
    if (el.classList.contains('am-value') || el.classList.contains('am-equity-dollar')) continue // toggle / second click target
    el.click(); await sleep(80); const t1 = modalTitle(); await esc()
    if (!t1) { if (el.querySelector('.info-icon')) res.iconNoFormula.push(T(el)); continue }
    res.withFormula++
    const icon = el.querySelector('.info-icon')
    if (!icon) { res.noIcon.push(T(el)); continue }
    res.icons++
    icon.dispatchEvent(new MouseEvent('click', { bubbles: true })); await sleep(80); const t2 = modalTitle(); await esc()
    if (t1 !== t2) res.mismatch.push([T(el), t1, t2])
  }
  return res
}
```

---

## 1805 Cedar Wood, Anna TX (BRRRR)

### BRRRR — default view (all collapsibles open)

| Section | Label | Value | Status | Formula |
|---|---|---|---|---|
| Header | Address | 1805 Cedar Wood, Anna TX, 75409 |  |  |
| Header | Facts | SFR · 1,621 sqft · built 2013 · via BSJ |  |  |
| Top | CASHFLOW | $228/mo | good | modal: Monthly cashflow |
| Top | CASHFLOW · sub | w/o CapEx: $593/mo |  |  |
| Top | COC | 4.3% | bad | modal: Cash-on-Cash ROI |
| Top | COC · sub | w/o CapEx: 11.1% |  |  |
| Top | DSCR | 1.37 | good | modal: DSCR (Debt Service Coverage Ratio) |
| Top | DSCR · sub | lender ratio: 5.43 |  |  |
| Top | EQUITY | 7.1% | bad | modal: Book equity post-Refi |
| Top | EQUITY · sub | $68,750 |  |  |
| Top | MONEY IN DEAL | $64,216 | warn | modal: Money in deal |
| Top | MONEY IN DEAL · sub | target ≤ $65k |  |  |
| Top | MAO | $178,420 | bad | modal: Maximum Allowable Offer |
| Top | MAO · sub | $51,580 over · 70% Rule |  |  |
| Top | DEAL SCORE | 3.0 /10 | bad |  |
| Top | Verdict | NO-GO | bad |  |
| Top | Weakest | WEAKEST: Cash-on-Cash 4.3% Equity % 7.1% |  |  |
| Tabs | BRRRR | $228/mo |  |  |
| Tabs | Buy & Hold | $374/mo |  |  |
| Tabs | Flip · Cash | -$7,357 profit |  |  |
| Tabs | Flip · HML | -$10,895 profit |  |  |
| Summary | ANNUAL CASHFLOW | $2,736 | good |  |
| Summary | ANNUAL CASHFLOW · sub | $228 / month after debt service |  |  |
| Summary | CASH-ON-CASH | 4.3% | bad |  |
| Summary | DSCR | 1.37 | good |  |
| Summary | EQUITY % | 7.1% | bad |  |
| Summary | MONEY IN DEAL | $64,216 | warn |  |
| ACQUISITION | Purchase price | $230,000 |  | click |
| ACQUISITION | Rehab Estimate (Funded) | $14,080 |  | click |
| ACQUISITION | Change Orders (Not Funded) | $0 |  |  |
| ACQUISITION | Additional rehab costs | $0 |  |  |
| ACQUISITION | Closing costs | $0 |  | click |
| ACQUISITION | One-time costs | $11,170 |  |  |
| ACQUISITION | Holding costs | $748 |  | click |
| ACQUISITION | Project cost adjustments | −$8,200 |  |  |
| ACQUISITION | Total project cost | $247,798 |  | click |
| MONTHLY OPERATING | Gross rent | $2,434 |  | click |
| MONTHLY OPERATING | ▾ Expense breakdown | (collapsible) |  |  |
| MONTHLY OPERATING | Property Tax | −$273 |  |  |
| MONTHLY OPERATING | Insurance | −$143 |  |  |
| MONTHLY OPERATING | HOA | −$32 |  |  |
| MONTHLY OPERATING | State income tax | −$0 |  |  |
| MONTHLY OPERATING | Property management | −$13 |  |  |
| MONTHLY OPERATING | Capex / vacancy | −$365 |  |  |
| MONTHLY OPERATING | Additional Monthly Costs | −$25 |  |  |
| MONTHLY OPERATING | Mortgage P&I | −$1,355 |  | click |
| MONTHLY OPERATING | Total Operating expenses (Include PITI) / w/o Capex | −$2,206 / −$1,841 |  | click |
| MONTHLY OPERATING | NOI / w/o Capex | $228 / $593 |  | click |
| MONTHLY OPERATING | Monthly cashflow / w/o Capex | $228 / $593 | good | click |
| MONTHLY OPERATING | ▾ Interest-only scenario | (collapsible) |  |  |
| MONTHLY OPERATING | Interest only mortgage monthly | −$1,182 |  |  |
| MONTHLY OPERATING | Total Operating expenses (Include ITI) / w/o Capex | −$2,033 / −$1,668 |  |  |
| MONTHLY OPERATING | Monthly cashflow Interest-only / w/o Capex | $401 / $766 | good |  |
| HARD MONEY LOAN | HML principal (69.6% LTC) | $160,000 |  | click |
| HARD MONEY LOAN | Points (2%) | $3,200 |  |  |
| HARD MONEY LOAN | Monthly interest | $1,327 |  | click |
| HARD MONEY LOAN | Interest carry (6 mo) | $7,960 |  | click |
| HARD MONEY LOAN | Total HML cost (fees) | $6,467 |  | click |
| HARD MONEY LOAN | Total debt to HML | $167,959 |  |  |
| HARD MONEY LOAN | Monthly cashflow — HML phase / w/o Capex | $256 / $621 | good | click |
| REFINANCE | New loan (75% LTV) | $206,250 |  | click |
| REFINANCE | Refi closing + points | $8,242 |  | click |
| REFINANCE | Cash returned at refi | $30,049 |  | click |
| REFINANCE | Money in deal | $64,216 | warn | click |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › TOTAL CASH IN | $94,265 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › MONEY IN DEAL | $64,216 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › CASHFLOW /MO | $228 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › COC | 4.3% | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › DSCR | 1.37 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › SCORE | 3.0 | selected |  |
| HML TERM SHEETS | #2 Marshall Reddick › TOTAL CASH IN | $94,265 |  |  |
| HML TERM SHEETS | #2 Marshall Reddick › MONEY IN DEAL | $64,216 |  |  |
| HML TERM SHEETS | #2 Marshall Reddick › CASHFLOW /MO | $228 |  |  |
| HML TERM SHEETS | #2 Marshall Reddick › COC | 4.3% |  |  |
| HML TERM SHEETS | #2 Marshall Reddick › DSCR | 1.37 |  |  |
| HML TERM SHEETS | #2 Marshall Reddick › SCORE | 3.0 |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › TOTAL CASH IN | $94,265 |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › MONEY IN DEAL | $64,401 |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › CASHFLOW /MO | $193 |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › COC | 3.6% |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › DSCR | 1.35 |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › SCORE | 3.0 |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › TOTAL CASH IN | $94,265 |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › MONEY IN DEAL | $65,680 |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › CASHFLOW /MO | $211 |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › COC | 3.8% |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › DSCR | 1.36 |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › SCORE | 3.0 |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › TOTAL CASH IN | $94,265 |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › MONEY IN DEAL | $63,101 |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › CASHFLOW /MO | $176 |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › COC | 3.3% |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › DSCR | 1.34 |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › SCORE | 3.0 |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › TOTAL CASH IN | $94,265 |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › MONEY IN DEAL | $67,226 |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › CASHFLOW /MO | $228 |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › COC | 4.1% |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › DSCR | 1.37 |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › SCORE | 3.0 |  |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › TOTAL CASH IN | $94,265 | selected |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › MONEY IN DEAL | $64,216 | selected |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › CASHFLOW /MO | $228 | selected |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › COC | 4.3% | selected |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › DSCR | 1.37 | selected |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › SCORE | 3.0 | selected |  |
| REFI TERM SHEETS | Payoff title | PAYOFF HORIZON — TOTAL LOAN COST IF PAID OFF AT… |  |  |
| REFI TERM SHEETS | Payoff column 1 | ALEX YUDIN RON 2 $1,389.54/mo P&I |  |  |
| REFI TERM SHEETS | Payoff column 2 | ALEX YUDIN RON 3 $1,372.19/mo P&I |  |  |
| REFI TERM SHEETS | Payoff column 3 | ALEX YUDIN RON 1 $1,406.99/mo P&I |  |  |
| REFI TERM SHEETS | Payoff column 4 | ALEX YUDIN RON 4 $1,354.92/mo P&I |  |  |
| REFI TERM SHEETS | Payoff column 5 | ALEX YUDIN LOCAL NOTARY · SELECTED $1,354.92/mo P&I |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 1 | $57,841 incl. $5,990 PPP |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 2 | $58,338 incl. $5,985 PPP |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 3 | $57,323 incl. $5,994 PPP |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 4 | $59,103 incl. $5,980 PPP |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 5 | $56,093 incl. $5,980 PPP | win |  |
| REFI TERM SHEETS | Payoff 5 yr › column 1 | $79,952 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 2 | $79,932 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 3 | $79,952 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 4 | $80,181 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 5 | $77,171 | win |  |
| REFI TERM SHEETS | Payoff 7 yr › column 1 | $107,252 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 2 | $106,710 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 3 | $107,774 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 4 | $106,438 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 5 | $103,428 | win |  |
| REFI TERM SHEETS | Payoff 10 yr › column 1 | $146,426 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 2 | $145,105 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 3 | $147,730 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 4 | $144,056 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 5 | $141,046 | win |  |
| REFI TERM SHEETS | Payoff 15 yr › column 1 | $205,694 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 2 | $203,112 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 3 | $208,264 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 4 | $200,808 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 5 | $197,798 | win |  |
| REFI TERM SHEETS | Payoff 20 yr › column 1 | $254,682 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 2 | $250,961 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 3 | $258,398 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 4 | $247,525 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 5 | $244,515 | win |  |
| MAO | Maximum Allowable Offer | $178,420 | bad |  |
| MAO | 70% Rule | ARV × 70% − rehab | $178,420 |  | click |
| MAO | Money in deal ≤ $65k | money in deal = target | $230,747 |  | click |
| MAO | Equity post-Refi ≥ 20% | money in deal ≤ post-Refi equity ÷ (1 + 20%) | $205,911 |  | click |
| MAO | Binding constraint | 70% Rule | $178,420 |  |  |
| MAO | Your offer | $51,580 ABOVE MAO | $230,000 | bad |  |
| Deal Score Breakdown | Total | 3.0 / 10 |  |  |
| Deal Score Breakdown | Cash-on-Cash | 4.3% | bad | click |
| Deal Score Breakdown | Cash-on-Cash · target/weight | target ≥10% weight 33% |  |  |
| Deal Score Breakdown | Equity % | 7.1% | bad | click |
| Deal Score Breakdown | Equity % · target/weight | target ≥20% weight 33% |  |  |
| Deal Score Breakdown | Location | 9/10 | good | click |
| Deal Score Breakdown | Location · target/weight | target ≥7 weight 33% |  |  |
| ADVANCED METRICS | CAP RATE | 6.9% | warn | click |
| ADVANCED METRICS | GRM | 9.4× | warn | click |
| ADVANCED METRICS | FORCED EQUITY ROI | 11.0% | bad | click |
| ADVANCED METRICS | ANNUAL CF (W/ CAPEX) | $2,736 | neutral | click |
| ADVANCED METRICS | ROE | 4.0% | bad | click |
| ADVANCED METRICS | MARGIN/ARV | 9.9% | bad | click |
| ADVANCED METRICS | 5-YEAR IRR · 2% appreciation | 9.9% | warn | click |
| ADVANCED METRICS | 5-YEAR IRR · 3% appreciation | 13.0% | good | click |
| ADVANCED METRICS | 5-YEAR IRR · 4% appreciation | 15.9% | good | click |
| ADVANCED METRICS | EQUITY POST-REFI (Book) $ | $68,750 |  | click |
| ADVANCED METRICS | EQUITY POST-REFI (Book) % | 7.1% |  |  |

### BRRRR — toggles flipped (CoC → w/o CapEx, Equity → $, Annual CF → no capex, Equity post-Refi → Liquidation): pairs that change

| Section | Label | Value | Status | Formula |
|---|---|---|---|---|
| Summary | CASH-ON-CASH (W/O CAPEX) | 11.1% | good |  |
| Summary | EQUITY $ | $68,750 | bad |  |
| ADVANCED METRICS | ANNUAL CF (NO CAPEX) | $7,117 | neutral | click |
| ADVANCED METRICS | EQUITY POST-REFI (Liquidation) $ | $46,750 |  | click |
| ADVANCED METRICS | EQUITY POST-REFI (Liquidation) % | 17.0% |  |  |
| ADVANCED METRICS | EQUITY POST-REFI (Liquidation) · note | After 8% selling costs |  |  |

### Buy & Hold (Property value: ARV) — default view (all collapsibles open)

| Section | Label | Value | Status | Formula |
|---|---|---|---|---|
| Header | Address | 1805 Cedar Wood, Anna TX, 75409 |  |  |
| Header | Facts | SFR · 1,621 sqft · built 2013 · via BSJ |  |  |
| Top | CASHFLOW | $374/mo | good | modal: B&H monthly cashflow |
| Top | CASHFLOW · sub | w/o CapEx: $739/mo |  |  |
| Top | COC | 6.1% | warn | modal: B&H Cash-on-Cash |
| Top | COC · sub | w/o CapEx: 12.1% |  |  |
| Top | DSCR | 1.50 | good | modal: B&H DSCR |
| Top | DSCR · sub | lender ratio: 5.43 |  |  |
| Top | EQUITY | 24.6% | good | modal: B&H equity |
| Top | EQUITY · sub | $91,000 |  |  |
| Top | CASH IN | $73,026 | bad | modal: B&H Cash In |
| Top | CASH IN · sub | target ≤ $65k |  |  |
| Top | MAO | $178,420 | bad | modal: Maximum Allowable Offer |
| Top | MAO · sub | $51,580 over · 70% Rule |  |  |
| Top | B&H DEAL SCORE | 7.3 /10 | warn |  |
| Top | Verdict | NO-GO | warn |  |
| Top | Weakest | WEAKEST: Cash-on-Cash 6.1% Equity % 24.6% |  |  |
| Tabs | BRRRR | $228/mo |  |  |
| Tabs | Buy & Hold | $374/mo |  |  |
| Tabs | Flip · Cash | -$7,357 profit |  |  |
| Tabs | Flip · HML | -$10,895 profit |  |  |
| Property value | ARV | $275,000 |  | click |
| Summary | ANNUAL CASHFLOW | $4,490 | good | click |
| Summary | ANNUAL CASHFLOW · sub | $374 / month after the B&H mortgage |  |  |
| Summary | CASH-ON-CASH | 6.1% | warn | click |
| Summary | DSCR | 1.50 | good | click |
| Summary | EQUITY % | 24.6% | good | click |
| Summary | CASH IN | $73,026 | bad | click |
| PURCHASE & CASH IN | Purchase price | $230,000 |  | click |
| PURCHASE & CASH IN | Down payment | $46,000 |  | click |
| PURCHASE & CASH IN | Loan (80% of price) | $184,000 |  | click |
| PURCHASE & CASH IN | Loan costs (points + fees + title/escrow) | $8,019 |  | click |
| PURCHASE & CASH IN | Closing costs | $0 |  | click |
| PURCHASE & CASH IN | Rehab (all cash) | $14,080 |  | click |
| PURCHASE & CASH IN | One-time costs | $11,170 |  | click |
| PURCHASE & CASH IN | Holding costs (1 mo, incl. mortgage) | $1,957 |  | click |
| PURCHASE & CASH IN | Credits at close | −$8,200 |  | click |
| PURCHASE & CASH IN | Cash In | $73,026 | bad | click |
| MONTHLY OPERATING | Gross rent | $2,434 |  | click |
| MONTHLY OPERATING | ▾ Expense breakdown | (collapsible) |  |  |
| MONTHLY OPERATING | Property Tax | −$273 |  | click |
| MONTHLY OPERATING | Insurance | −$143 |  | click |
| MONTHLY OPERATING | HOA | −$32 |  | click |
| MONTHLY OPERATING | State income tax | −$0 |  | click |
| MONTHLY OPERATING | Property management | −$13 |  | click |
| MONTHLY OPERATING | Capex / vacancy | −$365 |  | click |
| MONTHLY OPERATING | Additional Monthly Costs | −$25 |  | click |
| MONTHLY OPERATING | Mortgage P&I | −$1,209 |  | click |
| MONTHLY OPERATING | Total Operating expenses (incl. P&I) / w/o Capex | −$2,060 / −$1,695 |  | click |
| MONTHLY OPERATING | NOI | $1,583 |  | click |
| MONTHLY OPERATING | Monthly cashflow / w/o Capex | $374 / $739 | good | click |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › TOTAL CASH IN | $94,265 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › MONEY IN DEAL | $64,216 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › CASHFLOW /MO | $228 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › COC | 4.3% | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › DSCR | 1.37 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › SCORE | 3.0 | selected |  |
| HML TERM SHEETS | #2 Marshall Reddick › TOTAL CASH IN | $94,265 |  |  |
| HML TERM SHEETS | #2 Marshall Reddick › MONEY IN DEAL | $64,216 |  |  |
| HML TERM SHEETS | #2 Marshall Reddick › CASHFLOW /MO | $228 |  |  |
| HML TERM SHEETS | #2 Marshall Reddick › COC | 4.3% |  |  |
| HML TERM SHEETS | #2 Marshall Reddick › DSCR | 1.37 |  |  |
| HML TERM SHEETS | #2 Marshall Reddick › SCORE | 3.0 |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › CASH IN | $73,101 |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › CASHFLOW /MO | $343 |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › COC | 5.6% |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › DSCR | 1.47 |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › SCORE | 5.3 |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › CASH IN | $74,226 |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › CASHFLOW /MO | $359 |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › COC | 5.8% |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › DSCR | 1.48 |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › SCORE | 5.3 |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › CASH IN | $71,957 |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › CASHFLOW /MO | $328 |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › COC | 5.5% |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › DSCR | 1.46 |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › SCORE | 5.7 |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › CASH IN | $75,591 |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › CASHFLOW /MO | $374 |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › COC | 5.9% |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › DSCR | 1.50 |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › SCORE | 5.3 |  |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › CASH IN | $73,026 | selected |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › CASHFLOW /MO | $374 | selected |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › COC | 6.1% | selected |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › DSCR | 1.50 | selected |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › SCORE | 7.3 | selected |  |
| REFI TERM SHEETS | Payoff title | PAYOFF HORIZON — TOTAL LOAN COST IF PAID OFF AT… |  |  |
| REFI TERM SHEETS | Payoff column 1 | ALEX YUDIN RON 2 $1,239.64/mo P&I |  |  |
| REFI TERM SHEETS | Payoff column 2 | ALEX YUDIN RON 3 $1,224.16/mo P&I |  |  |
| REFI TERM SHEETS | Payoff column 3 | ALEX YUDIN RON 1 $1,255.20/mo P&I |  |  |
| REFI TERM SHEETS | Payoff column 4 | ALEX YUDIN RON 4 $1,208.75/mo P&I |  |  |
| REFI TERM SHEETS | Payoff column 5 | ALEX YUDIN LOCAL NOTARY · SELECTED $1,208.75/mo P&I |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 1 | $52,147 incl. $5,343 PPP |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 2 | $52,591 incl. $5,339 PPP |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 3 | $51,686 incl. $5,347 PPP |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 4 | $53,273 incl. $5,335 PPP |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 5 | $50,708 incl. $5,335 PPP | win |  |
| REFI TERM SHEETS | Payoff 5 yr › column 1 | $71,873 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 2 | $71,856 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 3 | $71,873 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 4 | $72,078 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 5 | $69,513 | win |  |
| REFI TERM SHEETS | Payoff 7 yr › column 1 | $96,228 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 2 | $95,744 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 3 | $96,694 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 4 | $95,502 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 5 | $92,937 | win |  |
| REFI TERM SHEETS | Payoff 10 yr › column 1 | $131,176 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 2 | $129,998 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 3 | $132,340 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 4 | $129,061 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 5 | $126,496 | win |  |
| REFI TERM SHEETS | Payoff 15 yr › column 1 | $184,050 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 2 | $181,747 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 3 | $186,343 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 4 | $179,691 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 5 | $177,126 | win |  |
| REFI TERM SHEETS | Payoff 20 yr › column 1 | $227,753 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 2 | $224,434 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 3 | $231,069 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 4 | $221,369 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 5 | $218,804 | win |  |
| MAO | Maximum Allowable Offer | $178,420 | bad |  |
| MAO | 70% Rule | ARV × 70% − rehab | $178,420 |  | click |
| MAO | Money in deal ≤ $65k | money in deal = target | $230,747 |  | click |
| MAO | Equity post-Refi ≥ 20% | money in deal ≤ post-Refi equity ÷ (1 + 20%) | $205,911 |  | click |
| MAO | Binding constraint | 70% Rule | $178,420 |  |  |
| MAO | Your offer | $51,580 ABOVE MAO | $230,000 | bad |  |
| B&H Deal Score Breakdown | Total | 7.3 / 10 |  | click |
| B&H Deal Score Breakdown | Cash-on-Cash | 6.1% | warn | click |
| B&H Deal Score Breakdown | Cash-on-Cash · target/weight | target ≥10% weight 33% |  |  |
| B&H Deal Score Breakdown | Equity % | 24.6% | good | click |
| B&H Deal Score Breakdown | Equity % · target/weight | target ≥20% weight 33% |  |  |
| B&H Deal Score Breakdown | Location | 9/10 | good | click |
| B&H Deal Score Breakdown | Location · target/weight | target ≥7 weight 33% |  |  |
| ADVANCED METRICS · BUY & HOLD | CAP RATE | 6.9% | warn | click |
| ADVANCED METRICS · BUY & HOLD | GRM | 9.4× | warn | click |
| ADVANCED METRICS · BUY & HOLD | ROE | 4.9% | warn | click |
| ADVANCED METRICS · BUY & HOLD | ANNUAL CF (W/ CAPEX) | $4,490 | neutral | click |
| ADVANCED METRICS · BUY & HOLD | VALUE (ARV) | $275,000 | neutral | click |
| ADVANCED METRICS · BUY & HOLD | LOAN (80%) | $184,000 | neutral | click |
| ADVANCED METRICS · BUY & HOLD | 5-YEAR IRR · 2% appreciation | 13.5% | good | click |
| ADVANCED METRICS · BUY & HOLD | 5-YEAR IRR · 3% appreciation | 16.0% | good | click |
| ADVANCED METRICS · BUY & HOLD | 5-YEAR IRR · 4% appreciation | 18.4% | good | click |
| ADVANCED METRICS · BUY & HOLD | EQUITY AT PURCHASE $ | $91,000 |  | click |
| ADVANCED METRICS · BUY & HOLD | EQUITY AT PURCHASE % | 24.6% |  |  |
| ADVANCED METRICS · BUY & HOLD | EQUITY AT PURCHASE · note | On ARV: value − B&H loan |  |  |

### Buy & Hold (Property value: ARV) — toggles flipped (CoC → w/o CapEx, Equity → $, Annual CF → no capex, Equity post-Refi → Liquidation): pairs that change

| Section | Label | Value | Status | Formula |
|---|---|---|---|---|
| Summary | CASH-ON-CASH (W/O CAPEX) | 12.1% | good | click |
| Summary | EQUITY $ | $91,000 | good | click |
| ADVANCED METRICS · BUY & HOLD | ANNUAL CF (NO CAPEX) | $8,871 | neutral | click |

### Buy & Hold (Property value: Purchase price) — unsaved toggle — default view (all collapsibles open)

| Section | Label | Value | Status | Formula |
|---|---|---|---|---|
| Header | Address | 1805 Cedar Wood, Anna TX, 75409 |  |  |
| Header | Facts | SFR · 1,621 sqft · built 2013 · via BSJ |  |  |
| Top | CASHFLOW | $374/mo | good | modal: B&H monthly cashflow |
| Top | CASHFLOW · sub | w/o CapEx: $739/mo |  |  |
| Top | COC | 6.1% | warn | modal: B&H Cash-on-Cash |
| Top | COC · sub | w/o CapEx: 12.1% |  |  |
| Top | DSCR | 1.50 | good | modal: B&H DSCR |
| Top | DSCR · sub | lender ratio: 5.43 |  |  |
| Top | EQUITY | -37.0% | bad | modal: B&H equity |
| Top | EQUITY · sub | $46,000 |  |  |
| Top | CASH IN | $73,026 | bad | modal: B&H Cash In |
| Top | CASH IN · sub | target ≤ $65k |  |  |
| Top | MAO | $178,420 | bad | modal: Maximum Allowable Offer |
| Top | MAO · sub | $51,580 over · 70% Rule |  |  |
| Top | B&H DEAL SCORE | 5.0 /10 | warn |  |
| Top | Verdict | NO-GO | warn |  |
| Top | Weakest | WEAKEST: Equity % -37.0% Cash-on-Cash 6.1% |  |  |
| Tabs | BRRRR | $228/mo |  |  |
| Tabs | Buy & Hold | $374/mo |  |  |
| Tabs | Flip · Cash | -$7,357 profit |  |  |
| Tabs | Flip · HML | -$10,895 profit |  |  |
| Property value | Purchase price | $230,000 |  | click |
| Summary | ANNUAL CASHFLOW | $4,490 | good | click |
| Summary | ANNUAL CASHFLOW · sub | $374 / month after the B&H mortgage |  |  |
| Summary | CASH-ON-CASH | 6.1% | warn | click |
| Summary | DSCR | 1.50 | good | click |
| Summary | EQUITY % | -37.0% | bad | click |
| Summary | CASH IN | $73,026 | bad | click |
| PURCHASE & CASH IN | Purchase price | $230,000 |  | click |
| PURCHASE & CASH IN | Down payment | $46,000 |  | click |
| PURCHASE & CASH IN | Loan (80% of price) | $184,000 |  | click |
| PURCHASE & CASH IN | Loan costs (points + fees + title/escrow) | $8,019 |  | click |
| PURCHASE & CASH IN | Closing costs | $0 |  | click |
| PURCHASE & CASH IN | Rehab (all cash) | $14,080 |  | click |
| PURCHASE & CASH IN | One-time costs | $11,170 |  | click |
| PURCHASE & CASH IN | Holding costs (1 mo, incl. mortgage) | $1,957 |  | click |
| PURCHASE & CASH IN | Credits at close | −$8,200 |  | click |
| PURCHASE & CASH IN | Cash In | $73,026 | bad | click |
| MONTHLY OPERATING | Gross rent | $2,434 |  | click |
| MONTHLY OPERATING | ▾ Expense breakdown | (collapsible) |  |  |
| MONTHLY OPERATING | Property Tax | −$273 |  | click |
| MONTHLY OPERATING | Insurance | −$143 |  | click |
| MONTHLY OPERATING | HOA | −$32 |  | click |
| MONTHLY OPERATING | State income tax | −$0 |  | click |
| MONTHLY OPERATING | Property management | −$13 |  | click |
| MONTHLY OPERATING | Capex / vacancy | −$365 |  | click |
| MONTHLY OPERATING | Additional Monthly Costs | −$25 |  | click |
| MONTHLY OPERATING | Mortgage P&I | −$1,209 |  | click |
| MONTHLY OPERATING | Total Operating expenses (incl. P&I) / w/o Capex | −$2,060 / −$1,695 |  | click |
| MONTHLY OPERATING | NOI | $1,583 |  | click |
| MONTHLY OPERATING | Monthly cashflow / w/o Capex | $374 / $739 | good | click |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › TOTAL CASH IN | $94,265 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › MONEY IN DEAL | $64,216 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › CASHFLOW /MO | $228 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › COC | 4.3% | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › DSCR | 1.37 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › SCORE | 3.0 | selected |  |
| HML TERM SHEETS | #2 Marshall Reddick › TOTAL CASH IN | $94,265 |  |  |
| HML TERM SHEETS | #2 Marshall Reddick › MONEY IN DEAL | $64,216 |  |  |
| HML TERM SHEETS | #2 Marshall Reddick › CASHFLOW /MO | $228 |  |  |
| HML TERM SHEETS | #2 Marshall Reddick › COC | 4.3% |  |  |
| HML TERM SHEETS | #2 Marshall Reddick › DSCR | 1.37 |  |  |
| HML TERM SHEETS | #2 Marshall Reddick › SCORE | 3.0 |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › CASH IN | $73,101 |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › CASHFLOW /MO | $343 |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › COC | 5.6% |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › DSCR | 1.47 |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › SCORE | 3.0 |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › CASH IN | $74,226 |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › CASHFLOW /MO | $359 |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › COC | 5.8% |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › DSCR | 1.48 |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › SCORE | 3.0 |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › CASH IN | $71,957 |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › CASHFLOW /MO | $328 |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › COC | 5.5% |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › DSCR | 1.46 |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › SCORE | 3.0 |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › CASH IN | $75,591 |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › CASHFLOW /MO | $374 |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › COC | 5.9% |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › DSCR | 1.50 |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › SCORE | 3.0 |  |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › CASH IN | $73,026 | selected |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › CASHFLOW /MO | $374 | selected |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › COC | 6.1% | selected |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › DSCR | 1.50 | selected |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › SCORE | 5.0 | selected |  |
| REFI TERM SHEETS | Payoff title | PAYOFF HORIZON — TOTAL LOAN COST IF PAID OFF AT… |  |  |
| REFI TERM SHEETS | Payoff column 1 | ALEX YUDIN RON 2 $1,239.64/mo P&I |  |  |
| REFI TERM SHEETS | Payoff column 2 | ALEX YUDIN RON 3 $1,224.16/mo P&I |  |  |
| REFI TERM SHEETS | Payoff column 3 | ALEX YUDIN RON 1 $1,255.20/mo P&I |  |  |
| REFI TERM SHEETS | Payoff column 4 | ALEX YUDIN RON 4 $1,208.75/mo P&I |  |  |
| REFI TERM SHEETS | Payoff column 5 | ALEX YUDIN LOCAL NOTARY · SELECTED $1,208.75/mo P&I |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 1 | $52,147 incl. $5,343 PPP |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 2 | $52,591 incl. $5,339 PPP |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 3 | $51,686 incl. $5,347 PPP |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 4 | $53,273 incl. $5,335 PPP |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 5 | $50,708 incl. $5,335 PPP | win |  |
| REFI TERM SHEETS | Payoff 5 yr › column 1 | $71,873 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 2 | $71,856 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 3 | $71,873 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 4 | $72,078 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 5 | $69,513 | win |  |
| REFI TERM SHEETS | Payoff 7 yr › column 1 | $96,228 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 2 | $95,744 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 3 | $96,694 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 4 | $95,502 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 5 | $92,937 | win |  |
| REFI TERM SHEETS | Payoff 10 yr › column 1 | $131,176 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 2 | $129,998 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 3 | $132,340 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 4 | $129,061 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 5 | $126,496 | win |  |
| REFI TERM SHEETS | Payoff 15 yr › column 1 | $184,050 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 2 | $181,747 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 3 | $186,343 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 4 | $179,691 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 5 | $177,126 | win |  |
| REFI TERM SHEETS | Payoff 20 yr › column 1 | $227,753 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 2 | $224,434 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 3 | $231,069 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 4 | $221,369 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 5 | $218,804 | win |  |
| MAO | Maximum Allowable Offer | $178,420 | bad |  |
| MAO | 70% Rule | ARV × 70% − rehab | $178,420 |  | click |
| MAO | Money in deal ≤ $65k | money in deal = target | $230,747 |  | click |
| MAO | Equity post-Refi ≥ 20% | money in deal ≤ post-Refi equity ÷ (1 + 20%) | $205,911 |  | click |
| MAO | Binding constraint | 70% Rule | $178,420 |  |  |
| MAO | Your offer | $51,580 ABOVE MAO | $230,000 | bad |  |
| B&H Deal Score Breakdown | Total | 5.0 / 10 |  | click |
| B&H Deal Score Breakdown | Cash-on-Cash | 6.1% | warn | click |
| B&H Deal Score Breakdown | Cash-on-Cash · target/weight | target ≥10% weight 33% |  |  |
| B&H Deal Score Breakdown | Equity % | -37.0% | bad | click |
| B&H Deal Score Breakdown | Equity % · target/weight | target ≥20% weight 33% |  |  |
| B&H Deal Score Breakdown | Location | 9/10 | good | click |
| B&H Deal Score Breakdown | Location · target/weight | target ≥7 weight 33% |  |  |
| ADVANCED METRICS · BUY & HOLD | CAP RATE | 8.3% | good | click |
| ADVANCED METRICS · BUY & HOLD | GRM | 7.9× | good | click |
| ADVANCED METRICS · BUY & HOLD | ROE | 9.8% | good | click |
| ADVANCED METRICS · BUY & HOLD | ANNUAL CF (W/ CAPEX) | $4,490 | neutral | click |
| ADVANCED METRICS · BUY & HOLD | VALUE (PURCHASE PRICE) | $230,000 | neutral | click |
| ADVANCED METRICS · BUY & HOLD | LOAN (80%) | $184,000 | neutral | click |
| ADVANCED METRICS · BUY & HOLD | 5-YEAR IRR · 2% appreciation | 3.0% | bad | click |
| ADVANCED METRICS · BUY & HOLD | 5-YEAR IRR · 3% appreciation | 6.2% | bad | click |
| ADVANCED METRICS · BUY & HOLD | 5-YEAR IRR · 4% appreciation | 9.0% | warn | click |
| ADVANCED METRICS · BUY & HOLD | EQUITY AT PURCHASE $ | $46,000 |  | click |
| ADVANCED METRICS · BUY & HOLD | EQUITY AT PURCHASE % | -37.0% |  |  |
| ADVANCED METRICS · BUY & HOLD | EQUITY AT PURCHASE · note | On purchase price: value − B&H loan |  |  |

### Buy & Hold (Property value: Purchase price) — unsaved toggle — toggles flipped (CoC → w/o CapEx, Equity → $, Annual CF → no capex, Equity post-Refi → Liquidation): pairs that change

| Section | Label | Value | Status | Formula |
|---|---|---|---|---|
| Summary | CASH-ON-CASH (W/O CAPEX) | 12.1% | good | click |
| Summary | EQUITY $ | $46,000 | bad | click |
| ADVANCED METRICS · BUY & HOLD | ANNUAL CF (NO CAPEX) | $8,871 | neutral | click |

### Flip · Cash — default view (all collapsibles open)

| Section | Label | Value | Status | Formula |
|---|---|---|---|---|
| Header | Address | 1805 Cedar Wood, Anna TX, 75409 |  |  |
| Header | Facts | SFR · 1,621 sqft · built 2013 · via BSJ |  |  |
| Top | CASHFLOW | $228/mo | good | modal: Monthly cashflow |
| Top | CASHFLOW · sub | w/o CapEx: $593/mo |  |  |
| Top | COC | 4.3% | bad | modal: Cash-on-Cash ROI |
| Top | COC · sub | w/o CapEx: 11.1% |  |  |
| Top | DSCR | 1.37 | good | modal: DSCR (Debt Service Coverage Ratio) |
| Top | DSCR · sub | lender ratio: 5.43 |  |  |
| Top | EQUITY | 7.1% | bad | modal: Book equity post-Refi |
| Top | EQUITY · sub | $68,750 |  |  |
| Top | MONEY IN DEAL | $64,216 | warn | modal: Money in deal |
| Top | MONEY IN DEAL · sub | target ≤ $65k |  |  |
| Top | MAO | $178,420 | bad | modal: Maximum Allowable Offer |
| Top | MAO · sub | $51,580 over · 70% Rule |  |  |
| Top | DEAL SCORE | 3.0 /10 | bad |  |
| Top | Verdict | NO-GO | bad |  |
| Top | Weakest | WEAKEST: Cash-on-Cash 4.3% Equity % 7.1% |  |  |
| Tabs | BRRRR | $228/mo |  |  |
| Tabs | Buy & Hold | $374/mo |  |  |
| Tabs | Flip · Cash | -$7,357 profit |  |  |
| Tabs | Flip · HML | -$10,895 profit |  |  |
| Summary | NET PROFIT | -$7,357 | bad |  |
| Summary | NET PROFIT · sub | After 6 mo hold + selling costs |  |  |
| Summary | ROI | -2.8% | bad |  |
| Summary | ANNUALIZED | -5.7% | bad |  |
| Summary | CASH IN | $260,357 | neutral |  |
| Summary | ARV | $275,000 | neutral |  |
| CASH DEPLOYED | Purchase + rehab + closing | $244,080 |  |  |
| CASH DEPLOYED | Holding carry (6 mo, full opex) | $5,107 |  |  |
| CASH DEPLOYED | Total cash in | $260,357 |  |  |
| SALE | ARV / sale price | $275,000 |  |  |
| SALE | Selling costs (8%) | −$22,000 |  |  |
| SALE | Gross proceeds | $253,000 |  |  |
| SALE | Net profit | -$7,357 | bad |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › TOTAL CASH IN | $94,265 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › MONEY IN DEAL | $64,216 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › CASHFLOW /MO | $228 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › COC | 4.3% | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › DSCR | 1.37 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › SCORE | 3.0 | selected |  |
| HML TERM SHEETS | #2 Marshall Reddick › TOTAL CASH IN | $94,265 |  |  |
| HML TERM SHEETS | #2 Marshall Reddick › MONEY IN DEAL | $64,216 |  |  |
| HML TERM SHEETS | #2 Marshall Reddick › CASHFLOW /MO | $228 |  |  |
| HML TERM SHEETS | #2 Marshall Reddick › COC | 4.3% |  |  |
| HML TERM SHEETS | #2 Marshall Reddick › DSCR | 1.37 |  |  |
| HML TERM SHEETS | #2 Marshall Reddick › SCORE | 3.0 |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › TOTAL CASH IN | $94,265 |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › MONEY IN DEAL | $64,401 |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › CASHFLOW /MO | $193 |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › COC | 3.6% |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › DSCR | 1.35 |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › SCORE | 3.0 |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › TOTAL CASH IN | $94,265 |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › MONEY IN DEAL | $65,680 |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › CASHFLOW /MO | $211 |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › COC | 3.8% |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › DSCR | 1.36 |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › SCORE | 3.0 |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › TOTAL CASH IN | $94,265 |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › MONEY IN DEAL | $63,101 |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › CASHFLOW /MO | $176 |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › COC | 3.3% |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › DSCR | 1.34 |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › SCORE | 3.0 |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › TOTAL CASH IN | $94,265 |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › MONEY IN DEAL | $67,226 |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › CASHFLOW /MO | $228 |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › COC | 4.1% |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › DSCR | 1.37 |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › SCORE | 3.0 |  |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › TOTAL CASH IN | $94,265 | selected |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › MONEY IN DEAL | $64,216 | selected |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › CASHFLOW /MO | $228 | selected |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › COC | 4.3% | selected |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › DSCR | 1.37 | selected |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › SCORE | 3.0 | selected |  |
| REFI TERM SHEETS | Payoff title | PAYOFF HORIZON — TOTAL LOAN COST IF PAID OFF AT… |  |  |
| REFI TERM SHEETS | Payoff column 1 | ALEX YUDIN RON 2 $1,389.54/mo P&I |  |  |
| REFI TERM SHEETS | Payoff column 2 | ALEX YUDIN RON 3 $1,372.19/mo P&I |  |  |
| REFI TERM SHEETS | Payoff column 3 | ALEX YUDIN RON 1 $1,406.99/mo P&I |  |  |
| REFI TERM SHEETS | Payoff column 4 | ALEX YUDIN RON 4 $1,354.92/mo P&I |  |  |
| REFI TERM SHEETS | Payoff column 5 | ALEX YUDIN LOCAL NOTARY · SELECTED $1,354.92/mo P&I |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 1 | $57,841 incl. $5,990 PPP |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 2 | $58,338 incl. $5,985 PPP |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 3 | $57,323 incl. $5,994 PPP |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 4 | $59,103 incl. $5,980 PPP |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 5 | $56,093 incl. $5,980 PPP | win |  |
| REFI TERM SHEETS | Payoff 5 yr › column 1 | $79,952 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 2 | $79,932 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 3 | $79,952 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 4 | $80,181 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 5 | $77,171 | win |  |
| REFI TERM SHEETS | Payoff 7 yr › column 1 | $107,252 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 2 | $106,710 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 3 | $107,774 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 4 | $106,438 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 5 | $103,428 | win |  |
| REFI TERM SHEETS | Payoff 10 yr › column 1 | $146,426 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 2 | $145,105 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 3 | $147,730 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 4 | $144,056 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 5 | $141,046 | win |  |
| REFI TERM SHEETS | Payoff 15 yr › column 1 | $205,694 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 2 | $203,112 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 3 | $208,264 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 4 | $200,808 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 5 | $197,798 | win |  |
| REFI TERM SHEETS | Payoff 20 yr › column 1 | $254,682 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 2 | $250,961 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 3 | $258,398 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 4 | $247,525 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 5 | $244,515 | win |  |
| MAO | Maximum Allowable Offer | $178,420 | bad |  |
| MAO | 70% Rule | ARV × 70% − rehab | $178,420 |  | click |
| MAO | Money in deal ≤ $65k | money in deal = target | $230,747 |  | click |
| MAO | Equity post-Refi ≥ 20% | money in deal ≤ post-Refi equity ÷ (1 + 20%) | $205,911 |  | click |
| MAO | Binding constraint | 70% Rule | $178,420 |  |  |
| MAO | Your offer | $51,580 ABOVE MAO | $230,000 | bad |  |
| Deal Score Breakdown | Total | 3.0 / 10 |  |  |
| Deal Score Breakdown | Cash-on-Cash | 4.3% | bad | click |
| Deal Score Breakdown | Cash-on-Cash · target/weight | target ≥10% weight 33% |  |  |
| Deal Score Breakdown | Equity % | 7.1% | bad | click |
| Deal Score Breakdown | Equity % · target/weight | target ≥20% weight 33% |  |  |
| Deal Score Breakdown | Location | 9/10 | good | click |
| Deal Score Breakdown | Location · target/weight | target ≥7 weight 33% |  |  |

### Flip · Cash — toggles flipped (CoC → w/o CapEx, Equity → $, Annual CF → no capex, Equity post-Refi → Liquidation): pairs that change

_No view toggles on this tab — nothing changes._

### Flip · HML — default view (all collapsibles open)

| Section | Label | Value | Status | Formula |
|---|---|---|---|---|
| Header | Address | 1805 Cedar Wood, Anna TX, 75409 |  |  |
| Header | Facts | SFR · 1,621 sqft · built 2013 · via BSJ |  |  |
| Top | CASHFLOW | $228/mo | good | modal: Monthly cashflow |
| Top | CASHFLOW · sub | w/o CapEx: $593/mo |  |  |
| Top | COC | 4.3% | bad | modal: Cash-on-Cash ROI |
| Top | COC · sub | w/o CapEx: 11.1% |  |  |
| Top | DSCR | 1.37 | good | modal: DSCR (Debt Service Coverage Ratio) |
| Top | DSCR · sub | lender ratio: 5.43 |  |  |
| Top | EQUITY | 7.1% | bad | modal: Book equity post-Refi |
| Top | EQUITY · sub | $68,750 |  |  |
| Top | MONEY IN DEAL | $64,216 | warn | modal: Money in deal |
| Top | MONEY IN DEAL · sub | target ≤ $65k |  |  |
| Top | MAO | $178,420 | bad | modal: Maximum Allowable Offer |
| Top | MAO · sub | $51,580 over · 70% Rule |  |  |
| Top | DEAL SCORE | 3.0 /10 | bad |  |
| Top | Verdict | NO-GO | bad |  |
| Top | Weakest | WEAKEST: Cash-on-Cash 4.3% Equity % 7.1% |  |  |
| Tabs | BRRRR | $228/mo |  |  |
| Tabs | Buy & Hold | $374/mo |  |  |
| Tabs | Flip · Cash | -$7,357 profit |  |  |
| Tabs | Flip · HML | -$10,895 profit |  |  |
| Summary | NET PROFIT | -$10,895 | bad |  |
| Summary | NET PROFIT · sub | Leveraged with hard money |  |  |
| Summary | ROI ON CASH | -10.5% | bad |  |
| Summary | ANNUALIZED | -125.8% | bad |  |
| Summary | CASH IN | $103,895 | neutral |  |
| Summary | HML PAYOFF | $160,000 | neutral |  |
| CASH DEPLOYED | Acquisition gap + closing + points | $101,717 |  |  |
| CASH DEPLOYED | Holding (HML interest + full opex, 1 mo) | $2,178 |  |  |
| CASH DEPLOYED | Total cash in | $103,895 |  |  |
| SALE | ARV / sale price | $275,000 |  |  |
| SALE | Selling costs (8%) | −$22,000 |  |  |
| SALE | HML payoff | −$160,000 |  |  |
| SALE | Net to investor | $93,001 |  |  |
| SALE | Net profit | -$10,895 | bad |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › TOTAL CASH IN | $103,895 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › NET PROFIT | -$10,895 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › ROI | -10.5% | selected |  |
| HML TERM SHEETS | #2 Marshall Reddick › TOTAL CASH IN | $103,895 |  |  |
| HML TERM SHEETS | #2 Marshall Reddick › NET PROFIT | -$10,895 |  |  |
| HML TERM SHEETS | #2 Marshall Reddick › ROI | -10.5% |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › TOTAL CASH IN | $94,265 |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › MONEY IN DEAL | $64,401 |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › CASHFLOW /MO | $193 |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › COC | 3.6% |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › DSCR | 1.35 |  |  |
| REFI TERM SHEETS | #1 Alex Yudin RON 2 › SCORE | 3.0 |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › TOTAL CASH IN | $94,265 |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › MONEY IN DEAL | $65,680 |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › CASHFLOW /MO | $211 |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › COC | 3.8% |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › DSCR | 1.36 |  |  |
| REFI TERM SHEETS | #2 Alex Yudin RON 3 › SCORE | 3.0 |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › TOTAL CASH IN | $94,265 |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › MONEY IN DEAL | $63,101 |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › CASHFLOW /MO | $176 |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › COC | 3.3% |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › DSCR | 1.34 |  |  |
| REFI TERM SHEETS | #3 Alex Yudin RON 1 › SCORE | 3.0 |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › TOTAL CASH IN | $94,265 |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › MONEY IN DEAL | $67,226 |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › CASHFLOW /MO | $228 |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › COC | 4.1% |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › DSCR | 1.37 |  |  |
| REFI TERM SHEETS | #4 Alex Yudin RON 4 › SCORE | 3.0 |  |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › TOTAL CASH IN | $94,265 | selected |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › MONEY IN DEAL | $64,216 | selected |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › CASHFLOW /MO | $228 | selected |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › COC | 4.3% | selected |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › DSCR | 1.37 | selected |  |
| REFI TERM SHEETS | #5 Alex Yudin Local Notary SELECTED › SCORE | 3.0 | selected |  |
| REFI TERM SHEETS | Payoff title | PAYOFF HORIZON — TOTAL LOAN COST IF PAID OFF AT… |  |  |
| REFI TERM SHEETS | Payoff column 1 | ALEX YUDIN RON 2 $1,389.54/mo P&I |  |  |
| REFI TERM SHEETS | Payoff column 2 | ALEX YUDIN RON 3 $1,372.19/mo P&I |  |  |
| REFI TERM SHEETS | Payoff column 3 | ALEX YUDIN RON 1 $1,406.99/mo P&I |  |  |
| REFI TERM SHEETS | Payoff column 4 | ALEX YUDIN RON 4 $1,354.92/mo P&I |  |  |
| REFI TERM SHEETS | Payoff column 5 | ALEX YUDIN LOCAL NOTARY · SELECTED $1,354.92/mo P&I |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 1 | $57,841 incl. $5,990 PPP |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 2 | $58,338 incl. $5,985 PPP |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 3 | $57,323 incl. $5,994 PPP |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 4 | $59,103 incl. $5,980 PPP |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 5 | $56,093 incl. $5,980 PPP | win |  |
| REFI TERM SHEETS | Payoff 5 yr › column 1 | $79,952 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 2 | $79,932 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 3 | $79,952 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 4 | $80,181 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 5 | $77,171 | win |  |
| REFI TERM SHEETS | Payoff 7 yr › column 1 | $107,252 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 2 | $106,710 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 3 | $107,774 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 4 | $106,438 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 5 | $103,428 | win |  |
| REFI TERM SHEETS | Payoff 10 yr › column 1 | $146,426 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 2 | $145,105 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 3 | $147,730 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 4 | $144,056 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 5 | $141,046 | win |  |
| REFI TERM SHEETS | Payoff 15 yr › column 1 | $205,694 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 2 | $203,112 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 3 | $208,264 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 4 | $200,808 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 5 | $197,798 | win |  |
| REFI TERM SHEETS | Payoff 20 yr › column 1 | $254,682 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 2 | $250,961 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 3 | $258,398 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 4 | $247,525 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 5 | $244,515 | win |  |
| MAO | Maximum Allowable Offer | $178,420 | bad |  |
| MAO | 70% Rule | ARV × 70% − rehab | $178,420 |  | click |
| MAO | Money in deal ≤ $65k | money in deal = target | $230,747 |  | click |
| MAO | Equity post-Refi ≥ 20% | money in deal ≤ post-Refi equity ÷ (1 + 20%) | $205,911 |  | click |
| MAO | Binding constraint | 70% Rule | $178,420 |  |  |
| MAO | Your offer | $51,580 ABOVE MAO | $230,000 | bad |  |
| Deal Score Breakdown | Total | 3.0 / 10 |  |  |
| Deal Score Breakdown | Cash-on-Cash | 4.3% | bad | click |
| Deal Score Breakdown | Cash-on-Cash · target/weight | target ≥10% weight 33% |  |  |
| Deal Score Breakdown | Equity % | 7.1% | bad | click |
| Deal Score Breakdown | Equity % · target/weight | target ≥20% weight 33% |  |  |
| Deal Score Breakdown | Location | 9/10 | good | click |
| Deal Score Breakdown | Location · target/weight | target ≥7 weight 33% |  |  |

### Flip · HML — toggles flipped (CoC → w/o CapEx, Equity → $, Annual CF → no capex, Equity post-Refi → Liquidation): pairs that change

_No view toggles on this tab — nothing changes._

---

## 211 Fisherman Trl, Melissa TX (Buy & Hold)

### BRRRR — default view (all collapsibles open)

| Section | Label | Value | Status | Formula |
|---|---|---|---|---|
| Header | Address | 211 Fisherman Trl, Melissa, TX 75454 |  |  |
| Header | Facts | SFR · 2,348 sqft · built 2006 · via BSJ |  |  |
| Top | CASHFLOW | -$30/mo | bad | modal: Monthly cashflow |
| Top | CASHFLOW · sub | w/o CapEx: $397/mo |  |  |
| Top | COC | -0.6% | bad | modal: Cash-on-Cash ROI |
| Top | COC · sub | w/o CapEx: 7.3% |  |  |
| Top | DSCR | 1.18 | warn | modal: DSCR (Debt Service Coverage Ratio) |
| Top | DSCR · sub | lender ratio: 3.79 |  |  |
| Top | EQUITY | -5.1% | bad | modal: Book equity post-Refi |
| Top | EQUITY · sub | $62,000 |  |  |
| Top | MONEY IN DEAL | $65,325 | bad | modal: Money in deal |
| Top | MONEY IN DEAL · sub | target ≤ $65k |  |  |
| Top | MAO | $202,075 | bad | modal: Maximum Allowable Offer |
| Top | MAO · sub | $80,225 over · 70% Rule |  |  |
| Top | DEAL SCORE | 3.3 /10 | bad |  |
| Top | Verdict | NO-GO | bad |  |
| Top | Weakest | WEAKEST: Cash-on-Cash -0.6% Equity % -5.1% |  |  |
| Tabs | BRRRR | -$30/mo |  |  |
| Tabs | Buy & Hold | $122/mo |  |  |
| Tabs | Flip · Cash | -$28,546 profit |  |  |
| Tabs | Flip · HML | -$29,239 profit |  |  |
| Summary | ANNUAL CASHFLOW | -$366 | bad |  |
| Summary | ANNUAL CASHFLOW · sub | -$30 / month after debt service |  |  |
| Summary | CASH-ON-CASH | -0.6% | bad |  |
| Summary | DSCR | 1.18 | warn |  |
| Summary | EQUITY % | -5.1% | bad |  |
| Summary | MONEY IN DEAL | $65,325 | bad |  |
| ACQUISITION | Purchase price | $282,300 |  | click |
| ACQUISITION | Rehab Estimate (Funded) | $13,568 |  | click |
| ACQUISITION | Change Orders (Not Funded) | $1,357 |  |  |
| ACQUISITION | Additional rehab costs | $0 |  |  |
| ACQUISITION | Closing costs | $0 |  | click |
| ACQUISITION | One-time costs | $9,445 |  |  |
| ACQUISITION | Holding costs | $1,052 |  | click |
| ACQUISITION | Project cost adjustments | −$10,228 |  |  |
| ACQUISITION | Total project cost | $297,494 |  | click |
| MONTHLY OPERATING | Gross rent | $2,850 |  | click |
| MONTHLY OPERATING | ▾ Expense breakdown | (collapsible) |  |  |
| MONTHLY OPERATING | Property Tax | −$537 |  |  |
| MONTHLY OPERATING | Insurance | −$182 |  |  |
| MONTHLY OPERATING | HOA | −$33 |  |  |
| MONTHLY OPERATING | State income tax | −$0 |  |  |
| MONTHLY OPERATING | Property management | −$0 |  |  |
| MONTHLY OPERATING | Capex / vacancy | −$428 |  |  |
| MONTHLY OPERATING | Additional Monthly Costs | −$0 |  |  |
| MONTHLY OPERATING | Mortgage P&I | −$1,701 |  | click |
| MONTHLY OPERATING | Total Operating expenses (Include PITI) / w/o Capex | −$2,880 / −$2,453 |  | click |
| MONTHLY OPERATING | NOI / w/o Capex | -$30 / $397 |  | click |
| MONTHLY OPERATING | Monthly cashflow / w/o Capex | -$30 / $397 | bad | click |
| MONTHLY OPERATING | ▾ Interest-only scenario | (collapsible) |  |  |
| MONTHLY OPERATING | Interest only mortgage monthly | −$1,628 |  |  |
| MONTHLY OPERATING | Total Operating expenses (Include ITI) / w/o Capex | −$2,807 / −$2,379 |  |  |
| MONTHLY OPERATING | Monthly cashflow Interest-only / w/o Capex | $43 / $471 | bad |  |
| HARD MONEY LOAN | HML principal (70.0% LTC) | $197,610 |  | click |
| HARD MONEY LOAN | Points (2%) | $3,952 |  |  |
| HARD MONEY LOAN | Monthly interest | $1,647 |  | click |
| HARD MONEY LOAN | Interest carry (1 mo) | $1,647 |  | click |
| HARD MONEY LOAN | Total HML cost (fees) | $4,943 |  | click |
| HARD MONEY LOAN | Total debt to HML | $199,257 |  |  |
| HARD MONEY LOAN | Monthly cashflow — HML phase / w/o Capex | $24 / $451 | bad | click |
| REFINANCE | New loan (80% LTV) | $248,000 |  | click |
| REFINANCE | Refi closing + points | $9,241 |  | click |
| REFINANCE | Cash returned at refi | $39,502 |  | click |
| REFINANCE | Money in deal | $65,325 | bad | click |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › TOTAL CASH IN | $104,827 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › MONEY IN DEAL | $65,325 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › CASHFLOW /MO | -$30 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › COC | -0.6% | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › DSCR | 1.18 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › SCORE | 3.3 | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › TOTAL CASH IN | $104,827 | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › MONEY IN DEAL | $65,325 | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › CASHFLOW /MO | -$30 | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › COC | -0.6% | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › DSCR | 1.18 | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › SCORE | 3.3 | selected |  |
| REFI TERM SHEETS | Payoff title | PAYOFF HORIZON — TOTAL LOAN COST IF PAID OFF AT… |  |  |
| REFI TERM SHEETS | Payoff column 1 | JOHN · SELECTED $1,701.15/mo P&I |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 1 | $67,503 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 1 | $105,916 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 1 | $143,919 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 1 | $199,998 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 1 | $290,242 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 1 | $374,803 |  |  |
| MAO | Maximum Allowable Offer | $202,075 | bad |  |
| MAO | 70% Rule | ARV × 70% − rehab | $202,075 |  | click |
| MAO | Money in deal ≤ $65k | money in deal = target | $281,982 |  | click |
| MAO | Equity post-Refi ≥ 20% | money in deal ≤ post-Refi equity ÷ (1 + 20%) | $248,643 |  | click |
| MAO | Binding constraint | 70% Rule | $202,075 |  |  |
| MAO | Your offer | $80,225 ABOVE MAO | $282,300 | bad |  |
| Deal Score Breakdown | Total | 3.3 / 10 |  |  |
| Deal Score Breakdown | Cash-on-Cash | -0.6% | bad | click |
| Deal Score Breakdown | Cash-on-Cash · target/weight | target ≥10% weight 33% |  |  |
| Deal Score Breakdown | Equity % | -5.1% | bad | click |
| Deal Score Breakdown | Equity % · target/weight | target ≥20% weight 33% |  |  |
| Deal Score Breakdown | Location | 10/10 | good | click |
| Deal Score Breakdown | Location · target/weight | target ≥7 weight 33% |  |  |
| ADVANCED METRICS | CAP RATE | 6.5% | warn | click |
| ADVANCED METRICS | GRM | 9.1× | warn | click |
| ADVANCED METRICS | FORCED EQUITY ROI | 4.2% | bad | click |
| ADVANCED METRICS | ANNUAL CF (W/ CAPEX) | -$366 | neutral | click |
| ADVANCED METRICS | ROE | -0.6% | bad | click |
| ADVANCED METRICS | MARGIN/ARV | 4.0% | bad | click |
| ADVANCED METRICS | 5-YEAR IRR · 2% appreciation | 1.5% | bad | click |
| ADVANCED METRICS | 5-YEAR IRR · 3% appreciation | 5.6% | bad | click |
| ADVANCED METRICS | 5-YEAR IRR · 4% appreciation | 9.3% | warn | click |
| ADVANCED METRICS | EQUITY POST-REFI (Book) $ | $62,000 |  | click |
| ADVANCED METRICS | EQUITY POST-REFI (Book) % | -5.1% |  |  |

### BRRRR — toggles flipped (CoC → w/o CapEx, Equity → $, Annual CF → no capex, Equity post-Refi → Liquidation): pairs that change

| Section | Label | Value | Status | Formula |
|---|---|---|---|---|
| Summary | CASH-ON-CASH (W/O CAPEX) | 7.3% | warn |  |
| Summary | EQUITY $ | $62,000 | bad |  |
| ADVANCED METRICS | ANNUAL CF (NO CAPEX) | $4,764 | neutral | click |
| ADVANCED METRICS | EQUITY POST-REFI (Liquidation) $ | $37,200 |  | click |
| ADVANCED METRICS | EQUITY POST-REFI (Liquidation) % | 12.0% |  |  |
| ADVANCED METRICS | EQUITY POST-REFI (Liquidation) · note | After 8% selling costs |  |  |

### Buy & Hold (Property value: ARV) — default view (all collapsibles open)

| Section | Label | Value | Status | Formula |
|---|---|---|---|---|
| Header | Address | 211 Fisherman Trl, Melissa, TX 75454 |  |  |
| Header | Facts | SFR · 2,348 sqft · built 2006 · via BSJ |  |  |
| Top | CASHFLOW | $122/mo | warn | modal: B&H monthly cashflow |
| Top | CASHFLOW · sub | w/o CapEx: $549/mo |  |  |
| Top | COC | 1.8% | bad | modal: B&H Cash-on-Cash |
| Top | COC · sub | w/o CapEx: 8.0% |  |  |
| Top | DSCR | 1.26 | good | modal: B&H DSCR |
| Top | DSCR · sub | lender ratio: 3.79 |  |  |
| Top | EQUITY | 2.1% | bad | modal: B&H equity |
| Top | EQUITY · sub | $84,160 |  |  |
| Top | CASH IN | $82,444 | bad | modal: B&H Cash In |
| Top | CASH IN · sub | target ≤ $65k |  |  |
| Top | MAO | $202,075 | bad | modal: Maximum Allowable Offer |
| Top | MAO · sub | $80,225 over · 70% Rule |  |  |
| Top | B&H DEAL SCORE | 3.3 /10 | bad |  |
| Top | Verdict | NO-GO | bad |  |
| Top | Weakest | WEAKEST: Cash-on-Cash 1.8% Equity % 2.1% |  |  |
| Tabs | BRRRR | -$30/mo |  |  |
| Tabs | Buy & Hold | $122/mo |  |  |
| Tabs | Flip · Cash | -$28,546 profit |  |  |
| Tabs | Flip · HML | -$29,239 profit |  |  |
| Property value | ARV | $310,000 |  | click |
| Summary | ANNUAL CASHFLOW | $1,458 | warn | click |
| Summary | ANNUAL CASHFLOW · sub | $122 / month after the B&H mortgage |  |  |
| Summary | CASH-ON-CASH | 1.8% | bad | click |
| Summary | DSCR | 1.26 | good | click |
| Summary | EQUITY % | 2.1% | bad | click |
| Summary | CASH IN | $82,444 | bad | click |
| PURCHASE & CASH IN | Purchase price | $282,300 |  | click |
| PURCHASE & CASH IN | Down payment | $56,460 |  | click |
| PURCHASE & CASH IN | Loan (80% of price) | $225,840 |  | click |
| PURCHASE & CASH IN | Loan costs (points + fees + title/escrow) | $9,241 |  | click |
| PURCHASE & CASH IN | Closing costs | $0 |  | click |
| PURCHASE & CASH IN | Rehab (all cash) | $14,925 |  | click |
| PURCHASE & CASH IN | One-time costs | $9,445 |  | click |
| PURCHASE & CASH IN | Holding costs (1 mo, incl. mortgage) | $2,601 |  | click |
| PURCHASE & CASH IN | Credits at close | −$10,228 |  | click |
| PURCHASE & CASH IN | Cash In | $82,444 | bad | click |
| MONTHLY OPERATING | Gross rent | $2,850 |  | click |
| MONTHLY OPERATING | ▾ Expense breakdown | (collapsible) |  |  |
| MONTHLY OPERATING | Property Tax | −$537 |  | click |
| MONTHLY OPERATING | Insurance | −$182 |  | click |
| MONTHLY OPERATING | HOA | −$33 |  | click |
| MONTHLY OPERATING | State income tax | −$0 |  | click |
| MONTHLY OPERATING | Property management | −$0 |  | click |
| MONTHLY OPERATING | Capex / vacancy | −$428 |  | click |
| MONTHLY OPERATING | Additional Monthly Costs | −$0 |  | click |
| MONTHLY OPERATING | Mortgage P&I | −$1,549 |  | click |
| MONTHLY OPERATING | Total Operating expenses (incl. P&I) / w/o Capex | −$2,728 / −$2,301 |  | click |
| MONTHLY OPERATING | NOI | $1,671 |  | click |
| MONTHLY OPERATING | Monthly cashflow / w/o Capex | $122 / $549 | warn | click |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › TOTAL CASH IN | $104,827 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › MONEY IN DEAL | $65,325 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › CASHFLOW /MO | -$30 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › COC | -0.6% | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › DSCR | 1.18 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › SCORE | 3.3 | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › CASH IN | $82,444 | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › CASHFLOW /MO | $122 | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › COC | 1.8% | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › DSCR | 1.26 | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › SCORE | 3.3 | selected |  |
| REFI TERM SHEETS | Payoff title | PAYOFF HORIZON — TOTAL LOAN COST IF PAID OFF AT… |  |  |
| REFI TERM SHEETS | Payoff column 1 | JOHN · SELECTED $1,549.15/mo P&I |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 1 | $62,297 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 1 | $97,278 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 1 | $131,885 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 1 | $182,953 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 1 | $265,133 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 1 | $342,138 |  |  |
| MAO | Maximum Allowable Offer | $202,075 | bad |  |
| MAO | 70% Rule | ARV × 70% − rehab | $202,075 |  | click |
| MAO | Money in deal ≤ $65k | money in deal = target | $281,982 |  | click |
| MAO | Equity post-Refi ≥ 20% | money in deal ≤ post-Refi equity ÷ (1 + 20%) | $248,643 |  | click |
| MAO | Binding constraint | 70% Rule | $202,075 |  |  |
| MAO | Your offer | $80,225 ABOVE MAO | $282,300 | bad |  |
| B&H Deal Score Breakdown | Total | 3.3 / 10 |  | click |
| B&H Deal Score Breakdown | Cash-on-Cash | 1.8% | bad | click |
| B&H Deal Score Breakdown | Cash-on-Cash · target/weight | target ≥10% weight 33% |  |  |
| B&H Deal Score Breakdown | Equity % | 2.1% | bad | click |
| B&H Deal Score Breakdown | Equity % · target/weight | target ≥20% weight 33% |  |  |
| B&H Deal Score Breakdown | Location | 10/10 | good | click |
| B&H Deal Score Breakdown | Location · target/weight | target ≥7 weight 33% |  |  |
| ADVANCED METRICS · BUY & HOLD | CAP RATE | 6.5% | warn | click |
| ADVANCED METRICS · BUY & HOLD | GRM | 9.1× | warn | click |
| ADVANCED METRICS · BUY & HOLD | ROE | 1.7% | bad | click |
| ADVANCED METRICS · BUY & HOLD | ANNUAL CF (W/ CAPEX) | $1,458 | neutral | click |
| ADVANCED METRICS · BUY & HOLD | VALUE (ARV) | $310,000 | neutral | click |
| ADVANCED METRICS · BUY & HOLD | LOAN (80%) | $225,840 | neutral | click |
| ADVANCED METRICS · BUY & HOLD | 5-YEAR IRR · 2% appreciation | 4.4% | bad | click |
| ADVANCED METRICS · BUY & HOLD | 5-YEAR IRR · 3% appreciation | 7.5% | bad | click |
| ADVANCED METRICS · BUY & HOLD | 5-YEAR IRR · 4% appreciation | 10.4% | warn | click |
| ADVANCED METRICS · BUY & HOLD | EQUITY AT PURCHASE $ | $84,160 |  | click |
| ADVANCED METRICS · BUY & HOLD | EQUITY AT PURCHASE % | 2.1% |  |  |
| ADVANCED METRICS · BUY & HOLD | EQUITY AT PURCHASE · note | On ARV: value − B&H loan |  |  |

### Buy & Hold (Property value: ARV) — toggles flipped (CoC → w/o CapEx, Equity → $, Annual CF → no capex, Equity post-Refi → Liquidation): pairs that change

| Section | Label | Value | Status | Formula |
|---|---|---|---|---|
| Summary | CASH-ON-CASH (W/O CAPEX) | 8.0% | warn | click |
| Summary | EQUITY $ | $84,160 | bad | click |
| ADVANCED METRICS · BUY & HOLD | ANNUAL CF (NO CAPEX) | $6,588 | neutral | click |

### Buy & Hold (Property value: Purchase price) — unsaved toggle — default view (all collapsibles open)

| Section | Label | Value | Status | Formula |
|---|---|---|---|---|
| Header | Address | 211 Fisherman Trl, Melissa, TX 75454 |  |  |
| Header | Facts | SFR · 2,348 sqft · built 2006 · via BSJ |  |  |
| Top | CASHFLOW | $122/mo | warn | modal: B&H monthly cashflow |
| Top | CASHFLOW · sub | w/o CapEx: $549/mo |  |  |
| Top | COC | 1.8% | bad | modal: B&H Cash-on-Cash |
| Top | COC · sub | w/o CapEx: 8.0% |  |  |
| Top | DSCR | 1.26 | good | modal: B&H DSCR |
| Top | DSCR · sub | lender ratio: 3.79 |  |  |
| Top | EQUITY | -31.5% | bad | modal: B&H equity |
| Top | EQUITY · sub | $56,460 |  |  |
| Top | CASH IN | $82,444 | bad | modal: B&H Cash In |
| Top | CASH IN · sub | target ≤ $65k |  |  |
| Top | MAO | $202,075 | bad | modal: Maximum Allowable Offer |
| Top | MAO · sub | $80,225 over · 70% Rule |  |  |
| Top | B&H DEAL SCORE | 3.3 /10 | bad |  |
| Top | Verdict | NO-GO | bad |  |
| Top | Weakest | WEAKEST: Cash-on-Cash 1.8% Equity % -31.5% |  |  |
| Tabs | BRRRR | -$30/mo |  |  |
| Tabs | Buy & Hold | $122/mo |  |  |
| Tabs | Flip · Cash | -$28,546 profit |  |  |
| Tabs | Flip · HML | -$29,239 profit |  |  |
| Property value | Purchase price | $282,300 |  | click |
| Summary | ANNUAL CASHFLOW | $1,458 | warn | click |
| Summary | ANNUAL CASHFLOW · sub | $122 / month after the B&H mortgage |  |  |
| Summary | CASH-ON-CASH | 1.8% | bad | click |
| Summary | DSCR | 1.26 | good | click |
| Summary | EQUITY % | -31.5% | bad | click |
| Summary | CASH IN | $82,444 | bad | click |
| PURCHASE & CASH IN | Purchase price | $282,300 |  | click |
| PURCHASE & CASH IN | Down payment | $56,460 |  | click |
| PURCHASE & CASH IN | Loan (80% of price) | $225,840 |  | click |
| PURCHASE & CASH IN | Loan costs (points + fees + title/escrow) | $9,241 |  | click |
| PURCHASE & CASH IN | Closing costs | $0 |  | click |
| PURCHASE & CASH IN | Rehab (all cash) | $14,925 |  | click |
| PURCHASE & CASH IN | One-time costs | $9,445 |  | click |
| PURCHASE & CASH IN | Holding costs (1 mo, incl. mortgage) | $2,601 |  | click |
| PURCHASE & CASH IN | Credits at close | −$10,228 |  | click |
| PURCHASE & CASH IN | Cash In | $82,444 | bad | click |
| MONTHLY OPERATING | Gross rent | $2,850 |  | click |
| MONTHLY OPERATING | ▾ Expense breakdown | (collapsible) |  |  |
| MONTHLY OPERATING | Property Tax | −$537 |  | click |
| MONTHLY OPERATING | Insurance | −$182 |  | click |
| MONTHLY OPERATING | HOA | −$33 |  | click |
| MONTHLY OPERATING | State income tax | −$0 |  | click |
| MONTHLY OPERATING | Property management | −$0 |  | click |
| MONTHLY OPERATING | Capex / vacancy | −$428 |  | click |
| MONTHLY OPERATING | Additional Monthly Costs | −$0 |  | click |
| MONTHLY OPERATING | Mortgage P&I | −$1,549 |  | click |
| MONTHLY OPERATING | Total Operating expenses (incl. P&I) / w/o Capex | −$2,728 / −$2,301 |  | click |
| MONTHLY OPERATING | NOI | $1,671 |  | click |
| MONTHLY OPERATING | Monthly cashflow / w/o Capex | $122 / $549 | warn | click |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › TOTAL CASH IN | $104,827 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › MONEY IN DEAL | $65,325 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › CASHFLOW /MO | -$30 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › COC | -0.6% | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › DSCR | 1.18 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › SCORE | 3.3 | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › CASH IN | $82,444 | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › CASHFLOW /MO | $122 | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › COC | 1.8% | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › DSCR | 1.26 | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › SCORE | 3.3 | selected |  |
| REFI TERM SHEETS | Payoff title | PAYOFF HORIZON — TOTAL LOAN COST IF PAID OFF AT… |  |  |
| REFI TERM SHEETS | Payoff column 1 | JOHN · SELECTED $1,549.15/mo P&I |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 1 | $62,297 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 1 | $97,278 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 1 | $131,885 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 1 | $182,953 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 1 | $265,133 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 1 | $342,138 |  |  |
| MAO | Maximum Allowable Offer | $202,075 | bad |  |
| MAO | 70% Rule | ARV × 70% − rehab | $202,075 |  | click |
| MAO | Money in deal ≤ $65k | money in deal = target | $281,982 |  | click |
| MAO | Equity post-Refi ≥ 20% | money in deal ≤ post-Refi equity ÷ (1 + 20%) | $248,643 |  | click |
| MAO | Binding constraint | 70% Rule | $202,075 |  |  |
| MAO | Your offer | $80,225 ABOVE MAO | $282,300 | bad |  |
| B&H Deal Score Breakdown | Total | 3.3 / 10 |  | click |
| B&H Deal Score Breakdown | Cash-on-Cash | 1.8% | bad | click |
| B&H Deal Score Breakdown | Cash-on-Cash · target/weight | target ≥10% weight 33% |  |  |
| B&H Deal Score Breakdown | Equity % | -31.5% | bad | click |
| B&H Deal Score Breakdown | Equity % · target/weight | target ≥20% weight 33% |  |  |
| B&H Deal Score Breakdown | Location | 10/10 | good | click |
| B&H Deal Score Breakdown | Location · target/weight | target ≥7 weight 33% |  |  |
| ADVANCED METRICS · BUY & HOLD | CAP RATE | 7.1% | good | click |
| ADVANCED METRICS · BUY & HOLD | GRM | 8.3× | warn | click |
| ADVANCED METRICS · BUY & HOLD | ROE | 2.6% | bad | click |
| ADVANCED METRICS · BUY & HOLD | ANNUAL CF (W/ CAPEX) | $1,458 | neutral | click |
| ADVANCED METRICS · BUY & HOLD | VALUE (PURCHASE PRICE) | $282,300 | neutral | click |
| ADVANCED METRICS · BUY & HOLD | LOAN (80%) | $225,840 | neutral | click |
| ADVANCED METRICS · BUY & HOLD | 5-YEAR IRR · 2% appreciation | -2.5% | bad | click |
| ADVANCED METRICS · BUY & HOLD | 5-YEAR IRR · 3% appreciation | 1.2% | bad | click |
| ADVANCED METRICS · BUY & HOLD | 5-YEAR IRR · 4% appreciation | 4.6% | bad | click |
| ADVANCED METRICS · BUY & HOLD | EQUITY AT PURCHASE $ | $56,460 |  | click |
| ADVANCED METRICS · BUY & HOLD | EQUITY AT PURCHASE % | -31.5% |  |  |
| ADVANCED METRICS · BUY & HOLD | EQUITY AT PURCHASE · note | On purchase price: value − B&H loan |  |  |

### Buy & Hold (Property value: Purchase price) — unsaved toggle — toggles flipped (CoC → w/o CapEx, Equity → $, Annual CF → no capex, Equity post-Refi → Liquidation): pairs that change

| Section | Label | Value | Status | Formula |
|---|---|---|---|---|
| Summary | CASH-ON-CASH (W/O CAPEX) | 8.0% | warn | click |
| Summary | EQUITY $ | $56,460 | bad | click |
| ADVANCED METRICS · BUY & HOLD | ANNUAL CF (NO CAPEX) | $6,588 | neutral | click |

### Flip · Cash — default view (all collapsibles open)

| Section | Label | Value | Status | Formula |
|---|---|---|---|---|
| Header | Address | 211 Fisherman Trl, Melissa, TX 75454 |  |  |
| Header | Facts | SFR · 2,348 sqft · built 2006 · via BSJ |  |  |
| Top | CASHFLOW | -$30/mo | bad | modal: Monthly cashflow |
| Top | CASHFLOW · sub | w/o CapEx: $397/mo |  |  |
| Top | COC | -0.6% | bad | modal: Cash-on-Cash ROI |
| Top | COC · sub | w/o CapEx: 7.3% |  |  |
| Top | DSCR | 1.18 | warn | modal: DSCR (Debt Service Coverage Ratio) |
| Top | DSCR · sub | lender ratio: 3.79 |  |  |
| Top | EQUITY | -5.1% | bad | modal: Book equity post-Refi |
| Top | EQUITY · sub | $62,000 |  |  |
| Top | MONEY IN DEAL | $65,325 | bad | modal: Money in deal |
| Top | MONEY IN DEAL · sub | target ≤ $65k |  |  |
| Top | MAO | $202,075 | bad | modal: Maximum Allowable Offer |
| Top | MAO · sub | $80,225 over · 70% Rule |  |  |
| Top | DEAL SCORE | 3.3 /10 | bad |  |
| Top | Verdict | NO-GO | bad |  |
| Top | Weakest | WEAKEST: Cash-on-Cash -0.6% Equity % -5.1% |  |  |
| Tabs | BRRRR | -$30/mo |  |  |
| Tabs | Buy & Hold | $122/mo |  |  |
| Tabs | Flip · Cash | -$28,546 profit |  |  |
| Tabs | Flip · HML | -$29,239 profit |  |  |
| Summary | NET PROFIT | -$28,546 | bad |  |
| Summary | NET PROFIT · sub | After 6 mo hold + selling costs |  |  |
| Summary | ROI | -9.1% | bad |  |
| Summary | ANNUALIZED | -18.2% | bad |  |
| Summary | CASH IN | $313,746 | neutral |  |
| Summary | ARV | $310,000 | neutral |  |
| CASH DEPLOYED | Purchase + rehab + closing | $297,225 |  |  |
| CASH DEPLOYED | Holding carry (6 mo, full opex) | $7,076 |  |  |
| CASH DEPLOYED | Total cash in | $313,746 |  |  |
| SALE | ARV / sale price | $310,000 |  |  |
| SALE | Selling costs (8%) | −$24,800 |  |  |
| SALE | Gross proceeds | $285,200 |  |  |
| SALE | Net profit | -$28,546 | bad |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › TOTAL CASH IN | $104,827 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › MONEY IN DEAL | $65,325 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › CASHFLOW /MO | -$30 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › COC | -0.6% | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › DSCR | 1.18 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › SCORE | 3.3 | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › TOTAL CASH IN | $104,827 | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › MONEY IN DEAL | $65,325 | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › CASHFLOW /MO | -$30 | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › COC | -0.6% | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › DSCR | 1.18 | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › SCORE | 3.3 | selected |  |
| REFI TERM SHEETS | Payoff title | PAYOFF HORIZON — TOTAL LOAN COST IF PAID OFF AT… |  |  |
| REFI TERM SHEETS | Payoff column 1 | JOHN · SELECTED $1,701.15/mo P&I |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 1 | $67,503 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 1 | $105,916 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 1 | $143,919 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 1 | $199,998 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 1 | $290,242 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 1 | $374,803 |  |  |
| MAO | Maximum Allowable Offer | $202,075 | bad |  |
| MAO | 70% Rule | ARV × 70% − rehab | $202,075 |  | click |
| MAO | Money in deal ≤ $65k | money in deal = target | $281,982 |  | click |
| MAO | Equity post-Refi ≥ 20% | money in deal ≤ post-Refi equity ÷ (1 + 20%) | $248,643 |  | click |
| MAO | Binding constraint | 70% Rule | $202,075 |  |  |
| MAO | Your offer | $80,225 ABOVE MAO | $282,300 | bad |  |
| Deal Score Breakdown | Total | 3.3 / 10 |  |  |
| Deal Score Breakdown | Cash-on-Cash | -0.6% | bad | click |
| Deal Score Breakdown | Cash-on-Cash · target/weight | target ≥10% weight 33% |  |  |
| Deal Score Breakdown | Equity % | -5.1% | bad | click |
| Deal Score Breakdown | Equity % · target/weight | target ≥20% weight 33% |  |  |
| Deal Score Breakdown | Location | 10/10 | good | click |
| Deal Score Breakdown | Location · target/weight | target ≥7 weight 33% |  |  |

### Flip · Cash — toggles flipped (CoC → w/o CapEx, Equity → $, Annual CF → no capex, Equity post-Refi → Liquidation): pairs that change

_No view toggles on this tab — nothing changes._

### Flip · HML — default view (all collapsibles open)

| Section | Label | Value | Status | Formula |
|---|---|---|---|---|
| Header | Address | 211 Fisherman Trl, Melissa, TX 75454 |  |  |
| Header | Facts | SFR · 2,348 sqft · built 2006 · via BSJ |  |  |
| Top | CASHFLOW | -$30/mo | bad | modal: Monthly cashflow |
| Top | CASHFLOW · sub | w/o CapEx: $397/mo |  |  |
| Top | COC | -0.6% | bad | modal: Cash-on-Cash ROI |
| Top | COC · sub | w/o CapEx: 7.3% |  |  |
| Top | DSCR | 1.18 | warn | modal: DSCR (Debt Service Coverage Ratio) |
| Top | DSCR · sub | lender ratio: 3.79 |  |  |
| Top | EQUITY | -5.1% | bad | modal: Book equity post-Refi |
| Top | EQUITY · sub | $62,000 |  |  |
| Top | MONEY IN DEAL | $65,325 | bad | modal: Money in deal |
| Top | MONEY IN DEAL · sub | target ≤ $65k |  |  |
| Top | MAO | $202,075 | bad | modal: Maximum Allowable Offer |
| Top | MAO · sub | $80,225 over · 70% Rule |  |  |
| Top | DEAL SCORE | 3.3 /10 | bad |  |
| Top | Verdict | NO-GO | bad |  |
| Top | Weakest | WEAKEST: Cash-on-Cash -0.6% Equity % -5.1% |  |  |
| Tabs | BRRRR | -$30/mo |  |  |
| Tabs | Buy & Hold | $122/mo |  |  |
| Tabs | Flip · Cash | -$28,546 profit |  |  |
| Tabs | Flip · HML | -$29,239 profit |  |  |
| Summary | NET PROFIT | -$29,239 | bad |  |
| Summary | NET PROFIT · sub | Leveraged with hard money |  |  |
| Summary | ROI ON CASH | -25.0% | bad |  |
| Summary | ANNUALIZED | -300.3% | bad |  |
| Summary | CASH IN | $116,829 | neutral |  |
| Summary | HML PAYOFF | $197,610 | neutral |  |
| CASH DEPLOYED | Acquisition gap + closing + points | $114,003 |  |  |
| CASH DEPLOYED | Holding (HML interest + full opex, 1 mo) | $2,826 |  |  |
| CASH DEPLOYED | Total cash in | $116,829 |  |  |
| SALE | ARV / sale price | $310,000 |  |  |
| SALE | Selling costs (8%) | −$24,800 |  |  |
| SALE | HML payoff | −$197,610 |  |  |
| SALE | Net to investor | $87,590 |  |  |
| SALE | Net profit | -$29,239 | bad |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › TOTAL CASH IN | $116,829 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › NET PROFIT | -$29,239 | selected |  |
| HML TERM SHEETS | #1 Marshall Reddick SELECTED › ROI | -25.0% | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › TOTAL CASH IN | $104,827 | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › MONEY IN DEAL | $65,325 | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › CASHFLOW /MO | -$30 | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › COC | -0.6% | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › DSCR | 1.18 | selected |  |
| REFI TERM SHEETS | #1 John SELECTED › SCORE | 3.3 | selected |  |
| REFI TERM SHEETS | Payoff title | PAYOFF HORIZON — TOTAL LOAN COST IF PAID OFF AT… |  |  |
| REFI TERM SHEETS | Payoff column 1 | JOHN · SELECTED $1,701.15/mo P&I |  |  |
| REFI TERM SHEETS | Payoff 3 yr › column 1 | $67,503 |  |  |
| REFI TERM SHEETS | Payoff 5 yr › column 1 | $105,916 |  |  |
| REFI TERM SHEETS | Payoff 7 yr › column 1 | $143,919 |  |  |
| REFI TERM SHEETS | Payoff 10 yr › column 1 | $199,998 |  |  |
| REFI TERM SHEETS | Payoff 15 yr › column 1 | $290,242 |  |  |
| REFI TERM SHEETS | Payoff 20 yr › column 1 | $374,803 |  |  |
| MAO | Maximum Allowable Offer | $202,075 | bad |  |
| MAO | 70% Rule | ARV × 70% − rehab | $202,075 |  | click |
| MAO | Money in deal ≤ $65k | money in deal = target | $281,982 |  | click |
| MAO | Equity post-Refi ≥ 20% | money in deal ≤ post-Refi equity ÷ (1 + 20%) | $248,643 |  | click |
| MAO | Binding constraint | 70% Rule | $202,075 |  |  |
| MAO | Your offer | $80,225 ABOVE MAO | $282,300 | bad |  |
| Deal Score Breakdown | Total | 3.3 / 10 |  |  |
| Deal Score Breakdown | Cash-on-Cash | -0.6% | bad | click |
| Deal Score Breakdown | Cash-on-Cash · target/weight | target ≥10% weight 33% |  |  |
| Deal Score Breakdown | Equity % | -5.1% | bad | click |
| Deal Score Breakdown | Equity % · target/weight | target ≥20% weight 33% |  |  |
| Deal Score Breakdown | Location | 10/10 | good | click |
| Deal Score Breakdown | Location · target/weight | target ≥7 weight 33% |  |  |

### Flip · HML — toggles flipped (CoC → w/o CapEx, Equity → $, Annual CF → no capex, Equity post-Refi → Liquidation): pairs that change

_No view toggles on this tab — nothing changes._

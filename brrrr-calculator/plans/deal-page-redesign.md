# Plan: Deal Page Redesign

> Source: melt-me session 2026-11-13 (no PRD; this header holds every decision made there).
> Inspiration: a third-party "Property Analysis" page — KPI tiles on top, then stacked white
> section cards (Purchase & Rehab with a pie, Financing loan cards, Valuation, Cash Flow with a
> Monthly/Yearly switch and a pie, Investment Returns, Financial Ratios, Purchase Criteria with
> ✓/✗ checks). Take its essence, not a pixel copy.

## Architectural decisions

Durable decisions that apply across all phases:

- **UI/UX only.** No change to formulas, calculation results, the Deal model, `lib/deal-model.ts`
  (ADR-0002), `lib/buy-hold.ts`, `lib/strategy.ts`, term-sheet logic, or Sheets persistence.
  A suspected formula bug is reported, never fixed. Golden tests stay byte-identical.
- **Nothing disappears.** Every line, table, label and word on the deal page today still appears
  in the new design. New words (section titles, breadcrumb) may be added. Changing a label's
  wording is out of scope.
- **Branch, never main.** All work happens on branch `deal-page-redesign`. Every session checks
  it out first (`git switch deal-page-redesign`) — this plan file exists only on that branch, so
  `/build-phase deal-page-redesign` can't find it from `main`. Commits push the **branch only**
  (`git push -u origin deal-page-redesign`) — this overrides CLAUDE.md's "push to main" step.
  Vercel builds a preview link for the branch; the live app stays on `main` until the user merges.
  Note: the preview only loads saved deals if the Google Sheets env vars are enabled for the
  Vercel **Preview** environment.
- **Gates every phase**: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` — all
  green, then commit (plan checkboxes included) and push the branch.
- **Docs every phase**: add a `docs/new/CHANGELOG.md` entry for the phase (repo convention).
  Update `docs/architecture.md` when the component tree changes (phases 1–3: top bar, section
  cards, removed Tweaks panel).
- **Live data — never save the test deals.** Local dev reads and writes the real Google Sheet,
  and Save also sets a deal's strategy from the open tab. Never press Save/Update on Anna or
  Melissa. Toggles that write to the deal (the B&H property value toggle) are tested without
  saving. Save / Update / Reset are tested on a throwaway `/deal/new` deal; ask the user before
  deleting that throwaway row.
- **Scope**: the deal page (`/deal/new`, `/deal/[id]`). The Edit Deal drawer picks up the new
  colors and fonts only — same fields, same layout. The home list of deals is untouched (it uses
  its own Tailwind colors, not the shared tokens).
- **Palette A — classic blue** (user pick from four options):
  page background `#f4f6fa`, cards `#ffffff` with a faint border, accent / headings / headline
  numbers `#1e88e5`, body text `#2b3442`, muted labels `#6b7280`. Good / warn / bad stay
  green / amber / red (chips: `#e3f5ec`/`#1c7c54`, `#fdf1dc`/`#9a6512`, `#fde8e7`/`#b3362f`).
  Clean sans-serif everywhere (serif headings and the monospace number font go); numbers use
  tabular figures so columns line up. Section titles are uppercase blue, like the screenshots.
- **Tweaks panel removed.** The accent/density picker is unreachable today (nothing opens it);
  delete it and its accent/density code and CSS.
- **Top of page** (top to bottom):
  1. Header: back-to-deals link, CGM logo with "CGM VENTURES" / "Deal Calculator · DFW",
     address as the page title, breadcrumb (Deals / address / Analysis), the property facts line
     (type · sqft · built · via agent), and an **Edit deal** button (keeps the `E` shortcut).
  2. **Strategy tabs above the tiles**: BRRRR, Buy & Hold, Flip · Cash, Flip · HML, each still
     showing its $/mo or profit sub-line.
  3. **Tiles**: the 6 headline numbers (Cashflow, CoC, DSCR, Equity, Money in Deal / Cash In,
     MAO) as white tiles, each keeping its sub-line, status color and formula click; plus a larger
     **Deal Score tile** (score /10, verdict pill, "Weakest" chips; "B&H Deal Score" on the B&H
     tab). Tiles follow today's lens rule: B&H numbers on the B&H tab, BRRRR elsewhere.
  4. Header and tiles scroll away. A **slim pinned bar** then appears showing: address,
     cashflow, CoC, cash in (Money in Deal, or Cash In on the B&H tab), the score, and Edit.
- **Section order** below the tiles (screenshot style, Cash Flow moved up by the user):
  **Purchase & Rehab → Cash Flow → Financing → Valuation & Equity → Investment Returns →
  Financial Ratios → Purchase Criteria.** Each section is a white card with an uppercase blue
  title. Sections with nothing to show on a tab are omitted on that tab.
- **Today's group titles survive as sub-headings** inside the new cards, so no word is lost:
  Acquisition, Monthly operating, Hard money loan, Refinance, Purchase & cash in, Cash deployed,
  Sale, Maximum Allowable Offer, Deal Score Breakdown / B&H Deal Score Breakdown, and
  Advanced Metrics / Advanced Metrics · Buy & Hold (as a small caption on the cards that hold
  its tiles: Valuation & Equity, Investment Returns, Financial Ratios).
- **DSCR appears twice on purpose**: the summary cell in Cash Flow (as today) and again in
  Financial Ratios — same value, same formula modal (`dscr` / `bnh_dscr`). It is a duplicate for
  the screenshot's layout, not a moved line; don't remove either copy.
- **Known display bug, carried over verbatim (not fixed)**: on the BRRRR tab the row
  "NOI / w/o Capex" shows the same cashflow values as "Monthly cashflow / w/o Capex" — it renders
  the cashflow numbers, while its own formula modal ("Monthly NOI") explains and computes
  Gross Rent − Total Operating Expenses. The row dates from the original V2 build (608a505).
  Reported to the user 2026-11-13; the redesign keeps it as-is (a separate fix if wanted).
- **Formula modal**: takes the new colors and fonts only; its content and layout are untouched.
- **Content mapping — BRRRR tab**

  | Section | Today's content |
  |---|---|
  | Purchase & Rehab | Acquisition group (Purchase price → Total project cost) + cost donut |
  | Cash Flow | Annual cashflow summary + its 4 cells (CoC ↔ w/o CapEx, DSCR, Equity %↔$, Money in deal), then Monthly operating (expense breakdown, interest-only scenario) + expense donut + Mo/Yr switch |
  | Financing | Two loan cards side by side: "Loan 1 · Hard money" (Hard money loan group) and "Loan 2 · Refinance" (Refinance group); below them HML Term Sheets and Refi Term Sheets (with the payoff matrix) as expandable sections |
  | Valuation & Equity | Equity post-Refi (Book / Liquidation), Margin/ARV, Forced Equity ROI |
  | Investment Returns | Cap Rate, ROE, Annual CF (w/ ↔ no capex), 5-Year IRR at 2/3/4% |
  | Financial Ratios | GRM, DSCR |
  | Purchase Criteria | Maximum Allowable Offer rules with ✓/✗, binding constraint, your offer; then Deal Score Breakdown bars |

- **Content mapping — Buy & Hold tab**

  | Section | Today's content |
  |---|---|
  | Purchase & Rehab | "Purchase & cash in" group (Purchase price → Cash In) + cost donut |
  | Cash Flow | Annual cashflow summary + 4 cells, Monthly operating + expense donut + Mo/Yr switch |
  | Financing | "Loan · Buy & Hold" card: Loan (x%) from advanced metrics; below it HML and Refi Term Sheets + payoff matrix, as today |
  | Valuation & Equity | Property value toggle (ARV / Purchase price), Value (basis), Equity at purchase |
  | Investment Returns | Cap Rate, ROE, Annual CF toggle, 5-Year IRR |
  | Financial Ratios | GRM, DSCR |
  | Purchase Criteria | MAO rules with ✓/✗; B&H Deal Score Breakdown |

- **Content mapping — Flip tabs** (Cash and HML): profit summary (Net profit + its 4 cells) at
  the top of Purchase & Rehab, "Cash deployed" group in Purchase & Rehab, "Sale" group in
  Valuation & Equity (titled "Sale" inside the card), Financing holds the term-sheet sections as
  today, Purchase Criteria holds MAO + score breakdown. No Cash Flow / Returns / Ratios sections.
- **Formula hint**: every line that opens a formula today gets a small ⓘ icon before its label;
  clicking the icon or the label opens the formula modal. Lines without a formula get no icon.
- **Donuts**: hand-drawn SVG, no chart library. Built only from numbers already on the page.
  Hover/tap shows the line name, $ and %. Zero slices are skipped. Exact slices (verified
  against the code so slices minus credits equal the card's total):
  - BRRRR cost donut: Purchase price, Rehab Estimate (Funded), Change Orders, Additional rehab
    costs, Closing costs, One-time costs, Holding costs. (Minus Project cost adjustments =
    Total project cost.)
  - B&H cost donut: Down payment, Loan costs, Closing costs, Rehab (all cash), One-time costs,
    Holding costs. (Minus Credits at close = Cash In.) Purchase price and Loan are **not**
    slices — Purchase price = Down payment + Loan, so they would double-count.
  - Expense donut (both tabs): Property Tax, Insurance, HOA, State income tax, Property
    management, Capex / vacancy, Additional Monthly Costs, Mortgage P&I.
  - All slices zero (blank `/deal/new`): show an empty grey ring with no percentages, never a
    divide-by-zero or NaN.
- **Monthly / Yearly switch** on the Monthly operating table: defaults to Monthly (today's
  numbers). Yearly shows each line of that table × 12 on screen only — nothing saved, nothing
  recalculated in a module. Labels are **not** reworded; the switch itself (and a "Yearly"
  caption above the values column) shows which mode is on. The Annual cashflow summary and its
  4 cells above the table do not change with the switch. Resets to Monthly on reload.
- **✓/✗ on max-offer rules**: a rule is ✓ when the purchase price ≤ that rule's max offer — the
  same test the page already uses for "below / ABOVE MAO", shown per rule.
- **Phone**: desktop-first; below tablet width the score tile goes full width on top, the 6
  tiles go 2 per row, tabs swipe sideways, every section is one column with the donut under its
  table, wide term-sheet tables scroll sideways inside their card.
- **Language / RTL**: the app is English-only with no RTL support today; nothing to preserve.
- **Number check deals** (user's pick; no third deal). Every number on all 4 tabs must match
  the baseline captured in phase 1:

  | Deal | Strategy | id | savedAt when planned |
  |---|---|---|---|
  | 1805 Cedar Wood, Anna TX | BRRRR | `f1a508c3-5509-471a-9890-40be1a611d95` | 2026-09-26T14:25:23Z |
  | 211 Fisherman Trl, Melissa TX | Buy & Hold | `e2646a7e-7a0c-4de0-ac27-e7e7a5bc5a76` | 2026-11-13T09:31:33Z |

  The baseline is captured by script from the running page (not hand-typed) as **label → value
  pairs**, grouped per deal, per tab, per toggle/collapsible state — including the term-sheet
  tables and the payoff matrix — so it can be compared after the layout changes and from a
  different session. The baseline file also keeps the extraction snippet and each deal's
  `savedAt`. **Pass** = every baseline pair is present with the same value on the new page;
  extra pairs (the second DSCR, yearly values, donut percentages, ✓/✗) are allowed. If a deal's
  `savedAt` has changed by the time of a check, the deal was edited: re-capture its baseline from
  `main` (e.g. a `main` worktree) before comparing.
- **Other pages**: the home list, deal desk and site header use their own Tailwind colors, not
  the shared tokens. The only shared token they can see is the page `body` background — check the
  home page and deal desk still look right after phase 1.
- **Features that must stay reachable** (checked in phase 5): formula modal from every label
  that has one today; `E` opens/closes the drawer and `Esc` closes drawer and modal; drawer
  Save / Update, Reset, section nav; back to deals; all 4 tabs; CoC ↔ w/o CapEx and Equity %↔$
  cells; Annual CF capex toggle; Book / Liquidation equity; B&H property value toggle; expense
  breakdown and interest-only collapsibles; term sheet add / select / delete and payoff matrix;
  the term-sheet "unreadable settings" state; saved deal opens on its strategy's tab; blank
  `/deal/new` renders cleanly (all blanks, no NaN); an unsaved draft on `/deal/new` is restored
  after a reload.

---

## Phase 1: Baseline, palette and new top of page

### What to build

Branch `deal-page-redesign` already exists (created and pushed 2026-11-13 with this plan as its
first commit); switch to it. **Before any UI change**, run the current page and capture the
baseline for Anna and Melissa by script: on each of the 4 tabs, with every collapsible opened
and each toggle in both states, record label → value pairs (term-sheet tables and payoff matrix
included) into `plans/deal-page-redesign-baseline.md`, with each deal's id and `savedAt` and the
extraction snippet at the top. Do not Save either deal. Then switch the shared color/font tokens to palette A
(drawer follows automatically), remove the Tweaks panel, and replace the top bar with the new
header, strategy tabs above the tiles, the 6 tiles + score tile, and the slim pinned bar. The
sections below keep their current layout for now, in the new colors.

### Acceptance criteria

- [x] Branch `deal-page-redesign` exists and is pushed; `main` untouched (2026-11-13, commit ca79dd6)
- [ ] Baseline file holds label → value pairs for Anna and Melissa on all 4 tabs, all states, plus the extraction snippet
- [ ] Palette A and sans-serif applied on the deal page; drawer uses the new colors, layout unchanged
- [ ] Tweaks panel and accent/density code removed
- [ ] Home page and deal desk look unchanged
- [ ] Header shows back link, logo + brand text, address, breadcrumb, facts line, Edit deal (`E` works)
- [ ] Strategy tabs sit above the tiles with their sub-lines
- [ ] 6 tiles + score tile show the same numbers, sub-lines, status colors and formula clicks as today, B&H lens on the B&H tab
- [ ] Slim bar appears on scroll with address, cashflow, CoC, cash in, score, Edit
- [ ] All gates green; committed and branch pushed

---

## Phase 2: BRRRR tab in section cards

### What to build

A shared section-card component and the ⓘ formula hint. Rebuild the BRRRR tab in the agreed
order and mapping (Purchase & Rehab → Cash Flow → Financing with two loan cards and the
term-sheet sections → Valuation & Equity → Investment Returns → Financial Ratios → Purchase
Criteria). No donuts, Mo/Yr switch or ✓/✗ yet. Other tabs keep their current layout.

### Acceptance criteria

- [ ] BRRRR tab shows the seven sections in the agreed order
- [ ] Every BRRRR line, value and toggle from the baseline appears, with identical values for Anna
- [ ] Every line with a formula has an ⓘ icon; icon and label both open the modal
- [ ] Expense breakdown and interest-only collapsibles, CoC/Equity cells, Annual CF and Book/Liquidation toggles still work
- [ ] Term sheet add / select / delete and payoff matrix work inside Financing
- [ ] All gates green; committed and branch pushed

---

## Phase 3: Buy & Hold and Flip tabs in section cards

### What to build

Apply the same section cards to the Buy & Hold tab and both Flip tabs per the mapping tables.
Retire the old output-group layout and its unused CSS.

### Acceptance criteria

- [ ] B&H tab follows its mapping; every baseline line and value matches for Melissa
- [ ] B&H property value toggle works and still saves with the deal
- [ ] Flip · Cash and Flip · HML follow their mapping; values match the baseline for both deals
- [ ] No old-layout CSS left unused
- [ ] All gates green; committed and branch pushed

---

## Phase 4: Donuts, Monthly/Yearly switch, ✓/✗ criteria

### What to build

The cost donut beside Purchase & Rehab and the expense donut beside Cash Flow (BRRRR and B&H);
the Monthly/Yearly switch on Cash Flow; ✓/✗ marks on each max-offer rule.

### Acceptance criteria

- [ ] Both donuts render from on-page numbers only, skip zero slices, show name/$/% on hover or tap; blank deal shows an empty ring
- [ ] Mo/Yr defaults to Monthly with baseline values; Yearly shows each operating line × 12, labels unchanged, mode shown on the switch; Annual cashflow summary unaffected
- [ ] Each max-offer rule shows ✓ when purchase price ≤ its max offer, ✗ otherwise
- [ ] All gates green; committed and branch pushed

---

## Phase 5: Phone pass and final number check

### What to build

Tune the layout below tablet width per the phone decision. Then do the full before/after check
against the baseline and walk the features-that-must-stay-reachable list.

### Acceptance criteria

- [ ] At phone width: score tile full width, tiles 2 per row, tabs swipe, sections one column, donuts under tables, term-sheet tables scroll inside their card, no page-wide sideways scroll
- [ ] Edit drawer usable at phone width
- [ ] Every baseline label → value pair on all 4 tabs is present for Anna and Melissa (all toggle states)
- [ ] Every word in the baseline still appears on the page
- [ ] Save / Update / Reset verified on a throwaway `/deal/new` deal only; user asked before deleting it
- [ ] Every item in "Features that must stay reachable" verified in the running app
- [ ] All gates green; committed and branch pushed; user told the preview link is ready to review

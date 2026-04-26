# UI/UX Specification — CGM Ventures Deal Calculator
**Version:** 2.0
**Status:** Ground truth. Overrides design.md on any conflict.

---

## 1. Layout

### 1.1 Two-Panel Side-by-Side (Desktop ≥ 900px)

```
┌──────────────────────────────────────────────────────────┐
│  Sticky global header (CGM Ventures · Deal Calculator)   │
├─────────────────────────┬────────────────────────────────┤
│  LEFT PANEL (320px)     │  RIGHT PANEL (remaining width) │
│  Sticky, full height    │  Scrollable                    │
│  Scrolls internally     │                                │
│  ─────────────────────  │  ┌─ Sticky deal header ──────┐ │
│  Section: Property      │  │ Address · Score · GO badge │ │
│  Section: Purchase      │  └───────────────────────────┘ │
│  Section: Market        │                                │
│  Section: HML Lender    │  KPI strip (4 cards)           │
│  Section: Refi Lender   │                                │
│  Section: PITI          │  Scenario tabs                 │
│  Section: Custom Exp.   │  [Rental (BRRRR)] [Flip-Cash]  │
│  Section: Settings      │  [Flip-HML]                    │
│                         │                                │
│                         │  Deal anatomy card             │
│                         │  Monthly P&L card              │
│                         │  HML expenses card             │
│                         │  Refi expenses card            │
│                         │                                │
│                         │  Scorecard                     │
│                         │  MAO block                     │
│                         │  Custom expenses summary       │
└─────────────────────────┴────────────────────────────────┘
```

- Left panel: `width: 320px`, `position: sticky`, `top: header-height`, `height: calc(100vh - header-height)`, `overflow-y: auto`
- Right panel: `flex: 1`, `overflow-y: auto`
- Root app container: `display: flex`, `position: relative` (required for modal overlay)
- Global sticky header sits above both panels

### 1.2 Mobile (< 900px)

Single column. Inputs section on top, results section below. No side-by-side. Scenario Analysis uses tab switcher (existing behavior).

### 1.3 Left Panel — Input Section Order

1. Property details
2. Purchase & rehab
3. Market (ARV, rent)
4. HML lender settings (collapsible, default open)
5. Long-term Refi settings (collapsible, default open)
6. PITI breakdown
7. Custom expenses
8. Settings (MAO targets, school grade, exit strategy)

### 1.4 Right Panel — Results Section Order

1. Deal header (sticky within right panel)
2. KPI strip — 4 cards
3. Exit scenario tabs
4. Scorecard
5. MAO block
6. Custom expenses summary (only if customExpenses.length > 0)

---

## 2. Deal Header (Right Panel, Sticky)

Always visible at the top of the right panel.

| Element | Content |
|---|---|
| Address | From inputs |
| Sub-line | Property type · bed/bath · sqft · year · source |
| Exit strategy badge | "Rental (BRRRR)" or "Flip" |
| Overall score | X/10 (averaged from 3 categories, 1 decimal) |
| GO/NO-GO badge | Green "GO" if score ≥ 7.0, Red "NO-GO" if < 7.0 |

Score = average of equity score (0–10) + ROI score (0–10) + location score (0–10), then divided by 3.
Display as X.X/10.

---

## 3. KPI Strip

Four metric cards in a single row (desktop) / 2×2 grid (mobile):

| # | Metric | Green | Yellow | Red |
|---|---|---|---|---|
| 1 | Monthly cashflow | ≥ $300 | $100–$299 | < $100 |
| 2 | Cash-on-cash ROI | ≥ 8% | 5–7.9% | < 5% |
| 3 | Equity post-Refi ($) | — | — | — (neutral) |
| 4 | DSCR | ≥ 1.25 | 1.0–1.24 | < 1.0 |

Each card has a `?` button → opens formula modal.

Equity post-Refi shows `$ amount` as primary and `% of ARV` as subtitle. No color threshold — always neutral.

---

## 4. Exit Scenario Tabs

Three tabs. Only one tab active at a time. Tabs: **Rental (BRRRR)** · **Fix & Flip – Cash** · **Fix & Flip – HML**

### 4.1 Tab: Rental (BRRRR)

**Deal anatomy card**
- Purchase price
- Total rehab (estimate + change orders)
- Closing costs on purchase
- Holding costs during rehab
- All-in (cash) = sum of above
- One-time custom expenses (each labeled individually, below All-in)
- ARV
- Refi loan amount (ARV × LTV%)
- Refi closing costs
- Cash received from Refi lender
- Money left in deal
Each line: `?` button

**Monthly P&L card**
- Gross rent
- Mortgage PI (negative)
- Property tax (negative)
- Insurance (negative)
- HOA (negative)
- State income tax (negative, hide row if $0)
- CapEx + vacancy reserve (negative)
- Property management (negative, label shows mode: "10% of rent" or "fixed")
- Each monthly/annual custom expense as its own labeled row (negative)
- **Net cashflow** (bold, color-coded)
Each line: `?` button

**HML loan expenses card** (visually distinct, info-tinted background)
- HML loan principal
- Total interest paid
- Points ($)
- Underwriting fees
- Appraisal cost
- Other/misc fees
- **Total HML cost** (bold)
Each line: `?` button

**Refi loan expenses card** (visually distinct, info-tinted background)
- Refi loan amount
- Points ($)
- Underwriting fees
- Appraisal cost
- Other/escrow fees
- **Total Refi closing cost** (bold)
Each line: `?` button

### 4.2 Tab: Fix & Flip – Cash

**Deal anatomy card**
- All-in (cash)
- Sale price (ARV)
- Agent commissions + notary
- Closing costs on sale
- Holding costs
- **Net profit** (bold, color-coded)
- **Cash ROI %** (bold, color-coded)

### 4.3 Tab: Fix & Flip – HML

**Deal anatomy card**
- Cash to close (all-in minus HML)
- Sale price (ARV)
- Agent commissions + notary
- Closing costs on sale
- HML payoff (principal)
- **Net profit** (bold, color-coded)
- **CoC ROI %** (bold, color-coded)

**HML loan expenses card** (same structure as Rental tab HML card)

---

## 5. Scorecard

Three score items in a row, each showing:
- Category label + `?` button
- Score: X/10 (color: green ≥ 8, yellow 5–7, red < 5)
- Scoring bracket rules displayed below the score in small muted text — always visible, not only in tooltip

### Scoring rules

**Equity score** — uses `hmlEquityPctPostRefi` in HML scenario, `cashEquityPct` in Cash scenario:
```
≥ 35% → 10
≥ 30% → 9
≥ 20% → 8
else  → 0
```
Display: `"35%=10 · 30%=9 · 20%=8 · else 0"`

**ROI score** — uses `hmlROI_PI` (HML) or `cashROI_PI` (Cash):
```
≥ 10% → 10
≥ 9%  → 9
≥ 8%  → 8
≥ 7%  → 7
≥ 6%  → 6
≥ 5%  → 5
else  → 0
```
Display: `"10%=10 · 9%=9 · ... · 5%=5 · else 0"`

**Location score** — from school district grade input:
```
15 → 10
12 → 9
10 → 8
9  → 7
else → 0
```
Display: `"A(15)=10 · B(12)=9 · C(10)=8 · D(9)=7 · else 0"`

Each score item has a `?` modal that shows the live input value and which bracket it matched.

**Overall score** = average of the three, displayed as X.X/10. Threshold: ≥ 7.0 = GO, < 7.0 = NO-GO.

---

## 6. MAO Block

Two cards side by side:

| Card | Label | Formula |
|---|---|---|
| Left | MAO (max $ in deal) | Algebraic solve keeping moneyInDeal ≤ maxMoneyInDeal |
| Right | MAO (min equity %) | Algebraic solve keeping equity ≥ minEquityPct post-refi |

Both show:
- Dollar value (large)
- % below asking price (subtitle)
- `?` button with formula + live substituted values

Below the two cards: **Recommended MAO** = the lower of the two, bold, with a note: "Use the lower of the two MAOs to satisfy both constraints."

---

## 7. Custom Expenses Summary Block

Shown only when `customExpenses.length > 0`. Appears at the bottom of the right panel.

Each expense shown as a row:
- Name
- Amount + frequency tag (pill)
- Where it flows: `"Monthly P&L"` (monthly/annual) or `"Deal anatomy — one-time"` (one-time)

---

## 8. Formula Modal

Replaces the existing hover Tooltip. Triggered by any `?` button throughout the results panel.

### Behavior
- Click `?` → modal opens, centered over the right panel
- Click `×` button or click backdrop → modal closes
- The modal uses `position: absolute` on the right panel container (which has `position: relative`)
- **Do NOT use `position: fixed`** — breaks in iframe environments

### Modal content
1. **Metric name** — title, medium weight
2. **Formula** — monospace, grey background pill: e.g. `"Gross Rent ÷ Total Monthly Expenses"`
3. **Live calculation** — monospace, grey background: e.g. `"$2,434 ÷ $1,943 = $491"`
4. **Note** — small muted text below divider: context, thresholds, caveats
5. **×** close button top-right

### Implementation
- Central `formulaRegistry` object keyed by metric ID
- Each entry: `{ title, formulaString, calcFn: (results) => string, note }`
- `calcFn` receives current `DealResults` and returns the formatted live calculation string
- All existing tooltip content migrated into this registry — nothing lost, just reformatted
- `Tooltip.tsx` component is replaced by `FormulaModal.tsx`; `ResultRow.tsx` updated to use new modal

---

## 9. Custom Expense Structure

### Interface (replaces current)

```typescript
interface CustomExpense {
  id: string
  name: string
  amount: number        // replaces amountMonthly
  frequency: 'one-time' | 'monthly' | 'annual'
  funded: boolean
}
```

### Input UI (per expense card)

```
[ Name .......................... ]  [ $Amount ]
[ One-time ]  [ Monthly ]  [ Annual ]   [ Not funded ]  [ Funded (soon) ]  [ × ]
```

- Frequency: three-way pill toggle, one active
- `Funded (soon)`: greyed out, not clickable. Cursor: not-allowed. Tooltip on hover: "Coming soon — funded expenses will be added to the loan amount"
- Amount field label/suffix changes with frequency: `"$"` for one-time, `"$/mo"` for monthly, `"$/yr"` for annual

### Calculation logic (update `lib/calculations.ts` Section 5)

```
customMonthly  = Σ { e.amount        | e.frequency = 'monthly' AND e.funded = false }
customAnnual   = Σ { e.amount / 12   | e.frequency = 'annual'  AND e.funded = false }
customOneTime  = Σ { e.amount        | e.frequency = 'one-time' AND e.funded = false }

customExpenseTotal = customMonthly + customAnnual   ← replaces old customExpenseTotal
                                                       plugs into totalPITI identically
```

`customOneTime` is NOT added inside `calculateDeal` — it is displayed as line items in the Deal Anatomy UI, below the All-in total, without affecting the core calculations.

### Display in Monthly P&L

Each non-funded monthly/annual expense appears as its own row:
- Monthly: label = expense name, value = `−$amount/mo`
- Annual: label = `"[Name] (annual ÷ 12)"`, value = `−$round(amount/12)/mo`
- `?` modal: annual shows `"$amount ÷ 12 = $result/mo"`

### Display in Deal Anatomy

Each non-funded one-time expense appears as its own labeled row below All-in:
- Label = `"[Name] (one-time)"`
- `?` modal: `"One-time expense — added to acquisition cost. Not included in monthly P&L."`

---

## 10. Property Management Input

Two-mode toggle — already implemented, document here as ground truth:
- `% of Rent` — user enters percentage (e.g. 10%), stored as `pmRate = 0.10`
- `Fixed $` — user enters dollar amount per month, stored as `pmFixed`

Label in Monthly P&L updates dynamically:
- Percent mode: `"Property management (10%)"`
- Fixed mode: `"Property management (fixed)"`

---

## 11. Color Thresholds (ground truth)

| Metric | Green | Yellow/Amber | Red |
|---|---|---|---|
| Monthly cashflow | ≥ $300 | $100–$299 | < $100 |
| CoC ROI | ≥ 8% | 5–7.9% | < 5% |
| DSCR | ≥ 1.25 | 1.0–1.24 | < 1.0 |
| Monthly NOI | ≥ $300 | ≥ $0 | < $0 |
| Annual ROI | ≥ 8% | ≥ 5% | < 5% |
| Equity % | ≥ 20% | — | — (neutral below) |
| Net cash at closing | ≥ $0 | — | < $0 |
| MAO discount needed | ≤ 10% | ≤ 20% | > 20% |
| Score per category | ≥ 8 | 5–7 | < 5 |
| Overall score (avg) | ≥ 7.0 → GO | — | < 7.0 → NO-GO |

---

## 12. Seed Data (Dev/Testing)

Pre-populate with this deal on load:

```
Address: 1805 Cedar Wood Trl, Anna TX 75409
Source: BSJ
Type: SFR 4/2, 1621 sqft, built 2013
Purchase price: 230000
Closing costs: auto (2%)
Rehab: 14080, change orders: 2970, months: 1
ARV: 300000, market rent: 2434
HML: leverage 69.6% PP, 0% rehab, rate 9.95%/yr, points 2%,
     underwriting 1295, other 495, months 1
Refi: LTV 65%, rate 7%, term 30yr, points 1.5%,
      underwriting 1599, appraisal 750, other 500
PITI: tax 470, insurance 143, HOA 32, state 0, CapEx 15%, PM 0%
Custom expenses:
  { name: "City inspection", amount: 300, frequency: "annual", funded: false }
  { name: "Lawn maintenance", amount: 80, frequency: "monthly", funded: false }
Settings: maxMoneyInDeal 65000, minEquityPct 20%, school grade 12, exit: rental
```

Expected key outputs to verify:
- All-in: ~$248,000
- HML loan: $160,000
- Money in deal: $60,208
- Mortgage PI: $1,297/mo
- DSCR: 1.27
- Monthly cashflow: ~$466 (after $25 city inspection + $80 lawn = $105 in custom)
- Equity post-Refi: $80,500

---

## 13. What Must NOT Change

- `lib/calculations.ts` formula logic — except Section 5 (custom expense totals) as described above
- `lib/types.ts` — except adding `frequency` to `CustomExpense` and removing `amountMonthly`
- `lib/defaults.ts`, `lib/format.ts` — no changes
- Blur-to-commit pattern on all input fields
- HML annual rate display convention (user sees annual %, stored as monthly decimal)
- Mobile tab behavior for scenario switching
- Sticky global header with CGM Ventures branding
- All existing tooltip content (migrate into modal, do not delete)

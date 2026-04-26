# Technical Architecture

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Vercel-native; gives us secure server-side API routes for Sheets API (Phase 2) without exposing credentials |
| Language | TypeScript | Type safety across the entire calculation pipeline — critical given 50+ formula inputs/outputs |
| Styling | Tailwind CSS | Mobile-first utility classes, no runtime overhead, consistent design tokens |
| Components | Custom (no external library) | Avoids npm complexity; the UI requirements are simple enough to implement directly |
| State | React `useState` + `useMemo` | All calculation outputs are pure functions of inputs — no complex state manager needed |
| Database | Google Sheets (Phase 2) | Specified requirement; familiar to the deal owner for manual inspection |
| Hosting | Vercel free tier (Phase 4) | Zero-config Next.js deploy |

---

## Project Structure

```
brrrr-calculator/
├── app/                          Next.js App Router pages
│   ├── layout.tsx                Root layout, sticky header, nav
│   ├── page.tsx                  Dashboard (deal list — placeholder)
│   └── deal/new/page.tsx         New deal calculator page
│
├── components/
│   ├── DealCalculator.tsx        Main stateful wrapper — owns all state
│   ├── sections/                 Card content components (read-only display)
│   │   ├── PropertyInputs.tsx    Input form: address, numbers, expenses, overrides
│   │   ├── LenderSettingsPanel.tsx  HML + Refi lender settings
│   │   ├── CustomExpensesPanel.tsx  Add/remove custom expense line items
│   │   ├── SummaryBar.tsx        At-a-glance 4-stat bar
│   │   ├── ScenarioPanel.tsx     Tab/column switcher for the two scenarios
│   │   ├── ScenarioCash.tsx      All-Cash scenario results
│   │   ├── ScenarioHML.tsx       Hard Money scenario results
│   │   ├── RefiCard.tsx          Cash-out refi breakdown
│   │   ├── CashFlowCard.tsx      Monthly PITI and cash flow
│   │   └── MAOCard.tsx           Maximum Allowable Offer
│   └── ui/                       Primitive building blocks
│       ├── Card.tsx              Collapsible card wrapper
│       ├── FormField.tsx         Unified input (text, currency, percent, integer, select)
│       ├── ResultRow.tsx         Label / value row with optional tooltip
│       └── Tooltip.tsx           Hover/tap formula popup
│
├── lib/
│   ├── types.ts                  All TypeScript interfaces
│   ├── defaults.ts               DEFAULT_DEAL_INPUTS, DEFAULT_LENDER_SETTINGS
│   ├── calculations.ts           Single pure function — the entire formula engine
│   └── format.ts                 fmtCurrency, fmtPct, fmtNumber, parsers
│
└── docs/                         This documentation
```

---

## Data Flow

```
User types in PropertyInputs or LenderSettingsPanel
        │
        ▼  onChange(Partial<DealInputs>) or onChange(Partial<LenderSettings>)
        │
DealCalculator.tsx  ←── holds useState<DealInputs> and useState<LenderSettings>
        │
        ▼  useMemo([inputs, settings])
        │
calculateDeal(inputs, settings) → DealResults   ← pure function, runs synchronously
        │
        ├── ScenarioPanel (ScenarioCash + ScenarioHML)
        ├── RefiCard
        ├── CashFlowCard
        ├── MAOCard
        └── SummaryBar
             (all receive results as props — no local state)
```

All 50+ output values are derived every keystroke. No intermediate state, no debounce needed (JavaScript arithmetic is fast enough).

---

## Core Calculation Engine

`lib/calculations.ts` exports one function:

```typescript
calculateDeal(inputs: DealInputs, settings: LenderSettings): DealResults
```

It is a **pure function with no side effects** — same inputs always produce same outputs. This makes it trivially testable and means the UI is always consistent with the math.

Internal helpers:
- `pmt(annualRate, periods, principal)` — monthly payment for a 30-yr amortising loan
- `pv(annualRate, periods, payment)` — present value of an annuity (used to back-solve the LTV that produces $300/mo cash flow)
- `scoreEquity(pct)` — 10-point equity score
- `scoreROI(roi)` — 10-point ROI score

### Calculation Order

1. Rehab months (manual or auto)
2. Closing costs on purchase (override or auto 2%)
3. Holding costs → All-in cost
4. Cash flip analysis
5. HML loan amount (dollar mode or leverage %)
6. HML interest, fees, total debt
7. HML flip analysis
8. Property management fee (% or fixed)
9. Custom expense total (non-funded only)
10. Refi LTV (back-solved or manual override)
11. Refi loan, fees, title costs, cash from lender
12. Net cash at closing
13. Money in deal (HML and Cash scenarios)
14. PITI, IO expenses, DSCR
15. Bottom Line — Cash (equity, NOI, ROI, scores)
16. Bottom Line — HML (equity post-refi, NOI, ROI, scores)
17. MAO (two formulas)

---

## Key Design Decisions and Patterns

### Sentinel Values for Optional Overrides

Several `DealInputs` fields use sentinel values to distinguish "not set" from "zero":

| Field | Sentinel | Meaning |
|---|---|---|
| `closingCostsBuyOverride` | `-1` | Auto-calculate as 2% of PP |
| `closingCostsBuyOverride` | `0` | Explicitly $0 (no closing costs) |
| `closingCostsBuyOverride` | `> 0` | Exact dollar amount |
| `rehabMonthsManual` | `0` | Auto-calculate from `(rehab + CO) / 30,000` |
| `rehabMonthsManual` | `> 0` | Manual month count |
| `refiLTVOverride` | `0` | Auto back-solve for $300/mo cash flow, cap 65% |
| `refiLTVOverride` | `> 0` | Exact LTV (e.g. `0.65`) |
| `refiTitleCostsOverride` | `0` | Auto: `ARV × 2% + $500` |
| `refiTitleCostsOverride` | `> 0` | Exact dollar amount |
| `hmlLoanPP` | `0` | Use leverage % from LenderSettings |
| `hmlLoanRehab` | `0` | Depends on `useHmlDollars` mode (see below) |

### HML Dollar-Amount Mode

The Excel sheet allows the user to enter the actual dollar amount the lender offers (e.g. `=160/230` shows 69.6%, derived from `$160k / $230k PP`). The leverage percentage is *derived*, not the input.

The app implements this with a mode-detection rule:

```typescript
const useHmlDollars = hmlLoanPP > 0 || hmlLoanRehab > 0
const ppFinancedAmt    = useHmlDollars ? hmlLoanPP    : settings.hmlLeveragePP * pp
const rehabFinancedAmt = useHmlDollars ? hmlLoanRehab : settings.hmlLeverageRehab * rehab
```

**Critical:** When `hmlLoanPP = 160000` and `hmlLoanRehab = 0`, the mode is `useHmlDollars = true`, so `rehabFinancedAmt = 0` (the user meant "no rehab financing"). Without this rule, `hmlLoanRehab = 0` would fall through to `settings.hmlLeverageRehab * rehab = 14080`, inflating the loan by $14,080. This was a real bug caught during validation.

### Per-Deal Lender Settings

In the Excel sheet, rows 96–113 (lender settings) exist **per column** — each deal has its own rates, fees, and LTV. The app reflects this: `LenderSettings` is part of `DealCalculator` state, pre-filled from `DEFAULT_LENDER_SETTINGS`, and fully editable in the collapsible panel. Changing lender settings affects only the current deal (or all deals once persistence is wired).

### Custom Expenses

```typescript
interface CustomExpense {
  id: string           // random ID for React keying
  name: string         // user-provided label
  amountMonthly: number
  funded: boolean      // stub: funded expenses shown but not yet in calculations
}
```

Non-funded expenses are summed as `customExpenseTotal` and added to both `totalPITI` and `totalIOExpenses`. Funded expenses are stored and displayed but excluded from calculations — the stub behavior matches the eventual intent (funded expenses would be rolled into the loan, not subtracted from cash flow).

### Property Management — Editable Mode

```typescript
// DealInputs
pmMode: 'percent' | 'fixed'
pmRate: number    // 0.10 = 10% of rent
pmFixed: number   // dollar amount per month
```

In `calculations.ts`:
```typescript
const pmFee = pmMode === 'fixed' ? pmFixed : rent * pmRate
```

The PM fee feeds into `totalPITI`, `totalIOExpenses`, and the back-solved LTV calculation. The Cash Flow card label updates dynamically: `Property Management (10%)` vs `Property Management (fixed)`.

---

## FormField Component

`components/ui/FormField.tsx` handles four numeric types plus text and select:

| `type` prop | Storage | Display | Prefix/Suffix |
|---|---|---|---|
| `currency` | Raw number | Comma-formatted on blur | `$` |
| `percent` | Decimal (0.07) | User types `7`, stored as `0.07` | `%` |
| `integer` | Float (no rounding) | Plain digits | None |
| `text` | String | Controlled | None |
| `select` | String | Dropdown | None |

**Blur-to-commit pattern:** The input shows raw text while focused (`rawText` local state), commits on blur. Empty input commits as `0`. `NaN` also commits as `0`.

**Exception — HML annual rate:** The `hmlMonthlyRate` is stored in monthly decimal form (`0.008292` = 9.95%/yr ÷ 12). The LenderSettingsPanel field multiplies by 12 for display and divides by 12 on change, so the user always sees and enters an annual percentage.

---

## Tooltip Component

`components/ui/Tooltip.tsx` shows on hover (desktop) or tap (mobile):

```tsx
<button onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}>
  ?
</button>
```

The popup appears below-right of the `?` button (`top-5 right-0`). It contains:
1. A plain-English explanation of what the value means
2. An optional formula block in monospace

`pointer-events-none` on the popup prevents it from interfering with mouse-leave events.

`ResultRow` accepts an optional `tooltip` prop of type `{ content: string; formula?: string }`. Rows without a tooltip render identically to before.

---

## Bugs Found and Fixed During Validation

All bugs were caught by comparing app output against a known-good column (YB) from the Excel sheet.

### Bug 1 — HML Rehab Financing Fallback
**Symptom:** App showed HML loan of $174,080 instead of $160,000.
**Root cause:** `hmlLoanRehab = 0` (user entered "no rehab financing") fell through to `settings.hmlLeverageRehab * rehab = 14080`.
**Fix:** Introduce `useHmlDollars` mode: if *either* HML field has a dollar amount, *both* are treated as exact dollars.

### Bug 2 — Cash "Money Left in Deal" Missing Adjustments
**Symptom:** Cash scenario showed ~$69,442 instead of $52,414.
**Root cause:** `cashMoneyLeftInDeal = allInCost - cashFromLender` was missing the `otherAdjustmentsAtClose` deduction. The Excel sheet's row 55 applies the same deductions as row 39 (HML): `=YB15-YB54-8200-1720-1890`.
**Fix:** `cashMoneyLeftInDeal = allInCost - cashFromLender - otherAdjustmentsAtClose`.

### Bug 3 — ppFinanced / rehabFinanced Not in DealResults
**Symptom:** `ScenarioHML` referenced `r.ppFinanced` and `r.rehabFinanced` which were `undefined` — the fields existed as local constants but were never returned.
**Fix:** Added `ppFinancedAmt` and `rehabFinancedAmt` to `DealResults` and the `calculateDeal` return object.

### Bug 4 — refiClosingCosts Naming Mismatch
**Symptom:** `RefiCard` referenced `r.refiClosingCosts` which didn't exist in `DealResults` (the field is `refiTitleCosts`).
**Fix:** Renamed consistently to `refiTitleCosts` throughout types, calculations, and components.

---

## What The Excel Sheet Taught Us

The Excel sheet is **not** a rigid template with global settings. Discoveries:

1. **Lender settings are per-deal.** Rows 96–113 are different in every column. The "default" column C is just a starting point.
2. **Rehab months (row 12) is often manually overridden.** The formula `=(rehab+CO)/30000` is a suggestion; users type the actual expected duration.
3. **Closing costs on purchase (row 9) can be $0.** Some deals have no closing costs. Row 9 is empty in the YB column.
4. **Row 39 (money in deal) has deal-specific extra deductions.** `=YB24-YB38-8200-1720-1890` — the three numbers are deal-specific cash items (insurance prepaid, earnest money credit, etc.). The app uses `otherAdjustmentsAtClose` to capture these.
5. **The PITI formula in row 50 was customized for the YB deal** to exclude CapEx and PM. The app uses the template formula (rows 41–47 inclusive) which is more conservative and correct for investment analysis.
6. **The refi title costs in row 36 are sometimes hardcoded.** The formula `=IF(YB33>0, 5455+500-500, 0)` is deal-specific. The app uses `refiTitleCostsOverride` for this.

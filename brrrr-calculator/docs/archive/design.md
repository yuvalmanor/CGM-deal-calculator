> **Historical — describes the retired V1 calculator.** Kept for project history only; do not follow. The live app is documented in `CLAUDE.md`, `docs/architecture.md`, and `docs/calculations.md`. See `docs/adr/0002-v2-calculator-is-canonical.md`.

# UI & Design

## Design Principles

1. **Numbers first.** The calculator is a tool used mid-deal — information density matters more than whitespace aesthetics.
2. **Mobile-usable, not just mobile-supported.** The owner uses this on a phone while walking properties. Input fields must be large enough to tap; results must be scannable at a glance.
3. **No surprises.** Every calculated number has a `?` tooltip explaining what it is and how it's derived. The user should never need to look at the spreadsheet to understand a result.
4. **Conservative defaults.** Where formulas can go either way (e.g. include vs. exclude CapEx from PITI), we choose the conservative (lower NOI) interpretation.

---

## Layout

### Page Structure

```
┌─────────────────────────────────┐
│  Sticky header — nav            │
├─────────────────────────────────┤
│  Property Details  [card]       │
│  Custom Expenses   [card, coll] │
│  Lender Settings   [card, coll] │
│  ─ At a Glance ─                │
│  Scenario Analysis [card]       │
│    [mobile: tabs]               │
│    [desktop: 2 columns]         │
│  Cash-Out Refinance [card]      │
│  Monthly Cash Flow  [card]      │
│  MAO               [card]       │
└─────────────────────────────────┘
```

Cards are ordered by the natural sequence of a BRRRR deal analysis — you fill in what you know (inputs), then read results top-to-bottom.

### Responsive Breakpoint

The single meaningful breakpoint is `md` (768px), which is Tailwind's default medium.

- **Below `md`** (mobile/tablet portrait): single column throughout. Scenario Analysis shows a tab switcher.
- **`md` and above** (tablet landscape / desktop): Scenario Analysis shows two columns side by side — HML on the left, All-Cash on the right.

This was the explicit user preference: "tabs on mobile and two columns on desktop."

### Card Component

`components/ui/Card.tsx`

- White background, `border border-gray-200`, `rounded-xl`, light `shadow-sm`
- Colored 5px vertical left-edge accent (`h-5 w-1 rounded-full`)
- Optional `collapsible` mode — chevron toggles content visibility
- `defaultOpen` prop — Lender Settings defaults to closed (advanced), Custom Expenses defaults to closed unless expenses exist

**Color accents by section:**

| Section | Color |
|---|---|
| Property Details | `bg-green-500` |
| Custom Expenses | `bg-amber-400` |
| Lender Settings | `bg-orange-400` |
| Scenario Analysis | `bg-blue-400` |
| Cash-Out Refinance | `bg-violet-400` |
| Monthly Cash Flow | `bg-teal-400` |
| MAO | `bg-rose-400` |

---

## Color Coding

All result values are color-coded using a four-level system:

| Color | Tailwind class | Meaning |
|---|---|---|
| Green | `text-green-600` | Good / target met |
| Amber | `text-amber-500` | Marginal / borderline |
| Red | `text-red-500` | Bad / target missed |
| Default | `text-gray-800` | Neutral / informational |

### Applied thresholds:

| Metric | Green | Amber | Red |
|---|---|---|---|
| Monthly NOI | ≥ $300 | ≥ $0 | < $0 |
| Annual ROI | ≥ 8% | ≥ 5% | < 5% |
| Equity % | ≥ 20% | any | — |
| DSCR | ≥ 1.25 | ≥ 1.0 | < 1.0 |
| Net Cash at Closing | ≥ $0 | — | < $0 |
| MAO Discount | ≤ 10% | ≤ 20% | > 20% |

---

## FormField UX

### Blur-to-commit

All numeric fields use an `onFocus` / `onBlur` / `onChange` pattern:
- **Focus**: captures current value into `rawText` local state; shows plain digits
- **Type**: strips non-numeric characters (`[^0-9.]`), updates `rawText`
- **Blur**: parses `rawText`, calls parent `onChange` with the committed value

This avoids cursor jump and formatting interference while typing, while showing clean formatted values at rest.

### Empty = 0, not unset

Empty fields blur to `0`. The UI distinguishes "not entered" from "zero" via placeholder text and hint text (e.g. `"Auto: 2% of PP — type 0 to remove"`), not via null values in state.

### Percent fields

The user types `9.95`; the value is stored as `0.0995`. Display converts back: `value * 100`. This conversion is **not** exposed as a user-facing concept — the field simply shows `%` as a suffix and handles the math internally.

**Exception:** HML Annual Rate is stored monthly (`hmlMonthlyRate = 0.008292`). The field in `LenderSettingsPanel` multiplies by 12 for display and divides by 12 on commit, so the user always works in annual percentages.

### Currency fields

Show `$` prefix, comma-formatted at rest (e.g. `$247,995`). While typing, shows raw digits without formatting.

### Selector (segmented control) — PM Mode

The Property Management toggle (`% of Rent` / `Fixed $`) is implemented as two adjacent `<button>` elements styled to look like a segmented control, not a real `<select>`. The active option gets `bg-white shadow-sm text-gray-900`; inactive gets `text-gray-500 hover:text-gray-700`.

---

## ResultRow

`components/ui/ResultRow.tsx` is the primitive for all output display.

```tsx
<ResultRow
  label="Money Left in Deal"
  value="$60,208"
  sub="after refi and adjustments"
  highlight="green"
  bold
  indent        // adds pl-3, smaller text — for sub-lines
  separator     // renders a hairline above
  tooltip={{ content: "...", formula: "..." }}
/>
```

The `?` tooltip button sits inline after the label text. On hover/tap, a popup appears below-right of the button with:
1. A plain-English explanation
2. An optional monospace formula block with gray background

`pointer-events-none` on the popup prevents it from dismissing when the cursor moves from the button onto the popup text.

---

## SummaryBar

Four stat tiles displayed in a 2×2 grid (mobile) or 4-column row (sm+):

```
┌──────────┬──────────┬──────────┬──────────┐
│  ARV     │ All-In   │  Equity  │ Monthly  │
│ $300,000 │ $247,995 │  21.0%   │  $491    │
└──────────┴──────────┴──────────┴──────────┘
```

Color is applied to Equity (green if ≥ 20%) and Monthly NOI (green/amber/red). ARV and All-In are always neutral.

---

## Score Visualization

The Deal Score (0–30) uses a progress bar:

```
Deal Score          24 / 30
████████████████████░░░░░░░  (green)
```

Bar color: green (≥ 80% of 30 = 24+), amber (≥ 60% = 18+), red (< 18).

---

## Custom Expenses Panel

Each row:
```
[ Name input ........... ] [ $Amount /mo ] [ Not Funded | Funded · ] [ ✕ ]
```

- Not Funded (default): dark gray fill — expense flows through to NOI
- Funded: blue fill — displayed but excluded from calculations with a stub notice
- The `·` symbol (middle dot) marks the stub state visually; tooltip on hover explains "coming soon"

---

## Header

Sticky at the top (`sticky top-0 z-30`). Frosted glass effect via `bg-white/90 backdrop-blur-sm`. Contains:
- Logo mark (green rounded square `CG`)
- App name `CGM Ventures · Deal Calculator`
- Nav: `Deals` text link + `+ New Deal` green CTA button

---

## Typography and Spacing

All in Tailwind defaults:
- Labels: `text-xs font-medium text-gray-600`
- Section headers in forms: `text-xs font-semibold uppercase tracking-wide text-gray-400`
- Result values (normal): `text-sm font-medium`
- Result values (bold): `text-sm font-bold`
- Sub-text: `text-xs text-gray-400`
- Card padding: `px-5 py-4`
- Section spacing within cards: `space-y-4` between groups, `space-y-1` between result rows

---

## What's Not in the UI Yet

- **Dashboard deal cards** — `app/page.tsx` shows an empty state placeholder. Deal cards (property address, score badge, key metrics) will be built in Phase 3.
- **Save button** — The calculator has no save action until Sheets API is connected in Phase 2.
- **Edit existing deal** — `app/deal/[id]/page.tsx` does not exist yet; `DealCalculator` accepts `initialInputs` and `initialSettings` props for when it does.
- **Settings page** — `app/settings/page.tsx` does not exist. Global lender defaults will be manageable here in a future phase.

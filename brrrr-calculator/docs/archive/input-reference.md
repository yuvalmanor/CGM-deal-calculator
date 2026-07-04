> **Historical — describes the retired V1 calculator.** Kept for project history only; do not follow. The live app is documented in `CLAUDE.md`, `docs/architecture.md`, and `docs/calculations.md`. See `docs/adr/0002-v2-calculator-is-canonical.md`.

# Input Reference — What to Enter and When

This is a practical guide to every input field in the calculator, what it means, and how to fill it in for a real deal.

---

## Property Info

| Field | What to enter | Example |
|---|---|---|
| Address | Full street address | `1805 Cedar Wood Trl, Anna TX 75409` |
| Seller / Agent | Wholesaler name, MLS listing, or agent | `BSJ` |
| Property Type | Best match from dropdown | `SFR` |
| Sqft | Livable square footage from listing or tax records | `1621` |
| Year Built | From listing or county records | `2013` |

---

## Deal Numbers

| Field | What to enter | Notes |
|---|---|---|
| **Purchase Price (PP)** | Price you're evaluating or offering | Not the list price unless you're offering list |
| **ARV** | After-repair value from comps, or appraised value | The most important number — be conservative |
| **Rehab Estimate** | Your contractor's scope-of-work estimate | Exclude appliances and overruns (those go in Change Orders) |
| **Change Orders / Appliances** | Buffer above rehab estimate, paid OOP | Rule of thumb: 10–20% of rehab; appliances; contingency |
| **Market Rent /mo** | Gross monthly rent at stabilization | Check Rentometer, Zillow, local PMs |
| **Rehab Months** | How long rehab will actually take | Leave at `0` to auto-calculate from `(rehab + CO) / $30k/day`. Enter `1` or `2` if you know the timeline. |

---

## Monthly Expenses

Enter all as **monthly** dollar amounts.

| Field | Notes |
|---|---|
| **Property Tax** | Annual tax bill ÷ 12. Find on county appraisal district site. |
| **Insurance** | Annual landlord policy ÷ 12. Budget $100–$200/mo for SFR. |
| **HOA** | Monthly dues if applicable. |
| **State Income Tax** | Monthly state tax on rental income if your state charges it. |
| **Property Management** | Toggle between `% of Rent` (enter 8–12%) or `Fixed $` (if you have a specific PM agreement). Default is 10%. |
| **Mortgage IO /mo** | Optional. Enter the interest-only payment from your refi lender's quote for the IO comparison row. Calculated as `refi loan × annual rate ÷ 12`. |

---

## Custom Expenses

Add any expense not covered by the standard fields. Each entry has:
- **Name** — descriptive label (e.g. "Utilities", "Lawn Care", "Pool Service")
- **$/mo** — monthly cost
- **Not Funded / Funded toggle** — leave as "Not Funded" for any expense you pay out of pocket. "Funded" is a stub for future use.

Custom expenses marked **Not Funded** are included in PITI and reduce cash flow.

---

## Closing Adjustments

These fields override auto-calculations for deal-specific situations.

| Field | Default | When to override |
|---|---|---|
| **Closing Costs — Purchase** | Auto: PP × 2% | Enter `0` if seller is paying closing costs, or if this is a cash deal with no title costs. Enter the exact amount if you have a real estimate. |
| **Seasoning Months** | 4 | How many months before you can refi (your lender's seasoning requirement). Common values: 1, 3, 6, 12. |

---

## HML Loan — Actual Amounts

Leave both at `0` to use the leverage percentages in Lender Settings.

Enter dollar amounts when your HML lender has given you a specific loan commitment:

| Field | What to enter |
|---|---|
| **PP Financed by HML ($)** | Exact dollar amount the lender is financing toward the purchase |
| **Rehab Financed by HML ($)** | Exact dollar amount for the draw-based rehab line. Enter `0` if the lender is NOT financing rehab. |

**Important:** If you enter any number in either field (including `0` in one field), both fields are treated as exact dollars. `$0 rehab` means "no rehab financing" — it does NOT fall back to the leverage percentage.

---

## Refi Overrides

| Field | Default | When to override |
|---|---|---|
| **Refi LTV %** | Auto back-solved for $300/mo cash flow, capped at 65% | Enter `65` (or whatever your lender offers) when you have a specific LTV from a lender. Most common: `65`. |
| **Refi Title / Escrow ($)** | Auto: ARV × 2% + $500 | Enter the actual title/escrow quote from your closing attorney or title company. |
| **Other Adjustments at Close** | $0 | Enter the total of any credits, prepaid items, or seller concessions that reduce your net cash-in at closing. Example: seller gives you $8,200 credit + $1,720 prepaid insurance + $1,890 prorations = `11810`. |

---

## Lender Settings (HML)

Expand the "Lender Settings" panel and update these for each deal. Every deal uses different lender terms.

| Field | What to enter | Typical range |
|---|---|---|
| **Lender Name** | Name of the HML company | — |
| **Leverage % of PP** | What % of the purchase price they'll lend | 65–80% |
| **Leverage % of Rehab** | What % of rehab they'll fund | 0–100% |
| **Annual Interest Rate** | Their annual rate (app converts to monthly) | 10–14% |
| **Points %** | Origination points | 1–3% |
| **Appraisal / BPO** | Their appraisal fee | $0–$750 |
| **Underwriting Fees** | Admin/underwriting fee | $800–$2,000 |
| **Other Misc Fees** | Any other upfront fees | $0–$2,000 |
| **Extra / Additional Fees** | Any deal-specific additions not covered above | $0–$2,000 |

---

## Lender Settings (Refi)

| Field | What to enter | Typical range |
|---|---|---|
| **Lender Name** | Bank or credit union | — |
| **Annual Interest Rate** | 30-yr fixed rate | 6.5–8% (as of 2025–2026) |
| **Points %** | Origination points on the refi | 1–3% |
| **Appraisal / BPO** | Refi appraisal fee | $500–$1,000 |
| **Underwriting Fees** | Lender underwriting fee | $1,000–$2,000 |
| **Other Misc / Impound** | Misc + impound account setup | $500–$4,000 |

---

## MAO Targets

| Field | Default | Meaning |
|---|---|---|
| **Max Money in Deal** | $65,000 | The most capital you're willing to leave in one deal after refi. Change this to match your portfolio strategy. |
| **Min Equity % Post-Refi** | 20% | Minimum equity cushion required. 20% protects against market fluctuations and is typically the minimum for investor loans. |

---

## Deal Score

| Field | Notes |
|---|---|
| **Location / School Score** | Select the school district grade: A (10), B (9), C (8), D (6), F (0). Use GreatSchools.org or local knowledge. |
| **Comments** | Free text — lender names, deal structure notes, next steps, etc. |

---

## Reading the Results

### Key numbers to check first

1. **Net Cash at Closing** — Is it positive (full BRRRR) or negative (partial)?
2. **Money in Deal** — How much of your capital is permanently in this asset?
3. **Monthly NOI** — Is it ≥ $300? That's the minimum target.
4. **DSCR** — Is it ≥ 1.25? That's what the refi lender needs to see.
5. **Equity %** — Is it ≥ 20%? That's your safety cushion.
6. **Discount Needed** — How far below asking do you need to be? ≤ 10% is negotiable; > 25% requires a distressed seller.

### Score interpretation

| Score / 30 | Interpretation |
|---|---|
| 24–30 | Green light deal |
| 18–23 | Proceed with caution — review weak category |
| < 18 | Deal likely doesn't work at this price |

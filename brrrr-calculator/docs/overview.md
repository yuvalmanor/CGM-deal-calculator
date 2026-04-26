# Project Overview

## What This Is

A hosted, mobile-friendly real estate deal analyzer for CGM Ventures. It replicates every formula from the `CALC - BRRRR` tab of `Deal Calc CGM V2.xlsx` and improves on the spreadsheet with a cleaner UI, real-time recalculation, and eventually deal persistence via Google Sheets.

The full formula reference with flowchart lives in `../BRRRR_Cheat_Sheet.md`.

---

## The BRRRR Strategy

BRRRR stands for **Buy · Rehab · Rent · Refinance · Repeat**. The calculator evaluates a property under two parallel financing scenarios and answers the following questions for each:

| Question | Where answered |
|---|---|
| What does it cost to acquire and rehab? | Property Metrics |
| What do I make if I flip it? | Cash Flip / HML Flip |
| How much cash does the bank give me back at refi? | Cash-Out Refinance |
| What does it cash flow every month after refi? | Monthly Cash Flow (PITI) |
| How much of my own money is left in the deal? | Bottom Line — Cash / HML |
| What's the most I can pay? | Maximum Allowable Offer |

### Two Scenarios

**All-Cash scenario** — You buy with no lender involved at acquisition. Every dollar in the deal is yours. After refi, you recover some capital; the remainder stays in the asset.

**Hard Money (HML) scenario** — You use a short-term lender (HML) to finance part of the purchase and/or rehab. You bring in less cash upfront, which amplifies your ROI but adds fees and interest. After refi, you pay off the HML and recover (or owe) cash at closing.

In a **full BRRRR**, the refi pays off the HML *and* returns all your original cash — you end with $0 left in the deal and own the asset free of HML. In a **partial BRRRR**, some of your own capital remains in the deal after refi.

---

## Build Phases

### Phase 1 — Calculator UI ✅ Complete
Full calculator with real-time recalculation. All 50+ formulas from the Excel sheet implemented. No backend.

**What was built:**
- Property input form (address, PP, ARV, rehab, rent, expenses, overrides)
- Custom expense line items with funded/not-funded toggle
- Editable property management (% or fixed $)
- Lender settings panel (HML + Refi, fully configurable per deal)
- Scenario Analysis: HML and Cash side by side (tabs mobile / columns desktop)
- Cash-Out Refinance card
- Monthly Cash Flow / PITI card
- Maximum Allowable Offer card
- `?` tooltip on every calculated field showing formula and explanation
- At-a-Glance summary bar (ARV, All-In, Equity, Monthly NOI)
- Deal score (Equity + ROI + Location out of 30)

### Phase 2 — Google Sheets API 🔜 Next
Walk-through connecting the Sheets API via Next.js server-side API routes (credentials never exposed to the client).

### Phase 3 — Deal Persistence 🔜 Next
Save deals, list on dashboard, revisit and edit past analyses. Google Sheets acts as the database.

### Phase 4 — Vercel Deployment 🔜 Next
Deploy to a real URL, accessible from any device. Mobile layout tested and finalized.

---

## Source of Truth

The Excel file `Deal Calc CGM V2.xlsx` (parent directory) is the authoritative reference. Each column in the `CALC - BRRRR` tab is one property deal. All formula logic was reverse-engineered from that sheet, including:

- Per-deal lender settings (rows 96–113 per column — not global)
- Deal-specific formula overrides (rehab months, closing costs, LTV)
- Deal-specific cash adjustments at close (row 39: `=YB24-YB38-8200-1720-1890`)
- The `IFS()` scoring logic and both MAO formulas

Bugs discovered during development are documented in `architecture.md`.

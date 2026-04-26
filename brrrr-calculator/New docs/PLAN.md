# Execution Plan — CGM Ventures Deal Calculator
**Last updated:** Phase 2 planning

---

## Status Summary

| Phase | Name | Status |
|---|---|---|
| Phase 1 | Calculator logic + formula engine | ✅ Complete |
| Phase 1.5 | UI/UX overhaul (A → D) | ⚠️ Status unknown — verify before proceeding |
| Phase 2 | Google Sheets API + deal persistence | 🔜 Next |
| Phase 3 | Dashboard + deal management | ⏳ Planned |
| Phase 4 | Vercel deployment | ⏳ Planned |

---

## ✅ Phase 1 — Calculator Logic

All formulas implemented and verified against `Deal Calc CGM V2.xlsx` column C (Anna TX deal, col 18).
See `docs/calculations.md` for the full formula reference.
See `CHANGELOG.md` for bugs found and fixed.

---

## ⚠️ Phase 1.5 — UI/UX Overhaul

Planned per `docs/new/SPEC.md` v2.0. Completion status unverified.

**Before starting Phase 2:** run the session-start command, review the current UI state,
and confirm which of Phase 1.5's four sub-phases (A, B, C, D) are actually done.
Update CHANGELOG.md accordingly before proceeding.

Sub-phases:
- **A** — Custom expense data model (frequency: one-time / monthly / annual)
- **B** — Formula modal (click-triggered, central formulaRegistry, position: absolute)
- **C** — Two-panel layout (inputs left 320px sticky / results right scrollable)
- **D** — Results panel content (KPI strip, 3 scenario tabs, scorecard, MAO, custom expense summary)

---

## 🔜 Phase 2 — Google Sheets API + Deal Persistence

### Goal
Save and load deals via Google Sheets. The existing `Deal Calc CGM V2` Google Sheet file is used
as the database — but deals are written to a **new tab called `DEALS_APP`**, not to the existing
`CALC - BRRRR` tab. The original tab stays untouched and continues to work as a manual calculator.

### Why a separate tab (not adding columns to CALC - BRRRR)

The `CALC - BRRRR` tab has a complex structure: 120+ formula rows, merged cells, a colors legend,
and 16 existing deals in columns C–R with slight variations per column. Writing new columns
programmatically into that tab is fragile and risks breaking existing formulas and formatting.

The `DEALS_APP` tab is a clean flat table — one row per deal, simple columns, no formulas.
The existing tab stays exactly as it is. You can still use it manually at any time.

### Database: `DEALS_APP` tab structure

Each row = one saved deal. Columns:

| Col | Field | Type | Notes |
|---|---|---|---|
| A | `id` | string | UUID generated at save time |
| B | `address` | string | From `inputs.address` — for quick reading in Sheets |
| C | `savedAt` | string | ISO timestamp |
| D | `score` | number | Overall score X.X at time of save |
| E | `arv` | number | For quick reading in Sheets |
| F | `moneyInDeal` | number | For quick reading in Sheets |
| G | `monthlyNOI` | number | For quick reading in Sheets |
| H | `inputsJson` | string | Full `DealInputs` as JSON — used for loading |
| I | `settingsJson` | string | Full `LenderSettings` as JSON — used for loading |

Row 1 = header row with column names. Data starts at row 2.
The app creates the `DEALS_APP` tab automatically on first save if it doesn't exist.

### Technical approach

- **Auth:** Google Service Account (not OAuth). Service account granted editor access to the
  `Deal Calc CGM V2` spreadsheet. JSON key stored as a Vercel environment variable — never
  exposed to the client.
- **API layer:** Next.js server-side API routes. All Sheets API calls happen server-side only.
- **Client:** The React app calls `/api/deals` — never the Sheets API directly.

### Environment variables required

Add to `.env.local` (never commit this file):
```
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}  ← full JSON, stringified
GOOGLE_SHEET_ID=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms  ← from the spreadsheet URL
```

### One-time Google Cloud setup (done by user, not Claude Code)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project (or use an existing one)
3. Enable the **Google Sheets API**
4. Go to **IAM & Admin → Service Accounts** → Create service account
5. Download the JSON key file
6. Open `Deal Calc CGM V2` in Google Sheets
7. Click **Share** → paste the service account email → set to **Editor**
8. Copy the spreadsheet ID from the URL:
   `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
9. Add both values to `.env.local`

### API routes to build

| Route | Method | Purpose |
|---|---|---|
| `GET /api/deals` | GET | List all saved deals (reads `DEALS_APP` tab, returns metadata rows) |
| `POST /api/deals` | POST | Save a new deal (appends a row to `DEALS_APP`) |
| `GET /api/deals/[id]` | GET | Load a single deal by UUID (returns `inputsJson` + `settingsJson`) |
| `PUT /api/deals/[id]` | PUT | Update an existing deal row |
| `DELETE /api/deals/[id]` | DELETE | Remove a row from `DEALS_APP` |

### Files to build

#### 1. `lib/sheets.ts` — new file, server-side only
```typescript
// Never import this from a client component
import { google } from 'googleapis'

export async function listDeals(): Promise<DealSummary[]>
export async function saveDeal(inputs, settings, results): Promise<string>  // returns id
export async function loadDeal(id): Promise<{ inputs: DealInputs, settings: LenderSettings }>
export async function updateDeal(id, inputs, settings, results): Promise<void>
export async function deleteDeal(id): Promise<void>
```

Internal helpers:
- `getSheet()` — authenticates and returns the Sheets client + sheet ID
- `ensureDealsTab()` — creates `DEALS_APP` tab with header row if it doesn't exist
- `findRowById(id)` — scans column A to find a deal's row number

#### 2. `app/api/deals/route.ts` — new file
- `GET`: calls `listDeals()`, returns JSON array of `DealSummary`
- `POST`: validates body, calls `saveDeal()`, returns `{ id }`

#### 3. `app/api/deals/[id]/route.ts` — new file
- `GET`: calls `loadDeal(id)`, returns `{ inputs, settings }`
- `PUT`: calls `updateDeal(id, ...)`, returns `{ ok: true }`
- `DELETE`: calls `deleteDeal(id)`, returns `{ ok: true }`

#### 4. `app/deal/[id]/page.tsx` — new file
- Server component: fetches `GET /api/deals/[id]`
- Passes `initialInputs` and `initialSettings` to `DealCalculator`
- Shows loading state; handles 404 gracefully

#### 5. `DealCalculator.tsx` — add Save/Update button
- "Save Deal" button in the deal header (top right of right panel)
- First save: `POST /api/deals` with current state → stores returned `id` in component state
- Subsequent saves (same deal): `PUT /api/deals/[id]`
- Success: brief "Saved ✓" indicator, then reverts to "Save Deal"
- Error: show error message, do not lose user's work

### Acceptance criteria

- [ ] **Excel verification passes — ALL GREEN** before and after every file change
- [ ] `npm install googleapis` added; `npx tsc --noEmit` passes
- [ ] `DEALS_APP` tab is created automatically on first save (if it doesn't exist)
- [ ] `POST /api/deals` saves a deal; row appears in `DEALS_APP` tab in Google Sheets
- [ ] `GET /api/deals` returns the saved deal in the list
- [ ] `GET /api/deals/[id]` returns correct inputs and settings that fully restore the deal
- [ ] `PUT /api/deals/[id]` updates the row; changes visible in Sheets
- [ ] `DELETE /api/deals/[id]` removes the row from Sheets
- [ ] Loading `/deal/[id]` in the browser pre-fills all inputs and settings correctly
- [ ] Saving does not modify any formula or calculated output
- [ ] "Save Deal" button shows confirmation, then allows re-save (PUT)
- [ ] Service account key never appears in client bundle (`server-only` or API route only)
- [ ] All API routes return correct HTTP status codes (200, 201, 404, 500)
- [ ] `npx tsc --noEmit` → zero errors after all files added

---

## ⏳ Phase 3 — Dashboard + Deal Management

### Goal
Replace the empty state on `app/page.tsx` with a real deal list. Browse, open, and delete saved deals.

### Files to build

#### `app/page.tsx` — dashboard
- Fetch `GET /api/deals` on load
- Render deal cards in a grid (desktop) / list (mobile)
- Each card: address, score badge (GO/NO-GO color), ARV, money in deal, monthly NOI, date saved
- Click → navigate to `/deal/[id]`

#### `components/DealCard.tsx` — new file
- Props: `DealSummary` (id, address, score, arv, moneyInDeal, monthlyNOI, savedAt)
- Score badge: green pill (GO, ≥ 7.0) or red pill (NO-GO, < 7.0)
- Delete button with confirmation dialog

#### `+ New Deal` button
- Already in header — navigates to `/deal/new`
- `DealCalculator` with no `initialInputs` uses `DEFAULT_DEAL_INPUTS`

### Acceptance criteria

- [ ] Dashboard loads and displays all saved deals from `DEALS_APP` tab
- [ ] Each card shows correct address, score, ARV, money in deal, monthly NOI
- [ ] Score badge color matches GO/NO-GO threshold
- [ ] Clicking a card opens the deal in the calculator with all inputs pre-filled
- [ ] Delete removes the deal from Sheets and from the dashboard
- [ ] Empty state shown when no deals are saved
- [ ] `+ New Deal` opens a blank calculator

---

## ⏳ Phase 4 — Vercel Deployment

### Goal
Deploy to a real URL accessible from any device. Test mobile on a real phone.

### Steps
1. Ensure `.env.local` is in `.gitignore` (never commit credentials)
2. `git init` + push to GitHub repository
3. Import project in Vercel dashboard
4. Add environment variables in Vercel dashboard:
   - `GOOGLE_SERVICE_ACCOUNT_KEY`
   - `GOOGLE_SHEET_ID`
5. Deploy → get live URL
6. Test on real iPhone:
   - All input fields tap-friendly
   - Formula modals open/close on tap
   - Save Deal works end-to-end
   - Load deal from dashboard works

### Acceptance criteria

- [ ] App loads at Vercel URL without errors
- [ ] Mobile layout correct on real device (not just browser resize)
- [ ] Full flow: Save Deal → dashboard → open saved deal → all inputs restored
- [ ] No credentials in client bundle or git history
- [ ] `npx tsc --noEmit` passes before deploy

---

## Excel Verification Protocol (all phases)

After every code modification, run:
```bash
python scripts/verify_excel.py
```
Must pass ALL 12 checks. See `docs/new/VERIFY_GUIDE.md` for full details.
Zero tolerance: any failure = stop and fix immediately.

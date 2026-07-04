> **Historical — describes the retired V1 calculator.** Kept for project history only; do not follow. The live app is documented in `CLAUDE.md`, `docs/architecture.md`, and `docs/calculations.md`. See `docs/adr/0002-v2-calculator-is-canonical.md`.

# Roadmap & Future Work

## Phase 2 — Google Sheets API

### Goal
Wire up the "Save Deal" button to persist deal data in a Google Sheet. The sheet acts as the database. Credentials never reach the client — all API calls go through Next.js server-side API routes.

### Authentication approach
Use a **Google Service Account** (not OAuth). The service account is granted editor access to the target spreadsheet. The JSON key is stored as a Vercel environment variable.

### API routes to build

| Route | Method | Purpose |
|---|---|---|
| `/api/deals` | `GET` | List all deals (reads "index" tab) |
| `/api/deals` | `POST` | Save a new deal (appends a column) |
| `/api/deals/[id]` | `GET` | Load a single deal by ID |
| `/api/deals/[id]` | `PUT` | Update an existing deal |

### Sheet structure (proposed)
- One tab called `DEALS_INDEX`: one row per deal, columns = deal metadata (id, address, date saved, score)
- One tab per deal named by deal ID: stores all `DealInputs` and `LenderSettings` as key-value pairs

Or alternatively: store all deal data as a JSON blob in a single column of `DEALS_INDEX`.

### Step-by-step walkthrough for the user
1. Create a Google Cloud project
2. Enable Google Sheets API
3. Create a service account, download JSON key
4. Share the target spreadsheet with the service account email
5. Add the JSON key as `GOOGLE_SERVICE_ACCOUNT_KEY` in Vercel env vars
6. Add sheet ID as `GOOGLE_SHEET_ID` in env vars

---

## Phase 3 — Deal Persistence

### Dashboard
Replace the empty state in `app/page.tsx` with real deal cards. Each card shows:
- Property address
- Key metrics: ARV, All-In, Money in Deal, Monthly NOI
- Deal score (colored badge)
- Date saved

### Save button
Add a `Save Deal` button to `DealCalculator.tsx`. On click:
1. POST to `/api/deals`
2. On success: show a success toast / redirect to dashboard

### Load existing deal
`app/deal/[id]/page.tsx` — fetch deal by ID from Sheets API, pass as `initialInputs` and `initialSettings` to `DealCalculator`.

### Edit flow
Load → modify → save (PUT to update the existing row).

---

## Phase 4 — Vercel Deployment

### Deploy steps
1. `git init` in `brrrr-calculator/`
2. Push to GitHub
3. Import project in Vercel dashboard
4. Set environment variables (Sheets key, Sheet ID)
5. Deploy → get live URL

### After deployment
- Test on phone immediately (mobile layout validation)
- Check all input fields are tap-friendly
- Verify tooltips work on touch (tap to open, tap elsewhere to close)

---

## Known Improvement Areas (Post-Launch)

### Funded Expenses (stub → real)
When a custom expense is marked "Funded", it should eventually be deducted from the HML draw or refi loan rather than cash flow. The toggle is built; the calculation integration is a stub.

### PM Rate Reflected in MAO
The MAO formulas currently assume 10% PM in their backward-solving algebra. If the user sets a custom PM rate or fixed amount, the MAO should account for it. This requires updating the MAO formula in `calculations.ts`.

### BRRRR Repeat Modeling
A "Repeat" tab that models what happens after you pull capital out and redeploy it — tracking portfolio-level capital velocity across multiple BRRRR cycles.

### Comparison View
Show multiple saved deals side by side on the dashboard (like the original spreadsheet where each column is a deal).

### Import from Excel
Parse a column from `Deal Calc CGM V2.xlsx` directly to pre-fill the calculator — skipping manual re-entry for past deals.

### Print / PDF Export
A clean print view of the full deal analysis — shareable with partners or lenders.

### Deal Templates
Save a "default deal" with common lender settings pre-filled (e.g. your standard HML lender's terms) so new deals start partially filled out.

---

## Decisions Deferred

| Decision | Reason deferred |
|---|---|
| Authentication / multi-user | Single user for now; no auth needed until shared access is required |
| Row-level DB vs. Sheets | Sheets was specified; revisit if Sheets API rate limits become a problem at scale |
| shadcn/ui or Radix | Custom components are working; adding a UI library adds setup complexity without clear benefit at current feature scope |
| Dark mode | Not requested; Tailwind dark mode support could be added later with `class` strategy |
| Automated tests | No test runner set up; the Python verification script against the Excel file serves as the primary correctness check |

import { fmtCurrency, fmtPct, fmtNum, totalRehab, mapLocationScore } from './deal-model'
import type { Deal, BRRRRResult, MAOResult, DealScore } from './deal-model'

export interface FormulaEntry {
  title: string
  formula: string
  calcFn: (deal: Deal, brrrr: BRRRRResult, mao: MAOResult, score: DealScore) => string
  note: string
}

export const formulaRegistry: Record<string, FormulaEntry> = {

  // ── Dashboard KPIs ───────────────────────────────────────────────────────────

  cashflow: {
    title: 'Monthly cashflow',
    formula: 'Gross Rent − Total Operating Expenses − Refi P&I',
    calcFn: (d, b) =>
      `${fmtCurrency(d.monthlyRent)} − ${fmtCurrency(b.totalOpex)} − ${fmtCurrency(b.refiPI)} = ${fmtCurrency(b.cashflow)}/mo`,
    note: 'Net monthly income after all expenses and the long-term mortgage payment. Target: ≥ $200/mo.',
  },

  coc: {
    title: 'Cash-on-Cash ROI',
    formula: '(Monthly Cashflow × 12) ÷ Money in Deal',
    calcFn: (d, b) => {
      if (!Number.isFinite(b.coc)) return `Money in deal ≤ $0 → infinite return (full BRRRR)`
      return `(${fmtCurrency(b.cashflow)} × 12) ÷ ${fmtCurrency(b.moneyInDeal)} = ${fmtPct(b.coc)}`
    },
    note: 'Annual return on the capital still deployed after the cash-out refinance. Target: ≥ 8–10%.',
  },

  dscr: {
    title: 'DSCR (Debt Service Coverage Ratio)',
    formula: 'Gross Rent ÷ (Refi P&I + Tax + Insurance)',
    calcFn: (d, b) =>
      `${fmtCurrency(b.monthlyRent)} ÷ (${fmtCurrency(b.refiPI)} + tax + ins) = ${fmtNum(b.dscr)}`,
    note: 'Per cheat sheet row 52. Lenders want DSCR ≥ 1.25. Uses rent, not NOI, in numerator.',
  },

  equity: {
    title: 'Forced Equity % (vs all-in cost)',
    formula: '(ARV − Total Project Cost) ÷ Total Project Cost',
    calcFn: (d, b) =>
      `(${fmtCurrency(d.arv)} − ${fmtCurrency(b.totalProjectCost)}) ÷ ${fmtCurrency(b.totalProjectCost)} = ${fmtPct(b.equityMarginArv)}`,
    note: 'Equity margin relative to all-in cost. Measures how much value was created vs. the purchase+rehab cost.',
  },

  moneyInDeal: {
    title: 'Money in deal',
    formula: '(Total Project Cost − HML loan + HML fees) − Cash Returned at Refi',
    calcFn: (d, b) =>
      `${fmtCurrency(b.totalCashIn)} (Total Cash In: TPC − HML loan + fees) − ${fmtCurrency(b.cashReturnedAtRefi)} = ${fmtCurrency(b.moneyInDeal)}`,
    note: 'Capital permanently tied up after refinancing. Total Cash In = Total Project Cost − HML loan amount + HML fees (points + lender fees + post-closing misc + extras). $0 or negative = full BRRRR (cash back). Target: ≤ $65k.',
  },

  mao: {
    title: 'Maximum Allowable Offer',
    formula: 'min(70% Rule, Money-in-Deal ≤ target, Equity post-Refi ≥ target)',
    calcFn: (d, _b, m) =>
      `70% Rule: ${fmtCurrency(m.mao70)}\nMoney in deal ≤ $${(d.maxMoneyInDeal/1000).toFixed(0)}k: ${fmtCurrency(m.maoMoneyInDeal)}\nEquity post-Refi ≥ ${d.minEquityPct}%: ${fmtCurrency(m.maoEquity)}\nBinding: ${m.constraint} → ${fmtCurrency(m.mao)}`,
    note: 'Your offer price vs. the binding MAO constraint. Positive delta = you are below MAO (favorable).',
  },

  // ── Deal Anatomy ─────────────────────────────────────────────────────────────

  pp: {
    title: 'Purchase price',
    formula: 'Input — negotiated price',
    calcFn: (d) =>
      d.sqft > 0
        ? `${fmtCurrency(d.purchasePrice)} (${fmtCurrency(d.purchasePrice / d.sqft)}/sqft)`
        : `${fmtCurrency(d.purchasePrice)}`,
    note: 'The price you are evaluating or negotiating. Drives all downstream calculations.',
  },

  rehab_total: {
    title: 'Total rehab',
    formula: 'Rehab Estimate + Change Orders',
    calcFn: (d) => {
      const co = d.changeOrdersMode === 'pctOfRehab'
        ? d.rehabEstimate * (d.changeOrdersPct / 100)
        : d.changeOrdersFixed
      return `${fmtCurrency(d.rehabEstimate)} + ${fmtCurrency(co)} = ${fmtCurrency(totalRehab(d))}`
    },
    note: 'Change orders are out-of-pocket (not financed). Add a 10–20% buffer for surprises.',
  },

  closing_buy: {
    title: 'Closing costs — purchase',
    formula: 'Input (or PP × 2% default)',
    calcFn: (d) => `${fmtCurrency(d.closingCostsBuy)}`,
    note: 'Covers title, escrow, and lender fees on the purchase side.',
  },

  total_project_cost: {
    title: 'Total project cost',
    formula: 'Purchase Price + Total Rehab + Additional Rehab Costs + Closing Costs (buy) + One-Time Costs + Holding Costs − Project Cost Adjustments',
    calcFn: (d, b) => {
      const addl = (d.rehabAdditionalCosts || []).reduce((s, c) => s + (c.amount || 0), 0)
      const oneTime = (d.oneTimeCosts || []).reduce((s, c) => s + (c.amount || 0), 0)
      return `${fmtCurrency(d.purchasePrice)} + ${fmtCurrency(b.rehab)} + ${fmtCurrency(addl)} + ${fmtCurrency(d.closingCostsBuy)} + ${fmtCurrency(oneTime)} + ${fmtCurrency(b.holdingCosts)} − ${fmtCurrency(d.projectCostAdjustments)} = ${fmtCurrency(b.totalProjectCost)}`
    },
    note: 'All-in cost of acquiring and rehabbing the property, before any financing. Includes total rehab (estimate + change orders), additional rehab costs, purchase-side closing, one-time costs, and holding costs. Project Cost Adjustments (seller concessions, EM credits, etc.) are subtracted as credits.',
  },

  // ── HML ──────────────────────────────────────────────────────────────────────

  hml_principal: {
    title: 'HML loan amount',
    formula: 'PP × LevPP% + Rehab × LevRehab%',
    calcFn: (d, b) =>
      `${fmtCurrency(d.purchasePrice)} × ${d.hmlLevPP.toFixed(1)}% + ${fmtCurrency(b.rehab)} × ${d.hmlLevRehab}% = ${fmtCurrency(b.hmlPrincipal)}`,
    note: 'Total hard money loan (purchase leverage + rehab leverage).',
  },

  hml_monthly_interest: {
    title: 'Monthly HML interest',
    formula: 'HML Principal × (Annual Rate ÷ 12)',
    calcFn: (d, b) =>
      `${fmtCurrency(b.hmlPrincipal)} × (${d.hmlRate}% ÷ 12) = ${fmtCurrency(b.hmlMonthlyInterest)}/mo`,
    note: 'Interest accrues monthly. Every extra month in rehab adds this cost.',
  },

  cashflow_hml_phase: {
    title: 'Monthly cashflow — HML phase',
    formula: 'Gross Rent − Total Operating Expenses − HML Monthly Interest',
    calcFn: (d, b) =>
      `${fmtCurrency(d.monthlyRent)} − ${fmtCurrency(b.totalOpex)} − ${fmtCurrency(b.hmlMonthlyInterest)} = ${fmtCurrency(d.monthlyRent - b.totalOpex - b.hmlMonthlyInterest)}/mo`,
    note: `The same calculation as Monthly cashflow, with the HML's interest-only payment as the debt service instead of the refi P&I — what the property carries while it is still on hard money.

Assumes the stabilized rent is already coming in. During rehab it usually is not, so read this as the post-rehab, pre-refi picture (e.g. while waiting out seasoning), not the rehab months themselves.`,
  },

  hml_carry: {
    title: 'HML interest carry',
    formula: 'Monthly Interest × max(Rehab Months, Seasoning Months)',
    calcFn: (d, b) =>
      `${fmtCurrency(b.hmlMonthlyInterest)} × ${b.hmlCarryMonths} mo = ${fmtCurrency(b.hmlCarryInterest)}`,
    note: 'Carry runs through seasoning if that exceeds rehab duration (Fix C: seasoning deficit).',
  },

  hml_total_cost: {
    title: 'Total HML cost (fees)',
    formula: 'Points + Lender Fees + Post-Closing Misc + Extra Fees',
    calcFn: (d, b) =>
      `${fmtCurrency(b.hmlPointsDollar)} + ${fmtCurrency(d.hmlLenderFees)} + ${fmtCurrency(d.hmlPostClosingMisc)} + extras = ${fmtCurrency(b.hmlTotalCost)}`,
    note: 'Fee-only cost of the HML — excludes interest carry (shown separately). Interest carry adds to "Total debt to HML".',
  },

  // ── Refi ─────────────────────────────────────────────────────────────────────

  refi_loan: {
    title: 'Refinance loan amount',
    formula: 'ARV × Refi LTV%',
    calcFn: (d, b) =>
      `${fmtCurrency(d.arv)} × ${d.refiLtv}% = ${fmtCurrency(b.refiLoan)}`,
    note: 'DSCR lenders typically offer 65% LTV for investment properties.',
  },

  refi_pi: {
    title: 'Refi P&I payment',
    formula: 'Loan × (monthly rate) ÷ (1 − (1 + r)^−n)',
    calcFn: (d, b) =>
      `${fmtCurrency(b.refiLoan)} at ${d.refiRate}% / ${d.refiTermYears}yr = ${fmtCurrency(b.refiPI)}/mo`,
    note: '30-year fixed amortization. Principal + interest only — taxes and insurance are separate.',
  },

  refi_total: {
    title: 'Total Refi closing cost',
    formula: 'Points + Title/Escrow + Appraisal + Underwriting + Other + Extra Fees',
    calcFn: (d, b) => {
      const extras = (d.refiExtraFees || []).reduce((s, f) => s + (f.amount || 0), 0)
      return `${fmtCurrency(b.refiPointsDollar)} + ${fmtCurrency(b.refiTitleEscrow)} + ${fmtCurrency(d.refiAppraisal)} + ${fmtCurrency(d.refiUnderwriting)} + ${fmtCurrency(d.refiOtherMisc)} + ${fmtCurrency(extras)} = ${fmtCurrency(b.refiTotalClosing)}`
    },
    note: 'All costs paid at the Refi closing. Points = Refi Loan × Refi Points%. Title/Escrow auto-defaults to ARV × 2% + $500 if not overridden.',
  },

  cash_returned: {
    title: 'Cash returned at Refi',
    formula: 'Refi Loan − Total Debt to HML − Refi Closing Costs',
    calcFn: (d, b) =>
      `${fmtCurrency(b.refiLoan)} − ${fmtCurrency(b.hmlTotalDebt)} (principal + carry) − ${fmtCurrency(b.refiTotalClosing)} = ${fmtCurrency(b.cashReturnedAtRefi)}`,
    note: 'Total HML debt (principal + accrued interest) is paid off at refi close. Positive = cash back. Negative = partial BRRRR.',
  },

  // ── Monthly operating ────────────────────────────────────────────────────────

  gross_rent: {
    title: 'Gross rent',
    formula: 'Input — market monthly rent',
    calcFn: (d) => `${fmtCurrency(d.monthlyRent)}/mo`,
    note: 'Conservative market rent. All expense ratios apply against this figure.',
  },

  mortgage_pi: {
    title: 'Mortgage P&I',
    formula: 'PMT(Refi Rate ÷ 12, Refi Term × 12, Refi Loan)',
    calcFn: (d, b) =>
      `PMT(${d.refiRate}% ÷ 12, ${d.refiTermYears} yr × 12, ${fmtCurrency(b.refiLoan)}) = ${fmtCurrency(b.refiPI)}/mo`,
    note: 'Principal + interest on the long-term refinance loan, fully amortising over the refi term. Excluded from NOI (which is unlevered) but subtracted in monthly cashflow, and it is the debt service in DSCR.',
  },

  total_opex: {
    title: 'Total operating expenses',
    formula: 'Tax + Ins + HOA + State Tax + CapEx + Mgmt + Additional',
    calcFn: (d, b) => `${fmtCurrency(b.totalOpex)}/mo`,
    note: 'All monthly expenses before debt service.',
  },

  noi: {
    title: 'Monthly NOI',
    formula: 'Gross Rent − Total Operating Expenses',
    calcFn: (d, b) =>
      `${fmtCurrency(d.monthlyRent)} − ${fmtCurrency(b.totalOpex)} = ${fmtCurrency(b.noi)}/mo`,
    note: 'Net Operating Income — unlevered property income. Used for DSCR and Cap Rate calculations.',
  },

  // ── Advanced metrics ─────────────────────────────────────────────────────────

  cap_rate: {
    title: 'Cap Rate',
    formula: '(Monthly NOI × 12) ÷ ARV',
    calcFn: (d, b) =>
      `(${fmtCurrency(b.noi)} × 12) ÷ ${fmtCurrency(d.arv)} = ${fmtPct(b.capRate)}`,
    note: `The property's annual return assuming no mortgage. Calculated as NOI ÷ ARV, where NOI includes all operating expenses (including CapEx) but excludes debt service.

< 5% — weak · 5–7% — healthy · 7–9% — strong · > 9% — high risk or exceptional deal, check area quality

"What percentage of the property's value do I earn back every year from rent, after paying all operating costs?"`,
  },

  grm: {
    title: 'GRM (Gross Rent Multiplier)',
    formula: 'ARV ÷ (Monthly Rent × 12)',
    calcFn: (d, b) =>
      `${fmtCurrency(d.arv)} ÷ (${fmtCurrency(d.monthlyRent)} × 12) = ${b.grm.toFixed(1)}×`,
    note: `A quick valuation ratio — how many years of gross rent equal the property's value. Lower is better.

< 8 — strong · 8–12 — healthy · 12–15 — thin · > 15 — cashflow unlikely

"How many years of gross rent would it take to equal the property's market value?"`,
  },

  annual_cashflow: {
    title: 'Annual cashflow',
    formula: 'Monthly Cashflow × 12',
    calcFn: (d, b) =>
      `${fmtCurrency(b.cashflow)}/mo × 12 = ${fmtCurrency(b.annualCashflow)}/yr`,
    note: `Total annual income after all expenses and debt service. Click the dollar amount in the Advanced Metrics cell to toggle between including or excluding CapEx/vacancy reserve in the operating expenses.

• "w/ capex" — includes CapEx & vacancy reserve (true long-run cashflow)
• "no capex" — excludes the reserve (cashflow before setting money aside)`,
  },

  roe: {
    title: 'Return on Equity (ROE)',
    formula: '(Annual Cashflow) ÷ Book Equity $',
    calcFn: (d, b) =>
      `${fmtCurrency(b.annualCashflow)}/yr ÷ ${fmtCurrency(b.equityDollar)} = ${fmtPct(b.roe)}`,
    note: `How hard your equity is working for you. Calculated as Annual Cashflow ÷ Equity in the property. Unlike CoC, ROE decreases over time as equity grows through appreciation and amortization — even if cashflow stays flat. Use it as a hold/refi/sell trigger: when ROE drops too low, your equity may work harder elsewhere.

< 4% — weak · 4–7% — acceptable · 7–10% — healthy · > 10% — strong

"For every dollar of equity I own in this property, how much cashflow am I generating?"`,
  },

  equity_book: {
    title: 'Book equity post-Refi',
    formula: 'Equity $ = ARV − Refi Loan\nEquity % = (Equity $ − Money in Deal) ÷ Money in Deal',
    calcFn: (d, b) =>
      `Equity $: ${fmtCurrency(d.arv)} − ${fmtCurrency(b.refiLoan)} = ${fmtCurrency(b.equityDollar)}\n`
      + `Equity %: (${fmtCurrency(b.equityDollar)} − ${fmtCurrency(b.moneyInDeal)}) ÷ ${fmtCurrency(b.moneyInDeal)} = ${fmtPct(b.equityPct)}`,
    note: 'Equity $ is ownership value assuming you hold (no sale costs deducted). Equity % expresses the return on money left in the deal — how much equity you have created per dollar still tied up after the refinance.',
  },

  equity_liquidation: {
    title: 'Liquidation equity post-Refi',
    formula: 'ARV × (1 − Selling Costs%) − Refi Loan',
    calcFn: (d, b) =>
      `${fmtCurrency(d.arv)} × (1 − ${d.sellingCostsPct}%) − ${fmtCurrency(b.refiLoan)} = ${fmtCurrency(b.equityLiquidationDollar)} (${fmtPct(b.equityLiquidationPct)})`,
    note: 'Equity after selling costs — what you would actually net if you sold today.',
  },

  equity_margin_arv: {
    title: 'Equity Margin on ARV',
    formula: '(ARV − All-In Cost) ÷ ARV',
    calcFn: (d, b) =>
      `(${fmtCurrency(d.arv)} − ${fmtCurrency(b.totalProjectCost)}) ÷ ${fmtCurrency(d.arv)} = ${fmtPct(b.equityMarginOnArv)}`,
    note: `How much cushion exists between what you spent and the property's market value, expressed as a percentage of ARV. Calculated as (ARV − All-In Cost) ÷ ARV. Directly reflects the 70% rule — a 30% margin means you're all-in at 70% of ARV.

< 20% — dangerous · 20–25% — minimum · 25–35% — healthy · > 35% — strong

"How wrong can my ARV estimate be before I lose money on this deal?"`,
  },

  forced_equity_roi: {
    title: 'Forced Equity ROI',
    formula: '(ARV − Total Project Cost) ÷ Total Project Cost',
    calcFn: (d, b) =>
      `(${fmtCurrency(d.arv)} − ${fmtCurrency(b.totalProjectCost)}) ÷ ${fmtCurrency(b.totalProjectCost)} = ${fmtPct(b.equityMarginArv)}`,
    note: `How much equity you created relative to the total capital deployed into the deal (your cash + loan). Calculated as (ARV − All-In Cost) ÷ All-In Cost. Measures how efficiently the deal converted invested capital into equity — regardless of how it was financed.

< 20% — weak · 20–30% — acceptable · 30–35% — good · > 35% — strong

"For every dollar deployed into this deal, how much equity was created?"`,
  },

  equity_pct_book: {
    title: 'True Equity % (book)',
    formula: '(ARV − Refi Loan) ÷ ARV',
    calcFn: (d, b) =>
      `(${fmtCurrency(d.arv)} − ${fmtCurrency(b.refiLoan)}) ÷ ${fmtCurrency(d.arv)} = ${fmtPct((d.arv - b.refiLoan) / (d.arv || 1))}`,
    note: 'Ownership share of the property after the cash-out refinance, before any sale costs. Effectively (1 − Refi LTV).',
  },

  equity_multiplier: {
    title: 'Equity Multiplier',
    formula: 'Property Equity Post-Refi ÷ Money in Deal',
    calcFn: (d, b) =>
      `(${fmtCurrency(d.arv)} − ${fmtCurrency(b.refiLoan)}) ÷ ${fmtCurrency(b.moneyInDeal)} = equity created per dollar still in the deal`,
    note: 'How many dollars of post-refi equity you control per dollar of capital still tied up. Higher = more leverage on remaining cash.',
  },

  annual_cashflow_hml_pi: {
    title: 'Annual Cashflow — HML · P&I',
    formula: '(Gross Rent − PITI − OpEx) × 12  (post-refi P&I)',
    calcFn: (d, b) =>
      `Monthly NOI (post-refi P&I) × 12 — HML scenario`,
    note: 'Annual net cashflow under the HML/refi scenario, using fully-amortizing principal + interest on the refi loan.',
  },

  annual_cashflow_hml_io: {
    title: 'Annual Cashflow — HML · Interest-Only',
    formula: '(Gross Rent − Interest-Only debt − OpEx) × 12',
    calcFn: () => `Monthly NOI (interest-only debt) × 12 — HML scenario`,
    note: 'Annual cashflow if the refi debt service were interest-only instead of fully amortizing. Higher than P&I — principal is not being paid down.',
  },

  annual_cashflow_cash_pi: {
    title: 'Annual Cashflow — Cash · P&I',
    formula: '(Gross Rent − PITI − OpEx) × 12  (all-cash buy)',
    calcFn: () => `Monthly NOI (post-refi P&I) × 12 — all-cash scenario`,
    note: 'Annual cashflow under the all-cash purchase scenario with P&I debt service applied.',
  },

  annual_cashflow_cash_io: {
    title: 'Annual Cashflow — Cash · Interest-Only',
    formula: '(Gross Rent − Interest-Only debt − OpEx) × 12  (all-cash buy)',
    calcFn: () => `Monthly NOI (interest-only) × 12 — all-cash scenario`,
    note: 'Annual cashflow under the all-cash purchase scenario with interest-only debt service.',
  },

  roe_hml: {
    title: 'Return on Equity — HML',
    formula: 'Annual Cashflow (HML P&I) ÷ Property Equity Post-Refi',
    calcFn: (d, b) =>
      `Annual CF (HML P&I) ÷ (${fmtCurrency(d.arv)} − ${fmtCurrency(b.refiLoan)})`,
    note: 'Return on the equity locked into the property post-refi (ARV − Refi Loan), under the HML scenario.',
  },

  roe_cash: {
    title: 'Return on Equity — Cash',
    formula: 'Annual Cashflow (Cash P&I) ÷ ARV',
    calcFn: (d) =>
      `Annual CF (Cash P&I) ÷ ${fmtCurrency(d.arv)}`,
    note: 'All-cash scenario divides annual cashflow by ARV (full equity ownership, no loan). Effectively an unlevered yield on as-repaired value.',
  },

  irr_scenarios: {
    title: '5-Year IRR (appreciation scenarios)',
    formula: `IRR of: [−hmlMoneyInDeal, CF_yr1, CF_yr2, CF_yr3, CF_yr4, CF_yr5 + exitProceeds]
Where:
  exitProceeds = ARV × (1 + appreciationRate)^5 × 0.92 − remainingLoanBalance
  Solved iteratively (Newton-Raphson / bisection)
  Annualized as: (1 + monthlyIRR)^12 − 1
Run across 3 scenarios: 2%, 3%, 4% annual appreciation`,
    calcFn: (d, b) =>
      `2% appreciation: ${fmtPct(b.irr2pct)}\n3% appreciation: ${fmtPct(b.irr3pct)}\n4% appreciation: ${fmtPct(b.irr4pct)}\nExit = ARV × (1+rate)^5 × (1−${d.sellingCostsPct}%) − remaining balance`,
    note: `The annualized total return over 5 years, combining cashflow, loan paydown, appreciation, and net sale proceeds. The most comprehensive single-number performance metric for a deal. Calculated across 3 appreciation scenarios (2%, 3%, 4%) so you can stress-test the outcome.

< 8% — weak · 8–12% — acceptable · 12–18% — healthy · 18–25% — strong · > 25% — verify assumptions

"If I account for every dollar this deal generates over 5 years — cashflow, equity, and the eventual sale — what's my true annualized return?"`,
  },

  // ── MAO ──────────────────────────────────────────────────────────────────────

  mao_70: {
    title: 'MAO — 70% Rule',
    formula: 'ARV × 70% − Total Rehab',
    calcFn: (d, _b, m) =>
      `${fmtCurrency(d.arv)} × 70% − ${fmtCurrency(totalRehab(d))} = ${fmtCurrency(m.mao70)}`,
    note: 'Classic wholesaler rule. Leaves ~30% of ARV for profit and expenses after rehab.',
  },

  mao_brrrr: {
    title: 'MAO — Money in Deal ≤ target',
    formula: 'Solve for PP: money in deal = maxMoneyInDeal',
    calcFn: (d, _b, m) =>
      `Max PP where money in deal ≤ $${(d.maxMoneyInDeal/1000).toFixed(0)}k: ${fmtCurrency(m.maoMoneyInDeal)}`,
    note: 'The highest purchase price that keeps permanently-deployed capital at or below the target. Inverts the full money-in-deal formula — includes total rehab, additional costs, closing, one-time costs, holding costs, project cost adjustments, HML fees + carry, and refi closing.',
  },

  mao_equity: {
    title: 'MAO — Equity post-Refi ≥ target',
    formula: 'Solve for PP: (Post-Refi Equity − Money in Deal) ÷ Money in Deal = minEquityPct',
    calcFn: (d, b, m) => {
      const propEqPostRefi = d.arv * (1 - d.sellingCostsPct / 100) - b.refiLoan
      const moneyInDealCap = propEqPostRefi / (1 + d.minEquityPct / 100)
      return `Post-Refi equity: ${fmtCurrency(propEqPostRefi)} (ARV × (1−${d.sellingCostsPct}%) − refi loan)\n`
        + `Money-in-deal cap: ${fmtCurrency(moneyInDealCap)} = post-Refi equity ÷ (1 + ${d.minEquityPct}%)\n`
        + `Max PP at that cap: ${fmtCurrency(m.maoEquity)}`
    },
    note: 'Leverage-aware safety margin (Excel row 67 definition). Caps money-in-deal at post-Refi equity ÷ (1 + minEquityPct), then back-solves for PP. Note: this is a different metric than the dashboard\'s "Equity %" (which is forced equity = (ARV − all-in cost) ÷ all-in cost).',
  },

  // ── Score components ─────────────────────────────────────────────────────────

  score_cashflow: {
    title: 'Score: Monthly Cashflow',
    formula: '(Cashflow ÷ $400) × 10, capped at 10',
    calcFn: (d, b, m, s) => {
      const c = s.components.find(c => c.key === 'cashflow')
      return `${fmtCurrency(b.cashflow)} → score ${c?.score.toFixed(1) ?? '—'}/10 (weight ${((c?.weight ?? 0) * 100).toFixed(0)}%)`
    },
    note: 'Full score (10) at $400/mo cashflow. Scales linearly.',
  },

  score_coc: {
    title: 'Score: Cash-on-Cash',
    formula: '≥10%→10, ≥9%→9, ≥8%→8, ≥7%→7, ≥6%→6, <6%→0',
    calcFn: (d, b, m, s) => {
      const c = s.components.find(c => c.key === 'coc')
      const coc = Number.isFinite(b.coc) ? fmtPct(b.coc) : '∞'
      return `${coc} → score ${c?.score.toFixed(0) ?? '—'}/10 (weight 33%)`
    },
    note: 'Step-function scoring. Infinite return (full BRRRR) = 10/10.',
  },

  score_dscr: {
    title: 'Score: DSCR',
    formula: '((DSCR − 1.0) ÷ 0.5) × 10, capped at 10',
    calcFn: (d, b, m, s) => {
      const c = s.components.find(c => c.key === 'dscr')
      return `${fmtNum(b.dscr)} → score ${c?.score.toFixed(1) ?? '—'}/10 (weight ${((c?.weight ?? 0) * 100).toFixed(0)}%)`
    },
    note: 'Full score at DSCR ≥ 1.5. Score of 0 at DSCR ≤ 1.0.',
  },

  score_equity: {
    title: 'Score: Equity % (forced)',
    formula: '≥35%→10, ≥30%→9, ≥25%→8, ≥20%→7, else→0',
    calcFn: (d, b, m, s) => {
      const c = s.components.find(c => c.key === 'equity')
      return `${fmtPct(b.equityMarginArv)} → score ${c?.score.toFixed(0) ?? '—'}/10 (weight 33%)`
    },
    note: 'Step-function scoring. Forced equity = (ARV − all-in) / all-in.',
  },

  score_moneyInDeal: {
    title: 'Score: Money in Deal',
    formula: 'Full score at $0; −1pt per $3,000 above',
    calcFn: (d, b, m, s) => {
      const c = s.components.find(c => c.key === 'moneyInDeal')
      return `${fmtCurrency(b.moneyInDeal)} → score ${c?.score.toFixed(1) ?? '—'}/10 (weight ${((c?.weight ?? 0) * 100).toFixed(0)}%)`
    },
    note: `Full BRRRR (≤ $0) = 10/10. Score decreases as more cash stays trapped above $0.`,
  },

  score_mao: {
    title: 'Score: vs MAO',
    formula: '5 + (delta ÷ $20,000) × 5',
    calcFn: (d, b, m, s) => {
      const c = s.components.find(c => c.key === 'mao')
      const delta = m.mao - d.purchasePrice
      return `${fmtCurrency(delta, { signed: true })} vs MAO → score ${c?.score.toFixed(1) ?? '—'}/10 (weight ${((c?.weight ?? 0) * 100).toFixed(0)}%)`
    },
    note: 'Baseline 5/10 exactly at MAO. Above MAO = higher score, below MAO = lower score.',
  },

  score_location: {
    title: 'Score: Location (school grade)',
    formula: '15→10, 12→9, 10→8, 9→7, 7→6, else→0',
    calcFn: (d, b, m, s) => {
      const c = s.components.find(c => c.key === 'location')
      const ls = mapLocationScore(d.schoolGrade)
      return `School grade ${d.schoolGrade} → location score ${ls}/10 → score ${c?.score.toFixed(0) ?? '—'}/10 (weight 33%)`
    },
    note: 'Total school district grade (e.g. from GreatSchools.org) mapped to a 0–10 location score.',
  },
}

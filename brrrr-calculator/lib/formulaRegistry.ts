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
    formula: 'Total Cash In − Cash Returned at Refi',
    calcFn: (d, b) =>
      `${fmtCurrency(b.totalCashIn)} − ${fmtCurrency(b.cashReturnedAtRefi)} = ${fmtCurrency(b.moneyInDeal)}`,
    note: 'Capital permanently tied up after refinancing. $0 or negative = full BRRRR (cash back). Target: ≤ $65k.',
  },

  mao: {
    title: 'Maximum Allowable Offer',
    formula: 'min(70% Rule, Money-in-Deal ≤ target, Equity margin)',
    calcFn: (d, _b, m) =>
      `70% Rule: ${fmtCurrency(m.mao70)}\nMoney in deal ≤ $${(d.maxMoneyInDeal/1000).toFixed(0)}k: ${fmtCurrency(m.maoMoneyInDeal)}\nEquity margin (${d.minEquityPct}%): ${fmtCurrency(m.maoEquity)}\nBinding: ${m.constraint} → ${fmtCurrency(m.mao)}`,
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
    note: 'Unlevered return. Financing-independent — use to compare properties across markets.',
  },

  grm: {
    title: 'GRM (Gross Rent Multiplier)',
    formula: 'ARV ÷ (Monthly Rent × 12)',
    calcFn: (d, b) =>
      `${fmtCurrency(d.arv)} ÷ (${fmtCurrency(d.monthlyRent)} × 12) = ${b.grm.toFixed(1)}×`,
    note: 'Lower GRM = cheaper relative to rent. Quick screening metric — does not account for expenses.',
  },

  annual_cashflow: {
    title: 'Annual cashflow',
    formula: 'Monthly Cashflow × 12',
    calcFn: (d, b) =>
      `${fmtCurrency(b.cashflow)}/mo × 12 = ${fmtCurrency(b.annualCashflow)}/yr`,
    note: 'Total annual income after all expenses and debt service.',
  },

  roe: {
    title: 'Return on Equity (ROE)',
    formula: '(Annual Cashflow) ÷ Book Equity $',
    calcFn: (d, b) =>
      `${fmtCurrency(b.annualCashflow)}/yr ÷ ${fmtCurrency(b.equityDollar)} = ${fmtPct(b.roe)}`,
    note: 'How hard your equity is working. Lower equity (higher LTV) amplifies ROE.',
  },

  equity_book: {
    title: 'Book equity post-Refi',
    formula: 'ARV − Refi Loan',
    calcFn: (d, b) =>
      `${fmtCurrency(d.arv)} − ${fmtCurrency(b.refiLoan)} = ${fmtCurrency(b.equityDollar)} (${fmtPct(b.equityPct)})`,
    note: 'Ownership value assuming you hold — does not deduct sale costs.',
  },

  equity_liquidation: {
    title: 'Liquidation equity post-Refi',
    formula: 'ARV × (1 − Selling Costs%) − Refi Loan',
    calcFn: (d, b) =>
      `${fmtCurrency(d.arv)} × (1 − ${d.sellingCostsPct}%) − ${fmtCurrency(b.refiLoan)} = ${fmtCurrency(b.equityLiquidationDollar)} (${fmtPct(b.equityLiquidationPct)})`,
    note: 'Equity after selling costs — what you would actually net if you sold today.',
  },

  equity_margin_arv: {
    title: 'Equity margin (forced)',
    formula: '(ARV − Total Project Cost) ÷ Total Project Cost',
    calcFn: (d, b) =>
      `(${fmtCurrency(d.arv)} − ${fmtCurrency(b.totalProjectCost)}) ÷ ${fmtCurrency(b.totalProjectCost)} = ${fmtPct(b.equityMarginArv)}`,
    note: 'Safety cushion as a % of all-in cost. Positive = value created above cost.',
  },

  irr_scenarios: {
    title: '5-Year IRR (appreciation scenarios)',
    formula: 'IRR on [−CashLeftIn, monthly CFs × 60, + exit at month 60]',
    calcFn: (d, b) =>
      `2% appreciation: ${fmtPct(b.irr2pct)}\n3% appreciation: ${fmtPct(b.irr3pct)}\n4% appreciation: ${fmtPct(b.irr4pct)}\nExit = ARV × (1+rate)^5 × (1−${d.sellingCostsPct}%) − remaining balance`,
    note: 'Annualised total return (cashflow + amortization + appreciation + exit) over 5 years. Returns 0 if cash left in ≤ $0 (full BRRRR).',
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
    note: 'The highest purchase price that keeps your permanently deployed capital at or below the target threshold.',
  },

  mao_equity: {
    title: 'MAO — Equity margin',
    formula: 'ARV × (1 − minEquity%) − Rehab − Closing − One-Time',
    calcFn: (d, _b, m) =>
      `${fmtCurrency(d.arv)} × (1 − ${d.minEquityPct}%) − costs = ${fmtCurrency(m.maoEquity)}`,
    note: 'Max PP to keep total project cost below ARV × (1 − minEquityPct). Ensures minimum equity buffer.',
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

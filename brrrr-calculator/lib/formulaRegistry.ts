import { fmtCurrency, fmtPct, fmtNumber } from './format'
import type { DealInputs, DealResults } from './types'

export interface FormulaEntry {
  title: string
  formula: string
  calcFn: (r: DealResults, i: DealInputs) => string
  note: string
}

export const formulaRegistry: Record<string, FormulaEntry> = {

  // ── KPI Strip ───────────────────────────────────────────────────────────────

  cf: {
    title: 'Monthly cashflow',
    formula: 'Gross Rent − Total Monthly Expenses',
    calcFn: (r) => {
      const rent = r.cashNOI_PI + r.totalPITI
      return `${fmtCurrency(rent)} − ${fmtCurrency(r.totalPITI)} = ${fmtCurrency(r.cashNOI_PI)}`
    },
    note: 'Target: ≥ $300/mo. Includes all non-funded custom expenses (monthly + annual÷12). Does not include one-time expenses.',
  },

  roi: {
    title: 'Cash-on-cash ROI',
    formula: '(Net Cashflow × 12) ÷ Money Left in Deal',
    calcFn: (r) =>
      `(${fmtCurrency(r.hmlNOI_PI)} × 12) ÷ ${fmtCurrency(r.hmlMoneyInDeal)} = ${fmtPct(r.hmlROI_PI)}`,
    note: 'Uses the HML scenario money-in-deal. If money-in-deal is ≤ $0 (full BRRRR with cash back), ROI is theoretically infinite.',
  },

  roi_cash: {
    title: 'Cash-on-cash ROI (All-Cash)',
    formula: '(Net Cashflow × 12) ÷ Money Left in Deal',
    calcFn: (r) =>
      `(${fmtCurrency(r.cashNOI_PI)} × 12) ÷ ${fmtCurrency(r.cashMoneyLeftInDeal)} = ${fmtPct(r.cashROI_PI)}`,
    note: 'Annual return on the capital still deployed in the deal after the cash-out refi.',
  },

  equity_kpi: {
    title: 'Equity post-Refi',
    formula: 'ARV − Refi Loan − Agent/Title Costs at Sale',
    calcFn: (r) =>
      `${fmtCurrency(r.hmlEquityPostRefi + r.refiLoanAmount + r.agentCosts + r.closingCostsSell)} − ${fmtCurrency(r.refiLoanAmount)} − ${fmtCurrency(r.agentCosts + r.closingCostsSell)} = ${fmtCurrency(r.hmlEquityPostRefi)}`,
    note: 'Your equity cushion after refinancing. Higher equity = lower risk and more exit options.',
  },

  dscr: {
    title: 'DSCR (Debt Service Coverage Ratio)',
    formula: 'Gross Rent ÷ (Mortgage PI + Insurance + Property Tax)',
    calcFn: (r, i) => {
      const rent = r.cashNOI_PI + r.totalPITI
      const debtService = r.mortgagePI + i.insuranceMonthly + i.propertyTaxMonthly
      return `${fmtCurrency(rent)} ÷ (${fmtCurrency(r.mortgagePI)} + ${fmtCurrency(i.insuranceMonthly)} + ${fmtCurrency(i.propertyTaxMonthly)}) = ${fmtNumber(r.dscr)}`
    },
    note: 'Most DSCR lenders require ≥ 1.25 to approve a cash-out refinance. Values below 1.0 mean the property does not cover its debt service.',
  },

  // ── Deal Anatomy ────────────────────────────────────────────────────────────

  pp: {
    title: 'Purchase price',
    formula: 'Input — asking / negotiated price',
    calcFn: (r, i) => `${fmtCurrency(i.purchasePrice)} (${fmtCurrency(i.sqft > 0 ? i.purchasePrice / i.sqft : 0)}/sqft)`,
    note: 'The price you are evaluating or negotiating.',
  },

  rehab_total: {
    title: 'Total rehab',
    formula: 'Rehab Estimate + Change Orders',
    calcFn: (r, i) =>
      `${fmtCurrency(i.rehabEstimate)} + ${fmtCurrency(i.changeOrders)} = ${fmtCurrency(i.rehabEstimate + i.changeOrders)}`,
    note: 'Change orders are paid out-of-pocket (not financed by HML). Add a 10–20% buffer for surprises.',
  },

  closing_buy: {
    title: 'Closing costs — purchase',
    formula: 'Purchase Price × 2%  (or manual override)',
    calcFn: (r, i) =>
      i.closingCostsBuyOverride > 0
        ? `Manual override: ${fmtCurrency(r.closingCostsBuy)}`
        : i.closingCostsBuyOverride === 0
        ? '$0 (waived / seller paying)'
        : `${fmtCurrency(i.purchasePrice)} × 2% = ${fmtCurrency(r.closingCostsBuy)}`,
    note: 'Covers title, escrow, and lender fees. Override to $0 if seller is paying closing costs.',
  },

  holding: {
    title: 'Holding costs during rehab',
    formula: '(Tax + Insurance + HOA + State Tax + $300 buffer) × Rehab Months',
    calcFn: (r, i) =>
      `(${fmtCurrency(i.propertyTaxMonthly)} + ${fmtCurrency(i.insuranceMonthly)} + ${fmtCurrency(i.hoaMonthly)} + $300) × ${r.rehabMonths.toFixed(1)} mo = ${fmtCurrency(r.holdingCosts)}`,
    note: 'The $300/mo buffer covers utilities and incidentals. Holding costs stop when the property is rented or sold.',
  },

  all_in: {
    title: 'All-in cost (cash)',
    formula: 'PP + Closing Costs + Rehab + Change Orders + Holding Costs',
    calcFn: (r, i) =>
      `${fmtCurrency(i.purchasePrice)} + ${fmtCurrency(r.closingCostsBuy)} + ${fmtCurrency(i.rehabEstimate)} + ${fmtCurrency(i.changeOrders)} + ${fmtCurrency(r.holdingCosts)} = ${fmtCurrency(r.allInCost)}`,
    note: 'Total cash deployed before any financing. The benchmark for evaluating all-cash deals.',
  },

  money_in_deal: {
    title: 'Money left in deal',
    formula: 'All-in Cost − Cash Received from Refi Lender − Other Adjustments at Close',
    calcFn: (r, i) =>
      `${fmtCurrency(r.allInCost)} − ${fmtCurrency(r.cashFromLender)} − ${fmtCurrency(i.otherAdjustmentsAtClose)} = ${fmtCurrency(r.cashMoneyLeftInDeal)} (Cash)\n${fmtCurrency(r.hmlCashToClose)} − ${fmtCurrency(r.netCashAtClosing)} − ${fmtCurrency(i.otherAdjustmentsAtClose)} = ${fmtCurrency(r.hmlMoneyInDeal)} (HML)`,
    note: 'Capital permanently tied up in this asset after refinancing. Full BRRRR = $0 or negative (cash back). Lower is better.',
  },

  ppsqft_buy: {
    title: '$/sqft at purchase',
    formula: 'Purchase Price ÷ Square Footage',
    calcFn: (r, i) =>
      i.sqft > 0
        ? `${fmtCurrency(i.purchasePrice)} ÷ ${i.sqft} sqft = $${r.ppsqftPurchase.toFixed(0)}/sqft`
        : 'Enter sqft to calculate',
    note: 'Compare to local sold comps on a per-sqft basis to validate the purchase price.',
  },

  ppsqft_arv: {
    title: '$/sqft at ARV',
    formula: 'After-Repair Value ÷ Square Footage',
    calcFn: (r, i) =>
      i.sqft > 0
        ? `${fmtCurrency(i.arv)} ÷ ${i.sqft} sqft = $${r.ppsqftSale.toFixed(0)}/sqft`
        : 'Enter sqft to calculate',
    note: 'Confirm that the ARV is supported by recent sold comps at this price-per-sqft.',
  },

  // ── Monthly P&L ─────────────────────────────────────────────────────────────

  mortgage_pi: {
    title: 'Mortgage payment (Principal + Interest)',
    formula: 'Loan × (monthly rate) ÷ (1 − (1 + monthly rate)^−360)',
    calcFn: (r, i) => {
      const rate = i.arv > 0 ? (r.refiLTV) : 0
      return `${fmtCurrency(r.refiLoanAmount)} at ${fmtPct(0)} annual — ${fmtCurrency(r.mortgagePI)}/mo`
    },
    note: '30-year fixed amortization. P+I only — tax and insurance are listed separately.',
  },

  capex: {
    title: 'CapEx + vacancy reserve',
    formula: 'Gross Rent × 15%',
    calcFn: (r) => {
      const rent = r.cashNOI_PI + r.totalPITI
      return `${fmtCurrency(rent)} × 15% = ${fmtCurrency(r.capexReserve)}/mo`
    },
    note: 'Covers capital expenditures (roof, HVAC, appliances), repairs, and vacancy periods. Adjust for property age and condition.',
  },

  pm: {
    title: 'Property management fee',
    formula: 'Gross Rent × PM Rate  (or fixed monthly amount)',
    calcFn: (r, i) => {
      const rent = r.cashNOI_PI + r.totalPITI
      return i.pmMode === 'fixed'
        ? `Fixed: ${fmtCurrency(r.pmFee)}/mo`
        : `${fmtCurrency(rent)} × ${fmtPct(i.pmRate)} = ${fmtCurrency(r.pmFee)}/mo`
    },
    note: 'Professional PMs typically charge 8–12% in DFW. Factor in vacancy coverage and lease-up fees.',
  },

  tax_ins_hoa: {
    title: 'Tax + Insurance + HOA',
    formula: 'Property Tax + Insurance + HOA + State Income Tax',
    calcFn: (r, i) =>
      `${fmtCurrency(i.propertyTaxMonthly)} + ${fmtCurrency(i.insuranceMonthly)} + ${fmtCurrency(i.hoaMonthly)} + ${fmtCurrency(i.stateIncomeTaxMonthly)} = ${fmtCurrency(i.propertyTaxMonthly + i.insuranceMonthly + i.hoaMonthly + i.stateIncomeTaxMonthly)}/mo`,
    note: 'Fixed monthly carrying costs. Tax and insurance are entered as monthly amounts (annual ÷ 12).',
  },

  custom_exp: {
    title: 'Custom expenses',
    formula: 'Σ monthly + Σ (annual ÷ 12)  for all non-funded expenses',
    calcFn: (r) => `Total: ${fmtCurrency(r.customExpenseTotal)}/mo`,
    note: 'Sum of all non-funded custom expense line items (monthly + annual÷12). One-time expenses are shown in deal anatomy, not here.',
  },

  total_piti: {
    title: 'Total PITI',
    formula: 'Tax + Insurance + HOA + CapEx + PM + Mortgage P+I + Custom Expenses',
    calcFn: (r) => `${fmtCurrency(r.totalPITI)}/mo`,
    note: 'All monthly expenses combined. This is the total you must cover from rental income to break even.',
  },

  net_cashflow: {
    title: 'Net monthly cashflow',
    formula: 'Gross Rent − Total PITI',
    calcFn: (r) => {
      const rent = r.cashNOI_PI + r.totalPITI
      return `${fmtCurrency(rent)} − ${fmtCurrency(r.totalPITI)} = ${fmtCurrency(r.cashNOI_PI)}/mo`
    },
    note: 'Your monthly take-home after all operating expenses. Target: ≥ $300/mo for a solid deal.',
  },

  net_cashflow_io: {
    title: 'Net cashflow (interest-only loan)',
    formula: 'Gross Rent − PITI with IO mortgage',
    calcFn: (r) => {
      const rent = r.cashNOI_PI + r.totalPITI
      return `${fmtCurrency(rent)} − ${fmtCurrency(r.totalIOExpenses)} = ${fmtCurrency(r.cashNOI_IO)}/mo`
    },
    note: 'Same calculation using an interest-only mortgage payment for comparison. Useful for short-term hold analysis.',
  },

  refi_ltv: {
    title: 'Refi LTV',
    formula: 'Auto back-solve for $300/mo cashflow, capped at 65%',
    calcFn: (r) =>
      `LTV for $300/mo flow: ${fmtPct(r.ltv300cashflow)} → used: ${fmtPct(r.refiLTV)} (${r.refiLTV === 0.65 ? 'at 65% cap' : 'auto'})`,
    note: 'The highest LTV at which the deal still produces $300/mo net cash flow, hard-capped at 65%. Override in Refi settings.',
  },

  ltv_300: {
    title: 'LTV for $300/mo cashflow',
    formula: 'PV(rate÷12, 360, rent−expenses−$300) ÷ ARV',
    calcFn: (r) =>
      `Uncapped back-solve result: ${fmtPct(r.ltv300cashflow)}`,
    note: 'The LTV at which the deal produces exactly $300/mo net cash flow — used as the auto LTV ceiling.',
  },

  // ── HML Expenses ────────────────────────────────────────────────────────────

  hml_principal: {
    title: 'HML loan amount',
    formula: 'min(PP × Leverage%, ARV × 75%)',
    calcFn: (r, i) =>
      `min(${fmtCurrency(r.ppFinancedAmt + r.rehabFinancedAmt)}, ${fmtCurrency(i.arv * 0.75)}) = ${fmtCurrency(r.hmlLoan)}`,
    note: 'Hard-capped at 75% of ARV regardless of leverage setting. This is the amount you borrow from the hard money lender.',
  },

  hml_pp_financed: {
    title: 'HML — PP financed',
    formula: 'Manual $ entered  (or PP × leverage%)',
    calcFn: (r, i) =>
      i.hmlLoanPP > 0
        ? `Manual: ${fmtCurrency(r.ppFinancedAmt)}`
        : `${fmtCurrency(i.purchasePrice)} × ${fmtPct(r.ppFinancedAmt / (i.purchasePrice || 1))} = ${fmtCurrency(r.ppFinancedAmt)}`,
    note: 'Dollar amount the HML lender covers toward the purchase price.',
  },

  hml_rehab_financed: {
    title: 'HML — Rehab financed',
    formula: 'Manual $ entered  (or Rehab × leverage%)',
    calcFn: (r, i) =>
      i.hmlLoanRehab > 0
        ? `Manual: ${fmtCurrency(r.rehabFinancedAmt)}`
        : r.rehabFinancedAmt === 0
        ? '$0 (not financing rehab)'
        : `${fmtCurrency(i.rehabEstimate)} × leverage% = ${fmtCurrency(r.rehabFinancedAmt)}`,
    note: 'Dollar amount the HML lender covers toward the rehab budget.',
  },

  hml_cash_to_close: {
    title: 'Cash to close (HML)',
    formula: 'All-in Cost − HML Loan',
    calcFn: (r) =>
      `${fmtCurrency(r.allInCost)} − ${fmtCurrency(r.hmlLoan)} = ${fmtCurrency(r.hmlCashToClose)}`,
    note: 'Out-of-pocket cash you bring to the purchase closing when using hard money financing.',
  },

  hml_monthly_interest: {
    title: 'Monthly HML interest',
    formula: 'HML Monthly Rate × HML Loan',
    calcFn: (r, i) =>
      `${fmtPct(i.arv > 0 ? r.hmlMonthlyInterest / r.hmlLoan : 0, 3)}/mo × ${fmtCurrency(r.hmlLoan)} = ${fmtCurrency(r.hmlMonthlyInterest)}/mo`,
    note: 'Interest accrues monthly. Every extra month in rehab adds this cost.',
  },

  hml_interest: {
    title: 'HML total interest paid',
    formula: 'HML Loan × Monthly Rate × Seasoning Months',
    calcFn: (r, i) =>
      `${fmtCurrency(r.hmlLoan)} × ${i.seasoningMonths} mo = ${fmtCurrency(r.hmlTotalInterest)}`,
    note: 'Total interest cost until you refinance. Short hold time is key to minimizing this.',
  },

  hml_points: {
    title: 'HML origination points',
    formula: 'HML Loan × Points %',
    calcFn: (r) =>
      `${fmtCurrency(r.hmlLoan)} × points% = ${fmtCurrency(r.hmlPointsDollar)}`,
    note: 'Points are paid at closing and are a one-time cost. Negotiable with repeat lenders.',
  },

  hml_fees: {
    title: 'HML fees',
    formula: 'Appraisal + Underwriting + Other + (Points% × Loan) + Extra Fees',
    calcFn: (r) =>
      `Total HML fees: ${fmtCurrency(r.hmlTotalFees)}`,
    note: 'All upfront HML lender costs excluding interest. Includes points, underwriting, appraisal, and any extra fees.',
  },

  hml_total: {
    title: 'Total hard money cost',
    formula: 'Principal + Interest + Points + Underwriting + Appraisal + Other Fees',
    calcFn: (r) =>
      `${fmtCurrency(r.hmlLoan)} + ${fmtCurrency(r.hmlTotalInterest)} + ${fmtCurrency(r.hmlTotalFees)} = ${fmtCurrency(r.hmlTotalDebt)}`,
    note: 'Full amount owed to the HML lender at payoff. Compare this against the Refi cash you receive.',
  },

  // ── Flip Analysis ────────────────────────────────────────────────────────────

  sale_costs: {
    title: 'Sale costs (agents + title)',
    formula: '(ARV × 6%) + $500 + (ARV × 2%)',
    calcFn: (r, i) =>
      `(${fmtCurrency(i.arv)} × 6%) + $500 + (${fmtCurrency(i.arv)} × 2%) = ${fmtCurrency(r.agentCosts + r.closingCostsSell)}`,
    note: 'Agent commissions (6%) plus title/escrow on the sale side (2%). The $500 covers notary and misc fees.',
  },

  cash_flip_profit: {
    title: 'Net flip profit (All-Cash)',
    formula: 'ARV − (All-in Cost + Sale Costs)',
    calcFn: (r, i) =>
      `${fmtCurrency(i.arv)} − (${fmtCurrency(r.allInCost)} + ${fmtCurrency(r.agentCosts + r.closingCostsSell)}) = ${fmtCurrency(r.cashFlipProfit)}`,
    note: 'Dollar profit from buying all-cash and selling after rehab.',
  },

  cash_flip_roi: {
    title: 'ROI (All-Cash Flip)',
    formula: 'Net Profit ÷ All-in Cost',
    calcFn: (r) =>
      `${fmtCurrency(r.cashFlipProfit)} ÷ ${fmtCurrency(r.allInCost)} = ${fmtPct(r.cashFlipROI)}`,
    note: 'Return on every dollar deployed, including purchase, rehab, and holding.',
  },

  hml_flip_profit: {
    title: 'Net flip profit (HML)',
    formula: 'ARV − (HML Total Debt + Cash to Close + Sale Costs)',
    calcFn: (r) =>
      `${fmtCurrency(r.hmlTotalDebt + r.hmlCashToClose + r.agentCosts + r.closingCostsSell + r.hmlFlipProfit)} − ${fmtCurrency(r.hmlTotalDebt + r.hmlCashToClose + r.agentCosts + r.closingCostsSell)} = ${fmtCurrency(r.hmlFlipProfit)}`,
    note: 'Flip profit using hard money financing. Leverage amplifies returns but also amplifies losses.',
  },

  hml_flip_roi: {
    title: 'Cash-on-Cash ROI (HML Flip)',
    formula: 'Net Profit ÷ Cash to Close',
    calcFn: (r) =>
      `${fmtCurrency(r.hmlFlipProfit)} ÷ ${fmtCurrency(r.hmlCashToClose)} = ${fmtPct(r.hmlFlipROI)}`,
    note: 'Return on the cash you actually brought in — amplified by leverage.',
  },

  // ── After Refi / Hold ────────────────────────────────────────────────────────

  net_cash_closing: {
    title: 'Net cash at Refi closing',
    formula: 'Cash from Lender − HML Total Debt',
    calcFn: (r) =>
      `${fmtCurrency(r.cashFromLender)} − ${fmtCurrency(r.hmlTotalDebt)} = ${fmtCurrency(r.netCashAtClosing)}`,
    note: 'Positive = full BRRRR (you get cash back after paying off HML). Negative = partial BRRRR (you bring cash to closing).',
  },

  cash_equity: {
    title: 'Equity $ (All-Cash)',
    formula: 'ARV − All-in Cost',
    calcFn: (r, i) =>
      `${fmtCurrency(i.arv)} − ${fmtCurrency(r.allInCost)} = ${fmtCurrency(r.cashEquityDollar)}`,
    note: 'Paper equity created by buying and rehabbing below ARV.',
  },

  cash_equity_pct: {
    title: 'Equity % (All-Cash)',
    formula: '(ARV − All-in Cost) ÷ All-in Cost',
    calcFn: (r) =>
      `(${fmtCurrency(r.cashEquityDollar)}) ÷ ${fmtCurrency(r.allInCost)} = ${fmtPct(r.cashEquityPct)}`,
    note: 'Equity as a percentage of your total cost basis.',
  },

  hml_equity_post_refi: {
    title: 'Equity % post-Refi (HML)',
    formula: '(Property Equity − Money in Deal) ÷ Money in Deal',
    calcFn: (r) =>
      `(${fmtCurrency(r.hmlEquityPostRefi)} − ${fmtCurrency(r.hmlMoneyInDeal)}) ÷ ${fmtCurrency(r.hmlMoneyInDeal)} = ${fmtPct(r.hmlEquityPctPostRefi)}`,
    note: 'Equity return expressed relative to your remaining capital in the deal after refi.',
  },

  hml_equity_dollar: {
    title: 'Property equity $',
    formula: 'ARV − All-in Cost',
    calcFn: (r, i) =>
      `${fmtCurrency(i.arv)} − ${fmtCurrency(r.allInCost)} = ${fmtCurrency(r.hmlEquityDollar)}`,
    note: 'Equity created through value-add relative to total all-in cost.',
  },

  hml_equity_pct: {
    title: 'Property equity %',
    formula: '(ARV − All-in) ÷ All-in',
    calcFn: (r) =>
      `${fmtCurrency(r.hmlEquityDollar)} ÷ ${fmtCurrency(r.allInCost)} = ${fmtPct(r.hmlEquityPct)}`,
    note: 'Equity as a percentage of total cost basis.',
  },

  roi_io: {
    title: 'Annual ROI (interest-only)',
    formula: '(Monthly NOI with IO × 12) ÷ Money in Deal',
    calcFn: (r) =>
      `(${fmtCurrency(r.hmlNOI_IO)} × 12) ÷ ${fmtCurrency(r.hmlMoneyInDeal)} = ${fmtPct(r.hmlROI_IO)}`,
    note: 'Same ROI using the interest-only payment instead. Useful for short-term hold analysis.',
  },

  roi_io_cash: {
    title: 'Annual ROI (interest-only, All-Cash)',
    formula: '(Monthly NOI with IO × 12) ÷ Money Left in Deal',
    calcFn: (r) =>
      `(${fmtCurrency(r.cashNOI_IO)} × 12) ÷ ${fmtCurrency(r.cashMoneyLeftInDeal)} = ${fmtPct(r.cashROI_IO)}`,
    note: 'Same ROI using the interest-only payment instead of amortizing P+I.',
  },

  // ── Refi Expenses ────────────────────────────────────────────────────────────

  refi_loan: {
    title: 'Refinance loan amount',
    formula: 'ARV × LTV%',
    calcFn: (r, i) =>
      `${fmtCurrency(i.arv)} × ${fmtPct(r.refiLTV)} = ${fmtCurrency(r.refiLoanAmount)}`,
    note: 'DSCR lenders typically offer 65% LTV for investment properties. The auto-solve finds the highest LTV that still produces $300/mo cashflow.',
  },

  refi_fees_fixed: {
    title: 'Refi appraisal + underwriting',
    formula: 'Appraisal + Underwriting + Other Fees',
    calcFn: (r) =>
      `${fmtCurrency(r.refiFees - r.refiPointsDollar)} (excluding points)`,
    note: 'Fixed lender fees: appraisal, underwriting, and miscellaneous costs.',
  },

  refi_points: {
    title: 'Refinance origination points',
    formula: 'Refi Loan × Points %',
    calcFn: (r) =>
      `${fmtCurrency(r.refiLoanAmount)} × points% = ${fmtCurrency(r.refiPointsDollar)}`,
    note: 'Points paid at the long-term loan closing. Factor these into your total Refi cost.',
  },

  refi_title: {
    title: 'Refi title / closing costs',
    formula: 'ARV × 2% + $500  (or manual override)',
    calcFn: (r, i) =>
      i.refiTitleCostsOverride > 0
        ? `Manual override: ${fmtCurrency(r.refiTitleCosts)}`
        : `${fmtCurrency(i.arv)} × 2% + $500 = ${fmtCurrency(r.refiTitleCosts)}`,
    note: 'Title insurance + notary/escrow at refi closing.',
  },

  refi_total: {
    title: 'Total Refi closing cost',
    formula: 'Points + Underwriting + Appraisal + Other + Title',
    calcFn: (r) =>
      `${fmtCurrency(r.refiFees)} + ${fmtCurrency(r.refiTitleCosts)} = ${fmtCurrency(r.refiFees + r.refiTitleCosts)}`,
    note: 'All refi costs deducted from the loan proceeds.',
  },

  cash_from_lender: {
    title: 'Cash received from Refi lender',
    formula: 'Refi Loan − Refi Fees − Refi Title Costs',
    calcFn: (r) =>
      `${fmtCurrency(r.refiLoanAmount)} − ${fmtCurrency(r.refiFees)} − ${fmtCurrency(r.refiTitleCosts)} = ${fmtCurrency(r.cashFromLender)}`,
    note: 'Actual cash deposited at the refi closing. It first pays off the HML; any remainder is your cash back.',
  },

  // ── Scorecard ────────────────────────────────────────────────────────────────

  score_equity: {
    title: 'Equity score',
    formula: '(Equity $ − Money in Deal) ÷ Money in Deal → bracket → score',
    calcFn: (r) => {
      const pct = r.hmlEquityPctPostRefi
      const bracket = pct >= 0.35 ? '≥35%' : pct >= 0.30 ? '≥30%' : pct >= 0.20 ? '≥20%' : '<20%'
      return `(${fmtCurrency(r.hmlEquityPostRefi)} − ${fmtCurrency(r.hmlMoneyInDeal)}) ÷ ${fmtCurrency(r.hmlMoneyInDeal)} = ${fmtPct(pct)} → ${bracket} → ${r.hmlEquityScore}/10`
    },
    note: 'Measures equity return on capital deployed — how much equity you gained relative to what you left in the deal. This is different from the KPI "equity % of ARV." Scoring: ≥35%=10, ≥30%=9, ≥20%=8, else 0.',
  },

  score_roi: {
    title: 'ROI score',
    formula: 'CoC ROI % → bracket → score (0–10)',
    calcFn: (r) => {
      const roi = r.hmlROI_PI
      return `${fmtPct(roi)} → score ${r.hmlROIScore}/10`
    },
    note: 'Scoring: ≥10%=10, ≥9%=9, ≥8%=8, ≥7%=7, ≥6%=6, ≥5%=5, else 0.',
  },

  score_location: {
    title: 'Location / school district score',
    formula: 'School grade → bracket → score (0–10)',
    calcFn: (r, i) => {
      const grade = i.locationScore
      const score = grade >= 15 ? 10 : grade >= 12 ? 9 : grade >= 10 ? 8 : grade >= 9 ? 7 : 0
      return `Grade ${grade} → score ${score}/10`
    },
    note: 'Scoring: 15=10 (A), 12=9 (B), 10=8 (C), 9=7 (D), else 0. Use GreatSchools.org to find the district score.',
  },

  // ── MAO ──────────────────────────────────────────────────────────────────────

  mao1: {
    title: 'MAO — max $ in deal',
    formula: 'Solve for PP: moneyInDeal ≤ maxMoneyInDeal',
    calcFn: (r, i) =>
      `Max PP to keep capital ≤ ${fmtCurrency(i.arv > 0 ? r.mao1 + 1 : 65000)} in deal: ${fmtCurrency(r.mao1)}\n(${fmtPct((i.purchasePrice - r.mao1) / (i.purchasePrice || 1))} below asking)`,
    note: 'Algebraic solve for PP keeping your trapped capital under the target. Assumes current lender settings and ARV.',
  },

  mao2: {
    title: 'MAO — min equity %',
    formula: 'Solve for PP: equity post-refi ≥ minEquityPct',
    calcFn: (r, i) =>
      `Max PP to maintain ≥ ${fmtPct(i.arv > 0 ? 0.20 : 0)} equity post-refi: ${fmtCurrency(r.mao2)}\n(${fmtPct((i.purchasePrice - r.mao2) / (i.purchasePrice || 1))} below asking)`,
    note: 'Ensures you maintain a minimum equity cushion after refinancing. Protects against market downturns.',
  },

  mao_discount: {
    title: 'Discount needed',
    formula: 'max((Asking − MAO1) ÷ Asking,  (Asking − MAO2) ÷ Asking)',
    calcFn: (r, i) =>
      `max((${fmtCurrency(i.purchasePrice)} − ${fmtCurrency(r.mao1)}) ÷ ${fmtCurrency(i.purchasePrice)},\n    (${fmtCurrency(i.purchasePrice)} − ${fmtCurrency(r.mao2)}) ÷ ${fmtCurrency(i.purchasePrice)})\n= ${fmtPct(Math.max(r.maoDiscount, 0))}`,
    note: 'How far below asking price you need to negotiate to satisfy both MAO constraints.',
  },

  // ── Market ───────────────────────────────────────────────────────────────────

  arv: {
    title: 'After-Repair Value (ARV)',
    formula: 'Market estimate — comparable sales post-rehab',
    calcFn: (r, i) =>
      i.sqft > 0
        ? `${fmtCurrency(i.arv)} (${fmtCurrency(i.arv / i.sqft)}/sqft)`
        : `${fmtCurrency(i.arv)}`,
    note: 'Estimated resale value after all rehab is complete. Pull 3–5 comparable sold listings to support this number.',
  },

  gross_rent: {
    title: 'Gross rent',
    formula: 'Input — market monthly rent',
    calcFn: (r, i) => `${fmtCurrency(i.marketRent)}/mo (before any deductions)`,
    note: 'Conservative market rent from active listings and recent lease comps. All expense ratios are applied against this figure.',
  },

  prop_tax: {
    title: 'Property tax',
    formula: 'Input — monthly property tax',
    calcFn: (r, i) => `${fmtCurrency(i.propertyTaxMonthly)}/mo (annual ÷ 12)`,
    note: 'Use the actual county tax bill divided by 12. Reassessment after purchase can increase this.',
  },

  insurance: {
    title: 'Landlord insurance',
    formula: 'Input — monthly insurance premium',
    calcFn: (r, i) => `${fmtCurrency(i.insuranceMonthly)}/mo (annual ÷ 12)`,
    note: 'Landlord/dwelling policy. Standard coverage in DFW is $100–150/mo for a typical SFR.',
  },

  hoa: {
    title: 'HOA dues',
    formula: 'Input — monthly HOA fee',
    calcFn: (r, i) => `${fmtCurrency(i.hoaMonthly)}/mo`,
    note: 'Homeowner association dues. Verify whether HOA allows rentals before purchasing.',
  },

  state_tax: {
    title: 'State income tax',
    formula: 'Input — monthly state income tax estimate',
    calcFn: (r, i) => `${fmtCurrency(i.stateIncomeTaxMonthly)}/mo`,
    note: 'Estimated state income tax on rental income. TX has no state income tax — set to $0 for Texas properties.',
  },
}

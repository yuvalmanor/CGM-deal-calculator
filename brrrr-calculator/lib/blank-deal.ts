import { DEFAULT_DEAL } from './deal-model'
import type { Deal } from './deal-model'

/**
 * The starting point for a deal the user hasn't filled in yet, and the backfill
 * base for saved rows that carry only some fields.
 *
 * Property facts and deal numbers start blank — a number nobody entered is 0,
 * which `NumberField` renders as an empty box. Three groups deliberately keep
 * the `DEFAULT_DEAL` values, because they are settings that apply across deals
 * rather than facts about one property:
 *
 * - **Lender terms** (`hml*`, `refi*`) — the same lenders quote the same terms
 *   deal after deal. This is the `HML_TERM_FIELDS` / `REFI_TERM_FIELDS` set in
 *   `lib/term-sheets.ts`.
 * - **Buy-box thresholds** — at 0 every metric would color green and MAO-1/MAO-2
 *   would stop constraining anything.
 * - **Exit settings + mode toggles** — selling costs and hold months are flip
 *   assumptions, not property facts; the mode/unit enums have no blank state.
 *
 * `DEFAULT_DEAL` (the Anna TX worked example) stays exactly as it is — it is a
 * golden-test fixture and the engine is frozen against it.
 */
export const BLANK_DEAL: Deal = {
  // Property — blank
  address: '',
  sellerAgent: '',
  propertyType: '',
  sqft: 0,
  yearBuilt: 0,
  schoolGrade: 0,

  // Deal numbers — blank
  purchasePrice: 0,
  arv: 0,
  monthlyRent: 0,
  closingCostsBuy: 0,

  // Rehab — blank amounts, kept mode
  rehabEstimate: 0,
  changeOrdersMode: DEFAULT_DEAL.changeOrdersMode,
  changeOrdersPct: 0,
  changeOrdersFixed: 0,
  rehabMonths: 0,
  rehabAdditionalCosts: [],

  // Monthly expenses — blank amounts, kept units and modes
  taxes: 0, taxesUnit: DEFAULT_DEAL.taxesUnit,
  insurance: 0, insuranceUnit: DEFAULT_DEAL.insuranceUnit,
  hoa: 0, hoaUnit: DEFAULT_DEAL.hoaUnit,
  stateIncTax: 0, stateIncTaxUnit: DEFAULT_DEAL.stateIncTaxUnit,
  capexVacancyMode: DEFAULT_DEAL.capexVacancyMode,
  capexVacancyPct: 0,
  capexVacancyFixed: 0,
  mgmtMode: DEFAULT_DEAL.mgmtMode,
  mgmtPct: 0,
  mgmtFixed: 0,
  additionalMonthly: [],

  // HML terms — kept
  hmlName: DEFAULT_DEAL.hmlName,
  hmlLevPP: DEFAULT_DEAL.hmlLevPP,
  hmlLevRehab: DEFAULT_DEAL.hmlLevRehab,
  hmlRate: DEFAULT_DEAL.hmlRate,
  hmlPoints: DEFAULT_DEAL.hmlPoints,
  hmlLenderFees: DEFAULT_DEAL.hmlLenderFees,
  hmlPostClosingMisc: DEFAULT_DEAL.hmlPostClosingMisc,
  hmlExtraFees: [],

  // Refi terms — kept
  refiName: DEFAULT_DEAL.refiName,
  refiRate: DEFAULT_DEAL.refiRate,
  refiPoints: DEFAULT_DEAL.refiPoints,
  refiBuydownPoints: DEFAULT_DEAL.refiBuydownPoints,
  refiPppSchedule: [...DEFAULT_DEAL.refiPppSchedule],
  refiTermYears: DEFAULT_DEAL.refiTermYears,
  refiAppraisal: DEFAULT_DEAL.refiAppraisal,
  refiUnderwriting: DEFAULT_DEAL.refiUnderwriting,
  refiOtherMisc: DEFAULT_DEAL.refiOtherMisc,
  refiSeasoningMonths: DEFAULT_DEAL.refiSeasoningMonths,
  refiLtv: DEFAULT_DEAL.refiLtv,
  refiTitleEscrow: DEFAULT_DEAL.refiTitleEscrow,
  refiExtraFees: [],

  // One-time costs — blank
  oneTimeCosts: [],

  // Exit settings — kept
  sellingCostsPct: DEFAULT_DEAL.sellingCostsPct,
  holdMonthsForFlip: DEFAULT_DEAL.holdMonthsForFlip,
  maxMoneyInDeal: DEFAULT_DEAL.maxMoneyInDeal,
  projectCostAdjustments: 0,

  // Buy-box thresholds — kept
  minCashflow: DEFAULT_DEAL.minCashflow,
  minCoC: DEFAULT_DEAL.minCoC,
  minDscr: DEFAULT_DEAL.minDscr,
  minEquityPct: DEFAULT_DEAL.minEquityPct,
}

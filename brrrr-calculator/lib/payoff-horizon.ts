// Payoff Horizon analysis — pure module (see plans/payoff-horizon.md).
//
// Answers "what does this refi loan really cost if it's paid off at year H?"
// per Refi Term Sheet: upfront closing costs + cumulative interest + any
// prepayment penalty, as nominal sums (no NPV/discounting). Principal is
// deliberately excluded — with equal loan amounts it cancels across columns,
// and `scheduledPrincipalPaid + remainingBalance = L` at every horizon, so
// term-length differences never break comparability.
//
// No React, no I/O, no imports from the engine. The caller supplies
// `upfrontCost` from the engine's own `totalRefiClosing` per candidate —
// this module never re-derives closing costs.

/** Fixed horizon list (years). Not persisted, not editable — change here. */
export const PAYOFF_HORIZONS_YEARS: readonly number[] = [3, 5, 7, 10, 15, 20]

export interface PayoffSheetInputs {
  loanAmount: number
  annualRatePct: number   // whole-number percent, e.g. 7.375
  termYears: number
  /** Prepayment-penalty percent per year, e.g. [5,5,5]; empty = no PPP. */
  pppSchedule: number[]
  /** The engine's totalRefiClosing for this candidate — passed through, never derived. */
  upfrontCost: number
}

export interface PayoffCell {
  horizonYears: number
  cumInterest: number
  remainingBalance: number
  penalty: number
  /** upfrontCost + cumInterest + penalty */
  total: number
}

/** Standard fully-amortizing monthly P&I payment. */
export function monthlyPayment(loanAmount: number, annualRatePct: number, termYears: number): number {
  const r = annualRatePct / 100 / 12
  const n = Math.round(termYears * 12)
  if (loanAmount <= 0 || n <= 0) return 0
  return r === 0 ? loanAmount / n : (loanAmount * r) / (1 - Math.pow(1 + r, -n))
}

/**
 * Step-down prepayment penalty on the remaining balance at payoff.
 *
 * Boundary convention: payoff at exactly the end of the final PPP year is
 * penalty-free — month 36 of a 3-year PPP pays nothing (payoff month past
 * the window is of course also free). Within the window, the percentage for
 * the year the payoff month falls in applies: month 48 of a 5-year schedule
 * pays the year-4 rate. Verify this convention against each lender's actual
 * note language — some notes charge the year-N rate through month N×12.
 */
function penaltyAt(payoffMonth: number, pppSchedule: number[], remainingBalance: number): number {
  const pppMonths = pppSchedule.length * 12
  if (pppMonths === 0 || payoffMonth >= pppMonths) return 0
  const pct = pppSchedule[Math.ceil(payoffMonth / 12) - 1]
  return (pct / 100) * remainingBalance
}

/**
 * One matrix column: the payoff cost of a loan at each horizon.
 * Horizons at or beyond the loan term amortize fully: balance 0, penalty 0,
 * cumInterest = total interest over the life of the loan.
 */
export function payoffHorizonColumn(
  inputs: PayoffSheetInputs,
  horizonsYears: readonly number[] = PAYOFF_HORIZONS_YEARS,
): PayoffCell[] {
  const { loanAmount, annualRatePct, termYears, pppSchedule, upfrontCost } = inputs
  const r = annualRatePct / 100 / 12
  const n = Math.round(termYears * 12)
  const pay = monthlyPayment(loanAmount, annualRatePct, termYears)

  // One amortization walk to the furthest month needed; cum[m]/bal[m] indexed by month.
  const horizonMonths = horizonsYears.map((h) => Math.round(h * 12))
  const months = Math.min(Math.max(...horizonMonths, 0), n)
  const cum: number[] = [0]
  const bal: number[] = [loanAmount]
  let balance = loanAmount
  let cumInterest = 0
  for (let m = 1; m <= months; m++) {
    const interest = balance * r
    cumInterest += interest
    balance -= pay - interest
    if (m === n) balance = 0 // final payment retires the loan; drop float residue
    cum.push(cumInterest)
    bal.push(balance)
  }

  return horizonMonths.map((payoffMonth, i) => {
    const m = Math.min(payoffMonth, n)
    const remainingBalance = Math.max(bal[m], 0)
    const penalty = penaltyAt(payoffMonth, pppSchedule, remainingBalance)
    return {
      horizonYears: horizonsYears[i],
      cumInterest: cum[m],
      remainingBalance,
      penalty,
      total: upfrontCost + cum[m] + penalty,
    }
  })
}

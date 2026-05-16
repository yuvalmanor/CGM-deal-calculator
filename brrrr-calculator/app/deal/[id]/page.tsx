import { notFound } from 'next/navigation'
import { loadDeal } from '@/lib/sheets'
import DealCalculatorV2 from '@/components/DealCalculatorV2'
import { DEFAULT_DEAL } from '@/lib/deal-model'
import type { Deal } from '@/lib/deal-model'

interface Props {
  params: { id: string }
}

export default async function DealPage({ params }: Props) {
  let rawInputs: unknown
  try {
    ;({ inputs: rawInputs } = await loadDeal(params.id))
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_FOUND') notFound()
    throw err
  }

  // Merge saved data with DEFAULT_DEAL so any newly-added fields get defaults.
  // Migrate legacy field name: `otherAdjustmentsAtClose` → `projectCostAdjustments`
  // (semantic also changed: was a money-in-deal deduction, now a Total Project Cost credit)
  const rawObj = (rawInputs as Record<string, unknown>) ?? {}
  if ('otherAdjustmentsAtClose' in rawObj && !('projectCostAdjustments' in rawObj)) {
    rawObj.projectCostAdjustments = rawObj.otherAdjustmentsAtClose
  }
  const deal: Deal = { ...DEFAULT_DEAL, ...(rawObj as Partial<Deal>) }

  return <DealCalculatorV2 initialDeal={deal} initialDealId={params.id} />
}

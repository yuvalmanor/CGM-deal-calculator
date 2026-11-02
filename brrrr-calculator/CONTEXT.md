# BRRRR Deal Calculator

Single-user tool for underwriting BRRRR real-estate deals: model a deal's numbers, score it, and persist it to Google Sheets. One context.

## Language

**Deal**:
One property being underwritten — its inputs, lender terms, and computed results. The flat `Deal` model in `lib/deal-model.ts`.
_Avoid_: Property, project

**HML**:
The short-term hard-money lender role that funds acquisition and rehab (leverage %, monthly rate, points, fees). Today: the `hml*` field group on `Deal`.
_Avoid_: Bridge lender, private lender

**Refi Lender**:
The long-term lender role that takes out the HML at refinance (annual rate, points, fees, LTV). It also funds the Buy & Hold purchase loan (`bnhLoanPct` of the price, on the same rate, term, points and fees). Today: the `refi*` field group on `Deal`, plus `bnhLoanPct`.
_Avoid_: Bank, mortgage lender

**Scenario**:
An exit strategy for a Deal — BRRRR, Buy & Hold, Flip Cash, or Flip HML. The tabs in the scenario panel.
_Avoid_: using "scenario" for lender/Term Sheet variations

**Strategy**:
The Deal's chosen lens — BRRRR or Buy & Hold — that drives its dashboard score, its strategy tag and the Sheet's score and money-in-deal columns. Saving from the BRRRR or Buy & Hold tab sets it; saving from a Flip tab keeps it. A Deal saved before Buy & Hold reads as BRRRR. The `strategy` field on `Deal`, read through `lib/strategy.ts`.
_Avoid_: calling it "scenario" — every Scenario can be viewed, but only BRRRR and Buy & Hold can be a Strategy

**Term Sheet**:
One candidate set of lender terms for one role (HML or Refi) on one Deal. Scoped to the deal — not a cross-deal lender entity. A Deal may hold several Term Sheets per role for comparison.
_Avoid_: Quote, offer, lender option

## Relationships

- A **Deal** has exactly one **HML** and exactly one **Refi Lender** at a time — the flat `hml*` and `refi*` field groups on `Deal`.
- A **Deal** may hold several **Term Sheets** per lender role; exactly one per role is **selected**. The selected Term Sheet is the flat `hml*`/`refi*` field group — the engine and input form only ever see the selected one.
- Comparing Term Sheets means running the engine once per candidate (other role held at its selected Term Sheet) and comparing full deal outcomes, not just lender-side costs.
- Lender terms are saved with the **Deal** and survive reload; there is no cross-deal lender entity today.
- A **Deal** has exactly one **Strategy**. A saved Deal opens on its Strategy's tab.

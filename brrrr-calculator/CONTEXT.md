# BRRRR Deal Calculator

Single-user tool for underwriting BRRRR real-estate deals: model a deal's numbers, score it, and persist it to Google Sheets. One context.

## Language

**Deal**:
One property being underwritten — its inputs, lender terms, and computed results.
_Avoid_: Property, project

**HML**:
The short-term hard-money lender role that funds acquisition and rehab (leverage %, monthly rate, points, fees).
_Avoid_: Bridge lender, private lender

**Refi Lender**:
The long-term lender role that takes out the HML at refinance (annual rate, points, fees).
_Avoid_: Bank, mortgage lender

**Lender Library**:
The persistent, cross-deal list of lenders and their baseline terms. Shared across all deals.
_Avoid_: Rolodex, lender list

**Lender Profile**:
One lender's entry in the Lender Library: name, role (HML or Refi), and baseline terms.

**Term Sheet**:
One lender's deal-local terms — a snapshot of a Lender Profile copied into a Deal, editable there without affecting the Library.
_Avoid_: Quote, offer, snapshot, candidate

**Active Term Sheet**:
The one Term Sheet per role that feeds `calculateDeal()` and the deal's saved score.

## Relationships

- A **Deal** has exactly one active **HML** and exactly one active **Refi Lender** at a time (today: the two halves of `LenderSettings`).
- A **Lender Profile** belongs to the **Lender Library** and serves exactly one role (HML or Refi).
- A **Deal** holds zero or more **Term Sheets** per role; exactly one per role is the **Active Term Sheet**.
- Pulling a **Lender Profile** into a **Deal** creates a **Term Sheet**; edits to a **Term Sheet** never write back to the **Lender Library**.
- **Term Sheets** are saved with the **Deal** and survive reload.
- A **Term Sheet** may be **ad-hoc** (no backing **Lender Profile**) — e.g. a hand-typed offer from a lender not in the Library. New deals seed one ad-hoc **Term Sheet** per role from built-in defaults.
- Comparing **Term Sheets** = a full deal recompute per Term Sheet, holding the other role's **Active Term Sheet** constant. There is no partial, role-only calculation.

## Example dialogue

> **Dev:** "Kiavi raised their rates — if I update their **Lender Profile**, do the deals I underwrote last month change?"
> **Domain expert:** "No. Each deal holds **Term Sheets** — copies taken when the lender was pulled in. The Library update only affects future pulls."
> **Dev:** "And if Kiavi gives me a special rate on one deal?"
> **Domain expert:** "Edit that deal's Kiavi **Term Sheet**. The **Lender Profile** keeps the baseline."

## Flagged ambiguities

- "Lender" previously meant "the two name strings inside a deal's `LenderSettings`" — resolved: a **Lender Profile** is a first-class, library-level entity; a deal holds snapshots of profiles, not references.
- A lender's full cost picture was split across `LenderSettings` (rates/points/fees) and `DealInputs` (`hmlCustomFees`, `refiCustomFees`, `hmlLoanPP`, `hmlLoanRehab`) — resolved: everything a lender controls (rates, points, leverage, fixed fees, custom fee line items, negotiated dollar amounts, refi LTV) lives on the **Term Sheet** (baselines on the **Lender Profile**); everything the deal/market controls (title costs, other adjustments at close, seasoning, MAO targets) stays on the **Deal**.

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
The long-term lender role that takes out the HML at refinance (annual rate, points, fees, LTV). Today: the `refi*` field group on `Deal`.
_Avoid_: Bank, mortgage lender

## Relationships

- A **Deal** has exactly one **HML** and exactly one **Refi Lender** at a time — the flat `hml*` and `refi*` field groups on `Deal`.
- Lender terms are saved with the **Deal** and survive reload; there is no cross-deal lender entity today.

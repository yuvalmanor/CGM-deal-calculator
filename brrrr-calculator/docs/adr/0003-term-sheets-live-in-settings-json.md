# Term Sheets live in `settingsJson`; the selected sheet mirrors the flat fields

Status: accepted (2026-07-05)

The Lender Comparison feature stores a Deal's candidate lender terms as per-deal **Term Sheets** (see CONTEXT.md), not as a cross-deal lender entity. Exactly one Term Sheet per role (HML, Refi) is *selected*, and its terms are mirrored into the existing flat `hml*`/`refi*` fields inside `inputsJson`; the alternates and selection metadata persist as a separate JSON blob in the `DEALS_APP` column I (`settingsJson`), the column reserved for exactly this purpose. This means lender data deliberately spans two columns and the selected sheet's terms appear in both — the price paid so that `inputsJson` remains exactly a flat `Deal`, the frozen engine (`lib/deal-model.ts`), the input form, and `parse-saved-deal.ts` stay untouched, and every pre-existing saved row loads unchanged as "one Term Sheet per role, selected".

## Considered Options

- **Term Sheet arrays inside `inputsJson`** — one blob, but changes the `Deal` interface in the do-not-modify engine file and muddies the "inputsJson is a flat Deal" contract.
- **Cross-deal lender library** — enables reuse but introduces a second stored entity plus sync semantics (what happens to old deals when a lender's rate changes); rejected for now, can be layered on later since Term Sheets are snapshots.

## Consequences

- A row whose column I blob is unreadable still loads as a valid deal; the UI shows an explicit "saved Term Sheets could not be read" notice, and saves must write the raw column I value back **unchanged** — never overwrite what couldn't be parsed.
- The `"v2"` sentinel previously stored in column I is superseded by the Term Sheet blob. It was written by every save but never read, so it needs no migration — the blob parser must treat a literal `"v2"` (or an empty cell) as "no Term Sheets yet", not as an unreadable blob.

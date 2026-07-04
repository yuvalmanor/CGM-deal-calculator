# Term Sheets are snapshots, not references to Lender Profiles

The lender-comparison feature introduces a cross-deal Lender Library (Lender Profiles with baseline terms) and per-deal Term Sheets. A Term Sheet is a full **copy** of a Lender Profile's terms taken at pull time — not a foreign-key reference with overrides. Library edits (e.g. a lender raises rates) never change existing deals, and per-deal negotiation (e.g. discounted points on one deal) never leaks back into the Library. We chose copies over reference-with-overrides because a saved deal is a historical underwriting record: its numbers must stay reproducible exactly as scored, and the override-layering alternative makes "what terms did this deal actually use?" depend on two mutable sources.

## Consequences

- Lender terms are intentionally duplicated across saved deals. Do not "fix" this by normalizing Term Sheets into profile references.
- A Term Sheet may carry a `profileId` for provenance only; it is never dereferenced for calculation.
- Ad-hoc Term Sheets (no backing profile) are first-class — the copy model makes them free.

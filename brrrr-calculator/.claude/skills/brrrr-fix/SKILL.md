---
name: brrrr-fix
description: Audit and fix BRRRR-calculator formulas, formula descriptions, and small UI/output changes in this project. Use this skill whenever the user asks to "check", "audit", "verify", "fix", or "tweak" anything related to a KPI/metric/formula (e.g., cashflow, DSCR, MAO, money-in-deal, equity), a formula modal's title/description, an input field label/default/tooltip, an output display (KPI strip, scorecard, advanced metrics) formatting/rounding/color, or a section/card reorder. Trigger even when the user names a metric without saying "fix" — e.g., "the CoC modal looks wrong", "DSCR seems off", "rename this label". Always finish by running verify_excel.py + tsc + commit + push.
---

# brrrr-fix

This skill handles two kinds of work in this repo:

- **Audit**: comparing a formula's registry entry (title, formula string, description) against the actual implementation in `lib/deal-model.ts` and the canonical docs in `docs/calculations.md`, and surfacing any mismatch for the user to resolve.
- **Small fixes**: input field tweaks, output display tweaks, formula modal content edits, and section/card reordering.

Both paths end with the same verify-and-ship checklist. The skill never edits `lib/deal-model.ts` silently — if math disagrees with the registry or docs, the skill stops and asks which source is correct.

---

## Required context

Before doing anything, load these three files into your working memory. They are the ground truth:

- `lib/formulaRegistry.ts` — every formula modal's `{ title, formula, calcFn, note }`. The `formula` field is a human-readable formula string; `note` is the description shown under the modal.
- `lib/deal-model.ts` — the actual implementation (functions, types, `BRRRRResult` interface). Note: CLAUDE.md and `docs/calculations.md` both refer to `lib/calculations.ts` as the implementation file, but that file is a thin re-export or stale; the live math is in `lib/deal-model.ts`. Treat `lib/deal-model.ts` as the "sacred" file — do not edit without explicit user confirmation, even if you suspect a bug. If you ever find `lib/calculations.ts` actually contains the math, use it instead and flag the discrepancy.
- `docs/calculations.md` — the prose/spec version. **It is organized by section** (`## Section 1 — Property Metrics`, `## Section 2 — Cash Flip`, …), not one entry per registry key. A single section can define multiple registry formulas, and some registry formulas have no dedicated section. When auditing, scan the section likely to contain the formula by topic (e.g., `total_project_cost` lives in Section 1 alongside `holdingCosts` and `closingCostsBuy`). If after scanning the relevant section you find no matching definition, report that as `Formula ↔ docs: ❌ no entry`.

If any of these don't load, stop and tell the user — the audit is meaningless without all three.

---

## Mode A — Audit a formula

Triggered when the user names a metric and asks to check/verify/audit it ("check DSCR", "is the CoC formula right?", "audit all formulas"), or asks about a formula modal's wording.

### Procedure

For each formula in scope (one entry, several, or all of `formulaRegistry`):

**Step 1 — Title ↔ description check.**
Read the `title` and `note` fields. Ask: does the `note` actually describe what the `title` names? A pass is when a reader who only sees the title would find the note explaining that exact quantity (not a related one, not a parent concept). A fail is when the note describes a different metric, hedges, or omits the key definition.

**Step 2 — Formula string ↔ implementation check.**
Take the `formula` field (the human-readable formula) and locate the matching computation in `lib/deal-model.ts`. Then locate the same formula in `docs/calculations.md`. Compare all three:

- Same operands?
- Same operators and order of operations?
- Same sign conventions and edge-case handling (e.g., "÷ 0 → infinite", "negative → cash back")?
- Same units? (monthly vs annual, % vs decimal, $ vs sqft)

**Step 3 — Report.**

Use this exact shape per formula:

```
### <key> — <title>
- Title ↔ description: ✅ match | ❌ mismatch — <one-line why>
- Formula ↔ code:      ✅ match | ❌ mismatch
- Formula ↔ docs:      ✅ match | ❌ mismatch

(If any ❌:)
Registry formula:  <quoted formula string>
docs/calculations.md (<section>): <quoted prose>
lib/calculations.ts (<line range>): <quoted code>

Which is correct? I will update the other two to match.
```

If everything matches, say so in one line per entry and move on. Do not propose edits.

If anything mismatches, stop after the report and wait for the user to designate the source of truth. Only then apply edits — and if the source of truth is "the code is wrong", treat editing `lib/deal-model.ts` as a deliberate, user-authorized exception to the "sacred" rule. State that exception out loud before editing.

### Scope shortcuts

- "audit X" → audit just the entry whose key, title, or common name matches X.
- "audit all" → walk every entry in `formulaRegistry` in file order. Batch the report; don't pause between matches.
- If the user names a metric that doesn't have a registry entry, say so and ask whether they want one added.

---

## Mode B — Small fixes

Triggered when the user asks for a concrete edit that isn't a formula audit: rename a label, change a default, add a tooltip, reorder cards, adjust output formatting, rewrite a modal `note`, etc.

### Where each kind of fix lives

| Fix type | File(s) |
|---|---|
| Input field label / default / tooltip / unit | `components/sections/*.tsx`, `lib/defaults.ts` |
| Output display (KPI strip, scorecard, advanced metrics) — formatting, rounding, colors | `components/sections/*.tsx`, `lib/format.ts` |
| Formula modal title / formula string / note | `lib/formulaRegistry.ts` |
| Section reordering / card grouping / collapse defaults | `components/DealCalculator.tsx`, `components/ui/Card.tsx` |

Make the edit, keep the change minimal, then go straight to the verify-and-ship checklist below. Do not refactor surrounding code.

### Hard rule: do not touch `lib/deal-model.ts` in Mode B

A request that looks like a small fix but would require editing `lib/deal-model.ts` (e.g., "round the cashflow to whole dollars" where rounding is done in the calc, not the formatter) is actually a formula change. Switch to Mode A and surface it as a mismatch the user has to resolve.

---

## Verify-and-ship checklist (mandatory at the end of every change)

Both modes end here. Run these in order; do not skip steps even if the change is one line.

1. **Excel formula verification.** From the project root:
   ```bash
   python scripts/verify_excel.py
   ```
   All 12 checks must pass. If any fails, stop and report — do not attempt to fix the failure as part of this skill invocation.

2. **TypeScript compile check.**
   ```bash
   npx tsc --noEmit
   ```
   Zero errors required.

3. **Commit and push.** Stage only the files you actually changed (no `git add -A`). Use a short, specific message that says what changed and why:
   ```bash
   git add <files>
   git commit -m "<verb> <thing>: <why>"
   git push
   ```
   The remote auto-deploys to Vercel within ~60s; no further action needed.

If any step fails, report the failure and stop. Do not paper over a failure with `--no-verify` or by editing the verification script.

---

## Reporting style

- For audits: lead with the verdict per formula, then evidence. No preamble.
- For fixes: one line on what changed, then the checklist results. No trailing summary of the diff — the user reads the diff themselves.
- Quote file paths and line numbers when pointing at code. Use markdown links: `[calculations.ts:142](lib/calculations.ts:142)`.

---

## Why this skill exists

The registry, the implementation, and the docs are three independent statements of the same formulas. They drift. Most "the calculator looks wrong" reports turn out to be one of these three disagreeing with the other two — not a math bug. Surfacing the disagreement and letting the user pick the source of truth is faster, safer, and more honest than guessing which version is right.

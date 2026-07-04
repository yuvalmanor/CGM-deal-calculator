New session starting. Before doing anything else, read the following files in this exact order:

1. `CLAUDE.md` — ground rules, what not to touch, reading order
2. `docs/new/SPEC.md` — UI/UX specification (design authority)
3. `docs/new/PLAN.md` — execution plan and acceptance criteria
4. `docs/new/CHANGELOG.md` — what has been completed and what is pending
5. `docs/new/DECISIONS.md` — rationale for key decisions

After reading all five files, give me a status report in this format:

**Current phase:** [Phase A / B / C / D — or "All phases complete"]
**Last completed task:** [The last specific thing finished — file name and what changed]
**Next task:** [The exact next step from PLAN.md]
**Verification status:** [Did the gates (`npm test`, `npx tsc --noEmit`, `npm run build`) last pass ALL GREEN? When were they last run?]
**Blockers:** [Any open failing criterion or TypeScript error from the last session — or "None"]

Once you have given me the status report, wait for my instruction before touching any code.

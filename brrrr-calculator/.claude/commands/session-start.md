New session starting. Before doing anything else, read the following files in this exact order:

1. `CLAUDE.md` — ground rules, what not to touch, reading order
2. `docs/new/CHANGELOG.md` — what has been completed and what is pending
3. `CONTEXT.md` — domain glossary (canonical terms)
4. `docs/adr/*.md` — accepted decisions
5. Any active plan in `plans/` — current feature phases and acceptance criteria

After reading all of the above, give me a status report in this format:

**Current phase:** [Next phase with unchecked criteria in the active plan — or "No active plan"]
**Last completed task:** [The last specific thing finished — file name and what changed]
**Next task:** [The exact next step from the active plan]
**Verification status:** [Did the gates (`npm test`, `npx tsc --noEmit`, `npm run build`) last pass ALL GREEN? When were they last run?]
**Blockers:** [Any open failing criterion or TypeScript error from the last session — or "None"]

Once you have given me the status report, wait for my instruction before touching any code.

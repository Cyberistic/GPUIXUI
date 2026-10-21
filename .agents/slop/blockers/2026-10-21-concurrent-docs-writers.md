# Two docs-site sessions wrote the same worktree — measured 2026-10-21 23:23

## What was measured

At **23:23:33 +03:00** on 2026-10-21 the docs-site agent (this turn) ran
`ls -lT apps/docs/src/lib/component-index.ts apps/docs/src/lib/component-index.test.ts`
and found both files modified **one second earlier** by another live session:

```
Oct 21 23:23:33 2026 apps/docs/src/lib/component-index.test.ts
Oct 21 23:23:10 2026 apps/docs/src/lib/component-index.ts
Wed Oct 21 23:23:34 +03:00 2026   ← measured one second later
```

The changes are not this turn's: `git diff` adds `partsOf`, `limitationsOf` and
their tests (searching the index by a documented part name). This turn wrote the
same files in commit `2e557066` and has not edited them since; `git status`
showed them clean after that commit.

Supporting evidence:

- `ps aux | grep -c "[o]pencode"` → `7` processes.
- A docs dev server started by another session at 23:13 reported
  `port 4175…4179 in use` and wrote
  `apps/docs/src/lib/public-symbols-source.ts`, `src/lib/public-symbols.ts` and
  `plugins/public-symbols-plugin.ts` before committing
  `93c9ecf1 feat(docs): publish the complete public symbol index on /docs/reference`.
- That session also ticked the docs information-architecture section to 14/14 and
  landed `/docs/examples`, which this turn's TODO queue had left open.

So the overlap is not a one-off edit: a second docs-site session is working the
same queue in the same tree.

## Response of this turn

- Stopped writing under `apps/docs/` the moment the overlap was confirmed. The
  turn's own work was already committed and pushed (`53977a27`), so nothing of
  this turn is lost or half-applied.
- Did not stage, revert or reformat the other session's files, and did not
  commit them.
- No new docs surface (the remaining candidate was a Patterns page) was started,
  because it would have added files the other session may also add.

## Rule that was crossed

`AGENTS.md` §6: one writer per tree. The supervisor starts a new
`opencode run` session per tick and does not own the previous turn, so a turn
that outlives its CLI call overlaps the next one — the same root cause recorded
in `2026-10-17-concurrent-tokens-writers.md`. The permanent fix (pinned
`--session` plus a live-session count in `agent_alive`, plan
`022-swarm-single-writer.md`) is still the coordinator's.

## When docs-site work may resume

Resume only after `git status --short apps/docs` has shown no uncommitted edits
for a measured interval longer than one edit cycle (a minute is enough at this
cadence), and re-read the files before editing them. The next candidate tasks are
the MISSION IA's Patterns page and the apps/docs salvage rows, none of which were
started here.

## Measured again at 23:24–23:32 (this turn)

The five files from 23:23–23:25 were still uncommitted and untouched when this
turn started at 23:26 (`git status --short apps/docs` listed the same five, and
no mtime moved between 23:25:18 and 23:32), so the other session's turn appears
to have ended without landing its work. This turn did **not** stage, revert or
edit those files:

- It worked only on new paths (`content/docs/patterns.mdx`,
  `src/lib/patterns{,.test}.ts`, `src/components/docs/patterns{,.test}.tsx`) plus
  `content/docs/meta.json` and `src/components/mdx.tsx`, and pushed
  `9a46029d`.
- `nub run --filter @gpuixui/docs test` is green (31 files / 226 tests) with the
  other session's edits present.
- `nub run --filter @gpuixui/docs check-types` currently reports exactly one
  error, in **their** file: `src/lib/examples.test.ts`'s fixture predates the
  uncommitted `ComponentEntry` (`parts`, `limitations`). The committed tree is
  consistent; the failure is the half-landed change, not this turn's.
- `nub run --filter @gpuixui/docs build` is green and the dev server serves
  `/docs/patterns`.

So the resume condition still applies to those five files, and the next docs-site
turn should decide whether to finish or discard that change before adding to
`component-index.ts` or `content/docs/components/index.mdx`.

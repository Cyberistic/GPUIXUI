# Docs-site workstream — concurrent-writer observation

Observed 2026-10-17 between 08:00 and 08:12 by the docs-site agent session.

## What happened

A **second docs-site writer is active in this worktree at the same time as
this session.** The working tree and `agent/docs-site` moved without this
session issuing any write or commit:

- `HEAD` advanced `50dff45` → `23c7789` → `6da6b8d` → `e46f19b` while this
  session only read files, ran `curl`, and ran the gates.
- New files appeared that this session did not create:
  `src/lib/search.test.ts`, `src/components/preview/captures.ts`,
  `src/components/preview/select-preview.ts`, `src/styles/theme.test.ts`.
- `src/styles/app.css`, `src/components/preview/{native-preview,screenshot,preview.test}.*`
  and `docs/preview-strategy.md` were modified mid-session (mtimes confirmed).
- The supervisor loop is running: `run-docs-site.sh` (PID 19866) →
  `opencode run --title swarm:docs-site` (PID 19895). Its stdout is
  `.agents/slop/swarm/docs-site.log`, and that log interleaves messages from
  more than one docs-site session.

## Effect

Two agents own one workstream in one tree, which breaks `AGENTS.md` §6
(one writer per tree) and risks a commit capturing another agent's
half-finished edit. This session therefore **deferred**: it removed its own
scratch file and made no edits to files the other writer was touching.

## Recommendation

Ensure exactly one docs-site writer per worktree before the next tick —
either stop the supervisor loop for this workstream while an interactive
session owns it, or stop the interactive session while the loop owns it.
This may share a root cause with blocker **B2** (the scheduler and its
overlapping ticks).

## State at the time of writing

`HEAD = e46f19b`, all workspace gates green on the last committed state this
session verified (`23c7789`): `nub run check`, `nub run lint`, `nub run fmt`,
`nub run test` (16 tests), `nub run --filter docs build`, and a live dev-server
smoke (`/`, `/docs`, `/docs/components` → 200; `/api/search?query=button`
returns real results; light + dark `--color-fd-*` roles present in the built CSS).

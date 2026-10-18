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

---

# Second observation — the same worktree, later the same morning

Observed 2026-10-17 between 08:38 and 08:58. Same root cause, with the two
sessions now identified.

## What happened

Two docs-site sessions were live in this worktree simultaneously:

| Session | Started | Role |
| ------- | ------- | ---- |
| `ses_eb7f0958fffepwdSPYUvaxw1da` | 07:12 | the other writer (a user-facing session) |
| `ses_eb7a7c3e2ffeyIiveb3gnokv87` | 08:31 | the supervisor loop's session (`run-docs-site.sh` → `opencode run`) |

The loop's session wrote `src/component-meta/registry.ts`, `entries.ts`,
`src/components/component-index.*` and `src/architecture.test.ts`; the other
wrote `content/docs/*.mdx` and `src/components/landing.*`. Damage observed:

- the loop's session resolved and committed the *other* session's in-progress
  `git merge master` as `2dce1a8`, capturing that session's uncommitted files;
- it then overwrote a line of that session's in-flight route change
  (`head: ({ loaderData }) => ({})` replacing the real expression), which the
  type-check caught as an unused import;
- both sessions committed to `agent/docs-site` within the same minute
  (`99960f7`, `48fa9c0`), each staging only its own paths — the index survived,
  by discipline rather than by design.

## How to see the live writers (for the supervisor fix)

`session_move` with no `sessionID` returns the **current** session's id, so any
agent can learn which session it is. The OpenCode database lists every session
with its directory and idle state, which is what a supervisor guard needs:

```sh
sqlite3 ~/.local/share/opencode/opencode.db \
  "select id, directory, time_idle is null as live, datetime(time_updated/1000,'unixepoch')
     from session_v2 where directory like '%workspaces/docs-site%' and time_idle is null;"
```

A non-empty result for a workstream means a writer already owns that tree; the
supervisor should skip starting another loop for it. This is the same defect the
playground worktree recorded (`workspaces/playground/TODO.md` → "Process — one
writer per tree"), so it belongs in `scripts/swarm-supervisor.sh`.

## What this session did

Per `AGENTS.md` §6 it took ownership: it stopped the loop
(`run-docs-site.sh` + its `opencode run`) so exactly one writer remains, and
recorded the guard above as a cross-team task in `TODO.md`. The other session's
work was left untouched and was not reverted.

## State at the end of this observation

`agent/docs-site` carries the metadata work (plan 413) plus the other session's
truth pass. Gates green on this tree: `nub run check`, `nub run lint`,
`nub run test` (9 files, 42 tests), `nub run --filter docs build`, and a
dev-server check that `/docs/installation` serves
`<title>Installation — GPUIXUI</title>`.

## 2026-10-18 02:52 — the loop started a second docs-site writer again

A live `swarm:docs-site` loop turn (PID 91461, child of `run-docs-site.sh`
PID 27283, started 17:52) was writing the same plan-461 files as this
interactive session: `apps/docs/src/component-meta/entries.ts`,
`content/docs/components/*.mdx`, `COMPONENTS.md`, `PLAN.md`, `TODO.md`. The
interactive session had already committed the dependency re-derivation
(`44a8d24`) and was about to write the same records.

Per `AGENTS.md` §6 the interactive session stopped the loop (both PIDs,
`SIGTERM`) and took the tree, leaving the loop's uncommitted work in place
rather than reverting it. The loop's plan (`461-tier2-expansion-pages.md`) and
its four pages were adopted and finished by the interactive session; this
session's duplicate plan was deleted.

The supervisor guard above is still the permanent fix: a live `session_v2` row
for a worktree must block a new loop turn. `TODO.md` still carries that ask.

## 2026-10-18 03:06–03:30 — killing the CLI did not stop the turns

After the loop was stopped at 03:06, `run-docs-site.sh` was restarted by a
supervisor tick at 03:13 and the tree gained five **live server-side** turns for
the same worktree (`session_v2` rows where `time_idle is null`), while the docs
writer was mid-run:

| Session | Created | Last update |
| ------- | ------- | ----------- |
| `ses_eb3a4eff…` | 03:13:18 | 03:28:48 |
| `ses_eb3b1163…` | 03:00:02 | 03:29:48 |
| `ses_eb3aba13…` | 03:06:00 | 03:25:55 |
| `ses_eb3cd9c8…` | 02:28:53 | 03:27:23 |
| `ses_eb3c0c62…` | 02:42:55 | 03:29:48 |

Those turns committed plan 461 (`c9a883c`…`2a2d662`) and started plan 462
while this session was editing the same files; `pgrep -f run-docs-site.sh`
returned nothing, so no loop was spawning them — killing the `opencode run`
CLI is not enough, because the turn lives in `opencode serve`. The docs work
converged (461 landed, 462 landed with its evidence), but the lesson for plan
022 §5 is stronger than recorded: the supervisor must key on the **server-side
session row**, not on the runner pid, and a turn must be abortable through the
server API rather than by killing its client.

No session was deleted from this session — the server enforces a
`loopback-secret` header the workstream does not own. The tree was committed
only after `git log` showed the other turns' work landed.

## 2026-10-18 04:00–05:00 — the turns now outlive every kill and race whole builds

Measured while finishing plans 461–464:

- A turn is still alive after both its `opencode run` client and every process
  in this worktree are `SIGKILL`ed: within minutes a new client appears
  (`opencode run --title swarm:docs-site`, parent the supervisor) and continues
  the same queue. Killing the tree is not a lock; it only pauses a turn.
- Both writers were running `vite build` / `vitest` at once. Concrete
  consequences measured, not inferred:
  - `nub run --filter docs smoke:build` failed with `FAIL /docs/components/drawer:
    expected 200, got 500` and three 404 asset paths because the preview served a
    `dist/` another turn was rebuilding; the same command exited `0` minutes
    earlier and later on an idle tree.
  - `nub run test` failed `packages/tokens` `react-consumer.test.ts` with
    `Test timed out in 5000ms`; the same package passed 197/197 alone.
- Work converged rather than conflicted: plans 461, 462 and the 463/464 truth
  pass each landed with their evidence, and one turn committed **this** session's
  in-flight plan-464 files inside `c96ab8e` with an accurate message. The 463/464
  two-direction proofs were re-run by this session on the committed tree.
- Plan numbering collided once: both sessions wrote a `463` (Tier 2 page truth
  and preview-gap truth). The page-truth plan kept `463`; the preview-gap plan
  became `464`.
- The branch stayed pushable throughout: `origin/agent/docs-site` matched local
  `HEAD` at every check because each turn pushed after committing.

**Consequence for plan `022` §5:** a runner-pid check, a `pgrep`, and killing
clients are all insufficient. The durable guard is a per-worktree advisory lock
held by the turn (lease renewed by the server, released on exit) that a new turn
must fail to acquire, plus a supervisor that refuses to start a workstream whose
lock is held. Until that exists, expect duplicate writers; the work still
converges, but only because every turn commits and re-reads `git log` before
writing.

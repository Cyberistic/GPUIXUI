# Blocker: concurrent `tokens-theme` agents write one worktree

**Discovered:** 2026-10-17 ~07:09–07:24 by the `tokens-theme` session
`ses_eb7f61437ffecmt6bjoSLejfn0` (07:06 batch, model `opencode/deepseek-v4.1-flash-free`).

**Severity:** high. It violates AGENTS §6 ("One writer per tree") and silently
clobbers work: several agents edit and commit `packages/tokens/**` and
`.agents/slop/plans/**` in `workspaces/tokens-theme` at the same time.

## What was observed

`opencode serve --service` (PID 52385) hosts **five** live `swarm:tokens-theme`
sessions in the same directory, all updated within the same 3-minute window:

| session | model | created | last update |
| ------- | ----- | ------- | ----------- |
| `ses_eb805d61…` | `opencode-go-braven/deepseek-v4.1-flash` | 06:48:59 | 07:23:37 |
| `ses_eb7f966f…` | `opencode/deepseek-v4.1-flash-free` | 07:02:34 | 07:23:42 |
| `ses_eb7f78da…` | `opencode/deepseek-v4.1-flash-free` | 07:04:35 | 07:23:38 |
| `ses_eb7f6143…` (this session) | `opencode/deepseek-v4.1-flash-free` | 07:06:12 | 07:23:07 |
| `ses_eb7f096e…` | `opencode-go-braven/deepseek-v4.1-flash` | 07:12:12 | 07:23:38 |

Yet only **one** `opencode run` client is alive (`82794`, the 07:12 batch). The
07:06 client (`78324`) is gone while its session `ses_eb7f6143…` kept generating.
So the `opencode run` clients exit, but the server-side sessions keep running and
are never closed — the `while :; do opencode run …; done` loop in
`scripts/swarm/run-*.sh` starts a new session per iteration without the previous
one stopping.

Direct evidence of the race in the working tree:

- At 07:07 the tree was clean (`git status` → only `?? references`).
- Plan 014 and `color.ts` were rewritten at 07:08:54, 07:09:06, 07:09:40 by a
  session other than this one.
- During a 25-second idle period (07:20:00→07:20:25) a peer created
  `packages/tokens/src/status-tone.example.ts`, created a **duplicate** untracked
  plan `014-status-tones.md` (distinct from the committed
  `014-status-tones-and-colour-helpers.md`), and rewrote `color.ts` (07:21:50).
- `HEAD` moved under this session from `d96e113` to `43849a7`
  (`docs(plans): status tones, alpha and statusTone plan`) — a peer commit.

## Impact

- Two plans for one task now exist (`014-status-tones.md` and
  `014-status-tones-and-colour-helpers.md`); the index points at only one.
- Whole-file `write` calls can erase a peer's newer edits; `edit` calls fail when
  the file changed underneath; `git commit` can capture a half-applied state and
  push a red `HEAD`.
- The `TODO.md`/`COMPONENTS.md` truth files can end up inconsistent with the tree.

## Recommended fix (harness — not this workstream's paths)

1. In `scripts/swarm/run-*.sh`, do not start a new `opencode run` until the
   previous session is actually closed, and close/abort it on exit. The loop
   currently serialises the *clients*, not the *sessions*.
2. Add a per-worktree lock (the supervisor already uses a shared lock for its own
   ticks) so at most one `swarm:<workstream>` session owns a worktree at a time.
3. On start, reap any live session whose `directory` equals the worktree.

## What this agent did

- Verified the committed state is green before the race: at `d96e113`
  `nub run check`, `nub run lint`, `nub run test` all passed (118 tests).
- Pushed `agent/tokens-theme` (`d96e113..43849a7`) so committed progress is
  visible remotely.
- **Deliberately wrote nothing else** to the tree — a peer is actively
  implementing plan 014 — and committed only this uniquely-named file with an
  explicit pathspec (`git commit -- <path>`) so no peer's staged work is swept in.

## Recurrence: 2026-10-17 08:31–08:40

Still unresolved. Evidence, same worktree:

| Time | Observation |
| ---- | ----------- |
| 07:52 | session `ses_eb7ccad84…` reads the tree at `5ea2c84` |
| 07:54 | peer commits `29fe8a6 feat(tokens): colour role index …` and claims plan number **015** |
| 07:58 | the reading session's plan files (`015-tokens-consumable-exports.md`, `016-focus-ring-and-docs-truth.md`) had to be renumbered to 016/017 to avoid a duplicate index row |
| 08:31:44 | a **second** `swarm:tokens-theme` session (`ses_eb7a7c4d1…`) is created in this worktree; after its last message at 08:39:45 it stops with `session_pending` and `session_inbox` both empty and no client of its own |

Consequence this time: none to committed work — every unit was committed and
pushed (`a94ec33`, `8da31f0`, `f51d916`) and the tree stayed clean — but one
uncommitted file was lost to a `git checkout -- <path>` run to undo a deliberate
mutation, which is exactly the hazard the one-writer rule exists for.

The fix still belongs to the harness (`scripts/swarm/run-*.sh`,
`scripts/swarm-supervisor.sh`), not to this workstream: the `opencode run` loop
must not start a session while one for the same worktree is live, and a start
must reap sessions whose `directory` equals the worktree. `primitives` plan 022
(`.agents/slop/plans/022-swarm-single-writer.md`) proposes the guard.

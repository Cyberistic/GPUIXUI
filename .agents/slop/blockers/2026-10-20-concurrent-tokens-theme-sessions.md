# 2026-10-20 — two live `tokens-theme` sessions in one worktree

`TODO.md` already tracks the single-writer defect ("Enforce one live session per
worktree", guard planned as `primitives` plan 022). This file records the
evidence as it hit this workstream, so the next session does not re-discover it
and does not fight the writer that is already in the tree.

## What happened

Two `tokens-theme` sessions were live in
`workspaces/tokens-theme` at the same time:

| Session | Started | What it was doing |
| ------- | ------- | ----------------- |
| TUI session (`opencode`, pid 72997 parent `opencode serve`) | Mon 07:00 | reading `MISSION.md`, then `BLOCKERS.md`, `TODO.md`, plan index; found the unguarded index counts |
| `opencode run --title swarm:tokens-theme` (pid 28605) | 16:52 | same task: falsified the four counts in `docs/tokens.md` at 16:53, wrote plan `774` at 16:57, added the `docs.test.ts` guard |

The TUI session's first sight of the tree (16:52) already carried an
uncommitted `docs/tokens.md` whose four index counts had been incremented
(`ten → eleven`, `four → five` ×3). The full package suite was run over it and
passed: **208 files / 7029 tests**, which is the plan-774 bug itself.

At 16:58 the TUI session ran `git checkout -- docs/tokens.md`, believing the
edit was stale. It was almost certainly the live session's can-fail fixture,
not a stale edit. The file now matches the committed, correct text, which is
plan `774`'s stated end state ("No prose edit"), so nothing was lost — but the
other session's in-flight mutation was reverted underneath it. That is the
hazard the one-writer rule exists to prevent.

## The rule this violated

`AGENTS.md` §6: *one writer per tree.* A session that finds another live
`opencode run --title swarm:<workstream>` whose child processes or recent
file writes are in the same worktree must not write there: not the source, not
`TODO.md`, not `.agents/slop/plans/README.md`, and not `git commit` (a commit
in that tree stages the other writer's work in progress).

## What the next session should do

1. `ps -ax -o pid,etime,command | grep "opencode run --title swarm:tokens-theme"`
   before the first write. A second PID means the tree is owned.
2. If it is owned, leave the tree alone and report; do not "help" by reverting a
   dirty file — a dirty file may be a can-fail fixture.
3. The durable fix stays `primitives` plan 022 (a lock per worktree). Until it
   lands, the supervisor should not start a session for a worktree whose previous
   session has not exited: `scripts/swarm-daemon.sh` and
   `scripts/swarm-supervisor.sh` are the places to add the check (owner: repo
   tooling; recorded in `TODO.md`).

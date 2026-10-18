# B3 recurrence — two live `swarm:playground` sessions in one worktree

**Observed** 2026-10-18 ~19:33 while the media-surface probe (plan `520`) was
being verified. This is the same failure the 2026-10-17 note in `TODO.md`
(§ Process — one writer per tree) records, and the same one the 2026-10-18
~04:30 note records for this exact worktree.

## Evidence

- `ps -axo pid,lstart,command` at 19:33:
  - pid `43459`, `Sun Oct 18 19:30:48 2026`,
    `opencode run … --title swarm:playground …` — the rotating supervisor turn,
    working in `/Users/cyberistic/GPUIXUI/workspaces/playground`.
  - pid `72997`, `opencode` — the interactive session that owned this tree
    before 19:30 (the session that landed plan `520`).
- `git status` at 19:33, after `0799afc` (plan `520`) was committed and pushed:
  - untracked `.agents/slop/plans/522-root-single-child.md`
  - untracked `apps/playground/src/scenarios/root.tsx`
  - modified `.agents/slop/plans/README.md` (a `522` row and a re-numbering
    note that says plan `521` went to the components workstream)
  - modified `apps/playground/src/scenarios/index.ts`,
    `apps/playground/src/live/scenarios.tsx`,
    `packages/testing/src/smoke.ts` (`"root"` capability)
  - plus the doc-count corrections this session was committing (`TODO.md`,
    `apps/playground/README.md`).

None of the `522`/`root` changes were authored by the plan-`520` session. The
second writer's work appeared while the plan-`520` session was running the full
live suite (`--all`, 45/45 green), so the two also ran native suites against the
same tree and display.

## What was done

- The plan-`520` session stopped writing code, tests and suites at the first
  sign of the second writer.
- Its own work was already committed and pushed (`0799afc`), and the remaining
  doc-count corrections were committed alone (`e952004`) — only files whose
  diff was verified to contain no second-writer content.
- The second writer's untracked and modified files were left untouched; no
  revert, no formatting pass, no build.
- No commit was made of `.agents/slop/plans/README.md`, because its current
  diff is the second writer's.

## Cause

Unchanged from the 2026-10-17 note: the supervisor starts a workstream turn when
the pid file is gone and cannot see an interactive session in the same tree. The
permanent fix is plan `022` §5 in `scripts/` (pinned `--session`, live-session
counting in `agent_alive`, `scripts/check-single-writer.sh`) and is outside both
playground paths.

## Recommendation

1. Land plan `022` §5 before the next playground tick.
2. Until then, a playground agent that finds files it did not author should
   commit its own verified files and stand down, as this note records — never
   `git add -A` and never run the native suites while another writer is active.
3. If two writers must run, give the second its own `git worktree`; a second
   session in `workspaces/playground` cannot be made safe by ordering commits.

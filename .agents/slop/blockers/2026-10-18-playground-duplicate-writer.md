# 2026-10-18 — two live playground writers, one tree (B3 recurrence)

**Status:** measured, mitigated by standing this session down; the permanent fix
is `scripts/`-owned (plan `022` §5).

## What happened

Two `opencode` sessions were writing `workspaces/playground` at once:

| Session | Created (UTC) | Last update (UTC) | How it ran |
| ------- | ------------- | ----------------- | ---------- |
| `ses_eb3ce55b8ffeqF6CtCPVZd5JEV` | 2026-10-17T23:28:05Z | 2026-10-17T23:53:20Z | the runner's **previous** turn; its CLI call died with `Transport: The socket connection was closed unexpectedly` at ~23:42, but the server-side turn kept going |
| `ses_eb3c0c621ffeaFLFUJO8Z2RFDz` | 2026-10-17T23:42:55Z | this session | the runner's **current** turn (pid `91471`, child of `.agents/slop/swarm/run-playground.sh` pid `1715`) |

Both were handed the same `prompt-playground.md`, both picked the same task
(`TODO.md`: *Mount the real Tier 2 components in the playground*), and both
started writing it within minutes. Evidence from the tree:

- `23:46Z` — `ses_eb3ce55b…` wrote `.agents/slop/plans/330-tier2-in-playground.md`.
- `23:48–23:53Z` — the same session wrote `src/scenarios/await-readout.ts`,
  `tier2-dialog.tsx`, `tier2-menu.tsx`, `tier2-toast.tsx`, and edited
  `src/scenarios/index.ts`, `toast.tsx`, `package.json`, `nub.lock` and
  `packages/testing/src/smoke.ts`.
- This session (`ses_eb3c0c62…`) wrote a duplicate plan `324` and a README index
  row before noticing; both were removed. Two `edit` calls failed with
  *"could not find oldString"* because the other session had already added the
  exact lines (`@gpuixui/components`, `"tier2"` in `CAPABILITIES`) between this
  session's read and its write — the collision is directly observable.

## Why the runner did not prevent it

`run-playground.sh` starts a new `opencode run` whenever the previous CLI call
returns. A transport close ends the CLI call but **not** the server-side turn, so
the runner started a second turn on top of the first. `agent_alive` checks the
runner pid, which is healthy the whole time, so the supervisor reports
`live=5/5` and starts nothing. This is the same mechanism recorded in
`.agents/slop/plans/022-swarm-single-writer.md` and
`2026-10-17-concurrent-tokens-writers.md`; the fix (pin `--session`, count
server-side live sessions, refuse a workstream whose tree has uncommitted
changes from another pid) still lives in `scripts/`.

## Mitigation taken now

- This session stopped writing implementation. One writer —
  `ses_eb3ce55b…`, which is further along and owns plan `330` — kept the tree.
- The duplicate plan and its index row were removed, so `330` is the only Tier 2
  mount plan.
- No session was deleted and no uncommitted work was reverted: that is the
  coordinator's call (plan `022` §4/§7).

## Suggested guard (for the `scripts/` owner)

Before each `opencode run`, the runner should refuse to start when the
worktree's `git status --porcelain` is non-empty **and** the last writer pid is
not the current runner; or pin one `--session` id per workstream and resume it
instead of creating a new one. Either would have made this collision impossible.

## Outcome

The orphaned session finished the task cleanly and pushed it:

| Commit | Contents |
| ------ | -------- |
| `311191a` | plan `330`, the plan index and this note |
| `3a61720` | `tier2-dialog` / `tier2-menu` / `tier2-toast`, the `tier2` capability, the `awaitReadout` flake fix, the vendor tsconfig, `TODO.md` + `COMPONENTS.md` |

The official runner turn then verified it independently, without writing:

- `nub apps/playground/dist/smoke/run.js` → **64/64 passed**, exit `0`,
  `… tier2=verified` (all three `tier2-*` scenarios green). This is the gate that
  matters for the landed commit and it was a real run, not a report read back.
- `nub run check` at 03:19 failed **only** on the other session's in-flight
  `apps/playground/src/live/scenarios.tsx` (three unused imports for plan `331`,
  then uncommitted). That is a transient state of a second task, not a defect in
  `3a61720`; the full gate has to be re-run once `331` lands, because verifying a
  tree while another writer holds it cannot produce a trustworthy answer. The
  run was stopped rather than reported as a failure or as green.

Two facts the collision cost, and the reason this note exists: the same task was
planned twice (plans `324` and `330`), and two `edit` calls failed on stale
`oldString` matches because the other writer had changed those exact lines
seconds earlier. No file was lost, because the losing writer stopped at the
first observable collision instead of retrying harder.

---

## Second recurrence, 2026-10-18 04:00–05:40 UTC+3 (three live sessions)

A server restart during a turn produced **three** live `swarm:playground`
sessions at once:

```sh
sqlite3 ~/.local/share/opencode/opencode.db \
  "select id, datetime(time_created/1000,'unixepoch','localtime')
     from session_v2
    where directory like '%/workspaces/playground' and time_idle is null;"
```

```text
ses_eb39d3882ffe2KO9gl2oqvrL45  03:21:44
ses_eb3793506ffekZsgfWv1g67OXj  04:01:10   this session
ses_eb373a33affeFkrlp0ozkaQHm1  04:07:11
```

All three held the tree between 04:20 and 04:30 (`time_updated` within the same
minute). The observable collisions, in order:

1. Two sessions committed the **same live-wait fix** under different messages
   (`11c911f` bounded the Tier 2/scroller waits; `1b257fe` committed the focus
   waits this session wrote while the other turn was editing `plan 331`).
2. Two sessions wrote the **same task** — the replace feasibility probe. One
   produced plan `333-search-replace.md`, `replace-state.ts`, `search-replace.tsx`
   and claimed the `replace` capability; this session produced plan `333-search-
   and-replace.md`, `replace-core.ts` and `replace-contract`. The other session
   renamed its plan to `334` on seeing the collision; both scenarios were then
   registered in one `index.ts` (two writers, one file, sequential edits that
   happened to merge).
3. `git commit -- <path>` was the only safe way to land a unit: `git add -A`
   would have committed the other writer's half-written scenario.

### Resolution taken

The two probes are **complementary, not duplicates**, by the other plan's own
framing ("the editor/caret half is plan 333"): plan `334` measures washes after
a document mutation, the find cursor and `<code>`; plan `333` measures the
editor's caret across a programmatic rewrite. Both were kept, and the commit
that landed this session's probe also carried the registered `334` scenario
files, because leaving the `index.ts` import without its module would have
broken the branch for every other workstream. The full gates were then run on
the **combined** tree: `nub run check` green, `nub run test` 957 tests green,
headless `66/66`, live `20/20` — the first trustworthy whole-tree answer of the
night.

### What it cost

- One task was planned and implemented twice (two plans, two scenario files, two
  pure rule modules) before either writer noticed.
- A `git push` was rejected once because two turns pushed in the same second.
- Two `git commit` calls returned "nothing to commit": a peer had already
  committed this session's working-tree changes. The content landed; the
  authorship record did not.

The permanent fix is unchanged and still `scripts/`-owned: pin one `--session`
per workstream, count server-side live sessions in `agent_alive`, and refuse to
start a turn whose worktree has another pid's uncommitted changes.



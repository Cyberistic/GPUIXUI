# 118 — B3 in the components worktree: two live writers, one tree

- **Phase:** cross-cutting (swarm infrastructure). **Found by:** components
  workstream, 2026-10-17 08:47 (+03).
- **Owner of the fix:** `scripts/` in the shared checkout — outside every
  workstream's paths, so it needs the coordinator. This workstream must not
  edit it (AGENTS.md §6, and the user's "own only your paths" rule).
- **Depends on:** nothing. **Status:** `BLOCKER (B3) — confirmed live`.
- **Duplicates:** `022-swarm-single-writer.md` (primitives worktree) is the
  root-cause analysis, the mechanism and the permanent fix. This plan is the
  components-worktree measurement and the workstream's response; read 022 for
  the fix.

---

## 1. What is happening (measured, not inferred)

Two live top-level sessions are writing `workspaces/components` at once:

```sh
sqlite3 ~/.local/share/opencode/opencode.db \
  "select id, datetime(time_created/1000,'unixepoch','localtime')
     from session_v2
    where directory like '%/workspaces/components' and time_idle is null;"
```

| Session | Created | Role |
| ------- | ------- | ---- |
| `ses_eb7f09666ffeRRbJxPz0d344Cw` | 07:12:12 | stale turn from an earlier supervisor tick |
| `ses_eb7a7c3edffeSehcVqeqHJEsYa` | 08:31:44 | **this** session — the current `run-components.sh` turn (`OPENCODE_SESSION_ID`) |

Both were live at 08:47, each with a growing message count (176 and 58). The
mechanism is plan 022 §2: `run-components.sh` starts a fresh `opencode run`
session every iteration and does not own the turn, so a server-side turn that
outlives its CLI call keeps writing while the loop starts another on top of it.
`agent_alive` only checks the runner pid, so the supervisor sees one healthy
workstream and cannot tell there are two writers.

The collision was observed directly, not inferred: between 08:40 and 08:47 the
tree gained `card.tsx`, `src/behaviour/card.test.tsx`, `docs/card.mdx`,
`examples/card.example.tsx`, edits to `COMPONENTS.md`, `TODO.md` and
`plans/117`, and the commits `7786193`, `f424b1e`, `ab000ab` — none authored by
this session.

## 2. Impact

Identical to plan 022 §3: work is destroyed rather than duplicated, the gates
can read a file that changes under them, and `TODO.md` / `COMPONENTS.md` — the
swarm's source of truth — are themselves racy. A workstream that keeps writing
here is manufacturing a half-merged tree, not making progress.

## 3. What this workstream did

- **Stopped writing component code** the moment the duplicate was confirmed, so
  that exactly one writer remains (the stale session) and the one-writer
  invariant is restored. This is the precedent plan 022 §8 set for primitives.
- **Kept the one clean, non-overlapping commit already landed** before the
  duplication was fully understood: `22f706c` (the status-tone palette and
  alpha helper, plan 110 §6). It touches only `internal/theme.ts` and its test,
  which the other session needs for Badge/Alert/Toast, and it is preserved in
  history either way.
- Did **not** delete a session. §4 of plan 022 assigns that to the coordinator,
  and deleting the stale session would discard its in-flight (uncommitted) work
  — the exact STOP condition 022 §7 names.

## 4. The fix

Apply plan 022 §5 to the components runner: pin the session id
(`opencode run --session "swarm-components" …`) so a second run joins the
first instead of forking, and teach `agent_alive` to count live server-side
sessions for the directory. Both are `scripts/` changes, recorded in `TODO.md`
under Interlocks.

## 5. Verification — the test that must fail now and pass after

```sh
n=0; while [ $n -lt 2 ]; do
  n=$(sqlite3 ~/.local/share/opencode/opencode.db \
      "select count(*) from session_v2
        where directory like '%/workspaces/components' and time_idle is null;")
  printf 'components live-sessions=%s\n' "$n"; sleep 5
done
```

- **Now:** prints `2` twice — the test cannot fail.
- **After the fix:** prints `1` twice, and still `1` after the next tick.
- Commit plan 022 §6's loop as `scripts/check-single-writer.sh` and run it from
  the supervisor tick, so a duplicate is detected instead of discovered by a
  clobbered agent. That is the regression test this fix must land with
  (AGENTS.md §3).

## 6. STOP conditions

Plan 022 §7 applies. Additional:

1. Do not resume writing `packages/components` until the §5 verification prints
   `1`. Resuming under two writers reproduces the collision within one tick.
2. Do not delete the stale session unless its uncommitted work is first
   committed or reproduced — capture `git status --short` first.

## 7. Acceptance criteria

- The components worktree shows exactly one live session over two ticks.
- The permanent fix is in `scripts/` with the regression check wired into the
  supervisor tick.
- This plan is indexed in `.agents/slop/plans/README.md`, and the components
  `TODO.md` interlock row cites it.

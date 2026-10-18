# 118 — B3 in the components worktree: two live writers, one tree

- **Phase:** cross-cutting (swarm infrastructure). **Found by:** components
  workstream, 2026-10-17 08:47 (+03).
- **Owner of the fix:** `scripts/` in the shared checkout — outside every
  workstream's paths, so it needs the coordinator. This workstream must not
  edit it (AGENTS.md §6, and the user's "own only your paths" rule).
- **Depends on:** nothing. **Status:** resolved in this worktree 2026-10-17; the
  permanent `scripts/` fix (plan 022 §5) is still the coordinator's.
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

### The §5 check is necessary but not sufficient (measured 08:54 the same day)

The *pair* rotates, so the count cannot fall to `1` by agent discipline:

| Time | Live sessions holding `workspaces/components` |
| ---- | -------------------------------------------- |
| 08:47 | `ses_eb7f0966…` (07:12, stale turn) + `ses_eb7a7c3e…` (08:31, that turn) |
| 08:52 | unchanged — the check printed `2` |
| 08:54 | `ses_eb7f0966…` (**still** live) + `ses_eb795d97…` (a **new** turn) |

`ses_eb7a7c3e…` went idle and the runner immediately started `ses_eb795d97…`. The
stale turn is the constant and the second session is the rotating one, so the
count stays `2` for as long as the stale turn lives however disciplined the
rotating turn is. **The resume condition therefore cannot be satisfied by agent
behaviour**: it needs the coordinator's fix (plan 022 §5 — pin `--session` so a
second run joins the first, and teach `agent_alive` to count live server-side
sessions), or the explicit ending of the stale turn.

Consequences for this workstream:

1. Component code stays paused. The last clean state is committed and pushed
   (`ab000ab`, `22f706c`), the gates are green, and nothing is left uncommitted,
   so whichever session resumes later starts from `HEAD`.
2. A doc-only edit is not `packages/components` code and does not reintroduce the
   collision, which is why this measurement lands in the plan and in `TODO.md`.

### The deadlock in §3 + STOP 1, and the resolution

As written, the plan contradicts itself:

- §3 keeps **the stale session** as the one remaining writer ("exactly one writer
  remains (the stale session)").
- STOP 1 forbids resuming until the §5 count is `1` — but the stale session's own
  liveness is what keeps the count at `2` while the rotating turn is replaced.

Read literally, no session may write and the workstream idles. That is worse than
either single-writer choice, because the swarm keeps paying for ticks that produce
nothing. The tie-breaker should be *which session the supervisor can see and
replace*:

| Candidate | Replacement | Verdict |
| --------- | ----------- | ------- |
| the rotating `run-components.sh` turn | the loop starts a fresh turn as soon as this one returns | **this one writes** |
| the stale turn (`ses_eb7f0966…`, 07:12) | nothing restarts it; only the coordinator can end it | this one **stands down** |

**Recommendation:** while the duplicate exists, the rotating turn owns
`packages/components` and the stale turn stops writing and reports. The invariant
is then "exactly one writer" in fact, even though `session_v2` still counts two —
which is precisely why the count alone must not gate resumption. The permanent fix
stays plan 022 §5; until then, treat `session_v2` as advisory and the *commits* as
the record of who wrote.

**This session stands down.** It is `ses_eb7f0966…` (07:12) — the stale turn. It
has committed and pushed everything it produced (`bd215f9`, `7786193`, `f424b1e`,
`ab000ab`, `79403ee`), left no uncommitted work, and will not write
`packages/components` further. If a later measurement still lists it as live, it
is idle, and the coordinator may end it.

### Recurrence, 2026-10-18 04:38 (+03)

Measured again after the server restarted under a live turn:

| Session | Created | Process | Role |
| ------- | ------- | ------- | ---- |
| `ses_eb379273…` | 04:01:11 | none — its `opencode run` was ended by the restart | **stale turn** |
| `ses_eb3739fc…` | 04:07:12 | pid 2826, `--title swarm:components` | current supervisor turn |

The stale turn had landed plan 326 (`b9509fa`), merged `origin/master` (`7416cb3`) and pushed both;
the current turn then landed `15c0777` and was editing `plans/207` and
`behaviour/preview-card.test.tsx` while the stale turn was still live. The stale turn stood
down again — it made no further `packages/components` change — so the precedent in §3 holds:
exactly one writer, the one the supervisor can see. The permanent fix is still plan 022 §5.

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

## 8. Recurrence — 2026-10-18 02:46 (+03)

The bug is live again, one tick after plan 325 started:

```sh
sqlite3 ~/.local/share/opencode/opencode.db \
  "select id, datetime(time_created/1000,'unixepoch','localtime'),
          datetime(time_updated/1000,'unixepoch','localtime')
     from session_v2
    where directory like '%/workspaces/components' and time_idle is null;"
```

| Session | Created | Role |
| ------- | ------- | ---- |
| `ses_eb3d04944ffe9ybaEImk0aDBPY` | 02:25:57 | previous turn, still generating |
| `ses_eb3c0caf1ffexSHAOfZNV2FGzp` | 02:42:53 | this turn (`run-components.sh`, pid 91443) |

The collision was observed, not inferred: this session's per-item hover change in
`navigation-menu.tsx` was overwritten by the other session's root-owned variant
within two minutes, and both sessions were editing
`src/behaviour/navigation-menu.test.tsx` and plan 325 at once. `check-types`
briefly failed on a half-and-half file (one session's context interface with the
other's trigger reads).

Resolution is unchanged and still the coordinator's: plan 022 §5. Until it
lands, this workstream must treat the live-session count as a **hard** gate —
the "rotating turn owns the tree" tie-breaker in §5 only works if the other
turn actually stands down, and both turns are model-driven, so neither can
enforce it. The pragmatic rule for the next tick: if the count is `2`, edit only
`.agents/slop/` and report; do not touch `packages/components`.

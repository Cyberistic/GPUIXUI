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

### Recurrence, 2026-10-18 18:03–18:12 (plan 515)

The pair recurred during the plan-515 turn. Evidence:

- two different `swarm:components` sessions wrote `packages/components` within
  the same minute: `ses_eb078862fffeem9JJRCKIrr1eY` (this turn) and
  `ses_eb07dc155ffe0oBqHX48yI7lbY`;
- the other turn authored its own `514-escape-claims-in-fields.md`, edited five
  field components plus `preview-card.tsx`, and committed `e8f3e2f`, then
  `ca23609` — the second commit swept this turn's renamed plan, README and TODO
  edits into its tree and then dropped them, so a `git mv` and a README edit
  briefly had no owner;
- the §5 count printed `1` throughout, because the other turn was between
  server-side turns while still committing.

Resolution this time: this turn stopped editing component code, preserved the
other turn's 514 work, verified it (66 targeted tests, full suite 654), then
renumbered its own plan to `515` and landed the remaining fix
(`0638ccf`). The permanent fix is still plan `022` §5 — a pinned session and a
hard live-session gate. Until then, the pragmatic rule above stands: on a second
writer, touch only `.agents/slop/` and report.

### Recurrence, 2026-10-18 19:36–20:05 (plan 525)

The pair recurred during the plan-525 motion slice, and this time the §5 query
was **wrong**, not merely advisory:

| Session | Created | Role |
| ------- | ------- | ---- |
| `ses_eb0657795fferKVGQBWrc7P05k` | 18:21:30 | previous turn, still writing plan 525 |
| `ses_eb02154a2ffeBtp5JI9fVusloa` | 19:35:55 | this turn (`run-components.sh`) |

- The §5 query (`time_idle is null`) printed **only this turn** while the other
  turn was actively writing: its `time_idle` stayed set to a stale timestamp
  (19:41:51) even as `time_updated` advanced past 19:44 and it authored the
  plan-525 tests at 19:40–19:41, then the commit at 20:05. **`time_idle is null`
  undercounts a live writer.** Use `time_updated` recency instead, e.g.

  ```sh
  sqlite3 ~/.local/share/opencode/opencode.db \
    "select id, datetime(time_updated/1000,'unixepoch','localtime')
       from session_v2
      where directory like '%/workspaces/components'
        and time_updated > (strftime('%s','now') - 300) * 1000;"
  ```

  (a writer that updated within the last five minutes), and check `ps` for the
  runner. A session that has `time_idle` set but a recent `time_updated` is
  still writing.
- The collision was observed: this turn's first popover edit (moving the motion
  wrapper inside the anchored host) was replaced by the other turn's own version
  of the same fix within two minutes, and the files' mtimes advanced while this
  turn was reading them.
- Resolution this time: this turn stopped writing, watched the other turn finish
  plan 525 (`46682a3`, pushed), verified it independently (unit 404, behaviour
  694) and only then claimed the next plan (`526`, `34e77f5f`). No work was
  lost. A hung live-run child of the other turn was ended after 6 minutes; the
  turn then resumed, recorded the live result in plan 525 and committed.
- The permanent fix is still plan `022` §5. The added requirement from this
  recurrence: the liveness gate must be `time_updated`-based, not
  `time_idle`-based.

## Recurrence 2026-10-20 16:52–16:56 — the 30-minute tick overlapped a running turn

Measured while implementing plan `773` in this worktree:

- This turn (`opencode run --title swarm:components`, pid `44939`, started
  16:26) was mid-implementation when the supervisor's next tick started a
  **second** `swarm:components` turn in the same directory (pid `28640`, started
  **16:52:33**).
- The second turn read the plan index — which listed `773` as pending, because
  this turn had committed and pushed the plan — and began implementing the same
  plan. `packages/components/src/date-picker/calendar.ts` gained a
  `spanAvailable` helper at **16:55:32**, 15 s after this turn's last read of the
  file, while this turn was running `date-picker.test.tsx`. The two writers'
  changes are interleaved in the same four files.
- The §5 gate cannot see this: both sessions are a single `opencode run` each,
  the runner pid check sees only the newest, and the components package has no
  per-file lock.
- Resolution this time: **this turn (the older one) stood down.** Plan `772`
  (a shortcut row's name) was complete, verified and pushed before the
  collision. Plan `773` is committed and pushed as a plan only (`7daa8e85`);
  its uncommitted implementation — this turn's day-grid half plus the newer
  turn's month/year `spanAvailable` half — is left in the tree for the newer
  turn, which is the one the supervisor will replace next. This turn's scratch
  probe was deleted so it cannot poison the newer turn's suite, and no further
  component file was touched.
- The open defect this leaves for the newer turn: the `date-month` control's
  disabled state depends on `hasAvailableMonth`, which now needs
  `isMonthAvailable` to honour `hasAnyDay` (the newer turn's `spanAvailable`
  already does); the one failing case at 16:55 was
  `cannot open the month chooser when no month is available`.

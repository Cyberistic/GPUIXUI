# 739 — The promotion gate on the head that includes the shadow pixels

**Phase:** F (release). **Depends on:** `639`, `653`, `656`, `702`, `714`,
`723`, `735`, `736`. **Number:** the first free number after `736` (`737` is the
tokens workstream's disabled-fill plan, `738` the components workstream's toast
hover-hold plan, `739` unclaimed at the time of writing).

**This plan is verification only. No source change.** It exists because the last
full gate (plan `735`, code head `e384a66a`) predates one check-adding commit:

| plan | id | registry | checks then → now |
| ---- | -- | -------- | ----------------- |
| `736` | `shadow-pixels` | headless | new id → **28** |
| `736` | `live-shadow-pixels` | live | new id → **28** |

So the recorded headless total `3935` and live total `2688` no longer describe
the branch. The expected totals are `3935 + 28 = 3963` and
`2688 + 28 = 2716`, and each registry gained one id (`107 → 108`,
`96 → 97`). The gate measures the truth; the ledger takes the measured number,
not this prediction.

The branch is the promotion candidate: `TODO.md` → *Promote the playground
workstream to the integration branch* is `[~]` (prepared; the owner/supervisor
runs the merge). The workstream never pushes to master.

## 1. Preconditions

From `/Users/cyberistic/GPUIXUI/workspaces/playground`:

1. `git status --short` is empty and `git log -1 --oneline` names this plan's
   commit.
2. `git merge-base --is-ancestor origin/master HEAD` succeeds and
   `git rev-list --count HEAD..origin/master` prints `0` (the promotion is still
   a fast-forward). If `origin/master` has advanced, merge it **into this
   branch** first and re-run every command below; resolve conflicts here, never
   on master.
3. `nub apps/playground/dist/smoke/run.js --list | wc -l` prints **108**.
4. `nub apps/playground/dist/live/run.js --list | wc -l` prints **97**.
5. The two `shadow` ids are registered:
   `nub apps/playground/dist/smoke/run.js --list | grep -c '^shadow-pixels$'`
   and the live equivalent for `live-shadow-pixels` each print `1`.

STOP if any precondition fails; report which one.

## 2. Commands

```sh
nub run --filter playground build            # dist matches the head
nub apps/playground/dist/smoke/run.js         # the whole headless registry (bare = all)
nub apps/playground/dist/live/run.js --all    # the whole live registry (merge gate)
nub run check && nub run lint && nub run test
```

The headless runner's bare command is the whole suite; `--all` is a usage error
there (exit `2`). The live run opens one real window and took ~19 minutes on the
last gate; do not interrupt it, and do not run it concurrently with another full
run.

## 3. Expected results

- Headless: **108/108**, exit `0`, **3963** checks, 65 capabilities,
  `shadow-pixels` **28**.
- Live: **97/97**, exit `0`, **2716** checks, 61 capabilities,
  `live-shadow-pixels` **28**. `live-tier2-editing` may report 31–33 (its
  measured window-state branch, plan `605`), which moves the total by ±2.
- A plain run writes **no** `provenance.json` and no capture directory.
- `check`/`lint`/`test`: green; playground **487** tests, testing 69,
  components 308, primitives 282, tokens 196, tw 103, icons 19, docs 7.

Read the totals back from `apps/playground/.artifacts/smoke-report.json` and
`live-report.json` rather than from the console tail; count `scenarios`,
summarise `checks`, and quote `host` (it must name the release-tag pins
`gpuix 9fcd6288` / `zed 81c99f81`).

For each expected check count, the per-id number is in the report's scenario
entries; a delta that is not the table above is a real finding, not rounding.

## 4. STOP conditions

- Any scenario fails: **do not** re-run hoping for green. Capture the failing
  check's expected/actual, decide whether it is the plan-736 code or a
  pre-existing flake, and record it. A focus-only failure in a scenario this
  branch did not touch is the window-state class (plans `390`/`603`): note it,
  re-run that id once, and record both runs.
- The live total differs from §3 by more than ±2 with no failing scenario:
  recount from the registry (`--list`) and from the report; do not hand-wave.
- `--all` cannot open a window (exit `2`): the host has no binding. Report it —
  a gate without a live run is not a gate.
- `origin/master` moved **during** the run: the numbers describe the pre-merge
  head; say so in the record and re-run after the merge.

## 5. Records to update (only after a green run)

- `TODO.md` — the promotion entry: append this gate (head, date, both totals,
  durations, artifact paths) and add a `[x]` gate row at the top of the
  playground block. Correct any figure the gate contradicts.
- `apps/playground/README.md` — the "Evidence on this host" section: cite this
  gate, its head, both totals and the two new shadow ids with their check
  counts; delete any stale `3935`/`2688` figure that the gate contradicts.
- `COMPONENTS.md` — only a row that quotes a stale total; the `theme` evidence
  row already names `shadow-pixels`/`live-shadow-pixels` from plan `736`.
- `.agents/slop/plans/README.md` — this plan's row, with the measured totals.

## 6. Acceptance

- Both full registries ran on the head that will be merged, both exit `0`, and
  the totals are written into the ledgers above with the exact ids (`--all` for
  the live registry) and the artifact paths.
- `nub run check`, `nub run lint`, `nub run test` green on the same head.
- One commit on `agent/playground` recording the gate, pushed to origin. The
  merge itself is the owner/supervisor's.

## 7. As measured

Filled in by the executor after the run (§8 of plan `735` is the shape).

# 723 — The promotion gate on the head that includes the media waveform and docking pixels

**Phase:** F (release). **Depends on:** `639`, `653`, `656`, `702`, `714`,
`715`, `722`. **Number:** the first free number after `722`.

**This plan is verification only. No source change.** It exists because the last
full live gate (plan `714`, code head `f91537b0`) predates two check-adding
commits:

| plan | id | checks then → now |
| ---- | -- | ----------------- |
| `715` | `docking-layout` | 80 → **85** (headless, +5) |
| `715` | `live-docking` | 8 → **22** (live, +14) |
| `722` | `media-surface` | 62 → **72** (headless, +10) |
| `722` | `live-media` | 14 → **25** (live, +11) |

So the recorded live total `2638` no longer describes the branch. The `[x]`
task for plan `722` predicted `2649` for the live registry; that arithmetic
counted only its own `+11` and missed plan `715`'s `+14`. The gate measures the
truth and the ledger takes the measured number, not a prediction.

The branch is the promotion candidate: `TODO.md` → *Promote the playground
workstream to the integration branch* is `[~]` (prepared; the owner/supervisor
runs the merge). The workstream never pushes to master.

## 1. Preconditions

1. `git status --short` is empty and `git log -1` is this plan's commit.
2. `git merge-base --is-ancestor origin/master HEAD` succeeds (the promotion is
   still a fast-forward). If `origin/master` has advanced, merge it **into this
   branch** first and re-run every command below; resolve conflicts here, never
   on master.
3. `nub apps/playground/dist/live/run.js --list | wc -l` prints **95**.
4. `nub apps/playground/dist/smoke/run.js --list | wc -l` prints **106**.

STOP if any precondition fails; report which one.

## 2. Commands

From `/Users/cyberistic/GPUIXUI/workspaces/playground`.

```sh
nub run --filter playground build          # dist matches the head
nub apps/playground/dist/smoke/run.js       # the whole headless registry (bare = all)
nub apps/playground/dist/live/run.js --all  # the whole live registry (merge gate)
nub run check && nub run lint && nub run test
```

The live run opens one real window and took ~18 minutes on the last gate; do not
interrupt it, and do not run it concurrently with another full run.

## 3. Expected results

- Headless: **106/106**, exit `0`, **3902** checks, 65 capabilities,
  `docking-layout` **85**, `media-surface` **72**.
- Live: **95/95**, exit `0`, **~2663** checks (`2638 + 14 + 11`), 61
  capabilities; `live-docking` **22**, `live-media` **25**.
  `live-tier2-editing` may report 31–33 (its measured window-state branch, plan
  `605`), which moves the total by ±2.
- A plain run writes **no** `provenance.json` and no capture directory.
- `check`/`lint`/`test`: green; playground **481** tests, testing 69,
  components 308, primitives 282, tokens 196, tw 103, icons 19, docs 7.

Read the totals back from `apps/playground/.artifacts/smoke-report.json` and
`live-report.json` rather than from the console tail; count `scenarios`,
summarise `checks`, and quote `host` (it must name the release-tag pins
`gpuix 9fcd6288` / `zed 81c99f81`).

For each expected check count, the per-id number is in the report's scenario
entries; a delta that is not the table above is a real finding, not rounding.

## 4. STOP conditions

- Any scenario fails: **do not** re-run hoping for green. Capture the failing
  check's expected/actual, decide whether it is the plan-715/722 code or a
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

- `TODO.md` — the promotion entry: replace the stale gate numbers with this run
  (head, date, both totals, durations, artifact paths) and add a `[x]` gate row
  at the top of the playground block. Correct the plan-`722` task's predicted
  `2649` to the measured live total with a one-line reason (the `+14` it
  missed).
- `apps/playground/README.md` — the "What is proven here, honestly" live-suite
  paragraph still cites the plan-`702` total (`95/95`, `2616`). Cite this gate,
  its head and both totals, and the per-id counts that moved.
- `COMPONENTS.md` — only if a row quotes a stale live or headless total
  (`Docking` / `Media surfaces`); otherwise no change.
- `.agents/slop/plans/README.md` — this plan's row, with the measured totals.

## 6. Acceptance

- Both full registries ran on the head that will be merged, both exit `0`, and
  the totals are written into the ledgers above with the exact ids (`--all` for
  both) and the artifact paths.
- `nub run check`, `nub run lint`, `nub run test` green on the same head.
- One commit on `agent/playground` recording the gate, pushed to origin. The
  merge itself is the owner/supervisor's.

## 7. As measured (2026-10-20)

Verification only on code head `74e27a3f`, 0 behind `origin/master` (the head
still fast-forwards; the plan commit `8a4bfa53` changes only this plan and the
plan index):

| Registry | Result | Checks | Capabilities | Duration |
| -------- | ------ | ------ | ------------ | -------- |
| headless | **106/106**, exit `0` | **3902** | 65 | 168.8 s |
| live | **95/95**, exit `0` | **2663** | 61 | **1153.6 s** |

`live-docking` 22 and `live-media` 25, so the live total is `2638 + 14 + 11`
exactly and the plan-`722` prediction of `2649` was wrong by plan `715`'s 14.
`live-tier2-editing` took its 32-check branch. Both `host` lines carry the
release-tag pins (`gpuix 9fcd6288`, `zed 81c99f81`, runtime shaders), and a plain
`--all` wrote no `provenance.json` and no capture directory. Artifacts:
`apps/playground/.artifacts/smoke-report.json` and `live-report.json`.

`nub run check`, `nub run lint` and `nub run test` are green (playground **481**,
testing **69**, components 308, primitives 282, tokens 196, tw 103, icons 19,
docs 7).

**One command correction:** the headless runner's bare command already means
"all"; `--all` is a usage error there (`unknown argument: --all`, exit `2`, no
scenario runs). The plan's §2 was corrected to the bare command before the run,
and the `--all` form is the live runner's. No source changed; the ledgers cite
this run and it is the gate for the promotion fast-forward.

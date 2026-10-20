# 751 — The promotion gate on the head that includes the border pixels

| Field | Value |
| ----- | ----- |
| Status | planned |
| Phase | F (release gate) |
| Owner | playground workstream |
| Depends on | `639`, `653`, `656`, `702`, `714`, `723`, `735`, `739`, `745` |
| Feeds | the promotion fast-forward of `agent/playground` into `main` |

## 1. Goal

Plan `739` gated code head `ea2e668b` with headless **108/108** and live
**97/97**. Plan `745` then added `border-pixels` (headless) and
`live-border-pixels` (a real window), so the live registry is **98** and the
last full gate no longer covers every registered scenario. A promotion
fast-forward now would put an ungated live scenario on `main`.

This plan is **verification only**: no source change. It re-runs both full
suites on the head that includes plan `745`, reconciles the totals against the
predicted `3963 + 64 = 4027` headless and `2716 + 64 = 2780` live, and updates
the three ledgers plus the plan index.

## 2. Preconditions

1. `git status` is clean and `agent/playground` is pushed.
2. The code head is plan `745`'s `c4224479` with the ledger commit on top; `git
   log --oneline -3` shows both.
3. `git rev-list --left-right --count origin/master...HEAD` reads `0` behind
   (fetch first). If it is not zero, merge `origin/master` **in this worktree**
   and re-run `nub run check` before the gate; resolve any conflict here, never
   on `main`. A docs-only merge does not change the gate's meaning; record the
   merge commit.
4. `nub run --filter playground build` exits `0` and `nub apps/playground/dist/
   smoke/run.js --list` names both `border-pixels` and `live-border-pixels`
   (the second is on the live `--list`).

## 3. Commands and expected results

Run them in this order, with nothing else on the machine: the live suite is
timing-sensitive under load.

```sh
nub run --filter playground build
# expected exit 0

nub apps/playground/dist/smoke/run.js
# expected: 109/109 scenarios passed, 4027 checks, 65 capabilities, exit 0
# (the plan-745 focused run measured 64 checks for border-pixels)

nub apps/playground/dist/live/run.js --all
# expected: 98/98 scenarios passed, 2780 checks ± the live-tier2-editing branch
# (31–33 instead of 32), 61 capabilities, exit 0; ~19 minutes
```

Then read the artifacts rather than the console:

```sh
python3 - <<'PY'
import json
for name in ("smoke-report", "live-report"):
    r = json.load(open(f"apps/playground/.artifacts/{name}.json"))
    print(name, len(r["scenarios"]), sum(len(s["checks"]) for s in r["scenarios"]),
          len(r["capabilities"]), round(r["durationMs"] / 1000, 1), r["host"])
    print([s["id"] for s in r["scenarios"] if s["id"] == "border-pixels" or s["id"] == "live-border-pixels"])
PY
```

Expected:

- headless `109 4027 65`, host
  `gpuix TestRenderer darwin-x64 @gpuix/native 0.10.0 (gpuix 9fcd6288, zed 81c99f81, runtime shaders)`;
- live `98 2780±N 61`, host
  `gpuix live window darwin-x64 …` with the same pins.
- `border-pixels` and `live-border-pixels` each report **64** checks;
- live `live-shadow-pixels` stays **28**, `live-click-routing` **25**,
  `live-tier2-editing` reports 31, 32 or 33 (its documented branch);
- no `provenance.json` and no capture directory was written by a plain run.

Finally:

```sh
nub run check
nub run lint
nub run test
# expected: all green; playground 495 tests, testing 69, components 308,
# primitives 282, tokens 196, tw 103, icons 19, docs 7
```

## 4. Ledger updates (the only edits)

| File | Change |
| ---- | ------ |
| `apps/playground/README.md` | the live full-gate paragraph now cites this run (98/98, the exact check total, duration, head); delete the "focused-green but not in a full gate" sentence added by plan `745` |
| `COMPONENTS.md` | the suite is 109/109 and the live gate is 98/98 with the measured totals; the `theme` row and Design tokens row keep their ids |
| `TODO.md` | tick this task with the measured totals and the exact commands; update the promotion task's gate citation to this run |
| `.agents/slop/plans/README.md` | this plan's row becomes **landed** with the totals |
| this plan | §6 Results with the run, wall-clock and any variance |

## 5. STOP conditions

- Any scenario fails: this is a real regression on a head that was focused-green.
  Do **not** retry the same command unchanged. Read the failure, capture the
  report, and diagnose. A fix needs its own plan and a focused two-direction
  proof before the gate is re-run.
- The headless total is not `4027`, or `border-pixels` is not 64: reconcile which
  scenario changed and by how much before editing a ledger. Do not overwrite a
  total you have not read back.
- The live total differs from `2780` by more than the `live-tier2-editing`
  branch (±1) — e.g. a whole scenario missing: the registry and the report
  disagree; stop and report the id list rather than a number.
- `origin/master` advanced by more than docs since the last fetch, or a merge
  conflict appears: resolve in this worktree and re-run `nub run check`; stop if
  the conflict touches a file outside this workstream.
- A suite exits `2`: the host has no binding; this is not evidence and the gate
  cannot be claimed.

## 6. Results

_(Filled by the executor.)_

## 7. Rollback

Documentation-only: revert the ledger commit. The gate proves an existing code
head; it changes no behaviour.

# 786 — The promotion gate on the head that includes the truncation and content-theme pixels

| Field | Value |
| ----- | ----- |
| Status | planned |
| Phase | F (release gate) |
| Owner | playground workstream |
| Depends on | `639`, `653`, `656`, `702`, `714`, `723`, `735`, `739`, `745`, `751`, `755`, `762`, `764`, `768`, `771`, `773`, `775`, `777`, `778`, `784` |
| Feeds | the promotion fast-forward of `agent/playground` into `main` |

## 1. Goal

Plan `777` was the last full gate: headless **115/115** (`4206` checks) and live
**104/104** (`2987` checks) on the head that includes the text ink and
decoration pixels. Two probes have landed since, each adding one headless
scenario and one live twin, and neither is inside a full gate:

| Plan | Headless id | Live id | Checks each |
| ---- | ----------- | ------- | ----------- |
| `778` | `text-truncation-pixels` | `live-truncation-pixels` | 22 |
| `784` | `surface-theme` | `live-surface-theme` | 50 |

The registries are therefore **117** headless and **106** live. Plan `778`'s
end-of-task run covered the headless side at 116 (`4228` checks); plan `784`
was verified only by its two focused runs (headless and live, 50 checks each)
and its unit tests. The live half has never run as a whole at 106, so a
promotion fast-forward now would put two ungated live scenarios on `main`.

This plan is **verification only**: no source change. It re-runs both full
suites, reconciles the totals against the predicted `4228 + 50 = 4278`
headless and `2987 + 22 + 50 = 3059` live (± the documented
`live-tier2-editing` branch), and updates the ledgers plus the plan index.

## 2. Preconditions

1. `git status --short` is empty and `agent/playground` is pushed
   (`git log --oneline origin/agent/playground..HEAD` prints nothing).
2. `git log --oneline -6` shows plan `784`'s code commit (`c9c44702`) and the
   ledger commit that ticks it.
3. `git fetch origin && git rev-list --left-right --count origin/master...HEAD`
   reads **0 behind**. If `origin/master` has advanced, inspect each new commit
   first: a docs-only plan may be merged here before the gate, a code commit
   needs its own assessment and a re-run after the merge.
4. No second live `swarm:playground` session is writing this tree:
   `ps -axo pid,command | grep "swarm:playground" | grep -v grep` prints only
   this session. The B3 recurrence is recorded in `TODO.md` → Phase A.
5. Build, then confirm both registries and the two ids on each side:

```sh
nub run --filter playground build
# expected: exit 0; "binding: gpuix-native.darwin-x64.node is current"

nub apps/playground/dist/smoke/run.js --list | wc -l        # 117 ids
nub apps/playground/dist/smoke/run.js --list | grep -E 'text-truncation-pixels|surface-theme'
# expected: text-truncation-pixels, surface-theme

nub apps/playground/dist/live/run.js --list | wc -l         # 106 ids
nub apps/playground/dist/live/run.js --list | grep -E 'live-truncation-pixels|live-surface-theme'
# expected: live-truncation-pixels, live-surface-theme
```

If either count differs, stop: the registry and the plan disagree before the
gate has measured anything.

## 3. Commands and expected results

Run them in this order, with nothing else heavy on the machine: the live suite
is timing-sensitive under load.

```sh
nub apps/playground/dist/smoke/run.js
# expected: 117/117 scenarios passed, 4278 checks, 65 capabilities, exit 0
# (~240-450 s is normal for this host; the full suite under load has taken 490 s)

nub apps/playground/dist/live/run.js --all
# expected: 106/106 scenarios passed, 3059 checks ± the live-tier2-editing
# branch (30-33 instead of 33), 62 capabilities, exit 0; ~20 minutes
```

Read the artifacts rather than the console:

```sh
python3 - <<'PY'
import json
for name in ("smoke-report", "live-report"):
    r = json.load(open(f"apps/playground/.artifacts/{name}.json"))
    print(name, len(r["scenarios"]), sum(len(s["checks"]) for s in r["scenarios"]),
          len(r["capabilities"]), round(r["durationMs"] / 1000, 1), r["host"])
    print({s["id"]: len(s["checks"]) for s in r["scenarios"]
           if s["id"] in ("text-truncation-pixels", "live-truncation-pixels",
                          "surface-theme", "live-surface-theme",
                          "live-tier2-editing")})
PY
```

Expected:

- headless `117 4278 65`, host
  `gpuix TestRenderer darwin-x64 @gpuix/native 0.10.0 (gpuix 9fcd6288, zed 81c99f81, runtime shaders)`;
- live `106 3059±N 62`, host `gpuix live window darwin-x64 …` with the same
  pins;
- `text-truncation-pixels` **22** and `surface-theme` **50**; their live twins
  **22** and **50**;
- `live-tier2-editing` reports 30, 31, 32 or 33 (its documented branch);
- a plain run wrote **no** `provenance.json` and no capture directory.

Finally the completion gate:

```sh
nub run check
nub run lint
nub run test
# expected: all green; playground 580 tests, testing 69, components 308,
# primitives 282, tokens 196, tw 103, icons 19, docs 7
```

## 4. Ledger updates (the only edits)

| File | Change |
| ---- | ------ |
| `apps/playground/README.md` | the "Evidence on this host" paragraph cites this run (**117/117**, the exact check total, duration) and the live gate paragraph cites **106/106** with its exact total and duration, replacing the plan-`777` gate and its "registry 106 vs gate 104" caveat |
| `COMPONENTS.md` | the suite totals become **117/117** headless and **106/106** live with this run's numbers; the content-surface rows keep their ids |
| `TODO.md` | tick this task with the measured totals and the exact commands; the previous promotion-gate row stops calling itself current |
| `.agents/slop/plans/README.md` | add plan `786`'s row with the measured totals, and set its status **landed** |
| this plan | §7 Results with the run, wall-clock, check counts and any branch variance |

## 5. STOP conditions

- **Any scenario fails.** This is a real regression on a head that was
  focused-green. Do **not** retry the same command unchanged; read the report,
  capture the failing check, and diagnose. A fix needs its own plan and a
  focused two-direction proof before the gate is re-run.
- **The headless total is not `4278`**, or `text-truncation-pixels` 22 /
  `surface-theme` 50 is off: reconcile which scenario changed and by how much
  before editing a ledger. Never overwrite a total that was not read back from
  the artifact.
- **The live total differs from `3059` by more than the `live-tier2-editing`
  branch (±1)** — for example a whole scenario missing: the registry and the
  report disagree; stop and report the id list, not a number.
- **`--list` reports 117/106 but the run reports fewer scenarios**: a scenario
  was filtered out; stop and report the missing ids.
- **`origin/master` advanced by more than docs** since the last fetch, or a
  merge conflict touches a file outside this workstream: stop and report.
- **A suite exits `2`**: the host has no binding; this is not evidence and the
  gate cannot be claimed. Re-check `nub run --filter playground build` and the
  binding store before retrying.

## 6. Test plan

This plan adds no test: it is the execution of the existing tests at full
registry width, which is the release gate. Its guards are the STOP conditions
above — they are written so a wrong total or a filtered registry is caught
before a ledger claims it. The focused proofs for the two new probes remain
plans `778` and `784` (three and seven mutation proofs respectively, observed
and reverted).

## 7. Results

_To be filled by the gate run._

# 768 — The promotion gate on the head that includes the editing actions

| Field | Value |
| ----- | ----- |
| Status | planned |
| Phase | F (release gate) |
| Owner | playground workstream |
| Depends on | `639`, `653`, `656`, `702`, `714`, `723`, `735`, `739`, `745`, `751`, `755`, `762`, `764` |
| Feeds | the promotion fast-forward of `agent/playground` into `main` |

## 1. Goal

Plan `762` was the last full gate: headless **111/111** (`4106` checks) and
live **100/100** (`2860` checks) on the head that includes plan `761`'s opacity
pixels. Plan `764` then added `editing-actions` (**46** checks headless) and
`live-editing-actions` (**73** checks in a real window), so the registries are
now **112** headless and **101** live and the last full gate covers neither.
A promotion fast-forward now would put an ungated live scenario on `main`.

This plan is **verification only**: no source change. It re-runs both full
suites on the head that includes plan `764`, reconciles the totals against the
predicted `4106 + 46 = 4152` headless and `2860 + 73 = 2933` live (± the
documented `live-tier2-editing` branch), and updates the three ledgers plus the
plan index.

## 2. Preconditions

1. `git status --short` is empty and `agent/playground` is pushed
   (`git log --oneline origin/agent/playground..HEAD` prints nothing).
2. `git log --oneline -6` shows plan `764`'s code commit (`f0c9a8f8`) and the
   ledger commits around it.
3. `git fetch origin && git rev-list --left-right --count origin/master...HEAD`
   reads `0` behind. If it does not, merge `origin/master` **in this worktree**
   and re-run `nub run check` before the gate; resolve conflicts here, never on
   `main`. Record the merge commit; a docs-only merge does not change the
   gate's meaning.
4. No second live `swarm:playground` session is writing this tree. The B3
   recurrence is recorded in `TODO.md` → Phase A; check
   `ps -axo pid,command | grep "swarm:playground"` and stop if more than this
   session is present.
5. Build, then confirm both registries and the two plan-`764` ids:

```sh
nub run --filter playground build
# expected: exit 0; "binding: gpuix-native.darwin-x64.node is current"

nub apps/playground/dist/smoke/run.js --list | wc -l        # 112 ids
nub apps/playground/dist/smoke/run.js --list | grep editing-actions
# expected: editing-actions

nub apps/playground/dist/live/run.js --list | wc -l         # 101 ids
nub apps/playground/dist/live/run.js --list | grep live-editing-actions
# expected: live-editing-actions
```

If either count differs, stop: the registry and the plan disagree before the
gate has measured anything.

## 3. Commands and expected results

Run them in this order, with nothing else on the machine: the live suite is
timing-sensitive under load.

```sh
nub apps/playground/dist/smoke/run.js
# expected: 112/112 scenarios passed, 4152 checks, 65 capabilities, exit 0
# (~340 s under the plan-764 run; 150–400 s is normal for this host)

nub apps/playground/dist/live/run.js --all
# expected: 101/101 scenarios passed, 2933 checks ± the live-tier2-editing
# branch (30–33 instead of 32), 61 capabilities, exit 0; ~21 minutes
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
           if s["id"] in ("editing-actions", "live-editing-actions",
                          "opacity-pixels", "live-opacity-pixels",
                          "live-tier2-editing")})
PY
```

Expected:

- headless `112 4152 65`, host
  `gpuix TestRenderer darwin-x64 @gpuix/native 0.10.0 (gpuix 9fcd6288, zed 81c99f81, runtime shaders)`;
- live `101 2933±N 61`, host `gpuix live window darwin-x64 …` with the same
  pins;
- `editing-actions` reports **46** and `live-editing-actions` **73**;
- `opacity-pixels` and `live-opacity-pixels` each report **29** (unchanged);
- `live-tier2-editing` reports 30, 31, 32 or 33 (its documented branch);
- a plain run wrote **no** `provenance.json` and no capture directory.

Finally the completion gate:

```sh
nub run check
nub run lint
nub run test
# expected: all green; playground 520 tests, testing 69, components 308,
# primitives 282, tokens 196, tw 103, icons 19, docs 7
```

## 4. Ledger updates (the only edits)

| File | Change |
| ---- | ------ |
| `apps/playground/README.md` | the "Evidence on this host" paragraph cites this run (**112/112**, the exact check total, duration) and the live gate paragraph cites **101/101** with its exact total and duration, replacing the plan-`762` gate and its "registry 101 vs gate 100" caveat |
| `COMPONENTS.md` | the suite totals become **112/112** headless and **101/101** live with this run's numbers; the `states`/`input` rows keep their ids |
| `TODO.md` | tick this task with the measured totals and the exact commands; the previous promotion-gate row stops calling itself current |
| `.agents/slop/plans/README.md` | add plan `768`'s row with the measured totals, and set its status **landed** |
| this plan | §7 Results with the run, wall-clock, check counts and any branch variance |

## 5. STOP conditions

- **Any scenario fails.** This is a real regression on a head that was
  focused-green. Do **not** retry the same command unchanged; read the report,
  capture the failing check, and diagnose. A fix needs its own plan and a
  focused two-direction proof before the gate is re-run.
- **The headless total is not `4152`**, or `editing-actions` is not **46**:
  reconcile which scenario changed and by how much before editing a ledger.
  Never overwrite a total that was not read back from the artifact.
- **The live total differs from `2933` by more than the `live-tier2-editing`
  branch (±1)** — for example a whole scenario missing: the registry and the
  report disagree; stop and report the id list, not a number.
- **`--list` reports 112/101 but the run reports fewer scenarios**: a scenario
  was filtered out; stop and report the missing ids.
- **`origin/master` advanced by more than docs** since the last fetch, or a
  merge conflict touches a file outside this workstream: stop and report.
- **A suite exits `2`**: the host has no binding; this is not evidence and the
  gate cannot be claimed. Re-check `nub run --filter playground build` and the
  binding store before retrying.

## 6. Test plan (verification-only)

The full suites *are* the evidence; no new test file is added. The two
directions this gate can prove are already in place:

- **Forward:** the full headless and live runs must include `editing-actions`
  and `live-editing-actions` with the same 46/73 checks their focused runs
  measured, so a scenario that only passes alone (a state leak, a shared
  clipboard, a virtual headless clock) fails here.
- **Reverse:** the totals must equal the previous gate plus the new scenario's
  checks exactly (`4106 + 46`, `2860 + 73` ±1). A mismatch means a scenario was
  skipped, double-counted or changed silently.

Mutation proofs are not part of a gate: plan `764` already recorded five
source mutations and two reverse proofs. Do not add code to "prove" a gate.

## 7. Results

_(fill in after the run)_

## 8. Rollback

Documentation-only: revert the ledger commit. The gate proves an existing code
head; it changes no behaviour.

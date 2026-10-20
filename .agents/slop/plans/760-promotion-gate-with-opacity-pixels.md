# 760 — The promotion gate on the head that includes the opacity pixels

| Field | Value |
| ----- | ----- |
| Status | planned |
| Phase | F (release gate) |
| Owner | playground workstream |
| Depends on | `639`, `653`, `656`, `702`, `714`, `723`, `735`, `739`, `745`, `751`, `755`, `759` |
| Feeds | the promotion fast-forward of `agent/playground` into `main` |

## 1. Goal

Plan `755` gated code head `7b304a1f` with headless **110/110** (`4077`
checks) and live **99/99** (`2831` checks). Plan `759` then added
`opacity-pixels` (headless) and `live-opacity-pixels` (a real window), each
**29** checks, so the registries are now **111** headless and **100** live.
The last full gate therefore covers neither of the two new scenarios. A
promotion fast-forward now would put an ungated live scenario on `main`.

This plan is **verification only**: no source change. It re-runs both full
suites on the head that includes plan `759`, reconciles the totals against the
predicted `4077 + 29 = 4106` headless and `2830 + 29 = 2859` live, and updates
the three ledgers plus the plan index.

## 2. Preconditions

1. `git status --short` is empty and `agent/playground` is pushed.
2. `git log --oneline -6` shows plan `759`'s code commit (`05013949`), its
   renumber commit (`6cc3bc72`) and its ledger edits.
3. `git fetch origin && git rev-list --left-right --count origin/master...HEAD`
   reads `0` behind. If it does not, merge `origin/master` **in this worktree**
   and re-run `nub run check` before the gate; resolve conflicts here, never on
   `main`. Record the merge commit; a docs-only merge does not change the gate's
   meaning.
4. No second live `swarm:playground` session is writing this tree. The B3
   recurrence is recorded in `TODO.md` → Phase A; check `ps -axo pid,command |
   grep "swarm:playground"` and stop if more than this session is present.
5. Build, then confirm both new ids are registered:

```sh
nub run --filter playground build
# expected: exit 0

nub apps/playground/dist/smoke/run.js --list | grep -c .        # 111 ids
nub apps/playground/dist/smoke/run.js --list | grep opacity-pixels
# expected: opacity-pixels   (the live id is not in the headless list)

nub apps/playground/dist/live/run.js --list | grep -c .          # 100 ids
nub apps/playground/dist/live/run.js --list | grep live-opacity-pixels
# expected: live-opacity-pixels
```

If either count differs, stop: the registry and the plan disagree before the
gate has measured anything.

## 3. Commands and expected results

Run them in this order, with nothing else on the machine: the live suite is
timing-sensitive under load.

```sh
nub apps/playground/dist/smoke/run.js
# expected: 111/111 scenarios passed, 4106 checks, 65 capabilities, exit 0

nub apps/playground/dist/live/run.js --all
# expected: 100/100 scenarios passed, 2859 checks ± the live-tier2-editing branch
# (31–33 instead of 32), 61 capabilities, exit 0; ~21 minutes
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
           if s["id"] in ("opacity-pixels", "live-opacity-pixels",
                          "state-pixels", "live-state-pixels",
                          "live-tier2-editing")})
PY
```

Expected:

- headless `111 4106 65`, host
  `gpuix TestRenderer darwin-x64 @gpuix/native 0.10.0 (gpuix 9fcd6288, zed 81c99f81, runtime shaders)`;
- live `100 2859±N 61`, host `gpuix live window darwin-x64 …` with the same
  pins;
- `opacity-pixels` and `live-opacity-pixels` each report **29** checks;
- `state-pixels` and `live-state-pixels` each report **50**;
- `live-tier2-editing` reports 31, 32 or 33 (its documented branch);
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
| `apps/playground/README.md` | the live full-gate paragraph cites this run (**100/100**, the exact check total, duration, head), removes the "registry 100 vs gate 99" caveat, and records that `live-report.json` holds the full gate again |
| `COMPONENTS.md` | the suite totals become **111/111** headless and **100/100** live with this run's numbers; the `states` row keeps its ids |
| `TODO.md` | tick this task with the measured totals and the exact commands; update the promotion task's gate citation to this run |
| `.agents/slop/plans/README.md` | add plan `760`'s row with the measured totals, and set its status **landed** |
| this plan | §7 Results with the run, wall-clock, check counts and any branch variance |

## 5. STOP conditions

- **Any scenario fails.** This is a real regression on a head that was
  focused-green. Do **not** retry the same command unchanged; read the report,
  capture the failing check, and diagnose. A fix needs its own plan and a
  focused two-direction proof before the gate is re-run.
- **The headless total is not `4106`**, or `opacity-pixels` is not **29**:
  reconcile which scenario changed and by how much before editing a ledger.
  Never overwrite a total that was not read back from the artifact.
- **The live total differs from `2859` by more than the `live-tier2-editing`
  branch (±1)** — for example a whole scenario missing: the registry and the
  report disagree; stop and report the id list, not a number.
- **`--list` reports 111/100 but the run reports fewer scenarios**: a scenario
  was filtered out; stop and report the missing ids.
- **`origin/master` advanced by more than docs** since the last fetch, or a
  merge conflict touches a file outside this workstream: stop and report.
- **A suite exits `2`**: the host has no binding; this is not evidence and the
  gate cannot be claimed. Re-check `nub run --filter playground build` and the
  binding store before retrying.

## 6. Test plan (verification-only)

The full suites *are* the evidence; no new test file is added. The two
directions this gate can prove are already in place:

- **Forward:** the full headless and live runs must include `opacity-pixels`
  and `live-opacity-pixels` with the same 29 checks each that their focused
  runs measured, so a scenario that only passes alone (a state leak, a timing
  assumption) fails here.
- **Reverse:** the totals must equal the previous gate plus the new scenario's
  checks exactly (`4077 + 29`, `2830 + 29` ±1). A mismatch means a scenario was
  skipped, double-counted or changed silently.

Mutation proofs are not part of a gate: plan `759` already recorded five.
Do not add code to "prove" a gate.

## 7. Results

_To be filled by the executor._

## 8. Rollback

Documentation-only: revert the ledger commit. The gate proves an existing code
head; it changes no behaviour.

# 755 — The promotion gate on the head that includes the state pixels

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | F (release gate) |
| Owner | playground workstream |
| Depends on | `639`, `653`, `656`, `702`, `714`, `723`, `735`, `739`, `745`, `751`, `754` |
| Feeds | the promotion fast-forward of `agent/playground` into `main` |

## 1. Goal

Plan `751` gated code head `c4224479` with headless **109/109** (`4027`
checks) and live **98/98** (`2780` checks). Plan `754` then added
`state-pixels` (headless) and `live-state-pixels` (a real window), each **50**
checks, so the registries are now **110** headless and **99** live. The last
full gate therefore covers neither of the two new scenarios. A promotion
fast-forward now would put an ungated live scenario on `main`.

This plan is **verification only**: no source change. It re-runs both full
suites on the head that includes plan `754`, reconciles the totals against the
predicted `4027 + 50 = 4077` headless and `2780 + 50 = 2830` live, and updates
the three ledgers plus the plan index.

## 2. Preconditions

1. `git status --short` is empty and `agent/playground` is pushed.
2. `git log --oneline -6` shows plan `754`'s code commit (`7b304a1f`), its
   refactor/format commits and its ledger commit (`f074e835`).
3. `git fetch origin && git rev-list --left-right --count origin/master...HEAD`
   reads `0` behind. If it does not, merge `origin/master` **in this worktree**
   and re-run `nub run check` before the gate; resolve conflicts here, never on
   `main`. Record the merge commit; a docs-only merge does not change the gate's
   meaning.
4. Two live `swarm:playground` sessions are not running (`pgrep -fl
   swarm:playground`). A second writer would repeat the B3 incident recorded in
   `TODO.md` → Phase A.
5. Build, then confirm both new ids are registered:

```sh
nub run --filter playground build
# expected: exit 0

nub apps/playground/dist/smoke/run.js --list | grep -c .        # 110 ids
nub apps/playground/dist/smoke/run.js --list | grep state-pixels
# expected: state-pixels   (headless list; live-state-pixels is not in it)

nub apps/playground/dist/live/run.js --list | grep -c .          # 99 ids
nub apps/playground/dist/live/run.js --list | grep live-state-pixels
# expected: live-state-pixels
```

If either count differs, stop: the registry and the plan disagree before the
gate has measured anything.

## 3. Commands and expected results

Run them in this order, with nothing else on the machine: the live suite is
timing-sensitive under load.

```sh
nub apps/playground/dist/smoke/run.js
# expected: 110/110 scenarios passed, 4077 checks, 65 capabilities, exit 0

nub apps/playground/dist/live/run.js --all
# expected: 99/99 scenarios passed, 2830 checks ± the live-tier2-editing branch
# (31–33 instead of 32), 61 capabilities, exit 0; ~19 minutes
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
           if s["id"] in ("state-pixels", "live-state-pixels",
                          "live-shadow-pixels", "live-border-pixels",
                          "live-tier2-editing")})
PY
```

Expected:

- headless `110 4077 65`, host
  `gpuix TestRenderer darwin-x64 @gpuix/native 0.10.0 (gpuix 9fcd6288, zed 81c99f81, runtime shaders)`;
- live `99 2830±N 61`, host `gpuix live window darwin-x64 …` with the same
  pins;
- `state-pixels` and `live-state-pixels` each report **50** checks;
- `live-border-pixels` stays **64**, `live-shadow-pixels` **28**, and
  `live-tier2-editing` reports 31, 32 or 33 (its documented branch);
- a plain run wrote **no** `provenance.json` and no capture directory.

Finally the completion gate:

```sh
nub run check
nub run lint
nub run test
# expected: all green; playground 508 tests, testing 69, components 308,
# primitives 282, tokens 196, tw 103, icons 19, docs 7
```

## 4. Ledger updates (the only edits)

| File | Change |
| ---- | ------ |
| `apps/playground/README.md` | the live full-gate paragraph cites this run (**99/99**, the exact check total, duration, head) and names its focused-only predecessor as gated |
| `COMPONENTS.md` | the suite totals become **110/110** headless and **99/99** live with this run's numbers; the `state`/Design tokens rows keep their ids |
| `TODO.md` | tick this task with the measured totals and the exact commands; update the promotion task's gate citation to this run; add the new evidence row if the plan index expects one |
| `.agents/slop/plans/README.md` | add plan `755`'s row with the measured totals, and set its status **landed** |
| this plan | §6 Results with the run, wall-clock, check counts and any branch variance |

## 5. STOP conditions

- **Any scenario fails.** This is a real regression on a head that was
  focused-green. Do **not** retry the same command unchanged; read the report,
  capture the failing check, and diagnose. A fix needs its own plan and a
  focused two-direction proof before the gate is re-run.
- **The headless total is not `4077`**, or `state-pixels` is not **50**:
  reconcile which scenario changed and by how much before editing a ledger.
  Never overwrite a total that was not read back from the artifact.
- **The live total differs from `2830` by more than the `live-tier2-editing`
  branch (±1)** — for example a whole scenario missing: the registry and the
  report disagree; stop and report the id list, not a number.
- **`--list` reports 110/99 but the run reports fewer scenarios**: a scenario
  was filtered out; stop and report the missing ids.
- **`origin/master` advanced by more than docs** since the last fetch, or a
  merge conflict touches a file outside this workstream: stop and report.
- **A suite exits `2`**: the host has no binding; this is not evidence and the
  gate cannot be claimed. Re-check `nub run --filter playground build` and the
  binding store before retrying.

## 6. Test plan (verification-only)

The full suites *are* the evidence; no new test file is added. The two
directions this gate can prove are already in place:

- **Forward:** the full headless and live runs must include `state-pixels` and
  `live-state-pixels` with the same 50 checks each that their focused runs
  measured, so a scenario that only passes alone (a state leak, a timing
  assumption) fails here.
- **Reverse:** the totals must equal the previous gate plus the new scenario's
  checks exactly (`4027 + 50`, `2780 + 50` ±1). A mismatch means a scenario was
  skipped, double-counted or changed silently.

Mutation proofs are not part of a gate: plan `754` already recorded seven
runtime mutations and the unit mutations. Do not add code to "prove" a gate.

## 7. Results

Verification only; no source change. `origin/master` was 0 behind, so no merge
was needed. The gate ran on docs head `95d84679` (code head `7b304a1f`, plan
`754`).

| Suite | Scenarios | Checks | Capabilities | Duration | Exit |
| ----- | --------- | ------ | ------------ | -------- | ---- |
| headless (`TestRenderer`) | **110/110** | **4077** | 65 | 224.9 s | `0` |
| live (real window) | **99/99** | **2831** | 61 | **1245.6 s** | `0` |

`state-pixels` and `live-state-pixels` each report **50**; `live-border-pixels`
stays **64**, `live-shadow-pixels` **28**, `live-click-routing` **25**, and
`live-tier2-editing` took its **33**-check branch. The headless total is plan
`751`'s 4027 + 50 exactly; the live total is 2780 + 50 + that one branch check.
Both `host` lines carry `gpuix 9fcd6288`, `zed 81c99f81` and runtime shaders; a
plain `--all` wrote no `provenance.json` and no capture directory.

```sh
nub run --filter playground build            # exit 0
nub apps/playground/dist/smoke/run.js        # 110/110 · 4077 · 65 · 224.9 s · exit 0
nub apps/playground/dist/live/run.js --all   # 99/99 · 2831 · 61 · 1245.6 s · exit 0
nub run check                                # exit 0
nub run lint                                 # exit 0
nub run test                                 # exit 0; playground 508, testing 69, components 308,
                                             # primitives 282, tokens 196, tw 103, icons 19, docs 7
```

Artifacts: `apps/playground/.artifacts/smoke-report.json` and
`live-report.json`. This is the gate for the promotion fast-forward; the
owner/supervisor performs the merge.

## 8. Rollback

Documentation-only: revert the ledger commit. The gate proves an existing code
head; it changes no behaviour.

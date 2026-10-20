# 777 — The promotion gate on the head that includes the text ink and decoration pixels

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | F (release gate) |
| Owner | playground workstream |
| Depends on | `639`, `653`, `656`, `702`, `714`, `723`, `735`, `739`, `745`, `751`, `755`, `762`, `764`, `768`, `771`, `773`, `775` |
| Feeds | the promotion fast-forward of `agent/playground` into `main` |

## 1. Goal

Plan `768` was the last full gate: headless **112/112** (`4152` checks) and live
**101/101** (`2933` checks) on the head that includes plan `764`'s editing
actions. Three text probes have landed since, each adding one headless scenario
and one live twin and none of them inside a full gate:

| Plan | Headless id | Live id | Checks each |
| ---- | ----------- | ------- | ----------- |
| `771` | `font-family` | `live-font-family` | 13 |
| `773` | `text-ink-pixels` | `live-text-ink` | 23 |
| `775` | `text-decoration-pixels` | `live-text-decoration` | 18 |

The registries are therefore **115** headless and **104** live, and the last
gate covers neither. A promotion fast-forward now would put three ungated live
scenarios on `main`. The headless suite has since read `115/115 · 4206` on this
head (plan `775`'s run), but the live half has never run as a whole at 104.

This plan is **verification only**: no source change. It re-runs both full
suites, reconciles the totals against the predicted `4206` headless and
`2933 + 13 + 23 + 18 = 2987` live (± the documented `live-tier2-editing`
branch), and updates the ledgers plus the plan index.

## 2. Preconditions

1. `git status --short` is empty and `agent/playground` is pushed
   (`git log --oneline origin/agent/playground..HEAD` prints nothing).
2. `git log --oneline -6` shows plan `775`'s code commit (`85bd8cf1`) and the
   ledger commits around it.
3. `git fetch origin && git rev-list --left-right --count origin/master...HEAD`
   reads `0` behind. At plan time the only unknown commit was `21b32697`, a
   **docs-only** plan added to `origin/master`; it was merged in this worktree
   before the gate. Record the merge commit. A docs-only merge does not change
   the gate's meaning.
4. No second live `swarm:playground` session is writing this tree:
   `ps -axo pid,command | grep "swarm:playground" | grep -v grep` prints only
   this session. The B3 recurrence is recorded in `TODO.md` → Phase A.
5. Build, then confirm both registries and the three new ids on each side:

```sh
nub run --filter playground build
# expected: exit 0; "binding: gpuix-native.darwin-x64.node is current"

nub apps/playground/dist/smoke/run.js --list | wc -l        # 115 ids
nub apps/playground/dist/smoke/run.js --list | grep -E 'font-family|text-ink-pixels|text-decoration-pixels'
# expected: font-family, text-ink-pixels, text-decoration-pixels

nub apps/playground/dist/live/run.js --list | wc -l         # 104 ids
nub apps/playground/dist/live/run.js --list | grep -E 'live-font-family|live-text-ink|live-text-decoration'
# expected: live-font-family, live-text-ink, live-text-decoration
```

If either count differs, stop: the registry and the plan disagree before the
gate has measured anything.

## 3. Commands and expected results

Run them in this order, with nothing else heavy on the machine: the live suite
is timing-sensitive under load.

```sh
nub apps/playground/dist/smoke/run.js
# expected: 115/115 scenarios passed, 4206 checks, 65 capabilities, exit 0
# (~240-490 s is normal for this host; plan 773 measured 484.1 s under load)

nub apps/playground/dist/live/run.js --all
# expected: 104/104 scenarios passed, 2987 checks ± the live-tier2-editing
# branch (30-33 instead of 32/33), 61 capabilities, exit 0; ~21 minutes
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
           if s["id"] in ("font-family", "live-font-family",
                          "text-ink-pixels", "live-text-ink",
                          "text-decoration-pixels", "live-text-decoration",
                          "live-tier2-editing")})
PY
```

Expected:

- headless `115 4206 65`, host
  `gpuix TestRenderer darwin-x64 @gpuix/native 0.10.0 (gpuix 9fcd6288, zed 81c99f81, runtime shaders)`;
- live `104 2987±N 61`, host `gpuix live window darwin-x64 …` with the same
  pins;
- `font-family` **13**, `text-ink-pixels` **23**, `text-decoration-pixels`
  **18**; their live twins **13 / 23 / 18**;
- `live-tier2-editing` reports 30, 31, 32 or 33 (its documented branch);
- a plain run wrote **no** `provenance.json` and no capture directory.

Finally the completion gate:

```sh
nub run check
nub run lint
nub run test
# expected: all green; playground 548 tests, testing 69, components 308,
# primitives 282, tokens 196, tw 103, icons 19, docs 7
```

## 4. Ledger updates (the only edits)

| File | Change |
| ---- | ------ |
| `apps/playground/README.md` | the "Evidence on this host" paragraph cites this run (**115/115**, the exact check total, duration) and the live gate paragraph cites **104/104** with its exact total and duration, replacing the plan-`768` gate and its "registry 104 vs gate 101" caveat |
| `COMPONENTS.md` | the suite totals become **115/115** headless and **104/104** live with this run's numbers; the text rows keep their ids |
| `TODO.md` | tick this task with the measured totals and the exact commands; tick the plan-`775` row's "gate pending" note by pointing at this gate; the previous promotion-gate row stops calling itself current |
| `.agents/slop/plans/README.md` | add plan `777`'s row with the measured totals, and set its status **landed** |
| this plan | §7 Results with the run, wall-clock, check counts and any branch variance |

## 5. STOP conditions

- **Any scenario fails.** This is a real regression on a head that was
  focused-green. Do **not** retry the same command unchanged; read the report,
  capture the failing check, and diagnose. A fix needs its own plan and a
  focused two-direction proof before the gate is re-run.
- **The headless total is not `4206`**, or any of `font-family` 13 /
  `text-ink-pixels` 23 / `text-decoration-pixels` 18 is off: reconcile which
  scenario changed and by how much before editing a ledger. Never overwrite a
  total that was not read back from the artifact.
- **The live total differs from `2987` by more than the `live-tier2-editing`
  branch (±1)** — for example a whole scenario missing: the registry and the
  report disagree; stop and report the id list, not a number.
- **`--list` reports 115/104 but the run reports fewer scenarios**: a scenario
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
before a ledger claims it. The focused proofs for the three new probes remain
plans `771`, `773` and `775` (two mutation proofs each, observed and reverted).

## 7. Results

**Landed 2026-10-20.** Verification only: no source change. `origin/master`'s
one new commit (`21b32697`, plan `439`, docs only) was merged as `81b767e4`
before the gate; the tree was 0 behind and clean.

**Headless — exact match with the prediction.**

```sh
nub apps/playground/dist/smoke/run.js
# -> 115/115 scenarios passed, exit 0, 432.8 s
```

Artifact `apps/playground/.artifacts/smoke-report.json`: 115 scenarios,
**4206** checks, **65** capabilities; `font-family` **13**,
`text-ink-pixels` **23**, `text-decoration-pixels` **18**; host
`gpuix TestRenderer darwin-x64 @gpuix/native 0.10.0 (gpuix 9fcd6288, zed
81c99f81, runtime shaders)`.

**Live — exact match on checks; one capability more than predicted.**

```sh
nub apps/playground/dist/live/run.js --all
# -> 104/104 scenarios passed, exit 0, 1273.3 s
```

Artifact `apps/playground/.artifacts/live-report.json`: 104 scenarios,
**2987** checks — exactly `2933 + 13 + 23 + 18` — **62** capabilities;
`live-font-family` **13**, `live-text-ink` **23**,
`live-text-decoration` **18**, `live-tier2-editing` **33** (its documented
branch, so the ±1 predicted variance did not appear); host
`gpuix live window darwin-x64 @gpuix/native 0.10.0 (gpuix 9fcd6288, zed
81c99f81, runtime shaders)`. A plain `--all` wrote no `provenance.json` and no
capture directory.

**The 61 → 62 capability reconciliation.** Plan `653` aliased `text` to
`live-typography` because no live scenario mounted the `text` capability. Plans
`773`/`775` added `live-text-ink` and `live-text-decoration`, which mount
`text` directly, so the live capability union now contains it. This is new
evidence, not a drift: every `text` capability now has a live scenario that
actually mounts it, and the alias remains harmless for the guard.

**Completion gate.**

```sh
nub run check   # exit 0
nub run lint    # exit 0
nub run test    # exit 0; playground 548 tests, testing 69
```

This is the gate for the promotion merge; the owner/supervisor performs it.

# 659 — The promotion gate on the head that includes the last Tier 1 window evidence

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | F (release verification) |
| Owner | playground |
| Depends on | `517` (focused live runs), `529` (the release-tag binding), `639` (the live-registry guard), `653` (capability coverage), `656` (the capture-capable live runner), `657` (the previous full gate), `658` (the added Tier 1 live checks) |
| Feeds | the promotion record in `TODO.md`; `COMPONENTS.md` and `apps/playground/README.md` ledger totals |

## 1. Goal and the gap being closed

The last full merge/release gate (plan `657`) ran on `034d78df`:

- headless **105/105**, **3765** checks, 65 capabilities, exit `0`;
- live **94/94**, **2447** checks, 61 capabilities, exit `0`.

Plan `658` then grew `live-primitives-display` from **12 → 34** checks
(+22) without changing the registry, and the full headless suite on the current
head is **105/105, 3802 checks, 65 capabilities, exit 0**. The live total has
not been re-measured since, so the promotion record in `TODO.md` explicitly says
"the next merge gate must cover the current head; the recorded 94/94 live total
predates them and is not re-claimed".

This plan is **verification only**. It re-runs both full registries on the
current head, records the exact scenario/check/capability totals and wall-clock
times in the four ledgers, and leaves the branch ready for the owner/supervisor's
fast-forward. It changes **no scenario, view, host verb or component**.

**Non-goals:** fixing a red scenario (if the gate is red, STOP and report with
the failing id and message), adding a scenario, changing the live registry,
tagging or merging into `master`.

## 2. Measured context the executor needs

Recon on 2026-10-19 (read-only, no plan work started before this file existed):

```text
$ git rev-parse --short HEAD
d9346a9d                      # feat(playground): prove the last Tier 1 controls in a real window (658)

$ git log --oneline origin/master -1
b8fbf153                      # master is an ancestor; the branch is a fast-forward candidate

$ git rev-list --count origin/master..HEAD
340

$ nub apps/playground/dist/smoke/run.js --list | wc -l
105

$ nub apps/playground/dist/live/run.js --list | wc -l
94
```

The registry is the source of truth for the expected scenario counts:
**105 headless ids and 94 live ids**. Derive them with `--list`; never assert a
count remembered from a previous plan when the registry can be read.

Expected check totals (a prediction, not a claim):

- headless: **3802** — plan `658` measured it on this head;
- live: **2469** — the plan-`657` 2447 plus the 22 added to
  `live-primitives-display`. A total of 2447 means the new checks did not run;
  STOP and explain rather than recording the old total as new.

The two ledgers currently carry the stale live total:

- `COMPONENTS.md` around lines 99–117: "The suite is 105/105 … The live suite
  last ran in full at 94/94 … Plan `658` then added 22 checks … so the next
  promotion gate re-measures the live total".
- `COMPONENTS.md` around lines 165–172: "The last full run was 94/94 green
  (2447 checks, 61 capabilities, 921.6 s) … (plan `657`'s gate)".
- `apps/playground/README.md` around lines 2048–2064: the 94/94 gate paragraph
  and the plan-`658` addendum.
- `apps/playground/README.md` around lines 2256–2258: the real-window suite
  bullet.
- `TODO.md` around lines 1579–1582: the promotion addendum that says the next
  gate must cover the current head.

## 3. Files to change

No source file. Only documentation:

### 3.1 `.agents/slop/plans/659-promotion-gate-with-tier1-evidence.md` (this file)

Replace `Status | planned` with `Status | landed` and fill §6 with:

- the commit the gate ran on (`git rev-parse --short HEAD`);
- both exact totals, exit codes, capability counts and wall-clock durations;
- the exact commands;
- confirmation that the headless and live artifacts are the ones written by
  this run (their mtimes/timestamps);
- a one-line statement that no source changed.

### 3.2 `.agents/slop/plans/README.md`

Append a row to the playground table, after plan `657`:

```
| [659](./659-promotion-gate-with-tier1-evidence.md) | The promotion gate on the head that includes the last Tier 1 window evidence | F | `639`, `649`, `653`, `654`, `655`, `656`, `657`, `658` | **landed** — verification only: headless **105/105** (`3802` checks) and live **94/94** (`2469` checks), both exit `0`; … |
```

Use the measured numbers, not the predictions above.

### 3.3 `COMPONENTS.md`

1. The paragraph at lines 99–117: replace the "last ran in full at 94/94 … the
   next promotion gate re-measures" sentence with the new full-run sentence
   (both totals, capability counts, duration, the gate's plan number), and keep
   the list of the specific live scenarios it covered. The closing
   "**Registered live scenarios are 94**" stays correct; verify it with
   `--list`.
2. The paragraph at lines 165–172: replace 94/94 / 2447 / 921.6 s / plan `657`
   with the measured totals and this plan's number, and keep the
   "`--all` wrote no frame or `provenance.json`" clause only if this run also
   proves it (it does not use `--capture`; assert no new sidecar was written).

### 3.4 `apps/playground/README.md`

1. The evidence section at lines 2048–2064: replace the plan-`657` gate
   paragraph with this gate's exact totals, and replace the plan-`658`
   addendum with a sentence saying the added 22 checks are included in this
   total. Remove the stale "no new total is claimed here".
2. The real-window bullet at lines 2256–2258: update the totals and the date.
3. Leave the headless block at lines 2027–2046 unchanged **unless** the run's
   check total differs; if it does, record the measured number and explain the
   difference.

### 3.5 `TODO.md`

1. Add one task under the playground section, above the promotion item:

   ```
   `[x]` **Run the promotion gate on the head that includes plan `658`'s Tier 1
         window evidence** per plan `659`: verification only — headless
         **105/105** (`3802` checks, 65 capabilities) and live **94/94**
         (`2469` checks, 61 capabilities), both exit `0`; `nub run check`,
         `nub run lint` and `nub run test` green.
   ```

   Use the measured check totals.
2. In the promotion item at lines 1579–1582, replace the plan-`658` addendum's
   "the recorded 94/94 live total predates them and is not re-claimed" with a
   pointer to this gate, so the branch's final gate is unambiguous.

### 3.6 `PLAN.md`

No new D row: the gate measures no new runtime fact and changes no decision.
Do **not** add one merely to mark a verification run.

## 4. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/playground`. Every command that
was not run did not pass.

1. Preflight — the tree must be clean before the run and the binding present:

   ```sh
   git status --porcelain          # expected: empty
   git rev-parse --short HEAD      # expected: d9346a9d or a descendant
   git merge-base --is-ancestor origin/master HEAD; echo $?   # expected: 0
   ```

2. Rebuild the runner and confirm the registry sizes:

   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js --list | wc -l   # expected: 105
   nub apps/playground/dist/live/run.js --list | wc -l    # expected: 94
   ```

3. **Headless full suite** (the end-of-task check for a cross-cutting run):

   ```sh
   nub apps/playground/dist/smoke/run.js
   ```

   Expected: `105/105 scenarios passed`, **3802 checks**, 65 capabilities,
   exit `0`, `.artifacts/smoke-report.json` rewritten. Takes ~2–3 minutes.
   Do not pass `--only` here.

4. **Live full suite** (this plan is the merge/release gate, so `--all` is
   authorised; never run it merely while iterating):

   ```sh
   nub apps/playground/dist/live/run.js --all
   ```

   Expected: `94/94 scenarios passed`, **2469 checks**, 61 capabilities,
   exit `0`, `.artifacts/live-report.json` rewritten, one screenshot per
   scenario under `.artifacts/live/` (the runner's normal output), and **no**
   `provenance.json` (no `--capture`). Takes ~15–17 minutes (plan `657`:
   921.6 s). Run it in the background with the output captured to a file so a
   harness timeout cannot truncate it; wait for completion rather than polling.

5. Read the totals from the artifacts, not from memory:

   ```sh
   node -e 'const r=require("./apps/playground/.artifacts/smoke-report.json"); console.log(r.passed, r.total, r.checks, r.capabilities && r.capabilities.length)'
   node -e 'const r=require("./apps/playground/.artifacts/live-report.json"); console.log(r.passed, r.total, r.checks, r.capabilities && r.capabilities.length)'
   ```

   (Field names are those the report schema uses; if a field is absent, read
   the report's own shape and record the equivalent — never invent a number.)
   Also confirm the live report's host line carries the release-tag pins, as
   plan `657` did.

6. Gates:

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   Expected: all exit `0`; test counts unchanged from plan `658` (playground
   **439**, testing 61, components 308, primitives 282, tokens 196, tw 103,
   icons 19, docs 7 — verify in the output, do not assume).

7. Write the ledgers (§3), then re-run the focused controls touched by nothing
   (the ledgers are prose, so no scenario re-run is required). Commit and push:

   ```sh
   git add .agents/slop/plans/659-promotion-gate-with-tier1-evidence.md \
           .agents/slop/plans/README.md COMPONENTS.md TODO.md \
           apps/playground/README.md
   git commit -m "docs(playground): record the plan-659 promotion gate"
   git push origin agent/playground
   ```

## 5. STOP conditions

- `git status --porcelain` is non-empty before the run: STOP. Commit or stash
  the existing work first; never sweep another agent's edits into the gate
  commit.
- The head is not a descendant of `origin/master`: STOP. Re-merge master and
  re-plan; the promotion must be a fast-forward.
- Either `--list` count is not 105/94: STOP. The registry changed; report the
  new ids and reconcile `COMPONENTS.md` before running.
- The live run exits `2` (no window/binding): STOP. That is an environment
  failure, not a red suite; record it and do not claim a live total.
- Any scenario fails: STOP. Record the id and the exact failing check message;
  do not edit the scenario in this plan. A fix needs its own plan and test.
- The live check total is 2447 or another value below 2469: STOP and explain.
  It means plan `658`'s checks were not in the run (or were skipped), and the
  new total must not be recorded as if they were.
- Any gate (`check`/`lint`/`test`) fails: STOP. This plan changes prose only,
  so a failure is pre-existing or environmental; report it, do not "fix" it
  here.
- Never push to `master`; never force-push.

## 6. Test plan — what this run can catch

This is a release gate, not a new behaviour test. Its value is **coverage on one
head**, which focused runs cannot provide:

| It catches | How |
| ---------- | --- |
| a scenario that only fails when the whole registry runs in sequence | the full run exercises the shared mount/runner path (`shell-selection`'s plan-182 lesson) |
| an ordering or state leak between live scenarios | all 94 live ids run in registry order in one window process |
| stale ledger totals | the artifacts are read directly and the numbers written from them |
| a live scenario silently dropped from the registry | the expected 94 ids and the ≥2469 check total; `liveScenarioProblems` already guards uniqueness and capability coverage |
| a headless/live divergence introduced by plan `658` | both suites run on the same head; `primitives-display` and `live-primitives-display` are both included |

No mutation proof is appropriate: the plan changes no code, so there is nothing
to mutate. The two-direction evidence is the **previous** gate (94/94, 2447) plus
this run's higher live total, which proves the new checks executed; a plan-`658`
focused run (34/34) already demonstrated the checks can fail when their
component behaviour is mutated (M1/M2 in plan `658` §8).

## 7. Acceptance

- Headless `105/105`, exit `0`, with the check/capability totals recorded.
- Live `94/94` with **`--all`**, exit `0`, check total ≥ `2469`, with the
  capability count and duration recorded.
- `nub run check`, `nub run lint`, `nub run test` green.
- `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md` and the plan index
  cite this run's numbers; no stale 2447/921.6 s live gate remains as the
  current gate.
- The plan is marked `landed` with the exact head and commands.
- The commit is pushed to `origin/agent/playground`; `master` is untouched.

## 8. Results (2026-10-19, darwin-x64, release-tag binding)

The gate ran at `69392032` — the plan commit on top of the code head
`d9346a9d` (plan `658`). The only difference is this plan file and its index
row, so the measured totals describe the same code the promotion merge sees.

**Headless** — `nub apps/playground/dist/smoke/run.js` is **105/105**, exit
`0`, **3802 checks**, 65 capabilities, **128.6 s** (`durationMs` 128637).
`--list` printed 105 ids. Host:
`gpuix TestRenderer darwin-x64 @gpuix/native 0.10.0 (gpuix 9fcd6288, zed 81c99f81, runtime shaders)`.
`.artifacts/smoke-report.json` was rewritten by this run.

**Live** — `nub apps/playground/dist/live/run.js --all` is **94/94**, exit
`0`, **2469 checks**, 61 capabilities, **1040.8 s** (`durationMs` 1040752).
`--list` printed 94 ids. Host:
`gpuix live window darwin-x64 @gpuix/native 0.10.0 (gpuix 9fcd6288, zed 81c99f81, runtime shaders)`.
The check total is exactly the plan-`657` 2447 plus the 22 plan `658` added to
`live-primitives-display`, which proves the new checks executed in the full
registry. `.artifacts/live-report.json` was rewritten; a plain `--all` wrote
**no** `provenance.json` (no `--capture`).

**Gates** — `nub run check`, `nub run lint` and `nub run test` all exit `0`.
Test counts: playground **439**, components **308**, primitives **282**,
tokens **196**, tw **103**, testing **61**, icons **19**, docs **7** — unchanged
from plan `658` (this plan changes prose only).

**No source change.** No scenario, view, host verb, component, registry entry
or test was edited; the run is the release evidence for the promotion merge.
The owner/supervisor still performs the fast-forward; this workstream never
pushes to `master`.

# 675 — The promotion gate on the head that includes pixel evidence

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | F (release verification) |
| Owner | playground |
| Depends on | `517` (focused live runs), `529` (the release-tag binding), `639` (the live-registry guard), `653` (capability coverage), `656` (the capture-capable live runner), `659` (the previous full gate), `674` (the pixel evidence and `live-pixel-colour`) |
| Feeds | the promotion record in `TODO.md`; `COMPONENTS.md` and `apps/playground/README.md` ledger totals |

## 1. Goal and the gap being closed

The last full merge/release gate (plan `659`) ran on `69392032`:

- headless **105/105**, **3802** checks, 65 capabilities, exit `0`;
- live **94/94**, **2469** checks, 61 capabilities, exit `0`.

Plan `674` then added **one live scenario** — `live-pixel-colour`, 22 checks —
so the live registry is now **95**, and the full live suite has not run with it.
`COMPONENTS.md` (lines 99–118) says so explicitly: "Registered live scenarios
are 95; the full gate above predates `live-pixel-colour`, which was run focused
(plan `674`), so the next full gate covers it."

`origin/master` also advanced by one docs-only commit (`2b4eb0d9`,
`apps/docs/src/start.ts`) after this branch's merge base, so the branch is
currently **1 behind** as well as 344 ahead. A promotion must be a fast-forward;
the owner/supervisor cannot merge a branch that is behind. This plan therefore
does the two things needed to leave the branch promotable:

1. merge `origin/master` into `agent/playground` (our branch only — never
   `master`), resolve nothing if the docs-only commit applies cleanly;
2. re-run **both full registries** on the merged head and record the exact
   totals in the four ledgers.

This plan is **verification only**. It changes no scenario, view, host verb or
component. The only non-documentation change is the merge commit itself.

**Non-goals:** fixing a red scenario (if the gate is red, STOP and report with
the failing id and message), adding a scenario, changing the live registry,
tagging or pushing to `master`.

## 2. Measured context the executor needs

Recon on 2026-10-19 (read-only, no implementation started before this file
existed):

```text
$ git rev-parse --short HEAD
e34c7a71                      # feat(playground): read pixel evidence from a native frame (674)

$ git merge-base HEAD origin/master
b8fbf153                      # fix(docs): slide the Tabs indicator … (the shared base)

$ git rev-list --count origin/master..HEAD
344
$ git rev-list --count HEAD..origin/master
1                             # 2b4eb0d9 fix(docs): revalidate the document and immutably cache hashed assets

$ nub run --filter playground build
# build: binding: gpuix-native.darwin-x64.node is current … Done

$ nub apps/playground/dist/smoke/run.js --list | wc -l
106
$ nub apps/playground/dist/live/run.js --list | wc -l
95
```

The registry is the source of truth for the expected scenario counts:
**106 headless ids and 95 live ids**. Derive them with `--list` after the merge;
never assert a count remembered from a previous plan when the registry can be
read.

Expected check totals (a prediction, not a claim):

- headless: **3824** — plan `674` measured it on `e34c7a71`; the docs-only
  merge adds no scenario, so it must stay 3824;
- live: **2491** — plan `659`'s 2469 plus `live-pixel-colour`'s 22. A total of
  2469 means the new scenario did not run; **STOP** and explain rather than
  recording the old total as new.

The artifacts' shape is `SmokeReport` (`packages/testing/src/smoke.ts`):
`{ host, startedAt, durationMs, scenarios[], capabilities[] }`, where each
scenario carries `checks[]` and `durationMs`. There is no `passed`/`total`
field, so read the totals as
`scenarios.length`, the sum of `scenarios[].checks.length`, and
`capabilities.length`.

The ledgers that carry stale live totals:

- `COMPONENTS.md` lines 99–118: the "last ran in full at 94/94 … Registered
  live scenarios are 95 … the next full gate covers it" paragraph.
- `COMPONENTS.md` lines ~160–175: the live-gate paragraph that still cites
  plan `657`/`655` totals inside the longer evidence narrative (check what is
  actually stale before editing; only the current-gate sentence must change).
- `apps/playground/README.md` lines ~2048–2080: the headless evidence block and
  the live paragraph; `line 1568` already says the live registry lists 95.
- `apps/playground/README.md` lines ~2280–2302: the real-window suite bullet.
- `TODO.md` lines ~78–89: the plan-`659` gate task; add the new task above it.

## 3. Files to change

### 3.1 Merge (the only non-docs change)

Bring `origin/master` into this branch **before** the gate:

```sh
git fetch origin
git merge origin/master
```

`2b4eb0d9` touches only `apps/docs/src/start.ts`, which this workstream does not
own and does not import. Expect a clean merge commit. If the merge conflicts in
a path this workstream does not own, **STOP** (§5) — do not resolve another
workstream's file.

### 3.2 `.agents/slop/plans/675-promotion-gate-with-pixel-evidence.md` (this file)

Replace `Status | planned` with `Status | landed` and fill §7 with:

- the merged commit the gate ran on (`git rev-parse --short HEAD`);
- both exact totals, exit codes, capability counts and wall-clock durations;
- the exact commands;
- confirmation that the headless and live artifacts are the ones written by
  this run (their mtimes/timestamps);
- a one-line statement that no source changed beyond the docs-only merge.

### 3.3 `.agents/slop/plans/README.md`

Append a row to the playground table after plan `674`:

```
| [675](./675-promotion-gate-with-pixel-evidence.md) | The promotion gate on the head that includes pixel evidence | F | `639`, `649`, `653`, `654`, `655`, `656`, `657`, `659`, `674` | **landed** — verification only: headless **106/106** (`3824` checks) and live **95/95** (`2491` checks), both exit `0`; … |
```

Use the measured numbers, not the predictions above.

### 3.4 `COMPONENTS.md`

1. Lines 99–118: replace the "last ran in full at 94/94 … the next full gate
   covers it" sentences with this run's totals, capability counts, duration and
   plan number; the registered-live-scenarios sentence becomes "Registered live
   scenarios are **95**" and no longer promises a future gate.
2. Any remaining "94/94"/"2469"/"plan `659`" sentence that described the current
   gate becomes this run's numbers. Keep historical comparisons (e.g. "plan
   `657`'s 2447 plus …") only where they explain how a total was derived, and
   make the **current** gate unambiguous.

### 3.5 `apps/playground/README.md`

1. The evidence block at ~2060: update the headless totals only if they changed
   (expected: unchanged at 106/106, 3824, 65, ~150 s) and record the gate's
   date/plan.
2. The live paragraph: replace the 94/94 gate with **95/95**, the measured
   check total, capability count and duration, and name `live-pixel-colour` as
   included rather than focused-only.
3. The real-window bullet at ~2280: update the totals and the date.
4. The line at ~1568 already says the live registry lists 95 — leave it.

### 3.6 `TODO.md`

1. Add one task under the playground section above the plan-`659` gate task:

   ```
   `[x]` **Run the promotion gate on the head that includes plan `674`'s pixel
         evidence** per plan `675`: merged `origin/master` (one docs-only
         commit), then verification only — headless **106/106** (`3824` checks,
         65 capabilities) and live **95/95** (`2491` checks, 61 capabilities),
         both exit `0`; `nub run check`, `nub run lint` and `nub run test` green.
   ```

   Use the measured check totals.
2. Leave the plan-`659` row as history.

### 3.7 `PLAN.md`

No new D row: the gate measures no new runtime fact and changes no decision. Do
**not** add one merely to mark a verification run. The merge brings no decision
either.

## 4. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/playground`. Every command that
was not run did not pass.

1. Preflight — clean tree and the binding present:

   ```sh
   git status --porcelain          # expected: empty
   git rev-parse --short HEAD      # expected: e34c7a71 or a descendant
   ```

   Commit this plan first if it is the only change; never sweep uncommitted
   work into the gate.

2. Merge master:

   ```sh
   git fetch origin
   git merge origin/master
   git merge-base --is-ancestor origin/master HEAD; echo $?   # expected: 0
   ```

   Expected: one merge commit (or a fast-forward is impossible because the
   branch is ahead), no conflict. A conflict in a non-owned path is a STOP.

3. Rebuild the runner and confirm the registry sizes:

   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js --list | wc -l   # expected: 106
   nub apps/playground/dist/live/run.js --list | wc -l    # expected: 95
   nub apps/playground/dist/live/run.js --list | grep -c '^live-pixel-colour$'  # expected: 1
   ```

4. **Headless full suite** (the end-of-task check for a cross-cutting run):

   ```sh
   nub apps/playground/dist/smoke/run.js
   ```

   Expected: `106/106 scenarios passed`, **3824 checks**, 65 capabilities,
   exit `0`, `.artifacts/smoke-report.json` rewritten. Takes ~2–3 minutes.
   Do not pass `--only` here.

5. **Live full suite** (this plan is the merge/release gate, so `--all` is
   authorised; never run it merely while iterating):

   ```sh
   nub apps/playground/dist/live/run.js --all
   ```

   Expected: `95/95 scenarios passed`, **2491 checks**, 61 capabilities,
   exit `0`, `.artifacts/live-report.json` rewritten, one screenshot per
   scenario under `.artifacts/live/`, and **no** `provenance.json` (no
   `--capture`). Takes ~17–19 minutes (plan `659`: 1021.6 s). Run it in the
   background with the output captured to a file so a harness timeout cannot
   truncate it; wait for completion rather than polling.

6. Read the totals from the artifacts, not from memory:

   ```sh
   node -e 'const r=require("./apps/playground/.artifacts/smoke-report.json"); console.log(r.scenarios.length, r.scenarios.reduce((n,s)=>n+s.checks.length,0), r.capabilities.length, r.durationMs, r.host)'
   node -e 'const r=require("./apps/playground/.artifacts/live-report.json"); console.log(r.scenarios.length, r.scenarios.reduce((n,s)=>n+s.checks.length,0), r.capabilities.length, r.durationMs, r.host)'
   ```

   Also confirm the live report's host line carries the release-tag pins
   (`gpuix 9fcd6288`, `zed 81c99f81`, `runtime shaders`), as plan `659` did,
   and check that no `provenance.json` exists in the capture directory (the
   default artifact directory must not gain one).

7. Gates:

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   Expected: all exit `0`; test counts unchanged from plan `674` (playground
   **439**, testing **68**, components 308, primitives 282, tokens 196, tw 103,
   icons 19, docs 7 — verify in the output, do not assume).

8. Write the ledgers (§3), then commit and push:

   ```sh
   git add .agents/slop/plans/675-promotion-gate-with-pixel-evidence.md \
           .agents/slop/plans/README.md COMPONENTS.md TODO.md \
           apps/playground/README.md
   git commit -m "docs(playground): record the plan-675 promotion gate"
   git push origin agent/playground
   ```

## 5. STOP conditions

- `git status --porcelain` is non-empty before the run: STOP. Commit or stash
  the existing work first; never sweep another agent's edits into the gate
  commit.
- The merge conflicts in a path this workstream does not own: STOP. Record the
  conflicted path in `TODO.md` as a cross-team task; do not resolve it here.
- After the merge the head is not a descendant of `origin/master`: STOP.
- Either `--list` count is not 106/95, or `live-pixel-colour` is absent: STOP.
  The registry changed; report the new ids and reconcile `COMPONENTS.md` before
  running.
- The live run exits `2` (no window/binding): STOP. That is an environment
  failure, not a red suite; record it and do not claim a live total.
- Any scenario fails: STOP. Record the id and the exact failing check message;
  do not edit the scenario in this plan. A fix needs its own plan and test.
- The live check total is 2469 or another value below 2491: STOP and explain.
  It means `live-pixel-colour`'s checks were not in the run (or were skipped),
  and the new total must not be recorded as if they were.
- The headless total is not 3824: STOP and explain before recording it.
- Any gate (`check`/`lint`/`test`) fails: STOP. This plan changes prose plus one
  upstream docs file, so a failure is pre-existing or environmental; report it,
  do not "fix" it here.
- Never push to `master`; never force-push.

## 6. Test plan — what this run can catch

This is a release gate, not a new behaviour test. Its value is **coverage on one
merged head**, which focused runs cannot provide:

| It catches | How |
| ---------- | --- |
| a scenario that only fails when the whole registry runs in sequence | the full run exercises the shared mount/runner path (`shell-selection`'s plan-182 lesson) |
| an ordering or state leak between live scenarios | all 95 live ids run in registry order in one window process |
| a live-only regression introduced by the pixel scenario | `live-pixel-colour` is included for the first time in a full run |
| a merge that breaks the playground build | the merge commit is built and both suites run on it |
| stale ledger totals | the artifacts are read directly and the numbers written from them |
| a live scenario silently dropped from the registry | the expected 95 ids and the ≥2491 check total; `liveScenarioProblems` already guards uniqueness and capability coverage |
| a headless/live divergence in the theme capability | `pixel-colour` and `live-pixel-colour` both run on the same head |

No mutation proof is appropriate: the plan changes no scenario code, so there is
nothing to mutate. The two-direction evidence is the **previous** gate (94/94,
2469) plus this run's higher live total, which proves the new scenario's checks
executed; plan `674` §8 already demonstrated that the checks fail when the
capture or the scale is broken.

## 7. Acceptance

- The merge commit exists and `origin/master` is an ancestor of `HEAD`.
- Headless `106/106`, exit `0`, 3824 checks, 65 capabilities, with the duration
  recorded.
- Live `95/95` with **`--all`**, exit `0`, **2491** checks, 61 capabilities,
  with the duration recorded, and no `provenance.json`.
- `nub run check`, `nub run lint`, `nub run test` green.
- `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md` and the plan index
  cite this run's numbers; no stale 94/94 or 2469 remains as the current gate.
- The plan is marked `landed` with the exact head and commands.
- The commit is pushed to `origin/agent/playground`; `master` is untouched.

## 8. Results (2026-10-19, darwin-x64, release-tag binding)

The gate ran at `d206df18` — the merge commit that brought `origin/master`'s
one docs-only commit (`2b4eb0d9`, `apps/docs/src/start.ts`) onto the branch,
which was then 345 commits ahead of and 0 behind `origin/master`. The only
content difference from the plan-674 code head is that docs file, so the
measured totals describe the same app and package code the promotion merge
sees.

**Headless** — `nub apps/playground/dist/smoke/run.js` is **106/106**, exit
`0`, **3824 checks**, 65 capabilities, **152.8 s** (`durationMs` 152833).
`--list` printed 106 ids. Host:
`gpuix TestRenderer darwin-x64 @gpuix/native 0.10.0 (gpuix 9fcd6288, zed 81c99f81, runtime shaders)`.
`.artifacts/smoke-report.json` was rewritten by this run.

**Live** — `nub apps/playground/dist/live/run.js --all` is **95/95**, exit
`0`, **2491 checks**, 61 capabilities, **1058.8 s** (`durationMs` 1058798).
`--list` printed 95 ids and `live-pixel-colour` was among them. Host:
`gpuix live window darwin-x64 @gpuix/native 0.10.0 (gpuix 9fcd6288, zed 81c99f81, runtime shaders)`.
The check total is exactly the plan-`659` 2469 plus the 22 that
`live-pixel-colour` reports, which proves the new scenario executed in the full
registry. `.artifacts/live-report.json` was rewritten; a plain `--all` wrote
**no** `provenance.json` (no `--capture`).

**Two independent full runs on this head.** The gate was run twice, once by
each of two concurrent `swarm:playground` sessions (the recurring B3
duplicate-writer issue). Both agreed on every scenario/check/capability count —
headless `106/106` / `3824` / `65` and live `95/95` / `2491` / `61`, both exit
`0`; only wall-clock differed (134.5 s and 1018.7 s in the first, 152.8 s and
1058.8 s in the second, run concurrently in two windows). The artifacts on disk
are the **second** run, so their mtimes and durations are the numbers above:
`smoke-report.json` at 16:48:56 and `live-report.json` at 17:06:52 on
2026-10-19.

**Gates** — `nub run check`, `nub run lint` and `nub run test` all exit `0`.
Test counts: playground **439**, testing **68**, components **308**,
primitives **282**, tokens **196**, tw **103**, icons **19**, docs **7** —
unchanged from plan `674` (this plan changes prose plus the upstream docs-only
merge).

**No source change.** No scenario, view, host verb, component, registry entry
or test was edited; the run is the release evidence for the promotion merge.
The owner/supervisor still performs the fast-forward; this workstream never
pushes to `master`.

# 677 — The promotion gate on the head that includes the palette's frame pixels

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | F (release verification) |
| Owner | playground |
| Depends on | `517` (focused live runs), `529` (the release-tag binding), `639` (the live-registry guard), `653` (capability coverage), `656` (the capture-capable live runner), `675` (the previous full gate), `676` (the palette-switch frame evidence) |
| Feeds | the promotion record in `TODO.md`; `COMPONENTS.md` and `apps/playground/README.md` ledger totals |

## 1. Goal and the gap being closed

The last full merge/release gate (plan `675`) ran on `d206df18`:

- headless **106/106**, **3824** checks, 65 capabilities, exit `0`;
- live **95/95**, **2491** checks, 61 capabilities, exit `0`.

Plan `676` then grew the **existing** live scenario `live-theme` from **9 to
39 checks** by sampling each palette stop's captured frame, and added three
pure `palette-pixels` tests. The live registry is unchanged at **95**, so the
suite has not yet run with those 30 extra checks inside the full sequence.
`COMPONENTS.md` (lines 118–122) and `apps/playground/README.md` (§ live
evidence) say so explicitly: "the next full gate total is this 2491 plus that
delta".

This plan closes that gap. It is **verification only**:

1. rebuild the runner and confirm the registry sizes;
2. run the **full headless registry** and the **full live registry** on the
   current head;
3. read the totals from the report artifacts, not from memory;
4. update the four ledgers to cite this run;
5. commit and push `agent/playground`.

No scenario, view, host verb, component, registry entry or test changes. If
the gate is red, this plan STOPs and reports the failing id; a fix needs its
own plan and a failing-before/passing-after test.

**Non-goals:** adding or changing a scenario, changing the live registry,
fixing a component defect (record it as a cross-team task instead), tagging,
merging into `master`, or pushing `master`.

## 2. Measured context the executor needs

Recon on 2026-10-19 (read-only, before this file existed):

```text
$ git rev-parse --short HEAD
86057653                      # feat(playground): verify the palette switch in the frame (676)

$ git status --porcelain
                              # empty

$ git rev-list --count HEAD..origin/master
0                             # nothing to merge; origin/master is 2b4eb0d9
$ git rev-list --count origin/master..HEAD
351

$ nub apps/playground/dist/smoke/run.js --list | wc -l
106
$ nub apps/playground/dist/live/run.js --list | wc -l
95
```

The registry is the source of truth for the expected scenario counts: **106
headless ids and 95 live ids**. Re-derive them with `--list` after the rebuild;
never assert a count remembered from a previous plan when the registry can be
read.

Expected check totals (predictions, not claims):

- headless: **3824** — plan `675` measured it, and plan `676` changed only the
  live `theme` view, the shared frame sampler and pure tests; no headless
  scenario check was added or removed. A different total means an unrelated
  change landed — STOP and explain.
- live: **2521** — plan `675`'s 2491, minus `live-theme`'s old 9, plus its new
  39 (`2491 − 9 + 39`). A total of **2491** means the new frame checks did not
  run; **STOP** rather than recording the old total as new.
- capabilities: headless **65**, live **61** (unchanged).

The artifacts' shape is `SmokeReport` (`packages/testing/src/smoke.ts`):
`{ host, startedAt, durationMs, scenarios[], capabilities[] }`, and each
scenario carries `checks[]` and `durationMs`. There is no `passed`/`total`
field, so read the totals as `scenarios.length`, the sum of
`scenarios[].checks.length`, and `capabilities.length`.

The ledgers that carry stale live totals:

- `COMPONENTS.md` lines **99–122**: the suite paragraph, the plan-675 gate
  sentence, and the trailing sentence promising "the next full gate total is
  this 2491 plus that delta".
- `COMPONENTS.md` line **184**: the live-gate paragraph that cites the plan-675
  totals.
- `apps/playground/README.md` lines **~2088–2100**: the live evidence block
  ("The last full merge/release gate ran 95/95 …").
- `apps/playground/README.md` lines **~2292–2297**: the real-window suite
  bullet.
- `apps/playground/README.md` line **1572** already says the live registry
  lists 95 — leave it (the count is unchanged).
- `TODO.md` lines **~78–95**: add the new gate task above the plan-675 task.

## 3. Files to change

### 3.1 `.agents/slop/plans/677-promotion-gate-with-palette-pixels.md` (this file)

Replace `Status | planned` with `Status | landed` and fill §8 with:

- the head the gate ran on (`git rev-parse --short HEAD`);
- both exact totals, exit codes, capability counts and wall-clock durations;
- the exact commands;
- confirmation that the report artifacts on disk are the ones this run wrote
  (mtimes/timestamps);
- a one-line statement that no source changed.

### 3.2 `.agents/slop/plans/README.md`

Append a row to the playground table after plan `676`:

```
| [677](./677-promotion-gate-with-palette-pixels.md) | The promotion gate on the head that includes the palette's frame pixels | F | `639`, `653`, `656`, `675`, `676` | **landed** — verification only: headless **106/106** (`3824` checks, 65 capabilities) and live **95/95** (`2521` checks, 61 capabilities), both exit `0`; … |
```

Use the measured numbers, not the predictions above.

### 3.3 `COMPONENTS.md`

1. Lines 99–122: keep the headless sentence at **106/106 / 3824 / 65**; replace
   the "last ran in full at 95/95 (2491 …)" gate with this run's **95/95**,
   measured check total, capability count and duration, and name plan `677`.
   Keep the historical derivation ("plan `659`'s 2469 plus `live-pixel-colour`'s
   22 plus `live-theme`'s +30") because it explains the total. Delete the
   trailing "the next full gate total is …" promise — it is now measured.
2. Line 184: replace the plan-675 live-gate sentence with this run's numbers.
3. Do not change any capability or component row; the gate measured none.

### 3.4 `apps/playground/README.md`

1. The live evidence block (~2088–2100): replace **95/95 / 2491 / 1057.2 s /
   plan 675** with this run's totals and the date; keep the "supersedes plan
   659/657/655/648" history sentence but prepend this gate.
2. The real-window bullet (~2292–2297): update the totals and the plan number.
3. Leave line 1572's "live registry lists 95 scenarios" alone.

### 3.5 `TODO.md`

1. Add one ticked task under the playground section above the plan-675 gate
   task, naming the exact scenario ids run (the whole headless registry and
   the whole live registry, `--all`), both totals, the gate results and the
   fact that no source changed.
2. Leave the plan-675 row as history.

### 3.6 `PLAN.md`

No new decision row: the gate measures no new runtime fact and changes no
architecture. Do not add one merely to mark a verification run.

## 4. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/playground`. Every command that
was not run did not pass.

1. Preflight — clean tree, expected head, nothing to merge:

   ```sh
   git status --porcelain          # expected: empty (after committing this plan)
   git rev-parse --short HEAD      # expected: 86057653 or a descendant
   git fetch origin
   git rev-list --count HEAD..origin/master   # expected: 0
   ```

   Commit this plan and its index row first; never sweep uncommitted work into
   the gate. If `origin/master` has advanced, see §5 — a merge is allowed only
   if every incoming path is outside this workstream, otherwise STOP.

2. Rebuild the runner and confirm the registry sizes:

   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js --list | wc -l   # expected: 106
   nub apps/playground/dist/live/run.js --list | wc -l    # expected: 95
   nub apps/playground/dist/live/run.js --list | grep -c '^live-theme$'   # expected: 1
   ```

3. **Headless full suite** (the end-of-task check for a cross-cutting run):

   ```sh
   nub apps/playground/dist/smoke/run.js
   ```

   Expected: `106/106 scenarios passed`, **3824 checks**, 65 capabilities,
   exit `0`, `.artifacts/smoke-report.json` rewritten. Takes ~2–3 minutes. Do
   not pass `--only` here.

4. **Live full suite** (this plan is the merge/release gate, so `--all` is
   authorised; never run it merely while iterating):

   ```sh
   nub apps/playground/dist/live/run.js --all
   ```

   Expected: `95/95 scenarios passed`, **2521 checks**, 61 capabilities,
   exit `0`, `.artifacts/live-report.json` rewritten, one screenshot per
   scenario under `.artifacts/live/`, and **no** `provenance.json` (no
   `--capture`). Takes ~18 minutes. Run it in the background with the output
   captured to a file so a harness timeout cannot truncate it; wait for
   completion rather than polling.

5. Read the totals from the artifacts, not from memory:

   ```sh
   node -e 'const r=require("./apps/playground/.artifacts/smoke-report.json"); console.log(r.scenarios.length, r.scenarios.reduce((n,s)=>n+s.checks.length,0), r.capabilities.length, r.durationMs, r.host)'
   node -e 'const r=require("./apps/playground/.artifacts/live-report.json"); console.log(r.scenarios.length, r.scenarios.reduce((n,s)=>n+s.checks.length,0), r.capabilities.length, r.durationMs, r.host)'
   node -e 'const r=require("./apps/playground/.artifacts/live-report.json"); const s=r.scenarios.find(s=>s.id==="live-theme"); console.log(s.checks.length, s.durationMs)'
   ```

   Expected: the last command prints **39** for `live-theme`. Also confirm both
   `host` lines carry the release-tag pins (`gpuix 9fcd6288`, `zed 81c99f81`,
   `runtime shaders`) and that no `provenance.json` exists under
   `.artifacts/live/`.

6. Gates:

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   Expected: all exit `0`. Test counts: playground **442**, testing **68**,
   components **308**, primitives **282**, tokens **196**, tw **103**, icons
   **19**, docs **7** — verify in the output, do not assume. A different count
   is acceptable only if it is explained by an upstream merge recorded in §8;
   otherwise STOP.

7. Write the ledgers (§3), then commit and push:

   ```sh
   git add .agents/slop/plans/677-promotion-gate-with-palette-pixels.md \
           .agents/slop/plans/README.md COMPONENTS.md TODO.md \
           apps/playground/README.md
   git commit -m "docs(playground): record the plan-677 promotion gate"
   git push origin agent/playground
   ```

## 5. STOP conditions

- `git status --porcelain` is non-empty before the run: STOP. Commit or stash
  the existing work first; never sweep another agent's edits into the gate
  commit.
- `origin/master` advanced *and* an incoming path is inside `apps/playground`
  or `packages/testing`: STOP and reconcile in a separate plan. A merge of
  paths outside this workstream is allowed, but then re-read the expected test
  counts in §8 rather than assuming.
- Either `--list` count is not 106/95, or `live-theme` is absent: STOP. The
  registry changed; report the new ids and reconcile `COMPONENTS.md` before
  running.
- The live run exits `2` (no window/binding): STOP. That is an environment
  failure, not a red suite; record it and do not claim a live total.
- Any scenario fails: STOP. Record the id and the exact failing check message;
  do not edit the scenario in this plan. A fix needs its own plan and a
  failing-before/passing-after test.
- The live check total is not **2521**, or `live-theme` does not report **39**
  checks: STOP and explain before recording anything.
- The headless total is not **3824**: STOP and explain before recording it.
- Any gate (`check`/`lint`/`test`) fails: STOP. This plan changes prose only,
  so a failure is pre-existing or environmental; report it, do not "fix" it
  here.
- Never push to `master`; never force-push.

## 6. Test plan — what this run can catch

This is a release gate, not a new behaviour test. Its value is **coverage on
one head**, which focused runs cannot provide:

| It catches | How |
| ---------- | --- |
| a scenario that only fails when the whole registry runs in sequence | the full run exercises the shared mount/runner path (`shell-selection`'s plan-182 lesson) |
| an ordering or state leak between live scenarios | all 95 live ids run in registry order in one window process |
| the new frame sampling interacting with another scenario's window state | `live-theme` runs at its registry position, after `live-pixel-colour` and the rest of the theme family |
| a frame capture that leaks a mounted surface or a stale PNG | the live run writes every scenario's screenshot and rewrites `live-report.json` |
| stale ledger totals | the artifacts are read directly and the numbers written from them |
| a scenario silently dropped from the registry | the expected 95 ids and the exact 2521 check total; `liveScenarioProblems` already guards uniqueness and capability coverage |
| a headless/live divergence introduced by the shared frame sampler | `pixel-colour` and `live-pixel-colour` both run, now sharing `scenarios/frames.ts` |

No mutation proof is appropriate: this plan changes no scenario code, so there
is nothing to mutate. The two-direction evidence is plan `676` §10 (the four
mutation proofs already show the frame checks fail when the palette, swatch,
scale or expectation is wrong) plus this run's higher live total, which proves
those checks executed inside the full registry.

## 7. Acceptance

- Headless `106/106`, exit `0`, 3824 checks, 65 capabilities, duration
  recorded.
- Live `95/95` with **`--all`**, exit `0`, **2521** checks, 61 capabilities,
  duration recorded, `live-theme` reporting 39 checks, and no
  `provenance.json`.
- `nub run check`, `nub run lint`, `nub run test` green.
- `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md` and the plan index
  cite this run's numbers; no stale 2491 remains as the current gate.
- The plan is marked `landed` with the exact head and commands.
- The commit is pushed to `origin/agent/playground`; `master` is untouched.

## 8. Results (2026-10-19, darwin-x64, release-tag binding)

The gate ran at `86057653` (the plan-676 code head) plus this plan's commit
`ff88c49a`; `origin/master` was still `2b4eb0d9` and the branch was 0 behind,
so no merge was needed.

**Headless** — `nub apps/playground/dist/smoke/run.js` is **106/106**, exit
`0`, **3824 checks**, 65 capabilities, **95.9 s** (`durationMs` 95912).
`--list` printed 106 ids. Host:
`gpuix TestRenderer darwin-x64 @gpuix/native 0.10.0 (gpuix 9fcd6288, zed 81c99f81, runtime shaders)`.
`.artifacts/smoke-report.json` was rewritten by this run (mtime 17:31).

**Live** — `nub apps/playground/dist/live/run.js --all` is **95/95**, exit
`0`, **2521 checks**, 61 capabilities, **1106.8 s** (`durationMs` 1106799).
`--list` printed 95 ids and `live-theme` was among them; it reports **39
checks** (112.8 s), so the palette's frame pixels ran inside the full
sequence. Host:
`gpuix live window darwin-x64 @gpuix/native 0.10.0 (gpuix 9fcd6288, zed 81c99f81, runtime shaders)`.
The check total is exactly plan `675`'s 2491 minus `live-theme`'s old 9 plus
its new 39 (`2491 − 9 + 39 = 2521`). `.artifacts/live-report.json` was
rewritten (mtime 17:50); a plain `--all` wrote **no** `provenance.json` (no
`--capture`).

**Gates** — `nub run check`, `nub run lint` and `nub run test` all exit `0`.
Test counts: playground **442**, testing **68**, components **308**,
primitives **282**, tokens **196**, tw **103**, icons **19**, docs **7** —
unchanged from plan `674`/`676` (this plan changes prose only).

**No source change.** No scenario, view, host verb, component, registry entry
or test was edited. The owner/supervisor still performs the promotion merge;
this workstream never pushes to `master`.

**Exact commands and ids run:**

```sh
nub run --filter playground build
nub apps/playground/dist/smoke/run.js --list          # 106
nub apps/playground/dist/live/run.js --list           # 95, live-theme present
nub apps/playground/dist/smoke/run.js                 # the whole headless registry
nub apps/playground/dist/live/run.js --all            # the whole live registry
nub run check && nub run lint && nub run test
```

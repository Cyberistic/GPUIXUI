# 699 — The promotion gate on the head that includes the chart colour pixels

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | F (release verification) |
| Owner | playground |
| Depends on | `517` (focused live runs), `529` (the release-tag binding), `639` (the live-registry guard), `653` (capability coverage), `656` (the capture-capable live runner), `674` (pixel evidence), `677` (the palette-pixel gate), `691` (the image-pixel gate), `697` (the chart colour pixels) |
| Feeds | the promotion record in `TODO.md`; `COMPONENTS.md` and `apps/playground/README.md` ledger totals |

## 1. Goal and the gap being closed

The last full merge/release gate (plan `691`) ran on the plan-690 head
(merged as `76edbe63`):

- headless **106/106**, **3824** checks, 65 capabilities, exit `0`;
- live **95/95**, **2544–2545** checks, 61 capabilities, exit `0`
  (`live-tier2-editing` branches on a documented window-state property and adds
  one check on the missed-blur branch — the gate total is a **range**, see plan
  `691` §8).

Plan `697` then grew the **existing** live scenario `live-chart` from **40 to
71 checks**: two `40 × 40` solid sourced masks were added to the shared chart
view and the scenario decodes one captured frame and samples both mask tints
(`#A7A9FF`, `#3BC97F`), the image's two opaque fills (`#E5484D`, `#30A46C`), the
radial centre (`#FFD166`) and the linear gradient's top/bottom. The live
registry is unchanged at **95**, and the headless `chart-svg` control stays at
**52** checks, so neither suite has yet run with those 31 extra checks inside
the full sequence. `TODO.md` (plan `697` row) and `COMPONENTS.md` say exactly
that: the next full gate's expected live total is **2545 + 31 = 2576** for 95
ids.

This plan closes that gap. It is **verification only**:

1. rebuild the runner and confirm the registry sizes;
2. run the **full headless registry** and the **full live registry** on the
   current head;
3. read the totals from the report artifacts, not from memory;
4. update the four ledgers to cite this run;
5. commit and push `agent/playground`.

No scenario, view, host verb, component, registry entry or test changes. If the
gate is red, this plan STOPs and reports the failing id; a fix needs its own
plan and a failing-before/passing-after test.

**Non-goals:** adding or changing a scenario, changing the live registry, fixing
a component defect (record it as a cross-team task instead), tagging, merging
into `master`, or pushing `master`.

## 2. Measured context the executor needs

Recon on 2026-10-19 (read-only, before this file existed):

```text
$ git rev-parse --short HEAD
21d02b2a                      # feat(playground): sample the chart's colour contract in a live window (697)

$ git status --porcelain
                              # empty

$ git rev-list --count HEAD..origin/master
0                             # nothing to merge

$ nub apps/playground/dist/smoke/run.js --list | wc -l
106
$ nub apps/playground/dist/live/run.js --list | wc -l
95
$ nub apps/playground/dist/live/run.js --list | grep -c '^live-chart$'
1
```

The registry is the source of truth for the expected scenario counts: **106
headless ids and 95 live ids**. Re-derive them with `--list` after the rebuild;
never assert a count remembered from a previous plan when the registry can be
read.

Expected check totals (predictions, not claims):

- headless: **3824** — plan `697` changed the shared chart view (two extra mask
  children) and the live `live-chart` sampling only; the headless control
  `chart-svg` is documented as unchanged at **52**, and no other headless
  scenario check was added or removed. A different total means an unrelated
  change landed — STOP and explain.
- live: **2576** — plan `691`'s 2545 plus the **31** checks plan `697` added to
  `live-chart` (40 → 71). Because `live-tier2-editing` contributes 2544 on its
  commit branch and 2545 on its missed-blur branch, an accepted green run reads
  **2575 or 2576**; a total of **2545** (or 2544) means the new chart checks did
  not run — **STOP** rather than recording the old total as new.
- capabilities: headless **65**, live **61** (unchanged).

The artifacts' shape is `SmokeReport` (`packages/testing/src/smoke.ts`):
`{ host, startedAt, durationMs, scenarios[], capabilities[] }`, and each
scenario carries `checks[]` and `durationMs`. There is no `passed`/`total`
field, so read the totals as `scenarios.length`, the sum of
`scenarios[].checks.length`, and `capabilities.length`.

The ledgers that carry stale live totals:

- `COMPONENTS.md` lines **~120–124**: the sentence promising the next gate's
  **2576** for 95 ids (plan `697` wrote it).
- `COMPONENTS.md` line **~185–188**: the live-gate paragraph that cites the
  plan-691 totals.
- `apps/playground/README.md` lines **~2088–2107**: the live evidence block
  ("The last full merge/release gate ran 95/95 …") and its "expected total is
  2576" paragraph.
- `apps/playground/README.md` lines **~2298–2303**: the real-window suite
  bullet.
- `TODO.md`: add the new gate task above the plan-697 task, and append an
  addendum to the `[~]` promotion task.
- `.agents/slop/plans/README.md`: append the plan-699 row to the playground
  table.

Leave any sentence that says the live registry lists **95** scenarios — the
count is unchanged. Plan `697`'s own row in the index and TODO task stay as
history.

## 3. Files to change

### 3.1 `.agents/slop/plans/699-promotion-gate-with-chart-colour-pixels.md` (this file)

Replace `Status | planned` with `Status | landed` and fill §8 with:

- the head the gate ran on (`git rev-parse --short HEAD`);
- both exact totals, exit codes, capability counts and wall-clock durations;
- the exact commands;
- confirmation that the report artifacts on disk are the ones this run wrote
  (mtimes/timestamps);
- a one-line statement that no source changed.

### 3.2 `.agents/slop/plans/README.md`

Append a row to the playground table after plan `697`:

```
| [699](./699-promotion-gate-with-chart-colour-pixels.md) | The promotion gate on the head that includes the chart colour pixels | F | `639`, `653`, `656`, `691`, `697` | **landed** — verification only: headless **106/106** (`3824` checks, 65 capabilities) and live **95/95** (`2576` checks, 61 capabilities), both exit `0`; … |
```

Use the measured numbers, not the predictions above.

### 3.3 `COMPONENTS.md`

1. Lines ~120–124: keep the headless sentence at **106/106 / 3824 / 65**;
   replace the plan-691 live gate with this run's **95/95**, measured check
   total, capability count and duration, and name plan `699`. Extend the
   derivation sentence with plan `697`'s **+31** on `live-chart` (40 → 71).
   Delete the trailing "the next full gate total is 2576" promise — it is now
   measured.
2. Lines ~185–188: replace the plan-691 live-gate sentence with this run's
   numbers.
3. Do not change any capability or component row; the gate measured none.

### 3.4 `apps/playground/README.md`

1. The live evidence block (~2088–2107): replace the current plan-691 totals
   with this run's totals and the date; keep the "supersedes plan …" history
   sentence but prepend this gate. Replace the "expected total is 2576"
   paragraph with the measured total.
2. The real-window bullet (~2298–2303): update the totals and the plan number.
3. Leave the "live registry lists 95 scenarios" sentence alone.

### 3.5 `TODO.md`

1. Add one ticked task under the playground section above the plan-697 task,
   naming the exact scenario ids run (the whole headless registry and the whole
   live registry, `--all`), both totals, the gate results and the fact that no
   source changed.
2. Append an addendum to the promotion task (`[~]`) citing this gate, so the
   owner/supervisor's fast-forward is backed by the current head.
3. Leave the plan-697 task as history.

### 3.6 `PLAN.md`

No new decision row: the gate measures no new runtime fact and changes no
architecture. Do not add one merely to mark a verification run.

## 4. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/playground`. Every command that
was not run did not pass.

1. Preflight — clean tree, expected head, nothing to merge:

   ```sh
   git status --porcelain          # expected: empty (after committing this plan)
   git rev-parse --short HEAD      # expected: 21d02b2a or a descendant
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
   nub apps/playground/dist/live/run.js --list | grep -c '^live-chart$'  # expected: 1
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

   Expected: `95/95 scenarios passed`, **2576 checks**, 61 capabilities,
   exit `0`, `.artifacts/live-report.json` rewritten, one screenshot per
   scenario under `.artifacts/live/`, and **no** `provenance.json` (no
   `--capture`). Takes ~18 minutes. Run it in the background with the output
   captured to a file so a harness timeout cannot truncate it; wait for
   completion rather than polling.

5. Read the totals from the artifacts, not from memory:

   ```sh
   node -e 'const r=require("./apps/playground/.artifacts/smoke-report.json"); console.log(r.scenarios.length, r.scenarios.reduce((n,s)=>n+s.checks.length,0), r.capabilities.length, r.durationMs, r.host)'
   node -e 'const r=require("./apps/playground/.artifacts/live-report.json"); console.log(r.scenarios.length, r.scenarios.reduce((n,s)=>n+s.checks.length,0), r.capabilities.length, r.durationMs, r.host)'
   node -e 'const r=require("./apps/playground/.artifacts/live-report.json"); const s=r.scenarios.find(s=>s.id==="live-chart"); console.log(s.checks.length, s.durationMs)'
   ```

   Expected: the last command prints **71** for `live-chart`. Also confirm
   both `host` lines carry the release-tag pins (`gpuix 9fcd6288`,
   `zed 81c99f81`, `runtime shaders`) and that no `provenance.json` exists under
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
   git add .agents/slop/plans/699-promotion-gate-with-chart-colour-pixels.md \
           .agents/slop/plans/README.md COMPONENTS.md TODO.md \
           apps/playground/README.md
   git commit -m "docs(playground): record the plan-699 promotion gate"
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
- Either `--list` count is not 106/95, or `live-chart` is absent: STOP. The
  registry changed; report the new ids and reconcile `COMPONENTS.md` before
  running.
- The live run exits `2` (no window/binding): STOP. That is an environment
  failure, not a red suite; record it and do not claim a live total.
- Any scenario fails: STOP. Record the id and the exact failing check message;
  do not edit the scenario in this plan. A fix needs its own plan and a
  failing-before/passing-after test.
- The live check total is not in **2575–2576**, or `live-chart` does not report
  **71** checks: STOP and explain before recording anything.
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
| the new frame sampling interacting with another capture scenario's window state | `live-chart` runs at its registry position, after the other capture scenarios |
| the two extra mask children changing the headless chart control | `chart-svg` runs in the full headless registry and must stay at 52 checks |
| a frame capture that leaks a mounted surface or a stale PNG | the live run writes every scenario's screenshot and rewrites `live-report.json` |
| stale ledger totals | the artifacts are read directly and the numbers written from them |
| a scenario silently dropped from the registry | the expected 95 ids and the exact 2575–2576 check total; `liveScenarioProblems` already guards uniqueness and capability coverage |
| a headless/live divergence introduced by the shared chart view | both `chart-svg` and `live-chart` run over the same view |

No mutation proof is appropriate: this plan changes no scenario code, so there
is nothing to mutate. The two-direction evidence is plan `697` §8 (six mutation
proofs already show the chart-colour checks fail when a tint, a fill, a gradient
stop or the radial extent is wrong) plus this run's higher live total, which
proves those checks executed inside the full registry.

## 7. Acceptance

- Headless `106/106`, exit `0`, 3824 checks, 65 capabilities, duration
  recorded, `chart-svg` at 52 checks.
- Live `95/95` with **`--all`**, exit `0`, **2575–2576** checks, 61
  capabilities, duration recorded, `live-chart` reporting 71 checks, and no
  `provenance.json`.
- `nub run check`, `nub run lint`, `nub run test` green.
- `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md` and the plan index
  cite this run's numbers; no stale 2545 remains as the current gate.
- The plan is marked `landed` with the exact head and commands.
- The commit is pushed to `origin/agent/playground`; `master` is untouched.

## 8. Results

Landed 2026-10-19 on `agent/playground`, darwin-x64 with the release-tag
binding. The gate ran on `4101684e` (this plan's commit) over the code head
`21d02b2a` (plan `697`); the tree was clean and `origin/master` had not advanced
(`git rev-list --count HEAD..origin/master` = `0`). **No source changed.**

**Registry** (re-derived after the rebuild, not remembered): headless **106**
ids, live **95** ids, `live-chart` present.

**Headless full suite** — `nub apps/playground/dist/smoke/run.js`:

- **106/106** scenarios, **3824** checks, **65** capabilities, exit `0`;
- **78.9 s** (`durationMs` 78863), started `2026-10-19T16:22:06Z`;
- `chart-svg` **52** checks, unchanged;
- `.artifacts/smoke-report.json` rewritten at **19:23:25 +03**;
- host: `gpuix TestRenderer darwin-x64 @gpuix/native 0.10.0 (gpuix 9fcd6288,
  zed 81c99f81, runtime shaders)`.

**Live full suite** — `nub apps/playground/dist/live/run.js --all`:

- **95/95** scenarios, **2576** checks, **61** capabilities, exit `0`;
- **1078.0 s** (`durationMs` 1078040), started `2026-10-19T16:23:37Z`;
- `live-chart` **71** checks (7245 ms) — the plan-697 colour contract ran inside
  the full sequence;
- `live-tier2-editing` **33** checks, the missed-blur branch, so the total sits
  at the top of the predicted **2575–2576** range (`2545 + 31`);
- `.artifacts/live-report.json` rewritten at **19:41:35 +03**; one screenshot per
  scenario under `.artifacts/live/`, **no** `provenance.json` (plain `--all`);
- host: `gpuix live window darwin-x64 @gpuix/native 0.10.0 (gpuix 9fcd6288,
  zed 81c99f81, runtime shaders)`.

**Gates** — `nub run check`, `nub run lint`, `nub run test`, all exit `0`:
playground **442**, testing **68**, components **308**, primitives **282**,
tokens **196**, tw **103**, icons **19**, docs **7**. Every count matched the
plan; no merge was needed, so none is attributable to an upstream change.

Totals were read back from the artifacts with the §4.5 commands, not from the
console summary. The ledgers (`COMPONENTS.md`, `apps/playground/README.md`,
`TODO.md`, the plan index) now cite this run; the stale plan-691 (2545) sentence
is history only.

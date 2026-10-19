# 657 — The promotion gate on the head that includes the live capture CLI

**Phase:** F
**Depends on:** `639`, `649`, `653`, `654`, `655`, `656`, `517`, `529`
**Workstream:** playground (`apps/playground`, `packages/testing`)

## 1. Why this plan exists

`agent/playground` remains the promotion candidate: it contains every commit of
`origin/master`, and the owner/supervisor performs the fast-forward. The last
recorded merge/release gate is plan `655`'s, run on `651e2419` (the
`live-theme-platform` commit): **94/94** live, **2447** checks, 61 capabilities,
989.9 s, and **105/105** headless, 3765 checks, both exit `0`.

Two commits have landed since that gate:

- `004dce6b` / `034d78df` (plan `656`) — the **live CLI** gained `--capture`
  and `--commit`, reading the commit before the native import, clearing stale
  frames, taking one screenshot per selected scenario after its `ready` gate,
  and writing the five-field `provenance.json` only for a green run.
  `captureCommand` gained a runner argument. The focused `live-shell` capture
  run passed (1/1, exit `0`), a stale frame was cleared, and a red/unrecordable
  run exited `2` before a window.

Plan `656` changed the code path that **every live scenario** now mounts
through: `program` reads the commit before the native import, `mount` has the
capture branch, and `main` provides `NodeChildProcessSpawner`. Only
`live-shell` has run through that path. A promotion whose recorded gate predates
a change to the shared live runner is a claim the branch has not earned.

The registry is unchanged at **105** headless and **94** live ids (`--list`,
measured while writing this plan), so this gate is about the runner, not about
a new scenario.

This is a **verification plan, not a code plan**: rebuild, run both registries
in full, record the measured totals, and leave the merge to the
owner/supervisor (the workstream never pushes to `master`).

**Guards being exercised:**

1. `liveScenarioProblems` (plan `639`) — unique, `live-`-prefixed ids, and every
   live capability mounted headlessly.
2. `capabilityCoverageProblems` (plan `653`) — every headless capability has a
   live scenario (or a named alias/exemption).
3. The full live suite — the integration proof that the capture-capable runner
   mounts, settles, screenshots only when asked, and runs every one of the 94
   scenarios with the same checks as before.

## 2. Files to change

No source or test files change. The only writes are ledger rows, and only after
every command below passes:

| File | Change |
| ---- | ------ |
| `TODO.md` | New ticked row at the top of the playground section with the measured numbers, duration, exit codes and the exact ids run (both full registries). Update the `[~]` promotion addendum (search `94/94`, `989.9`) to this gate's numbers and name plan `656` as included. |
| `apps/playground/README.md` | Update the "last full merge/release gate" paragraph (search `94/94`, `989.9`) to the new totals and date, stating that the live capture CLI is included. |
| `COMPONENTS.md` | Update the gate paragraphs at the capability table and the real-window paragraph (search `94/94`, `989.9 s`, `2447`) to the new totals. No capability verdict changes. |
| `.agents/slop/plans/README.md` | Add `657` to the playground table with a one-line landed status, and name the number in the numbering paragraph. |
| This plan | Fill §7 "Landed" with the exact observed counts, durations, host lines and any measured anomaly. |

Do **not** touch `packages/*` or `apps/docs`: a failure there is a cross-team row
(§4.6), not an edit.

## 3. Commands and expected results

Run from the worktree root (`/Users/cyberistic/GPUIXUI/workspaces/playground`)
with `nub`.

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter playground test` | exit `0`; the playground suite is **439** tests (plan `656` added three). Record the exact total and file count. |
| 2 | `nub run --filter playground build` | exit `0`; `apps/playground/dist/smoke/run.js` and `dist/live/run.js` rebuilt. |
| 3 | `nub apps/playground/dist/smoke/run.js --list \| wc -l` | `105` |
| 4 | `nub apps/playground/dist/live/run.js --list \| wc -l` | `94` |
| 5 | `nub apps/playground/dist/smoke/run.js` | exit `0`, **105/105 scenarios passed**, **3765** checks, **65** capabilities; `.artifacts/smoke-report.json` written; host line carries the release-tag pins. Record the exact numbers and duration. |
| 6 | `nub apps/playground/dist/live/run.js --all` | exit `0`, **94/94 scenarios passed**, including `live-shell` (the scenario plan `656` exercised with `--capture`); expect ≈**2447** checks, **61** capabilities, ≈990 s. Record the exact numbers. **This is the merge gate.** A plain `--all` writes no provenance and no new frame. |
| 7 | `nub run check` | exit `0`: `check:tests`, lint, format and every `check-types` pass. |
| 8 | `nub run lint` | exit `0`. |
| 9 | `nub run test` | exit `0`; record the per-package totals (the plan-655 baseline: playground 439, testing 61, components 308, primitives 282, tokens 196, tw 103, icons 19, docs 7). |

Order matters: steps 1–4 prove the tree and the registries before the gate.
Do **not** run step 6 twice "to be sure" unless it fails on a scenario suspected
timing-related; one green full run is the gate.

`--all` is correct here and only here: this is the merge/release gate, not an
iterating run. Do **not** pass `--capture` to step 6: the gate asserts the
scenario checks, and the capture path has its own focused evidence in plan
`656` §8. If capture is exercised again while triaging, use `--only live-shell`
and a scratch directory.

## 4. STOP conditions

Stop and report the command output — never widen a tolerance, drop a check, or
re-run until green — if:

1. `liveScenarioProblems` or `capabilityCoverageProblems` fails inside step 1.
   That is a real registry defect (duplicate/unprefixed/unmatched/naked entry);
   name it and fix the registry in a follow-up plan, not by weakening a guard.
2. Step 1, 2, 7, 8 or 9 fails. Fix the failure in this workstream if it is
   `apps/playground` or `packages/testing`; otherwise record a cross-team row in
   `TODO.md` and stop the gate.
3. Step 5 fails. Name the scenario and its first failing check; triage it
   against the owning plan. Do not promote a red headless suite.
4. Step 6 fails on a scenario that passes focused **and** is not reproducible
   focused twice. Record it as a gate flake, keep the red report, apply the
   owning plan's hardening rule (bounded `waitFor`, real-time budget, settle) —
   never remove the check — then re-run the full gate once.
5. Step 6 exits `2` (no window). Re-run once; if it persists, record that the
   gate could not run on this host and leave the promotion row unticked.
6. A fix needs a path outside `apps/playground`/`packages/testing`. Record it in
   `TODO.md` as a cross-team task; do not edit that path.
7. The live run writes a frame or a `provenance.json` during a plain `--all`
   run. That is a regression in plan `656`'s `Option` guard: stop, name the
   directory and file, and fix the runner before recording a gate.

## 5. Test plan

There is no new test: the change under test is the live runner's shared mount
path, and the gate is the integration proof. The discriminating checks are:

- **CLI tests:** `apps/playground/src/live/cli.test.ts` — `--capture`/`--commit`
  parsing and the missing-value errors (plan `656`).
- **`captureCommand` runner test:** `apps/playground/src/smoke/capture.test.ts`
  — the `"live"` command string; the `"smoke"` default is unchanged.
- **Registry guards:** `apps/playground/src/live/scenarios.test.ts` (plans `639`,
  `653`) fails if a live entry is duplicated, unprefixed, or has no headless
  twin, and if a headless capability has no live scenario and no named
  alias/exemption. Its real-registry case is what makes the 105/94 pair
  meaningful.
- **Headless full run:** every scenario mounts in `TestRenderer`; a change that
  broke a probe's paint, geometry or event contract turns a check red.
- **Live full run:** every live id opens the real window through the modified
  `program`/`mount`; a live-only regression (focus delivery, real timers, box
  movement, pointer pacing, paint counters, the commit read before the window)
  turns it red.

**Two-direction evidence.** The reverse direction is the recorded history: the
plan-`655` gate passed 94/94 on `651e2419`, which has **no** capture branch in
the live runner, while the current head has one and has only run `live-shell`
through it. A broken mount hook would make step 6 fail by name on the first
scenario; a green 94/94 that includes `live-shell` is the forward direction.
The focused capture evidence and its mutations are plan `656` §6/§8 and are not
re-run here.

**Not claimed:** colour, style reports and the accessibility dump remain
headless-only (the live renderer exposes no style/a11y method — plan `197`); the
binding is the locally built `darwin-x64` artifact (ADR `0003`), so the
published-binary CI run remains the gold standard.

## 6. Ledger wording

The rows must state, exactly once and from the report:

- headless: `105/105`, check count, capability count, duration, exit `0`;
- live: `94/94`, check count, capability count, duration, exit `0`;
- the date (`2026-10-19`), and that the head includes plan `656`'s live capture
  CLI (the plain `--all` gate wrote no frames and no sidecar);
- that the owner/supervisor performs the merge.

Do not copy the "expected" numbers from §3: read them from
`.artifacts/smoke-report.json` and `.artifacts/live-report.json` and the CLI
summary.

## 7. Acceptance

- [x] Steps 1–4 pass; the registry counts are `105` and `94`.
- [x] Headless full run: `105/105`, exit `0`, every capability `verified`.
- [x] Live full run: `94/94`, exit `0`, including `live-shell`; a plain
      `--all` wrote no frame and no `provenance.json`.
- [x] `nub run check`, `nub run lint`, `nub run test` pass; per-package counts
      recorded.
- [x] The ledgers name this gate's numbers, not the 94/94 run on `651e2419`.
- [x] Committed on `agent/playground` and pushed to `origin`.
- [x] The promotion row stays `[~]` (owner merges); never push to `master`.

## 8. Landed

Executed 2026-10-19 on head `034d78df` (the plan-`656` docs commit; the code
commit is `004dce6b`, and the head contains every commit of `origin/master`).

- **Preflight:** `nub run --filter playground test` → **439** tests in 37 files,
  exit `0` (plan `656`'s three capture/CLI cases present); `nub run --filter
  playground build` → exit `0`; `--list` → **105** headless and **94** live ids.
  Both registry guards pass as part of the suite.
- **Headless:** `105/105`, **3765** checks, 65 capabilities, **136.3 s**, exit
  `0` (`.artifacts/smoke-report.json`; host `gpuix TestRenderer darwin-x64
  @gpuix/native 0.10.0 (gpuix 9fcd6288, zed 81c99f81, runtime shaders)`).
- **Live:** `94/94`, **2447** checks, 61 capabilities, **921.6 s**, exit `0`
  (`.artifacts/live-report.json`; host `gpuix live window darwin-x64
  @gpuix/native 0.10.0 (gpuix 9fcd6288, zed 81c99f81, runtime shaders)`).
  `live-shell` passed through the capture-capable `program`/`mount` path. A
  plain `--all` wrote **no** `provenance.json` anywhere under
  `apps/playground/.artifacts` (the ad-hoc per-scenario frames in
  `.artifacts/live/` are unchanged, as plan `656` scoped them).
- **Same checks as before the runner change:** the live total is **2447**
  checks, identical to plan `655`'s 94/94 run on `651e2419`; only the wall-clock
  duration differs (921.6 s vs 989.9 s). The capture branch is therefore inert
  when `--capture` is absent, which is the claim plan `656` §2 rule 5 made.
- **Gates:** `nub run check`, `nub run lint` and `nub run test` green
  (playground **439**, testing 61, components 308, primitives 282, tokens 196,
  tw 103, icons 19, docs 7).
- **Ledgers:** `TODO.md` (new ticked gate row + the promotion addendum),
  `COMPONENTS.md` (both totals, the 93 → **94** registered-live correction and
  the real-window paragraph) and `apps/playground/README.md` (both gate
  paragraphs) now cite this run.
- **Left for the owner/supervisor:** the fast-forward merge of
  `agent/playground` into `main`. The workstream never pushes to `master`.

No source, scenario or host verb changed; the only writes are the plan and the
ledger rows listed in §2.

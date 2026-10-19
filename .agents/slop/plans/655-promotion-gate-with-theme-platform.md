# 655 — The promotion gate on the head that includes `live-theme-platform`

**Phase:** F
**Depends on:** `639`, `649`, `653`, `654`, `517`, `529`
**Workstream:** playground (`apps/playground`, `packages/testing`)

## 1. Why this plan exists

`agent/playground` is still the promotion candidate: it contains every commit of
`origin/master`, and the owner/supervisor performs the fast-forward. The last
recorded merge/release gate is plan `649`'s, and it ran on the head that added
`live-diff`: **93/93** live, **2402** checks, 61 capabilities, 1062.5 s, and
**105/105** headless, 3765 checks, both exit `0`.

Two commits have landed since that gate:

- `405a8ec7` / `6809eed5` (plan `653`) — test-only: the live-coverage guard now
  covers every headless capability, and the registry gained two named aliases
  and two measured exemptions. It adds four tests and changes no scenario, but
  it makes a **new claim** about the registry that the gate should corroborate.
- `651e2419` (plan `654`) — `live-theme-platform`, a new live scenario
  (registry **93 → 94**) that cycles the platform type styles through a real
  click.

The registry now reports **94** live ids and **105** headless ids. Only the
focused `live-theme-platform` runs have exercised the new scenario; no full run
has included it. A promotion whose recorded gate predates a registered scenario
is a coverage claim the branch has not earned.

This is a **verification plan, not a code plan**: rebuild, run both registries
in full, record the measured totals, and leave the merge to the
owner/supervisor (the workstream never pushes to `master`).

**Guards being exercised:**

1. `liveScenarioProblems` (plan `639`) — unique, `live-`-prefixed ids, and every
   live capability mounted headlessly.
2. `capabilityCoverageProblems` (plan `653`) — every headless capability has a
   live scenario (or a named alias/exemption).
3. The two full suites themselves — the integration proof that the new live
   scenario passes beside the other 93.

## 2. Files to change

No source or test files change. The only writes are ledger rows, and only after
every command below passes:

| File | Change |
| ---- | ------ |
| `TODO.md` | New ticked row at the top of the playground section with the measured numbers, duration, exit codes and the exact ids run (both full registries). Update the `[~]` promotion addendum (search `93/93`) to this gate's numbers. |
| `apps/playground/README.md` | Update the "last full merge/release gate" paragraph (search `93/93`, `2402`) to the new totals and date. |
| `COMPONENTS.md` | Update the gate paragraph at the capability table and the real-window paragraph (search `93/93`, `2402`, `1062.5 s`) to the new totals. No capability verdict changes. |
| `.agents/slop/plans/README.md` | Add `655` to the playground table with a one-line landed status, and name the number in the numbering paragraph. |
| This plan | Fill §7 "Landed" with the exact observed counts, durations, host lines and any measured anomaly. |

Do **not** touch `packages/*` or `apps/docs`: a failure there is a cross-team row
(§4.6), not an edit.

## 3. Commands and expected results

Run from the worktree root (`/Users/cyberistic/GPUIXUI/workspaces/playground`)
with `nub`.

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter playground test` | exit `0`; the playground suite is **436** tests across 36 files (the plan-653 count). Record the exact total. |
| 2 | `nub run --filter playground build` | exit `0`; `apps/playground/dist/smoke/run.js` and `dist/live/run.js` rebuilt. |
| 3 | `nub apps/playground/dist/smoke/run.js --list \| wc -l` | `105` |
| 4 | `nub apps/playground/dist/live/run.js --list \| wc -l` | `94` |
| 5 | `nub apps/playground/dist/smoke/run.js` | exit `0`, **105/105 scenarios passed**, **3765** checks, **65** capabilities; `.artifacts/smoke-report.json` written; host line carries the release-tag pins. Record the exact numbers. |
| 6 | `nub apps/playground/dist/live/run.js --all` | exit `0`, **94/94 scenarios passed**, including `live-theme-platform`; expect ≈**2425** checks, **61** capabilities, ≈1080 s. Record the exact numbers. **This is the merge gate.** |
| 7 | `nub run check` | exit `0`: `check:tests`, lint, format and every `check-types` pass. |
| 8 | `nub run lint` | exit `0`. |
| 9 | `nub run test` | exit `0`; record the per-package totals (the plan-649 baseline: playground 436, testing 61, components 308, primitives 282, tokens 196, tw 103, icons 19, docs 7). |

Order matters: steps 1–4 prove the tree and the registries before the gate.
Do **not** run step 6 twice "to be sure" unless it fails on a scenario suspected
timing-related; one green full run is the gate.

`--all` is correct here and only here: this is the merge/release gate, not an
iterating run.

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

## 5. Test plan

There is no new test: the change under test is the registry state plus a test-only
guard, and the gate is the integration proof. The discriminating checks are:

- **Registry guards:** `apps/playground/src/live/scenarios.test.ts` (plans `639`,
  `653`) fails if a live entry is duplicated, unprefixed, or has no headless
  twin, and if a headless capability has no live scenario and no named
  alias/exemption. Its real-registry case is what makes the 105/94 pair
  meaningful.
- **Headless full run:** every scenario mounts in `TestRenderer`; a change that
  broke a probe's paint, geometry or event contract turns a check red.
- **Live full run:** every live id opens the real window; a live-only regression
  (focus delivery, real timers, box movement, pointer pacing, paint counters)
  turns it red.
- **Focused evidence already held:** `live-theme-platform` was run focused four
  times green (plan `654` §7, including one run after the ledger edit); this
  plan proves it also passes inside the full registry.

**Two-direction evidence.** The reverse direction is the recorded history: the
plan-`649` gate (93/93) did not contain `live-theme-platform` and predated the
plan-`653` coverage guard, while `--list` now reports 94. If the new scenario
were broken, step 6 would name `live-theme-platform` and exit `1`; a green 94/94
is the forward direction. The mutation evidence for the scenario itself is plan
`654` §7 (M1/M3 fail, M2 recorded as a null result) and is not re-run here.

**Not claimed:** colour, style reports and the accessibility dump remain
headless-only (the live renderer exposes no style/a11y method — plan `197`); the
binding is the locally built `darwin-x64` artifact (ADR `0003`), so the
published-binary CI run remains the gold standard.

## 6. Ledger wording

The rows must state, exactly once and from the report:

- headless: `105/105`, check count, capability count, exit `0`;
- live: `94/94`, check count, capability count, duration, exit `0`;
- the date (`2026-10-19`) and that `live-theme-platform` was included;
- that the owner/supervisor performs the merge.

Do not copy the "expected" numbers from §3: read them from
`.artifacts/smoke-report.json` and `.artifacts/live-report.json` and the CLI
summary.

## 7. Acceptance

- [x] Steps 1–4 pass; the registry counts are `105` and `94`.
- [x] Headless full run: `105/105`, exit `0`, every capability `verified`.
- [x] Live full run: `94/94`, exit `0`, including `live-theme-platform`.
- [x] `nub run check`, `nub run lint`, `nub run test` pass; per-package counts
      recorded.
- [x] The ledgers name this gate's numbers, not the 93/93 run.
- [x] Committed on `agent/playground` and pushed to `origin`.
- [x] The promotion row stays `[~]` (owner merges); never push to `master`.

## 8. Landed

Executed 2026-10-19 on head `651e2419` (the plan-`654` commit, which contains
every commit of `origin/master`).

- **Preflight:** `nub run --filter playground test` → **436** tests in 37 files,
  exit `0`; `nub run --filter playground build` → exit `0`; `--list` → **105**
  headless and **94** live ids. Both registry guards pass as part of the suite.
- **Headless:** `105/105`, **3765** checks, 65 capabilities, exit `0`
  (`.artifacts/smoke-report.json`, 116.1 s; host
  `gpuix TestRenderer darwin-x64 @gpuix/native 0.10.0 (gpuix 9fcd6288, zed
  81c99f81, runtime shaders)`).
- **Live:** `94/94`, **2447** checks, 61 capabilities, **989.9 s**, exit `0`
  (`.artifacts/live-report.json`; `live-theme-platform` included and
  `theme=verified`; host `gpuix live window darwin-x64 @gpuix/native 0.10.0
  (gpuix 9fcd6288, zed 81c99f81, runtime shaders)`).
- **Corroboration:** plan `654`'s own full run on the same head also passed
  `94/94` (**2447** checks, 984.3 s). The check count is identical; only the
  wall-clock duration differs, as expected between runs. No anomaly.
- **Gates:** `nub run check`, `nub run lint` and `nub run test` green
  (playground **436**, testing 61, components 308, primitives 282, tokens 196,
  tw 103, icons 19, docs 7).
- **Ledgers:** `TODO.md` (new row + promotion addendum), `COMPONENTS.md` (both
  totals and the live-scenario list), `apps/playground/README.md` (both gate
  paragraphs) and the plan index now cite this run; no ledger still calls the
  93/93 gate current.
- **Left for the owner/supervisor:** the fast-forward merge of
  `agent/playground` into `main`. The workstream never pushes to `master`.

No source, scenario or host verb changed; the only writes are the plan and the
ledger rows listed in §2.

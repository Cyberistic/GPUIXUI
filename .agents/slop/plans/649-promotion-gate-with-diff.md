# 649 — The promotion gate on the head that includes `live-diff`

**Phase:** F
**Depends on:** `639`, `643`, `648`, `517`, `529`
**Workstream:** playground (`apps/playground`, `packages/testing`)

## 1. Why this plan exists

The promotion row in `TODO.md` is `[~]`: `agent/playground` contains every
commit of `origin/master` (a fast-forward for the owner/supervisor) and its last
recorded merge/release gate is **92/92** live (2378 checks, 965.0 s) and
**105/105** headless (3765 checks). That gate ran *before* plan `648` registered
`live-diff`.

The registry now holds **93** live scenarios and **105** headless ones. Only the
focused `live-diff` run has exercised the new scenario; no full run has included
it. A promotion whose recorded gate predates two registered scenarios is a
coverage claim the branch has not earned.

This plan is therefore a **verification plan, not a code plan**: rebuild, run
both registries in full, record the measured totals, and leave the merge to the
owner/supervisor (the workstream never pushes to `master`).

**Guard being exercised:** `liveScenarioProblems` (plan `639`) must accept the
93-entry live registry against the 105-entry headless one. A red guard means the
registry is a lie; §4 says stop.

## 2. Files to change

No source or test files change. The plan's only writes are ledger rows, after
every command below passes:

| File | Change |
| ---- | ------ |
| `TODO.md` | New ticked row at the top of the playground section with the measured numbers, duration, exit codes and the exact ids run (both full registries). Update the `[~]` promotion addendum from "92/92" to this gate's numbers. |
| `apps/playground/README.md` | Update the two "last full merge/release gate" paragraphs (search `92/92`, `2378`) to the new totals and date. |
| `COMPONENTS.md` | Update the gate paragraph at the capability table and the real-window paragraph (search `92/92`, `2378`, `965.0 s`) to the new totals. No capability verdict changes. |
| `.agents/slop/plans/README.md` | Add `649` to the playground table with a one-line landed status and name the number in the numbering paragraph. |
| This plan | Fill §7 "Landed" with the exact observed counts, durations, host lines and any measured anomaly. |

## 3. Commands and expected results

Run from the worktree root (`/Users/cyberistic/GPUIXUI/workspaces/playground`)
with `nub`.

| # | Command | Expected |
| - | ------- | -------- |
| 1 | `nub run --filter playground test` | exit `0`; the playground suite is **432** tests across 36 files (the plan-648 count). Record the exact total. |
| 2 | `nub run --filter playground build` | exit `0`; `apps/playground/dist/smoke/run.js` and `dist/live/run.js` rebuilt. |
| 3 | `nub apps/playground/dist/smoke/run.js --list \| wc -l` | `105` |
| 4 | `nub apps/playground/dist/live/run.js --list \| wc -l` | `93` |
| 5 | `nub apps/playground/dist/smoke/run.js` | exit `0`, **105/105 scenarios passed**, **3765 checks**, **65 capabilities**; `.artifacts/smoke-report.json` written; host line carries the release-tag pins. Record the exact numbers. |
| 6 | `nub apps/playground/dist/live/run.js --all` | exit `0`, **93/93 scenarios passed**, including `live-diff`; expect ≈**2400** checks, **60** capabilities, ≈**970 s**. Record the exact numbers. **This is the merge gate.** |
| 7 | `nub run check` | exit `0`: `check:tests`, lint, format and every `check-types` pass. |
| 8 | `nub run lint` | exit `0`. |
| 9 | `nub run test` | exit `0`; record the per-package totals (the plan-639 baseline: playground 432, testing 61, components 308, primitives 282, tokens 196, tw 103, icons 19, docs 7). |

Order matters: steps 1–4 prove the tree and the registries before the gate.
Do **not** run step 6 twice "to be sure" unless it fails on a scenario that is
suspected timing-related; one green full run is the gate.

`--all` is correct here and only here: this is the merge/release gate, not an
iterating run.

## 4. STOP conditions

Stop and report the command output — never widen a tolerance, drop a check, or
re-run until green — if:

1. `liveScenarioProblems` fails inside step 1. That is a real registry defect
   (duplicate/unprefixed/unmatched entry); name it and fix the registry in a
   follow-up plan, not by weakening the guard.
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

There is no new test: the change under test is the registry state, and the
gate is the integration proof. The discriminating checks are:

- **Registry guard:** `apps/playground/src/live/scenarios.test.ts` (plan `639`)
  fails if a live entry is duplicated, unprefixed, or has no headless twin. Its
  real-registry case is what makes the 93-headless/105-live pair meaningful.
- **Headless full run:** every scenario mounts in `TestRenderer`; a change that
  broke a probe's paint, geometry or event contract turns a check red.
- **Live full run:** every live id opens the real window; a live-only regression
  (focus delivery, real timers, box movement, pointer pacing) turns it red.
- **Focused evidence already held:** `live-diff` was run focused twice green
  (plan `648` §7); this plan proves it also passes inside the full registry.

**Two-direction evidence.** The reverse direction is the recorded history: the
plan-`643` gate (92/92) did not contain `live-diff`, and `--list` now reports
93. If the new scenario were broken, step 6 would name `live-diff` and exit
`1`; a green 93/93 is the forward direction.

**Not claimed:** colour, style reports and the accessibility dump remain
headless-only (the live renderer exposes no style/a11y method — plan `197`); the
binding is the locally built `darwin-x64` artifact (ADR `0003`), so the
published-binary CI run remains the gold standard.

## 6. Ledger wording

The rows must state, exactly once and from the report:

- headless: `105/105`, check count, capability count, exit `0`;
- live: `93/93`, check count, capability count, duration, exit `0`;
- the date (`2026-10-19`) and that `live-diff` was included;
- that the owner/supervisor performs the merge.

Do not copy the "expected" numbers from §3: read them from
`.artifacts/smoke-report.json` and `.artifacts/live-report.json` and the CLI
summary.

## 7. Acceptance

- [x] Steps 1–4 pass; the registry counts are `105` and `93`.
- [x] Headless full run: `105/105`, exit `0`, every capability `verified`.
- [x] Live full run: `93/93`, exit `0`, including `live-diff`.
- [x] `nub run check`, `nub run lint`, `nub run test` pass; per-package counts
      recorded.
- [x] The four ledgers name this gate's numbers, not the 92/92 run.
- [x] Committed on `agent/playground` and pushed to `origin`.
- [x] The promotion row stays `[~]` (owner merges); never push to `master`.

## 8. Landed

Executed 2026-10-19 on the head that adds plan `648`.

- **Headless:** `105/105`, **3765** checks, 65 capabilities, exit `0`
  (`.artifacts/smoke-report.json`; `diff=verified`).
- **Live:** `93/93`, **2402** checks, 61 capabilities, **1062.5 s**, exit `0`
  (`.artifacts/live-report.json`; `live-diff` included, `diff=verified`).
- **Gates:** `nub run check`, `nub run lint` and `nub run test` green
  (playground **432**, testing 61, components 308, primitives 282, tokens 196,
  tw 103, icons 19, docs 7).
- **Ledgers:** `TODO.md`'s promotion row, `COMPONENTS.md` (both totals),
  `apps/playground/README.md` (both totals) and plan `648`/its index row now
  cite this run; no ledger still calls the pre-`live-diff` 92/92 gate current.
- **Left for the owner/supervisor:** the fast-forward merge of
  `agent/playground` into `main`. The workstream never pushes to `master`.

One collision to record: a second live `swarm:playground` session wrote this
plan and committed the ledger edits at the same time as the primary session
(B3), so the plan was committed by the primary session's next `git add`. No work
was lost and both runs agreed; the duplicate-writer note in `TODO.md` is the
permanent place for it.

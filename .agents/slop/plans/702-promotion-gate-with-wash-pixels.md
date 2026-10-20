# 702 — The promotion gate on the head that includes the wash pixels

**Status:** planned · **Phase:** F · **Workstream:** playground
**Depends on:** `639`, `653`, `656`, `699`, `701`.
**Owns:** verification only — no source change.

## 1. Why

The branch is prepared for the owner's fast-forward and the last recorded gate
is plan `699` (headless `106/106`, `3824` checks; live `95/95`, `2576` checks,
exit `0`). Plan `701` adds checks to `search-highlights` and `live-highlights`
under the same ids, so the recorded live total no longer describes the head.
This plan re-runs both registries once, on the exact head that includes `701`,
and records the totals that authorise the promotion.

## 2. Steps

1. Confirm the head and that nothing is uncommitted:

   ```sh
   git status --short          # expected: empty
   git rev-parse --short HEAD  # record this sha
   git fetch origin master
   git rev-list --count HEAD..origin/master   # expected: 0 (or merge and re-run)
   ```

2. Run the whole headless registry (a bare command; `--all` is the live CLI's
   flag and the headless CLI rejects unknown flags):

   ```sh
   nub apps/playground/dist/smoke/run.js
   ```

   Expected: `106/106` scenarios, exit `0`, checks = `3824 + M` where `M` is the
   headless addition recorded in plan `701`; capabilities stay `65`;
   `.artifacts/smoke-report.json` written.

3. Run the whole live registry:

   ```sh
   nub apps/playground/dist/live/run.js --all
   ```

   Expected: `95/95` scenarios, exit `0`, checks = `2576 + N` where `N` is the
   live addition recorded in plan `701`; capabilities stay `61`;
   `.artifacts/live-report.json` written; no window means exit `2` (a failure).

4. Confirm a plain full run wrote **no** `provenance.json` and no capture frames:

   ```sh
   ls apps/playground/.artifacts/provenance.json 2>/dev/null  # expected: absent
   ```

5. Read the totals back from the two report JSON files (not from the console
   summary alone) and record them in plan `701` §8, `TODO.md` (the promotion
   row), `apps/playground/README.md` and `COMPONENTS.md` where the old totals
   are cited.

6. Gates:

   ```sh
   nub run check && nub run lint && nub run test
   ```

   Expected: exit `0`; test counts `playground 446`, `testing 68`,
   `components 308`, `primitives 282`, `tokens 196`, `tw 103`, `icons 19`,
   `docs 7` (adjust only if plan `701` changed the playground count).

7. Commit and push `agent/playground`:

   ```sh
   git add -A
   git commit -m "docs(playground): record the plan-702 promotion gate"
   git push origin agent/playground
   ```

   Never push to master.

## 3. Measured results (2026-10-20)

Verification only, on `1cb4d302` (the plan-702 commit on the plan-701 code head
`cee9b79c`); `origin/master` was 0 commits ahead at the start.

- Headless: **106/106**, **3865** checks, 65 capabilities, 105.5 s, exit `0`.
- Live: **95/95**, **2616** checks, 61 capabilities, 1073.1 s, exit `0`.
  `live-highlights` reports **53** checks inside the full sequence.
- The live total is plan `699`'s `2576` plus the 41 new wash checks minus one
  check of run-to-run branch variance in the existing suite (`live-tier2-editing`
  reports 31–33 depending on the blur branch); the scenario count and capability
  count are unchanged at `95`/`61`.
- Both `host` lines carry the release-tag pins (`gpuix 9fcd6288`, zed
  `81c99f81`, runtime shaders).
- A plain full run wrote **no** `provenance.json`.
- `nub run check`, `nub run lint` and `nub run test` exit `0` (playground 446,
  testing 68, components 308, primitives 282, tokens 196, tw 103, icons 19,
  docs 7).

This is the current gate for the promotion fast-forward.

**Post-gate merge (docs only).** `origin/master` then advanced by one commit,
`bc433838` (plan `438`: one 613-line plan file plus one index row, no code),
which merged cleanly. The merged head re-ran the whole headless registry
(**106/106**, **3865** checks, 65 capabilities, exit `0`), `nub run check`,
`nub run lint` and `nub run test` (playground 446) — all exit `0`. No scenario,
view, host verb or package changed, so the live gate above still describes the
promotion's code; this follows plan `699`'s docs-only-merge precedent.

## 4. STOP conditions

- Any scenario fails: stop, capture the failing check's `expected/actual` and
  the scenario id, and fix or record it in a new plan. Do not re-run hoping for
  a different result.
- `origin/master` has advanced: merge it into `agent/playground`, re-run both
  registries on the merge commit, and record that sha.
- The live registry does not report `95/95`: stop and reconcile the registry
  count with `live/scenarios.tsx` first.
- A `provenance.json` appears from a plain full run: stop; that is a
  capture-mode regression.

## 5. Acceptance

- Both registries ran on one recorded sha, exit `0`.
- The totals are read back from the report files and written into the ledgers.
- The promotion row in `TODO.md` cites this gate as the current one.
- `check`/`lint`/`test` pass; the branch is pushed.

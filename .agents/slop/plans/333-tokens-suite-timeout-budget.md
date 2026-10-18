# 333 — The tokens suite must not fail its own gate

**Phase:** F (truth pass) · **Workstream:** `tokens-theme` · **Depends on:** 061
(the compiler probe), 311/332 (the palette audits)

## The defect

`nub run --filter @gpuixui/tokens test` fails intermittently with Vitest's
**default 5 000 ms per-test timeout**, with no code change between runs. Measured
on this box (12 logical cores) on 2026-10-18:

| Run | Result | Failing test |
| --- | ------ | ------------ |
| 1 | 2 failed / 3 644 passed | `src/platform-recipes.test.ts:75` (`aero dark: inherits every role…`) and `src/react-consumer.test.ts:25` |
| 2 | 1 failed / 3 645 passed | `src/react-consumer.test.ts:25` |
| 3 | 3 646 passed | — |

Both tests pass comfortably when the file runs alone:

- `react-consumer.test.ts` runs a real `tsc -p tsconfig.consumer.json`; **2 307 ms**
  inside Vitest, 1 759 ms standalone.
- `platform-recipes.test.ts` runs 21 cases across 290 contrast pairs in **~800 ms**
  of test time.

The suite is 55 files. Vitest isolates by file, so a full run starts up to 55
worker processes on 12 cores, each paying 2.6–8.8 s of startup; a worker that is
descheduled while a 2.3 s compiler child runs can miss a 5 s deadline even though
nothing is wrong. This is the package's **completion gate**, so the failure mode
is not cosmetic:

- the gate goes red without a regression, and re-running until green is exactly
  the behaviour AGENTS §3 forbids (`never claim a test passed unless it ran`);
- a real regression is indistinguishable from scheduling noise, so the signal the
  suite exists to provide is lost;
- the same budget is inherited by CI and by any slower machine.

The 5 s default is a unit-test budget. This package has two legitimate operations
that are larger than a unit test: a compiler subprocess and a full palette audit.

## The fix

Add a package Vitest config with an explicit **20 s** per-test budget:

- ~9× the measured compiler probe and ~25× the heaviest palette audit — enough
  headroom for a loaded worker;
- a hung subprocess never returns, so the budget still fails it; this is not an
  infinite timeout and it cannot turn a wrong assertion green;
- it covers the whole suite, not just today's two files: `platform-recipes` is a
  pure computation that also timed out, which proves the starvation is not
  specific to the compiler probe. A per-file patch would leave the next heavy
  test exposed.

No test, token, theme, platform style, recipe, document or source file changes.
This is a harness budget, not a design decision.

### Why no new test file asserts the budget

AGENTS §3 requires a test that can fail. A test that reads `testTimeout` from the
config and asserts its value is a tautology about the harness: it cannot fail for
a behavioural reason and it would not catch the defect (which is contention, not
a constant). The meaningful proof is the two-direction run below — the suite is
the test, and it demonstrably failed before and passes after. The config cannot
mask a real failure: an assertion that is wrong still fails at any budget.

## Exact files

Create:

- `packages/tokens/vitest.config.ts`

Update:

- `.agents/slop/plans/README.md` — the plan row and its paragraph.
- `TODO.md` — one row under “Design tokens and theming”, ticked when green.

Nothing else. In particular do **not** edit `src/react-consumer.test.ts`,
`src/platform-recipes.test.ts`, `package.json` or any other package.

## Exact change

`packages/tokens/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

/**
 * This package's suite is fast, but two operations are larger than a unit test:
 * `react-consumer.test.ts` runs a real TypeScript compile (~2.3s) and the
 * palette audits evaluate the whole contrast contract. Vitest isolates per
 * file, so a full 55-file run starts that many workers on 12 cores and can
 * deschedule either operation past the 5s default with no code change — the
 * gate then fails intermittently. 20s is headroom, not an infinite timeout: a
 * hung subprocess never returns and still fails.
 */
export default defineConfig({
  test: {
    testTimeout: 20_000,
  },
});
```

Vitest resolves this file from the package root, which is the working directory
of the `test` script, so both `nub run --filter @gpuixui/tokens test` and the
root `nub run test` pick it up. The file is outside `tsconfig.json`'s `include`
(`src`), so it does not enter the published build or the type-checked surface.

## Commands and expected results

Run from the worktree root
`/Users/cyberistic/GPUIXUI/workspaces/tokens-theme`.

1. **Before the config**, reproduce the defect:

   ```sh
   for i in 1 2 3; do nub run --filter @gpuixui/tokens test; done
   ```

   Expected: at least one run reports
   `Error: Test timed out in 5000ms` for `react-consumer.test.ts` or
   `platform-recipes.test.ts`. Record the run number and test names in the
   commit body. If all three runs are green, run it twice more; the on-box
   evidence above already contains the failure, so a clean sweep does not
   invalidate the fix — it means the box was quiet.

2. **Add the config**, then run the same three-run loop.

   Expected: **three** consecutive runs each report
   `Test Files 55 passed (55)` / `Tests 3646 passed (3646)`.

3. `nub run --filter @gpuixui/tokens check-types`
   Expected: exit 0, no output.

4. `nub run check`
   Expected: test-lint, lint, format and type-check clean.

5. `nub run test`
   Expected: every workspace package green.

## Test plan

- Direction 1 (before): the full suite times out at the 5 s default under load —
  observed three times on 2026-10-18 (2, then 1, then 0 failures).
- Direction 2 (after): the same command three times, all 3 646 green.
- The config only raises a deadline; it changes no assertion, mock or value, so
  it cannot make a failing test pass. A regression introduced later still fails
  at 20 s, and a genuine hang still fails rather than blocking the run forever.
- `nub run check` proves the config file is not type-checked or linted into the
  published surface.

## STOP conditions

- Stop if any run after the config still reports `Test timed out in 20000ms`.
  That is a real hang, not scheduling noise: report the file, the child process
  and the wall time; do not raise the budget again.
- Stop if Vitest does not pick up the config (e.g. the run still reports
  `Test timed out in 5000ms`). Verify the file location before changing anything
  else; do not pass `--config` from the root, because the root command must keep
  working.
- Stop if `nub run check` or `nub run test` fails for a reason outside
  `packages/tokens/vitest.config.ts`; report the exact output instead of editing
  another workstream's path.
- Do not “fix” this by retrying the suite, by removing the compiler probe, or by
  lowering an assertion.

## Acceptance

- `packages/tokens/vitest.config.ts` sets a 20 000 ms test budget with the
  measured reason recorded beside it.
- Three consecutive full-suite runs are green, and the pre-fix failure is
  recorded in the commit body.
- No source, test, token, theme or document value changes.
- The plan is indexed in `.agents/slop/plans/README.md` and the task is ticked in
  `TODO.md`.

# 529 — Behaviour suites wait for the tree, not a microtask

**Phase:** F · **Owner:** components workstream · **Depends on:** 110, 117, 326,
327, 525.

## 1. Why

Plan 327 removed fixed sleeps from the hover suites. This plan fixes the other
timing assumption the suites still make: **that one `await Promise.resolve()`
after a native interaction means React has committed**. It does not.

Measured on this host, 2026-10-18, by running the whole behaviour suite while
eight CPU burners ran in parallel (the same situation as five other
workstreams' native suites on one box):

```sh
for i in $(seq 1 8); do (yes > /dev/null &); done
./node_modules/.bin/vitest run --config vitest.behaviour.config.ts
```

Result: **1 failed | 707 passed (708)**, the only failure being

```
FAIL src/behaviour/command-menu.test.tsx > CommandMenu >
  keeps recency order and does not duplicate a command
Error: behaviour: no element with testId "command-open-file"
```

and with one more run, also

```
FAIL src/behaviour/command-menu.test.tsx > CommandMenu >
  reports the next list without moving a controlled order
Error: behaviour: no element with testId "command-sidebar"
```

Both tests close the palette, then immediately click the caller's `open-palette`
control and read the reopened list. Two things race:

1. **The exit ghost is still mounted.** The dialog's 100 ms exit runs on the
   test renderer's paused motion clock until `finishMotion` advances it, so the
   closed surface is still painted while the test clicks the control behind it.
   A click can be swallowed by that surface; the palette then stays closed and
   the assertion reads the ghost (which still holds the previous query's rows —
   exactly the observed symptom: `command-save` exists, `command-open-file`
   does not).
2. **One microtask is not a commit.** React can schedule a native-event update
   beyond the microtask that `await Promise.resolve()` drains; under load the
   reopened tree was not measured yet when `requireBounds` ran.

Neither is a component defect: the component's close/reopen behaviour is
correct, and `Dialog`'s exit ghost is deliberately inert (plan 525). The suites
are asserting against a tree that has not settled.

## 2. What changes

### 2.1 `src/internal/interaction.ts` — one shared wait-for-state helper

The polling helpers plan 325 and 327 added locally to two suites are identical.
Hoist them next to the other driving helpers, and document the rule:

```ts
/** Whether the tree currently contains `testId`. */
export const isShown = (root: ComponentTestRoot, testId: string): boolean =>
  root.renderer.findByTestId(testId) !== undefined;

/**
 * Wait until `check` holds, at most `attempts * intervalMs` (~2 s by default).
 * A fixed sleep or a single `await Promise.resolve()` is a coin flip under load:
 * React commits and the native tree update can lag a native event. The
 * assertion that follows is still what fails when the state never arrives.
 */
export const until = async (
  check: () => boolean,
  { attempts = 100, intervalMs = 20 }: { attempts?: number; intervalMs?: number } = {},
): Promise<void> => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
};
```

Extend `finishMotion`'s JSDoc with the second rule: **finish a closing overlay's
exit before interacting with anything behind it**; the ghost is inert but still
painted, and a click aimed through it is a race.

The loop matches the helper already accepted in plans 325/327 (test harness, not
domain code); it is deliberately not Effect — these suites are plain vitest.

### 2.2 `src/behaviour/preview-card.test.tsx` and `navigation-menu.test.tsx`

Delete the local `after`/`until`/`isShown` copies and import `until`/`isShown`
from `../internal/interaction.js`. No assertion, delay or test name changes. The
suites must stay 15 and 21 cases respectively.

### 2.3 `src/behaviour/command-menu.test.tsx` — the two measured races

In `keeps recency order and does not duplicate a command` (currently lines
449–472):

- after the first `simulateKeystrokes("enter")`, call `finishMotion(palette)`
  before `clickCentreOf(palette, "open-palette")`, then
  `await until(() => isShown(palette, "command-open-file"))` instead of
  `await Promise.resolve()`;
- after typing `"save"` and the second `enter`, do the same: finish the exit,
  click, then wait for `command-open-file` (the fresh, unfiltered list).

In `reports the next list without moving a controlled order` (currently lines
502–525):

- after the `command-open-file` click closes the palette and `onRecentChange` is
  asserted, call `finishMotion(palette)` before clicking `open-palette`, then
  `await until(() => isShown(palette, "command-sidebar"))`.

No other command-menu test changes: each either runs with the surface open or
already waits through `finishMotion` (line 434).

### 2.4 `packages/components/README.md`

Update the `src/internal/interaction.ts` row to say it also carries the
wait-for-state helper, and add one line to the two-suite section: a suite that
closes an animated surface **finishes its exit** before driving what is behind
it, and waits for the tree rather than for a microtask.

## 3. Commands and expected results

```sh
# from packages/components
./node_modules/.bin/vitest run --config vitest.behaviour.config.ts \
  src/behaviour/command-menu.test.tsx
# 1 file, 21 tests, exit 0 on a quiet host

nub run --filter @gpuixui/components test:behaviour
# 51 files, 708 tests, exit 0

for i in $(seq 1 8); do (yes > /dev/null &); done
./node_modules/.bin/vitest run --config vitest.behaviour.config.ts
pkill -f '^yes$'
# 51 files, 708 tests, exit 0 under load

nub run --filter @gpuixui/components test   # 40 files, 405 tests
nub run check
nub run lint
nub run test
```

## 4. STOP conditions

- A test starts passing because the wait outlives the assertion target: every
  wait is followed by the original assertion, so a component that never reopens
  still fails. Do not weaken an assertion into a `isShown` check.
- The hoisted helper changes timing in `preview-card` or `navigation-menu` in a
  way that makes their negative assertions vacuous: keep their existing sleeps
  at the plan-327 multiples of the configured delay.
- A command-menu test still fails under load after both changes: stop and record
  the exact `testId` and box state; do not add an unbounded sleep.
- Any non-test component file needs to change to make a suite pass: stop — that
  would be a component defect and needs its own plan.

## 5. Test plan and both-direction proof

1. **Without the fix**: eight burners, `command-menu.test.tsx` five runs →
   at least one failure of `keeps recency order…` (measured 3/5 failing at eight
   burners; 1/1 in the full suite). Record the failure text.
2. **With the fix**: the same load, five runs → 21/21 each time; the full suite
   under the same load → 708/708.
3. **Mutations**, each run at 16 burners and reverted:
   - `finishMotion` advanced to 0 ms (the exit never completes) → 4 of 21 fail
     (`ArrowDown and Enter`, `runs a clicked row`, `closes on Escape`,
     `shows a run command first`), so the exit completion is load-bearing.
   - `until`'s attempt budget set to 0 (it keeps only the immediate check) →
     21/21 in three runs. The measured crash was the exit ghost; `until` is the
     second half of the same rule (a native event's commit is not a microtask)
     and is not by itself reproducible on this host. Recorded rather than
     claimed otherwise.
4. Confirm the total is still 708 behaviour tests and 405 unit tests: this plan
   adds no test, it makes two existing ones deterministic. No example, docs page
   or `COMPONENTS.md` row changes because no component behaviour changes.

## 6. Results (2026-10-18, this host, `0.10.0`)

- The failure was reproduced before the fix: at eight burners, 3 of 5 runs of
  `command-menu.test.tsx` failed `keeps recency order…` with
  `no element with testId "command-open-file"` (and one run also failed
  `reports the next list…` with `command-sidebar`); the full suite under the
  same load reported `1 failed | 707 passed`.
- `until`, `isShown` and the extended `finishMotion` doc live in
  `src/internal/interaction.ts`; `preview-card` and `navigation-menu` import them
  instead of their local copies. `command-menu` finishes the exit before each
  reopen click and waits for the reopened row: 21/21 in five consecutive runs at
  eight burners, 21/21 in three runs at 16 burners, and the full suite
  **708/708** under eight burners.
- The local component behaviour did not change, so `COMPONENTS.md` and the
  inventory are untouched; the two older suites are still 15 and 21 cases.
- `README.md` states the rule for the behaviour suite.

## 7. Acceptance

- The two command-menu reopen tests pass five consecutive runs under eight CPU
  burners, and the whole behaviour suite passes under the same load.
- The shared `until`/`isShown` live only in `src/internal/interaction.ts`; the
  two older suites import them.
- `nub run check`, `nub run lint` and `nub run test` exit 0.
- `TODO.md` and the plan index are updated with the measured counts; the
  component inventory is untouched because no component changed.

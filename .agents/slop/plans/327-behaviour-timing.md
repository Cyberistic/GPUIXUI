# 327 — Behaviour-suite timing robustness under a loaded host

**Phase:** F · **Owner:** components workstream · **Depends on:** 110, 117, 325, 326.

## 1. Why

Plan 326 made a failed behaviour test stop poisoning the next one. This plan
makes the hover suites stop failing **for the wrong reason** when the host is
busy. Both were measured during the same tick, with five other workstreams'
GPUix suites running:

- `navigation-menu.test.tsx` reported `2 failed`, then `17 passed`, then
  `7 failed` across three consecutive runs — a different first failure each
  time (plan 325 §6 records the numbers).
- `preview-card.test.tsx` failed `closes after the pointer leaves both surfaces`
  at `hoverCard` with "no element with testId preview": the card's 20 ms open
  timer had fired but React's commit / the native tree update had not landed
  inside the fixed `after(40)`.
- `date-picker.test.tsx` failed `opens on the selected month and focuses a day`
  with `Test timed out in 5000 ms` after taking 7.6 s under load.

The component behaviour is correct in all three cases. The suites were timing
on wall-clock sleeps and on a default timeout sized for a quiet machine.

## 2. What changes

### 2.1 `src/behaviour/preview-card.test.tsx` — wait for state, not time

Add the same helpers plan 325 introduced in the navigation suite:

```ts
const until = async (check: () => boolean): Promise<void> => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (check()) return;
    await after(20);
  }
};

const isShown = (root, testId) => root.renderer.findByTestId(testId) !== undefined;
```

Positive assertions (`preview` appears / disappears, `onOpenChange` fires) wait
through `until`; the assertion that follows still fails when it never happens.
Negative assertions keep a single sleep, because "it never opened" cannot be
polled. The eight tests, their props (20/20 ms) and their meaning are unchanged.

### 2.2 `vitest.behaviour.config.ts` — a realistic per-test budget

`testTimeout: 20_000` with the measurement above in the comment. The default
5 s cannot hold a native first paint plus five foreign suites on one host.

## 3. Commands

```sh
nub run --filter @gpuixui/components test:behaviour   # 44 files, 460 tests
nub run check
nub run test
```

## 4. STOP conditions

- A poll turns a real regression into a pass: every positive wait is followed by
  the original assertion, so a component that never opens still fails.
- A negative assertion passes only because the state never had time to arrive:
  keep the sleeps at least 7× the configured delay (150 ms vs 20 ms; 120 ms vs
  60 ms).
- Any test's semantics change beyond waiting.

## 5. Both-direction proof

1. Run `preview-card.test.tsx` three times under the same load; all 8 pass each
   time.
2. Delete the card's `onMouseEnter` wiring and show `opens on hover after the
   delay` and `closes after the pointer leaves both surfaces` fail; restore.
3. Confirm the suite count is unchanged at 460.

## 6. Result

Landed 2026-10-18.

- `preview-card.test.tsx` waits through `until(...)` for the card to appear,
  disappear or report `onOpenChange`; the negative checks keep a single 150 ms
  sleep against a 20 ms timer, and the identity case waits 120 ms against 60 ms.
- `vitest.behaviour.config.ts` sets `testTimeout: 20_000` with the measurement in
  the comment. No assertion changed, and the count stays at **460**.
- Measured: `preview-card.test.tsx` passed **8/8 three consecutive times** under
  the same load; `preview-card` + `navigation-menu` + `date-picker` together
  passed **41/41**.
- Both-direction proof: removing the trigger's hover wiring failed **5 of 8**
  (`opens on hover`, `stays open`, `closes after leaving both`, `names the
  surface`, `controlled`) — the waits did not mask the regression. Restoring it
  made 8/8 pass.

## 7. Acceptance

- No behaviour suite fails because a commit landed later than a fixed sleep.
- A real regression in open/close still fails its own test.
- `check`, `test` and the behaviour suite are green with the measured counts.

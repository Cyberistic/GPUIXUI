# 592 — Toast progress: the remaining auto-dismiss time is visible

**Workstream:** components (Tier 2 composition and feedback)
**Phase:** C/F — Tier 2 hardening after the inventory closed
**Depends on:** 115 (Toast), 123/124 (pause/resume), 322 (action), 370
(card as status), 525 (toast motion), 548 (placement), 589 (last components
plan; this is the next free number after checking every worktree, `PLAN.md` D30)

**Files owned:** `packages/components/src/toast/timing.ts` (new),
`packages/components/src/toast/timing.test.ts` (new),
`packages/components/src/toast/store.ts`, `packages/components/src/toast/store.test.ts`,
`packages/components/src/toast/provider.tsx`, `packages/components/src/toast/viewport.tsx`,
`packages/components/src/behaviour/toast.test.tsx`, `packages/components/docs/toast.mdx`,
`COMPONENTS.md` (Toasts row only), `TODO.md` (this workstream only), `PLAN.md`
(D30 paragraph only), this plan, `.agents/slop/plans/README.md` (index row only).

This plan is self-contained. A weaker executor can deliver it by following the
steps in order.

---

## 1. Why

`COMPONENTS.md`, `docs/toast.mdx` and `toastMeta.limitations` all state the same
unfinished contract:

> **No progress indicator** for the remaining time; the store knows the deadline
> but the card does not animate it.

That is a real user-facing gap in a Tier 2 component, not a runtime limitation:
the store already owns a deadline per card (`deadlines`), pauses it
(`paused`), and resumes from the remaining time. The card simply never receives
that information. The fix is to publish the timer state the store already holds,
render a small determinate bar, and let the bar tick locally from the published
remaining time. No new dependency and no change to the auto-dismiss rules.

The bar must pause when the card does. A decorative animation that keeps running
under a hover/focus hold would contradict the documented pause behaviour, so the
bar is driven by the same timing data the store uses, not a second timer.

## 2. Contract (do not re-litigate)

1. **One public timing shape.** `ToastTiming` is
   `{ id, totalMs, remainingMs, paused }`; `remainingMs` is clamped to
   `[0, totalMs]`.
2. **The store owns the clock.** `pause` resolves the deadline into the remaining
   milliseconds; `resume` schedules that remainder. The published timing comes
   from those two values and `Clock.currentTimeMillis`, never from a React
   `Date.now()`.
3. **The card ticks locally between store updates.** The store emits a timing
   when a timer starts, pauses, resumes or is removed. The card decrements its
   copy by 100 ms while the timer runs and stops the interval while paused. It
   never polls the Effect runtime.
4. **A card with no timer has no bar.** A `duration` of zero or infinity keeps the
   toast until dismissal, so there is no total to show and no bar.
5. **The bar is presentational.** It takes no role, no tab stop and no pointer
   events; the card remains the named `role="status"` region.
6. **100 ms is the visual tick, not the dismissal clock.** The store's timer still
   dismisses exactly at the deadline; the bar is allowed to round.

## 3. Exact changes

### 3.1 `packages/components/src/toast/timing.ts` (new)

Pure helpers. No React, no Effect.

```ts
/** The live timing of one auto-dismissing toast. */
export interface ToastTiming {
  readonly id: string;
  /** The duration the card started with, in milliseconds. */
  readonly totalMs: number;
  /** Milliseconds left, clamped to `[0, totalMs]`. */
  readonly remainingMs: number;
  /** True while a hover/focus hold has stopped the clock. */
  readonly paused: boolean;
}

/** How long the card waits between visual ticks. */
export const PROGRESS_TICK_MS = 100;

/** Clamp a remaining value into the timing's own range. */
export const clampRemaining = (totalMs: number, remainingMs: number): number =>
  Math.min(Math.max(0, remainingMs), Math.max(0, totalMs));

/** The bar's width as a whole percentage, 0–100. */
export const progressPercent = (timing: ToastTiming): number =>
  timing.totalMs <= 0
    ? 0
    : Math.round((clampRemaining(timing.totalMs, timing.remainingMs) / timing.totalMs) * 100);

/** One visual tick: a paused timing never moves. */
export const tickTiming = (timing: ToastTiming): ToastTiming =>
  timing.paused
    ? timing
    : {
        ...timing,
        remainingMs: clampRemaining(
          timing.totalMs,
          timing.remainingMs - PROGRESS_TICK_MS,
        ),
      };
```

JSDoc every export. Keep this file under 50 lines.

### 3.2 `packages/components/src/toast/timing.test.ts` (new)

Header comment states the bug: a bar that divides by a zero total or keeps
moving while paused is worse than no bar.

Cases:

1. `progressPercent` is `100` at the start, `50` halfway and `0` at the deadline.
2. A remaining value below 0 or above the total is clamped.
3. A zero total yields `0`, not `NaN`.
4. `tickTiming` subtracts one 100 ms tick while running.
5. `tickTiming` returns the **same object** while paused (so React does not need
   to repaint a paused bar).
6. A final tick stops at `0`.

### 3.3 `packages/components/src/toast/store.ts`

Replace the two separate `deadlines`/`paused` refs with one
`SubscriptionRef` of timer state so the store can publish it:

```ts
interface RunningTimer {
  readonly _tag: "running";
  readonly totalMs: number;
  readonly deadline: number;
}
interface PausedTimer {
  readonly _tag: "paused";
  readonly totalMs: number;
  readonly remainingMs: number;
}
type Timer = RunningTimer | PausedTimer;
```

- `timers` stays the `FiberMap` of live sleeps; the new
  `const clocks = yield* SubscriptionRef.make(HashMap.empty<string, Timer>())`
  holds the observable state.
- `schedule(id, millis)` writes
  `{ _tag: "running", totalMs: millis, deadline: now + millis }` **before**
  starting the fiber, and the fiber's `ensuring` removes the row.
- `forget(id)` removes the fiber and the `clocks` row.
- `pause(id)` turns a running row into
  `{ _tag: "paused", totalMs, remainingMs: max(0, deadline - now) }`, removes the
  fiber, and leaves a missing/paused row alone.
- `resume(id)` turns a paused row back into a running schedule for its remaining
  time; `remainingMs <= 0` drops the toast.
- `dismissAll` clears `clocks` with the other state.

Add to `ToastStoreService`:

```ts
/** The current timer state of every auto-dismissing toast. */
readonly timings: Effect.Effect<ReadonlyArray<ToastTiming>>;
/** `timings`, re-emitted whenever a timer starts, pauses, resumes or ends. */
readonly timingChanges: Stream.Stream<ReadonlyArray<ToastTiming>>;
```

Implement one private `readTimings` that takes the map and the current clock:

```ts
const readTimings = Effect.fnUntraced(function* (
  clocks: HashMap.HashMap<string, Timer>,
) {
  const now = yield* Clock.currentTimeMillis;
  return Arr.map(Arr.fromIterable(HashMap.values(clocks)), ...);
});
```

For a running timer, `remainingMs` is `deadline - now`; for a paused timer it is
the stored remainder. Clamp with `clampRemaining` from `timing.ts` and set
`paused` from the tag. Sort by id as a number so the public array is stable;
ids are `"1"`, `"2"`, … from the same counter. Use `Arr.sort` with
`Order.mapInput(Order.Number, (timing: ToastTiming) => Number(timing.id))`.

`timings` is `SubscriptionRef.get(clocks) |> Effect.flatMap(readTimings)`.
`timingChanges` is `Stream.mapEffect(SubscriptionRef.changes(clocks), readTimings)`.

Do not add a timer, interval or tick to the store: the visual tick belongs to
the card.

### 3.4 `packages/components/src/toast/store.test.ts`

Add cases (use `TestClock`; no real waits):

1. **Publishes the starting total and full remaining time.** Push
   `duration: Duration.seconds(2)`; `yield* store.timings` equals one timing
   `{ totalMs: 2000, remainingMs: 2000, paused: false }` (the id is `"1"`).
2. **Reports the remaining time from the clock.** Adjust 1 s; read `timings`;
   `remainingMs` is `1000`.
3. **Pause freezes the published remainder and resume re-arms it.** Adjust 1 s,
   pause, adjust a minute, read `paused: true` and `remainingMs: 1000`, resume,
   adjust 900 ms, assert `remainingMs` is `100` and the toast still exists.
4. **Removing a toast removes its timing.** Dismiss and assert `timings` is `[]`.
5. **A non-dismissing toast publishes no timing.** Push `Duration.infinity`;
   `timings` is `[]`.

Keep the existing tests unchanged. They prove the dismissal itself still uses the
same deadline.

### 3.5 `packages/components/src/toast/provider.tsx`

- Subscribe to `store.timingChanges` in a second effect, exactly as the queue
  subscription does; keep a `HashMap<string, ToastTiming>` in React state so the
  card can read a timing synchronously.
- Reset the map when the provider runtime is replaced.
- Add `timingFor: (id: string) => Option.Option<ToastTiming>` to `ToastApi`.
- Include it in the memoised API and in its dependency list.

Do not `Effect.run*` here beyond the existing `runtime.runFork` boundary.

### 3.6 `packages/components/src/toast/viewport.tsx`

In `ToastCard`:

- Read `timingFor` from `useToast()` and keep it in an `Option`.
- Keep a local `Option<ToastTiming>` seeded from the published timing. A
  `useEffect` on the published timing resets the local copy and, when it is
  running, sets an interval of `PROGRESS_TICK_MS` that maps `tickTiming` over the
  local value. The effect clears its interval on every timing change and unmount.
- Render `null` when the timing is `None` or `totalMs <= 0`; otherwise render a
  2px track at the bottom of the card:
  - `position: "absolute"`, `left: 0`, `bottom: 0`, `height: 2`, `width: "100%"`.
  - Inside it, a fill with `width: `${progressPercent(timing)}%``,
    `height: "100%"`, `backgroundColor: palette.fg`, `pointerEvents: "none"`.
  - `testId={`toast-${toast.id}-progress`}` on the fill.
  - The card gets `position: "relative"` so the bar anchors to the card; the
    existing `overflow: "hidden"` clips it to the radius.
- Keep the left tone bar and every existing card rule.

The progress bar must not get a `role`, `tabIndex`, `aria-*` or pointer handler.
The card's existing `role="status"` and name stay untouched.

### 3.7 `packages/components/src/behaviour/toast.test.tsx`

Add two native cases:

1. **A short toast paints a shrinking bar that holds while the pointer is on the
   card.** Render the harness with `duration={Duration.millis(900)}`, push, wait
   `settle()`. Read `toast-1-progress`'s `style.width`, wait 300 ms, read again and
   assert the second percentage is lower. Hover the card, capture the width, wait
   300 ms and assert the width is unchanged. Leave the card and wait for the exit
   via `finishExit`, then assert the card is gone.
   Parse the width with a small helper; the value is a `"NN%"` string.
2. **A toast that never auto-dismisses has no bar.** Push `persistent` through a
   new button in the harness (or a dedicated `Harness` prop), settle, and assert
   `findByTestId("toast-1-progress")` is `undefined`.

The first case must fail on `HEAD` because no element with that test id exists.
The second pins the no-total rule.

Do not use `getElementBounds` for the bar: the plan-540 binding reports three box
conventions, and a style width is the authored contract here.

### 3.8 `packages/components/docs/toast.mdx`

- In **Behaviour**, change the progress limitation row into a rule: a toast with
  a positive finite duration paints a 2px bar across the card bottom; it shrinks
  every 100 ms, freezes while the hover/focus hold is active, and resumes with
  the same remainder. A zero/infinite duration draws no bar.
- In **API**, add `timingFor(id)` to the `useToast` return list and
  `ToastTiming` to the exported types (if the type is exported, it must be).
- In **Accessibility and limitations**, remove the "No progress indicator"
  bullet. Keep the no-`aria-live`, no-reduced-motion and no-portal bullets.
- In **Verification**, raise the native count from 18 to 20 and name the two new
  cases.
- Add `timing.ts` to the verification list (6 pure cases).

### 3.9 Inventory, `COMPONENTS.md`, `TODO.md`, `PLAN.md`

- `toastMeta.limitations`: remove the progress bullet; keep the other two.
- `COMPONENTS.md` Toasts row: replace "No progress bar" with the measurable
  contract, raise "18 native behaviour tests" to 20, and add the pure timing
  suite. The inventory test reads the count from the suite, so the number must be
  exact.
- `TODO.md`: add one ticked line under **Tier 2 hardening after the inventory
  closed**:
  `- [x] Toast progress — plan 592: ...`
- `PLAN.md` D30: append `592` as the next components overflow plan (the number is
  free across every worktree; `590`/`591` are taken by tokens and playground).
- `.agents/slop/plans/README.md`: add the `592` row with status `done` at the end
  of the Tier 2 hardening table, after `589`.

## 4. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/components`.

```sh
nub run --filter @gpuixui/components check-types
```

Expected: exit `0`, no output.

```sh
nub run --filter @gpuixui/components test
```

Expected: all unit suites pass. The new `timing.test.ts` is included and the store
suite is green.

```sh
nub run --filter @gpuixui/components test:behaviour
```

Expected: Toast `20/20`; the full suite is `750 passed / 35 failed` on this host,
because the 35 known plan-540 binding failures (34 position, 24 focus, 1 scroll)
are pre-existing. **No new failure may appear.** If the count is not
`750/35`, stop and report which case is new.

```sh
nub run check
nub run lint
nub run test
```

Expected: exit `0` for each. These are the repo gate; they include the inventory,
manifest, exports and check-tests checks.

## 5. Test plan and both-direction proof

1. Write `timing.test.ts` first and run it: pass.
2. Write the store tests and run them against the current store: they must fail
   because `timings` does not exist (a compile error is acceptable for step 1 of
   the proof; the proof is the finished behaviour below).
3. Implement the store timing and make the store suite pass.
4. Add the two native cases before the viewport bar. The shrinking-bar case must
   fail (`findByTestId` returns `undefined`); the no-bar case must pass because
   `persistent` has no timer.
5. Implement the provider and viewport. Both native cases pass.
6. **Mutation proofs** (run each, then revert):
   - Set `progressPercent` to always return `100`: the shrinking case fails.
   - Make `tickTiming` ignore `paused`: the paused width comparison fails.
   - Remove the `totalMs <= 0` guard: the no-bar case fails or renders a zero
     width; if it still does not fail, strengthen the case to assert no element.
   - Remove the `clampRemaining` lower bound: the timing unit case fails.
7. Restore the source, re-run steps 4–6 and the gates.

`scripts/verify-two-directions.sh` uses `jj`, which is not installed (recorded
in `TODO.md`); use the mutations above and report them instead.

## 6. STOP conditions

Stop and report, do not improvise, if:

- `Schema.Duration`/`Duration` cannot produce a finite positive millisecond total
  from `ToastInput.duration` without changing the public boundary type.
- `Stream.mapEffect` or `SubscriptionRef.changes` is unavailable in the pinned
  Effect 4.0.5 — check the installed declaration first.
- The native test cannot read the bar's authored `style.width` (it is missing or
  not a string); do not replace it with a bounds assertion, because plan 540 says
  those boxes are not well-defined.
- The full behaviour suite gains any failure beyond the known 35.
- The `ToastTiming` type cannot be added without making a public export whose
  manifest/docs cannot be held to the package surface.

## 7. Acceptance

- A toast with a positive finite duration paints a bottom bar at 100% that
  shrinks, freezes on hover/focus and resumes.
- A zero/infinite toast paints no bar.
- `store.timings` reports total, remaining and paused at every transition under
  `TestClock`.
- Pure helpers are tested (6 cases), store tests (5 cases) and native tests
  (2 cases) pass.
- `COMPONENTS.md`, `docs/toast.mdx`, `toastMeta`, `TODO.md`, `PLAN.md` and the
  plan index agree with the implementation; no "No progress indicator" claim
  remains.
- The only native failures are the known plan-540 35.

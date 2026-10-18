# Plan 337 — the shipped toast's real timer under a frozen motion clock

| | |
| --- | --- |
| Phase | F (native harness determinism) |
| Depends on | `100`, `110`, `120`, `140`, `183`, `330`, `336` |
| Owner | playground (`apps/playground`, `packages/testing`) |
| Status | **planned** — measure the shipped `ToastViewport`'s timer path, then assert the deterministic half |

## 0. Why this plan exists

Plan `336` moved the frozen-exit assertion in the **local** toast probe
(`toast-lifecycle`) onto a synchronous dismissal, because a real 250 ms JS timer
racing a native paint and `AnimatePresence`'s own re-render is not a
deterministic observation point. It recorded a cross-team risk: if the shipped
`Toast`'s timer can hit the same `AnimatePresence` remount, its exit can be
skipped under load.

`TODO.md` asks the playground to measure that claim against the **shipped**
`ToastProvider`/`ToastViewport` in `tier2-toast` and to assert only what the
frozen clock can prove. This plan is that measurement. It is a hardening plan,
not a new component.

The first, source-level answer is already visible and is the hypothesis to
verify in the runtime:

- `packages/components/src/toast/viewport.tsx:227` renders
  `Arr.map(toasts, (toast) => <ToastCard key={toast.id} toast={toast} />)`;
- the file imports no `motion` and no `AnimatePresence`;
- the store removes an expired toast from the queue
  (`packages/components/src/toast/store.ts`, `schedule` → `dismiss`), and the
  viewport then renders one card fewer in that commit.

So there is **no leaving card to skip** in the shipped component: the timer is a
real JS timer, but its removal is a plain React state update. That is a
different property from the local probe, whose cards are motion-wrapped on
purpose. The measurement must confirm this at runtime and the record must be
corrected if it is true.

## 1. What is being measured

| # | Question | Why it matters |
| - | -------- | -------------- |
| M1 | Does the shipped viewport retain a card while the motion clock is frozen? | A retained card means an exit animation exists and the plan-336 race could apply |
| M2 | Does a frozen motion clock stop the store's real JS timer? | Proves the timer is real time, not motion time |
| M3 | Does the timer remove exactly its own card and leave the survivor painted? | Guards the store's `FiberMap` contract at the consumer path |
| M4 | Does the survivor reflow to the bottom inset without motion time? | Guards the stack layout after a removal |
| M5 | Is the timer path free of the id/readout order flake plan `336` found? | The scenario must name the cards and the count before asserting on a removal |

## 2. Scope

In scope:

- `apps/playground/src/scenarios/tier2-toast.tsx` — the timer block only: freeze
  the motion clock before the short toast is pushed, name the short card before
  its timer can fire, assert the removal at the frozen clock, and assert the
  survivor reflows.
- The records: this plan's result table, `TODO.md` (tick the task and correct
  the cross-team risk row), `COMPONENTS.md` (the toast row), `PLAN.md` (decision
  row), and the plan index.

Out of scope:

- `packages/components` — the shipped toast is read, never edited. If the
  runtime disagrees with the source, the finding is recorded as a component
  defect, not patched here.
- `toast-lifecycle` (the local motion probe, plan `336`) — its contract is
  already correct and stays as the motion evidence.
- The live suite (`smoke:live`) — `live-tier2-toast` already proves the 300 ms
  timer in a real window. This plan is the headless deterministic contract.
- `awaitReadout` — the helper is bounded and is not the timer.

## 3. The change

File: `apps/playground/src/scenarios/tier2-toast.tsx`.

**(a) Give the short timer enough room to be observed before it fires.** The
scenario currently pushes the short toast with `Duration.millis(300)` and then
asserts `count=3` and the card's paint. Under full-suite load the store's
`Effect.sleep(300)` can win that race, which is the same class of failure plan
`336` removed from the local probe. Introduce:

```ts
/**
 * Long enough that the pre-timer assertions are synchronous reads on a loaded
 * host, short enough that the bounded `awaitReadout` is still a real timer.
 */
const SHORT_MS = 600;
```

and use `Duration.millis(SHORT_MS)` in the `toast-push-short` handler. The
assertion is still “a real JS timer dismisses this card”; the duration is not
the measured quantity.

**(b) Freeze the motion clock before the short push, then name both cards.**
Replace the current timer block (from `ctx.host.click("toast-push-short")`
through `the long toasts survived the timer`) with this shape. The two long
toasts (`toast-3`, `toast-4`) are already queued from the stack test and Escape
did not clear them.

```ts
      // The shipped viewport renders the queue directly: no motion wrapper, no
      // exit tween (plan 337 §1). Freeze the motion clock anyway, so the timer
      // is proven to be real JS time and the removal is proven to need no
      // motion frame.
      const frozenAt = ctx.host.pauseMotion();
      ctx.host.click("toast-push-short");
      yield* ctx.expectContains(
        "the short toast joined the stack before its timer",
        read(ctx, "tier2-toast-readout"),
        "count=3",
      );
      yield* ctx.expectSome(
        "the short card is painted before its timer",
        painted(ctx, "toast-5"),
      );

      // A real JS timer, not the motion clock: no fastForwardMotion call here.
      yield* awaitReadout(ctx, "tier2-toast-readout", "count=2");
      yield* ctx.expectContains(
        "the timer removed exactly one card",
        read(ctx, "tier2-toast-readout"),
        "count=2",
      );
      yield* ctx.expectEqual(
        "the shipped viewport keeps no leaving card at the frozen clock",
        Option.isNone(painted(ctx, "toast-5")),
        true,
      );
      const survivor = yield* ctx.expectSome(
        "the long toast survived its sibling's timer",
        painted(ctx, "toast-4"),
      );
      yield* ctx.expectNear(
        "the survivor reflows to the bottom inset without motion time",
        frame.y + frame.height - (survivor.y + survivor.height),
        INSET,
        1,
      );
      // The clock never moved; record that the check above did not depend on it.
      yield* ctx.expectEqual(
        "the timer path never advanced the motion clock",
        ctx.host.fastForwardMotion(0),
        frozenAt,
      );
```

Notes for the executor:

- `pauseMotion()` returns the elapsed motion time. The first
  `fastForwardMotion(0)` below it is a **zero** advance: it dispatches any queued
  frame and returns the same elapsed time. It is the assertion that the block
  never needed motion time; it is not a tween. If `fastForwardMotion(0)` returns
  a different number on this runtime, that is a measured fact — STOP and record
  it, do not loosen the check silently.
- `toast-5` is the next store id after `toast-4`; the existing scenario already
  asserts `toast-3`/`toast-4` by name after two pushes. If the ids differ, the
  new check must fail with the measured readout, never skip.
- The existing later checks (`the short toast dismissed itself`, `the long
  toasts survived the timer`) are replaced by the block above; do not duplicate
  them.
- No check asserts a leaving card is painted. If one is observed (M1), see §6
  STOP 1.

## 4. Commands, with expected results

Run from the worktree root (`/Users/cyberistic/GPUIXUI/workspaces/playground`).

1. `nub run --filter playground test` — vitest green, no native binding needed.
2. `nub run --filter playground build` — testing build, vendor compile and
   `tsc`; exit `0`.
3. `nub apps/playground/dist/smoke/run.js --only tier2-toast` — `1/1`,
   `tier2=verified`, exit `0`; the new checks are listed in the report.
4. `nub apps/playground/dist/smoke/run.js` — `68/68`, exit `0`. The check count
   increases by exactly the checks added in §3 (expected **+4**: short joined,
   short painted, timer removed one, survivor reflow; `expectSome` counts one;
   the zero-advance check adds one more, so confirm the actual number from the
   report and record it — do not invent it).
5. Repeat step 4 twice — green each time.
6. `nub run check`, `nub run lint`, `nub run test` — green.

## 5. Two-direction proofs

Each mutation is a temporary edit, reverted with
`git checkout -- apps/playground/src/scenarios/tier2-toast.tsx` (or from a saved
copy). Never commit a mutation.

| # | Mutation | Expected failure |
| - | -------- | ---------------- |
| M1 | `SHORT_MS = 5000` | `awaitReadout` gives up after two seconds; `the timer removed exactly one card` fails with `count=3` |
| M2 | Drop `ctx.host.click("toast-push-short")` | `the short toast joined the stack before its timer` fails with `count=2` |
| M3 | Change the survivor check to `toast-3` | `the long toast survived its sibling's timer` fails with a missing card |
| M4 | Change the survivor inset expectation to `INSET + 40` | `the survivor reflows …` fails with the measured value |

M1–M4 are all scenario-side and need no component edit. The “retained exit”
mutation would require wrapping the shipped card in `motion.div` in
`packages/components`; that path is outside this workstream. Instead, §1's
source reading is recorded, and §6 STOP 1 is the runtime branch that would
catch it without a mutation.

Record the exact failure text of each mutation in §8.

## 6. STOP conditions

1. **A short card is still painted after `count=2` at the frozen clock.** That
   means the shipped viewport retains a leaving card (an exit animation exists
   that the source reading missed). Do **not** assert the retention as a pass.
   Record the measured bounds and the readout as a component defect in
   `TODO.md`/`COMPONENTS.md`, advance the motion clock to observe the removal,
   and report that plan `336`'s cross-team risk is real for the shipped toast.
2. **The timer never fires with the motion clock frozen.** A GPUI motion pause
   must not stop a JS timer; if it does, that is a runtime fact, not a flake.
   Record it and stop; do not call `fastForwardMotion` to force the timer.
3. **`fastForwardMotion(0)` moves the elapsed clock.** Record the returned
   values; do not change the assertion to accommodate them.
4. The known `@gpuixui/components`/`nub` tsconfig defect (`TODO.md`) breaks the
   vendor build — another workstream's blocker, not this plan.
5. `--only tier2-toast` fails with the change in place and no clear measurement —
   capture the check list and the readout; no sleeps or retries.
6. A mutation does not fail in the documented direction — report it before
   changing an assertion.
7. `check:tests` complains about an assertion — argue the line only if it is a
   guard, and never weaken the check.

## 7. Test plan

The native scenario is the test: a unit test would fake the store and the
renderer and could not observe a real timer, a frozen motion clock or the
painted stack.

| Behaviour | Fails when | Proof |
| --- | --- | --- |
| the short toast is queued and painted before its timer | the push is dropped or the timer fires early | M2 / M1 |
| the timer fires while the motion clock is frozen | the timer is motion-driven or broken | M1 |
| exactly one card is removed | the store dismisses the stack or the wrong id | M1 / M3 |
| the shipped viewport keeps no leaving card at a frozen clock | an exit animation retains it | STOP 1 (measurement) |
| the survivor is painted and reflows to the bottom inset | the stack does not close | M3 / M4 |
| the timer path never advances the motion clock | a `fastForwardMotion` sneaks back in | the zero-advance check |

## 8. Results

Filled after implementation.

| Item | Measured |
| --- | --- |
| source reading | `viewport.tsx:227` maps the queue directly; no `motion`/`AnimatePresence` import |
| suite after | pending |
| check count | pending |
| `--only tier2-toast` | pending |
| full runs after | pending |
| M1–M4 | pending |
| gates | pending |
| residual / component defect | pending |

## 9. Record updates

- `TODO.md`: tick the `tier2-toast` task with the measured count and the source
  finding; correct the cross-team `AnimatePresence` risk row — the shipped
  viewport has no exit animation, so the plan-336 race belongs to the local
  motion probe / a consumer that wraps cards, not to `ToastViewport`.
- `COMPONENTS.md`: in the `Toasts / notifications` row, add that the shipped
  viewport has **no exit animation** (the queue is rendered directly), that a
  timer removal is immediate at a frozen motion clock, and that plan `337`
  guards it.
- `PLAN.md`: add decision **D49** — the shipped toast's timer is a JS timer and
  its removal is a state update with no motion wrapper, so the plan-336
  frozen-exit rule does not apply to it; the playground asserts the removal at
  a frozen clock and the survivor reflow.
- `.agents/slop/plans/README.md`: index plan `337` as **landed** with the
  measured result; `338` is the next free playground number.

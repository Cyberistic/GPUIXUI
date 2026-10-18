# Plan 336 — make the toast frozen-exit assertion deterministic

| | |
| --- | --- |
| Phase | F (native harness stability) |
| Depends on | `100`, `110`, `120`, `140`, `183`, `330`, `333`, `335` |
| Owner | playground (`apps/playground`, `packages/testing`) |
| Status | **landed** — the frozen exit is asserted on a synchronous dismissal and the timer path asserts only timer-observable effects; suite `68/68`, 1785 checks (+4), exit `0`; three mutation proofs (§8) |

## 0. Why this plan exists

`toast-lifecycle` flaked twice in a full run (plan `335` §12; `TODO.md`
opposite the playground block): the check

```
the short toast is still laid out while its exit is frozen: expected true, got false
```

failed after `the short toast's timer fired` and `only the long toast remains
queued` passed. It passed when the scenario ran alone. Plan `333` hardened the
same class once by pausing the motion clock **before** the short toast is pushed;
that was necessary but not sufficient.

This is a **harness determinism** defect. The scenario asserted a motion property
through a path — a real 250 ms JS timer racing a native paint and React's own
`AnimatePresence` re-render — that the probe does not control. The fix separates
the two claims: the frozen exit is asserted on a **synchronous** dismissal, and
the timer path asserts the timer's observable effects (queue, sibling survival,
later removal, reflow). Three checks name the two cards before the timer starts,
so an id shift or a dropped push fails at the push instead of at a card that
never existed.

## 1. What was measured

`apps/playground/node_modules/@gpuix/react/dist/components/index.js` makes the
exit a native motion:

- `MotionDiv` renders the host `div` with `motion: { generation, isExit,
  initial, animate, transition }`;
- on exit, `animate` is the `exit` style (`opacity: 0`) and `isExit` is `true`;
- the child is removed only when `onMotionComplete` arrives for that generation.

`packages/native/src/motion.rs` (the pinned 0.10.0 source, also in
`.agents/slop/scratch/gpuix-build/gpuix/packages/native/src/motion.rs`) decides
when that completion fires:

```rust
// MotionState::new
let from = match description.initial {
    Some(MotionInitial::Style(style)) => style,
    Some(MotionInitial::Disabled(false)) | None => description.animate,
    ...
};
let target = description.animate.with_fallback(from);
needs_settle: description.is_exit || from != target,
```

and `sample(now)` reports `active = from != target && raw < 1.0`. A motion element
whose **first** frame is its exit frame is created with `from == target` (both
`opacity: 0`, because `initial={false}`), so it settles on that frame whatever the
clock says. That is a real runtime property and it is why the probe must paint a
timer-driven card before its timer can fire.

**But that was not the whole story.** Forcing the paint (a `bounds` read) and
asserting it still reproduced the failure in a full run: the checks
`toast-6 is painted`, `toast-7 is painted` and the short card's inset all passed,
then the timer fired and `toast-7` was gone at the frozen clock. So the leaving
card lost its `from`-state another way. The leading explanation is React
re-rendering `AnimatePresence`: the leaving child is re-inserted from
`renderedChildren`, and if a queued `setRenderedChildren(presentChildren)` from
the **previous** exit completion lands around the same commit, the exiting card is
unmounted and remounted. A remounted host element is a fresh motion state whose
first frame is the exit — settle, remove. That is a probe/composition race, not a
missing paint, and it is not something this scenario should assert through.

Two useful facts came out of the diagnosis and are kept:

1. The push, the card's id and the card's paint are now each asserted, in order.
2. The frozen exit is deterministic only when the dismissal is synchronous. The
   click path already removed a card and already moved the clock afterwards; that
   is where the check belongs.

**Action for another workstream:** if the shipped `Toast` timer can hit the same
`AnimatePresence` remount, its exit can be skipped under load. Evidence: this
plan's §8 baseline. Recorded as a cross-team row in `TODO.md`; not fixed here.

## 2. Scope

In scope:

- `apps/playground/src/scenarios/toast.tsx`: assert the queue/id/paint of both
  cards, assert the frozen exit on the synchronous dismissal, and remove it from
  the timer path.
- The record: `PLAN.md` decision row, `COMPONENTS.md` toast note, `TODO.md`,
  the plan index, and this plan's result table.

Out of scope:

- `awaitReadout` and the smoke host. The helper is bounded and fails through the
  following assertion; it is not the cause.
- The shipped `Toast` component. The cross-team risk is recorded, not edited.
- The live suite (`smoke:live`). `live-tier2-toast` is a separate timer path.

## 3. The change (as landed)

File: `apps/playground/src/scenarios/toast.tsx`.

**(a) The synchronous dismissal gains the frozen-exit check** — after the
`toast-dismiss-4` click and the two state checks, before the clock moves:

```ts
      // A click dismissal is synchronous, so the frozen exit is asserted here:
      // the card is still laid out at elapsed 0 and leaves only when the clock
      // moves. A timer-driven exit is not a reliable place for this check — the
      // timer, the clock and AnimatePresence's own re-render can interleave.
      yield* ctx.expectEqual(
        "the dismissed card is still laid out while its exit is frozen",
        Option.isSome(Option.fromNullishOr(ctx.host.bounds("toast-4"))),
        true,
      );
      ctx.host.fastForwardMotion(EXIT_MS);
```

**(b) Both cards are named before the timer starts**, and the short card is
painted before its 250 ms timer can remove it:

```ts
      ctx.host.click("toast-show");
      // Name both cards before the timer starts. The frozen-exit assertion is
      // about id 7, so a push that did not land (or an id that shifted) must
      // fail here, not at an assertion about a card that never existed.
      yield* ctx.expectContains(
        "the long toast is queued before the short one",
        readout(ctx),
        "count=1",
      );
      yield* bounds(ctx, "toast-6");
      // Freeze the motion clock before the short timer starts, then paint the
      // short card: a motion element's first painted frame is the from-style its
      // exit animates out of, so the paint must happen before the 250 ms timer
      // can remove the card.
      ctx.host.pauseMotion();
      ctx.host.click("toast-show-short");
      const shortCard = yield* bounds(ctx, "toast-7");
      yield* ctx.expectNear(
        "the short card owns the bottom inset before its timer runs",
        insets(frame, shortCard).bottom,
        INSET,
        1,
      );
      yield* awaitReadout(ctx, "toast-readout", "dismissed=Short");
```

**(c) The timer path keeps only what a timer proves** — the timer fired, only the
short card left the queue, the long card survived, the card is gone after the
clock moves, and the survivor reflows to the inset. It no longer asserts that the
exiting card is laid out at the frozen clock.

The old first `fastForwardMotion(0)` before `awaitReadout` is gone; the bounds
read is the flush. The later `fastForwardMotion(0)` before the `EXIT_MS + 1` jump
stays: a timer-driven exit needs one dispatched frame before the clock moves.

No other scenario, helper or package changes.

## 4. Commands, with expected results

Run from the worktree root (`/Users/cyberistic/GPUIXUI/workspaces/playground`).

1. `nub run --filter playground test` — vitest green, no native binding needed.
2. `nub run --filter playground build` — testing build, vendor compile, `tsc`;
   exit `0`.
3. `nub apps/playground/dist/smoke/run.js --only toast-lifecycle` — `1/1`,
   `toast=verified`, exit `0`.
4. `nub apps/playground/dist/smoke/run.js` — `68/68`, exit `0`, **1785 checks**
   (1781 + 4: long queued, toast-6 painted, toast-7 painted, short-card inset;
   the frozen-exit check moved from the timer path to the click path).
5. Repeat step 4 three times — green each time.
6. `nub run check`, `nub run lint`, `nub run test` — green.

## 5. Two-direction proof

Each mutation is a temporary edit; run step 3, record the output, restore with
`git checkout -- apps/playground/src/scenarios/toast.tsx` (or from the saved
copy). Never commit a mutation.

**M1 — remove the exit animation.** Delete `exit={{ opacity: 0 }}` from
`ToastCard`'s `motion.div`.

Measured:

```
toast-lifecycle  FAIL   the dismissed card is still laid out while its exit is frozen
  the dismissed card is still laid out while its exit is frozen: expected true, got false
```

**M2 — drop the long push.** Remove `ctx.host.click("toast-show")` from the
timer block.

Measured:

```
toast-lifecycle  FAIL   the long toast is queued before the short one
  the long toast is queued before the short one: expected a string containing "count=1", got "count=0 action=1 behind=0 under=1 dismissed=Toast 4 hover=none"
```

The old code failed at `still laid out` for this situation, because the short card
became id 6. The new check names the real problem at the push.

**M3 — the timer never fires.** Set `SHORT_MS` to `5000`; the bounded
`awaitReadout` gives up after two seconds.

Measured:

```
toast-lifecycle  FAIL   the short toast's timer fired
  the short toast's timer fired: expected a string containing "dismissed=Short", got "count=2 action=1 behind=0 under=1 dismissed=Toast 4 hover=none"
```

`scripts/verify-two-directions.sh` uses `jj`, which is not installed (D1); each
mutation was applied by hand and the exact failure recorded here, then reverted.

## 6. STOP conditions (were observed, none hit)

1. A build failure unrelated to `toast.tsx` (the `@gpuixui/components`
   tsconfig/`nub` defect in `TODO.md`) is another workstream's blocker.
2. `--only toast-lifecycle` failing with the fix in place — capture the check
   list and the readout; no sleeps or retries.
3. A green `--only` run but a full-run failure at another label — a new defect,
   not this plan.
4. A frozen-exit failure with the *synchronous* dismissal — a genuine motion
   defect; stop.
5. A mutation that does not fail in the documented direction — report it before
   changing the assertion.
6. A `check:tests` complaint — argue the line only if the assertion is a guard.

## 7. Test plan

The smoke scenario is the test; a unit test would fake the renderer and could not
observe a motion state or a native paint.

| Behaviour | Fails when | Proof |
| --- | --- | --- |
| the long card is queued before the short one | the push is dropped | M2 |
| each card is painted before the timer | a card is not mounted | `toast-6` / `toast-7 is painted` |
| the short card is at the bottom inset | placement regresses | the new `expectNear` |
| a frozen exit keeps a dismissed card laid out | the exit is absent | M1 |
| the exit removes the card when the clock moves | the tween never settles | the existing check before the reflow |
| a timer dismisses only its own card | the timer is broken | M3 |
| the survivor reflows | the stack does not close | `the survivor reflows to the bottom inset` |

## 8. Results

| Item | Measured |
| --- | --- |
| baseline before the fix | full suite `67/68`: `the short toast is still laid out while its exit is frozen` failed; `--only toast-lifecycle` green. Reproduced again with the paint forced, with `toast-6 is painted`, `toast-7 is painted` and the inset all passing — so the paint alone was not the cause |
| suite after | `68/68`, exit `0` |
| check count | 1781 → **1785** (toast 55 → 59) |
| `--only toast-lifecycle` | green |
| full runs after | three consecutive green runs |
| M1 (no `exit`) | fails at `the dismissed card is still laid out while its exit is frozen` |
| M2 (long push dropped) | fails at `the long toast is queued before the short one`, readout `count=0` |
| M3 (`SHORT_MS = 5000`) | fails at `the short toast's timer fired`, readout `count=2` |
| gates | `nub run check`, `nub run lint`, `nub run test` green (957 tests across the workspace) |
| residual | the timer-path retention failure still reproduced once with the paint forced; recorded as a cross-team risk, not asserted. No frozen-exit failure since the check moved to the synchronous path |

## 9. Record updates

- `TODO.md`: tick the flake task; add the cross-team row for a timer-driven
  `AnimatePresence` exit that can be skipped.
- `COMPONENTS.md`: in the `Toasts / notifications` row, add that the frozen-exit
  behaviour is asserted on a synchronous dismissal and that a timer-driven
  `AnimatePresence` exit is not a reliable assertion point (plan `336`).
- `PLAN.md`: decision row **D48** — a motion element's first painted frame is
  its from-state, and a probe may only assert a frozen exit on a dismissal it
  triggers synchronously; a timer racing a paint and an `AnimatePresence`
  re-render is not a deterministic observation point.
- `.agents/slop/plans/README.md`: the plan row and `337` as the next free number.

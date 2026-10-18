# Plan 336 — make the toast frozen-exit assertion deterministic

| | |
| --- | --- |
| Phase | F (native harness stability) |
| Depends on | `100`, `110`, `120`, `140`, `183`, `330`, `333`, `335` |
| Owner | playground (`apps/playground`, `packages/testing`) |
| Status | **planned** — execute §3–§7, then fill §8 |

## 0. Why this plan exists

`toast-lifecycle` has flaked twice in a full run (plan `335` §12; `TODO.md`
opposite the playground block): the check

```
the short toast is still laid out while its exit is frozen: expected true, got false
```

fails after `the short toast's timer fired` and `only the long toast remains
queued` pass. It passes when the scenario runs alone. Plan `333` hardened the
same class once by pausing the motion clock **before** the short toast is pushed;
that was necessary but not sufficient.

This is a **harness determinism** defect, not a component defect: the probe
asserts something about a card whose first painted frame may already be its exit
frame, and that is a measured runtime property (§1). The fix is to force the
paint before the 250 ms timer can remove the card, and to assert that paint as
a real check. The scenario must fail for a broken exit, never for a slow host.

Reproduced on this host on 2026-10-18 during the full suite, then green with
`--only toast-lifecycle`.

## 1. Mechanism (measured from the pinned runtime source, then confirmed in §5)

`apps/playground/node_modules/@gpuix/react/dist/components/index.js` makes the
exit a native motion:

- `MotionDiv` renders the host `div` with `motion: { generation, isExit,
  initial, animate, transition }`;
- on exit, `animate` is the `exit` style (`opacity: 0`) and `isExit` is `true`;
- the child is removed only when `onMotionComplete` arrives for that
  generation.

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

and `sample(now)` reports `active = from != target && raw < 1.0`.

Consequences:

1. A motion element whose **first** frame is already its exit frame is created
   with `from == target` (both `opacity: 0`, because `initial={false}`), so
   `active` is `false` on that frame and `just_settled` is `true` immediately.
   The frozen clock does not matter: there is nothing to interpolate.
2. That completion is delivered to `MotionDiv`, which calls `safeToRemove`, and
   `AnimatePresence` drops the child at once. `getElementBounds` is then `null`.
3. A card that was painted **before** the exit has `from = opacity 1`,
   `target = opacity 0`, so with a paused clock `active` stays true forever and
   the card stays laid out until `fastForwardMotion` moves the clock.

The probe currently pushes the short toast and then waits up to 2 s for its
250 ms timer. The push's commit is synchronous (`createTestRoot` dispatches every
event inside `flushSync`), but the **paint** only happens when a host verb flushes
the renderer. Under load the timer can remove the card before the first flush, so
the exit's first frame is its first-ever frame and the card is never laid out.
Alone, the flush arrives first, which is why the scenario passes in isolation.

## 2. Scope

In scope:

- `apps/playground/src/scenarios/toast.tsx`: force and assert the short card's
  paint immediately after it is pushed, before the timer can fire.
- The record: `PLAN.md` decision row, `COMPONENTS.md` toast note, `TODO.md`,
  the plan index, and this plan's result table.

Out of scope:

- Changing `awaitReadout` or the smoke host. The helper is already bounded and
  fails through the following assertion; it is not the cause.
- Changing the shipped `Toast` component. This is a probe-ordering defect.
- The live suite (`smoke:live`). Its `live-tier2-toast` timer is deterministic
  and separate; no change is authorised here.

## 3. The change

File: `apps/playground/src/scenarios/toast.tsx`.

Find the auto-dismiss block (currently around lines 584–636):

```ts
      ctx.host.click("toast-show");
      // Pause the motion clock before the short timer can fire: under load the
      // 250 ms timer may beat the first fast-forward, and then the exit is
      // already over by the time the card is asserted.
      ctx.host.pauseMotion();
      ctx.host.click("toast-show-short");
      // Register the exit watcher before the real timer can remove the card.
      ctx.host.fastForwardMotion(0);
      yield* awaitReadout(ctx, "toast-readout", "dismissed=Short");
```

Replace it with:

```ts
      ctx.host.click("toast-show");
      // Freeze the motion clock before the short timer starts, then paint the
      // short card. A motion element whose first frame is its exit has no
      // from-style to animate out of, so it settles on that frame even with the
      // clock frozen; the bounds read is a real flush and registers the card's
      // motion state while it is still present.
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

Everything after that stays as it is, including:

```ts
      yield* ctx.expectEqual(
        "the short toast is still laid out while its exit is frozen",
        Option.isSome(Option.fromNullishOr(ctx.host.bounds("toast-7"))),
        true,
      );
```

`bounds` already records a passing check named `toast-7 is painted`; the new
`expectNear` is a second, independent check. Do not add a `fastForwardMotion(0)`
before `awaitReadout`: the bounds read is the flush, and `awaitReadout` advances
zero on every attempt. The later `fastForwardMotion(0)` before the
`EXIT_MS + 1` jump stays — a timer-driven exit still needs one dispatched frame
before the clock is moved past its start.

No other scenario, helper or package changes.

## 4. Commands, in order, with expected results

Run from the worktree root (`/Users/cyberistic/GPUIXUI/workspaces/playground`).

1. `nub run --filter playground test`
   Expected: vitest green, including `toast-state.test.ts`, `await-readout`'s
   users' pure tests. No native binding is needed.
2. `nub run --filter playground build`
   Expected: `@gpuixui/testing` build, vendor compile, `tsc -p
   tsconfig.build.json`; exit `0`.
3. `nub apps/playground/dist/smoke/run.js --only toast-lifecycle`
   Expected: `1/1 scenarios passed`, `toast=verified`, exit `0`.
4. `nub apps/playground/dist/smoke/run.js`
   Expected: `68/68 scenarios passed`, exit `0`. The toast scenario now has
   **two more checks** than before (the `bounds` check and the inset check), so
   the report's total check count rises by 2 from 1781 to 1783; if the count is
   different, read the report and correct this plan's §8 rather than assuming.
5. Repeat step 4 twice.
   Expected: green both times. A flake in any scenario is a STOP condition (§6).
6. `nub run check`, `nub run lint`, `nub run test` (the AGENTS completion gate).
   Expected: green. If `check:tests` complains about an assertion, argue it in
   the file — do not delete the assertion.

## 5. Two-direction proof (required)

The guard is the frozen-exit assertion. Prove it can fail, then prove the fix
addresses the measured mechanism. Make each mutation as a temporary edit, run,
record the exact output, then restore the file with `git checkout --` (never
commit a mutation).

**M1 — remove the exit animation.** In `ToastCard`, delete
`exit={{ opacity: 0 }}` from the `motion.div`. Run step 3.

Expected: exit `1`, and

```
toast-lifecycle  FAIL  the short toast is still laid out while its exit is frozen
  the short toast is still laid out while its exit is frozen: expected true, got false
```

This is the assertion's own reverse proof: without an exit the card is removed
immediately.

**M2 — reproduce the flake mechanism (the reason this plan exists).** Restore
the file, then temporarily remove the new `bounds` read and the inset check, and
insert `yield* Effect.sleep("300 millis")` between
`ctx.host.click("toast-show-short")` and the next paint (`Effect` is already
imported in the file). Run step 3.

Expected: exit `1` with the same `expected true, got false` message. The sleep
lets the real 250 ms timer remove the card before any flush, so the exit's first
frame is its first frame. Then restore the fix (bounds read before the sleep,
sleep removed) and re-run: green. This proves the fix is the paint ordering, not
luck.

**M3 — the timer path.** Set `SHORT_MS` to `5000`. Run step 3.

Expected: exit `1` at `the short toast's timer fired` (the bounded
`awaitReadout` gives up after two seconds), proving the timer assertions are not
vacuous.

**M4 — the frozen clock is load-bearing.** In the same block, delete the second
`ctx.host.pauseMotion()` (the one before the short push). Run step 3.

Expected: exit `1`; the short card's exit completes on a live clock and the
`still laid out` check fails. If it passes, the clock was still frozen from the
scenario's opening `pauseMotion()`; in that case record that the opening pause is
the load-bearing one instead of inventing a new mutation.

Record all four in §8 with the exact message and the run that produced it.

## 6. STOP conditions

Stop and report, do not improvise, if:

1. `nub run --filter playground build` fails for a reason unrelated to
   `toast.tsx` (for example the `@gpuixui/components` tsconfig/`nub` defect
   recorded in `TODO.md`) — that is another workstream's blocker.
2. Step 3 still fails **with the fix in place**. Capture the full
   `toast-lifecycle` check list and the raw `dismissed`/`count` readout; do not
   add sleeps or retries.
3. `--only toast-lifecycle` is green but the full run fails at a *different*
   check. Report it as a new harness defect with the failing label; do not widen
   this plan.
4. The new `bounds` check passes but `the short toast is still laid out while its
   exit is frozen` fails in the full run. That falsifies §1 — stop, dump
   `getRetainedElementCount()` and the report, and treat it as a runtime motion
   defect.
5. Any mutation in §5 does **not** fail in the documented direction. A check that
   cannot fail is not a test; report the measured behaviour before changing the
   assertion.
6. `nub run check` reports a test-quality violation. Argue the line with
   `// check-tests-ok: <why>` only if the assertion is genuinely a guard;
   otherwise fix the test.

## 7. Test plan

There is no new pure test: the behaviour is the runtime's motion pipeline, and
the smoke scenario **is** the test. That is the correct level — a unit test would
fake the renderer and could not observe a motion state.

The scenario must be able to fail for each behaviour it claims:

| Behaviour | Fails when | Proof |
| --- | --- | --- |
| the short card is painted before its timer | the push is dropped / the card never mounts | the new `bounds` check names `toast-7` |
| the card is at the bottom inset | placement regresses | the new `expectNear` |
| a timer-driven exit is frozen, not instant | the exit has no from-style or the clock is live | the existing `still laid out` check + M1/M4 |
| only the short card is removed | the queue removes the sibling | `the long toast survived its sibling's timer` |
| the exit removes the card later | the card never leaves | `the short toast leaves the layout after its exit` |
| the survivor reflows | the stack does not close the gap | `the survivor reflows to the bottom inset` |

Acceptance is a green full run with the added checks, plus the §5 mutations in
the recorded directions.

## 8. Results (fill after execution)

| Item | Measured |
| --- | --- |
| baseline before the fix | full suite `67/68`, `toast-lifecycle` failed at `the short toast is still laid out while its exit is frozen`; `--only toast-lifecycle` green |
| suite after | pending |
| check count before → after | pending (expect 1781 → 1783) |
| `--only` | pending |
| M1 (no `exit`) | pending |
| M2 (300 ms sleep before the first paint) | pending |
| M3 (`SHORT_MS = 5000`) | pending |
| M4 (no freeze) | pending |
| repeated full runs | pending |
| gates | pending |

## 9. Record updates

- `TODO.md`: tick the flake task opposite the playground block and note the
  mechanism in one clause.
- `COMPONENTS.md`: in the `Toasts / notifications` row, add that a card's first
  painted frame must precede its exit — a timer that removes an unpainted card
  produces no exit to observe (plan `336`).
- `PLAN.md`: decision row **D48** — a motion element's first painted frame is
  its from-state; an exit whose first frame is also its first-ever frame settles
  on that frame regardless of a frozen clock, so a probe must paint a timer-driven
  card before the timer can fire.
- `.agents/slop/plans/README.md`: add the plan row and name `337` as the next
  free playground number.

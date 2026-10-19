# 691 — The runtime suite's focus wait is a fixed sleep, so a late sample fails a green component

**Owner:** `primitives` workstream · **Phase:** F · **Depends on:** 041, 583,
590, 591, 592, 594, 603, 606

## 1. The bug

`packages/primitives/runtime/fixture.tsx` exports

```ts
export const FOCUS_SETTLE_MS = 2 * NATIVE_FOCUS_POLL_MS + 20; // 120 ms
export const settleFocus = (): Promise<void> => sleep(FOCUS_SETTLE_MS);
```

`settleFocus()` is the way every runtime suite waits for the native-focus
tracker (plan `590`) to publish a sample and for React to paint the render that
depends on it. It is a **fixed sleep**, so it is a guess: the tracker polls
every 50 ms, a state update schedules a React render, and the paint lands after
that. Under load the guess can lose.

### Measured evidence (2026-10-19, this host, release-tag build)

Three full `nub run --filter @gpuixui/primitives test:runtime` runs:

| run | result |
| --- | ------ |
| 1 | `3 failed / 818 passed` — `runtime/info-tip.runtime.test.tsx > paints a focus ring on the trigger` (`expected { inset: undefined }` — no shadow had painted) and two more focus-paint cases |
| 2 | `2 failed / 819 passed` — `focus-ring > Input` and `focus-ring > TextArea` (`expected [] to have a length of 1` — zero rings in the frame) |
| 3 | `821 passed` |

The same files pass every time scoped, so the component is fine; the **wait** is
what varies. This contradicts `TODO.md`'s recorded "no focus … flake remains"
(plan `592` §7), which is true of the tracker's *output* and not of a fixed
sleep.

A deterministic probe (a real runtime window, deleted before commit) delayed the
renderer's own report instead of relying on machine load:

```ts
const original = runtime.renderer.getFocusedElementId.bind(runtime.renderer);
const start = Date.now();
Object.defineProperty(runtime.renderer, "getFocusedElementId", {
  configurable: true,
  value: () => (Date.now() - start < 300 ? undefined : original()),
});
runtime.focusNext();
runtime.flush();
await settleFocus();          // 120 ms
// EARLY false
await sleep(400);
// LATE true
```

So a 300 ms-late sample paints no ring at the current wait and paints it later.
The assertion is correct; the synchronization is not.

### What this is not

It is **not** a product bug: the tracker's documented contract is "up to one
tick late" and it delivers. It is also **not** the plan-594 leak (windows are
unmounted) and not an order dependency (the failing cases differ run to run).
The fix belongs in the harness, not in `native-focus.tsx`.

## 2. The fix

**Files to change**

1. `packages/primitives/runtime/fixture.tsx`
   - Add and export:

     ```ts
     /**
      * Wait until the last painted frame satisfies `condition`, or fail.
      *
      * A fixed sleep races the 50 ms focus tracker and React's paint; this
      * polls the frame instead, so a late sample passes and a missing paint
      * still fails, by the `what` it names (plan `691`).
      */
     export const awaitFrame = async (
       condition: () => boolean,
       what: string,
       timeoutMs = 2000,
     ): Promise<void> => { /* 10 ms setTimeout poll; throw on timeout */ };
     ```

   - Keep `settleFocus()` for waits whose assertion does **not** read a paint
     (e.g. a value callback count). Extend its JSDoc: "a paint assertion must
     use `awaitFrame`; this is a floor, not a synchronization primitive."

2. `packages/primitives/runtime/focus-ring.runtime.test.tsx`
   - The 19-case `it.each` matrix: replace
     `await settleFocus(); const rings = ringsOf(runtime); expect(rings).toHaveLength(1)`
     with
     `await awaitFrame(() => ringsOf(runtime).length === 1, `${testCase.name} paints one focus ring`)`
     and keep the existing assertions unchanged.
   - The attached-group inset-ring case: wait for its own predicate
     (`position === "absolute" && borderColor === BUTTON_RING.color`), not a sleep.
   - The ScrollArea/secondary cases in the same file: same rule.

3. `packages/primitives/runtime/info-tip.runtime.test.tsx`
   - "paints a focus ring on the trigger": wait until the trigger's
     `boxShadow` equals `focusRing(testTheme).boxShadow` before the strict
     comparison.

4. `packages/primitives/runtime/focus-loss.runtime.test.tsx`
   - The "none after leaving" half is the same race in the opposite direction: a
     stale ring can still be painted at 120 ms. Wait until the group paints
     **no** ring, then assert. Do not weaken the assertion; the timeout must
     name the control.

5. `packages/primitives/runtime/focus-wait.runtime.test.tsx` **(new)**
   - Two cases proving the helper, not the component:
     - **late sample**: patch `getFocusedElementId` to report nothing for
       300 ms; focus an `Input`; assert the frame has no ring at the old
       120 ms wait (the failing direction), then `await awaitFrame(...)` and
       assert the ring is exactly the recipe ring. Removing the patch changes
       nothing; replacing `awaitFrame` with `settleFocus` fails this case.
     - **never**: patch it to always report nothing; assert
       `awaitFrame(() => ringed(runtime), "the missing ring")` rejects
       within `timeoutMs` and its message names `the missing ring`. This proves
       the helper is not an unconditional green wait.
   - Header comment states the bug guarded, per `src/runtime-hygiene.test.ts`.

6. `packages/primitives/README.md` and `COMPONENTS.md`
   - The file-count guards (`src/docs-counts.test.ts`, plan `588`;
     `src/inventory-count-guard` cases, plan `641`) will require the new runtime
     file count: `58 → 59` files. Update the two current-run passages only; the
     historical "N tests at plan …" sentences stay as history.

7. `.agents/slop/plans/README.md`
   - Index this plan in the primitives table.
8. `TODO.md`
   - Add the task under the primitives workstream and tick it with the measured
     counts.

**No product source changes.** If the fix appears to need one, STOP: the
tracker's contract is documented and the probe shows it is correct.

## 3. Exact commands and expected results

Run from the worktree root.

```sh
# 1. The new regression file: 2 cases, both green.
nub run --filter @gpuixui/primitives test:runtime runtime/focus-wait.runtime.test.tsx
#   expected: Test Files 1 passed, Tests 2 passed

# 2. The three affected suites.
nub run --filter @gpuixui/primitives test:runtime runtime/focus-ring.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/info-tip.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/focus-loss.runtime.test.tsx
#   expected: all files passed

# 3. Full runtime suite twice — the point of the fix is that two consecutive
#    runs are identical and green.
nub run --filter @gpuixui/primitives test:runtime
nub run --filter @gpuixui/primitives test:runtime
#   expected: 59 files passed / 823 tests passed both times, 0 failed

# 4. Offline guarantees (file-count guards, docs, contract).
nub run --filter @gpuixui/primitives test
#   expected: all files passed

# 5. Repo gates.
nub run check
nub run lint
#   expected: exit 0
```

## 4. Test plan — both directions

| Direction | How it is proven |
| --- | --- |
| **The old wait fails** | The late-sample case asserts no ring after the current 120 ms wait, then gets one through `awaitFrame`. Replacing `awaitFrame` with `settleFocus` fails this case by name. The probe in §1 is the manual form of the same measurement. |
| **A missing paint still fails** | The "never" case patches the focused id to stay absent and requires `awaitFrame` to reject; its message names the expected paint. |
| **No component regression** | The matrix's exact-shadow, containment and one-ring assertions are unchanged, and the full suite runs twice. |
| **No assert-the-stub** | The helper is a wait, not an assertion; the cases assert a real frame (a painted shadow, a timeout message), neither of which the test stub supplies. |

## 5. STOP conditions

- `Object.defineProperty(runtime.renderer, "getFocusedElementId", …)` throws or
  the provider stops reading the patched method (it captures the object, not the
  method): stop and report. Do not add a test seam to `native-focus.tsx` for
  this plan.
- `awaitFrame` times out in a normal scoped run: stop and report the control and
  the wait duration rather than raising the timeout silently.
- A full run still fails after the change: capture the failing case name and
  `runtime.a11y()`; **do not** re-baseline the assertion.
- Any test count or documented number changes beyond `58 → 59` files: fix the
  claim, do not edit the guard.

## 6. Acceptance

- [ ] `awaitFrame` exists with the documented poll/timeout and is used by every
      paint assertion in the three measured files.
- [ ] The new file fails without the fix (proven) and passes with it, and its
      "never" case fails if the wait is unconditional.
- [ ] Two consecutive full runtime runs: 59 files, 823 tests, 0 failed.
- [ ] Offline suite, `check` and `lint` green.
- [ ] `README.md` / `COMPONENTS.md` current-run file counts say 59.
- [ ] Plan indexed; `TODO.md` row ticked with the measured evidence.

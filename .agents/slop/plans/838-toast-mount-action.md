# Plan 838 — A toast pushed while its provider mounts keeps its action

| | |
| --- | --- |
| Phase | F (Tier 2 hardening) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 115, 117, 322, 370, 592, 677, 830, 837 |
| Status | planned — measured defect, fix and tests specified below |
| Claimed number | `838` — `837` is this workstream's last plan; `833`–`836` are taken by `tokens-theme` and the `playground` (checked in every worktree on 2026-10-21) |

## 0. Why this plan exists — the measured defect

The provider keeps the UI half of an action (the handler, which cannot cross the
store's schema) in a React state map, and prunes that map from an effect keyed on
the queue. A toast pushed from a component's **mount effect** arrives before the
provider's own effects run, so the prune effect closes over the mount render's
empty queue and runs *after* the push registered the handler — deleting it. The
card then paints its label with **no control**.

Measured in this worktree on 2026-10-21 while probing plan 837, at `HEAD`
`ca819fd3`, with a 12-line fixture (mount-effect push, wait for the card, look for
the control) through the real renderer:

```text
push({ title: "Saved", action: { label: "Undo" } }, { onAction })
→ toast-1 painted, toast-1-action absent
```

The bug is a provider-timing rule, not an action rule: a push from a handler (the
documented path, and every other test) works, and a push from a mount effect — the
shape an app uses to report a restore or a background failure — silently drops
the control.

## 1. The rule

**The handler map is pruned when the queue the store publishes changes, not from a
render-scoped effect.**

- The store's change stream is the only proof a toast is gone: an auto-dismissal
  never calls `dismiss`, so the queue is the authority (the reason the prune
  exists).
- Pruning in the same callback that receives the new queue cannot outrun a
  registration: a handler registered after its own queue delivery survives until a
  *later* queue that omits its id, which is exactly "the toast left".
- The map stays bounded by the queue (≤ `max` entries), so the memory reason for
  the effect is preserved.

## 2. Exact files to change

1. `packages/components/src/toast/provider.tsx` — prune in the change-stream
   subscription; delete the `useEffect(...[toasts])` prune.
2. `packages/components/src/behaviour/toast.test.tsx` — one mount-push case and
   one prune pin.
3. `packages/components/docs/toast.mdx` — the provider paragraph and the native
   test count (28 → 30).
4. `TODO.md` — tick the recorded task under Tier 2 hardening.
5. `.agents/slop/plans/README.md` — the index row for `838`.
6. `PLAN.md` D30 — record `838`.

No other file changes: the viewport reads `actionFor`, the store is untouched, and
`model.ts` (the label) does not change.

## 3. Implementation

### 3.1 `src/toast/provider.tsx`

The change subscription becomes:

```ts
useEffect(() => {
  const fiber = runtime.runFork(
    Effect.flatMap(ToastStore, (store) =>
      Stream.runForEach(store.changes, (next) =>
        Effect.sync(() => {
          setToasts(next);
          // The queue is the only proof a toast left: an auto-dismissal never
          // calls dismiss. Pruning here — where the new queue arrives — cannot
          // outrun a push's registration the way a render-scoped effect could
          // (plan 838).
          const live = HashSet.fromIterable(Arr.map(next, (toast) => toast.id));
          setActions((current) => {
            const pruned = HashMap.filter(current, (_, id) =>
              HashSet.has(live, id),
            );
            return HashMap.size(pruned) === HashMap.size(current)
              ? current
              : pruned;
          });
        }),
      ),
    ),
  );
  return () => {
    runtime.runFork(Fiber.interrupt(fiber));
  };
}, [runtime]);
```

and the `useEffect(...[toasts])` pruner after it is deleted.

### 3.2 Tests

`src/behaviour/toast.test.tsx`:

- **mount push keeps its action**: a provider child pushes once from `useEffect`
  with `onAction`; wait for `toast-1`, then the control `toast-1-action` exists,
  pressing it runs the handler once and dismisses. Fails at `HEAD` with no control.
- **pin: the handler is pruned when its card leaves**: a probe component renders
  whether `actionFor("1")` is `Some` (a `text` with `testId="has-action"`); it
  reads `yes` while the toast is queued, then the card is dismissed and it reads
  `no`. Fails if the prune is removed (the map would keep the handler), and the
  first case fails if the prune goes back to a render-scoped effect.

## 4. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/components/packages/components`.

1. Add both cases, restore the old provider and measure the red:
   `nub x vitest run --config vitest.behaviour.config.ts src/behaviour/toast.test.tsx`
   → **expected:** the mount-push case fails (`no element with testId
   "toast-1-action"`); the prune pin passes. Record the output in §7.
2. Apply §3.1 → Toast **30/30**.
3. **Both directions**, restoring after each:
   - delete the new prune → the prune pin fails (`yes` after dismissal);
   - move the prune back into `useEffect(...[toasts])` → the mount-push case
     fails again.
4. `nub x vitest run` → unit suite unchanged (532 in 49 files).
5. From the repo root: `nub run check`, `nub run lint`, `nub run test` → all exit
   0.
6. Scoped smoke `--only overlay-dialog` and `--only modal-focus-trap` → green
   (no smoke scenario mounts a toast; the `TestRenderer` suite is the native
   evidence).
7. End of task (a shared provider file): the full native suite → the recorded 20
   plan-540 failures, no new one.

**STOP conditions.** Stop and report instead of improvising if:

- the mount-push case passes at `HEAD` — the measurement is wrong; re-run the
  probe before changing anything;
- the prune pin cannot observe `actionFor` transitions (a provider re-render is
  required for the probe to read the new value) — record what it reads and stop;
- moving the prune into the stream makes a dismissal leave a stale handler
  (`actionFor` still `Some` after the queue drops the id) — the stream callback is
  not seeing every removal, and the queue is not the authority the plan claims.

## 5. Test plan — what each case can catch

| Case | Guards |
| --- | --- |
| mount push keeps its action | the render-scoped prune outrunning a registration |
| pin: the handler is pruned with its card | the map staying bounded (no leak per toast) |
| existing toast suite (28) | stacking, timers, holds, focus and press rules |

## 6. Acceptance criteria

- The mount-push case fails at `HEAD` and passes after; the prune pin passes in
  both directions and its mutation (no prune) fails it.
- `check`, `lint`, `test` exit 0; the full native suite keeps only the recorded
  plan-540 failures; unit stays 532 in 49 files.
- `docs/toast.mdx` states the rule and the new count; `TODO.md`, the plan index and
  `PLAN.md` D30 are synced; the probe file is gone.

## 7. Outcome (2026-10-21)

- **Measured at `HEAD` `ca819fd3`** with a 12-line fixture (mount-effect push,
  wait for the card, look for the control): `toast-1` painted, `toast-1-action`
  absent. The prune effect from the mount render ran after the push's
  registration.
- **Red before the fix.** With `src/toast/provider.tsx` reverted and the two new
  cases kept: the mount case fails (`expected undefined to be defined`), Toast
  29/30. The prune pin passes at `HEAD`, which is what makes it a pin.
- **After the fix.** Toast **30/30**.
- **Both directions proven.** Restoring the render-scoped prune fails only the
  mount case. Deleting the new prune fails only the prune pin (`expected [… ] to
  include 'no'` after `dismissAll`), so the bounded map is genuinely pinned.
- **Full native suite.** **1070 passed / 20 failed of 1090** — the 20 recorded
  plan-540 classes, no new failure (the previous run was 1068/20 of 1088; the two
  new cases account for the difference).
- **Gates.** `nub run check`, `nub run lint`, `nub run test` exit 0; unit **532
  tests in 49 files** (unchanged — the fix is proven natively).
- **Scoped smoke.** `overlay-dialog` 1/1 and `modal-focus-trap` 1/1 green; the
  full headless suite is **17/20** with the same three recorded playground
  failures (`focus-traversal`, `floating-placement`, `shell-navigation`).
- Docs (`docs/toast.mdx`), `COMPONENTS.md`, `TODO.md`, the plan index and
  `PLAN.md` D30 synced.

### Deviations from §3

- The prune pin waits with `until(() => !texts.includes("yes"))` rather than a
  fixed settle: the old effect pruned one commit later than the new callback, so a
  fixed wait made the pin fail on the correct old source for timing, not for the
  rule. With the conditional wait the pin passes at `HEAD` as specified and still
  fails when the prune is removed.


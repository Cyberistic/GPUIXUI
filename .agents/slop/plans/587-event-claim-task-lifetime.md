# Plan 587 — The event claim lives one task, so a live window closes one overlay per gesture

| | |
| --- | --- |
| Phase | F (Tier 2 hardening) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 112, 114, 366, 514, 577, 583, playground 558 |
| Status | **landed** — the shared claim now lives one task instead of one microtask; 6 new unit cases, the behaviour harness crosses a task boundary, unit 432, the full native suite 747/35 unchanged |
| Claimed number | first free after `586` (checked every worktree; recorded in `PLAN.md` D30) |

## 0. Why this plan exists

`internal/event-claim.ts` carries "this event was already handled" between the
payload copies the runtime hands each handler (plan 187). It clears the claim in
a **microtask**, on the assumption that one native propagation finishes inside
one microtask.

A live window does not. Playground plan `558` measured it directly:

```text
one Escape, focus on the submenu
  submenu handler   → closes the submenu, claims the event
  (microtask: claim cleared)
  dialog handler    → sees no claim, closes the dialog too
result: parent=0 sub=0 depth=0
```

The headless `TestRenderer` delivers both handlers synchronously, so every
in-package suite is green. The live `live-layers` scenario (41 checks) failed
until its own probe reset the claim with `setTimeout(…, 0)` instead of
`queueMicrotask`; then one Escape closed the submenu and the next closed the
dialog, and one outside press closed one layer.

The measured contract is in plan `558` §9: **field-keyed claim, task-long
lifetime** — not `WeakSet` identity (plan 366) and not a microtask reset.

This affects every user of the shared claim:

- the dismiss stack — a popover, menu, combobox, preview card, navigation panel
  or notification centre inside a dialog closes **both** on one Escape or
  outside press in a real window;
- `menu/surface.tsx` — a key handled by a submenu row (Escape, an arrow) also
  acts on the enclosing menu;
- `hotkey-recorder`, `search-input`, `inline-edit`, `mention-input`, `chat` —
  a field that claims Escape no longer protects the enclosing dialog.

## 1. Exact files to change

1. `packages/components/src/internal/event-claim.ts` — the lifetime.
2. `packages/components/src/internal/event-claim.test.ts` — **new**: the claim's
   lifetime, without a renderer.
3. `packages/components/src/internal/dismiss-layer.test.ts` — one new case for
   the live ordering, and the existing reset case moved to a task boundary.
4. `packages/components/src/behaviour/setup.ts` — the teardown crosses a task,
   so a claim cannot leak from one test into the next.
5. `packages/components/src/behaviour/combobox.test.tsx` — the one test that
   sends two identical outside presses separates them by a task, because a real
   second press is a new task (the same correction playground plan 558 made in
   its headless scenario).
6. `docs/component-api.md` §4 — one clause: the claim lives one task.
7. `packages/components/docs/dialog.mdx` — one sentence in §Dismissal.
8. `COMPONENTS.md` — the Dialogs row gains one clause.
9. `TODO.md`, `PLAN.md` D30, `.agents/slop/plans/README.md`.

Do not change `dismiss-layer.ts` itself, `pointer.ts`, any open/close path, or
the payload fields the claim compares.

## 2. Implementation

### 2.1 `internal/event-claim.ts`

Replace the microtask clear with a task clear, and never let an older claim's
cleanup erase a newer claim:

```ts
/** Mark `event` as handled by the surface it happened in. */
export const claimEvent = (event: EventPayload): void => {
  const claimed: EventClaim = claimOf(event);
  claim = Option.some(claimed);
  // A live window delivers the enclosing handler across a microtask (plan 558),
  // so the claim must outlive the whole task. Clear only this claim: a newer
  // event may already own the slot.
  setTimeout(() => {
    claim = Option.filter(claim, (current) => current !== claimed);
  }, 0);
};
```

Update the module comment: a claim lives **one task**, which is the window in
which one native propagation reaches every handler; a later event — even the
same key at the same coordinates — is a new event and gets its own claim.
`isEventClaimed` stays as it is: it consumes the claim on the first read, so an
enclosing surface can never read it twice.

`setTimeout` is the runtime's event-loop boundary, not a duration; do not use
`Duration`. There is no `Clock` boundary in a React host module, and the value
is deliberately not a component timeout.

### 2.2 `internal/event-claim.test.ts` (new)

Header comment states the bug being guarded: a live window delivers a nested
layer's handler and its parent's across a microtask; a microtask reset let one
Escape close both.

```ts
import type { EventPayload } from "@gpuix/react";
import { describe, expect, it } from "vitest";
import { claimEvent, isEventClaimed } from "./event-claim.js";

const key = (): EventPayload => ({
  elementId: 1,
  eventType: "keyDown",
  key: "escape",
});

/** One task boundary (a real second event is a new task). */
const nextTask = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

describe("event claim", () => {
  it("keeps the claim across a microtask", async () => {
    claimEvent(key());
    // The live ordering plan 558 measured: the parent's copy arrives after a
    // microtask. A microtask reset made it a second, unclaimed event.
    await Promise.resolve();
    expect(isEventClaimed(key())).toBe(true);
  });

  it("lets a new event through after a task", async () => {
    claimEvent(key());
    await nextTask();
    expect(isEventClaimed(key())).toBe(false);
  });

  it("consumes a claim on the first reader", () => {
    claimEvent(key());
    expect(isEventClaimed(key())).toBe(true);
    expect(isEventClaimed(key())).toBe(false);
  });

  it("matches on the event's fields, not the object", () => {
    claimEvent(key());
    expect(isEventClaimed({ ...key() })).toBe(true);
  });

  it("never confuses two events with different fields", () => {
    claimEvent(key());
    expect(isEventClaimed({ ...key(), key: "a" })).toBe(false);
  });
});
```

Expected: the first case **fails** on `HEAD` (`false`), the rest pass; all five
pass after §2.1.

### 2.3 `internal/dismiss-layer.test.ts`

Add the live-ordering case, and move the existing "lets the next event reach the
layer that is now topmost" case to a **task** boundary:

```ts
it("keeps one Escape to one layer across a microtask, as a live window does", async () => {
  const outer = vi.fn();
  const inner = vi.fn();
  const removeOuter = pushDismissLayer(outer);
  const removeInner = pushDismissLayer(inner);

  const first = escape();
  const copy: EventPayload = { ...first };

  expect(dismissTopLayer(first)).toBe(true);
  // Plan 558 measured a live window delivering the enclosing handler across a
  // microtask. The old microtask reset cleared the claim before that copy.
  await Promise.resolve();
  expect(dismissTopLayer(copy)).toBe(false);

  expect(inner).toHaveBeenCalledTimes(1);
  expect(outer).not.toHaveBeenCalled();

  removeInner();
  removeOuter();
});
```

The existing reset case becomes:

```ts
dismissTopLayer(escape());
removeInner();
// A real second Escape is a new task; the claim lives one task (plan 558).
await new Promise((resolve) => setTimeout(resolve, 0));
dismissTopLayer(escape());
```

Update the file header to name the microtask ordering, and give the file an
`afterEach` that awaits a task: the claim is module state, and a test's last
claim must not leak into the next test (the same rule §2.4 applies to every
behaviour suite).

### 2.4 The behaviour harness crosses a task

The claim is module state with a task-long lifetime. A behaviour test's last
gesture can leave its claim behind; with the old sync `afterEach`, the next
test's first gesture could be the same fields in the same task and be deduped.
`src/behaviour/setup.ts` therefore becomes:

```ts
afterEach(async () => {
  unmountComponentRoot();
  // The event claim lives one task (plan 587), so a test's last claim must not
  // leak into the next test — a real next gesture is a new task.
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
});
```

One test deliberately sends **two identical outside presses** in one test:
`combobox.test.tsx`'s "closes one surface per backdrop press inside a dialog"
(the first closes the popup, the second closes the dialog). A real second press
is a new task, so insert `await wait(0)` between them with that comment. This is
the same correction playground plan 558 made to its headless scenario, which had
separated two presses by a microtask and was deduped by the task-long claim.

## 3. Commands and expected results

From `packages/components`:

```sh
nub exec vitest run src/internal/event-claim.test.ts src/internal/dismiss-layer.test.ts
```

Before §2.1: **2 failed** (the microtask case in each file), 10 passed; after:
both files green (5 + 7 cases).

```sh
nub run test            # 43 files, 432 tests, exit 0 (was 42 / 426)
nub run test:behaviour  # 747 passing / 35 known plan-540 failures of 782
cd ../.. && nub run check && nub run lint
```

The native suites cannot distinguish the fix — the `TestRenderer` delivers the
copies synchronously — so no behaviour test is added. The live evidence is
playground plan `558`, which is the reason this change is justified without a
local live run; this host's live runner is owned by the playground workstream.

The first full native run after §2.1, **before** §2.4, reported `42 failed / 740
passed`: seven tests had been passing only because the claim died between their
gestures. Six were cross-test leaks (dialog Escape, search-input Escape,
hotkey-recorder dialog Escape, context-menu focus return, navigation-menu focus
return, popover exit) and disappeared with the setup task boundary; the seventh
(combobox's two identical outside presses) needed the explicit `wait(0)`. All
seven were verified to pass on `HEAD` before the change and to fail with the
long claim alone, so they are harness artefacts, not component regressions.

## 4. Both-direction proof

1. Write §2.2–§2.3 first; run the two unit files on `HEAD`: the microtask case
   and the new dismiss case fail, the other cases pass.
2. Apply §2.1: both files pass; the full unit suite is 432.
3. Revert only the `setTimeout` line to `queueMicrotask`: the same two cases
   fail again.
4. Restore; run the two files once more.
5. Paste the failing and passing runs into the commit body.

`scripts/verify-two-directions.sh` calls `jj` (not installed, D1); do the runs by
hand.

## 5. STOP conditions

- Any unit case other than the two new ones changes verdict: stop and name it
  (the claim is shared by menus and fields, so a real regression is possible).
- A native case fails that is **not** one of the seven harness artefacts named
  in §3: stop and name it. A test whose two identical gestures sit in one task
  is a harness artefact — separate them by a task rather than shortening the
  claim, because plan 558 measured one task as the shortest honest lifetime.
- The new dismiss case passes with `queueMicrotask`: stop — the test does not
  guard the live ordering.
- A pending timer keeps a Node test process alive after the suite: stop and
  record it; `setTimeout(…, 0)` must not need explicit teardown.

## 6. Acceptance

- A claim survives a microtask and is gone after a task.
- One Escape and one outside press close one layer even when the enclosing
  handler arrives a microtask later.
- A newer claim is never erased by an older claim's cleanup.
- Unit suite 43 files / 432 tests, exit `0`; native suite 747 passing / 35
  known plan-540 failures of 782; `nub run check` and `nub run lint` exit `0`.
- `docs/component-api.md`, `packages/components/docs/dialog.mdx`, `COMPONENTS.md`,
  `TODO.md`, `PLAN.md` D30 and the plan index agree.
- One commit: `fix(components): the event claim lives one task (plan 587)`.

## 7. Results

- `internal/event-claim.ts`: `claimEvent` stores the claim and schedules a
  `setTimeout(…, 0)` cleanup that clears **only the claim it created**
  (`Option.filter` on object identity), so a newer event's claim survives an
  older cleanup. The module comment now records the task-long lifetime and plan
  558's live measurement.
- New `internal/event-claim.test.ts`: 5 cases — survives a microtask, gone after
  a task, consumed by one reader, field-matched across payload copies, and
  distinct fields never collide.
- `internal/dismiss-layer.test.ts`: 1 new live-ordering case (two layers, one
  Escape, the copy after a microtask → only the inner closes) and the reset
  case moved to a task boundary; header updated.
- Both-direction proof: on `HEAD` the microtask case reports
  `expected false to be true` and the new dismiss case reports the outer layer
  called once; after the fix both pass; restoring `queueMicrotask` fails both
  again.
- `src/behaviour/setup.ts`: the `afterEach` unmounts and then awaits one task, so
  a claim cannot leak into the next test. `src/behaviour/combobox.test.tsx`'s
  two-press case awaits `wait(0)` between the presses. With the long claim but
  without these two changes the native suite was `42 failed / 740 passed`; the
  seven extra failures were verified to pass on `HEAD` and are the artefacts in
  §3.
- Unit suite: 43 files / 432 tests, exit `0` (was 42 / 426). Native suite:
  747 passing / 35 known plan-540 failures of 782 — the same 35, all
  position/focus/scroll binding defeats; `nub run check` (including format) and
  `nub run lint` exit `0`.
- Docs and inventory synced: `docs/component-api.md` §4, `docs/dialog.mdx`
  §Dismissal, the `COMPONENTS.md` Dialogs row, `TODO.md`, `PLAN.md` D30.

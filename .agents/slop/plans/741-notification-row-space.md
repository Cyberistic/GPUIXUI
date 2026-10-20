# 741 — A notification row activates from Space, like every other button

**Phase:** F (integration and polish, Tier 2 hardening)
**Owner:** `components` workstream (`packages/components`)
**Depends on:** 110, 115, 117, 200, 201, 332, 334, 391, 516, 522, 568, 576, 583,
608, 644
**Number:** `741` is the first free number across every worktree — `739`
belongs to the playground (`promotion-gate-with-shadow-pixels`) and `740` to
primitives (`labelled-selection-controls`); `738` is the previous components
plan (`PLAN.md` D30).

**Status: done** (2026-10-20) — Notification centre 22/22 in the real renderer;
the release case fails at `HEAD` (`0` calls) and the header pin fails with the
ownership gate removed (`onRead("deploy")`); `check`, `lint` and `test` exit `0`
(unit 488 in 46 files).

---

## 1. The defect

A notification row draws as a button and announces as one: `role="button"`,
named `"{title}, unread"` or `"{title}, read"`, and a pointer press requests the
read. `docs/notification-centre.mdx` → **Keyboard** documents `Enter` as the
keyboard read path. `Space` is not documented — and it does nothing.

Measured on this host (2026-10-20) with the real `TestRenderer`, a throwaway
`src/behaviour/probe-space.test.tsx` (deleted before this plan landed) rendered
`NotificationCentre defaultOpen` with one notification and focused
`feed-deploy`, then sent the two halves of a real Space press separately:

| gesture (row `feed-deploy` focused) | `onRead` calls | verdict |
| ----------------------------------- | -------------- | ------- |
| `nativeSimulateKeyDown(row.id, "space")` | `0` | correct (activation is on release) |
| `nativeSimulateKeyUp(row.id, "space")` | `0` | **defect** |
| `nativeSimulateKeyDown(row.id, "enter")` | `1` | works, and the existing suite proves it |

With the panel surface focused instead of the row (`autoFocus` on open), the
same Space pair also produced `0`. `Enter` from either focus produced the read,
so the panel's key gate (`ownsRowKeys`) is sound; only the Space branch is
missing.

Why this matters: this library's activation contract (plan 332, extended in 334)
says a control that draws as a button activates on `Enter` (press) and on
`Space` (**release**), exactly once. The notification centre landed in plan 568,
after plan 334's sweep, so its custom row is one of the few button-shaped parts
that never adopted the rule — a keyboard user who reaches a notification cannot
activate it the way every other button in the library works. The header actions
are the internal `Button`, so they already do.

The row is a `div role="button"` with `tabIndex={-1}`, so the runtime
synthesizes no activation click for it (the same measured fact as plan 736): the
key must be handled by the panel that owns the row keys.

## 2. The rule and the fix

**Rule.** While the panel surface or one of its rows holds focus, `Space` on
release requests a read for the active row, exactly once. `Space` on its press
does nothing. A key that belongs to a header action still belongs to that action
(the existing `ownsRowKeys()` gate decides), so a Space press on `Mark all`
runs mark-all and never reads the active row.

**One activation path.** `readActive()` already exists and is the same call the
`Enter` branch uses; reuse it. `internal/key.ts` already exports
`isSpaceRelease`, the shared predicate every other button-shaped part uses.

### 2.1 `packages/components/src/notification-centre.tsx`

1. Import `isSpaceRelease` next to the existing `isDismiss, isDown, isEnter,
   isUp` import from `./internal/key.js`.
2. In `NotificationCentreContent`, destructure `onKeyUp` from the props (today it
   is silently forwarded through `...rest`; a handler must replace that spread,
   not sit beside a duplicate).
3. Add a second handler beside `handleKeyDown`:

   ```ts
   const handleKeyUp = (event: EventPayload): void => {
     if (!ownsRowKeys()) return;
     if (isSpaceRelease(event)) readActive();
   };
   ```

4. Wire it on the `FloatingLayer`, after the existing `onKeyDown`, in the same
   caller-first order this component uses:

   ```tsx
   onKeyUp={(event: EventPayload) => {
     onKeyUp?.(event);
     handleKeyUp(event);
   }}
   ```

No new prop, no new part, no new state, no public API change. Do **not** claim
the Space event: reading keeps the panel open, and nothing else consumes Space
here (the row read does not close). Do **not** add a handler on the row itself:
the panel is where `Enter` is handled and where `ownsRowKeys()` lives, so a
row-level handler would duplicate the ownership rule.

### 2.2 What must not change

- `Enter` on the active row, the arrow movement, Escape, the dismiss stack, the
  scroll reveal, the read request staying idempotent in the caller, and the
  panel staying open.
- A header action's keys, including `Space` (the internal `Button` handles it on
  release), and the focused-element gate for arrows (`plan 576`).
- A held Space key: repeats arrive as key-down, which this branch ignores, so one
  release is one read.

## 3. Test plan

File: `packages/components/src/behaviour/notification-centre.test.tsx` (real
GPUix renderer; two new `it(` cases; suite 20 → 22).

Both cases use the existing `Centre` harness, `seed`, `background`, `press` and
`focusedTestId` helpers.

1. **`reads the active row with Space, on its release`** — render `Centre` with
   `defaultOpen` and `onRead`. Focus `feed-review` with `renderer.focusElement`
   (or move with `press(root, "down")` from the panel, which the suite already
   proves sets focus). Then:
   - `nativeSimulateKeyDown(rowId, "space")`; assert `onRead` not called;
   - `nativeSimulateKeyUp(rowId, "space")`; assert `onRead` called once with
     `"review"` and `isShown(root, "panel")` still true.

   **Fails at HEAD** on the key-up assertion (`0` calls). The key-down assertion
   is the mutation guard for a key-down implementation.
2. **`a header action owns its Space press`** — render `Centre` with
   `onMarkAllRead` and `onRead`, focus `mark-all` (`nativeSimulateKeystrokes(
   action.id, "space")` sends the pair), assert `onMarkAllRead` called once,
   `onRead` never called, and the panel still open. This is a **pin**: it must
   stay green at HEAD and after, and it proves the `ownsRowKeys()` gate covers
   the new key-up path.

Header comment: append one paragraph naming the defect — *"A notification row is
a button, but only Enter read it; Space on release now does too (plan 741),
because GPUix synthesizes no activation click for a role-bearing div."*

### Both-direction proof

- With the new tests and the old `notification-centre.tsx`: the release case
  fails with `expected "vi.fn()" to be called 1 times, but got 0`; the header pin
  passes.
- With the fix: 22/22 in this file.
- Remove only the `onKeyUp` wiring (keep the handler function) and the release
  case fails alone; remove only the `ownsRowKeys()` guard from `handleKeyUp` and
  the header pin fails because mark-all also reads the row.

## 4. Documentation and inventory sync (all required before "done")

1. `packages/components/docs/notification-centre.mdx`
   - **The read model**: "A row press, or `Enter` on the active row" →
     "A row press, `Enter` or `Space` on the active row". State the release rule
     once: *"`Space` activates on release, the shared button contract; its press
     does nothing."*
   - **Keyboard**: `Enter` → `Enter` / `Space` requests a read; add that a
     header action owns its own keys, including Space.
   - **Verification**: `(20 tests)` → `(22 tests)` and name the Space release
     coverage in the sentence that lists the keyboard paths.
   - Bump the row count in `packages/components/src/inventory.ts` only if
     `notificationCentreMeta` carries a count (it does not today).
2. `COMPONENTS.md` → **Notification centre** row: "a row press or `Enter`" →
   "a row press, `Enter` or `Space` (release)", and the count `20` → `22`.
3. `TODO.md` → under *Tier 2 hardening after the inventory closed*, add the
   ticked row for plan 741 with the measurement, counts and gates.
4. `.agents/slop/plans/README.md` → add the 741 row with its status.
5. `PLAN.md` D30 → append that 739/740 were claimed elsewhere and 741 is this
   plan; the next components overflow plan is 742.

## 5. Commands and expected results

Run from `/Users/cyberistic/GPUIXUI/workspaces/components`.

| Command | Expected |
| ------- | -------- |
| `cd packages/components && nub run test:behaviour notification-centre` | **before**: 20 passed. **after**: 22 passed. Scope with a positional filter; extra args after `nub run --filter … --` are ignored and run the whole suite. |
| `nub run check` | exit 0 (types, unit suite; the inventory/docs count check must agree with 22) |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |
| `nub apps/playground/dist/smoke/run.js --list` | lists ids; check for a notification-centre id before claiming one. The package's `TestRenderer` suite is the native evidence (as plans 715/730/736 recorded). |

Full native suite: **not** required for this change (it is not cross-cutting).
The recorded baseline is 922 passed / 28 failed of 950 — the plan-540 binding
classes. If the full suite is run before merging, expect the same 28 and no new
failure.

## 6. STOP conditions

Stop and report with evidence if any of these happen:

- `FloatingContentProps` does not accept `onKeyUp` (type error) — report it
  instead of casting or reaching into `...rest` twice.
- The key-up read fires **twice** on this host (the runtime also synthesizes a
  click for the row) — record it and stop before adding a guard, because the
  correct fix then differs.
- The header-action pin fails after the change — the `ownsRowKeys()` gate is
  missing or the caller's `onKeyUp` is wired twice; fix the order, and stop if it
  still fails.
- The inventory check reports a docs/count mismatch — recount the `it(` cases,
  do not edit the check.
- Any existing notification-centre case fails — report which, with the measured
  tree, before changing anything else.

## 7. Acceptance

- With the panel surface or a row focused, `Space` on release reads the active
  row once; its press reads nothing; a header action still owns its Space.
- The two new cases fail at `HEAD` for the stated reason and pass after; the
  header pin is green in both directions.
- Docs, `COMPONENTS.md`, `TODO.md`, the plan index and `PLAN.md` D30 are synced;
  the docs' stated count is the suite's real count.
- `nub run check`, `nub run lint` and `nub run test` exit `0`.
- The change is committed on `agent/components` and pushed (never to `master`).

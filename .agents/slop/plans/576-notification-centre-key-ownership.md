# Plan 576 — Notification centre: a header action owns its own keys

| | |
| --- | --- |
| Phase | F (Tier 2 hardening) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 112, 117, 200, 201, 522, 568 |
| Status | **landed** — the header gate is measured (Enter on `mark-all` used to call `onRead("deploy")`; an arrow used to steal focus into the list); 3 native cases, the first two fail without the gate and the third pins the row path. Native suite 714 passing / 55 pre-existing plan-540 failures; check, lint and the unit suite green |
| Claimed number | `573` is taken (`primitives` and `tokens-theme`), `574`/`575` are taken; `576` is the first free number across the worktrees (recorded in `PLAN.md` D30) |

## 0. Why this plan exists

`NotificationCentreContent` handles `ArrowDown`, `ArrowUp` and `Enter` on the
whole anchored panel. GPUix dispatches a key to the focused element **and every
ancestor** (that is why the row keys reach the panel), and `EventPayload` cannot
name the source: `elementId` is the id of the element the handler is registered
on, not the focused target. That was measured for this plan with a temporary
native suite:

- with focus on `NotificationCentreMarkAll`, `nativeSimulateKeystrokes(mark-all,
  "enter")` called `onMarkAllRead` **and** `onRead("deploy")` — the panel ran
  `readActive()` on the same key;
- with focus on `mark-all`, `"down"` moved native focus into the list and moved
  the reading cursor, so a header button lost focus to the first row;
- the panel's `onKeyDown` receives `elementId: 22` (the panel's own id) for all
  three events, so the payload cannot distinguish the header action from a row.

A header action is a control: `Enter` runs it and nothing else. Arrow keys that
move the reading cursor belong to the panel surface and its notification rows.
The panel already has the truth it needs — `renderer.getFocusedElementId()` —
and `rowRefs` holds every row's native instance.

## 1. Exact files to change

1. `packages/components/src/notification-centre.tsx`
2. `packages/components/src/behaviour/notification-centre.test.tsx`
3. `packages/components/docs/notification-centre.mdx`
4. `COMPONENTS.md` (Notification centre row)
5. `.agents/slop/plans/README.md` (index row)
6. `TODO.md` (tick the new task under Tier 2 hardening)
7. `PLAN.md` (D30: next components overflow number)

Do not change the row model, grouping, dismissal, placement, or the example.

## 2. Implementation

### 2.1 `src/notification-centre.tsx`

In `NotificationCentreContent`, read `rowRefs` from the context (it is already
provided; only `trigger`, `moveActive` and `readActive` are destructured today).

Add one predicate next to `handleKeyDown`:

```tsx
/**
 * Whether the panel itself or one of its rows holds focus. A key that bubbles
 * from a header action belongs to that control; `EventPayload.elementId` names
 * the handler's element, not the focused one, so the renderer is asked.
 */
const ownsRowKeys = (): boolean => {
  const focused = renderer?.getFocusedElementId?.();
  if (focused === undefined || focused === null) return false;
  return (
    focused === surface.current?.id ||
    Arr.some(
      Arr.fromIterable(rowRefs.current.values()),
      (row) => row.id === focused,
    )
  );
};
```

`handleKeyDown` keeps `Escape` first (dismissal works from anywhere in the
panel), then returns unless `ownsRowKeys()`:

```tsx
const handleKeyDown = (event: EventPayload): void => {
  if (isDismiss(event)) {
    dismissTopLayer(event);
    return;
  }
  if (!ownsRowKeys()) return;
  if (isDown(event)) {
    moveActive(1);
    return;
  }
  if (isUp(event)) {
    moveActive(-1);
    return;
  }
  if (isEnter(event)) readActive();
};
```

`Arr` is already imported. Do not use `event.elementId`: measured above as the
handler's own element.

### 2.2 `src/behaviour/notification-centre.test.tsx`

Add three cases. The suite's `press` helper sends keys to the panel; these cases
must drive the **focused** control so the bubbling path is real.

```tsx
it("runs a header action without reading the active row", () => {
  const onRead = vi.fn();
  const onMarkAllRead = vi.fn();
  const root = renderComponent(
    <Centre notifications={seed} onRead={onRead} onMarkAllRead={onMarkAllRead} defaultOpen />,
  );
  const action = root.renderer.findByTestId("mark-all");
  if (action === undefined) throw new Error("behaviour: no header action");

  root.renderer.nativeSimulateKeystrokes(action.id, "enter");

  expect(onMarkAllRead).toHaveBeenCalledTimes(1);
  expect(onRead).not.toHaveBeenCalled();
  expect(isShown(root, "panel")).toBe(true);

  root.unmount();
});

it("leaves the reading cursor alone while a header action holds focus", () => {
  const root = renderComponent(<Centre notifications={seed} defaultOpen />);
  const action = root.renderer.findByTestId("mark-all");
  if (action === undefined) throw new Error("behaviour: no header action");

  root.renderer.nativeSimulateKeystrokes(action.id, "down");

  expect(root.renderer.getFocusedElementId?.()).toBe(action.id);
  expect(background(root, "feed-deploy")).toBe(darkTheme.colors.accent);
  expect(background(root, "feed-review")).toBeUndefined();

  root.unmount();
});

it("keeps arrow and Enter working while a row holds focus", () => {
  const onRead = vi.fn();
  const root = renderComponent(
    <Centre notifications={seed} onRead={onRead} defaultOpen />,
  );
  const panel = root.renderer.findByTestId("panel");
  const review = root.renderer.findByTestId("feed-review");
  if (panel === undefined || review === undefined)
    throw new Error("behaviour: the panel or row is missing");

  root.renderer.nativeSimulateKeystrokes(panel.id, "down");
  expect(root.renderer.getFocusedElementId?.()).toBe(review.id);

  root.renderer.simulateKeystrokes("enter");
  expect(onRead).toHaveBeenCalledTimes(1);
  expect(onRead).toHaveBeenCalledWith("review");

  root.unmount();
});
```

The third case is the pin: the focus gate must not break the real user path
(arrow moves native focus to the row, then Enter reads it). It passes on the old
code too, which is expected.

### 2.3 `docs/notification-centre.mdx`

In **Keyboard**, after the arrow sentence, add:

> Arrow keys and `Enter` belong to the panel surface and its rows. While a header
> action holds focus, `Enter` runs that action and the arrows leave the reading
> cursor where it is.

Verification line: `(13 tests)` → `(16 tests)` and add the three cases to the
sentence list.

### 2.4 `COMPONENTS.md`

Notification centre row:

- replace `13 native behaviour tests` with `16 native behaviour tests`;
- after `arrows move the active row over notifications only`, add
  `arrow/Enter ownership is decided by the focused element, so a key that runs a header action never also reads a row`.

### 2.5 Index, `TODO.md`, `PLAN.md`

- `.agents/slop/plans/README.md`: new row `576`, status `done` when landed.
- `TODO.md` → Phase C → "Tier 2 hardening after the inventory closed": add and
  tick the row with the measured bug and the test counts.
- `PLAN.md` D30: record that `573`/`574`/`575` were taken and the next
  components overflow plan is `577`.

## 3. Commands and expected results

From `/Users/cyberistic/GPUIXUI/workspaces/components`:

```sh
nub exec vitest run --config packages/components/vitest.behaviour.config.ts \
  packages/components/src/behaviour/notification-centre.test.tsx
```

Simplest reliable form from inside the package (this is the one to use):

```sh
cd packages/components
nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/notification-centre.test.tsx
```

Expected: **16 passed**. The suite has 13 cases today; three are added and none
depends on bounds or a programmatic focus change clearing a React handler, so the
plan-540 binding defects do not apply.

```sh
cd packages/components && nub run test
```

Expected: unit suite green; `inventory.test.ts` re-checks both stated counts
(`COMPONENTS.md` and the docs page) against the 16 `it(` cases.

```sh
nub run check
nub run lint
```

Expected: both exit `0`.

Full native suite (merge gate, not while iterating):

```sh
nub run --filter @gpuixui/components test:behaviour
```

Expected at `HEAD`: **711 passing / 55 failed** (the recorded plan-540 set).
With this plan: **714 passing / 55 failed**.

## 4. Both-direction proof

1. Keep the three cases; revert only the gate (`if (!ownsRowKeys()) return;`).
2. Run the scoped suite. Case 1 must fail with `onRead` called `"deploy"`; case 2
   must fail on the focus id (`review`, not `mark-all`) and on the moved accent.
   Case 3 passes in both directions (it is the pin).
3. Restore the gate and re-run: all 16 pass.
4. Paste both counts into the commit body.

`scripts/verify-two-directions.sh` calls `jj` (not installed, D1); do the two
runs by hand.

## 5. STOP conditions

- `getFocusedElementId()` reads `null` after `nativeSimulateKeystrokes` on this
  host — stop and report; do **not** fall back to `event.elementId` (measured to
  be the handler's own element).
- `Escape` from a header action stops closing the panel after the change — stop;
  the dismiss branch must stay before the gate.
- Case 3 (the row path) fails — stop and report; do not widen the gate to make
  case 1 pass.
- Any native failure beyond the recorded 55.

## 6. Acceptance

- A key pressed on a header action runs that action only; it never reads a row
  and never moves the reading cursor or native focus.
- Arrow/Enter still work when the panel surface or a row holds focus.
- Three new native cases (16 total), the first two proven to fail without the
  gate; documented counts in `COMPONENTS.md` and the docs page agree.
- Module header, docs, inventory, plan index, `TODO.md` and `PLAN.md` current.
- `nub run check`, `nub run lint` and the unit suite exit `0`; native suite
  `714 passing / 55 known failures`.
- One commit: `fix(components): a notification header action owns its keys (plan 576)`.

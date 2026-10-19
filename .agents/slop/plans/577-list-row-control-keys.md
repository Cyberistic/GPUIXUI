# Plan 577 — List: a control inside a row owns its keys

| | |
| --- | --- |
| Phase | F (Tier 2 hardening) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 111, 117, 130, 134, 332, 339, 394, 510, 576 |
| Status | **landed** — measured: with row `a` active, Enter on a trailing `Button` ran the button **and** `onActivate("a")`; typing in a trailing `<input>` delivered the character *and* moved native focus from the field to row-beta. The list now acts only while a registered row holds focus; the two new cases fail without the gate and pass with it, and the suite's 14 pre-existing plan-540 failures are unchanged. Check, lint and the unit suite green |
| Claimed number | `573`–`575` were taken; `576` is this branch's notification fix; `577` is the first free number across the worktrees (recorded in `PLAN.md` D30) |

## 0. Why this plan exists

`ListItem` has `leading` and `trailing` slots, so a row can carry a control
(docs call out a focusable trailing control in the Row model). The list's key
handler is on the **root**, and GPUix delivers a key to the focused element and
every ancestor. The handler cannot see which element the key came from:
`EventPayload.elementId` is the handler's own element (measured in plan 576),
while `renderer.getFocusedElementId()` names the real target.

Consequences measured for this plan in the real renderer:

- With row `a` active, focusing a `Button` in row `a`'s `trailing` slot and
  pressing `Enter` ran the button **and** the row: `delete` once and
  `onActivate("a")` once. A destructive control inside a row also navigates.
- A trailing `<input>` could not be typed into: after `nativeSimulateKeystrokes`
  with `"b"`, the input received the character (`onChange("b")`) **and** the
  list's type-ahead moved native focus from the field (element `4`) to row-beta
  (element `10`). Every character teleports focus out of the field.
- A pointer click on the trailing control does **not** bubble to the row
  (measured: `delete` ran, `onActivate`/`onValueChange` did not), so the defect
  is keyboard-only.

The row is the list's keyboard surface; a control inside a row owns its keys.
The list must act only while the focused element is one of its registered rows.

## 1. Exact files to change

1. `packages/components/src/list.tsx`
2. `packages/components/src/behaviour/list.test.tsx`
3. `packages/components/docs/list.mdx`
4. `COMPONENTS.md` (Lists / list items row)
5. `.agents/slop/plans/README.md` (index row)
6. `TODO.md` (tick the new task under Tier 2 hardening)
7. `PLAN.md` (D30: next components overflow number)

Do not change selection semantics, type-ahead rules, row registration, the paint
mask store, or the example.

## 2. Implementation

### 2.1 `src/list.tsx`

In the root component `renderer` is already in scope (`useGpuix().renderer`).
`handleKeyDown` currently starts with `if (!focusable) return;`. Add one
predicate and the gate:

```tsx
/**
 * Whether a registered row holds focus. A key that bubbles from a control in a
 * row's leading/trailing slot belongs to that control; the payload names the
 * handler's element, not the focused one, so the renderer is asked.
 */
const ownsRowKeys = (): boolean => {
  const focused = renderer?.getFocusedElementId?.();
  if (focused === undefined || focused === null) return false;
  return Arr.some(rows, (row) => row.nativeId === focused);
};

const handleKeyDown = (event: EventPayload): void => {
  if (!focusable) return;
  if (!ownsRowKeys()) return;
  ...
};
```

Everything else in `handleKeyDown` stays (typed characters, Enter/Space,
select-all, arrows, Home/End). A caller's `onKeyDown` on the list root still runs
because it is composed after `handleKeyDown` in the root's handler.

`rows` already carries each row's `nativeId`; no new context field is needed.
The gate is deliberately deny-by-default when the focus id is unavailable: a
renderer that cannot report focus must not guess and run a row action.

Update the module header with one sentence: a control inside a row owns its keys,
because a bubbled key from a `leading`/`trailing` control is not a row key.

### 2.2 `src/behaviour/list.test.tsx`

Add two cases near the activation suite. Import `Button` from
`../internal/button.js` (the list suite does not import it yet) and reuse
`clickCentreOf`/`focusedTestId` already imported.

```tsx
it("lets a control in a row's trailing slot keep its own Enter", () => {
  const onActivate = vi.fn();
  const onDelete = vi.fn();
  const list = renderComponent(
    <List testId="list" selectionMode="single" onActivate={onActivate}>
      <ListItem
        testId="row-a"
        value="a"
        textValue="Alpha"
        trailing={
          <Button size="sm" testId="row-action" onClick={onDelete}>
            Delete
          </Button>
        }
      >
        <ListItemTitle>Alpha</ListItemTitle>
      </ListItem>
      <ListItem testId="row-b" value="b" textValue="Beta">
        <ListItemTitle>Beta</ListItemTitle>
      </ListItem>
    </List>,
  );

  // Reach the row first: the bug only shows when the list has an active row.
  clickCentreOf(list, "row-a");
  onActivate.mockClear();

  const action = list.renderer.findByTestId("row-action");
  if (action === undefined) throw new Error("behaviour: no row control");
  list.renderer.nativeSimulateKeystrokes(action.id, "enter");

  expect(onDelete).toHaveBeenCalledTimes(1);
  expect(onActivate).not.toHaveBeenCalled();

  list.unmount();
});

it("does not steal focus from a field inside a row", () => {
  const onChange = vi.fn();
  const list = renderComponent(
    <List testId="list" selectionMode="single">
      <ListItem
        testId="row-alpha"
        value="alpha"
        textValue="Alpha"
        trailing={
          <input
            testId="row-field"
            onChange={(event) => onChange(event.value ?? "")}
          />
        }
      >
        <ListItemTitle>Alpha</ListItemTitle>
      </ListItem>
      <ListItem testId="row-beta" value="beta" textValue="Beta">
        <ListItemTitle>Beta</ListItemTitle>
      </ListItem>
    </List>,
  );

  const field = list.renderer.findByTestId("row-field");
  if (field === undefined) throw new Error("behaviour: no row field");

  list.renderer.nativeSimulateKeystrokes(field.id, "b");

  expect(onChange).toHaveBeenCalledWith("b");
  expect(list.renderer.getFocusedElementId?.()).toBe(field.id);

  list.unmount();
});
```

The suite's 50 existing cases are the pin: they send keys with
`simulateKeystrokes` to the focused row and must keep passing (arrows, Enter,
Space, Cmd/Ctrl+A, type-ahead). If the gate is too broad, they fail.

### 2.3 `docs/list.mdx`

- Row model / trailing slot note: a control placed in `leading` or `trailing`
  owns its own keys and clicks; it does not activate the row, and typing in it
  never reaches type-ahead.
- Limitations: keep the "focusable control in a trailing slot is not tracked
  when the row disappears" bullet (still true); remove nothing else.
- Verification: `(50 tests)` → `(52 tests)` and add the two cases to the prose.

### 2.4 `COMPONENTS.md`

Lists / list items row:

- after `a held Enter activates only once`, add
  `a control in a row's leading/trailing slot owns its keys, so Enter runs only that control and typing never triggers type-ahead`;
- replace `50 native behaviour tests` with `52 native behaviour tests`.

### 2.5 Index, `TODO.md`, `PLAN.md`

- `.agents/slop/plans/README.md`: new row `577`, status `done` when landed.
- `TODO.md` → Tier 2 hardening: add and tick the row with the measured
  double-activation and the focus steal.
- `PLAN.md` D30: append `577` and set the next components overflow plan to `578`.

## 3. Commands and expected results

From `packages/components` (the reliable scoped form):

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/list.test.tsx
```

Expected: **38 passed, 14 failed**, and the two new cases must be among the
passes by name. The 14 are the suite's share of the recorded plan-540 binding
failures (focus-driven cases; measured identically at `HEAD` before this
change): `moves real focus…`, `repaints only the rows…`, `selects the active row
from the keyboard`, the Space/Shift+Arrow cases, three `activates…` cases and the
three row-removal focus cases. Do not try to make them pass here — that is the
binding hand-off.

```sh
nub run test
nub run check-types
```

Expected: unit suite green (inventory re-checks both stated counts against 52);
type-check clean.

```sh
nub run check
nub run lint
```

Expected: both exit `0`.

Full native suite (merge gate):

```sh
nub run --filter @gpuixui/components test:behaviour
```

Expected at `HEAD`: **714 passing / 55 failed** (the recorded plan-540 set).
With this plan: **716 passing / 55 failed**.

## 4. Both-direction proof

1. Keep the two cases; revert only `if (!ownsRowKeys()) return;`.
2. Run the scoped suite: case 1 must fail with `onActivate` called `"a"`; case 2
   must fail on the focused id (`row-beta`, not the field) while `onChange` still
   received `"b"`.
3. Restore the gate and re-run: the two cases pass; the suite's 14 pre-existing
   plan-540 failures are unchanged.
4. Paste both counts into the commit body.

`scripts/verify-two-directions.sh` calls `jj` (not installed, D1); do the two
runs by hand.

## 5. STOP conditions

- `getFocusedElementId()` does not report the row after `simulateKeystrokes` on
  this host — stop and report; do not fall back to `event.elementId`.
- Any of the existing 50 cases changes verdict after the gate (the 14 listed
  failures stay failures; the 36 passes stay passes) — stop: the gate is too
  broad. Do not weaken it per test; report which behaviour lost its focus path.
- Case 1 or 2 passes on the old code (it must be able to fail).
- Any native failure beyond the recorded 55.

## 6. Acceptance

- A key pressed in a control inside a row runs that control only: no row
  activation, no type-ahead, no focus move.
- Row keys (arrows, Enter, Space, Home/End, Cmd/Ctrl+A, type-ahead) work exactly
  as before for every existing case.
- Two new native cases (52 total), both proven to fail without the gate.
- Module header, docs, `COMPONENTS.md`, inventory, plan index, `TODO.md` and
  `PLAN.md` agree; the docs line and the row state 52.
- `nub run check`, `nub run lint` and the unit suite exit `0`; native suite
  `716 passing / 55 known failures`.
- One commit: `fix(components): a control inside a list row owns its keys (plan 577)`.

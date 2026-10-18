# 373 — List: a plain list with `onActivate` must be reachable and activatable from the keyboard

**Phase.** F — integration and polish (a shipped Tier 2 component whose documented
keyboard contract cannot be reached).
**Workstream.** components (`packages/components`).
**Depends on.** 110, 111, 117, 130, 134, 332, 338, 339.
**Status.** done 2026-10-18 — 3 native tests (List 42, behaviour 542); the tab
stop and arrow/Enter cases fail on the pre-fix `focusable = selectable`, the
Space pin passes in both directions.

## 1. Why this plan exists

`List` documents `onActivate` for `selectionMode="single"` **and**
`selectionMode="none"` (`docs/list.mdx` §Activation, `COMPONENTS.md`). The
component's own header says "A single or `selectionMode="none"` list may also
pass `onActivate` to run a row action"; the docs' activation table promises
`Enter` on a plain list.

The implementation cannot deliver it:

- `List`'s key handler starts with `if (!selectable) return;`
  (`src/list.tsx`, `handleKeyDown`), so a plain list handles no keys at all;
- `ListItem` renders `tabIndex={selectable ? (isTabbable ? 0 : -1) : undefined}`,
  so a plain row is **not focusable**.

The only path that runs `onActivate` on a plain list is a mouse click. The docs
currently work around it in Limitations: "Keyboard activation needs a selection
mode. With `selectionMode="none"` the rows are not focusable, so only a click can
activate; use `single` when the list must work from the keyboard."

That workaround is avoidable and contradicts the component's purpose: a list of
actions (a recent-files panel, a menu-like command list) should not have to
invent a selection to be usable without a pointer. The same roving-focus
machinery the selectable modes already use applies unchanged — only the
`selectable` guard is in the way.

Measured in this worktree before writing the fix (the failing suite is §3.2):

| Probe on the current code | Result |
| ------------------------- | ------ |
| `role` of `List` / `ListItem` | `list` / `listitem` |
| `tabIndex` on every row | `undefined` |
| arrow key after focusing the first row | focus does not move |
| `Enter` after focusing the first row | `onActivate` is not called |
| click on a row | `onActivate` runs (the only path) |

## 2. What will change

1. `List` gains one derived concept, `focusable = selectable || onActivate !==
   undefined`. A plain activatable list gets the same exactly-one roving tab stop
   as a selectable one; a purely presentational list keeps today's behaviour (no
   tab stop, no keys).
2. The key handler runs for a focusable list. Navigation (arrows, Home/End,
   type-ahead, Ctrl+N/P) is shared; `Enter` runs the row action; `Space` never
   activates a plain row because there is no selection to make. Space still
   selects in single/multiple mode.
3. A plain activatable row paints the pointer/hover affordance it now deserves;
   a purely presentational row does not.
4. Tests, docs, example, inventory record and `COMPONENTS.md` state the real
   contract and the real native-test count.

No public API change: the props and the `selectionMode` union stay exactly as
they are. Only the reachable behaviour changes, in the direction the docs already
promised.

## 3. Exact implementation

### 3.1 `packages/components/src/list.tsx`

**`ListContextValue`** — add the derived flag beside `selectable`:

```ts
interface ListContextValue {
  readonly selectable: boolean;
  /** Rows take one roving tab stop and the shared navigation keys. */
  readonly focusable: boolean;
  readonly dense: boolean;
  // ...
}
```

**`List`** — after `const selectable = selectionMode !== "none";`:

```ts
// A plain list is still operable when it has a row action: it takes the same
// roving tab stop as a selectable list, without any selection state.
const focusable = selectable || onActivate !== undefined;
```

**`handleKeyDown`** — replace the early return and the two activation branches so
the shared navigation runs for both list kinds:

```ts
const handleKeyDown = (event: EventPayload): void => {
  if (!focusable) return;
  const extend = multiple && event.modifiers?.shift === true;
  pipe(
    typedChar(event),
    Option.match({
      onSome: typeahead,
      onNone: () =>
        Match.value(event).pipe(
          Match.when(isEnter, () => {
            // Enter is the row action; a selectable list also selects first.
            if (selectable) selectActive();
            activateActive();
          }),
          // At this point the key is Space: it selects, never activates.
          Match.when(isActivation, () => {
            if (selectable) selectActive();
          }),
          Match.when(isSelectAll, selectEveryRow),
          Match.when(isDown, () => moveBy(1, extend)),
          Match.when(isUp, () => moveBy(-1, extend)),
          Match.when(isFirst, () => jumpTo("first")),
          Match.when(isLast, () => jumpTo("last")),
          Match.orElse(() => undefined),
        ),
    }),
  );
};
```

`selectEveryRow` already returns early unless `multiple`; `selectActive` is only
called when `selectable`. Do not call `select()` in a plain list: it would write
selection state that the mode does not own.

**Context value** — add `focusable` and its dependency:

```ts
const context = useMemo<ListContextValue>(
  () => ({ selectable, focusable, dense, rowMasks, ...actions }),
  [actions, dense, focusable, rowMasks, selectable],
);
```

**`ListItem`** — destructure `focusable` and use it for the tab stop and the
pointer affordance:

```ts
const { selectable, focusable, dense, rowMasks, activate, noteFocus, register } =
  useListContext();
// ...
tabIndex={focusable ? (isTabbable ? 0 : -1) : undefined}
// ...
...(focusable
  ? {
      cursor: "pointer",
      hover: { backgroundColor: theme.colors.accent },
      active: { backgroundColor: theme.colors.active },
    }
  : {}),
```

The role stays `list` / `listitem` for a plain list; `aria-selected` stays absent
there. A plain activatable row is a focusable list item with an action, not a
fake option.

**`listMeta.limitations`** — replace
`"activation is a callback on single/none lists: no href or link role, and a multiple list has no activation"`
with
`"activation is a callback on single/none lists: no href or link role; a plain list without onActivate has no tab stop, and a multiple list has no activation"`
so the record no longer implies the keyboard gap.

**File header / `List` JSDoc** — state that a plain list with `onActivate` takes
the roving tab stop and Enter, and that a purely presentational list does not.

### 3.2 `packages/components/src/behaviour/list.test.tsx`

The suite currently has **39** tests. Add three, for **42**.

**Test 1 — a plain activatable list takes one roving tab stop.**

```tsx
it("gives a plain activatable list one roving tab stop", () => {
  const list = renderComponent(
    <List testId="list" onActivate={() => undefined}>
      <ListItem testId="row-a" value="a">
        <ListItemTitle>Alpha</ListItemTitle>
      </ListItem>
      <ListItem testId="row-b" value="b" disabled>
        <ListItemTitle>Beta</ListItemTitle>
      </ListItem>
      <ListItem testId="row-c" value="c">
        <ListItemTitle>Gamma</ListItemTitle>
      </ListItem>
    </List>,
  );

  expect(list.renderer.findByTestId("list")?.customProps?.role).toBe("list");
  expect(list.renderer.findByTestId("row-a")?.customProps?.role).toBe(
    "listitem",
  );
  expect(tabStop(list)).toEqual(["row-a"]);
  expect(list.renderer.findByTestId("row-a")?.style.cursor).toBe("pointer");

  list.unmount();
});
```

Fails on the old code at `tabStop` (`[]`) and at `cursor` (`undefined`).

**Test 2 — arrows move focus and Enter runs the reached row.**

```tsx
it("activates a plain list's reached row from the keyboard", () => {
  const onActivate = vi.fn();
  const list = renderComponent(
    <List testId="list" onActivate={onActivate}>
      <ListItem testId="row-a" value="a" textValue="Alpha">
        <ListItemTitle>Alpha</ListItemTitle>
      </ListItem>
      <ListItem testId="row-b" value="b" textValue="Beta" disabled>
        <ListItemTitle>Beta</ListItemTitle>
      </ListItem>
      <ListItem testId="row-c" value="c" textValue="Gamma">
        <ListItemTitle>Gamma</ListItemTitle>
      </ListItem>
    </List>,
  );

  list.renderer.focusElement(list.renderer.findByTestId("row-a")?.id ?? -1);
  list.renderer.simulateKeystrokes("down");

  expect(focusedTestId(list)).toEqual(Option.some("row-c"));

  list.renderer.simulateKeystrokes("enter");

  expect(onActivate).toHaveBeenCalledTimes(1);
  expect(onActivate).toHaveBeenCalledWith("c");

  list.unmount();
});
```

Fails on the old code: focus stays on row-a after `down`, and Enter calls
nothing.

**Test 3 — Space never activates a plain row.**

```tsx
it("never activates a plain row on Space", () => {
  const onActivate = vi.fn();
  const list = renderComponent(
    <List testId="list" onActivate={onActivate}>
      <ListItem testId="row-a" value="a">
        <ListItemTitle>Alpha</ListItemTitle>
      </ListItem>
    </List>,
  );

  list.renderer.focusElement(list.renderer.findByTestId("row-a")?.id ?? -1);
  list.renderer.simulateKeystrokes("space");

  expect(onActivate).not.toHaveBeenCalled();

  list.unmount();
});
```

This is a pin, not a regression guard: it passes on the old code because nothing
happens at all. It fails if a later change maps Space to activation in a plain
list, which would break the documented "Space selects only where there is a
selection" contract.

Update the suite header comment to name the new bug it guards: a plain
activatable list whose rows cannot take focus, so its promised Enter activation
is unreachable.

### 3.3 `packages/components/docs/list.mdx`

- Opening paragraph: after "A single or unselectable list can also pass
  `onActivate`…", add "a plain list with `onActivate` takes one roving tab stop
  and runs the focused row on Enter; without it the list is purely
  presentational."
- Modes table: `none` tab stop becomes "none; one roving stop when `onActivate`
  is set" and keyboard "activation keys when `onActivate` is set".
- Add a short `## Keyboard (plain, with onActivate)` table: `↓`/`↑`, `Ctrl+N`/
  `Ctrl+P`, `Home`/`End`, letters, `Enter` runs `onActivate`, `Space` does
  nothing.
- Activation table: `Enter` (`selectionMode="none"` + `onActivate`) → runs
  `onActivate` on the focused row; `Space` → nothing without a selection.
- Limitations: delete "Keyboard activation needs a selection mode…"; replace
  with "A plain list without `onActivate` is presentational: no tab stop and no
  keys, by design."
- Verification: state **42 tests** and name the plain-list tab stop, arrow +
  Enter activation, and the Space pin.

### 3.4 `packages/components/examples/list.example.tsx`

Add a third card, "Quick actions": a `selectionMode`-less `List` with
`onActivate`, three rows (Refresh, Reveal in Finder, Copy path) and a header line
that shows the last action run. It demonstrates the new keyboard path without
adding an example registry entry. Update the file header comment to name the
plain activatable panel and that it is operated with the arrows and Enter.

### 3.5 `COMPONENTS.md`

Lists row: keep `done` / `yes`; add that a plain list with `onActivate` takes one
roving tab stop and Enter (Space does nothing), that a presentational list has no
tab stop, and change "39 native behaviour tests" to "42 native behaviour tests".

### 3.6 Indexes

- `.agents/slop/plans/README.md` — add the `373` row to the components table.
- `TODO.md` — add and tick one task under "Tier 2 hardening after the inventory
  closed (plans 120+)":

  `[x] List: a plain activatable list joins the roving tab stop (arrows + Enter,
  Space does not activate) — plan 373; 3 native tests, both-direction proof`

## 4. Exact commands and expected results

From `packages/components`:

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/list.test.tsx
```

Expected: **List 42/42 green**. With §3.1 reverted, tests 1 and 2 fail (no tab
stop, focus does not move, `onActivate` not called); test 3 passes in both
directions (it is a pin).

```sh
nub run --filter @gpuixui/components check-types
nub run --filter @gpuixui/components test
```

Expected: both exit `0`; the unit count is unchanged except the docs/inventory
check in `src/inventory.test.ts`, which must now read 42.

```sh
nub run --filter @gpuixui/components test:behaviour
nub run check
nub run lint
```

Expected: behaviour **542** (539 + 3), unit 357, `check` and `lint` exit `0`.

## 5. STOP conditions

Stop and report instead of improvising if:

1. `focusElement` on a plain row does not run React's `onFocus`, so the test
   cannot establish an active row. Use the documented harness route (`focusElement`
   then one arrow key) and record the measurement; do not add a production path
   that reads `getFocusedElementId` to compensate (that is plan 367's mechanism
   for Tabs, not a reason to widen this patch).
2. Making a plain list focusable changes a role, an `aria-*` attribute or the
   tab-stop count of a **selectable** list. The change must be additive; revert and
   re-measure.
3. A plain list without `onActivate` gains a tab stop or a hover/cursor
   affordance. That is a regression of the existing "presents rows without
   selection or a tab stop" test.
4. A docs/inventory count check fails in a file outside §3. Record it in
   `TODO.md` instead of editing another workstream's file.

## 6. Acceptance

- A plain list with `onActivate` has exactly one roving tab stop, arrows/Home/
  End/type-ahead move focus, Enter runs the reached row, and Space never
  activates.
- A plain list without `onActivate` is unchanged: no tab stop, no keys, no
  pointer affordance.
- Tests 1–2 fail on the pre-fix code and pass after it (both directions run and
  recorded in §7).
- Docs, example, inventory record and `COMPONENTS.md` state the real contract
  and the real count (42).
- Plan indexed and the `TODO.md` task ticked.

## 7. Result

Executed on this host, 2026-10-18.

- `src/behaviour/list.test.tsx`: **42/42 green**.
- Both directions: with `const focusable = selectable;` (the pre-fix behaviour
  behind one derived flag), **2 failed / 40 passed** — the tab-stop test received
  `[]` instead of `["row-a"]` and a `cursor` of `undefined`, and the arrow/Enter
  test stayed focused on `row-a` so `onActivate` was never called. With the fix,
  **42/42**. The Space pin passes in both directions by design.
- Full behaviour suite: **542 passed** (was 539; +3 cases) across 47 files; unit
  **357 passed**; `check-types`, `check` and `lint` exit `0`.
- Docs, example, inventory record and `COMPONENTS.md` now state the plain-list
  keyboard contract and the real count (42).
- No public API change; a plain list without `onActivate` keeps its existing
  no-tab-stop/no-keys test unchanged.

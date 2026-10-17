# 134 — List row activation (`onActivate`)

- **Phase:** C/F (Tier 2 hardening)
- **Workstream:** components · **Owns:** `packages/components/**`, `COMPONENTS.md`
- **Depends on:** 111 (List), 117 (inventory gate), 120/125/130 (selection and
  keyboard hardening)
- **Status:** in progress, 2026-10-17.

`List` can select a row but a row cannot **do** anything. A file list is the
obvious case: selecting a file is not opening it, and today the consumer has no
row-level action to bind. `onValueChange` fires on selection changes, so a
consumer can approximate "open on click" by opening in `onValueChange`, but that
also opens on arrow-key selection, on `Cmd+A`, on Shift ranges and after a
controlled reset — the wrong contract.

This plan adds one prop, `onActivate`, with desktop conventions:

- **single selection:** `Enter` selects the active row and activates it;
  a double click selects and activates; a single click only selects.
- **no selection:** a click activates immediately (there is nothing to select).
- **multiple selection:** activation is not offered. Rows are checkboxes; a
  double click already toggles twice, so running an action there would be a
  surprise. The prop is not in the multiple variant's type, so the compiler
  rejects it instead of the runtime ignoring it.

The prop is on the two variants that can honestly support it, so no mode
silently drops it.

---

## 1. Files

```
packages/components/src/list.tsx                    # prop split + activation paths
packages/components/src/internal/key.ts             # isEnter predicate
packages/components/src/behaviour/list.test.tsx     # +6 native tests
packages/components/examples/list.example.tsx       # open a recent file
packages/components/docs/list.mdx                   # Activation section + API
packages/components/README.md                       # the List row
COMPONENTS.md                                       # Lists / list items row
packages/components/src/inventory.ts                # listMeta limitation
TODO.md                                             # the hardening task
.agents/slop/plans/README.md                        # index this plan
```

Read `src/internal/key.ts`, the `ListProps` union, `activate`, `selectActive` and
`handleKeyDown` in `src/list.tsx`, and the click helpers in
`src/behaviour/list.test.tsx` before editing.

## 2. Design decisions (do not re-litigate)

1. **Activation is an action, selection is state.** `onActivate(value)` runs an
   app action; it never changes the selection itself. In single mode the existing
   `Enter`/click selection still happens first, so the callback runs on the row
   the user just selected.
2. **`Enter` is the keyboard action, not `Space`.** `Space` keeps its selection
   role in both modes (and is the toggle in multiple mode). A new `isEnter`
   predicate keeps that distinction in `internal/key.ts` rather than inline.
3. **A double click activates in single mode; a single click does not.** The
   first click selects (already the contract), the second (`clickCount === 2`)
   activates. `commit` ignores a repeated same-value selection, so the second
   click reports nothing new.
4. **A click activates in `selectionMode="none"`.** With no selection to make,
   the click is the action. Keyboard activation there is unavailable because
   rows are not focusable; the docs say to use `single` when rows need keys.
5. **Multiple mode has no `onActivate` at the type level.** Split `ListProps` into
   a shared `ListBaseProps`, an `Activatable` member used by `none` and
   `single`, and a plain `multiple` member. `onActivate` lives on `Activatable`.
6. **Disabled rows never activate.** The path goes through the existing
   `enabledRow` lookup, which already filters disabled rows.
7. **No per-row `onActivate`.** The list is value-based; a consumer switches on
   the value. A per-row callback would duplicate the row registry's `value` and
   make activation unpredictable after reordering.
8. **No link/href semantics.** GPUix host elements have no anchor role in
   0.10.0 and this package has no navigation service; `onActivate` is a
   callback, and the docs say so.

## 3. `src/internal/key.ts`

Append:

```ts
/** Enter alone: activation. Space is a selection key, not an activation key. */
export const isEnter = (event: EventPayload): boolean => event.key === "enter";
```

## 4. `src/list.tsx`

### 4a. Prop types

```ts
/** The props shared by every selection mode. */
interface ListBaseProps extends Props {
  /** Row height `rowHeight` instead of `rowHeight + spacing.md`. */
  readonly dense?: boolean;
}

/** Modes that can run a row action. */
interface Activatable {
  /**
   * Run the row's action: `Enter` on the active row, a double click in single
   * mode, or a click with no selection mode. Disabled rows never activate.
   */
  readonly onActivate?: (value: string) => void;
}

export type ListProps =
  | (ListBaseProps & Activatable & {
      readonly selectionMode?: "none";
      readonly value?: never;
      readonly defaultValue?: never;
      readonly onValueChange?: never;
    })
  | (ListBaseProps & Activatable & {
      readonly selectionMode: "single";
      readonly value?: string;
      readonly defaultValue?: string;
      readonly onValueChange?: (value: string) => void;
    })
  | (ListBaseProps & {
      readonly selectionMode: "multiple";
      readonly value?: ReadonlyArray<string>;
      readonly defaultValue?: ReadonlyArray<string>;
      readonly onValueChange?: (values: ReadonlyArray<string>) => void;
    });
```

Update the `List` JSDoc with one sentence: a single or unselectable list may pass
`onActivate` to run a row action; multiple lists are toggles and have no
activation.

### 4b. Reading the prop safely

After the destructure:

```ts
const onActivate = "onActivate" in props ? props.onActivate : undefined;
```

`in` narrows the union without a cast. Do not add `onActivate` to the
destructure: the multiple member has no such property.

### 4c. Activation helper

Next to `select`:

```ts
/** Run the active row's action; disabled or missing rows do nothing. */
const activateActive = useCallback(() => {
  pipe(
    Option.flatMap(active, enabledRow),
    Option.match({
      onNone: () => undefined,
      onSome: (row) => onActivate?.(row.value),
    }),
  );
}, [active, enabledRow, onActivate]);
```

`active` is an `Option<string>`; `enabledRow` takes the value and returns the
enabled `Row`. `Option.flatMap` handles both.

### 4d. Keyboard

Add `isEnter` to the existing key import. In `handleKeyDown`, before the current
`Match.when(isActivation, selectActive)`:

```ts
Match.when(isEnter, () => {
  if (selectable) selectActive();
  activateActive();
}),
Match.when(isActivation, selectActive),
```

`isEnter` is checked first because `isActivation` also matches Enter. With no
`onActivate`, `activateActive` is a no-op, so the previous behaviour is exactly
preserved. In multiple mode `onActivate` is `undefined`, so Enter still only
toggles.

### 4e. Click

In `activate` (the click handler), after `focusRow(row)`:

```ts
if (!selectable) {
  onActivate?.(row.value);
  return;
}
```

and after the selection branch has run, at the end of the `onSome` body:

```ts
if (!multiple && event.clickCount === 2) onActivate?.(row.value);
```

The early `!selectable` return replaces the current `if (!selectable) return;`.
Do not activate before `focusRow`: focus is part of every click.

## 5. Tests — `src/behaviour/list.test.tsx` (+6)

Extend the header comment: *Enter that selected but ran nothing; a single click
that opened a row; a double click that opened nothing; an action that ran for a
disabled row; an arrow move that activated the wrong row; and an activation
offered on a multiple-selection list.*

The wrapper fixtures are local to each test:

```tsx
const openable = (onActivate?: (value: string) => void) => (
  <List testId="list" selectionMode="single" defaultValue="a" onActivate={onActivate}>
    <ListItem testId="row-a" value="a"><ListItemTitle>Alpha</ListItemTitle></ListItem>
    <ListItem testId="row-b" value="b" disabled><ListItemTitle>Beta</ListItemTitle></ListItem>
    <ListItem testId="row-c" value="c"><ListItemTitle>Gamma</ListItemTitle></ListItem>
  </List>
);
```

1. **Enter selects the active row and activates it once.** Focus `row-a`
   (`renderer.focusElement`), press `enter`: `onValueChange` gets `["a"]` (or no
   value change when already selected — assert the spy call count truthfully)
   and `onActivate` gets `["a"]` exactly once.
2. **Space selects but does not activate.** Press `space` on `row-c`: the
   selection reports `["c"]`, `onActivate` is not called.
3. **A single click selects only; a double click activates.** Click `row-c`
   once: `onValueChange` `["c"]`, `onActivate` not called. Then click again
   through the renderer's double-click route (`nativeSimulateClick` with
   `clickCount` — use the same helper shape as the existing click tests; if the
   helper cannot express a double click, STOP and report): `onActivate` gets
   `["c"]`.
4. **A click activates in `selectionMode="none"`.** Render a three-row list with
   no selection mode and `onActivate`; click `row-a`: the action runs with
   `["a"]` and no `onValueChange` exists.
5. **A disabled row never activates.** Click `row-b` and press `enter` after
   focusing it: `onActivate` never runs (focus it through the renderer; a
   disabled row is not tabbable, so `renderer.focusElement` is the honest way to
   prove the guard).
6. **Activation follows arrow-key movement.** Focus `row-a`, press `down` (to
   `row-c`, skipping `row-b`), then `enter`: `onActivate` gets `["c"]`.

Expected: the List suite 30 → 36; behaviour 263 → 269.

### 5b. Both directions

1. Green first.
2. Remove the `isEnter` branch from `handleKeyDown` → test 1 fails with
   `onActivate` never called.
3. Remove the `event.clickCount === 2` guard (activate on every click) → test 3
   fails on the first, single click.
4. Remove the `!selectable` early return → test 4 fails.
5. Remove the `enabledRow` filter from `activateActive` → test 5 fails on the
   disabled row. Restore and record all red lines in §9.

## 6. Docs, example, inventory, ledgers

- `docs/list.mdx`:
  - intro: a single or unselectable list can run a row action;
  - a new **Activation** section with the `onActivate` example, the single vs
    double click rule, the none-mode click rule and the multiple-mode
    exclusion;
  - keyboard tables: `Enter` becomes "select the focused row and activate it"
    in single mode; `Space` stays selection-only; add a note to the multiple
    table that activation is not available;
  - API table: add `onActivate` with its type and note it is not in the
    multiple variant;
  - limitations: no href/link semantics; keyboard activation needs a selection
    mode (use `single`); a double click in a multiple list toggles twice and
    does not activate;
  - verification: 30 → 36 native tests.
- `examples/list.example.tsx`: add an `opened` state, pass
  `onActivate={(value) => setOpened(...)}` to the recent-files list, and show
  the last opened file in its `CardDescription`. Keep the reviewers list
  unchanged (it cannot take the prop).
- `src/inventory.ts` → `listMeta.limitations`: add "activation is a callback on
  single/none lists; no href/link semantics; a multiple list has no activation".
- `COMPONENTS.md` → Lists / list items row: add activation, the rule summary and
  36 native tests; correct the stale 29 to 36.
- `packages/components/README.md` → `src/list.tsx` row: mention row activation.
- `TODO.md` → `- [x] List row activation on Enter and double click — plan 134`.
- `.agents/slop/plans/README.md` → plan 134 row with final counts.

## 7. STOP conditions

1. The renderer has no way to simulate a double click (`clickCount === 2`) →
   STOP and report; do not call the handler directly.
2. `"onActivate" in props` cannot narrow the union without a cast → STOP with
   the compiler output; do not widen the prop onto every mode.
3. A single click activates in single mode → STOP; the first-click contract is
   selection.
4. Enter activates twice (once from `isEnter`, once from `isActivation`) → STOP
   and report the call count; fix the Match order rather than adding a guard
   flag.
5. Existing List tests change behaviour without `onActivate` → STOP; activation
   must be inert when the prop is absent.
6. A test is flaky across two consecutive runs → STOP and report; nothing here
   is time-dependent.

## 8. Commands and expected results

```
nub run --filter @gpuixui/components check-types      # exit 0
nub run --filter @gpuixui/components test             # 223 unchanged (no new logic)
nub run --filter @gpuixui/components test:behaviour   # 263 -> 269; List 36
nub run check                                         # exit 0
nub run test                                          # exit 0
```

## 9. Deviations, recorded during implementation

(fill in during implementation.)

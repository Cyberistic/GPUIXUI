# 510 — List: the roving tab stop survives its rows changing

**Phase:** C/F (Tier 2 hardening) · **Owner:** components · **Depends on:** 111,
120, 125, 130, 134, 339, 394, 388 · **Status:** planned

Every other number in `100–499` is already claimed across the four worktrees
(`PLAN.md` D7), so this plan takes the first free number after the docs block
and records that in `PLAN.md` §4 (D30) when it lands.

## 1. The defect (measured 2026-10-18, this host, `0.10.0`)

`List` derives its one roving tab stop from the row that last held focus
(`active`) without checking that the row still exists or still accepts input.
`tabbableValue` in `src/list.tsx` starts with `active` verbatim. A list whose
rows are **data** — search results, a filtered file list, a permission list that
loads — therefore breaks in two ways when the data changes:

1. **Removing the active row removes the tab stop.** After removing row `b` from
   `[a, b, c]` while `b` held focus, every remaining row reports
   `tabIndex: -1`. The list has no tab stop at all, so a keyboard user cannot
   reach it again, and the native focus is gone (`getFocusedElementId()` is
   `null`).
2. **Disabling the active row leaves the tab stop on it.** After `b` becomes
   disabled while focused, `b` keeps `tabIndex: 0`, stays natively focused and
   keeps painting the focus ring; `a` is `-1`. The one tab stop lands on a row
   that cannot be activated, and the ring reads as an operable control.

Probe output (temporary suite, deleted after the measurement):

```
removed  -> tabs: [a -1, c -1], focused: null
disabled -> tabs: [a -1, b 0],  focused: 8 (b), b paints the focus ring
```

A second measurement rules out reacting inside the row's unregister cleanup:
`renderer.getElementBounds(id)` for an element React is deleting **throws**
`Invalid element id`, and the focused id read at ref-cleanup time is
inconsistent (`2` in one run, `-1` in another). The fix must therefore decide
from committed state, not from cleanup.

## 2. The rule

> A row that is gone or disabled never owns the tab stop, and never keeps the
> user's focus when the list itself had it.

Three parts, in this order:

1. **The active row must be live.** Derive `liveActive` = `active` only when a
   registered row with that value exists and is not disabled. Every consumer of
   "the row the user is on" reads `liveActive`, never the raw state.
2. **The tab stop requires a live active row.** `tabbableValue` receives
   `liveActive`, so its existing fallbacks (first selected row, else first
   enabled row) take over. It already guarantees "exactly one, never disabled".
3. **Focus follows the list when its row disappears or goes disabled.** The root
   remembers the native id of the row it last focused. After a rows change, if
   that row is no longer present or no longer enabled **and** native focus is
   still on that row or has become `null`, focus moves to the tab stop. If
   anything else holds focus, nothing is touched — a consumer that focuses
   another control in the same update keeps it.

Not in scope: moving focus when a row only *moves* (reordering keeps the same
native id here), and a focusable child inside a row (`ListItem` is one host
element; `trailing` is a badge or a shortcut, not a control). Both go in the
page's limitations.

## 3. Files

### 3.1 `packages/components/src/list.tsx` (only source file touched)

**a. Live active row.** After `const [active, setActive] = useState(...)`
(line ~318) and after the `rows` state, add:

```ts
/**
 * The row the user is on, when that row still exists and accepts input. A list
 * whose rows are data loses them: a filtered-out or newly disabled row must not
 * keep the ring, the tab stop or the keys.
 */
const liveActive = useMemo(
  () =>
    Option.filter(active, (value) =>
      Arr.some(rows, (row) => row.value === value && !row.disabled),
    ),
  [active, rows],
);
```

Replace `active` with `liveActive` in the **five** consumers:

- `moveBy`: `indexOf(rows, liveActive)` and the dependency array;
- `selectActive`: `Option.match(liveActive, ...)` and the dependency array;
- `activateActive`: `Option.flatMap(liveActive, enabledRow)` and the dependency
  array;
- `typeahead`: `indexOf(rows, liveActive)`;
- the `tabbable` memo: `tabbableValue(rows, liveActive, selected, selectable)`
  and its dependency array;
- the `flags` memo: `isActive` tests `Option.exists(liveActive, ...)` and the
  dependency array.

`setActive` / `noteFocus` / `focusRow` keep writing the raw state; deriving is
cheaper than reconciling it in an effect and cannot race a render.

**b. Remember the focused row.** Next to `active`:

```ts
/**
 * The native id of the row the list last focused. Read after a rows change to
 * tell "the user's row vanished" from "the list was never focused" (plan 510).
 */
const focusedRow = useRef<Option.Option<number>>(Option.none());
```

Set it in both places that give a row focus:

- `focusRow`: `focusedRow.current = Option.some(row.nativeId);` before
  `renderer?.focusElement?.(row.nativeId)`.
- `noteFocus`: resolve the row and store its id. `noteFocus` currently only
  takes `value`, so look it up:

```ts
const noteFocus = useCallback(
  (value: string) => {
    setActiveIfChanged(value);
    Option.match(
      Arr.findFirst(rows, (row) => row.value === value),
      {
        onNone: () => undefined,
        onSome: (row) => {
          focusedRow.current = Option.some(row.nativeId);
        },
      },
    );
  },
  [rows, setActiveIfChanged],
);
```

`noteFocus` is called from the row's `onFocus` and from the `autoFocus` effect;
`focusRow` covers the click, arrow, Home/End and type-ahead paths, which do not
run React's `onFocus` in a live tree (plan 367).

**c. Relocate after a rows change.** Add one `useLayoutEffect` after the
`tabbable` memo (it needs `tabbable`) and before the mask-sync effect:

```ts
/**
 * A row that vanishes or turns disabled takes the user's focus with it: the
 * native element is gone, and a disabled row cannot run its action. Hand focus
 * to the row that now owns the tab stop, but never steal it from another
 * control the consumer focused in the same update.
 */
useLayoutEffect(() => {
  const remembered = focusedRow.current;
  if (Option.isNone(remembered)) return;

  const target = Arr.findFirst(rows, (row) => row.nativeId === remembered.value);
  if (Option.exists(target, (row) => !row.disabled)) return;

  focusedRow.current = Option.none();
  const focused = renderer?.getFocusedElementId?.();
  if (focused !== null && focused !== undefined && focused !== remembered.value)
    return;

  Option.match(tabbable, {
    onNone: () => undefined,
    onSome: (value) =>
      Option.match(
        Arr.findFirst(rows, (row) => row.value === value),
        {
          onNone: () => undefined,
          onSome: (row) => focusRow(row),
        },
      ),
  });
}, [focusRow, renderer, rows, tabbable]);
```

Notes for the executor:

- `focusedRow.current = Option.none()` must happen **before** the guards, so a
  one-off condition cannot replay on a later rows change.
- `focusRow` calls `setActiveIfChanged`, so the ring lands on the row that now
  has focus, and `focusedRow` is set again by `focusRow` itself.
- When no row accepts input (`tabbable` is `None`, e.g. every row was removed),
  nothing is focused — the `None` branch is the whole behaviour.
- Do not add a `disabled` guard to `ListItem`'s `tabIndex`; with `liveActive`
  the mask is already correct and a second rule would drift.

### 3.2 `packages/components/src/behaviour/list.test.tsx`

Add one `describe("dynamic rows", ...)` block with **six** native tests. Header
comment: the two measured bugs (tab stop vanishes; disabled row keeps stop and
focus) and the focus-steal guard.

Fixture: a local `rowsOf(values, disabled?)` helper that returns the same
`List testId="list" selectionMode="single"` with `row-a`/`row-b`/`row-c`; use
`root.rerender(...)` to change the data. Read state via
`findByTestId("row-x")?.customProps?.tabIndex`, `focusedTestId(root)`, and
`style.boxShadow`.

1. **"a removed active row does not take the tab stop with it"** — focus `b`
   (`root.renderer.focusElement?.(b.id)`), rerender `[a, c]`; expect `row-a`
   tabIndex `0`, `row-c` `-1`, exactly one `0`.
2. **"focus follows the list when the focused row is removed"** — same setup;
   expect `focusedTestId` is `Some("row-a")` and `row-a` paints
   `theme.focusRing`'s shadow (use `darkTheme` + the exported `focusRing`
   helper, as the suite already does elsewhere).
3. **"focus falls back to the selection when that survives"** — click `row-a`
   (selects it), focus `row-b` natively, rerender `[a, c]`; expect the tab stop
   and focus on `row-a`.
4. **"a focused row that becomes disabled hands over the tab stop and focus"** —
   focus `b`, rerender with `b` disabled; expect `row-b` tabIndex `-1`, no
   `boxShadow`, `row-a` tabIndex `0`, `focusedTestId` `Some("row-a")`.
5. **"the list does not steal focus claimed in the same update"** — a local
   `Fixture` renders the list plus `<div testId="after" tabIndex={0}>`; a
   `useLayoutEffect` focuses `after` when a prop flips, and the same render
   removes the focused `b`. Expect `focusedTestId` is `Some("after")` and no
   list row is focused.
6. **"an emptied list focuses nothing and throws nothing"** — focus `b`,
   rerender with no rows; expect `focusedTestId` is `None`, the root still
   renders, and no assertion throws.

Assertions must be able to fail: each one names a value that differs between
the broken and fixed code (see §4). Do not assert a literal against itself and
do not stub the renderer.

### 3.3 `packages/components/docs/list.mdx`

- Add a short **"Dynamic rows"** subsection under `## Selection` (or after
  `## Keyboard (single mode)`): the tab stop never leaves the list when its rows
  change; a removed or disabled focused row hands focus to the tab stop; a
  consumer that focuses another control in the same update keeps it.
- Add one limitation: a focusable child placed in a row's `trailing` slot is not
  tracked (the row is the unit of focus).
- Update `## Verification`: "44 tests" → the real new total (the inventory test
  compares this number to the suite, so count the run).

### 3.4 Inventory records

- `src/list.tsx` → `listMeta.limitations`: add the `trailing`-child note only;
  the dynamic-row behaviour is a capability, not a limitation.
- `COMPONENTS.md` tier-2 `Lists / list items` row: append "the tab stop and
  focus survive a change in the rows: a removed or newly disabled focused row
  hands focus to the tab stop, a consumer's own focus in the same update is
  never stolen (6 native tests, plan 510)"; update the test count (44 → new
  total).
- `TODO.md` → add the task under Tier 2 hardening and tick it.

### 3.5 Plan index and architecture record

- `.agents/slop/plans/README.md` → add this row to the components table with
  status `done — …`.
- `PLAN.md` §4 → **D30**: "A collection's roving tab stop is derived from live
  rows, never from the last focused value; focus relocation is opt-in by
  measurement (only when the list itself held it)."

## 4. Commands and expected results

```sh
cd packages/components
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/list.test.tsx
```

Expected: `Test Files 1 passed`, `Tests 50 passed` (44 + 6).

Prove the tests can fail — **each mutation, run, observe, revert**:

| Mutation | Expected failures |
| -------- | ----------------- |
| Pass raw `active` into `tabbableValue` again | tests 1 and 4 |
| Delete the relocation `useLayoutEffect` | tests 2, 3, 4 |
| Remove the "something else claimed focus" guard | test 5 |
| Relocate without checking the row is present/enabled | test 5 (steals after every rows change) |
| Make the `None` tab-stop branch focus `rows[0]` unconditionally | test 6 (throws on an empty list) |

Record the observed failure counts in the plan's status line.

Then the full gates, from the repo root:

```sh
nub run check
nub run lint
nub run test
```

Expected: every script exits `0`; `packages/components` reports 395 + 6 unit/
logic tests unchanged (the new cases are behaviour-only) and
`test:behaviour` reports 637 (631 + 6) when run separately.

## 5. STOP conditions

Stop and report with evidence — do not improvise — if:

- `getFocusedElementId()` after a removal is **not** `null` on this host (the
  relocation rule depends on that measured fact);
- the relocation effect fires on the initial row registration (`rows` going
  from `[]` to `[a, b, c]`) and moves focus unprompted;
- a removed row's native element cannot be distinguished from a newly added
  row that reuses its value (the row registry is value-keyed; if React reuses
  the value, the "present" check is the contract — document it instead of
  reading native ids);
- tests 1–6 cannot fail in at least one mutation above (the guard would be
  decorative);
- touching `list.tsx` changes any existing List case beyond the documented
  behaviour (the 44 existing cases must stay green unchanged).

## 6. Acceptance

- The six native cases run and pass in the real renderer, and each has a
  recorded mutation that makes it fail.
- The 44 existing List cases, the full behaviour suite and all three gates pass.
- `docs/list.mdx`, `listMeta`, `COMPONENTS.md`, `TODO.md`, the plan index and
  `PLAN.md` D30 are synced.

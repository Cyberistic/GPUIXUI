# Plan 578 — List: the natively focused row is the roving origin

| | |
| --- | --- |
| Phase | F (Tier 2 hardening) |
| Owner | `components` (`packages/components`) |
| Depends on | 110, 111, 117, 130, 134, 332, 339, 367, 388, 394, 510, 522, 540, 577 |
| Status | **landed** — measured: `Space` on a natively focused row reported nothing, the first arrow jumped to the first row, a first `Shift+Arrow` started its range there and type-ahead started from the first match. The origin now comes from `getFocusedElementId()` at key time (plan 367's rule); the four new cases fail without it, eleven recorded List failures flip to pass, and the three row-removal cases stay red (best explained in plan 540) |
| Claimed number | `578` is the first free number across the worktrees after `577` (recorded in `PLAN.md` D30) |

## 0. Why this plan exists

`List` keeps its roving origin in React state (`active`), and only the list's own
arrow moves and the rows' React `onFocus` update it. `@gpuix/native@0.10.0`
delivers **no React `focus`/`blur` for a native focus change** (measured in plan
536: `focusElement`, `focusNext` and a pointer focus change all stay silent; the
same class of defect Tabs fixed in plan 367). So a user who reaches the list with
`Tab` leaves `active` at `None`, and every key falls back to the first row.

Measured on this host with the real `TestRenderer` at `HEAD` (2026-10-19):

```tsx
// Four enabled rows a,b,c,d; selectionMode="multiple"
list.renderer.focusElement(rowC.id);
list.renderer.getFocusedElementId() === rowC.id   // true: focus IS knowable
list.renderer.simulateKeystrokes("space");
// onValueChange calls: []                        // the focused row is not selectable
list.renderer.simulateKeystrokes("down");
// focused id: row-a                              // not row-d
```

- `Space` / `Enter` on the natively focused row report nothing.
- The first `Arrow`/`Shift+Arrow` moves to the **first** row, not from the
  focused one; a `Shift+Arrow` range therefore starts at the wrong end.
- Type-ahead searches from the first match, not from the focused row, so a
  repeated letter cannot advance from where the user is.

The list's own keyboard gate already reads the renderer (`ownsRowKeys`,
plan 577), and `getFocusedElementId()` works on this host. The origin must be
read the same way at key time instead of trusting React focus state.

The same defect explains eleven of the suite's fourteen recorded plan-540
"binding" failures (`moves real focus…`, `repaints only the rows…`, `selects the
active row…`, the Space/Shift+Arrow cases, `feeds both refs`, the five
activation cases). They are component-side after all: the binding can report the
focused id; the component never asks. Three removal cases still cannot be fixed
here — the focused row is gone before the effect can name it (see §5).

## 1. Exact files to change

1. `packages/components/src/list.tsx`
2. `packages/components/src/internal/typeahead.ts` (the origin becomes a getter)
3. `packages/components/src/menu/state.ts` (one call site follows the getter)
4. `packages/components/src/behaviour/list.test.tsx` (4 new cases)
5. `packages/components/docs/list.mdx` (keyboard origin + count)
6. `COMPONENTS.md` (Lists / list items row)
7. `.agents/slop/plans/README.md` (index row)
8. `TODO.md` (new Tier 2 hardening row)
9. `PLAN.md` (D30: next components overflow number)

Do not change selection arithmetic (`list/selection.ts`), row registration, the
paint-mask store, type-ahead matching (`press`/`matchPrefix`), the example, or
the three known-unfixable removal cases.

## 2. Implementation

### 2.1 `src/internal/typeahead.ts`

`useTypeahead` takes the origin as a **getter**, read when a character arrives, so
a native focus the React tree never saw is still the search origin:

```ts
export const useTypeahead = <Item extends TypeaheadItem>(
  items: ReadonlyArray<Item>,
  from: () => Option.Option<number>,
  onMatch: (item: Item) => void,
): ((char: string) => void) => {
  const buffer = useRef<TypeaheadBuffer>(idle);
  return useCallback(
    (char: string) => {
      const next = press(buffer.current, char, monotonicNanos());
      Option.match(matchPrefix(items, from(), next.text), {
        onNone: () => {
          buffer.current = idle;
        },
        onSome: (item) => {
          buffer.current = next;
          onMatch(item);
        },
      });
    },
    [from, items, onMatch],
  );
};
```

Update the module header: the origin is a getter because the focused row may be
known only to the renderer. No pure function changes; `typeahead.test.ts` stays.

### 2.2 `src/menu/state.ts`

One call site; keep the getter's identity stable so the menu context does not
change every render:

```ts
const activeIndex = useCallback(
  () => resolveActiveIndex({ activeId }, rows),
  [activeId, rows],
);
const typeahead = useTypeahead(rows, activeIndex, (row) => focusRow(row.id));
```

Menu behaviour is unchanged (menus focus every row they highlight).

### 2.3 `src/list.tsx`

Add the one origin rule, after `liveActive`/`focusedRow` are declared:

```tsx
/**
 * The row a key acts on or moves from: the natively focused registered row,
 * then the roving state. A native focus change never runs React's `onFocus`
 * (0.10.0), so `Tab` into the list leaves `active` empty; the renderer still
 * knows the row (plan 367's rule, measured again here).
 */
const origin = useCallback((): Option.Option<Row> => {
  const focused = renderer?.getFocusedElementId?.();
  const native =
    focused === undefined || focused === null
      ? Option.none<Row>()
      : Arr.findFirst(
          rows,
          (row) => row.nativeId === focused && !row.disabled,
        );
  return Option.orElse(native, () =>
    Option.flatMap(liveActive, (value) =>
      Arr.findFirst(rows, (row) => row.value === value),
    ),
  );
}, [liveActive, renderer, rows]);
```

Then, in the same component:

- `moveBy`: start from `origin()` instead of `liveActive`:
  ```ts
  const from = Option.map(origin(), (row) => row.value);
  pipe(
    rowAt(rows, nextEnabled(items(rows), indexOf(rows, from), delta)),
    Option.match({
      onNone: () => undefined,
      onSome: (row) => {
        focusRow(row);
        if (!extend || !multiple) {
          setAnchor(Option.some(row.value));
          return;
        }
        commit(
          range(
            rows,
            Option.getOrElse(anchor, () =>
              Option.getOrElse(from, () => row.value),
            ),
            row.value,
          ),
        );
      },
    }),
  );
  ```
  An existing anchor still wins, so a range built by earlier clicks is unchanged.
- `selectActive`: resolve through `origin()`:
  ```ts
  pipe(
    Option.map(origin(), (row) => row.value),
    Option.match({ onNone: () => undefined, onSome: select }),
  );
  ```
  `select` already checks `enabledRow`; keep it.
- `activateActive`: `Option.map(origin(), (row) => row.value)` then `onActivate?.(value)`.
  (The row came from a live registry, so the extra lookup is gone.)
- The type-ahead hook gets a stable getter:
  ```ts
  const typeaheadOrigin = useCallback(
    () => indexOf(rows, Option.map(origin(), (row) => row.value)),
    [origin, rows],
  );
  const typeahead = useTypeahead(rows, typeaheadOrigin, (row) => {
    focusRow(row);
    setAnchor(Option.some(row.value));
  });
  ```
- `handleKeyDown` (after the `ownsRowKeys()` gate) syncs the paint state to the
  real focus before the action, so the ring lands on the row the user is on:
  ```ts
  Option.match(origin(), {
    onNone: () => undefined,
    onSome: (row) => setActiveIfChanged(row.value),
  });
  ```
  `setActiveIfChanged` keeps an unchanged value by reference, so a move still
  repaints only the two rows that changed (plan 339).

Update the module header with one sentence: the roving origin is read from the
renderer when a key arrives, because a native focus change never runs React's
`onFocus`; the React state only paints.

### 2.4 `src/behaviour/list.test.tsx`

Add four cases in the keyboard/type-ahead suites, each written to fail on the
old code:

```tsx
it("moves from the natively focused row, not the first one", () => {
  const list = renderComponent(
    <List testId="list" selectionMode="single">
      <ListItem testId="row-a" value="a" textValue="Alpha"><ListItemTitle>Alpha</ListItemTitle></ListItem>
      <ListItem testId="row-b" value="b" textValue="Beta"><ListItemTitle>Beta</ListItemTitle></ListItem>
      <ListItem testId="row-c" value="c" textValue="Gamma"><ListItemTitle>Gamma</ListItemTitle></ListItem>
      <ListItem testId="row-d" value="d" textValue="Delta"><ListItemTitle>Delta</ListItemTitle></ListItem>
    </List>,
  );

  // `focusElement` never runs React's `onFocus`; that is the case under test.
  list.renderer.focusElement(list.renderer.findByTestId("row-c")?.id ?? -1);
  list.renderer.simulateKeystrokes("down");
  expect(focusedTestId(list)).toEqual(Option.some("row-d"));

  list.renderer.simulateKeystrokes("up");
  expect(focusedTestId(list)).toEqual(Option.some("row-c"));

  list.unmount();
});

it("selects the natively focused row with Space", () => {
  const onValueChange = vi.fn();
  const list = renderComponent(multiCatalog(onValueChange));

  list.renderer.focusElement(list.renderer.findByTestId("row-c")?.id ?? -1);
  list.renderer.simulateKeystrokes("space");

  expect(onValueChange).toHaveBeenLastCalledWith(["c"]);
  list.unmount();
});

it("extends the range from the natively focused row", () => {
  const onValueChange = vi.fn();
  const list = renderComponent(multiCatalog(onValueChange));

  list.renderer.focusElement(list.renderer.findByTestId("row-c")?.id ?? -1);
  list.renderer.simulateKeystrokes("shift-down");

  expect(onValueChange).toHaveBeenLastCalledWith(["c", "d"]);
  list.unmount();
});

it("types from the natively focused row", () => {
  const list = renderComponent(searchable());

  list.renderer.focusElement(list.renderer.findByTestId("row-delta")?.id ?? -1);
  list.renderer.simulateKeystrokes("d");

  expect(focusedTestId(list)).toEqual(Option.some("row-draft"));
  list.unmount();
});
```

`multiCatalog` has `row-b` disabled, so the Space case proves the focused row
(not the first) is toggled while a disabled row sits before it. The type-ahead
case starts on the first `d` row, so the old code (origin `None`) stays on it.

### 2.5 `docs/list.mdx`

- Keyboard sections: say the keys start from the row that holds focus, whether
  the user arrived by click, arrow, `autoFocus` or `Tab`.
- Dynamic rows: keep the "not tracked" bullet for a trailing control; the list
  now names the focused row even when React never saw it.
- Accessibility: add the honest limit — native `Tab` focus raises no React
  `onFocus`, so the ring paints on the row when the first key arrives; keys and
  selection already use the renderer's focused id.
- Verification: `(52 tests)` → `(56 tests)` and name the four cases in prose.

### 2.6 `COMPONENTS.md`

Lists / list items row:

- after the `real focus (focusElement)` claim, add: keys and selection start
  from the natively focused row even when React never received `onFocus`, so
  `Tab`-then-`Space`/`Arrow` acts on the row the user is on;
- replace `52 native behaviour tests` with `56 native behaviour tests`;
- keep the trailing-control and virtualisation limitations unchanged.

### 2.7 Index, `TODO.md`, `PLAN.md`

- `.agents/slop/plans/README.md`: new row `578`, status `done` when landed with
  the measured before/after.
- `TODO.md` → Tier 2 hardening: add and tick the row with the measurement.
- `PLAN.md` D30: append `578` and set the next components overflow plan to `579`.

## 3. Commands and expected results

From `packages/components` (the reliable scoped form):

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/list.test.tsx
```

Expected at `HEAD` before the change: **38 passed, 14 failed** of 52 (the
recorded plan-540 set). Measured with this plan: **53 passed, 3 failed** of 56 —
the eleven interactive cases now pass, the three row-removal cases stay red, and
the four new cases pass. Record the exact names in the commit body. Do not try
to make the three removal cases pass here; they are the binding hand-off (§5).

```sh
nub exec vitest run --config vitest.behaviour.config.ts src/behaviour/dropdown-menu.test.tsx src/behaviour/context-menu.test.tsx
```

Expected: unchanged verdicts and counts (type-ahead is shared; the menu origin is
still its React state).

```sh
nub run test
nub run check-types
```

Expected: unit suite green (the inventory re-checks the stated 56 against the
suite); type-check clean.

```sh
nub run check
nub run lint
```

Expected: both exit `0`.

Full native suite (merge gate):

```sh
nub run --filter @gpuixui/components test:behaviour
```

Expected at `HEAD`: **716 passing / 55 failed** of 771. Measured with this plan:
**731 passing / 44 failed** of 775 — the eleven List cases flip, four are added
and the three List removal cases plus the other files' plan-540 failures remain.
Paste both numbers into the commit body.

## 4. Both-direction proof

1. Keep the four new cases; revert only the `origin()` reads (use `liveActive` as
   before).
2. Run the scoped suite: case 1 must fail on `row-a` instead of `row-d`; case 2
   must report no change; case 3 must report `["a"]` instead of `["c","d"]`; case
   4 must stay on `row-delta`.
3. Restore the fix and re-run: the four pass and the eleven interactive
   plan-540 cases pass with them; the three removal cases stay red.
4. Paste both counts into the commit body.

`scripts/verify-two-directions.sh` calls `jj` (not installed, D1); do the two runs
by hand.

## 5. STOP conditions

- `getFocusedElementId()` does not name the row after `focusElement` on this host
  — stop and report; do not invent a fallback.
- Any existing passing case changes verdict other than the eleven named
  plan-540 List failures — stop and report which behaviour regressed.
- The three row-removal cases start passing without a deliberate change — stop:
  the effect's focus bookkeeping changed in a way this plan did not design.
- Any native failure beyond the 44 expected (the 3 List removal cases plus the
  other files' plan-540 failures) — stop.
- The paint-count case stops repainting exactly the two changed rows — stop; the
  sync must not re-render the whole list.

## 6. Acceptance

- `Space`/`Enter` on the natively focused row select or run it, even after `Tab`.
- `Arrow`/`Shift+Arrow` start from the natively focused row; a first
  `Shift+Arrow` from an unanchored row selects from that row.
- Type-ahead advances from the natively focused row.
- Four new native cases (56 total), all proven to fail without the fix; the
  eleven interactive plan-540 List cases now pass; the three removal cases are
  recorded as the remaining binding gap.
- Module headers, docs, `COMPONENTS.md`, inventory, plan index, `TODO.md` and
  `PLAN.md` agree; the docs line and the row state 56.
- `nub run check`, `nub run lint` and the unit suite exit `0`; native suite
  `731 passing / 44 known failures`.
- One commit: `fix(components): the natively focused list row is the roving origin (plan 578)`.

## 7. Results (2026-10-19, this host)

- Re-measured before the change: `Space` on a natively focused `row-c` reported
  no change, `down` moved to `row-a`, and `shift-down` from `row-c` reported
  `["a"]`; `getFocusedElementId()` named `row-c` throughout, so the component
  had the information it needed.
- `src/list.tsx`: one `origin()` rule (native focus, then the roving state), used
  by `moveBy`, `selectActive`, `activateActive`, the type-ahead origin and the
  key-time paint sync. `src/internal/typeahead.ts` takes the origin as a getter;
  `src/menu/state.ts` memoises its getter so its context identity is unchanged.
- Scoped suite: **53 passed / 3 failed** of 56. The three remaining failures are
  the removal cases (`hands focus to the tab stop when the focused row is
  removed`, `falls back to the surviving selection…`, `takes the tab stop and
  focus off a row that becomes disabled`), where the focused element is gone
  before an effect can name it — the plan-540 hand-off.
- Both-direction proof (by hand, `jj` is not installed): with `origin()` reduced
  to the roving state, the four new cases and the eleven interactive plan-540
  cases fail; restored, they pass and the three removal cases stay red.
- Full suite: **731 passing / 44 failed** of 775 (was 716/55 of 771).
- Unit suite: 42 files, 426 tests, exit `0` — the inventory checks the 56 stated
  by the docs page and the `COMPONENTS.md` row.
- `nub run check` and `nub run lint` exit `0`.


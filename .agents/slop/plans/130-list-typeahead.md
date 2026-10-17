# 130 — List type-ahead, over the shared type-ahead core

- **Phase:** C (Tier 2 hardening)
- **Workstream:** components · **Owns:** `packages/components/**`, `COMPONENTS.md`
- **Depends on:** 111 (List), 120/125 (List selection), 129 (menu type-ahead)
- **Status:** done, 2026-10-17. One shared core
  (`internal/typeahead.ts`: buffer, matcher, hook) used by menus and `List`;
  `ListItem.textValue`; 7 native tests added (List 22 → 29, behaviour
  232 → 239); both-direction proof in §10a. The menu suites are unchanged at
  19 + 12 native and 13 logic tests.

`List` is a desktop listbox: arrow keys move a roving tab stop and Enter selects.
A desktop list also lets the user type the first letters of a row to jump to it.
`docs/list.mdx` and `listMeta` both record the gap ("no type-ahead").

Plan 129 built that mechanism for menus: a pure 500 ms buffer
(`menu/typeahead.ts`) plus a prefix matcher (`matchPrefix` in `menu/logic.ts`).
A second consumer now exists, so the repo rule hoists it: one buffer and one
matcher in `src/internal/typeahead.ts`, used by both menu and list. Nothing about
menu behaviour changes.

The list needs one extra input: its rows are composed React nodes
(`ListItemTitle`, `ListItemDescription`), so the searchable text cannot be read
off `children`. `ListItem` gains `textValue`, the same escape hatch plan 129 gave
`MenuItem`. A row without it is simply not searched.

---

## 1. Measured facts this plan relies on

Already established and recorded; re-read, do not re-probe:

- A key event fired on a focused row **bubbles** to the list's `onKeyDown`, so
  the list owns the keys while the row owns the focus (`list.tsx` header).
- `EventPayload.key` is a word for named keys and one character for text;
  `EventPayload.keyChar` is the shifted form. `typedChar` in `internal/key.ts`
  tests `key` first, so `Enter` (`keyChar: "\n"`) is not swallowed (plan 129 §1).
- `renderer.simulateKeystrokes("r e")` delivers real key-down events; `"shift-g"`
  delivers `key: "g"`, `keyChar: "G"` (plan 129 §1).
- The buffer window is a lazy timestamp comparison, so no timer, fiber or scope
  is involved. `internal/clock.ts` supplies `monotonicNanos()`.

## 2. Files

```
packages/components/src/internal/typeahead.ts            # moved + matcher + hook
packages/components/src/internal/typeahead.test.ts       # moved: 6 buffer + 7 match
packages/components/src/menu/typeahead.ts                # deleted (moved)
packages/components/src/menu/typeahead.test.ts           # deleted (moved)
packages/components/src/menu/logic.ts                    # matchPrefix removed
packages/components/src/menu/logic.test.ts               # 7 match tests removed
packages/components/src/menu/state.ts                    # useTypeahead
packages/components/src/list.tsx                         # Row.label, hook, key branch,
                                                         # ListItem.textValue, meta
packages/components/src/behaviour/list.test.tsx          # +7 native tests
packages/components/docs/list.mdx                         # keyboard/API/limitations
packages/components/examples/list.example.tsx            # textValue on both lists
COMPONENTS.md                                            # List row
TODO.md                                                  # tick the task
.agents/slop/plans/README.md                             # index this plan
```

Read `src/internal/typeahead.ts` (after the move), `src/menu/state.ts`,
`src/menu/logic.ts`, `src/list.tsx` and `src/behaviour/list.test.tsx` in full
before editing. The type-ahead mechanism must stay one mechanism.

## 3. `src/internal/typeahead.ts`

Move the body of `menu/typeahead.ts` here unchanged (`TypeaheadBuffer`, `idle`,
`window`, `press`). Then add the matcher that used to live in `menu/logic.ts`,
generalised over any labelled item and returning the **item**, not a menu id:

```ts
/** Anything type-ahead can search: a label and whether it accepts input. */
export interface TypeaheadItem {
  readonly label: string;
  readonly disabled: boolean;
}

const normalise = (value: string): string => Str.toLowerCase(Str.trim(value));

/**
 * The item a typed prefix selects: the first enabled item **after** `from`
 * whose label starts with `prefix`, wrapping to the first match; `None` when
 * nothing matches or the prefix is empty.
 *
 * "After the current item" is what makes a repeated letter advance instead of
 * staying on the first match.
 */
export const matchPrefix = <Item extends TypeaheadItem>(
  items: ReadonlyArray<Item>,
  from: Option.Option<number>,
  prefix: string,
): Option.Option<Item> => { ... };
```

Implementation (same logic as plan 129 §6b, with the index carried alongside
the item):

```
const needle = normalise(prefix);
if (Str.isEmpty(needle)) return Option.none();
const candidates = Arr.filterMap(items, (item, index) =>
  !item.disabled && Str.isNonEmpty(normalise(item.label)) &&
  Str.startsWith(needle)(normalise(item.label))
    ? Option.some({ index, item })
    : Option.none());
const fromIndex = Option.getOrElse(from, () => -1);
return pipe(
  Arr.findFirst(candidates, (candidate) => candidate.index > fromIndex),
  Option.orElse(() => Arr.head(candidates)),
  Option.map((candidate) => candidate.item),
);
```

Keep `normalise` module-local. Do not export it unless a test needs it (it does
not: the trimming test goes through `matchPrefix`).

### The hook

Both consumers need the same eight lines: read the clock, press the buffer,
match, reset on a miss, store the buffer on a hit. Export one hook:

```ts
import { useCallback, useRef } from "react";
import { monotonicNanos } from "./clock.js";

/**
 * Type-ahead for a list-like collection. Returns the handler a key listener
 * calls with `typedChar`'s character. The buffer lives in a ref because nothing
 * renders it; a miss clears it so the next letter starts a new search.
 */
export const useTypeahead = <Item extends TypeaheadItem>(
  items: ReadonlyArray<Item>,
  from: Option.Option<number>,
  onMatch: (item: Item) => void,
): ((char: string) => void) => {
  const buffer = useRef<TypeaheadBuffer>(idle);
  return useCallback(
    (char: string) => {
      const next = press(buffer.current, char, monotonicNanos());
      Option.match(matchPrefix(items, from, next.text), {
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

The module doc comment must say it owns the whole type-ahead mechanism — pure
buffer, matcher and the React hook — and that the buffer is lazy (no timer).
`react` and `clock` imports are new to this module; the pure exports stay
deterministic because `press` still takes `now` as an argument.

### 3a. `src/internal/typeahead.test.ts`

Move `menu/typeahead.test.ts`'s six cases unchanged. Move the seven
`matchPrefix` cases from `menu/logic.test.ts` too, with this header addition:
*type-ahead matched only menu ids, so the List could not share it; a matcher that
returned the first match could not advance on a repeated letter.*

Adapt the assertions through a helper that keeps the readable ids:

```ts
const matchedId = (
  items: ReadonlyArray<MenuItemSpec>,
  from: Option.Option<number>,
  prefix: string,
): Option.Option<number> =>
  Option.map(matchPrefix(items, from, prefix), (item) => item.id);
```

Reuse the existing labelled fixture shape from `menu/logic.test.ts` (ids
201–205, plus the disabled and untitled fixtures). Every old assertion keeps its
expectation; only the call site goes through `matchedId`. This proves the move
did not change behaviour.

Expected: `internal/typeahead.test.ts` 13 tests; `menu/logic.test.ts` 20 → 13.

## 4. `src/menu/logic.ts` and `src/menu/logic.test.ts`

Delete `normalise` and `matchPrefix`. Remove the now-unused `Str` import; keep
`MenuItemSpec`, `move`, `initial`, `isActive`, `resolveActiveIndex` and their
imports. The module header stays true ("this module only maps a keyboard action
onto [the collection] arithmetic"); matching now lives with the buffer.

In `logic.test.ts`, delete the `matchPrefix` describe block and its import.
Keep the labelled `rows` helper: `MenuItemSpec.label` is still part of the type
and is what the shared matcher reads.

## 5. `src/menu/state.ts`

Replace the buffer plumbing with the hook:

```ts
const typeahead = useTypeahead(
  rows,
  resolveActiveIndex({ activeId }, rows),
  (row) => focusRow(row.id),
);
```

- Import `resolveActiveIndex` from `./logic.js` and `useTypeahead` from
  `../internal/typeahead.js`.
- Delete the `press`/`idle`/`TypeaheadBuffer`/`monotonicNanos`/`matchPrefix`
  imports, the `useRef` import if now unused, and the `buffer` ref.
- Keep `typeahead` in the context value and its dependency list.
- Behaviour must not change: the hook is the same algorithm, and the seven moved
  unit tests are the proof.

Expected: no change to any menu test (Dropdown 19, Context 12).

## 6. `src/list.tsx`

### 6a. A row carries its searchable text

`Row` gains `readonly label: string`. `upsert` treats a changed label as a
changed row:

```ts
current.disabled === row.disabled &&
current.nativeId === row.nativeId &&
current.label === row.label
  ? rows
  : Arr.map(...);
```

`ListItemProps` gains:

```ts
/**
 * The text type-ahead matches. Rows are composed from `ListItemTitle` and
 * `ListItemDescription`, so the list cannot read the text off `children`;
 * omit this and the row is skipped by type-ahead.
 */
readonly textValue?: string;
```

In `ListItem`, destructure `textValue`, compute `const searchable = textValue ?? ""`,
and register `label: searchable`. Add `textValue` to the registration effect's
dependency list.

### 6b. The key branch

After the existing `if (!selectable) return;` and the `extend` read:

```ts
const typeahead = useTypeahead(rows, indexOf(rows, active), (row) => {
  focusRow(row);
  setAnchor(Option.some(row.value));
});

const handleKeyDown = (event: EventPayload): void => {
  if (!selectable) return;
  const extend = multiple && event.modifiers?.shift === true;
  pipe(
    typedChar(event),
    Option.match({
      // A typed letter jumps to a row; it never also runs a named-key rule.
      onSome: typeahead,
      onNone: () =>
        Match.value(event).pipe(
          /* the existing chain, unchanged */
        ),
    }),
  );
};
```

- Import `typedChar` from `./internal/key.js` and `useTypeahead` from
  `./internal/typeahead.js`.
- Re-anchor on a type-ahead jump, exactly as an arrow move does, so a following
  `Shift`+click extends from the row the user typed to.
- Type-ahead moves focus only. It must **not** change the selection: a
  selectable list selects on Enter/Space or a click, and silently selecting on
  every keystroke would make multi-select impossible to type into.
- `pipe` and `Match` are already imported.

### 6c. Metadata

`listMeta.limitations` replaces `"no typeahead, drag reorder or virtualisation"`
with two entries:

```ts
"type-ahead matches an explicit ListItem textValue, not rendered children",
"no drag reorder or virtualisation",
```

## 7. Native tests — `src/behaviour/list.test.tsx` (+7)

Extend the header comment: *typing a prefix moved nothing; a repeated letter did
not advance; a disabled row won the match; an uppercase letter never matched; a
missed prefix poisoned the next search; and type-ahead changed the selection in
multiple mode.*

Add a fixture below `multiCatalog`:

```tsx
/** Rows for type-ahead: two D rows, a disabled B row, and an unsearched row. */
const searchable = (mode: "single" | "multiple" = "single") => (
  <List testId="list" selectionMode={mode}>
    <ListItem testId="row-alpha" value="alpha" textValue="Alpha">
      <ListItemTitle>Alpha</ListItemTitle>
    </ListItem>
    <ListItem testId="row-beta" value="beta" disabled textValue="Beta">
      <ListItemTitle>Beta</ListItemTitle>
    </ListItem>
    <ListItem testId="row-banana" value="banana" textValue="Banana">
      <ListItemTitle>Banana</ListItemTitle>
    </ListItem>
    <ListItem testId="row-delta" value="delta" textValue="Delta">
      <ListItemTitle>Delta</ListItemTitle>
    </ListItem>
    <ListItem testId="row-draft" value="draft" textValue="Draft">
      <ListItemTitle>Draft</ListItemTitle>
    </ListItem>
    <ListItem testId="row-echo" value="echo">
      <ListItemTitle>Echo</ListItemTitle>
    </ListItem>
  </List>
);
```

Every test starts by focusing a row inside the list, because the list's key
handler hears bubbled row events only: `clickCentreOf(list, "row-alpha")` (which
also selects Alpha in selectable modes). Use `focusedTestId(list)`.

1. **A prefix moves real focus to the first match.** Type `"d"` → focus
   `row-delta`; assert the tab stop moved with it (the existing `tabStop` helper
   with the six ids returns `["row-delta"]`).
2. **A repeated letter advances and wraps.** `"d"` → `row-delta`; `"d"` again →
   `row-draft`; `"d"` again → `row-delta` (only two matches).
3. **A disabled match is skipped.** `"b"` → `row-banana`, never `row-beta`.
4. **Shifted text matches case-insensitively.** `simulateKeystrokes("shift-g")`
   → `row-delta` cannot match, so use a G row? **No:** the fixture has no G. Use
   `"shift-b"` → `row-banana`; `key` is `"b"`, `keyChar` is `"B"`.
5. **A miss clears the prefix.** `"z"` (nothing moves) then `"b"` →
   `row-banana`. Without the reset the buffer is `"zb"` and nothing matches.
6. **Multiple mode moves focus without selecting.** Render
   `searchable("multiple")`, click `row-alpha` (selection `["alpha"]`), type
   `"d"`; assert focus `row-delta`, `aria-selected` on `row-alpha` is `true`,
   `row-delta` is `false`, and `onValueChange` fired once (the click).
7. **A row without `textValue` is not searched.** Type `"e"` → focus stays on
   `row-alpha`, although `row-echo`'s value starts with `e`. This is the opt-in
   contract, and the reason `textValue` exists.

That is seven cases; keep all seven (the plan's file list said "+6" — the
acceptance number is the actual run: List 22 → 29, behaviour 232 → 239).

## 8. Docs and ledgers

- `docs/list.mdx`:
  - Add a `## Type-ahead` section after the multiple-mode keyboard table: a
    case-insensitive **prefix** (not fuzzy), 500 ms window, repeated letter
    cycles, disabled and unlabelled rows skipped, `textValue` is the search text,
    and no timer is involved (lazy timestamp).
  - Keyboard tables: add `Letter keys` → "jump to the next enabled row whose
    `textValue` starts with the typed prefix".
  - API table: `ListItem` gains `textValue: string` — "type-ahead text; a row
    without it is not searched".
  - Delete `**Not built**: no type-ahead,` from the selection section; keep drag
    reorder and `aria-multiselectable`.
  - Limitations: `- No drag reorder, no group headers, no nested rows.`
  - Verification sentence at the bottom (if present): 22 → 29 native tests.
- `examples/list.example.tsx`: add `textValue={file.name}` to the file rows and
  `textValue={reviewer.name}` to the reviewer rows, with a one-line comment in
  the header that typing a name jumps.
- `COMPONENTS.md` List row: add type-ahead to the notes, `22` → `29` native
  tests; replace "no type-ahead or virtualisation" with "no drag reorder or
  virtualisation".
- `src/list.tsx` → `listMeta` per §6c.
- `TODO.md`: add under "Tier 2 hardening after the inventory closed":
  `- [x] List type-ahead over the shared type-ahead core — plan 130`.
- `.agents/slop/plans/README.md`: add the 130 row with the final counts.
- `packages/components/README.md`: no change (it does not name type-ahead).
- `README.md`: no change (component count is unchanged).

## 9. STOP conditions

1. **A key event on a focused row does not reach the list's `onKeyDown`** in the
   native suite → STOP with the payload and the focused test id; do not add a
   second handler to every row.
2. **`typedChar` sees letters as words** (`key` not one character) in this
   renderer → STOP; the plan's §1 fact would be wrong and plan 129's menu tests
   would already fail.
3. **The type-ahead jump loses real focus** (focused id becomes the list or
   none) → STOP and report; `focusRow` must be the only path.
4. **A row's `textValue` change re-registers in an infinite loop** (the
   registration effect depends on a fresh non-primitive) → STOP with the render
   count; `textValue` is a string, so this should not happen.
5. **The multiple-mode selection changes on a typed letter** → STOP; the test in
   §7.6 is the contract.
6. **Any menu behaviour test changes result** after the hoist → STOP and report.
   The move is meant to be behaviour-preserving; the seven moved matcher tests
   are the unit-level proof.
7. **A native test needs a sleep** → STOP; this plan has no time-window test in
   the native suite because the buffer's window is already covered by unit tests
   and by plan 129's menu expiry test.

## 10. Commands and expected results

```
nub run --filter @gpuixui/components check-types      # exit 0
nub run --filter @gpuixui/components test             # 199 (13 type-ahead + 13 menu logic)
nub run --filter @gpuixui/components test:behaviour   # 232 → 239; List 22 → 29
nub run check                                         # exit 0
nub run lint                                          # exit 0
nub run test                                          # exit 0
```

Record the actual output here when done, including the both-direction proof:

### 10a. Both directions

This is a feature, so prove it mechanically:

1. Run everything green.
2. Remove the `typedChar` branch from `List`'s key handler (restore the direct
   `Match.value` chain); re-run the behaviour suite. Record the red output: the
   six movement tests (1–5, 7) must fail; the multiple-mode test must still pass
   because nothing moves — note that and rely on test 1 for the feature.
3. Restore; make `matchPrefix` always return the first match (ignore `from`);
   re-run. Test 2 must fail (a repeated letter stays on Delta).
4. Restore; make `press` append on a repeated letter; re-run. Test 2 must fail
   (`"dd"` matches nothing).
5. Restore; make `matchPrefix` include disabled rows; re-run. Test 3 must fail.
6. Restore; drop the buffer reset on a miss; re-run. Test 5 must fail
   (`"zb"` matches nothing).
7. Restore. Record the five outputs in this section and in the commit message.

### 10b. Results, recorded during implementation (2026-10-17)

- `check-types` exit 0. `test` **199** (type-ahead 13, menu logic 13 — the seven
  matcher tests moved, none were lost). `test:behaviour` **232 → 239** (List
  22 → 29, every other suite unchanged, including Dropdown 19 and Context 12).
  `nub run check`, `nub run lint` and `nub run test` exit 0.
- Both directions, from the actual runs (the list suite alone, `-- src/behaviour/list.test.tsx`):
  - With the typed-character branch routed to `() => undefined`: the first new
    test failed (`expected row-delta, received row-alpha`), and the six later
    ones failed on the still-mounted-root guard because the first assertion threw
    before `unmount()`. Nothing moved, as intended for that mutation.
  - With `matchPrefix` ignoring `from` (always the first match): `advances on a
    repeated letter and wraps` failed for both List and the menus (11 failures
    overall, including the four menu type-ahead tests).
  - With the repeated-letter rule dropped from `press`: `advances on a repeated
    letter and wraps` failed in both List and the menus.
  - With disabled rows included in the matcher: `skips a disabled row with a
    matching prefix` failed (List and menus).
  - With the buffer reset dropped on a miss: `starts a new search after a prefix
    matches nothing` failed (List), plus the menu equivalent.
  - All restored; the list suite passes 29/29 and the repository behaviour suite
    239/239.
- Deviation from §3's sketch: Effect v4's `Arr.filterMap` takes a `Result`, not
  an `Option`, so the matcher carries the index with `Arr.map` + `Arr.filter`
  (the same shape plan 129 originally used). No behaviour change.
- Enforcer exception: `useTypeahead` is a local React hook (`useRef` +
  `useCallback`) for a per-component keyboard buffer, not shared state; Effect
  Atom is not a substitute for a ref that nothing renders.

## 11. Acceptance criteria

- [ ] One type-ahead implementation: `internal/typeahead.ts` is the only buffer,
      matcher and hook; `menu/typeahead.ts` no longer exists.
- [ ] Menu behaviour is unchanged; its 19 + 12 native tests and 13 logic tests
      pass.
- [ ] `List` type-ahead focuses (and re-anchors) the matched enabled row in both
      selectable modes, skips disabled and unlabelled rows, cycles on a repeated
      letter, matches case-insensitively, and expires after 500 ms.
- [ ] Type-ahead never changes the selection.
- [ ] `ListItem.textValue` is documented, demonstrated in the example, and
      recorded in the API table.
- [ ] Native tests written and both-direction proof recorded in §10a.
- [ ] `COMPONENTS.md`, `listMeta`, `TODO.md` and the plan index updated.
- [ ] `check-types`, `test`, `test:behaviour`, `check`, `lint` and `test` exit 0.

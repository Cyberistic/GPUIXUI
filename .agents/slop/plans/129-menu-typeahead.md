# 129 — Menu type-ahead (Dropdown and Context)

- **Phase:** C (Tier 2 hardening)
- **Workstream:** components · **Owns:** `packages/components/**`, `COMPONENTS.md`
- **Depends on:** 114 (shared menu core), 126 (menu keyboard opening), 117 (inventory gate)
- **Status:** done, 2026-10-17. One pure buffer (`menu/typeahead.ts`), a labelled
  row registry and one `typedChar` branch in the shared key handler; 13 logic tests
  + 7 native tests, both-direction proof in §13a. Both menus gained it together.

A desktop menu lets a person type the first letters of a row instead of arrowing
to it. Both menus currently say "no type-ahead", and the docs explain why: the
buffer needs a time window, and plan 114 §2 forbade hosting it on a `setTimeout`.

Both halves are now available:

- A keystroke carries `keyChar` (`EventPayload.keyChar`), measured in the real
  renderer — see §1.
- The window is a **lazy comparison**, not a timer. The buffer stores the
  monotonic timestamp of its last keystroke; the next keystroke decides whether
  the buffer is still alive. Nothing has to fire while the menu is idle, so no
  `setTimeout`, no fiber and no provider.

The feature lives in the shared menu core, so Dropdown and Context get it
together and CommandMenu keeps its own text input.

---

## 1. Probe answers (measured before this plan was written)

Run through the real `TestRenderer` on this host:

| Keystroke | `key` | `keyChar` | `modifiers` |
| --------- | ----- | --------- | ----------- |
| `"r"` | `"r"` | `"r"` | none |
| `"shift-r"` | `"r"` | `"R"` | `shift: true` |
| `"enter"` | `"enter"` | `"\n"` | none |

**Consequence:** the type-ahead predicate must test **`key` first** (a text key is
one character; `"enter"` is five). Testing `keyChar.length === 1` alone would
swallow `Enter`, whose `keyChar` is `"\n"`. This is a STOP-level fact: do not
simplify the predicate to `keyChar` alone.

`simulateKeystrokes("r e")` delivers two `keyDown` events, so the native suites
can type a prefix.

## 2. Files

```
packages/components/src/menu/typeahead.ts          # new: pure buffer
packages/components/src/menu/typeahead.test.ts     # new: 6 logic tests
packages/components/src/internal/clock.ts          # new: one synchronous monotonic read
packages/components/src/internal/key.ts            # + typedChar predicate
packages/components/src/menu/logic.ts              # MenuItemSpec.label + matchPrefix
packages/components/src/menu/logic.test.ts         # + 7 matchPrefix tests, labelled fixtures
packages/components/src/menu/state.ts              # MenuRow.label, typeahead in the context
packages/components/src/menu/item.tsx              # textValue prop, register the label
packages/components/src/menu/surface.tsx           # route typed characters
packages/components/src/command-menu.tsx           # specs carry the action label
packages/components/src/behaviour/dropdown-menu.test.tsx # + 6 native tests
packages/components/src/behaviour/context-menu.test.tsx  # + 1 native test
packages/components/docs/dropdown-menu.mdx         # keyboard table, limitations, counts
packages/components/docs/context-menu.mdx          # keyboard section, limitations
packages/components/src/dropdown-menu.tsx          # dropdownMenuMeta limitations
packages/components/src/context-menu.tsx           # contextMenuMeta limitations
COMPONENTS.md                                      # both menu rows
README.md                                          # only if its menu sentence becomes false (it does not)
TODO.md                                            # tick the hardening task
.agents/slop/plans/README.md                       # index this plan
```

Read `src/menu/state.ts`, `src/menu/surface.tsx`, `src/menu/item.tsx` and
`src/menu/logic.ts` in full before editing: the registry, the highlight and the
key handler are one mechanism and must stay one mechanism.

## 3. `src/menu/typeahead.ts` (new, pure)

No React, no clock import. `press` receives `now` and returns the next buffer, so
the suite is deterministic.

```ts
import * as Arr from "effect/Array";
import * as Str from "effect/String";
import * as Duration from "effect/Duration";

/** The typed prefix and when its last keystroke arrived (monotonic nanos). */
export interface TypeaheadBuffer {
  readonly text: string;
  readonly at: bigint;
}

/** Nothing typed. */
export const idle: TypeaheadBuffer = { text: "", at: 0n };

/** How long a prefix stays alive. */
export const window: Duration.Duration = Duration.millis(500);

const WINDOW_NANOS = BigInt(Duration.toMillis(window)) * 1_000_000n;

/**
 * Add one character to the buffer.
 *
 * A keystroke after the window starts a fresh prefix. Repeating the buffer's only
 * letter keeps the buffer as it is, so the match can advance to the next row that
 * starts with that letter (the desktop convention); otherwise the letter appends.
 * Matching is case-insensitive, so the buffer is stored lower-cased.
 */
export const press = (
  buffer: TypeaheadBuffer,
  char: string,
  now: bigint,
): TypeaheadBuffer => { ... };
```

`press` rules, in order:

1. `const letter = Str.toLowerCase(char)`.
2. If `buffer.text === ""` or `now - buffer.at > WINDOW_NANOS` →
   `{ text: letter, at: now }`.
3. If `buffer.text` is every character equal to `letter` →
   `{ text: buffer.text, at: now }`.
4. Otherwise → `{ text: `${buffer.text}${letter}`, at: now }`.

For rule 3 use `Arr.every(Str.split("")(buffer.text), (seen) => seen === letter)`.
Do not special-case length 1: `"dd"` is only reachable if a caller built it by
hand, and the rule is easier to state uniformly.

### 3a. `src/menu/typeahead.test.ts` (new, +6)

Header comment names the guarded bugs: *a buffer with no window made every later
letter part of an old search; a repeated letter appended into a prefix that
matches nothing instead of advancing; an uppercase keystroke never matched a
lower-case label.*

1. The first character starts the buffer and lower-cases it (`"R"` → `"r"`).
2. A second, different character inside the window appends (`"r"` then `"e"` at
   +100ms → `"re"`).
3. A character exactly at the window is accepted (`+500ms` → still appends); one
   nanosecond past it starts over (`+500ms + 1n` → `"e"`).
4. Repeating the only letter keeps the buffer (`"d"` then `"d"` → `"d"`) and
   updates `at`.
5. Repeating inside a longer prefix appends (`"d"`, `"e"`, then `"d"` → `"ded"`).
6. `idle` is empty and `window` is 500ms.

Expected: this file 6 tests.

## 4. `src/internal/clock.ts` (new)

One synchronous read at the React event boundary. The alternative — a runtime
per menu — buys nothing: no fiber, no scope, no cleanup.

```ts
import { Effect } from "effect";
import * as Clock from "effect/Clock";

/**
 * The monotonic clock in nanoseconds, read synchronously.
 *
 * A menu key handler needs "now" before its next render. `Clock.monotonicTimeNanos`
 * keeps the source of time Effect's clock instead of `Date.now`; `runSync` is the
 * boundary that makes it available to React (the same boundary rule as the toast
 * provider's runtime, plan 115).
 */
export const monotonicNanos = (): bigint =>
  Effect.runSync(Clock.monotonicTimeNanos);
```

Monotonic, not wall-clock: the window measures elapsed time and must not move
when the system clock is corrected.

## 5. `src/internal/key.ts` — `typedChar`

Append (import `pipe` from `effect`, `Option` is already imported):

```ts
/**
 * The character a keystroke types, or `None` for a shortcut, a named key or a
 * key that a menu already uses.
 *
 * `key` decides whether this is text: it is one character for letters, digits and
 * punctuation, and a word (`"enter"`, `"space"`, `"down"`) otherwise. `keyChar`
 * supplies the shifted form. Measured: `Enter` has `keyChar: "\n"`, so testing
 * `keyChar` alone would type a newline instead of activating the row.
 */
export const typedChar = (event: EventPayload): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(event.keyChar),
    Option.filter((char) => char.length === 1 && char !== " "),
    Option.filter(
      () =>
        event.key.length === 1 &&
        event.modifiers?.cmd !== true &&
        event.modifiers?.ctrl !== true &&
        event.modifiers?.alt !== true,
    ),
  );
```

`event.key` is typed as `string | undefined` on `EventPayload`; guard it with
`Option.fromNullishOr(event.key)` in the predicate if the compiler objects
(`Option.exists`). Do not use a cast.

## 6. `src/menu/logic.ts`

### 6a. A row carries its searchable text

Replace `export type MenuItemSpec = CollectionItem;` with:

```ts
/** A menu row: the id of its host element, whether it accepts selection, and the
 *  text type-ahead matches. An empty label is not searched. */
export interface MenuItemSpec extends CollectionItem {
  readonly label: string;
}
```

Every construction site must supply `label`:

- `src/menu/state.ts` `MenuRow extends MenuItemSpec`;
- `src/command-menu.tsx` `specs`: `{ id: index, disabled: action.disabled === true, label: action.label }`;
- `src/menu/logic.test.ts` rows fixture: add a label (see §9).

### 6b. `matchPrefix`

```ts
const normalise = (value: string): string => Str.toLowerCase(Str.trim(value));

/**
 * The row a typed prefix selects: the first **enabled** row after the active one
 * whose label starts with `prefix`, wrapping; the first such row when nothing is
 * active or no later row matches; `None` when nothing matches or the prefix is
 * empty.
 *
 * "After the active row" is what makes a repeated letter advance instead of
 * staying on the first match.
 */
export const matchPrefix = (
  items: ReadonlyArray<MenuItemSpec>,
  activeId: Option.Option<number>,
  prefix: string,
): Option.Option<number> => { ... };
```

Implementation shape:

```
const needle = Str.toLowerCase(prefix);
if (Str.isEmpty(needle)) return Option.none();
const candidates = Arr.filterMap(items, (item, index) =>
  !item.disabled && Str.startsWith(needle)(normalise(item.label))
    ? Option.some({ index, id: item.id })
    : Option.none());
const from = Option.getOrElse(
  Option.flatMap(activeId, (id) => indexOfId(items, id)),
  () => -1);
return pipe(
  Arr.findFirst(candidates, (candidate) => candidate.index > from),
  Option.orElse(() => Arr.head(candidates)),
  Option.map((candidate) => candidate.id));
```

`Arr.filterMap` puts passes first (single array here), `Arr.head` returns
`Option`. A row with an empty label never matches: `startsWith` of `""` is true
for any needle only when the needle is also empty, which is guarded — but a
**completely empty label** does not contain the label text in a useful way, so
filter it explicitly:

```
Option.filter((candidate) => Str.isNonEmpty(normalise(candidate.label)))
```

inside the `filterMap` branch (before `startsWith`). It documents intent and
keeps a decorative row out of the search.

### 6c. `menu/logic.test.ts` (+7, and update the fixture)

The `rows` helper gains a label:

```ts
const rows = (spec: ReadonlyArray<readonly [number, boolean?, string?]>): ReadonlyArray<MenuItemSpec> =>
  spec.map(([id, disabled, label]) => ({
    id,
    disabled: disabled ?? false,
    label: label ?? `row ${id}`,
  }));
```

Existing cases keep their meaning because every default label is unique and
none of the old actions read it. Add a `matchPrefix` describe with labelled rows
(`Rename`, `Duplicate`, `Delete`, `Open`, `Copy path`):

1. An empty active id selects the first enabled row starting with the prefix.
2. Typing the same prefix again from a matched row selects the **next** matching
   row, and wraps from the last to the first.
3. A disabled match is skipped (disabled `Duplicate`; `"d"` from `Delete` wraps
   past it).
4. Matching is case-insensitive and trims both sides (`"  R "` matches `Rename`).
5. No match yields `None` and leaves the caller's state alone (the function is
   pure: assert it returned `None`, not that a state changed).
6. An empty prefix yields `None` even though every label starts with `""`.
7. A row with an empty label is never matched.

Expected: `src/menu/logic.test.ts` 13 → 20 tests.

## 7. `src/menu/state.ts`

1. `MenuRow extends MenuItemSpec` (keeps `activate`).
2. `upsert` replaces when **disabled or label** changed:

```ts
current.disabled === row.disabled && current.label === row.label
  ? rows
  : Arr.map(rows, (candidate) => (candidate.id === row.id ? row : candidate));
```

3. `MenuContextValue` gains:

```ts
/** Type the next character: the highlight jumps to the first row matching the
 *  accumulated prefix. A prefix that matches nothing clears the buffer. */
readonly typeahead: (char: string) => void;
```

4. `useMenuState` owns the buffer and implements `typeahead`:

```ts
const buffer = useRef<TypeaheadBuffer>(idle);

const typeahead = useCallback(
  (char: string) => {
    const next = press(buffer.current, char, monotonicNanos());
    Option.match(matchPrefix(rows, activeId, next.text), {
      onNone: () => {
        buffer.current = idle;
      },
      onSome: (id) => {
        buffer.current = next;
        focusRow(id);
      },
    });
  },
  [activeId, focusRow, rows],
);
```

Add `typeahead` to the `useMemo` value and its dependency list. Keep the buffer in
a ref, not state: nothing renders it, and a re-render per keystroke would be
wasted work. The buffer deliberately survives closing and re-opening: it has a
timestamp, so it expires on its own.

`focusRow` already sets the highlight and calls `renderer.focusElement`, so the
type-ahead highlight is the same "highlight is focus" rule as the arrows.

## 8. `src/menu/item.tsx` and `src/menu/surface.tsx`

### 8a. Label registration

`MenuItemProps` gains:

```ts
/**
 * The text type-ahead matches when `children` is not a plain string (for example
 * a label with a badge beside it). Rows whose text cannot be derived are not
 * searched.
 */
readonly textValue?: string;
```

In `MenuItem`:

```ts
const searchable = textValue ?? (P.isString(children) ? children : "");
```

Register `label: searchable` and add `searchable` to the registration effect's
dependencies (the effect currently depends on `disabled`, `instance`, `register`,
`run`):

```ts
return register({ id: instance.id, disabled, label: searchable, activate: run });
```

Import `* as P from "effect/Predicate"`.

Do **not** derive the label from `getAllText` or the rendered tree: registration
must know the value without measuring, and `textValue` is the documented escape
hatch.

### 8b. Route typed characters

In `menuKeyHandler`, before the `Match.value(event)` chain:

```ts
pipe(
  typedChar(event),
  Option.match({
    onSome: menu.typeahead,
    onNone: () =>
      Match.value(event).pipe(
        /* the existing chain, unchanged */
      ),
  }),
);
```

`Option.match`'s `onNone` must **return** the `Match` result; the arrow chain's
`Match.orElse` already returns `undefined`. Wrap the chain in `() =>` so the
whole handler stays expression-shaped and both menu roots (Dropdown's
`FloatingLayer` and Context's `MenuSurface`) use it unchanged.

A typed character must not also run the arrow/activation rules: `typedChar` is
`None` for every named key, and the early branch returns before the chain.

## 9. `src/command-menu.tsx`

Only the `specs` helper changes, to satisfy `MenuItemSpec.label`:

```ts
const specs = (actions: ReadonlyArray<CommandAction>): ReadonlyArray<MenuItemSpec> =>
  Arr.map(actions, (action, index) => ({
    id: index,
    disabled: action.disabled === true,
    label: action.label,
  }));
```

The palette already has a real input; type-ahead on the list would fight it and
must not be added. `command-menu.tsx` does not use `useMenuState`, so no
behaviour changes. Import the `MenuItemSpec` type.

## 10. Tests — native

### 10a. `src/behaviour/dropdown-menu.test.tsx` (+6)

Extend the header comment: *typing a prefix selected nothing (or selected a
disabled row); a repeated letter did not advance; the buffer never expired, so a
later search inherited the old prefix; Shift+R never matched.*

Add a fixture beside `FileActions` — a menu whose rows all start with different
letters except two:

```tsx
const Searchable = ({ onSelect }: { readonly onSelect: (action: string) => void }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: 40 }}>
    <DropdownMenu>
      <DropdownMenuTrigger testId="trigger">Actions</DropdownMenuTrigger>
      <DropdownMenuContent testId="menu" label="Searchable actions">
        <DropdownMenuItem testId="rename" onSelect={() => onSelect("rename")}>Rename</DropdownMenuItem>
        <DropdownMenuItem testId="duplicate" onSelect={() => onSelect("duplicate")}>Duplicate</DropdownMenuItem>
        <DropdownMenuItem testId="delete" onSelect={() => onSelect("delete")}>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);
```

All tests open with `clickCentreOf(menu, "trigger")` so focus is the surface, then
`menu.renderer.simulateKeystrokes(...)`.

1. **A prefix focuses the matching row.** `"r e"` → `focusedTestId` is
   `Option.some("rename")`.
2. **A repeated letter advances and wraps.** `"d"` → `duplicate`; `"d"` →
   `delete`; `"d"` → `duplicate` again.
3. **A disabled match is skipped.** `FileActions` (Duplicate disabled), open,
   `"d u"` → `Duplicate` cannot match; the first letter already moved to
   `delete`, and the failed `"du"` leaves the highlight there.
4. **Shifted text matches case-insensitively.** `"shift-r"` → `rename`.
5. **The window expires.** Open, `"d e"` → `delete`; then
   `await new Promise((resolve) => setTimeout(resolve, 600));`; `"r"` →
   `rename`. Without the expiry the buffer would be `"der"`, match nothing, and
   the highlight would stay on `delete`.
   (`setTimeout` is allowed in this test: it is the same real-time device the
   toast suite uses to cross its timer; the implementation itself has none.)
6. **A miss clears the prefix.** Open, `"z"` (no match, focus stays on the
   surface), then `"r"` → `rename`. Without the reset the second search would be
   `"zr"` and match nothing.

Expected: DropdownMenu 13 → 19 tests.

### 10b. `src/behaviour/context-menu.test.tsx` (+1)

Extend the header comment: *typing in the pointer-positioned menu selected
nothing, although it shares the Dropdown's rows.*

1. **Type-ahead works in the context menu.** Right-click the row at its origin
   (the existing `rightClickAt` helper), then `simulateKeystrokes("c")` →
   `focusedTestId` is `Option.some("copy")` (`Copy path` is the first `c` row;
   `Open` and `Delete` do not match).

Expected: ContextMenu 11 → 12 tests; overall behaviour 225 → 232.

### 10c. Both directions

It is a feature, not a regression, so prove it mechanically:

1. Run everything green.
2. Remove the `typedChar` branch from `menuKeyHandler`; re-run the behaviour
   suites. Record the red output — tests 1, 2, 4 and the context test must fail
   (nothing moves).
3. Restore the branch; instead make `press` ignore `at` (return the appended
   buffer unconditionally); re-run. Test 5 must fail because `"der"` matches
   nothing.
4. Instead make `press` append on a repeated letter; re-run. Test 2 must fail
   because `"dd"` matches nothing (the highlight stays on the first `d` row).
5. Restore. Record the four outputs in this plan's §13 and in the commit message.

## 11. Docs, metadata, ledgers

- `docs/dropdown-menu.mdx`:
  - keyboard table: add `Letter keys` → "jumps to the next enabled row whose
    label starts with the typed prefix".
  - replace the "There is no type-ahead in v1…" paragraph with a `## Type-ahead`
    section: the 500ms window, prefix (not fuzzy) matching, case-insensitivity,
    repeated letter cycles, `textValue` for a row whose text is not a plain
    string, and the Effect-clock reason it needs no timer.
  - limitations: delete "No type-ahead (see above)." Keep the aria, submenu and
    hover bullets.
  - verification: 13 → 19 native tests, and name type-ahead in the list.
- `docs/context-menu.mdx`: add the same one-row keyboard entry, delete "no
  type-ahead" from the limitations, and update the test count 11 → 12.
- `src/dropdown-menu.tsx` → `dropdownMenuMeta.limitations`: replace the
  "no type-ahead" sentence with *"type-ahead is a case-insensitive prefix with a
  500 ms window and no fuzzy scoring"*. Keep "no submenus" and the
  `aria-selected` sentence.
- `src/context-menu.tsx` → `contextMenuMeta.limitations`: replace
  "no submenus and no type-ahead, as with DropdownMenu" with "no submenus, as
  with DropdownMenu".
- `COMPONENTS.md`:
  - Dropdown menus: add type-ahead to the notes, `13` → `19` native tests.
  - Context menus: add type-ahead, `11` → `12`.
- `TODO.md` → tick
  `- [x] Menu type-ahead (DropdownMenu/ContextMenu) — plan 129`.
- `.agents/slop/plans/README.md` → add the 129 row with the final counts.
- `packages/components/README.md`: no change — its menu sentence does not mention
  type-ahead.

## 12. STOP conditions

1. `typedChar` swallows `Enter`, `Space` or an arrow key in the real renderer →
   STOP with the payload; do not special-case Enter after the fact.
2. `Effect.runSync(Clock.monotonicTimeNanos)` is rejected by the type checker or
   throws at runtime → STOP and report; do not fall back to `Date.now` without
   recording the decision.
3. Registering `label` causes an infinite registration loop (the effect depends
   on a value that changes identity every render) → STOP and report the render
   count; `textValue`/string children are primitives, so this should not happen.
4. A label derived from a `ReactNode` requires `any`, a cast or reading the
   rendered tree → STOP; `textValue` is the answer.
5. Type-ahead moves focus while the CommandMenu input is focused → STOP; that
   component must not subscribe to the menu core.
6. A test is flaky across two consecutive runs (the only timing-sensitive test is
   10a.5, with a 100ms margin over the 500ms window) → STOP and report the two
   runs.
7. A native test needs a sleep longer than 600ms to be reliable → STOP; increase
   the plan's window instead of the test's wait.

## 13. Commands and expected results

```
nub run --filter @gpuixui/components check-types      # exit 0
nub run --filter @gpuixui/components test             # 186 → 199 logic tests
nub run --filter @gpuixui/components test:behaviour   # 225 → 232; DropdownMenu 19, ContextMenu 12
nub run check                                         # repo gate, exit 0
nub run lint                                          # exit 0
nub run test                                          # exit 0
```

Logic: 6 (`typeahead.test.ts`) + 7 (`logic.test.ts`) = 13 new.
Behaviour: 6 (Dropdown) + 1 (Context) = 7 new.

Record the actual command output and the both-direction proof here when done.

### 13a. Results, recorded during implementation (2026-10-17)

- `check-types` exit 0; `test` **186 → 199** (typeahead 6, logic 7); `test:behaviour`
  **225 → 232** (Dropdown 13 → 19, Context 11 → 12); `nub run check`, `nub run lint`
  and `nub run test` exit 0.
- Both directions, from the actual runs:
  - With `onSome: () => undefined` in `menuKeyHandler` (no type-ahead at all):
    all seven new native tests failed, e.g. `jumps to a row from a typed prefix`
    in both suites, and `advances on a repeated letter and wraps`.
  - With the window dropped from `press` (buffer never expires): `starts a new
    search after the type-ahead window` failed — focus stayed on `delete`
    because `"der"` matched nothing.
  - With the repeat rule dropped from `press` (always append): `advances on a
    repeated letter and wraps` failed — `"dd"` matched nothing, so the highlight
    stayed on the first D row.
  - With `matchPrefix` always taking the first match (no "after the active row"):
    `advances to the next match and wraps` and `skips a disabled match` failed.
  - All restored; the suites then passed 199/199 and 232/232.
- Deviations: none from this plan. The only intentional exception to an enforcer
  finding is `Effect.runSync` in `src/internal/clock.ts`: a React key handler
  needs the time synchronously, and `Clock.monotonicTimeNanos` keeps the source
  of time Effect-native instead of `Date.now`. It is a boundary read with no
  fiber and no scope, documented in the module.

## 14. Acceptance criteria

- [x] One buffer implementation in `menu/typeahead.ts`; no timer, no second copy.
- [x] Dropdown and Context both type-ahead through the same `menuKeyHandler`.
- [x] Prefix matching skips disabled rows, wraps, cycles on a repeated letter, is
      case-insensitive, and expires after 500ms.
- [x] Logic and native tests written; both-direction proof recorded in §13.
- [x] Docs pages, `COMPONENTS.md` rows, inventory records and `TODO.md` updated.
- [x] `check-types`, `test`, `test:behaviour`, `check`, `lint` and `test` exit 0.

# 116 — Choice inputs: Search input and Combobox

- **Phase:** C-6
- **Workstream:** components · **Owns:** `packages/components/**`
- **Depends on:** plan 110, plan 111 (List row styling), plan 114 (menu keyboard idioms)
- **GPUix surface used:** `Combobox` and its parts from `@gpuix/react`
  (`ComboboxProps` is string-item based — see §3)

---

## 1. Search input — `src/search-input.tsx`

```tsx
export interface SearchInputProps extends Omit<InputProps, "onSubmit"> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;      // default "Search…"
  disabled?: boolean;
  autoFocus?: boolean;
}
export const SearchInput;
```

Behaviour:
- An `Input` with a leading `"⌕"` glyph (`text`, `colors.mutedForeground`,
  `userSelect:"none"`) and a trailing clear button that appears only when the
  value is non-empty.
- Typing fires `onChange` **and** `onValueChange` with the new text.
- `Enter` fires `onSubmit(value)`; `Escape` clears the field and fires
  `onClear` (only when non-empty; otherwise it does nothing, so it does not
  swallow the key from an enclosing dialog).
- Clear button: 18×18, `borderRadius:radius.sm`, `aria-label:"Clear search"`,
  `testId:"search-clear"`, hover `colors.accent`; clicking clears, focuses the
  input again, and fires `onClear`.
- Controlled and uncontrolled both work; `defaultValue` seeds the field.
- Layout: `flexDirection:"row"`, `alignItems:"center"`, height
  `controlHeight(theme, "md")`, `paddingX:space.md`, `gap:space.md`,
  `backgroundColor:colors.background`, `borderWidth:1`, `borderColor:colors.input`,
  `borderRadius:radius.md`; focused style via `focusVisible` outline
  `focusRing(tokens)`.

`search-input.test.tsx`:
1. Typing "gpui" produces `onValueChange("g")`, … final `"gpui"` — assert the
   last call, proving real keystrokes reach the field.
2. Clear button is absent when empty, present after typing.
3. Clicking clear empties the field, fires `onClear`, and returns focus to the
   input (`getFocusedElementId`).
4. `Enter` fires `onSubmit` with the current text.
5. `Escape` clears; a second `Escape` does not call `onClear` again.
6. Controlled `value` with no state update keeps showing the prop value.

## 2. Combobox filtering logic — `src/combobox/logic.ts`

Our own filter, so the behaviour is tested and does not depend on GPUix's
internal ordering. Pure, `Arr`/`Order`/`Str` only, no native `sort`.

```ts
export interface ComboboxOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;
}

export const labelOf: (option: ComboboxOption) => string;      // label, else value
export const filterOptions: (
  options: ReadonlyArray<ComboboxOption>,
  query: string,
) => ReadonlyArray<ComboboxOption>;
export const toggledSelection: (
  selected: ReadonlyArray<string>,
  value: string,
) => ReadonlyArray<string>;
```

Ranking: exact-prefix matches first (rank 0), then word-prefix (rank 1: the
query starts a word inside the label), then substring (rank 2); ties keep
declaration order (`Order.mapInput(Order.Number, rank)` then the original
index). Match is case-insensitive on `label` **and** `description`. Empty query
returns all options unchanged. Disabled options are **kept** in the list (visible
but not selectable), unlike the menu's move-skipping.

`logic.test.ts`:
- empty/whitespace query returns all options in order;
- prefix beats word-prefix beats substring (a three-option fixture asserts the
  exact order);
- ties preserve declaration order;
- case-insensitivity;
- description matches rank after label matches;
- no match → `[]`;
- `toggledSelection` adds, removes, and never duplicates;
- `labelOf` falls back to `value`.

Header comment states the guarded bug: "prefix matches were sorted after
substring matches, so typing `ca` selected `Vacation` over `Calendar`".

## 3. Combobox component — `src/combobox.tsx`

GPUix's Combobox is headless **and string-based** (`items: readonly string[]`,
`itemToStringValue`). We keep it and adapt, rather than reimplement 460 lines of
proven keyboard/focus behaviour.

```tsx
export type { ComboboxOption } from "./combobox/logic.js";

export interface ComboboxProps {
  options: ReadonlyArray<ComboboxOption>;
  value?: string | ReadonlyArray<string>;
  defaultValue?: string | ReadonlyArray<string>;
  onValueChange?: (value: string | ReadonlyArray<string>) => void;
  multiple?: boolean;                 // default false
  placeholder?: string;               // default "Select…"
  searchPlaceholder?: string;         // default "Search…"
  emptyLabel?: string;                // default "No matches"
  disabled?: boolean;
  label?: string;                     // accessible name for the trigger
}
export const Combobox;
```

Composition:
- `Combobox` (GPUix root) with `items = options.map((o) => o.value)`,
  `itemToStringValue = (value) => labelOf(byValue.get(value))` where `byValue`
  is a `Map` built with `useMemo`.
- `filter` = our `filterOptions` adapted:
  `(value, query) => filterOptions(options, query).some((o) => o.value === value)`.
  Passing a predicate keeps GPUix's ordering untouched while our ranking already
  produced the visible order — **verify this in a test**; if GPUix re-orders
  after the predicate, replace the predicate with a pre-filtered `items` array
  (documented fallback, one-line change).
- `ComboboxTrigger` styled as a field: height `controlHeight(theme, "md")`,
  `borderWidth:1, borderColor:colors.input`, `borderRadius:radius.md`,
  `paddingX:space.md`, `justifyContent:"space-between"`; label from the selected
  option(s), placeholder when empty, trailing `"▾"`.
- `ComboboxInput` inside the popup (search field), `autoFocus` is handled by
  GPUix.
- `ComboboxContent` = `FloatingLayer` surface (popover tokens, radius md,
  border, shadow, `maxHeight:280`, `overflowY:"scroll"`, padding `space.xs`).
- `ComboboxItem` renders label + optional description; state style uses
  `highlighted`/`selected` from GPUix's `ComboboxItemState`; disabled gets
  `opacity:0.5`. Row shape matches plan 111's `ListItem` so the two look alike.
- `ComboboxEmpty` renders `emptyLabel` in `colors.mutedForeground`, centred.
- Multiple mode: selected rows show a `"✓"` and `onValueChange` receives an
  array.

`combobox.test.tsx`:
1. Click the trigger → popup opens and the search input is focused.
2. Typing "ca" filters the list to the matching labels (assert the visible text
   set, not a count).
3. `ArrowDown` + `Enter` selects the second match; the trigger label updates and
   `onValueChange` receives its **value** (not its label).
4. The empty state appears for a query with no matches.
5. Single mode: selecting replaces the previous value; multiple mode adds and
   removes, and the array order follows selection order.
6. A disabled option is visible but cannot be selected by click or Enter.
7. `Escape` closes the popup; focus returns to the trigger.
8. Ranking: typing "ca" puts `Calendar` before `Vacation` (the guarded bug).
9. Both themes: popup background equals `colors.popover`.

## 4. Examples and docs

`examples/search-input.example.tsx` — a file filter above a list, with the
result count bound to the query.
`examples/combobox.example.tsx` — a single-select "Assign reviewer" and a
multi-select "Labels" picker, both with descriptions on the options.

`docs/search-input.mdx`: keyboard table (Enter, Escape), clearing behaviour,
controlled/uncontrolled, "does not debounce — debounce the consumer's query".
`docs/combobox.mdx`: single vs multiple, the string-adapter note (why GPUix's
string items are wrapped rather than reimplemented), ranking rules table, empty
state, a11y (`aria-expanded`, no `aria-activedescendant` — GPUix focuses the
input, highlight is visual), limitations.

## 5. Date / time picker — deferred, with a design

Not in this phase's scope. `COMPONENTS.md` keeps it as `todo` with the note
"needs its own plan; no calendar component exists in Tier 1/2 yet".

When it is picked up, the shape is already decided, so the work is bounded:

1. `src/date-picker/calendar.ts` — pure. `Effect`'s `DateTime` for month math
   (`DateTime.add`, `DateTime.startOf("month")`, `DateTime.weekday`), no `Date`.
   Exports `monthGrid(month: DateTime.DateTime, weekStartsOn: 0|1): ReadonlyArray<ReadonlyArray<DateTime.DateTime | null>>`,
   `isSameDay`, `addMonths`, `formatMonthLabel`.
2. Tests: February in a leap year, a month starting on Sunday, a month starting
   on Saturday, year boundaries, week-start variants.
3. `DatePicker` = a `Popover` (plan 112) containing a 7-column grid of
   `Button`s + month navigation; `role:"grid"`, arrow keys move by day, PageUp/
   PageDown by month.
4. A time picker is a separate, later decision: there is no native time-input
   element in GPUix, so it composes two `NumberInput`s or a scroll list.
5. STOP if `DateTime` cannot produce a stable month grid without a locale
   dependency — report before inventing month names.

## 6. Commands

```
nub run --filter @gpuixui/components check-types
nub run --filter @gpuixui/components test
nub run check:tests && nub run lint && nub run fmt
```

Expected: exits 0; `combobox/logic.test.ts`, `search-input.test.tsx` and
`combobox.test.tsx` ran.

## 7. STOP conditions

1. GPUix's `Combobox` re-orders items after our `filter` predicate → switch to
   the pre-filtered `items` fallback in §3 and re-run; if that breaks
   `activeIndex`, STOP and report.
2. `ComboboxInput` cannot be focused when the popup opens (GPUix uses
   `autoFocus={context.open}`) → report; do not add a manual focus race.
3. `onValueChange` yields labels instead of values because GPUix keys on the
   displayed string → STOP; the adapter assumption is wrong and the mapping must
   be redesigned (do not ship label-keyed values).
4. Multiple-mode array order cannot be controlled → document the runtime order
   and relax the test to set-equality, stating why in the test comment.

## 8. Acceptance criteria

- [ ] SearchInput with clear/submit/Escape proven by real keystrokes.
- [ ] Combobox wraps GPUix rather than reimplementing it, with our ranking in a
      tested pure module.
- [ ] Selection yields values, never labels; single and multiple both proven.
- [ ] Examples, docs pages, `COMPONENTS.md` rows; date picker left as `todo`
      with the design above.

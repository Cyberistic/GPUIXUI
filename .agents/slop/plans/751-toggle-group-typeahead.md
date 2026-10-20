# 751 — A `ToggleGroup` must answer a typed prefix

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) — a roving group with no prefix rule |
| Owner | primitives workstream |
| Paths | `packages/primitives/` (plus the Toggle Group row in `COMPONENTS.md`) |
| Depends on | `030` (package), `041` (runtime suite), `056` (the group), `359` (the roving cursor), `394` (the keyboard axis), `589` (blank option text), `731`/`741` (the shared type-ahead rule and its RadioGroup wiring) |
| Status | **done** — the shared type-ahead rule now selects and focuses the match in `single` and only focuses it in `multiple`; 3 element + 6 runtime cases, the element printable-key case failing with zero calls and all six runtime cases failing with focus still on the first item before the wiring (offline 71 files / 982 tests, scoped live 6/6 and the existing group file 12/12) |

## 0. Why — the measured gap

`ToggleGroup` is the single-select segmented control and the multiple-select
formatting set. It already shares its selection rule, roving tab stop, axis
rule and option text with `RadioGroup`, and both render a named list of
`button` items from the same `{ value, label, disabled }` data. Its keyboard
contract stops at the arrows, Home/End and Enter/Space:

```ts
// components/ToggleGroup.tsx, renderToggleGroup
onKeyDown={(event) => {
  if (props.disabled === true) return;
  Option.match(
    Option.firstSomeOf([
      decideMove(cursorIndex, count, key, orientation, isDisabled),
      decideAbsolute(count, key, isDisabled),
    ]),
    { onNone: () => {}, onSome: move },
  );
}}
```

A printable key reaches `onKeyDown` and is discarded. A long segmented control
(more than a handful of modes) is therefore arrow-only, exactly the gap plans
`731` and `741` closed for `Select` and `RadioGroup`; a group of twenty named
options cannot be reached by typing its name, while the sibling group over the
same option shape can.

The shared rule already exists in `core/typeahead.ts` and the component adapter
in `components/typeahead.ts`; the missing piece is only the wiring. The gap is
measured by the new runtime file in §3.1: before the change, `e` on a focused
`ToggleGroup` leaves native focus and the pressed set untouched.

## 1. The rule

One bridge, using the same rule as `RadioGroup`:

- A printable, non-chord, non-held key selects **and** focuses the next enabled
  item whose resolved text starts with the typed prefix, wrapping; in
  `multiple` mode it **only moves focus** — a press is the item's own
  activation, and typing a name must not toggle a formatting button.
- The search starts after the keyboard's cursor (`moveFrom(activeIndex,
  focus.focusedIndex)`) and then after the last match, so a repeated letter
  advances and a deferring controlled parent cannot pin the prefix on one item
  (the rule already owned by `useTypeahead`, plans `732`/`741`).
- Arrows, Home/End, Enter and Space are consumed before the prefix rule; a
  chord (`cmd`/`ctrl`/`alt`), a held repeat and a disabled group type nothing.
- The item text is `optionText(option.label, option.value)`, so a blank label
  falls back to the value and stays reachable (plan `589`); a disabled item is
  skipped by `matchTypeahead`.

`renderToggleGroup` stays pure: it only receives one more handler,
`onTypeahead`, and calls it with the character after the movement branches have
declined the key. The component owns the clock-backed buffer and the effect of a
match.

## 2. Files to change

### 2.1 `packages/primitives/src/components/ToggleGroup.tsx`

- Import `typeaheadChar` from `../core/typeahead.js` and `useTypeahead` from
  `./typeahead.js`; import `useMemo` from React.
- Add `onTypeahead: (char: string) => void` to `ToggleGroupHandlers`.
- In the group root's `onKeyDown`, after the move/jump `Option.match`, hand the
  event to `typeaheadChar` when neither a move nor a jump consumed it:

```ts
Option.match(
  Option.firstSomeOf([
    decideMove(cursorIndex, count, key, orientation, isDisabled),
    decideAbsolute(count, key, isDisabled),
  ]),
  {
    onNone: () =>
      Option.match(typeaheadChar(event), {
        onNone: () => {},
        onSome: handlers.onTypeahead,
      }),
    onSome: move,
  },
);
```

The existing early return for `props.disabled === true` stays first.

- In `ToggleGroup`, after `activeIndex`, build the search list with `useMemo`:

```ts
const typeItems = useMemo(
  () =>
    Arr.map(props.options, (option) => ({
      value: option.value,
      label: optionText(option.label, option.value),
      disabled: option.disabled === true,
    })),
  [props.options],
);
```

- Declare the cursor once (`moveFrom(activeIndex, focus.focusedIndex)`), then
  after `focusItem`:

```ts
const typeahead = useTypeahead(
  typeItems,
  Option.some(cursorIndex),
  (match) => {
    if (props.type === "single")
      state.set(nextSelection("single", state.value.current, match.item.value));
    focusItem(match.index);
  },
);
```

- Pass `onTypeahead: typeahead` to `renderToggleGroup`.

`focusItem` already paints the destination immediately and records the
`multiple` tab stop, so a runtime that dispatches no focus event still moves the
ring (plans `583`, `600`).

### 2.2 Handler factories in the existing tests

Add `onTypeahead: vi.fn()` to the `ToggleGroupHandlers` literals:

- `src/components/ToggleGroup.test.tsx` (`handlers`);
- `src/components/blank-option-labels.test.tsx` (`toggleHandlers`);
- `src/components/style-order.test.tsx` (`toggleGroupHandlers`);
- `src/components/state-style.test.tsx` (the inline literal).

No behaviour changes there; the compiler enforces the new member.

### 2.3 `packages/primitives/docs/toggle-group.mdx`

- Add a row to §Keyboard:

```md
| Any printable character | select **and** focus the next enabled item whose text starts with the typed prefix, wrapping; a repeated letter advances | focus the next match without pressing it |
```

- Add a paragraph after the arrow rule: where the search starts (the keyboard's
  cursor, not the value), the 500 ms buffer, case-insensitive prefix, disabled
  and blank-label handling, and that a chord or held repeat types nothing.
  Name `RadioGroup`/`Select` as the same rule.
- Add the new runtime file to §Verification.

### 2.4 `COMPONENTS.md` — Toggle Group row

Append: **Type-ahead (`751`):** the group answered every printable key with
nothing, so a long segmented control was arrow-only while `RadioGroup` and
`Select` already answered a prefix. The shared `core/typeahead.ts` rule now
selects **and** focuses the next enabled match in `single` and only focuses in
`multiple`, starting from the keyboard cursor; the docs' keyboard table and the
runtime suite cover both modes.

### 2.5 `TODO.md` and `.agents/slop/plans/README.md`

Add the task to the primitives section, ticked, and the plan row to the index
(Status as in this file's header).

## 3. Test plan

Write the new tests first, run them against the unwired component, record the
failure, then apply §2.1.

### 3.1 `packages/primitives/runtime/toggle-group-typeahead.runtime.test.tsx` (new)

Real GPUix runtime, `openWindow`/`Surface` as in `radio-typeahead.runtime.test.tsx`:

1. **Single selects and focuses the match.** Default `a`; `e` on `tg-a` moves
   focus to `tg-eu`, announces Europe `pressed` and Alpha `not pressed`, and
   reports `["eu"]`.
2. **A repeated letter advances.** A controlled parent pins `value="a"`; `e`,
   `e` walks `tg-eu` → `tg-ee` and reports `["eu", "ee"]` while the paint stays
   on Alpha (the deferring contract).
3. **Multiple only focuses.** `value=["bold"]`; `i` moves focus to `tg-italic`,
   reports nothing, and Italic still announces `not pressed` while Bold stays
   `pressed`. A following Space on the focused item then toggles Italic, proving
   the focus move is real.
4. **Disabled and blank matches are skipped.** `e` skips a disabled Europe and
   reaches Estonia.
5. **An unmatched letter changes nothing and does not poison the next one.**
   `z` leaves focus and reports unchanged; a following `e` works.
6. **A held repeat and a disabled group type nothing.**

Each case fails before §2.1 because focus never leaves the first item.

### 3.2 `packages/primitives/src/components/ToggleGroup.test.tsx` (element tree)

Beside the arrow/activation cases:

1. A printable key hands the character to `onTypeahead` and selects nothing
   itself; `right`, `home`, `enter`, `space` and `tab` do not reach it (the
   move/jump branches consume their keys first).
2. A `cmd` chord and a held repeat are refused before the character rule.
3. A disabled group types nothing.

These fail against the interface-only change (the handler is never called).

### 3.3 Commands and expected results

```sh
# both directions
nub run --filter @gpuixui/primitives test:runtime runtime/toggle-group-typeahead.runtime.test.tsx
# before §2.1: every type-ahead case fails with focus still on the first item
nub run --filter @gpuixui/primitives test src/components/ToggleGroup.test.tsx
# before the root wiring: the printable-key case fails (onTypeahead not called)

# after §2.1
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/primitives test:runtime runtime/toggle-group-typeahead.runtime.test.tsx
nub run --filter @gpuixui/primitives test:runtime runtime/toggle-group.runtime.test.tsx
nub run --filter @gpuixui/primitives check-types
nub run check && nub run lint
```

The full live suite is the merge gate; this plan changes one component and adds
one runtime file.

## 4. STOP conditions

- A printable key also presses/toggles an item in `multiple` — typing must only
  move focus there; stop and reconsider the contract instead of shipping a
  formatting toggle on every key.
- A key already handled by `decideMove`/`decideAbsolute` reaches type-ahead — the
  branch order is wrong; stop.
- Type-ahead selects in a disabled group or through a disabled option — the
  guard/`matchTypeahead` contract is wrong; stop.
- The repeated-letter case stays on the first match — the search is starting
  from the value instead of the cursor; stop, that is plan `732`'s rule.
- The shared `core/typeahead.ts` or `components/typeahead.ts` needs a change —
  the rule already serves `Select` and `RadioGroup`; stop and record the need
  rather than forking it.

## 5. Acceptance

- A focused `single` group answers a typed prefix by selecting and focusing the
  next enabled match, wrapping, and advances on a repeated letter.
- A `multiple` group moves focus to the match without changing the pressed set;
  activation still needs Enter/Space/click.
- Disabled items and blank labels never break the search; chords, held repeats
  and a disabled group type nothing.
- A controlled parent that defers the report cannot trap the prefix.
- The page's keyboard table states the single and multiple outcomes, and the
  inventory row records the measured gap.
- `nub run check`, `nub run lint` and the package suites pass.

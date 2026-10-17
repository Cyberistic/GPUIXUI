# 065 — Checkbox Group: the claimed Tier 1 variant that has no component

**Owner:** primitives workstream (`packages/primitives`).
**Depends on:** 030, 040, 041, 047, 049, 061 (the selection paint), 056 (the data-driven group precedent).
**Status:** planned.

---

## 0. Why this exists

`COMPONENTS.md`'s **Checkboxes** row says: *"Variant merged here: Checkbox Group
(base-gpui `CheckboxGroup`)"*, and `.agents/slop/reference-research.md` §5 assigns
base-gpui's `CheckboxGroup` to that row. Nothing implements it. The only thing
that exists is `examples/selection.example.tsx`, which hand-composes a
"select all / some selected / none selected" parent out of a `Checkbox`, two
`Text` nodes and manual `email && push` / `!email !== !push` maths — repeated by
every consumer that wants a multi-select set.

The gap is real, not cosmetic:

1. **No component owns "several checkboxes for one value".** `RadioGroup` and
   `ToggleGroup` are data-driven groups (D16/D25); checkboxes have no equivalent,
   so a form repeats the layout, the label rows and the parent tri-state.
2. **Every hand-rolled row reproduces the inert-label limitation.** GPUix has no
   `aria-labelledby`/`htmlFor` (measured, plan 020 §1.4), so a `Checkbox` beside a
   `Text` leaves the visible label outside the hit area and the tab stop — the
   cross-workstream debt `TODO.md` records for a Tier 2 `CheckboxRow`. A group is
   the one place this workstream can fix it honestly: a row is **one** interactive
   element (paint + visible label + description), not a focusable box with a
   decorative label next to it. That is not a nested interactive element and it
   needs no `aria-labelledby`.
3. **The tri-state rule is worth proving once.** "All / some / none" over
   *enabled* options, and a select-all that must not clear a value the user cannot
   toggle, are ordinary bugs in hand-written code.

This plan adds `CheckboxGroup` to `packages/primitives`. It is Tier 1: a
single-purpose selection control built from `div` + `text` + the existing
selection paint. It does **not** replace `Checkbox` (a lone yes/no) and it does
not add a `CheckboxRow` compound API (still the components workstream's Tier 2
`Field`/row work).

## 1. Decisions

- **Data-driven, not compound children** (extends D16/D25). The group owns the
  values, the select-all rule and the tab stops, so options are
  `readonly CheckboxGroupOption[]`.
- **One interactive element per row.** The row is `role="checkbox"`, carries the
  accessible name, the `aria-valuetext` state, the tab stop, the click and the
  keyboard handlers. The painted box and the visible `Text` are its children.
  This makes the whole label clickable without inventing `aria-labelledby`.
- **Each row is its own tab stop.** Platform checkbox groups Tab through every
  checkbox; arrows do nothing. That differs from `RadioGroup`/`ToggleGroup` on
  purpose and is documented; a roving index here would break the platform
  contract.
- **`selectAll` is optional.** Supplying the parent's visible label renders one
  extra row whose state is derived: every enabled option selected → `checked`,
  none → `unchecked`, otherwise `indeterminate`. Pressing it selects every
  enabled option or clears the enabled ones only — a disabled option's value is
  never changed, because the user cannot toggle it.
- **Values are emitted in selection order.** A toggle appends the newly selected
  value; select-all appends the missing enabled values in option order. A change
  that produces the same selection returns the current array **by identity**, so
  `useControlState` does not call `onChange` (the `nextSelection` rule from plan
  056).
- **State rides on `aria-valuetext`.** No `aria-checked` in 0.10.0; values are
  `"checked"`, `"unchecked"`, `"mixed"` — the same encoding `Checkbox` uses.

## 2. Files to create or change

| File | Change |
| ---- | ------ |
| `packages/primitives/src/core/checkbox-group.ts` | **new** — `CheckboxGroupOption`, `isGroupSelected`, `toggleGroupValue`, `enabledValues`, `groupParentState`, `toggleGroupAll` |
| `packages/primitives/src/core/checkbox-group.test.ts` | **new** — the rules, including identity and disabled handling |
| `packages/primitives/src/components/CheckboxGroup.tsx` | **new** — `CheckboxGroup`, `renderCheckboxGroup`, `CheckboxGroupFocus`, `CheckboxGroupHandlers` |
| `packages/primitives/src/components/selection.test.tsx` | add a `describe("CheckboxGroup")` block: element tree, states, test ids, focus ring, invalid |
| `packages/primitives/runtime/checkbox-group.runtime.test.tsx` | **new** — click, select-all tri-state, keyboard, disabled/tab order, invalid paint, focus ring |
| `packages/primitives/src/core/index.ts` | export the new core module |
| `packages/primitives/src/components/index.ts` | export `CheckboxGroup` and its types |
| `packages/primitives/examples/selection.example.tsx` | replace the hand-rolled channel group with `CheckboxGroup` + `selectAll` |
| `packages/primitives/docs/checkbox-group.mdx` | **new** page, following the page contract in `docs/README.md` |
| `packages/primitives/docs/checkbox.mdx` | point the tri-state parent snippet at `CheckboxGroup` (the toy becomes the real component) |
| `packages/primitives/docs/README.md` | index row |
| `packages/primitives/README.md` | component list |
| `COMPONENTS.md` | Checkboxes row: the group is a real component, with measured notes |
| `.agents/slop/plans/README.md` | index this plan |
| `TODO.md` | the task, ticked when done |

## 3. Steps and exact commands

Run every command from `/Users/cyberistic/GPUIXUI/workspaces/primitives`.

### 3.1 The rules (`core/checkbox-group.ts`)

```ts
export interface CheckboxGroupOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
  readonly disabled?: boolean;
}

export const isGroupSelected = (values, value) => Arr.contains(values, value);

export const toggleGroupValue = (values, value) => /* add/remove, identity when unchanged */;

export const enabledValues = (options) => /* option values with disabled !== true, in option order */;

export const groupParentState = (values, options): SelectionState =>
  /* checked when every enabled value is selected and there is at least one,
     unchecked when none is, indeterminate otherwise */;

export const toggleGroupAll = (values, options) => /* identity when the union is unchanged */;
```

Rules the tests must pin:

- toggling an already-selected value removes exactly that value; toggling an
  absent value appends it;
- toggling to the same membership returns the **same array reference**;
- `groupParentState` ignores disabled options: a disabled option's stale value
  does not make the parent look partially selected;
- all options disabled → parent state `"unchecked"` and `toggleGroupAll` is a
  no-op (identity);
- `toggleGroupAll` adds every enabled value when not all are selected, and
  removes only enabled values when all are selected — a selected disabled value
  survives both directions.

### 3.2 The component

`renderCheckboxGroup(props, theme, state, focus, handlers)` renders:

```
<div role="group" aria-label={label} testId={testId}
     style={{ display: "flex", flexDirection: orientation === "horizontal" ? "row" : "column",
              gap: theme.spacing.sm }}>
  {selectAll row, when the prop is set}
  {option rows}
</div>
```

Every row (parent included):

```
<div role="checkbox" aria-label={label} aria-valuetext={state}
     tabIndex={disabled ? undefined : 0}
     testId={testId + "-" + key}
     onClick / onKeyDown / onKeyUp / onFocus / onBlur
     style={{ display: "flex", flexDirection: "row", alignItems: "center",
              gap: theme.spacing.sm, cursor }}>
  <div style={selectionBoxStyle({ ...spec, focused }, theme)}>
    {state === "unchecked" ? null : <Icon name={state === "indeterminate" ? "minus" : "check"}
                                          size={theme.iconSize.sm}
                                          color={selectionMarkColor(spec, theme)} />}
  </div>
  <div style={{ display: "flex", flexDirection: "column", gap: theme.spacing["2xs"] }}>
    <Text role="label" tone={disabled ? "muted" : "default"}>{label}</Text>
    {description ? <Text role="caption" tone="muted">{description}</Text> : null}
  </div>
</div>
```

- Rows are addressed for focus by a numeric `focusedIndex`; the parent row is
  index `0` and options start after it. `CheckboxGroup` lifts that state the way
  `RadioGroup` does (GPUix dispatches focus to the element that owns the
  handler, so a wrapper never sees a child's focus).
- Activation uses `core/keyboard.ts`'s `decideActivation` — Enter on key down,
  Space on key up, held keys ignored.
- `disabled` on the group or an option removes the tab stop, refuses the click
  and the keys, and paints the row's label muted.
- `invalid` passes through to every **empty** box (destructive border); a
  selected box keeps its accent (the rule from plan 061).
- `testId` names the group; rows are `${testId}-${option.value}` and the parent
  is `${testId}-all`. Without a `testId` a row gets none, like `ToggleGroup`.

The wrapper:

```tsx
const state = useControlState(props.value, props.defaultValue ?? [], props.onChange);
const [focusedIndex, setFocusedIndex] = useState<Option.Option<number>>(Option.none());
```

### 3.3 Offline tests

Add to `src/core/checkbox-group.test.ts`:

1. `toggleGroupValue` adds and removes, and returns the same reference when the
   membership does not change.
2. `groupParentState` reports checked / indeterminate / unchecked over enabled
   options only, and `unchecked` when every option is disabled.
3. `toggleGroupAll` selects all enabled, clears enabled only, and is an identity
   no-op when the enabled set is empty.

Add to `src/components/selection.test.tsx`:

4. the group is `role="group"` with its `aria-label`, and every row is a
   `role="checkbox"` with the right `aria-valuetext`;
5. a disabled option row has no `tabIndex`; the group's `disabled` removes every
   row and the parent from the tab order;
6. the select-all row announces `mixed` for a partial selection and `checked`
   for all;
7. `invalid` paints the empty rows' boxes destructive and leaves a checked one
   on the accent; a focused row paints a `boxShadow` on its box.

### 3.4 Runtime tests (`runtime/checkbox-group.runtime.test.tsx`)

Mount every case inside `Surface`/`openWindow`. Each test must assert on what the
renderer produced, not on the element tree:

1. **A click on the row toggles it.** Click the row's centre (which lands on the
   label column, not the box) and assert the option's announced value flips
   `unchecked → checked`; click again and it flips back.
2. **The parent is a real tri-state.** Start with one of two options selected:
   the parent announces `mixed`; click it and both options and the parent
   announce `checked`; click it again and everything announces `unchecked`.
3. **A selected disabled option survives select-all.** One disabled option is in
   the controlled value; pressing the parent twice leaves that value announced
   `checked`.
4. **Keyboard and held keys.** Space toggles on key up (not before), Enter on key
   down, and a held key repeats nothing.
5. **Disabled refuses input and leaves the tab order.** A click on a disabled
   option does not change the value; with a `Button` after the group,
   `focusNext` walks the group's enabled rows and leaves on the next Tab; a
   fully disabled group is skipped.
6. **The paint follows the theme.** `invalid` gives every empty row's box the
   destructive border colour; a focused row's box carries a `boxShadow` from
   `colors.ring`.

### 3.5 Example and docs

- `examples/selection.example.tsx`: replace the hand-rolled parent + two rows
  with one `CheckboxGroup` (`selectAll="All channels"`, options with
  descriptions, controlled by `useState<string[]>`). The example's explanatory
  caption ("Every channel is on." / "Some channels are on.") becomes unnecessary
  and must be deleted; the group announces its own state. The example still
  mounts through `examples.runtime.test.tsx`.
- `docs/checkbox-group.mdx`: the page contract — what it is and is not, usage,
  API table, keyboard (per-row tab stops, Enter/Space, **no arrow movement**),
  accessibility (`group` + `checkbox`, `aria-valuetext` states, mixed parent),
  theming, limitations (no `aria-checked`, no `aria-labelledby`, no arrow
  navigation), verification, related (`Checkbox`, `RadioGroup`, `Label`).
- `docs/checkbox.mdx`: the "indeterminate parent" snippet now imports
  `CheckboxGroup` — the extraction this plan exists for.
- `docs/README.md`, `packages/primitives/README.md`: index and list rows.

### 3.6 Verification commands and expected results

```sh
nub run --filter @gpuixui/primitives test
# expected: 28 files / 320+ tests, 0 failing (306 before; +14 core+element tests)

nub run --filter @gpuixui/primitives test:runtime
# expected: 15 files / 156+ tests, 0 failing (150 before; +6)

nub run --filter @gpuixui/primitives check-types
nub run check
nub run lint
nub run test
```

### 3.7 Two-direction proof

Before calling the work done:

1. Remove the select-all parent's derived state (always pass `"unchecked"`) and
   re-run the tri-state runtime test: it must fail with the announced value
   `unchecked` where `mixed`/`checked` is required. Record the message.
2. Remove the disabled guard from `toggleGroupAll` and re-run the
   disabled-survives test: it must fail on the cleared value. Record the message.
3. Restore both and re-run `test:runtime` green.

## 4. Acceptance

- `CheckboxGroup` exists in `@gpuixui/primitives`, is data-driven, controlled and
  uncontrolled, and is exported with its types.
- Select-all derives all / some / none over **enabled** options and never
  changes a disabled option's value.
- Every row is one interactive element: the whole label (and description) is
  clickable and is the tab stop; no nested focusable elements.
- Keyboard (Enter down, Space up, held key ignored, Tab per row), disabled, invalid
  and focus-ring behaviour are measured in the real runtime.
- An example uses the component (hand-rolled maths deleted), a docs page exists,
  the docs index and the package README list it, `COMPONENTS.md` records it, and
  `TODO.md` has the ticked task.
- Both-direction proof recorded; all gates green.

## 5. STOP conditions

- **A row's click does not reach the row** when the press lands on the box or the
  text (GPUI hit-tests to the deepest element). Stop and report the measured
  element that received it; do **not** add `pointerEvents: "none"` to the text
  or a hidden duplicate handler to fake it. The fallback is the RadioGroup row
  contract (which is measured to bubble) or a documented limitation.
- **`aria-valuetext` on a `role="group"`/row is not exposed** by AccessKit as the
  Checkbox row's is. Stop, keep the state on the row and record the a11y dump —
  never claim a state AT cannot hear.
- **The parent's mixed state cannot be reached** because a controlled value is
  not reflected (a `useControlState` bug) — stop; that would be a second defect
  and needs its own plan.
- **The example breaks `examples.runtime.test.tsx`** (a native crash or a missing
  node) — stop and keep the old example; the component can still land with its
  own runtime suite, but the docs must then say the example is separate.

## 6. Outcome (executed on this host, 2026-10-17)

**The component.** `CheckboxGroup` is data-driven and shares the selection paint
(`core/selection.ts`) and the state encoding (`aria-valuetext`) with `Checkbox`.
Options are rows; each row is **one** `role="checkbox"` with the accessible name,
the state, the tab stop, the click and the Enter/Space handlers. The box and the
visible label/description are its children, so the whole label is the hit area
and no `aria-labelledby` is needed. The optional `selectAll` parent derives
`checked`/`indeterminate`/`unchecked` over the **enabled** options only.

Two deviations from §3, both inside the component's own rendering:

- the label/description column stacks (label above caption) instead of
  `RadioGroup`'s single row — a checkbox option's description is a sentence, not
  a gloss; the record's box, not the row, paints the ring, so this is paint only;
- the group's children are pre-flattened (`Arr.prepend(rows, parent)`) because the
  offline harness reads one array level. The element tree is the same.

**The rules.** `toggleGroupValue` appends or removes exactly one value;
`groupParentState` ignores disabled options in both directions and an all-disabled
group is `unchecked`; `toggleGroupAll` returns the current array **by identity**
when there is nothing to toggle, so `onChange` is not woken.

**The tests.** 325 offline tests (306 + 13 core + 6 element) and **156 runtime
tests in 15 files** (150 + 6). What the runtime measured:

| Test | Measured |
| ---- | -------- |
| press anywhere on the row | the centre of the row is the label column, and the press toggles `Email` `unchecked → checked → unchecked` |
| derived parent | one of two selected → parent `mixed`; a press → all three `checked`; a press → all `unchecked` |
| disabled value | a controlled `["sms"]` (SMS disabled) survives select-all and clear; the parent is `unchecked` → `checked` → `unchecked` while SMS stays `checked` |
| keyboard | Space does nothing on key down and toggles on key up; Enter toggles on key down; a held Enter changes nothing |
| disabled + Tab | a click on the disabled row changes nothing; `focusNext` walks `email → push → after`, skipping `sms` |
| paint | the selected box keeps `colors.primary` under `invalid`, the empty one takes `colors.destructive`; a focused row's box carries a `boxShadow` from the ring |

**Both directions proven, then restored green.**

| Guard removed | Failing test | Measured failure |
| ------------- | ------------ | ---------------- |
| the parent's derived state (forced `"unchecked"`) | `derives the select-all parent's all / some / none state…` | `expected 'unchecked' to be 'mixed'` |
| the enabled-only filter in `toggleGroupAll` (all option values) | `never clears a disabled option's value through select-all` | `expected 'unchecked' to be 'checked'` (SMS's value was cleared) |

Restored: `test:runtime` → **15 files, 156 tests, all passing**; `test` → **325**;
`nub run check`, `nub run lint` and `nub run test` green.

**Example and docs.** `examples/selection.example.tsx` now uses the component (the
hand-rolled parent and its `email && push` / `!email !== !push` maths are gone)
and still mounts in `examples.runtime.test.tsx`. `docs/checkbox-group.mdx` is the
page, `docs/checkbox.mdx` points its tri-state snippet here, both READMEs and
`COMPONENTS.md` record the component, and the runtime count note is updated.

**Known limits (documented, not faked).** No `aria-checked` (state rides on
`aria-valuetext`); no arrow-key movement between rows (platform checkbox
semantics are Tab); only the parent is tri-state; a standalone `Checkbox` beside a
`Text` is still inert — the labelled row exists only inside the group.

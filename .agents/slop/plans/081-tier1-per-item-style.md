# 081 — Per-item styling for the data-driven groups, and a `Select` trigger style

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | primitives workstream (`packages/primitives`) |
| Depends on | `079`, `080`, `030`, `040`, `041`, `047`, `065`, `066`, `075` |
| Status | **done** — landed 2026-10-18 (§8) |
| Source | `080-tier1-state-aware-style-groups.md` §6 (the open API question); `TODO.md` "per-item styling for the data-driven groups" |

Self-contained. Read §1, run §4, satisfy §5, stop on §7.

---

## 1. Why

Plan `080` adopted the state-aware `style` contract for the **container** of every
Tier 1 component. It deliberately left one question open: the parts that are
**built from data** — a radio option, a checkbox row, a toggle in a group, a
rating star, an OTP cell, a slider thumb — could not be styled at all, because
`style` belongs to the group root and the items are values in an `options` array,
not child elements a consumer writes.

Today a consumer who needs one specific row to look different (the parent
"select all" row, the currently chosen radio, the fourth star, the focused
thumb) must fork the component. That is the same defect plan `079` fixed for the
top-level parts, one level down.

This slice closes it with **one** rule, not eight bespoke APIs: a per-item prop
takes the runtime's own `StateStyle<<Item>State>` and the state object carries
the item's **identity plus the facts the component already derives for that
item**. Resolution is `resolvePartStyle` — the single merge point from plan
`079` — so a callback wins per property exactly like the container `style`.

`Select`'s visible trigger is the same problem in a published wrapper: the
runtime's `SelectTrigger` already accepts `StateStyle<SelectTriggerState>`, and
the wrapper resolved it internally with no way to contribute. A `triggerStyle`
prop exposes the seam that already exists (plan `080` §2's last paragraph).

### The decision (write it into `PLAN.md` §4 as D28 when this lands)

| Question | Decision | Why |
| -------- | -------- | --- |
| Shape of the per-item callback | `StateStyle<ItemState>` where `ItemState` **includes** `value`/`index` (and `end` for a range thumb) | Reuses the published type and the one resolver; no second `ItemStyle` generic, no `(item, state)` argument order to document, and a plain object remains valid |
| Merge order | caller last, through `resolvePartStyle` | Identical to `style`; one rule for the whole library |
| Per-item focus | in the item state, not the group state | Focus is owned per item (plans `049`, `065`, `076`); the group cannot know it without an observer |
| Checkbox select-all row | `value: Option.Option<string>` (`None` for the parent row) and `parent: boolean` | Absence is `Option` (AGENTS §5); `parent` keeps the common case a boolean check instead of a value comparison |
| `Select` trigger | `triggerStyle?: StateStyle<SelectTriggerState>` | The runtime already exposes that state; the wrapper only forwards the caller's contribution |

## 2. The API, exactly

All new types are exported from the component module **and** from
`src/components/index.ts`, like every existing state type.

### `CheckboxGroup.rowStyle?: StateStyle<CheckboxRowState>`

```ts
export interface CheckboxRowState {
  /** The option's value; `None` for the optional select-all row. */
  readonly value: Option.Option<string>;
  /** Paint order, select-all included (the parent is index 0 when present). */
  readonly index: number;
  /** True for the select-all row only. */
  readonly parent: boolean;
  readonly selection: SelectionState; // "checked" | "unchecked" | "indeterminate"
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly invalid: boolean;
}
```

Applied to the row host `div` (the hit area, tab stop and accessible name), after
`rowStyle(disabled, theme)`.

### `RadioGroup.optionStyle?: StateStyle<RadioOptionState>`

```ts
export interface RadioOptionState {
  readonly value: string;
  readonly index: number;
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly focused: boolean;
  readonly invalid: boolean;
}
```

Applied to the option host `div` (the row that holds focus and the accessible
name), after its base layout rules.

### `ToggleGroup.itemStyle?: StateStyle<ToggleItemState>`

```ts
export interface ToggleItemState {
  readonly value: string;
  readonly index: number;
  readonly pressed: boolean;
  readonly disabled: boolean;
  readonly focused: boolean;
}
```

Applied to the item host `div`, **after** the focused ring merge, so a callback
can still override the ring if it means to.

### `Rating.starStyle?: StateStyle<RatingStarState>`

```ts
export interface RatingStarState {
  /** 1-based, matching the star's announced "N of max". */
  readonly index: number;
  readonly filled: boolean;
  readonly disabled: boolean;
  readonly readOnly: boolean;
  readonly invalid: boolean;
  readonly focused: boolean;
}
```

Applied to the star host `div` (the `role="radio"` node), after
`ratingStarStyle`.

### `OTPField.cellStyle?: StateStyle<OTPCellState>`

```ts
export interface OTPCellState {
  readonly index: number;
  readonly filled: boolean;
  readonly focused: boolean;
  readonly disabled: boolean;
  readonly invalid: boolean;
}
```

Applied to the native `<input>` cell, after `otpCellStyle`. The cell's own
`theme` prop stays the component's; `cellStyle` is `StyleDesc`-shaped exactly
like the rest of the contract.

### `Slider.thumbStyle?: StateStyle<SliderThumbState>`

```ts
export interface SliderThumbState {
  readonly focused: boolean;
  readonly disabled: boolean;
  readonly invalid: boolean;
}
```

### `RangeSlider.thumbStyle?: StateStyle<RangeSliderThumbState>`

```ts
export interface RangeSliderThumbState extends SliderThumbState {
  readonly end: "start" | "end";
}
```

Both applied to the thumb host `div` after `sliderThumbStyle`.

### `Select.triggerStyle?: StateStyle<SelectTriggerState>`

`SelectTriggerState` is **re-exported from `@gpuix/react/select`**, not copied:
`{ open, disabled, placeholder }`. The base is the existing
`selectTriggerStyle(spec, theme)` callback; the caller's contribution is merged
inside a new pure helper so it is unit-testable without rendering:

```ts
export const selectTriggerPartStyle = (
  spec: ControlSpec,
  theme: PrimitiveTheme,
  style: StateStyle<SelectTriggerState> | undefined,
): ((state: SelectTriggerState) => StyleDesc) =>
  (state) => resolvePartStyle(selectTriggerStyle(spec, theme)(state), style, state);
```

`renderSelect` passes `selectTriggerPartStyle(spec, theme, triggerStyle)` to
`SelectTrigger`.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `src/components/CheckboxGroup.tsx` | export `CheckboxRowState`; add `rowStyle`; resolve per row with `value/index/parent/selection/disabled/focused/invalid` |
| `src/components/RadioGroup.tsx` | export `RadioOptionState`; add `optionStyle`; resolve per option; derive `testId = ${props.testId}-${option.value}` |
| `src/components/ToggleGroup.tsx` | export `ToggleItemState`; add `itemStyle`; resolve per item (after the ring merge) |
| `src/components/Rating.tsx` | export `RatingStarState`; add `starStyle`; resolve per star; derive `testId = ${props.testId}-star-${index}` |
| `src/components/OTPField.tsx` | export `OTPCellState`; add `cellStyle`; resolve per cell |
| `src/components/Slider.tsx` | export `SliderThumbState`, `RangeSliderThumbState`; add `thumbStyle` to both; derive `testId` `-thumb` / `-thumb-start` / `-thumb-end` |
| `src/components/Select.tsx` | re-export `SelectTriggerState`; add `triggerStyle`; add `selectTriggerPartStyle`; use it in `renderSelect` |
| `src/components/index.ts` | export the seven new state types and the re-exported `SelectTriggerState` |
| `src/components/state-style.test.tsx` | one offline case per component (§5) |
| `runtime/state-style.runtime.test.tsx` | four measured per-item cases (§5) |
| `docs/checkbox-group.mdx`, `radio-group.mdx`, `toggle-group.mdx`, `rating.mdx`, `otp-field.mdx`, `slider.mdx`, `range-slider.mdx`, `select.mdx` | "Per-item style" subsection + the prop row in the API table |
| `README.md` | list the new per-item state types; delete the "not yet styleable" sentence |
| `COMPONENTS.md` | one sentence in each of the eight Tier 1 notes |
| `TODO.md` | tick the per-item styling row |
| `.agents/slop/plans/README.md` | index this plan |
| `PLAN.md` §4 | add D28 (the decision table above) |

**Do not touch** `src/core/style.ts`, `src/core/selection.ts` or
`src/components/internal.ts` beyond the one pure helper in `Select.tsx`: the
per-item props reuse `resolvePartStyle` unchanged. If a base style function
needs a shape change, that is a STOP (§7).

## 4. Commands and expected results

Run from the worktree root:

```sh
nub run --filter @gpuixui/primitives check-types      # exit 0
nub run --filter @gpuixui/primitives test             # exit 0, one more suite case per component
nub run --filter @gpuixui/primitives test:runtime     # exit 0, 4 more native cases than 190
nub run check                                         # exit 0
nub run lint                                          # exit 0
nub run test                                          # exit 0
```

`test:runtime` needs the locally built 0.10.0 binding (ADR 0003). If it fails
with `MissingNativeBindingError`, stop and report — do not delete the suite.

## 5. Test plan

Every case must be able to fail. The offline cases assert **the decoded element
tree** (`src/components/testing/element.ts`), never a render.

### Offline — `src/components/state-style.test.tsx`

Add one `describe("per-item style")` block with eight cases. Reuse the existing
`recorder`, `elementChildren`, `hostStyleString` and the render functions.

1. **CheckboxGroup** — `selectAll: "All"`, options `alpha`/`beta`, value
   `["alpha"]`; `rowStyle` recorder. Assert the callback ran for **both** rows,
   the parent payload is
   `{ value: Option.none(), index: 0, parent: true, selection: "indeterminate", disabled: false, focused: false, invalid: false }`,
   the option payload carries `Option.some("alpha")`, `parent: false`,
   `selection: "checked"`, and each row paints `PAINT`.
2. **RadioGroup** — value `alpha`; `optionStyle` recorder. Assert two calls, the
   first is `{ value: "alpha", index: 0, checked: true, disabled: false, focused: false, invalid: false }`,
   the second `checked: false`, and both rows paint `PAINT`.
3. **ToggleGroup** — `type: "multiple"`, value `["bold"]`; `itemStyle`
   recorder. Assert `{ value: "bold", index: 0, pressed: true, … }` and the
   unpressed item's payload; both items paint `PAINT`.
4. **Rating** — value `2`, max `3`; `starStyle` recorder. Assert the three
   payloads are 1-based and `filled` is `true, true, false`; each star paints
   `PAINT`.
5. **OTPField** — value `"12"`, length `3`; `cellStyle` recorder. Assert
   `filled` is `true, true, false`, `index` counts from 0, and every cell's
   `backgroundColor` is `PAINT`.
6. **Slider** — focused, disabled, invalid; `thumbStyle` recorder. Assert the
   payload and the thumb's `backgroundColor` is `PAINT`.
7. **RangeSlider** — two thumbs; `thumbStyle` recorder. Assert the two payloads
   differ only in `end` (`"start"`, `"end"`), both focused flags follow the
   focus index set, and both thumbs paint `PAINT`.
8. **Select** — call `selectTriggerPartStyle({ variant: fieldVariant, size: "md" }, testTheme, record.style)`
   with `{ open: true, disabled: false, placeholder: false }`; assert the
   callback saw that state and the returned `StyleDesc.backgroundColor` is
   `PAINT`.

Also keep the existing "container `style`" cases green — the new props must not
have displaced them.

### Runtime — `runtime/state-style.runtime.test.tsx`

Four cases, each proving the state is **live**, not just the props a render
function was handed:

1. **RadioGroup** — `testId="rg"`, options `alpha`/`beta`, value `alpha`,
   `optionStyle` paints `FOCUSED` when `state.checked` and `IDLE` otherwise.
   Assert `rg-alpha` is `FOCUSED` and `rg-beta` is `IDLE`; `runtime.click("rg-beta")`;
   assert the pair swapped.
2. **Rating** — `testId="rt"`, max `3`, value `2`, `starStyle` paints
   `FOCUSED` when `state.filled`. Assert `rt-star-1` and `rt-star-2` are
   `FOCUSED`, `rt-star-3` is `IDLE`; click `rt-star-3` and assert it flips.
3. **CheckboxGroup** — `testId="cg"`, `selectAll: "All"`, options `alpha`/
   `beta`, `rowStyle` paints `FOCUSED` for `state.parent && state.selection === "indeterminate"`.
   Assert the parent row is `IDLE`; click `cg-alpha`; assert the parent row is
   now `FOCUSED`.
4. **Select** — `testId="sel"`, one option, `triggerStyle` paints `FOCUSED`
   when `state.open` else `IDLE`. Resolve the trigger as the root's first child
   (the existing plan-080 Select test does the same) and assert it paints
   `IDLE`, then click and assert `FOCUSED`.

The derived `testId`s in §3 are the locators these cases use. They are also a
real improvement for consumers (`testId` is documented as a stable locator, and
the other data-driven groups already derive one per item).

### Both directions (required before claiming done)

Temporarily make `resolvePartStyle` return `base` (ignore the caller's style):
the eight offline cases and the four runtime cases must fail. Restore it and
re-run both commands green. Paste both command lines and their exit statuses into
§8.

## 6. Docs, inventory, index

- Every page gains a **Per-item style** subsection after "Style by state": the
  prop, the state fields in a table, and one realistic snippet (e.g. dim a
  disabled radio option; colour the select-all row when mixed).
- `README.md`: replace "a radio option, a slider thumb or an OTP cell is data, so
  its own state is not yet styleable" with the new prop list.
- `COMPONENTS.md`: append one sentence per row naming the new prop and the
  measured runtime proof.
- `TODO.md`: tick the per-item row, and add no replacement row unless §7 forced
  a scope cut.
- `.agents/slop/plans/README.md`: add row `081` with status `done` and the test
  counts.
- `PLAN.md` §4: D28.

## 7. STOP conditions

Stop and report — do not improvise — if:

- a per-item state cannot be derived from props + existing local state without
  adding an observer or changing a keyboard contract;
- `resolvePartStyle` cannot merge the per-item base without changing its
  signature (that would be a `079` regression, not this plan);
- the `SelectTrigger` published type does not accept `StateStyle<SelectTriggerState>`
  (verify in `node_modules/@gpuix/react/dist/components/select.d.ts` before
  writing — it does at 0.10.0);
- the derived `testId` collides with an existing one in the same tree;
- a runtime case cannot locate its element (then fix the locator; if the runtime
  paints no such element, stop — the per-item style was not applied);
- `test:runtime` cannot load the binding.

## 8. Result

Landed 2026-10-18.

- Seven per-item props and one trigger prop, all through `resolvePartStyle`:
  `CheckboxGroup.rowStyle` (`CheckboxRowState`), `RadioGroup.optionStyle`
  (`RadioOptionState`), `ToggleGroup.itemStyle` (`ToggleItemState`),
  `Rating.starStyle` (`RatingStarState`), `OTPField.cellStyle`
  (`OTPCellState`), `Slider.thumbStyle` (`SliderThumbState`),
  `RangeSlider.thumbStyle` (`RangeSliderThumbState`) and
  `Select.triggerStyle` (the re-exported `SelectTriggerState`). The decision is
  recorded as `PLAN.md` D28.
- **One deviation from §3:** the plan did not list derived `testId`s for the
  radio options, rating stars or slider thumbs. They are required to write a
  runtime case at all (those items have no text a `TestElement` can be found
  by), and the other data-driven groups already derive one per item, so the
  parity fix landed with the feature: `${testId}-${value}`,
  `${testId}-star-${index}`, `${testId}-thumb`, and
  `${testId}-thumb-start`/`-thumb-end`.
- **Measured**:
  - `src/components/state-style.test.tsx` grew from 16 to **24 cases** — eight
    per-item payloads (checkbox parent mixed/checked/unchecked, radio checked,
    toggle pressed, 1-based stars, OTP filled cells, both slider thumbs) plus
    the `Select` trigger helper;
  - `runtime/state-style.runtime.test.tsx` grew from 6 to **10 cases** — radio
    selection, rating fill, checkbox-group mixed parent, select trigger open;
  - `nub run --filter @gpuixui/primitives test` → 34 files / **399 tests** (was
    391); `test:runtime` → 17 files / **194 tests** (was 190).
- **Both directions**: with `resolvePartStyle` returning `base` unchanged,
  `state-style.test.tsx` failed **24/24** and
  `runtime/state-style.runtime.test.tsx` failed **10/10**; restoring the
  resolver made both green. Command lines:
  `nub exec vitest run src/components/state-style.test.tsx` (exit 1 → exit 0)
  and `nub exec vitest run --config vitest.runtime.config.ts runtime/state-style.runtime.test.tsx`
  (exit 1 → exit 0), from `packages/primitives`.
- Docs: eight pages gained a "Per-item style" subsection and the prop row;
  `README.md`, `COMPONENTS.md` and `TODO.md` updated.
- Gates: `nub run check` (includes `check-types`), `nub run lint` and
  `nub run test` all exit `0`.

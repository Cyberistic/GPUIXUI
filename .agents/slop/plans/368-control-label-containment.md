# 368 — A control must contain its own label

| Field | Value |
| ----- | ----- |
| Phase | F (consistency / layout truth) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `065`, `074`, `082`, `097`, `343` |
| Status | done |

Self-contained: §0 the measured defect, §1 the decision, §2 the rule, §3 the
files, §4 commands, §5 the test plan and the two-direction proof, §6 STOP
conditions, §7 outcome, §8 acceptance.

---

## 0. Measured before the plan (2026-10-18, real `TestRenderer`, 1280×800)

Every text-bearing control was mounted at a bounded width with a 70-character
label, and the painted text element's bounds were read from the renderer
(`getElementBounds`). A text run that is a flex item keeps its intrinsic width:
the runtime does not shrink it, wrap it, or clip it, so the label paints over
whatever is beside the control.

| Surface (mounted at) | Control box | Painted label | Outside the control |
| -------------------- | ----------- | ------------- | ------------------- |
| `Button` (220 wide) | `x 12…232`, `h 32` | `x −68.5…312.5`, `h 17` | **80.5 px on each side** |
| `Toggle` (220 wide) | `x 12…232`, `h 32` | `x −68.5…312.5`, `h 17` | **80.5 px on each side** |
| `ToggleGroup` (240 wide) | `x 12…252`, `h 32` | `x 22…403`, `h 17` | **151 px past the right edge** |
| `CheckboxGroup` (240 wide) | `x 12…252` | `x 34…393`, `h 17` | **141 px past the right edge** |
| `RadioGroup` (240 wide) | `x 12…252` | `x 34…393`, `h 17` | **141 px past the right edge** |
| `Label` (100 %, 220 wide) | `x 12…232` | `x 12…371`, `h 17` | **139 px past the right edge** |
| `Select` trigger (220 wide, `fullWidth`) | `x 12…232`, `h 32` | value `x 23…404`; chevron `x 410…424` | value **172 px** past; the **chevron is pushed 192 px outside its own field** |
| `Select` list (220 trigger, 200-char option) | window 1280 | list row `x 19…1501` | the list is **1482 px wide**, 221 px past the window; its text is unreachable |

The two last rows are the same cause with visible consequences beyond
cosmetics: the select's dropdown affordance leaves the control, and a long
option label makes the list wider than the window.

What the runtime **does** support, measured in the same probes:

- a flex **item** with `flexShrink: 1` and `minWidth: 0` shrinks and its text
  wraps inside it (`<text>` in a row: 359 → 180 px wide, height 51);
- a div wrapper with `flexShrink: 1, minWidth: 0, overflow: hidden,
  whiteSpace: nowrap, textOverflow: ellipsis` shrinks a bare text child to the
  control's content box (the label painted `x 22…222` inside a `12…232` button);
- a `Text` inside a bounded block wraps (`Box width 220` → text `220 × 36`);
- GPUix's own `SelectValue` is a div and accepts a style: giving it the shrink
  style moved the chevron from `x 410` back to `x 207…221`, inside the trigger,
  and made the value text 178 px instead of 381.

## 1. The decision

**A control owns its text.** Two rules, chosen by what the surface is:

1. **A fixed-height control truncates.** `Button`, `Toggle`, a `ToggleGroup`
   item, and every part of a `Select` (trigger value, option row, group heading)
   has a fixed height by design. Its label gets one line, clipped with an
   ellipsis when it does not fit; the control's other content (a leading icon,
   the select chevron) stays inside the control.
2. **An auto-height row wraps.** A `Label`, a `CheckboxGroup` row's label, and a
   `RadioGroup` option's label may grow vertically; their text wraps at the row's
   width instead of spilling sideways. Descriptions and help text already wrap
   this way when bounded, and a settings row that grows is the honest layout.

The `Select` list is also **capped to the window**: `maxWidth` is the window's
width less the floating margin on both sides, so a long option label truncates
inside a list that fits on screen instead of painting past it.

Alternatives rejected:

- **`overflow: hidden` alone on the control** clips the paint but leaves the
  layout wrong: the chevron still sits outside the trigger and the text element
  still reports an out-of-bounds box, so nothing structural can guard it.
- **Truncating every label** would cut a checkbox description or a field label
  that has room to wrap.
- **Wrapping fixed-height controls** makes a two-line label paint outside a
  32 px control (measured: a 34 px text box in a 32 px button).
- **Letting the caller fix it** is what the library is for; every consumer would
  re-derive the same rule, and the select chevron cannot be fixed from outside.

## 2. The rule

Two style constants in `core/style.ts`, next to `controlStyle`:

```ts
/** A fixed-height control's label: one line, clipped with an ellipsis. */
export const controlLabelStyle: StyleDesc = {
  flexShrink: 1,
  minWidth: 0,
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};

/** A label in an auto-height row: it wraps instead of widening the row. */
export const shrinkTextStyle: StyleDesc = { flexShrink: 1, minWidth: 0 };
```

Applications:

- `Button` and `Toggle`: `{props.children}` is wrapped in
  `<div style={controlLabelStyle}>` (the label becomes one shrinkable flex item,
  so `leading`/`trailing` and the spinner keep their place).
- `ToggleGroup`: each item's `{option.label}` is wrapped the same way, and the
  item's chrome takes `shrinkLayoutStyle` so a group given a width shares it
  between its items instead of overflowing (`shrinkLayoutStyle` is renamed from
  `shrinkTextStyle` because it also sizes a container).
- `Select`: the value takes the shrink style on `SelectValue`; each option row
  wraps its text in `controlLabelStyle`; a group heading takes the same fields in
  its own style (a wrapper added 4 px to the measured heading height, so the
  plain div carries them); `selectContentStyle` gains a `maxWidth` and stretches
  its rows; the wrapper passes `viewport.width - trigger.left - FLOATING_MARGIN`;
  the content gets a `${testId}-content` locator so the cap is measurable.
- `Label`: the name `Text` takes `shrinkLayoutStyle` (the row is a flex row).
- `CheckboxGroup`: the label and description `Text`s take `shrinkLayoutStyle`
  (measured: the column needs nothing extra — the text's own shrink is enough).
- `RadioGroup`: the option label and description `Text`s take
  `shrinkLayoutStyle`.

No colour, spacing, radius or type value changes; this is layout containment and
uses no literal outside the two constants.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/core/style.ts` | `controlLabelStyle` + `shrinkTextStyle`, documented |
| `packages/primitives/src/core/index.ts` | re-export the two constants (core is the package's public contract) |
| `packages/primitives/src/components/Button.tsx` | wrap the label; header note |
| `packages/primitives/src/components/Toggle.tsx` | wrap the label |
| `packages/primitives/src/components/ToggleGroup.tsx` | wrap each item's label |
| `packages/primitives/src/components/Select.tsx` | value style, row/heading label wrapper, list `maxWidth`, `-content` testId |
| `packages/primitives/src/components/Label.tsx` | the name text shrinks |
| `packages/primitives/src/components/CheckboxGroup.tsx` | the row's text column shrinks |
| `packages/primitives/src/components/RadioGroup.tsx` | the option's texts shrink |
| `packages/primitives/src/components/{Button,selection,ToggleGroup,Select}.test.tsx` | one element-tree case per surface |
| `packages/primitives/runtime/overflow.runtime.test.tsx` | new matrix: no control paints text outside itself; select list capped |
| `packages/primitives/docs/{button,toggle,toggle-group,checkbox-group,radio-group,label,select}.mdx` | the label rule and the select list cap in Limitations |
| `COMPONENTS.md` | the affected Tier 1 rows record the rule |
| `TODO.md` | add and tick the task; refresh the runtime count |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/primitives test -- src/components/Button.test.tsx src/components/selection.test.tsx src/components/ToggleGroup.test.tsx src/components/Select.test.tsx` | the new element-tree cases and the existing ones pass |
| `nub run --filter @gpuixui/primitives test` | all offline tests pass (baseline: 43 files / 612 tests) |
| `nub run --filter @gpuixui/primitives test:runtime -- runtime/overflow.runtime.test.tsx` | every case passes |
| `nub run --filter @gpuixui/primitives test:runtime` | all runtime tests pass (baseline: 30 files / 591 tests) |
| `nub run check`, `nub run lint`, `nub run test` | exit 0 |

## 5. Test plan

### 5.1 Element tree

1. **`Button.test.tsx` — "a text label is one shrinkable, truncated item"**:
   `renderButton` with a long text label puts a div carrying
   `controlLabelStyle` around the children, and `leading`/`trailing` stay
   siblings of it. Before: the label is a raw string child with no wrapper.
2. **`selection.test.tsx` — "a row's label shrinks inside the row"** and the
   `Label` case: the painted `Text` style carries `flexShrink: 1`,
   `minWidth: 0`; the `CheckboxGroup` text column carries the same.
3. **`ToggleGroup.test.tsx` / `Select.test.tsx` — the item, value, row and
   heading each carry the containment**: `SelectValue` receives the five-field
   style; `selectContentStyle(theme, min, max, maxWidth)` carries `maxWidth`;
   the content's `testId` is `${testId}-content`.

### 5.2 Runtime (`runtime/overflow.runtime.test.tsx`, new)

4. **The containment matrix** — a 220 px column with one control per case and a
   70-character label. For `Button`, `Toggle`, `ToggleGroup`, `CheckboxGroup`,
   `RadioGroup`, `Label` and the `Select` trigger, every painted text node is
   inside the control's bounds (`x ≥ control.x`, `right ≤ control.right`,
   `y ≥ control.y`, `bottom ≤ control.bottom`). Before the fix each case fails
   with the numbers in §0; the matrix names the surface in the failure.
5. **The chevron** — a `fullWidth` select at 220 px with a long selected label:
   the chevron is inside the trigger (before: `x 410` for a trigger at
   `12…232`), and the value's text is inside too.
6. **The list cap** — a select whose option is a 200-character phrase opens a
   list no wider than `window − 2 × margin` (before: 1482 px in a 1280 px
   window), every option's text is inside the list, and a short label still
   hugs its trigger (so the cap cannot be a fixed width).

### 5.3 Two-direction proof

- Run the new runtime file against the unmodified source and record each
  failure's numbers (§7).
- Apply the fix; all green.
- Revert one surface at a time (wrap one control back to a bare label) and
  confirm its matrix case fails by name.
- Green suites, then `nub run check`, `nub run lint`, `nub run test`.

## 6. STOP conditions

1. Wrapping `Button.children` changes a button's hugging width, height, or its
   accessibility node in a way the existing name/role/geometry suites reject —
   then do not keep the wrapper for non-text children; branch on
   `textOf(children)` and record why.
2. `overflow: hidden` on a control clips its own `focusRing`, an attached
   `ButtonGroup`'s inset ring, or a `Select` list child — drop `overflow` from
   that surface (the shrink alone bounds the layout) and record it.
3. The runtime does not constrain the wrapped text (the probe does, but the real
   component may differ) — record the measured boxes and adjust the rule rather
   than asserting a style record alone.
4. A gate fails for an unrelated reason — report it.

## 7. Outcome

Implemented and measured.

- Two constants: `controlLabelStyle` (one line, clipped with an ellipsis) and
  `shrinkLayoutStyle` (a flex item that may shrink: text in a row, or a group
  item), both exported from `@gpuixui/primitives/core`.
- `Button` and `Toggle` wrap their label in the containment div (an empty button
  still paints no child); `ToggleGroup` wraps each item's label **and** shrinks
  the item; `Select` gives `SelectValue` the shrink style, wraps the option
  labels, puts the five fields on the heading style, caps the list's width, and
  names the content `${testId}-content`; `Label`, `CheckboxGroup` and
  `RadioGroup` shrink their text instead of widening the row.
- Measured after the fix (same probes as §0): every label sits inside its
  control; the select chevron is at `x 207…221` inside a trigger at `12…232`; a
  200-character option opens a list of `x 12…1272` in the 1280 px window with
  its text inside the list; a short label still hugs its trigger
  (`content.width` equals the trigger's within 1 px).
- The new runtime matrix fails in the old direction for every surface, by case
  name. Measured mutations: dropping the Button/Toggle wrapper fails 2 cases;
  the `SelectValue` style 1; the list cap 1; `Label`'s shrink 1; `RadioGroup`'s
  1; `ToggleGroup`'s item shrink 1 and its label wrapper 1. `CheckboxGroup`'s
  column shrink was measured redundant and removed (the text's own shrink is
  the fix).
- `runtime/fields.runtime.test.tsx`'s select helpers now find the listbox by its
  role instead of walking two parents up from an option (the row label is one
  level deeper), and the highlight case walks ancestors. That is a test-helper
  change, not a behaviour change.
- Docs, inventory, `TODO.md` and the plan index record the rule. Offline
  **43 files / 615 tests**, runtime **31 files / 600 tests**; `nub run check`,
  `nub run lint` and `nub run test` pass.

## 8. Acceptance

- [x] No text-bearing control paints its label outside its own bounds.
- [x] The select chevron stays inside its trigger with a long value.
- [x] A long option label cannot widen the list past the window.
- [x] A label with room still hugs and wraps as before.
- [x] Every case fails in the old direction and passes with the fix.
- [x] Docs, inventory, `TODO.md` and the index are updated.
- [x] `nub run check`, `nub run lint`, `nub run test` and the full runtime suite pass.

# 080 — State-aware `style`, slice 2: the group roots and the overlays

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | primitives workstream (`packages/primitives`) |
| Depends on | `079`, `030`, `040`, `041`, `047`, `072`, `075` |
| Status | **done** — landed 2026-10-18 (§8) |
| Source | `docs/component-api.md` §3 (components worktree); contracts with plan `079` |

Self-contained.

---

## 1. Why

Plan `079` adopted the shared state-aware `style` contract for the seven Tier 1
controls that own their own focus/checked state. The remaining components with a
public `style` prop and a state are the **group roots** (`CheckboxGroup`,
`RadioGroup`, `ToggleGroup`, `Rating`, `OTPField`, `Slider`, `RangeSlider`), the
one focusable container (`ScrollArea` — a labelled area is a `region` tab stop),
`Label` (`invalid`) and `Select` (its root carries `open`, and the visible
trigger has its own published state type). Without this slice the contract is
only half adopted and seven components would drift back to a plain `StyleDesc`.

## 2. State table (slice 2)

| Component | Type | Fields | Where `style` lands |
| --------- | ---- | ------ | ------------------- |
| `CheckboxGroup` | `CheckboxGroupState` | `disabled`, `invalid` | the `role="group"` box |
| `RadioGroup` | `RadioGroupState` | `disabled`, `invalid` | the `role="radiogroup"` box |
| `ToggleGroup` | `ToggleGroupState` | `disabled` | the group box (the group has no `invalid`) |
| `Rating` | `RatingState` | `disabled`, `invalid` | the `role="radiogroup"` box |
| `OTPField` | `OTPFieldState` | `disabled`, `invalid` | the group box |
| `Slider` | `SliderState` | `disabled`, `invalid` | the control box |
| `RangeSlider` | `RangeSliderState` | `disabled`, `invalid` | the control box |
| `Label` | `LabelState` | `invalid` | the label stack |
| `ScrollArea` | `ScrollAreaState` | `focused` | the viewport; `focused` is only ever true for a labelled (focusable) area |
| `Select` | `SelectState` | `open`, `disabled`, `invalid` | the `GpuixSelect` root |

Focus is a per-item state in the data-driven groups (a radio, a checkbox row, a
star, a slider thumb), so it is **not** on the group state. Styling an
individual item by its own state needs a per-item prop (`optionStyle`,
`rowStyle`, `itemStyle`, `thumbStyle`, `starStyle`, `cellStyle`) — a new API
decision, recorded as an open TODO row (see §6). `Select`'s visible trigger
already takes a `StateStyle<SelectTriggerState>` from the runtime; exposing it
as `triggerStyle` is the same open question and is not smuggled in here.

`style` on these roots is resolved with `resolvePartStyle` (plan `079`) after the
component's own rules, exactly like slice 1.

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `src/components/CheckboxGroup.tsx` | export `CheckboxGroupState`; `style?: StateStyle<CheckboxGroupState>`; resolve on the group box |
| `src/components/RadioGroup.tsx` | export `RadioGroupState`; same |
| `src/components/ToggleGroup.tsx` | export `ToggleGroupState`; same |
| `src/components/Rating.tsx` | export `RatingState`; same |
| `src/components/OTPField.tsx` | export `OTPFieldState`; same |
| `src/components/Slider.tsx` | export `SliderState`; same |
| `src/components/RangeSlider.tsx` | export `RangeSliderState`; same (own type so the two never drift into a shared name by accident) |
| `src/components/Label.tsx` | export `LabelState`; `style?: StateStyle<LabelState>`; resolve on the stack |
| `src/components/ScrollArea.tsx` | export `ScrollAreaState`; `style?: StateStyle<ScrollAreaState>`; resolve on the viewport after the ring |
| `src/components/Select.tsx` | export `SelectState`; `style?: StateStyle<SelectState>`; resolve on the `GpuixSelect` root |
| `src/components/index.ts` | export the ten state types |
| `src/components/state-style.test.tsx` | extend the slice-1 suite with one case per state |
| `runtime/state-style.runtime.test.tsx` | add two measured cases: a scroll region's focus state and a select's open state |
| the ten matching `docs/*.mdx` pages | "Style by state" subsection + the `style` type in the API table |
| `COMPONENTS.md` | one sentence in each of the ten Tier 1 notes |
| `TODO.md`, `.agents/slop/plans/README.md` | tick and index |

## 4. Commands and expected results

```sh
nub run --filter @gpuixui/primitives check-types      # exit 0
nub run --filter @gpuixui/primitives test             # exit 0
nub run --filter @gpuixui/primitives test:runtime     # exit 0
nub run check                                         # exit 0
```

## 5. Test plan

- **Offline**: one case per state in `state-style.test.tsx` — the callback
  records the documented fields and its colour wins; a `RadioGroup` with
  `disabled` and a `Rating` with `invalid` each report their own combination.
- **Runtime (two measured cases)**:
  1. a labelled `ScrollArea` — the callback paints one colour before focus and
     another after `focusNext()` (proves the region's `focused` state is live);
  2. a `Select` — the callback paints `open` while the list is open and the
     closed colour after Escape (proves `open` is the wrapper's real state).
- **Both directions**: make `resolvePartStyle` ignore the callback → the new
  cases fail; restore → green. Record the run in §8.

## 6. Out of scope — recorded, not forgotten

- Per-item styling for the data-driven groups (`optionStyle`, `rowStyle`,
  `itemStyle`, `thumbStyle`, `starStyle`, `cellStyle`) and a `Select`
  `triggerStyle`: these are new props over data, not a `style` on an existing
  part. Add a TODO row; do not invent the shape in this slice.
- `Progress`, `Meter`, `Spinner`, `Skeleton`, `Tooltip`, `InfoTip`, `Text`,
  `Box`, `Stack`, `Grid`, `Separator`, `Spacer`, `ButtonGroup`: no public
  interaction state beyond pointer rules (which `StyleDesc` already carries) or
  no `style` prop at all. They keep a plain `StyleDesc`.

## 7. STOP conditions

Same as `079` §6. Additionally: stop if a group's state cannot be derived
without adding an observer (it is always the component's own props).

## 8. Result

Landed 2026-10-18.

- Ten more parts accept `StateStyle<<Part>State>` and export the type:
  `CheckboxGroup`, `RadioGroup`, `ToggleGroup`, `Rating`, `OTPField`, `Slider`,
  `RangeSlider`, `Label`, `ScrollArea`, `Select`. All merge through the same
  `resolvePartStyle` seam as slice 1.
- Group and root states are the ones the **container** owns: `disabled`/
  `invalid` for the four selection groups, `Rating` and both value controls;
  `disabled` for `ToggleGroup`; `invalid` for `Label`; `focused` for a labelled
  `ScrollArea`; `open`/`disabled`/`invalid` for `Select`. Per-item focus and
  per-item values stay out because those items are data — recorded below.
- **Measured**:
  - `src/components/state-style.test.tsx` grew from 7 to **16 cases** — each new
    state payload plus the callback winning; the scroll case proves an
    unlabelled area always reports `focused: false`;
  - `runtime/state-style.runtime.test.tsx` grew from 4 to **6 cases**: a labelled
    ScrollArea repaints when `focusNext` lands on it, and a Select repaints when
    the list opens;
  - `nub run --filter @gpuixui/primitives test` → 34 files / **391 tests** (was
    382); `test:runtime` → 17 files / **190 tests** (was 188).
- **Both directions**: with `resolvePartStyle` ignoring the caller's style,
  **16/16** state-style cases failed offline and **10** runtime cases failed
  (the 6 state-style cases plus four existing suites that use object styles);
  restoring it made both runs green.
- Docs: ten pages gained "Style by state" + the verification bullet;
  `COMPONENTS.md` rows and counts updated; `README.md` lists every exported
  state type.
- Still open (recorded in `TODO.md` and §6): per-item styling for the
  data-driven groups (`optionStyle`/`rowStyle`/`itemStyle`/`thumbStyle`/
  `starStyle`/`cellStyle`) and `Select`'s `triggerStyle`. Those are new props
  over data, not a `style` on an existing part.

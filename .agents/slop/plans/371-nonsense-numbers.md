# 371 — A nonsense number must never reach the paint

| Field | Value |
| ----- | ----- |
| Phase | F (integration and polish) |
| Owner | primitives workstream |
| Depends on | `030`, `040`, `041`, `047`, `054`, `077`, `362`, `366` |
| Status | done |

Self-contained: §0 the measured values, §1 the decision, §2 the rule, §3 the
files, §4 commands, §5 the test plan and the two-direction proof, §6 STOP
conditions, §7 outcome, §8 acceptance.

---

## 0. What was measured before the plan (2026-10-18)

Every public numeric prop was mounted in the real `TestRenderer` with `NaN`,
`Infinity`, a negative number and an inverted pair. The suite numbers are in §7;
the observations:

| Component | Input | Measured before |
| --------- | ----- | --------------- |
| `NumberField` | `min={NaN} defaultValue={5}` | paints **`"NaN"`**; `ArrowUp` reports nothing (the painted value is NaN, so the no-op guard suppresses it) |
| `NumberField` | `max={NaN} defaultValue={5}` | paints **`"NaN"`** |
| `NumberField` | `min={100} max={0} defaultValue={150}` | paints **`"0"`** — the inverted pair collapses to `max`, so the field claims a range it does not have |
| `NumberField` | `step={Infinity}` then `ArrowUp` | paints **`"Infinity"`** and reports `Infinity` |
| `Icon` | `size={NaN}` | the painted style loses `width`/`height`: the icon is **0 high and 1256 wide** (a full-width invisible mark) |
| `Icon` | `size={-8}` | paints `width: -8, height: -8` |
| `Spinner` | `size={NaN}` | every dot loses `width`/`height`; the spinner is a **0-high row** |
| `Skeleton` | `height={NaN}` | the height is dropped; the placeholder paints **0 high** |
| `Grid` | `columns={NaN}` | `gridTemplateColumns: NaN` reaches the style (layout falls back to one column) |

The pattern is one class: a public number is passed into layout or text without
being made total. Two rows of the same class shipped before — `Rating max`
(plan `366`) and `NumberField`'s bound (plan `362`) — and each was fixed one
component at a time.

Two props already do this well and are the reference rule:
`clampLines` (`core/style.ts`) ignores a non-finite `Text.clamp`, and
`normalizeRange` (`core/value.ts`) swaps an inverted slider range and ignores a
non-finite bound.

## 1. The decision

**A public numeric prop is total: a value the component cannot paint becomes the
prop's documented default, never `NaN`, `Infinity` or a negative length.**

- A **length** (`Icon.size`, `Spinner.size`, `Skeleton.width`/`height`) is a
  finite, non-negative number; anything else falls back to that prop's default
  (`Icon` → `ICON_SIZES.md`, `Spinner` → `theme.iconSize.md`, `Skeleton.width` →
  `"100%"`, `Skeleton.height` → the body line height). `0` is kept: an empty
  box is a value a caller may ask for.
- A **track count** (`Grid.columns`, `Grid.rows`) is a finite count floored to
  at least 1; a non-finite count is 1.
- A **field bound** (`NumberField.min`/`max`) is a finite number or absent;
  a non-finite bound is ignored, and an inverted pair is swapped — the rule
  every slider and meter already follows. `step` is a finite positive number or
  1, so an infinite step cannot report `Infinity`.
- `Skeleton`'s string dimensions are untouched: a percentage is a valid
  `StyleDesc` length and is the caller's own layout decision.
- `Box`/`Stack`/`Grid`'s `style` prop is untouched: `StyleDesc` is the caller's
  escape hatch and validating it would duplicate the runtime.

Alternatives rejected:

- **Clamp every length to 1** hides a caller's mistake instead of using the
  documented default, and a 1 px icon is not the icon the component describes.
- **Treat an inverted field range as a caller error and paint nothing** — the
  remaining four controls swap it (`normalizeRange`), so the field would be the
  only one with a different answer to the same input.
- **A shared package-wide `clamp`** would be a new abstraction for five call
  sites; the existing `normalizeRange` is the shape, not a new home.

## 2. The rule

```ts
// core/value.ts — the one length rule
export const usableLength = (
  value: number | undefined,
  fallback: number,
): number =>
  value !== undefined && Number.isFinite(value) && value >= 0 ? value : fallback;
```

```ts
// core/number.ts — the field's bound rule
export const normalizeNumberRange = (range: NumberRange): NumberRange => {
  const min = Number.isFinite(range.min) ? range.min : undefined;
  const max = Number.isFinite(range.max) ? range.max : undefined;
  const step = Number.isFinite(range.step) && range.step > 0 ? range.step : 1;
  return min !== undefined && max !== undefined && min > max
    ? { min: max, max: min, step }
    : { min, max, step };
};
```

`clampNumeric`, `stepNumber` and `numberRange` all normalise first, so the
paint, the announcement, the stepper states and the keyboard agree.

```ts
// core/layout.ts — the count rule
const tracks = (count: number): number =>
  Number.isFinite(count) ? Math.max(1, Math.floor(count)) : 1;
```

```ts
// icons/sizes.ts — the icon's own copy (icons cannot depend on primitives)
export const iconPixels = (size: IconSize | number): number =>
  typeof size === "number"
    ? Number.isFinite(size) && size >= 0
      ? size
      : ICON_SIZES.md
    : ICON_SIZES[size];
```

## 3. Files to change

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/core/value.ts` | new `usableLength` |
| `packages/primitives/src/core/value.test.ts` | cases for `usableLength` |
| `packages/primitives/src/core/number.ts` | `normalizeNumberRange`; `clampNumeric`/`stepNumber`/`decideNumberKey` normalise |
| `packages/primitives/src/core/number.test.ts` | non-finite bounds, inverted pair, infinite step |
| `packages/primitives/src/components/NumberField.tsx` | `numberRange` returns the normalised range; `atMin`/`atMax` read it |
| `packages/primitives/src/components/NumberField.test.tsx` | the input's value for the nonsense bounds |
| `packages/primitives/src/core/layout.ts` | `gridStyle` uses `tracks` for columns and rows |
| `packages/primitives/src/core/layout.test.ts` | non-finite / fractional / negative counts |
| `packages/primitives/src/core/loading.ts` | `spinnerDotStyle` and `skeletonStyle` use `usableLength` |
| `packages/primitives/src/core/loading.test.ts` | non-finite dot side, skeleton width and height |
| `packages/primitives/src/components/Spinner.tsx` | its default dot size goes through `usableLength` |
| `packages/icons/src/sizes.ts` | `iconPixels` total |
| `packages/icons/src/sizes.test.ts` | `NaN`, `Infinity`, negative and zero |
| `packages/primitives/runtime/nonsense-numbers.runtime.test.tsx` | new: the class matrix in the real renderer |
| `packages/primitives/docs/{number-field,icon,spinner,skeleton,grid}.mdx` | state the fallback rule |
| `packages/icons/docs/icon.mdx` | state the `size` fallback |
| `COMPONENTS.md` | the five rows' notes and the runtime count |
| `TODO.md` | the task and its tick |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Commands and expected results

| Command | Expected |
| ---- | -------- |
| `nub run --filter @gpuixui/icons test` | the new `iconPixels` cases pass (24 + 3) |
| `nub run --filter @gpuixui/primitives test` | the new core and element cases pass |
| `nub run --filter @gpuixui/primitives test:runtime` | the new matrix passes; every other suite stays green |
| `nub run check` | exit 0 |
| `nub run lint` | exit 0 |
| `nub run test` | exit 0 |

## 5. Test plan

Every case names the rule it guards, and each must fail with the guard removed.

### 5.1 Offline

1. **`usableLength`** — a finite non-negative number is kept (including `0`); a
   non-finite or negative one is the fallback.
2. **`normalizeNumberRange`** — `NaN`/`Infinity` bounds become absent; `min > max`
   swaps; `step <= 0` and a non-finite step become 1.
3. **`clampNumeric` / `stepNumber`** — `min={NaN}` leaves the value alone;
   `min={100} max={0}` clamps into `[0, 100]` (so `150` → `100`); an infinite
   step moves by 1.
4. **`gridStyle`** — `columns={NaN}`/`{Infinity}` is 1; `2.7` is 2; `-3` and `0`
   are 1; `rows` follows the same rule.
5. **`spinnerDotStyle`** — a non-finite or negative `size` paints
   `theme.iconSize.md`; `0` stays 0.
6. **`skeletonStyle`** — a non-finite width is `"100%"`, a non-finite height is
   the body line height; a string width is passed through untouched.
7. **`iconPixels`** — `NaN`/`Infinity`/`-8` are `ICON_SIZES.md`; `0` is 0; a
   named size is unchanged.
8. **The rendered field** — `renderNumberField` with `min={NaN}` and
   `max={NaN}` hands the input the text `"5"`, and the inverted pair hands it
   `"100"`.

### 5.2 Runtime (`runtime/nonsense-numbers.runtime.test.tsx`)

One scene per rule, mounted in the real `TestRenderer`:

9. **No painted number is nonsense** — walk every retained element of a tree
   that mounts an `Icon size={Infinity}`, a `Spinner size={NaN}`, a
   `Skeleton height={NaN}` and a `Grid columns={NaN}`: no style value is a
   non-finite number and no `width`/`height` is negative.
10. **No painted text is nonsense** — `paintedText()` contains neither `"NaN"`
    nor `"Infinity"` for a field with `min={NaN}`, `max={NaN}` or an infinite
    step, and the finite values are painted (`"5"`, `"100"`).
11. **The fallbacks paint** — the icon is a square at `ICON_SIZES.md`, the
    spinner is `theme.iconSize.md` high, the skeleton is a body line high, and
    an inverted field paints `"100"` for `defaultValue={150}`.
12. **An inverted field still steps** — `ArrowUp` on the inverted field reports
    `100` (the top of the swapped range) and `ArrowDown` reports `99`, not
    `Infinity`.

### 5.3 Two-direction proof

- Remove `usableLength` from `spinnerDotStyle`: case 11 fails with a 0-high
  spinner; remove it from `skeletonStyle`: the skeleton is 0 high.
- Remove the `iconPixels` guard: the icon paints `0 × 1256` and case 11 fails.
- Remove `normalizeNumberRange` from `numberRange`: cases 8, 10 and 12 fail with
  `"NaN"`/`"Infinity"` in the paint, the measured values in §0.
- Restore everything, then run the three gates.

## 6. STOP conditions

1. `usableLength` cannot be imported where it is needed without a cycle (core
   modules only) — stop and report the import path instead of copying it into a
   component.
2. The runtime clamps a `0`-sized icon to 1 px, so `0` cannot be kept — record
   the measurement and make the documented default the only fallback.
3. An existing suite asserts the old nonsense behaviour — report the case by
   name rather than editing the assertion.
4. A gate fails for an unrelated reason — report it.

## 7. Outcome

Implemented.

- `core/value.ts` exports `usableLength`; `core/number.ts` exports
  `normalizeNumberRange` and routes `clampNumeric`/`stepNumber` through it;
  `numberRange` (the component) returns the normalised range, so the paint,
  announcement, stepper states and keys agree.
- `icons/sizes.ts` makes `iconPixels` total (a non-finite or negative pixel count
  is `ICON_SIZES.md`; `0` is kept). `core/loading.ts` reads a skeleton dimension
  through its own `dimension` rule (a string percentage passes through) and a
  spinner dot side through `usableLength`; `gridStyle` floors a finite count and
  reads anything else as one track.
- Tests: `value.test.ts` (+2), `number.test.ts` (+5), `layout.test.ts` (+1),
  `loading.test.ts` (+2), `NumberField.test.tsx` (+1), `sizes.test.ts` (+1),
  and a new 4-case `runtime/nonsense-numbers.runtime.test.tsx`. Offline 628 on
  its own (638 after plan `370` merged), runtime **606 on its own, 607 in 32
  files as merged with plan `370`**.
- Both-direction proof, each guard reverted once and restored:
  - identity `normalizeNumberRange` → the field paints `['NaN','NaN','0','5']`
    and the swapped field reports nothing;
  - step guard removed → `ArrowUp` reports `Infinity`;
  - raw `iconPixels` → the icon paints **1256** wide instead of `md`;
  - raw dot/dimension → the spinner is **0** high and the skeleton `NaN`;
  - `tracks` reverted → `gridTemplateColumns` is `NaN`.
- Docs: `number-field.mdx` (Bounds), `grid.mdx`, `spinner.mdx`,
  `skeleton.mdx`, `icons/docs/icon.mdx`; the five `COMPONENTS.md` rows and the
  runtime count; `TODO.md`; the plan index.

## 8. Acceptance

- [x] `Icon`, `Spinner`, `Skeleton`, `Grid` and `NumberField` never paint
      `NaN`, `Infinity` or a negative length for any public numeric prop.
- [x] The field's non-finite bounds are ignored and an inverted pair is swapped.
- [x] The new tests fail with the guards removed (both directions recorded).
- [x] Every touched component's docs page states the fallback rule.
- [x] `COMPONENTS.md`, `TODO.md` and the plan index are current.
- [x] `nub run check`, `nub run lint` and `nub run test` pass.

# 580 — A blank `formatValue` silences a value control

**Phase:** F (integration and polish) · **Owner:** primitives · **Depends on:** 026, 027, 053, 054, 577

## 0. The bug

`Meter`, `Slider` and `RangeSlider` announce their value through
`aria-valuetext` — GPUix 0.10.0 has no `aria-valuenow` (plan 020 §1.4). All
three document `formatValue`'s default as `String(value)`, and all three wrote
the formatter's result through:

```ts
props.formatValue?.(value) ?? String(value)   // Meter
formatValue?.(value) ?? String(value)         // sliderValueText
```

`??` falls back only for `undefined`. A formatter that returns a **blank
string** — a computed `\`${value}${unit}\`` whose unit string is missing, or a
translation lookup that did not resolve — therefore erases the announcement
entirely. The control still paints and takes focus; assistive technology hears
no value. That is the same class plan 026 fixed for names (`Spinner`'s
documented `"Loading"` survived a blank label) and plan 577 for captions.

## 1. Evidence

Element tree, before the change:

```
renderMeter({ value: 12, formatValue: () => "   " })
  aria-valuetext: "   "

renderSlider({ value: 42, formatValue: () => "   " }, …)
  aria-valuetext: "   "

renderRangeSlider({ formatValue: () => "" }, …, span [20, 60])
  thumb valuetexts: ["", ""]
```

After: `"12"`, `"42"`, `["20", "60"]`.

Both new cases fail against the old code with exactly those strings.

## 2. Changes

### 2.1 `packages/primitives/src/core/value.ts`

Add the one announcement rule beside `clampValue`:

```ts
export const valueText = (value: number, formatted: string | undefined): string =>
  Option.getOrElse(usableText(formatted), () => String(value));
```

It imports `usableText` from `./text.js` (plan 579's shared blank-string rule).
The `string | undefined` parameter is the optional formatter's result; it is
lifted immediately.

### 2.2 `packages/primitives/src/components/Slider.tsx`

`sliderValueText` keeps its signature (it is a public export) and becomes:

```ts
export const sliderValueText = (value, formatValue?) =>
  valueText(value, formatValue?.(value));
```

Both `Slider` and `RangeSlider` read it already, so both are fixed.

### 2.3 `packages/primitives/src/components/Meter.tsx`

`aria-valuetext={valueText(value, props.formatValue?.(value))}`.

No paint, layout or callback changes; a non-blank formatter result is used
verbatim.

### 2.4 Documentation

- `docs/meter.mdx`, `docs/slider.mdx`, `docs/range-slider.mdx` — the
  `formatValue` API row states that a blank result falls back to the value; each
  Verification list names the case.
- `COMPONENTS.md` — append the rule to the Slider, Range slider and Meter rows.
- `TODO.md` — tick the task.

## 3. Test plan

- `src/components/Meter.test.tsx` → `falls back to the value when the formatter
  says nothing`: `value={12}`, `formatValue={() => "   "}` → `aria-valuetext`
  `"12"`.
- `src/components/Slider.test.tsx` → `falls back to each value when the formatter
  says nothing`: `Slider` with `value={42}` and `RangeSlider` with span
  `[20, 60]`, both with a blank formatter → `"42"` and `["20", "60"]`.

### Both directions

1. With the old `??` expression, run:

   ```sh
   cd packages/primitives
   nub exec vitest run src/components/Meter.test.tsx src/components/Slider.test.tsx
   ```

   Expected: **2 failed / 22 passed** — `"   "` where `"12"` / `"42"` was
   expected.
2. Apply the change and run the same command. Expected: **24 passed**.
3. Gates:

   ```sh
   nub run --filter @gpuixui/primitives test
   nub run check
   nub run lint
   nub run test
   ```

   Expected: primitives **51 files / 743 tests**; everything green.

No runtime assertion changes: the attribute is already proven to reach
AccessKit in the value suite (plan 053); this plan only changes its text when a
formatter is blank, which is visible in the element tree.

## 4. STOP conditions

- A caller is found that legitimately wants an **empty** announcement (for
  example a purely decorative range): the API has no such contract, and a
  control that declares itself a slider must announce a value. Record the need
  in `TODO.md` rather than weakening the rule.
- `sliderValueText`'s public signature must change: stop and report; it is in
  the package root.
- A change is needed outside `packages/primitives`: record it in `TODO.md`.

## 5. Acceptance

- A blank formatter result announces the numeric value on all three parts; a
  real formatted string is unchanged.
- Both new cases fail against the old `??` fallback and pass after it.
- `nub run check`, `nub run lint`, `nub run test` pass.
- The three pages, `COMPONENTS.md` and `TODO.md` record the rule and plan 580.

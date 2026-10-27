# Plan 392 — Six Tier 1 primitives get their shadcn-shaped surface

**Status:** landed 2026-10-27.
**Workstream:** components.
**Depends on:** the primitives' `Progress`, `Slider`, `RangeSlider`, `Separator`,
`Skeleton`, `Toggle` and `ToggleGroup` (all shipped), the `button`/`hint`
subpath pattern in `packages/primitives/package.json`, and the package page
template in `docs/preview-strategy.md`.

## 1. Why

Six concepts in `COMPONENTS.md`'s Tier 1 table had a primitive and no surface in
`@gpuixui/components`: a consumer of the composition library could not import
`Progress`, `Slider`, `Separator`, `Skeleton`, `Toggle` or `ToggleGroup`
without reaching the unstyled package or rebuilding the shadcn part structure,
the `max`/indeterminate contract, the decorative decision or the `animate`
switch. The primitives already own every paint, gesture and key; the missing
half is the shape a shadcn page documents.

## 2. Files

### Primitives: five re-export seams

- `packages/primitives/src/progress.ts` — `Progress` + four parts, their types,
  `ProgressSize`/`ProgressTone`.
- `packages/primitives/src/slider.ts` — `Slider`, `RangeSlider`, `sliderRange`,
  `sliderValueText`, their types, `SliderOrientation`.
- `packages/primitives/src/separator.ts` — `Separator` and its props.
- `packages/primitives/src/skeleton.ts` — `Skeleton`, `renderSkeleton`, props,
  `SkeletonSpec`.
- `packages/primitives/src/toggle.ts` — `Toggle`, `pressedValueText`, props,
  `ToggleVariant`.
- `packages/primitives/src/toggle-group.ts` — `ToggleGroup`, `ToggleGroupItem`,
  `toggleGroupValue(s)`, the two mode props and their types.
- `packages/primitives/package.json` — `./progress`, `./slider`,
  `./separator`, `./skeleton`, `./toggle`, `./toggle-group` entries. A subpath,
  not the barrel: the barrel route costs 52 modules / 416 KiB.

### Components: six modules and two rules

- `packages/components/src/progress.tsx` — reads `value`/`max` through
  `progress/logic.ts`, always paints the track and fill after the children,
  re-exports the four parts.
- `packages/components/src/progress/logic.ts` — `progressShare`: absence for a
  value the bar cannot measure; the documented 100 for a maximum it cannot
  divide by; clamped to 0–100.
- `packages/components/src/slider.tsx` — one `Slider` whose `value` is
  `number | readonly [number, number]`; `sliderMode` chooses the primitive;
  re-exports `isSliderSpan` so a caller can narrow the union.
- `packages/components/src/slider/logic.ts` — `isSliderSpan`, `sliderMode`.
- `packages/components/src/separator.tsx` — `decorative` (default `false`);
  a semantic rule paints the primitive inside a `role="separator"` wrapper that
  stretches on the rule's cross axis.
- `packages/components/src/skeleton.tsx` — `animate={false}` maps to the
  primitive's still frame; leaving it out keeps the motion provider's answer.
- `packages/components/src/toggle.tsx`, `toggle-group.tsx` — re-export seams;
  the primitive is already the shadcn shape.
- `packages/components/src/inventory.ts`, `src/index.ts`, `examples/*`,
  `examples/index.ts`, `src/surface.budget.ts`.

### Docs

- `packages/components/docs/{progress,slider,separator,skeleton,toggle,toggle-group}.mdx`.
- `apps/docs/src/components/docs/{progress-values,slider-values,separator-roles,skeleton-states,toggle-toolbar,toggle-group-toolbar}-demo.tsx`
  and their six rows in `demos.tsx`.
- `apps/docs/src/lib/related.ts` — each page joins its primitive's family.
- `apps/docs/README.md` — six ledger rows.
- `COMPONENTS.md` — the six Tier 1 rows gain the surface sentence and their
  native test count.
- `docs/component-api.md` — §8 names the parts (`Progress*`, `Toggle group`) and
  says the executed table now reads Tier 1 as well as Tier 2.

## 3. Guards the contract asked for

| Case | File |
| ---- | ---- |
| `max` states the share; indeterminate on no value/`null` | `src/behaviour/progress.test.tsx` |
| one step, ten on PageUp/PageDown, Home/End | `src/behaviour/slider.test.tsx` |
| a disabled slider takes no key | `src/behaviour/slider.test.tsx` |
| a range keeps from ≤ to | `src/behaviour/slider.test.tsx` |
| decorative absent / semantic present in the a11y tree | `src/behaviour/separator.test.tsx` |
| pulse stops for `animate={false}` and a reduced provider | `src/behaviour/skeleton.test.tsx` |
| Toggle announces its pressed state | `src/behaviour/toggle.test.tsx` |
| single group: one tab stop, one selection, deselects | `src/behaviour/toggle-group.test.tsx` |
| each paints the active platform's role | all six behaviour files |

Every case is proven by reverting the module it guards and watching it fail
(the report records the six directions); `progressShare`, `isSliderSpan` and
`sliderMode` also have table cases in `src/<name>/logic.test.ts`.

## 4. STOP conditions

1. A primitive cannot support a behaviour without changing the primitive — stop
   and report rather than forking the rule.
2. `aria-valuenow`/`aria-pressed` cannot be published by 0.11.0 — record the gap
   on the page and the row; do not invent the attribute.
3. The entry's module or byte budget moves without `surface.budget.ts` naming
   the modules — stop and record.

Condition 2 was met: both states are announced through `aria-valuetext`, held by
the behaviour suites and stated in each page's Accessibility section.

## 5. Commands

```sh
nub run --filter @gpuixui/components check-types
nub run --filter @gpuixui/components test
(cd packages/components && nub exec vitest run --config vitest.behaviour.config.ts \
  src/behaviour/progress.test.tsx src/behaviour/slider.test.tsx \
  src/behaviour/separator.test.tsx src/behaviour/skeleton.test.tsx \
  src/behaviour/toggle.test.tsx src/behaviour/toggle-group.test.tsx)
nub run --filter @gpuixui/primitives test
nub run --filter @gpuixui/docs test
nub run check
```

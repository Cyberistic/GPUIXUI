# 602 — A `RangeSlider` thumb's focus ring outlives focus on the pinned runtime

**Phase:** F (verification truth) — **implementation**
**Depends on:** `053`, `063`, `081`, `084`, `089`, `332`, `583`, `590`, `591`, `596`, `601`
**Owns:** `packages/primitives` (`Slider.tsx`, a runtime suite and the page),
`COMPONENTS.md`, `.agents/slop/plans/README.md`, `TODO.md`.

## 1. The evidence

`RangeSlider` keeps which thumb holds focus in local state written by a thumb's
`onFocus` and cleared by its `onBlur`, then merges it with the native-focus
tracker:

```ts
const mergedFocus = Option.isSome(focusedIndex) ? focusedIndex : trackedIndex;
```

That is plan `601`'s defect, one component later. The pinned 0.10.0 release
build never dispatches `onBlur` (plan `583`), so `focusedIndex` is never cleared
and wins the merge forever: a thumb the user has left keeps painting a **second
focus ring**.

Measured 2026-10-19 in the real `TestRenderer` (1280 × 800, the store's
release-tag build). The probe clicked the track (which moves focus to the nearer
thumb, plan `063`), then clicked a `Button before` outside the slider and waited
for the tracker (`settleFocus`):

| Step | Focused element | Painted rings |
| --- | --- | --- |
| after the track click | `rs-thumb-end` | `rs-thumb-end` |
| after clicking `before` | `before` | **`before`, `rs-thumb-end`** |

`Slider` is the control: it paints its single thumb from `useFocus`, which
plan `591` taught to clear a stale event state against the tracker. `OTPField`
(plan `591`) and the roving composites (plan `601`) have their own clears.
`RangeSlider` hand-rolls the same state and merge and was missed.

## 2. The rule

**A focus owner uses the one hook that clears stale item focus against the
tracker — `useRovingFocus` — instead of a private copy.**

`RangeSlider`'s thumb focus is exactly a roving item set: an id map, an event
cursor, and a tracker fallback. `useRovingFocus` (plan `601`) already owns that
contract, including the effect that clears the event cursor when a sample names
none of the registered items. Adopt it and delete the local `thumbIds`,
`focusedIndex`, `trackedId`, `trackedIndex` and `mergedFocus`.

- `RangeSliderFocus.focusedIndex` widens from `Option.Option<0 | 1>` to
  `Option.Option<number>` (it is not a public export; the render compares
  against `0 | 1`, which cannot arrive for an unregistered index).
- `registerThumb` becomes `focus.registerItem`.
- `focusThumb(index)` calls `focus.idOf(index)` for `focusElement` and
  `focus.onFocus(index)` for the event cursor.
- The `onFocus`/`onBlur` handlers are `focus.onFocus`/`focus.onBlur`.

No other component changes. `Slider` keeps `useFocus`; the parser and value
maths are untouched.

## 3. Files to change

| File | Change |
| --- | --- |
| `packages/primitives/src/components/Slider.tsx` | `RangeSlider` uses `useRovingFocus`; drop the duplicate id map, cursor and merge; widen `RangeSliderFocus.focusedIndex`; remove the now-unused `useState`/`trackedFocusIndex`/`useNativeFocusId` imports if nothing else needs them |
| `packages/primitives/runtime/focus-loss.runtime.test.tsx` | add the `RangeSlider` case to the class matrix (a track click focuses the end thumb, clicking `before` leaves one ring) |
| `packages/primitives/docs/range-slider.mdx` | the focus paragraph states that the ring clears when focus leaves, on both the event runtime and the tracker |
| `COMPONENTS.md` | the Range slider row records plan `602` |
| `.agents/slop/plans/README.md` | index this plan |
| `TODO.md` | one ticked row under the primitives workstream |

## 4. Test plan

**Runtime — add one case to `runtime/focus-loss.runtime.test.tsx`** (the file
plan `601` created for exactly this class; every case opens a fresh window):

6. `RangeSlider` (`defaultValue={[20, 60]}`): click the track (focus lands on
   the nearer thumb), `settleFocus`, assert the thumb paints a ring; click
   `before`, `settleFocus` → the thumb paints **no** ring and the window paints
   exactly one ring (the button).

**Both directions.**

- With the local state restored (the pre-fix shape): the case fails with two
  rings (`before`, `rs-thumb-end`) — measured in §1.
- With `useRovingFocus`: the case passes. The existing range-slider cases
  (`value`, `focus-ring`, `disabled`, `tab-order`, `roving-arrows`) must stay
  green, and they prove the ring still paints while a thumb really holds focus.

## 5. Commands and expected results

```sh
cd packages/primitives

nub exec vitest run --config vitest.runtime.config.ts \
  runtime/focus-loss.runtime.test.tsx
# expect: 6/6 pass; with the local state restored, the RangeSlider case fails

nub exec vitest run --config vitest.runtime.config.ts \
  runtime/focus-ring.runtime.test.tsx \
  runtime/disabled.runtime.test.tsx \
  runtime/tab-order.runtime.test.tsx \
  runtime/roving-arrows.runtime.test.tsx \
  runtime/value.runtime.test.tsx \
  runtime/state-style.runtime.test.tsx
# expect: all pass

nub run --filter @gpuixui/primitives test     # offline suite
nub run check
```

## 6. STOP conditions

- Stop if a thumb stops painting a ring while `getFocusedElementId()` names it
  (the sample and the paint disagree); report the measurement.
- Stop if adopting the hook changes the tab stops: both thumbs stay real tab
  stops (`tabIndex 0`; neither is removed by `disabled`), unlike the roving
  composites' single stop.
- Do not touch `Slider`'s `useFocus`, the value maths or the pointer contract.
- Do not add a second clear effect alongside `useRovingFocus`: one owner.

## 7. Acceptance

- After focus leaves a `RangeSlider`, no thumb paints a ring; the window paints
  exactly the outside control's ring.
- While a thumb really holds native focus it still paints the themed ring, and
  both thumbs remain tab stops.
- The duplicate id map/cursor/merge is gone from `Slider.tsx`; one hook owns it.
- The page, inventory, plan index and `TODO.md` agree; offline suite, scoped
  runtime suites and `nub run check` are green.

## 8. Result (2026-10-19)

- Before: a track click focused `rs-thumb-end`; after clicking `before`, the
  window painted `before` **and** `rs-thumb-end` (the probe in §1).
- After `useRovingFocus`: the same sequence paints one ring (`before`), and the
  thumb rings while focused.
- `Slider.tsx` loses the local `thumbIds` map, `focusedIndex` state, tracked
  merge and three imports; `useRovingFocus` is the only focus owner.
- Scoped: `focus-loss` 6/6, `focus-ring`, `disabled`, `tab-order`,
  `roving-arrows`, `value`, `state-style` green. Offline 59 files / 820 tests;
  full runtime 53 files / 743 tests green on the release-tag build.

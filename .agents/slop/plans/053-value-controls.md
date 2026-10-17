# 053 — Value controls: `Slider`, `RangeSlider`, `Meter`

- **Phase:** C (Tier 1 completion). **Owner:** primitives workstream.
- **Depends on:** `030`, `040`, `041`, `047`, `049`.
- **Status:** done — implemented, measured in the real renderer; evidence in §11.
  `COMPONENTS.md` keeps the rows at `wip` (the docs-site page and the
  published-binary confirmation are the remaining bar, as for every Tier 1 row).
- **Why:** `COMPONENTS.md` lists Slider, Range slider and Meter as Tier 1 rows
  with **no owner**. They are single-purpose render primitives built from `div`
  plus a keyboard/pointer contract — the definition of this package, not of
  `packages/components` (which composes Tier 2 surfaces). This plan claims those
  three rows for `@gpuixui/primitives` and builds them to the same bar as every
  other Tier 1 row: code, a test that can fail, an example, a docs page, an
  inventory entry, and a measured interaction in the real GPUix renderer.

## 1. What is new, and what is deliberately reused

| Piece | Decision | Reason |
| ----- | -------- | ------ |
| Value maths (`clamp`, snap, fraction, keyboard, pointer) | new `core/value.ts` | it is pure, so it is the part that can be proven without a runtime; a slider, a range slider and a meter are one arithmetic model |
| Slider paint (track, rail, fill, thumb) | new section in `core/style.ts` | every paint in this package is resolved from a spec in one place |
| Meter paint | **reuse** `progressTrackStyle` / `progressFillStyle` | a meter is a bar with a range; a second bar painter would drift from `Progress` |
| Keyboard | extend `core/keyboard.ts`? **No** | arrows/page/home/end for a *value* are not the *index* moves in `decideMove`; the value contract lives beside the value maths in `core/value.ts` |
| Range slider | one component file with `Slider` | they share the geometry; the range case is the same rail with two thumbs and a crossing rule |

**Deviation from shadcn/ui:** shadcn's `Slider` takes an array of values and a
compound `SliderPrimitive` tree. Here a single value is `Slider` and two values
are `RangeSlider`, because each is a different ARIA contract (one slider vs two
sliders in one group). Recorded in `COMPONENTS.md` like `RadioGroup`'s
data-over-children deviation (D16).

## 2. Runtime facts this plan depends on (verify, do not assume)

Read from the published `@gpuix/react` / `@gpuix/native` 0.10.0 types and the
GPUix source (`references/gpuix`, Apache-2.0):

1. `aria` roles `slider`, `meter` **are mapped** by AccessKit
   (`packages/native/src/accessibility.rs`, `role_from_aria`). There is **no**
   `aria-valuenow`, `aria-valuemin`, `aria-valuemax` — only `aria-valuetext`
   becomes AccessKit's value. This is the same limitation as `Progress`.
2. Mouse events carry **window coordinates** (`EventPayload.x/y`), and
   `NativeRenderer.getElementBounds(id)` returns `{x,y,width,height}`. Together
   they let a component map a click to a fraction of its own track without a
   layout probe at render time.
3. There is **no pointer capture**. A drag only receives `onMouseMove` while the
   pointer is over the track. Clicking anywhere on the track and the whole
   keyboard contract still work; drag beyond the track does not. This is a
   documented limitation, not something to fake.
   **Wrong — corrected by plan 063 §13:** the runtime captures the pressed
   element; a drag does keep tracking outside the track. The slider's own drag
   was implemented correctly; only this assumption and the docs built on it were
   wrong.
4. GPUI hit-tests to the deepest element and does not bubble an unhandled press
   (measured in plan 041 §9 for the `Switch` thumb). The rail, fill and thumbs
   therefore need `pointerEvents: "none"` so the track/group receives the event;
   the same measure makes the `Switch` toggle work.
5. Negative margins reach GPUI's taffy layout unchanged
   (`packages/native/src/renderer.rs` `margin_left` → `el.ml(px)`), which §5
   uses to centre a thumb exactly on the track's usable span. **This is the one
   geometric assumption to prove in the runtime suite before anything else**;
   if it fails, see §9.

## 3. Files

```
A .agents/slop/plans/053-value-controls.md
M .agents/slop/plans/README.md
A packages/primitives/src/core/value.ts
A packages/primitives/src/core/value.test.ts
M packages/primitives/src/core/style.ts
M packages/primitives/src/core/style.test.ts
M packages/primitives/src/core/index.ts
A packages/primitives/src/components/Slider.tsx        (Slider + RangeSlider)
A packages/primitives/src/components/Slider.test.tsx
A packages/primitives/src/components/Meter.tsx
A packages/primitives/src/components/Meter.test.tsx
M packages/primitives/src/components/index.ts
A packages/primitives/examples/value.example.tsx
M packages/primitives/examples/index.ts
A packages/primitives/docs/slider.mdx
A packages/primitives/docs/range-slider.mdx
A packages/primitives/docs/meter.mdx
M packages/primitives/docs/README.md
M packages/primitives/README.md
M packages/primitives/runtime/harness.ts               (+ mouse press/drag verbs)
A packages/primitives/runtime/value.runtime.test.tsx
M COMPONENTS.md
M TODO.md
M PLAN.md                                             (decision D18)
```

## 4. Public API

```ts
export interface SliderProps {
  readonly value?: number;                 // controlled
  readonly defaultValue?: number;          // uncontrolled; defaults to `min`
  readonly onChange?: (value: number) => void;
  readonly min?: number;                   // default 0
  readonly max?: number;                   // default 100
  readonly step?: number;                  // default 1; 0 = continuous
  readonly size?: ControlSize;             // sm | md | lg, default md
  readonly disabled?: boolean;
  readonly invalid?: boolean;              // destructive track/thumb, like a field
  readonly label?: string;                 // accessible name
  readonly formatValue?: (value: number) => string; // default String
  readonly style?: StyleDesc;
  readonly testId?: string;
}

export interface RangeSliderProps {
  readonly value?: readonly [number, number];
  readonly defaultValue?: readonly [number, number];
  readonly onChange?: (value: readonly [number, number]) => void;
  readonly min?: number; readonly max?: number; readonly step?: number;
  readonly size?: ControlSize; readonly disabled?: boolean; readonly invalid?: boolean;
  readonly label?: string;                 // becomes "<label> minimum"/"<label> maximum"
  readonly formatValue?: (value: number) => string;
  readonly style?: StyleDesc; readonly testId?: string;
}

export interface MeterProps {
  readonly value: number;
  readonly min?: number;                   // default 0
  readonly max?: number;                   // default 100
  readonly tone?: ProgressTone;            // primary | success | destructive | muted
  readonly size?: "sm" | "md";             // default md
  readonly label?: string;
  readonly formatValue?: (value: number) => string;
  readonly style?: StyleDesc;
  readonly testId?: string;
}
```

Both sliders honour controlled/uncontrolled state through `useControlState`
(`core/state.ts`) — the same rule as every other control. `onChange` fires only
when the resolved value actually changed.

## 5. The arithmetic (`core/value.ts`)

All functions total; nothing throws; nothing reads the clock or the renderer.

```ts
export interface ValueRange { readonly min: number; readonly max: number; readonly step: number }
export interface TrackBox { readonly x: number; readonly width: number }
export interface ValueSpan { readonly start: number; readonly end: number }

normalizeRange(range): ValueRange
  // non-finite min -> 0, non-finite max -> min + 1, if max < min swap them,
  // step <= 0 or non-finite -> 0 (continuous)

clampValue(value, range): number
  // NaN -> min; clamp to [min,max]; if step > 0 snap from min and round to the
  // step's decimal places (0.1 * 3 must not paint 0.30000000000000004)

valueFraction(value, range): number      // 0..1; a zero-width range reads 0
fractionValue(fraction, range): number   // 0..1 -> value, snapped; clamped
valueStep(range): number                 // step > 0 ? step : (max-min)/100
stepValue(value, range, steps): number   // value + steps * valueStep, clamped

decideValueKey(value, range, key, pageSteps = 10): Option.Option<number>
  // left/down -1, right/up +1, pageup +pageSteps, pagedown -pageSteps,
  // home -> min, end -> max, anything else -> None (unhandled, not "stay")

pointerValue(x, box, range, inset = 0): number
  // fraction = (x - (box.x + inset)) / (box.width - 2*inset), clamped to 0..1;
  // a box no wider than the inset reads `min`

normalizeSpan(span, range): ValueSpan    // clamps both ends and orders them
nearestEnd(value, span): "start" | "end" // the closer thumb; a tie picks "start"

moveSpanEnd(span, end, value, range): ValueSpan
  // start may not pass end and end may not pass start (the crossing guard)
```

`meterPercent(value, range): number` lives in `core/value.ts` as
`valueFraction(...) * 100` and is consumed by `Meter`.

## 6. Paint and geometry (`core/style.ts`)

```ts
sliderThumbSide(size, theme) = theme.iconSize[size]
sliderTrackStyle(spec, theme)  // hit area: height density.controlHeight[size],
                               // paddingX = round(thumbSide/2), cursor, opacity
sliderRailStyle(theme)         // width 100%, height spacing.xs, radius full,
                               // colors.muted, pointerEvents none
sliderFillStyle(fraction, spec, theme) // width `${fraction*100}%`, height 100%,
                               // radius full, colors.primary (or destructive when
                               // invalid), pointerEvents none
sliderThumbStyle(spec, theme)  // thumbSide square, radius full, background
                               // colors.background, border colors.primary (or
                               // destructive), marginLeft/marginRight = -half,
                               // pointerEvents none, focusRing when focused,
                               // opacity 0.5 when disabled
```

**Why the negative margins:** the track's content box is inset by half a thumb on
each side. A fill of `f * (width - thumbSide)` followed by a thumb with
`marginLeft = marginRight = -thumbSide/2` puts the thumb's **centre** at
`inset + f * (width - 2*inset)` — \(f=0\) sits on the left end of the usable span
and \(f=1\) on the right, with the thumb overflowing into the padding rather
than past the track. `pointerValue` uses the same inset, so a click maps to the
thumb position it paints. The runtime suite asserts both (§8.3).

## 7. Components

### `Slider` (`components/Slider.tsx`)

- `div role="slider"`, `aria-label`, `aria-valuetext`,
  `tabIndex={disabled ? undefined : 0}`, `testId`, focus handlers.
- Children: rail → fill (fraction of the value) → thumb.
- `onMouseDown` reads the track's bounds with
  `renderer?.getElementBounds?.(trackId)` and sets `pointerValue(...)`; a
  `useRef` drag flag makes `onMouseMove` (with `pressedButton === 0`) keep
  updating and `onMouseUp` stop. A press on a disabled slider does nothing.
- `onKeyDown` runs `decideValueKey` and commits the value; unhandled keys fall
  through (no `preventDefault` exists in the runtime).
- The focus ring is painted on the thumb (`sliderThumbStyle`), because the thumb
  is what a user sees move.

### `RangeSlider` (same file)

- Group wrapper is the hit area; both thumbs are the sliders:
  `role="slider"`, labels `${label} minimum` / `${label} maximum`, each with its
  own `tabIndex`, `aria-valuetext` and focus ring.
- A press picks `nearestEnd(pointerValue(...), span)`, moves that end, and moves
  native focus to the chosen thumb (`renderer.focusElement(id)`) so the arrow
  keys that follow act on the thumb the user just grabbed.
- Keyboard on each thumb uses `moveSpanEnd`, so arrows can never cross the ends.
- Thumb ids are registered by `ref` callbacks, the same pattern `RadioGroup`
  uses (plan 049).

### `Meter` (`components/Meter.tsx`)

- `div role="meter"`, `aria-label`, `aria-valuetext={formatValue(clamped)}`;
  not focusable, no handlers.
- Reuses `progressTrackStyle`/`progressFillStyle` with the percentage from
  `valueFraction`; the width is clamped, so nothing paints outside the track.

## 8. Test plan (every assertion must be able to fail)

### 8.1 `core/value.test.ts` (unit)

1. `normalizeRange` orders inverted bounds, ignores a non-positive step, and
   tolerates non-finite bounds.
2. `clampValue` clamps and snaps to the step from `min`; `0.1` steps do not leak
   binary float noise.
3. `valueFraction`/`fractionValue` are inverse within one step, and a
   zero-width range reads 0 rather than dividing by zero.
4. `decideValueKey`: each arrow, page key, Home/End, and an unknown key
   returning `None` (the guard that "unknown" is not confused with "stay").
5. `pointerValue` maps the inset span and clamps a pointer outside the box.
6. `normalizeSpan` orders and clamps.
7. `moveSpanEnd` refuses to let the start pass the end and vice versa — the
   crossing bug.
8. `nearestEnd` picks the closer thumb.

### 8.2 Element trees (`Slider.test.tsx`, `Meter.test.tsx`)

- `Slider`: role/tabIndex/label/value text; the fill's width is the fraction;
  the thumb carries the focus ring only when focused; disabled drops the tab
  stop and paints at 0.5 opacity; a key down calls `onChange` with the stepped
  value; a mouse down with a stubbed box (handler call) cannot be tested here —
  it is the runtime suite's job.
- `RangeSlider`: two `role="slider"` elements with distinct labels and values;
  the crossing handler is wired; each thumb is a tab stop unless disabled.
- `Meter`: role, value text, clamped fill width, not focusable, no handlers.

### 8.3 Runtime (`runtime/value.runtime.test.tsx`)

New harness verbs: `mouseDownAt(x,y)`, `mouseMoveAt(x,y,pressedButton)`,
`mouseUpAt(x,y)` (thin wrappers over the `TestRenderer`'s native simulate calls).

1. **Geometry** — at `value = min`, `mid`, `max`, the thumb's painted centre is
   `track.x + inset + f*(track.width - 2*inset)` within 1 px. This is the
   negative-margin proof; it fails if the margins are dropped.
2. **Click mapping** — a real click at the track's quarter point reports
   `onChange(25)` (defaults 0–100, step 1); the centre reports 50; a click
   outside the usable span clamps to min/max.
3. **Keyboard** — ArrowRight/ArrowLeft move by one step, PageUp/PageDown by ten,
   Home/End to the ends; a disabled slider receives none of them.
4. **Focus** — a click paints the ring on the thumb; tabbing away clears it.
   A disabled slider is skipped by `focusNext`.
5. **Range** — a click near the left moves the start, near the right the end;
   an arrow on the focused thumb moves only that end; a value pushed past the
   other end stops at it (crossing guard); each thumb announces its own value.
6. **Meter** — AccessKit role is `Meter`, the value text is the formatted value,
   `getFocusedElementId` never lands on it, and the fill's bounds track the
   fraction.
7. Both themes are not re-proven here: the palette assertion for Tier 1 lives in
   `runtime/theme.runtime.test.tsx`; the new rows use the same role resolvers.

### 8.4 Both directions

For each guard — the negative margin, the crossing rule, the disabled guard, the
pointer inset — revert only that line and record the failing assertion in §11.

## 9. STOP conditions

- **Negative margins do not offset flex layout as taffy documents** (probe 8.3.1
  fails): stop and report. The fallback is an inset model with the thumb's centre
  at `f*(width)` if the track's ends are padded by the *consumer*; do not invent a
  measured-position slider (no resize observer is published).
- `getElementBounds` is not on the renderer the component receives in the real
  runtime: stop; the pointer path cannot be honest without it. Keyboard and
  focus still ship, with the pointer limitation documented and the tests
  removed — never silently skipped.
- `role="slider"` or `role="meter"` does not reach AccessKit in the dump: keep
  the role in the tree, record the measured a11y role, and document it; do not
  rename the control to a role that lies.
- A press on the rail does not reach the track wrapper even with
  `pointerEvents: "none"` on the children: stop and report the hit test; do not
  attach duplicate handlers to every child to work around it.
- Any runtime test can only pass by hand-setting `onChange` instead of a real
  click/key: stop — that is not evidence.

## 10. Commands and expected results

```sh
nub run --filter @gpuixui/primitives test
# expect: 17 files, all pass (164 before; +2 files, +~18 tests)

nub run --filter @gpuixui/primitives test:runtime
# expect: 8 files, all pass (70 before; +1 file, +~10 tests)

nub run check
# expect: check-tests, lint, fmt and check-types pass.
```

## 11. Evidence

Measured 2026-10-17 on the locally-built 0.10.0 binding.

### §11.1 Final run

| Command | Result |
| ------- | ------ |
| `nub run --filter @gpuixui/primitives test` | 18 files, **214 tests passed** (164 before; +44 unit, +6 element-tree) |
| `nub run --filter @gpuixui/primitives test:runtime` | 8 files, **82 tests passed** (70 before; +12, including the new example's one interaction test) |
| `nub run check` | tests-can-fail, lint, fmt and `check-types` pass |

### §11.2 The geometry, as painted

`runtime/value.runtime.test.tsx` reads the thumb's painted box at 0/50/100 and
compares its centre with `track.x + inset + f*(track.width - 2*inset)`:
all three within **1 px** (the assertion allows 2 px for layout rounding).

### §11.3 Two-direction probes (each implementation reverted on its own)

| Guard | Revert | Result |
| ----- | ------ | ------ |
| negative-margin thumb | delete `marginLeft`/`marginRight` from `sliderThumbStyle` | runtime `paints the thumb centred…` → **expected 8 to be less than 2** (half a 16 px thumb) |
| hit-test children | delete `pointerEvents: "none"` from rail/fill/thumb | 5 runtime tests fail — the click reports `undefined`, the range never moves, the ring never paints |
| crossing rule | drop `Math.min`/`Math.max` from `moveSpanEnd` | 3 unit tests fail, incl. `{start: 90, end: 60}` against `{start: 60, end: 60}` |
| nearest-end rule | restore the distance-only rule | unit: both ends at 0 + a press at 90 → `start` (which cannot move), so nothing moves |

### §11.4 Facts measured beyond the plan

- **The track needs no positioning trick.** §2.4 predicted a hitbox might need
  `position: "relative"` (GPUI's `should_occlude` only counts a fill or a
  positioned box). Removing it left every runtime test green: the mouse handlers
  themselves create the hitbox. The property was deleted rather than kept as
  cargo-cult styling, and the style test now guards what matters — the track
  paints no fill of its own.
- **`getElementBounds` is a method on the renderer** the component receives, and
  it returns the painted border box (padding included), which is why the pointer
  mapping subtracts the same thumb inset the paint uses.
- **AccessKit roles observed:** `Slider` (single and each range thumb), `Group`
  (the range wrapper), `Meter`.
- **A click focuses the slider** (it is a tab stop), so the ring paints on the
  thumb immediately; clicking another control clears it — no `focusVisible` needed
  to prove the wiring.
- A disabled slider is still *focusable by a direct native key call* in the test
  renderer (`nativeSimulateKeyDown(id)` focuses its target), so the tab-order
  claim is proven with `focusNext` from a button before it, not by a key call.

### §11.5 What is not proven

- The published `darwin-x64` binding does not exist; this run is the
  locally-built artifact (plan 140), the same provenance as every other runtime
  claim in this workstream.
- A drag that leaves the track is not tested because the runtime has no pointer
  capture; the limitation is documented, not simulated.
  **Wrong — see §13:** the runtime does capture; plan 063 adds the missing
  drag tests and corrects the documentation.

## 12. Acceptance

- The three components are exported from `@gpuixui/primitives`, typed, with no
  `any` and no literal colours.
- Unit, element-tree and runtime suites pass with the counts above.
- `docs/slider.mdx`, `docs/range-slider.mdx`, `docs/meter.mdx` follow the page
  contract in `docs/README.md`, and `examples/value.example.tsx` is registered
  and mounted by `runtime/examples.runtime.test.tsx`.
- `COMPONENTS.md` rows move from `todo`/unassigned to `wip` with the measured
  runtime note (not `done` until the published-binary confirmation and the
  docs-site page land — the same bar as every other Tier 1 row).
- `TODO.md` records the ownership decision and ticks the three implementation
  tasks; `PLAN.md` gains D18.

## 13. Correction (plan 063, 2026-10-17)

This plan's §2.3 and §11.5 claimed the runtime has no pointer capture. That was
an assumption, never measured. Two measurements correct it:

1. **A drag is captured.** A press at 25 % of a slider, a move to 60 % **80 px
   below the track**, and a release reported `60`; a move past the right edge
   reported `100` and past the left edge `0`. The same held for a range thumb.
   The runtime arms capture on the pressed element from the left button; the
   playground's `panel-resize` scenario had already measured it (plan `140` §4,
   ADR 0002). The component's `onMouseDown`/`onMouseMove`/`onMouseUp` drag was
   therefore already correct — the limitation, the docs built on it and the
   missing tests were the defect.
2. **A non-primary press moved the value.** `onPointerDown` did not inspect
   `event.button`, so a right or middle click set the value (25 → 75 measured)
   and a range's right click also moved native focus to `"Price maximum"`. The
   gesture now requires `button === 0`; `Button`, `Checkbox`, `Switch` and
   `Toggle` were already correct because they listen to `onClick`, which the
   runtime sends for the primary button only (`onAuxClick` carries the rest).

Plan 063 records the fix, the five new runtime tests, and both-direction proofs.

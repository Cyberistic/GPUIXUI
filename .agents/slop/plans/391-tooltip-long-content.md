# 391 — A long `Tooltip` paints a 6 270 px layer and runs off the window

| Field | Value |
| ----- | ----- |
| Status | done |
| Phase | F (containment and honesty) |
| Owner | primitives workstream |
| Depends on | `030`, `041`, `047`, `060`, `067`, `095`, `098`, `335`, `336`, `347`, `368` |
| Evidence | measured on this host, 2026-10-19 00:15 (§1) |

## 1. The gap

`tooltipStyle` paints the tip with `whiteSpace: "nowrap"` and no width cap, and
`TooltipProps.content` says *"Keep it short — the runtime does not wrap overlay
content."* A tip whose text is longer than the window therefore paints a layer
as wide as the text: measured in the real `TestRenderer` on a 1280 × 800 window,
a 200-word tip painted

```
tip      x 15  width 6270  height 24
text     x 15  width 6258  height 16
```

so 5 000 px of the tip is outside the window and unreadable. `FloatingLayer`
keeps the layer's *left edge* inside the window (`x 15`, the 8 px margin plus
the border) but does **not** cap its width — the same behaviour plan `368`
fixed for a `Select`'s list with `selectContentStyle`'s numeric `maxWidth`.

This is our bug, not a runtime one: the runtime wraps a text run whenever the
container gives it a bounded width (the `Text` primitive's own `minWidth: 0` and
the control-label rules depend on it). Plan `368`'s class — *a control must
contain its content* — never reached the tooltip.

The same defect makes the vertical placement pessimistic for the right reason:
`decideVerticalSide` is given `tooltipHeight(theme)`, which is **one caption
line**, so a wrapped tip's real height is never considered after the first
frame.

## 2. The change

All in `packages/primitives` (owner: this workstream).

1. `src/components/Tooltip.tsx`
   - `tooltipStyle(theme, maxWidth?)`:
     - when `maxWidth` is a number, set `maxWidth` and `whiteSpace: "normal"`;
     - when it is absent, keep today's `nowrap` and no cap (the element-tree
       caller has no viewport, and a short tip must not change).
   - `TooltipHandlers` gains `readonly maxWidth?: number`, and `renderTooltip`
     passes it to `tooltipStyle`.
   - `Tooltip` computes
     `maxWidth = Math.floor(viewport.width - 2 * FLOATING_MARGIN)` from
     `readWindowSize(renderer)` and passes it only when it is positive.
   - The vertical side decision reads
     `layerHeight: measured.tipHeight ?? tooltipHeight(theme)`, so a wrapped
     tip's measured height drives the flip on the frame after it is painted —
     the same second-frame rule the `center` alignment already documents.
   - The measurement layout effect also depends on `props.content`, so a tip
     whose text changes **while it is open** re-measures (its centre offset and
     its height were stale too).
   - Correct the `content` doc comment: long text wraps inside the window; keep
     the guidance short, but stop claiming the runtime cannot wrap it.

2. `src/components/Select.test.tsx` (`describe("Tooltip")`)
   - new case: `tooltipStyle(testTheme, 400)` has `maxWidth: 400` and
     `whiteSpace: "normal"`; the uncapped style has neither;
   - new case: `renderTooltip(..., { maxWidth: 400 })` puts both on the tip
     element's style, and the uncapped tree keeps `nowrap` with no `maxWidth`.
   - `src/core/floating.test.ts` gains six `tipWidthCap` cases (start, a trigger
     inside the margin, end, centre near an edge, a horizontal side, and a
     degenerate/negative window).

3. `runtime/fields.runtime.test.tsx` (the Tooltip section)
   - new case *"wraps a long Tooltip inside the window"*: a 200-word tip with
     `defaultOpen`; assert `tip.width <= WINDOW.width - 2 * FLOATING_MARGIN`,
     `tip.x >= FLOATING_MARGIN`,
     `tip.x + tip.width <= WINDOW.width - FLOATING_MARGIN`, and
     `tip.height > tooltipHeight(testTheme)` (it wrapped onto more than one
     line). All three are width/height/presence facts; none depends on the
     degraded absolute-geometry and focus families recorded in plan `379` §6.
   - a one-line guard: the existing short-tip cases must keep their height, so
     a wrapped implementation that always breaks text fails.

4. `docs/tooltip.mdx` — replace the "keep it short because the runtime cannot
   wrap" claim with the measured contract: text wraps inside a measured cap,
   the tip is capped to the room its side and alignment have, and the side follows the measured
   height on the frame after the first paint.

5. `COMPONENTS.md` — the Tooltips row records the width cap and the wrapped
   height placement.

## 3. Commands

```sh
cd packages/primitives
nub x vitest run src/components/Select.test.tsx
nub x vitest run --config vitest.runtime.config.ts runtime/fields.runtime.test.tsx
cd ../..
nub run check
nub run lint
nub run test
```

Expected: the new offline cases pass; the scoped runtime file's tooltip
placement cases keep their known plan-379 failures but the new long-tip case
passes; `check`, `lint` and `test` are green.

## 4. Both-direction proof (measured)

1. **Offline:** reverting `tooltipStyle` to ignore `maxWidth` failed both new
   element cases by name — `expected undefined to be 400` and
   `expected { display: 'flex', …(12) } to match { maxWidth: 400,
   whiteSpace: 'normal' }`. Restored: 63 tests green across
   `floating.test.ts` and `Select.test.tsx`.
2. **Runtime, without the cap:** `maxWidth: undefined` failed the long-tip case
   with `expected 6270 to be less than or equal to 1264`.
3. **Runtime, with the cap:** the same case passes — the tip measured
   `x 19, width 1258, height 104` (wrapped), the short tip stayed one line, and
   the file went from 72 to 74 tests with the same 30 plan-379 failures.
4. The full live suite re-ran: **41 files, 657 tests, 546 passed / 111 failed**
   — the same 19 files and 111 cases as before the change, no re-baselined
   assertion. Offline: **48 files, 690 tests**, all green.

## 5. STOP conditions

- If the runtime does **not** wrap a text run under a numeric `maxWidth` on the
  tip (measured: the painted text width stays above the cap), stop and record a
  limitation with the measurement instead of shipping a false claim.
- If adding `props.content` to the effect deps causes a render loop (the
  measured symptom: the test never settles / React reports too many
  re-renders), drop that dep and record the stale-content measurement.
- Do not change any plan-379 failing assertion to make this suite look green.

## 6. Acceptance

- A long tip is contained in the window (width assertion in the runtime).
- A wrapped tip uses its measured height for the side decision.
- Short tips still paint one line, unchanged.
- Docs and the inventory state the measured contract; plan `379`'s failures are
  untouched.

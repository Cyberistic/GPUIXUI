# 385 — Tier 5 feasibility: a crop area over `<img>`

**Status:** landed 2026-10-18 · **Phase:** D/E · **Workstream:** playground
(`apps/playground`, `packages/testing`)

**Depends on:** `100`, `110`, `120`, `140`, `161`, `162`, `172`, `188`, `335`.

**Number note:** the playground index says the next free number is **`385`**.
Take it, and move the index to `386` after this plan lands.

## 1. Why this plan exists

`COMPONENTS.md`'s Tier 5 row **Crop area** is still `todo | ?` — the only
inventory row besides **Multi-step forms** with no runtime evidence at all. Its
text is precise about the gap: *"Draggable handles over `<img>`; crop geometry
and constraints are ours. No custom-paint requirement unless the mask is drawn —
**unverified**."*

A crop surface is the first component that must answer all of these at once:

1. **Is the image's layout box the crop coordinate space?** `<img>` accepts
   `objectFit` and paints a fitted bitmap inside its declared box. The renderer
   exposes `getElementBounds`, not the fitted bitmap rect, and there is no load
   event or natural-size report. If the box is the only geometry available, a
   crop UI must be told the image's natural aspect ratio by the app.
2. **Can the dimming mask be four plain `div`s over the image** — no `<canvas>`
   (measured empty in `native-surfaces`) and no custom paint?
3. **Do the masks hit-test the way the type comment claims?** `pointerEvents`
   unset blocks clicks when the element paints a fill or is positioned;
   `"none"` never blocks. A crop's outside region must swallow the press while
   the image plane still receives clicks through it (or the component owns a
   click mode).
4. **Does a captured pointer drag on a small handle keep every move and the
   release**, and does the gesture end in a click on the handle (not the image)?
   `drag-targets` measured that for arbitrary targets; a crop handle is a
   12 × 12 target that repaints on every move.
5. **Do the masks, the box and the handles repaint at exact bounds** while the
   box moves, and does a resize clamp at the image edge and at a minimum size?
6. **Can the crop box own native focus and answer arrow keys**, so the region is
   operable without a pointer? `roving-focus` proved key delivery to a focused
   `div`; this asks whether a drag-created selection can keep that focus.

This probe answers all six with **no package code**. It adds one pure geometry
model + unit tests, one consumer-path view, one headless scenario, one live
twin, and a new `crop` capability.

## 2. What was already measured (do not re-measure)

| Fact | Source |
| ---- | ------ |
| `<img>` loads a data URL, paints its declared box, paints `img: no src` / `img: load failed` fallbacks, and `setImagePixels` works through its ref | `native-surfaces` (`161`) |
| `objectFit` is published on `ImgProps` (`contain`, `cover`, `fill`, `scaleDown`, `none`); an `<img>`'s box does not wait for decode | runtime types + GPUix README (recorded in `161`) |
| A captured drag keeps every move and the up on the source, hover is frozen during it, and the gesture ends in a click on the source | `drag-targets` (`162`) |
| `pointerEvents: "none"` on a viewport lets a click reach the page control under its strip; `"auto"` blocks it | `toast-lifecycle` (`183`) |
| `position: "sticky"` is ignored; `display: "none"` is a no-op; `<canvas>` paints `gpui::Empty` | `185`, `177`, `161` |
| Native focus reaches a clicked `div` with `tabIndex`; arrows/Home/End reach a focused row; `modifiers.shift` arrives on a key | `roving-focus` (`158`), `tab-strip-focus` (`174`), `live-key-routing` (`345`), `pointer-text-entry` (`343`) |
| An absolutely positioned overlay inside a `position: "relative"` parent paints above its siblings and is pixel-exact | `docking-layout` (`184`), `data-grid-columns` (`349`) |
| A live drag must be paced (`drag` paces by a frame); six back-to-back moves are ignored | `live-panel` (`189`) |

## 3. What will be proven

Capability: `crop` (new). Scenario: `crop-area`; live twin: `live-crop-area`.

**View.** A `crop-frame` (560 px wide, column, 8 px gap) holding:

- `crop-toolbar`: `crop-fit` (`fit contain`/`fit cover`), `crop-mask-mode`
  (`masks pass`/`masks block`), `crop-reset` (`reset`).
- `crop-readout`: `x=64 y=40 w=192 h=120 fit=contain mask=none image=0 blocked=0`.
- `crop-log`: the append-only gesture log (`down:se>move:se>up:se>click:se`).
- `crop-stage`: a `320 × 200`, `position: "relative"` surface, `role="img"`,
  `aria-label="Image to crop"`; a 2 : 1 SVG data URL in `crop-image` with
  `objectFit` from state and `style={{ width: 320, height: 200 }}`.
- `crop-plane`: `position: "absolute"`, inset `0`, `backgroundColor:
  "transparent"`, `onClick` records `image` — the crop's pointer plane over the
  image (a measured fallback: if a positioned transparent `div` does not
  hit-test, §9 says what to do).
- Four masks, painted after the plane and before the box: `crop-mask-top`,
  `crop-mask-left`, `crop-mask-right`, `crop-mask-bottom`, each
  `backgroundColor: alpha(theme.colors.background, 0.6)`,
  `pointerEvents: maskMode === "none" ? "none" : "auto"`, `onClick` records
  `mask`. A mask whose derived width or height is `0` is **not rendered**
  (`Option`-filtered), so its absence is assertable.
- `crop-box`: absolute at the crop rect, `borderWidth: theme.borderWidth.strong`,
  `borderColor: theme.colors.primary`, `tabIndex={0}`, `role="group"`,
  `aria-label="Crop selection"`, `onMouseDown` → move gesture,
  `onMouseMove`/`onMouseUp` on the same element, `onKeyDown` (arrows move,
  `shift`+arrows resize from the opposite corner).
- Four handles `crop-handle-nw/ne/sw/se`: 12 × 12, centred on the corners,
  `cursor` `nwse-resize`/`nesw-resize`, `role="button"`, labelled
  `Resize crop top left` etc., `onMouseDown` → resize gesture,
  `onMouseMove`/`onMouseUp`.

**State.** `CropRect = { x, y, width, height }` in stage coordinates;
`initialCrop(320 × 200) = {64, 40, 192, 120}` (60 % centred). `fit` and
`maskMode` are two enums. All arithmetic is pure (`crop-model.ts`), and the view
and the steps call the same functions.

| Area | Check |
| ---- | ----- |
| baseline | readout is exactly `x=64 y=40 w=192 h=120 fit=contain mask=none image=0 blocked=0`; `crop-image` is an `img` with bounds `320 × 200`; `crop-plane` and `crop-box` are `div`s; the box sits at the stage origin + `(64, 40)` at `192 × 120` |
| masks | top `320 × 40` at the stage top; left `64 × 120` at `y = 40`; right `64 × 120` at `x = 256`; bottom `320 × 40` at `y = 160` — each within 1 px of the derived rect |
| handles | each 12 × 12 and centred on its corner within 1 px (SE centre `= box.x + w`, `box.y + h`) |
| fit | `crop-fit` switches to `cover` and back; the image bounds stay `320 × 200` in both — the layout box, not the fitted bitmap, is the coordinate space; no `img:` fallback paints |
| pass-through | with `mask=none`, a click in the top mask reaches `crop-plane` (`image=1 blocked=0`); after `crop-mask-mode` (`auto`) the same click hits the mask (`image=1 blocked=1`); toggling back lets the next click through (`image=2`) |
| resize SE | a paced press/move/release on `crop-handle-se` by `(+40, +20)` gives `w=232 h=140`, `x/y` unchanged, and every mask and handle follows within 1 px |
| clamp SE | after `reset`, a drag of `(+400, +400)` clamps to `w=256 h=160` — the box's right/bottom edges equal the stage edges within 1 px |
| move | after `reset`, a `(-30, -16)` drag on the box centre gives `x=34 y=24`; the top mask is `320 × 24`, the left `34 × 120`; a further `(-100, -100)` clamps to `(0, 0)` and the left/top masks are absent |
| min size | a `(-200, -200)` drag on the SE handle stops at `w=16 h=16`; the NW handle then cannot pass the SE edge |
| keyboard | a click on the box focuses it (`focused = crop-box`); `ArrowRight` moves it `+1` and the masks follow; `shift-ArrowDown` grows the height by `1` (or, if §9 records that `shift` does not arrive, the resize half is dropped and named) |
| a11y | the stage is an AccessKit `Image` named `Image to crop`; the box is a `Group` named `Crop selection`; every handle is a `Button` named `Resize crop …` |
| gesture log | the drag is `down:se>move:se>up:se` and ends with a click on the handle; no `image` or `mask` entry appears for a drag (the gesture-ending click lands on the source) |
| live | a real window repeats the baseline, the SE resize (`232 × 140`), the mask pass-through, an arrow move and a reset; paced drags only; no style or a11y assertion |

The probe does **not** re-measure generic pointer capture, absolute positioning,
virtual lists or focus traversal. It does not claim a mask that follows a
rounded image (`borderRadius` clips the bitmap, not a parent's `overflow`), a
rotation handle, aspect-ratio locking, pixel readback, or that the fitted bitmap
rect is observable.

## 4. Files

Create:

- `apps/playground/src/scenarios/crop-model.ts` — the pure geometry and the
  readout.
- `apps/playground/src/scenarios/crop-model.test.ts` — the unit tests in §8.1.
- `apps/playground/src/scenarios/crop.tsx` — the view, the scenario and the
  image data URL.

Change:

- `apps/playground/src/scenarios/index.ts` — import/register `cropScenario` and
  add `"crop"` to `PROBE_CAPABILITIES`.
- `packages/testing/src/smoke.ts` — add `"crop"` to `CAPABILITIES`.
- `apps/playground/src/live/scenarios.tsx` — import the view, add
  `live-crop-area` after `live-column-config`.
- `apps/playground/README.md` — a `## Crop area (plan 385)` section with the
  measured facts, and the new files under the registry paragraph.
- `COMPONENTS.md` — a `crop` capability row and measured evidence on the
  **Crop area** row (status stays `todo`: this is the runtime contract, not a
  shipped component).
- `TODO.md` — tick the new playground task with the measured counts.
- `.agents/slop/plans/README.md` — add the `385` row; move the next free number
  to `386`.

Do **not** change any other package, `apps/docs`, the shell or the theme.

## 5. The model (`crop-model.ts`)

```ts
/** Which corner a resize drag owns. */
export type Corner = "nw" | "ne" | "sw" | "se";

/** A crop selection in the stage's coordinate space. */
export interface CropRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The stage's box: the crop is clamped to it. */
export interface Stage {
  readonly width: number;
  readonly height: number;
}

/** 60 % of the stage, centred; exact integers for a 320 × 200 stage. */
export const initialCrop: (stage: Stage) => CropRect;

/** Clamps `value` into `[min, max]`. */
export const clamp: (value: number, min: number, max: number) => number;

/** Moves the rect by `(dx, dy)`, clamped to the stage; never resizes. */
export const moveCrop: (
  rect: CropRect,
  stage: Stage,
  dx: number,
  dy: number,
) => CropRect;

/**
 * Drags `corner` by `(dx, dy)`, clamped to the stage and to
 * `minSize`; the opposite corner stays fixed.
 */
export const resizeCrop: (
  rect: CropRect,
  stage: Stage,
  corner: Corner,
  dx: number,
  dy: number,
  minSize: number,
) => CropRect;

/** The four region rects outside the crop; each may have a zero dimension. */
export interface Masks {
  readonly top: CropRect;
  readonly left: CropRect;
  readonly right: CropRect;
  readonly bottom: CropRect;
}
export const maskRects: (rect: CropRect, stage: Stage) => Masks;

/** A mask paints only when both dimensions are positive. */
export const paints: (rect: CropRect) => boolean;

/** `x=64 y=40 w=192 h=120` */
export const describeRect: (rect: CropRect) => string;

/** `x=64 y=40 w=192 h=120 fit=contain mask=none image=0 blocked=0` */
export const describeCrop: (
  rect: CropRect,
  fit: "contain" | "cover",
  mask: "none" | "auto",
  counts: CropCounts,
) => string;
```

Rules:

- Every output is integer-rounded (`effect/Number`'s `round`), so a readout and a
  painted bound agree. Pointers deliver integers here, but a clamp boundary must
  not leak a fraction.
- `resizeCrop` computes the **fixed** edge from the input rect and clamps the
  dragged edge; it never lets width or height fall below `minSize` or pass the
  opposite edge.
- `moveCrop` clamps `x` to `[0, stage.width - rect.width]` and likewise `y`; a
  rect wider than the stage clamps to `0` (it cannot happen here; the unit test
  pins the rule).
- `maskRects` returns top/left/right/bottom exactly; their widths and heights
  are the complements of the crop. A zero dimension is valid data; the **view**
  filters it with `paints`.
- No React, no GPUix, no `Date`/`Math.random`.

## 6. The view and the scenario (`crop.tsx`)

`const STAGE = { width: 320, height: 200 }`, `MIN_SIZE = 16`,
`HANDLE = 12`, `MASK_ALPHA = 0.6`.

The image is a 2 : 1 SVG data URL (`viewBox="0 0 400 200"`, two coloured
rectangles) so the natural aspect ratio differs from the stage's 8 : 5.

**Gesture state** is `Option<Gesture>`:

```ts
interface Gesture {
  readonly kind: "move" | "resize";
  readonly corner: Corner;
  readonly pointer: { readonly x: number; readonly y: number };
  readonly start: CropRect;
}
```

`begin(kind, corner, event)` stores the pointer (`event.x ?? 0`, `event.y ?? 0`)
and the current rect; `drag(event)` computes the **total** delta from the stored
pointer and calls `moveCrop`/`resizeCrop` against the stored start rect (never
incremental, so a dropped move cannot drift); `end(kind, corner)` clears and
appends `up:<corner>` to the log. Each move appends `move:<corner>`; a press
appends `down:<corner>`; the gesture-ending click appends `click:<corner>`.
`crop-box` carries the click handler for the move case and each handle for its
resize, so the log proves which element the runtime delivered the click to.

**Handlers:**

- `crop-fit` toggles `contain`/`cover`; `crop-mask-mode` toggles
  `none`/`auto`; `crop-reset` restores `initialCrop`, `contain`, `none`, clears
  the log and both counts.
- `onKeyDown` on the box: `ArrowLeft/Right/Up/Down` → `moveCrop(±1)`;
  with `event.modifiers?.shift` → `resizeCrop("se", ±1)` (grow right/down, or
  shrink when negative); log `key:<key>[:shift]`.
- The boxes around the masks are derived from `maskRects`; render with
  `Arr.filter(masks, paints)` or four explicit `Option` tests.
- All colours/widths come from `useTheme()`; the only literals are geometry
  (`STAGE`, `HANDLE`, `MIN_SIZE`) and `MASK_ALPHA`.

**Steps** (headless, in order):

1. Baseline bounds/readout/a11y/types/fallbacks.
2. Fit toggle and back; bounds unchanged.
3. Mask pass-through: `clickWindow` at the stage's top-mask centre; toggle;
   click again; toggle back; click again. Assert counts after each.
4. Reset, then `pressWindow`/`movePointer`/`releasePointer` on the SE handle by
   `(+40, +20)`; assert the rect, masks, handle and log.
5. Reset, then a SE drag of `(+400, +400)`; assert the clamp.
6. Reset, then a box move of `(-30, -16)`; assert the rect and masks; then a
   `(+400, +400)` move clamps to `(128, 80)` and the right/bottom masks are
   absent.
7. Reset, then a SE drag of `(-400, -400)`; assert `16 × 16`; then an NW drag of
   `(+400, +400)`; assert it stops at `16 × 16` with the same SE corner.
8. Reset, click the box centre, assert `focused`; `ArrowRight`; then
   `shift-ArrowDown` (if §9 records that `shift` arrives, otherwise skip and
   record).
9. A short `drag("crop-handle-se", 8, 0)` through the whole-gesture verb and
   assert the log/none of the pointer counts changed.

Each geometry assertion uses `expectNear(..., 1)`; a 2 px tolerance is the
ceiling. The readout assertions are exact strings.

**Live twin** (`live-crop-area`): view `cropScenario.view`, ready
`crop-frame`. It repeats the baseline, a paced `drag("crop-handle-se", 40, 20)`,
the mask pass-through at the stage's absolute coordinates via
`clickWindow`, an `ArrowRight` after a box click, and a reset. It `settle`s
after every input and uses `waitForText` for the readout. No style/a11y reads
(the live renderer has neither).

## 7. Steps for the executor

1. Read this plan, then `surfaces.tsx` (the `<img>` contract), `drag-autoscroll.tsx`
   (press/move/release), `notification-centre.tsx` (a11y + readout style),
   `data-grid-columns.tsx` (absolute overlays and bounds), `probes.ts`, `ui.tsx`
   and `live/scenarios.tsx` (the `live-column-config` twin).
2. Write `crop-model.ts` + its test. Run:

   ```sh
   nub run --filter playground test
   ```

   Expected: exit `0`; the new unit tests pass beside the existing playground
   tests (186 at plan `384`).
3. Write `crop.tsx`, register it, add the capability literals. Run the same
   command. Expected: exit `0`; `scenarioProblems` reports nothing (both
   `PROBE_CAPABILITIES` and `Smoke.CAPABILITIES` updated).
4. Build and run only the new scenario:

   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js --only crop-area
   ```

   Expected: `1/1 scenarios passed`, exit `0`. A miss reports the readout or the
   bounds — fix the implementation, or, when the runtime really behaves
   differently, assert the measured fact with a label that says so (§9).
5. Run the full headless suite:

   ```sh
   nub apps/playground/dist/smoke/run.js
   ```

   Expected baseline before this plan: `86/86`, `2846` checks, exit `0`. After:
   `87/87`, `2846 + <new>` checks, exit `0`, `crop=verified`.
6. Add `live-crop-area` and run:

   ```sh
   nub run --filter playground smoke:live
   ```

   Expected baseline: `37/37` live, `705` checks, exit `0`. After:
   `38/38`, `705 + <new>`, exit `0`, one screenshot.
7. Run the gates:

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   Expected: all exit `0`.
8. Update `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md` and the plan
   index with the measured counts and every fact that changed the design (§10).
   Commit the plan first, then the probe.

## 8. Test plan

### 8.1 Unit tests (`crop-model.test.ts`)

Each must be able to fail:

| Test | Guards |
| ---- | ------ |
| `initialCrop` | exact `64, 40, 192, 120` on 320 × 200; a non-square stage stays inside |
| `moveCrop` | a positive delta moves both axes; a negative large delta clamps at `0`; a positive large delta clamps at the far edge; width/height unchanged; the input is not mutated |
| `resizeCrop` SE | grows both axes by the delta; the opposite (NW) corner is fixed |
| `resizeCrop` NW/NE/SW | each corner moves only its two edges; the opposite corner stays fixed |
| `resizeCrop` stage clamp | `+400` at SE stops at the stage's bottom-right; `-400` at NW stops at `0,0` |
| `resizeCrop` min size | `-400` at SE stops at `16 × 16`; `+400` at NW cannot pass the SE edge minus `minSize` |
| `maskRects` | exact four rects at rest; the vertical bands sum to the stage height and the horizontal bands to the width; a clamped edge yields a zero dimension |
| `paints` | a positive rect paints; either zero dimension does not |
| `describeRect` / `describeCrop` | exact strings, including the counts and both enum values |

### 8.2 The scenario

The scenario is the runtime test: typed checks over readout text, bounds, the
a11y dump, focus and the gesture log. Record six mutation proofs and one reverse
proof in §10 (temporary edit → `--only crop-area` → revert):

| # | Mutation | Must fail with |
| - | -------- | -------------- |
| M1 | `moveCrop` drops the `[0, stage - size]` clamp | "a move past the origin stops at zero" |
| M2 | the masks derive from `initialCrop` instead of the live rect | "the right mask follows the resized edge" |
| M3 | every mask hard-codes `pointerEvents: "none"` | "a blocking mask keeps the image plane untouched" |
| M4 | every corner resizes with the SE arithmetic | "the NW corner cannot pass the SE minimum" |
| M5 | the Down key maps to `(0, 0)` | "shift+arrow grows the crop from the SE corner" |
| M6 | the mask's `maskMode === "auto"` guard is removed | "a passing mask records no block" |

Reverse proof (consumer wiring): the plane's `onClick` is replaced by a no-op →
"a passing mask lets the image plane take the click" fails.

### 8.3 Two-direction checks by hand

- `--only crop-area` exits `1` after each mutation and names the check label.
- Full headless `87/87` and live `38/38`, both exit `0`.
- `nub run check`, `nub run lint`, `nub run test` exit `0`.

## 9. STOP conditions

- **The image or the plane does not hit-test.** If the transparent positioned
  `crop-plane` refuses the click, give it a 2 % background wash
  (`alpha(theme.colors.background, 0.02)`), assert that, and record the measured
  requirement. If the `<img>` itself is the only hit target, move `onClick`
  there and record it.
- **`objectFit` changes the box or paints a fallback.** Record the measured
  bounds for `contain` and `cover`. If the prop is ignored, the crop must still
  treat the declared box as its coordinate space; narrow the check to that and
  record the limitation (no natural-size signal either way).
- **A drag on a 12 px handle does not keep the capture.** Stop; record whether
  the moves land on the handle, the plane or nowhere. A crop must then attach
  the move/up handlers to the pointer plane and read the pressed corner from
  state; change the design and say so in §10.
- **`modifiers.shift` is absent on a key.** Drop the keyboard-resize half, keep
  the arrow move, and record the measured payload.
- **A zero-size mask still reports bounds.** Assert the measured bounds instead
  of `null`, and record it; do not hide the fact behind "not rendered".
- **The masks paint under the image** (a sibling-order surprise). Swap the
  order and record the measured paint order.
- **An a11y role does not map.** Keep the role that the dump exposes (or none,
  named as measured), and record it on the row; do not invent a role.
- **A live drag does not resize** even when paced. Record the pacing and step
  count; narrow the live twin to the baseline and the mask pass-through rather
  than widening a tolerance.
- **A file outside §4 must change.** Stop and write the task in `TODO.md`.
- The suites are not `87/87` headless and `38/38` live with exit `0`. Stop and
  report the failing scenario; do not mark the plan done.

## 10. Measured results

Run on this host, 2026-10-18, against the locally built `darwin-x64` 0.10.0
binding (ADR 0003).

| Scenario | Checks | Result |
| -------- | ------ | ------ |
| `crop-area` (headless) | 74 | pass — suite `86 → 87`, `2846 → 2920`, exit `0`, `crop=verified` |
| `live-crop-area` | 10 | pass — live `37 → 38`, `705 → 715`, exit `0`, one screenshot |

Unit tests: `crop-model.test.ts` adds 21 tests; the playground suite is
186 → **207** tests in 20 files.

### 10.1 Facts that changed the plan

- **`pointerEvents: "none"` does not suppress the masked element's own click.**
  The runtime delivers the click to the mask **and** to the plane beneath it
  (the log read `mask:top>plane`, paint order), while `"auto"` delivers it to
  the mask only (the plane's counter stayed at `1`). The mask handler therefore
  carries a component-level guard (`if (maskMode !== "auto") return`); the
  overlay step is not a hit-test filter. This is the plan's most transferable
  finding: every click-through overlay needs the same guard.
- **`objectFit` is accepted and changes nothing observable in the box.**
  `contain` and `cover` both report `320 × 200`, no `img:` fallback paints, and
  neither exposes the fitted bitmap rect. There is no load event and no natural
  size, so the app owns the natural-aspect mapping.
- **The 12 px handle keeps the capture.** Every held move landed, the release
  committed, and the gesture-ending click landed on the handle (`click:se`) —
  never on the plane or a mask.
- **The four-mask complement is exact, offset by the stage's 1 px border.** The
  top mask paints at `y = 1`, the left at `x = 1`, and the crop box at
  `(65, 41)` for a `(64, 40)` crop. Zero-size masks are not rendered: a crop at
  `x = 0` / `y = 0` has no left/top mask and `bounds` returns `null`.
- **The box takes native focus and answers keys.** A click focused
  `crop-box`; `right` moved `x` by exactly 1; `shift-down` grew the height by
  1, so `modifiers.shift` arrives on a lower-case key.
- **A readout above the stage made the geometry lie.** The gesture log starts
  empty (zero height) and grows to one line (~16 px), moving the stage down;
  the first run read the stage's baseline once and reported the bottom mask at
  `197` instead of `181`. The probe now keeps both readouts **below** the
  stage, and the baseline is stable. This is a harness lesson, not a runtime
  fact.
- **The gesture lives in a `ref`, not React state.** A native move can arrive
  before the commit that renders the press; the ref is what a held drag can
  trust (the same batching plan `189` measured live).

### 10.2 The measured contract

| Fact | Value |
| ---- | ----- |
| stage | `320 × 200`; the image box is the same; `contain` and `cover` do not change it |
| initial crop | `x=64 y=40 w=192 h=120`; box bounds `(65, 41)` with the 1 px stage border |
| masks | top `320 × 40` at `y = 0`; left `64 × 120` at `x = 0`; right `64 × 120` at `x = 256`; bottom `320 × 40` at `y = 160` (all +1 in window coordinates) |
| pass-through | `none`: mask handler + plane handler (`mask:top>plane`); `blocked` stays `0` only with the mode guard |
| blocking | `auto`: mask handler only; the plane's counter is unchanged |
| SE resize | `+40/+20` → `232 × 140`; masks and handles follow within 1 px |
| SE clamp | `+400/+400` → `256 × 160` |
| move | `-30/-16` → `x=34 y=24`; `-100/-100` → `x=0 y=0`, left/top masks absent |
| minimum | SE `-200/-200` → `16 × 16` at `(64, 40)`; NW `+400/+400` cannot enlarge it |
| keyboard | click focuses `crop-box`; `right` → `x=65`; `shift-down` → `h=121` |
| a11y | `Image` "Image to crop"; `Group` "Crop selection"; `Button` "Resize crop bottom right" |
| gesture | `down:se>move:se>up:se>click:se` |
| live | the baseline, a paced SE drag (`232 × 140`), pass-through/blocking, an arrow move and reset all hold |

### 10.3 Mutation proofs

Each mutation was applied, built, run with `--only crop-area`, and reverted:

| # | Mutation | Measured failure |
| - | -------- | ---------------- |
| M1 | `moveCrop` drops the clamp | `a move past the origin stops at zero` (`x=-66 y=-76`) |
| M2 | the masks use `initialCrop` | `the right mask follows the resized edge` (`269` vs `308`) |
| M3 | every mask is `pointerEvents: "none"` | `a blocking mask keeps the image plane untouched` (`2` vs `1`) |
| M4 | every corner resizes with the SE arithmetic | `the NW corner cannot pass the SE minimum` (`256 × 160`) |
| M5 | Down maps to `(0, 0)` | `shift+arrow grows the crop from the SE corner` (`120`) |
| M6 | the mask-mode guard is removed | `a passing mask records no block` (`1`) |

Reverse proof (consumer wiring): the plane's `onClick` removed →
`a passing mask lets the image plane take the click` (`0` vs `1`).

### 10.4 Limits recorded

- No pixel readback, so a decoded image and a corrupt bitmap are
  indistinguishable; the probe asserts the box and the absence of a fallback.
- No fitted-bitmap rect, no load event and no natural size: the crop coordinate
  space is the declared box and the app supplies the aspect ratio.
- `borderRadius` clips the bitmap, but a parent's `overflow: hidden` does not
  clip an `<img>` child; a rounded crop mask is not measured.
- Rectangular selection only: no rotation, no aspect-ratio lock, no snap.
- 0.10.0 has no multi-value slider role; the a11y model is an `Image` region
  with a named `Group` and `Button` handles.
- The live suite cannot read style or the a11y dump (`197`), so those checks
  are headless-only.

## 11. Acceptance

- `crop-model.ts` + its test, `crop.tsx`, the registry entry, the capability
  literal, the live twin, and the docs/inventory/plan-index updates.
- Headless `87/87`, live `38/38`, exit `0`; `nub run check`, `nub run lint`,
  `nub run test` all exit `0`.
- `COMPONENTS.md` has the `crop` capability row and the measured **Crop area**
  contract; `TODO.md` ticks this task with the counts.
- Every mutation in §8.2 was run and produced the named failure (§10).
- No component package changed. Any defect found is a measured `TODO.md` task
  with its own plan number, not an edit from this workstream.

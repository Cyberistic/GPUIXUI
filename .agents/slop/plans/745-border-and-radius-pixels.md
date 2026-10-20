# 745 — Borders and corner radii, in the frame

| Field | Value |
| ----- | ----- |
| Status | planned |
| Phase | F (native evidence) |
| Owner | playground workstream |
| Depends on | `100`, `110`, `120`, `140`, `150`, `189`, `197`, `529`, `674`, `690`, `697`, `701`, `707`, `708`, `713`, `715`, `722`, `736` |
| Feeds | the `theme` / Design tokens rows in `COMPONENTS.md`; the token docs' border/radius claim |

## 1. Goal

Every shipped component declares a border and a corner radius: 78
`borderRadius` and hundreds of `borderWidth`/`borderColor` uses across
`packages/primitives` and `packages/components`. The suite proves those values
**reach the runtime's style report** (`theme-type-and-shadow` reads
`paintedStyle`) and never proves the frame paints them. Plan `736` closed the
same class of gap for `boxShadow`; this closes it for the two style families
every surface in the library is built from.

The bug being guarded: a runtime that accepts `borderWidth`, `borderColor` or
`borderRadius` and paints a square, borderless box would pass every existing
check — every card, input, popover and dialog in the library would be square
and unbordered while the ledger said "verified". A reader cannot see that in a
style report, and a screenshot is not an assertion.

Deliver a small probe that captures one frame and samples:

1. a **1 px border** on all four edges — the border token, at the middle of the
   band, outside the reported content box;
2. a **2 px border** — the band follows the token's width, so a runtime that
   always paints 1 px fails;
3. a **square box's corner** and a **rounded box's corner** — the rounded fill
   does not reach the corner, the square fill does;
4. a **rounded box's straight edge** — the radius clips corners only;
5. a **child inside a rounded parent**, with and without `overflow: "hidden"` —
   whether the runtime clips the child to the rounded shape, which decides
   whether an image inside a card needs its own radius.

Both hosts run it: `border-pixels` (offscreen `TestRenderer`) and
`live-border-pixels` (the real 1100 × 720 window).

Non-goals:

- screenshot diffing or golden images;
- anti-aliased edge profiles. Every sample is at least 2 logical px from a
  boundary, verified by a pure `cornerClearance` precondition;
- dashed/dotted border styles (`borderStyle` is a newer-source feature and is
  not in the published 0.10.0 contract this suite pins);
- per-corner longhands (`borderTopLeftRadius` etc.) — the shorthand is what the
  token layer produces;
- opacity, gradients or glyphs.

## 2. What is already measured

- `Smoke.Bounds` on the pinned 0.10.0 binding is a **content-origin** box:
  `x`/`y` are inside the border and padding, `width`/`height` are the border box
  minus its borders (plan `529` §6.5). With `padding: 0` and a border of `B`,
  the outer box is therefore
  `[x - B, y - B, width + 2B, height + 2B]`.
- The frame is a decoded PNG with an integer device scale (`2` on this host),
  and `frames.ts` already owns capture, scale mapping, colour parsing and
  comparison (plans `674`, `676`, `736`).
- The dark palette's values the probe reads: `background #11141A`,
  `card #191D25`, `primary #A7A9FF`; `borderWidth.thin = 1`,
  `borderWidth.strong = 2`, `radius.xl = 12`.
- `overflow: "hidden"` is real on 0.10.0 (plan `177` uses it as a clip), but no
  probe has asked whether the clip follows the **rounded** corner.

## 3. Design

### 3.1 The pure half — `apps/playground/src/scenarios/border-pixels.ts`

No renderer import, no host. Geometry only, all derived from the reported
bounds and the token width, so a theme change moves the samples:

```ts
/** A box as the runtime reports it: the content origin and a borderless size. */
export interface ProbeBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A logical window point. */
export interface ProbePoint {
  readonly x: number;
  readonly y: number;
}

/** One side of a box. */
export type Edge = "left" | "right" | "top" | "bottom";

/** The middle of a border band on one edge. */
export const borderBand: (
  bounds: ProbeBox,
  width: number,
  edge: Edge,
) => ProbePoint;

/** A point `gap` px outside the border box on one edge. */
export const beyondBorder: (
  bounds: ProbeBox,
  width: number,
  gap: number,
  edge: Edge,
) => ProbePoint;

/** The reported content origin: the corner a radius must clip. */
export const contentCorner: (bounds: ProbeBox) => ProbePoint;

/** The box's centre. */
export const centre: (bounds: ProbeBox) => ProbePoint;

/**
 * How far the content corner sits from a corner arc, in logical px.
 *
 * The outer corner's arc has its centre at `(x - B + R, y - B + R)`; the
 * content corner is `(x, y)`. The clear distance along the diagonal is
 * `R(√2 - 1) - B√2`. A positive value means the corner pixel is outside the
 * rounded shape; `>= 2` keeps it clear of anti-aliasing.
 */
export const cornerClearance: (radius: number, border?: number) => number;
```

`borderBand` for `left` is `(x - width / 2, y + height / 2)`, `right` is
`(x + width + width / 2, …)`, `top` is `(…, y - width / 2)` and `bottom` is
`(…, y + height + width / 2)`. No literal `1` anywhere: the width is the
token's.

### 3.2 The view — `apps/playground/src/scenarios/border.tsx`

A `640 × 360` stage painted `theme.colors.background`, with seven boxes:

| testId | geometry | style |
| ------ | -------- | ----- |
| `border-stage` | the stage | `background` |
| `border-thin` | `(40, 40)` `160 × 72` | `card` fill, `thin` border, `primary` border colour |
| `border-strong` | `(240, 40)` `160 × 72` | `card` fill, `strong` border, `primary` |
| `radius-square` | `(40, 160)` `120 × 72` | `card` fill, `radius.none` |
| `radius-rounded` | `(240, 160)` `120 × 72` | `card` fill, `radius.xl` |
| `clip-visible` | `(40, 270)` `120 × 72` | `card` fill, `radius.xl`, child `primary` inset `0` |
| `clip-hidden` | `(240, 270)` `120 × 72` | `card` fill, `radius.xl`, `overflow: "hidden"`, child `primary` inset `0` |

The two border boxes have different widths, the two radius boxes differ only by
their radius, and the two clip boxes differ only by `overflow`. Every control is
matched, so each check names one property.

### 3.3 The scenarios

`border-pixels` (capability `theme`) and `live-border-pixels` (capability
`theme`, `ready: "border-stage"`). One generic `borderChecks` over the host and
its inspection error, exactly as `shadow.tsx` does, so the two hosts cannot
drift.

Checks, all tolerance 2:

| # | Check | Expected |
| - | ----- | -------- |
| 1–4 | `borderBand(thin, thinWidth, edge)` for all four edges | `primary` |
| 5 | `centre(thin)` | `card` — the border is a band, not a fill |
| 6 | `beyondBorder(thin, thinWidth, 1, "left")` | `background` — the band has an outer edge |
| 7 | `borderBand(strong, strongWidth, "left")` | `primary` — a 2 px token still paints |
| 8 | `centre(strong)` | `card` — the 2 px band does not flood |
| 9 | `beyondBorder(strong, strongWidth, 1, "left")` | `background` |
| 10 | `contentCorner(radius-square)` | `card` — the control corner is square |
| 11 | `contentCorner(radius-rounded)` | `background` — the radius clips the fill |
| 12 | `centre(radius-rounded)` | `card` — the box still paints |
| 13 | top edge of `radius-rounded`, 2 px inside, horizontal middle | `card` — only the corner is clipped |
| 14 | `contentCorner(clip-visible)` | `primary` — an unclipped child paints the corner |
| 15 | `contentCorner(clip-hidden)` | `background` — the rounded clip reaches the child |
| 16 | `centre(clip-hidden)` | `primary` — the child still paints generally |
| 17 | record `radius.xl` and its `cornerClearance`; require `>= 2` | a precondition, not a pixel |

The two precondition checks are:

- `cornerClearance(theme.radius.xl, 0) >= 2` — the corner sample is outside the
  anti-aliased arc;
- `cornerClearance(theme.radius.xl, theme.borderWidth.thin) >= 2` for any
  bordered radius fixture (documented even though the radius boxes are
  borderless, so a future fixture inherits the rule).

The live twin writes `LIVE_ARTIFACTS/live-border-pixels.png` as its run
artifact.

## 4. Files

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/border-pixels.ts` | new pure geometry + `cornerClearance` |
| `apps/playground/src/scenarios/border-pixels.test.ts` | new unit tests (§5) |
| `apps/playground/src/scenarios/border.tsx` | new view + both scenarios |
| `apps/playground/src/scenarios/index.ts` | register `border-pixels` |
| `apps/playground/src/live/scenarios.tsx` | register `live-border-pixels` (import, `LiveScenario`, array) |
| `apps/playground/README.md` | a "Border and radius pixels" subsection with the measured values; update the pixel section, the suite totals and the `theme` row |
| `COMPONENTS.md` | the `theme` evidence row and the Design tokens row gain the two ids and the paint claim |
| `TODO.md` | one playground task, ticked with the measured values and exact ids run; a cross-team task **only if** the child-clip measurement is negative |
| `.agents/slop/plans/README.md` | index this plan under the playground block; record the number choice |

No `packages/testing` change: `framePoint`, `pixelAt`, `rgbaNear` and
`parseColour` already cover the chain. If a helper is genuinely missing, stop
and justify it; do not duplicate `parseColour`.

## 5. Test plan

`border-pixels.test.ts` (vitest, pure, fixture `{ x: 100, y: 50, width: 160,
height: 72 }`):

| Test | Must fail when |
| ---- | -------------- |
| `borderBand` left/right is `x - w/2` / `x + width + w/2` at the vertical middle | the sign or the axis is swapped |
| `borderBand` top/bottom is `y - w/2` / `y + height + w/2` at the horizontal middle | top and bottom are transposed |
| a width of 2 moves every sample 1 px further out than a width of 1 | the distance is hard-coded to 1 (a regression that would make the strong border check pass at 1 px) |
| `beyondBorder` sits exactly `gap` outside the outer edge on all four sides, and is outside the band | the gap is measured from the content box |
| `contentCorner` is the reported origin and `centre` is the middle | either returns the outer box or a rounded coordinate |
| `cornerClearance(12, 0)` ≈ `4.97`, `(12, 1)` ≈ `3.56`, `(4, 0)` ≈ `1.66` | the formula drops the border term or the √2 factor |

Scenario mutations, each observed and reverted (record the exact failure
labels):

- **M1** remove `borderWidth`/`borderColor` from `border-thin` → checks 1–4
  read `card` or `background`;
- **M2** paint the thin border in `card` → checks 1–4 read `card`;
- **M3** use `borderWidth.thin` on `border-strong` → check 9
  (`beyondBorder(strong, strongWidth, 1, "left")`) samples inside the 1 px
  band instead of past it, so it reads `primary` instead of `background`;
- **M4** set `radius-square` to `radius.xl` → check 10 reads `background`;
- **M5** remove `borderRadius` from `radius-rounded` → check 11 reads `card`;
- **M6** remove `overflow: "hidden"` from `clip-hidden` → check 15 reads
  `primary`;
- **M7** make `borderBand` sample `x` instead of `x - width/2` → a unit test is
  red before the scenario runs (proves the geometry is not a no-op).

## 6. Commands and expected results

```sh
nub run --filter playground test
# expected: green; 45 files, 487 + 6 = 493 tests (report the real count)

nub run --filter playground build
# expected: exit 0

nub apps/playground/dist/smoke/run.js --only border-pixels
# expected: 1/1 scenarios passed · theme=verified, exit 0; 17 checks

nub apps/playground/dist/live/run.js --only live-border-pixels
# expected: 1/1 scenarios passed · theme=verified, exit 0; 17 checks
# (one real window; the frame is the run artifact)
```

Each mutation in §5 is one focused run of the matching host (the headless one
unless the mutation only exists live), then reverted.

Because this adds a registry entry but no cross-cutting code:

```sh
nub apps/playground/dist/smoke/run.js
# expected: 109/109 scenarios passed, 3963 + N checks, 65 capabilities, exit 0

nub run check
nub run lint
nub run test
```

The full live suite is the merge/release gate and is **not** run here. Registry
totals: headless `108 → 109`, live `97 → 98`; `--list` must show
`live-border-pixels`. The docs-site capability matrix is untouched because
`theme` already exists.

## 7. STOP conditions

Stop and report instead of improvising if:

- the edge sample reads `background` while the pixel **inside** the reported
  content box reads `primary`: the 0.10.0 bounds contract does not nest a border
  the way plan `529` §6.5 says. Record the measured band relative to the
  reported box; do not widen a tolerance, and do not hard-code an absolute
  coordinate;
- the 2 px band paints 1 px (check 7 reads `background` at `x - 1`, or check 9
  reads `primary` at `x - 3`): the token width is not honoured. Report the
  measured band and add a cross-team task; keep the scenario asserting the
  measured truth;
- `contentCorner(radius-rounded)` reads `card`: the runtime accepts a radius and
  paints a square corner. Keep the scenario as the measurement (assert the
  measured colour and say so in the label), record it in `COMPONENTS.md` and add
  a cross-team task that every rounded surface is square on 0.10.0. Never claim
  a radius that the frame does not show;
- `contentCorner(clip-hidden)` reads `primary`: `overflow: "hidden"` clips to
  the square content box, not the rounded shape. Assert the measured behaviour,
  document it, and add a cross-team task that a rounded parent must give its
  own radius to an image/child that reaches the corner;
- a sample is neither candidate colour (an anti-aliased composite): report the
  value and the clearance. Move the sample only after amending this plan; do not
  widen `TOLERANCE`;
- the frame's device scale is not an integer, or the `640 × 360` stage does not
  fit the live window (report the size pair; shrink the stage only by editing
  this plan first).

## 8. Acceptance

- `border-pixels` and `live-border-pixels` are registered and green on this
  host, with the exact sampled colours recorded in the README.
- The pure module has at least six tests that can fail, and at least six
  scenario mutations were observed failing by name before revert (M3 is the
  width proof and must be attempted; if the runtime clamps to 1 px it is
  recorded as the STOP outcome instead).
- `COMPONENTS.md` and `apps/playground/README.md` state the border/radius paint
  evidence and name the ids; no row still implies radius is style-only.
- `TODO.md` carries one ticked playground task with the measured values and the
  exact ids run, plus a cross-team task only where the frame showed a gap.
- `nub run check`, `nub run lint` and `nub run test` are green; the full
  headless registry is green.

## 9. Rollback

Revert the two commits (plan, implementation). Nothing outside
`apps/playground`, `COMPONENTS.md`, `TODO.md` and the plan index is touched, and
no package API changes, so a revert cannot break a consumer.

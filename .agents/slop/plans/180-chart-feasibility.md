# 180 — Tier 3 feasibility: a chart surface

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | B→D (feasibility probe) |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Depends on | `100`, `110`, `120`, `140`, `161` (content surfaces), `160` (a11y) |
| Closes | `COMPONENTS.md` Tier 3 → *Charts* (`?`, "charts where a native rendering solution exists") and the Tier 2 *Colour picker* alternative |

## 1. Question

MISSION asks for "charts where a native rendering solution exists" and the
Tier 5 colour picker needs the same answer. `COMPONENTS.md` records today:

- no chart host element;
- **`<canvas>` is retained but renders `gpui::Empty`** (`native-surfaces`), so it
  is not a drawing surface;
- "static charts can be drawn with `<svg>`" — an untested claim from one icon
  painting;
- the colour picker's saturation/value square needs a gradient, and GPUix
  documents two-stop linear gradients only.

The library needs a **measured recipe**, not a plausible one. Three separable
claims:

1. **Geometry and colour** — can a chart compose from published elements with
   exact bar heights, exact series colours and a hit-testable mark?
2. **Vector drawing** — what does a sourced `<svg>` paint: colour, alpha only, or
   nothing? Does SVG-internal text reach `paintedText` / the a11y tree?
3. **Full-colour raster** — does `<img>` accept an SVG **data URL** and paint it
   as a colour image, giving charts and the colour picker a real vector path?

Claim 3 is the one that decides whether a multi-colour chart is possible at all.

## 2. Source evidence (reconnaissance — confirm in the run, do not assume)

Read from the pinned `@gpuix/native@0.10.0` source in the build scratch tree
(`.agents/slop/scratch/gpuix-build/gpuix`) and the pinned GPUI (`zed/`):

- `packages/native/src/custom_elements/img.rs` → `SvgElement::render` builds
  `gpui::svg().data(bytes).text_color(tint)`; `supported_props` is exactly
  `src` and `source`, and the returned element never appends children.
- `zed/crates/gpui/src/svg_renderer.rs` → `render_alpha_mask` rasterizes the SVG
  and keeps **only the alpha channel** of every pixel.
- `zed/crates/gpui/src/window.rs` → `paint_svg` inserts a **`MonochromeSprite`**
  tinted by `style.text.color`.

So a sourced `<svg>` is a **tinted stencil**, not a colour surface: two fills in
one document paint in one colour. Consequences to prove in the run:

- a multi-series line chart needs **one `<svg>` layer per series**, each with its
  own `color`, stacked in absolute slots;
- SVG-internal `<text>` is rasterized into the mask: it cannot be found by
  `getPaintedText`, cannot be asserted, and cannot reach the a11y tree — so axis
  labels are `<text>` siblings of the drawing layer;
- an `<img>` whose `src` is an SVG data URL goes through
  `Image::from_bytes(..).to_image_data(..)` → a full-colour `RenderImage`, which
  is the only vector path that keeps per-shape colour (and therefore gradients).

If the runtime contradicts any of this, **STOP** and record the measurement
before changing this plan (see §7).

## 3. Design

New scenario `chart-svg`, capability `chart`, in
`apps/playground/src/scenarios/chart.tsx`.

View, top to bottom (width ~520, the dark palette the runner mounts):

1. **Bar plot** (`chart-bars-plot`, 320 × 148, `alignItems: "flex-end"`):
   three `div` bars with test ids `chart-bar-0..2`, widths 56, heights 96 / 64 /
   32, backgrounds `primary` / `success` / `destructive`, each `role="button"`,
   `aria-label="<series> <value>"`, and an `onClick` that writes
   `chart-selected` (`series=alpha value=96`) and a `selected` readout.
2. **Bar value labels** — one `<text>` per bar above the plot row (`chart-value-1`
   = `64`) so a chart's labels are assertable; an axis row of `<text>` labels
   (`chart-label-0..2` = `Jan`, `Feb`, `Mar`).
3. **Line plot** (`chart-line-plot`, 480 × 160, a `position: "relative"` box):
   two absolutely positioned `<svg>` layers at 480 × 160, sources
   `LINE_PRIMARY` and `LINE_SUCCESS` (a `path` with `fill="none"` and
   `stroke="#000"`), `color` set to `primary` / `success`, test ids
   `chart-series-0` / `chart-series-1`. The second is `position: "absolute"`,
   `left: 0`, `top: 0`.
4. **SVG traps**: `chart-series-0` carries a React child
   `<text testId="chart-svg-child">svg-child-text</text>`, and `LINE_PRIMARY`
   contains `<text x="8" y="20">svg-internal-label</text>`.
5. **Full-colour raster** (`chart-image`): an `<img>` at 480 × 120 whose `src`
   is a percent-encoded `data:image/svg+xml;charset=utf-8,` URL of a small chart
   with a two-stop `linearGradient`, a `radialGradient` and two different fills
   (`CHART_IMAGE_SVG`). Percent-encoding is the fixture's only job:
   `encodeURIComponent` is used at module scope, not in domain logic.
6. **Chart group**: `chart-root` is `role="img"` with
   `aria-label="Revenue by month"`, so the whole composition is one named
   accessibility node.
7. Readout: `chart-selected` (`series=<id> value=<n>`), written by a bar click.

### Assertions

| # | Check | Why it matters |
| - | ----- | -------------- |
| 1 | each bar is painted with its exact width and height | geometry is composable from `div`s |
| 2 | the three bars share a bottom edge (`y + height` equal within 0.5 px) | `alignItems: flex-end` is the chart baseline |
| 3 | each bar reports its own `backgroundColor` | per-series colour is a token, not a filter |
| 4 | clicking `chart-bar-1` hit-tests the painted mark and selects `beta` | a chart tooltip/selection needs hittable marks |
| 5 | `chart-value-1` paints `64` and `chart-label-0..2` paint | labels are real text nodes |
| 6 | the root appears in the a11y tree with role `Image` and label `Revenue by month` | the chart is one named node |
| 7 | both `<svg>` layers are retained as type `svg`, painted at 480 × 160, with identical bounds | stacked monochrome layers align |
| 8 | each `<svg>` layer reports **its own** `color` (`primary` / `success`) | one layer per series is the colour recipe |
| 9 | `svg-internal-label` is **not** in `getPaintedText` | SVG text is rasterized, not addressable |
| 10 | `chart-svg-child` is retained in the tree but its text is **not** painted | `<svg>` ignores React children, like `<canvas>` |
| 11 | `chart-image` is retained as `img`, painted 480 × 120, and adds **no** `img: load failed` | `<img>` accepts an SVG data URL → the full-colour path |
| 12 | the image's SVG carries a `linearGradient`, a `radialGradient` and two distinct fills | the screenshot artifact is the colour evidence; the source is the claim |

Checks 9 and 10 are absence checks: they assert the measured runtime contract,
so a future runtime that exposes SVG text makes them fail and forces the plan to
be re-measured rather than silently invalidating the recipe.

## 4. Files

```
packages/testing/src/smoke.ts                       EDIT  CAPABILITIES += "chart"
apps/playground/src/scenarios/chart.tsx             NEW   the scenario
apps/playground/src/scenarios/index.ts              EDIT  import, registry, PROBE_CAPABILITIES += "chart"
apps/playground/README.md                           EDIT  "Chart surfaces (plan 180)" + structure + evidence rows + count
COMPONENTS.md                                       EDIT  Charts (Tier 3) and Colour picker (Tier 2) with the measured facts
TODO.md                                             EDIT  tick the probe
PLAN.md                                             EDIT  D26 — the chart recipe
.agents/slop/plans/README.md                        EDIT  index this plan
.agents/slop/plans/180-chart-feasibility.md         EDIT  §8 measured result
```

No change to `packages/testing/src/native.ts`: every lookup the probe needs
(`bounds`, `paintedStyle`, `elementType`, `paintedText`, `a11y`, `click`) already
exists.

## 5. Commands and expected results

```sh
nub run --filter playground build
# -> tsc exits 0

nub apps/playground/dist/smoke/run.js --only chart-svg
# -> "1/1 scenarios passed", chart=verified, exit 0

nub apps/playground/dist/smoke/run.js --screenshots
# -> 48/48 scenarios passed, capabilities include chart=verified, exit 0,
#    .artifacts/screenshots/chart-svg.png written

nub run check && nub run lint && nub run test
# -> all green; the playground's scenarioProblems test still covers the registry
```

## 6. Two directions

Apply each mutation temporarily, run `--only chart-svg`, name the failing check,
restore the file:

- remove `alignItems: "flex-end"` → `the bars share a bottom edge` fails;
- change bar 1's height to 60 → `a bar's painted height` (and the value label)
  fail;
- drop the second `<svg>` layer's `position: "absolute"` → the layers no longer
  overlap, so `both series layers paint the same box` fails;
- swap `chart-bar-1`'s colour to `muted` → `a bar paints its own series colour`
  fails;
- remove the bar `onClick` → `a painted bar is hit-testable` fails;
- remove `role="img"`/`aria-label` from the root → the a11y check fails.

At least three of these are recorded in §8 as the probe's proof that the checks
can fail.

## 7. STOP conditions

- **`<img>` rejects an SVG data URL** (a `img: load failed` fallback appears) →
  stop claiming full-colour vector charts. Record it, update the Charts row to
  `unsupported` for colour and name `<img>` + PNG/`setImagePixels` as the only
  path; do not delete the probe.
- **A sourced `<svg>` paints nothing** (no bounds) → that contradicts
  `native-surfaces`; stop and report both results before changing the recipe.
- **SVG-internal text *is* in `getPaintedText`** → the source evidence is wrong
  for this build; record it and invert checks 9/10 rather than leaving a false
  claim.
- **The two stacked `<svg>` layers do not overlap** because absolute positioning
  is unavailable → record it; the honest fallback is separate chart rows per
  series (small multiples), not a claim of multi-series lines.
- The a11y dump has no node for the root → drop to `role="img"` with only
  `aria-label` and record whether the role or the label was the problem. Never
  invent a check that cannot fail.

## 8. Measured result

Run 2026-10-17 in this worktree:

| Command | Result |
| ------- | ------ |
| `nub run --filter playground build` | pass |
| `--only chart-svg` | 1/1, **52 checks**, `chart=verified`, exit `0` |
| full suite `--screenshots` | **48/48**, exit `0`, `chart=verified`, `chart-svg.png` written |
| `nub run check`, `nub run lint`, `nub run test` | pass |

What the probe established (all 52 checks in `.artifacts/smoke-report.json`,
visual evidence in `.artifacts/screenshots/chart-svg.png`):

- **Bars are testable chart marks.** Three `div` bars keep their declared
  `56 px` width and `96 / 64 / 32 px` heights, stand on the plot baseline
  (`y + height` equal within 0.5 px), advance by `width + gap`, and report
  `backgroundColor` = `colors.primary` / `success` / `destructive`. A click on a
  painted bar selects it and writes the readout — no synthetic drawing needed.
- **Labels are text.** `chart-value-*` and `chart-label-*` paint as real
  `<text>` nodes, so a chart's axis and value labels are assertable and reach
  the a11y tree.
- **The chart is one accessible node.** `chart-root` with `role="img"`,
  `aria-id` and `aria-label` is exposed as AccessKit `Image` named
  `Revenue by month`. **Removing only `role` removes the node entirely** — a
  `div` with `aria-label`/`aria-id` and no role is not in the dump (measured by
  mutation).
- **A sourced `<svg>` is a tinted stencil, not a colour surface.** Both line
  layers paint at `480 × 160` in the same box, and each reports **its own**
  `color` (`primary` / `success`), so one document per series is the colour
  recipe. The alpha-mask mechanism is confirmed in the screenshot: the two
  lines keep two colours because they are two elements.
- **SVG-internal text is pixels.** `svg-internal-label` is authored inside the
  source, **is visible in the screenshot**, and is **absent from
  `getPaintedText`** — so axis labels must be `<text>` siblings and SVG text is
  invisible to assertions and assistive technology. React children of `<svg>`
  are retained (`chart-svg-child` reads back) but dropped from the paint, the
  same shape as `<canvas>`.
- **`<img>` is the full-colour vector path.** A percent-encoded
  `data:image/svg+xml` URL paints as `img` at `480 × 120` with **no**
  `img: load failed` fallback; the screenshot shows a two-stop
  `linearGradient`, a `radialGradient` and two distinct fills. This is the route
  for a multi-colour static chart and for the colour picker's square (two linear
  gradients or radial, both rasterized by the image path).
- **The honest limit:** there is still no pixel readback, so exact colours
  inside an `<img>` and the gradient's stops are **screenshot evidence**, not
  assertions. Bar geometry/colour, layer tint, label text and the a11y node are
  assertable.

Two-direction proofs (mutation → the named check failed at exit `1` → file
restored):

| Mutation | Failing check |
| -------- | ------------- |
| remove `alignItems: "flex-end"` from the plot | `bar alpha stands on the plot baseline: expected 184 ± 0.5, got 132` |
| drop `position: "absolute"` from the second svg layer | `both series layers share a top edge: expected 260 ± 0.5, got 420` |
| make the bar click a no-op | `a painted bar is hit-testable and selects its series: expected "series=beta value=64", got "series=none value=0"` |
| remove `role="img"` from the chart root | `the chart is one named accessibility node: expected a value, got none` |


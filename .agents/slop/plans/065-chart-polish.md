# 065 — Charts that look like the landing's

| Field | Value |
| ----- | ----- |
| Owner | `launch-film` workstream |
| Package | `packages/data` (`src/chart/`) |
| Blocks | 066 (the film's dashboard), 067 |
| Status | in progress |

## Why (owner, 2026-11-01)

"We need better graphs in our library: the ones you used were ugly; the ones on
our landing were way better and rounded." Measured in the stats take:

- **Line charts and sparklines are slivers.** `chartMarkup` paints every path
  with `fill="#000"` and no stroke, so an open polyline fills the thin polygon
  between its first and last points. `LineChart` reads as a hairline diagonal
  that starts mid-plot; `Sparkline` as a needle.
- **Bars are square** (`<rect>` with no radius); the landing's are `rx="3"`.
- **The donut is a solid wheel** with no gap between slices; the landing's is a
  thin ring.
- **No grid**: values float; the landing draws hairline rules at each tick.

## What changes

All in `packages/data/src/chart/{logic,chart}.tsx?`, keeping the one-`<svg>`-per-
series route the module header documents (one tinted mask per series).

1. `ChartMark` gains `{ kind: "stroke"; d; width }`; `chartMarkup` paints it as
   `fill="none" stroke="#000" stroke-width stroke-linecap="round"
   stroke-linejoin="round"`, and a rect mark's `radius` as `rx`/`ry`.
2. `linePath` becomes a smooth monotone curve (`monotonePath`, Fritsch–Carlson,
   no overshoot past a data point); `LineChart` paints the stroke (2.5) over an
   area (`areaPath`, the curve closed to the baseline) at 0.14 opacity in the
   series colour, plus a dot on the last point.
3. Bars get `barRadius(width) = min(6, width / 4)`; grouped bars keep a gap
   of a fifth of a bar between series.
4. `donutSegments` draws each slice as a stroked arc on the ring's centre line
   (thickness `0.16 × size`), separated by a `padAngle` of 0.035 rad, round caps.
5. `Sparkline` paints the same curve at 2 px with its area at 0.14.
6. Cartesian charts draw a hairline at each tick in `border` (one extra `<svg>`
   behind the series).

## Test plan (`src/chart/logic.test.ts`)

- `chartMarkup` paints a stroke mark with `fill="none"` and a round cap, and a
  radius as `rx` — fails on the current markup.
- `monotonePath` passes through every point and never leaves the band between
  neighbouring values (no overshoot).
- `areaPath` closes to the baseline.
- `donutSegments` leaves a gap: the end angle of each slice is short of the next
  start by `padAngle`.
- Existing chart behaviour suites stay green.

```sh
nub run --filter @gpuixui/data test
nub run --filter @gpuixui/blocks test
```

## STOP

- If the rasteriser ignores `stroke` on an `<svg source>` (measure with the
  stats take first), stop and record it; do not fake strokes as thin fills.

# 593 — The chart recipe in a real window

**Owner:** playground workstream (`apps/playground`).
**Depends on:** `180` (`chart-svg`), `161` (`native-surfaces`), `197` (bounds and
painted text), `577` (`live-content`, the `<img>` box-loss rule), `189` (the
live runner), `591`/`592` (the previous plans).
**Phase:** F — the last Tier 3 rendering recipe with only `TestRenderer`
evidence.

## 1. Why

Plan `180` decided the chart recipe the Tier 3 **Charts** row rests on: bars
composed from `div`s for exact geometry, colour and hit-testing; one `<svg>`
layer per line series (the pinned runtime rasterizes a document to an alpha
mask); `<text>` siblings for labels; and an `<img>` SVG data URL for full
colour. Colour and gradients were always screenshot evidence, but the
**geometry, the hit target and the `<img>`/`<svg>` boxes** are assertable in a
window and never have been.

The live suite already reports `bounds()`, `paintedText()` and clicks, and
`live-content` measured the one live difference the `<img>` introduces: a
**1 px per-axis loss** in the 0.10.0 tracker. That rule is exactly what a chart
component needs to know; the twin makes it explicit for a chart's full-colour
layer.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/live/scenarios.tsx` | import `chartScenario`; add `liveChart` next to `live-content` (`capability: "chart"`); register it. |
| `apps/playground/README.md` | a `### The chart recipe in a real window (plan 593)` section. |
| `COMPONENTS.md` | the capability table's `chart` row cites `live-chart`; the `Charts` inventory row gains a live clause. |
| `PLAN.md` | one D79 row with the measured result. |
| `TODO.md` | claim this task; tick it with the measured checks and exact focused id. |
| `.agents/slop/plans/README.md` | index row and the playground narrative line. |

No `packages/testing` change.

## 3. Implementation

`view: chartScenario.view`, `ready: "chart-bars-plot"`.

1. The plot is `320 × 148`.
2. Each bar is `56` wide and its value tall (`96 / 64 / 32`), and its bottom is
   the plot baseline; the bars advance by `56 + 16`.
3. A real click on `chart-bar-1` selects the series: `chart-selected` reads
   `series=beta value=64`.
4. `chart-value-1` paints `64` and `chart-label-0` paints `Jan`.
5. Both `<svg>` layers are `480 × 160` and share an origin; the authored
   `<text testId="chart-svg-child">` is still **retained** (it answers its text)
   but absent from `paintedText()`, and the SVG-internal label is absent too.
6. `chart-image` is an `<img>` whose box is the declared **`480 × 120`**. The
   plan expected the raster data URL's 1 px per-axis loss (plan `577`); the
   first live run measured **480**, and §8 records the source-dependent rule.
7. `paintedText()` does not contain `img: load failed` (the data URL decoded).

Screenshot to `${LIVE_ARTIFACTS}/${liveChart.id}.png`.

Expected: **~25 live checks**. Record the measured count and the image box.

## 4. STOP conditions

- **STOP** if the `<img>` box differs from the measured value. Record the box;
  the first run of this plan expected `478 × 118` on plan `577`'s raster rule
  and measured `480 × 120`, which §8 records as an SVG-source difference.
- **STOP** if `text("chart-svg-child")` is absent. That would make the
  retained-vs-painted contrast unprovable live; record it.
- **STOP** if the click on `chart-bar-1` does not select (the bar may be
  clipped or the locator stale); record the readout.
- **STOP** if a needed host verb is missing.

## 5. Test plan

The scenario **is** the test. Required mutation proofs, run one at a time in the
real window, observe the failure, revert:

- **M1** change `alpha`'s value from `96` to `80` → the bar-height check fails
  with the measured `80`.
- **M2** drop the bars' `onClick` → the selection check reads
  `series=none value=0`.
- **M3** change the image's declared height from `120` to `100` → the image box
  check fails with the measured `98`.

After reverting, the focused run must be green twice in a row.

## 6. Verification commands

```sh
nub run --filter playground build
nub apps/playground/dist/live/run.js --list | grep live-chart
nub apps/playground/dist/live/run.js --only live-chart
```

Expected: `1/1`, exit `0`, one screenshot.

Headless control: `nub apps/playground/dist/smoke/run.js --only chart-svg` —
`1/1`, 52 checks (the view is untouched).

End-of-task gate:

```sh
nub run check
nub run lint
nub run test
nub run --filter playground build
nub apps/playground/dist/smoke/run.js
```

Expected: all green; headless stays **103/103** (`3653` checks, 64
capabilities). The full live suite is the merge gate and is **not** run; the
live registry moves `80 → 81`.

## 7. Acceptance

- `live-chart` exists, is listed, and is green twice.
- The image box, the retained child and the painted-text contrast are recorded.
- The mutation proofs were observed failing and reverted.
- `COMPONENTS.md`, `TODO.md`, `PLAN.md` (D79) and the README carry the result.
- `check`, `lint`, `test` and the full headless suite are green.

## 8. Measured record (2026-10-19)

**Result:** `1/1` focused scenario, exit `0`, **40 checks**, two green runs
after the corrected image assertion plus the three mutation runs. Live registry
`80 → 81` (derived: `--list | wc -l`). Screenshot:
`.artifacts/live/live-chart.png`.

| Measurement | Value |
| ----------- | ----- |
| plot | `320 × 148` |
| bars | `56` wide, heights `96 / 64 / 32`, each bottom on `plot.y + 148`, x step `72` |
| hit target | `click("chart-bar-1")` → `series=beta value=64`; `chart-value-1` = `64`, `chart-label-0` = `Jan` |
| svg layers | `chart-series-0` and `chart-series-1` both `480 × 160`, same origin |
| SVG child | `text("chart-svg-child")` = `svg-child-text`; `paintedText()` contains neither that nor `svg-internal-label` |
| full-colour layer | `chart-image` is exactly **`480 × 120`**; `paintedText()` contains no `img: load failed` |

**Finding (refines plan `577`):** an **SVG** data-URL `<img>` keeps its declared
box live (`480 × 120`); the **raster** data URL measured in `live-content` lost
1 px per axis (`96 × 64 → 94 × 62`). The chart's first run expected `478 × 118`
on the raster rule and failed with the measured `480`; the assertion now records
the source-dependent rule.

**Mutation proofs, each observed and reverted:**

| # | Mutation | Observed |
| - | -------- | -------- |
| M1 | `alpha` value `96 → 80` | failed "live bar 0 paints its value as its height": `expected 96 ± 0.5, got 80` |
| M2 | removed the bars' `onClick` | failed the selection check: `got "series=none value=0"` |
| M3 | image height `120 → 100` | failed the image box: `expected 120 ± 0.5, got 100` |

**Focused ids run:** `live-chart` (two green runs and three mutation runs); the
headless control `chart-svg` (52 checks, green). The full live suite was **not**
run (merge/release gate).

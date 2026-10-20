# 778 — Truncation, in the frame: does the ellipsis glyph paint, and does a constrained run spill?

**Phase:** F (pixel evidence) · **Workstream:** playground · **Status:** landed

**Depends on:** `100`, `110`, `120`, `140`, `150`, `197`, `335`, `342`, `591`,
`674`, `690`, `697`, `701`, `707`, `708`, `713`, `715`, `722`, `736`, `745`,
`754`, `761`, `771`, `773`, `775`.

**Owns:** `apps/playground` and `packages/testing` only. No other path is edited.

---

## 1. The bug being guarded

Plan `335` measured truncation as **geometry**: a `whiteSpace: "nowrap"` run in
a `width: 80` box collapses to one line (`26 px` against `416 px` unclipped),
and `textOverflow: "ellipsis"` / `"ellipsis-start"` keep that height. It also
recorded two facts that stop short of the paint:

- `getPaintedText()` returns the **source run**, never the ellipsis, so no check
  can assert that a `…` was drawn;
- the plan's own §6 item 9 says **"the ellipsis glyph needs pixel evidence"**.

So a runtime that truncated the layout and painted a **clipped word fragment**
instead of an ellipsis would pass every existing check while every truncated
label ended mid-glyph — and a runtime that let the run paint past its box would
paint over a neighbour while the suite stayed green. The shipped
`@gpuixui/primitives` `Text` exposes `truncate` and `clamp`, and `truncation`
(`text-truncation`) is a registered capability, so the claim reaches users.

**Goal:** from the decoded frame, prove which ink a constrained run paints:
whether the ellipsis is a **short, low run of dots at the right edge** (the glyph)
or a **tall clipped fragment** (no glyph), and whether any ink paints **outside**
the run's reported box. Assert the measured truth and record the limitation if
the glyph does not paint.

---

## 2. What is deliberately *not* claimed

- **The exact `…` character or its Unicode identity.** Only the right-edge ink's
  vertical profile distinguishes a dot run from a clipped glyph.
- **`ellipsis-start`.** The same measurement applies; plan `335` measured its
  geometry identical, and one variant is enough to settle the paint question.
- **`lineClamp` clamping.** Plan `335` measured the height; multi-line clamp
  paint is a separate probe.
- **Anti-aliasing, hinting or the font's dot shape.** The metric is a ratio of
  ink rows, not a glyph template.
- **The `Text` component's API.** This mounts bare `<text>` runs, so a defect
  is attributable to the runtime, not the component.

**STOP if the ellipsis paints no dot-like right edge** — do not widen the
threshold until it passes. Assert the measured clipped fragment and record the
limitation in `apps/playground/README.md`, `COMPONENTS.md` and a cross-team row
in `TODO.md` (owner: `primitives`), then continue with the spill check.

---

## 3. Design

### 3.1 The fixture (`apps/playground/src/scenarios/text-truncation.tsx`)

One `640 × 360` stage on `theme.colors.background`, four `card` panels at the
plan-775 offsets (`(24, 24)`, `(336, 24)`, `(24, 136)`, `(336, 136)`), each
`280 × 96`, `padding: 8`. Every panel holds a `200`-wide box with one `<text>`
run at `fontSize: 32`, `lineHeight: 32`, `color: foreground`:

| `testId` | Box | Declaration | Why |
| -------- | --- | ----------- | --- |
| `trunc-ellipsis` | `width: 200` | `whiteSpace: "nowrap"`, `textOverflow: "ellipsis"` | the glyph claim |
| `trunc-clip` | `width: 200` | `whiteSpace: "nowrap"`, `overflow: "hidden"` | the clipped-fragment control |
| `trunc-nowrap` | `width: 200` | `whiteSpace: "nowrap"` only | does the runtime clip without either? |
| `trunc-short` | `width: 200` | `"MMMM"` | the ink reference (the box is not blank) |

The long run is `"MMMM MMMM MMMM MMMM MMMM"` — dense capitals, so a clipped
fragment leaves a tall stem and the ellipsis leaves short dots.

### 3.2 The metric (`apps/playground/src/scenarios/truncation-model.ts`)

Pure, testable without a renderer:

- `edgeProfile(frame, window, box, ink, tolerance, bandPx)` — inside the run's
  painted box, take the rightmost `24` logical px and return the tallest ink
  column as a share of the box height. A dot run is short (`<= 0.4`); a
  clipped glyph is tall (`>= 0.6`). A profile with no ink is not "dots".
- `spillScan(frame, window, box, panel, ink, tolerance)` — count ink pixels
  strictly to the right of the run's box and inside its panel. Any spill is a
  named failure, not a tolerance.
- `scanBox` for the short control's interior ink.

The metric lives in one module so the view, the assertions and the tests read
the same fixture list.

### 3.3 The scenario

`truncation-pixels` (headless) and `live-truncation` (a real window), both
sharing one check function through the `FrameReader` pair the other probes use
(`captureHeadless` / `captureLive` + `readAsync`), exactly like
`text-decoration.tsx`.

Checks (the exact expected ratio and spill count are **filled from the first
run**, then frozen):

1. the four fixtures are distinct and the short run paints ink;
2. the ellipsis run's right edge is a **dot run** (ratio below the measured
   dot ceiling);
3. the clipped control's right edge is **taller** than the ellipsis's (the
   differential, so a blank edge cannot pass);
4. the ellipsis and clip runs paint **no ink outside** their boxes;
5. the stage point stays `background`.

## 4. Commands

```sh
nub run --filter playground build
nub apps/playground/dist/smoke/run.js --only text-truncation-pixels
nub apps/playground/dist/live/run.js --only live-truncation
nub run test          # the new pure module's tests, plus the suite
```

Expected: the focused headless and live runs green with the measured ratios
printed in the check descriptions; the full headless suite is the end-of-task
check (`116/116`), and the live registry becomes `105`.

## 5. Mutation proofs (both directions)

- **M1:** remove `textOverflow: "ellipsis"` from the ellipsis fixture → its
  right edge becomes the clipped fragment, so check 2 fails by name.
- **M2:** shorten the ellipsis run to `MMMM` (no truncation) → the right edge
  is blank, so the dots check fails by name (a blank edge is not an ellipsis).
- **M3 (unit):** raise `DOT_COLUMN_CEILING` to `1` → the clipped-capital and
  boundary tests fail, so the ceiling is load-bearing.

Each is observed red and reverted before the commit.

## 6. STOP conditions

- **The fixtures do not mount** (a box has no bounds): stop; a pixel claim needs
  painted bounds.
- **The ellipsis paints a tall right edge**: record the limitation as in §2 and
  flip check 2 to assert the measured fragment; do not widen the ceiling.
- **Ink spills outside a box**: that is a measured defect. Assert it, record it
  for `primitives`, and do not silently clip the probe's box to hide it.
- **The live and headless ratios disagree beyond the glyph tolerance**: stop and
  report both frames rather than averaging them.

## 7. Ledger updates (after the run)

| File | Change |
| ---- | ------ |
| `apps/playground/README.md` | the truncation paragraph cites the pixel probe and the measured right-edge/spill facts; the registry totals move to 116 headless / 105 live |
| `COMPONENTS.md` | the `text-truncation` row gains the pixel ids and the measured result; the suite totals move |
| `TODO.md` | tick this task with the exact commands, ids and measured numbers; tick the plan-`335` item-9 gap |
| `.agents/slop/plans/README.md` | add plan `778`'s row, status landed |
| this plan | §8 Results with the measured ratios, spill counts, mutation proofs and full-suite counts |

## 8. Results

**Landed 2026-10-20.** The runtime paints a real ellipsis. One decoded frame per
host, four fixtures, **22 checks each** (`text-truncation-pixels` headless,
`live-truncation-pixels` in a real window).

| Fixture | Right-edge ink | Tallest column | Ink beside the box |
| ------- | -------------- | -------------- | ------------------ |
| `trunc-ellipsis` | 75 / 3072 | **0.11** | **0** / 10240 |
| `trunc-clip` (`overflow: hidden`) | 713 / 3072 | **0.70** | **0** / 10240 |
| `trunc-nowrap` (no clip, no ellipsis) | 713 / 3072 | 0.70 | **1922** / 10240 |
| `trunc-short` (`MMMM`) | 0 / 3072 | 0.00 | 0 / 10240 |

Measured conclusions:

- the ellipsis is a **dot run**: a short 0.11 column, against a clipped
  capital's 0.70 — so the runtime draws `…`, it does not paint a clipped word;
- an ellipsis run and a clipped run keep **all** their ink inside the layout
  box (0 spill pixels);
- a `nowrap` run with **neither** paints **1922 ink pixels** into the strip
  beside its box; only the panel's clip kept it on screen. Truncating UI must
  supply `overflow: "hidden"` or `textOverflow`, which the shipped `Text`
  does.

The first two thresholds were frozen from this run: `DOT_COLUMN_CEILING = 0.4`
(between 0.11 and 0.70) and `CLIPPED_COLUMN_FLOOR = 0.6`.

**The unit test found a defect in the metric before it shipped:** `looksLikeDots`
returned `true` for a blank edge (`sampled > 0`, ratio `0`), so a run with no
ink at all would have "passed" as an ellipsis. It now requires `ink > 0`; the
`counts only the run's ink` test fails without that guard.

**Mutation proofs, observed red and reverted:**

- **M1** — removing `textOverflow` from the ellipsis fixture: `the ellipsis
  paints a dot run at the right edge` fails with
  `ink=713/3072 column=0.70 row=0.70`;
- **M2** — shortening the ellipsis run to `MMMM` (no truncation): the same
  check fails with `ink=0/3072 column=0.00` — the blank-edge guard;
- **M3 (unit)** — `DOT_COLUMN_CEILING = 1`: `reads a clipped capital` and
  `sits either side of the dot ceiling` fail.

**Verification.**

```sh
nub run --filter playground build
nub apps/playground/dist/smoke/run.js --only text-truncation-pixels   # 1/1, 22 checks, 9.7 s (28.5 s first cold)
nub apps/playground/dist/live/run.js --only live-truncation-pixels    # 1/1, 22 checks, 8.0 s
nub apps/playground/dist/smoke/run.js                                 # 116/116, 4228 checks, 65 capabilities, 275.0 s, exit 0
nub run --filter playground test                                      # 561 tests (13 new)
```

The end-of-task headless total is plan `777`'s `4206 + 22 = 4228`. The live
registry is **105** (`live-truncation-pixels` focused-green); the full live
suite remains the merge/release gate and was not re-run here.

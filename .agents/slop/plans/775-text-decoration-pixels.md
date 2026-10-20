# 775 — Text decoration, in the frame: underline, line-through, and the link variant's inheritance

**Phase:** F (pixel evidence) · **Workstream:** playground · **Status:** landed

**Depends on:** `100`, `110`, `120`, `140`, `150`, `197`, `342`, `591`, `674`,
`690`, `697`, `701`, `707`, `708`, `713`, `715`, `722`, `736`, `745`, `754`,
`761`, `764`, `771`, `773`.

**Owns:** `apps/playground` and `packages/testing` only. No other path is edited.

---

## 1. The bug being guarded

`textDecoration` is a declared style in the pinned `@gpuix/native@0.10.0`
(`dist/host.d.ts`: `"underline" | "line-through" | "none"`), and two shipped
surfaces use it:

- `packages/primitives/src/core/variants.ts` — the **`link` Button variant**
  adds `textDecoration: "underline"` in its **hover** refinement, on the
  button's own `div`, not on a `<text>` child;
- `packages/tw/src/utilities.ts` — the `underline` utility.

No check reads the frame for it. `paintedStyle` reports the **authored** value
and `getPaintedText()` returns the **source** run, so a runtime that accepts
`textDecoration` and paints no line would pass every existing check. A link's
hover affordance and a struck-through row would both be invisible while the
suite stayed green — the same hole plans `736`, `745`, `754`, `761` and `773`
closed for shadows, borders, pointer states, opacity and ink.

The second, separate question is **inheritance**. CSS propagates
`text-decoration` to descendants; the `link` variant depends on that, because
the declaration sits on the button div and the label is a child `<text>`. GPUI's
decoration is a per-run text style, and the pinned renderer's behaviour is
unmeasured. Both outcomes are actionable, so the probe measures rather than
assumes.

**Goal:** prove, from the decoded frame, that `underline` and `line-through`
paint a continuous line in the right band of a `<text>` run, in the run's own
ink colour; prove the undeclared control paints none; and record, with a check
that fails when it changes, whether a parent div's decoration reaches its child
`<text>`.

---

## 2. What is deliberately *not* claimed

- **Decoration offset, thickness or style.** Only presence, band, continuity and
  colour. The runtime's offset is a font metric, not an authored value.
- **`textDecoration` on `<code>` / `<diff>`.** Separate syntax surfaces; this
  probe mounts plain `<text>` runs so the result cannot be attributed to
  syntax highlighting.
- **Dotted/dashed decorations.** The pinned type admits only `underline`,
  `line-through` and `none`.
- **The `link` Button's hover mechanics.** That a hover refinement applies at
  all is plan `754`'s contract; this probe isolates the decoration's paint and
  inheritance.
- **Selection or highlight interaction with a decoration.**

If §5 step 1 measures that a declared decoration paints **no** line, **stop**
and record it — do not widen the continuity threshold until it passes.

---

## 3. Design

### 3.1 The fixture (`apps/playground/src/scenarios/text-decoration.tsx`)

One `640 × 360` stage on `theme.colors.background`, with four `card` panels at
the plan-773 offsets (`(24, 24)`, `(336, 24)`, `(24, 136)`, `(336, 136)`, each
`280 × 96`, `padding: 8`). Each panel holds one `<text>` run, `MMMM`, at
`fontSize: 64`, `lineHeight: 64`, `color: theme.colors.foreground`:

| `testId` | Panel | Declaration | Why |
| -------- | ----- | ----------- | --- |
| `decoration-none` | `card` | none | the falsifiable control |
| `decoration-underline` | `card` | `textDecoration: "underline"` on the run | the direct contract |
| `decoration-strike` | `card` | `textDecoration: "line-through"` on the run | the second value |
| `decoration-inherited` | `card` | `textDecoration: "underline"` on a **wrapper `div`** around the run | the `link` variant's shape |

The wrapper in the fourth fixture carries `testId="decoration-inherited-box"`
so the scan can distinguish "the run was painted" from "the wrapper's line was
painted". The run keeps `testId="decoration-inherited"`.

Same dense capitals as plan `773`: fully-covered glyph stems give clean rows,
and the four boxes are far apart so no scan can read a neighbour's line.

### 3.2 The metric (`apps/playground/src/scenarios/text-decoration-model.ts`)

A decoration is a **long continuous horizontal run of ink on one device row**.
Glyph rows are short strokes separated by counters, so one number separates
them: the longest contiguous run of ink pixels on a row.

```ts
/** Longest contiguous run of ink pixels on one device row, and where it is. */
export interface DecorationRow {
  readonly row: number;       // device row inside the box
  readonly y: number;         // row / box height, 0 at the top
  readonly span: number;      // device pixels, contiguous
  readonly colour: Pixels.Rgba; // the modal ink colour on that row
}

export interface DecorationScan {
  readonly sampled: number;
  readonly ink: number;
  readonly widths: ReadonlyArray<number>; // longest run per row
  readonly widest: Option.Option<DecorationRow>;
}
```

- `scanDecoration(frame, window, box, ink, tolerance)` walks the box's **device**
  pixels through `Pixels.frameScale` (the plan-773 rule; a mismatched frame
  returns `sampled: 0`, never a pass).
- A row's run is contiguous only through pixels within `tolerance` of the run's
  ink colour. Gaps, panel background and anti-aliased edges break it.
- `widest` is the row with the longest run; ties take the **lowest** row.
- `decorationPresent(scan, box, factor, band)` is
  `span >= box.width * factor * DECORATION_SPAN` **and** the row's normalised
  `y` inside `band`.
- Bands: `UNDERLINE_BAND = [0.62, 0.78]`, `STRIKE_BAND = [0.35, 0.55]`. The
  control check is the same predicate with `band = ANY_BAND = [0, 1]` and must
  be **false**. Both bands are **panel-relative** — see §3.5 for the measured
  reason.

`DECORATION_SPAN = 0.6` of the run's device width. The measured advance of
`MMMM` at 64 px is ~236 logical px inside a `264`-wide block, so an underline
covers ≥ 89 % of the box; a 60 % threshold leaves room for the trailing gap
after the last glyph while staying far above a glyph stroke (a 64 px stem is
~12 logical px = 24 device px, 4.5 % of the box). The plan-773 box reports
`264 × 64` logical = `67,584` device pixels at scale 2.

Keep the classification **pure and shared**:

```ts
export const decorationBand = (
  scan: DecorationScan,
  factor: number,
): Option.Option<"underline" | "strike" | "elsewhere">;
```

`elsewhere` is a line above the strike band — it must not count as either
decoration, so a stray panel border or a highlight cannot pass.

### 3.3 The shared checks (`text-decoration.tsx`)

One `decorationChecks(ctx, driver)` used by both hosts, exactly like
`text-ink.tsx`:

1. `the decoration controls are distinct` — the control, underline and strike
   fixtures are three separate ids (a drift guard).
2. `the frame's device scale is an integer` — `Pixels.frameScale`.
3. Parse `foreground` with `parseColour` and record one named check.
4. For each of the four runs: `paintedBox` (its own check) and
   `scanDecoration`, then:
   - `the none run paints no line` — `decorationPresent(…, ANY_BAND) === false`;
   - `the none run has ink` — `scan.ink >= MIN_INK_PIXELS` (the control is not
     a blank box, so "no line" is not vacuous);
   - `the underline run paints a line in its band` — present with
     `UNDERLINE_BAND`;
   - `the strike run paints a line in its band` — present with `STRIKE_BAND`;
   - `the {role} line is the run's ink` — the widest row's `colour` is near
     `foreground` (this is the colour half; a hard-coded black/panel line fails).
5. **The inheritance fixture — asserted as measured: it *does* inherit.** The
   wrapper `div`'s `underline` reaches the child `<text>` and paints a line at
   the same row as the direct declaration (measured, §7), so the check reads
   `the wrapper's decoration reaches its child run` and uses
   `UNDERLINE_BAND`. This is the `link` Button variant's production shape: its
   hover underline is visible. If a future runtime stops propagating the
   declaration the check fails by name and the record is corrected — the
   direction is recorded, never assumed.
6. `the underline sits below the strike band` — a direct comparison of the two
   widest rows' normalised `y`, so the probe cannot pass if both lines land in
   the same place (this catches a renderer that draws every decoration at one
   offset).
7. `the stage point is the background token` — sample `stage.x + 620,
   stage.y + 348`, outside every panel.

The inheritance design is deliberate: a **div-level** declaration is the shape
the shipped `link` variant uses, so measuring only the `<text>`-level form would
leave the production path unproven.

### 3.5 The scan region: the panel, not the run's box

Measured while executing this plan: an underline is painted **1–2 device px
below the `<text>` element's reported box** with `lineHeight: 64` — the line
sits in the leading space under the baseline, outside the box the tracker
returns. A scan bounded by the run therefore misses it (the first run measured
the underline's widest glyph row, 21 px, and failed).

The probe scans each fixture's **panel** box instead (`280 × 96`, which contains
the run and its `8` px padding). The four panels are disjoint, so no scan can
read a neighbour's line, and the bands above are normalised against the panel's
reported box. This is a measured harness fact, not a stylistic choice: a
consumer that wants to hit-test a decoration must not use the text box either.

### 3.4 Scenario registration

```ts
export const textDecorationView = (): ReactNode => <TextDecorationProbe />;

export const textDecorationScenario: PlaygroundScenario = {
  id: "text-decoration-pixels",
  title: "Text decoration: underline and line-through reach the frame",
  capability: "text",
  view: textDecorationView,
  steps: (ctx) => decorationChecks(ctx, headlessDriver(ctx.host)),
};

export const textDecorationLiveScenario: Smoke.AsyncSmokeScenario = {
  id: "live-text-decoration",
  title: "Live text decoration: underline and line-through in a window",
  capability: "text",
  steps: (ctx) => decorationChecks(ctx, liveDriver(ctx.host)),
};
```

Both use `readSync`/`readAsync`, `paintedBox`, `parseColour`,
`captureHeadless`/`captureLive` and `asHex` from `frames.ts`; the live driver
sleeps `120 ms` before the capture (the `opacity.tsx`/`text-ink.tsx` pattern) and
the live `ready` id is `decoration-stage`.

Register:

- `apps/playground/src/scenarios/index.ts` — import and add
  `textDecorationScenario` beside `textInkScenario`;
- `apps/playground/src/live/scenarios.tsx` — import
  `textDecorationLiveScenario, textDecorationView`; add a `live-text-decoration`
  `LiveScenario` that spreads the scenario, sets `view`, `ready:
  "decoration-stage"`, and taps a screenshot to
  `${LIVE_ARTIFACTS}/live-text-decoration.png`; add it beside `liveTextInk`.

`capability: "text"` is already live-covered, so
`apps/playground/src/live/scenario-problems.ts` needs no edit.

---

## 4. Files

| Path | Action |
| ---- | ------ |
| `apps/playground/src/scenarios/text-decoration-model.ts` | create — fixtures, scan, bands, guards |
| `apps/playground/src/scenarios/text-decoration-model.test.ts` | create — the unit tests in §6 |
| `apps/playground/src/scenarios/text-decoration.tsx` | create — view, checks, both scenarios |
| `apps/playground/src/scenarios/index.ts` | edit — register |
| `apps/playground/src/live/scenarios.tsx` | edit — register the live twin |
| `apps/playground/README.md` | edit — measured table + live id row + suite totals |
| `COMPONENTS.md` | edit — the Text row (and Button's `link` note if §5 measures absence) |
| `TODO.md` | edit — tick with the measured facts |
| `.agents/slop/plans/README.md` | edit — plan row + number note |

No other path. Anything else that needs a change is a cross-team `TODO.md` row.

---

## 5. Steps, commands and expected results

Run from the worktree root
`/Users/cyberistic/GPUIXUI/workspaces/playground`.

1. **Feasibility, before writing the scenario.** Add the four fixtures to a
   scratch `steps` in the new scenario, build, and run
   `nub apps/playground/dist/smoke/run.js --only text-decoration-pixels`,
   printing `scan.widest` and `scan.widths` per fixture with `Effect.logInfo`.
   **Expected:** the control's widest run is well under 60 % of the box; the
   underline's is over 60 % in the lower band; the strike's is over 60 % in the
   middle band. **STOP CONDITION:** if the control's own glyphs reach 60 %, pick
   a longer run or raise `DECORATION_SPAN` once, with the measurement recorded —
   never raise it after seeing a real decoration fail. If a declared decoration
   paints nothing, go to §8 and record the defect.
2. Remove the debug logging, keep the checks.
3. `nub run --filter playground build` — expected `Done` for both the harness
   build and `tsc -p tsconfig.build.json`, exit `0`.
4. `nub apps/playground/dist/smoke/run.js --only text-decoration-pixels` —
   expected `1/1 scenarios passed`, `text=verified`.
5. `nub apps/playground/dist/live/run.js --only live-text-decoration` — expected
   `1/1`, exit `0`, and the PNG at
   `apps/playground/.artifacts/screenshots/live-text-decoration.png`.
6. `nub run --filter playground test` — expected the previous 538 tests plus the
   new model tests, all green.
7. `nub run check`, `nub run lint` — expected exit `0`.
8. **End of task:** `nub apps/playground/dist/smoke/run.js` — expected
   `115/115`, exit `0`, with the new check total equal to the previous
   `4188 + text-decoration-pixels' checks`.
9. Update the README/COMPONENTS/TODO/plan-index facts from the **observed**
   numbers. Do not copy §7's predictions into the ledger as if measured.

**Two-direction proof (required).**

- **M1 — the contract:** change the underline fixture's declaration to `"none"`.
  Expected: `the underline run paints a line in its band` fails by name, exit
  `1`; revert and re-run green.
- **M2 — the inversion (catches a permissive scan):** point the control's
  `decorationPresent` at `INK_TOLERANCE_LINE`'s expected colour but keep the
  glyphs; expected: `the none run paints no line` **stays green**, proving the
  control check is not merely "some ink". Then give the control
  `textDecoration: "underline"`; expected: `the none run paints no line` fails,
  exit `1`; revert.
- Record both in §7 with the actual failure text, and run the reverted scenario
  once more before calling it done.

---

## 6. Test plan (`text-decoration-model.test.ts`)

Vitest, co-located. Every test can fail; none asserts a value back that it
stubbed.

1. **`scanDecoration` finds a full-width line.** A synthetic `40 × 20` frame,
   card background, a solid `30 × 2` ink block on rows 15–16: `widest.span ===
   30`, `y` in the underline band, `colour` near the ink.
2. **A glyph-only row does not qualify.** The same frame with three `2 × 8`
   stems instead of the line: `decorationPresent(…, ANY_BAND, 0.5) === false`.
3. **Contiguity is load-bearing.** A row of ten `1 px` dots with 1 px gaps
   never produces a run longer than 1, so a dashed rendering is not counted as
   a solid underline (the pinned type admits only solid values, so this guards
   the metric rather than a future style).
4. **The band classifies.** A full-width line at 20 % is `elsewhere`, at 45 %
   is `strike`, at 80 % is `underline` for a 20-row box.
5. **The device scale is applied.** The same logical fixture in a `2×` frame
   reports the same normalised `y` and a span in **device** pixels.
6. **A mismatched frame samples nothing.** A `10 × 6` frame against a `6 × 6`
   window returns `sampled === 0` and `widest === None`.
7. **The colour is the run's ink, not the panel.** A line painted
   `card`-coloured with `foreground` glyphs has `widest.colour` near `card`; a
   cross check against `foreground` fails.
8. **The fixtures are distinct and cover three declarations.** `decorationFixtures`
   has four entries with unique ids and exactly one of each
   `none | underline | strike | wrapper`.
9. **`decorationPresent` is a threshold, not a non-empty test.** A span of 59 %
   is false and 61 % is true at `DECORATION_SPAN = 0.6`, in the right band.

Mutation check for the unit file itself (record in §7): set `DECORATION_SPAN` to
`0` and expect test 2 to fail; revert.

---

## 7. Measured results (fill after the run)

| Fact | Value |
| ---- | ----- |
| headless frame / device scale | `2560 × 1600` for `1280 × 800` — scale **2** |
| live frame / device scale | `2200 × 1440` for `1100 × 720` — scale **2** |
| scan box | the panel, `280 × 96` logical = 560 × 192 device pixels |
| run box | `264 × 64` logical; the underline paints **1–2 device px below** it |
| control's widest contiguous run | **22** device px (a glyph stem), at `y ≈ 0.2` |
| underline's widest run / band | **427** device px (76 % of the panel) at **`y = 0.67`** |
| strike's widest run / band | **427** device px at **`y = 0.45`** |
| wrapper inheritance | **present** — the wrapper's line paints at the same `y = 0.67` as the direct declaration |
| decoration colour | exactly `#EEF1F5` (the `foreground` token) for both lines |
| check count per host | **18** |
| headless suite | `115/115`, **4206** checks, 65 capabilities, exit `0` (was 114/114 · 4188) |
| live registry | `103 → 104`; focused `live-text-decoration` green, 18 checks, exit `0` |
| playground unit tests | **548** (was 538, +10) |
| both-direction failures | **M1** the underline declared as `line-through` → `the underline paints a line in its band` (`widest 427px at y=0.45`), exit `1`; **M2** the control given `underline` → `the undeclared run paints no line` (`widest 427px at y=0.67`), exit `1`. Both reverted green. **Unit mutation:** `DECORATION_SPAN = 0` fails three tests (`glyph stems`, `contiguity`, `threshold`); reverted 548 green |

**Measured correction to the plan:** the bands are not where the CSS intuition
puts them. In the panel's box the line-through sits at `y = 0.45` (not the
"middle 0.3–0.7" band of §3.2's first draft) and the underline at `0.67`; the
first draft's `[0.62, 1]` band missed the underline by 0.01. The bands above are
the measured ones, with margin on both sides and no overlap. The underline
paints **outside** the `<text>` box, so the panel is the scan region (§3.5).

---

## 8. STOP conditions (summary)

Stop and report instead of improvising if:

- the control's glyphs produce a qualifying row at the chosen threshold and a
  second measurement cannot separate them honestly;
- a declared `underline`/`line-through` paints **no** qualifying row — record it
  as a measured defect with the frame evidence (the `link` variant's hover
  affordance is then invisible), do **not** lower `DECORATION_SPAN`;
- the decoration paints in a colour other than the run's ink — record it as a
  defect, do not relax the colour check;
- the wrapper fixture paints nothing while the direct forms paint — record the
  measured inheritance defect, assert the absence and write a cross-team row;
  do not delete the fixture;
- the live host cannot capture a frame or paints no line;
- the coverage guard requires editing `scenario-problems.ts` (it should not —
  `text` is covered);
- any gate (`check`, `lint`, `test`) fails for a reason outside this plan's
  files. Record it in `TODO.md` as a cross-team task instead of editing another
  workstream's path.

---

## 9. Acceptance

- `text-decoration-pixels` and `live-text-decoration` are registered and green
  on this host, with the frame proving the two declared decorations, the
  control's absence, the two bands and the ink colour.
- The wrapper-inheritance result is asserted in its **measured** direction and
  recorded in `COMPONENTS.md` (with a cross-team `TODO.md` row when it is a
  defect).
- The two mutation proofs fail by name and the reverted runs are green.
- `apps/playground/README.md` has the measured table; `COMPONENTS.md`'s Text row
  cites the plan; the plan index and `TODO.md` are current.
- The full headless suite and all three gates pass on the final head.

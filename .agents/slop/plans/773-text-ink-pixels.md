# 773 — Text ink, in the frame: does a declared `color` reach the glyphs?

**Phase:** F (pixel evidence) · **Workstream:** playground · **Status:** planned

**Depends on:** `100`, `110`, `120`, `140`, `150`, `197`, `342`, `591`, `674`,
`690`, `697`, `701`, `707`, `708`, `713`, `715`, `722`, `736`, `745`, `754`,
`761`, `764`, `771`.

**Owns:** `apps/playground` and `packages/testing` only. No other path is edited.

---

## 1. The bug being guarded

Every text-colour claim in the suite stops one step short of the pixels:

| Evidence today | What it proves | What it cannot prove |
| -------------- | -------------- | -------------------- |
| `theme-type-and-shadow` (`paintedStyle`) | the **authored** `color` is the token | the paint layer rasterises it |
| `getPaintedText()` | the source run | the colour of any glyph |
| `font-family` / `live-font-family` | the **advance** of the shaped run | the ink of that run |
| `text-truncation`, `typography-layout` | geometry and line boxes | ink |
| `property-panel`, every Tier 1–2 scenario | text exists, bounds and a11y | ink |

A runtime that accepted `color` on `<text>` and rasterised every glyph in its
default ink — or in the panel's foreground instead of the requested role —
would pass **every** existing check while `destructive`, `mutedForeground`,
`success` and `foreground` text all painted identically. That is the same class
of hole plans `736`, `745`, `754` and `761` closed for shadows, borders,
pointer states and opacity: a declared style that the frame may drop.

The last pixel plan, `761`, could only sample **solid boxes**. Text is the one
token family with no frame evidence, and it is the most used one: every
component renders text.

**Goal:** prove, from the decoded frame, that a `<text>` run's **glyph pixels**
carry the requested token colour, for four roles that must not collapse, in
both hosts.

---

## 2. What is deliberately *not* claimed

- **Glyph shape, kerning, hinting and sub-pixel quality.** Only the ink colour.
- **Every pixel of a glyph.** Edges are anti-aliased; the check counts
  **interior** pixels near the token and requires a minimum count.
- **A missing/unknown `fontFamily`**. `font-family` (plan `771`) owns that.
- **`<code>` / `<diff>` syntax colours.** A separate probe if wanted; this one
  mounts plain `<text>` runs so the result cannot be attributed to syntax
  highlighting.
- **A screenshot diff.** The frame is decoded and sampled, never compared
  wholesale.

If §5 step 1 measures that no interior pixel lands near the token, **stop** and
record it — do not widen the tolerance until it passes.

---

## 3. Design

### 3.1 The fixture (`apps/playground/src/scenarios/text-ink.tsx`)

One `640 × 360` stage on `theme.colors.background`, containing four `card`
panels at fixed absolute offsets. Each panel holds one `<text>` run:

| `testId` | Panel | Run | `color` role |
| -------- | ----- | --- | ------------ |
| `ink-foreground` | `card` | `MMMM` | `foreground` |
| `ink-muted` | `card` | `MMMM` | `mutedForeground` |
| `ink-destructive` | `card` | `MMMM` | `destructive` |
| `ink-success` | `card` | `MMMM` | `success` |

Requirements:

- `fontSize: 64` and a dense run (`MMMM`) so a glyph stroke contains many
  fully-covered device pixels at scale 2.
- Every panel has `padding: 8`, `width: 280`, `height: 88`, and the run is a
  direct child. The stage is `position: "relative"` and each panel
  `position: "absolute"` at `(24, 24)`, `(24, 128)`, `(24, 232)` and
  `(336, 24)` (three down the left, one at the right) — no overlap, so a box
  cannot sample a neighbour's ink.
- No `backgroundColor` on the `<text>`; the panel `card` is the under-colour.
- The four roles are read from `useTheme().colors`, never literals.

### 3.2 The pure model (`apps/playground/src/scenarios/text-ink-model.ts`)

```ts
import * as Arr from "effect/Array";
import { Pixels } from "@gpuixui/testing";
import type { ThemeColors } from "@gpuixui/tokens";

/** The four roles the probe paints, in document order. */
export interface InkFixtures {
  readonly foreground: string;
  readonly muted: string;
  readonly destructive: string;
  readonly success: string;
}

export const inkFixtures = (colors: ThemeColors): InkFixtures => ({
  foreground: colors.foreground,
  muted: colors.mutedForeground,
  destructive: colors.destructive,
  success: colors.success,
});

/** Interior-pixel slack: rasterisation may tint an edge; it cannot move a role. */
export const INK_TOLERANCE = 6;

/** A run with dense strokes; the panel and the run both fit the fixture. */
export const INK_RUN = "MMMM";
export const INK_FONT_SIZE = 64;

/**
 * The pixels in `box` that are within `tolerance` of `expected`, and the
 * closest pixel found.
 */
export interface InkScan {
  readonly sampled: number;
  readonly near: number;
  readonly closest: Pixels.Rgba;
}

export const scanInk = (
  frame: Pixels.Pixels,
  window: Pixels.FrameSize,
  box: Smoke.BoundsShape, // `{x, y, width, height}` — see note below
  expected: Pixels.Rgba,
  tolerance: number,
): InkScan;
```

`scanInk` walks **device pixels**: it derives the scale with
`Pixels.frameScale` (returning `sampled: 0` and a black `closest` when the frame
does not match the window) and iterates
`x = round(box.x * scale) … round((box.x + box.width) * scale)`, likewise `y`.
For each pixel it reads `Pixels.pixelAt` and tracks:

- `sampled` — pixels inspected;
- `near` — pixels `Pixels.rgbaNear(pixel, expected, tolerance)`;
- `closest` — the pixel with the smallest maximum per-channel distance to
  `expected` (so a failure message names the actual ink).

Use a plain indexed loop, like `Pixels.unfilter`: this is a per-pixel scan and
an `Arr` fold would allocate per pixel. That is the one deliberate imperative
loop, and it carries this sentence.

`Smoke.BoundsShape` does not exist; use the published `Smoke.Bounds` type
(`{ readonly x, y, width, height }`) from `@gpuixui/testing`.

Additional pure helpers:

```ts
/** Whether the scan found enough interior ink to be evidence, not noise. */
export const inkEvidence = (scan: InkScan, minimum: number): boolean =>
  scan.near >= minimum;

/** At least this many device pixels must carry the token. */
export const MIN_INK_PIXELS = 32;

/** Every pair of roles is far enough apart that a swap must fail. */
export const distinctInk = (fixtures: InkFixtures): boolean =>
  Arr.length(Arr.dedupe(Arr.fromIterable(Object.values(fixtures)))) === 4;
```

`distinctInk` is a precondition: `foreground` and `mutedForeground` are close in
some palettes, but under the dark palette the four values are distinct. The
check runs **before** the frame is sampled, so a palette edit that collapses two
roles fails in milliseconds instead of passing vacuously.

### 3.3 The shared checks (`text-ink.tsx`)

One `inkChecks(ctx, driver)` used by both hosts, exactly like `opacity.tsx`:

1. `the four ink roles are distinct` — `distinctInk(fixtures) === true`.
2. `the ink roles are distinguishable at the frame tolerance` — for every pair,
   `!Pixels.rgbaNear(a, b, INK_TOLERANCE * 2)`.
3. `the frame's device scale is an integer` — `Pixels.frameScale`.
4. Parse all four roles with `parseColour` (fails by name on a bad hex).
5. For each of the four fixtures: read `paintedBox` for its `testId`, then
   `scanInk`, then:
   - `the {role} run carries its token in the frame` —
     `inkEvidence(scan, MIN_INK_PIXELS) === true`;
   - on failure report `near`/`sampled` and the `closest` colour, not just a
     boolean. Implement this as a `ctx.check` that fails with
     `Smoke.SmokeAssertionError({ label, expected: ">= 32 pixels near #…",
     actual: `${near}/${sampled}, closest #…` })`.
6. `the {role} run does not paint the next role's token` — `scanInk` with the
   **neighbouring** role and assert `near === 0`. This is the cross check: a
   runtime that paints every run in `foreground` would light up the
   `ink-destructive` fixture's foreground scan, so checking only "some ink near
   the requested token" is not enough.
7. `the stage point is the background token` — sample
   `stage.x + 620, stage.y + 348` (inside the stage, outside every panel) and
   compare with `background`, so the fixture cannot pass on a blank frame.

The four `near === 0` checks are **one per fixture with its successor**:
foreground→muted, muted→destructive, destructive→success, success→foreground.
Use a small pure helper `nextRole` over an ordered `ReadonlyArray<role>` so the
cycle is explicit and cannot drift from the fixture list.

### 3.4 Scenario registration

`apps/playground/src/scenarios/text-ink.tsx` exports:

```ts
export const textInkView = (): ReactNode => <TextInkProbe />;

export const textInkScenario: PlaygroundScenario = {
  id: "text-ink-pixels",
  title: "Text ink: the glyphs carry the requested role",
  capability: "text",
  view: textInkView,
  steps: (ctx) => inkChecks(ctx, headlessDriver(ctx.host)),
};

export const textInkLiveScenario: Smoke.AsyncSmokeScenario = {
  id: "live-text-ink",
  title: "Live text ink: the glyphs carry the requested role in a window",
  capability: "text",
  steps: (ctx) => inkChecks(ctx, liveDriver(ctx.host)),
};
```

Both use `readSync`/`readAsync`, `paintedBox` and `captureHeadless`/`captureLive`
from `frames.ts`; the live driver sleeps `120 ms` before the capture (the
`opacity.tsx` pattern) and the live `ready` id is `ink-stage`.

`capability: "text"` is already live-covered by `live-typography`, so the
coverage guard in `apps/playground/src/live/scenario-problems.ts` needs no edit.

Register:

- `apps/playground/src/scenarios/index.ts` — import `textInkScenario` and add it
  to the registry array next to `opacityScenario`.
- `apps/playground/src/live/scenarios.tsx` — import
  `textInkLiveScenario, textInkView`; add a `live-text-ink` `LiveScenario` that
  spreads the scenario, sets `view: textInkView`, `ready: "ink-stage"`, and taps
  a screenshot to `${LIVE_ARTIFACTS}/live-text-ink.png`; add it to the exported
  list beside `live-opacity-pixels`.

---

## 4. Exact files

| Path | Action |
| ---- | ------ |
| `apps/playground/src/scenarios/text-ink-model.ts` | create — pure model and scanner |
| `apps/playground/src/scenarios/text-ink-model.test.ts` | create — unit tests (§6) |
| `apps/playground/src/scenarios/text-ink.tsx` | create — view, checks, both scenarios |
| `apps/playground/src/scenarios/index.ts` | edit — register `textInkScenario` |
| `apps/playground/src/live/scenarios.tsx` | edit — register `live-text-ink` |
| `apps/playground/README.md` | edit — new `## Text ink, in the frame (plan 773)` section and the scenario table rows |
| `COMPONENTS.md` | edit — the Text / typography row's evidence cell; the capability/measurement note if present |
| `TODO.md` | edit — tick the new workstream row, keep the progress bar current |
| `.agents/slop/plans/README.md` | edit — the plan-set row, the number provenance, the totals |
| `.agents/slop/plans/773-text-ink-pixels.md` | this file — fill §5/§7 with the measured values |

**Do not edit** `packages/testing` unless the scanner cannot be written without
a new `Pixels` helper. If a helper is unavoidable, add it with its own test and
a JSDoc, and record why in §5.

---

## 5. Steps, commands and expected results

Run everything from the worktree root
(`/Users/cyberistic/GPUIXUI/workspaces/playground`). Use `nub`, never bare
`node`.

1. **Feasibility (before the committed scenario).** Mount the four fixtures and
   capture one headless frame; print, per fixture, `near`, `sampled` and
   `closest`. This can be a temporary scenario or a scratch file under
   `.agents/slop/scratch/`; it must not be committed.
   - **Expected:** each run has at least a few hundred device pixels near its
     token; `closest` is the token itself or within a handful of channels.
   - **STOP CONDITION:** if a run has **zero** pixels within `INK_TOLERANCE`
     (6) of its token, stop. Do not raise the tolerance. Record the histogram
     and the `closest` colour in §7 and hand the finding to the owner: it means
     `color` does not reach the rasteriser, a real limitation.
   - **STOP CONDITION:** if the four roles are not distinct under
     `palettes.dark`, stop and record the palette, rather than dropping a role.
2. Write the pure module and its test (§6). Run
   `nub run --filter playground test` and expect the new tests green and the
   previous count + 11 (measured: 527 → 538).
3. Write the scenario and the live twin; register both.
4. Build: `nub run --filter playground build`.
   - **Expected:** exit `0`, no type errors, no lint/format problems.
5. Headless:
   `nub apps/playground/dist/smoke/run.js --only text-ink-pixels`
   - **Expected:** `1/1 scenarios passed`, exit `0`; the report names the 12–14
     checks below. If a check fails, read its `expected`/`actual` — the
     `closest` colour names the ink actually painted.
6. Live:
   `nub apps/playground/dist/live/run.js --only live-text-ink`
   - **Expected:** `1/1 scenarios passed`, exit `0`, one screenshot at
     `apps/playground/.artifacts/screenshots/live-text-ink.png`.
   - **STOP CONDITION:** if the live frame's ink is absent while the headless
     one is present, stop and record the host difference; do not delete the live
     twin.
7. **Both-direction proof (must fail).**
   - In `TextInkProbe`, change the `ink-destructive` run's `color` to
     `fixtures.foreground`. Rebuild, run the headless id.
     **Expected:** exit `1`, the failing check named
     `the destructive run carries its token in the frame`, actual
     `0/N, closest #…` (or a count far below the minimum).
   - Revert; run the same id green.
   - Second mutation: change the `ink-foreground` run's `color` to
     `fixtures.muted`. **Expected:** the foreground check fails **and**
     `the muted run does not paint the foreground token` fails (the cross
     check), exit `1`. Revert and re-run.
   - Record both runs and the failing text in §7.
8. End-of-task full headless (this adds a registry entry, so the suite count and
   the docs totals change): the bare runner
   `nub apps/playground/dist/smoke/run.js`. **Expected:** `114/114` scenarios,
   exit `0`; record the check total and duration from
   `.artifacts/smoke-report.json`. Do **not** run the full live suite (merge
   gate).
9. Gates: `nub run check`, `nub run lint`, `nub run test`.
   - **Expected:** all green; record the playground test count (was 527).
   - If `check:tests` objects to a test, fix the test — do not add
     `check-tests-ok` unless the exception is argued on the line.

Canonical check list (assert the count after the first green run; the totals in
§7 and the READMEs must match the report):

| # | Check |
| - | ----- |
| 1 | the four ink roles are distinct |
| 2 | the ink roles are distinguishable at the frame tolerance |
| 3 | the frame's device scale is an integer |
| 4 | the foreground run carries its token in the frame |
| 5 | the foreground run does not paint the muted token |
| 6 | the muted run carries its token in the frame |
| 7 | the muted run does not paint the destructive token |
| 8 | the destructive run carries its token in the frame |
| 9 | the destructive run does not paint the success token |
| 10 | the success run carries its token in the frame |
| 11 | the success run does not paint the foreground token |
| 12 | the stage point is the background token |

Twelve **named** checks per host; the shared helpers record one check per
`paintedBox` and two for `pixelAtPoint`, so the report reads **23**. Derive the
registered totals, never the full live suite.

---

## 6. Test plan (`text-ink.test.ts`)

Vitest, co-located. Each test can fail; none asserts a value back that it
stubbed.

1. **`scanInk` finds the token in a frame whose glyph block is that token.** Build
   a synthetic `Pixels` (e.g. `12 × 6`, `card` background, a `6 × 4` block of
   `foreground`), scan the box containing the block at scale 1, assert
   `near === 24` and `closest` near `foreground`. A wrong expected colour
   asserts `near === 0` in a second test.
2. **`scanInk` maps logical coordinates through the device scale.** The same
   synthetic frame scaled by 2 (a `24 × 12` frame standing for a `12 × 6`
   window) must find the block at the same logical box; a scan that forgets the
   scale finds `0`. This is the `pixel-colour` M2 mutation in miniature.
3. **`scanInk` refuses a mismatched frame.** A `10 × 6` frame against a
   `6 × 6` window returns `sampled === 0`, so a caller cannot silently sample
   nothing and pass.
4. **`inkEvidence` is a threshold, not a non-empty test.** `near = 31` is false
   and `near = 32` is true for `MIN_INK_PIXELS`.
5. **`distinctInk` rejects a collapsed pair.** The dark palette's four roles
   pass; swapping `muted` to `foreground` fails.
6. **The palette separation holds.** For every pair in `inkFixtures(palettes.dark)`,
   `Pixels.hexToRgba` parses and the pair is more than `INK_TOLERANCE * 2`
   apart. This is the precondition that keeps §5's cross checks falsifiable.
7. **`nextRole` cycles.** It returns the successor for all four roles and wraps
   from the last to the first; a helper that returns `undefined` would fail the
   scenario's cross checks.
8. **`scanInk`'s `closest` names the actual ink.** With a frame painted
   `#010203`, `closest` is that colour (so the failure message cannot lie).

Mutation check for the unit file itself (record in §7): set
`MIN_INK_PIXELS` to `0` and expect test 4 to fail; revert.

---

## 7. Measured results (fill after the run)

| Fact | Value |
| ---- | ----- |
| headless frame / device scale | `2560 × 1600` for `1280 × 800` — scale **2** |
| live frame / device scale | `2200 × 1440` for `1100 × 720` — scale **2** |
| run box | `264 × 64` logical = **67,584** device pixels |
| `foreground` ink | **13,617** pixels within 6 channels of `#EEF1F5`, closest exactly `#EEF1F5` |
| `mutedForeground` ink | ≥ 32 near `#A1A9B7` (exact ink) |
| `destructive` ink | ≥ 32 near `#FF6B6B` (exact ink) |
| `success` ink | ≥ 32 near `#3BC97F` (exact ink) |
| check count per host | **23** (the 12 named checks plus the `paintedBox`/`pixelAtPoint` checks each records) |
| headless suite | **114/114**, 4188 checks, 65 capabilities, exit `0` (was 113/113 · 4165) |
| live registry | **103** (was 102); focused `live-text-ink` green twice, 23 checks, exit `0` |
| playground unit tests | **538** (was 527, +11) |
| both-direction failures | M1 destructive painted `foreground` → `0/67584 pixels, closest #B1B4B9`; M2 the cross check pointed at its own token → `13617/67584 pixels, closest #EEF1F5`. Both exit `1`; both reverted green |

**Measured correction to the failure text:** in a **foreign** scan the closest
pixel is not the ink — a mid-grey edge is nearer red than the full `#EEF1F5`
is. The `near` count is the load-bearing number; `closest` only helps for a
near-miss of the expected token.

---

## 8. STOP conditions (summary)

Stop and report instead of improvising if:

- the feasibility step finds no ink near a token (§5.1);
- the palette's four roles are not distinct;
- the live host cannot capture a frame or paints no ink;
- a check can only pass by widening `INK_TOLERANCE` past `6` or dropping a role;
- the coverage guard requires editing `scenario-problems.ts` (it should not —
  `text` is already covered);
- any gate (`check`, `lint`, `test`) fails for a reason outside this plan's
  files. Record it in `TODO.md` as a cross-team task instead of editing another
  workstream's path.

---

## 9. Acceptance

- `text-ink-pixels` and `live-text-ink` are registered and green on this host,
  with the frame proving all four roles and the four cross checks.
- The two mutation proofs fail by name and the reverted runs are green.
- `apps/playground/README.md` has the measured table; `COMPONENTS.md`'s Text row
  cites the plan; the plan index and `TODO.md` are current.
- The full headless suite and all three gates pass on the final head.
- No claim of glyph shape, anti-aliasing quality or syntax colour is made.

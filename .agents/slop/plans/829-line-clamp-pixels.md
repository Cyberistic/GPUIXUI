# 829 — Multi-line `lineClamp`, in the frame: the cut, the mark and the ink below

Status: planned 2026-10-21. Executor: the `playground` workstream
(`apps/playground`, `packages/testing`).

## 1. The claim being guarded

`StyleDesc` publishes `lineClamp?: number` and `textOverflow?: "ellipsis" |
"ellipsis-start"`, and the shipped `Text` primitive maps its `clamp` prop onto
`lineClamp` plus `whiteSpace` (`packages/primitives/src/core/style.ts:255-258`).

**`lineClamp` has only ever been measured as geometry.** Plan `335` read the
clamped box's height (`2 × 26 = 52`, `3 × 26 = 78`), and plan `778` proved the
**single-line** ellipsis glyph, but nothing has read the frame for a multi-line
clamp. Two defects hide behind that gap:

1. A runtime that lays out N lines but **keeps painting the rest** (a clip
   applied to the box, not to the shaped run) passes every existing check while
   the third line paints over the row below.
2. `lineClamp` **alone paints no ellipsis.** The pinned `gpui` appends the `…`
   only in `truncate_wrapped_line`, which runs when `text_style.text_overflow`
   is `Some`; with `lineClamp` and no `textOverflow`, `shape_text(..., clamp)`
   stops at N lines with no affix. `Text clamp={n}` therefore hard-cuts, and no
   scenario notices.

**The bug being guarded:** a runtime that ignores `lineClamp` at paint time, or
that grows an ellipsis from the clamp alone, or whose clamped run leaks ink
below its box, passes the whole suite.

## 2. Reconnaissance (measured on this host, 2026-10-21)

One throwaway probe (`clamp-recon.tsx`, since deleted) mounted four runs at
`fontSize: 16`, `lineHeight: 26`, `width: 240`, decoded one headless frame and
read the ink rows and the last line's column clusters. Frame scale **2**.

| fixture | declaration | box | ink bands (device rows) | last-line clusters |
| ------- | ----------- | --- | ----------------------- | ------------------ |
| `cut2` | `lineClamp: 2` | **240 × 52** | 14–42, 66–94 | `439..453 h24 top14`, `458..470 h17 top21` — a **glyph tail**, no dots |
| `ell2` | `lineClamp: 2` + `textOverflow: "ellipsis"` | **240 × 52** | 2 bands | `425..436 h22 top21` (letter), then **three dots** `438..441 h4 top34`, `446..449 h4 top34`, `454..457 h3 top34` |
| `cut3` | `lineClamp: 3` | **240 × 78** | 3 bands | no dots |
| `free` | no clamp | **240 × 104** | 14–42, 66–94, 118–146, 170–198 — **4 bands** | no dots |

Measured facts:

- The line pitch is **52 device px** (26 logical), exactly the declared
  `lineHeight`.
- **No ink below a clamped box** down to the panel's bottom, in any of the three
  clamped fixtures; the unclamped control paints its third and fourth bands
  below the two-line mark, so the no-ink scan is not vacuous.
- `lineClamp` alone is a **hard cut**: the rightmost cluster is a full x-height
  glyph (`h17`, top 21), never a dot.
- `lineClamp` + `textOverflow: "ellipsis"` **does** paint the mark: three
  clusters of 3–4 device px, tops at row 34 (below half the 52 px line), gaps of
  4 device px, spanning 438–457 (20 device px, 0.38 line).

Source confirmation: `.../gpuix/zed/crates/gpui/src/elements/text.rs` —
`truncate_wrapped_line` (the only `…` affix) is gated on
`text_style.text_overflow`; otherwise the wrapped shape stops at `line_clamp`.

Plan `335` also recorded that the text layout cache key is `(string, width)` and
**ignores `lineClamp`**, so every fixture must use a distinct string.

## 3. Design

### 3.1 The fixture

One 640 × 400 stage of four 280 × 180 `card` panels at `(16, 16)`, `(336, 16)`,
`(16, 200)`, `(336, 200)`, each with `padding: 8` and a 240-wide box
(`testId="clamp-<kind>"`) holding one `<text>` (`fontSize: 16`, `lineHeight: 26`,
`foreground`).

| kind | declaration | run | expected |
| ---- | ----------- | --- | -------- |
| `cut` | `lineClamp: 2` | A | box **52**, **2** bands, **no** dots, glyph tail |
| `mark` | `lineClamp: 2` + `textOverflow: "ellipsis"` | D | box **52**, **2** bands, **3** dots |
| `three` | `lineClamp: 3` | B | box **78**, **3** bands, **no** dots |
| `free` | none | C | box **104**, **4** bands, ink below the 2-line mark |

The runs are the four distinct sentences the reconnaissance measured (A–D in
§2), kept verbatim so the wrap counts are the measured ones.

### 3.2 The checks (~20 per host)

Every expectation is computed by `line-clamp-model.ts`; the scenario restates no
number.

1. `the line-clamp fixtures are distinct` — ids **and** runs are unique (the
   `(string, width)` cache trap).
2. `the foreground role parses`.
3. `the frame's device scale is an integer`.
4. `clamp 2 measures two line boxes` — 52.
5. `the marked clamp measures two line boxes` — 52.
6. `clamp 3 measures three line boxes` — 78.
7. `the unclamped control measures four line boxes` — 104.
8. `clamp 2 paints two ink bands`.
9. `the marked clamp paints two ink bands`.
10. `clamp 3 paints three ink bands`.
11. `the unclamped control paints four ink bands`.
12. `the line pitch is the declared line height` — every consecutive band top in
    the free control is `LINE_HEIGHT × scale` apart.
13. `clamp 2 paints no ink below its box` — **load-bearing**: the strip from the
    box's bottom to the panel's bottom is empty.
14. `the marked clamp paints no ink below its box`.
15. `clamp 3 paints no ink below its box`.
16. `the unclamped control paints below the two-line mark` — **non-vacuity**: the
    same strip holds ink when nothing clamps.
17. `clamp 2 paints no ellipsis` — no trailing dot run, and the rightmost cluster
    is at least `0.2` of the line tall.
18. `the marked clamp paints exactly three dots` — the trailing dot run is 3,
    each dot ≤ `0.15` line tall with its top ≥ `0.5` line, gaps ≤ `0.2` line,
    span ≤ `1.5` line.
19. `clamp 3 paints no ellipsis`.
20. `the stage point is the background token`.

### 3.3 The pure helper — `apps/playground/src/scenarios/line-clamp-model.ts`

```ts
/** The fixtures, their expected line count and their measured wrap. */
export const CLAMP_FIXTURES: ReadonlyArray<ClampFixture>;
export const expectedLines: (fixture: ClampFixture) => number;
export const expectedHeight: (fixture: ClampFixture) => number;
/** The last line's box, for the tail clusters. */
export const lastLineOf: (box: Smoke.Bounds) => Smoke.Bounds;
/** The strip between a box's bottom and its panel's bottom. */
export const stripBelow: (box: Smoke.Bounds, panel: Smoke.Bounds) => Smoke.Bounds;
/** Contiguous ink row bands inside a box, relative to its top (device px). */
export const inkBands: (frame, window, box, ink, tolerance) => ReadonlyArray<InkBand>;
/** The distance between consecutive band tops, or `None` below two bands. */
export const bandPitch: (bands) => Option.Option<number>;
/** Ink pixels inside a strip. */
export const inkInStrip: (frame, window, strip, ink, tolerance) => number;
/** Contiguous ink column clusters in the last line, relative to its top. */
export const tailClusters: (frame, window, box, ink, tolerance, bandPx) => ReadonlyArray<InkCluster>;
/** The maximal suffix of dot-shaped clusters, with its gaps and span. */
export const dotRun: (clusters, lineHeightPx) => DotRun;
/** Whether a dot run is exactly the ellipsis mark. */
export const isEllipsis: (run: DotRun, lineHeightPx) => boolean;
/** The rightmost cluster's height as a share of the line. */
export const glyphTail: (clusters, lineHeightPx) => number;
export const fixturesDistinct: (fixtures) => boolean;
```

Pixel walking is indexed on purpose, exactly as `frames.ts` and
`truncation-model.ts` do: it visits tens of thousands of bytes and an `Arr` fold
would allocate per pixel. The module documents that exception.

## 4. Exact files

Create:

1. `apps/playground/src/scenarios/line-clamp-model.ts`
2. `apps/playground/src/scenarios/line-clamp-model.test.ts`
3. `apps/playground/src/scenarios/line-clamp.tsx` — view, shared `clampChecks`,
   headless scenario `line-clamp-pixels`.

Change:

4. `apps/playground/src/scenarios/index.ts` — import + register
   `lineClampPixelsScenario`; capability `truncation`.
5. `apps/playground/src/live/scenarios.tsx` — the `live-line-clamp` twin
   (spread the live scenario, `view`, `ready: "clamp-stage"`, screenshot to
   `${LIVE_ARTIFACTS}/live-line-clamp.png`) and its export.
6. `apps/playground/README.md` — a `## Multi-line lineClamp (plan 829)` section
   plus the live-registry row.
7. `COMPONENTS.md` — the `truncation` capability row and the truncation section
   note.
8. `PLAN.md` — one decision row (D100).
9. `TODO.md` — one ticked row, and one **cross-team** row for `primitives`:
   `Text clamp` paints no ellipsis.
10. `.agents/slop/plans/README.md` — this plan's row and the number claim
    (`828` was claimed by another workstream; `829` verified free across every
    worktree at claim time).

Delete:

11. `apps/playground/src/scenarios/clamp-recon.tsx` and its registry entry — the
    throwaway reconnaissance probe (never committed).

## 5. Steps, commands, expected results

1. `nub run --filter playground test line-clamp-model` → the new unit tests pass.
2. `nub run --filter playground build` → exit `0`, binding current.
3. `nub apps/playground/dist/smoke/run.js --list | grep -c line-clamp`
   → `1`.
4. `nub apps/playground/dist/smoke/run.js --only line-clamp-pixels`
   → `1/1 scenarios passed`, ~20 checks; record every measured number in §9.
5. `nub apps/playground/dist/live/run.js --only live-line-clamp`
   → `1/1 scenarios passed`, three consecutive runs, one screenshot.
6. Mutations (§6.2), each rebuilt and re-run focused; revert each.
7. `nub run check`, `nub run lint`, `nub run test` → exit `0`. The full headless
   suite is the end-of-task check for the registry change.

## 6. Test plan

### 6.1 Unit tests (`line-clamp-model.test.ts`, synthetic frames)

A synthetic `Pixels` whose `width`/`height` equal the window (scale `1`) with
painted rectangles, following `qr-pixels.test.ts`.

1. `inkBands` finds two bands for two 10-row strips with a 10-row gap, and
   `bandPitch` is 20.
2. `inkBands` returns `[]` on a blank frame, and `bandPitch` is `None` — a blank
   capture cannot pass a band count.
3. `inkBands` ignores ink outside the box (the strip is not the box).
4. `inkInStrip` counts only ink inside the strip, so the no-ink and non-vacuity
   checks are the same measurement.
5. `tailClusters` groups three short low clusters into three clusters with their
   gaps, and `dotRun` returns 3 with `isEllipsis` true.
6. `dotRun` returns 0 for a tall rightmost cluster, and `glyphTail` is ≥ `0.2`.
7. `isEllipsis` rejects 2 or 4 dots, a dot whose top is high, and a gap that is
   too wide — three separate negative cases.
8. `lastLineOf` moves a 2-line box's last line to `y + 26`; `stripBelow` starts
   at the box's bottom.
9. `expectedLines` returns the clamp when declared and the measured free wrap
   otherwise; `expectedHeight` is `lines × 26`.
10. `fixturesDistinct` rejects two fixtures that share a run (the cache trap) and
    two that share an id.

### 6.2 Runtime mutations (each must fail by name, then be reverted)

- **M1** drop `lineClamp` from `cut` → `clamp 2 measures two line boxes` and
  `clamp 2 paints two ink bands` (`4`).
- **M2** add `textOverflow: "ellipsis"` to `cut` → `clamp 2 paints no ellipsis`
  (a dot run appears).
- **M3** remove `textOverflow` from `mark` → `the marked clamp paints exactly
  three dots` (`0`).
- **M4** change `mark`'s clamp to `3` → `the marked clamp measures two line
  boxes` (78).
- **M5** make `free` clamp to 2 → `the unclamped control paints below the
  two-line mark` (0 ink).
- **M6** set the `three` clamp to `4` → `clamp 3 measures three line boxes`
  (104).
- **U1** make `isEllipsis` accept any count → unit test 7 fails.

## 7. STOP conditions

1. `lineClamp` or `textOverflow` is absent from the pinned typings — the premise
   is gone; re-plan.
2. A clamped run paints ink below its box — that is a **finding**: record the
   measured leak and name the affected components (`Text clamp`, `Card`), do not
   widen the check.
3. `lineClamp` + `textOverflow` paints **no** ellipsis in a real window — record
   it as a live-only limitation, keep the headless mark check, and state the
   difference.
4. A measured box height or band count differs from the reconnaissance by more
   than ±2 px / one band after the fixture geometry is confirmed — re-measure and
   record the rule instead of widening the tolerance.

## 8. Acceptance

- [x] `line-clamp-pixels` and `live-line-clamp` are registered and green.
- [x] M1–M6 fail by name; U1 fails the model suite.
- [x] The model owns the line count, pitch, tail and dot rules; the scenario
      restates no expectation.
- [x] `clamp-recon.tsx` and its registry entry are gone.
- [x] README, `COMPONENTS.md`, `PLAN.md`, `TODO.md` and the plans index record
      the measured facts and the exact ids run.
- [x] `nub run check`, `nub run lint`, `nub run test` pass.

## 9. Outcome

Executed 2026-10-21 on this host.

**Green.** `line-clamp-pixels` (30 checks, 21.5 s first run, 8.1 s warm) and
`live-line-clamp` (30 checks, **6.8 / 6.8 / 6.8 s**, three consecutive runs).
The assertions in §3.2 all held with no tolerance widening.

**Measured** (frame scale 2, so every device number below is twice the logical
one):

| fixture | box | ink bands | ink below the box | last-line tail |
| ------- | --- | --------- | ----------------- | -------------- |
| `cut` (`lineClamp: 2`) | **52** | 2 | **0** / 122880 | glyph (`h17`, `h24`) |
| `mark` (`lineClamp: 2` + `ellipsis`) | **52** | 2 | **0** / 122880 | **3 dots**: `439..442`, `448..450`, `456..458`, each `h4` at top 34, gaps 5, span 20 |
| `three` (`lineClamp: 3`) | **78** | 3 | **0** / 122880 | glyph |
| `free` (none) | **104** | 4 | paints below line 2 | glyph |

The dot is `4 / 52 = 0.077` of the line box (`DOT_HEIGHT_CEILING` is `0.15`) and
the clipped glyph's tail is `24 / 52 = 0.46` (`GLYPH_TAIL_FLOOR` is `0.2`), so
both bounds sit between the measured values rather than at them. The pitch is
exactly `52` device px, i.e. the declared `lineHeight`, with no rounding drift.

**Mutation proofs**, each rebuilt, run focused and reverted:

| # | mutation | check that failed | measured |
| - | -------- | ----------------- | -------- |
| M1 | `cut` clamp removed | `clamp 2 measures two line boxes` | `got 130` |
| M2 | `cut` given `textOverflow: "ellipsis"` | `clamp 2 paints no ellipsis` | `dots=3 tail=0.08` |
| M3 | `mark`'s `textOverflow` removed | `the marked clamp paints exactly three dots` | `dots=0` |
| M4 | `mark` clamped at 3 | `the marked clamp measures two line boxes` | `got 78` |
| M5 | the `free` control clamped at 2 (and its contract set to 2 lines) | `the unclamped control paints below the two-line mark` | `0/122880` |
| M5b | a **52 px box holding an unclamped run** (layout clamped, paint not) | `clamp 2 paints no ink below its box` | `5341/122880` |
| M6 | `three` clamped at 4 | `clamp 3 measures three line boxes` | `got 104` |
| U1 | `isEllipsis` accepts any count | `line-clamp-model.test.ts:170` | `expected false, got true` |

**Correction to the plan's M5.** The planned mutation (clamp the unclamped
control) changes the control's box height, so `the unclamped control measures
four line boxes` fails first and the strip check is never reached — a sequential
runner stops at the first failure. M5b was added to isolate the defect the strip
guard exists for: a runtime that clamps the **layout** but not the **paint**.
It leaves the box at 52 and the two bands intact, and only the strip check
catches the `5341` leaked pixels. M5 was then re-run with the control's contract
set to 2 lines so its own check fires by name, which is the row above.

**Files.** `line-clamp-model.ts` (13 tests), `line-clamp-model.test.ts`,
`line-clamp.tsx`, plus the three registrations and the four records. The
throwaway `clamp-recon.tsx` never entered the repository.

**Gates.** Full headless **126/126** (**4952** checks = `4922 + 30` exactly, 67
capabilities, **408.3 s**, exit `0`). Live registry **112 → 115** counting plans
`823` and `825`, of which this plan adds one. No full live gate (merge gate).
`nub run check`, `nub run lint`, `nub run test` green.

**Not claimed.** `ellipsis-start`, a clamp inside a virtual row, and the `Text`
component's own `clamp` prop routing. `Text clamp` sets `lineClamp` without
`textOverflow`, so it hard-cuts — recorded as a cross-team row for
`primitives`.


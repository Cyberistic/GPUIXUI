# 833 — Flex distribution, in the frame: `flexGrow`, `flexBasis`, `justifyContent` and cross-axis alignment

Status: planned 2026-10-21. Executor: the `playground` workstream
(`apps/playground`, `packages/testing`).

## 1. The claim being guarded

The shipped library distributes space with flex **64 times** (`flexGrow` in 64
call sites across `packages/components` and `packages/primitives`), centres with
`alignItems: "center"` in **163** sites, and pushes groups apart with
`justifyContent` (`"center"` 79, `"space-between"` 10). Every one of those is
load-bearing: a toolbar spacer, a dialog footer, a split pane, a status bar.

**No scenario in either registry measures a single one of them.** `layout-flex`
(plan `120`) proves fixed widths, a `gap` and `position: "absolute"`;
`size-constraints` (plan `825`) proves the four min/max constraints and the
`minWidth: 0` flex escape; `app-chrome` (plan `350`) proves a `flexShrink: 0`
strip overflows. **`flexGrow` itself, `flexBasis` as a starting size, and every
`justifyContent`/`alignItems` value are asserted nowhere.**

**The bug being guarded:** a runtime that ignores `flexGrow` (every spacer
collapses, every flexible pane takes its content width), that grows from zero
instead of from the basis (a 200 px pane becomes a third of the row instead of
200 + its share), that treats `space-between` as `flex-start` (a toolbar's
actions bunch at the left), or that never stretches a default cross-axis child
(a status bar's centre block loses its fill) passes the entire suite today.

## 2. Reconnaissance (measured on this host, 2026-10-21)

One throwaway probe (`flex-recon.tsx`, deleted before this plan landed) mounted
a 640-wide column of 12 rows and read every box. Measured facts:

| fixture | declaration | measured |
| ------- | ----------- | -------- |
| `r-11` | 600 wide, two children `flexGrow: 1`, basis 0 | **300 / 300** at `x 0 / 300` |
| `r-12` | 600 wide, `grow: 1` + `grow: 2` | **200 / 400** |
| `r-mix` | 600 wide, `grow: 1` + a 100 px basis, no grow | **500 / 100** |
| `r-basis` | 600 wide, `basis: 200` grow 1 + `basis: 100` grow 1 | **350 / 250** (the 300 free px split in half) |
| `r-between` | 400 wide, three 60 px items, `space-between` | `x` **0 / 170 / 340** (gaps 110) |
| `r-center` | 400 wide, one 60 px item, `center` | `x` **170** |
| `r-acenter` | 60-tall row, children 20 and 40 tall, `alignItems: center` | offsets **+20 / +10** |
| `r-astretch` | 60-tall row, a child with **text content** and no height, `stretch` | height **60** |
| `r-default` | same child, `alignItems` unset | height **60** (the default *is* stretch) |
| `r-astart` | same child, `flex-start` | height **26** (the text's own line box) |
| `r-percent` | `width: "50%"` of the 640 stage, two `grow: 1` | row **320**, children **160 / 160** |
| `r-auto` | no width, two children `basis: 60` with `grow: 1` / `grow: 2` | the row **640**, children **233.5 / 406.5** |
| `r-nested` | 600 wide, one 600-wide `grow: 1` child holding `grow: 1` + `grow: 3` | nest **600**, inner **150 / 450** |
| `r-shrink` | 300 wide, `flexShrink: 0` basis 200 + `flexShrink: 1` basis 200 | **200 / 100** |

Measured rules:

1. **`flexGrow` splits the *free* space, exactly and proportionally.** 600 with
   1:1 is 300/300; 1:2 is 200/400; 300 free px with 1:1 is +150/+150 on top of
   each basis.
2. **A non-growing item keeps its basis** and the growing item takes exactly
   what is left (`500 / 100`, summing to 600).
3. **`space-between` pins the first item to the start and the last to the end**,
   with equal gaps between (`0 / 170 / 340`); `center` puts half the free space
   on each side (`170` of 400).
4. **`alignItems` unset is `stretch`**, and it stretches a child whose height is
   **intrinsic** (a text line box, 26 → 60). An **empty** div with no height
   collapses and is **not painted at all** (measured `bounds = null`), so a
   stretch fixture must carry content — the same trap `hidden-surface` hit with
   a zero-height fill. `flex-start` leaves the 26 px content height alone.
5. **`alignItems: center` offsets a child by half the row's leftover height**
   (`+20` for 20 in 60, `+10` for 40 in 60).
6. **A percentage width resolves before grow**: `"50%"` of the 640-wide column
   is 320, then the two grow items take 160 each.
7. **A grow row does not need a declared width** when it lives in a column: the
   column's default `align-items: stretch` gives it the column's width (640),
   and grow then distributes the 520 free px over the two 60 px bases.
8. **`flexShrink` is proportional among shrinkable items only**: with
   `flexShrink: 0` on the first 200 px item, the second absorbs the whole 100 px
   overflow.

## 3. Design

### 3.1 The fixture

One **640 × 900** stage, `display: "flex"`, `flexDirection: "column"`, `gap: 12`,
holding the twelve rows of §2 at their measured geometry. Rows declare
`flexShrink: 0` so the column cannot compress them; the two `grow` cells and the
one `space-between`/`center` group are the only children that move.

### 3.2 The checks (~24 per host)

Every expectation is computed by `flex-layout-model.ts`; the scenario restates no
number.

1. `the flex fixtures are distinct` — ids unique.
2. `the stage is 640 wide` — the column's width.
3. `grow 1:1 splits the free space` — 300 / 300.
4. `the second grow item starts where the first ends` — no gap, no overlap.
5. `grow 1:2 splits the free space` — 200 / 400.
6. `a non-growing item keeps its basis` — 100.
7. `a growing item takes what the basis item leaves` — 500, summing to 600.
8. `grow adds to the basis` — 350.
9. `the basis pair still fills the row` — 350 + 250 = 600.
10. `space-between pins the first item to the start` — `x = 0`.
11. `space-between pins the last item to the end` — right edge = 400.
12. `space-between spaces the middle item evenly` — both gaps 110.
13. `center halves the free space` — `x = 170` and 170 to the right edge.
14. `align center offsets a short child` — 20 in 60 → +20.
15. `align center offsets a taller child` — 40 in 60 → +10.
16. `stretch fills a child with no height` — 60.
17. `the default cross alignment is stretch` — 60.
18. `flex-start keeps the content height` — 26.
19. `a percentage width resolves before grow` — row 320.
20. `a percentage row's grow items split it` — 160 / 160.
21. `a grow row with no width fills its column` — 640.
22. `a grow row splits its own free space` — 233.5 / 406.5.
23. `a nested grow row splits its parent` — nest 600, 150 / 450.
24. `a flexShrink: 0 item keeps its basis` and `the shrinkable item absorbs the
    overflow` — 200 / 100 (two checks).

## 3.3 The pure helper — `apps/playground/src/scenarios/flex-layout-model.ts`

```ts
/** One flex item's declared shape. */
export interface FlexItem { readonly basis: number; readonly grow: number }
/** The widths a row hands out: basis first, then the free space by grow. */
export const growWidths: (total: number, items: ReadonlyArray<FlexItem>) => ReadonlyArray<number>;
/** The widths a row hands out when its bases overflow; `shrink: 0` keeps its basis. */
export const shrinkWidths: (total: number, items: ReadonlyArray<{readonly basis: number; readonly shrink: number}>) => ReadonlyArray<number>;
/** The gaps a `justifyContent` mode leaves between fixed items. */
export const justifyGaps: (mode: JustifyMode, total: number, widths: ReadonlyArray<number>) => ReadonlyArray<number>;
/** The leading offset `center` leaves before the first item. */
export const justifyOffset: (mode: JustifyMode, total: number, widths: ReadonlyArray<number>) => number;
/** The cross-axis offset of a child in a row. */
export const crossOffset: (align: CrossAlign, rowHeight: number, childHeight: number) => number;
/** The x positions a row produces, from its widths and gaps. */
export const rowPositions: (widths, gaps, offset?) => ReadonlyArray<number>;
/** The free space a row has left after its basis sizes (floored at zero). */
export const freeSpace: (total: number, items) => number;
/** Whether a set of measured widths matches a predicted set within a pixel. */
export const widthsMatch: (measured, predicted, tolerance) => boolean;
/** The measured gaps between consecutive boxes, for a failure's readout. */
export const measuredGaps: (measured) => ReadonlyArray<number>;
```

`growWidths` distributes the **remainder deterministically** (the last item takes
the rounding difference) so a 1:2 split of 520 does not drift by a pixel.

## 4. Exact files

Create:

1. `apps/playground/src/scenarios/flex-layout-model.ts`
2. `apps/playground/src/scenarios/flex-layout-model.test.ts`
3. `apps/playground/src/scenarios/flex-layout.tsx` — view, shared `flexChecks`,
   headless `flex-layout`.

Change:

4. `apps/playground/src/scenarios/index.ts` — import + register
   `flexLayoutScenario`; capability `layout`.
5. `apps/playground/src/live/scenarios.tsx` — the `live-flex-layout` twin
   (spread the live scenario, `view`, `ready: "flex-stage"`).
6. `apps/playground/README.md` — a `### Flex distribution (plan 833)` section
   plus the live-registry row.
7. `COMPONENTS.md` — the `layout` capability row gains both ids.
8. `PLAN.md` — one decision row (D101).
9. `TODO.md` — one ticked row, plus a **cross-team** row for the family the
   probe found (`alignItems: stretch` needs intrinsic height).
10. `.agents/slop/plans/README.md` — this plan's row and the number claim
    (`830`–`832` were claimed by other workstreams; `833` verified free across
    every worktree at claim time).

Delete:

11. `apps/playground/src/scenarios/flex-recon.tsx` and its registry entry.

## 5. Steps, commands, expected results

1. `nub run --filter playground test flex-layout-model` → the new unit tests pass.
2. `nub run --filter playground build` → exit `0`.
3. `nub apps/playground/dist/smoke/run.js --list | grep -c flex-layout` → `1`.
4. `nub apps/playground/dist/smoke/run.js --only flex-layout`
   → `1/1 scenarios passed`, ~24 checks.
5. `nub apps/playground/dist/live/run.js --only live-flex-layout`
   → `1/1 scenarios passed`, three consecutive runs.
6. Mutations (§6.2), each rebuilt and re-run focused; revert each.
7. `nub run check`, `nub run lint`, `nub run test` → exit `0`. The full headless
   suite is the end-of-task check for the registry change.

## 6. Test plan

### 6.1 Unit tests (`flex-layout-model.test.ts`)

1. `growWidths(600, [1,1])` → `[300, 300]`; `[1,2]` → `[200, 400]`.
2. `growWidths` adds to the basis: `600, [{basis:200,grow:1},{basis:100,grow:1}]`
   → `[350, 250]`.
3. `growWidths` leaves a non-grow item alone: `[{basis:100,grow:0},{basis:0,grow:1}]`
   → `[100, 500]`.
4. `growWidths` distributes an indivisible remainder deterministically and the
   sum is exact (`601` over three equal grows → sums to 601).
5. `growWidths` with every grow `0` returns the bases unchanged (no free space
   is invented).
6. `freeSpace` never goes negative (a row narrower than its bases → 0).
7. `justifyGaps` for `space-between` over three items in 400 gives `[110, 110]`;
   `center` gives `[0, 0]` and the offset is separate.
8. `justifyGaps` for `flex-start` gives `[0, 0]`; a single item gives an empty
   gap list.
9. `crossOffset("center", 60, 20)` → `20`; `(60, 40)` → `10`;
   `("stretch" | "flex-start")` → `0`.
10. `crossOffset("center", 60, 80)` clamps at `0` (a taller child pins to the
    row's top rather than going negative).
11. `rowPositions([300,300],[0])` → `[0, 300]`.
12. `widthsMatch` accepts a 1 px drift and rejects 2 px.

### 6.2 Runtime mutations (each must fail by name, then be reverted)

- **M1** drop `flexGrow` from both cells of `r-11` → `grow 1:1 splits the free
  space` (measured `0 / 600` or a zero-width, unpainted child).
- **M2** swap `r-12`'s grows to `1:1` → `grow 1:2 splits the free space`
  (`300 / 300`).
- **M3** drop `flexBasis` from `r-basis`'s first cell → `grow adds to the basis`
  (`250`, not 350).
- **M4** `space-between` → `flex-start` → `space-between pins the last item to
  the end` (`x = 120`).
- **M5** `center` → `flex-start` → `center halves the free space` (`x = 0`).
- **M6** `alignItems: "center"` → `"flex-start"` → `align center offsets a short
  child` (`0`).
- **M7** `stretch` → `flex-start` on `r-astretch` → `stretch fills a child with
  no height` (`26`).
- **M8** `flexShrink: 0` removed from `s0` → `a flexShrink: 0 item keeps its
  basis` (`150`).
- **U1** make `growWidths` ignore the basis → unit tests 2 and 3 fail.
- **U2** make `crossOffset` return the raw difference → unit test 10 fails.

## 7. STOP conditions

1. `flexGrow` or `flexBasis` is absent from the pinned typings, or has no effect
   at all — the premise is gone; re-plan around what the runtime does.
2. A measured width differs from the model by more than ±1 px after the fixture
   geometry is confirmed — record the rule instead of widening the tolerance.
3. `alignItems: "stretch"` does not stretch a child with intrinsic height —
   that is a **finding**: record it, name the affected components, and keep only
   the measured direction in the checks.
4. The live host cannot read a box that the headless host reads — split the
   check rather than dropping it silently.

## 8. Acceptance

- [x] `flex-layout` and `live-flex-layout` are registered and green.
- [x] M1–M8 fail by name; U1–U2 fail the model suite.
- [x] The model owns the distribution, justification, cross-offset and
      row-position rules; the scenario restates no expectation.
- [x] `flex-recon.tsx` and its registry entry are gone.
- [x] README, `COMPONENTS.md`, `PLAN.md`, `TODO.md` and the plans index record
      the measured facts and the exact ids run.
- [x] `nub run check`, `nub run lint`, `nub run test` pass.

## 9. Outcome

Executed 2026-10-21 on this host. Both hosts agree on every number.

**Green.** `flex-layout` (82 checks, ~0.1 s) and `live-flex-layout`
(82 checks, **0.22 / 0.22 / 0.22 s**, three consecutive runs). Bounds-only, so
the probe costs no frame decode and runs two orders of magnitude faster than a
pixel scenario. The 82 checks include one `is painted` and one `read` per
fixture, as the other probes here do; the load-bearing assertions are the 25
named relations in §3.2.

**Measured** — identical to §2, with no tolerance widened:

| relation | measured |
| -------- | -------- |
| grow 1:1 / 1:2 (600) | 300 / 300, 200 / 400 |
| grow beside a 100 px basis | 500 / 100 |
| basis 200/100 + grow | 350 / 250 |
| `space-between` (3 × 60 in 400) | x 0 / 170 / 340, gaps 110 / 110 |
| `center` (60 in 400) | x 170, 170 to the right edge |
| `alignItems: center` (60-tall row) | 20 px child +20, 40 px child +10 |
| `stretch` / default / `flex-start` | 60 / 60 / **26** |
| `"50%"` of 640 | 320, then 160 / 160 |
| width-less grow row | 640, then 233.5 / 406.5 |
| nested `grow 1:3` | 150 / 450 |
| `flexShrink: 0` | 200 / 100; 150 / 150 when neither is pinned |

**Mutation proofs**, each rebuilt, run focused and reverted:

| # | mutation | check that failed | measured |
| - | -------- | ----------------- | -------- |
| M1 | `flex-11-a` grow dropped | `flex-11 hands out its widths` | `expected 300,300, got 0,600` |
| M2 | `flex-12` grows swapped to 2:1 | `flex-12 hands out its widths` | `got 400,200` |
| M3 | `flex-basis-a` basis dropped | `flex-basis hands out its widths` | `got 250,350` |
| M4 | `space-between` → `flex-start` | `space-between pins the last item to the end` | `expected 400 ± 1, got 180` |
| M5 | `center` → `flex-start` | `center halves the free space` | `expected 170 ± 1, got 0` |
| M6 | cross `center` → `flex-start` | `align center offsets the 20 px child` | `expected 20 ± 1, got 0` |
| M7 | `stretch` → `flex-start` | `stretch fills a child with no height` | `expected 60 ± 1, got 26` |
| M8 | `flex-shrink-a` `flexShrink: 0` removed | `a flexShrink: 0 item keeps its basis` | `expected 200 ± 1, got 150` |
| U1 | `growWidths` ignores the basis | 2 model tests | `expected [ 350, 250 ], got [ 150, 250 ]` shape |
| U2 | `crossOffset` returns the raw difference | 1 model test | a taller child went negative |

**A finding for the component layer.** §2.5's stretch rule needs an
**intrinsic** height: an empty `div` with no height or content collapses and is
reported as **not painted** (`bounds = null`), so "stretch" does not guarantee a
fill. Recorded as a cross-team row for `primitives` (`Stack`/`Card` docs).

**Files.** `flex-layout-model.ts` (24 tests), `flex-layout-model.test.ts`,
`flex-layout.tsx`, plus the three registrations and the four records.

**Gates.** Full headless **127/127** (**5034** checks = `4952 + 82` exactly, 67
capabilities, **526.3 s**, exit `0`). Live registry **115 → 116**. No full live
gate (merge gate). `nub run check`, `nub run lint`, `nub run test` green.

**Not claimed.** `flexWrap` (10 shipped uses) and `alignContent` (0 uses) are
unmeasured; a wrapping row's line boxes are the recorded `Stack` defect in
`TODO.md`. `gap`/`rowGap`/`columnGap` remain covered only by `layout-flex`'s
single `gap` check.


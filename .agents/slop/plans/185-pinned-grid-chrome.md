# Plan 185 — Tier 3 feasibility: pinned grid chrome and column windowing

| Field | Value |
| ----- | ----- |
| Phase | B → D (Tier 3 feasibility, data grid) |
| Depends on | `100` (harness), `110` (runner), `120` (playground), `140` (binding), `152` (virtualized table), `166` (`scrollToItem`), `173` (horizontal pan), `174` (focus and clipped stops) |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Status | landed |

## 1. Why this probe exists

The Tier 3 table probes (`table-select-sort`, `column-resize`, `virtualized-table`) only
exercise **vertical** rows with every column painted. A real `packages/data-grid` also needs:

1. a header that stays put while the body scrolls;
2. a frozen (pinned) first column that stays put on the x axis;
3. a **wide** table — hundreds of columns — where only the visible columns are in the
   element tree;
4. keyboard cell navigation across that wide table, including revealing an off-window cell.

The obvious implementation is CSS `position: sticky`. The pinned runtime source says it is
**not** implemented: `packages/native/src/style.rs` maps only `"absolute" | "fixed"`,
`"relative"`, and `_ => {}` (sticky stays in flow). That must be measured, not assumed.
If sticky is unavailable, a grid must derive the header and pinned column from **one**
scroll source and window both axes in component code. This probe measures that
alternative, exactly the way a shipped grid would implement it.

This probe is not a data-grid implementation. It is the measured contract the data-grid
plan cites.

## 2. Files to create or change

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/grid-window.ts` | **new** — the pure window model (`visibleWindow`, `clampScroll`, `windowParts`) |
| `apps/playground/src/scenarios/grid-window.test.ts` | **new** — vitest for the window model |
| `apps/playground/src/scenarios/grid.tsx` | **new** — the probe view + scenario (below) |
| `apps/playground/src/scenarios/index.ts` | register `gridScenario`; add `"grid"` to `PROBE_CAPABILITIES` |
| `packages/testing/src/smoke.ts` | add `"grid"` to `CAPABILITIES` |
| `apps/playground/src/smoke/run.test.ts` | assert the registry contains `grid-wide-table` and the `grid` capability |
| `apps/playground/README.md` | a "Pinned grid chrome" section with the measured table |
| `COMPONENTS.md` | one capability row `grid`; notes on Tables / Column configuration / Virtualized tables |
| `TODO.md` | tick the task, move the workstream bar to 49/53 |
| `PLAN.md` | decision `D30` (sticky unavailable; single-source windows) |
| `.agents/slop/plans/README.md` | index row for `185` |

No file outside the playground workstream changes.

## 3. The view (`grid.tsx`)

A single root, 680 × 420, composed from three regions fed by one scroll source.

Constants:

```
PINNED_WIDTH 150   COLUMN_WIDTH 90    COLUMN_COUNT 24   -> content width 2160
BODY_WIDTH   460   BODY_HEIGHT 300    ROW_HEIGHT 28     ROW_COUNT 40 -> 1120
HEADER_HEIGHT 28
```

Layout:

```
grid-root (flex row, 680x420)
├─ pinned (column, width 150)
│  ├─ pinned-header  (testId grid-pinned-header, height 28)  "Name"
│  └─ pinned-viewport (testId grid-pinned-viewport, relative, hidden overflow, 150x300)
│       absolute rows at top = r*28 + pan.y, each testId grid-pinned-row-<r>, text "row <r>"
└─ main (column, width 460, testId grid-main)
   ├─ header-viewport (testId grid-header, relative, hidden overflow, 460x28)
   │    absolute cells at left = c*90 + pan.x, testId grid-head-<c>, text "col <c>"
   └─ body (testId grid-body, relative scroller 460x300, overflowX/Y scroll, onScroll=sync)
        content spacer: 2160x1120
        absolute rows at top = r*28 (testId grid-row-<r>, 2160x28, relative)
          absolute cells at left = c*90 (testId grid-cell-<r>-<c>, 90x28, tabIndex 0)
```

Windowing for both axes is computed from `pan` by `grid-window.ts`; only
`firstRow - 1 … lastRow + 1` rows and `firstColumn - 1 … lastColumn + 1` columns are
rendered (both ends clamped). The spacer keeps the scroller's full extent.

`sync()` reads the **renderer's own offset** for `grid-body`
(`renderer.getScrollOffset(id)`) and stores `{ x, y }`. `onScroll` calls it; the
keyboard reveal calls `renderer.scrollTo(bodyId, x, y)` and then `sync()` — the model
follows the runtime, never the other way round.

Keyboard contract on each cell:

- `onClick` selects and focuses the cell;
- Right/Left/Up/Down move `{ row, column }` with clamping, compute the pan that puts the
  target cell fully inside the viewport (`clampScroll`), call
  `renderer.scrollTo(bodyId, x, y)`, `sync()`, and request focus for the target; a
  layout effect focuses `grid-cell-<row>-<column>` once it is rendered
  (`renderer.focusElement`), so the next keystroke goes there;
- `role="gridcell"`, `aria-selected` on the selected cell, `aria-label` = `row r col c`
  (names are not derived from text — plan `160`).

Readouts (all `<text testId>`): `grid-selection` = `sel=<r>,<c>`, `grid-pan` =
`x=<n> y=<n>`.

Toolbar buttons (Pressable): `grid-end` pans the body to the far right
(`x = -(2160 - 460) = -1700`), `grid-home` back to `(0, 0)`, both through
`renderer.scrollTo` + `sync`.

A separate mini "sticky" scroller, **outside** the grid, proves the runtime property:

```
sticky-scroller (testId sticky-scroller, 220x120, overflowY scroll)
  sticky-header (testId sticky-header, position "sticky", height 24)
  30 rows of 24 px
```

## 4. The scenario (`grid-wide-table`, capability `grid`)

Steps, in order, each one check:

| # | Action | Check |
| - | ------ | ----- |
| 1 | read root/pinned/main bounds | all paint; `pinned.x ≈ root.x`; `main.x ≈ root.x + 150` |
| 2 | read `sticky-header` bounds, wheel `sticky-scroller` by `(0, -80)`, read again | the header **moved up by ~80 px** — `position: "sticky"` is ignored (source + measurement) |
| 3 | body starts at `(0,0)` | `scrollOffset(grid-body)` is `~0`; `grid-cell-0-0` paints at the body origin |
| 4 | wheel body `(0, -280)` (10 rows) | body `y ≈ -280`; `grid-pinned-row-11.y ≈ grid-row-11.y ± 1`; `grid-pinned-header` did not move; pinned column `x` unchanged |
| 5 | wheel body `(-360, 0)` (4 columns) | body `x ≈ -360`; `grid-head-5.x ≈ grid-cell-0-5.x ± 1`; `grid-row-11.y` unchanged |
| 6 | windowing after the pan | `grid-cell-0-0` paints `null` (not rendered); `grid-cell-0-5` and `grid-cell-0-20` — assert `5` present, `20` absent |
| 7 | click `grid-end` | body `x ≈ -1700`; `grid-cell-11-20` paints; `grid-cell-11-0` is `null`; `grid-head-20` aligns with `grid-cell-11-20` |
| 8 | click `grid-home` | body back to `~0`; `grid-cell-0-0` paints again; `grid-cell-0-20` is `null` |
| 9 | click `grid-cell-0-1`, read focus/selection | selection `0,1`; native focus is `grid-cell-0-1`; the cell reports `GridCell` with the authored name |
| 10 | press Right six times | selection `0,7`; focus `grid-cell-0-7`; body `x < 0` (the reveal panned); the cell's box is inside the body viewport; `grid-head-7` still aligns |
| 11 | press Down three times | selection `3,7`; focus `grid-cell-3-7`; the cell is inside the viewport; the pinned row `3` aligns with it |

The reveal in step 10 is the point: `tab-strip-focus` proved focus does **not** reveal a
clipped child in a plain scroller, so the component must compute and apply the pan. The
check is `body.x < 0` **and** the target is inside the viewport, not merely focused.

## 5. The pure model (`grid-window.ts`)

```ts
export interface Scroll { readonly x: number; readonly y: number }
export interface WindowRange { readonly first: number; readonly last: number }

/** The visible index range plus one row/column of overdraw, clamped to [0, count-1]. */
export const visibleWindow: (
  offset: number, viewport: number, size: number, count: number, overdraw?: number
) => WindowRange

/** The offset that puts [start, start + extent] inside [0, total]: never positive, never past the end. */
export const clampScroll: (desired: number, total: number, viewport: number) => number

/** The offset that reveals the cell at `index` with the least movement. */
export const revealOffset: (index: number, size: number, viewport: number, total: number) => number
```

`revealOffset` is what step 10 relies on: given the current offset and a target index, it
returns the offset that keeps an already-visible cell still and moves the minimum for an
off-window one. Signature in code: `revealOffset(current, index, size, viewport, total)`.

Unit tests must catch:

- an empty/oversized viewport returns `{ first: 0, last: count - 1 }` rather than a
  negative index;
- a scroll near the end clamps `last` to `count - 1` and keeps `first >= 0`;
- `revealOffset` returns the current offset when the cell is already fully visible;
- `revealOffset` pans right for an off-window column and never past
  `-(total - viewport)`;
- `clampScroll` returns `0` when the content fits.

## 6. Commands and expected results

```sh
# 1. type-check + offline tests
nub run --filter playground check-types          # exit 0
nub run --filter playground test                 # 7 files, +2 new tests, exit 0
nub run --filter @gpuixui/testing test           # unchanged, exit 0

# 2. the new scenario alone
nub run --filter playground build
nub apps/playground/dist/smoke/run.js --only grid-wide-table
# exit 0, "1/1 scenarios passed", "grid=verified"

# 3. the whole suite
nub apps/playground/dist/smoke/run.js
# exit 0, "53/53 scenarios passed", grid=verified among the capabilities

# 4. the gates
nub run check && nub run lint && nub run test    # exit 0
```

## 7. Two-direction proofs (mutation → named check fails at exit `1` → restore)

| Mutation | Expected failure |
| -------- | ---------------- |
| header viewport loses `+ pan.x` on its cells | step 5: `grid-head-5 aligns with grid-cell-0-5` |
| pinned rows lose `+ pan.y` | step 4: `grid-pinned-row-11 aligns with grid-row-11` |
| `visibleWindow` returns every column | step 6: `the far column is not rendered` (`grid-cell-0-20` non-null) |
| keyboard reveal skips `renderer.scrollTo` | step 10: `body panned to reveal the cell` (`x` stays 0) |
| `clampScroll` returns the desired offset unclamped | unit test: the near-end clamp case |

Record each measured failure line in §8 after the run.

## 8. Measured facts (2026-10-17, locally built `darwin-x64` 0.10.0, plan `140`)

The scenario is **51 checks, green** (`--only grid-wide-table`, exit `0`); the full suite
is **53/53** and reports `grid=verified`.

- **`position: "sticky"` is ignored.** A `sticky` header inside a 120 px scroller moved
  **exactly 80 px up** for a `-80` wheel — it is in normal flow. This matches
  `packages/native/src/style.rs` (`absolute`/`fixed` → absolute, `relative` → relative,
  everything else dropped), so a pinned header cannot be one scroller.
- **One scroll source works.** The body is the only scroller; the header cells are
  placed at `c*90 + pan.x` and the pinned rows at `r*28 + pan.y`, both windows derived
  from `renderer.getScrollOffset(bodyId)`. The header cell and body cell align within
  1 px after a `-360` pan, and the pinned row and body row within 1 px after a `-280`
  scroll. The pinned header stays fixed (its `y` did not move).
- **Column windowing is component-owned.** At `x=-360` the tree held columns 3–10
  (`grid-cell-11-0` and `grid-cell-11-20` returned `null`); at the end (`x=-1700`) it
  held 17–23 (`20` painted, `0` absent). The runtime does not drop clipped children —
  the grid never rendered them.
- **Keyboard reveal.** Six Rights from column 1 reached `0,7`, focus followed, and the
  component panned the body to **-260** (the minimum reveal); the cell and its header
  stayed aligned. Three Downs reached `3,7` with the pinned row aligned. Without the
  reveal the target cell does not exist, so focus stays on column 6 (mutation proof).
- **Accessibility.** `role="gridcell"` maps to AccessKit **`GridCell`**; `aria-id` is the
  dump key, `aria-label` is the name, and `aria-selected` is exposed on the selected
  cell. Focus and selection can therefore be asserted without pixels.
- **Limits.** There is no horizontal virtual list; column windowing must be computed
  from the scroll offset. The probe reads the offset from the renderer rather than
  accumulating wheel deltas (`onScroll` echoes are idempotent), and rows are plain
  (40 × 28) — combining this window with `<virtual-list>` row virtualization is the
  data-grid component's job, and `virtualized-table`/`scroll-into-view` already measure
  the vertical half.

Four two-direction proofs (mutation → named check failed at exit `1` → restored):

| Mutation | Failing check |
| -------- | ------------- |
| header cells lost `+ pan.x` | `the header cell aligns with the body cell: expected 240 ± 1, got 600` |
| pinned rows lost `+ pan.y` | `the pinned row aligns with the body row: expected 56 ± 1, got 336` |
| `visibleWindow` replaced by every column | `the scrolled-away column is not rendered: expected false, got true` |
| keyboard `scrollBody` removed | `focus follows the selection off the window: expected "grid-cell-0-7", got "grid-cell-0-6"` |
| `clampScroll` returned `desired` | unit tests: three clamp cases (`-5000` vs `-1700`, `120` vs `0`, `-40` vs `0`) |

## 9. STOP conditions

Stop and report, do not improvise, if:

- `renderer.getScrollOffset` returns `null` for a two-axis `div` scroller (the single
  source model cannot be measured; record it instead of reading the React state);
- `renderer.scrollTo` does not move a `div` with both `overflowX` and `overflowY`
  (record the axis that fails; the probe must not fake a pan);
- an absolutely positioned cell inside an absolutely positioned row paints at the wrong
  origin (measure both offsets; if the runtime composes them differently, the plan's
  window model is wrong and the probe must stop before asserting alignment);
- `scrollTo` on a keyboard reveal does not dispatch `onScroll` **and** the direct
  `sync()` read disagrees with the runtime offset (the model must follow the runtime);
- the suite cannot run because the GPUix binding is missing: report exit `2` as
  unverified, never green.

## 10. Acceptance criteria

- `grid-wide-table` passes on this host in the full run (exit `0`), and the capability
  `grid` reports `verified`.
- The four mutation proofs above were run and restored; the failing labels are recorded
  in §8.
- `COMPONENTS.md`, `PLAN.md` (D30), `apps/playground/README.md`, `TODO.md` and the plan
  index describe the measured contract, not the intent.
- The pure window model has unit tests that fail when the clamp or the reveal is wrong.
- No new dependency; no `@gpuix/*` import outside `apps/playground`; no `any`.

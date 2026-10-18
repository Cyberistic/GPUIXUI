# Plan 338 — Tier 3 feasibility: row virtualization under a horizontal pan, with a frozen column, sort and filter

| Field | Value |
| ----- | ----- |
| Phase | B → D (Tier 3 feasibility, data grid) |
| Depends on | `100` (harness), `110` (runner), `120` (playground), `140` (binding), `152` (virtualized table), `166` (`scrollToItem`/`getListScrollTop`), `185` (pinned chrome, one scroll source) |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Status | landed |

## 1. Why this probe exists

Plan `185` measured pinned grid chrome with **plain** rows (`40 × 28` divs, windowed by
component code). Plan `152` measured **rows inside `<virtual-list>`** with every column
painted and no horizontal scroll. Plan `185` §8 names the gap explicitly:

> combining this window with `<virtual-list>` row virtualization is the data-grid
> component's job.

That combination is the one a `packages/data-grid` must ship, and it has four unknowns
that no existing probe answers:

1. Can a `<virtual-list>` be **wider than its viewport** and live inside a plain
   horizontal scroller, so the header and every virtual row pan together from one
   offset — or does the list clip its rows horizontally and force a second scroll model?
2. Can a **frozen column** be derived from the list's own anchor
   (`renderer.getListScrollTop`, the exact source plan `300` established) so its rows
   align with the virtual body rows within 1 px, without the one-gesture lag of the
   `onVisibleRange` payload?
3. Does a **reorder** (sort) and a **row-count change** (filter) under a mounted list
   repaint truthfully, and does the list need an explicit anchor reset?
4. Does a cell in a wide virtual row **hit-test and take native focus** while the body is
   horizontally panned?

A real data grid also needs a sortable header and a filter control, so the probe
exercises those as app-owned state over a pure model. This is **not** an implementation
of `packages/data-grid`; it is the measured contract that package cites.

## 2. Files to create or change

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/data-grid-model.ts` | **new** — pure sort/filter/anchor-window model |
| `apps/playground/src/scenarios/data-grid-model.test.ts` | **new** — vitest for that model |
| `apps/playground/src/scenarios/data-grid.tsx` | **new** — the probe view + the `data-grid-virtual` scenario |
| `apps/playground/src/scenarios/index.ts` | register `dataGridScenario`; add `"data-grid"` to `PROBE_CAPABILITIES` |
| `packages/testing/src/smoke.ts` | add `"data-grid"` to `CAPABILITIES` |
| `apps/playground/src/smoke/run.test.ts` | assert the registry contains `data-grid-virtual` and the capability |
| `apps/playground/README.md` | a "Virtualized data grid" section with the measured table |
| `COMPONENTS.md` | one capability row `data-grid`; update the Tables, Sortable tables, Row selection, Virtualized tables and Column configuration notes |
| `TODO.md` | tick the new task; record the next plan number |
| `PLAN.md` | decision `D50` (the measured composition) |
| `.agents/slop/plans/README.md` | index row for `338` |

No file outside the playground workstream changes.

## 3. The pure model (`data-grid-model.ts`)

```ts
export interface GridRow {
  readonly id: number;
  readonly name: string;
  readonly kind: "file" | "dir";
  readonly size: number;
}
export type SortDirection = "asc" | "desc";

/** Rows whose name contains `query`, case-insensitively; `""` keeps every row. */
export const filterRows: (
  rows: ReadonlyArray<GridRow>, query: string
) => ReadonlyArray<GridRow>

/** Stable by id: names are unique in the probe, so equal names keep insertion order. */
export const sortRows: (
  rows: ReadonlyArray<GridRow>, direction: SortDirection
) => ReadonlyArray<GridRow>

/** `[first, last]` row indices painted for `anchor` in a `viewport` of `rowHeight` rows,
 *  plus one row of overdraw, clamped to `[0, count - 1]`; empty when count is 0. */
export const anchoredWindow: (
  anchor: { readonly index: number; readonly offset: number },
  viewport: number, rowHeight: number, count: number
) => { readonly first: number; readonly last: number }

/** The y of row `index` inside the viewport: `index * rowHeight - anchorTop`. */
export const rowTop: (
  index: number, anchor: { readonly index: number; readonly offset: number },
  rowHeight: number
) => number
```

Rules the unit tests must pin:

- `filterRows` is case-insensitive, matches a substring, and `""` returns every row;
- `sortRows` uses `Order.String` through `Order.mapInput`, `Arr.sort`, and `Arr.reverse`
  for `desc`; it does **not** mutate its input;
- `anchoredWindow` returns `{ first: 0, last: -1 }` for `count = 0`, never a negative
  index, and clamps the last index to `count - 1`;
- `rowTop` returns `0` for the anchor row with offset `0`, and a negative number for an
  in-row offset.

Use `effect/Array` and `effect/Order` (repo rule: no native collection helpers, no
native `.sort()`).

## 4. The view (`data-grid.tsx`)

One root, `680` wide. Constants:

```
FROZEN_WIDTH 150   COLUMN_WIDTH 90    COLUMN_COUNT 12   -> CONTENT_WIDTH 1080
PAN_WIDTH    500   LIST_HEIGHT 300    ROW_HEIGHT 28     HEADER_HEIGHT 28
ROWS         500   (names "Item 000" … "Item 499")
```

Layout:

```
dg-root (flex column, gap 8, width 680)
├─ toolbar: dg-sort (Pressable) · dg-filter (<input> testId dg-filter) · dg-clear (Pressable)
├─ dg-state (Readout)  `sort=asc filter=0 count=500 anchor=0 first=0 sel=none x=0`
└─ dg-grid (flex row, height HEADER_HEIGHT + LIST_HEIGHT)
   ├─ dg-frozen (column, width 150)
   │  ├─ dg-frozen-head (height 28, muted) "ID"
   │  └─ dg-frozen-viewport (relative, 150 × 300, hidden overflow)
   │       dg-frozen-row-<id> at top = rowTop(i, anchor), 150 × 28
   └─ dg-pan (width 500, height 328, overflowX "scroll", overflowY "hidden",
   │           testId dg-pan)
      └─ content column, width CONTENT_WIDTH
         ├─ dg-headrow (1080 × 28)
         │    dg-head-<c> absolute at left = c*90, 90 × 28  (c = 0 … 11)
         └─ dg-list (<virtual-list> testId dg-list, width CONTENT_WIDTH,
                      height LIST_HEIGHT, estimatedItemHeight ROW_HEIGHT,
                      onVisibleRange = syncAnchor)
              dg-row-<id> (1080 × 28, key = row.id)
                 dg-cell-<id>-<c> (90 × 28, role "gridcell", tabIndex 0,
                                    aria-label `row <id> col <c>`)
```

**One horizontal offset.** The header and the list are children of the same
`overflowX: "scroll"` scroller, so `renderer.scrollTo(dg-pan, x, 0)` pans both. The pan is
component-owned (toolbar buttons `dg-pan-end` → `-(CONTENT_WIDTH - PAN_WIDTH) = -580` and
`dg-pan-home` → `0`) because a `<virtual-list>` exposes no horizontal scroll event; the
probe **also** records whether a `deltaX` wheel over the header strip pans the scroller,
by asserting the offset after wheeling a visible header cell (see step 4).

**The frozen column follows the list's own anchor.** `syncAnchor()` reads
`renderer.getListScrollTop(list.id)` inside `onVisibleRange` (never the payload — plan
`300`), stores `{ index, offset }`, and the frozen rows are placed with `rowTop`. A mount
effect seeds `{ index: 0, offset: 0 }`.

**Sort and filter reset the anchor.** A data grid whose row order or row set changes must
not leave the reader pointing at an unrelated row. The component applies the new rows and
then `renderer.scrollToItem(list.id, 0)` in a layout effect keyed on
`[sort, filter]`, and `syncAnchor()` after it. This is the recipe the probe proves.

`dg-state` is the only readout the steps parse; it carries `sort`, the filter length,
`count`, the anchor index, the id of `rows[anchor.index]`, the selected id and the pan
`x`.

Toolbar handlers: `dg-sort` flips `asc ↔ desc`; `dg-clear` empties the filter; the
filter is a native `<input>` whose `onChange` stores the query.

## 5. The scenario (`data-grid-virtual`, capability `data-grid`)

Steps, in order, each a check unless stated. `rowAt(i)` is the id of
`sorted(filtered)[i]` from the same pure model the view uses.

| # | Action | Check |
| - | ------ | ----- |
| 1 | read `dg-root`, `dg-frozen-head`, `dg-pan` bounds | all paint; `dg-pan.x ≈ dg-root.x + 150`; `dg-pan` is 500 wide |
| 2 | read `dg-frozen-row-0` and `dg-row-0` bounds | frozen row 0 aligns with body row 0 in `y` (±1) |
| 3 | wheel `dg-pan` by `(0, -280)` (vertical) | `listScrollTop(dg-list)` index `> 0`; the header row `y` did not move; `dg-row-0` is `null` (virtualized); the frozen row for the top visible id aligns with its body row (±1) |
| 4 | click `dg-pan-home`, then wheel `dg-head-2` by `(-90, 0)` (horizontal wheel over the header strip) | pan `x ≈ -90` (±8); `dg-head-3` aligns with the body cell of the top visible row in column 3 (±1); `dg-frozen-head.x` is unchanged (the frozen column is outside the pan) |
| 5 | click `dg-pan-end` | `scrollOffset(dg-pan).x ≈ -580`; `dg-head-8` aligns with the body cell of the top visible row in column 8 (±1); the frozen column is still at the root's edge |
| 6 | click the body cell of the top visible row in column 9 | `sel=<id>`; native focus is that cell's test id; the pan did not move |
| 7 | wheel the body with `(0, -280)` while panned at `-580` | the anchor index increases; the frozen column realigns (±1); the pan `x ≈ -580` is unchanged |
| 8 | `scrollToItem(dg-list, 250, 0)` | `dg-state` anchor `250`; `first = rowAt(250)`; the frozen row for that id aligns with its body row (±1) |
| 9 | click `dg-sort` | sort is `desc`; anchor resets to `0`; `first = rowAt(0)` = `Item 499`; the list's element id is unchanged (no remount); the painted top row reads `Item 499` |
| 10 | click `dg-filter`, key `0`, key `1` | filter length `2`, `count = 10`, anchor `0`, `first = rowAt(0)`; the readout's first name matches `Item 01`; a known non-match (`Item 499`, `Item 100`) is absent from `paintedText()` |
| 11 | `scrollToItem(dg-list, 400, 0)`, then `dg-clear`, key `0`, key `1` | after the row-set change the anchor is `0` and all 10 rows paint inside the 300 px viewport; the frozen column aligns with the first row (±1) |
| 12 | click `dg-clear` | `count = 500`; anchor `0`; `first = rowAt(0)` (still `desc`, so `Item 499`); the painted top row matches |
| 13 | click `dg-sort` (back to `asc`) | `first = Item 000`; the painted top row reads `Item 000` |

Only step 4 asserts a wheel-pan, and it asserts the **header strip** route (a plain
element inside the pan scroller, not inside the list). A horizontal `deltaX` wheel over a
**body cell** is *measured* and recorded in §8; it is not asserted, because either outcome
is a valid runtime fact and the component owns its pan either way.

## 6. Commands and expected results

```sh
# 1. type-check + offline tests
nub run --filter playground check-types          # exit 0
nub run --filter playground test                 # 14 files, +1 new model test file, exit 0
nub run --filter @gpuixui/testing test           # unchanged, exit 0

# 2. the new scenario alone
nub run --filter playground build
nub apps/playground/dist/smoke/run.js --only data-grid-virtual
# exit 0, "1/1 scenarios passed", "data-grid=verified"

# 3. the whole suite
nub apps/playground/dist/smoke/run.js
# exit 0, "69/69 scenarios passed", data-grid=verified among the capabilities

# 4. the gates
nub run check && nub run lint && nub run test    # exit 0
```

## 7. Two-direction proofs (mutation → named check fails at exit `1` → restore)

| Mutation | Expected failure |
| -------- | ---------------- |
| drop the `scrollToItem(list, 0)` reset after a sort/filter | the row-set change keeps the old anchor (`45`), so `the filter resets the anchor` fails |
| place frozen rows at `index * ROW_HEIGHT` without subtracting the anchor | `the frozen row aligns with the body row` fails once the list has scrolled |
| read the `onVisibleRange` payload instead of `getListScrollTop` | after a 280 px wheel the anchor is still `0`, so `the list virtualizes` fails |
| make `dg-pan` `overflowX: "hidden"` (no pan at all) | `the header strip pans the body` fails at `x = 0` |
| make `rowTop` ignore the in-row offset | the `rowTop` unit test fails (`+0` instead of `-12`) |

Record each measured failure line in §8 after the run.

## 8. Measured facts (2026-10-18, locally built `darwin-x64` 0.10.0, plan `140`)

The scenario is **59 checks, green** (`--only data-grid-virtual`, exit `0`); the full
suite is **69/69**, **1848 checks**, and reports `data-grid=verified`. The view is 60 rows
× 10 columns (content 900 px in a 500 px viewport), so the slowest probe in the suite
(≈ 10–19 s) is also the cheapest shape that still proves virtualization.

- **A wide `<virtual-list>` lives inside a plain horizontal scroller.** The list and the
  header are children of one `overflowX: "scroll"` div; `renderer.scrollTo` on that div
  pans both, and a header cell aligns with its body cell within 1 px at `x = -90` and at
  the far edge `x = -400`. The list keeps painting its window and scrolling vertically
  while panned. This is the composition plan `185` §8 left open.
- **The wheel route is the header strip, not the body.** A `deltaX` wheel over a header
  cell pans exactly (`-90` for `-90`), while the same wheel over a **body cell does
  nothing** — the list owns the gesture and does not chain it to the ancestor (the same
  family of behaviour plan `177` measured for vertical chaining). A grid must therefore
  give the user a pan affordance outside the rows (header, drag, or a scrollbar), or wrap
  the list in a component that forwards `deltaX` itself.
- **The frozen column follows the list's own anchor exactly.** `getListScrollTop` read
  inside `onVisibleRange` places the frozen rows at `rowTop(index, anchor)`; after a
  280 px wheel (anchor 10) and after an app-owned jump (`scrollToItem(list, 45)`), the
  frozen row and its body row agree within 1 px. The payload-based sync is not merely
  late: with it the anchor was still `0` after the same wheel (M3 below), so the frozen
  column would show the wrong rows.
- **A row-set change must reset the anchor.** With 60 rows at anchor 45, applying the
  `01` filter leaves 10 rows; without the component's `scrollToItem(list, 0)` the
  readout stayed at anchor `45` (M1). With it, the 10 rows paint inside the 300 px
  viewport and the frozen column starts at row 0.
- **Sorting resets and repaints.** `dg-sort` from anchor 45 returns to 0 and paints
  `Item 059` (descending) then `Item 000` (ascending); the list keeps its element and
  its runtime anchor (`scrollToItem` is exact at `45`).
- **Hit-testing survives the pan.** A click on column 9 at `x = -400` selects that row
  and leaves native focus on the cell (`focused === dg-cell-<id>-9`), and it does not
  move the pan.
- **Limits.** Column windowing is not part of this probe: all 10 columns are rendered,
  and `grid-wide-table` covers the windowed-column case. The probe's `dg-jump` mirrors
  the anchor optimistically because the plan-‘300’ rule (read the anchor in the handler)
  has no event for a programmatic jump; a consumer restoring a snapshot does the same.
  The 60 px-per-row cost of re-rendering a row set is why the probe stays at 60 rows.

Five two-direction proofs (mutation → the named check failed at exit `1` → restored):

| Mutation | Failing check |
| -------- | ------------- |
| removed the sort/filter anchor reset | `the filter resets the anchor: expected 0, got 45` |
| placed frozen rows at `index * ROW_HEIGHT` | `the frozen row aligns with the body row: expected 102 ± 1, got 382` |
| read `event.startIndex` instead of `getListScrollTop` | `the list virtualizes (anchor=0): expected true, got false` |
| made `dg-pan` `overflowX: "hidden"` | `the header strip pans the body (x=0): expected -90 ± 8, got 0` |
| made `rowTop` ignore the in-row offset | unit: `rowTop > lifts the content by the in-row offset: expected +0 to be -12` |

## 9. STOP conditions

Stop and report, do not improvise, if:

- a `<virtual-list>` inside an `overflowX: "scroll"` ancestor paints **no** rows or
  receives no wheel (record the exact bounds and offsets; the composition is then
  invalid, not merely imperfect);
- `renderer.scrollTo(dg-pan, x, 0)` does not move the pan (record `null`/unchanged;
  do not assert an offset read from React state instead);
- `getListScrollTop` returns `null` for the list, or its index disagrees with the painted
  top row by more than one row (the frozen-column model is then unproven; record it);
- a cell inside a panned virtual row does not hit-test or take native focus (record which
  of click/focus fails; do not simulate the click through `clickWindow`);
- `scrollToItem` after a row-set change does not repaint (record the anchor and the
  painted ids);
- the suite cannot run because the GPUix binding is missing: report exit `2` as
  unverified, never green.

## 10. Acceptance criteria

- `data-grid-virtual` passes on this host in the full run (exit `0`), and the capability
  `data-grid` reports `verified`.
- The mutation proofs above were run and restored; the failing labels are recorded in §8.
- The pure model has unit tests that fail when the filter, the sort direction, the window
  clamp or `rowTop` is wrong.
- `COMPONENTS.md`, `PLAN.md` (D50), `apps/playground/README.md`, `TODO.md` and the plan
  index describe the measured contract, not the intent.
- No new dependency; no `@gpuix/*` import outside `apps/playground`; no `any`.

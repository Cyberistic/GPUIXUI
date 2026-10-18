# 349 — Tier 3 feasibility: resizable columns inside the virtualized, panned data grid

**Status:** planned 2026-10-18 · **Phase:** D · **Workstream:** playground
(`apps/playground`, `packages/testing`)

**Depends on:** `100`, `110`, `120`, `140`, `152`, `166`, `173`, `175`, `185`,
`188`, `198`, `338`.

## 1. Why this plan exists

`COMPONENTS.md` marks **Resizable columns** with `GPUix support: ?` and the note
"Pointer events + grid tracks." The only measured resize on this host is
`table-column-resize` (plan `130`, §2 below): a 6 px handle in a **plain flex
row** of non-virtual rows drags a single column between 120 and 360 px. That is
not the shape a data grid needs.

Plan `338` measured the real data-grid composition — one plain horizontal
scroller holding a header and a `<virtual-list>` wider than its viewport, with a
frozen column placed from the list anchor — but every column width there is a
constant. The open questions are exactly the ones a grid implementation hits on
its first resize:

1. Does a resize handle on an **absolutely positioned header cell** receive a
   drag at all, and do captured moves keep arriving when the handle moves with
   the pointer?
2. Does the **body** follow? Header cells are placed from width state; virtual
   rows are flex children of a row whose width is the width sum. If the runtime
   caches a virtual list's item layout, a width change could leave the rows at
   their old width while the header moves.
3. Does the **horizontal scroller** accept a shrinking content width — does
   `getScrollOffset` clamp to the new maximum, or keep an out-of-range offset
   that makes the header and body disagree after the next pan?
4. Does a resize preserve the **virtual-list anchor** and the frozen column's
   alignment, and does a row that leaves the window repaint at the new width on
   return?

`table-column-resize` cannot answer any of them. This probe does.

It changes **no package code**. It adds one pure model + unit tests, one
consumer-path view, one headless scenario and one live twin.

## 2. What was already measured (do not re-measure)

| Fact | Source |
| ---- | ------ |
| A captured drag keeps delivering moves to the pressed element; the gesture ends in a click on it | `drag-targets` (`162`) |
| A 6 px divider with `nextSize` resizes a split; arrows/Home/End resize it when focused | `panel-resize` (`175`) |
| `role="separator"` is an AccessKit `Splitter`; `aria-valuetext` carries the size | `panel-nested` (`175`) |
| A plain `overflowX: "scroll"` pans on `deltaX`; clipped children keep painted bounds; `renderer.scrollTo` is exact | `tab-strip-overflow` (`173`) |
| A `<virtual-list>` inside a plain horizontal scroller pans, and a header placed from one scroll offset aligns within 1 px | `data-grid-virtual` (`338`) |
| `position: "sticky"` is ignored; `<canvas>` is empty; `display: "none"` is a no-op | `185`, `161`, `177` |
| Declared row heights reflow exactly; `scrollToItem`/`scrollIntoView` are exact | `variable-rows` (`198`), `scroll-into-view` (`166`) |

## 3. What will be proven

Capability: `columns` (new). Scenario: `data-grid-columns`; live twin:
`live-data-grid-columns`.

View: a 660 px frame. A 150 px frozen ID column, then a 360 px horizontal
viewport holding a 560 px content area: a 28 px header row and a 280 px
`<virtual-list>` of 60 rows at 28 px. Columns:

| id | default | min | max |
| -- | ------- | --- | --- |
| `name` | 200 | 96 | 320 |
| `status` | 120 | 80 | 240 |
| `size` | 90 | 64 | 180 |
| `notes` | 150 | 80 | 300 |

Header cells are absolutely positioned at `offsetOf(widths, id)` with
`widthOf(widths, id)`; each carries a 6 px handle straddling its right edge.
Body cells are flex children of a `contentWidth` px row with the same widths.
The frozen column places its rows from the list anchor (`getListScrollTop` read
inside `onVisibleRange`, the plan-300 rule).

| Area | Check |
| ---- | ----- |
| geometry | the pan starts at the frozen column's right edge and is 360 px; the header row is 560 px; each visible header cell's x/width matches its body cell within 1 px |
| resize | a drag on `name`'s handle by +40 reports `name=240`, moves `status`'s header **and** body x by +40, and grows the header row to 600 px |
| clamp | a −400 drag stops at 96; a +400 drag stops at 320 (inclusive) |
| last edge | after resizing `notes` to its maximum the last header and body cell end exactly at the row's right edge (within 1 px) |
| pan → resize → pan | at the far pan, resizing `notes` changes the content width; a new `pan end` lands on the new maximum and header/body still align within 1 px |
| shrink | shrinking `notes` to 80 leaves `content=490`; the new `pan end` is −130 and the remaining columns align |
| anchor | a jump to row 45 anchors exactly; a resize then leaves the readout anchor at 45 **and** `getListScrollTop(list)[0] === 45`; the frozen row 45 still aligns with body row 45 |
| selection | a selected row stays selected across a resize |
| keyboard | a click focuses a handle; `Right` grows by 16; `End` clamps to max; `Home` clamps to min |
| reset | the reset control restores all four defaults, `content=560`, and the pan maximum |
| a11y | the handle is an AccessKit `Splitter` whose `aria-valuetext` is the width in px |
| live | a paced real drag in the 1100 × 720 window resizes the header and the body follows; a real click + arrow resizes; a real pan then drag realigns |

The probe does **not** re-measure generic drag capture, virtual-list windowing,
`scrollIntoView`, or `SplitPane`. It does not claim auto-fit/double-click reset,
column reordering, or persisted widths (the reset control and app state cover
the storage question, as `workspace-restore` already did for layouts).

## 4. Files

Create:

- `apps/playground/src/scenarios/column-resize-model.ts` — columns, widths,
  offsets, content width, max pan, a clamped `setWidth`, reset, a readout
  string.
- `apps/playground/src/scenarios/column-resize-model.test.ts` — the unit tests
  in §7.1.
- `apps/playground/src/scenarios/data-grid-columns.tsx` — the view and the
  `data-grid-columns` scenario.

Change:

- `apps/playground/src/scenarios/index.ts` — import/register the scenario and
  add `"columns"` to `PROBE_CAPABILITIES`.
- `packages/testing/src/smoke.ts` — add `"columns"` to `CAPABILITIES`.
- `apps/playground/src/live/scenarios.tsx` — import the view, add the
  `live-data-grid-columns` twin after `live-inspector`.
- `apps/playground/README.md` — a `## Data-grid columns (plan 349)` section with
  the measured facts and the new file under `Structure`.
- `COMPONENTS.md` — the `columns` capability row, and measured evidence on the
  **Resizable columns** row (status stays `todo`: this is the runtime contract,
  not a shipped package). Also correct the **Column configuration** row to point
  at this probe's per-column state if it adds anything new.
- `TODO.md` — tick the new playground task with the measured counts.
- `.agents/slop/plans/README.md` — add the `349` row; move the next free number
  to `350`.

Do **not** change any other package, `apps/docs`, or the shell.

## 5. The model (`column-resize-model.ts`)

```ts
export interface ColumnSpec {
  readonly id: string;
  readonly label: string;
  readonly width: number;
  readonly min: number;
  readonly max: number;
}

/** The probe's four columns, in paint order. */
export const COLUMNS: ReadonlyArray<ColumnSpec>;

/** Widths by column id. */
export type Widths = Readonly<Record<string, number>>;

export const initialWidths: Widths;

/** The width for `id`; an unknown id is the empty string's problem — return 0. */
export const widthOf = (widths: Widths, id: string): number;

/** The sum of every preceding column's width: the cell's left edge. */
export const offsetOf = (widths: Widths, id: string): number;

/** The row's width: the sum of all four. */
export const contentWidth = (widths: Widths): number;

/** The smallest legal horizontal offset for `viewport`: `min(0, viewport - content)`; 0 when it fits. */
export const maxPan = (widths: Widths, viewport: number): number;

/** Clamps `next` to the column's `[min, max]`; an unknown id returns `widths` unchanged. */
export const setWidth = (widths: Widths, id: string, next: number): Widths;

/** Every column back to its default. */
export const resetWidths = (): Widths;

/** `name=200 status=120 size=90 notes=150`, in column order. */
export const describeWidths = (widths: Widths): string;
```

Rules:

- `setWidth` uses `Number.clamp` (the same helper `panels/resize.ts` uses). It
  returns the **same** object when the clamped value equals the current width, so
  a no-op drag step does not re-render.
- `offsetOf`/`contentWidth`/`maxPan`/`describeWidths` must not mutate or depend
  on object key order; iterate `COLUMNS`.
- No React, no GPUix, no `Date`/`Math.random`.

## 6. The view and the scenario (`data-grid-columns.tsx`)

Root: `testId="columns-frame"`, `width: 660`, column flex, 8 px gap.

Control row: the shared `Pressable` `testId="columns-reset"` (`reset widths`),
`testId="columns-pan-end"` (`pan end`), `testId="columns-jump"` (`jump`).

Readout `testId="columns-state"`:
`<describeWidths> content=<n> x=<panX> anchor=<n> sel=<id|none>`.

Grid: `testId="columns-grid"`, `display: "flex"`, `height: 308`.

**Frozen column** (`testId="columns-frozen"`, 150 px): header
`testId="columns-frozen-head"`; a `position: "relative"` 280 px box with one
absolutely positioned row per painted index (`anchoredWindow`), keyed by row id,
`testId={`columns-frozen-row-${id}`}`, top from `rowTop`, background `accent`
when selected.

**Pan viewport** (`testId="columns-pan"`, `ref`, `width: 360`,
`height: 308`, `overflowX: "scroll"`, `overflowY: "hidden"`,
`onScroll` → read `getScrollOffset` and set `panX`):

- inner div `width: contentWidth`;
- header row `testId="columns-headrow"`, `position: "relative"`, height 28,
  `backgroundColor: muted`. For each column an absolutely positioned cell
  `testId={`columns-head-${id}`}` at `left: offsetOf`, `width: widthOf`,
  carrying the label `<text>` and an absolutely positioned handle
  `testId={`columns-handle-${id}`}`, `aria-id` and `aria-label`
  (`Resize <label> column`), `role="separator"`, `tabIndex={0}`,
  `aria-valuetext={`${width}px`}`, `left: width - 3`, `width: 6`, full height,
  `cursor: "col-resize"`, `hover: { backgroundColor: primary }`.
- `<virtual-list testId="columns-list" ref={list} estimatedItemHeight={28}
  onVisibleRange={syncAnchor} style={{ width: contentWidth, height: 280 }}>`
  with 60 rows. A row is `testId={`columns-row-${id}`}`, flex, width
  `contentWidth`, height 28, `onClick` selects; each cell
  `testId={`columns-cell-${id}-${column.id}`}` is `width: widthOf`,
  `flexShrink: 0`, `role="gridcell"`, `aria-selected`, `tabIndex` on the
  selected row's `name` cell.

Handlers:

- handle `onMouseDown` stores `Option<{ pointer: number; start: number; id: string }>`
  from `event.x` and the current width;
- handle `onMouseMove` while pressed calls
  `setWidths((current) => setWidth(current, press.id, press.start + (event.x ?? 0) - press.pointer))`
  — a **functional** update: live moves and their commits can share a batch
  (plan `348` §9.1);
- handle `onMouseUp` clears the press;
- handle `onKeyDown`: `left`/`right` ±16, `home` → min, `end` → max, via
  `setWidth`;
- `columns-jump` sets the anchor to 45, calls `renderer.scrollToItem(list, 45)`
  and, like `data-grid-virtual`, mirrors the anchor optimistically (a
  programmatic scroll emits no range event);
- `columns-pan-end` calls `renderer.scrollTo(id, maxPan(widths, 360), 0)` and
  sets `panX` to the same value.

`syncAnchor` reads `renderer.getListScrollTop(list.id)` inside `onVisibleRange`
and only updates when the pair changes. There is **no effect** that resets the
anchor for a width change: the anchor must survive a resize (that is the
assertion).

## 7. Steps for the executor

1. Read this plan, then `data-grid.tsx`, `data-grid-model.ts`, `table.tsx`,
   `panels/split-pane.tsx`, `panel-nested.tsx`, `probes.ts`, `ui.tsx` and
   `live/scenarios.tsx` (the `live-inspector` twin).
2. Write `column-resize-model.ts` + its test. Run:

   ```sh
   nub run --filter playground test
   ```

   Expected: exit `0`; the new unit tests pass with the existing ones.
3. Write `data-grid-columns.tsx`, register it, add the capability literal.
   Run the same command. Expected: exit `0`; `scenarioProblems` reports nothing
   (both `PROBE_CAPABILITIES` and `Smoke.CAPABILITIES` updated).
4. Build and run only the new scenario:

   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js --only data-grid-columns
   ```

   Expected: `1/1 scenarios passed`, exit `0`. A check that misses reports the
   readout or the bounds — fix geometry, never widen a tolerance past 2 px.
5. Run the full headless suite:

   ```sh
   nub apps/playground/dist/smoke/run.js
   ```

   Expected: `80/80 scenarios passed`, exit `0`, `columns=verified`; record the
   new check total.
6. Add `live-data-grid-columns` (`view: dataGridColumnsScenario.view`,
   `ready: "columns-frame"`) using `settle` after each input and `waitForText`
   for the readout. Run:

   ```sh
   nub run --filter playground smoke:live
   ```

   Expected: `31/31 scenarios passed`, exit `0`, one screenshot, record the
   check total. A live step may not assert style or the a11y dump (plan `197`).
7. Run the gates:

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   Expected: all exit `0`.
8. Update `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md` and the plan
   index with the measured counts and the raw pan-shrink behaviour (§9).
   Commit the plan first, then the probe.

## 8. Test plan

### 8.1 Unit tests (`column-resize-model.test.ts`)

Each must be able to fail:

| Test | Guards |
| ---- | ------ |
| `initialWidths` | the four defaults exactly; `contentWidth` 560 |
| `offsetOf` | 0 / 200 / 320 / 410 in column order; an unknown id is 0 |
| `setWidth` | clamps at min and max inclusively; a no-op returns the same object; the input is not mutated |
| `maxPan` | 560 in a 360 viewport → −200; a content narrower than the viewport → 0; `0` viewport → −content |
| `resetWidths` | restores every default after a resize and returns a fresh object |
| `describeWidths` | prints in column order regardless of insertion order and reflects a resize |

### 8.2 The scenario

The scenario is the runtime test: typed checks over readout text, bounds and the
accessibility dump. Record five mutation proofs and one reverse proof in §10
(temporary edit → `--only` run → revert):

| # | Mutation | Must fail with |
| - | -------- | -------------- |
| M1 | header cell `width` wired to `COLUMN.width` (ignore state) | the first drag's header width (200 vs 240) |
| M2 | body cell `width` wired to `COLUMN.width` | body/header alignment after the drag |
| M3 | the handle's `onMouseMove` removed | "the drag grows the name column" |
| M4 | `setWidth`'s clamp dropped | "the drag clamps at the minimum" |
| M5 | `columns-jump` stops calling `scrollToItem` (only the readout moves) | the runtime anchor check (`getListScrollTop[0] === 45`) |
| M6 | the pan-end control uses the default content width | "the pan reaches the new maximum" after a resize |

Reverse proof (consumer wiring): the handle's `onKeyDown` removed → "Right grows
the column" fails.

### 8.3 Two-direction checks by hand

- `--only data-grid-columns` exits `1` after each mutation and names the table
  label.
- Full headless `80/80` and live `31/31`, both exit `0`.
- `nub run check`, `nub run lint`, `nub run test` exit `0`.

## 9. STOP conditions

- **A drag on an absolutely positioned handle delivers no moves.** Stop and
  record where the press lands; then switch to plan `130`'s in-flow 6 px handle
  (a flex sibling inside the header cell) and amortise its width into the column
  width. Do not add `pointerEvents: "none"` anywhere without measuring.
- **The virtual list keeps painting rows at the old width after a width
  change.** That is the core finding. Stop and record exactly what is stale
  (row width, cell width, list content width, paint), assert the measured
  behaviour with a label that says so, and narrow the claim to the header until
  a component fix is recorded as a `data-grid` task.
- **A shrinking content width leaves an out-of-range scroll offset** and a
  subsequent pan cannot recover it. Record the raw offset, assert the re-panned
  alignment (a real pan is the app's job), and note the rule for the grid
  package; do not add a screenshot for it.
- **Alignment cannot be asserted within 2 px.** Stop: that is a mechanism
  question, not this view.
- **A live step cannot reach the handle** (clipped or off-window). Pan first, as
  the headless path does; if it still cannot, narrow the live twin and say why.
- **A file outside §4 must change.** Stop and write the task in `TODO.md`.
- The suites are not `80/80` headless and `31/31` live with exit `0`. Stop and
  report the failing scenario; do not mark the plan done.

## 10. Measured results

_(Filled by the executor after the runs: the headless/live counts, the raw
pan-shrink offset, every mutation proof with its exact failure text, and any
limit worth recording. Keep the §9 vocabulary.)_

## 11. Acceptance

- `column-resize-model.ts` + its test, `data-grid-columns.tsx`, the registry
  entry, the capability literal, the live twin, and the docs/inventory/plan-index
  updates.
- Headless `80/80`, live `31/31`, exit `0`; `nub run check`, `nub run lint`,
  `nub run test` all exit `0`.
- `COMPONENTS.md` has the `columns` capability row and the measured **Resizable
  columns** contract; `TODO.md` ticks this task with the counts.
- Every mutation in §8.2 was run and produced the named failure (§10).
- No component package changed. Any defect found is a measured `TODO.md` task
  with its own plan number, not an edit from this workstream.

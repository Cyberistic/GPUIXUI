# 384 — Tier 3 feasibility: column configuration in the virtualized, panned data grid

**Status:** landed 2026-10-18 · **Phase:** D · **Workstream:** playground
(`apps/playground`, `packages/testing`)

**Depends on:** `100`, `110`, `120`, `140`, `152`, `164`, `166`, `173`, `185`,
`198`, `338`, `349`.

**Number note:** the playground index used to say "next free number `383`".
`383` was taken by two other workstreams before this plan was written
(`components` `383-component-page-api`, `tokens-theme` `383-total-theme-check`),
so this plan takes **`384`**; update the index to `385` after it lands.

## 1. Why this plan exists

`COMPONENTS.md`'s Tier 3 row **Column configuration** is still
`todo | partial (probe)`: windowing (`grid-wide-table`, plan `185`), panning
(`data-grid-virtual`, plan `338`) and per-column widths (`data-grid-columns`,
plan `349`) are measured, but **no probe has ever hidden, shown or reordered a
column**. MISSION lists column configuration as a Tier 3 deliverable, so the
data-grid package (which has no owner yet) would have to invent the contract
from nothing.

The questions a column-settings UI hits on its first interaction:

1. Does a `<virtual-list>` repaint its rows when the **number of cells per row**
   changes (hide/show), not only when a width changes? Or does it keep a stale
   cell set?
2. Does the horizontal scroller's **maximum shrink** with the visible width, and
   does the live offset clamp — the same question plan `349` answered for a
   resize, now triggered from a menu?
3. Does the **virtual-list anchor** survive hide/show/reorder, or does a
   configuration change reset the reader to the top?
4. Does reordering ids move both the header's absolute offsets and the flex body
   cells consistently, with React keys preserving each column's identity?
5. Can the configuration surface be an **anchored panel** opened from app chrome
   and stay open while the grid re-renders underneath it?
6. Do width state and visibility interact correctly: hiding a widened column and
   showing it again must restore that width.

This probe answers all six. It changes **no package code**. It adds one pure
model + unit tests, one consumer-path view, one headless scenario and one live
twin, and a new `column-config` capability.

## 2. What was already measured (do not re-measure)

| Fact | Source |
| ---- | ------ |
| A wide `<virtual-list>` inside a plain horizontal scroller pans the header and every row from one offset | `data-grid-virtual` (`338`) |
| A frozen column placed from `getListScrollTop` read inside `onVisibleRange` aligns within 1 px; the payload lags one gesture | `338`, `message-scroller` (`300`) |
| A width change repaints every row, preserves the anchor and clamps a shrinking content width immediately | `data-grid-columns` (`349`) |
| `position: "sticky"` is ignored; column windowing is component code | `grid-wide-table` (`185`) |
| `<anchored position>` is exact inside a scrolled container, is not clipped, and an item below the viewport still activates | `context-menu-pointer` (`164`) |
| A non-modal panel keeps native focus, Escape returns it and an outside press dismisses without stealing it | `notification-centre` (`381`) |
| An appended rule is revealed and focused from a post-commit effect; a filter resets the anchor and the component mirrors the reset | `query-builder` (`378`), `data-toolbar` (`377`) |
| Variable row heights reflow exactly; `scrollToItem`/`scrollIntoView` are exact | `variable-rows` (`198`), `scroll-into-view` (`166`) |

## 3. What will be proven

Capability: `column-config` (new). Scenario: `column-config`; live twin:
`live-column-config`.

**View.** A 660 px frame, same grid shape as `data-grid-columns`:

- a 150 px frozen `ID` column (never configurable — it is the row address);
- a 360 px horizontal viewport holding a header row and a 280 px
  `<virtual-list>` of 60 rows at 28 px;
- four configurable columns, in the default order and with the plan-349 widths:
  `name 200`, `status 120`, `size 90`, `notes 150` (content `560`).

**Configuration state** is `{ order, hidden }`; widths stay the plan-349
`Widths` record. The API is app-owned: a toolbar trigger opens an `<anchored>`
panel listing **every** column in `order`, each row with a show/hide control and
up/down controls, plus a reset. The panel is deliberately not a shipped menu:
the probe isolates the grid mechanism, and plan `164` already measured the
anchored primitive the final data-grid package will use.

| Area | Check |
| ---- | ----- |
| baseline | readout `order=name,status,size,notes hidden=none visible=4 content=560`; header/body agree within 1 px for `name`, `status`, `size` |
| panel | clicking the trigger paints the panel at the trigger's bottom-left (within 1 px); it is focused natively; it stays painted while the grid re-renders |
| hide | hiding `status` reports `hidden=status visible=3 content=440`, unpaints its header and every body cell, moves `size` to `x = name.x + name.width` and keeps header/body aligned |
| pan shrink | from `x=-200`, hiding the last visible column shrinks the content and the live offset follows the new maximum (`-80`) without a manual pan; `pan end` lands on the same value |
| show | showing `status` restores its order position, its 120 px width and its cells; content returns to `560` |
| reorder | moving `notes` up yields `order=name,status,notes,size`; `notes` and `size` header cells swap offsets (`320`/`470`) and every body cell follows within 1 px; content unchanged |
| clamps | `up` on the first column and `down` on the last are no-ops |
| widths persist | widening `name` to 240 makes content `600`; hiding then showing `name` restores 240 and content `600`; reset restores `560` |
| anchor | a jump to row 45 plus a selection survives a hide, a reorder and a show: readout `anchor=45`, `getListScrollTop(list)[0] === 45`, the frozen row 45 still aligns with body row 45 |
| dismissal | Escape closes the panel and returns native focus to the trigger; an outside press closes it without the panel taking focus back; each close names its reason in the readout |
| a11y | the panel is an AccessKit `Group` named `Columns`; the trigger is a `Button` |
| live | a real window opens the panel, hides `status` (`content=440`), pans to `-80`, jumps to 45, hides `size` without losing the anchor, re-shows both (`560`) and Escape returns focus; no style or a11y assertion |

The probe does **not** re-measure generic drag capture, virtual-list windowing,
`scrollIntoView` or `SplitPane`. It does not claim drag-reordering, persisted
settings or auto-fit; the reset control plus app state cover storage, as
`workspace-restore` did for layouts.

## 4. Files

Create:

- `apps/playground/src/scenarios/column-config-model.ts` — order, visibility,
  derived visible ids/offsets/content width/max pan, toggle/move/reset, readout.
- `apps/playground/src/scenarios/column-config-model.test.ts` — the unit tests
  in §8.1.
- `apps/playground/src/scenarios/column-config.tsx` — the view and the
  `column-config` scenario.

Change:

- `apps/playground/src/scenarios/index.ts` — import/register the scenario and
  add `"column-config"` to `PROBE_CAPABILITIES`.
- `packages/testing/src/smoke.ts` — add `"column-config"` to `CAPABILITIES`.
- `apps/playground/src/live/scenarios.tsx` — import the view, add the
  `live-column-config` twin after `live-data-grid-columns`.
- `apps/playground/README.md` — a `## Column configuration (plan 384)` section
  with the measured facts and the new files under `Structure`.
- `COMPONENTS.md` — a `column-config` capability row and measured evidence on
  the **Column configuration** row (status stays `todo`: this is the runtime
  contract, not a shipped package). Cross-reference **Resizable columns**.
- `TODO.md` — tick the new playground task with the measured counts.
- `.agents/slop/plans/README.md` — add the `384` row; move the next free number
  to `385`.

Do **not** change any other package, `apps/docs`, or the shell.

## 5. The model (`column-config-model.ts`)

Reuse the width model rather than duplicating arithmetic:

```ts
import * as Arr from "effect/Array";
import * as Number from "effect/Number";
import * as Option from "effect/Option";
import {
  COLUMNS,
  widthOf,
  type Widths,
} from "./column-resize-model.js";

/** Paint order plus the hidden set; widths live in `Widths`. */
export interface ColumnConfig {
  readonly order: ReadonlyArray<string>;
  readonly hidden: ReadonlyArray<string>;
}

export const initialConfig: ColumnConfig;

/** The ids in paint order, hidden ones included. */
export const orderOf: (config: ColumnConfig) => ReadonlyArray<string>;

/** The ids that paint, in order. */
export const visibleIds: (config: ColumnConfig) => ReadonlyArray<string>;

/** `true` when `id` is a known column that is shown. */
export const isVisible: (config: ColumnConfig, id: string) => boolean;

/**
 * Hides or shows `id`. Refuses to hide the last visible column, and returns the
 * same object for an unknown id or a no-op.
 */
export const toggle: (config: ColumnConfig, id: string) => ColumnConfig;

/**
 * Moves `id` by `delta` positions in the full order (`-1` up, `+1` down),
 * clamped at the ends; unknown ids and clamped moves return `config`.
 */
export const moveBy: (
  config: ColumnConfig,
  id: string,
  delta: number,
) => ColumnConfig;

/** The default order with nothing hidden. */
export const resetConfig: () => ColumnConfig;

/** The sum of the widths of the visible columns before `id`; 0 for a hidden/unknown id. */
export const offsetIn: (
  config: ColumnConfig,
  widths: Widths,
  id: string,
) => number;

/** The row width: the sum of the visible columns' widths. */
export const contentWidthOf: (config: ColumnConfig, widths: Widths) => number;

/** `min(0, viewport - contentWidthOf(...))`. */
export const maxPanOf: (
  config: ColumnConfig,
  widths: Widths,
  viewport: number,
) => number;

/** `order=name,status,size,notes hidden=none visible=4` */
export const describeConfig: (config: ColumnConfig) => string;
```

Rules:

- `order` starts as `Arr.map(COLUMNS, spec => spec.id)`; `hidden` starts empty.
- `describeConfig` prints `hidden=none` when empty, otherwise the hidden ids in
  order joined by `,`; `visible` is `4 - hidden.length`.
- `toggle` may hide only while at least two columns are visible. It returns the
  **same** object when nothing changes, so a no-op click does not re-render.
- `moveBy` swaps adjacent entries by index (not by value), returns the same
  object for an unknown id, `delta === 0`, or an end clamp, and never mutates the
  input arrays.
- `offsetIn` iterates `order`, skips hidden ids and stops at `id`; an unknown id
  is `0`.
- `contentWidthOf`/`maxPanOf` iterate the visible ids; `maxPanOf` uses
  `Number.min`, never `Math`.
- No React, no GPUix, no `Date`/`Math.random`.

## 6. The view and the scenario (`column-config.tsx`)

Root `testId="config-frame"`, `width: 660`, column flex, 8 px gap.

**Control row:** `Pressable testId="config-open"` (`columns…`, `ref` kept for
focus return), `config-reset` (`reset`), `config-widen` (`widen name`),
`config-pan-end` (`pan end`), `config-jump` (`jump`).

**Readout `testId="config-state"`:**
`<describeConfig> content=<n> x=<panX> anchor=<n> sel=<id|none> last=<reason>`.

**Outside target:** `testId="config-outside"` (120 × 32, muted), to its right.

**Panel:** when open, `<anchored position={point} deferred priority={1} occlude
style={{ position: "absolute" }}>` where `point` is
`{ x: bounds.x, y: bounds.y + bounds.height }` read from
`renderer.getElementBounds(trigger.id)` on open. Surface
`testId="config-panel"`, `role="group"`, `aria-label="Columns"`, `testId`-named
`<text>Columns</text>`, `tabIndex={-1}`, `autoFocus`, `onMouseDownOutside` →
`close("outside")`, `onKeyDown` Escape → `close("escape")` plus
`renderer.focusElement(trigger.id)`.
For each id in `order`: a row `testId={`config-item-${id}`}` with
`<text>{id}</text>`, a show control `testId={`config-show-${id}`}`
(`role="checkbox"`, `aria-label={`Show ${id}`}`,
`aria-valuetext={visible ? "shown" : "hidden"}`, label text `shown`/`hidden`),
`config-up-${id}` (`role="button"`, `aria-label={`Move ${id} up`}`, label `↑`),
`config-down-${id}` (label `↓`). Controls are plain `div`s with `tabIndex={0}`
and `onClick` so the panel keeps its own focus owner; they are app chrome in a
probe, not a shipped menu.

**Grid:** `testId="config-grid"`, flex, height `308`.

- Frozen column `config-frozen` (150 px): header `config-frozen-head`, a
  `position: "relative"` 280 px box with one absolute row per painted index
  (`anchoredWindow`), `testId={`config-frozen-row-${id}`}`, top from `rowTop`,
  accent background when selected.
- Pan viewport `config-pan` (`ref`, 360 × 308, `overflowX: "scroll"`,
  `overflowY: "hidden"`, `onScroll` → `getScrollOffset`), inner div
  `width: contentWidthOf(config, widths)`:
  - header row `config-headrow`, `position: "relative"`, height 28; for each
    **visible** id an absolute cell `config-head-${id}` at
    `left: offsetIn(config, widths, id)`, `width: widthOf(widths, id)`;
  - `<virtual-list testId="config-list" ref={list} estimatedItemHeight={28}
    onVisibleRange={syncAnchor} style={{ width: content, height: 280 }}>`
    with 60 rows. A row `config-row-${row.id}` is a flex child, width
    `content`, height 28, `onClick` selects; each **visible** cell
    `config-cell-${row.id}-${id}` is `width: widthOf`, `flexShrink: 0`,
    `role="gridcell"`, `aria-selected`, `aria-label`.

Handlers:

- `open()` reads the trigger bounds and sets the panel point; `close(reason)`
  clears it, records `last`, and returns focus only for `"escape"`.
- `toggle`/`moveBy` are functional `setConfig` updates.
- `config-widen` sets `name` to 240 through `setWidth` (plan `349`).
- `config-pan-end` calls `renderer.scrollTo(pan.id, maxPanOf(...), 0)` and
  mirrors `panX`; `config-jump` calls `scrollToItem(list, 45)` and mirrors the
  anchor optimistically (a programmatic scroll emits no range event).
- `syncAnchor` reads `renderer.getListScrollTop(list.id)` inside
  `onVisibleRange` and only updates when the pair changes — the plan-300 rule.
  There is **no reset effect** for a config change: the anchor must survive (or
  the run reveals that it does not; see §9).
- A `config-reset` sets `resetConfig()` and `resetWidths()`.

## 7. Steps for the executor

1. Read this plan, then `data-grid-columns.tsx`, `column-resize-model.ts`,
   `data-grid.tsx`, `context-menu.tsx` (the anchored pattern), `probes.ts`,
   `ui.tsx` and `live/scenarios.tsx` (the `live-data-grid-columns` twin).
2. Write `column-config-model.ts` + its test. Run:

   ```sh
   nub run --filter playground test
   ```

   Expected: exit `0`; the new unit tests pass with the existing 166.
3. Write `column-config.tsx`, register it, add the capability literal. Run the
   same command. Expected: exit `0`; `scenarioProblems` reports nothing (both
   `PROBE_CAPABILITIES` and `Smoke.CAPABILITIES` updated).
4. Build and run only the new scenario:

   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js --only column-config
   ```

   Expected: `1/1 scenarios passed`, exit `0`. A check that misses reports the
   readout or the bounds — fix the implementation or, when the runtime really
   behaves differently, follow §9 and assert the measured fact with a label that
   says so. Never widen a geometry tolerance past 2 px.
5. Run the full headless suite:

   ```sh
   nub apps/playground/dist/smoke/run.js
   ```

   Expected baseline before this plan: `85/85`, `2724` checks, exit `0`. After:
   `86/86`, `2724 + <new>` checks, exit `0`, `column-config=verified`.
6. Add `live-column-config` (`view: columnConfigScenario.view`,
   `ready: "config-frame"`) using `settle` after each input and `waitForText`
   for the readout. Run:

   ```sh
   nub run --filter playground smoke:live
   ```

   Expected baseline: `36/36` live, `678` checks, exit `0`. After:
   `37/37`, `678 + <new>`, exit `0`, one screenshot.
7. Run the gates:

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   Expected: all exit `0`.
8. Update `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md` and the plan
   index with the measured counts and every fact that changed the design (§10).
   Commit the plan first, then the probe.

## 8. Test plan

### 8.1 Unit tests (`column-config-model.test.ts`)

Each must be able to fail:

| Test | Guards |
| ---- | ------ |
| `initialConfig` | order is `name,status,size,notes`; nothing hidden; `visible=4` |
| `visibleIds` | order preserved; a hidden id is absent; every id is shown again after `toggle` twice |
| `toggle` | hides, is idempotent, refuses to hide the last visible column, unknown id unchanged, input not mutated |
| `moveBy` | a swap happens; `-1`/`+1` clamp at both ends; a hidden neighbour still occupies an order slot; unknown id and `0` return the same object; input not mutated |
| `resetConfig` | restores the order and clears every hidden id in a fresh object |
| `offsetIn` | `0/200/320/410` at rest; a hidden `status` gives `size = 200`; a hidden/unknown id is `0`; a reorder changes the offsets |
| `contentWidthOf` | `560` at rest; `440` without `status`; follows a widened width |
| `maxPanOf` | `-200` at 360; `0` when it fits; `-80` without `status`; `-50` after hiding `notes` from a widened grid |
| `describeConfig` | `hidden=none`, `hidden=status`, the `visible` count, and hidden ids in order |

### 8.2 The scenario

The scenario is the runtime test: typed checks over readout text, bounds, the
a11y dump and native focus. Record six mutation proofs and one reverse proof in
§10 (temporary edit → `--only` run → revert):

| # | Mutation | Must fail with |
| - | -------- | -------------- |
| M1 | body cells map over `COLUMNS` instead of `visibleIds` | "the hidden column has no body cell" |
| M2 | header cells map over `COLUMNS` instead of `visibleIds` | "the hidden column has no header" |
| M3 | header offsets use `offsetOf` (the fixed order) | "the reordered header cell moved" |
| M4 | `toggle` appends to `hidden` but never filters `visibleIds` | "hidden status leaves three visible columns" |
| M5 | `config-pan-end` uses `maxPan(initialWidths)` | "the pan maximum follows the hidden column" |
| M6 | the panel's `onMouseDownOutside` removed | "an outside press closes the panel" |
| M7 | `moveBy` ignores `delta` | "the reordered order readout" |

Reverse proof (consumer wiring): the panel's show control's `onClick` removed →
"showing status restores its cells" fails.

### 8.3 Two-direction checks by hand

- `--only column-config` exits `1` after each mutation and names the table
  label.
- Full headless `86/86` and live `37/37`, both exit `0`.
- `nub run check`, `nub run lint`, `nub run test` exit `0`.

## 9. STOP conditions

- **The virtual list keeps the old cell set after a hide/show.** That is the core
  finding. Stop, record exactly what is stale (row width, cell count, painted
  cells, header), assert the measured behaviour with a label that says so, and
  record a `data-grid` task with the evidence. Narrow the claim to the header
  until the runtime/package story is clear.
- **A config change resets the list anchor.** Record the measured anchor. If it
  resets, add a post-commit restore (`scrollToItem(list, previousIndex)`) and
  assert the restored anchor; this is a real rule for the grid package, not a
  reason to drop the check.
- **Hiding the last visible column is rejected but the readout still changes.**
  Stop: the guard and the derived state must come from the same function.
- **The anchored panel paints at a different offset than the trigger.** Record
  the delta and the trigger's bounds; if the layer anchors to the mount parent,
  switch to a pointer-positioned panel (`<anchored position={point}>` is already
  the plan) and record the correction.
- **The live run cannot click a control** (clipped or covered). Move the panel
  point or the outside target; if it still cannot, narrow the live twin and say
  why in §10.
- **A file outside §4 must change.** Stop and write the task in `TODO.md`.
- The suites are not `86/86` headless and `37/37` live with exit `0`. Stop and
  report the failing scenario; do not mark the plan done.

## 10. Measured results

Run on this host, 2026-10-18, against the locally built `darwin-x64` 0.10.0
binding (ADR 0003).

| Scenario | Checks | Result |
| -------- | ------ | ------ |
| `column-config` (headless) | 122 | pass — suite `85 → 86`, `2724 → 2846`, exit `0`, `column-config=verified` |
| `live-column-config` | 27 | pass — live `36 → 37`, `678 → 705`, exit `0`, one screenshot |

Unit tests: `column-config-model.test.ts` adds 20 tests; the playground suite is
166 → **186** tests in 19 files.

### 10.1 Facts that changed the plan

- **A live panel mounts one React commit after the click.** The first live run
  failed at `config-show-size` with `AutomationError: Locator did not match any
  element`, because the step pressed a control in the same tick as the open.
  The twin now `waitFor("config-panel")` and `settle`s after every open. The
  headless host is synchronous and cannot show that race.
- **An outside press on a non-focusable target leaves focus `none`.** The
  dismissal is measured as "does not return focus" — the planned
  `focused == config-outside` was wrong: a plain `div` without `tabIndex` takes
  neither focus nor the panel's. The assertion records the measured `none`.
- **`aria-valuetext` on a `role="checkbox"` control is exposed as `value`.**
  The hidden column's show control reports `value=hidden`, which is the only
  checked-state signal 0.10.0 offers (there is no `aria-checked`).
- **M3's fixed-order offset fails at the hide gap before it reaches the
  reorder.** Using the declaration order for the header offsets leaves `size` at
  320 after hiding `status` (expected 200), so the scenario names that assertion,
  not the reorder. The fixed-order mutation is still guarded end to end; the
  reorder geometry has its own checks.
- **A readout expectation built from the same model cannot catch a model bug.**
  M7 (`moveBy` ignores its delta) leaves the scenario's expected `describeConfig`
  equally unchanged, so the readout check passes and the **header geometry**
  fails. The unit tests are the model's guard; the native check is the paint's.

### 10.2 The measured contract

| Fact | Value |
| ---- | ----- |
| panel | left edge == trigger's, top == trigger's bottom, within 1 px; `autoFocus` focuses it; `Group` named `Columns`; trigger `Button` |
| hide | `hidden=status visible=3 content=440`; header and every body cell unpaint; `size.x == name.x + name.width` within 1 px; header row 440 |
| show | order slot, 120 px width and cells return; content 560 |
| pan shrink | from `-200`, hiding the last column (`content 410`) makes the runtime report `-50` **with no manual pan**; pan end agrees |
| reorder | `name,status,notes,size`: `notes` at 320, `size` at 470, body cells within 1 px |
| clamps | up on the first / down on the last are no-ops |
| widths | `name 240` survives hide/show (`600 → 360 → 600`) and still paints 240 |
| reader | `anchor=45`, `getListScrollTop[0] = 45`, frozen row aligned, accent paint — after a hide, a reorder and a show |
| dismissal | Escape: panel gone, `last=escape`, focus back on the trigger. Outside: panel gone, `last=outside`, focus `none` |

### 10.3 Mutation proofs

Each mutation was applied, built, run with `--only column-config`, and reverted:

| # | Mutation | Measured failure |
| - | -------- | ---------------- |
| M1 | body cells map over the full order instead of `visibleIds` | `the hidden column has no body cell` |
| M2 | header cells map over the full order | `the hidden column has no header` |
| M3 | header offsets use the declaration order | `the next column closes the hidden column's gap` |
| M4 | `visibleIds` ignores `hidden` | `hiding status leaves three visible columns` |
| M5 | pan end derives from `initialConfig` | `the pan reaches the visible maximum (x=-200)` |
| M6 | `onMouseDownOutside` removed | `the outside press closed the panel` |
| M7 | `moveBy` never moves up (`index + max(0, delta)`) | `the moved column takes the slot after status` |

Reverse proof (consumer wiring): the show control's `onClick` removed →
`hiding status leaves three visible columns` fails (one control drives both hide
and show, so the first use is the first failure).

### 10.4 Limits recorded

- Every column is painted; column windowing stays `grid-wide-table` (`185`).
- No drag reordering, no persisted settings, no auto-fit; the frozen `ID` column
  is not configurable by design.
- The panel is probe chrome: the data-grid package owns the shipped
  configuration UI and its menu semantics.
- The live suite cannot assert colour or the a11y dump; the accent paint and the
  `Group`/`Button`/`value` checks are headless-only (`197`).
- A model-derived readout expectation is not a model test (see M7 in §10.1).

## 11. Acceptance

- `column-config-model.ts` + its test, `column-config.tsx`, the registry entry,
  the capability literal, the live twin, and the docs/inventory/plan-index
  updates.
- Headless `86/86`, live `37/37`, exit `0`; `nub run check`, `nub run lint`,
  `nub run test` all exit `0`.
- `COMPONENTS.md` has the `column-config` capability row and the measured
  **Column configuration** contract; `TODO.md` ticks this task with the counts.
- Every mutation in §8.2 was run and produced the named failure (§10).
- No component package changed. Any defect found is a measured `TODO.md` task
  with its own plan number, not an edit from this workstream.

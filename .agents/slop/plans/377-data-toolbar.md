# 377 — Tier 3 feasibility: a data toolbar and statistic cards

**Status:** planned 2026-10-18 · **Phase:** D · **Workstream:** playground
(`apps/playground`, `packages/testing`)

**Depends on:** `100`, `110`, `120`, `140`, `152`, `158`, `166`, `185`, `188`,
`338`, `349`, `350`.

> Numbering: `375` belongs to the components workstream (the date picker) and
> `376` to the playground's multi-pane editor; the next playground plan takes
> `378`.

## 1. Why this plan exists

Two Tier 3 rows are still `GPUix support: ?` with no runtime evidence:

| Row | Current note |
| --- | ------------ |
| Data toolbars | Toolbars + Button groups. |
| Statistic / metric cards | Cards + `<text>`. |

`app-chrome` (`350`) measured a **shell** toolbar: a horizontal scroller whose
clipped action is revealed by `scrollTo`. A **data** toolbar is different: its
controls mutate the row set under it, and the aggregates above it must follow.
Every ingredient is measured — a native `<input>` (`188`), `Pressable` controls
(`350`), `<virtual-list>` anchors and the row-set reset (`166`, `338`),
selection (`152`, `340`), `scrollToItem` (`166`) — but no probe has composed
**toolbar → table → cards**.

The open questions are the toolbar's own:

1. Does a search/filter/sort change narrow and reorder a virtual list, and does
   the component have to reset the list anchor itself?
2. Do the metric cards recompute from the **filtered** set and the selection,
   not from the source rows?
3. Does hiding a column unpaint its header and cells and leave the rest usable?
4. Does a selection survive a scroll, clear on a row-set change, and feed a bulk
   action that removes the selected rows and updates the cards?
5. Are the toolbar and its controls addressable (`Toolbar`, `TextInput`,
   `Button`)?

This plan changes **no package code**.

## 2. What will be proven

Capability: `data-toolbar` (new). Scenario: `data-toolbar`; live twin:
`live-data-toolbar`.

View: an 860 × 540 frame: three 160 × 64 metric cards, a 40 px toolbar, a
28 px table header, a 360 px viewport with a `<virtual-list>` of 60 rows, and a
state readout. Row height 28; columns `name` (400), `status` (200), `owner`
(260). Names are `Item <id>`; statuses cycle `active`, `paused`, `archived`;
owners cycle three names.

| Area | Check |
| ---- | ----- |
| cards | `Total`, `Showing`, `Selected` paint 160 × 64 in one row; `60/60/0` at rest |
| toolbar | the toolbar is 40 px, sits under the cards, and exposes `Toolbar` to AccessKit; `tb-search` is a `TextInput` named `Search` |
| table | the header and the first rows paint; row 0 sits at the viewport top |
| sort | `tb-sort` flips `id` → `status` (paused first); the first paused row paints at the top while row 0 moves down; a second click restores `id` |
| filter | `tb-filter-paused` narrows `showing` to 20 and paints only paused rows; `all` restores 60 |
| search | typing `item 1` narrows to 11 rows, paints row 1 at the top, unpaints row 0, and updates the showing card |
| anchor reset | a filter after a wheel leaves the renderer's anchor at 0 but the `onVisibleRange` readout stale at 30; the component mirrors the reset and paints the filtered first row at the top |
| column visibility | `tb-cols-owner` removes the owner header and every owner cell from the tree; `name` stays; toggling restores them |
| selection | clicking rows 2 and 5 sets `selected=2`, paints their accent background, and updates the selected card; the selection survives a wheel away and back |
| selection reset | a filter or search clears the selection (a hidden selection is a lie) |
| bulk action | `tb-archive` removes rows 2 and 5, sets `archived=2`, `total=58`, `selected=0`, and the removed names stop painting |
| clear | `tb-clear` resets query, filter, sort, columns and selection, and returns the anchor to 0 (archived rows stay archived) |
| live | a real search, filter, sort, column hide, row click and archive; the cards and anchor follow |

The probe does **not** re-measure menus, overlay placement, virtual-list
windowing or the generic wheel; it composes measured primitives and records the
toolbar's own state rules.

## 3. Files

Create:

- `apps/playground/src/scenarios/data-toolbar.tsx` — the view and the
  `data-toolbar` scenario.

Change:

- `apps/playground/src/scenarios/index.ts` — import/register the scenario and
  add `"data-toolbar"` to `PROBE_CAPABILITIES`.
- `packages/testing/src/smoke.ts` — add `"data-toolbar"` to `CAPABILITIES`.
- `apps/playground/src/live/scenarios.tsx` — import the view, add
  `live-data-toolbar` and append it to `liveScenarios`.
- `apps/playground/README.md` — a `## Data toolbars (plan 377)` section and the
  new file under `Structure`.
- `COMPONENTS.md` — the `data-toolbar` capability row and the measured evidence
  on **Data toolbars** and **Statistic / metric cards** (status stays `todo`).
- `TODO.md` — tick the new playground task with the measured counts.
- `PLAN.md` — a decision row.
- `.agents/slop/plans/README.md` — add the `377` row; the next playground plan
  takes `378`.

Do **not** change any package, `apps/docs`, the shell, `SplitPane` or the smoke
runner.

## 4. The view (`data-toolbar.tsx`)

Constants: `FRAME_WIDTH = 860`, `CARD_HEIGHT = 64`, `CARD_WIDTH = 160`,
`CARD_GAP = 8`, `TOOLBAR_HEIGHT = 40`, `HEADER_HEIGHT = 28`, `ROW_HEIGHT = 28`,
`VIEWPORT_HEIGHT = 360`, `ROW_COUNT = 60`, `NAME_WIDTH = 400`,
`STATUS_WIDTH = 200`, `OWNER_WIDTH = 260`.

Model (in the file): `Row = { id, name, status, owner }`;
`STATUSES = ["active", "paused", "archived"]`, `OWNERS = ["Ada", "Grace", "Linus"]`;
row `id` cycles the status and owner arrays. Derived with **Effect `Arr`/`Order`**,
not native helpers:

- `matching(rows, query, filter)` keeps a row when the filter is `all` or the
  status matches, and the lower-cased name includes the lower-cased query;
- `ordered(rows, sort)` sorts by `Order.Number` on `id` or by a reversed
  `Order.String` on `status` (paused before active before archived).

State: `rows` (initial 60), `query`, `filter` (`all|active|paused`), `sort`
(`id|status`), `ownerColumn`/`statusColumn` (booleans, initial true),
`selected: ReadonlyArray<number>`, `archived`, and the list ref.

One `changeView` helper applies a row-set change: set the state, clear
`selected`, and call `renderer.scrollToItem(list, 0)` — the measured toolbar
rule (`338`). `tb-clear` resets to the initial view (rows keep the archive).

Layout:

1. **Cards** `tb-cards`: row, 8 px gap. Three cards `tb-card-total`,
   `tb-card-showing`, `tb-card-selected`, each 160 × 64 with a muted label and a
   `tb-card-*-value` text: the source count, the filtered count and the
   selection count.
2. **Toolbar** `tb-toolbar`, `role="toolbar"`, `aria-label="Data toolbar"`,
   40 px, row, 8 px gap, muted background:
   - `tb-search` — controlled `<input>` with `aria-label="Search"`, 200 px,
     `onChange` → `changeView(setQuery(value))`;
   - `tb-filter-all`, `tb-filter-active`, `tb-filter-paused` — `Pressable`
     (active one paints accent);
   - `tb-sort` — `Pressable`, label `sort: <sort>`;
   - `tb-cols-status`, `tb-cols-owner` — `Pressable` toggles;
   - `tb-clear` — `Pressable`;
   - `tb-selection` — a readout `selected=<n>`;
   - `tb-archive` — `Pressable` with `onClick` guarded on a non-empty selection:
     remove the selected ids from `rows`, add their count to `archived`, clear
     the selection.
3. **Header** `tb-header` (28 px, row): `tb-head-name`, `tb-head-status`,
   `tb-head-owner`, each with its width and the theme border.
4. **Viewport** `tb-viewport` (860 × 360) wrapping
   `<virtual-list testId="tb-list" ref={list} estimatedItemHeight={28}
   onVisibleRange={readAnchor}>` with 60 rows of 28 px:
   - each row `tb-row-${id}` is a row flex, `onClick` toggles the id in
     `selected`, `role="row"`, `aria-selected` from the selection, background
     `accent` when selected;
   - cells `tb-row-${id}-name`, `-status`, `-owner` with their widths; the
     `status`/`owner` cells render only when their column is on.
   `readAnchor` writes `getListScrollTop`'s index into a readout so a check can
   name the anchor even though the payload lags (`300`).
5. **Readout** `tb-state`: `total=<rows> showing=<filtered> selected=<n>
   sort=<id|status> filter=<all|active|paused>
   cols=<status,owner|status|owner|none> archived=<n> anchor=<index>`.

Selection order: clicking a row toggles it; the selected rows keep their
background after a scroll; a row-set change clears the selection. Archived rows
are gone from the model, so `clear` does not bring them back.

## 5. Steps for the executor

1. Read this plan, then `data-grid.tsx` (the filter/sort reset), `virtual-table.tsx`
   (row selection), `app-chrome.tsx` (toolbar geometry), `table.tsx` (sort and
   selection) and the readout helpers in `probes.ts`.
2. Write `data-toolbar.tsx`; register it and add the capability literal. Run:

   ```sh
   nub run --filter playground check-types
   nub run --filter playground test
   ```

   Expected: both exit `0`; `scenarioProblems` reports nothing.
3. Build and run only the new scenario:

   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js --only data-toolbar
   ```

   Expected: `1/1 scenarios passed`, exit `0`, `data-toolbar=verified`. A miss
   reports the readout, the anchor or the bounds — fix the state rule, never
   widen a tolerance past 2 px.
4. Run the full headless suite:

   ```sh
   nub apps/playground/dist/smoke/run.js
   ```

   Expected: `83/83 scenarios passed`, exit `0`; record the check total.
5. Add `live-data-toolbar` (`view: dataToolbarScenario.view`,
   `ready: "tb-state"`) with `settle` after every input and `waitForText` after
   state changes. Run:

   ```sh
   nub run --filter playground smoke:live
   ```

   Expected: `34/34 scenarios passed`, exit `0`, one screenshot; record the
   check total. A live step may not assert style or the a11y dump (plan `197`).
6. Run the gates:

   ```sh
   nub run check
   nub run lint
   nub run test
   ```

   Expected: all exit `0` (run `nub run fmt:fix` if the formatter complains).
7. Update `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md`, `PLAN.md`
   and the plan index with the measured counts and any surprise. Commit the
   plan first, then the probe.

## 6. Test plan

### 6.1 The scenario

| # | Mutation | Must fail with |
| - | -------- | -------------- |
| M1 | the showing card counts the source rows, not the filtered set | "the showing card follows the search" |
| M2 | `changeView` does not mirror the row-set reset into the readout | "the reset reaches the readout" (it stays 30) |
| M3 | the sort click does not change the order | "status sort moves a paused row to the top" |
| M4 | the status filter is ignored | "the paused filter narrows the rows" |
| M5 | the owner column toggle leaves the cells mounted | "hiding a column unpaints its cells" |
| M6 | archive does not remove the selected rows | "archive removes the selected rows" |
| M7 | a row-set change keeps the old selection | "a filter clears a stale selection" |

Reverse proof (consumer wiring): a row click does not toggle the selection →
"a row click selects" fails.

Run each mutation with `--only data-toolbar`, record the exact failure, revert.

### 6.2 Two-direction checks by hand

- Full headless `83/83`, live `34/34`, both exit `0`.
- `nub run check`, `nub run lint`, `nub run test` exit `0`.

## 7. STOP conditions

- **A row-set change leaves the readout stale even though the runtime resets
  the anchor.** Record both reads; the component must mirror the reset. If the
  runtime does not reset at all, `scrollToItem(0)` is the route; amend §4 and
  the mutation proof.
- **`onVisibleRange` never fires after a filter** so the readout cannot name the
  anchor. Read `getListScrollTop` from a ref in the click/key handler instead,
  and amend §4.
- **A hidden column still paints** (an element dropped from the tree keeps a
  stale paint). Record the measured tree and paint; that is the finding.
- **A click on a row inside the virtual list toggles twice** (the row and a
  cell both handle it). Keep the handler on the row only; record it.
- **The cards do not repaint from derived state** without a remount. Record it
  and give the card row the smallest state it needs.
- **A check needs a tolerance above 2 px** or a screenshot. Stop; that is a
  mechanism question.
- **A file outside §3 must change.** Stop and write the task in `TODO.md`.
- The suites are not `83/83` headless and `34/34` live, exit `0`. Stop and
  report the failing scenario.

## 8. Measured results

Run on this host, 2026-10-18, against the locally built `darwin-x64` 0.10.0
binding (ADR 0003).

| Scenario | Checks | Result |
| -------- | ------ | ------ |
| `data-toolbar` (headless) | 61 | pass — suite `82 → 83`, `2500 → 2561`, exit `0`, `data-toolbar=verified` |
| `live-data-toolbar` | 24 | pass — live `33 → 34`, `586 → 610`, exit `0`, one screenshot |

### 8.1 Facts that changed the plan

- **The renderer resets its own anchor on a filtered re-render, but the
  `onVisibleRange` readout does not learn about it.** The first mutation of the
  anchor rule removed `scrollToItem(0)`; the renderer still read `0` while the
  readout stayed `30`. So the runtime's filter path is safe, and the
  component's obligation is to **mirror** the reset into app state. The probe
  keeps `scrollToItem(0)` for determinism and asserts the readout. This
  qualifies plan `338`'s "must reset" rule: the virtual list does it when the
  row set shrinks, but an app-owned anchor is still stale until re-read.
- **A status reorder can move the previous first row out of the painted
  window.** With paused-first order, `row 0` (active) is the 21st row, so the
  check is its absence, not a larger `y`; asserting a painted `y` would have
  been a coincidence of the viewport height.
- **The selection paint is the exact token value.** A selected row's
  `paintedStyle.backgroundColor` equals `palettes.dark.colors.accent` (the
  smoke runner's theme), so the paint is asserted by role, not by a screenshot.
- **`"space"` types a space through `simulateKeystrokes`.** `"i t e m space 1"`
  produced the query `item 1` and the expected 11 rows.

### 8.2 The measured contract

| Fact | Value |
| ---- | ----- |
| cards | three 160 × 64 cards; `60/60/0` at rest; showing follows the filter (`20`) and search (`11`); selected follows the selection and returns to 0 |
| toolbar | 40 px, under the cards; `Toolbar:Data toolbar`; search is `TextInput:Search` |
| sort | `id` → `status` (paused first) puts row 1 at the viewport top and unpaints row 0; a second click restores row 0 at the top |
| filter | paused narrows 60 → 20 and paints only paused rows; active/archived rows are absent |
| search | `item 1` narrows to 11 and paints row 1 at the top |
| anchor | the wheel reaches row 30; a filter returns the renderer to 0; the readout reports 0 only when the component mirrors it |
| columns | hiding owner removes its header and every owner cell; name stays; toggling restores |
| selection | rows 2 and 5 give `selected=2`, the card 2, and the accent background; the pair survives a scroll away and back |
| reset | a filter clears the selection to 0 |
| archive | removes rows 2 and 5: `total=58`, `showing=58`, `archived=2`, `selected=0`; `Item 6` still paints |
| clear | resets query/filter/sort/columns/selection and the anchor, but keeps the archive (`archived=2`) |

### 8.3 Mutation proofs

Each mutation was applied, built, run with `--only data-toolbar`, and reverted:

| # | Mutation | Measured failure |
| - | -------- | ---------------- |
| M1 | the showing card counts `rows` | `the showing card follows the filter` |
| M2 | `changeView` does not mirror the reset | `the reset reaches the readout: expected "0", got "30"` |
| M3 | `ordered` ignores the sort | `status sort moves a paused row to the top` |
| M4 | the status filter is ignored | `the paused filter narrows the rows` |
| M5 | the owner toggle is a no-op | `the owner column leaves the state` |
| M6 | archive keeps the rows | `archive removes the selected rows` |
| M7 | a row-set change keeps the selection | `a filter clears the selection` |

Reverse proof (consumer wiring): the row's `onClick` removed →
`two rows are selected` fails.

### 8.4 Limits recorded

- The toolbar fits its width; overflow is `app-chrome`'s measured scroller +
  reveal, not repeated here.
- Columns are declared widths, not resizable; resize is `data-grid-columns`
  (`349`).
- The view has no menu or popover: filters and column toggles are segmented
  controls, so the probe does not duplicate the overlay contracts.
- The cards are `div` + `<text>` compositions (the row's own definition); the
  shipped `Card` is exercised by `tier2-foundation`.
- No persisted view state: a workspace restore is plans `167`/`339`.


## 9. Acceptance

- `data-toolbar.tsx`, the registry entry, the capability literal, the live twin,
  the README section, the inventory rows and the plan-index row.
- Headless `83/83`, live `34/34`, exit `0`; all three gates exit `0`.
- Seven mutation proofs and one reverse proof recorded in §8.
- No package changed; any defect is a `TODO.md` task with its own plan number.

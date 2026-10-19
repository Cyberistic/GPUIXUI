# 606 — `live-data-grid`: the virtualized, panned data grid in a real window

**Owner:** playground workstream (`apps/playground`).
**Depends on:** `185` (`grid-wide-table`), `189` (the live runner), `190`/`197`
(the renderer the live host owns), `300` (`getListScrollTop` as the anchor
source), `338` (`data-grid-virtual`), `349` (`data-grid-columns`), `556`
(`live-grid`), `559` (`live-tree`), `601` (`live-scroll-into-view`).
**Phase:** F — the last Tier 3 composition with no live twin.

## 1. Why

`data-grid-virtual` (plan `338`) measured the hardest data-grid composition on
0.10.0: one plain horizontal scroller holding a header strip and a **wide**
`<virtual-list>`, with the frozen column placed from
`renderer.getListScrollTop` read inside `onVisibleRange`, an anchor reset on
every sort/filter, and a panned cell that still hit-tests. It is the acceptance
evidence for the future `packages/data-grid`, and the `data-grid` capability
row in `COMPONENTS.md` cites it.

Every fact in that probe is currently `TestRenderer`-only. Two live twins use
nearby views but neither covers this one:

- `live-grid` (plan `556`) drives `grid-wide-table` (plain rows, column
  windowing) — not a `<virtual-list>` body and not the frozen-column-from-anchor
  rule.
- `live-data-grid-columns` (plan `349`) reuses this view but asserts only the
  resize contract (header drag, pan alignment at `-200`, anchor survives). It
  does not assert a vertical wheel virtualizing the rows, the `deltaX`-over-body
  swallow, a panned cell taking native focus, or a filter/sort resetting a deep
  anchor.

So the composition the library is meant to copy has never run in a window.
This plan adds one twin that reuses `dataGridScenario.view` and asserts the
four measured rules with independent literals.

What it cannot prove: colour, `aria-selected` and `role="gridcell"` (the live
renderer has no style or a11y method — plan `197`), and `position: "sticky"`
(the live scroller moves every child's reported box — plans `556`, `594`).

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/live/scenarios.tsx` | import `dataGridScenario`; add `liveDataGrid` beside `dataGridColumns` (§3); add it to `liveScenarios` **after** `dataGridColumns` so the columns twin keeps its registry position. |
| `apps/playground/README.md` | add the `live-data-grid` row to the live table; the registry count is derived again. |
| `COMPONENTS.md` | the `data-grid` capability row cites `live-data-grid`; the long-form paragraph names the live twin and the one limit. |
| `PLAN.md` | one decision row (D86) with the measured result. |
| `TODO.md` | add the task and tick it with the measured check count and the exact focused ids. |
| `.agents/slop/plans/README.md` | index row `606`; the playground narrative records the number. |

No `packages/testing` change: every verb the twin needs (`bounds`,
`scrollOffset`, `listScrollTop`, `wheel`, `click`, `key`, `text`, `paintedText`,
`focused`, `screenshot`) already exists on `AsyncSmokeHost`.

## 3. The scenario

Mount `dataGridScenario.view`, `ready: "dg-grid"`. Use the existing helpers
(`settle`, `boxOf`, `textOf`, `focusedOf`, `waitForText`, `expectPainted`).
Model constants are restated as literals in the assertions, never imported from
the view, so a changed layout constant fails the twin.

1. **Mount and geometry.** `dg-grid` paints `328` tall; the pan starts at the
   frozen column's right edge and is `500` wide; `dg-frozen-row-0` and
   `dg-row-0` share a `y` (`± 1`); the body row is `28` tall and row 1 starts
   `28` below row 0.
2. **A vertical wheel virtualizes, not pans.** Wheel `dg-pan` by `(0, -280)`,
   settle, wait for `dg-state` to stop reading `anchor=0`. Assert: the anchor
   is `> 0`; `dg-row-0` is unpainted; `dg-headrow`'s `y` is unchanged; the pan
   offset is still `0` (`± 1`); the frozen row for the first readout id aligns
   with its body row.
3. **A header `deltaX` wheel pans both layers.** Click `dg-pan-home`, settle;
   wheel `dg-head-2` by `(-90, 0)`, settle, wait for `x=-90` in the readout.
   Assert: `scrollOffset("dg-pan").x ≈ -90` (`± 8`); `dg-head-3` and
   `dg-cell-<first>-3` share an `x` (`± 1`); `dg-frozen-head`'s `x` did not
   move.
4. **The far edge.** Click `dg-pan-end`, settle, wait for `x=-400`.
   Assert: the offset is `-400 ± 2` (`900 − 500`); `dg-head-8` and `dg-cell-<first>-8`
   share an `x` (`± 1`).
5. **A panned virtual cell is a hit target.** Click
   `dg-cell-<first>-9` (fully inside the `500` px window at `-400`), settle,
   wait for `sel=<first>`. Assert: the readout names that row; native focus is
   that cell; the pan did not move.
6. **A vertical wheel keeps the pan.** Wheel `dg-pan` by `(0, -280)`, settle,
   wait for the anchor to change. Assert: the frozen row for the new first id
   aligns with its body row; the pan is still `-400` (`± 1`).
7. **A body-cell `deltaX` wheel.** Record the pan, wheel the first body cell
   by `(90, 0)`, settle. **Measured live:** the pan moves by `+90` (`-400 →
   -310`), while the offscreen `TestRenderer` swallows the identical verb
   (plan `338`). Assert the measured live move (`+90 ± 8`) and record the
   harness difference: a reader can pan over the body in a window, and the
   headless suite must use the affordance. Do not remove the affordance.
8. **An app-owned jump and the runtime anchor agree.** Click `dg-jump`, settle,
   wait for `anchor=45`. Assert: the readout first id is `45`; `listScrollTop`
   reports index `45`; the frozen row for `45` aligns with `dg-row-45`.
9. **A filter from a deep anchor resets to the top.** Click `dg-filter` (the
   live click focuses the editor), settle, `key("0")`, `key("1")`, settle,
   wait for `count=11`. Assert: `anchor=0`; the first id is `1`;
   `dg-row-18` is painted; `paintedText()` contains `Item 01`; the last row's
   text (`Item 059`) is absent; the frozen row for the first id aligns.
10. **Clearing restores.** Click `dg-clear`, settle, wait for `count=60`;
    assert `anchor=0`.
11. **A sort from a deep anchor resets and flips.** Click `dg-jump`, settle,
    click `dg-sort`, settle, wait for `sort=desc`. Assert: `anchor=0`; the
    first id is `59`; `dg-row-59` paints `Item 059`; click `dg-sort` again and
    assert the first id is `0` and `dg-row-0` paints `Item 000`.
12. Screenshot to `${LIVE_ARTIFACTS}/${liveDataGrid.id}.png`.

Expected: **~80 checks** (`boxOf` records a painted check per lookup, as every
live twin does). Measured: **83**.

## 4. STOP conditions

- **STOP** if the view does not mount (`ready: "dg-grid"` never paints).
- **STOP** if a vertical wheel over `dg-pan` does not reach the `<virtual-list>`
  in the window (the anchor stays `0` and `dg-row-0` stays painted). Record the
  wheel target and the offset: the live wheel route may need the body cell or
  the list wrapper, and that is a plan change, not a tolerance.
- **STOP** if `dg-cell-<first>-9` at `-400` has no painted bounds or the click
  targets a clipped centre (the protocol uses the unclipped centre — plan
  `349`). Choose a fully visible column, do not pan by guesswork.
- **STOP** if `listScrollTop` reports a different index than the readout's
  `anchor=45`: that is the payload-vs-renderer disagreement plan `338` warns
  about, and the frozen column would be wrong.
- **STOP** if a filter or sort does not reset a deep anchor: the grid shows
  unrelated rows, which is the defect the reset exists to prevent.
- **NOT A STOP — record instead:** whether the body-cell `deltaX` wheel pans
  or is swallowed. The two harnesses differ here (§3 step 7); whichever the
  window does is the live fact, asserted with its measured delta and recorded
  against plan `338`'s headless claim.

## 5. Test plan and two directions

Run, in this order:

```
nub run --filter playground build
nub apps/playground/dist/smoke/run.js --only data-grid-virtual
nub apps/playground/dist/live/run.js --only live-data-grid
```

The headless control must stay green at its current check count (the view is
unchanged). The live twin must be green twice in a row.

Mutation proofs (apply, run `--only live-data-grid` expecting exit `1`, revert):

- **M1 — the anchor reset:** remove the `useEffect` that calls
  `scrollToItem(list, 0)` in `data-grid.tsx`. The filter/sort checks must fail
  on `anchor=45` (not `0`).
- **M2 — the frozen column's source:** replace the `getListScrollTop` read in
  `syncAnchor` with a no-op (keep the payload-driven state). The frozen-row
  alignment after a wheel must fail.
- **M3 — the pan route:** remove `overflowX: "scroll"` from `dg-pan`. The
  `-90` and `-400` pan checks must fail.
- **M4 — a geometry literal:** change `ROW_HEIGHT` from `28` to `30`. On the
  first attempt this **passed** (both layers move together). The twin now
  asserts the body row's height and the row pitch, so it fails
  `expected 28 ± 1, got 30`; keep those two checks.

Record which checks failed for each mutation. A mutation that passes is a null
result and must be reported as such.

## 6. Measured record

- Live run: `--only live-data-grid`, exit `0`, **83 checks**, two consecutive
  green runs (8.4 s and 8.4 s after the hover rule; 15.1 s and 23.6 s on the
  first pair while the waits settled).
- Headless control: `--only data-grid-virtual`, exit `0`, **59 checks**,
  unchanged (the view is untouched).
- Registry: live `85 → 86`; headless unchanged at `103`.
- Mutation proofs, observed and reverted:
  - **M1** — the sort/filter reset removed: `the live filter resets the anchor`
    failed `expected 0, got 45`.
  - **M2** — the frozen source read shifted by one (`value[0] + 1`):
    `the frozen row for live row 11 aligns with its body row` failed
    `expected 130 ± 1, got 103`.
  - **M3** — `overflowX: "scroll"` removed from `dg-pan`: `dg-pan reports an
    offset` failed `expected a value, got none`.
  - **M4** — `ROW_HEIGHT 28 → 30` **passed on the first attempt** (both layers
    moved together, so alignment alone could not see it). The twin gained
    `the live body row keeps its declared height` and `live body rows advance by
    their height`; the mutation now fails `expected 28 ± 1, got 30`. Recorded as
    a strengthened test, not a silent pass.
- Measured rules:
  - a live wheel must be preceded by `hover` + `settle`: the first two runs
    delivered `wheel("dg-pan")` at the previous pointer position and read
    `anchor=0`; every wheel in the twin now moves the pointer first.
  - a `deltaX` wheel over a body **cell** pans the scroller live (`-400 →
    -310`) while `data-grid-virtual` swallows the same verb offscreen. The twin
    asserts the live move; the headless probe keeps its affordance. Harness
    difference, not a component change.
- Limits: colour/a11y stay headless (plan `197`); `sticky` stays headless
  (plan `556`).

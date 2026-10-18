# 556 — The pinned, windowed data grid in a real window

| Field | Value |
| ----- | ----- |
| Workstream | playground |
| Phase | F (native evidence) |
| Depends on | `100`, `110`, `140`, `152`, `173`, `185`, `189`, `190`, `197`, `338`, `529` |
| Owns | `apps/playground/src/live/scenarios.tsx`, `apps/playground/src/scenarios/grid.tsx` (read only), the `grid` row of `COMPONENTS.md`, the playground `TODO.md` row |
| Feeds | the `grid` capability — the Tier 3 pinned-chrome contract stops being headless-only |

## 1. Why this exists

`grid-wide-table` (plan `185`) is the contract a `packages/data-grid` implements:
a header and frozen column derived from one scroll offset, component-windowed
rows **and** columns, and a keyboard move that pans its own window. Every one of
those facts was measured in the offscreen `TestRenderer`. The live suite covers
the *other* grids — `live-data-grid-columns` pans the panned grid and
`live-grid-cell-editing` edits a cell — but no live scenario mounts
`grid-wide-table`, so three claims have never run in a real window:

1. `position: "sticky"` is ignored (a header scrolls with its content);
2. the frozen column and the body stay aligned from one scroll source when a
   **native wheel** moves the body vertically;
3. a column is absent from the live automation tree when it is outside the
   component's window, and a keyboard move reveals it by panning.

The live automation tree is exactly the right instrument: `bounds` returns
`null` for a retained-but-unpainted node (D45), so "not rendered" and "not
painted" are distinguishable without the `TestRenderer`'s element dump.

**Goal:** add `live-grid` (capability `grid`) as the live twin of
`grid-wide-table`, measure the contract in the real 1100×720 window, and make
the `grid` inventory row cite it.

## 2. What is already measured

| Fact | Source |
| ---- | ------ |
| `position: "sticky"` maps to nothing, so a sticky header scrolls | `grid-wide-table`, plan `185` §8 |
| The body is the only scroll source; the header and frozen column derive from it | `grid-wide-table`, D30 |
| Only the visible rows and columns are in the tree | `grid-wide-table` |
| `renderer.scrollTo` and the scroll offset work in a window | `live-panel`, `live-scroll`, `live-table` |
| A live wheel moves a real scroller and reports its delta | `live-scroll` |
| A live click focuses a focusable element; keys reach it | `live-key-routing`, plan `345` |
| A live list has no painted bounds, but its rows/wrapper do | plans `532`, `534` |
| The live `bounds` box is the 0.10.0 content-origin box (6 px inside a padded cell) | plan `529` §6.5 |

## 3. The live scenario

New `GridProbe` live entry in `apps/playground/src/live/scenarios.tsx`:

```ts
const grid: LiveScenario = {
  id: "live-grid",
  title: "Live grid: a pinned header, one scroll source and column windowing",
  capability: "grid",
  view: gridScenario.view,          // the shipped headless probe, unchanged
  ready: "grid-root",
  steps: (ctx) => Effect.gen(function* () { /* §3.1 */ }),
};
```

Insert it after `dataGridColumns` in `liveScenarios` so the grid family runs
together. `settle` (120 ms) follows every mutation; `walkFocus` already settles
between key presses and returns the focused id after each.

### 3.1 Steps, in order

1. **Geometry.**
   `root = boxOf("grid-root")`, `pinned = boxOf("grid-pinned-header")`,
   `header = boxOf("grid-header")`.
   `expectNear(pinned.x, root.x + 6, 1)` and
   `expectNear(header.x, root.x + 150, 1)` — the measured 0.10.0 content-origin
   box and the 150 px pinned column.
2. **Sticky is ignored.** `stickyBefore = boxOf("sticky-header")`;
   `wheel("sticky-scroller", 0, -80)`; `settle`;
   `stickyAfter = boxOf("sticky-header")`;
   `expectNear(stickyAfter.y, stickyBefore.y - 80, 4)`.
3. **One scroll source, vertical.** `wheel("grid-body", 0, -280)`; `settle`;
   `scrollOffset("grid-body").y ≈ -280 ± 8`;
   `boxOf("grid-pinned-row-11").y ≈ boxOf("grid-row-11").y ± 1`;
   `bounds("grid-row-0")` is `null`;
   `boxOf("grid-pinned-header").y ≈ pinned.y ± 1`.
4. **A horizontal wheel over the body is swallowed.** `wheel("grid-body", -360, 0)`;
   `settle`; `scrollOffset("grid-body").x ≈ 0 ± 1`.
5. **The component-owned pan.** `click("grid-pan-four")`; `settle`;
   `waitForText("grid-pan", "x=-360")`; `scrollOffset.x ≈ -360 ± 8`;
   `boxOf("grid-head-5").x ≈ boxOf("grid-cell-11-5").x ± 1`;
   `bounds("grid-cell-11-0")` and `bounds("grid-cell-11-20")` are `null`.
6. **The end.** `click("grid-end")`; `settle`; `waitForText("grid-pan", "x=-1700")`;
   `boxOf("grid-head-20").x ≈ boxOf("grid-cell-11-20").x ± 1`;
   `bounds("grid-cell-11-0")` is `null`.
7. **The bottom.** `click("grid-pan-bottom")`; `settle`;
   `waitForText("grid-pan", "y=-820")`;
   `boxOf("grid-pinned-row-39").y ≈ boxOf("grid-cell-39-20").y ± 1`;
   `bounds("grid-row-0")` is `null`.
8. **Home.** `click("grid-home")`; `settle`;
   `waitForText("grid-pan", "x=0 y=0")`; `bounds("grid-cell-0-0")` is painted;
   `bounds("grid-cell-0-20")` is `null`.
9. **Click selects and focuses.** `click("grid-cell-0-1")`; `settle`;
   `waitForText("grid-selection", "sel=0,1")`; `focusedOf(…) === "grid-cell-0-1"`.
10. **Keyboard reveal.** Six `key("right")` through `walkFocus`; `settle`;
    `textOf("grid-selection") === "sel=0,7"`;
    `focusedOf(…) === "grid-cell-0-7"`;
    `scrollOffset("grid-body").x < 0` (the reveal panned);
    `boxOf("grid-cell-0-7")` is inside the body's right edge (+8 px for the
    content box, per plan `529` §6.5) and `boxOf("grid-head-7")` aligns with it.
11. **Keyboard down keeps the frozen column.** Three `key("down")`;
    `textOf("grid-selection") === "sel=3,7"`;
    `focusedOf(…) === "grid-cell-3-7"`;
    `boxOf("grid-pinned-row-3").y ≈ boxOf("grid-cell-3-7").y ± 1`.
12. **Screenshot** to `LIVE_ARTIFACTS/grid-wide-table.png`.

Do **not** assert colour or `aria-selected` here: the live tree has no `style`
and the live renderer has no a11y method (plan `197`). The headless scenario
keeps the `GridCell`/`aria-selected` checks.

## 4. Files to change

1. `apps/playground/src/live/scenarios.tsx`
   - import `gridScenario` from `../scenarios/grid.js`;
   - add the `grid` live entry (§3);
   - add it to `liveScenarios`.
2. `apps/playground/src/scenarios/grid.tsx` — **comment only**: name the live
   twin in the header and note which facts stay headless (colour, a11y).
3. `COMPONENTS.md`
   - change the measured-evidence row `grid` from `grid-wide-table` to
     `grid-wide-table`, `live-grid`;
   - the narrative paragraph for the grid gains one sentence naming the live
     twin and the one class it cannot read.
4. `apps/playground/README.md` — add `live-grid` to the live-suite sentence.
5. `TODO.md` — add and tick the task under the playground workstream, recording
   the checks and the focused ids run.
6. `.agents/slop/plans/README.md` — index this plan in the `playground` table.
7. `PLAN.md` — `D71` records the measured live facts.

## 5. Commands and expected results

```sh
nub run --filter playground build
# expected: "binding: … is current" and "Done"

nub apps/playground/dist/smoke/run.js --only grid-wide-table
# expected: 1/1 scenarios passed · capabilities: grid=verified  (unchanged)

nub apps/playground/dist/live/run.js --only live-grid
# expected: 1/1, exit 0, ~40 checks, one screenshot
#   apps/playground/.artifacts/live/grid-wide-table.png

nub run --filter playground test
nub run check
nub run lint
```

Run `live-grid` **three times** to check the live suite's known real-timer /
window-commit variance. If a geometry read races the commit, use the existing
bounded `waitForBounds` rather than widening a tolerance.

## 6. STOP conditions

Stop and report (do not loosen a check) if:

- the sticky header does **not** move with its content in the window — then
  0.10.0's live style path differs from the `TestRenderer`'s and the D30
  contract is renderer-specific. Record the observation and leave the live
  check out until the discrepancy is understood;
- a native vertical wheel does **not** move the body by the headless amount —
  record the measured live delta and update the headless claim only if the
  difference is systematic (wheel acceleration), not by adding a wide ±;
- the pinned row and its body row disagree by more than 1 px, or the header and
  its body cell do — that is a real alignment defect in the contract, not a
  tolerance to widen;
- `bounds("grid-cell-…")` is painted for a column the headless suite says is
  windowed away — the live tree retains differently, and the "not rendered"
  claim is false. Record it and drop that check (do not invert it silently);
- the keyboard move does not pan the body, or focus does not follow the
  selection — the reveal contract did not transfer; keep the scenario but
  assert only what the window does and record the gap in `COMPONENTS.md`.

## 7. Test plan

- The new scenario's checks are the test. Every mutation below must fail the
  live run with exit `1`:
  - **M1 — sticky belief.** Change `sticky-header` to
    `position: "absolute"` in `grid.tsx`; the header then stays put and step 2
    fails. Restore.
  - **M2 — reveal.** Make `revealOffset` return the current offset (no reveal);
    step 10's "the reveal panned the body" and the inside-the-viewport check
    fail. Restore.
  - **M3 — frozen column.** Render the pinned rows at `top: row * ROW_HEIGHT`
    without `pan.y`; step 3's pinned/body alignment fails. Restore.
- `scripts/verify-two-directions.sh` cannot be used (jj is not installed, D1);
  record each mutation's `expected`/`got` in §8 instead.
- The headless `grid-wide-table` run is the control: it must stay `1/1`.

## 8. Acceptance

- `live-grid` is `1/1`, exit `0`, three consecutive runs, with a screenshot.
- The live registry grows by one (`56 → 57`); the headless registry is unchanged
  (`101`).
- M1–M3 fail in the documented direction and are restored.
- `grid-wide-table` is still green.
- `COMPONENTS.md`, `TODO.md`, `PLAN.md`, the plan index and the playground
  README are current.
- `nub run --filter playground test`, `nub run check`, `nub run lint` pass.

## 9. Measured result

`nub run --filter playground build`, then four focused live runs:

```
ok  grid  live-grid  ~3.3–4.2 s  Live grid: a pinned header, one scroll source and column windowing
1/1 scenarios passed · capabilities: grid=verified
```

**1/1 each run, exit `0`, 53 checks**, one screenshot
(`apps/playground/.artifacts/live/grid-wide-table.png`). The live registry is
`56 → 57`; the headless registry is unchanged at `101`, and
`grid-wide-table` stayed `1/1` before and after the change.

### Measured facts

| Fact | Live result |
| ---- | ----------- |
| A real wheel moves the body ten rows | `-280` |
| The frozen column follows the body | pinned row 11 and body row 11 align within 1 px |
| A `deltaX` wheel over the body is swallowed | `x = 0` |
| The component pan moves header and body together | four columns at `-360`; last at `-1700`; aligned within 1 px |
| A column outside the window is absent from the live tree | `grid-cell-11-0` / `-20` return no bounds |
| A keyboard reveal pans the body | `x < 0`, cell `0-7` inside the viewport, header aligned |
| The frozen column follows a keyboard move | pinned row 3 aligns with cell `3-7` |

### Two harness facts this measured (new)

1. **A live scroller's reported box moves with its own scroll.** After the
   keyboard reveal the body reported `x = -110` while its unscrolled content
   origin was `150` (`-260` pan). The containment check therefore caches the
   body box **before** the pan; reading it afterwards is the plan `529` §6.5
   trap in a second place.
2. **Every child of a live scroller reports a box that moves with it, whatever
   its `position`.** Replacing `sticky` with `absolute` (and even `fixed` with
   `top: 0, left: 0`) still produced a `-80` delta, so the live harness cannot
   distinguish a working sticky header from an ignored one by bounds. The step
   is therefore labelled **"the live header scrolls with its container"**, and
   the `position: "sticky"` claim remains a headless measurement (`plan 185`
   §8). The plan's first check label ("position sticky is ignored live") would
   have overstated what the window proves.

The first run also corrected the body-origin arithmetic: `pinned.width` keeps
its 6 px padding, so the body starts at `pinned.x + pinned.width - 6` (measured
`150`, not `156`). One stability run raced the focus effect and read
`grid-cell-0-6` while the selection was already `0,7`; the bounded
`waitForFocus` (plan `382`'s rule) replaced the immediate read.

### Mutation proofs (applied, run, restored; exit `1`)

| Lever | Observed failure |
| ----- | ---------------- |
| **M1** remove `overflowY: "scroll"` from `sticky-scroller` | `the live header scrolls with its container (dy=0): expected 326 ± 4, got 406` |
| **M2** `revealOffset` returns `current` (no reveal) | `live focus follows the reveal: expected "grid-cell-0-7", got "grid-cell-0-6"` — the unrendered column cannot take focus, so the windowing and the reveal are one mechanism |
| **M3** render pinned rows at `top: row * ROW_HEIGHT` without `pan.y` | `the live pinned row aligns with the body row: expected 56 ± 1, got 337` |

`position` mutations (`absolute`, `fixed`) are **not** proof levers here for the
reason recorded above; M1 mutates the scroll itself, M2 the reveal and M3 the
frozen column.

**Transferable finding:** the data grid's one-scroll-source contract transfers to
a real window unchanged, including the swallowed `deltaX` wheel and the
component-owned keyboard pan. The live harness's bounds cannot observe
`position` semantics inside a scroller, so the sticky claim must stay with the
`TestRenderer`; a scroller's own box must always be cached before it scrolls.

# 565 — The tab strip in a real window: horizontal pan, clipped tabs and roving focus

**Owner:** playground workstream (`apps/playground`, `packages/testing`).
**Depends on:** `173` (horizontal scroll), `174` (tab-strip focus), `189`
(live window), `190` (live focus), `197` (live observation), `529` (release
binding), `559` (live tree, the most recent live twin).
**Phase:** F — live evidence for a critical workspace mechanism.

## 1. Why

`tab-strip-overflow` (plan `173`) and `tab-strip-focus` (plan `174`) are the
only measurements of the contract every tabbed surface uses — docking,
workspace panes, the multi-pane editor and the shipped `Tabs` all assume it:

- `overflowX: "scroll"` pans on `deltaX`, a vertical wheel leaves it alone, a
  clipped tab keeps painted bounds, `scrollIntoView` reveals it, and the near
  end clamps a few pixels short of zero;
- a naive strip makes every clipped tab a tab stop and focus does **not**
  reveal it, while a roving strip is one stop and End/Home move selection,
  native focus and reveal together.

Both are headless (`TestRenderer`) only. The live suite has since found that
three of these assumptions behave differently in a real window:

- a scroller's own box moves with its scroll, and every child's box is stale
  after an ancestor scroll (plan `556`, D71);
- the live tree has no style and every child box is reported in the scrolled
  frame;
- a `<virtual-list>` has no painted bounds live (plans `532`, `559`).

A plain horizontal scroller has not been measured live at all. This plan adds
the two live twins, with the same views, so the contract is proven where the
library actually runs.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/live/scenarios.tsx` | import both scenarios; add `live-tab-overflow` (`capability: "scroll"`) and `live-tab-focus` (`capability: "focus"`) to `liveScenarios`; a `walkRendererFocus` helper |
| `packages/testing/src/smoke.ts` | `AsyncSmokeHost` gains `focusNext`/`focusPrevious` (the runner owns the renderer, as `focused` already does — D35) |
| `apps/playground/src/live/host.ts` | implement both verbs over `renderer.focusNext()`/`focusPrevious()` |
| `apps/playground/README.md` | two rows in the live table; live registry `61 → 63` |
| `COMPONENTS.md` | cite the live twins on `Scrollable containers` and `Tabbed panels` |
| `TODO.md` | the new task ticked, with the measured counts |
| `.agents/slop/plans/README.md` | index row for this plan |

No production component code changes: the probes are the evidence. If the run
finds a runtime difference, record it in `PLAN.md` §4 as a decision row and in
`COMPONENTS.md` before adapting any check.

## 3. Implementation

Both scenarios reuse the existing views (`tabOverflowScenario.view`,
`tabFocusScenario.view`); no view is duplicated. Put them in
`apps/playground/src/live/scenarios.tsx` beside the other twins, using the
existing helpers `boxOf`, `offsetOf`, `textOf`, `focusedOf`, `settle`,
`waitForFocus` and `awaitedTextOf` where a commit can lag.

`live-tab-overflow` — `ready: "tab-strip"`:

1. the strip paints and reports `{x: 0, y: 0}`;
2. `tab-0` paints inside the strip;
3. `tab-9` is outside the viewport at rest (`null` or a box wholly to the
   right) — the report names which;
4. a real `wheel("tab-strip", -240, 0)` pans `x` to `-240 ± 12` and leaves `y`
   at `0`; the `tab-wheel` readout is no longer `dx=0 dy=0`;
5. a real `wheel("tab-strip", 0, -240)` does not pan the strip;
6. the component reveal (`tab-reveal-last`, which calls the tab's own
   `scrollIntoView`) reduces `x` and puts `tab-9` at the trailing edge. The
   scroller's own reported box **moves with its scroll** (D71), so the viewport
   is the box read at rest; the reveal lands a few pixels past the edge (the
   strip's padding), as offscreen left it 1 px past (plan `173`);
7. clicking the revealed neighbour (`tab-8`) selects it (`active=8`) and gives
   it native focus;
8. the component pan (`tab-pan-end`) reaches `-400 ± 2`;
9. clicking a visible tab then `Home` selects `tab-0`, focuses it and returns
   the offset within one tab of the origin;
10. `End` selects `tab-9`, focuses it and reveals it at the trailing edge.

`live-tab-focus` — `ready: "naive-0"`:

1. clicking `naive-0` focuses it and the strip starts at `x = 0`;
2. one synthetic `tab` key reaches the focused tab and **does not traverse** —
   the automation key verb is not the tab-order path (the modal in plan `190`
   passes only because its own handler calls `focusNextWithin`);
3. the **renderer's own traversal** (`focusNext`, nine steps with a settle)
   reaches `naive-9`, the last clipped tab — the same API the headless suite
   guards, read through the runner's renderer (D35);
4. the naive strip's offset is unchanged after the walk: **focus does not
   reveal a clipped tab**;
5. one more traversal step leaves the strip for `naive-after`;
6. clicking `roving-0` then one traversal step lands on `roving-after`: the
   roving strip is one stop;
7. clicking `roving-3`, then `End`, selects `roving-active=9`, focuses
   `roving-9` and reveals it (`x < -72`); `Home` returns focus to `roving-0`
   and the offset within one tab of the origin.

Every step settles (`settle`) before reading; a live step must never read the
frame before the commit (D34).

## 4. Commands and expected results

```sh
nub run --filter playground build
# exit 0

nub apps/playground/dist/live/run.js --only live-tab-overflow,live-tab-focus
# 2/2 scenarios passed; capabilities: scroll=verified focus=verified; exit 0

nub apps/playground/dist/smoke/run.js --only tab-strip-overflow,tab-strip-focus
# 2/2; exit 0 — the headless twins still guard their contract

nub apps/playground/dist/smoke/run.js
# 101/101, exit 0

nub run check
nub run lint
nub run test
# exit 0; playground tests 417

# merge gate (this branch is prepared for promotion):
nub apps/playground/dist/live/run.js --all
# 63/63, exit 0 — record the checks and duration in TODO.md
```

## 5. Test plan and mutation proofs

The scenarios are the test. Each check must be able to fail; observe and
revert each mutation:

- **M1** — remove `tab?.scrollIntoView?.()` from `select` in
  `tab-overflow.tsx`: `live-tab-overflow`'s `End` check fails (the reveal
  assertion), and the headless `tab-strip-focus` fails too. This proves the
  live check guards the reveal, not only the selection.
- **M2** — change the roving strip's `tabIndexFor` in `tab-focus.tsx` from
  `index === rovingActive ? 0 : -1` to `() => 0`: `live-tab-focus`'s "one
  traversal step leaves the roving strip" check fails.
- **M3** — remove the `focusElement` call from `select` in `tab-overflow.tsx`:
  `live-tab-overflow`'s "the click focused the revealed tab" fails.

Record the exact failure text for each. If a mutation does not fail, the check
is not proving anything and must be strengthened before the task is done.

## 6. STOP conditions

- **The horizontal wheel does not pan live.** Record the measured offset in the
  check name, assert exactly what happened, and prove the component pan
  (`scrollTo`) and `scrollIntoView` still work. Do **not** relax the headless
  wheel check; a live difference is a finding for `PLAN.md`.
- **`scrollOffset("tab-strip")` is null live, or the strip's box is absent.**
  Stop and report: the scenario cannot invent geometry.
- **Real `tab` does not traverse in the window.** Measured in the first run:
  the automation key verb reaches the focused element but never advances focus,
  so a naive strip's tab order cannot be observed that way. The plan uses the
  renderer's own `focusNext` (the API the headless suite guards, D35) and
  guards the harness fact with its own check. A click-per-tab substitute is
  still forbidden.
- **A headless scenario regresses.** Stop; a live twin must not change the
  headless contract.
- **A check needs a tolerance wider than the measured one.** Stop and record
  the measurement instead of hiding it behind a loose bound.

## 7. Acceptance

- `live-tab-overflow` and `live-tab-focus` are in the registry and run green
  with `--only`.
- The live suite is `63/63` on the final HEAD at the merge gate, exit `0`.
- Headless stays `101/101`, and `check`, `lint`, `test` pass.
- Three mutation proofs, each observed and reverted, with the failure text
  recorded in this plan's §8.
- `README.md`, `COMPONENTS.md`, `TODO.md` and the plan index record the new
  ids and the measured result; a new runtime difference, if any, is a `PLAN.md`
  decision row.

## 8. Result (measured 2026-10-19)

| Command | Result |
| ------- | ------ |
| `nub run --filter playground build` | exit `0` |
| `nub apps/playground/dist/live/run.js --only live-tab-overflow,live-tab-focus` | **2/2**, exit `0`; 35 + 18 = **53 checks**; both screenshots written |
| `nub apps/playground/dist/smoke/run.js --only tab-strip-overflow,tab-strip-focus` | 2/2, exit `0` — the headless contract is unchanged |
| `nub run --filter playground check-types` / `nub run check` / `lint` / `test` | exit `0` |

Measured in the window:

- a real `deltaX -240` wheel pans the strip to `x = -240`; a `deltaY -240`
  wheel leaves both axes alone;
- the clipped `tab-9` keeps painted bounds at rest (outside the viewport);
- the component `scrollIntoView` pans to `-380` and lands `tab-9` at **304**
  against a **300** trailing edge — 4 px past, the strip's padding (offscreen
  it lands 1 px past);
- the scroller's **own** box moves with its scroll (`0 → -380`), so the
  comparison uses the box read at rest (D71);
- the exact `renderer.scrollTo(id, -400, 0)` reaches `-400`;
- `Home`/`End` move selection, native focus and the reveal together.

**The harness finding:** one synthetic `tab` key reached the focused tab and
moved focus nowhere; nine presses left it on `naive-0`. The automation key verb
does not traverse, so the live tab-order evidence uses
`renderer.focusNext()` — added to `AsyncSmokeHost` as
`focusNext`/`focusPrevious` (D35's renderer-is-the-observation-surface rule).
That traversal reaches `naive-9` with the strip's offset unchanged (focus does
not reveal a clipped tab), the next step leaves the strip, and one step leaves
the roving strip. A component that wants native Tab to visit clipped children
must own the traversal.

Three mutation proofs, each observed and reverted:

- **M1** — removed `tab?.scrollIntoView?.()` from `select` in
  `tab-overflow.tsx` → `live-tab-overflow` fails with
  `Home returns to the start region (x=-400): expected true, got false`,
  exit `1`.
- **M2** — changed the roving strip's `tabIndexFor` to `() => 0` →
  `live-tab-focus` fails with
  `one traversal step leaves the roving strip: expected "roving-after", got "roving-1"`,
  exit `1`.
- **M3** — changed `overflowX: "scroll"` to `"hidden"` →
  `live-tab-overflow` fails at
  `tab-strip reports an offset: expected a value, got none`, exit `1`.

Focused ids run: `live-tab-overflow`, `live-tab-focus`,
`tab-strip-overflow`, `tab-strip-focus`.

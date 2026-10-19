# 594 — The panel and floating-layer primitives in a real window

**Owner:** playground workstream (`apps/playground`).
**Depends on:** `175` (`panel-nested`), `156` (`floating-placement`), `189` (the
live runner), `190` (live focus), `197` (the live observation surface), `529`
(the 0.10.0 bounds box), `536` (the live pointer gesture), `591`–`593` (the
previous live twins).
**Phase:** F — the last two layout/overlay primitives with only `TestRenderer`
evidence.

## 1. Why

Two probes still have no real-window twin:

- `panel-nested` (plan `175`) is the only evidence for a **vertical** split,
  **nested split isolation**, a **collapsible sidebar** whose width reaches `0`,
  the divider's **keyboard** resize and the traversal edge. `live-panel` only
  covers one horizontal `SplitPane`.
- `floating-placement` (plan `156`) is the only evidence for the library's one
  positioning engine (`FloatingLayer`): `side`, `sideOffset`, `align`
  `start`/`center`, the **window-edge snap** and the measured
  `align="center"` defect. `live-select`/`live-combobox`/`live-tooltip` drive
  the published popups, but the raw `<anchored>` arithmetic they sit on has
  never run in a window.

Both are named in the playground workstream's mandate ("layout … overlay …
panel primitives exercised in the real runtime"). `live-panel` proves a
horizontal divider; it does not prove a nested workspace, and no live scenario
proves placement geometry. Adding the twins closes both gaps without changing
the probes' views, so the offscreen assertions remain the control.

Live cannot assert `role`/`aria-valuetext` (the window tree has no `style` or
a11y report — plan `197`); those stay in the headless probe. Every geometric
and keyboard claim below **is** live.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/live/scenarios.tsx` | import `panelNestedScenario`, `floatingScenario`; add `livePanelNested` and `liveFloating`; register both in `liveScenarios`. |
| `apps/playground/README.md` | the live-scenario table gains both rows; correct the stale live-registry count to the derived number. |
| `COMPONENTS.md` | the capability table's `panel` row cites `live-panel-nested`, the `floating` row cites `live-floating`; the live-suite paragraph moves `75/75` to "75/75 last full run, 77 registered after this plan" without claiming a new full total. |
| `PLAN.md` | one `D71` row (the next free decision id) with the measured result. |
| `TODO.md` | claim this task, then tick it with the measured check counts and exact focused ids. |
| `.agents/slop/plans/README.md` | index row `594` and the playground narrative line ("the panel and floating twins take `594`"). |

No `packages/testing` change: the live host already has `drag`, `click`, `key`,
`focusNext`, `bounds`, `text` and `focused` (plans `189`, `190`, `536`).

## 3. `live-panel-nested`

Mount `panelNestedScenario.view`, `ready: "panel-state"`.

Use the existing live helpers in `scenarios.tsx`: `settle` (120 ms),
`textOf`, `boxOf`, `waitForText`, `focusedOf`. Never assert a readout
immediately after an input without a `waitForText`; a live commit lands a frame
later.

1. **Defaults.** `panel-state` reads
   `outer=180 inner=300 sidebar=160`; `outer-pane-a` paints height `180 ± 2`
   and `inner-pane-a` width `300 ± 2`.
2. **Vertical drag.** `ctx.host.drag("outer-divider", 0, 48, 6)`; wait for
   `outer=228`. Assert `outer-pane-a` height `228 ± 2`, `inner=300` (the
   vertical drag did not touch the nested split).
3. **Nested drag.** `ctx.host.drag("inner-divider", 60, 0, 6)`; wait for
   `inner=360`. Assert `inner-pane-a` width `360 ± 2`, `outer=228` (the nested
   drag did not touch its parent).
4. **Collapse.** Click `panel-sidebar-toggle`; wait for `sidebar=0`. The
   collapsed div must leave the paint: accept `bounds("panel-sidebar") === null`
   **or** a painted width `≤ 1` (record which the runtime reports). `inner=360`
   survives. Click again; wait for `sidebar=160`; width `160 ± 2`.
5. **Keyboard.** Click `inner-divider`; settle; `focusedOf` is
   `inner-divider`. `key("right")` → wait for `inner=376` and width
   `376 ± 2`; `key("left")` → wait for `inner=360`.
6. **Traversal.** `focusNext()`; settle; `focusedOf` is not `inner-divider`.
7. Screenshot to `${LIVE_ARTIFACTS}/${livePanelNested.id}.png`.

Not asserted live: `role=separator`, `aria-valuetext="360px"` and the AccessKit
node — headless only (plan `197`). Say so in the scenario's header comment.

Expected: **~30 checks**. Record the measured count.

## 4. `live-floating`

Mount `floatingScenario.view`, `ready: "float-window"`.

1. **Window frame.** After the mount settle, `float-window` paints
   `1100 × 720` at the window origin (`± 1`). This is the `useWindowSize()`
   value the probe sizes itself with, so every later coordinate is
   window-relative. If it is not `1100 × 720`, `waitForBounds` for up to 3 s
   (the hook polls at 100 ms) and then assert.
2. **Open / bottom / start.** Click `float-anchor`; wait for
   `open=true side=bottom align=start`. Read the `float-anchor` and
   `float-panel` boxes. The panel's content box is inset `9 px` (1 px border +
   8 px padding, plan `529` §6.3): assert `panel.y ≈ anchor.y + anchor.height +
   6 + 9` and `panel.x ≈ anchor.x + 9`, `± 1`.
3. **Side switch.** Click `float-switch`; wait for `side=right align=start`.
   Assert `panel.x ≈ anchor.x + anchor.width + 6 + 9` and
   `panel.y ≈ anchor.y + 9`, `± 1`.
4. **Centre defect.** Click `float-align`; wait for `align=center`. Assert the
   panel's **bottom** content edge is
   `anchor.y + anchor.height / 2 + 7` (`± 1`) — the measured 0.10.0 rule that
   `align="center"` ends the panel at the anchor's centre line instead of
   centring it. This is the live guard for the defect every popup inherits.
5. **Edge snap.** Click `float-anchor` (close), click `float-edge-anchor`; wait
   for `edge=true`. Assert the panel's content bottom is inside the window
   bottom (`≤ window bottom + 1`), its top is `≥ 8` (the collision padding) and
   its bottom is **below** the edge anchor's top — i.e. 0.10.0 snaps the panel
   above the anchor instead of flipping (the same measured rule as headless).
6. Screenshot to `${LIVE_ARTIFACTS}/${liveFloating.id}.png`.

Expected: **~28 checks**. Record the measured count and every measured offset.

## 5. STOP conditions

- **STOP** if `float-window` does not reach `1100 × 720` after a bounded wait:
  the probe's absolute coordinates would be meaningless. Record the box and the
  hook value.
- **STOP** if a live `float-panel` content box is not inset by the headless
  `9 px`. Record the four boxes; do not widen the tolerance past `± 2`.
- **STOP** if the edge panel does not snap (it is painted outside the window):
  record the panel and window boxes rather than weakening the assertion.
- **STOP** if a nested drag moves its parent, or a vertical drag moves the
  inner split: that is a real component defect in `SplitPane`, not a harness
  tolerance. Record the readout and stop.
- **STOP** if `inner-divider` does not take native focus after a live click, or
  `key("right")` does not resize it. Record `focusedOf` and the readout; do not
  substitute a coordinate click for a component fix.
- **STOP** if a needed host verb is missing; do not add one without a plan.

## 6. Test plan (mutation proofs)

The scenarios **are** the tests. Each mutation is applied alone, run focused in
the real window, observed failing, and reverted:

- **M1 (floating side):** change the probe's first `FloatingLayer` to
  `side="top"` → the bottom/start and side-switch checks fail with the measured
  `y`.
- **M2 (anchored inset):** change the `float-panel` padding `8 → 0` → the
  `+9` content-origin checks fail (`+1`).
- **M3 (edge snap):** change the edge layer's `collisionPadding` from
  `COLLISION` to `-1000` → the "snapped inside the window" check fails (the
  measured panel bottom lands at `1727` against a `720` window). A `side="top"`
  mutation was tried first and **passed**: with a content box the panel bottom
  still lands 1 px past the anchor top, so it cannot discriminate the rule.
- **M4 (nested isolation):** make the inner `SplitPane`'s `onResize` also call
  `setOuter` → `live-panel-nested` fails `outer=228` after the nested drag.
- **M5 (vertical axis):** make the outer `SplitPane` `orientation="horizontal"`
  → the `outer-pane-a` height check fails (and the vertical drag changes a
  width).
- **M6 (keyboard):** remove the divider's `onKeyDown` ArrowRight branch →
  `inner=360` stays after `key("right")`.
- **M7 (collapse):** keep `sidebar` mounted at `160`-wide on toggle → the
  collapsed check fails with the painted `160`.

After reverting, each focused scenario must be green **twice in a row**.

## 7. Verification commands

```sh
nub run --filter playground build
nub apps/playground/dist/live/run.js --list | grep -E 'live-panel-nested|live-floating'
nub apps/playground/dist/live/run.js --only live-panel-nested
nub apps/playground/dist/live/run.js --only live-floating
```

Expected: both listed; each `1/1`, exit `0`, one screenshot.

Headless controls (views untouched):

```sh
nub apps/playground/dist/smoke/run.js --only panel-nested,floating-placement
```

Expected: `2/2`, exit `0`, the same check counts as before (`panel-nested`,
`floating-placement`).

End-of-task gate:

```sh
nub run check
nub run lint
nub run test
nub run --filter playground build
nub apps/playground/dist/smoke/run.js
```

Expected: all green; headless stays **103/103** (`3653` checks, 64
capabilities). The full live suite is the merge gate and is **not** run; the
live registry moves **`81 → 83`** (derived with `--list | wc -l`; the README's
stale `76` is corrected to the measured number without claiming a new
full-suite total — the last full run stays `75/75`).

## 8. Acceptance

- `live-panel-nested` and `live-floating` exist, are listed, and are green
  twice each.
- The measured boxes, offsets, collapse representation (null vs 0) and check
  counts are recorded in §9.
- Seven mutation proofs were observed failing and reverted, plus the recorded
  `side="top"` null result.
- `COMPONENTS.md`, `TODO.md`, `PLAN.md` (D71), the README and this index carry
  the result.
- `check`, `lint`, `test` and the full headless suite are green.

## 9. Measured record (2026-10-19)

**Result:** two green focused runs each (combined `2/2`, exit `0`), plus seven
mutation runs. Live registry **`81 → 83`** (derived). Screenshots:
`.artifacts/live/live-panel-nested.png`, `.artifacts/live/live-floating.png`.

| Measurement | Value |
| ----------- | ----- |
| panel defaults | `outer=180 inner=300 sidebar=160`; `outer-pane-a` height **180**, `inner-pane-a` width **300** |
| vertical drag | `+48` → `outer=228`, painted height **228**; `inner=300` unchanged |
| nested drag | `+60` → `inner=360`, painted width **360**; `outer=228` unchanged |
| collapsed sidebar | `sidebar=0`; the runtime reports **painted width `0`** (not `null`) |
| keyboard | click focuses `inner-divider`; Right → `inner=376` (width 376), Left → `360`; `focusNext` → `panel-sidebar-toggle` |
| floating frame | `float-window` **1100 × 720** after the bounded wait |
| bottom/start | anchor `(200, 120, 120 × 40)` → panel content `(209, 175)`; y = `120 + 40 + 6 + 9` |
| right/start | panel content `(335, 129)`; x = `200 + 120 + 6 + 9` |
| centre defect | panel content bottom = `120 + 20 + 7 = 147` — it ends at the anchor's centre line |
| edge snap | panel content `641..719` in the `720`-high window; top ≥ `8`; bottom `719 > anchor top 650` (snapped above, not flipped) |
| live checks | `live-panel-nested` **30**, `live-floating` **17** |
| focused runs | two green combined runs after the reverts |
| mutation proofs | M1 bottom `43`, M2 `167`, M3 bottom `1727`, M4 `outer=360`, M5 height `320`, M6 `inner=360`, M7 width `160` |

**Mutation proofs, each observed and reverted:**

| # | Mutation | Observed |
| - | -------- | -------- |
| M1 | floating default `side` `bottom → top` | "side=bottom sits one gap below the live anchor": expected `175 ± 1`, got `43` |
| M2 | `float-panel` padding `8 → 0` | same check expected `175 ± 1`, got `167` |
| M3 | edge `collisionPadding` `8 → -1000` | "the live layer snapped inside the window": panel bottom `1727`, window bottom `720` |
| M4 | inner `onResize` also sets `outer` | "the live nested drag left its parent alone": got `outer=360 inner=360 sidebar=160` |
| M5 | outer `orientation="vertical" → "horizontal"` | "the top live pane paints its initial height": expected `180 ± 2`, got `320` |
| M6 | `SplitPane` ignores ArrowRight | "ArrowRight grows the focused live divider's pane": got `inner=360` |
| M7 | sidebar toggle holds `SIDEBAR_OPEN` | "the collapsed live sidebar leaves the paint [width 160]": expected `true`, got `false` |

**Null result:** M3 was first attempted as the edge layer's `side="bottom" →
"top"`; it **passed**, because the content-box bottom still lands 1 px past the
anchor top. The collision-padding mutation is the one that reaches the rule.

**Not claimed:** the divider's `role`/`aria-valuetext` and the AccessKit node
(headless only, plan `197`), and a new full live-suite total — the last full run
remains `75/75`; the registry is now `83`.

# 194 — Detachable tabs as in-window floating panels

| Field | Value |
| ----- | ----- |
| Status | planned |
| Phase | B → D (Tier 4 feasibility) |
| Owner | playground workstream |
| Depends on | `100`, `110`, `120`, `140`, `162`, `164`, `172`, `177`, `184` |
| Feeds | the new `float` capability; `COMPONENTS.md` **Detachable / movable tabs**; the `docking` package |

## 1. Goal

`COMPONENTS.md` records **Detachable / movable tabs** as `todo` with GPUix
support `?`, and `drag-autoscroll` (plan `172`) established only the negative
half: 0.10.0 exposes **one** application window (`render` + `WindowOptions`,
no `openWindow`), so a detached tab cannot become an OS window.

The unmeasured question is the honest alternative: **can a torn-off tab become
an in-window floating panel?** A real answer needs six facts, none of which any
existing probe has produced:

1. a captured tab drag can be released **outside** its dock surface and the app
   can tear the tab out (the gesture keeps delivering moves and the up);
2. an **absolutely positioned** panel inside a `position: "relative"` app root
   paints at the pointer, exactly;
3. it paints **above** the dock in that overlap (child order is 0.10.0's only
   stacking model) and takes the click there;
4. its own title bar can be dragged, and a component-owned **clamp** keeps it
   inside the app surface;
5. it owns native focus and can close on Escape, returning focus to the dock;
6. the tab can be **docked back**, and a float with no tabs is pruned;
7. the float is part of the app-owned **restore** payload (JSON boundary).

This plan adds the pure model, the scenario `float-tab`, the `float`
capability, and records the measured facts in `PLAN.md`, `COMPONENTS.md` and
this plan.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `apps/playground/src/panels/dock.ts` | `export` the existing `DockTabSchema` (one word) so the float codec reuses it |
| `apps/playground/src/panels/float.ts` | **new** — pure float model: `FloatWindow`, `tearOff`, `clampFloat`, `dockFloat`, `encodeWorkspace`, `decodeWorkspace` |
| `apps/playground/src/panels/float.test.ts` | **new** — the four pure rules and the codec |
| `apps/playground/src/scenarios/float.tsx` | **new** — the `float-tab` scenario |
| `apps/playground/src/scenarios/index.ts` | import + register the scenario, add `"float"` to `PROBE_CAPABILITIES` |
| `packages/testing/src/smoke.ts` | add `"float"` to `CAPABILITIES` (no other change) |
| `apps/playground/README.md` | one row in the scenario table |
| `COMPONENTS.md` | capability table row `float`; **Detachable / movable tabs** row moves to `partial (probe)` with the measured contract; suite count |
| `TODO.md` | add the task under the playground workstream and tick it |
| `PLAN.md` | new decision row: a detached tab is an in-window absolute panel, never an OS window, and the clamp is ours |
| `.agents/slop/plans/README.md` | index row; playground block is now `100–194` |

## 3. The pure model (`apps/playground/src/panels/float.ts`)

All coordinates in `FloatWindow` are **local to the app surface** (the
scenario's `float-app` root), so rendering is `left: float.x, top: float.y` and
the clamp needs only the app's width and height. Window coordinates never enter
the model; the scenario subtracts the app origin read from
`getElementBounds("float-app")`.

```ts
export interface FloatWindow {
  readonly id: string;
  readonly title: string;
  readonly tabs: ReadonlyArray<DockTab>;
  readonly active: string;
  /** Local to the app surface, not the window. */
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** One float window in this probe. */
export const FLOAT_WIDTH = 260;
export const FLOAT_HEIGHT = 160;
```

Required exports and exact contracts:

- `clampFloat(app: { width: number; height: number }, float: FloatWindow):
  FloatWindow` — `x` in `[0, app.width - width]`, `y` in
  `[0, app.height - height]`; clamp both axes independently; never resize.
- `tearOff(
    dock: DockNode,
    float: Option.Option<FloatWindow>,
    tabId: string,
    point: { x: number; y: number },
    app: { width: number; height: number },
  ): Option.Option<{ dock: DockNode; float: FloatWindow }>`
  — `None` when `tabId` is not in the dock. Otherwise remove it with the
  existing `removeTab` (an emptied dock falls back to its empty group), then:
  - with a float open, **append** the tab to it, make it active, and keep the
    window where it is (append first, then clamp — the existing window is
    already inside);
  - with no float, create one at `point`, clamped, with the tab active.
- `dockFloat(dock: DockNode, float: FloatWindow, targetGroupId: string):
  { dock: DockNode; float: Option.Option<FloatWindow> }`
  — insert the **active** tab into `targetGroupId` with the existing
  `insertTab` (which activates it), then filter it out of the float. The float
  becomes `None` when no tab remains; otherwise its active tab becomes the
  first remainder. A target group that does not exist leaves both unchanged
  (return the inputs) — never throw.
- `encodeWorkspace(dock: DockNode, float: Option.Option<FloatWindow>): string`
  and `decodeWorkspace(json: string): Option.Option<{ dock: DockNode; float:
  Option.Option<FloatWindow> }>` — one `Schema` struct
  `{ dock: DockNodeSchema, float: Schema.NullOr(FloatSchema) }` through
  `Schema.fromJsonString`; decode unknown with `decodeUnknownOption` and
  convert the nullable float with `Option.fromNullishOr`.

House rules: `Option` for absence, `Schema` at the JSON boundary, no
`throw`, `Arr`/`Option` helpers instead of native loops, no `any`.

## 4. The scenario (`float-tab`, capability `float`)

Title: **“In-window floating panels (a torn-off tab)”**.

View: a fixed 900 × 480 app surface `float-app` with
`position: "relative"`, `overflow: "hidden"` and a themed background. It holds:

- a dock `float-dock` in the top 300 px: one strip `float-strip` with three
  tabs `alpha`, `beta`, `gamma` (ids `float-tab-<id>`, `role="tab"`,
  `aria-selected`), a body `float-body` with `onClick` logging `body`, and a
  readout `float-dock-state` = `tabs=alpha,beta,gamma active=alpha`;
- a readout `float-state` = `float=none` / `float=<active tab> x=<int> y=<int>`;
- a readout `float-log` = `opened=<n> body=<n> moved=<n> docked=<n>
  closed=<last>`;
- the float, **rendered after the dock** in the same relative root, when open:
  `float-window` (`role="region"`, `aria-label="Floating panel"`) with a title
  bar `float-title` (`role="group"`, `aria-label="Panel title bar"`), its tabs
  `float-window-tab-<id>` (`role="tab"`), a body `float-window-body` with
  `onClick` logging `float-body`, and a close `float-close`
  (`role="button"`, `aria-label="Close floating panel"`);
- a control row `float-save` / `float-restore` that round-trips
  `encodeWorkspace`/`decodeWorkspace` through a piece of state.

The tab strip's gesture (local to the scenario, not a new component):

- `onMouseDown` records `{ tabId, x, y }` (window coordinates);
- `onMouseUp` receives the release point; if the release is **more than 8 px**
  from the press and **outside** `float-dock`'s rectangle (read with
  `useGpuix().renderer.getElementBounds(dockId)` at release), call `tearOff`
  with the point converted to app-local coordinates; otherwise treat it as a
  selection click.

The title bar's gesture: `onMouseDown` records the grab offset, `onMouseMove`
computes the candidate top-left from the pointer delta, applies `clampFloat`
and sets state, `onMouseUp` ends the gesture. `onClick` on `float-window-body`
logs `float-body`.

Checks, in order (each read follows a `settle`):

1. **Before any gesture** — `float-state` contains `float=none`; the dock
   readout lists three tabs; `bounds("float-window")` is absent (translate the
   null to the string `none` before comparing — the `SmokeContext` compares
   scalars).
2. **Tear-off** — press `float-tab-alpha`; move the pointer in ≥3 steps to the
   app-local point `(560, 320)` (outside the dock, inside the app); release.
   - `float-state` contains `float=alpha`.
   - The painted `float-window` box equals `app.x + 560`, `app.y + 320` on both
     axes within 1 px (the float's top-left is the release point).
   - `float-dock-state` contains `tabs=beta,gamma`.
   - `elementType("float-tab-alpha")` is `null` (the tab left the strip).
   - `float-log` contains `opened=1`.
3. **Paint order and hit-testing over the dock** — drag `float-title` so the
   float's top-left is app-local `(200, 60)`, over the dock body; assert the
   painted box follows within 1 px. Then `clickWindow` at a point inside both
   `float-window-body` and the dock body (e.g. app-local `(260, 180)`):
   `float-log` gains `body=1` and `float-dock-state`'s log stays `body=0`
   (a separate `float-dock-log` readout, or the same readout carrying
   `dockBody=`). Paint order is the claim: the float is after the dock.
4. **Clamp** — drag `float-title` towards app-local `(2000, 2000)` and release;
   the painted box's `x`/`y` equal `app.right - FLOAT_WIDTH`,
   `app.bottom - FLOAT_HEIGHT` within 1 px, and the box is fully inside
   `float-app` (its right/bottom never exceed the app's).
5. **Focus and Escape** — click `float-window-tab-alpha`; `focused()` is that
   id; `key("escape")` closes the float (`float-state` contains `float=none`,
   `float-log` contains `closed=escape`) and focus returns to the dock's active
   tab (`focusElement`), measured as `focused() = float-tab-beta`.
6. **Re-dock** — tear off `beta` again (same gesture as 2); then press
   `float-window-tab-beta`, move onto `float-strip`, release.
   - `float-dock-state` contains `beta` and `active=beta`;
   - `float-state` contains `float=none` (the emptied float is pruned);
   - `float-log` contains `docked=1`;
   - `float-window` has no bounds.
7. **Accessibility** — while a float is open (repeat the tear-off if needed):
   the dump exposes a `Region` labelled `Floating panel`, a `Tab` for the float
   tab, and a `Button` labelled `Close floating panel`.
8. **Restore** — tear off `gamma`, move the float to app-local `(420, 240)`,
   click `float-save`; tear off nothing else, drag the float elsewhere, click
   `float-restore`; `float-state` reports `float=gamma` and the saved `x`/`y`,
   and the painted box matches within 1 px. The dock readout is unchanged.
9. **Close** — click `float-close`: `float=none`, `float-log` contains
   `closed=button`, and the tab is not silently returned to the dock
   (`float-dock-state` has no `gamma`). Record this as the app's choice: a
   closed float drops its tab rather than restoring it (a real app may prompt).
10. Screenshot `apps/playground/.artifacts/screenshots/float-tab.png`.

If any of these steps cannot be expressed with the existing `SmokeHost` verbs,
**STOP** (§6) rather than adding a host verb that hides the failure.

## 5. Commands and expected results

Run in this order from `workspaces/playground`:

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/testing test` | all tests pass (the capability list change adds none) |
| `nub run --filter playground test` | all files pass, including the new `panels/float.test.ts` |
| `nub run --filter playground check-types` | exit `0` |
| `nub run --filter playground build` | exit `0` |
| `nub apps/playground/dist/smoke/run.js` | `57/57`, exit `0`, one new screenshot, `float-tab` green |
| `nub apps/playground/dist/smoke/run.js --only float-tab` | exit `0`, the new checks only |
| `nub run check` | exit `0` |
| `nub run lint` | exit `0` |
| `nub run test` | exit `0` |

The suite count moves `56 → 57`. If the run reports `56` the scenario was not
registered; if it exits `2` the binding is missing — see §6.

## 6. STOP conditions

- **STOP** if a press on a tab followed by `movePointer`/`releasePointer`
  outside the strip does not reach the tab's `onMouseUp` with the release
  coordinates. Record the delivered events and do not move the gesture to the
  app root.
- **STOP** if the absolute float does **not** paint above the dock body. Record
  the hit test and the paint order; do not add a portal, a second window or a
  fake overlay.
- **STOP** if `renderer.getElementBounds` returns `null` for `float-app` or
  `float-dock` at the moment a gesture needs it. Record the frame and do not
  hard-code the origin.
- **STOP** if the painted float box and the model differ by more than 1 px;
  record the delta rather than widening the tolerance.
- **STOP** if the smoke run exits `2` (no native binding on the host) or if the
  new scenario needs a new `SmokeHost` verb.
- **STOP** if `nub run check` rejects any new test as assertion-free — the tests
  in §7 must assert a rule, not a constant.

## 7. Test plan

**Pure (`apps/playground/src/panels/float.test.ts`, vitest).** Header comment
states the bugs guarded.

1. `tearOff` removes the tab and leaves the dock's other tabs and active tab
   intact; an unknown tab returns `None` and leaves the dock **unchanged** (the
   bug: a stray drop closing the dock).
2. A second `tearOff` with a float open **appends** the tab and activates it
   without moving the window (the bug: a second tab opening at the pointer).
3. `clampFloat` pins each edge at `0` and at `size - extent` and leaves an
   in-bounds window untouched (the bug: a window dragged off-screen).
4. `dockFloat` inserts the active tab at the target, activates it, and returns
   `None` once the float is empty; docking into a missing group changes
   nothing (the bug: losing a tab between dock and float).
5. `encodeWorkspace`/`decodeWorkspace` round-trip the dock and the float
   position, and a corrupt payload decodes to `None` (the bug: a restore that
   throws or silently restores the wrong position).

**Native (`float-tab`).** The checks themselves are the test. Two-direction
proofs to run and record:

- **M1** — remove the `clampFloat` call from the title-bar move: check 4 must
  fail with an `x` past the app edge and exit `1`.
- **M2** — render the float **before** the dock in the tree: check 3 must fail
  (the dock body takes the click) and exit `1`.
- **M3** — place the float at the **press** point instead of the release point:
  check 2 must fail the 1 px comparison and exit `1`.

Restore each mutation and re-run green. Record the exact failure text in §8.

## 8. Measured results

_Filled after the run._

## 9. Acceptance

- `float-tab` is green in the native suite, the suite is `57/57`, and the three
  two-direction proofs are recorded.
- The `float` capability is in the report, `COMPONENTS.md`'s **Detachable /
  movable tabs** row cites the measured contract, and `PLAN.md` has the
  decision.
- `TODO.md`, `README.md` and the plan index are updated.
- All completion gates in `AGENTS.md` §7 pass.

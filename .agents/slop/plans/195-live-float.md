# 195 — The in-window float in a real window

| Field | Value |
| ----- | ----- |
| Status | planned |
| Phase | F (real-window evidence) |
| Owner | playground workstream |
| Depends on | `100`, `110`, `140`, `189`, `190`, `194` |
| Feeds | `COMPONENTS.md` **Detachable / movable tabs**, the live-suite evidence |

## 1. Goal

`float-tab` (plan `194`) proves a detachable tab as an in-window floating panel
on the `TestRenderer`: the tear-off, paint order, the title drag, the clamp,
focus/Escape, re-dock and the restore. Every gesture in it is synthetic.

The live suite has never dragged a tab **out of its strip**. `live-docking`
drags a tab onto a pane edge (a drop inside the surface); the live `drag` verb
paces one move per 40 ms frame, and the live window has its own pointer
capture and window coordinates. This plan adds `live-float`, which repeats the
core mechanism in a real window:

- a paced drag from the strip to a point **outside** the dock tears the tab out;
- the panel appears at the release point, at the exact window position;
- the panel's title bar drags it by the pointer delta;
- the float's tab takes native focus, and Escape closes it and returns focus to
  the dock;
- the close button closes a re-opened float and the tab is dropped.

It is the same view (`floatScenario.view`), not a second implementation — a live
scenario only supplies its own steps, exactly as `live-docking` mounts
`dockingScenario.view`.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `apps/playground/src/live/scenarios.tsx` | import `floatScenario`; add `live-float` after `live-docking` |
| `apps/playground/README.md` | the live table gains a `live-float` row; live count `12 → 13` |
| `COMPONENTS.md` | the live paragraph and the **Detachable / movable tabs** row cite the live verdict; live suite `12 → 13` |
| `TODO.md` | add and tick the task under the playground workstream |
| `.agents/slop/plans/README.md` | index row; playground block is now `100–195` |
| `PLAN.md` | extend D39 with the live confirmation (no new decision) |

No new capability: `float` already exists (plan `194`), and the live report
lists it once.

## 3. Scenario `live-float`

Title: **“Live float: a tab torn out in a real window”**. `view:
floatScenario.view`, `ready: "float-app"`, capability `float`.

Steps (every read after `settle`, except where `waitFor` is named; the live
runner's rule — the protocol has no frame boundary):

1. `app = bounds("float-app")`, `tab = bounds("float-tab-alpha")`.
   Assert both are painted.
2. `drag("float-tab-alpha", app.x + 560 - (tab.x + tab.width / 2),
   app.y + 320 - (tab.y + tab.height / 2), 6)`; `waitFor("float-window")`;
   `settle`.
   - `text("float-dock-state")` contains `main=beta,gamma@beta`;
   - `text("float-state")` contains `float=alpha`.
3. `bounds("float-window")` equals `(app.x + 560, app.y + 320)` within 1 px on
   both axes. This is the live pointer-release claim; a headless-only model
   would not prove the window coordinates arrive unshifted.
4. `drag("float-title", -360, -260, 6)`; `settle`; the box equals
   `(app.x + 200, app.y + 60)` within 1 px.
5. `click("float-window-tab-alpha")`; `settle`;
   `focused()` is `float-window-tab-alpha`.
6. `key("escape")`; `settle`;
   - `text("float-state")` contains `float=none`;
   - `text("float-log")` contains `closed=escape`;
   - `focused()` is `float-tab-beta` (focus returned to the dock's active tab).
7. `drag("float-tab-beta", …)` to `(app.x + 540, app.y + 320)`; `waitFor`
   `float-window`; `text("float-state")` contains `float=beta`.
8. `click("float-close")`; `settle`;
   - `float-state` contains `float=none`;
   - `float-log` contains `closed=button`;
   - `float-dock-state` contains `main=gamma@gamma` (the closed float's tab was
     dropped, not returned).
9. `bounds("float-window")` is `null` (use `Option.fromNullishOr`).
10. Screenshot `apps/playground/.artifacts/live/live-float.png`.

The deltas in steps 2 and 7 are derived from the **element's own bounds**, never
from a hard-coded window position.

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter playground check-types` | exit `0` |
| `nub run --filter playground build` | exit `0` |
| `nub apps/playground/dist/smoke/run.js` | `57/57`, exit `0` (unchanged) |
| `nub run --filter playground smoke:live` | `13/13`, exit `0`, `live-float` green, one new PNG |
| `nub run check` / `nub run lint` / `nub run test` | exit `0` |

If the live run exits `2` the host has no window; that is not a pass.

## 5. STOP conditions

- **STOP** if the paced `drag` from a tab does not deliver a final move outside
  the dock; record the readouts and do not replace the gesture with a click.
- **STOP** if the live window's painted float box differs from the release point
  by more than 1 px (plan `193` measured 1 px for a pointer-placed surface);
  record the delta instead of widening the tolerance.
- **STOP** if `focused()` cannot see the float tab or the returned dock tab;
  record what the renderer reported — do not assert through the readouts
  instead.
- **STOP** if the run exits `2` or needs a new `AsyncSmokeHost` verb.

## 6. Test plan

- The scenario is the test: a float that opens at the tab's press point fails
  step 3; one that ignores the title delta fails step 4; a close that returns
  the tab fails step 8.
- Reverse run to record: change the first `drag` to a **click** on
  `float-tab-alpha`; `live-float` must fail (`waitFor("float-window")` reports
  the missing element) and exit `1`.
- The headless `float-tab` suite must stay `57/57`.

## 7. Measured results

_Filled after the run._

## 8. Acceptance

- `live-float` is green, the live suite is `13/13`, and the reverse run is
  recorded.
- README, `COMPONENTS.md`, `TODO.md`, `PLAN.md` and the index cite the live
  verdict.
- All completion gates in `AGENTS.md` §7 pass.

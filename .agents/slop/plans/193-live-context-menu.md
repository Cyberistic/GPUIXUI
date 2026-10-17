# 193 — The right click and a context menu in a real window

| Field | Value |
| ----- | ----- |
| Status | landed (measured facts in §7) |
| Phase | B → F (release evidence) |
| Owner | playground workstream |
| Depends on | `100`, `164`, `187`, `189`, `190` |
| Feeds | the `menu` capability, Context menus / Dropdown menus, Phase G |

## 1. Goal

`context-menu-pointer` (plan `164`) proves on the `TestRenderer` that a right
click is `onAuxClick` + `isRightClick`, that a pointer-positioned `<anchored>`
is exact even in a scrolled container, and that outside/Escape dismiss. The live
suite has never sent a right click: every live gesture is a primary button.

This plan adds `rightClick` to the async host and `live-context-menu`, proving in
a real window:

- a right click opens the menu at the pointer (`ctx-state` and the surface's
  painted box agree within 1 px);
- a disabled row is inert, an enabled row runs and closes;
- an outside press and Escape dismiss;
- a right click on a child bubbles to the trigger;
- a right click inside a **scrolled** container still places the menu at the
  pointer (no double-applied offset) and an item below the viewport is hittable.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `packages/testing/src/smoke.ts` | `AsyncSmokeHost.rightClick(testId)` |
| `packages/testing/src/test-support.ts` | `nullAsyncHost.rightClick = () => Effect.void` |
| `apps/playground/src/live/host.ts` | Implement it with `app.mouse.click(at(app, testId), { button: 2 })` |
| `apps/playground/src/live/scenarios.tsx` | Add `live-context-menu` (view = `contextMenuScenario.view`, capability `menu`) |
| `apps/playground/README.md` | Add the live row |
| `COMPONENTS.md` | Add `live-context-menu` to the `menu` row and the live paragraph |
| `TODO.md` | Add and tick the task |
| `.agents/slop/plans/README.md` | Index; `100–193` used |
| `PLAN.md` | D38: a live right click is the protocol's `click(button: 2)`; the pointer contract transfers |

## 3. Scenario

`live-context-menu`, view `contextMenuScenario.view`, `ready: "ctx-target"`:

1. `rightClick("ctx-target")`; `settle`; `textOf("ctx-state")` contains
   `open=true` and `scope=root`; `ctx-log` contains `A:aux` and `:true`.
2. `bounds("ctx-menu")` equals the target centre within 1 px on both axes.
3. click `ctx-item-disabled`; state still `open=true`; click `ctx-item-copy`;
   state `open=false last=copy`.
4. right click again; click `ctx-outside`; state `open=false last=outside`.
5. right click again; `key("escape")`; state `open=false last=escape`.
6. right click `ctx-target-label`; state `open=true scope=root`; Escape.
7. `wheel("ctx-scroll", 0, -400)`; assert the offset is negative; read the row's
   centre; right click `ctx-scroll-target`; state `scope=scroll`; the
   `ctx-menu-inside` bounds equal the row centre within 1 px; painted text
   contains `Row action three`; click `ctx-item-inside-3`; state
   `last=inside-item-3`.
8. screenshot `apps/playground/.artifacts/live/live-context-menu.png`.

Every read is after `settle`; a right click returns after a tick and React
commits on a later frame (the live runner's rule).

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter @gpuixui/testing test` | 42 tests pass |
| `nub run --filter playground test` | 9 files, 61 tests pass (unchanged) |
| `nub run --filter playground check-types` | exit `0` |
| `nub apps/playground/dist/smoke/run.js` | `56/56`, exit `0` |
| `nub apps/playground/dist/live/run.js` | `12/12`, exit `0`, `live-context-menu` checks pass |
| `nub run check` / `nub run lint` / `nub run test` | exit `0` |

## 5. STOP conditions

- **STOP** if `app.mouse.click(..., { button: 2 })` does not deliver
  `onAuxClick`/`isRightClick` in a live window. Record what it delivered and do
  not substitute a left click.
- **STOP** if the menu's painted box and the pointer differ by more than 1 px in
  a live window; record the delta rather than widening the tolerance beyond the
  headless rule.
- **STOP** if the run exits `2` (no window).

## 6. Test plan

- The alignment checks are the test: a menu placed at the element origin or at a
  scroll-offset point fails the 1 px comparison.
- Reverse run: change the host's `rightClick` to a primary click (`button: 0`);
  `live-context-menu` must fail `open=true` and `A:aux` and exit `1`. Record it.
- The headless `context-menu-pointer` suite must stay green.

## 7. Measured results

Run on this host (Intel macOS, locally built `@gpuix/native@0.10.0`, ADR 0003),
2026-10-18.

**A right click and a pointer-placed menu work in a real window.**
`live-context-menu` (2.2 s) records 31 checks; the live suite is `12/12`, exit
`0`:

- a right click opens the menu (`open=true`, `scope=root`) and reaches the log as
  `A:aux`/right;
- the painted menu's `x`/`y` equal the target's centre within 1 px;
- a disabled row leaves it open; Copy runs and closes (`last=copy`);
- an outside press (`last=outside`) and Escape (`last=escape`) dismiss;
- a right click on the child label opens it with the root scope;
- in a **scrolled** container (offset negative), the row's right click opens the
  `scroll` scope, the in-container surface paints at the row's centre within
  1 px, `Row action three` is painted below the viewport, and clicking it closes
  (`last=inside-item-3`).

**Reverse run:** `rightClick` sent as `button: 0` fails
`a right click opens the menu: expected a string containing "open=true", got
"open=false last=none"`, capability `menu=failed`, exit `1`. Restored and re-ran
green. Screenshot: `apps/playground/.artifacts/live/live-context-menu.png`.

## 8. Acceptance

- `live-context-menu` passes in a real window and fails in the recorded reverse
  direction.
- README, `COMPONENTS.md`, `TODO.md`, `PLAN.md` and the index state the live
  right-click evidence.

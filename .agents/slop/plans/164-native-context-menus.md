# 164 — Plan: native context menus (right click, placement, dismissal)

| Field | Value |
| ----- | ------- |
| Status | planned (measured facts land in §8) |
| Phase | B (feasibility) → feeds Tier 2 Context menu, Dropdown menu, Command menu |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Depends on | `100`, `110`, `120`, `140`, `155`, `156`, `162` |
| Feeds | `@gpuixui/components` `ContextMenu` (plan `114`), the components plan `122` keyboard route, and every grid/tree row that offers a context menu |

## 1. Goal

`@gpuixui/components` ships `ContextMenu` on three runtime assumptions that were
never measured on 0.10.0:

1. a right click arrives as **`onAuxClick` + `isRightClick`**, because 0.10.0
   has no `onContextMenu` (plan `114` §1a);
2. **`<anchored position={x, y}>` is window coordinates**, so a pointer point is
   passed through unchanged — also when the trigger sits inside a scrolled
   container (plan `112` §1c measured only an unscrolled 200 px parent);
3. **`shift-f10` is a deliverable synthetic keystroke** whose event reports
   `key: "f10"` and `modifiers.shift === true` (plan `122` §2).

This probe turns each into a failing check:

- is a right click delivered at all, with which button/flag and in what order
  relative to `onMouseDown`/`onMouseUp`?
- does `onClick` also fire for a right click (would a row action run twice)?
- does a right click on a **child** of the trigger bubble to the trigger?
- does the anchored menu appear exactly at the pointer, and does a **scrolled
  ancestor** shift, clip or hit-block it?
- do outside press and Escape dismiss it, and does the keyboard route return
  focus to its trigger?
- does `shift-f10` reach a focused `div` as `key=f10` + shift?

## 2. What is documented

- `HostProps` (published 0.10.0) has `onAuxClick` and no `onContextMenu`;
  `dist/mutations.js` maps `onAuxClick` → native event `"auxClick"`.
- `EventPayload` documents `button` (`2` = right) and `isRightClick`.
- `EventPayload` also names `contextMenu` in the `button` comment, but no React
  prop maps to it — a right click has no `onContextMenu` route.
- `TestRenderer.nativeSimulateClick(x, y, button?, modifiers?)` runs the real
  click pipeline; the upstream test for the same code path expects a right
  click to produce `mouseDown` (button `2`) then `auxClick` (`isRightClick`),
  and no `onClick`.
- `<anchored position>` is the only window-coordinate surface in 0.10.0
  (plan `112` §1c); `FloatingLayer` is anchor-relative and cannot take a point.

## 3. Scenario `context-menu-pointer` (capability `menu`)

New view `apps/playground/src/scenarios/context-menu.tsx`. Colours and spacing
from `useTheme`; no literal colours. It reproduces what a component must do —
record the point, render an `<anchored>` menu, dismiss on outside press and
Escape, restore focus for the keyboard route — instead of importing a component
that does not exist yet in an actionable form.

### 3.1 The tree

| Element | Shape |
| ------- | ----- |
| `ctx-target` | 200×100 `div`, `onMouseDown`/`onMouseUp`/`onAuxClick`/`onClick` all log; a right click opens the **root** menu at the pointer. Contains `<text testId="ctx-target-label">right-click me</text>` |
| `ctx-target-b` | 200×100 sibling; a right click on it opens the same root menu at the new point (repositions, never duplicates) |
| `ctx-outside` | 200×48 box below; a left click here must dismiss |
| `ctx-key-target` | 200×40 focusable `div` (`tabIndex={0}`); `onKeyDown` logs the key and shift flag, and on Shift+F10 opens the root menu at its own bottom-left and remembers to restore focus |
| `ctx-scroll` | 260×160 `div`, `overflowY: "scroll"`, 40 fixed 40 px rows; row 12 is `ctx-scroll-target` (a right click opens the **in-container** menu at the pointer) |
| `ctx-menu` | the root menu: `<anchored position={point} deferred priority={1} occlude>` → inner `div` `ctx-menu` (`role="menu"`, `tabIndex={-1}`, `autoFocus`, `onMouseDownOutside`, `onKeyDown`), rows `ctx-item-copy`, `ctx-item-delete`, `ctx-item-disabled` |
| `ctx-menu-inside` | the same menu rendered **inside** `ctx-scroll`, to measure clipping/offset |
| `ctx-log` | readout: `down:2>up:2>aux:640,400:true>…` in arrival order |
| `ctx-state` | readout: `open=<bool> x=<n> y=<n> scope=<root\|scroll> keyboard=<bool> last=<none\|copy\|escape\|outside\|inside-item>` |
| `ctx-key-readout` | readout: `key=<name> shift=<bool>` from the focusable trigger's `onKeyDown` |

The menu row click logs `menu:copy` (etc.) and closes with `last=copy`.
`ctx-item-disabled` never closes or logs.

### 3.2 Steps

1. **Left click does not open.** `host.click("ctx-target")`; `ctx-state`
   contains `open=false` and `ctx-log` contains no `aux:`.
2. **Right click is delivered.** `host.rightClick("ctx-target")`; the log
   contains `down:2` and an `aux:<x>,<y>:true` entry, and does **not** contain
   `click:`. The aux point is within 1 px of the element's measured centre
   (parsed out of the log; `expectNear`).
3. **The trigger's child bubbles.** After a right click on `ctx-target-label`
   the menu is open (`open=true scope=root`).
4. **Placement is exact.** `bounds("ctx-menu")` x and y are within 1 px of the
   aux point.
5. **An item activates and closes.** `host.click("ctx-item-copy")` →
   `ctx-state` `open=false … last=copy`; a disabled item does nothing.
6. **Outside press dismisses.** Reopen, `host.click("ctx-outside")` →
   `open=false last=outside`; the log shows the outside element received the
   press (so the dismissal is not a global key handler).
7. **Escape dismisses.** Reopen, `host.key("escape")` → `open=false
   last=escape`.
8. **Keyboard route.** `host.click("ctx-key-target")`, `host.key("shift-f10")`:
   `ctx-key-readout` reads `key=f10 shift=true`, `ctx-state` reads
   `open=true keyboard=true`, and `host.focused()` is `ctx-menu`; Escape then
   returns focus to `ctx-key-target`.
9. **Scrolled container.** `host.wheel("ctx-scroll", 0, -400)` (negative scrolls
   down), assert the scroll offset is negative, then `host.rightClick(
   "ctx-scroll-target")`: the aux point is the row's **current window** centre,
   `open=true scope=scroll`, and `bounds("ctx-menu-inside")` is within 1 px of
   that point — no scroll-offset double count.
10. **In-container hit testing.** Click the last item of the in-container menu
    (`ctx-item-inside`); it must activate (`last=inside-item`) even when the
    menu overlaps the scroll viewport's bottom edge. If it cannot, §8 records
    the clipping rule and components must mount the menu outside the scroll
    container.

## 4. Exact file changes

| File | Change |
| ---- | ------ |
| `.agents/slop/plans/164-native-context-menus.md` | this plan |
| `.agents/slop/plans/README.md` | index row for `164` |
| `packages/testing/src/smoke.ts` | `CAPABILITIES` gains `menu`; `SmokeHost` gains `rightClick` |
| `packages/testing/src/test-support.ts` | the inert `rightClick` member |
| `apps/playground/src/smoke/host.ts` | `rightClick` maps the `testId` to its centre and calls `nativeSimulateClick(x, y, 2)` |
| `apps/playground/src/scenarios/context-menu.tsx` | the view + the scenario |
| `apps/playground/src/scenarios/index.ts` | register it; add `menu` to `PROBE_CAPABILITIES` |
| `apps/playground/src/smoke/run.test.ts` | the registry test expects `menu` |
| `apps/playground/README.md` | scenario count `29 → 30`; a "Native context menus" fact row and section |
| `COMPONENTS.md` | capability row for `menu`; the Context menus / Dropdown menus / Command menus rows cite the measurement |
| `TODO.md` | tick the task; suite count updated |

No change outside `apps/playground`, `packages/testing` and the ledgers.

## 5. Commands and expected results

1. `nub run --filter @gpuixui/testing test` → exit `0`.
2. `nub run --filter playground check-types` → exit `0`.
3. `nub run --filter playground build` → exit `0`.
4. `nub apps/playground/dist/smoke/run.js --only context-menu-pointer` →
   `1/1`, exit `0`, `menu=verified`.
5. `nub apps/playground/dist/smoke/run.js` → **30/30**, exit `0`.
6. `nub run check`, `nub run lint`, `nub run test` → exit `0`.

## 6. STOP conditions

- **STOP** if a right click produces **no** `auxClick` event at all. Record the
  event log; `ContextMenu` then has no pointer route in 0.10.0 and the component
  must document an unsupported interaction (and the keyboard route becomes the
  only honest path).
- **STOP** if `onClick` fires for a right click. Record the order; every row
  action must guard `event.isRightClick` to avoid running twice.
- **STOP** if `isRightClick` is absent or `false` for a right click. Record the
  payload; the component's guard is wrong for 0.10.0 and must switch to
  `event.button === 2` (or stay open on any aux click).
- **STOP** if the anchored menu is offset by the container's scroll amount, or
  clipped so an item cannot be hit. Record the point, the menu bounds and the
  scroll offset; components must render the surface outside the scroll
  container (a root mount), and the docs must say so.
- **STOP** if `shift-f10` does not reach the focused element, or reports a key
  other than `f10`. Record the readout; plan `122`'s predicate must change.
- **DO NOT** synthesise the log or assert against a hand-computed string without
  reading it from the runtime.

## 7. Test plan (two directions)

- The scenario fails if right click is not delivered, if `onClick` also fires,
  if the menu is not at the pointer, if dismissal or Escape leaves it open, if
  the keyboard route loses focus, or if the scrolled-container menu is displaced
  or unhittable.
- Two-direction proof, recorded in §8:
  1. drop the `onAuxClick` open call → the placement and state checks fail,
     exit `1`. Restore.
  2. hard-code the anchored `position` to `{x: 0, y: 0}` → the placement check
     fails with the measured `0,0`, exit `1`. Restore.
  3. remove the scroll-offset guard (if the measured contract needs one) → the
     scrolled placement check fails by the scroll amount. Restore.
- `scenarioProblems` (unit, exists) fails if `menu` loses its scenario.

## 8. Measured facts

_(Filled in by the run; every number below must come from the report's checks
and the artifact, never from expectation.)_

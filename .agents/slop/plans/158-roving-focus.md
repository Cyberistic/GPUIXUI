# 158 — Plan: roving focus in a list and inside a virtual list

| Field | Value |
| ----- | ----- |
| Status | landed (measured facts in §8) |
| Phase | B (feasibility) → feeds C (menus/tabs/radio) and D (data grid, tree) |
| Owner | playground workstream |
| Depends on | `110`, `120`, `140`, `152`, `155` |
| Feeds | `@gpuixui/components` DropdownMenu/Tabs/RadioGroup; `packages/data-grid`; `packages/docking` |

## 1. Goal

Every composite widget needs **roving focus**: the widget owns one tab stop and
moves native focus between its rows with the arrow keys. Plan `155` proved
`renderer.focusElement` can move focus from component code into a dialog; it did
not prove the two things a list or grid needs:

1. arrow-key handling can call `focusElement` on a **sibling row** and the next
   keystroke is delivered to that row (a real roving tabindex, not just a
   visual selection);
2. the same works for a row inside a `<virtual-list>`, where only a window of
   rows is painted, and what happens to focus when the focused row scrolls out
   of that window.

Answer with measurements so the data-grid and menu plans do not inherit an
unmeasured assumption.

## 2. What is already measured (plan `140` §4, plan `155` §8)

- `renderer.focusElement(id)` focuses a node; `getFocusedElementId()` reports it.
- A clicked row takes native focus and receives `onKeyDown` (`tree-view`).
- `focusNext`/`focusPrevious` traverse and need `dispatchNativeEvents()` to
  deliver `onFocus`/`onBlur` to React.
- A `<virtual-list>` retains every row but paints only ~9; `onVisibleRange`
  lags the painted window by one gesture.

Not measured: programmatic focus on a passive row, focus across the painted
window boundary, and key delivery after a focus move.

## 3. Scenario `roving-focus` (capability `focus`)

One view, two lists. Every row is a `div` with `tabIndex={-1}` except the active
row (`tabIndex={0}`), `role="option"` and `aria-selected`. The view holds a row
id registry (a ref array filled by `ref` callbacks) so a key handler can call
`renderer.focusElement(id)` on its neighbour — the exact mechanism a menu or
grid would use. It also exposes two probe buttons that focus a row without a
click.

Plain list: 8 rows `roving-row-0`…`roving-row-7`.

Virtual list: 200 rows `vrow-0`…`vrow-199`, height 32, inside a 280px
`<virtual-list>` (≈9 painted).

Readout: `active=<n> activated=<n> vactive=<n> vfocus=<id|none>`.

Steps:

1. `click("roving-row-2")` → `focused()` is `roving-row-2`; readout
   `active=2`.
2. `key("down")` → the row's `onKeyDown` focuses `roving-row-3` itself →
   `focused()` is `roving-row-3`, readout `active=3`.
3. `key("enter")` → readout `activated=3`, proving the keystroke reached the
   **newly focused** row, not the one that was clicked.
4. `click("roving-focus-5")` (a sibling control that calls `focusElement` for a
   row that was never clicked) → `focused()` is `roving-row-5`, `active=5`.
5. `click("vrow-2")` → `focused()` is `vrow-2`.
6. `key("down")` → `focused()` is `vrow-3`, readout `vactive=3` — programmatic
   focus works inside a virtual list.
7. `wheel("vlist-focus", 0, -1200)` then `advance(50)` → the painted window has
   moved past the first rows (`paintedText()` no longer has "virtual row 0"),
   while `focused()` is still `vrow-3`: **focus survives a virtual row leaving
   the painted window**, and the focused row stays in the painted set (it
   appears after the window's rows in paint order).
8. `key("down")` with the window moved → `focused()` is `vrow-4`, readout
   `vactive=4` — the key handler still works on a row outside the window.
   Then `wheel` back, `advance(50)`, click `vrow-2`, `key("down")` →
   `vrow-3`, proving focus can be restored after scrolling.

## 4. Exact file changes

| File | Change |
| ---- | ------ |
| `.agents/slop/plans/158-roving-focus.md` | this plan |
| `.agents/slop/plans/README.md` | index row |
| `apps/playground/src/scenarios/roving-focus.tsx` | view + scenario |
| `apps/playground/src/scenarios/index.ts` | register it (capability `focus`) |
| `apps/playground/src/smoke/run.test.ts` | registry test also expects `roving-focus` in the ids |
| `TODO.md` | task under the playground workstream |
| `COMPONENTS.md` | Tier 3 tree/data-grid and Tier 2 menu/tabs keyboard notes updated with the measured facts |

No change to `packages/testing`: `focusElement` is reached through existing
host calls only if the component calls it. If the scenario needs to focus a row
from the *scenario* (step 4 uses a view button, which calls the renderer
directly), the host stays unchanged.

## 5. Commands and expected results

1. `nub run --filter playground build` → exit `0`.
2. `nub apps/playground/dist/smoke/run.js --only roving-focus` → `1/1`, exit
   `0`, `focus=verified`.
3. `nub apps/playground/dist/smoke/run.js` → `22/22`, exit `0`.
4. `nub run check`, `nub run lint`, `nub run test` → all exit `0`.

## 6. STOP conditions

- **STOP** if `focusElement` cannot focus a row that was never clicked. Record
  it: a roving-tabindex contract cannot be built on programmatic focus, and
  menus/tabs must use `focusNext` traversal instead. Do not fake it with
  selection-only state.
- **STOP** if the virtual-list rows have no ids (the ref callback receives
  `null` for unpainted rows): record the exact count and use the painted window
  only; do not claim keyboard navigation across the window.
- **STOP** if step 7's result differs from the expectation in more than the
  drop/retain branch: report it and correct the assertion honestly.

## 7. Test plan (two directions)

- The scenario fails if the key handler does not call `focusElement` (step 3's
  `enter` then activates the old row, not the new one), if focus does not move
  inside the virtual list (step 6), or if the documented scroll behaviour
  regresses.
- Two-direction proof: temporarily remove the `focusElement` call from the
  `down` branch; `--only roving-focus` must exit `1` and name
  `focus moved to the next row`. Revert.
- The registry test guards coverage: dropping the scenario is a suite-level
  failure only if `focus` loses its last scenario; because `focus-traversal`
  also covers `focus`, add an id assertion instead.

## 8. Measured facts

Run on this host against the locally built `@gpuix/native@0.10.0` (ADR 0003).
`1/1` for `--only roving-focus`, `focus=verified`; the checks are in
`.artifacts/smoke-report.json`.

- `renderer.focusElement(id)` focuses a row that was **never clicked**
  (`roving-focus-5` button → `focused()` is `roving-row-5`).
- The next keystroke is delivered to the row that received focus: `down` from
  `roving-row-3` focuses the row in its own handler, then `enter` sets
  `activated=3` on the **new** row (without the focus move it stays `2`).
- The same works inside a `<virtual-list>`: a painted row takes focus by click,
  and `down` moves focus to its painted neighbour.
- **Focus survives the painted window moving past it.** After a 1200px wheel
  the window paints rows 19–27 and no longer paints `virtual row 0`, yet
  `focused()` is still `vrow-3` and the next `down` moves focus to `vrow-4`.
  The focused row also stays in `getPaintedText()` (as the last entry, outside
  the window's run) — a component may have to hide or account for that
  straggler rather than assume the painted window is exactly the visible rows.
- Two-direction proof: with `focusIndex` removed from the plain list's `down`
  branch, `--only roving-focus` exits `1` and reports
  `focus moved to the next row: expected "roving-row-3", got "roving-row-2"`;
  `focus=failed`. Reverted, the scenario is green again.

# 637 — Roving focus in a real window: programmatic focus and a scrolled-out row

**Status:** planned
**Phase:** F (evidence transfer)
**Owner:** `playground` workstream (`apps/playground`, `packages/testing`)
**Depends on:** plan `100`, `140`, `158`, `189`, `190`, `197`, `345`, `559`

## 1. Why this plan exists

`roving-focus` (plan `158`) is the measured keyboard model every menu, tab
strip, radio group, tree and data grid builds on, and `COMPONENTS.md`'s
`Keyboard navigation` row cites it. It has **no live twin**. The window suite
proves roving focus only as a side effect of other probes:

- `live-tree` clicks a row, then presses Down/Up — it never moves focus with
  `renderer.focusElement` from component code;
- `live-tier2-navigation` presses arrows on a tab strip — it never proves a
  row that was never clicked receives focus;
- no live scenario scrolls the **painted window past the focused virtual row**
  and then sends the next key.

Two claims therefore rest on `TestRenderer` evidence alone:

1. **A component's own `renderer.focusElement` call focuses a row nobody
   clicked, and the next keystroke is delivered there.** This is the
   roving-tabindex mechanism; a `tabIndex` alone does not prove it.
2. **Inside `<virtual-list>`, focus is not lost when the window scrolls past
   the focused row.** The focused row stays in the painted set and the next
   arrow still moves it, so the painted set is "the window **plus** the focused
   row". Grid, tree and terminal components rely on this.

This plan adds one live scenario, `live-roving-focus`, that repeats plan
`158`'s view in the real 1100 × 720 window through the automation protocol. It
changes no component behaviour.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/roving-focus.tsx` | Add `testId="vlist-focus-viewport"` to the `<div>` wrapper around `<virtual-list testId="vlist-focus">`. A live wheel needs a painted box; a `<virtual-list>` has none (plans `350`, `532`, `534`). No other change. |
| `apps/playground/src/live/scenarios.tsx` | Add `const liveRovingFocus: LiveScenario` (below) and append it to `liveScenarios`. |
| `COMPONENTS.md` | Add `live-roving-focus` to the `focus` capability's scenario cell; extend the `roving-focus` paragraph with the live facts. |
| `apps/playground/README.md` | Add the live-twin row/paragraph for the roving-focus contract and the new live count. |
| `TODO.md` | Add and tick the task under Playground; bump the section bar. |
| `.agents/slop/plans/README.md` | Index this plan in the playground table. |

Do **not** change the headless scenario's steps or assertions. The new
`testId` is additive.

## 3. The live scenario

Insert after `liveTree` in `apps/playground/src/live/scenarios.tsx` (its
import of `rovingFocusScenario` goes with the other scenario imports):

```tsx
const liveRovingFocus: LiveScenario = {
  id: "live-roving-focus",
  title: "Live roving focus: programmatic focus and a scrolled-out row",
  capability: "focus",
  view: rovingFocusScenario.view,
  ready: "roving-row-0",
  steps: (ctx) =>
    Effect.gen(function* () {
      // ...
    }),
};
```

Register it immediately after `liveTree` in the `liveScenarios` array.

The steps, in order (each `settle` is required; the protocol has no frame
boundary — plan `189` §9):

1. `click("roving-row-2")`, `settle`, `waitForFocus("roving-row-2")`.
   Assert `focusedOf === "roving-row-2"` and the readout contains `active=2`.
2. `key("down")`, `settle`. Assert focus is `roving-row-3` and the readout
   contains `active=3`.
3. `key("enter")`, `settle`. Assert the readout contains `activated=3`.
4. `click("roving-focus-5")`, `settle`, `waitForFocus("roving-row-5")`.
   Assert focus is `roving-row-5` and the readout contains `active=5` — the
   component's `renderer.focusElement` reached a row that was never clicked.
5. `key("up")`, `settle`. Assert focus is `roving-row-4` — the moved-to row
   receives the **next** key.
6. `click("vrow-2")`, `settle`, `waitForFocus("vrow-2")`; `key("down")`,
   `settle`. Assert focus `vrow-3` and readout `vactive=3`.
7. Capture the virtual-list anchor (`listScrollTop("vlist-focus")`, plan
   `197`) and assert the focused row was **already revealed** (`anchor > 0`) —
   focusing a virtual row reveals it (plan `166`), so the list is anchored at
   `vrow-3` before the wheel. Assert `virtual row 4` is painted.
8. `hover("vlist-focus-viewport")`, `settle`, then
   `wheel("vlist-focus-viewport", 0, -1200)`, `settle`. (A live wheel must
   follow a hover + settle or it can land at the old pointer — plan `606`.)
   Assert the anchor moved forward, `virtual row 4` — a row that **was**
   painted — is now unpainted, `focusedOf === "vrow-3"` (focus survived the
   window move), and `paintedText()` **does** contain `virtual row 3` — the
   focused straggler is still painted. (Asserting row 0 is vacuous: focus
   revealed the row and the window already starts past it.)
9. `key("down")`, `settle`. Assert focus `vrow-4` and readout `vactive=4` —
   the key still reaches the row and moves on after the window moved.
10. `hover` + `settle`, `wheel("vlist-focus-viewport", 0, 1200)`, `settle`;
    `click("vrow-2")`, `settle`, `key("down")`, `settle`. Assert focus
    `vrow-3` — focus can be restored and moved after scrolling back.
11. `screenshot(`${LIVE_ARTIFACTS}/${liveRovingFocus.id}.png`)`.

Every assertion names the measured behaviour, not a harness constant.

## 4. Commands and expected results

Run from the worktree root (`/Users/cyberistic/GPUIXUI/workspaces/playground`).

```sh
nub run --filter playground build
# exit 0

nub apps/playground/dist/smoke/run.js --only roving-focus
# the headless control: 1/1, exit 0, unchanged check count (all checks green)

nub apps/playground/dist/live/run.js --list | rg '^live-roving-focus$'
# prints the id; exit 0, no window

nub apps/playground/dist/live/run.js --only live-roving-focus
# exit 0; reports 1/1; writes apps/playground/.artifacts/live/live-roving-focus.png
```

Expected: the new scenario is green on the first or second run. If a check
fails, read the measured value before changing an assertion — a genuine
difference is a finding and belongs in the plan, not in a widened tolerance.

## 5. Test plan (the test must be able to fail)

The scenario is the test. Prove it fails without each load-bearing piece, then
revert every mutation:

| # | Mutation | Observed |
| - | -------- | -------- |
| M1 | Remove the `focusIndex(renderer, …, 5)` call from the `roving-focus-5` click | `a component focus call reaches a never-clicked row: expected "roving-row-5", got "roving-focus-5"`, exit `1` |
| M2 | Focus only while the target index is `< 4` in `onVirtualKey` (a targeted stand-in for a lost delivery) | `focus keeps moving after the window moved: expected "vrow-4", got "vrow-3"`, exit `1` |
| M3 | Remove the wrapper `testId` and point the wheel at `vlist-focus` | the hover verb fails first: `AutomationError: Element has no painted bounds`, exit `1` — this is why the wrapper exists |
| M4 | Change the wheel from `-1200` to `-40` | `the wheel unpaints a row that was painted: expected false, got true`, exit `1` |
| M5 | Click `roving-focus-5` before the wheel, moving native focus off the virtual row | `focus stays on the scrolled-out row: expected "vrow-3", got "roving-row-5"`, exit `1`; the straggler-paint check then fails too |

**Null results:** `-120` and `-20` both passed. Focusing a virtual row already
reveals it (plan `166`), so the window is anchored at `vrow-3` before the wheel
and row 0 is *already* unpainted — the original "row 0 unpainted" lever was
vacuous. The scenario now asserts the anchor moved and that `virtual row 4`, a
row painted before the wheel, leaves the window. Record null results rather
than inventing a stricter check.

Then:

```sh
nub run check
nub run lint
nub run test
nub apps/playground/dist/smoke/run.js          # full headless suite (cross-cutting registry change)
```

Expected: `check`/`lint`/`test` green; the full headless registry passes with
the same scenario count and the same total plus zero (no headless check
changed). Do **not** run the full live suite: it is the merge/release gate
(plan `517`), and this change does not alter a registered live id's contract.
Record the exact focused ids run.

## 6. Measured record

Run on 2026-10-19 against the release-tag `darwin-x64` binding
(`gpuix 9fcd6288`, `zed 81c99f81`, runtime shaders):

- `live-roving-focus` is **28 checks**, green on three focused runs (~2.1 s
  each), exit `0`; screenshot written.
- A real click focuses `roving-row-2`; Down moves native focus **and** the
  roving index to `roving-row-3`; Enter activates `3`.
- `roving-focus-5`'s component-owned `renderer.focusElement` moves focus to
  `roving-row-5` (never clicked) and the next Up lands on `roving-row-4`.
- A click focuses `vrow-2`; Down moves to `vrow-3`. The list is **already
  anchored at 3** after the focus move.
- A real `-1200` wheel moves the anchor forward, unpaints `virtual row 4`,
  keeps native focus on `vrow-3`, and keeps `virtual row 3` painted. The next
  Down reaches the focused row and moves to `vrow-4` (`vactive=4`). Scrolling
  back and clicking `vrow-2` restores the path.
- The headless control `roving-focus` stays 1/1 green after the additive
  `testId`.

## 7. STOP conditions

Stop and report instead of improvising if any of these is true:

- `nub run --filter playground build` fails;
- the headless control `roving-focus` changes its check count or fails after
  the additive `testId`;
- `live-roving-focus` cannot focus a virtual row that is off the painted
  window (i.e. step 8 reports `vrow-3` absent from `paintedText()`), because
  that contradicts plan `158` and must be investigated as a runtime finding,
  not papered over;
- a mutation in §5 cannot be expressed without changing more than one file;
- the live run exits `2` (no window): the host is not usable, so no evidence.

## 8. Acceptance criteria

- `live-roving-focus` is registered, green focused, and exits `0`.
- The headless control `roving-focus` is unchanged and green.
- All five mutation proofs are observed and reverted; null results are recorded.
- `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md` and the plan index
  name the new id and the measured live facts.
- `nub run check`, `nub run lint`, `nub run test` and the full headless suite
  pass. The full live suite is not claimed.
- One commit on `agent/playground`, pushed to `origin`.

## 9. Ledger wording

> **Live (`live-roving-focus`, plan `637`, 28 checks):** a real click focuses a
> row, Down moves native focus and the roving index, and Enter activates it; a
> component's own `renderer.focusElement` focuses a row that was never clicked
> and the next key is delivered there; after a real wheel moves the virtual
> window past the focused row (`vrow-3`), native focus stays on it, the row
> stays painted, and the next Down still moves focus to `vrow-4`. The painted
> set is the window **plus** the focused row. Focus can be restored after
> scrolling back. **Measured:** focusing a virtual row already reveals it, so
> the pre-wheel anchor is `3`; the wheel is asserted on the anchor and on a
> previously painted row leaving the window, not on row 0.

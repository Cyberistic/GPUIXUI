# Plan 172 — drag edge auto-scroll and the reorder target

**Workstream:** `playground` (`apps/playground`, `packages/testing`).
**Phase:** B → D/E (Tier 4: detachable / movable tabs, docking, drag and drop).
**Depends on:** plans `100`, `110`, `120`, `140`, `162`, `165`.

## 1. Why this plan exists

`COMPONENTS.md` says the drag-and-drop and detachable-tab rows are still `todo`
because GPUix has **no drag host feature**: `drag-targets` measured a captured
gesture (every move and the up stay on the source), a **frozen hover** during the
drag, and a gesture-ending click on the source. The component therefore has to
hit-test the pointer itself.

Two questions remain unmeasured, and a movable tab strip or a reorderable list
cannot be designed without them:

1. **Does a captured drag scroll a container when the pointer is held near its
   edge?** The `TestRenderer` docs mention "list edge scroll" only in
   `advanceTime`, and nothing in the repo has driven it. If it works, a reorder
   is a drag plus a hold. If it does not, the component owns an edge-scroll loop
   (`renderer.scrollTo` on each move).
2. **Can component code scroll the container mid-gesture without losing the
   capture or the drop?** That is the fallback, and it is only a fallback if it
   is proven.

The probe answers both by building the reorder mechanism itself: a real press,
held moves, an edge-scroll loop and a release, with the drop index computed from
the pointer and the current offset.

## 2. What is built

One scenario, `drag-autoscroll` (capability `drag`), in
`apps/playground/src/scenarios/drag-autoscroll.tsx`.

### 2.1 The host verbs

The existing `drag(testId, dx, dy)` runs a whole gesture and releases. An
edge-hold needs the halves, so `SmokeHost` gains three verbs (and the adapter
calls `nativeSimulateMouseDown` / `nativeSimulateMouseMove(..., 0)` /
`nativeSimulateMouseUp`):

- `press(testId)` — primary down at the element's centre;
- `movePointer(x, y)` — a move with the primary button held;
- `releasePointer(x, y)` — the matching up.

### 2.2 The view

`DragScrollProbe` mounts two lists, 60 rows each, 24 px per row, in 180 px
viewports:

- `drag-plain` — `overflowY: "scroll"`, **no** edge loop. Press row 0, hold at
  the bottom edge, `advance(600)`, then read `drag-plain-offset`. This measures
  the runtime's own behaviour; the check asserts whatever is measured (see §5).
- `drag-reorder` — the same list, but its `onMouseMove` owns the edge loop:
  within 24 px of the bottom edge it calls
  `renderer.scrollTo(id, 0, currentY - 24)`; within 24 px of the top edge,
  `currentY + 24`. It also records the **drop index** derived from the pointer
  and the current offset (`floor((pointerY - top + -offsetY) / 24)`), which is
  what a reorder component needs.
- A source row `drag-source` in `drag-reorder` logs `down`, `move`, `up` and the
  gesture-ending `click` to `drag-log`, so capture and the click trap are
  re-measured in this gesture.
- Readouts: `drag-reorder-offset`, `drag-drop-index`, `drag-log`,
  `drag-builtin-offset` (the plain list's result, so the measured fact is in the
  report even when the check asserts a bound).

### 2.3 The steps

1. Press `drag-source`, then `movePointer` to the reorder list's bottom edge and
   `advance(0)`: the offset is negative (the loop scrolled) and the drop index
   is a row near the bottom of the viewport, not row 0.
2. Two more held moves at the same point scroll by another row each: the offset
   changes while the pointer does not, which is the "hold to scroll" contract.
3. Move to the top edge: the offset moves back toward 0 and the drop index
   decreases.
4. Release: `drag-log` contains `up`, the source still received every `move`
   (capture survived the scroll), and the gesture ends in a `click` on the
   source (the trap the component must swallow).
5. The plain list: press, hold at the bottom edge, `advance(600)`. The readout
   records the runtime's built-in result; the check asserts it (branch in §5).
6. The drop index is derived, not guessed: after the loop scrolled by N px, the
   index equals `floor((edgeY - top + N) / 24)` within one row.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `packages/testing/src/smoke.ts` | `SmokeHost.press` / `movePointer` / `releasePointer` |
| `packages/testing/src/test-support.ts` | the three no-ops on `nullHost` |
| `apps/playground/src/smoke/host.ts` | the adapter for the three verbs |
| `apps/playground/src/scenarios/drag-autoscroll.tsx` | the probe view and steps |
| `apps/playground/src/scenarios/index.ts` | register the scenario (capability `drag`) |
| `apps/playground/src/smoke/run.test.ts` | assert the scenario is registered |
| `apps/playground/README.md` | suite count `40 → 41`; a drag-autoscroll section |
| `COMPONENTS.md` | the drag capability row, the Detachable / movable tabs and Drag and drop rows |
| `TODO.md` | tick the probe; progress |
| `.agents/slop/plans/README.md` | index this plan |
| `.agents/slop/plans/140-…` §4 | the drag row gains the measured facts |

## 4. Commands, and what each must produce

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter @gpuixui/testing test` | the host fixture compiles; existing tests green |
| `nub run --filter playground build` | clean build |
| `nub apps/playground/dist/smoke/run.js --only drag-autoscroll` | green, exit `0`, `drag=verified` |
| `nub apps/playground/dist/smoke/run.js` | `41/41 scenarios passed`, exit `0` |
| `nub run check`, `nub run lint`, `nub run test` | clean |

**Two-direction proof:** remove the `scrollTo` call from the reorder list's
`onMouseMove` and the run must exit `1` on the offset check
(`expected a negative offset`); restore it and the suite is green. Record both
outputs in §8.

## 5. STOP conditions and branches

- **The runtime's built-in edge scroll works** (`drag-plain`'s offset becomes
  negative after the hold): assert it (`offset < 0`) and record it as a runtime
  capability a component may rely on, while the reorder loop still proves the
  explicit path. This is the preferred outcome; a row may cite it.
- **The built-in edge scroll does not happen** (offset stays 0): assert exactly
  `0` and record the measured limitation. The component-owned loop in
  `drag-reorder` then carries the capability. Do not fail the suite for the
  runtime being honest; the scenario asserts what it measured, with the plan
  and `COMPONENTS.md` naming the limitation.
- **`scrollTo` during a captured gesture loses the capture** (the source gets no
  further moves, or the `up` does not arrive): record it. A component must then
  scroll on a timer while the pointer is held; if the capture is lost either
  way, the measured statement is "edge scrolling during a captured drag is not
  feasible on 0.10.0" with the evidence, and the affected rows stay `todo`.
- **The drop index cannot be derived from the offset** (the painted row and the
  computed index disagree): record the painted rows and the computed index,
  then assert the painted row as the drop target instead; the honest contract is
  what paints.
- **A change outside the owned paths is required**: record it in `TODO.md` and
  do not edit it.

## 6. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `drag-autoscroll` | native smoke | a capture lost on scroll; a loop that scrolls but reports a stale drop index; a click that leaks after a reorder; a built-in scroll that regresses |
| two-direction run (§4) | native smoke | the offset check passing when the component never scrolls |
| `scenarioProblems` / registration | unit (`apps/playground`) | the scenario falling out of the registry |
| full suite | native smoke | the new gesture disturbing later scenarios |

## 7. Acceptance criteria

- `drag-autoscroll` is registered, green, and its measured facts are recorded in
  §8, the app README and `COMPONENTS.md`.
- The built-in edge-scroll question is answered with a number, not a guess.
- The suite is **41/41**, exit `0`; the two-direction proof is recorded.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 8. Outcome

Executed on this host on 2026-10-17; **41/41 green**, exit `0`, `drag=verified`
in `.artifacts/smoke-report.json`. `drag-autoscroll` records **16 checks**.

Measured facts (also in plan `140` §4, `COMPONENTS.md` and the app README):

- **The runtime does not auto-scroll a held drag.** The plain list's source
  received the held move (the log proves the gesture was live), the pointer sat
  6 px from the bottom edge for `advance(600)`, and `getScrollOffset` stayed
  `0`. This is the answer to the plan's first question, and it is the opposite
  of what the `advanceTime` documentation's "list edge scroll" wording
  suggests.
- **A component-owned loop works and keeps the gesture.** One
  `renderer.scrollTo(id, 0, y - rowHeight)` per held move inside the 24 px
  bottom band moved the offset `0 → -24 → -48 → -72`; a held move at the top
  edge moved it back to `-48`. The source still received every move and the
  `up`, so scrolling mid-gesture does not lose the capture.
- **The pressed element must declare `onMouseMove`.** The first implementation
  put the handler on the scroll container only; the renderer delivered **no
  move** to it (the first check failed `expected -24, got 0`). Moving the
  handler onto the source row — the element that received the press — made the
  events arrive. Moves captured by a drag do not reach a container handler, so a
  reorder puts its loop on the dragged item (or delegates from it).
- **The drop index is derivable and follows the scroll.** With
  `floor((viewY - offset) / rowHeight)` the index was positive at the bottom,
  decreased after the top-edge scroll, and stayed within `0…59`.
- **The gesture still ends in a click on the source** after the held scrolling,
  re-measured here: a reorder must swallow it (plan `162`'s trap).
- **One window, no detach.** While checking the neighbouring Tier 4 question,
  the published `@gpuix/native@0.10.0` surface has one app window
  (`WindowOptions` on `render`) and no `openWindow`; a "detached" tab cannot be
  a new OS window in this version. Recorded in `COMPONENTS.md` with the
  type-level evidence; no scenario was added for it because the `TestRenderer`
  is single-window.

Two-direction proof: replacing
`if (delta !== 0) renderer?.scrollTo?.(instance.id, 0, next);` with an empty
branch made the run exit `1` with
`a held bottom-edge move scrolls one row: expected -24, got 0` and
`drag=failed`; restoring the call made it green again (exit `0`). The check
reads `getScrollOffset`, not the component's readout, so a readout-only lie
cannot pass.

No change outside the owned paths. The new host verbs (`press`, `movePointer`,
`releasePointer`) are the smallest seam that can express a held gesture; `drag`
still runs a whole gesture for the existing probes.


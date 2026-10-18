# Plan 391 — a reorderable list: the drop rule, keyboard move and cancel

**Workstream:** `playground` (`apps/playground`, `packages/testing`).
**Phase:** D/E (Tier 5: drag and drop; it closes the composition half of the
inventory row).
**Depends on:** plans `100`, `110`, `120`, `140`, `152`, `158`, `162`, `172`,
`182`, `189`, `190`, `197`, `335`.

## 1. Why this plan exists

`COMPONENTS.md`'s **Drag and drop** row is `todo | partial (probe)`. Two probes
measure the *ingredients*:

- `drag-targets` (plan `162`): pointer capture keeps every move and the up on
  the pressed element, **hover is frozen** during the drag, and the gesture ends
  in a **click on the source**;
- `drag-autoscroll` (plan `172`): the runtime does **not** scroll a held drag at
  an edge, a component-owned `renderer.scrollTo` loop does, the move handler
  must live on the **pressed element** (a container handler receives nothing),
  and a drop index is derivable from the pointer plus the live offset.

Nothing measures the reorder itself. A list, a tab strip or a file tree still
needs answers to these questions, and each is a real failure mode rather than an
API question:

1. **The boundary → index rule.** A pointer gives an insertion *boundary*
   (`0…count`); removing the dragged item shifts every boundary after it. Does
   a drop at boundary 3 from index 0 mean index 3 (wrong, the classic off-by-one)
   or index 2?
2. **Does the list reorder exactly?** After the drop, does the moved row paint
   at `index * rowHeight`, and do the rows between it and its old place move by
   exactly one row?
3. **The gesture-ending click.** It is measured; is a distance threshold enough
   to suppress it, and does the click still reach the source after the rows moved?
4. **Cancel.** Can a drag be cancelled by Escape with no reorder and no
   indicator left behind, and is the window handler the reliable route when the
   press did not focus the handle?
5. **Keyboard parity.** Can a focused handle lift, move with arrows, drop with
   Enter and cancel with Escape, and does native focus stay on the moved row?
6. **Virtualized rows.** Does `<virtual-list>` reorder keyed children, or does it
   need a generation-keyed remount? This decides whether a file tree's reorder
   is affordable.

This plan answers them with one headless scenario, one live twin and a pure
model.

## 2. What is built

### 2.1 New capability

`packages/testing/src/smoke.ts` — add `"reorder"` to `CAPABILITIES`. It is a
distinct verdict from `drag`: `drag` covers pointer capture and drops, `reorder`
covers applying an order change. Add the same literal to
`PROBE_CAPABILITIES` in `apps/playground/src/scenarios/index.ts` so
`scenarioProblems` requires a scenario for it.

### 2.2 The pure model — `apps/playground/src/scenarios/reorder-model.ts`

Every rule is pure and shared by the view, the steps and the unit tests.

```ts
/** An insertion boundary: 0 = before the first row, count = after the last. */
export const insertionAt = (
  pointerOffsetY: number, // event.y − list top (window coordinates)
  contentOffset: number, // content scrolled, POSITIVE (renderer offset is negative)
  rowHeight: number,
  count: number,
): number =>
  Number.clamp(Math.round((pointerOffsetY + contentOffset) / rowHeight), {
    minimum: 0,
    maximum: count,
  });

/** The index the item ends at after removing it at `from`. */
export const dropIndex = (
  from: number,
  boundary: number,
  count: number,
): number =>
  Number.clamp(boundary > from ? boundary - 1 : boundary, {
    minimum: 0,
    maximum: Math.max(0, count - 1),
  });

/** Move one item to the index it should occupy in the result. */
export const moveItem = <A>(
  items: ReadonlyArray<A>,
  from: number,
  to: number,
): ReadonlyArray<A> => // Arr.remove + Arr.insertAt; identity when from === to

/** `0`, `rowHeight`, … , `count * rowHeight` — the indicator's y in the list. */
export const indicatorY = (boundary: number, rowHeight: number): number =>
  boundary * rowHeight;

/** Arrow movement, clamped: 1 stays 1 at the top, count stays count at the end. */
export const nextBoundary = (
  boundary: number,
  delta: number,
  count: number,
): number => Number.clamp(boundary + delta, { minimum: 0, maximum: count });

/** `alpha,bravo,charlie` */
export const describeOrder = (items: ReadonlyArray<{ readonly id: string }>) =>
  Arr.join(Arr.map(items, (item) => item.id), ",");
```

`moveItem` uses `Arr.remove` then `Arr.insertAt` (which returns
`Option<NonEmptyArray>`); a failed insert returns the removed list rather than
throwing. `from === to` returns `items` unchanged (identity is part of the
contract: the probe asserts the reference does not change on a no-op).

### 2.3 The view — `apps/playground/src/scenarios/reorder.tsx`

Export `ReorderProbe` so the live twin mounts the same tree.

**Section A — a plain list.** Eight items with fixed ids:
`alpha, bravo, charlie, delta, echo, foxtrot, golf, hotel`.

- `reorder-list` — a `position: "relative"` column of 8 rows, `ROW_HEIGHT = 32`,
  width 280, no scroll.
- `reorder-row-<id>` — a 32 px row, `testId` stable per id, **`key={id}`**.
- `reorder-handle-<id>` — a 24 px drag handle inside the row, `tabIndex={0}`,
  `role="button"`, `aria-label={`Reorder ${id}`}`. **The handle owns every
  pointer handler**, because plan `172` measured that a captured move never
  reaches a container handler.
- `reorder-indicator` — an absolute 2 px line inside `reorder-list`, at
  `indicatorY(boundary, ROW_HEIGHT)`, `backgroundColor: theme.colors.primary`,
  `pointerEvents: "none"`. Rendered only while a drag or keyboard lift is
  active.
- Readouts:
  - `reorder-order` — `describeOrder(items)`.
  - `reorder-state` — `drag=<id|none> boundary=<n|none> activations=<n>
    suppressed=<n> mode=<none|pointer|keyboard>`.
  - `reorder-log` — append-only `>`-joined events (`down:alpha`, `move:3`,
    `up:alpha`, `click:alpha`, `suppressed:alpha`, `cancel`, `lift:alpha`,
    `step:1`, `drop:2`).

State (one `useState` object, so one commit per move):

```ts
interface Drag {
  readonly id: string;
  readonly from: number;
  readonly boundary: number;
  readonly mode: "pointer" | "keyboard";
  readonly moved: boolean;
}
```

Pointer path:

- `onMouseDown(handle)` → `{ id, from: indexOf(id), boundary: index, mode:
  "pointer", moved: false }`, log `down:<id>`.
- `onMouseMove(handle)` (only while `drag.mode === "pointer"`) → compute
  `boundary = insertionAt(event.y − listTop, -scrollY, ROW_HEIGHT, count)`.
  `moved` becomes true when `Math.abs(pointerY − pressY) > 2` (a 2 px
  threshold: a click must not reorder). Store the press point in a `useRef`.
  Log `move:<boundary>` only when the boundary changes (the log stays readable).
- `onMouseUp(handle)` → if `drag.moved`, commit `moveItem(items, from,
  dropIndex(from, boundary, count))` and set `suppressClick.current = true`; if
  not moved, clear the drag without a change. Log `up:<id>` then `drop:<index>`
  or `cancel`.
- `onClick(handle)` → log `click:<id>`; if `suppressClick.current` then clear it,
  log `suppressed:<id>` and do **not** increment `activations`; otherwise
  increment `activations` (a plain click on a handle activates nothing, but the
  counter proves the suppression path).
- A window key handler (`useWindowKey`) and the handle's `onKeyDown` both handle
  `Escape` while a drag is active: clear the drag, log `cancel`. Escape must work
  even if the press did not focus the handle.

Keyboard path (the handle's `onKeyDown`):

- `Enter` (or `Space` down) with no drag → lift at the item's index
  (`mode: "keyboard"`, `boundary: index`), log `lift:<id>`.
- `ArrowDown`/`ArrowUp` while lifted → `nextBoundary(boundary, ±1, count)`, log
  `step:<boundary>`.
- `Enter` while lifted → commit `moveItem(items, from, dropIndex(...))`, log
  `drop:<index>`. Keep the handle focused: store each handle's `PublicInstance`
  in a ref and call `renderer.focusElement(id)` after the commit **if** native
  focus did not follow the keyed move. The probe prints `focused=<id|none>` in
  `reorder-state` so the measured behaviour is in the report either way.
- `Escape` while lifted → cancel, log `cancel`.

`listTop` comes from a `ref` on `reorder-list` and
`renderer.getElementBounds(instance.id)` (the docking/`drag-autoscroll`
recipe). `scrollY` is `renderer.getScrollOffset(instance.id)?.[1] ?? 0`; the
plain list does not scroll, but the same view serves the virtual section.

**Section B — a virtualized list.** 60 rows, ids `v-0 … v-59`, `V_ROW_HEIGHT =
24`, a 240 px viewport:

- `reorder-v-list` — `<virtual-list estimatedItemHeight={24}>`; rows
  `reorder-v-row-<id>` with handles `reorder-v-handle-<id>`; `key={id}`.
- `reorder-v-order` — `describeOrder(vItems)`.
- The same pointer handlers, with `ROW_HEIGHT = 24` and `contentOffset =
  -getScrollOffset(list)`.

The virtual section is **one drop inside the painted window** (row `v-0` to
boundary 5). Edge scrolling is already measured by plan `172` and is not
repeated.

### 2.4 The headless scenario

`list-reorder`, capability `reorder`, title
`"Reorder: drag, keyboard and the drop rule"`. Steps, in order:

1. `reorder-order` reads `alpha,bravo,charlie,delta,echo,foxtrot,golf,hotel`;
   `reorder-indicator` has no bounds.
2. **A click is not a drag.** `click("reorder-handle-alpha")` → order unchanged,
   `activations=1`, `boundary=none`, no indicator.
3. **Drag down.** `press("reorder-handle-alpha")`; `movePointer` to the list's
   x centre and `listTop + 2 * 32 + 24` (the lower half of row 2 → boundary 3);
   `advance(0)`. Assert `boundary=3`; the indicator's painted `y` equals
   `listTop + 96` within 1 px; `dragging=alpha`.
4. **Drop.** `releasePointer` at the same point; `advance(0)`. Assert the order
   is `bravo,charlie,alpha,delta,echo,foxtrot,golf,hotel` — **`alpha` at index
   2, not 3**. Row `reorder-row-alpha` paints at `listTop + 64` (±1); `bravo`
   at `listTop`; `delta` stays at `listTop + 96`. `activations` is still `1`,
   `suppressed=1`, and `reorder-log` contains `click:alpha` and
   `suppressed:alpha` (the trap is real and the guard is what stops it).
5. **Drag to the top.** Press `reorder-handle-alpha` (now row 2), move to the
   list's y + 4 (boundary 0), release. Order is the original again; `alpha`
   paints at `listTop`.
6. **Cancel.** Press `reorder-handle-bravo`, move to row 5, then `key("escape")`
   and `advance(0)`: the order is unchanged, `boundary=none`, the indicator has
   no bounds, and the log contains `cancel`. Release the pointer afterwards.
7. **Keyboard.** `ctx.host.focusNext()` until `focused =
   reorder-handle-alpha` (the handles are the only tab stops; use a bounded loop
   or a direct `focusNext` when the list starts it). `keyDown("enter")` lifts;
   assert the indicator at `alpha`'s index. `keyDown("arrowdown")` twice →
   `step:2`; `keyDown("enter")` drops → order has `alpha` at index 1 (boundary 2
   from index 0 → 1); `focused` is still `reorder-handle-alpha`; the row paints
   at `listTop + 32`.
8. **Virtual reorder.** Read `reorder-v-order` starts `v-0,v-1,…`. Press
   `reorder-v-handle-v-0`; move to `vListTop + 5 * 24 + 12` (boundary 5);
   release. Assert `reorder-v-order` is `v-1,v-2,v-3,v-4,v-0,v-5,…` and
   `reorder-v-row-v-0` paints at `vListTop + 4 * 24` (±1). Assert the list still
   paints a window (`reorder-v-row-v-59` absent at rest, `v-0` present) and
   `listScrollTop` is `[0, 0, 240]`.
   - **Branch:** if the keyed reorder does not move the painted row, remount the
     list with `key={generation}` at commit (one extra state field) and re-run.
     Record which route the runtime required in §9 and the README; the scenario
     asserts the painted outcome, not the route.
9. `screenshot("apps/playground/.artifacts/screenshots/list-reorder.png")` (the
   CLI does this only with `--screenshots`; use the existing `ctx` helper).

Every assertion reads a readout, painted text or `bounds`; no screenshot is an
assertion.

### 2.5 The live twin — `live-reorder`

Mount `ReorderProbe` in the real 1100 × 720 window (the plan-189 runner).

1. `drag("reorder-handle-alpha", 0, 80, 6)` (six paced moves; row 0 centre +
   80 → boundary 3) then `settle`; assert `reorder-order` is
   `bravo,charlie,alpha,…`, `activations=0`, and `reorder-row-alpha` paints at
   the index-2 y (±2 px live).
2. Click is not a drag: `click("reorder-handle-bravo")`, `settle`: order
   unchanged, `activations=1`.
3. Keyboard: `click("reorder-handle-alpha")` to focus (activations becomes 2),
   `key("enter")` lifts, `key("arrowup")` once, `key("enter")` drops; assert
   `alpha` is at index 0 and focus is on `reorder-handle-alpha` (bounded
   `waitForFocus`, 3 s).
4. Cancel: press-drag via `drag` cannot be cancelled mid-way through the
   protocol (it is one call), so the live cancel uses the keyboard: lift with
   Enter, `key("arrowdown")`, `key("escape")`; the order is unchanged and the
   indicator has no bounds.
5. `screenshot(`${LIVE_ARTIFACTS}/live-reorder.png`)`.

Live count: aim for 12–16 checks.

## 3. Exact files

| File | Change |
| ---- | ------ |
| `packages/testing/src/smoke.ts` | add `"reorder"` to `CAPABILITIES` |
| `apps/playground/src/scenarios/reorder-model.ts` | **new** — the pure rules |
| `apps/playground/src/scenarios/reorder-model.test.ts` | **new** — unit tests |
| `apps/playground/src/scenarios/reorder.tsx` | **new** — `ReorderProbe`, `list-reorder` |
| `apps/playground/src/scenarios/index.ts` | import + register + `"reorder"` in `PROBE_CAPABILITIES` |
| `apps/playground/src/live/scenarios.tsx` | import `listReorderScenario`'s view and add `live-reorder` to `liveScenarios` |
| `apps/playground/src/smoke/run.test.ts` | assert the registry contains `list-reorder` |
| `apps/playground/README.md` | 90 → 91 headless, 41 → 42 live, `reorder=verified`, a Reorder section and the structure lines |
| `COMPONENTS.md` | capability table row; **Drag and drop** row gains the reorder contract |
| `PLAN.md` | D59 decision row |
| `TODO.md` | tick the new item under the playground workstream |
| `.agents/slop/plans/README.md` | index this plan and status |
| `.agents/slop/plans/140-gpuix-native-darwin-x64-build.md` §4 | the measured reorder row |

No other path is touched. A required change elsewhere is recorded in `TODO.md`.

## 4. Commands, and what each must produce

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter playground test` | model tests green; registry test green |
| `nub run --filter playground build` | clean build, exit `0` |
| `nub apps/playground/dist/smoke/run.js --only list-reorder` | green, exit `0`, `reorder=verified`, 35–45 checks |
| `nub apps/playground/dist/smoke/run.js` | `91/91 scenarios passed`, exit `0`, every prior capability still verified |
| `nub apps/playground/dist/live/run.js --only live-reorder` | green, exit `0` (if the flag is supported; otherwise run the whole live suite) |
| `nub apps/playground/dist/live/run.js` | `42/42`, exit `0`; two consecutive green runs because a live run races timers |
| `nub run check` | clean |
| `nub run lint` | clean |
| `nub run test` | clean |

The baseline recorded before this plan: headless `90/90`, exit `0`.

**Two-direction proofs** (record each command's output in §9):

- **M1 — the boundary adjustment.** Replace `boundary > from ? boundary - 1 :
  boundary` with `boundary` in `dropIndex`; the unit test expecting index 2
  fails, and `list-reorder` fails on the order (alpha at index 3). Restore.
- **M2 — the click guard.** Remove the `suppressClick` branch; `list-reorder`
  fails with `activations=2` (or `suppressed=0`) on the drop step. Restore.
- **M3 — the pointer-derived boundary.** Hard-code `boundary` to `from` in
  `onMouseMove`; the indicator check fails (`expected listTop + 96`). Restore.
- **M4 — cancel.** Remove the `Escape` branch; the cancel step fails on the
  order or on the indicator still painting. Restore.
- **M5 — the live keyboard.** Make the arrow step a no-op; `live-reorder` fails
  on the order after the keyboard drop. Restore.

## 5. STOP conditions and branches

- **The keyed virtual reorder does not paint.** Branch in §2.4 step 8: remount
  with a generation key, re-run, and record that a virtual reorder requires a
  remount (with the measured reason). Assert the painted outcome. Do not claim
  keyed reorder works if it does not.
- **Focus does not follow a keyed move.** Call `renderer.focusElement` after the
  keyboard commit. The scenario still asserts that focus ends on the moved
  handle. Record in §9 that the runtime required an explicit refocus.
- **A pointer move never reaches the handle.** Re-read plan `172` §8: the move
  handler must be on the pressed element. Do not move it to the list container
  (measured to receive nothing) and do not add a host verb.
- **The gesture-ending click does not fire live.** The live twin drops the
  suppression assertion and records the difference; the headless one keeps it.
  Do not invent a click.
- **The indicator's absolute y is off.** Check the positioned ancestor: the
  indicator must be a child of `reorder-list`, which must set `position:
  "relative"` (the docking recipe). If it is still off, assert the measured
  offset and record the cause.
- **A capability or host verb must be added to `packages/testing` beyond
  `"reorder"`.** STOP and record it: the host contract is shared with every
  suite, and a new verb needs its own plan.
- **The live window does not open.** That is exit `2` (no evidence); report it
  and keep the headless result. Never report a live pass that did not run.

## 6. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `insertionAt` boundaries (0, row centre, below the last row, clamped) | unit | a boundary that ignores the pointer or the scroll |
| `dropIndex` down/up/no-op/clamp | unit | the off-by-one when the item is removed (M1) |
| `moveItem` down/up/no-op/identity | unit | a splice that duplicates or drops an item |
| `indicatorY` and `nextBoundary` | unit | the indicator not matching the drop, an arrow walking past the ends |
| `list-reorder` steps 1–8 | native smoke | any of the pointer, suppression, cancel or keyboard rules regressing |
| `scenarioProblems` registration | unit | the scenario or capability falling out of the registry |
| `live-reorder` | live smoke | the drag or keyboard path not surviving a real window |
| full headless + live suites | native smoke | the new gesture leaking state into later scenarios |

The model tests are a deliberate pair: `dropIndex(0, 3, 8) === 2` (down) and
`dropIndex(5, 2, 8) === 2` (up). A single-direction test lets M1 pass.

## 7. Acceptance criteria

- `list-reorder` is registered, green, and reports capability `reorder`.
- `live-reorder` is green in a real window.
- The five mutation proofs are recorded in §9 with the command output.
- `COMPONENTS.md`'s Drag and drop row cites the measured reorder contract (or
  the precisely measured limitation, if the virtual branch required one).
- `apps/playground/README.md` counts and capability line are current.
- `nub run check`, `nub run lint`, `nub run test` pass; the full headless and
  live suites are green.

## 8. Executor checklist

1. Write the plan row in `.agents/slop/plans/README.md` before coding.
2. `reorder-model.ts` and its tests first; run `nub run --filter playground
   test` and see them fail against a stub, then pass.
3. Build the view; run `--only list-reorder`; iterate on `bounds`, never on
   guessed pixels.
4. Add the live twin only after the headless scenario is green.
5. Run the full suites, then the mutation proofs, restoring each mutation.
6. Update the docs, tick `TODO.md`, commit; push the branch.

## 9. Outcome

Executed on this host on 2026-10-18. **Headless `91/91` green (3124 checks),
exit `0`, `reorder=verified`; live `42/42` (858 checks), exit `0`, in two
consecutive full runs.** `list-reorder` records **36 checks**, `live-reorder`
**19**, and the pure model **16 tests**. `nub run check`, `nub run lint` and
`nub run test` pass.

Measured facts (also in plan `140` §4, `COMPONENTS.md` and the app README):

- **The boundary rule is the drop rule.** A drag from index 0 to the lower half
  of row 2 names boundary 3 and lands at **index 2**; `alpha` paints at
  `listTop + 64` and `delta` (index 3) stays at `listTop + 96`, both within 1 px.
  With the adjustment removed, the row lands at index 3
  (`bravo,charlie,delta,alpha,…`) and the unit test reads `expected 3 to be 2`.
- **A click is not a drag.** A click on a handle takes native focus and counts
  one activation; it moves nothing. A press commits only after more than 2 px of
  travel, so a click never opens an indicator.
- **The gesture-ending click is real and must be suppressed.** After a drop the
  source still receives `click:alpha`; without the distance guard the same step
  reads `activations=2` instead of `1`. The guard is per gesture and cleared by
  that click.
- **Escape cancels through the window handler.** A held pointer drag whose press
  did not focus the handle still cancels: the indicator leaves, the order is
  unchanged and `cancel` is in the log.
- **Keyboard is parity.** Enter lifts at the item's boundary, two ArrowDowns
  move it to 2, Enter drops at index 1 through the same rule. **Native focus
  follows the keyed move without an explicit `renderer.focusElement`:** with the
  refocus disabled the scenario still passes, so that call and the
  `MutableHashMap` handle registry were deleted rather than kept as ceremony.
- **A virtualized list reorders keyed children in place.** 60 rows, `v-0`
  dropped at boundary 5 gives `v-1…v-4, v-0, v-5…`, the moved row paints at
  `index * 24` within 1 px, every row survives, and the anchor stays
  `[0, 0, 240]`. **No generation-keyed remount was needed.**
- **A real-timer close needs a bounded wait.** `live-preview` failed twice under
  full-suite load with `open=true closes=0` (the 200 ms grace close had not run
  after a fixed 300 ms sleep). The close is now awaited (`waitForText`, 3 s)
  before it is asserted; a close that never happens still fails. Two consecutive
  green live runs after the change.

Mutation proofs (each restored after the run):

| Mutation | Command | Observed |
| -------- | ------- | -------- |
| M1 — remove the boundary adjustment | `nub run --filter playground test`; `… smoke/run.js --only list-reorder` | 2 unit failures (`expected 3 to be 2`); smoke exit `1`, `a downward drop lands one index earlier than the boundary: expected "bravo,charlie,alpha,…", got "bravo,charlie,delta,alpha,…"` |
| M2 — disable the click guard | `--only list-reorder` | exit `1`, `the gesture-ending click did not activate the row: expected "1", got "2"` |
| M3 — ignore the pointer's y | `--only list-reorder` | exit `1`, `the pointer names boundary 3: expected "3", got "0"` |
| M4 — ignore Escape | `--only list-reorder` | exit `1`, `the indicator leaves on cancel: expected true, got false` |
| M5 — make arrows a no-op | `--only list-reorder`; full `live/run.js` | headless exit `1`, `two steps move the boundary to 2: expected "2", got "0"`; live exit `1` on `live-reorder`, `the live keyboard drop applies the boundary rule: expected "bravo,alpha,charlie,…", got "bravo,charlie,alpha,…"` (the full live run also reproduced the `live-preview` flake, which is why the bounded wait landed) |

No file outside `apps/playground`, `packages/testing`, the docs/inventory and
this plan set was changed.


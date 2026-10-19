# 601 — `scrollIntoView` in a real window

**Owner:** playground workstream (`apps/playground`, `packages/testing`).
**Depends on:** `166` (`scroll-into-view`), `189` (the live runner), `190`/
`197` (the renderer the live host owns), `529` (the 0.10.0 bounds box), `534`
(`live-variable-rows`), `556` (`live-grid`), `559` (`live-tree`), `565`
(`focusNext`/`focusPrevious`), `571` (`live-log`).
**Phase:** F — a core scroll primitive with only `TestRenderer` evidence.

## 1. Why

`scroll-into-view` (plan `166`) is the probe for the last scroll contract the
library needs: a keyboard-selected row in a `<virtual-list>` must be brought
back into the paint, and 0.10.0 offers two routes — the element route
(`renderer.scrollIntoView(elementId)`) and the list route
(`renderer.scrollToItem(listId, index)`).

Every other scroll fact has a live twin: `live-scroll` (a wheel moves a
container), `live-table`/`live-variable-rows`/`live-tree` (`scrollToItem`
anchors a list), `live-log` (a bottom-aligned list follows appends) and
`live-grid` (a keyboard move pans a scroller). **The element route has never run
in a window**, and the live host does not even expose it: `Smoke.AsyncSmokeHost`
has no `scrollIntoView`, while the synchronous `SmokeHost` has had one since
plan `166`. The library's own `query-builder` probe calls
`node.scrollIntoView?.()`, so a consumer can reach this route today with
headless-only evidence.

What the live twin can settle:

- whether focusing a clipped virtual row **reveals it** in a window (the
  `TestRenderer` does; plan `566`'s plain scroller does not, and the tab strip
  does not either — plan `565` — so this is a real question);
- whether the explicit element route paints the target row and moves the list
  offset **backwards** from a deep anchor;
- whether the logical anchor agrees (`getListScrollTop`), and whether a scroll
  moves native focus (it must not);
- whether the keyboard follow (three `Down`s after a click) keeps the moved row
  painted in a real window.

What it cannot: colour and the AccessKit `Option` node (the live renderer
exposes no style or a11y method — plan `197`). Those stay headless claims.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `packages/testing/src/smoke.ts` | add `readonly scrollIntoView: (testId: string) => Effect.Effect<void, SmokeHostError>` to `AsyncSmokeHost`, beside `scrollToItem`, with the same JSDoc wording as the synchronous host. |
| `apps/playground/src/live/host.ts` | add `"scrollIntoView"` to the renderer `Pick` and implement the verb (`idOf` → `renderer.scrollIntoView`). |
| `apps/playground/src/live/scenarios.tsx` | import `scrollIntoViewScenario`; add `liveScrollIntoView` after `liveCollapsible` (or next to `liveTable`); add it to the exported `liveScenarios` list. |
| `apps/playground/src/scenarios/scroll-into-view.tsx` | **only if §5 says so**: call `renderer.scrollIntoView?.(id)` after `focusElement` in `focusRow`, which is what the file's header comment already promises. |
| `apps/playground/README.md` | the live table gains a `live-scroll-into-view` row; the live-registry count is derived again. |
| `COMPONENTS.md` | the `scroll` capability row cites the twin; the registry sentence moves to the derived count. |
| `PLAN.md` | one decision row with the measured result. |
| `TODO.md` | add the task and tick it with the measured check count and the exact focused ids. |
| `.agents/slop/plans/README.md` | index row `601`; the playground narrative records the number. |

No `packages/testing` type change beyond the interface member: `native.ts`
already implements `scrollIntoView` for the offscreen host and its adapter test
exists.

## 3. The async verb

```ts
scrollIntoView: (testId) =>
  verb(`scrollIntoView ${testId}`, () =>
    idOf(app, testId).then((elementId) => {
      renderer.scrollIntoView(elementId);
    }),
  ),
```

This mirrors `scrollToItem` exactly. Do **not** use the probe's own refs or a
second lookup path: the automation testId is the only address the scenario has,
and a missing id must fail as a `SmokeHostError` naming the verb, not silently.

## 4. `live-scroll-into-view`

Mount `scrollIntoViewScenario.view`, `ready: "siv-row-0"`. Use the existing
helpers (`settle`, `textOf`, `painted` is local to the headless file — define a
small `painted(ctx, row)` that reads `ctx.host.paintedText()`, as `live-content`
does). A live commit lands a frame later, so `settle` after every click/key and
`waitFor` before reading a row that a scroll should have painted.

1. **Mount.** `siv-readout` is `active=0`; `row 0` is painted; `row 199` is not.
   `scrollOffset("siv-list")` is `y = 0` (`± 1`).
2. **Focus reveals (measured).** Click `siv-row-0` to focus the list, press
   `end`. Expect `active=199`, `focused = siv-row-199`, the offset
   `y < -500`, the logical anchor near the last row
   (`anchor[0] + floor(anchor[2] / 32) >= 199`), the raw offset not past
   `-2000` (the tracker saturates before the last row's true offset), and
   **`row 199` painted**. This is the load-bearing measurement: if the window
   does not reveal on focus, go to §5.
3. **Home.** Press `home`: `active=0`, focus `siv-row-0`, `y ≈ 0` (`± 1`),
   `row 0` painted, anchor index `0`.
4. **The list route.** `scrollToItem("siv-list", 120)`: `y < 0`, `row 120`
   painted, anchor within `5` of `120`, selection still `active=0`.
5. **The element route.** `scrollIntoView("siv-row-10")`: the offset is
   `> atItem.y` (the list moved back toward the target), `row 10` painted, the
   anchor index `<= 12`. Then `scrollIntoView("siv-row-199")`: `row 199`
   painted and **focus is still `siv-row-0`** — a scroll is not a focus change.
6. **Keyboard follow.** Click `siv-row-10`; press `down` three times:
   `active=13`, focus `siv-row-13`, `row 13` painted. Each key settles first, as
   the live table's rows do.
7. Screenshot to `${LIVE_ARTIFACTS}/${liveScrollIntoView.id}.png`.

Expected: **~22 checks**. Record the measured count.

## 5. If focus does not reveal live

The headless probe's `focusRow` **only** calls `renderer.focusElement`; the
header comment says it then calls `scrollIntoView`, but the code does not. The
`TestRenderer` happens to reveal a focused clipped row by itself. If §4 step 2
shows that a window does not, that is the finding, not a reason to weaken the
check:

1. Add `renderer?.scrollIntoView?.(id)` after `focusElement` in `focusRow` (the
   behaviour the comment already describes).
2. Re-run the headless control `--only scroll-into-view`; it must stay green at
   the same check count.
3. Re-run the live twin; step 2 must now pass.
4. Record in §8 and `COMPONENTS.md` that focus alone does not reveal in a
   window, so the probe owns the reveal explicitly.

Do **not** add the call before measuring: the difference between "the runtime
reveals" and "the probe reveals" is the fact the twin exists to measure.

## 6. STOP conditions

- **STOP** if `scrollOffset("siv-list")` reports `null` in the window: the
  protocol has no offset for a virtual list, and the whole scroll contract is
  measured on a different surface. Record it.
- **STOP** if `focused()` cannot name `siv-row-199` (the live mapping is the
  plan-190 `testId` map). Do not loosen the check to "some row".
- **STOP** if `scrollIntoView` throws in the window (a renderer method that
  works offscreen but not live). Record the error and the id — the verb may need
  a different protocol route, but that is a plan change, not a silent skip.
- **STOP** if the element route leaves the target unpainted **after** §5's
  explicit call. That would mean the element route is broken live and the
  documented alternative is `scrollToItem`, which must be recorded as a
  limitation with the measured numbers.
- **STOP** if the headless control changes its check count for a reason other
  than §5; do not re-baseline silently.

## 7. Test plan (mutation proofs)

The scenario is the test. Apply each mutation alone, run the focused live
scenario, observe the failure, revert:

- **M1 (no element route):** remove the `scrollIntoView` call in the live host
  (make it a no-op) → step 5's offset/anchor checks fail while step 4 still
  passes; this is the proof the new verb is load-bearing.
- **M2 (wrong target):** call `scrollIntoView("siv-row-180")` in the scenario
  instead of `siv-row-10` → the `row 10` painted / anchor `<= 12` checks fail.
- **M3 (focus moves on scroll):** make the probe `focusRow(10)` inside the
  element-route step → the "scrolling does not move focus" check fails.
- **M4 (§5 path, only if taken):** remove the explicit `scrollIntoView` from
  `focusRow` and confirm step 2 fails again (the reverse proof).

After reverting, the focused live scenario must be green **twice in a row**, and
the headless control once.

## 8. Verification commands

```sh
nub run --filter playground build
nub apps/playground/dist/live/run.js --list | grep live-scroll-into-view
nub apps/playground/dist/live/run.js --only live-scroll-into-view
nub apps/playground/dist/smoke/run.js --only scroll-into-view
```

Expected: listed; `1/1`, exit `0`, one screenshot; the headless control stays
green at its current count.

End-of-task gate:

```sh
nub run check
nub run lint
nub run test
nub run --filter playground build
nub apps/playground/dist/smoke/run.js
```

Expected: all green; headless stays **103/103**. Derive the live registry count
with `--list | wc -l` (it is `84` before this twin).

The full live suite is the **merge/release gate**, not part of this task.

## 9. Acceptance

- `AsyncSmokeHost` exposes `scrollIntoView`, and the live host implements it.
- `live-scroll-into-view` exists, is listed, and is green twice in a row.
- The measured reveal/offset/anchor numbers are recorded in §10.
- The mutation proofs were observed failing and reverted.
- The ledger (`COMPONENTS.md`, `TODO.md`, `PLAN.md`, the README, this index)
  carries the result and the derived registry count.
- `check`, `lint`, `test` and the full headless suite are green.

## 10. Measured record

Filled by the executor.

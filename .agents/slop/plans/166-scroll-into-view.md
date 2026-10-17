# 166 — Plan: scroll a virtual row into view

| Field | Value |
| ----- | ------- |
| Status | landed (measured facts in §8) |
| Phase | B (feasibility) → feeds Tier 3 data grid, Tier 4 file tree / command palette, every keyboard-navigated list |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Depends on | `152` (virtual window), `158` (roving focus), `165` (roving index in a virtualized tree) |
| Feeds | `@gpuixui/components` menus/lists and any future data-grid / docking keyboard navigation |

## 1. Goal

`roving-focus` and `virtualized-tree` prove that a keyboard move can focus a row
outside the painted window. Neither proves the row then becomes **visible** —
which a command palette, a grid or a file tree must do, or the user's selection
disappears.

0.10.0 exposes two routes, and nobody has measured either inside
`<virtual-list>`:

1. `renderer.scrollIntoView(elementId)` (and `Instance.scrollIntoView?()`), the
   generic route;
2. `renderer.scrollToItem(listId, index, offsetInItem?)` (and
   `getListScrollTop`), the list-specific route.

This probe answers: which route actually moves a virtualized list, does the
scroll offset move, does the target row paint, and does native focus survive?

It also settled a fact the design depends on: **focusing a row already scrolls
it into view** inside `<virtual-list>`, so a keyboard move needs no explicit
scroll call; the explicit routes matter for jumps that do not move focus.

## 2. Scenario `scroll-into-view` (capability `scroll`)

New view `apps/playground/src/scenarios/scroll-into-view.tsx`: one
`<virtual-list>` of **200 rows** (row height 32, viewport 320×280 ≈ 8 painted),
a ref registry keyed by row index (the `roving-focus` pattern), and this key
contract on each row:

| Key | Result |
| ---- | ------ |
| Down / Up | active row moves by one, `focusElement` the new row (focus reveals it) |
| Home / End | active row becomes 0 / 199, focus it |

Readout: `active=<index>`. Rows are `role="option"`, `aria-selected`,
`tabIndex={active ? 0 : -1}`, label text `row <n>`, `testId` `siv-row-<n>`.

`SmokeHost` gains two members, both mapping a `testId` to its native id:

- `scrollIntoView(testId: string): void` → `renderer.scrollIntoView(id)`;
- `scrollToItem(testId: string, index: number): void` →
  `renderer.scrollToItem(id, index)`.

### Steps

1. At rest: `row 0` is painted, `row 199` is not, and `siv-offset` (read via
   `scrollOffset`) is 0.
2. `End` on the focused row 0 → `active=199`, `focused()` is `siv-row-199`, the
   offset is deeply negative, and **`row 199` is painted without any explicit
   scroll call** — if it is not, §8 records that focus does not reveal a virtual
   row and the handler must add `scrollIntoView`.
3. `Home` → `active=0`, focus `siv-row-0`, offset `≈ 0`, `row 0` painted.
4. **List route:** `scrollToItem("siv-list", 120)` → `row 120` is painted, the
   logical anchor (`getListScrollTop`) is `[120, 0, 280]`, and the active row is
   unchanged (`active=0`), proving the index route is independent of the row
   element and of focus.
5. **Element route without focus:** `scrollIntoView("siv-row-10")` while focus
   stays on row 0 → `row 10` is painted and the anchor returns to `[10, 0, 280]`.
6. **Keyboard follow:** from row 10 (clicked), three `Down` presses →
   `active=13`, focus `siv-row-13`, and `row 13` is painted.
7. **The end again by element:** `scrollIntoView("siv-row-199")` → `row 199`
   painted.
8. **Focus survives scrolling:** after step 7 the focused id is still
   `siv-row-13` (a scroll is not a focus change).

## 3. Exact file changes

| File | Change |
| ---- | ------ |
| `.agents/slop/plans/166-scroll-into-view.md` | this plan |
| `.agents/slop/plans/README.md` | index row for `166` |
| `packages/testing/src/smoke.ts` | `SmokeHost` gains `scrollIntoView`, `scrollToItem` |
| `packages/testing/src/test-support.ts` | the two inert members |
| `apps/playground/src/smoke/host.ts` | both map a `testId` (and an index) to renderer calls |
| `apps/playground/src/scenarios/scroll-into-view.tsx` | the view + the scenario |
| `apps/playground/src/scenarios/index.ts` | register it (capability `scroll`, already required) |
| `apps/playground/src/smoke/run.test.ts` | registry expectation gains the id |
| `apps/playground/README.md` | scenario count `31 → 32`; fact row and section |
| `COMPONENTS.md` | Virtualized lists/tables and File tree rows cite the route; capability table stays `scroll` |
| `TODO.md` | tick the task; suite count updated |

## 4. Commands and expected results

1. `nub run --filter @gpuixui/testing test` → exit `0`.
2. `nub run --filter playground check-types` → exit `0`.
3. `nub run --filter playground build` → exit `0`.
4. `nub apps/playground/dist/smoke/run.js --only scroll-into-view` → `1/1`,
   exit `0`, `scroll=verified`.
5. `nub apps/playground/dist/smoke/run.js` → **32/32**, exit `0`.
6. `nub run check`, `nub run lint`, `nub run test` → exit `0`.

## 5. STOP conditions

- **STOP** if `scrollIntoView` moves the scroll offset but the target row still
  does not paint. Record both; the generic route is then useless for a virtual
  list and components must call `scrollToItem` with the index they already know.
- **STOP** if `scrollIntoView` scrolls an ancestor instead of the list (offset
  unchanged, the scenario container moves). Record the offsets; a component
  must use `scrollToItem` / `scrollTo`.
- **STOP** if `scrollToItem` needs a second flush or a delay that the probe
  cannot express synchronously. Record the observation; the component contract
  gains `await`-equivalent semantics only if the runtime requires it.
- **STOP** if scrolling clears native focus. Record the focus id; a component
  must re-focus after the scroll.
- **DO NOT** substitute a manual `scrollTo` for `scrollIntoView` — the point is
  the API a component calls with an element id.

## 6. Test plan (two directions)

- The scenario fails if `End` focuses but does not reveal the row, if `Home`
  does not return, if `scrollToItem` does not paint the indexed row, or if a
  scroll drops focus.
- Two-direction proof, recorded in §8:
  1. make the host's `scrollIntoView` a no-op → the explicit
     `scrollIntoView painted the target row` check fails. Restore.
  2. call `scrollToItem("siv-list", 0)` instead of `120` → the painted-row and
     anchor checks fail. Restore.
  3. removing an explicit scroll call from the keyboard handler is **not** a
     failing direction: focus alone reveals the row (measured, §8). That is a
     fact about the runtime, not a weak test.
- `scenarioProblems` (unit, exists) stays green: `scroll` is already required.

## 7. Acceptance criteria

- `scroll-into-view` is registered, green, and the suite is **32/32**.
- The two two-direction proofs are recorded in §8.
- `COMPONENTS.md`, the app README and `TODO.md` cite the measured route.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 8. Measured facts

**Suite: 32/32 green on this host, exit `0`**, `scroll=verified` (now two
scenarios), with the 31 prior scenarios unchanged. `scroll-into-view` records
**34 checks**.

| Route | Measured |
| ----- | -------- |
| `focusElement(row 199)` (no scroll call) | **reveals the row**: painted, logical anchor `[191, 8, 280]`, raw offset `-1320` |
| `Home` → `focusElement(row 0)` | anchor `[0, 0, 280]`, raw offset `0` |
| `scrollToItem(list, 120)` | anchor `[120, 0, 280]` **exactly**, row 120 painted, selection untouched (`active=0`), focus untouched |
| `scrollIntoView(row 10)` without moving focus | anchor `[10, 0, 280]` **exactly**, row 10 painted, raw offset `-320` |
| focus after a later scroll | unchanged (`siv-row-13`) — a scroll is not a focus change |
| the focused row after scrolling away | stays painted (a straggler, same as `roving-focus`) |

The trap this probe records: **`getScrollOffset` is not the logical offset of a
`<virtual-list>`.** It saturated at `-1320` for a 200-row list at its end
(`row 199` painted) and read `-1312` at row 120. `getListScrollTop` is the exact
anchor — `[itemIndex, offsetInItemPx, viewportHeightPx]` — and is what a
component must read to remember or restore a position. `scroll-into-view`
asserts both the exact anchor and the saturation, so an upstream fix fails the
check by name.

The honest consequence for components:

- a keyboard move needs **`focusElement` only**; do not call `scrollIntoView`
  as well (it is harmless but redundant);
- a jump that does not move focus uses `scrollToItem(listId, index)` (exact) or
  `scrollIntoView(elementId)` (also exact for a retained virtual row);
- persistence reads `getListScrollTop`, never `getScrollOffset`.

**Two-direction proofs** (both run, outputs quoted):

1. making the host's `scrollIntoView` a no-op: **exit `1`**,
   `scrollIntoView painted the target row: expected true, got false`. Restored.
2. `scrollToItem("siv-list", 0)` instead of `120`: **exit `1`**,
   `scrollToItem scrolled the list: expected true, got false`. Restored.

**Not measured:** restoring a saved anchor after a remount, and
`scrollToItem`'s `offsetInItem` (only the default 0 was exercised).


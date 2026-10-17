# 166 — Plan: scroll a virtual row into view

| Field | Value |
| ----- | ------- |
| Status | planned (measured facts land in §8) |
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

## 2. Scenario `scroll-into-view` (capability `scroll`)

New view `apps/playground/src/scenarios/scroll-into-view.tsx`: one
`<virtual-list>` of **200 rows** (row height 32, viewport 320×280 ≈ 8 painted),
a ref registry keyed by row index (the `roving-focus` pattern), and this key
contract on each row:

| Key | Result |
| ---- | ------ |
| Down / Up | active row moves by one, `focusElement` the new row, `scrollIntoView` it |
| Home / End | active row becomes 0 / 199, focus + `scrollIntoView` |

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
   offset is deeply negative, and **`row 199` is painted**. If it is not, §8
   records that `scrollIntoView` does not reach a virtual row and
   `scrollToItem` is the only honest route.
3. `Home` → `active=0`, focus `siv-row-0`, offset `≈ 0`, `row 0` painted.
4. **List route:** `scrollToItem("siv-list", 120)` → `row 120` is painted and
   the offset moved; the active row is unchanged (`active=0`), proving the
   index route is independent of the row element.
5. **Back to a row:** `scrollIntoView("siv-row-10")` from the far window →
   `row 10` painted again.
6. **Keyboard follow:** from row 10, three `Down` presses → `active=13`, focus
   `siv-row-13`, and `row 13` is painted (the handler scrolled it into view).
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
  1. remove `scrollIntoView` from the `End` branch → the `row 199` painted check
     fails with focus still on `siv-row-199`. Restore.
  2. call `scrollToItem("siv-list", 0)` instead of `120` → the `row 120`
     painted check fails. Restore.
- `scenarioProblems` (unit, exists) stays green: `scroll` is already required.

## 7. Acceptance criteria

- `scroll-into-view` is registered, green, and the suite is **32/32**.
- The two two-direction proofs are recorded in §8.
- `COMPONENTS.md`, the app README and `TODO.md` cite the measured route.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 8. Measured facts

_(Filled in by the run; every number below must come from the report's checks
and the artifact, never from expectation.)_

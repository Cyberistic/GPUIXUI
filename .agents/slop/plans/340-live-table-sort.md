# Plan 340 — table sort and selection in a real window

| Field | Value |
| ----- | ----- |
| Phase | F (live evidence for a MISSION-listed critical interaction) |
| Depends on | `100`, `110`, `130` (table probes), `189` (live runner), `197` (renderer-owned reads) |
| Owner | playground workstream (`apps/playground`) |
| Status | landed |

## 1. Why this probe exists

MISSION lists **table sort/selection** among the critical interactions. The headless
`table-select-sort` probe measures the sort contract (a Pressable flips the order, the
first row changes, selection is by row id and survives a re-sort) and `live-table` measures
a **virtualized** row click plus a list scroll in a real window. The **sort** half has no
live evidence: a window could reorder rows differently, or a click on the first row after
a reorder could hit the wrong element if the automation tree's order lagged React.

This probe closes that: it mounts the shipped `table-select-sort` view in the real window
and drives the sort, the selection and the scroll through the automation protocol.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `apps/playground/src/live/scenarios.tsx` | **new** `live-table-sort` (`view: tableSelectSortScenario.view`, capability `table`); register it in `liveScenarios` |
| `apps/playground/README.md` | the live table row: sorting and selection from a real click; the scenario list |
| `COMPONENTS.md` | the `table` capability row names `live-table-sort`; Sortable tables / Row selection rows gain the live verdict |
| `TODO.md` | tick the task; live `21 → 22` |
| `.agents/slop/plans/README.md` | index row for `340` |

No file outside the playground workstream changes.

## 3. The scenario (`live-table-sort`)

| # | Action | Check |
| - | ------ | ----- |
| 1 | wait for `table-readout` | contains `rows=200 sorted=name-asc selected=none` |
| 2 | read `table-first` | its text contains `Item 000` |
| 3 | wheel `table-scroll` by `(0, -200)` | `scrollOffset` is `y ≈ -200`; `table-first` still reads `Item 000` (a sibling header and a scrolled body) |
| 4 | wheel `(0, 200)` back | `y ≈ 0` |
| 5 | click `table-sort` | `waitForText` reports `sorted=name-desc`; `table-first` now contains `Item 199` — the reordered row is the one the automation tree points at |
| 6 | click `table-first` | `table-readout` contains `selected=r199` |
| 7 | click `table-sort` again | `sorted=name-asc`; `table-first` reads `Item 000`; `selected=r199` **survives** the re-sort (selection is row-id state, not an index) |

The wheel is included because a reorder while scrolled is the case where a virtual or
retained tree could disagree with the model: the probe scrolls first, returns to the top,
then sorts — so a failure names the sort, not an off-screen row.

## 4. Commands and expected results

```sh
nub run --filter playground check-types          # exit 0
nub run --filter playground build                # exit 0
nub apps/playground/dist/live/run.js             # exit 0, "22/22 scenarios passed"
nub run check && nub run lint && nub run test    # exit 0
```

## 5. Two-direction proofs (mutation → named check fails at exit `1` → restore)

| Mutation | Expected failure |
| -------- | ---------------- |
| make `table-sort` a no-op | `the sorted readout names the descending order` reads `sorted=name-asc` |
| render `ordered(false)` while the readout flips | `the first row is now the descending head` reads `Item 000` |
| clear the selection in the sort handler | `the selection survives the re-sort` reads `selected=none` |

Record each measured failure line in §6.

## 6. Measured facts (2026-10-18, real window, locally built `darwin-x64` 0.10.0)

The scenario is **green** and the live suite is **22/22**, exit `0`. It mounts the shipped
`tableSelectSortScenario.view`.

- **A real wheel moves the body.** `table-scroll` reports `y ≈ -200` for a `-200` wheel,
  while the first row of the model is unchanged.
- **The sort reorders the row the automation tree points at.** After `table-sort`,
  `table-readout` reads `sorted=name-desc` and `table-first` — the same `testId` the
  protocol resolves — contains `Item 199`.
- **A real click selects by row id.** `table-first` sets `selected=r199`.
- **The selection survives a re-sort.** Flipping back to `name-asc` restores `Item 000` as
  the first row and keeps `selected=r199`.
- **Two-direction proofs** (mutation → named check failed, exit `1` → restored):
  - `table-sort` made a no-op → `the sorted readout names the descending order: expected a string containing "sorted=name-desc", got "rows=200 sorted=name-asc selected=none w=160"`;
  - `shown = ordered(false)` while the flag flips → `the first row is now the descending head: expected a string containing "Item 199", got "Item 000ready1 B"`;
  - the sort handler also clears the selection → `the selection survives the re-sort: expected a string containing "selected=r199", got "rows=200 sorted=name-asc selected=none w=160"`.

## 7. STOP conditions

Stop and report, do not improvise, if:

- `scrollOffset("table-scroll")` is `null` in the live host (the scroll assertion cannot be
  made; record it and keep the sort half);
- `table-first` is not reachable after a re-sort (`bounds` fails): the row order and the
  automation tree disagree — that is the probe's subject, so record it rather than clicking
  another row;
- the window cannot open: exit `2` means no evidence, never green.

## 8. Acceptance criteria

- `live-table-sort` passes in a real window and the live suite is `22/22`, exit `0`.
- The mutation proofs in §5 were run and restored; the failing labels are in §6.
- The headless `table-select-sort` scenario is unchanged and still green.
- `COMPONENTS.md`, `apps/playground/README.md`, `TODO.md` and the plan index record the
  live verdict.
- No new dependency; no `@gpuix/*` import outside `apps/playground`; no `any`.

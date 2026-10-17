# Plan 152 — the virtualized table probe (Tier 3 feasibility)

**Workstream:** `playground` (`apps/playground`, `packages/testing`).
**Phase:** B (feasibility) → feeds D (`packages/data-grid`).
**Depends on:** plans `130` (the table probes), `140` (the binding), `151`
(the shell-navigation scenario, which set the scenario conventions).

## 1. Why this plan exists

Plan `130` answered "does a table lay out, sort, select and resize?" and
"does `<virtual-list>` paint a window?" — **separately**. The data-grid package
needs the combination, and every part of it is a separate risk:

- do fixed-width **table cells** lay out correctly inside a `<virtual-list>`
  row (the list owns the row's height, the row owns the columns);
- can a **painted** virtual row be hit-tested and selected by pointer;
- does a React **selection state survive** scrolling the row out of the window
  and back;
- does `onVisibleRange` give a usable index (the only way to implement
  "select all visible", keyboard paging or a "jump to row" affordance).

A component built on assumptions here fails in a way no unit test can catch.
The probe is cheap, uses only measured APIs from plans `130`/`140`, and its
verdict gates the data-grid plan.

## 2. What is built

One scenario, `virtualized-table` (capability `table`):

- A static header row and a `<virtual-list testId="vtable">` body of **500**
  fixed-height rows. Each row is a flex row of three fixed-width cells
  (`Name` 220, `Kind` 100, `Size` 80) — `gridTemplateColumns` is a column count
  in GPUix 0.10.0 (plan `130` §3.1), not a CSS track list.
- Row `N` is `testId={`vtable-row-${N}`}`, shows `File N`, and selects itself on
  click (`selected` React state, painted with the theme's `accent`).
- A readout `vtable-readout` reports `selected=rN|none range=start-end`, fed by
  `onVisibleRange`.
- Steps:
  1. the first row is painted and the last row is not (500 rows, one window);
  2. wheel down (`deltaY: -600`; GPUix is negative-to-scroll-down) and advance
     the frame: row 0 is no longer painted, and the readout's range start is
     greater than `0` (the event reached React with a usable index);
  3. take a row inside the reported window, assert its bounds lie inside the
     list's bounds, click it, and assert the readout names it — a pointer hit
     on a genuinely painted virtual row;
  4. assert the selected row's painted `backgroundColor` differs from its
     unselected neighbour (the selection reached the renderer, not only React);
  5. wheel back to the top and assert the selection is unchanged and row 0 is
     painted again — the state is React-owned, not tied to the painted window.

## 3. Exact files

### 3.1 `apps/playground/src/scenarios/virtual-table.tsx` (new)

The probe and its `PlaygroundScenario`, as described in §2. No new host method:
the scenario uses `paintedText`, `bounds`, `scrollOffset`, `paintedStyle`,
`click`, `wheel` and `advance`, all already on `SmokeHost`. Use
`Option.fromNullishOr` for every nullable host read and `ctx.expectSome` to
name a missing element; parse the readout with `Number.parseInt` as
`virtual-list.tsx` does.

### 3.2 `apps/playground/src/scenarios/index.ts` (change)

Import and append `virtualizedTableScenario` to `scenarios`. `table` is already
a required probe capability; the integrity check is unchanged.

### 3.3 Documentation and ledgers (change)

- `apps/playground/README.md`: the scenario list and count (16), the new
  structure line, and the measured facts from §5.
- `COMPONENTS.md`: the `Virtualized tables` row's **GPUix support** cell becomes
  the probe verdict, and the evidence table's `table` row lists the scenarios.
- `TODO.md`: tick the new item and update the progress bar.
- `.agents/slop/plans/README.md`: index this plan.
- Plan `130` §8 (handoff): point the data-grid plan at this probe.

## 4. Commands, and what each must produce

Run from the worktree root.

| Command | Expected result |
| ------- | --------------- |
| `nub run --filter playground check-types` | no type error |
| `nub run --filter playground build` | `tsc` emits `dist/` |
| `nub apps/playground/dist/smoke/run.js --only virtualized-table` | passes, `table=verified`, exit `0` |
| `nub apps/playground/dist/smoke/run.js` | `16/16 scenarios passed`, exit `0` |
| `nub run check`, `nub run lint`, `nub run test` | clean |

**Two-direction proof.** Temporarily change the probe's row height to `0` (or
drop the `click` handler) and run `--only virtualized-table`: it must fail with
a named check and exit `1`. Restore: green again.

## 5. STOP conditions

Stop and report with evidence if:

- **A click cannot hit a painted virtual row.** Record the row's bounds and the
  list's bounds in plan `140` §4. Do not fall back to calling a React handler
  directly: the pointer path is the capability under test.
- **`onVisibleRange` never reports a positive start index** on this host. That
  makes "virtualized table" honest only as a painted window with no index
  affordance; record it, mark the data-grid row as partial, and stop.
- **A fixed-height row is laid out at a different height than authored** or
  cells do not keep their widths inside the list. Record the measured values;
  the data-grid plan must not assume fixed tracks.
- **Selection does not survive scrolling** (the readout changes without a
  click). This is a React defect in the probe, not a runtime fact; fix the
  probe's state handling before drawing a conclusion.
- **The probe needs a change outside this workstream** (e.g. a new `SmokeHost`
  method): add the task to `TODO.md` instead of editing another package.

## 6. Test plan

| Test | Kind | What it must catch |
| ---- | ---- | ------------------ |
| `virtualized-table` steps | native smoke | cells that do not lay out in virtual rows; an unhittable painted row; a range event with no index; selection lost on scroll |
| full suite | native smoke | a probe that disturbs another scenario's layout or focus |
| `scenarioProblems` | unit (exists) | a registry that loses the `table` capability |

## 7. Acceptance criteria

- `virtualized-table` is registered and green on this host; the suite is
  **16/16**, exit `0`.
- The verdict (supported / partial / unsupported) is recorded in plan `140` §4,
  `COMPONENTS.md`, and the app README with the measured numbers.
- The two-direction proof was run and recorded.
- `nub run check`, `nub run lint`, `nub run test` pass.

## 8. Outcome (executed on this host, 2026-10-17)

**16/16 green**, exit `0`; `virtualized-table` passes and `table=verified`.

Measured facts (also in plan `140` §4):

- Fixed-height (32px) flex rows with fixed-width cells (220/100/80) lay out
  correctly inside `<virtual-list>`; the list paints a window of ~9 of 500 rows.
- The `<virtual-list>` element itself has no painted bounds, so the probe wraps
  it in a `vtable-viewport` div for the containment check (same finding as
  `scroll-container`/`virtual-list-window`).
- A painted virtual row is hittable: clicking the second painted row selected
  it, and its `backgroundColor` changed while its neighbour's did not.
- Selection survives scrolling the row out of the window and back: the readout
  still names the row and row 0 is painted again at the top.
- **`onVisibleRange` lags the painted window by one gesture.** After two wheel
  gestures the painted rows were `32–40` while the reported range start was
  `16` (the value after the first gesture). The probe therefore asserts only
  that the event reports a positive, usable start index and that it is **behind**
  the painted window (`start <= first painted row`), and chooses its click
  target from the painted rows. The data-grid plan must not treat
  `onVisibleRange` as the current window.

Two-direction proof: deleting the row's `onClick` and rebuilding produced
`clicking a painted virtual row selects it: expected "r33", got "none"`,
`table=failed`, exit `1`. Restored: green, exit `0`.

Deviations from this plan:

- The plan expected `onVisibleRange` to be usable as the current window; the
  measured one-gesture lag is recorded above instead of weakening the probe.
- The row `backgroundColor` check compares the selected row with its neighbour
  (a paint difference), not against a token literal: the scenario has no theme
  in its steps, and the difference is the property that matters.


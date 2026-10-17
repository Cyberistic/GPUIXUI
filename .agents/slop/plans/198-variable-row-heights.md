# 198 — Variable row heights and expandable rows in a virtual list

| Field | Value |
| ----- | ----- |
| Status | planned |
| Phase | D (Tier 3 feasibility) |
| Owner | playground workstream |
| Depends on | `100`, `110`, `120`, `140`, `152`, `165`, `166`, `186` |
| Feeds | `COMPONENTS.md` **Expandable rows**, **Virtualized lists**, **Virtualized tables**, **Message scroller** (plan `206`); the variable-height case no probe has measured |

## 1. Goal

Every virtual-list probe in this repo so far uses **fixed-height** rows:
`virtualized-table` (32 px), `virtualized-tree` (24 px), `grid-wide-table`
(fixed row height), `log-viewer` (fixed lines). The published
`VirtualListProps` nonetheless documents itself as *"A variable-height list that
builds only rows near its viewport"* and takes `estimatedItemHeight`. Nothing
has measured whether that is true, and three inventory rows depend on the answer:

- **Expandable rows** (Tier 3): a row grows in place and the rows below must
  move by exactly the delta, without losing the scroll anchor.
- **Virtualized tables** with wrapped cells or detail panes.
- **Message scroller** (plan `206`): messages have different heights.

Measured in this worktree before writing this plan (temporary probe, deleted;
real window, 40 rows cycling `20/40/60` px, `estimatedItemHeight={20}`):

| Question | Measured |
| -------- | -------- |
| Do declared heights stack? | yes, exactly: `y = 0, 20, 60, 120, 140, 180` for rows `0–5`, heights `20/40/60/20/40/60` |
| Does the paint window follow real heights? | yes: 8 rows painted in a 300 px viewport (`20+40+60+20+40+60+20+40 = 300`) |
| Does a mismatched `estimatedItemHeight` (20 vs a 40 px average) break layout? | no: the same exact boxes |
| In-place expansion | row 2 `60 → 120`: rows 3/4/5 moved `120 → 180`, `140 → 200`, `180 → 240` (exactly `+60`), the anchor stayed `[0, 0, 300]`, and the painted window dropped from 8 to 6 rows |
| `scrollToItem(30)` with mixed heights | anchor exactly `[30, 0, 300]`; rows 28/29 detached, row 30 at `y = 0` in the viewport |

So expandable rows are feasible. This plan turns the probe into a permanent
scenario, pins the arithmetic, and records the remaining unknown
(`scrollIntoView` on a variable-height row) as a check rather than prose.

## 2. Files to change

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/variable-rows.tsx` | **new** — the `variable-rows` scenario |
| `apps/playground/src/scenarios/index.ts` | import + register after `virtualListScenario` |
| `apps/playground/README.md` | a scenario section with the measured table and the expandable-row recipe |
| `COMPONENTS.md` | **Expandable rows** row gains the measured recipe; **Virtualized lists** row cites the scenario; suite `58 → 59` |
| `TODO.md` | add and tick the task; suite counts |
| `PLAN.md` | D42 — a virtual list honours real row heights, so expandable rows need no height model |
| `.agents/slop/plans/README.md` | index row; playground block `100–198` |

No change to `packages/testing`: the capability is the existing `virtual-list`
and the host already exposes `bounds`, `scrollToItem`, `scrollIntoView`,
`listScrollTop`, `click`, `wheel` and `advance`.

## 3. The scenario `variable-rows`, capability `virtual-list`

View: an 820 × 360 themed root; a `<virtual-list testId="vr-list">` of 60 rows,
`estimatedItemHeight={20}`, `width: 320`, `height: VIEWPORT (300)`. Row `i`:

- `testId="vr-row-<i>"`, `height: heightOf(i, expanded)` where
  `heightOf = 20 + (i % 3) * 20` and row `2` is `+60` while expanded;
- `flexShrink: 0`, a background alternating on parity, one `<text>` `row <i>`;
- only row 2 carries `onClick` → toggle `expanded` (`useState<number | null>`);
- a readout `vr-state` = `expanded=<index|none>`.

STEP 1 — heights stack exactly:

- `listScrollTop("vr-list")` = `[0, 0, 300]`.
- `bounds("vr-row-0..5")`: `y = 0, 20, 60, 120, 140, 180`, heights
  `20, 40, 60, 20, 40, 60` (each within 1 px).
- `paintedText()` contains `row 0` and `row 7`; does not contain `row 40`
  (the window is built, not the whole list).

STEP 2 — expanding reflows exactly:

- `click("vr-row-2")`; `advance(0)`; `vr-state` contains `expanded=2`.
- `bounds("vr-row-2")` height `120`.
- `bounds("vr-row-3..5")` `y = 180, 200, 240` — **exactly +60**, not a re-estimate.
- the anchor is still `[0, 0, 300]` (the viewport did not jump).
- `paintedText()` no longer contains `row 6` (six taller rows fill 300 px).

STEP 3 — collapsing restores:

- `click("vr-row-2")`; `advance(0)`;
- rows 3..5 back to `120, 140, 180`; `row 7` painted again.

STEP 4 — a jump is exact with mixed heights:

- `scrollToItem("vr-list", 30)`; `advance(0)`;
- anchor `[30, 0, 300]`;
- `bounds("vr-row-30").y` equals the list viewport's `y` (within 1 px);
- `paintedText()` starts at `row 30` (rows 28/29 are absent).

STEP 5 — `scrollIntoView` reveals a variable-height row:

- `scrollToItem("vr-list", 0)`; `advance(0)`;
- `scrollIntoView("vr-row-45")`; `advance(0)`;
- `bounds("vr-row-45")` lies inside the list's viewport box (within 1 px),
  and `paintedText()` contains `row 45`.
  **If it does not reveal**, record that as the measured limitation and assert
  only what happened — do not add a hidden scroll of our own.

STEP 6 — the wheel anchor stays inside the row:

- `scrollToItem("vr-list", 0)`; `advance(0)`;
- `wheel("vr-list", 0, -120)`; `advance(0)`;
- anchor index `> 0`; `anchor[1] >= 0` and `< heightOf(anchor[0], false)`.

STEP 7 — screenshot `apps/playground/.artifacts/screenshots/variable-rows.png`.

## 4. Commands and expected results

| Command | Expected |
| ------- | -------- |
| `nub run --filter playground check-types` | exit `0` |
| `nub run --filter playground build` | exit `0` |
| `nub apps/playground/dist/smoke/run.js --only variable-rows` | exit `0`, every check passes |
| `nub apps/playground/dist/smoke/run.js` | `59/59`, exit `0` |
| `nub run --filter playground test` | unchanged, exit `0` |
| `nub run check` / `nub run lint` / `nub run test` | exit `0` |

## 5. STOP conditions

- **STOP** if rows overlap or leave a gap when the declared heights differ:
  record the measured `y`s and treat variable heights as unsupported with the
  evidence; do not switch the scenario to fixed heights.
- **STOP** if an in-place height change does not reflow the rows below by the
  exact delta. Record the measured shift; a component would then need to scroll
  by hand and the recipe must say so.
- **STOP** if the anchor moves on expand/collapse (it stayed `[0,0,300]` in the
  probe). Record the new value.
- **STOP** if `scrollToItem` with mixed heights is not exact — the
  `estimatedItemHeight` may be participating in the mapping in a way that needs
  a component-side compensation.
- **STOP** if the run exits `2`.

## 6. Test plan and two-direction proof

- The scenario is the test: a list that ignores real heights fails step 1 (the
  `y`s collapse to a single estimate), a re-estimating expand fails step 2, and
  a jump that uses the estimate fails step 4.
- Reverse run: change the expected shift in step 2 from `+60` to `+40`;
  `variable-rows` must fail and the suite exit `1`. Revert, re-run, exit `0`.
  Record both lines in §7.
- Registry integrity is already guarded (`scenarioProblems`); registering the
  view means the sidebar and the smoke list cannot diverge.

## 7. Landed — measured results

_(Filled when implemented.)_

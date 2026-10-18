# 534 — Variable row heights in a real window

| Field | Value |
| ----- | ----- |
| Workstream | playground |
| Phase | F (integration / native evidence) |
| Depends on | `100`, `110`, `140`, `152`, `166`, `189`, `190`, `197`, `198`, `529`, `532` |
| Owns | `apps/playground/src/live/scenarios.tsx`, this plan, the live rows of `COMPONENTS.md`, the live section of `apps/playground/README.md` |
| Feeds | the `Virtualized lists` / `Expandable rows` inventory rows (live evidence instead of headless-only) |

## 1. Why this exists

Plan `198` measured variable row heights in the offscreen `TestRenderer`:
declared 20/40/60 px rows stack exactly, an in-place `60 → 120` expansion moves
the rows below by exactly `+60` with the anchor intact, `scrollToItem(30)`
stays exact, `scrollIntoView(45)` reveals a mixed-height row, and a wheel's
in-row offset stays inside its row. Every one of those is an **interaction**,
and MISSION §"Interaction, layout, state" says an interaction is not complete
until it is tested in the actual native runtime.

`variable-rows` has no live twin today. It is the last scenario family whose
interaction evidence is headless-only for a reason other than a measured
renderer limit (colour and the a11y dump are headless-only because the live
renderer exposes no style/a11y method — plan `197`; the file drop is headless
because the automation protocol has no drop verb — plan `388`).

**Goal:** `live-variable-rows` reuses the headless view unchanged and proves the
same six facts in a real `1100×720` window through the automation protocol plus
the renderer the runner owns.

## 2. What the runner already gives us

No new host verb is needed:

| Need | Verb | Notes |
| ---- | ---- | ----- |
| mount the shipped view | `view: variableRowsScenario.view` | the plan `301`/`532` pattern: a live twin reuses a headless view |
| click the expandable row | `ctx.host.click("vr-row-2")` | a real click; the row owns the `onClick` |
| read the expanded state | `ctx.host.text("vr-state")` | the view paints `expanded=2` |
| row geometry | `ctx.host.bounds("vr-row-N")` | a plain row `div` has no border, so the plan `529` content-origin box is the declared box |
| the list anchor | `ctx.host.listScrollTop("vr-list")` | `[itemIndex, offsetInItemPx, viewportHeightPx]`; the **only** live anchor source |
| an exact jump | `ctx.host.scrollToItem("vr-list", 30)` | plan `197` |
| the wheel | `ctx.host.wheel("vr-viewport", 0, -120)` | the viewport wrapper is the wheel target |
| proof the window scrolls | `ctx.host.paintedText()` | row text is addressable |

Measured constraints that shape the checks:

- **A `<virtual-list>` has no painted bounds live** (plan `532`). Never call
  `bounds("vr-list")`; use `vr-viewport` (a `div`) as the origin and
  `listScrollTop` for the anchor.
- **Live bounds are the content origin and a borderless size** (plan `529`
  §6.5). Rows must therefore be compared to `vr-viewport.y`, not to a
  hand-written window origin.
- **The automation protocol has no frame boundary** (plan `189`). Every step
  settles before it reads; a click that changes state is followed by `settle`.

## 3. Files to change

1. `apps/playground/src/live/scenarios.tsx`
   - import `variableRowsScenario` from `../scenarios/variable-rows.js`;
   - add a `rowBox` helper in this file that returns
     `Option.fromNullishOr(yield* ctx.host.bounds(\`vr-row-${index}\`))` through
     `ctx.expectSome`;
   - add the `variableRows` `LiveScenario` (id `live-variable-rows`,
     capability `virtual-list`, `ready: "vr-row-0"`, steps in §4);
   - add it to `liveScenarios` after `table` (keep the list's grouping: it is a
     virtual-list probe).
2. `apps/playground/README.md`
   - add `live-variable-rows` to the live examples table and to the
     "real-window suite" paragraph;
   - add a short `## Variable row heights in a real window (plan 534)` section
     with the measured values and the rule that a live anchor comes from
     `listScrollTop`, never from a list's bounds.
3. `COMPONENTS.md`
   - `Virtualized lists`: add the live evidence sentence;
   - `Expandable rows`: add the live evidence sentence.
4. `.agents/slop/plans/README.md`: index this plan; note the live registry
   `51 → 52`.
5. `TODO.md`: one task line under the playground workstream.

## 4. The scenario, step by step

```
ready: "vr-row-0"
1. origin = bounds("vr-viewport")                      // expectSome
2. rows 0..5: bounds(`vr-row-${i}`) relative to origin equal
   baseY(i) within 1 px, height equals baseHeight(i) within 1 px
3. anchor = listScrollTop("vr-list") equals [0, 0, 300]
   paintedText contains "row 0", not "row 40"
4. click("vr-row-2"); settle
   text("vr-state") contains "expanded=2"
   row 2 height = 120 ± 1
   rows 3..5 y = baseY(i) + 60 ± 1
   anchor still [0, 0, 300]
   paintedText no longer contains "row 6"
5. click("vr-row-2"); settle
   row 3 y = baseY(3) ± 1
   paintedText contains "row 7" again
6. scrollToItem("vr-list", 30); settle
   anchor [30, 0, 300]
   row 30 y = origin.y ± 1
   paintedText does not contain "row 29"
7. scrollToItem("vr-list", 0); settle
   wheel("vr-viewport", 0, -120); settle
   anchor[0] > 0 and 0 <= anchor[1] < baseHeight(anchor[0])
8. screenshot(`${LIVE_ARTIFACTS}/live-variable-rows.png`)
```

`baseY`/`baseHeight` are **literals derived from the parity rule**, written in
the live file (20 + (index % 3) \* 20; stacked sums), not imported from the
headless scenario: the check must fail if the view's declaration changes, and an
imported helper would move with it. (Plan `350` measured this trap: asserting a
painted metric against the constant it came from let a mutation pass.)

## 5. STOP conditions

Stop and report instead of improvising if:

- `bounds("vr-row-N")` is `null` for a row the headless suite paints — the live
  tree's virtual window differs, and the contract needs recording, not a
  tolerance;
- the rows are systematically offset by a constant (not 0, not 1 px) — that is
  the plan `529` box contract showing up in a virtual list, and it must be
  written down before the check is adjusted;
- the click does not reach `row 2` (no `expanded=2`): do not switch to
  `clickWindow` before checking whether the row is painted at the expected box;
- more than **two** checks need a tolerance wider than 1 px.

## 6. Test plan (the scenario is the test)

The check set above is the regression guard. Both directions:

- **M1 — expansion delta.** Change `EXPAND_BY` from `60` to `40` in the view
  (temporarily): `row 3 moves down by the expansion` must fail with the measured
  `expected 160, got 180`-style mismatch and the run exits `1`.
- **M2 — the click.** Remove the row's `onClick` (temporarily): the
  `expanded=2` check fails and the run exits `1`.
- Restore both, re-run, and confirm `--only live-variable-rows` is green.

Commands:

```sh
nub run --filter playground build
nub apps/playground/dist/live/run.js --only live-variable-rows   # 1/1, exit 0
nub apps/playground/dist/live/run.js --only live-variable-rows   # after M1: exit 1
```

A headless run is **not** required for this plan: no headless scenario changes.
The live registry grows `51 → 52`; the full live suite stays a merge gate and is
not run for this plan.

## 7. Acceptance

- `live-variable-rows` is registered, runs `1/1` with exit `0`, and writes its
  screenshot.
- Both mutation proofs fail as described and are recorded in §8.
- `COMPONENTS.md`'s `Virtualized lists` and `Expandable rows` rows cite the live
  scenario.
- `nub run check` and `nub run test` pass.
- The plan is indexed and the TODO task is ticked.

## 8. Result

`live-variable-rows` is registered as the 52nd live scenario and runs **1/1,
exit `0`, 49 checks, 858 ms** in the real `1100×720` window. Every planned fact
held with no tolerance beyond 1 px, and no new host verb was needed.

| Fact | Measured in the window |
| ---- | ---------------------- |
| declared heights | rows 0–5 sit at `0/20/60/120/140/180` relative to `vr-viewport` with heights `20/40/60/20/40/60` |
| the anchor | `[0, 0, 300]` at rest |
| a real click expands | `vr-state` reads `expanded=2`, row 2 paints `120` px, rows 3–5 move by exactly `+60`, the anchor is still `[0, 0, 300]`, and `row 6` leaves the painted text |
| a second click collapses | `expanded=none`, row 3 back at `120`, and the arithmetic is restored |
| an exact jump | `scrollToItem(30)` → anchor `[30, 0, 300]`, row 30 at the viewport top, `row 29` unpainted |
| a real wheel | `-120` → anchor index `> 0` with `0 ≤ offsetInItem <` that row's height |

Two-direction proofs (both exit `1`, both restored):

- **M1 — the expansion delta.** `EXPAND_BY` `60 → 40`:
  `the live expanded row grows by exactly 60: expected 120 ± 1, got 100`.
- **M2 — the click.** The toggle collapses to `setExpanded(() => null)`:
  `a real click expands the row: expected a string containing "expanded=2",
  got "expanded=none"`.

Measured note for future live probes: a `<virtual-list>` has no bounds live
(plan `532`) but its **rows do**, and the plan `529` content-origin box makes
the declared geometry directly assertable against the wrapper `div` — no
correction term was needed. The `nub run check`/`nub run test` gates pass.

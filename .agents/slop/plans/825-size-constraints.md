# 825 — Size constraints and percentage sizes, in the frame

Status: planned 2026-10-21. Executor: the `playground` workstream
(`apps/playground`, `packages/testing`).

## 1. The claim being guarded

`StyleDesc` publishes `minWidth`, `minHeight`, `maxWidth` and `maxHeight`
(`DimensionValue = number | string`, where a string is `"100%"`-style or
`"auto"`), and the shipped components rely on all four in **20+ call sites**:

| Component | Relies on |
| --------- | --------- |
| `preview-card` | `minWidth: 240`, `maxWidth: 360` — a hover card that must not shrink or overgrow |
| `toast/viewport` | `maxWidth: 380`, `minWidth: 0` |
| `combobox` | `minWidth: 220`, `maxHeight: 280` |
| `menu/surface`, `navigation-menu`, `popover` | `minWidth: 180 / 220 / 200` |
| `menu/sub` | `maxHeight: 320` + `overflowY: "scroll"` |
| `list`, `accordion`, `toast`, `menu/item` | `minWidth: 0` — the flex-shrink escape |
| `field`, `accordion`, `combobox`, `navigation-menu` | `width: "100%"` |

**No scenario in either registry asserts any of them.** `grep` finds only style
declarations (`layers.tsx:308` sets `minWidth: 180` and never reads it); nothing
checks that `minWidth` raises a smaller width, that `maxWidth` clamps a larger
one, which one wins when both apply, that `maxHeight` clamps a box instead of
unmounting its content, that `minWidth: 0` lets a flex item shrink below its
content, or that a percentage resolves against the parent.

**The bug being guarded:** a runtime that drops all four constraints and
`"100%"`, or applies them in the wrong precedence, passes the whole suite while
every hover card is the wrong width, every popover collapses, a menu's
`maxHeight` does nothing, and a long toast pushes its own viewport off-screen.

## 2. Reconnaissance (source, pinned `0.10.0`)

1. **The typings the consumer sees** —
   `apps/playground/node_modules/@gpuix/native/dist/host.d.ts:74-84`: all four
   fields accept `DimensionValue`.
2. **The parser** — `~/GPUIXUI/references/gpuix` (main, `515df19`, **ahead of
   the pin**) `packages/native/src/style.rs:68-135`: `DimensionValue` is
   `Pixels(f64) | Percentage(f64) | Auto`; a `"50%"` string becomes `0.5`, a
   numeric string is pixels, anything else is a decode error.
3. **The application** — `renderer.rs:6289-6310` maps them onto GPUI's
   `.min_w` / `.max_w` / `.min_h` / `.max_h` with `gpui::relative(…)` for a
   percentage. The reference clone is ahead of the pin, so the **CSS
   precedence** (`min` wins over `max`) and the flex auto-minimum are measured,
   not assumed.
4. **What is proven already** — `layout-grid` (plan `341`) proves track sizes and
   `gridColumnMin`; `typography-layout` (plan `342`) proves a `<text>` fills its
   parent; `clip` (plan `820`) proves the clip rectangle. None of them varies a
   constraint.

## 3. Design

### 3.1 The fixture

One flex column of rows on a 680 px-wide stage. Each row is a 140 px label plus
a **300 px parent** (`testId="size-<id>-parent"`, `height: 40` unless it must
grow) holding the subject (`testId="size-<id>"`).

| row | subject style | expected |
| --- | ------------- | -------- |
| `min-width` | `width: 100, minWidth: 200` | **200** |
| `max-width` | `width: 400, maxWidth: 240` | **240** |
| `min-over-max` | `width: 200, minWidth: 300, maxWidth: 260` | **300** (min wins) |
| `min-height` | `height: 40, minHeight: 80` | **80** |
| `max-height` | `height: 400, maxHeight: 120`, plus a 200 px child | **120**, child still **200** |
| `flex-fixed` | a 300 px flex row holding `width: 400` | **300** (shrinks) |
| `flex-content` | a 300 px flex row holding a **nowrap** 600 px run, no `minWidth` | content width, **> 300** |
| `flex-zero` | the same with `minWidth: 0` | **300** |
| `percent-100` | `width: "100%"` | **300** |
| `percent-50` | `width: "50%"` | **150** |
| `percent-min` | `width: 80, minWidth: "50%"` | **150** |
| `text-max` | a long `<text>` with `maxWidth: 200` | width ≤ 200, **two lines** (height ≥ 2 line boxes) |

The `flex-content`/`flex-zero` pair is the load-bearing one: it is the reason
`list`, `accordion`, `toast` and `menu/item` all write `minWidth: 0`, and a
runtime that ignores `minWidth` makes the two identical (the pair check fails).

### 3.2 The checks

Read `bounds` of the parent and the subject; the subject's width is its own box,
the percentage expectations are `parent.width × p`.

1. `minWidth raises a smaller width` — 200 ± 1.
2. `maxWidth clamps a larger width` — 240 ± 1.
3. `minWidth wins over a smaller maxWidth` — 300 ± 1 (CSS precedence).
4. `minHeight raises a smaller height` — 80 ± 1.
5. `maxHeight clamps a larger height` — 120 ± 1.
6. `a maxHeight box keeps its taller child laid out` — the child is 200 ± 1 and
   its bottom is below the parent's (so `maxHeight` constrains the box, not the
   subtree; the clip contract is plan `820`'s).
7. `a fixed-width flex item shrinks to its row` — 300 ± 1.
8. `a nowrap run holds its content width` — the `flex-content` item is wider
   than its 300 px row by more than 100 px.
9. `minWidth: 0 lets a flex item shrink` — 300 ± 1, and at least 100 px narrower
   than `flex-content` (the pair check that makes 8 and 9 one fact).
10. `width: 100% resolves against the parent` — 300 ± 1.
11. `width: 50% resolves against the parent` — 150 ± 1.
12. `a percentage minWidth raises a smaller width` — 150 ± 1.
13. `maxWidth wraps a text run` — the run's width ≤ 200 ± 1 and its height is at
    least two default line boxes (≥ 52 − 2 for the 16 px body type, which plan
    `342` measured at 26 px per line).

Every expectation is computed by `size-model.ts` (`constrained`, `percentOf`),
never restated as a literal in the scenario.

### 3.3 The pure helper — `apps/playground/src/scenarios/size-model.ts`

```ts
/** CSS precedence: the minimum wins when both constraints apply. */
export const constrained: (declared: number, min: number, max: number) => number;
/** A percentage dimension resolved against the parent's extent. */
export const percentOf: (parent: number, percent: number) => number;
```

`constrained(declared, min, max) = max(min, min(declared, max))`.

## 4. Exact files

Create:

1. `apps/playground/src/scenarios/size-model.ts`
2. `apps/playground/src/scenarios/size-model.test.ts`
3. `apps/playground/src/scenarios/size-constraints.tsx` — view, shared
   `sizeChecks`, headless scenario `size-constraints`.

Change:

4. `apps/playground/src/scenarios/index.ts` — import + register
   `sizeConstraintsScenario`; capability `layout`.
5. `apps/playground/src/live/scenarios.tsx` — the `live-size-constraints` twin.
6. `apps/playground/README.md` — a `## Size constraints (plan 825)` section.
7. `COMPONENTS.md` — a measured note on the `layout` capability row and in the
   layout section.
8. `PLAN.md` — one decision row (D99).
9. `TODO.md` — one ticked row.
10. `.agents/slop/plans/README.md` — this plan's row and the number claim
    (`825` free across every worktree; `821`, `822`, `824` were taken).

## 5. Steps, commands, expected results

1. `nub run --filter playground test size-model` → the new unit tests pass.
2. `nub run --filter playground build` → exit `0`, binding current.
3. `nub apps/playground/dist/smoke/run.js --list | grep -c size-constraints`
   → `1`.
4. `nub apps/playground/dist/smoke/run.js --only size-constraints`
   → `1/1 scenarios passed`; record every measured number in §9.
5. `nub apps/playground/dist/live/run.js --only live-size-constraints`
   → `1/1 scenarios passed`, three consecutive runs, one screenshot.
6. Mutations (§6.2), each rebuilt and re-run focused; revert each.
7. `nub run check`, `nub run lint`, `nub run test` → exit `0`. The full
   headless suite is the end-of-task check for the registry change.

## 6. Test plan

### 6.1 Unit tests

1. `constrained` raises a smaller width, clamps a larger one, and leaves a value
   inside the range untouched.
2. `constrained` gives the minimum precedence when `min > max`.
3. `percentOf(300, 0.5) === 150`, and `percentOf` is linear (`0.25` → 75).
4. The precedence case differs from "max wins" (a guard that the check can
   fail).
5. A unit mutation (swap the clamp order) fails 1–2.

### 6.2 Runtime mutations (each must fail by name, then be reverted)

- **M1** `min-width` drops `minWidth` → `minWidth raises a smaller width`
  (`expected 200 ± 1, got 100`).
- **M2** `max-width` drops `maxWidth` → `maxWidth clamps a larger width`.
- **M3** `min-over-max` drops `minWidth` → `minWidth wins over a smaller
  maxWidth` (`got 260`).
- **M4** `max-height` drops `maxHeight` → `maxHeight clamps a larger height`.
- **M5** `flex-zero` drops `minWidth: 0` → the pair check (`minWidth: 0 lets a
  flex item shrink`) fails.
- **M6** `percent-100` becomes `width: 300` → the percentage check must still
  pass (a **null control** proving the check is about resolution, not about the
  number); the mutating run is `width: "10%"` instead, which must fail.

## 7. STOP conditions

1. A constraint field is absent from the pinned typings or renamed — the premise
   is gone; re-plan.
2. A valid percentage string throws or paints nothing — record the rejection as
   a measured limitation and keep the numeric fixtures; do not swap in an
   invalid value.
3. `maxHeight` unmounts its child instead of clamping the box — that is a
   finding: record it, assert the measured behaviour and name the affected
   components (`menu/sub`, `combobox`).
4. A measured value differs from the CSS expectation by more than ±2 px after
   the fixture geometry is confirmed — record the measured rule (like plan
   `761`'s 8-bit composite) instead of widening the tolerance.

## 8. Acceptance

- [ ] `size-constraints` and `live-size-constraints` are registered and green.
- [ ] M1–M5 (and M6's real mutation) fail by name; the null control is recorded.
- [ ] The model owns the precedence and percentage rules; the scenario restates
      no expectation.
- [ ] README, `COMPONENTS.md`, `PLAN.md`, `TODO.md` and the plans index record
      the measured facts and the exact ids run.
- [ ] `nub run check`, `nub run lint`, `nub run test` pass.

## 9. Outcome (measured 2026-10-21)

**All four constraints and both percentage forms work with CSS precedence, and
`minWidth: 0` is a real flex escape.** 34 checks on each host, green on the
first run.

| fact | measured |
| ---- | -------- |
| `minWidth` | `width: 100, minWidth: 200` → **200** |
| `maxWidth` | `width: 400, maxWidth: 240` → **240** (a mutant without it paints 400) |
| precedence | `width: 200, minWidth: 300, maxWidth: 260` → **300** — the minimum wins |
| `minHeight` | `height: 40, minHeight: 80` → **80** |
| `maxHeight` | `height: 400, maxHeight: 120` → **120**, and its 200 px child keeps its **200 px** layout and extends past the clamped box (the box is clamped, not the subtree) |
| flex shrink | a 400 px item in a 300 px row → **300** |
| flex auto-minimum | a **nowrap** run that cannot fit holds **441 px** in a 300 px row without `minWidth` |
| the `minWidth: 0` escape | the same run shrinks to **300 px** — a **141 px** difference, which is why `list`, `accordion`, `toast` and `menu/item` all write it |
| `width: "100%"` | **300** (the parent) |
| `width: "50%"` | **150** |
| `minWidth: "50%"` | `width: 80` → **150** |
| `maxWidth` on a text run | the run's width stays ≤ **200** and it wraps (height ≥ two 26 px line boxes) |

**Correction to this plan §3.2 item 3 / §6.2 M3:** removing the minimum from the
`min-over-max` row paints **200**, not the predicted 260 — with only
`maxWidth: 260` declared, the 200 px width is already inside the range. The
check still fails by name (`expected 300 ± 1, got 200`), so the precedence claim
is falsifiable; the *mutant* number was mispredicted, not the rule.

`size-constraints` — **34 checks**, `1/1 scenarios passed`, 73–76 ms.
`live-size-constraints` — **34 checks**, three green focused runs at 235 / 235 /
234 ms, exit `0`, artifact
`apps/playground/.artifacts/live/live-size-constraints.png`.

**Mutation proofs observed and reverted** (each exit `1`, naming the check):

| # | Mutation | Failure |
| - | -------- | ------- |
| M1 | `min-width` drops `minWidth` | `expected 200 ± 1, got 100` |
| M2 | `max-width` drops `maxWidth` | `expected 240 ± 1, got 400` |
| M3 | `min-over-max` drops `minWidth` | `expected 300 ± 1, got 200` |
| M4 | `max-height` drops `maxHeight` | `expected 120 ± 1, got 400` |
| M5 | `flex-zero` drops `minWidth: 0` | `expected 300 ± 1, got 441` |
| M6 | `percent-100` declares `"10%"` | `expected 300 ± 1, got 30` |
| U1 | `constrained` swaps the clamp order | the model unit suite (`expected 260, got 300`-style failure in test 2) |

A debug read recorded the flex auto-minimum: `debug: the content width:
expected 0 ± 0, got 441`.

End-of-task gates: `nub run check`, `nub run lint`, `nub run test` green
(playground tests **671 → 675**). Full headless suite **125/125** (**4922**
checks, 67 capabilities, exit `0`). Live registry **113 → 114**; the full live
suite was **not** run — it is the merge/release gate.

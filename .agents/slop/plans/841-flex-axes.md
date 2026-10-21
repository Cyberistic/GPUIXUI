# 841 — The flex box's remaining axes, in the frame: reverse directions, `wrap-reverse`, the `alignContent` modes and the per-axis gaps

Status: in progress 2026-10-21. Executor: the `playground` workstream
(`apps/playground`, `packages/testing`).

## 1. The claim being guarded

Plan `833` measured grow, basis, `justifyContent` and the cross-axis alignment;
plan `341` measured `flexWrap: "wrap"` and one `alignContent` value. Everything
else about the flex box's axes is unmeasured, and two of those are **shipped
defects**:

- `packages/tw`'s `flex-col-reverse` utility emits
  `{ flexDirection: "column-reverse" }` (`utilities.ts:161`), and
  `@gpuix/native`'s `apply_styles` has arms for `"column"` and `"row"` **only** —
  a `*-reverse` value falls through, so the utility lays out as the **default
  row**. A consumer asking for a reversed column gets a horizontal row.
- `rowGap`/`columnGap` are applied *after* `gap` with a comment that the axis
  value should win ("matching CSS shorthand order"), and one library site uses
  each; no scenario reads an axis gap.

**The bugs being guarded:** a `tw` class that silently changes the axis, a
two-line wrap whose line order is not the one declared, an `alignContent` mode
that falls back to `flex-start`, and an axis gap that is ignored in favour of
the shorthand.

## 2. Reconnaissance (measured on this host, 2026-10-21)

Two throwaway probes (`flex-axes-recon*.mjs`, deleted before this plan landed)
mounted the fixtures below under the offscreen `TestRenderer`. Basis: all
fixtures declare `display: "flex"`; `bounds` is the content origin with the
padding-box size (plan `835`).

| fixture | declaration | measured |
| ------- | ----------- | -------- |
| explicit row | `flexDirection: "row"`, three 40 × 20 | x **0 / 40 / 80** |
| `row-reverse` | same with `"row-reverse"` | x **0 / 40 / 80** — **identical, not reversed** |
| column | `flexDirection: "column"` | y **0 / 20 / 40**, x 0 |
| `column-reverse` | `"column-reverse"` | x **0 / 40 / 80**, y 0 — laid out as a **row**, not even a column |
| no direction | `display: "flex"` only | x **0 / 40 / 80** — the default direction is **row** |
| wrap | row, `flexWrap: "wrap"`, 3 × 100 × 40 in 200 × 200 | lines at y **0** and **100** (default `alignContent` stretches 2 lines to 100 each); items at (0, 0), (100, 0), (0, 100) |
| `wrap-reverse` | the same fixture | the first two items on the **bottom** line (**y 160**), the third at **y 60** — line order reversed, item order kept |
| `alignContent` (column wrap) | 200 × 60, six 40 × 20 → 3 per column, 2 columns | `flex-start` **0 / 40**; `center` **60 / 100**; `space-between` **0 / 160**; `space-around` **30 / 130**; `space-evenly` **40 / 120**; default (`stretch`) **0 / 100** |
| per-axis gap, row | `gap: 5, rowGap: 20, columnGap: 30` | x **0 / 70 / 140** — the *main* gap is `columnGap` (**30**) |
| per-axis gap, column | `gap: 5, rowGap: 20` | y **0 / 40 / 80** — the *main* gap is `rowGap` (**20**) |
| per-axis gap, wrapped row | 100 × 200, `gap: 4, rowGap: 30, columnGap: 10`, 4 × 40 × 20 | items (0, 0), (**50**, 0), (0, **115**), (50, 115): the main gap is **10** and the line pitch is **85 + 30** |

Measured rules:

1. **The default `flexDirection` is `row`** when `display: "flex"` is declared
   (an element without `display` stacks its children vertically — a different,
   block-ish path already measured by plan `341`).
2. **`row-reverse` and `column-reverse` are ignored.** `row-reverse` is
   indistinguishable from `row`; `column-reverse` is not even a column.
3. **`flex-wrap: "wrap-reverse"` reverses the line order and keeps the item
   order** inside each line: the first line is packed against the **end** of the
   cross axis.
4. **`alignContent` distributes the lines** exactly as CSS does: start/center/
   space-between/space-around/space-evenly, and the **default is `stretch`**
   (each line grows to fill the cross axis).
5. **The per-axis gaps override the shorthand on their own axis**: for a row the
   main gap is `columnGap`, the cross gap is `rowGap`; for a column the roles
   swap. The `gap` shorthand is the fallback for the axis a longhand does not
   set.

**A shipped defect, recorded not edited.** `tw`'s `flex-col-reverse` produces a
horizontal row on this pin. The playground cannot fix a runtime style mapper, so
the probe asserts the measured direction and the cross-team row asks `tw` to
either drop the utility, document it, or emulate the reversal.

## 3. Design

### 3.1 The fixture

One **960-wide stage**, three 300-wide columns, ~550 tall — it fits the live
1100 × 720 window without a wheel.

- **Column 1 — direction:** explicit `row` (control), `row-reverse`,
  `column`, `column-reverse`, and no direction at all. Three 40 × 20 cells each,
  in a 200 × 100 box.
- **Column 2 — wrap and `alignContent`:** a normal wrap and a `wrap-reverse`
  (3 × 100 × 40 in 200 × 120), then four column-wrap boxes (200 × 60, six
  40 × 20) with `center`, `space-between`, `space-around` and the default
  `stretch`.
- **Column 3 — per-axis gaps:** a row with `gap 5 / rowGap 20 / columnGap 30`,
  a column with `gap 5 / rowGap 20`, and a wrapped row with
  `gap 4 / rowGap 30 / columnGap 10`.

### 3.2 The checks (~60 per host)

Every expectation comes from `flex-axes-model.ts`; the scenario restates no
number.

1. The fixture ids are distinct; the stage is 960 wide.
2. `an explicit row starts at the leading edge` — 0 / 40 / 80.
3. `the default direction is row` — the no-direction box matches the control.
4. `row-reverse is ignored` — it matches the control cell for cell (the
   model's reversed expectation is the *documented* answer, so the check names
   the limitation).
5. `column stacks the cells` — y 0 / 20 / 40 at one x.
6. `column-reverse is not even a column` — it lays out as a row (measured),
   and the reversed-column expectation is recorded beside it.
7. `a wrapped row breaks at the container` — item 3 on line 2.
8. `the default alignContent stretches the lines` — line pitch = the container
   ÷ 2.
9. `wrap-reverse packs the first line at the end` — first two items on the
   bottom line, third above, with the same pitch.
10. `alignContent center centres the line block` — 60 / 100.
11. `space-between pins the first and last line` — 0 / 160.
12. `space-around gives each line half a share` — 30 / 130.
13. `the default alignContent stretches each line to the cross axis` — 0 / 100.
14. `columnGap is the main gap of a row` — 0 / 70 / 140.
15. `rowGap is the main gap of a column` — 0 / 40 / 80.
16. `the axis gaps beat the gap shorthand` — the same numbers with `gap: 5`.
17. `the cross gap changes the line pitch` — 10 across, 85 + 30 down.
18. Painted-box checks for every fixture read (one per id).

### 3.3 The pure helper — `apps/playground/src/scenarios/flex-axes-model.ts`

```ts
/** The leading edges of `sizes` laid out with `gap` between them. */
export const starts: (sizes: ReadonlyArray<number>, gap: number) => ReadonlyArray<number>;
/** The order a `*-reverse` direction would produce, for the record. */
export const reversed: (count: number) => ReadonlyArray<number>;
/** The gap an axis gets: its longhand, else the shorthand. */
export const axisGap: (axis: "main" | "cross", direction: "row" | "column", gap: number, rowGap?: number, columnGap?: number) => number;
/** The `alignContent` starts of `count` lines of `size` in `extent`. */
export const lineStarts: (mode: AlignContentMode, count: number, size: number, extent: number) => ReadonlyArray<number>;
/** The line a wrapped item lands on, for `perLine` items per line. */
export const lineOf: (index: number, perLine: number) => number;
```

`lineStarts` is the whole `alignContent` rule set, and `axisGap` is the
shorthand-precedence rule; both are asserted by the scenario and by unit tests.

## 4. Exact files

Create:

1. `apps/playground/src/scenarios/flex-axes-model.ts`
2. `apps/playground/src/scenarios/flex-axes-model.test.ts`
3. `apps/playground/src/scenarios/flex-axes.tsx` — the three-column view, the
   shared `flexAxesChecks`, the headless `flex-axes` scenario and
   `flexAxesView` / `flexAxesLiveScenario`.

Change:

4. `apps/playground/src/scenarios/index.ts` — import + register
   `flexAxesScenario`.
5. `apps/playground/src/live/scenarios.tsx` — the `live-flex-axes` twin.
6. `apps/playground/README.md` — a `## The flex box's remaining axes (plan 841)`
   section with the measured table, the five rules and the `tw` defect.
7. `COMPONENTS.md` — the `layout` capability row gains both ids; the
   `Stack / layout primitives` row records the rules; the live count `118 → 119`.
8. `PLAN.md` — decision row D104.
9. `TODO.md` — one ticked row, plus a **cross-team** row for `tw`'s
   `flex-col-reverse`.
10. `.agents/slop/plans/README.md` — this plan's row (the `840` number was taken
    by the tokens workstream; `841` was verified free across every worktree).

Delete: `apps/playground/.artifacts/flex-axes-recon*.mjs`.

## 5. Steps, commands, expected results

1. `nub run --filter playground test flex-axes-model` → the new unit tests pass.
2. `nub run --filter playground build` → exit `0`.
3. `nub apps/playground/dist/smoke/run.js --list | grep -c flex-axes` → `1`.
4. `nub apps/playground/dist/smoke/run.js --only flex-axes` → `1/1 scenarios
   passed`, about 60 checks.
5. `nub apps/playground/dist/live/run.js --only live-flex-axes` → `1/1`, three
   consecutive runs.
6. Mutations (§6.2), each rebuilt and re-run focused; revert each.
7. `nub run check`, `nub run lint`, `nub run test` → exit `0`. The full headless
   suite is the end-of-task check for the two registry changes.

## 6. Test plan

### 6.1 Unit tests (`flex-axes-model.test.ts`)

1. `starts([40, 40, 40], 0)` → `[0, 40, 80]`; with `10` → `[0, 50, 100]`.
2. `reversed(3)` → `[2, 1, 0]`.
3. `axisGap("main", "row", 5, 20, 30)` → 30; `axisGap("cross", "row", 5, 20, 30)`
   → 20; `axisGap("main", "column", 5, 20)` → 20; `axisGap("cross", "column",
   5, 20)` → 5 (the shorthand fallback).
4. `lineStarts("flex-start", 2, 40, 200)` → `[0, 40]`.
5. `lineStarts("center", 2, 40, 200)` → `[60, 100]`.
6. `lineStarts("space-between", 2, 40, 200)` → `[0, 160]`.
7. `lineStarts("space-around", 2, 40, 200)` → `[30, 130]`.
8. `lineStarts("space-evenly", 2, 40, 200)` → `[40, 120]`.
9. `lineStarts("stretch", 2, 40, 200)` → `[0, 100]`.
10. `lineOf(5, 3)` → 1; `lineOf(2, 3)` → 0.
11. A single line under every mode starts at 0 except `center`/`around`/`evenly`
    (the one-line rule: `center` → 80 on 200 with a 40 line).

### 6.2 Runtime and unit mutations (each must fail by name, then be reverted)

- **M1** `row` → `column` on the direction control → `column stacks the cells`
  (and the default-direction check).
- **M2** drop `flexWrap: "wrap"` from the wrap fixture → `a wrapped row breaks
  at the container` (all three on one line).
- **M3** `wrap-reverse` → `wrap` → `wrap-reverse packs the first line at the
  end`.
- **M4** `alignContent: "center"` → `"flex-start"` → `alignContent center
  centres the line block` (0 / 40).
- **M5** `space-between` → `"flex-start"` → `space-between pins the first and
  last line`.
- **M6** `space-around` → `"flex-start"` → `space-around gives each line half a
  share`.
- **M7** the default fixture given `alignContent: "flex-start"` → the stretch
  check (0 / 40 instead of 0 / 100).
- **M8** `columnGap: 30` dropped → `columnGap is the main gap of a row`
  (0 / 45 / 90 from the shorthand 5).
- **M9** `rowGap: 20` dropped on the column → `rowGap is the main gap of a
  column`.
- **M10** `rowGap: 30` dropped on the wrapped row → `the cross gap changes the
  line pitch`.
- **U1** `axisGap` returns the shorthand for the main axis → unit test 3.
- **U2** `lineStarts("space-between")` divides by `count` instead of
  `count - 1` → unit test 6.

## 7. STOP conditions

1. A direction or `flexWrap` value has no measurable effect **and** the source
   contradicts the measurement — record the measured direction and re-plan.
2. A measured number differs from the model by more than ±1 px after the
   wrapper geometry is confirmed — record the rule instead of widening the
   tolerance.
3. `alignContent` turns out to be inert (every mode identical) — stop: rule 4
   and half the checks depend on it; report the measured answer as a
   limitation instead of asserting CSS.
4. The `wrap-reverse` fixture's line order cannot be read from bounds alone
   (e.g. the runtime reorders children) — record the measured order and keep
   the check, never skip the fixture.
5. The stage cannot fit the live 1100 × 720 window — split the columns or drop a
   fixture, never silently skip it.

## 8. Acceptance

- [ ] `flex-axes` and `live-flex-axes` are registered and green.
- [ ] M1–M10 fail by name; U1–U2 fail the model suite.
- [ ] The model owns the line, gap and order arithmetic; the scenario restates
      no expectation.
- [ ] The recon scripts are deleted.
- [ ] README, `COMPONENTS.md`, `PLAN.md`, `TODO.md` and the plans index record
      the measured rules, the `tw` defect and the exact ids run.
- [ ] `nub run check`, `nub run lint`, `nub run test` pass.

# Plan 341 — The grid and wrapping layout contract

**Workstream:** playground (`apps/playground`, `packages/testing`).
**Phase:** B → D (layout primitive, feasibility for Tier 3/4 grids).
**Depends on:** `100`, `110`, `120`, `140` (the native harness and the 0.10.0
binding built from source), `layout-flex` (the flex half of the layout
capability).
**Owner path boundary:** only `apps/playground` and `packages/testing`. The
`packages/primitives` follow-up is recorded as a cross-team TODO, not edited.

---

## 1. Why this exists

`layout-flex` proves flex rows, `gap` and absolute positioning. The library's
`gridStyle` resolver (`packages/primitives/src/core/layout.ts`) declares
`display: "grid"` from the **type**, and the only runtime fact recorded anywhere
is second-hand: "`gridTemplateColumns` is a column count" (used by
`virtual-table` and `table`). Nobody has measured what the runtime actually
does with a grid:

- are tracks equal, and how is a fractional remainder distributed?
- do explicit rows split a fixed height? do items stretch into their cell?
- what does `gridColumnMin` (`zero` / `min-content` / `max-content`) do?
- can a child be clipped or is it free to overflow its cell?
- does a grid survive as a flex child with `flexGrow`?
- does a **wrapping** flex row keep its `gap` when the container is fixed-height
  (the footer/toolbar/card-grid case)?

A stat-card grid, a form row, a property panel and a toolbar all depend on these
answers. Two integration behaviours in the library are currently assumptions: a
grid's equal tracks and a wrapped row's line placement.

The probe also guards the primitives' `GridSpec` contract and the documented
"fixed-size grid, nothing raggedy" claim in `packages/primitives/README.md`.

## 2. Measured facts (this host, `TestRenderer` 1280×800, 0.10.0)

Measured with the locally built `darwin-x64` binding (ADR 0003). Values are
`{x,y,width,height}` in window pixels; all fixtures below sit at x = 0 unless
stated.

| Fixture | Style | Measured |
| ------- | ----- | -------- |
| equal 3-track grid, 300 wide, `gap: 10` | `gridTemplateColumns: 3` | children `93.5 / 93 / 93.5` wide at x `0 / 103.5 / 206.5`; gaps exactly 10; right edge 300 |
| two explicit rows, 300×200, `gap: 10` | `gridTemplateColumns: 2, gridTemplateRows: 2` | children `145×95` at `(0,0)`, `(155,0)`, `(0,105)`, `(155,105)` |
| auto rows, 300 wide, `gap: 10`, heights `60/20/20` | `gridTemplateColumns: 2` | grid height `90`; row 1 = 60 (its tallest child); row 2 item y = 70 |
| three explicit rows, 300×100, `gap: 10`, children 10 tall | `gridTemplateColumns: 2, gridTemplateRows: 3` | track pitch `36.5`; row 2 starts at 36.5; the 10 px child does not stretch to the 26.5 px track |
| `gridColumnMin` absent | 2 cols, 300 wide, `gap: 10`, two text cells | `145 / 145` (equal, like `zero`) |
| `gridColumnMin: "zero"` | same | `145 / 145` |
| `gridColumnMin: "min-content"` | same | first `104`, second `186`; the pair fills the 290 available |
| `gridColumnMin: "max-content"` | same | first `38`, second `186`; the pair leaves 66 px unused |
| `justifyContent: "center"` + `max-content`, two 30 px cells, `gap: 10` | | first cell x = 115 (the 70 px track set is centred in 300) |
| nested 2-track grid in a 145 px cell, inner `gap: 4` | | inner cells `70.5` each |
| a 500 px child in a 300 px 2-track grid | | child stays 500 wide at x 0; the second cell stays at x 155 |
| a 2-track grid with `flexGrow: 1` inside a 300 px flex row | | grid width 300; children 145 each |
| wrap, 220×200, `gap: 8`, three 100×30 children | default `alignContent` | container 200; third child y = 104 — the two line boxes are **stretched** (16 px each) |
| wrap, same + `alignContent: "flex-start"` | | third child y = 38 (exactly one 8 px row gap) |
| wrap, auto height | no height | container 68; third child y = 38 |

Two rules fall out and must be documented:

1. **A grid track count is equal fractions by default; `gridColumnMin` changes
   the sizing algorithm for the whole template.** Only the default and `zero`
   give equal tracks. `min-content` fills the container with unequal tracks;
   `max-content` sizes to content and leaves the remainder unused.
2. **A wrapped flex row stretches its line boxes when the container is taller
   than the content**, so a fixed-height toolbar/card grid must declare
   `alignContent: "flex-start"` (or let the height be auto) to keep the `gap`
   honest. `Stack`'s `wrap` prop does not set it — a `packages/primitives`
   follow-up, not this plan's edit.

## 3. Files

Create:

- `apps/playground/src/scenarios/layout-grid.tsx` — the `layout-grid` scenario
  (one view + one steps effect, matching `layout.tsx`).

Change:

- `packages/testing/src/smoke.ts` — add `"grid-layout"` to `CAPABILITIES`.
- `apps/playground/src/scenarios/index.ts` — import + register the scenario and
  add `"grid-layout"` to `PROBE_CAPABILITIES`.
- `COMPONENTS.md` — a `grid-layout` row in the capability table; the measured
  facts on the layout/grid inventory rows (§5).
- `apps/playground/README.md` — the scenario in the evidence table, the suite
  count (`69 → 70`), the capability list and the structure list.
- `TODO.md` — the new playground task, ticked; the cross-team `Stack` note in
  the primitives section.
- `.agents/slop/plans/README.md` — index row for this plan.

No change to `packages/primitives` (owned by another workstream).

## 4. The scenario

### 4.1 `apps/playground/src/scenarios/layout-grid.tsx`

Header comment states the purpose and the two measured surprises. The view is
one column of fixed-width (300 px) fixtures, each a `testId`; no readouts are
needed because every fact is a bound. Use the token theme for colours so the
shell's palette switch still repaints it (`useTheme()`), and keep the code
tab-free of literals except the deliberate geometry under test.

Fixture list (ids are the assertions' handles):

| testId | What it is |
| ------ | ---------- |
| `grid-equal` / `grid-equal-1..3` | 300 wide, 3 columns, `gap: 10`, children height 20 |
| `grid-rows` / `grid-rows-1..4` | 300×200, 2 columns × 2 rows, `gap: 10`, children with no height |
| `grid-auto` / `grid-auto-1..3` | 300 wide, 2 columns, `gap: 10`, heights 60/20/20 |
| `grid-row-count` / `grid-row-count-3` | 300×100, 2 columns × 3 rows, `gap: 10`, four 10 px children |
| `grid-default-1`, `grid-min-1`, `grid-max-1`, `grid-zero-1` | the four `gridColumnMin` modes, each 300 wide, 2 columns, `gap: 10`, two text cells |
| `grid-center-1`, `grid-center-2` | `gridColumnMin: "max-content"`, `justifyContent: "center"`, 30 px cells |
| `grid-nest`, `grid-nest-inner-1` | nested grid in the right-hand 145 px cell, inner `gap: 4` |
| `grid-overflow-1`, `grid-overflow-2` | a 500 px child and the 145 px cell beside it |
| `grid-grow`, `grid-grow-1` | a 2-track grid with `flexGrow: 1` in a 300 px flex row |
| `wrap-stretch-3` | default wrapped row in a fixed 220×200 box (`flexShrink: 0`) |
| `wrap-start-3` | the same row with `alignContent: "flex-start"` |
| `wrap-auto`, `wrap-auto-3` | the same row with no height |

The text cells in the `gridColumnMin` fixtures use the same two strings in all
four modes (`"short"` and `"a much longer string here"`), so the comparison is
the mode and nothing else.

### 4.2 Steps

Structure the effect in one `Effect.gen`, using `ctx.expectSome` on
`Option.fromNullishOr(ctx.host.bounds(id))` for every box and `ctx.expectNear`
with a 1 px tolerance for geometry (the runtime distributes fractional tracks
with half-pixel rounding: `93.5 / 93 / 93.5`).

Checks, in order (each label names the fact, failing output names the measured
number):

1. `three equal tracks are 93.3 px in a 300 px grid` — width near 93.33 ± 1 for
   all three; gaps equal `10 ± 1`; the third's right edge at 300 ± 1.
2. `grid items fill the explicit cell` — the four `grid-rows-*` children are
   `145 ± 1` wide and `95 ± 1` tall; row 2 starts at `105 ± 1`; column 2 at
   `155 ± 1`.
3. `an auto row follows its tallest child` — `grid-auto` height `90 ± 1`; the
   row-2 child y = `70 ± 1`; row-1 child height stays 60 ± 1.
4. `an explicit row count splits the height` — `grid-row-count-3` y = `36.5 ± 1`
   while its height stays `10 ± 1` (the child does not stretch).
5. `the default and zero column minima give equal tracks` — first-child widths
   `145 ± 1` for `grid-default-1` and `grid-zero-1`.
6. `min-content fills the grid with unequal tracks` — `grid-min-1` width is
   `< 140`, the second is `> 150`, and the pair's right edge is `300 ± 1`.
7. `max-content sizes to content and leaves the rest unused` — `grid-max-1`
   width is `< 100`, and the pair's right edge is `< 280` (the 66 px remainder).
8. `justifyContent centres the track set` — `grid-center-1` x = `115 ± 1`;
   `grid-center-2` x = `155 ± 1`.
9. `a nested grid resolves against its cell` — `grid-nest-inner-1` is
   `70.5 ± 1` wide and its x is `155 ± 1`.
10. `an oversized child overflows its cell` — `grid-overflow-1` is `500 ± 1`
    wide and `grid-overflow-2` still starts at x `155 ± 1`.
11. `a grid grows as a flex child` — `grid-grow` width `300 ± 1`;
    `grid-grow-1` width `145 ± 1`.
12. `a wrapped row in a fixed height stretches its lines` —
    `wrap-stretch-3` y is `> 60` (measured 104) — assert the **spread**, not the
    exact 104, so the check survives a different line-gap policy but still fails
    if the default stops stretching.
13. `alignContent start keeps the wrap gap` — `wrap-start-3` y = `38 ± 1`.
14. `an auto-height wrapped row keeps the wrap gap` — `wrap-auto` height
    `68 ± 1` and `wrap-auto-3` y = `38 ± 1`.

No wheel/click/keyboard steps: this is pure layout.

### 4.3 Registration

`index.ts`: import `layoutGridScenario` next to `layoutScenario`, put it directly
after `layoutScenario` in `scenarios`, and append `"grid-layout"` to
`PROBE_CAPABILITIES` with the existing comment's plan list extended by `341`.

`smoke.ts`: `"grid-layout"` at the end of `CAPABILITIES`. The union and the
registry's `scenarioProblems` check already validate that a scenario's
capability is declared.

## 5. Documentation

- `COMPONENTS.md` capability table: `| grid-layout | layout-grid | verified |`.
- `COMPONENTS.md` layout row (the Row under **Design system** / layout
  primitives, whichever currently names Stack/Box): append the two rules from
  §2 and the `gridColumnMin` measured widths; state that a wrapping container
  must set `alignContent: "flex-start"` when its height is constrained.
- `apps/playground/README.md`: evidence-table row `| grid layout | … |`; extend
  the pasted capability line with `grid-layout=verified`; update `69/69` to
  `70/70`; add `src/scenarios/layout-grid.tsx` to the structure list.
- `TODO.md`: tick the task in the playground section; add the cross-team row
  `primitives` → `Stack wrap` must set `alignContent: "flex-start"` (or document
  the stretch) with this plan as evidence.

## 6. Commands and expected results

Run from the worktree root (`/Users/cyberistic/GPUIXUI/workspaces/playground`).

```sh
nub run --filter playground build
# exit 0

nub apps/playground/dist/smoke/run.js --only layout-grid
# exit 0; one `ok … layout-grid` line; 14+ checks

nub apps/playground/dist/smoke/run.js
# exit 0; 70/70 scenarios; `grid-layout=verified` in the capability line

nub run check
# exit 0 (check:tests, lint, fmt, check-types)

nub run test
# exit 0 (unit suites; the scenario itself is exercised by the smoke run)

nub apps/playground/dist/live/run.js
# exit 0; live stays 22/22 — this probe is geometry-only and adds no live scenario
```

## 7. Test plan and the two-direction proof

The scenario **is** the test: each check reads a runtime bound, so it can fail
for a real style regression. Prove both directions before declaring done:

- **M1 — wrong column count.** Change `grid-equal`'s `gridTemplateColumns` from
  `3` to `2`. Expect `--only layout-grid` to exit `1` with equal-track and gap
  failures (children become ~145 px and one wraps to a second row).
- **M2 — dropped alignment rule.** Remove `alignContent: "flex-start"` from
  `wrap-start-3`. Expect exit `1` with `alignContent start keeps the wrap gap`
  reporting y > 60 instead of 38.
- **M3 — cell stretch removed.** Add `alignItems: "flex-start"` to `grid-rows`.
  Expect exit `1` with `grid items fill the explicit cell` reporting height 0,
  not 95.
- Restore each mutation and re-run `--only layout-grid` to green. Record the
  three measured failure strings in this plan's §8 after the run.

`check-tests` does not scan scenario files (they are not `*.test.ts`), which is
the same convention as every other probe.

## 8. Result (filled in after the run)

_(executor records the exact failing strings from M1–M3, the final suite count
and check count here)_

## 9. STOP conditions

Stop and report instead of improvising if:

- the grid renders no children or every bound is `null` (the runtime lost the
  `display: "grid"` path — that contradicts `virtual-table` and must be
  investigated as a regression before writing checks);
- the measured numbers differ from §2 by more than 1 px on a **second** run
  (nondeterministic layout; the plan's assertions would be false evidence);
- `nub run check` or `nub run test` fails for a reason outside the files in §3;
- a fix appears to require editing `packages/primitives` or any other package —
  record it as a cross-team TODO instead (§5).

## 10. Acceptance

- `layout-grid` runs green, `--only layout-grid` exits `0`, the full suite is
  `70/70`, exit `0`.
- `grid-layout=verified` appears in the report and in `COMPONENTS.md`.
- The three mutations each exit `1` in the documented way and the restored tree
  is green.
- `nub run check`, `nub run lint`, `nub run test` pass; the live suite is
  unchanged at `22/22`.
- `TODO.md`, `COMPONENTS.md`, `apps/playground/README.md` and the plan index
  reflect the probe; the branch is committed and pushed.

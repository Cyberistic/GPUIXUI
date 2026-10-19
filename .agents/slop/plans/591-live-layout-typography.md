# 591 — The layout and typography contracts in a real window

**Owner:** playground workstream (`apps/playground`).
**Depends on:** `341` (`layout-grid`), `342` (`typography-layout`) and the live
observation surface `197` (`bounds`/`paintedText`/`highlights`), `189` (the live
runner), `556`/`557` (recent geometry twins), `586`/`587` (the last plans).
**Phase:** F — the last layout-family contracts with only `TestRenderer`
evidence.

## 1. Why

The library sits on three measured layout contracts, and all three are still
offscreen-only:

| Headless id | Checks | Contract |
| ----------- | ------ | -------- |
| `layout-flex` | 10 | explicit widths, `gap`, absolute insets, one shared row |
| `layout-grid` | 76 | equal tracks, explicit/auto rows, the four `gridColumnMin` modes, nested grid, overflow, `flexGrow`, wrapping line stretch |
| `typography-layout` | 28 | explicit `lineHeight`, default line box, `fontWeight` width, `textAlign` no-op, `alignSelf`/`justifyContent` alignment |

The live suite already proves geometry in a window (`live-truncation`,
`live-variable-rows`, `live-data-grid-columns`), so every assertion these three
need is available: `bounds()` in window coordinates, `highlights()` for glyph
runs, and `paintedText()` where useful. Nothing in them needs colour, style or
the accessibility dump — the three surfaces the live renderer cannot report
(plan `197`).

The reason to measure them live is not ceremony: the window is where a device
scale, a font substitution or a title-bar origin would change a number. The
twins also close the **layout** capability's last headless-only ids, which is
what every higher component's acceptance evidence cites.

## 2. Exact files

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/typography.tsx` | add `testId="type-root"` to `TypographyProbe`'s root `div`. One attribute; no headless assertion reads it, and it gives the live twin a scroll/inset origin. |
| `apps/playground/src/live/scenarios.tsx` | import `layoutScenario`, `layoutGridScenario`, `typographyScenario`; add `liveLayoutFlex`, `liveLayoutGrid` and `liveTypography`; register them next to `live-app-chrome` (`capability: "layout"`, `"grid-layout"`, `"typography"`). |
| `apps/playground/README.md` | a `### Layout and typography in a real window (plan 591)` section with the measured table and the three ids. |
| `COMPONENTS.md` | the capability table's `layout`, `grid-layout` and `typography` rows cite the three live ids; the `Text / typography` and `Stack / layout primitives` inventory rows gain a **Live** clause. |
| `PLAN.md` | one D77 decision row with the measured result. |
| `TODO.md` | claim this task before implementing; tick it with the measured checks and exact focused ids. |
| `.agents/slop/plans/README.md` | index row and the playground narrative's number sentence. |

No `packages/testing` change: `bounds`, `wheel`, `highlights` and `screenshot`
already exist on `AsyncSmokeHost`. **STOP** if a needed verb is missing; record
it and open a follow-up task rather than widening the host here.

## 3. Implementation

### 3.1 `live-layout-flex`

`view: layoutScenario.view`, `ready: "layout-root"`. Seven checks, all
differences so the window origin never enters an assertion:

1. the root keeps its width (`640 ± 1`);
2. box A keeps its width (`200 ± 1`);
3. box B keeps its width (`320 ± 1`);
4. the gap is `8 ± 1`;
5. absolute `left` is `24 ± 1` from the root;
6. absolute `top` is `16 ± 1` from the root;
7. A and B share a row (`a.y == b.y ± 1`).

Screenshot to `${LIVE_ARTIFACTS}/${liveLayoutFlex.id}.png`.

### 3.2 `live-layout-grid`

The headless view is **992 px tall** (sum of the eight wrapped fixture rows and
seven 16 px gaps), so it cannot fit in the 720 px window. The live twin mounts
it in one scroller and reads it in two batches:

```tsx
const liveLayoutGridView = (): ReactNode => (
  <div
    testId="live-layout-viewport"
    style={{ height: WINDOW.height - 80, overflowY: "scroll" }}
  >
    {layoutGridScenario.view()}
  </div>
);
```

`ready: "grid-equal"`. Every grid assertion compares a box with its own
container, so a scrolled fixture is still assertable.

1. **At rest** (rows 1–6, y `0…568`): equal track widths (`93.33 ± 1` each), the
   two `10 ± 1` gaps, the third track ending at the grid edge (`300 ± 1`); the
   explicit-row cell (`145 × 95 ± 1`), column 2 starting at `155 ± 1`, row 2 at
   `105 ± 1`; the auto grid height (`90 ± 1`), the tall child (`60 ± 1`) and the
   second auto row at `70 ± 1`; the declared child height (`10 ± 1`) and the
   third explicit row at `36.5 ± 1`; default and zero first tracks (`145 ± 1`);
   `min-content` (`104 ± 2`, filling `300 ± 2`); `max-content` (`38 ± 2`,
   leaving the remainder at `234 ± 4`).
2. `ctx.host.wheel("live-layout-viewport", 0, -400)` and `settle`. At the clamp
   (max scroll `352` with a 640 px viewport) rows 5–8 are visible: the centred
   tracks (`115/155 ± 1`), the nested grid (`155 ± 1` offset, `70.5 ± 1` track),
   the overflow (`500 ± 1` child, neighbour at `155 ± 1`), `flexGrow`
   (`300 ± 1`, track `145 ± 1`), the fixed wrapping row (`200 ± 1` high, line 2
   at `104 ± 1`), `alignContent: "flex-start"` (line 2 at `38 ± 1`), and the
   auto-height wrap (`68 ± 1`, line 2 at `38 ± 1`).
3. Screenshot to `${LIVE_ARTIFACTS}/${liveLayoutGrid.id}.png`.

**STOP** if any fixture still reports no bounds at the clamp; record the
fixture and do not move an assertion to make it pass.

### 3.3 `live-typography`

`view: typographyScenario.view`, `ready: "type-root"`. Read `root` first and
subtract its `x` from every horizontal assertion, so the window origin is not
assumed:

1. `type-line-1` is `30 ± 1` high; `type-line-2` is `60 ± 1`.
2. the default line boxes are `19.5 / 26 / 39 ± 2` and strictly increasing.
3. the two `hello weight` washes exist; the bold rect is more than `2 px` wider
   than the regular one.
4. `alignSelf: "center"` puts the run's centre at `100 ± 1` from the probe
   origin; `alignSelf: "flex-end"` ends at `200 ± 1`; the explicit `60` px run
   in a `justifyContent: "center"` row starts at `70 ± 1`.
5. `textAlign left` starts at `0 ± 1` from the probe origin, and centre/right
   do **not** move the glyphs (`± 0.5`) — the measured 0.10.0 no-op, now seen
   in a window rather than only offscreen.
6. Screenshot to `${LIVE_ARTIFACTS}/${liveTypography.id}.png`.

Expected: **7 + 36 + 16 = 59 live checks** (each `expect*` is one check).
Record the measured count.

## 4. STOP conditions

- **STOP** if the window reports a different track width or line height from the
  offscreen measurement (`93.33`, `19.5/26/39`). Record the number; a font or
  device-scale difference is a finding, not a tolerance to widen silently.
- **STOP** if a lower grid fixture still has no painted bounds after the wheel
  clamp. Record which fixture; do not delete its checks to make the twin green.
- **STOP** if `highlights()` reports the typography runs in a different order
  than paint order, or reports none. The twin's alignment half depends on the
  three `hello` washes and the two `hello weight` washes.
- **STOP** if a needed host verb is missing (see §2).

## 5. Test plan

The three scenarios **are** the tests; every check can fail. Required mutation
proofs, run one at a time in the real window, observe the failure, revert:

- **M1** change `LayoutProbe`'s `gap` from `8` to `12` → `live-layout-flex`
  fails on the gap check with the measured `12`.
- **M2** change `GRID`'s `gap` from `10` to `12` → `live-layout-grid` fails on
  a gap/track check with the measured delta.
- **M3** change the typography fixture's explicit `lineHeight` from `30` to
  `24` → `live-typography` fails "one line uses the declared height" with
  `expected 30 ± 1, got 24`.
- **M4** (reverse) expect the `alignSelf: "flex-end"` edge at `180` → fails with
  the measured `200 ± 1`.

After reverting, the focused run must be green twice in a row.

## 6. Verification commands

```sh
nub run --filter playground build
nub apps/playground/dist/live/run.js --list | grep -E 'live-layout|live-typography'
nub apps/playground/dist/live/run.js --only live-layout-flex,live-layout-grid,live-typography
```

Expected: `3/3` scenarios passed, exit `0`, three screenshots under
`apps/playground/.artifacts/live/`. Record the check total.

Headless controls (the view change is one `testId`):

```sh
nub apps/playground/dist/smoke/run.js --only layout-flex,layout-grid,typography-layout
```

Expected: `3/3`, unchanged check totals (`10 + 76 + 28`).

End-of-task gate:

```sh
nub run check
nub run lint
nub run test
nub run --filter playground build
nub apps/playground/dist/smoke/run.js
```

Expected: all green; the headless registry stays **103/103** (`3653` checks,
64 capabilities). The headless CLI runs the whole registry with **no arguments**
(its `--all` is a live-runner flag; plan `531`). The full **live** suite is the
merge/release gate and is **not** run for this task; the live registry moves
`76 → 79`.

## 7. Acceptance

- The three live ids exist, are listed by `--list`, and are green twice.
- Every asserted number is measured; the plan records the check count and any
  window/offscreen difference.
- The mutation proofs were observed failing and reverted.
- `COMPONENTS.md`, `TODO.md`, `PLAN.md` (D77) and the playground README carry
  the result; no colour or a11y claim is invented.
- `check`, `lint`, `test` and the full headless suite are green.

## 8. Measured record (2026-10-19)

**Result:** `3/3` focused scenarios, exit `0`, **120 checks** (11 + 77 + 32),
three consecutive green runs. Live registry `76 → 79` (derived:
`--list | wc -l`). Screenshots:
`.artifacts/live/live-layout-flex.png`, `live-layout-grid.png`,
`live-typography.png`.

| Measurement | Value |
| ----------- | ----- |
| flex | `640/200/320` widths, `8` px gap, absolute insets `24/16`, A and B share a row |
| grid tracks | `93.33` per track, `10` px gaps, third track ends at `300` |
| grid rows | `145 × 95` explicit cells, column 2 at `155`, row 2 at `105` |
| auto and row-count | auto grid `90` with a `60` child and row 2 at `70`; declared child `10`, third explicit row at `36.5` |
| column minima | default/zero `145`; `min-content` `104` filling `300`; `max-content` `38` leaving `234` |
| lower fixtures | centred cells `115/155`, nested offset `155` with a `70.5` track, overflow `500` with the neighbour at `155`, `flexGrow` `300/145` |
| wrapping | fixed row `200` with line 2 at `104`; `alignContent: "start"` at `38`; auto height `68` with line 2 at `38` |
| the grid pan | the wrapper reports `y <= -300` after a `-400` wheel (measured clamp `-392`; content `992`, viewport `640`) |
| typography | `30/60` line heights; `19.5/26/39` default line boxes; bold wider by > 2 px; `alignSelf` `100/200`; `justifyContent` `70`; `textAlign` left/centre/right all at glyph x `0` |

**No live/offscreen difference was measured.** The window mount is at the
content origin, so the twins subtract `type-root`'s `x` rather than assuming it;
the numbers themselves match plan `341`/`342` exactly.

**Mutation proofs, each observed and reverted:**

| # | Mutation | Observed |
| - | -------- | -------- |
| M1 | `LayoutProbe` gap `8 → 12` | failed "the live gap between the boxes": `expected 8 ± 1, got 12` |
| M2 | `GRID` gap `10 → 12` | failed "live first track width": `expected 93.33 ± 1, got 92` |
| M3 | typography `lineHeight 30 → 24` | failed "a live one-line run uses the declared height": `expected 30 ± 1, got 24` |
| M4 | expected `alignSelf: "flex-end"` at `180` | failed with the measured `expected 180 ± 1, got 200` |

**Focused ids run:** `live-layout-flex,live-layout-grid,live-typography`
(three green runs and four mutation runs), plus the headless controls
`layout-flex,layout-grid,typography-layout` (3/3, `10 + 76 + 28` checks).
The full live suite was **not** run (merge/release gate). Full headless
**103/103** (`3653` checks, 64 capabilities), exit `0`; `nub run check`,
`nub run lint` and `nub run test` green (playground 417 tests, testing 61,
components 308, primitives 282, tokens 196, tw 103, icons 19, docs 7).

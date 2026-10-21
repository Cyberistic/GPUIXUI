# 835 — The box model, in the frame: padding, margin, the percentage basis and what `bounds` actually reports

Status: landed 2026-10-21. Executor: the `playground` workstream
(`apps/playground`, `packages/testing`).

## 1. The claim being guarded

The shipped library insets with `padding` in **144** call sites, places with
`margin` in **8** component sites (plus every separator inset and the slider
thumb), and sizes with a percentage in **29**. Three of those are explicitly
load-bearing:

- `packages/primitives/src/core/style.ts:525` — the slider thumb's
  `marginLeft: -half` / `marginRight: -half` pull half a thumb out of the flow so
  its **centre** lands on the value. Without negative margins the thumb sits
  half a thumb to the right.
- `style.ts:339–347` — `Rule` insets both ends of a separator with a
  per-side margin.
- `packages/components/src/menu/item.tsx:306` and `timeline.tsx:160` — a row's
  vertical rhythm is `marginTop` + `marginBottom`.

**No scenario in either registry asserts a padding, a margin, a percentage
resolved against a padded parent, or what `getElementBounds` returns for a
padded/bordered box.** `layout-flex` reads fixed widths and one absolute inset;
`size-constraints` resolves `"100%"`/`"50%"` against an **unpadded** parent;
`flex-layout` distributes a row whose items carry no margins; `border-pixels`
samples a border and a radius. A runtime that ignored `padding`, applied only a
uniform inset, refused a negative margin, collapsed vertical margins, or
resolved a percentage against the border box passes the whole suite.

**The bug being guarded:** every dialog body, card, panel, menu row and
separator is positioned by one of these rules; a wrong basis shows up as a
clipped label or a mis-centred thumb, never as a failed check.

## 2. Reconnaissance (measured on this host, 2026-10-21)

One throwaway probe (`box-recon.tsx`, deleted before this plan landed) mounted
the fixtures below in a 480-wide column and read every `bounds`.

| fixture | declaration | measured `{x,y,width,height}` |
| ------- | ----------- | ----------------------------- |
| `pad` | 240 × 120, `padding: 16` | **`16,16,240,120`** |
| `pad` child | `width: "100%"`, height 20 | **`16,16,208,20`** |
| `pad` text | 16 px line after the child | `16,36,208,19.5` |
| `pad-sides` | 240 × 120, padding L40 R8 T4 B24 | `40,144,240,120` |
| `pad-sides` child | `width: "100%"` | **`40,144,192,20`** |
| `pad-border` | 240 × 120, `padding: 16`, `borderWidth: 2` | **`18,298,236,116`** |
| `pad-border` child | `width: "100%"` | **`18,298,204,20`** |
| `pad-half` child | `width: "50%"` in a 240 box, padding 16 | **`104`** |
| `pad-height` child | `height: "100%"` in a 200 × 100 box, padding 20 | **`60`** |
| `pad-row` | 300 × 60, `padding: 10`, two `flexGrow: 1` | children **`140 / 140`** at `x 10 / 150` |
| `margin-row` | 300 wide: A 50, B `marginLeft: 20`, C `marginLeft: -10` | x **`0 / 70 / 110`** |
| `margin-column` | A 20 tall `marginBottom: 20`, B 20 tall `marginTop: 10` | container **70**, B.y − A.y = **50** |
| `margin-center` | 60-tall row, `alignItems: "center"`, 20-tall child, margins 10/30 | child y − row y = **10** |
| `margin-stretch` | 60-tall row, default stretch, text child margins 10/10 | height **40**, y offset **10** |

Measured rules:

1. **`bounds` is not the painted box** (the rule plan `529` §6.5 recorded, now
   asserted in both hosts). `x`/`y` are the **content origin**
   (border + padding are subtracted) while `width`/`height` are the
   **padding box** (declared size includes padding, excludes border). A
   borderless 240-wide box with `padding: 16` reports `x = 16`, `width = 240`;
   with a 2 px border it reports `x = 18`, `width = 236`. The painted box is
   `x − paddingLeft − borderLeft` for the origin and `width + 2 × border` for the
   extent — padding moves the origin without changing the size.
2. **Padding is per-side and subtracts only its own axis** (`240 − 40 − 8 =
   192`).
3. **A percentage resolves against the content box**: `"50%"` of a 208 px
   content width is 104; `height: "100%"` of a 60 px content height is 60.
4. **Flex grow distributes the content box**: a 300-wide row with `padding: 10`
   gives its children 140 each starting at `x = 10`.
5. **Margins place a flex item exactly, and a negative margin pulls it back**
   (B starts 20 after A ends; C starts 10 before B ends, overlapping it).
6. **Vertical margins do not collapse in a flex column**: 20 + 20 + 10 = 50
   between the two boxes and 70 for the container.
7. **`alignItems: "center"` centres the margin box**: a 20-tall child with
   10 + 30 margins in a 60-tall row sits at `+10`, not `+20`.
8. **Stretch subtracts the margins**: 60 − 10 − 10 = 40.

**A consequence for consumers.** `packages/components/src/internal/placement.ts`
computes its room from `trigger.y` and `trigger.x + trigger.width`. With rule 1,
a padded trigger overstates its right room by `paddingRight` and its left/top
room is short by `paddingLeft`/`paddingTop`. The probe measures the raw
overshoot; the component fix is recorded as a cross-team row, not edited here.

## 3. Design

### 3.1 The fixture

Two **480-wide columns** side by side on one 984-wide stage (`gap: 24`,
`alignItems: "flex-start"`), so the whole view is ~500 tall and fits the live
1100 × 720 window without a wheel. Each fixture is a **wrapper** (an unpadded,
fixed-size row) around the padded box, so its painted origin is known without
subtracting anything: `padded.x − wrapper.x = paddingLeft + borderLeft`.

Twelve fixtures: uniform padding, per-side padding, border + padding, percentage
width, percentage height, a padded grow row, a margin row (positive + negative),
a margin column (no collapse), a centred margin box, a stretched margin box, and
a padded surface whose padding band is a hit target.

### 3.2 The checks (~32 load-bearing assertions among 63 per host)

Every expectation comes from `box-inset-model.ts`; the scenario restates no
number.

1. `the box fixtures are distinct` — ids unique.
2. `the stage is 984 wide`.
3. `padding shifts the content origin` — `pad.x − wrap.x = 16`, same for `y`.
4. `the padding band is part of the box` — reported width is the declared 240.
5. `padding shrinks the content width` — child 208.
6. `padding shrinks the content height` — the 84-tall box leaves 52.
7. `per-side padding uses only its own axis` — 192, x offset 40.
8. `per-side padding keeps the vertical inset` — y offset 4.
9. `a border adds to the origin` — 18.
10. `a border is excluded from the reported width` — 236; height 116.
11. `a border and padding both shrink the content` — 204.
12. `a percentage width resolves against the content box` — 104.
13. `a percentage height resolves against the content box` — 60.
14. `a padded grow row splits its content box` — 140 / 140.
15. `a padded grow row starts at its content origin` — first child x =
    wrapper.x + 10.
16. `a padded grow row hands out every content pixel` — 280.
17. `a positive margin offsets the next item` — B.x − A right = 20.
18. `a negative margin pulls the next item back` — C.x − B right = −10.
19. `a negative margin overlaps its neighbour` — 10 px.
20. `vertical margins do not collapse` — B.y − A.y = 50, container 70.
21. `a centred margin box centres its margin box` — +10.
22. `stretch subtracts the margins` — height 40, y offset 10.
23. `the bounds rectangle is the content origin and the padding box` — for the
    consumer fixture: `bounds.x − wrap.x = 12` and
    `bounds.x + bounds.width − paintedRight = 12` (the overshoot).
24. `a press in the padding band reaches the box` — `box=1 child=0`.
25. `a press on the child reaches the child` — `child=1 box=1`.
26. The readouts name both counters after each press (two checks).

### 3.3 The pure helper — `apps/playground/src/scenarios/box-inset-model.ts`

```ts
/** The four insets a fixture declares, as the runtime applies them. */
export interface Insets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}
/** A box as `getElementBounds` reports it: content origin, padding-box size. */
export interface OpaqueBox { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
/** The painted rectangle from a reported box and its insets. */
export const paintedBox: (box: OpaqueBox, insets: Insets, border: number) => OpaqueBox;
/** The content width/height a padded box leaves. */
export const contentWidth: (width: number, insets: Insets) => number;
export const contentHeight: (height: number, insets: Insets) => number;
/** The content origin of a reported box, relative to its painted parent. */
export const contentOffset: (insets: Insets, border: number) => { readonly x: number; readonly y: number };
/** A percentage of a basis, in pixels. */
export const percentOf: (basis: number, percent: number) => number;
/** The x positions a flex row gives items of `widths` with `margins`. */
export const marginRow: (widths: ReadonlyArray<number>, margins: ReadonlyArray<number>) => ReadonlyArray<number>;
/** The next item's start after a margin in a column (no collapsing). */
export const stackedStart: (previousEnd: number, marginBottom: number, marginTop: number) => number;
/** The offset `alignItems: "center"` gives a child with vertical margins. */
export const centreOffset: (rowHeight: number, childHeight: number, marginTop: number, marginBottom: number) => number;
/** The cross size stretch leaves a child with vertical margins. */
export const stretchHeight: (rowHeight: number, marginTop: number, marginBottom: number) => number;
/** The room `placement.ts` reads from a padded trigger, and the true room. */
export const boundsRight: (box: OpaqueBox) => number;
/** Whether two measured numbers agree within a pixel. */
export const near: (measured: number, predicted: number, tolerance?: number) => boolean;
```

### 3.4 The hit readout

The padded surface owns a counter and an `onClick`; its child owns another. A
`<text testId="box-hit-readout">box=N child=M</text>` names both. The steps press
with `clickWindow` at `(wrap.x + 4, wrap.y + 4)` (inside the padding, outside the
child) and then at the child's centre, and assert the readout after each.

## 4. Exact files

Create:

1. `apps/playground/src/scenarios/box-inset-model.ts`
2. `apps/playground/src/scenarios/box-inset-model.test.ts`
3. `apps/playground/src/scenarios/box-inset.tsx` — the two-column view, shared
   `boxChecks`, headless `box-inset` and `boxInsetView` / `boxInsetLiveScenario`.

Change:

4. `apps/playground/src/scenarios/index.ts` — import + register `boxInsetScenario`;
   capability `layout`.
5. `apps/playground/src/live/scenarios.tsx` — the `live-box-inset` twin.
6. `apps/playground/README.md` — a `### The box model (plan 835)` section with
   the measured table, the bounds contract, the consumer trap, and the
   live-registry row.
7. `COMPONENTS.md` — the `layout` capability row gains both ids; the
   `Stack / layout primitives` row records the measured rules; the live count
   moves 116 → 117.
8. `PLAN.md` — one decision row (D102).
9. `TODO.md` — one ticked row plus a **cross-team** row for `placement.ts`.
10. `.agents/slop/plans/README.md` — this plan's row and a note that `834` was
    claimed elsewhere, `835` verified free across every worktree at claim time.

Delete:

11. `apps/playground/src/scenarios/box-recon.tsx` and its registry entry.

## 5. Steps, commands, expected results

1. `nub run --filter playground test box-inset-model` → the new unit tests pass.
2. `nub run --filter playground build` → exit `0`.
3. `nub apps/playground/dist/smoke/run.js --list | grep -c box-inset` → `1`.
4. `nub apps/playground/dist/smoke/run.js --only box-inset` → `1/1 scenarios
   passed`, 63 checks.
5. `nub apps/playground/dist/live/run.js --only live-box-inset` → `1/1`, three
   consecutive runs.
6. Mutations (§6.2), each rebuilt and re-run focused; revert each.
7. `nub run check`, `nub run lint`, `nub run test` → exit `0`. The full headless
   suite is the end-of-task check for the registry change.

## 6. Test plan

### 6.1 Unit tests (`box-inset-model.test.ts`)

1. `contentWidth(240, 16)` → 208; `contentHeight(84, 16)` → 52.
2. `contentWidth(240, {left: 40, right: 8})` → 192 (per-side, not doubled).
3. `contentWidth(236, 16)` → 204 (the border already removed by the report).
4. `contentOffset({top: 4, left: 40})` → `{x: 40, y: 4}`.
5. `percentOf(208, 50)` → 104; `percentOf(60, 100)` → 60.
6. `paintedBox({x:16,y:16,width:240,height:120}, 16)` →
   `{x:0,y:0,width:240,height:120}` for a borderless box.
7. `paintedBox` with a 2 px border puts the origin at 0 and grows the width by 4.
8. `marginRow([50,50,50],[0,20,-10])` → `[0, 70, 110]`.
9. `stackedStart(20, 20, 10)` → 50 (no collapsing).
10. `centreOffset(60, 20, 10, 30)` → 10; `(60, 20, 0, 0)` → 20.
11. `stretchHeight(60, 10, 10)` → 40; it never goes negative
    (`(20, 20, 20)` → 0).
12. `near` accepts 1 px and rejects 2.

### 6.2 Runtime mutations (each must fail by name, then be reverted)

- **M1** drop `padding` from the uniform fixture → `padding shrinks the content
  width` (240).
- **M2** make the per-side fixture uniform `padding: 40` → `per-side padding
  uses only its own axis` (192 becomes 160) and the x offset check.
- **M3** drop `borderWidth` from the border fixture → `a border adds to the
  origin` (16, not 18).
- **M4** `"50%"` → `"100%"` → `a percentage width resolves against the content
  box` (208, not 104).
- **M5** drop the 20 px `marginLeft` → `a positive margin offsets the next item`
  (0).
- **M6** `-10` → `0` → `a negative margin overlaps its neighbour` (0).
- **M7** drop `marginBottom: 20` → `vertical margins do not collapse` (30).
- **M8** `alignItems: "center"` → `"flex-start"` → `a centred margin box
  centres its margin box` (0).
- **M9** stretch → `"flex-start"` → `stretch subtracts the margins` (26).
- **M10** hand the padded box's `onClick` to the child (or make the child cover
  the padding) → `a press in the padding band reaches the box`.
- **U1** make `contentWidth` ignore the insets → unit tests 1–3 fail.
- **U2** make `marginRow` ignore negative margins → unit test 8 fails.

## 7. STOP conditions

1. `padding`, `margin` or a percentage is absent from the pinned typings, or a
   declared value has no measurable effect — record the measured direction and
   re-plan around it.
2. A measured number differs from the model by more than ±1 px after the wrapper
   geometry is confirmed — record the rule instead of widening the tolerance.
3. `bounds` turns out to be the painted box on this binding (contradicting §2) —
   stop and re-measure; the whole consumer-trap section depends on rule 1.
4. The live window cannot read a fixture inside 720 px without a wheel — split
   the columns or drop the fixture, never silently skip it.

## 8. Acceptance

- [ ] `box-inset` and `live-box-inset` are registered and green.
- [ ] M1–M10 fail by name; U1–U2 fail the model suite.
- [ ] The model owns the inset, margin, percentage and bounds arithmetic; the
      scenario restates no expectation.
- [ ] `box-recon.tsx` and its registry entry are gone.
- [ ] README, `COMPONENTS.md`, `PLAN.md`, `TODO.md` and the plans index record
      the measured facts, the consumer trap and the exact ids run.
- [ ] `nub run check`, `nub run lint`, `nub run test` pass.

## 9. Outcome

Executed 2026-10-21 on this host. Both hosts agree on every number.

**Green.** `box-inset` and `live-box-inset` are **63 checks each**
(the twelve fixtures' paint checks included), the live twin three consecutive
focused runs at **~0.45 s** each; the headless run is **~0.28 s**. Bounds-only,
so the probe costs no frame decode.

**Measured** — identical to §2 with two additions from the shipped fixture set:

| relation | measured |
| -------- | -------- |
| uniform padding | origin **+16/+16**, report **240 × 120**, content **208 × 88** |
| per-side padding | origin **+40/+4**, content width **192** |
| border + padding | origin **+18**, report **236 × 116**, content **204** |
| percentages | `"50%"` of 208 → **104**; `height: "100%"` of 60 → **60** |
| grow inside padding | **140 / 140** from **+10** (280 content px) |
| margins | x **0 / 70 / 110**; the −10 pair overlaps by **10** |
| vertical margins | **+50** between the boxes and **70** for the column |
| centred margin box | **+19** for 4/6 margins in 60 (`flex-start` → **4**) |
| stretch | **40** high, starting **+10** |
| bounds consumer | origin **+12**, `x + width` overshoots the painted right by **12** |
| the padding band | a press at **+4** runs the box (`box=1 child=0`); the child runs alone at its centre (`box=1 child=1`) |

**A null result, recorded.** The first centred fixture used `marginTop: 10` /
`marginBottom: 30` in a 60 px row. The margin box exactly fills the row, so
centring and `flex-start` both measure **+10**, and the `alignItems` mutation
passed. The fixture now uses 4 / 6 and the mutation fails by name.

**Mutation proofs**, each rebuilt, run focused and reverted:

| # | mutation | check that failed | measured |
| - | -------- | ----------------- | -------- |
| M1 | all padding set to 0 | `padding shifts the content origin` | `expected 16, got 0` |
| M2 | right padding := left | `per-side padding shrinks only its own axis` | `expected 192, got 160` |
| M3 | `borderWidth` dropped | `a border adds to the origin` | `expected 18, got 16` |
| M4 | `"50%"` → `"100%"` | `a percentage width resolves against the content box` | `expected 104, got 208` |
| M5 | the +20 margin dropped | `margins place the row exactly` | `expected 0,70,110, got 0,50,90` |
| M6 | the −10 margin zeroed | `margins place the row exactly` | `got 0,70,120` |
| M7 | `marginBottom` dropped | `vertical margins do not collapse` | `expected 50, got 30` |
| M8 | `alignItems: center` → `flex-start` | `alignItems center centres the margin box` | `expected 19, got 4` |
| M9 | stretch → `flex-start` | `stretch subtracts the vertical margins` | `expected 40, got 19.5` |
| M10 | the box's `onClick` removed | `a press in the padding band reaches the box` | `got "box=0 child=0"` |
| U1 | `contentWidth` ignores the insets | 3 unit tests | `expected 240 to be 208` |
| U2 | `marginRow` ignores the leading margin | 2 unit tests | `expected [0,50,120] to equal [0,70,110]` |

**A finding for the component layer.** The bounds rectangle is a
**content-origin / padding-box** pair, so `packages/components`' `placement.ts`
overstates a padded trigger's trailing room by its leading padding. Recorded on
the existing cross-team geometry row in `TODO.md` with the measured **12 px**
overshoot and the recovery formula; the playground does not edit that package.

**A harness regression the registry growth exposed.** The extra scenario pushed
`nav-text-native` below the sidebar list's fold (row y **826** against a list
bottom of **788**), and `shell-selection` — which clicked that row — failed with
`clicking an entry switches the stage: expected …, got "The window is the layout
root"`. A press outside a clip never reaches a clipped child (plan `820`), so
the probe now drives the **first four rows** (`layout-flex`, `layout-grid`) and
asserts their own views; removing the row's `onClick` still fails
`clicking an entry switches the stage` by name. No product change.

**Files.** `box-inset-model.ts` (16 tests), `box-inset-model.test.ts`,
`box-inset.tsx`, the two registrations, `shell.tsx` (the fold fix), plus the
README, `COMPONENTS.md`, `PLAN.md`, `TODO.md` and index rows.

**Not claimed.** The **paint** of the padding band is not sampled (the probe is
bounds-only; `border-pixels` measured that a box's fill covers its border box,
not its padding band by name). `margin: "auto"` is not expressible in the pinned
`StyleDesc` (`margin` is a number), so auto-margin centring is not measured.
`boxSizing` does not exist; the runtime's rule is the one measured above.

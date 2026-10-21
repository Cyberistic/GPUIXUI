# 839 — The positioning contract, in the frame: the containing block, `fixed` == `absolute`, out-of-flow, inset resolution and paint order

Status: landed 2026-10-21. Executor: the `playground` workstream
(`apps/playground`, `packages/testing`).

## 1. The claim being guarded

`position` appears in **146** scenario and shipped call sites, and it is the
basis of every overlay in the library: the dialogs and drawers (an `anchored`
veil), the toast viewport, the context and dropdown menus, the docking drop bar,
the scrollbar rail, the notification panel, the message scroller's affordance.
Three rules are written in prose and **asserted nowhere**:

- `packages/primitives/src/core/style.ts` and `COMPONENTS.md` say
  `absolute`/`fixed` "resolve against the mount parent";
- `COMPONENTS.md`'s scroll recipe says the rail needs a `position: "relative"`
  wrapper;
- `@gpuix/native`'s `apply_styles` comment says `fixed` lays out **exactly like**
  `absolute` because taffy has no viewport-fixed position.

No scenario in either registry reads one of them. `border-pixels`,
`hidden-surface`, `workspace-panes` and `docking-layout` *use* absolute boxes;
plan `791` measured one in-window recipe and plan `164` a pointer-positioned
`anchored` layer. So a runtime that resolved an absolute box against the nearest
positioned ancestor instead of its direct parent, that let a `fixed` box escape
its parent's clip, that placed a child from the wrong corner, or that painted a
positioned child above its in-flow successors would pass the whole suite while
every overlay in the library landed in the wrong place.

**The bugs being guarded:**

1. an overlay mounted under a scrolled pane would jump if the containing block
   were the scroller rather than the direct parent;
2. a "fixed" veil inside an `overflow: "hidden"` or scrolling ancestor would be
   silently clipped away (the components' dialog veil is exactly this shape);
3. a draw order that puts a positioned row under a later in-flow sibling paints
   a menu behind the content it should cover.

## 2. Reconnaissance (measured on this host, 2026-10-21)

Two throwaway probes (`position-recon*.mjs` / `probe*.mjs`, deleted before this
plan landed) mounted the fixtures below under the offscreen `TestRenderer` and
read every `bounds`. Basis of every number: `bounds.x/y` is the **content
origin** and `bounds.width/height` the **padding box** (plan `835`).

| fixture | declaration | measured |
| ------- | ----------- | -------- |
| static parent, padding 10 | 200 × 100, child `absolute` `top 5 left 5` | child at parent painted origin **+15** (= 10 + 5) |
| relative parent | same, parent `position: "relative"` | **+15**, identical to the static parent |
| static mid under a relative grandparent | grandparent `relative`; mid `marginTop 30 marginLeft 40`, padding 6; child `absolute 4/4` | child at the **mid's** padding-box origin +4 (**54, 444**), not the grandparent's (**14**) |
| border + padding | parent padding 8, `borderWidth 4`, child `5/5` | child at **19** = painted origin 10 + border 4 + 5 (the padding box, border excluded) |
| no insets | padded parent (12), `absolute` with no insets | child at the parent's **content** origin (**22**) |
| one axis only | `left: 30`, one 24-tall in-flow child before it | `x` = padding box + 30 (**40**), `y` = **144** = the static flow position after the child |
| `fixed` | parent static, child `position: "fixed"` `top 7 left 9` | **19, 397** = parent + (9, 7) — identical to `absolute` |
| out of flow | `absolute` box then a static sibling | the sibling starts at the **parent's content origin**; the absolute box displaces nothing |
| stretch | `left/right/top/bottom: 10`, no size | **20, 700, 180 × 80** (= the padding box inset by 10 on every side) |
| size wins | `left 10 right 10 width 40`; `top 10 bottom 10 height 20` | **x = left**, **w = 40**; **y = top**, **h = 20** |
| trailing edges | `right: 10 bottom: 10`, 30 × 30 | **170, 70** in a 200 × 100 parent |
| negative inset | `top: -10 left: -10` | **0, 880** — reported outside the parent, unclipped |
| `relative` | `top: 10 left: 15`, 40 × 20 | painted at **+10/+15**; the **following sibling keeps its flow slot** (no shift) |
| paint order | `absolute` 120 × 80, then an in-flow 120 × 80 | a press at the overlap reaches the **in-flow** element; a press on the absolute-only part reaches the absolute |
| absolute in a scroller | `top 20 left 10` inside `overflowY: "scroll"`, content 400 | moves with the content: `y 330 → 230` after a `-100` wheel |
| absolute below a clip | `top: 110` in a 100-tall `overflow: "hidden"` parent | bounds reported (`420`), but a press at the painted point is **refused** |
| `fixed` under a clip | `top: 60`, 60 × 80 in a 100-tall `overflow: "hidden"` parent | a press **inside** the clip runs it; a press **below** the clip is refused |

Measured rules:

1. **The containing block is the direct parent's padding box** — not the nearest
   positioned ancestor, and not the mount root. `position: "relative"` on the
   parent changes nothing (it is already the parent); `relative` on a
   grandparent does nothing.
2. **`fixed` is `absolute`.** There is no viewport-fixed position, so a "fixed"
   box is in its parent's coordinate space and **is clipped by its parent's
   clip** (rule 7).
3. **An absolute box is out of flow**: it takes no flow slot and does not
   displace a sibling; a `relative` box **keeps** its slot and paints offset.
4. **Insets resolve against the padding box**: `left`/`top` from the leading
   edge, `right`/`bottom` from the trailing one.
5. **A declared size beats the opposing inset** (`left` wins over `right`,
   `top` over `bottom`); with **both** insets and no size the box **stretches**
   between them; with **no** insets it sits at its **static position** (the
   content origin, or after the in-flow content).
6. **A negative inset paints outside the parent** and the bounds report it.
7. **Paint order is tree order, positioned or not** — a later in-flow sibling
   covers an earlier absolute one, so an overlay must be rendered last.
8. A clipping ancestor clips an absolute or `fixed` descendant's paint **and
   hit area**, even though `bounds` still reports the painted-outside box.

**Consequences for the library** (recorded, not edited here):

- The scrollbar rail's `position: "relative"` wrapper works because it is the
  **direct parent** of the track and thumb — not because it is `relative`. The
  recipe is right; the stated reason is loose.
- Any "fixed" veil is a lie on this pin: it cannot cover the window and is
  clipped by every scrolling or `overflow: "hidden"` ancestor. A full-window
  veil must be an app-root in-flow/absolute sibling (the cross-team row from
  plan `791`).
- An overlay must be the **last** child of its containing block, or a later
  sibling paints and hits on top of it (plan `184`'s float tab found the same
  rule by reversing the order).

## 3. Design

### 3.1 The fixture

One **960-wide stage**, `flexDirection: "row"`, `gap: 24`, `alignItems:
"flex-start"`, three 300-wide columns of fixtures, so the whole view is about
560 tall and fits the live 1100 × 720 window without a wheel. Every fixture is
an **unpadded wrapper** (a fixed-size row) around the parent under test, so the
parent's painted origin is known from the wrapper without arithmetic.

Fifteen fixtures, grouped:

- **Column 1 — the containing block:** static parent; relative parent (twin);
  static mid under a relative grandparent; border + padding; no insets; one
  axis + static position.
- **Column 2 — the box:** out of flow (absolute then a static sibling);
  stretch; size wins (both axes); trailing edges; negative inset.
- **Column 3 — interaction:** `relative` keeps its slot (with a following
  sibling and a press at the painted spot); paint order (two presses);
  absolute in a scroller (a wheel); absolute below a clip and `fixed` under a
  clip (two presses each).

### 3.2 The checks (~60 per host)

Every expectation comes from `position-model.ts`; the scenario restates no
number.

1. `the fixtures are distinct`, `the stage is 960 wide`.
2. `the stage's content origin is the basis` (premise).
3. `an absolute box is placed from its parent's padding box` (+15 from the
   painted origin, i.e. +5 from the content origin).
4. `a relative parent is not the containing block` — the twin's offset equals
   the static parent's.
5. `the direct parent is the containing block, not a positioned ancestor` — the
   static mid's child sits at the mid's origin + 4, and is 40 px from the
   grandparent's answer.
6. `the containing block excludes the border` — +19 with a 4 px border.
7. `no insets uses the static position` — the content origin.
8. `a declared axis inset is measured from the padding box` (x = +30).
9. `the other axis keeps its static position` (y after the in-flow child).
10. `fixed is absolute` — the two twins' offsets are equal, and both are inside
    the parent, not the window origin.
11. `an absolute box takes no flow slot` — the static sibling starts at the
    content origin.
12. `both insets and no size stretch the box` (180 × 80).
13. `the leading inset wins over the trailing one` (x = left, w = 40).
14. `the top inset wins over the bottom one` (y = top, h = 20).
15. `the trailing insets place from the far edge` (170, 70).
16. `a negative inset paints outside the parent` (x = −10 from the painted
    origin; the box lies outside the parent's rectangle).
17. `a relative box keeps its flow slot` — the following sibling is unmoved.
18. `a relative box paints at its offset` (+10/+15) and a press there runs it.
19. `a later sibling paints over an earlier absolute box` — the overlap press
    reaches the in-flow element.
20. `an absolute box is hit on its exposed part` — the second press reaches it.
21. `an absolute box scrolls with its containing block` (a `-100` wheel moves
    it by exactly −100, read from `getScrollOffset`).
22. `a clipping ancestor refuses a press outside it` — the absolute below the
    clip counts nothing.
23. `a clipping ancestor still refuses a fixed box's overflow` — the below-clip
    press counts nothing while the inside press runs it.

### 3.3 The pure helper — `apps/playground/src/scenarios/position-model.ts`

Reuses `Insets`, `ReportedBox` and `near` from `box-inset-model.ts` (plan `835`)
— one inset vocabulary, two probes.

```ts
/** The padding box origin of a reported box: the absolute containing block. */
export const paddingBoxOrigin: (parent: ReportedBox, insets: Insets) => Point;
/** Where a sized/inset box lands, or its static origin when no inset is set. */
export interface Placement {
  readonly top?: number;
  readonly right?: number;
  readonly bottom?: number;
  readonly left?: number;
  readonly width?: number;
  readonly height?: number;
}
export const placeAbsolute: (basis: Point, size: Size, placement: Placement, staticOrigin: Point) => Rect;
/** The flow slot a relative box keeps, and where it paints. */
export const relativePaint: (flowOrigin: Point, offset: Point) => Point;
/** The start of the next in-flow sibling after a `size`-tall box. */
export const flowNext: (origin: Point, height: number) => Point;
/** Whether `child` lies outside `parent` on any side. */
export const outsideOf: (parent: Rect, child: Rect) => boolean;
/** Whether two boxes are the same offset (the fixed/absolute twin rule). */
export const sameOffset: (a: Point, b: Point) => boolean;
```

`placeAbsolute` is the whole CSS-ish rule set: a declared size plus its leading
inset wins; both insets with no size stretch; trailing insets place from the far
edge; neither inset falls back to the static origin.

### 3.4 The hit readout

One `<text testId="pos-hit-readout">…</text>` names the last handler that ran
(`none`/`abs`/`flow`/`rel`/`fixed`), reset by a `reset` press target. Each press
step asserts the readout after it, so a press that reaches nothing is a failed
check, not a silent pass.

## 4. Exact files

Create:

1. `apps/playground/src/scenarios/position-model.ts`
2. `apps/playground/src/scenarios/position-model.test.ts`
3. `apps/playground/src/scenarios/containing-block.tsx` — the three-column view,
   the shared `positionChecks`, the headless `containing-block` scenario and
   `containingBlockView` / `containingBlockLiveScenario`.

Change:

4. `apps/playground/src/scenarios/index.ts` — import + register
   `containingBlockScenario` (beside `boxInsetScenario`).
5. `apps/playground/src/live/scenarios.tsx` — the `live-containing-block` twin.
6. `apps/playground/README.md` — a `### The positioning contract (plan 839)`
   section: the measured table, the eight rules, the three consequences.
7. `COMPONENTS.md` — the `layout` capability row gains both ids; the
   `Boxes / containers` row records the rules; the live-registry count moves
   `117 → 118`.
8. `PLAN.md` — decision row D103.
9. `TODO.md` — one ticked row, plus a **cross-team** row for the components
   veil/overlay draw order (owner `components`) citing this probe.
10. `.agents/slop/plans/README.md` — this plan's row and a note that `834`/`836`
    /`838` were claimed elsewhere and `839` was verified free across every
    worktree at claim time.

Delete: `apps/playground/.artifacts/position-recon*.mjs` and `probe*.mjs`.

## 5. Steps, commands, expected results

1. `nub run --filter playground test position-model` → the new unit tests pass.
2. `nub run --filter playground build` → exit `0`.
3. `nub apps/playground/dist/smoke/run.js --list | grep -c containing-block` →
   `1`.
4. `nub apps/playground/dist/smoke/run.js --only containing-block` → `1/1
   scenarios passed`, about 60 checks.
5. `nub apps/playground/dist/live/run.js --only live-containing-block` → `1/1`,
   three consecutive runs.
6. Mutations (§6.2), each rebuilt and re-run focused; revert each.
7. `nub run check`, `nub run lint`, `nub run test` → exit `0`. The full headless
   suite is the end-of-task check for the two registry changes.

## 6. Test plan

### 6.1 Unit tests (`position-model.test.ts`)

1. `paddingBoxOrigin({x:22,y:22,…}, allSides(8))` → `{x:14,y:14}` (the border
   already excluded by the report).
2. `placeAbsolute` with `left 5, top 5` in a 200 × 100 basis → `{x:5,y:5}` from
   the origin.
3. `placeAbsolute` with `right 10, bottom 10, 30 × 30` in 200 × 100 →
   `{x:160,y:60}`.
4. `left 10 + right 10 + width 40` → `x:10, width:40` (leading wins).
5. `top 10 + bottom 10 + height 20` → `y:10, height:20`.
6. `left 10 + right 10` with no width → `width:180` (stretch).
7. No insets and no size → the static origin.
8. A negative inset → `x:-10` and `outsideOf` true.
9. `relativePaint({x:0,y:0},{x:15,y:10})` → `{x:15,y:10}`; `flowNext` after the
   relative box uses the **unoffset** slot.
10. `sameOffset` accepts a 1 px difference and rejects 2.
11. `outsideOf` is false for an exactly-fitting box and true on each side.

### 6.2 Runtime and unit mutations (each must fail by name, then be reverted)

- **M1** drop `position: "absolute"` from the stretched fixture → `both insets
  and no size stretch the box` (200 × 100 in flow).
- **M2** `top: 5` → `top: 0` on the static-parent fixture → `an absolute box is
  placed from its parent's padding box`.
- **M3** drop `borderWidth` from the border fixture → `+15`, not `+19`.
- **M4** move the absolute child out of the static mid into the relative
  grandparent → `the direct parent is the containing block`.
- **M5** `right: 10` → `left: 10` → `the trailing insets place from the far
  edge`.
- **M6** drop the explicit `width: 40` → `the leading inset wins over the
  trailing one` (180).
- **M7** `position: "relative"` on the relative fixture → `absolute` → `a
  relative box keeps its flow slot` (the following sibling moves).
- **M8** swap the paint-order children → `a later sibling paints over an earlier
  absolute box` (the absolute answers the overlap press).
- **M9** remove `overflow: "hidden"` from the clip fixture → `a clipping
  ancestor refuses a press outside it`.
- **M10** `position: "fixed"` → `"absolute"` on the *fixed* twin **is a null
  control** (they are identical); the load-bearing form is `"fixed"` →
  `"relative"` → `fixed is absolute` (the box moves with the flow).
- **M11** `top: -10 left: -10` → `0` → `a negative inset paints outside the
  parent`.
- **M12** drop the wheel step's scroller content height → `an absolute box
  scrolls with its containing block` (no movement).
- **U1** make `placeAbsolute` prefer `right` over `left` → tests 4 and 6 fail.
- **U2** make `placeAbsolute` ignore the static origin → test 7 fails.

## 7. STOP conditions

1. `position` or an inset is absent from the pinned `StyleDesc`, or a declared
   value has no measurable effect — record the measured direction and re-plan
   around it.
2. A measured number differs from the model by more than ±1 px after the wrapper
   geometry is confirmed — record the rule instead of widening the tolerance.
3. The containing block turns out to be the nearest positioned ancestor (the CSS
   rule) rather than the direct parent — stop: the whole consequence section,
   the scrollbar recipe's rationale and the cross-team veil row depend on it.
4. A press readout cannot distinguish the two overlapping boxes in a real
   window (the live protocol hits the unclipped centre) — drop the paint-order
   checks from the live twin and keep them headless, with the reason recorded.
5. The stage cannot fit the live 1100 × 720 window — split the columns or drop a
   fixture, never silently skip it.

## 8. Acceptance

- [x] `containing-block` and `live-containing-block` are registered and green.
- [x] M1–M12 fail by name (M10 in its load-bearing form); U1–U2 fail the model
      suite.
- [x] The model owns the containing-block, inset, flow-slot and equality
      arithmetic; the scenario restates no expectation.
- [x] The recon scripts are deleted.
- [x] README, `COMPONENTS.md`, `PLAN.md`, `TODO.md` and the plans index record
      the measured rules, the three consequences and the exact ids run.
- [x] `nub run check`, `nub run lint`, `nub run test` pass.

## 9. Outcome

Executed 2026-10-21 on this host. Both hosts agree on every number.

**Green.** `containing-block` and `live-containing-block` are **75 checks
each**; the headless run is ~0.8 s and the live twin three consecutive focused
runs at 1.13/1.21/1.16 s.

**Measured** — identical to §2, plus the twins and the clip:

| relation | measured |
| -------- | -------- |
| containing block | child at the parent's padding box **+5**; a `relative` parent is identical |
| positioned ancestor | a static mid (padding 6) puts the child at **+44** from the grandparent; the CSS rule answers **+4** |
| border | the padding box excludes it: the child is **+9** behind a 4 px border (content box would be **17**) |
| no insets | static position = the parent's content origin (**+12**) |
| one axis | `left: 30` from the padding box; `y` = the static position (**+34** after a 24 px flow child) |
| stretch | **180 × 80** |
| size wins | x **10**, w **40**; y **10**, h **20** |
| trailing | **160 / 60** in a 200 × 100 parent |
| negative | **−10 / −10**, reported outside the parent |
| out of flow | the static sibling at the content origin (0, 0) |
| relative | painted **+15 / +30** from the first child; the following sibling unmoved at **+40** |
| paint order | the overlap press reaches the **flow** sibling; the absolute answers on its exposed part |
| `fixed` | twin offsets both **(9, 7)**, out of flow beside a 20 px sibling |
| scroll | a `−100` wheel moves the absolute box **−100** |
| clip | a press **110 px** below a 100 px `overflow: hidden` parent is refused; the fixed box takes the press at **+80** and is refused at **+120** |

**Corrections found while landing.**

1. **M10 was a null control.** Swapping `fixed` → `relative` on the twin left it
   at the same offset, because the box was its parent's first child, so both
   `relative` and `absolute` land at (9, 7). A 20 px flow sibling in each twin
   parent makes the swap fail (`fixed and absolute place the same box the same
   way`); the mutation now proves the rule.
2. **U2 exposed a missing test.** Making `placeAxis` ignore `staticStart` passed
   the suite, because every static case used `staticStart: 0`. A non-zero case
   (`34`) fails by name.
3. **Two scenario expectations double-counted padding.** The mid-offset check
   was drafted as margin + padding + inset (**50**); the measured answer is
   margin + inset (**44**) because the padding belongs to the parent's report,
   not the child's offset. The one-axis check made the same mistake (**40** for
   **30**). Both were corrected against the measurement rather than widening a
   tolerance.

**Mutation proofs**, each rebuilt, run focused and reverted:

| # | mutation | check that failed | measured |
| - | -------- | ----------------- | -------- |
| M1 | stretch fixture's `position` dropped | `both insets and no size stretch the box` | `expected 180, got 200` |
| M2 | `top: 5` → `0` | `an absolute box is placed down from the same origin` | `expected 5, got 0` |
| M3 | child `left` = padding + inset (the content-box answer) | `the containing block excludes the border` | `expected 9, got 17` |
| M4 | the absolute child moved into the relative grandparent | `the static parent is the containing block` | `expected 4, got -36` |
| M5 | `right` → `left` | `the trailing inset places from the far edge` | `expected 10, got 160` |
| M6 | the declared width dropped | `a declared width survives a trailing inset` | `expected 40, got 180` |
| M7 | `relative` → `absolute` | `a relative box keeps its flow slot` | `expected 40, got 20` |
| M8 | the paint-order children swapped | `a later sibling paints over an earlier absolute box` | `expected "flow:2", got "abs:2"` |
| M9 | `overflow: "hidden"` dropped | `a clipping ancestor refuses a press outside it` | `expected "abs:3", got "clipped-abs:4"` |
| M10 | `fixed` → `relative` | `fixed and absolute place the same box the same way` | `expected true, got false` |
| M11 | negative insets zeroed | `a negative inset paints outside the parent` | `expected -10, got 0` |
| M12 | the wheel step removed | `an absolute box scrolls with its containing block` | `expected -100, got 0` |
| U1 | `placeAxis` prefers the trailing inset | 2 unit tests | `expected {x:20,y:20} to deeply equal {x:160,y:80}` |
| U2 | `placeAxis` ignores the static start | 1 unit test | `expected {start:34} to deeply equal {start:0}` |

**A finding outside this workstream.** The suite's own `shell-selection` probe
failed once in the end-of-task full run (`clicking an entry switches the stage`:
expected `layout-flex`'s title, got `window-layout`'s). The cause was a **stale
read**: a native click commits on a later task, and the probe asserted the stage
title immediately. It now re-establishes its precondition (`scrollIntoView` on
the first row, because `shell-navigation` leaves the sidebar scrolled) and waits
for the title with the bounded `awaitReadout`; the exact assertion is unchanged
and still fails by name.

**Not claimed.** Insets are numbers only (`top`/`left` are `number`, not
`DimensionValue`), so a percentage inset is not expressible and not measured.
An omitted `position` is the only `static` form exercised. Paint order is
measured with two overlapping boxes and a hit test, not with sampled pixels. The
`anchored` layer's own placement rules stay with plans `156`/`187`/`191`, and
the cross-cutting `zIndex` question stays with plan `811` (the pin has none).

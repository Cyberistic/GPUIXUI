# 820 — The clip contract, in the frame: what `overflow` clips, and where

**Phase:** F (native behaviour in the frame) · **Workstream:** playground ·
**Status:** planned

**Depends on:** `140`, `177`, `184`, `186`, `338`, `347`, `376`, `601`, `674`,
`690`, `697`, `701`, `707`, `708`, `713`, `715`, `722`, `724`, `734`, `736`,
`745`, `754`, `761`, `773`, `775`, `778`, `784`, `791`, `797`, `801`, `807`,
`811`, `812`, `816`, `819`.

**Owns:** `apps/playground` only (`COMPONENTS.md` and the ledgers are updated for
the record; adoption stays a cross-team row).

---

## 1. The claim being guarded

Every scrollable surface in the library — `ScrollArea`, the tabbed panes, the
multi-pane editor, every virtual list, the docking groups — relies on one
unwritten rule: **a viewport with `overflow` set paints only inside its box,
and a hit outside the box does not reach the clipped child.** The records state
the rule, but never measure it for content:

| Record | What it actually measured |
| ------ | ------------------------- |
| `apps/playground/README.md`, "Editable grid cells" **Limits** | *"paint beyond the list's own viewport clip was **not measured**"* — the named gap this plan closes |
| `scroll-affordance` (plan `801`) | only that `overflow: "auto"` does **not** clip (the 2000 px child paints below) and that `scroll` scrolls |
| `border-pixels` (plan `745`) | that `overflow: "hidden"` clips a coloured child to the **square** corner — one point at one corner, never the edge, the padding band or a scrolled-out edge |
| `collapsible-height` (plan `186`) / `hidden-surface` (plan `819`) | that a clipped body refuses a **press**; never where the paint stops |
| `native context menus` (plan `164`) | that an `<anchored>` layer inside a scroller is window-positioned; nothing about the scroller's own clip |
| `crop-area` (plan `385`) **Limits** | asserts *"a parent `overflow: hidden` does not clip an `<img>` child"* — a claim no frame sample has ever tested |

So today a runtime that clips **no** ordinary child, one that clips to the
wrong rectangle, or one that still hit-tests a clipped child passes every
check in both registries — while every panel and list in the library would be
visibly broken. The record is also self-contradictory: `auto` is "not clipped"
(plan `801`), `hidden` is clipped (plans `186`/`745`), and nothing says what
`scroll` does.

**Goal:** one isolated, frame-measured answer for each `overflow` value and
each axis, including where the clip rectangle starts (border, padding or
content box), whether it follows a scroll offset, whether it removes the hit,
and whether an `<img>` child escapes it. Pin the resolution rule in one pure
helper so a component cannot get the axes wrong silently.

---

## 2. Reconnaissance (source, pinned `0.10.0`)

Read from `.agents/slop/scratch/gpuix-build/release/gpuix/packages/native/src/`:

- `renderer.rs:5142–5180` — `overflow`/`overflowX`/`overflowY` are resolved per
  axis with **CSS precedence** (an axis-specific value overrides the
  shorthand). `scroll` on both axes → `overflow_scroll()`; only `x` →
  `flex().min_w_0().overflow_x_scroll().restrict_scroll_to_axis()`; only `y` →
  `overflow_y_scroll()`. A persistent `ScrollHandle` is attached only while an
  axis scrolls.
- `renderer.rs:5467` — **an x-only scroller is forced to `display: flex`** and
  every child is wrapped in `div().flex_none()`. A component that puts blocks
  in an `overflowX: "scroll"` box gets a **row**, whether it asked or not.
- `renderer.rs:5853–5868` — `hidden` is applied on the `Styled` trait and only
  for the resolved axes: both → `overflow_hidden()`, one → `overflow_x_hidden()`
  / `overflow_y_hidden()`.
- `style.rs:214–216` — `overflow`, `overflow_x`, `overflow_y` are three
  independent fields; `"auto"` resolves to neither `scroll` nor `hidden`, which
  is why plan `801` measured it inert.

**The open question the probe must answer:** GPUI clips to its **padding box**
for `overflow_hidden`, but GPUix applies `overflow_scroll` on a container whose
padding and border are GPUix's own — and `overflow_x_only` restructures the
children. Does the measured rectangle match the padding box, and does the
`<img>` child (a separate paint primitive) really ignore it? Either answer is a
recorded fact; an `<img>` that escapes is a cross-team defect for every panel
that contains an image.

---

## 3. Design

### 3.1 The fixture (one static view, shared by both hosts)

A 680 × 420 stage (`clip-stage`, fill `background`, `position: "relative"`).
Roles come from the dark palette through `useTheme()` so the checks assert
tokens: `card`, `success`, `primary`, `muted`, `popover`, `background`.

| Fixture | Geometry | Style | Purpose |
| ------- | -------- | ----- | ------- |
| `clip-v` | `(16, 20)`, 160 × 120, fill `muted` | `overflowY: "scroll"` | the vertical viewport |
| `clip-v-child` | 160 × **360** (6 × 60 strips, repeating `card`/`success`/`primary`) | `onClick` writes `clip-hit=child` | retained layout, clipped paint, and the hit path |
| `clip-h` | `(200, 20)`, 160 × 120, fill `muted` | `overflowX: "scroll"`, **no `display` declared** | the x-only viewport and the forced-flex row |
| `clip-h` children | `clip-h-a/b/c`, 160 × 120 each | `card`, `success`, `primary` | side-by-side proof + the right-edge clip |
| `clip-hy` | `(400, 20)`, 160 × 80, fill `muted` | `overflowX: "scroll"` | does an x-only scroller clip **y**? |
| `clip-hy-child` | 480 × 240, fill `card` | — | taller than the box |
| `clip-hidden` | `(16, 200)`, 180 × 120, `padding: 16`, `borderWidth: 2`, `borderColor: primary`, fill `muted` | `overflow: "hidden"` | the clip origin against a border and padding |
| `clip-hidden-child` | 300 × 260, fill `card` | absolute at the padding box | — |
| `clip-auto` | `(220, 200)`, 160 × 100, fill `muted` | `overflow: "auto"` | the controlled non-clip (plan `801` re-guarded) |
| `clip-auto-child` | 160 × 260, fill `success` | — | — |
| `clip-img` | `(400, 200)`, 160 × 120, fill `muted` | `overflow: "hidden"` | the one paint primitive that may escape |
| `clip-img-child` | 300 × 300 at `(40, 40)`, the existing solid 1 × 1 red data URL scaled | `<img>` | sampled inside and outside the box |
| `clip-hit` | readout below the stage (`y = 340`) | — | `clip-hit=<none\|child>` |

Only `clip-v` scrolls; the wheel target is its own box, so no other fixture can
move. The stage is static otherwise — **two frames per host**: at rest, and
after the wheel.

### 3.2 The checks (one shared `clipChecks(ctx, driver)`)

**Frame scale and preconditions (4):** the device scale is an integer; the
five fills are pairwise distinguishable at the shared tolerance (a guard, so no
later check can pass because two roles coincide); the stage point paints
`background`.

**`clip-v`, the vertical viewport (10):**

1. at rest, the point 10 px inside the top (`+10`) paints the **first strip**
   (`card`) — the child paints at all;
2. at rest, the point 10 px **below** the box paints `background` — the bottom
   clip;
3. at rest, the child still reports its **360 px** layout height — layout is
   retained, only paint is clipped (the distinction a consumer needs);
4. a wheel of `-120` moves the offset by **at least 120** (`scrollOffset`), so
   the "after" frame is a different state;
5. after the wheel, the point 10 px **above** the box paints `background` — the
   top clip, at a scrolled-out edge;
6. after the wheel, the point 10 px **below** the box still paints
   `background`;
7. after the wheel, the interior at `+10` paints the strip the **measured
   offset** selects (`stripIndexAt`), and it is **not** the rest colour —
   paint follows the offset;
8. after the wheel, the interior at `+70` paints its own strip — two points, so
   a single shifted strip cannot satisfy both;
9. a press 10 px below the box (inside the child's unclipped area) leaves
   `clip-hit=none` — hit follows the clip;
10. a press at the child's visible centre sets `clip-hit=child` — the control
    that the handler works at all.

**`clip-h`, the x-only viewport (5):** the three blocks sit at the same `y` and
`+160` apart in `x` (**the forced flex row**, no `display` authored); the point
10 px right of the box paints `background`; a point inside the box paints the
first block; the second block's centre is clipped away; the boxes' widths are
`160 ± 1` (`flex_none` keeps them).

**`clip-hy`, the missing axis (3):** 10 px right of the box paints
`background`; 10 px **below** the box paints the child's `card` — an x-only
scroller does **not** clip y; the guard that the two samples are different
roles.

**`clip-hidden`, the origin (6):** the content area paints `card`; the point
8 px inside the right edge — in the **padding band**, past the child's
unclipped content — paints the measured value (the origin: `card` means the
clip is the padding box, `muted` means the content box); 10 px outside the box
paints `background`; the top border row paints `primary`; the child still
reports 300 × 260; the padding sample is distinguishable from both candidates
if it is neither (see §7).

**`clip-auto`, the control (3):** 10 px below the box paints the child's
`success` (not clipped); `scrollOffset` is `null`; the point 10 px outside on
the right paints `muted` (the box's own fill, so the sample is inside the
element's paint area, not the stage).

**`clip-img`, the image route (3):** 40 px inside the box (over the image)
paints the image's red; the point **outside** the box where the image extends
paints the measured value (`background` = clipped, red = the image escapes the
clip); the two are distinguishable.

**Recipe guard (2, pure, once per host):** `clippedAxes` resolves a shorthand +
axis pair correctly; a helper that reports every style as clipping both axes is
named as wrong.

### 3.3 The pure helper

`apps/playground/src/scenarios/clip-model.ts`:

```ts
/** The three overflow fields `StyleDesc` publishes. */
export interface OverflowStyle {
  readonly overflow?: "visible" | "hidden" | "scroll" | "auto";
  readonly overflowX?: "visible" | "hidden" | "scroll" | "auto";
  readonly overflowY?: "visible" | "hidden" | "scroll" | "auto";
}

/** Which axes a style clips, with the runtime's CSS precedence. */
export const clippedAxes = (style: OverflowStyle): "both" | "x" | "y" | "none";

/**
 * The strip a point inside a scrolled list shows.
 * `offset` is the renderer's (negative when scrolled down).
 */
export const stripIndexAt = (
  stripHeight: number,
  offset: number,
  localY: number,
): number;
```

`clippedAxes` mirrors `renderer.rs:5155` (axis-specific overrides shorthand;
`auto`/`visible` clip nothing). `stripIndexAt` is the derived expectation for
checks 7/8, so the after-scroll colour is never hard-coded.

### 3.4 Why a new scenario, not an edit to `scroll-affordance`

`scroll-affordance` is a 93-check probe about the scrollbar and is cited by
plans `801`/`811`; its fixtures are three 180 × 160 viewports sized for the
thumb model. Adding five clip fixtures would move its geometry and its count.
A separate id keeps this evidence addressable from the `ScrollArea`,
tabbed-pane and grid limits, and `scroll-affordance` stays unchanged.

---

## 4. Exact files

| File | Change |
| ---- | ------ |
| `.agents/slop/plans/820-scroll-clip.md` | **this plan** |
| `apps/playground/src/scenarios/clip-model.ts` | **new** — `OverflowStyle`, `clippedAxes`, `stripIndexAt` |
| `apps/playground/src/scenarios/clip-model.test.ts` | **new** — the six unit tests (§6) |
| `apps/playground/src/scenarios/clip.tsx` | **new** — `clipView`, `clipScenario` (`scroll-clip`), `clipLiveScenario` (`live-scroll-clip`), `clipChecks`, the two drivers |
| `apps/playground/src/scenarios/index.ts` | import + add `clipScenario` |
| `apps/playground/src/live/scenarios.tsx` | import the view/scenario, add `liveClip` with `ready: "clip-stage"` and its PNG artifact |
| `apps/playground/README.md` | a "The clip contract (plan `820`)" section after "Scroll affordances (plan `801`)"; the grid-cell-editing **Limits** sentence points at it |
| `COMPONENTS.md` | a `clip` capability row; one sentence on the Scrollable-containers row |
| `.agents/slop/plans/README.md` | the `820` row, and `819`'s stale `planned` status corrected to `landed` |
| `TODO.md` | the ticked task + a docs-site cross-team row for the new capability |

No other path is edited (no `packages/*`).

---

## 5. Steps, commands, expected results

1. **Write the pure helper and its test first.** Run:
   ```sh
   nub run --filter playground test -- clip-model
   ```
   Expected: **red** (the module does not exist), then green after §3.3.

2. **Write the view and the headless scenario**, register it, build:
   ```sh
   nub run --filter playground build
   nub apps/playground/dist/smoke/run.js --only scroll-clip
   ```
   Expected: green, **1/1**, the check count in §8 (predicted ~40).

3. **Record the measured answers** for the four open questions (the padding-band
   origin, the x-only y-axis, the hit outside the clip, the `<img>` route) and
   put each value in §8 before the live twin.

4. **Add the live twin** and run it:
   ```sh
   nub apps/playground/dist/live/run.js --only live-scroll-clip
   ```
   The live wheel needs the pointer over the box first (`hover` + settle, plan
   `606`'s measured rule), then `wheel`, then a settle, then the second
   capture. Expected: green, the same count, one PNG artifact.

5. **Mutation proofs (both directions), each one edit + one run + a revert:**
   - `M1` drop `overflowY: "scroll"` from `clip-v` → the below-sample paints the
     child;
   - `M2` make `clip-v-child` exactly 120 px tall → check 3 fails on the height;
   - `M3` change `clip-hy` to `overflow: "hidden"` → the below-sample flips to
     `background` (the missing-axis check is load-bearing);
   - `M4` drop `overflow: "hidden"` from `clip-hidden` → the outside sample
     paints `card`;
   - `M5` `clippedAxes` returns `"both"` always → the x-only unit test fails;
   - `M6` `stripIndexAt` ignores the offset → checks 7/8 fail after the wheel;
   - **null control:** give `clip-auto` `overflow: "scroll"` → it now clips and
     scrolls, which is the *opposite* direction; recorded, not a proof of a
     bug.

   Every mutation must name the failing check. A mutation that passes means the
   check is vacuous and must be strengthened before this plan is called done.

6. **Docs and ledgers.** README section, the `COMPONENTS.md` row, the plan
   index (`820` plus the `819` correction), the ticked `TODO.md` task and the
   docs cross-team row.

7. **Gates.** `nub run check`, `nub run lint`, `nub run test` (expected exit
   `0`, playground tests `+6`), then the **whole headless registry** (a new
   scenario changes the total — the end-of-task check). The full live suite is
   a merge gate: **do not** run `--all` here.

8. **Commit and push** `agent/playground`: the plan first, then the probe and
   its records.

---

## 6. Test plan

| Test | Guards | Fails without the fix |
| ---- | ------ | --------------------- |
| `scroll clips both axes` | the shorthand rule | a resolver that treats `scroll` as visible |
| `an axis-specific value overrides the shorthand` | CSS precedence (`overflow: hidden` + `overflowX: scroll`) | a resolver that reads only the shorthand |
| `an x-only value clips nothing vertically` | the measured x-only rule | a resolver that returns `"both"` |
| `auto and visible clip nothing` | plan `801`'s inert control | a resolver that treats `auto` as `hidden` |
| `a negative offset selects a later strip` | the after-scroll expectation | a helper that ignores `offset` |
| `a point above the content clamps to the first strip` | the model's lower bound | an index that goes negative |

Runtime checks are the frame and hit assertions in §3.2; each names its
measured value in the failure message, as every pixel check does.

---

## 7. STOP conditions

- **STOP** if check 2 (the point below `clip-v`) paints the child: a scrolling
  viewport does **not** clip its content, so every panel, list and tabbed pane
  in the library leaks paint. Record it, add a cross-team row naming the
  affected components, and do not paper over it with an `overflow: "hidden"`
  wrapper inside the probe.
- **STOP** if the padding-band sample (check 6 of `clip-hidden`) is neither
  `card` nor `muted` — an anti-aliased edge. Move the sample **4 px inward** and
  record the move; never widen `TOLERANCE`.
- **STOP** if the `<img>` outside sample is the image's red and the inside
  sample is also red but the two are within tolerance of a fill: pick a point in
  the image's solid area and re-run; ambiguity is not evidence.
- **STOP** if the live frame at rest and after the wheel are identical: hover
  and settle, or `scrollTo` through the renderer; do not loosen check 4.
- **STOP** if either host needs a check removed or a tolerance above the shared
  `TOLERANCE`.
- **Do not** edit `packages/components`, `packages/primitives` or
  `packages/tokens`; adoption is a cross-team row.
- **Do not** widen `scroll-affordance`, `scroll-container` or
  `grid-cell-editing`.

---

## 8. Acceptance

- `scroll-clip` and `live-scroll-clip` exist, are green in both hosts, and
  report the same check count (predicted **~40**; the outcome records the real
  number).
- Each `overflow` value has a frame answer: `scroll` clips (both edges, moving
  with the offset), `hidden` clips (with its origin recorded), `auto` does not,
  `overflowX` clips x only, and the `<img>` route's answer is recorded.
- A press outside the clip does not reach the clipped child, and a press inside
  does — both asserted.
- The axes rule lives in one pure helper with six unit tests, and a mutation
  that collapses it to "both" fails by name.
- `apps/playground/README.md` and `COMPONENTS.md` cite the measured facts; the
  plan index (including `819`'s corrected status) and `TODO.md` are current.
- `nub run check`, `nub run lint`, `nub run test` green; the whole headless
  registry green with the new id.

---

## 9. Outcome

Filled in when the probe lands: the four measured answers, the check counts, the
focused ids run, the mutation proofs and each failing check's message.

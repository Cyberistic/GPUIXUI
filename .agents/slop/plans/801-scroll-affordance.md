# 801 — The scroll affordance: no gutter, no thumb, and the component-owned recipe

**Phase:** F (measured runtime contract) · **Workstream:** playground · **Status:** landed

**Depends on:** `041`, `100`, `110`, `120`, `140`, `152`, `166`, `173`, `177`,
`185`, `302`, `338`, `349`, `350`, `529`, `556`, `601`, `620`, `639`, `674`,
`690`, `697`, `745`, `754`, `771`, `773`, `775`, `778`, `784`, `791`, `797`.

**Owns:** `apps/playground` and `packages/testing` only. No other path is
edited; anything outside them becomes a row in `TODO.md`.

---

## 1. The claim being guarded

Three records disagree about the scrollbar, and **no scenario in either
registry reads one**:

| Record | Says |
| ------ | ---- |
| `COMPONENTS.md` → Scrollable containers | "No `scrollbarColor`, no `scrollbarWidth`, no fade mask in 0.10.0, so **the thumb is platform-themed and cannot be tinted**" |
| `packages/primitives/src/core/style.ts:358` | "GPUix 0.10.0 **paints the scrollbar with the platform theme** and exposes no `scrollbarColor`/`scrollbarWidth` … so `theme.colors.scrollbar` cannot be applied" |
| `packages/primitives/src/components/ScrollArea.tsx:4` | the same sentence, and `ScrollArea` is "only the overflow" |
| `apps/playground/src/scenarios/tab-overflow.tsx:275` | "0.10.0 **always reserves a platform scrollbar** in an `overflow: scroll` strip, so the reveal stops … 1 px past it" |

Each is a different claim about the same pixel column, and the suite proves
none of them: every scroll scenario asserts an **offset**, a **revealed box**
or a **painted row**, never the strip itself. A component that lays its last
column, its frozen header or its own thumb against `box.width` is therefore
built on an unmeasured assumption.

The pinned source (§2.1) says the strip is **zero-width and painted by
nobody** — i.e. two of the four records are wrong — but source reading is not
evidence of what the pinned rasteriser did. This plan measures it in both
hosts and, because a library must still show a scroll position, measures the
**component-owned thumb recipe** beside it.

**Goal:** record, from decoded frames and painted bounds in both hosts:

1. whether `overflowY`/`overflowX: "scroll"` reserves any gutter at all;
2. whether *any* thumb paints, during or after a scroll;
3. whether the edge strip steals a click from the content under it;
4. that `overflow: "auto"` is inert on the pin (not "a scrollbar that appears
   when needed");
5. a working, native, component-owned thumb — geometry, paint, hit target and
   a track press — so `ScrollArea` has a recipe to implement.

---

## 2. Reconnaissance

### 2.1 The pinned source (tag `9fcd6288`)

The build the suite runs against is
`.agents/slop/scratch/gpuix-build/release/gpuix` (plan `529`).

| File | Fact |
| ---- | ---- |
| `packages/native/src/renderer.rs:5143-5181` | only `"scroll"` and `"hidden"` are recognised; `"auto"` is **not** in the match, so it resolves to the default `Overflow::Visible` — no scroll, **no clip** |
| `packages/native/src/renderer.rs:5162-5175` | a scroll container is GPUI's own `overflow_scroll()` / `overflow_{x,y}_scroll()`; the binding adds no scrollbar element |
| `StyleDesc` (pinned) | no `scrollbarColor`, no `scrollbarWidth` — confirmed by `strings`: the installed binary contains **0** occurrences (plan `529` §1.1 lists both as `main`-only markers) |
| zed `crates/gpui/src/style.rs` | `scrollbar_width: AbsoluteLength::default()` = **0 px**, and `Overflow::Scroll` "reserves space controlled by `scrollbar_width`" — at 0, `Scroll` lays out like `Hidden` |
| zed `crates/gpui/src/elements/div.rs` | **no** scrollbar painting for overflow nodes (`grep -c scrollbar` = 0) |

So the prediction is: **gutter 0, no thumb ever**, and `auto` neither clips nor
scrolls. The main-branch binding has a `scrollbarColor` thumb overlay that
paints inside the element without reserving space; the pin does not.

### 2.2 The scratch probe — measured on this host

`.agents/slop/scratch/plan-801/scroll-probe.mjs` mounted the six fixtures from
§3 on a `720 × 460` test root and printed bounds, offsets and decoded pixels.
Frame `1440 × 920`, device scale **2**.

| Question | Measured |
| -------- | -------- |
| `overflowY: "scroll"` gutter | **0 px** — `scroll-v-child` `180` wide, the container `180` |
| `overflowX: "scroll"` bottom gutter | **0 px** — `scroll-h-child` `160` tall, the container `160` |
| a thumb at rest or after a `-100` wheel | **none** — the right-edge strip is `#191D25FF` (`card`) at five heights, identical to the inner samples; the strip is the *child* |
| `scroll-h` strip | `#3BC97FFF` at every sample — the child's `success`, not a track |
| `overflow: "auto"` | **inert**: `getScrollOffset` returns `null`, a `-100` wheel leaves it `null`, and the 2000 px child still paints **below the box** (`#191D25FF` at `y + 220`) — it is `visible`, not `hidden`-without-scroll |
| a non-scroller's offset | `scroll-plain` → `null` (a scroller with nothing to scroll → `[0, 0]`, e.g. `scroll-short` before and after a wheel) |
| the component-owned thumb | a 6 px `mutedForeground` div at the scroller's right edge paints `#A1A9B7FF` at its centre and `card` 20 px to its left; its track is exactly `6` px and ends at the container's right edge |
| a thumb placed **inside** the scroller | it scrolls with the content: after a `-100` wheel its reported `y` moved `230 → 130` and the strip it covered shows `muted` — so the recipe must make the track and thumb **siblings** of the viewport, not children |

So the pin reserves **nothing**, paints **nothing**, steals **nothing**, and
`auto` does nothing at all; the two records in §1 that describe a
"platform-themed thumb" and a "reserved strip" are **wrong**, and the recipe
half is the only way a consumer can show a scroll position.

### 2.3 Expected numbers (tokens, dark palette)

`palettes.dark.colors`: `background #11141A`, `card #191D25`, `muted #222730`,
`mutedForeground #A1A9B7`, `foreground #EEF1F5`. The owned thumb paints
`mutedForeground` over `card`; the track paints `muted`.

---

## 3. Fixtures

One view, `apps/playground/src/scenarios/scroll-affordance.tsx`, on a
`720 × 460` stage (`scroll-stage`, `position: "relative"`,
`backgroundColor: background`).

Row A at `(16, 16)`, three `180 × 160` fixtures, gap 24:

| id | style | child |
| -- | ----- | ----- |
| `scroll-plain` | none (visible) | `scroll-plain-child` `180 × 160`, `card` |
| `scroll-v` | `overflowY: "scroll"` | `scroll-v-child` `width: "100%"`, height `2000`, `card`, `onClick` counts |
| `scroll-h` | `overflowX: "scroll"` | `scroll-h-child` width `2000`, `height: "100%"`, `success` |

Row B at `(16, 200)`:

| id | style | child |
| -- | ----- | ----- |
| `scroll-short` | `overflowY: "scroll"` | `scroll-short-child` `180 × 100`, `card` — fits, so no thumb may exist |
| `scroll-own` | `position: "relative"` wrapper (not a scroller) | `scroll-own-viewport` inside it (`position: "absolute"`, all insets `0`, `overflowY: "scroll"`) with `scroll-own-child` `width: "100%"`, height `2000`, `card`; `scroll-own-track` and `scroll-own-thumb` are **siblings of the viewport** (§2.2: a child moves with the scroll) |
| `scroll-auto` | `overflowY: "auto"` | `scroll-auto-child` `width: "100%"`, height `2000`, `card` — predicted to **paint past** the container |

Controls at `(16, 396)` (clear of every fixture): `scroll-own-down` and
`scroll-own-reset` call `renderer.scrollTo("scroll-own-viewport", 0, -400 / 0)`
and mirror the offset into state. The owned track itself is the press target and
maps `event.y - trackBox.y` through `offsetForTrackPress`.
Readouts: `scroll-clicks` (`clicks=<n>`), `scroll-own-offset`
(`offset=<n>`).

The stage is `relative` so the auto fixture's overflow has empty stage below it
(y 360–460) to paint into; the sample point is
`(scroll-auto.x + 90, scroll-auto.y + 220)`, inside the child, 60 px below the
container's bottom edge.

---

## 4. The pure model

`apps/playground/src/scenarios/scrollbar-model.ts` (no React, no runtime):

```ts
export const THUMB_WIDTH = 6;
export const MIN_THUMB = 24;

export interface ThumbBox {
  readonly start: number;
  readonly length: number;
}

/** `None` when the content fits: a scrollbar with nothing to scroll is noise. */
export const thumbGeometry = (
  track: number,
  content: number,
  offset: number,
): Option.Option<ThumbBox>;

/** The offset a press at `y` inside the track asks for (negative, clamped). */
export const offsetForTrackPress = (
  track: number,
  content: number,
  y: number,
): number;

/** The sample pairs that prove a trailing strip is content, not a thumb. */
export const edgePairs = (
  box: Smoke.Bounds,
  axis: "x" | "y",
  inset: number,
  neighbour: number,
): ReadonlyArray<EdgePair>;

/** The index of the first pair whose two samples disagree, or -1. */
export const firstMismatch = (
  left: ReadonlyArray<Pixels.Rgba>,
  right: ReadonlyArray<Pixels.Rgba>,
  tolerance: number,
): number;
```

`thumbGeometry` mirrors the runtime's own rule where a rule exists
(`track² / content`, floored at 24, clamped to the track) and otherwise maps
the scroll progress onto `track - length`. `offsetForTrackPress` inverts it:
`fraction = clamp(y / track, 0, 1)`, `offset = -fraction * (content - track)`.

---

## 5. The scenario: `scroll-affordance` (headless)

`capability: "scroll"` (already live-covered, so no coverage-guard change).

Checks, in order (labels are the failure text). **Measured: 90 checks per
host**, not the 38 assertions listed here — every `paintedBox`, `pixelAtPoint`
and `expectThumb` call records its own check, the same convention as every
other pixel scenario; the assertions below are the 38 *claims*.

**Geometry**

1. every fixture is painted (`Arr.every` over the six containers).
2. `scroll-plain-child` width equals `scroll-plain` width.
3. `scroll-v-child` width equals `scroll-v` width — **gutter 0**.
4. `scroll-v-child` height is `2000`.
5. `scroll-h-child` height equals `scroll-h` height — **bottom gutter 0**.
6. `scroll-h-child` width is `2000`.
7. `scroll-auto-child` width equals `scroll-auto` width.
8. `scroll-short-child` height is `100`.

**The runtime's scroll path**

9. `scroll-v` starts at offset `0`.
10. a `-100` wheel leaves `scroll-v` at `y = -100`.
11. a `deltaX -240` wheel leaves `scroll-h` at `x = -240`.
12. `scroll-auto` reports **no** offset (`null` → `None`), before and after a
    `-100` wheel — measured.
13. a `-100` wheel leaves `scroll-short` at `[0, 0]` (a scroller with nothing
    to scroll still reports zeros; measured).
14. a point 3 px inside `scroll-v`'s right edge, at mid-height, **runs the
    child's handler** (`clicks=1`) — the strip steals nothing.
15. that click leaves `scroll-v`'s offset unchanged.

**The auto fixture clips nothing**

16. the point 60 px below `scroll-auto`'s bottom edge paints `card` (the child
    overflows visibly) — when the runtime clips it instead, this check fails by
    name and §2 records `auto` as `hidden`-without-scroll, not `visible`.

**No thumb paints**

17. every right-edge pair of `scroll-v` agrees at rest.
18. every right-edge pair of `scroll-v` agrees after the wheel.
19. every bottom-edge pair of `scroll-h` agrees at rest.
20. the right-edge strip of `scroll-v` paints `card` at five heights.

**The component-owned recipe**

21. `scroll-own-thumb` is painted.
22. its width is `THUMB_WIDTH ± 1`.
23. its `y` is `thumbGeometry(160, 2000, 0).start ± 1` (= 0).
24. its height is `thumbGeometry(160, 2000, 0).length ± 1` (= 24).
25. its centre pixel is `mutedForeground`, and the pixel 20 px left of it at the
    same `y` is `card`.
26. its track is `THUMB_WIDTH` wide and its right edge is the scroller's.
27. `scroll-own-child`'s width still equals `scroll-own-viewport`'s width — the
    recipe **overlays**, it reserves nothing.
28. `scroll-short-thumb` is **not** painted (content fits).
29. `thumbGeometry(160, 100, 0)` is `None` (the pure rule behind check 28).

**The recipe follows input**

30. a `-100` wheel on `scroll-own-viewport` makes the readout equal
    `scrollOffset("scroll-own-viewport")` (the component mirrors the runtime).
31. the thumb's `y` is `thumbGeometry(160, 2000, -100).start ± 1`.
32. `scroll-own-down` sets the runtime offset to `-400` and the mirror to match.
33. the thumb's `y` is `thumbGeometry(160, 2000, -400).start ± 1` (≈ 30).
34. its centre pixel is still `mutedForeground` after the move, and the track's
    `y` has not moved — the overlay is a sibling of the scroller.
35. a track press at `y = 80` (half) requests
    `offsetForTrackPress(160, 2000, 80)` (≈ −920) ± 2.
36. the runtime offset equals the mirror after the press.
37. the thumb's `y` is `thumbGeometry(160, 2000, -920).start ± 1` (≈ 66).
38. its centre pixel is `mutedForeground` after the jump.

---

## 6. The live twin: `live-scroll-affordance`

`capability: "scroll"`, `ready: "scroll-stage"`, the same view and steps, with
`AsyncSmokeHost`. The only differences the live host requires:

- `hover` + a 40 ms wait before every wheel (plan `606`: a live wheel sent in
  the same protocol step as its pointer move lands at the old position);
- `await`ed reads, and one `wait(80)` after each scroll/commit before a pixel or
  bounds read, because the protocol has no frame boundary (plan `189` §9);
- `captureLive` for the frame, decoded through `frames.ts`;
- the run keeps its frame as `.artifacts/live/live-scroll-affordance.png`.

No check is dropped: every claim above is bounds, text, offset or pixels, none
of which the live tree lacks (plan `197`). The live tree's `bounds` is the same
content-origin box (plan `529` §6.5), so the same ± 1 tolerances apply.

---

## 7. Steps

1. Write this plan; index it in `.agents/slop/plans/README.md` (§ the playground
   table, after `797`); claim the task in `TODO.md` (playground section, top).
2. Write `.agents/slop/scratch/plan-801/scroll-probe.mjs` (copy the harness of
   `.agents/slop/scratch/plan-792/field-ink-probe.mjs`) and run
   `nub .agents/slop/scratch/plan-801/scroll-probe.mjs`. Record the measured
   gutter, the strip colours at rest/after a wheel, the auto fixture's paint and
   the scheduled thumb numbers in §2. **If any prediction in §2.1 is wrong, stop
   and rewrite §2/§5 before writing the scenario** (STOP-1).
3. Write `scrollbar-model.ts` and `scrollbar-model.test.ts`; run
   `nub run --filter playground test` (expect the new tests green).
4. Write `scroll-affordance.tsx` (view + both scenarios). Register the headless
   scenario in `apps/playground/src/scenarios/index.ts` and the live one in
   `apps/playground/src/live/scenarios.tsx` (import, const with
   `ready`/screenshot, list entry). Run
   `nub run --filter playground build` then
   `nub apps/playground/dist/smoke/run.js --only scroll-affordance`.
   Expect **1/1** and **90 checks**, exit `0`. A failing check is a measured fact:
   fix the assertion to the measurement, never the other way round.
5. Run `nub apps/playground/dist/live/run.js --only live-scroll-affordance`
   three times. Expect **1/1**, **90 checks**, exit `0`, one PNG artifact.
6. Mutation proofs (§9), each run focused and reverted by name.
7. Run the end-of-task full headless suite: `nub apps/playground/dist/smoke/run.js`
   (bare = whole registry). Expect `120/120`, exit `0`, and the check total to be
   the previous total **+ 38**.
8. Gates: `nub run check`, `nub run lint`, `nub run test`.
9. Ledgers (§10), then one commit per unit (plan, code, ledgers) and push.

**Commands and expected results**

| Command | Expected |
| ------- | -------- |
| `nub .agents/slop/scratch/plan-801/scroll-probe.mjs` | printed bounds/colours; one PNG in the scratch dir |
| `nub run --filter playground test` | playground tests green, `+ N` model cases |
| `nub run --filter playground build` | `dist/` rebuilt |
| `nub apps/playground/dist/smoke/run.js --only scroll-affordance` | 1/1, 90 checks, exit `0` |
| `nub apps/playground/dist/live/run.js --only live-scroll-affordance` | 1/1, 90 checks, exit `0` (×3) |
| `nub apps/playground/dist/smoke/run.js` | 120/120, exit `0`, total `+ 90` |
| `nub run check` | green (includes `check:tests`) |
| `nub run lint` | green |
| `nub run test` | green (playground `+ N`, testing 69) |

---

## 8. STOP conditions

- **STOP-1 — the contract is not the predicted one.** If a gutter > 0,
  a thumb paints, or `auto` clips instead of overflowing: do not bend the
  scenario to the prediction. Rewrite §2 and the affected checks with the
  measured contract, record the number, and keep the *recipe* half (checks
  21–38) unchanged. Report which record in §1 the measurement corrects.
- **STOP-2 — the edge strip is not uniform for an unrelated reason.** The
  scrollers' children are flat fills; if a strip sample differs from its inner
  neighbour because the child is not flat (a border, a radius, a glyph), change
  the fixture to a flat fill rather than widening a tolerance.
- **STOP-3 — a live-only divergence.** If the live host reserves a gutter the
  offscreen host does not (or vice versa), keep both scenarios and assert each
  host's measured contract separately; record it in §6 and in `PLAN.md`. Do not
  weaken the headless check to match the window.
- **STOP-4 — the owned thumb cannot be hit or the track press cannot map a
  point.** Stop before shipping the recipe; record what failed (the track's box
  is read through `ref` → `renderer.getElementBounds`, plan `184`), and leave the
  recipe out of the suite rather than shipping a decorative bar.
- **STOP-5 — a gate fails.** Never mark the task done; report the failing gate's
  exact output.

---

## 9. Test plan

**Unit (`scrollbar-model.test.ts`, ~12 cases)** — each must be able to fail:

1. content that fits → `None`;
2. `2000 / 160` → length `24` (the floor), start `0` at offset `0`;
3. a tall track where `track² / content > 24` → the proportional length;
4. start grows monotonically with the offset;
5. the maximum offset puts `start` at `track - length`;
6. an offset past the maximum clamps;
7. a zero track is `None` (no division by zero);
8. `offsetForTrackPress(160, 2000, 0)` = `0`;
9. `…, 160)` = `-1840`;
10. `…, 80)` = `-920`;
11. `…, 1000)` clamps to `-1840`;
12. `firstMismatch` returns the first differing index, `-1` when all agree, and
    respects the tolerance;
13. `THUMB_WIDTH` (6) and `MIN_THUMB` (24) are the shipping recipe, asserted so
    a silent change to either fails a test rather than moving a nominal.

**Mutation proofs (runtime, each observed red then reverted by name; measured
2026-10-20):**

| # | Mutation | Must fail |
| - | -------- | --------- |
| M1 | `scroll-v` given `paddingRight: 6` | **"a vertical scroller reserves no gutter"** — red |
| M2 | a 6 px `foreground` div inside `scroll-v`'s strip | **"no thumb paints on a vertical scroller at rest"** — red |
| M3 | the owned thumb's `top` pinned to `0` | **"the owned thumb's start follows offset -100"** — red |
| M4 | the thumb's background set to `card` | **"the thumb paints the muted foreground"** — red |
| M5 | the track press maps every point to `y = 0` | **"the track press asks for the midpoint offset: expected -920 ± 2, got 0"** — red |
| M6 | `scroll-auto` set to `overflowY: "scroll"` | **"an auto scroller reports no offset"** — red |
| M7 | the thumb rendered even when the content fits | **"the short fixture paints no thumb"** — red |
| M8 | `MIN_THUMB` 24 → 20 (unit) | **"keeps a 6 px thumb with a 24 px floor"** — red |

M2 uses a fixture-local overlay, not a runtime change: it proves the pixel
check can see a thumb at all (the guard against a vacuous "agrees" check).
Each run is `--only scroll-affordance`; record the observed failure text.

---

## 10. Ledgers to update

- `.agents/slop/plans/README.md`: index row (after `797`), status **landed**
  with the measured gutter, the thumb count and the check counts.
- `TODO.md`: the task row (playground section) ticked with the focused ids run,
  the full-headless total and the live twin's runs.
- `apps/playground/README.md`: a `## Scroll affordances (plan 801)` section
  beside "Scroll into view"; one row in the live-scenario table; one row in the
  pixel-evidence table.
- `COMPONENTS.md`: the **Scrollable containers** row — replace "the thumb is
  platform-themed and cannot be tinted" with the measured encoding and cite
  `scroll-affordance`/`live-scroll-affordance`; add the `ScrollArea` recipe
  note.
- `PLAN.md`: **D97** — the measured scroll-affordance contract, with the
  recipe, the corrected records and the two hosts' numbers.
- Cross-team rows in `TODO.md` (owners unchanged, no edits outside this
  workstream):
  - `primitives`: correct the `ScrollArea`/`core/style.ts` comment and choose
    whether `ScrollArea` ships the owned-thumb recipe;
  - `playground`: correct the plan-`173` "always reserves a platform scrollbar"
    comment in `tab-overflow.tsx` (this workstream, same unit).

---

## 11. Acceptance

- The probe answered all five questions in §1 with decoded-frame or painted-box
  evidence, in **both** hosts, and §2 carries the measured numbers.
- `scroll-affordance` and `live-scroll-affordance` are registered, green, and
  90 checks each (measured); the full headless suite is **120/120 · 4449 · 65**,
  exit `0`, exactly `4359 + 90`.
- The model's rules are unit-tested (18 cases), and M1–M8 were observed failing
  and reverted.
- No claim is asserted from an authored style, a screenshot alone, or source
  reading; a failed prediction was recorded as a measured correction, not
  smoothed away.
- `nub run check`, `nub run lint` and `nub run test` pass.

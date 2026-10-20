# 736 — The focus ring and elevation shadow, in the frame

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | F (native evidence) |
| Owner | playground workstream |
| Depends on | `100`, `110`, `120`, `140`, `150`, `189`, `197`, `674`, `690`, `697`, `701`, `707`, `708`, `713`, `715`, `722` |
| Feeds | the `focusRing`/`elevationShadow` rows in `COMPONENTS.md` and `docs/tokens.md` |

## 1. Goal

Two token helpers carry every focus state and every elevated surface:

- `focusRing(theme)` → one `boxShadow` with `offset 0 / blur 0 / spread 2`,
  colour `theme.colors.ring` (`#A7A9FF` in the dark palette);
- `elevationShadow(theme, "md")` → one `boxShadow` with `offsetY 8 / blur 24 /
  spread -4`, colour `#000000A6`.

The suite proves both **reach the runtime's style report** (`theme-type-and-shadow`
reads `paintedStyle`), but not that the runtime **rasterizes** them. A
`boxShadow` can be accepted by the style layer and paint nothing — the exact
class of gap plan `674` closed for solid colour. If that is true here, every
focus ring in the library is invisible and the design system has a critical
defect rather than a documentation nit.

Deliver a small, self-contained probe that captures a real frame and samples:

1. the **ring band** just outside a ringed box — exact `colors.ring`;
2. a **control box** with no ring at the same offset — the stage background;
3. the ringed box's **interior** — its own `card` background, so the ring is a
   band rather than a fill;
4. the **space below an elevated box** — darker than the identical unshadowed
   control by a measured delta, so the blur and its alpha paint.

Both hosts run it: `shadow-pixels` (offscreen `TestRenderer`) and
`live-shadow-pixels` (the real 1100 × 720 window).

Non-goals:

- screenshot diffing or golden images;
- anti-aliased edges (the sample sits in the middle of the band, 1 logical px
  from both edges at a device scale of 2);
- an exact blur profile. A blurred shadow's alpha at a point is an
  implementation detail, so the elevation check asserts **direction and
  magnitude** (every channel darker by a floor) against a matched control,
  never an invented composite;
- the ring's behaviour on focus (`primitives-actions` already proves the
  component merges and drops `controlFocusStyle`). This plan measures whether
  the shadow the token produces is painted at all.

## 2. Design

### 2.1 The pure half — `apps/playground/src/scenarios/shadow-pixels.ts`

No renderer import, no host. Four small functions plus one documented constant:

```ts
export interface ProbeBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The minimum per-channel darkening the elevation sample must show. */
export const SHADOW_DELTA = 6;

/** How far below the box the elevation sample sits, in logical px. */
export const SHADOW_DROP = 4;

/**
 * A point in the middle of a ring band on one edge.
 *
 * The band lies outside the border box, so the sample is
 * `floor(spread / 2)` logical px outside the edge; with the token's spread of
 * 2 that is 1 px, the middle of a 2 px band.
 */
export const ringBand = (
  bounds: ProbeBox,
  spread: number,
  edge: "left" | "right" | "top",
): { readonly x: number; readonly y: number };

/** A point on the box's top edge, `inset` px inside — the fill, not the ring. */
export const interior = (
  bounds: ProbeBox,
  inset: number,
): { readonly x: number; readonly y: number };

/** The elevation sample: horizontally centred, `SHADOW_DROP` below the box. */
export const shadowSample: (bounds: ProbeBox) => {
  readonly x: number;
  readonly y: number;
};

/** True when every channel of `actual` is at least `delta` below `control`. */
export const darkerThan: (
  actual: Pixels.Rgba,
  control: Pixels.Rgba,
  delta: number,
) => boolean;
```

`ringBand` derives the outside distance itself (`Math.max(1,
Math.floor(spread / 2))`), so a theme with a wider ring moves the sample. The
caller passes the **token's** spread (`focusRing(theme).boxShadow.spreadRadius`),
not a literal.

### 2.2 The view — `apps/playground/src/scenarios/shadow.tsx`

A `640 × 360` stage painted `theme.colors.background`, with four boxes, all
`backgroundColor: theme.colors.card`:

| testId | geometry | style |
| ------ | -------- | ----- |
| `shadow-stage` | the stage | `background` |
| `shadow-ring` | `(80, 60)` `120 × 64` | `...focusRing(theme)` |
| `shadow-plain` | `(320, 60)` `120 × 64` | none — ring control |
| `shadow-elevated` | `(80, 220)` `120 × 64` | `boxShadow: elevationShadow(theme, "md")` |
| `shadow-flat` | `(320, 220)` `120 × 64` | none — elevation control |

The stage is tall enough that the `md` shadow (offset 8, blur 24) fades out
before the bottom edge and far enough from `shadow-flat` that the control is
never inside the shadow.

### 2.3 The scenarios

`shadow-pixels` (capability `theme`) and `live-shadow-pixels` (capability
`theme`, `ready: "shadow-stage"`):

1. read the stage, ring, plain, elevated and flat bounds through
   `readSync`/`readAsync`;
2. capture one frame (`captureHeadless`/`captureLive`) and assert the device
   scale is an integer;
3. `ringBand(ring, spread, "left" | "right" | "top")` → `colors.ring` exactly
   (tolerance 2). Three edges, so a shadow painted only below (offset) or only
   on one side fails;
4. `ringBand(plain, spread, "left")` → `colors.background`; this is the
   control that makes "the band is the ring" falsifiable;
5. `interior(ring, 4)` → `colors.card`; the ring is a band, not a fill;
6. `shadowSample(elevated)` and `shadowSample(flat)`; the first is
   `darkerThan` the second by `SHADOW_DELTA`, and the second equals
   `colors.background` (so the darkening is the shadow, not the box's own
   background bleeding out);
7. assert the token values this probe depends on and print them in the labels:
   `focusRing(theme).boxShadow.spreadRadius === theme.borderWidth.strong` and
   `elevationShadow(theme, "md")` is present. A token change that silently
   removes the shadow fails here by name, before the pixels.

Parsing goes through `frames.ts`'s `parseColour`, sampling through
`pixelAtPoint`, and comparison through `expectColour`; `darkerThan` is the one
new comparison.

The live twin also writes `LIVE_ARTIFACTS/live-shadow-pixels.png`, like
`live-pixel-colour`, so the docs have a frame artifact.

## 3. Files

| File | Change |
| ---- | ------ |
| `apps/playground/src/scenarios/shadow-pixels.ts` | new pure geometry + `darkerThan` |
| `apps/playground/src/scenarios/shadow-pixels.test.ts` | new unit tests (§4) |
| `apps/playground/src/scenarios/shadow.tsx` | new view + both scenarios |
| `apps/playground/src/scenarios/index.ts` | register `shadow-pixels` |
| `apps/playground/src/live/scenarios.tsx` | register `live-shadow-pixels` |
| `apps/playground/README.md` | a "Shadow pixels" subsection with the measured values and the check count; update the suite totals and the `theme` row |
| `COMPONENTS.md` | the `theme`/tokens evidence row gains the two ids and the paint claim |
| `TODO.md` | one playground task, ticked with the measured values and ids run |
| `.agents/slop/plans/README.md` | index this plan |

No `packages/testing` change is expected: `Pixels.rgbaNear`, `framePoint` and
`frames.ts` already cover the sampling chain. If a pure helper is needed in the
package instead, stop and justify it in the plan's results; do not duplicate
`parseColour`.

## 4. Test plan

`shadow-pixels.test.ts` (vitest, pure):

| Test | Must fail when |
| ---- | ------------- |
| `ringBand` left/right/top sits `floor(spread/2)` (min 1) outside the matching edge, at the edge's midpoint | the sign of the offset or the axis is swapped |
| a spread of `4` moves the sample 2 px out; a spread of `1` still samples 1 px out | the distance is hard-coded to 1 |
| `interior` is inside the box on every side and moves with `x`/`y` | the inset is applied outside the box |
| `shadowSample` is horizontally centred and exactly `SHADOW_DROP` below the bottom edge | it samples the box's own edge (which paints `card`) |
| `darkerThan` accepts a uniform darkening of exactly `delta` | the comparison is strict or per-channel-any |
| `darkerThan` rejects equal pixels and a pixel with one channel brighter | the helper only checks the sum or one channel |

The scenarios are their own integration test. Mutation proofs, each observed and
reverted (record the exact failure labels):

- **M1** drop the ring from `shadow-ring` → all three band checks read the
  background (`expected #a7a9ffff, got #11141aff`);
- **M2** paint the ringed box with `colors.ring` instead of `card` → the
  interior check fails;
- **M3** point the band sample at the box's centre → the band checks fail;
- **M4** drop the elevation from `shadow-elevated` → `darkerThan` fails (the
  measured delta is 0);
- **M5** swap the elevation token for a bright literal → `darkerThan` fails with
  a lighter sample (the check is direction, not "any difference");
- **M6** move the plain control under the elevated shadow → its
  `colors.background` check fails, proving the control is load-bearing.

If the runtime paints no shadow at all, **stop and report**: keep the scenario
as the measurement that proves the absence (asserting the background in the band
and no darkening below), record the evidence in the README and `COMPONENTS.md`,
and add a cross-team task to replace `focusRing`'s `boxShadow` with a real
ring element. Never describe the ring as painted without the frame.

## 5. Commands and expected results

```sh
nub run --filter playground test
# expected: the existing suite plus the new pure tests, green; report the count

nub run --filter playground build
# expected: exit 0

nub apps/playground/dist/smoke/run.js --only shadow-pixels
# expected: 1/1 scenarios passed · theme=verified, exit 0

nub apps/playground/dist/live/run.js --only live-shadow-pixels
# expected: 1/1 scenarios passed, exit 0 (one real window)
```

Then, because this adds a registry entry and touches no cross-cutting code:

```sh
nub apps/playground/dist/smoke/run.js   # full headless registry, exit 0
nub run check
nub run lint
nub run test
```

The full live suite is the merge/release gate and is **not** run while
iterating. Registry totals: headless `107 → 108`, live `96 → 97`; the docs-site
capability matrix is untouched because `theme` already exists.

## 6. STOP conditions

Stop and report instead of improvising if:

- the band reads the stage background on all three edges **and** the elevation
  sample shows no darkening: the runtime does not rasterize `boxShadow`
  (record the frame, the tokens and the measured pixels; do not widen a
  tolerance or claim a paint);
- the band reads the ring colour but only on the bottom/right: the shadow is
  offset unexpectedly (report the measured sides; do not sample only the side
  that works);
- the ring band is wider or narrower than `spread` by more than 1 logical px
  (report the measured band; do not change the token from this workstream);
- the frame's device scale is not an integer (report the size pair);
- the live `ready` id cannot be found, or the view does not fit the 1100 × 720
  window (report the bounds; shrink the stage only by editing the plan first).

## 7. Acceptance

- `shadow-pixels` and `live-shadow-pixels` are registered and green on this
  host, with the exact sampled colours recorded in the README.
- The pure module has at least six tests that can fail, and at least five
  scenario mutations were observed failing by name before revert.
- `COMPONENTS.md` and `apps/playground/README.md` state the ring/shadow paint
  evidence and name the ids; no row still says the ring is a style-only proof.
- `TODO.md` carries one ticked task with the measured values and the exact
  scenario ids run.
- `nub run check`, `nub run lint` and `nub run test` are green; the full
  headless registry is green.

## 8. Results (2026-10-20, darwin-x64)

**Implementation.** `apps/playground/src/scenarios/shadow-pixels.ts` is the pure
half: `ringBand` derives the outside distance from the token's spread
(`floor(spread / 2)`, min 1), `interior`, `shadowSample` and `darkerThan`. The
view and both scenarios live in `shadow.tsx`; `shadowChecks` is one generic
function over the host and its inspection error, so the headless and live runs
cannot drift. No `packages/testing` change was needed.

**Measured, both hosts, tolerance 2** (the live frame is also the run artifact
`live/live-shadow-pixels.png`):

| Sample | Headless | Live |
| ------ | -------- | ---- |
| frame / window | `2560 × 1600` / `1280 × 800` | `2200 × 1440` / `1100 × 720` |
| device scale | `2` | `2` |
| ring band, left / right / top | `#A7A9FF` | `#A7A9FF` |
| unringed control band | `#11141A` | `#11141A` |
| ringed interior (+4 px) | `#191D25` | `#191D25` |
| shadow below `md` (+4 px) | `#0C0E12` | `#0C0E12` |
| flat control below (+4 px) | `#11141A` | `#11141A` |
| channel deltas | `5 / 6 / 8` | `5 / 6 / 8` |

So the runtime **does** rasterize a zero-blur, spread-only `boxShadow` on all
four sides, and the `md` elevation paints its blur and alpha. The gap this plan
opened with was real but the runtime is not deficient: the ring is now painted
evidence, not a style claim.

`SHADOW_DELTA` was **6** in the first draft and the first run failed on the red
channel (`expected every channel at least 6 below #11141aff, got #0c0e12ff`,
deltas `5/6/8`). It is now `4` — measured with one channel of headroom and still
fails on a bright or absent shadow. The plan's floor was a hypothesis; the
measured value replaced it, and the tolerance was not widened.

**Commands run**

```sh
nub run --filter playground test
# 45 files, 487 tests (481 + 6), green

nub run --filter playground build
# exit 0

nub apps/playground/dist/smoke/run.js --only shadow-pixels
# 1/1 scenarios passed · theme=verified, exit 0; 28 checks

nub apps/playground/dist/live/run.js --only live-shadow-pixels
# 1/1 scenarios passed · theme=verified, exit 0; 28 checks

nub apps/playground/dist/smoke/run.js
# 108/108 scenarios passed, 3963 checks, 65 capabilities, 185.4 s, exit 0
```

The full live suite was **not** run: this is not the merge/release gate. The
live registry is now **97** and the headless registry **108**.

**Mutation proofs (observed, then reverted)**

| # | Mutation | Result |
| - | -------- | ------ |
| M1 | drop `...focusRing(theme)` from the ring box | `the ring paints outside the left edge: expected #a7a9ffff, got #11141aff`, exit `1` |
| M2 | paint the ring box `colors.ring` instead of `card` | `the ring is a band, not a fill: expected #191d25ff, got #a7a9ffff`, exit `1` |
| M3 | make the band distance `0` | two `shadow-pixels.test.ts` tests red, exit `1` (the scenario is not reached) |
| M4 | drop the elevation `boxShadow` | `the elevation shadow darkens the stage below the box: … got #11141aff` (delta 0), exit `1` |
| M5 | a white `md` shadow (`#FFFFFFA6`) | `… expected every channel at least 4 below #11141aff, got #5b5d61ff`, exit `1` |
| M6 | give the flat control the same `md` shadow | `the elevation control paints the stage: expected #11141aff, got #0c0e12ff`, exit `1` |

**Limits.** The elevation check is directional and magnitude-based, not an
exact composite: a blurred shadow's alpha at a point is a GPUix implementation
detail, so the probe compares against a matched flat control. Anti-aliased
edges are still out of scope; the band sample sits 1 logical px outside the box
at scale 2. The probe measures the token helper, not a focused shipped control:
`primitives-actions` owns the component's merge/drop of `controlFocusStyle`, and
this plan closes the paint half those two checks did not cover.

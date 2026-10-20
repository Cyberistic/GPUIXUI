# 807 — Gradient backgrounds in the frame: the unused paint route, its interpolation and its hit path

**Phase:** F (measured runtime contract) · **Workstream:** playground ·
**Status:** landed

**Depends on:** `041`, `100`, `110`, `120`, `140`, `150`, `197`, `529`, `674`,
`690`, `697`, `701`, `715`, `722`, `736`, `745`, `754`, `761`, `773`, `775`,
`778`, `784`, `791`, `797`, `801`.

**Owns:** `apps/playground` and `packages/testing` only. Nothing outside those
paths is edited; a needed change elsewhere becomes a row in `TODO.md`.

---

## 1. The claim being guarded

`@gpuix/native@0.10.0` publishes a **linear-gradient background** in
`StyleDesc`:

```ts
background?: string | LinearGradientBackground;

interface LinearGradientBackground {
  type: "linear-gradient";
  angle: number;                       // CSS degrees, 0 points up
  stops: [LinearGradientStop, LinearGradientStop];   // exactly two
  colorSpace?: "srgb" | "oklab";
}
interface LinearGradientStop { color: string; position: number; } // 0..1
```

Our library and both smoke registries use it **zero times**. Every surface is a
solid `backgroundColor`; the only gradients in the repo are two SVG gradients
inside a chart's data URL (`chart.tsx`). So the design system has a paint route
nobody has measured, and the records cannot say whether it works:

| Record | Says | Evidence today |
| ------ | ---- | -------------- |
| `COMPONENTS.md` → Design system | colour, radius, shadow and opacity are frame-proven | solids only; nothing about `background` |
| `COMPONENTS.md` → Charts | gradients need an `<img>` SVG data URL | true for that route, but the style route was never tried |
| `apps/playground/README.md` | the pixel plans read fills, borders, text ink, washes | no fixture declares a gradient |

Three specific risks are invisible without a probe:

1. **A gradient can silently paint nothing.** The pinned parser returns `None`
   for a stop position outside `0..1`, a non-finite angle or an unknown
   `colorSpace`, and nothing reports it. A token with `position: 1.5` (`150%`,
   a natural CSS mistake) is a transparent surface, not an error.
2. **`backgroundColor` beats `background`.** `resolved_background()` returns the
   solid colour first, so pairing a gradient with a fallback colour is **not** a
   fallback; it is a disable switch.
3. **A gradient is a painted fill for hit-testing.** `has_background()` counts
   `background`, and `should_occlude()` blocks the press. A decorative gradient
   overlay placed over a card therefore swallows its clicks unless it sets
   `pointerEvents: "none"`.

**Goal:** record, from decoded frames and native input in both hosts:

1. that a two-stop linear gradient paints, and in which direction the angle runs;
2. that the two colour spaces interpolate differently, and how closely the frame
   follows the CSS Oklab definition;
3. that stop positions clamp (the flat bands) and alpha stops composite;
4. that `backgroundColor` wins, an invalid gradient is dropped, and a radius
   clips the gradient;
5. that `hover`/`active` accept a gradient and revert;
6. that a gradient joins the hit path (and the `pointerEvents: "none"` escape);
7. a recipe the design system and the docs can cite, plus the limits.

---

## 2. Reconnaissance

### 2.1 The pinned source

Build: `.agents/slop/scratch/gpuix-build/release/gpuix/packages/native/src/style.rs`
(tag `9fcd6288`, ADR 0003).

| Fact | Source |
| ---- | ------ |
| `background` is `BackgroundValue::{Color, Gradient}` | `style.rs:39-72` |
| exactly two stops, both positions validated in `0.0..=1.0`, the angle must be finite, `colorSpace` is `None`/`srgb`/`oklab`, anything else resolves to `None` | `BackgroundValue::resolve`, `style.rs:239-286` |
| `resolved_background()` returns `backgroundColor` **first**, then `background` | `style.rs:291-296` |
| `has_background()` is `backgroundColor.is_some() \|\| background.is_some()`, and `should_occlude()` blocks a press when the resolved background is not transparent | `style.rs:288-320` |
| GPUI's doc comment: `angle` 0 is equivalent to **top**, increasing values rotate **clockwise**; stops are percentages in `0..=1` | zed `crates/gpui/src/color.rs:892-917` |
| the paint is a GPUI shader background; `color_space` is `gpui::ColorSpace::{Srgb, Oklab}` | zed `crates/gpui/src/color.rs:759-777` |

Source reading is not evidence of what the pinned rasteriser did. The scratch
probe below measures it.

### 2.2 Scratch probe — measured on this host

`.agents/slop/scratch/plan-807/gradient-probe.mjs`,
`gradient-hover-probe.mjs`, `gradient-hit-probe.mjs`, run with `nub`. Stage
`740 × 380`, frame `1480 × 760`, device scale **2**. Stops `#0000FF` (blue) →
`#FF0000` (red) unless stated.

| Fixture | Question | Measured |
| ------- | -------- | -------- |
| angle `90`, sRGB | does it paint? | yes: `0.01 #0200FB` → `0.5 #7F007F` → `0.99 #FB0001` |
| angle `0`, sRGB | orientation | `0.01` (top) `#F90002` (red) → `0.99` (bottom) the blue end: the angle points at the **second** stop; 0 points up |
| angle `180`, sRGB | orientation | `0.01` (top) blue → `0.99` red: the first stop at the top |
| angle `90`, Oklab | is `colorSpace` real? | `0.5 #8B53A0`, against sRGB's `#7F007F` — 83 channels apart on G |
| stop positions `0.25 / 0.75` | do positions clamp? | `0.05 #0000FF`, `0.25 #0000FD`, `0.5 #80007E`, `0.75 #FB0000`, `0.95 #FF0000` — flat bands, exact |
| `backgroundColor: card` + gradient | precedence | `#191D25FF` at every sample: the colour wins, the gradient never paints |
| `borderRadius: 18` + gradient | clip | corner `#11141AFF` (stage), inside `#2F00CCFF`: the radius clips the gradient |
| stop position `1.5` | invalid input | `#11141AFF` at every sample: **silently dropped**, the stage shows through |
| `colorSpace: "lab"` (untyped scratch) | invalid input | same drop; `bounds` still reports the box |
| `#FF0000FF → #FF000000` | alpha stop | `0.01 #FD0101`, `0.5 #850A0D` (the 50 % blend over the stage is `#880A0D`), `0.99 #14141A`: the fade composites |
| `hover: { background: … }` | refinement | rest `#191D25` everywhere; hovered `0.01 #3CC77E` → `0.99 #FC6B6A`; leaving reverts to card |
| `active: { background: … }` | refinement | pressed gradient; release reverts to card |
| invalid `hover.background` | drop | card at rest **and** hovered — the invalid refinement is inert |
| handler-less gradient child in a handled parent | hit path | parent `0` (the gradient swallows the press) |
| handler-less transparent child in the same parent | control | parent `1` |
| gradient child with `pointerEvents: "none"` | escape | parent `1` |

### 2.3 Oklab: the frame is close, not bit-exact

An independent CSS-Oklab implementation (sRGB → linear → LMS cbrt → Oklab,
mix, invert) predicts the blue→red midpoint at `#8C53A2`; the frame paints
`#8B53A0`. The largest deviation across `t = 0.05…0.95` is **6 channels**, at
the blue end (`0.05`: predicted `#1822F6`, measured `#1E26F3`). This is
consistent with the shader's half-float interpolation. So the Oklab check needs
a **12-channel band**; the sRGB path is exact within the shared tolerance of 2.

The sRGB midpoint of the same pair is `#7F007F`, so the two spaces are 83
channels apart at G — a wrong `colorSpace` cannot hide inside the band.

### 2.4 Expected numbers (tokens, dark palette)

`background #11141A`, `card #191D25`, `success #3BC97F`, `destructive #FF6B6B`.
The probe fixes its own stop colours (`#0000FF`, `#FF0000`) so it does not
depend on a palette change; the hover pair uses the two tokens.

---

## 3. Fixtures

One view, `apps/playground/src/scenarios/gradient.tsx`, on a `740 × 440` stage
(`gradient-stage`, `position: "relative"`, `backgroundColor: background`).

| id | position | style | question |
| -- | -------- | ----- | -------- |
| `grad-srgb` | `(20, 20) 160×96` | angle 90, blue→red, `srgb` | paint + sRGB interpolation |
| `grad-oklab` | `(200, 20) 160×96` | same, `oklab` | colour space is real |
| `grad-vertical` | `(380, 20) 160×96` | angle 0, blue→red, `srgb` | orientation |
| `grad-precedence` | `(560, 20) 160×96` | `backgroundColor: card` + the same gradient | the colour wins |
| `grad-stops` | `(20, 140) 160×96` | positions `0.25 / 0.75`, angle 90 | positions clamp |
| `grad-radius` | `(200, 140) 160×96` | `borderRadius: radius.xl`, angle 90 | the radius clips |
| `grad-invalid` | `(380, 140) 160×96` | second position `1.5` | a typo is dropped |
| `grad-alpha` | `(560, 140) 160×96` | `#FF0000FF → #FF000000`, angle 90 | alpha composites |
| `grad-hover` | `(20, 260) 340×72` | `backgroundColor: card`, `hover.background` success→destructive, angle 90 | hover paints and reverts |
| `grad-hit-valid` | `(380, 260) 100×72` | parent `onClick` + a child filled by a **valid** gradient | the gradient swallows |
| `grad-hit-clear` | `(500, 260) 100×72` | parent `onClick` + a child with **no fill** | the parent receives |
| `grad-hit-none` | `(620, 260) 100×72` | parent `onClick` + a gradient child with `pointerEvents: "none"` | the escape works |

A readout `grad-hits` paints `valid=<n> clear=<n> none=<n>`, incremented by the
three parent handlers. The hit boxes are in **flow**-sized children (width and
height `100%` of the parent), not absolute ones: an absolute child occludes
regardless of paint (`should_occlude`), which would make the control vacuous.

The stage is `relative` with `background`, so a dropped gradient shows the stage
colour rather than white.

---

## 4. The pure model

`apps/playground/src/scenarios/gradient-model.ts` — no React, no runtime.

```ts
export type GradientColourSpace = "srgb" | "oklab";

export interface GradientStop {
  readonly color: Pixels.Rgba;
  readonly position: number;
}

export interface Gradient {
  readonly angle: number;
  readonly stops: readonly [GradientStop, GradientStop];
  readonly colorSpace?: GradientColourSpace;
}

/** The stop colours mixed at `t` in the declared space (positions clamp). */
export const colourAt: (gradient: Gradient, t: number) => Pixels.Rgba;

/** The sRGB-space mix, independent of `colorSpace`. */
export const srgbAt: (gradient: Gradient, t: number) => Pixels.Rgba;

/** The CSS-Oklab mix. */
export const oklabAt: (gradient: Gradient, t: number) => Pixels.Rgba;

/** The largest per-channel delta, the Oklab band's comparison. */
export const channelDistance: (left: Pixels.Rgba, right: Pixels.Rgba) => number;

/** A point at fraction `t` across a box, on its middle line. */
export const pointAt: (
  box: Smoke.Bounds,
  t: number,
  axis: "x" | "y",
) => { readonly x: number; readonly y: number };
```

Rules:

- `position` clamps the mix: below `stops[0].position` the first colour, above
  `stops[1].position` the second, linear in between. A non-increasing pair is
  outside the measured contract; a degenerate span resolves to the first colour
  below the first stop and the second above it, and the probe does not use one.
- Alpha mixes component-wise along with the colour channels, which is what the
  measured fade shows.
- Oklab converts sRGB 8-bit → linear → LMS cube roots → `L/a/b`, mixes, then
  inverts through linear → sRGB and rounds. Opaque stops only, so the measured
  premultiplication question does not arise.
- No literals from the palette: the caller passes the token colour.

---

## 5. The scenario: `gradient-pixels` (headless)

`capability: "gradient"` (new; live twin below). Two captures: the rest frame
and, after `hover("grad-hover")`, the hovered frame; then one leave frame after
`hover` moves to a stage point. Hit checks run before the captures.

**Frame basics**

1. the frame's device scale is an integer;
2. all twelve fixtures are painted (`grad-invalid` included: it has bounds, it
   simply paints nothing).

**sRGB**

3. `grad-srgb` at `0.05` is the model;
4. at `0.5` it is `#7F007F` (the model);
5. at `0.95` it is the model;
6. the left sample is blue-dominant and the right red-dominant (a guard that a
   wrong orientation cannot pass by matching a symmetric expectation).

**Oklab**

7. `grad-oklab` at `0.25`, `0.5`, `0.75` are within **12** channels of the model;
8. the Oklab midpoint is at least **40** channels from the sRGB midpoint (the
   `colorSpace` is not ignored).

**Orientation and positions**

9. `grad-vertical` at `0.05` (top) is the `0.95` mix toward the second stop and
   at `0.95` the `0.05` mix (the first stop is at the bottom) — an off-by-one in
   the plan's first draft was caught by the first run;
10. `grad-stops` at `0.05` and `0.20` are exactly blue;
11. at `0.80` and `0.95` exactly red;
12. at `0.5` the sRGB midpoint.

**Precedence, radius, invalid, alpha**

13. `grad-precedence` at `0.05 / 0.5 / 0.95` is `card`;
14. `grad-radius`'s corner 2 px inside the box is `background`;
15. its centre is the sRGB midpoint (the fill survives the clip);
16. `grad-invalid` at `0.05 / 0.5 / 0.95` is `background`;
17. `grad-alpha` at `0.05` is red-dominant;
18. its midpoint is the 50 % blend over the stage within **5** channels;
19. its right end is the stage colour.

**Hover**

20. `grad-hover` at rest is card at `0.05 / 0.5 / 0.95`;
21. hovered, the three samples are the model's success→destructive mix;
22. after leaving, the three samples are card again.

**Hit path**

23. a press at the centre of `grad-hit-valid` leaves `valid=0`;
24. a press at the centre of `grad-hit-clear` reaches it (`clear=1`);
25. a press at the centre of `grad-hit-none` reaches it (`none=1`).

The measured count is **121 checks** (each `paintedBox`, `pixelAt` and
comparison records its own check, the same convention as plan `801`'s 93 for 38
claims). The three captures cost ~28 s headless and ~25 s live.

---

## 6. The live twin: `live-gradient`

A second scenario, `live-gradient`, over the **same view** and the **same
shared checks**, with a driver:

- `readText` = `host.text`, settling 120 ms after every pointer verb (a live
  step must let the paint commit);
- `hover` = `host.hover`, settled;
- `clickAt` = `host.clickWindow`, settled;
- `capture` = `captureLive`, settled.

The three captures become the run artifacts
`apps/playground/.artifacts/live/live-gradient.png` (rest, via the wrapper's
`screenshot`), plus the two temporary frames (hover and leave). Register in
`live/scenarios.tsx` exactly like `liveStatePixels`: spread the headless live
scenario, set `view`, `ready: "gradient-stage"`, and `screenshot` the rest frame.

The capability guard (`liveScenarioProblems`) then sees the new capability with
its own live twin, so no alias is needed.

---

## 7. Files and exact commands

**Create**

- `apps/playground/src/scenarios/gradient-model.ts`
- `apps/playground/src/scenarios/gradient-model.test.ts`
- `apps/playground/src/scenarios/gradient.tsx`

**Change**

- `apps/playground/src/scenarios/index.ts` — import `gradientScenario`, add
  `"gradient"` to `PROBE_CAPABILITIES` and to the registry array.
- `apps/playground/src/live/scenarios.tsx` — import `gradientView` and
  `gradientLiveScenario`; add the `liveGradient` entry.
- `apps/playground/README.md` — one headless row, one live row, and a
  "Gradient surfaces in the frame (plan `807`)" section with the recipe and the
  limits.
- `COMPONENTS.md` — a Design system row (`Gradient surfaces`) and a capability
  matrix row (`gradient | gradient-pixels, live-gradient | verified`).
- `TODO.md` — the workstream task, ticked; two cross-team rows (below).
- `.agents/slop/plans/README.md` — the plan row.

**Commands, in order**

```sh
nub run --filter playground build
nub apps/playground/dist/smoke/run.js --list | grep -c gradient      # -> 1
nub apps/playground/dist/smoke/run.js --only gradient-pixels         # -> 1/1, exit 0
nub apps/playground/dist/live/run.js --list | grep -c live-gradient  # -> 1
nub apps/playground/dist/live/run.js --only live-gradient            # -> 1/1, exit 0 (twice)
nub apps/playground/dist/smoke/run.js                                # full headless
nub run check && nub run lint && nub run test
```

Expected: the new headless scenario is green on its first run, the live twin
green on two consecutive focused runs, the full headless suite green with the
registry one larger (120 → 121 scenarios) and the check total
`4452 + <new>` (the new count is read from the report), `check`/`lint`/`test`
green. **No full live gate** (merge gate); the live registry goes 109 → 110.

---

## 8. Mutation proofs (each must be observed red and reverted)

Runtime, failing **by name**:

- **M1** `grad-srgb` angle 90 → 180: the left/right samples fail.
- **M2** `grad-oklab` `colorSpace` → `srgb`: the midpoint checks fail (83
  channels away).
- **M3** `grad-stops` positions → `0 / 1`: the flat-band checks fail.
- **M4** drop `backgroundColor` from `grad-precedence`: it paints the gradient
  and the card checks fail (this is the reverse proof that the check is not
  vacuous).
- **M5** `grad-invalid` position `1.5` → `1`: it paints blue/red and the stage
  checks fail.
- **M6** remove the `borderRadius` from `grad-radius`: the corner paints the
  gradient.
- **M7** make `grad-alpha`'s second stop opaque: the right end paints red.
- **M8** remove `hover.background`: the hover frame stays card.
- **M9** remove `pointerEvents: "none"` from the `grad-hit-none` child: the
  parent stops receiving the press (`none=0`).
- **M10** add `backgroundColor: card` to `grad-srgb`: the precedence rule paints
  card and the sRGB checks fail.

Unit:

- **U1** `oklabAt` returns `srgbAt`: the Oklab midpoint test fails.
- **U2** the position clamp removed: the flat-band tests fail.
- **U3** alpha dropped from the mix: the fade test fails.

Record each observed failure text and the command in the plan's status line.

---

## 9. Records and cross-team

Add to `TODO.md` (owner outside this workstream):

- **tokens:** add semantic gradient roles (a brand/surface/fade pair) now that
  two-stop gradients are measured, or record why gradients stay an app-owned
  style. Evidence: plan `807`, `gradient-pixels`.
- **docs-site:** add the `gradient` capability row, and the Theming page section
  (angle convention, the two-stop limit, the silent invalid drop, the
  `backgroundColor` precedence, the `pointerEvents: "none"` recipe). Evidence:
  plan `807`, both scenario ids.

The records in this workstream are the README section, the `COMPONENTS.md` rows,
the plan index and the TODO tick.

---

## 10. STOP conditions

- **The headless frame paints no gradient** (stage colour at every sample): stop;
  the premise fails. Record the measured absence and do not ship fixtures that
  pass vacuously.
- **The two hosts disagree beyond the 12-channel Oklab band** (or on the sRGB
  path beyond 2): stop, record the host difference with both frames, and do not
  assert a shared model.
- **`nub run --filter playground build` fails for a reason outside this
  workstream**: stop and report; do not edit another package.
- **The capability guard rejects `"gradient"` in a way that needs `apps/docs`
  (outside this tree)**: keep the capability `"theme"` and record the naming gap
  in `TODO.md`; do not edit the docs app.
- **A live run opens no window (exit 2)**: the live twin is unverified; the
  headless half still lands and the plan says so. Do not claim the live result.
- **Any mutation does not fail**: the check is vacuous. Stop, strengthen it, and
  re-run both directions before continuing.

---

## 11. Test plan

`gradient-model.test.ts` (vitest, pure; every testable rule):

1. `srgbAt` returns each endpoint exactly at `t = 0 / 1`;
2. the sRGB midpoint is `#7F007F`;
3. a stop pair at `0.25 / 0.75` is flat before and after;
4. alpha mixes with the colour (midpoint alpha `128`);
5. `oklabAt`'s midpoint is `#8C53A2` within 1 channel;
6. the Oklab and sRGB midpoints differ by at least 30 channels;
7. `oklabAt` reproduces the sRGB endpoints within 1 channel;
8. identical stops mix to themselves;
9. `colourAt` dispatches on `colorSpace` (the Oklab result differs from sRGB);
10. `channelDistance` is the max per-channel delta, and `pointAt` maps `t` on
    both axes through the box.

The native checks then exercise the same model against the frame in both hosts,
so a model that drifts from the rasteriser fails at the pixel, not in the unit
test alone.

---

## 12. Result

**Landed 2026-10-20.** `gradient-pixels` / `live-gradient` are **121 checks
each**; `gradient-model.test.ts` adds **12 pure tests** (playground
**623 → 635**). The headless scenario ran **1/1 · 121 checks** focused
(28.3 s, then 43.1 s under load, then 9.1 s on a mutation build) and the live
twin **1/1 · 121** on four focused runs (24.5 / 25.5 / 19.0 / 22.1 s), the last
two on the final code. End-of-task full headless **121/121 · 4573 checks · 66
capabilities · 577.8 s**, exit `0` — exactly the plan-`801` total `4452 + 121`.
The live registry goes **109 → 110**; no full live gate was run (merge gate).

The ten runtime mutations all failed by name, exit `1`, and were reverted:

| # | Mutation | Failure |
| - | -------- | ------- |
| M1 | sRGB fixture angle 90 → 180 | `the sRGB left end is its stop: expected #0d00f2ff ±2, got #80007fff` |
| M2 | Oklab fixture → `srgb` | `the Oklab quarter mixes in Oklab: expected #5147d2ff ±12, got #3e00bbff` |
| M3 | stop positions → `0/1` | `a gradient holds its first stop before its position` |
| M4 | precedence fixture loses its colour | `backgroundColor wins over a gradient: expected #191d25ff, got #0d00f2ff` |
| M5 | invalid stop `1.5` → `1` | `an invalid stop drops the whole gradient` |
| M6 | radius removed | `the rounded corner is cleared of the gradient: expected #11141aff, got #0400fcff` |
| M7 | fade end becomes opaque | `the fade's midpoint is the half-alpha blend: expected #880a0dff ±5, got #ff0000ff` |
| M8 | hover gradient removed | `the hover gradient paints its first stop` |
| M9 | `pointerEvents: "none"` removed | `pointerEvents none hands the press back: expected … "none=1", got "valid=0 clear=1 none=0"` |
| M10 | sRGB fixture gains a solid colour | `the sRGB left end is its stop: expected #0d00f2ff, got #191d25ff` |

Three unit mutations failed as intended: `oklabAt` returning `srgbAt` (3 tests),
the stop clamp removed (the flat-band test), and alpha not mixing (the fade
test).

**Measured corrections.**

1. The model's sRGB midpoint is `#800080` (it rounds 127.5 up); the frame paints
   `#7F007F` — one channel apart, inside the 2-channel band. The unit test pins
   the model, the frame check pins the paint.
2. The first vertical check assumed the top edge was the pure second stop. At
   `y = 0.05` the gradient is 5 % toward the first stop (`#F1000E`), so the
   shared expectation is the `0.95` mix; the plan's §5 item 9 is corrected
   above.
3. The Oklab frame is within 6 channels of the CSS model (12-channel band) —
   the shader interpolates in half floats. The 83-channel sRGB/Oklab midpoint
   gap keeps the check load-bearing.

**Commands run:** `nub run --filter playground check-types`, `… test`
(635), `… build`, `nub apps/playground/dist/smoke/run.js --list | grep -c
gradient` → 1, `--only gradient-pixels` (green, ten mutation runs, one
post-correction run), `nub apps/playground/dist/live/run.js --list`, `--only
live-gradient` ×4, the bare headless registry, `nub run check:tests`, `nub run
lint`, `nub run fmt`, `nub run check`, `nub run test`. Records updated:
`apps/playground/README.md`, `COMPONENTS.md`, `TODO.md`, the plan index.

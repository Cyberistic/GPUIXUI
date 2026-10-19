# 674 — Pixel evidence: assert what the native frame actually painted

| Field | Value |
| ----- | ----- |
| Status | landed |
| Phase | F (native evidence) |
| Owner | playground workstream |
| Depends on | `100`, `110`, `120`, `140`, `150`, `189`, `197` |
| Feeds | the docs' native previews, the "screenshot-only" rows in `COMPONENTS.md` |

## 1. Goal

The native suite can prove geometry, text, focus, scroll, style and the
accessibility tree. It cannot prove **colour as painted**: `paintedStyle` is the
authored value (headless only), the live tree has no `style`, and the
`<canvas>`/image/diff-wash/theme rows all end at "screenshot evidence". The
runtime does write a real frame with `captureScreenshot(path)` / the automation
`screenshot` verb, so the strongest honest next observation surface is to read
that frame back.

Deliver a **pure PNG decoder + pixel model** in `packages/testing`, a scenario
that asserts the exact RGB of boxes whose colours the theme and literals set,
and a **live twin** that does the same in a real 1100 × 720 window. After this
plan, "colour reaches the screen" is an assertion, not a screenshot.

Non-goals:

- pixel-perfect screenshot diffing (no baseline images, no golden PNGs);
- anti-aliased edges, glyph rendering or gradient values;
- decoding interlaced PNGs or 16-bit channels (GPUI writes 8-bit RGBA,
  non-interlaced; anything else is a typed decode error);
- proving image **loads** from a path/URL. That needs a settled loader and is a
  separate question (plan `586`); this plan only supplies the tool.

## 2. Design

### 2.1 The model (`packages/testing/src/pixels.ts`)

Pure module, no Node imports, no `@gpuix/*`:

```ts
export class Rgba extends Schema.Class<Rgba>("Rgba")({
  r: Schema.Int, g: Schema.Int, b: Schema.Int, a: Schema.Int
}) {}

export class Pixels extends Schema.Class<Pixels>("Pixels")({
  width: Schema.Int, height: Schema.Int, data: Schema.Uint8Array
}) {}

export class PngDecodeError extends Schema.TaggedError<PngDecodeError>()(
  "PngDecodeError", { reason: Schema.String }
) {}

/** Inflate is injected so the package stays dependency-free. */
export const decodePng = (
  bytes: Uint8Array,
  inflate: (compressed: Uint8Array) => Uint8Array
): Either.Either<Pixels, PngDecodeError>;

export const pixelAt: (pixels: Pixels, x: number, y: number) => Option<Rgba>;
export const hexToRgba: (hex: string) => Option<Rgba>;         // #RGB, #RRGGBB, #RRGGBBAA
export const rgbaNear: (a: Rgba, b: Rgba, tolerance: number) => boolean;
export const frameScale: (pixels: Pixels, window: {width,height}) =>
  Option<number>;                                             // integer device scale, ±0.01
export const framePoint: (pixels: Pixels, window: {width,height}, x, y) =>
  Option<{readonly x:number; readonly y:number}>;
```

Rules:

- signature, `IHDR` (8-bit; colour types 0/2/4/6; no interlace), concatenated
  `IDAT`, `IEND`; unsupported input is a `PngDecodeError` naming the reason;
- unfilter all five PNG filters (None/Sub/Up/Average/Paeth) into RGBA;
- `pixelAt` and `framePoint` are total: out of frame is `None`, never a throw;
- `frameScale` is `Some` only when width and height give the same integer
  scale within `0.01`; a mismatched frame is `None`, so a scenario fails by
  name rather than sampling the wrong pixel;
- `hexToRgba` accepts the three token forms the theme uses; an unparseable
  string is `None` (the caller decides whether that is a failure).

### 2.2 Capturing a frame in a scenario

`apps/playground/src/scenarios/pixels.tsx` owns both helpers, because they are
the only code that touches a path:

```ts
const capturePixels = (host: Smoke.SmokeHost): Effect<Pixels, SmokeAssertionError>
const capturePixelsLive = (host: AsyncSmokeHost): Effect<Pixels, SmokeAssertionError | SmokeHostError>
```

Each writes one PNG to the OS temp directory (a `randomUUID` name), reads it with
`node:fs`, decodes with `node:zlib`'s `inflateSync`, and removes it in
`Effect.ensuring`. Every step is `Effect.try`; a missing file or a decode error
becomes a `SmokeAssertionError` that names the reason — never a thrown stack.
The host verb is the existing `screenshot(path)`, so neither host interface
changes.

### 2.3 The view

`PixelColourProbe`: a 560 × 240 `testId="pixel-canvas"` painted with
`useTheme().colors.background`, then four absolutely positioned 120 × 80 boxes:

| testId | colour |
| ------ | ------ |
| `pixel-red` | `#FF0000` |
| `pixel-green` | `#00FF00` |
| `pixel-blue` | `#0000FF` |
| `pixel-primary` | `useTheme().colors.primary` |

The boxes are declared with `position: "absolute"` at integer offsets so no
layout arithmetic is needed; the scenario reads each box's **real bounds** and
samples its centre, so the position is not duplicated in the assertion.

### 2.4 The assertions (headless `pixel-colour`, live `live-pixel-colour`)

Capability: `theme` (existing — no new capability union entry, so the docs-site
capability matrix needs no cross-team edit). Each step is a `ctx.expect*`:
each sampled box records its painted-bounds lookup, its frame-point mapping and
its pixel, then the colour check — so the scenario reports **22 checks**, and a
failure names which of the three stages broke.

1. the frame decodes and its scale is an integer (measured: 2 in both hosts);
2. `pixel-red`'s centre is `(255, 0, 0, 255)` ± 2;
3. `pixel-green`'s centre is `(0, 255, 0, 255)` ± 2;
4. `pixel-blue`'s centre is `(0, 0, 255, 255)` ± 2;
5. `pixel-primary`'s centre is `hexToRgba(palettes.dark.colors.primary)` ± 2 —
   the token, not a literal, is what paints;
6. the canvas background at its top-left + `(8, 8)` is
   `palettes.dark.colors.background` (the runner's theme), ± 2.

The three exact literal checks already prove the frame is not one colour
everywhere, so no separate distinctness check is needed.

The live twin reuses the view and the same expected colours, but samples a real
window frame; the only difference is how the frame arrives (an effectful
screenshot after the runner's `ready` gate).

## 3. Files

| File | Change |
| ---- | ------ |
| `packages/testing/src/pixels.ts` | new pure model + decoder + helpers |
| `packages/testing/src/pixels.test.ts` | new unit tests (§4) |
| `packages/testing/src/index.ts` | `export * as Pixels from "./pixels.js"` |
| `packages/testing/README.md` | document the `Pixels` namespace and the injected inflate |
| `apps/playground/src/scenarios/pixels.tsx` | new view + headless scenario + capture helpers |
| `apps/playground/src/scenarios/index.ts` | register `pixelColourScenario` |
| `apps/playground/src/live/scenarios.tsx` | register `livePixelColourScenario` |
| `apps/playground/README.md` | new "Pixel evidence" section with measured values |
| `COMPONENTS.md` | append `pixel-colour`, `live-pixel-colour` to the `theme` evidence row and record the new surface |
| `TODO.md` | one task under the playground workstream, ticked |
| `.agents/slop/plans/README.md` | index this plan |

## 4. Test plan

`packages/testing/src/pixels.test.ts` (vitest, `node:zlib` in the test only):

| Test | Must fail when |
| ---- | -------------- |
| all five filters unfilter to the authored bytes | any filter branch is removed or copied from a neighbour |
| a 2 × 2 RGBA PNG decodes to the expected four pixels | the channel order or stride is wrong |
| a non-PNG signature is `Left` naming the signature | the decoder accepts anything |
| an interlaced/16-bit/palette IHDR is `Left` naming the field | the decoder guesses |
| `pixelAt` returns `None` outside the frame | the bounds check is dropped |
| `frameScale` accepts 2 and rejects a non-integer ratio | the scale check is dropped |
| `framePoint` maps a window point to the device pixel | the scale is ignored |
| `hexToRgba` parses `#RGB`, `#RRGGBB`, `#RRGGBBAA` and rejects junk | parsing is lenient/throws |

The scenario is its own integration test. Mutation proofs, each observed and
reverted:

- **M1** swap `pixel-red` and `pixel-blue` colours → the red check fails with
  the measured blue value;
- **M2** ignore the device scale in `framePoint` → the sample lands in the
  background and the red check fails;
- **M3** break the `Sub` unfilter → the package test fails and the scenario's
  colours are wrong;
- **M4** remove the `captureScreenshot` call / point at a stale path → the
  scenario fails with the named decode/file reason, not a crash.

## 5. Commands and expected results

```sh
nub run --filter testing test
# expected: the existing 61 tests plus 7 pixel tests (68), all green

nub run --filter playground build
# expected: exit 0

nub apps/playground/dist/smoke/run.js --only pixel-colour
# expected: 1/1 scenarios passed · capabilities: theme=verified, exit 0

nub apps/playground/dist/live/run.js --only live-pixel-colour
# expected: 1/1 scenarios passed, exit 0 (one real window)

nub run --filter playground test
# expected: the existing 439 tests plus any pure helper tests, green
```

Then the end-of-task checks, because this is cross-cutting harness work:

```sh
nub apps/playground/dist/smoke/run.js   # full headless registry
nub run check
nub run lint
nub run test
```

The full **live** suite is the merge/release gate and is not run while
iterating. The live registry grows by one id; the headless registry grows by one
scenario and **22 checks per host**.

## 6. STOP conditions

Stop and report instead of improvising if:

- the real frame is not 8-bit non-interlaced RGBA (print the IHDR and stop —
  the decoder's non-goals are wrong, not the test);
- a solid box's centre differs from its authored colour by more than 2 per
  channel (colour management or premultiplication is in play; record the
  measured value and do **not** widen the tolerance silently);
- the live screenshot's scale is not an integer (report the size pair);
- `captureScreenshot` in the `TestRenderer` does not include the last paint
  (report the frame; do not add a sleep loop).

## 7. Acceptance

- `packages/testing` exposes `Pixels` with a pure decoder and 8 tests that can
  fail; the package still imports no `@gpuix/*`.
- `pixel-colour` and `live-pixel-colour` are registered, `theme=verified`, and
  prove the theme's primary and the three literals from a real native frame.
- The docs (`apps/playground/README.md`) and `COMPONENTS.md` cite the scenario
  ids and remove the blanket "colour stays headless" wording where pixels now
  answer it.
- `TODO.md` has the task ticked with the measured values and the exact ids run.

## 8. Results (2026-10-19, darwin-x64)

**Implementation.** `packages/testing/src/pixels.ts` is the pure decoder; the
inflate is injected, so the package still imports no `node:*` or `@gpuix/*`
(the test file imports `node:zlib` to build fixtures, which is the test
boundary). `apps/playground/src/scenarios/pixels.tsx` owns the two capture
helpers and the shared view; `pixel-colour` is registered headlessly and
`live-pixel-colour` is the live twin (`ready: "pixel-canvas"`).

**Measured colours** (both hosts, exact, tolerance 2):

| Sample | Headless | Live |
| ------ | -------- | ---- |
| frame / window | `2560 × 1600` / `1280 × 800` | `2200 × 1440` / `1100 × 720` |
| device scale | `2` | `2` |
| `pixel-red` | `#FF0000FF` | `#FF0000FF` |
| `pixel-green` | `#00FF00FF` | `#00FF00FF` |
| `pixel-blue` | `#0000FFFF` | `#0000FFFF` |
| `pixel-primary` | `#A7A9FF` | `#A7A9FF` |
| background | `#11141A` | `#11141A` |

**Commands run**

```sh
nub run --filter testing test
# 7 files, 68 tests (61 + 7), green

nub run --filter playground build
# exit 0

nub apps/playground/dist/smoke/run.js --only pixel-colour
# 1/1 scenarios passed · theme=verified, exit 0; 22 checks

nub apps/playground/dist/live/run.js --only live-pixel-colour
# 1/1 scenarios passed, exit 0; 22 checks; one real window

nub apps/playground/dist/smoke/run.js
# 106/106 scenarios passed, 3824 checks, 65 capabilities, 150.4 s, exit 0
```

`nub run check`, `nub run lint` and `nub run test` are green (playground **439**,
testing **68**, components 308, primitives 282, tokens 196, tw 103, icons 19,
deploy 7). The full live suite was **not** run: this is not the merge/release
gate, and the registry now has **95** live scenarios. The focused live run is
`5.6–10.6 s`; the headless scenario is `7.9–21.3 s` because the offscreen
2560 × 1600 capture dominates.

**Mutation proofs (observed, then reverted)**

| # | Mutation | Result |
| - | -------- | ------ |
| M1 | swap `pixel-red` and `pixel-blue` | `red paints red: expected #ff0000ff, got #0000ffff`, exit `1` |
| M2 | ignore the device scale in `framePoint` | `green paints green: expected #00ff00ff, got #ff0000ff`, exit `1` |
| M3 | make the `Sub` predictor `0` | the package's unfilter test fails, exit `1` |
| M4 | remove the `screenshot` call | `the captured frame is readable: … ENOENT …`, exit `1` (a named failure, not a crash) |

**Limits.** The decoder accepts only 8-bit non-interlaced colour types 0/2/4/6
and reports anything else as a typed error. Anti-aliased edges, gradients,
glyph rendering and the image path/URL loader are still screenshot-only; the
plan-`586` limitation stands. The capture cost is real, so this is a targeted
observation surface, not a per-scenario default.

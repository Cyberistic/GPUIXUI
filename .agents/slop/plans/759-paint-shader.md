# 759: `paint_shader`, rune's effects and the fire film

Goal: disprove "gpui can't set the ui on fire", port `rune-fx` to `/effects`, then remake
`~/Documents/rune.mp4` (33.6 s, 1080p60) in GPUIxUI. Rune is MIT: keep its notice on ported shaders.

## Findings

Rune's hook (`crates/rune/README.md`, "Compositor hook") provides three things the pin lacks:

| Need | Pinned GPUI (`f77e5cf`) | Status |
| ---- | ----------------------- | ------ |
| User shader in painter order | eight fixed primitives; `paint_surface` is YCbCr-only on macOS, a `wgpu::Texture` on Linux | spiked |
| Read what was drawn before it | absent; `framebuffer_only(false)` is already set and paths already end and reopen the pass | spiked |
| Blurred backdrop (lens, frost, `backdrop_blur`) | absent | to do, mip chain |
| Compute passes with persistent state (`firesim.wgsl`, the film's flames) | absent | to do |
| Isolated group opacity around an effect | absent; opacity multiplies per primitive | workaround: a param |

`gpui-ce`: #237 shares the wgpu device and composites a texture, on the `gpui_render` rewrite.
Custom-shader PR #4 was closed unmerged; tracking issue #360 is closed. Nothing to lift for Metal.
`remorses/zed#7` (mateo-m, effect layers, 5.4k lines, DirectX never compiled) closed unmerged with
no recorded reason. Ask before duplicating its scope.

## Measured on this Mac, 960×540 @2x

| Route | Result |
| ----- | ------ |
| Stock 0.11.0, TS flames via `setImagePixels`, 600×242 | 25.4 ms paint + 2.7 ms upload per frame |
| Stock, 300×121 | 7.9 + 1.4 ms |
| Patched, fire + haze, 735×540 and 480×180 pt | GPU 4.48 ms median, 7.19 p95; 0.31 without shaders |

Headless command-buffer times. Live window pacing is not measured. The stock route has no additive
blend on Metal and no backdrop.

## Spike

The patch is `patches/gpui/0002-paint-shader.patch`; the addon is `packages/native`. Scenes in
`workspaces/rune-fx/apps/playground/src/spike` (uncommitted). wgpu and DirectX arms are `TODO` no-ops.

Build: `cargo +1.97.1 build --release --features test-support` in `packages/native`, with `zed` beside it.
Run with `NAPI_RS_NATIVE_LIBRARY_PATH=<dylib copied to .node>`.

## Phases

1. PR `remorses/zed`: `paint_shader`, Metal and wgpu, then DirectX via naga HLSL. STOP for owner approval.
2. Blurred backdrop and compute/persistent state, as separate PRs.
3. GPUIX `<shader>`, then `@gpuixui/fx`: glow, pulse, electric, fire, shimmer, sparkles, liquid metal, mesh,
   plastic, fluted glass, lens, distort; one docs page, example and inventory record each.
4. Film. Timeline (seconds): 0 switch, 1.3 settings, 2.7 diff, 4 table, 5.3 today + dock, 6.7 OP-1, 8 Night Drive,
   9.3 launcher, 10 ask, 10.7 library shock, 12 fire, 13.3 pricing, 14.7 deploy, 16 ask, 17.3 pads, then
   intercuts, 29.3 logo. Sources: `examples/showreel`, `examples/lab` (`rune-light`, not yet audited).

## Validation (2026-11-07): ships in GPUIxUI, no upstream PR needed

Binary: GPUix `0ce4f41` (0.11.0 predates the custom-element API; same zed pin) + `0002-paint-shader.patch`.

| Check | Result |
| ----- | ------ |
| `cargo test -p gpui_apple`, `gpui_wgpu` | 10/10, 36/36 |
| `@gpuixui/native` pixels through `register` | 3/3; 2 fail on stock with `r:255` for the shader's colour |
| Seven behaviour suites, stock vs patched | identical: 1,822 pass, same 9 `shell` failures on both |
| Live macOS window | 230-238 draws/s against stock's 232-239 |
| Chrome WebGPU (Apple metal-3) | fire and backdrop haze, 60 fps rAF |
| Chrome WebGL2 | fire; backdrop shaders skipped |

Found by validating: `NAPI_RS_NATIVE_LIBRARY_PATH` is read by every napi-rs package (rolldown crashed), so `register`
scopes it to one load. wgpu reports RENDER_ATTACHMENT only for a WebGPU canvas, so COPY_SRC is requested explicitly.
`screencapture -l` returns stale frames on stock too: do not measure with it.

Not done: DirectX, a real Linux run, per-platform prebuilds, a docs route on the patched wasm. The 9 `shell` failures
(`window.test.tsx`, "no element with testId") predate this work and are unexplained.

## Simulated fire (2026-11-07)

The owner rejected the noise flames: rune's film uses `firesim.wgsl`, a fluid solve. `paint_shader` gained
`ShaderSimulation`, a keyed grid stepped by compute passes at a fixed 1/60 s. `apps/playground/src/spike/fire-real.ts`
runs rune's simulation, flame shading, embers and glow with its parameters.

- Output is linear values written straight to the target, as rune's default frame does. `to_srgb` washes the red out.
- `smoothstep` with equal edges is undefined: a simulation's corner radius must not be 0, or its fuel is NaN.
- A burn front must move slower than the gas rises, or the solid region swallows the flames.
- Render film frames sequentially: the sim runs at most 4 steps per frame, so sampling sparse times changes the look.

## Film state

Opening done as a spike (`spike/opening.tsx`): the real tweet screenshot, burning from a moving fire front. Next, in order:
a rune-fx compatibility prelude so `common.wgsl` and the effect shaders port close to verbatim; then the scenes from
`examples/showreel` and `examples/lab`, themed Hunter x Hunter; original audio, not rune's.

## Film first cut (2026-11-07)

`apps/playground/src/film/reel` (scenes, capture), `apps/playground/scripts/reel-cut.py` (edit list, side-by-side, final mix),
`scripts/gen-rune-wgsl.py` (rune-fx WGSL to paint_shader). Output in `media/reel` (uncommitted): the film and `theirs-vs-ours.mp4`.

Rune frames default to `srgb_blend`, so every shader encodes `to_srgb(straight) * a + to_srgb(light - cover)`. Scene offsets
come from events in their cut: fire's tap lands 0.66 s in, and the scene taps at 0.95 s, so that cut starts at 0.29 s.

Open: macro shots are enlarged crops (the test renderer has no scale option). Diff and table are hand-composed, Switch and
Slider are the library's only in Settings; the hero toggle is hand-drawn. The lit scenes approximate rune-light with one
shader. Not started: docs pages for the effects, moving them into `@gpuixui/fx`. A one-off `code-block.test.tsx` timing
failure (3.5 vs 4) did not reproduce in 3 isolated runs per binary or a full rerun.

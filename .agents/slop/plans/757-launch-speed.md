# 757: launch speed parity with raw GPUI

Goal: reduce spawn-to-first-content on macOS as close to raw GPUI as Node allows.
The baseline, on an M2 Pro with warm caches and a foreground window: raw GPUI 127 ms,
stock GPUix 463 ms, playground via `nub` 1190 ms.

## Upstream, `remorses/gpuix` branch `feat/launch-speed`

| Change | Files | Measured saving |
| ------ | ----- | --------------- |
| Build the reqwest client on first request | `packages/native/src/custom_elements/img.rs` | 121 ms |
| Open hidden, commit, then order front and draw synchronously | `packages/native/src/renderer.rs`, `packages/react/src/reconciler/renderer.ts` | prototype of the pre-window order: 118 ms |
| Start the frame loop after the first commit | `packages/react/src/reconciler/renderer.ts` | included above |
| Install the app menu on the first tick | `packages/native/src/renderer.rs` | 13 ms |
| Import the automation client on demand | `packages/native/js/runtime.ts`, `packages/react/src/reconciler/renderer.ts`, `packages/solid/src/renderer.ts` | up to 40 ms unbundled |

Zod stays: GPUix does not use Effect, so replacing it would add a dependency.

Commands, from `packages/native`: `cargo test --lib`, `bun run build`, `bun run test`.
From `packages/react`: `bun run test`. From `example-app`: `bun run test`.

STOP if synchronous presentation shows a black or partial first frame, if a remote `<img>`
stops loading, if cmd-q stops working, or if `launch()` automation stops connecting.

## GPUIXUI, branch `agent/launch-speed`

- `apps/playground/scripts/launch-bench/`: the Metal frame probe and interleaved driver.
- `apps/playground/scripts/bundle.ts` and `nub run --filter playground start`: a production
  bundle with the V8 compile cache.

Run the benchmark with `nub run --filter playground bench:launch`. It reports each variant's
median and quartiles, and exits non-zero if a variant's first content frame cannot be found.

## Test plan

- First frame: the probe reads the presented drawable. Frame 0 of a shown window must
  contain the committed tree. Against the old order frame 0 is pure black.
- Lazy HTTP: creating the client must not build reqwest; the first request must.
- Lazy automation: importing `@gpuix/react` must not load `zod`. Fails against the static import.
- Regressions: `launch()` connects, a remote image loads, cmd-q quits, `focus: false` and
  `show: false` keep their behaviour.

## Acceptance

`nub run check`, `nub run lint`, `nub run test` pass here. The upstream test commands pass.
The benchmark's numbers are recorded in `.agents/slop/status.md`. Windows and Linux keep
their current launch order because they could not be verified on this machine.

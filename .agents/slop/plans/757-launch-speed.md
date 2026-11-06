# 757: launch speed parity with raw GPUI

Goal: reduce spawn-to-first-content on macOS as close to raw GPUI as Node allows. Numbers are
from an M2 Pro with warm caches and a foreground window. Interleaved, 15 runs, medians.

| Launch | `@gpuix` 0.11.0 | With `remorses/gpuix` `feat/launch-speed` |
| ------ | --------------- | ----------------------------------------- |
| Raw GPUI, same zed revision and profile | 131 ms | 130 ms |
| Hello, bundled | 428 ms | 164 ms |
| Playground, bundled | 519 ms | 260 ms |
| Playground, bundled, compile cache | 472 ms | 226 ms |
| Playground, `nub`, unbundled | 1168 ms | not measured until the release |

The residual is Node's boot and bundle evaluation, and AppKit finishing `finishLaunching`
before the first commit. A V8 startup snapshot saved 14 ms on hello in a prototype and restricts
what can run at build time, so it is not adopted. Bun's results were too noisy to prefer it.

## Upstream

- Open hidden, commit, order front and draw synchronously (`presentWindow`).
- Build the HTTP client on the first request. Install the menu bar on the first tick.
- Import the automation client and zod on demand, only when stdin is not a character device.
- Zod stays: GPUix does not use Effect, so replacing it would add a dependency.

## This repo

- `apps/playground/scripts/launch-probe.c` and `src/launch/`: the benchmark. It counts a frame
  as content only when its presented pixels are not uniform, so a blank frame or a hidden
  frame never passes, and each row prints the content pixel count to catch a wrong render.
- `apps/playground/scripts/bundle.ts`: the production bundle and `start.mjs`.

Run `nub run --filter playground bench:launch`. Flags, after `nub run --filter playground bundle`:
`--runs N`, `--only <substring>`, `--baseline <binary>`, `--addon <path>`. `GPUIX_CHECKOUT=<path>`
bundles an unreleased GPUix. The display must be awake and the window comes to the front.

The baseline binary is a `gpui_platform::application()` hello world with the same zed path
dependency and `lto = true`, opening an 800x600 window.

## Remaining

STOP until the upstream PR ships in a release. Then bump the `@gpuix/*` catalog entries, rerun
the benchmark, record the `nub` row here and delete this plan. Windows and Linux keep their launch
order until someone can verify `presentWindow` there.

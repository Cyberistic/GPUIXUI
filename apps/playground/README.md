# apps/playground — the native GPUix playground

**Status: Phase B.** Plan `120`
(`.agents/slop/plans/120-app-playground.md`) builds the app: the scenario shell,
`SplitPane` and the eight core scenarios, plus the smoke CLI. Two pieces already
exist beside it:

- `../../packages/testing` (`@gpuixui/testing`) — the platform-free half: check
  model, scenario runner, report and runtime preflight;
- `legacy-probe/` — the GPUix 0.5.1 evidence probe (below).

The app itself is not created yet; this README is updated by plan `120`.

This is where the library is proven. It runs on GPUix, in the real runtime, and
it is the only honest source of native previews for the docs site.

## Why it exists

The single biggest risk in this project is whether GPUix supports the layout,
input, focus, overlay and panel primitives the component API needs. That is
resolved by a **real native smoke test early** — before investing heavily in the
component API — and this app is where that smoke test lives.

## Evidence on this host (read this before believing a status row)

The library targets `@gpuix/react@0.10.0` + `@gpuix/native@0.10.0`, and this
Intel Mac has **no `darwin-x64` binding** for it, so the 0.10.0 smoke suite
cannot run here (`.agents/adr/0001-native-smoke-host.md`). `@gpuix/native@0.5.1`
is the last release with that binding and **does** run; `legacy-probe/` measures
what GPUI does on this hardware, and `legacy-probe/REPORT.md` is the measured
table (`./legacy-probe/run.sh probe` reproduces it):

| Capability | Measured on 0.5.1 here |
| ---------- | ---------------------- |
| Layout, text, input editing, click, overlay anchoring, pointer-capture resize, virtual list, programmatic scroll | works |
| Focus / blur events | **never delivered** — no focus state can be built on 0.5.1 |
| Synthetic wheel scroll | **not applied** — only the `onScroll` delta fires |
| `<canvas>` | element type exists, nothing paints |

Those verdicts are evidence about the runtime and the hardware. They are
**never** the basis for marking a 0.10 component `done`; that needs the smoke
suite run on a supported host (Apple Silicon macOS, x64 Windows, or x64 Linux
for the live-app path).

## What Phase B must create (plan `120`)

- A GPUix + React application that imports the library's packages directly and
  renders a gallery of the components that exist.
- A **native smoke test** that exercises, in the real runtime: layout, text
  rendering, input editing, focus movement, selection, overlay open/close,
  outside-click where supported, scroll, and panel resizing. Its output must be
  readable from the command line so the supervisor and agents can cite it.
- A documented run command (`nub run dev:playground` from the root) and a
  documented way to capture evidence (screenshot or runtime output) that a docs
  page can link to.
- Honest failure: a primitive GPUix does not support is reported as unsupported
  with the reproduction, not worked around silently.

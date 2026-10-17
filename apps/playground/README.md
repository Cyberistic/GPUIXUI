# apps/playground — the native GPUix playground

**Status: Phase B deliverable. Not created yet — the plan comes first.**

This is where the library is proven. It runs on GPUix, in the real runtime, and
it is the only honest source of native previews for the docs site.

## Why it exists

The single biggest risk in this project is whether GPUix supports the layout,
input, focus, overlay and panel primitives the component API needs. That is
resolved by a **real native smoke test early** — before investing heavily in the
component API — and this app is where that smoke test lives.

## What Phase B must create

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

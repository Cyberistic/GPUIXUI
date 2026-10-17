# Preview strategy

The library renders through **GPUix** (GPUI: Metal, DirectX, Vulkan). The docs
site is a browser app. This document records how the site shows a native
component without pretending a browser imitation is the real thing. It is the
source of truth for every preview; plan `412-preview-strategy.md` implements it.

## The four honest tiers

Every preview on the site is exactly one of these, and carries the label that
names it.

| Tier | What it is | Label the reader sees | When it is used |
| ---- | ---------- | --------------------- | --------------- |
| **N** | A real native run in `apps/playground` | `Run it natively: nub run dev:playground → <screen>` | Always, for every implemented component with a playground screen |
| **S** | A real screenshot captured from the GPUix runtime | `Captured from GPUix — <platform>, GPUix <version>, <commit>` | Whenever the playground can capture one |
| **A** | A browser approximation of the component's documented layout | `Illustrative approximation — not GPUix. Run it in the playground for real behaviour.` | Only for static layout/typography/spacing; never for an interaction presented as native |
| **X** | Source plus a limitation notice | `Not verified in the GPUix runtime — <reason>` | When the runtime does not support the behaviour, or it is not yet verified |

`<NativePreview slug>` chooses the highest honest tier from the component's
registry record: screenshots first, then a playground screen, then unavailable.
An approximation is never a fallback — a page author must choose it, and the
only way to render one is through `<IllustrativeApproximation>`, which always
renders the banner.

## Evidence

- GPUix paints in a native window: "GPUIX paints it with Metal, DirectX, or
  Vulkan. No Electron. No web view." — `references/gpuix/README.md`.
- GPUix has a browser target (`bun run web`) that renders the same React tree in
  a browser canvas via WebGPU/WebGL2 through wasm-bindgen. It requires **nightly
  Rust** and `wasm-bindgen-cli` 0.2.127, ships a ~19 MB Wasm module, and the
  document must be cross-origin isolated (`Cross-Origin-Opener-Policy:
  same-origin`, `Cross-Origin-Embedder-Policy: require-corp`). — same README.
  Because of that cost it is a **conditional upgrade**, not the default. It is
  not claimed anywhere until the Phase A probe proves it builds on this machine
  and the deploy can serve the Wasm and the headers.
- GPUix exposes an automation API whose `screenshot({ path })` "reads the GPU
  surface", and `launch()` can run a window with `GPUIX_BACKGROUND=1` so an
  agent captures evidence without stealing focus. — same README.

## Screenshot provenance

A screenshot is only shown with a real sidecar, written by the playground
capture script:

- path: `apps/docs/public/screenshots/<slug>/<state>.png`
- sidecar: `apps/docs/public/screenshots/<slug>/provenance.json` with
  `{ platform, gpuixVersion, commit, command, capturedAt }`
- the caption is `Captured from GPUix — <platform>, GPUix <version>, <commit>`,
  built only from the sidecar; the docs site never invents these values
- if the registry lists a screenshot whose sidecar is absent, no screenshot is
  rendered at all: the page reports the missing sidecar rather than taking a
  caption from the file name

The capture script is owned by the playground workstream (`TODO.md`).

## Platform styles in previews

Every preview renders with the site's active platform style (plan 420): the
toggle in the navigation writes `?platform=darwin|linux|win32|default`, and the
provider applies `platformTheme(theme, platform)` from `@gpuixui/tokens`. A
screenshot capture records its platform in the sidecar and keeps that caption;
the toggle does not relabel a macOS capture as Windows.

A browser approximation may show the mono family a platform style resolves to,
because a browser can render it. It must not claim to show `.SystemUIFont`: that
sentinel resolves only inside GPUI, so the UI face of a browser approximation is
still an approximation of the docs site, not of the native window.

## How source is reproduced

Tier **X** shows "source plus a limitation notice", and tier **N/S** pages carry
the component's source too — always the **real file**, read at build time by
Fumadocs' `<include>` tag (`remarkInclude`), never a hand-pasted copy. The
included path is the component's registry `sourcePath`, so the page and the
registry cannot disagree, and `apps/docs/src/content-references.test.ts` fails
if a page points at a file that does not exist, names a missing region, or omits
the source for a component that is no longer `planned`.

## What is explicitly not claimed

- That a browser approximation runs GPUix. It does not; it is labelled.
- That an unverified component works. It is shown as unavailable.
- That a screenshot proves an interaction. A screenshot is a still frame; the
  playground is the interactive proof.
- That a GPUix rendering surface is embedded in this site. Until the conditional
  upgrade is proven, it is not.

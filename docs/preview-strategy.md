# Preview strategy

The library renders through **GPUix** (GPUI: Metal, DirectX, Vulkan). The docs
site is a browser app. This document records how the site shows a native
component without pretending a browser imitation is the real thing. It is the
source of truth for every preview; plan `412-preview-strategy.md` implements it.

## The five honest tiers

Every preview on the site is exactly one of these, and carries the label that
names it.

| Tier | What it is | Label the reader sees | When it is used |
| ---- | ---------- | --------------------- | --------------- |
| **N** | A real native run in `apps/playground` | `Run it natively: nub run dev:playground → <screen>` | Always, for every implemented component with a playground screen |
| **S** | A real screenshot captured from the GPUix runtime | `Captured from GPUix — <platform>, GPUix <version>, <commit>` | Whenever the playground can capture one |
| **S** (interaction) | A before/after pair or recording of a real gesture | `Recorded in GPUix — <platform>, GPUix <version>, <commit>` | When the capture proves resizing, dragging or another state change a still cannot |
| **V** | Native coverage by an automated suite, with no image | `Native coverage: <suite> drives this component in the real GPUix renderer. Run <command>. No capture is published for this page yet.` | When the component has a real runtime suite but no screenshot or playground screen |
| **A** | A browser approximation of the component's documented layout | `Illustrative approximation — not GPUix. Run it in the playground for real behaviour.` | Only for static layout/typography/spacing; never for an interaction presented as native |
| **X** | Source plus a limitation notice | `Not verified in the GPUix runtime — <reason>` | When no runtime suite exists, or the runtime does not support the behaviour |

`<NativePreview slug>` chooses the highest honest tier from the component's
registry record: screenshots first, then a playground screen, then native
coverage, then unavailable. An approximation is never a fallback — a page author
must choose it, and the only way to render one is through
`<IllustrativeApproximation>`, which always renders the banner.

**Tier V is coverage, not a pass.** It names the suite file and the exact
command; the component's status badge (mirrored from `COMPONENTS.md`) is the
only place that says how far verification got. A delivered component with no
suite is a stopped condition (plan 432 §9), never a silent tier X.

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
  `{ platform, gpuixVersion, commit, command, capturedAt, kind? }`; `kind` is
  `"interaction"` for a before/after pair or recording and defaults to `"still"`
- the caption is `Captured from GPUix — <platform>, GPUix <version>, <commit>`,
  or `Recorded in GPUix — …` for an interaction artefact, built only from the
  sidecar; the docs site never invents these values
- if the registry lists a screenshot whose sidecar is absent, no screenshot is
  rendered at all: the page reports the missing sidecar rather than taking a
  caption from the file name
- a still capture proves the resting layout only. A `stateful` or `workspace`
  page must say which interaction it does **not** prove and point at the
  playground screen; a still is never captioned as a recording.

The capture script is owned by the playground workstream (`TODO.md`).

### What the docs commit

The playground writes every frame to the gitignored
`apps/playground/.artifacts/screenshots`; those files are **not** published. The
docs commit a curated set under `apps/docs/public/screenshots/<subject>/`, and
only the frames a page renders:

- the exact run is `nub run --filter playground build`, then
  `nub apps/playground/dist/smoke/run.js --screenshots`;
- each published directory carries a `provenance.json` written from that run —
  `platform`, `gpuixVersion`, `commit`, `command`, `capturedAt` — with `commit`
  being the commit the capture ran at;
- refreshing a capture means re-running the command and re-copying the frame;
  the caption then shows the new commit, and a stale one stays visible;
- a frame whose sidecar is absent is not rendered. The page names the missing
  file instead of showing the image (plan 433).

## Platform styles in previews

Every preview renders with the site's active platform style (plan 420): the
toggle in the navigation writes `?platform=darwin|linux|win32|default`, and the
provider applies `platformTheme(theme, platform)` from `@gpuixui/tokens`. It also
follows the docs' light/dark mode. Both values are read from the state the
providers publish on `<html>` (`data-platform` and the `dark` class) rather than
from React context, because the MDX subtree loses the providers' mount-time
updates: without that, a dark page painted light previews and a shared
`?platform=win32` link kept the default mono face (plans 444, 445). The server
renders `default`/light, so the HTML never hydrates mismatched. A screenshot
capture records its platform in the sidecar and keeps that caption; the toggle
does not relabel a macOS capture as Windows.

**Tier A is token-driven, not a second palette** (plan 434). A labelled
approximation renders through `PreviewSurface`, which maps the whole active
`Theme` — every colour role, type role, spacing step, radius, border width,
density metric, icon size and elevation level — to `--preview-*` custom
properties. `theme-surface.test.ts` proves the mapping is complete and that a
theme override reaches every group; `approximations.test.tsx` proves each
preview changes when the platform theme changes. No preview may contain a colour
literal; the test reads the source and fails on one.

Today the shipped platform styles differ in **type families and theme name
only** (`packages/tokens` plan 051). The visible change on a preview is therefore
its monospace text. Real per-platform colours, spacing and control metrics are a
`packages/tokens` task recorded in `TODO.md`; when they land, every preview
inherits them with no docs edit. The site must not invent them.

A browser approximation may show the mono family a platform style resolves to,
because a browser can render it. It must not claim to show `.SystemUIFont`: that
sentinel resolves only inside GPUI, so the UI face of a browser approximation is
still an approximation of the docs site, not of the native window.

Tier A is static only. A preview that needs to prove an interaction belongs in
the playground or a recording, never in a browser approximation that would imply
native behaviour it does not have.

## How source is reproduced

Tier **X** shows "source plus a limitation notice", and tier **N/S/V** pages
carry the component's source too — always the **real file**, read at build time
by Fumadocs' `<include>` tag (`remarkInclude`), never a hand-pasted copy. The
included path is the component's registry `sourcePath`, so the page and the
registry cannot disagree, and `apps/docs/src/content-references.test.ts` fails
if a page points at a file that does not exist, names a missing region, or omits
the source for a component that is no longer `planned`.

## What is explicitly not claimed

- That a browser approximation runs GPUix. It does not; it is labelled.
- That an unverified component works. It is shown as unavailable.
- That native coverage is a capture. Tier V names the suite and the command, and
  says that no image is published.
- That a screenshot proves an interaction. A screenshot is a still frame; the
  playground is the interactive proof.
- That a GPUix rendering surface is embedded in this site. Until the conditional
  upgrade is proven, it is not.

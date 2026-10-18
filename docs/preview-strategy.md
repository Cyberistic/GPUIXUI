# Preview strategy

The library renders through **GPUix** (GPUI: Metal, DirectX, Vulkan). The docs
site is a browser app. This document records how the site shows a native
component without pretending a browser imitation is the real thing. It is the
source of truth for every preview; plan `412-preview-strategy.md` implements it.

## The honest tiers

Every preview on the site is exactly one of these, and carries the label that
names it.

| Tier | What it is | Label the reader sees | When it is used |
| ---- | ---------- | --------------------- | --------------- |
| **L** | A live GPUix surface: the library's real component code on GPUix's **published WebAssembly renderer** (the browser's GPU backend), in an isolated document | `Live GPUix surface — … It is not the native desktop window: run the playground for that.` | On a record that declares a `liveScene` (Buttons, Tabs, Dropdown menus, Dialogs, Confirmation dialogs, Popovers, Command menus, Icons, Scrollable containers, Skeletons, Loading indicators, Drawers, Navigation menus, Mention inputs, Preview cards, Toasts, Tooltips, Context menus, Date pickers, Comboboxes, Hotkey inputs); click-to-load, because the renderer is about 20 MB |
| **N** | A real native run in `apps/playground` | `Run it natively: nub run dev:playground → <screen>` | Always, for every implemented component with a playground screen |
| **S** | A real screenshot captured from the GPUix runtime | `Captured from GPUix — <platform>, GPUix <version>, <commit>` | Whenever the playground can capture one |
| **S** (interaction) | A before/after pair or recording of a real gesture | `Recorded in GPUix — <platform>, GPUix <version>, <commit>` | When the capture proves resizing, dragging or another state change a still cannot |
| **V** | Native coverage by an automated suite, with no image | `Native coverage: <suite> drives this component in the real GPUix renderer. Run <command>. No capture is published for this page yet.` | When the component has a real runtime suite but no screenshot or playground screen |
| **A** | A browser approximation of the component's documented layout | `Illustrative approximation — not GPUix. Run it in the playground for real behaviour.` | Only for static layout/typography/spacing; never for an interaction presented as native |
| **X** | Source plus a limitation notice | `Not verified in the GPUix runtime — <reason>` | When no runtime suite exists, or the runtime does not support the behaviour |

`<NativePreview slug>` chooses the highest honest tier from the component's
registry record: a live scene first, then screenshots, then a playground screen,
then native coverage, then unavailable. **A live surface never replaces the
native evidence**: when the record also has a screenshot, screen or suite, that
is rendered beneath it. An approximation is never a fallback — a page author
must choose it, and the only way to render one is through
`<IllustrativeApproximation>`, which always renders the banner.

**Tier L is a real renderer, not the native binary.** It runs the same component
source, the same tokens and the same GPUI layout, and it is the only tier a
reader can interact with without leaving the page. It is not evidence that the
desktop binary, the native window or the published native binding works — that
is tier N/S/V. A live scene is built from the real package code:
`@gpuixui/primitives` (Button) and `@gpuixui/components` (Tabs, Dropdown menu,
Dialog, Popover, Command menu). An interactive scene opens in the state it
documents — a menu, a dialog, a popover or the command palette starts open — so
the surface proves the real composition without a pointer.
`smoke:preview` proves every scene's text reached GPUI's tree in headless Chrome,
that every scene's canvas is sized (a `ready` flag on a 1×1 frame does not
count), that every page's iframe carries the page's own mode, that the Button
scene paints a different frame in light than in dark (and the same frame twice
in dark), and that a `?platform=win32` page passes the platform through to the
renderer. Its output is a canvas, so browser assistive technology cannot read
it: the page's accessibility notes and source remain the accessible description,
and the live surface never stands in for them.

**Tier V is coverage, not a pass.** It names the suite file and the exact
command; the component's status badge (mirrored from `COMPONENTS.md`) is the
only place that says how far verification got. A delivered component with no
suite is a stopped condition (plan 432 §9), never a silent tier X.

## Evidence

- GPUix paints in a native window: "GPUIX paints it with Metal, DirectX, or
  Vulkan. No Electron. No web view." — `references/gpuix/README.md`.
- GPUix has a browser target that renders the same React tree in a browser
  canvas through wasm-bindgen. **Building** it needs nightly Rust and
  `wasm-bindgen-cli`, but `@gpuix/native@0.10.0` **ships the built artefacts**
  (`wasm/gpuix-web.js`, `gpuix-web_bg.wasm`), so the docs can use them without a
  Rust toolchain. Measured on 2026-10-18: the renderer initialises in headless
  Chrome (`Browser graphics initialized successfully with BrowserWebGpu`),
  appends its own full-page canvas, and painted the real Button scene. It needs
  no cross-origin isolation on this path; a **virtual-time** screenshot is black,
  so the check runs in real time over CDP. The 0.10.0 browser entry imports its
  wasm with Bun's `with { type: "file" }`, so the docs build names the two
  artefacts itself (`vite.preview.config.ts`). — plan 455 §2.
- GPUix exposes an automation API whose `screenshot({ path })` "reads the GPU
  surface", and `launch()` can run a window with `GPUIX_BACKGROUND=1` so an
  agent captures evidence without stealing focus. — same README.
- **The window handle is not ready when `render()` returns.** `render()` starts
  asynchronous graphics init, and the DOM canvas appears at the start of that
  init, so neither is a readiness signal. `isInitialized()` reports the app
  handle, which is assigned too early as well. Until the window handle exists,
  any renderer query that goes through `update_web_window` throws `GPUIX web
  window is not ready` (measured from the pinned source and in the dialog scene
  on 2026-10-18). `preview/renderer-ready.ts` polls `getFocusedElementId` — the
  same query the dialog makes — and mounts the scene when it stops throwing; the
  document reports `ready` only after the scene is mounted. — plan 456 §10.

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
properties. `theme-surface.test.ts` proves the mapping is complete, that every
name a preview reads is one the surface defines, and that a theme override
reaches every group; `approximations.test.tsx` proves each preview changes when
the platform theme changes. No preview may contain a colour literal; the test
reads the source and fails on one. The variable-name rule was added after the
shipped previews used kebab-case names (`--preview-color-primary-foreground`)
for the camelCase roles (`primaryForeground`), which CSS resolves to nothing.

Today the shipped platform styles differ in **type families and theme name
only** (`packages/tokens` plan 051). The visible change on a preview is therefore
its monospace text. Real per-platform colours, spacing and control metrics are a
`packages/tokens` task recorded in `TODO.md`; when they land, every preview
inherits them with no docs edit. The site must not invent them.

A live surface (tier L) reads the same two facts — `mode` and `platform` — from
the URL the docs build for it, so the toggle reaches the real renderer too. Its
scene is drawn from the whole active `Theme`, so new platform values need no
docs edit either.

A browser approximation may show the mono family a platform style resolves to,
because a browser can render it. It must not claim to show `.SystemUIFont`: that
sentinel resolves only inside GPUI, so the UI face of a browser approximation is
still an approximation of the docs site, not of the native window. The live
surface (tier L) *does* run GPUI, so `.SystemUIFont` is real there; the label
still says it is the WebAssembly backend, not the desktop window.

Tier A is static only. A preview that needs to prove an interaction belongs in
the playground or a recording, never in a browser approximation that would imply
native behaviour it does not have. A live surface is the exception that proves
the rule: it is not an approximation, it is GPUix.

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
- That the live surface is the native desktop binary. It is GPUix's WebAssembly
  renderer in this tab, with the same component code and layout; native evidence
  stays on the page and the playground is the desktop window.
- That an unverified component works. It is shown as unavailable.
- That native coverage is a capture. Tier V names the suite and the command, and
  says that no image is published.
- That a screenshot proves an interaction. A screenshot is a still frame; the
  playground is the interactive proof.
- That a live scene exists for every component. A record without a `liveScene`
  falls through to its native tier; a missing build says so instead of showing a
  blank frame. **Twenty-one scenes ship today** — Button, Tabs, Dropdown menu,
  Dialog, Confirmation dialog, Popover, Command menu, Icons, Scrollable
  containers, Skeleton, Loading indicators, Drawer, Navigation menu, Mention
  input, Preview card, Toast, Tooltip, Context menu, Date picker, Combobox and
  Hotkey input — chosen because a still cannot prove the point: an open overlay
  and its focus entry, a grouped palette, real SVG markup tinted by the theme,
  wheel scrolling, a pulse, an edge panel, a transient message, or a surface
  only a pointer or a key opens. The Toast scene pushes one toast with an
  infinite duration: a default five-second toast would race the smoke check, and
  an infinite one is the component's documented way to keep a message until it
  is dismissed (`ToastInput.duration`).

## Gestures are proved, not implied

Five scenes document a component that owns its open state and exposes no
`defaultOpen`. They are not opened by a prop: the smoke drives the same gesture a
reader performs through the automation surface the renderer installs
(`globalThis.gpuix` in the preview document), and `smoke:preview` asserts the
scene's text is **absent before** the gesture and **present after** it. A prop
that quietly opened the surface would fail that first assertion, and a broken
gesture fails the second.

| Scene | Gesture the smoke drives | What it proves |
| ----- | ------------------------ | -------------- |
| Tooltips | hover the focusable trigger | the delayed hover path paints the tip |
| Context menus | right-click the row | the pointer point reaches the anchored surface |
| Date pickers | click the field, then a day | the popover opens and a real day can be chosen |
| Comboboxes | click the field | the popup opens over the closed control |
| Hotkey inputs | click the recorder, then a key | a real key event is captured as a chord |

The reader sees the same instruction above the surface, and can perform it in the
browser. One measured limit stays on the Tooltip page: the trigger must be a
focusable **host element** that forwards hover and focus, so the scene wraps a
`div`, not this library's `Button`.

No page is without a live scene. The table this section used to carry is the
same set `apps/docs/src/components/preview/gaps.ts` declares — empty since plan
486 — and `preview-gaps.test.ts` fails when the document and the code disagree.

### The pages without a live scene

None.

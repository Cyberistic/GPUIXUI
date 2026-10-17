# 455 — Live GPUix surface previews (WebAssembly) in the docs site

**Phase:** F (showcase quality) · **Owner:** docs-site · **Status:** implementing
**Depends on:** 410 (site shell), 412 (preview strategy), 420 (platform toggle),
432 (native coverage), 434 (platform-styled previews), 444/445 (preview state)

## 1. Why this plan exists

`MISSION.md` ranks the preview strategies: (1) embed a real GPUix surface if
supported, (2) a companion playground, (3) clearly labelled browser
approximations, (4) source + limitation. D26 picked (2) by default because the
wasm browser target was believed to require a nightly Rust toolchain and a local
build. That is true only of *building* the wasm.

`@gpuix/native@0.10.0` **ships the built browser renderer**: `wasm/gpuix-web.js`
plus a 20 MB `gpuix-web_bg.wasm`, and `browser.mjs` as the browser condition of
its root export. On 2026-10-18 this was measured on this host (evidence in §2),
so strategy (1) is available without a Rust toolchain.

This plan lands one honest live surface — first the Button scene — behind a
click-to-load iframe, and records the rule for every later scene.

## 2. Measured evidence (2026-10-18, this host)

Probe outside the repo: `@gpuix/native@0.10.0/wasm` imported with Vite's
`?url`, `@gpuix/react`'s `render()`, and `@gpuixui/primitives` compiled from
source, loaded in headless Chrome through CDP (**not** virtual time).

| Observation | Result |
| ----------- | ------ |
| `init({ module_or_path: wasmUrl })` | resolves |
| `renderer.isInitialized()` | `true` |
| GPUI graphics | `Browser graphics initialized successfully with BrowserWebGpu` |
| Canvas | appended to `<body>`, sized by CSS (`width/height: 100%`) |
| Painted content | real Button (primary/secondary/destructive) in the light token theme |
| Headless Chrome flags | `--enable-unsafe-swiftshader --enable-unsafe-webgpu` |
| Cross-origin isolation | **not required** (no SharedArrayBuffer use on this path) |
| Virtual-time screenshots | black — the frame is not presented; use real time (CDP) |
| `@gpuix/native` browser entry under Vite | fails: `with { type: "file" }` is a Bun import attribute; the docs build aliases the package root to a two-line shim |

The probe image is not committed (it is a scratch artefact); the reproducible
commands are in §6 and the durable check is §8.

## 3. The contract

**Tier L — live GPUix surface.** A real GPUix renderer (WebAssembly + WebGPU)
running the library's real component code in the reader's browser tab. It is
**not** the native desktop window: the GPUix binary and the desktop window remain
the playground's job. The label must say exactly that.

Rules:

- a record opts in with one `liveScene` value; a scene runs in its own isolated
  document (`/gpuix-preview/`), never inside the docs React tree;
- the surface is **click-to-load** and states the download (~20 MB) before it
  starts; no preview page may download the renderer unprompted;
- the iframe URL carries `scene`, `platform` and `mode`, so the docs platform
  toggle and dark mode reach the live surface (the same rule as plans 434/445);
- a live surface never replaces native evidence: when the record also has a
  screenshot, playground screen or runtime suite, the page shows that beneath the
  live surface and labels it;
- a missing or failed bundle degrades to a labelled notice naming the reason and
  the playground — never to a blank frame.

## 4. Files

Create:

| File | Purpose |
| ---- | ------- |
| `apps/docs/preview/index.html` | the isolated document: canvas chrome CSS, module entry |
| `apps/docs/preview/main.tsx` | decodes the query, picks the scene, mounts `render()` |
| `apps/docs/preview/scenes.ts` | the scene keys (`LIVE_SCENES`) — no JSX, importable by tests |
| `apps/docs/preview/scenes.tsx` | key → React element, themed from tokens |
| `apps/docs/preview/gpuix-web.ts` | the wasm shim (Vite `?url` instead of Bun import attributes) |
| `apps/docs/preview/tsconfig.json` | `jsxImportSource: "@gpuix/react"`, strict, no emit |
| `apps/docs/vite.preview.config.ts` | the isolated build: root `preview/`, out `public/gpuix-preview/` |
| `apps/docs/scripts/build-preview.ts` | runs that build, prints the emitted sizes |
| `apps/docs/src/components/preview/live-surface.tsx` | click-to-load iframe + labels |
| `apps/docs/src/components/preview/live-surface.test.tsx` | URL, labels, opt-in semantics |
| `apps/docs/scripts/smoke-live-preview.ts` | CDP check of the built surface (real time) |

Change:

| File | Change |
| ---- | ------ |
| `apps/docs/package.json` | `build:preview`, `build`/`dev` run it; `smoke:preview`; devDeps `@gpuix/native`, `@gpuix/react`, `@gpuixui/primitives` |
| `apps/docs/.gitignore` | ignore `public/gpuix-preview/` |
| `apps/docs/tsconfig.json` | exclude `preview/` (it has its own project); `check-types` runs both |
| `apps/docs/src/component-meta/schema.ts` | `liveScene: OptionFromNullOr(String)` |
| `apps/docs/src/component-meta/entries.ts` | default `liveScene: null` |
| `apps/docs/src/component-meta/registry.test.ts` | a scene must be a key `LIVE_SCENES` exports |
| `apps/docs/src/component-meta/registry.ts` | the Buttons record sets `liveScene: "button"` |
| `apps/docs/src/components/preview/select-preview.ts` | live is the first tier; native evidence is its own function |
| `apps/docs/src/components/preview/native-preview.tsx` | renders the live surface, then native evidence |
| `apps/docs/src/components/preview/preview.test.tsx` | the tier and label rules; drop the old Button assertion |
| `docs/preview-strategy.md` | tier L, the evidence, and what it does not prove |
| `PLAN.md` | D29: live wasm previews are tier L, opt-in, not native evidence |
| `TODO.md` | tick, and record the scene backlog |
| `.agents/slop/plans/README.md` | index this plan |

## 5. Implementation order

1. **The isolated build.** `preview/` + `vite.preview.config.ts` +
   `build-preview.ts`. It must import `@gpuixui/primitives` source and emit a
   working `public/gpuix-preview/index.html`. STOP if the build cannot resolve a
   workspace package, or if the wasm is not emitted as an asset.
2. **The surface.** `gpuix-web.ts`, `main.tsx`, `scenes.ts{x}`. STOP if the
   scene cannot render without a default theme or the app throws
   `MissingThemeProviderError`.
3. **The docs component.** `live-surface.tsx` reads the platform/mode snapshot,
   builds the URL, loads on click, shows the error notice on
   `data-gpuix="failed"`.
4. **The registry.** Schema field, default, Button record, selector, page
   rendering; update the tests.
5. **The guards.** `smoke-live-preview.ts` starts the docs preview server and
   asserts the built surface reaches `data-gpuix="ready"`, has a canvas of the
   iframe's size, and paints non-background pixels. Two-direction proof: remove
   the scene from `scenes.tsx` and the check exits `1`.
6. **Docs.** Preview strategy, PLAN decision, TODO.

## 6. Commands and expected results

```sh
# build the isolated surface
nub run --filter docs build:preview
# expect: public/gpuix-preview/index.html, assets/*.js and a ~20 MB *.wasm

# type-check the preview project and the app
nub run --filter docs check-types

# the docs suite
nub run --filter docs test

# the real browser check (real time; NOT --virtual-time-budget)
nub run --filter docs smoke:preview
# expect: exit 0, "live preview ready" and the painted-pixel verdict

# the whole docs gate
nub run --filter docs build
nub run check && nub run lint && nub run test
```

A probe of the same surface by hand (evidence in §2):

```sh
nub scripts/screenshot.mjs "http://127.0.0.1:<port>/gpuix-preview/?scene=button" out.png 8000
```

## 7. STOP conditions

- The wasm asset is not emitted, or the preview bundle imports Node built-ins.
- `render()` throws in the browser, or `data-gpuix` never reaches `ready`.
- The scene needs `@gpuixui/components` (Tier 2) and that package fails to
  compile for the browser — then ship Button only and record the failure; do not
  stub a component.
- Headless Chrome cannot present a frame in **real time** on this host. Then keep
  the surface behind the opt-in but mark the tier unverified in `TODO.md` with
  the measured reason; do not ship a claim the guard cannot prove.
- The build balloons the committed tree: `public/gpuix-preview/` must stay
  gitignored; if it cannot, stop and report.

## 8. Test plan

| Test | Guards | Fails when |
| ---- | ------ | ---------- |
| `live-surface.test.tsx` (URL) | the iframe carries scene, platform and mode | any parameter is dropped |
| `live-surface.test.tsx` (labels) | the not-native and 20 MB notices render before loading | the label is removed or the surface auto-loads |
| `preview.test.tsx` (tier L) | a `liveScene` record selects tier L and still shows native evidence | live is ignored, or evidence is dropped |
| `registry.test.ts` (scene) | every `liveScene` is an exported `LIVE_SCENES` key | a typo'd or unbuilt scene ships |
| `smoke-live-preview.ts` | the built surface renders in headless Chrome | the scene, the wasm or the mount is broken (exit `1`) |

The smoke check is **not** part of `nub run test` (it needs Chrome and a 20 MB
build); it is part of the docs release gate beside `smoke:browser`.

## 9. Acceptance

- The Buttons page shows a live GPUix surface behind a labelled click-to-load
  control, and the surface renders the real Button variants in the active docs
  mode and platform style.
- The native evidence (tier V suite) is still on the page.
- `nub run --filter docs smoke:preview` exits `0`, and exits `1` when the scene
  registry is emptied.
- No 20 MB artefact is committed; a checkout without `build:preview` shows the
  labelled "not built" notice, never a broken frame.
- `nub run check`, `nub run lint`, `nub run test` stay green.

## 10. Result (implemented 2026-10-18)

Landed as designed, with two corrections found while building:

1. **`sideEffects: false` elides a module-level `await init(...)`.** The first
   shim awaited initialisation at module scope; the bundler kept the class
   re-export and dropped the call, so `wasm.gpuixrenderer_new` was undefined at
   construction. Initialisation is now an explicit `initGpuixWeb()` the entry
   awaits before `render()`.
2. **The published browser entry is Bun-only.** It imports the wasm with
   `with { type: "file" }`; Vite does not implement that attribute for this use.
   `vite.preview.config.ts` names the two wasm-bindgen artefacts with a small
   resolver plugin, and `preview/gpuix-web.ts` loads them through `?url`. The
   package's own subpath exports (`/host`, `/runtime`, `/automation`) still
   resolve normally.
3. The preview build needs `base: "/gpuix-preview/"`; without it the emitted
   HTML asked for `/assets/*.js`, which the site serves as a 404 (measured).

Measured:

- `nub run --filter docs build:preview` → `public/gpuix-preview/` with a 19.1 MB
  wasm asset; the 20 MB claim in the label is the published artefact.
- `nub run --filter docs smoke:preview` → exit `0`:
  `live surface ready — 300x150 canvas, 11 text nodes`, then
  `unknown scene reported — No live scene is named "not-a-scene".` The text
  includes `Save changes`, `Cancel`, `Duplicate`, `Skip`, `Delete` and the size
  row — the real `@gpuixui/primitives` `Button`.
- `nub run --filter docs test` → 244 tests pass (up from 235): tier L selection,
  the live/native composition, the URL builder, the label and the "no iframe
  before a click" rule, and the registry's scene-key guard.
- `nub run --filter docs smoke:build` → the 68-page crawl still passes.
- A real-time CDP screenshot (not `--virtual-time-budget`) shows the painted
  surface in dark mode with the Windows platform style.

Still open, deliberately: one scene only (Button). The TODO row lists the
interaction records as the next scenes; each needs a real composition, not a
sampler.

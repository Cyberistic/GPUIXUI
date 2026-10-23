# 440 — A live GPUix surface in the docs site (strategy 1)

| Field | Value |
| ----- | ----- |
| Status | **implemented** — `/live` mounts the wasm browser build and paints a real frame; measured by two probes (below). One piece is owed: the React reconciler mount, so the route drives the batch protocol by hand |
| Phase | F (docs polish) → feeds the preview policy in `docs/preview-strategy.md` |
| Owner | `docs-site` |
| Depends on | the 0.11.0 browser build (`@gpuix/native`'s `browser` export), the docs site's deploy middleware, plan `203` (capability record) |
| Feeds | `docs/preview-strategy.md` §The paint is measured/§The live surface, `TODO.md` → Docs information architecture, `apps/docs/scripts/live-surface-probe.ts` |

## 1. The finding this plan builds on

`MISSION.md` names four preview strategies and asks for the strongest honest
one. Strategy 1 — *embed a real GPUix surface* — was ruled out while the site
was built, because `@gpuix/react` opens a native window through the `.node`
binding. **That is no longer the whole story.** `@gpuix/native@0.11.0` ships a
second target:

- `package.json` → `"browser": "./browser.mjs"`;
- `browser.mjs` imports `wasm/gpuix-web.js` and `wasm/gpuix-web_bg.wasm`
  (`with { type: "file" }`) and exports `GpuixRenderer`;
- the wasm is **19.2 MiB** and is not the headless test renderer: its strings
  include the canvas, `getContext`, WebGPU and WebGL2 paths, so it is GPUI's
  browser platform;
- `gpui_web`'s own contract (read at the pinned release's source, and restated by
  the upstream `scripts/web.ts` header) is **one document-owned canvas appended
  to `<body>`, one top-level window, no reopen**;
- the glue instantiates
  `new WebAssembly.Memory({ initial: 88, maximum: 16384, shared: true })`, so
  the document must be **cross-origin isolated** (`COOP: same-origin`,
  `COEP: require-corp`) or `SharedArrayBuffer` does not exist and the module
  never starts.

Evidence in the tree today: `apps/docs/src/lib/gpuix-web.test.ts` reads the
installed package, holds those four facts, and keeps
`docs/preview-strategy.md`'s status line true in both directions.

### 1.1 The paint is measured (measured 2026-10-22)

The plan's riskiest unknown — *does a real GPUix frame paint in a browser at
all?* — is settled. `apps/docs/scripts/live-surface-probe.ts` serves a
cross-origin-isolated page, boots `wasm/gpuix-web.js` against the published wasm,
applies one batch, captures the frame over the DevTools protocol and reads the
pixel back out of the PNG. On this host, `@gpuix/native@0.11.0`, macOS 15.8.1
x86_64, headless Google Chrome 155.0.8059.80 over SwiftShader:

- `crossOriginIsolated` is true under `COOP: same-origin` + `COEP: require-corp`,
  `SharedArrayBuffer` exists, WebGL2 is available and
  `navigator.gpu.requestAdapter()` returns an adapter (SwiftShader, `gcn-4`).
- One batch paints: a 420×200 root at `#7C5CFF` with a `text` child renders, and
  the sampled pixel is exactly `#7c5cff`; the same page filled `#31A05F` samples
  `#31a05f`. The text reaches `getAllText()`.
- Three constraints the plan now knows:
  1. `browser.mjs`'s `import … with { type: "file" }` is a **bundler** convention;
     the glue must be initialised directly (or a Vite rule must reproduce it).
  2. `getPaintedText()` returned `[]` on a frame that visibly painted — a paint
     claim reads pixels, not that report.
  3. `--screenshot` and `--virtual-time-budget` capture **before** the renderer's
     first frame (measured: white 800×600). The probe drives Chrome over
     DevTools and captures after the page reports itself.

Negative control measured: dropping `setRoot` from the batch leaves a black
frame, and the probe fails by name
(`the frame painted #000000 at 210,100, not #7C5CFF`, exit `1`).

**The site mounts it.** This plan's steps, the route they produced and the
measurement that proves it are in §6; §2 is the shape the route was built to.
The two paragraphs below are the spike's premise, kept because they are the
reason the route is a whole page and cross-origin isolated.

## 2. What ships, if the spike passes

One route, `/live`, that is a **whole-page** GPUix surface:

- the route owns the document (the wasm appends its canvas to `<body>`; the
  docs chrome must not be behind it);
- it mounts the real library — the same `@gpuixui/primitives` components the
  package ships — through `@gpuix/react`'s reconciler, with the wasm
  `GpuixRenderer` injected as the renderer;
- it is labelled **"GPUix web build (WebGPU) — the real renderer in a browser,
  not the native macOS runtime"**, and never reuses the
  `<ComponentPreview>` approximation note;
- it degrades to plain text when the browser has neither WebGPU nor WebGL2, and
  says "reload to remount" when `init()` reports "GPUIX web is already running".

It is **not** a per-component preview: the platform cannot host two surfaces, so
a component page keeps its labelled reproduction and gains a link to `/live`.

## 3. Steps

### Step 1 — make the package resolvable from the docs app

Change `apps/docs/package.json`:

```json
"dependencies": {
  "@gpuix/native": "catalog:",
  "@gpuix/react": "catalog:",
  "@gpuixui/primitives": "workspace:*",
  "@gpuixui/tokens": "workspace:*",
  …
}
```

Run `nub install`. Expected: `apps/docs/node_modules/@gpuix/native/browser.mjs`
and `apps/docs/node_modules/@gpuix/native/wasm/gpuix-web_bg.wasm` exist.

**STOP** if `nub.lock` has an uncommitted change from another workstream: the
index is shared, and a lockfile merge is not this plan's to resolve. Wait for a
clean lockfile, then re-run.

**STOP** if the docs build starts resolving `@gpuix/native`'s `.node` main entry
under the server build. The browser build must come from the `browser`
condition; if Vite's SSR pass tries the binding, alias the package to
`browser.mjs` **only in the client environment** (`resolve.conditions` /
`ssr.noExternal` must not apply it to the Worker).

### Step 2 — serve the document cross-origin isolated

- Dev: `apps/docs/vite.config.ts` → `server.headers` with
  `"Cross-Origin-Opener-Policy": "same-origin"` and
  `"Cross-Origin-Embedder-Policy": "require-corp"`.
- Prod: `apps/docs/src/start.ts` → `withCacheHeaders` gains the same pair **for
  `/live` only**, so the rest of the site is not isolation-locked.

Expected: `curl -I http://localhost:4175/live | grep -i cross-origin` prints both
headers; `/docs` prints neither.

**STOP** if `require-corp` blocks a subresource the route needs. Everything the
document loads must be same-origin (the site already self-hosts its fonts and
assets); if a third party is unavoidable, the route needs `crossorigin` +
CORP headers on that resource, and if it cannot be served, the spike fails.

### Step 3 — mount the renderer, once

Create `apps/docs/src/components/docs/live-surface.tsx` (client-only; no SSR
import of the wasm):

```ts
// Sketch — the executor confirms exact names before writing.
const renderer = new GpuixRenderer(handleEvent);
renderer.init({});
render(<App />, { renderer });
```

Rules the executor must keep:

- the `import("@gpuix/native")` happens inside an effect, never at module scope,
  so the Worker bundle never evaluates the wasm;
- one mount per page load; store it on a module-level flag and never construct a
  second `GpuixRenderer` (the platform throws `GPUIX web is already running`);
- do not call `init()` again after an unmount — the only remount is a reload;
- if `render()` cannot drive the web renderer (the reconciler may take the
  native path), **STOP** and report with the error. Do not fake a surface with a
  batch of hand-written mutations unless §3a proves the paint.

### Step 3a — if `render()` cannot be injected

Fall back to the recorded mutation protocol: `renderer.applyBatch(json)` with
the closed operation set (`createElement`, `appendChild`, `insertBefore`,
`setStyle`, `setText`, `setEventListener`, `setRoot`, `setCustomProp`,
`destroyElement`). Build the smallest screen that proves the surface —
one `div` with `backgroundColor`, one `text` with content, `setRoot` — and only
then wire a component. **STOP** if a `StyleDesc` the primitives compile cannot be
reproduced by hand for the demo; report which field is missing rather than
drawing a DOM imitation.

### Step 4 — fallback and label

- `navigator.gpu` absent **and** no `webgl2` context available →
  render `<p>This browser has no WebGPU or WebGL2, so the GPUix surface cannot
  start.</p>` (no blank canvas, no spinner that never settles).
- Label above/around the surface:
  `GPUix web build (WebGPU) — the real renderer in a browser, not the native macOS runtime.`
- A visible "Back to the docs" link is **not possible inside the canvas**;
  provide it before `init()` paints or accept that leaving is a reload. Decide
  and record which in the plan's outcome.

### Step 5 — prove it, and record the proof

1. `nub run --filter @gpuixui/docs build` → green.
2. `nub run --filter @gpuixui/docs dev`, open `http://localhost:4175/live` in a
   browser with WebGPU (Chrome ≥ 113) → the surface paints.
3. Capture a screenshot to `.artifacts/live/docs-live-surface.png` and record the
   browser, version, backend (WebGPU or WebGL2) and the paint you saw in
   `apps/docs/README.md` §The live surface.
4. Press a control in the surface and confirm a real event reaches React.

The *capability* half of this step is done: `nub apps/docs/scripts/live-surface-probe.ts`
does 2–3 headlessly and fails if the frame does not carry the batch's fill
(§1.1). The route still owes 2–4 **through `/live`**, including the event check.

**STOP** if no browser with a backend is available on this host. **Not a STOP
any more** — measured: this host's headless Chrome has WebGL2 and a WebGPU
adapter under isolation.

### Step 6 — guards

Extend `apps/docs/src/lib/gpuix-web.test.ts`:

- the docs app declares the package it imports;
- `/live` sets both headers in dev and in production, and `/docs` sets neither;
- exactly one `new GpuixRenderer` and one `.init(` call site under `src/`;
- the fallback sentence exists;
- the policy no longer says the surface is unmounted **only** when the route
  exists (this is the both-directions case the file already has).

Add `apps/docs/src/routes/live.test.ts` only if the route has logic that can be
tested without a browser (the fallback decision, the label); never assert a
paint from Node.

## 4. STOP conditions (summary)

1. Lockfile contention with another workstream. — **live**: `nub.lock` carries
   another workstream's uncommitted importer entry, so Step 1 waits for it.
2. SSR resolves the `.node` binding, or the wasm cannot be isolated to the
   client build.
3. `require-corp` breaks the route's own assets.
4. `render()` cannot be injected and §3a cannot paint a real `StyleDesc`.
   — **retired for the batch path**: §1.1 paints a real `StyleDesc` through
   `applyBatch`; injection is still open.
5. No browser with WebGPU/WebGL2 on the host. — **retired**: measured on this
   host (headless Chrome, both backends, isolated).
6. The wasm grows past 25 MiB (mobile budget) — re-decide before shipping.

## 5. Acceptance

- `/live` paints a real GPUix surface in a browser, with a captured screenshot
  and the browser/backend recorded.
- The label states exactly what the surface is and is not.
- The fallback renders text, not an empty canvas.
- One mount per page load; the second `init()` path cannot be reached.
- `/docs` stays non-isolated and keeps its labelled reproductions.
- The guards in §3 Step 6 fail when the route, the headers, the single-mount
  rule or the label is removed.
- `docs/preview-strategy.md` and `TODO.md` record the outcome honestly, with the
  evidence path.

## 6. Outcome (landed)

Every step below is in the tree; `src/lib/gpuix-web.test.ts` holds the status
line, the mount and the policy together, and the two probes are the evidence.

| Step | What shipped | Where |
| ---- | ------------ | ----- |
| 1 | the docs app declares `@gpuix/native`/`@gpuix/react` from the catalogue | `apps/docs/package.json`, guarded by `gpuix-web.test.ts` |
| 2 | `COOP: same-origin` + `COEP: require-corp` for `/live` only, dev and production | `apps/docs/vite.config.ts`, `apps/docs/src/start.ts` |
| 3/3a | the route boots `GpuixRenderer` inside an effect and drives the batch protocol (the reconciler is §3's recorded `render()` gap) | `apps/docs/src/routes/live.tsx`, `apps/docs/src/components/docs/live-surface.tsx`, `apps/docs/src/lib/live-batch.ts` |
| 4 | the label, the no-backend sentence and the "reload to mount it again" path | `live-surface.tsx` |
| 5 | both probes, run against real frames | `scripts/live-surface-probe.ts`, `scripts/live-route-probe.ts`, `scripts/live-frame.ts` |
| 6 | the guard (dependency, one importer, isolation, fallback, policy status) | `src/lib/gpuix-web.test.ts` |

Measured 2026-10-22, macOS 15.8.1 x86_64, headless Chrome 155.0.8059.80 over
SwiftShader: the batch sample painted `#7c5cff`; the route's button sampled
`#a7a9ff`, its banner `#1e222a` at rest and `#0e5135` after a press through
`renderer.simulateClick`, with the status reading "Pressed 1 time". The policy
(`docs/preview-strategy.md` §The live surface) and `apps/docs/README.md` §The live
surface carry the same numbers, and `gpuix-web.test.ts` derives the three colours
from `themes.dark` so a palette move updates the claim.

**Still owed:** `render(<App />, { renderer })`. `@gpuix/react` pulls
`@gpuix/native/runtime` and `@gpuix/native/automation` at module scope and nothing
has measured whether that graph bundles for the browser, so the route uses the
same operations resolved by the same library styles rather than the reconciler.
That is the next step, not a missing route.

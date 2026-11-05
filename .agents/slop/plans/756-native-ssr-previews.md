# 756 — Native previews rendered at build time (SSR through the wasm renderer)

| Field | Value |
| ----- | ----- |
| Status | **implemented** — `/live?scene=example` mounts a registered example; `native:previews` captured 92 frames; the Native tab and the index poster read them |
| Phase | F (docs polish) |
| Owner | `ssr` workstream |
| Depends on | plan `440` (the wasm browser build mounts and paints), `packages/components/examples`, `packages/data/examples`, `apps/docs/scripts/chrome-session.ts` |
| Feeds | `docs/preview-strategy.md`, `apps/docs/README.md`, `.agents/slop/TODO.md` |

## 1. What the spike asks

The docs site is a browser app; the library renders through GPUix. Today every
component page draws a **DOM reproduction** and labels it an approximation.
`/live` proves the real renderer can paint in the browser through
`@gpuix/native`'s 19.2 MiB wasm build, but it mounts one hand-written scene and
the platform allows one surface per document.

The components already have a native example registry — one mountable screen per
component in `packages/components/examples` and `packages/data/examples`. The
missing piece is rendering those screens **without a native binding**, on any
machine with Chrome, and keeping the resulting frame as a static asset the docs
can serve as its server-rendered mark-up.

That is the "SSR" here: the library is rendered at **build time** through the
wasm renderer in headless Chrome, and the docs serve the real frame as an image
before any client JavaScript runs. It is not React server rendering of the
native tree; the runtime has no server host. The output is honest: the pixels
are the library's own.

## 2. What ships

1. **`/live` learns a registered example.** `?scene=example&id=<id>` mounts the
   `id` from the native example registry through the wasm renderer, inside
   `ThemeProvider`, at the window's own size. The page reports
   `status=painting`, `scene=example`, `id=…`, `platform=…`, `mode=…` and the
   retained tree's text. An unknown id reports `status=failed` by name.
2. **A build-time capture tool.** `apps/docs/scripts/native-previews.ts` drives
   headless Chrome (the same driver the live probes use), opens the isolated
   `/live` route once per example, waits for the paint report, captures a
   `960×720` WebP, and rejects a frame that has not painted (a flat frame has
   fewer than two distinct colours on a 5×5 sample grid). Captures land in
   `apps/docs/src/assets/native/<id>.webp` and are checked in.
3. **A registry of the captures.** `apps/docs/src/lib/native-captures.ts`
   resolves `id → asset URL` with an eager `import.meta.glob`, and builds the
   `/live?scene=example&id=…` href with the reader's platform and mode.
4. **A Native tab on component pages.** `ComponentPreview` gains a third tab
   only when the page's last URL segment names a captured example. It shows the
   real frame, a caption stating it was captured from the wasm renderer, and a
   link to open the same scene live. The existing interactive Preview/Code tabs
   do not change.
5. **An SSR poster for the component index.** Before hydration each tile with a
   capture renders that image (lazy). After hydration the tile mounts its
   interactive demo exactly as today. The server mark-up is therefore a real
   native frame, not an empty box.

## 3. Files

| File | Change |
| ---- | ------ |
| `apps/docs/src/lib/live-example.tsx` | new — the GPUix JSX stage that centres a registered example in a themed window |
| `apps/docs/src/components/docs/live-surface.tsx` | `scene=example` branch; `modeFromSearch` for the palette; report id and mode |
| `apps/docs/src/lib/live-frame.ts` | `distinctFills(png, grid)` over the existing PNG reader |
| `apps/docs/scripts/native-previews.ts` | new — the capture run |
| `apps/docs/src/lib/native-captures.ts` | new — asset lookup + live href |
| `apps/docs/src/components/docs/component-preview.tsx` | the Native tab |
| `apps/docs/src/components/docs/component-index.tsx` | the poster before hydration |
| `apps/docs/src/assets/native/*.webp` | generated, checked in |
| `apps/docs/package.json` | `native:previews` script |
| `docs/preview-strategy.md`, `apps/docs/README.md` | the policy and the ledger |

## 4. Steps and commands

```sh
# 1. The route paints a registered example (dev server).
nub run dev:docs
# open http://localhost:4175/live?scene=example&id=accordion

# 2. Capture every example; iterate on one while building.
nub run --filter @gpuixui/docs native:previews
nub run --filter @gpuixui/docs native:previews -- --only accordion --url http://localhost:4175

# 3. Guards and gates.
nub run --filter @gpuixui/docs test
nub run --filter @gpuixui/docs check-types
nub run --filter @gpuixui/docs build
```

Expected: step 1 prints the accordion's text in the page report and the canvas
paints the real card; step 2 writes one non-flat WebP per id and exits `0`; step
3 is green.

## 5. Tests (each must be able to fail)

- `src/lib/native-captures.test.ts`
  - every captured id exists in one of the native example registries (a stale
    capture fails by id);
  - `nativeExampleHref` carries the id, platform and mode (a dropped parameter
    fails);
  - a captured id resolves to a URL and an unknown id to `undefined`.
- `src/lib/live-frame.test.ts` extended
  - `distinctFills` reports one colour for a solid PNG and more than one for the
    two-fill frame (a decoder that always says "painted" fails the flat case).
- `src/lib/live-surface.test.ts` extended
  - the `scene=example` branch reads `id`, refuses an unknown id by name, and
    renders through the same single `createRoot`/`init` path;
  - the mode comes from `?mode=`/`?appearance=`, not a literal `dark`.
- `src/components/docs/component-index.test.tsx` extended
  - a tile with a capture renders an `<img>` with the capture URL when
    `previews` is false, and its demo when `previews` is true.

## 6. STOP conditions

1. The wasm renderer cannot mount a registered example inside `ThemeProvider`
   (a missing host style or a reconciler rejection). Record the error; do not
   fall back to a DOM drawing labelled native.
2. A captured frame is flat (blank canvas) at `960×720`; the capture run must
   fail the example by id rather than write it.
3. The checked-in captures exceed **6 MiB** total; lower the quality or the
   viewport before shipping.
4. The one-surface rule blocks navigating the same tab between examples; open a
   fresh document per capture (the platform allows one surface per document,
   not one per browser).

## 7. Acceptance

- `/live?scene=example&id=<captured id>` paints the registered example in the
  wasm renderer and reports its own id.
- One checked-in WebP per captured example, each verified non-flat.
- A component page whose id is captured shows a **Native** tab with the real
  frame, a caption, and a working link to the live scene.
- The component index's server mark-up carries the real frame for captured
  tiles; hydration still mounts the interactive demo.
- The guards above fail by name in both directions.
- `docs/preview-strategy.md` records the mechanism and its limits honestly:
  a build-time wasm frame, one palette/platform per capture, not the native
  macOS runtime.

## 8. Outcome (landed 2026-11-06)

The spike passed. On this host (macOS, headless Chrome over SwiftShader):

- `/live?scene=example&id=accordion` painted the real accordion through the wasm
  build and reported its id, platform and mode. `/live?scene=examples` exposed
  `__gpuixCapture.render(id)`, so **one** wasm initialisation produced all 92
  frames (~13 s for the boot plus under a second per example, against ~24 s per
  document when each example reloaded the module).
- `nub run --filter @gpuixui/docs native:previews` wrote 92 WebPs (657 KiB) from
  the components and data example registries; every frame passed the
  distinct-colour check. Two defects were measured and fixed on the way:
  a 5×5 sample grid called a real toolbar flat (it sampled between the controls),
  and centering the example in the stage clipped tall screens (the stage now
  flows from the top).
- `ComponentPreview` renders a **Native** tab on pages whose last URL segment has
  a capture (the accordion page verified: image `960×633`, caption naming macOS
  and dark, link to `/live?scene=example&id=accordion`).
- `/components` prerenders with `data-preview="native"` images for 81 tiles and
  mounts the interactive demos after hydration.
- Guards: `src/lib/native-captures.test.ts` (5 cases) holds captures to the
  example directories, the href and the path→id rule; `src/lib/live-frame.test.ts`
  gained three cases for the flat-frame check; `component-index.test.tsx` holds
  the server frame and the hydrated demo.

Limits, stated on the page: a frame is one platform and one palette; it does not
repaint with the switch, and it is not the native macOS runtime. The live scene
is the interactive path.

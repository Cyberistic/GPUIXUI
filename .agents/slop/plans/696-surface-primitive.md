# 696 — `Surface`: the raster render primitive and the adapter contract

| Field | Value |
| ----- | ----- |
| Status | planned |
| Phase | E (specialised foundations) |
| Owner | primitives |
| Depends on | `020`, `030`, `074`, `079`, `090`, `097`, `203`, `352`, `437` |
| Feeds | `packages/data-grid` / charts, media frames, `packages/editor` (later) |

This plan implements **Slice 1** of plan `437` §6 in `packages/primitives`: the
surface adapter contract, the one raster adapter that exists against published
GPUix `0.10.0`, and the thin `Surface` component that drives the adapter
lifecycle. It does **not** implement a native child view: plan `437` §1 proves
the published binding has no foreign-view seam, so a WebKit/AVPlayer/PTY
adapter remains a runtime ask. The raster path is real, it ships, and its
limitations are stated.

Read plan `437` §1–§2 and `docs/gpuix-capabilities.md` before starting.

---

## 1. Measured facts this plan relies on

Measured on this worktree, 2026-10-20, against the store's release-tag
`@gpuix/native@0.10.0` binding and `@gpuix/react@0.10.0`:

1. `@gpuix/react` maps an intrinsic `<img>` to the GPUI `img` host, and
   `ImgInstance` exposes `setImagePixels(width, height, pixels)` and
   `setImage(bytes)` (`dist/types/host.d.ts`, `dist/reconciler/host-config.js`).
2. A bare `<img testId="probe" style={{ width: 40, height: 30 }}>` mounts with
   painted bounds `40 × 30`; calling `ref.current.setImagePixels(2, 2, …)` in a
   mount effect does not throw. Probe deleted after the measurement.
3. **There is no `onLayout`** and no element-size callback in 0.10.0, so the
   adapter bounds are authored from the component's `width`/`height` props, not
   read back.
4. **There is no scale factor** on the renderer or `getWindowSize()` in
   `@gpuix/native@0.10.0` (the a11y dump reports one, but no public renderer
   call does). The contract therefore carries no scale factor; a future
   runtime that exposes one adds it without breaking the adapter shape.
5. `useGpuix()` returns `{ renderer: NativeRenderer | null }`; the component can
   pass the renderer to an adapter without importing the reconciler internals.

**STOP** if any of 1–2 changes: re-measure and revise this plan before writing
code. **STOP** if a required package is missing (run `nub install` and retry
once; do not hand-edit the store).

---

## 2. Scope

### In

- `Surface` — a public leaf component: `<Surface adapter={…} width={320}
  height={180} label="Revenue" />`.
- `SurfaceAdapter`, `SurfaceHost`, `SurfaceBounds`, `SurfaceError` — the typed
  contract.
- `rasterSurface(options)` — an adapter that paints an RGBA frame through
  `setImagePixels`.
- Tests: offline contract + raster tests, and a native lifecycle suite.
- Docs page, mounted example, inventory row, package README mention.

### Out (record, do not implement)

- A native-view adapter (webview, AVPlayer, PTY): no runtime seam.
- Scale factor, device-pixel ratio, occlusion callbacks: no runtime signal.
- Input routing into an adapter: the raster surface is not interactive.
- A paint loop / requestAnimationFrame scheduler: the caller repaints by
  changing a `revision` prop (documented); a loop belongs to the consumer.
- A `SurfaceAdapterRegistry` layer: no second consumer yet. The component takes
  its adapter directly; record the deviation in §7.

---

## 3. Exact files

### Create

| Path | What |
| ---- | ---- |
| `packages/primitives/src/surface/adapter.ts` | `SurfaceBounds`, `SurfaceHost`, `SurfaceOperation`, `SurfaceError`, `SurfaceAdapter`, `surfaceError` |
| `packages/primitives/src/surface/raster.ts` | `RasterFrame`, `RasterSurfaceOptions`, `rasterSurface` |
| `packages/primitives/src/components/Surface.tsx` | `SurfaceProps`, `renderSurface`, `Surface` (the lifecycle hook lives here, module-local; the contract suite reads component props from `src/components`) |
| `packages/primitives/src/surface/index.ts` | the module's public exports |
| `packages/primitives/src/surface/adapter.test.ts` | contract + error tests |
| `packages/primitives/src/surface/raster.test.ts` | raster validation/paint tests |
| `packages/primitives/runtime/surface.runtime.test.tsx` | the native lifecycle + raster paint suite |
| `packages/primitives/docs/surface.mdx` | the page (required sections; see §6) |
| `packages/primitives/examples/surface.example.tsx` | a mounted raster example |
| `.agents/slop/plans/696-surface-primitive.md` | this plan |

### Change

| Path | Change |
| ---- | ------ |
| `packages/primitives/src/index.ts` | `export * from "./surface/index.js";` |
| `packages/primitives/examples/index.ts` | import + register `surface` |
| `packages/primitives/docs/README.md` | add the `surface.mdx` link |
| `packages/primitives/src/contract.test.ts` | add the `Surface` part row |
| `packages/primitives/src/exports.test.ts` | add `Surface` to `PAGES`; `SurfaceError` to `NOT_COMPONENTS` |
| `packages/primitives/src/inventory-status.test.ts` | the docs-site gap list gains `Surface`; rename "six" to "seven" in the comment/message |
| `packages/primitives/runtime/theme-matrix.runtime.test.tsx` | add a `Surface` case (`paints: false`) and `SurfaceError` to the non-component list |
| `packages/primitives/src/components/style-order.test.tsx` | add a `Surface` guard through `renderSurface` |
| `COMPONENTS.md` | one row under a new `## Foundations` table (not the Tier 1 table) and the preamble's docs-site gap list |
| `TODO.md` | a primitives row for this plan; add `Surface` to the docs-site gap list |
| `.agents/slop/plans/README.md` | index this plan under the primitives block |

Do **not** edit `apps/docs` (docs-site workstream), `packages/tw`, or `packages/tokens`.

---

## 4. The contract

`src/surface/adapter.ts`:

```ts
export interface SurfaceBounds {
  readonly width: number;
  readonly height: number;
}

export interface SurfaceHost {
  readonly elementId: number;
  readonly renderer: NativeRenderer;
  readonly setPixels: (width: number, height: number, pixels: Uint8Array) => void;
}

export type SurfaceOperation =
  | "create" | "resize" | "focus" | "setVisible" | "setTheme" | "destroy";

export class SurfaceError extends Schema.TaggedError<SurfaceError>()(
  "SurfaceError",
  {
    operation: SurfaceOperationSchema,
    message: Schema.String,
  },
  { description: "A surface adapter operation failed." }
) {}

export interface SurfaceAdapter {
  readonly kind: string;
  readonly create: (host: SurfaceHost) => Effect.Effect<void, SurfaceError>;
  readonly resize: (bounds: SurfaceBounds) => Effect.Effect<void, SurfaceError>;
  readonly focus: () => Effect.Effect<void, SurfaceError>;
  readonly setVisible: (visible: boolean) => Effect.Effect<void, SurfaceError>;
  readonly setTheme: (mode: ThemeMode) => Effect.Effect<void, SurfaceError>;
  readonly destroy: () => Effect.Effect<void, SurfaceError>;
}
```

- `SurfaceOperationSchema = Schema.Literal("create", "resize", "focus",
  "setVisible", "setTheme", "destroy")`, annotated with a title/description.
- `surfaceError(operation, cause)` is the one boundary converter: a real
  `Error` contributes its `message`, anything else its `String(cause)`.
- `setPixels` is the raster path the component can build from its `ImgInstance`
  ref; `renderer` is passed for a future adapter that needs a renderer
  capability. Do not add unused methods.
- Every method is a **property** (`readonly create: (...) => Effect…`) so an
  adapter is a plain object and a test adapter is six `Effect.succeed`s.

`src/surface/raster.ts`:

```ts
export interface RasterFrame {
  readonly width: number;
  readonly height: number;
  readonly pixels: Uint8Array;
}

export interface RasterSurfaceOptions {
  readonly kind?: string;
  readonly paint: (
    bounds: SurfaceBounds,
    context: { readonly mode: ThemeMode }
  ) => Effect.Effect<RasterFrame, SurfaceError>;
}

export const rasterSurface: (options: RasterSurfaceOptions) => SurfaceAdapter;
```

Rules:

- `create(host)` records the host. `resize(bounds)` paints and calls
  `host.setPixels(bounds.width, bounds.height, frame.pixels)`.
- A frame whose `width`/`height` differ from the requested bounds, or whose
  `pixels.length !== width * height * 4`, fails with `SurfaceError` for the
  operation, naming the expected and actual values.
- `resize` before `create`, or after `destroy`, fails with a `SurfaceError`
  whose message says the surface is not created. Do **not** throw.
- `setTheme(mode)` records the mode and, when a bounds were painted, repaints
  with the new mode. `focus` and `setVisible` succeed without side effects
  (the raster host is a GPUI node; the component unmounts it).
- `destroy` clears the host and is idempotent.
- `kind` defaults to `"raster"`.

`src/components/Surface.tsx`:

```ts
export interface SurfaceProps {
  readonly adapter: SurfaceAdapter;
  readonly width: number;
  readonly height: number;
  readonly label: string;
  readonly style?: StyleDesc;
  readonly tabIndex?: number;
  readonly testId?: string;
  readonly onError?: (error: SurfaceError) => void;
}
```

- `renderSurface` is the module-level element seam (the package's pattern):
  it renders exactly one `<img>` with `alt={ariaName(label)}`, `testId`,
  `tabIndex` when given, `style={{ width, height, ...style }}`, and the caller's
  ref. It is exported for tests but **not** from the package root.
- `Surface` builds the host from the ref, `useGpuix().renderer`, and a
  `setPixels` closure over the ref; then runs the lifecycle.
- Lifecycle order: `create` → `resize(bounds)` → `setVisible(true)` →
  `setTheme(theme.mode)`. On unmount: `setVisible(false)` → `destroy`.
- A later `width`/`height` change runs `resize` only after `create` resolved.
  A later theme-mode change runs `setTheme`; the raster adapter repaints.
- An adapter or renderer change destroys the old session and starts a new one.
- `tabIndex` makes the host focusable; `onFocus` calls `adapter.focus()`.
- Failures go to `onError`; with no handler, they go to `Effect.logError` with
  the operation annotate. No `console.*`, no throw from a component.
- The component is presentational: no `role` beyond the `img` host's own image
  semantics, no invented keyboard behaviour.

---

## 5. Implementation steps

1. Create the plan index entries (`README.md`, `TODO.md`) **before** code.
2. Write `adapter.ts`, `raster.ts`, `index.ts`; run
   `nub run --filter @gpuixui/primitives check-types` (expect exit 0).
3. Write `adapter.test.ts` and `raster.test.ts`; run
   `nub run --filter @gpuixui/primitives test` (expect all pass; new cases named
   `surface adapter` / `raster surface`).
4. Write `Surface.tsx` + `renderSurface`; add `style-order` guard and the
   theme-matrix row.
5. Write the native suite; run
   `nub run --filter @gpuixui/primitives test:runtime -- --run runtime/surface.runtime.test.tsx`
   (expect the file green). Then run the scoped suites named in §8.
6. Write the page, the example, the inventory row and the registration.
   Run `nub run --filter @gpuixui/primitives test` again (contract/exports/
   examples suites are offline).
7. Run the full offline gate for the package and the repo gates in §8.
8. Prove both directions for every new assertion (see §7), then commit in
   small commits: contract → component → tests → docs/example/ledger.

### STOP conditions

- The probe in §1 no longer holds (img bounds or `setImagePixels` fails) → STOP
  and report the measured error; do not replace the host with a `div` and claim
  pixels.
- `useGpuix().renderer` is null in the runtime suite → STOP; wiring is wrong,
  not a test failure to skip.
- An adapter call cannot be expressed as a typed `SurfaceError` → STOP and
  revise the contract; do not throw.
- The docs page would need a claim the runtime cannot support → STOP and put
  the limitation in §Limitations instead.
- `packages/tw` or `apps/docs` needs a change → STOP; record it in `TODO.md`,
  do not edit.

---

## 6. Docs page (`docs/surface.mdx`)

Frontmatter `title` + `description`. Required sections (the contract test):

`## Usage`, `## API`, `## Keyboard`, `## Accessibility`, `## Theming`,
`## Limitations`, `## Verification`, `## Related`.

Must state, without hedging:

- **What it is**: a GPUI-painted raster leaf; the adapter owns the pixels.
- **Usage** with `rasterSurface` and a deterministic frame.
- **API** table: every prop in `SurfaceProps`, the adapter methods, `RasterFrame`.
- **Keyboard**: none by default; `tabIndex` makes the host focusable and calls
  `adapter.focus()`; a raster surface has no interior keyboard contract.
- **Accessibility**: one named `Image` node from `label`; a blank label is
  absent (`ariaName`); the interior is invisible to `getAutomationTree` — the
  adapter cannot expose its contents.
- **Theming**: only `theme.mode` crosses the boundary; no token colour is
  serialised; a paint callback that wants tokens reads them in the example.
- **Limitations**: no native child view in 0.10.0 (link plan `437` §1), no
  `onLayout` so bounds are authored, no scale factor in 0.10.0, raster is not
  interactive, repaint is caller-driven via a changing `revision`-style prop
  (document the pattern; do not add a hidden loop).
- **Verification**: the runtime suite and the exact case names.
- **Related**: `Box`, `Text`, `Meter` (a value bar is not a surface).

---

## 7. Test plan

### Offline — `src/surface/adapter.test.ts`

1. `SurfaceError` carries its operation and message (construct directly).
2. `surfaceError("resize", new Error("boom"))` → message `boom`; a string cause
   → that string. **Fail direction:** remove the `String(cause)` fallback and
   the string case fails.

### Offline — `src/surface/raster.test.ts`

Use a recording `SurfaceHost` (an object whose `setPixels` pushes into an
array) and `Effect.runPromise`.

1. `create` then `resize({2,2})` calls `setPixels(2, 2, pixels)` exactly once
   with a 16-byte `Uint8Array`.
2. A frame with the wrong dimensions fails with `SurfaceError` and calls
   `setPixels` zero times. Assert the message names `2×2` and the actual size.
3. `resize` before `create` fails with `operation: "resize"`; `destroy` then
   `resize` fails the same way. **Fail direction:** remove the guard and both
   cases become resolved effects.
4. `setTheme("dark")` repaints with the new mode and the same bounds; `focus`
   and `setVisible(false)` resolve without a paint.
5. `destroy` is idempotent (two calls resolve).
6. A failing `paint` effect propagates its `SurfaceError` unchanged.
7. `rasterSurface` defaults `kind` to `"raster"` and keeps an explicit kind.

### Native — `runtime/surface.runtime.test.tsx`

Header comment states the bug class this guards: a surface whose lifecycle is
not driven (create/resize/theme/destroy) leaves a stale raster or leaks a host.
Use `openWindow`, the fixture `Surface` frame, and `awaitFrame`.

1. **Mount order**: a recorder adapter mounted with `width=120 height=80`
   records exactly `create, resize, visible(true), theme(light)` and the
   `Image` node is named by `label`. Assert the host's painted bounds are
   `120×80`.
2. **Resize**: re-render at `200×100`; wait for `resize(200,100)` and assert the
   previous resize was not repeated.
3. **Theme**: re-render under `darkTheme`; the recorder gets `setTheme("dark")`
   and the raster adapter's `paint` sees `mode: "dark"`.
4. **Unmount**: `runtime.unmount()` (or the fixture's afterEach) records
   `visible(false), destroy`; no adapter call happens after `destroy`.
5. **Raster**: a `rasterSurface` with a 2×2 red/green/blue/white frame mounts,
   `setPixels` is called with 16 bytes, and the host paints (`bounds` > 0).
   This is the honest raster proof; do not assert pixel colours from a
   screenshot.
6. **Error**: a paint that fails with `SurfaceError` calls `onError` once, the
   component still paints its host (no crash), and no unhandled rejection
   appears.

Use `awaitFrame` for every asynchronous expectation (plan `691`), never a fixed
sleep.

### Both-direction proofs (required before "done")

For each guard below, revert the fix in the working tree, run the named case,
record the failure, then restore and rerun:

- Remove the `create` guard in `raster.resize` → test 3 fails by name.
- Remove the frame-size validation → test 2 fails (`expected 0 calls`).
- Remove `setVisible(false)` from the cleanup → native test 4 fails.
- Remove the `setTheme` effect → native test 3 fails.
- Remove the `onError` call → native test 6 fails.
- Remove `style` merge-last in `renderSurface` → the style-order guard fails.

Record the exact commands and failure lines in the plan's completion note and in
`TODO.md`.

---

## 8. Commands and expected results

Run from `packages/primitives` unless stated.

| Command | Expected |
| ------- | -------- |
| `nub run check-types` | exit 0 |
| `nub run test` | offline suite green; new `surface` cases included |
| `nub run test:runtime -- --run runtime/surface.runtime.test.tsx` | the suite green |
| `nub run test:runtime -- --run runtime/theme-matrix.runtime.test.tsx` | green, `Surface` case included |
| `nub run test:runtime -- --run runtime/name.runtime.test.tsx` | green (no new unnamed interactive node) |
| `nub run test:runtime -- --run runtime/examples.runtime.test.tsx` | green; the registry parity case accepts `surface` |
| `nub run lint` | exit 0 |
| `nub run fmt` | exit 0 |
| `nub run check` (repo root) | exit 0 |
| `nub run --filter @gpuixui/primitives test` (root) | the same offline result |

**Scoped live** (from the repo root, per `AGENTS.md`):
`nub apps/playground/dist/run.js --only <id>` is for the playground; this
package's native proof is the `test:runtime` command above. Do not run `--all`.

---

## 9. Acceptance

- The new part is exported from the root, documented in `docs/surface.mdx`,
  indexed in `docs/README.md`, mounted by `examples/surface.example.tsx` and
  recorded in `COMPONENTS.md`.
- Offline and native tests pass; the two-direction proofs are recorded.
- The page, README, inventory and `TODO.md` agree on what exists and what does
  not (no native child view, no scale factor, no input routing).
- The full package gates pass.

---

## 10. Completion note (2026-10-20)

Implemented as specified, with two measured corrections:

1. The host needs a real image source before `setImagePixels`; an `<img>` with
   no `src` renders the runtime's **fallback** surface, which did not take the
   authored box in the measured frame. `renderSurface` now passes a 1×1
   transparent PNG data URL so the host is a real image from the first paint and
   the first raster frame replaces it. Measured: a raw `<img src=…>` with
   `style={{ width: 120, height: 80 }}` reports `120 × 80`; the same host
   without a source did not. The focusable root is a `div` with the image inside;
   an `<img>` took no native focus in the pinned runtime (`focusNext` left
   `runtime.focused()` empty), while the `div` roots the focus contract the rest
   of the package uses. A focusable surface is a named `group` with a decorative
   image; a static one is a named `Image`.
2. The mount path applies the latest bounds/mode once, so the resize and theme
   effects must not repeat that first call. `Surface` records the applied bounds
   and mode and skips an unchanged effect; the native suite pins the exact
   `create → resize → visible → theme` sequence (the first version emitted the
   resize and theme twice).

Also measured: `host.renderer` is optional because the raster adapter never
needs it; the component passes `useGpuix().renderer` when present.

### Commands run

```sh
nub run --filter @gpuixui/primitives check-types   # exit 0
nub run --filter @gpuixui/primitives test          # 66 files / 913 tests green
nub exec vitest run src/surface src/components/style-order.test.tsx
                                                     # 3 files / 73 tests green
nub exec vitest run --config vitest.runtime.config.ts runtime/surface.runtime.test.tsx
                                                     # 1 file / 5 tests green
nub exec vitest run --config vitest.runtime.config.ts \
  runtime/theme-matrix.runtime.test.tsx runtime/name.runtime.test.tsx \
  runtime/examples.runtime.test.tsx runtime/surface.runtime.test.tsx
                                                     # 4 files / 89 tests green
```

### Both-direction proofs

| Mutation | Failure |
| -------- | ------- |
| `raster.destroy` stops clearing the host | `refuses to resize before create or after destroy` fails |
| frame dimension check removed | `refuses a frame whose size does not match the box` fails (`8 bytes …` instead of `1×2 for a 2×2`) |
| `setVisible(false)` removed from cleanup | `creates, sizes, shows and themes one session…` fails, missing `visible:false` |
| theme effect removed | `resizes and re-themes a live session` times out waiting for `theme:dark` |
| `onError` call removed | `reports a typed failure without unmounting the host` times out |
| caller style merged before the box | `Surface paints every caller property` fails (`height` `80` not `77`) |
| duplicate-effect suppression removed | the mount sequence gains a second `resize:120x80` and `theme:light` (measured before the fix) |
| blank label keeps its tab stop | `Surface accessibility > drops the tab stop when the label says nothing` fails |

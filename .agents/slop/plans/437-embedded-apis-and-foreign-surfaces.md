# 437 — Embedded APIs and foreign surfaces

| Field | Value |
| ----- | ----- |
| Status | spec / research (no implementation) |
| Phase | A (capability spec) → feeds E (specialised components) and the runtime workstream |
| Owner | research / runtime seam owner |
| Depends on | `020` (GPUix capability map), `130` (Tier 3/4 feasibility), `203` (capability doc), `530` (zIndex), `537` (gpui-ce verdict), `435b` (Fumadocs Editor), `reference-research.md` |
| Feeds | the runtime `Surface` seam, `packages/data-grid` (table), `packages/editor` (text core), `packages/tw` unsupported set, the extra-mile backlog in `TODO.md` |

This plan answers three questions the owner posed, with evidence, and does **no**
implementation. It is the specification the weaker executors build against:

1. **A** — the foreign-surface contract: a component leaf that hosts a
   platform-native view inside the GPUix layout, and the adapter interface the
   runtime must implement.
2. **B** — the embed-the-API list: for each famous tool, is the valuable part
   headless, or welded to the DOM — and what exactly do we take versus write?
3. **C** — the extra-mile backlog: a ranked, honest list of library work vs
   runtime work, and the app each item unlocks.

---

## 1. The runtime finding that decides everything

**`@gpuix/native@0.10.0` has no native-view hosting seam.** There is no
webview, no iframe, no `embedView`, no raw window handle, and no child-window
attachment anywhere in the published binding. The evidence, read from the
installed tarball (`.store/@gpuix+native@0.10.0/…/index.d.ts` and
`…/dist/host.d.ts`):

- The only way React reaches GPUI is the batch mutation protocol
  (`applyBatch`, `index.d.ts:47-59`), whose operation set is closed:
  `createElement`, `destroyElement`, `appendChild`, `insertBefore`, `setStyle`,
  `setText`, `setEventListener`, `setRoot`, `setCustomProp`. None of these
  creates or parents an OS view.
- The host element union (`dist/host.d.ts:137`) is
  `div | text | img | svg | canvas | input | textarea | anchored | code | diff | markdown | virtual-list`.
  Every entry is a GPUI-painted element; `img`/`svg`/`code`/`diff`/`markdown`
  paint GPUI quads/glyphs, they do not host a child window.
- `canvas` **is declared but unimplemented**: it appears in `ElementType` and in
  `@gpuix/react`'s `gpuixComponents` map (`react/dist/components/index.js:25`),
  but there is **no `CanvasProps`** in `host.d.ts` (contrast `ImgProps`,
  `SvgProps`, `CodeProps`, …), and the string `canvas` does not occur in the
  compiled loader (`index.js` / `index.cjs`). Plans `020` §1.1 and `130` §2 both
  record it as *"Custom drawing (planned)"*. Do not build on it.
- The only foreign-pixels seam is raster: `setImagePixels(elementId, w, h,
  Buffer)` and `setImage(elementId, bytes)` (`index.d.ts:155-160`) push RGBA or
  encoded bytes onto an `<img>` host node. That is the escape hatch for a
  chart/media frame we render ourselves off-screen; it is **not** a native view.
- The window-level foreign surfaces are whole-window, not child views:
  `WindowOptions` (`index.d.ts:686-732`) offers `transparent`,
  `titlebarTransparent`, `windowBackground: "blurred"`; `LayerShellOptions`
  (`index.d.ts:625-661`) opens a separate Wayland `wlr-layer-shell` window; and
  `WindowInsets.ime` (`index.d.ts:680-684`) reports the IME keyboard inset.
  None of these embeds a view inside a layout.

**Consequence.** A `Surface` component cannot be *built* today; it is a
**runtime ask**. What the library *can* do is pin the contract (§2) and ship the
raster-buffer adapter (§2.3) that works against `setImagePixels` today.

---

## 2. The foreign-surface contract (what the runtime must implement)

This is a spec for a seam, not a promise that one exists. The shape mirrors
gpui-kit's own webview crate (evidence §4), because that is the closest prior
art in the GPUI ecosystem.

### 2.1 The `Surface` / `Embed` component (library side)

```tsx
<Surface adapter={adapter} style={…} onReady={…} />
```

- **`adapter`** — the one required prop; a `SurfaceAdapter` instance (§2.2).
  The component is otherwise dumb: it mounts a leaf host element that reserves a
  bounds box, reports its laid-out bounds to the adapter, and forwards the
  adapter's lifecycle calls. The adapter is the entire non-trivial contract.
- **bounds** — the surface reserves exactly one box. The component measures its
  own box (or takes explicit `width`/`height`/`position` in `style`) and calls
  `adapter.resize(bounds, scaleFactor)` whenever it changes. GPUix has no
  `onLayout` in 0.10.0 (`020` §1.3), so bounds are **authored state**, not
  read-back: the app sizes the box; the adapter is told, not asked.
- **scale factor** — forwarded verbatim from the runtime (`window.scale_factor`);
  the adapter converts logical↔device pixels. It is the adapter's job, never the
  component's, because it differs per platform and per monitor.
- **focus** — `autoFocus`/`tabIndex` on the host leaf must route to
  `adapter.focus()`, and `adapter.onFocusChange` must flow back so a focused
  native view reports itself to the surrounding keyboard contract. GPUix's
  `focusElement`/`getFocusedElementId` (`index.d.ts:103-109`) is the runtime
  side of this handshake.
- **lifecycle** — mount → `create`; unmount → `destroy`; visibility change →
  `setVisible`. `destroy` must be idempotent and safe to call after `create`
  failed.
- **z-order** — see §2.4.
- **theming boundary** — tokens stop at the surface. The library hands the
  adapter a *named theme mode* (`light | dark`, plus platform) and the surface
  resolves its own native appearance from it (gpui-kit's
  `set_theme(webview, theme)` in `crates/webview/src/macos.rs` is the model).
  No token colour is serialised into the native view.
- **accessibility boundary** — the surface exposes exactly one AccessKit node
  (the role/label the app gives it); the native view's *interior* is invisible
  to `getAutomationTree()` and is the adapter's problem, not the library's.
- **testing boundary** — the contract is testable without a native view: a test
  adapter records `create/resize/focus/setVisible/destroy` calls and asserts the
  component emits the right sequence for mount/resize/unmount. The *native* part
  is verified only by the runtime's own smoke suite, and its verdict is
  `unverified` on this host (ADR 0001/0002/0003).

### 2.2 The `SurfaceAdapter` interface (runtime side)

The runtime provides adapters (WebKit, AVPlayer, PTY, canvas, native editor);
the library only imports the interface. Every method returns `Effect` so
failure is typed and the host can surface it:

```ts
interface SurfaceAdapter {
  readonly kind: "webview" | "avplayer" | "pty" | "canvas" | "editor" | …;
  create(host: SurfaceHost): Effect.Effect<void, SurfaceError>;
  resize(bounds: Bounds, scaleFactor: number): Effect.Effect<void, SurfaceError>;
  focus(): Effect.Effect<void, SurfaceError>;
  setVisible(visible: boolean): Effect.Effect<void, SurfaceError>;   // occlusion
  setTheme(mode: "light" | "dark" | "system"): Effect.Effect<void, SurfaceError>;
  destroy(): Effect.Effect<void, SurfaceError>;                      // idempotent
}
interface SurfaceHost {
  /** The one node this view paints into, plus the renderer's raw capabilities. */
  elementId: number;
  renderer: NativeRenderer;        // @gpuix/native/host — applyBatch, setImage, …
  window: WindowHandle;            // scale factor, insets, activate/focus
}
```

`Bounds`, `SurfaceError` (`Schema.TaggedError`), and `SurfaceHost` are the only
types the library owns. The adapter is registered once per runtime via a
`SurfaceAdapterRegistry` (a `Layer` of `Context.Service`), so an app swaps the
WebKit adapter for a test adapter without touching component code.

### 2.3 The raster adapter — the one seam that exists today

Because `setImagePixels` works **now**, the only honest `Surface` we can ship
today is the raster fallback:

- the adapter owns an off-screen buffer (`width × height × 4` RGBA);
- it paints into the buffer (a chart, a video frame, a rendered image);
- it calls `renderer.setImagePixels(elementId, w, h, buffer)`.

This is how charts and media *frames* ship without a native view. It is **not**
interactive (no focus, no input routing, no a11y interior) and it is **not**
"native drawing" — `130` §2 spells this out. It must be labelled that way.

### 2.4 The z-order problem (the reason the seam is hard)

Native child views do not participate in GPUI's paint order. gpui-kit documents
the exact failure (evidence §4): on the plain attachment the native view
**covers GPUI content in its bounds, including popovers, dialogs, menus and
tooltips**, and cannot be clipped by a scrolled container. The fix there is a
composition surface (`gpui-fast`) that re-registers the view so GPUI overlays
paint *above* it; without it, overlays must live in a separate window/popup.

Translated to GPUix: the runtime seam must expose a **composition/overlay
affordance** — the adapter needs a way to declare that floating layers (menus,
popovers, toasts) render above the native view. `StyleDesc.zIndex` already
orders *GPUI* siblings (plan `530`), but a native view is not a GPUI sibling; it
is an OS child window. The contract therefore has an explicit
`SurfaceAdapter.zOrder(mode: "below-overlays" | "above-overlays")` handshake,
or the runtime guarantees overlays by construction. If neither exists, the
honest rule is: **a native view must never sit under a menu it can occlude.**

### 2.5 Honest limits (state these in the component's docs and `COMPONENTS.md`)

1. A native surface **breaks GPU compositing purity** — that is the point, and
   it costs a window-composition step per platform.
2. It is **not themed by tokens** — only a theme *mode* crosses the boundary.
3. Its interior is **invisible to the automation tree** (`getAutomationTree`,
   `getA11yTree` see nothing inside).
4. **A component never grows a hidden webview.** A component whose contract
   needs a webview is either a `Surface` (adapter supplied by the runtime) or it
   is **not shipped** as native — it is documented as a web-tier component
   (plan `435b`'s STOP rule).

---

## 3. Embed-the-API list (take / skip / why)

Verdict key: **headless** = the valuable part is a framework/DOM-free core we
can adopt and render ourselves; **welded** = the valuable part only exists
inside a DOM/React renderer; **spec** = take the model, not the code.

| Candidate | Version read | Headless test result | Take | Write ourselves | Why |
| --------- | ------------ | -------------------- | ---- | --------------- | --- |
| **TanStack Table** | `@tanstack/table-core@9.3.1` | **headless** — sole dep `@tanstack/store`; keywords `react, vue, solid, svelte, lit, angular` | the core: column/row model, sorting, filtering, grouping, pagination, sizing, visibility, row selection | the renderer: `<virtual-list>` rows over our `Table`/`DataGrid` (plans `130`/`152`); header/column-resize is already measured | best fit, exactly as the owner guessed; framework-agnostic core, no DOM |
| **TanStack Charts** | `@tanstack/charts@1.1.0` (core, `packages/charts-core`) | **headless core** — optional peer deps for every framework; a "renderer-neutral keyed scene" with `/adapter/renderer`, `/octane` (server), `/react-native` targets | the grammar: marks, scales, channels, transforms, interactions | a GPUix renderer: raster the scene into `setImagePixels` today; a native canvas later | the scene is renderer-neutral by design (proof: it already drives SVG, Canvas, DOM, RN-SVG, and a server renderer) |
| **cmdk** | `cmdk@1.1.1` | **welded** — deps `@radix-ui/react-dialog`, `react-primitive`, `react-id`, `compose-refs`; peer react-dom | nothing new: the only pure piece is fuzzy ranking (`command-score`, an fzy fork) and we reimplemented it (plan `133`) | — | our `CommandMenu` (plan `114`) already covers search/filter/groups/keyboard |
| **Fumadocs Editor** | `@fumadocs-editor/ui@0.5.1` (core `0.4.1`) | **welded** — deps `@tiptap/core|pm|react`, `@base-ui/react`, `@stylexjs/stylex`; peer react-dom | the **block/serialization spec**: prose/table/code/frontmatter/component blocks, byte-for-byte round-trip, MDX AST | the editor surface; it is ProseMirror → `contentEditable` → DOM, so it is a `Surface` (webview) or a web-tier component (plan `435b`) | the block model is conceptually separable but not published as a DOM-free engine — take it as a contract, never as a dependency |
| **Base UI** | `@base-ui/react@1.9.0` | **state model separable, surface welded** — deps `@floating-ui/react-dom`, `use-sync-external-store`; peer react-dom; renders real HTML via `useRender`/`useRenderElement` | the state machines we have not yet ported: `internals/composite` (roving focus), `useAnchorPositioning` (middleware model), `internals/filter`, field/form state | the renderer | we already adopted its API shape (plan `200`, via base-gpui) and built most components; the remaining value is state, not rendering |
| **Floating UI** | `@floating-ui/core@^1.8.0` (via `@floating-ui/dom@1.8.0`) | **headless positioning math; measurement welded** — `core` has no DOM; `dom` adds `getBoundingClientRect`/ResizeObserver | nothing: `<anchored>`/`FloatingLayer` already covers placement (plan `323` measured align + flip) | — | keep `core`'s middleware model (offset/shift/flip/size) as the reference if `<anchored>` ever needs it |
| **dnd-kit** | `@dnd-kit/core@6.3.1` | **state headless, sensors welded** — no visual DOM, but peer react-dom and DOM pointer sensors | the state model as a spec: draggable/droppable registry, collision detection, sensor abstraction | the sensors: GPUix pointer capture + our drag heuristics (plans `130`/`315`) | valuable for a sortable/dock drag; the DOM listeners are the part we must not copy |
| **react-hook-form** | `react-hook-form@7.90.0` | **headless state, React-welded** — renders nothing, but `useForm` registers DOM inputs; no core package | nothing: TanStack Form's `@tanstack/form-core@1.33.5` is the framework-agnostic alternative (already in the tree) | — | we ship `Form`/`Fieldset` (plans `306`/`308`); reach for `form-core`, not RHF |
| **Radix / shadcn registry** | `@radix-ui/*` (installed 1.x) | **spec** | already covered — `reference-research.md` §5-6, plans `110–139`, `300–323`, `436` | — | the registry is an API-shape reference we have already ported; nothing new to take |

Two rules this table enforces, per the owner: **do not** propose a DOM-only
core as if it were headless (cmdk, RHF), and **no new dependency without a
reason** (Table core and Charts core are the only two that clear the bar).

---

## 4. GPUI / GPUix capability findings (with evidence)

Read from `references/gpui-kit` (the renamed `longbridge/gpui-component`;
workspace `0.58.0`, crates `kit`/`base`/`component`/`webview`/`shell` `0.8.0`,
Apache-2.0 + LICENSE-DOCS) and from the pinned `@gpuix/native@0.10.0`.

| Capability | GPUI ecosystem (gpui-kit) | GPUix 0.10.0 (our runtime) |
| ---------- | ------------------------- | -------------------------- |
| **Text editing core** | **full** — `crates/base/src/text/`: `document.rs`, `editor_host.rs`, `editor_seam.rs`, `selection.rs`/`selection_adapter.rs`, `undo_history.rs`, `text_boundary.rs`, `touch_selection.rs`, `inline.rs`/`inline_flow.rs`/`inline_element.rs`/`inline_object.rs`, `node.rs`, `range_highlight.rs` | `input`/`textarea` edit plain text; `highlight` paints ranges; **no** caret/selection/document model (`020`, `130` §2 "code editor: partial") |
| **IME** | `crates/base/src/input/` (`base`, `editor`, `input`, `textarea` + README) | window-level `WindowInsets.ime` only; no composition API |
| **Canvas / custom paint** | `crates/base/src/plot/` is a GPUI-native chart renderer (`axis`, `element`, `grid`, `scale`, `shape`, `path_cache`) | `canvas` declared, unimplemented (`130` §2: "planned"); raster fallback = `<img>` + `setImagePixels` |
| **Media** | via **webview** — `crates/shell/src/components/shell/media/{image,editor,diff,webview}.rs` | none; `<img>` renders stills, no playback |
| **Terminal** | **none** (no terminal/pty/alacritty module; grep returns only false positives) | none (`130` §2: "no PTY/terminal element") |
| **Webview** | **real** — `crates/webview/` (Wry): WKWebView (macOS), WebView2 (Windows), WebKitGTK (Linux X11); documented z-order + composition | **none** (this plan §1) |
| **Tray / menu-bar** | menu bar: `menu::AppMenuBar` (in-window `Menu`/`MenuItem`); **no OS tray** (`NSStatusBar` grep empty) | none; menus are in-app `<anchored>` layers |
| **Global hotkey** | **none** (grep empty) | none; window-level `onKeyDown` only |
| **Accessibility** | AccessKit (`a11y.rs`, `macos_accessibility.rs`, `a11y_disabled.rs`) | partial ARIA subset (`020` §1.4: role + 7 props; no `aria-checked`/`aria-valuenow`/`aria-labelledby`) |
| **Plugin sandbox** | **real** — `crates/shell/`: a JS (QuickJS) plugin runtime, `plugin.rs`, `host.rs`, `capability.rs`, `process.rs`, `storage.rs`; "not an Electron", no DOM | none |

The webview crate is the single most important prior art: its README states the
z-order failure precisely ("covers GPUI content in its bounds, including
popovers, dialogs, menus and tooltips"), the `gpui-fast` composition fix, and
the platform matrix (Windows and Wayland need a separate window/popup). Its
`composition.rs` shows the adapter lifecycle the contract in §2.2 mirrors:
`create_native_surface` → `set_bounds`/`set_geometry(document, visible)` →
`set_visible` → `set_scale_factor` → `release`. That is create/resize/occlude/
DPI/destroy, plus `focus_parent()` for input routing.

---

## 5. The extra-mile backlog (ranked, split by owner)

Order is value ÷ cost, not a chronological promise. "Library" = buildable in
this repo against the published GPUix; "Runtime" = needs a `@gpuix/native`
change (binding or renderer), so it is a seam ask, not a component.

| # | Item | Library work | Runtime work | App it unlocks |
| - | ---- | ------------ | ------------ | -------------- |
| 1 | **Charts** | adopt `@tanstack/charts` core; render the scene into `setImagePixels` (raster) | (later) a real `canvas` element to lift the raster→vector ceiling | every data product: analytics, finance, monitoring |
| 2 | **Table / data-grid** | adopt `@tanstack/table-core`; render over `<virtual-list>` (plans `130`/`152`) | none | the data-grid package, log viewers, inspectors |
| 3 | **Text-editing core** | buffer/selection/undo/redo/multi-cursor as pure modules (mirror gpui-kit's `text/`) | IME composition + caret/selection plumbing | the editor package, search-and-replace |
| 4 | **Webview** (foreign surface) | the `Surface` component + `SurfaceAdapter` contract (§2) + raster adapter | the native-view seam + composition overlay (§2.4) | docs-in-app, login/consent flows, embeds |
| 5 | **Canvas / custom paint** | the raster `Surface` adapter + paint helpers | a real `canvas` element or a `setImagePixels`-backed host | custom widgets, waveform/visualisers, diagramming |
| 6 | **Menu-bar / tray + global hotkey** | the `MenuBar` component (over `menu::AppMenuBar` semantics) and the accelerator model (already: plan `310`) | OS menu-bar/tray API + global shortcut registration | full desktop apps (settings, "always-on" tools) |
| 7 | **Media / terminal** | the `Surface` adapters for a media frame / PTY (output rows in `<code>` + an input line, per `130` §2) | AVPlayer/PTY seams | video players, terminals (as `Surface`, not a fake) |
| 8 | **Plugin sandbox** | a typed host-surface description (the `shell` crate's model, translated) | JS/QuickJS host, `process`/`storage`/`capability` | extensible apps (the owner's plugin ambition) |
| 9 | **Action system** | the command registry + keybinding layer over the existing accelerator model | none (window `onKeyDown` suffices) | the command palette, menus, shortcuts |
| 10 | **RTL / a11y completeness** | direction token + logical helpers (plan `435c`); a11y *usage* | binding patch: `aria-checked`/`aria-valuenow`/`aria-labelledby` (plan `537` §7.1 P0.4) | RTL locales, screen-reader parity |
| 11 | **Release engineering** | update feed config, signing metadata, provenance (`LICENSES/`) | **partially present**: `checkUpdate`/`AvailableUpdate` already in `@gpuix/native` (`index.d.ts:13-33, 425-441`); crash reporting + code-signing still missing | distribution |

Note on #11: auto-update is the one runtime capability that **already exists**
in the published binding (`AvailableUpdate.downloadAndInstall()`, signed-bundle
verification via `pubkey`). It is recorded here so the owner does not plan it
from scratch; the gaps are crash reporting and signing, which are release
plumbing, not component work.

---

## 6. Phased first slice

**Slice 1 — the contract (no runtime change, ships now).**

1. `packages/primitives/src/surface/` — `SurfaceAdapter` interface +
   `SurfaceHost` + `SurfaceError` + `SurfaceAdapterRegistry` (a `Context.Service`
   + `Layer`), and the `Surface` component that reserves a box and drives the
   adapter lifecycle. Pure, typed, Effect-native.
2. `packages/primitives/src/surface/raster-adapter.ts` — the `setImagePixels`
   adapter (§2.3); the only adapter that runs against 0.10.0.
3. A test adapter (`create/resize/focus/setVisible/destroy` recorder) and a
   vitest suite asserting the mount/resize/unmount call sequence. This is the
   whole library side of A.

**Slice 2 — embed the two headless cores (no new runtime).**

4. Add `@tanstack/table-core` and `@tanstack/charts` to the catalog (the only
   two new dependencies this plan authorises; both are MIT, actively
   maintained, framework-agnostic).
5. `packages/data-grid` renders `table-core` over `<virtual-list>`; a
   `packages/data-grid/src/charts/` (or `packages/charts`) rasterises
   `@tanstack/charts` into `setImagePixels`. Both land with a docs page and an
   inventory row, and the raster path is labelled "not native drawing".

**Slice 3 — the runtime asks (do not build; file as asks).**

6. A `Surface` seam issue against `@gpuix/native` (native-view attach +
   composition overlay + scale factor + focus), phrased as a capability gap with
   this plan's §1 evidence — never naming this product's private domain.
7. The extra-mile backlog (§5) moves into `TODO.md` as tracked items, split by
   owner.

### STOP conditions

- **No native-view seam → STOP at Slice 3.** The `Surface` is a **runtime ask**,
  not a library build. Ship Slice 1's contract + raster adapter; do not invent a
  fake webview, do not wrap a DOM element and call it native (plan `435b` rule).
- **A candidate core is DOM-only → STOP** and record it in §3 as `welded`; do
  not adopt it "as if" headless. (This is how cmdk and react-hook-form landed
  in the skip column.)
- **`canvas` is assumed usable → STOP.** It is `planned` in 0.10.0 (§1); the
  raster adapter is the only honest render target today.
- **A new dependency appears without a §3 row justifying it → STOP.** The
  authorisation is `table-core` and `@tanstack/charts` only.
- **`references/` is edited → STOP.** Read-only; clone to a scratch path first
  (plan `537` §9 rule 2).
- **A native runtime verdict is claimed without a smoke run → STOP.** On this
  host the native verdict stays `unverified` (ADR 0001/0002/0003).

---

## 7. Files and commands

| Path | Action |
| ---- | ------ |
| `packages/primitives/src/surface/{adapter.ts,host.ts,error.ts,registry.ts,raster-adapter.ts,index.ts}` | **create** — the contract (§2) |
| `packages/primitives/src/surface/{surface.tsx,surface.test.ts,adapter.test.ts}` | **create** — the component + vitest suite |
| `packages/data-grid/src/` | **change** — `table-core` renderer over `<virtual-list>` |
| `packages/charts/` (or `packages/data-grid/src/charts/`) | **create** — `@tanstack/charts` → `setImagePixels` rasteriser |
| `package.json` (workspace catalog) | add `@tanstack/table-core`, `@tanstack/charts` |
| `docs/` (docs-site) | a `Surface` page + a Table + a Charts page, raster labelled |
| `COMPONENTS.md` | rows for `Surface`, Table, Charts with the honest-limit notes |
| `LICENSES/` | MIT notices for `table-core` and `@tanstack/charts` |

```sh
nub run check        # exit 0
nub run lint         # exit 0
nub run --filter @gpuixui/primitives test   # the surface adapter suite
```

Expected: the adapter suite is pure and green on this host (no native binding
needed); the data-grid/charts raster suites run headless; any *native* surface
verdict stays `unverified` here.

## 8. Test plan

- **Adapter contract (must be able to fail):** a `RecordingAdapter` asserts the
  component emits `create → resize(bounds) → destroy` on mount/resize/unmount,
  and `setVisible(false) → setVisible(true)` on an occlusion toggle. Break the
  `destroy` call and the test fails (two-direction proof per AGENTS.md).
- **Raster adapter:** a unit test feeds a known 2×1 RGBA buffer and asserts
  `setImagePixels` is invoked with the exact `w/h`/bytes — proving the adapter
  owns the buffer and the component owns nothing about pixels.
- **Table core:** a `table-core` instance over fixture rows sorts/filters/
  groups; the renderer test asserts the `<virtual-list>` receives the derived
  row window. Break the sort comparator and it fails.
- **Charts core:** a `@tanstack/charts` definition compiles to a scene, and the
  rasteriser produces a non-empty RGBA buffer of the requested size. Break the
  scale and the buffer changes.
- **No fake-native:** a docs contract test asserts the Charts/Surface pages say
  "raster / not native drawing" (mirrors plan `203`'s anti-fake gate).

## 9. Acceptance criteria

- [ ] §1's no-seam finding is stated with the `index.d.ts`/`host.d.ts` line
      evidence, and `canvas` is recorded as planned-not-usable.
- [ ] The `SurfaceAdapter` contract (§2.2) and the raster adapter (§2.3) are
      typed, Effect-native, and covered by the adapter suite.
- [ ] §3's table has a take/skip/why and a headless verdict per candidate, each
      citing a package version.
- [ ] §4's capability findings cite `gpui-kit` file paths and `@gpuix/native`
      paths.
- [ ] §5 splits library vs runtime and names the app each item unlocks.
- [ ] The two authorised dependencies (`table-core`, `@tanstack/charts`) are the
      only ones added.
- [ ] No native surface is claimed "working" on this host.

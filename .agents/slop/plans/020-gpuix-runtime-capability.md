# 020 — GPUix runtime capability map and verification strategy

**Phase:** A (audit and feasibility). **Owner:** primitives workstream (recon);
`apps/playground` + `packages/testing` own the executable smoke test.
**Depends on:** nothing. **Status:** `done (recon complete; verification blocked — see §3)`

This plan is the ground truth every other noun in this repo is built on: what
GPUix actually is, what it renders, what it can and cannot do, and — critically —
**what can be verified on this machine right now**. Read §3 before promising any
component is "done".

---

## 1. What GPUix is (facts, checked against the installed release)

Source of truth: `~/GPUIXUI/references/gpuix` at `@gpuix/react` / `@gpuix/native`
**0.10.0** (published). Licence **Apache-2.0** — reuse is permitted with
attribution; record it in `LICENSES/`.

GPUix is a React renderer over **Zed's GPUI** (Rust, wgpu/Metal/DirectX). React
components create native elements in a retained tree owned by Rust. There is no
DOM, no CSS stylesheet, no browser layout engine, and no HTML.

### 1.1 Host elements (`ElementType`)

`div`, `text`, `img`, `svg`, `canvas`, `input`, `textarea`, `anchored`, `code`,
`diff`, `markdown`, `virtual-list`.

There is **no** `span`, `a`, `button`, `input[type=checkbox]`, `select`,
`svg`-child-path, `portal` element, `iframe`, or `table`. There is also no
`transform`/`rotate`, no `transition`, and no `animation` keyframes.

### 1.2 Styling — a flat, CSS-shaped `style` prop

`style: StyleDesc` (`@gpuix/native/host`). Highlights:

- flexbox only (`flexDirection`, `flexGrow`, `alignItems`, `justifyContent`,
  `gap`, `rowGap`, `columnGap`) plus a fixed-size grid
  (`gridTemplateColumns`, `gridTemplateRows` are `number`, not template strings);
  there is no `grid-auto-flow` and no named areas.
- box model: `width`/`height`/`min*`/`max*` as `number | string`, padding,
  margin, `position` + `top/right/bottom/left`.
- surface: `background` (a colour string or a 2-stop `LinearGradientBackground`)
  and `backgroundColor`; `borderWidth` (+ per-side variants) + `borderColor` +
  `borderRadius` (+ per-corner variants); `boxShadow` is a **single**
  `BoxShadow` (`offsetX`, `offsetY`, `blurRadius`, `spreadRadius`, `color`) —
  there is no shadow list. **There is no `borderStyle`** (so no dashed border).
- typography: `fontSize`, `fontFamily`, `fontWeight` (`string | number`),
  `textAlign`, `lineHeight`, `whiteSpace: "normal" | "nowrap"`,
  `textOverflow: "ellipsis" | "ellipsis-start"`, `lineClamp`, `textDecoration`.
- scroll: `overflow`/`overflowX`/`overflowY` only. **No `scrollbarColor`, no
  `scrollbarWidth`, no fade mask** — the thumb is painted from the platform
  theme and takes no pointer input.
- `cursor` (a typed `CursorValue`), `pointerEvents: "auto" | "none"`,
  `userSelect: "text" | "none" | "auto"`, `selectionColor`.
- **native pseudo-states, no JS round-trip**: `hover` and `active` only, each
  `Omit<StyleDesc, "hover" | "active">`, nested exactly one level deep. **There
  is no `focusVisible`, no `keyboardFocusDim` and no `outline*`** — a focus ring
  is drawn by the component as a zero-blur, zero-offset `boxShadow` applied
  while it holds focus, so a mouse press shows the ring too.
- `opacity`, `visibility`, `display`. **No `aspectRatio`, no `transition`.**

### 1.3 Events

Mouse: `onClick` (primary only), `onAuxClick`, `onMouseDown`/`Up`/`Move`/`Enter`/
`Leave`, `onMouseDownOutside` (fires when the user clicks outside this element).
Keyboard: `onKeyDown`, `onKeyUp` (fire on the focused element and on ancestors
that declare them). Focus: `onFocus`, `onBlur`. Scroll: `onScroll` only —
**there is no `onScrollChange`**. Text: `onChange`, `onSubmit` (Enter on
`<input>`, or Enter on `<textarea>` when this listener is set). Plus
`onFileDrop`, `onVisibleRange`, `onHighlight`, `onMotionComplete`, and the
code/diff-specific `onToggleFile`, `onShowMore`, `onLineClick`, `onLinkClick`.
**There is no `onLayout`.** The host also takes `testId` as a stable automation
locator.

**Keyboard events are typed `EventPayload`, not `KeyEvent`.** `EventPayload`
carries `key?: string`, `keyChar?: string` and `isHeld?: boolean` — all
optional — and **no `defaultPrevented`**, no `elementId`-independent modifiers
beyond `modifiers`, and no separate `KeyEvent` type (that exists only on `main`).
So key facts must be **decoded at the boundary** before a decision function sees
them, and there is no way to observe `preventDefault` from another listener.

### 1.4 Focus, a11y and animation

- Focus is native: `autoFocus`, `tabIndex` (native GPUI tab order). No
  `focus()` imperative API on a ref; tests use the renderer's `focusElement`.
- Accessibility is real: `role` (AccessKit/ARIA token), `aria-label`,
  `aria-description`, `aria-id`, `aria-expanded`, `aria-selected`,
  `aria-valuetext`, `aria-level`. **There is no `aria-checked`, `aria-valuenow`,
  `aria-valuemin`/`max`, `aria-disabled`, `aria-labelledby`, or `aria-describedby`.**
- Animation: `motion: MotionProps` supports **only** `width`, `height`,
  `opacity`, `top`, `right`, `bottom`, `left`, `borderRadius`. **No rotation, no
  colour interpolation, no spring.** `motion.div` from `@gpuix/react` wraps it.

### 1.5 What `@gpuix/react` 0.10.0 already ships (reuse, do not reimplement)

The published `exports` map is exactly: `.`, `./jsx-runtime`, `./jsx-dev-runtime`,
`./testing`, `./select`, `./combobox`, `./tooltip`, `./floating`, `./automation`.
The root re-exports the `Select`, `Combobox` and `Tooltip` component families,
`AnimatePresence`/`motion`, the hooks `useGpuix`/`useWindowSize`/`useWindowInsets`/
`useTextSearch`, and the theme/metric types (`GpuixTheme`, `GpuixMetrics`,
`SyntaxTheme`) which are passed per element.

**Absent from the published root** (present only on GPUix's `main`): `Button`
(+ `buttonProps`), `Dialog`, `createPortal`. There is no `./button` export and no
`dist/components/button.js`. Overlays therefore build on the published
`./floating` module (`DismissableLayer`, `FloatingLayer`, `renderSlot`,
`resolveStyle`, `mergeStyles`) rather than on the root's `Dialog`.

**Import behaviour on this box** (measured, see §3): importing the package root
or `./testing` **throws `Cannot find native binding` at import time**, because
`@gpuix/react` → `@gpuix/native` has no `darwin-x64` binary. Importing `./select`,
`./combobox`, `./tooltip`, `./floating`, `./jsx-runtime` succeeds. So a component
module may depend on the subpath modules and must use the JSX runtime
(`jsxImportSource: "@gpuix/react"`), but a test in this repository must assert on
the **React element tree** rather than render it.

`@gpuix/react/testing` re-exports `@gpuix/native/testing`: `TestRenderer` drives
the **real** GPUI pipeline (build → layout → hit test → dispatch) and exposes
tree queries, `getElementBounds`, `getA11yTree`/`getAutomationTree`, key and
pointer simulation, scroll and selection APIs, and `captureScreenshot`.

### 1.6 `main` vs published 0.10.0 — measured differences

Every one of these was found by compiling against the installed tarball after
writing code against the checkout. They are the difference between code that
type-checks and code that does not.

| Feature | `main` (checkout) | published 0.10.0 | Consequence |
| ------- | ----------------- | ---------------- | ----------- |
| `focusVisible` state style | yes | **no** | focus rings are scripted; no `:focus-visible` distinction |
| `outlineWidth`/`Color`/`Offset` | yes | **no** | a ring must be a spread-only `boxShadow` or a colour change |
| `keyboardFocusDim` | yes | **no** | cannot opt out of focus dimming |
| `borderStyle: solid \| dashed` | yes | **no** | no dashed borders |
| `scrollbarColor`/`scrollbarWidth` | yes | **no** | the scrollbar cannot be tinted |
| `boxShadow` | one or a list | **one** | no layered shadows |
| `aspectRatio` | yes | **no** | size both axes explicitly |
| `KeyEvent` on `onKeyDown` | yes | **no** (`EventPayload`) | decode key facts at the boundary |
| `onScrollChange`, `onLayout` | yes | **no** | no scroll-offset or layout reporting |
| `./button` export | yes | **no** | button keyboard behaviour is ours |
| `Dialog`, `DismissableLayer`, `createPortal` | yes | **partial** (`./floating` ships `DismissableLayer`/`FloatingLayer`; the root's `Dialog` is not published) | overlays are built here on `./floating` |

Anything written below as a "GPUix limitation" therefore cites 0.10.0, and a
future upgrade may remove it. Re-run the probe table in §3 before assuming.

---

## 2. Consequences for the library design

1. **No CSS.** Every visual decision is a JS value in a `style` prop. Tokens must
   resolve to concrete `StyleDesc` values, and the resolver is the single place
   a semantic role becomes a colour/number. This makes the token→style mapping a
   *pure function*, which is the most testable part of the library.
2. **Composition is `div` + `text` + flexbox.** Stack/Box/Separator/Spacer are
   thin. That is correct here, not lazy: the runtime has one box primitive.
3. **Interaction state is declared, not scripted — with one exception.** Hover
   and active belong in `style.hover`/`style.active`; never implement them with
   `onMouseEnter` + `useState`. Focus is the exception the runtime forces: there
   is no `focusVisible`, so a focus ring is the one piece of interaction state a
   component must track, and it should do so in a single shared place rather than
   in every control.
4. **Keyboard behaviour is ours.** `@gpuix/react/button` is not published, so the
   contract (Enter on key down, Space on key up, a held key ignored) lives in
   `packages/primitives/src/core/keyboard.ts` and every focusable control reuses
   it. Decode the key facts from `EventPayload` at the boundary.
5. **Animation is opacity/size/position only.** Skeletons pulse (opacity).
   A spinner cannot rotate: use an indeterminate sweep (width/left) or a
   discrete step cycle, and document the limitation.
6. **Accessibility mapping is partial.** `aria-checked` for checkbox/switch has
   no host prop. Verify what `role: "checkbox"` + `aria-selected` produces in
   the AccessKit dump, and document the exact limitation rather than inventing
   a prop that does not exist.

---

## 3. Verification on this machine — **BLOCKED** (evidence)

This is the single most important operational fact in the repo. It was measured,
not assumed.

| Probe | Command | Result |
| ----- | ------- | ------ |
| Host architecture | `uname -m`, `node -p process.arch`, `sysctl machdep.cpu.brand_string` | `x86_64`, Intel Core i7-8750H — **not Apple Silicon** |
| Published native binaries | `npm view @gpuix/native@0.10.0 optionalDependencies` | only `native-darwin-arm64`, `native-linux-x64-gnu`, `native-win32-x64-msvc`, `native-win32-arm64-msvc` |
| Load the native module | `node -e 'import("@gpuix/native")'` | **fails**: "Cannot find native binding" — no `darwin-x64` build |
| Last release with a `darwin-x64` binary | `npm view @gpuix/native-darwin-x64 versions` | `0.5.1` (dropped after 0.5.1) |
| Does 0.5.1 load? | install + import | yes, the `.node` binary loads |
| Does it create a window? | `new TestGpuixRenderer(800, 600)` | **`NSException` in `gpui_macos::display::MacDisplay::primary`** — no display in this session |
| Session kind | `launchctl managername` | `Background` (SSH, `SSH_CONNECTION` set); `NSScreen.screens.count == 0` |
| Build from source | `which cargo rustc` | absent; no rustup, no Homebrew, no `sudo` without a password |
| Browser/Wasm path | published tarball contents | `wasm/gpuix-web.js` + `wasm/gpuix-web_bg.wasm` + `browser.mjs` **are** published |

**Therefore:** on this box, in this session, **no GPUix component can be
rendered, clicked, focused or asserted on**. Importing `@gpuix/react` (the root)
or `@gpuix/react/testing` **throws `Cannot find native binding` at import time**,
because `@gpuix/react` → `@gpuix/native` has no `darwin-x64` binding; a test that
imports either fails while loading, not while running. The subpath modules
(`./floating`, `./select`, `./tooltip`, `./combobox`, `./jsx-runtime`) do load,
which is what makes element-level tests possible.

### 3.1 The only honest verification paths, strongest first

1. **Wasm in a real browser (recommended, unproven).** `@gpuix/native@0.10.0`
   ships a wasm renderer. A bundler that understands
   `import wasmUrl from "..._bg.wasm" with { type: "file" }` (Bun, Vite,
   rolldown) plus a static server sending
   `Cross-Origin-Opener-Policy: same-origin` and
   `Cross-Origin-Embedder-Policy: require-corp` (the wasm needs
   `SharedArrayBuffer`) would let the *real* GPUix runtime run in **headless
   Chrome**. Risk: `WebGpuixRenderer` needs WebGPU; headless Chrome needs
   `--enable-unsafe-swiftshader` and even then may not get an adapter.
   *Owner: playground workstream (`apps/playground`).*
2. **A GUI session on this machine.** The console user `ghdr` is logged in and
   `WindowServer` is running; only the SSH process lacks an Aqua session. A
   process launched inside the GUI session (`launchctl asuser`, or the human
   running `nub run dev:playground` from Terminal.app) can open a real window —
   and only then do the native `darwin-x64` gaps matter, because **the arm64
   binary is the only macOS build published**. Intel macOS still needs a source
   build of `@gpuix/native` (Rust 1.97.1 + `napi`, GPUI's dependency tree).
   *Owner: human decision; recorded as a TODO blocker.*
3. **Pure-logic tests (available now).** Everything that is not the GPUix tree
   — token→style resolution, variant matrices, size scales, controlled-state
   and keyboard reducers, prop decoding, icon data — runs under plain vitest on
   Node 24 **today**. This is why the plans below push behaviour into pure
   modules and keep the React/GPUix surface thin.

**Nothing in this repo may claim a runtime interaction is verified until path 1
or 2 succeeds.** Component inventory rows stay `wip` with the limitation stated.

---

## 4. STOP conditions

Stop and report (do not improvise) if, while working on any plan:

- you need a GPUix capability that §1 does not list (no transform, no
  `aria-checked`, no colour animation, no `position: fixed`);
- **you are about to copy a `style` property or host prop from the
  `references/gpuix` checkout** — check §1.6 first; a dozen of them do not exist
  in the published release and the mistake only shows up at type-check time;
- you are about to assert a runtime behaviour that was never executed;
- the wasm path (3.1.1) is attempted and WebGPU is unavailable in headless
  Chrome — record the exact Chrome flags and error, then fall back to path 3;
- any command in §3 changes its answer (a new GPUix release with `darwin-x64`
  would unblock the primary path immediately — re-run the probe table first).

## 5. Acceptance criteria

- The probe table in §3 is reproducible by any agent with the same commands.
- `COMPONENTS.md` rows that cannot be runtime-verified say so in their Notes
  column, naming the missing capability and the evidence.
- No source file claims GPUix supports something §1 says it does not.

## 6. Test plan

The probe table *is* the test: each row is a command whose output must match.
`apps/playground` (owner: playground workstream) should turn rows 3, 6 and 10
into a committed, runnable script so the answer is re-checked automatically
rather than remembered.

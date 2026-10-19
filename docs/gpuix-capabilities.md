# GPUix capabilities (0.10.0)

The durable capability reference for every component decision. If a component
depends on a runtime feature, this table is the evidence that the feature
exists — or the record that it does not.

| Field | Value |
| ----- | ----- |
| Runtime | `@gpuix/react` / `@gpuix/native` **0.10.0** (pinned in the workspace catalog) |
| Licence | Apache-2.0; provenance in `LICENSES/` |
| Evidence | the **published 0.10.0 type declarations** installed in `node_modules`, the measured probes in [`plans/020-gpuix-runtime-capability.md`](../.agents/slop/plans/020-gpuix-runtime-capability.md) §1/§3, and the native smoke suite (ADR 0003) |
| Host status | the published binding has no `darwin-x64` build; the smoke suite runs a locally built 0.10.0 binding here — see `020` §3 and `.agents/adr/0003-darwin-x64-source-build.md` |
| Owner | primitives workstream (plan `203`) |

## How to read a verdict

- **supported** — the published 0.10.0 types or a measured probe prove it.
- **partial** — it exists with a documented restriction; the restriction is the
  contract.
- **not supported** — no field, prop or renderer method exists in 0.10.0. Do not
  build on it, even if a newer README shows it.
- **window-only** — it affects the whole OS window, not an element.
- **unverified** — nothing before the reader proves it either way. Never upgrade
  this to "supported" by assumption, and never cite it in a `done` row.

**Evidence precedence.** The checkout at `references/gpuix` is `main`, which is
**ahead of the published release**. Its README documents features that 0.10.0
does not ship (`aspectRatio`, `borderStyle`, `onLayout`, `registerFont`, the
`Button`/`Dialog` components, and more — see §6). Therefore:

1. the **published 0.10.0 declarations** (`@gpuix/native/dist/host.d.ts`,
   `dist/testing.d.ts`, `@gpuix/react/dist/*.d.ts`) and a measured probe win;
2. the checkout README is used only where the published types agree with it;
3. a measured probe (`020` §3, the smoke suite) wins over any type reading;
   where this document corrects a type reading in `020` §1, the published
   declaration is the authority — e.g. `020` §1.5 lists `DismissableLayer` and
   `createPortal`, which are `main`-only.

## 1. Host elements

The published `ElementType` union is exactly:

```ts
type ElementType =
  | "div" | "text" | "img" | "svg" | "canvas" | "input"
  | "textarea" | "anchored" | "code" | "diff" | "markdown" | "virtual-list";
```

| Element | Use | Limits |
| ------- | --- | ------ |
| `div` | every box, row, panel, overlay surface | block by default — set `display: "flex"` before flex props; a shrinking flex child needs `minWidth: 0` |
| `text` | all copy | adjacent siblings merge into one line; nested text is a box; no shadow |
| `input` | single-line editor | no `type`, `min`, `max`, `maxLength` or `step`; the native editor owns the text, `onChange` reports the value |
| `textarea` | multi-line editor | `minRows`/`maxRows`; setting `onSubmit` trades the newline for a submit |
| `virtual-list` | long uniform collections | builds a window of rows; no `hover`/`active` on the list itself |
| `img` | raster or SVG image from path/data URL/http(s) | bytes can be replaced with `setImage`/`setImagePixels` |
| `svg` | tintable monochrome icon from source/disk | one `source`; tint through `color` |
| `anchored` | positioned overlay | paints no surface of its own; measured defects in §6 |
| `code` | syntax-highlighted block | bundled languages only; read-only |
| `diff` | unified diff | read-only |
| `markdown` | GitHub-flavoured markdown | read-only |
| `canvas` | custom paint | **unverified**: in the union, but the README marks custom drawing "planned" and no drawing API is published |

There is **no** `button`, `select`, `a`, `table`, `form`, `iframe`, `portal`,
`video` or `audio` host element. Those are compositions over `div`/`input`/the
headless components below.

## 2. Provided by GPUix

### Headless components and helpers (0.10.0)

| Export path | Publishes |
| ----------- | --------- |
| `@gpuix/react` | `Select` family, `Combobox` family, `Tooltip` family, `AnimatePresence`, `motion`, `useGpuix`, `useWindowSize`, `useWindowInsets`, `useTextSearch`, `findRanges`, `createRoot`, `render` |
| `@gpuix/react/select` | the `Select` parts (trigger, content, item, group, label, separators, scroll buttons) |
| `@gpuix/react/combobox` | the `Combobox` parts |
| `@gpuix/react/tooltip` | the `Tooltip` parts |
| `@gpuix/react/floating` | `FloatingLayer`, `floatingRootStyle`, `mergeStyles`, `renderSlot`, `resolveStyle`, `setRefs`; types `FloatingSide`, `FloatingAlign`, `StateStyle` |
| `@gpuix/react/testing` | `TestRenderer`, `createTestRoot`, `hasNativeTestRenderer` |
| `@gpuix/react/automation` | the out-of-process automation client and wire protocol (`App`, `Locator`, `launch`, `connectStdio`, `connectTest`, `serveAutomationStdio`) |

### Not published in 0.10.0

| Thing | State |
| ----- | ----- |
| `Button`, `buttonProps`, `./button` | **not published** (main-only). Activation, focus and naming are ours. |
| `Dialog` | **not published** (main-only). Build on `./floating` + `div` + `motion`. |
| `createPortal` | **not published**. There is no portal element. |
| `DismissableLayer` | **not published**. Dismissal is our own `onMouseDownOutside` + Escape contract. |
| `useControllableState` | defined in `dist/components/floating` but **not re-exported** from `./floating` or the root, so it is not a public 0.10.0 API. Our `core/state.ts` owns the controlled/uncontrolled rule. |

### Renderer and test APIs

`@gpuix/native`'s renderer publishes: `focusElement`, `focusNext`,
`focusPrevious`, `focusNextWithin`, `focusPreviousWithin`,
`getFocusedElementId`, `blur`, `getElementBounds`, `scrollTo`, `scrollToItem`,
`scrollIntoView`, `getScrollOffset`, `getListScrollTop`, `setImage`,
`setImagePixels`, `getSelectedText`, `getPaintedHighlights`, `getWindowSize`,
`getWindowInsets`, `setWindowTitle`, `promptForPaths`, `activateWindow`,
`minimizeWindow`, `zoomWindow`, `toggleFullscreen`, and the debug frame overlay.

`@gpuix/react/testing`'s `TestRenderer` drives the real GPUI pipeline: flush,
pointer/keyboard simulation, wheel, focus traversal, scroll, selection,
`getA11yTree`, `getAutomationTree`, `getElementBounds`, `clockFastForward`,
`advanceTime` and `captureScreenshot`.

## 3. The limits table

One row per limit this library must design around. Every row carries the
verdict, the evidence, and the honest workaround.

| Capability | Verdict | Evidence | Workaround |
| ---------- | ------- | -------- | ---------- |
| Flexbox layout | **supported** | `host.d.ts` · `StyleDesc` (`display`, `flexDirection`, `flexWrap`, `flexGrow`, `flexShrink`, `flexBasis`, `alignItems`, `alignSelf`, `alignContent`, `justifyContent`, `gap`, `rowGap`, `columnGap`) | — |
| Fixed grid | **partial** | `host.d.ts` · `gridTemplateColumns`/`gridTemplateRows` are **numbers**, plus `gridColumnMin`/`gridRowMin`; no auto-flow, named areas or template strings | resolve track counts in JS |
| Two-stop linear gradient | **supported** | `host.d.ts` · `LinearGradientBackground.stops` is a two-element tuple | — |
| Multi-stop, radial, conic or repeating gradients | **not supported** | `host.d.ts` · `background` accepts only `type: "linear-gradient"` with exactly two stops | stack two-stop layers for a hard edge |
| Box shadow | **partial** | `host.d.ts` · `boxShadow` is **one** `BoxShadow` (`offsetX`, `offsetY`, `blurRadius`, `spreadRadius`, `color`); no list and no `inset` | one shadow per element; draw inner edges with borders or a gradient |
| Per-corner radii and per-side border widths | **supported** | `host.d.ts` · `borderRadius`/`borderTopLeftRadius`… and `borderWidth`/`borderTopWidth`… | — |
| Dashed or dotted borders (`borderStyle`) | **not supported** | no `borderStyle` in the 0.10.0 `StyleDesc` (main-only; §6) | a solid border in a muted role |
| Opacity | **supported** | `host.d.ts` · `opacity` | — |
| Element transform, rotate, scale or translate | **not supported** | no `transform` field; `MotionStyle` targets only size, position, opacity and radius | change layout values instead (width, left, `justifyContent`); `motion` can animate the change (plan `329`) |
| z-index or explicit stacking | **not supported** | no `zIndex` field; tree order is paint order; `<anchored>` has `deferred`/`priority` | reorder the tree; give overlays a `priority` |
| Backdrop blur or vibrancy | **window-only** | `@gpuix/native` · `WindowOptions.windowBackground: "blurred"` is the macOS vibrancy backdrop; no per-element `backdropFilter` | a semi-transparent surface |
| CSS `filter` | **not supported** | no `filter` field | bake the effect into the asset |
| `clip-path` | **not supported** | no field | `overflow: "hidden"` + radius; an SVG mask |
| Blend modes | **not supported** | no `mixBlendMode` field | pre-composited colours |
| Text shadow | **not supported** | the text style has no shadow field | layered `<text>` only for display type |
| Multi-line clamp (`lineClamp`) | **partial — shared between identical strings** | measured on this host (plan `082`): the runtime keeps one shaped text layout per string/font/width for the whole window, and `lineClamp` is applied to that layout without being part of the key. A 120 px body text measured `36 / 36 px` when a clamped copy was laid out before a plain copy of the same string (the plain text was clipped to two lines) and `108 / 108 px` when the plain copy came first (the clamp did nothing); a different string was unaffected | clamp with the element's own `maxHeight` + `overflow: "hidden"`; `truncate` (one line, ellipsis) is unaffected because the wrap mode is part of the key |
| Sticky positioning | **not supported** | `position` is relative/absolute/fixed; "fixed" lays out like absolute because there is no scrolling document | position the element from `renderer.getScrollOffset` (what `ScrollArea`'s `onScrollPositionChange` reports, plan `337`) |
| Scroll snap | **not supported** | no `scrollSnap*` fields | snap programmatically at scroll end |
| Container or element queries | **not supported** | no field; responsiveness is window-level (`useWindowSize`, `useWindowInsets`) and measurement is `renderer.getElementBounds` | own the measurement and branch in JS |
| `aspectRatio` | **not supported** | absent from the published 0.10.0 `StyleDesc`; documented on main only (§6) | set both axes explicitly |
| CSS shorthand and `calc()` | **not supported** | `padding`/`margin`/`borderRadius` take numbers; CSS strings are ignored | resolve values in JS |
| Keyframe animations | **not supported** | `MotionProps` is initial/animate/exit/transition; `MotionStyle` has eight numeric targets | step state from the app (Effect `Clock`) or use enter/exit |
| Animation interruption | **supported** | a target change resumes from the current visible value | — |
| Reduced-motion detection | **unverified** | no documented API or type in 0.10.0 | expose an app-owned preference prop |
| Custom paint (`<canvas>`) | **unverified** | the element is in `ElementType`, but the README marks custom drawing "planned" and no drawing API is published | `<svg>` for static shapes; `setImagePixels` for frames |
| Pointer, keyboard, focus and scroll events | **partial** | `host.d.ts` · `HostProps` declares `onClick`, `onAuxClick`, `onMouseDown/Up/Move/Enter/Leave`, `onMouseDownOutside`, `onKeyDown/Up`, `onFocus`, `onBlur`, `onScroll`, `onFileDrop`, `onChange`, `onSubmit`, `onVisibleRange`. **Focus events are not delivered:** measured on 0.10.0, native focus moves and `getFocusedElementId()` tracks it, but `onFocus`/`onBlur` never run (see [Focus events](#focus-events)) | drive focus from the renderer (`focusElement`, `focusNext`, `getFocusedElementId`); this package's `NativeFocusProvider` samples the id so focus **rings** still paint (plan `590`) and a slot trigger's **tooltip opens on focus** because the wrapper receives the trigger host through the slot's `ref` (plan `596`); a `ScrollArea` keeps its imperative `ref` and stays hover-only |
| Scroll offset and layout reporting (`onScrollChange`, `onLayout`) | **not supported** | no `onScrollChange` and no `onLayout` in the 0.10.0 `HostProps` (main-only; §6) | read `renderer.getScrollOffset(elementId)` — it is already the post-scroll, clamped offset inside the `onScroll` handler (measured, plan `337`); measure with `getElementBounds` |
| `role` plus a subset of `aria-*` | **partial** | `host.d.ts` · `role`, `aria-label`, `aria-description`, `aria-id`, `aria-expanded`, `aria-selected`, `aria-valuetext`, `aria-level`. **No** `aria-checked`, `aria-valuenow`, `aria-valuemin`/`max`, `aria-disabled`, `aria-labelledby`, `aria-describedby`, `aria-invalid` | carry state in `aria-valuetext`/`aria-selected`; describe with `aria-description`; put a label inside one interactive element |
| System appearance or high-contrast detection | **unverified** | `GpuixTheme.appearance` is set by the app; no OS preference API in 0.10.0 | the app owns the theme choice |
| IME and composition input | **unverified** | no composition or paste events in `HostProps` | treat every `onChange` value as committed text and document the gap |
| Font registration | **not supported** | `registerFont` is not on the 0.10.0 `NativeRenderer` (main-only; §6) | installed family names; a consumer-installed face |
| Clipboard API | **not supported** | no clipboard method and no `onPaste` in 0.10.0 | app-level platform integration, documented as a limitation |

## 4. Cross-cutting gaps

### Accessibility

The runtime maps props onto AccessKit; a node enters the tree only when it has a
role or a label. What 0.10.0 **does** expose: `role`, `aria-label`,
`aria-description`, `aria-id`, `aria-expanded`, `aria-selected`,
`aria-valuetext`, `aria-level`. What it **does not**: `aria-checked`,
`aria-valuenow`/`min`/`max`, `aria-disabled`, `aria-invalid`, `aria-labelledby`,
`aria-describedby`, and any focus-visible distinction.

Consequences, all recorded in component rows:

- a checkbox/switch announces through `role` + `aria-valuetext`
  (`checked`/`unchecked`/`mixed`), not `aria-checked`;
- a slider/progress announces its value through `aria-valuetext`, never a
  numeric range;
- a visible label beside a standalone box is inert, because there is no
  association mechanism and text is not part of the click target. Put the label
  **inside** the interactive element (the `CheckboxGroup` row contract), or the
  control must name itself;
- text does not name an interactive ancestor: a text-only `Button` derives its
  name from its children in component code;
- a focus ring is a zero-blur, spread-only `boxShadow` applied while the
  component holds focus, so a mouse press shows it too. **On published 0.10.0
  that ring never appears**, because no focus event reaches the component (see
  below).

### Focus events

`HostProps` declares `onFocus` and `onBlur`, and `@gpuix/native` keeps focus
handles for anything with a `tabIndex`, a key listener or a focus listener. The
published 0.10.0 build nonetheless delivers **neither event**. Measured on this
host, 2026-10-19, against the release-tag build of plan 529 (`strings` reports
`focusVisible=0`, so it is not the main-derived artifact):

| Action | `getFocusedElementId()` | `onFocus` | `onBlur` | `onKeyDown` |
| ------ | ----------------------- | --------- | -------- | ----------- |
| mount | `null` | 0 | 0 | 0 |
| `renderer.focusElement(id)` + `dispatchNativeEvents()` | `1` | **0** | **0** | 0 |
| `renderer.focusNext()` + `dispatchNativeEvents()` | `1` | **0** | **0** | 0 |
| `nativeSimulateClick(x, y)` | `1` | **0** | **0** | 0 |
| `nativeSimulateKeyDown(id, "enter")` | `1` | 0 | 0 | **1** |

Focus itself is real: the id is reported exactly, and key delivery follows it.
Only the **events** are missing. Consequences:

- a component can **move** focus (`renderer.focusElement`, `focusNext`) and can
  **read** the focused id, but cannot be notified when focus arrives or leaves;
- every Tier 1 focus ring is paint-while-focused, so without a workaround it is
  absent on a 0.10.0 consumer install. The same 19-case focus matrix passes on
  the main-derived binding, so this is a runtime defect, not a component one;
- keyboard operation is unaffected: Tab order, key delivery, activation and the
  accessible name all work. The missing cue is the visible ring;
- **the ring is restored by a tracker** (plan `590`):
  `NativeFocusProvider` (mounted by `ThemeProvider`) samples
  `getFocusedElementId()` every 50 ms and publishes the focused host id; each
  control compares it with the id of the element that holds focus. The event
  state stays the primary path and is immediate on a runtime that dispatches
  events. Cost: at most 20 renderer queries per second per window and up to
  50 ms of ring latency. The sample can also **clear** a seeded or event state
  the runtime contradicts — otherwise an `autoFocus` control never stopped
  ringing — and a component's blur action can be driven from that transition;
  `NumberField` commits its draft that way (plan `591`). A **tooltip** opens on
  focus because its trigger forwards the slot's `ref`, so the wrapper can compare
  the trigger host with the sample (`ScrollArea` keeps its imperative ref and is
  the exception; plans `595`, `596`).
  The measurement and the deferred design are in plan `583`; the tracker is
  plan `590`.

### Animation and motion

`motion` transitions `width`, `height`, `top`, `right`, `bottom`, `left`,
`opacity` and `borderRadius`; springs, keyframes, variants, shared-layout
animations and **`repeat`** are absent, and colour is not interpolated. A target
change resumes from the current value. Therefore: a spinner cannot rotate (use
an indeterminate sweep or a step cycle), a looping animation is not honest (its
second cycle would rewind or remount), and a one-way position change is the
native fit — `Switch`'s thumb slides `left` 2 → 12 over 200 ms (plan `329`).
Measured in the `TestRenderer`: `clockFastForward(ms)` then `flush()` drives it
(`advanceTime` does not), and the painted `getElementBounds` follows the
transition.

### Text and input

Text is selectable (with `userSelect` and `selectionColor`), but there is no
rich-text editing, no editable code surface, no clipboard, and the native input
has no `type`/`min`/`max`/`step`/`maxLength`. Parsing, clamping and draft state
are component code. `Enter` submits an `<input>`; on a `<textarea>` it only
submits when `onSubmit` is set, at the cost of the newline. A multi-line clamp
is **not** `lineClamp` for the reason in §3: it is a per-element `maxHeight` plus
`overflow: hidden`, so it cuts without an ellipsis.

## 5. Documented on `main`, absent from published 0.10.0

Never copy these from `references/gpuix` into a 0.10.0 component.

| Feature | 0.10.0 evidence | Use instead |
| ------- | --------------- | ----------- |
| `aspectRatio` | absent from `StyleDesc` | set both axes |
| `borderStyle: "solid" \| "dashed"` | absent from `StyleDesc` | solid borders only |
| `outlineWidth` / `outlineColor` / `outlineOffset` | absent from `StyleDesc` | a spread-only `boxShadow` |
| `focusVisible`, `keyboardFocusDim` | no such style states; only `hover` and `active` | track focus state in the component |
| `scrollbarColor`, `scrollbarWidth` | absent from `StyleDesc` | the platform-themed thumb |
| `boxShadow` list and `inset` | `boxShadow` is a single outset object | one shadow; borders for inner edges |
| `onScrollChange`, `onLayout` | absent from `HostProps` | `getScrollOffset` for the offset; `onScroll` deltas + `getElementBounds` for the rest |
| `KeyEvent` on `onKeyDown` | `EventPayload` (`key`, `keyChar`, `isHeld`, `modifiers`, all optional) | decode key facts at the boundary |
| `registerFont` | not on `NativeRenderer` | installed family names |
| `Button` / `buttonProps` / `./button` | no such export path | our keyboard + naming contract |
| `Dialog` | no `Dialog` export | `./floating` + `div` + focus handles |
| `createPortal` | no export | render in place, or a tree-level overlay |
| `DismissableLayer` | no export | `onMouseDownOutside` + Escape |
| `useControllableState` | internal only, not exported | `core/state.ts` |

## 6. Consequences for components

These are library laws, not suggestions:

1. **Focus** is tracked state (there is no `focusVisible`); the ring is
   `focusRing(theme)` — zero-blur, zero-offset `boxShadow` with a spread. A
   headless part does **not** paint one for you: GPUix's `SelectTrigger` sets
   `tabIndex` and the key/click handlers but no focus state and no ring, so a
   themed wrapper tracks focus itself and rings while its popover is open too
   (plan `083`). **The published 0.10.0 runtime delivers no focus event**, so
   that tracked state cannot become true; see [Focus events](#focus-events) and
   plan `583`. Paint the ring from `onFocus` for runtimes that dispatch it, and
   state the limitation wherever a consumer meets the control.
2. **State for assistive technology** rides on `role`, `aria-valuetext`,
   `aria-selected`, `aria-expanded` and `aria-description`; there is no checked
   or numeric-value prop.
3. **Overlays anchor to the trigger, not the layout parent**: a stretched root
   measures the container, `align="center"` is half a panel off, and
   `fit="snap"` clamps without flipping. Measure, then choose `side`/`align`
   (plans `060`, `066`, `067`, `156`).
4. **Motion is size/position/opacity/radius only** — no rotation or transform.
5. **Scroll offset is not in the event payload** — `onScroll` carries deltas, but
   `renderer.getScrollOffset` reports the absolute, already-clamped offset, and
   a component-performed scroll dispatches no event at all. Read it from a
   wrapper: `ScrollArea`'s `onScrollPositionChange` covers both paths
   (plan `337`).
6. **Labels must live inside the interactive element**; there is no
   `aria-labelledby` and a sibling `<text>` is not clickable (plan `065`).

## 7. Verification status

The executable verdicts are the native smoke suite, recorded on this host
against a **locally built** `darwin-x64` 0.10.0 binding (ADR 0003). Its last
recorded run is **20/20 green** (exit `0`, `.artifacts/smoke-report.json` plus
screenshots; plan `140` §4 and `COMPONENTS.md`). Reproduce with:

```sh
nub run --filter playground build && nub apps/playground/dist/smoke/run.js
```

This document does not re-run the suite; the default suite runs the contract
test in `packages/primitives/src/capabilities.test.ts`. The rows the smoke suite
backs are listed in `COMPONENTS.md` ("Measured native evidence"): layout, text,
input, focus, overlay, modal, floating, scroll, panel, virtual-list, table,
tree, log, workspace and theme. Failing directions for the interaction
contracts are recorded in plans `140`, `150`, `151`, `155` and `156`.

The published-binary confirmation is a separate CI task in `TODO.md` (playground
workstream); this document does not claim it.

## 8. Re-verifying this table

Run from the repo root. The published declarations live in the package store, so
locate them once:

```sh
H=$(find -L node_modules -path '*@gpuix+native@0.10.0*' -name host.d.ts | head -1)
T=$(find -L node_modules -path '*@gpuix+native@0.10.0*' -name testing.d.ts | head -1)
test -n "$H" && test -n "$T"
```

Expected results:

```sh
grep -c 'export type ElementType' "$H"          # 1
grep -c 'aspectRatio' "$H"                      # 0 — main-only
grep -c 'borderStyle' "$H"                      # 0 — main-only
grep -c 'onLayout\|onScrollChange' "$H"         # 0 — main-only
grep -c 'registerFont' "$H"                     # 0 — main-only
grep -c 'class TestRenderer' "$T"               # 1
grep -c 'unverified' docs/gpuix-capabilities.md # at least 3
nub run --filter @gpuixui/primitives test       # the doc contract test passes
```

Focus events are a behavioural fact, not a type one. Reproduce the
measurement in [Focus events](#focus-events) with the focus matrix:

```sh
cd packages/primitives
nub exec vitest run --config vitest.runtime.config.ts runtime/focus-ring.runtime.test.tsx
# release-tag 0.10.0 build: 19 failed — "the control painted no ring"
# main-derived build:        19 passed
```

A release-tag build is identifiable before running anything: `strings -a
node_modules/.store/node_modules/@gpuix/native/gpuix-native.darwin-x64.node |
grep -c focusVisible` prints `0` (release) or `1` (main-derived).

If `$H` is empty, the pinned version changed: read the new declarations and
update the version row, the table and the contract test together. If any of the
five counts changes, the runtime changed the same way — re-measure before
trusting this document.

## 9. Attribution

The checklist of rows is re-expressed from `adabraka-ui`'s `GAP_ANALYSIS.md` §2
(MIT, `Copyright (c) 2025 Adabraka Team`, commit `e158684`) as a verification
checklist. `adabraka` targets **upstream GPUI** through a fork, so none of its
verdicts were copied; each was re-checked against the published GPUix 0.10.0
types above. No source or asset was copied. See `LICENSES/adabraka-ui.md`.

# GPUix capabilities — what the pinned runtime provides, what it does not

`MISSION.md` forbids presenting a capability the runtime lacks as if it worked.
This document is the durable record: one row per capability, the verdict, the
evidence, and the strongest honest alternative. Component plans and
`COMPONENTS.md`'s **GPUix support** column cite this file instead of restating a
verdict, and the documentation site publishes the reader-facing subset at
`/docs/runtime`.

**Pinned runtime:** `@gpuix/react` / `@gpuix/native` **0.11.0**, Apache-2.0. The
rows were re-read against the installed typings on 2026-10-21 — `StyleDesc`,
`HostProps`, `ElementType` and the host props in
`node_modules/@gpuix/native/dist/host.d.ts`, and the renderer methods in
`index.d.ts`. Where a row says *measured*, a probe in `apps/playground` reports
the fact from a real paint, not from a type; the probe id is in the row and its
measurement is in `apps/playground/README.md`.

**Two levels of evidence, kept apart.** A typed field proves an API is
*publishable*; only a probe proves it *paints*. A row marked `unverified` has
neither and must not be assumed to work.

## 1. Host elements

`ElementType` is exactly:

```ts
"div" | "text" | "img" | "svg" | "canvas" | "input" | "textarea" | "anchored" | "code" | "diff" | "markdown" | "virtual-list";
```

`canvas` is a blank host element — it appears in the union but has no
2D-context or draw props, so custom drawing is **not** available. `anchored`
positions its content and paints no surface of its own (the overlay packages put
the surface on a child `div`). `virtual-list` takes an item count and a row
renderer, so a compound-children list cannot be virtualized through it.

## 2. Provided by the runtime

Headless React components in `@gpuix/react` 0.11.0: `Select` + parts, `Combobox`
+ parts, `Tooltip` + parts, `Button`/`buttonProps` (`@gpuix/react/button`),
`Dialog` + parts, `AnimatePresence`/`motion`, and `floating`'s `FloatingLayer`,
`renderSlot`, `useControllableState`, `mergeStyles` and `StateStyle`. These give
behaviour and positioning; they ship no visual design.

Renderer methods the library builds on (`@gpuix/native` `index.d.ts`):
`focusElement`, `focusNext`, `focusPrevious`, `focusNextWithin`,
`focusPreviousWithin`, `getFocusedElementId`, `getElementBounds`,
`getElementsAt`, `getAllText`, `getPaintedText`, `getPaintedHighlights`,
`getScrollOffset`, `getSelectedText`, `promptForPaths`, `registerFont`,
`setImage`, `setImagePixels`, and the `simulate*`/automation surface the tests
drive.

## 3. The limits

Verdicts: **supported** · **supported, with limits** · **not supported** ·
**unverified** (absent from the typings and not measured — never assume it).

| Capability | Verdict | Evidence | Workaround |
| ---------- | ------- | -------- | ---------- |
| Flexbox and grid | supported | `StyleDesc.display`, `flexDirection`, `flexWrap`, `gap`/`rowGap`/`columnGap`, `alignItems`, `justifyContent`; `gridTemplateColumns`/`Rows` are integers | — |
| Grid span | not supported | no `gridColumn`/`gridRow`; only `gridColumnMin`/`gridRowMin` track sizing | size the track, or give the item an explicit width |
| Two-stop linear gradients | supported, with limits | `LinearGradientBackground.stops` is a 2-tuple; `angle` in degrees; `colorSpace` `srgb` or `oklab` | — |
| Multi-stop, radial, conic, repeating gradients | not supported | the stop tuple holds exactly two | paint a stack of divs, or an `svg` |
| `boxShadow`, including `inset` | supported | `BoxShadow` is a structured object with `inset` | — |
| Per-corner radii, per-side border widths, a two-value `borderStyle` | supported | `StyleDesc` corner and side fields; `borderStyle` is `solid` or `dashed` | — |
| Opacity | supported | `StyleDesc.opacity` | — |
| `aspectRatio` | supported | `StyleDesc.aspectRatio` — width divided by height | — |
| Text truncation | supported | `whiteSpace: "nowrap"`, `textOverflow` with `ellipsis` and `ellipsis-start`, `lineClamp` | — |
| Per-element `transform` / `rotate` / `scale` / `translate` / `skew` | not supported | no such field in `StyleDesc` | animate the numeric `MotionStyle` fields with `@gpuixui/motion`; static rotation/scale is unrepresentable |
| `zIndex` / stacking order | not supported in the published API | no `zIndex` in the published `StyleDesc`; paint order is tree order, so an overlay must render last (`toast.mdx`, `tabs.mdx`) | render the surface last in the tree. **The repo's source-built `darwin-x64` binding carries a local `zIndex` patch** (`apps/playground/patches/gpuix-zindex.patch`) — do not write against it in library code |
| Sticky positioning | not supported | **measured** by `data-grid-fixed-header`: a `position: "sticky"` child inside its scroller moved by exactly the scroll amount, i.e. it paints as `relative`. `position` is typed `string`, so the type does not say this | put the header **outside** the row scroller as a sibling; wrap header and rows in one `overflowX` scroller so both move together |
| `backdropFilter` / per-element blur | not supported | no such field; blur exists only as the window backdrop | use an opaque or translucent fill |
| Window backdrop vibrancy (`windowBackground: "blurred"`) | unverified | declared as a macOS window option; no probe paints one on this host | use an opaque or translucent window and fill |
| CSS `filter`, `clip-path`, blend modes, text shadow | not supported | absent from `StyleDesc` | compose the effect from `div`/`svg` layers |
| CSS shorthand and `calc()` strings | not supported | values are numbers or colours, not a CSS string | `@gpuixui/tw` resolves a numeric `calc()` to a number before it reaches the runtime |
| Keyframe animations, variants, shared-layout transitions | not supported | `MotionProps` drives `width`, `height`, `opacity`, `top`, `right`, `bottom`, `left`, `borderRadius` with duration/delay/ease | `@gpuixui/motion` springs over those fields; a cross-fade is `opacity` |
| Animation interruption | supported | a target change starts the next transition from the current visible value | — |
| Reduced-motion detection | unverified | no documented media query or runtime flag | keep motion optional and short; do not claim a reduced-motion mode |
| Custom paint | not supported | `canvas` is in `ElementType` but blank | render `svg`; there is no retained draw API |
| Inline SVG painting | supported, with limits | `<svg source>` paints its markup, but **as one tint**: `@gpuix/native`'s `SvgElement` renders through GPUI's icon element, so the whole markup is masked in `style.color` and a shape's own `fill` never reaches the frame. **Measured** by `content-surfaces`: all five shapes painted in the one source tint, while five stacked `<svg>` elements each painted their own (bar green, bubble blue, line red, axis yellow, label orange); `<text>` inside the markup paints | stack one `<svg>` per colour — a multi-series chart is one element per series; labels can live in the markup, but a gradient or a per-shape palette inside one element is not available |
| Container queries | not supported | no such field; `useWindowSize` is the responsive hook | measure the box (`onLayout`, on `div`/`text`) or `useWindowSize` and branch in the component |
| Canvas drawing | not supported | as above — no 2D context, and **measured** by `content-surfaces`: a `<canvas>` tracks no painted bounds and paints nothing, so the fill behind it shows through | as above |
| IME composition | not supported | no composition events reach React | compose from `onInput`/`onKeyDown` at the application layer; live IME preview needs a runtime change |
| Global / system shortcut | not supported | key events fire only while the window is focused | window-level `onKeyDown`; a background hotkey needs a runtime change |
| Tray / menu bar / status item | not supported | no such host | ship an in-window menu |
| Native view / webview / embedded browser | not supported | no child-view host | `markdown`/`code`/`diff` surfaces |
| Image painting | supported, with limits | `<img>` paints a path, an http(s) URL and a data-URL PNG; a pixel buffer through `ref.setImagePixels(width, height, …)` paints **only from a layout effect** — from a passive `useEffect` the element keeps its `img: no src` fallback. **Measured** by `content-surfaces` in both directions | upload pixels in `useLayoutEffect`/`useEffect`-before-paint (the upstream waveform example's pattern, not a preference); a data URL needs no timing |
| Terminal rendering | supported | `render(<App />, { terminal: true })`, `isTerminal()` | — |
| Headless dialog | supported | `@gpuix/react/dialog` owns the Escape layer and the Tab trap | the library keeps its styled compound `Dialog` so it can theme it; the headless one is not wrapped |
| Tab / Shift+Tab focus traversal | supported, with limits | native tab order; `focusNext`/`focusPrevious`/`focusNextWithin` move focus from code. A synthetic `"tab"` key does not traverse the offscreen `TestRenderer` | drive traversal through the renderer calls in tests |
| Pointer, keyboard and focus events | supported, with limits | `HostProps.onClick` (primary only), `onAuxClick`, `onMouseDown`/`Up`/`Move`/`Enter`/`Leave`, `onMouseDownOutside`, `onKeyDown`/`Up`, `onFocus`/`onBlur`, `onLayout` (`div`/`text` only). **Measured:** a `Tab` traversal moves focus without running React's `onFocus` — `tooltip-lifecycle` reports `focuses=0` and a tip that stays closed, `tabs-lifecycle` the same counter | read the key event's own `elementId` (the `Tabs` move origin does) or `getFocusedElementId`; publish what a focus-only surface would show as `aria-description`, as the tooltip does |
| Scroll events | supported, with limits | both listeners fire, and they report **different** things. **Measured** by `scroll-lifecycle`: `onScroll`'s `deltaX`/`deltaY` is the wheel input the window received — a `-100000` wheel reports `-100000` after the offset travelled 200px and clamped — while `onScrollChange`'s `scrollX`/`scrollY` is the clamped absolute pair `getScrollOffset` returns | a scrollbar, a saved position or a "follow the tail" scroller reads `onScrollChange`; use `onScroll` only for the gesture's own delta |
| Pointer capture | supported, with limits | `renderer.rs` arms GPUI's pointer capture on a left mouse down **only** for an element that listens to both `onMouseDown` and `onMouseMove` (the host's `mouseDown`/`mouseMove`); **measured** by `pointer-capture`: the paired sample kept all eight moves and its release 120px outside its box (`both=8 bothUnder=0 bothUp=1`), a move-only sample got the one pre-press move and the sibling received the eight (`move=1 moveUnder=8`), and the shipped `Slider` followed a drag that left its track (`slider=66 sliderChanges=9`) | a splitter, drag handle or slider must subscribe to **both** `onMouseDown` and `onMouseMove`; a move-only element captures nothing, so the element under the pointer resolves the drag |
| Text selection | supported | `userSelect`, `selectionColor`, `getSelectedText()`; **measured**: `dragSelect` fills the selection for selectable text and nothing for chrome | — |
| Caret and selection **position**; decoration over `<code>` | not supported | **measured** by `editor-surface`: the arrow keys move the native caret, but no API reports where it is or what is selected (`getSelectedText()` returns text only), and `<code>` takes `language`/`showLineNumbers` and no decoration layer | edit in a `<textarea>`, display in `<code>`; a highlighted *editable* surface is not buildable |
| Find-in-content highlights | supported | `highlight` spec (`query`, `caseSensitive`, `wholeWord`, `ranges`, `activeIndex`) plus `getPaintedHighlights()`; **measured** by `search-highlights` | — |
| File drops | unverified | `onFileDrop` is declared on `HostProps`; no probe mounts a drop | accept a path through `promptForPaths` until a probe measures a drop |
| Virtualized list | supported, with limits | `<virtual-list>` retains thousands of rows and paints a window (~9 rows in the probe) | read the painted window, not the index |
| `role` and the `aria-*` subset | supported, with limits | `role`, `aria-label`, `aria-description`, `aria-id`, `aria-expanded`, `aria-selected`, `aria-valuetext`, `aria-level`. **No** `aria-checked`, `aria-valuenow`, `aria-labelledby`, `aria-describedby`, `aria-orientation`, `aria-controls`, `aria-disabled` | name each control through its own `label`/`aria-label`; put a numeric value in `aria-valuetext`; there is no `labelledby` relationship |

## 4. Accessibility and motion, cross-cutting

The gap components cite most often is the aria subset above: a checkbox cannot
announce `checked`, a slider cannot announce a numeric value, and a control
cannot be named by a sibling `Label`. Each component documents the consequence
on its own page rather than implying the attribute exists.

A keyboard traversal moves focus **without running React's `onFocus`** —
measured by `tooltip-lifecycle` (the trigger is focused, the tip stays closed)
and `tabs-lifecycle` (`focuses=0`). A component that reveals something on focus
therefore reads the key event's own `elementId` or `getFocusedElementId`, and
anything a sighted user sees only on focus is also published as
`aria-description`, which the runtime does deliver.

Assistive technology sees a node only when it has **both** an id (always set) and
a `role`; `"none"`/`"presentation"` remove the node. Focus rings are painted by
`focusVisible`, which is measured to paint after Tab and never after a mouse
press — the tokens package owns the helper (`keyboardFocusRing`) and the policy.

Motion is springs over numeric fields only, with no keyframes and no
reduced-motion flag; the state-driven design rule is to make motion optional and
short, never the carrier of meaning.

## 5. Keeping this document true

- `apps/docs/src/lib/capability-doc.test.ts` reads this file and holds the rows
  whose capability is encoded in `@gpuixui/runtime`'s `capabilities` matrix to
  that matrix: a row and the code cannot disagree about whether the runtime
  supports something, and a new matrix key without a row fails by name.
- The same test holds `/docs/runtime` to this file: the site's *measured in a
  window* section must name the probes behind every gap it lists
  (`data-grid-fixed-header`, `editor-surface`, `tooltip-lifecycle`,
  `tabs-lifecycle`, `scroll-lifecycle`, `pointer-capture`, `content-surfaces`),
  because a measured gap is absent from the typings rather than merely hard to
  find.
- The probe measurements themselves are asserted by the suite
  (`apps/playground`), not here: this document records the verdict and points at
  the evidence.

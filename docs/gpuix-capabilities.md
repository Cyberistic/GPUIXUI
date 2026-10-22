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
the surface on a child `div`). `virtual-list` takes either children — retained in
the React tree, with only the off-screen build and paint skipped — or
`itemCount` + `estimatedItemHeight` + `windowStart` plus a row renderer, where the
app mounts the slice; a compound-children list therefore cannot be truly windowed
through it.

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
| Frozen column | supported, with limits | **Composed, not provided** — with no sticky, a frozen first column is the header rule on the other axis, and **measured** by `data-grid-frozen-column` (a 120px label pane beside a 240px grid over 60 × 28px rows): a wheel over the grid moves both panes to `-300` and a wheel over the frozen column moves both to `-600`, because the app mirrors `onScrollChange` into `scrollTo` on the other pane in **both** directions; the row under the reader keeps its `y` across panes; a `deltaX` wheel pans the grid 200px and leaves the frozen column still (a frozen column does not pan); a press on a frozen cell selects the row for the whole grid; and a `-10000` wheel clamps both panes at the same `-(60 × 28 − 240) = -1440` | compose two scrollers, one per pane, and mirror their offsets through `onScrollChange` + `scrollTo`, guarding the echo with a **ref** — `scrollTo` paints synchronously, so the target's own change arrives inside the call and would otherwise mirror back. Share one row identity, set `overflowX` only on the pane that pans, and expect no single-scroller freeze |
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
| Portals | supported, with limits | `createPortal` is published, and **measured** by `portal-layer` in a window: a portalled card paints inside its **target's** box, outside an ancestor's clip, keeps the React context provided above the caller, receives a pointer press and keys typed in its field, and unpaints when detached; adding it back paints it again. Two measured limits: `getPaintedText` still lists a clipped sibling's glyphs although no pixel reached the frame, and a clip only holds when the clipping box is the child's containing block (`position: "relative"`, as in CSS). The binding opens one window per process and has no drag host feature, so a portal moves content to another layer **in the same window** | render a floating surface through `createPortal` when it must escape a clip; prove a clip from a capture rather than the paint report; give the clipping box `position: "relative"`; a detached tab is a layer or pane move in the **same window**, not a second OS window |
| Tab / Shift+Tab focus traversal | supported, with limits | native tab order; `focusNext`/`focusPrevious`/`focusNextWithin` move focus from code. A synthetic `"tab"` key does not traverse the offscreen `TestRenderer` | drive traversal through the renderer calls in tests |
| Pointer, keyboard and focus events | supported, with limits | `HostProps.onClick` (primary only), `onAuxClick`, `onMouseDown`/`Up`/`Move`/`Enter`/`Leave`, `onMouseDownOutside`, `onKeyDown`/`Up`, `onFocus`/`onBlur`, `onLayout` (`div`/`text` only). **Measured:** a `Tab` traversal moves focus without running React's `onFocus` — `tooltip-lifecycle` reports `focuses=0` and a tip that stays closed, `tabs-lifecycle` the same counter | read the key event's own `elementId` (the `Tabs` move origin does) or `getFocusedElementId`; publish what a focus-only surface would show as `aria-description`, as the tooltip does |
| Scroll events | supported, with limits | both listeners fire, and they report **different** things. **Measured** by `scroll-lifecycle`: `onScroll`'s `deltaX`/`deltaY` is the wheel input the window received — a `-100000` wheel reports `-100000` after the offset travelled 200px and clamped — while `onScrollChange`'s `scrollX`/`scrollY` is the clamped absolute pair `getScrollOffset` returns | a scrollbar, a saved position or a "follow the tail" scroller reads `onScrollChange`; use `onScroll` only for the gesture's own delta |
| Pointer capture | supported, with limits | `renderer.rs` arms GPUI's pointer capture on a left mouse down **only** for an element that listens to both `onMouseDown` and `onMouseMove` (the host's `mouseDown`/`mouseMove`); **measured** by `pointer-capture`: the paired sample kept all eight moves and its release 120px outside its box (`both=8 bothUnder=0 bothUp=1`), a move-only sample got the one pre-press move and the sibling received the eight (`move=1 moveUnder=8`), and the shipped `Slider` followed a drag that left its track (`slider=66 sliderChanges=9`) | a splitter, drag handle or slider must subscribe to **both** `onMouseDown` and `onMouseMove`; a move-only element captures nothing, so the element under the pointer resolves the drag |
| Text selection | supported | `userSelect`, `selectionColor`, `getSelectedText()`. **Measured** by `selection-lifecycle` with a real pointer in a window: a drag over a selectable `Text` paints the wash, `getSelectedText()` reports the run (`ection world`), `Cmd+C` pastes that same run into a field, `clearSelection()` clears the wash, and a default (chrome) `Text` paints none. The headless `text-selection` scenario only drove the renderer's own `dragSelect`, so the pointer path had no proof before this | give a selectable line a box that hugs its glyphs (`alignSelf: "start"`) — a press that lands past the last glyph selects nothing. Offer "select and copy" as the user's own gesture: `getSelectedText()` reads the selected run, while an **initiated** copy from a button has no API (the two clipboard rows below) |
| Caret and selection **position**; decoration over `<code>` | not supported | **measured** by `editor-surface`: the arrow keys move the native caret, but no API reports where it is or what is selected (`getSelectedText()` returns text only), and `<code>` takes `language`/`showLineNumbers` and no decoration layer | edit in a `<textarea>`, display in `<code>`; a highlighted *editable* surface is not buildable |
| Find-in-content highlights | supported | `highlight` spec (`query`, `caseSensitive`, `wholeWord`, `ranges`, `activeIndex`) plus `getPaintedHighlights()`; **measured** by `search-highlights` | — |
| App-level clipboard (read or write from a component) | not supported | the binding declares **no clipboard API** — no read, no write in `index.d.ts`/`host.d.ts` — and **measured** by `clipboard-lifecycle`: the platform's copy and paste keys run inside a focused field but never reach the app's window handler (a `cmd-k` from the same control does), so a component cannot put a selected text run, a table row or a `<code>` block on the clipboard | offer the text in a read-only field the user can select and copy from; a "copy" button has no path to the OS clipboard |
| Clipboard keys inside a focused field | supported, with limits | the platform's text actions run in the field: **measured** by `clipboard-lifecycle` against a marker unique to each mount — select-all → copy → paste → cut all reach the input's `onChange`, so a paste cannot pass on the previous run's clipboard | copy and paste are the user's own actions inside a field; an application-level clipboard needs a runtime change |
| File drops | supported, with limits | `onFileDrop` is declared on `HostProps`, and **measured** by the headless `file-drop` scenario, which drives the renderer's own `nativeSimulateFileDrop` — the same `FileDrop::Entered` then `Submit` pair a Finder drag produces: two absolute paths arrive in order (`/tmp/alpha.txt,/tmp/beta.txt`), and a drop on a sibling reaches no handler, so a target is a painted region rather than the window. A **live** OS drop is not automatable (the window protocol has no file-drop command), and a drop is swallowed while a text field holds the platform's input session until a press ends it | handle `onFileDrop` on a zone that has painted bounds; end a field's text session (a press elsewhere) before expecting a drop, and keep `promptForPaths` as the keyboard path |
| Floating layer placement | supported, with limits | `FloatingLayer` and `<anchored>` position a surface and paint no chrome of their own. **Measured** by `floating-sides` in a window: `side="right"` puts the panel's left edge one 6px gap off the anchor's right edge, `side="left"` mirrors it, `align="start"` holds the panel's top on the anchor's top — and **`align="center"` ends the panel at the anchor's centre line instead of centring it**, so the panel starts half its height low. The headless `floating-placement` scenario runs the engine against the `TestRenderer`; this row is the window, because the two can differ | use `side` with `align="start"` when the panel's box matters; where `align="center"` is genuinely wanted, offset the panel yourself by half its measured height, as the overlay components do |
| Select option reveal | supported, with limits | `Select` + parts are provided, and **measured** in a window by `select-lifecycle`: the list paints in its own layer one 6px gap below the trigger's start edge, takes the focus, opens on the selected row, moves the highlight with the arrows (wrapping past a disabled row), selects on `Enter`, and dismisses on `Escape` (returning the focus) or an outside press. **The keyboard cannot reveal a row past the list's edge**: the runtime's content sets no `maxHeight`/`overflow` and `SelectScrollUpButton`/`SelectScrollDownButton` are empty elements in 0.11.0, so `packages/primitives`' `fields.runtime.test.tsx` caps a 40-option list at 320px and moves it on the **wheel** (`-200`) while twenty `ArrowDown`s leave the offset where it was | cap the surface yourself and make it a scroller (the shipped `Select` caps at 320px and the wheel scrolls it); keep a keyboard-critical list short, or use a `Combobox`/`SearchInput` composition where the query narrows it — reveal-on-highlight needs a runtime change |
| Virtualized list | supported, with limits | `<virtual-list>` has **two modes**. The **children** form retains every row and the runtime skips only the off-screen build and paint (~9 of 5 000 in `virtual-list-lifecycle`); the **`itemCount`** form — `itemCount` + `estimatedItemHeight` + `windowStart` — mounts only the slice the app renders and positions it by index. **Measured** by `virtual-list-windowed` (100 000 logical rows, a 60-row window, a 280px viewport): only the window is retained (`wrow-60` is absent from the tree), the estimate positions mounted rows the paint never reached, `onVisibleRange` reports **absolute** indices (`20..27`) but lags the paint by one gesture (the paint had reached `40..46`), a press on a painted row reports that row's absolute index, and `scrollToItem(90000)` paints `File 90000` at `-90000 × 28` after the app moved its window. **Measured** by `virtual-tree-lifecycle` in the children form (4 000 flat rows in a 280px viewport): `renderer.scrollToItem(list, 3000)` reveals a row that was never mounted and `getListScrollTop` anchors at `itemIndex=3000` with the list's own 278px viewport (the frame's height minus its two 1px borders), a programmatic reveal fires **no** `onVisibleRange`, and changing the flattened child count reports indices computed against the spliced list (`1..2`, `0..1`) rather than the painted rows. Roving focus works from a row's own key handler through `renderer.focusElement`, so a tree keeps one focus and moves it. **Measured** by `virtual-list-rows` (400 rows cycling 24 / 48 / 72px): each painted row keeps its own height and starts where the previous ended, `scrollToItem(150)` lands that row at the viewport's top edge from estimates alone, and growing row 0 by 40px while the reader sits at row 150 leaves both the painted rows and the offset untouched — a row outside the window is not remeasured until it paints again — while returning to the top paints it at 64px and pushes row 1 down by the growth. `onVisibleRange` also carries the window from *before* a scroll in both modes (`virtual-list-lifecycle`, `first=0 last=9` while rows 13–21 paint) | reveal by index with `scrollToItem`; in `itemCount` mode move the app's `windowStart` **first** and scroll after that commit, because the window is app state native cannot infer. Size the window wider than the viewport plus overdraw (60 rows against 280px) so the one-gesture lag cannot expose native's empty estimate boxes. Measure an expandable or streamed row while it is **on screen** — a row that grows outside the window keeps its old height until it paints again. Read the painted rows or the anchor (`listAnchor`), not the index, and never paginate from `onVisibleRange` across a row-count change; a tree moves native focus with `focusElement` instead of mounting a tab stop per row |
| Links and anchors (`href`) | not supported | `ElementType` has no `a`, and `HostProps` declares no `href`; the inventory's Breadcrumb, Navigation Menu and Lists rows record the same absence | render a pressable `<text>` (the library's link-styled button) and show the destination beside it. There is no visited state, no middle-click and no pointer cursor |
| Form grouping (`fieldset` / `legend`) | not supported | `ElementType` has no `fieldset`; the shipped `Fieldset` is a `role="group"` div with a legend-styled text | compose the group from a div and a text; a group-level disabled state is not announced either, because there is no `aria-disabled` |
| Context menu event (`onContextMenu`) | supported, with limits | `HostProps` declares no `onContextMenu`; a right press arrives as `onAuxClick`, which `isRightClick` distinguishes. The shipped `ContextMenu` uses that path — 17 native cases and, **measured**, `context-menu-lifecycle`: the surface lands at the press point | handle `onAuxClick` and place your own surface at the pointer, as the shipped `ContextMenu` does |
| Paste event (`onPaste`) | not supported | `HostProps` declares no `onPaste`; the platform's paste runs inside a focused field and reaches `onChange` with the new value, **measured** by `clipboard-lifecycle` | read the pasted text from the new value in `onChange`. There is no paste payload, caret or insert-at-selection API, so an `OTPField`'s paste is unverified |
| Live regions (`aria-live`, `aria-atomic`) | not supported | the `aria-*` set below is closed and has no live-region attribute, so a container cannot declare one; `Toast` paints `role="status"` as a marker and does not claim an announcement, and `Countdown` and `MessageScroller` document the same gap | move the focus to the new message, or name the control that changed; do not present a toast or a ticking countdown as announced |
| `role` and the `aria-*` subset | supported, with limits | `role` plus exactly seven `aria-*` attributes: `aria-label`, `aria-description`, `aria-id`, `aria-expanded`, `aria-selected`, `aria-valuetext`, `aria-level`. **No** `aria-checked`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-labelledby`, `aria-describedby`, `aria-orientation`, `aria-controls`, `aria-disabled`, `aria-pressed`, `aria-haspopup`, `aria-current`, `aria-activedescendant`, `aria-live` or `aria-atomic` | name each control through its own `label`/`aria-label`; put a numeric value in `aria-valuetext`; there is no `labelledby` relationship, no pressed or checked state and no live region |

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
  `tabs-lifecycle`, `scroll-lifecycle`, `pointer-capture`, `content-surfaces`,
  `selection-lifecycle`, `clipboard-lifecycle`, `virtual-tree-lifecycle`,
  `virtual-list-windowed`, `virtual-list-rows`, `portal-layer`,
  `data-grid-frozen-column`, `select-lifecycle`, `floating-sides`), because a
  measured gap is absent from the typings rather than merely hard to find.
- The five absences the typings alone prove — links (`href`), `fieldset`,
  `onContextMenu`, `onPaste` and the closed `aria-*` set — are held from both
  sides too: a row dropped from this file, a page row dropped from
  `/docs/runtime`, or an `aria-*` absence the inventory names but this file does
  not, fails by name.
- The probe measurements themselves are asserted by the suite
  (`apps/playground`), not here: this document records the verdict and points at
  the evidence.

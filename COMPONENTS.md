# COMPONENTS.md — inventory, status, limitations

The inventory is a **target**, not permission to fake unsupported things. A row
may only move to `done` when the component has: code, a test appropriate to its
behaviour, at least one working example, a docs page, and a verified interaction
in the real runtime (or a documented, evidenced limitation).

Status: `todo` · `wip` · `done` · `blocked (reason)` · `unsupported (evidence)`

Every row also records **GPUix support** and, when it is not `yes`, the evidence
and the strongest honest alternative.

## How the two evidence columns are decided

The **GPUix support** column answers *does GPUix already provide this
primitive?* — `yes`, `?` (unknown or partly documented) or `unsupported` — read
from the published `@gpuix/react` / `@gpuix/native` 0.10.0 types by the
reference-adoption workstream (plan `203`). It describes the runtime's API
surface, not our status.

**Measured native evidence** is separate, and it is what a `done` row needs. It
comes from the native smoke suite in this repo, run **on this host** against the
pinned `@gpuix/native@0.10.0` built from the pinned source with
`gpui_macos/runtime_shaders` (ADR 0003). Reproduce it with:

```sh
nub run --filter playground build && nub apps/playground/dist/smoke/run.js
```

| Capability | Scenario | Verdict |
| ---------- | -------- | ------- |
| layout | `layout-flex`, `shell-navigation`, `shell-selection` | verified |
| grid-layout | `layout-grid` | verified |
| typography | `typography-layout` | verified |
| text | `text-native` | verified |
| input | `input-edit`, `text-entry` | verified |
| focus | `focus-traversal`, `roving-focus`, `tab-strip-focus`, `live-focus` | verified |
| overlay | `overlay-dialog` | verified |
| modal | `modal-focus-trap` | verified |
| floating | `floating-placement` | verified |
| select | `select-choose` | verified |
| combobox | `combobox-filter` | verified |
| tooltip | `tooltip-open` | verified |
| scroll | `scroll-container`, `scroll-into-view`, `tab-strip-overflow` | verified |
| panel | `panel-resize`, `panel-nested` | verified |
| virtual-list | `virtual-list-window`, `variable-rows`, `live-table` | verified |
| table | `table-select-sort`, `table-column-resize`, `virtualized-table`, `live-table`, `live-table-sort` | verified |
| tree | `tree-view`, `virtualized-tree` | verified |
| log | `log-viewer` | verified |
| workspace | `workspace-tab-drag`, `workspace-restore`, `live-restore`, `workspace-panes` | verified |
| docking | `docking-layout` | verified |
| float | `float-tab`, `live-float` | verified |
| preview | `preview-card`, `live-preview` | verified |
| command | `command-palette` | verified |
| theme | `theme-color-roles`, `theme-type-and-shadow`, `theme-platform` | verified |
| a11y | `a11y-tree` | verified |
| motion | `motion-collapse`, `collapsible-height`, `live-motion` | verified |
| content | `native-surfaces`, `markdown-surface` | verified |
| drag | `drag-targets`, `drag-autoscroll` | verified |
| selection | `text-selection`, `live-selection` | verified |
| menu | `context-menu-pointer`, `live-context-menu` | verified |
| components | `primitives-actions`, `primitives-fields`, `primitives-display`, `primitives-choice`, `primitives-entry` | verified |
| search | `search-highlights`, `live-highlights` | verified |
| terminal | `terminal-grid` | verified |
| chart | `chart-svg` | verified |
| toast | `toast-lifecycle` | verified |
| grid | `grid-wide-table` | verified |
| data-grid | `data-grid-virtual` | verified |
| layers | `nested-layer-dismiss` | verified |
| scroller | `message-scroller` | verified |
| tier2 | `tier2-dialog`, `tier2-menu`, `tier2-toast` | verified |
| replace | `replace-contract`, `live-replace` | verified |
| states | `declared-styles` | verified |
| truncation | `text-truncation` | verified |

The suite is **71/71 green here** (exit `0`, `.artifacts/smoke-report.json`,
1951 checks).

A second, smaller suite runs the shipped playground in a **real window**
(`nub run --filter playground smoke:live`, plan `189`) and is **22/22 green
here**: `layout`, `input`, `scroll`, `panel`, `motion`, `overlay`, `focus`,
`selection`, `menu`, `docking`, `float`, `components`, `table`, `search`,
`preview`, `scroller`, `workspace` (restore), `table` (sort and selection) `tier2` and `replace` are confirmed there too
— the shell fills the window and navigates by click and
Enter, typing reaches `onChange`/`onSubmit` in a live editor, a modal opens
centred and Escape closes it, a wheel moves a live container with its
`onScroll` delta, a paced divider drag resizes a live split (`320 → 400`), a
paced tab drag onto a pane edge splits it (`panel-1=notes@notes`), a virtual
row is hit-testable and its list scrolls while keeping the selection, and the
**shipped** `Button`/`Toggle` run (`live-primitives`). **`live-focus` (plan
`190`)** proves focus in the window: it enters the modal, Tab walks
`a → b → open-popover → close` and wraps back to the content, Shift-Tab is the
reverse, Escape returns focus to the trigger, and a nested popover's Escape
closes only the popover and returns focus to its opener. **`live-selection`
(plan `191`)** proves copy with a real pointer: a drag across three text nodes
selects them, a drag anchored in `userSelect: "none"` selects nothing, a
crossing drag keeps both sides and excludes the chrome, and `clearSelection`/a
click empty it. **`live-motion` (plan `192`)** pauses the live clock and reads
an exact 96 px frame at 80 ms of a 200 ms / 240 px linear collapse, the inner
pane's unchanged 240 px, one `onMotionComplete` per tween, and the
`AnimatePresence` exit (the toast stays painted until it settles); the one
difference from the headless run is that `onExitComplete` fires **twice** live
for one exit, so a handler must be idempotent. **`live-context-menu` (plan
`193`)** proves a real right click opens a menu at the pointer (its painted box
within 1 px of the click), dismisses by an outside press and Escape, and keeps
the placement inside a **scrolled** container where an item below the viewport
stays hittable. **`live-float` (plan `195`)** tears a tab out of the strip with a
paced drag, opens the panel at the release point within 1 px, drags its title bar
to an exact position, focuses its tab, closes it on Escape with focus back on the
dock, and closes a reopened float from its button. It also caught a **live-only**
race: the drag-ending click re-applied the pre-drag dock from a stale closure and
resurrected the torn-off tab, which the headless `press`/`releasePointer` gesture
cannot reproduce; the tab click now uses a functional `setDock((current) => ...)`.
The live host reads the renderer it created when the automation protocol has no
verb: `getFocusedElementId` (mapped back to a `testId` through the automation
tree), and — plan `197` — `getPaintedHighlights`, `scrollToItem` and
`getListScrollTop`. **`live-highlights`** mounts the find probe in the window
and asserts four document washes with window-space rects inside their line,
clear/restore repainting, the find cursor moving, and document-wide
`matchIndexOffset` numbering after a jump to row 90; **`live-table`** asserts
the exact logical anchor `[0, 0, h]` and `[120, 0, h]` after
`scrollToItem(120)`. **`live-preview` (plan `199`)** is the first live hover probe: a real
`mouse.move` opens the card, the pointer reaches the body, the fire-time
presence check keeps it open past the 200 ms close, a control inside the
hover-opened card clicks, the grace close fires from the last hovered child, a
re-enter cancels, and a final leave closes (`closes=2`). It also measured that
the card's enter and the trigger's leave arrive in **one React batch** live, so
a `prev`/`last` readout collapses them while an append-only log keeps both.
Colour and the accessibility dump stay `TestRenderer`-only
for a measured reason, not an assumption: the live automation tree carries
`id`/`type`/`testId`/`bounds` and **no `style`**, and `GpuixRenderer` exposes no
a11y method (`getA11yTree` is on `TestRenderer` alone).
One harness rule the shell probe added: every scenario mounts under a `Fragment`
keyed by its id, because React otherwise reconciles consecutive views that share
a component type and keeps their state — two `<App>` scenarios shared the
sidebar's native scroll offset, so a later click landed outside the viewport
(plan `182` §7). A full run is a fresh mount per scenario.
What it settled, and what changed the plans: focus/blur events **do** work on
0.10.0 (they never did on 0.5.1); component code **can** move native focus
through `useGpuix().renderer.focusElement`, and `focusNextWithin` /
`focusPreviousWithin` cycle within a container, which is the dialog's Tab trap
(the trap wraps: `content → a → b → open-popover → close → content`);
Escape in a nested layer closes only that layer; **`<anchored align="center">`
is off by half the panel size** (it ends the panel at the anchor's centre line)
and `fit="snap"` clamps a layer inside the window **without flipping it**, so a
bottom-side menu can cover its trigger; synthetic wheel scrolling
**does** work
(`deltaY` negative scrolls down, the opposite of the DOM); a `<virtual-list>`
**retains** every row but **paints** a window (~9 of 5 000); an `<anchored>`
paints no surface of its own, so overlay handlers belong on the content div;
`autoFocus` takes native focus without dispatching `onFocus`; and the app-level
window key handler (`render({ onKeyDown })`) receives a keystroke after the
focused element's `onKeyDown` — the command-palette / application-menu path.
`shell-navigation` adds the shell's own rule: a flex child needs `minHeight: 0`
before `overflowY: "scroll"` can make it scroll, which is what keeps the
15-entry sidebar reachable in the 720px window.

`motion-collapse` measures the native tween that collapsible sidebars, drawers,
accordions and toasts depend on. The paused motion clock
(`TestRenderer.clockPause` + `clockFastForward`) makes it exact: 80 ms into a
200 ms linear width tween moved the laid-out edge **96 px of 240**, the inner
pane kept its **240 px** width while the outer container clipped it (no
reflow), and `AnimatePresence` kept a leaving toast mounted until the native
exit settled. Two caveats: `onMotionComplete` reaches React only after
`dispatchNativeEvents()` (the same requirement as `focusNext`), and the
published `motion.div` prop type omits `testId`/`role`/`aria-*`, so an animated
surface is not directly addressable by a smoke test or an accessible role
without a typed wrapper.

`collapsible-height` answers the height half of the same question, and the
TODO on the shipped `CollapsibleContent` is answered by it. **`onLayout` does not
exist** in 0.10.0; the measurement route is `ref` → `renderer.getElementBounds`,
and it returns the content's natural **140 px at first layout even while the
body is already clipped to `height: 0`** — so a `defaultOpen` section can
animate on its first open with no flash. `motion.div` interpolates `height`
exactly (56 px at 80 ms of a 200 ms/140 px linear tween), and the tween is read
through the following sibling's `y` because the motion surface itself still has
no `testId`. The clip is load-bearing for **input**, not just paint: content
stays laid out, and a click at a collapsed button's own painted centre does not
activate it (`presses=0`); removing `overflow: "hidden"` lets the same click
through (`presses=1`), so no `pointerEvents` guard is needed. Content that stays
mounted keeps its state — a typed draft survives collapse, re-open and a second
collapse — while unmounting it (the shipped behaviour) loses the tree node
entirely. `onMotionComplete` fires once per tween. The recipe: keep the body
mounted under an `overflow: "hidden"` motion container, measure the content
div, animate the container's height, and re-measure on open and on a width
change (a fixed-height probe cannot measure text rewrap while collapsed).

`declared-styles` and `text-truncation` (plan `335`) measure the two style
families every interactive component and every truncating label relies on, and
both change how a component must be written.

**Hover and active are real.** A 100 px control with `hover: { width: 140 }`
measured 100 → **140** on pointer entry and back to **100** on leave; with
`active: { width: 180 }` it measured **180** between the press and the release.
The state is applied by the runtime, so plan `020` §2.3's "declare it, never
script it" rule is sound. Three properties matter:

- **Hover is per element and does not bubble.** A 400 px parent with
  `hover: { width: 420 }` around a 100 px child with `hover: { width: 120 }`
  measured **420 / 100** with the pointer over the parent, and **400 / 120** with
  the pointer over the child: the child's hover **cancels** the parent's. A row,
  menu item or card that wants a whole-row highlight cannot rely on its own
  `hover` while the pointer is over a hoverable child; the hover style has to be
  on that child too (or the row has to track the pointer in JS, which the rule
  above forbids for the ordinary case).
- **The style report is the authored style.** While hovered, the runtime still
  reported the authored `backgroundColor` and `width`, with the hover values
  nested under `hover`/`active`. `paintedStyle` therefore cannot observe a
  hover that only changes colour — a hover assertion must use a layout property,
  as this probe does.
- **A press does not enter hover, and `active` outlives the pointer.** A
  synthetic press at a point applies `active` with no prior move, and the release
  leaves the element at its authored width because hover was never entered;
  `hover` must be sent first. Pressed and then moved 200 px away with the button
  still down, the element **stayed active** (180) and cleared only on release —
  a drag that starts on a button keeps it pressed for the whole gesture.

**Text truncation is geometry, not text.** `textOverflow: "ellipsis"` and
`"ellipsis-start"` both collapse a long string to **one line** (26 px against
364 px wrapped) and inherit from an ancestor `div`; `whiteSpace: "nowrap"` alone
also gives one line, so the two are indistinguishable from bounds — and
`getPaintedText()` reports the **full source run**, never the ellipsis glyph. A
truncation test must assert the line count; the glyph needs pixels, which this
suite does not read (D24). `lineClamp` clamps exactly (`lineClamp: 2` → 52 px,
`3` → 78 px) and inherits from the box, with no fixed container height needed.

The one trap: **the text layout is shared per `(string, width)` and the key
ignores `lineClamp`.** The same string at the same width cannot clamp
differently in one process — the first variant laid out wins and the other
reports the same line count (measured: a clamped repeat laid out after an
unclamped one measured the unclamped 364 px). `textOverflow` and `whiteSpace`
**are** part of the key (the same string painted 26 px and 598 px side by side
in one run). Consequences: a probe must give every clamp case a distinct string
(this one uses eighteen distinct strings and a deliberate `repeat-*` pair to
prove the sharing), and a UI cannot rely on the same label clamping one way in a
table cell and another way in a tooltip at the same width.

`nested-layer-dismiss` is the runtime verdict for the overlay **dismiss stack**,and it contradicts the shipped implementation. One key event reaches a nested
layer and its enclosing layer with **a separate payload copy each**
(`keyHandlers=2`, `keyObjects=2`), so `internal/dismiss-layer.ts`'s
`WeakSet<EventPayload>` cannot dedupe: one Escape closed **both** layers
(measured, `last=parent-escape`). The field claim in `internal/event-claim.ts`
is the correct model — with it, one Escape closes the submenu
(`last=sub-escape`, parent still open) and the second closes the parent. A press
inside the submenu **does** fire the parent surface's `onMouseDownOutside`
(`outsideParent=1`) and not the submenu's own (`outsideSub=0`), and the payload
carries `x`/`y`, so `menu/sub.tsx`'s bounds containment is load-bearing: with it
the row activates (`subClicks=1`), without it the submenu closes on the press and
the row never activates. A row-derived `<anchored position>` is exact inside the
parent layer (±1 px); a raw `<anchored side align>` anchors to the **parent's**
box, not the trigger's. Two identical outside presses in one synchronous tick
are indistinguishable (the claim's microtask reset needs a task boundary); a real
second click has one.

`roving-focus` measures the keyboard model a menu, tab strip, radio group or
data grid needs. `renderer.focusElement` focuses a row that was never clicked,
and the **next keystroke is delivered to the row that just received focus** —
so a roving tabindex is real, not a visual selection. Inside a `<virtual-list>`
the same works, and focus is **not** lost when the window scrolls past the
focused row: `focused()` still reports it, the next arrow key still moves it,
and the focused row stays in `getPaintedText()` outside the window's run. A
virtualized grid must therefore treat the painted set as "the window **plus**
the focused row", not as exactly the visible rows.

`native-surfaces` is the runtime verdict for the content elements behind icons,
image preview and the diff viewer, and it settles the `<canvas>` question. What
holds: `<svg source>` is retained as type `svg` and painted at its declared box;
`<img>` with no `src` paints `img: no src`, an undecodable data URL paints
`img: load failed`, a valid PNG data URL lays out at its box without a fallback,
and `setImagePixels` through the ref uploads a bitmap without throwing; `<diff>`
paints its file header, hunk header and changed lines. **`<canvas>` is the
trap**: the node is retained (the JSX types accept it) but GPUI has no factory,
so it paints nothing, has no bounds, and drops its children from the paint log.
Charts use the `chart-svg` recipe below. The honest limit: there is
no pixel readback, so a corrupt PNG with a valid MIME type is indistinguishable
from a decoded one by these checks — the screenshot artifact is the only visual
evidence, never an assertion.

`chart-svg` is the runtime verdict for Tier 3 charts and the colour picker's
gradient square. What holds: bars composed from `div`s keep exact widths,
heights and baseline, report their own token `backgroundColor`, and a painted
bar is hit-testable; axis and value labels are real `<text>` nodes; a chart
container with `role="img"` + `aria-label` is one named AccessKit `Image`. What
is decisive: **`<svg source>` is a monochrome stencil** — GPUI rasterizes the
document to an **alpha mask** and paints it as a `MonochromeSprite` with the
element's `color`, so a multi-series line chart is **one `<svg>` layer per
series**, stacked and tinted independently. Text authored inside the SVG is
rasterized: it is visible in the screenshot but absent from `getPaintedText` and
the accessibility tree, so labels are `<text>` siblings; React children of
`<svg>` are retained but never painted. An `<img>` whose `src` is an SVG data
URL takes GPUI's image path and keeps every fill and gradient — that is the
**full-colour** route. The limit remains: no pixel readback, so exact colour and
gradient stops are screenshot evidence, never assertions.

`markdown-surface` is the runtime verdict for the rich-text preview surface a
message row, changelog or docs pane will render. What holds: `<markdown source>`
paints GitHub-flavoured markdown — heading, bold/emphasis, inline code, bullets,
a bordered table and a fenced `ts` block with syntax highlighting — as real
**text** (`getPaintedText`), and a drag from a sibling `<text>` to another
crosses the document and copies its runs in order. A coordinate click on a
link's glyphs fires `onLinkClick` with its URL; the element is `w_full`, so a
short link is not reachable from the element centre and synthetic input needs
the link's own coordinates. React children are retained but never painted (the
same shape as `<svg>`/`<canvas>`), and `role="article"` + `aria-label` is one
named AccessKit `Article` — the internal headings and table are **not** separate
nodes. Styling comes from the element's built-in `Theme`; `theme` is the typed
prop and only its default was measured.

`drag-targets` measures the pointer model behind tab dragging, drag and drop and
file upload. What holds: a captured gesture keeps **every move and the up** on
the element that received the press; `onFileDrop` receives the absolute paths
and the window drop point. What surprises: **hover is frozen during the drag**
(the element under the pointer gets no enter/leave until the button is
released), the gesture still ends in a **click on the source** after 170 px of
movement, and a file dropped on an element **without** `onFileDrop` produces no
drop but still a **click**. A drag-and-drop component must hit-test the pointer
itself and swallow the gesture-ending click.

`drag-autoscroll` is the runtime verdict for the edge of that gesture — the part
a movable tab strip or a reorderable list needs. **The runtime does not scroll a
held drag at a container edge**: the source received the held move, the pointer
sat 6 px from the bottom for 600 ms, and the offset stayed `0`. The component
owns the loop, and that path is proven: one
`renderer.scrollTo(id, 0, y ∓ rowHeight)` per held move inside a 24 px edge band
scrolled `0 → -24 → -48 → -72`, a move at the top edge scrolled one row back,
the source kept every move and the `up` through the scroll, and the drop index
derived from the pointer and the live offset followed it. The gesture still
ended in a click on the source, so a reorder must swallow it (measured again in
this gesture). The same probe records the window limitation behind detachable
tabs: 0.10.0 exposes one app window through `render`/`WindowOptions`; there is
no `openWindow`, so a detached tab must be an in-window floating panel rather
than a new OS window.

`text-selection` is the runtime verdict for copy in the log viewer, code block
and diff. It selects across `<text>` nodes (joined with newlines in document
order), confirms `<code>` and `<diff>` copy only their line text — line numbers,
gutters, markers and file/hunk headers are `chrome_text` and excluded — and
measures `userSelect: "none"`: a selection that **crosses** it skips it, but a
drag **anchored** inside it selects nothing at all, so a gutter must not be the
start of a selection. `clearSelection` and a plain click both leave it empty.
**`live-selection` (plan `191`)** repeats the core of that contract with a real
pointer in a real window: a drag across three text nodes selects them, the
`userSelect: "none"` anchor and exclusion hold, and `clearSelection`/a click
empty it.

`context-menu-pointer` is the runtime verdict for the right click behind Context
menus. A right click arrives as `onAuxClick` with `isRightClick: true`, window
coordinates and **no `button`**, before `mouseUp`; `onClick` is primary-only, so
a row action does not need a right-click guard and the menu must not guard on
`button === 2`. A right click on a child bubbles to the trigger, a
pointer-positioned `<anchored>` paints at the point exactly, and — the fact the
component design turns on — it stays exact and **unclipped** inside an
`overflowY: "scroll"` ancestor (scroll offset `-400`; an item ~50 px below the
160 px viewport still paints and activates), so a context menu needs no portal.
`shift-f10` is delivered as `key: "f10"` with `modifiers.shift`, the surface
auto-focuses, and Escape returns focus through `renderer.focusElement`.

`workspace-restore` is the runtime verdict for persistent panel state. A keyed
remount is a real restart: the live workspace returns to its defaults while the
saved JSON stays. Restoring reproduces the split width, both tab lists, the
active tab and the `<virtual-list>` anchor **exactly** (`scrollToItem(id, 120,
16)` → index 120, in-row offset 16), and the restored list takes a click. What
does **not** survive is native focus: the row focused before the save is not
focused after the remount, so focus restore is app state. The persistence
contract: serialise `anchorIndex` + `anchorOffset` from `getListScrollTop` (never
`getScrollOffset`, which saturates) and apply it once on mount — an inline ref
callback re-runs every render and would undo the user's next scroll.

`scroll-into-view` is the runtime verdict for keeping a keyboard selection
visible. **Focusing a row already reveals it** inside `<virtual-list>`, so a
roving move needs no scroll call. The explicit routes are exact when a jump does
not move focus: `scrollToItem(list, 120)` anchors `[120, 0, 280]` and
`scrollIntoView(row 10)` anchors `[10, 0, 280]`. The trap: **`getScrollOffset`
saturates** on a virtual list (`-1320` at the end of a 200-row list) — read
`getListScrollTop` for the exact `[itemIndex, offsetInItemPx, viewportHeightPx]`
anchor. A scroll never moves focus and the focused row stays painted after the
window leaves it.

`search-highlights` is the runtime verdict for the find contract a Search input,
log search and Search and replace are built on. What holds: `highlight` paints a
wash per match and `getPaintedHighlights()` reports it with the run text, UTF-16
`[start, end)` offsets and **window-space** rects (a document offset by 40/30
painted at `x=68.4, y=30`; the same space as `getElementBounds`). `useTextSearch`
counts through the native `onHighlight` event (`matchCount=3` after
`dispatchNativeEvents`), `next` moves the active match, a nested `highlight`
**replaces** its ancestor's for that subtree, case-insensitive is the default,
`caseSensitive`/`wholeWord` behave as documented, and explicit `ranges` paint
exactly. A soft-wrapped match paints **one box per visual row**; a range that
splits a surrogate pair is **refused without snapping** while a valid range
after it still paints. `<code>` is searched by `query`; a `ranges` spec paints
nothing inside native code text. In a `<virtual-list>`,
`matchIndexOffset` + `activeIndex` number matches **document-wide**: each row
declaring `matchIndexOffset: row` made row 90 the only active wash after
`scrollToItem(list, 90)`. The honest gap: the report carries no wash colour, so
`color`/`activeColor` are unasserted — screenshot evidence only.

`replace-contract` is the replace half of that contract (plan `333`), and its
first finding is a limit: **an `<input>`'s own `highlight` finds nothing** — the
editor reported `matchCount=0` while an identical `<text>` query washed twice,
so a find bar cannot paint washes inside an editor and needs a rendered document
or preview beside it. A value the component sets **does** repaint the editor (the
new sentence paints twice, editor + preview, and the preview's washes drop
`2 → 1`). **The caret moves to the end across that rewrite**: click → End →
replace a 5-character word with a 7-character one → type `z` produced
`…an warning.z` — the `z` landed **after** the sentence's period, not at the old
offset (both the headless and the live check pin that string). The renderer
exposes **no `setSelection`**, so a component cannot select the active match,
the replaced range, or put the caret back; a replace UI must treat the caret as
lost and keep matches in a rendered preview. `ctrl-r` on the focused editor is
the only way to replace without moving focus. `replace-all` is idempotent (`noop` on the second
pass).

`virtualized-tree` is the runtime verdict for a file tree: it flattens 8
directories × 40 files into one `<virtual-list>` and drives the tree contract
with the component's own handlers. What holds: `paddingLeft: 4 + depth * 16`
still indents by exactly 16 px inside a virtual row; expanding changes the
flattened count 8 ↔ 48 and the painted window follows with no stale child; a
clicked row takes native focus and Down/Up move selection **and** focus by
roving index, even after an expansion shifted the indices; Right on an open
directory moves to its first child and Left on a file to its parent. The
measured straggler: at scroll `-512` the window painted `file-12 … file-20`
**plus** the focused `file-22`, and the next key still reached it — "painted" is
the window plus the focused row. The `a11y-tree` limit applies: an off-window
row is not in the accessibility tree.

`select-choose`, `combobox-filter` and `tooltip-open` are the runtime verdicts
for the three interactive components GPUix ships, which the library composes
instead of reimplementing. **Select** opens on a trigger click, paints its items,
commits on an item click, closes and returns native focus to the trigger; the
trigger's own keys work through native delivery (Down opens, Down on the
auto-focused content moves, Enter commits the next item), Escape closes, and an
outside press dismisses and returns focus. **Combobox** opens on input
focus/click, filters as the input is edited (the non-matching row unmounts),
commits the auto-highlighted row on Enter, paints its empty state when nothing
matches, and closes on Escape. **Tooltip** opens on a real native mouse enter and
closes on leave through the component's 80 ms timer — the GPUI dispatcher clock
does not move that timer, so a test must wait on a real clock. The probe also
adds the `hover` host call (`nativeSimulateMouseMove`), which delivers
`onMouseEnter`/`onMouseLeave`; no scenario used mouse movement before.

Two API traps this measured, worth knowing in the library: `ComboboxList`
filters **only** when its child is a function (`(item) => ...`); static children
render every item regardless of the query. And a click closes a Tooltip trigger
(mousedown → onMouseDown closes, then the click), so focus that arrives *from a
click* does not leave the tooltip open — hover is the supported open path.

`a11y-tree` is the runtime verdict for the accessibility claims, read from the
painted frame's AccessKit dump. What actually holds: every authored ARIA token
maps to an AccessKit role (`button`→`Button`, `checkbox`→`CheckBox`,
`slider`→`Slider`, `heading`→`Heading`, `option`→`ListBoxOption`), and
`aria-label`, `aria-description`, `aria-id`, `aria-expanded` (including
`false`), `aria-selected`, `aria-valuetext` and `aria-level` all reach it.
`on_action` follows the native listeners — a `Click` action exists only when the
element has an `onClick`. What does not hold: **an accessible name is never
derived from the element's text**, so every control needs an explicit
`aria-label`; a **CheckBox or Switch exposes no checked/toggled state**
(`aria-checked` is not even in the typed props); a Slider has only
`aria-valuetext`, no `valuenow`/`min`/`max`; and `role="presentation"` produces
no node while its text still paints as a `Label`. A `<virtual-list>`'s
AccessKit nodes follow the **painted window** (8 of 50 rows), so an off-window
grid row or tree node is invisible to assistive technology — the same trade the
paint window already makes. Explicit `tabIndex={0}` rows and an `<input>` each
count as a tab stop in the frame.

`command-palette` is the runtime verdict for the Tier 4 command surface and
therefore for application menus too. What holds: the window shortcut opens the
palette; `autoFocus` focuses the field on a conditional mount; letters, arrows
and Escape reach **both** the field and the app-level handler while it is
focused (`window=t keys=3`, `window=escape`), but **Enter and Backspace do
not** — Enter becomes `onSubmit` and Backspace is consumed by the native
editor, so a shortcut layer must not rely on either; `cmd-k` arrives while
typing without typing a `k`; arrows arrive at the field as key **down** and move
the active row while native focus stays in the input; the surface is an
AccessKit `Dialog` and the rows are options whose `aria-selected` follows the
active index; `onSubmit` commits, closes and returns focus to the trigger;
Escape closes from the field and returns focus; the veil is a full-window layer
whose **sibling** surface takes row clicks above it, and a veil click dismisses;
an unmatched query paints `No commands` and Enter commits nothing. The
limitation: there is no `aria-activedescendant`, so the visual selection is
not announced as focus — `aria-selected` is the only AT-visible form.

`workspace-panes` is the runtime verdict for a **tabbed panel body** and the
composition it lives in. The decisive finding: **`display: "none"` is a no-op**
— the binding applies `display` only for `"flex"`/`"grid"`, so a pane hidden that
way still laid out (`y 205.5`, `h 78`), painted and swallowed a click meant for
the row beneath it. The working mechanism is absolute overlapping slots with
`visibility: "hidden"` and `pointerEvents: "none"`: the pane leaves the paint and
the tab order while staying mounted, so its draft, pick and virtual-list anchor
(`20`) survive a switch. Two more composition facts: a nested scroller **chains
the wheel** into its ancestor (both moved to `−240`; `pointerEvents: "auto"` on
the inner keeps the outer at `0` and the inner still clamps at `−480`), and a
resized pane **re-windows** its list (`5 → 2` painted rows at `240 → 180`,
anchor kept) against the clipped intersection. Fill layouts by passing an
explicit height from the split: a `height: "100%"` chain through the strip leaves
a virtual list with no viewport.

`docking-layout` is the runtime verdict for a **docking grid**, and it is the
first probe that reads a rectangle **from component code during a gesture**. A
`ref` gives a `PublicInstance.id`; `useGpuix().renderer.getElementBounds(id)`
gives the surface's window box, and every pane box the pure `rects` model
projects from it matched the runtime within 1 px — including splits created
mid-run and nested ones. The drop indicator is an **absolute child of a
`position: "relative"` group**: its bar is pixel-exact (`right − 4`, 4 px thick;
the whole pane for a centre zone), it is `pointerEvents: "none"`, and
`paintedStyle.backgroundColor` is the palette's `primary`. The zone is a 48 px
edge band and the nearest edge wins a corner. A captured tab drag keeps
delivering moves **while the indicator re-renders on every move**, and the `up`
applies exactly one drop; the drop handler must therefore live on the pressed
tab, not on the group. A right/bottom edge drop puts the new group **secondary**
and left/top **primary** at half the pane's extent; a centre drop merges into the
strip with no split; dropping a group's last tab **prunes the group and collapses
its split to the survivor**, including at the top level. One rule is load
bearing: **key every split by its node id**, or a collapse that reparents a
surviving split reuses the parent's size state (measured: `320` instead of
`324`). The recursive layout restores exactly through a keyed remount of the
model (outer `280`, nested `324`/`197`), and the dump exposes the panes as
`Region` + `TabList` + `TabPanel` + `Tab` with labels and `aria-selected`. A
gesture-ending click on the source tab is a measured `drag-targets` fact and is
not asserted here; a shipped component must suppress it.

Two further sources are recorded and are **never** the basis for a `done` row:
`verified 0.5.1` (the published 0.5.1 binding, the last `darwin-x64` release,
run by `apps/playground/legacy-probe`; ADR 0002) and `docs` (the upstream
README/types document it, but no run has confirmed it here).

## Design system

| Capability | Status | GPUix support | Notes / limitations |
| ---------- | ------ | ------------- | ------------------- |
| Design tokens | done | yes (inline style values) | 47 semantic roles, 10 type roles, spacing/radii/density/elevation; light + dark; `colorRoles` indexes the roles for generated doc tables. `theme-color-roles` proves every role paints its exact value in dark, light and high contrast, and that the palette switch re-paints; `theme-type-and-shadow` proves every type role, `focusRing` and `elevationShadow` reach the renderer. |
| Theme extension | done | yes (theme switch is a re-render) | `createTheme` / `extendTheme` / `ThemeProvider`; docs in `docs/tokens.md`. The gallery mounts through `ThemeProvider` and the switch re-renders the subtree natively. |
| High-contrast theme | done | yes (values in a `Theme`) | AAA text floors (7:1) and 4.5:1 boundaries; same 47 roles; `getTheme(mode, "high")`; `theme-color-roles` asserts all 47 roles in high contrast and that its colour set differs from dark and light. Docs in `docs/tokens.md`. **Runtime (055):** Tier 1 paints only the high-contrast palette in both modes, and a switch from high-contrast light to dark repaints the mounted tree. |
| Status tones | done | yes (values in a `Theme`) | `info` plus soft `info`/`success`/`warning`/`destructive` pairs with readable foregrounds; `statusTone(theme, tone)` and `alpha(color, amount)`; the contrast test holds soft text to 7:1 in all four colour sets. The soft roles are covered by `theme-color-roles`. |
| Focus state | done | yes (a zero-blur spread `boxShadow`) | `focusRing(theme)` returns `{ boxShadow }` with zero offset, zero blur and `spreadRadius = borderWidth.strong`; `theme-type-and-shadow` asserts that ring reaches the runtime, and `focus-traversal` the events. GPUix 0.10.0 has no `outline*` and no `focusVisible`, so a mouse press shows the ring. Docs in `docs/tokens.md`. |
| Density, type and spacing scales | done | yes | Pure values with no runtime dependency; consumed by primitives/components as they land, and by the playground shell. **Runtime (055):** a control's painted height follows the active density preset, colours stay the theme's, and selection boxes remain icon-sized. |
| Platform type styles | done | yes (values in a `Theme`) | `platformTypes` + `currentPlatform` + `systemMonoFamily` + `platformTheme(base, platform)`; the docs platform toggle renders a real theme, not a docs-only style sheet. 12 guard tests; `theme-type-and-shadow` proves the resolved family and size reach the renderer. **Runtime (055):** a code role's `fontFamily` changes with `platformTheme`, and switching platform repaints the mounted tree. **Playground (`theme-platform`):** the mono role paints `Menlo` (default/macOS), `DejaVu Sans Mono` (Linux) and `Consolas` (Windows) through the runtime's own style report, `sans` stays `.SystemUIFont`, and the surface colour does not move. |
| Native theme gallery | done | yes | `apps/playground` — palette switch in the shell, 47 labelled swatches, every type role, the focus ring and an elevation shadow; `theme-color-roles`, `theme-type-and-shadow` (plan `150`), plus the platform type-style cycle `theme-platform` (plan `170`). **The shell path (plan `182`, `shell-selection`):** clicking `theme-mode-light` repaints the whole shell to the light background, keeps the selected scenario and leaves its view mounted. |

---

## Not provided by GPUix

The owner's explicit ask: **whatever is missing and GPUix does not already
provide** — the rows that need real implementation, not API-shape work over an
existing host element.

Verdicts are against the **published `@gpuix/react` / `@gpuix/native` 0.10.0**
(the version this repo pins), read on 2026-10-17 from
`workspaces/components/node_modules/@gpuix/react/dist/index.d.ts`,
`dist/components/`, `dist/floating.d.ts`, `@gpuix/native/dist/host.d.ts` and
`@gpuix/native/index.d.ts`. They are **not** read from `references/gpuix`, which
is ahead of the published release — the divergence is called out below.

### Provided by GPUix — API-shape work only

| Row | GPUix provides | Verdict |
| --- | -------------- | ------- |
| Text / typography | `<text>` host element | **verified** (published 0.10.0) |
| Icons | `<svg>` (tintable monochrome) + `<img>` | **verified** (runtime: `native-surfaces`) |
| Separators, Spacers, Stack / layout primitives, Boxes / containers | `div` + flexbox / grid | **verified** |
| Scrollable containers | `overflow: "scroll"` | **verified** |
| Text inputs / Text areas | `<input>`, `<textarea>` | **verified** |
| Selects | `Select` + parts | **verified** (runtime: `select-choose`) |
| Comboboxes | `Combobox` + parts | **verified** (runtime: `combobox-filter`) |
| Tooltips | `Tooltip` + parts | **verified** (runtime: `tooltip-open`) |
| Virtualized lists | `<virtual-list>` | **verified** |
| Syntax highlighting | `<code>` (bundled languages) | **verified** |
| Markdown / rich text rendering | `<markdown>` (GFM: headings, lists, tables, fenced code, links) | **verified** (runtime: `markdown-surface`; editing is not provided) |
| Diff viewer | `<diff>` (unified) | **verified** (runtime: `native-surfaces`) |
| Image preview | `<img>` (path, data URL, http(s)) | **verified** (runtime: `native-surfaces`) |
| File / folder selection | `GpuixRenderer.promptForPaths` | **verified** |
| File drops | `onFileDrop` + `nativeSimulateFileDrop` | **verified** (runtime: `drag-targets`) |
| Text selection / copy | window selection + `getSelectedText` | **verified** (runtime: `text-selection`) |

**Primitives only — still needs implementation:** Popovers / Dropdown menus /
Context menus (`floating`'s `FloatingLayer` + `<anchored>` give positioning and
occlusion, not menu semantics); Toasts / notifications (`AnimatePresence` +
`createPortal` + `<anchored>`); Buttons and Dialogs (**present on
`references/gpuix` `main`, absent from published 0.10.0** — no `./button` or
`./dialog` subpath and no `Button` / `Dialog` in `dist/index.d.ts`);
**`<canvas>` custom drawing — unsupported**: the element is in `ElementType`
and typed in the JSX runtime, but no factory is registered, so it is retained
and renders `gpui::Empty` — no bounds, no children painted (`native-surfaces`).
Use `<svg>` for static drawing and `<img>` + `setImagePixels` for live bitmaps.

**Cross-cutting, verified, partial** (runtime: `a11y-tree`): AccessKit `role`,
`aria-label`, `aria-description`, `aria-id`, `aria-expanded`, `aria-selected`,
`aria-valuetext`, `aria-level`; native `tabIndex` / `autoFocus` and renderer
`focusElement` / `focusNext` / `focusPrevious` / `focusNextWithin`. There is **no**
`aria-checked`, `aria-valuenow`, `aria-labelledby` or `aria-describedby`, and an
accessible name is **not** computed from the element's text.

### Not provided — needs real implementation

Grouped by tier. The GPUix primitive each will be built on is in the row's Notes.

- **Tier 1:** Labels (association needs `aria-labelledby` — unsupported), Button
  groups, Checkboxes, Radio groups, Switches, Progress, Skeletons, Loading
  indicators, Slider, Range slider, Meter, Number Field, OTP Field, Toggle,
  Rating. **Masked / password entry is `unsupported` with evidence:** no
  masking prop exists on `<input>` and the editor holds, announces and paints
  the typed text in clear (`text-entry`, plan `188` §9), so a password field is
  an app-owned OS prompt, not a component.
- **Tier 2:** Cards, Badges, Avatars, Lists / list items, Empty states, Alerts,
  Inline validation, Toasts / notifications, Dialogs, Confirmation dialogs,
  Popovers, Dropdown menus, Context menus, Command menus, Tabs, Accordions,
  Collapsible sections, Breadcrumbs, Pagination, Search inputs, Date / time
  pickers, Fieldset, Form, Navigation Menu, Preview Card, Drawer, Stepper,
  Timeline, Color picker, Tag / token input, Mention input, Hotkey-recorder
  input, Countdown, Carousel, Inline edit, Keyboard shortcuts / keycap display.
- **Tier 3:** Tables, Sortable tables, Row selection, Column configuration,
  Resizable columns, Filtering controls, Data toolbars, Virtualized tables, Tree
  views, Expandable rows, Key-value displays, Property panels, Statistic /
  metric cards, Charts.
- **Tier 4:** every row — Resizable split panes, Panel groups, Collapsible
  sidebars, Tabbed panels, Detachable / movable tabs, Docking layouts, Nested
  panel arrangements, Workspace layouts, Persistent panel state, Keyboard
  navigation, Command palette, Application menus, Status bars, Toolbars,
  Breadcrumb navigation, Inspector panels, Property editors, File trees, Log
  viewers, Terminal surfaces, Search and replace, Multi-pane editing layouts.
- **Tier 5:** Code editor integration, Rich-text editing, Drag and drop,
  Notification centre, Multi-step forms, Virtualized hierarchical data, Advanced
  filtering / query builders, QR code, File upload, Video / audio player +
  waveform, Crop area.

Nothing in this list may be claimed `done` until it runs in the real runtime or
carries an evidenced limitation. The capability evidence lives in
`docs/gpuix-capabilities.md` (plan `203`); the sequencing is in plan `205`.

---

## Tier 1 — foundational

| Component | Status | GPUix support | Docs / example | Notes / limitations |
| --------- | ------ | ------------- | -------------- | ------------------- |
| Text / typography | wip | yes | [text](packages/primitives/docs/text.mdx) · typography | **Runtime (041):** paints its string, and its box height is the role's line height. `textStyle` in `core/style.ts` covered by `style.test.ts`. Accepts `testId` (043), like every other primitive. **Truncation (`text-truncation`, plan `335`):** `truncate` is measured — `textOverflow: "ellipsis"` collapses to **one line** (26 px against 364 px wrapped), and the truncated string is still reported in full by `getPaintedText()`, so the ellipsis glyph itself is not assertable. `clamp` is measured — `lineClamp` clips to exactly N lines (2 → 52 px, 3 → 78 px) and works on a width-constrained box with no fixed height. **Caveat:** the runtime shares text layout per `(string, width)` and the key ignores `lineClamp`, so two identical strings at one width clamp together (first laid out wins); and `whiteSpace: "nowrap"` alone has the same geometry as `ellipsis`. **Type layout (`typography-layout`, plan `342`):** an explicit `lineHeight` is exact (30 → 60 for two wrapped lines); the default line box is ~1.6× the font size (12 → 19.5, 16 → 26, 24 → 39); `fontWeight` reaches the layout (a word at 700 is ~4 px wider at 16 px); a `<text>` block **fills its parent** by default. **`textAlign` is a no-op in 0.10.0** — left/centre/right all leave the glyph run at the block's left edge, on the `<text>` and on its parent — so `Text`'s documented `align` prop currently does nothing. The working routes are moving the block: `alignSelf: "center"`/`"flex-end"` in a column flex (measured 82.5 / 165 in a 200 px column) or a narrower explicit width in a `justifyContent: "center"` row (70). **Defect recorded cross-team** for `primitives` to implement or document. |
| Icons | wip | yes | [icon](packages/icons/docs/icon.mdx) · icons | **Runtime (041):** the raw `<svg source>` paints at 20×20 (`lg`) / 24×24 (`xl`); a decorative icon is absent from the a11y tree, a labelled one is an `Image`; a red vs blue capture differs byte-wise, so the tint reaches the paint. 18 offline tests. |
| Separators | wip | yes | [separator](packages/primitives/docs/separator.mdx) · layout | **Runtime (041):** one border step across the surface. `ruleStyle` test. |
| Spacers | wip | yes | [spacer](packages/primitives/docs/spacer.mdx) · layout | **Runtime (041):** a filler pushes its sibling to the far edge. `layout.test.ts`. |
| Stack / layout primitives | wip | yes | [stack](packages/primitives/docs/stack.mdx) · [grid](packages/primitives/docs/grid.mdx) · layout · grid-layout | **Runtime (041):** row and column gaps equal the theme step. The runtime's grid is **numeric only** (`columns`, `rowHeight`); there is no auto-flow and no named areas. **Grid + wrap (`layout-grid`, plan `341`):** three tracks in 300 px split `93.5 / 93 / 93.5` with exact 10 px gaps; explicit rows split a fixed height (`145×95` cells) and stretch an unsized child, while a declared height wins (`10` in a `26.5` track); auto rows follow their tallest child; **only the default and `gridColumnMin: "zero"` give equal tracks** — `min-content` fills the container with unequal tracks (`104 / 186`) and `max-content` leaves the remainder unused (`38 / 186`, 66 px free); a nested grid resolves against its cell; a child wider than its track **overflows** (500 px) and does not resize the neighbour; `flexGrow` makes a grid fill a flex row; `justifyContent: "center"` centres a content-sized track set. **Wrap:** a fixed-height wrapping row **stretches its line boxes** (third 30 px child at y 104 in a 200 px box) unless it declares `alignContent: "flex-start"` (y 38), and an auto-height row is exact (68 px). |
| Boxes / containers | wip | yes | [box](packages/primitives/docs/box.mdx) · layout | **Runtime (041):** padding equals the theme's step; density moves height and leaves colour alone. Every primitive merges a caller's `style` last; `Box` is where an app overrides a surface. |
| Scrollable containers | wip | partial | [scroll-area](packages/primitives/docs/scroll-area.mdx) · layout | **Runtime (041/048):** a wheel with `deltaY -100` leaves the offset at `y -100`, and a caller's `onScroll` receives that delta. **Horizontal (playground `tab-strip-overflow`, plan `173`):** `overflowX: "scroll"` pans, `getScrollOffset` reports `x`, `deltaX -240` moves it to `-240`, and `renderer.scrollTo(id, x, 0)` is exact. **No `scrollbarColor`, no `scrollbarWidth`, no fade mask** in 0.10.0, so the thumb is platform-themed and cannot be tinted; there is no absolute offset (`onScrollChange`). |
| Buttons | wip | ours | [button](packages/primitives/docs/button.mdx) · form | **Runtime (041):** a hit-tested click activates once; Enter on key **down**, Space on key **up**, a held key ignored; `disabled` refuses both; `loading` refuses both and announces `Loading`. `@gpuix/react` publishes **no `./button`**, so the keyboard contract is this package's. Variants merged here: Floating action button and Copy button (adabraka `floating_action_button`, `copy_button`). |
| Button groups | wip | yes | [button-group](packages/primitives/docs/button-group.mdx) · form | **Runtime (041/048):** attached children are 0px apart, separated ones the theme's `sm` gap. `role="group"` with `aria-label` from `label`; `attached` rounds and clips the group — it does not reshape each child (no `:first-child`, no child cloning). Variants merged here: Toggle Group (base-gpui `ToggleGroup`) and Segmented control (adabraka `segmented_nav`) — pressed-state variants, not separate rows. |
| Labels | wip | partial | [label](packages/primitives/docs/label.mdx) · form | **Runtime (041):** the visible name is an a11y `Label`; the control's own `label` is the `TextInput`'s name. There is **no `aria-labelledby`**, so `labelledBy(name)` returns the control's `label` prop (045). |
| Text inputs | wip | yes | [input](packages/primitives/docs/input.mdx) · form | **Runtime (041):** runtime keystrokes reach `onChange` with the accumulated text; Enter reaches `onSubmit`; a controlled field reports each edit. The native `<input>` holds its text; `core/state.ts` decides controlled/uncontrolled. **`disabled`** is emulated (plan 025): the host has no `disabled` prop, so the field is read-only, out of the tab order and handler-guarded; AT hears read-only. **Editor contract (`text-entry`, plan `188`):** one `onChange` per character; Left/Right/Home/End move the caret and typing inserts at it; `shift-arrow` extends a selection and `cmd-a` selects all, and typing replaces either exactly; Backspace deletes one and is a safe no-op on an empty field; `readOnly` keeps focus and value and fires **no** change event (native-enforced); the placeholder is both exposed and painted, and stops painting once text exists; a fixed-width field **clips** a long value (`158` px before and after 40 characters — it does not grow). **No masked entry:** `InputProps` has no `type`/`secureTextEntry`/`mask`, so a typed secret is held, announced and painted in clear — do not ship a `PasswordInput` (evidence in plan `188` §9). |
| Text areas | wip | yes | [textarea](packages/primitives/docs/textarea.mdx) · form | **Runtime (041):** height follows `rows` and a newline is accepted; **no `onSubmit`** — with one the runtime turns Enter into a submit and costs the newline (046). **Autosize is real (`text-entry`, plan `188`):** `minRows={2}` paints `64` px, four lines `116`, six lines `168`, seven lines `168` — it grows exactly 26 px per line to `maxRows` and then scrolls, so no component measurement is needed. **`disabled`** is the same read-only + tab-order + handler guard as `Input` (plan 025). |
| Checkboxes | wip | partial | [checkbox](packages/primitives/docs/checkbox.mdx) · selection | **Runtime (041):** click and Space-up toggle, and `aria-valuetext` flips `unchecked → checked`; indeterminate reads `mixed`; AccessKit role is `CheckBox`. **No `aria-checked`.** Variant merged here: Checkbox Group (base-gpui `CheckboxGroup`). |
| Radio groups | wip | partial | [radio-group](packages/primitives/docs/radio-group.mdx) · selection | **Runtime (041/044/048/049):** AccessKit roles are `RadioGroup` and `RadioButton`; arrows move the selection, wrap, and **skip disabled options** (044); Home/End jump to the nearest **enabled** end (048); arrows **move native focus with the selection** and the focused option paints the ring (049); the roving index is derived from the value, so a controlled change moves the tab stop (049); a click on the circle selects. Options are **data**, not compound children (D16). **Playground:** `primitives-choice` — a click selects, Down/Up move the selection and wrap. |
| Selects | wip | reuse | [select](packages/primitives/docs/select.mdx) · form | **Runtime (041):** opens, paints its options, commits a clicked option. A thin themed wrapper over `@gpuix/react/select`; open state and dismissal are GPUix's. |
| Switches | wip | partial | [switch](packages/primitives/docs/switch.mdx) · selection | **Runtime (041/049):** a click toggles; AccessKit role is `Switch` and the value flips `unchecked → checked`. **No `aria-checked`**; Space/Enter toggle. The thumb moves by the track's `justifyContent` because the runtime has no `transform`. `invalid` paints the destructive border and focus paints the selection ring (049). |
| Progress | wip | partial | [progress](packages/primitives/docs/progress.mdx) · form | **Runtime (041):** `aria-valuetext` is `"42%"`, role is `ProgressIndicator`, the fill tracks the value and clamps outside 0–100. **No `aria-valuenow`.** |
| Tooltips | wip | reuse | [tooltip](packages/primitives/docs/tooltip.mdx) · feedback | **Runtime (041):** opens on hover and on keyboard focus, and its content stays inside the frame it anchors to. A thin wrapper over `@gpuix/react/tooltip`; a mouse-opened tip looks the same as a keyboard-opened one (no `focusVisible`). Placement facts are the shared floating probe: `align="center"` is off by half the panel and `fit="snap"` does not flip. |
| Skeletons | wip | partial | [skeleton](packages/primitives/docs/skeleton.mdx) · feedback | **Runtime (041):** opacity samples take both `1` and `0.6`. Opacity pulse only: the runtime's `motion` animates width/height/opacity/insets/borderRadius and nothing else, so no shimmer sweep. |
| Loading indicators | wip | partial | [spinner](packages/primitives/docs/spinner.mdx) · feedback | **Runtime (041):** the lit dot changes index (the accent-coloured dot proves a theme colour reaches the paint) and AccessKit reports role `Status` with its label. `Spinner` **cannot rotate**; a width/left indeterminate sweep is the remaining alternative, and `Progress` with no `value` covers the bar. |
| Slider | wip | ours | [slider](packages/primitives/docs/slider.mdx) · [value](packages/primitives/examples/value.example.tsx) | **Runtime (053):** a real click at 25% of the track reports `25`; the thumb is centred within 1 px of the value at 0/50/100; arrows/page/Home/End move by step, page, end; a disabled slider refuses pointer and keys and leaves the tab order; the ring lands on the thumb. **No pointer capture** — a drag only tracks while the pointer is over the track. **No `aria-valuenow`/`min`/`max`**; the value rides on `aria-valuetext`. |
| Range slider | wip | ours | [range-slider](packages/primitives/docs/range-slider.mdx) · [value](packages/primitives/examples/value.example.tsx) | **Runtime (053):** a press at 10% moves the start, at 90% the end; native focus follows the grabbed thumb and an arrow moves only that end; a start driven past the end stops on it. Two `role="slider"` thumbs in a named `group`, each announcing its own value text. Ends may touch, never cross. Same pointer-capture and `aria-valuenow` limits as Slider. |
| Meter | wip | yes (a bar, no host element) | [meter](packages/primitives/docs/meter.mdx) · [value](packages/primitives/examples/value.example.tsx) | **Runtime (053):** AccessKit role `Meter`; the value text is the formatted measurement; the fill's painted width is the measurement's fraction of its own range; Tab never lands on it. Reuses `Progress`'s track/fill. No `aria-valuenow`. |
| Number Field | wip | ours | [number-field](packages/primitives/docs/number-field.mdx) · [number-field](packages/primitives/examples/number-field.example.tsx) | **Runtime (054):** real typing reports `12`; `999` against `max=100` reports `100`; arrows step, PageDown pages, a hit-tested spin press steps and refocuses the input; the ring paints on the field's chrome; a disabled field refuses text, keys and presses. The input has **no numeric mode** (no `type`, `min`, `maxLength`), so parsing/clamping/drafts are ours. The spin buttons are `presentation`, not tab stops. `autoFocus` paints no ring on mount (no focus event is dispatched). **Playground:** `primitives-entry` — Up/Down steps, typed `99` commits as the clamped `10`, the committed value is exposed. |
| OTP Field | wip | ours | [otp-field](packages/primitives/docs/otp-field.mdx) · [otp](packages/primitives/examples/otp.example.tsx) | **Runtime (054):** six digits typed one at a time fill six cells and `onComplete` fires once; focus advances with each character and Left moves it back; Backspace in an empty cell clears the previous one, while Backspace on a filled cell deletes exactly one character; AccessKit reports a named `Group` with six named `TextInput`s; `invalid` paints the destructive border on every cell; a disabled field refuses input and leaves the tab order. **No `onPaste`** and no clipboard simulation in the `TestRenderer`, so the multi-character fill is proven only as a pure rule. Arrows/Home/End/Backspace are handled on **key up**: the native editor consumes their key down, so a held arrow does not repeat. **Playground:** `primitives-entry` — six digits advance focus, `onComplete` fires once, Backspace deletes exactly one character, Left moves focus back. |
| Toggle | wip | ours | [toggle](packages/primitives/docs/toggle.mdx) · [toggle](packages/primitives/examples/toggle.example.tsx) | **Runtime (054):** a click flips the announced state and repaints the accent fill; Enter down and Space up each activate once; a disabled toggle leaves the tab order; the ring follows focus. **No `aria-pressed`** in 0.10.0 — the state rides on `aria-valuetext`, so a screen reader hears a button with a value. Activation and the ring are this package's (`@gpuix/react` publishes no button). |
| Rating | wip | ours | [rating](packages/primitives/docs/rating.mdx) · [rating](packages/primitives/examples/rating.example.tsx) | **Runtime (054):** a click on "4 of 5" reports 4; arrows move the checked star **and** native focus, clamping at the ends; Delete clears; filled stars paint `colors.primary` and empty ones `colors.mutedForeground`; Tab enters on the rating and the next Tab leaves it; disabled refuses input. Whole stars only (no clip/transform in 0.10.0); no `aria-checked`, state rides on `aria-valuetext`. **Playground:** `primitives-choice` — first-star click, Right/End, clamp at five, Delete clears, Left clamps at zero. |

`Runtime (041)` = observed by
`nub run --filter @gpuixui/primitives test:runtime` on 2026-10-17 (119 tests in
13 files after plan 055's theme axes; 115 at the 054 OTPField, 54 at the 041
baseline, 68 after 049, 82 after 053, 90 after NumberField, 97 after Toggle,
106 after Rating, locally built GPUix 0.10.0 binding). Details: plan 041 §9,
plan 053 §11, plan 054 §9 and plan 055 §7. The examples suite mounts every
example in `packages/primitives/examples/` (plan 047).

**Both themes (021/042):** every painted colour in the Tier 1 scene comes from the
active palette, and re-rendering with the dark palette repaints every asserted
role (plan 042 §8). Since plan 021 the palettes are the shipped `lightTheme` /
`darkTheme` from `@gpuixui/tokens`, not test doubles.

**No row is `done`** until the published-binary run lands and the docs site
(docs-site workstream) has its page. The in-package docs page and the mounted
example exist for every row (plan 047); the runtime column is the honest
locally-built-binding result.

**End-to-end native composition (playground plan `168`).** The rows above are
backed by this package's own runtime suites; `primitives-actions`,
`primitives-fields` and `primitives-display` additionally mount the shipped
package through `@gpuixui/tokens` in the playground's shared smoke harness and
drive it with native input. That suite is what a `done` row cites for the
consumer path: click / Enter-down / Space-up activation, the merged focus ring
(appears on focus, drops when focus moves), a controlled `Input` edit and
`onSubmit`, state announced through `aria-valuetext` for `Checkbox`/`Switch`,
the themed `Select` commit and Escape dismissal, `Slider` arrow steps,
`Progress`/`Meter` value text, a painted `Skeleton` and a hover `Tooltip`.
`simulateKeystrokes("space")` delivers no key up, so `@gpuixui/testing` now
exposes `keyDown`/`keyUp`. `primitives-choice` and `primitives-entry` extend the
same proof to `RadioGroup`, `Rating`, `NumberField` and `OTPField` (plan `169`):
click/arrow selection with wraparound, a clamped and clearable rating, a clamped
numeric commit, and OTP focus advance with a single-character Backspace.

All five playground scenarios now mount the shipped package; together with the
primitives' own `test:runtime` suites, every interactive Tier 1 row has both an
in-package and an end-to-end native verdict.

**End-to-end Tier 2 composition (playground plan `330`).** Three scenarios mount
the shipped `@gpuixui/components` through its published root: `tier2-dialog`
drives `Dialog`/`ConfirmDialog` (centred surface, focus entry, Tab/Shift-Tab
containment, Escape and focus return, Cancel holding initial focus, confirm
reporting once and leaving the dialog open), `tier2-menu` drives
`DropdownMenu`/`ContextMenu` (click and right-click open, the disabled row
skipped by native focus, Enter activating once with focus restored, pointer
placement within 12 px, Escape and outside dismissal) and `tier2-toast` drives
`ToastProvider`/`ToastViewport` (a push paints a 380 px card inset 16 px, the
action runs once and dismisses, the stack is oldest-above-newest, Escape is not a
shortcut, a 300 ms duration dismisses itself). The suite is `64/64` and
`tier2=verified`. Two consumer-path facts are recorded in plan `330` §8: the
renderer needs **one root host element** (a provider with sibling children at the
root paints nothing), and the components package is compiled by the consumer
because its tsconfig maps the JSX runtime to a `.d.ts` that `nub` cannot execute.
**In a real window (plan `331`):** `live-tier2-dialog`, `live-tier2-menu` and
`live-tier2-toast` repeat the consumer path live — the surface centres within
2 px, the Tab trap keeps native focus inside, the menu surface takes native
focus, the context menu lands within 12 px of the right click, the toast card is
inset 16 px, and a 300 ms duration really dismisses itself. Live `16 → 19`,
exit `0`, three real-window screenshots.

## Tier 2 — composition and feedback

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Cards | done | yes | `variant` outline/elevated/plain; 5 native behaviour tests |
| Badges | done | yes | seven variants (neutral/primary/4 status tones/outline), two sizes sized by type role; 7 native behaviour tests. Not interactive by design; no icon or dismiss slot yet |
| Avatars | done | yes | four diameters, deterministic unicode-safe initials fallback (8 logic tests), presence dot; 7 native behaviour tests. No image loading/error state in v1 — a missing file paints nothing and does not restore the initials |
| Alerts | done | yes | compound parts (`Alert`, `AlertIcon`, `AlertContent`, `AlertTitle`, `AlertDescription`, `AlertDismiss`) over a tone context; four tones from the shared status palette; 11 native behaviour tests (real click, keyboard activation, alert role). Dismiss uses the local button stand-in; live-region announcement not verifiable here |
| Lists / list items | done | yes | `selectionMode` none/single/multiple over a roving tab stop: arrow wrap over disabled rows, real focus (`focusElement`), controlled + uncontrolled; multiple adds plain/Cmd/Ctrl/Shift clicks, Shift+Arrow ranges from an anchor and Cmd/Ctrl+A select-all of enabled rows; type-ahead jumps and cycles by an explicit `ListItem` `textValue`; single/none lists also take `onActivate` (Enter or click, never Space; disabled rows never), with the multiple variant rejecting it at the type level; a caller `onClick` on an enabled row is composed before activation; 37 native behaviour tests. No `aria-multiselectable` in 0.10.0, no href/link role on activation, no drag reorder or virtualisation |
| Empty states | done | yes | title + optional description/action/icon, no surface of its own; 6 native behaviour tests including a real click on the action. Wrap width is a component constant (no measure token) |
| Inline validation | done | partial | `Field`/`FieldLabel`/`FieldDescription`/`FieldError`/`FieldInput` with schema-message `validate`/`validateAll`; 6 native behaviour tests + validation logic suite, both themes. A disabled input is `readOnly`, leaves the tab order and paints the disabled roles. No `aria-describedby`/`aria-invalid` in 0.10.0; the caller owns the value and when validation runs |
| Toasts / notifications | done | yes | Effect store (`SubscriptionRef` + `FiberMap`), bounded queue, monotonic ids, auto-dismiss tested with `TestClock`, stale-timer regression; hovering or keyboard focus on either control pauses and the last one leaving resumes with the remaining time; one labelled action (the handler lives in the provider) runs once and dismisses, and a label without a handler draws nothing; 14 native behaviour tests. No `zIndex` (render the viewport last), no progress bar. **Frozen exit (`toast-lifecycle`, plan `336`):** a native exit holds a dismissed card while the motion clock is frozen and removes it when the clock moves; a probe must assert that on a **synchronous** dismissal — a real timer racing a paint and `AnimatePresence`'s own re-render is not a deterministic point. **Shipped viewport (`tier2-toast`, plan `337`):** it renders the queue directly with **no `motion`/`AnimatePresence`**, so a timer removal is a plain state update — immediate even with the GPUI motion clock frozen, with the survivor reflowing to the 16 px inset. The plan-336 race is a local-probe/consumer-motion property, not a shipped defect |
| Dialogs | done | partial | local overlay over an `anchored` veil at window coordinates (0.10.0 ships no Dialog parts and no portal), caller `ref` composed on the content; 13 native behaviour tests + 5 dismiss-stack logic tests. No `aria-modal`/`aria-labelledby` in 0.10.0 — named through the required `label` |
| Confirmation dialogs | done | partial | Cancel holds initial focus (Enter cancels); confirm never closes the dialog itself, the caller does; `loading` disables both actions and suppresses Escape/backdrop; 5 native behaviour tests. Busy indicator is a `…` glyph until a Spinner exists |
| Popovers | done | partial | anchored through GPUix's `FloatingLayer`; the runtime snaps but does not flip and its `center` centres on the containing block, so the component flips a snapped surface back off its trigger and maps `align="center"` to a measured `start` offset; Escape restores focus, Tab and outside presses do not; share the dismiss stack with Dialog and a mouse-down re-open guard, caller `ref` composed on the trigger; 12 native behaviour tests, both themes |
| Dropdown menus | done | partial | anchored `FloatingLayer` surface with a shared row/highlight core; keyboard opens (`Enter`/`Space`, `ArrowDown`, `ArrowUp`) land on the first/last enabled row, arrow/Home/End wrap and skip disabled rows, Enter activates and restores focus, checkbox and destructive rows; type-ahead jumps by a case-insensitive 500 ms prefix, cycles on a repeated letter and skips disabled rows; one level of submenus opens by click, hover, `Enter`/`Space` or `ArrowRight`, positions at the row's right edge, keeps arrows and type-ahead inside, runs a pointer-clicked row once, closes one level on `Escape`/`ArrowLeft` and both on an outside press; the root surface flips off its trigger when snapping would cover it and `align="center"` is measured rather than the runtime's containing-block centre; 35 native behaviour tests, both themes. No deeper nesting is tested, submenus only open right and have no `aria-haspopup` in 0.10.0, and the checkbox row uses `aria-selected` instead of `aria-checked` |
| Context menus | done | partial | pointer-positioned `anchored` surface over the shared rows and submenu parts; 17 native behaviour tests (right click opens, lands within 12px of the pointer, select runs once, second right click moves it, `Shift+F10` opens at the trigger's bottom-left with focus in the menu, Escape returns focus, type-ahead jumps to a row, submenus open on `ArrowRight` and close one level on `Escape`/`ArrowLeft`, a pointer-clicked submenu row runs once). 0.10.0 has no `onContextMenu` — `onAuxClick` + `isRightClick`; no `aria-haspopup` and no portal |
| Command menus | done | partial | compound parts (`CommandMenu`, `CommandMenuInput`, `CommandMenuList`, `CommandMenuItem`, `CommandMenuEmpty`) over a dialog-hosted searchable palette composing Dialog and `menu/logic.ts`; default matching is a case-insensitive subsequence (initials match) ranked within each declared group so headings never repeat, with a custom `filter` keeping declaration order; input keeps focus while the highlight moves; 14 native behaviour tests + 12 fuzzy logic tests. Per-group rather than global ranking, no recent-command memory, `aria-activedescendant` unavailable, input is the host element until primitives lands |
| Tabs | done | partial | roving tab stop on the selected trigger, arrow wrap skipping disabled tabs, Home/End, automatic and manual activation, and both axes (`orientation` switches Down/Up movement and the row/column layout); caller `ref` and `onBlur` are composed with the internal ones; 14 native behaviour tests, both themes. 0.10.0 has no `aria-orientation`/`aria-controls`, so the panel is named by its value |
| Accordions | done | yes | single (with `collapsible`) and multiple modes over a tagged-union state; divider order, disabled sections, glyph indicator; arrows/Home/End move focus between enabled headers (wrapping, without toggling), caller `ref` composed on the header; 13 native behaviour tests + 15 transition tests. No height animation; no `transform` for a rotating chevron |
| Collapsible sections | done | partial | trigger with `aria-expanded`, content unmounts while closed; 4 native behaviour tests. Mounts instantly: 0.10.0's motion needs a numeric height and an auto-height reveal needs a measured first paint |
| Breadcrumbs | done | partial | declarative trail with `maxItems` collapsing the middle (first + … + tail), separators follow their item; 5 native behaviour tests + 7 collapse tests. No `aria-current` in 0.10.0, so the current page is text and colour |
| Pagination | done | partial | compound parts (`Pagination`, `PaginationPrevious`, `PaginationList`, `PaginationItem`, `PaginationNext`, `PaginationEllipsis`) over a derived window: the root clamps the page and computes the window once, so the caller never repeats the stable-width rule; 10 native behaviour tests + 9 window tests, both themes. Current page uses `aria-selected` because 0.10.0 has no `aria-current`; no page-size control |
| Search inputs | done | yes | leading glyph, conditional clear control, Enter submit, Escape clears only when non-empty, controlled/uncontrolled, caller `ref` composed with the internal focus ref; 7 native behaviour tests. No debounce (the consumer's job); the glyph is text until an icon set lands |
| Comboboxes | done | partial | compound parts (`Combobox`, `ComboboxTrigger`, `ComboboxContent`, `ComboboxInput`, `ComboboxList`, `ComboboxItem`, `ComboboxEmpty`) wrapping GPUix's headless combobox with our ranked option shape; the popup flips once off a snapping trigger and `align="center"` is measured, single and multiple selection by value, disabled rows, empty state, Escape focus restore, pointer selection/toggling and outside-press dismissal; 17 native behaviour tests + ranking suite, both themes. No async options/create-new, no `aria-activedescendant` |
| Date pickers | done | partial | compound parts (`DatePicker`, `DatePickerTrigger`, `DatePickerContent`, `DatePickerCalendar`) over a month grid (Effect `DateTime`, no `Date`), surfaced through `Popover`; arrow/Home/End/PageUp/PageDown, inclusive `min`/`max` that clamp movement and stop month browsing at the bound, a `clearable` reset to `null`, ISO-day value; 16 native behaviour tests + 18 calendar tests, both themes. Fixed English labels, no adjacent-month days, no time of day (see **Time pickers**), no `aria-current`, no `aria-disabled` (an unavailable day leaves the tab order and is named `, unavailable`) |
| Time pickers | done | yes | compound parts (`TimePicker`, `TimePickerSegment`, `TimePickerSeparator`, `TimePickerClear`); `HH:mm` 24-hour value (`null` = none), two labelled input segments, typed digits clamp per segment (`99` hours → `23`), arrows carry across the hour and wrap at midnight from one clock function, `minuteStep` for arrows only, blur pads both segments, opt-in `clearable` reset; 10 native behaviour tests + 12 logic tests, both themes. A field, not a trigger/popup (no `aria-valuenow` for a spinbutton); fixed 24-hour/no locale, no `aria-disabled` (disabled is `readOnly` + dimmed), no seconds or timezone |
| Message scroller | done | partial | `MessageScroller`, `MessageScrollerViewport`, `MessageScrollerItem`, `MessageScrollerJumpToLatest` over a pure pin/unread rule set; follows appended rows and a taller streamed row while pinned, leaves the reader's offset untouched when scrolled up, counts arrivals in the affordance, returns to the end on jump or wheel-down; 10 native behaviour tests + 11 rule tests, both themes. **Every row renders** (`<virtual-list>` takes an item count rather than compound children, so it is not virtualized in v1); the affordance sits beneath the viewport because `position: "absolute"` resolves against the mount parent; no resize observer and no `aria-live` in 0.10.0. **Probe (`message-scroller`, plan `300`):** `<virtual-list>` has no `onScroll` and the `onVisibleRange` payload is a built window with overdraw that lags one gesture; the pin must read `renderer.getListScrollTop(id)` inside the handler, and the runtime follows neither an append nor a growing row (scroll to `scrollToItem(list, count)` only while pinned). **Live (`live-scroller`, plan `301`):** the whole path holds in a real window (45 checks). |
| Fieldset | done | partial | `Fieldset` + `FieldsetLegend` over a `role="group"` named by the legend; `disabled` reaches `FieldInput` (read-only, out of the tab order, disabled roles) and dims only the legend; 7 native behaviour tests. 0.10.0 has no `fieldset` element and no `aria-disabled`, so the group state is not announced; other controls keep their own `disabled` |
| Form | done | partial | `Form` over an owned value: decodes with the caller's schema, shows every `validateAll` message in one `role="alert"` summary, calls `onSubmit` with the decoded value and refuses to submit while `pending`; a render prop hands over `errors`/`pending`/`submit` because the contract fixes Form as one part; 7 native behaviour tests. No field registration, no message-to-field mapping and no re-validation on edit |
| Navigation Menu | done | partial | `NavigationMenu`, `NavigationMenuList`, `NavigationMenuItem`, `NavigationMenuTrigger`, `NavigationMenuContent`, `NavigationMenuLink`: one anchored panel at a time, press/Enter/Space/ArrowDown open (ArrowDown focuses the panel), Left/Right/Home/End move between triggers, Escape closes through the shared dismiss stack and returns focus, outside press closes, links run once and close, controlled `value`; 10 native behaviour tests, both themes. No `href` in 0.10.0 (links are buttons with `onSelect`), no hover-open, no `aria-haspopup` |
| Preview Card | done | partial | `PreviewCard`, `PreviewCardTrigger`, `PreviewCardContent` over the anchored layer and the shared dismiss stack: delayed hover open (default 300 ms), immediate keyboard-focus open, pointer travel into the card keeps it open, close after leaving both (default 150 ms), Escape restores focus, outside press closes, press toggles (touch path), `open`/`openDelay`/`closeDelay` controlled; 8 native behaviour tests. Timers are component UI timers; no pointer-type signal (no touch hover), not auto-focused on hover, no anchor arrow or `aria-haspopup` in 0.10.0. **Probe (`preview-card`, plan `196`):** the card enter arrives **before** the trigger leave, the leave has no coordinates, and enter/leave are per element, so a close scheduled on the leave must re-check pointer presence at fire time and every hoverable child needs a handler. **Live (`live-preview`, plan `199`):** the contract holds in a real window; the enter and leave arrive in one React batch, so an append-only log is the reliable order. |
| Drawer | done | partial | `Drawer`, `DrawerTrigger`, `DrawerClose`, `DrawerContent` (left/right/bottom, sm/md/lg), `DrawerHeader`, `DrawerTitle`, `DrawerDescription`, `DrawerFooter` over the shared modal rules in `internal/modal.ts` (extracted from Dialog: open state, dismiss stack, focus in/return, Tab trap); 10 native behaviour tests, both themes. No swipe-to-dismiss (no drag host feature), no slide animation (no transform), no `aria-modal`/`aria-labelledby`, no portal (anchored veil), sizes are layout constants |
| Stepper | done | partial | `Stepper` + `StepperStep` over `role="list"`: statuses (`complete`/`current`/`upcoming`) derived from the one `value`, horizontal or vertical, `StateStyle<StepperStepState>`; 8 native behaviour tests. Display-only by design (no step click), no connector line, and `aria-selected` stands in for the missing `aria-current` |
| Timeline | done | partial | `Timeline` + `TimelineItem` over `role="list"`: an explicit `complete`/`current`/`upcoming` status (passed, not derived), timestamp/description, a connector after every event but the last, `StateStyle<TimelineItemState>`; 6 native behaviour tests, both themes. Display-only, no `aria-current` (the current event uses `aria-selected`), `last` comes from direct children, one connector style |
| Color picker | done | partial | one `ColorPicker`: a keyboard-reachable swatch grid (defaults are six theme colours), a HEX field that normalises `#abc`/`AABBCC` on commit, a live preview and `StateStyle<ColorPickerState>`; 8 native behaviour tests + 8 hex tests, both themes. **No saturation/value square** — 0.10.0 has two-stop linear gradients only and no radial gradient, so the square is not faked; no alpha/HSL/RGB fields or eyedropper |
| Tag / token input | done | partial | `TagInput` + `TagInputField` + `TagInputChip`: Enter and a typed comma commit through a pure add/remove rule set, duplicates refused unless `allowDuplicates`, `max` caps additions, a chip control removes, controlled-only value, `StateStyle` on both field and chip; 8 native behaviour tests + 10 rule tests, both themes. No Backspace-on-empty (0.10.0 emits no keyDown for Backspace/Delete in the test renderer), no `aria-disabled` (readOnly + dimming), no autocomplete |
| Mention input | done | partial | `MentionInput` + `MentionInputList` + `MentionInputItem`: the text's last `@` token opens a ranked anchored list (prefix matches first, case-insensitive, capped), arrows wrap, Enter (the input's submit event) or a press inserts `@name `, Escape and a no-match query close, both callbacks fire once, `disabled`; 9 native behaviour tests + 12 rule tests, both themes. The query comes from the text, not the caret (no caret API in 0.10.0), a space while the list is open is consumed by the runtime, and `listbox`/`option` roles are dropped from the a11y dump (rows are selected buttons) |
| Hotkey-recorder input | done | partial | one `HotkeyRecorder`: click/`Enter`/`Space` listens, a real chord reports the shared accelerator string, Escape cancels, blur cancels, a named clear control unbinds, `disabled` leaves the tab order, `StateStyle<HotkeyRecorderState>`; 8 native behaviour tests + 8 capture tests, both themes. No `preventDefault` in 0.10.0 (a captured system chord still fires), clearing is a control because the test renderer emits no Backspace/Delete, no conflict detection |
| Countdown | done | yes | one `Countdown` over `<text>`: `MM:SS` under an hour, uncapped `HH:MM:SS` after, opt-in `Nd ` prefix, floored seconds, negatives clamp to `00:00`, expired renders `mutedForeground`; 5 native behaviour tests + 9 formatting tests, both themes. The component owns **no timer** — the app ticks with Effect `Clock` and passes `remainingMs`; fixed locale-free format, no `role=timer` for live announcement in 0.10.0 |
| Carousel | done | partial | `Carousel`, `CarouselTrack`, `CarouselSlide`, `CarouselControl`: discrete stepping with clamped edges, `loop` wrapping, arrow/Home/End keys, controlled/uncontrolled index, slides kept mounted and hidden with `display`, `StateStyle<CarouselSlideState>`; 8 native behaviour tests, both themes. **No slide animation** (motion has no transform) and no swipe; no indicator dots or auto-advance; slides must be the track's direct children |
| Inline edit | done | partial | one `InlineEdit` that swaps a `role="button"` display for a real `<input>`: Enter or blur commits (once), Escape discards, an unchanged draft calls nothing, empty text is a valid value, controlled/uncontrolled edit state, `StateStyle<InlineEditState>`; 8 native behaviour tests, both themes. No `contenteditable` in 0.10.0 (the swap is explicit); no `aria-invalid`/`aria-describedby`; blur commits by contract |
| Keyboard shortcuts / keycap display | done | yes | `KeyboardShortcuts`, `KeyboardShortcutsGroup`, `KeyboardShortcut` and `Keycap` over the shared accelerator model (`mod` adapts to the platform; order preserved; unknown tokens display verbatim); 6 native behaviour tests + 10 accelerator tests, both themes. Display-only by design (a row documents a chord, never binds it); no `aria-keyshortcuts` in 0.10.0; rows are separated by 1px elements because an element has one `borderColor` |

## Tier 3 — data presentation

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Tables | todo | ? | No `<table>` element; grid + `div` rows. Keyboard row navigation builds on the `roving-focus` contract. **Pinned chrome (`grid-wide-table`, plan `185`):** `position: "sticky"` is **ignored** by 0.10.0 (a sticky header scrolls with its content; `style.rs` maps only absolute/fixed/relative), so a header and a frozen column must be derived from the body's one scroll offset (`renderer.getScrollOffset`) and re-rendered from it — measured alignment within 1 px on both axes under a wheel pan. `role="gridcell"` maps to AccessKit `GridCell`, and `aria-selected` reaches the dump. |
| Sortable tables | todo | ? | Grid + keyboard headers. **Live (`live-table-sort`, plan `340`):** a real click on `table-sort` reorders the row the automation tree points at (`table-first` becomes `Item 199`), a click selects `r199`, and the selection survives a re-sort. **Playground (`data-grid-virtual`, plan `338`):** sorting a virtualized grid from anchor 45 must reset the list to row 0 (`scrollToItem`) — without the reset the anchor stays 45 and the frozen column shows unrelated rows; ascending then paints `Item 000`, descending `Item 059`. |
| Row selection | todo | ? | `aria-selected` is supported (verified). **Live (`live-table-sort`):** a real row click selects by row id and the selection survives a re-sort. **Playground (`data-grid-virtual`):** clicking a cell in a horizontally panned virtual row selects its row, moves native focus to the cell and does not move the pan. |
| Column configuration | todo | ? | Grid tracks + a menu. **Two measured shapes:** a wide grid can window columns in component code (`grid-wide-table`) or put all columns inside a `<virtual-list>` that is wider than its viewport (`data-grid-virtual`). The second shape pans the header and every row from one plain scroller; a `deltaX` wheel over the **header** pans, while the same wheel over a body cell is swallowed by the list (a grid needs a pan affordance outside its rows). Columns are **component-windowed** on a wide table: `grid-wide-table` keeps only the visible columns in the tree (at `x=-360` columns 3–10; at the end 17–23), because the runtime keeps clipped children in its paint log. Track widths are `style.width` per cell; `gridTemplateColumns` is a count, not a track list. |
| Resizable columns | todo | ? | Pointer events + grid tracks. |
| Filtering controls | todo | ? | `div` + `<input>`. |
| Data toolbars | todo | ? | Toolbars + Button groups. |
| Virtualized lists | todo | yes | `<virtual-list>` published. `scroll-into-view` measures the scroll contract: `focusElement` reveals a row by itself; `scrollToItem`/`scrollIntoView` reach exact anchors; **`getScrollOffset` saturates on a virtual list — persist `getListScrollTop`** (`[itemIndex, offsetInItemPx, viewportHeightPx]`); a scroll does not move focus. **A resized pane (`workspace-panes`)** re-windows the list against the **clipped** intersection (a list fixed at `120` still painted fewer rows when its pane shrank), and the anchor survives the resize and a tab switch. **Variable heights (`variable-rows`, plan `198`):** declared row heights stack exactly (20/40/60), an in-place expansion reflows the rows below by the exact delta with the anchor intact, and `scrollToItem`/`scrollIntoView` stay exact — so an expandable row or a wrapped cell needs no fixed-height assumption. The list needs a resolved height: derive it from the split. **Live (`live-table`, plan `197`):** a real window reports the same anchor through the renderer — `[0, 0, 258]` at rest and `[120, 0, 258]` after `scrollToItem(120)` — so persistence is assertable live. |
| Virtualized tables | todo | yes (probe) | `virtualized-table`: fixed-height flex rows with fixed-width cells paint inside `<virtual-list>` (~9 of 500), a painted row is hittable and selects, and selection survives scrolling out and back. **The data-grid composition (`data-grid-virtual`, plan `338`):** a `<virtual-list>` wider than its viewport inside a plain horizontal scroller keeps painting and scrolling while panned; a frozen column placed from `getListScrollTop` read inside `onVisibleRange` aligns with the body within 1 px (the payload is not a sync source — it left the anchor at 0 after a 280 px wheel), and a row-set change (sort/filter) must reset the anchor. `onVisibleRange` **lags the painted window by one gesture** — use the painted rows, not the event, as the current window. The AccessKit tree also follows the painted window, so off-window rows are not exposed to assistive technology (`a11y-tree`). **Windowing both axes is component code** (`grid-wide-table`, plan `185`): there is no horizontal virtual list, so a wide grid derives the visible column **and row** ranges from the body offset, keeps only that range plus overdraw in the tree, and reveals a keyboard-selected off-window cell with a component-owned `scrollTo` (`-260` in the probe). |
| Tree views | todo | yes (probe) | `tree-view`: `paddingLeft` indents labels exactly (16px per depth); expand/collapse paints and unpaints the subtree; a clicked row takes native focus and receives arrow keys. `virtualized-tree` adds the virtualized form: 16 px per depth inside `<virtual-list>`, a count change from 8 to 48 rows repaints correctly, and Down/Up move native focus by roving index even for a row outside the window. |
| Expandable rows | todo | yes (probe) | `motion` height for an accordion; **inside a `<virtual-list>` it needs no motion** (`variable-rows`, plan `198`): declared row heights stack exactly, an in-place `60 → 120` expansion moves the rows below by exactly `+60`, the anchor stays `[0, 0, viewport]`, and the painted window shrinks to fit. Declare the height from state; no measurement pass and no manual scroll. |
| Key-value displays | todo | ? | `div` + `<text>`. |
| Property panels | todo | ? | Fieldset + Inline validation + Key-value displays. |
| Statistic / metric cards | todo | ? | Cards + `<text>`. |
| Charts | todo | partial (probe) | No chart host element. **`<canvas>` is unsupported** — retained but renders `gpui::Empty`, so no bounds and no children paint (`native-surfaces`). **`chart-svg` gives the recipe:** bars from `div`s are exactly assertable (geometry, token colour, painted hit-testing); a sourced `<svg>` is an **alpha mask tinted by one `color`**, so a line/area series is **one `<svg>` layer per series** in an absolute slot (both layers paint the same box; each reports its own tint); SVG-internal text is rasterized and invisible to `getPaintedText`/a11y, so axis and value labels are `<text>` siblings; an `<img>` SVG data URL is the **full-colour** path — it paints gradients and multiple fills (screenshot evidence; no pixel readback). |

## Tier 4 — desktop workspace

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Resizable split panes | todo | partial (probe) | Pointer events + `motion`; `col-resize`/`row-resize` cursors are provided (verified). **Both axes + keyboard (`panel-nested`, plan `175`):** `dy` drives a vertical split exactly (`180 → 228`, painted height agrees), arrows resize the focused divider by 16 px, and the divider is exposed as an AccessKit `Splitter` with its size on `aria-valuetext` (no `aria-valuenow`/`aria-orientation` exist). A `focusNext` leaves the divider; the nested reverse edge does not re-enter it (§8). |
| Panel groups | todo | partial (probe) | Composition over split panes. A split nested in a pane resizes **independently** of its parent (`panel-nested`: inner `300 → 360` while the outer stayed `228`). **`docking-layout`:** each group is a named `Region` containing a `TabList`, `Tab`s and a labelled `TabPanel`, and the dump exposes all four roles (plus the divider's `Splitter`); every split must be `key`ed by its node id, because a collapse reparents a surviving split into its parent's position and React otherwise reuses the parent's size state. |
| Collapsible sidebars | todo | partial (probe) | `motion` width (outer clipping container, not inner reflow) — measured by `motion-collapse` on 0.10.0: exact intermediate widths under the paused clock, inner pane keeps its width. **`live-motion` (plan `192`)** repeats the 80 ms / 96 px of 240 frame in a **real window** and confirms the live clock is the motion clock. **`panel-nested`:** width `0` paints `0` with no residual border or padding and the neighbour absorbs the space; re-opening paints the full width. |
| Tabbed panels | todo | partial (probe) | Tabs + panels. The strip's overflow contract is measured by `tab-strip-overflow` (horizontal pan, clipped children keeping bounds, component-owned reveal; clamp the near end — the renderer stops at `x = -5`, not `0`) and its keyboard contract by `tab-strip-focus` (a clipped tab is a tab stop that focus does not reveal; a roving strip is one stop and reveals on End/Home). **The pane body (`workspace-panes`, plan `177`):** `display: "none"` is a **no-op** in 0.10.0 — the inactive pane still laid out and stole a click — so panes stay mounted and overlap in absolutely positioned slots with `visibility: "hidden"` + `pointerEvents: "none"`. That keeps the pane's draft, pick and virtual-list anchor across a switch and also removes its tab stop. Pass a content height derived from the split (a `height: "100%"` chain gives a virtual list no viewport). A nested scroller **chains** the wheel unless it sets `pointerEvents: "auto"`. |
| Detachable / movable tabs | partial (probe) | partial (`float-tab`) | Needs a portal/drag model; no drag host feature. `drag-targets` measured the missing piece: hover is frozen during a captured drag, so the pane under the pointer cannot highlight itself (hit-test from pointer coordinates as `workspace-tab-drag` does); the gesture also ends in a click on the source tab. **`drag-autoscroll`:** the runtime does **not** scroll a held drag at an edge — the strip must own an edge loop (`renderer.scrollTo` per held move), which keeps the capture and the up, and derive the drop index from the pointer and the live offset. **`docking-layout` is the in-window destination:** a held tab drag keeps arriving while the drop indicator re-renders on every move, the release applies exactly one drop, an edge drop splits the target and a centre drop merges, and moving a group's last tab out prunes it and collapses its split. A new OS window is not available: 0.10.0 exposes one app window (`render` + `WindowOptions`), no `openWindow`. **`float-tab` (plan `194`) is the in-window float:** a captured tab drag released outside the dock opens an absolutely positioned panel at the release point (the last held move), rendered as the app root's **last child** so it paints above and takes the click where it overlaps the dock; its title bar drags it by the pointer delta and a component-owned clamp pins it to `(app − size)`; it owns native focus, Escape closes it and returns focus to the dock's active tab; dragging its tab back onto the strip appends and activates it and prunes the emptied window; the whole thing round-trips through the `{ dock, float }` JSON snapshot. Two limits: no drag preview (the panel appears on release), and a close control nested in the press-captured title bar does not fire — keep drag surfaces and controls as siblings. **`live-float` (plan `195`)** repeats the whole path in a real window (paced drag, release point within 1 px, exact title delta, focus/Escape, close); it also caught a **live-only** race — the drag-ending click re-applied the pre-drag dock from a stale closure and resurrected the torn-off tab — so a tab click must be idempotent against the gesture-ending click (a functional state update here, click suppression in a destructive component). |
| Docking layouts | todo | partial (probe) | Composition over split panes + tabs. **`docking-layout` measures the mechanism:** a pane layout is a recursive React tree whose surface rectangle comes from component code (`ref` → `PublicInstance.id` → `renderer.getElementBounds`), and the pure model's boxes for every group match the runtime; the drop indicator is an **absolute child of a `position: "relative"` pane**, pixel-exact (a 4 px bar on the edge, the whole pane for a centre), `pointerEvents: "none"`, tinted by the theme's `primary`; the zone is a 48 px edge band with the nearest edge winning a corner; a right/bottom drop puts the new group **secondary**, left/top **primary**; an emptied group is pruned and its split collapses to the survivor (measured at the top level too); and a recursive layout — outer `280`, nested `324`/`197` — restores exactly through a keyed remount of the model. |
| Nested panel arrangements | todo | partial (probe) | Composition. A vertical outer split holding a horizontal inner split is measured end to end: both axes resize, the nested drag leaves `outer = 228`, and the top pane's painted height/width track the readouts (`panel-nested`). |
| Workspace layouts | todo | ? | Composition + persistence. **Measured (`workspace-restore`)**: a keyed remount loses the layout; app-owned JSON restores split width, tab lists, active tab and the virtual-list anchor exactly. No renderer storage, and native focus is not restored. **Composition (`workspace-panes`)**: a hidden pane keeps its own state and anchor; a resized pane re-windows its list (`5 → 2` painted rows at `240 → 180`) and keeps the anchor; a nested scroller needs the `pointerEvents: "auto"` wheel guard. **Live (`live-restore`, plan `339`):** the same layout, tab and anchor survive in a real window, and the painted pane width (400) agrees with the snapshot within 2 px. |
| Persistent panel state | todo | ? | App-owned serialisation; no renderer storage. The format `workspace-restore` measured: `{ split, tabsA, tabsB, active, anchorIndex, anchorOffset }`, decoded with `Schema` at the boundary; persist `getListScrollTop`'s index/offset (never `getScrollOffset`, which saturates) and apply it with `scrollToItem(listId, index, offset)` on mount. **Recursive layouts (`docking-layout`)**: the tree owns every split size; `encodeDock`/`decodeDock` are the JSON boundary (`Schema.fromJsonString`), and a restore is a **keyed remount** so each `SplitPane` re-reads `initial` — the live instance's state is not mutated. A corrupt snapshot decodes to `None` and is reported, never thrown. **The anchor is live-readable** (`live-table`, plan `197`) **and the restore is proven in a real window** (`live-restore`, plan `339`): a paced drag paints the split 320 → 400, save → reset → restore re-applies the split, the active tab and the anchor `[120,16]` exactly, row 120 paints and row 0 does not, native focus is **not** restored, and the restored list still takes a click. |
| Keyboard navigation | todo | ? | Real native focus handles (verified); `roving-focus` measured programmatic focus between passive rows, key delivery after the move, and focus surviving a virtual window scroll. The roving-tabindex model is ours. **`live-focus` (plan `190`)** proves the modal's Tab/Shift-Tab containment and focus return in a real window, not only in `TestRenderer`. |
| Command palette | todo | partial (probe) | `<input>` + `FloatingLayer` + `<virtual-list>`. Variant merged here: Spotlight (adabraka `spotlight`). **Measured (`command-palette`, plan `176`):** a non-modal overlay keeps **one** focus owner — the input stays focused while arrows move a visual active row (no `aria-activedescendant`; the row's only AT form is `aria-selected` on a `ListBoxOption`, inside a `Dialog`) — arrows arrive as key **down** and Enter as `onSubmit`; the app-level window handler sees letters, arrows and Escape while the field is focused but **not Enter or Backspace**, so commit/dismiss must stay in the field and the window handler is a chord layer only; `cmd-k` reaches it without typing; the scrim is a **sibling** under the surface, so row clicks land above it and a veil click dismisses; focus is captured in the open handler and restored to the trigger on close. |
| Application menus | todo | unsupported (in-window only) | **The published 0.10.0 has no menu/tray API**: `@gpuix/native`'s `NativeRenderer` exposes only window controls (`setWindowTitle`, `activateWindow`, `minimizeWindow`, `zoomWindow`, `toggleFullscreen`), and no `menu`/`Menu`/`tray` symbol exists in the native or React types. An application menu must therefore be an **in-window** surface opened by a window key — the path `command-palette` measures end to end (`cmd-k`, Escape delivery, focus return). A true macOS menu bar would need a renderer API that is not in this version. |
| Status bars | todo | ? | `div` + `<text>`. |
| Toolbars | todo | ? | `div` + Button groups. |
| Breadcrumb navigation | todo | ? | Breadcrumbs + navigation. |
| Inspector panels | todo | ? | Property panels + panels. |
| Property editors | todo | ? | Fieldset + inputs. |
| File trees | todo | yes (probe) | Tree views + `<virtual-list>` — `virtualized-tree` proves the combination: 328 flattened rows, 16 px per depth inside a virtual row, expand/collapse from 8 to 48 rows, click/arrows with native focus, and focus surviving the window moving away. Hierarchical virtualization itself is ours; an off-window row is invisible to the accessibility tree (`a11y-tree`). |
| Log viewers | todo | yes (probe) | `log-viewer`: `<virtual-list alignment="bottom" followTail>` starts at the tail and re-anchors on appends; `bottom` alone and `top` + `followTail` alone both anchor at the bottom. Scrolling up then appending does **not** snap back, so a follow toggle is app state plus a scroll. `<text>`; text search/highlight hooks exist. Copy is native: `text-selection` selects across text rows and `<code>`/`<diff>` copy excludes chrome, but a drag anchored in a `userSelect: "none"` gutter selects nothing — a text row, not the gutter, must anchor the selection. |
| Terminal surfaces | partial (probe) | partial (`terminal-grid`) | **No terminal host element and no PTY/process API** in 0.10.0 (`ElementType` ends at `virtual-list`; `GpuixRenderer` has only window/focus/scroll/selection/image/prompt methods), so a terminal is a text grid with the PTY owned by the app. `terminal-grid` measures the library's half: a click focuses the surface (a `div` with `role="textbox"`; removing `tabIndex` did not stop the focus), printable keys reach its `onKeyDown`, Enter/Up/Backspace/Escape and `ctrl-c` (`modifiers.ctrl`) are delivered, 18 px rows align to the same width for equal character counts in the theme's mono family, per-run `paintedStyle.color` carries `destructive`/`success`, and a 200-line `<virtual-list>` starts at the tail while the prompt row — a **sibling**, not a list row — keeps focus and text across scrollback jumps. Limits: no per-cell background/glyph atlas (a caret is a themed `div`), ANSI parsing and the PTY are the component/app's. |
| Search and replace | partial (probe) | partial (`replace-contract`) | `useTextSearch`/`findRanges` highlight rendered text; the replace UI is ours. **Find (`search-highlights`, plan `171`):** washes paint in window coordinates, a soft wrap paints one box per row, a surrogate-split range is refused, `<code>` is searched by `query` (not `ranges`), and a virtual row's `matchIndexOffset` numbers matches document-wide; the wash colour is not reported. **Replace (`replace-contract`, plan `333`):** an `<input>`'s text is **not** highlightable (`matchCount=0`), so the matches must be painted on a rendered preview, not in the editor; a component-set value repaints the editor; **the caret moves to the end** across the rewrite (a typed `z` landed after the final period, not at the old offset); there is **no `setSelection`**, so the active match, replaced range and caret cannot be placed programmatically. Also measured by `search-replace` (plan `334`): the document re-washes and recounts after a mutation, a count-preserving replacement moves the washes without a count event, length changes shift downstream matches exactly, and `<code>` re-highlights by prop. |
| Multi-pane editing layouts | todo | ? | Composition over split panes + editors. |

## Tier 5 — specialised

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Code editor integration | todo | ? | `<code>` renders highlighted code; there is **no editable code surface** (verified). `<code>` text is selectable and copies without line numbers (`text-selection`), so a read-only viewer can offer copy today. |
| Syntax highlighting | todo | yes | `<code>` renders syntax-highlighted blocks with bundled languages. API-shape work, not implementation. |
| Diff viewer | todo | yes | `<diff>` renders a unified diff. API-shape work, not implementation. Evidence: `native-surfaces` — the file header, hunk header and changed lines all reach the paint log, and the surface is painted at its declared width. `text-selection` — a drag across the diff copies only line text (no header, hunk, gutter or marker). |
| Rich-text editing | todo | partial (probe) | **Rendering is provided and measured** — `<markdown>` paints GFM (heading, emphasis, inline code, list, bordered table, fenced code with highlighting) as addressable text; a crossing drag copies it; a coordinate click on a link fires `onLinkClick` with the URL; children are retained but unpainted; `role="article"` is one named AccessKit region (internal headings/table are not nodes). Runtime: `markdown-surface`. **Editing** is not provided: no editable rich-text surface, and the internal block runs are not exposed as elements. A rich-text editor needs a separate model and `<input>`/`<textarea>` only, or is out of scope. |
| Image preview | todo | yes | `<img>` loads raster and SVG from path/data URL/http(s). API-shape work, not implementation. Evidence: `native-surfaces` — a valid PNG data URL lays out at its box with no fallback, a missing `src` paints `img: no src`, an undecodable one paints `img: load failed`, and `setImagePixels` through the ref uploaded a bitmap without throwing. No pixel readback, so a corrupt bitmap with a valid MIME is indistinguishable from a decoded one. |
| File / folder selection | todo | yes | `GpuixRenderer.promptForPaths` opens the platform picker. API-shape work, not implementation. |
| Drag and drop | todo | ? | Mouse events exist; there is no drag host feature. `drag-targets`: pointer capture keeps moves and the up on the source, **hover is frozen during the drag**, the drag ends in a click on the source, and a drop on an element without `onFileDrop` still fires a click. `drag-autoscroll`: a held drag at a container edge does **not** auto-scroll; the component owns an edge loop (`renderer.scrollTo` on each held move, which keeps the capture), the derived drop index and the click suppression. |
| Notification centre | todo | ? | Composition over toasts + panels. |
| Multi-step forms | todo | ? | Variant merged here: Form (adabraka `form`) — partial coverage; validation orchestration is the Tier 2 Form row. |
| Virtualized hierarchical data | todo | yes (probe) | Tree views + `<virtual-list>` — `virtualized-tree` measures the model: flatten, indent by depth, a changing row count, roving focus by index, and the focused row staying painted outside the window. Only the painted window reaches the accessibility tree, so a keyboard-focusable row outside it is invisible to assistive technology (`a11y-tree`). |
| Advanced filtering / query builders | todo | ? | Composition over inputs + menus. |
| QR code | todo | ? | Render the matrix as a grid of `div`s or one `<svg>`; both are provided. The encoder is ours (dependency not yet chosen). |
| File upload | todo | ? | Picker provided (`promptForPaths`); the drop surface, progress and validation are ours. `onFileDrop` exists and `drag-targets` measured it: absolute paths plus the window drop point, but the simulation also emits moves, and a drop on an element without a handler fires a click. |
| Video / audio player + waveform | todo | ? | **No media host element** (verified: not in `ElementType`). Playback needs a platform surface — **unverified**; a waveform can only be drawn via `<svg>` or the planned `<canvas>`. |
| Crop area | todo | ? | Draggable handles over `<img>`; crop geometry and constraints are ours. No custom-paint requirement unless the mask is drawn — **unverified**. |
| Chat (AI conversation) | todo | ? | Behaviour ported from **shadcn/ui's AI Elements `chat`** (credited in `LICENSES/`): a message list in a Message scroller, a composer with attachments, submit/stop, `idle/submitting/streaming/error` states, empty state. Plan `207`. |
| Message (AI message row) | todo | ? | Behaviour ported from **shadcn/ui's AI Elements `message`** (credited): `user`/`assistant`/`system` variants; avatar, content (`<markdown>`), actions (copy/retry/feedback), attachments, reasoning, tool calls, sources, streaming indicator. Plan `207`. |

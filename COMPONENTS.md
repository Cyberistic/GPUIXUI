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
pinned `@gpuix/native@0.10.0` built from the **release tag** (`gpuix 9fcd6288`,
`zed 81c99f81`) with `gpui_macos/runtime_shaders` (ADR 0003 as amended by plan
`529`). The suite fails before running if the installed binary carries a
capability that release does not have. Reproduce it with:

```sh
nub run --filter playground build && nub apps/playground/dist/smoke/run.js
```

| Capability | Scenario | Verdict |
| ---------- | -------- | ------- |
| layout | `layout-flex`, `shell-navigation`, `shell-selection`, `live-layout-flex` | verified |
| root | `root-single-child`, `root-wrapper` | verified |
| grid-layout | `layout-grid`, `live-layout-grid` | verified |
| typography | `typography-layout`, `live-typography` | verified |
| text | `text-native`, `live-typography` | verified |
| input | `input-edit`, `text-entry`, `pointer-text-entry`, `input-payload`, `live-input-payload`, `live-pointer-entry`, `live-text-entry` | verified |
| focus | `focus-traversal`, `roving-focus`, `tab-strip-focus`, `live-focus`, `live-roving-focus` | verified |
| overlay | `overlay-dialog`, `live-overlay` | verified |
| modal | `modal-focus-trap`, `live-overlay`, `live-focus` | verified |
| floating | `floating-placement`, `live-floating` | verified |
| select | `select-choose`, `live-select` | verified |
| combobox | `combobox-filter`, `live-combobox` | verified |
| tooltip | `tooltip-open`, `live-tooltip` | verified |
| scroll | `scroll-container`, `scroll-into-view`, `tab-strip-overflow`, `live-scroll-into-view` | verified |
| panel | `panel-resize`, `panel-nested`, `live-panel`, `live-panel-nested` | verified |
| virtual-list | `virtual-list-window`, `variable-rows`, `live-table`, `live-variable-rows` | verified |
| table | `table-select-sort`, `table-column-resize`, `virtualized-table`, `live-table`, `live-table-sort` | verified |
| tree | `tree-view`, `virtualized-tree`, `live-tree` | verified |
| log | `log-viewer`, `live-log` | verified |
| workspace | `workspace-tab-drag`, `workspace-restore`, `live-restore`, `workspace-panes`, `live-workspace-panes` | verified |
| docking | `docking-layout`, `live-docking` | verified |
| float | `float-tab`, `live-float` | verified |
| preview | `preview-card`, `live-preview` | verified |
| command | `command-palette`, `live-command-palette` | verified |
| theme | `theme-color-roles`, `theme-type-and-shadow`, `theme-platform`, `live-theme`, `live-theme-platform` | verified |
| a11y | `a11y-tree` | verified |
| motion | `motion-collapse`, `collapsible-height`, `live-motion`, `live-collapsible` | verified |
| content | `native-surfaces`, `live-content`, `markdown-surface`, `live-markdown`, `diff-surface`, `live-diff` | verified |
| diff | `diff-surface`, `live-diff` | verified |
| drag | `drag-targets`, `drag-autoscroll`, `live-drag-targets`, `live-drag-autoscroll` | verified |
| reorder | `list-reorder`, `live-reorder` | verified |
| tree-reorder | `tree-reorder`, `live-tree-reorder` | verified |
| selection | `text-selection`, `live-selection`, `selection-signal`, `live-selection-signal` | verified |
| menu | `context-menu-pointer`, `live-context-menu` | verified |
| components | `primitives-actions`, `primitives-fields`, `primitives-display`, `primitives-choice`, `primitives-entry` | verified |
| search | `search-highlights`, `live-highlights`, `live-search-replace` | verified |
| terminal | `terminal-grid`, `live-terminal` | verified |
| chart | `chart-svg`, `live-chart` | verified |
| toast | `toast-lifecycle`, `live-toast` | verified |
| notification | `notification-centre`, `live-notification-centre` | verified |
| grid | `grid-wide-table`, `live-grid` | verified |
| data-grid | `data-grid-virtual`, `live-data-grid`, `data-grid-columns` | verified |
| columns | `data-grid-columns`, `live-data-grid-columns` | verified |
| column-config | `column-config`, `live-column-config` | verified |
| chrome | `app-chrome`, `live-app-chrome` | verified |
| layers | `nested-layer-dismiss`, `live-layers` | verified |
| scroller | `message-scroller`, `live-scroller`, `tier2-scroller`, `live-tier2-scroller` | verified |
| scale | `scale-cost`, `live-scale` | verified |
| tier2 | `tier2-dialog`, `tier2-menu`, `tier2-toast`, `tier2-foundation`, `tier2-navigation`, `tier2-choice`, `tier2-forms`, `tier2-editing`, `tier2-flow`, `tier2-scroller`, `tier2-command` | verified |
| replace | `replace-contract`, `live-replace` | verified |
| states | `declared-styles`, `live-states` | verified |
| truncation | `text-truncation`, `live-truncation` | verified |
| inspector | `property-panel`, `live-inspector` | verified |
| editor | `multi-pane-editor`, `live-editor` | verified |
| data-toolbar | `data-toolbar`, `live-data-toolbar` | verified |
| query | `query-builder`, `live-query-builder` | verified |
| crop | `crop-area`, `live-crop-area` | verified |
| cell-editing | `grid-cell-editing`, `live-grid-cell-editing` | verified |
| upload | `file-upload` | verified |
| menubar | `menu-bar`, `live-menu-bar` | verified |
| qr | `qr-code`, `live-qr` | verified |
| media | `media-surface`, `live-media` | verified |
| window | `window-layout`, `live-window` | verified |
| frames | `frame-stats`, `live-frames` | verified |

The suite is **105/105 green here** (exit `0`, `.artifacts/smoke-report.json`, **3765 checks**, 65 capabilities). The live suite **last ran in full at 94/94**
(`live-report.json`, **2447 checks**, 61 capabilities, 989.9 s, exit `0`) on
2026-10-19, the merge/release gate on the final branch; it covered every live
scenario registered at that point, including `live-scale` (plan `620`, the
retained-tree cost model in a window), `live-selection-signal` (plan `615`,
the window's selection-change event), `live-toast` (plan `623`, the viewport's
layering and focus contract), `live-text-entry` (plan `624`, the native
editor contract), `live-roving-focus` (plan `637`), `live-theme` (plan `643`,
the palette switch in a window), `live-diff` (plan `648`, the diff
interaction contract) and `live-theme-platform` (plan `654`, the platform type
styles in a window). Both `host` lines carry
the pins. The
0.10.0 box contract (plan `529` §6.3) — bounds report a content origin and a
borderless size — is what every geometry check now asserts. **Registered live
scenarios are 93**, and the gate covers all of them; the live registry is guarded
by `liveScenarioProblems` (plan `639`).

**The paint counter is structural (plan `527`, `frame-stats` + `live-frames`):**
`getDebugFrameOverlayStats()` counts **paints**, not frame-loop ticks — an idle
live window did not repaint across 300 ms, while a click grew the count. A read
is free (two consecutive reads are equal) and `flush()` is exactly one frame, so
a test can prove a repaint instead of guessing with `advance(0)`
(`advanceTime(0)` is not a paint). `resetDebugFrameOverlayStats()` clears only
the **sample ring**: the lifetime `frames` count keeps growing, and the reset
leaves one sample whose `p90`/`p99`/`max`/`current` all equal that paint. The
ring is bounded at **1000 samples** while `frames` keeps counting. The timings
are ordered (`p90 ≤ p99 ≤ max`, `current ≤ max`). The debug overlay (hidden →
minimal → full → hidden) is a **paint-only** layer: it adds no retained host
nodes, changes no painted text and never intercepts a click underneath it, so a
screenshot with the overlay on still shows the live interaction. One gesture is
**not** one frame — a headless click cost 4 frames and a native wheel 2 — so
never use `frames` to count gestures.

**The window is the layout root (plan `526`, `window-layout` + `live-window`):**
`useWindowSize()` reports the window's paintable size exactly — `1280x800` under
the offscreen `TestRenderer`, `1100x720` in the runner's real window — and it
**observes a real resize**: `zoomWindow()` moved the live window to `1680x923`
and a second call restored `1100x720`, with a React render for each. The
observer is a **100 ms poll** (`intervalMs`), not a native event: a consumer
cannot expect a synchronous frame, only an update within ~100 ms. The desktop
insets (`safeArea`/`ime`/`effective`) are **all zero**, and `GpuixRenderer` has
**no window-drag API** — `getWindowSize`/`getWindowInsets`, `zoomWindow`,
`toggleFullscreen`, `minimizeWindow`, `activateWindow` and `setWindowTitle`
exist, but nothing starts a window move. So a custom title bar can paint under
the traffic lights (`titlebarTransparent`, `trafficLightX/Y`) but cannot drag
the window; the native title bar is the honest default. Because 0.10.0 has no
container query and no `onLayout`, the window is the **only** React-visible
breakpoint source: a pane's own width must come from a `ref` +
`renderer.getElementBounds` read (`docking-layout`, plan `184`).

**Input payloads (plan `533`, `input-payload` + `live-input-payload`):** a
**double click is not observable** — `clickCount` is `1` for every click in both
harnesses, including real press/release pairs 80 ms apart, so a component must
own a second-press rule (as `Grid` already does) and no component may expose an
`onDoubleClick` contract. On a text field `keyChar` carries the produced
character (`é`, `日`, a space) while `key` carries the key name (`space`); on a
plain focusable `div` `keyChar` is absent. `isHeld` is populated (`false` for a
first press, `true` for a repeat) and the host can now produce the repeat. The
native editor consumes `cmd-a` before React's `onKeyDown` (the field's key log
sees no `cmd-a`, yet the next character replaces the whole value). A synthetic
wheel is always `precise: true`, `touchPhase: "moved"`, so `precise` cannot tell
a trackpad from a line wheel in a test.

A second, smaller suite runs the shipped playground in a **real window**
(`nub run --filter playground smoke:live`, plan `189`). The last full run was
**94/94 green** (2447 checks, 61 capabilities, 989.9 s) on the release-tag
binding, and the **full
live suite is a merge/release gate** rather than a per-task check: `layout`, `root`, `window`, `frames`, `input`, `scroll`, `panel`, `floating`, `motion`, `overlay`, `focus`,
`selection`, `menu`, `menubar`, `docking`, `float`, `components`, `table`, `search`,
`preview`, `scroller`, `workspace` (restore and tabbed panes), `table` (sort and selection) `tier2`, `columns`, `column-config`, `crop`, `media`, `chrome`, `replace`, `editor`, `data-toolbar`, `query`, `command`, `cell-editing`, `grid`, `scale`, `reorder` and `tree-reorder` are confirmed there too
— the shell fills the window and navigates by click and
Enter, typing reaches `onChange`/`onSubmit` in a live editor, a modal opens
centred and Escape closes it, a wheel moves a live container with its
`onScroll` delta, a paced divider drag resizes a live split (`320 → 400`), a
paced tab drag onto a pane edge splits it (`panel-1=notes@notes`), a virtual
row is hit-testable and its list scrolls while keeping the selection, and the
**shipped** `Button`/`Toggle` run (`live-primitives`). **`live-command-palette`
(plan `389`)** drives the Tier 4 command surface end to end: `cmd-k` opens it
with nothing focused, the veil is the full window, typing filters while the
window handler still sees the keys, arrows move the row and keep focus in the
input, Enter commits through `onSubmit`, and Escape, a veil press and a row
click dismiss with the recorded reason. **`live-focus` (plan
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
**`live-panel-nested` / `live-floating` (plan `594`)** close the last two
layout/overlay gaps: the vertical split drags `180 → 228` and the nested split
`300 → 360` without moving its parent, the sidebar collapses to a painted
width **0**, the focused divider steps `376/360` with Right/Left, and
`float-window` is the `1100 × 720` frame with the panel at `(209, 175)` for
bottom/start, `(335, 129)` for right/start, `align="center"` ending at the
anchor's centre line (`147`) and the edge layer snapping to `641..719` instead
of flipping. Colour and the accessibility dump stay `TestRenderer`-only
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
`autoFocus` takes native focus (its React `onFocus` is host-state dependent —
plan `603`); and the app-level
window key handler (`render({ onKeyDown })`) receives a keystroke after the
focused element's `onKeyDown` — the command-palette / application-menu path.
`shell-navigation` adds the shell's own rule: a flex child needs `minHeight: 0`
before `overflowY: "scroll"` can make it scroll, which is what keeps the
15-entry sidebar reachable in the 720px window.

`root-single-child` and `root-wrapper` (plan `522`) measure the **app
boundary**: the native root keeps exactly one child, and it is the **last** one.
A view that returns a fragment with two roots loses the earlier root silently —
it is absent from the reachable tree (`findByTestId` finds nothing), paints
nothing, and its text never reaches `getPaintedText`, while its host nodes stay
**retained** (measured: two text-bearing roots retain 6 nodes, 3 painted and 3
dropped). One wrapper element keeps every sibling (measured: 7 nodes, both
children painted, `gap: 12` exact). The probe's live twin (`live-root`) proves
the reconciler rule transfers to a real window. Consequence for consumers: an
`App` must render one root element (a context provider does not add a host
element, so it does not change the count), and a fixture with two sibling roots
must be wrapped or it measures only the last one. This is the fact plan `510`
(components) surfaced; a dropped subtree is retained but unreachable, so an app
that re-renders alternate root siblings churns host nodes without painting them.

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

**Both transfer to a real window (`live-states` / `live-truncation`, plan
`557`).** A real `hover` applies the declared width (`100 → 140`) and leaving
reverts it; hover stays **per element** (parent `420` / child `100`, then parent
`400` / child `120`); a real press applies `active` (`180`) without entering
hover, and a held pointer outside the element keeps it until release. Text
geometry is identical in a window: `textOverflow`/`nowrap` are one line,
`lineClamp` is exact (`2 × 26 = 52`, `3 × 26 = 78`) and inherited, and the
shared `(string, width)` layout still makes the repeated clamp sample lay out
unclamped. The authored-style report and the ellipsis glyph remain headless-only
— the live tree carries no `style`, and neither harness reports the glyph.

`nested-layer-dismiss` is the runtime verdict for the overlay **dismiss stack**,and it contradicts the shipped implementation. One key event reaches a nested
layer and its enclosing layer with **a separate payload copy each**
(`keyHandlers=2`, `keyObjects=2`), so `internal/dismiss-layer.ts`'s
`WeakSet<EventPayload>` cannot dedupe: one Escape closed **both** layers
(measured, `last=parent-escape`). The field claim in `internal/event-claim.ts`
is the correct model **in principle**, but its lifetime was wrong for a window:
with a **microtask** reset, a real window still closed both layers, because it
delivers the nested handler and the parent's across a microtask (measured,
plan `558`). Cleared on the next **task**, one Escape closes the submenu
(`last=sub-escape`, parent still open) and the second closes the parent. A press
inside the submenu **does** fire the parent surface's `onMouseDownOutside`
(`outsideParent=1`) and not the submenu's own (`outsideSub=0`), and the payload
carries `x`/`y`, so `menu/sub.tsx`'s bounds containment is load-bearing: with it
the row activates (`subClicks=1`), without it the submenu closes on the press and
the row never activates. A row-derived `<anchored position>` is exact inside the
parent layer (±1 px); a raw `<anchored side align>` anchors to the **parent's**
box, not the trigger's. **Live (`live-layers`, plan `558`):** a real click opens
the parent, a real row opens the submenu which takes focus, the inside press
reaches the parent's outside handler with coordinates and activates once, one
`key` still reaches two handlers as two payload **objects**, and one Escape or
outside press closes exactly one layer once the claim lives a task. Two
identical outside presses in one task are one claim (a synthetic artefact); a
real second click is a new task, so the headless probe waits `1 ms` between
them.

`roving-focus` measures the keyboard model a menu, tab strip, radio group or
data grid needs. `renderer.focusElement` focuses a row that was never clicked,
and the **next keystroke is delivered to the row that just received focus** —
so a roving tabindex is real, not a visual selection. Inside a `<virtual-list>`
the same works, and focus is **not** lost when the window scrolls past the
focused row: `focused()` still reports it, the next arrow key still moves it,
and the focused row stays in `getPaintedText()` outside the window's run. A
virtualized grid must therefore treat the painted set as "the window **plus**
the focused row", not as exactly the visible rows. **Live
(`live-roving-focus`, plan `637`, 28 checks):** the same view in a real
1100 × 720 window — a click + Down moves native focus and the index, Enter
activates, a component-owned `renderer.focusElement` reaches a never-clicked
row and the next key is delivered there, and a real `-1200` wheel moves the
virtual anchor while native focus on `vrow-3`, its painted row and the next
Down all survive. **Measured:** focusing a virtual row already reveals it
(plan `166`), so the window is anchored at the focused row before the wheel;
the live check asserts the anchor moved and a previously painted row left the
window, because asserting row 0 is vacuous.

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
empty it. **`selection-signal`/`live-selection-signal` (plan `615`)** add the
**event**: the published `onSelectionChange` arrives through the app-owned
`useSelectionChange` seam with `value` = the joined selected text (absent when
empty), a clear notifies, and one drag delivers several events (1–3 headless,
~8 live), so a view treats it as "the selection changed, here is the text".
A click on a copy affordance **clears the selection**: headless the clear lands
before `onClick` (`D S(-) C`), live after it (`D C S(-)`), so the portable recipe
snapshots the last event text at pointer-down and copies that snapshot.

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

**Live (`live-scroll-into-view`, plan `601`):** the same path holds in a real
`1100×720` window. `End` focuses `siv-row-199`, the list scrolls well past
`-500` and paints the row (the raw offset saturates before the true end);
`Home` returns to `y = 0`; both `scrollToItem(120)` (offset `-1312`) and
`scrollIntoView(row 10)` move the window, paint their
target and leave focus on `siv-row-0`; three `Down`s paint and focus `siv-row-13`;
a second `scrollIntoView` paints row 199 without moving focus. **Measured
limit:** the element route only reveals a row the list has already laid out —
from the anchor at 120, `scrollIntoView(row 20)` moved the list, while
`scrollIntoView(row 50)` and `(row 100)` were no-ops (the offset did not
change). Use `scrollToItem(list, index)` for a far jump and the element route
for a row near the laid-out window.

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

**Live (`live-command-palette`, plan `389`):** the whole path holds in a real
window. `cmd-k` opens the palette with **nothing focused** (`last=cmd-k`,
`window=k`), the veil paints at the window's exact size, typing filters while the
window handler still receives each letter, arrows move the row while native
focus stays in the input, Enter commits through the field's `onSubmit`, and
Escape, the veil press and a row click each close it with `last=escape`,
`last=outside` and `commit:new-file`. The first open (by `cmd-k`) had no prior
focus owner, so no focus return is expected there; a click-opened palette
returns focus to its trigger. The live pass cannot see colour or the a11y dump
(plan `197`), so those stay headless.

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
| Platform type styles | done | yes (values in a `Theme`) | `platformTypes` + `currentPlatform` + `systemMonoFamily` + `platformTheme(base, platform)`; the docs platform toggle renders a real theme, not a docs-only style sheet. 12 guard tests; `theme-type-and-shadow` proves the resolved family and size reach the renderer. **Runtime (055):** a code role's `fontFamily` changes with `platformTheme`, and switching platform repaints the mounted tree. **Playground (`theme-platform`):** the mono role paints `Menlo` (default/macOS), `DejaVu Sans Mono` (Linux) and `Consolas` (Windows) through the runtime's own style report, `sans` stays `.SystemUIFont`, and the surface colour does not move. **Live (`live-theme-platform`, plan `654`):** a real click cycles Default → macOS → Linux → Windows → Default, the painted readout follows each stop, the code run stays painted, the mono/sans runs and the palette surface keep their exact boxes across the cycle, and every switch repaints. The **resolved family stays headless**: the live tree has no `style`, and a host missing a declared family falls back silently, so no glyph-width claim is made. |
| Native theme gallery | done | yes | `apps/playground` — palette switch in the shell, 47 labelled swatches, every type role, the focus ring and an elevation shadow; `theme-color-roles`, `theme-type-and-shadow` (plan `150`), plus the platform type-style cycle `theme-platform` (plan `170`) and its window twin `live-theme-platform` (plan `654`). **The shell path (plan `182`, `shell-selection`):** clicking `theme-mode-light` repaints the whole shell to the light background, keeps the selected scenario and leaves its view mounted. |

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
| Icons | `<svg>` (tintable monochrome) + `<img>` | **verified** (runtime: `native-surfaces`, `live-content`) |
| Separators, Spacers, Stack / layout primitives, Boxes / containers | `div` + flexbox / grid | **verified** |
| Scrollable containers | `overflow: "scroll"` | **verified** |
| Text inputs / Text areas | `<input>`, `<textarea>` | **verified** |
| Selects | `Select` + parts | **verified** (runtime: `select-choose`, `live-select`) |
| Comboboxes | `Combobox` + parts | **verified** (runtime: `combobox-filter`, `live-combobox`) |
| Tooltips | `Tooltip` + parts | **verified** (runtime: `tooltip-open`, `live-tooltip`) |
| Virtualized lists | `<virtual-list>` | **verified** |
| Syntax highlighting | `<code>` (bundled languages) | **verified** |
| Markdown / rich text rendering | `<markdown>` (GFM: headings, lists, tables, fenced code, links) | **verified** (runtime: `markdown-surface`, `live-markdown`; editing is not provided) |
| Diff viewer | `<diff>` (unified) | **verified** (runtime: `native-surfaces`, `live-content`, `diff-surface`, `live-diff`; the interaction contract is plan `648`) |
| Image preview | `<img>` (path, data URL, http(s)) and `ImgInstance.setImage` | **data URL and bytes verified; path/http(s) screenshot-only.** `native-surfaces`/`live-content` (plan `586`) prove a data URL lays out, `setImage(valid bytes)` reports success and keeps its `48 × 48` box with no fallback, and `setImage(garbage)` **throws** `unrecognized image format` (the node keeps the `img: no src` fallback) in both harnesses. A file path and a refused `https:` URL **do** load/attempt in a real window — the screenshot shows the bitmap and the `img: load failed` fallback — but `gpui::img(path\|uri)`'s fallback is a plain GPUI element: it is absent from `getPaintedText()` and the tree, there is no load/error event, and the offscreen loader never settles, so the box is the only assertion. A consumer must own the error state: read bytes and validate them before `setImage`, or stat the path first. |
| File / folder selection | `GpuixRenderer.promptForPaths` | **docs only — not runtime-verified.** The typed renderer API exists, but no scenario calls it: the picker is a blocking OS dialog with no automation verb, and `TestRenderer.promptForPaths` forwards to GPUI's `cx.prompt_for_paths`, which waits on the platform panel. A consumer may call it; this suite cannot prove it. |
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
**Live (`live-content`, plan `577`):** a real window reports the same two facts —
`bounds` is `null` and `canvas-child` never enters the paint log — while the
automation `text` verb still returns the retained child's string. Use `<svg>`
for static drawing and `<img>` + `setImagePixels` for live bitmaps.

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
| Text / typography | wip | yes | [text](packages/primitives/docs/text.mdx) · typography | **Runtime (041):** paints its string, and its box height is the role's line height. `textStyle` in `core/style.ts` covered by `style.test.ts`. Accepts `testId` (043), like every other primitive. **Truncation (`text-truncation`, plan `335`):** `truncate` is measured — `textOverflow: "ellipsis"` collapses to **one line** (26 px against 364 px wrapped), and the truncated string is still reported in full by `getPaintedText()`, so the ellipsis glyph itself is not assertable. `clamp` is measured — `lineClamp` clips to exactly N lines (2 → 52 px, 3 → 78 px) and works on a width-constrained box with no fixed height. **Caveat:** the runtime shares text layout per `(string, width)` and the key ignores `lineClamp`, so two identical strings at one width clamp together (first laid out wins); and `whiteSpace: "nowrap"` alone has the same geometry as `ellipsis`. **Type layout (`typography-layout`, plan `342`):** an explicit `lineHeight` is exact (30 → 60 for two wrapped lines); the default line box is ~1.6× the font size (12 → 19.5, 16 → 26, 24 → 39); `fontWeight` reaches the layout (a word at 700 is ~4 px wider at 16 px); a `<text>` block **fills its parent** by default. **`textAlign` is a no-op in 0.10.0** — left/centre/right all leave the glyph run at the block's left edge, on the `<text>` and on its parent — so `Text`'s documented `align` prop currently does nothing. The working routes are moving the block: `alignSelf: "center"`/`"flex-end"` in a column flex (measured 82.5 / 165 in a 200 px column) or a narrower explicit width in a `justifyContent: "center"` row (70). **Defect recorded cross-team** for `primitives` to implement or document. **Live (`live-typography`, plan `591`):** a real window reproduces the contract exactly — `30/60` line heights, the `19.5/26/39` default line boxes, a bold run wider by more than 2 px, `alignSelf` at `100/200`, `justifyContent` at `70`, and `textAlign` left/centre/right still leaving every glyph x unchanged. |
| Icons | wip | yes | [icon](packages/icons/docs/icon.mdx) · icons | **Runtime (041):** the raw `<svg source>` paints at 20×20 (`lg`) / 24×24 (`xl`); a decorative icon is absent from the a11y tree, a labelled one is an `Image`; a red vs blue capture differs byte-wise, so the tint reaches the paint. 18 offline tests. **Live (`live-content`, plan `577`):** a sourced `<svg>` reports its declared 48 × 48 painted box in a real window; the tint itself stays headless (no style/a11y report live, plan `197`). |
| Separators | wip | yes | [separator](packages/primitives/docs/separator.mdx) · layout | **Runtime (041):** one border step across the surface. `ruleStyle` test. |
| Spacers | wip | yes | [spacer](packages/primitives/docs/spacer.mdx) · layout | **Runtime (041):** a filler pushes its sibling to the far edge. `layout.test.ts`. |
| Stack / layout primitives | wip | yes | [stack](packages/primitives/docs/stack.mdx) · [grid](packages/primitives/docs/grid.mdx) · layout · grid-layout | **Runtime (041):** row and column gaps equal the theme step. The runtime's grid is **numeric only** (`columns`, `rowHeight`); there is no auto-flow and no named areas. **Grid + wrap (`layout-grid`, plan `341`):** three tracks in 300 px split `93.5 / 93 / 93.5` with exact 10 px gaps; explicit rows split a fixed height (`145×95` cells) and stretch an unsized child, while a declared height wins (`10` in a `26.5` track); auto rows follow their tallest child; **only the default and `gridColumnMin: "zero"` give equal tracks** — `min-content` fills the container with unequal tracks (`104 / 186`) and `max-content` leaves the remainder unused (`38 / 186`, 66 px free); a nested grid resolves against its cell; a child wider than its track **overflows** (500 px) and does not resize the neighbour; `flexGrow` makes a grid fill a flex row; `justifyContent: "center"` centres a content-sized track set. **Wrap:** a fixed-height wrapping row **stretches its line boxes** (third 30 px child at y 104 in a 200 px box) unless it declares `alignContent: "flex-start"` (y 38), and an auto-height row is exact (68 px). **Live (`live-layout-flex`/`live-layout-grid`, plan `591`):** a real window gives the same arithmetic — `640/200/320` widths and the `8` px gap, `93.33` tracks with `10` px gaps, `145×95` explicit cells, every `gridColumnMin` mode, the nested/overflow/`flexGrow` cases, and the wrapping stretch (`104` vs `38`). The grid view is taller than the window, so its twin reads the lower fixtures after a real wheel reaches the clamp. |
| Boxes / containers | wip | yes | [box](packages/primitives/docs/box.mdx) · layout | **Runtime (041):** padding equals the theme's step; density moves height and leaves colour alone. Every primitive merges a caller's `style` last; `Box` is where an app overrides a surface. |
| Scrollable containers | wip | partial | [scroll-area](packages/primitives/docs/scroll-area.mdx) · layout | **Runtime (041/048):** a wheel with `deltaY -100` leaves the offset at `y -100`, and a caller's `onScroll` receives that delta. **Horizontal (playground `tab-strip-overflow`, plan `173`):** `overflowX: "scroll"` pans, `getScrollOffset` reports `x`, `deltaX -240` moves it to `-240`, and `renderer.scrollTo(id, x, 0)` is exact. **Live (`live-tab-overflow`, plan `565`):** the same pan (`-240`), a vertical wheel is inert on a horizontal-only strip, the exact `scrollTo` reaches `-400`, and the component `scrollIntoView` lands the last tab 4 px past the trailing edge (the strip's padding; offscreen it lands 1 px past). The scroller's own reported box moves with its scroll — compare a revealed child against the box read at rest. **No `scrollbarColor`, no `scrollbarWidth`, no fade mask** in 0.10.0, so the thumb is platform-themed and cannot be tinted; there is no absolute offset (`onScrollChange`). |
| Buttons | wip | ours | [button](packages/primitives/docs/button.mdx) · form | **Runtime (041):** a hit-tested click activates once; Enter on key **down**, Space on key **up**, a held key ignored; `disabled` refuses both; `loading` refuses both and announces `Loading`. `@gpuix/react` publishes **no `./button`**, so the keyboard contract is this package's. Variants merged here: Floating action button and Copy button (adabraka `floating_action_button`, `copy_button`). |
| Button groups | wip | yes | [button-group](packages/primitives/docs/button-group.mdx) · form | **Runtime (041/048):** attached children are 0px apart, separated ones the theme's `sm` gap. `role="group"` with `aria-label` from `label`; `attached` rounds and clips the group — it does not reshape each child (no `:first-child`, no child cloning). Variants merged here: Toggle Group (base-gpui `ToggleGroup`) and Segmented control (adabraka `segmented_nav`) — pressed-state variants, not separate rows. |
| Labels | wip | partial | [label](packages/primitives/docs/label.mdx) · form | **Runtime (041):** the visible name is an a11y `Label`; the control's own `label` is the `TextInput`'s name. There is **no `aria-labelledby`**, so `labelledBy(name)` returns the control's `label` prop (045). |
| Text inputs | wip | yes | [input](packages/primitives/docs/input.mdx) · form | **Runtime (041):** runtime keystrokes reach `onChange` with the accumulated text; Enter reaches `onSubmit`; a controlled field reports each edit. The native `<input>` holds its text; `core/state.ts` decides controlled/uncontrolled. **`disabled`** is emulated (plan 025): the host has no `disabled` prop, so the field is read-only, out of the tab order and handler-guarded; AT hears read-only. **Editor contract (`text-entry`, plan `188`):** one `onChange` per character; Left/Right/Home/End move the caret and typing inserts at it; `shift-arrow` extends a selection and `cmd-a` selects all, and typing replaces either exactly; Backspace deletes one and is a safe no-op on an empty field; `readOnly` keeps focus and value and fires **no** change event (native-enforced); the placeholder is both exposed and painted, and stops painting once text exists; a fixed-width field **clips** a long value (`158` px before and after 40 characters — it does not grow). **No masked entry:** `InputProps` has no `type`/`secureTextEntry`/`mask`, so a typed secret is held, announced and painted in clear — do not ship a `PasswordInput` (evidence in plan `188` §9). **Pointer contract (`pointer-text-entry`, plan `343`):** a click places the caret at the nearest glyph (left edge → prepend, middle → inside the run, right edge → append); a press-move-release **selects** the run and typing replaces it; a later plain click **clears** that selection; `shift`-click **extends** it. The native editor owns pointer selection — a component must not reimplement it or swallow a modified click. **Live (`live-pointer-entry`, plans `535`/`536`):** in a real window a click at the middle of the run lands inside it, the right edge appends and the left edge prepends, a `<textarea>` takes a newline (`x\ny`) and autosizes to 64 px, and Up returns to the previous line; the pointer-selection half runs through `pressWindow`/`movePointer`/`releasePointer` — a real press-move-release selects `abcdef` and typing replaces it, a plain click clears that selection, and a `shift`-click extends it (22 checks). **Payload (`input-payload`, plan `533`):** `keyChar` is the produced character (`é`, `日`; a space for the `space` key) and `isHeld` marks a repeat, while a plain focusable `div` gets neither; `cmd-a` is consumed by the editor **before** React's `onKeyDown` (repeat select-all after `cmd-a` in the log, but the next character still replaces the value); `clickCount` is always `1`, so edit-on-second-press is the honest pattern. **Live (`live-text-entry`, plan `624`):** the whole editor contract transfers to the 1100 × 720 window — Left/Home/End move the caret (`axbc`, `0axbc`, `0axbc9`), Backspace deletes one and is safe on empty, `shift-left` ×2 then typing leaves `0axq`, `cmd-a` then `w` leaves `w`, `readOnly` keeps native focus and its painted `locked` run while refusing the edit, the placeholder paints only while empty, and the typed secret is painted in clear. A live probe that asserts a controlled value must type **one key per call**: one 40-key `keystrokes` call painted all 40 characters while the React value stayed `0`, because the value was never committed. | **Live (plan `570`):** `live-primitives-fields` types into the controlled field through a real click, Enter reaches `onSubmit`, and a disabled field refuses the edit (`locked=0`, the other field unchanged). |
| Text areas | wip | yes | [textarea](packages/primitives/docs/textarea.mdx) · form | **Runtime (041):** height follows `rows` and a newline is accepted; **no `onSubmit`** — with one the runtime turns Enter into a submit and costs the newline (046). **Autosize is real (`text-entry`, plan `188`):** `minRows={2}` paints `64` px, four lines `116`, six lines `168`, seven lines `168` — it grows exactly 26 px per line to `maxRows` and then scrolls, so no component measurement is needed. **`disabled`** is the same read-only + tab-order + handler guard as `Input` (plan 025). **Pointer and lines (`pointer-text-entry`, plan `343`):** Enter inserts a newline (no submit listener), the field autosizes one row per line (32 → 64 for two), and `Up` moves the caret to the previous line so a character inserts there. **Live (`live-text-entry`, plan `624`):** the autosize contract is identical in a real window — `64` (minRows) → `116` (four lines) → `168` (six lines), then clamped at `168` for seven — and every entered line reaches the editor (`one|two|…|seven`). |
| Checkboxes | wip | partial | [checkbox](packages/primitives/docs/checkbox.mdx) · selection | **Runtime (041):** click and Space-up toggle, and `aria-valuetext` flips `unchecked → checked`; indeterminate reads `mixed`; AccessKit role is `CheckBox`. **No `aria-checked`.** Variant merged here: Checkbox Group (base-gpui `CheckboxGroup`). | **Live (plan `570`):** `live-primitives-fields` checks it with a real click and unchecks it with Space-up. |
| Radio groups | wip | partial | [radio-group](packages/primitives/docs/radio-group.mdx) · selection | **Runtime (041/044/048/049):** AccessKit roles are `RadioGroup` and `RadioButton`; arrows move the selection, wrap, and **skip disabled options** (044); Home/End jump to the nearest **enabled** end (048); arrows **move native focus with the selection** and the focused option paints the ring (049); the roving index is derived from the value, so a controlled change moves the tab stop (049); a click on the circle selects. Options are **data**, not compound children (D16). **Playground:** `primitives-choice` — a click selects the second row, Down moves to the third and Up returns (the wrap rule itself is guarded by the package suite). | **Live (plan `570`):** `live-primitives-choice` selects a row with a real pointer and moves the selection with Down/Up through the group's own handler. |
| Selects | wip | reuse | [select](packages/primitives/docs/select.mdx) · form | **Runtime (041):** opens, paints its options, commits a clicked option. A thin themed wrapper over `@gpuix/react/select`; open state and dismissal are GPUix's. **Live (plan `554`):** `live-select` drives the published popup in a real window — a click opens, an item click commits `Beta` and returns native focus to the trigger, Down opens and moves, Enter commits `Gamma`, Escape and an outside press dismiss. | **Live (plan `570`):** `live-primitives-fields` drives the primitives wrapper — a click paints the options, Down+Enter commits, Escape closes and keeps the value. |
| Switches | wip | partial | [switch](packages/primitives/docs/switch.mdx) · selection | **Runtime (041/049):** a click toggles; AccessKit role is `Switch` and the value flips `unchecked → checked`. **No `aria-checked`**; Space/Enter toggle. The thumb moves by the track's `justifyContent` because the runtime has no `transform`. `invalid` paints the destructive border and focus paints the selection ring (049). | **Live (plan `570`):** `live-primitives-fields` flips it with a real click. |
| Progress | wip | partial | [progress](packages/primitives/docs/progress.mdx) · form | **Runtime (041):** `aria-valuetext` is `"42%"`, role is `ProgressIndicator`, the fill tracks the value and clamps outside 0–100. **No `aria-valuenow`.** | **Live (plan `570`):** `live-primitives-display` paints its box in a window; the value text stays headless (no a11y dump live, plan `197`). |
| Tooltips | wip | reuse | [tooltip](packages/primitives/docs/tooltip.mdx) · feedback | **Runtime (041):** opens on hover and on keyboard focus, and its content stays inside the frame it anchors to. A thin wrapper over `@gpuix/react/tooltip`; a mouse-opened tip looks the same as a keyboard-opened one (no `focusVisible`). Placement facts are the shared floating probe: `align="center"` is off by half the panel and `fit="snap"` does not flip. **Live (plan `554`):** `live-tooltip` proves a real pointer enter opens the published tip, its content paints, and leaving runs the component's 80 ms timer to close. | **Live (plan `570`):** `live-primitives-display` opens the primitives wrapper on a real pointer enter. |
| Skeletons | wip | partial | [skeleton](packages/primitives/docs/skeleton.mdx) · feedback | **Runtime (041):** opacity samples take both `1` and `0.6`. Opacity pulse only: the runtime's `motion` animates width/height/opacity/insets/borderRadius and nothing else, so no shimmer sweep. | **Live (plan `570`):** `live-primitives-display` paints the 14 px box in a window. |
| Loading indicators | wip | partial | [spinner](packages/primitives/docs/spinner.mdx) · feedback | **Runtime (041):** the lit dot changes index (the accent-coloured dot proves a theme colour reaches the paint) and AccessKit reports role `Status` with its label. `Spinner` **cannot rotate**; a width/left indeterminate sweep is the remaining alternative, and `Progress` with no `value` covers the bar. |
| Slider | wip | ours | [slider](packages/primitives/docs/slider.mdx) · [value](packages/primitives/examples/value.example.tsx) | **Runtime (053):** a real click at 25% of the track reports `25`; the thumb is centred within 1 px of the value at 0/50/100; arrows/page/Home/End move by step, page, end; a disabled slider refuses pointer and keys and leaves the tab order; the ring lands on the thumb. **No pointer capture** — a drag only tracks while the pointer is over the track. **No `aria-valuenow`/`min`/`max`**; the value rides on `aria-valuetext`. | **Live (plan `570`):** `live-primitives-display` clicks a quarter of the track (a value below the middle), then Right/Left step it by one. |
| Range slider | wip | ours | [range-slider](packages/primitives/docs/range-slider.mdx) · [value](packages/primitives/examples/value.example.tsx) | **Runtime (053):** a press at 10% moves the start, at 90% the end; native focus follows the grabbed thumb and an arrow moves only that end; a start driven past the end stops on it. Two `role="slider"` thumbs in a named `group`, each announcing its own value text. Ends may touch, never cross. Same pointer-capture and `aria-valuenow` limits as Slider. |
| Meter | wip | yes (a bar, no host element) | [meter](packages/primitives/docs/meter.mdx) · [value](packages/primitives/examples/value.example.tsx) | **Runtime (053):** AccessKit role `Meter`; the value text is the formatted measurement; the fill's painted width is the measurement's fraction of its own range; Tab never lands on it. Reuses `Progress`'s track/fill. No `aria-valuenow`. | **Live (plan `570`):** `live-primitives-display` paints its box in a window. |
| Number Field | wip | ours | [number-field](packages/primitives/docs/number-field.mdx) · [number-field](packages/primitives/examples/number-field.example.tsx) | **Runtime (054):** real typing reports `12`; `999` against `max=100` reports `100`; arrows step, PageDown pages, a hit-tested spin press steps and refocuses the input; the ring paints on the field's chrome; a disabled field refuses text, keys and presses. The input has **no numeric mode** (no `type`, `min`, `maxLength`), so parsing/clamping/drafts are ours. The spin buttons are `presentation`, not tab stops. `autoFocus` paints no ring on mount (no focus event is dispatched). **Playground:** `primitives-entry` — Up/Down steps, typed `99` commits as the clamped `10`, the committed value is exposed. | **Live (plan `570`):** `live-primitives-entry` clicks the field, steps with Up/Down (a settle per step: two keys in one batch coalesce), and commits typed `99` as `10`. |
| OTP Field | wip | ours | [otp-field](packages/primitives/docs/otp-field.mdx) · [otp](packages/primitives/examples/otp.example.tsx) | **Runtime (054):** six digits typed one at a time fill six cells and `onComplete` fires once; focus advances with each character and Left moves it back; Backspace in an empty cell clears the previous one, while Backspace on a filled cell deletes exactly one character; AccessKit reports a named `Group` with six named `TextInput`s; `invalid` paints the destructive border on every cell; a disabled field refuses input and leaves the tab order. **No `onPaste`** and no clipboard simulation in the `TestRenderer`, so the multi-character fill is proven only as a pure rule. Arrows/Home/End/Backspace are handled on **key up**: the native editor consumes their key down, so a held arrow does not repeat. **Playground:** `primitives-entry` — six digits advance focus, `onComplete` fires once, Backspace deletes exactly one character, Left moves focus back. | **Live (plan `570`):** `live-primitives-entry` sends six real keystrokes, focus advances to the last cell, Backspace deletes one, Left moves focus back and typing rewrites that cell. |
| Toggle | wip | ours | [toggle](packages/primitives/docs/toggle.mdx) · [toggle](packages/primitives/examples/toggle.example.tsx) | **Runtime (054):** a click flips the announced state and repaints the accent fill; Enter down and Space up each activate once; a disabled toggle leaves the tab order; the ring follows focus. **No `aria-pressed`** in 0.10.0 — the state rides on `aria-valuetext`, so a screen reader hears a button with a value. Activation and the ring are this package's (`@gpuix/react` publishes no button). |
| Rating | wip | ours | [rating](packages/primitives/docs/rating.mdx) · [rating](packages/primitives/examples/rating.example.tsx) | **Runtime (054):** a click on "4 of 5" reports 4; arrows move the checked star **and** native focus, clamping at the ends; Delete clears; filled stars paint `colors.primary` and empty ones `colors.mutedForeground`; Tab enters on the rating and the next Tab leaves it; disabled refuses input. Whole stars only (no clip/transform in 0.10.0); no `aria-checked`, state rides on `aria-valuetext`. **Playground:** `primitives-choice` — first-star click, Right/End, clamp at five, Delete clears, Left clamps at zero. | **Live (plan `570`):** `live-primitives-choice` rates one with a real first-star click, raises with Right/End, clamps at five, clears with Delete and clamps at zero. |

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

**End-to-end Tier 2 composition (playground plans `330`, `344` and `346`).**
Seven scenarios mount the shipped `@gpuixui/components` through its published
root:
`tier2-dialog` drives `Dialog`/`ConfirmDialog` (centred surface, focus entry,
Tab/Shift-Tab containment, Escape and focus return, Cancel holding initial
focus, confirm reporting once and leaving the dialog open), `tier2-menu` drives
`DropdownMenu`/`ContextMenu` (click and right-click open, the disabled row
skipped by native focus, Enter activating once with focus restored, pointer
placement within 12 px, Escape and outside dismissal) and `tier2-toast` drives
`ToastProvider`/`ToastViewport` (a push paints a 380 px card inset 16 px, the
action runs once and dismisses, the stack is oldest-above-newest, Escape is not a
shortcut, a 300 ms duration dismisses itself). Plan `344` adds
`tier2-foundation` (Card's three variants and its shadow rule, the primary badge
painting the token role, the avatar's initials/32–40 px/`Image` node, the alert's
`Alert` role and a working dismiss, the empty state's action, and List selection
through click, arrow keys, Enter and a disabled row) and `tier2-navigation`
(Tabs' panel swap, arrow selection with a disabled tab skipped and a labelled
`TabPanel`, Accordion's single-mode replacement and `collapsible` Enter path,
Collapsible's `expanded` header, Breadcrumb's `navigation`/`Link` nodes, and
Pagination's `aria-selected` page, page click, Next/Prev and painted window).
Plan `346` adds the choice and form families: `tier2-choice` drives `Popover`
(opens below its trigger, a row toggles the consumer's selection, Escape returns
focus, an outside press closes without reopening), `SearchInput` (typing,
Enter submit, Escape clear with focus return and one clear report), `Combobox`
(ranked filter, value selection, disabled option inert, label on the trigger,
empty state, Escape), `DatePicker` (month grid, minimum-bound clamp, Enter
select, clearable reset) and `TimePicker` (segment composition, clamping,
`minuteStep` arrows and clear); `tier2-forms` drives `Field` (consumer-triggered
schema message replacing the description, `Required` in the description),
`Fieldset` (named `Group`, disabled token paint, refused edits and tab-order
exit) and `Form` (messages on an invalid submit, decoded value on a valid one,
pending lock).
Plan `347` adds the last two families: `tier2-editing` drives `InlineEdit`
(display→editor swap, commit, Escape discard and blur commit), `TagInput`
(Enter, comma, duplicate, `max` and a chip removal), `HotkeyRecorder` (a
recorded chord and its clear control), `MentionInput` (open, narrow, highlight,
insert with the trailing space, no-match close) and `Drawer` (right-edge
placement, focus entry, Tab, Escape return and a veil press); `tier2-flow`
drives `Stepper` (derived status), `Timeline` (order, copy, current event),
`Countdown` (format, a consumer tick, expiry in the muted role),
`KeyboardShortcuts` (explicit darwin and linux glyphs), `Carousel` (controls,
keyboard, clamp and the measured hiding mechanism), `ColorPicker` (swatch,
normalised shorthand hex, invalid draft) and `NavigationMenu` (one panel,
pointer and keyboard open, arrows, Escape, link select, outside press).
The suite is `85/85` (2724 checks) and `tier2=verified`; live is `36/36` (678
checks). Consumer-path facts
recorded in plan `330` §8, plan `344` §8 and plan `346` §8: the renderer needs
**one root host
element** (a provider with sibling children at the root paints nothing), the
components package is compiled by the consumer because its tsconfig maps the JSX
runtime to a `.d.ts` that `nub` cannot execute, and an accessibility node keeps
its `author_id` only when the consumer authors `aria-id` (a role paints without
one, and a role-less `text` is a `Label` with no authored id). **In a real
window (plan `331`):** `live-tier2-dialog`, `live-tier2-menu` and
`live-tier2-toast` repeat the consumer path live — the surface centres within
2 px, the Tab trap keeps native focus inside, the menu surface takes native
focus, the context menu lands within 12 px of the right click, the toast card is
inset 16 px, and a 300 ms duration really dismisses itself. Live `16 → 19`,
exit `0`, three real-window screenshots. **`live-tier2-foundation` and
`live-tier2-navigation` (plan `344`)** repeat the catalogue live: the Card
stack, the 32 px avatar, the alert dismiss, the empty-state action, List click
selection with the disabled row inert; then a tab click swaps the panel,
Accordion single mode and its Enter close, Collapsible's Enter close, Breadcrumb
clicks and Pagination's page/Next/Prev. Live `22 → 24`, checks `373 → 405`,
exit `0`, two screenshots. Plan `346`'s `live-tier2-choice` and
`live-tier2-forms` add the same path for the choice and form families; live
`25 → 27`, checks `431 → 458`, exit `0`, two screenshots. Plan `347`'s
`live-tier2-editing` and `live-tier2-flow` close the catalogue: the swap and
its focus, a live inline commit and Escape cancel, typed tag/mention/hotkey
paths, the Drawer's edge/focus/trap/veil, and the flow family's stepping, clock,
glyphs, carousel, colour and navigation; live `27 → 29`, checks `458 → 506`,
exit `0`, two screenshots. **Measured live facts (plan `347` §8.2):** a swapped
native editor only takes text from a **coordinate click** — the automation
locator resolves the pre-swap node for a `testId` that changes element type; and
React's `onBlur` was measured **not** to run for a native focus change in a
window on 2026-10-18, so `InlineEdit`'s blur-commit is headless-only — but see
the plan-390 note below: the sibling `onFocus` count is window-state dependent,
so the blur claim is a **re-verify**.
They also measured the
live focus rule (plan `345`, corrected by plan `390`):
a key reaches the focused element, bubbles through every ancestor and then the
window handler. React's `onFocus` delivery is **host-state dependent for both a
click and `autoFocus`** — the same code read `innerFocus=0` and `innerFocus=1`
on this host hours apart, and the `autoFocus` count did the same (plan `603`),
so the live suite asserts native focus and key delivery, never the counter.
`live-key-routing` isolates the delivery (20 checks), including a live `cmd-k`
chord, and wires
`useWindowKey` into the live runner, so app-level shortcuts now have live
coverage too. React's `onBlur` for a live focus change is likely the same
question; the `InlineEdit` blur commit needs re-verification (cross-team row).

## Tier 2 — composition and feedback

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Cards | done | yes | `variant` outline/elevated/plain; 5 native behaviour tests |
| Badges | done | yes | seven variants (neutral/primary/4 status tones/outline), two sizes sized by type role; 7 native behaviour tests. Not interactive by design; no icon or dismiss slot yet |
| Avatars | done | yes | four diameters, deterministic unicode-safe initials fallback (8 logic tests), presence dot; 7 native behaviour tests. No image loading/error state in v1 — a missing file paints nothing and does not restore the initials |
| Alerts | done | yes | compound parts (`Alert`, `AlertIcon`, `AlertContent`, `AlertTitle`, `AlertDescription`, `AlertDismiss`) over a tone context; four tones from the shared status palette; 11 native behaviour tests (real click, keyboard activation, alert role). Dismiss uses the local button stand-in; live-region announcement not verifiable here |
| Lists / list items | done | yes | `selectionMode` none/single/multiple over a roving tab stop: arrow wrap over disabled rows, real focus (`focusElement`), controlled + uncontrolled; multiple adds plain/Cmd/Ctrl/Shift clicks, Shift+Arrow ranges from an anchor and Cmd/Ctrl+A select-all of enabled rows; type-ahead jumps and cycles by an explicit `ListItem` `textValue`; single/none lists also take `onActivate` (Enter or click, never Space; disabled rows never), with the multiple variant rejecting it at the type level; a caller `onClick` on an enabled row is composed before activation; 37 native behaviour tests. **Live (plans `344`, `345`):** click selection, `Down`/`Up` (skipping a disabled row), `Enter` and the disabled-row inertness all hold in a real window; a live step must `settle` after the click that establishes the active row before sending a key. No `aria-multiselectable` in 0.10.0, no href/link role on activation, no drag reorder or virtualisation |
| Empty states | done | yes | title + optional description/action/icon, no surface of its own; 6 native behaviour tests including a real click on the action. Wrap width is a component constant (no measure token) |
| Inline validation | done | partial | `Field`/`FieldLabel`/`FieldDescription`/`FieldError`/`FieldInput` with schema-message `validate`/`validateAll`; 6 native behaviour tests + validation logic suite, both themes. A disabled input is `readOnly`, leaves the tab order and paints the disabled roles. No `aria-describedby`/`aria-invalid` in 0.10.0; the caller owns the value and when validation runs |
| Toasts / notifications | done | yes | Effect store (`SubscriptionRef` + `FiberMap`), bounded queue, monotonic ids, auto-dismiss tested with `TestClock`, stale-timer regression; hovering or keyboard focus on either control pauses and the last one leaving resumes with the remaining time; one labelled action (the handler lives in the provider) runs once and dismisses, and a label without a handler draws nothing; 14 native behaviour tests. No `zIndex` (render the viewport last), no progress bar. **Frozen exit (`toast-lifecycle`, plan `336`):** a native exit holds a dismissed card while the motion clock is frozen and removes it when the clock moves; a probe must assert that on a **synchronous** dismissal — a real timer racing a paint and `AnimatePresence`'s own re-render is not a deterministic point. **Shipped viewport (`tier2-toast`, plan `337`):** it renders the queue directly with **no `motion`/`AnimatePresence`**, so a timer removal is a plain state update — immediate even with the GPUI motion clock frozen, with the survivor reflowing to the 16 px inset. The plan-336 race is a local-probe/consumer-motion property, not a shipped defect. **Live layering (`live-toast`, plan `623`):** the viewport's `pointerEvents: "none"` strip lets a page control under it take a real click, a painted card owns its box and the surface under it never sees the click, a toast never steals focus, and its dismiss is the next Tab stop; the 33/41 px insets and 378 px card are identical to headless, so the 0.10.0 box needs no live correction. A probe's long-lived cards must use a budget that outlasts a loaded run: the motion clock can be paused but a toast's `setTimeout` is real JS time (plan `623` §10). |
| Dialogs | done | partial | local overlay over an `anchored` veil at window coordinates (0.10.0 ships no Dialog parts and no portal), caller `ref` composed on the content; 13 native behaviour tests + 5 dismiss-stack logic tests. No `aria-modal`/`aria-labelledby` in 0.10.0 — named through the required `label` |
| Confirmation dialogs | done | partial | Cancel holds initial focus (Enter cancels); confirm never closes the dialog itself, the caller does; `loading` disables both actions and suppresses Escape/backdrop; 5 native behaviour tests. Busy indicator is a `…` glyph until a Spinner exists |
| Popovers | done | partial | anchored through GPUix's `FloatingLayer`; the runtime snaps but does not flip and its `center` centres on the containing block, so the component flips a snapped surface back off its trigger and maps `align="center"` to a measured `start` offset; Escape restores focus, Tab and outside presses do not; share the dismiss stack with Dialog and a mouse-down re-open guard, caller `ref` composed on the trigger; 12 native behaviour tests, both themes |
| Dropdown menus | done | partial | anchored `FloatingLayer` surface with a shared row/highlight core; keyboard opens (`Enter`/`Space`, `ArrowDown`, `ArrowUp`) land on the first/last enabled row, arrow/Home/End wrap and skip disabled rows, Enter activates and restores focus, checkbox and destructive rows; type-ahead jumps by a case-insensitive 500 ms prefix, cycles on a repeated letter and skips disabled rows; one level of submenus opens by click, hover, `Enter`/`Space` or `ArrowRight`, positions at the row's right edge, keeps arrows and type-ahead inside, runs a pointer-clicked row once, closes one level on `Escape`/`ArrowLeft` and both on an outside press; the root surface flips off its trigger when snapping would cover it and `align="center"` is measured rather than the runtime's containing-block centre; 35 native behaviour tests, both themes. No deeper nesting is tested, submenus only open right and have no `aria-haspopup` in 0.10.0, and the checkbox row uses `aria-selected` instead of `aria-checked` |
| Context menus | done | partial | pointer-positioned `anchored` surface over the shared rows and submenu parts; 17 native behaviour tests (right click opens, lands within 12px of the pointer, select runs once, second right click moves it, `Shift+F10` opens at the trigger's bottom-left with focus in the menu, Escape returns focus, type-ahead jumps to a row, submenus open on `ArrowRight` and close one level on `Escape`/`ArrowLeft`, a pointer-clicked submenu row runs once). 0.10.0 has no `onContextMenu` — `onAuxClick` + `isRightClick`; no `aria-haspopup` and no portal |
| Command menus | done | partial | compound parts (`CommandMenu`, `CommandMenuInput`, `CommandMenuList`, `CommandMenuItem`, `CommandMenuEmpty`) over a dialog-hosted searchable palette composing Dialog and `menu/logic.ts`; default matching is a case-insensitive subsequence (initials match) ranked within each declared group so headings never repeat, with a custom `filter` keeping declaration order; input keeps focus while the highlight moves; 14 native behaviour tests + 12 fuzzy logic tests. Per-group rather than global ranking, no recent-command memory, `aria-activedescendant` unavailable, input is the host element until primitives lands. **Consumer path (`tier2-command`, plan `581`):** the shipped parts mount through the published root and the token theme, open from a focused trigger, take focus in the input, filter, run with Enter, close on Escape and paint the empty state. **Measured limits:** closing leaves **no** focus owner — `CommandMenuInput`'s `autoFocus` takes focus before the dialog records the opener, so the saved id is the input being destroyed (`live-tier2-command` agrees); `Home`/`End` are consumed by the native editor before React, so `isFirst`/`isLast` never run (the `cmd-a` rule, plan `533`). 35 headless + 14 live checks; cross-team tasks in `TODO.md`. |
| Tabs | done | partial | roving tab stop on the selected trigger, arrow wrap skipping disabled tabs, Home/End, automatic and manual activation, and both axes (`orientation` switches Down/Up movement and the row/column layout); caller `ref` and `onBlur` are composed with the internal ones; 14 native behaviour tests, both themes. **Live (plans `344`, `345`, `390`):** a click focuses a trigger natively. Whether React's `onFocus` also runs is **window/host-state dependent** — the same clean code measured `innerFocus=0` at 15:03/15:10 and `innerFocus=1` from 15:25 on this host, and the click-then-arrow result followed it (`tab=overview` vs `tab=settings`). `Tabs` sets `active` only in `onFocus`, so **set `active` in the click handler as well** (the same `focusRow` path `List` uses); the live suite no longer asserts the old defect, and the cross-team row is a re-verify. The headless suite focuses explicitly and does not cover click-then-arrow. 0.10.0 has no `aria-orientation`/`aria-controls`, so the panel is named by its value. **Consumer path (plan `633`):** `tier2-navigation` mounts a vertical set beside the horizontal one — the rail stacks and the panel sits to its right, `End`/`Home` seed and jump the roving index, `Up`/`Down` move with the disabled row skipped and wrap, `Right`/`Left` are inert, the disabled trigger is not a tab stop, and each selected panel replaces the last. `live-tier2-navigation` repeats the stack, a real click and the inert disabled row in the 1100 × 720 window; arrow delivery stays headless because the window sends a key to the focused element only (plan `344`). |
| Accordions | done | yes | single (with `collapsible`) and multiple modes over a tagged-union state; divider order, disabled sections, glyph indicator; arrows/Home/End move focus between enabled headers (wrapping, without toggling), caller `ref` composed on the header; 13 native behaviour tests + 15 transition tests. No height animation; no `transform` for a rotating chevron |
| Collapsible sections | done | partial | trigger with `aria-expanded`, content unmounts while closed; 4 native behaviour tests. Mounts instantly: 0.10.0's motion needs a numeric height and an auto-height reveal needs a measured first paint. **Recipe measured (`collapsible-height`, plan `186`):** the body stays mounted under `height: 0; overflow: hidden`, `ref` → `getElementBounds` measures it at first layout while clipped, a height tween is exact, the clip refuses input and the draft survives. **Live (`live-collapsible`, plan `592`):** the same path in a real window — `mounted=140` at first layout, the 80 ms frame is `56 px` of the 140 px tween, a press aimed at the clipped control counts nothing, the open control runs, `draft=ab` survives a collapse and re-open, and `complete` advances once per tween |
| Breadcrumbs | done | partial | declarative trail with `maxItems` collapsing the middle (first + … + tail), separators follow their item; 5 native behaviour tests + 7 collapse tests. No `aria-current` in 0.10.0, so the current page is text and colour |
| Pagination | done | partial | compound parts (`Pagination`, `PaginationPrevious`, `PaginationList`, `PaginationItem`, `PaginationNext`, `PaginationEllipsis`) over a derived window: the root clamps the page and computes the window once, so the caller never repeats the stable-width rule; 10 native behaviour tests + 9 window tests, both themes. Current page uses `aria-selected` because 0.10.0 has no `aria-current`; no page-size control |
| Search inputs | done | yes | leading glyph, conditional clear control, Enter submit, Escape clears only when non-empty, controlled/uncontrolled, caller `ref` composed with the internal focus ref; 7 native behaviour tests. No debounce (the consumer's job); the glyph is text until an icon set lands |
| Comboboxes | done | partial | compound parts (`Combobox`, `ComboboxTrigger`, `ComboboxContent`, `ComboboxInput`, `ComboboxList`, `ComboboxItem`, `ComboboxEmpty`) wrapping GPUix's headless combobox with our ranked option shape; the popup flips once off a snapping trigger and `align="center"` is measured, single and multiple selection by value, disabled rows, empty state, Escape focus restore, pointer selection/toggling and outside-press dismissal; 17 native behaviour tests + ranking suite, both themes. No async options/create-new, no `aria-activedescendant`. **Consumer path (`tier2-choice`, plan `346`):** filtering, value selection, the disabled row, the empty state and the label-on-trigger all hold. Measured gap: the trigger authors `aria-expanded` but **no `role`**, and no accessible node was addressable by its authored `aria-id`, so the expanded state is not exposed — recorded for `components`. **Live (plan `554`):** `live-combobox` drives the published popup in a real window — a click opens, typing `be` filters `Alpha` out, Enter commits `Beta`, a second `zz` query paints the empty state, and Escape closes. |
| Date pickers | done | partial | compound parts (`DatePicker`, `DatePickerTrigger`, `DatePickerContent`, `DatePickerCalendar`) over a month grid (Effect `DateTime`, no `Date`), surfaced through `Popover`; arrow/Home/End/PageUp/PageDown, inclusive `min`/`max` that clamp movement and stop month browsing at the bound, a `clearable` reset to `null`, ISO-day value; 16 native behaviour tests + 18 calendar tests, both themes. Fixed English labels, no adjacent-month days, no time of day (see **Time pickers**), no `aria-current`, no `aria-disabled` (an unavailable day leaves the tab order and is named `, unavailable`). **Measured defect (`tier2-choice`, plan `346`):** with no value, opening focuses the **month head** (`date-day-2026-10-01`), not `today` (`2026-10-17`); with `min="2026-10-17"` the focused day is before the bound. The focus effect falls back to `startOfMonth(viewMonth)` instead of the clamped anchor. The scenario asserts the measured behaviour; the fix belongs to `components` |
| Time pickers | done | yes | compound parts (`TimePicker`, `TimePickerSegment`, `TimePickerSeparator`, `TimePickerClear`); `HH:mm` 24-hour value (`null` = none), two labelled input segments, typed digits clamp per segment (`99` hours → `23`), arrows carry across the hour and wrap at midnight from one clock function, `minuteStep` for arrows only, blur pads both segments, opt-in `clearable` reset; 10 native behaviour tests + 12 logic tests, both themes. A field, not a trigger/popup (no `aria-valuenow` for a spinbutton); fixed 24-hour/no locale, no `aria-disabled` (disabled is `readOnly` + dimmed), no seconds or timezone |
| Message scroller | done | partial | `MessageScroller`, `MessageScrollerViewport`, `MessageScrollerItem`, `MessageScrollerJumpToLatest` over a pure pin/unread rule set; follows appended rows and a taller streamed row while pinned, leaves the reader's offset untouched when scrolled up, counts arrivals in the affordance, returns to the end on jump or wheel-down; 10 native behaviour tests + 11 rule tests, both themes. **Every row renders** (`<virtual-list>` takes an item count rather than compound children, so it is not virtualized in v1); the affordance sits beneath the viewport because `position: "absolute"` resolves against the mount parent; no resize observer and no `aria-live` in 0.10.0. **Probe (`message-scroller`, plan `300`):** `<virtual-list>` has no `onScroll` and the `onVisibleRange` payload is a built window with overdraw that lags one gesture; the pin must read `renderer.getListScrollTop(id)` inside the handler, and the runtime follows neither an append nor a growing row (scroll to `scrollToItem(list, count)` only while pinned). **Live (`live-scroller`, plan `301`):** the whole path holds in a real window (45 checks). **Consumer path (`tier2-scroller`, plan `581`):** the shipped parts mount through the published root and the token theme; a pinned append and a taller streamed row keep the tail visible, wheeling up unpins without yanking later arrivals, the affordance counts them, jump returns to the tail, and a short history is inert. **Measured defect:** wheeling back to the end moves the offset to the bottom but does **not** re-pin (`-1003`, `pinned=false`, affordance still painted) — the distance rule reads the viewport's reported box, which 0.10.0 shifts by its own scroll offset (plan `529` §6.3), so it never falls below the threshold. Recorded cross-team in `TODO.md`; 43 headless + 22 live checks. |
| Fieldset | done | partial | `Fieldset` + `FieldsetLegend` over a `role="group"` named by the legend; `disabled` reaches `FieldInput` (read-only, out of the tab order, disabled roles) and dims only the legend; 7 native behaviour tests. 0.10.0 has no `fieldset` element and no `aria-disabled`, so the group state is not announced; other controls keep their own `disabled` |
| Form | done | partial | `Form` over an owned value: decodes with the caller's schema, shows every `validateAll` message in one `role="alert"` summary, calls `onSubmit` with the decoded value and refuses to submit while `pending`; a render prop hands over `errors`/`pending`/`submit` because the contract fixes Form as one part; 7 native behaviour tests. No field registration, no message-to-field mapping and no re-validation on edit |
| Navigation Menu | done | partial | `NavigationMenu`, `NavigationMenuList`, `NavigationMenuItem`, `NavigationMenuTrigger`, `NavigationMenuContent`, `NavigationMenuLink`: one anchored panel at a time, press/Enter/Space/ArrowDown open (ArrowDown focuses the panel), Left/Right/Home/End move between triggers, Escape closes through the shared dismiss stack and returns focus, outside press closes, links run once and close, controlled `value`; 10 native behaviour tests, both themes. No `href` in 0.10.0 (links are buttons with `onSelect`), no hover-open, no `aria-haspopup` |
| Preview Card | done | partial | `PreviewCard`, `PreviewCardTrigger`, `PreviewCardContent` over the anchored layer and the shared dismiss stack: delayed hover open (default 300 ms), immediate keyboard-focus open, pointer travel into the card keeps it open, close after leaving both (default 150 ms), Escape restores focus, outside press closes, press toggles (touch path), `open`/`openDelay`/`closeDelay` controlled; 8 native behaviour tests. Timers are component UI timers; no pointer-type signal (no touch hover), not auto-focused on hover, no anchor arrow or `aria-haspopup` in 0.10.0. **Probe (`preview-card`, plan `196`):** the card enter arrives **before** the trigger leave, the leave has no coordinates, and enter/leave are per element, so a close scheduled on the leave must re-check pointer presence at fire time and every hoverable child needs a handler. **Live (`live-preview`, plan `199`):** the contract holds in a real window; the enter and leave arrive in one React batch, so an append-only log is the reliable order. |
| Drawer | done | partial | `Drawer`, `DrawerTrigger`, `DrawerClose`, `DrawerContent` (left/right/bottom, sm/md/lg), `DrawerHeader`, `DrawerTitle`, `DrawerDescription`, `DrawerFooter` over the shared modal rules in `internal/modal.ts` (extracted from Dialog: open state, dismiss stack, focus in/return, Tab trap); 10 native behaviour tests, both themes. No swipe-to-dismiss (no drag host feature), no slide animation (no transform), no `aria-modal`/`aria-labelledby`, no portal (anchored veil), sizes are layout constants. **Consumer path (`tier2-editing`, plan `347`):** a press opens it flush to the right edge at exactly 400×window height, the surface takes native focus, Tab moves to the first control inside, Escape returns focus to the trigger and a veil press closes it — proven live too |
| Stepper | done | partial | `Stepper` + `StepperStep` over `role="list"`: statuses (`complete`/`current`/`upcoming`) derived from the one `value`, horizontal or vertical, `StateStyle<StepperStepState>`; 8 native behaviour tests. Display-only by design (no step click), no connector line, and `aria-selected` stands in for the missing `aria-current` |
| Timeline | done | partial | `Timeline` + `TimelineItem` over `role="list"`: an explicit `complete`/`current`/`upcoming` status (passed, not derived), timestamp/description, a connector after every event but the last, `StateStyle<TimelineItemState>`; 6 native behaviour tests, both themes. Display-only, no `aria-current` (the current event uses `aria-selected`), `last` comes from direct children, one connector style |
| Color picker | done | partial | one `ColorPicker`: a keyboard-reachable swatch grid (defaults are six theme colours), a HEX field that normalises `#abc`/`AABBCC` on commit, a live preview and `StateStyle<ColorPickerState>`; 8 native behaviour tests + 8 hex tests, both themes. **No saturation/value square** — 0.10.0 has two-stop linear gradients only and no radial gradient, so the square is not faked; no alpha/HSL/RGB fields or eyedropper |
| Tag / token input | done | partial | `TagInput` + `TagInputField` + `TagInputChip`: Enter and a typed comma commit through a pure add/remove rule set, duplicates refused unless `allowDuplicates`, `max` caps additions, a chip control removes, controlled-only value, `StateStyle` on both field and chip; 8 native behaviour tests + 10 rule tests, both themes. No Backspace-on-empty (0.10.0 emits no keyDown for Backspace/Delete in the test renderer), no `aria-disabled` (readOnly + dimming), no autocomplete. **Consumer path (`tier2-editing`, plan `347`):** Enter, a typed comma, the duplicate rule and `max` all hold; **the chip's removal control carries no `testId`**, so a probe must click derived coordinates (`x + width − 16`, `y + height/2`) |
| Mention input | done | partial | `MentionInput` + `MentionInputList` + `MentionInputItem`: the text's last `@` token opens a ranked anchored list (prefix matches first, case-insensitive, capped), arrows wrap, Enter (the input's submit event) or a press inserts `@name `, Escape and a no-match query close, both callbacks fire once, `disabled`; 9 native behaviour tests + 12 rule tests, both themes. The query comes from the text, not the caret (no caret API in 0.10.0), a space while the list is open is consumed by the runtime, and `listbox`/`option` roles are dropped from the a11y dump (rows are selected buttons) |
| Hotkey-recorder input | done | partial | one `HotkeyRecorder`: click/`Enter`/`Space` listens, a real chord reports the shared accelerator string, Escape cancels, blur cancels, a named clear control unbinds, `disabled` leaves the tab order, `StateStyle<HotkeyRecorderState>`; 8 native behaviour tests + 8 capture tests, both themes. No `preventDefault` in 0.10.0 (a captured system chord still fires), clearing is a control because the test renderer emits no Backspace/Delete, no conflict detection |
| Countdown | done | yes | one `Countdown` over `<text>`: `MM:SS` under an hour, uncapped `HH:MM:SS` after, opt-in `Nd ` prefix, floored seconds, negatives clamp to `00:00`, expired renders `mutedForeground`; 5 native behaviour tests + 9 formatting tests, both themes. The component owns **no timer** — the app ticks with Effect `Clock` and passes `remainingMs`; fixed locale-free format, no `role=timer` for live announcement in 0.10.0 |
| Carousel | done | partial | `Carousel`, `CarouselTrack`, `CarouselSlide`, `CarouselControl`: discrete stepping with clamped edges, `loop` wrapping, arrow/Home/End keys, controlled/uncontrolled index, slides kept mounted and hidden with `display`, `StateStyle<CarouselSlideState>`; 8 native behaviour tests, both themes. **No slide animation** (motion has no transform) and no swipe; no indicator dots or auto-advance; slides must be the track's direct children. **Measured on the consumer path (`tier2-flow`, plan `347`):** hiding an inactive slide with `display: "none"` is a **no-op** on 0.10.0 (every slide keeps painted bounds and stays hit-testable, headless and live) — the same runtime gap `workspace-panes` measured. Recorded for `components`; the fix is the tabbed panes' absolute-slot + `visibility` recipe |
| Inline edit | done | partial | one `InlineEdit` that swaps a `role="button"` display for a real `<input>`: Enter or blur commits (once), Escape discards, an unchanged draft calls nothing, empty text is a valid value, controlled/uncontrolled edit state, `StateStyle<InlineEditState>`; 8 native behaviour tests, both themes. No `contenteditable` in 0.10.0 (the swap is explicit); no `aria-invalid`/`aria-describedby`; blur commits by contract. **Live (`live-tier2-editing`, plan `347`):** the locator's click starts the edit and the component's layout effect moves native focus to the swapped editor (a coordinate click is unnecessary; the plan-596 gate removed one that could miss a narrow display), Enter commits and Escape discards. **Blur commit is a two-state observation (plans `555`, `605`, 2026-10-19):** focused runs deliver React's `onBlur` — a click on the focusable `ws-elsewhere` commits (`name=livez commits=2`), paints the draft and leaves focus on the click. In the full-suite window state the same code moves native focus but **does not deliver `onBlur`**, so the editor stays open with its draft; `live-tier2-editing` now asserts both states (committed, or open-and-then-Enter-commits). The headless host delivers no `onBlur` at all, so `tier2-editing` asserts the editor stays open there. Consequence for consumers: a commit that must happen on focus loss cannot rely on `onBlur` alone — an outside-press handler is the robust route (cross-team task). |
| Keyboard shortcuts / keycap display | done | yes | `KeyboardShortcuts`, `KeyboardShortcutsGroup`, `KeyboardShortcut` and `Keycap` over the shared accelerator model (`mod` adapts to the platform; order preserved; unknown tokens display verbatim); 6 native behaviour tests + 10 accelerator tests, both themes. Display-only by design (a row documents a chord, never binds it); no `aria-keyshortcuts` in 0.10.0; rows are separated by 1px elements because an element has one `borderColor` |

## Tier 3 — data presentation

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Tables | todo | yes (probe) | No `<table>` element; grid + `div` rows. Keyboard row navigation builds on the `roving-focus` contract. **Pinned chrome (`grid-wide-table`, plan `185`):** `position: "sticky"` is **ignored** by 0.10.0 (a sticky header scrolls with its content; `style.rs` maps only absolute/fixed/relative), so a header and a frozen column must be derived from the body's one scroll offset (`renderer.getScrollOffset`) and re-rendered from it — measured alignment within 1 px on both axes under a wheel pan. `role="gridcell"` maps to AccessKit `GridCell`, and `aria-selected` reaches the dump. **Editable cells (`grid-cell-editing`, plan `387`):** a press selects the row and a second press mounts a real `<input>` (a real double click is not observable: `clickCount` is always `1`, plan `533`) that takes native focus inside a virtual row; typing is a draft and Enter commits through the editor's own `onSubmit`. **Editor keystrokes bubble to the grid container's `onKeyDown`** (counted), so a grid's arrow navigation must be guarded by an `editing` state — with the guard the selection stays put and the caret keeps focus. An editing row that leaves the window **stays painted** (the plan-158 focused-row rule), so the runtime does not end the edit for you; a grid must end it on leave, and the probe commits there (`last=leave`) rather than leaving an edit attached to a row the reader cannot see. A row-set sort commits the open draft and keeps it with the **row id**, not the index. **Live (`live-grid`, plan `556`):** the contract transfers to a real window — a wheel moves the body ten rows with the frozen column aligned, a `deltaX` wheel over the body is swallowed, the component pan moves header and body together at `-360`/`-1700`, an off-window column has no painted bounds, and six Rights plus three Downs pan and align the reveal. Two harness limits: a scroller's own box **moves with its scroll** (cache it first), and every child of a scroller reports a moved box **whatever its `position`**, so the `position: "sticky"` claim itself stays headless. |
| Sortable tables | todo | yes (probe) | Grid + keyboard headers. **Live (`live-table-sort`, plan `340`):** a real click on `table-sort` reorders the row the automation tree points at (`table-first` becomes `Item 199`), a click selects `r199`, and the selection survives a re-sort. **Playground (`data-grid-virtual`, plan `338`):** sorting a virtualized grid from anchor 45 must reset the list to row 0 (`scrollToItem`) — without the reset the anchor stays 45 and the frozen column shows unrelated rows; ascending then paints `Item 000`, descending `Item 059`. **Live (`live-data-grid`, plan `606`):** a sort from anchor 45 resets to the top and paints the flipped first row (`Item 059` / `Item 000`) in a window. |
| Row selection | todo | yes (probe) | `aria-selected` is supported (verified). **Live (`live-table-sort`):** a real row click selects by row id and the selection survives a re-sort. **Playground (`data-grid-virtual`):** clicking a cell in a horizontally panned virtual row selects its row, moves native focus to the cell and does not move the pan. **Live (`live-data-grid`):** a real click on `dg-cell-<row>-9` at the far pan selects the row, takes native focus and leaves the pan at `-400`. |
| Column configuration | todo | partial (probe) | **The hide/show/reorder contract is measured (`column-config`, plan `384`).** State is `{ order, hidden }` over the plan-349 `Widths`: hiding a column unpaints its header and every body cell and closes the gap, the visible width drives the scroller's maximum (a panned offset clamps at once, `-200 → -50`), showing restores the order slot and the width (a widened 240 px column keeps 240), reordering moves the absolute header offset and every flex body cell together within 1 px, and the list anchor plus the selection survive a hide, a reorder and a show. The settings surface is an `<anchored>` panel opened from app chrome (`Group:Columns`, trigger `Button`); it stays usable while the grid repaints, Escape returns focus and an outside press dismisses. **Windowing is still the grid's** (`grid-wide-table` windows columns; `data-grid-virtual` puts all columns in one wide `<virtual-list>`); a configuration UI, drag reordering and persisted settings belong to the data-grid package. |
| Resizable columns | todo | yes (probe) | Pointer events + per-column width state. **`data-grid-columns` (plan `349`) measures the grid shape:** a 6 px handle on each header cell drags that column's width between inclusive bounds (`96…320`); the virtual rows are flex children of a row whose width is the sum, so a resize repaints every row at the new width with no stale cell, and header/body agree within 1 px; the horizontal scroller's maximum follows the sum (`-200 → -350`) and a **shrink clamps the live offset immediately** (`-350 → -130` with no manual scroll); the anchor (`getListScrollTop[0] = 45`), the frozen column and the selection survive a resize; a click focuses the handle and `Home`/`End`/arrows clamp. **Hit-testing:** a handle that straddles the cell boundary loses its **centre** click to the next header cell (the later sibling owns the boundary pixel), so it must sit fully inside its own cell. `role="separator"` is an AccessKit `Splitter` with `aria-valuetext` (no `aria-valuenow`). **Live (`live-data-grid-columns`):** a paced real drag resizes header and body, a real click + arrow resizes, and a real pan keeps the alignment; the automation `click(testId)` uses the **unclipped** centre, so a clipped handle needs a pan first. Plan `130`'s `table-column-resize` remains the plain-flex-row case. No auto-fit, reorder or persisted widths; a width does survive a hide/show (`column-config`, plan `384`). |
| Filtering controls | todo | yes (probe) | `div` + `<input>`. **Measured:** `data-grid-virtual` filters a 60-row virtual set from the header control, narrows the painted rows and resets the anchor; `property-panel` filters a virtual inspector case-insensitively while preserving hidden drafts; the shipped `SearchInput`/`Combobox` are driven by `tier2-choice` (plan `346`); `query-builder` (plan `378`) composes a **rule list** — three native `Select`s per row inside a `overflowY: "scroll"` strip, `all`/`any`, per-kind operators, incomplete rules ignored by both combinators — and derives a virtualized result set (40 / 12 / 59 / 0 rows on the 120-row fixture), resets the anchor and clears the selection on every rule edit. A filter is app state over the row set, not a runtime feature. |
| Data toolbars | todo | yes (probe) | Toolbars + Button groups. **`data-toolbar` (plan `377`):** a 40 px `role="toolbar"` over a 60-row `<virtual-list>`, with a native search, status filters, sort, column toggles, a selection count and a bulk archive. Search `item 1` narrows to 11 rows and paints the first match at the viewport top; paused narrows to 20; the sort flips id → status (paused first) and unpaints the previous first row; hiding `owner` unpaints its header and every cell while `name` stays. The selected rows paint `colors.accent` exactly, the pair survives a wheel away and back, a filter clears the selection, and `archive` removes the selected rows (`total 60 → 58`, `archived=2`). The toolbar is `Toolbar:Data toolbar` and the search `TextInput:Search`. **Anchor:** a filter after a wheel leaves the renderer at index 0 but the `onVisibleRange` readout stale at 30 — the component mirrors the reset. |
| Virtualized lists | todo | yes | `<virtual-list>` published. `scroll-into-view` measures the scroll contract: `focusElement` reveals a row by itself; `scrollToItem` reaches an exact anchor and `scrollIntoView` reveals a row the list has laid out (a far row is a no-op — plan `601`); **`getScrollOffset` saturates on a virtual list — persist `getListScrollTop`** (`[itemIndex, offsetInItemPx, viewportHeightPx]`); a scroll does not move focus. **A resized pane (`workspace-panes`)** re-windows the list against the **clipped** intersection (a list fixed at `120` still painted fewer rows when its pane shrank), and the anchor survives the resize and a tab switch. **Variable heights (`variable-rows`, plan `198`):** declared row heights stack exactly (20/40/60), an in-place expansion reflows the rows below by the exact delta with the anchor intact, and `scrollToItem` stays exact while a nearby `scrollIntoView` still reaches its row — so an expandable row or a wrapped cell needs no fixed-height assumption. **The same contract holds in a real window (`live-variable-rows`, plan `534`):** the declared offsets and heights, the `+60` expansion, the collapse, the exact `scrollToItem(30)` and a real wheel's in-row offset all pass through the automation protocol — record the origin from the list's wrapper `div` (a `<virtual-list>` has **no painted bounds** live) and the anchor from `listScrollTop`. The list needs a resolved height: derive it from the split. **Live (`live-table`, plan `197`):** a real window reports the same anchor through the renderer — `[0, 0, 258]` at rest and `[120, 0, 258]` after `scrollToItem(120)` — so persistence is assertable live. **The element route live (`live-scroll-into-view`, plan `601`):** focusing row 199 reveals it, `Home` returns to the top, `scrollToItem(120)` and `scrollIntoView(row 10)` both paint their target and leave focus alone, and three `Down`s paint the moved row. A row the list has not laid out is **not** reached: from the anchor at 120, `scrollIntoView(row 50)` and `(row 100)` did not move the offset, so an app must use `scrollToItem` for a far jump. **Retention live (`live-scale`, plan `620`):** the automation tree counts **3 nodes per declared row** — 6,019 at 2,000 rows and 319 at 100 (the same 3-per-row delta as `scale-cost`, plus a constant 7 chrome nodes) — and `scrollToItem(1000)` paints a different row at an **unchanged** count. Paint is windowed; memory is not. The syntax-cache half stays headless (no live verb or renderer counter). |
| Virtualized tables | todo | yes (probe) | `virtualized-table`: fixed-height flex rows with fixed-width cells paint inside `<virtual-list>` (~9 of 500), a painted row is hittable and selects, and selection survives scrolling out and back. **The data-grid composition (`data-grid-virtual`, plan `338`):** a `<virtual-list>` wider than its viewport inside a plain horizontal scroller keeps painting and scrolling while panned; a frozen column placed from `getListScrollTop` read inside `onVisibleRange` aligns with the body within 1 px (the payload is not a sync source — it left the anchor at 0 after a 280 px wheel), and a row-set change (sort/filter) must reset the anchor. `onVisibleRange` **lags the painted window by one gesture** — use the painted rows, not the event, as the current window. The AccessKit tree also follows the painted window, so off-window rows are not exposed to assistive technology (`a11y-tree`). **Windowing both axes is component code** (`grid-wide-table`, plan `185`): there is no horizontal virtual list, so a wide grid derives the visible column **and row** ranges from the body offset, keeps only that range plus overdraw in the tree, and reveals a keyboard-selected off-window cell with a component-owned `scrollTo` (`-260` in the probe). **A row menu inside a virtual row (`grid-cell-editing`, plan `387`):** an `<anchored position>` child of the row paints at the action's bottom-left within 1 px, including below its 32 px row, and takes native focus (`Group:Row actions`), Escape returns focus to the action and an outside press closes without returning it. Its `position` is a **window point**, so a scroll leaves it pointing at the row's old place; the probe closes any open menu on an anchor change (`last=scroll`). A programmatic `scrollToItem` fires no range event live, so an app-owned jump mirrors the anchor and applies the leave/close rules itself (plan `338`'s rule). **Live (`live-data-grid`, plan `606`):** in a real `1100×720` window a vertical wheel virtualizes the body while the header and pan stay put, a header `deltaX` wheel pans both layers together at `-90` and the `-400` far edge, the frozen row follows the renderer anchor, a filter from anchor 45 narrows 60 → 11 and resets to the top, and a `deltaX` wheel over a body **cell** pans the scroller (`-400 → -310`) where the offscreen runtime swallows the same verb — a harness difference, so the headless suite keeps using the affordance. **Retention (`live-scale`, plan `620`):** the grid's rows are the same `<virtual-list>`, so a real window retains **3 nodes per declared row** (6,019 at 2,000 rows, 319 at 100) while painting a window — windowing both axes in component code does not reduce retention. |
| Tree views | todo | yes (probe) | `tree-view`: `paddingLeft` indents labels exactly (16px per depth); expand/collapse paints and unpaints the subtree; a clicked row takes native focus and receives arrow keys. `virtualized-tree` adds the virtualized form: 16 px per depth inside `<virtual-list>`, a count change from 8 to 48 rows repaints correctly, and Down/Up move native focus by roving index even for a row outside the window. **Live (`live-tree`, plan `559`):** the same view in a real window — a real click expands 8 → 48 rows and collapses again, the child still indents 16 px, a real `-800` wheel moves the list anchor and re-windows the tree, `scrollToItem(25)` anchors `[25, 0, 260]` and paints the row, a click focuses a row and Down/Up move native focus and the selection, and `Right`/`Left` expand, walk to the first child/parent and collapse. The anchor reports the flex-resolved 260 px viewport; `vtree-viewport` is the wheel/box target because a `<virtual-list>` has no painted bounds live. |
| Expandable rows | todo | yes (probe) | `motion` height for an accordion; **inside a `<virtual-list>` it needs no motion** (`variable-rows`, plan `198`): declared row heights stack exactly, an in-place `60 → 120` expansion moves the rows below by exactly `+60`, the anchor stays `[0, 0, viewport]`, and the painted window shrinks to fit. Declare the height from state; no measurement pass and no manual scroll. **Proven in a real window (`live-variable-rows`, plan `534`):** a real click on the row expands it to 120 px and reflows rows 3–5 by exactly `+60` with the anchor unmoved, a second click collapses it, and an exact jump still lands on the viewport top — 49 checks. |
| Key-value displays | todo | partial (probe) | `div` + `<text>`. **`property-panel` (plan `348`)** measures the row: 36 px tall, a 96 px label column, an 8 px gap, then the value column; the label and value paint as separate addressable text; a filter input narrows the rows case-insensitively while preserving declaration order. |
| Property panels | todo | partial (probe) | Fieldset + Inline validation + Key-value displays. **`property-panel` (plan `348`):** an edit is a parent-owned **draft**; the committed model, a preview outside the list and the row's editor all read it; Enter commits (and clears the draft), Escape reverts, reset restores every baseline value and clears drafts and the filter; filtering does not discard a hidden row's draft. |
| Statistic / metric cards | todo | yes (probe) | Cards + `<text>`. **`data-toolbar` (plan `377`):** three 160 × 64 cards with a muted label over a 20 px value; `Total`, `Showing` and `Selected` derive from the source rows, the filtered set and the selection; they repaint on search (`60 → 11`), filter (`60 → 20`), selection (`0 → 2`) and archive (`60 → 58`). The cards are a `div` + `<text>` composition in the probe; the shipped `Card` family is exercised by `tier2-foundation`. |
| Charts | todo | partial (probe) | No chart host element. **`<canvas>` is unsupported** — retained but renders `gpui::Empty`, so no bounds and no children paint (`native-surfaces`). **`chart-svg` gives the recipe:** bars from `div`s are exactly assertable (geometry, token colour, painted hit-testing); a sourced `<svg>` is an **alpha mask tinted by one `color`**, so a line/area series is **one `<svg>` layer per series** in an absolute slot (both layers paint the same box; each reports its own tint); SVG-internal text is rasterized and invisible to `getPaintedText`/a11y, so axis and value labels are `<text>` siblings; an `<img>` SVG data URL is the **full-colour** path — it paints gradients and multiple fills (screenshot evidence; no pixel readback). **Live (`live-chart`, plan `593`):** the bars keep their `56 px` width, their exact value heights and the plot baseline, advance by `72`, and a real click selects a series; both `<svg>` layers paint the same `480 × 160` box; the authored SVG child answers its text but is absent from `paintedText()`; and an **SVG data-URL `<img>` keeps its declared `480 × 120` box live**, unlike the raster data URL's 1 px per-axis tracker loss in plan `577`. Colour, gradients and the alpha mask stay `TestRenderer`/screenshot evidence. |

## Tier 4 — desktop workspace

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Resizable split panes | todo | partial (probe) | Pointer events + `motion`; `col-resize`/`row-resize` cursors are provided (verified). **Both axes + keyboard (`panel-nested`, plan `175`):** `dy` drives a vertical split exactly (`180 → 228`, painted height agrees), arrows resize the focused divider by 16 px, and the divider is exposed as an AccessKit `Splitter` with its size on `aria-valuetext` (no `aria-valuenow`/`aria-orientation` exist). A `focusNext` leaves the divider; the nested reverse edge does not re-enter it (§8). |
| Panel groups | todo | partial (probe) | Composition over split panes. A split nested in a pane resizes **independently** of its parent (`panel-nested`: inner `300 → 360` while the outer stayed `228`). **`docking-layout`:** each group is a named `Region` containing a `TabList`, `Tab`s and a labelled `TabPanel`, and the dump exposes all four roles (plus the divider's `Splitter`); every split must be `key`ed by its node id, because a collapse reparents a surviving split into its parent's position and React otherwise reuses the parent's size state. |
| Collapsible sidebars | todo | partial (probe) | `motion` width (outer clipping container, not inner reflow) — measured by `motion-collapse` on 0.10.0: exact intermediate widths under the paused clock, inner pane keeps its width. **`live-motion` (plan `192`)** repeats the 80 ms / 96 px of 240 frame in a **real window** and confirms the live clock is the motion clock. **`panel-nested`:** width `0` paints `0` with no residual border or padding and the neighbour absorbs the space; re-opening paints the full width. |
| Tabbed panels | todo | partial (probe) | Tabs + panels. The strip's overflow contract is measured by `tab-strip-overflow` (horizontal pan, clipped children keeping bounds, component-owned reveal; clamp the near end — the renderer stops at `x = -5`, not `0`) and its keyboard contract by `tab-strip-focus` (a clipped tab is a tab stop that focus does not reveal; a roving strip is one stop and reveals on End/Home). **Live (`live-tab-overflow`/`live-tab-focus`, plan `565`):** the pan, the clipped tab's bounds, the exact `scrollTo` and the End/Home focus+reveal all transfer. **The automation `tab` key does not traverse** (nine presses left focus on `naive-0`), so live tab-order evidence uses the renderer's `focusNext` — the same API the component must call itself if it wants native Tab to visit clipped children. The live reveal lands 4 px past the trailing edge (the strip's padding). **The pane body (`workspace-panes`, plan `177`):** `display: "none"` is a **no-op** in 0.10.0 — the inactive pane still laid out and stole a click — so panes stay mounted and overlap in absolutely positioned slots with `visibility: "hidden"` + `pointerEvents: "none"`. That keeps the pane's draft, pick and virtual-list anchor across a switch and also removes its tab stop. Pass a content height derived from the split (a `height: "100%"` chain gives a virtual list no viewport). A nested scroller **chains** the wheel unless it sets `pointerEvents: "auto"`. |
| Detachable / movable tabs | partial (probe) | partial (`float-tab`) | Needs a portal/drag model; no drag host feature. `drag-targets` measured the missing piece: hover is frozen during a captured drag, so the pane under the pointer cannot highlight itself (hit-test from pointer coordinates as `workspace-tab-drag` does); the gesture also ends in a click on the source tab. **`drag-autoscroll`:** the runtime does **not** scroll a held drag at an edge — the strip must own an edge loop (`renderer.scrollTo` per held move), which keeps the capture and the up, and derive the drop index from the pointer and the live offset. **`docking-layout` is the in-window destination:** a held tab drag keeps arriving while the drop indicator re-renders on every move, the release applies exactly one drop, an edge drop splits the target and a centre drop merges, and moving a group's last tab out prunes it and collapses its split. A new OS window is not available: 0.10.0 exposes one app window (`render` + `WindowOptions`), no `openWindow`. **`float-tab` (plan `194`) is the in-window float:** a captured tab drag released outside the dock opens an absolutely positioned panel at the release point (the last held move), rendered as the app root's **last child** so it paints above and takes the click where it overlaps the dock; its title bar drags it by the pointer delta and a component-owned clamp pins it to `(app − size)`; it owns native focus, Escape closes it and returns focus to the dock's active tab; dragging its tab back onto the strip appends and activates it and prunes the emptied window; the whole thing round-trips through the `{ dock, float }` JSON snapshot. Two limits: no drag preview (the panel appears on release), and a close control nested in the press-captured title bar does not fire — keep drag surfaces and controls as siblings. **`live-float` (plan `195`)** repeats the whole path in a real window (paced drag, release point within 1 px, exact title delta, focus/Escape, close); it also caught a **live-only** race — the drag-ending click re-applied the pre-drag dock from a stale closure and resurrected the torn-off tab — so a tab click must be idempotent against the gesture-ending click (a functional state update here, click suppression in a destructive component). |
| Docking layouts | todo | partial (probe) | Composition over split panes + tabs. **`docking-layout` measures the mechanism:** a pane layout is a recursive React tree whose surface rectangle comes from component code (`ref` → `PublicInstance.id` → `renderer.getElementBounds`), and the pure model's boxes for every group match the runtime; the drop indicator is an **absolute child of a `position: "relative"` pane**, pixel-exact (a 4 px bar on the edge, the whole pane for a centre), `pointerEvents: "none"`, tinted by the theme's `primary`; the zone is a 48 px edge band with the nearest edge winning a corner; a right/bottom drop puts the new group **secondary**, left/top **primary**; an emptied group is pruned and its split collapses to the survivor (measured at the top level too); and a recursive layout — outer `280`, nested `324`/`197` — restores exactly through a keyed remount of the model. |
| Nested panel arrangements | todo | partial (probe) | Composition. A vertical outer split holding a horizontal inner split is measured end to end: both axes resize, the nested drag leaves `outer = 228`, and the top pane's painted height/width track the readouts (`panel-nested`). |
| Workspace layouts | todo | yes (probe) | Composition + persistence. **Measured (`workspace-restore`)**: a keyed remount loses the layout; app-owned JSON restores split width, tab lists, active tab and the virtual-list anchor exactly. No renderer storage, and native focus is not restored. **Composition (`workspace-panes`)**: a hidden pane keeps its own state and anchor; a resized pane re-windows its list (`5 → 2` painted rows at `240 → 180`) and keeps the anchor; a nested scroller needs the `pointerEvents: "auto"` wheel guard. **The guard is proven (plan `575`):** with it on, a wheel over a painted inner row moves the inner `-240 → -360` and leaves the outer at `0`; with it off the wheel chains (`outer -240`), and forcing either value fails both suites. **Live (`live-workspace-panes`, plan `575`):** the hidden pane leaves the paint and keeps its draft/pick/anchor, the guard holds through a real wheel, the hidden pane leaves the native tab order, and a paced `+60` drag repaints more virtual rows at the same anchor (`30`); 27 headless + 39 live checks. **Live (`live-restore`, plan `339`):** the same layout, tab and anchor survive in a real window, and the painted pane width (400) agrees with the snapshot within 2 px. **The window is the layout root (`window-layout`/`live-window`, plan `526`):** `useWindowSize()` reports the paintable size exactly (`1280x800` offscreen, `1100x720` live) and observes a real `zoomWindow()` resize (`→ 1680x923`) within its 100 ms poll; a layout derived from it reflows and a window-sized veil tracks the new size. Insets are zero on desktop and there is no window-drag API. |
| Persistent panel state | todo | yes (probe) | App-owned serialisation; no renderer storage. The format `workspace-restore` measured: `{ split, tabsA, tabsB, active, anchorIndex, anchorOffset }`, decoded with `Schema` at the boundary; persist `getListScrollTop`'s index/offset (never `getScrollOffset`, which saturates) and apply it with `scrollToItem(listId, index, offset)` on mount. **Recursive layouts (`docking-layout`)**: the tree owns every split size; `encodeDock`/`decodeDock` are the JSON boundary (`Schema.fromJsonString`), and a restore is a **keyed remount** so each `SplitPane` re-reads `initial` — the live instance's state is not mutated. A corrupt snapshot decodes to `None` and is reported, never thrown. **The anchor is live-readable** (`live-table`, plan `197`) **and the restore is proven in a real window** (`live-restore`, plan `339`): a paced drag paints the split 320 → 400, save → reset → restore re-applies the split, the active tab and the anchor `[120,16]` exactly, row 120 paints and row 0 does not, native focus is **not** restored, and the restored list still takes a click. |
| Keyboard navigation | todo | yes (probe) | Real native focus handles (verified); `roving-focus` measured programmatic focus between passive rows, key delivery after the move, and focus surviving a virtual window scroll. The roving-tabindex model is ours. **`live-focus` (plan `190`)** proves the modal's Tab/Shift-Tab containment and focus return in a real window, not only in `TestRenderer`. **`live-roving-focus` (plan `637`) proves the roving model live:** a component's own `renderer.focusElement` reaches a never-clicked row and the next key lands there; a real wheel moves the virtual window past the focused row while focus, the focused row's paint and key delivery all survive, so the painted set is the window **plus** the focused row. |
| Command palette | todo | partial (probe) | `<input>` + `FloatingLayer` + `<virtual-list>`. Variant merged here: Spotlight (adabraka `spotlight`). **Measured (`command-palette`, plan `176`):** a non-modal overlay keeps **one** focus owner — the input stays focused while arrows move a visual active row (no `aria-activedescendant`; the row's only AT form is `aria-selected` on a `ListBoxOption`, inside a `Dialog`) — arrows arrive as key **down** and Enter as `onSubmit`; the app-level window handler sees letters, arrows and Escape while the field is focused but **not Enter or Backspace**, so commit/dismiss must stay in the field and the window handler is a chord layer only; `cmd-k` reaches it without typing; the scrim is a **sibling** under the surface, so row clicks land above it and a veil click dismisses; focus is captured in the open handler and restored to the trigger on close. **Live (plan `389`):** the same path runs in a real window — `cmd-k` with nothing focused, a window-sized veil, typing while the window handler sees every letter, arrows that keep focus in the input, `onSubmit` commit, Escape/veil/row dismissal and the focus return from a click-opened palette. 50 headless checks, 80 live checks. |
| Application menus | todo | yes (in-window; probe) | **`menu-bar` (plan `519`) measures the in-window model.** A 28 px `role="menubar"` with four titles and one open menu at a time: a `FloatingLayer side="bottom" align="start"` surface paints 2 px under its title and aligned to it; hovering another title **switches** the open menu and focuses its first enabled row, while hover is inert on a closed bar and on a disabled title; Right/Left open the neighbour and **skip a disabled menu** (View), Down/Up wrap and **skip a disabled row** (Save As…); Escape and activation return native focus to the **open title** (not the first); an accelerator runs **exactly once**, never opens a menu, dismisses one when open, and is inert for a disabled row (the window handler is the only owner); an outside press dismisses without running a row. AccessKit maps `menubar`/`menu`/`menuitem` to `MenuBar`/`Menu`/`MenuItem`, and `aria-expanded` follows the open title. **The limitation stands:** the published 0.10.0 has **no menu/tray API** — `NativeRenderer` exposes only window controls (`setWindowTitle`, `activateWindow`, `minimizeWindow`, `zoomWindow`, `toggleFullscreen`), and no `menu`/`Menu`/`tray` symbol exists in the native or React types — so this is honestly an in-window bar, never the macOS menu bar. A true OS menu needs a renderer API that is not in this version. |
| Status bars | todo | yes (probe) | `div` + `<text>`. **`app-chrome` (plan `350`):** a 24 px `flexShrink: 0` bar at a 420 px shell's bottom edge stays exactly there while a 200 px sidebar scroller and a 440 px `<virtual-list>` scroll independently (`-100` and `-240`); the bar reports the active pane, the list line (`getListScrollTop` read in `onVisibleRange`), the selection, the action count and both offsets; `role="status"` is an AccessKit `Status`. **Live (`live-app-chrome`):** both wheels and the pinned `y` hold in a real window. |
| Toolbars | todo | yes (probe) | `div` + Button groups. **`app-chrome`:** a 380 px `overflowX: "scroll"` toolbar over a 720 px item row holds a breadcrumb `Navigation`, three 44 px actions, a 1 px separator and a 300 px spacer. The trailing `sync` action starts past the viewport but **keeps painted bounds**; one `renderer.scrollTo(-340)` moves it by exactly `-340` and it then hit-tests and runs once. The primary actions stay visible at rest because the spacer follows them. Measured lesson: a flex row of `flexShrink: 0` items overflows its declared width, so a pan must cover the item's real layout x, not `viewport − rowWidth`. |
| Breadcrumb navigation | todo | yes (probe) | Breadcrumbs + navigation. **`app-chrome`:** a four-segment trail (`role="navigation"`, AccessKit `Navigation` named `Trail`) collapses its **middle** from app state — `Workspace / … / file.ts`, `src` absent from the painted text — and expanding restores it; each crumb is a focusable `Link`, a click truncates the trail to that depth (`trail=2`, deeper crumbs unpainted), the root takes native focus and Enter activates it. The shipped component's collapse rule and separators are measured by `tier2-navigation` (plan `344`). |
| Inspector panels | todo | partial (probe) | Property panels + panels. **`property-panel` (plan `348`):** an 860 × 440 frame composes a rendered preview with a 300 px inspector whose right edge matches the frame within 1 px; the inspector's `<virtual-list>` owns the editors, and an edit to `Opacity` resizes a bar outside the list exactly (40% → 48 px of 120). |
| Property editors | todo | partial (probe) | Fieldset + inputs. **`property-panel` (plan `348`):** a native `<input>` inside a virtual row is controlled by the model; typing is a draft and Enter arrives as the field's **`onSubmit`** (not a key bubbled to the row); scrolling the row out of the window and back repaints the committed value, and a draft survives the same scroll. **Off-window rows (`grid-cell-editing`, plan `387`):** an editing row that leaves the painted window **keeps its painted bounds** (the plan-158 focused-row rule), so the runtime does not end the edit for you and the committed value is only visible after scrolling back. A grid must therefore **end the edit when the row leaves the viewport**; the probe commits on leave (`commits + 1`, `last=leave`). While the editor is visible its keystrokes reach the grid container's `onKeyDown`, so grid navigation needs an `editing` guard. (Plan `158` measured focus and key delivery for an off-window focused **div** row; this probe did not re-measure them for an input, because its leave rule ends the edit first.) |
| File trees | todo | yes (probe) | Tree views + `<virtual-list>` — `virtualized-tree` proves the combination: 328 flattened rows, 16 px per depth inside a virtual row, expand/collapse from 8 to 48 rows, click/arrows with native focus, and focus surviving the window moving away. Hierarchical virtualization itself is ours; an off-window row is invisible to the accessibility tree (`a11y-tree`). **Reordering is measured (`tree-reorder`, plan `392`):** the tree is a pre-order flat list, and a drop names a row plus `before` / `after` / `into` (middle 50 % of a directory + one indent step of x; a file never takes a child). A move takes the **whole subtree** and shifts every moved depth; a drop into its own descendant is `refused=descendant`, on itself `refused=self`, and the post-move pre-order invariant refuses a corrupt result as `illegal-depth`. Dropping into a collapsed folder opens it (a 500 ms hover does too), the flattened `at`/`depth`/`parent` is reported, and a `<virtual-list>` keeps its anchor (`[20,0,240]`). |
| Log viewers | todo | yes (probe) | `log-viewer`: `<virtual-list alignment="bottom" followTail>` starts at the tail and re-anchors on appends; `bottom` alone and `top` + `followTail` alone both anchor at the bottom. Scrolling up then appending does **not** snap back, so a follow toggle is app state plus a scroll. **Live (`live-log`, plan `571`):** the same path through a real window and a real wheel over a `log-viewport` wrapper — opening `[30,0]`, a pinned append `[50,0]`, a wheel to `[31,0]`, an append while scrolled up still `[31,0]` with the tail unpainted, the sentinel back to `[70,0]`, and a following append `[90,0]`; 22 headless + 26 live checks. **Measured anchor rule:** a bottom-aligned list reports `[count, 0]` at the tail rather than the plain list's max-scroll row/offset, so a pin test compares the index to the count. `alignment="bottom"` alone passes all of it; `followTail` is redundant in this composition. `<text>`; text search/highlight hooks exist. Copy is native: `text-selection` selects across text rows and `<code>`/`<diff>` copy excludes chrome, but a drag anchored in a `userSelect: "none"` gutter selects nothing — a text row, not the gutter, must anchor the selection. |
| Terminal surfaces | partial (probe) | partial (`terminal-grid`) | **No terminal host element and no PTY/process API** in 0.10.0 (`ElementType` ends at `virtual-list`; `GpuixRenderer` has only window/focus/scroll/selection/image/prompt methods), so a terminal is a text grid with the PTY owned by the app. `terminal-grid` measures the library's half: a click focuses the surface (a `div` with `role="textbox"`; removing `tabIndex` did not stop the focus), printable keys reach its `onKeyDown`, Enter/Up/Backspace/Escape and `ctrl-c` (`modifiers.ctrl`) are delivered, 18 px rows align to the same width for equal character counts in the theme's mono family, per-run `paintedStyle.color` carries `destructive`/`success`, and a 200-line `<virtual-list>` starts at the tail while the prompt row — a **sibling**, not a list row — keeps focus and text across scrollback jumps. **Live (`live-terminal`, plan `532`):** a real click focuses the surface (removing `tabIndex` does not change it), real keystrokes paint `$ ls` through the `keyChar ?? key` fallback, `ctrl-c` arrives with `modifiers.ctrl`, a real wheel moves the scrollback by more than a screen, and a jump to row 0 keeps the prompt and native focus. Two composition facts: a `<virtual-list>` has **no painted bounds** in the live automation tree (wrap it for a box or a live wheel; `listScrollTop`/`scrollToItem` still use the list id), and a bordered surface must include its borders in the declared height or its children lose 2 px (the scrollback measured `238` instead of `240`). Colour stays headless. Limits: no per-cell background/glyph atlas (a caret is a themed `div`), ANSI parsing and the PTY are the component/app's. |
| Search and replace | partial (probe) | partial (`replace-contract`) | `useTextSearch`/`findRanges` highlight rendered text; the replace UI is ours. **Find (`search-highlights`, plan `171`):** washes paint in window coordinates, a soft wrap paints one box per row, a surrogate-split range is refused, `<code>` is searched by `query` (not `ranges`), and a virtual row's `matchIndexOffset` numbers matches document-wide; the wash colour is not reported. **Replace (`replace-contract`, plan `333`):** an `<input>`'s text is **not** highlightable (`matchCount=0`), so the matches must be painted on a rendered preview, not in the editor; a component-set value repaints the editor; **the caret moves to the end** across the rewrite (a typed `z` landed after the final period, not at the old offset); there is **no `setSelection`**, so the active match, replaced range and caret cannot be placed programmatically. Also measured by `search-replace` (plan `334`): the document re-washes and recounts after a mutation, a count-preserving replacement moves the washes without a count event, length changes shift downstream matches exactly, and `<code>` re-highlights by prop. **Live (`live-search-replace`, plan `587`):** the document half transfers to a real window — real typing drives the query, one replace recounts/re-washes, replace-all empties the document, reset restores (`fired=1`), `ERROR` moves the washes without a count event, longer/shorter replacements shift survivors to starts `7`/`4`, the length-changing replace-all rewrites once, and `<code>` re-highlights by prop. 48 checks; the live twin waits for the document text after a reset because the count is already restored before the remount commits. |
| Multi-pane editing layouts | todo | yes (probe) | Composition over split panes + editors. **`multi-pane-editor` (plan `376`) mounts two tabbed panes around one live split:** pane A `420`, divider `6`, pane B `426` onward; each pane is a `28` px `userSelect: none` strip over a `372` px `overflowY: "scroll"` viewport holding a `<code showLineNumbers>`. A `-200` wheel pans only pane A, and the code's painted box moves by exactly `-200` while its height is unchanged; a code click bubbles to the viewport, which takes native focus and makes `active=b`. A tab swap paints the other document while pane B keeps its document, and **resets the pane to the top** — the runtime silently clamps a shorter document's offset (`-200 → -168`) and fires **no `onScroll`**, so a per-tab offset needs a post-layout restore. A `+80` divider drag sets `500`, paints pane A `500` and its code `500` (pane B's code `354`), and moves no offset; `End` clamps at `560` and the divider is an AccessKit `Splitter` with `aria-valuetext="560px"`. The two surfaces are `TextInput`s named `Editor A`/`Editor B`. A drag inside one pane copies only that pane; a crossing drag joins both documents and `userSelect: none` keeps the tab chrome out. **`overflowY: "hidden"` still pans with the wheel** — only omitting the axis declaration stops it. Read-only: `<code>` has no editable form. **Live (`live-editor`):** the wheel, click/focus, tab swap and divider drag all hold in a real window. |

## Tier 5 — specialised

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Code editor integration | todo | partial (probe) | **Read-only is supported, editing is not.** `<code>` renders highlighted code; there is **no editable code surface** (verified). `<code>` text is selectable and copies without line numbers (`text-selection`), so a read-only viewer can offer copy today. **Composition (`multi-pane-editor`, plan `376`):** two tabbed `<code>` surfaces inside one pointer-captured split pan, take native focus by click, keep independent offsets of 18 px lines, re-width with the split within 1 px, and select within or across panes while the tab chrome (`userSelect: "none"`) stays out; a document swap resets the offset because the runtime clamps silently and fires no `onScroll`. |
| Syntax highlighting | todo | yes | `<code>` renders syntax-highlighted blocks with bundled languages. API-shape work, not implementation. |
| Diff viewer | todo | yes | **The interactive contract is measured (`diff-surface`, plan `648`) and `live-diff` repeats it in a real window.** A **file header click** emits `toggleFile` with `value = file.path` and the element **never collapses itself** — `collapsedPaths` is the only control; a collapsed file contributes one header and its hunk/lines/pad rows are removed (a two-file fixture 354 → 192 px). `maxLines` is a **global preview cap** on line rows, not per file: it appends a `Show N more lines` row and emits `showMore` with the hidden count as a **string**, and the element does not expand — the consumer raises the cap by the payload (3 → `Show 7 more lines` → 10 restores all rows). A **line click** emits `lineClick` with `value` = the line text and `oldLine`/`newLine` (a deleted line has no new number; an added line has no old one); hunk headers and file headers are not line clicks. `wordDiff` paints word washes and moves no text or geometry, so it stays **screenshot evidence** (no pixel readback). `scroll` uses a native list with 1024 px overdraw and **keeps the reader's anchor across a patch rebuild** — a keyed remount loses it, which is the measured reverse proof. An empty patch paints a bounded `No changes` state. **Limits:** rows are internal GPUI elements with **no `testId`**, so a header/line is reachable only by coordinate geometry (36 px header, 28 px hunk, 21 px line, measured against the default theme); there is no comment gutter, no per-file fold and no exposed scroll-anchor verb (painted text is the live evidence). Paint and copy were already measured by `native-surfaces`/`text-selection`; a real component is still to be built. |
| Rich-text editing | todo | partial (probe) | **Rendering is provided and measured** — `<markdown>` paints GFM (heading, emphasis, inline code, list, bordered table, fenced code with highlighting) as addressable text; a crossing drag copies it; a coordinate click on a link fires `onLinkClick` with the URL; children are retained but unpainted; `role="article"` is one named AccessKit region (internal headings/table are not nodes). Runtime: `markdown-surface`. **Live (`live-markdown`, plan `577`):** the same blocks paint in a real window, a real drag across the boundary selects the document, a real coordinate click fires `onLinkClick` and prose fires nothing, and React children stay out of the paint. The article role stays headless (no live a11y dump). **Editing** is not provided: no editable rich-text surface, and the internal block runs are not exposed as elements. A rich-text editor needs a separate model and `<input>`/`<textarea>` only, or is out of scope. |
| Image preview | todo | yes | `<img>` loads raster and SVG from path/data URL/http(s). API-shape work, not implementation. Evidence: `native-surfaces` — a valid PNG data URL lays out at its box with no fallback, a missing `src` paints `img: no src`, an undecodable one paints `img: load failed`, and `setImagePixels` through the ref uploaded a bitmap without throwing. No pixel readback, so a corrupt bitmap with a valid MIME is indistinguishable from a decoded one. **Live (`live-content`, plan `577`):** the fallbacks, the valid data URL and a ref-uploaded 2 × 2 bitmap behave the same in a real window; an `<img>` keeps the tracker's 1 px-per-axis loss (`96 × 64` → `94 × 62`) live too. |
| File / folder selection | todo | yes | `GpuixRenderer.promptForPaths` opens the platform picker and resolves with absolute paths or `null` on cancel. **Bounded (`file-upload`, plan `388`):** the suite does **not** call it — the picker is a blocking OS panel and `TestRenderer.promptForPaths` forwards to `cx.prompt_for_paths`, so there is no automation verb; the probe stops at "the zone requested the picker once" and the real call is the app's boundary. |
| Drag and drop | todo | partial (probe) | **Component-owned pointer capture is supported; there is no drag host feature.** Mouse events exist; there is no drag host feature. `drag-targets`: pointer capture keeps moves and the up on the source, **hover is frozen during the drag**, the drag ends in a click on the source, and a drop on an element without `onFileDrop` still fires a click. `drag-autoscroll`: a held drag at a container edge does **not** auto-scroll; the component owns an edge loop (`renderer.scrollTo` on each held move, which keeps the capture), the derived drop index and the click suppression. **Live (`live-drag-targets`/`live-drag-autoscroll`, plan `580`):** the capture, the gesture-ending click and the no-auto-scroll rule hold in a real window; three held bottom-edge moves scroll exactly three 24 px rows (the painted row moves, not only the readout), a top-edge move returns one, and the drop index follows. Hover settles but its position relative to the `up` is re-render dependent live, so the live probe asserts it without an order and the headless freeze stays headless. The reorder contract (`list-reorder`, plan `391`): a pointer gives an insertion **boundary** (`0…count`); the dragged item's removal shifts every later boundary, so dropping from index 0 at boundary 3 lands at **index 2** (the unadjusted rule lands at 3 and fails the unit test and the scenario). The rows paint at their new `index * rowHeight` within 1 px. A click on a handle focuses and activates but does not reorder; a press must travel more than 2 px to commit, and the gesture-ending click must be suppressed by that distance or it counts as a second activation. Escape cancels through the app-level window handler (a press need not focus the handle). Keyboard is parity: Enter/Space lifts, arrows move the clamped boundary, Enter drops through the same rule, Escape cancels, and native focus ends on the moved handle. A `<virtual-list>` reorders **keyed** children in place — no generation-keyed remount — and keeps its anchor (`[0, 0, 240]`). Evidence: 36 headless checks, 19 live, 16 pure tests. **The hierarchical half (`tree-reorder`, plan `392`):** a drop targets a row plus `before`/`after`/`into`, the source is the whole subtree, every moved depth shifts, a drop into its own descendant is refused, a collapsed target opens on drop or after a 500 ms hover, and the virtual anchor survives. |
| Notification centre | todo | yes (composition; probe) | Composition over a bell, a non-modal anchored panel, a virtual list, roving focus and a derived badge. **Measured (`notification-centre`, plan `381`):** a 36 × 36 bell with `Button:Notifications, N unread` opens a 320 × 360 `align="end"` panel (right edge and top within 1 px, `autoFocus` on the panel); 24 px group headers and 60 px notification rows coexist in one `<virtual-list>`; an unread count derived from read flags drives a badge that **unpaints at zero**, read flags survive close/reopen, and opening marks nothing read; Down/Up move an active row, Enter marks it read, Escape returns native focus to the bell, and an outside press dismisses without stealing focus back; clear-all paints an empty state and a later arrival restores the list. **The key measured rule: the list keeps the reader's row across a prepend by itself** (anchor `2 → 3`), so component code must **not** compensate — forcing the pre-insert index moved the reader's row by exactly 60 px (one notification). No toast bridge, no focus trap (the panel is non-modal), and state is app-owned. |
| Multi-step forms | partial (composition; probe) | yes | **The shell is measured (`wizard-flow` + `live-wizard`, plan `386`):** three steps share one draft; only the active step is mounted in `unmount` mode, and a step change **must request native focus** — without it a click leaves focus on `wizard-next` and Enter inside the field leaves it on `wizard-team` (the runtime's fallback is positional, not the step's first field). A rejected Next paints every failing field's own message and focuses the **first invalid** field from the same click handler (`useLayoutEffect` on a request nonce); an edit clears only that field's error. Drafts are app state and survive an unmount; Enter on a field submits the step; the review paints `ada <ada@x> my-w / core` and a submit reports it once. The derived step indicator exposes `ListItem` + `aria-selected` for the current step. **The keep-mounted alternative (`hide`) is measured too:** inactive inputs are retained as `input` nodes but paint nothing, keep no bounds and leave the tab order (the plan-177 recipe), so a step keeps its native editor only if it is never unmounted — and native editor state (caret, undo) is still lost on `unmount`. No async validation, server submit or persisted progress. 70 headless + 11 live checks, 24 model unit tests. |
| Virtualized hierarchical data | todo | yes (probe) | Tree views + `<virtual-list>` — `virtualized-tree` measures the model: flatten, indent by depth, a changing row count, roving focus by index, and the focused row staying painted outside the window. Only the painted window reaches the accessibility tree, so a keyboard-focusable row outside it is invisible to assistive technology (`a11y-tree`). **`tree-reorder` (plan `392`) measures the hierarchical move inside the virtual list:** a subtree move changes every moved depth, the moved row repaints at `parent.y + rowHeight` with a one-step indent, the visible count follows a target that opens, and the anchor survives (`[20,0,240]`). Keyboard arrows choose the gap and Right/Left choose sibling-versus-child. **Live (`live-tree`, plan `559`):** expansion, a real wheel re-window, an exact anchor, click focus and the arrow walk all hold in a real window. |
| Advanced filtering / query builders | todo | yes (composition; probe) | **Measured (`query-builder`, plan `378`):** a rule strip of three native `Select`s per row composes and works — a picker opened from a scrolled `overflowY: "scroll"` strip paints its content and items **past the clip** and commits, so `Select` is a viable rule control; a field change resets the operator/value, incomplete rules are ignored by both `all` and `any`, numeric bounds are exact, and one pure predicate drives a `<virtual-list>` (counts, empty state, anchor and selection reset). Appending a rule needs a post-commit effect to reveal (`scrollIntoView`) and focus it. **Remaining for a component:** nested rule groups, drag reordering, persisted rule sets and an overlay-panel shell. |
| QR code | todo | yes (probe) | **Rendering is measured (`qr-code`, plan `518`); no encoder is implemented or chosen.** A version-1 fixture (`GPUixUI`, 21 × 21, 226 dark modules, Python `qrcode` 7.4.2 EC M) renders three ways from one matrix: (1) a `div` per **dark** module — exact `(index + 4) × module` geometry, token colours (`foreground` on the `background` quiet zone), a real hit target per module, but **one retained host node per dark module**; (2) one sourced `<svg>` — the whole matrix as one path, tinted by the element's `color` (the quiet zone is the container's background); (3) one `<img>` with a percent-encoded SVG data URL — the full-colour path, with a white background rect baked in so the code stays two-colour in both themes. **Cost:** v1 retains `246` nodes as modules versus `21` for either single-node route (`246 − 21 = 226 − 1`); a 33 × 33 version 4 retains `611` versus `21` (`611 − 246 = 591 − 226`), so a module grid scales to tens of thousands of nodes at version 40 — the vector routes are the only sane default for large codes. Light modules have no node at all; switching mode/version remounts cleanly; `role="img"` + `aria-label` expose one `Image` node named for the payload. Scannability is **not** asserted (no decoder, no pixel readback); the screenshot is the visual evidence. |
| File upload | todo | partial (probe) | **The drop, queue and progress contract is measured (`file-upload`, plan `388`); the picker and the transport are the app's.** A drop carries **absolute paths only** — no size, MIME type or mtime — so a row is `size=unknown` until the app stats it, and a project layer maps paths to `DroppedFile`s. **Routing:** a drop goes to the **nearest** handler once — a child without a handler lets the zone's handler run, while a child with its own handler receives the drop alone (a nested drop target must add the file itself). **No trailing click:** unlike an element without a handler (`drag-targets`, plan `162`), a handled zone receives **no** click after a drop, so a click guard is harmful — the first real click opens the picker. **Rows:** a 20/40/100% fill measures 48/96/240 px of a 240 px track exactly; cancel freezes the fill (96 px) and retry resets it to 0; a failed row repaints with the `destructive` border and retries; a duplicate path is refused by identity; a refused extension (`.exe`) adds no row and paints its reason. **Picker:** `promptForPaths` is blocking and has no automation verb, so it is the app's boundary, not a component interaction. Not measured: a real OS drop (the suite simulates one), upload transport/progress from a server, and a live-window drop (the automation protocol has no verb). |
| Video / audio player + waveform | blocked (no media surface; waveform probe only) | unsupported | **Playback is not a component on 0.10.0 — measured (plan `520`).** The closed `ElementType` union and the JSX intrinsics map have twelve tags (`div`, `text`, `img`, `svg`, `canvas`, `input`, `textarea`, `anchored`, `code`, `diff`, `markdown`, `virtual-list`) and none is media; `NativeRenderer` has no transport or audio-device method, and `<canvas>` renders `gpui::Empty`. A player is therefore an app-owned platform integration (its own decoder and clock); the component can only render state the app supplies. **The honest half is measured:** a waveform is 64 bottom-aligned bars at a 7.5 px slot (`left = i × 7.5`, `width 6`, heights from the clip), or **one** `<img>` SVG data URL of the same envelope — the bar route retains **63 more host nodes** than the image route (64 vs 1 per envelope), so a long waveform should use the vector route or window its bars. The seek is a 4 px/s mapping (`480 px ↔ 120 s`) with a clamped time; **the gesture must own the topmost hit target**: pointer moves go to the pressed element (plan `172`), so a press on a bar never scrubs — the working routes are a transparent plane over the envelope, or the plane beneath with `pointerEvents: "none"` on the painted layer (the unguarded plane-under route measured `pos=0`). The plane takes native focus, Home/End/arrows step 1 s (5 s with shift), and `role="slider"` + `aria-valuetext="36s of 120s"` expose one AccessKit `Slider`. Limits: no decode, no audio output, no per-bar hit target in the image route, and no pixel readback (scannability/colour stays screenshot evidence). |
| Crop area | todo | yes (composition; probe) | Draggable handles over `<img>`; crop geometry and constraints are ours. **Measured (`crop-area`, plan `385`):** a 320 × 200 stage whose `<img>` box is the coordinate space — `objectFit: "contain"` and `"cover"` both report `320 × 200` and paint no fallback, and there is no fitted-bitmap rect, load event or natural size, so the app owns the aspect mapping. The dimming mask is **four plain `div`s** covering the exact complement (no custom paint, no `<canvas>`); a 12 px handle keeps every held move and the release, and the gesture ends in a click on the handle. A crop at `x = 0`/`y = 0` renders no left/top mask. The box takes native focus; arrows move it 1 px and `shift`+arrows resize it. **Load-bearing rule:** `pointerEvents: "none"` still delivers the click to the masked element *and* to the plane beneath it (paint order), while `"auto"` delivers it only to the mask — a click-through overlay must guard its handler by mode, because the overlay step is not a hit-test filter. **Live (`live-crop-area`):** the baseline, a paced SE drag (`192 × 120 → 232 × 140`), both mask modes, an arrow move and reset hold in a window. Limits: no pixel readback, no rounded mask (a parent `overflow` does not clip an `<img>`), rectangular selection only (no rotation or aspect lock), and a `Group`/`Button` accessibility model rather than a multi-value slider. |
| Chat (AI conversation) | todo | partial (probe) | **The rendering primitives are measured; the component is plan `207` in `components`.** Behaviour ported from **shadcn/ui's AI Elements `chat`** (credited in `LICENSES/`): a message list in a Message scroller, a composer with attachments, submit/stop, `idle/submitting/streaming/error` states, empty state. Plan `207`. |
| Message (AI message row) | todo | partial (probe) | **The rendering primitives are measured; the component is plan `207` in `components`.** Behaviour ported from **shadcn/ui's AI Elements `message`** (credited): `user`/`assistant`/`system` variants; avatar, content (`<markdown>`), actions (copy/retry/feedback), attachments, reasoning, tool calls, sources, streaming indicator. Plan `207`. |

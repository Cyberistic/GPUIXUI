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
| layout | `layout-flex`, `shell-navigation` | verified |
| text | `text-native` | verified |
| input | `input-edit` | verified |
| focus | `focus-traversal`, `roving-focus` | verified |
| overlay | `overlay-dialog` | verified |
| modal | `modal-focus-trap` | verified |
| floating | `floating-placement` | verified |
| select | `select-choose` | verified |
| combobox | `combobox-filter` | verified |
| tooltip | `tooltip-open` | verified |
| scroll | `scroll-container`, `scroll-into-view` | verified |
| panel | `panel-resize` | verified |
| virtual-list | `virtual-list-window` | verified |
| table | `table-select-sort`, `table-column-resize`, `virtualized-table` | verified |
| tree | `tree-view`, `virtualized-tree` | verified |
| log | `log-viewer` | verified |
| workspace | `workspace-tab-drag`, `workspace-restore` | verified |
| theme | `theme-color-roles`, `theme-type-and-shadow`, `theme-platform` | verified |
| a11y | `a11y-tree` | verified |
| motion | `motion-collapse` | verified |
| content | `native-surfaces` | verified |
| drag | `drag-targets` | verified |
| selection | `text-selection` | verified |
| menu | `context-menu-pointer` | verified |
| components | `primitives-actions`, `primitives-fields`, `primitives-display`, `primitives-choice`, `primitives-entry` | verified |
| search | `search-highlights` | verified |

The suite is **40/40 green here** (exit `0`, `.artifacts/smoke-report.json`).
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
Charts must use `<svg>` or `<img>` + `setImagePixels`. The honest limit: there is
no pixel readback, so a corrupt PNG with a valid MIME type is indistinguishable
from a decoded one by these checks — the screenshot artifact is the only visual
evidence, never an assertion.

`drag-targets` measures the pointer model behind tab dragging, drag and drop and
file upload. What holds: a captured gesture keeps **every move and the up** on
the element that received the press; `onFileDrop` receives the absolute paths
and the window drop point. What surprises: **hover is frozen during the drag**
(the element under the pointer gets no enter/leave until the button is
released), the gesture still ends in a **click on the source** after 170 px of
movement, and a file dropped on an element **without** `onFileDrop` produces no
drop but still a **click**. A drag-and-drop component must hit-test the pointer
itself and swallow the gesture-ending click.

`text-selection` is the runtime verdict for copy in the log viewer, code block
and diff. It selects across `<text>` nodes (joined with newlines in document
order), confirms `<code>` and `<diff>` copy only their line text — line numbers,
gutters, markers and file/hunk headers are `chrome_text` and excluded — and
measures `userSelect: "none"`: a selection that **crosses** it skips it, but a
drag **anchored** inside it selects nothing at all, so a gutter must not be the
start of a selection. `clearSelection` and a plain click both leave it empty.

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
| Native theme gallery | done | yes | `apps/playground` — palette switch in the shell, 47 labelled swatches, every type role, the focus ring and an elevation shadow; `theme-color-roles`, `theme-type-and-shadow` (plan `150`), plus the platform type-style cycle `theme-platform` (plan `170`). |

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
  Rating.
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
| Text / typography | wip | yes | [text](packages/primitives/docs/text.mdx) · typography | **Runtime (041):** paints its string, and its box height is the role's line height. `textStyle` in `core/style.ts` covered by `style.test.ts`. Accepts `testId` (043), like every other primitive. |
| Icons | wip | yes | [icon](packages/icons/docs/icon.mdx) · icons | **Runtime (041):** the raw `<svg source>` paints at 20×20 (`lg`) / 24×24 (`xl`); a decorative icon is absent from the a11y tree, a labelled one is an `Image`; a red vs blue capture differs byte-wise, so the tint reaches the paint. 18 offline tests. |
| Separators | wip | yes | [separator](packages/primitives/docs/separator.mdx) · layout | **Runtime (041):** one border step across the surface. `ruleStyle` test. |
| Spacers | wip | yes | [spacer](packages/primitives/docs/spacer.mdx) · layout | **Runtime (041):** a filler pushes its sibling to the far edge. `layout.test.ts`. |
| Stack / layout primitives | wip | yes | [stack](packages/primitives/docs/stack.mdx) · [grid](packages/primitives/docs/grid.mdx) · layout | **Runtime (041):** row and column gaps equal the theme step. The runtime's grid is **numeric only** (`columns`, `rowHeight`); there is no auto-flow and no named areas. |
| Boxes / containers | wip | yes | [box](packages/primitives/docs/box.mdx) · layout | **Runtime (041):** padding equals the theme's step; density moves height and leaves colour alone. Every primitive merges a caller's `style` last; `Box` is where an app overrides a surface. |
| Scrollable containers | wip | partial | [scroll-area](packages/primitives/docs/scroll-area.mdx) · layout | **Runtime (041/048):** a wheel with `deltaY -100` leaves the offset at `y -100`, and a caller's `onScroll` receives that delta. **No `scrollbarColor`, no `scrollbarWidth`, no fade mask** in 0.10.0, so the thumb is platform-themed and cannot be tinted; there is no absolute offset (`onScrollChange`). |
| Buttons | wip | ours | [button](packages/primitives/docs/button.mdx) · form | **Runtime (041):** a hit-tested click activates once; Enter on key **down**, Space on key **up**, a held key ignored; `disabled` refuses both; `loading` refuses both and announces `Loading`. `@gpuix/react` publishes **no `./button`**, so the keyboard contract is this package's. Variants merged here: Floating action button and Copy button (adabraka `floating_action_button`, `copy_button`). |
| Button groups | wip | yes | [button-group](packages/primitives/docs/button-group.mdx) · form | **Runtime (041/048):** attached children are 0px apart, separated ones the theme's `sm` gap. `role="group"` with `aria-label` from `label`; `attached` rounds and clips the group — it does not reshape each child (no `:first-child`, no child cloning). Variants merged here: Toggle Group (base-gpui `ToggleGroup`) and Segmented control (adabraka `segmented_nav`) — pressed-state variants, not separate rows. |
| Labels | wip | partial | [label](packages/primitives/docs/label.mdx) · form | **Runtime (041):** the visible name is an a11y `Label`; the control's own `label` is the `TextInput`'s name. There is **no `aria-labelledby`**, so `labelledBy(name)` returns the control's `label` prop (045). |
| Text inputs | wip | yes | [input](packages/primitives/docs/input.mdx) · form | **Runtime (041):** runtime keystrokes reach `onChange` with the accumulated text; Enter reaches `onSubmit`; a controlled field reports each edit. The native `<input>` holds its text; `core/state.ts` decides controlled/uncontrolled. **`disabled`** is emulated (plan 025): the host has no `disabled` prop, so the field is read-only, out of the tab order and handler-guarded; AT hears read-only. |
| Text areas | wip | yes | [textarea](packages/primitives/docs/textarea.mdx) · form | **Runtime (041):** height follows `rows` and a newline is accepted; **no `onSubmit`** — with one the runtime turns Enter into a submit and costs the newline (046). `minRows`/`maxRows` are the runtime's own height controls. **`disabled`** is the same read-only + tab-order + handler guard as `Input` (plan 025). |
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

## Tier 2 — composition and feedback

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Cards | todo | ? | `div` + `<text>`. Variant merged here: Expandable card (adabraka `expandable_card`) — see also Collapsible sections. |
| Badges | todo | ? | `div` + `<text>`. |
| Avatars | todo | ? | `<img>` provides the image; the fallback/initials surface is ours. |
| Lists / list items | todo | ? | `div` rows; `<virtual-list>` for long collections. |
| Message scroller | todo | ? | Behaviour ported from **shadcn/ui's Message Scroller** (credited in `LICENSES/`): follows new content while pinned, leaves the reader alone when they scroll up, jump-to-latest with an unread count, streaming rows. `<virtual-list>` + scroll handles; the pin/stream state machine is ours. Plan `206`. |
| Empty states | todo | ? | `div` + `<text>` + Icons. |
| Alerts | todo | ? | `div` + `<text>` + Icons. |
| Inline validation | todo | ? | Variant merged here: Field (base-gpui `FieldRoot/Label/Description/Error/Validity/Item/Control`) — the field wrapper that carries validation state. |
| Toasts / notifications | todo | ? | `AnimatePresence` + `createPortal` + `<anchored>` are published primitives; the toast system is ours. `motion-collapse` measured the exit contract: a leaving child stays mounted until the native exit target settles (`onExitComplete`), and `onMotionComplete` needs `dispatchNativeEvents`. |
| Dialogs | todo | ? | `Dialog` is on `main` but **not in published 0.10.0** (verified). `createPortal` + `div` + `motion` + focus handles. Focus entry, the Tab trap and focus return are measured natively by `modal-focus-trap` (playground plan `155`). |
| Confirmation dialogs | todo | ? | Dialog + a real form/confirmation workflow. |
| Popovers | todo | ? | `FloatingLayer` + `<anchored>` give positioning/occlusion; the Popover API is ours. Focus in/out and “Escape closes only the popover” are measured natively (`modal-focus-trap`). Placement (`floating-placement`): `side`/`sideOffset`/`align="start"` are exact; **`align="center"` is short by half the panel size** and `fit="snap"` clamps without flipping, so a near-bottom popover must choose `side="top"` itself. |
| Dropdown menus | todo | ? | `FloatingLayer` + `<anchored>`; menu semantics, roving focus and type-ahead are ours. Programmatic focus and outside-in dismissal are measured natively (`modal-focus-trap`). **Menus open with `align="center"` must compensate for the half-panel offset, and a near-bottom menu must pick `side="top"`** — `fit="snap"` does not flip (`floating-placement`). |
| Context menus | todo | ? | As Dropdown menus, triggered by a right click. **Measured (`context-menu-pointer`)**: a right click is `onAuxClick` + `isRightClick` — `auxClick` carries **no `button`** and `onClick` never fires for button 2, so guard on `isRightClick`; a child's right click bubbles to the trigger; `<anchored position={pointer}>` is exact, including inside a **scrolled** container (no offset, no clipping — an item below the viewport still paints and activates); outside press and Escape dismiss; `shift-f10` opens and Escape returns focus. One Escape dismisses one layer (`modal-focus-trap`). |
| Command menus | todo | ? | `<input>` + `FloatingLayer` + `<virtual-list>`. |
| Tabs | todo | ? | Roving focus + `div` + `motion` indicator. Variant merged here: Segmented control (adabraka `segmented_nav`) — also see Button groups. |
| Accordions | todo | ? | `div` + `motion` (height). |
| Collapsible sections | todo | ? | `div` + `motion` (height). Variant merged here too: Expandable card (adabraka `expandable_card`). |
| Breadcrumbs | todo | ? | `div` + `<text>`. |
| Pagination | todo | ? | Button groups + `<text>`. |
| Search inputs | todo | ? | `<input>` exists; the search UI is ours. `useTextSearch`/`findRanges` search rendered text, not an input. **Measured (`search-highlights`, plan `171`):** the hook counts through `onHighlight`, `next` moves the active match, and a nested `highlight` replaces the ancestor's; the input, debounce and empty state remain the component's. |
| Comboboxes | todo | yes | `Combobox` + parts published and measured natively (`combobox-filter`): typing filters, Enter commits the auto-highlighted row, the empty state mounts, Escape closes. `ComboboxList` filters only when its child is a function. API-shape work, not implementation. Variant merged here: Autocomplete (base-gpui `AutocompleteRoot`/`AutocompleteValue`) — the free-text variant; see also Search inputs. |
| Date / time pickers | todo | ? | `div` + `<text>` + keyboard grid; no date host element. |
| Fieldset | todo | ? | Form grouping (`FieldsetRoot`/`Legend` in base-gpui). `div` + `<text>`. |
| Form | todo | ? | Validation orchestration and submit lifecycle (base-gpui `Form`). No host element; Effect-based validation lives in the package, not the renderer. |
| Navigation Menu | todo | ? | 13-part nav whose items open content panels; distinct from Dropdown menus. `FloatingLayer` + `<anchored>`. |
| Preview Card | todo | ? | Hover-triggered rich card with a positioner (base-gpui, 8 parts). `FloatingLayer` + `<anchored>`. |
| Drawer | todo | ? | Edge-anchored panel with swipe-to-dismiss and nesting. `Dialog` is main-only in 0.10.0; `div` + `motion` (width/left/opacity) + `createPortal`. |
| Stepper | todo | ? | Multi-step progress indicator (adabraka `StepItem`/`StepStatus`). `div` + `<text>`. |
| Timeline | todo | ? | Event timeline with connector styles. `div` + `<text>`. |
| Color picker | todo | ? | HSL/RGB/HEX + alpha + swatches. **Limitation (measured):** the saturation/value square needs radial or multi-stop gradients, which GPUix does not support (two-stop linear only), and **`<canvas>` renders `gpui::Empty`** (`native-surfaces`). Alternative: a discrete swatch grid or a pre-rendered bitmap uploaded through `<img>` + `setImagePixels`. |
| Tag / token input | todo | ? | `<input>` + chip `div`s; the token keyboard contract is ours. |
| Mention input | todo | ? | `<input>` + an anchored suggestion list (`FloatingLayer`). |
| Hotkey-recorder input | todo | ? | Captures `KeyEvent` (`key`, `isHeld`, modifiers) on a focused `div`; the accelerator model is ours. |
| Countdown | todo | ? | `div` + `<text>`; the time source is the app's (Effect `Clock`), never a renderer timer. |
| Carousel | todo | ? | `motion` animates width/left/opacity only — **no transform/scale** (verified). Scroll snap is unavailable; discrete stepping is the honest alternative. |
| Inline edit | todo | ? | Swaps `<text>` for `<input>` in place; focus/commit/cancel contract ours. |
| Keyboard shortcuts / keycap display | todo | ? | Keycap `div`s + a categorised shortcut table. No host element. |

## Tier 3 — data presentation

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Tables | todo | ? | No `<table>` element; grid + `div` rows. Keyboard row navigation builds on the `roving-focus` contract. |
| Sortable tables | todo | ? | Grid + keyboard headers. |
| Row selection | todo | ? | `aria-selected` is supported (verified). |
| Column configuration | todo | ? | Grid tracks + a menu. |
| Resizable columns | todo | ? | Pointer events + grid tracks. |
| Filtering controls | todo | ? | `div` + `<input>`. |
| Data toolbars | todo | ? | Toolbars + Button groups. |
| Virtualized lists | todo | yes | `<virtual-list>` published. `scroll-into-view` measures the scroll contract: `focusElement` reveals a row by itself; `scrollToItem`/`scrollIntoView` reach exact anchors; **`getScrollOffset` saturates on a virtual list — persist `getListScrollTop`** (`[itemIndex, offsetInItemPx, viewportHeightPx]`); a scroll does not move focus. API-shape work, not implementation. |
| Virtualized tables | todo | yes (probe) | `virtualized-table`: fixed-height flex rows with fixed-width cells paint inside `<virtual-list>` (~9 of 500), a painted row is hittable and selects, and selection survives scrolling out and back. `onVisibleRange` **lags the painted window by one gesture** — use the painted rows, not the event, as the current window. The AccessKit tree also follows the painted window, so off-window rows are not exposed to assistive technology (`a11y-tree`). |
| Tree views | todo | yes (probe) | `tree-view`: `paddingLeft` indents labels exactly (16px per depth); expand/collapse paints and unpaints the subtree; a clicked row takes native focus and receives arrow keys. `virtualized-tree` adds the virtualized form: 16 px per depth inside `<virtual-list>`, a count change from 8 to 48 rows repaints correctly, and Down/Up move native focus by roving index even for a row outside the window. |
| Expandable rows | todo | ? | `motion` height. |
| Key-value displays | todo | ? | `div` + `<text>`. |
| Property panels | todo | ? | Fieldset + Inline validation + Key-value displays. |
| Statistic / metric cards | todo | ? | Cards + `<text>`. |
| Charts | todo | ? | No chart host element. **`<canvas>` is unsupported** — retained but renders `gpui::Empty`, so no bounds and no children paint (`native-surfaces`). Static charts can be drawn with `<svg>` (painted at its box); live bitmaps use `<img>` + `setImagePixels`, which uploaded without throwing. |

## Tier 4 — desktop workspace

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Resizable split panes | todo | ? | Pointer events + `motion`; `col-resize`/`row-resize` cursors are provided (verified). |
| Panel groups | todo | ? | Composition over split panes. |
| Collapsible sidebars | todo | ? | `motion` width (outer clipping container, not inner reflow) — measured by `motion-collapse` on 0.10.0: exact intermediate widths under the paused clock, inner pane keeps its width. |
| Tabbed panels | todo | ? | Tabs + panels. |
| Detachable / movable tabs | todo | ? | Needs a portal/drag model; no drag host feature. `drag-targets` measured the missing piece: hover is frozen during a captured drag, so the pane under the pointer cannot highlight itself (hit-test from pointer coordinates as `workspace-tab-drag` does); the gesture also ends in a click on the source tab. |
| Docking layouts | todo | ? | Composition over split panes + tabs. |
| Nested panel arrangements | todo | ? | Composition. |
| Workspace layouts | todo | ? | Composition + persistence. **Measured (`workspace-restore`)**: a keyed remount loses the layout; app-owned JSON restores split width, tab lists, active tab and the virtual-list anchor exactly. No renderer storage, and native focus is not restored. |
| Persistent panel state | todo | ? | App-owned serialisation; no renderer storage. The format `workspace-restore` measured: `{ split, tabsA, tabsB, active, anchorIndex, anchorOffset }`, decoded with `Schema` at the boundary; persist `getListScrollTop`'s index/offset (never `getScrollOffset`, which saturates) and apply it with `scrollToItem(listId, index, offset)` on mount. |
| Keyboard navigation | todo | ? | Real native focus handles (verified); `roving-focus` measured programmatic focus between passive rows, key delivery after the move, and focus surviving a virtual window scroll. The roving-tabindex model is ours. |
| Command palette | todo | ? | `<input>` + `FloatingLayer` + `<virtual-list>`. Variant merged here: Spotlight (adabraka `spotlight`). |
| Application menus | todo | ? | The macOS menu bar is a renderer API (`README.md` "The macOS menu bar"); cross-platform app menus are ours. |
| Status bars | todo | ? | `div` + `<text>`. |
| Toolbars | todo | ? | `div` + Button groups. |
| Breadcrumb navigation | todo | ? | Breadcrumbs + navigation. |
| Inspector panels | todo | ? | Property panels + panels. |
| Property editors | todo | ? | Fieldset + inputs. |
| File trees | todo | yes (probe) | Tree views + `<virtual-list>` — `virtualized-tree` proves the combination: 328 flattened rows, 16 px per depth inside a virtual row, expand/collapse from 8 to 48 rows, click/arrows with native focus, and focus surviving the window moving away. Hierarchical virtualization itself is ours; an off-window row is invisible to the accessibility tree (`a11y-tree`). |
| Log viewers | todo | yes (probe) | `log-viewer`: `<virtual-list alignment="bottom" followTail>` starts at the tail and re-anchors on appends; `bottom` alone and `top` + `followTail` alone both anchor at the bottom. Scrolling up then appending does **not** snap back, so a follow toggle is app state plus a scroll. `<text>`; text search/highlight hooks exist. Copy is native: `text-selection` selects across text rows and `<code>`/`<diff>` copy excludes chrome, but a drag anchored in a `userSelect: "none"` gutter selects nothing — a text row, not the gutter, must anchor the selection. |
| Terminal surfaces | todo | ? | No terminal host element; **unverified** whether a PTY surface is feasible. |
| Search and replace | todo | ? | `useTextSearch`/`findRanges` highlight rendered text; the replace UI is ours. **Measured (`search-highlights`, plan `171`):** washes paint in window coordinates, a soft wrap paints one box per row, a surrogate-split range is refused, `<code>` is searched by `query` (not `ranges`), and a virtual row's `matchIndexOffset` numbers matches document-wide. The wash colour is not reported, so `color`/`activeColor` are unasserted. |
| Multi-pane editing layouts | todo | ? | Composition over split panes + editors. |

## Tier 5 — specialised

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Code editor integration | todo | ? | `<code>` renders highlighted code; there is **no editable code surface** (verified). `<code>` text is selectable and copies without line numbers (`text-selection`), so a read-only viewer can offer copy today. |
| Syntax highlighting | todo | yes | `<code>` renders syntax-highlighted blocks with bundled languages. API-shape work, not implementation. |
| Diff viewer | todo | yes | `<diff>` renders a unified diff. API-shape work, not implementation. Evidence: `native-surfaces` — the file header, hunk header and changed lines all reach the paint log, and the surface is painted at its declared width. `text-selection` — a drag across the diff copies only line text (no header, hunk, gutter or marker). |
| Rich-text editing | todo | ? | `<markdown>` renders markdown; editing is not provided (verified). Its text is selectable and copyable (`text-selection` covers the shared selection path). |
| Image preview | todo | yes | `<img>` loads raster and SVG from path/data URL/http(s). API-shape work, not implementation. Evidence: `native-surfaces` — a valid PNG data URL lays out at its box with no fallback, a missing `src` paints `img: no src`, an undecodable one paints `img: load failed`, and `setImagePixels` through the ref uploaded a bitmap without throwing. No pixel readback, so a corrupt bitmap with a valid MIME is indistinguishable from a decoded one. |
| File / folder selection | todo | yes | `GpuixRenderer.promptForPaths` opens the platform picker. API-shape work, not implementation. |
| Drag and drop | todo | ? | Mouse events exist; there is no drag host feature. `drag-targets`: pointer capture keeps moves and the up on the source, **hover is frozen during the drag**, the drag ends in a click on the source, and a drop on an element without `onFileDrop` still fires a click. The component owns hit-testing, the drop indicator and the click suppression. |
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

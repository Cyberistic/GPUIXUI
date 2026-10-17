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
| focus | `focus-traversal` | verified |
| overlay | `overlay-dialog` | verified |
| modal | `modal-focus-trap` | verified |
| floating | `floating-placement` | verified |
| scroll | `scroll-container` | verified |
| panel | `panel-resize` | verified |
| virtual-list | `virtual-list-window` | verified |
| table | `table-select-sort`, `table-column-resize`, `virtualized-table` | verified |
| tree | `tree-view` | verified |
| log | `log-viewer` | verified |
| workspace | `workspace-tab-drag` | verified |
| theme | `theme-color-roles`, `theme-type-and-shadow` | verified |
| motion | `motion-collapse` | verified |

The suite is **21/21 green here** (exit `0`, `.artifacts/smoke-report.json`).
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

Two further sources are recorded and are **never** the basis for a `done` row:
`verified 0.5.1` (the published 0.5.1 binding, the last `darwin-x64` release,
run by `apps/playground/legacy-probe`; ADR 0002) and `docs` (the upstream
README/types document it, but no run has confirmed it here).

## Design system

| Capability | Status | GPUix support | Notes / limitations |
| ---------- | ------ | ------------- | ------------------- |
| Design tokens | done | yes (inline style values) | 47 semantic roles, 10 type roles, spacing/radii/density/elevation; light + dark. `theme-color-roles` proves every role paints its exact value in dark, light and high contrast, and that the palette switch re-paints; `theme-type-and-shadow` proves every type role, `focusRing` and `elevationShadow` reach the renderer. |
| Theme extension | done | yes (theme switch is a re-render) | `createTheme` / `extendTheme` / `ThemeProvider`; docs in `docs/tokens.md`. The gallery mounts through `ThemeProvider` and the switch re-renders the subtree natively. |
| High-contrast theme | done | yes (values in a `Theme`) | AAA text floors (7:1) and 4.5:1 boundaries; same 47 roles; `getTheme(mode, "high")`; `theme-color-roles` asserts all 47 roles in high contrast and that its colour set differs from dark and light. Docs in `docs/tokens.md`. |
| Status tones | done | yes (values in a `Theme`) | `info` plus soft `info`/`success`/`warning`/`destructive` pairs with readable foregrounds; `statusTone(theme, tone)` and `alpha(color, amount)`; the contrast test holds soft text to 7:1 in all four colour sets. The soft roles are covered by `theme-color-roles`. |
| Focus state | done | yes (a zero-blur spread `boxShadow`) | `focusRing(theme)` returns `{ boxShadow }` with zero offset, zero blur and `spreadRadius = borderWidth.strong`; `theme-type-and-shadow` asserts that ring reaches the runtime, and `focus-traversal` the events. GPUix 0.10.0 has no `outline*` and no `focusVisible`, so a mouse press shows the ring. Docs in `docs/tokens.md`. |
| Density, type and spacing scales | done | yes | Pure values with no runtime dependency; consumed by primitives/components as they land, and by the playground shell. |
| Platform type styles | done | yes (values in a `Theme`) | `platformTypes` + `currentPlatform` + `systemMonoFamily` + `platformTheme(base, platform)`; the docs platform toggle renders a real theme, not a docs-only style sheet. 12 guard tests; `theme-type-and-shadow` proves the resolved family and size reach the renderer. |
| Native theme gallery | done | yes | `apps/playground` — palette switch in the shell, 47 labelled swatches, every type role, the focus ring and an elevation shadow; `theme-color-roles`, `theme-type-and-shadow` (plan `150`). |

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
| Icons | `<svg>` (tintable monochrome) + `<img>` | **verified** |
| Separators, Spacers, Stack / layout primitives, Boxes / containers | `div` + flexbox / grid | **verified** |
| Scrollable containers | `overflow: "scroll"` | **verified** |
| Text inputs / Text areas | `<input>`, `<textarea>` | **verified** |
| Selects | `Select` + parts | **verified** |
| Comboboxes | `Combobox` + parts | **verified** |
| Tooltips | `Tooltip` + parts | **verified** |
| Virtualized lists | `<virtual-list>` | **verified** |
| Syntax highlighting | `<code>` (bundled languages) | **verified** |
| Diff viewer | `<diff>` (unified) | **verified** |
| Image preview | `<img>` (path, data URL, http(s)) | **verified** |
| File / folder selection | `GpuixRenderer.promptForPaths` | **verified** |

**Primitives only — still needs implementation:** Popovers / Dropdown menus /
Context menus (`floating`'s `FloatingLayer` + `<anchored>` give positioning and
occlusion, not menu semantics); Toasts / notifications (`AnimatePresence` +
`createPortal` + `<anchored>`); Buttons and Dialogs (**present on
`references/gpuix` `main`, absent from published 0.10.0** — no `./button` or
`./dialog` subpath and no `Button` / `Dialog` in `dist/index.d.ts`); `<canvas>`
custom drawing (**unverified** — the README's Supported Elements table marks it
"Custom drawing (planned)").

**Cross-cutting, verified, partial:** AccessKit `role`, `aria-label`,
`aria-description`, `aria-id`, `aria-expanded`, `aria-selected`,
`aria-valuetext`, `aria-level`; native `tabIndex` / `autoFocus` and renderer
`focusElement` / `focusNext` / `focusPrevious` / `focusNextWithin`. There is **no**
`aria-checked`, `aria-valuenow`, `aria-labelledby` or `aria-describedby`.

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

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Text / typography | todo | yes | `<text>` host element. API-shape work, not implementation. |
| Icons | todo | yes | `<svg>` (tintable monochrome) + `<img>` provided. The icon *set* and sizing rules are ours. API-shape work, not implementation. |
| Separators | todo | yes | `div` + border. API-shape work, not implementation. |
| Spacers | todo | yes | `div`. API-shape work, not implementation. |
| Stack / layout primitives | todo | yes | flexbox + grid provided. API-shape work, not implementation. |
| Boxes / containers | todo | yes | `div`. API-shape work, not implementation. |
| Scrollable containers | todo | yes | `overflow: "scroll"` gives a native scroll container. API-shape work, not implementation. |
| Buttons | todo | ? | `Button` is on `references/gpuix` `main` but **not in published 0.10.0** (verified). Our own keyboard contract is required — plan `030` §3.4. Variants merged here: Floating action button and Copy button (adabraka `floating_action_button`, `copy_button`). |
| Button groups | todo | ? | Variants merged here: Toggle Group (base-gpui `ToggleGroup`) and Segmented control (adabraka `segmented_nav`) — pressed-state variants, not separate rows. |
| Labels | todo | ? | `<text>` exists; control association needs `aria-labelledby`, which GPUix does not expose (verified). |
| Text inputs | todo | yes | `<input>` host element. API-shape work, not implementation. |
| Text areas | todo | yes | `<textarea>` host element. API-shape work, not implementation. |
| Checkboxes | todo | ? | No checkbox host element; `aria-checked` is unsupported. Variant merged here: Checkbox Group (base-gpui `CheckboxGroup`). |
| Radio groups | todo | ? | No radio host element; roving-focus keyboard contract is ours. |
| Selects | todo | yes | `Select` + parts published. API-shape work, not implementation. |
| Switches | todo | ? | Distinct from Toggle (on/off state vs momentary pressed mode). |
| Progress | todo | ? | `div` + width/opacity `motion`. |
| Tooltips | todo | yes | `Tooltip` + parts published. API-shape work, not implementation. Placement facts are the shared `floating` probe: `align="center"` is off by half the panel, `fit=snap` does not flip. |
| Skeletons | todo | ? | `div` + opacity `motion` (GPUix animates opacity only — verified). |
| Loading indicators | todo | ? | **No rotation** in `motion` (verified); use an indeterminate sweep (width/left) or a discrete step cycle. |
| Slider | todo | ? | No slider host element or React export (verified). Track / thumb / indicator from `div`; pointer + keyboard behaviour ours. |
| Range slider | todo | ? | Two-thumb variant of Slider; its own runtime for min/max ordering and thumb crossing. No host element. |
| Meter | todo | ? | Distinct from Progress: a value in a range, not task completion. No host element. |
| Number Field | todo | ? | `<input>` exists (API-shape for the text part); stepper buttons, drag-to-scrub, clamping and locale formatting are ours. |
| OTP Field | todo | ? | `<input>` exists; segmented rendering, paste distribution and keyboard movement are ours. |
| Toggle | todo | ? | Momentary pressed mode, distinct from Switches. No `Button` in published 0.10.0; built on `div` + the shared keyboard contract. |
| Rating | todo | ? | Radio-group-like input; no host element. Reuses the radio roving-focus contract. |

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
| Context menus | todo | ? | As Dropdown menus, triggered by `onAuxClick` / right-click position. One Escape dismisses one layer (measured: `modal-focus-trap`). The panel is positioned at the pointer with an explicit `position`, so the `align="center"` defect does not apply; the window-edge snap still does (`floating-placement`). |
| Command menus | todo | ? | `<input>` + `FloatingLayer` + `<virtual-list>`. |
| Tabs | todo | ? | Roving focus + `div` + `motion` indicator. Variant merged here: Segmented control (adabraka `segmented_nav`) — also see Button groups. |
| Accordions | todo | ? | `div` + `motion` (height). |
| Collapsible sections | todo | ? | `div` + `motion` (height). Variant merged here too: Expandable card (adabraka `expandable_card`). |
| Breadcrumbs | todo | ? | `div` + `<text>`. |
| Pagination | todo | ? | Button groups + `<text>`. |
| Search inputs | todo | ? | `<input>` exists; the search UI is ours. `useTextSearch`/`findRanges` search rendered text, not an input. |
| Comboboxes | todo | yes | `Combobox` + parts published. API-shape work, not implementation. Variant merged here: Autocomplete (base-gpui `AutocompleteRoot`/`AutocompleteValue`) — the free-text variant; see also Search inputs. |
| Date / time pickers | todo | ? | `div` + `<text>` + keyboard grid; no date host element. |
| Fieldset | todo | ? | Form grouping (`FieldsetRoot`/`Legend` in base-gpui). `div` + `<text>`. |
| Form | todo | ? | Validation orchestration and submit lifecycle (base-gpui `Form`). No host element; Effect-based validation lives in the package, not the renderer. |
| Navigation Menu | todo | ? | 13-part nav whose items open content panels; distinct from Dropdown menus. `FloatingLayer` + `<anchored>`. |
| Preview Card | todo | ? | Hover-triggered rich card with a positioner (base-gpui, 8 parts). `FloatingLayer` + `<anchored>`. |
| Drawer | todo | ? | Edge-anchored panel with swipe-to-dismiss and nesting. `Dialog` is main-only in 0.10.0; `div` + `motion` (width/left/opacity) + `createPortal`. |
| Stepper | todo | ? | Multi-step progress indicator (adabraka `StepItem`/`StepStatus`). `div` + `<text>`. |
| Timeline | todo | ? | Event timeline with connector styles. `div` + `<text>`. |
| Color picker | todo | ? | HSL/RGB/HEX + alpha + swatches. **Limitation (unverified for GPUix):** the saturation/value square needs radial or multi-stop gradients, which GPUix does not support (two-stop linear only — verified). Alternative: a discrete swatch grid or a pre-rendered bitmap. |
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
| Tables | todo | ? | No `<table>` element; grid + `div` rows. |
| Sortable tables | todo | ? | Grid + keyboard headers. |
| Row selection | todo | ? | `aria-selected` is supported (verified). |
| Column configuration | todo | ? | Grid tracks + a menu. |
| Resizable columns | todo | ? | Pointer events + grid tracks. |
| Filtering controls | todo | ? | `div` + `<input>`. |
| Data toolbars | todo | ? | Toolbars + Button groups. |
| Virtualized lists | todo | yes | `<virtual-list>` published (visible-range and scroll-anchor APIs). API-shape work, not implementation. |
| Virtualized tables | todo | yes (probe) | `virtualized-table`: fixed-height flex rows with fixed-width cells paint inside `<virtual-list>` (~9 of 500), a painted row is hittable and selects, and selection survives scrolling out and back. `onVisibleRange` **lags the painted window by one gesture** — use the painted rows, not the event, as the current window. |
| Tree views | todo | yes (probe) | `tree-view`: `paddingLeft` indents labels exactly (16px per depth); expand/collapse paints and unpaints the subtree; a clicked row takes native focus and receives arrow keys. GPUix cannot move native focus from component code, so a roving-tabindex contract is still ours. |
| Expandable rows | todo | ? | `motion` height. |
| Key-value displays | todo | ? | `div` + `<text>`. |
| Property panels | todo | ? | Fieldset + Inline validation + Key-value displays. |
| Statistic / metric cards | todo | ? | Cards + `<text>`. |
| Charts | todo | ? | No chart host element. `<svg>` can render static charts; `<canvas>` is "planned" (unverified). |

## Tier 4 — desktop workspace

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Resizable split panes | todo | ? | Pointer events + `motion`; `col-resize`/`row-resize` cursors are provided (verified). |
| Panel groups | todo | ? | Composition over split panes. |
| Collapsible sidebars | todo | ? | `motion` width (outer clipping container, not inner reflow) — measured by `motion-collapse` on 0.10.0: exact intermediate widths under the paused clock, inner pane keeps its width. |
| Tabbed panels | todo | ? | Tabs + panels. |
| Detachable / movable tabs | todo | ? | Needs a portal/drag model; no drag host feature. |
| Docking layouts | todo | ? | Composition over split panes + tabs. |
| Nested panel arrangements | todo | ? | Composition. |
| Workspace layouts | todo | ? | Composition + persistence. |
| Persistent panel state | todo | ? | App-owned serialisation; no renderer storage. |
| Keyboard navigation | todo | ? | Real native focus handles (verified); the roving-focus model is ours. |
| Command palette | todo | ? | `<input>` + `FloatingLayer` + `<virtual-list>`. Variant merged here: Spotlight (adabraka `spotlight`). |
| Application menus | todo | ? | The macOS menu bar is a renderer API (`README.md` "The macOS menu bar"); cross-platform app menus are ours. |
| Status bars | todo | ? | `div` + `<text>`. |
| Toolbars | todo | ? | `div` + Button groups. |
| Breadcrumb navigation | todo | ? | Breadcrumbs + navigation. |
| Inspector panels | todo | ? | Property panels + panels. |
| Property editors | todo | ? | Fieldset + inputs. |
| File trees | todo | ? | Tree views (verified) + `<virtual-list>`; hierarchical virtualization is ours. |
| Log viewers | todo | yes (probe) | `log-viewer`: `<virtual-list alignment="bottom" followTail>` starts at the tail and re-anchors on appends; `bottom` alone and `top` + `followTail` alone both anchor at the bottom. Scrolling up then appending does **not** snap back, so a follow toggle is app state plus a scroll. `<text>`; text search/highlight hooks exist. |
| Terminal surfaces | todo | ? | No terminal host element; **unverified** whether a PTY surface is feasible. |
| Search and replace | todo | ? | `useTextSearch`/`findRanges` highlight rendered text; the replace UI is ours. |
| Multi-pane editing layouts | todo | ? | Composition over split panes + editors. |

## Tier 5 — specialised

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Code editor integration | todo | ? | `<code>` renders highlighted code; there is **no editable code surface** (verified). |
| Syntax highlighting | todo | yes | `<code>` renders syntax-highlighted blocks with bundled languages. API-shape work, not implementation. |
| Diff viewer | todo | yes | `<diff>` renders a unified diff. API-shape work, not implementation. |
| Rich-text editing | todo | ? | `<markdown>` renders markdown; editing is not provided (verified). |
| Image preview | todo | yes | `<img>` loads raster and SVG from path/data URL/http(s). API-shape work, not implementation. |
| File / folder selection | todo | yes | `GpuixRenderer.promptForPaths` opens the platform picker. API-shape work, not implementation. |
| Drag and drop | todo | ? | Mouse events exist; there is no drag host feature. `onFileDrop` handles file drops only. |
| Notification centre | todo | ? | Composition over toasts + panels. |
| Multi-step forms | todo | ? | Variant merged here: Form (adabraka `form`) — partial coverage; validation orchestration is the Tier 2 Form row. |
| Virtualized hierarchical data | todo | ? | Tree views + `<virtual-list>`; hierarchical virtualization is ours. |
| Advanced filtering / query builders | todo | ? | Composition over inputs + menus. |
| QR code | todo | ? | Render the matrix as a grid of `div`s or one `<svg>`; both are provided. The encoder is ours (dependency not yet chosen). |
| File upload | todo | ? | Picker provided (`promptForPaths`); the drop surface, progress and validation are ours. `onFileDrop` exists. |
| Video / audio player + waveform | todo | ? | **No media host element** (verified: not in `ElementType`). Playback needs a platform surface — **unverified**; a waveform can only be drawn via `<svg>` or the planned `<canvas>`. |
| Crop area | todo | ? | Draggable handles over `<img>`; crop geometry and constraints are ours. No custom-paint requirement unless the mask is drawn — **unverified**. |
| Chat (AI conversation) | todo | ? | Behaviour ported from **shadcn/ui's AI Elements `chat`** (credited in `LICENSES/`): a message list in a Message scroller, a composer with attachments, submit/stop, `idle/submitting/streaming/error` states, empty state. Plan `207`. |
| Message (AI message row) | todo | ? | Behaviour ported from **shadcn/ui's AI Elements `message`** (credited): `user`/`assistant`/`system` variants; avatar, content (`<markdown>`), actions (copy/retry/feedback), attachments, reasoning, tool calls, sources, streaming indicator. Plan `207`. |

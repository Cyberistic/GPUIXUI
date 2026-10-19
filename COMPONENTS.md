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

The suite is **20/20 green here** (exit `0`, `.artifacts/smoke-report.json`).
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

Two further sources are recorded and are **never** the basis for a `done` row:
`verified 0.5.1` (the published 0.5.1 binding, the last `darwin-x64` release,
run by `apps/playground/legacy-probe`; ADR 0002) and `docs` (the upstream
README/types document it, but no run has confirmed it here).

## Design system

| Capability | Status | GPUix support | Notes / limitations |
| ---------- | ------ | ------------- | ------------------- |
| Design tokens | done | yes (inline style values) | 47 semantic roles, 10 type roles, spacing/radii/density/elevation; light + dark; `colorRoles` indexes the roles for generated doc tables. `theme-color-roles` proves every role paints its exact value in dark, light and high contrast, and that the palette switch re-paints; `theme-type-and-shadow` proves every type role, `focusRing` and `elevationShadow` reach the renderer. |
| Theme extension | done | yes (theme switch is a re-render) | `createTheme` / `extendTheme` / `ThemeProvider`; docs in `docs/tokens.md`. The gallery mounts through `ThemeProvider` and the switch re-renders the subtree natively. |
| High-contrast theme | done | yes (values in a `Theme`) | AAA text floors (7:1) and 4.5:1 boundaries; same 47 roles; `getTheme(mode, "high")`; `theme-color-roles` asserts all 47 roles in high contrast and that its colour set differs from dark and light. Docs in `docs/tokens.md`; Theming renders all 47 values from both high-contrast palettes and indexes them (plan 586). **Runtime (055):** Tier 1 paints only the high-contrast palette in both modes, and a switch from high-contrast light to dark repaints the mounted tree. |
| Status tones | done | yes (values in a `Theme`) | `info` plus soft `info`/`success`/`warning`/`destructive` pairs with readable foregrounds; `statusTone(theme, tone)` and `alpha(color, amount)`; the contrast test holds soft text to 7:1 in all four colour sets. The soft roles are covered by `theme-color-roles`. |
| Focus state | done | yes (a zero-blur spread `boxShadow`) | `focusRing(theme)` returns `{ boxShadow }` with zero offset, zero blur and `spreadRadius = borderWidth.strong`; `theme-type-and-shadow` asserts that ring reaches the runtime, and `focus-traversal` the events. GPUix 0.10.0 has no `outline*` and no `focusVisible`, so a mouse press shows the ring. Docs in `docs/tokens.md`. |
| Density, type and spacing scales | done | yes | Pure values with no runtime dependency; consumed by primitives/components as they land, and by the playground shell. **Runtime (055):** a control's painted height follows the active density preset, colours stay the theme's, and selection boxes remain icon-sized. |
| Platform type styles | done | yes (values in a `Theme`) | `platformTypes` + `currentPlatform` + `systemMonoFamily` + `platformTheme(base, platform)`; the docs platform toggle renders a real theme, not a docs-only style sheet. Theming's `<PlatformStyles />` derives what each shipped style changes from the two `Theme` values (plan 576), so the page names the real difference and fills in when a style grows. 12 guard tests; `theme-type-and-shadow` proves the resolved family and size reach the renderer. **Runtime (055):** a code role's `fontFamily` changes with `platformTheme`, and switching platform repaints the mounted tree. Native visual check of the sans sentinel is still pending the playground (B1). |
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

| Component | Status | GPUix support | Docs / example | Notes / limitations |
| --------- | ------ | ------------- | -------------- | ------------------- |
| Text / typography | wip | yes | [text](packages/primitives/docs/text.mdx) · [docs](apps/docs/content/docs/components/text.mdx) · typography | **Runtime (041):** paints its string, and its box height is the role's line height. `textStyle` in `core/style.ts` covered by `style.test.ts`. Accepts `testId` (043), like every other primitive. |
| Icons | wip | yes | [icon](packages/icons/docs/icon.mdx) · [docs](apps/docs/content/docs/components/icon.mdx) · icons | **Runtime (041):** the raw `<svg source>` paints at 20×20 (`lg`) / 24×24 (`xl`); a decorative icon is absent from the a11y tree, a labelled one is an `Image`; a red vs blue capture differs byte-wise, so the tint reaches the paint. 18 offline tests. |
| Separators | wip | yes | [separator](packages/primitives/docs/separator.mdx) · [docs](apps/docs/content/docs/components/separator.mdx) · layout | **Runtime (041):** one border step across the surface. `ruleStyle` test. |
| Spacers | wip | yes | [spacer](packages/primitives/docs/spacer.mdx) · [docs](apps/docs/content/docs/components/spacer.mdx) · layout | **Runtime (041):** a filler pushes its sibling to the far edge. `layout.test.ts`. |
| Stack / layout primitives | wip | yes | [stack](packages/primitives/docs/stack.mdx) · [docs](apps/docs/content/docs/components/stack.mdx) · [grid](packages/primitives/docs/grid.mdx) · layout | **Runtime (041):** row and column gaps equal the theme step. The runtime's grid is **numeric only** (`columns`, `rowHeight`); there is no auto-flow and no named areas. |
| Boxes / containers | wip | yes | [box](packages/primitives/docs/box.mdx) · [docs](apps/docs/content/docs/components/box.mdx) · layout | **Runtime (041):** padding equals the theme's step; density moves height and leaves colour alone. Every primitive merges a caller's `style` last; `Box` is where an app overrides a surface. |
| Scrollable containers | wip | partial | [scroll-area](packages/primitives/docs/scroll-area.mdx) · [docs](apps/docs/content/docs/components/scroll-area.mdx) · layout | **Runtime (041/048):** a wheel with `deltaY -100` leaves the offset at `y -100`, and a caller's `onScroll` receives that delta. **No `scrollbarColor`, no `scrollbarWidth`, no fade mask** in 0.10.0, so the thumb is platform-themed and cannot be tinted; there is no absolute offset (`onScrollChange`). |
| Buttons | wip | ours | [button](packages/primitives/docs/button.mdx) · [docs](apps/docs/content/docs/components/button.mdx) · form | **Runtime (041):** a hit-tested click activates once; Enter on key **down**, Space on key **up**, a held key ignored; `disabled` refuses both; `loading` refuses both and announces `Loading`. `@gpuix/react` publishes **no `./button`**, so the keyboard contract is this package's. Variants merged here: Floating action button and Copy button (adabraka `floating_action_button`, `copy_button`). |
| Button groups | wip | yes | [button-group](packages/primitives/docs/button-group.mdx) · [docs](apps/docs/content/docs/components/button-group.mdx) · form | **Runtime (041/048):** attached children are 0px apart, separated ones the theme's `sm` gap. `role="group"` with `aria-label` from `label`; `attached` rounds and clips the group — it does not reshape each child (no `:first-child`, no child cloning). Variants merged here: Toggle Group (base-gpui `ToggleGroup`) and Segmented control (adabraka `segmented_nav`) — pressed-state variants, not separate rows. |
| Labels | wip | partial | [label](packages/primitives/docs/label.mdx) · [docs](apps/docs/content/docs/components/label.mdx) · form | **Runtime (041):** the visible name is an a11y `Label`; the control's own `label` is the `TextInput`'s name. There is **no `aria-labelledby`**, so `labelledBy(name)` returns the control's `label` prop (045). |
| Text inputs | wip | yes | [input](packages/primitives/docs/input.mdx) · [docs](apps/docs/content/docs/components/text-input.mdx) · form | **Runtime (041):** runtime keystrokes reach `onChange` with the accumulated text; Enter reaches `onSubmit`; a controlled field reports each edit. The native `<input>` holds its text; `core/state.ts` decides controlled/uncontrolled. **`disabled`** is emulated (plan 025): the host has no `disabled` prop, so the field is read-only, out of the tab order and handler-guarded; AT hears read-only. |
| Text areas | wip | yes | [textarea](packages/primitives/docs/textarea.mdx) · [docs](apps/docs/content/docs/components/text-area.mdx) · form | **Runtime (041):** height follows `rows` and a newline is accepted; **no `onSubmit`** — with one the runtime turns Enter into a submit and costs the newline (046). `minRows`/`maxRows` are the runtime's own height controls. **`disabled`** is the same read-only + tab-order + handler guard as `Input` (plan 025). |
| Checkboxes | wip | partial | [checkbox](packages/primitives/docs/checkbox.mdx) · [docs](apps/docs/content/docs/components/checkbox.mdx) · selection | **Runtime (041):** click and Space-up toggle, and `aria-valuetext` flips `unchecked → checked`; indeterminate reads `mixed`; AccessKit role is `CheckBox`. **No `aria-checked`.** Variant merged here: Checkbox Group (base-gpui `CheckboxGroup`). |
| Radio groups | wip | partial | [radio-group](packages/primitives/docs/radio-group.mdx) · [docs](apps/docs/content/docs/components/radio-group.mdx) · selection | **Runtime (041/044/048/049):** AccessKit roles are `RadioGroup` and `RadioButton`; arrows move the selection, wrap, and **skip disabled options** (044); Home/End jump to the nearest **enabled** end (048); arrows **move native focus with the selection** and the focused option paints the ring (049); the roving index is derived from the value, so a controlled change moves the tab stop (049); a click on the circle selects. Options are **data**, not compound children (D16). |
| Selects | wip | reuse | [select](packages/primitives/docs/select.mdx) · [docs](apps/docs/content/docs/components/select.mdx) · form | **Runtime (041):** opens, paints its options, commits a clicked option. A thin themed wrapper over `@gpuix/react/select`; open state and dismissal are GPUix's. |
| Switches | wip | partial | [switch](packages/primitives/docs/switch.mdx) · [docs](apps/docs/content/docs/components/switch.mdx) · selection | **Runtime (041/049):** a click toggles; AccessKit role is `Switch` and the value flips `unchecked → checked`. **No `aria-checked`**; Space/Enter toggle. The thumb moves by the track's `justifyContent` because the runtime has no `transform`. `invalid` paints the destructive border and focus paints the selection ring (049). |
| Progress | wip | partial | [progress](packages/primitives/docs/progress.mdx) · [docs](apps/docs/content/docs/components/progress.mdx) · form | **Runtime (041):** `aria-valuetext` is `"42%"`, role is `ProgressIndicator`, the fill tracks the value and clamps outside 0–100. **No `aria-valuenow`.** |
| Tooltips | wip | reuse | [tooltip](packages/primitives/docs/tooltip.mdx) · [docs](apps/docs/content/docs/components/tooltip.mdx) · feedback | **Runtime (041):** opens on hover and on keyboard focus, and its content stays inside the frame it anchors to. A thin wrapper over `@gpuix/react/tooltip`; a mouse-opened tip looks the same as a keyboard-opened one (no `focusVisible`). Placement facts are the shared floating probe: `align="center"` is off by half the panel and `fit="snap"` does not flip. |
| Skeletons | wip | partial | [skeleton](packages/primitives/docs/skeleton.mdx) · [docs](apps/docs/content/docs/components/skeleton.mdx) · feedback | **Runtime (041):** opacity samples take both `1` and `0.6`. Opacity pulse only: the runtime's `motion` animates width/height/opacity/insets/borderRadius and nothing else, so no shimmer sweep. |
| Loading indicators | wip | partial | [spinner](packages/primitives/docs/spinner.mdx) · [docs](apps/docs/content/docs/components/spinner.mdx) · feedback | **Runtime (041):** the lit dot changes index (the accent-coloured dot proves a theme colour reaches the paint) and AccessKit reports role `Status` with its label. `Spinner` **cannot rotate**; a width/left indeterminate sweep is the remaining alternative, and `Progress` with no `value` covers the bar. |
| Slider | wip | ours | [slider](packages/primitives/docs/slider.mdx) · [docs](apps/docs/content/docs/components/slider.mdx) · [value](packages/primitives/examples/value.example.tsx) | **Runtime (053):** a real click at 25% of the track reports `25`; the thumb is centred within 1 px of the value at 0/50/100; arrows/page/Home/End move by step, page, end; a disabled slider refuses pointer and keys and leaves the tab order; the ring lands on the thumb. **No pointer capture** — a drag only tracks while the pointer is over the track. **No `aria-valuenow`/`min`/`max`**; the value rides on `aria-valuetext`. |
| Range slider | wip | ours | [range-slider](packages/primitives/docs/range-slider.mdx) · [docs](apps/docs/content/docs/components/range-slider.mdx) · [value](packages/primitives/examples/value.example.tsx) | **Runtime (053):** a press at 10% moves the start, at 90% the end; native focus follows the grabbed thumb and an arrow moves only that end; a start driven past the end stops on it. Two `role="slider"` thumbs in a named `group`, each announcing its own value text. Ends may touch, never cross. Same pointer-capture and `aria-valuenow` limits as Slider. |
| Meter | wip | yes (a bar, no host element) | [meter](packages/primitives/docs/meter.mdx) · [docs](apps/docs/content/docs/components/meter.mdx) · [value](packages/primitives/examples/value.example.tsx) | **Runtime (053):** AccessKit role `Meter`; the value text is the formatted measurement; the fill's painted width is the measurement's fraction of its own range; Tab never lands on it. Reuses `Progress`'s track/fill. No `aria-valuenow`. |
| Number Field | wip | ours | [number-field](packages/primitives/docs/number-field.mdx) · [docs](apps/docs/content/docs/components/number-field.mdx) · [number-field](packages/primitives/examples/number-field.example.tsx) | **Runtime (054):** real typing reports `12`; `999` against `max=100` reports `100`; arrows step, PageDown pages, a hit-tested spin press steps and refocuses the input; the ring paints on the field's chrome; a disabled field refuses text, keys and presses. The input has **no numeric mode** (no `type`, `min`, `maxLength`), so parsing/clamping/drafts are ours. The spin buttons are `presentation`, not tab stops. `autoFocus` paints no ring on mount (no focus event is dispatched). |
| OTP Field | wip | ours | [otp-field](packages/primitives/docs/otp-field.mdx) · [docs](apps/docs/content/docs/components/otp-field.mdx) · [otp](packages/primitives/examples/otp.example.tsx) | **Runtime (054):** six digits typed one at a time fill six cells and `onComplete` fires once; focus advances with each character and Left moves it back; Backspace in an empty cell clears the previous one, while Backspace on a filled cell deletes exactly one character; AccessKit reports a named `Group` with six named `TextInput`s; `invalid` paints the destructive border on every cell; a disabled field refuses input and leaves the tab order. **No `onPaste`** and no clipboard simulation in the `TestRenderer`, so the multi-character fill is proven only as a pure rule. Arrows/Home/End/Backspace are handled on **key up**: the native editor consumes their key down, so a held arrow does not repeat. |
| Toggle | wip | ours | [toggle](packages/primitives/docs/toggle.mdx) · [docs](apps/docs/content/docs/components/toggle.mdx) · [toggle](packages/primitives/examples/toggle.example.tsx) | **Runtime (054):** a click flips the announced state and repaints the accent fill; Enter down and Space up each activate once; a disabled toggle leaves the tab order; the ring follows focus. **No `aria-pressed`** in 0.10.0 — the state rides on `aria-valuetext`, so a screen reader hears a button with a value. Activation and the ring are this package's (`@gpuix/react` publishes no button). |
| Rating | wip | ours | [rating](packages/primitives/docs/rating.mdx) · [docs](apps/docs/content/docs/components/rating.mdx) · [rating](packages/primitives/examples/rating.example.tsx) | **Runtime (054):** a click on "4 of 5" reports 4; arrows move the checked star **and** native focus, clamping at the ends; Delete clears; filled stars paint `colors.primary` and empty ones `colors.mutedForeground`; Tab enters on the rating and the next Tab leaves it; disabled refuses input. Whole stars only (no clip/transform in 0.10.0); no `aria-checked`, state rides on `aria-valuetext`. |

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

**No row is `done`** until the published-binary run lands. The in-package docs
page and the mounted example exist for every row (plan 047); every Tier 1 row
has an `apps/docs` page with its real source and generated props table (plans
422, 423 and 435). The runtime column is the honest locally-built-binding
result.

## Tier 2 — composition and feedback

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Cards | done | yes | [docs](apps/docs/content/docs/components/card.mdx) · `variant` outline/elevated/plain; 5 native behaviour tests |
| Badges | done | yes | [docs](apps/docs/content/docs/components/badge.mdx) · seven variants (neutral/primary/4 status tones/outline), two sizes sized by type role; 7 native behaviour tests. Not interactive by design; no icon or dismiss slot yet |
| Avatars | done | yes | [docs](apps/docs/content/docs/components/avatar.mdx) · four diameters, deterministic unicode-safe initials fallback (8 logic tests), presence dot; 7 native behaviour tests. No image loading/error state in v1 — a missing file paints nothing and does not restore the initials |
| Alerts | done | yes | [docs](apps/docs/content/docs/components/alert.mdx) · compound parts (`Alert`, `AlertIcon`, `AlertContent`, `AlertTitle`, `AlertDescription`, `AlertDismiss`) over a tone context; four tones from the shared status palette; 11 native behaviour tests (real click, keyboard activation, alert role). Dismiss uses the local button stand-in; live-region announcement not verifiable here |
| Lists / list items | done | yes | [docs](apps/docs/content/docs/components/list.mdx) · `selectionMode` none/single/multiple over a roving tab stop: arrow wrap over disabled rows, real focus (`focusElement`), controlled + uncontrolled; multiple adds plain/Cmd/Ctrl/Shift clicks, Shift+Arrow ranges from an anchor and Cmd/Ctrl+A select-all of enabled rows; type-ahead jumps and cycles by an explicit `ListItem` `textValue`; single/none lists also take `onActivate` (Enter or click, never Space; disabled rows never), with the multiple variant rejecting it at the type level; a caller `onClick` on an enabled row is composed before activation; 37 native behaviour tests. No `aria-multiselectable` in 0.10.0, no href/link role on activation, no drag reorder or virtualisation |
| Empty states | done | yes | [docs](apps/docs/content/docs/components/empty-state.mdx) · title + optional description/action/icon, no surface of its own; 6 native behaviour tests including a real click on the action. Wrap width is a component constant (no measure token) |
| Inline validation | done | partial | [docs](apps/docs/content/docs/components/inline-validation.mdx) · `Field`/`FieldLabel`/`FieldDescription`/`FieldError`/`FieldInput` with schema-message `validate`/`validateAll`; 6 native behaviour tests + validation logic suite, both themes. A disabled input is `readOnly`, leaves the tab order and paints the disabled roles. No `aria-describedby`/`aria-invalid` in 0.10.0; the caller owns the value and when validation runs |
| Toasts / notifications | done | yes | [docs](apps/docs/content/docs/components/toast.mdx) · Effect store (`SubscriptionRef` + `FiberMap`), bounded queue, monotonic ids, auto-dismiss tested with `TestClock`, stale-timer regression; hovering or keyboard focus on either control pauses and the last one leaving resumes with the remaining time; one labelled action (the handler lives in the provider) runs once and dismisses, and a label without a handler draws nothing; 14 native behaviour tests. No `zIndex` (render the viewport last), no progress bar |
| Dialogs | done | partial | [docs](apps/docs/content/docs/components/dialog.mdx) · local overlay over an `anchored` veil at window coordinates (0.10.0 ships no Dialog parts and no portal), caller `ref` composed on the content; 13 native behaviour tests + 5 dismiss-stack logic tests. No `aria-modal`/`aria-labelledby` in 0.10.0 — named through the required `label` |
| Confirmation dialogs | done | partial | [docs](apps/docs/content/docs/components/confirm-dialog.mdx) · Cancel holds initial focus (Enter cancels); confirm never closes the dialog itself, the caller does; `loading` disables both actions and suppresses Escape/backdrop; 5 native behaviour tests. Busy indicator is a `…` glyph until a Spinner exists |
| Popovers | done | partial | [docs](apps/docs/content/docs/components/popover.mdx) · anchored through GPUix's `FloatingLayer`; the runtime snaps but does not flip and its `center` centres on the containing block, so the component flips a snapped surface back off its trigger and maps `align="center"` to a measured `start` offset; Escape restores focus, Tab and outside presses do not; share the dismiss stack with Dialog and a mouse-down re-open guard, caller `ref` composed on the trigger; 12 native behaviour tests, both themes |
| Dropdown menus | done | partial | [docs](apps/docs/content/docs/components/dropdown-menu.mdx) · anchored `FloatingLayer` surface with a shared row/highlight core; keyboard opens (`Enter`/`Space`, `ArrowDown`, `ArrowUp`) land on the first/last enabled row, arrow/Home/End wrap and skip disabled rows, Enter activates and restores focus, checkbox and destructive rows; type-ahead jumps by a case-insensitive 500 ms prefix, cycles on a repeated letter and skips disabled rows; one level of submenus opens by click, hover, `Enter`/`Space` or `ArrowRight`, positions at the row's right edge, keeps arrows and type-ahead inside, runs a pointer-clicked row once, closes one level on `Escape`/`ArrowLeft` and both on an outside press; the root surface flips off its trigger when snapping would cover it and `align="center"` is measured rather than the runtime's containing-block centre; 35 native behaviour tests, both themes. No deeper nesting is tested, submenus only open right and have no `aria-haspopup` in 0.10.0, and the checkbox row uses `aria-selected` instead of `aria-checked` |
| Context menus | done | partial | [docs](apps/docs/content/docs/components/context-menu.mdx) · pointer-positioned `anchored` surface over the shared rows and submenu parts; 17 native behaviour tests (right click opens, lands within 12px of the pointer, select runs once, second right click moves it, `Shift+F10` opens at the trigger's bottom-left with focus in the menu, Escape returns focus, type-ahead jumps to a row, submenus open on `ArrowRight` and close one level on `Escape`/`ArrowLeft`, a pointer-clicked submenu row runs once). 0.10.0 has no `onContextMenu` — `onAuxClick` + `isRightClick`; no `aria-haspopup` and no portal |
| Command menus | done | partial | [docs](apps/docs/content/docs/components/command-menu.mdx) · compound parts (`CommandMenu`, `CommandMenuInput`, `CommandMenuList`, `CommandMenuItem`, `CommandMenuEmpty`) over a dialog-hosted searchable palette composing Dialog and `menu/logic.ts`; default matching is a case-insensitive subsequence (initials match) ranked within each declared group so headings never repeat, with a custom `filter` keeping declaration order; input keeps focus while the highlight moves; 14 native behaviour tests + 12 fuzzy logic tests. Per-group rather than global ranking, no recent-command memory, `aria-activedescendant` unavailable, input is the host element until primitives lands |
| Tabs | done | partial | [docs](apps/docs/content/docs/components/tabs.mdx) · roving tab stop on the selected trigger, arrow wrap skipping disabled tabs, Home/End, automatic and manual activation, and both axes (`orientation` switches Down/Up movement and the row/column layout); caller `ref` and `onBlur` are composed with the internal ones; 14 native behaviour tests, both themes. 0.10.0 has no `aria-orientation`/`aria-controls`, so the panel is named by its value |
| Accordions | done | yes | [docs](apps/docs/content/docs/components/accordion.mdx) · single (with `collapsible`) and multiple modes over a tagged-union state; divider order, disabled sections, glyph indicator; arrows/Home/End move focus between enabled headers (wrapping, without toggling), caller `ref` composed on the header; 13 native behaviour tests + 15 transition tests. No height animation; no `transform` for a rotating chevron |
| Collapsible sections | done | partial | [docs](apps/docs/content/docs/components/collapsible.mdx) · trigger with `aria-expanded`, content unmounts while closed; 4 native behaviour tests. Mounts instantly: 0.10.0's motion needs a numeric height and an auto-height reveal needs a measured first paint |
| Breadcrumbs | done | partial | [docs](apps/docs/content/docs/components/breadcrumb.mdx) · declarative trail with `maxItems` collapsing the middle (first + … + tail), separators follow their item; 5 native behaviour tests + 7 collapse tests. No `aria-current` in 0.10.0, so the current page is text and colour |
| Pagination | done | partial | [docs](apps/docs/content/docs/components/pagination.mdx) · compound parts (`Pagination`, `PaginationPrevious`, `PaginationList`, `PaginationItem`, `PaginationNext`, `PaginationEllipsis`) over a derived window: the root clamps the page and computes the window once, so the caller never repeats the stable-width rule; 10 native behaviour tests + 9 window tests, both themes. Current page uses `aria-selected` because 0.10.0 has no `aria-current`; no page-size control |
| Search inputs | done | yes | [docs](apps/docs/content/docs/components/search-input.mdx) · leading glyph, conditional clear control, Enter submit, Escape clears only when non-empty, controlled/uncontrolled, caller `ref` composed with the internal focus ref; 7 native behaviour tests. No debounce (the consumer's job); the glyph is text until an icon set lands |
| Comboboxes | done | partial | [docs](apps/docs/content/docs/components/combobox.mdx) · compound parts (`Combobox`, `ComboboxTrigger`, `ComboboxContent`, `ComboboxInput`, `ComboboxList`, `ComboboxItem`, `ComboboxEmpty`) wrapping GPUix's headless combobox with our ranked option shape; the popup flips once off a snapping trigger and `align="center"` is measured, single and multiple selection by value, disabled rows, empty state, Escape focus restore, pointer selection/toggling and outside-press dismissal; 17 native behaviour tests + ranking suite, both themes. No async options/create-new, no `aria-activedescendant` |
| Date pickers | done | partial | [docs](apps/docs/content/docs/components/date-picker.mdx) · compound parts (`DatePicker`, `DatePickerTrigger`, `DatePickerContent`, `DatePickerCalendar`) over a month grid (Effect `DateTime`, no `Date`), surfaced through `Popover`; arrow/Home/End/PageUp/PageDown, inclusive `min`/`max` that clamp movement and stop month browsing at the bound, a `clearable` reset to `null`, ISO-day value; 16 native behaviour tests + 18 calendar tests, both themes. Fixed English labels, no adjacent-month days, no time of day (see **Time pickers**), no `aria-current`, no `aria-disabled` (an unavailable day leaves the tab order and is named `, unavailable`) |
| Time pickers | done | yes | [docs](apps/docs/content/docs/components/time-picker.mdx) · compound parts (`TimePicker`, `TimePickerSegment`, `TimePickerSeparator`, `TimePickerClear`); `HH:mm` 24-hour value (`null` = none), two labelled input segments, typed digits clamp per segment (`99` hours → `23`), arrows carry across the hour and wrap at midnight from one clock function, `minuteStep` for arrows only, blur pads both segments, opt-in `clearable` reset; 10 native behaviour tests + 12 logic tests, both themes. A field, not a trigger/popup (no `aria-valuenow` for a spinbutton); fixed 24-hour/no locale, no `aria-disabled` (disabled is `readOnly` + dimmed), no seconds or timezone |
| Message scroller | done | partial | [docs](apps/docs/content/docs/components/message-scroller.mdx) · `MessageScroller`, `MessageScrollerViewport`, `MessageScrollerItem`, `MessageScrollerJumpToLatest` over a pure pin/unread rule set; follows appended rows and a taller streamed row while pinned, leaves the reader's offset untouched when scrolled up, counts arrivals in the affordance, returns to the end on jump or wheel-down; 10 native behaviour tests + 11 rule tests, both themes. **Every row renders** (`<virtual-list>` takes an item count rather than compound children, so it is not virtualized in v1); the affordance sits beneath the viewport because `position: "absolute"` resolves against the mount parent; no resize observer and no `aria-live` in 0.10.0 |
| Fieldset | done | partial | [docs](apps/docs/content/docs/components/fieldset.mdx) · `Fieldset` + `FieldsetLegend` over a `role="group"` named by the legend; `disabled` reaches `FieldInput` (read-only, out of the tab order, disabled roles) and dims only the legend; 7 native behaviour tests. 0.10.0 has no `fieldset` element and no `aria-disabled`, so the group state is not announced; other controls keep their own `disabled` |
| Form | done | partial | [docs](apps/docs/content/docs/components/form.mdx) · `Form` over an owned value: decodes with the caller's schema, shows every `validateAll` message in one `role="alert"` summary, calls `onSubmit` with the decoded value and refuses to submit while `pending`; a render prop hands over `errors`/`pending`/`submit` because the contract fixes Form as one part; 7 native behaviour tests. No field registration, no message-to-field mapping and no re-validation on edit |
| Navigation Menu | done | partial | [docs](apps/docs/content/docs/components/navigation-menu.mdx) · `NavigationMenu`, `NavigationMenuList`, `NavigationMenuItem`, `NavigationMenuTrigger`, `NavigationMenuContent`, `NavigationMenuLink`: one anchored panel at a time, press/Enter/Space/ArrowDown open (ArrowDown focuses the panel), Left/Right/Home/End move between triggers, Escape closes through the shared dismiss stack and returns focus, outside press closes, links run once and close, controlled `value`; 10 native behaviour tests, both themes. No `href` in 0.10.0 (links are buttons with `onSelect`), no hover-open, no `aria-haspopup` |
| Preview Card | done | partial | [docs](apps/docs/content/docs/components/preview-card.mdx) · `PreviewCard`, `PreviewCardTrigger`, `PreviewCardContent` over the anchored layer and the shared dismiss stack: delayed hover open (default 300 ms), immediate keyboard-focus open, pointer travel into the card keeps it open, close after leaving both (default 150 ms), Escape restores focus, outside press closes, press toggles (touch path), `open`/`openDelay`/`closeDelay` controlled; 8 native behaviour tests. Timers are component UI timers; no pointer-type signal (no touch hover), not auto-focused on hover, no anchor arrow or `aria-haspopup` in 0.10.0 |
| Drawer | done | partial | [docs](apps/docs/content/docs/components/drawer.mdx) · `Drawer`, `DrawerTrigger`, `DrawerClose`, `DrawerContent` (left/right/bottom, sm/md/lg), `DrawerHeader`, `DrawerTitle`, `DrawerDescription`, `DrawerFooter` over the shared modal rules in `internal/modal.ts` (extracted from Dialog: open state, dismiss stack, focus in/return, Tab trap); 10 native behaviour tests, both themes. No swipe-to-dismiss (no drag host feature), no slide animation (no transform), no `aria-modal`/`aria-labelledby`, no portal (anchored veil), sizes are layout constants |
| Stepper | done | partial | [docs](apps/docs/content/docs/components/stepper.mdx) · `Stepper` + `StepperStep` over `role="list"`: statuses (`complete`/`current`/`upcoming`) derived from the one `value`, horizontal or vertical, `StateStyle<StepperStepState>`; 8 native behaviour tests. Display-only by design (no step click), no connector line, and `aria-selected` stands in for the missing `aria-current` |
| Timeline | done | partial | [docs](apps/docs/content/docs/components/timeline.mdx) · `Timeline` + `TimelineItem` over `role="list"`: an explicit `complete`/`current`/`upcoming` status (passed, not derived), timestamp/description, a connector after every event but the last, `StateStyle<TimelineItemState>`; 6 native behaviour tests, both themes. Display-only, no `aria-current` (the current event uses `aria-selected`), `last` comes from direct children, one connector style |
| Color picker | done | partial | [docs](apps/docs/content/docs/components/color-picker.mdx) · one `ColorPicker`: a keyboard-reachable swatch grid (defaults are six theme colours), a HEX field that normalises `#abc`/`AABBCC` on commit, a live preview and `StateStyle<ColorPickerState>`; 8 native behaviour tests + 8 hex tests, both themes. **No saturation/value square** — 0.10.0 has two-stop linear gradients only and no radial gradient, so the square is not faked; no alpha/HSL/RGB fields or eyedropper |
| Tag / token input | done | partial | [docs](apps/docs/content/docs/components/tag-input.mdx) · `TagInput` + `TagInputField` + `TagInputChip`: Enter and a typed comma commit through a pure add/remove rule set, duplicates refused unless `allowDuplicates`, `max` caps additions, a chip control removes, controlled-only value, `StateStyle` on both field and chip; 8 native behaviour tests + 10 rule tests, both themes. No Backspace-on-empty (0.10.0 emits no keyDown for Backspace/Delete in the test renderer), no `aria-disabled` (readOnly + dimming), no autocomplete |
| Mention input | done | partial | [docs](apps/docs/content/docs/components/mention-input.mdx) · `MentionInput` + `MentionInputList` + `MentionInputItem`: the text's last `@` token opens a ranked anchored list (prefix matches first, case-insensitive, capped), arrows wrap, Enter (the input's submit event) or a press inserts `@name `, Escape and a no-match query close, both callbacks fire once, `disabled`; 9 native behaviour tests + 12 rule tests, both themes. The query comes from the text, not the caret (no caret API in 0.10.0), a space while the list is open is consumed by the runtime, and `listbox`/`option` roles are dropped from the a11y dump (rows are selected buttons) |
| Hotkey-recorder input | done | partial | [docs](apps/docs/content/docs/components/hotkey-input.mdx) · one `HotkeyRecorder`: click/`Enter`/`Space` listens, a real chord reports the shared accelerator string, Escape cancels, blur cancels, a named clear control unbinds, `disabled` leaves the tab order, `StateStyle<HotkeyRecorderState>`; 8 native behaviour tests + 8 capture tests, both themes. No `preventDefault` in 0.10.0 (a captured system chord still fires), clearing is a control because the test renderer emits no Backspace/Delete, no conflict detection |
| Countdown | done | yes | [docs](apps/docs/content/docs/components/countdown.mdx) · one `Countdown` over `<text>`: `MM:SS` under an hour, uncapped `HH:MM:SS` after, opt-in `Nd ` prefix, floored seconds, negatives clamp to `00:00`, expired renders `mutedForeground`; 5 native behaviour tests + 9 formatting tests, both themes. The component owns **no timer** — the app ticks with Effect `Clock` and passes `remainingMs`; fixed locale-free format, no `role=timer` for live announcement in 0.10.0 |
| Carousel | done | partial | [docs](apps/docs/content/docs/components/carousel.mdx) · `Carousel`, `CarouselTrack`, `CarouselSlide`, `CarouselControl`: discrete stepping with clamped edges, `loop` wrapping, arrow/Home/End keys, controlled/uncontrolled index, slides kept mounted and hidden with `display`, `StateStyle<CarouselSlideState>`; 8 native behaviour tests, both themes. **No slide animation** (motion has no transform) and no swipe; no indicator dots or auto-advance; slides must be the track's direct children |
| Inline edit | done | partial | [docs](apps/docs/content/docs/components/inline-edit.mdx) · one `InlineEdit` that swaps a `role="button"` display for a real `<input>`: Enter or blur commits (once), Escape discards, an unchanged draft calls nothing, empty text is a valid value, controlled/uncontrolled edit state, `StateStyle<InlineEditState>`; 8 native behaviour tests, both themes. No `contenteditable` in 0.10.0 (the swap is explicit); no `aria-invalid`/`aria-describedby`; blur commits by contract |
| Keyboard shortcuts / keycap display | done | yes | [docs](apps/docs/content/docs/components/keycap.mdx) · `KeyboardShortcuts`, `KeyboardShortcutsGroup`, `KeyboardShortcut` and `Keycap` over the shared accelerator model (`mod` adapts to the platform; order preserved; unknown tokens display verbatim); 6 native behaviour tests + 10 accelerator tests, both themes. Display-only by design (a row documents a chord, never binds it); no `aria-keyshortcuts` in 0.10.0; rows are separated by 1px elements because an element has one `borderColor` |

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
| Collapsible sidebars | todo | ? | `motion` width (outer clipping container, not inner reflow). |
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

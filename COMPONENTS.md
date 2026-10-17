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
| High-contrast theme | done | yes (values in a `Theme`) | AAA text floors (7:1) and 4.5:1 boundaries; same 47 roles; `getTheme(mode, "high")`; `theme-color-roles` asserts all 47 roles in high contrast and that its colour set differs from dark and light. Docs in `docs/tokens.md`. **Runtime (055):** Tier 1 paints only the high-contrast palette in both modes, and a switch from high-contrast light to dark repaints the mounted tree. |
| Status tones | done | yes (values in a `Theme`) | `info` plus soft `info`/`success`/`warning`/`destructive` pairs with readable foregrounds; `statusTone(theme, tone)` and `alpha(color, amount)`; the contrast test holds soft text to 7:1 in all four colour sets. The soft roles are covered by `theme-color-roles`. |
| Focus state | done | yes (a zero-blur spread `boxShadow`) | `focusRing(theme)` returns `{ boxShadow }` with zero offset, zero blur and `spreadRadius = borderWidth.strong`; `theme-type-and-shadow` asserts that ring reaches the runtime, and `focus-traversal` the events. GPUix 0.10.0 has no `outline*` and no `focusVisible`, so a mouse press shows the ring. Docs in `docs/tokens.md`. |
| Density, type and spacing scales | done | yes | Pure values with no runtime dependency; consumed by primitives/components as they land, and by the playground shell. **Runtime (055):** a control's painted height follows the active density preset, colours stay the theme's, and selection boxes remain icon-sized. |
| Platform type styles | done | yes (values in a `Theme`) | `platformTypes` + `currentPlatform` + `systemMonoFamily` + `platformTheme(base, platform)`; the docs platform toggle renders a real theme, not a docs-only style sheet. 12 guard tests; `theme-type-and-shadow` proves the resolved family and size reach the renderer. **Runtime (055):** a code role's `fontFamily` changes with `platformTheme`, and switching platform repaints the mounted tree. Native visual check of the sans sentinel is still pending the playground (B1). |
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
| Text / typography | wip | yes | [text](packages/primitives/docs/text.mdx) · typography | **Runtime (041/059):** paints its string, and its box height is the role's line height. `textStyle` in `core/style.ts` covered by `style.test.ts`. Accepts `testId` (043), like every other primitive. **Semantics (059):** `h1`-`h3` are real `Heading` nodes with level 1-3 and the text as their value; `code`/`codeBlock` are `Code`; `display` and the remaining roles keep the runtime's `Label`. |
| Icons | wip | yes | [icon](packages/icons/docs/icon.mdx) · icons | **Runtime (041):** the raw `<svg source>` paints at 20×20 (`lg`) / 24×24 (`xl`); a decorative icon is absent from the a11y tree, a labelled one is an `Image`; a red vs blue capture differs byte-wise, so the tint reaches the paint. 18 offline tests. |
| Separators | wip | yes | [separator](packages/primitives/docs/separator.mdx) · layout | **Runtime (041):** one border step across the surface. `ruleStyle` test. |
| Spacers | wip | yes | [spacer](packages/primitives/docs/spacer.mdx) · layout | **Runtime (041):** a filler pushes its sibling to the far edge. `layout.test.ts`. |
| Stack / layout primitives | wip | yes | [stack](packages/primitives/docs/stack.mdx) · [grid](packages/primitives/docs/grid.mdx) · layout | **Runtime (041):** row and column gaps equal the theme step. The runtime's grid is **numeric only** (`columns`, `rowHeight`); there is no auto-flow and no named areas. |
| Boxes / containers | wip | yes | [box](packages/primitives/docs/box.mdx) · layout | **Runtime (041):** padding equals the theme's step; density moves height and leaves colour alone. Every primitive merges a caller's `style` last; `Box` is where an app overrides a surface. |
| Scrollable containers | wip | partial | [scroll-area](packages/primitives/docs/scroll-area.mdx) · layout | **Runtime (041/048):** a wheel with `deltaY -100` leaves the offset at `y -100`, and a caller's `onScroll` receives that delta. **No `scrollbarColor`, no `scrollbarWidth`, no fade mask** in 0.10.0, so the thumb is platform-themed and cannot be tinted; there is no absolute offset (`onScrollChange`). **Keyboard (072):** the runtime never scrolled a container from the keyboard and focus does not bubble from a child, so a wheel was the only way to move one. A **labelled** area is now a named focusable `region`: arrows move one line (three body lines), page keys one page (viewport − line), Home/End the ends (End relies on the runtime clamping `scrollTo` to the content), and the handler only fires when the region's own id holds focus, so a field inside keeps its arrow keys. An unlabelled area stays an inert container — no silent tab stop. Measured: PageDown/Home/End/one-line/left-right on a real scroller; an `Input` inside does not scroll it. **Limit:** Tab can still land on a control painted outside the region (focus doesn't bubble; `scrollIntoView` did not move a plain scroller in the probe). |
| Buttons | wip | ours | [button](packages/primitives/docs/button.mdx) · form | **Runtime (041):** a hit-tested click activates once; Enter on key **down**, Space on key **up**, a held key ignored; `disabled` refuses both; `loading` refuses both and announces `Loading`. `@gpuix/react` publishes **no `./button`**, so the keyboard contract is this package's. **Name (058):** the runtime does not derive a button name from painted text, so a text-only child list becomes `aria-label` (trimmed); an explicit `label` wins; non-text content stays unnamed rather than inventing a name. Variants merged here: Floating action button (a square primary button) and Copy button (not implementable: 0.10.0 has no clipboard API). |
| Button groups | wip | yes | [button-group](packages/primitives/docs/button-group.mdx) · form | **Runtime (041/048):** attached children are 0px apart, separated ones the theme's `sm` gap. `role="group"` with `aria-label` from `label`; `attached` rounds and clips the group — it does not reshape each child (no `:first-child`, no child cloning). It is **layout only**: a segmented control with selection lives in **Toggle Group** below. |
| Toggle Group | wip | ours | [toggle-group](packages/primitives/docs/toggle-group.mdx) · [toggle-group](packages/primitives/examples/toggle-group.example.tsx) | **Runtime (056):** a click selects in `single` and unpresses the previous item; `multiple` presses independently; Enter down and Space up activate once; an arrow moves focus **and** selection in `single` but only focus in `multiple`; a disabled item is skipped with wrapping and refuses a press; the group is **one tab stop** (`focusNext` lands on the selected item and leaves on the next Tab); a disabled group is skipped and inert. **No `aria-pressed`**: each item announces `"pressed"`/`"not pressed"` through `aria-valuetext`. Options are data (D16/D25), not compound children. The paint is `Toggle`'s `toggleVariants`, so the two cannot drift. |
| Labels | wip | partial | [label](packages/primitives/docs/label.mdx) · form | **Runtime (041):** the visible name is an a11y `Label`; the control's own `label` is the `TextInput`'s name. There is **no `aria-labelledby`**, so `labelledBy(name)` returns the control's `label` prop (045). |
| Text inputs | wip | yes | [input](packages/primitives/docs/input.mdx) · form | **Runtime (041):** runtime keystrokes reach `onChange` with the accumulated text; Enter reaches `onSubmit`; a controlled field reports each edit. The native `<input>` holds its text; `core/state.ts` decides controlled/uncontrolled. **`disabled`** is emulated (plan 025): the host has no `disabled` prop, so the field is read-only, out of the tab order and handler-guarded; AT hears read-only. |
| Text areas | wip | yes | [textarea](packages/primitives/docs/textarea.mdx) · form | **Runtime (041):** height follows `rows` and a newline is accepted; **no `onSubmit`** — with one the runtime turns Enter into a submit and costs the newline (046). `minRows`/`maxRows` are the runtime's own height controls. **`disabled`** is the same read-only + tab-order + handler guard as `Input` (plan 025). |
| Checkboxes | wip | partial | [checkbox](packages/primitives/docs/checkbox.mdx) · [checkbox-group](packages/primitives/docs/checkbox-group.mdx) · selection | **Runtime (041):** click and Space-up toggle, and `aria-valuetext` flips `unchecked → checked`; indeterminate reads `mixed`; AccessKit role is `CheckBox`. **No `aria-checked`.** Variant merged here: **Checkbox Group (plan 065)** — a data-driven `CheckboxGroup` with a row per option (the whole row is the hit area and the tab stop, because there is no `aria-labelledby` for a label beside a box), Tab between rows, Space-up/Enter-down, and an optional select-all parent whose `mixed`/`checked`/`unchecked` state is derived over **enabled** options only and never clears a disabled option's value. Measured: a press on the label column toggles; `focusNext` visits each enabled row and skips a disabled one. |
| Radio groups | wip | partial | [radio-group](packages/primitives/docs/radio-group.mdx) · selection | **Runtime (041/044/048/049/061):** AccessKit roles are `RadioGroup` and `RadioButton`; arrows move the selection, wrap, and **skip disabled options** (044); Home/End jump to the nearest **enabled** end (048); arrows **move native focus with the selection** and the focused option paints the ring (049); the roving index is derived from the value, so a controlled change moves the tab stop (049); a click on the circle selects. **`invalid`** paints the empty circles' border destructive and leaves a chosen one on its accent (061). Options are **data**, not compound children (D16). |
| Selects | wip | reuse | [select](packages/primitives/docs/select.mdx) · form | **Runtime (041/057/062):** opens, paints its options, commits a clicked option. A thin themed wrapper over `@gpuix/react/select`; open state and dismissal are GPUix's. **GPUix sets no ARIA role**, so the wrapper supplies the whole contract: the trigger is a named `combobox` with `expanded` and `value`, the list a named `listbox`, each item a named `option` with `selected` (measured: plan 057 §0). No `aria-haspopup` in the host props. **Width (062):** `minWidth: "100%"` resolved against the anchored layer, so a 108 px and a 900 px trigger both opened a 57 px list; the wrapper now measures the trigger and passes a numeric `minWidth` — the list is ≥ a hugging trigger and matches a `fullWidth` one. **Placement (066):** the runtime's `fit="snap"` clamps without flipping, so a select at the bottom opened its 68 px list at `y 724` over a trigger at `y 740`; the wrapper now estimates the list height from its own styles and opens above when it does not fit below (measured: list bottom ≤ trigger top), never below when there is room, and an explicit `side` wins. **Long lists (068):** 30 options painted a 908 px layer from `y 8` with the last option at `y 888`, outside the window and unreachable; the list is now capped to the free space and scrolls (the wheel reaches the last option), and rows keep their height instead of squashing. **Keyboard (069):** plan 068's "no active-index signal" was wrong — the published `SelectItem` reports `highlighted` to its state children. The wrapper scrolls a newly highlighted option into view (40 Down presses: offset `0 → -455`, "Option 39" inside the list; opening on "Option 49": offset `-755` with the selected row inside; a list that fits does not move). **Groups (075):** `options` also accepts `{ label, options }`; a group paints a caption heading and keeps GPUix's item order flat, so the headings are skipped by the keyboard. An empty group paints nothing; values stay unique across groups. The group is a named `group` a11y node (the runtime has no `aria-labelledby`), the heading height is part of the placement estimate (a two-group list measures its estimated height within 1 px), and Enter/Down/Enter commits the first grouped option. |
| Switches | wip | partial | [switch](packages/primitives/docs/switch.mdx) · selection | **Runtime (041/049):** a click toggles; AccessKit role is `Switch` and the value flips `unchecked → checked`. **No `aria-checked`**; Space/Enter toggle. The thumb moves by the track's `justifyContent` because the runtime has no `transform`. `invalid` paints the destructive border and focus paints the selection ring (049). |
| Progress | wip | partial | [progress](packages/primitives/docs/progress.mdx) · form | **Runtime (041):** `aria-valuetext` is `"42%"`, role is `ProgressIndicator`, the fill tracks the value and clamps outside 0–100. **No `aria-valuenow`.** |
| Tooltips | wip | reuse | [tooltip](packages/primitives/docs/tooltip.mdx) · [info-tip](packages/primitives/docs/info-tip.mdx) · feedback | **Runtime (041/060):** opens on hover and on keyboard focus, and its content stays inside the frame it anchors to. A thin wrapper over `@gpuix/react/tooltip`; a mouse-opened tip looks the same as a keyboard-opened one (no `focusVisible`). **Placement (060):** GPUix's tooltip root stretches on its parent's cross axis, so the tip anchored to the *layout* — edge/centre in a column, below the whole row in a row (measured `x 420` for a trigger at `12..412`, `y 312` in a 300-high row). The wrapper now sets `alignSelf: "flex-start"` and defaults `align` to `start`; `end` is exact, `center` is the runtime's half-panel defect, and `fit="snap"` still clamps without flipping (plan 156). **Placement (067):** the tip also flips below when it does not fit above — measured at the top edge, the tip opened at `y 8..34` over a trigger at `y 12..30`; it now opens below, stays above when there is room, and an explicit `side` wins. **Description (071):** the tip was painted but produced **no accessibility node** — a string tip is now the trigger's `aria-description` (announced on focus while the tip is closed) and the open tip is a named `Tooltip` node; a non-string tip gets no invented name. The trigger still must be focusable **and named** (a bare `tabIndex` div produces no node). **Variant merged here: `InfoTip` (073)** — the info-icon trigger as a component: a named `role="img"` tab stop with a focus ring, a decorative icon and a string `content` that becomes the description. It exists because the hand-rolled shape was duplicated and `examples/basic-app` shipped it as a bare `Box` (hover-only, no a11y node). Measured: hover and `focusNext` open the tip, the `Image` node carries the description, the open tip is a named `Tooltip`, and the painted `boxShadow` equals `focusRing(theme)` (`inset: false` added by the runtime). |
| Skeletons | wip | partial | [skeleton](packages/primitives/docs/skeleton.mdx) · feedback | **Runtime (041):** opacity samples take both `1` and `0.6`. Opacity pulse only: the runtime's `motion` animates width/height/opacity/insets/borderRadius and nothing else, so no shimmer sweep. |
| Loading indicators | wip | partial | [spinner](packages/primitives/docs/spinner.mdx) · feedback | **Runtime (041):** the lit dot changes index (the accent-coloured dot proves a theme colour reaches the paint) and AccessKit reports role `Status` with its label. `Spinner` **cannot rotate**; a width/left indeterminate sweep is the remaining alternative, and `Progress` with no `value` covers the bar. |
| Slider | wip | ours | [slider](packages/primitives/docs/slider.mdx) · [value](packages/primitives/examples/value.example.tsx) | **Runtime (053/063):** a real click at 25% of the track reports `25`; the thumb is centred within 1 px of the value at 0/50/100; arrows/page/Home/End move by step, page, end; a disabled slider refuses pointer and keys and leaves the tab order; the ring lands on the thumb. **Drag (063):** the runtime captures the pressed element, so a drag keeps tracking after the pointer leaves the track and clamps at both ends; only the primary button starts a gesture — a right or middle click is refused. **No `aria-valuenow`/`min`/`max`**; the value rides on `aria-valuetext`. |
| Range slider | wip | ours | [range-slider](packages/primitives/docs/range-slider.mdx) · [value](packages/primitives/examples/value.example.tsx) | **Runtime (053/063):** a press at 10% moves the start, at 90% the end; native focus follows the grabbed thumb and an arrow moves only that end; a start dragged past the end stops on it. Two `role="slider"` thumbs in a named `group`, each announcing its own value text. Ends may touch, never cross. A drag is captured outside the track; a non-primary press moves neither end and takes no focus (063). Same `aria-valuenow` limit as Slider. |
| Meter | wip | yes (a bar, no host element) | [meter](packages/primitives/docs/meter.mdx) · [value](packages/primitives/examples/value.example.tsx) | **Runtime (053):** AccessKit role `Meter`; the value text is the formatted measurement; the fill's painted width is the measurement's fraction of its own range; Tab never lands on it. Reuses `Progress`'s track/fill. No `aria-valuenow`. |
| Number Field | wip | ours | [number-field](packages/primitives/docs/number-field.mdx) · [number-field](packages/primitives/examples/number-field.example.tsx) | **Runtime (054/064):** real typing reports `12`; `999` against `max=100` reports `100`; arrows step, PageDown pages, a hit-tested spin press steps and refocuses the input; the ring paints on the field's chrome, and an `autoFocus` field paints it from mount; a disabled field refuses text, keys and presses. The input has **no numeric mode** (no `type`, `min`, `maxLength`), so parsing/clamping/drafts are ours. The spin buttons are `presentation`, not tab stops. |
| OTP Field | wip | ours | [otp-field](packages/primitives/docs/otp-field.mdx) · [otp](packages/primitives/examples/otp.example.tsx) | **Runtime (054/064):** six digits typed one at a time fill six cells and `onComplete` fires once; focus advances with each character and Left moves it back; the first cell's ring paints from mount with `autoFocus`; Backspace in an empty cell clears the previous one, while Backspace on a filled cell deletes exactly one character; AccessKit reports a named `Group` with six named `TextInput`s; `invalid` paints the destructive border on every cell; a disabled field refuses input and leaves the tab order. **No `onPaste`** and no clipboard simulation in the `TestRenderer`, so the multi-character fill is proven only as a pure rule. Arrows/Home/End/Backspace are handled on **key up**: the native editor consumes their key down, so a held arrow does not repeat. |
| Toggle | wip | ours | [toggle](packages/primitives/docs/toggle.mdx) · [toggle](packages/primitives/examples/toggle.example.tsx) | **Runtime (054):** a click flips the announced state and repaints the accent fill; Enter down and Space up each activate once; a disabled toggle leaves the tab order; the ring follows focus. **No `aria-pressed`** in 0.10.0 — the state rides on `aria-valuetext`, so a screen reader hears a button with a value. Activation, the ring and the name are this package's (`@gpuix/react` publishes no button). **Name (058):** text-only children become `aria-label`; an explicit `label` wins; non-text content stays unnamed. |
| Rating | wip | ours | [rating](packages/primitives/docs/rating.mdx) · [rating](packages/primitives/examples/rating.example.tsx) | **Runtime (054):** a click on "4 of 5" reports 4; arrows move the checked star **and** native focus, clamping at the ends; Delete clears; filled stars paint `colors.primary` and empty ones `colors.mutedForeground`; Tab enters on the rating and the next Tab leaves it; disabled refuses input. **Invalid (070):** `invalid` paints the empty stars `destructive` and leaves a chosen one on the brand role (the decoded element tree and the runtime `<svg>` tint agree). Whole stars only (no clip/transform in 0.10.0); no `aria-checked`, and no `aria-invalid` — state rides on `aria-valuetext` and the error is paint only. |

`Runtime (041)` = observed by
`nub run --filter @gpuixui/primitives test:runtime` on 2026-10-17 (175 tests in
16 files at plan 073; 172 at plan 072, 167 at plan 071 and 165 at plan 070, including plan 069's
three Select scroll tests and plan 070's rating validation; 161 after plan 068's long-list cap;
160 after plan 067's tooltip placement;
158 after plan 066's select placement; 156 after plan 065's checkbox group; 150 at 064's autoFocus ring; 145
at 063's slider drag contract; 140 at 062's measured list width; 138 at 061's
radio validation; 137 at 060's tooltip placement; 134 after 059's text
semantics; 133 at 058, 130 at 057, 128 at 056, 119 at 055, 115 at the 054
OTPField, 54 at the 041 baseline, 68 after 049, 82 after 053, 90 after
NumberField, 97 after Toggle, 106 after Rating, locally built GPUix 0.10.0
binding). Details: plan 041 §9, plan 053 §11, plan 054 §9, plan 055 §7, plan 056
§12, plan 057 §8, plan 058 §8, plan 059 §8, plan 060 §6, plan 061 §6, plan 062
§6, plan 065 §6, plan 066 §6, plan 067 §6, plan 068 §6, plan 069 §6, plan 070 §6,
plan 072 §6 and plan 073 §6. The examples suite mounts every
example in `packages/primitives/examples/` (plan 047).

**Both themes (021/042):** every painted colour in the Tier 1 scene comes from the
active palette, and re-rendering with the dark palette repaints every asserted
role (plan 042 §8). Since plan 021 the palettes are the shipped `lightTheme` /
`darkTheme` from `@gpuixui/tokens`, not test doubles.

**No row is `done`** until the published-binary run lands and the docs site
(docs-site workstream) has its page. The in-package docs page and the mounted
example exist for every row (plan 047); the runtime column is the honest
locally-built-binding result.

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
| Toasts / notifications | todo | ? | `AnimatePresence` + `createPortal` + `<anchored>` are published primitives; the toast system is ours. |
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

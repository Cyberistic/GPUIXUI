# COMPONENTS.md — inventory, status, limitations

The inventory is a **target**, not permission to fake unsupported things. A row
may only move to `done` when the component has: code, a test appropriate to its
behaviour, at least one working example, a docs page, and a verified interaction
in the real runtime (or a documented, evidenced limitation).

Status: `todo` · `wip` · `done` · `blocked (reason)` · `unsupported (evidence)`

Every row also records **GPUix support** and, when it is not `yes`, the evidence
and the strongest honest alternative.

## Design system

| Capability | Status | GPUix support | Notes / limitations |
| ---------- | ------ | ------------- | ------------------- |
| Design tokens | wip | yes (inline style values) | 47 semantic roles, 10 type roles, spacing/radii/density/elevation; light + dark; `colorRoles` indexes the roles for generated doc tables; elevation resolves to the single shadow the runtime paints (`elevationShadow`); WCAG floors in the test suite. Native visual proof pending the playground gallery. |
| Theme extension | wip | yes (theme switch is a re-render) | `createTheme` / `extendTheme` / `ThemeProvider`; docs in `docs/tokens.md`. Provider test is a server render; native switch pending. |
| High-contrast theme | done | yes (values in a `Theme`) | AAA text floors (7:1) and 4.5:1 boundaries; same 47 roles; `getTheme(mode, "high")`; contrast test covers both variants. Docs in `docs/tokens.md`. |
| Status tones | done | yes (values in a `Theme`) | `info` plus soft `info`/`success`/`warning`/`destructive` pairs with readable foregrounds; `statusTone(theme, tone)` and `alpha(color, amount)`; the contrast test holds soft text to 7:1 in all four colour sets. Docs in `docs/tokens.md`. |
| Focus state | done | yes (a zero-blur spread `boxShadow`) | `focusRing(theme)` returns `{ boxShadow }` with zero offset, zero blur and `spreadRadius = borderWidth.strong`. GPUix 0.10.0 has no `outline*` and no `focusVisible`, so a mouse press shows the ring; overlay/menu animation is unavailable. Docs in `docs/tokens.md`; plan 017 corrected the earlier claim that the runtime supports outlines. |
| Density, type and spacing scales | done | yes | Pure values with no runtime dependency; consumed by primitives/components as they land. |
| Platform type styles | done | yes (values in a `Theme`) | `platformTypes` + `currentPlatform` + `systemMonoFamily` + `platformTheme(base, platform)`; the docs platform toggle renders a real theme, not a docs-only style sheet. 12 guard tests. Native visual check of the sans sentinel pending the playground (B1). |
| Native theme gallery | todo | yes | `apps/playground`; visual evidence for the rows above. Owner: playground workstream. |

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
| Buttons | wip | ours | [button](packages/primitives/docs/button.mdx) · [docs page](apps/docs/content/docs/components/button.mdx) · form | **Runtime (041):** a hit-tested click activates once; Enter on key **down**, Space on key **up**, a held key ignored; `disabled` refuses both; `loading` refuses both and announces `Loading`. `@gpuix/react` publishes **no `./button`**, so the keyboard contract is this package's. The docs page (plan 422) renders the real props table, source and form example; its preview is tier X until the playground captures it. |
| Button groups | wip | yes | [button-group](packages/primitives/docs/button-group.mdx) · [docs](apps/docs/content/docs/components/button-group.mdx) · form | **Runtime (041/048):** attached children are 0px apart, separated ones the theme's `sm` gap. `role="group"` with `aria-label` from `label`; `attached` rounds and clips the group — it does not reshape each child (no `:first-child`, no child cloning). |
| Labels | wip | partial | [label](packages/primitives/docs/label.mdx) · [docs](apps/docs/content/docs/components/label.mdx) · form | **Runtime (041):** the visible name is an a11y `Label`; the control's own `label` is the `TextInput`'s name. There is **no `aria-labelledby`**, so `labelledBy(name)` returns the control's `label` prop (045). |
| Text inputs | wip | yes | [input](packages/primitives/docs/input.mdx) · [docs](apps/docs/content/docs/components/text-input.mdx) · form | **Runtime (041):** runtime keystrokes reach `onChange` with the accumulated text; Enter reaches `onSubmit`; a controlled field reports each edit. The native `<input>` holds its text; `core/state.ts` decides controlled/uncontrolled. |
| Text areas | wip | yes | [textarea](packages/primitives/docs/textarea.mdx) · [docs](apps/docs/content/docs/components/text-area.mdx) · form | **Runtime (041):** height follows `rows` and a newline is accepted; **no `onSubmit`** — with one the runtime turns Enter into a submit and costs the newline (046). `minRows`/`maxRows` are the runtime's own height controls. |
| Checkboxes | wip | partial | [checkbox](packages/primitives/docs/checkbox.mdx) · [docs](apps/docs/content/docs/components/checkbox.mdx) · selection | **Runtime (041):** click and Space-up toggle, and `aria-valuetext` flips `unchecked → checked`; indeterminate reads `mixed`; AccessKit role is `CheckBox`. **No `aria-checked`.** |
| Radio groups | wip | partial | [radio-group](packages/primitives/docs/radio-group.mdx) · [docs](apps/docs/content/docs/components/radio-group.mdx) · selection | **Runtime (041/044/048):** AccessKit roles are `RadioGroup` and `RadioButton`; arrows move the selection, wrap, and **skip disabled options** (044); Home/End jump to the nearest **enabled** end (048); exactly one item is the tab stop; a click on the circle selects. Options are **data**, not compound children (D13). |
| Selects | wip | reuse | [select](packages/primitives/docs/select.mdx) · [docs](apps/docs/content/docs/components/select.mdx) · form | **Runtime (041):** opens, paints its options, commits a clicked option. A thin themed wrapper over `@gpuix/react/select`; open state and dismissal are GPUix's. |
| Switches | wip | partial | [switch](packages/primitives/docs/switch.mdx) · [docs](apps/docs/content/docs/components/switch.mdx) · selection | **Runtime (041):** a click toggles; AccessKit role is `Switch` and the value flips `unchecked → checked`. **No `aria-checked`**; Space/Enter toggle. The thumb moves by the track's `justifyContent` because the runtime has no `transform`. |
| Progress | wip | partial | [progress](packages/primitives/docs/progress.mdx) · [docs](apps/docs/content/docs/components/progress.mdx) · form | **Runtime (041):** `aria-valuetext` is `"42%"`, role is `ProgressIndicator`, the fill tracks the value and clamps outside 0–100. **No `aria-valuenow`.** |
| Tooltips | wip | reuse | [tooltip](packages/primitives/docs/tooltip.mdx) · [docs](apps/docs/content/docs/components/tooltip.mdx) · feedback | **Runtime (041):** opens on hover and on keyboard focus, and its content stays inside the frame it anchors to. A thin wrapper over `@gpuix/react/tooltip`; a mouse-opened tip looks the same as a keyboard-opened one (no `focusVisible`). |
| Skeletons | wip | partial | [skeleton](packages/primitives/docs/skeleton.mdx) · [docs](apps/docs/content/docs/components/skeleton.mdx) · feedback | **Runtime (041):** opacity samples take both `1` and `0.6`. Opacity pulse only: the runtime's `motion` animates width/height/opacity/insets/borderRadius and nothing else, so no shimmer sweep. |
| Loading indicators | wip | partial | [spinner](packages/primitives/docs/spinner.mdx) · [docs](apps/docs/content/docs/components/spinner.mdx) · feedback | **Runtime (041):** the lit dot changes index (the accent-coloured dot proves a theme colour reaches the paint) and AccessKit reports role `Status` with its label. `Spinner` **cannot rotate**; `Progress` with no `value` is the alternative. |
| Slider | todo | ? | — | No slider host element or React export (verified). Track / thumb / indicator from `div`; pointer + keyboard behaviour ours. |
| Range slider | todo | ? | — | Two-thumb variant of Slider; its own runtime for min/max ordering and thumb crossing. No host element. |
| Meter | todo | ? | — | Distinct from Progress: a value in a range, not task completion. No host element. |
| Number Field | todo | ? | — | `<input>` exists (API-shape for the text part); stepper buttons, drag-to-scrub, clamping and locale formatting are ours. |
| OTP Field | todo | ? | — | `<input>` exists; segmented rendering, paste distribution and keyboard movement are ours. |
| Toggle | todo | ? | — | Momentary pressed mode, distinct from Switches. No `Button` in published 0.10.0; built on `div` + the shared keyboard contract. |
| Rating | todo | ? | — | Radio-group-like input; no host element. Reuses the radio roving-focus contract. |

`Runtime (041)` = observed by
`nub run --filter @gpuixui/primitives test:runtime` on 2026-10-17 (63 tests in 7
files after the 048 follow-ups; 54 at the 041 baseline, locally-built GPUix
0.10.0 binding). Details: plan 041 §9. The seventh file mounts every example in
`packages/primitives/examples/` (plan 047).

**Both themes (042):** every painted colour in the Tier 1 scene comes from the
active palette, and re-rendering with the dark palette repaints every asserted
role (plan 042 §8). The palettes are test doubles: `packages/primitives` consumes
the theme through the `PrimitiveTheme` structural port (D14), so it does not
import `@gpuixui/tokens` — the token package owns the shipped values.

**No row is `done`** until the published-binary run lands. The in-package docs
page and the mounted example exist for every row (plan 047), and every Tier 1
row now has an `apps/docs` page with its real source and generated props table
(plans 422 and 423). The runtime column is the honest locally-built-binding
result.

## Tier 2 — composition and feedback

| Component | Status | GPUix support | Notes / limitations |
| --------- | ------ | ------------- | ------------------- |
| Cards | done | yes | `variant` outline/elevated/plain; behaviour suite passes in the real renderer (5 tests, `test:behaviour`) |
| Badges | done | yes | seven variants (neutral/primary/4 status tones/outline), two sizes sized by type role; 7 native behaviour tests. Not interactive by design; no icon or dismiss slot yet |
| Avatars | done | yes | four diameters, deterministic unicode-safe initials fallback (8 logic tests), presence dot; 7 native behaviour tests. No image loading/error state in v1 — a missing file paints nothing and does not restore the initials |
| Alerts | done | yes | four tones from the shared status palette, required `title`, optional icon slot and dismiss control; 10 native behaviour tests (real click, keyboard activation, alert role). Dismiss uses the local button stand-in; live-region announcement not verifiable here |
| Lists / list items | done | yes | `selectionMode` none/single with a roving tab stop, wrap-around over disabled rows, real focus (`focusElement`), controlled + uncontrolled; 12 native behaviour tests. Single selection only — no multi-select, type-ahead or virtualisation |
| Empty states | done | yes | title + optional description/action/icon, no surface of its own; 6 native behaviour tests including a real click on the action. Wrap width is a component constant (no measure token) |
| Inline validation | done | partial | `Field`/`FieldLabel`/`FieldDescription`/`FieldError`/`FieldInput` with schema-message `validate`/`validateAll`; 5 native behaviour tests + validation logic suite, both themes. No `aria-describedby`/`aria-invalid` in 0.10.0; the caller owns the value and when validation runs |
| Toasts / notifications | done | yes | Effect store (`SubscriptionRef` + `FiberMap`), bounded queue, monotonic ids, auto-dismiss tested with `TestClock`, stale-timer regression; 7 native behaviour tests. No `zIndex` (render the viewport last), no progress bar, no pause-on-hover |
| Dialogs | done | partial | local overlay over an `anchored` veil at window coordinates (0.10.0 ships no Dialog parts and no portal); 12 native behaviour tests + 5 dismiss-stack logic tests. No `aria-modal`/`aria-labelledby` in 0.10.0 — named through the required `label` |
| Confirmation dialogs | done | partial | Cancel holds initial focus (Enter cancels); confirm never closes the dialog itself, the caller does; `loading` disables both actions and suppresses Escape/backdrop; 5 native behaviour tests. Busy indicator is a `…` glyph until a Spinner exists |
| Popovers | done | yes | anchored through GPUix's `FloatingLayer`; Escape restores focus, Tab and outside presses do not; share the dismiss stack with Dialog and a mouse-down re-open guard; 8 native behaviour tests, both themes |
| Dropdown menus | done | partial | anchored `FloatingLayer` surface with a shared row/highlight core; arrow/Home/End wrap and skip disabled rows, Enter activates and restores focus, checkbox and destructive rows; 9 native behaviour tests, both themes. No submenus, no type-ahead, `aria-selected` instead of `aria-checked` in 0.10.0 |
| Context menus | done | partial | pointer-positioned `anchored` surface over the shared rows; 6 native behaviour tests (right click opens, land within 12px of the pointer, select runs once, second right click moves it). 0.10.0 has no `onContextMenu` — `onAuxClick` + `isRightClick`; no keyboard path to open and no portal |
| Command menus | done | partial | dialog-hosted searchable palette composing Dialog and `menu/logic.ts`; input keeps focus while the highlight moves; 8 native behaviour tests. Substring filter only (no fuzzy), `aria-activedescendant` unavailable, input is the host element until primitives lands |
| Tabs | done | partial | roving tab stop on the selected trigger, arrow wrap skipping disabled tabs, Home/End, automatic and manual activation; 8 native behaviour tests, both themes. 0.10.0 has no `aria-orientation`/`aria-controls`, so the panel is named by its value |
| Accordions | done | yes | single (with `collapsible`) and multiple modes over a tagged-union state; divider order, disabled sections, glyph indicator; 8 native behaviour tests + 15 transition tests. No arrow-key movement between headers, no height animation; no `transform` for a rotating chevron |
| Collapsible sections | done | partial | trigger with `aria-expanded`, content unmounts while closed; 4 native behaviour tests. Mounts instantly: 0.10.0's motion needs a numeric height and an auto-height reveal needs a measured first paint |
| Breadcrumbs | done | partial | declarative trail with `maxItems` collapsing the middle (first + … + tail), separators follow their item; 5 native behaviour tests + 7 collapse tests. No `aria-current` in 0.10.0, so the current page is text and colour |
| Pagination | done | partial | stable-width page window with siblings/edges, disabled edges, ellipsis; 8 native behaviour tests + 9 window tests, both themes. Current page uses `aria-selected` because 0.10.0 has no `aria-current`; no page-size control |
| Search inputs | done | yes | leading glyph, conditional clear control, Enter submit, Escape clears only when non-empty, controlled/uncontrolled; 6 native behaviour tests. No debounce (the consumer's job); the glyph is text until an icon set lands |
| Comboboxes | done | yes | wraps GPUix's headless combobox with our ranked option shape; single and multiple selection by value, disabled rows, empty state, Escape focus restore; 10 native behaviour tests + ranking suite, both themes. No async options/create-new, no `aria-activedescendant` |
| Date / time pickers | done | partial | month grid over Effect `DateTime` (no `Date`), `Popover` surface, arrow/Home/End/PageUp/PageDown, ISO-day value; 9 native behaviour tests + 13 calendar tests, both themes. Fixed English labels, no adjacent-month days, no time picker, no `aria-current` |

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
| Virtualized tables | todo | ? | `<virtual-list>` rows can host a grid; there is no table element. |
| Tree views | todo | ? | `<virtual-list>` + indentation; hierarchical virtualization is ours. |
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
| File trees | todo | ? | Tree views + `<virtual-list>`. |
| Log viewers | todo | ? | `<virtual-list>` + `<text>`; text search/highlight hooks exist. |
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

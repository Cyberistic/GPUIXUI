# Reference research — three GPUI references

Recon for the GPUix + React component library. Read-only: nothing in
`~/GPUIXUI` was written except this file and the three clones under
`references/`.

Method: shallow clones (`git clone --depth 1`) of all three repos; every claim
below comes from files read on the box, with the path quoted. The GitHub page
summary was not used. Star counts / liveness came from the GitHub API on
2026-10-17.

## 0. Clones

| Repo | Clone path | Commit | Files (excl. `.git`) | License |
| ---- | ---------- | ------ | -------------------- | ------- |
| awesome-gpui | `references/awesome-gpui` | `8c47242` 2026-10-16 | 15 | **CC0-1.0** (`LICENSE`, 121 lines, "CC0 1.0 Universal") |
| base-gpui | `references/base-gpui` | `64b2233` 2026-08-17 | 964 | **MIT** (`LICENSE`, "Copyright (c) 2026 Luke Tandjung") |
| adabraka-ui | `references/adabraka-ui` | `e158684` 2026-02-19 | 3634 | **MIT** (`LICENSE`, "Copyright (c) 2025 Adabraka Team"; plus a second `LICENSE-MIT` with no copyright line) |

No `NOTICE`, `THIRD-PARTY`, or `COPYING` file exists in any of the three
(verified with `find` across all three trees). That is itself a finding — see
§8.

`references/` is gitignored (`.gitignore`, line "Reference clones (AGENTS.md)").
The repo README already lists references, but I was scoped to two write paths, so
I did not add these three to it.

---

## 1. awesome-gpui

**What it is.** A curated list of GPUI projects. The `README.md` (34,970 bytes) is
**generated**: `README.template.md` (319 bytes) plus `projects.json` (45,326
bytes, schema in `projects.schema.json`) rendered by `scripts/` (Python; the
repo's language on GitHub is Python, 1,455★, CC0-1.0). Consequence for us: the
list is machine-readable — `projects.json` is the useful artifact, not the
markdown. Structure: `## Apps` (Developer Tools 52, Productivity 20, Media 11,
System Utilities 11, Demos & Examples 3), `## Libraries` (31), `## Tooling` (6),
`## Resources` (2).

**Its `#libraries` list is not an inventory of components** — it is one line per
project. Only three of the 31 are component libraries with real inventories
(adabraka-ui, base-gpui, and `gpui-component`). Triage in §6.

**One resolution worth recording.** awesome-gpui's `#libraries` links
`longbridge/gpui-component` ("17.8k 🔥"). The GitHub API redirects that URL to
**`longbridge/gpui-kit`** — the exact repo already cloned at
`references/gpui-kit` (v0.58.0, `LICENSE-APACHE` + `LICENSE-DOCS.md`). So the
highest-starred entry in the list is a duplicate of our existing reference, not a
new one.

**Portability.** The list itself is CC0, so the *data* (star counts, liveness,
descriptions, URLs) can be reused freely, including in our docs. Nothing here is
code.

---

## 2. base-gpui

**What it is.** A Rust crate (`Cargo.toml`: `name = "base-gpui"`, `version =
"0.1.0"`, `license = "MIT"`, `publish = false`) that ports **Base UI** — a React
headless component library — to GPUI. `README.md`: "A GPUI-native port of Base
UI's rich, headless component APIs." Depends on `gpui = { git = zed-industries/
zed, rev = "59b2ebf10351b5c0b5cd4403f01ed0460eeec06d" }` (crate version 0.2.2) and
`derive_setters`, `unicode-segmentation`, `web-time`. 93★, last commit
2026-08-17. Because Base UI is React and GPUix *is* React, this is the single most
transferable reference of the three (§4).

**Source layout** (`src/`, one folder per component — `src/tabs/` is typical):

```
src/<component>/
  mod.rs            # barrel only (ast-grep enforces this)
  actions.rs        # GPUI key dispatch actions/bindings
  runtime.rs        # ComponentRuntime<T> — all state, all rules
  context.rs        # ComponentContext<T> — injection + controlled/uncontrolled rule
  props.rs          # stable config + callbacks
  style_state.rs    # one style-state struct per part that draws
  child.rs          # typed child enums
  child_wiring.rs   # private traversal/indexing/context attachment
  layers/           # renderable GPUI parts
  tests/            # window-free runtime tests + rendered behaviour tests
```

Also `src/primitives/{input,safe_polygon,scroll}`, `src/utils/{direction,overlay,
presence}`, `src/lib.rs` (`init(cx)` registering every component's keybindings),
and two architecture-enforcing ast-grep rules (`ast-grep-rules/no-scoped-pub.yml`,
`ast-grep-rules/barrel-only-mod-rs.yml`). Per-component `AGENTS.md` files exist
(`src/tabs/AGENTS.md`, `src/checkbox/AGENTS.md`) — evidence of LLM-assisted
authoring; behaviour claims were not independently verified by me.

### Component inventory — exact, from `docs/components/README.md`

| Component | Compound parts |
| --- | --- |
| Accordion | `AccordionHeader`, `AccordionItem`, `AccordionPanel`, `AccordionRoot`, `AccordionTrigger` |
| Alert Dialog | `AlertDialogPopup`, `AlertDialogRoot`, `AlertDialogTrigger` |
| Autocomplete | `AutocompleteRoot`, `AutocompleteValue` |
| Avatar | `AvatarFallback`, `AvatarImage`, `AvatarRoot` |
| Button | `ButtonRoot` |
| Checkbox | `CheckboxIndicator`, `CheckboxRoot` |
| Checkbox Group | `CheckboxGroup` |
| Collapsible | `CollapsiblePanel`, `CollapsibleRoot`, `CollapsibleTrigger` |
| Combobox | `ComboboxArrow`, `ComboboxBackdrop`, `ComboboxChip`, `ComboboxChipRemove`, `ComboboxChips`, `ComboboxClear`, `ComboboxCollection`, `ComboboxEmpty`, `ComboboxGroup`, `ComboboxGroupLabel`, `ComboboxIcon`, `ComboboxInput`, `ComboboxInputGroup`, `ComboboxItem`, `ComboboxItemIndicator`, `ComboboxLabel`, `ComboboxList`, `ComboboxPopup`, `ComboboxPortal`, `ComboboxPositioner`, `ComboboxRoot`, `ComboboxSeparator`, `ComboboxStatus`, `ComboboxTrigger`, `ComboboxValue` |
| Context Menu | `ContextMenuRoot`, `ContextMenuTrigger` |
| Dialog | `DialogBackdrop`, `DialogClose`, `DialogDescription`, `DialogPopup`, `DialogPortal`, `DialogRoot`, `DialogTitle`, `DialogTrigger`, `DialogViewport` |
| Drawer | `DrawerBackdrop`, `DrawerContent`, `DrawerIndent`, `DrawerIndentBackground`, `DrawerPopup`, `DrawerPortal`, `DrawerProvider`, `DrawerRoot`, `DrawerSwipeArea`, `DrawerViewport` |
| Field | `FieldControl`, `FieldDescription`, `FieldError`, `FieldItem`, `FieldLabel`, `FieldRoot`, `FieldValidity` |
| Fieldset | `FieldsetLegend`, `FieldsetRoot` |
| Form | `Form` |
| Input | `Input` |
| Menu | `MenuArrow`, `MenuBackdrop`, `MenuCheckboxItem`, `MenuCheckboxItemIndicator`, `MenuGroup`, `MenuGroupLabel`, `MenuItem`, `MenuLinkItem`, `MenuPopup`, `MenuPortal`, `MenuPositioner`, `MenuRadioGroup`, `MenuRadioItem`, `MenuRadioItemIndicator`, `MenuRoot`, `MenuSeparator`, `MenuSubmenuRoot`, `MenuSubmenuTrigger`, `MenuTrigger` |
| Menubar | `Menubar` |
| Meter | `MeterIndicator`, `MeterLabel`, `MeterRoot`, `MeterTrack`, `MeterValue` |
| Navigation Menu | `NavigationMenuArrow`, `NavigationMenuBackdrop`, `NavigationMenuContent`, `NavigationMenuIcon`, `NavigationMenuItem`, `NavigationMenuLink`, `NavigationMenuList`, `NavigationMenuPopup`, `NavigationMenuPortal`, `NavigationMenuPositioner`, `NavigationMenuRoot`, `NavigationMenuTrigger`, `NavigationMenuViewport` |
| Number Field | `NumberFieldDecrement`, `NumberFieldGroup`, `NumberFieldIncrement`, `NumberFieldInput`, `NumberFieldRoot`, `NumberFieldScrubArea`, `NumberFieldScrubAreaCursor` |
| OTP Field | `OTPFieldInput`, `OTPFieldRoot` |
| Popover | `PopoverArrow`, `PopoverBackdrop`, `PopoverClose`, `PopoverDescription`, `PopoverPopup`, `PopoverPortal`, `PopoverPositioner`, `PopoverRoot`, `PopoverTitle`, `PopoverTrigger`, `PopoverViewport` |
| Preview Card | `PreviewCardArrow`, `PreviewCardBackdrop`, `PreviewCardPopup`, `PreviewCardPortal`, `PreviewCardPositioner`, `PreviewCardRoot`, `PreviewCardTrigger`, `PreviewCardViewport` |
| Progress | `ProgressIndicator`, `ProgressLabel`, `ProgressRoot`, `ProgressTrack`, `ProgressValue` |
| Radio Group | `RadioGroupIndicator`, `RadioGroupRadio`, `RadioGroupRoot` |
| Scroll Area | `ScrollAreaContent`, `ScrollAreaCorner`, `ScrollAreaRoot`, `ScrollAreaScrollbar`, `ScrollAreaThumb`, `ScrollAreaViewport` |
| Select | `SelectArrow`, `SelectBackdrop`, `SelectGroup`, `SelectGroupLabel`, `SelectIcon`, `SelectItem`, `SelectItemIndicator`, `SelectItemText`, `SelectLabel`, `SelectList`, `SelectPopup`, `SelectPortal`, `SelectPositioner`, `SelectRoot`, `SelectScrollDownArrow`, `SelectScrollUpArrow`, `SelectSeparator`, `SelectTrigger`, `SelectValue` |
| Separator | `Separator` |
| Slider | `SliderControl`, `SliderIndicator`, `SliderLabel`, `SliderRoot`, `SliderThumb`, `SliderTrack`, `SliderValue` |
| Switch | `SwitchRoot`, `SwitchThumb` |
| Tabs | `TabsIndicator`, `TabsList`, `TabsPanel`, `TabsRoot`, `TabsTab` |
| Toast | `ToastAction`, `ToastClose`, `ToastContent`, `ToastDescription`, `ToastPortal`, `ToastProvider`, `ToastRoot`, `ToastTitle`, `ToastViewport` |
| Toggle | `Toggle` |
| Toggle Group | `ToggleGroup` |
| Toolbar | `ToolbarButton`, `ToolbarGroup`, `ToolbarInput`, `ToolbarLink`, `ToolbarRoot`, `ToolbarSeparator` |
| Tooltip | `TooltipPopup`, `TooltipPortal`, `TooltipPositioner`, `TooltipProvider`, `TooltipRoot`, `TooltipTrigger`, `TooltipViewport` |

37 components. Non-component modules worth noting: `primitives::input`,
`primitives::scroll` (a standalone `Scrollbar` with `ScrollbarAxis`,
`ScrollbarVisibility`, `ScrollbarStyleState`), and `primitives::safe_polygon`
(`SafePolygon`, `SafePolygonConfig`, `SafePolygonSide`, `SafePolygonVerdict`,
`point_in_quadrilateral`, `point_in_trough` — hover-intent for menus/tooltips);
`utils::{DirectionProvider, HorizontalDirection, modal_backdrop,
OverlayDismissHandler, PresenceState}`.

### API shape it exposes

Read from `docs/components/tabs.md`, `docs/components/button.md`,
`docs/component-architecture.md`, `src/tabs/style_state.rs`, `CODE_STYLE.md`.

1. **Compound parts.** No monolithic widget. `TabsRoot > TabsList > (TabsTab,
   TabsIndicator)` and `TabsPanel`, each a separate public type with typed child
   enums so the compiler rejects a `TabsPanel` inside a `TabsList`.
2. **Controlled / uncontrolled.** `.value(v)` makes the part controlled (the
   selection changes only when the caller supplies a new value);
   `.default_value(v)` is the uncontrolled initial value ("Use either `value` or
   `default_value`, not both"); `.on_value_change(|value, window, cx| ...)` fires
   on request. The controlled/uncontrolled rule lives in one place
   (`context.rs`).
3. **Builder methods with published exact signatures.** Every guide documents
   each builder as a code block, e.g.
   `pub fn value(self, value: Option<T>) -> Self`,
   `pub fn on_value_change(self, f: impl Fn(Option<&T>, &mut Window, &mut App) + 'static) -> Self`.
   `CODE_STYLE.md` mandates `derive_setters::Setters` for pure-assignment setters
   and requires `#[setters(skip)]` on every non-public field.
4. **State-aware styling.** `.style_with_state(|state, part| if state.active {
   part.bg(..) } else { part })`, where `state` is a per-part struct that is
   public API (`src/tabs/style_state.rs`: `TabsRootStyleState { orientation,
   activation_direction }`, `TabsTabStyleState { active, disabled, focused,
   highlighted, orientation }`, `TabsIndicatorStyleState { selected,
   active_tab_position, active_tab_size, orientation, activation_direction }`).
   Explicitly *not* DOM data attributes or CSS variables.
5. **Keyboard via GPUI actions**, not raw key handlers: `actions.rs` declares
   actions → `init(cx)` binds keys → the layer sets `.key_context(..)` →
   `.on_action(..)` translates to a runtime command.
6. **`base_gpui::init(cx)`** must be called at app start.
7. **Accessibility with documented gaps.** `docs/components/tabs.md`:
   "`TabsList` exposes `Role::TabList`, each `TabsTab` exposes `Role::Tab` and
   selected state, and the active `TabsPanel` exposes `Role::TabPanel`. Roving
   focus ensures one enabled tab is in the tab order. The pinned GPUI revision
   does not expose ID-reference relationship builders such as `aria-controls` or
   `aria-labelledby` … these limitations are not silently emulated." Every guide
   has an `## Accessibility` section (37 of them) plus `## Keyboard interaction`
   and `## Stability`.

### Its internal architecture (the part most worth copying)

`docs/component-architecture.md` is a short, opinionated spec: modules are carved
**by knowledge, not by widget**; per component there are exactly three module
kinds — a deep `ComponentRuntime<T>` holding all state and rules, a thin
`ComponentContext<T>` (three methods: `read`, `update`, `select`) that is the
*only* place the controlled/uncontrolled rule lives, and thin renderable parts.
The runtime's interface is exactly two vocabularies — **commands**
(`sync_children`, `reconcile`, `select`, `move_highlight`, `set_bounds`) and
**queries** that return style-state (`root_state()`, `part_state(..)`). Rules: no
getter/setter pairs; no query answers "what is the highlighted index?" — only "am
I highlighted?"; state mutates in exactly two places (top of root render, and
event handlers); every transition is computed once inside the runtime; parts never
see runtime internals. The runtime is unit-testable **without a window**, which is
why `src/*/tests/` is 1,000+ files.

---

## 3. adabraka-ui

**What it is.** A Rust GPUI component library, shadcn/ui-inspired.
`Cargo.toml`: `name = "adabraka-ui"`, `version = "0.3.9"`, `license = "MIT"`.
`README.md`: "A comprehensive, professional UI component library for GPUI …
provides 85+ polished, accessible components". Two things to know up front:

- It depends on a **GPUI fork**: `gpui = { package = "adabraka-gpui", version =
  "0.5" }` — not upstream GPUI. Its semantics are therefore a reference, not
  ground truth.
- It **requires Rust nightly** (`README.md`: "Currently requires Rust nightly due
  to GPUI dependencies").

478★, last commit 2026-02-19 (dormant — ⚪ in awesome-gpui's own key). 144
`examples/*.rs`, 3,634 files.

### Inventory — exact, from the module tree

`src/lib.rs` declares the top-level modules; the component-bearing directories are
`components/`, `display/`, `navigation/`, `overlays/`, `charts/`. (The README's
`## Components` section documents only ~31 of these; the crate ships ~105 modules.
The README is not the inventory — the tree is.)

**`src/components/` (105 modules).** `alert`, `animated_collapsible`,
`animated_counter`, `animated_list`, `animated_presence`, `animated_progress`,
`animated_switch`, `animated_text`, `audio_player`, `aurora`, `avatar`,
`avatar_group`, `button`, `calendar`, `canvas_component`, `carousel`, `checkbox`,
`code_block`, `collapsible`, `color_picker`, `combobox`, `confetti`,
`confirm_dialog`, `copy_button`, `countdown`, `crop_area`, `date_picker`, `dock`,
`dot_pattern`, `drag_drop`, `drawer_navigation`, `dropdown`, `editor`,
`empty_state`, `expandable_card`, `file_upload`, `floating_action_button`, `form`,
`glass_morphism`, `gradient_border`, `gradient_text`, `hotkey_input`, `icon`,
`icon_button`, `icon_source`, `image_viewer`, `infinite_scroll`, `inline_edit`,
`input`, `input_state`, `kbd`, `keyboard_shortcuts`, `label`, `layout_transition`,
`magnetic_button`, `marquee`, `mention_input`, `meteors`, `navigation_menu`,
`noise`, `notification_center`, `number_input`, `number_ticker`, `otp_input`,
`pagination`, `particle_emitter`, `progress`, `pulse_indicator`, `qr_code`,
`radio`, `range_slider`, `rating`, `resizable`, `ripple`, `scrollable`,
`scrollbar`, `search_input`, `segmented_nav`, `select`, `separator`,
`shared_element_transition`, `shimmer`, `skeleton`, `skeleton_loader`, `slider`,
`sortable_list`, `sparkline`, `spinner`, `split_pane`, `spotlight`, `stepper`,
`svg_renderer`, `tag_input`, `text`, `text_field`, `text_highlight`, `text_reveal`,
`textarea`, `tilt_card`, `time_picker`, `timeline`, `toggle`, `toggle_group`,
`tooltip`, `type_writer`, `video_player`, `view_router`, `waveform`.

**`src/display/` (9).** `accordion`, `badge`, `card`, `data_grid`, `data_table`,
`html`, `markdown`, `rich_text`, `table`.

**`src/navigation/` (10).** `app_menu`, `breadcrumbs`, `file_tree`, `menu`,
`sidebar`, `status_bar`, `tabs`, `toolbar`, `tree`, `virtual_list`.

**`src/overlays/` (10).** `alert_dialog`, `bottom_sheet`, `command_palette`,
`context_menu`, `dialog`, `hover_card`, `popover`, `popover_menu`, `sheet`,
`toast`.

**`src/charts/` (10).** `area_chart`, `bar_chart`, `chart`, `donut_chart`,
`gauge`, `heatmap`, `line_chart`, `pie_chart`, `radar_chart`, `treemap`.

**Non-component infrastructure (all relevant as references):** `animate.rs`,
`animated_state.rs`, `animation_coordinator.rs`, `animations.rs` (20 KB),
`content_transition.rs`, `gestures.rs`, `gpui_ext.rs`, `http.rs`, `icon_config.rs`,
`layout.rs` (35 KB), `responsive.rs`, `scroll_physics.rs`, `spring.rs`,
`styled_ext.rs`, `transitions.rs`, `virtual_list.rs` (32 KB), `fonts.rs`,
`theme/{mod,theme,tokens}.rs`.

### API shape it exposes

1. **Builder pattern with id + label first:**
   `Button::new("click-me", "Click me").variant(ButtonVariant::Outline).size(ButtonSize::Lg).disabled(true).on_click(..)`;
   variants `Default | Secondary | Outline | Ghost | Link | Destructive`, sizes
   `Sm | Md | Lg`. `IconButton::new(IconSource::Named("search".into()))`.
2. **Entity-based state for stateful components:**
   `let state = cx.new(|cx| SliderState::new(cx)); Slider::new(state).size(SliderSize::Md).on_change(..)`
   — the same split as base-gpui's runtime/parts, but expressed as a GPUI
   `Entity` the caller owns.
3. **`StyledExt` on every component** (`src/styled_ext.rs`, re-exported from
   `prelude`): "Good defaults, complete control" — a component also accepts the
   full GPUI styling API (`.w() .bg() .p() .rounded() .border_2() .border_color()`).
4. **Global theme + global init:**
   `theme::install_theme(cx, Theme::dark())` then `adabraka_ui::init(cx)`, and
   `use_theme()` inside render to read tokens. Runtime theme switching is
   documented and supported.
5. **Wrapper strategy:** `GAP_ANALYSIS.md` §4.1 — "Users import ONLY
   `adabraka_ui` — never `gpui` directly." Our analogue: consumers import only our
   package, never `@gpuix/native`.
6. **Icon system:** assets are **not bundled**; the app calls
   `set_icon_base_path(..)` and supplies its own Lucide/Heroicons files. (But the
   repo *does* ship 3,274 icon asset files and Inter/JetBrains Mono fonts under
   `assets/` — see §8.)

### Theme structure (`src/theme/tokens.rs`, `src/theme/mod.rs`)

`ThemeTokens` is a flat struct of shadcn-named semantic roles — `background`,
`foreground`, `card`, `card_foreground`, `popover`, `popover_foreground`,
`muted`, `muted_foreground`, `accent`, `accent_foreground`, `primary`,
`primary_foreground`, `secondary`, `secondary_foreground`, `destructive`,
`destructive_foreground`, `border`, `input`, `ring` — plus `radius_{sm,md,lg,xl}`,
`shadow_{xs,sm,md,lg,xl}`, `ring_offset`, `transition_{fast,base,slow}`,
`font_family`, `font_mono`, `spacing_{1,2,3,4,5,6,8,10,12,16}`,
`duration_{fastest,faster,fast,normal,slow,slower,slowest}`, and
`z_{dropdown,sticky,modal,popover,tooltip}`. Light and dark are two token sets;
`theme/mod.rs` documents the design decisions behind them.

### The single most valuable artifact: `GAP_ANALYSIS.md`

17 KB. §Part 2 lists **what GPUI can and cannot do**, with a
"workaround possible?" column. Condensed:

*Can:* flexbox + grid (Taffy), 2-stop linear gradients, outset box shadows,
per-corner radii, opacity, `TransformationMatrix` on **sprites only**, per-side
borders, 22 cursors, `with_animation`, hit-testing, deferred z-ordering,
glyph-atlas text.

*Cannot (with their verdict):* backdrop blur (partial), CSS filters (no),
clip-path (no), blend modes (no), text shadow (partial), multi-stop gradients
(partial), radial/conic gradients (no), inset shadows (partial), quad transforms
on divs (partial), sticky positioning (partial), scroll snap (partial), explicit
z-index (use `deferred()` priority), container queries (partial), aspect-ratio
(manual), keyframe animations (partial), animation interruption (partial),
reduced-motion detection (platform API), custom paint (path primitive, limited).

§3 also itemises design-token gaps they had not yet closed (spacing scale,
typography scale, animation durations, z-index scale, breakpoints) and
interaction gaps (drag-to-reorder, scroll snap, intersection/resize observers,
focus trap). §4.4 lists components *they* still wanted (Popconfirm, Tour, Kanban,
RichTextEditor, VirtualTable, Dock/Panel, Notification).

### Other structures worth reading

- `src/layout.rs`: `VStack`/`HStack`/`Flow`/`Grid`/`Cluster` with
  `Align`/`Justify`/`FlowDirection` and `gap`/`fill`/`grow`/`padding`/
  `space_between`.
- `src/virtual_list.rs`: `UniformVirtualList` and
  `VariableVirtualList<P: ItemExtentProvider>` with `overscan`,
  `track_scroll`, `on_visible_range`, `on_near_end`, `scroll_to`,
  `with_physics(PhysicsScrollState)`, `scroll_to_animated`.
- `src/components/split_pane.rs`: `SplitPaneState` with
  `ratio`/`min_first`/`max_first`/`min_second`/`max_second`/`collapse(..)`/
  `expand`/`toggle_collapse`, `SplitDirection`, `CollapsiblePane`, plus
  `ResizablePanelGroup` in `components/resizable.rs`.
- 144 runnable examples (`examples/`), including `demo.rs`, `ide_demo`,
  `file_explorer`, `data_table_demo`, `command_palette_demo`, `dock`, `editor_demo`.

---

## 4. What is actually portable across the language boundary

**The boundary.** GPUix (`references/gpuix`, v0.10.0) is TypeScript — "React and
Solid for GPUI", `jsxImportSource = "@gpuix/react"`, native rendering, no DOM
(`README.md`). Both references are Rust over GPUI's immediate-mode entity model.
Nothing in either repo can be copied as source: different language, different
runtime, and in adabraka's case a *forked* GPUI.

**What does transfer, and why it transfers well:**

| Portable | Evidence | Our form |
| --- | --- | --- |
| Compound-part decomposition | base-gpui's 37-row parts table; adabraka's `Tabs::new().tabs(..).panels(..)` | Our component APIs: `Root/Trigger/Popup/Item` |
| Controlled/uncontrolled contract | `.value` / `.default_value` / `.on_value_change` | React props of the same names |
| State-aware styling as a render prop | `style_with_state(\|state, part\| ..)` + per-part style-state structs | `children: (state) => ReactNode`, or `data-*`-free variant props |
| State machine split (deep runtime / thin parts) | `docs/component-architecture.md` | A reducer/hook per component + context; unit-testable without a renderer |
| Keyboard semantics per component | 37 `## Keyboard interaction` sections; `activate_on_focus`, `loop_focus`, roving focus, RTL roving in `toggle_group/tests/rtl_roving.rs` | Our key handling + `tabIndex`/`onKeyDown` (GPUix has real focus handles) |
| Theming token structure | `theme/tokens.rs` field list | A token package; matches our mission's semantic-role list almost exactly |
| Accessibility model + honest gap list | `Role::TabList`/`Role::Tab`/`Role::TabPanel`, no `aria-controls` in the pinned GPUI | GPUix exposes `role` + `aria-*` (AccessKit), so roles port; relationship wiring is the same known gap |
| Capability/limitation map | `GAP_ANALYSIS.md` §2 | Our Phase A capability map and COMPONENTS.md "GPUix support" column |
| Test strategy | 1,000+ window-free runtime tests | Unit-test the state model, render-test separately |

**The one case where a straight port *is* plausible — and it is not a Rust one.**
base-gpui is a port *of a React library* (Base UI) *to* Rust. Its public surface —
part names, `value`/`defaultValue`/`onValueChange`, render-prop style state,
`render`/`className`-equivalent hooks — is React idiom by construction, and its own
architecture doc says the internals must *not* mirror React's render model. Going
Rust → React, the same statement inverts: port the **API surface and the state
vocabulary**, not the module/runtime machinery. In practice that means we should
read `docs/components/*.md` as an **API specification to translate**, and treat
`src/**` as rationale only. Translating the 37 guides to React prop types is a
mechanical, low-risk exercise; there is no code to copy, so the licence question
for base-gpui is attribution for *design* only.

---

## 5. Gap analysis against `COMPONENTS.md` (90 rows)

`COMPONENTS.md` has 20 + 22 + 15 + 22 + 11 = 90 rows. Mapping below is by
semantics; "covered" means a row exists that the component plausibly satisfies.

### 5a. base-gpui (37 components) — missing list

**Genuinely missing — they have it, `COMPONENTS.md` has no row at all:**

1. **Slider** — `SliderRoot/Control/Track/Indicator/Thumb/Label/Value`. We have no
   slider of any kind.
2. **Meter** — `MeterRoot/Track/Indicator/Label/Value`. Distinct from Progress
   (measures a value in a range rather than reporting task completion).
3. **Number Field** — `NumberFieldRoot/Group/Input/Increment/Decrement/ScrubArea/
   ScrubAreaCursor`. A numeric input with stepper buttons and a drag-to-scrub area.
4. **OTP Field** — `OTPFieldRoot/Input`, `otp.rs` (paste/keyboard behaviour tests).
5. **Navigation Menu** — 13 parts; a menubar-style nav whose items open content
   panels. Not the same as Dropdown menus.
6. **Preview Card** — 8 parts; hover-triggered rich card with a positioner.
7. **Drawer** — 10 parts; edge-anchored panel with swipe-to-dismiss and nesting.
8. **Fieldset** — `FieldsetRoot/Legend`.
9. **Form** — `Form` + `submit.rs` + `value.rs`; validation orchestration and a
   submit lifecycle.
10. **Toggle** — a single pressed-state button. We list **Switches**, which is a
    different control (Switch = on/off state; Toggle = a momentary pressed mode).

**Arguably a variant of a row we already have** (decide deliberately, then record
the decision):

- **Autocomplete** (`AutocompleteRoot/Value`) → row "Comboboxes" / "Search inputs".
- **Checkbox Group** (`CheckboxGroup`) → row "Checkboxes".
- **Toggle Group** (`ToggleGroup`) → row "Button groups".
- **Field** (`FieldRoot/Label/Description/Error/Validity/Item/Control`) → row
  "Inline validation".

**Covered** (they have it, we have a row): Accordion→Accordions; Alert Dialog→
Confirmation dialogs; Avatar→Avatars; Button→Buttons; Checkbox→Checkboxes;
Collapsible→Collapsible sections; Combobox→Comboboxes; Context Menu→Context
menus; Dialog→Dialogs; Input→Text inputs; Menu→Dropdown menus; Menubar→
Application menus; Popover→Popovers; Progress→Progress; Radio Group→Radio
groups; Scroll Area→Scrollable containers; Select→Selects; Separator→Separators;
Switch→Switches; Tabs→Tabs; Toast→Toasts / notifications; Toolbar→Toolbars;
Tooltip→Tooltips.

### 5b. adabraka-ui — missing list

**Genuinely missing — no row in `COMPONENTS.md`:**

1. **Slider** (`components/slider.rs`, horizontal + vertical, `SliderSize`)
2. **Range slider** (`components/range_slider.rs`, `RangeSliderState`)
3. **Rating** (`components/rating.rs`)
4. **Stepper** (`components/stepper.rs`, `StepItem`/`StepStatus`/orientation/size)
5. **Timeline** (`components/timeline.rs`, 8 variants/positions/connector styles)
6. **Color picker** (`components/color_picker.rs`, HSL/RGB/HEX + alpha + swatches)
7. **Tag / token input** (`components/tag_input.rs`, `TagInputState`)
8. **Mention input** (`components/mention_input.rs`, `MentionInputEvent`/`MentionItem`)
9. **Hotkey / shortcut-recorder input** (`components/hotkey_input.rs`, `HotkeyValue`)
10. **Number input** (`components/number_input.rs`, `NumberInputSize`)
11. **OTP input** (`components/otp_input.rs`, `OTPInputSize`/`OTPState`)
12. **Countdown** (`components/countdown.rs`, `TimeUnits`/`CountdownFormat`)
13. **QR code** (`components/qr_code.rs`, `QRCodeComponent`)
14. **Carousel** (`components/carousel.rs`, `CarouselSlide`/`CarouselTransition`)
15. **File upload** (`components/file_upload.rs`, `FileTypeFilter`/`SelectedFile`/
    `FileUploadError`) — note we only have "File / folder selection", which is the
    picker, not the upload surface with progress/validation.
16. **Inline edit** (`components/inline_edit.rs`, `InlineEditTrigger`)
17. **Keyboard-shortcuts display + keycap** (`components/keyboard_shortcuts.rs`,
    `components/kbd.rs`) — the ⌘-key rendering and the categorised shortcut table.
18. **Video / audio player and waveform** (`components/video_player.rs`,
    `components/audio_player.rs`, `components/waveform.rs`) — media surfaces with
    playback state.
19. **Crop area** (`components/crop_area.rs`, `CropAreaState`/`DragHandle`)

**Arguably a variant of a row we already have:**

- **Segmented control** (`components/segmented_nav.rs`) → "Tabs" or "Button groups".
- **Spotlight** (`components/spotlight.rs`) → "Command palette".
- **Expandable card** (`components/expandable_card.rs`) → "Cards" / "Collapsible
  sections".
- **Floating action button** (`components/floating_action_button.rs`) and
  **copy button** (`components/copy_button.rs`) → "Buttons".

**Missing but out of scope / decorative** (no `COMPONENTS.md` row, and I do not
recommend adding one): `aurora`, `meteors`, `noise`, `dot_pattern`, `confetti`,
`particle_emitter`, `ripple`, `marquee`, `type_writer`, `text_reveal`,
`text_highlight`, `gradient_text`, `gradient_border`, `glass_morphism` (also
impossible — no backdrop blur), `magnetic_button`, `tilt_card`, `number_ticker`,
`animated_{counter,text,list,presence,progress,switch,collapsible}`,
`layout_transition`, `shared_element_transition`, `svg_renderer`,
`canvas_component` (blocked by the custom-paint limit), `view_router`.

**Covered:** text/text_field/textarea/label/input→Text, Labels, Text inputs, Text
areas; icon/icon_button/icon_source→Icons; separator→Separators; scrollable/
scrollbar→Scrollable containers; button→Buttons; checkbox→Checkboxes; radio→
Radio groups; select→Selects; toggle→Switches; progress/spinner/skeleton/shimmer/
skeleton_loader/pulse_indicator→Progress, Loading indicators, Skeletons; tooltip→
Tooltips; alert→Alerts; badge→Badges; card/expandable_card→Cards; avatar/
avatar_group→Avatars; empty_state→Empty states; form→Multi-step forms (partial);
confirm_dialog/dialog/alert_dialog→Dialogs, Confirmation dialogs; toast→Toasts /
notifications; popover/popover_menu/dropdown→Popovers, Dropdown menus; context_menu/
menu→Context menus; command_palette/spotlight→Command palette; tabs/segmented_nav→
Tabs; accordion/collapsible/animated_collapsible→Accordions, Collapsible sections;
breadcrumbs→Breadcrumbs; pagination→Pagination; search_input→Search inputs;
combobox→Comboboxes; date_picker/calendar/time_picker→Date / time pickers; table/
data_table/data_grid→Tables (+ sorting, selection, column config, resizable
columns, filtering controls); virtual_list/infinite_scroll→Virtualized lists;
tree/file_tree→Tree views, File trees; split_pane/resizable→Resizable split panes;
dock→Docking layouts; sidebar/drawer_navigation→Collapsible sidebars; status_bar→
Status bars; toolbar→Toolbars; app_menu/navigation_menu→Application menus;
notification_center→Notification centre; editor/code_block→Code editor
integration, Syntax highlighting; markdown/rich_text/html→Rich-text editing;
image_viewer→Image preview; drag_drop/sortable_list→Drag and drop; charts/* and
sparkline→Charts; inline_edit→(see above).

**Cross-check:** the two lists agree on the same core hole. Both references ship
**Slider**, **Number input**, **OTP input** and a **shortcut/keyboard-display
component**; neither has a Diff viewer (GPUix itself ships `<diff>`). The
strongest "we are missing this and the ecosystem keeps building it" signals are
Slider, Number/OTP field, and the form primitives (`Field`/`Fieldset`/`Form`).

---

## 6. awesome-gpui `#libraries` — triage for a component library

Only the entries relevant to *building a component library* are listed. All
descriptions are the list's own, trimmed; star counts from the GitHub API on
2026-10-17 where checked.

| Library | Why it matters | Verdict |
| --- | --- | --- |
| **gpui-component** (`longbridge/gpui-component`) | UI kit, 17.8k★, active. **Redirects to `longbridge/gpui-kit`** — our existing reference (v0.58.0, Apache-2.0 + docs licence). | **Already have.** Re-verify our clone is current; the list's URL is the rename. |
| **adabraka-ui** | 85+ components, theme tokens, 144 examples, `GAP_ANALYSIS.md`. | **Reference** (this doc, §3). Not ported as code. |
| **Base GPUI** | Headless Base UI API surface + the strongest architecture doc of the three. | **Port the API spec** (this doc, §2). |
| **Bezel** (`crabtalk/bezel`, 175★, MIT, active) | SwiftUI-lean; "style flows through the environment, never through parameters." A different theming-architecture idea worth comparing against token-drilling. | **Reference** — read the environment-styling design; it may beat prop-drilling for our theme. |
| **guise** (`wess/guise`, 136★, MIT, active) | Mantine-inspired: theming, sizing tokens, a large component set. A second opinion on token/size scales. | **Reference.** |
| **declarative-gpui** (`DevPlus31/declarative-gpui`, 13★, Apache-2.0, quiet) | A `ui!` macro with **Tailwind-style tokens** and real Rust control flow. Closest thing to a utility-class layer over GPUI — relevant if we ever add a style-token DSL. | **Reference** (low priority). |
| **Ely GPUI Component** (`ZacharyZhang-NY/Ely-GPUI-Components`) | Component library with light/dark themes and a **live WebAssembly gallery** — a model for our "honest preview" problem. | **Reference** for the gallery approach only. |
| **gpui-form** (`stayhydated/gpui-form`, 25★, Apache-2.0, active) | Derive macro that builds form fields on a struct — a typed form-model API to study for our Form/Field design. | **Reference** — directly informs missing items §5a(8–9). |
| **gpui-hooks** (`leset0ng/gpui-hooks`, 17★, MIT) | React-style hooks for GPUI. | **Reference** — mostly interesting as evidence of what people miss from React; we already have React. |
| **gpui-symbols** (`AprilNEA/gpui-symbols`, 18★, Apache-2.0) | Native **SF Symbols** with a type-safe `Icon` component. | **Reference** for the icon-component API (Tier 1 "Icons" is still `todo`). Note: SF Symbols are Apple-licensed assets — do not copy. |
| **gpui-storybook** (`stayhydated/gpui-storybook`, 10★, Apache-2.0, active) | Storybook-like harness for GPUI apps. | **Reference** for our playground/smoke-test structure. |
| **gpui-devtools** (`joris-gallot/gpui-devtools`, 23★, MIT, active) | Element picker, layout info, computed styles, source locations. | **Reference** — the kind of tooling that makes a component library usable; consider a GPUix equivalent later. |
| **plotters-gpui** (`JakkuSakura/plotters-gpui`, 53★, MIT, stale 2025-04) | `plotters` backend for GPUI. | **Reference** only for the Charts row (Tier 3). |
| **gpui-d3rs / gpui-px** (`pierreaubert/sotf`, 59★, **GPL-3.0**) | Low-level d3-style plotting and a plotly-express-style layer. | **Ignore** — GPL-3.0 is a licence hazard for a component library, and it is Rust-only. |
| **ratex-gpui** (`packetThrower/zorite`, 68★, **GPL-3.0**) | LaTeX math renderer + a MathQuill-style formula editor. | **Ignore** for licence; **reference** for the formula-editor interaction model only if rich-text becomes a goal. |
| **gpui-pdf** (same repo, GPL-3.0) | Page-virtualized PDF viewing with full-text search. | **Ignore** (licence) — but note it as prior art for "virtualize + search a document". |
| **rhythm-gpui** (`P233/rhythm-gpui`, 10★, quiet) | Baseline offsets computed from **real font metrics** for print-like vertical rhythm. | **Reference** — directly useful for our typography/spacing tokens, which adabraka's own gap analysis flags as missing. |
| **gpui-flow** (`pacifio/gpui-flow`, 42★, MIT) and **ferrum-flow** (`tu6ge/ferrum-flow`, 90★, Apache-2.0) | Node-editor / react-flow-style canvases. | **Reference** — relevant to Tier 4 "multi-pane editing layouts" and Tier 5 "query builders", not to core components. |
| **gpui-router** (`justjavac/gpui-router`, 99★) and **gpui-nav** (`benodiwal/gpui-nav`, 27★) | Routing/navigation for GPUI apps. | **Ignore** — app-level, not a component library concern. |
| **gpui-mobile** (`itsbalamurali/gpui-mobile`, 426★) | Mobile platform layer (iOS/Android via wgpu). | **Ignore** for now; **reference** if we ever need a platform-capability matrix. |
| **gpui-tea** (`inkwadra/gpui-tea`, 10★) | Elm-architecture runtime primitives for GPUI. | **Reference** — a second opinion on the state-model question in §2/§7(2). |
| **Zopra** (`ppmpreetham/zopra`, 27★) | App framework with React-style macros for Rust. | **Ignore.** |
| **gpui-whiteboard**, **gpui-video-player**, **Crepuscularity**, **GPUI Kit Canvas**, **Pulsar-Native**, **React Native GPUI**, **create-gpui-app** | Apps/tooling, or not component libraries. | **Ignore** (GPUI Kit Canvas is a TS canvas that generates GPUI code — mildly interesting, not relevant). |

Not triaged: the 96 Apps entries (developer tools, productivity, media, system
utilities) — they are consumers of libraries, not references for one.

---

## 7. Top 5 things to adopt or port

**1. base-gpui's compound-part API contract → adopt as the public API spec for
Tier 1–2.**
Reason: it is a React library's API surface, round-tripped through Rust. Part
names, `value`/`defaultValue`/`onValueChange`, per-part builder signatures and
per-part state structs all translate to React props mechanically, and the 37
guides already document every builder with an exact signature — that is a
reviewed API design we would otherwise have to invent. Cost: **low–medium** —
a reading/translation task (37 guides), no code copy, no licence obligation
beyond attribution for design. Output: prop-type specs per component plus the
"parts" decomposition recorded in PLAN.md/ADR.

**2. base-gpui's runtime/context/parts state model → adopt as our state
convention.**
Reason: it satisfies our Effect-first rule ("keep complex state machines explicit
and testable") with a concrete, proven shape — a deep runtime owning all state and
transitions, one `reconcile` transition point, thin parts that only emit commands
and read style-state, no getter/setter pairs, and window-free unit tests. In React
that is a `useReducer`-style state hook plus a context that owns the
controlled/uncontrolled resolution, tested without rendering. Cost: **medium** —
an ADR, a convention, and a test-helper shape; the risk is over-applying it to
trivial components (their own docs say a small runtime is fine).

**3. adabraka-ui's theme token structure (+ its token-gap list) → adopt for
`packages/tokens`.**
Reason: the field list in `src/theme/tokens.rs` is shadcn-compatible semantic
roles proven on GPUI, which is precisely the mission's required token set
(background/foreground/border/muted/accent/primary/destructive/focus, radii,
borders, dimensions, density, layering). Their own gap list (typography scale,
animation durations, z-index scale, breakpoints) becomes our token backlog
instead of a blind spot. Cost: **low** — one token module plus a theme provider
and light/dark sets; the work is naming discipline, not discovery.

**4. adabraka-ui's GPUI capability map → adopt as the Phase A capability map and
the `COMPONENTS.md` "GPUix support" evidence.**
Reason: the mission forbids faking unsupported capabilities, and this is a
pre-researched, itemised list of exactly what the renderer underneath GPUix
cannot do (backdrop blur, CSS filters, clip-path, blend modes, inset shadows,
multi-stop/radial/conic gradients, quad transforms on divs, sticky, scroll snap,
z-index, container queries, aspect-ratio, keyframes, animation interruption,
reduced motion, custom paint). Cost: **near zero** to adopt; **medium** to
verify — it describes upstream GPUI, while GPUix 0.10.0 adds AccessKit roles,
focus handles and `<virtual-list>`, so each row must be re-checked against GPUix
before it is written down as fact.

**5. adabraka-ui's workspace and data tiers → adopt as the semantics reference
for Tier 3–4, *after* auditing GPUix's own built-ins.**
Reason: Tier 4 is our hardest tier and PanelUI is documentation-only. adabraka
ships real, runnable implementations with 144 examples of exactly those pieces —
`split_pane` (ratio + min/max + collapse), `resizable`, `dock`, `virtual_list`
(uniform + variable with overscan, visible-range and near-end callbacks, physics),
`file_tree`, `status_bar`, `command_palette`, `app_menu`, `data_grid`. Cost:
**medium** — read and re-express semantics; and note that GPUix 0.10.0 already
ships `<virtual-list>` (with visible-range/scroll-anchor APIs), `<code>`,
`<diff>`, `<markdown>`, `<svg>`, `<img>`, text search/highlight, plus
`DismissableLayer`/floating, `Dialog`, `Select`, `Combobox`, `Tooltip` and
`AnimatePresence`. Several Tier 3 and Tier 5 rows therefore reduce to API-shape
work over an existing host element rather than implementation.

**Honourable mention (not a port, a "don't rebuild"):** GPUix already provides
Button, Dialog, Select, Combobox, Tooltip, DismissableLayer/floating,
AnimatePresence, `<virtual-list>`, `<code>`, `<diff>`, `<markdown>`, `<svg>`,
`<img>`, `<input>`, `<textarea>`, plus AccessKit `role`/`aria-*` and real focus
handles (`references/gpuix/README.md`, `packages/react/src/index.ts`,
`packages/react/src/types/host.ts`, `packages/native/index.d.ts`). The Tier 1
Select/Combobox/Tooltip/Dialog/Button rows and the Tier 3 virtualization row and
the Tier 5 code/diff/markdown rows should start from these, not from scratch.

---

## 8. Could not determine / follow-ups

1. **adabraka-ui ships unlicensed third-party assets.** `assets/` contains 3,274
   icon files (24×24, `stroke="currentColor"`, round caps — Lucide's exact
   geometry), `assets/fonts/{Inter-*,JetBrainsMono-*}.ttf`, and
   `assets/audio/sample.mp3`. There is **no** `LICENSE`/`OFL`/`ISC` file anywhere
   under `assets/` (verified with `find`). Lucide is ISC and Inter / JetBrains Mono
   are OFL-1.1, both requiring the licence text to travel with the files. **Do not
   copy any of these assets.** Their `README.md` icon section says the library
   does not bundle icons and expects the app to supply them, which contradicts the
   repository contents.
2. **adabraka-ui's GPUI is a fork** (`package = "adabraka-gpui"`, v0.5). I did not
   diff it against upstream GPUI, so its interaction semantics (and its
   `GAP_ANALYSIS.md` limits table) are a reference to be verified, not authority.
   Its last commit is 2026-02-19 — dormant for ~8 months.
3. **GPUix capability truth is unresolved.** `GAP_ANALYSIS.md` describes upstream
   GPUI; GPUix wraps GPUI and adds AccessKit roles, `tabIndex`/focus handles, and
   `<virtual-list>`. Every limit in §3 must be re-verified against GPUix 0.10.0
   before it is recorded in `COMPONENTS.md`. GPUix's host-element list is only
   partly documented — `ElementType` comes from `@gpuix/native`
   (`packages/react/src/types/host.ts` imports it), so I could not enumerate the
   full intrinsic-element set; I confirmed `<virtual-list>`, `<code>`, `<diff>`,
   `<markdown>`, `<img>`, `<input>`, `<textarea>`, `<svg>` from
   `packages/native/index.d.ts` and the README, not exhaustively.
4. **base-gpui's provenance.** `src/tabs/AGENTS.md` and `src/checkbox/AGENTS.md`
   plus the ast-grep rules indicate LLM-assisted authoring. Its guides state that
   the public-API sections are "generated from source" (`docs/components/README.md`),
   which is good evidence, but I did not run their tests or verify behaviour.
   `docs/component-architecture.md` refers to `crates/base_gpui/...` while the
   crate root is `src/` — the doc has drifted from the layout.
5. **Bezel, guise, declarative-gpui, Ely GPUI Component, rhythm-gpui, gpui-form,
   gpui-symbols, gpui-storybook, gpui-devtools** were judged from the awesome-gpui
   description plus GitHub API metadata only. I did not clone them, so their
   inventories and API shapes are unverified.
6. **The adabraka docs site** (`https://augani.github.io/adabraka-ui/`) may
   document components the README omits; the repo's `docs/` directory holds only
   GitHub Pages assets (`index.html`, CSS, screenshots), so the site content is
   not in the clone. Not fetched.
7. **`projects.json`** (45 KB) in awesome-gpui was not parsed field-by-field; the
   star counts and liveness markers in §6 come from the GitHub API, and the
   README's own counts (e.g. "17.8k 🔥") were not reconciled against it.

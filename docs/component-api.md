# Component API contract

**Status:** accepted — ADR [`0004`](../.agents/adr/0004-compound-part-api.md),
plan [`200`](../.agents/slop/plans/200-adopt-compound-part-api.md).
Applies to every Tier 1–2 component in `packages/components` and
`packages/primitives`.

This is the **public API spec**. It is a translation of `base-gpui`'s
compound-part contract (MIT; see [`LICENSES/base-gpui.md`](../LICENSES/base-gpui.md))
into React over GPUix 0.11.0. No Rust source is copied. Where GPUix lacks a
capability, the contract says so instead of naming an API that would not work.

## Adoption status

The contract is accepted; adoption is incremental, and §9 records the migration
history. No landed component currently deviates.

| Rule | Status |
| ---- | ------ |
| Compound parts (§1) | **adopted** — Card, Dialog, Tabs, Accordion, menus, Alert and the rest export their parts |
| Typed-by-position children (§1) | **adopted with a render check** — `PartChildren` narrows children to elements and conditionals (text is a compile error); part identity is enforced by `internal/parts.ts` at render, because React 19's JSX types are not nominal (plan 304 §2) |
| Controlled/uncontrolled names (§2) | **adopted** — `value`/`defaultValue`/`onValueChange` across the landed components |
| State-aware `style`/`children(state)` (§3) | **adopted for `style`** — eleven parts export a `<Part>State` and accept `StateStyle<<Part>State>` from `@gpuix/react/floating` (plan 305); `children(state)` is not offered, and button-shaped triggers keep a plain `StyleDesc` until `@gpuixui/primitives` owns the button |
| Shared keyboard contract (§4) | **adopted** — Enter activates on the press, Space on the release, a **repeat** (`event.isHeld`) never does, and a Space press swallows the platform default so one keystroke cannot also scroll the region behind the control. `defaultPrevented` is not read: this package's handlers run before a caller's, so an earlier handler cannot have set it |
| Accessibility subset (§5) | **adopted** — every component's docs record the gaps |

## 1. Compound parts

- A component is a **compound**, not a monolithic widget: one exported
  component and one props type per part, root first —
  `<Tabs><TabsList><TabsTrigger/><TabsList/><TabsContent/></Tabs>`.
- A component with one styled region exports **one part** (`Badge`, `Avatar`);
  it does not grow a `Root` that exists only to satisfy this rule.
- Children are typed **by position**, as far as React allows. A parent declares
  `children?: PartChildren` — elements and conditional slots, never text — and
  installs one family-scoped `assertParts` check. A part of the same component
  used in a parent that does not host it throws with both names
  (`TabsContent cannot be used inside TabsList. …`); decoration — a `Button`, a
  `Badge`, a `div`, text — is not a misplaced part and stays allowed.
- **Part identity cannot be a compile error.** React 19 types every JSX
  expression as `React.JSX.Element` — `ReactElement<any, any>` — so any element
  satisfies a part-typed slot; a `TabsContent` inside a `TabsList` typechecks
  (measured with `tsc`, plan 304 §2). The check therefore runs at render, where
  `element.type` is still the component reference. Never match `React.Children`
  by string.
- The root part owns the controlled-state props; a part never duplicates them.

## 2. Controlled and uncontrolled — one rule, one place

- `value` makes the part controlled: the selection changes **only** when the
  caller supplies a new value.
- `defaultValue` is the uncontrolled initial value. `value` and `defaultValue`
  are mutually exclusive; a component that receives both logs one warning and
  ignores `defaultValue`.
- `onValueChange(value)` fires on request for value-shaped parts.
- Boolean parts use `onCheckedChange(checked)` — base-gpui's
  `on_checked_change` — because "value" is not a boolean. A part that already
  shipped an `onChange` alias keeps it as deprecated; new work names neither
  callback `onChange`.
- The resolution lives in exactly one hook — `useControllableState` from
  `@gpuix/react/floating` (part of the pinned release) or this package's
  `internal/controllable.ts` wrapper. Do not write a second implementation.

## 3. State-aware styling

GPUix has no CSS, no data attributes and no CSS variables. A part is styled from
a public state object instead:

```tsx
<TabsTrigger
  value="billing"
  style={(state) => ({ opacity: state.active ? 1 : 0.85 })}
/>
```

- `style` accepts `StateStyle<PartState>` — a `StyleDesc` **or**
  `(state: PartState) => StyleDesc` — from `@gpuix/react/floating`, the same
  type its own headless `ComboboxItem`/`SelectItem` use. `resolveStyle` resolves
  it and the result merges after the part's own rules, so a callback wins exactly
  where an object style would.
- The state object is public API: name it `<Part>State` and export the type.
  State names come from `base-gpui`'s per-part structs — `active`, `checked`,
  `closed`, `disabled`, `focused`, `highlighted`, `invalid`, `open`,
  `orientation`, `selected` — and are the only vocabulary allowed.
- **`focused` arrives on every path, and is still not the cue.** A `Tab`
  traversal focuses the element and delivers its focus handler — re-measured on
  0.11.0 by the playground's `tabs-lifecycle` (`focuses=1`) and
  `tooltip-lifecycle` (the tip opens on the traversal). The earlier reading of
  `focuses=0` took the frame before the event landed, so a `style` callback
  keyed on `focused` sees a press, a click, a traversal or a programmatic
  `focusElement`. It stays presentational: the focus **cue** is the ring every
  part declares at rest (`keyboardRing`), so the runtime paints the
  `focusVisible` outline even when a caller's callback repaints the part. Six
  parts carry the
  flag — `AccordionTrigger`, `CollapsibleTrigger`, `TabsTrigger`, `SearchInput`,
  `FieldInput`, `TimePickerSegment` — and `api.test.ts` holds each one to the
  ring, so a part cannot ship the flag as its only focus feedback.
- Every token lookup goes through the theme seam (`internal/theme.ts`); a
  component never repeats a raw role name or writes a colour/shadow/radius
  literal. The seam is also where a consumer gets the theme: the package root
  publishes `ThemeProvider`, `useTheme`, `lightTheme` and `darkTheme` — the
  token package's own exports, never a second context — so an app whose
  manifest declares only `@gpuixui/components` can still theme it. Without a
  provider a part paints the light theme; the values and the extension
  mechanism (`createTheme`/`extendTheme`) stay in `@gpuixui/tokens`.
- The runtime dims every other focusable element while one holds keyboard focus
  (`keyboardFocusDim`, 40%). On a **filled action** that composites the label
  into its own fill — 5.0–10.5:1 at rest becomes 1.3–3.2:1 on every strip — so
  `internal/button.tsx`'s three filled variants paint
  `keyboardFocusDim: false` and keep their label (`button.test.tsx` holds the
  declaration and measures the collapse with `keyboardDimFailures`). A ghost
  action has no fill to collapse into, so it keeps the cue.
- A **text-entry host** is content too: the dim composites the reader's value
  and placeholder into the field's own fill. Every host spreads `keepContent`
  from the seam — `FieldInput`, `SearchInput`, `TagInputField`, both
  `TimePickerSegment`s, `MentionInput`, `ColorPicker`'s hex field,
  `CommandMenuInput`, `ComboboxInput`, `InlineEdit`'s input and `ChatComposer`'s
  field — and `keyboard-dim.test.tsx` holds each one. A caller's `style` merges
  last and can put the cue back.
- A **disabled action** paints one of two mechanisms, and which one the contract
  measures decides it. A filled action wears the neutral
  `disabled`/`disabledForeground` pair (`disabledAction`), the pair
  `contrastPairs` measures on every surface a control sits on: a fade composites
  the label into the strip behind it, so the same disabled primary reads two
  colours on a page and on a card and lands at 1.47:1–1.49:1 on the card of four
  shipped light styles. A ghost action has no fill to collapse into, so it keeps
  the fade at the token's `disabledOpacity`. **Neither answers the pointer**:
  both replace the hover and press fills with the resting one. `internal/button.tsx`
  owns both paths, `button.test.tsx` holds the pair, the ghost's fade and the
  still pointer, and every component that disables an action (an edge control, a
  busy dialog) inherits the rule.

Which parts have a state, and which do not, is a measured line:

- **yes** — `TabsTrigger`, `AccordionTrigger`, `CollapsibleTrigger`, `ListItem`,
  `MenuItem`, `MenuCheckboxItem`, `PaginationItem`, `SearchInput`, `FieldInput`,
  `TimePickerSegment`, `ComboboxItem` (plus `ComboboxList.itemStyle` for the
  rows it renders). Their state is not expressible in `StyleDesc`.
- **no** — button-shaped triggers (`DialogTrigger`, `PopoverTrigger`,
  `DropdownMenuTrigger`, `ContextMenuTrigger`, `DatePickerTrigger`,
  `AlertDismiss`, `PaginationPrevious`/`Next`). Their only state beyond
  `StyleDesc` is `disabled`, and they draw through the local
  `internal/button.tsx` stand-in that `@gpuixui/primitives` replaces; adding a
  second state layer there would be deleted with it.
- **no `children(state)`** — no landed part changes its markup by state, and the
  runtime's own `StateStyle` path is `style`; a part that genuinely needs
  different markup composes a different part.

## 4. Keyboard

Keyboard behaviour is the shared contract in
`packages/primitives/src/core/keyboard.ts` (plan `030`):

- Enter activates on key down, Space on key up, and `defaultPrevented` is
  respected;
- one roving tab stop per composite, arrows wrap and skip disabled parts;
- Home/End and Escape follow the component's guide;
- every component's docs page records its own key table, drawn from
  `base-gpui`'s `## Keyboard interaction` section.

This package has adopted the rule whole, without importing the primitives'
module: `internal/key.ts` carries the same three decisions as pure predicates —
`isActivation(event, phase)`, `swallowsDefault(event, phase)`, and the
`activationHandlers(activate, observe)` pair that installs both halves on a plain
control.

- **Enter** activates on the press, so a held key does not fire repeatedly.
- **Space** activates on the **release**, the way a platform button does, and
  the press `preventDefault()`s: otherwise one keystroke would also scroll the
  scroll region the control sits in, and a press a reader cancels before
  releasing would already have acted.
- A **repeat** (`event.isHeld`) is never an activation, so holding either key
  runs one action.

`defaultPrevented` is the one part of the contract this package does not read:
its handlers run before a caller's, so nothing can have set it by then. The
composites that own a key handler on a container — the tabs rail, the list root,
an accordion header, the menu surface, the calendar grid — install the same two
halves, and `src/behaviour/activation-release.test.tsx` holds each of them to the
split, alongside `src/internal/key.test.ts` for the decisions themselves.

## 5. Accessibility — the supported subset only

Map `base-gpui`'s AccessKit roles onto the GPUix **verified** subset (plan
`020`): `role`, `aria-label`, `aria-description`, `aria-id`, `aria-expanded`,
`aria-selected`, `aria-valuetext`, `aria-level`; `tabIndex`/`autoFocus`; and the
renderer's `focusElement`/`focusNext`/`focusPrevious`/`focusNextWithin`.

Do not invent `aria-checked`, `aria-valuenow`, `aria-labelledby`,
`aria-describedby`, `aria-controls`, `aria-current` or `aria-modal` — 0.11.0
does not accept them. Record the gap as a limitation and use the strongest
supported alternative (`aria-selected`, `aria-valuetext`, a required `label`).

## 6. Translation table

| `base-gpui` (Rust) | Our React |
| ------------------ | --------- |
| `TabsRoot > TabsList > TabsTab` | `Tabs > TabsList > TabsTrigger` |
| `.value(v)` / `.default_value(v)` | `value` / `defaultValue` |
| `.on_value_change(f)` | `onValueChange` |
| `.on_checked_change(f)` | `onCheckedChange` |
| `.style_with_state(\|state, part\| …)` | `style` as `StateStyle<PartState>` **or** `children(state)` |
| `TabsTabStyleState { active, disabled, … }` | exported `TabsTriggerState` type |
| `actions.rs` + `.key_context(..)` + `.on_action(..)` | `tabIndex` + `onKeyDown` + the primitives keyboard contract |
| `base_gpui::init(cx)` | nothing — React/GPUix has no per-component init |

## 7. State model

Every stateful component is three modules carved by **knowledge, not by widget**
(ADR [`0005`](../.agents/adr/0005-component-state-model.md)):

| Module | Responsibility |
| ------ | -------------- |
| `<component>/state.ts` | the pure runtime: commands in, part-shaped style-state out. Imports Effect's pure modules only — no React, no GPUix |
| `<component>/context.tsx` | the thin injection vehicle: `read`/`update`/`select`; the **only** place `useControllableState` is called |
| `<part>.tsx` | a thin renderable part: one event emits one command, then reads its style-state |

- Commands are a tagged union (`{ _tag: "select", value }`), never a setter.
- A query answers a part-shaped question ("am I active?"), never "what is the
  selected index?". Parts never read each other's raw state.
- `packages/components/src/core/runtime.ts` provides the shared shape —
  `initial`, `reduce`, `query` and `run` — and is what a new component's
  `state.ts` builds on. `run` folds commands from the initial state for tests and
  event replay; plan `201`'s cross-package `runCommands` helper in
  `packages/testing` is the same fold for suites outside this package.
- Components with no state (`Badge`, `Separator`, `Text`) have no runtime; do not
  invent one.
- The controlled/uncontrolled rule lives only in the context; the runtime never
  reads `value`/`defaultValue` and never calls a consumer callback. The context
  calls the callback from the runtime's outcome.

Landed components adopt this convention when they are next changed; plan `201`
records that a rewrite is a follow-up, not a prerequisite.

## 8. Parts by component

The **Source** column is the authority for a component that is already built;
the base-gpui guide is the shape reference, not a transcription target. `—`
means base-gpui has no guide for that component and the listed plan defines the
parts.

This table is **executed**, not prose: `packages/components/src/api.test.ts`
reads the Tier 2 rows below and fails when a shipped component has no row, when a
row names a part the package does not export, or when an exported part of a
component's family appears in no row. Adding a part therefore means updating the
row in the same change.

### Tier 1 — foundational

| Component | Parts | base-gpui guide | Source |
| --------- | ----- | --------------- | ------ |
| Text / typography | `Text` | — | plan 030 |
| Icons | `Icon` (icon set) | — | plan 031 |
| Separators | `Separator` | `Separator` | plan 030 |
| Spacers | `Spacer` | — | plan 030 |
| Stack / layout primitives | `Stack`, `Grid` | — | plan 030 |
| Boxes / containers | `Box` | — | plan 030 |
| Scrollable containers | `ScrollArea` | `ScrollAreaRoot`/`Viewport`/`Scrollbar`/`Thumb`/`Corner`/`Content` | plan 030 |
| Buttons | `Button` | `ButtonRoot` | plan 030 |
| Button groups | `ButtonGroup` | `ToggleGroup` (shape only) | plan 048 |
| Labels | `Label` | `FieldLabel` | plan 030 |
| Text inputs | `Input` | `Input` | plan 030 |
| Text areas | `TextArea` | — | plan 030 |
| Checkboxes | `Checkbox` | `CheckboxRoot`/`Indicator` | plan 030 |
| Radio groups | `RadioGroup` | `RadioGroupRoot`/`Radio`/`Indicator` | plan 030 |
| Selects | `Select` | `SelectRoot` + 19 parts | GPUix 0.11.0 `Select` |
| Switches | `Switch` | `SwitchRoot`/`Thumb` | plan 030 |
| Progress | `Progress` | `ProgressRoot`/`Track`/`Indicator`/`Label`/`Value` | plan 030 |
| Tooltips | `Tooltip` | `TooltipRoot`/`Trigger`/`Popup`/… | GPUix 0.11.0 `Tooltip` |
| Skeletons | `Skeleton` | — | plan 030 |
| Loading indicators | `Spinner` | — | plan 030 |
| Slider | `Slider` | `SliderRoot`/`Track`/`Thumb`/`Control`/`Indicator`/`Label`/`Value` | plan 053 |
| Range slider | `RangeSlider` | `Slider` (two thumbs) | plan 053 |
| Meter | `Meter` | `MeterRoot`/`Track`/`Indicator`/`Label`/`Value` | plan 053 |
| Number field | `NumberField` | `NumberFieldRoot`/`Input`/`Increment`/`Decrement`/`Group`/`ScrubArea`/`ScrubAreaCursor` | plan 054 |
| OTP field | `OTPField` | `OTPFieldRoot`/`Input` | plan 054 |
| Toggle | `Toggle` | `Toggle` | plan 054 |
| Rating | `Rating` | — | plan 054 |

### Tier 2 — composition and feedback

| Component | Parts | base-gpui guide | Source |
| --------- | ----- | --------------- | ------ |
| Cards | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | — | plan 111 |
| Badges | `Badge` | — | plan 111 |
| Avatars | `Avatar` | `AvatarRoot`/`Image`/`Fallback` | plan 111 |
| Alerts | `Alert`, `AlertIcon`, `AlertContent`, `AlertTitle`, `AlertDescription`, `AlertDismiss` | — | plan 158 |
| Lists / list items | `List`, `ListItem`, `ListItemTitle`, `ListItemDescription` | — | plan 111 |
| Empty states | `EmptyState` | — | plan 111 |
| Inline validation | `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldInput` | `FieldRoot`/`Label`/`Description`/`Error`/`Validity`/`Item`/`Control` | plan 115 |
| Toasts / notifications | `ToastProvider`, `ToastViewport` (+ `useToast`; an action is a draft field with a provider-owned handler, not a part) | `ToastProvider`/`Root`/`Title`/`Description`/`Action`/`Close`/`Viewport`/`Portal`/`Content` | plan 115, 322 |
| Dialogs | `Dialog`, `DialogTrigger`, `DialogClose`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter` | `DialogRoot`/`Trigger`/`Popup`/`Backdrop`/`Title`/`Description`/`Close`/`Portal`/`Viewport` | plan 112 |
| Confirmation dialogs | `ConfirmDialog` (composes the Dialog parts) | `AlertDialogRoot`/`Trigger`/`Popup` | plan 112 |
| Popovers | `Popover`, `PopoverTrigger`, `PopoverContent` | `PopoverRoot`/`Trigger`/`Popup`/`Arrow`/`Close`/`Portal`/`Positioner`/`Viewport`/`Backdrop`/`Title`/`Description` | plan 112 |
| Dropdown menus | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuGroup`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent` | `MenuRoot` + 18 parts | plan 114 |
| Context menus | `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent`, `ContextMenuItem`, `ContextMenuCheckboxItem`, `ContextMenuGroup`, `ContextMenuLabel`, `ContextMenuSeparator`, `ContextMenuSub`, `ContextMenuSubTrigger`, `ContextMenuSubContent` | `ContextMenuRoot`/`Trigger` | plan 114 |
| Command menus | `CommandMenu`, `CommandMenuInput`, `CommandMenuList`, `CommandMenuItem`, `CommandMenuEmpty` | — | plan 114, 301 |
| Tabs | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | `TabsRoot`/`List`/`Tab`/`Panel`/`Indicator` | plan 113 |
| Accordions | `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` | `AccordionRoot`/`Header`/`Item`/`Trigger`/`Panel` | plan 113 |
| Collapsible sections | `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` | `CollapsibleRoot`/`Trigger`/`Panel` | plan 113 |
| Breadcrumbs | `Breadcrumb`, `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator` | — | plan 113 |
| Pagination | `Pagination`, `PaginationPrevious`, `PaginationList`, `PaginationItem`, `PaginationNext`, `PaginationEllipsis` | — | plan 113, 300 |
| Search inputs | `SearchInput` | `AutocompleteRoot`/`AutocompleteValue` (shape only) | plan 116 |
| Comboboxes | `Combobox`, `ComboboxTrigger`, `ComboboxContent`, `ComboboxInput`, `ComboboxList`, `ComboboxItem`, `ComboboxEmpty` | `ComboboxRoot` + 24 parts | plan 116, 302 |
| Date pickers | `DatePicker`, `DatePickerTrigger`, `DatePickerContent`, `DatePickerCalendar` | — | plan 119, 303 |
| Time pickers | `TimePicker`, `TimePickerSegment`, `TimePickerSeparator`, `TimePickerClear` | — | plan 132, 303 |
| Fieldset | `Fieldset`, `FieldsetLegend` | `FieldsetRoot`/`Legend` | plan 306 |
| Stepper | `Stepper`, `StepperStep` | — | plan 307 |
| Form | `Form` (render prop; one part) | `Form` | plan 308 |
| Timeline | `Timeline`, `TimelineItem` | — | plan 311 |
| Countdown | `Countdown` | — | plan 312 |
| Inline edit | `InlineEdit` (render display/input swap; one part) | — | plan 313 |
| Navigation Menu | `NavigationMenu`, `NavigationMenuList`, `NavigationMenuItem`, `NavigationMenuTrigger`, `NavigationMenuContent`, `NavigationMenuLink` | — | plan 320 |
| Mention input | `MentionInput`, `MentionInputList`, `MentionInputItem` | — | plan 319 |
| Preview Card | `PreviewCard`, `PreviewCardTrigger`, `PreviewCardContent` | `PreviewCardRoot`/`Trigger`/`Popup` (shape only) | plan 317 |
| Color picker | `ColorPicker` (swatches + HEX; one part) | — | plan 318 |
| Hotkey-recorder input | `HotkeyRecorder` | — | plan 316 |
| Carousel | `Carousel`, `CarouselTrack`, `CarouselSlide`, `CarouselControl` | — | plan 315 |
| Drawer | `Drawer`, `DrawerTrigger`, `DrawerClose`, `DrawerContent`, `DrawerHeader`, `DrawerTitle`, `DrawerDescription`, `DrawerFooter` | `DialogRoot`/`Trigger`/`Popup`/`Backdrop`/`Title`/`Description`/`Close`/`Portal`/`Viewport` (shape only) | plan 309 |
| Tag / token input | `TagInput`, `TagInputField`, `TagInputChip` | — | plan 314 |
| Keyboard shortcuts / keycap display | `KeyboardShortcuts`, `KeyboardShortcutsGroup`, `KeyboardShortcut`, `Keycap` | — | plan 310 |
| Message scroller | `MessageScroller`, `MessageScrollerViewport`, `MessageScrollerItem`, `MessageScrollerJumpToLatest` | — | plan 206 |
| Chat | `ChatRoot`, `ChatMessages`, `ChatComposer` | — | plan 207 |
| Message | `MessageRoot`, `MessageAvatar`, `MessageContent`, `MessageActions` | — | plan 207 |

`TimePicker` is a **field**, not a trigger with a popup. The §9 plan line that
said "the same for `TimePicker`" predated the measured reason it is a field: the
runtime has no `aria-valuenow`, so a popup spinbutton could not announce its
value. The field root, its two segments, the separator and the clear control are
the honest parts.

### Animated primitives (plan 600)

| Component | Parts | base-gpui guide | Source |
| --------- | ----- | --------------- | ------ |
| Typing text | `TypingText` | — | plan 600 |
| Counting number | `CountingNumber` | — | plan 600 |
| Auto height | `AutoHeight` | — | plan 600 |
| Rotating text | `RotatingText` | — | plan 600 |
| Splitting text | `SplittingText` (one part) | — | plan 600 |

**Planned Tier 2 additions** — none. The last reserved family, Chat and
Message (plan `207`), landed with its parts unchanged, so every part table above
is implemented. A new reservation goes here with its parts fixed before the
implementation starts, and `src/api.test.ts` refuses a reserved part the package
already exports.

## 9. Landed deviations and migration

**None remain.** Every `done` Tier 2 component exports the parts its §8 row
names. Alert was the first migration (plan `158`); Pagination (`300`), CommandMenu
(`301`), Combobox (`302`) and the date/time pickers (`303`) followed. The rule
still holds for new work: a part may only be split out with its own behaviour
test, docs row and inventory record.

`Badge`, `Avatar`, `EmptyState` and `SearchInput` are one styled region and are
compliant as single parts.

## 10. Provenance

- `base-gpui` — MIT, `Copyright (c) 2026 Luke Tandjung`, commit `64b2233`;
  design reference only, no source copied
  ([`LICENSES/base-gpui.md`](../LICENSES/base-gpui.md)).
- GPUix capability facts — plan `020` §1 and `docs/gpuix-capabilities.md`
  (plan `203`).
- The per-component parts and keyboard rules — plans `110–119`, `030`, `053`,
  `054`, `205–207`.

## 11. Motion

The library's overlays and the tab rail **move**: a surface fades and travels a
few pixels, and the tab pill slides between its triggers. Three packages hold
that contract between them, and no component re-implements a part of it.

| Piece | Owns |
| ----- | ---- |
| `@gpuixui/tw` | the resting recipe, including shadcn's motion classes as provenance |
| `@gpuixui/motion` (`motionTiming`) | the levels (120 / 160 / 200 / 320 / 500 ms), the per-phase easing and the reduced-motion policy |
| `packages/components/src/internal/presence.tsx` | the frames (fade + offset), the mount window, and the `motion` prop a surface hands the runtime |

**The runtime executes the tween.** `@gpuix/native@0.11.0` animates `opacity`,
`width`, `height`, `top`, `right`, `bottom`, `left` and `borderRadius` on its own
clock; it has **no `transform`**, so a library surface never scales, rotates or
translates beyond an inset offset (upstream issue #102, plan `600` §3). shadcn's
`zoom-in-95` stays unsupported rather than being faked.

**Presence is a duration.** A closed surface stays mounted for its exit tween and
unmounts when that duration has elapsed (`useSurfacePresence`). `AnimatePresence`
reports an exit only through `onMotionComplete` on a `motion.div`, and the
popover, menu and preview-card surfaces are hosted by `FloatingLayer`'s own
element, so one mechanism covers every surface. The consequence a consumer sees:
a dismissal is *immediate* in state (focus returns, `onOpenChange` fires) while
the box fades out, and an element disappears from the tree a level's duration
later.

**Per surface:**

| Surface | Movement | Level |
| ------- | -------- | ----- |
| Dialog, Command menu | fade + 8px rise | `slow` (320 ms) |
| Drawer | fade + 12px from its own edge | `slow` |
| Popover, Dropdown menu, Context menu | fade + 8px / 4px from the trigger's side | `normal` (200 ms) |
| Preview card | fade + 4px from the trigger's side | `fast` (160 ms) |
| Toast | fade + 16px from the right edge | `notice` (500 ms) |
| Accordion panel | height from 0 to the body's measured height, plus a fade | `normal` |
| Tabs pill | `left`/`top`/`width`/`height` between measured trigger boxes | `normal` |

**The preference is the application's.** GPUix exposes no reduced-motion query,
so `MotionProvider` takes it:

```tsx
<MotionProvider preference={reduceMotion ? "reduced" : "animated"}>
  <App />
</MotionProvider>
```

Under `"reduced"` a tween's duration is zero and no easing is named: the resting
frame still paints, only the journey is removed. The same rule holds for a
component that has no provider (the default is `"animated"`).

**Verification.** `packages/components/src/behaviour/presence.test.tsx` measures
the movement and the mount window in the real renderer: bounds move by the
surface's offset, the exit keeps the box painted and then removes it, the
reduced preference paints the resting frame with no travel, the accordion grows
from zero to its measured height, and the tab pill lands exactly on the next
trigger's box. The live playground proves the fade itself (a window reports
painted bounds, not painted opacity).

## 12. Native text hosts

An `<input>` or `<textarea>` is drawn by the runtime's text engine rather than by
the style system, so its value, placeholder, caret and selection wash arrive
through a `theme` prop. A host given none layers them on GPUix's **built-in dark
palette**, which is why a light field used to paint a hint and a caret chosen for
a dark surface.

Every field in this package hands its host `nativeTextTheme(theme, fill)` from
`@gpuixui/tokens`, with `input` for a plain field and `background` for a
composite field that paints the page role as its own fill:

| Fill | Components |
| ---- | ---------- |
| `input` | `FieldInput`, `TimePickerSegment`, `CommandMenuInput`, `ComboboxInput` |
| `background` | `SearchInput`, `TagInputField`, `MentionInput`, `InlineEdit`, `ColorPicker`'s hex field, `ChatComposer` |

The roles are measured on both fills by `packages/tokens/src/native-text.test.ts`;
`packages/components/src/behaviour/native-text.test.tsx` holds every host's
wiring and the fill the field actually paints.

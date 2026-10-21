# Component API contract

**Status:** accepted — ADR [`0004`](../.agents/adr/0004-compound-part-api.md),
plan [`200`](../.agents/slop/plans/200-adopt-compound-part-api.md).
Applies to every Tier 1–2 component in `packages/components` and
`packages/primitives`.

This is the **public API spec**. It is a translation of `base-gpui`'s
compound-part contract (MIT; see [`LICENSES/base-gpui.md`](../LICENSES/base-gpui.md))
into React over GPUix 0.10.0. No Rust source is copied. Where GPUix lacks a
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
| Shared keyboard contract (§4) | **adopted per component** — `packages/primitives`' keyboard module is not yet a dependency of this package (interlock) |
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
- **Host handlers compose.** A part that accepts a host `onX` prop and needs the
  same event calls the caller's handler exactly once and then runs its own
  action. Never spread `...rest` after an internal handler (that silently
  replaces the part's action) and never install an internal handler after
  `...rest` without forwarding (that silently drops the caller's). A handler the
  prop type deliberately omits is the component's own callback, not a host
  handler — that is how `MentionInput`/`TagInputField` own `onChange` and
  `MenuSubTrigger` owns `onSelect`.
- The root part owns the controlled-state props; a part never duplicates them.

## 2. Controlled and uncontrolled — one rule, one place

- `value` makes the part controlled: the selection changes **only** when the
  caller supplies a new value.
- `defaultValue` is the uncontrolled initial value. Supplying both props is
  tolerated: `value` is authoritative and `defaultValue` is ignored — no warning
  or error is emitted, because the hook cannot log through the Effect runtime and
  this package does not use `console.*`.
- `onValueChange(value)` fires on request and is the change callback for a
  selection. A request for the value the part already holds is a **no-op** in
  both modes: it changes nothing and calls no callback (plan `517`). A component
  whose value is not a selection names its pair after the state it owns — for
  example `onOpenChange`, `onQueryChange`, `onPageChange`, `onStepChange` — and
  the same no-op rule applies. A component may guard a no-op earlier for its own
  logic; the hook is still the one place that enforces the rule.
- A refused state request has no side effects. When a caller keeps a non-modal
  overlay open after `onOpenChange(false)` — an unsaved draft, a running job —
  the surface stays painted **and** keeps the user's focus; focus restoration
  belongs to the accepted `open -> false` transition, never to the request
  (plan `704`, `internal/close-focus.ts`).
- The resolution lives in exactly one hook — `useControllableState` from
  `@gpuix/react/floating` (published in 0.10.0) or this package's
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
- Every token lookup goes through the theme seam (`internal/theme.ts`); a
  component never repeats a raw role name or writes a colour/shadow/radius
  literal.

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
- **`autoFocus` is state.** The runtime applies native focus after React's
  effects and never dispatches `onFocus`, so a part that paints a ring from
  `focused` initialises that state from `autoFocus` (plan `388`); the two roving
  parts (`TabsTrigger`, `ListItem`) also move their root's highlight.

## 3a. Animated surfaces

An animated box is the same host surface as any other part, and it is addressed
the same way. `@gpuix/react@0.10.0`'s published `MotionDivProps` omits `testId`,
`role` and the `aria-*` props even though its `MotionDiv` forwards every prop to
the native `div`, so this package renders through `internal/motion.tsx`'s
`MotionSurface` (`MotionProps & Props`), never a raw `motion.div` (plan `597`).

- Where the animated box *is* the part's box, its `testId` is
  **`<part testId>-surface`** — `CollapsibleContent`, `AccordionContent`,
  `PopoverContent` and `DrawerContent`; a `Toast` card's is
  **`toast-<id>-surface`**. The part keeps its own id: the content box (whose
  natural height is measured while clipped) and the tween box are different
  boxes.
- A part with no `testId` authors no `-surface` id.
- A full-window fade (Dialog) has no derived id: its box is the window, and
  `dialog-backdrop` already identifies it.

## 4. Keyboard

Keyboard behaviour is the shared contract in
`packages/primitives/src/core/keyboard.ts` (plan `030`), implemented through
this package's `internal/key.ts` predicates and `internal/activate.ts`:

- **Once per keystroke.** A key-repeat event (`EventPayload.isHeld`) never
  activates, so holding Enter cannot toggle a section or run a command twice.
- **Enter on key down.** It is the action key for buttons, rows and cells.
- **Space on key up for a button-shaped control.** Every control built on
  `internal/activate.ts` — the `Button`/`IconButton` stand-in, the search, time
  and hotkey clear affordances, `AccordionTrigger`, `CollapsibleTrigger`,
  `TabsTrigger`, `BreadcrumbLink`, `HotkeyRecorder`, the `InlineEdit` display
  and the `TagInput` chip control — activates Space on release, so a user can
  move focus away before letting go. A nested button-shaped control claims the
  key it handled (`internal/event-claim.ts`) so its enclosing control does not
  act on the same keystroke. A claim lives **one task**, not one microtask:
  a live window delivers the enclosing surface's handler for one propagation
  across a microtask (measured, plan `587`), so a shorter claim let one Escape
  close two nested layers. Every enclosing handler reads the same claim for the
  rest of that task — a submenu, its menu and the dialog around both all skip
  one Escape (plan `669`) — and a genuinely new event is a new task. The claim
  also carries **Tab ownership**: a popover walks its own tab stops and claims
  each press, so the trap of an enclosing `Dialog` or `Drawer` leaves that press
  alone and resumes once the panel closes (plan `719`); a modal does the same, so
  a `ConfirmDialog` or `Dialog` opened from a dialog owns the keyboard and the
  enclosing trap resumes on the next press (plan `728`).
  **Layer order is nesting order**: every overlay's dismiss layer ranks by how
  deeply it is nested in other overlays (`Dialog`, `Drawer`, `Popover`, the
  menus, the combobox), with open order only breaking ties between siblings — so
  a popover, menu or confirmation mounted together with its dialog, and a
  submenu inside a menu, are still the top layer (plans `730`, `732`). A modal
  additionally ranks its **initial focus** and returns focus to the enclosing
  surface (plan `730`). **A modal's opener is the element the user will return
  to**: a menu row that opens a modal unmounts with its menu in the same commit,
  so the closing menu names its trigger as that row's focus successor and the
  modal restores to the trigger instead of to a vanished row (plan `826`,
  `internal/focus-successor.ts`). The same handover covers a **whole surface**
  that closes into another modal: a command palette that opens a dialog captures
  its own search field as that dialog's opener, so the palette's close names the
  field against the control that opened the palette and the dialog restores
  there. The mark is durable until the modal that captured it restores, consumed
  by that read, and bounded — it is keyed by the id of an element that has
  vanished, which no later modal can capture (plan `827`). A **toast action** is
  the same vanishing opener: the action runs a handler that may open a modal and
  then leaves with its card, so the card records the focused host when it arrives
  and names the action against that origin before the handler runs; the modal
  captures the raising control and restores there, while a second live card's
  dismiss control still wins (plans `770`, `830`). The card resolves that origin
  **when the action runs**, because the raising control is often removed by its own
  surface in the same gesture: a menu row, a popover control or a palette action
  names its value at raise time, and the surface's own close already named where
  its focus went (plans `826`, `832`), so the toast follows that mark when the
  original control is gone. The resolution prefers a live origin, accepts a marked
  target only while it is live, and reports nothing otherwise, so it can never
  invent a target (plan `837`). The behaviour harness forgets
  every mark between tests because native host ids restart with each renderer.
  **A layer answers for its own surface**: the runtime reports
  `mouseDownOutside` by bounds, not by tree, so a nested panel painted beyond an
  ancestor's box is announced as an outside press for that ancestor. Each layer
  therefore names the surface it paints, and a press inside it never dismisses
  it — a picker popup, menu panel or popover hanging below a dialog keeps the
  press meant for its row, instead of closing (and losing the choice and focus)
  on mouse down (plan `816`).
  **Ownership is a property of the surface, not of the stack**: an overlay that
  is not dismissible still owns its paints. The toast stack registers each card
  **and its own controls** (the viewport's `children` slot), and it lives in its
  own deferred anchored layer above every modal, because a dialog's veil is an
  anchored layer too and would otherwise paint over it and take its presses
  (plans `820`, `823`). Ownership decides whose control runs; **modality decides
  whether the press also dismisses**: a press on the stack closes a non-modal
  overlay beneath it (a menu, popover, picker, preview card or notification
  centre) exactly as any outside press does, while a modal — the dialog or drawer
  holding the user's work — keeps its surface open (plan `824`).
  Composite rows and cells (`List`, menu rows, grid
  and calendar cells) keep Space as a **selection** key on key down, per ARIA's
  listbox/grid patterns.
- **No default suppression.** `@gpuix/react@0.10.0`'s `EventPayload` has no
  `preventDefault` and no `defaultPrevented`, so a component cannot cancel the
  runtime's own key handling; the contract says what the component does, not
  what it suppresses.
- One roving tab stop per composite, arrows wrap and skip disabled parts;
  Home/End and Escape follow the component's guide;
- every component's docs page records its own key table, drawn from
  `base-gpui`'s `## Keyboard interaction` section.

## 5. Accessibility — the supported subset only

Map `base-gpui`'s AccessKit roles onto the GPUix **verified** subset (plan
`020`): `role`, `aria-label`, `aria-description`, `aria-id`, `aria-expanded`,
`aria-selected`, `aria-valuetext`, `aria-level`; `tabIndex`/`autoFocus`; and the
renderer's `focusElement`/`focusNext`/`focusPrevious`/`focusNextWithin`.

Do not invent `aria-checked`, `aria-valuenow`, `aria-labelledby`,
`aria-describedby`, `aria-controls`, `aria-current` or `aria-modal` — 0.10.0
does not accept them. Record the gap as a limitation and use the strongest
supported alternative (`aria-selected`, `aria-valuetext`, a required `label`).

**A disabled part says so.** 0.10.0 has no `aria-disabled`; a part whose own
state makes it inert appends `Disabled` to its `aria-description`, joining the
caller's text and any component message (validation, required, status). This is
a description, not a disabled role: assistive technology hears that the control
is unavailable while the host still exposes it as an ordinary control (plan
`516`).

The join is sentence-aware: when the caller's text already ends in `.`, `!` or
`?`, the derived word is appended with a single space, so a description never
reads `..` (plan `804`).

**A derived status is described, not only painted.** A non-interactive row that
derives a state from its position announces it through the same supported
channel: `StepperStep` and `TimelineItem` append `Complete`, `Current` or
`Upcoming` to the caller's description (plan `626`). `aria-selected` still marks
the current row because 0.10.0 has no `aria-current`; colour is never the only
carrier of a status.

**A focus cue needs a focus signal.** A part seeds its `focused` state from
`autoFocus` and follows React `focus`/`blur` afterwards. The headless
`TestRenderer` delivers neither for `focusElement`, `focusNext` or a pointer
focus change (plans 536, 540), and a live window's delivery is window-state
dependent (playground plans 390, 603, 605). A ring is therefore guaranteed for
`autoFocus`; after a programmatic or pointer focus move it appears only when the
host sends the event — unless the part measures the renderer's own focused host.
The parts that own a ring and can be reached that way do exactly that while they
are enabled (a 50 ms sample of `getFocusedElementId()`): `FieldInput` (plan 748),
`SearchInput` (plans 659/660), `ComboboxTrigger` while its popup is closed
(plan 672), and the button-shaped parts — `Button`, `IconButton`, `TabsTrigger`,
`AccordionTrigger` and `CollapsibleTrigger` — through the shared
`useFocusState` host id (plan 752). The remaining ring owners read the same
sample through their own host ids: `Carousel` and its indicator dots, the colour
swatches and HEX field, the recorder and its clear control, a chip's removal
control, a mention row and the time-picker clear control (plan 754).
`BreadcrumbLink`, the Chat composer, the InlineEdit display,
`CommandMenuInput` and `ContextMenuTrigger` complete the set through the same
hook, and the Tag input, Mention input and Time picker **group** rings take one
sample per group rather than one per member (plan 755). The sample reads the
renderer's focus; it never invents focus from colour or hover, and every
component page whose parts can take focus states the limitation (plan 608).
A part that becomes disabled drops its painted focus even though no `blur`
arrives, so a disabled control never shows a ring; re-enabling waits for the
next real focus signal (plan `680`).

**A control that removes itself hands focus on.** Activating a control that
unmounts with its own data must not strand the keyboard. When the part belongs to
a group that survives, focus moves to the group's surviving stop: a removed
`List` row hands to the live tab stop (plan 708), a removed or disabled `Tabs`
tab hands on (plans 712, 646), a removed notification row reveals the next live
row (plan 746), a tag chip's removal control hands to the tag field and a
recorder's clear control to the recorder itself (plan 769), and a dismissed toast
card hands to the next live card's dismiss control — below, else above
(plan 770). When nothing survives to receive it, focus is left alone rather than
invented: the last toast card has no trigger to return to, and its page says so.
A control whose **whole container** leaves — an alert's dismiss control — hands
the keyboard to the next stop in the active surface before the container goes
(plan 839). The handover lives in the activation handler, so a value change the app
made itself never moves focus.

**A surface that closes under the user hands the keyboard on.** An app can set
`open` false while one of a non-modal surface's own controls holds focus, with no
close requested by the surface. The control is leaving with the surface, so the
surface captures it on the closing render — the only moment its host can still be
read, because effects run after the commit removed it (plan 708) — names its
trigger as that control's **focus successor** (plans 826/827/830), and hands the
trigger the keyboard. A control that opens a modal in the same commit therefore
restores to the trigger when the modal closes, instead of to nothing (plan 832).
Only an *unrequested* close hands focus on: `Escape`, a `Tab` walk and an outside
press each state their own target. `PreviewCard` is mark-only, because its
trigger re-opens the card (plan 515). A surface the app **unmounts** rather than
closing never reaches its closing render, so nothing can be captured; that case
leaves focus alone and is documented per component.

**A part that draws an interactive role names itself.** 0.10.0 reports no
accessible name for a `div role="button"` (or tab, link, …) whose label is only a
text child — measured for menu rows in plan `387` and for every example in plan
`391`. A part therefore supplies `aria-label` from its plain-text children, and
the caller's authored `aria-label` always wins. `internal/name.ts` owns the rule;
`src/behaviour/accessibility.test.tsx` mounts every example and fails on an
unnamed node in **any** role except `list`/`listitem` (which read their content
from children, so ARIA requires no name and naming a row would repeat it). The
rule is stated over roles rather than over a spelling list on purpose: AccessKit
calls an `option` `listboxoption` and an `<input>` `textinput`, and a hand-written
list silently skipped both until plans `783`/`790`; a root that names a region
(`TabsList`, `List`, `Field`, `Fieldset`, `MentionInput`, `ColorPicker`,
`TimePicker`, `TagInput`) takes `label`. A label composed from elements is not
plain text, so that caller passes `aria-label` itself.

## 6. Translation table

| `base-gpui` (Rust) | Our React |
| ------------------ | --------- |
| `TabsRoot > TabsList > TabsTab` | `Tabs > TabsList > TabsTrigger` |
| `.value(v)` / `.default_value(v)` | `value` / `defaultValue` |
| `.on_value_change(f)` | `onValueChange` |
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
| Selects | `Select` | `SelectRoot` + 19 parts | GPUix 0.10.0 `Select` |
| Switches | `Switch` | `SwitchRoot`/`Thumb` | plan 030 |
| Progress | `Progress` | `ProgressRoot`/`Track`/`Indicator`/`Label`/`Value` | plan 030 |
| Tooltips | `Tooltip` | `TooltipRoot`/`Trigger`/`Popup`/… | GPUix 0.10.0 `Tooltip` |
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
| Dropdown menus | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuGroup`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent` | `MenuRoot` + 18 parts | plan 114, 387 |
| Context menus | `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent`, `ContextMenuItem`, `ContextMenuCheckboxItem`, `ContextMenuRadioGroup`, `ContextMenuRadioItem`, `ContextMenuGroup`, `ContextMenuLabel`, `ContextMenuSeparator`, `ContextMenuSub`, `ContextMenuSubTrigger`, `ContextMenuSubContent` | `ContextMenuRoot`/`Trigger` | plan 114, 387 |
| Command menus | `CommandMenu`, `CommandMenuInput`, `CommandMenuList`, `CommandMenuItem`, `CommandMenuEmpty` | — | plan 114, 301 |
| Tabs | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `TabsIndicator` | `TabsRoot`/`List`/`Tab`/`Panel`/`Indicator` | plan 113/715 |
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
| Carousel | `Carousel`, `CarouselTrack`, `CarouselSlide`, `CarouselControl`, `CarouselIndicators` | — | plan 315/374 |
| Drawer | `Drawer`, `DrawerTrigger`, `DrawerClose`, `DrawerContent`, `DrawerHeader`, `DrawerTitle`, `DrawerDescription`, `DrawerFooter` | `DialogRoot`/`Trigger`/`Popup`/`Backdrop`/`Title`/`Description`/`Close`/`Portal`/`Viewport` (shape only) | plan 309 |
| Tag / token input | `TagInput`, `TagInputField`, `TagInputChip` | — | plan 314 |
| Keyboard shortcuts / keycap display | `KeyboardShortcuts`, `KeyboardShortcutsGroup`, `KeyboardShortcut`, `Keycap` | — | plan 310 |

### Tier 5 — specialised

| Component | Parts | base-gpui guide | Source |
| --------- | ----- | --------------- | ------ |
| Notification centre | `NotificationCentre`, `NotificationCentreTrigger`, `NotificationCentreContent`, `NotificationCentreHeader`, `NotificationCentreTitle`, `NotificationCentreMarkAll`, `NotificationCentreClear`, `NotificationCentreList` | — | plan 568 |
| Message scroller | `MessageScroller`, `MessageScrollerViewport`, `MessageScrollerItem`, `MessageScrollerJumpToLatest` | — | plan 206 |
| Message (AI message row) | `Message`, `MessageAvatar`, `MessageContent`, `MessageStreaming`, `MessageReasoning`, `MessageToolCalls`, `MessageSources`, `MessageAttachments`, `MessageActions` | `Message` (shape only) | plan 207 |
| Chat (AI conversation) | `Chat`, `ChatMessages`, `ChatComposer`, `ChatEmpty` | `Chat` (shape only) | plan 207 |
| Multi-step forms | `MultiStepForm` (render prop; one part) | — | plan 390 |

`TimePicker` is a **field**, not a trigger with a popup. The §9 plan line that
said "the same for `TimePicker`" predated the measured reason it is a field: the
runtime has no `aria-valuenow`, so a popup spinbutton could not announce its
value. The field root, its two segments, the separator and the clear control are
the honest parts.

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

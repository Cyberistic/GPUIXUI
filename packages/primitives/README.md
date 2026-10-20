# `@gpuixui/primitives`

The foundational render primitives and the Tier 1 component set for GPUIxUI.
GPUix gives a program one box (`div`), one text node (`text`), a flat CSS-shaped
`style` prop and native events; this package is the layer that turns that
runtime into a **system**: one place where a semantic decision becomes a concrete
`StyleDesc`, one place where keyboard behaviour lives, one place where sizes and
variants are defined.

```tsx
import { Button, Stack, Text, ThemeProvider, Input } from "@gpuixui/primitives";
import { darkTheme } from "@gpuixui/tokens";

<ThemeProvider theme={darkTheme}>
  <Stack direction="column" gap="lg">
    <Text role="h2">Sign in</Text>
    <Input label="Email" placeholder="you@example.com" fullWidth />
    <Button variant="primary" onActivate={submit}>Continue</Button>
  </Stack>
</ThemeProvider>;
```

## The theme comes from `@gpuixui/tokens`

`PrimitiveTheme` is `@gpuixui/tokens`' `Theme`, re-exported from
`src/core/theme.ts` under the name the components import. The tokens package
owns the values **and** the runtime-shaped helpers (`focusRing`,
`elevationShadow`); primitives owns only the resolution from a semantic spec to a
`StyleDesc`. There is one declaration of the theme in the library (plan 021) —
a second copy would drift silently. The same holds for the two shadow helpers: a
component names them, and `src/core/token-helpers.test.ts` fails by file and line
if a source file builds a shadow itself (plan 099).

There is deliberately **no default theme**: a primitive rendered without a
`ThemeProvider` above it throws `MissingThemeProviderError` naming the provider.
A silent default palette is how two design systems end up in one application.

Density is a multiplier over the theme's metrics, never a second palette:
`<ThemeProvider theme={theme} density={extendedTheme.density}>` changes numbers
only. Building density presets is `@gpuixui/tokens`' job, so this package owns no
second copy of them.

No colour, space, radius or font literal may appear outside `src/core/` and its
test fixture — the theme is the only source of those values.

## Composing with `@gpuixui/components`

`@gpuixui/components` reads its theme from `@gpuixui/tokens/react`'s context,
which falls back to the light theme. Primitives deliberately has **no** fallback
and throws without its own provider, so an app using both packages mounts both,
with the same resolved theme:

```tsx
import { ThemeProvider } from "@gpuixui/primitives";
import { ThemeProvider as TokenThemeProvider } from "@gpuixui/tokens/react";

<ThemeProvider theme={theme}>
  <TokenThemeProvider theme={theme}>{/* app */}</TokenThemeProvider>
</ThemeProvider>;
```

One `theme` value for both means a theme switch repaints primitives and the
components package together. The docs site mounts exactly this composition in its
live native scenes. The two contexts will become one when
`@gpuixui/tokens/react` is consumable without a JSX shim (the tokens workstream's
row in `TODO.md`); this package cannot import that module in its own type check
until then (`TS2875`, because the tokens file's JSX cannot resolve
`@gpuix/react`), so this page changes with that fix.

## Two layers

| Layer | What lives there | Why it is separate |
| ----- | ---------------- | ------------------ |
| `core/` | theme re-export, `style.ts` (spec → `StyleDesc`), `variants.ts`, `keyboard.ts`, `state.ts`, `typeahead.ts`, `loading.ts`, `layout.ts`, `selection.ts` | pure and runtime-free: this is the part that can be proven without a GPUix runtime, and where the design decisions actually live |
| `components/` | thin renderers over GPUix host elements | each is a resolver call plus, at most, React-local focus or value state |

`core/` must not import `@gpuix/react` at runtime (type-only imports are erased).
`components/` may import the published `/select`, `/tooltip`, `/floating`
subpaths; the package root needs a native binding.

## Style by state

`style` on an interactive part accepts the runtime's own
`StateStyle<<Part>State>` — an object, or a callback over that part's public
state (`docs/component-api.md` §3, adopted from the components workstream):

```tsx
<Button style={(state) => ({ opacity: state.disabled ? 0.6 : 1 })}>Save</Button>
```

The callback's result merges after the component's own rules, so it wins per
property; an object style behaves exactly as before. That rule holds for
**every** part that takes `style`, layout properties included: `Progress`'s row
and `TextArea`'s row height/padding are resolved first, then the caller's style
wins (`src/components/style-order.test.tsx`, plan `097`). State types are exported
(`ButtonState`, `ToggleState`, `CheckboxState`, `SwitchState`, `FieldState`,
`CheckboxGroupState`, `RadioGroupState`, `ToggleGroupState`, `RatingState`,
`OTPFieldState`, `SliderState`, `RangeSliderState`, `LabelState`,
`InfoTipState`, `ScrollAreaState`, `SelectState`). Group and root `style`
reports the state the container owns.

Parts built from data take a second, per-item prop with the same contract:
`CheckboxGroup.rowStyle` (`CheckboxRowState`), `RadioGroup.optionStyle`
(`RadioOptionState`), `ToggleGroup.itemStyle` (`ToggleItemState`),
`Rating.starStyle` (`RatingStarState`), `OTPField.cellStyle` (`OTPCellState`),
`Slider.thumbStyle` (`SliderThumbState`), `RangeSlider.thumbStyle`
(`RangeSliderThumbState`) and `Select.triggerStyle` (the runtime's
`SelectTriggerState`, re-exported). The item state carries its identity
(`value`/`index`, or `end` for a range thumb) plus the facts the component
already derives for it, so one callback styles every item and branches on that
identity. Two fields extend the contract's vocabulary
because this package has real states its parts do not: `ButtonState.loading`
and `CheckboxState.indeterminate`. `resolvePartStyle` in `components/internal.ts`
is the single merge point; the type and resolver are the published ones, not a
local copy.

## The component API contract

The package follows the accepted Tier 1–2 contract in `docs/component-api.md`
(ADR `0004`, plan `200`). Every Tier 1 row is one part, so the rules that need
enforcement here are the ones that hold across the set:

- `src/contract.test.ts` holds the Tier 1 parts table — one record per public
  component with its page and the state types its `style` props accept.
  It fails by name when an export is unrecorded, a recorded part is not a
  component, a `render*`/`*Parts` implementation seam reaches the package root,
  an advertised state type has no declaration, a page omits its state type or a
  required section, or a component emits an ARIA prop 0.10.0 does not map.
- `src/callback-names.test.ts` holds the one value callback name (§2).
- `src/components/state-style.test.tsx` proves each state callback receives its
  part's state at runtime (§3).
- `src/components/style-order.test.tsx` proves a caller's `style` survives last
  on every part that takes one, including `Progress`'s forced row and
  `TextArea`'s row re-base (§3, plan `097`).

Deviations, kept deliberate:

- `Input`, `TextArea` and `NumberField` share one `FieldState`: they paint the
  same field chrome, so a second name would be a copy of it.
- The data-driven groups (`CheckboxGroup`, `RadioGroup`, `ToggleGroup`,
  `Rating`, `OTPField`) take their options as data instead of compound children
  (D16, D25, D27); a compound API would move the group's own roving and
  select-all rules into a context per child.
- `IconButton` takes `StateStyle<ButtonState>` because it **is** a `Button`; it
  owns no second state.
- No Tier 1 parent hosts child parts, so §1's typed-by-position rule has nothing
  to narrow here.

## Components

**Layout** `Box` `Surface` `Stack` `Grid` `Separator` `Spacer` `ScrollArea`
**Text** `Text` `Label`
**Actions** `Button` `IconButton` `ButtonGroup` `Toggle` `ToggleGroup`
**Fields** `Input` `TextArea` `NumberField` `OTPField` `Select`
**Selection** `Checkbox` `CheckboxGroup` `RadioGroup` `Switch` `Rating`
**Value** `Slider` `RangeSlider` `Meter`
**Feedback** `Progress` `Spinner` `Skeleton` `Tooltip` `InfoTip`
**Theming** `ThemeProvider`

Every component is themed by a resolver in `core/style.ts` (`controlStyle`,
`surfaceStyle`, `textStyle`, `ruleStyle`, `progress*Style`), `core/selection.ts`,
or the shadcn recipes in `core/recipes.ts` (the field family and the button);
none paints a literal and none scripts hover or press
(GPUIx applies `style.hover`/`style.active` natively).

### One value callback

A controlled value is `value` / `defaultValue` / `onValueChange(value)`; a
`Toggle`'s pressed state is `pressed` / `onPressedChange` and an overlay's open
state is `onOpenChange`. There is no `onChange` prop: our callback carries a
value, not the host event, and the accepted cross-package contract names one
value callback (`docs/component-api.md` §2, plan `088`). `src/callback-names.test.ts`
fails by file and line if a component, page or example reintroduces it.

### Controlled and uncontrolled values

`value` / `defaultValue` / `onValueChange(value)` is the one value contract. A
part is **controlled on the render where `value` is supplied** and uncontrolled
on a render where it is not — the decision is not frozen at mount, so
`value={loaded?.name}` works when `loaded` arrives later (plan `324`). `internal`
is the uncontrolled draft and survives the switch; a controlled part never keeps
a private copy of an interaction. Switching modes in a mounted tree is
deterministic, but a control that flips by accident is usually a caller
mistake. `runtime/late-value.runtime.test.tsx` proves the contract on the twelve
parts plan `324` did not measure — each mounts uncontrolled, is re-rendered with
a value, and must report it through the accessibility tree (plan `574`).

### What GPUix does not provide, and what this package does instead

| Capability | GPUix 0.10.0 | Here |
| ---------- | ------------ | ---- |
| `focusVisible` / `outline*` | absent | the component tracks focus and merges a zero-offset, zero-blur shadow ring (`controlFocusStyle`); a mouse press shows the ring too, and a **disabled** control paints none — native focus outlives a `disabled` prop change, so an inert control must not advertise the caret (plan 332). An **attached `ButtonGroup`** clips at its buttons' edge, so a button in one paints the same ring as an inset overlay on its own edge instead (plan 344). **The published 0.10.0 runtime delivers no `onFocus`/`onBlur`**, so `ThemeProvider` mounts a native-focus tracker that samples `getFocusedElementId()` every 50 ms and publishes the focused host id; the ring still paints, up to one tick late (plan `590`). The events themselves stay missing: a runtime-internal focus behaviour such as the headless tooltip's open-on-focus does not follow. The probe and the decision are in [`docs/gpuix-capabilities.md`](../../docs/gpuix-capabilities.md#focus-events), plans `583` and `590` |
| `aria-checked` | absent | checkbox/radio/switch report state through `aria-valuetext` |
| `aria-valuenow` | absent | `Progress` reports `aria-valuetext` (`"42%"`, or `"loading"`); `Slider`/`RangeSlider`/`Meter` report the value text only — the range is not announced |
| pointer capture | present: GPUI captures the pressed element automatically | a slider drag keeps tracking after the pointer leaves the track and clamps at the ends; it begins on the primary button only (a right/middle click is refused), and click/keyboard remain the precise paths |
| `aria-labelledby` | absent | a control carries its own `aria-label`, written from its `label` prop **or from the text it paints — string children and text nested inside an element child alike** (plans `058`, `746`); an element with no text (a bare icon) names nothing. `labelledBy(name)` returns `{ label }` so the name is written once; a label beside a control is inert, so `CheckboxGroup` makes the whole row one interactive element instead of pairing a box with a `Text`. A data option's `label` falls back to its `value` when blank, so an option row is never an unnamed focus stop (plan `589`) |
| `aria-describedby` | absent | `Tooltip` writes a string tip onto the trigger as `aria-description` and exposes the open tip as a named `role="tooltip"` node; the trigger still owns its role and name. A **node** tip has no text the runtime can read, so it takes `label` for both the trigger's description and the tip's name (plan `742`); without one it is painted but unnamed (plan `071`). Every single-root focusable control forwards the slot contract (plan `345`); a native `<input>`/`<textarea>` host receives no `onMouseEnter`, so a field's tip opens on keyboard focus only. Roving composites are documented non-triggers |
| scrollbar tint, fade mask | absent | `ScrollArea` paints no chrome; the thumb is platform-themed. A **labelled** area is a named focusable `region` whose arrows/page/Home/End scroll it through the runtime's `scrollTo`; the handler only fires when the region itself holds focus, so fields inside keep their keys (plan `072`). `onScrollPositionChange` reports the runtime's absolute, clamped offset after a wheel or a keyboard move — the scroll event itself carries deltas only, and a component-performed scroll dispatches none; the `ref` handle's `scrollTo` moves the region and reports where it landed (plan `337`). |
| rotation, colour interpolation | absent | `Spinner` advances a discrete step on a timer instead of spinning. Native `motion` **is** available for one-way position changes — the `Switch` thumb slides 200 ms from `switchThumbOffset`'s two ends — but it has no `repeat`, so the looping indicators keep their steps (plans `020`, `329`) |
| `./button` | not published | `Button` implements the keyboard contract itself (`core/keyboard.ts`) |
| an anchor that resists its parent | `<anchored>` positions against its parent, and a block-level flex parent stretches on the cross axis | `Tooltip` hugs its trigger with `alignSelf: "flex-start"` so the layer anchors to the trigger and defaults `align` to the exact `start`; the runtime's `center` is half a panel off, so the wrapper maps it to `start` plus a measured half-difference **on the layer's own axis** — widths above/below, heights beside (plans `060`, `095`, `098`). The hugging root collapses a `width: "100%"` child, so `Tooltip.style` takes the anchor width a full-width trigger needs (measured: a Slider without it painted 16 px; plan `345`) |
| percentage sizing inside a floating layer | `minWidth: "100%"` resolves against the layer, not the trigger | `Select` measures its trigger's painted width and passes a numeric `minWidth` to the list (plan 062) |
| a layer that clamps instead of flipping | `fit="snap"` clamps a layer inside the window **without flipping it**, so a bottom-side layer can cover its trigger, and a top-side one can cover it at the top edge | `Select` measures its trigger, estimates the list height from its own styles, and opens on the side that fits; `Tooltip` measures its root and does the same. Any requested `side` — horizontal or vertical — is a preference: it opens on the other side when the layer cannot fit, or on the roomier one, from the trigger's measured box and the layer's own size (plans 066, 067, 335, 336) |
| a trigger that moves under an open layer | no `onLayout`; the runtime re-anchors the layer but the wrapper's side/cap stay those of the trigger's old box | `Tooltip` and `Select` sample the trigger every 100 ms while the layer is open (and never while closed), so a layout change re-decides the side, cap, alignment and width; measured, a trigger moved from `y 712` to `y 12` left both layers painted over it (plan `645`) |
| no list height cap | the layer grows past the window and the options past the edge are unreachable | `Select` caps a long list to the free space on its side and scrolls it; rows keep their height, so the list scrolls instead of squashing (plan 068). The cap covers all four sides: beside the trigger the free space runs from the layer's top edge to the window's bottom margin (plan 098) |
| a highlighted option outside a capped layer | the layer scrolls only with the wheel, and the item's `highlighted` state is the only signal the runtime gives; `scrollIntoView` also scrolls to the child **before** the target (measured: the active row's top landed on the list's bottom edge) | `Select` measures the newly highlighted row against the list's painted box and moves the list by the overflow through `renderer.scrollTo`, so the arrows keep the active option inside the list (plans 069, 599) |
| `aria-invalid` | absent | a failed validation is paint only; `invalid` marks the empty selection or field border and the app pairs it with an error `Text` |
| a clamp that belongs to one element | the runtime keeps one shaped text layout per string, font and width for the whole window; `lineClamp` is applied to that layout but is **not** in the key, so the first copy of a string decides the clamp for every identical copy at that width (measured: a clamped copy followed by a plain one painted `36 / 36` px; the reverse painted `108 / 108` px) | `Text.clamp` is the element's own `maxHeight` (`clamp ×` the role's line height) plus `overflow: hidden`, which no cache can share. The trade is a hard cut with no ellipsis; `truncate` keeps the one-line ellipsis because the wrap mode *is* in the key (plan `082`) |

`packages/icons` supplies the icons; `@gpuixui/tokens` supplies the themes.

## Documentation and examples

Every Tier 1 component has a page and a composed example beside the source:

- `docs/` — one page per component (`docs/README.md` indexes them) with usage,
  API, keyboard, accessibility, theming, limitations and verification;
- `examples/` — the composed screens plus the icon set, registered in
  `examples/index.ts` for `apps/playground`, and a coverage guard that fails by
  name when a public component has no rendered example (plan `374`);
- `@gpuixui/primitives/examples` — that registry as a public subpath, so the
  playground mounts the compositions through the package boundary instead of a
  relative path (plan `388`);
- `runtime/examples.runtime.test.tsx` — mounts every example in the real
  renderer, so an example cannot rot into source that has never run.

The browser docs site (`apps/docs`) is a separate workstream and must not render
these examples as live previews: they are GPUix host trees, not DOM.

## Verification status

`nub run --filter @gpuixui/primitives test` runs the suites: `core/` behaviour
(keyboard, controlled state, variant registry, style resolution, progress
clamping) and the components' element trees (props, ARIA, handlers) via
`src/components/testing/element.ts`. Measured 2026-10-20: the offline suite is
**72 test files**, all passing, including a package-wide guard that a caller's
`style` wins last on every part (plan `097`), the axis-aware floating alignment
rule (plan `098`), a guard that every documented `theme.…` path and
`@gpuixui/tokens` import resolves on the shipped package (plan `333`), one
that every public component is rendered by at least one example (plan `374`),
one that holds the composed-app ledger to its real suite (plan `608`), one that
keeps the Tier 1 inventory's "why wip" true (plan `648`), one that keeps the
floating pages' trigger-follow claim true and both samplers live (plan `649`),
one that every slot handler reaches an element and calls the caller on every
single-root trigger (plan `694`),
and one that fails by file name when a runtime suite has no header or is named
like a scratch probe (plan `390`).

**What the element-tree suites cannot reach:** a component *function* is a React
hook holder, so a test cannot call `Button(props)` — it asserts on the render
function (`renderButton`, `renderCheckbox`, …) instead. The glue in between
(which resolved state the wrapper hands the renderer) is therefore held by the
type checker and by the native runtime, not by these suites.

**Verified in the real runtime** (`nub run --filter @gpuixui/primitives test:runtime`):
the suites in `runtime/` mount the components in the GPUix 0.10.0
`TestRenderer` and assert only on what the frame produced — painted text,
bounds, hit-tested clicks, dispatched keys, focus, the a11y dump, a scroll
offset, PNG captures. One of them (`examples.runtime.test.tsx`) mounts every
example registered in `examples/index.ts` — and a parity test fails if the list
and the registry drift (plan 092) — so the documentation's compositions are
runtime-proven too. The runtime suite is **73 test files**. The latest run's
totals live in `TODO.md`'s live-suite row and plan `597`, not here: a prose
count cannot be held true by a test.
The store artifact is the **release-tag** build (plan `529`;
`strings` reports `focusVisible=0`), and it delivers **no focus events** (plan
`583`); the native-focus tracker restores the rings (plan `590`), so the
matrix passes after the paint it asserts is awaited (`awaitFrame`, plan `691` —
a fixed sleep lost the race). Because no blur arrives, a roving
composite's event-tracked cursor is cleared by a sample that names none of its
items (`useRovingFocus`), so a ring and an arrow walk cannot outlive focus
(plan `601`); `RangeSlider`'s thumbs use the same hook rather than a private
copy (plan `602`), and `runtime/focus-loss.runtime.test.tsx` holds every
focusable control to a ring while focused and none after leaving (plan `603`).
Its `getElementBounds` reports a hybrid box
— a plain `div` from its content origin, a `Button` from its border box — so
the suites read `paintBounds` for the hosts that report the former, and the
adapter's calibration case pins the model against a real hit-test (plan `597`).
A **scroll container's own** report slides by its scroll offset while its
children report painted positions (measured: a 552-high region at `y 91`
reports `y -18` at offset `-109`, and its child moved `716 → 607`), so
`paintBounds` subtracts that offset once and is the container's **visible** box
(plan `598`). The `Select` and app suites use it to assert a row is inside a
scrolled list or region (plan `599`). No
assertion has been re-baselined on this build, and the remaining limitation is
documented on every focusable page (plan
[`583-release-runtime-focus.md`](../../.agents/slop/plans/583-release-runtime-focus.md)).

The contracts it covers include a theme switch on a mounted tree,
using the shipped `lightTheme` /
`darkTheme` from `@gpuixui/tokens`, a check that no painted colour is outside
the active palette, the high-contrast palettes in both modes, a density override
measured against the preset's metrics, a platform theme's mono family reaching
the paint (plan 055), a both-theme matrix over all 32 public components — each mounted
under `lightTheme` and `darkTheme`, required to paint only palette colours and a
different colour set in each, so a literal fails by case name (plan 352) — a
tooltip measured against its trigger in a column and a
row and flipped below at the window's top edge (plans 060, 067), a Rating's
clear leaving native focus and the ring on the same star (plan 334), a tooltip
opening from every single-root control and the text hosts' focus-only rule
(plan 345), a radio group's failed validation measured on the circles (plan
061), a select's list measured against its trigger's width and — at the window's
bottom edge — opened above the trigger instead of over it, a long list capped and
scrolled with the keyboard highlight kept in view (plans 062, 066, 068, 069), a
slider drag measured outside the track with the non-primary buttons refused
(plan 063),
a select option selected by clicking its **painted label**, with focus returning
to the trigger and a disabled option refusing the same gesture (plan 390),
an `autoFocus` field's ring painted from mount and cleared on blur (plan
064), a checkbox group's row hit area, derived select-all state and skipped
disabled tab stop (plan 065), every checkbox/radio group row's hover and press
wash painted on the row that owns the pointer (plan 355), a rating's failed
validation painted on the
empty stars only (plan 070), a labelled scroll region scrolled by
PageDown/arrow/Home/End through the runtime while an `Input` inside it kept its
arrow keys (plan 072), and `InfoTip` opening on hover and on `focusNext` with
its name, description and painted focus ring (plan 073), an `OTPField` that
is one roving tab stop instead of six (plan 076), a field added after a loading
state taking `autoFocus` on every field shape (plan 584), and a decimal `NumberField`
step that reports `0.3` instead of binary noise (plan 077), an attached
button group whose buttons share one square-edged, clipped surface (plan 078),
whose focused button paints its ring inside that clip rather than under it
(plan 344),
and a state-aware `style` callback whose `focused`/`checked`/`invalid` state
repaints the mounted tree (plans 079, 080), a select trigger ringed on focus and
while its list is open (plan 083), and a seventeen-control matrix that fails if
any focusable control paints zero or two focus rings (plan 084), and a button
wired with the familiar `onClick` activated by Enter and Space instead of only
by a mouse (plan 085), and an `IconButton` that is one named button with a
tinted icon and a spinner instead of the icon while busy (plan 086), and a
`Label` beside a standalone checkbox that was measured *not* to toggle it, which
is what the docs now say (plan 087), a tab-order matrix that proves a
disabled control is not a stop while an enabled one is (plan 089), a failed
validation that recolours a field's border and keeps its surface on hover and
press (plan 091), an examples suite that really mounts every registered
example because a parity test fails when the list drifts (plan 092), and an
accessible-name matrix that proves the role and exact name of 28 name-bearing
Tier 1 nodes, that no interactive node in a composed scene is unnamed, and that
the presentational primitives invent no role (plan 093), and a rating whose
hover preview paints the prospective value without changing the committed value
or its announcement (plan 094), and a `TextArea` whose painted height follows a
caller's `style.height` instead of its rows (plan 097), and a tooltip beside its
trigger centred on the layer's own axis with a left/right select list capped to
the window and scrollable (plan 098), and a horizontal floating side that cannot
fit opening on the other side instead of over its trigger (plan 335), and a
determinate `Progress` that schedules
no animation timer while an indeterminate one paints its requested tone
(plan 328), and a switch whose thumb slides through an intermediate position and
rests at the layout painter's two ends (plan 329), and a bare `<Skeleton circle />`
that paints a square rather than a full-width pill (plan 330), and a `circle`
skeleton that stays square for a width-only, height-only, mismatched or
percentage input (plan 028), and a
"disabled after focus" matrix over thirteen controls that act while enabled, keep
native focus across the disable, and then act no more, with fifteen controls
painting no ring once disabled (plan 332), and a number field whose
`ArrowLeft`/`ArrowRight`/`Home`/`End` were measured to move the native caret and
report no value, while Up/Down/PageUp/PageDown still step (plan 338), and a
number field whose Enter commits `1.5` to `1.50` before calling the caller's
`onSubmit` (plan 339), and a radio group whose Space and Enter activate the
option holding focus rather than the value's stale tab stop (plan 353), and an
activation matrix over eight button-shaped controls × nine sequences — Enter
up/down/pair/held, Space up/down/pair/held, primary click — that fails by case
name when one control loses a key phase, a held key starts activating, or a
group activates the value's stale tab stop instead of the focused item
(plan 354), and a pointer-feedback matrix over fifteen controls that requires a
pointer-owned gesture to change something on hover and on press — and requires a
disabled control to change nothing in either state — with `Rating`'s preview
recorded as the one exception (plan 361), and a number field that paints and
announces the bound of a supplied out-of-range value, steps from it, commits
nothing while disabled, and forwards the caller's `onKeyUp` (plan 362), and a
select whose empty option group paints no heading while the estimate, the paint
and the accessibility tree agree on the rows it has (plan 363), and a labelled
separator whose caller's margin moves the control instead of each rule half
(plan 364), and a `Text` whose `align="end"` paints byte-identically to a
manual right alignment instead of to `start` (plan 365), and a rating whose
non-finite `max` mounts as one named star instead of throwing (plan 366).
`runtime/` is deliberately outside `nub run test`, so the default gate still
runs on a host with no binding; `test:runtime` is opt-in and fails loudly when
the binding is absent rather than skipping.

The adapter is reusable: it ships as
`@gpuixui/primitives/testing` (`createRuntime`, the `Runtime` verbs and the
accessibility helpers), so a consumer's own native tests — and this repo's
`examples/basic-app` workflow suite — drive the same one. It is test-only; the
package root does not re-export it, and the native binding is loaded through a
dynamic import, so merely importing the subpath cannot fail on a host without
one. `@gpuixui/testing` (playground workstream) remains the smoke-report host;
this is the thinner component-level adapter (plan `041` §2.2).

What it observed, per component, is in `COMPONENTS.md`; the measured details and
the two-direction proof are in
`.agents/slop/plans/041-tier1-runtime-verification.md` §9 and
`.agents/slop/plans/055-tier1-theme-axes.md` §7.

**Still unproven, on purpose:**

- the binding is the **locally-built** `darwin-x64` artifact (plan 140), not a
  published binary — no `darwin-x64` release exists;
- `focusVisible` cannot be observed: the runtime has no such state, so a
  mouse-opened and a keyboard-opened focus ring look the same;
- scrollbar tint, rotation and colour interpolation are absent from 0.10.0, so
  the alternatives listed above are the honest ones, not a placeholder.

**What the element-tree suites cannot reach and the runtime now covers:** the
glue between a component's hook holder and its renderer (which resolved state is
handed over) is proven by the runtime suites, not by the `src/**` ones.

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
`keyboardFocusRing`, `elevationShadow`); primitives owns only the resolution from
a semantic spec to a `StyleDesc`. There is one declaration of the theme in the
library (`@gpuixui/tokens`) — a second copy would drift silently.

There is deliberately **no default theme**: a primitive rendered without a
`ThemeProvider` above it throws `MissingThemeProviderError` naming the provider.
A silent default palette is how two design systems end up in one application.
The provider writes `@gpuixui/tokens/react`'s context, so a tree mixing primitives
with `@gpuixui/components` wraps once and both read the same theme; either
package's provider satisfies the rule, because presence is read from that one
context.

Density is a multiplier over the theme's metrics, never a second palette:
`<ThemeProvider theme={theme} density={extendedTheme.density}>` changes numbers
only. Building density presets is `@gpuixui/tokens`' job, so this package owns no
second copy of them.

The **control size** a component is given is a stored choice too — a settings
row persists it, and `@gpuixui/tokens` publishes `controlSizes` beside
`isControlSize` for that read — so a preference a release renamed arrives as a
string the union no longer names. Every control resolves its `size` through
`controlSize` (`core/theme.ts`), which reads a name the current scale does not
carry as `md`, the default every control documents: the height, the box side,
the thumb travel and the recipe class then come from that step instead of
resolving to `undefined`. Measured in a window, a stored name painted a **17px**
action with no height class beside the **32px** default it documents;
`theme.test.ts` holds the rule and derives the components that must take their
size through it, and `runtime/controls.runtime.test.tsx` proves the painted box.

The same read is the **core resolvers'** — `controlStyle`, `sliderInset`,
`sliderTrackStyle`, `selectionBoxStyle`, `selectionTargetStyle`,
`radioDotStyle`, `switchBox` and `switchThumbStyle` are exported so a consumer
can paint its own control, and each indexed the scales raw, so a stored name
answered `undefined` for a height, a box side or a thumb offset (a collapsed
control, a vanished mark, a `NaN` offset). They read through `controlSize` now,
and `theme.test.ts`'s `reads the size through controlSize in …` cases hold each
seam to the `md` paint; `fieldHint`'s frame follows the same rule.

The other paint names a control is given are stored choices for the same reason,
and each is read through a membership test rather than indexed raw:

- a **`variant`** is written into an action record, a saved toolbar or a
  workspace layout, so `isButtonVariant`/`buttonVariantOf` and
  `isToggleVariant`/`toggleVariantOf` (`core/variants.ts`) read a name the table
  does not carry as `primary`/`default`. Indexed raw, the name reached
  `buttonVariants[name].filledAction` and threw `TypeError: Cannot read
  properties of undefined`, so a saved record emptied the window.
- an **`accent`** is a stored preference beside the size, so
  `isSelectionAccent`/`selectionAccentOf` (`core/selection.ts`) read an unknown
  name as `primary`; the recipe's destructuring threw on its first slot and the
  derived hover/press fill had no role to move.
- a **type `role`** is content before it is a literal — a saved markdown node or
  a restored inspector row carries the role it was written with — so `textClass`
  reads a name the scale does not carry as `body`, the answer `typeOf` gives.
  The class name otherwise became `type-undefined`, which resolves to no size,
  leading or weight at all: the run painted the runtime's default face instead of
  body copy. The membership test is `@gpuixui/tokens`' own `textRoles`/`isTextRole`
  (this package re-exports it), so a role the scale grows is read here without a
  second list to edit.
- a **scroll `axis`** is a restored panel's or a split-pane record's, so
  `isScrollAxis`/`scrollAxis` (`core/style.ts`) read a name the union does not
  carry as the documented `vertical` — the same answer in the class recipe, the
  exported `scrollStyle` resolver and the key contract (`core/scroll.ts`). Read
  raw, an unknown name painted **both** scrollbars while the keys matched no
  axis at all, so the region's one tab stop moved nothing.
- a **button group's `mode` and `orientation`** are saved with the toolbar they
  describe, so `isButtonGroupMode`/`buttonGroupModeOf` and
  `isButtonGroupOrientation`/`buttonGroupOrientationOf`
  (`components/ButtonGroup.tsx`) read a name the table does not carry as
  `attached`/`horizontal`. Read raw, the recipe's `attached` check was false for
  a renamed mode and the group painted itself **separated** — a gap and no
  clipped silhouette — although `attached` is the default it documents.
- a **text `tone`** is written into an audit row, a saved message or a settings
  record, so `isTextTone`/`textToneOf` (`core/style.ts`) read a name the table
  does not carry as `default`; the class string otherwise lost its colour and
  the run inherited whatever surface sat behind it — an error line painted as
  ordinary copy.
- a **spinner `accent`** is the same kind of paint name:
  `isSpinnerAccent`/`spinnerAccentOf` (`core/loading.ts`) read an unknown one as
  `primary`, because the recipe resolved no colour class (a loader that painted
  nothing) and the core resolver called `ACCENT_COLOR[name]` as a function.
- a **bar's `size` and `tone`** live in a dashboard widget's saved record, so
  `isProgressSize`/`progressSizeOf` and `isProgressTone`/`progressToneOf`
  (`core/style.ts`) read them as `md`/`primary` for both `Progress` and `Meter`.
  Raw, a height step resolved to `h-space-undefined` (a track with no height)
  and a tone to no colour class at all — a finished task whose fill was
  transparent.
- an **elevation level** is saved with the panel it raises (a workspace record,
  a settings row), so `elevationLevel` (`core/theme.ts`) reads a name the scale
  does not carry as `md`, the default lift `elevationShadow` already answers,
  and an absent or nullish level as **no lift at all**. `boxClass` indexed its
  class table raw, so the shipped painter dropped the shadow class and painted
  a raised panel **flat** — indistinguishable from a card at rest — while the
  core resolver painted the lift. `recipe.test.ts`'s equivalence case,
  `presentational.test.tsx` and `runtime/layout.runtime.test.tsx` hold both
  paths to the one answer, and the reserved `overlay` level still paints none.
- a **group's `orientation`** is a saved layout choice, and it reaches the
  keyboard contract as well as the paint: `isOrientation`/`orientationOf`
  (`core/keyboard.ts`) read a name the arrow table does not carry as the group's
  own documented axis — `vertical` for a radio or checkbox group, `horizontal`
  for a toggle group. Read raw, the layout flipped to the other axis **and**
  `decideMove` destructured `ARROW_KEYS[orientation]`, so the first plain key
  press threw `TypeError: Cannot destructure property 'forward'` and the group's
  whole keyboard contract was dead on a name. `decideMove` itself also answers
  `None` for an axis the table does not carry, so a consumer calling it directly
  cannot be emptied by a stored name.

`Button.test.tsx`, `Toggle.test.tsx`, `Checkbox.test.tsx`, `Switch.test.tsx`,
`presentational.test.tsx`, `Progress.test.tsx`, `Meter.test.tsx`,
`RadioGroup.test.tsx`, `CheckboxGroup.test.tsx` and `ToggleGroup.test.tsx` each
hold one of these answers, and each case was measured failing on its raw read
before the guard landed.

The **words** a control announces are interface copy, so they ride the provider
too: `messages={{ selection: { checked: "coché", unchecked: "décoché", mixed: "partiel" } }}`
names the selection states, `press` the toggle states, `star` a rating star's fill
and `starName` its name template, `scrollRegion` a focusable scroller's default
name and `codeDigit` a code cell's sentence — once for the whole tree, because
this runtime announces state through `aria-valuetext` and has no
`aria-checked`/`aria-pressed`/`aria-busy`. A named group replaces its default
group whole and a group left out keeps the default. `MessagesProvider` is the
same seam without a theme, for a sub-tree in another language — it extends the
table above it rather than resetting it — and `useMessages` reads the resolved
table. A **formatter** a caller passes for one bar is words too: `Progress`'s
`formatValue`/`loadingText` and `Meter`'s `formatValue` go through
`spokenText`, so an answer that says nothing (a locale table with no row for
this measurement) leaves the component's own words standing instead of
publishing an empty `aria-valuetext`. The three **sentences** a control calls —
`starName`, `codeDigit` and `rangeEnd` — answer the same way through
`spokenSentence`, so a missing row names the star, the code cell or the range's
thumbs from the shipped sentence rather than publishing an empty `aria-label`.
The **state words** themselves go through `spokenWord` for the same reason: a
blank row in `selection`, `press`, `star`, `scrollRegion` or `loading` keeps the
shipped word instead of publishing an empty `aria-valuetext`, and a tab-stop
scroller is never left unnamed.
Reference:
[`docs/theme-provider.mdx`](./docs/theme-provider.mdx) §Words.

The same absence rule holds on the **paint** side: `visibleCopy` reports whether
a string has a visible character, and the three help sites — `Label`'s
`description`, a group option's `description` and `fieldHint`'s placeholder —
paint nothing for a blank one. A string that came from data blank is common, and
painted verbatim it was not free: an empty `<text>` still pays its column's gap
and a run of spaces lays out a whole line (measured on 0.11.0: 0px for `""`,
16px for `"   "`), so a label grew by a blank line while the control announced
nothing. Real copy is painted **as written** — only the decision is the name
rule's, not the spacing.

The rule also holds for a **display formatter**, where a blank answer is worse
than a blank line: `NumberField`'s `formatValue` is display copy, so a locale
table with a missing row answers `""` and the field painted an **empty input
while it still held the number** — the reader saw nothing, the steppers moved
the hidden value, and every frame repainted nothing. `numberDisplay`
(`core/number.ts`) reads a blank or whitespace-only answer as absence and paints
the field's own decimal text, while a real answer is painted as written;
`core/number.test.ts` and `runtime/number-field.runtime.test.tsx` hold both
sides.

**A group row is a control too**, so the caption beside an option's name is that
row's help: every option row in `RadioGroup`, `CheckboxGroup` and
`ToggleGroup` announces its `description` through `aria-description`
(`optionHelp` in `components/group.tsx`), the channel a field's `description`
already uses — the runtime has no `aria-describedby`. A blank caption is
absence there too, so it paints and announces nothing.

No colour, space, radius or font literal may appear outside `src/core/` and its
test fixture — the theme is the only source of those values.

## Two layers

| Layer | What lives there | Why it is separate |
| ----- | ---------------- | ------------------ |
| `core/` | theme re-export, `style.ts` (spec → `StyleDesc`), `variants.ts`, `keyboard.ts`, `state.ts`, `loading.ts`, `layout.ts`, `selection.ts` | pure and runtime-free: this is the part that can be proven without a GPUix runtime, and where the design decisions actually live |
| `recipe/` | `@gpuixui/tw` registry + class-string builders for the components already migrated | the Tailwind recipe is the single source of truth for a component's resting appearance; `recipe.test.ts` proves it compiles to the same `StyleDesc` as `core/` |
| `components/` | thin renderers over GPUix host elements | each is a recipe call plus, at most, React-local focus or value state |

`core/` must not import `@gpuix/react` at runtime (type-only imports are erased).
`components/` may import the published `/select`, `/tooltip`, `/floating`
subpaths; the package root needs a native binding.

The migration from `core/` resolvers to `recipe/` class strings is mechanical;
the exact steps and the native-style-prop → utility-class mapping are in
[`MIGRATION.md`](./MIGRATION.md).

### Actions load from their own subpath

Import one action from `@gpuixui/primitives/button` when the package root is too
much to load. The subpath publishes `Button`, `IconButton`, `actionOnColor` and
their prop types from a re-export seam (`src/button.ts`) and reaches six
component modules — the two actions, `Spinner`, `ThemeProvider`,
`MessagesProvider` and the shared `internal.ts` — where the root barrel reaches
53 own modules and every other component. Plan 160 measured
the barrel at 52 modules / 416 KiB from `@gpuixui/components`, which is why that
package kept a local button stand-in until this route existed. The seam is a
route, not a second implementation: `IconButton` is still `Button` with a
required name, and `actionOnColor(theme, variant)` is the role the variant table
paints its label in, for a layer drawn over the action (a busy loader, a
chevron, an effect's wash).

### The scroll box loads from its own subpath

Import `ScrollArea` and `ScrollAreaViewport` from
`@gpuixui/primitives/scroll-area` when another package needs a scroll reading.
The subpath publishes the two parts and their prop types from a re-export seam
(`src/scroll-area.ts`); it reaches `ScrollArea`, the two providers and the
shared `internal.ts`, never the root barrel. The route exists because a reading
must measure the element that scrolls: composing this scroller keeps its
keyboard contract (arrows, PageUp/PageDown, Home/End) instead of duplicating a
viewport without it. `scroll-area-entry.test.ts` holds the manifest entry, the
namespace and the import closure, and
`runtime/layout.runtime.test.tsx` mounts the routed export in a window and
reads its layout and offset back.

## The JSX runtime is pinned per file

Every published `.tsx` file opens with `/** @jsxImportSource @gpuix/react */`, the
pragma that makes its JSX the runtime's whatever compiler reads it. The package
tsconfig already sets the same `jsxImportSource`, so the pragma changes nothing
here — it is for a consumer that compiles these files **from source** with its own
automatic runtime, which otherwise types every host element against that
runtime's props. The docs site did exactly that through one type-only import and
reported **164** errors, all of them a `StyleDesc`, `EventPayload` or `Instance`
React's element props cannot hold, in files no docs change touched. `jsx-runtime.test.ts`
holds every published file of this package and `@gpuixui/icons` to the runtime its
tsconfig names, so a new component file cannot ship without it.

## Components

**Layout** `Box` `Stack` `Grid` `Separator` `Spacer` `ScrollArea`
**Text** `Text` `Label`
**Actions** `Button` `ButtonGroup` `Toggle` `ToggleGroup`
**Fields** `Input` `TextArea` `NumberField` `OTPField` `Select`
**Selection** `Checkbox` `CheckboxGroup` `RadioGroup` `Switch` `Rating`
**Value** `Slider` `RangeSlider` `Meter`
**Feedback** `Progress` `Spinner` `Skeleton` `Tooltip` `TooltipProvider`
**Theming** `ThemeProvider` `MessagesProvider` `useMessages`

Every component's resting appearance is a class string in `recipe/` compiled
through `recipeTw`; none paints a literal and none scripts hover or
press (GPUIx applies `style.hover`/`style.active` natively). The pure resolvers
in `core/style.ts` (`controlStyle`, `surfaceStyle`, `textStyle`, `ruleStyle`,
`progress*Style`) and `core/selection.ts` stay public as the spec → `StyleDesc`
seam a consumer can call without React, and `recipe.test.ts` holds both
expressions equal — including on the shipped themes, where a derived value
differs from the role it starts from (`tone="primary"` paints `brandText`, as
`text-brand` does).

### What GPUix does not provide, and what this package does instead

| Capability | GPUix 0.11.0 | Here |
| ---------- | ------------ | ---- |
| `focusVisible` / `outline*` | **present** | every control declares the keyboard outline at rest (`controlRing` → `focusVisible`); the runtime paints it after Tab and never after a mouse press, and a disabled control declares none so a focused-then-disabled element keeps no ring |
| `aria-checked` | absent | checkbox/radio/switch report state through `aria-valuetext` |
| `aria-valuenow` | absent | `Progress` reports `aria-valuetext` (`"42%"`, or `"loading"`); `Slider`/`RangeSlider`/`Meter` report the value text only — the range is not announced |
| pointer capture | present (armed by a `mouseDown` + `mouseMove` listener pair) | a slider's track carries both, so a drag that leaves the track keeps updating, clamped to the ends, until release; measured in a window by the `pointer-capture` probe and in `runtime/value.runtime.test.tsx` |
| `aria-labelledby` | absent | a control carries its own `aria-label`, written from its `label` prop; `labelledBy(name)` returns `{ label }` so the name is written once. A `Label` given the control's `target` ref also focuses it on a press (`focusElement`) — the `htmlFor` behaviour the runtime has no property for — and `disabled` keeps the words inert with the control |
| Select parts' roles | absent (the trigger and every row are plain `div`s with a tab stop) | the trigger declares `role="combobox"` with the `label` as its name and its open state as `aria-expanded`, and the open list announces itself from inside the role-less parts — a `ListBox` of `option` rows with `aria-selected`, a `Group` per caption — so the control, its state and its choices reach the accessibility tree (`runtime/fields.runtime.test.tsx`). GPUix reports open changes but publishes no state, so the wrapper mirrors them (`open`/`onOpenChange`) |
| scrollbar tint | present | `ScrollArea` tints the platform thumb through `scrollbarColor`/`scrollbarWidth` (measured in `runtime/layout.runtime.test.tsx`) and sets the overflow axes |
| absolute scroll offset | present (`onScrollChange`, `scrollTo`) | `ScrollArea` forwards `onScrollChange`, is a keyboard scroll region (arrows, PageUp/PageDown, Home/End) through the renderer, and hands the scroller out as `viewportRef` (or a composed viewport's `ref`) so a caller can restore a saved offset or return to the top — measured in `runtime/layout.runtime.test.tsx` |
| the scroll box's measured extent | present (`onLayout`, `getElementBounds`) | `ScrollArea`/`ScrollAreaViewport` forward `onLayout` from the element that scrolls — the frame's padding excluded — so a scroll reading measures the same box it reads the offset from; measured in `runtime/layout.runtime.test.tsx` |
| a list revealing its own highlight | absent (`scrollIntoView` scrolls to a scroller's **direct child**, and `Select` never scrolls for its highlight) | a `Select` row brings itself into view after commit from the row's and the list's painted boxes (`core/scroll.ts`'s `revealScroll`), so a row past the 320px cap and a row inside a group are both revealed |
| fade mask | absent | no edge fade: the scroller paints a hard edge |
| rotation, colour interpolation | absent | `Spinner` advances a discrete step on a timer instead of spinning; the step indicators tick at `@gpuixui/motion`'s `motionLevels.step` (120 ms), read rather than copied. A blank `label` is decoration (`role="presentation"`) rather than an unnamed status node |
| `./button` | published (headless) | `Button` keeps this package's contract — the recipe, `loading`, `StateStyle<ButtonState>` — because `buttonProps` would regress four measured behaviours (no `loading`/`Spinner` or `"Loading"` description, no `focused` in its `style` callback, a disabled button kept in the tab order, no held-key guard on the Space release), so adoption was **evaluated and declined**; the comparison is on `docs/button.mdx` and in `TODO.md` §Salvage |

`packages/icons` supplies the icons; `@gpuixui/tokens` supplies the themes.

### The painted hint is a published seam

GPUix shapes an empty host's placeholder itself, in a fixed `#8F8F8F` that no
theme value reaches (`COMPONENTS.md` → Text inputs). The fields therefore hand
the host no `placeholder` and paint the words instead, through one seam
published from the **`@gpuixui/primitives/hint`** subpath so a second package
facing the same runtime paints the same hint rather than keeping a copy:

- `fieldHint` — `fieldHint(field, theme, value, spec)` returns an
  `Option<FieldHint>`: `None` for a blank hint or a field that already has a
  value, and a faded paint while the field is disabled;
- `hintFrame` — `hintFrame(theme, spec)` is the full-inset frame over the host,
  with `pointerEvents: "none"` so a press lands on the host underneath;
- `hintHost` — `hintHost(layout?)` is the positioning context the absolute
  frame needs, carrying the host's own flex layout;
- `renderFieldHint` — `renderFieldHint(hint, testId)` paints one `<text>` named
  `${testId}-hint`;
- `fieldHelp` — `fieldHelp(field, value)` is the words the paint must also
  **say**: a host handed no `placeholder` loses the runtime's `aria_placeholder`,
  so the hint is announced as the field's `aria-description` while the box is
  empty (a caller's `description` wins). The paint and its announcement are one
  contract, so they ship together.

The subpath is deliberate: the package root re-exports every primitive, so
reaching this seam through the barrel loads the whole Tier 1 package to paint
one line of text. `fieldHelp`, `fieldHint`, `hintFrame`, `hintHost` and
`renderFieldHint` are also on the root for the fields in this package.

`spec` is either `{ size, align, origin }` with `origin: "field"` (measured from
the field's border box) or `"content"` (a host already inside that chrome), or
`{ origin: "host", align, style }` for a host another package paints, whose own
resolved style owns the insets and the type.

## Documentation and examples

Every Tier 1 component has a page and a composed example beside the source:

- `docs/` — one page per component (`docs/README.md` indexes them) with usage,
  API, keyboard, accessibility, theming, limitations and verification;
- `examples/` — ten realistic compositions plus the icon set, registered in
  `examples/index.ts` for `apps/playground`;
- `runtime/examples.runtime.test.tsx` — mounts every example in the real
  renderer, so an example cannot rot into source that has never run.

`src/inventory.ts` + `src/inventory.test.ts` hold the `COMPONENTS.md` Tier 1
table to the code: every row has a record, every path a record names exists, a
`done` row has a test, and a row and its record agree on status and GPUix
support. Flip a row back to `todo` and the suite fails — the table had drifted
to `todo` for every row while all of them were built.

The browser docs site (`apps/docs`) is a separate workstream and must not render
these examples as live previews: they are GPUix host trees, not DOM.

## Verification status

`nub run --filter @gpuixui/primitives test` runs the suites: `core/` behaviour
(keyboard, controlled state, variant registry, style resolution, progress
clamping) and the components' element trees (props, ARIA, handlers) via
`src/components/testing/element.ts`.

**What the element-tree suites cannot reach:** a component *function* is a React
hook holder, so a test cannot call `Button(props)` — it asserts on the render
function (`renderButton`, `renderCheckbox`, …) instead. The glue in between
(which resolved state the wrapper hands the renderer) is therefore held by the
type checker and by the native runtime, not by these suites.

**Verified in the real runtime** (`nub run --filter @gpuixui/primitives test:runtime`):
the suites in `runtime/` mount the components in the GPUix 0.11.0
`TestRenderer` and assert only on what the frame produced — painted text,
bounds, hit-tested clicks, dispatched keys, focus, the a11y dump, a scroll
offset, PNG captures. One of them (`examples.runtime.test.tsx`) mounts every
example from `examples/index.ts`, so the documentation's compositions are
runtime-proven too. The suite runs in full — including a theme switch on a
mounted tree, using the shipped `lightTheme` / `darkTheme` from
`@gpuixui/tokens`, a check that no painted colour is outside the active palette,
the high-contrast palettes in both modes on a scene that mounts every Tier 1
component at rest, a density override measured against the
preset's metrics, and a platform theme's mono family reaching the paint. Its
runner prints the file and test counts; no count is copied here to drift.
`runtime/` is deliberately outside `nub run test`, so the default gate still
runs on a host with no binding; `test:runtime` is opt-in and fails loudly when
the binding is absent rather than skipping.

What it observed, per component, is in `COMPONENTS.md`, and each Tier 1 record
in `src/inventory.ts` names the runtime suite that measured it. Capability
verdicts and their probes are in `docs/gpuix-capabilities.md` and
`apps/playground/README.md`.

**Still unproven, on purpose:**

- the binding is the **locally-built** `darwin-x64` artifact, not a published
  binary — no `darwin-x64` release exists;
- the ring's **paint** is the playground's `focus-visible` probe (plan 053): the
  test renderer reports the declared `focusVisible` style, not pixels;
- rotation and colour interpolation are absent from 0.11.0, so
  the alternatives listed above are the honest ones, not a placeholder.

**What the element-tree suites cannot reach and the runtime now covers:** the
glue between a component's hook holder and its renderer (which resolved state is
handed over) is proven by the runtime suites, not by the `src/**` ones.

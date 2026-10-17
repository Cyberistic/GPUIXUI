# `@gpuixui/primitives`

The foundational render primitives and the Tier 1 component set for GPUixUI.
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
a second copy would drift silently.

There is deliberately **no default theme**: a primitive rendered without a
`ThemeProvider` above it throws `MissingThemeProviderError` naming the provider.
A silent default palette is how two design systems end up in one application.

Density is a multiplier over the theme's metrics, never a second palette:
`<ThemeProvider theme={theme} density={extendedTheme.density}>` changes numbers
only. Building density presets is `@gpuixui/tokens`' job, so this package owns no
second copy of them.

No colour, space, radius or font literal may appear outside `src/core/` and its
test fixture — the theme is the only source of those values.

## Two layers

| Layer | What lives there | Why it is separate |
| ----- | ---------------- | ------------------ |
| `core/` | theme re-export, `style.ts` (spec → `StyleDesc`), `variants.ts`, `keyboard.ts`, `state.ts`, `loading.ts`, `layout.ts`, `selection.ts` | pure and runtime-free: this is the part that can be proven without a GPUix runtime, and where the design decisions actually live |
| `components/` | thin renderers over GPUix host elements | each is a resolver call plus, at most, React-local focus or value state |

`core/` must not import `@gpuix/react` at runtime (type-only imports are erased).
`components/` may import the published `/select`, `/tooltip`, `/floating`
subpaths; the package root needs a native binding.

## Components

**Layout** `Box` `Stack` `Grid` `Separator` `Spacer` `ScrollArea`
**Text** `Text` `Label`
**Actions** `Button` `ButtonGroup` `Toggle` `ToggleGroup`
**Fields** `Input` `TextArea` `NumberField` `OTPField` `Select`
**Selection** `Checkbox` `CheckboxGroup` `RadioGroup` `Switch` `Rating`
**Value** `Slider` `RangeSlider` `Meter`
**Feedback** `Progress` `Spinner` `Skeleton` `Tooltip`
**Theming** `ThemeProvider`

Every component is themed by a resolver in `core/style.ts` (`controlStyle`,
`surfaceStyle`, `textStyle`, `ruleStyle`, `progress*Style`) or `core/selection.ts`;
none paints a literal and none scripts hover or press
(GPUIx applies `style.hover`/`style.active` natively).

### What GPUix does not provide, and what this package does instead

| Capability | GPUix 0.10.0 | Here |
| ---------- | ------------ | ---- |
| `focusVisible` / `outline*` | absent | the component tracks focus and merges a zero-offset, zero-blur shadow ring (`controlFocusStyle`); a mouse press shows the ring too |
| `aria-checked` | absent | checkbox/radio/switch report state through `aria-valuetext` |
| `aria-valuenow` | absent | `Progress` reports `aria-valuetext` (`"42%"`, or `"loading"`); `Slider`/`RangeSlider`/`Meter` report the value text only — the range is not announced |
| pointer capture | present: GPUI captures the pressed element automatically | a slider drag keeps tracking after the pointer leaves the track and clamps at the ends; it begins on the primary button only (a right/middle click is refused), and click/keyboard remain the precise paths |
| `aria-labelledby` | absent | a control carries its own `aria-label`, written from its `label` prop; `labelledBy(name)` returns `{ label }` so the name is written once; a label beside a control is inert, so `CheckboxGroup` makes the whole row one interactive element instead of pairing a box with a `Text` |
| scrollbar tint, fade mask | absent | `ScrollArea` sets the overflow axes only; the thumb is platform-themed |
| rotation, colour interpolation | absent | `Spinner` advances a discrete step on a timer instead of spinning |
| `./button` | not published | `Button` implements the keyboard contract itself (`core/keyboard.ts`) |
| an anchor that resists its parent | `<anchored>` positions against its parent, and a block-level flex parent stretches on the cross axis | `Tooltip` hugs its trigger with `alignSelf: "flex-start"` so the layer anchors to the trigger, and defaults `align` to the exact `start` (`center` is half a panel off — plan 060) |
| percentage sizing inside a floating layer | `minWidth: "100%"` resolves against the layer, not the trigger | `Select` measures its trigger's painted width and passes a numeric `minWidth` to the list (plan 062) |
| a layer that clamps instead of flipping | `fit="snap"` clamps a layer inside the window **without flipping it**, so a bottom-side layer can cover its trigger, and a top-side one can cover it at the top edge | `Select` measures its trigger, estimates the list height from its own styles, and opens above when the list does not fit below; `Tooltip` measures its root and flips below when the tip does not fit above. An explicit `side` still wins in both (plans 066, 067) |
| no list height cap | the layer grows past the window and the options past the edge are unreachable | `Select` caps a long list to the free space on its side and scrolls it; rows keep their height, so the list scrolls instead of squashing (plan 068) |
| a highlighted option outside a capped layer | the layer scrolls only with the wheel, and the item's `highlighted` state is the only signal the runtime gives | `Select` scrolls the newly highlighted option into view through the renderer's `scrollIntoView`, so the arrows keep the active option visible (plan 069) |
| `aria-invalid` | absent | a failed validation is paint only; `invalid` marks the empty selection or field border and the app pairs it with an error `Text` |

`packages/icons` supplies the icons; `@gpuixui/tokens` supplies the themes.

## Documentation and examples

Every Tier 1 component has a page and a composed example beside the source:

- `docs/` — one page per component (`docs/README.md` indexes them) with usage,
  API, keyboard, accessibility, theming, limitations and verification;
- `examples/` — eleven realistic compositions plus the icon set, registered in
  `examples/index.ts` for `apps/playground`;
- `runtime/examples.runtime.test.tsx` — mounts every example in the real
  renderer, so an example cannot rot into source that has never run.

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
the suites in `runtime/` mount the components in the GPUix 0.10.0
`TestRenderer` and assert only on what the frame produced — painted text,
bounds, hit-tested clicks, dispatched keys, focus, the a11y dump, a scroll
offset, PNG captures. One of them (`examples.runtime.test.tsx`) mounts every
example from `examples/index.ts`, so the documentation's compositions are
runtime-proven too. Measured 2026-10-17: **15 files, 164 tests, all passing** —
including a theme switch on a mounted tree, using the shipped `lightTheme` /
`darkTheme` from `@gpuixui/tokens`, a check that no painted colour is outside
the active palette, the high-contrast palettes in both modes, a density override
measured against the preset's metrics, a platform theme's mono family reaching
the paint (plan 055), a tooltip measured against its trigger in a column and a
row and flipped below at the window's top edge (plans 060, 067), a radio group's failed validation measured on the circles (plan
061), a select's list measured against its trigger's width and — at the window's
bottom edge — opened above the trigger instead of over it, a long list capped and
scrolled with the keyboard highlight kept in view (plans 062, 066, 068, 069), a
slider drag measured outside the track with the non-primary buttons refused
(plan 063),
an `autoFocus` field's ring painted from mount and cleared on blur (plan
064), a checkbox group's row hit area, derived select-all state and skipped
disabled tab stop (plan 065), and a rating's failed validation painted on the
empty stars only (plan 070).
`runtime/` is deliberately outside `nub run test`, so the default gate still
runs on a host with no binding; `test:runtime` is opt-in and fails loudly when
the binding is absent rather than skipping.

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

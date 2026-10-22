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
with `@gpuixui/components` wraps once and both read the same theme.

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
| `recipe/` | `@gpuixui/tw` registry + class-string builders for the components already migrated | the Tailwind recipe is the single source of truth for a component's resting appearance; `recipe.test.ts` proves it compiles to the same `StyleDesc` as `core/` |
| `components/` | thin renderers over GPUix host elements | each is a resolver call plus, at most, React-local focus or value state |

`core/` must not import `@gpuix/react` at runtime (type-only imports are erased).
`components/` may import the published `/select`, `/tooltip`, `/floating`
subpaths; the package root needs a native binding.

The migration from `core/` resolvers to `recipe/` class strings is mechanical;
the exact steps and the native-style-prop → utility-class mapping are in
[`MIGRATION.md`](./MIGRATION.md).

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

| Capability | GPUix 0.11.0 | Here |
| ---------- | ------------ | ---- |
| `focusVisible` / `outline*` | **present** | every control declares the keyboard outline at rest (`controlRing` → `focusVisible`); the runtime paints it after Tab and never after a mouse press, and a disabled control declares none so a focused-then-disabled element keeps no ring |
| `aria-checked` | absent | checkbox/radio/switch report state through `aria-valuetext` |
| `aria-valuenow` | absent | `Progress` reports `aria-valuetext` (`"42%"`, or `"loading"`); `Slider`/`RangeSlider`/`Meter` report the value text only — the range is not announced |
| pointer capture | present (armed by a `mouseDown` + `mouseMove` listener pair) | a slider's track carries both, so a drag that leaves the track keeps updating, clamped to the ends, until release; measured in a window by the `pointer-capture` probe and in `runtime/value.runtime.test.tsx` |
| `aria-labelledby` | absent | a control carries its own `aria-label`, written from its `label` prop; `labelledBy(name)` returns `{ label }` so the name is written once |
| scrollbar tint | present | `ScrollArea` tints the platform thumb through `scrollbarColor`/`scrollbarWidth` (measured in `runtime/layout.runtime.test.tsx`) and sets the overflow axes |
| absolute scroll offset | present (`onScrollChange`, `scrollTo`) | `ScrollArea` forwards `onScrollChange` and is a keyboard scroll region (arrows, PageUp/PageDown, Home/End) through the renderer, measured in a window |
| a list revealing its own highlight | absent (`scrollIntoView` scrolls to a scroller's **direct child**, and `Select` never scrolls for its highlight) | a `Select` row brings itself into view after commit from the row's and the list's painted boxes (`core/scroll.ts`'s `revealScroll`), so a row past the 320px cap and a row inside a group are both revealed |
| fade mask | absent | no edge fade: the scroller paints a hard edge |
| rotation, colour interpolation | absent | `Spinner` advances a discrete step on a timer instead of spinning |
| `./button` | published (headless) | `Button` keeps this package's contract — the recipe, `loading`, `StateStyle<ButtonState>` — and does not wrap the headless one yet (tracked in `TODO.md`) |

`packages/icons` supplies the icons; `@gpuixui/tokens` supplies the themes.

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
the high-contrast palettes in both modes, a density override measured against the
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

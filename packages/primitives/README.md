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

## The theme is a port, not an import

`PrimitiveTheme` (`src/core/theme.ts`) is an interface declared **here**; a theme
is any value that satisfies it. `@gpuixui/tokens` owns the values, and this
package never imports it, which keeps the dependency arrow pointing one way
(`tokens → primitives → components`) and lets the primitives be tested against a
fixture theme instead of a real palette.

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
| `core/` | theme types, `style.ts` (spec → `StyleDesc`), `variants.ts`, `keyboard.ts`, `state.ts`, `loading.ts`, `layout.ts`, `selection.ts`, `color.ts` | pure and runtime-free: this is the part that can be proven without a GPUix runtime, and where the design decisions actually live |
| `components/` | thin renderers over GPUix host elements | each is a resolver call plus, at most, React-local focus or value state |

`core/` must not import `@gpuix/react` at runtime (type-only imports are erased).
`components/` may import the published `/select`, `/tooltip`, `/floating`
subpaths; the package root needs a native binding.

## Components

**Layout** `Box` `Stack` `Grid` `Separator` `Spacer` `ScrollArea`
**Text** `Text` `Label`
**Actions** `Button` `ButtonGroup`
**Fields** `Input` `TextArea` `Select`
**Selection** `Checkbox` `RadioGroup` `Switch`
**Feedback** `Progress` `Spinner` `Skeleton` `Tooltip`
**Theming** `ThemeProvider`

Every component is themed by `resolveStyleSpec`-style resolvers in `core/style.ts`
and `core/selection.ts`; none paints a literal and none scripts hover or press
(GPUIx applies `style.hover`/`style.active` natively).

### What GPUix does not provide, and what this package does instead

| Capability | GPUix 0.10.0 | Here |
| ---------- | ------------ | ---- |
| `focusVisible` / `outline*` | absent | the component tracks focus and merges a zero-offset, zero-blur shadow ring (`controlFocusStyle`); a mouse press shows the ring too |
| `aria-checked` | absent | checkbox/radio/switch report state through `aria-valuetext` |
| `aria-valuenow` | absent | `Progress` reports `aria-valuetext` (`"42%"`, or `"loading"`) |
| `aria-labelledby` | absent | a control carries its own `aria-label`; `labelledBy` builds the prop so the name is written once |
| scrollbar tint, fade mask | absent | `ScrollArea` sets the overflow axes only; the thumb is platform-themed |
| rotation, colour interpolation | absent | `Spinner` advances a discrete step on a timer instead of spinning |
| `./button` | not published | `Button` implements the keyboard contract itself (`core/keyboard.ts`) |

`packages/icons` supplies the icons; `@gpuixui/tokens` supplies the themes.

## Verification status

`nub run --filter @gpuixui/primitives test` runs the suites: `core/` behaviour
(keyboard, controlled state, variant registry, style resolution, progress
clamping) and the components' element trees (props, ARIA, handlers) via
`src/components/testing/element.ts`.

**Not yet verified:** anything that needs the runtime to paint or dispatch —
layout, hit-testing, focus order, the scroll offset, the actual ARIA tree.
GPUix publishes no `darwin-x64` binary and this environment has no GUI session
(`.agents/slop/plans/020-gpuix-runtime-capability.md` §3), so no component here
claims a verified interaction. That debt and the command that would discharge it
are tracked in `TODO.md`; `apps/playground` (playground workstream) owns it.

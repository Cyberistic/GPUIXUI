# `@gpuixui/tokens`

The single source of truth for colour, typography, spacing, radii, density,
elevation, border widths and icon sizes in GPUIXUI. Light and dark themes are
designed, not inverted — each with a high-contrast variant — and every component
reads semantic roles from here.

- Core entry `@gpuixui/tokens` — pure data and pure functions, no runtime
  dependencies.
- React entry `@gpuixui/tokens/react` — `ThemeProvider` and `useTheme`.
- Reference: [`docs/tokens.md`](../../docs/tokens.md) and
  [`docs/design-system.md`](../../docs/design-system.md).

## Install and import

```sh
nub add @gpuixui/tokens
```

```ts
import { getTheme, textStyle } from "@gpuixui/tokens";
```

```tsx
import { ThemeProvider, useTheme } from "@gpuixui/tokens/react";
```

## Usage

```tsx
import { getTheme, textStyle } from "@gpuixui/tokens";
import { ThemeProvider, useTheme } from "@gpuixui/tokens/react";

function Label({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <text
      style={{
        ...textStyle(theme, "label"),
        color: theme.colors.mutedForeground,
      }}
    >
      {children}
    </text>
  );
}

export function App() {
  return (
    <ThemeProvider theme={getTheme("dark")}>
      <Label>Ready</Label>
    </ThemeProvider>
  );
}
```

There is no OS appearance query in GPUix. The application owns the mode switch
and passes the resolved theme; nested providers scope a brand theme to a
subtree.

## Extending a theme

`createTheme` starts from a built-in theme; `extendTheme` derives from any
theme. Neither mutates its base. Typography merges field by field, elevation
levels replace whole arrays, and the mode is not overridable.

```ts
import { createTheme } from "@gpuixui/tokens";

export const brandTheme = createTheme({
  mode: "dark",
  name: "Acme",
  colors: { primary: "#7C5CFF", ring: "#9B8CFF" },
  radius: { md: 8 },
  density: "compact",
});
```

A complete, executed example lives in
[`src/brand-theme.example.ts`](./src/brand-theme.example.ts).

## High contrast

Each mode has a high-contrast variant with AAA text floors (7:1) and 4.5:1
essential boundaries. It reuses the same 47 roles, so no component changes.

```ts
import { getTheme } from "@gpuixui/tokens";

const theme = getTheme("dark", "high");
```

`getTheme(mode)` is unchanged and returns the default theme. A selection example
lives in [`src/high-contrast.example.ts`](./src/high-contrast.example.ts).

## Status tones

The four status families — `info`, `success`, `warning` and `destructive` — each
have a solid role with a readable foreground and a soft pair for alerts, badges
and toasts. `statusTone` resolves the soft surface, its readable foreground and a
30%-alpha edge; `alpha` turns any hex role into a translucent one.

```ts
import { alpha, statusTone } from "@gpuixui/tokens";

const tone = statusTone(theme, "info");
tone.background; // theme.colors.infoSoft
tone.border; // alpha(theme.colors.info, 0.3)
```

A runnable example lives in
[`src/status-tone.example.ts`](./src/status-tone.example.ts).

## For documentation sites

`colorRoles` lists every semantic role in documentation order, typed as
`keyof ThemeColors`, so a docs site can build colour tables from the package
instead of retyping values:

```ts
import { colorRoles, themes } from "@gpuixui/tokens";

const rows = colorRoles.map((role) => ({
  role,
  light: themes.light.colors[role],
  dark: themes.dark.colors[role],
}));
```

## Boundaries

- No imports from any other workspace package.
- No component-specific tokens: components name intent with the semantic roles.
- No CSS variables or CSS pipeline. GPUix paints inline style values, so theme
  switching is a re-render with a different `Theme`.
- Components must not use `palette` directly; it exists for documentation and
  rare cases with no semantic role.

## Why no Effect here

The package is inert data and total functions: no I/O, no time, no randomness,
no failure path. There is nothing to lift into `Effect`. Effect-first applies
where work can fail or needs dependencies; adding `Effect` to a static theme
object would be ceremony, not safety. The consuming application decodes a
persisted theme at its own boundary, where `Schema` belongs.

## Limitations

- GPUix has no `letterSpacing` style field; the type scale does not define it.
- There is no runtime theme schema; theme objects authored in TypeScript are
  trusted at compile time. Persisted themes are decoded by the application.
- No OS appearance detection; the app selects the mode and contrast.
- No motion tokens yet. Tracked in `TODO.md`.
- Exports point at `src/`: the package is private, so a consumer compiles it
  directly and no build step is required. Phase G flips `exports` to `dist` when
  the package is published.

## Scripts

```sh
nub run --filter @gpuixui/tokens check-types
nub run --filter @gpuixui/tokens test
nub run --filter @gpuixui/tokens build
```

`build` emits `dist/` (JavaScript plus declarations) to validate the package on
its own; consumers never need it and `packages/tokens/src/exports.test.ts` fails
if an `exports` target points back at a build directory.

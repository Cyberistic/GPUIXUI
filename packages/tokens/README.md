# `@gpuixui/tokens`

The single source of truth for colour, typography, spacing, radii, density,
elevation, border widths, icon sizes and avatar diameters in GPUIXUI. Light and
dark themes are designed, not inverted — each with a high-contrast variant — and
every component reads semantic roles from here.

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

## Shadows

The `BoxShadow` the runtime paints has five fields — no `inset`. The runtime also
accepts a shadow list; the elevation scale ships one shadow per level by design,
and `elevationShadow(theme, level)` returns it (`undefined` for the reserved empty
`overlay` level).

```tsx
const shadow = elevationShadow(theme, "md");
<div style={{ boxShadow: shadow }} />;
```

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

## Action fills

A filled action's hover and press are derived, not stored roles:
`filledHover(theme, action)` and `filledPressed(theme, action)` move the role a
step toward the theme's `foreground`, so the fill darkens in a light theme,
lightens in a dark one, and stays opaque — it never shows the surface behind the
control. A brand's `primary` carries its own states with no second edit.

```ts
import { filledHover, filledPressed } from "@gpuixui/tokens";

const hover = filledHover(theme, "primary");
const pressed = filledPressed(theme, "primary");
```

Ghost and subtle surfaces keep the `hover` / `active` washes.

## Focus

The ring is a shadow: zero offset, zero blur, spread by `borderWidth.strong`.
That is what the library ships while the ring still cannot use `outline*`;
`@gpuix/native@0.11.0` declares the outline fields and a `focusVisible` state, and
plan 053 moves the ring there once a native probe proves the paint.

```tsx
import { focusRing } from "@gpuixui/tokens";

<div style={focused ? focusRing(theme) : undefined} />;
```

Apply it while the control is focused. A mouse press shows the ring too, because
the runtime has no `:focus-visible` equivalent. A runnable example lives in
[`src/focus-ring.example.ts`](./src/focus-ring.example.ts).

## Platform styles

`platformStyles` decides each platform once — its families, corner radii, control
density and per-mode chrome colours — and `platformTheme` turns one into a real
theme by deriving it with `extendTheme`. `platformTypes` is the
families-and-label view of the same table.

| Platform | `sans` | `mono` | `radius.md` | density |
| -------- | ------ | ------ | ----------- | ------- |
| macOS (`darwin`) | `.SystemUIFont` | `Menlo` | 6 | `compact` |
| Linux (`linux`) | `.SystemUIFont` | `DejaVu Sans Mono` | 6 | `spacious` |
| Windows (`win32`) | `.SystemUIFont` | `Consolas` | 4 | `comfortable` |
| `default` | `.SystemUIFont` | `Menlo` | 6 | `comfortable` |

`sans` is GPUI's system UI font sentinel on every platform — GPUI resolves it to
the operating system's own UI font. `currentPlatform` is the platform this code
runs on (`default` in a browser or on an OS the library does not know) and
`systemMonoFamily` is its mono family.

The colour table is a partial `ThemeColors` per mode, held to the same contrast
floors as the built-in themes. `default` is the library's own identity and
changes only the name. A high-contrast base keeps its palette and takes only the
families, radii and density, because accessibility outranks the platform look.

```tsx
import { platformTheme, themes } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";

<ThemeProvider theme={platformTheme(themes.dark, "win32")} />;
```

Each platform's values are editable, not a preset you are stuck with:

```ts
import { extendTheme, platformStyles, platformTheme, themes } from "@gpuixui/tokens";

platformStyles.darwin.colors.dark.primary; // "#0A84FF"

const house = extendTheme(platformTheme(themes.dark, "win32"), {
  colors: { primary: "#7C5CFF" },
  radius: { md: 6 },
});
```

A runnable example lives in
[`src/platforms.example.ts`](./src/platforms.example.ts).

## Checking contrast

`contrastRatio(foreground, background)` is the WCAG 2.1 ratio for two opaque
`#RRGGBB` colours, and `undefined` when either is translucent or not hex — a
translucent colour's ratio depends on what is behind it. `contrastFloors`,
`highContrastFloors` and `contrastPairs` are the contract the shipped themes meet,
so a brand can run the same check.

```ts
import { contrastFloors, contrastPairs, contrastRatio } from "@gpuixui/tokens";

const passes = contrastPairs.every(({ foreground, background, floor }) => {
  const ratio = contrastRatio(theme.colors[foreground], theme.colors[background]);
  return ratio !== undefined && ratio >= contrastFloors[floor];
});
```

## Fonts

A theme can only name a family the runtime knows. `registerFonts(registrar,
fonts)` installs font files in a renderer and returns the families a theme may
then name. The runtime takes the file's **bytes** and reads the family from the
font's own name table, so the API takes bytes and declares no new family name of
its own.

```tsx
import { registerFonts } from "@gpuixui/tokens";
import { useGpuixRequired } from "@gpuix/react";
import { useEffect } from "react";

function Fonts({ data }: { data: Uint8Array }) {
  const renderer = useGpuixRequired();
  useEffect(() => {
    if (renderer.registerFont === undefined) {
      return; // the browser renderer installs no fonts
    }
    registerFonts(renderer, [{ family: "Inter", data }]);
  }, [renderer, data]);
  return null;
}
```

Registration is **idempotent per renderer and per file**: calling it on every
mount installs the bytes once. A file the runtime rejects throws and is not
remembered, so a corrected file can be retried. Rendering before registration is
fine — GPUix re-shapes text that already named the family.

The face reaches components through the theme, not through the runtime:

```ts
import { extendTheme, lightTheme, textStyle } from "@gpuixui/tokens";

const theme = extendTheme(lightTheme, { typography: { sans: "Inter" } });
textStyle(theme, "body").fontFamily; // "Inter"
```

The library ships **no font family of its own** yet: a bundled face needs a
licence review that permits redistribution, and that decision is recorded in
`TODO.md`. A consumer registers their own typeface, which is the same route.

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
- A platform style's radii and density follow each platform's own guidelines
  (macOS 28px controls, Windows 32, GNOME 36), not measurements of this runtime;
  a window that differs layers `extendTheme` on the resolved theme.
- A high-contrast theme takes a platform style's families, radii and density but
  not its palette, because no platform palette is designed for the AAA floors.
- `.SystemUIFont` is verified against GPUI's documentation of the name, not yet
  visually in the native runtime (B1 blocks the playground gallery).
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

# `@gpuixui/tokens`

The single source of truth for colour, typography, spacing, radii, density,
elevation, border widths, icon sizes, avatar diameters and motion in GPUIXUI.
Light and dark themes are designed, not inverted — each with a high-contrast
variant — and every component reads semantic roles from here.

- Core entry `@gpuixui/tokens` — pure data and pure functions, no runtime
  dependencies.
- React entry `@gpuixui/tokens/react` — `ThemeProvider` and `useTheme`. It
  carries no JSX, so it compiles under any consumer `jsxImportSource`; a GPUix
  app needs no `@gpuix/react/jsx-runtime` shim.
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

The runtime paints one shadow per element and its `BoxShadow` has five fields —
no `inset`, no list. `elevationShadow(theme, level)` returns the shadow a level
paints (`undefined` for the reserved empty `overlay` level).

```tsx
const shadow = elevationShadow(theme, "md");
<div style={{ boxShadow: shadow }} />;
```

## Motion

Timings are milliseconds in the tokens and seconds in the runtime's transition.
`motionTransition(theme, level, phase)` does the conversion; a step indicator
reads `theme.motion.step` directly for `setInterval`.

```tsx
import { motionTransition } from "@gpuixui/tokens";

const transition = motionTransition(theme, "normal", "enter"); // 0.2s, easeOut
<div style={{ height }} motion={{ animate: { height }, transition }} />;
```

`none`, `step`, `fast`, `normal`, `slow` and `pulse` are the levels;
`standard`, `enter`, `exit` and `linear` are the easings. Override any level to
`0` to remove motion.
A runnable example lives in
[`src/motion.example.ts`](./src/motion.example.ts).

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

## Persisted choices

A stored preference or a URL parameter arrives as `unknown`. `isPlatformName`,
`isThemeMode`, `isThemeContrast` and `isDensityName` narrow it, so a consumer
never retypes a union; a whole theme object loaded from a file is still the
application’s `Schema` boundary.

```ts
import { isDensityName, isPlatformName } from "@gpuixui/tokens";

const platform = isPlatformName(stored) ? stored : "default";
const density = isDensityName(storedDensity) ? storedDensity : "comfortable";
```

## High contrast

Each mode has a high-contrast variant with AAA text floors (7:1) and 4.5:1
essential boundaries. It reuses the same 53 roles, so no component changes.

```ts
import { getTheme } from "@gpuixui/tokens";

const theme = getTheme("dark", "high");
```

`getTheme(mode)` is unchanged and returns the default theme. A selection example
lives in [`src/high-contrast.example.ts`](./src/high-contrast.example.ts).

## Status tones

The four status families — `info`, `success`, `warning` and `destructive` — each
have a solid role with a readable foreground, a soft pair for alerts, badges and
toasts, and an `xText` role for labels, icons and indicator dots on a plain
surface. `statusTone` resolves the soft surface, its readable foreground, a
30%-alpha edge and the text role; `alpha` turns any hex role into a translucent
one. A tone from a payload is unknown until `isStatusTone` narrows it.

```ts
import { alpha, statusTone } from "@gpuixui/tokens";

const tone = statusTone(theme, "info");
tone.background; // theme.colors.infoSoft
tone.border; // alpha(theme.colors.info, 0.3)
```

A runnable example lives in
[`src/status-tone.example.ts`](./src/status-tone.example.ts).

## Focus

GPUix 0.10.0 has no `outline*` properties and no `focusVisible` state, so a focus
ring is a shadow: zero offset, zero blur, spread by `borderWidth.strong`.

```tsx
import { focusRing } from "@gpuixui/tokens";

<div style={focused ? focusRing(theme) : undefined} />;
```

Apply it while the control is focused. A mouse press shows the ring too, because
the runtime has no `:focus-visible` equivalent. A runnable example lives in
[`src/focus-ring.example.ts`](./src/focus-ring.example.ts).

## Platform styles

The variants in `platformNames` are full token themes, not docs-only CSS:
`platformStyles` indexes one editable file per platform under
[`src/platform-styles/`](./src/platform-styles/) and
`getPlatformTheme(platform, mode, contrast?)` derives a real `Theme`.

| Platform | `mono` | Radius `sm` / `md` / `lg` / `xl` | Density | Primary (light) | Primary (dark) |
| -------- | ------ | -------------------------------- | ------- | --------------- | -------------- |
| macOS (`darwin`) | `Menlo` | 4 / 6 / 10 / 12 | `compact` | `#0071E3` | `#0A84FF` |
| Linux (`linux`) | `DejaVu Sans Mono` | 4 / 6 / 12 / 12 | `comfortable` | `#1C71D8` | `#78AEED` |
| Windows (`win32`) | `Consolas` | 2 / 4 / 8 / 8 | `comfortable` | `#0067C0` | `#4CC2FF` |
| Default (`default`) | `Menlo` | 4 / 6 / 8 / 12 | `comfortable` | `#5F4BDB` | `#A7A9FF` |

`sans` is GPUI's `.SystemUIFont` sentinel on every platform — GPUI resolves it to
the operating system's own UI font. The Default variant has no overrides and
returns the identity unchanged.

```tsx
import { getPlatformTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";

<ThemeProvider theme={getPlatformTheme("win32", "dark")} />;
```

High contrast keeps its own colours: `getPlatformTheme(platform, mode, "high")`
applies only the families and shape, because a platform accent must not drop the
AAA floors. To ship your own look, copy a style file and apply it, or extend the
resolved theme:

```ts
import {
  applyPlatformStyle,
  extendTheme,
  getPlatformTheme,
  getTheme,
} from "@gpuixui/tokens";

// A copied `PlatformStyle` with edited values.
const contoso = applyPlatformStyle(getTheme("dark"), contosoStyle);
const tweaked = extendTheme(getPlatformTheme("win32", "dark"), {
  colors: { primary: "#005A9E" },
  radius: { md: 3 },
});
```

Runnable examples live in
[`src/platforms.example.ts`](./src/platforms.example.ts) and
[`src/platform-styles.example.ts`](./src/platform-styles.example.ts).

## Custom typefaces

**Unavailable in the pinned runtime.** GPUix `0.10.0` has no `registerFont`, so a
family must already be installed on the machine. `sans` is GPUI's `.SystemUIFont`
sentinel and `mono` comes from `platformTypes`; a brand can name an **installed**
family through the theme:

```ts
import { extendTheme, themes } from "@gpuixui/tokens";

const theme = extendTheme(themes.dark, {
  typography: { sans: "Helvetica Neue" },
});
```

A family the machine does not have falls back silently, so only name one the
target platforms install. Shipping a typeface with the application needs the
runtime API: `references/gpuix` main carries it as an **unreleased** change (a
minor bump for `@gpuix/native`, `@gpuix/react` and `@gpuix/solid`), and
`@gpuix/native@0.10.0`'s `GpuixRenderer` does not declare it. Plan `052` holds the
design — a `registerFonts(registrar, typefaces)` registry that is idempotent per
renderer and returns the families for `extendTheme` — ready for the release that
exposes it. No font is bundled, so `LICENSES/` has no font entry.

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

`textRoles` does the same for type: all 10 typographic roles in documentation
order, without the `sans`/`mono` families.

```ts
import { textRoles, typography } from "@gpuixui/tokens";

const rows = textRoles.map((role) => ({ role, ...typography[role] }));
```

`statusTones` and `platformNames` do the same for the four status families and
the four platform variants, in documentation and toggle order.

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
- Platform variants express platform conventions with our own values; they do not
  ship a vendor's design system. At high contrast the AAA colour set is kept and
  only families and shape are applied, because accessibility outranks resemblance.
- `.SystemUIFont` is verified against GPUI's documentation of the name, and the
  playground's `theme-type-and-shadow` gallery (plan 150) asserts every type role,
  including the family the runtime reports. A visual per-platform comparison is
  still open.
- There is no runtime theme schema; theme objects authored in TypeScript are
  trusted at compile time. Persisted themes are decoded by the application.
- No OS appearance detection; the app selects the mode and contrast, and also
  which platform style to render.
- No `transition`, `animation`, `transform` or colour interpolation: motion can
  only animate the eight `MotionStyle` properties, and there is no
  reduced-motion query, so a theme that wants none overrides the levels to `0`.
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

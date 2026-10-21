# `@gpuixui/tokens`

The single source of truth for colour, typography, spacing, radii, density,
elevation, border widths, icon sizes, avatar diameters and the categorical data
scale in GPUIXUI. Light and dark themes are designed, not inverted — each with a
high-contrast variant — and every component reads semantic roles from here.

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

A level is a geometry plus a share of the theme's `shadow` role, so the role owns
the tint: `extendTheme` restates every inherited level when `colors.shadow`
changes, and a brand retints the library's shadows by changing that one role.
`elevationWithTint(elevation, tint)` is the same rule on its own, for a theme
composed by hand.

## Layering

There is no stacking token — the published `StyleDesc` has no `zIndex`, so a
surface paints above the page by being **mounted after** it. The model is
`docs/tokens.md` §Layering: five mount layers (inline, anchored, tip, modal,
notice), the toast viewport last in the app root, and Escape/outside presses
offered to the topmost overlay only. The `overlay` **colour role** is the modal
scrim; `elevation.overlay` is a reserved, empty level that lifts nothing.

## Extending a theme

`createTheme` starts from the built-in theme of the requested `mode` and
`contrast` (default contrast when it is not named); `extendTheme` derives from
any theme. Neither mutates its base. Groups merge key by key — a key written as
`undefined` inherits instead of erasing a role the group must carry. Typography
merges field by field, elevation levels replace whole arrays, and the mode is not
overridable.

A brand that changes a fill owns its **on-colour** too: the dark base pairs a
light fill with dark text, so a saturated brand violet needs a white label.

```ts
import { createTheme } from "@gpuixui/tokens";

export const brandTheme = createTheme({
  mode: "dark",
  name: "Acme",
  colors: {
    primary: "#6A45F0",
    primaryForeground: "#FFFFFF",
    ring: "#9B8CFF",
  },
  radius: { md: 8 },
  density: "compact",
});
```

A complete, executed example lives in
[`src/brand-theme.example.ts`](./src/brand-theme.example.ts).

## Persisted choices

Seven axes are choices a consumer stores, and each has an ordered index beside a
guard that takes `unknown`:

| Axis | Index | Guard |
| ---- | ----- | ----- |
| theme mode | `themeModes` | `isThemeMode` |
| contrast variant | `themeContrasts` | `isThemeContrast` |
| platform | `platformNames` | `isPlatformName` |
| authored look | `retroNames` | `isRetroName` |
| density preset | `densityNames` | `isDensityName` |
| control size | `controlSizes` | `isControlSize` |
| status tone | `statusTones` | `isStatusTone` |

The unions derive from the indexes, so a settings row iterates the axis and a
restored preference narrows without retyping the union or casting. Each index is
held to the data it selects — every mode has both contrast variants, every
platform a style, every look a style, every preset a metric per size — by
[`src/guards.test.ts`](./src/guards.test.ts), and
[`src/persisted-choices.example.ts`](./src/persisted-choices.example.ts) resolves
all seven.

```ts
import { getTheme, isThemeMode } from "@gpuixui/tokens";

const mode = isThemeMode(stored.mode) ? stored.mode : "light";
const theme = getTheme(mode);
```

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

## Data series

Charts and legends read a categorical scale, not a semantic role — a series
colour means "a different category", so painting it `warning` would say the
wrong thing. `seriesColors(theme)` returns five colours for the theme's mode and
contrast variant; every one is perceivable on the plot surfaces (`background`,
`card`, `popover`) and every pair is separated by an OKLab distance.

```ts
import { seriesColors } from "@gpuixui/tokens";

const colors = seriesColors(theme); // five swatches, in legend order
```

A brand that wants its own categories carries `series` in `extendTheme`; the
array replaces the shipped scale whole. `seriesFailures(theme)` reports both
contracts and is part of `auditTheme`.

## Focus

Two rings, one per focus path.

`keyboardFocusRing(theme)` is an outline in the runtime's `focusVisible` state:
painted after keyboard input (Tab), never after a mouse press, and it takes no
layout space. Apply it **at rest** — no control tracks focus to draw it.

```tsx
import { keyboardFocusRing } from "@gpuixui/tokens";

<div style={{ ...keyboardFocusRing(theme), backgroundColor: theme.colors.input }} />;
```

`focusRing(theme)` is the unconditional ring: a zero-offset, zero-blur shadow
spread by `borderWidth.strong`. It covers the path the keyboard ring cannot —
a dialog or menu opened by a mouse focuses its content programmatically before
any keyboard input, and the runtime does not paint `focusVisible` there.

```tsx
import { focusRing } from "@gpuixui/tokens";

<div style={focused ? focusRing(theme) : undefined} />;
```

Both were measured in a real window on 0.11.0 (`focus-visible` live probe): Tab
paints the outline and dims the other focusables, a mouse press paints neither,
and a programmatic focus after a Tab paints it. A runnable example lives in
[`src/focus-ring.example.ts`](./src/focus-ring.example.ts).

## Text selection

`selection` is the translucent wash behind a run the reader selected. GPUix
paints it through the `selectionColor` style property, which inherits down a
subtree and defaults to the theme accent at 35%; a component passes
`theme.colors.selection` to keep the selection in the design system's palette.

`selectionPairs` names the four content surfaces body text is selected from (a
field's value, prose, a card, a popover) and
`selectionFailures(theme, floors?)` composites the wash over each one and checks
both jobs: it is visible against its surface (`decorativeFloor`, 1.05:1) and the
text inside it keeps the theme variant's body floor (7:1). A failure names its
`kind` (`visibility` or `legibility`), the pair, the composited colour and the
ratio; `auditTheme` includes the report.

It found three shipped styles under the body floor — Linux dark at 6.63:1 on its
card, Windows dark at 6.33:1 and Luna dark at 6.80:1 on its popover — from a 30%
wash over cards lighter than the base theme's, so each carries the base dark
theme's 24% share now. Secondary text selected under a wash is not measured: it
already sits at 4.5:1, so any visible wash lowers it. A runnable example lives in
[`src/selection.example.ts`](./src/selection.example.ts).

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
floors as the built-in themes. Each style declares the `contrast` variant its
palette is designed for, and `platformTheme` applies it only where that matches
the base theme's own variant. `default` is the library's own identity and changes
only the name. A high-contrast base keeps its palette and takes only the
families, radii and density, because accessibility outranks the platform look.

All three axes are measured as painted: the playground's `theme-platform` probe
reads each platform's mono family, `primary` fill, `lg` radius and `md` control
height back from the runtime (macOS 28 / Linux 36 / Windows 32px). Its negative
control paints the base `radius.lg` instead and fails `expected 10, got 8`.

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
  colors: {
    primary: "#6A45F0",
    primaryForeground: "#FFFFFF",
    ring: "#8A6EFF",
  },
  radius: { md: 6 },
});
```

A runnable example lives in
[`src/platforms.example.ts`](./src/platforms.example.ts).

## Authored looks

A platform style is not the only look a theme can wear. `retroStyles` ships two
more in the same shape — Windows XP's Luna and Windows 7's Aero — and
`retroTheme(base, name)` resolves one for the base's mode. A look is **not a
platform name**: `platformNames` stays the persisted key and the docs toggle's
four choices, and a look is applied by name. `retroNames` / `isRetroName` are its
ordered index and guard, and `applyStyle(base, style)` is the merge rule both
tables go through (`platformTheme` is `applyStyle` over `platformStyles`).

| Look | `sans` | `mono` | `radius.md` | density |
| ---- | ------ | ------ | ----------- | ------- |
| `luna` (Windows XP) | `.SystemUIFont` | `Lucida Console` | 2 | `compact` |
| `aero` (Windows 7) | `.SystemUIFont` | `Consolas` | 4 | `comfortable` |

The chrome values are the era's own and carry no Microsoft artwork, gradient,
icon or logo. Neither era had a dark mode, so both dark editions are authored for
this library — invented, not reconstructions — and all four themes are held to
`contrastFailures` and `decorativeFailures` in `retro.test.ts`. The UI face stays
the sentinel because no font is bundled; the era is carried by colour, radius and
density.

```ts
import { extendTheme, retroStyles, retroTheme, themes } from "@gpuixui/tokens";

retroStyles.aero.colors.dark.primary; // "#5FB6F2"
const brand = extendTheme(retroTheme(themes.dark, "aero"), {
  name: "Aero brand",
  colors: { primary: "#0F5E8C", primaryForeground: "#FFFFFF" },
});
```

A runnable example lives in [`src/retro.example.ts`](./src/retro.example.ts).

## Checking a theme

`auditTheme(theme)` is the gate: it runs every check a browser build gets from
CSS validation and lint, and `passed` is true only when all five reports are
empty. The floors follow the theme's own `contrast` variant, so a brand built
from a high-contrast theme is measured at AAA without the caller naming a floor
set — `contrastFloorsFor(theme)` is that rule on its own, and an explicit
`ContrastFloors` argument overrides it.

The contract covers the state WCAG exempts as well: `disabledForeground` is
measured on the fill that disables it and on `background`, `card` and `popover`
at `contrastFloors.disabled` (1.5:1; 3:1 in a high-contrast theme). That is not a
readability claim — an inactive label is designed quiet — it only says a disabled
control can still be seen as one rather than as an empty box.

```ts
import { auditTheme } from "@gpuixui/tokens";

const audit = auditTheme(brandTheme);
audit.passed; // true when nothing below reports
audit.invalidRoles; // [] — every role is paint-ready
audit.contrast; // [] — every measured pair meets its floor
audit.decorative; // [] — every divider, skeleton, veil, status edge and thumb is visible
audit.series; // [] — every chart swatch is perceivable and distinct
audit.selection; // [] — every selection wash is visible and keeps its text readable
// Otherwise each entry names both roles, the measured ratio and the floor.
```

Each report is also a function of its own:

- `invalidColorRoles(theme)` lists every role whose value is not a hex colour
  GPUix can paint. The runtime **ignores** a value it cannot parse, so a typo
  paints black instead of failing — this is the warning that makes it visible.
- `contrastFailures(theme, floors?)` lists every text-on-surface pair that
  misses its floor, including one it cannot measure because a value is
  translucent.
- `decorativeFailures(theme, floor?)` lists every subtle surface — a divider, a
  skeleton fill, the modal veil, a scrollbar thumb — that is too close to what it
  is painted on to be seen, compositing a translucent role first.
- `seriesFailures(theme, floors?)` lists every chart swatch lost on its plot or
  too close to its neighbour, and reports one it cannot measure.
- `selectionFailures(theme, floors?)` composites the `selection` wash over each
  surface body text is selected from and lists a wash the reader cannot see and
  one that hides the text it selects; see §Text selection.

`contrastRatio(foreground, background)` is the WCAG 2.1 ratio behind the second
check — `undefined` for a translucent or non-hex value rather than a guess.
`contrastFloors` / `highContrastFloors` and `contrastPairs` are the contract the
shipped themes meet, so a brand is held to the same pairs rather than a second
set. The decorative surfaces use `decorativeFloor` (1.05:1, the same
perceptibility floor the soft status surfaces use), and `decorativeSurfaces`
names the placements measured — dividers, skeleton fills, the modal veil, each
status tone's edge (read at the share `statusEdgeAlpha` that `statusTone`
paints) and the scrollbar thumb on the strips a scroller can sit on. Nothing
escapes the contract either: `coverage.test.ts` holds every role in `colorRoles`
to at least one measurement, and names the two that a dedicated contract measures
instead — `selection` and `shadow`. See
[`src/theme-audit.example.ts`](./src/theme-audit.example.ts).

## Fonts

A theme can only name a family the runtime knows. `registerFonts(registrar,
fonts)` installs font files in a renderer and returns the families a theme may
then name. The runtime takes the file's **bytes** and reads the family from the
font's own name table, so the API takes bytes and declares no new family name of
its own.

```tsx
import { registerFonts } from "@gpuixui/tokens";
import { createRenderer, render } from "@gpuix/react";

const renderer = createRenderer();
const families = registerFonts(renderer, [{ family: "Inter", data }]);
// ["Inter"] — the families a theme may now name.

render(<App />, { renderer }); // the first text that names Inter
```

Registration is **idempotent per renderer and per file**: calling it on every
mount installs the bytes once. A file the runtime rejects throws and is not
remembered, so a corrected file can be retried.

Order matters: install the files **before the first render that names the
family**. A family that did not exist when text naming it was first laid out has
fallen back, so registering from a mount effect — after the children that paint
the text — costs a first frame in the fallback. Create the renderer, register,
then render. `registerFont` is optional on a renderer (the browser renderer
installs none), so guard for its absence where the same code can also run in a
browser.

The fallback is a frame, not a verdict: the runtime re-lays text out on the
**next layout**, so a face installed later paints from the next repaint on
(measured in a window: 44px → 81px). Install first because it is the frame the
reader sees, not because a late install loses the face.

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
- The React entry begins with `/** @jsxImportSource react */`. A consumer that
  compiles workspace source with its own `jsxImportSource` would otherwise pull
  *this* file's JSX runtime from a package that does not ship it; the pragma
  keeps the entry portable without a path mapping on the consumer's side.

## Why no Effect here

The package is inert data and total functions: no I/O, no time, no randomness,
no failure path. There is nothing to lift into `Effect`. Effect-first applies
where work can fail or needs dependencies; adding `Effect` to a static theme
object would be ceremony, not safety. The consuming application decodes a
persisted theme at its own boundary, where `Schema` belongs.

## Limitations

- GPUix has no `letterSpacing` style field; the type scale does not define it.
- No `zIndex` in the published API, so there is no `z` token: layering is paint
  order (`docs/tokens.md` §Layering). The repo's source-built binding carries a
  local `zIndex` patch for a probe; library code never writes against it.
- No responsive breakpoints: the runtime has no media queries, so a layout
  responds to window size in the application.
- A platform style's radii and density follow each platform's own guidelines
  (macOS 28px controls, Windows 32, GNOME 36). They are measured as painted — the
  playground's `theme-platform` probe reads the `lg` radius, the `primary` fill
  and the control height per platform — but whether they suit a given window is
  the consumer's call, and one that differs layers `extendTheme` on the resolved
  theme.
- A high-contrast theme takes a platform style's families, radii and density but
  not its palette, because no platform palette is designed for the AAA floors.
- `.SystemUIFont` is a name GPUI documents and the theme asserts it; what face the
  runtime resolves it to is not measured. The playground's `theme-platform`
  gallery proves the platform **mono** families reach the renderer from its style
  report.
- Fonts must be registered before the first layout that names them; a family the
  runtime learns about later paints the fallback until the next layout, which
  re-lays the text out against it. The recommendation is still "create the
  renderer, register, then render"; both orders are measured in a window.
- There is no runtime theme schema; theme objects authored in TypeScript are
  trusted at compile time. Persisted themes are decoded by the application.
- No OS appearance detection; the app selects the mode and contrast.
- Motion lives in `@gpuixui/motion`, not here: durations, easings, springs and
  reduced-motion policy are that package's, and a second copy would duplicate it.
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

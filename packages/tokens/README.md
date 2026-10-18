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

The package is **private until Phase G**, so it installs from this workspace, not
from a registry. Add it to the consuming package's `dependencies` and install:

```json
{ "dependencies": { "@gpuixui/tokens": "workspace:*" } }
```

```sh
nub install
```

Once published, the same entry installs with `nub add @gpuixui/tokens`.

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

`primary` is a fill: it carries `primaryForeground`, and it is only measured as
a fill. Brand-toned text — a link, a label, an icon — reads `primaryText`, which
is held to the text floor on the plain surfaces, the `hover`/`active` washes a
link paints and the `accent`/`selected` fills a link sits on inside a row
(plan 314). A brand that changes `primary` should set `primaryText` beside it.

## Shadows

The runtime paints one shadow per element and its `BoxShadow` has five fields —
no `inset`, no list. A level is geometry plus an alpha applied to the `shadow`
colour role, so retinting every elevation is one value.
`elevationShadow(theme, level)` returns the shadow a level paints (`undefined`
for the reserved empty `overlay` level); `elevationShadows` returns the resolved
list for a renderer that composites.

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

`createTheme({ mode, contrast })` starts from the built-in variant: `contrast`
selects the palette (`"high"` builds on the AAA set) and defaults to
`"default"`. `extendTheme` derives from any theme, including a high-contrast
one. Neither mutates its base. Typography merges field by field, density
metrics size by size, elevation levels replace whole arrays, and the mode is not
overridable. An explicitly `undefined` value is treated as omitted, so a partial
config spread cannot erase a token.

```ts
import { createTheme } from "@gpuixui/tokens";

export const brandTheme = createTheme({
  mode: "dark",
  name: "Acme",
  colors: {
    primary: "#7C5CFF",
    primaryForeground: "#000000",
    primaryHover: "#8F73FF",
    primaryActive: "#A28CFF",
    primaryText: "#C9BDFF",
    ring: "#9B8CFF",
  },
  radius: { md: 8 },
  density: "compact",
});
```

A theme that moves a filled family moves the whole family: the brand's
`primaryForeground`, `primaryHover`, `primaryActive` and `primaryText` are set
beside `primary`, and `accentForeground`, `accentHover` and `accentActive` belong
beside `accent`, and `selection` is the accent's translucent wash. An inherited
state keeps the base hue running the interaction, and an inherited foreground can
miss the on-colour floor.

A complete, executed example lives in
[`src/brand-theme.example.ts`](./src/brand-theme.example.ts) and is held to
`themeContrastFailures` by the package's tests.

## Persisted choices

A stored preference or a URL parameter arrives as `unknown`. `isPlatformName`,
`isThemeMode`, `isThemeContrast`, `isDensityName` and `isControlSize` narrow it,
so a consumer never retypes a union; the ordered indexes — `platformNames`,
`themeModes`, `themeContrasts`, `densityNames`, `statusTones` and
`controlSizes` — are what a settings row or docs toggle iterates. A whole theme
object loaded from a file is still the application’s `Schema` boundary.

```ts
import { isControlSize, isDensityName, isPlatformName } from "@gpuixui/tokens";

const platform = isPlatformName(stored) ? stored : "default";
const density = isDensityName(storedDensity) ? storedDensity : "comfortable";
const size = isControlSize(storedSize) ? storedSize : "md";
```

## High contrast

Each mode has a high-contrast variant with AAA text floors (7:1) and 4.5:1
essential boundaries. It reuses the same 64 roles, so no component changes.

```ts
import { getTheme } from "@gpuixui/tokens";

const theme = getTheme("dark", "high");
```

`getTheme(mode)` is unchanged and returns the default theme. A selection example
lives in [`src/high-contrast.example.ts`](./src/high-contrast.example.ts).

## Checking a theme

`themeContrastFailures(theme, contrast = theme.contrast)` returns every
documented pair the theme misses. The `Theme` records the floor set it is
designed against, so a high-contrast theme is checked at 7:1 with no second
argument, and a brand theme or edited platform style is held to the same floors
as the shipped ones:

```ts
import { themeContrastFailures } from "@gpuixui/tokens";

themeContrastFailures(brandTheme); // []
```

`contrastRatio`, `contrastPairs`, `contrastFloors` and `compositeOver` expose
the parts, and the selection wash is measured as it paints on every surface a
glyph is selected on: the neutral surfaces with `foreground`, `popover` and
`input` with their own text roles, and `selected` with `selectedForeground` at
the secondary floor. Secondary text is measured through the same wash on all
nine surfaces (`mutedForeground`), because a row description, a card caption or
a timestamp is selected with the body copy: seven shipped sets were under
4.5:1 there — identity light 4.06:1 and identity dark 3.49:1 on a pressed row —
until plan 087 moved their secondary grey. `selectionWashPairs` also holds the
wash itself to 1.05:1 against each surface, so a highlight cannot be made
invisible to satisfy a text floor. High-contrast dark shipped at 6.48:1 on `hover`
and 5.49:1 on `active`, Linux dark at 6.92:1 and Windows dark at 6.84:1 on
`active`, until plan 081 darkened the three wash bases. An Alert, Badge or Toast
is measured the same way: the tone's `xSoftForeground` is held to the body floor
through the wash and the wash itself to 1.05:1 on the four soft fills. The audit
found identity light `successSoftForeground` at 5.83:1 through the wash and
Windows dark's wash over `destructiveSoft` at 1.005:1 — an invisible highlight —
so the four light soft foregrounds moved one family step darker, the dark ones
one step lighter with a 20% identity wash, Windows dark's wash moved to 40%, and
Linux dark's soft destructive fill moved to `#3A0B0D` (plan 091). The focus ring is
checked on the canvas, card, popover and the `hover`, `active` and `selected`
washes, so a ring that vanishes on a selected row is caught, and on the four soft
status fills, because a toast's action button is focused while it sits on its own
tint; every shipped variant already clears that floor, so the pairs are a
guarantee rather than a fix (plan 093). The modal scrim is measured the same way:
`overlay` composited over the four base surfaces and held to 1.05:1, which caught
the AAA dark theme's black veil painting **1.000:1** on its pure black canvas and
turned it into a light one (plan 099). A solid role painted as a mark — a
progress segment, slider fill, thumb ring, rating star or timeline dot — is held
to 3:1 (4.5:1 at AAA) by `markPairs`, not to the 1.05:1 an interactive fill's
wash needs (plan 332). Default body text
is checked on the canvas, card, the `muted` panel, `popover`, the
`hover`/`active`/`accent`/`selected` washes and the four soft status fills an
Alert's description and ghost dismiss control paint, so an avatar's initials on
the quiet panel, a date picker's month header on its floating surface, a selected
row's title and an Alert's body are held to the body floor. Typed text (`inputForeground`) is
checked on the `input` fill and on the four `Surface` tones a transparent field
can sit on — `background`, `card`, `popover` and `muted` — so a search box or
inline edit cannot lose its text whichever panel it sits on (plan 319). The
placeholder (`placeholder`) is checked on the `input` fill and on all four
`Surface` tones a transparent field can sit on, because a search box in a
sidebar or a dialog is not tied to one fill; identity dark measured 4.03:1 on
the quiet panel and the floating surface until plan 317 moved it one step. A menu
row's `popoverForeground` on
`hover`/`active`, a selected `Select` option's on `selected` (plan 314), and a
selected row's inherited `selectedForeground` on the `accent` wash a selectable
row hovers and on the `hover`/`active` pointer washes are checked
too (plan 316), and a field's `border` edge is checked on its own `input` fill
(plan 312).
Secondary text is
checked on `hover`, `active`, `accent` and `selected` too, so a row description
stays readable while the row moves — macOS dark shipped at 4.41:1 and 3.55:1
until plan 079. Status text is checked on the same four washes and on the
`muted` quiet panel a sidebar paints (plan 314), so a status dot in a list,
table, menu row or settings sidebar is readable on the fill it sits on: every light set
had a warning label under 4.5:1 on the pressed wash (macOS 4.22:1, Linux 4.24:1,
Windows 4.36:1) and high-contrast light was 5.83:1 on `active` and 6.70:1 on
`accent`/`selected` until plan 083 moved the two warning steps. The functional
control boundary is checked on the `muted` panel, the same four washes and the
four soft status fills, so a checkbox or field inside a row, or an action inside
an Alert or Toast, keeps its `borderStrong` edge: the identity light
set measured 2.62:1 on the pressed wash, macOS light 2.52:1, and high-contrast
dark 4.15:1 until plan 084 moved five boundary values, and identity dark's edge
measured 2.77:1 on `successSoft`, 2.94:1 on `destructiveSoft` and 2.97:1 on
`infoSoft` until plan 092 moved it to `#868FA0`. The same list holds the
soft status surfaces at 1.05:1 against `background`, `card`, `popover` and the
`muted` quiet panel — the platform light variants changed that panel and
inherited the tint, so a sidebar badge measured 1.023:1 on Linux, 1.036:1 on
macOS and 1.043:1 on Windows until plan 300 moved the four light tints one small
step deeper — and
the loading skeleton on those three, the `muted` panel and the
`hover`/`active`/`accent`/`selected` washes a loading row paints — the identity and
high-contrast skeletons *were* the pressed fill (1.000:1) until plan 094 moved
them one ramp step — and the decorative `border` at 1.05:1 (3:1 at high
contrast) on the plain surfaces, on the `secondary`, `secondaryHover`,
`secondaryActive`, `hover`, `active`, `accent`, `accentHover` and
`accentActive` fills a bordered control
paints and on the four soft status fills a
status panel divides, so an Alert, Badge or Toast, a loading placeholder, every
divider and every outlined control's edge stay perceivable. The inherited dark
`successSoft` measured 1.015:1 on Windows, 1.023:1 on the identity and 1.047:1
on Linux until plan 095 darkened it and the soft `destructive` fill one step
while keeping the surface floor.
Each soft status surface has a designed edge (`xSoftBorder`) held to the divider
floor on that surface and on the eight surfaces a chip sits on — the canvas, card
and popover, the `muted` panel and the `hover`/`active`/`accent`/`selected`
washes — because the fill is deliberately close to a row wash and the edge is the
shape a reader sees. The light warning edge measured 1.036:1 on the macOS light
pressed wash and 1.042:1 on the Linux light one until plan 308 moved it to
`#EFC055`, and the 30% mixture that measured 1.12:1 at high contrast cannot
return.
Four shipped sets had the divider equal to the fill it sits on (1.00:1) until
plan 080, so an edge vanished exactly while a control was pressed. The designed
neutral family repeated the defect one role generation later: a secondary control
paints `secondaryHover`/`secondaryActive`, but the edge was still measured on the
pre-097 fills, so macOS light and Windows light measured 1.000:1 and Linux light
1.009:1 on the pressed fill, and both AAA sets sat under their 3:1 floor. The two
fills join the contract, the three light pressed steps and the two AAA dividers
moved, and every shipped theme passes it —
platform variants on their own canvas, not the identity's.
An interactive fill is a surface in its own right: `stateFillSurfacePairs` holds
every interactive fill — the two washes, the `accent` family at rest, hover and
press, `selected` and the `primary`/`secondary`/`destructive` families — to
1.05:1 on `background`, `card`,
`popover` and `muted`, because a fill that matches its panel is not a state. The
identity light `muted` was the same value as its `hover` and `secondary`, the
identity dark `hover` was its `muted` and `popover`, macOS light `selected`
measured 1.021:1 on its canvas and Linux light `accent` 1.001:1 on the panel
until plan 309 moved the light panel one step toward the card and the two light
accents one step deeper.
The inactive state is measured too, and its floor is a design floor rather than a
WCAG one: `inactivePairs` holds `disabledForeground` to 3:1 (4.5:1 at AAA) on the
`disabled` fill, the four plain surfaces, the four row washes and the four soft
status fills a Toast's or Alert's action sits on (`inactiveSoftPairs`), because a
disabled `Select` item paints the label straight onto the menu's `popover` and
measured 1.99:1 on Linux dark until plan 306. The `disabled` fill is allowed to
sit near the panel — no neutral clears both a white card and the quiet panel — so
a disabled control paints its `border` edge, measured on `disabled` and on the
`muted` panel a settings sidebar divides. A disabled control is not an
`opacity: 0.5` composite; it paints the designed pair and the edge.
A runnable example
lives in [`src/contrast.example.ts`](./src/contrast.example.ts).

## Status tones

The four status families — `info`, `success`, `warning` and `destructive` — each
have a solid role with a readable foreground, a soft pair with a designed edge
for alerts, badges and toasts, and an `xText` role for labels, icons and
indicator dots on a plain surface or the
`hover`/`active`/`accent`/`selected` wash a row paints. `statusTone` resolves the
soft surface, its readable foreground, its designed edge and the text role;
`alpha` turns any hex role into a translucent one. A tone from a payload is
unknown until `isStatusTone` narrows it.

```ts
import { alpha, statusTone } from "@gpuixui/tokens";

const tone = statusTone(theme, "info");
tone.background; // theme.colors.infoSoft
tone.border; // theme.colors.infoSoftBorder
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

## Selection and scrollbars

`selectionStyle(theme)` maps the translucent `selection` role to the runtime's
inherited `selectionColor`; apply it once on the app root. Chrome that must not
be selectable sets `userSelect: "none"`. A runnable example lives in
[`src/selection.example.ts`](./src/selection.example.ts).

```tsx
import { selectionStyle } from "@gpuixui/tokens";

<div style={selectionStyle(theme)}>{children}</div>;
```

The native scrollbar cannot be tinted in GPUix 0.10.0 — `scrollbarColor` and
`scrollbarWidth` are unreleased on `main` — so `theme.colors.scrollbar` is
reserved for the release that exposes them.

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
returns the identity unchanged. Each real variant also carries its own dark
`skeleton`, because a placeholder sits on that platform's card.

```tsx
import { getPlatformTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";

<ThemeProvider theme={getPlatformTheme("win32", "dark")} />;
```

`platformTheme(base, platform)` is the deprecated pre-063 bridge: families and
name only, kept for the `primitives` package until it migrates. New code uses
`getPlatformTheme`.

Two **recipes** sit beside those variants: Windows XP (Luna) and Windows 7
(Aero), in `platformRecipes`. A recipe is an edition of a platform, not a fifth
platform — `platformNames` is unchanged — and `getPlatformRecipeTheme(recipe,
mode, contrast?)` resolves it through the same path. `platformRecipeNames` and
`isPlatformRecipeName` do for a stored recipe choice what the platform index and
guard do for a platform. The files live in
[`src/platform-styles/recipes/`](./src/platform-styles/recipes/) and are held to
the contrast contract in both modes; their dark halves are interpretations that
carry the Windows dark palette, because neither Windows version shipped a dark
mode.

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

The applied theme declares the level of the palette it carries (plan 301):
`applyPlatformStyle(highBase, style)` keeps the AAA palette and the `high` claim,
while naming `"default"` applies the platform colours and returns a `default`
theme, and a style with no colour overrides keeps the base's level. A colour key
set to `undefined` is not an override: the role inherits and the level stays with
the base (plan 323).

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

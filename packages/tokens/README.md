# `@gpuixui/tokens`

The single source of truth for colour, typography, spacing, radii, density,
elevation, border widths, icon sizes, avatar diameters and the categorical data
scale in GPUIXUI. Light and dark themes are designed, not inverted — each with a
high-contrast variant — and every component reads semantic roles from here.

- Core entry `@gpuixui/tokens` — pure data and pure functions, no runtime
  dependencies.
- React entry `@gpuixui/tokens/react` — `ThemeProvider`, `useTheme` and
  `useThemePresence`.
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

The deepest level must also be **visible** on the strips a raised surface falls
on, which `decorativeFailures` measures as a ceiling — a blurred shadow passes
below the floor only when a reader cannot see it at all. That found the
high-contrast dark theme, whose black tint on a pure-black page read 1.00:1 at
every level; its tint is the grey its raised controls use now.

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
merges field by field, elevation levels replace whole arrays, a `density`
override merges each control size so raising `md` keeps `sm` and `lg`, and the
mode is not overridable.

A brand that changes a fill owns its **on-colour** too, per mode. Dark themes
pair a light fill with dark text, so the brand's dark fill is a light violet with
the near-black iris on it; light themes pair a dark fill with a white label. The
fill is also the mark a progress bar and a spinner dot paint, so `auditTheme`
holds it to being findable on the card as well — a violet that carries white text
in dark mode is too dark to be a mark.

```ts
import { createTheme } from "@gpuixui/tokens";

export const brandTheme = createTheme({
  mode: "dark",
  name: "Acme",
  colors: {
    primary: "#B49CFF",
    primaryForeground: "#1C1547",
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

The soft surface and its 30%-alpha edge are both **decorative** — the message's
text carries the meaning — so `decorativeFailures` holds the tint to 1.05:1 on
the four strips a message sits on (page, card, popover, muted toolbar) and the
edge to the same floor on the tint it bounds. A soft **badge** is the one status
message painted inside a row, so that edge is measured on the four washes a row
tints under it (`hover`, `active`, `selected`, `accent`) as well — on a wash the
edge is the whole pill, because the tint and the wash are both pale surfaces.
The label is text, so it is in the
contrast table instead: `xSoftForeground` on `xSoft` at the body floor, and on
every strip a message can be written on — the page, a card, a popover and a
`muted` toolbar, because a `FieldError` paints the role with no fill of its own.

A runnable example lives in
[`src/status-tone.example.ts`](./src/status-tone.example.ts).

## Action fills

A filled face's hover and press are derived, not stored roles:
`filledHover(theme, role)` and `filledPressed(theme, role)` move the role a step
toward the theme's `foreground`, so the fill darkens in a light theme, lightens
in a dark one, and stays opaque — it never shows the surface behind the
control. A brand's `primary` carries its own states with no second edit.

`FilledRole` is the three actions plus `accent`, the toggle's on-state. The step
is a ceiling: it stops where the role's on-colour would lose the floor the theme
declares, which the accent face does in macOS dark (4.13:1 pressed at the full
step, under 4.5) and both high-contrast themes (6.90/6.94:1, under 7). Every
action keeps the full 12% hover and 18% press in all 16 shipped styles.

```ts
import { filledHover, filledPressed } from "@gpuixui/tokens";

const hover = filledHover(theme, "primary");
const pressed = filledPressed(theme, "accent");
```

Ghost and subtle surfaces keep the `hover` / `active` washes — but a **filled**
action must never take them, because the wash is often the fill it replaces. The
components package's `secondary` variant did: **15 of its 32 pointer placements**
sat under the 1.05:1 perceptibility floor over the 16 styles (hovered 1.000:1 in
High contrast light, High contrast dark and Light · macOS, pressed 1.000:1 in
Dark · Windows; base light 1.036:1), and it derives both states from its own fill
now. The derivation's step is
measured too — `actionFeedbackPlacements` and `actionFeedbackFailures` hold both
states of all four roles against the fill each replaces, inside the
`decorative` report, which is how Windows dark's `#60CDFF` primary hover at
1.05:1 was found and fixed (`#59C9FF`, 1.059:1) and how a one-hue brand whose
`foreground` sits on its own action fill is caught. `filledFeedback(source,
role, state)` is the derivation for a stored theme, and answers `undefined` for
a role the theme lost.

## Brand text

`primary` is a fill, not a text colour: it is designed to carry
`primaryForeground`, and as text it is under the 4.5:1 a link needs — the base
light brand measures 4.30:1 on the wash a pressed link tints behind itself and
macOS dark 3.10:1. `brandText(theme)` returns the brand where it already reads
and otherwise steps it toward the theme's `foreground` until the least readable
of the eight surfaces a link can sit on clears the theme's floor (4.5:1 default,
7:1 high contrast) — the page surfaces, the washes a link tints, and the
`accent`/`selected` washes a row paints under an action in its `trailing` slot.

```ts
import { brandText } from "@gpuixui/tokens";

const link = { color: brandText(theme) };
```

Status text — a required marker, a field error — is
`statusTone(theme, tone).foreground`, the tone's readable role.

## Data series

Charts and legends read a categorical scale, not a semantic role — a series
colour means "a different category", so painting it `warning` would say the
wrong thing. `seriesColors(theme)` returns five colours for the theme's mode and
contrast variant; every one is perceivable on the plot surfaces (`background`,
`card`, `popover`), every pair is separated by an OKLab distance, and every pair
stays separated after protanopia, deuteranopia and tritanopia are simulated.

```ts
import { seriesColors, simulateColorVision } from "@gpuixui/tokens";

const colors = seriesColors(theme); // five swatches, in legend order
simulateColorVision(colors[0], "deuteranopia"); // the same swatch to a deuteranope
```

A brand that wants its own categories carries `series` in `extendTheme`; the
array replaces the shipped scale whole. A style carries one in the
`PlatformStyle` shape (`PlatformStyle.series`, per mode), which `applyStyle`
hands to the base theme under the same rule as the look's palette — a house copy
of Luna, whose beige toolbar swallows the shared light amber at 2.75:1, carries
the scale its own plot strips need (`beigeLook` in `series.example.ts`). A plot drawn on a strip that is not one of the three
defaults names it: `seriesFailures(theme, { surfaces: ["muted"] })`.
`seriesFailures(theme)` reports all three contracts and is part of `auditTheme`.

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

A **control** declares its ring through `controlFocusRing(theme, { disabled, invalid })`,
because its own state changes what it may paint: the same outline while it can
act, the `destructive` role while it failed validation (so its focus line and
its edge agree), and **no ring** while it is disabled — the runtime keeps the
focus of an element it disables, so a declaration made anyway would sit on a
control that refuses every key. The absence is `undefined`, so a spread paints
the fill and nothing else.

```tsx
import { controlFocusRing } from "@gpuixui/tokens";

<div style={{ ...controlFocusRing(theme, { disabled, invalid }), backgroundColor: theme.colors.input }} />;
```

The two component packages decide that rule in their own seam today; this helper
is the one home the tokens package publishes for it.

## Keyboard focus dim

While one element has keyboard focus, GPUix multiplies **every other focusable
element's** opacity by `keyboardFocusDimOpacity` (`0.4`) — but a focused
`input`/`textarea` dims nothing, because typing is keyboard input too, so a
filled action beside a form keeps its label while a reader types. The field is
on by default, per element, and an element that draws its own focus look opts out
with `keyboardFocusDim: false`. The share is measured, not assumed: the
`keyboard-focus-dim` window capture paints the dark theme's `muted` fill
`#222730` as `#181C23` and its `foreground` text `#EEF1F5` as `#6E7177` over that
fill, which is `blend(colour, behind, 1 - 0.4)`.

`keyboardDimPairs` is the 40 placements the three filled actions, a field's
value and placeholder in both of its fills (a plain field's `input` and the page
role a composite field paints), a focusable row's own text and a selected row sit
on, and
`keyboardDimFailures(theme, floor?)` composites each one. The floor is
`decorativeFloor` (1.05:1) rather than a readability floor — the dim is a
where-can-Tab-go cue — and the tightest shipped placement is Linux light's
`primary` over a card at 1.27:1, so a control whose text must stay readable while
the focus is elsewhere opts out of the dim; the lowest field placement is the
macOS light's composite hint on a muted strip at 1.68:1.

## Text selection

`selection` is the translucent wash behind a run the reader selected. GPUix
paints it through the `selectionColor` style property, which inherits down a
subtree and defaults to the theme accent at 35%; a component passes
`theme.colors.selection` to keep the selection in the design system's palette.

`selectionPairs` names the surfaces text is selected from: the five content
surfaces body text is read on (a field's value, prose, a card, a popover and a
message bubble's `muted` fill) and the three prose surfaces again for the
secondary `mutedForeground` line beside it. `selectionFailures(theme, floors?)`
composites the wash over each one and checks both jobs: it is visible against
its surface (`decorativeFloor`, 1.05:1) and the text inside it keeps the floor
its unselected pair already met — the theme variant's body floor (7:1) for body
text, its secondary floor (4.5:1) for the line under a heading. A failure names
its `kind` (`visibility` or `legibility`), the pair, the composited colour and
the ratio; `auditTheme` includes the report.

It found three shipped styles under the body floor — Linux dark at 6.63:1 on its
card, Windows dark at 6.33:1 and Luna dark at 6.80:1 on its popover — from a 30%
wash over cards lighter than the base theme's, so each carries the base dark
theme's 24% share now. Measuring secondary text then found nine styles had no
headroom for any wash: the grey ramp's 600 and 400 steps sat at the 4.5:1 floor,
so the wash buried them. The base light secondary text is `#4B5362` and the dark
one `#C1C7D1` — a step further from their surfaces — with the two authored looks
carrying their own tint, and the high-contrast dark wash at 26% so its 7:1
secondary text clears the composite. The bubble was the fifth surface it found:
Aero dark's 30% share left a user message's body text at 6.55:1, so that look
carries the 24% its siblings use, and the tightest bubble in the library is Luna
dark at 7.12:1. A runnable example lives in
[`src/selection.example.ts`](./src/selection.example.ts).

The two **saturated state tones** are deliberately not surfaces: a box paints
`accent` and `selected`, and both are drawn from the same accent family as the
wash, so a selection moves them toward the text rather than away from it. The
wash costs contrast in all 80 placements on those tones and leaves 39 under the
floor the unwashed pair met (tightest: Luna dark's secondary line on a selected
row, 3.78:1; tightest body placement: the base dark theme's selected row title,
5.33:1). A selectable run belongs on a content tone; the suite reads the
tones the box resolves so one cannot be added without a measurement or a
recorded reason.

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
    primary: "#B49CFF",
    primaryForeground: "#1C1547",
    // Light enough to be found on the selected wash its ring hugs.
    ring: "#9B8CFF",
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
  // The mark a checked row paints is the same role: a dark wash needs the
  // light blue here, so the brand owns `primary` per mode.
  colors: { primary: "#4FA9E0", primaryForeground: "#06222F" },
});
```

A runnable example lives in [`src/retro.example.ts`](./src/retro.example.ts).

## Checking a theme

`auditTheme(theme)` is the gate: it runs every check a browser build gets from
CSS validation and lint, and `passed` is true only when all ten reports are
empty. The floors follow the theme's own `contrast` variant, so a brand built
from a high-contrast theme is measured at AAA without the caller naming a floor
set — `contrastFloorsFor(theme)` is that rule on its own, every report that takes
floors starts from it (so `contrastFailures(theme)`, `selectionFailures(theme)`
and `indicatorFailures(theme)` answer with the gate's floors), and an explicit
`ContrastFloors` argument overrides it. The disabled fade is the exception: it
is held to `contrastFloors.disabled` in every variant, because a fade is a
mechanism rather than a readability claim.

The contract covers the state WCAG exempts as well: `disabledForeground` is
measured on the fill that disables it and on `background`, `card` and `popover`
at `contrastFloors.disabled` (1.5:1; 3:1 in a high-contrast theme). That is not a
readability claim — an inactive label is designed quiet — it only says a disabled
control can still be seen as one rather than as an empty box. The other mechanism
a control can use, fading itself by `disabledOpacity` (the `disabled:opacity-50`
in the recipes), is measured by `disabledFadeFailures`, which composites the
label over the faded fill; it clears the default floor in every theme but cannot
reach a high-contrast theme's 3:1, which is why the role pair is the contract.
The fade is also a **page** mechanism: its result belongs to the strip behind the
control, and a faded `primary` label lands at 1.47:1–1.49:1 on a card in four of
the light styles (Linux, macOS, Windows XP Luna, Windows 7 Aero). So a filled
action is measured on the page only, and `disabledAction(theme)` is the paint a
disabled action wears anywhere else — `disabled` behind `disabledForeground`, the
pair the table already measures. Its **fill** also replaces the face of the
control it makes unavailable, so `decorativeFailures` holds it apart from
`primary`, `secondary`, `destructive`, `accent` and `input`: both high-contrast
themes shipped `disabled` equal to `secondary`, so an unavailable action and an
enabled tonal action painted the same box in the variant a reader selects for
clarity.

```ts
import { auditTheme } from "@gpuixui/tokens";

const audit = auditTheme(brandTheme);
audit.passed; // true when nothing below reports
audit.invalidRoles; // [] — every role is paint-ready
audit.invalidShadows; // [] — every elevation shadow a brand supplied is paint-ready
audit.invalidNumbers; // [] — every size, length and shadow is layable, every weight and leading is usable, every control height and row height is pressable, and the strong body role shares the body's size and leading and outweighs it
audit.contrast; // [] — every measured pair meets its floor
audit.decorative; // [] — every divider, skeleton, veil, status tint and edge, thumb, state wash, control face, disabled face and shadow is visible
audit.series; // [] — every chart swatch is perceivable and distinct
audit.selection; // [] — every selection wash is visible and keeps its text readable
audit.indicators; // [] — every progress fill, spinner dot and presence mark is visible
audit.disabledFade; // [] — every faded disabled label still reads against its faded fill
audit.keyboardDim; // [] — every label the runtime's keyboard dim fades is still visible on its dimmed fill
// Otherwise each entry names both roles, the measured ratio and the floor.
```

A theme restored from storage can be **incomplete**. A missing colour role or
elevation level is a line in the report, but a missing **numeric step** is not
something the reports can describe: `invalidNumbers` walks the steps a theme
carries, so it says nothing about one that is not there, while
`textStyle(theme, "codeBlock")` reads `typography.codeBlock.fontSize` and throws
at the first paint that asks for the role. So `auditTheme` refuses a theme missing
a step — or a whole numeric group — and names the path (`typography.codeBlock`,
`density.controlHeight.sm`); such a theme is rebuilt from a shipped one with
`extendTheme`. The required steps are derived from the scales the package ships,
so a role or metric added to one is required on the next release.

`keyboardDimFailures(theme, floor?)` is the tenth report (`audit.keyboardDim`):
it measures the dim the runtime paints on every other focusable while one has
keyboard focus, at `decorativeFloor` (see §Keyboard focus dim). The dim and the
disabled fade are the same composite with two shares, so no palette fails the
dim alone — the dim's band sits inside the fade's — and what the report adds is
the placement and the mechanism, so a consumer knows which control has to
declare `keyboardFocusDim: false`.

Each report is also a function of its own:

- `invalidColorRoles(theme)` lists every role whose value falls outside the
  colour grammar GPUix paints — CSS Color 4, which the pinned release parses with
  `csscolorparser` 0.8.3: hex in any of its four lengths, a named colour, or an
  `rgb`/`hsl`/`hwb`/`hsv`/`lab`/`lch`/`oklab`/`oklch` function. The runtime
  **ignores** a value it cannot parse, so a typo paints black instead of failing —
  this is the warning that makes it visible. A role the theme does not carry is
  reported with `value: undefined`, which is the shape a theme restored from
  storage has when it predates a role the library added: the source is
  `Partial<ThemeColors>` and `isPaintableColor` takes `unknown`, so absence is a
  line in the report rather than a `TypeError`. The measurement dialect is hex:
  the contrast and decorative contracts read every length the renderer paints —
  shorthand `#fff` widens, with or without the `#`, and a fully opaque `FF` alpha
  byte is the opaque colour it is rather than a share — so a hand-written brand is
  measured, and a brand in a named colour or a colour function has its pairs
  reported unmeasurable rather than guessed.
- `invalidShadowColors(theme)` applies the same grammar to every shadow in the
  elevation scale, which the role report cannot see: a level a brand supplies
  replaces the array whole, and a colour the runtime ignores paints no shadow at
  all. A level the theme does not carry is reported once, at position `0`, with
  no colour. `isPaintableColor(value)` is the grammar on its own.
- `invalidNumbers(theme)` lists every numeric token the renderer cannot lay out
  or a pointer cannot press. A style batch is JSON, so `NaN` and `Infinity`
  reach native as `null` and the property is dropped — the element paints as if
  the value were never set — while a negative size is accepted and paints
  nothing usable. Each failure names its group, path, value and the rule it
  missed; a shadow offset may be negative, but a type size must be positive, a
  type role's leading must reach its own size (a shorter one starts the next
  line inside this line's glyphs),
  a control height and a row height must reach `targetSize.minimum`, because the
  library builds the control box at that height and a `dense` list row at the
  row height, reserving no extra hit area on either, and a control height must
  contain the leading of the `label` or `body` text a control paints **and the
  `iconSize.md` glyph it draws** — the box is exactly that height, so a brand
  that grows its type or its icon scale past it is reported as `fits` while
  every number is still layable. The strong body role must be the body's
  emphasis: the two share a size and a leading — one emphasis at one size — and
  the strong role weighs more. A brand that forwards one stored weight to every
  role paints a card title as plain text, and a brand that raises only the body's
  size or leading makes that title the smaller or the looser line; both are
  reported as `emphasis` on `bodyStrong.fontSize`, `.lineHeight` or
  `.fontWeight` — the number that has to change. A type role's weight
  must also be finite: the runtime clamps a real number into its 1–1000 range, so
  a variable font's 450 paints, while a weight the theme computed to `NaN` or
  `Infinity` is dropped before native and the role paints at the runtime's
  default weight — reported as `finite` on the role's `fontWeight`, which is the
  shape a theme restored from storage arrives in. The strong border must
  paint: it
  is the width of both focus rings, so a zero there leaves the outline and the
  fallback shadow invisible while every colour report stays clean.
- `invalidScales(theme)` lists every named step that does not exceed the one
  before it — spacing, radii, border weights, icon sizes, the type hierarchy, the
  control heights and paddings, and the elevation levels by the distance each
  level's shadow reaches below its box. Every value can be layable while the name
  still lies: a `sm` control taller than its `lg`, a dialog as square as a card,
  or a dialog casting a tighter shadow than a menu. It is not one of the audit's
  ten reports yet (the docs readout words each report it prints), so run it
  beside `auditTheme`; it found the Windows style's `xl` radius equal to its
  `lg`.
- `contrastFailures(theme, floors?)` lists every text-on-surface pair that
  misses its floor, including one it cannot measure because a value is
  translucent. The floors default to the theme's own variant.
- `decorativeFailures(theme, floor?)` lists every subtle surface — a divider, a
  skeleton fill (on the page, a card, a muted list and the fill a loading dialog
  paints), the modal veil (on the content strips a window holds behind it:
  a card, a popover, a `muted` toolbar, a `secondary` panel, a field's `input`
  fill, and the washes a row can be wearing when a surface opens over it —
  `selected`, `accent` and `active` — with the page's void exempt because
  nothing can darken a black page), a
  status tone's soft tint and its edge, a
  scrollbar thumb, the wash a hovered or selected row is tinted with, the fill a
  tonal action rests on, the derived hover and press of every filled role (a
  step that lands on the fill it replaces) — that is too close to what it is
  painted on to be seen,
  compositing a translucent role first. Each half found a shipped alias: the base
  dark theme's `hover` was its `popover`, so a hovered menu row painted nothing;
  light `secondary` was its `muted` value and paints no border, so a secondary
  button in a toolbar was a label with no button around it; and the light
  `successSoft` was 1.006:1 on the muted strip it sat in, so a soft badge there
  had no surface (the light tints moved one ramp step deeper and the dark ones one
  step lighter, with Luna — whose beige page is at a pale tint's own lightness —
  carrying a lighter tint of its own).
- `seriesFailures(theme, contract?)` lists every chart swatch lost on its plot,
  too close to its neighbour, or too close to it for a reader with a colour-vision
  deficiency, and reports one it cannot measure; `contract.surfaces` names the
  strips a plot is drawn on when they are not the default three.
- `selectionFailures(theme, floors?)` composites the `selection` wash over each
  surface text is selected from and lists a wash the reader cannot see and one
  that hides the body or secondary text inside it; the text floors default to the
  theme's own variant. See §Text selection.
- `disabledFadeFailures(theme, floor?)` composites the disabled fade a control
  applies (`disabledOpacity`) and lists a label that disappears into the faded
  fill; the role pair is measured by `contrastFailures`, this is the other
  mechanism.
- `disabledAction(theme)` is the paint a disabled filled action wears where the
  fade is not the contract — the neutral `disabled` fill behind
  `disabledForeground`, rather than a translucent control whose label follows the
  surface behind it.
- `indicatorFailures(theme, floors?)` lists every progress fill, spinner dot,
  slider fill or presence mark that cannot be found on the strip it is drawn on,
  and reports one it cannot measure. The floor defaults to the theme's own
  variant (4.5:1 high contrast). A status mark paints the tone's readable
  role, never its solid fill; see §Checking a theme.

`contrastRatio(foreground, background)` is the WCAG 2.1 ratio behind the second
check — `undefined` for a translucent or non-hex value rather than a guess.
`contrastFloors` / `highContrastFloors` and `contrastPairs` are the contract the
shipped themes meet, so a brand is held to the same pairs rather than a second
set. An invalid control's edge — the `destructive` role as a field's border and
focus line — is held to the boundary floor on the six strips a control sits on:
four through the mark contract and two (`input`, `secondary`) through
`contrastPairs`. The strong edge is measured on the two washes a **row** paints
under a control in its `trailing` slot as well — `accent` while the pointer is
over the row, `selected` once it is chosen — because the default `secondary`
action owns that edge and a brand could otherwise paint it in the row's colour.
A control that paints no fill of its own — the `outline` and `ghost` variants —
keeps `foreground`, and a quiet label or icon `mutedForeground`, so the
segmented `secondary` group strip is measured as the background of both rather
than only as the strip its edge and ring are found on.
The decorative surfaces use `decorativeFloor` (1.05:1), and
`decorativeSurfaces` names the placements measured — dividers, skeleton fills,
the modal veil on the strips a modal covers, each status tone's soft tint on the four strips a message sits
on and its edge on those same four and on the four washes a row tints under a
badge (read at the share `statusEdgeAlpha` that `statusTone` paints), the
scrollbar thumb, `hover`/`active`/`selected`/`accent`
and the `secondary` fill on the four strips a control can sit on, and the
deepest elevation level composited over those four plus the washes a row can be
wearing when a context menu opens over it (`selected`, `hover`, `accent`,
`active`). Nothing escapes the
contract either:
`coverage.test.ts` holds every role in `colorRoles` to at least one measurement,
and names the one a dedicated contract measures instead — `selection`, by
`selectionFailures`. See
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

## Native text hosts

`<input>`, `<textarea>` and `<code>` are drawn by the runtime's text engine, so
their palette arrives through the host's `theme` prop rather than through style
properties. A host given no theme falls back to the runtime's **built-in dark**
palette — the pinned typings say so — so a field in a light theme would paint a
placeholder and a caret chosen for a dark surface. `nativeTextTheme(theme, fill)`
is that boundary:

```tsx
import { nativeTextTheme } from "@gpuixui/tokens";

<input theme={nativeTextTheme(theme)} />; // a plain field: fill `input`
<input theme={nativeTextTheme(theme, "background")} />; // a composite field
```

The optional second argument names the fill the field paints — `input` for a
plain field, the page role for a composite one (search, tag and mention fields,
the chat composer, the inline edit) — because the value, the placeholder and the
caret are measured against it (`nativeTextFills` is the two-value list). A host
is handed the theme's mode, families, `inputForeground`/`mutedForeground`, the
`placeholder` role and `primary` as its caret and accent. A `<diff>` host takes
three more: `diffAdd`/`diffDel` are the `success`/`destructive` tone's readable
role (the runtime tints the row under a changed line at 5.5% of the same value,
exported as `nativeDiffWash`), a hunk header sits on the `muted` `diffHunkBg` and
its file path is `textDim`. A `<markdown>` host takes a document's body, heading
and code type from `typography` (a diff's rows follow `codeBlock` too), inline
code as the page ink on a `muted` chip (`codeText`/`codeWash`) rather than the
runtime's violet, and its table rules from `border`. A native field's placeholder is **not** themeable at
0.11.0 — the runtime shapes an empty field's hint with a fixed `#8F8F8F` — so a
component that needs a themed hint paints it itself. The muted role is
measured on that fill too: the same pair covers the separator and clear glyph a
time picker paints inside a field's `input` root and a number field's stepper
chevrons, so a brand with a tinted fill cannot bury either in silence.

A `<code>` host is the one host whose **type** also comes from the theme object:
the runtime sizes a code block from the theme's own `metrics` when an element's
`style` does not set the size, so the seam hands over `typography.codeBlock`'s
size and leading (`host.metrics.codeTextSize` / `codeLineHeight`). The runtime's
own code block is 12.5/18, which is not this library's scale, so without the
seam a brand's `codeBlock` role would stop at the code host. The gutter widths
and the syntax palette stay the runtime's: the package has no tokens for them.

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

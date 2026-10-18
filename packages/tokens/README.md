# `@gpuixui/tokens`

The single source of truth for colour, typography, spacing, radii, density,
component dimensions, elevation, border widths, icon sizes, avatar diameters and
motion in GPUIXUI.
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
link paints, the `accent`/`selected` fills a link sits on inside a row
(plan 314) and the four soft status fills a link in a status panel sits on
(plan 346), and through the text-selection wash on all thirteen of those
surfaces (plan 528). A brand that changes `primary` should set `primaryText`
beside it.
A runnable example lives in
[`src/primary-text.example.ts`](./src/primary-text.example.ts).

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

The AAA dark set is the exception to a dark tint: its canvas is pure black, so
`shadow` is `#FFFFFF` and `highContrastDarkElevation` applies the set's own
alphas (10%, 14% and 18%), the way its scrim already veils with light. A black
tint measured **1.000:1** at every level there. `elevationLevels` is the ordered
level index and `elevationSurfaces` the six persistent page surfaces the
contrast check composites each defined level over — the canvas, a card, the
quiet panel, the `input` fill a flipped popover opens over, the `selected` fill
a context menu opens over and a floating surface; the tightest shipped pair is
**1.061:1**
(identity dark, `sm` on `background`). At high contrast a platform style
contributes a level's geometry and the base keeps the opacity its tint was
designed with.

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
`0` to remove motion. A cubic-bezier easing is four finite control points whose
x values lie inside `0…1`; the runtime drops a transition that breaks that rule,
so `themeMetricFailures` reports it.
A runnable example lives in
[`src/motion.example.ts`](./src/motion.example.ts).

## Extending a theme

`createTheme({ mode, contrast })` starts from the built-in variant: `contrast`
selects the palette (`"high"` builds on the AAA set) and defaults to
`"default"`. `extendTheme` derives from any theme, including a high-contrast
one. Neither mutates its base. Typography merges field by field, density
metrics size by size, component dimensions field by field, elevation levels
replace whole arrays, and the mode is not overridable. An explicitly `undefined`
value is treated as omitted, so a partial config spread cannot erase a token.

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
    overlay: "#000000D9",
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
miss the on-colour floor. A dark brand whose accent is darker than the base's
also deepens the modal scrim (`overlay`): the face is measured on the scrim over
every surface a window shows, and the base's 65% scrim left this brand's floating
face at 1.038:1 over its own primary action, so the example ships 85%.

A complete, executed example lives in
[`src/brand-theme.example.ts`](./src/brand-theme.example.ts) and is held to
`themeContrastFailures` by the package's tests.

A filled control reads its states from `filledControl(theme, family)` — the
resting, hover and pressed fills and the one foreground readable on all three —
rather than compositing `alpha(fill, …)`. A translucent state takes its colour
from the surface behind the control and drops the label below the on-colour
floor; the designed roles are opaque and measured. `filledControlFamilies` is
the index (`primary`, `secondary`, `destructive`, `accent`) and
`FilledControlFamily` derives from it.

An action inside a soft status panel is a family of its own: `softAction(theme)`
returns `softAction`/`softActionHover`/`softActionActive` and
`softActionForeground`. The four soft fills sit in the same luminance band as the
canvas washes, so **80 of the 288** shipped `hover`/`active`/`secondary`-on-tint
pairs measure under 1.05:1 — the worst Windows light `active` on
`destructiveSoft` at **1.0042:1** — and an Alert's dismiss control had no press
state. `softActionPairs`, `softActionStepPairs` and `softActionLabelPairs` hold
the raised family to the surface, step, secondary and body floors in every
shipped set (plan 394). A disabled filled action keeps the resting `softAction`
fill and paints `disabledForeground`: the raised fill is the action's shape, and
the canvas `disabled` fill measures **1.0066:1** on XP light's `warningSoft`.
`inactivePanelActionPairs` measures the resting label, and a `textTiers` entry
keeps it a step below `softActionForeground`; a disabled control does not step
(plan 514).

A Toast is a `popover` card, not a tinted panel: `toast/viewport.tsx` paints the
card `popover` and tones only the glyph and the 3px bar. `softAction` equals that
card in every light shipped set (**1.0000:1**), so a Toast action paints the
canvas neutral family — `filledControl(theme, "secondary")` — which the contract
measures on `popover`.

## Persisted choices

A stored preference or a URL parameter arrives as `unknown`. `isPlatformName`,
`isThemeMode`, `isThemeContrast`, `isDensityName` and `isControlSize` narrow it,
so a consumer never retypes a union; the ordered indexes — `platformNames`,
`themeModes`, `themeContrasts`, `densityNames`, `statusTones` and
`controlSizes` — are what a settings row or docs toggle iterates. A whole theme
object loaded from a file is still the application’s `Schema` boundary.

`resolveThemeChoice(choice)` resolves the whole row in one call: mode and
contrast select the variant, `recipe` or `platform` styles it, and a stored
density is applied last so it beats the platform's preset (macOS is `compact`).
A recipe wins over a stray platform key, and every unknown axis keeps a readable
default — an unknown density keeps the resolved theme's preset. A runnable
example lives in
[`src/theme-choice.example.ts`](./src/theme-choice.example.ts).

A shareable URL is the same row, and the package owns the transport.
`themeChoiceFromParams(source)` reads the five keys through the same guards — a
real `URLSearchParams` satisfies the structural `ThemeParamSource`, so no runtime
dependency is added — and an unknown value is absent. `themeChoiceParams(choice)`
writes the canonical axes: only `dark`, `high`, a non-`default` platform, a valid
recipe (which suppresses the platform it overrides) and any valid density, since
the platform supplies the density fallback. `themeChoiceKeys` is the key order
and the clear list, so a stale axis cannot survive a new choice.

```ts
import {
  resolveThemeChoice,
  themeChoiceFromParams,
  themeChoiceKeys,
  themeChoiceParams,
} from "@gpuixui/tokens";

const theme = resolveThemeChoice(
  themeChoiceFromParams(new URLSearchParams("?mode=dark&platform=win32")),
);

const next = new URLSearchParams("?platform=win32");
themeChoiceKeys.forEach((key) => next.delete(key));
themeChoiceParams({ recipe: "aero" }).forEach(([key, value]) =>
  next.set(key, value),
);
```

```ts
import { isControlSize, isDensityName, isPlatformName } from "@gpuixui/tokens";

const platform = isPlatformName(stored) ? stored : "default";
const density = isDensityName(storedDensity) ? storedDensity : "comfortable";
const size = isControlSize(storedSize) ? storedSize : "md";
```

## High contrast

Each mode has a high-contrast variant with AAA text floors (7:1) and 4.5:1
essential boundaries. It reuses the same 70 roles, so no component changes.

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

That is one of six checks, and running it alone is not the guarantee: a zero
`borderWidth.strong` (no focus ring), a `scrollbar: "rebeccapurple"` role, a CSS
family stack, a `disabledForeground` raised to body strength or a light pointer
ladder whose hover lightens passes it.
`themeFailures(theme, contrast = theme.contrast)` composes all six and tags each
entry with the `kind` that found it:

```ts
import { themeFailures } from "@gpuixui/tokens";

themeFailures(brandTheme); // [] when every colour, family, pair, tier, ladder and metric holds
```

The order is diagnostic — `color`, `typeface`, `contrast`, `hierarchy`,
`direction`, then
`metric` — and `themeChecks` is that order as a list, so a report or a settings
screen iterates the index instead of retyping the kinds. The payload is the same
`ColorFailure`, `TypefaceFailure`, `ContrastFailure`, `TextTierFailure`,
`DirectionFailure` or
`MetricFailure` the individual check returns. `themeTextTierFailures` is the
fifth check: `textTiers` is `[dimmer, brighter]` for `mutedForeground` below the
body role each surface paints — `foreground` on the canvas and the row washes,
`cardForeground` on a card, `popoverForeground` on a menu, dialog or toast and
`inputForeground` in a field — and for `disabledForeground` and `placeholder`
below `mutedForeground`; each is held one 1.05:1 step below the tier above it on
the surfaces both are documented on. `selectedForeground` is deliberately not a
body tier: it is the secondary-strength tint an inherited label keeps inside a
selected row, whose title is `foreground`. `themeDirectionFailures` is the
sixth: `stateLadders` names the four filled families, the panel action, the
generic wash and the selected step, and each step must move away from the
canvas — darker in light, lighter in dark — so a light `primaryHover` that is
lighter than its `primary` is reported even though the 1.05:1 step floor passes.
An equal pair stays the step lists' defect. A runnable example lives in
[`src/theme-check.example.ts`](./src/theme-check.example.ts).

The library holds every shipped set to that same call. `shippedThemes` is the
ordered list — identity variants, styled platform variants and recipes, at both
modes and both contrasts, each with its provenance — derived from the same
indexes the resolvers read, so a consumer's suite or gallery does not retype the
matrix:

```ts
import { shippedThemes, themeFailures } from "@gpuixui/tokens";

const failures = shippedThemes.flatMap(({ theme }) => themeFailures(theme));
failures; // []
```

`platformVariants` is the styled subset: the `default` platform is the identity,
not a fourth look. The executed example is
[`src/shipped-themes.example.ts`](./src/shipped-themes.example.ts).

Every check is also available on its own.
`themeMetricFailures(theme)` holds the numbers (§ *Checking the numbers* below),
and `themeColorFailures(theme)` holds every role to the six- or eight-digit hex
form the colour helpers parse:

```ts
import { themeColorFailures } from "@gpuixui/tokens";

themeColorFailures(brandTheme); // [] when every role is a hex colour
```

`shadow` is why the format check exists. Plan 085 applies each elevation level's
alpha to that role through `alpha()`, and an unparseable tint is returned
unchanged, so a copied theme with `shadow: "black"` paints a **fully opaque**
shadow at every level — the shipped 0.08, 0.12 and 0.16 alphas gone — while the
metric check returns `[]`. Since plan 505 the elevation check reports the tint as
`NaN` too, so the colour check is the one that names the form. `#000` and
`rgb(0 0 0)` behave the same way; `isHexColor(value)` is the predicate for a
single stored role.

The two families are also held to the form the runtime reads:
`themeTypefaceFailures(theme)` reports a name that is empty or a CSS comma
stack, because GPUix 0.10.0's `StyleDesc.fontFamily` is one string and an
unknown name falls back silently. A copied theme with
`sans: "Inter, system-ui, sans-serif"` used to pass every check and paint the
system fallback; `typefaceRoles` and `typefaceRules` are the ordered indexes,
and all 24 shipped sets pass:

```ts
import { themeTypefaceFailures } from "@gpuixui/tokens";

themeTypefaceFailures(brandTheme); // [] when both families are one name
```

`contrastRatio`, `contrastPairs`, `contrastFloors` and `compositeOver` expose
the parts. The modal scrim and the dialog on it are measured as a pair:
`overlayWashPairs` holds the painted scrim to 1.05:1 over the eighteen surfaces a
window shows, and `dialogSurfacePairs` holds the dialog's own face — `popover`
composited over the `overlay` scrim on every surface `overlaySurfaces` names, the
six layout surfaces and the twelve resting content fills — to the same floor,
because a theme whose scrim meets its own floating surface leaves a dialog with
no face (tightest shipped 1.079:1). The edge is not a fallback: a dialog's
`border` measures 1.006:1 over a scrimmed status chip, under the divider floor,
so the face is the carrier and macOS dark's scrim is 82%. The shadow cannot take
that role in the default dark sets: on the identity dark scrim the `lg` tint
paints 1.035:1 and pure black reaches only 1.042:1. The selection wash is measured as
it paints on every surface a glyph is selected on: the neutral surfaces with
`foreground`, `popover` and `input` with their own text roles, and `selected`
with `selectedForeground` at the secondary floor. Secondary text is measured through the same wash on all
nine surfaces (`mutedForeground`), because a row description, a card caption or
a timestamp is selected with the body copy: seven shipped sets were under
4.5:1 there — identity light 4.06:1 and identity dark 3.49:1 on a pressed row —
until plan 087 moved their secondary grey. Status labels are measured through
the same wash on the same nine surfaces (`selectionStatusPairs`), because
`xText` is the role for a status label in a selectable row: XP light
`successText` measured 3.671:1 on `active` until plan 366 moved the six light
status roles one half-step, and the AAA tightest is 7.370:1 (identity light high
`warningText` on `active`). `selectionWashPairs` also holds the
wash itself to 1.05:1 against each surface — including the `disabled` fill an
unavailable label keeps, because plan 510 measures that label through the same
wash — so a highlight cannot be made invisible to satisfy a text floor. A card's
own `cardForeground` is measured beside the default `foreground`, because both
Windows recipes ship the two apart
(plan 363), and a selected row's title (`foreground`) is measured beside its
inherited `selectedForeground`, because the title is the brighter of the two
roles (plan 506). A menu row's `popoverForeground` is measured on the three
washes it highlights with and the selected row's inherited `selectedForeground`
on all four fills it keeps (plan 525). High-contrast dark shipped at 6.48:1 on `hover`
and 5.49:1 on `active`, Linux dark at 6.92:1 and Windows dark at 6.84:1 on
`active`, until plan 081 darkened the three wash bases. An Alert or Badge
is measured the same way: the tone's `xSoftForeground` is held to the body floor
through the wash and the wash itself to 1.05:1 on the four soft fills. The audit
found identity light `successSoftForeground` at 5.83:1 through the wash and
Windows dark's wash over `destructiveSoft` at 1.005:1 — an invisible highlight —
so the four light soft foregrounds moved one family step darker, the dark ones
one step lighter with a 20% identity wash, Windows dark's wash moved to 40%, and
Linux dark's soft destructive fill moved to `#3A0B0D` (plan 091); plan 506 later
lowered the identity wash to 14% and the Windows one to 33% so a selected row's
title keeps 7:1 through it, and darkened Linux dark's selected fill one step. The panel's
description and caption are measured through the same wash — `foreground` at the
body floor and `mutedForeground` at the secondary floor on each soft fill,
because an Alert's body and caption are selected with it (plan 362); a
brand-toned link is measured through it too, on the nine surfaces and the four
soft fills (plan 528). The focus ring is
checked on the canvas, card, popover, the `muted` panel and the `accent` wash,
the `hover`, `active` and `selected` washes, the four soft status fills —
because an Alert's action button is focused while it sits on its own tint — and
the `track` groove a focused slider's thumb is centred on (`ringTrackPairs`), so
a ring that vanishes on a selected row or a value indicator is caught; every
shipped variant already clears those floors, so the pairs are a guarantee rather
than a fix (plans 093 and 516). An invalid control recolours the ring
with `destructive`, and the runtime can draw only one, so the error ring is the
focus indicator: the same surfaces are measured for it too (`invalidRingPairs`,
plan 340). The modal scrim is measured the same way:
`overlay` composited over the eighteen surfaces a dialog covers — the four base
surfaces, the `input` fill a form paints, the persistent `selected` fill a
table or list keeps, the four resting filled actions, the three solid status
chips a Badge paints, the raised action a status panel carries and the four soft
status panels a window shows — and held to 1.05:1, which caught the AAA dark theme's
black veil painting **1.000:1** on its pure black canvas and turned it into a
light one (plan 099) and a macOS light scrim equal to its own `selected` fill
painting **1.000:1** on a selected row (plan 359). Plan 375 extends the same
check to the page's filled actions and status panels: a scrim equal to
`primary` or `infoSoft` used to leave the control or Alert undimmed while the
checker returned `[]`, and plan 508 closes it for a solid status chip a Badge
keeps on screen; the tightest pair is **1.060:1** (AAA dark on `info`), so no
colour moves. The transient pointer washes stay out:
reaching the dialog takes the pointer off the row. A solid role painted as a mark — a
progress segment, slider fill, thumb ring, rating star or timeline dot — is held
to 3:1 (4.5:1 at AAA) by `markPairs`, not to the 1.05:1 an interactive fill's
wash needs (plan 332). The groove those value indicators sit in is `track`, a
role of its own: identity dark's `muted` is its `popover` and every platform
dark style's `muted` is its card and popover, all at 1.000:1, so an
indeterminate progress bar drawn with the surface role painted nothing.
`trackSurfacePairs` holds it to 1.05:1 on the four base surfaces, the persistent
`accent`/`selected` fills, the `hover`/`active` washes a row or a slider paints
under the pointer and the four soft status fills a status panel provides, and
`trackMarkPairs` holds the four progress fills to the mark floor on it (plans
347 and 503). An indeterminate rail that vanishes under the pointer or inside an
Alert is the same defect one surface over. Default body text
is checked on the canvas, card, the `muted` panel, `popover`, the
`hover`/`active`/`accent`/`selected` washes and the four soft status fills an
Alert's description paints, so an avatar's initials on
the quiet panel, a date picker's month header on its floating surface, a selected
row's title and an Alert's body are held to the body floor. Typed text (`inputForeground`) is
checked on the `input` fill, on the four `Surface` tones a transparent field
can sit on — `background`, `card`, `popover` and `muted` — and on the four row
washes a field inside a row paints, so a search box or
inline edit cannot lose its text whichever panel it sits on (plans 319 and 527). The
placeholder (`placeholder`) is checked on the same nine surfaces, because a
search box in a
sidebar or a dialog is not tied to one fill and an in-place edit sits in the row
it replaces; identity dark measured 4.03:1 on
the quiet panel and the floating surface until plan 317 moved it one step, then
**3.132:1** on the `selected` fill until plan 527 moved it again, and every one
of the twelve default sets missed the row-wash floor (4.651:1 at the tightest
after the move, Linux dark on `active`). A menu
row's `popoverForeground` on
`hover`/`active`, a selected `Select` option's on `selected` (plan 314), and a
selected row's inherited `selectedForeground` on the `accent` wash a selectable
row hovers and on the `hover`/`active` pointer washes are checked
too (plan 316), and a field's `border` edge is checked on its own `input` fill
(plan 312).
Secondary text is
checked on the `input` fill a field paints for its own chrome — a time picker's
separator and clear control — and on `hover`, `active`, `accent` and `selected`
too, so a row description stays readable while the row moves — macOS dark
shipped at 4.41:1 and 3.55:1 until plan 079 — and on the four soft status fills
a status panel's caption sits on, tightest at 6.61:1 (Aero light, plan 346). Status text is checked on the same four washes and on the
`muted` quiet panel a sidebar paints (plan 314), so a status dot in a list,
table, menu row or settings sidebar is readable on the fill it sits on: every light set
had a warning label under 4.5:1 on the pressed wash (macOS 4.22:1, Linux 4.24:1,
Windows 4.36:1) and high-contrast light was 5.83:1 on `active` and 6.70:1 on
`accent`/`selected` until plan 083 moved the two warning steps. The functional
control boundary is checked on the `muted` panel, the same four washes and the
four soft status fills, so a checkbox or field inside a row, or an action inside
a tone-tinted Alert, keeps its `borderStrong` edge: the identity light
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
them one ramp step — and the pulse's dim frame, the role composited at
`skeletonPulseOpacity` (0.6) on the same eight surfaces (`skeletonPulsePairs`),
because half of every cycle is a fade an opaque pair cannot see; identity dark
measured **1.008:1** on `selected` until plan 393 moved its skeleton a half-step
to `#434C5A` (1.074:1 at the dim frame) — and the decorative `border` at 1.05:1
(3:1 at high
contrast) on the plain surfaces, on the `secondary`, `secondaryHover`,
`secondaryActive`, `hover`, `active`, `accent`, `accentHover` and
`accentActive` fills a bordered control paints, on the `selected` fill an
outline action sits on in a selected row and on the four soft status fills a
status panel divides, so a tone-tinted Alert or Badge, a loading placeholder,
every divider and every outlined control's edge stay perceivable. The inherited dark
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
return. The solid status fill is a fill too: `statusFillPairs` holds
`info`/`success`/`warning`/`destructive` to the same 1.05:1 floor on those eight
surfaces (the four `destructive` base surfaces are already the action fill's
pairs), so an edited theme cannot make a solid chip vanish into its panel. A
status dot or label stays `xText`: the light `warning` fill is 1.78:1 on the
canvas, under the 3:1 a mark needs.
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
accents one step deeper. Each filled family also walks `x` → `xHover` →
`xActive`, and a step that is not perceivable is not a state: `stateStepPairs`
holds every `xHover` to 1.05:1 from its `x` and every `xActive` from its
`xHover`, under the `step` class, at both contrast levels. The generic washes are
one ladder too: `washStepPairs` holds `active` to 1.05:1 from `hover`, so a ghost
or outline control whose press equals its hover is reported. A selectable row
adds one step: it paints `accent` under the pointer and `selected` once chosen,
so `selectionStepPairs` holds `selected` to 1.05:1 from `accent`; the two roles
were the same fill in the identity and macOS light, and the selected value moved
one designed step in eight shipped sets (plan 381).
A field's pointer edges are both measured on its own `input` fill:
`borderStrong` under the pointer and `ring` while pressed
(`fieldPressedEdgePairs`). The focus shadow still sits on the surface behind the
control; the two uses of the ring role are separate pairs.
The inactive state is measured too, and its floor is a design floor rather than a
WCAG one: `inactivePairs` holds `disabledForeground` to 3:1 (4.5:1 at AAA) on the
`disabled` fill, the four plain surfaces, the four row washes and the four soft
status fills a tone-tinted Alert's action sits on (`inactiveSoftPairs`), because a
disabled `Select` item paints the label straight onto the menu's `popover` and
measured 1.99:1 on Linux dark until plan 306. The `disabled` fill is allowed to
sit near the panel — no neutral clears both a white card and the quiet panel — so
a disabled control paints its `border` edge, measured on `disabled` and on the
`muted` panel a settings sidebar divides. A disabled control is not an
`opacity: 0.5` composite; it paints the designed pair and the edge.
`selectionInactivePairs` holds that label through the text-selection wash on the
same thirteen surfaces, because `selectionColor` inherits into it: the previous
light `#6E7787` measured **2.586:1** on Windows light's `selected` fill and the
AAA sets 3.43:1 / 4.36:1 while every check returned `[]`, so `#545D6C`,
`#444444` and `#D0D0D0` ship and the tightest washed pair is **3.177:1** (Aero
light `destructiveSoft`; 4.722:1 at AAA) (plan 510). A disabled raised action
inside a tone-tinted panel keeps its `softAction` fill, so its label is held
through the inverse `selectionOnFill` veil too (`selectionFillInactivePairs`):
identity dark measured **2.799:1** and AAA dark **3.304:1** there, so
`disabledForeground` moves to `#B0B8C6` and `#D0D0D0` respectively (3.317:1 and
4.645:1) (plan 520).
A runnable example
lives in [`src/contrast.example.ts`](./src/contrast.example.ts).

### Checking the numbers

The colour check is half the contract. `themeMetricFailures(theme)` holds the
numbers a theme paints with — typography, spacing, radius, density, component
dimensions, elevation, motion, border widths, icon sizes and avatar sizes — to
the invariants the components rely on, and returns a `MetricFailure` per missed
rule: the `MetricGroup`, the dotted member, the `MetricRule` and both numbers.

```ts
import { extendTheme, getTheme, themeMetricFailures } from "@gpuixui/tokens";

const ringless = extendTheme(getTheme("dark"), {
  borderWidth: { strong: 0 },
});
themeMetricFailures(ringless); // one borderWidth/strong failure
```

That case is why the check exists: `focusRing` spreads by `borderWidth.strong`,
and that shadow is the only focus indicator GPUix 0.10.0 can draw, so a zero
ring removed focus while `themeContrastFailures` still returned `[]`. The same
edit path can clip a type role by shortening its leading, invert one of the two
type ladders (`proseLadder` / `codeLadder`), flatten `bodyStrong` onto `body`'s
weight, name a font weight outside the `1…1000` range the text system can
select or a non-finite one, shrink the smallest control below one label line or
one body line,
fit an icon, a field adornment or a chip into a content box shorter or narrower
than they are, raise an inline icon above the caption or label line it sits in,
raise an inline avatar above the dense row it leads,
flush a control's horizontal padding to zero or tighter than the theme's own
hairline (`spacing["2xs"]`), invert a size ladder, name an icon or avatar size of zero, scroll
an overlay in less than one row, ship a non-finite
spacing step, radius, type size or dimension the renderer casts to a 32-bit
float, ship a non-finite motion timing or a cubic-bezier easing the runtime
cannot interpolate, leave the largest avatar a rounded square, shrink a higher
elevation level's feather below the level under it, or hand
`elevationShadow` an alpha the colour helper cannot parse. The ladders are non-decreasing rather than
strict because Linux and Windows ship `radius.lg === radius.xl` and Windows ships
`motion.fast === motion.step`; an empty elevation level is exempt (the shipped
`elevation.overlay`), while a level a consumer defines is held to the same rules
because `elevationShadow` paints its first entry. Every shipped theme, platform
variant and recipe passes.
`metricGroups` is the ordered index a settings row iterates. `metricRules` is
the ordered index of the nine rules a failure can carry, so a diagnostics view
does not retype the union. A runnable example
lives in [`src/metrics.example.ts`](./src/metrics.example.ts).

## Status tones

The four status families — `info`, `success`, `warning` and `destructive` — each
have a solid role with a readable foreground, a soft pair with a designed edge
for a tone-tinted Alert or Badge, and an `xText` role for labels, icons and
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
be selectable sets `userSelect: "none"`. A native `<input>`/`<textarea>` is a
custom element that paints its own fixed wash (`#7C86FF59`) and placeholder
(`#8F8F8F`) in GPUix 0.10.0 and reads only `theme.caret`, so the theme's wash
does not reach a native field. The caret is themeable:
`nativeFieldTheme(theme)` returns that `theme` prop from the accent, and the
built-in dark caret it replaces measures **3.129:1** on the AAA light `input`
and **2.795:1** on its quiet panel, under the 4.5:1 mark floor. A runnable
example lives in
[`src/native-field.example.ts`](./src/native-field.example.ts). Content painted
on an opaque filled surface — a filled action such as `softAction`, or a solid
status chip — uses `selectionStyle(theme, "fill")`: the accent-tinted wash
composites to 1.000:1 on `primary` in six shipped palettes, so `selectionOnFill`
is a neutral 15% veil.
`selectionFillPairs` and `selectionFillWashPairs` hold every opaque fill's
(`primary`, `secondary`, `destructive`, `accent`, `info`, `success`, `warning`,
`softAction`, indexed by `selectionFillRoles`) foreground and the veil itself to
their floors; `selectionFillInactivePairs` holds the disabled panel action's
`disabledForeground` through the same veil on its resting `softAction` fill. The veil is measured on each fill's resting value: a filled
control steps to `xHover`/`xActive` under the pointer, where the 15% veil leaves
**60 of 360** filled-family label pairs under the on-colour floor (worst
**3.353:1**, macOS dark `accentActive`) and no neutral alpha clears both floors
at AAA light, so a control's chrome sets `userSelect: "none"` and the resting
pairs cover content that keeps its fill. A runnable example lives in
[`src/selection.example.ts`](./src/selection.example.ts); the solid chip's
copyable style in [`src/status-tone.example.ts`](./src/status-tone.example.ts)
applies the same veil.

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
applies the families and shape — radii, density, motion, type roles, spacing,
borders, icon/avatar sizes, component dimensions and the platform's elevation
geometry — while the AAA colour set, and the opacity its `shadow` tint was
designed with, stays, because a platform accent must not drop those floors.
Elevation carries no colour of its own: a level is geometry plus an alpha over
the theme's `shadow` tint, so the AAA tint stays while the platform's depth
applies (plans 345 and 505). To ship your own look, copy a style file and apply
it, or extend the resolved theme:

```ts
import {
  applyPlatformStyle,
  extendTheme,
  getPlatformTheme,
  getTheme,
} from "@gpuixui/tokens";

// A copied `PlatformStyle` with edited values. Its `structure` owns the
// numeric scales — type roles, spacing, borders, icon/avatar sizes and
// component dimensions — beside radii, density and motion.
const contoso = applyPlatformStyle(getTheme("dark"), contosoStyle);
const tweaked = extendTheme(getPlatformTheme("win32", "dark"), {
  colors: { primary: "#005A9E" },
  radius: { md: 3 },
});
```

A style's `structure` group names type roles but never families: `types` owns
`sans` and `mono`, so a copied file cannot name two UI faces. The
`platform-extension.example.ts` example names every numeric group and is applied
in both modes, so the shape is compiled and held to `themeFailures`, not sketched.

Runnable examples live in
[`src/platforms.example.ts`](./src/platforms.example.ts) and
[`src/platform-styles.example.ts`](./src/platform-styles.example.ts).

The applied theme declares the level of the palette it carries (plan 301):
`applyPlatformStyle(highBase, style)` keeps the AAA palette and the `high` claim,
while naming `"default"` applies the platform colours and returns a `default`
theme, and a style with no colour overrides keeps the base's level. A colour key
set to `undefined` is not an override: the role inherits and the level stays with
the base (plan 323). Naming `"default"` on a base at another level replaces the
palette as a set: the roles the style does not name come from the default-level
identity of the same mode, so the applied theme is held to the floors it declares
and `themeContrastFailures` returns `[]` for every shipped style. A base that
already declares the level keeps its own colours, so this is not a rewrite of a
consumer's edits (plan 373).

A style is an override set over the base it is applied to, so it names the
canvas-tuned roles it owns: the dark styles name `destructiveSoft` beside their
dark `skeleton`, because Linux owns a darker tint (plan 091) and a style applied
over another platform's theme must not keep that platform's tint.
`platform-composition.test.ts` applies every shipped base and style pair in both
modes, both contrasts and both requested levels and holds each result to
`themeContrastFailures`, `themeMetricFailures` and `themeColorFailures`
(plan 374).

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

`fontWeights` is the ascending weight set those roles use — `400`, `500` and
`600` today — derived from the scale rather than a second list, so a font
bundle loads exactly the weights the shipped roles select.

`statusTones` and `platformNames` do the same for the four status families and
the four platform variants, in documentation and toggle order. `motionLevels`
and `motionPhases` index the six timings and four easing phases, so a motion
table iterates the scale instead of `Object.keys(motion)`.

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
  ship a vendor's design system. At high contrast the families and shape, the
  elevation geometry included, apply while the AAA colour set and its opacity
  stay, because accessibility outranks resemblance.
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
- No themeable native field hint or selection: GPUix 0.10.0's
  `<input>`/`<textarea>` paints both itself (`#8F8F8F` and `#7C86FF59`). The
  caret is themeable: `nativeFieldTheme(theme)` supplies it from the accent
  through the `theme` prop. The `placeholder` role covers a hint the consumer
  renders; `selectionColor` covers app text. The fixed grey measures 3.23:1 on
  the identity light `input`, under the 4.5:1 secondary floor.
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

The suite also holds the copyable documentation: every `src/*.example.ts` runs
(plan 350), and every fenced block in `docs/tokens.md`, this README and the
`@example` comments in the package's modules names only shipped exports, roles
and scale members (plans 355 and 356).

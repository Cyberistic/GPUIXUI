# Token catalogue

Every public token in `@gpuixui/tokens`, both themes, and the extension API.
For the reasoning behind the system, read
[`design-system.md`](./design-system.md). This page is the reference: if a token
is not here, it is not public.

The package is inert data and total functions. It has no runtime dependencies,
no CSS variables and no OS appearance detection. Theme switching is a re-render
with a different `Theme` object.

## Import

```ts
import {
  alpha,
  applyPlatformStyle,
  colorRoles,
  createTheme,
  currentPlatform,
  darkTheme,
  densityNames,
  elevationShadow,
  extendTheme,
  focusRing,
  getPlatformTheme,
  getTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  highContrastThemes,
  isDensityName,
  isHexColor,
  isStatusTone,
  lightTheme,
  metricRules,
  motionTransition,
  platformNames,
  platformStyles,
  platformTypes,
  selectionPairs,
  selectionSurfaces,
  selectionStyle,
  selectionWashPairs,
  statusTone,
  statusTones,
  systemUiFont,
  textRoles,
  textStyle,
  themeColorFailures,
  type ColorFailure,
  type FocusRing,
  type PlatformName,
  type StatusTone,
  type Theme,
  type ThemeContrast,
  type ThemeMode,
} from "@gpuixui/tokens";
```

```tsx
import { ThemeProvider, useTheme } from "@gpuixui/tokens/react";
```

The core entry has no React dependency. `react` is an optional peer of the
`./react` entry only.

## Types

Every public type export, in alphabetical order. The section that owns a value
also owns its shape; this index exists so a consumer typing a config, a platform
style or a contract check can find the name without reading the source. A type
missing here is not public.

| Type | Purpose |
| ---- | ------- |
| `AvatarSize` | Avatar diameters for `xs` to `lg`. |
| `BorderWidth` | Divider and focus-ring thickness. |
| `BoxShadow` | The runtime's five-field shadow; `elevationShadow` returns one. |
| `ColorFailure` | A colour role whose value is not a hex colour the token helpers parse. |
| `ContrastFailure` | One documented pair a theme misses, with its floor and ratio. |
| `ContrastPair` | A `[foreground, background, pairClass]` contract row. |
| `ContrastPairClass` | The floor class a pair is held to. |
| `ControlSize` | `"sm"`, `"md"` or `"lg"`, derived from `controlSizes`. |
| `Density` | Resolved control heights, padding and row height for a preset. |
| `DensityName` | A preset name from `densityNames`. |
| `DensityOverrides` | Partial density metrics; they merge size by size. |
| `Dimensions` | Fixed surface metrics: overlay, field, toast and preview-card sizes. |
| `Elevation` | Elevation levels keyed by `ElevationLevel`. |
| `ElevationLevel` | `"sm"`, `"md"`, `"lg"` or the reserved, empty `"overlay"`. |
| `ElevationShape` | A level's geometry plus the alpha applied to `shadow`. |
| `FilledControlFamily` | A filled control family from `filledControlFamilies`. |
| `FilledControlStyle` | The resting, hover and pressed fills and the one foreground. |
| `FocusRing` | `{ boxShadow }` for the focus ring. |
| `FontWeight` | A numeric CSS weight, `1…1000`; the shipped scale uses `400`, `500`, `600` and `700`. |
| `IconSize` | Icon sizes for `xs` to `xl`. |
| `MetricFailure` | One metric a theme misses, with its group, rule and values. |
| `MetricGroup` | A group of theme metrics from `metricGroups`. |
| `MetricRule` | One of `metricRules`: `positive`, `non-negative`, `zero`, `finite`, `increasing`, `non-decreasing`, `at-least`, `at-most` or `within`. |
| `Motion` | Six timing levels and four easing phases. |
| `MotionEasing` | A cubic-bezier control-point tuple. |
| `MotionEasings` | The `standard`, `enter`, `exit` and `linear` curves. |
| `MotionLevel` | A timing level name, `none` to `pulse`. |
| `MotionPhase` | `"standard"`, `"enter"`, `"exit"` or `"linear"`. |
| `MotionTransition` | Transition properties in the runtime's seconds. |
| `PlatformName` | `"darwin"`, `"linux"`, `"win32"` or `"default"`. |
| `PlatformRecipeName` | `"xp"` or `"aero"`, a recipe beside the platform axis. |
| `PlatformStyle` | Editable platform data: types, structure, colours and elevation. |
| `PlatformStyleStructure` | Radii, density and motion shared by both modes. |
| `PlatformType` | The label and sans/mono families of one platform. |
| `Radius` | The corner-radius scale. |
| `SelectionStyle` | `{ selectionColor }` for inherited text selection. |
| `Spacing` | The spacing scale shared by padding, margin and gap. |
| `StatusTone` | `"info"`, `"success"`, `"warning"` or `"destructive"`. |
| `StatusToneStyle` | The four roles a soft status surface needs. |
| `TextRole` | A key of `textRoles`, excluding the family fields. |
| `TextStyle` | Font size, line height and weight for one role. |
| `TextStyleProperties` | A resolved role for `StyleDesc`, family included. |
| `Theme` | A complete resolved theme. |
| `ThemeChoice` | A persisted theme choice: five unknown axes for `resolveThemeChoice`. |
| `ThemeColors` | The 66 semantic colour roles. |
| `ThemeConfig` | Input to `createTheme`: a mode, a palette selector and overrides. |
| `ThemeContrast` | `"default"` or `"high"`. |
| `ThemeFailure` | One defect from `themeFailures`, tagged `color`, `typeface`, `contrast` or `metric`. |
| `ThemeMode` | `"light"` or `"dark"`. |
| `ThemeOverrides` | A partial theme for `extendTheme`. |
| `ThemeProviderProps` | Props for `ThemeProvider`. |
| `TypefaceFailure` | A family name that is not one non-empty family. |
| `TypefaceRole` | `sans` or `mono`, a key of `typefaceRoles`. |
| `TypefaceRule` | `non-empty` or `single-family`, a key of `typefaceRules`. |
| `Typography` | The sans/mono families and ten type roles. |
| `TypographyOverrides` | Partial families and roles; roles merge field by field. |

## Colour roles

Components use semantic roles, never ramp shades. The role names describe
intent, so a brand theme changes values without touching component source.
`border` is decorative; `borderStrong` is the essential control boundary held
to 3:1 (4.5:1 at high contrast) on the plain surfaces, the `muted` panel, the
`hover`/`active`/`accent`/`selected` washes a bounded control sits on, and the
four soft status fills an Alert, Badge or Toast paints. A bordered
control paints `border` on the fill behind it —
`secondary` at rest, `secondaryHover`/`secondaryActive` while a filled neutral
control is hovered or pressed, the generic `hover`/`active` washes on a ghost or
outline control, and `accent` for an outline toggle that is on — so the divider
is held to its floor on those fills too, not only on the plain surfaces.

There are 66 roles. The four status families — `info`, `success`, `warning` and
`destructive` — each have three tonalities and a designed edge: a solid fill with
a readable foreground on it, a soft pair (`xSoft` / `xSoftForeground`) with an
edge (`xSoftBorder`) for alerts, badges and toasts, and a text role (`xText`) for
status labels, icons and indicator dots drawn on `background`, `card` or
`popover`. Every filled action has designed hover and pressed steps —
`primaryHover`/`primaryActive`, `secondaryHover`/`secondaryActive`,
`destructiveHover`/`destructiveActive` and `accentHover`/`accentActive` — so a
component never composites an alpha fill over whatever surface sits behind it.
The generic `hover` and `active` roles are different: they are the washes a ghost
or outline control paints, not the fill of a filled control. `info` is blue, not
iris, so it can never be confused with `primary`. The unfilled groove of a value
indicator — a progress bar, meter or slider rail — is `track`, a role of its
own: a surface role cannot carry it, because the quiet panel equals the card in
every platform dark style.

The same fill-versus-text split applies to the brand action. `primary` is a
surface: it carries `primaryForeground`, and it is measured only as a fill.
Brand-toned text — a link, a label, an icon — reads `primaryText`, held to
4.5:1 on `background`, `card`, `popover` and `muted`, on the `hover` and
`active` washes the Link variant paints behind its own label, on the
`accent`/`selected` fills a selectable row paints under it, and on the four soft
status fills a link in a status panel sits on. The split is not
cosmetic: the macOS accent `#0071E3` measures 4.21:1 on that canvas and 3.44:1
on the pressed wash, while its text step `#0055B3` clears both.

A runnable example lives in
[`src/primary-text.example.ts`](../packages/tokens/src/primary-text.example.ts).

| Role | Light | Dark | Use |
| ---- | ----- | ---- | --- |
| `background` | `#F6F8FA` | `#11141A` | window and application canvas |
| `foreground` | `#191D25` | `#EEF1F5` | default text |
| `card` | `#FFFFFF` | `#191D25` | raised content surface |
| `cardForeground` | `#191D25` | `#EEF1F5` | text on `card` |
| `popover` | `#FFFFFF` | `#222730` | menus, popovers and dialogs |
| `popoverForeground` | `#191D25` | `#F6F8FA` | text on `popover` |
| `primary` | `#5F4BDB` | `#A7A9FF` | primary action |
| `primaryForeground` | `#FFFFFF` | `#11141A` | text and icons on `primary` |
| `primaryHover` | `#4C39B5` | `#C7CBFF` | primary action while hovered |
| `primaryActive` | `#3B2C8F` | `#E0E3FF` | primary action while pressed |
| `primaryText` | `#4C39B5` | `#C7CBFF` | brand-toned text, links and icons on plain surfaces and the `accent`/`selected` row fills |
| `secondary` | `#EEF1F5` | `#2A303B` | secondary action |
| `secondaryForeground` | `#2A303B` | `#E1E5EC` | text on `secondary` |
| `secondaryHover` | `#E1E5EC` | `#3D4552` | secondary action while hovered |
| `secondaryActive` | `#CBD1DB` | `#545D6C` | secondary action while pressed |
| `muted` | `#FBFCFD` | `#222730` | quiet surface |
| `mutedForeground` | `#3D4552` | `#CBD1DB` | secondary text |
| `accent` | `#EEF0FF` | `#2E2370` | highlight wash for a menu row, a hovered selectable row and a toggle that is on |
| `accentForeground` | `#3B2C8F` | `#C7CBFF` | text on `accent` |
| `accentHover` | `#E0E3FF` | `#42319F` | toggle-on surface while hovered |
| `accentActive` | `#C7CBFF` | `#4C39B5` | toggle-on surface while pressed |
| `destructive` | `#CC3439` | `#FF6B6B` | destructive action, and the invalid field edge |
| `destructiveForeground` | `#FFFFFF` | `#3A0B0D` | text on `destructive` |
| `destructiveHover` | `#A5262B` | `#FF9E9E` | destructive action while hovered |
| `destructiveActive` | `#7E1D21` | `#FFC6C6` | destructive action while pressed |
| `success` | `#158754` | `#3BC97F` | success |
| `successForeground` | `#FFFFFF` | `#042015` | text on `success` |
| `warning` | `#F5B01F` | `#FFC94D` | warning |
| `warningForeground` | `#2A1B00` | `#2A1B00` | text on `warning` |
| `info` | `#2559D6` | `#9FBEFF` | informational status, distinct from `primary` |
| `infoForeground` | `#FFFFFF` | `#11141A` | text and icons on `info` |
| `infoSoft` | `#D6E3FF` | `#16356F` | soft informational surface |
| `infoSoftForeground` | `#152F6B` | `#EFF4FF` | text and icons on `infoSoft` |
| `infoSoftBorder` | `#A6BEF3` | `#3F5E9A` | edge around `infoSoft` |
| `successSoft` | `#B8EDCE` | `#0A3E28` | soft success surface |
| `successSoftForeground` | `#0A3A26` | `#ECFDF3` | text and icons on `successSoft` |
| `successSoftBorder` | `#8ED3AF` | `#1A6D46` | edge around `successSoft` |
| `warningSoft` | `#FFDF9A` | `#4B3100` | soft warning surface |
| `warningSoftForeground` | `#2A1B00` | `#FFF8E8` | text and icons on `warningSoft` |
| `warningSoftBorder` | `#EFC055` | `#815F17` | edge around `warningSoft` |
| `destructiveSoft` | `#FFD6D6` | `#66191B` | soft destructive surface |
| `destructiveSoftForeground` | `#5C1619` | `#FFF1F1` | text and icons on `destructiveSoft` |
| `destructiveSoftBorder` | `#F0ACAE` | `#983235` | edge around `destructiveSoft` |
| `infoText` | `#1B45AC` | `#C5D8FF` | info text and indicators on `background`/`card`/`popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes |
| `successText` | `#0E5739` | `#A8F0C6` | success text and indicators on `background`/`card`/`popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes |
| `warningText` | `#6B4500` | `#FFDE8A` | warning text and indicators on `background`/`card`/`popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes |
| `destructiveText` | `#8F2126` | `#FFC6C6` | destructive text and indicators on `background`/`card`/`popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes |
| `border` | `#D6DAE1` | `#343B47` | dividers and decorative borders |
| `borderStrong` | `#737C8C` | `#868FA0` | essential control boundaries, including on row washes and soft status fills |
| `input` | `#FFFFFF` | `#191D25` | input field background |
| `inputForeground` | `#191D25` | `#EEF1F5` | text typed into an input, on the `input` fill or the `background`/`card`/`popover`/`muted` surfaces a transparent field paints |
| `placeholder` | `#66707F` | `#858F9F` | a hint the consumer renders on the `input` fill and the `background`/`card`/`popover`/`muted` surfaces a transparent field paints (a native field paints its own grey; see [Native text fields](#native-text-fields)) |
| `ring` | `#7567F2` | `#A7A9FF` | focus ring |
| `selection` | `#7567F23D` | `#A7A9FF33` | text selection wash (24% light, 20% dark; `selectionColor`) |
| `selectionOnFill` | `#00000026` | `#FFFFFF26` | text selection veil for content painted on a filled action (15% in both modes; `selectionColor`) |
| `overlay` | `#00000073` | `#000000A6` | modal scrim |
| `hover` | `#EEF1F5` | `#262C36` | hover wash for ghost surfaces |
| `active` | `#E1E5EC` | `#2A303B` | pressed wash |
| `selected` | `#E0E3FF` | `#402F94` | selected row or item, one step past the `accent` hover wash |
| `selectedForeground` | `#3B2C8F` | `#C7CBFF` | text on `selected` |
| `disabled` | `#EEF1F5` | `#222730` | disabled surface (kept near the panel; the control's `border` edge carries its shape) |
| `disabledForeground` | `#6E7787` | `#A1A9B7` | disabled text, held to the `inactive` floor |
| `skeleton` | `#CBD1DB` | `#3D4552` | loading placeholder |
| `track` | `#DBDFE5` | `#323945` | the unfilled groove of a progress bar, meter or slider rail |
| `scrollbar` | `#CBD1DB` | `#3D4552` | scrollbar thumb (reserved: no tint in 0.10.0) |
| `shadow` | `#191D25` | `#000000` | elevation tint (opaque; each level applies its own alpha) |

### Palette ramps

`palette` is exported for documentation and for the rare case with no semantic
role. **Components must use roles.** A ramp value in component source is a bug.

```ts
import { palette } from "@gpuixui/tokens";
```

| Ramp | Steps |
| ---- | ----- |
| `neutral` | 0 `#FFFFFF` · 25 `#FBFCFD` · 50 `#F6F8FA` · 100 `#EEF1F5` · 200 `#E1E5EC` · 300 `#CBD1DB` · 400 `#A1A9B7` · 500 `#737C8C` · 600 `#545D6C` · 700 `#3D4552` · 800 `#2A303B` · 850 `#222730` · 900 `#191D25` · 950 `#11141A` · 1000 `#0B0D11` |
| `blue` | 50 `#EFF4FF` · 100 `#DEE9FF` · 200 `#C5D8FF` · 300 `#9FBEFF` · 400 `#6E9CFF` · 500 `#3B76F6` · 600 `#2559D6` · 700 `#1B45AC` · 800 `#173A88` · 900 `#152F6B` · 950 `#0C1D42` |
| `iris` | 50 `#EEF0FF` · 100 `#E0E3FF` · 200 `#C7CBFF` · 300 `#A7A9FF` · 400 `#8B85FB` · 500 `#7567F2` · 600 `#5F4BDB` · 700 `#4C39B5` · 800 `#3B2C8F` · 900 `#2E2370` · 950 `#1C1547` |
| `red` | 50 `#FFF1F1` · 100 `#FFE0E0` · 200 `#FFC6C6` · 300 `#FF9E9E` · 400 `#FF6B6B` · 500 `#E5484D` · 600 `#CC3439` · 700 `#A5262B` · 800 `#7E1D21` · 900 `#5C1619` · 950 `#3A0B0D` |
| `green` | 50 `#ECFDF3` · 100 `#D3F9E2` · 200 `#A8F0C6` · 300 `#6FE0A3` · 400 `#3BC97F` · 500 `#1FA968` · 600 `#158754` · 700 `#116A43` · 800 `#0E5135` · 900 `#0A3A26` · 950 `#042015` |
| `amber` | 50 `#FFF8E8` · 100 `#FFEFC6` · 200 `#FFDE8A` · 300 `#FFC94D` · 400 `#F5B01F` · 500 `#D99400` · 600 `#B57600` · 700 `#8E5B00` · 800 `#6B4500` · 900 `#4B3100` · 950 `#2A1B00` |

### `alpha`

`alpha(color, amount)` returns an 8-digit hex colour. A 6-digit `#RRGGBB` gains
an alpha byte; an 8-digit `#RRGGBBAA` has its alpha replaced. `amount` is clamped
to `0…1` and rounded to the nearest byte. A colour the parser does not recognise
is returned unchanged, so a non-hex value stays solid rather than becoming
transparent. A `NaN` amount returns the colour unchanged for the same reason: a
computed fraction with no value must not erase a role.

```ts
import { alpha } from "@gpuixui/tokens";

alpha("#2559D6", 0.3); // "#2559D64D"
alpha("transparent", 0.3); // "transparent"
```

## Status tones

Alert, Badge and Toast share four status families. Each has a solid role, a
readable foreground and a designed soft pair, so a component never mixes a
readable text colour from the solid colour at runtime. Each also has a text
role for the case the other two cannot serve: a status label, icon or indicator
dot drawn directly on a surface — `background`, `card`, `popover`, the `muted`
quiet panel a sidebar paints, or one of the state washes a row paints (`hover`,
`active`, `accent`, `selected`).

| Tone | Solid fill | Soft surface | Text on the soft surface | Edge on the soft surface | Text on a plain surface |
| ---- | ---------- | ------------ | ----------------------- | ------------------------ | ----------------------- |
| `info` | `info` / `infoForeground` | `infoSoft` | `infoSoftForeground` | `infoSoftBorder` | `infoText` |
| `success` | `success` / `successForeground` | `successSoft` | `successSoftForeground` | `successSoftBorder` | `successText` |
| `warning` | `warning` / `warningForeground` | `warningSoft` | `warningSoftForeground` | `warningSoftBorder` | `warningText` |
| `destructive` | `destructive` / `destructiveForeground` | `destructiveSoft` | `destructiveSoftForeground` | `destructiveSoftBorder` | `destructiveText` |

The solid roles are fills, not foregrounds. Light `warning` (`#F5B01F`) is
1.78:1 against `background` and 1.89:1 against `card`, under the 3:1 non-text
floor, and light `success` is 4.26:1, under the 4.5:1 text floor. `xText` is the
readable tonality for the plain surfaces (`background`, `card` and `popover`),
the `muted` quiet panel a sidebar or settings group paints, and the four state
washes a row paints (`hover`, `active`, `accent` and `selected`); it is held to
4.5:1 in the default themes and 7:1 in the high-contrast variants. That is not
theoretical: a warning label in a pressed row measured 4.22:1 on macOS light,
4.24:1 on Linux light and 4.36:1 on Windows light, and high-contrast light
measured 5.83:1 on `active` and 6.70:1 on `accent`/`selected` until plan `083`
moved the two warning steps. A status dot in a sidebar is the same role on the
quiet panel, which plan `314` put under the contract. A soft surface
is a surface in its own right: it is held to 1.05:1 against
`background`, `card`, `popover` and `muted`, so an Alert, Badge or Toast stays
perceivable on every shipped canvas, platform variants included. The `muted`
panel is the sidebar and settings-group surface, and it is the composition that
forced the list: the platform light variants change it and inherit the tints, so
a status badge sat at 1.023:1 on Linux light, 1.036:1 on macOS light and 1.043:1
on Windows light until plan `300` moved the four light tints one small step
deeper.

The shipped Toast is the one exception to that split: `toast/viewport.tsx`
places its tone glyph and its 3px tone bar with `xSoftForeground` on the
`popover` card rather than on a soft fill. That composition is held at the
secondary floor as `toastTonePairs` until `components` moves the glyph to
`xText`; every shipped set clears it with a wide margin (**11.97:1** at the
tightest, Linux dark `infoSoftForeground`), so the pair is a guard against an
edited theme, not a change to the palette.

The edge is a role, not a mixture: `xSoftBorder` is designed per tone and
measured on the fill it borders and on the eight surfaces a chip sits on
(`background`, `card`, `popover`, the `muted` panel and the `hover`, `active`,
`accent` and `selected` washes) at the divider floor: 1.05:1 in the default
themes and 3:1 at high contrast. The outer pair is not academic: a Badge's fill
is deliberately close to a row wash, so the edge is the shape a reader sees. The
light warning edge sat at 1.036:1 on the macOS light pressed wash and 1.042:1 on
the Linux light one until plan `308` moved it one step (`#FCD47B` → `#EFC055`,
1.246:1 and 1.254:1 on those washes and 1.319:1 on its own fill). At high
contrast the edge is designed, not mixed: `warningSoftBorder` (`#8E5B00`) is
4.41:1 on `warningSoft`, where the 30% mixture it replaced measured 1.12:1,
under the 3:1 divider floor. Because it is a role, a copied platform style edits
it with the rest of the palette.

`statusTone(theme, tone)` resolves the soft surface, its readable foreground, its
designed edge, and the plain-surface text role:

```ts
import { statusTone } from "@gpuixui/tokens";

const tone = statusTone(theme, "info");
tone.background; // theme.colors.infoSoft
tone.foreground; // theme.colors.infoSoftForeground
tone.border; // theme.colors.infoSoftBorder
tone.text; // theme.colors.infoText — labels and dots on plain surfaces and row washes
```

A tone can arrive as data — a server payload, a stored notification. It is
`unknown` until narrowed: `isStatusTone(value)` accepts the four shipped
families and falls back at the caller.

```ts
import { isStatusTone, type StatusTone } from "@gpuixui/tokens";

const resolveTone = (value: unknown): StatusTone =>
  isStatusTone(value) ? value : "info";
```

A runnable example spreads the result onto a container and its text; see
[`src/status-tone.example.ts`](../packages/tokens/src/status-tone.example.ts).
[`src/status-text.example.ts`](../packages/tokens/src/status-text.example.ts)
does the same for a status label and an indicator dot on a plain surface.

## High contrast

Each mode has a high-contrast variant for accessibility. It is an ordinary
`Theme` — the same 66 roles and the same type, spacing, radius, density,
component dimensions, border width and icon scales — with colour values chosen
to meet stricter floors: AAA
body text (7:1), 7:1 secondary and on-colour text, and 4.5:1 focus rings and
essential boundaries. Changing values rather than roles is why no component has
to know the variant exists. It also declares `contrast: "high"`, so the checks
that read a theme default to the floor set it was built for.

```ts
import { createTheme, getTheme, highContrastThemes } from "@gpuixui/tokens";

getTheme("dark", "high"); // highContrastThemes.dark
getTheme("light"); // the default light theme, unchanged
createTheme({ mode: "dark", contrast: "high" }); // builds on the AAA dark set
```

`createTheme` reads `contrast` the way `getTheme` does, so a brand built on the
AAA palette starts from the AAA palette rather than from a relabelled default.
Only `extendTheme` can declare a floor set; the builder selects the palette it
carries, so it cannot claim another.

| Role | HC light | HC dark | Use |
| ---- | -------- | ------- | --- |
| `background` | `#FFFFFF` | `#000000` | window and application canvas |
| `foreground` | `#000000` | `#FFFFFF` | default text |
| `card` | `#FFFFFF` | `#0D0D0D` | raised content surface |
| `cardForeground` | `#000000` | `#FFFFFF` | text on `card` |
| `popover` | `#FFFFFF` | `#141414` | menus, popovers and dialogs |
| `popoverForeground` | `#000000` | `#FFFFFF` | text on `popover` |
| `primary` | `#3B2C8F` | `#C7CBFF` | primary action |
| `primaryForeground` | `#FFFFFF` | `#000000` | text and icons on `primary` |
| `primaryHover` | `#2E2370` | `#E0E3FF` | primary action while hovered |
| `primaryActive` | `#1C1547` | `#EEF0FF` | primary action while pressed |
| `primaryText` | `#3B2C8F` | `#E0E3FF` | brand-toned text, links and icons on plain surfaces and the `accent`/`selected` row fills |
| `secondary` | `#E8E8E8` | `#2E2E2E` | secondary action |
| `secondaryForeground` | `#000000` | `#FFFFFF` | text on `secondary` |
| `secondaryHover` | `#D6D6D6` | `#3D3D3D` | secondary action while hovered |
| `secondaryActive` | `#B8B8B8` | `#4A4A4A` | secondary action while pressed |
| `muted` | `#F2F2F2` | `#1A1A1A` | quiet surface |
| `mutedForeground` | `#1F1F1F` | `#E0E0E0` | secondary text |
| `accent` | `#E0E3FF` | `#251B5C` | highlight wash for a menu row, a hovered selectable row and a toggle that is on |
| `accentForeground` | `#2E2370` | `#E0E3FF` | text on `accent` |
| `accentHover` | `#D5D8FF` | `#33257A` | toggle-on surface while hovered |
| `accentActive` | `#BFC2FF` | `#42319F` | toggle-on surface while pressed |
| `destructive` | `#7E1D21` | `#FF9E9E` | destructive action, and the invalid field edge |
| `destructiveForeground` | `#FFFFFF` | `#000000` | text on `destructive` |
| `destructiveHover` | `#5C1619` | `#FFC6C6` | destructive action while hovered |
| `destructiveActive` | `#3A0B0D` | `#FFE0E0` | destructive action while pressed |
| `success` | `#0E5135` | `#6FE0A3` | success |
| `successForeground` | `#FFFFFF` | `#000000` | text on `success` |
| `warning` | `#F5B01F` | `#FFC94D` | warning |
| `warningForeground` | `#000000` | `#000000` | text on `warning` |
| `info` | `#1B45AC` | `#C5D8FF` | informational status, distinct from `primary` |
| `infoForeground` | `#FFFFFF` | `#000000` | text and icons on `info` |
| `infoSoft` | `#C5D8FF` | `#152F6B` | soft informational surface |
| `infoSoftForeground` | `#0C1D42` | `#DEE9FF` | text and icons on `infoSoft` |
| `infoSoftBorder` | `#1B45AC` | `#6E9CFF` | edge around `infoSoft` |
| `successSoft` | `#A8F0C6` | `#0A3A26` | soft success surface |
| `successSoftForeground` | `#042015` | `#D3F9E2` | text and icons on `successSoft` |
| `successSoftBorder` | `#116A43` | `#3BC97F` | edge around `successSoft` |
| `warningSoft` | `#FFDE8A` | `#4B3100` | soft warning surface |
| `warningSoftForeground` | `#2A1B00` | `#FFEFC6` | text and icons on `warningSoft` |
| `warningSoftBorder` | `#8E5B00` | `#D99400` | edge around `warningSoft` |
| `destructiveSoft` | `#FFC6C6` | `#5C1619` | soft destructive surface |
| `destructiveSoftForeground` | `#3A0B0D` | `#FFE0E0` | text and icons on `destructiveSoft` |
| `destructiveSoftBorder` | `#A5262B` | `#FF6B6B` | edge around `destructiveSoft` |
| `infoText` | `#102352` | `#DEE9FF` | info text and indicators on `background`/`card`/`popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes |
| `successText` | `#082C1D` | `#D3F9E2` | success text and indicators on `background`/`card`/`popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes |
| `warningText` | `#3A2500` | `#FFEFC6` | warning text and indicators on `background`/`card`/`popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes |
| `destructiveText` | `#4E1215` | `#FFE0E0` | destructive text and indicators on `background`/`card`/`popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes |
| `border` | `#575E6B` | `#A0A0A0` | dividers and decorative borders |
| `borderStrong` | `#4A4F58` | `#AAAAAA` | essential control boundaries, including on row washes and soft status fills |
| `input` | `#FFFFFF` | `#0D0D0D` | input field background |
| `inputForeground` | `#000000` | `#FFFFFF` | text typed into an input, on the `input` fill or the `background`/`card`/`popover`/`muted` surfaces a transparent field paints |
| `placeholder` | `#4A4F58` | `#B0B0B0` | placeholder text |
| `ring` | `#4C39B5` | `#C7CBFF` | focus ring |
| `selection` | `#7567F24D` | `#4C39B54D` | text selection wash (30% alpha; `selectionColor`) |
| `selectionOnFill` | `#00000026` | `#FFFFFF26` | text selection veil for content painted on a filled action (15% in both modes; `selectionColor`) |
| `overlay` | `#000000A6` | `#FFFFFF26` | modal scrim |
| `hover` | `#E8E8E8` | `#2E2E2E` | hover wash for ghost surfaces |
| `active` | `#D6D6D6` | `#3D3D3D` | pressed wash |
| `selected` | `#D8DBFF` | `#33257A` | selected row or item, one step past the `accent` hover wash |
| `selectedForeground` | `#2E2370` | `#E0E3FF` | text on `selected` |
| `disabled` | `#E8E8E8` | `#2E2E2E` | disabled surface (kept near the panel; the control's `border` edge carries its shape) |
| `disabledForeground` | `#5A5A5A` | `#A9A9A9` | disabled text, held to the `inactive` floor |
| `skeleton` | `#B0B0B0` | `#565656` | loading placeholder |
| `track` | `#C6C8CD` | `#3A3A3A` | the unfilled groove of a progress bar, meter or slider rail |
| `scrollbar` | `#9A9A9A` | `#8A8A8A` | scrollbar thumb (reserved: no tint in 0.10.0) |
| `shadow` | `#000000` | `#000000` | elevation tint (opaque; each level applies its own alpha) |

## Typography

Families come from the platform table: `sans` is `systemUiFont` (GPUI's
`.SystemUIFont` sentinel) and `mono` is the current platform's family. The
shipped weights are `400`, `500`, `600` and `700`; `FontWeight` is a number in
the CSS range `1…1000`, so a brand may name an intermediate weight its installed
family provides. GPUix has no `letterSpacing` field, so the scale does not
define tracking.

| Role | Size | Line height | Weight | Use |
| ---- | ---- | ----------- | ------ | --- |
| `display` | 28 | 36 | 600 | landing and empty-state display |
| `h1` | 24 | 32 | 600 | first-level page heading |
| `h2` | 20 | 28 | 600 | section heading |
| `h3` | 16 | 24 | 600 | subsection heading |
| `body` | 14 | 20 | 400 | default body copy |
| `bodyStrong` | 14 | 20 | 600 | emphasised body copy |
| `label` | 13 | 18 | 500 | labels, buttons, compact controls |
| `caption` | 12 | 16 | 400 | metadata and helper text |
| `code` | 13 | 20 | 400 | inline code |
| `codeBlock` | 12 | 18 | 400 | code blocks and terminal output |

`textRoles` lists the ten roles in this order, so a table can be generated
without retyping them.

The scale is two exported ladders: `proseLadder` (`display` → `caption`) and
`codeLadder` (`code` → `codeBlock`). `bodyStrong` shares `body`'s size and is a
weight variant, so it is on neither. `themeMetricFailures` holds an edited theme
to the same order.

`textStyle(theme, role)` resolves a role to GPUix style properties, choosing the
mono family for `code` and `codeBlock`:

```tsx
import { textStyle } from "@gpuixui/tokens";

<text style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}>
  Save changes
</text>;
```

### Platform styles

Four platform variants ship: macOS, Linux, Windows and Default. They are full
token themes in this package, not docs-only CSS: `platformStyles` indexes one
editable file per platform under `platform-styles/`, and
`getPlatformTheme(platform, mode, contrast?)` derives a real `Theme` from the
built-in identity.

| Platform | `sans` | `mono` | Radius `sm` / `md` / `lg` / `xl` | Density | Primary (light) | Primary (dark) |
| -------- | ------ | ------ | -------------------------------- | ------- | --------------- | -------------- |
| `darwin` (macOS) | `.SystemUIFont` | `Menlo` | 4 / 6 / 10 / 12 | `compact` | `#0071E3` | `#0A84FF` |
| `linux` (Linux) | `.SystemUIFont` | `DejaVu Sans Mono` | 4 / 6 / 12 / 12 | `comfortable` | `#1C71D8` | `#78AEED` |
| `win32` (Windows) | `.SystemUIFont` | `Consolas` | 2 / 4 / 8 / 8 | `comfortable` | `#0067C0` | `#4CC2FF` |
| `default` (Default) | `.SystemUIFont` | `Menlo` | 4 / 6 / 8 / 12 | `comfortable` | `#5F4BDB` | `#A7A9FF` |

The Default variant has no overrides — `getPlatformTheme("default", mode)`
returns the identity unchanged. Each real variant changes its type family,
radii, density, motion, surfaces (including the loading skeleton), accent and
shadows; roles it does not name (the other status roles, disabled, scrollbar) and
every non-colour scale inherit the identity, so the default stays the design
system the library is built on. The dark variants carry their own `skeleton`,
because a loading placeholder is a surface on that platform's card and row
washes, not a fixed grey, and they also name their dark `destructiveSoft` — the
identity tint they already paint — so applying one style over another platform's
theme cannot keep the previous canvas's tint (plan `374`).

`getPlatformTheme` never mutates its base, keeps the requested mode and returns
a normal `Theme`:

```tsx
import { getPlatformTheme } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";

<ThemeProvider theme={getPlatformTheme("win32", "dark")}>
  <Code>npm run build</Code>
</ThemeProvider>;
```

**High contrast wins over resemblance.** `getPlatformTheme(platform, mode,
"high")` applies the families, radii, density, motion and each platform's
elevation levels on top of the high-contrast colour set, because a platform
accent must not drop the AAA floors. Elevation carries no colour of its own — a
level is geometry plus an alpha over the theme's `shadow` tint (plan `085`) — so
the AAA tint stays while the platform's depth applies (plan `345`).

To ship your own look, copy a style file and edit it, or extend the resolved
theme — no component source changes:

```ts
import {
  applyPlatformStyle,
  extendTheme,
  getPlatformTheme,
  getTheme,
} from "@gpuixui/tokens";

// Copy `platform-styles/windows.ts`, change its values, keep the shape.
import { contosoStyle } from "./contoso";

const contoso = applyPlatformStyle(getTheme("dark"), contosoStyle);
const tweaked = extendTheme(getPlatformTheme("win32", "dark"), {
  colors: {
    primary: "#5CB8FF",
    primaryForeground: "#001A33",
    primaryHover: "#8CCFFF",
    primaryActive: "#A6DBFF",
    primaryText: "#8CCFFF",
  },
  radius: { md: 3, lg: 6 },
});
```

The edited family moves together, for the reason the brand example gives: a
partial edit inherits the state roles and the foreground designed for the base
fill. This example used to name only `primary` and `primaryHover`, so it kept
the Windows dark black foreground and measured **2.96:1** on its fill and
**2.12:1** on the hover, under the 4.5:1 on-colour floor (plan `310`). Both
example themes are held to `themeContrastFailures`.

`applyPlatformStyle(base, style, contrast = base.contrast)` reads the level the
base declares, so a copied style never overrides a high-contrast palette unless
the caller asks it to:

```ts
applyPlatformStyle(getTheme("dark", "high"), contosoStyle); // keeps the AAA palette
```

The result declares the level of the palette it carries, the way every theme
does. Naming `"default"` on a high-contrast base applies the platform colours, so
the returned theme declares `default` — the AAA palette is no longer there.
Naming `"high"` on a default base applies only families, shape and elevation
levels, so the theme stays `default`; a style with no colour overrides keeps the
base's level because it changes no colour. A colour key set to `undefined` is
not an override either: the role inherits and the declaration stays with the base
(plan `323`). A style overrides only the roles it names, and the roles it does
not name belong to the palette it is written over: naming `"default"` on a base
at another level replaces the palette as a set, taking the unnamed roles from the
default-level identity of the same mode. The result is a whole palette rather
than half of one, so `themeContrastFailures` returns `[]` for every shipped style
applied this way; a base that already declares the level keeps its own colours,
edits included, so a style still overrides only what it names (plan `373`).

### Authoring a platform style

A style file is plain data. Copy one from `platform-styles/` and keep the shape;
every field inside `structure` is optional, and every omitted role or level
inherits the identity:

```ts
interface PlatformStyle {
  types: PlatformType; // label, sans, mono
  structure: {
    radius?: Partial<Radius>;
    density?: DensityName;
    motion?: Partial<Omit<Motion, "ease">>;
  };
  colors: Record<ThemeMode, Partial<ThemeColors>>;
  elevation: Record<ThemeMode, Partial<Elevation>>;
}
```

A complete file authored from scratch lives in
[`src/platform-styles.example.ts`](../packages/tokens/src/platform-styles.example.ts)
(`contosoPlatformStyle`). It names the whole primary family — fill, foreground,
hover, pressed and text — and the whole accent family — fill, foreground, hover
and pressed — and is compiled, applied and held to
`themeContrastFailures` in `platforms.test.ts`, so the shape above is the one the
library tests, not a sketch. A style that names only the fill inherits a
foreground designed for another fill; that is the 2.96:1 failure plan `310`
fixed. A style that moves `accent` but not its states inherits the base hue's
hover and press; that is the lavender Contoso toggle plan `330` fixed. The
drag-selection wash follows the accent too: `selection` is the accent at the
identity's alpha for the mode, because a copied style that keeps the identity
wash selects text in another hue (plan `331`).

`applyPlatformStyle(getTheme(mode), contosoPlatformStyle)` is the same call the
shipped variants use, so a copied file cannot take a path the library does not
test.

A style is also an override set over whatever base it is applied to, so a style
that changes a canvas role another shipped style also changes must name that
role. The shipped dark styles name `destructiveSoft` for exactly that reason:
Linux owns a darker tint (plan `091`) and the others name the identity tint they
paint, so neither can leave the other's value behind on its own canvas.
`platform-composition.test.ts` applies every shipped style and recipe to every
shipped base in both modes, both contrasts and both requested levels and holds
each result to all four checks (plan `374`).

### Platform recipes

Two recipes ship beside the platform variants: Windows XP (Luna) and Windows 7
(Aero). A recipe is an **edition of a platform**, not a fifth platform: it is a
plain `PlatformStyle`, so `platformNames` (and therefore the docs platform
toggle) stays macOS · Linux · Windows · Default. `platformRecipes` indexes the
two styles, `platformRecipeNames` orders them, `isPlatformRecipeName` narrows a
stored or URL choice, and `getPlatformRecipeTheme(recipe, mode, contrast?)`
resolves one through the same `applyPlatformStyle` path as
`getPlatformTheme`.

| Recipe | Canvas (light) | Accent (light) | Selected (light) | Radius `sm` / `md` / `lg` / `xl` | Density | Mono |
| ------ | -------------- | -------------- | ---------------- | -------------------------------- | ------- | ---- |
| `xp` (Windows XP) | `#ECE9D8` | `#0054E3` | `#BDD4FF` | 2 / 3 / 6 / 8 | `compact` | `Consolas` |
| `aero` (Windows 7) | `#F0F4F9` | `#1565C0` | `#CCE4FA` | 3 / 5 / 8 / 10 | `comfortable` | `Consolas` |

A recipe names only what it changes: status tones, disabled, overlay, scrollbar
and every non-colour scale inherit the identity, and both recipes carry the
Windows shadow geometry and motion. The file in
[`src/platform-styles/recipes/`](../packages/tokens/src/platform-styles/recipes/)
is the whole recipe — copy it, edit a value, and apply it with
`applyPlatformStyle`, exactly like a shipped variant.

```tsx
import {
  applyPlatformStyle,
  getPlatformRecipeTheme,
  getTheme,
  platformRecipes,
} from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";

<ThemeProvider theme={getPlatformRecipeTheme("xp", "light")}>…</ThemeProvider>;

// The copy-and-own path applies to a recipe too.
const mine = applyPlatformStyle(getTheme("dark"), {
  ...platformRecipes.aero,
  colors: {
    ...platformRecipes.aero.colors,
    dark: { ...platformRecipes.aero.colors.dark, primary: "#1F6FB5" },
  },
});
```

**Selection is a tint, not a filled bar.** XP's shell painted a strong blue
selection bar with white text. In this system a `selected` row is a *surface*:
the contrast contract measures `selectedForeground`, secondary text, a status
label, a disabled label, a control edge and the focus ring on it, and a strong
blue fill cannot carry them. Both recipes therefore use a light selection tint
and keep the drag wash in `selection`. The filled bar is an application
composition over these roles, not a token — a genuine limit of the role model,
documented rather than hidden.

**Dark is an interpretation.** Neither Windows XP nor Windows 7 shipped a dark
mode. Their dark themes carry the Windows dark palette (the recipe's `dark`
colours are the Windows variant's) and the era's shape, so they are honest
extensions, not reconstructions; both are held to the contrast contract in each
mode. The dark accent is the Windows dark step, not a rebuilt Luna or Aero one.

**Aero's glass is an approximation.** GPUix 0.10.0 has no backdrop blur, inset
shadow, radial/conic gradient or clip-path, so Aero's layers are solid tinted
surfaces, and XP's bevel is a light/dark border pair rather than an inset
shadow. The recipes stop where the runtime does.

### The deprecated `platformTheme` bridge

`platformTheme(base, platform)` is the pre-063 helper: it changes the two font
families and the display name, and nothing else. It stays exported, marked
deprecated, because the `primitives` package still imports it; it applies no
colour, radius, density or shadow, so it is a type choice, not a style variant.
Use `getPlatformTheme(platform, mode, contrast)` for a real variant. The alias is
removed when `primitives` migrates (recorded in `TODO.md`).

The docs platform toggle and a native build call the same function, so a preview
cannot show a theme the runtime cannot produce.

**Type facts.** `sans` is `.SystemUIFont` on every platform because GPUI resolves
the sentinel to the operating system's own UI font, so a theme never names a
face the machine may not have. `mono` names a family each platform installs.
GPUix 0.10.0's `StyleDesc.fontFamily` is a **single** string, not a CSS stack, so
an entry never contains a comma; a family the machine does not have falls back
silently. `themeTypefaceFailures` holds an edited theme to that form (see
[Typeface](#typeface)). `currentPlatform` is the platform this code runs on
(`default` in a browser or on an OS the library does not know) and
`systemMonoFamily` is its mono family, which the default typography uses.

### Custom typefaces are unavailable in 0.10.0

GPUix 0.10.0 has **no `registerFont`**: a family must already be installed on the
machine. `@gpuix/native@0.10.0`'s `GpuixRenderer` declares `setImagePixels`,
`setImage` and the automation methods, but no font registration, and
`@gpuix/react`'s `useGpuixRequired()` returns that same class. The capability
exists only on `references/gpuix` main (HEAD `515df19`) as an **unreleased**
changeset — `.changeset/register-font.md`, a minor bump for `@gpuix/native`,
`@gpuix/react` and `@gpuix/solid`. This is the same published-vs-main divergence
recorded for `Dialog` and `createPortal`.

A brand can still name an **installed** family through the theme:

```ts
const theme = extendTheme(themes.dark, {
  typography: { sans: "Helvetica Neue" },
});
```

A family the machine does not have falls back silently, so only name one the
target platforms install. Shipping a face with the application needs the runtime
API; plan `052` holds the ready design — `registerFonts(registrar, typefaces)`,
idempotent per renderer, returning the families for `extendTheme` — and stays
blocked until a GPUix release exposes it. No font is bundled, so `LICENSES/` has
no font entry.

## Spacing

| Token | Pixels |
| ----- | ------ |
| `2xs` | 2 |
| `xs` | 4 |
| `sm` | 6 |
| `md` | 8 |
| `lg` | 12 |
| `xl` | 16 |
| `2xl` | 24 |
| `3xl` | 32 |
| `4xl` | 48 |
| `5xl` | 64 |

## Radius

| Token | Pixels | Use |
| ----- | ------ | --- |
| `none` | 0 | square surfaces |
| `sm` | 4 | small controls, tags |
| `md` | 6 | default controls |
| `lg` | 8 | cards and popovers |
| `xl` | 12 | dialogs and large surfaces |
| `full` | 9999 | pills and avatars |

## Density

Density changes control height, horizontal padding and row height only. Type
and spacing are unaffected.

| Preset | `controlHeight` sm/md/lg | `controlPaddingX` sm/md/lg | `rowHeight` |
| ------ | ------------------------ | -------------------------- | ----------- |
| `compact` | 24 / 28 / 32 | 6 / 8 / 10 | 28 |
| `comfortable` (default) | 28 / 32 / 36 | 8 / 10 / 12 | 32 |
| `spacious` | 32 / 36 / 40 | 10 / 12 / 14 | 36 |

```ts
import { controlHeight, controlPaddingX } from "@gpuixui/tokens";

controlHeight(theme, "md");
controlPaddingX(theme, "md");
```

A metric override merges size by size:

```ts
import { extendTheme, lightTheme } from "@gpuixui/tokens";

const taller = extendTheme(lightTheme, {
  density: { controlHeight: { md: 34 } },
});
```

`{ density: { controlHeight: { md: 34 } } }` raises the default control by 2px
and keeps the small and large heights, the padding and the row height, and the
theme still names `comfortable`.

`defaultDensity` is the `comfortable` preset, and every built-in theme uses it.
A theme's `density` always names the preset it is based on, including after a
partial metric override.

`densityNames` lists the three presets in documentation order, and
`DensityName` derives from it, so a preset cannot exist without a table row or a
value in `densityPresets`. A persisted density is `unknown`; narrow it before it
reaches `extendTheme`, or a stale setting becomes a theme with no metrics:

```ts
import { isDensityName, type DensityName } from "@gpuixui/tokens";

const resolveDensity = (stored: unknown): DensityName =>
  isDensityName(stored) ? stored : "comfortable";
```

`controlSizes` lists the three control sizes a component accepts — `sm`, `md`,
`lg` — in documentation order, and `ControlSize` derives from it, so a size
cannot exist without a metric in every preset. A stored size is `unknown` like
any other choice:

```ts
import { isControlSize, type ControlSize } from "@gpuixui/tokens";

const resolveSize = (stored: unknown): ControlSize =>
  isControlSize(stored) ? stored : "md";
```

## Component dimensions

Density changes what scales with a control — height, horizontal padding and row
height. Component dimensions are the fixed surface metrics that do not: an
overlay keeps its width, a toast its card width and a field its adornment at
every density.

| Token | Pixels | Use |
| ----- | ------ | --- |
| `dimensions.overlayMinWidth` | 180 | narrowest menu surface |
| `dimensions.overlayWidth` | 220 | default popover, combobox and calendar width |
| `dimensions.overlayMaxHeight` | 320 | the height at which a long overlay list scrolls; held to one `density.rowHeight` |
| `dimensions.fieldMinWidth` | 200 | narrowest field that shows a query and an action |
| `dimensions.fieldAdornmentSize` | 16 | icon or clear control inside a field |
| `dimensions.chipMinWidth` | 80 | minimum content width of a token-input chip |
| `dimensions.toastWidth` | 380 | fixed toast card width |
| `dimensions.previewCardMinWidth` | 240 | narrowest preview card |
| `dimensions.previewCardMaxWidth` | 360 | widest preview card |

A metric override merges field by field, like the spacing and radius scales:

```ts
import { extendTheme, lightTheme } from "@gpuixui/tokens";

const wider = extendTheme(lightTheme, {
  dimensions: { toastWidth: 420 },
});
```

`dimensions` is inherited by every platform variant and recipe: overlay widths,
field chrome and card widths are shared surface metrics, not platform
conventions. A consumer who wants a narrower platform menu edits the group on
the resolved theme.

## Elevation

A level is geometry, not a colour: `offsetX`, `offsetY`, `blurRadius`,
`spreadRadius` and the `alpha` to apply to the theme's `colors.shadow` tint.
`elevationShadow` composes the two into a shadow — the exact five fields of
GPUix's `StyleDesc.boxShadow` (`offsetX`, `offsetY`, `blurRadius`,
`spreadRadius`, `color`). There is no `inset` and no shadow list: **the runtime
paints one shadow per element.**

| Level | Light | Dark | Use |
| ----- | ----- | ---- | --- |
| `sm` | `0 1 2 0 #191D2514` | `0 1 2 0 #00000066` | resting cards |
| `md` | `0 4 12 -2 #191D251F` | `0 8 24 -4 #000000A6` | menus and popovers |
| `lg` | `0 16 40 -8 #191D2529` | `0 24 56 -12 #000000CC` | dialogs and command palettes |
| `overlay` | `[]` | `[]` | reserved; overlay layering uses the scrim colour |

The table shows the resolved shadow. The tint itself is one role, so retinting
every level is one value:

```ts
import { extendTheme } from "@gpuixui/tokens";

// Every elevation level now paints with a black tint, at its own alpha.
const brand = extendTheme(theme, { colors: { shadow: "#000000" } });
```

A level is a list so a web renderer can composite several shadows; a shipped
level carries at most one entry. A consumer reads the one the runtime paints
with `elevationShadow`, and the whole list with `elevationShadows`:

```tsx
import { elevationShadow, elevationShadows } from "@gpuixui/tokens";

<div style={{ boxShadow: elevationShadow(theme, "md") }} />;

const layered = elevationShadows(theme, "lg"); // every entry, tint composed
```

`elevationShadow(theme, level)` returns the level's shadow, or `undefined` for
the reserved empty `overlay` level (which `boxShadow` accepts).
`elevationShadows` returns the resolved list. A shipped level with two entries
would silently render only the first, so
`packages/tokens/src/elevation.test.ts` fails if one appears, and
`elevation-tint.test.ts` fails if editing `colors.shadow` stops retinting a
level.

## Motion

There is no `transition` and no `animation` in the runtime: motion exists only
through `motion` props, and `MotionStyle` reaches eight properties — `width`,
`height`, `opacity`, `top`, `right`, `bottom`, `left`, `borderRadius`. No
transform, no rotation, no colour interpolation.

Timings are **milliseconds** in the tokens; the runtime's transition takes
**seconds**. The step levels follow the surface classes `elevation` names.

| Level | Milliseconds | Runs on | Used by |
| ----- | ------------ | ------- | ------- |
| `none` | 0 | — | a theme that removes motion |
| `step` | 120 | `linear` | spinner and indeterminate bar frames |
| `fast` | 160 | `enter` / `exit` | tooltips, badges |
| `normal` | 200 | `enter` / `exit` | menus, dropdowns, combobox lists |
| `slow` | 320 | `enter` / `exit` | dialogs, panel expansion, accordions |
| `pulse` | 700 | `linear` | a skeleton's half cycle |

Easings are named per phase: `standard` (`easeInOut`), `enter` (`easeOut`),
`exit` (`easeIn`) and `linear`. The runtime also takes a cubic-bezier tuple, so
`extendTheme(base, { motion: { ease: { enter: [0.4, 0, 0.2, 1] } } })` works
without a cast. The tuple is four finite control points whose two x values must
lie inside `0…1`: the runtime's `validate_ease` rejects the whole transition
otherwise, and a curve outside that range has no progress function. A y value may
overshoot — a spring-like curve is a design choice — and a named easing is
constrained by `MotionEasing` itself. `themeMetricFailures` holds both rules, and
the timings must be finite as well as ordered, because the runtime rejects a
non-finite duration.

```tsx
import { motionTransition } from "@gpuixui/tokens";

// { duration: 0.32, ease: "easeOut" } — seconds, the unit the runtime takes.
const transition = motionTransition(theme, "slow", "enter");

<div style={{ height }} motion={{ animate: { height }, transition }} />;
```

`motionTransition(theme, level, phase)` defaults to the `standard` phase. A step
indicator reads the token directly, because `setInterval` takes milliseconds:

```ts
const intervalMs = theme.motion.step; // 120
```

To remove motion — there is no reduced-motion query in the runtime — override
every level to `0`:

```ts
const still = extendTheme(base, {
  motion: { step: 0, fast: 0, normal: 0, slow: 0, pulse: 0 },
});
```

A runnable example lives in
[`src/motion.example.ts`](../packages/tokens/src/motion.example.ts).

## Layering

There is **no `z-index` and no stacking context** in GPUix 0.10.0 — the word does
not appear in either published package — so **tree order is paint order**. The
order a desktop app expects is a *mounting rule*, not data:

```
dropdown → popover → tooltip → modal → toast
```

Mount a later layer later in the tree (or reorder the children that hold it).
There is no layering token, and there will not be one: a number no runtime reads
is a lie in the API.

An overlay positions with `FloatingLayer` / `floatingRootStyle` from
`@gpuix/react/floating` and the `<anchored>` host element, which occludes what
the layer covers. Enter and exit are `AnimatePresence` + `motion`, timed by the
[motion tokens](#motion).

**Limitation — no portal.** `createPortal` is an unreleased GPUix changeset, so
in 0.10.0 an overlay paints where it sits in the tree rather than at the document
root. A scrim that must cover the window therefore has to be mounted where it
paints over its siblings; the strongest honest alternative is to keep the overlay
as the last child of the surface it covers. This is a component-level
consequence, not something tokens can fix.

## Borders, icons and avatars

| Token | Pixels |
| ----- | ------ |
| `borderWidth.thin` | 1 |
| `borderWidth.strong` | 2 |
| `iconSize.xs` | 12 |
| `iconSize.sm` | 14 |
| `iconSize.md` | 16 |
| `iconSize.lg` | 20 |
| `iconSize.xl` | 24 |
| `avatarSize.xs` | 20 |
| `avatarSize.sm` | 26 |
| `avatarSize.md` | 32 |
| `avatarSize.lg` | 40 |

Icon and avatar sizes are fixed tiers read by name, not density-dependent
metrics: a 26px person chip is not a density decision. See
[Spacing](#spacing) and [Density](#density) for the scales that density does
move.

## Focus

GPUix 0.10.0's `StyleDesc` has **no `outline*` properties and no `focusVisible`
state** — a nested style only offers `hover` and `active` — and `boxShadow` is a
single shadow. The focus ring is therefore a shadow that takes no layout space: a
zero-offset, zero-blur ring spread by `borderWidth.strong`.

```tsx
import { focusRing, type Theme } from "@gpuixui/tokens";

const ringStyle = (theme: Theme, focused: boolean) =>
  focused ? focusRing(theme) : undefined;

// ringStyle(theme, true)
// {
//   boxShadow: { offsetX: 0, offsetY: 0, blurRadius: 0,
//                spreadRadius: 2, color: theme.colors.ring }
// }
```

A control applies the ring **while it is focused**, so a mouse press shows it
too: the published runtime has no `:focus-visible` equivalent. The ring never
changes an element's size or position, because a shadow is painted outside the
border box and takes no space in layout.

An invalid control recolours that ring with `destructive` (the runtime can draw
only one), so the error colour becomes the focus indicator. `invalidRingPairs`
holds it to the boundary floor on the surfaces a control sits on, which are not
the field's own fill; `destructive` on `background` is shared with the invalid
field edge.

A runnable example lives in
[`src/focus-ring.example.ts`](../packages/tokens/src/focus-ring.example.ts).

## Text selection

GPUix 0.10.0 exposes `selectionColor` and `userSelect` as inherited `StyleDesc`
properties, so text the library paints itself is themeable. `selectionStyle(theme)`
maps the `selection` role to the property:

```tsx
import { selectionStyle } from "@gpuixui/tokens";

<div style={selectionStyle(theme)}>{children}</div>;
```

Both selection properties inherit down the tree, so an application sets the wash
once on its root; chrome that must not be selectable — a toolbar, a tab strip,
window controls — sets `userSelect: "none"` on its own subtree. The wash is
translucent (24% in the light default theme, 20% in dark and 30% at high
contrast), so selected text keeps the body contrast on every surface a glyph can
be selected on: `background`, `card`, `muted`, `hover`, `active` and `accent`
with `foreground`; `popover` with `popoverForeground`; `input` with
`inputForeground`; and `selected` with `selectedForeground` at the secondary
floor; a soft status surface carries its own tone with `xSoftForeground`, its
description with `foreground` and its caption with `mutedForeground`. A card
carries two text roles — the default `foreground` a `CardTitle` paints and its
own `cardForeground`, which a context menu trigger sets on its `card` fill — so
both are measured through the wash.
Secondary text is held to the secondary floor through the same wash on all nine
surfaces (`mutedForeground`), because a row description, a card caption or a
message timestamp is selected with the body copy around it. The soft surfaces
are held in both directions too: `selectionSoftPairs` measures all three text
roles a status panel carries — the tone's `xSoftForeground`, the body
`foreground` its description and ghost dismiss control paint, and the caption
`mutedForeground` — through the wash, and `selectionSoftWashPairs` the wash's
own perceivability, so a selected Alert, Badge or Toast keeps its body and
secondary floors and still shows the highlight. Every shipped set passes: the
identity dark body on `infoSoft` is **7.26:1** at the tightest and Aero light's
caption on `destructiveSoft` **4.78:1**, so no colour moves. Status text is held
through the same wash on the same nine surfaces (`selectionStatusPairs`), because
`xText` is the role plan 083 gave a status label, icon or dot in a row and a
selectable row's label is dragged over with the copy around it. The audit found
XP light `successText` at 3.671:1 on `active`, Aero light at 3.721:1 on
`selected`, and every high-contrast light tone at 6.12–6.72:1 under the 7:1
floor while the dark sets already passed; the six light status roles move one
half-step between the ramp steps they used, so the tightest shipped pair is
**4.584:1** (XP light `infoText` on `selected`) and the AAA tightest **7.370:1**
(identity light high `warningText` on `active`). An accent-toned
link is the one deliberate omission: the shipped `primaryText` does not clear
7:1 at AAA, and macOS light measures 4.32:1 through the wash on
`infoSoft`, under the default secondary floor. The audit found two gaps:
identity light `successSoftForeground`
measured 5.83:1 through the wash, under the 7:1 body floor, and Windows dark's
wash over `destructiveSoft` measured 1.005:1 — an invisible highlight. The four
light soft foregrounds moved one family step darker, the dark ones one step
lighter with a 20% identity wash, Windows dark's wash moved to 40%, and Linux
dark's soft destructive fill moved to `#3A0B0D` so its light-accent wash stays
visible. `selectionSurfaces` is the list of plain surfaces, `selectionPairs`
holds their body and secondary text pairs, and `selectionWashPairs` holds the
wash itself to the 1.05:1 perceivability floor on each surface, so a highlight
that is technically readable but invisible fails the check too.

```tsx
import { selectionStyle } from "@gpuixui/tokens";

const chrome = { userSelect: "none" } as const;

<div style={selectionStyle(theme)}>
  <div style={chrome}>Toolbar</div>
  <text>Selectable content</text>
</div>;
```

A runnable example lives in
[`src/selection.example.ts`](../packages/tokens/src/selection.example.ts).

Content painted on a **filled action** uses `selectionOnFill` instead of
`selection`. The accent-tinted wash *is* the accent, so on a `primary` fill it
composites to **1.000:1** — an invisible highlight on the one surface a user
message is painted on (identity dark, macOS light and dark, Linux light, Windows
light and Aero light). The neutral 15% veil steps away from the fill in both
modes: `selectionFillPairs` holds one text pair per filled family —
`primary`, `secondary`, `destructive` and `accent`, derived from
`filledControlFamilies` — at **4.827:1** at the tightest (macOS dark,
`accentForeground` on `accent`), above the 4.5:1 the on-colour role already has,
and `selectionFillWashPairs` holds the veil itself at **1.075:1** at the
tightest (identity dark high, `selectionOnFill` on `primary`), above the 1.05:1
perceivability floor.
`selectionStyle(theme, "fill")` applies it to a subtree, and
`filledContentStyle` in the example is the copyable version:

```tsx
import { selectionStyle } from "@gpuixui/tokens";

<div
  style={{
    ...selectionStyle(theme, "fill"),
    backgroundColor: theme.colors.primary,
  }}
>
  {children}
</div>;
```

The eight pairs join the checker and are reported with
`wash: "selectionOnFill"`. Plan `344` measured the three families that existed
in its pair list; plan `382` derives both lists from `filledControlFamilies`, so
the fourth family (`accent`) is covered too. Its label measured **4.140:1** on
macOS light and **4.430:1** on Linux dark through the veil, so the two accent
foregrounds move one designed step (`#0055B3` → `#004A9E` and `#A8CBF0` →
`#B4D5F7`); every other shipped set already cleared the floor.

### Native text fields

A GPUix `<input>`/`<textarea>` is a custom element: it paints its own content, and
the pinned runtime fixes two of those paints. The editor draws its placeholder in
`#8F8F8F` (`rgba(0x8f8f8fff)`) and its selection in `#7C86FF59`
(`rgba(0x7c86ff59)`); it reads the `theme`
prop for `caret` alone, takes typed text from the element's `style.color`
(`inputForeground`), and never reads `textFaint`, `accent` or the inherited
`selectionColor`.

The consequence is measurable: the fixed placeholder is **3.23:1** on the
identity light `input` fill and 4.08–4.38:1 on the dark platform inputs, under
the 4.5:1 secondary floor, while the designed `placeholder` role clears 5:1 on
the same fills. The `placeholder` pairs therefore describe a hint the consumer
renders itself — the transparent fields (`SearchInput`, `InlineEdit`,
`ColorPicker`, `TagInput`, `MentionInput`) paint one on a `Surface` tone — and
the selection pairs describe app text, not selected text inside a native field.
A field that must carry the theme's hint colour draws a `<text>` hint over the
input and hides the native placeholder; until a consumer does that, the native
grey and wash stand. Evidence: `@gpuix/native@0.10.0` (`9fcd628`),
`packages/native/src/custom_elements/input.rs`.

### Scrollbars

The opposite case. GPUix 0.10.0 exposes no `scrollbarColor` or `scrollbarWidth`
— both exist only as unreleased changesets on GPUix's `main` — so a scroll
container's thumb, where the platform draws one, is not ours to tint.
`theme.colors.scrollbar` is therefore **reserved**: a custom scroll indicator the
application draws can use it, but the native thumb cannot. No helper is shipped
for a style the pinned runtime does not read.

## Theme API

```ts
type ThemeMode = "light" | "dark";

interface Theme {
  name: string;
  mode: ThemeMode;
  contrast: ThemeContrast;
  colors: ThemeColors;
  typography: Typography;
  spacing: Spacing;
  radius: Radius;
  density: Density;
  dimensions: Dimensions;
  elevation: Elevation;
  motion: Motion;
  borderWidth: BorderWidth;
  iconSize: IconSize;
  avatarSize: AvatarSize;
}
```

`contrast` is the floor set the theme is designed against — `"default"` or
`"high"` — carried beside `mode` so a check never has to guess. `extendTheme`
keeps the base level; `{ contrast: "high" }` declares a new one, which is a claim
until `themeContrastFailures` proves it.

`lightTheme`, `darkTheme`, `themes` and `getTheme(mode)` are the built-ins.
Each mode also has a high-contrast variant (`highContrastLightTheme`,
`highContrastDarkTheme`, `highContrastThemes`) reachable through
`getTheme(mode, "high")`. `createTheme(config)` starts from
`getTheme(config.mode, config.contrast ?? "default")`, so `contrast` selects the
palette it builds on; `extendTheme(base, overrides)` derives from any theme,
including a high-contrast one.

```ts
import { createTheme, extendTheme, darkTheme } from "@gpuixui/tokens";

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

export const scoped = extendTheme(darkTheme, {
  typography: {
    body: { fontSize: 15 },
    bodyStrong: { fontSize: 15 },
  },
});
```

`bodyStrong` moves with `body`: it is the weight variant of the same size, so a
body size bump that leaves it behind inverts the contract's "emphasis is never
smaller than body" rule. `themeFailures` reports it.

A brand that changes `primary` sets the whole family — `primaryForeground`,
`primaryHover`, `primaryActive` and `primaryText` — because an inherited state
keeps the base hue running the interaction and can miss the on-colour floor: the
dark example's inherited foreground measured 4.24:1 on its brand fill before
this rule was written down. The executed example in
[`src/brand-theme.example.ts`](../packages/tokens/src/brand-theme.example.ts) is
this exact family, and `theme.test.ts` holds it to `themeContrastFailures`.

A persisted choice arrives as `unknown`. The package guards its own unions, so a
consumer does not retype them: `isPlatformName(value)` narrows to a shipped
platform (including `default`), `isThemeMode(value)` to `light`/`dark`,
`isThemeContrast(value)` to `default`/`high`, and `isDensityName(value)` to a
preset. A tone from a payload is the same kind of choice and narrows with
`isStatusTone(value)`; a stored component size narrows with
`isControlSize(value)`. The two theme axes also have ordered indexes beside
their guards — `themeModes` and `themeContrasts` — so a settings row or a docs
toggle iterates them instead of retyping `"light" | "dark"`. They narrow a
choice; decoding a whole theme object from a file or URL is still the
application's boundary and belongs to its `Schema`.

The composition is the package's too: `resolveThemeChoice(choice)` turns a
persisted row into a theme. `mode` and `contrast` select the variant, `recipe`
or `platform` styles it, and a stored `density` is applied last, so it wins over
the platform's own preset — macOS carries `compact`, Linux and Windows
`comfortable`. A recipe is an edition of a platform offered beside the platform
axis, so it wins when a stored object carries both. Every axis is `unknown` and
falls back rather than failing: an unknown mode is `light`, an unknown contrast
is `default`, an unknown platform is the identity, an unknown recipe falls back
to the platform, and an unknown density keeps the resolved theme's preset. A
value from an older release must not stop a settings screen from opening.

```ts
import { resolveThemeChoice } from "@gpuixui/tokens";

const theme = resolveThemeChoice({
  mode: storedMode,
  contrast: storedContrast,
  platform: storedPlatform,
  density: storedDensity,
});
```

The object's shape is still the application's `Schema` boundary; the unions and
the precedence are the package's. The executed example is
[`src/theme-choice.example.ts`](../packages/tokens/src/theme-choice.example.ts).

Merge rules:

- groups are partial: omitted values inherit from the base; an explicit
  `undefined` is treated as omitted, so a partial config spread cannot erase a
  role, a metric or an elevation level;
- colour, spacing, radius, component dimensions, border width, icon and avatar
  overrides merge key by key;
- typography text roles merge field by field, so `body.fontSize` keeps the base
  leading and weight;
- elevation levels **replace** the whole level list; a level is geometry plus an
  alpha applied to the `shadow` tint;
- motion merges timing by timing and easing by easing, so overriding `normal`
  keeps `fast` and `enter`;
- `density` accepts a preset name or partial metrics; metrics merge by size, so
  changing the medium control height keeps the small and large ones, and a
  partial override keeps the base preset name;
- `mode` is not overridable — `extendTheme` keeps the base mode;
- `contrast` defaults to the base's declaration; an `extendTheme` override is a
  claim the extension mechanism does not check, and `createTheme` has no claim
  path at all — its `contrast` picks the built-in variant;
- nothing is mutated. The returned theme may share untouched token objects. The
  contract is no mutation, not deep cloning.

### Checking a theme

An edited theme — a copied platform style or a brand palette — can be held to
the same floors as the shipped ones. The guarantee is four checks — colour
format, typeface form, contrast and numeric metrics — and
[`themeFailures`](#one-check) runs all four in one call; the sections below
explain each one it composes.

```ts
import { themeContrastFailures } from "@gpuixui/tokens";

themeContrastFailures(brandTheme); // [] at the level brandTheme declares
themeContrastFailures(brandTheme, "high"); // the same theme against the AAA floors
```

`themeContrastFailures(theme, contrast = theme.contrast)` measures `contrastPairs`
against `contrastFloors`. The list holds text pairs, secondary text and status
text on the state washes (`hover`, `active`, `accent` and `selected`), the
default label of a list or menu row on the washes it paints, the field edge on
its `input` fill, secondary text on the same fill a time picker's separator and
clear control paint, the invalid field edge — `destructive` on the `input` fill and
on the `background` canvas a transparent field paints — the other
status pairs, the focus ring on the plain surfaces, the `muted` panel, the
`accent` wash, the three state washes a focused control can sit on and the four
soft status fills (`ringSoftPairs`), the `destructive` ring an invalid control
paints on the same surfaces (`invalidRingPairs`), the
functional control boundary on the `muted` panel, those washes and the four soft
status fills (`controlBoundarySoftPairs`), a status panel's caption and link —
`mutedForeground` and `primaryText` on the four soft status fills
(`softPanelTextPairs`), the selection
wash — body, secondary and status text through it, and the wash's own
perceivability —
the soft status surfaces, the designed edge on its own fill and on the eight
surfaces a chip sits on (`softBorderSurfacePairs`), the plain divider on those
fills, and the decorative
dividers — including on the `secondary`, `hover`, `active` and `accent` fills a
bordered control paints, the `secondaryHover`/`secondaryActive` and
`accentHover`/`accentActive` steps it presses through, and on the `input` fill a
field sits on.
The default is the
level the theme declares, so a high-contrast theme is checked against 7:1 without
a second argument; naming a level asks a stricter question of a theme that does
not claim it. It returns one entry per missed pair, naming the two roles, the
pair class, the floor and the measured ratio. The selection wash is measured as
it paints, with both text roles each surface carries: the body role over
`compositeOver(selection, background)`, `card`, `muted`, `hover`, `active` and
`accent`; `popoverForeground` over `popover`; `inputForeground` over `input`; and
`selectedForeground` over `selected`; and `mutedForeground` on all nine surfaces
at the secondary floor — reported with `wash: "selection"`. `selectionPairs` is
the text list; it names both of a card's text roles, the default `foreground` and
`cardForeground`. The four status labels join it through `selectionStatusPairs`,
because `xText` is the role a status label, icon or dot paints on the four washes
a row uses, and a selectable row's label is dragged over with the copy around
it. An Alert, Badge or Toast is measured the same way:
`selectionSoftPairs` holds the tone's foreground, the body and the caption
through the wash and `selectionSoftWashPairs` the highlight's own perceivability
on the four soft fills. The wash itself is compared with each surface it paints
on, so a highlight that has become imperceptible is reported as well;
`selectionWashPairs` is that list.

Every exported pair list is held to content uniqueness: a repeated
`[foreground, background, class]` would make the checker report one composition
twice, so `contrast.test.ts` fails on it. Lists that measure the same roles
through a different wash — `selectionPairs` beside `contrastPairs`, for example
— are separate checks, not duplicates, so uniqueness is asserted inside each
list and never across them.

An invalid field is an error state, not a decoration: `FieldInput` paints a
`destructive` border over its `input` fill and the ColorPicker hex field over
the `background` canvas, so both are `boundary` pairs.
`invalid-field-edge.test.ts` holds them and the erased-error regression.

The modal scrim is measured the same way, because its job is to change the
surface beneath it: `overlayWashPairs` composites `overlay` over the surfaces a
dialog covers — `overlaySurfaces` is `background`, `card`, `muted`, `input`,
`selected`, `popover`, the four resting filled actions (`primary`, `secondary`,
`accent`, `destructive`) and the four soft status panels (`infoSoft`,
`successSoft`, `warningSoft`, `destructiveSoft`) — and holds the painted value
to the `surface` floor. A scrim that composites to its own surface is an
invisible modal backdrop; the audit found high-contrast dark's `#000000CC`
measured **1.000:1** on its pure black canvas, so the AAA dark theme now veils
with a 15% white wash (`#FFFFFF26`, 1.388:1) — a dark veil cannot darken black.
The failures are reported with `wash: "overlay"`. The transient pointer washes
(`hover`, `active`) and the filled families' `xHover`/`xActive` steps are
deliberately not scrim surfaces: the pointer leaves the row to reach the dialog,
so a scrim over a transient state is not a composition the system supports.
`selected`, `input`, the resting filled actions and the soft status panels are
not transient — a table, list or tree keeps a selected row while a modal opens
over it, every field in the layout behind a form dialog sits on the `input`
fill, the page's buttons keep their resting fills, and an Alert or Toast stays
on screen — so plans `359` and `375` measured them too. The gap was real: macOS
light's own `selected` fill used as `overlay` composited to **1.000:1** on a
selected row while the checker returned `[]`, because the four base surfaces all
passed. The tightest shipped pair is **1.075:1** (high-contrast dark, `overlay`
on `primary`), so no colour moves.

The inactive state has its own floor. `disabledForeground` is measured on the
thirteen surfaces an unavailable label paints — the `disabled` fill
(`inactivePairs`), the four plain surfaces, the `hover`/`active`/`accent`/
`selected` washes a disabled control inside a row sits on, and the four soft
status fills a Toast's or Alert's action sits on (`inactiveSoftPairs`;
`inactiveSurfaces` is the ordered list) — at 3:1, and at 4.5:1 in the
high-contrast themes. WCAG 1.4.3 exempts inactive components;
that exemption is not a licence to erase the state, because the point of an
unavailable control is that a reader can find out what is unavailable. A disabled
`Select` item paints this role straight onto the menu's `popover` with no fill
behind it, and measured **1.99:1** on Linux dark and 2.09:1 on the identity until
plan `306` moved the value. The `disabled` fill itself is deliberately not held
to a floor against the panel: no neutral can clear both a white card and the
quiet panel, so a disabled control keeps its shape with its `border` edge, which
is held to the divider floor on `disabled` and on the previously unmeasured
`muted` panel.

The parts are public too. `contrastRatio(foreground, background)` is the WCAG
ratio for opaque `#RRGGBB` values — `NaN` when a value does not parse, so a typo
can never pass — `compositeOver(colour, background)` composites a translucent
role onto an opaque one, and `contrastPairs` / `contrastFloors` are the data the
check and the test suite both read:

```ts
import { contrastFloors } from "@gpuixui/tokens";

contrastFloors.default; // { body: 7, secondary: 4.5, inactive: 3, boundary: 3, mark: 3, surface: 1.05, step: 1.05, divider: 1.05 }
contrastFloors.high; // { body: 7, secondary: 7, inactive: 4.5, boundary: 4.5, mark: 4.5, surface: 1.05, step: 1.05, divider: 3 }
```

The floors are the ones in [`design-system.md` §9](./design-system.md#9-accessibility).
This is a check for a consumer's own test suite, not a runtime validator.

#### Numeric metrics

A theme is more than its colours. `themeMetricFailures(theme)` holds the numbers
a component paints with — typography, spacing, radius, density, component
dimensions, elevation, motion, border widths, icon sizes and avatar sizes — to
the invariants those components rely on; it is the metric check
[`themeFailures`](#one-check) composes, and the one to run beside the colour
check when a copied platform style or brand theme changes a metric:

```ts
import { themeMetricFailures } from "@gpuixui/tokens";

themeMetricFailures(brandTheme); // [] when every metric is usable
```

The rules are breakage tests, not a house style. `borderWidth.strong` is the
focus ring's spread, and that zero-blur shadow is the only focus indicator the
runtime can draw, so a zero ring removes focus entirely — while
`themeContrastFailures` still returns `[]`, because the ring's colour is fine. A
type role's leading must not be shorter than its size; the two documented type
ladders (`proseLadder` and `codeLadder`) must not be inverted — a role below
another may not render larger — and `bodyStrong`, the weight variant of `body`,
may not shrink below it and must stay heavier, because an emphasis role the
reader cannot distinguish from body text is not emphasis; the smallest control
must fit one `label` line, the default `iconSize.md` and a field adornment, each
plus its two borders — the borders are painted inside the height, so a glyph
equal to the outer metric overflows the content box; a row must fit one `body`
line and the default `md` control it holds; `radius.none` must be square; `radius.full`
must round the largest radius and half of the taller of the largest control and
the largest avatar — a 40px avatar painted at a smaller radius is a rounded
square, not a circle; every named ladder — `spacing`, `radius`, `iconSize`,
`avatarSize`, `controlHeight`, `controlPaddingX` and the motion timings — must
not step backwards, and `iconSize` and `avatarSize` must also stay above zero,
because a named size that paints a 0×0 icon or avatar is not a size; a timing
must also be finite; a chip must fit inside the field's content box — the
minimum width less the field's two borders and its `controlPaddingX.md` padding —
because a chip equal to the outer width has no room for the chrome painted
inside it; an
overlay's `overlayMaxHeight` must fit one `density.rowHeight`, because a list
viewport shorter than a row clips every option; a cubic-bezier easing must be
four finite control points with both x values inside `0…1`, because the runtime
drops a transition it cannot interpolate; and an elevation level must hold a
shadow whose alpha is a fraction, because `alpha()` falls back to the opaque
tint on a value it cannot parse, and whose two offsets, blur and spread are
finite — a negative offset or spread is a direction, a `NaN` is a shadow the
renderer cannot paint. Every other numeric metric — a type size, leading or
weight, a border width, a density or dimension metric, an icon, avatar, radius or
spacing step, and every motion timing — must be a **finite** number too, because
the renderer casts each to a 32-bit float and an infinity becomes invalid layout
it paints as nothing, with no error. A weight is also held to `1…1000`: a zero,
a negative or a `NaN` selects no weight, so the text system has nothing to
paint. `radius` and the motion timings are
deliberately non-decreasing rather than strict: Linux and Windows ship
`radius.lg === radius.xl`, and Windows ships `motion.fast === motion.step`. An
empty elevation level is exempt — `elevation.overlay` ships reserved and empty —
but a level a consumer defines, `overlay` included, is held to the same rules,
because `elevationShadow` will paint it. Every shipped theme, platform variant
and recipe passes, so the check moves no value; it guards the next edit.

`metricGroups` is the ordered index of the ten governed groups, so a
documentation table or a settings row iterates it instead of retyping the names.
`metricRules` is the ordered index of the nine rules a `MetricFailure` can
carry, beside `metricGroups`, so a diagnostics table or a rule reference
iterates it instead of retyping the union.
A failure is a `MetricFailure`: the `MetricGroup`, the dotted `member`
(`controlHeight.sm`), the `MetricRule` it broke and both numbers — the `actual`
value and the `bound` it missed. A `MetricRule` is one of `positive`,
`non-negative`, `zero`, `finite`, `increasing`, `non-decreasing`, `at-least`,
`at-most` or `within`.

#### Colour format

The colour helpers parse one form: `isHexColor(value)` is true for `#RRGGBB`
and `#RRGGBBAA` and false for every other CSS colour. The runtime is broader —
GPUix delegates colour parsing to `csscolorparser`, so a name, `rgb(…)`, `hsl(…)`
or `#RGB` is paintable — but `alpha`, `compositeOver` and `contrastRatio` can
only read hex, and the theme is authored data in the package's own convention.
`themeColorFailures(theme)` walks all 66 `colorRoles` and returns the role and
the value of every entry outside that form:

```ts
import { extendTheme, getTheme, themeColorFailures } from "@gpuixui/tokens";

const tinted = extendTheme(getTheme("light"), { colors: { shadow: "black" } });

themeColorFailures(tinted); // [{ role: "shadow", value: "black" }]
```

This is the third check in the editable-theme guarantee. A measured role in a
non-hex form also fails the contrast check, because `contrastRatio` returns
`NaN`, which never passes a floor; the tint roles have no pair. `shadow` is
applied to every elevation level through `alpha()` (plan `085`), and an
unparseable tint is returned unchanged, so `shadow: "black"` painted a **fully
opaque** shadow at every level — the shipped 0.08, 0.12 and 0.16 alphas gone —
while both other checks returned `[]`. `#000` and `rgb(0 0 0)` behave the same
way. Every shipped identity theme, platform variant and recipe is hex, so the
check moves no value; it guards the next edit. `isHexColor` is the predicate for
one value, for a boundary that receives a role from storage, a URL or a payload:

```ts
import { isHexColor } from "@gpuixui/tokens";

isHexColor("#191D25"); // true
isHexColor("rebeccapurple"); // false
```

No runtime schema: themes authored in TypeScript are trusted at compile time.
A theme loaded from a file or URL is unknown input and must be decoded by the
application that owns that boundary; `isHexColor` and `themeColorFailures` close
the format half of that guard, not the shape half.

#### Typeface

The two families a theme carries — `typography.sans` and `typography.mono` — are
painted as `StyleDesc.fontFamily`. GPUix 0.10.0's `StyleDesc.fontFamily` is
**one** string, not a CSS stack, and GPUI resolves it by name: a family the
machine does not have **falls back silently** to the system face. That makes the
family names the one documented form no measurement can see — an edited theme
paints a different typeface, not a broken contrast ratio.

`themeTypefaceFailures(theme)` holds both fields to two rules, listed in
`typefaceRules` and checked in `typefaceRoles` order:

| Rule | What it catches |
| ---- | --------------- |
| `non-empty` | A family that is empty or whitespace-only names nothing. |
| `single-family` | A comma list — `"Inter, system-ui, sans-serif"` — is one string to the runtime, so it names a family no machine has. |

```ts
import { extendTheme, getTheme, themeTypefaceFailures } from "@gpuixui/tokens";

const stacked = extendTheme(getTheme("light"), {
  typography: { sans: "Inter, system-ui, sans-serif" },
});

themeTypefaceFailures(stacked);
// [{ role: "sans", rule: "single-family", value: "Inter, system-ui, sans-serif" }]
```

A `TypefaceFailure` carries the `role` (`sans` or `mono`), the `rule` it broke
and the `value` the theme carried. A name with spaces inside it —
`Helvetica Neue` — is one family and passes, and the `.SystemUIFont` sentinel
every shipped theme uses passes too. The check does not ask whether the machine
has the face, because the package cannot know: it holds the form, and the type
facts above already state that an unknown family falls back silently.

Every shipped identity theme, platform variant and recipe passes, so no family
moves; `platforms.test.ts` already holds the shipped platform table to the same
single-family rule. The executed example is
[`src/typeface.example.ts`](../packages/tokens/src/typeface.example.ts).

#### One check

Running one of the four checks is not the guarantee. A copied theme whose only
defect is a zero `borderWidth.strong` — the focus ring's spread, and the only
focus indicator the runtime can draw — a `shadow: "black"` tint, which makes
every elevation level fully opaque, or a `sans: "Inter, system-ui, sans-serif"`
stack, which silently paints the system face, returns `[]` from
`themeContrastFailures` while being unusable. `themeFailures(theme, contrast =
theme.contrast)` composes all four and tags each entry with the check that found
it:

```ts
import { extendTheme, getTheme, themeFailures } from "@gpuixui/tokens";

const theme = extendTheme(getTheme("dark"), {
  colors: { shadow: "black" },
  typography: { sans: "Inter, system-ui, sans-serif" },
  borderWidth: { strong: 0 },
});

themeFailures(theme);
// [ { kind: "color", … }, { kind: "typeface", … }, { kind: "metric", … } ]
```

The order is diagnostic: the two format checks first — `color`, then `typeface`,
so a malformed role is named before the `NaN` ratios it causes and a malformed
family before the type scale painted with it — then `contrast`, then `metric`. A
`ThemeFailure` is the underlying `ColorFailure`, `TypefaceFailure`,
`ContrastFailure` or `MetricFailure` — the same payload the individual check
returns — plus its `kind`. The `contrast` argument
defaults to the level the theme declares and reaches the contrast half unchanged,
so `themeFailures(theme, "high")` asks a stricter question of a theme that does
not claim AAA floors. A consumer's test is one assertion:

```ts
import { themeFailures } from "@gpuixui/tokens";

expect(themeFailures(brandTheme)).toEqual([]);
```

Every shipped identity theme, platform variant and recipe returns `[]`. The
executed example is
[`src/theme-check.example.ts`](../packages/tokens/src/theme-check.example.ts).

The role and shadow sets behind the shipped themes are exported as
`lightColors`, `darkColors`, `highContrastLightColors`,
`highContrastDarkColors`, `lightElevation` and `darkElevation`. They are the
objects each theme points at, exported for tooling and table generation;
component source reads `theme.colors` and `theme.elevation`, never a fixed set. A
consumer theme may share an untouched set or replace it through `extendTheme`.
An elevation level is geometry plus an alpha, so a replaced level composes with
the theme's `colors.shadow` tint like a shipped one.

## React binding

```tsx
import { getTheme, type ThemeMode } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";
import { useState } from "react";

export function App() {
  const [mode, setMode] = useState<ThemeMode>("dark");
  return (
    <ThemeProvider theme={getTheme(mode)}>
      <div
        onClick={() => setMode(mode === "dark" ? "light" : "dark")}
        style={{ cursor: "pointer" }}
      >
        <text>Switch theme</text>
      </div>
    </ThemeProvider>
  );
}
```

`useTheme()` reads the nearest provider. Nested providers scope a brand theme to
a subtree. Without a provider it returns `lightTheme`. GPUix exposes no OS
appearance query, so the application owns the mode switch.

The React entry builds its provider with `createElement` and contains no JSX.
TypeScript compiles JSX with the consumer's `jsxImportSource`, so a GPUix app
would otherwise need `@gpuix/react/jsx-runtime` to type-check this package — a
module the tokens package must not depend on. No `paths` shim is required.

## Using tokens in components

Rules:

1. Import roles, type roles and scales from `@gpuixui/tokens`.
2. Never write a literal colour, font size, radius, control height or padding.
3. Spread `textStyle` rather than repeating the family rule.
4. Use `borderStrong` for essential control boundaries and `border` for
   dividers.
5. Focus is `focusRing(theme)`: a zero-offset, zero-blur `boxShadow` spread by
   `borderWidth.strong`. The runtime has no `outline*` and no `focusVisible`, so
   the ring is never a border and never changes layout. See [Focus](#focus).
6. A filled control reads its resting, hover and pressed fills from
   `filledControl(theme, family)`; never composite `alpha(fill, …)` for a state.
7. Text paints a foreground role: `foreground`/`mutedForeground`, the surface's
   own `*Foreground` (`cardForeground`, `popoverForeground`,
   `selectedForeground`, `accentForeground`, a family's `xForeground`), a tone's
   `xText` through `statusTone`, or `primaryText` for a link. A solid fill
   (`primary`, `success`, `warning`, `destructive`) is a surface, never a label
   colour — the light `success` fill barely clears the secondary floor on a card,
   and a platform style can take it below.

```tsx
const theme = useTheme();

<div
  style={{
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: theme.borderWidth.thin,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
  }}
>
  <text style={{ ...textStyle(theme, "label"), color: theme.colors.foreground }}>
    Ready
  </text>
</div>;
```

## For documentation sites

A docs site can generate its tables from the package instead of retyping values.
Import the core entry only: it is pure data with no runtime dependency, and the
site never needs `@gpuixui/tokens/react`.

`colorRoles` lists every semantic role in documentation order, typed as
`keyof ThemeColors`, so a table row can read any shipped theme without a cast:

```ts
import { colorRoles, highContrastThemes, themes } from "@gpuixui/tokens";

const rows = colorRoles.map((role) => ({
  role,
  light: themes.light.colors[role],
  dark: themes.dark.colors[role],
  highContrastLight: highContrastThemes.light.colors[role],
  highContrastDark: highContrastThemes.dark.colors[role],
}));
```

The other groups are already plain data with their own keys: `spacing`,
`radius`, `densityNames`, `densityPresets`, `borderWidth`, `iconSize` and
`palette`. `densityNames` is the order to render; `densityPresets` holds the
metrics.

`textRoles` does the same for type: it lists the ten typographic roles in
documentation order and excludes the `sans` and `mono` families, so a type table
is generated without a cast:

```ts
import { textRoles, typography } from "@gpuixui/tokens";

const rows = textRoles.map((role) => ({ role, ...typography[role] }));
```

`statusTones` and `platformNames` index the remaining catalogues: the four status
families in documentation order, and the four platform variants in toggle order
(macOS · Linux · Windows · Default). `filledControlFamilies` indexes the four
filled control families. A docs table or a platform toggle iterates
them instead of retyping names, and parses its `platform` parameter with
`isPlatformName`, so a stale or hand-edited URL falls back to the default rather
than an invalid theme.

## Verification

Contrast is enforced by the `@gpuixui/tokens` suite:

```sh
nub run --filter @gpuixui/tokens test
```

The test covers every shipped colour set — light, dark and both high-contrast
variants — and fails if a semantic text/surface pair drops below its floor (7:1
for primary body pairs, typed input text, soft status text and all high-contrast
text; 4.5:1 for secondary and on-colour text in the default themes, including
text on a hovered or pressed filled action, ghost text on the `hover` and `active` washes,
muted text on `background`, `card`, `popover`, the `input` fill a field
paints for its own chrome and the four soft status fills a status panel's
caption sits on, secondary text on the `hover`, `active`, `accent`
and `selected` washes a row paints behind a description, and status text (`xText`) on `background`, `card`, `popover`, the `muted` panel and those four washes;
3:1 for focus and essential boundaries, including the `destructive` ring an
invalid control paints, in the default themes; 4.5:1 for them in the
high-contrast variants; and 3:1 for an inactive label, raised to 4.5:1 at
high contrast). The inactive floor is new in plan `306`: `inactivePairs`
measures `disabledForeground` on its own fill, the plain surfaces, the four row
washes and the four soft status fills a Toast's or Alert's action sits on
(plan `307`), because a disabled `Select` item paints it on the menu's `popover`
with no fill behind it and measured 1.99:1 on Linux dark. The `disabled` fill
stays near the panel by design, so a disabled control's shape is carried by its
`border` edge — held to the divider floor on `disabled`, and on the `muted` panel
a settings sidebar divides (plan `306`).
A step is measured too: each filled family's `xHover` is held one 1.05:1 step
from its `x` and its `xActive` from its `xHover` (`stateStepPairs`), and the
generic `hover`/`active` ladder that a ghost or outline control paints is held
the same way (`washStepPairs`, `active` from `hover`). Every shipped set clears
both ladders, so the floors guard an edited theme rather than a shipped value.
The boundary is also measured on the `muted` panel,
the four washes and the four soft status fills, because an unchecked checkbox or
a field keeps its `borderStrong` edge while the row moves or inside an Alert.
It also fails if a soft status surface is indistinguishable from `background`,
`card`, `popover` or the `muted` quiet panel (floor 1.05:1) — a status badge or
small Alert in a sidebar sat at 1.023:1 on Linux light, 1.036:1 on macOS light
and 1.043:1 on Windows light until plan `300` moved the four light tints one step
deeper — or if a loading skeleton is indistinguishable
on any surface or row wash it fills (also 1.05:1), if a decorative `border` is imperceptible on
those surfaces, on the `secondary`, `secondaryHover`, `secondaryActive`, `hover`,
`active`, `accent`, `accentHover` and `accentActive` fills a bordered control
paints, on the `selected` fill an outline action sits on in a selected row, or
on the four soft status fills a status panel
divides (1.05:1, and 3:1 at high contrast), or if body text over
the composited `selection` wash drops below its body floor on any surface a glyph
is selected on — `background`, `card`, `muted`, `hover`, `active`, `accent`,
`popover` and `input`, with the selected row at the secondary floor.
The audit found four: the inherited `successSoft` (`#0C452D`) measured 1.015:1
on Windows dark, 1.023:1 on the identity and 1.047:1 on Linux dark, and identity
dark's `destructiveSoft` (`#6B1A1D`) 1.040:1, under the 1.05:1 divider floor.
The two soft fills move one step darker and keep the surface floor on every
canvas.
Each soft surface also has a role for its edge (`xSoftBorder`), held to the
divider floor on that fill and on the eight surfaces a chip sits on —
`background`, `card` and `popover`, the `muted` panel and the four row washes —
so the shape a badge shows is measured where it is painted; the light warning
edge measured 1.036:1 on the macOS light pressed wash and 1.042:1 on the Linux
light one until plan `308` moved it, and the 30% mixture it replaced measured
1.12:1 on the high-contrast light `warning` surface, under the 3:1 that theme
requires.
A loading skeleton is a surface too: it is held to 1.05:1 against `background`,
`card`, `popover`, `muted`, `hover`, `active`, `accent` and `selected`, so a
placeholder never disappears into the card it fills or the row it sits in. The
`accent` wash is the fill a selectable list row paints on hover, and a
placeholder row has no designed edge to keep its shape if the fill matches. The
audit found the placeholder was the `active` fill in the identity and
high-contrast themes, so a pressed loading row erased the placeholder (1.000:1);
the light and dark skeleton moved one ramp step away, and each dark platform
style carries its own.
Brand-toned text is checked on the eight surfaces a link paints —
`background`, `card`, `popover`, `muted`, the `hover`/`active` washes and the
`accent`/`selected` fills a selectable row paints — and on the four soft status
fills a link in a status panel sits on
(`softPanelTextPairs`), so a platform accent cannot
ship as an unreadable link: the audit found macOS light at 4.21:1 on its
canvas and 3.44:1 on the pressed wash, macOS dark at 2.84:1 on `active`, and
high-contrast dark at 6.94:1 under its 7:1 floor. The two row fills were added
by plan `314`; the tightest shipped pair is `primaryText` on `selected` at
**4.53:1** (Linux dark), and the soft fills are tightest at
`primaryText` on `destructiveSoft` at **5.26:1** (Windows light), so no value
moves.
Every platform variant is checked on its own canvas, not the identity's, so a
style that moves `background` or `card` is held to the status tints and skeleton
it inherits. The same loop holds secondary text on each variant's washes: macOS
dark shipped at 4.41:1 on `hover` and 3.55:1 on `active` until plan `079` moved
its secondary grey and pressed wash. A status panel's caption is checked on the
four soft status fills too (`softPanelTextPairs`), tightest at
`mutedForeground` on `destructiveSoft` at **6.61:1** (Aero light), so no value
moves. The control edge is held there too: four
shipped sets had `border` equal to the fill it sits on (identity light `active`,
identity dark `secondary`/`active`/`accent`, macOS dark `hover`/`secondary`/
`accent`, and high-contrast dark's `active` at 2.53:1 under the AAA floor), so
an outlined control's edge disappeared exactly while pressed; plan `080` moved
the four dividers. The same defect returned one role generation later: plan `097`
gave the neutral family `secondaryHover`/`secondaryActive`, the fills a bordered
secondary control now paints, but the edge was still measured on the pre-097
list. macOS light and Windows light shipped their pressed fill *as* the divider
(**1.000:1**) and Linux light at **1.009:1**, while the AAA sets, whose divider
floor is 3:1, measured 2.31:1 (light) and 2.57:1 (dark). The two fills join the
divider class; the three light pressed steps move one designed step and the two
AAA dividers move away from their neutral ladder (`#575E6B` light, `#A0A0A0`
dark). The selection wash is held there too: high-contrast dark
shipped at 6.48:1 on `hover` and 5.49:1 on `active`, Linux dark at 6.92:1 and
Windows dark at 6.84:1 on `active`, under the body floor a selected glyph needs;
plan `081` darkened those three wash bases. Status text is held to the same
washes: every light set had a warning label below its floor on the pressed fill
— macOS 4.22:1, Linux 4.24:1, Windows 4.36:1 — and high-contrast light shipped
at 5.83:1 on `active` and 6.70:1 on `accent`/`selected`, so plan `083` moved the
light `warningText` to `#6B4500` and the high-contrast one to `#4B3100`. The
functional control boundary is held to them too: a checkbox edge in a pressed
row measured 2.52:1 on macOS light and 2.62:1 on the identity, 2.80–2.81 in the
dark identity and 4.15:1 at high-contrast dark, so plan `084` moved five
boundary values one step. It is also held on the four soft status fills a
control sits in. The audit found three: identity dark's `borderStrong`
(`#77808F`) measured 2.77:1 on `successSoft`, 2.94:1 on `destructiveSoft` and
2.97:1 on `infoSoft`, under the 3:1 boundary floor, while every other shipped
set cleared it. The edge is now `#868FA0`, which clears the floor on all four
soft fills. Palette edits must keep it green.

Default body text is measured on `background`, `card`, the `muted` panel,
`popover`, the `hover`/`active`/`accent`/`selected` washes and the four soft
status fills an Alert's description and ghost dismiss control paint
(`infoSoft`, `successSoft`, `warningSoft`, `destructiveSoft`); typed text is
`inputForeground` on the `input` fill and on the four `Surface` tones a
transparent field can sit on (`background`, `card`, `popover`, `muted`), the same
set the placeholder is measured on. The placeholder is held to the same secondary floor
on the `input` fill and on all four `Surface` tones a transparent field can sit
on (`background`, `card`, `muted`, `popover`); a field on a row wash and a
disabled field are deliberately out of scope — the latter reads
`disabledForeground`, which plan `306` measures — and identity dark `#7C8595`
measured 4.03:1 on the quiet panel and the floating surface until plan `317`
moved it to `#858F9F`. The panel and the floating surface are not
academic: an avatar's fallback initials sit on `muted`, and a date picker's month
header sits on its `popover`. The row washes are not either: a selectable list
row paints `accent` on hover and `selected` when selected, and its title is
`foreground` on both — a `ListItemTitle` sets its own colour, so it overrides
the `selectedForeground` the row inherits. Every pair clears the body floor with
margin in every shipped set, so no value moves; the pairs exist so an edited
theme cannot break them silently.

The other row text roles have their own pairs. A menu row paints
`popoverForeground` on `hover`/`active`, a selected `Select` option paints it on
`selected` — the shipped `selectItemStyle` keeps the menu foreground when the row
fills — and a selected row under the pointer keeps its inherited
`selectedForeground` on `accent`, `hover` and `active`; all three take the
secondary floor, matching `selectedForeground` on `selected`. The `accent` fill
is the one a selectable `ListItem` paints on hover, so it is a composition the
list API invites, not a spare surface. The tightest shipped values are
`foreground` on `selected` at **7.47:1** (Linux dark),
`popoverForeground` on `selected` at **7.95:1** (Linux dark),
`selectedForeground` on `active` at **6.22:1** (macOS light) and
`selectedForeground` on `accent` at **6.93:1** (macOS light), so no colour moves.
A text field's edge is `border` on its own `input` fill, measured at the divider
floor; the weakest shipped set is Linux dark at **1.25:1**, above the 1.05:1
floor. The pressed edge is `ring` on the same `input` fill, and the hover edge is
`borderStrong` there, both at the boundary floor (plan `343`). These seven pairs
take `contrastPairs` from 232 to 239; plan `314` adds
the selected option, the sidebar status label and the row link, plan `315` adds
typed text on the canvas field, plan `316` adds the `accent` fill a selected
row inherits its label on, and plan `317` adds the placeholder on the four
`Surface` tones, taking the contract from 248 to 252. Plan `318` adds the neutral
family's designed hover and press to the control edge, taking it from 252 to
**254**, and plan `319` adds typed text on the same four `Surface` tones as the
placeholder, taking it from 254 to **257**. Plan `320` adds default body text on
the four soft status fills an Alert paints, taking it from 257 to **261**. Plan
`322` adds the `accent` wash a selectable row hovers to the skeleton surfaces,
taking it from 261 to **262**. Plan `325` adds the invalid field edge
(`destructive` on the `input` fill and on the `background` canvas a transparent
field paints), taking it from 262 to **264**. Plan `327` adds the accent family's
designed hover and press to the fill, on-colour and control-edge contracts,
taking it from 264 to **276**. Plan `332` adds the graphic-mark pairs — the
brand, success and destructive fills as bars and glyphs on `background`, `card`,
`popover` and `muted`, and the slider thumb's ring on its `input` fill — taking
it from 276 to **290**. Plan `334` adds the secondary control's label on the
generic `hover`/`active` washes the shipped Button paints, taking it from 290 to
**292**. Plan `335` adds the control edge on the `selected` fill an outline
action sits on in a selected row, taking it from 292 to **293**. Plan `339` adds
secondary text on the `input` fill a field paints for its own chrome, taking it
from 293 to **294**. Plan `340` holds the invalid control's `destructive` focus
ring on the eleven surfaces the ring adds — `background` is already the field
edge — taking it from 294 to **305**. Plan `341` adds the combobox check glyph on
the `hover` row wash, taking it from 305 to **306**. Plan `342` publishes the
filled families' step floor — each `xHover` one perceivable step from its `x`,
each `xActive` from its `xHover` — taking it from 306 to **314**. Plan `343`
holds the field's pressed edge — `ring` on the `input` fill — taking it from 314
to **315**. Plan `344` adds the inverse selection veil for content painted on a
filled action — `selectionOnFill` on `primary`/`secondary`/`destructive` — as six
wash pairs beside the plain `contrastPairs` list; plan `382` derives both fill
lists from `filledControlFamilies`, so the fourth family (`accent`) brings the
selection-contract total to **eight** pairs. Plan `346` holds a status
panel's caption and link — `mutedForeground` and `primaryText` on the four soft
status fills — taking it from 315 to **323**. Plan `347` adds the value
indicator's groove — `track` on the four base surfaces and the persistent
`accent`/`selected` fills, with the four progress fills as marks on it — taking
it from 323 to **333**. Plan `348` holds the soft tone foreground a Toast paints
on its floating card — the four `xSoftForeground` roles on `popover` — taking it
from 333 to **337**. Plan `357` publishes the generic wash ladder — `active` one
perceivable step from `hover`, the ghost and outline press — taking it from 337
to **338**. Plan `362` adds a status panel's body (`foreground`) and caption
(`mutedForeground`) to `selectionSoftPairs`, beside the plain `contrastPairs`
list — the soft list grows from 4 to **12** and the plain count stays **338**;
the tightest new pairs are **7.26:1** (identity dark, `infoSoft`) and
**4.78:1** (Aero light, `destructiveSoft`), so no colour moves. Plan `363` adds
the card's own `cardForeground` to `selectionPairs` (18 → 19) beside the default
`foreground`, because the two are apart in both Windows recipes and only the
default role was measured through the wash; Windows dark is the tightest at
**9.07:1**, so no colour moves and the plain `contrastPairs` count stays **338**.
Plan `366` adds the four status text roles through the selection wash on the
nine surfaces — `selectionStatusPairs`, 36 pairs — because `xText` is the role a
status label in a selectable row paints and the label is dragged over with the
copy around it; XP light `successText` measured 3.671:1 on `active` and every
high-contrast light tone 6.12–6.72:1 under 7:1, so the six light status roles
move one half-step between the ramp steps they used. The tightest pair is
**4.584:1** (XP light `infoText` on `selected`) and **7.370:1** at AAA (identity
light high `warningText` on `active`); the plain `contrastPairs` count stays
**338**.

A status label or indicator dot in a sidebar is measured on the `muted` quiet
panel — the surface plans `300` and `309` made first class — as well as on the
four row washes plan `083` covered, so a warning dot in a settings sidebar has a
pair. The tightest shipped value is `successText` on `muted` at **7.68:1**
(Aero light), above the 4.5:1 secondary floor.

The filled-control states are designed roles, not alpha composites. Before plan
`097` a consumer painted `alpha(primary, 0.9)` for hover and `alpha(primary, 0.8)`
for press, so the state took its colour from whatever sat behind the button: the
light primary's hover came out *lighter* than its resting fill and its press
lighter still, while the neutral secondary fill's hover moved 1.009:1 — a 1–2
RGB change that no pointer user can see. Each filled family now steps through
`x` → `xHover` → `xActive` with opaque, editable values; the on-colour foreground
is held to the secondary floor on all three steps in every shipped theme, and
`filled-states.test.ts` proves the direction follows the mode — darker in light,
lighter in dark — and the same step is a public pair: `stateStepPairs` holds each
`xHover` to 1.05:1 from its `x` and each `xActive` from its `xHover` under the
`step` class, so an edited theme that collapses a pointer state is reported
instead of returning `[]` (plan `342`). The outlined neutral family keeps its
`border` edge on all three
steps, so a press changes the fill without erasing the edge: the
divider contract covers `secondary`, `secondaryHover` and `secondaryActive`. A
consumer that has not migrated still paints the generic washes: the shipped
secondary Button in `components` keeps `secondaryForeground` while the fill
becomes `hover` or `active`, so both pairs are measured as well. They clear the
secondary floor in every shipped set — **10.42:1** on `hover` (macOS dark) and
**9.44:1** on `active` (Linux dark) at the tightest — and the designed family
remains the preferred state (plan `334`).

A selectable row is the same story one state further: it paints `accent` under
the pointer and keeps `selected` once chosen, so `selected` must be a perceivable
step past the hover wash or the click changes nothing. In the identity (both
modes, both contrast levels) and macOS light the two roles were the **same
value**, and Windows light, macOS dark and XP light sat under the 1.05:1 step
floor — hovering one row looked like selecting another. `selectionStepPairs`
publishes the `selected`/`accent` pair under the same `step` class the filled
families and the wash ladder use, eight shipped sets move `selected` one designed
step (plus the authored Contoso light style), and macOS light's
`selectedForeground` moves with its deeper fill because no step that cleared the
pair kept the old blue at 4.5:1. The measurement is in `selection-states.test.ts`, and the pair
is part of the plain contract — taking it from 338 to **339** (plan `381`).

The filled-family selection veil is derived from the same index that defines
the families, so no family can ship without one. The audit that made the lists
`filledControlFamilies.map(…)` found the fourth family's label below its floor
through the veil — **4.140:1** on macOS light and **4.430:1** on Linux dark,
under the 4.5:1 the on-colour role has — while the empty pair list meant
`themeContrastFailures` returned `[]`. The macOS light and Linux dark accent
foregrounds move one designed step, and the wash and text lists now publish
**eight** pairs between them (plan `382`; `selection-on-fill.test.ts`).

The two shipped consumers have not migrated their **brand** families, and the
cost is the label rather than the fill. `components/internal/button.tsx` still
hovers a primary and a destructive action at `alpha(fill, 0.5)` (its comment
says tokens ship no `primaryHover`, which has not been true since plan `055`),
and `primitives/src/core/variants.ts` hovers and presses at
`alpha(fill, 0.9)` / `alpha(fill, 0.8)`. A translucent fill takes its colour
from the surface behind the control while the label was designed for the opaque
fill, so the label falls under the 4.5:1 on-colour floor every designed step
clears: the primary label measures **2.06:1** (Linux light, card) at 50%,
**4.02:1** (macOS light, card) at 90% and **3.40:1** (Linux light, card) at
80%, and the destructive label **2.24:1** (identity light, card) at 50%,
**4.43:1** (identity light, card) at 90% and **3.75:1** (identity light, card)
at 80%. The 50% case is past repair in the palette: even a black fill tinted at
50% over a white card carries white text at only **4.00:1**. The fix is the
designed step, and the package makes it one call:

```ts
import { filledControl } from "@gpuixui/tokens";

const states = filledControl(theme, "primary");
// states.background / .hover / .active are the designed fills;
// states.foreground is the one label colour readable on all three.
```

`filledControlFamilies` is the ordered index — `primary`, `secondary`,
`destructive`, `accent` — and `FilledControlFamily` derives from it, so a
consumer that paints a filled state reads the family it already names instead of
compositing an alpha fill. `filled-control.test.ts` proves both directions on
every shipped set: the designed trio clears the on-colour floor on all three
steps, and the alpha composition fails it.

The accent family completes the matrix (plan `327`). A toggle that is on paints
`accent` with `accentForeground`; before `accentHover` and `accentActive`
existed, the only way to show a pointer state was
`alpha(accent, 0.9)` / `alpha(accent, 0.8)`, the same defect one family over —
the composite took its colour from the backdrop, moved *toward* the canvas in
dark mode, could not be tuned in a copied platform style and had no pair the
contract could check. The family now steps through its own designed values, and
an outlined toggle keeps its `border` edge on both, so the edge's divider
contract covers `accent`, `accentHover` and `accentActive` as well.

An interactive fill is a surface too. `stateFillSurfacePairs` holds the fifteen
fills a control or row paints as its own shape — the `hover` and `active` washes,
the `accent` family at rest, hover and press, `selected`, and the `primary`,
`secondary` and `destructive` families at rest, hover and press — to the 1.05:1
surface floor on the four
surfaces they paint on: `background`, `card`, `popover` and the quiet `muted`
panel. `stateFillRoles` is the fill list and `stateFillSurfaces` the surface
list, so a fifth surface or a new filled family joins one place. The audit found
21 shipped pairs under the floor: the identity light `muted`, `hover` and
`secondary` were the same value (`#EEF1F5`), so a sidebar row had no hover
feedback, a secondary button had no shape and a selected row was invisible; the
identity dark `hover` was its `muted` and `popover`, so a menu item did not react
to the pointer; macOS light `selected` measured 1.021:1 on its own canvas,
Windows light `secondary` was its panel and Linux light `accent` 1.001:1 on it;
the AAA dark `accent` sat 1.034:1 from the quiet panel. Rather than darkening
five shared washes that already sit within 1.05:1 of the control `border` edge
and the `secondaryHover`/`secondaryActive` steps, the light quiet panel moves one
step toward the card (`#FBFCFD` in the identity, `#F7F7FA` on macOS, `#FBFBFA`
on Linux and `#F7F7F7` on Windows), which keeps every wash, edge, ring and text
pair on it above its floor. The two light accents the canvas also failed move one
step (`#D9EAFD` on macOS, `#DCEBF8` on Windows); the identity dark `hover`
becomes a designed step between the 850 panel and the 800 press (`#262C36`) and
the AAA dark accent lightens to `#251B5C`, so a selected row is perceivable on
the AAA panel and popover. Light mode therefore layers canvas → quiet panel →
card, a deliberate decision rather than an accident.

Each filled family also has a **step** floor. The three fills are designed to
walk `x` → `xHover` → `xActive`, and a step that is not perceivable is not a
state: `stateStepPairs` holds `xHover` to 1.05:1 from `x` and `xActive` from
`xHover`, for `primary`, `secondary`, `destructive` and `accent`, under the
`step` pair class. The floor is the same at every contrast level, because a
pointer state is not text. The shipped themes were already held to it by
`filled-states.test.ts`, which iterates them; the pairs publish the rule, so an
edited theme whose hover equals its fill is reported with `pairClass: "step"`
instead of returning `[]`.

The generic washes are a ladder too. A ghost or outline control paints no fill at
rest, the `hover` wash under the pointer and the `active` wash while pressed, and
the shipped secondary control still paints that pair while it migrates to the
designed family. `washStepPairs` holds `active` to 1.05:1 from `hover` under the
same `step` class, so an edited theme that sets them equal is reported instead of
returning `[]`. Every shipped set already clears the floor — identity dark is
tightest at **1.059:1** — so no colour moves. The audit also found two shipped
compositions on the *wrong* role pair: a secondary control whose `hover` is its
own resting `secondary` fill (the same value in 19 of the 24 shipped sets), and a
selectable row that presses to the neutral `active` while it hovers to `accent`
(1.004:1 in identity dark). Both use a designed family instead — `secondaryHover`
and `accentActive` — and are recorded in `TODO.md` rather than blessed as pairs.

A solid role painted as a **mark** is held to 3:1 (4.5:1 at AAA) instead: a
progress segment and a slider fill sit on the `track` groove, a slider thumb rings
its own `input` fill, and a rating star, combobox check or timeline dot sits on
the panel it paints on — a selected combobox option's check also sits on the
`hover` wash the row highlights with, so it is measured there too — `markRoles`
is the role list and `markPairs` the pairs.
A fill's 1.05:1 is a wash's floor: it says a hover is visible, not that a 4px bar
is. A status indicator is not a mark: the solid `warning` is **1.78:1** on the
light canvas, so a status dot uses `xText`, which the status-text pairs already
measure.

A value indicator's unfilled groove is a role of its own (plan `347`).
`Progress`, `Meter` and `Slider` painted it with `muted` — a surface role:
identity dark's `muted` is its `popover`, and every platform dark style's
`muted` is its `card` and `popover`, all at **1.000:1**. An indeterminate
progress bar is *only* its track (the fill is zero-width), so it painted nothing
on a dark card, and a slider's unfilled span had no shape. `muted` cannot become
a fill — plan `309` tuned it as the panel ladder — `border` is a line role
(`primary` measures 1.432:1 on the AAA divider) and `active` is a pressed wash
(`primary` measures 2.84:1 on macOS dark), so `track` is a designed neutral step
in each palette: `#DBDFE5` light and `#323945` dark in the identity, one value
per platform style, and `#C6C8CD`/`#3A3A3A` at high contrast. It is measured on
the four base surfaces and the persistent `accent`/`selected` row fills at
1.05:1 (`trackSurfacePairs`), and `primary`, `success`, `destructive` and
`mutedForeground` — the four `PROGRESS_TONES` — on the groove at the mark floor
(`trackMarkPairs`). The momentary `hover`/`active` washes are out of scope: the
filled part still carries the value while the pointer is down, and XP light has
no track that clears both the 1.05:1 wash floor and the 3:1 mark floor at once.
The tightest shipped pairs are identity light `track` on its `selected` fill at
**1.06:1** and Aero light `success` on the groove at **3.15:1**. `primitives`
still paints `muted`; the migration is recorded in `TODO.md`.

Elevation is held by `elevation.test.ts` and `elevation-tint.test.ts`: a stored
level is geometry plus an alpha and paints exactly the runtime's five fields, and
editing `colors.shadow` retints all three levels. Before plan `085` each level
carried its own complete colour, so the documented tint changed nothing and the
same value was duplicated three times per set; the split keeps every shipped hex
byte-for-byte.

The focus ring is measured on the eight surfaces a focused control can sit on —
the canvas, card and popover, the `muted` panel a sidebar control sits on, the
`accent` wash a selectable row paints, and the `hover`, `active` and `selected`
washes — because focus and selection co-occur in rows. It is also measured on the
four soft status fills, because a Toast's action button is focused while it sits
on its own tint; every shipped variant already clears the floor there, so no
colour moves, and the pairs exist so an edited theme cannot remove the ring. A
field's own `input` fill
and a control's `secondary` fill are what the focus shadow surrounds, not what
it sits on, so they are not `ringSurfaces`. The ring role has one other job: a
pressed field repaints its border with `ring` on its own `input` fill, the way
hover repaints it with `borderStrong`, so that control edge is a `boundary` pair
(`fieldPressedEdgePairs`, plan `343`). `ringSurfaces` in
`src/contrast.ts` is the one list, and `ring-surfaces.test.ts` holds the public
check to it. Secondary text is measured on `hover`, `active`, `accent` and
`selected`, because a list row, a combobox option and a menu item paint those
washes behind a description; status text (`xText`) is measured on `background`,
`card`, `popover`, the `muted` panel and those four washes, so a status label or
indicator dot in a sidebar, a hovered, pressed or selected row or a dialog is
covered; the `borderStrong` boundary is measured on
`popover`, the `muted` panel and those four washes, so a checkbox or field in a
quiet panel, a hovered, pressed, selectable or selected row still shows its edge.
It is also measured on the four soft status fills, because an Alert or Toast
carries actions — a field, a don't-show-again checkbox — whose edge must stay
visible.
Text selection is measured in both directions: `selectionPairs` holds the body
role each surface uses and `mutedForeground` on all nine `selectionSurfaces` to
their floors, and `selectionWashPairs` holds the wash itself to the 1.05:1
perceivability floor on each, because a highlight can be readable and still be
invisible. Windows dark and both high-contrast sets already cleared the secondary
floor through the wash; the other seven moved their secondary grey one step away
from the canvas (plan `087`). The four soft status surfaces are measured the same
way: `selectionSoftPairs` holds the tone's `xSoftForeground`, the body
`foreground` and the caption `mutedForeground` to their floors through the wash,
and `selectionSoftWashPairs` the wash to 1.05:1, after identity light
`successSoftForeground` measured 5.83:1 and Windows dark's wash over
`destructiveSoft` 1.005:1 (plan `091`). Every shipped set clears the two roles
added in plan `362` — the identity dark body on `infoSoft` at **7.26:1** and Aero
light's caption on `destructiveSoft` at **4.78:1** at the tightest — so a status
panel now keeps its description and its caption selected on any platform, and
accent-toned text stays the documented omission. The card's own
`cardForeground` is measured beside the default `foreground` (plan `363`), so a
theme whose card text is readable at rest cannot lose it under the wash — the
two roles are already apart in both Windows recipes, and Windows dark is the
tightest at **9.07:1**, so no colour moves.

The modal scrim is a surface wash too. `overlayWashPairs` composites `overlay`
over `background`, `card`, `muted`, `input`, `selected`, `popover`, the four
resting filled actions (`primary`, `secondary`, `accent`, `destructive`) and the
four soft status panels (`infoSoft`, `successSoft`, `warningSoft`,
`destructiveSoft`), and holds the result to 1.05:1, because a scrim that paints
its own surface is an invisible modal backdrop. The transient pointer washes and
the filled families' hover and press steps are excluded — the pointer leaves the
row to reach the dialog — but `selected` persists, `input` is part of the
layout, the page's actions keep their resting fills and a status panel stays on
screen, so all of them are measured (plans `359` and `375`). The audit found
high-contrast dark's `#000000CC` measured **1.000:1** on the pure black canvas —
an 80% black veil over black — while every other shipped set cleared the floor.
The AAA dark theme now veils with light (`#FFFFFF26`): a dialog's separation
cannot come from darkening a canvas that is already black. `overlay` stops being
an exempt role; it is measured like the selection wash and reported with
`wash: "overlay"` (plan `099`). The tightest of the fourteen pairs is
**1.075:1** (high-contrast dark, `overlay` on `primary`), so the new surfaces
move no colour.

Every colour role is accounted for: `contrastPairs`, `selectionPairs`,
`selectionWashPairs`, `selectionSoftPairs`, `selectionSoftWashPairs`,
`selectionFillPairs`, `selectionFillWashPairs`, `softPanelTextPairs` and
`overlayWashPairs` measure the
painted roles — `inactivePairs` is the thirteen-surface
inactive list, `softBorderSurfacePairs` the eight-surface chip edge and `disabled`
is measured as its own fill — and
`contrast.test.ts` keeps a
declared exemption list for the two that are not pairs: `scrollbar` (reserved; the
pinned runtime paints the platform scrollbar) and `shadow` (an elevation tint,
never text or a bounded surface). A new role that is neither measured nor
argued fails the suite, so the catalogue cannot grow a blind spot like the ones
plans `076`–`348` closed. Both are still held to the **form** the helpers parse:
`themeColorFailures` reports any of the 66 roles outside the six- or eight-digit
hex form, and `isHexColor` is the single-value predicate. A measured role in
another CSS form already fails the contrast check as `NaN`; `shadow` has no pair,
and plan `085` applies it through `alpha()`, so an unparseable tint used to paint
every elevation level fully opaque while both checks returned `[]` (plan `371`).

`packages/tokens/src/docs.test.ts` parses the colour tables above and fails if
they disagree with the shipped themes or fall out of role order; it also holds
the type table to `textRoles` order and content, the status-tone table to
`statusTones` order and content, the platform rows to `platformNames` order,
and the palette ramps to `palette` order and values, and the ratios and selection
wash percentages quoted above to `contrastRatio` and the alpha byte, so this
page cannot drift from the implementation. The high-contrast table's `xText`
rows name every surface `contrastPairs` measures status text on, so the two
tables describe the contract the library enforces. The same file holds
`docs/design-system.md`'s numeric claims
— the identity metrics, role count, theme surfaces, type summary and the
spacing, density, radius, icon and avatar scales — so the rationale cannot drift
from the package either.

Both suites import `contrastPairs` and `contrastFloors` from `src/contrast.ts`,
so the documented contract and the tests that enforce it are one description,
and `contrast.test.ts` proves the public checker passes every shipped theme and
names the pairs a brand theme, an opaque selection wash, an invisible soft
surface, a vanished divider or a malformed role misses. It also proves the
checker reads the level a theme declares: a
high-contrast theme whose secondary text is 6.70:1 on its pressed wash is
reported at the 7:1 floors
without a second argument. `docs.test.ts` holds the `Theme` block above to the
interface, so a field cannot ship undocumented, and requires the two signatures
that carry the declaration.

`packages/tokens/src/guards.test.ts` proves each narrowing guard accepts every
shipped member — `default` included — and rejects casing, aliases, whitespace and
non-strings.

`packages/tokens/src/platforms.test.ts` covers the platform table and every
variant: each platform has a label and both families, `sans` is the GPUI
sentinel, no family is a comma stack, `systemMonoFamily` and the default
typography follow `currentPlatform`, the Default variant returns the identity,
the three real variants change accent and shape without mutating their base, and
every platform theme is held to the same contrast floors as the identity —
including the composited `selection` wash. The same suite covers
`applyPlatformStyle`: a copied style with an edited accent applies, an unnamed
role inherits the identity, and a high-contrast base keeps its colours.
`docs.test.ts` builds the table above
from `platformStyles`, so a value edit cannot ship a document that lies. There is
no font-registration test because the pinned runtime has no API to test against;
see [Custom typefaces](#custom-typefaces-are-unavailable-in-0100).

`packages/tokens/src/snippets.test.ts` holds every copyable fenced block — the
ones in this page, the package README and the `@example` comments in the
package's modules — to the export, role and scale names it uses, and fails a
block that presents itself as a module and then calls a public function or
renders a public component it does not import (plans 355 and 356). The source
examples caught two `<ThemeProvider>` blocks that never imported it.

## Limitations and future work

- No CSS variables or CSS pipeline; GPUix paints inline values.
- No `letterSpacing` in the runtime.
- No OS appearance detection; the application selects the mode and contrast, and
  also which platform style to render.
- Platform styles express platform conventions, not a shipped copy of a vendor
  design system: radii, density, accent and shadows are our values, and the
  families are limited to what each OS installs. High contrast keeps its own
  colours, so a platform accent is a default-contrast feature.
- `.SystemUIFont` is verified by GPUI's own documentation of the name, and the
  playground's `theme-type-and-shadow` gallery (plan 150) asserts every type role
  through `textStyle`, including the family the runtime reports. A visual
  per-platform comparison is still open; see `COMPONENTS.md` and `TODO.md`.
- No custom typeface in the pinned runtime: GPUix 0.10.0 has no `registerFont`, so
  the library can only name installed families. The API exists unreleased on
  `references/gpuix` main; plan `052` is ready for the release that ships it.
- No `outline*` and no `focusVisible` in the runtime (GPUix 0.10.0): the focus
  ring is a spread shadow, so it cannot tell a Tab from a click, and it follows
  `borderRadius` only because a shadow does.
- No scrollbar tint: GPUix 0.10.0 exposes no `scrollbarColor` or
  `scrollbarWidth` (both are unreleased on GPUix main), so `scrollbar` is
  reserved for the release that does. Text selection **is** supported through
  `selectionColor`; see [Text selection](#text-selection).
- No themeable native field placeholder or selection: GPUix 0.10.0's
  `<input>`/`<textarea>` paints both itself (`#8F8F8F` and `#7C86FF59`) and
  reads only `theme.caret`. The `placeholder` role covers a hint the consumer
  renders, and `selectionColor` covers app text; see
  [Native text fields](#native-text-fields).
- No `transition`, `animation`, `transform` or colour interpolation: motion can
  only animate the eight `MotionStyle` properties, and there is no
  reduced-motion query, so a theme that wants none overrides the levels to `0`.
- No breakpoints. Responsiveness is application-level, through GPUix's
  `useWindowSize` and `useWindowInsets`; a breakpoint token would describe a
  layout engine this runtime does not have.
- No `shadowXs` or `shadowXl`. Four elevation levels cover the shipped surfaces,
  and an unused level is dead data.
- No second spacing or radius scale, and no second name for a role that already
  has one.
- No stacking scale; see [Layering](#layering).
- Native visual proof is the playground's theme gallery, not this document. See
  `TODO.md`.

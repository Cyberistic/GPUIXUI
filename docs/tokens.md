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
  isStatusTone,
  lightTheme,
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

## Colour roles

Components use semantic roles, never ramp shades. The role names describe
intent, so a brand theme changes values without touching component source.
`border` is decorative; `borderStrong` is the essential control boundary held
to 3:1 (4.5:1 at high contrast) on the plain surfaces, the `muted` panel, the
`hover`/`active`/`accent`/`selected` washes a bounded control sits on, and the
four soft status fills an Alert, Badge or Toast paints. A bordered
control paints `border` on the fill behind it —
`secondary` at rest, `hover`/`active` while the pointer moves, and `accent` for
an outline toggle that is on — so the divider is held to its floor on those
fills too, not only on the plain surfaces.

There are 62 roles. The four status families — `info`, `success`, `warning` and
`destructive` — each have three tonalities and a designed edge: a solid fill with
a readable foreground on it, a soft pair (`xSoft` / `xSoftForeground`) with an
edge (`xSoftBorder`) for alerts, badges and toasts, and a text role (`xText`) for
status labels, icons and indicator dots drawn on `background`, `card` or
`popover`. Every filled action has designed hover and pressed steps —
`primaryHover`/`primaryActive`, `secondaryHover`/`secondaryActive` and
`destructiveHover`/`destructiveActive` — so a component never composites an
alpha fill over whatever surface sits behind it. The generic `hover` and
`active` roles are different: they are the washes a ghost or outline control
paints, not the fill of a filled control. `info` is blue, not iris, so it can
never be confused with `primary`.

The same fill-versus-text split applies to the brand action. `primary` is a
surface: it carries `primaryForeground`, and it is measured only as a fill.
Brand-toned text — a link, a label, an icon — reads `primaryText`, held to
4.5:1 on `background`, `card`, `popover` and `muted`, on the `hover` and
`active` washes the Link variant paints behind its own label, and on the
`accent`/`selected` fills a selectable row paints under it. The split is not
cosmetic: the macOS accent `#0071E3` measures 4.21:1 on that canvas and 3.44:1
on the pressed wash, while its text step `#0055B3` clears both.

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
| `accent` | `#EEF0FF` | `#2E2370` | tinted emphasis surface |
| `accentForeground` | `#3B2C8F` | `#C7CBFF` | text on `accent` |
| `destructive` | `#CC3439` | `#FF6B6B` | destructive action |
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
| `successText` | `#116A43` | `#A8F0C6` | success text and indicators on `background`/`card`/`popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes |
| `warningText` | `#6B4500` | `#FFDE8A` | warning text and indicators on `background`/`card`/`popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes |
| `destructiveText` | `#A5262B` | `#FFC6C6` | destructive text and indicators on `background`/`card`/`popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes |
| `border` | `#D6DAE1` | `#343B47` | dividers and decorative borders |
| `borderStrong` | `#737C8C` | `#868FA0` | essential control boundaries, including on row washes and soft status fills |
| `input` | `#FFFFFF` | `#191D25` | input field background |
| `inputForeground` | `#191D25` | `#EEF1F5` | text typed into an input, on the `input` fill or the `background` canvas a transparent field paints |
| `placeholder` | `#66707F` | `#858F9F` | placeholder text on the `input` fill and the `background`/`card`/`popover`/`muted` surfaces a transparent field paints |
| `ring` | `#7567F2` | `#A7A9FF` | focus ring |
| `selection` | `#7567F23D` | `#A7A9FF33` | text selection wash (24% light, 20% dark; `selectionColor`) |
| `overlay` | `#00000073` | `#000000A6` | modal scrim |
| `hover` | `#EEF1F5` | `#262C36` | hover wash for ghost surfaces |
| `active` | `#E1E5EC` | `#2A303B` | pressed wash |
| `selected` | `#EEF0FF` | `#2E2370` | selected row or item |
| `selectedForeground` | `#3B2C8F` | `#C7CBFF` | text on `selected` |
| `disabled` | `#EEF1F5` | `#222730` | disabled surface (kept near the panel; the control's `border` edge carries its shape) |
| `disabledForeground` | `#6E7787` | `#A1A9B7` | disabled text, held to the `inactive` floor |
| `skeleton` | `#CBD1DB` | `#3D4552` | loading placeholder |
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
`Theme` — the same 62 roles and the same type, spacing, radius, density, border
width and icon scales — with colour values chosen to meet stricter floors: AAA
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
| `accent` | `#E0E3FF` | `#251B5C` | tinted emphasis surface |
| `accentForeground` | `#2E2370` | `#E0E3FF` | text on `accent` |
| `destructive` | `#7E1D21` | `#FF9E9E` | destructive action |
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
| `infoText` | `#152F6B` | `#DEE9FF` | info text and indicators on `background`/`card`/`popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes |
| `successText` | `#0A3A26` | `#D3F9E2` | success text and indicators on `background`/`card`/`popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes |
| `warningText` | `#4B3100` | `#FFEFC6` | warning text and indicators on `background`/`card`/`popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes |
| `destructiveText` | `#5C1619` | `#FFE0E0` | destructive text and indicators on `background`/`card`/`popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes |
| `border` | `#6E7683` | `#8A8A8A` | dividers and decorative borders |
| `borderStrong` | `#4A4F58` | `#AAAAAA` | essential control boundaries, including on row washes and soft status fills |
| `input` | `#FFFFFF` | `#0D0D0D` | input field background |
| `inputForeground` | `#000000` | `#FFFFFF` | text typed into an input, on the `input` fill or the `background` canvas a transparent field paints |
| `placeholder` | `#4A4F58` | `#B0B0B0` | placeholder text |
| `ring` | `#4C39B5` | `#C7CBFF` | focus ring |
| `selection` | `#7567F24D` | `#4C39B54D` | text selection wash (30% alpha; `selectionColor`) |
| `overlay` | `#000000A6` | `#FFFFFF26` | modal scrim |
| `hover` | `#E8E8E8` | `#2E2E2E` | hover wash for ghost surfaces |
| `active` | `#D6D6D6` | `#3D3D3D` | pressed wash |
| `selected` | `#E0E3FF` | `#251B5C` | selected row or item |
| `selectedForeground` | `#2E2370` | `#E0E3FF` | text on `selected` |
| `disabled` | `#E8E8E8` | `#2E2E2E` | disabled surface (kept near the panel; the control's `border` edge carries its shape) |
| `disabledForeground` | `#5A5A5A` | `#A9A9A9` | disabled text, held to the `inactive` floor |
| `skeleton` | `#B0B0B0` | `#565656` | loading placeholder |
| `scrollbar` | `#9A9A9A` | `#8A8A8A` | scrollbar thumb (reserved: no tint in 0.10.0) |
| `shadow` | `#000000` | `#000000` | elevation tint (opaque; each level applies its own alpha) |

## Typography

Families come from the platform table: `sans` is `systemUiFont` (GPUI's
`.SystemUIFont` sentinel) and `mono` is the current platform's family. Weights
are `400`, `500`, `600`, `700`. GPUix has no `letterSpacing` field, so the scale
does not define tracking.

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
shadows; roles it does not name (status, disabled, scrollbar) and every
non-colour scale inherit the identity, so the default stays the design system
the library is built on. The dark variants carry their own `skeleton`, because a
loading placeholder is a surface on that platform's card and row washes, not a
fixed grey.

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
"high")` applies only the families and shape to the high-contrast colour set,
because a platform accent must not drop the AAA floors.

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
Naming `"high"` on a default base applies only families and shape, so the theme
stays `default`; a style with no colour overrides keeps the base's level because
it changes no colour. A style overrides only the roles it names, so a mixed
palette can still miss a default-floor pair — for example the AAA `border` it
does not override on an inherited soft tint — and `themeContrastFailures` reports
it rather than rewriting the consumer's palette (plan `301`).

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
hover, pressed and text — and is compiled, applied and held to
`themeContrastFailures` in `platforms.test.ts`, so the shape above is the one the
library tests, not a sketch. A style that names only the fill inherits a
foreground designed for another fill; that is the 2.96:1 failure plan `310`
fixed.

`applyPlatformStyle(getTheme(mode), contosoPlatformStyle)` is the same call the
shipped variants use, so a copied file cannot take a path the library does not
test.

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
| `xp` (Windows XP) | `#ECE9D8` | `#0054E3` | `#C9DDFF` | 2 / 3 / 6 / 8 | `compact` | `Consolas` |
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
mode. Their dark themes keep the Windows dark surfaces and motion and carry the
era's accent and shape, so they are honest extensions, not reconstructions; both
are held to the contrast contract in each mode.

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
silently. `currentPlatform` is the platform this code runs on (`default` in a
browser or on an OS the library does not know) and `systemMonoFamily` is its mono
family, which the default typography uses.

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
without a cast.

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

A runnable example lives in
[`src/focus-ring.example.ts`](../packages/tokens/src/focus-ring.example.ts).

## Text selection

GPUix 0.10.0 exposes `selectionColor` and `userSelect` as inherited `StyleDesc`
properties, so native text selection is themeable. `selectionStyle(theme)` maps
the `selection` role to the property:

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
floor; a soft status surface carries its own tone with `xSoftForeground`.
Secondary text is held to the secondary floor through the same wash on all nine
surfaces (`mutedForeground`), because a row description, a card caption or a
message timestamp is selected with the body copy around it. The soft surfaces
are held in both directions too: `selectionSoftPairs` measures the tone's text
through the wash and `selectionSoftWashPairs` the wash's own perceivability, so
a selected Alert, Badge or Toast keeps its body floor and still shows the
highlight. The audit found two gaps: identity light `successSoftForeground`
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
  typography: { body: { fontSize: 15 } },
});
```

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

Merge rules:

- groups are partial: omitted values inherit from the base;
- colour, spacing, radius, border width, icon and avatar overrides merge key by
  key;
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
the same floors as the shipped ones:

```ts
import { themeContrastFailures } from "@gpuixui/tokens";

themeContrastFailures(brandTheme); // [] at the level brandTheme declares
themeContrastFailures(brandTheme, "high"); // the same theme against the AAA floors
```

`themeContrastFailures(theme, contrast = theme.contrast)` measures `contrastPairs`
against `contrastFloors`. The list holds text pairs, secondary text and status
text on the state washes (`hover`, `active`, `accent` and `selected`), the
default label of a list or menu row on the washes it paints, the field edge on
its `input` fill, the other
status pairs, the focus ring on the plain surfaces, the `muted` panel, the
`accent` wash, the three state washes a focused control can sit on and the four
soft status fills (`ringSoftPairs`), the
functional control boundary on the `muted` panel, those washes and the four soft
status fills (`controlBoundarySoftPairs`), the selection
wash — body and secondary text through it, and the wash's own perceivability —
the soft status surfaces, the designed edge on its own fill and on the eight
surfaces a chip sits on (`softBorderSurfacePairs`), the plain divider on those
fills, and the decorative
dividers — including on the `secondary`, `hover`, `active` and `accent` fills a
bordered control paints, and on the `input` fill a field sits on.
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
the text list. An Alert, Badge or Toast is measured the same way:
`selectionSoftPairs` holds the tone's foreground through the wash and
`selectionSoftWashPairs` the highlight's own perceivability on the four soft
fills. The wash itself is compared with each surface it paints on, so a
highlight that has become imperceptible is reported as well;
`selectionWashPairs` is that list.

The modal scrim is measured the same way, because its job is to change the
surface beneath it: `overlayWashPairs` composites `overlay` over the app's four
base surfaces — `overlaySurfaces` is `background`, `card`, `muted` and `popover`
— and holds the painted value to the `surface` floor. A scrim that composites to
its own surface is an invisible modal backdrop; the audit found high-contrast
dark's `#000000CC` measured **1.000:1** on its pure black canvas, so the AAA dark
theme now veils with a 15% white wash (`#FFFFFF26`, 1.388:1) — a dark veil cannot
darken black. The failures are reported with `wash: "overlay"`. Row washes are
deliberately not scrim surfaces: the pointer leaves the row to reach the dialog,
so a scrim over a transient hover is not a composition the system supports.

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

contrastFloors.default; // { body: 7, secondary: 4.5, inactive: 3, boundary: 3, surface: 1.05, divider: 1.05 }
contrastFloors.high; // { body: 7, secondary: 7, inactive: 4.5, boundary: 4.5, surface: 1.05, divider: 3 }
```

The floors are the ones in [`design-system.md` §9](./design-system.md#9-accessibility).
This is a check for a consumer's own test suite, not a runtime validator.

No runtime schema: themes authored in TypeScript are trusted at compile time.
A theme loaded from a file or URL is unknown input and must be decoded by the
application that owns that boundary.

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
(macOS · Linux · Windows · Default). A docs table or a platform toggle iterates
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
muted text on `background`, `card` and `popover`, secondary text on the `hover`,
`active`, `accent` and `selected` washes a row paints behind a description, and
status text (`xText`) on `background`, `card`, `popover`, the `muted` panel and those four washes;
3:1 for focus and essential boundaries in the default themes; 4.5:1 for them in
the high-contrast variants; and 3:1 for an inactive label, raised to 4.5:1 at
high contrast). The inactive floor is new in plan `306`: `inactivePairs`
measures `disabledForeground` on its own fill, the plain surfaces and the four
row washes, because a disabled `Select` item paints it on the menu's `popover`
with no fill behind it and measured 1.99:1 on Linux dark. The `disabled` fill
stays near the panel by design, so a disabled control's shape is carried by its
`border` edge — held to the divider floor on `disabled`, and on the `muted` panel
a settings sidebar divides (plan `306`).
The boundary is also measured on the `muted` panel,
the four washes and the four soft status fills, because an unchecked checkbox or
a field keeps its `borderStrong` edge while the row moves or inside an Alert.
It also fails if a soft status surface is indistinguishable from `background`,
`card`, `popover` or the `muted` quiet panel (floor 1.05:1) — a status badge or
small Alert in a sidebar sat at 1.023:1 on Linux light, 1.036:1 on macOS light
and 1.043:1 on Windows light until plan `300` moved the four light tints one step
deeper — or if a loading skeleton is indistinguishable
on any surface or row wash it fills (also 1.05:1), if a decorative `border` is imperceptible on
those surfaces, on the `secondary`, `hover`, `active` and `accent` fills a
bordered control paints, or on the four soft status fills a status panel
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
`card`, `popover`, `muted`, `hover`, `active` and `selected`, so a placeholder
never disappears into the card it fills or the row it sits in. The audit found
the placeholder was the `active` fill in the identity and high-contrast themes,
so a pressed loading row erased the placeholder (1.000:1); the light and dark skeleton moved
one ramp step away, and each dark platform style carries its own.
Brand-toned text is checked on the eight surfaces a link paints —
`background`, `card`, `popover`, `muted`, the `hover`/`active` washes and the
`accent`/`selected` fills a selectable row paints — so a platform accent cannot
ship as an unreadable link: the audit found macOS light at 4.21:1 on its
canvas and 3.44:1 on the pressed wash, macOS dark at 2.84:1 on `active`, and
high-contrast dark at 6.94:1 under its 7:1 floor. The two row fills were added
by plan `314`; the tightest shipped pair is `primaryText` on `selected` at
**4.53:1** (Linux dark), so no value moves.
Every platform variant is checked on its own canvas, not the identity's, so a
style that moves `background` or `card` is held to the status tints and skeleton
it inherits. The same loop holds secondary text on each variant's washes: macOS
dark shipped at 4.41:1 on `hover` and 3.55:1 on `active` until plan `079` moved
its secondary grey and pressed wash. The control edge is held there too: four
shipped sets had `border` equal to the fill it sits on (identity light `active`,
identity dark `secondary`/`active`/`accent`, macOS dark `hover`/`secondary`/
`accent`, and high-contrast dark's `active` at 2.53:1 under the AAA floor), so
an outlined control's edge disappeared exactly while pressed; plan `080` moved
the four dividers. The selection wash is held there too: high-contrast dark
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
`popover` and the `hover`/`active`/`accent`/`selected` washes; typed text is
`inputForeground` on the `input` fill and on the `background` canvas a
transparent field paints. The placeholder is held to the same secondary floor
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
`selectedForeground` on `active` at **5.21:1** (macOS light) and
`selectedForeground` on `accent` at **5.81:1** (macOS light), so no colour moves.
A text field's edge is `border` on its own `input` fill, measured at the divider
floor; the weakest shipped set is Linux dark at **1.25:1**, above the 1.05:1
floor. These seven pairs take `contrastPairs` from 232 to 239; plan `314` adds
the selected option, the sidebar status label and the row link, plan `315` adds
typed text on the canvas field, plan `316` adds the `accent` fill a selected
row inherits its label on, and plan `317` adds the placeholder on the four
`Surface` tones, taking the contract from 248 to 252.

A status label or indicator dot in a sidebar is measured on the `muted` quiet
panel — the surface plans `300` and `309` made first class — as well as on the
four row washes plan `083` covered, so a warning dot in a settings sidebar has a
pair. The tightest shipped value is `successText` on `muted` at **5.92:1**
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
lighter in dark.

An interactive fill is a surface too. `stateFillSurfacePairs` holds the thirteen
fills a control or row paints as its own shape — the `hover` and `active` washes,
`accent` and `selected`, and the `primary`, `secondary` and `destructive`
families at rest, hover and press — to the 1.05:1 surface floor on the four
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
and a control's `secondary` fill are what the ring surrounds, not what it sits
on, so they are deliberately not ring surfaces. `ringSurfaces` in
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
way: `selectionSoftPairs` holds `xSoftForeground` to the body floor through the
wash and `selectionSoftWashPairs` the wash to 1.05:1, after identity light
`successSoftForeground` measured 5.83:1 and Windows dark's wash over
`destructiveSoft` 1.005:1 (plan `091`).

The modal scrim is a surface wash too. `overlayWashPairs` composites `overlay`
over `background`, `card`, `muted` and `popover` and holds the result to 1.05:1,
because a scrim that paints its own surface is an invisible modal backdrop. The
audit found high-contrast dark's `#000000CC` measured **1.000:1** on the pure
black canvas — an 80% black veil over black — while every other shipped set
cleared the floor. The AAA dark theme now veils with light (`#FFFFFF26`): a
dialog's separation cannot come from darkening a canvas that is already black.
`overlay` stops being an exempt role; it is measured like the selection wash and
reported with `wash: "overlay"` (plan `099`).

Every colour role is accounted for: `contrastPairs`, `selectionPairs`,
`selectionWashPairs`, `selectionSoftPairs`, `selectionSoftWashPairs` and
`overlayWashPairs` measure the painted roles — `inactivePairs` is the nine-surface
inactive list, `softBorderSurfacePairs` the eight-surface chip edge and `disabled`
is measured as its own fill — and
`contrast.test.ts` keeps a
declared exemption list for the two that are not pairs: `scrollbar` (reserved; the
pinned runtime paints the platform scrollbar) and `shadow` (an elevation tint,
never text or a bounded surface). A new role that is neither measured nor
argued fails the suite, so the catalogue cannot grow a blind spot like the ones
plans `076`–`099` closed.

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

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
to 3:1 (4.5:1 at high contrast) on the plain surfaces, the `muted` panel and the
`hover`/`active`/`accent`/`selected` washes a bounded control sits on. A bordered
control paints `border` on the fill behind it —
`secondary` at rest, `hover`/`active` while the pointer moves, and `accent` for
an outline toggle that is on — so the divider is held to its floor on those
fills too, not only on the plain surfaces.

There are 58 roles. The four status families — `info`, `success`, `warning` and
`destructive` — each have three tonalities and a designed edge: a solid fill with
a readable foreground on it, a soft pair (`xSoft` / `xSoftForeground`) with an
edge (`xSoftBorder`) for alerts, badges and toasts, and a text role (`xText`) for
status labels, icons and indicator dots drawn on `background`, `card` or
`popover`. A filled action also has a designed hover — `primaryHover` and
`destructiveHover` — so a component never composites an alpha fill over whatever
surface sits behind it. `info` is blue, not iris, so it can never be confused
with `primary`.

The same fill-versus-text split applies to the brand action. `primary` is a
surface: it carries `primaryForeground`, and it is measured only as a fill.
Brand-toned text — a link, a label, an icon — reads `primaryText`, held to
4.5:1 on `background`, `card`, `popover` and `muted`, and on the `hover` and
`active` washes the Link variant paints behind its own label. The split is not
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
| `primaryText` | `#4C39B5` | `#C7CBFF` | brand-toned text, links and icons on plain surfaces |
| `secondary` | `#EEF1F5` | `#2A303B` | secondary action |
| `secondaryForeground` | `#2A303B` | `#E1E5EC` | text on `secondary` |
| `muted` | `#EEF1F5` | `#222730` | quiet surface |
| `mutedForeground` | `#3D4552` | `#CBD1DB` | secondary text |
| `accent` | `#EEF0FF` | `#2E2370` | tinted emphasis surface |
| `accentForeground` | `#3B2C8F` | `#C7CBFF` | text on `accent` |
| `destructive` | `#CC3439` | `#FF6B6B` | destructive action |
| `destructiveForeground` | `#FFFFFF` | `#3A0B0D` | text on `destructive` |
| `destructiveHover` | `#A5262B` | `#FF9E9E` | destructive action while hovered |
| `success` | `#158754` | `#3BC97F` | success |
| `successForeground` | `#FFFFFF` | `#042015` | text on `success` |
| `warning` | `#F5B01F` | `#FFC94D` | warning |
| `warningForeground` | `#2A1B00` | `#2A1B00` | text on `warning` |
| `info` | `#2559D6` | `#9FBEFF` | informational status, distinct from `primary` |
| `infoForeground` | `#FFFFFF` | `#11141A` | text and icons on `info` |
| `infoSoft` | `#DEE9FF` | `#16356F` | soft informational surface |
| `infoSoftForeground` | `#173A88` | `#DEE9FF` | text and icons on `infoSoft` |
| `infoSoftBorder` | `#A6BEF3` | `#3F5E9A` | edge around `infoSoft` |
| `successSoft` | `#C2F4D6` | `#0C452D` | soft success surface |
| `successSoftForeground` | `#0E5135` | `#D3F9E2` | text and icons on `successSoft` |
| `successSoftBorder` | `#8ED3AF` | `#1A6D46` | edge around `successSoft` |
| `warningSoft` | `#FFE3A3` | `#4B3100` | soft warning surface |
| `warningSoftForeground` | `#4B3100` | `#FFEFC6` | text and icons on `warningSoft` |
| `warningSoftBorder` | `#FCD47B` | `#815F17` | edge around `warningSoft` |
| `destructiveSoft` | `#FFE0E0` | `#6B1A1D` | soft destructive surface |
| `destructiveSoftForeground` | `#7E1D21` | `#FFE0E0` | text and icons on `destructiveSoft` |
| `destructiveSoftBorder` | `#F0ACAE` | `#983235` | edge around `destructiveSoft` |
| `infoText` | `#1B45AC` | `#C5D8FF` | info text and indicators on `background`/`card`/`popover` and the `hover`/`active`/`accent`/`selected` washes |
| `successText` | `#116A43` | `#A8F0C6` | success text and indicators on `background`/`card`/`popover` and the `hover`/`active`/`accent`/`selected` washes |
| `warningText` | `#6B4500` | `#FFDE8A` | warning text and indicators on `background`/`card`/`popover` and the `hover`/`active`/`accent`/`selected` washes |
| `destructiveText` | `#A5262B` | `#FFC6C6` | destructive text and indicators on `background`/`card`/`popover` and the `hover`/`active`/`accent`/`selected` washes |
| `border` | `#D6DAE1` | `#343B47` | dividers and decorative borders |
| `borderStrong` | `#737C8C` | `#77808F` | essential control boundaries, including on row washes |
| `input` | `#FFFFFF` | `#191D25` | input field background |
| `inputForeground` | `#191D25` | `#EEF1F5` | text typed into an input |
| `placeholder` | `#66707F` | `#7C8595` | placeholder text |
| `ring` | `#7567F2` | `#A7A9FF` | focus ring |
| `selection` | `#7567F23D` | `#A7A9FF3D` | text selection wash (24% alpha; `selectionColor`) |
| `overlay` | `#00000073` | `#000000A6` | modal scrim |
| `hover` | `#EEF1F5` | `#222730` | hover wash for ghost surfaces |
| `active` | `#E1E5EC` | `#2A303B` | pressed wash |
| `selected` | `#EEF0FF` | `#2E2370` | selected row or item |
| `selectedForeground` | `#3B2C8F` | `#C7CBFF` | text on `selected` |
| `disabled` | `#EEF1F5` | `#222730` | disabled surface |
| `disabledForeground` | `#A1A9B7` | `#545D6C` | disabled text |
| `skeleton` | `#E1E5EC` | `#2A303B` | loading placeholder |
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
dot drawn directly on a surface — `background`, `card`, `popover` or one of the
state washes a row paints (`hover`, `active`, `accent`, `selected`).

| Tone | Solid fill | Soft surface | Text on the soft surface | Edge on the soft surface | Text on a plain surface |
| ---- | ---------- | ------------ | ----------------------- | ------------------------ | ----------------------- |
| `info` | `info` / `infoForeground` | `infoSoft` | `infoSoftForeground` | `infoSoftBorder` | `infoText` |
| `success` | `success` / `successForeground` | `successSoft` | `successSoftForeground` | `successSoftBorder` | `successText` |
| `warning` | `warning` / `warningForeground` | `warningSoft` | `warningSoftForeground` | `warningSoftBorder` | `warningText` |
| `destructive` | `destructive` / `destructiveForeground` | `destructiveSoft` | `destructiveSoftForeground` | `destructiveSoftBorder` | `destructiveText` |

The solid roles are fills, not foregrounds. Light `warning` (`#F5B01F`) is
1.78:1 against `background` and 1.89:1 against `card`, under the 3:1 non-text
floor, and light `success` is 4.26:1, under the 4.5:1 text floor. `xText` is the
readable tonality for the plain surfaces (`background`, `card` and `popover`)
and the four state washes a row paints (`hover`, `active`, `accent` and
`selected`); it is held to 4.5:1 in the default themes and 7:1 in the
high-contrast variants. That is not theoretical: a warning label in a pressed
row measured 4.22:1 on macOS light, 4.24:1 on Linux light and 4.36:1 on Windows
light, and high-contrast light measured 5.83:1 on `active` and 6.70:1 on
`accent`/`selected` until plan `083` moved the two warning steps. A soft surface
is a surface in its own right: it is held to 1.05:1 against
`background`, `card` and `popover`, so an Alert, Badge or Toast stays
perceivable on every shipped canvas, platform variants included.

The edge is a role, not a mixture: `xSoftBorder` is designed per tone and
measured on the fill it borders at the divider floor — 1.05:1 in the default
themes and 3:1 at high contrast. At high contrast the edge is designed, not
mixed: `warningSoftBorder` (`#8E5B00`) is 4.41:1 on `warningSoft`, where the 30%
mixture it replaced measured 1.12:1, under the 3:1 divider floor. Because it is a
role, a copied platform style edits it with the rest of the palette.

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
`Theme` — the same 58 roles and the same type, spacing, radius, density, border
width and icon scales — with colour values chosen to meet stricter floors: AAA
body text (7:1), 7:1 secondary and on-colour text, and 4.5:1 focus rings and
essential boundaries. Changing values rather than roles is why no component has
to know the variant exists. It also declares `contrast: "high"`, so the checks
that read a theme default to the floor set it was built for.

```ts
import { getTheme, highContrastThemes } from "@gpuixui/tokens";

getTheme("dark", "high"); // highContrastThemes.dark
getTheme("light"); // the default light theme, unchanged
```

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
| `primaryText` | `#3B2C8F` | `#E0E3FF` | brand-toned text, links and icons on plain surfaces |
| `secondary` | `#E8E8E8` | `#2E2E2E` | secondary action |
| `secondaryForeground` | `#000000` | `#FFFFFF` | text on `secondary` |
| `muted` | `#F2F2F2` | `#1A1A1A` | quiet surface |
| `mutedForeground` | `#1F1F1F` | `#E0E0E0` | secondary text |
| `accent` | `#E0E3FF` | `#1C1547` | tinted emphasis surface |
| `accentForeground` | `#2E2370` | `#E0E3FF` | text on `accent` |
| `destructive` | `#7E1D21` | `#FF9E9E` | destructive action |
| `destructiveForeground` | `#FFFFFF` | `#000000` | text on `destructive` |
| `destructiveHover` | `#5C1619` | `#FFC6C6` | destructive action while hovered |
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
| `infoText` | `#152F6B` | `#DEE9FF` | info text and indicators on `background`/`card`/`popover` and the `hover`/`active`/`accent`/`selected` washes |
| `successText` | `#0A3A26` | `#D3F9E2` | success text and indicators on `background`/`card`/`popover` and the `hover`/`active`/`accent`/`selected` washes |
| `warningText` | `#4B3100` | `#FFEFC6` | warning text and indicators on `background`/`card`/`popover` and the `hover`/`active`/`accent`/`selected` washes |
| `destructiveText` | `#5C1619` | `#FFE0E0` | destructive text and indicators on `background`/`card`/`popover` and the `hover`/`active`/`accent`/`selected` washes |
| `border` | `#6E7683` | `#8A8A8A` | dividers and decorative borders |
| `borderStrong` | `#4A4F58` | `#AAAAAA` | essential control boundaries, including on row washes |
| `input` | `#FFFFFF` | `#0D0D0D` | input field background |
| `inputForeground` | `#000000` | `#FFFFFF` | text typed into an input |
| `placeholder` | `#4A4F58` | `#B0B0B0` | placeholder text |
| `ring` | `#4C39B5` | `#C7CBFF` | focus ring |
| `selection` | `#7567F24D` | `#4C39B54D` | text selection wash (30% alpha; `selectionColor`) |
| `overlay` | `#000000A6` | `#000000CC` | modal scrim |
| `hover` | `#E8E8E8` | `#2E2E2E` | hover wash for ghost surfaces |
| `active` | `#D6D6D6` | `#3D3D3D` | pressed wash |
| `selected` | `#E0E3FF` | `#1C1547` | selected row or item |
| `selectedForeground` | `#2E2370` | `#E0E3FF` | text on `selected` |
| `disabled` | `#E8E8E8` | `#2E2E2E` | disabled surface |
| `disabledForeground` | `#5A5A5A` | `#8A8A8A` | disabled text |
| `skeleton` | `#D6D6D6` | `#3D3D3D` | loading placeholder |
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
loading placeholder is a surface on that platform's card, not a fixed grey.

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
  colors: { primary: "#005A9E", primaryHover: "#004578" },
  radius: { md: 3, lg: 6 },
});
```

`applyPlatformStyle(base, style, contrast = base.contrast)` reads the level the
base declares, so a copied style never overrides a high-contrast palette unless
the caller asks it to:

```ts
applyPlatformStyle(getTheme("dark", "high"), contosoStyle); // keeps the AAA palette
```

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
(`contosoPlatformStyle`). It is compiled and applied in `platforms.test.ts`, so
the shape above is the one the library tests, not a sketch.

`applyPlatformStyle(getTheme(mode), contosoPlatformStyle)` is the same call the
shipped variants use, so a copied file cannot take a path the library does not
test.

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
translucent (24% in the default themes, 30% at high contrast), so selected text
keeps the body contrast on every surface a glyph can be selected on:
`background`, `card`, `muted`, `hover`, `active` and `accent` with `foreground`;
`popover` with `popoverForeground`; `input` with `inputForeground`; and `selected`
with `selectedForeground` at the secondary floor. Secondary text is held to the
secondary floor through the same wash on all nine surfaces (`mutedForeground`),
because a row description, a card caption or a message timestamp is selected
with the body copy around it. `selectionSurfaces` is the list of surfaces,
`selectionPairs` holds the body and secondary text pairs, and
`selectionWashPairs` holds the wash itself to the 1.05:1 perceivability floor on
each surface, so a highlight that is technically readable but invisible fails
the check too.

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
`getTheme(mode, "high")`. `createTheme(config)` starts from `themes[config.mode]`;
`extendTheme(base, overrides)` derives from any theme, including a high-contrast
one.

```ts
import { createTheme, extendTheme, darkTheme } from "@gpuixui/tokens";

export const brandTheme = createTheme({
  mode: "dark",
  name: "Acme",
  colors: { primary: "#7C5CFF", ring: "#9B8CFF" },
  radius: { md: 8 },
  density: "compact",
});

export const scoped = extendTheme(darkTheme, {
  typography: { body: { fontSize: 15 } },
});
```

A persisted choice arrives as `unknown`. The package guards its own unions, so a
consumer does not retype them: `isPlatformName(value)` narrows to a shipped
platform (including `default`), `isThemeMode(value)` to `light`/`dark`,
`isThemeContrast(value)` to `default`/`high`, and `isDensityName(value)` to a
preset. A tone from a payload is the same kind of choice and narrows with
`isStatusTone(value)`. They narrow a choice; decoding a whole theme object from a
file or URL is still the application's boundary and belongs to its `Schema`.

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
- `contrast` defaults to the base's declaration; an override is a claim the
  extension mechanism does not check;
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
text on the state washes (`hover`, `active`, `accent` and `selected`), the other
status pairs, the focus ring on the plain surfaces, the `muted` panel, the
`accent` wash and the three state washes a focused control can sit on, the
functional control boundary on the `muted` panel and those washes, the selection
wash — body and secondary text through it, and the wash's own perceivability —
the soft status surfaces and the decorative dividers
— including on the `secondary`, `hover`, `active` and `accent` fills a bordered
control paints.
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
the text list. The wash itself is compared with each surface it paints on, so a
highlight that has become imperceptible is reported as well;
`selectionWashPairs` is that list.

The parts are public too. `contrastRatio(foreground, background)` is the WCAG
ratio for opaque `#RRGGBB` values — `NaN` when a value does not parse, so a typo
can never pass — `compositeOver(colour, background)` composites a translucent
role onto an opaque one, and `contrastPairs` / `contrastFloors` are the data the
check and the test suite both read:

```ts
import { contrastFloors } from "@gpuixui/tokens";

contrastFloors.default; // { body: 7, secondary: 4.5, boundary: 3, surface: 1.05, divider: 1.05 }
contrastFloors.high; // { body: 7, secondary: 7, boundary: 4.5, surface: 1.05, divider: 3 }
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

Contrast is enforced by `packages/tokens/src/color.test.ts`:

```sh
nub run --filter @gpuixui/tokens test
```

The test covers every shipped colour set — light, dark and both high-contrast
variants — and fails if a semantic text/surface pair drops below its floor (7:1
for primary body pairs, typed input text, soft status text and all high-contrast
text; 4.5:1 for secondary and on-colour text in the default themes, including
text on a hovered filled action, ghost text on the `hover` and `active` washes,
muted text on `background`, `card` and `popover`, secondary text on the `hover`,
`active`, `accent` and `selected` washes a row paints behind a description, and
status text (`xText`) on `background`, `card`, `popover` and those four washes;
3:1 for focus and essential boundaries in the default themes; 4.5:1 for them in
the high-contrast variants. The boundary is also measured on the `muted` panel
and the four washes, because an unchecked checkbox or a field keeps its
`borderStrong` edge while the row moves.
It also fails if a soft status surface is indistinguishable from `background`,
`card` or `popover` (floor 1.05:1), if a decorative `border` is imperceptible on
those surfaces or on the `secondary`, `hover`, `active` and `accent` fills a
bordered control paints (1.05:1, and 3:1 at high contrast), or if body text over
the composited `selection` wash drops below its body floor on any surface a glyph
is selected on — `background`, `card`, `muted`, `hover`, `active`, `accent`,
`popover` and `input`, with the selected row at the secondary floor.
Each soft surface also has a role for its edge (`xSoftBorder`), held to the same
divider floor on that fill; the 30% mixture it replaced measured 1.12:1 on the
high-contrast light `warning` surface, under the 3:1 that theme requires.
A loading skeleton is a surface too: it is held to 1.05:1 against `background`,
`card` and `popover`, so a placeholder never disappears into the card it fills.
Brand-toned text is checked on the six surfaces a link paints — `background`,
`card`, `popover`, `muted` and the `hover`/`active` washes — so a platform accent
cannot ship as an unreadable link: the audit found macOS light at 4.21:1 on its
canvas and 3.44:1 on the pressed wash, macOS dark at 2.84:1 on `active`, and
high-contrast dark at 6.94:1 under its 7:1 floor.
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
boundary values one step. Palette edits must keep it green.

Default body text is measured on `background`, `card`, the `muted` panel,
`popover` and the `hover`/`active` washes. The panel and the floating surface are
not academic: an avatar's fallback initials sit on `muted`, and a date picker's
month header sits on its `popover`. Both clear the body floor with margin in
every shipped set, so no value moves; the pairs exist so an edited theme cannot
break them silently.

Elevation is held by `elevation.test.ts` and `elevation-tint.test.ts`: a stored
level is geometry plus an alpha and paints exactly the runtime's five fields, and
editing `colors.shadow` retints all three levels. Before plan `085` each level
carried its own complete colour, so the documented tint changed nothing and the
same value was duplicated three times per set; the split keeps every shipped hex
byte-for-byte.

The focus ring is measured on the eight surfaces a focused control can sit on —
the canvas, card and popover, the `muted` panel a sidebar control sits on, the
`accent` wash a selectable row paints, and the `hover`, `active` and `selected`
washes — because focus and selection co-occur in rows. A field's own `input` fill
and a control's `secondary` fill are what the ring surrounds, not what it sits
on, so they are deliberately not ring surfaces. `ringSurfaces` in
`src/contrast.ts` is the one list, and `ring-surfaces.test.ts` holds the public
check to it. Secondary text is measured on `hover`, `active`, `accent` and
`selected`, because a list row, a combobox option and a menu item paint those
washes behind a description; status text (`xText`) is measured on those four
washes as well as on `popover`, so a status label inside a hovered, pressed or
selected row or a dialog is covered; the `borderStrong` boundary is measured on
`popover`, the `muted` panel and those four washes, so a checkbox or field in a
quiet panel, a hovered, pressed, selectable or selected row still shows its edge.
Text selection is measured in both directions: `selectionPairs` holds the body
role each surface uses and `mutedForeground` on all nine `selectionSurfaces` to
their floors, and `selectionWashPairs` holds the wash itself to the 1.05:1
perceivability floor on each, because a highlight can be readable and still be
invisible. Windows dark and both high-contrast sets already cleared the secondary
floor through the wash; the other seven moved their secondary grey one step away
from the canvas (plan `087`).

Every colour role is accounted for: `contrastPairs`, `selectionPairs` and
`selectionWashPairs` measure the painted roles, and `contrast.test.ts` keeps a
declared exemption list for the
five that are not pairs — `disabled` and `disabledForeground` (WCAG exempts
inactive controls, and the design system requires a visible dim rather than a
floor), `overlay` (a scrim, whose job is to obscure), `scrollbar` (reserved; the
pinned runtime paints the platform scrollbar) and `shadow` (an elevation tint,
never text or a bounded surface). A new role that is neither measured nor
argued fails the suite, so the catalogue cannot grow a blind spot like the ones
plans `076`–`087` closed.

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

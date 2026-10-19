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
  invalidFocusRing,
  isDensityName,
  isHexColor,
  isStatusTone,
  lightTheme,
  metricRules,
  motionTransition,
  platformNames,
  platformStyles,
  platformTypes,
  selectionInactivePairs,
  selectionPairs,
  selectionSurfaces,
  selectionStyle,
  selectionWashPairs,
  statusTextSurfaces,
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
| `ColorForm` | The alpha form a colour role's value must take, derived from `colorForms`: `"opaque"` or `"translucent"`. |
| `ContrastFailure` | One documented pair a theme misses, with its floor and ratio, plus the wash, the opacity or the elevation `level` when the pair is composited. |
| `ContrastPair` | A `[foreground, background, pairClass]` contract row. |
| `ContrastPairClass` | The floor class a pair is held to. |
| `ContrastRing` | The two tones and thickness of a ring that stays visible on arbitrary content. |
| `ControlSize` | `"sm"`, `"md"` or `"lg"`, derived from `controlSizes`. |
| `Density` | Resolved control heights, padding and row height for a preset. |
| `DensityName` | A preset name from `densityNames`. |
| `DensityOverrides` | Partial density metrics and the preset they start from; they merge size by size. |
| `Dimensions` | Fixed surface metrics: overlay, field, dialog, calendar, time-segment, toast, preview-card, drawer, chat and avatar-mark sizes. |
| `DirectionFailure` | An interaction ladder step that moves toward the canvas, with both luminances. |
| `DisabledControlStyle` | The designed disabled state: cleared opacity, the disabled fill, its label and the control edge. |
| `Elevation` | Elevation levels keyed by `ElevationLevel`. |
| `ElevationLevel` | `"sm"`, `"md"`, `"lg"` or the reserved, empty `"overlay"`, derived from `elevationLevels`. |
| `ElevationShape` | A level's geometry plus the alpha applied to `shadow`. |
| `FilledControlFamily` | A filled control family from `filledControlFamilies`. |
| `FilledControlStyle` | The resting, hover and pressed fills and the one foreground. |
| `FocusRing` | `{ boxShadow }` for the focus ring. |
| `FontWeight` | A numeric CSS weight, `1…1000`; the shipped scale uses `400`, `500` and `600`. |
| `HighlightFailure` | A find-highlight pair that misses its floor: a text role under the secondary floor through a wash, or an active match that is not a perceivable step above the match. |
| `IconSize` | Icon sizes for `xs` to `xl`. |
| `IdentityShippedTheme` | An identity set in `shippedThemes`, with no platform style. |
| `InsetFocusRing` | The on-fill focus indicator: the family's on-colour and the outer ring's thickness. |
| `MetricFailure` | One metric a theme misses, with its group, rule and values. |
| `MetricGroup` | A group of theme metrics from `metricGroups`. |
| `MetricRule` | One of `metricRules`: `positive`, `non-negative`, `zero`, `finite`, `increasing`, `non-decreasing`, `at-least`, `at-most` or `within`. |
| `Motion` | Six timing levels and four easing phases. |
| `MotionEasing` | A cubic-bezier control-point tuple. |
| `MotionEasings` | The `standard`, `enter`, `exit` and `linear` curves. |
| `MotionLevel` | A timing level from `motionLevels`, `none` to `pulse`. |
| `MotionOverrides` | Partial timings and easings for `extendTheme` or a platform style's `structure.motion`. |
| `MotionPhase` | An easing phase from `motionPhases`: `"standard"`, `"enter"`, `"exit"` or `"linear"`. |
| `MotionTransition` | Transition properties in the runtime's seconds. |
| `NativeFieldTheme` | The runtime `theme` prop a native text field reads: `{ caret }`. |
| `NativeHighlight` | The `highlight` prop a native find bar paints: the match and active-match washes and the theme's inline-mark corner (`radius.sm`). |
| `NativeInlineCode` | The inline-code pair: the text field painted on its opaque wash, and the floor it must clear. |
| `NativeSyntaxTheme` | The 24 syntax capture colours a native code, diff or markdown surface paints. |
| `NativeSyntaxTint` | A syntax role painted on one of the native diff's row tints, with the tint's field and fraction. |
| `NativeTextChrome` | The three fixed font sizes the runtime paints its own diff chrome at: the meta line, the chrome line and the file path. |
| `NativeTextFade` | One `NativeTextTheme` field the runtime fades, with its fraction and floor class. |
| `NativeTextFailure` | One native document fade, two-fade composition, inline-code pair, chrome wash or ink wash a theme misses, with its field, role, surface and ratios. |
| `NativeTextMetrics` | The native text layout numbers derived from the theme's type, spacing and radius scales, plus the two runtime-only members a brand may set: the gutter floor and the diff accent bar. |
| `NativeTextOverFade` | Text painted over a second faded role, with both fractions. |
| `NativeTextTheme` | The complete runtime `theme` prop for a native `<code>`, `<diff>` or `<markdown>`. |
| `NativeTextWash` | One `NativeTextTheme` field the runtime paints on one of its fixed neutral ink washes, with the fraction and floor class. |
| `OpacityFailure` | A colour role whose alpha channel is not the form it is painted in, with the form it needed. |
| `PlatformName` | `"darwin"`, `"linux"`, `"win32"` or `"default"`. |
| `PlatformRecipeName` | `"xp"` or `"aero"`, a recipe beside the platform axis. |
| `PlatformShippedTheme` | A styled platform set in `shippedThemes`, with the variant it came from. |
| `PlatformStyle` | Editable platform data: types, structure, colours and elevation. |
| `PlatformStyleStructure` | Radii, density, motion timings and easings, type roles, spacing, borders, icon/avatar sizes and component dimensions shared by both modes. |
| `PlatformType` | The label and sans/mono families of one platform. |
| `PlatformVariant` | A platform that carries its own style: `darwin`, `linux` or `win32`. |
| `Radius` | The corner-radius scale. |
| `RecipeShippedTheme` | A recipe set in `shippedThemes`, with the recipe it came from. |
| `RingFailure` | A two-tone ring whose worst case over an arbitrary colour misses the mark floor. |
| `SelectionStyle` | `{ selectionColor }` for inherited text selection. |
| `ShippedTheme` | One shipped set, discriminated by `source`: identity, platform or recipe. |
| `Spacing` | The spacing scale shared by padding, margin and gap. |
| `StateLadder` | One interaction ladder: a resting fill and its pointer states. |
| `StateLadderName` | A ladder from `stateLadderNames`: the four filled families plus `softAction`, `wash`, `selection`, `selectionPress` and `rowPress`. |
| `StatusTone` | `"info"`, `"success"`, `"warning"` or `"destructive"`. |
| `StatusToneStyle` | The four roles a soft status surface needs. |
| `TextRole` | A key of `textRoles`, excluding the family fields. |
| `TextStyle` | Font size, line height and weight for one role. |
| `TextStyleProperties` | A resolved role for `StyleDesc`, family included. |
| `TextTierFailure` | A text tier that is not one step below the tier above it, with both ratios and the step. |
| `Theme` | A complete resolved theme. |
| `ThemeChoice` | A persisted theme choice: five unknown axes for `resolveThemeChoice`. |
| `ThemeChoiceKey` | A query key from `themeChoiceKeys`. |
| `ThemeColors` | The 71 semantic colour roles. |
| `ThemeConfig` | Input to `createTheme`: a mode, a palette selector and overrides. |
| `ThemeContrast` | `"default"` or `"high"`. |
| `ThemeFailure` | One defect from `themeFailures`, tagged `color`, `opacity`, `typeface`, `contrast`, `ring`, `highlight`, `nativeText`, `hierarchy`, `direction` or `metric`. |
| `ThemeFailureKind` | The check that found a `ThemeFailure`; one member of `themeChecks`. |
| `ThemeMode` | `"light"` or `"dark"`. |
| `ThemeOverrides` | A partial theme for `extendTheme`. |
| `ThemeParamSource` | The lookup a URL search object provides: `get(key)` returning a string, `null` or `undefined`. |
| `ThemeProviderProps` | Props for `ThemeProvider`. |
| `TranslucentRole` | A role from `translucentRoles`, the three roles the runtime composites. |
| `TypefaceFailure` | A family name that is not one exact, non-empty family the runtime can resolve. |
| `TypefaceRole` | `sans` or `mono`, a key of `typefaceRoles`. |
| `TypefaceRule` | `non-empty`, `trimmed`, `single-family`, `quoted` or `css-generic`, a key of `typefaceRules`. |
| `Typography` | The sans/mono families and ten type roles. |
| `TypographyOverrides` | Partial families and roles; roles merge field by field. |

## Colour roles

Components use semantic roles, never ramp shades. The role names describe
intent, so a brand theme changes values without touching component source.
`border` is decorative; `borderStrong` is the essential control boundary held
to 3:1 (4.5:1 at high contrast) on the plain surfaces, the `muted` panel, the
`hover`/`active`/`accent`/`selected` washes a bounded control sits on, and the
four soft status fills a tone-tinted Alert or Badge paints. A bordered
control paints `border` on the fill behind it —
`secondary` at rest, `secondaryHover`/`secondaryActive` while a filled neutral
control is hovered or pressed, the generic `hover`/`active` washes on a ghost or
outline control, and `accent` for an outline toggle that is on — so the divider
is held to its floor on those fills too, not only on the plain surfaces.

There are 71 roles. The four status families — `info`, `success`, `warning` and
`destructive` — each have three tonalities and a designed edge: a solid fill with
a readable foreground on it, a soft pair (`xSoft` / `xSoftForeground`) with an
edge (`xSoftBorder`) for a tone-tinted Alert or Badge, and a text role (`xText`)
for status labels, icons and indicator dots drawn on `background`, `card` or
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

A status panel's action is a family of its own: `softAction` with
`softActionHover`/`softActionActive` and `softActionForeground`. The neutral
washes cannot be perceived on a tone tint — 84 of the 288 shipped fill-on-tint
pairs measured under 1.05:1 — so the action inside a tone-tinted Alert or Badge
panel is a raised fill instead (see
[An action inside a status panel](#an-action-inside-a-status-panel)).

The same fill-versus-text split applies to the brand action. `primary` is a
surface: it carries `primaryForeground`, and it is measured only as a fill.
Brand-toned text — a link, a label, an icon — reads `primaryText`, held to
4.5:1 on `background`, `card`, `popover` and `muted`, on the `hover` and
`active` washes the Link variant paints behind its own label, on the
`accent`/`selected` fills a selectable row paints under it and the pressed
`selectedActive` it keeps, and on the four soft status fills a link in a status
panel sits on. The split is not
cosmetic: the macOS accent `#0071E3` measures 4.21:1 on that canvas and 3.44:1
on the pressed wash, while its text step `#00478F` clears both.

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
| `primaryText` | `#4C39B5` | `#C7CBFF` | brand-toned text, links, icons and the native field caret on plain surfaces, the `accent`/`selected`/`selectedActive` row fills, inline code on the `accent` wash and through a text selection |
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
| `softAction` | `#FFFFFF` | `#3A414D` | raised action on a soft status panel |
| `softActionForeground` | `#191D25` | `#F6F8FB` | text and icons on `softAction` and on the panel a ghost action rests on |
| `softActionHover` | `#F5F5F5` | `#454D5B` | `softAction` while hovered, and a ghost action's hover wash |
| `softActionActive` | `#EBEBEB` | `#4C5462` | `softAction` while pressed, and a ghost action's press wash |
| `infoText` | `#1B45AC` | `#C5D8FF` | info text and indicators on `background`/`card`/`popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes and the pressed `selectedActive` |
| `successText` | `#0E5739` | `#A8F0C6` | success text and indicators on `background`/`card`/`popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes and the pressed `selectedActive` |
| `warningText` | `#6B4500` | `#FFDE8A` | warning text and indicators on `background`/`card`/`popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes and the pressed `selectedActive` |
| `destructiveText` | `#8F2126` | `#FFC6C6` | destructive text and indicators on `background`/`card`/`popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes and the pressed `selectedActive` |
| `border` | `#D6DAE1` | `#343B47` | dividers and decorative borders |
| `borderStrong` | `#737C8C` | `#868FA0` | essential control boundaries, including on row washes and soft status fills |
| `input` | `#FFFFFF` | `#191D25` | input field background |
| `inputForeground` | `#191D25` | `#EEF1F5` | text typed into an input, on the `input` fill, the `background`/`card`/`popover`/`muted` surfaces a transparent field paints, the `hover`/`active`/`accent`/`selected`/`selectedActive` washes a field inside a row paints and the four soft status fills a field inside a status panel paints |
| `placeholder` | `#5A6372` | `#A8B0BD` | a hint the consumer renders on the `input` fill, the `background`/`card`/`popover`/`muted` surfaces a transparent field paints, the `hover`/`active`/`accent`/`selected`/`selectedActive` washes a field inside a row paints and the four soft status fills a field inside a status panel paints (a native field paints its own grey; see [Native text fields](#native-text-fields)) |
| `ring` | `#4C39B5` | `#A7A9FF` | focus ring; the value groove a focused slider's thumb sits on |
| `selection` | `#7567F23D` | `#A7A9FF24` | text selection wash (24% light, 14% dark; `selectionColor`) |
| `selectionOnFill` | `#00000026` | `#FFFFFF26` | text selection veil for content painted on an opaque filled surface — a filled action or a solid status chip (15% in both modes; `selectionColor`) |
| `overlay` | `#00000073` | `#000000A6` | modal scrim; the face a dialog paints on it is measured through the wash |
| `hover` | `#EEF1F5` | `#262C36` | hover wash for ghost surfaces |
| `active` | `#E1E5EC` | `#2E3543` | pressed wash; one step from the `accent` row hover |
| `selected` | `#E0E3FF` | `#402F94` | selected row or item, one step past the `accent` hover wash |
| `selectedActive` | `#E7EAFF` | `#312471` | selected row or item while pressed; a step toward the canvas, because the press previews deselection |
| `selectedForeground` | `#3B2C8F` | `#C7CBFF` | text on `selected` |
| `disabled` | `#EEF1F5` | `#222730` | disabled surface (kept near the panel; the control's `border` edge carries its shape) |
| `disabledForeground` | `#545D6C` | `#B0B8C6` | disabled text, held to the `inactive` floor |
| `skeleton` | `#CBD1DB` | `#434C5A` | loading placeholder |
| `track` | `#D5D9E2` | `#3D4552` | the unfilled groove of a progress bar, meter or slider rail |
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
`active`, `accent`, `selected`, and the pressed `selectedActive`).

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
the `muted` quiet panel a sidebar or settings group paints, and the row washes
a row paints (`hover`, `active`, `accent`, `selected` and the pressed
`selectedActive`); it is held to
4.5:1 in the default themes and 7:1 in the high-contrast variants. That is not
theoretical: a warning label in a pressed row measured 4.22:1 on macOS light,
4.24:1 on Linux light and 4.36:1 on Windows light, and high-contrast light
measured 5.83:1 on `active` and 6.70:1 on `accent`/`selected` until plan `083`
moved the two warning steps. A status dot in a sidebar is the same role on the
quiet panel, which plan `314` put under the contract. A soft surface
is a surface in its own right: it is held to 1.05:1 against
`background`, `card`, `popover` and `muted`, so an Alert or Badge stays
perceivable on every shipped canvas, platform variants included. The `muted`
panel is the sidebar and settings-group surface, and it is the composition that
forced the list: the platform light variants change it and inherit the tints, so
a status badge sat at 1.023:1 on Linux light, 1.036:1 on macOS light and 1.043:1
on Windows light until plan `300` moved the four light tints one small step
deeper. Every soft-fill list is derived from the tone index (`statusTones`): a
fifth status family joins its tint's surface, text, edge, ring, inactive, track,
scrim and selection pairs from that one edit.

The label itself is indexed too: `statusTextSurfaces` is the ordered list a
status label, icon or dot paints on — `background`, `card`, `popover`, the
`muted` quiet panel, the four state washes and the pressed `selectedActive`. The `xText` pairs derive from
`statusTextSurfaces` and the tone index, so a fifth family's label joins the
contract with the same one edit.

Because the solid role is a fill, it is held like one: `statusFillPairs`
measures each of the four solid fills on the nine surfaces a status chip sits
on — `background`, `card`, `popover`, the `muted` panel, the four row washes and
the pressed `selectedActive` — at 1.05:1 in both contrast levels. The tightest shipped pair is
**1.244:1** (XP light `warning` on `active`), so the pairs guard an edited
theme rather than a shipped value. A status *dot* is still `xText`: a fill that
is perceptible as a large chip is not a mark, and the light `warning` fill is
1.78:1 on the canvas, under the 3:1 a mark needs.

The shipped Toast is the one exception to that split: `toast/viewport.tsx`
places its tone glyph and its 3px tone bar with `xSoftForeground` on the
`popover` card rather than on a soft fill. That composition is held at the
secondary floor as `toastTonePairs` until `components` moves the glyph to
`xText`; every shipped set clears it with a wide margin (**11.98:1** at the
tightest, Linux dark `infoSoftForeground`), so the pair is a guard against an
edited theme, not a change to the palette.

The edge is a role, not a mixture: `xSoftBorder` is designed per tone and
measured on the fill it borders and on the nine surfaces a chip sits on
(`background`, `card`, `popover`, the `muted` panel, the `hover`, `active`,
`accent`, `selected` washes and the pressed `selectedActive`) at the divider floor: 1.05:1 in the default
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
designed edge, the plain-surface text role and the solid fill with its on-colour:

```ts
import { getTheme, statusTone } from "@gpuixui/tokens";

const theme = getTheme("light");
const tone = statusTone(theme, "info");
tone.background; // theme.colors.infoSoft
tone.foreground; // theme.colors.infoSoftForeground
tone.border; // theme.colors.infoSoftBorder
tone.text; // theme.colors.infoText — labels and dots on plain surfaces and row washes
tone.solid.background; // theme.colors.info — the solid chip fill
tone.solid.foreground; // theme.colors.infoForeground — readable on it
```

A tone can arrive as data — a server payload, a stored notification. It is
`unknown` until narrowed: `isStatusTone(value)` accepts the four shipped
families and falls back at the caller.

```ts
import { isStatusTone, type StatusTone } from "@gpuixui/tokens";

const resolveTone = (value: unknown): StatusTone =>
  isStatusTone(value) ? value : "info";
```

A runnable example spreads the result onto a container and its text, and
`statusSolidStyles` does the same for a solid chip; see
[`src/status-tone.example.ts`](../packages/tokens/src/status-tone.example.ts).
[`src/status-text.example.ts`](../packages/tokens/src/status-text.example.ts)
does the same for a status label and an indicator dot on a plain surface.

### An action inside a status panel

A status panel carries actions — a dismiss control, a "Try again" button — and
they are the one composition the canvas washes cannot serve. In each mode the
four soft fills sit in a narrow luminance band (light `0.657–0.765`, dark
`0.012–0.039`), so a neutral wash tuned for the canvas has almost the tint's own
value there: of the 288 shipped `hover`/`active`/`secondary`-on-`xSoft` pairs,
**84** are under the 1.05:1 floor, the worst Windows light `active` on
`destructiveSoft` at **1.0042:1** (`#E0E0E0` on `#FFD6D6`). A press that
composites to its own panel is not a state, and `themeContrastFailures` returned
`[]` because no pair measured it.

`softAction(theme)` returns the family a tone-tinted Alert or Badge panel
paints for its action: a raised neutral fill, its hover and press, and the one
foreground readable on all three. A filled action uses all four; a ghost action
skips the resting fill and paints `softActionHover` and `softActionActive` on
the panel with the same foreground.

A disabled panel action keeps the resting `softAction` fill and paints
`disabledForeground`; it does not step, because a disabled control receives no
pointer state. The raised fill is the action's shape, not its state: the canvas
`disabled` fill is not a panel shape, measuring **1.0066:1** on XP light's
`warningSoft` and **1.0242:1** on the high-contrast dark `destructiveSoft`,
under the 1.05:1 surface floor. A ghost disabled action keeps no fill — the
label sits on the panel, which `inactiveSoftPairs` already measures. The
resting label is `inactivePanelActionPairs`, and it must stay a perceivable
step below the enabled `softActionForeground` on the five surfaces the two
labels share (see [Text hierarchy](#text-hierarchy));
`softActionHover`/`softActionActive` are deliberately outside the pair list
because a disabled control never reaches them.

A Toast is a `popover` card, not a tinted panel: `toast/viewport.tsx` paints the
card `popover` and tones only the glyph and the 3px bar. `softAction` equals that
card in every light shipped set (**1.0000:1**), so a Toast action paints the
canvas neutral family instead — `filledControl(theme, "secondary")` or the four
`secondary` roles — which the contract measures on `popover`.

```ts
import { getTheme, softAction } from "@gpuixui/tokens";

const action = softAction(getTheme("light"));
action.background; // "#FFFFFF" — the raised fill
action.foreground; // "#191D25" — readable on all three fills
action.hover; // "#F5F5F5"
action.active; // "#EBEBEB"
```

The family is measured (`softActionPairs`, `softActionStepPairs` and
`softActionLabelPairs`) in every shipped set at both contrast levels: each fill
clears 1.05:1 on the four soft fills, the hover and press are one 1.05:1 step
from the fill before them, and the foreground clears the on-colour floor on all
three. It is inherited by every platform variant and recipe because the soft
panels themselves are inherited, so a platform style keeps one panel action
across the four tints. The `components` migration — the documented
`<Button>Try again</Button>` and `AlertDismiss` — is recorded in `TODO.md`; the
neutral washes are not a supported action surface inside a status panel, and
§ [Limitations](#limitations-and-future-work) states the measurement.

A runnable example of the panel's text roles is
[`src/status-panel.example.ts`](../packages/tokens/src/status-panel.example.ts).

## High contrast

Each mode has a high-contrast variant for accessibility. It is an ordinary
`Theme` — the same 71 roles and the same type, spacing, radius, density,
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
| `primaryText` | `#241C5C` | `#E0E3FF` | brand-toned text, links, icons and the native field caret on plain surfaces, the `accent`/`selected`/`selectedActive` row fills and through a text selection |
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
| `softAction` | `#FFFFFF` | `#343B47` | raised action on a soft status panel |
| `softActionForeground` | `#000000` | `#FFFFFF` | text and icons on `softAction` and on the panel a ghost action rests on |
| `softActionHover` | `#F5F5F5` | `#454D5B` | `softAction` while hovered, and a ghost action's hover wash |
| `softActionActive` | `#EBEBEB` | `#4C5462` | `softAction` while pressed, and a ghost action's press wash |
| `infoText` | `#102352` | `#DEE9FF` | info text and indicators on `background`/`card`/`popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes and the pressed `selectedActive` |
| `successText` | `#082C1D` | `#D3F9E2` | success text and indicators on `background`/`card`/`popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes and the pressed `selectedActive` |
| `warningText` | `#3A2500` | `#FFEFC6` | warning text and indicators on `background`/`card`/`popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes and the pressed `selectedActive` |
| `destructiveText` | `#4E1215` | `#FFE0E0` | destructive text and indicators on `background`/`card`/`popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes and the pressed `selectedActive` |
| `border` | `#575E6B` | `#A0A0A0` | dividers and decorative borders |
| `borderStrong` | `#4A4F58` | `#AAAAAA` | essential control boundaries, including on row washes and soft status fills |
| `input` | `#FFFFFF` | `#0D0D0D` | input field background |
| `inputForeground` | `#000000` | `#FFFFFF` | text typed into an input, on the `input` fill, the `background`/`card`/`popover`/`muted` surfaces a transparent field paints, the `hover`/`active`/`accent`/`selected`/`selectedActive` washes a field inside a row paints and the four soft status fills a field inside a status panel paints |
| `placeholder` | `#3B3E45` | `#D1D1D1` | placeholder text |
| `ring` | `#4C39B5` | `#C7CBFF` | focus ring |
| `selection` | `#7567F24D` | `#4C39B54D` | text selection wash (30% alpha; `selectionColor`) |
| `selectionOnFill` | `#00000026` | `#FFFFFF26` | text selection veil for content painted on an opaque filled surface — a filled action or a solid status chip (15% in both modes; `selectionColor`) |
| `overlay` | `#000000A6` | `#FFFFFF26` | modal scrim; the face a dialog paints on it is measured through the wash |
| `hover` | `#E8E8E8` | `#2E2E2E` | hover wash for ghost surfaces |
| `active` | `#D6D6D6` | `#3D3D3D` | pressed wash |
| `selected` | `#D8DBFF` | `#33257A` | selected row or item, one step past the `accent` hover wash |
| `selectedActive` | `#E1E4FF` | `#271C5D` | selected row or item while pressed; a step toward the canvas, because the press previews deselection |
| `selectedForeground` | `#1C1547` | `#E0E3FF` | text on `selected` |
| `disabled` | `#E8E8E8` | `#2E2E2E` | disabled surface (kept near the panel; the control's `border` edge carries its shape) |
| `disabledForeground` | `#444444` | `#D0D0D0` | disabled text, held to the `inactive` floor |
| `skeleton` | `#B0B0B0` | `#565656` | loading placeholder |
| `track` | `#C6C8CD` | `#414141` | the unfilled groove of a progress bar, meter or slider rail |
| `scrollbar` | `#9A9A9A` | `#8A8A8A` | scrollbar thumb (reserved: no tint in 0.10.0) |
| `shadow` | `#000000` | `#FFFFFF` | elevation tint (opaque; each level applies its own alpha; light on the pure black AAA canvas) |

## Typography

Families come from the platform table: `sans` is `systemUiFont` (GPUI's
`.SystemUIFont` sentinel) and `mono` is the current platform's family. The
shipped weights are `400`, `500` and `600`; `FontWeight` is a number in
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

`fontWeights` is the ascending set the shipped scale uses — `400`, `500` and
`600` — and the weights a bundled font has to provide; it is derived from the
roles, not a second list. A brand may still name any weight in `1…1000`.

The manifest a bundler loads is
[`src/font-weights.example.ts`](../packages/tokens/src/font-weights.example.ts).

The scale is two exported ladders: `proseLadder` (`display` → `caption`) and
`codeLadder` (`code` → `codeBlock`). `bodyStrong` shares `body`'s size and is a
weight variant, so it is on neither. `themeMetricFailures` holds an edited theme
to the same order.

`textStyle(theme, role)` resolves a role to GPUix style properties, choosing the
mono family for `code` and `codeBlock`:

```tsx
import { getTheme, textStyle } from "@gpuixui/tokens";

const theme = getTheme("light");

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
| `default` (Default) | `.SystemUIFont` | `Menlo` / `DejaVu Sans Mono` / `Consolas` | 4 / 6 / 8 / 12 | `comfortable` | `#5F4BDB` | `#A7A9FF` |

A row states the **resolved** theme: a style that names one radius inherits the
rest, and a density override prints the preset it starts from. The Default row
names the identity's mono on each shipped platform, because
`getPlatformTheme("default", mode)` returns the identity unchanged and
`systemMonoFamily` is the running platform's installed family.

The Default variant has no overrides — `getPlatformTheme("default", mode)`
returns the identity unchanged, mono included. Each real variant changes its type family,
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

A `"high"` request on any other base builds the same AAA palette, so a contrast
toggle cannot return a theme below the level it asked for.

The result carries the level it declares, and the level is decided once. A
`"high"` request always builds the AAA palette of the base's mode — a style's
colours are designed at the default floors, so they never repaint it, while the
platform still contributes its geometry and the AAA `shadow` tint keeps the
opacity designed against it. A `"default"` request builds the default palette
when the style contributes colours, taking the roles it does not name from the
default-level identity of the same mode, so the result is a whole palette rather
than half of one (plan `373`). A role the style sets to `undefined` is unnamed
too: it inherits from that palette, never from the AAA base the request is
leaving (plan `551`). The elevation is the same decision: a level the style
does not name comes from the palette the request resolved, so a copied style
that names no shadow keeps a default request's elevation opacity instead of
inheriting the AAA alphas the request is leaving (plan `618`). Omitting the
argument, or naming the level the base already declares, keeps the base's
palette: a consumer's edits and a style's unnamed roles survive, and the result
keeps the base's name. The name always
follows the palette — a rebased palette brings the identity's name, because the
result is that identity at the requested level — and so does the elevation's
opacity, because a dark platform's 0.4–0.8 over the AAA dark set's light tint
would paint a near-white halo (plan `505`). Applying the style a theme's name
already ends with changes nothing — no field, and not the name — so a settings
panel or a restored choice can re-apply the platform over the current theme
without printing `Light · Windows · Windows`. A different style appends its own
label once, because it names only the roles it owns (plan `545`). A style with
no colour overrides changes no colour, so it keeps the base's level (plan
`301`); that is the one
request that is not honoured, and the theme's name says so. A colour key set to
`undefined` is not an override either: the role inherits and the declaration
stays with the base (plan `323`). A runnable example lives in
[`applied-level.example.ts`](../packages/tokens/src/applied-level.example.ts):
it resolves a high request on a default theme, a same-level brand base and the
shipped resolver, and asserts the level each carries.

### Authoring a platform style

A style file is plain data. Copy one from `platform-styles/` and keep the shape;
every field inside `structure` is optional, and every omitted role or level
inherits the identity:

```ts
interface PlatformStyle {
  types: PlatformType; // label, sans, mono
  structure: {
    radius?: Partial<Radius>;
    density?: DensityName | DensityOverrides;
    motion?: MotionOverrides;
    typography?: Partial<Record<TextRole, Partial<TextStyle>>>;
    spacing?: Partial<Spacing>;
    borderWidth?: Partial<BorderWidth>;
    iconSize?: Partial<IconSize>;
    avatarSize?: Partial<AvatarSize>;
    dimensions?: Partial<Dimensions>;
  };
  colors: Record<ThemeMode, Partial<ThemeColors>>;
  elevation: Record<ThemeMode, Partial<Elevation>>;
}
```

A style owns its **whole look**, not only its colours: the type scale exists
beside the families, and spacing, borders, icon/avatar sizes and component
dimensions travel with radii, density and motion. Motion carries timings and the
easings inside `ease`; each omitted value inherits, exactly like `extendTheme`.
Families live in `types`
(never in `typography`, so a style cannot name two UI faces), and each group
merges field by field exactly like `extendTheme`. These groups are structural:
they apply at both contrast levels, because they are geometry, not colour.

Density is a preset plus the metrics tuned inside it: a `DensityName` replaces
the base theme's metrics, and `{ preset, …metrics }` tunes the named preset
instead of the base's — `density: { preset: "compact", rowHeight: 30 }` keeps
compact's control heights and padding and raises only the row it paints. A style
that names no density inherits the base theme's, metric overrides included.

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

A second complete file,
[`src/platform-extension.example.ts`](../packages/tokens/src/platform-extension.example.ts)
(`contosoDensityPlatformStyle`), names every numeric group — type roles,
density, spacing, borders, icon and avatar sizes and component dimensions — and
carries its own motion timing and easing, so the copy-and-own path is shown for
geometry and motion as well as colour. Its density is
`{ preset: "compact", rowHeight: 30 }`, the preset-plus-metrics form above, so
the file keeps a named preset and still owns one metric inside it. It is applied
in both modes and held to `themeFailures`, because a copied style is still an
edited theme.

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
each result to every check (plan `374`).

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
is the whole recipe — copy it, edit its values, and apply it with
`applyPlatformStyle`, exactly like a shipped variant.

A fill moves with its family. A recipe's `primary` is painted as a mark and
carries its label, so editing it alone leaves the inherited Windows foreground
and the old hover and pressed states behind: the block this page used to show
measured **3.999:1** for the label on its new fill, **2.696:1** as a mark on a
card, popover, the quiet panel or a field, **2.882:1** on the value groove and
**2.233:1** on the hover wash — seven failures from `themeFailures` (plan
`658`). The executed
[`src/recipe-edit.example.ts`](../packages/tokens/src/recipe-edit.example.ts)
moves the whole family and is held to the contract.

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
    dark: {
      ...platformRecipes.aero.colors.dark,
      primary: "#5CB8FF",
      primaryForeground: "#001A33",
      primaryHover: "#8CCFFF",
      primaryActive: "#A6DBFF",
      primaryText: "#8CCFFF",
    },
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
shadow. The recipes stop where the runtime does. Aero also names the XP steps
for `successText` and `destructiveText` (`#0E5135`, `#7E1D21`) so a find match
inside a code block keeps the secondary floor through the active wash on the
painted code surface (plan `582`).

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
import { controlHeight, controlPaddingX, getTheme } from "@gpuixui/tokens";

const theme = getTheme("light");

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

A metric override can name the preset it starts from, which is how a copied
platform style keeps a preset it did not ship in:

```ts
import { extendTheme, lightTheme } from "@gpuixui/tokens";

const roomyCompact = extendTheme(lightTheme, {
  density: { preset: "compact", rowHeight: 30 },
});
```

`roomyCompact` names `compact` and keeps compact's 24 / 28 / 32 heights and
6 / 8 / 10 padding while raising the row to 30. Without `preset`, the metrics
merge over the base theme's density and keep its name.

`defaultDensity` is the `comfortable` preset, and every built-in theme uses it.
A theme's `density` always names the preset it is based on — the preset an
override names, or the base theme's when it names none.

`densityNames` lists the three presets in documentation order, and
`DensityName` derives from it, so a preset cannot exist without a table row or a
value in `densityPresets`. A persisted density is `unknown`; narrow it with
`isDensityName` before it reaches `extendTheme` — `themeWithDensity` in
[`src/persisted-choices.example.ts`](../packages/tokens/src/persisted-choices.example.ts)
returns the theme unchanged for a value the library does not ship, and
`resolveThemeChoice` applies the same rule:

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
| `dimensions.overlayMinWidth` | 180 | narrowest menu surface; holds the surface's `spacing.xs` padding, a row's padding, icon, gap and one `label` glyph inside its two borders |
| `dimensions.overlayWidth` | 220 | default combobox and navigation-menu width |
| `dimensions.overlayMaxHeight` | 320 | the height at which a long overlay list scrolls; held to one `density.rowHeight` |
| `dimensions.fieldMinWidth` | 200 | narrowest field that shows a query and an action; holds its padding, the `md` leading icon, the query, the `fieldAdornmentSize` action, their two gaps and the field's two borders, or a token-input chip |
| `dimensions.fieldAdornmentSize` | 16 | trailing clear control (or other adornment) inside a field; holds one `caption` line, the glyph its clear control paints; the leading query icon is `iconSize.md` |
| `dimensions.dateFieldWidth` | 220 | fixed date trigger width; holds its `spacing.md` insets, `spacing.md` gap, the `sm` disclosure icon and one `label` glyph inside its two borders |
| `dimensions.chipMinWidth` | 80 | minimum width of a token-input chip; its content box holds two `spacing.sm` insets, one `caption` glyph, the `spacing.xs` gap and the `fieldAdornmentSize` remove control |
| `dimensions.toastWidth` | 380 | fixed toast card width; holds its padding, its `toastToneBarWidth` tone bar, tone icon, two `lg` gaps, the square `sm` dismiss control and one `bodyStrong` title inside its two borders |
| `dimensions.toastToneBarWidth` | 3 | the tone bar the Toast paints down its leading edge; charged inside `toastWidth` and at least `borderWidth.thin` |
| `dimensions.previewCardMinWidth` | 240 | narrowest preview card; leaves a content box inside its `spacing.lg` padding and its two borders |
| `dimensions.previewCardMaxWidth` | 360 | widest preview card |
| `dimensions.keycapSize` | 20 | fixed keycap a shortcut label sits in; held to one `caption` line plus its two borders |
| `dimensions.drawerWidthSm` | 320 | narrowest drawer; holds its left inset, the greater of the shell's two right insets and the close control's reach, and one `h3` title glyph inside its two borders |
| `dimensions.drawerWidthMd` | 400 | default drawer width; holds the same chrome as `sm` through the ladder |
| `dimensions.drawerWidthLg` | 560 | widest drawer; holds the same chrome as `sm` through the ladder |
| `dimensions.drawerHeightSm` | 240 | shortest bottom drawer; holds the close zone, one `density.rowHeight` row and its bottom padding inside its two borders |
| `dimensions.drawerHeightMd` | 320 | default bottom drawer height |
| `dimensions.drawerHeightLg` | 420 | tallest bottom drawer |
| `dimensions.chatViewportMinHeight` | 160 | shortest message viewport; holds one `density.rowHeight` inside its `spacing.md` padding and its two borders |
| `dimensions.carouselIndicatorSize` | 8 | inactive carousel indicator; at least `borderWidth.thin` |
| `dimensions.carouselIndicatorActiveWidth` | 18 | active carousel indicator's width; at least the idle dot |
| `dimensions.timelineMarkerSize` | 8 | event dot on a timeline rail; at least the rail's width (`borderWidth.thin`) |
| `dimensions.timelineMarkerColumnWidth` | 16 | column the dot and its connector sit in; at least the marker |
| `dimensions.dialogWidthSm` | 360 | small dialog's maximum surface width; holds its left inset, the greater of the shell's two right insets and the close control's reach, and one `h3` title glyph inside its two borders |
| `dimensions.dialogWidthMd` | 480 | default dialog's maximum surface width; holds the same chrome and two borders as `sm` through the ladder |
| `dimensions.dialogWidthLg` | 640 | large dialog's maximum surface width; the three sizes must grow and each holds the `sm` chrome and two borders |
| `dimensions.calendarCellSize` | 34 | one calendar day cell; at least a `sm` control |
| `dimensions.timeSegmentWidth` | 26 | hours or minutes segment of a time field; at least 1.3 `body` ems (two tabular digits), rounded up to a pixel |
| `dimensions.avatarPresenceDotSize` | 10 | presence dot on an avatar; at least `borderWidth.thin` and at most half the smallest avatar the theme carries |
| `dimensions.notificationPanelWidth` | 320 | anchored notification inbox width; holds a row's padding, unread dot, gap and one `bodyStrong` title inside its two borders |
| `dimensions.notificationPanelMaxHeight` | 380 | inbox maximum height; at least the list maximum plus its header (its padding, one `sm` action and its own rule) and the panel's two borders |
| `dimensions.notificationListMaxHeight` | 280 | notification list scroll height; held to one `density.rowHeight` |
| `dimensions.notificationUnreadDotSize` | 6 | unread marker on a notification row; at least `borderWidth.thin` |

A keycap is a fixed surface, not a spacing decision: its content box holds one
`caption` line plus its two borders, and the metric contract reports a theme
whose caption leading outgrows it.

A field's adornment is a fixed surface of the same kind: the clear and remove
controls in SearchInput, TimePicker, HotkeyRecorder and the TagInput chip paint
the `caption` role, so the square holds one `caption` line — a theme that grows
that leading without growing the adornment clips the glyph (plan `638`).

Every fixed surface paints its two `borderWidth.thin` edges **inside** its own
width or height, so each bound below includes `2 * borderWidth.thin`: the menu
minimum, the Toast card, the notification inbox, and the dialog and drawer
shells, exactly as a control or a field does (plan `627`).

Five fixed surfaces hold the chrome painted inside them, not only a positive
size. A toast card is `2 * spacing.lg + toastToneBarWidth + iconSize.md +
spacing.lg + typography.bodyStrong.fontSize + spacing.lg +
density.controlHeight.sm + 2 * borderWidth.thin` at least — its padding, the
tone bar it paints down its leading edge, its tone icon, the gap beside it, one
title glyph, the gap after the title and the square `sm` dismiss control, with
the optional action left to consumer content, inside the card's two borders. The
notification inbox is
`2 * spacing.lg + notificationUnreadDotSize + spacing.sm +
typography.bodyStrong.fontSize + 2 * borderWidth.thin`, the row's padding,
unread dot, gap and title inside the inbox's two borders. The narrowest overlay
holds `2 * spacing.xs + 2 * spacing.md + iconSize.md + spacing.md +
typography.label.fontSize + 2 * borderWidth.thin`: the menu surface's own
padding, a row's two insets, its leading icon, gap and one label glyph (the 2px
highlight bar is paid for out of the left padding), inside the menu surface's
two borders. A message viewport holds
`density.rowHeight + 2 * spacing.md + 2 * borderWidth.thin` — one row inside its
own padding and borders — and a preview card holds
`2 * spacing.lg + spacing["2xs"] + 2 * borderWidth.thin`: its padding, one
hairline of content box and its two borders. Each bound reads the theme's own
metrics, so widening a type role, a spacing step or a border moves it. The
shipped `380 / 320 / 180` clear the three content bounds by
`3.42× / 6.15× / 2.86×`, and the 160px message viewport and 240px preview card
clear theirs at `3.20× / 8.57×`, so the rules guard an edited theme rather than
a shipped value, and no value moves (plans `620`, `627`, `631`, `636` and
`645`).

A drawer's width and height are ladders: `sm` → `md` → `lg` grows in both axes,
so a theme cannot make "large" narrower than "medium". A dialog's three surface
widths are a third ladder for the same reason — `lg` may not be narrower than
`md`. A dialog's and a drawer's smallest shell hold their own close control —
`spacing["2xl"] + max(2 * spacing["2xl"], spacing.lg + controlHeight.sm) +
typography.h3.fontSize + 2 * borderWidth.thin`, the left inset, the greater of
the shell's two right insets and the close control's reach, one title glyph and
the face's two borders — and a bottom drawer's smallest height holds
`max(spacing["2xl"], spacing.lg + controlHeight.sm) + density.rowHeight +
spacing["2xl"] + 2 * borderWidth.thin`: the close zone, one row, the bottom
padding and its two borders. At the shipped metrics the widths need 90px and the
height 98px, and the shipped `360 / 320 / 240` clear them at `4.00× / 3.56× /
2.45×`; a dialog's title still wraps, so this is the shell's non-reflow chrome,
not a minimum content width (plans `625`, `627` and `645`). A carousel's active mark may
elongate but never shrink below its idle dot,
and a message viewport holds at least one row inside its own padding and
borders. A timeline's marker is the same
kind of fixed mark: its dot is at least the `borderWidth.thin` connector it
sits on and no wider than the column that centres it, so a brand can size the
rail's mark without painting it outside the rail. The other fixed marks the
theme owns — the Toast's tone bar, the inbox's unread dot, a carousel indicator
and an avatar's presence dot — read the same hairline: each is at least
`borderWidth.thin`, because a mark below the smallest stroke a border may paint
does not read, while a zero or negative value keeps the `positive` rule's single
diagnostic (plan `643`). A calendar day is a control, so
its cell fits the theme's own small control; a time segment holds two body
digits (`HH`/`MM`), so it is at least 1.3 `body` ems wide — two tabular digits at
a 0.65em advance, rounded up to a whole pixel, and a theme that names a face with
wider digits must widen it; and an avatar's presence dot is at most half the
smallest avatar the theme carries, because it sits on that avatar's corner.

A notification inbox clips its contents, so its panel maximum contains its
header — `spacing.lg` padding on both sides, one `sm` action and the header's own
`borderWidth.thin` rule — and its list maximum, plus the panel's two borders. At
the shipped metrics the header is 53px and the panel needs 335px, which the
shipped 380 clears at `1.13×`; the list is held to one `density.rowHeight` like
every other scroll viewport, and the unread marker is a mark a brand can size
(plan `629`).

A date trigger is a fixed-width field, so `dateFieldWidth` holds it rather than
an overlay width. A calendar grid is seven `calendarCellSize` cells wide —
238px at the shipped 34px cell — before the popover's padding, so a calendar is
content-sized and `overlayWidth` names only the combobox and navigation menu.

A metric override merges field by field, like the spacing and radius scales:

```ts
import { extendTheme, lightTheme } from "@gpuixui/tokens";

const wider = extendTheme(lightTheme, {
  dimensions: { toastWidth: 420 },
});
```

A runnable example lives in
[`src/dimensions.example.ts`](../packages/tokens/src/dimensions.example.ts).

`dimensions` is inherited by every platform variant and recipe: overlay and
dialog widths, field chrome, card widths, the calendar cell, the time segment,
the avatar presence mark and the keycap size are shared surface metrics, not
platform conventions. A consumer who wants a narrower platform menu or a wider
dialog edits the group on the resolved theme.

## Elevation

A level is geometry, not a colour: `offsetX`, `offsetY`, `blurRadius`,
`spreadRadius` and the `alpha` to apply to the theme's `colors.shadow` tint.
`elevationShadow` composes the two into a shadow — the exact five fields of
GPUix's `StyleDesc.boxShadow` (`offsetX`, `offsetY`, `blurRadius`,
`spreadRadius`, `color`). There is no `inset` and no shadow list: **the runtime
paints one shadow per element.** The tint is opaque: a level's alpha writes the
fourth byte, so an eight-digit tint is reported by
[`themeOpacityFailures`](#role-opacity) rather than silently repainted.

| Level | Light | Dark | Use |
| ----- | ----- | ---- | --- |
| `sm` | `0 1 2 0 #191D2514` | `0 1 2 0 #00000066` | resting cards |
| `md` | `0 4 12 -2 #191D251F` | `0 8 24 -4 #000000A6` | menus and popovers |
| `lg` | `0 16 40 -8 #191D2529` | `0 24 56 -12 #000000CC` | dialogs and command palettes |
| `overlay` | `[]` | `[]` | reserved; overlay layering uses the scrim colour |

The AAA dark set is the exception to a dark tint: its canvas is pure black, so a
shadow cannot darken it. `colors.shadow` is `#FFFFFF` there and
`highContrastDarkElevation` carries the set's own alphas — 10%, 14% and 18% —
the way the AAA scrim already veils with light (plan `099`). A black tint
measured **1.000:1** at every level on that canvas. `elevationSurfaces` is the
six persistent page surfaces a raised element floats over — the canvas, a card,
the quiet `muted` panel, the `input` fill a flipped popover opens over, the
`selected` fill a context menu or preview card opens over and a floating
surface — and every defined level is measured
composited at its own alpha over them (`elevationLevels` is the ordered index,
the reserved `overlay` included). A menu or popover (`md`) also opens across the
fifteen resting content fills `elevationContentSurfaces` names — `primary`,
`secondary`, `accent`, `destructive`, `info`, `success`, `warning`,
`softAction`, `infoSoft`, `successSoft`, `warningSoft`, `destructiveSoft`,
`disabled`, `skeleton` and `track` — so its shadow is measured there too; a
`sm` card is placed in
the layout and a `lg` dialog sits on the scrim, which the face paragraph
measures instead. The tightest shipped pair is **1.058:1** (AAA dark, `md` on
`info`); over the page surfaces alone it is **1.061:1** (identity dark, `sm` on
`background`) and the AAA dark page pair is **1.207:1**.

At high contrast a platform style contributes a level's geometry while the base
theme's alpha stays with its tint. An alpha is designed against a tint, so a
dark-mode platform's 40–80% opacity would paint a near-white halo over the new
light AAA tint. At default contrast the style's tint, geometry and alpha all
apply, as before.

The table shows the resolved shadow. The tint itself is one role, so retinting
every level is one value:

```ts
import { extendTheme, getTheme } from "@gpuixui/tokens";

// Every elevation level now paints with a black tint, at its own alpha.
const theme = getTheme("light");
const brand = extendTheme(theme, { colors: { shadow: "#000000" } });
```

A level is a list so a web renderer can composite several shadows; a shipped
level carries at most one entry. A consumer reads the one the runtime paints
with `elevationShadow`, and the whole list with `elevationShadows`:

```tsx
import { elevationShadow, elevationShadows, getTheme } from "@gpuixui/tokens";

const theme = getTheme("light");

<div style={{ boxShadow: elevationShadow(theme, "md") }} />;

const layered = elevationShadows(theme, "lg"); // every entry, tint composed
```

`elevationShadow(theme, level)` returns the level's shadow, or `undefined` for
the reserved empty `overlay` level (which `boxShadow` accepts).
`elevationShadows` returns the resolved list. A shipped level with two entries
would silently render only the first, so
`packages/tokens/src/elevation.test.ts` fails if one appears, and
`elevation-tint.test.ts` fails if editing `colors.shadow` stops retinting a
level. The editable-theme contract applies the same count to every level: a
theme that declares a second shape gets an `at-most` metric failure naming the
level, because the native runtime paints only the first. `elevationShadows`
still resolves a web renderer's list; such a theme is simply outside the native
guarantee.

The reserved `overlay` level is empty in every shipped theme; a consumer that
defines it places a level above `lg`, and the numeric contract holds it to that
order. A runnable example is
[`src/elevation-overlay.example.ts`](../packages/tokens/src/elevation-overlay.example.ts).

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

`motionLevels` lists the six levels in this order and `motionPhases` the four
easing phases, so a table or a settings row iterates the index instead of
`Object.keys(motion)`.

Easings are named per phase: `standard` (`easeInOut`), `enter` (`easeOut`),
`exit` (`easeIn`) and `linear`. The runtime also takes a cubic-bezier tuple, so
`extendTheme(base, { motion: { ease: { enter: [0.4, 0, 0.2, 1] } } })` works
without a cast. A copied platform style may name the same curves in
`structure.motion`; each omitted phase inherits the identity's. The tuple is four
finite control points whose two x values must
lie inside `0…1`: the runtime's `validate_ease` rejects the whole transition
otherwise, and a curve outside that range has no progress function. A y value may
overshoot — a spring-like curve is a design choice — and a named easing is
constrained by `MotionEasing` itself. `themeMetricFailures` holds both rules, and
the timings must be finite as well as ordered, because the runtime rejects a
non-finite duration.

```tsx
import { getTheme, motionTransition } from "@gpuixui/tokens";

const theme = getTheme("light");

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

Runnable examples live in
[`src/motion.example.ts`](../packages/tokens/src/motion.example.ts) and
[`src/motion-levels.example.ts`](../packages/tokens/src/motion-levels.example.ts).

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

The smallest tier is the inline avatar: `avatarSize.xs` sits in a dense row,
which `ListItem` fixes at `density.rowHeight`, so the metric contract bounds it
by that row. The other three tiers are a facepile mark, the default and a
profile header; they are not row marks.

Runnable examples of the two bounds are
[`src/inline-icon.example.ts`](../packages/tokens/src/inline-icon.example.ts) and
[`src/inline-avatar.example.ts`](../packages/tokens/src/inline-avatar.example.ts).

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
only one), so the error colour becomes the focus indicator. `invalidFocusRing(theme)`
returns that ring: the same zero-offset, zero-blur geometry at
`borderWidth.strong`, painted from the error role, so a consumer does not have
to spread `focusRing` and replace its colour. `invalidRingPairs`
holds it to the boundary floor on the surfaces a control sits on, which are not
the field's own fill, the pressed `selectedActive` a focused field inside a
chosen row keeps included; `destructive` on `background` is shared with the
invalid field edge, and an invalid slider keeps the accent ring on its `track`
groove.

A slider is the one control whose ring is painted over its own value
indicator: the thumb is centred on the rail, so the shadow's left and right arcs
land on the `track` groove while its top and bottom land on the surface behind
the slider. `ringTrackPairs` holds `ring` on `track` to the boundary floor for
that reason. An invalid slider keeps the accent ring — it recolours the fill and
the thumb border, not `focusRing` — so the groove is deliberately not an
`invalidRingPairs` surface.

A focus indicator painted **inside** a filled control is a border, not the outer
shadow: a clipped button group, a calendar day whose cell is the fill, or a
selection box cannot draw outside its own box, and `ring` is designed for the
surface behind a control — it meets `primary` at **1.000:1** in **16** shipped sets. `insetFocusRing(theme, family)` returns the family's on-colour, which the
on-colour pairs already hold on the resting, hover and pressed fill
(4.697:1 at the tightest), at the outer ring's `borderWidth.strong`. A control
that already has a border applies `borderColor` alone.

A runnable example lives in
[`src/focus-ring.example.ts`](../packages/tokens/src/focus-ring.example.ts) and
[`src/inset-focus-ring.example.ts`](../packages/tokens/src/inset-focus-ring.example.ts);
a failed field's edge and error ring are
[`src/invalid-focus-ring.example.ts`](../packages/tokens/src/invalid-focus-ring.example.ts).

### A ring over arbitrary content

A marker on content the theme does not own — a colour swatch, a user-supplied
preview, a custom theme tile — cannot be one role: a ring painted with
`foreground` measures **1.000:1** on a `foreground` swatch. `contrastRing(theme)`
returns the theme's two extreme tones, `background` next to the content and
`foreground` outside it, at `borderWidth.strong`:

```tsx
import { contrastRing, getTheme } from "@gpuixui/tokens";

const theme = getTheme("light");
const ring = contrastRing(theme);
// {
//   inner: theme.colors.background,
//   outer: theme.colors.foreground,
//   width: theme.borderWidth.strong,
// }
```

For any content colour the two contrasts multiply to the tone pair's own ratio,
so the worst case over **every** colour is its square root:
`sqrt(contrast(outer, inner))`. The identity light pair guarantees **3.98:1** and
the AAA pairs **4.58:1**; the tightest shipped set (`Dark · Linux`) guarantees
**3.70:1**, above the 3:1 mark floor (4.5:1 at AAA). The outer tone's surface
side is already held by the body pairs — `foreground` on the four surfaces a
swatch sits on, the row washes and the soft status fills — and
`themeRingFailures(theme)` reports a theme whose worst case falls below the
floor.

Paint the inner tone as the border and the outer as a zero-blur shadow spread by
the same width:

```tsx
import { contrastRing, getTheme } from "@gpuixui/tokens";

const theme = getTheme("light");
const ring = contrastRing(theme);
const ringed = {
  borderColor: ring.inner,
  borderWidth: ring.width,
  boxShadow: {
    offsetX: 0,
    offsetY: 0,
    blurRadius: 0,
    spreadRadius: ring.width,
    color: ring.outer,
  },
};
```

That uses the runtime's single shadow slot, so the ringed element cannot also
carry an elevation shadow; a wrapper painting `outer` with `padding: ring.width`
around an inner border is the alternative. This is not the focus indicator: a
control's keyboard ring is `focusRing(theme)`, and a ring inside a filled control
is `insetFocusRing(theme, family)`. The executed composition is
[`src/contrast-ring.example.ts`](../packages/tokens/src/contrast-ring.example.ts)
and the regression suite is
[`src/ring.test.ts`](../packages/tokens/src/ring.test.ts).

## Text selection

GPUix 0.10.0 exposes `selectionColor` and `userSelect` as inherited `StyleDesc`
properties, so text the library paints itself is themeable. `selectionStyle(theme)`
maps the `selection` role to the property:

```tsx
import { getTheme, selectionStyle } from "@gpuixui/tokens";

const theme = getTheme("light");

<div style={selectionStyle(theme)}>{children}</div>;
```

Both selection properties inherit down the tree, so an application sets the wash
once on its root; chrome that must not be selectable — a toolbar, a tab strip,
window controls — sets `userSelect: "none"` on its own subtree. The wash is
translucent (24% in the light default theme, 14% in dark and 30% at high
contrast), so selected text keeps the body contrast on every surface a glyph can
be selected on: `background`, `card`, `muted`, `hover`, `active` and `accent`
with `foreground`; `popover` with `popoverForeground`; `input` with
`inputForeground`, and the same role on the `background`/`card`/`popover`/`muted`
tones, the `hover`/`active`/`accent`/`selected` washes and the four soft status
fills a transparent field sits on; and `selected` with both of the roles a
selected row paints — its title `foreground` at the body floor and its inherited
label `selectedForeground` at the secondary floor; a soft status surface carries
its own tone with `xSoftForeground`, its description with `foreground`, its
panel action with `softActionForeground`, its field's typed text with
`inputForeground` and its caption with `mutedForeground`. A card
carries two text roles — the default `foreground` a `CardTitle` paints and its
own `cardForeground`, which a context menu trigger sets on its `card` fill — so
both are measured through the wash. A surface can carry a second body role. A
menu row paints `popoverForeground` on the `hover`, `active` and `selected`
fills, and a selected row keeps its inherited `selectedForeground` on `hover`,
`active` and the `accent` a selectable row hovers, so `selectionPairs` measures
both through the wash beside the `foreground` the list-row title uses. The audit
found high-contrast light's inherited label at **6.693:1** on the pressed row's
wash, under 7:1, while every check returned `[]`; the value moves one iris step
(`#2E2370` → `#1C1547`) and the four resting fills measure **8.533:1** at the
tightest, no other colour moving.
Secondary text is held to the secondary floor through the same wash on all nine
surfaces (`mutedForeground`), because a row description, a card caption or a
message timestamp is selected with the body copy around it. A field's typed text
is measured separately: `selectionInputPairs` holds `inputForeground` through the
wash on the twelve surfaces a field sits on beyond its own `input` fill — the
four `Surface` tones, the four washes an in-place editor paints and the four soft
status fills. The `input` fill is the `inputForeground` pair in `selectionPairs`,
so the two lists together cover every surface the role is measured on at rest.
The hint is not typed text, so `placeholder` is deliberately absent, and so is
the pressed `selectedActive` row a reader does not select in. A theme may give a
field its own ink apart from `foreground`: an edited dark identity with
`inputForeground: "#D3D8E1"` returned `[]` from every check while its selected
text measured **5.657:1** on `selected`, under the body floor (plan `689`). Every
shipped set clears the floor as shipped, so no colour moves. The soft surfaces
are held in both directions too: `selectionSoftPairs` measures all four text
roles a status panel carries — the tone's `xSoftForeground`, the body
`foreground` its description paints, the panel action's
`softActionForeground`, and the caption `mutedForeground` — through the wash,
and `selectionSoftWashPairs` the wash's
own perceivability, so a selected Alert or Badge keeps its body and
secondary floors and still shows the highlight. Every shipped set passes: the
identity dark body on `infoSoft` is **8.14:1** at the tightest and Windows light's
caption on `destructiveSoft` **5.08:1**, so no colour moves. Status text is held
through the same wash on the same nine surfaces (`selectionStatusPairs`), because
`xText` is the role plan 083 gave a status label, icon or dot in a row and a
selectable row's label is dragged over with the copy around it. The audit found
XP light `successText` at 3.671:1 on `active`, Aero light at 3.721:1 on
`selected`, and every high-contrast light tone at 6.12–6.72:1 under the 7:1
floor while the dark sets already passed; the six light status roles move one
half-step between the ramp steps they used, so the tightest shipped pair is
**4.891:1** (Linux light `infoText` on `active`) and the AAA tightest
**7.370:1** (identity light high `warningText` on `active`). An accent-toned
link is the last text role the washed contract covers (`selectionLinkPairs`):
`primaryText` is
text a reader selects with the copy around it, and calling it a deliberate
omission hid twelve failing shipped sets — the AAA light link measured
**5.376:1** through the wash on `destructiveSoft` under its 7:1 floor, macOS dark
**3.708:1** on `selected`, Windows light 3.995:1, XP light 4.295:1, Aero light
4.022:1, macOS light 4.106:1 and Linux dark 4.485:1 under 4.5:1. Seven values
move one designed step inside their own families — AAA light `#3B2C8F` →
`#241C5C`, macOS `#0055B3` → `#004A9A` in light and `#64B5FF` → `#96CDFF` in
dark, Linux dark `#99C1F1` → `#A5CBF5`, Windows light `#005BA1` → `#004F8A`, XP
`#0046BD` → `#003FA8` and Aero `#0F55A3` → `#0C4A8C` — so every shipped set
clears its floor (4.729:1 at the tightest, Windows dark on `selected`; 7.484:1
at AAA, high-contrast light on `destructiveSoft`).
The audit found two gaps:
identity light `successSoftForeground`
measured 5.83:1 through the wash, under the 7:1 body floor, and Windows dark's
wash over `destructiveSoft` measured 1.005:1 — an invisible highlight. The four
light soft foregrounds moved one family step darker, the dark ones one step
lighter with a 20% identity wash, Windows dark's wash moved to 40%, and Linux
dark's soft destructive fill moved to `#3A0B0D` so its light-accent wash stays
visible. Plan `506` later lowered the identity wash to 14% and the Windows one
to 33% so a selected row's title keeps 7:1 through it, and darkened Linux
dark's selected fill one step (`#2B4F76` → `#27476A`) because its wash had no
alpha window left. `selectionSurfaces` is the list of plain surfaces,
`selectionPairs` holds each surface's body and secondary text pairs, a card's
second text role
(`cardForeground` beside `foreground`), a menu row's `popoverForeground` on the
three washes it paints and a selected row's title (`foreground`) beside its
inherited label on all four resting fills it keeps, plus the pressed
`selectedActive`, and `selectionWashPairs` holds the wash itself to the
1.05:1 perceivability floor on each surface, so a highlight that is technically
readable but invisible fails the check too.

```tsx
import { getTheme, selectionStyle } from "@gpuixui/tokens";

const theme = getTheme("light");
const chrome = { userSelect: "none" } as const;

<div style={selectionStyle(theme)}>
  <div style={chrome}>Toolbar</div>
  <text>Selectable content</text>
</div>;
```

A runnable example lives in
[`src/selection.example.ts`](../packages/tokens/src/selection.example.ts).
The press a selected row derives from the same wash is
[`src/selection-press.example.ts`](../packages/tokens/src/selection-press.example.ts).

Content painted on an **opaque filled surface** — a filled action such as
`softAction`, or a solid status chip — uses `selectionOnFill` instead of
`selection`. The accent-tinted wash *is* the accent, so on a `primary` fill it
composites to **1.000:1** — an invisible highlight on the one surface a user
message is painted on (identity dark, macOS light and dark, Linux light, Windows
light and Aero light). It is just as lost on a solid status chip: identity light
`success` measures **1.046:1**, macOS light 1.026:1, Linux light 1.027:1,
Windows light `info` 1.011:1 and Windows 7 light 1.011:1, and the AAA dark
`softAction` measured 1.047:1 before plan `504` moved that fill one step darker
(`#3A414D` → `#343B47`), which also keeps its white label at 7.165:1 through the
veil and the raised action at 1.071:1 on every AAA soft tint. `selectionFillRoles`
is the list: `primary`, `secondary`, `destructive`, `accent`, `info`, `success`,
`warning` and `softAction`. The neutral 15% veil steps away from each fill in
both modes: `selectionFillPairs` holds one text pair per fill at **4.827:1** at
the tightest (macOS dark, `accentForeground` on `accent`), above the 4.5:1 the
on-colour role already has, and `selectionFillWashPairs` holds the veil itself at
**1.060:1** at the tightest (identity dark high, `selectionOnFill` on `info`),
above the 1.05:1 perceivability floor. The disabled state of a raised action
keeps that resting `softAction` fill and paints `disabledForeground`, so
`selectionFillInactivePairs` holds that one composition through the same veil.

The veil is measured on each fill's **resting** value. A filled control steps to
`xHover`/`xActive` under the pointer, and its label is chrome: at the shipped 15%
veil **60 of the 360** shipped filled-family label pairs measure under the
on-colour floor (worst **3.353:1**, macOS dark `accentActive`), and no single
neutral alpha keeps both that floor and the 1.05:1 veil floor on the
high-contrast light set. A state-fill pair would promise a floor the AAA palette
cannot meet, so those fills stay out of `selectionFillRoles`; a control that must
not be selectable sets `userSelect: "none"` on its chrome, the same opt-out a
toolbar uses, and the resting pairs cover content that keeps its fill — a message
bubble, a solid chip, the panel action. `filledActionChrome` in the examples is
the copyable version.
`selectionStyle(theme, "fill")` applies it to a subtree, and
`filledContentStyle` and `statusSolidStyles` in the examples are the copyable
versions:

```tsx
import { getTheme, selectionStyle } from "@gpuixui/tokens";

const theme = getTheme("light");

<div
  style={{
    ...selectionStyle(theme, "fill"),
    backgroundColor: theme.colors.primary,
  }}
>
  {children}
</div>;
```

The sixteen pairs join the checker and are reported with
`wash: "selectionOnFill"`. Plan `344` measured the three families that existed
in its pair list; plan `382` derives both lists from `filledControlFamilies`, so
the fourth family (`accent`) is covered too. Its label measured **4.140:1** on
macOS light and **4.430:1** on Linux dark through the veil, so the two accent
foregrounds move one designed step (`#0055B3` → `#004A9E` and `#A8CBF0` →
`#B4D5F7`); every other shipped set already cleared the floor. Plan `504` closes
the rest of the surface: a solid status chip and the panel action are opaque
fills no control-family index owns, and both lists now derive from
`selectionFillRoles`, so a fifth tone or a new panel action joins one place. No
other colour moves.

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

The one paint the theme can reach is the caret. `nativeFieldTheme(theme)` returns
the runtime `theme` prop a field reads — `{ caret: theme.colors.primaryText }` —
because a caret is a 1px **mark**, not a label on a fill: `primary` is the fill,
and on macOS dark it measures **2.748:1** on a `selected` row and **2.836:1** on
a pressed one, under the 3:1 mark floor, so a caret in an in-place editor
(`InlineEdit` paints a field on the four row washes) vanished there while every
check returned `[]`. `primaryText` is the accent's readable ink: the text pairs
already hold it on the four `Surface` tones and the four row washes at the
4.5:1 secondary floor, and `caretPairs` holds it on the field's own `input`
fill at the mark floor. It clears all nine surfaces in every shipped set
(**5.587:1** at the tightest, Windows dark on `active`). Without the prop the
field keeps the runtime's built-in dark caret (`#7C86FF`), which measures
**3.129:1** on the AAA light `input` and **2.795:1** on its quiet panel, under
the 4.5:1 mark floor the AAA theme declares. Apply it beside the field's style; a
consumer that wants a different caret replaces the field of the returned object.
A runnable example lives in
[`src/native-field.example.ts`](../packages/tokens/src/native-field.example.ts).

```tsx
import { getTheme, nativeFieldTheme } from "@gpuixui/tokens";

const theme = getTheme("light");

<input
  style={{ color: theme.colors.inputForeground }}
  theme={nativeFieldTheme(theme)}
/>;
```

### Native text documents

`<code>`, `<diff>` and `<markdown>` take the same kind of `theme` prop, but a
much larger one: the pinned runtime's `GpuixTheme` carries an appearance, nine
colours, the two families, a 24-capture syntax palette and every layout metric
the native text engine paints. Its defaults are a **dark** Comet theme, and the
light base is only selected by `appearance: "light"`. A light app that omits the
prop therefore paints code, diffs and markdown dark — which is what
`components/message.tsx` does today with `<markdown source={text} />` while every
theme check returns `[]`.

`nativeTextTheme(theme)` returns that prop from a resolved theme. Every colour is
a semantic role, every syntax capture is a **text** role (a solid status fill
would be a fill painted as a glyph), and the layout comes from the type, spacing
and radius scales:

| Native field | Role |
| ------------ | ---- |
| `appearance` | `theme.mode` |
| `bg` | `card` |
| `border` | `border` |
| `text` | `foreground` |
| `textMuted` | `mutedForeground` |
| `textFaint` | `placeholder` |
| `textDim` | `mutedForeground` |
| `accent` | `primaryText` |
| `caret` | `primaryText` |
| `codeText` | `primaryText` |
| `codeWash` | `accent` |
| `diffAdd` | `successText` |
| `diffDel` | `destructiveText` |
| `diffHunkBg` | `hover` |
| `fontSans` | `typography.sans` |
| `fontMono` | `typography.mono` |

`nativeTextRoles` owns that table. `nativeSyntaxRoles` owns the capture palette:
`comment`, `operator` and `punctuation` are `mutedForeground`; `keyword`,
`function`, `functionBuiltin` and `label` are `primaryText`; `string` is
`successText`; `stringSpecial`, `escape`, `number`, `boolean`, `constant`,
`variableSpecial` and `attribute` are `warningText`; `typeName`, `typeBuiltin`
and `constructor` are `infoText`; `macroName`, `tag` and `invalid` are
`destructiveText`; `property`, `variable` and `parameter` are `foreground`.

The captures are held to the **body** floor on every tone a document may paint
on — `nativeTextSurfaces` is `background`, `card`, `popover` and `muted` —
through `nativeSyntaxPairs`, because code is body copy, not a status label.
`foreground` is not in the list: the body pairs already hold it on all four.
Every shipped set clears the opaque floor; the tightest is `primaryText` at
**7.706:1** (`Light`).

The runtime also paints through fades a theme cannot change. A diff line is 92%
of `text`, its gutter number 80% and its unchanged marker 50% of `textFaint`;
an add/delete marker is 90% of the status text role, its 3px bar 55% and its row
tint 5.5%; a markdown list marker is 85% of the accent ink, the blockquote rail
60% and its wash 5%; and a code block paints every syntax role on a 3.5% ink
wash. `nativeTextFades` and `nativeTextOverFades` own those fractions and
`themeNativeTextFailures` composites each on every `nativeTextSurfaces` tone: a
diff line and the blockquote's body on the **body** floor, the add/delete
markers on **secondary**, the list marker on **mark**, and the bars, rails,
tints and gutters on **perceivability**. The gutter's two fades are
perceivability pairs rather than text pairs because the runtime dims chrome:
they measure 3.595:1 at 80% and 2.082:1 at 50% on Aero light's quiet panel,
below the secondary floor by design. The ink wash is held for every syntax role
on the same four tones; the tightest is `successText` at **7.110:1**
(`Light · macOS`). Inline code is the one native-text composition on an opaque
fill: the runtime paints `codeText` (`primaryText`) on a `codeWash` (`accent`)
quad behind the run. The accent row fill already measures a link at the
secondary floor, but inline code is body copy, so `nativeInlineCode` holds the
pair to the body floor. Four sets were under it — `Light · Windows XP`
6.506:1, `Dark · Linux` 6.898:1, `Light · Windows` 6.953:1 and `Dark · macOS`
6.960:1 — while `themeFailures` returned `[]`. Their `primaryText` takes one
designed step in its own family, macOS light takes one more so the tightest is
not a three-decimal pass, and the tightest shipped pair is **7.102:1**
(`Light · Windows XP`).

A changed diff line is its own surface. The runtime tints the whole row with
5.5% of `diffAdd` (`successText`) or `diffDel` (`destructiveText`) and paints
every child on it — the gutter, the number, the marker, the 3px bar and the
syntax runs at full alpha. `nativeTextOverFades` includes the row's chrome and
`nativeSyntaxTints` holds every syntax role on both tints on every
`nativeTextSurfaces` tone at the body floor. Five shipped pairs were under it
while every other check returned `[]`: `Light · macOS` `warningText` 6.950:1 on
the success tint and 6.963:1 on the destructive tint, `Light · Windows` 6.990:1
and 6.958:1, and `Light · Windows XP` `successText` 6.989:1 on the destructive
tint. macOS and Windows name `warningText` `#4B3100`; XP and Aero name
`successText` `#0A3A26`, one designed step in the family each already used. The
tightest tinted pair is **7.008:1** (`Light`, `primaryText` on the
`destructiveText` tint); the identity ink stays because it also carries the
brand link and the light ring, and the pair passes.

The runtime's own chrome sits on lighter ink washes the theme does not own.
A code block's language header is a **2%** wash under `textMuted`, and the
separator below it is the theme's `border` on that same wash; the block's whole
body is framed with the same `border` on its **3.5%** ink wash; a diff file
header is **2.5%** under its path (`textMuted`) and its two counts
(`diffAdd`/`diffDel`), and the header's hover — shared by the show-more row — is
**5%** under the same three roles. `nativeTextWashes` owns those fractions and
`themeNativeTextFailures` holds the code header's text and separator, the body
frame, and the diff header's three roles at secondary and divider, on every
`nativeTextSurfaces` tone. A theme whose `border` clears 1.05:1 on every plain
surface can still lose the code frame: on `Dark · macOS`, `border: "#303030"`
measures **1.002:1** on the header's 2% wash, and on the `Dark` theme,
`border: "#222222"` measures **1.036:1** on the block's body wash while every
other check returns `[]`.

A role chosen for its opaque floor still has to clear the faded one. On
`Dark · Linux`, `successText: "#bebebe"` passes every other check while a string
token measures **6.405:1** through the ink wash, and `mutedForeground:
"#bebebe"` passes while a blockquote's body measures **6.315:1** over the accent
wash, both under the body floor.

One composition is deliberately out: the runtime's **28% word-level diff wash**
paints a changed token's own syntax colour over a wash of the add/delete family.
`destructiveText` on its own 28% wash measures **4.389:1** (`Dark · Linux`) and
`successText`'s string token 5.813:1 in identity dark, so no perceivable
same-family wash can keep a syntax token at text strength. It is transient
emphasis on a line whose body is held at 92% over the 5.5% row tint; a consumer
that enables word-level diffs keeps the line readable and accepts the emphasis
wash. The runtime also draws two neutral hairlines of its own — a diff file
header's **4%** top edge and a markdown table's **10%** rule — which are fixed
black-or-white ink, not a theme role, so no theme edit can move them and they
stay outside the contract. The light platform
styles own the steps their canvases need: macOS and Windows name `warningText`
`#4B3100` and `infoText` `#173A88`; XP adds `successText` `#0A3A26`,
`warningText` `#4B3100` and `destructiveText` `#7E1D21`, and Aero adds
`successText` `#0A3A26`, `destructiveText` `#7E1D21` and `warningText`
`#4B3100`; XP and Aero also name `infoText` `#173A88`.

The metrics come from the theme's own scales: `codeTextSize`/`codeLineHeight`
from `codeBlock`, `mdTextSize`/`mdLineHeight` from `body`, the heading sizes from
`h1`/`h2`/`h3`/`body`, the insets from spacing, and the inline-code and code-card
radii from `radius.sm`/`radius.lg`. The gutters and table floors scale with the
type they hold, at the runtime's own shipped proportions: `codeGutterDigitWidth`
is `codeBlock.fontSize` at 7px per digit per 12.5px of code, `diffGutterWidth` is
`codeBlock.fontSize` at 36px per 12px, and `mdTableMinColumnWidth`/
`mdTableMinColumnContent` are `body.fontSize` at 96px/48px per 14px. At the
shipped sizes those resolve to the runtime's own 7px, 36px, 96px and 48px, so no
pixel moves; a copied theme that enlarges code or body text widens them instead
of overlapping line numbers or squeezing a table's columns.

The two runtime metrics with no token source are optional members of
`NativeTextMetrics`: `codeGutterMinWidth` (the 28px floor under the computed
code gutter, which already exceeds it as the type grows) and
`diffAccentBarWidth` (the 3px diff bar). `nativeTextTheme` leaves both unset, so
the runtime's own value applies; a brand that wants a different floor or bar
sets it on the returned object, and the type accepts it without a cast. The
per-digit width and the table's max-content floor are supplied, not left to the
runtime: `codeGutterDigitWidth`, `diffGutterWidth`, `mdTableMinColumnWidth` and
`mdTableMinColumnContent` are the floors above, resolved from the roles.

The runtime's diff chrome is **fixed type**, not theme type: a meta line at
**10.5px**, the gutter numbers, hunk header, notice and file-header counts at
**11px**, and the file path at **12px**, each on GPUI's default golden-ratio
line box. `nativeTextChrome` publishes the three sizes and
`nativeTextLineRatio` the ratio; the four derived diff boxes are floored at
those line boxes — **19 / 18 / 18 / 18** — and the marker column at one code em,
because a compact theme otherwise clips them. A probe with
`caption`/`label`/`codeBlock` at 8px and the whole spacing scale at `0` returns
`[]` from `themeFailures` and resolved **8 / 8 / 8 / 8** and a **0px** marker
before the floor. No shipped box moves: the shipped minimums are 18 / 34 / 24 /
20 and a 24px marker.

`bg` is the raised `card` plane a code block, diff or document is painted on. A
document painted directly on the canvas overrides only that field; the opaque
roles are measured on all four `Surface` tones (`nativeTextSurfaces`), and the
ink composite is held on the same four, so the override stays inside the
contract:

```tsx
import { getTheme, nativeTextTheme, type Theme } from "@gpuixui/tokens";

const theme: Theme = getTheme("dark");
const markdownTheme = nativeTextTheme(theme);
const canvasTheme = { ...markdownTheme, bg: theme.colors.background };
```

#### Find highlighting

A find bar does **not** use the `accent` field. The runtime seeds `highlight`'s
colours from that field — 30% for every match and 65% for the active match,
used verbatim when a colour is passed
(`references/gpuix/packages/native/src/text/search.rs`) — and `nativeTextTheme`
maps `accent` to `primaryText`, the accent's readable **ink**. An ink is not a
wash: in identity dark, body text measures **2.81:1** through the active
default and **6.80:1** through the match default, under the body floor.

`nativeHighlight(theme)` returns the `selection` role and the same RGB one
`nativeHighlightStep` (`0.1`) stronger, so the active match is a perceivable
step above the match while every highlighted role stays readable:

```tsx
import { getTheme, nativeHighlight, nativeTextTheme } from "@gpuixui/tokens";

const theme = getTheme("dark");

<markdown
  source={text}
  theme={nativeTextTheme(theme)}
  highlight={{ ...nativeHighlight(theme), query }}
/>;
```

The wash's corner is the theme's inline-mark radius, `radius.sm`
(`nativeHighlight` returns it as `radius`), so a square copied style paints a
square match and the Windows variant keeps its own 2px corner; the runtime's
own 2px default is a literal no radius scale owns.

The active wash is at least **1.08:1** from the match and **1.28:1** from the
tone it paints on. No visible wash keeps a syntax token at body strength:
the neutral `hover` wash is **1.06:1** at its weakest and still leaves syntax at
**6.74:1**. So `nativeHighlightPairs` holds the body and secondary tiers and
every syntax capture to the **secondary** floor on all four `Surface` tones
`bg` may name; the tightest shipped pairs are **5.77:1** for the match and
**4.99:1** for the active match, while body text stays at **9.65:1** and
**8.03:1**. The runtime paints a code block on that tone under a fixed 3.5% ink
wash (plan `574`), so the check measures every pair again on the painted
surface: the tightest painted pairs are **5.38:1** and **4.64:1**, body text
**8.93:1** and **7.31:1**, and the step **1.06:1** from the match and
**1.25:1** from the tone. Aero light's inherited `successText` and
`destructiveText` measured **4.445:1** on the canvas and **4.429:1** on the
quiet panel through the active match there, under 4.5:1, while every check
returned `[]`; both take the XP step, so every shipped set passes and no other
value moves. `themeHighlightFailures` is that check, composed into
`themeFailures`; [`native-highlight.test.ts`](../packages/tokens/src/native-highlight.test.ts)
derives every figure above, and
[`native-highlight-code-surface.test.ts`](../packages/tokens/src/native-highlight-code-surface.test.ts)
holds the painted surface.

A find on a changed diff row sits on neither of those surfaces: `<diff>` paints
its rows directly on `bg` and tints a whole changed line with 5.5% of `diffAdd`
or `diffDel` (`nativeSyntaxTints`). The check walks both tints for the match, the
active match and the step. Aero light's `mutedForeground` and `primaryText`
measured **4.437:1** and **4.481:1** through the active match on the quiet panel,
under the 4.5:1 floor, while every check returned `[]`; both take one designed
step darker (`#36455A`, `#0A417A`) and every shipped set passes. The failure
names the tint role and its fraction beside the surface, so a code-ink row and a
diff-row row are distinguishable. See
[`native-highlight-diff-tint.test.ts`](../packages/tokens/src/native-highlight-diff-tint.test.ts).

The same check holds the step itself. An active match that is not one
`contrastFloors[level].step` above the match on the surface it paints on is
reported with `pairClass: "step"`, because `nativeHighlightStep` is an absolute
alpha: an edited `selection` close to opaque paints both washes the same colour
while every text pair still passes. A theme with `selection: "#C9D6EAFC"`
returns `[]` from the contrast check, and the step arm is the only one that
sees the collapsed match. A text failure keeps its `pairClass: "secondary"` and
the wash, surface, role and ratio it always had.

Runnable examples live in
[`src/native-text.example.ts`](../packages/tokens/src/native-text.example.ts) and
[`src/native-highlight.example.ts`](../packages/tokens/src/native-highlight.example.ts).

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
    track: "#20202E",
    ring: "#9B8CFF",
    overlay: "#000000D9",
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
this rule was written down. A dark brand whose accent is darker than the base's
also deepens the modal scrim: a dialog's face is measured on the scrim over every
surface a window shows, and the inherited 65% scrim left the floating face at
1.038:1 over this brand's own primary action, so the example ships 85%
(`#000000D9`). A lighter accent can keep the base scrim. A dark brand also moves
the value groove: `primary` is a progress segment painted on `track`, and the
identity groove leaves this fill under the 3:1 mark floor, so the example names
its own neutral step. The executed example in
[`src/brand-theme.example.ts`](../packages/tokens/src/brand-theme.example.ts) is
this exact palette, and `theme.test.ts` holds it to `themeContrastFailures`.

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

The guards a stored row relies on are exercised in
[`src/persisted-choices.example.ts`](../packages/tokens/src/persisted-choices.example.ts).

A choice that travels in a URL is the same row, and the package owns that
transport too. `themeChoiceFromParams(source)` reads the five keys with the same
guards — a real `URLSearchParams` satisfies the structural `ThemeParamSource`,
so the package gains no runtime dependency — and treats an unknown value as
absent, exactly like a missing key. `themeChoiceParams(choice)` is the canonical
writer. It omits an axis whose fallback already selects it — a light mode, a
default contrast, the `default` platform — and a valid `recipe` suppresses the
`platform` it overrides. Density is the one exception: it is written even when it
equals the resolved theme's preset (macOS is `compact`), because the fallback is
the *platform's* preset, so the same row on another platform would otherwise
change. `themeChoiceKeys` is the key order and the clear list, so a link cannot
keep an axis the new choice replaced.

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

The reader accepts a hand-written `platform=default`, `mode=light` or
`contrast=default`; only the writer omits a value its fallback already selects.

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
- `density` accepts a preset name, or partial metrics with the `preset` they
  start from; metrics merge by size, so changing the medium control height keeps
  the small and large ones, and a partial override without a `preset` keeps the
  base preset's name;
- `mode` is not overridable — `extendTheme` keeps the base mode;
- `contrast` defaults to the base's declaration; an `extendTheme` override is a
  claim the extension mechanism does not check, and `createTheme` has no claim
  path at all — its `contrast` picks the built-in variant;
- nothing is mutated. The returned theme may share untouched token objects. The
  contract is no mutation, not deep cloning.

### Deriving a theme back to overrides

`themeOverrides(base, theme)` is the inverse of `extendTheme`: the minimal
override set that rebuilds `theme` from `base`, for an editor that stores or
prints an edit instead of a whole theme object. Groups are compared field by
field the way `extendTheme` merges them, and a group with no change is omitted,
so `themeOverrides(theme, theme)` is `{}`. A tuned density is expressed against
the preset it names — `mergeDensity` starts from that preset, not from the base's
metrics — and an elevation level is replaced whole, matching the documented merge
rule. A different `mode` returns `undefined`, because `extendTheme` cannot change
the mode: choose a base of the theme's mode. The executed example is
[`src/theme-diff.example.ts`](../packages/tokens/src/theme-diff.example.ts).

```ts
import { extendTheme, getTheme, themeOverrides } from "@gpuixui/tokens";

const base = getTheme("dark");
const edited = extendTheme(base, { density: "compact", radius: { md: 8 } });

themeOverrides(base, edited); // { radius: { md: 8 }, density: "compact" }
```

### Checking a theme

An edited theme — a copied platform style or a brand palette — can be held to
the same floors as the shipped ones. The guarantee is ten checks — colour
format, role opacity, typeface form, contrast, content ring, find highlight,
native text fades, text hierarchy, interaction direction and numeric metrics —
and [`themeFailures`](#one-check) runs all of them in one call; the sections
below explain each one it composes.

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
wash — body, secondary, status and brand-toned link text through it, and the
wash's own perceivability —
the soft status surfaces, the designed edge on its own fill and on the eight
surfaces a chip sits on (`softBorderSurfacePairs`), the plain divider on those
fills, and the decorative
dividers — including on the `secondary`, `hover`, `active` and `accent` fills a
bordered control paints, the `secondaryHover`/`secondaryActive` and
`accentHover`/`accentActive` steps it presses through, and on the `input` fill a
field sits on.
The modal scrim is measured over the surfaces it covers (`overlayWashPairs`), and
the dialog's face on it — `popover` over the composited `overlay` on every
surface a window shows (`dialogSurfacePairs`, derived from `overlaySurfaces`),
because a theme whose scrim meets its own floating surface leaves a dialog with
no face, and the edge is not always visible over the content behind it.
The default is the
level the theme declares, so a high-contrast theme is checked against 7:1 without
a second argument; naming a level asks a stricter question of a theme that does
not claim it. It returns one entry per missed pair, naming the two roles, the
pair class, the floor and the measured ratio. The selection wash is measured as
it paints, with the text roles each surface carries: the body role over
`compositeOver(selection, background)`, `card`, `muted`, `hover`, `active` and
`accent`; `popoverForeground` over `popover`; `inputForeground` over `input`; and
`selectedForeground` beside the row's title `foreground` over `selected`, at the
secondary and body floors; and `mutedForeground` on all nine surfaces
at the secondary floor — reported with `wash: "selection"`. `selectionPairs` is
the text list; it names both of a card's text roles, the default `foreground` and
`cardForeground`, a menu row's `popoverForeground` on the three washes it paints,
and both of a selected row's, the title `foreground` and the inherited
`selectedForeground` on all four resting fills it keeps, plus the pressed
`selectedActive`. The four status labels join it through
`selectionStatusPairs`,
because `xText` is the role a status label, icon or dot paints on the four washes
a row uses, and a selectable row's label is dragged over with the copy around
it. An Alert or Badge is measured the same way:
`selectionSoftPairs` holds the tone's foreground, the body, the panel action's
label and the caption through the wash, and `selectionSoftWashPairs` the
highlight's own perceivability on the four soft fills. An unavailable label is measured too:
`selectionInactivePairs` holds `disabledForeground` through the same wash on the
fourteen `inactiveSurfaces` it paints on, at the `inactive` floor, because
`selectionColor` inherits into that text. The wash itself is compared with each
surface it paints on, so a highlight that has become imperceptible is reported
as well; `selectionWashPairs` is that list. It also holds the `disabled` fill,
because plan `510` measures the unavailable label through this wash on the fill
it keeps — a highlight that matches that fill would erase the selection while
every text pair still passed. Every shipped set already clears the floor, so no
colour moves.

A runnable example of the wash that matches the disabled fill is
[`src/disabled-wash.example.ts`](../packages/tokens/src/disabled-wash.example.ts).

Every exported pair list is held to content uniqueness: a repeated
`[foreground, background, class]` would make the checker report one composition
twice, so `contrast.test.ts` fails on it. The suite derives its inventory from
the package's exports, so a list added later cannot ship without the check.
Lists that measure the same roles
through a different wash — `selectionPairs` beside `contrastPairs`, for example
— are separate checks, not duplicates, so uniqueness is asserted inside each
list and never across them.

An invalid field is an error state, not a decoration: `FieldInput` paints a
`destructive` border over its `input` fill and the ColorPicker hex field over
the `background` canvas, so both are `boundary` pairs.
`invalid-field-edge.test.ts` holds them and the erased-error regression.

The action a soft status panel carries is measured in the same list:
`softActionPairs` holds each of `softAction`, `softActionHover` and
`softActionActive` to 1.05:1 on the four soft fills, `softActionStepPairs` holds
the hover and press to the `step` floor, and `softActionLabelPairs` holds
`softActionForeground` on the three fills (secondary) and on the four soft fills
a ghost action's label rests on (body). It is the designed alternative to the
canvas washes, which measure **1.0042:1** at worst on a tint (plan `394`).

The modal scrim is measured the same way, because its job is to change the
surface beneath it: `overlayWashPairs` composites `overlay` over the surfaces a
dialog covers — `overlaySurfaces` is `background`, `card`, `muted`, `input`,
`selected`, `popover`, the resting filled actions (`primary`, `secondary`,
`accent`, `destructive`), the three solid status chips a Badge paints (`info`,
`success`, `warning`), the raised action a status panel carries (`softAction`),
the four soft status panels (`infoSoft`,
`successSoft`, `warningSoft`, `destructiveSoft`), a disabled control
(`disabled`), a loading row (`skeleton`) and a value indicator's groove
(`track`) — and holds the painted value
to the `surface` floor. A scrim that composites to its own surface is an
invisible modal backdrop; the audit found high-contrast dark's `#000000CC`
measured **1.000:1** on its pure black canvas, so the AAA dark theme now veils
with a 15% white wash (`#FFFFFF26`, 1.388:1) — a dark veil cannot darken black.
The failures are reported with `wash: "overlay"`. The transient pointer washes
(`hover`, `active`) and the filled families' `xHover`/`xActive` steps are
deliberately not scrim surfaces: the pointer leaves the row to reach the dialog,
so a scrim over a transient state is not a composition the system supports.
`selected`, `input`, the resting filled actions, the soft status panels and the
three resting fills are not transient — a table, list or tree keeps a selected
row while a modal opens
over it, every field in the layout behind a form dialog sits on the `input`
fill, the page's buttons keep their resting fills, a Badge keeps its solid status
chip, a status panel's action keeps
its raised fill, a tone-tinted Alert stays
on screen, a disabled control stays unavailable and a loading row and a value
groove stay painted — so plans `359`, `375`, `395`, `508` and `610` measured
them too. The gap was real: macOS
light's own `selected` fill used as `overlay` composited to **1.000:1** on a
selected row while the checker returned `[]`, because the four base surfaces all
passed. The tightest shipped pair is **1.060:1** (high-contrast dark, `overlay`
on `info`), so no colour moves.

The element the scrim carries is measured too: a dialog, drawer or command
palette paints `popover` over it, so `dialogSurfacePairs` composites `overlay`
over every surface `overlaySurfaces` names — the six layout surfaces and the
fifteen resting content fills a window shows, because a dialog opens over a
status chip, an action, a disabled control, a loading row or a value groove as
easily as over the canvas — and holds the face to
the same `surface` floor, reported with `wash: "overlay"`. A theme whose scrim
meets its own floating surface leaves the dialog with no face; the tightest
shipped pair is **1.079:1** (identity Linux dark on `destructive`).

The page layout alone was not enough. macOS dark's face met its own scrim over
its `primary` action at **1.021:1**, and the dialog's `border` could not stand
in: the same edge measures **1.006:1** over Windows dark's scrimmed `success`
chip, under the divider floor, and the AAA light edge measures 1.074:1 against
a 3:1 divider floor. The face is the carrier, so the macOS dark scrim is deeper
(82%, `#000000D0`) and the scrimmed content sits below the face; every shipped
face clears 1.05:1. The shadow cannot take its place in the default dark sets:
on the identity dark scrim the `lg` tint paints **1.035:1** and pure black
reaches only **1.042:1**, under the floor. `dialog-scrim.test.ts` pins all of
these figures.

The elevation is measured as the painted shadow it is: `themeContrastFailures`
walks every defined level of `elevationLevels`, composites
`elevationShadow(theme, level).color` over each surface in `elevationSurfaces` —
`background`, `card`, `muted`, `input`, `selected` and `popover`, the six
persistent page surfaces a raised card, menu, popover or preview card floats
over, because a selected row stays chosen under its context menu and a field
keeps its fill under a popover flipped above it — and holds the result to the
same 1.05:1 `surface` floor. A menu or popover (`md`) also opens across the
fifteen resting content fills `elevationContentSurfaces` names — `primary`,
`secondary`, `accent`, `destructive`, `info`, `success`, `warning`,
`softAction`, `infoSoft`, `successSoft`, `warningSoft`, `destructiveSoft`,
`disabled`, `skeleton` and `track` — because a dropdown opens across
the button beside its trigger and a context menu over a Badge; the `sm` and
`lg` walks stay on the page surfaces. A dialog is the exception: its shadow
lands on the scrim, which the face paragraph above measures instead.
The reserved empty `overlay` paints nothing and is skipped; a defined one is
measured like any other. A failure names `wash: "shadow"`, the level's `opacity`
and its `level`. The audit found the AAA dark set's black tint measured
**1.000:1** on its pure black canvas at every level while every other shipped
set cleared the floor — the same defect the scrim had — so that set now paints
with light (plan `505`). The tightest shipped pair is **1.058:1** (AAA dark,
`md` on `info`); over the page surfaces alone it is **1.061:1** (identity dark,
`sm` on `background`) and the AAA dark page pair is **1.207:1**.

The inactive state has its own floor. `disabledForeground` is measured on the
fourteen surfaces an unavailable label paints — the `disabled` fill and the
field's `input` fill (`inactivePairs`), the four plain surfaces, the
`hover`/`active`/`accent`/
`selected` washes a disabled control inside a row sits on, and the four soft
status fills a tone-tinted Alert's action sits on (`inactiveSoftPairs`;
`inactiveSurfaces` is the ordered list) — at 3:1, and at 4.5:1 in the
high-contrast themes. A disabled field is the reason the `input` fill is there:
`disabledControl(theme)` keeps the field on its own fill and paints the label on
it, so an edited field fill cannot erase what the field says it holds. WCAG
1.4.3 exempts inactive components;
that exemption is not a licence to erase the state, because the point of an
unavailable control is that a reader can find out what is unavailable. A disabled
`Select` item paints this role straight onto the menu's `popover` with no fill
behind it, and measured **1.99:1** on Linux dark and 2.09:1 on the identity until
plan `306` moved the value. The `disabled` fill itself is deliberately not held
to a floor against the panel: no neutral can clear both a white card and the
quiet panel, so a disabled control keeps its shape with its `border` edge, which
is held to the divider floor on `disabled` and on the previously unmeasured
`muted` panel.

The label is also read while it is selected. `selectionColor` inherits into a
disabled control's text like any other, and the accent-tinted wash composites
over the surface beneath it — on a light surface it darkens the ground toward
the disabled grey, and on a dark surface it lifts the ground toward it. No pair
measured the composition, so a selected unavailable label could fall under the
floor while every check returned `[]`: the previous light value `#6E7787`
measured **2.586:1** on Windows light's `selected` fill and 2.604–2.945:1 on the
other default light sets, and the AAA sets **3.430:1** (light,
`destructiveSoft`) and **4.357:1** (dark, `active`), against 3:1 and 4.5:1.
`selectionInactivePairs` holds `disabledForeground` through the wash on the same
fourteen `inactiveSurfaces` at the same floor. Three values moved one designed
step away from the panel in plan `510`: identity light `#6E7787` → `#545D6C`
(neutral 600), AAA light `#5A5A5A` → `#444444` and AAA dark `#A9A9A9` →
`#B0B0B0`; every high-contrast platform variant inherits the AAA palettes, and
XP and Aero light already passed. Plan `520` moves AAA dark once more
(`#B0B0B0` → `#D0D0D0`) and identity dark from `#A1A9B7` → `#B0B8C6`, for the
disabled raised action's inverse veil. The values stay below `mutedForeground` by
1.301:1 (identity dark) and 1.168:1 (AAA dark) at the tightest, and 1.542:1
below `softActionForeground` (identity dark), so an unavailable label is still
distinguishable from secondary text; the tightest washed pair is now
**3.177:1** (Aero light `destructiveSoft`) and **4.722:1** at AAA.

The parts are public too. `contrastRatio(foreground, background)` is the WCAG
ratio for opaque colours — `#RRGGBB`, or the paint-identical `#RRGGBBFF`
spelling — with `NaN` when a value does not parse, so a typo
can never pass — `compositeOver(colour, background)` composites a translucent
role onto an opaque one, `contrastPairs` / `contrastFloors` are the data the
check and the test suite both read, and `contrastPairClasses` is the floor
classes in documentation order — the order the table below and the ledger's
floor table use — so a report iterates the contract instead of retyping the
eight class names:

```ts
import { contrastFloors, contrastPairClasses } from "@gpuixui/tokens";

contrastFloors.default; // { body: 7, secondary: 4.5, inactive: 3, boundary: 3, mark: 3, surface: 1.05, step: 1.05, divider: 1.05 }
contrastFloors.high; // { body: 7, secondary: 7, inactive: 4.5, boundary: 4.5, mark: 4.5, surface: 1.05, step: 1.05, divider: 3 }
contrastPairClasses.map((pairClass) => contrastFloors.default[pairClass]); // the floors in documentation order
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
must fit one `label` line and one `body` line — a field paints body type, not
the label role — plus the default `iconSize.md` and a field adornment, each plus
its two borders — the borders are painted inside the height, so a glyph equal to
the outer metric overflows the content box; each control size's matching icon
tier must fit its own content box as well, because `IconButton` paints
`iconSize[size]` inside `controlHeight[size]` and a slider's thumb is
`iconSize[size]` tall in that track, so a 48px large glyph in a 36px large control
returned `[]` from `themeFailures` while it overflowed (every shipped pair keeps
at least 8px, so no value moves); a row must fit one `body`
line and the default `md` control it holds; `radius.none` must be square; `radius.full`
must round the largest corner step the theme carries and half of the taller of the
largest control and the largest avatar — each read from the theme's own scale, so
a step a brand adds moves the bound, and a 40px avatar painted at a smaller
radius is a rounded square, not a circle; every named ladder — `spacing`, `radius`, `iconSize`,
`avatarSize`, `controlHeight`, `controlPaddingX`, the two border widths, the
motion timings and the
elevation feather — must not step backwards, each size ladder read from the
theme's own scale object in the order the theme holds its steps, so a step a
brand adds is compared while `radius.none` and `radius.full` keep their own
rules; `borderWidth.strong` is the focus
ring's spread, so it may equal the default border but never be thinner than a
divider, and `iconSize`, `avatarSize` and a
control's horizontal padding must also stay above zero, because a named size
that paints a 0×0 icon or avatar is not a size and a control with no inset
paints its label on its own border. Every surface metric in `dimensions` is a
positive size and every border width is non-negative — both read from the
theme's own group, so a member a copied style adds is held too — while `strong`
is the one width that must stay above zero, because it is the ring's spread. A
control's padding is a padding before it is a density number, so each `controlPaddingX` size must also be at least the
theme's own hairline, `spacing["2xs"]`, the smallest step the spacing scale —
documented as shared by padding, margin and gap — defines, because a brand that
widens its hairline must not keep controls tighter than it; the two inline icon
sizes are bounded by the line box they share
with text — `iconSize.xs` by `typography.caption.lineHeight` and `iconSize.sm`
by `typography.label.lineHeight`, the partners `scale.ts` names — because a
glyph taller than its line raises the row the icon is centred in, while the
colour, typeface and contrast checks stay empty; the inline avatar tier is
bounded the same way by the row it leads — `avatarSize.xs` by
`density.rowHeight` — because a dense `ListItem` fixes its height at that value
and its leading slot carries an avatar or an icon, so a person mark taller than
the row cannot fit it; a timing
must also be finite; a chip must fit inside the field's content box — the
minimum width less the field's two borders and its `controlPaddingX.md` padding —
because a chip equal to the outer width has no room for the chrome painted
inside it; the same minimum also holds the query row the token documents —
`2 * spacing.md + iconSize.md + 2 * spacing.md +
typography.body.fontSize + fieldAdornmentSize`, its padding, the leading `md`
icon, the gap, one query glyph, the same gap and the trailing
`fieldAdornmentSize` action — and the larger of the two bounds
is the rule, so lowering `chipMinWidth` cannot free a field that can no longer
show its own query (plan `624`). The chip's own minimum is the outer width
`TagInputChip` paints, so it holds the chrome inside it — two `spacing.sm`
insets, one `caption` glyph, the `spacing.xs` gap and the `fieldAdornmentSize`
remove control — because a value that only fits the field's content box can
still clip the chip's label and control (plan `667`). A fixed mark the theme owns — the Toast's tone
bar, the inbox's unread dot, a carousel indicator or an avatar's presence dot —
is at least the theme's own hairline (`borderWidth.thin`), the rule the timeline
marker already applies to its rail, because a mark below the smallest stroke a
border may paint does not read; a zero or non-finite mark keeps the `positive`
rule's one diagnostic (plan `643`). At the shipped metrics the query row needs
80px, the chip 102px, and the shipped 200px field clears the larger, while the
chip's own 44px bound passes at 1.82 times; an
overlay's `overlayMaxHeight` must fit one `density.rowHeight`, because a list
viewport shorter than a row clips every option; a cubic-bezier easing must be
four finite control points with both x values inside `0…1`, because the runtime
drops a transition it cannot interpolate; and an elevation level must hold a
shadow whose alpha is a fraction, because `alpha()` falls back to the opaque
tint on a value it cannot parse, and whose two offsets, blur and spread are
finite — a negative offset or spread is a direction, a `NaN` is a shadow the
renderer cannot paint. A level's **first** entry is the shadow the runtime
paints, and a level may hold **only** that entry — a second shape is reported as
`at-most`, because the runtime never paints it. The defined levels in
`elevationLevels` order — `sm` → `md` → `lg`,
and a defined `overlay` above them — must not get a smaller `blurRadius` as the
level rises — a dialog that feathers less than a resting card makes "lg" a
shallower level than "sm". Opacity is not part of the ladder: a fainter large
shadow or a flat theme is a design. Every other numeric metric — a type size, leading or
weight, a border width, a density or dimension metric, an icon, avatar, radius or
spacing step, and every motion timing — must be a **finite** number too — finite
**after the renderer's 32-bit cast**: GPUix receives it as a JavaScript double and
casts it with `value as f32`, so a value beyond `f32`'s range becomes an infinity
Taffy rejects, and `1e39` is reported while it paints nothing, with no error. The
check walks each group's values instead of a hand-written list, so a member added
to a group is governed the moment it ships; a value that does not survive the
cast is reported as `finite`, while a value that does but sits outside its range
keeps `within`. A positive size is judged on the same cast: `1e-50` rounds to
zero, so a dimension or named size that would paint nothing is reported as
`positive`. A weight is also held to `1…1000`: a zero,
a negative or a `NaN` selects no weight, so the text system has nothing to
paint. `radius` and the motion timings are
deliberately non-decreasing rather than strict: Linux and Windows ship
`radius.lg === radius.xl`, and Windows ships `motion.fast === motion.step`. An
empty elevation level is exempt — `elevation.overlay` ships reserved and empty —
but a level a consumer defines, `overlay` included, is held to the same rules,
because `elevationShadow` will paint it; the feather ladder reads
`elevationLevels` itself, so a level added to the index joins it without a second
edit. Every shipped theme, platform variant
and recipe passes, so the check moves no value; it guards the next edit.

A runnable example of a flush control inset is
[`src/control-padding.example.ts`](../packages/tokens/src/control-padding.example.ts).

`metricGroups` is the ordered index of the ten governed groups, so a
documentation table or a settings row iterates it instead of retyping the names.
`metricMembers` is the ordered index of every numeric member inside those groups
— the numeric sibling of `colorRoles` — derived from each group's ordered index:
`textRoles` for the type roles, and `spacingSteps`, `radiusSteps`,
`borderWidthSteps`, `iconSizeSteps`, `avatarSizeSteps`, `dimensionNames`,
`controlSizes`, `elevationLevels`, `motionLevels` and `motionPhases` for the
rest, so a diagnostics table iterates the walked domain without retyping or
casting a key. It names the shipped domain: a theme may carry a wider scale, and
the size ladders walk the theme's own members. An elevation entry names the field
once per level (`md.offsetX`) because
every entry in the level is read, while a failure names the one it measured
(`md[0].offsetX`).
`metricRules` is the ordered index of the nine rules a `MetricFailure` can
carry, beside `metricGroups`, so a diagnostics table or a rule reference
iterates it instead of retyping the union.
A failure is a `MetricFailure`: the `MetricGroup`, the dotted `member`
(`controlHeight.sm`), the `MetricRule` it broke and both numbers — the `actual`
value and the `bound` it missed. A `MetricRule` is one of `positive`,
`non-negative`, `zero`, `finite`, `increasing`, `non-decreasing`, `at-least`,
`at-most` or `within`. A value the `finite` rule rejects is not compared by a
ladder or a bound, so a bad number is not blamed on its neighbour; a `NaN` is
the finite rule's one diagnostic, while a `-Infinity` also fails a sign rule,
because it is non-finite and negative — independent defects. A bound that is
itself zero or negative is that metric's own sign diagnostic, so a fit does not
blame the value inside it: an inline icon is judged only by a usable caption or
label line, and an inline avatar only by a usable dense row (plan `641`).

#### Colour format

The colour helpers parse one form: `isHexColor(value)` is true for `#RRGGBB`
and `#RRGGBBAA` and false for every other CSS colour. The runtime is broader —
GPUix delegates colour parsing to `csscolorparser`, so a name, `rgb(…)`, `hsl(…)`
or `#RGB` is paintable — but `alpha`, `compositeOver` and `contrastRatio` can
only read hex, and the theme is authored data in the package's own convention.
`themeColorFailures(theme)` walks all 71 `colorRoles` and returns the role and
the value of every entry outside that form:

```ts
import { extendTheme, getTheme, themeColorFailures } from "@gpuixui/tokens";

const tinted = extendTheme(getTheme("light"), { colors: { shadow: "black" } });

themeColorFailures(tinted); // [{ role: "shadow", value: "black" }]
```

This is the format half of the editable-theme guarantee; the opacity half
follows below. A measured role in a
non-hex form also fails the contrast check, because `contrastRatio` returns
`NaN`, which never passes a floor; a fully opaque eight-digit spelling
(`#RRGGBBFF`) is the same paint, so the maths reads it and measures the colour.
The tint roles have no pair. `shadow` is
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

#### Role opacity

The form has two halves, and `themeColorFailures` only sees the first. The token
maths parses six- and eight-digit hex, so an eight-digit role is a *valid*
colour; whether the role is painted with that channel is a separate question.
`themeOpacityFailures(theme)` asks it:

- the three **veils** composite over content, so each needs an alpha byte
  strictly between `00` and `FF`. `selection` highlights glyphs in place,
  `overlay` veils the window a dialog opens over, and `selectionOnFill` veils
  content painted on an opaque fill. A fully transparent byte paints nothing and
  a fully opaque one is a solid block; neither is a wash.
- every other role is **opaque**. `shadow` is the case that matters: a level
  applies its own alpha through `alpha()`, which writes the fourth byte, so a
  tint authored at 50% paints at the level's 8/12/16% and the authored value is
  gone. An opaque role written `#RRGGBBFF` is accepted, because it paints the
  same colour either way. The maths reads that spelling as the colour it paints:
  `contrastRatio`, `relativeLuminance` and `compositeOver` drop a fully opaque
  alpha byte, so a measured role written `#191D25FF` is measured rather than
  reported as a `NaN` failure by the contrast and hierarchy halves while both
  format checks return `[]`. (Before plan `558` it reported **23** contrast
  failures for the light `foreground` and **62** for the dark `card`, all
  ratio `NaN`, for the same paint.) A partial alpha is still unmeasurable, and
  stays this check's failure.

`colorForms` is the ordered index of the two forms — `"opaque"` and
`"translucent"` — and `ColorForm` derives from it. `translucentRoles` is the
index of the three veils, `roleForm` the total rule —
`roleForm("overlay")` is `"translucent"` and `roleForm("shadow")` is `"opaque"` —
and a failure is an `OpacityFailure` with the `role`, the `value` and the
`expected` form. A value the hex parser cannot read stays `themeColorFailures`'
diagnostic, so one defect keeps one report.

```ts
import {
  colorForms,
  extendTheme,
  getTheme,
  roleForm,
  themeOpacityFailures,
} from "@gpuixui/tokens";

const tinted = extendTheme(getTheme("light"), {
  colors: { shadow: "#191D2580" },
});

themeOpacityFailures(tinted);
// [{ role: "shadow", value: "#191D2580", expected: "opaque" }]
roleForm("overlay"); // "translucent"
colorForms; // ["opaque", "translucent"]
```

Every shipped identity theme, platform variant and recipe carries the form its
roles need, so the check moves no value; it guards the next edit. The executed
example is [`src/opacity.example.ts`](../packages/tokens/src/opacity.example.ts),
which also groups every role by its form through `rolesByForm`.

#### Typeface

The two families a theme carries — `typography.sans` and `typography.mono` — are
painted as `StyleDesc.fontFamily`. GPUix 0.10.0's `StyleDesc.fontFamily` is
**one** string, not a CSS stack, and GPUI resolves it by name: a family the
machine does not have **falls back silently** to the system face. That makes the
family names the one documented form no measurement can see — an edited theme
paints a different typeface, not a broken contrast ratio.

`themeTypefaceFailures(theme)` holds both fields to five rules, listed in
`typefaceRules` and checked in `typefaceRoles` order:

| Rule | What it catches |
| ---- | --------------- |
| `non-empty` | A family that is empty or whitespace-only names nothing. |
| `trimmed` | A name with surrounding whitespace — `" Inter"` — is not the installed name; the runtime matches the family string it is given. A whitespace-only value is the `non-empty` rule's diagnostic alone. |
| `single-family` | A comma list — `"Inter, system-ui, sans-serif"` — is one string to the runtime, so it names a family no machine has. |
| `quoted` | A CSS-quoted name — `"Helvetica Neue"` — carries the quote characters into the family lookup, so it names no installed family. A half-copied declaration with one quote at an edge is the same silent fallback, while an apostrophe inside a name (`D'Nealian`) is one family and passes. |
| `css-generic` | A CSS generic keyword — `system-ui`, `sans-serif`, `monospace` and the rest of `cssGenericFamilies` — is CSS syntax, not a family the font database holds; `.SystemUIFont` is the native sentinel for the operating system's UI face. |

```ts
import { extendTheme, getTheme, themeTypefaceFailures } from "@gpuixui/tokens";

const stacked = extendTheme(getTheme("light"), {
  typography: { sans: "Inter, system-ui, sans-serif" },
});

themeTypefaceFailures(stacked);
// [{ role: "sans", rule: "single-family", value: "Inter, system-ui, sans-serif" }]
```

A `TypefaceFailure` carries the `role` (`sans` or `mono`), the `rule` it broke
and the `value` the theme carried. A name with a single space inside it —
`Helvetica Neue` — is one family and passes: the rule is surrounding
whitespace, not internal whitespace. The `.SystemUIFont` sentinel
every shipped theme uses passes too. The check does not ask whether the machine
has the face, because the package cannot know: it holds the form, and the type
facts above already state that an unknown family falls back silently.

`cssGenericFamilies` is the rule's domain, in CSS Fonts 4 order: `serif`,
`sans-serif`, `cursive`, `fantasy`, `monospace`, `system-ui`, `ui-serif`,
`ui-sans-serif`, `ui-monospace`, `ui-rounded`, `math`, `emoji` and `fangsong`.
The test reads the value as written, so a padded keyword reports `trimmed`
first; once trimmed it reports `css-generic`. A padded quoted name reports
`trimmed` alone in the same way, and `quoted` once the padding is gone.

Every shipped identity theme, platform variant and recipe passes, so no family
moves; `platforms.test.ts` already holds the shipped platform table to the same
single-family rule. The executed example is
[`src/typeface.example.ts`](../packages/tokens/src/typeface.example.ts).

#### Text hierarchy

The colour check enforces minimums, so it cannot see an inverted hierarchy. The
design system documents the body role each surface paints — `foreground` on the
canvas and the row washes, `cardForeground` on a card, `popoverForeground` on a
menu, dialog or toast and `inputForeground` in a field — then secondary text
(`mutedForeground`), then the two roles below it, an unavailable label
(`disabledForeground`) and a field's hint (`placeholder`). A surface's own body
role is the tier its secondary text sits below, so a card, menu or field that
renders its labels at secondary strength is an inverted hierarchy even though
both roles clear their floors.
`themeTextTierFailures(theme, contrast = theme.contrast)` holds each tier to one
`contrastFloors[level].step` (1.05:1) below the tier above it, measured **on the
same surface**, where both roles already have a documented pair. `textTiers` is
the ordered list: `mutedForeground` below `foreground`, `mutedForeground` below
`cardForeground`, `mutedForeground` below `popoverForeground`, `mutedForeground`
below `inputForeground`, `disabledForeground` below `mutedForeground`,
`placeholder` below `mutedForeground`, and — the last two are **states** rather
than body tiers — `disabledForeground` below `softActionForeground`, so the
unavailable label of a filled status-panel action stays visibly dimmer than the
enabled one, and `selectedForeground` below `foreground`, so a selected row's
inherited label stays a step below the title painted over the same fill. A
`TextTierFailure` carries the two ratios
and the step:

```ts
import { extendTheme, getTheme, themeTextTierFailures } from "@gpuixui/tokens";

const identity = getTheme("light");
const flattened = extendTheme(identity, {
  colors: { disabledForeground: identity.colors.mutedForeground },
});

themeTextTierFailures(flattened); // a failure per surface the tiers share
```

The surfaces are derived from `contrastPairs`, not retyped: thirteen shared
surfaces for secondary text below body copy, one `card` for `cardForeground`,
four for `popoverForeground` (`popover` and the three row washes it shares), the
fourteen surfaces typed text is documented on for `inputForeground` (`muted`,
`background`, `card`, `popover`, `input`, the pressed `selectedActive` and the
four row washes, plus the four soft status fills a field inside a status panel
paints), fourteen for the
inactive label below secondary text (every surface `inactivePairs` measures
except the `disabled` fill, which carries no secondary text), fourteen for a hint
and a caption, five for the disabled panel-action label below the enabled one
(`softAction` and the four soft fills), and five for the selected row's label
below its title (the `hover`/`active`/`accent`/`selected`/`selectedActive` fills
both roles are documented on). Every shipped set clears the step; the
tightest are **1.274:1**
(`mutedForeground` vs `foreground`, high-contrast light on `warningSoft`),
**1.274:1** (`mutedForeground` vs `cardForeground`, high-contrast light on
`card`), **1.274:1** (`mutedForeground` vs `popoverForeground`, high-contrast
light on `popover`), **1.274:1** (`mutedForeground` vs `inputForeground`,
high-contrast light on `muted`), **1.168:1** (`disabledForeground` vs
`mutedForeground`, high-contrast dark on `active`), **1.157:1**
(`placeholder` vs `mutedForeground`, high-contrast dark on every surface the two
share), **1.542:1** (`disabledForeground` vs `softActionForeground`,
high-contrast dark on `successSoft`) and **1.106:1** (`selectedForeground` vs
`foreground`, `Dark · Windows` on `hover`). Every shipped set
still clears the step; the check exists for the theme a consumer edits. A theme
that sets `disabledForeground` to
`foreground` still passes every floor, and is reported only here.

`selectedForeground` is deliberately not a body tier: it is the
secondary-strength tint an inherited label keeps inside a selected row, whose
title is painted with `foreground`, and it is documented only on the four row
fills. It **is** a state tier there: the label stays one step below the title
painted on the same fill, and every shipped set already clears the step — the
design does have it.

#### Interaction direction

The step lists publish how far a pointer state moves; they cannot publish which
way, because a contrast ratio is symmetric. A light `primaryHover` that is
*lighter* than its `primary`, and a press lighter still, clears the same 1.05:1
step, the on-colour floor and the surface floor as the designed direction — that
is exactly the defect plan `097` replaced, and a copied theme can reintroduce it
while every pair passes.

`stateLadders` is the ordered list of ladders the design system documents —
`stateLadderNames` is its index, so a diagnostics table iterates the names
instead of retyping them: the
four filled families, derived from `filledControlFamilies` (`x`, `xHover`,
`xActive`), the action a soft status panel carries (`softAction`,
`softActionHover`, `softActionActive`), the generic wash a ghost or outline
control paints (`hover`, `active`), the selected step past the accent a row
hovers with (`accent`, `selected`), the selectable row's press past that same
accent hover (`accent`, `active`, the direction of `rowPressStepPairs`), and the
selected row's press (`selected`, `selectedActive`), the one ladder that moves
**toward** the canvas: pressing a chosen row previews the row it returns to when
the click deselects it.

`themeDirectionFailures(theme)` reads the direction the theme's declared mode
requires — `darker` in light, `lighter` in dark, and the reverse for a ladder
whose `direction` is `"toward"` — compares each consecutive pair
with `relativeLuminance`, and reports a step that moves the other way as a
`DirectionFailure` carrying the ladder, both roles, the expected direction and
both luminances. A value the token maths cannot parse is reported too, because
no direction can be established.

```ts
import { extendTheme, getTheme, themeDirectionFailures } from "@gpuixui/tokens";

const inverted = extendTheme(getTheme("light"), {
  colors: {
    primary: "#3A2A9A",
    primaryHover: "#4A38AE",
    primaryActive: "#5A46C2",
  },
});

themeDirectionFailures(inverted); // two `darker` failures, one per step
```

An **equal** pair is not reported here: `stateStepPairs`, `softActionStepPairs`,
`washStepPairs`, `selectionStepPairs`, `rowPressStepPairs` and
`selectionPressStepPairs` own the collapsed
step, so one edit produces one diagnostic. Every shipped identity theme, platform variant and
recipe steps the expected way on every ladder, so a shipped set returns `[]` and
no colour moves; the check exists for the theme a consumer edits. The
`filled-states.test.ts` suite still asserts the same direction on the shipped
constants.

#### One check

Running one of those checks is not the guarantee. A copied theme whose only
defect is a zero `borderWidth.strong` — the focus ring's spread, and the only
focus indicator the runtime can draw — a `shadow: "black"` tint, which makes
every elevation level fully opaque, a translucent `shadow` tint whose byte
`elevationShadow` replaces, a solid `overlay` scrim that hides the window, a
`sans: "Inter, system-ui, sans-serif"`
stack, which silently paints the system face, a `disabledForeground` raised
to body strength, a two-tone ring that collapses over a swatch, a find highlight
that erases its own text or collapses the
active match into the match, a native document whose fade or ink wash erases its
text, or a light pointer ladder that lightens on hover
returns `[]`
from `themeContrastFailures` while being unusable.
`themeFailures(theme, contrast = theme.contrast)` composes all of them and tags
each entry with the check that found it:

```ts
import { extendTheme, getTheme, themeFailures } from "@gpuixui/tokens";

const theme = extendTheme(getTheme("dark"), {
  colors: { shadow: "#00000080" },
  typography: { sans: "Inter, system-ui, sans-serif" },
  borderWidth: { strong: 0 },
});

themeFailures(theme);
// [ { kind: "opacity", … }, { kind: "typeface", … }, { kind: "metric", … } ]
```

The order is diagnostic: the format checks first — `color`, `opacity`,
then `typeface`, so a malformed role is named before the `NaN` ratios it causes,
an alpha channel before the tint it repaints and a malformed family before the
type scale painted with it — then `contrast`, then `ring`, then `highlight`, then
`nativeText`, then `hierarchy`, then `direction`, then `metric`. `themeChecks`
is that order as a list and
`ThemeFailureKind` is the union it derives, so a report or a settings screen
names each check without retyping them, and adding a check is one edit at the
index. Each check's own JSDoc names its position in that list, held by
`check-ordinals.test.ts`. A `ThemeFailure` is the underlying `ColorFailure`,
`OpacityFailure`, `TypefaceFailure`, `ContrastFailure`, `RingFailure`,
`HighlightFailure`, `NativeTextFailure`,
`TextTierFailure`, `DirectionFailure` or
`MetricFailure` — the
same payload the individual check returns — plus its `kind`. A
`HighlightFailure` is either arm: `pairClass: "secondary"` carries the wash,
surface, role and ratio, and `pairClass: "step"` carries the surface and the
ratio between the two washes. The `contrast`
argument defaults to the level the theme declares and reaches the contrast,
ring, highlight and hierarchy halves unchanged, so `themeFailures(theme, "high")` asks
a stricter question of a theme that does not claim AAA floors; the opacity and
metric halves are level-independent, because a shape does not change at AAA. A
consumer's test is one
assertion:

```ts
import { themeFailures } from "@gpuixui/tokens";

expect(themeFailures(brandTheme)).toEqual([]);
```

Every shipped identity theme, platform variant and recipe returns `[]`. The set
itself is [`shippedThemes`](#every-shipped-theme). The executed example is
[`src/theme-check.example.ts`](../packages/tokens/src/theme-check.example.ts).

The role and shadow sets behind the shipped themes are exported as
`lightColors`, `darkColors`, `highContrastLightColors`,
`highContrastDarkColors`, `lightElevation`, `darkElevation` and
`highContrastDarkElevation`. They are the
objects each theme points at, exported for tooling and table generation;
component source reads `theme.colors` and `theme.elevation`, never a fixed set. A
consumer theme may share an untouched set or replace it through `extendTheme`.
An elevation level is geometry plus an alpha, so a replaced level composes with
the theme's `colors.shadow` tint like a shipped one. `elevationLevels` is the
ordered level index, `elevationSurfaces` the six page surfaces the contrast
check paints each level over and `elevationContentSurfaces` the fifteen resting
content fills it also paints a floating `md` shadow over.

#### Every shipped theme

`shippedThemes` is the ordered list of every theme the library ships, each with
the axis it came from. It is derived from the same indexes the resolvers use, so
it cannot omit a platform, a recipe or a contrast level:

```ts
import { shippedThemes, themeFailures } from "@gpuixui/tokens";

const failures = shippedThemes.flatMap(({ theme }) => themeFailures(theme));
failures; // []
```

Each entry's `theme` is a resolved `Theme`, and `mode`, `contrast` and `name` are
fields on it, so the provenance — `source`, plus `platform` or `recipe` — cannot
disagree with the value. The length is **24** today: 4 `identity` sets, 12
`platform` sets (3 platforms × 2 modes × 2 contrasts) and 8 `recipe` sets (2 ×
2 × 2). The `default` platform is not a variant: `platformVariants` is
`platformNames` without it, because it resolves to the identity itself.

A gallery, a visual-regression suite or a QA harness that needs every shipped
look iterates the same list; nothing is retyped. The executed example is
[`src/shipped-themes.example.ts`](../packages/tokens/src/shipped-themes.example.ts).

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
   the outer ring never changes layout. A failed field paints
   `invalidFocusRing(theme)` — the same geometry, recoloured with the error
   role. A control that clips the shadow, or
   paints the indicator inside a filled cell, uses `insetFocusRing(theme,
   family)` — the family's on-colour at the same thickness. See [Focus](#focus).
6. A filled control reads its resting, hover and pressed fills from
   `filledControl(theme, family)`; never composite `alpha(fill, …)` for a state.
7. Text paints a foreground role: `foreground`/`mutedForeground`, the surface's
   own `*Foreground` (`cardForeground`, `popoverForeground`,
   `selectedForeground`, `accentForeground`, a family's `xForeground`), a tone's
   `xText` through `statusTone`, or `primaryText` for a link. A solid fill
   (`primary`, `success`, `warning`, `destructive`) is a surface, never a label
   colour — the light `success` fill barely clears the secondary floor on a card,
   and a platform style can take it below.
8. An inactive control paints roles, not a fade: `disabledControl(theme)` returns
   the cleared `opacity`, the `disabled` fill, the `disabledForeground` label and
   the `border` edge that carries the shape. An `opacity: 0.5` dim composites
   the label with its own fill, and its readability then depends on the panel
   behind the control. [A full disabled Button
   shape](../packages/tokens/src/disabled-state.example.ts) is in the examples.

```ts
import { disabledControl, getTheme } from "@gpuixui/tokens";

const theme = getTheme("light");
const style = disabledControl(theme);
// { opacity: 1, backgroundColor: disabled,
//   color: disabledForeground, borderColor: border }
```

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

Every numeric scale owns the same kind of index, so a table reads a member
without a cast: `spacingSteps`, `radiusSteps`, `borderWidthSteps`,
`iconSizeSteps`, `avatarSizeSteps`, `dimensionNames` and `paletteRamps`. Each
is the scale's keys in documentation order, so `spacingSteps` is typed
`keyof Spacing` and `spacing[step]` type-checks:

```ts
import { spacing, spacingSteps } from "@gpuixui/tokens";

const rows = spacingSteps.map((step) => ({ step, value: spacing[step] }));
```

`densityNames` and `densityPresets` are the preset order and its metrics;
`controlSizes`, `elevationLevels`, `motionLevels`, `motionPhases`,
`typefaceRoles`, `metricGroups` and `stateLadderNames` index the remaining
groups. A scale member
that is not in its index fails `scale-indexes.test.ts`, so a value table cannot
silently omit it.

A runnable table builder is
[`src/scale-indexes.example.ts`](../packages/tokens/src/scale-indexes.example.ts),
and [`src/state-ladder-index.example.ts`](../packages/tokens/src/state-ladder-index.example.ts)
groups a theme's direction failures by ladder.

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
caption sits on, secondary text on the `hover`, `active`, `accent`, `selected`
and `selectedActive` washes a row paints behind a description, and status text
(`xText`) on `background`, `card`, `popover`, the `muted` panel, those four
washes and the pressed `selectedActive`;
3:1 for focus and essential boundaries, including the `destructive` ring an
invalid control paints, in the default themes; 4.5:1 for them in the
high-contrast variants; and 3:1 for an inactive label, raised to 4.5:1 at
high contrast). The inactive floor is new in plan `306`: `inactivePairs`
measures `disabledForeground` on its own fill, the field's `input` fill (plan
`650`), the plain surfaces, the four row washes, the pressed `selectedActive` a
chosen row keeps while a disabled control is pressed (`selectionPressPairs`) and
the four soft status fills a tone-tinted Alert's action sits on (plan `307`),
because a disabled `Select` item paints it on the menu's `popover`
with no fill behind it and measured 1.99:1 on Linux dark. The `disabled` fill
stays near the panel by design, so a disabled control's shape is carried by its
`border` edge — held to the divider floor on `disabled`, and on the `muted` panel
a settings sidebar divides (plan `306`). The filled action inside a status panel
keeps its raised fill when it is disabled and paints `disabledForeground`:
`inactivePanelActionPairs` holds the resting label (5.148:1 identity dark,
7.310:1 AAA dark), and the label is also a step below `softActionForeground`, so
a disabled action cannot look enabled. The hover and press fills are outside the
list because a disabled control does not step, and a ghost disabled action is
already covered by `inactiveSoftPairs`.
A step is measured too: each filled family's `xHover` is held one 1.05:1 step
from its `x` and its `xActive` from its `xHover` (`stateStepPairs`), and the
generic `hover`/`active` ladder that a ghost or outline control paints is held
the same way (`washStepPairs`, `active` from `hover`). Every shipped set clears
both ladders, so the floors guard an edited theme rather than a shipped value.
The **direction** of a step is measured beside its distance:
`themeDirectionFailures` walks `stateLadders` — the four filled families, the
panel action, the wash, the selected step, the selectable row's press and the
selected row's press — and reports a step that moves the wrong way, because a
symmetric ratio cannot see one. The selected row's press is the one ladder whose
direction is `"toward"` the canvas. Every shipped set steps the expected way (darker in light, lighter in
dark), so the check guards an edited theme; an equal pair stays the step lists'
defect and is not reported twice. The row press is the composition
`rowPressStepPairs` publishes the distance for: a dark row that presses darker
than its `accent` hover is a 1.094:1 step and passes every contrast pair, and
only the direction walk reports it. The executed inversion is
[`src/row-press.example.ts`](../packages/tokens/src/row-press.example.ts).
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
paints, on the `selected`/`selectedActive` fills an outline action sits on in a selected
row, or on the four soft status fills a status panel
divides (1.05:1, and 3:1 at high contrast), or if body text over
the composited `selection` wash drops below its body floor on any surface a glyph
is selected on — `background`, `card`, `muted`, `hover`, `active`, `accent`,
`popover` and `input`, with the selected row at the secondary floor.
`controlFillRoles` is the ordered list of the eight fills a bordered control
paints.
The audit found four: the inherited `successSoft` (`#0C452D`) measured 1.015:1
on Windows dark, 1.023:1 on the identity and 1.047:1 on Linux dark, and identity
dark's `destructiveSoft` (`#6B1A1D`) 1.040:1, under the 1.05:1 divider floor.
The two soft fills move one step darker and keep the surface floor on every
canvas.
Each soft surface also has a role for its edge (`xSoftBorder`), held to the
divider floor on that fill and on the nine surfaces a chip sits on —
`background`, `card` and `popover`, the `muted` panel, the four row washes and
the pressed selected fill —
so the shape a badge shows is measured where it is painted; the light warning
edge measured 1.036:1 on the macOS light pressed wash and 1.042:1 on the Linux
light one until plan `308` moved it, and the 30% mixture it replaced measured
1.12:1 on the high-contrast light `warning` surface, under the 3:1 that theme
requires.
A loading skeleton is a surface too: it is held to 1.05:1 against `background`,
`card`, `popover`, `muted`, `hover`, `active`, `accent`, `selected` and
`selectedActive`, so a placeholder never disappears into the card it fills or the
row it sits in. The
`accent` wash is the fill a selectable list row paints on hover, and a
placeholder row has no designed edge to keep its shape if the fill matches. The
audit found the placeholder was the `active` fill in the identity and
high-contrast themes, so a pressed loading row erased the placeholder (1.000:1);
the light and dark skeleton moved one ramp step away, and each dark platform
style carries its own. A skeleton also pulses: the primitive paints the role at
`skeletonPulseOpacity` (0.6) for half of every cycle, so the role is painted
through an alpha on the same nine surfaces. `skeletonPulsePairs` composites
that dim frame and `themeContrastFailures` reports it with the fraction as
`opacity`, because an opaque pair cannot see a fade. The audit found identity
dark at **1.008:1** on `selected` — its opaque pair was only 1.058:1, so the
fade crossed the floor — and the dark skeleton moved a half-step to `#434C5A`,
where the dim frame measures **1.074:1** and the opaque pair 1.179:1. The other
seven surfaces are wider, and every other shipped set already cleared 1.05:1 at
0.6 (the next tightest is 1.072:1), so no other value moves.
Brand-toned text is checked on the nine surfaces a link paints —
`background`, `card`, `popover`, `muted`, the `hover`/`active` washes, the
`accent`/`selected` fills a selectable row paints and the pressed
`selectedActive` it keeps — and on the four soft status fills a link in a status
panel sits on (`softPanelTextPairs`), so a platform accent cannot
ship as an unreadable link: the audit found macOS light at 4.21:1 on its
canvas and 3.44:1 on the pressed wash, macOS dark at 2.84:1 on `active`, and
high-contrast dark at 6.94:1 under its 7:1 floor. The two row fills were added
by plan `314`; the tightest shipped pair is `primaryText` on `selected` at
**5.69:1** (Windows dark), and the soft fills are tightest at
`primaryText` on `destructiveSoft` at **6.19:1** (identity light), so no value
moves.
Every platform variant is checked on its own canvas, not the identity's, so a
style that moves `background` or `card` is held to the status tints and skeleton
it inherits. The same loop holds secondary text on each variant's washes: macOS
dark shipped at 4.41:1 on `hover` and 3.55:1 on `active` until plan `079` moved
its secondary grey and pressed wash. A status panel's caption is checked on the
four soft status fills too (`softPanelTextPairs`), tightest at
`mutedForeground` on `destructiveSoft` at **6.69:1** (Windows light), so no value
moves. The control edge is held there too: four
sets had `border` equal to the fill it sits on (identity light `active`,
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
`popover`, the `hover`/`active`/`accent`/`selected`/`selectedActive` washes and
the four soft status fills an Alert's description paints
(`infoSoft`, `successSoft`, `warningSoft`, `destructiveSoft`); typed text is
`inputForeground` on the `input` fill, on the four `Surface` tones a transparent
field can sit on (`background`, `card`, `popover`, `muted`), on the four row
washes a field inside a row paints and the pressed `selectedActive` fill, and on
the four soft status fills a field inside a status panel paints
(`softFieldPairs`). The placeholder is held to the same
secondary floor on that same fourteen-surface list; a disabled field is out of scope
for these body pairs because the designed state reads `disabledForeground`, which
`inactivePairs` measures — the shipped primitives still dim the field at 50%,
which measures **3.273:1** on the macOS light `input` fill, under both the body
and the secondary floor — while a field inside a row is measured on the four row
washes (plan `527`). Identity dark `#7C8595` measured 4.03:1 on the quiet panel
and the floating surface until plan `317` moved it to `#858F9F`; that hint then
measured **3.132:1** on the `selected` fill a row keeps, and every one of the
twelve default sets missed the 4.5:1 floor on at least one wash — macOS light
3.714:1 on `active`, Windows dark 3.939:1, XP light 3.877:1 — while
`themeContrastFailures` returned `[]`. Plan `527` adds the four washes to both
lists, moves the fourteen shipped hints (the twelve default sets and the two AAA
palettes every high-contrast variant reads), and the tightest new pair is
**4.589:1** (Light · Windows XP on `active`) with the AAA sets at 7.113:1 or better. Plan `659`
closes the field's own content inside a tone-tinted status panel and the pressed
selected row: the identity light hint measured **4.439:1** on `destructiveSoft`
and 4.4954:1 on `successSoft`, and the AAA light hint 6.993:1 on
`destructiveSoft` under its 7:1 floor, while every check returned `[]`, so the
two hints move one half-step (`#5C6574` → `#5A6372`, `#3D4047` → `#3B3E45`).
Every shipped set now clears all four soft fills (4.575:1 at the tightest,
identity light), the typed text in a panel (10.455:1 at the tightest) and the
typed text on a pressed selected row (11.432:1), and the `selectedActive` hint
was already measured. The
panel and the floating surface are not academic: an avatar's fallback initials
sit on `muted`, and a date picker's month header sits on its `popover`. The row
washes are not either: a selectable list row paints `accent` on hover and
`selected` when selected, and its title is `foreground` on both — a
`ListItemTitle` sets its own colour, so it overrides the `selectedForeground`
the row inherits. Every pair clears the body floor with margin in every shipped
set, so no other value moves; the pairs exist so an edited theme cannot
break them silently.

The other row text roles have their own pairs. A menu row paints
`popoverForeground` on `hover`/`active`, a selected `Select` option paints it on
`selected` — the shipped `selectItemStyle` keeps the menu foreground when the row
fills — and a selected row under the pointer keeps its inherited
`selectedForeground` on `accent`, `hover`, `active` and the pressed
`selectedActive`; all four take the secondary floor, matching
`selectedForeground` on `selected`. The `accent` fill
is the one a selectable `ListItem` paints on hover, so it is a composition the
list API invites, not a spare surface. The tightest shipped values are
`foreground` on `selected` at **8.44:1** (Linux dark),
`popoverForeground` on `selected` at **8.98:1** (Linux dark),
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
selection-contract total to **eight** pairs. Plan `504` derives both lists from
`selectionFillRoles` instead, adding the solid status chips (`info`, `success`,
`warning`) and the status panel's `softAction`, which brings the total to
**sixteen** pairs and moves the AAA dark `softAction` one step darker so its
white label keeps 7:1 through the veil. Plan `346` holds a status
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
the tightest new pairs were **7.26:1** (identity dark, `infoSoft`) and
**5.08:1** (Windows light, `destructiveSoft`); plan `506`'s weaker identity wash
lifts the body figure to **8.14:1**, so no colour moves. Plan `363` adds
the card's own `cardForeground` to `selectionPairs` (18 → 19) beside the default
`foreground`, because the two are apart in both Windows recipes and only the
default role was measured through the wash; Windows dark is the tightest at
**9.65:1** after plan `506` weakened its wash (9.07:1 before), so no colour
moves and the plain `contrastPairs` count stays **338**.
Plan `366` adds the four status text roles through the selection wash on the
nine surfaces — `selectionStatusPairs`, 36 pairs — because `xText` is the role a
status label in a selectable row paints and the label is dragged over with the
copy around it; XP light `successText` measured 3.671:1 on `active` and every
high-contrast light tone 6.12–6.72:1 under 7:1, so the six light status roles
move one half-step between the ramp steps they used. The tightest pair is
**4.891:1** (Linux light `infoText` on `active`) and **7.370:1** at AAA
(identity light high `warningText` on `active`); the plain `contrastPairs` count
stays **338**.

A status label or indicator dot in a sidebar is measured on the `muted` quiet
panel — the surface plans `300` and `309` made first class — as well as on the
four row washes plan `083` covered, so a warning dot in a settings sidebar has a
pair. The tightest shipped value is `successText` on `muted` at **8.03:1**
(Windows light), above the 4.5:1 secondary floor.

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
families and the wash ladder use, eight sets move `selected` one designed
step (plus the authored Contoso light style), and macOS light's
`selectedForeground` moves with its deeper fill because no step that cleared the
pair kept the old blue at 4.5:1. The measurement is in `selection-states.test.ts`, and the pair
is part of the plain contract — taking it from 338 to **339** (plan `381`).

The same row presses to `active` while the pointer is down, so the press must be
a perceivable step from the `accent` hover it follows, not only from the generic
`hover` wash. `rowPressStepPairs` publishes that step. Identity dark measured
**1.004:1** and XP light **1.019:1** on the row's actual press until plan `619`
moved the two `active` values one designed step (`#2A303B` → `#2E3543`,
`#DDD7BE` → `#D8D2B7`); every shipped set now clears 1.05:1, the tightest being
Windows 7 light at **1.059:1**. The row keeps `active` rather than
`accentActive`: that role is a filled control's press, and on macOS dark a row
label measures **6.677:1** on it, under the 7:1 body floor.

A **chosen** row is the third state. It keeps `selected` under the pointer — the
hover wash is for the unselected row — and paints `selectedActive` while
pressed. That press previews the canvas the click returns it to when it
deselects the row, so it is the one pointer state that moves toward the canvas;
`selectedActive` is a 24% veil of the canvas colour over `selected`, shipped as
an editable opaque literal in every palette. `selectionPressStepPairs` publishes
the step, `selectionPressPairs` holds the six text roles, the disabled label
and the three chrome roles a pressed row paints, the four status labels come
from `statusTextSurfaces`, and `stateLadders` carries the ladder with
`direction: "toward"`. Before plan `651` the design system claimed the chosen row
pressed to `active`: identity light measured **1.001:1** there, eleven of twelve
default palettes sat under the 1.05:1 floor and eight moved the wrong way while
both checks returned `[]`. The transient fill is deliberately outside the
selection-wash, modal-scrim and elevation walks, which measure the persistent
`selected` fill at rest, like the other pointer washes (plan `359`).

The action a soft status panel carries is the last composition a canvas role
could not serve. `hover`, `active` and `secondary` are tuned against
`background`, `card`, `popover` and the quiet `muted` panel, and the four soft
fills sit in the same luminance band as those washes in each mode: **84 of the
288** shipped fill-on-tint pairs measured under 1.05:1, the worst Windows light
`active` on `destructiveSoft` at **1.0042:1** (`#E0E0E0` on `#FFD6D6`), and the
identity light `active` on `destructiveSoft` was 1.0492:1. Plan `394` ships
`softAction`, `softActionHover`, `softActionActive` and `softActionForeground`
as the raised family an Alert or Badge action paints. `softActionPairs` holds
each fill to the surface floor on the four soft fills, `softActionStepPairs`
holds the hover and press to the 1.05:1 `step` floor, and `softActionLabelPairs`
holds
`softActionForeground` on the three fills (the secondary floor) and on the four
soft fills a ghost action's label rests on (the body floor) — taking it from 339
to **360**. Every shipped set clears every pair, so no existing colour moves.
Plan `399` adds the solid status fill on the nine surfaces a status chip sits
on (`statusFillPairs`) — `destructive`'s four base surfaces are already
measured as an action fill — taking it from 360 to **388**; every shipped set
clears the floor (1.244:1 at the tightest), so no colour moves. Plan `503` adds
the value indicator's groove on the `hover`/`active` washes and the four soft
status fills — the surfaces plan `347` had left out — after identity light
`track` on `destructiveSoft` measured **1.009:1**, macOS light on `active`
**1.020:1**, XP light on `warningSoft` **1.007:1** and every AAA dark set on
`active` **1.047:1**; seven values move one designed step and XP light names its
own Luna green as the progress mark, taking it from 388 to **394**.
Plan `505` adds the elevation shadow to the check but not to `contrastPairs`: a
level's alpha depends on the level, so the walk reads `elevationLevels` and
composites each one over `elevationSurfaces` instead of publishing a
`[role, background, class]` row. `contrastPairs` stays **394**, and every
shipped set passes the walk.
Plan `507` measures the element the scrim carries: `dialogSurfacePairs`
composites `overlay` over the page layout and holds `popover` to the `surface`
floor, so a theme whose scrim meets its own floating surface is reported instead
of shipping a dialog with no face. The walk added six pairs to the checker and
none to `contrastPairs`, which stayed **394**; every shipped set passed
(1.210:1 at the tightest, the identity dark `selected` row).
Plan `526` extends that face to every surface a window shows — the list derives
from `overlaySurfaces`, so it covers the status chips and actions a dialog opens
over, not only the layout — after macOS dark's face met the scrim on its
`primary` at **1.021:1** while the edge it was said to rely on measured
**1.006:1** on a scrimmed `success` chip. The macOS dark scrim deepens to 82%
(`#000000D0`) so every content fill sits below the face, the walk grows
6 → **18** pairs, and every shipped set passes (1.079:1 at the tightest, Linux
dark on `destructive`); `contrastPairs` stays **394**. A dark brand with a darker
accent deepens its own scrim the same way: the executed example's inherited 65%
left the face at 1.038:1 over the brand action, so it ships 85%.
Plan `508` adds the last resting content family the scrim list omitted: the three
solid status chips a Badge paints (`info`, `success`, `warning`; `destructive` is
already an action fill), taking `overlaySurfaces` from fifteen to eighteen. Every
shipped set clears the floor (1.060:1 at the tightest, high-contrast dark `info`),
so no colour moves and `contrastPairs` stays **394**.
Plan `509` adds the two persistent surfaces the elevation list omitted:
`selected`, the fill a chosen row keeps while a context menu or preview card
opens over it, and `input`, the fill a popover flipped above its trigger opens
over. `elevationSurfaces` now derives from the six page layout surfaces, taking
the walk from twelve to eighteen painted pairs; every shipped set clears 1.05:1
(1.109:1 at the tightest, macOS dark `sm` on `input`), so no colour moves and
`contrastPairs` stays **394**.
Plan `584` closes the elevation walk's last content surface. Plan `509` measured
the six page surfaces, and plan `375` had already made the scrim total over the
resting actions, status chips and soft status panels a window shows — because a
dialog opens over an action as easily as over the canvas. A menu does too: a
dropdown opens across the button beside its trigger and a context menu over a
Badge. `elevationContentSurfaces` publishes the fifteen resting content fills,
the `md` walk measures the page surfaces and those fills (a `sm` card is placed
in the layout and a `lg` dialog sits on the scrim), and an edited theme whose
`shadow` meets a content fill is now reported instead of returning `[]`. Every
shipped set passes (1.058:1 at the tightest, AAA dark `md` on `info`), so no
colour moves and `contrastPairs` stays **405**.
Plan `510` holds the unavailable label through the text-selection wash.
`selectionColor` inherits into a disabled control's text, but `inactivePairs`
measured the label only at rest, so the previous light `#6E7787` measured
**2.586:1** on Windows light's `selected` fill and 2.604–2.945:1 on the other
default light sets, and the AAA sets 3.430:1 and 4.357:1, while every check
returned `[]`. `selectionInactivePairs` adds a washed pair on each of the
thirteen `inactiveSurfaces`, and three values move one designed step away from
the panel — `#6E7787` → `#545D6C`, `#5A5A5A` → `#444444`, `#A9A9A9` →
`#B0B0B0` — while staying 1.455:1 below `mutedForeground` at the tightest when
that plan shipped. Every shipped set passes (3.177:1 Aero light, 4.722:1 AAA
dark), no `contrastPairs` entry moves, and `contrastPairs` stays **394**.
Plan `512` holds the panel action's label through the same wash. Plan `394` gave
a ghost action inside a tone-tinted panel its own role, `softActionForeground`,
but `selectionSoftPairs` still measured the body `foreground` the description
paints, not the action's label; identity light with `softActionForeground:
"#444444"` measured 7.347–7.556:1 at rest and **5.685–5.847:1** through the wash,
under the 7:1 body floor, while `themeContrastFailures` returned `[]`. The four
soft fills join the list for the panel action — 12 → **16** pairs — and every
shipped set clears them (8.667:1 at the tightest, identity dark on `infoSoft`),
so no colour moves, no `contrastPairs` entry moves, and `contrastPairs` stays
**394**. The same audit corrected `softAction`'s JSDoc, which still described a
ghost action as painting the canvas `hover`/`active` washes plan `394` replaced.
Plan `514` gives the disabled action inside a tone-tinted panel its resting
pair — `disabledForeground` on `softAction`, at the inactive floor — and the
enabled/disabled step its tier, so a copied theme cannot erase the label or make
a disabled action look enabled; the canvas `disabled` fill is **1.0066:1** on XP
light's `warningSoft`, so it is not a panel shape. Every shipped set already
clears both, so no colour moves: taking it from 394 to **395**.
Plan `516` holds the focus ring on the value groove — `ring` on `track` for a
slider's thumb, whose shadow is painted around a thumb centred on the rail — and
moves the identity light ring one ramp step to `#4C39B5`, because `#7567F2`
measured **2.983:1** on the light track, under the boundary floor.
`ringTrackPairs` publishes the pair and every existing ring surface gains
contrast, taking it from 395 to **396**.
Plan `520` holds the disabled action inside a tone-tinted panel through the
inverse selection veil. Plan `514` gave the raised action a resting
`disabledForeground` label on `softAction` and plan `504` routes content on an
opaque fill through `selectionOnFill`, but no pair measured the disabled label
through that veil: identity dark measured **2.799:1** and high-contrast dark
**3.304:1** there, under the 3:1 / 4.5:1 `inactive` floor, while every check
returned `[]`. `selectionFillInactivePairs` publishes the one resting
composition, identity dark `disabledForeground` moves `#A1A9B7` → `#B0B8C6`
(3.317:1) and AAA dark `#B0B0B0` → `#D0D0D0` (4.645:1), and every shipped set
passes; `contrastPairs` stays **396**.
Plan `525` measures the row's own text through the selection wash:
`selectionPairs` assumed one body role per surface, so a menu row's
`popoverForeground` on `hover`/`active`/`selected` and a selected row's inherited
`selectedForeground` on `hover`/`active`/`accent` were unmeasured. High-contrast
light's `selectedForeground` measured **6.693:1** through the wash on `active`,
under 7:1, while every check returned `[]`; the role moves one iris step
(`#2E2370` → `#1C1547`), the six pairs join the list (20 → **26**), every shipped
set passes (4.898:1 macOS light at the tightest), and `contrastPairs` stays
**396**.
Plan `527` measures a field's typed text and hint on the four row washes an
in-place editor paints. Plans `317` and `319` measured `placeholder` and
`inputForeground` on the `input` fill and the four `Surface` tones, and the
reference called "a field on a row wash" deliberately out of scope; but
`InlineEdit` swaps a row's text for a field in place, and a row paints
`hover`/`active`/`accent`/`selected` behind its content while the field's edge,
boundary, ring and secondary chrome text were already measured there. All
twelve default sets missed the 4.5:1 secondary floor for the hint on at least
one wash — identity dark `#858F9F` measured **3.132:1** on `selected`, macOS
light 3.714:1 on `active`, Windows dark 3.939:1, XP light 3.877:1 — and the two
AAA palettes read by every high-contrast variant measured 5.665:1 (light) and
5.009:1 (dark) on `active`, under 7:1, while `themeContrastFailures` returned
`[]`. The four washes join both role lists, taking it from 396 to **404**, the
fourteen shipped hints move one designed step (identity dark `#858F9F` →
`#A8B0BD`, AAA
light `#4A4F58` → `#3D4047`, AAA dark `#B0B0B0` → `#D1D1D1`), every shipped set
passes (4.589:1 at the tightest, XP light on `active`; 7.113:1 at AAA) and the
hint stays a step below `mutedForeground` (1.157:1 at the tightest).
Plan `528` measures the last text role the washed contract omitted:
`primaryText` through the selection wash. The reference called an accent-toned
link a deliberate omission, on the reasoning that no perceivable wash keeps a
link at 7:1 at AAA — which plan `366` had already disproved for the four status
tones — but a link in a paragraph, list row or Alert is selected with the copy
around it. `selectionLinkPairs` publishes the role on the nine surfaces and the
four soft status fills (thirteen pairs); the audit found twelve of the
shipped sets below their floor, the AAA light link at **5.376:1** on
`destructiveSoft` under 7:1, macOS dark **3.708:1** on `selected`, Windows light
3.995:1, XP light 4.295:1, Aero light 4.022:1, macOS light 4.106:1 and Linux
dark 4.485:1 under 4.5:1. Seven values move one designed step inside their own
families (AAA light `#3B2C8F` → `#241C5C`, macOS `#0055B3` → `#004A9A` light and
`#64B5FF` → `#96CDFF` dark, Linux dark `#99C1F1` → `#A5CBF5`, Windows light
`#005BA1` → `#004F8A`, XP `#0046BD` → `#003FA8`, Aero `#0F55A3` → `#0C4A8C`),
every shipped set passes (4.729:1 at the tightest, Windows dark on `selected`;
7.484:1 at AAA) and `contrastPairs` stays **404**. Plan `557` adds the native
field's caret — `primaryText`, the accent's ink rather than the `primary` fill,
on the field's own `input` fill (`caretPairs`) — after macOS dark's fill
measured **2.748:1** on a `selected` row and **2.836:1** on a pressed one, under
the 3:1 mark floor, while the eight other surfaces a field sits on were already
held by the `primaryText` text pairs. Every shipped set clears the new pair
(**7.831:1** at the tightest, Linux dark), so no colour moves; taking it from
396 to **461** across plans `527`, `557`, `595`, `619`, `650`, `651`, `659`
and `671`.
Plan `659` adds the field's typed text and hint inside a tone-tinted status
panel — `softFieldPairs`, eight pairs — and the typed text on a pressed selected
row, and moves the identity and AAA light hints one half-step that already
failed their soft-fill floors (`#5C6574` → `#5A6372`, `#3D4047` → `#3B3E45`).
A Toast is a `popover` card, not a tinted panel: `softAction` equals that card in
every light shipped set and measures **1.0000:1**, so a Toast action paints the
canvas neutral family (`filledControl(theme, "secondary")`), which the contract
measures on `popover`.

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
import { filledControl, getTheme } from "@gpuixui/tokens";

const theme = getTheme("light");
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

A runnable example of the three paints is
[`src/filled-control.example.ts`](../packages/tokens/src/filled-control.example.ts).

The accent family completes the matrix (plan `327`). A toggle that is on paints
`accent` with `accentForeground`; before `accentHover` and `accentActive`
existed, the only way to show a pointer state was
`alpha(accent, 0.9)` / `alpha(accent, 0.8)`, the same defect one family over —
the composite took its colour from the backdrop, moved *toward* the canvas in
dark mode, could not be tuned in a copied platform style and had no pair the
contract could check. The family now steps through its own designed values, and
an outlined toggle keeps its `border` edge on both, so the edge's divider
contract covers `accent`, `accentHover` and `accentActive` as well.

A runnable example of the three paints is
[`src/accent-states.example.ts`](../packages/tokens/src/accent-states.example.ts).

An interactive fill is a surface too. `stateFillSurfacePairs` holds the fifteen
fills a control or row paints as its own shape — the `hover` and `active` washes,
the `accent` family at rest, hover and press, `selected`, and the `primary`,
`secondary` and `destructive` families at rest, hover and press — to the 1.05:1
surface floor on the five surfaces they paint on: `background`, `card`,
`popover`, the quiet `muted` panel and the field's `input` fill. A field hosts
its own controls: the
`NumberField` steppers paint `hover` and `active` inside a field whose chrome is
`input`, and a field adornment action or a chip sits there too, so a wash that
matches the field is not a state. An edited theme with `input = hover` returned
`[]` from every check while the stepper's wash measured **1.000:1** — the same
wash on the card was still 1.133:1 — so the field fill joins the list (plan
`595`); every shipped set already clears the floor there (tightest **1.0695:1**,
`selectedActive` on `input` in Dark · Linux) and no colour moves.
`stateFillRoles` derives every filled family's rest, hover and press from
`filledControlFamilies` and adds the two generic washes and `selected`;
`stateFillSurfaces` is its surface list, so a fifth family joins the family
index alone and a sixth surface joins the surface list alone. The audit found
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
tightest at **1.071:1** — so no colour moves. The audit also found two shipped
compositions on the *wrong* role pair: a secondary control whose `hover` is its
own resting `secondary` fill (the same value in 19 of the shipped sets), and a
selectable row that presses to the neutral `active` while it hovers to `accent`
(1.004:1 in identity dark). Both use a designed family instead — `secondaryHover`
and `accentActive` — and are recorded in `TODO.md` rather than blessed as pairs.

A solid role painted as a **mark** is held to 3:1 (4.5:1 at AAA) instead: a
progress segment and a slider fill sit on the `track` groove, a slider thumb rings
its own `input` fill, and a rating star, combobox check or timeline dot sits on
the panel it paints on — a selected combobox option's check also sits on the
`hover` wash the row highlights with, so it is measured there too — `markRoles`
is the solid role list and `markPairs` the whole class. The native field's caret
is a mark too, but it is the accent's ink rather than a fill: `primaryText` on
the field's own `input` fill is `caretPairs`, published inside `markPairs`, while
the four `Surface` tones and the four row washes an in-place editor paints are
already `secondary` text pairs (plan `557`).
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
in each palette: `#D5D9E2` light and `#3D4552` dark in the identity, one value
per platform style, and `#C6C8CD`/`#414141` at high contrast. It is measured on
the four base surfaces, the persistent `accent`/`selected` row fills, the
`hover`/`active` washes a row or a slider paints under the pointer and the four
soft status fills an Alert or Badge provides, at 1.05:1 (`trackSurfacePairs`) —
a groove that disappears in a hovered row or inside a status panel erases an
indeterminate indicator, because the rail *is* the value while the reader
interacts with it (plan `503`). `primary`, `success`, `destructive` and
`mutedForeground` — the four `PROGRESS_TONES` — are marks on the groove
(`trackMarkPairs`). XP light's own `success` (`#0E6B40`) is what lets its rail
clear the pressed wash: the inherited identity green forced the groove toward the
canvas while XP's `active` fill forced it away. The tightest shipped pair is
Linux light `track` on the `active` wash at **1.050:1**, while identity dark's
`track` on its `selected` fill measures **1.058:1**; the tightest mark is macOS
light `success` on the groove at **3.04:1**. `primitives` still paints `muted`
for `Progress` and a `Slider`'s rail, and the Toast's 2px countdown groove paints
it too (`toast/viewport.tsx`); both migrations are recorded in `TODO.md`. The
shipped groove measures **1.000:1** on the `popover` card in the identity dark
theme and every default-contrast platform and recipe dark set, while the designed
`track` clears the floor there at **1.069:1** in the tightest shipped set
(Windows dark). [`src/toast-countdown.example.ts`](../packages/tokens/src/toast-countdown.example.ts)
is the copyable composition: `track` for the groove and the tone's `xText` for
the bar.

Elevation is held by `elevation.test.ts` and `elevation-tint.test.ts`: a stored
level is geometry plus an alpha and paints exactly the runtime's five fields, and
editing `colors.shadow` retints all three levels.
`elevation-shape-count.test.ts` holds an edited theme to the same one-entry
rule, because the shipped guard alone never saw a copied level. Before plan
`085` each level carried its own complete colour, so the documented tint changed
nothing and the same value was duplicated three times per set; the split keeps
every shipped hex byte-for-byte.

The focus ring is measured on the ten surfaces a focused control can sit on —
the canvas, card and popover, the `muted` panel a sidebar control sits on, the
`accent` wash a selectable row paints, the `hover`, `active`, `selected` and
pressed `selectedActive` washes, and the `track` groove a focused slider's thumb
is centred on — because
focus and selection co-occur in rows and a slider's ring paints over its own
value indicator. It is also measured on the
four soft status fills, because an Alert's action button is focused while it sits
on its own tint; every shipped variant already clears the floor there, so no
colour moves, and the pairs exist so an edited theme cannot remove the ring. A
field's own `input` fill
and a control's `secondary` fill are what the focus shadow surrounds, not what
it sits on, so they are not `ringSurfaces`; the groove is the one extra ring
surface, published separately as `ringTrackPairs` because an invalid slider
keeps the accent ring. The ring role has one other job: a
pressed field repaints its border with `ring` on its own `input` fill, the way
hover repaints it with `borderStrong`, so that control edge is a `boundary` pair
(`fieldPressedEdgePairs`, plan `343`). `ringSurfaces` in
`src/contrast.ts` is the shadow list, and `ring-surfaces.test.ts` and
`ring-track.test.ts` hold the public check to it. Secondary text is measured on `hover`, `active`, `accent` and
`selected`, because a list row, a combobox option and a menu item paint those
washes behind a description; status text (`xText`) is measured on `background`,
`card`, `popover`, the `muted` panel and those four washes, so a status label or
indicator dot in a sidebar, a hovered, pressed or selected row or a dialog is
covered; the `borderStrong` boundary is measured on
`popover`, the `muted` panel and those four washes, so a checkbox or field in a
quiet panel, a hovered, pressed, selectable or selected row still shows its edge.
It is also measured on the four soft status fills, because a tone-tinted Alert
carries actions — a field, a don't-show-again checkbox — whose edge must stay
visible.
Text selection is measured in both directions: `selectionPairs` holds the body
role each surface uses and `mutedForeground` on all nine `selectionSurfaces` to
their floors, a menu row's `popoverForeground` on the three washes it paints, and
a selected row's inherited `selectedForeground` on all four resting fills it
keeps, plus the pressed `selectedActive`, and
`selectionWashPairs` holds the wash itself to the 1.05:1
perceivability floor on each plain surface and on the `disabled` fill an
unavailable label keeps, because a highlight can be readable and still be
invisible. Windows dark and both high-contrast sets already cleared the secondary
floor through the wash; the other seven moved their secondary grey one step away
from the canvas (plan `087`). The four soft status surfaces are measured the same
way: `selectionSoftPairs` holds the tone's `xSoftForeground`, the body
`foreground`, the panel action's `softActionForeground` and the caption
`mutedForeground` to their floors through the wash,
and `selectionSoftWashPairs` the wash to 1.05:1, after identity light
`successSoftForeground` measured 5.83:1 and Windows dark's wash over
`destructiveSoft` 1.005:1 (plan `091`). Every shipped set clears the two roles
added in plan `362` — the identity dark body on `infoSoft` at **8.14:1** and Windows
light's caption on `destructiveSoft` at **5.08:1** at the tightest — and the
ghost action's label plan `394` moved off `foreground` joins them in plan `512`:
every shipped set clears **8.667:1** (identity dark on `infoSoft`), so no colour
moves. A status panel now keeps its description, its action and its caption
selected on any platform, and a brand-toned link is held through the wash too
(`selectionLinkPairs`, plan `528`). The card's own
`cardForeground` is measured beside the default `foreground` (plan `363`), so a
theme whose card text is readable at rest cannot lose it under the wash — the
two roles are already apart in both Windows recipes, and Windows dark is the
tightest at **9.65:1**, so no colour moves. The unavailable label joins the
list — `selectionInactivePairs` holds `disabledForeground` over the wash on the
fourteen `inactiveSurfaces`, because a selected disabled label measured
**2.586:1** on Windows light's `selected` fill and 3.430 / 4.357:1 in the AAA
sets while every check returned `[]`; the three values moved and the tightest
washed pair is **3.177:1** (plan `510`). A field's typed text is held on the
twelve surfaces a field sits on beyond its `input` fill (`selectionInputPairs`),
whose own pair is in `selectionPairs`, so the two lists cover the role's whole
at-rest domain (plan `689`).

The modal scrim is a surface wash too. `overlayWashPairs` composites `overlay`
over the twenty-one surfaces `overlaySurfaces` names — `background`, `card`,
`muted`, `input`, `selected`, `popover`, the resting filled actions
(`primary`, `secondary`, `accent`, `destructive`), the three solid status chips
a Badge paints (`info`, `success`, `warning`), the raised action a status panel
carries (`softAction`), the four soft status panels (`infoSoft`, `successSoft`,
`warningSoft`, `destructiveSoft`), a disabled control (`disabled`), a loading
row (`skeleton`) and a value groove (`track`) — and holds the result to 1.05:1,
because a scrim
that paints its own surface is an invisible modal backdrop. The transient
pointer washes and the filled families' hover and press steps are excluded — the
pointer leaves the row to reach the dialog — but `selected` persists, `input` is
part of the
layout, the page's actions and the panel's action keep their resting fills, a
status panel stays on screen and the three solid status chips stay painted, so
all of them are measured (plans `359`, `375`, `395` and `610`). The audit found
high-contrast dark's `#000000CC` measured **1.000:1** on the pure black canvas —
an 80% black veil over black — while every other shipped set cleared the floor.
The AAA dark theme now veils with light (`#FFFFFF26`): a dialog's separation
cannot come from darkening a canvas that is already black. `overlay` stops being
an exempt role; it is measured like the selection wash and reported with
`wash: "overlay"` (plan `099`). The tightest of the twenty-one pairs is
**1.060:1** (high-contrast dark, `overlay` on `info`), so the new surfaces
move no colour.

Every colour role is accounted for: `contrastPairs`, `selectionPairs`,
`selectionWashPairs`, `selectionSoftPairs`, `selectionSoftWashPairs`,
`selectionInputPairs`, `selectionFillPairs`, `selectionFillWashPairs`,
`selectionFillInactivePairs`, `softPanelTextPairs`, `selectionInactivePairs` and
`overlayWashPairs` measure the
painted roles — `inactivePairs` is the fourteen-surface
inactive list, `softBorderSurfacePairs` the nine-surface chip edge,
`statusFillPairs` the solid status fill on the same chip surfaces and `disabled`
is measured as its own fill — and
`themeContrastFailures` measures `shadow` composited at each elevation level's
alpha over `elevationSurfaces`. `contrast.test.ts` keeps a declared exemption
list for the one role that is not a pair: `scrollbar`, reserved because the
pinned runtime paints the platform scrollbar and exposes no tint. A new role that
is neither measured nor argued fails the suite, so the catalogue cannot grow a
blind spot like the ones plans `076`–`348` closed. The roles are still held to
the **form** the helpers parse:
`themeColorFailures` reports any of the 71 roles outside the six- or eight-digit
hex form, and `isHexColor` is the single-value predicate. A measured role in
another CSS form already fails the contrast check as `NaN`; plan `085` applies
`shadow` through `alpha()`, so an unparseable tint painted every elevation level
fully opaque, and since plan `505` the elevation check reports it as `NaN` too
(plan `371` owns the format).

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
`platform-extension.test.ts` proves the same path carries the numeric scales: a
style naming the type roles, spacing, borders, icon/avatar sizes and component
dimensions applies every one, an omitted group inherits, an explicit `undefined`
is ignored, the groups apply at high contrast, and no shipped style names them —
so the copyable file in `platform-extension.example.ts` owns the whole look
without moving a shipped value. `platform-motion.test.ts` proves the same file
carries a timing and one easing phase while the other phases inherit, and that a
copied curve is held to the runtime's control-point rules (plan `559`).
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

`packages/tokens/src/soft-action.test.ts` holds the panel action: every shipped
set clears the three lists, the reviewed neutral composition is still measured
at 84 of 288 pairs with the Windows light worst figure, and the public checker
reports an erased fill, a collapsed press and the label on a tint.
`packages/tokens/src/status-solid.test.ts` holds the third status tonality:
`statusTone(...).solid` resolves the fill and its on-colour in every shipped
set, the solid fills clear the surface floor on every chip surface, the public
checker reports a solid fill that matches its panel, and the mark class stays
`xText`.

`packages/tokens/src/figures.ts` holds the ratios the current-figure sentences
state — `documentedFigures` and `documentedTierFigures`, **29** entries across
this page, the design system, the README, the ledger and the ring's JSDoc — and
`packages/tokens/src/figures.test.ts` derives each one from `shippedThemes` with
the checker's own measurement and asserts both the figure and the set (and
surface) the sentence names. The quoted tightest figures beside each contract
list are derived by `docs.test.ts` over the same shipped sets, so
both suites read one enumeration and a palette edit and a sentence cannot drift
apart. It found three: the Toast's tone margin rounds to 11.98:1 (the page said
11.97), the disabled panel action measures 5.148:1 identity dark and 7.310:1 AAA
dark after plan `520` moved `disabledForeground`, and the value groove's
tightest surface pair is Linux light `track` on the `active` wash at 1.050:1 —
the page had named identity dark's `selected` fill, the tightest pair *within
that one fill*, which is what `docs.test.ts` measured before plan `536`
(plan `536`). Plan `537` extends the same table to the text hierarchy: a tier's
figure is a ratio of ratios, so `tierSurfaces`, `deriveTierFigure` and
`tierMinimum` measure it on the surfaces both roles are painted on — the rule
`themeTextTierFailures` uses — and the eight minima above are pinned with the set
and surface each sentence names. It found two: the panel action's 1.542:1 step is
high-contrast dark rather than identity dark (1.877:1), and the design system
still quoted plan 392's 1.440:1 for the hint after plan `527` moved it to
1.157:1.

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
  `<input>`/`<textarea>` paints both itself (`#8F8F8F` and `#7C86FF59`). The
  caret **is** themeable: `nativeFieldTheme(theme)` supplies it from the accent's
  readable ink (`primaryText`) through the `theme` prop, the only field that prop
  reaches, and `caretPairs` holds it on the field's `input` fill. The `placeholder`
  role covers a hint the consumer renders, and `selectionColor` covers app text;
  see [Native text fields](#native-text-fields).
- Find highlighting is held at the secondary floor, not the body floor: the
  runtime paints a translucent wash, and no perceivable wash keeps every syntax
  token at body strength. `nativeHighlight(theme)` replaces the runtime's
  unreadable accent default; see [Find highlighting](#find-highlighting).
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
- The neutral washes (`hover`, `active`) and the neutral fill (`secondary`) are
  **not** a supported action surface inside a soft status panel: the four tints
  sit in the same luminance band as those fills, and 84 of the 288 shipped
  fill-on-tint pairs measure under 1.05:1 (worst **1.0042:1**, Windows light
  `active` on `destructiveSoft`). An action there paints `softAction(theme)`; the
  `components` migration is recorded in `TODO.md` (plan `394`).
- No stacking scale; see [Layering](#layering).
- Native visual proof is the playground's theme gallery, not this document. See
  `TODO.md`.

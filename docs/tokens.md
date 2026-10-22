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
  applyStyle,
  auditTheme,
  blend,
  brandText,
  brandTextSurfaces,
  colorRoles,
  contrastFailures,
  contrastFloors,
  contrastFloorsFor,
  contrastPairs,
  contrastRatio,
  controlSizes,
  createTheme,
  currentPlatform,
  darkTheme,
  decorativeFailures,
  decorativeFloor,
  decorativeSurfaces,
  densityNames,
  elevationShadow,
  extendTheme,
  filledHover,
  filledPressed,
  focusRing,
  getTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  highContrastThemes,
  indicatorFailures,
  indicatorRoles,
  indicatorSurfaces,
  invalidColorRoles,
  invalidScales,
  isControlSize,
  isDensityName,
  isPlatformName,
  isRetroName,
  isStatusTone,
  isThemeContrast,
  isThemeMode,
  lightTheme,
  platformNames,
  platformStyles,
  platformTheme,
  platformTypes,
  registerFonts,
  retroNames,
  retroStyles,
  retroTheme,
  statusTone,
  statusTones,
  statusEdgeAlpha,
  systemUiFont,
  textStyle,
  themeContrasts,
  themeModes,
  type ControlSize,
  type DecorativeFailure,
  type DecorativeSurface,
  type DensityName,
  type FilledAction,
  type FocusRing,
  type FontRegistrar,
  type FontSource,
  type IndicatorFailure,
  type InvalidColorRole,
  type ContrastFloors,
  type ContrastPair,
  type PlatformName,
  type PlatformStyle,
  type RetroName,
  type StatusTone,
  type Theme,
  type ThemeAudit,
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
to 3:1.

There are 47 roles. The four status families — `info`, `success`, `warning` and
`destructive` — each have a solid role with a readable foreground and a soft
pair (`xSoft` / `xSoftForeground`) for alerts, badges and toasts. `info` is blue,
not iris, so it can never be confused with `primary`.

The four washes — `hover`, `active`, `selected` and `accent` — are surfaces with
two contracts: the text on them keeps the contrast floors, and the tint itself
must be visible against every strip it can land on (see
[Decorative surfaces](#decorative-surfaces)). `secondary` is the tonal action's
resting fill and is held to the same perceptibility floor on the same strips,
because that variant paints no border — its fill is the whole control.

The literal tables behind the themes are exported too: `lightColors`,
`darkColors`, `highContrastLightColors` and `highContrastDarkColors`. Read them
when you need a value outside a resolved `Theme` — a generated table, a test, a
documentation page. A component reads `theme.colors`; the raw sets exist so a
tool never has to copy the palette out of this page.

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
| `secondary` | `#E1E5EC` | `#2A303B` | secondary action |
| `secondaryForeground` | `#2A303B` | `#E1E5EC` | text on `secondary` |
| `muted` | `#EEF1F5` | `#1E222A` | quiet surface |
| `mutedForeground` | `#4B5362` | `#C1C7D1` | secondary text |
| `accent` | `#E0E3FF` | `#2E2370` | tinted emphasis surface |
| `accentForeground` | `#3B2C8F` | `#C7CBFF` | text on `accent` |
| `destructive` | `#CC3439` | `#FF6B6B` | destructive action |
| `destructiveForeground` | `#FFFFFF` | `#3A0B0D` | text on `destructive` |
| `success` | `#158754` | `#3BC97F` | success |
| `successForeground` | `#FFFFFF` | `#042015` | text on `success` |
| `warning` | `#F5B01F` | `#FFC94D` | warning |
| `warningForeground` | `#2A1B00` | `#2A1B00` | text on `warning` |
| `info` | `#2559D6` | `#9FBEFF` | informational status, distinct from `primary` |
| `infoForeground` | `#FFFFFF` | `#11141A` | text and icons on `info` |
| `infoSoft` | `#C5D8FF` | `#173A88` | soft informational surface |
| `infoSoftForeground` | `#152F6B` | `#DEE9FF` | text and icons on `infoSoft` |
| `successSoft` | `#A8F0C6` | `#0E5135` | soft success surface |
| `successSoftForeground` | `#0A3A26` | `#D3F9E2` | text and icons on `successSoft` |
| `warningSoft` | `#FFDE8A` | `#6B4500` | soft warning surface |
| `warningSoftForeground` | `#4B3100` | `#FFEFC6` | text and icons on `warningSoft` |
| `destructiveSoft` | `#FFC6C6` | `#7E1D21` | soft destructive surface |
| `destructiveSoftForeground` | `#5C1619` | `#FFE0E0` | text and icons on `destructiveSoft` |
| `border` | `#E1E5EC` | `#2A303B` | dividers and decorative borders |
| `borderStrong` | `#6A7483` | `#949EAB` | essential control boundaries |
| `input` | `#FFFFFF` | `#191D25` | input field background |
| `inputForeground` | `#191D25` | `#EEF1F5` | text typed into an input |
| `placeholder` | `#606A79` | `#858E9F` | placeholder text |
| `ring` | `#5F4BDB` | `#A7A9FF` | focus ring |
| `selection` | `#7567F23D` | `#A7A9FF3D` | text selection wash (24% alpha) |
| `overlay` | `#00000073` | `#000000A6` | modal scrim |
| `hover` | `#E4E9F0` | `#272D37` | hover wash for ghost surfaces |
| `active` | `#D6DBE4` | `#333A46` | pressed wash |
| `selected` | `#DADDF8` | `#322773` | selected row or item |
| `selectedForeground` | `#3B2C8F` | `#C7CBFF` | text on `selected` |
| `disabled` | `#EEF1F5` | `#222730` | disabled surface |
| `disabledForeground` | `#A1A9B7` | `#545D6C` | disabled text |
| `skeleton` | `#E1E5EC` | `#2A303B` | loading placeholder |
| `scrollbar` | `#CBD1DB` | `#3D4552` | scrollbar thumb |
| `shadow` | `#191D2526` | `#00000080` | elevation tint |

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
transparent.

```ts
import { alpha } from "@gpuixui/tokens";

alpha("#2559D6", 0.3); // "#2559D64D"
alpha("transparent", 0.3); // "transparent"
```

### `alphaOf`

`alphaOf(color)` reads a colour's alpha share as a number in `0…1` — the inverse
of `alpha`. A rule that restates a colour at the same strength in another tint
reads it here; an opaque colour — the 6- and 3-digit forms, or an 8-digit one
whose byte is `FF` — reads as `1`, as does one the parser does not recognise. The
elevation scale uses it, so a level's strength has one source.

```ts
import { alphaOf } from "@gpuixui/tokens";

alphaOf("#191D2514"); // 0.078
alphaOf("#191D25"); // 1
alphaOf("#191D25FF"); // 1 — a full byte is no share
```

### `blend`

`blend(color, toward, amount)` moves each channel of `color` `amount` of the way
to `toward`, rounding to the nearest byte. `amount` is clamped to `0…1`. The
result keeps `color`'s alpha byte when it has one and is opaque when it does not,
which is the point: an opaque mix never lets the surface behind an element show
through. A colour the parser does not recognise is returned unchanged, like
`alpha`.

```ts
import { blend } from "@gpuixui/tokens";

blend("#5F4BDB", "#191D25", 0.12); // "#5745C5"
blend("#5F4BDB4D", "#FFFFFF", 0.5); // "#AFA5ED4D"
```

`blend` is the rule behind the [action fills](#action-fills); components rarely
call it directly.

## Status tones

Alert, Badge and Toast share four status families. Each has a solid role, a
readable foreground and a designed soft pair, so a component never mixes a
readable text colour from the solid colour at runtime.

| Tone | Solid | Soft surface | Text on the soft surface |
| ---- | ----- | ------------ | ------------------------ |
| `info` | `info` / `infoForeground` | `infoSoft` | `infoSoftForeground` |
| `success` | `success` / `successForeground` | `successSoft` | `successSoftForeground` |
| `warning` | `warning` / `warningForeground` | `warningSoft` | `warningSoftForeground` |
| `destructive` | `destructive` / `destructiveForeground` | `destructiveSoft` | `destructiveSoftForeground` |

`statusTone(theme, tone)` resolves the soft surface, its readable foreground and
a 30%-alpha edge from the solid role:

```ts
import { statusTone } from "@gpuixui/tokens";

const tone = statusTone(theme, "info");
tone.background; // theme.colors.infoSoft
tone.foreground; // theme.colors.infoSoftForeground
tone.border; // alpha(theme.colors.info, statusEdgeAlpha)
```

`statusEdgeAlpha` is the share the edge paints — the one design value `statusTone`
and the decorative-surface contract share, so the edge a component paints is the
edge the contract measures. The soft surface and the edge are both **decorative**
(the message's text and icon carry the meaning), so each is held to the 1.05:1
perceptibility floor rather than the 3:1 boundary floor: the tint on the four
strips a message sits on, the edge on the tint it bounds and on both page
surfaces. See [Decorative surfaces](#decorative-surfaces) for the palette step
that follows from it. The label on the soft surface is text, so it is in the
contrast table instead: `xSoftForeground` on `xSoft` at the body floor.

`foreground` is the role to paint a status message **as text**, whether it sits
on the tone's soft surface (an Alert) or directly on `background`/`card`, a
popover or a `muted` strip (a field error, an inline warning, a destructive menu
row, a message in a muted sidebar). Every one of those strips is in the contrast
contract, so the message never borrows the solid fill role — which reads as a
fill, not as text, and is measured for the on-colour it carries, not for the page
behind it. The muted strip is the one that was missing: a `FieldError` paints the
tone's readable role with no fill of its own (`FIELD_ERROR` is a bare
`text-destructive`, and the component swaps in `statusTone(...).foreground`), so
the strip its form sits on is the surface it is read against — and the decorative
table already put that tone's tint and edge on `muted`. All four placements are
measured now; the tightest in the library is Luna light's warning text on its
beige toolbar at 8.78:1.

An alert's own copy is the tint's **second** ink: `ALERT_DESCRIPTION` is
`text-foreground` and `AlertDismiss` paints its glyph the same role, so the body
copy and the close control sit on `xSoft` in the page's role while the title and
icon keep the tone's readable one. The paint is deliberate — the page role is the
most readable text a theme has — so `foreground` on each of the four soft tints
is in the contrast table at the body floor rather than left to the component. A
brand that repaints `foreground` or authors its own tint is measured there; the
tightest shipped placement is Windows XP (Luna) dark's `warningSoft` at 7.14:1.

A runnable example spreads the result onto a container and its text; see
[`src/status-tone.example.ts`](../packages/tokens/src/status-tone.example.ts).

## Action fills

A filled face — an action (`primary`, `secondary`, `destructive`) or a toggle's
on-state (`accent`) — needs a hover and a press fill. Neither is a stored role.
`filledHover(theme, role)` and `filledPressed(theme, role)` derive an **opaque**
fill by moving the role toward the theme's `foreground`: a step darker in a light
theme, a step lighter in a dark one, so the fill always moves away from the
canvas. Hover moves 12% of the way, press 18%.

```ts
import {
  filledHover,
  filledPressed,
  type FilledAction,
  type FilledRole,
} from "@gpuixui/tokens";

const action: FilledAction = "primary";
const toggleOn: FilledRole = "accent";
filledHover(theme, action); // the hover fill
filledPressed(theme, toggleOn); // a further step, as far as its label allows
```

`FilledAction` is the three button families. `FilledRole` adds `accent`, the one
non-action face: a toggle's on-state paints it, so the primitives' `Toggle` takes
the same two helpers (`fill-accent` / `fill-accent-pressed`) and a pressed mode
is an opaque fill rather than a lifted alpha. Each role names the on-colour it
carries (`primaryForeground`,
`accentForeground`, …), and **18% is a ceiling rather than a promise**: the step
stops where that label would lose the floor its theme declares
(`contrastFloorsFor(theme).secondary` — 4.5:1 default, 7:1 high contrast). The
accent face is the one that needs the clamp: at the full press step its label
lands at **4.42:1** in macOS dark, under 4.5, and at **6.90:1** and **6.94:1** in
the two high-contrast themes, under 7, so those three styles press at 17%. Every
action keeps the full 18% in all 16 shipped, high-contrast, platform
and authored styles, so no shipped fill moved. A theme whose *resting* pair
already misses its floor cannot be protected — the gate reports it — so the
helpers keep the nominal step rather than removing the pointer cue as well.

Derived rather than six more roles for two reasons: a brand that overrides
`primary` gets a hover that belongs to it with no second edit, and the fill
stays opaque — a half-alpha hover (`alpha(primary, 0.5)`) showed whatever
surface was behind the button, so the same action read as two colours on a card
and on a dialog. The derivation is checked like a role pair: the on-colour text
keeps its contrast floor on both fills in every shipped theme (4.5:1 default,
7:1 high contrast), and both fills are opaque and move toward the foreground.

A pointer step has to be **seen**, and nothing measured that until it joined the
decorative contract: the contrast table measures role pairs and
`decorativeSurfaces` measures roles on strips, while a derived fill is neither.
`actionFeedbackPlacements` publishes the eight placements — every `filledRole`
(`filledRoles`) in both `filledFeedbackStates` — and `actionFeedbackFailures`
holds each one to `decorativeFloor` against the fill it replaces; the
`decorative` report a brand already runs carries them, so the audit's shape did
not change. `filledFeedback(source, role, state)` is the derivation on its own for
a source that may be a theme restored from storage: it answers `undefined` when
the source lacks the role or the `foreground` it moves toward, and that placement
is reported unmeasurable rather than skipped.

The check is reachable, not theoretical. The step is 12% / 18% of the way toward
`foreground`, which assumes the foreground is far from the action fill — true in
`Light`, `Dark` and every platform and authored style, and **not** guaranteed by
the type: `invisibleFeedbackBrand` (a brand whose page text and `primary` are both
a deep navy, so the page still reads and the fill still carries its white label)
hovers to exactly the fill it replaces, and the gate reports it. One shipped step
sat on the floor: Windows dark's `#60CDFF` primary hovered to **1.05:1**, a
primary button that never answered the pointer, so the platform carries
`#59C9FF` (1.059:1 hover, 1.086:1 press) and you can see the change in the
[platform chrome table](#platform-styles). The tightest placement over all 16
shipped, high-contrast, platform and authored styles is **1.06:1** (high-contrast
dark's primary hover).

```ts
import {
  actionFeedbackFailures,
  actionFeedbackPlacements,
  filledFeedback,
  filledFeedbackStates,
  filledRoles,
  type ActionFeedbackPlacement,
  type FilledFeedbackSource,
  type FilledFeedbackState,
} from "@gpuixui/tokens";

const placements: ReadonlyArray<ActionFeedbackPlacement> =
  actionFeedbackPlacements; // 4 roles × hover/pressed
const hover: FilledFeedbackState = filledFeedbackStates[0];
const stored: FilledFeedbackSource = { colors: { primary: "#1E3478" } };
filledRoles.map((role) => filledFeedback(theme, role, hover)); // the paints
placements.map(({ role }) => filledFeedback(stored, role, hover)); // undefined — no foreground
actionFeedbackFailures(theme); // [] when every hover and press is visible
```

Ghost and subtle surfaces are the other case: they paint no fill at rest and
take the `hover` / `active` washes instead. A filled action's **resting fill** is
measured too, because the tonal one has no border: `secondary` is held to the
perceptibility floor on every strip it can sit on (see
[Decorative surfaces](#decorative-surfaces)), which is why the base light
`secondary` is `#E1E5EC` rather than the `muted` value it used to be. A runnable
example spreads the three fills onto a control; see
[`src/action-states.example.ts`](../packages/tokens/src/action-states.example.ts),
and [`src/action-feedback.example.ts`](../packages/tokens/src/action-feedback.example.ts)
is the brand whose pointer step disappears.

## Brand text

A link, a text action, a breadcrumb's current page — brand-coloured **text** —
is not the `primary` role. `primary` is designed as a surface: it carries
`primaryForeground`, and the contrast table measures that pair. Written as text
it was measured by nothing (only the mark contract reads it, at the 3:1 a bar or
a dot needs), and the fill role is under the 4.5:1 text floor in most shipped
styles:

| Where the brand is written | Theme | Ratio |
| -------------------------- | ----- | ----- |
| `primary` on the `active` wash a pressed link tints | base light | **4.30:1** |
| `primary` on `active` | macOS dark | **3.10:1** |
| `primary` on `popover` | macOS dark | 3.81:1 |
| `primary` on `active` | Linux light | 3.44:1 |
| `primary` on the page | Windows XP (Luna) light | 4.31:1 |
| `primary` on `active` | Windows 7 (Aero) light | 3.83:1 |
| `primary` on the `accent` wash a hovered row paints | macOS dark | 3.06:1 |
| `primary` on `selected` | Windows XP (Luna) dark | 4.45:1 |

`brandText(theme)` returns a colour for them instead of a second palette:

```ts
import { brandText, type Theme } from "@gpuixui/tokens";

const link = { color: brandText(theme) };
```

It returns the theme's own `primary` when that already clears the floor on every
surface a link can sit on — the base dark theme does, so its links are its brand
— and otherwise moves the brand toward the theme's `foreground` in 2% steps
until the least readable placement clears. It never goes past `foreground`,
which is the most readable text role a theme has, and a brand value that cannot
be measured (translucent, or not a colour the renderer paints) is returned
unchanged rather than replaced by a guess.

`brandTextSurfaces` is the set it is held to: the four page surfaces a reader
reads on (`background`, `card`, `popover`, `muted`), the two washes a hovered and
a pressed link tints behind itself (`hover`, `active`), and the two washes a
**row** paints under an action in its `trailing` slot (`accent` while the pointer
is over the row, `selected` once it is chosen) — a wash is a surface with text on
it, so it is measured like one. The four status tints are deliberately outside
it; the next section measures why. The row is not decoration: the components
package's list row documents that slot as the place for an explicit action and
paints both washes there, the primitives' `Text tone="primary"` paints this
colour, and a `Box` can fill either wash behind it. Measured across the sixteen
shipped styles, most already cleared the row through the derivation, but the
Luna look's dark brand landed at **4.50:1** on the row it selects — under the
floor — so it steps once more, to 4.55:1.

The floor follows the theme's own contrast variant through `contrastFloorsFor`,
the rule the audit's contrast report already uses: 4.5:1 for a default theme,
7:1 for a high-contrast one. The high-contrast dark brand measures 6.94:1 as
text, so it steps once there even though the same value would pass a default
theme.

### A brand run inside a message

A message is a container: an `Alert`'s description says so in its own
documentation, and the fill behind it is the tone's `xSoft` role. A link action
placed there paints the tone's tint, not the page — and the tints are
deliberately **not** in `brandTextSurfaces`, because a tint is one tone away
from the page and a single colour measured on all of them would be dragged away
from the brand everywhere. Measured, the shared colour is under its floor in
**27 of the 64** tint placements across the sixteen styles (the count and every
cell below are computed by `brand-text.test.ts`, so they move with the
palettes):

| Where the brand is written | Theme | Ratio |
| -------------------------- | ----- | ----- |
| `primary` on `warningSoft` | macOS dark | **2.32:1** |
| the shared colour on `warningSoft` | macOS dark | **3.43:1** |
| the shared colour on `infoSoft` | base light | 4.46:1 |
| the shared colour on `warningSoft` | base dark | 3.94:1 |
| `primary` on `infoSoft` (a high-contrast theme asks 7:1) | High contrast light | 5.81:1 |

So a run that knows its surface asks for that surface. `brandTextOn(theme,
surface)` is the same derivation held to one role: the brand where that surface
already carries it, otherwise the smallest step toward `foreground` that does,
and the theme's own floor:

```ts
import { brandTextOn, type Theme } from "@gpuixui/tokens";

const link = {
  color: brandTextOn(theme, "infoSoft"),
  backgroundColor: theme.colors.infoSoft,
};
```

`src/brand-text.example.ts`'s `messageLinkStyles` is that call site.
`brandText(theme)` remains the answer for a run that may sit anywhere; the two
differ wherever the tint is harder than the page.

The message's **own copy** keeps the tone's readable role, not the brand:
`statusTone(theme, tone).foreground` is measured on that tint at the body floor
by the contrast table, so a warning's body text stays readable while its action
link keeps as much of the brand as the tint allows.

The other text a component writes in a status colour — a required marker, a
field error, an inline warning — is not `brandText`'s job: a status tone has its
own readable role, `statusTone(theme, tone).foreground`, measured as page text
on `background`, `card` and `popover`. What neither helper does is treat a solid
fill role (`primary`, `destructive`) as text; a component that still does is
recorded in `TODO.md` → Interlocks.

`packages/tokens/src/brand-text.test.ts` holds all 16 shipped, high-contrast,
platform and authored themes to the floor on all eight surfaces, reads the
painters that put a brand run on a row (a box's `accent`/`selected` tones, the
`text-brand` recipe and the row's two washes), proves the derivation is minimal
and stays between the brand and the theme's foreground, holds a high-contrast
theme to its own 7:1, and executes
[`src/brand-text.example.ts`](../packages/tokens/src/brand-text.example.ts).

## Data series

A chart mark's colour means "a different category", not "this is a warning". So
data marks get a categorical scale of their own rather than borrowing a semantic
role or a chart-local hex — the dashboard recipe's hand-coded palette
(`#8b5cf6`, `#3b82f6`, …) is the literal this scale replaces.

`seriesColors(theme)` returns the scale for the theme's mode and contrast
variant: **five** colours as a tuple, in the order a chart assigns them, so a
legend cannot come up short. A chart with more than five categories folds the
tail into "Other"; the scale is not a cycle.

| Series | Light | Dark | HC light | HC dark |
| ------ | ----- | ---- | -------- | ------- |
| `1` | `#5F4BDB` | `#A7A9FF` | `#4C39B5` | `#C7CBFF` |
| `2` | `#1B45AC` | `#6E9CFF` | `#2559D6` | `#6E9CFF` |
| `3` | `#158754` | `#1FA968` | `#0E5135` | `#3BC97F` |
| `4` | `#B57600` | `#FFDE8A` | `#8E5B00` | `#FFE7A8` |
| `5` | `#A5262B` | `#FF9E9E` | `#CC3439` | `#FFC6C6` |

The four tables are `lightSeries`, `darkSeries`, `highContrastLightSeries` and
`highContrastDarkSeries`. Three contracts are measured:

- **On the plot.** Every swatch is held to the theme's own boundary floor
  against every surface a plot is drawn on — `seriesSurfaces` is `background`,
  `card`, `popover` and the `muted` strip a toolbar or status bar paints — so
  3:1 by default and 4.5:1 for a high-contrast theme. The tightest of the four
  shipped tables is light series 4 at 3.34:1 on its muted strip; across every
  platform and authored style it is Aero's light amber on its muted strip at
  3.05:1. A chart painted on another role names it, because a surface nobody
  measures is a swatch nobody has checked:

  ```ts
  import { seriesFailures, themes } from "@gpuixui/tokens";

  // A sparkline in a segmented panel: the `secondary` strip it is drawn on,
  // not the page.
  seriesFailures(themes.dark, { surfaces: ["secondary"] }).surfaces; // []
  ```
- **Apart from each other.** Contrast cannot answer "are these two colours
  different" — a blue and a violet of one lightness measure near 1:1 yet read
  apart — so pairs are held to `seriesDistinctnessFloor`, an OKLab distance of
  `0.06` (roughly three just-noticeable steps). The dark table sits closest to
  the floor (0.082).
- **Apart for every reader.** A pair that separates for a full-colour reader can
  still collapse for one with a colour-vision deficiency, so every pair is
  simulated for `colorVisionDeficiencies` — `protanopia`, `deuteranopia` and
  `tritanopia` — with `simulateColorVision` and measured again, against
  `seriesDeficiencyFloor`, an OKLab distance of `0.05`. The simulation is the
  severity-1.0 model of Machado, Oliveira and Fernandes (2009) in linear sRGB:
  dichromatic protanopia, deuteranopia and tritanopia, so it answers "do these
  two swatches still differ for that reader", not "what exactly does this reader
  see". It found the previous tables collapsing — light series 2/3 at 0.030
  under tritanopia and high-contrast dark series 3/5 at 0.016 under
  deuteranopia — and the four tables above now keep every simulated pair at or
  above the floor (the tightest is 0.054). The model does not cover anomalous
  trichromacy or an uncalibrated display, so a chart still labels its series.

```ts
import { simulateColorVision } from "@gpuixui/tokens";

simulateColorVision("#C02B45", "deuteranopia"); // that red to a deuteranope
```

`seriesFailures(theme, floors?)` reports all three, naming the series position,
the surface, the pair or the deficiency, and reporting a translucent or
malformed swatch rather than skipping it. `auditTheme` includes that report, so
a brand is held to the same gate. A theme owns its scale by carrying `series`:

```ts
import { auditTheme, extendTheme, seriesColors, type SeriesColors } from "@gpuixui/tokens";

const house: SeriesColors = ["#6A45F0", "#0E7490", "#116A43", "#B57600", "#A5262B"];
const brand = extendTheme(theme, { series: house });

seriesColors(brand); // the house scale, not the shipped one
auditTheme(brand).passed; // measured on the plot, against itself and for every deficiency
```

The array replaces the shipped table whole, like an elevation level: the five
positions are an order the chart and its legend both read, so a partial array is
not a merge. A **look** owns one the same way, in the `PlatformStyle` shape: a
style may declare `series` per mode, `applyStyle` hands it to the base theme
under the rule its palette follows (a high-contrast base keeps its own scale),
and a mode a look does not name — and every style that declares none —
resolves the base theme's table. Windows XP's Luna is the measured case: its
beige toolbar swallows the shared light amber at 2.75:1, so `retroStyles.luna`
declares `lunaSeries` for the light edition — the amber one step deeper,
`#9A6300` — and leaves its dark edition on the shared dark table, which separates
on that navy page already. A house that wants other hues copies the style and
replaces the five positions; `series.example.ts`'s `houseLook` is that copy. See
[Authored looks](#authored-looks). A runnable example builds a legend, an
audit and a look that owns its table; see
[`src/series.example.ts`](../packages/tokens/src/series.example.ts).

## High contrast

Each mode has a high-contrast variant for accessibility. It is an ordinary
`Theme` — the same 47 roles and the same type, spacing, radius, density, border
width and icon scales — with colour values chosen to meet stricter floors: AAA
body text (7:1), 7:1 secondary and on-colour text, and 4.5:1 focus rings and
essential boundaries. Changing values rather than roles is why no component has
to know the variant exists.

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
| `secondary` | `#E8E8E8` | `#2E2E2E` | secondary action |
| `secondaryForeground` | `#000000` | `#FFFFFF` | text on `secondary` |
| `muted` | `#F2F2F2` | `#1A1A1A` | quiet surface |
| `mutedForeground` | `#1F1F1F` | `#E0E0E0` | secondary text |
| `accent` | `#E0E3FF` | `#231B59` | tinted emphasis surface |
| `accentForeground` | `#2E2370` | `#E0E3FF` | text on `accent` |
| `destructive` | `#7E1D21` | `#FF9E9E` | destructive action |
| `destructiveForeground` | `#FFFFFF` | `#000000` | text on `destructive` |
| `success` | `#0E5135` | `#6FE0A3` | success |
| `successForeground` | `#FFFFFF` | `#000000` | text on `success` |
| `warning` | `#F5B01F` | `#FFC94D` | warning |
| `warningForeground` | `#000000` | `#000000` | text on `warning` |
| `info` | `#1B45AC` | `#C5D8FF` | informational status, distinct from `primary` |
| `infoForeground` | `#FFFFFF` | `#000000` | text and icons on `info` |
| `infoSoft` | `#9FBEFF` | `#152F6B` | soft informational surface |
| `infoSoftForeground` | `#0C1D42` | `#DEE9FF` | text and icons on `infoSoft` |
| `successSoft` | `#6FE0A3` | `#0A3A26` | soft success surface |
| `successSoftForeground` | `#042015` | `#D3F9E2` | text and icons on `successSoft` |
| `warningSoft` | `#FFC94D` | `#4B3100` | soft warning surface |
| `warningSoftForeground` | `#2A1B00` | `#FFEFC6` | text and icons on `warningSoft` |
| `destructiveSoft` | `#FF9E9E` | `#5C1619` | soft destructive surface |
| `destructiveSoftForeground` | `#3A0B0D` | `#FFE0E0` | text and icons on `destructiveSoft` |
| `border` | `#6E7683` | `#7A7A7A` | dividers and decorative borders |
| `borderStrong` | `#454A53` | `#A7A7A7` | essential control boundaries |
| `input` | `#FFFFFF` | `#0D0D0D` | input field background |
| `inputForeground` | `#000000` | `#FFFFFF` | text typed into an input |
| `placeholder` | `#4A4F58` | `#B0B0B0` | placeholder text |
| `ring` | `#3B2C8F` | `#C7CBFF` | focus ring |
| `selection` | `#7567F24D` | `#C7CBFF42` | text selection wash (30% light, 26% dark) |
| `overlay` | `#000000A6` | `#000000CC` | modal scrim |
| `hover` | `#E8E8E8` | `#2E2E2E` | hover wash for ghost surfaces |
| `active` | `#D6D6D6` | `#3D3D3D` | pressed wash |
| `selected` | `#D9DCF7` | `#27205C` | selected row or item |
| `selectedForeground` | `#2E2370` | `#E0E3FF` | text on `selected` |
| `disabled` | `#F2F2F2` | `#1A1A1A` | disabled surface |
| `disabledForeground` | `#5A5A5A` | `#8A8A8A` | disabled text |
| `skeleton` | `#D6D6D6` | `#3D3D3D` | loading placeholder |
| `scrollbar` | `#9A9A9A` | `#8A8A8A` | scrollbar thumb |
| `shadow` | `#00000040` | `#4A4A4AB3` | elevation tint |

## Typography

Families come from the platform table: `sans` is `systemUiFont` (GPUI's
`.SystemUIFont` sentinel) and `mono` is the current platform's family. The scale
ships the weights `400`, `500`, `600` and `700`, and a role takes any weight the
runtime clamps into its `1–1000` range — a variable face's `450` or a display
role's `800` is a real value, not a cast (`FontWeight` is a number). GPUix has no
`letterSpacing` field, so the scale does not define tracking.

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

`textStyle(theme, role)` resolves a role to GPUix style properties, choosing the
mono family for `code` and `codeBlock`:

```tsx
import { textStyle } from "@gpuixui/tokens";

<text style={{ ...textStyle(theme, "body"), color: theme.colors.foreground }}>
  Save changes
</text>;
```

### Platform styles

`platformStyles` is the one place a platform is decided, and
`platformTheme(base, platform)` turns it into a real theme: that platform's
families, corner radii, control density and chrome colours, over the base theme's
mode and elevation. The docs platform toggle and a native build use the same
table, so a preview cannot show a look the library does not ship.

| Platform | `sans` | `mono` | `radius.md` | density |
| -------- | ------ | ------ | ----------- | ------- |
| `darwin` (macOS) | `.SystemUIFont` | `Menlo` | 6 | `compact` (28px) |
| `linux` | `.SystemUIFont` | `DejaVu Sans Mono` | 6 | `spacious` (36px) |
| `win32` (Windows) | `.SystemUIFont` | `Consolas` | 4 | `comfortable` (32px) |
| `default` | `.SystemUIFont` | `Menlo` | 6 | `comfortable` (32px) |

Each styled platform repaints the roles that give it its identity — including its
control face, the `secondary` fill a tonal action rests on, because a button's
surface has to be visible on that platform's own window. Every other
role — the status families, the soft tones, `foreground`, `mutedForeground`,
`inputForeground` — keeps the base theme's value. The light styles therefore
inherit the base light theme's red 900 (`#5C1619`) status text, which is the
value the soft-surface step requires for its label **and** the one their pressed
washes needed: the shared red 800 measured 6.93:1 on Windows light's pressed
destructive row and 6.77:1 on Luna light's, under the body floor (§Contrast).

| Role | macOS light | macOS dark | Linux light | Linux dark | Windows light | Windows dark |
| ---- | ----------- | ---------- | ----------- | ---------- | ------------- | ------------ |
| `background` | `#F2F2F7` | `#1C1C1E` | `#F6F5F4` | `#242424` | `#F3F3F3` | `#202020` |
| `card` | `#FFFFFF` | `#26262A` | `#FFFFFF` | `#303030` | `#FFFFFF` | `#2B2B2B` |
| `popover` | `#FFFFFF` | `#2C2C30` | `#FFFFFF` | `#383838` | `#FFFFFF` | `#2D2D2D` |
| `input` | `#FFFFFF` | `#1F1F22` | `#FFFFFF` | `#212121` | `#FFFFFF` | `#1F1F1F` |
| `muted` | `#E9E9EF` | `#16161A` | `#ECEBE9` | `#2A2A2A` | `#EBEBEB` | `#262626` |
| `skeleton` | `#DCDFE7` | `#303036` | base | `#3E3E3E` | base | `#323232` |
| `secondary` | `#DEE3EA` | `#3A3A3C` | base | `#404040` | base | `#3A3A3A` |
| `hover` | `#E2E2E8` | `#35353B` | `#E3E2DF` | `#343434` | `#E0E0E0` | `#333333` |
| `active` | `#DEDEE6` | `#3A3A40` | `#DCDBD8` | `#3D3D3D` | `#D6D6D6` | `#3A3A3A` |
| `border` | `#D9D9E0` | `#3A3A40` | `#D4D2CF` | `#464646` | `#E5E5E5` | `#3D3D3D` |
| `borderStrong` | `#75757A` | `#9C9CA1` | `#76746F` | `#A0A0A0` | `#757575` | `#9D9D9D` |
| `primary` | `#0A6CD6` | `#0A84FF` | `#1C71D8` | `#78AEED` | `#0067C0` | `#59C9FF` |
| `primaryForeground` | `#FFFFFF` | `#11141A` | `#FFFFFF` | `#11141A` | `#FFFFFF` | `#11141A` |
| `ring` | `#0A6CD6` | `#4CA2FF` | `#1C71D8` | `#78AEED` | `#0067C0` | `#60CDFF` |
| `accent` | `#CADEF7` | `#1A3D60` | `#D2E4F7` | `#1B3E60` | `#CFE6F9` | `#1B3A50` |
| `accentForeground` | `#08407A` | `#B2D3F9` | `#12457F` | `#BBD9F7` | `#003E6F` | `#C9E9FF` |
| `selected` | `#D3E5FB` | `#0C3864` | `#CADDF3` | `#1F4363` | `#C8E0F3` | `#143E59` |
| `selectedForeground` | `#0B3D6B` | `#C7E0FF` | `#0F3E74` | `#CFE4FA` | `#093A5C` | `#CDEBFF` |
| `destructiveSoftForeground` | base | base | base | base | `#5C1619` | base |
| `placeholder` | base | `#8A93A3` | base | `#8A93A3` | base | `#8A93A3` |

`platformStyles[platform].colors[mode]` is that table: a partial `ThemeColors`, so
a value you leave out is the base theme's. The dark sets carry a lighter
`placeholder` because their field surfaces are lighter than the base canvas.
Each `darwin` set and all three dark sets carry their own `secondary`, because
`platformTheme` inherits the base `#E1E5EC` and those windows and popovers sit
1.004–1.049:1 from it — a tonal button would have no shape on them
(`decorative.ts`). Each style also declares the `contrast` variant its palette is
designed for (`"default"` today), and `platformTheme` applies a palette only where
that matches the base theme's variant.

Four rules the mechanism keeps:

- **A high-contrast theme keeps its colours.** A palette is designed against one
  variant's floors, so `platformTheme` applies the families, radii and density
  but not a palette whose declared `contrast` is not the base's. Accessibility
  outranks the platform look. `Theme.contrast` records the variant a theme
  carries — `"high"` on the high-contrast pair, `"default"` on the ordinary
  pair, absent on a hand-built theme, which is treated as default.
- **A platform style is an ordinary theme.** Nothing is a preset you cannot edit:
  read `platformStyles`, or layer `extendTheme` on a resolved theme.
- **`default` is the library's own identity.** It changes the name and nothing
  else, so a platform the library does not know still gets a real theme.
- **Every platform palette is measured on the same role pairs as the built-in
  themes.** `platforms.test.ts` holds all six platform themes to the contrast
  floors, so a platform cannot ship unreadable text.

```tsx
import { platformTheme, themes } from "@gpuixui/tokens";
import { ThemeProvider } from "@gpuixui/tokens/react";

<ThemeProvider theme={platformTheme(themes.dark, "win32")}>
  <Code>npm run build</Code>
</ThemeProvider>;
```

`sans` is the sentinel on every platform because GPUI resolves `.SystemUIFont` to
the operating system's own UI font — GPUI documents the name as "the system UI
font, which varies based on platform" and uses it as its default font — so a
theme never names a face the machine may not have. The table still exists for the
things a component cannot infer: the platform's monospace family, its radii and
control metrics, and which platform a preview is showing.

`currentPlatform` is one of those names — `default` when `process.platform` is
not one the library knows, such as a browser — and `systemMonoFamily` is
`platformTypes[currentPlatform].mono`, which is what the default typography uses.
`platformTypes` is the families-and-label view of the same table, for a caller
that does not need the palette.

**Two runtime facts the table respects.** GPUix's `StyleDesc.fontFamily` is a
**single** string, not a CSS stack, so an entry never contains a comma; and a
family the machine does not have falls back silently, so the platform table only
names families each platform installs.

**The radii and densities are design decisions, measured as painted.** The
values follow each platform's own guidelines — macOS controls at 28px, Windows at
32, GNOME at 36 — so a platform style reads as native before any component is
styled. The playground's `theme-platform` probe then paints one row per platform
through `platformTheme` and reads the runtime's style report and `bounds`: the
`lg` radius, the `primary` fill and an `md` control at the platform's own density
(macOS 28, Linux 36, Windows 32). Its negative control — painting the base
`radius.lg` instead — reads `expected 10, got 8`, so the shape is the platform's
and not the base theme's. An application whose own window differs layers
`extendTheme` on top.

#### Editing a platform style

The table is the source, not a copy of it:

```ts
import {
  extendTheme,
  platformStyles,
  platformTheme,
  themes,
} from "@gpuixui/tokens";

// What the macOS style ships, visible and copyable.
platformStyles.darwin.colors.dark.primary; // "#0A84FF"

// Take the platform look and own the parts you change. A brand that changes a
// fill owns its on-colour too, or the platform's foreground is designed for a
// colour it no longer paints — and per mode, because a dark fill light enough to
// be a progress mark cannot carry white text.
const house = extendTheme(platformTheme(themes.dark, "win32"), {
  name: "House",
  colors: {
    primary: "#B49CFF",
    primaryForeground: "#1C1547",
    // A ring is read against the fill it hugs, so this violet stays light
    // enough to be found on the theme's own `selected` wash.
    ring: "#9B8CFF",
    // The accent family too: `accent`, `selected` and `selection` are surfaces
    // derived from the accent, so leaving them on the platform's blue paints a
    // violet button inside a blue popover and a blue-tinted selection.
    accent: "#241C4D",
    accentForeground: "#D5CBFF",
    selected: "#2E2366",
    selectedForeground: "#DDD3FF",
    selection: "#8A6EFF3D",
  },
  radius: { md: 6, lg: 10 },
});
```

The runnable version is `resolveHouseTheme` in
[`src/platforms.example.ts`](../packages/tokens/src/platforms.example.ts); it
resolves both modes, and `platforms.test.ts` holds it to the contrast and
decorative contracts. `platformTheme` never mutates its base, so it is safe to
call on every render.

### Authored looks

A look does not have to be a platform. `platformNames` is the persisted key a
consumer stores and the docs toggle offers, so it names the operating systems an
application runs on today; another look is **not a platform name** — it is data
in the same `PlatformStyle` shape, applied by name:

```ts
import { retroStyles, retroTheme, themes } from "@gpuixui/tokens";

retroTheme(themes.light, "luna"); // "Light · Windows XP (Luna)"
retroStyles.aero.colors.dark.primary; // "#5FB6F2", visible and copyable
```

Two looks ship: Windows XP's Luna and Windows 7's Aero. Their UI face is the
sentinel on both — the era is carried by colour, radius and density — so the
table names what differs:

| Look | `mono` | `radius.md` | density |
| ---- | ------ | ----------- | ------- |
| `luna` — Windows XP (Luna) | `Lucida Console` | 2 | `compact` |
| `aero` — Windows 7 (Aero) | `Consolas` | 4 | `comfortable` |

`retroStyles` is the table and `retroTheme(base, name)` resolves one for the
base's mode. `retroNames` is the ordered index and `isRetroName` narrows a
stored `unknown` to a look, the same pattern every persisted axis follows.
`applyStyle(base, style)` is the one merge rule underneath — `platformTheme` is
`applyStyle` over `platformStyles` — so a consumer who authors a style of their
own applies it with no registry and no new platform name.

Four facts about these two:

- **The chrome is the era's; the artwork is not.** Luna's `#ECE9D8` face, its
  blue title-bar accent, the `#7F9DB9` field edge and the `#316AC5` selection,
  and Aero's glass-blue greys and `#3399FF` highlight, are colour values. No
  gradient, bitmap, icon, cursor or logo is copied, so there is no
  redistributable asset and no trademark in the library's identity.
- **Neither era had a dark mode.** Both dark editions are authored for this
  library — invented, not reconstructions — and are held to the same measured
  floors as every other theme.
- **`sans` stays the sentinel.** The package bundles no font, so naming Tahoma
  or Segoe UI would silently fall back on a machine that lacks the face. The
  era is carried by colour, radius and density; the monospace family is the
  era's own.
- **They obey the same accessibility and decorative contracts.** All four
  themes run every pair in `contrastPairs` through `contrastFailures` and every
  decorative placement through `decorativeFailures`, in `retro.test.ts`; a
  high-contrast base keeps its own palette and takes only the families, radii
  and density, exactly as a platform style does.
- **Its beige toolbar owns a chart scale.** The shared light table is designed
  against a near-white page; on Luna's toolbar (`#E0DCCB`) its amber measures
  **2.75:1**, so a chart in a Luna status bar loses a category while every other
  series contract passes. The look therefore declares `lunaSeries` for its light
  edition — the amber `#9A6300`, because the ramp's own `#8E5B00` is 0.044 from
  the red under deuteranopia — which clears the look's page, card, popover and
  toolbar (tightest **3.30:1**, the green on the toolbar) and keeps every pair
  apart for a dichromat. Its dark edition needs no table: its navy page
  separates the shared dark scale already. A house that wants other hues copies
  the style and replaces the five positions — `houseLook` in
  [`src/series.example.ts`](../packages/tokens/src/series.example.ts) is that
  copy. See [Data series](#data-series).
- **Luna light owns its soft status tints.** Its beige page (`#ECE9D8`) sits at
  the lightness a pale status tint has — the base `infoSoft` measured 1.00:1
  against it — and its toolbar is deeper than that, so no inherited tint can be
  seen on both. The look carries the `50` step of each family instead, which
  reads above its page rather than into it
  ([Decorative surfaces](#decorative-surfaces)).

```ts
import { extendTheme, retroTheme, themes } from "@gpuixui/tokens";

const brand = extendTheme(retroTheme(themes.dark, "aero"), {
  name: "Aero brand",
  // The mark a checked row paints is the same role: a dark wash needs the
  // light blue here, so the brand owns `primary` per mode.
  colors: { primary: "#4FA9E0", primaryForeground: "#06222F" },
  radius: { md: 6, lg: 8 },
});
```

The runnable version is `resolveRetroBrand` in
[`src/retro.example.ts`](../packages/tokens/src/retro.example.ts); it owns the
accent family too — `accent`, `selected` and `selection` are derived from the
accent — and `retro.test.ts` holds the result to the same contracts.

## Checking your own theme

A theme fails silently in eleven independent ways, and `auditTheme(theme)` is
the one call that returns all eleven reports:

```ts
import { auditTheme, extendTheme, lightTheme } from "@gpuixui/tokens";

const brand = extendTheme(lightTheme, { colors: { primary: "#6A45F0" } });
const audit = auditTheme(brand);

audit.passed; // true only when all eleven reports below are empty
audit.invalidRoles; // roles the renderer cannot paint
audit.invalidShadows; // elevation shadow colours the renderer cannot paint
audit.invalidNumbers; // sizes, lengths and shadows the renderer cannot lay out
audit.contrast; // text, icon and boundary pairs below their floor
audit.decorative; // dividers, skeleton fills, veils, status edges, washes, control faces and shadows too subtle to see
audit.series; // data-series colours lost on their plot, against each other, or for a colour-blind reader
audit.syntax; // a code block's token colour that vanishes into the fill it is read on
audit.selection; // a selection wash the reader cannot see, or that hides its text
audit.indicators; // a progress fill, spinner dot or presence mark lost on its strip
audit.disabledFade; // a disabled control whose faded label vanishes into the faded fill
audit.keyboardDim; // a control whose label the runtime's keyboard dim erases
```

`passed` is computed from the eleven reports, so it cannot drift from them. The
contrast floors come from the theme's own `contrast` variant —
`contrastFloorsFor(theme)` returns `highContrastFloors` for a theme that declares
`contrast: "high"` and `contrastFloors` otherwise — so a brand built from a
high-contrast theme is measured at AAA without the caller naming a floor set.
Pass a `ContrastFloors` as the second argument to hold a theme to a different
contract. The runtime **ignores** a colour string it cannot parse and keeps the
property's previous value or paints black, and nothing else measures text
against the surface behind it.

The gate also audits a theme it cannot fully read: a role or an elevation level
the theme does not carry — a theme restored from storage that predates it — is
named by `invalidRoles`/`invalidShadows` and its pairs are reported unmeasurable,
so `auditTheme` returns a failing report instead of throwing
(§[Paint-ready values](#paint-ready-values)).

`disabledFade` is the one report those floors do not reach: a fade is a
mechanism rather than a readability claim, so `disabledFadeFailures` holds every
variant to `contrastFloors.disabled` (1.5:1). The fade cannot clear a
high-contrast theme's 3:1 — §The fade a disabled control paints has the measured
numbers — which is why that variant paints the disabled role pair instead.
`keyboardDim` is the other: the dim is a where-can-Tab-go cue rather than a
reading mode, so `keyboardDimFailures` holds every variant to
`decorativeFloor` (1.05:1) — §The dim a control paints while Tab is elsewhere
has the measured numbers.

The dim and the disabled fade are the same composite with two shares (0.4 and
0.5), and the measured consequence is that **no palette fails the dim alone**:
the dim's band sits inside the fade's, so a label the dim erases is one the
fade erases too. What the dim's report adds is the placement and the mechanism —
the pair that vanished and the strip it vanished on — so a consumer knows which
control has to declare `keyboardFocusDim: false`. The two reports keep separate
floors, so they are two contracts rather than one measurement twice: a label
that lands at 1.45:1 is reported by the fade and not by the dim.

Each report is also a function of its own, for a caller that wants one check.
The three below are here; the categorical scale is §Data series
(`seriesFailures`), the code palette is §Syntax palette (`syntaxFailures`),
the selection wash is §Text selection
(`selectionFailures`), the fade is §The fade a disabled control paints
(`disabledFadeFailures`) and the dim is §The dim a control paints while Tab is
elsewhere (`keyboardDimFailures`).

### Paint-ready values

`invalidColorRoles(theme)` returns every semantic role whose value is not a
colour GPUix can paint. The runtime parses colours with `csscolorparser` 0.8.3 —
the pinned `@gpuix/native@0.11.0` release ships it in
`packages/native/src/color.rs` — so the paint grammar is CSS Color 4: hex in any
of its four lengths, with or without the `#`; a CSS named colour; `transparent`;
or an `rgb`/`hsl`/`hwb`/`hsv`/`lab`/`lch`/`oklab`/`oklch` function, absolute or
relative. A role the theme does not carry is reported with `value: undefined`,
because the runtime cannot paint what is not there — which is the shape a theme
restored from storage has when it predates a role the library added since.

```ts
import { invalidColorRoles, lightColors } from "@gpuixui/tokens";

invalidColorRoles({ colors: { ...lightColors, primary: "#7C5CF" } });
// [{ role: "primary", value: "#7C5CF" }]

invalidColorRoles({ colors: { ...lightColors, primary: "hsl(258 88% 58%)" } });
// [] — the renderer paints it

const { primary: _omitted, ...restored } = lightColors;
invalidColorRoles({ colors: restored });
// [{ role: "primary", value: undefined }] — a stored theme older than the role
```

`isPaintableColor(value)` is that grammar on its own, for a caller validating one
value — a theme editor's field, a persisted brand colour — before it reaches a
style. It accepts an argument list whose channel count is wrong (`rgb(255, 0)`
is two channels and paints nothing) and rejects a value no colour grammar reads;
resolving the arithmetic inside a channel is the runtime's. The argument is
`unknown`, and anything that is not a string — a missing key in a decoded theme,
a number, `null` — answers `false` instead of throwing, because that is the
value a check exists to report rather than crash on.
`invalidShadowColors(theme)` applies the same check to an elevation level a brand
supplies, which the role report cannot see (§Elevation); a level the theme does
not carry is reported once, at position `0`, with `color: undefined`.

**An incomplete theme is a report, not an exception.** Both paint reports take
the partial group (`Partial<ThemeColors>` / `Partial<Elevation>`), and the
contracts that measure a pair or a placement take the same colour source: a pair
whose role is absent is reported **unmeasurable** (`ratio: undefined`) rather
than skipped — a pair nobody can verify is not a pass — so `auditTheme` on a
theme restored from storage returns a line naming the role and a failing gate,
never a `TypeError`. A numeric group is the exception, and so is a **step**
inside one: adding either is a breaking change rather than an additive one, so
the gate **refuses** the theme and names it —

```
a theme must carry every numeric group: `typography` is missing. A group is a
breaking change, so a theme stored by an older release must be rebuilt from a
shipped one with `extendTheme`.
```

```
a theme must carry every numeric step: `typography.codeBlock` is missing. A step
is what the components read, so a theme stored by an older release must be rebuilt
from a shipped one with `extendTheme`.
```

— because the components read every step in a group, and a stored theme that
lost one cannot be painted with the numbers an audit would have passed:
`textStyle(theme, "codeBlock")` reads `typography.codeBlock.fontSize`, so an
absent role throws at the first paint that asks for it, while `invalidNumbers`
walks the steps a theme carries and says nothing about one that is not there. A
missing `density.controlHeight.sm` and a single absent `typography.body.lineHeight`
are refused the same way, by path. The required list is derived from the scales
this package ships, so a role or a metric added to one is required on the next
release without a second list to edit.

A font family is the third refusal, and it is not about absence: `typography.sans`
and `typography.mono` are **names**, so the gate asks that each say something —

```
a theme must name every font family: `typography.sans` is blank. A family is the
face every text role is laid out in, so an empty one paints the renderer's
fallback instead of the theme — a theme stored without it must be rebuilt from a
shipped one with `extendTheme`.
```

— because `sans: ""` is present, so no report can see it, while `textStyle` hands
the runtime `fontFamily: ""` for every sans role and the text paints in the
renderer's fallback. The playground's `register-font` probe measures what a
family no runtime knows does: the installed face lays `ABm` out at 80px and the
unknown one at the fallback's 44px. A face the machine lacks is still a **name** —
the gate reads a non-blank string, not a registered one — so a custom family
passes, and an uninstalled face is the font limitation in §Limitations rather
than a theme defect.

**The measurement dialect is the colour grammar the renderer paints, minus the
perceptual spaces.** `contrastRatio`, `alphaOf`, `blend`, `selectionFailures` and
the decorative contracts resolve a value through one seam: hex in every length
the renderer paints, with or without the `#`; the CSS named colours and
`transparent`; and the functional families whose channels are sRGB arithmetic —
`rgb`/`rgba`, `hsl`/`hsla`, `hwb`/`hwba`, `hsv`/`hsva` — with an optional alpha
channel, a percentage channel, a comma or space separator and a hue in `deg`,
`grad`, `rad` or `turn`. Shorthand `#fff`/`#fff8` widens to the long form, so a
brand written the way a hand-written theme usually is is measured rather than
reported unmeasurable. An alpha byte of `FF` is full opacity rather than a
share, so `#FFFFFFff` measures exactly as `#FFFFFF` — which matters because
`alpha(color, 1)`, this package's own helper, produces that form; any byte below
`FF` still marks a translucent value. `alpha` and `blend` write their result in
the long hex form, so a derived state is measurable by every contract after it.

What they **cannot** resolve is a value whose channels need a colour-space
conversion or a runtime expression: the perceptual spaces `lab`, `lch`, `oklab`
and `oklch`, a relative colour (`rgb(from …)`) and a channel expression
(`calc(…)`, `none`). Those paint and pass the paint check, and their pairs are
reported **unmeasurable** rather than guessed — a ratio computed from an
approximation is worse than the absence the gate names. The same is true of a
translucent value, whose contrast depends on the surface behind it: composite it
first. Every shipped palette is written in the long hex form the docs' tables
print, so the catalogue's own rows are exact.

```ts
import { alpha, contrastRatio } from "@gpuixui/tokens";

contrastRatio("#fff", "#000"); // 21 — shorthand is measured
contrastRatio(alpha("#FFFFFF", 1), "#000000"); // 21 — an opaque byte is no share
contrastRatio("hsl(0 0% 100%)", "#000"); // 21
contrastRatio("rebeccapurple", "#FFFFFF"); // 8.41
contrastRatio("oklch(0.62 0.26 29.2)", "#FFFFFF"); // undefined — a perceptual space
```

### Numbers

A colour the renderer cannot parse is not the only silent failure. A style batch
is serialised with `JSON.stringify` before it reaches native
(`@gpuix/native@0.11.0`, `dist/mutations.js`), so `NaN` and `Infinity` arrive as
`null`: the property is dropped and the element paints as if the theme never set
it. Measured in the runtime's test renderer, `borderRadius: NaN` beside a valid
`borderWidth`, `fontSize` and `backgroundColor` left those three on the element
and dropped only the radius. A negative size is accepted rather than dropped and
paints nothing usable — `fontSize: -4` laid a text element out at height 0.

`invalidNumbers(theme)` reports every numeric token the renderer cannot lay out,
by group, path, value and the rule it missed:

| Group | Numbers | Rule |
| ----- | ------- | ---- |
| `spacing` | every step | finite, `>= 0` |
| `radius` | every step | finite, `>= 0` (`none` is 0) |
| `borderWidth` | `thin` | finite, `>= 0` (a decorative divider may be dropped) |
| `borderWidth` | `strong` | finite, `> 0` — the focus ring's width |
| `iconSize` | `xs`…`xl` | finite, `> 0` |
| `typography` | every role's size | finite, `> 0` |
| `typography` | every role's leading | finite, `> 0`, and at least the role's size (`leading`) |
| `typography` | every role's weight | finite — the runtime clamps a real number into its 1–1000 range (`fontWeight`) |
| `typography` | `bodyStrong`'s size, leading and weight | the size and the leading equal `body`'s, and the weight is greater — `emphasis` |
| `density` | `controlHeight` per size | finite, `>= 24` (`targetSize.minimum`), and at least the text and the icon it carries (`fits`) |
| `density` | `rowHeight` | finite, `>= 24` (`targetSize.minimum`) |
| `density` | `controlPaddingX` per size | finite, `>= 0` |
| `elevation` | every shadow's `offsetX`, `offsetY`, `spreadRadius` | finite |
| `elevation` | every shadow's `blurRadius` | finite, `>= 0` |

The rule follows the design, not a blanket "must be positive". A shadow may be
offset up and in, so a negative offset or spread is a decision; a zero radius, a
zero border and a zero-blur shadow are how a square, borderless or flat surface
is stated. A size a reader has to see is the one place zero is not allowed: a
zero height or type size is a control that paints nothing. **The strong border is
one of those sizes**: it is the width of both focus rings — `keyboardFocusRing`'s
outline and `focusRing`'s spread — so a brand that zeroes it keeps every colour
report clean (the `ring` role is still readable) while the keyboard focus cue
paints nothing. `invalidNumbers` reports it as `positive`; the decorative `thin`
divider may still be zero. A control height is
also the box the pointer presses, and the library reserves no hit-area padding
on top of it, so the rule for `controlHeight` is the pressable floor rather than
just "greater than zero": a brand that shrinks one to 20px ships a target a
reader cannot reliably hit, and `invalidNumbers` reports it as `pressable`
instead of letting the audit pass. The shipped presets sit at or above it —
`compact` `sm` is exactly `targetSize.minimum` — so no palette or metric moves
for a theme that keeps them.

`rowHeight` is the same box one level down. A list row is a press target — every
row answers a press, and a selectable one also takes a `tabIndex` and a hover
wash — while a `dense` row is built at exactly `density.rowHeight`
(`packages/components/src/list.tsx`), with the
library reserving no hit-area padding on top of the row either. So the same
`pressable` rule holds it: a brand that shaves the rows to 20px ships a target a
reader cannot reliably hit while every control height is right, and
`invalidNumbers` reports `rowHeight` by name. Every shipped preset clears it —
the density table below prints each one.

A control's box also has to contain the text it carries. The box is exactly
`density.controlHeight[size]`, and the two painters lay their text at a type
role's leading: `controlStyle` uses `label` for a button, a toggle and a select
trigger, and `fieldTextStyle` uses `body` for a field's value
(`packages/primitives/src/core/style.ts`). A brand that grows its reading size
without growing the box — or shaves the box while keeping its type — paints a
line taller than the control around it, and every number is finite, positive and
pressable. `invalidNumbers` reports the height as `fits`, on the number that has
to grow: `compact` is 24/28/32, so a 26px body leading outgrows only its `sm`
control. A height exactly equal to the leading passes, because the line fills the
box rather than spilling out of it, and a box that already misses the pressable
floor is reported once, by `pressable`. Every shipped preset clears it — the
tallest control role is `body` at 20px, four pixels under `compact` `sm`.

The same box carries a drawing. An `Icon` defaults to `md`
(`packages/icons/src/icon.tsx`), a selection box and a spinner's dot are drawn at
that step (`packages/primitives/src/core/selection.ts`,
`packages/primitives/src/components/Spinner.tsx`), and an `IconButton` is a
square at its control height — so the glyph a control carries is `iconSize.md`,
and a brand that grows the icon scale without growing the controls centres a
26px glyph in `compact`'s 24px `sm` box, where it clips or overflows the action
while every icon step is finite, positive and in order. The `fits` ceiling is
therefore the taller of the two roles a control paints and the glyph it draws:
`controlHeight[size] >= max(label.lineHeight, body.lineHeight, iconSize.md)`.
The shipped numbers are 18, 20 and 16, so the box keeps four pixels of headroom
at `compact` `sm`; an icon exactly the box height passes, and an icon value that
cannot be laid out is the `iconSize` report's rather than a second `fits` line.
`iconSize.lg` and `xl` are not in the comparison: they are the toolbar, navigation
and empty-state steps, not the glyph inside an action.

Two numbers only mean something together: a type role's leading and its size. A
leading shorter than the size puts the next baseline inside this line's glyph
box, so ascenders and descenders collide — and a scale computed from a factor
(`lineHeight: size * 0.7`) produces one while every number stays finite and
positive. `invalidNumbers` compares the pair and reports the leading as
`leading`; a leading exactly equal to the size passes, because lines that touch
are tight rather than overlapping.

A role's weight is the third number it carries, and the only one whose loss does
not move a size: the runtime clamps a real number into its 1–1000 range
(`parse_font_weight` in the pinned `@gpuix/native@0.11.0` source), so a variable
font's `450` is a design decision and paints, while a weight a theme computes to
`NaN`/`Infinity` arrives as `null`, is dropped, and the role paints at the
runtime's default weight — a heading silently loses its emphasis with every
other number usable. `invalidNumbers` reads the weight as `finite` rather than
as one of the four steps the scale ships, because a weight is a number: a
variable face's `450` and an authored `Number.NaN` both typecheck, so the gate is
what says which one reaches native.

Two **roles** only mean something together for the same reason. `bodyStrong`
is one emphasis at one size: it shares `body`'s size and leading (14/20) and
differs by weight, so a card title, a lead-in or a line a reader is meant to
notice is the same measure as the copy around it (`Text role="bodyStrong"`,
`textStyle(theme, "bodyStrong")`). Two brands break that while every number
stays layable. A design-tool export that forwards one stored weight to every
role — or a `bodyStrong` override that copied the body token — keeps both sizes,
both leadings and both weights usable while the emphasis paints exactly like the
text it was meant to lift. A brand that names only the token a body line is set
from raises `body` and leaves `bodyStrong` behind, so the title becomes the
smaller or the looser line. `invalidScales` cannot see either: `bodyStrong` is
not a rung of the size ladder. So all three numbers are compared, and
`invalidNumbers` reports the **strong** role's number as `emphasis` — the value
that has to change, whichever of the pair moved. One step of weight is enough
(the shipped pair is `body` 400 against `bodyStrong` 600); equal weights are a
flattened emphasis, not a subpixel rounding. A number already reported by its own
rule is not reported again: an unusable size is a `positive` report, and a
leading inside its own glyph box is a `leading` report.

```ts
import { extendTheme, invalidNumbers, lightTheme } from "@gpuixui/tokens";

invalidNumbers(extendTheme(lightTheme, { radius: { md: Number.NaN } }));
// [{ group: "radius", path: "md", value: NaN, rule: "nonNegative" }]
invalidNumbers(extendTheme(lightTheme, { density: { rowHeight: 20 } }));
// [{ group: "density", path: "rowHeight", value: 20, rule: "pressable" }]
invalidNumbers(
  extendTheme(lightTheme, { typography: { body: { lineHeight: 10 } } }),
);
// [{ group: "typography", path: "body.lineHeight", value: 10, rule: "leading" }]
invalidNumbers(
  extendTheme(lightTheme, {
    density: "compact",
    typography: {
      body: { lineHeight: 26 },
      bodyStrong: { lineHeight: 26 },
    },
  }),
);
// [{ group: "density", path: "controlHeight.sm", value: 24, rule: "fits" }]
invalidNumbers(
  extendTheme(lightTheme, {
    density: "compact",
    iconSize: { md: 26, lg: 28, xl: 30 },
  }),
);
// [{ group: "density", path: "controlHeight.sm", value: 24, rule: "fits" }]
invalidNumbers(
  extendTheme(lightTheme, { typography: { body: { fontSize: 15 } } }),
);
// [{ group: "typography", path: "bodyStrong.fontSize", value: 14, rule: "emphasis" }]
invalidNumbers(
  extendTheme(lightTheme, { typography: { bodyStrong: { fontWeight: 400 } } }),
);
// [{ group: "typography", path: "bodyStrong.fontWeight", value: 400, rule: "emphasis" }]
invalidNumbers(extendTheme(lightTheme, { borderWidth: { strong: 0 } }));
// [{ group: "borderWidth", path: "strong", value: 0, rule: "positive" }]

// A weight the theme computed to NaN: a weight is a number, so it typechecks.
const stored = {
  ...lightTheme,
  typography: {
    ...lightTheme.typography,
    h1: { ...lightTheme.typography.h1, fontWeight: Number.NaN },
  },
};
invalidNumbers(stored);
// [{ group: "typography", path: "h1.fontWeight", value: NaN, rule: "finite" }]
```

`src/numbers.example.ts` holds eight brands: one whose corner radius came from a
scale factor nobody set, one whose "dense" preset shaves two control heights and
a row under the pressable floor, one whose type scale multiplied the leadings
under the sizes, one that grew its body leading past the smallest control it
still ships, one that enlarged its `md` icon past the same box, one whose weight
scale flattened `bodyStrong` into `body`, one that zeroed the strong border
and so left the focus ring nothing to paint, and one restored from storage with
a heading weight the batch drops. `numbers.test.ts` runs all eight
audits, proves none of the
colour reports can see their defects, and holds all 16 shipped, platform and
authored themes to an empty report — the shipped scale's tightest role is the
display step at 28/36, well clear of the floor, and its control glyph is 16px
against a 24px smallest box.

### Scale order

`invalidNumbers` asks whether one number can be laid out. It cannot ask whether
two adjacent steps still describe two sizes, and a scale is selected by name:
`size="sm"` against `md` and `lg`, `radius="xl"` against a card's `lg`,
`textStyle(theme, "h3")` under an `h2`. A brand that computes a scale from a
factor, forwards a stored value or edits a single rung can repeat or invert a
pair while every number stays finite, positive and pressable.

`invalidScales(theme)` reports every step that does not exceed the step before
it, naming both steps:

| Scale | Steps, in order |
| ----- | --------------- |
| `spacing` | `2xs` → `xs` → `sm` → `md` → `lg` → `xl` → `2xl` → `3xl` → `4xl` → `5xl` |
| `radius` | `none` → `sm` → `md` → `lg` → `xl` → `full` |
| `borderWidth` | `thin` → `strong` |
| `iconSize` | `xs` → `sm` → `md` → `lg` → `xl` |
| `typography` | `caption` → `label` → `body` → `h3` → `h2` → `h1` → `display`, by role size |
| `density` | `controlHeight` and `controlPaddingX`, `sm` → `md` → `lg` |
| `elevation` | `sm` → `md` → `lg`, by the reach of the shadow each level paints |

`bodyStrong` shares `body`'s size and differs by weight, and the two mono roles
are a separate family rather than rungs of the size ladder, so neither is
compared here. The emphasis pair is not left unmeasured for it: `bodyStrong`
must share `body`'s size and leading and weigh more, and `invalidNumbers`
reports the strong role's number as `emphasis` (§Numbers). A value that is not
finite is skipped here and reported once by `invalidNumbers`, which owns it.

Elevation is the one ladder whose rung is not a single token. A level is a
geometry plus a share of the `shadow` role, so its depth is the distance the
shadow reaches below the box it lifts — `offsetY + blurRadius + spreadRadius`
of the shadow `elevationShadow` paints. The horizontal offset is not depth and
the colour belongs to the role, so neither is read: a brand that deepens a level
by opacity alone has made the shadow heavier, not the surface higher. A level
that paints nothing is not a rung — the reserved empty `overlay` and a level a
restored theme does not carry are both skipped — while a brand that fills
`overlay` is compared above `lg`, because it has raised a surface there. A level
carrying a shadow list is read at the entry `elevationShadow` paints.

```ts
import { extendTheme, invalidScales, lightTheme } from "@gpuixui/tokens";

invalidScales(lightTheme); // []
invalidScales(extendTheme(lightTheme, { radius: { xl: 8 } }));
// [{ group: "radius", path: "xl", value: 8,
//    previous: { path: "lg", value: 8 } }]
invalidScales(
  extendTheme(lightTheme, {
    elevation: {
      md: [
        {
          offsetX: 0,
          offsetY: 24,
          blurRadius: 56,
          spreadRadius: -12,
          color: "#191D25A6",
        },
      ],
    },
  }),
);
// [{ group: "elevation", path: "lg", value: 48,
//    previous: { path: "md", value: 68 } }] — a menu casting the dialog's shadow
```

The rule found one shipped style: the Windows platform carried `lg: 8` and
`xl: 8`, so `radius="xl"` and `radius="lg"` painted the same surface and the
larger step named nothing. It is `xl: 10` now, and the platform scale is
`2/4/8/10` (§Platform styles).

`invalidScales` is not one of `auditTheme`'s eleven reports yet. The docs site's
theme readout words each report it prints, so folding this in is one coordinated
change with that page — recorded in `TODO.md` → Interlocks. Run it beside
`auditTheme` until then: `src/scales.example.ts` is a brand whose `sm` control is
taller than its `lg`, and `scales.test.ts` proves the audit passes it while
three steps are out of order.

### Contrast

`contrastRatio(foreground, background)` is the WCAG 2.1 ratio between two opaque
colours, and it returns `undefined` rather than a number when either value is
translucent — a translucent colour's ratio depends on the surface behind it, so a
single number would be a guess — or is one of the forms the measurement dialect
cannot resolve: a perceptual space (`lab`, `lch`, `oklab`, `oklch`), a relative
colour or a channel expression. Hex in every painted length, the CSS named
colours and the `rgb`/`hsl`/`hwb`/`hsv` families are measured (§Paint-ready
values).

`contrastFailures(theme, floors?)` runs every pair and returns the ones that miss
— an empty array means the theme is readable. The floors are the theme's own
variant's unless one is passed, which is the rule `auditTheme` applies: a brand
derived from a high-contrast theme is measured at 7:1 for secondary text without
the caller remembering to say so. The 103 pairs cover the text role
on each surface it can sit on: body text on a container's own `muted` or
`popover` surface (a message bubble is `bg-muted`), the text typed into an
`input` — and into a **composite field**, which paints the page role as its own
fill (a search, tag or mention field, the chat composer, the inline edit, the
colour picker's hex field), so the value and its placeholder are measured on
`background` as well — secondary text on `background`, `card`, `muted`, `popover`
and a selected row, the selected row's title on that selection and the
`selectedForeground` it hands its children on the `hover`/`active`/`accent` wash
it tints, every status and soft-status pair, each status tone's readable text
as **page** text on `background`, `card`, `popover` and a `muted` strip (a field
error, an inline warning or a destructive menu row is not on the tone's own
tinted surface, and a form in a muted sidebar has none of the three page fills),
the **page role an alert paints on its own soft tint** — its description is
`text-foreground` and its dismiss glyph the same role, so the copy and the close
control are read on `xSoft` in the page's ink rather than the tone's readable
role (the tightest shipped placement is Windows XP (Luna) dark's `warningSoft`
at 7.14:1) —
the unavailable label on the fill that disables it, on the three page
surfaces and on the two group strips a disabled control sits in (`muted`,
`secondary`), accent and selected, the state washes,
the placeholder, and the essential boundaries and focus ring — the ring and the
strong boundary on every surface a focused control can sit on, including a
toolbar strip (`muted`), a segmented group (`secondary`), a floating surface
(`popover` — a dialog's footer or a popover's form), the fill the ring hugs
(`input`, `selected`, `hover`, `active`, `accent`) and the `hover`/`active`
wash a bordered control tints while it is hovered or pressed, plus the
`accent`/`selected` wash a row paints under that same control, plus the invalid
edge below. A wash — `hover`,
`active`, `accent` — is a surface too: a ghost button or a menu row tints it and
leaves its label in the
resting `foreground`, and secondary text keeps `mutedForeground`, so both
roles are measured on all three. A **filled action** keeps its label's floor
when its fill moves: every filled role's pointer state is the derived
`filledHover`/`filledPressed` (§Action fills), measured by `styles.test.ts`
against the role's on-colour, which is why a secondary action's label is the
resting `secondaryForeground` on `secondary` here and the derivation's business
on the pointer — the two wash pairs retired when the variant stopped painting
them. A **group
panel** is the strip a control sits in without painting a fill of its own: the
segmented `secondary` panel the ring, the strong boundary and a disabled label
are already measured on. An `outline` or `ghost` action keeps `foreground` and a
quiet label or icon keeps `mutedForeground`, so both roles are read there — the
page ink at the body floor and the quiet one at the secondary floor. Every
shipped style clears both, the tightest being Windows XP (Luna) light's quiet
label on its group panel at 4.89:1, while the same look's dark edition holds the
page ink at 7.62:1. An **accent row** is the other state a control's label sits
on: `NavigationMenuLink`'s hover fills the row `accent` and paints its text
`accentForeground` (`navigation-menu.tsx`), and a highlighted `MentionInputItem`
does the same (`mention-input.tsx`) — both are row labels rather than the
on-colour of a filled control. The pair was held at the secondary floor
(4.5:1) while every other row label — `popoverForeground` on the
`hover`/`active` wash, `selectedForeground` on the washes a list row wears — is
held to the body floor, so a brand whose accent foreground measured 4.68:1
shipped a navigation or suggestion label under the page's reading floor. It is
measured at the body floor now; macOS was the only shipped style under it
(6.53:1 light, 6.74:1 dark), so both foregrounds take the smallest step that
clears it, the tightest being Dark · macOS at 7.22:1. A row
**floating on a popover** keeps that
surface's role rather than the page's — a menu or combobox row is
`popoverForeground` — and a destructive row paints the tone's readable role, so
the table measures both on the `hover` and `active` wash `menuRowStyle` paints
under them, and the popover's text role on the `selected` wash a chosen row fills
(`selectItemClass` paints `text-popover-foreground` over `bg-selected`, so a
selection that drifted toward its own text would erase the row it just chose).
That pair found two shipped misses: Windows light's pressed wash
left the destructive row at 6.93:1 and Luna light's at 6.77:1, under the body
floor. Every light theme now carries red 900 (`#5C1619`) as
`destructiveSoftForeground`: it is both the label the deeper soft surface needs
(red 800 landed at 6.78:1 on it, under the body floor) and the value the two
darker presses needed, so one role covers both. A **list** row is the other row
and it wears the other two washes: `list.tsx` tints `accent` under the pointer,
keeps `active` while pressed and fills `selected` once the row is chosen, and a
status caption is `Text tone="destructive"` → the tone's readable role. So a
destructive status label is measured on both of those washes too, where the
tightest shipped placement is the Luna look's chosen row at 7.97:1 — a failed
item in an inbox row stays readable exactly when the reader selects it. A
**bordered** control is the third case: the
secondary action paints `borderStrong` and keeps that edge while the same
element's fill moves to the wash, so the edge is measured there too. It found
four shipped misses — the base light theme's pressed secondary button at
2.88:1, the base dark theme's at 2.86:1, high-contrast dark at 4.15:1 against
its 4.5 floor, and Linux light at 2.96:1 hovered and 2.77:1 pressed — so those
four `borderStrong` values moved stronger, and every other pair they carry
still clears its floor.

A **floating** surface is the last strip that story was missing. The ring was
already measured on `popover` — a focused control in a dialog wears it — while
the edge around that same control was measured on every strip *but* `popover`:
`ConfirmDialog`'s cancel action is a plain `Button`, whose default variant is
`secondary` and therefore paints `borderStrong`, and it sits on the `popover`
fill `DIALOG_CONTENT` paints. A popover holding a form is the same composition.
Every shipped, high-contrast, platform and authored style clears the floor
there, the tightest being Linux dark's popover at 4.48:1.

A **field** is the fourth border case, and the one the table reaches last. A
field can land on the page, a card, a popover or a `muted` toolbar, and in the
light palettes the page and a card are only 1.06:1 apart — less than the
perceptibility floor applied twice — so no single fill clears it against both.
Light `input` is `#FFFFFF`, the same value as `card` and `popover` (1.00:1). Its
edge is the boundary, which means `borderStrong` — measured on `input` as well as
on those four strips. The shipped field rests on the decorative `border` role
instead (1.19:1 on the light page) and reaches `borderStrong` only on hover, in
`fieldVariant` (`packages/primitives/src/core/variants.ts`) and `FieldInput`
(`packages/components/src/field.tsx`); §Limitations records the deviation and
`TODO.md` → Interlocks the adoption. `field-boundary.test.ts` reads both painters
so the page cannot describe a field the library does not ship.

A field's own fill carries a third text role beside the value and the
placeholder: the **muted** line. A time picker paints its separator and its clear
glyph `mutedForeground` inside a root filled `input` (`TIME_PICKER_SEPARATOR` and
`TIME_PICKER_CLEAR` over `TIME_PICKER_ROOT`), a number field's stepper chevrons
take the same role (`NumberField.tsx`), and `nativeTextTheme` hands the runtime
`textMuted: mutedForeground` over `bg: input`. The role was measured on every
surface *around* a field and on none a field paints for itself, so a brand that
tints its field fill could swallow the colon between two time segments with every
report empty. The pair is measured at the secondary floor (4.5:1, 7:1 in the
high-contrast pair) and every shipped, high-contrast, platform and authored theme
clears it, the tightest placement being the muted line in Windows XP (Luna)
light's field's own fill at 7.64:1, so no palette moved.
`contrast.test.ts`'s `the muted text inside a field's own fill` suite reads all
three painters, reports a role equal to its own fill at 1.00:1 and sweeps the 16
styles.

A **selected row** carries a **title**, and the table used to read that title as
the recipe's page role. It is not: `ListItemTitle` overrides its recipe's colour
with the row's own role — `theme.colors.selectedForeground` — and `list.tsx`
fills `selected` behind it, while the primitives compose the page-role pair in the
same slot from `surface="selected"` and a default `Text`. A row title is body
text, so `selectedForeground` is held to the **body** floor on the selection and
on the `accent`/`active` wash the row tints while the pointer moves: held at the
secondary floor, a 5:1 title passed the gate while the inventory promised 7:1.
The descriptive line beside it stays `mutedForeground` on `selected` at the
secondary floor, and `foreground`/`selected` keeps the primitives' painter
measured. Every shipped, high-contrast, platform and authored theme clears the
body floor, the tightest of the five placements being the base dark theme's
pressed wash at 7.31:1, so no palette moved: what the pairs close is the gap a
brand could fall into, where a `selected` close to its page — or a wash close to
`selectedForeground` — erases the label it just selected with every other report
empty. `contrast.test.ts`'s `the text a selected row keeps` suite reads both
painters, reports a title held at 5:1 that the old floor passed, and holds all 16
styles to the body floor.

A **focused row** is the fifth case, and the ring's own surface is the one the
table skipped. `outlineOffset: 0` draws the `focusVisible` line on the border
box, so it is read against both neighbours: the fill the control paints behind
itself and the strip beyond it. `list.tsx` fills `selected`, tints `accent` on
hover and `active` on press, and declares the keyboard ring on that same row;
the ghost and outline actions tint the same two washes under their ring; and a
field's ring borders the field's own `input` fill, which is not the page it sits
in. The five fills (`input`, `selected`, `hover`, `active`, `accent`) joined the
ring's pairs at the boundary floor, so a brand whose ring is the colour of the
row it surrounds is reported at 1.00:1 instead of shipping a focused row with no
visible focus. Every shipped, high-contrast, platform and authored theme clears
its variant's floor. `contrast.test.ts`'s `the ring
on the fill it hugs` suite reads both painters and reports the two erased rings,
so the pairs cannot outlive the paint.

A **message's own tint** is the ring's last strip, and the same one the edge
reaches. An `Alert` fills its tone's soft role and its documented action is a
plain `Button`, which declares the keyboard ring at rest — so the focus cue is
drawn on a tint, exactly as the edge is. Nothing measured it: the light ring
read **2.94:1** on `infoSoft` and **2.84:1** on `destructiveSoft`, the
high-contrast ring **4.41:1** and **4.16:1** against its 4.5:1 floor, and the
authored Aero light look's own blue the same 2.84. Both base rings move one ramp
step deeper (light `iris[600]` `#5F4BDB`, high contrast `iris[800]` `#3B2C8F`)
and Aero light takes the smallest step that clears (`#287ABA`), which closes all
four placements rather than documenting them. The tightest shipped ring
placement overall is now the Aero look's red message tint at 3.09:1, so the
number this page prints is the one the whole ring contract measures.
`contrast.test.ts`'s `the ring on a message's own tint` suite holds the
coverage, reads the alert's composer and the button's ring, reports a ring
painted in the tint it sits on at 1.00:1, and sweeps every ring placement in
all 16 styles.

A **trailing action** is the boundary's last strip — and the same two washes the
ring already had. A list row hands its `trailing` slot to an explicit action,
which is what the slot exists for: a control that must run without the row's own
activation (`packages/components/docs/list.mdx`). The components' `Button`
defaults to `secondary`, the one variant that paints `borderStrong`, and the row
tints `accent` under the pointer and fills `selected` once chosen — so the edge
is drawn on those washes, not on the page, and nothing measured it there. A brand
whose edge matched the row it sits in therefore shipped an outlined action with
no outline in the one place a list puts it, with every strip the control rests on
passing. Both washes joined the boundary pairs, and every shipped, high-contrast,
platform and authored style clears the floor, the tightest being the authored
Windows XP look's selected row at 3.07:1. `contrast.test.ts`'s `the edge of a control inside a row's wash` suite
reads the slot, both washes and the default action's edge, reports an edge equal
to its wash at 1.00:1 and sweeps all 16 styles.

A **message's own tint** is the boundary's last strip. An alert fills its tone's
soft role — `ALERT_TONES` paints `bg-infoSoft`, `bg-successSoft`,
`bg-warningSoft` or `bg-destructiveSoft`, with `danger` mapped to the
destructive tone — and its description is a container, so the documented "Try
again" action is a plain `Button` on that tint, whose default variant paints
`borderStrong`. Nothing measured it: the edge answered on the page, a card, a
field, a toolbar, a segmented panel, a floating surface and the washes a control
tints, and on none of the four tints a message paints. The edge is what carries
the control there for the same reason it does on a field — the neutral fill band
is one lightness and the pale green and amber tints share it (a `secondary`
action reads 1.01–1.04:1 on them in the light styles), so only the boundary can
be seen. Thirteen of the sixteen styles missed the floor, the worst being the
base dark theme's edge on `warningSoft` at 2.23:1; the values moved by the
smallest step that clears all four tints, and the tightest shipped placement is
macOS light's red message tint at 3.09:1. `contrast.test.ts`'s `a control's edge
on a message's own tint` suite reads the alert's tones, its description and the
default action's edge, reports an edge painted in the tint it sits on at
1.00:1, and sweeps all 16 styles.

`contrastFloors` and `highContrastFloors` are the
floors the shipped themes meet, and `contrastPairs` is the pair table they apply
to. `contrastFloorsFor(theme)` is the variant rule on its own: every report that
takes floors — `contrastFailures`, `selectionFailures`, `indicatorFailures`,
`seriesFailures` and the gate itself — starts from it, so the theme's declaration
decides, and an explicit set overrides it. A brand theme runs the same check the
built-in themes pass:

```ts
import { auditTheme, type Theme } from "@gpuixui/tokens";

// The theme's own variant picks the floors; the report names the rest.
export const shipsCleanly = (theme: Theme): boolean => auditTheme(theme).passed;

// A pair failure names both roles, the measured ratio and the floor:
// { foreground: "mutedForeground", background: "muted", ratio: 1, floor: 4.5 }
```

A pair whose value is translucent, or one the measurement dialect cannot resolve
— a perceptual space, a relative colour, a channel expression — is reported with
`ratio: undefined` rather than skipped, because an unverifiable pair is not a
pass. To measure a translucent value by hand, composite it first and use
`contrastRatio`.

`src/theme-audit.example.ts` runs `auditTheme` over a theme with one misspelt
fill, and `theme.test.ts` asserts the reported role, so the failure this page
describes is the failure the example produces.

### The invalid state

Validation failure is a boundary, not a fill. An invalid field's border — and
the `focusVisible` line it paints while focused — take the `destructive` role,
the one colour a reader reads as "this needs attention", and the field keeps its
own fill, so the value it holds and its placeholder stay the roles the table
measures (`inputForeground` on the fill at the body floor, `placeholder` on it at
the secondary floor) — `input` for a plain field, the page role for a composite
one, which paints that as its own fill (§Native text hosts).

That edge is a boundary, so `destructive` is held to `contrastFloors.boundary`
on every strip a control sits on. Four of them — the page, a card, a popover and
a `muted` toolbar — already hold the same role to the same floor as an indicator
mark; a field's own fill (`input`) and a segmented panel (`secondary`) joined
`contrastPairs` because no other contract measured them. The tightest shipped
placement is Windows XP Luna's dark `secondary` panel at 3.26:1.
`contrast.test.ts`'s `the invalid state's edge` suite holds the coverage from
both contracts, reports an invalid edge that matches its own field fill, and
checks every shipped theme on all six strips.

The primitives' field recipe used to paint the destructive *fill* behind the
value; it now paints only the edge. `FIELD_INVALID` in
`packages/primitives/src/recipe/index.ts` is `aria-invalid:border-destructive`,
so an invalid `Input`, `TextArea`, `OTPField` cell, `Select` trigger or
`NumberField` keeps its `input` fill while its border says what failed — and the
components package's `FieldInput` paints the destructive edge over `input` the
same way. The fill remains the failure this section names rather than a
variation of it: `inputForeground` on `destructive` is 3.31:1 in the light theme,
2.45:1 in the dark and 2.08:1 in high contrast, with a placeholder at 1.02:1, and
no floor rescues text painted on a role designed to carry `destructiveForeground`.
`field-boundary.test.ts` holds both recipes and this page to that.

### The disabled floor

`disabledForeground` on `disabled` is deliberately **not** held to a readability
floor. WCAG exempts an inactive component from 1.4.3 and 1.4.11, because a reader
is not expected to read what they cannot press — and a disabled label is designed
quiet. What the state is still held to is being **seen**: a value that matches
the fill it sits on leaves an empty box, and a reader cannot tell a disabled
field from one that failed to paint. So `contrastFloors.disabled` is `1.5:1`
(`highContrastFloors.disabled` is `3:1`), measured on the label over its own fill
(`disabled`), over the three page surfaces a disabled field or fieldset legend
sits on — `background`, `card` and `popover` — and over the two group strips a
disabled control sits inside: a `muted` toolbar and a segmented `secondary`
panel. The base light theme's `disabled` fill *is* its `muted` value, so a
disabled field in a toolbar has no fill of its own and the strip around it is the
only background its label has; both high-contrast variants take the same quiet
step, and the *face* it must not equal is the enabled control's — a separate
placement in [Decorative surfaces](#decorative-surfaces). Every shipped,
high-contrast, platform and
authored theme clears the floor; of the page placements the tightest is Linux
dark's unavailable label on a popover at 1.76:1, and the two group strips add the
tightest pair in the set — Linux dark's label on its `secondary` panel at 1.56:1,
0.06 above the floor. It is a backstop, not a design target: the floor exists so
a theme that erases the state fails by name instead of shipping it.

#### The fade a disabled control paints

The role pair is the contract, and a filled action already paints it: the
primitives resolve `paintsFilledSurface` (`primary`, `secondary`, `destructive`)
to `disabledAction(theme)` in `core/style.ts`, the recipe's disabled bucket is
`disabled:bg-disabled disabled:text-disabled-foreground`, and a menu row
(`packages/components/src/menu/item.tsx`) paints `disabledForeground`. The
components package's own `Button` splits the same way: a filled variant wears
`disabledAction(theme)` and pins its hover and press to the resting fill, while a
ghost keeps the fade (`packages/components/src/internal/button.tsx`). That
leaves one painter fading the whole control — the `@gpuixui/tw` recipes'
`disabled:opacity-50` — and the components' `Button` fading its ghost at
`disabledOpacity`, the token constant rather than a copied share. An unfilled
action — `outline`, `ghost`, `link`, a `Toggle` — has no fill to
collapse into and fades with them, and a **field** keeps the fade because its
fill is `input` and the faded label clears the floor on every content surface it
sits on (§The fade is a page mechanism). A fade is
translucent, which `contrastRatio` refuses: it shows whatever is behind it, so
no role pair can measure the result. `disabledOpacity` is that share (`0.5`, a
design constant rather than a `Theme` group — a brand that lowered it would
make the library's own disabled state disappear), and
`disabledFadeFailures(theme, floor?)` measures the fade by compositing it.

Each `DisabledFadePair` names a control the fade is applied to — `fill`, `label`
and the `over` surface — for the three filled actions on the page and a field on
`background`, `card`, `popover` and a `muted` toolbar or sidebar; the four strips
are the ones a field sits on (§7 of the design system) and the ones the keyboard
dim already measures its hint on; `disabledFadePairs` is that table. A field is
listed with **both of its fills and both of its labels**: a plain field fills
`input`, while a composite field — a search, tag or mention field, the inline
edit, the chat composer and the colour picker's hex field — paints the page role
as its own fill (`bg-background` in `@gpuixui/tw`'s recipes), and each carries a
value and a hint. The pairing is the coverage: the table held one fill and one
label, so the fade a composite field paints was the one control no report
composited, and a hint is the lowest-contrast label a field carries at rest. The
fourth strip is what a fade is decided on rather than a copy of the page: a brand
with a dark sidebar and a light content area (`muted: "#2A2A2A"` over the base
light page) composes a composite hint down to **1.30:1** while the same field on
its page still reads 2.03:1. Every shipped placement clears the floor — the
tightest is the Windows 7 (Aero) look's composite hint on its `muted` toolbar at
**1.96:1** — so the pairs close a gap rather than move a palette. The three
filled actions stay in it although the shipped painter wears the pair: the table
measures the paint a re-introduced fade would produce, and the gate reports it.
The measurement composites twice, because the
label is faded over the *faded* fill: a disabled filled button shows half its
fill over the page, then half its label over that, which is why the label falls
so much further than the fill. A `DisabledFadeFailure` carries the pair, the
composited `ratio` (or `undefined` when a role is translucent) and the floor.

```ts
import { disabledFadeFailures, lightTheme } from "@gpuixui/tokens";

disabledFadeFailures(lightTheme); // [] — every faded label clears 1.5:1
```

The floor is the default `contrastFloors.disabled` in **every** variant, and that
is the point rather than an oversight: a high-contrast theme fades a filled
action's label to between 1.74:1 and 2.23:1, under the 3:1 its own variant asks
of the role pair, and no share a component can pick fixes that. So the fade
cannot carry the state in a high-contrast theme — which is the measured reason
the role pair is the contract and the fade is the deviation still being replaced
(`TODO.md` → Interlocks). `disabled.test.ts` holds every shipped, platform and
authored theme to the floor, the composite, the erased-label case and that gap.
The report is part of `auditTheme`, as `audit.disabledFade`, so a brand's gate
catches a label that fades into its own fill even though every enabled pair
passes.

**The fade is a page mechanism.** A fade composites the fill with whatever is
behind it, so its result belongs to the strip the control sits on rather than to
the control. Measured, the same faded `primary` label that keeps the floor on the
page lands at **1.47:1–1.49:1** on a card in four of the light styles — Linux,
macOS, Windows XP (Luna) and Windows 7 (Aero) — so `disabledFadePairs` measures
the three filled actions on `background` only. A disabled action on a card, a
popover or a group strip paints the neutral pair instead:

```ts
import { disabledAction, type Theme } from "@gpuixui/tokens";

disabledAction(theme);
// { backgroundColor: theme.colors.disabled, color: theme.colors.disabledForeground }
```

That is the pair `contrastPairs` already measures — the label on its own fill, on
the three page surfaces and on the two group strips — so the replacement is a
measured state rather than a second composite nothing checks. The **fill** has a
second job the pair does not cover: it replaces the face of an enabled control,
so it must not wear one of those faces (`decorative.ts` §Decorative surfaces).
Measured, both high-contrast themes shipped `disabled` equal to `secondary`, so
an unavailable action and an enabled tonal action painted the same box in the
variant a reader selects for clarity; `disabled` is the quiet step now. A
**field** keeps fading on `background`, `card` and `popover`: its fill is
`input` (a composite field's is the page role), and the faded value and hint
clear the floor on all three. A filled action and
the menu row already paint the pair in `packages/primitives`; the two recipe sets
and the components' `Button` are the interlock left in `TODO.md`.

#### The dim a control paints while Tab is elsewhere

`@gpuix/native` fades **every other focusable element** while one control has
keyboard focus, so a keyboard user can see where Tab can go. One element is
exempt: a focused `input`/`textarea` dims nothing, because typing is keyboard
input too — the runtime returns no dim path for a field rather than fading only
its siblings, so a filled action beside a form keeps its label while a reader
types. The element keeps 40% of itself and shows the surface behind it; the
runtime's `keyboardFocusDim` field is on by default, is per element, and an
element that draws its own focus look opts out with `keyboardFocusDim: false`.
`contrastRatio` refuses the result, so the one paint every focused state in the
library triggers was measured by nothing. `keyboardFocusDimOpacity` is that share
(`0.4`) and `keyboardDimFailures(theme, floor?)` measures it by compositing.

The share is measured, not assumed: the `keyboard-focus-dim` window capture on
0.11.0 measured it, and measured which surface the text fades against — a
dimmed control's label lands on its **own dimmed fill**, not on the page (the
flatten-the-subtree model read a different pixel in the same capture). Against
the shipped dark palette that pair is the `muted` fill `#1E222A` painted as
`#161A20` over the page, and its `foreground` text `#EEF1F5` as `#6C7075` over
*that fill*; both are `blend(colour, behind, 1 - 0.4)`. It is the same composite
the disabled fade uses (§The fade a disabled control paints), because the
runtime dims each element's own paint. A `KeyboardDimPair` names a placement and
a `KeyboardDimFailure` carries it with the composited `ratio` (or `undefined`
for a role it cannot composite) and the floor.

`keyboardFocusDimOpacity` is a runtime constant rather than a `Theme` group:
every element the runtime dims gets this share, so a brand that set its own
would describe a paint the library does not have. `keyboardDimPairs` is the 40
placements the three filled actions, a field's value and placeholder in both of
its fills (`input` and the page role a composite field paints), a focusable row's
own text and a selected row sit on across `background`, `card`,
`popover` and `muted`; a row with no fill of its own names the surface as its
fill, which is that composite, while a composite field has a fill and is listed
by it. The lowest field placement is macOS light's
composite hint on a muted strip at **1.68:1**.

The floor is `decorativeFloor` (1.05:1), deliberately **not** a readability
floor: the dim is a where-can-Tab-go cue whose job is to keep the control
recognisable, not readable. Dimming a saturated fill toward a light page closes
it on its label — the tightest shipped placement is Linux light's `primary` over
`card` at 1.27:1 (`#C8DDF5` on `#A4C6EF`) — so a control whose text must stay
readable while the focus is elsewhere opts out of the dim rather than asking the
palette for a contrast the mechanism cannot keep. That adoption is an interlock
row in `TODO.md`.

`keyboardDimFailures` is the gate's tenth report (`audit.keyboardDim`), so a
brand runs it with the rest. The dim and the disabled fade are the same
composite with two shares, and the measured consequence is that no palette
fails the dim alone — the dim's band sits inside the fade's — so what the
report adds is the placement and the mechanism: which pair vanished and on
which strip. The two keep separate floors, so a label that lands at 1.45:1 is
reported by the fade and not by the dim. `focus-dim.test.ts` holds the measured
values, every shipped, high-contrast, platform and authored theme, the erased
label, the unmeasurable role and a caller's stricter floor.

```ts
import { keyboardDimFailures, lightTheme } from "@gpuixui/tokens";

keyboardDimFailures(lightTheme); // [] — every dimmed label stays visible
```

### Decorative surfaces

Thirteen surfaces carry no text and are not an essential boundary, so WCAG's floors
do not apply to them: the dividers (`border`), the skeleton fill, the modal veil
(`overlay`), a status message's soft tint and its edge, a scrollbar thumb, the
wash a row is tinted with while it is hovered, pressed, selected or accented, the
resting fill of a tonal action (`secondary`), the rail a bar draws its value
inside (`muted`), the face a control wears while it
is unavailable (`disabled`), the derived hover and press a filled role paints, the
derived wash a row paints in a pointer state, and
the shadow a raised surface drops. They still
have one job — be seen — so they get one floor of their own,
`decorativeFloor = 1.05:1`. Below it a
surface reads as the fill it is painted on: a card without an edge, a skeleton
that looks like an empty row or an empty dialog, a dialog with no layer behind
it, a message with no surface or no boundary, a scroller whose thumb nobody can
find, a menu row that does not answer the pointer, a button that looks like a
label, a bar with no total, a disabled control that looks available.

`decorativeFailures(theme, floor?)` measures every placement the system paints,
compositing a translucent role over its surface first, so the veil — translucent
in every theme by design — is measured by the result a reader sees rather than
rejected as unmeasurable. A derived surface states the share it paints, which is
how a status edge is measured at the alpha its component actually uses:

| Surface | Role | Measured over |
| ------- | ---- | ------------- |
| divider | `border` | `background`, `card`, `popover`, `muted` |
| skeleton | `skeleton` | `background`, `card`, `popover`, `muted` |
| scrim | `overlay` | `card`, `popover`, `muted`, `secondary`, `input`, `selected`, `active`, `accent`, `hover`, `infoSoft`, `successSoft`, `warningSoft`, `destructiveSoft` |
| statusTint | each tone's `xSoft` | `background`, `card`, `popover`, `muted` |
| statusEdge | each tone's solid role, at `statusEdgeAlpha` | its `xSoft` tint, the same four strips, and the washes `hover`, `active`, `selected`, `accent` |
| scrollbar | `scrollbar` | `background`, `card`, `popover`, `muted` |
| stateWash | `hover`, `active`, `selected`, `accent` | `background`, `card`, `popover`, `muted`; `accent` over `selected` (the pointer repaints a chosen row) |
| filledAction | `secondary` | `background`, `card`, `popover`, `muted` |
| track | `muted` | `background`, `card`, `popover` (never `muted` itself) |
| disabledFace | `disabled` | `primary`, `secondary`, `destructive`, `accent`, `input` |

The thumb is chrome: the platform paints and sizes it and the role only tints it,
so it is not held to the 3:1 a control boundary gets. It is still held to being
findable, which is the same reason a divider is.

A **loading placeholder** is the empty-row defect one surface over. The contract
measured it on the page, a card and a muted list, and not on the floating surface
a dialog paints: a dialog whose body is still loading draws its skeleton rows on
the dialog's own `popover` fill (`DIALOG_CONTENT`), so a placeholder that matches
that fill is a dialog with nothing in it. The three dark platform styles did —
macOS 1.049:1, Linux 1.031:1 and Windows 1.039:1 — and each now carries its own
`skeleton`; the tightest placement is the authored Windows XP (Luna) dark look's
placeholder on its dialog fill at 1.054:1.

A **soft status surface** is the tint an alert, a toast or a soft badge sits in,
and the tint is what tells the message apart from the strip behind it. It had
never been measured: `xSoft` appeared only as the background a status edge was
measured over, so a tint equal to its strip passed every suite. Measured, the
base light theme's `successSoft` sat 1.006:1 from its own `muted` toolbar, Luna
light's `infoSoft` was its beige page at 1.00:1, macOS light's success and
warning tints were 1.022:1 from its window, Windows light's 1.028:1 and Aero
light's 1.016:1, and on the darker side Linux dark's destructive tint was
1.005:1 on its card and Luna dark's info tint 1.015:1 on its popover. The light
ramp moved one step deeper (the 200 step, with the 900 text) and the dark one one
step lighter (800, with the 100 text); Luna carries a lighter tint of its own,
because its beige page sits at the same lightness a pale tint has and a deeper
one would vanish into its toolbar instead.

The **edge around that surface** is measured where the surface is, which is the
same four strips — a tint the reader can see and a boundary they cannot is a
message with a soft hole around it. It was measured on the tint and the two page
surfaces only, so a warning alert in a confirmation dialog's body (the
`ConfirmDialog` children slot, on the dialog's `popover` fill) and a soft badge
in a muted sidebar had a measured tint and an unmeasured edge.

A soft **badge** is the one status message painted *inside* a row rather than on
a page — the List example's status column puts a tone badge in a row's
`trailing` slot — and its recipe carries the tone's own 30% edge
(`border border-success/30` and its siblings) while the row tints `accent` under
the pointer, `active` while pressed and fills `selected` once chosen. On a wash
that edge is the whole badge: the tint is a pale surface by design and a row's
wash is a pale surface too, so the boundary is what keeps the pill a pill. The
edge is therefore measured on the four washes as well, and every shipped,
high-contrast, platform and authored style clears the floor on the tint it bounds
and on every strip a message or a badge crosses. The tightest strip is Luna
light's `warning` edge on the `selected` wash at 1.08:1.

A **state wash** is the one entry a component paints *behind* content rather than
around it, so it has two jobs and two contracts: the text on it keeps the floors
`contrastPairs` measures, and the tint itself is held to the 1.05:1 above,
because a wash that carries the strip's own value is a state the reader never
sees. That is not hypothetical — the base dark theme shipped `hover` equal to
`popover`, so hovering a menu row repainted the surface it already sat on; the
base light theme's `hover` was its `muted` toolbar; macOS light's `hover` was its
own muted strip; and Windows light's and Linux dark's were one step away. Each
now carries a wash that clears the floor on all four strips, and `accent` /
`selected` on `muted` in the light themes were deepened for the same reason. The
strips are the four surfaces a row can sit on; a filled action's own hover is a
derived fill (`filledHover`) and is measured by the contrast table instead.

A wash is also measured against **the wash it replaces**, because the strips are
the page under a row and not the state a row is in. A selectable list row fills
`selected` once chosen and tints `accent` under the pointer (`list.tsx`), so a
chosen row is repainted `accent` when the pointer arrives: a theme whose two
roles are one value has a selection that answers nothing. Measured, that was
**eleven of the sixteen** shipped styles — the four base and high-contrast
palettes at exactly 1.00:1, and macOS dark 1.036:1, Linux light 1.011:1, Linux
dark 1.012:1, Windows light 1.021:1, Windows dark 1.024:1, Luna light 1.003:1
and Aero light 1.022:1 — while macOS light's 1.050:1 sat on the floor. Each
style now moves the role that had the room by the smallest step that clears, its
`selected` fill in twelve of them and macOS light's `accent`, because `selected`
is the stronger state: a chosen row deepens, it does not fade. Every step also
had to keep the text roles measured on those fills and the accent face's own
7:1 label, so the four base palettes moved `selected` by three or two percent
rather than a ramp step. The chosen row's pointer step is now measured on all
sixteen styles, and the base dark theme's chosen row is the tightest at 1.05:1.
The **press** that follows a hover is the same defect one state over, and it
needed a derivation rather than a palette edit.

A **pointer state** replaces the wash the row is already wearing: a list row
tints `accent` under the pointer and paints `active` while the press is down
(`list.tsx`), a menu row, a ghost action or a table row tints `hover` and
repaints `active` under the press (`menu/item.tsx`, the primitives' recipe). So
the step is the wash against the wash, not a wash on a strip — and the strips are
the page under a row, the one surface every wash passes. Measured over the
sixteen shipped, high-contrast, platform and authored styles, the press was
invisible in **six** of them: macOS light's `active` sat 1.026:1 from its
`accent` and macOS dark's 1.011:1, Linux dark's 1.015:1, Windows dark's 1.044:1,
Luna light's 1.016:1 and Aero light's 1.020:1 — and macOS light's press in its
own hover at 1.037:1. A palette cannot close it: macOS dark's `accent` carries a
7:1 label and a 3:1 primary tick, and `selectedForeground` on the lightened
`active` is pinned at 7:1, so the three roles have no room between them.

`pointerWash(theme, wash, replaced)` is therefore the derivation — `filledHover`'s
rule applied to a wash. It takes the **smallest move toward the theme's
`foreground`** that clears the 1.05:1 floor against the wash the row already
wears, and never one that costs a label the floor it holds on the role the wash
plays: the row's own text, the secondary line beside it, a checked row's tick,
and the ring and the edge that hug the fill. Zero is a step, so a palette whose
own wash already answers the pointer is painted as it is. The three transitions
are `pointerWashTransitions` — `accent` over `selected` (the pointer arriving on
a chosen row), `active` over `accent` (the list row's press) and `active` over
`hover` (the menu row's press) — and `pointerWashFailures` names the ones a
palette cannot answer; the report rides the `decorative` one, so the gate holds
it without a twelfth contract. The derivation repairs all six shipped styles
(macOS light 1.053:1, macOS dark 1.052:1, Linux dark 1.080:1, Windows dark
1.077:1, Luna light 1.065:1, Aero light 1.060:1), and the tightest placement
over every style is the macOS dark press at **1.052:1**.

A **filled action** is the same defect one control over. `secondary` is the one
filled variant with no brand colour and no border — `packages/primitives` paints
`border-0` for it — so its fill is the whole button. The base light theme shipped
`secondary` equal to `muted` (1.000:1), which made a secondary button inside a
muted toolbar a label with no button around it; macOS light's window sat
1.015:1 from it, Linux light 1.040:1 and Windows light 1.021:1, and the four
dark platform and look palettes landed at 1.021–1.049:1 on their lighter
popovers. The base light `secondary` is now `#E1E5EC` (one neutral step above
`muted`), its `active` wash moved to `#D6DBE4` so a resting control is not the
same value as a pressed ghost, `borderStrong` darkened to `#6A7483` to keep its
3:1 on the new fill, and each affected platform style and authored look carries
its own control face.

A **rail** is the track a bar, meter or slider draws its value inside:
`Progress`, `Meter` and `Slider` paint it `muted` (`progressTrackClass`,
`sliderRailClass`). A rail that matches the fill behind it leaves a 40% bar
reading as a small floating pill with no total, and the dark palettes shipped
exactly that where it matters most: the base dark theme's `muted` **was** its
`popover` (1.000:1), Windows dark sat 1.014:1 on its card and 1.042:1 on its
popover, macOS dark 1.028:1, Luna dark 1.045:1 and Aero dark 1.013:1, so a bar
in a dialog had no track at all. The rail is measured on the page, a card and a
popover; the `muted` strip is exempt, because the quiet fill *is* the strip
there. The five dark quiet surfaces each moved a step — the base dark `muted` is
`#1E222A`, macOS dark `#16161A`, Windows dark `#262626`, and Luna dark and Aero
dark a step darker — and the tightest
rail is Windows 7 (Aero) dark's on its dialog fill at 1.052:1.

A **disabled face** is the same defect in the other direction. A disabled control
does not sit on a strip; it replaces the control, so the comparison is face
against face: an unavailable action that wears the fill of the enabled one beside
it tells the reader it can be pressed. `disabledAction(theme)` (see
[The disabled floor](#the-disabled-floor)) paints the neutral `disabled` role,
and both high-contrast themes shipped it equal to `secondary` — the enabled tonal
action's own fill — so in the variant a reader selects *for* clarity the two
painted the same box and only the lighter label said which was which;
high-contrast light's disabled face was also 1.03:1 from the `accent` a checked
toggle wears. It is now the quiet step (`#F2F2F2` / `#1A1A1A`), which clears the
tonal action, the accent on-state, a field's fill, and both saturated actions in
both variants. The five faces are `primary`, `secondary`, `destructive`,
`accent` and `input`: an unavailable field must not look like an available one
either. The **strip** behind the control is deliberately not measured — the
neutral fill is a quiet surface by design, and in four shipped styles it carries
a quiet strip's own value (the base light theme's `disabled` *is* its `muted`,
the base dark theme's is its `popover`, and both high-contrast
variants' is their `muted`); a fill that matches a toolbar is a quiet
control on a quiet strip, while a fill that matches an enabled face is the state
defect.

This is the **perceptibility** claim, not the 3:1 control-boundary claim: a
component that needs a hard edge paints `borderStrong` on the strips
`contrastPairs` measures. `primary` and `destructive` are not in this table
because a brand fill is also the role a progress bar, a slider's span or a
spinner's lit dot paints, so `indicatorFailures` holds them to the non-text
floor on the same four strips.

A veiled page's **void** is not measured: a black page cannot be darkened by any
scrim, and a high-contrast theme separates its dialog with a border instead. The
strips a modal actually covers are: a card, a floating surface, the `muted`
toolbar of a sidebar, a segmented `secondary` panel, a field's `input` fill and
the `selected` wash a chosen row wears. The veil was measured on the first two
only — the strips of the page's own content — so a window whose sidebar sat
behind a modal had a measured card and an undimmed toolbar, and a brand's dark
`muted` surface could ship a veil that receded nothing. The chosen row is the
same gap one surface on: a confirmation dialog opens over the row it is about, so
a veil painted in that row's fill leaves the thing the dialog is asking about at
full brightness. The row **under the pointer** is the third state: a context
menu, a confirmation dialog or a command palette is opened from a row, and that
row is wearing a wash at that moment — `accent` on a list row, `active` while the
press is down — so those two washes are measured alongside the chosen one. The
`hover` wash is the state a **click** leaves behind: the surface paints after the
button is released, so the ghost trigger it was opened from is hovered under the
veil, and a submenu opens from the menu row the reader points at. The four **soft
status tints** (`infoSoft`, `successSoft`, `warningSoft`,
`destructiveSoft`) are the fourth, and they are the same composition as the
shadow's: a confirmation dialog opened from an `Alert`'s retry covers the
message that asked for it, so the veil has to recede the tint the message is
painted on. A surface that cannot be measured at all — a
translucent page — is reported with `ratio: undefined`, exactly as a text pair
is.

The **elevation tint** is in the table too, and it is the surface this page used
to say was deliberately outside it. A shadow is a blurred geometry, so a flat
composite overstates what the eye receives — but it overstates in the safe
direction: **every level a component raises a surface to** is measured over every
strip it can fall on (`sm` is a card's lift, `md` the toast, preview card and
navigation panel, `lg` a dialog, popover, menu or drawer), so a shadow that passes
may still read faint at its blurred edge and only a shadow a reader cannot see at
all is reported. The deepest level is **not** a ceiling for the two below it: a
weaker level is less visible by design, so a brand whose card lift paints its own
fill raises a card with no lift while the dialog's shadow still measures well —
which is why each level is read, and why a failure names the level it measured.
The measured colour is the level's own, because a level carries its
share in its alpha byte and a brand can supply a level whole; the strips are the
four a raised surface floats over (`background`, `card`, `popover`, `muted`), the
two window fills the veil already names — a segmented `secondary` panel, which is
also a tonal action's face, and a field's own `input` fill, which a picker's panel
overlaps — every wash a surface can open over, and the four
soft status tints a message is painted on. A context menu opens over the row the
reader right-clicked, so its shadow lands on that row's own fill; a submenu opens
from the menu row whose submenu was chosen, so the shadow lands on that row's
`hover` wash (`menu/item.tsx`), and a dialog or popover opened by a click falls
on the ghost trigger the pointer still rests on (`internal/button.tsx`); an
`Alert`'s description is a container whose documented action is a plain
`Button`, so a menu opened from one casts its shadow over the tint the message
sits in.

The veil and the shadow cover the same window, so a strip the veil names and the
shadow does not is a hole — and the high-contrast dark theme had one. The black
tint it shipped first was found exactly this way (1.00:1 on its pure-black page at
every level, so no raised surface there had a shadow), and its replacement grey
matched the same theme's `secondary` face, so a dialog opened over a segmented
panel painted a shadow the panel could not show (**1.00:1**) while the page, card,
popover, toolbar and wash placements all passed. The tint is now a grey lighter
than the faces it can fall on (`#4A4A4AB3`), and every raised level clears the
floor on all fourteen strips: the card's lift reads 1.08–1.28:1, the menu's
1.13–1.59:1 and the dialog's 1.17–1.87:1. Across every shipped, high-contrast,
platform and authored style the tightest of the 588 placements is 1.06:1 — the
authored Windows 7 (Aero) dark card lift on a field's own fill. The
one-shadow-per-level rule and the role-owned tint remain `elevation.test.ts`'s.

```ts
import { decorativeFailures } from "@gpuixui/tokens";

decorativeFailures(theme);
// [{ surface: "stateWash", role: "hover", over: "popover", ratio: 1, floor: 1.05 }]
decorativeFailures(theme, 1.2); // a brand that needs stronger decoration
```

### Indicator marks

A **mark** is the role a component paints when it shows rather than says
something: a progress fill, a spinner's lit dot, a slider's filled span, a
switch's on-state, an avatar's presence dot. It is neither text nor a boundary,
so no part of the contrast table covered it — `primary` was measured only against
its own on-colour, and a bar drawn on the page was measured by nothing.

A mark still has one job: a reader has to find it from across a panel. So it is
held to the theme's non-text floor — `contrastFloors.boundary`, 3:1 (4.5:1 in a
high-contrast theme) — on every strip a bar or dot is drawn on.

The 8 mark roles, on the 9 strips, are `indicatorRoles` and `indicatorSurfaces`
— `background`, `card`, `popover` and a `muted` toolbar strip at rest, the four
washes a row wears (`hover` and `active` while the pointer is on it or pressed,
`accent` under the pointer on a list row and `selected` once it is chosen), and a
field's own `input` fill, where the native text host paints its caret
(`nativeTextTheme` hands the runtime `primary` as the caret):

| Mark | Role |
| ---- | ---- |
| working / progress / selected | `primary` |
| complete | `success` |
| invalid | `destructive` |
| a quiet bar or trail | `mutedForeground` |
| a status dot | each tone's readable role — `statusTone(theme, tone).foreground` |

The last row is the rule, not a preference. A status tone's **solid** role is a
*surface designed to carry text*: light `warning` is a pale amber with near-black
text, 1.78:1 on the page. A dot painted in it would be the one mark nobody can
find, so a status mark paints the tone's readable role — the same role a soft
status surface and a field error paint — instead. A mark drawn **inside** a
filled control is the exception the table does not need: it paints that fill's
on-colour (`primaryForeground`, …), which the contrast table already measures on
its own fill.

```ts
import { indicatorFailures, lightTheme } from "@gpuixui/tokens";

indicatorFailures(lightTheme); // [] — every shipped mark is visible
// [{ role: "primary", surface: "background", ratio: 1.04, floor: 3 }]
```

The washes are not decoration: a checked menu item's tick and a combobox's
selected check are painted `primary`, and both rows set `hover` on the pointer
and `active` while pressed, so the mark is read on those strips rather than on
the popover it rests on. That pair found the documented **Aero brand**: its
single dark blue sat at 1.70:1 and 1.46:1 on the look's own dark washes — a tick
that vanished as soon as the reader pointed at its row — so the brand owns
`primary` per mode now (`#0F5E8C` with white in light, `#4FA9E0` with the
near-black it carries in dark).

A **list row** is the second registry and the other two washes. `list.tsx` tints
`accent` under the pointer, keeps `active` while the press that opened a surface
is down, and fills `selected` once the row is chosen, while its `leading` slot is
documented as the place for an `Avatar` — and a presence dot is a mark, painted
`success`, `destructive`, `mutedForeground` or a tone's readable role. A dot on
the row a reader had chosen was measured by nothing, and the placement found
**Luna light**: the shared success step measured 2.82:1 on the look's lighter
selected wash, so a conversation's presence dot disappeared exactly when the
reader selected it. The look carries `palette.green[700]` as its `success`
(4.12:1 there) and every other shipped style already cleared the floor.

`indicatorFailures(theme, floors?)` names each mark and strip that misses the
floor, reports one it cannot measure (a translucent role) rather than skipping
it, and is part of [`auditTheme`](#checking-your-own-theme). The floor is the
theme's own variant's — `contrastFloorsFor(theme).boundary` — so a high-contrast
brand is held to 4.5:1 without the caller naming a floor set; an explicit floor
set still overrides it. Every shipped,
high-contrast, platform and authored theme passes; the tightest placement is
macOS dark's `primary` mark on the `accent` a list row tints under its own
pointer, at 3.06:1. `indicator.test.ts` holds the sweep, the rule, the four
washes and their painters, the Aero pre-fix values, the Luna dot, the
unmeasurable case, the variant default and a caller's stricter floor.

### Every role is measured

The contracts cover the whole role list, and that is itself guarded. `colorRoles`
is the inventory of what a theme carries, and `coverage.test.ts` fails when a
role appears in none of them — no pair, no decorative placement, no dedicated
contract. It found two that had shipped unmeasured: `disabledForeground` (now on
the disabled floor) and `scrollbar` (now a decorative surface). One role is
measured by a contract of its own rather than a pair, and the guard names it:
`selection` by `selectionFailures`, because a translucent wash is measured by what
it does to the text inside it. `shadow` used to be the second, exempted on the
argument that a blurred geometry is not a fill; it is a decorative placement now
(§Decorative surfaces), so the exemption went with it. An exemption that stops
being needed fails the same guard, so the list cannot quietly grow.

## Fonts

A theme can only name a family the runtime knows, and GPUix knows the operating
system's own faces plus any font file an application installs. `registerFonts`
is that install step: it takes the renderer, hands it each file's **bytes**, and
returns the families a theme may now name.

```ts
import { registerFonts } from "@gpuixui/tokens";
import { createRenderer, render } from "@gpuix/react";
import { extendTheme, lightTheme } from "@gpuixui/tokens";

const renderer = createRenderer();
const families = registerFonts(renderer, [{ family: "Inter", data }]);
// ["Inter"]

const theme = extendTheme(lightTheme, { typography: { sans: "Inter" } });
render(<App theme={theme} />, { renderer }); // the first text to name Inter
```

Three facts shape the API:

- **Bytes, not a path.** `renderer.registerFont(bytes)` takes the file. The
  family comes from the font's own name table, so the `family` you pass is what
  your theme will name — a mismatch falls back silently.
- **Idempotent per renderer and per file.** An application that calls it on every
  mount installs each file once; a second call still returns the families. A file
  the runtime rejects throws and is not remembered, so a corrected file can be
  retried.
- **Before the first layout that names the family.** Register, then render.
  GPUix lays text out against the faces it has: a family that did not exist when
  the text naming it was first laid out paints the fallback. That fallback is not
  permanent — the next layout re-lays the text out against the face the renderer
  now knows (measured: 44px → 81px on the next repaint, the playground's
  `font-registration-late` probe) — so the rule buys the **first frame**, not a
  face the runtime refuses afterwards. The renderer exists before the first
  render, so this is an ordering rule, not a lifecycle hook: installing from a
  mount effect runs after the children that paint the text and shows one
  fallback frame. The React renderer exposes `registerFont` optionally (the
  browser renderer has none), so guard for its absence at that boundary.

The face reaches components through the theme rather than through the runtime:

```ts
import { extendTheme, lightTheme, textStyle } from "@gpuixui/tokens";

const theme = extendTheme(lightTheme, { typography: { sans: "Inter" } });
textStyle(theme, "body").fontFamily; // "Inter"
```

The library ships no bundled family yet, so there is no font licence obligation
today; a consumer's own typeface travels the same route. The runnable example is
in [`src/fonts.test.ts`](../packages/tokens/src/fonts.test.ts), and both orders
are measured in a window. The playground's `register-font` probe proves the
recommended one: a registered face lays the sample word out at its own advances
while an unknown family paints the fallback's, so the paint is the file.
`font-registration-late` then proves the fallback is a frame, not a verdict — a
word that painted 44px with no face declared paints 81px on the next layout
after the file is installed mid-session, while a family nothing installs stays
at 44px ([`apps/playground/README.md`](../apps/playground/README.md)).

## Native text hosts

`<input>`, `<textarea>` and `<code>` are drawn by the runtime's text engine, not
by `StyleDesc` properties, so their palette arrives through the host's `theme`
prop. A host given **no** theme layers its own defaults on GPUix's built-in dark
theme — the pinned `@gpuix/native@0.11.0` typings say so — which means a field in
a light theme would paint a placeholder and a caret chosen for a dark surface
while its fill, value colour and selection wash came from this package.
`nativeTextTheme` is that seam: one call turns a `Theme` into the object the host
takes.

```ts
import { nativeTextTheme } from "@gpuixui/tokens";

const host = nativeTextTheme(theme);
host.appearance; // theme.mode — the field's own defaults follow it
host.bg; // theme.colors.input
host.text; // inputForeground — the ink a <code>/<diff>/<markdown> host paints
host.textFaint; // placeholder — the faint role a code block's gutter paints
host.caret; // primary
host.fontSans; // typography.sans
host.metrics.codeTextSize; // typography.codeBlock.fontSize
host.diffAdd; // the success tone's readable role
host.diffDel; // the destructive tone's readable role
host.diffHunkBg; // muted — the hunk header's chrome stripe
```

A field is not painted from `host.text`: an `<input>`/`<textarea>` paints its
value from the element's own `color`, so a field hands the role over as a
property beside the object (§What a field's value actually paints):

```tsx
<input
  theme={nativeTextTheme(theme)}
  style={{
    backgroundColor: theme.colors.input,
    color: theme.colors.inputForeground,
  }}
/>
```

| Host field | Role |
| ---------- | ---- |
| `appearance` | the theme's `mode` |
| `bg` | the fill the field paints — `input`, or the page role (see below) |
| `text` / `textMuted` | `inputForeground` / `mutedForeground` — the ink a `<code>`, `<diff>` or `<markdown>` host paints |
| a field's value | not this object: `<input>`/`<textarea>` paint the element's `color`, so pass `inputForeground` (above) |
| `textFaint` | `placeholder` |
| `accent` / `caret` | `primary` |
| `fontSans` / `fontMono` | `typography.sans` / `typography.mono` |
| `metrics.codeTextSize` / `codeLineHeight` | `typography.codeBlock`'s size / leading |
| `diffAdd` / `diffDel` | the `success` / `destructive` tone's readable role |
| `diffHunkBg` / `textDim` | `muted` / `mutedForeground` |
| `codeText` / `codeWash` | `foreground` / `muted` — inline code as prose in a chip |
| `border` | `border` — a rendered document's table rules |
| `syntax` | `syntaxColors(theme)` — the token colours a `<code>` host highlights with (§[Syntax palette](#syntax-palette)) |
| `metrics.diffTextSize` / `diffLineHeight` | `typography.codeBlock`'s size / leading |
| `metrics.mdTextSize` / `mdLineHeight` | `typography.body`'s size / leading |
| `metrics.mdHeadingSizes` / `mdHeadingLineHeights` | `h1`/`h2`/`h3` then `body` |
| `metrics.mdCodeRadius` / `mdInlineCodeRadius` | `radius.lg` / `radius.sm` |

A `<code>` host is the one host whose **type** also comes from the theme object:
the runtime sizes a code block from the theme's own metrics — an element's
`style` still wins where it sets a size — and its default is 12.5/18
(`packages/native/src/theme.rs`'s `Metrics` at the pinned `@gpuix/native@0.11.0`)
— not this library's scale. The seam hands over `typography.codeBlock`'s size and
leading, so a brand's block role reaches the host instead of stopping at it; the
gutter widths stay the runtime's, because this package has no tokens for them
(§Limitations). The **syntax palette is this package's**: `host.syntax` carries
one colour per token type, and §[Syntax palette](#syntax-palette) is that scale.

### The diff host

A `<diff>` host paints its own green and red unless the theme object carries
them: at the pinned release an added line's ink is `diffAdd`, the row under it is
tinted **5.5% of that same value** over the fill
(`packages/native/src/custom_elements/diff.rs`), a removed line's is `diffDel`, a
hunk header sits on `diffHunkBg` and its file path is `textDim`. So one value
does two jobs — the ink and the hue of the wash it sits on — and the seam picks
the value that has to serve both: a status tone's **readable** role, not its
solid fill. A fill is designed to carry its own on-colour, not to be read on the
page: light `success` measures 4.26:1 there, under the secondary floor a 11px
count needs, while the tone's readable role measures 11.98:1.

`nativeDiffWash` (0.055) is the runtime's own share, exported so a consumer's
contract can composite the row it will actually paint. The contract measures
three things per placement, in both of the fills a host can be handed:

| Contract | Floor | What it catches |
| -------- | ----- | --------------- |
| `diffAdd` / `diffDel` on the fill | body | a changed-line count nobody can read |
| the same ink on its own row wash | body | ink the tint it derives buries |
| the row wash against the fill | 1.05:1 | a changed line that does not look changed |
| `textFaint` on the hunk stripe | secondary | a hunk header with no header text |
| `diffHunkBg` against the fill | 1.05:1 | a stripe indistinguishable from the pane |
| `textDim` on the fill | secondary | a file path that disappears |

The hunk stripe is a `muted` toolbar, and its text is the runtime's `text_faint`
— the `placeholder` role — so the faint role had to clear the secondary floor
**on a chrome strip**, not only on the page. It did not: the base dark
placeholder measured 4.29:1 on its own toolbar, and every light style was
4.35–4.46:1 on the platform toolbars and the two authored looks. The faintest
role is a step further from its surface now — light `#606A79`, dark `#858E9F`,
Luna `#59616D`, Aero `#586978` — and every placement clears 4.5:1, the tightest
being a dark platform's page fill at 5.01:1.

### The document host

A `<markdown>` host renders prose, headings, inline code and tables, and every
one of them comes from the theme object. Its body and headings take the scale's
own roles — `body` for the document body, `h1`/`h2`/`h3` and then `body` for the
four heading levels — so a brand's type scale reaches a rendered document
instead of stopping at the component tree. A `<diff>`'s rows follow the block
role (`diffTextSize` / `diffLineHeight` from `typography.codeBlock`) because a
diff is code, and a markdown code card and its inline chip take `radius.lg` and
`radius.sm`.

Inline code is **prose in a chip**, not a second syntax palette: the runtime's
own violet ink over a 10% violet wash is a style no token owns, so `codeText` is
the page's `foreground` and `codeWash` is `muted` — the pair the contrast table
already holds at the body floor, with the chip itself visible against the page at
the 1.05:1 decorative floor. A table rule takes `border`, the role a divider is
measured by. The numbers with no token of their own stay the runtime's: a code
block's gutter, a diff's paddings and accent bar, and a document's table column
minima (§Limitations).

### What a field's value actually paints

The seam hands `text: inputForeground`, and that role is the ink a `<code>`, a
`<diff>` and a `<markdown>` host paint. A **field** is different: at the pinned
`@gpuix/native@0.11.0` an `<input>`/`<textarea>` paints its value from the
element's `style.color` (`custom_elements/input.rs`), so the theme object's `text`
never reaches a field and a host given only the seam paints the platform default
— near-black on a dark fill. The playground's `field-ink` probe measured it off a
captured frame on 0.11.0: a value typed into a host given only the seam peaked at
its own border's **47.5** luminance, i.e. darker than the fill it sits on, while
the same host with `color: inputForeground` peaked at **240.7** — the ink's own —
and the shipped `Input` matches that (22 checks, `--only field-ink`). So a field
host passes the role as a property:

```tsx
<input
  theme={nativeTextTheme(theme)}
  style={{
    backgroundColor: theme.colors.input,
    color: theme.colors.inputForeground,
  }}
/>
```

The library's own fields already do — `Input`'s recipe paints
`text-input-foreground` — which is why no component suite could see it. The
contract is unchanged: the value is still `inputForeground` on both fills, so
`contrastPairs` measures the ink a field actually paints.

### What a field's placeholder actually paints

The seam fills `textFaint`, and a `<code>` gutter and a `<diff>`'s meta rows read
it — but a native `<input>`/`<textarea>` does **not**. At the pinned
`@gpuix/native@0.11.0` an empty field shapes its placeholder text with a fixed
`#8F8F8F` (`custom_elements/input.rs`, the one occurrence of that value in the
package), so no token reaches it and no theme change can move it: the runtime's
grey measures **2.84:1** on a white field and 4.72:1 on the base dark fill. The
`placeholder` role is still the faint role the library paints itself — a number
field's unavailable steppers are `colors.placeholder` — and the one the contrast
table holds on both fills, so a component that needs a themed placeholder paints
the text itself while its field is empty instead of handing the host one. The
components package's fields pass the host's `placeholder` today; adopting the
painted hint is recorded in `TODO.md` → Interlocks.

A field paints one of **two** fills, and the host has to be told which, because
the roles above are measured against it. A plain field paints `input`; a
composite field — a search, tag or mention field, the chat composer, the inline
edit, the colour picker's hex field — paints the page role as its own fill, so
its value and placeholder sit on `background`:

```ts
nativeTextTheme(theme); // a plain field: the value sits on `input`
nativeTextTheme(theme, "background"); // a composite field: on the page role
```

`nativeTextFills` is that two-value list. The contrast table measures both: the
value at the body floor, the placeholder at the secondary floor, on `input` and
on `background`; the caret is the `primary` mark on the same fill, held to the
non-text floor. The page-fill pair found two shipped misses: Aero light's
placeholder measured **4.35:1** on its own window and macOS light's inherited
value **4.49:1** on its, both under the 4.5:1 floor, so those values moved. The
tightest placement over both fills is Light · Windows 7 (Aero)'s placeholder on
the page role at 4.89:1 — 0.39 of headroom, recorded rather than widened, because
every light palette's placeholder is a step deliberately fainter than its
secondary text.

**Adoption.** Both packages carry the seam. `packages/primitives/src/core/style.ts`
re-exports it, so `Input`, `TextArea`, `NumberField` and `OTPField` share one
rule rather than a copy (`src/core/native-text.test.ts` holds the identity).
Every host in `packages/components` passes it: `FieldInput` (`field.tsx`),
`SearchInput`, `TagInputField`, `MentionInput`, `InlineEdit`, `ColorPicker`'s hex
field, `ChatComposer`, `TimePicker`'s segments, `CommandMenuInput` and
`ComboboxInput` — the last two through the runtime's part props. Each names the
fill it paints: `input` for a plain field, `background` for the composite ones.
The mapping is held by
[`src/native-text.test.ts`](../packages/tokens/src/native-text.test.ts), which
runs every shipped theme and both fills through the same floors and fails when a
components file that renders an `<input>`, `<textarea>` or `<code>` stops passing
the seam.

## Syntax palette

`@gpuix/native@0.11.0` highlights a `<code>` block with the tokens in the host
theme's `syntax` field. A host handed none paints its **own** palette, which is
the one designed for its built-in dark default, so a light theme's code block had
comments and keywords chosen for a dark canvas — the one native surface a reader
spends time in was also the only themed surface with a foreign palette.

`syntaxColors(theme)` returns the palette for a theme's mode and contrast
variant: **twenty-four** token types, every key the runtime reads, so a host
never falls back to its own colour for a token this package forgot.

| Token | Light | Dark |
| ----- | ----- | ---- |
| `comment` | `#545D6C` | `#A1A9B7` |
| `keyword` | `#3B2C8F` | `#A7A9FF` |
| `string` | `#0E5135` | `#6FE0A3` |
| `stringSpecial` | `#0A3A26` | `#A8F0C6` |
| `escape` | `#4B3100` | `#FFDE8A` |
| `number` | `#2A1B00` | `#FFC94D` |
| `boolean` | `#173A88` | `#9FBEFF` |
| `typeName` | `#2E2370` | `#C7CBFF` |
| `typeBuiltin` | `#1C1547` | `#E0E3FF` |
| `constructor` | `#152F6B` | `#C5D8FF` |
| `function` | `#0C1D42` | `#DEE9FF` |
| `functionBuiltin` | `#152F6B` | `#C5D8FF` |
| `macroName` | `#5C1619` | `#FF9E9E` |
| `property` | `#173A88` | `#9FBEFF` |
| `constant` | `#3A0B0D` | `#FFC6C6` |
| `variable` | `#191D25` | `#E1E5EC` |
| `variableSpecial` | `#5C1619` | `#FFC6C6` |
| `parameter` | `#3D4552` | `#CBD1DB` |
| `operator` | `#2A303B` | `#E1E5EC` |
| `punctuation` | `#3D4552` | `#CBD1DB` |
| `tag` | `#7E1D21` | `#FF9E9E` |
| `attribute` | `#4B3100` | `#FFDE8A` |
| `label` | `#0B0D11` | `#EEF1F5` |
| `invalid` | `#3A0B0D` | `#FF9E9E` |

The four tables are `lightSyntax`, `darkSyntax`, `highContrastLightSyntax` and
`highContrastDarkSyntax`; `syntaxRoles` is the ordered list of keys and
`syntaxRoleFloors` says which floor each one answers to. Two claims are
measured:

- **Every token that names code is read at the body floor** — a keyword, a
  string, a number or a name is the text the reader came for — on both fills a
  native host paints: the page role a code block fills (`syntaxSurfaces` is
  `background` and `input`, the two `nativeTextFills`). That is 7:1 by default
  and 7:1 in a high-contrast theme; the tightest shipped cell is the dark
  `keyword` at **7.22:1** on Linux's page — 0.22 of headroom, recorded rather
  than widened, because a keyword one ramp step lighter would sit on the AAA
  palette's other lightness band.
- **A comment answers to the secondary floor** (4.5:1; 7:1 when the theme
  declares `contrast: "high"`), because a comment is an annotation about the code
  rather than the code. The two high-contrast tables are the default ones with
  that one role moved to the AAA floor — `#3D4552` light and `#CBD1DB` dark —
  which is why there are four rather than two.

`syntaxFailures(theme, floors?)` reports every token that misses its floor,
naming the token, the fill and the measured ratio, and reporting a colour it
cannot measure rather than skipping it. `auditTheme` includes that report, so a
brand is held to it. A theme owns a palette by carrying `syntax`, which
**replaces the table whole** — the host reads all twenty-four keys, so a partial
palette would leave the rest on the runtime's own colours. Recolor one token by
spreading the table the theme resolves:

```ts
import { auditTheme, extendTheme, syntaxColors } from "@gpuixui/tokens";

const brand = extendTheme(theme, {
  syntax: { ...syntaxColors(theme), keyword: "#7A1F5C", string: "#0B5E4A" },
});

syntaxColors(brand).keyword; // the brand's own
syntaxColors(brand).number; // the value it spread
auditTheme(brand).syntax; // [] — every token still clears its floor
```

A **look** owns one the same way, in the `PlatformStyle` shape: a style may
declare `syntax` per mode, `applyStyle` hands it over under the rule its palette
follows (a high-contrast base keeps its own), and a style that declares none
resolves the base theme's table. A runnable example resolves the palette for a
brand and audits it; see
[`src/syntax.example.ts`](../packages/tokens/src/syntax.example.ts).

**Adoption.** `nativeTextTheme` hands `syntaxColors(theme)` to the host as
`syntax`, and the components package's `CodeBlock` reads the same table through
`syntaxColors(theme)` and maps `@tanstack/highlight`'s token classes to it, so a
code block highlights in the theme's palette. The ink itself is painted by the
runtime's text engine, so the palette reaching it is measured on painted pixels,
not only on the host object: the playground's `syntax-palette` probe paints one
four-line TypeScript source three times in a window on `0.11.0` (**29** checks)
and counts each block's own box. The light block paints **756** solid `#3B2C8F`
pixels and none of the dark keyword, the dark block **896** `#A7A9FF` and none of
the light one, and a third block handed the same seam **without** `syntax` paints
**832** of the runtime's own `#8F96ED` — so the colour travels with the theme
object rather than being resolved once for the window, and the fallback a theme
without a palette would inherit is real. `syntax.test.ts` holds the host object
and the tables; the probe is the paint. Evidence:
[`apps/playground/README.md` §`syntax-palette`](../apps/playground/README.md).

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

This is the default theme's scale. A platform style replaces it —
macOS 4/6/10/14, Linux 4/6/9/12, Windows 2/4/8/8 — so a Windows control reads
squarer than a macOS one. `full` stays rounded everywhere.

## Density

Density changes control height, horizontal padding and row height only. Type
and spacing are unaffected.

| Preset | `controlHeight` sm/md/lg | `controlPaddingX` sm/md/lg | `rowHeight` |
| ------ | ------------------------ | -------------------------- | ----------- |
| `compact` | 24 / 28 / 32 | 6 / 8 / 10 | 28 |
| `comfortable` (default) | 28 / 32 / 36 | 8 / 10 / 12 | 32 |
| `spacious` | 32 / 36 / 40 | 10 / 12 / 14 | 36 |

A platform style picks the preset its native controls sit at — macOS `compact`,
Windows `comfortable`, Linux `spacious` — so `platformTheme` carries a density
too. Layer `extendTheme` to change it without losing the platform's look.

A brand can change one size without restating the preset. `DensityOverrides`
takes a partial `controlHeight` and `controlPaddingX`, and `extendTheme` merges
them size by size, so the recorded metrics stay complete — a record a brand
changes one step of must not lose the steps the audit requires:

```ts
import { extendTheme, lightTheme } from "@gpuixui/tokens";

// md becomes 34px; sm stays 28 and lg stays 36.
export const roomier = extendTheme(lightTheme, {
  density: { controlHeight: { md: 34 } },
});
```

`densityPresets` holds all three presets and `defaultDensity` is
`densityPresets.comfortable`, the preset the built-in themes carry.

```ts
import { controlHeight, controlPaddingX } from "@gpuixui/tokens";

controlHeight(theme, "md");
controlPaddingX(theme, "md");
```

## Elevation

Shadows are structured objects (`offsetX`, `offsetY`, `blurRadius`,
`spreadRadius`, `color`) — the exact five fields of GPUix's
`StyleDesc.boxShadow`. There is no `inset`. `boxShadow` accepts one shadow or a
list; the elevation scale deliberately ships **one** shadow per level, so a level
cannot render half of itself.

| Level | Light | Dark | High-contrast light | High-contrast dark | Use |
| ----- | ----- | ---- | ------------------- | ------------------ | --- |
| `sm` | `0 1 2 0 #191D2514` | `0 1 2 0 #00000066` | `0 1 2 0 #00000014` | `0 1 2 0 #4A4A4A66` | resting cards |
| `md` | `0 4 12 -2 #191D251F` | `0 8 24 -4 #000000A6` | `0 4 12 -2 #0000001F` | `0 8 24 -4 #4A4A4AA6` | menus and popovers |
| `lg` | `0 16 40 -8 #191D2529` | `0 24 56 -12 #000000CC` | `0 16 40 -8 #00000029` | `0 24 56 -12 #4A4A4ACC` | dialogs and command palettes |
| `overlay` | `[]` | `[]` | `[]` | `[]` | reserved; overlay layering uses the scrim colour |

A level is a list because the runtime accepts a shadow list; the scale is
designed as one shadow per level, so a shipped level carries one entry and a
consumer reads it with `elevationShadow`:

`elevationLevels` is the set as an ordered list — `sm`, `md`, `lg`, `overlay` —
the order a surface is raised through, the order the table above prints and the
order `invalidShadowColors` reports a level in. A consumer that renders the
scale (a theme editor's level picker) iterates it instead of retyping the keys.

```tsx
import { elevationShadow } from "@gpuixui/tokens";

<div style={{ boxShadow: elevationShadow(theme, "md") }} />;
```

`elevationShadow(theme, level)` returns the level's shadow, or `undefined` for
the reserved empty `overlay` level (which `boxShadow` accepts). A level the theme
does not carry — a theme restored from storage that predates it — resolves to
`undefined` too, so a raised surface paints flat instead of throwing where
`invalidShadowColors`/`auditTheme` already named the absence
(§[Paint-ready values](#paint-ready-values)). A level with two
entries would be a second shadow the design did not ask for, so
`packages/tokens/src/elevation.test.ts` fails if one appears.

Each level's colour is the theme's `shadow` role at that level's designed
strength — 8%, 12% and 16% over a pale canvas; 40%, 65% and 80% over a dark one,
where the shadow is the only separation two surfaces have. The level owns its
geometry and its share, the role owns the tint, so a brand that retints `shadow`
retints every shadow it paints:

```ts
import { extendTheme, lightTheme } from "@gpuixui/tokens";

const brand = extendTheme(lightTheme, { colors: { shadow: "#0B1220" } });
elevationShadow(brand, "md"); // the shipped md geometry, tinted #0B1220 at 12%
```

`extendTheme` restates every level it inherits when `colors.shadow` changes; a
level passed in `elevation` replaces the whole array, colours and all, because
its colours are the caller's. `elevationWithTint(elevation, tint)` is that rule on
its own, for a theme composed by hand, and keeps each level's strength and
geometry.

A supplied level's colours are outside `invalidColorRoles`' reach — that report
reads `colors` — and the runtime ignores a shadow colour it cannot parse, so the
level paints no shadow at all. `invalidShadowColors(theme)` names the level, the
position and the value, and `auditTheme` includes the report:

```ts
import { extendTheme, invalidShadowColors, lightTheme } from "@gpuixui/tokens";

const brand = extendTheme(lightTheme, {
  elevation: {
    md: [
      { offsetX: 0, offsetY: 4, blurRadius: 12, spreadRadius: 0, color: "#00000" },
    ],
  },
});

invalidShadowColors(brand); // [{ level: "md", index: 0, color: "#00000" }]
```

`lightElevation` and `darkElevation` are the level tables the two themes carry,
shaded from their own colour set's `shadow` role;
`highContrastLightElevation` and `highContrastDarkElevation` are the high-contrast
themes' tables, shaded from theirs — the contrast variant changes the palette, so
it changes the role, and the role owns the hue. The geometry and the strength are
the same in every variant of a mode. A consumer that needs a level outside a
resolved theme reads the tables directly. `elevation.test.ts` holds each level to
the role's hue and its strength, holds every shipped theme to its own role, and
proves a brand's retint reaches every inherited level while an explicit one
survives.

A level is also a **rung of a scale**: the level a surface is raised to must reach
further below its box than the level under it, and `invalidScales` compares them
by the distance the painted shadow extends — `offsetY + blurRadius +
spreadRadius` (§Scale order). A brand that copies a design-tool export level by
level can give `md` the dialog's geometry, so a dialog casts a tighter shadow
than the menu beneath it while every number is layable; the report names `lg` and
the reach of both levels.

A level also has to be **visible**: every level a component raises a surface to
must differ from each strip a raised surface falls on, which `decorativeFailures`
measures (§Decorative surfaces) and reports with the level that failed. A tint
equal to the page cannot darken it, however strong the level's share — the
high-contrast dark theme's black-on-black shadows did exactly that — so a brand
that retints `shadow` is held to the same floor as the shipped themes. The
deepest level is not a checkpoint for the rest: a card's `sm` lift is weaker than
a dialog's `lg`, so a tint that leaves the dialog measurable can still erase the
card.

## Layering

There is no `z` scale and no stacking token. The pinned `@gpuix/native@0.11.0`
`StyleDesc` has no `zIndex` field, so the renderer has one stacking rule: **paint
order is tree order**. A surface paints above the page by being rendered after
it, and the only way to put one thing over another is to mount it later. A
numeric scale here would be a token the runtime ignores — the one thing a design
system must not ship.

What the library defines instead is the order an application **mounts** its
surfaces in, one layer at a time:

1. **inline** — the page itself.
2. **anchored** — `DropdownMenu`, `ContextMenu`, `NavigationMenu`, `Popover`,
   `PreviewCard`, `Combobox` and the picker panels. Each positions itself
   against its own anchor through `FloatingLayer`; between two anchored
   surfaces, tree order decides.
3. **tip** — `Tooltip`, on the runtime's own tip layer. The runtime owns its
   open/close and its Escape, so it is not on the component dismiss stack.
4. **modal** — `Dialog`, `Drawer`, `ConfirmationDialog` and `CommandMenu`, over
   the `overlay` scrim at window coordinates. A modal covers every anchored
   surface mounted before it.
5. **notice** — `ToastViewport`, mounted **last in the app root** so a
   notification paints over an open dialog. The `Toast` page repeats this; it is
   the one mounting order a consumer must get right.

Two rules follow:

- **Render late, not high.** An overlay cannot raise itself after the fact, so
  mount it after the content it may cover. A dialog opened inside a sidebar is
  rendered from the window root, not from the sidebar's subtree.
- **Dismissal is a stack, not a weight.** `packages/components/src/internal/dismiss-layer.ts`
  pushes each open overlay and offers Escape and outside presses to the
  **topmost** layer only, so nesting dismisses outside-in — a popover inside a
  dialog closes the popover first — and one keystroke cannot close two surfaces.
  The event is the unit of consumption, not the layer.

Two differently named tokens are easy to mix up here:

- `overlay` is the **modal scrim colour** (`#00000073` light, `#000000A6` dark),
  painted behind a modal's content and measured as a decorative surface over
  `card`, `popover`, `muted`, `secondary`, `input`, `selected`, `active`,
  `accent`, `hover`, `infoSoft`, `successSoft`, `warningSoft` and
  `destructiveSoft` (`decorative.ts`) — the strips a window actually holds
  behind a modal, including the row the reader has chosen, the row the pointer
  or a press has tinted when the surface opens over it, the control the click
  left hovered, and the message a confirmation was opened from — not the page's
  void. It is what makes a modal recede.
- `elevation.overlay` is a **reserved, empty elevation level**. It lifts nothing:
  `elevationShadow(theme, "overlay")` returns `undefined`, and a surface that
  names it paints flat. Floating surfaces take `elevation.lg` — the dialog (and
  the command palette inside it), the popover and the menu pass the level to
  `overlaySurfaceStyle`, and the drawer's own `shadow-lg` resolves to it.
  `elevation.md` is the lift a surface keeps from its own recipe: the toast
  card, the preview card and the navigation-menu panel name `shadow-md` and pass
  no level, so their lift is `md` — see §Elevation.
  The slot is kept rather than filled or removed, because the shape is the
  contract: a `Theme` is plain data a brand may write from scratch, so dropping
  the key would be a breaking type change for every hand-built theme literal and
  every `elevation` override, while a designed step above `lg` has no consumer —
  a popover inside a dialog still sits *on* the dialog, and stacking is paint
  order. `layering.test.ts` holds the decision to this page, so re-opening it
  means moving the page.

The repo's own source-built `darwin-x64` binding carries a local `zIndex` patch
(`apps/playground/patches/gpuix-zindex.patch`) so a probe can measure occlusion.
It is not the published API and library code never writes against it;
`docs/gpuix-capabilities.md` records both the absence and the patch.

`packages/tokens/src/layering.test.ts` holds this page to the model: the five
layers in order, the topmost-layer dismissal rule, the scrim/elevation
distinction, the inventory rows each layer names, and the package shipping no
numeric stacking token.

## Borders, icons and identity marks

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
| `avatarSize.md` | 32 (default) |
| `avatarSize.lg` | 40 |
| `targetSize.minimum` | 24 |
| `targetSize.comfortable` | 44 |

Icons and avatars are separate scales. `iconSize` is a theme group, so a brand
can change a step with `extendTheme(theme, { iconSize: { md: 18 } })`.
`avatarSize` is fixed: its four steps are the contract between a component's
`size` prop and the layouts an avatar sits in, and an identity mark is content
rather than chrome. Neither follows density — a control's height changes with
the workspace preset, an identity mark does not. A circle's diameter is the
element's short side, so an avatar pairs `avatarSize[step]` with `radius.full`.

### Target sizes

A control may draw smaller than the area a pointer has to hit. A checkbox paints
at `iconSize.md` (16px), a switch thumb at the same step, a tree chevron at
`iconSize.xs` (12px): the drawing is the look, not the target.
`targetSize.minimum` is 24px — WCAG 2.2 SC 2.5.8, level AA — and
`targetSize.comfortable` is 44px, the AAA floor WCAG 2.1 SC 2.5.5 gives a
touch-first surface. Both are fixed, not a `Theme` group: a floor a brand could
lower would stop being a conformance claim.

Keep the drawing and reserve the difference as padding:

```tsx
import { iconSize, targetInset } from "@gpuixui/tokens";

const checkboxInset = targetInset(iconSize.md); // 4
// 16px box + 4px each side = a 24px square the pointer can hit
```

`targetInset` rounds up, so an odd drawing (13px) reserves 6 and the target is
25px rather than 23px. Two neighbours at that inset have 24px target circles
that touch but never overlap — the spacing alternative in SC 2.5.8. A control
that already reaches the floor gets `0` and needs no wrapper, which is every
control built at `controlHeight`: the shortest shipped control is `compact`
`sm` at exactly 24px, and `target.test.ts` holds every preset and size to the
floor. That is a claim about a theme, not only about the built-in presets:
`invalidNumbers` holds a brand's `controlHeight` to `targetSize.minimum`, so a
theme that shrinks one below it fails the audit rather than shipping a target no
pointer can reliably hit. The inset is for the icon-sized parts — selection
boxes, chevrons, close buttons, status dots — and it belongs on the element that
receives the press. A
transparent wrapper only becomes a target when it opts in: the runtime passes a
press through an element that paints no fill, so the wrapper sets
`pointerEvents: "auto"` and a component adopting the rule measures the hit box
in a window probe. Component adoption is recorded in `TODO.md` → Interlocks.

## Focus

The library ships **two** rings, because the runtime paints two focus paths and
they do not look the same.

`keyboardFocusRing(theme)` is an **outline** in the runtime's `focusVisible`
state: "while focused after keyboard input (Tab), like CSS `:focus-visible`". It
is a line outside the border box, so it takes no layout space, and a mouse press
never shows it. Apply it **at rest** — the runtime decides when to paint it, so a
control never tracks focus to draw a ring.

```tsx
import { keyboardFocusRing, type Theme } from "@gpuixui/tokens";

const fieldStyle = (theme: Theme) => ({
  ...keyboardFocusRing(theme),
  backgroundColor: theme.colors.input,
});

// fieldStyle(theme)
// {
//   focusVisible: { outlineWidth: 2, outlineColor: theme.colors.ring,
//                   outlineOffset: 0 }
// }
```

`focusRing(theme)` is the **unconditional** ring: a zero-offset, zero-blur
shadow spread by `borderWidth.strong`. It stays for the one path the keyboard
ring cannot cover. A dialog or menu opened by a **mouse** focuses its content
programmatically before any keyboard input has reached the window, and
`focusVisible` does not paint there; such an overlay paints this shadow while it
holds focus.

```tsx
import { focusRing, type Theme } from "@gpuixui/tokens";

const overlayContentStyle = (theme: Theme, focused: boolean) =>
  focused ? focusRing(theme) : undefined;

// overlayContentStyle(theme, true)
// {
//   boxShadow: { offsetX: 0, offsetY: 0, blurRadius: 0,
//                spreadRadius: 2, color: theme.colors.ring }
// }
```

`controlFocusRing(theme, { disabled, invalid })` is the ring a **control**
declares, because a control's own state changes what it may paint. While the
control can act it is exactly `keyboardFocusRing`. A **failed validation**
recolours the outline to the `destructive` role — the same role the field's edge
and its message paint, held to the boundary floor on the strips a control sits on
— and leaves the width and the offset alone, so an invalid field's focus line and
its border say the same thing. A **disabled** control declares **no ring at
all**: the runtime does not move the focus off an element that becomes disabled,
so a declaration made anyway would stay painted on a control that refuses every
key. The absence is `undefined`, like `elevationShadow` for the reserved level,
so a spread paints the control's fill and nothing else.

```tsx
import { controlFocusRing, type Theme } from "@gpuixui/tokens";

const controlStyle = (
  theme: Theme,
  state: { disabled?: boolean; invalid?: boolean },
) => ({
  ...controlFocusRing(theme, state),
  backgroundColor: theme.colors.input,
});
```

Both component packages' ring seams
(`packages/primitives/src/core/focus.ts`, `packages/components/src/internal/theme.ts`)
**delegate** to this helper: each one calls `controlFocusRing` and turns the
absent ring into `{}`, so no component branches on a control's state and the
rule has a single home.

Both rings were measured in a real window on `@gpuix/native@0.11.0` (the
playground's `focus-visible` live probe): Tab paints the outline and dims the
other focusables; a mouse press paints neither; a programmatic focus after a Tab
has been delivered paints the outline. That is why the package keeps the shadow
instead of replacing it outright. Neither ring changes an element's size or
position.

A runnable example lives in
[`src/focus-ring.example.ts`](../packages/tokens/src/focus-ring.example.ts).

## Text selection

`selection` is the translucent wash the runtime paints behind a run the reader
selected: GPUix's `selectionColor` style property washes a subtree, and the text
inside it keeps the role it already had. A translucent colour has no ratio of its
own — `contrastRatio` refuses it — so the wash is measured **after** it is
composited over the surface it sits on.

`selectionPairs` names the surfaces text is selected from: the five content
surfaces body text is read on — a field's value, prose on the page, a card, a
popover and a message bubble's `muted` fill — and the three prose surfaces again
for the secondary `mutedForeground` line beside it (a caption, a table's second
line, a log row). Each pair keeps the text role that surface already carries.
`selectionFailures(theme, floors?)` measures two things per pair:

| Contract | Floor | What it catches |
| -------- | ----- | --------------- |
| the wash is visible against its surface | 1.05:1 | a selection the reader cannot find |
| the selected body text reads on the wash | body, 7:1 | a wash that hides the text it selects |
| the selected secondary text reads on the wash | secondary, 4.5:1 | a wash that buries the line under the heading |

The visibility floor is `decorativeFloor`, the perceptibility floor the dividers,
skeleton fills and veil are held to — a selection that matches what it covers is
not a selection. The legibility floors are the ones the unselected pair already
meets, of the theme's own contrast variant, so a high-contrast brand is measured
at AAA without naming a floor set. Each failure carries its `kind` (`visibility`
or `legibility`), the pair, the composited `wash` and the measured `ratio`; a
surface that cannot be composited is reported with `ratio: undefined` rather
than skipped.

```ts
import { auditTheme, extendTheme, lightTheme } from "@gpuixui/tokens";

const brand = extendTheme(lightTheme, { colors: { selection: "#6A45F03D" } });

brand.colors.selection; // the wash a component hands to `selectionColor`
auditTheme(brand).selection; // [] — visible, and the text inside it readable
```

**It found three shipped styles.** Before the contract existed, Linux dark,
Windows dark and Windows XP Luna dark painted a 30% accent wash over cards
lighter than the base theme's, which left body text at 6.63:1, 6.33:1 and
6.80:1 against the 7:1 floor. All three carry the base dark theme's 24% share
now. A brand that wants a stronger wash should deepen its hue or its surface
rather than raise the share: the contract measures the composite, and 30% of a
mid accent over a light card is exactly what put those three under the floor.

**It found one more on the bubble.** The fifth content surface is `muted` — the
fill a user message bubble is painted on (`MESSAGE_BUBBLES.user` is `bg-muted`)
— and a selectable `Text` inside it hands the runtime the same wash over that
fill. Aero dark still carried a 30% share, which left the bubble's body text at
6.74:1, so it takes the 24% its siblings use; the tightest placement over a
bubble is Windows XP (Luna) dark at 7.20:1. The bubble paints no author line of
its own, so the muted surface is measured for the body role alone.

**It then found the palette had no headroom.** Measuring secondary text under
the same wash left `mutedForeground` at 4.25–4.44:1 on the light platform themes
and 3.27–4.13:1 on the dark ones, against the 4.5:1 floor the unselected pair
meets: the grey ramp's 600 and 400 steps sit at that edge, so any visible wash
had to bury them. The wash is not the defect — a secondary role with no room
above its floor can only survive a selection by making the selection invisible.
The light sets' secondary text is a step darker (`#4B5362`) and the dark sets' a
step lighter (`#C1C7D1`), the two authored looks follow with their own tint
(`#4F5550`, `#B4C6DD`, `#BCCEDF`), and the high-contrast dark wash carries a 26%
share instead of 30% so its 7:1 secondary text clears the composite. No other
wash strength changed.

**The two saturated tones are not selection surfaces.** A `Box` paints `accent`
and `selected` as well, and a selectable run inside either one is washed over
that fill — but both tones are drawn from the same accent family as the wash, so
a selection moves the fill *toward* the text instead of away from it. Measured
across the sixteen shipped, high-contrast, platform and authored styles, the
wash costs contrast in **every one of the 80 placements** on those two tones (it
never once helps) and leaves **39 of the 80 under the floor the unwashed pair
already met** — the selected row's title, now held to the body floor on the same
role, accounts for the increase. The tightest is Windows XP (Luna) light's secondary
line on a selected row at **3.68:1** against 4.5, with the tightest body
placement the base dark theme's selected row title at **5.11:1** against 7. No
share can serve both jobs: one strong enough to be seen
on the page is exactly what erases text on a saturated fill, and one weak enough
to keep that text readable is invisible on the page. So a selectable run belongs
on a content tone, a state row that needs selectable text paints it on one, and
`selectionPairs` stays the content tones. The exclusion is measured, not assumed
— `selection.test.ts` reads the tones the primitives resolve, so a tone added to
the box's list fails until the wash is measured on it or it is recorded on this
page with its reason.

**Adoption.** The role reaches a window through the runtime's `selectionColor`
property, which inherits down a subtree. Setting it on selectable text and
fields is the component packages' work, recorded in `TODO.md` → Interlocks; the
runtime's own default is the theme accent at 35%, which is not this role.

**Not measured, deliberately:** a field's `placeholder`. It is painted only
while the field is empty, so there is no run for a reader to select.

## Theme API

```ts
const themeModes = ["light", "dark"] as const;
type ThemeMode = (typeof themeModes)[number];

interface Theme {
  name: string;
  mode: ThemeMode;
  contrast?: ThemeContrast; // "default" | "high"; absent on a hand-built theme
  colors: ThemeColors;
  typography: Typography;
  spacing: Spacing;
  radius: Radius;
  density: Density;
  elevation: Elevation;
  borderWidth: BorderWidth;
  iconSize: IconSize;
}
```

`lightTheme`, `darkTheme`, `themes` and `getTheme(mode)` are the built-ins.
`Theme.contrast` records which contrast variant a theme carries, so a caller can
branch on it — `platformTheme` uses it to keep a high-contrast theme's colours.
Each mode also has a high-contrast variant (`highContrastLightTheme`,
`highContrastDarkTheme`, `highContrastThemes`) reachable through
`getTheme(mode, "high")`. `createTheme(config)` starts from the built-in theme of
`config.mode` and `config.contrast` (default contrast when it is not named), so
`createTheme({ mode: "dark", contrast: "high" })` is the high-contrast dark
theme; `extendTheme(base, overrides)` derives from any theme, including a
high-contrast one.

```ts
import { createTheme, extendTheme, darkTheme } from "@gpuixui/tokens";

// The on-colour is per mode, and the primary is also the mark a progress fill
// or spinner dot paints: the dark brand takes a light violet with a near-black
// label so it can be found on the card, the light brand the saturated violet
// with a white label.
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

export const scoped = extendTheme(darkTheme, {
  // `bodyStrong` is `body`'s emphasis at the same size, and the role merge is
  // per role, so the pair moves together.
  typography: { body: { fontSize: 15 }, bodyStrong: { fontSize: 15 } },
});
```

A brand that overrides a fill should override its on-colour as well. The dark
theme pairs a light fill with dark text, so a saturated violet with the base's
`primaryForeground` reaches only 4.24:1 — below the floor. `invalidColorRoles`
and `contrastFailures` (below) are how that is caught before it ships.

Merge rules:

- groups are partial: omitted values inherit from the base;
- a group key written as `undefined` — an optional value a caller passed through
  unchanged — inherits too, so it cannot erase a role the group must carry;
- colour, spacing, radius, border width and icon overrides merge key by key;
- typography text roles merge field by field, so `body.fontSize` keeps the base
  leading and weight; `bodyStrong` is its own role, so a brand that changes the
  body size names it too — the pair is one emphasis at one size, and
  `invalidNumbers` reports a strong role that does not follow as `emphasis`;
- elevation levels **replace** the whole shadow array;
- `density` accepts a preset name or `DensityOverrides`; a partial override keeps
  the base preset name and merges `controlHeight` and `controlPaddingX` size by
  size, so raising one size inherits the rest rather than dropping the steps the
  audit gate requires;
- `mode` is not overridable — `extendTheme` keeps the base mode;
- nothing is mutated. The returned theme may share untouched token objects. The
  contract is no mutation, not deep cloning.

No runtime schema: themes authored in TypeScript are trusted at compile time.
A theme loaded from a file or URL is unknown input and must be decoded by the
application that owns that boundary.

### Persisted choices

Seven unions are choices a consumer stores — a settings row, a URL parameter, a
saved workspace. Each has an **ordered index** and a guard that takes `unknown`,
so a restored value neither needs the union retyped nor a cast:

| Axis | Index | Guard |
| ---- | ----- | ----- |
| theme mode | `themeModes` | `isThemeMode` |
| contrast variant | `themeContrasts` | `isThemeContrast` |
| platform | `platformNames` | `isPlatformName` |
| authored look | `retroNames` | `isRetroName` |
| density preset | `densityNames` | `isDensityName` |
| control size | `controlSizes` | `isControlSize` |
| status tone | `statusTones` | `isStatusTone` |

The unions derive from the indexes, so adding a mode, platform or tone is one
edit at the owner and every consumer loop — including this package's own tests —
covers it. The indexes are held to the data they select: every mode has both
contrast variants, every platform has a style, every look has a style, every
density preset has a metric for every control size, and every tone has its own
soft roles (`guards.test.ts`).

```ts
import { getTheme, isThemeContrast, isThemeMode } from "@gpuixui/tokens";

const themeFromStored = (stored: {
  readonly mode: unknown;
  readonly contrast: unknown;
}) =>
  getTheme(
    isThemeMode(stored.mode) ? stored.mode : "light",
    isThemeContrast(stored.contrast) ? stored.contrast : "default",
  );
```

`src/persisted-choices.example.ts` resolves all seven axes the same way, and
`guards.test.ts` runs it: a stored `dark`/`high` pair returns the AAA dark theme,
an unknown pair keeps the light one.

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

`useThemePresence()` answers a different question: whether a provider is above
the hook at all. The fallback makes the two cases indistinguishable — a provider
passing `lightTheme` and no provider both read as the light theme — so a
consumer with a fail-loud rule (a component package that refuses to paint a
default palette) reads the presence instead and accepts a token provider as
satisfying it:

```tsx
import { useTheme, useThemePresence } from "@gpuixui/tokens/react";

export function useRequiredTheme() {
  const theme = useTheme();
  if (!useThemePresence()) {
    throw new Error("wrap the tree in <ThemeProvider theme={...}>");
  }
  return theme;
}
```

## Using tokens in components

Rules:

1. Import roles, type roles and scales from `@gpuixui/tokens`.
2. Never write a literal colour, font size, radius, control height or padding.
3. Spread `textStyle` rather than repeating the family rule.
4. Use `borderStrong` for essential control boundaries and `border` for
   dividers.
5. Keyboard focus is `keyboardFocusRing(theme)`, applied at rest: a `focusVisible`
   outline spread by `borderWidth.strong`, which the runtime paints after a Tab
   and not after a click. A control whose focus is moved programmatically — a
   dialog or menu opened by a mouse — paints `focusRing(theme)`'s shadow while
   it holds focus. Neither is ever a border and neither changes layout. See
   [Focus](#focus).
6. A filled action's hover and press are `filledHover(theme, action)` and
   `filledPressed(theme, action)`; never `alpha(role, …)` on a fill, which lets
   the surface behind the control show through.
7. A chart or legend mark takes its colour from `seriesColors(theme)`; a series
   colour is categorical, so it is neither a semantic role nor a chart-local
   hex. See [Data series](#data-series).
8. A row's pointer state is `pointerWash(theme, wash, replaced)`, not the bare
   `hover` / `active` role: the step replaces the wash the row is already
   wearing, so it is derived against that one. See
   [Decorative surfaces](#decorative-surfaces).

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

The other groups are already plain data with their own keys: `typography`,
`spacing`, `radius`, `densityPresets`, `borderWidth`, `iconSize` and `palette`.
The data series is four fixed tables rather than a theme group — `lightSeries`,
`darkSeries`, `highContrastLightSeries`, `highContrastDarkSeries` — and
`seriesColors(theme)` resolves the one a preview needs, including a brand's own
`series`.

`platformStyles` builds a platform comparison table the same way, so a generated
page cannot disagree with what the library ships:

```ts
import { platformStyles, type PlatformName } from "@gpuixui/tokens";

const platforms = ["darwin", "linux", "win32"] as const;

const rows = platforms.map((platform: PlatformName) => ({
  label: platformStyles[platform].label,
  accentLight: platformStyles[platform].colors.light.primary,
  accentDark: platformStyles[platform].colors.dark.primary,
  radius: platformStyles[platform].radius.md,
  density: platformStyles[platform].density,
}));
```

## Verification

Contrast is enforced by `packages/tokens/src/color.test.ts`:

```sh
nub run --filter @gpuixui/tokens test
```

The suite runs under a two-second per-test and per-hook budget
(`packages/tokens/vitest.config.ts`), held in place by `src/suite.test.ts`: a
case that waits on a promise which never settles fails instead of holding the
gate. A synchronous infinite loop cannot be interrupted by any timeout.

The test covers every shipped colour set — light, dark and both high-contrast
variants — over every pair in `contrastPairs`, and fails if a pair drops below its
floor (7:1 for primary body pairs, soft status text and all high-contrast text;
4.5:1 for secondary and on-colour text in the default themes; 3:1 for focus and
essential boundaries in the default themes; 4.5:1 for them in the high-contrast
variants). It also fails if a soft status surface is indistinguishable from
`background` or `card` (floor 1.05:1), and if a filled action's derived hover or
press fill drops its own label below the on-colour floor. `invalidColorRoles` is
held to an empty result for every shipped set and to a reported role for a
misspelt and a named value, so the audit cannot pass a value the runtime would
ignore. Palette edits must keep all of it green.

`packages/tokens/src/contrast.test.ts` covers the contract itself: the ratio maths
(21:1 at the extremes, 1:1 for identical colours, symmetry), the refusal to
measure a translucent or unparseable colour, the two floor sets, and that a
break to the text inside an input, to secondary text on `background`, `card` or
`popover`, or to a control boundary on a `muted` or `secondary` strip is
reported by name. Its `the invalid state's edge` suite holds the edge an invalid
control paints on all six strips a control sits on — four through the mark
contract, two through `contrastPairs` — reports an edge painted in the field's
own fill, and sweeps every shipped colour set. `theme.test.ts` runs the audit over
the documented brand theme, so a documented brand that loses its on-colour fails
the suite.

`packages/tokens/src/decorative.test.ts` covers the surfaces that carry no text:
every divider, skeleton, veil, status tint, status edge, scrollbar thumb, state
wash, filled action, bar rail, disabled face and elevation placement is
measured, the edge is held to the share `statusTone` paints, the veil and the
shadow are composited rather than skipped, a surface that matches its page or
cannot be measured is reported, and every shipped, platform and authored theme
clears the 1.05:1 floor. It found two platform styles whose inherited
skeleton matched their own surfaces — macOS light on `muted` at 1.045:1, Linux
dark on `card` at 1.004:1 — which now carry a `skeleton` of their own; the
floating strip the contract later gained found three more on the fill a loading
dialog paints (`popover`) — macOS dark 1.049:1, Linux dark 1.031:1 and Windows
dark 1.039:1 — so those carry a `skeleton` too, and the tightest skeleton is the
authored Luna dark look's dialog — `skeleton` on `popover` — at 1.054:1. The
tightest of the eleven surface kinds is the base dark theme's chosen row — `accent`
on `selected` — at 1.052:1 (the Aero look's dark progress rail, `muted` on
`popover`, is a hair behind it). The state-wash half found five
aliases: the base dark theme's `hover` was its
`popover` (a hovered menu row painted nothing), the base light theme's was its
`muted` toolbar, and macOS light, Windows light and Linux dark were within one
step of the strips they tint, so those five palettes carry a wash a reader can
see. The filled-action half found the base light theme's `secondary` equal to
`muted` at 1.00:1, and macOS light, Linux light, Windows light, both dark
platform rows that sit under a lighter popover, and both dark authored looks
1.001–1.049:1 from a strip they sit on; each now carries a control face, and the
suite names the shipped alias (`secondary`/`muted` at 1.00:1) and fails when a
placement leaves the table or a face is reverted.

`packages/tokens/src/pointer-wash.test.ts` covers the wash a pointer state
paints: the three transitions — `accent` over `selected`, `active` over
`accent`, `active` over `hover` — are named and read against the painters that
wear them (the components' list row and menu row, the primitives' ghost recipe),
a palette whose own wash already answers the pointer is painted as it is, a brand
whose press *is* its hover is separated by the derivation, the labels the wash
plays keep their floors on the derived colour, a palette with nowhere to move is
reported by name, and every shipped, platform and authored style clears the
floor — the tightest being the macOS dark press at 1.052:1.

`packages/tokens/src/selection.test.ts` covers the wash behind a selected run:
`selectionPairs` names the surfaces text is selected from and keeps the text role
each one already carries — the five body roles, `inputForeground` on `input`,
`foreground` on `background`, `cardForeground` on `card`, `popoverForeground` on
`popover`, `foreground` on `muted`, plus `mutedForeground` on `background`, a
card and a popover — `selectionFailures` composites the role over each surface,
and a theme passes only when the wash is visible against what it covers
(1.05:1) and the text inside it keeps the floor its unselected pair meets (body
7:1, secondary 4.5:1). It reports the pre-fix Linux dark wash at 6.63:1 and the
pre-fix secondary value on macOS light at 4.30:1 by name, a brand whose wash is
its own text colour, a transparent wash and a surface it cannot composite, and
all 16 shipped, platform and authored themes clear every contract.

`packages/tokens/src/series.test.ts` covers the categorical scale: every
shipped, platform and authored theme holds every swatch to its variant's
boundary floor on the four plot surfaces, every pair to 0.06 in OKLab, and
every pair to 0.05 again after protanopia, deuteranopia and tritanopia are
simulated. It reports the red/green pair a deuteranope sees 0.024 apart, a
swatch that is the card it is drawn on, a repeated pair and a translucent
swatch, names the tightest placement over every shipped style (Aero light's series 4 at
3.05:1 on its `muted` strip), and it executes the example's legend and reported
lines.

`packages/tokens/src/indicator.test.ts` covers the marks a component paints: the
eight roles on the nine surfaces — `background`, `card`, `popover` and `muted` at
rest, the four washes a row wears (`hover`, `active`, `accent`, `selected`) and a
field's own `input` fill — are held to the theme's non-text floor in all 16
shipped, platform and authored themes, the tightest placement is named (macOS
dark's `primary` on `accent`, the wash a list row tints under its own pointer, at
3.06:1), the solid `warning` role is measured as 1.78:1 on the page so the
reason a status mark paints the tone's readable role is a measurement rather
than an opinion, a translucent mark and a caller's stricter floor are reported,
and each status tone must have a mark role.

`packages/tokens/src/elevation.test.ts` covers the shadow scale: one shadow per
level with exactly the runtime's five fields, the role's hue and strength per
level and per shipped theme, a brand's retint reaching every inherited level while
an explicit one survives, and the colour an explicit level carries —
`invalidShadowColors` names the level, position and value, so a shadow the
runtime would silently not paint is reported instead of shipped.

`packages/tokens/src/numbers.test.ts` covers the numbers a theme carries: every
shipped, high-contrast, platform and authored theme reports nothing, each of the
seven groups is proven by a deliberately broken value — a non-finite spacing
step, radius, border width, icon size, type size or leading, density metric and
shadow entry — and the rule's precision is proven both ways: a zero radius and
border pass, a negative shadow offset and spread pass, a negative radius fails. A
shadow's second entry is reported rather than hidden behind its first, and the
audit fails a brand whose radius is `NaN` while every colour report stays empty.

`packages/tokens/src/platforms.test.ts` covers the platform table: every platform
has a label, both families, a density preset and a full radius scale; `sans` is
the GPUI sentinel; no family is a comma stack; `platformTheme` repaints, re-shapes
and re-types a styled platform without mutating its base, picks the chrome for the
base's mode, keeps a high-contrast theme's colours, and leaves `default` as the
library identity. All six platform themes are held to every pair in
`contrastPairs`. Editing one is covered through `platforms.example.ts`:
`extendTheme` over a resolved platform keeps the platform's other values, density
layers on top, a role a platform omits falls back to the base theme, and the
edited theme passes the audit in both modes.

`packages/tokens/src/styles.test.ts` covers the derived action fills: both are
opaque hex, each channel moves from the action's role toward the theme's
foreground, the press moves further than the hover and stops short of the
foreground, the three actions stay distinct, and a brand's own `primary` carries
its own hover.

`packages/tokens/src/brand-text.test.ts` covers the brand as **text**: every
shipped, high-contrast, platform and authored theme is held to its own variant's
text floor on all eight surfaces a link can sit on, the fill role is measured below
that floor on the pressed wash (4.30:1 in the base light theme, 3.10:1 in macOS
dark) so the derivation has a premise, a brand that already reads is returned
unchanged while the base light one moves, a high-contrast theme is held to 7:1
rather than 4.5:1, the result is opaque and stays between the brand and the
theme's foreground channel by channel, a pale brand follows its own override, an
unmeasurable brand is returned unchanged instead of replaced, the derivation
stops at the theme's own foreground when even that misses the floor, and the
documented example's three link states are executed.

`packages/tokens/src/retro.test.ts` covers the authored looks: `retroStyles`
describes exactly `retroNames`, the guard rejects a renamed or misspelt look, each
look keeps the sentinel UI face, one mono family, a full radius scale and a
density preset, and `retroTheme` repaints, re-shapes and re-types without mutating
its base — the elevation keeps the base geometry in the look's own `shadow` tint.
A role a look does not author inherits, each look paints a background, primary
and radius of its own (different from the other look and from the Windows
platform style), both dark editions are a real second palette, a high-contrast
base keeps its colours, and all four themes clear every `contrastPairs` pair,
every decorative placement and both selection floors. `resolveRetroBrand` is
executed and held to the audit, and the provenance prose, the catalogue table and
the inventory row are held to the table the package ships.

`packages/tokens/src/catalogue-values.test.ts` holds **the values the catalogue
and the README print** to the package, so a document cannot teach a theme the
library no longer ships: both colour tables and the high-contrast pair, every
palette ramp step, the platform chrome table (a cell reading `base` must be a
role that style inherits, and a repainted role must print that style's value),
each platform's and authored look's families, radius and density in both
documents, the value an inline README comment quotes, every type role's size,
leading and weight, the spacing, radius, border, icon and avatar scales, each
density preset, each elevation level's one shadow, and each status tone's roles.
The printed row set is compared with the exports too, so a token that is added
or dropped is named rather than passing silently.

## Limitations and future work

- No CSS variables or CSS pipeline; GPUix paints inline values.
- The paint grammar is CSS Color 4 (the runtime's `csscolorparser`) while this
  package's measurements resolve the part of it whose channels are sRGB
  arithmetic: hex in every painted length, the CSS named colours, and
  `rgb`/`hsl`/`hwb`/`hsv` with an optional alpha channel. A brand written that
  way is measured rather than reported unmeasurable. A **perceptual** space
  (`lab`, `lch`, `oklab`, `oklch`), a relative colour (`rgb(from …)`) and a
  channel expression (`calc`, `none`) paint and pass the paint check, but their
  contrast, selection and decorative pairs are reported unmeasurable rather than
  guessed — the conversion a ratio would need is not approximated here. Hex is
  measured in every length the renderer paints — shorthand `#fff` widens, with or
  without the `#`, and an `FF` alpha byte is the opaque colour it is rather than a
  share — and the shipped palettes are written in the long form the catalogue
  prints. `alphaOf` / `blend` derive from the same dialect, so a shadow colour
  written as a name or a measured function is retinted at its own share.
- No `zIndex` in the published API, so there is no numeric stacking token: paint
  order is tree order and the mounting rules are §Layering. The repo's
  source-built binding carries a local `zIndex` patch for a probe; library code
  never writes against it.
- No responsive breakpoints: the runtime has no media queries, so a layout
  responds to window size in the application, not through a token.
- No `letterSpacing` in the runtime.
- No OS appearance detection; the application selects the mode and contrast, and
  also which platform style to render.
- The platform radii and densities follow each platform's own guidelines (macOS
  28px controls, Windows 32, GNOME 36) and are measured as painted by the
  playground's `theme-platform` probe; whether they suit a specific window is
  still the consumer's call, and a window that differs layers `extendTheme` on
  the resolved theme.
- A high-contrast theme takes a platform style's families, radii and density but
  not its palette, because no platform palette is designed for the AAA floors.
  A consumer who wants both starts from `platformStyles` and checks the result
  with `contrastRatio`.
- The authored looks are styles, not platform names: the docs platform toggle
  offers the four operating systems, so a site that wants to preview Luna or Aero
  resolves `retroTheme` itself. Their dark editions are invented — neither era
  shipped one — and their UI face is still the sentinel, so the era's monospace
  family falls back where the machine lacks it.
- `.SystemUIFont` is a name GPUI documents, and the theme asserts it as the UI
  family on every platform; what face the runtime resolves it to is not measured
  anywhere. The playground's `theme-platform` proves the platform **mono**
  families reach the renderer (`Menlo`, `DejaVu Sans Mono`, `Consolas`) from the
  style report, which is the paint proof the table has.
- Fonts must be registered before the first layout that names them: a family the
  runtime learns about later paints the fallback until the next layout, which
  re-lays the text out against it (measured: 44px → 81px). The guideline stays
  "create the renderer, register, then render" because that first frame is the
  one the reader sees — the fallback is not permanent.
- The native text host's **syntax palette is this package's** — `syntaxColors`
  fills the host theme's `syntax` field with one colour per token type — but the
  **numbers** around the code stay the runtime's: a code block's gutter width and
  padding, a diff's paddings and accent bar, and a document's table column minima
  have no token, so tuning them is still a runtime change. A `<markdown>` host's
  inline code is prose in a chip rather than a second palette (`codeText` on
  `codeWash`), and the tokenization is the consumer's — `@tanstack/highlight` in
  the components' code block — while this package chooses the colours, not which
  run is a keyword.
- `@gpuix/native@0.11.0`'s `focusVisible` outline is measured for Tab input and
  for a programmatic focus **after** a Tab, but not for a programmatic focus
  before any key. A mouse-opened dialog or menu therefore keeps `focusRing`'s
  shadow — that is the one path the shadow is for. Every shipped control
  declares `keyboardFocusRing` at rest, through
  `packages/primitives/src/core/focus.ts` and
  `packages/components/src/internal/theme.ts`, and the playground's theme
  gallery paints `focusRing` only to measure the shadow.
- Motion — durations, easings, springs, inertia — lives in `@gpuixui/motion`,
  not here: a second copy would duplicate the package that owns reduced-motion
  policy. The components package composes it through `internal/presence.tsx`,
  the one seam that resolves a level and the reduced preference for a surface's
  entry and exit (`useSurfaceTiming`), and the animated components — splitting
  text, image zoom, rolling text — read the same levels for their own tweens
  (`@gpuixui/motion/timing`). The timing is measured in
  `packages/motion/src/timing.test.ts` and
  `packages/components/src/behaviour/presence.test.tsx`.
- The derived fills are adopted by both packages' buttons.
  `packages/primitives`' recipes ask their own registry for
  `hover:fill-<action>` and `active:fill-<action>-pressed`
  (`packages/primitives/src/recipe/index.ts`); a filled checkbox or radio paints
  the same two helpers (`packages/primitives/src/core/selection.ts`), so its mark
  sits on an opaque fill; a pressed `Toggle` takes them for its `accent` face
  (`packages/primitives/src/core/variants.ts`); and the components package's
  `Button` derives all three actions, its `secondary` variant included
  (`packages/components/src/internal/button.tsx`). That variant swapped the fill
  for the `hover` / `active` role washes until the contract measured **15 of its
  32 pointer placements** under the 1.05:1 floor — hovered 1.000:1 in High
  contrast light, High contrast dark and Light · macOS, pressed 1.000:1 in
  Dark · Windows — because a wash is often the fill it replaces. It derives
  `filledHover`/`filledPressed` from its own fill now and clears the floor in
  all 16 styles.
  The `@gpuixui/tw` `button` recipe the components package compiles against still
  lifts the fill's alpha (`hover:bg-primary/90` in `packages/tw/src/recipes.ts`) —
  the other owning package's half.
- A field's **resting edge** is the decorative `border` role rather than the
  functional `borderStrong` one: `fieldVariant`
  (`packages/primitives/src/core/variants.ts`) and `FieldInput`
  (`packages/components/src/field.tsx`) both rest there and reach
  `borderStrong` only on hover, so a resting field inside a card is an edge at
  1.26:1. The tokens ship and measure the boundary (`borderStrong` on `input`
  and on the four strips a field sits on); adopting it is the primitives and
  components workstreams', recorded in `TODO.md` → Interlocks.
- `avatarSize` is a fixed scale, not a theme group. Adding a group to `Theme` is a
  breaking change for a hand-built theme literal, so a brand-specific diameter
  stays a component decision for now.
- The selection wash is measured on the content tones; a run marked `selectable`
  inside an `accent` or `selected` box is outside the contract, because one
  translucent role cannot be both strong enough for the page and weak enough for
  a saturated fill (measured: 39 of the 80 placements there miss their floor).
  A selectable run belongs on a content tone.
- No font family is bundled: `registerFonts` is consumer-only, so there is no
  redistribution licence to review yet. Shipping one needs the same review
  `LICENSES/` gives every other asset.
- Native visual proof is the playground's theme gallery, not this document. See
  `TODO.md`.

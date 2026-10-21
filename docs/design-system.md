# Design system

The reasoning behind GPUIXUI's appearance, states and theming. For the complete
token list and API, read [`tokens.md`](./tokens.md).

The system is original. GPUI Kit, shadcn/ui and PanelUI are structural and
architectural references; no palette, type scale or component styling is copied
from them.

## 1. Purpose

GPUIXUI renders natively through GPUix. There is no CSS cascade, no stylesheet,
and no inherited text colour: every surface and every `<text>` receives explicit
values. That constraint shapes the whole system:

- tokens are **plain values** consumed by inline styles, not CSS variables;
- theme switching is a **re-render** with a different `Theme` object;
- a component cannot rely on an ambient foreground colour;
- a missing colour is a visible bug (GPUI paints text black), so roles must be
  explicit at every text node.

The design system exists to make those explicit values consistent, reviewable
and replaceable in one place.

## 2. Identity

**Graphite and iris.** A cool graphite canvas keeps a desktop app calm for long
sessions; iris supplies a single confident accent for primary actions, focus and
selection. Status colours are reserved for status — they never decorate. The
result should read as a professional native tool, not a web dashboard.

Density is desktop, not marketing: 14px body text, 13px labels, 32px default
controls. The canvas is near-white rather than pure white in light mode and
near-black rather than pure black in dark mode, so raised surfaces remain
distinguishable without heavy borders.

## 3. Semantic roles, not shades

Three tiers, strictly ordered:

```
palette (raw ramps)  →  semantic roles  →  component composition
   neutral/iris/…        background,        button, card, table,
   not for components    mutedForeground…    panel, …
```

- **Palette** is documentation and an escape hatch. A component importing
  `palette` is a defect.
- **Semantic roles** name intent: `background`, `card`, `mutedForeground`,
  `borderStrong`, `ring`.
- **Components** compose roles with the spacing, radius, density and typography
  scales. They do not mint a fourth tier of component tokens. If a component
  needs a value with no semantic home, the role set is incomplete — add a role,
  do not add a `buttonBackgroundHover` token.

The four status families — `info`, `success`, `warning`, `destructive` — each
carry a solid role with a readable foreground and a soft pair (`xSoft`,
`xSoftForeground`) for alerts, badges and toasts. `info` has its own blue ramp,
so an informational message can never be mistaken for a primary action. A
component names a status family and reads its roles; it never mixes a readable
text colour out of a solid status colour at runtime, and never special-cases a
mode to make a tint readable.

A chart breaks that rule on purpose: a series colour means "a different
category", not "this is a warning", so data marks are the one place a component
does not name a semantic role. They read the categorical scale instead —
`seriesColors(theme)` returns five colours for the theme's mode and contrast
variant, every one perceivable on the three plot surfaces (`seriesSurfaces`),
every pair separated by an OKLab distance (`seriesDistinctnessFloor`), and every
pair still separated once protanopia, deuteranopia and tritanopia are simulated
(`seriesDeficiencyFloor`). A chart never hard-codes a hex; a brand that wants its
own categories carries `series`. See `docs/tokens.md` §Data series.

This keeps a brand theme small: overriding `primary` changes every primary
action in the library.

## 4. Light and dark

Dark mode is designed, not inverted:

| Concern | Light | Dark |
| ------- | ----- | ---- |
| canvas | `#F6F8FA` | `#11141A` |
| raised surface | `#FFFFFF` | `#191D25` |
| floating surface | `#FFFFFF` | `#222730` |
| primary | dark iris `#5F4BDB`, white text | light iris `#A7A9FF`, near-black text |
| destructive | `#CC3439`, white text | `#FF6B6B`, near-black red text |
| shadow | graphite at low alpha | black at high alpha |

Both themes expose exactly the same 47 roles; the type system and the colour
test enforce it. On-colour text switches with the surface — primary text is not
always white. Warning is amber in both modes with near-black text because white
on amber cannot reach 4.5:1.

Each mode also has a **high-contrast variant** that raises secondary and
on-colour text to 7:1 and focus rings and essential boundaries to 4.5:1, using
pure black and white canvases. It is a value variant of the same roles, so no
component changes; see §9 and §11.

There is no automatic OS appearance detection: GPUix exposes no appearance
query. The application chooses `lightTheme` or `darkTheme` and passes the
result.

## 5. Typography

Ten roles, one job each:

- `display` / `h1` / `h2` / `h3` — hierarchy; semibold, generous leading.
- `body` / `bodyStrong` — reading and emphasis at 14/20.
- `label` — controls and form labels at 13/18, medium weight.
- `caption` — metadata and helper text at 12/16.
- `code` / `codeBlock` — mono at 13/20 and 12/18.

Why 14px body: it is the smallest size that stays comfortable in long desktop
sessions while leaving more room for data density than a 16px web default.
Labels are one step smaller because controls are scanned, not read.

Sans is GPUI's `.SystemUIFont` sentinel, which GPUI resolves to the operating
system's own UI font, so the reading face follows the platform without the
library naming a face the machine may not have. Mono comes from the platform
table (`platformStyles`): `Menlo` on macOS, `DejaVu Sans Mono` on Linux,
`Consolas` on Windows, `Menlo` for a platform the library does not know. The type
scale is shared by both themes and is not changed by density.

A platform style is a **real theme**, not a docs-only style sheet:
`platformTheme(theme, platform)` derives one with `extendTheme` — that platform's
families, corner radii, control density and chrome colours over the base's mode
and elevation. The docs platform toggle previews exactly what a native build
renders, because both read the same `platformStyles` table: a macOS window is
cooler and tighter than a Windows one, and a Linux one sits on warmer greys at a
larger control size. A platform style never replaces the identity — `default` is
the library's own look, and the three platform variants are edits of it.

That is measured rather than asserted: `theme-platform` paints one row per
platform through `platformTheme` and reads the family, `primary` fill, `lg`
radius and `md` control height back from the runtime (28 / 36 / 32px), with the
base radius as its negative control (`expected 10, got 8`).

**A look is not a platform.** The four platform names are the operating systems a
window runs on, and the persisted choice the docs toggle offers; a look is a
`PlatformStyle` applied by name, and the package ships two more of them —
Windows XP's Luna and Windows 7's Aero — in `retroStyles`, resolved with
`retroTheme`. Both read the same way a platform style does: the era is carried
by colour, radius and density, while `sans` stays the sentinel and the mono
family is the era's own. Neither era had a dark mode, so both dark editions are
authored for this library (invented, not reconstructed), and all four themes run
`contrastFailures` and `decorativeFailures` in `retro.test.ts` like every other
shipped theme. `applyStyle(base, style)` is the single merge rule behind both,
so a brand can author a third look as data rather than forking a component or
adding a platform name.

A high-contrast theme is the one combination that keeps its own palette: it takes
the families, radii and density but no platform colour, because accessibility
outranks the platform look. Each platform style declares the `contrast` variant
its palette is designed for, and `platformTheme` applies a palette only where
that matches the base's, so the rule is a declaration rather than a special case
for `"high"`. `Theme.contrast` records which variant a theme carries, so a
consumer can branch on it. Every platform palette is measured on the same
contrast floors as the built-in themes, so "looks native" never means "reads
worse".

**Limitation.** GPUix has no `letterSpacing`. Tight display tracking and
all-caps label tracking are therefore impossible without per-glyph layout. The
system does not pretend to offer them.

## 6. Spacing and density

Spacing is a 4px-derived scale: 2, 4, 6, 8, 12, 16, 24, 32, 48, 64. The small
steps (2, 6) exist because optical spacing around text and borders is not always
a multiple of four.

Density is a **theme** property, not a component prop:

- `compact` — 24/28/32 controls, 28px rows. Dense workspaces, data grids.
- `comfortable` — 28/32/36 controls, 32px rows. Default.
- `spacious` — 32/36/40 controls, 36px rows. Touch-leaning and presentation.

The default is `comfortable`; a platform style carries the preset its native
windows use — macOS `compact`, Windows `comfortable`, GNOME `spacious`. Radius
scales follow the same rule: macOS 4/6/10/14, Linux 4/6/9/12, Windows 2/4/8/8,
against the default 4/6/8/12.

It changes control height, horizontal padding and row height only. Type sizes
and the spacing scale stay fixed, so a density switch cannot reflow text
unexpectedly. Components read `controlHeight(theme, size)` and
`controlPaddingX(theme, size)` instead of hardcoding numbers.

The shortest of those controls — `compact` `sm` at 24px — is also the
pressable-target floor, so a control built at a control height never needs
extra hit-area padding. An icon-sized part does; §9 has the rule.

## 7. Radii, borders and elevation

Radii: 0, 4, 6, 8, 12, full. Small controls use 4 or 6; cards 8; dialogs 12.
Pills and avatars use `full` (clamped by the renderer to half the short side).
Identity marks use their own diameter scale — 20, 26, 32, 40 — with 32 as the
default. It is fixed rather than theme-driven, and never follows density: a
circle is content, not a control.

Two border roles:

- `border` is decorative — dividers and card edges. It is intentionally subtle.
- `borderStrong` is functional — input and control boundaries. It meets 3:1
  against every surface a control can sit on — the canvas, a card, a field, a
  toolbar strip and a secondary fill — so a control is perceivable without
  relying on fill alone.

Elevation is a semantic level, not a literal shadow: `sm` for resting cards,
`md` for menus and popovers, `lg` for dialogs and the command palette. A level is
designed as **one** shadow, read with `elevationShadow(theme, level)`; the
runtime also accepts a shadow list, but the scale does not use one, so a level
cannot render half of itself. Each level paints the `shadow` role at its designed
strength — 8%, 12% and 16% over a pale canvas, 40%, 65% and 80% over a dark one —
so retinting that one role retints every shadow a theme inherits. The high-contrast
themes carry the same geometry in their own role's tint.
Overlay layering is paint order, not a shadow or a weight: the runtime has no
`zIndex`, so a surface paints above the page by being mounted after it, and the
`overlay` scrim role is what recedes the content behind a modal. §Layering in
`docs/tokens.md` is the model — the five mount layers, the topmost-layer
dismissal stack, and why `elevation.overlay` stays a reserved, empty level. Dark
shadows are stronger because contrast between surfaces is lower. A shadow is not
measured by the contrast contract: it is a blurred geometry whose visible
contribution depends on its offset and blur, so a flat composite would overstate
it. It is held instead to one shadow per level, tinted by the `shadow` role (see
§9 for the surfaces that *are* measured).

## 8. Interaction states

| State | Role / mechanism |
| ----- | ---------------- |
| hover | `hover` wash on ghost and subtle surfaces; a filled action moves to `filledHover(theme, action)` |
| pressed | `active` wash; a filled action moves to `filledPressed(theme, action)` |
| selected | `selected` + `selectedForeground` |
| disabled | `disabled` + `disabledForeground`, plus a non-colour cue where possible; held to `contrastFloors.disabled` so the state stays visible rather than to a readability floor |
| loading | a mark — `primary`, or a status tone's readable role — never the disabled fade: a busy control keeps its label, its tab stop and its announcement |
| focus | `keyboardFocusRing(theme)` — an `outline` in the runtime's `focusVisible` state, painted only after keyboard input; `focusRing(theme)` — the unconditional shadow for a programmatic focus (a mouse-opened overlay) |
| text selection | `selection` translucent wash, measured by `selectionFailures` — visible on its surface, and the text it covers still at the body floor |
| status | a family (`info`/`success`/`warning`/`destructive`) via its solid role, or a soft pair through `statusTone(theme, tone)` |

A state wash is a surface with text on it, so it is measured like one: the
resting `foreground` clears the body floor on `hover`, `active` and `accent`,
and `mutedForeground` clears the secondary floor on all three. A ghost button or
a menu row tints its surface and leaves its label in its resting role, so a wash
that drifted toward its text would be unreadable with nothing else noticing.

**Disabled ships two ways today, and only one of them is the contract.** A
disabled field, a select's value and a fieldset legend paint the role pair —
`disabled` behind `disabledForeground` — which is what `contrastFloors.disabled`
measures. The rest of the library fades the whole control with a 50% opacity: the
`disabled:opacity-50` utility in the `@gpuixui/tw` recipes and in
`packages/primitives/src/recipe/index.ts`, the `opacity = 0.5` helpers in
`packages/primitives/src/core/style.ts`, and a menu row's own `opacity` in
`packages/components/src/menu/item.tsx`. That share is `disabledOpacity`, and
`disabledFadeFailures` measures the fade by compositing it — twice, because the
label is faded over the *faded* fill. Measured: a filled action's label lands at
1.51:1–2.83:1, and in a high-contrast theme at 1.74:1–2.23:1, under the 3:1 that
variant's disabled floor asks for, so the fade cannot carry the state there. The
role pair is therefore the contract and the fade is the deviation; replacing it
is recorded in `TODO.md` → Interlocks. The fade is measured by the gate as
`audit.disabledFade`, at `contrastFloors.disabled` in every variant — a brand
whose label composites into its own faded fill fails by name even while every
enabled pair passes.

**Busy is a state of its own, and it is not faded.** A control that is working
keeps its label at its resting contrast and stays in the tab order — a keyboard
user is not dropped from the page mid-action — while it refuses activation on
both input paths and announces itself (`aria-description="Loading"`; the runtime
has no `aria-busy`). What changes is the mark: a spinner's lit dot or an
indeterminate `Progress` bar, painted `primary` for working, `success` for
finished and `destructive` for failed. A status dot paints the tone's readable
role rather than its solid fill, because that fill is a *surface designed to
carry text* — light `warning` is 1.78:1 on the page — and §9 measures every mark
on the strips the library draws it on. `disabledOpacity` is never the busy
treatment: a faded control says "unavailable", a busy one says "wait".

A filled action's hover and press are **derived, not stored roles**: each moves
the fill a step toward the theme's foreground, so it darkens in a light theme
and lightens in a dark one. Deriving keeps the state opaque — a half-alpha fill
would show the surface behind the control — and makes a brand's `primary`
automatically carry a hover that belongs to it. The derivation is held to the
same contrast floors as a role pair, for the label colour on both fills.

Focus never changes layout, and it distinguishes the two input paths the runtime
distinguishes. `keyboardFocusRing(theme)` is an outline in the runtime's
`focusVisible` state ("while focused after keyboard input, like
`:focus-visible`"), applied once at rest: a Tab paints it, a click does not, and
no control tracks focus to draw it. The probe on `@gpuix/native@0.11.0` found one
gap: a programmatic focus before any keyboard input does not paint it, which is
exactly how a mouse-opened dialog or menu focuses its content. That path keeps
`focusRing(theme)`, the zero-offset, zero-blur shadow spread by
`borderWidth.strong`, painted while the overlay holds focus. Both draw outside
the border box, so neither reflows the layout.

Selection never relies on colour alone for meaning: selected rows also carry
`aria-selected` where the runtime exposes it.

Components that cannot express hover or active in the runtime (for example
`virtual-list`, whose GPUI list has no pressed or hovered style) put the state
on a wrapping element instead of faking it.

## 9. Accessibility

Colour is checked, not assumed. `packages/tokens/src/color.test.ts` enforces:

| Pair class | Default | High contrast |
| ---------- | ------- | ------------- |
| body text on background/card/popover | 7:1 | 7:1 |
| text typed into an input, on `input` | 7:1 | 7:1 |
| secondary text on background/card/muted/popover and on a selected row | 4.5:1 | 7:1 |
| on-colour text, placeholder | 4.5:1 | 7:1 |
| soft status text (`xSoftForeground` on `xSoft`) | 7:1 | 7:1 |
| status text on `background`/`card`/`popover` (a field error, an inline warning, a destructive menu row) | 7:1 | 7:1 |
| disabled text on its own fill and on `background`/`card`/`popover` (WCAG-exempt, still visible) | 1.5:1 | 3:1 |
| focus ring (on background, card, popover, muted and secondary) and `borderStrong` on those strips and the field | 3:1 | 4.5:1 |
| an indicator mark — a progress fill, spinner dot, slider fill or presence dot — on background, card, popover and a muted strip | 3:1 | 4.5:1 |
| soft status surface against `background` and `card` | 1.05:1 | 1.05:1 |
| decorative surfaces: divider, skeleton fill, modal veil, status edge, scrollbar thumb | 1.05:1 | 1.05:1 |
| filled action label on its derived hover and press fill | 4.5:1 | 7:1 |
| text inside the selection wash (input, page, card, popover) | 7:1 | 7:1 |
| the selection wash against the surface it covers | 1.05:1 | 1.05:1 |
| data series on `background`, `card` and `popover` | 3:1 | 4.5:1 |
| any two data series apart from each other (OKLab distance) | 0.06 | 0.06 |
| any two data series apart after protanopia, deuteranopia and tritanopia (OKLab distance) | 0.05 | 0.05 |

The test runs for every shipped colour set — light, dark, both high-contrast
variants and all six platform themes — and is part of the normal test suite. It
can fail: a palette edit that reduces contrast fails the gate.

The surfaces that carry no text are measured too, because "subtle" is not
"invisible": a divider, a skeleton fill, the modal veil and a status message's
edge are held to 1.05:1 against what they are painted on — the same
perceptibility floor the soft status surfaces use. The veil is composited over
its surface rather than rejected as translucent, and the two places it is
measured are the content surfaces a modal covers; a black page cannot be
darkened, and a high-contrast theme separates its dialog with a border instead.
The status edge is measured at the share `statusTone` paints, on the tint it
bounds and on both page surfaces. `decorativeFailures(theme, floor?)` runs the
check, and `decorative.test.ts` holds every shipped and platform theme to it. It
found two platform styles whose inherited skeleton matched their own surfaces —
macOS light's on a muted strip (1.045:1) and Linux dark's on its card (1.004:1) —
which now carry a `skeleton` of their own.

Also not measured, deliberately: the elevation tint. A shadow is a blurred
geometry, so a flat ratio overstates what the eye receives; its contract is the
one-shadow rule and the role-owned tint, guarded by `elevation.test.ts`.

Nothing else escapes: `coverage.test.ts` holds every role in `colorRoles` to at
least one measurement, so a role cannot ship unmeasured — it found
`disabledForeground` (now on the disabled floor) and `scrollbar` (now measured as
a decorative surface, because a thumb nobody can find is a scroller nobody can
find). The only two roles with no pair are `selection`, measured by
`selectionFailures` on the text inside the wash, and `shadow`, measured by the
elevation tint above; the guard names each contract.

A value the renderer cannot paint is the other silent failure: GPUix ignores a
colour string it cannot parse, so a typo keeps the property's previous value or
paints black. `invalidColorRoles(theme)` reports every role that is not a 6- or
8-digit hex colour, and it is what found the documented brand example pairing a
saturated violet with the dark theme's near-black on-colour — 4.24:1, below the
floor. The example now ships a white label with its violet, and the audit runs
over it in `theme.test.ts`. An elevation level a brand supplies is outside that
report — it reads `colors` — and an unpaintable shadow colour paints no shadow,
so `invalidShadowColors(theme)` names the level and position (§7).

A value it cannot **lay out** is the third: a style batch is JSON, so `NaN` and
`Infinity` arrive as `null`, the property is dropped, and the element paints as
if the value were never set. Measured in the runtime's test renderer, a `NaN`
radius beside a valid border, type size and fill left those three on the element
and dropped only the radius; a negative size is accepted instead and paints
nothing usable (`fontSize: -4` laid text out at height 0). `invalidNumbers(theme)`
names the group, path, value and rule for every numeric token that cannot be
laid out — a shadow offset may be negative, but a control height or type size
must be positive (§10, `docs/tokens.md` §Numbers).

The contract is public, so a brand theme runs the same checks: `auditTheme(theme)`
reports all nine in one call — `invalidRoles`, `invalidShadows`,
`invalidNumbers`, `contrast`, `decorative`, `series`, `selection`,
`indicators` and `disabledFade` — and `passed` is true only
when every list is empty. The contrast half
is measured against the theme's own `contrast` variant through
`contrastFloorsFor(theme)`, so a brand derived from a high-contrast theme is held
to AAA without the caller naming a floor set; an explicit `ContrastFloors`
overrides it. The disabled fade is the one report that ignores those floors: a
fade is a mechanism, so it is held to `contrastFloors.disabled` in every variant
(§8 records why the fade cannot carry a high-contrast theme). The parts are
public too: `contrastRatio(foreground, background)`
measures two opaque roles, `contrastPairs` with `contrastFloors` /
`highContrastFloors` names the text and boundary pairs and their floors,
`decorativeFailures(theme, floor?)` measures the subtle surfaces,
`seriesFailures(theme)` measures a categorical scale — on its plot, against
itself and after each colour-vision deficiency — while `selectionFailures(theme)`
measures the wash a selected run sits in and `indicatorFailures(theme)` measures
the marks a component shows. Nothing about the requirement is
private to this repo.

### Target sizes

Colour is not the only measured contract. Every pointer target keeps
`targetSize.minimum` — 24px — and a touch-first surface may raise it to
`targetSize.comfortable`, 44px. Every shipped control height is at or above the
first floor; an icon-sized part — a checkbox's 16px box, a 12px chevron — keeps
its drawing and reserves the difference as padding with `targetInset`, so the
look does not change and the target still reaches the floor. The floor is fixed
rather than theme-owned: a brand can restyle the control, not lower the target.
`target.test.ts` holds the helper and every density against it; adoption by the
component packages is recorded in `TODO.md`.

Not covered, deliberately:

- disabled text (WCAG exempts inactive controls); it stays visibly dimmed;
- secondary text selected under the wash — a caption already sits at the
  secondary floor, so a wash that can be seen lowers it; the wash is held to the
  primary reading text it covers, and the limit is stated in `docs/tokens.md`
  §Text selection;
- placeholder as a substitute for a label — placeholders are hints, labels are
  required;
- colour as the only status signal — status components pair colour with text or
  an icon;
- forced-colours and OS-level high-contrast modes — the library ships an
  in-app high-contrast theme, but GPUix exposes no OS accessibility query to
  detect a system override automatically.

GPUix exposes accessibility roles and names (`role`, `aria-label`,
`aria-description`, `aria-selected`, `aria-expanded`). Components use them; the
design system cannot compensate for a missing role.

## 10. Runtime constraints

| Constraint | Consequence |
| ---------- | ----------- |
| no CSS variables or cascade | tokens are inline values; theme switch re-renders |
| no inherited `color` | every `<text>` sets `color` explicitly |
| focus has two paint paths | `keyboardFocusRing` is the `focusVisible` outline the runtime paints after Tab; a programmatic focus before any key (a mouse-opened overlay) does not paint it, so that path keeps `focusRing`'s shadow |
| selection is a style property | `selectionColor` washes a subtree and inherits; the runtime defaults to the theme accent at 35%, so the `selection` role is what a component passes to keep the reader's selection in the design system's palette |
| elevation is one shadow per level by design | `boxShadow` accepts a list, but a level is designed as one shadow |
| no `zIndex` in the published API | paint order is tree order; an overlay paints above the page by being mounted after it, the dismiss stack decides what Escape closes, and there is no numeric `z` token (`docs/tokens.md` §Layering) |
| `letterSpacing` absent | no display tracking or all-caps tracking |
| no OS appearance query | the app owns the mode |
| `virtual-list` has no hover/active style | wrap it and style the wrapper |
| shadows are structured objects | elevation tokens are objects, not CSS strings |
| invalid colour strings are ignored per property | a typo paints the previous/black value; `invalidColorRoles` reports it, and the shipped themes are held to the hex grammar by test |
| a style batch is JSON, so a non-finite number is dropped | the property is never set and the element paints its default; `invalidNumbers` reports the token, its group, path, value and rule |

## 11. Extension

The extension mechanism is deliberately small:

- `createTheme({ mode, ...overrides })` — start from a built-in theme.
- `extendTheme(base, overrides)` — derive from any theme, including another
  brand theme or a high-contrast theme.
- `applyStyle(base, style)` — apply a whole look (`PlatformStyle`) at once;
  `platformTheme` and `retroTheme` are the two tables it reads.
- `ThemeProvider theme={…}` — scope a theme to a subtree; nested providers
  allow a branded panel inside a neutral shell.
- Every choice a consumer can persist — mode, contrast, platform, look,
  density, control size, status tone — has an ordered index beside a guard that
  takes `unknown` (`themeModes`/`isThemeMode`, `platformNames`/`isPlatformName`,
  …), so a settings row or a docs toggle iterates the axis and a restored value
  narrows without a cast.

Overrides merge by group; typography merges field by field; elevation levels are
replaced as whole arrays; the mode is immutable. Nothing mutates the base, so a
theme can be created once at startup and shared.

A brand may change any value but should not remove roles: every component
expects the full role set. A brand that needs a different structure should add
roles in the tokens package, not fork components.

Overrides are plain data, so `extendTheme` cannot reject a colour the renderer
would ignore or a number it cannot lay out. The audit is the gate: `auditTheme(theme)`
runs all nine checks — an unpaintable role, an unpaintable shadow in a level the
brand supplied, a size, length or shadow geometry the renderer would drop, every
pair below the floor its variant asks for, every decorative surface too close to
its background, a data series lost on its plot or to a colour-vision deficiency,
a selection wash that hides its text, an indicator mark nobody can find, and a
disabled label the fade erases; run it over the resolved theme before it ships
and assert `passed` in the package's own tests.

## 12. Non-goals

- No component-level token catalogue. Semantic roles plus scales are enough; a
  per-component token file would duplicate the same decisions.
- No theme-authoring UI in the library. The docs site's `/docs/themes` editor is a
  consumer of the same `Theme` shape; the library ships the API, not the editor.
- No motion tokens here. `@gpuixui/motion` owns durations, easings, springs and
  inertia; this package stays colour, type, space, radius and elevation.
- No web preview pretending to be native. The playground is the visual proof.

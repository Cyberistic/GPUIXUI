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
variant, every one perceivable on the four plot surfaces (`seriesSurfaces`: the
page, a card, a popover and the `muted` strip a toolbar or status bar paints),
every pair separated by an OKLab distance (`seriesDistinctnessFloor`), and every
pair still separated once protanopia, deuteranopia and tritanopia are simulated
(`seriesDeficiencyFloor`). A chart never hard-codes a hex; a brand that wants its
own categories carries `series`, a plot drawn on another role names it
(`seriesFailures(theme, { surfaces: ["secondary"] })`), and a look that repaints
the surfaces a plot is drawn on declares a scale for them (`PlatformStyle.series`
— Luna's beige toolbar swallows the shared light amber at 2.75:1, so the look
ships `lunaSeries`; a house that wants other hues copies the style and replaces
the five positions). See
`docs/tokens.md` §Data series and §Authored looks.

This keeps a brand theme small: overriding `primary` changes every primary
action in the library.

**A fill role is not a text role.** `primary` is designed as a surface — it
carries `primaryForeground`, and that is the pair the contrast table measures.
Written as text it fails the 4.5:1 a reader needs: the base light brand is
4.30:1 on the wash a pressed link tints behind itself, macOS dark 3.10:1, Linux
light 3.44:1. So a link or any brand-coloured run paints `brandText(theme)`,
which returns the brand where it already reads and otherwise steps it toward the
theme's `foreground` until the least readable of the eight surfaces it can sit on
(the page, card, popover, muted toolbar, the hover and press washes a link tints,
and the `accent`/`selected` washes a row paints under an action) clears the
floor the theme's variant asks for — 4.5:1 default, 7:1 high contrast. A run
that knows its surface asks for it: a link inside an `Alert`'s description sits
on that message's `xSoft` tint, where the shared colour is under the floor in 29
of the 64 tint placements (macOS dark on `warningSoft` measures 3.43:1), so it
paints `brandTextOn(theme, surface)`. The message's own copy keeps the tone's
readable role. The same rule covers status text: a required marker or a field
error paints `statusTone(theme, tone).foreground`, the tone's readable role,
never the solid fill. See `docs/tokens.md` §Brand text.

## 4. Light and dark

Dark mode is designed, not inverted:

| Concern | Light | Dark |
| ------- | ----- | ---- |
| canvas | `#F6F8FA` | `#11141A` |
| raised surface | `#FFFFFF` | `#191D25` |
| floating surface | `#FFFFFF` | `#222730` |
| primary | dark iris `#5F4BDB`, white text | light iris `#A7A9FF`, near-black text |
| destructive | `#CC3439`, white text | `#FF6B6B`, near-black red text |
| shadow | graphite at low alpha | black at high alpha (grey in the high-contrast dark theme, whose black page no black shadow can darken) |

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

`bodyStrong` is the one pair that shares a size and a leading, so its weight is
the whole difference between reading and emphasis. That difference is a contract,
not a convention: the strong role must share the body's size and leading and
weigh more, and `invalidNumbers` reports a theme that breaks the pair as
`emphasis` — a weight scale forwarded from a design-tool export can hand
`bodyStrong` the body's weight, and a brand that raises only the body's size or
leading leaves the role meant to stand out behind, while every number stays
layable (§9, `docs/tokens.md` §Numbers).

A weight is a **number**, not a four-step union: the runtime clamps any real
value into its `1–1000` range, so the scale's `400`/`500`/`600`/`700` are the
steps this identity ships and a variable face's `450` or a display role's `800`
is a value a brand may set — the gate holds it finite, not to the shipped four
(§9).

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
scales follow the same rule: macOS 4/6/10/14, Linux 4/6/9/12, Windows 2/4/8/10,
against the default 4/6/8/12.

It changes control height, horizontal padding and row height only. Type sizes
and the spacing scale stay fixed, so a density switch cannot reflow text
unexpectedly. Components read `controlHeight(theme, size)` and
`controlPaddingX(theme, size)` instead of hardcoding numbers.

The two halves still have to fit together:

- **A control's box contains the text and the icon it carries.** The box is
  exactly `controlHeight`, and a control lays its text at a type role's leading —
  `label` for a button, toggle and select trigger, `body` for a field's value
  (`packages/primitives/src/core/style.ts`) — and draws any glyph it carries at
  `iconSize.md` (`Icon`'s default; a selection box and a spinner's dot take the
  same step). A brand that grows its reading size or its icon scale without
  growing the box paints a line or a glyph taller than the control around it
  while every number stays finite, positive and pressable.
  `invalidNumbers` reports it as `fits` on the box that has to grow; `compact` is
  24/28/32, so a 26px body leading outgrows only its `sm` control, a 26px `md`
  icon outgrows the same box, and a box exactly equal to the taller of the two
  passes. Every shipped preset clears it — the tallest control role is `body` at
  20px and the control glyph is 16px, four pixels under `compact` `sm`.

The shortest of those controls — `compact` `sm` at 24px — is also the
pressable-target floor, so a control built at a control height never needs
extra hit-area padding. That is a claim about a theme, not only about the built-in
presets: `invalidNumbers` reports a `controlHeight` under `targetSize.minimum`
(24px) as `pressable`, so a brand that shrinks one fails the audit instead of
shipping a target a pointer cannot reliably hit. A row is the same box one level
down — a `dense` list row is built at exactly `rowHeight` and takes a press — so
`rowHeight` is reported as `pressable` under the same floor. An icon-sized part
needs an inset; §9 has the rule.

Every one of these scales is a **ladder**, and its order is part of the
contract: a brand's `sm` control stays shorter than its `md`, which stays
shorter than its `lg`; a radius step stays rounder than the one below it; a
heading stays larger than its body text; an elevation level casts a shadow that
reaches further below its surface than the level under it. `invalidScales(theme)`
reports a step that repeats or inverts its neighbour — the gap `invalidNumbers`
cannot see, because each value on its own is layable. It found the Windows
style's `xl` radius equal to its `lg`, so a dialog and a card there were equally
square; `xl` is 10 now. `invalidScales` is not one of the audit's reports yet;
§11 says why and what to run.

## 7. Radii, borders and elevation

Radii: 0, 4, 6, 8, 12, full. Small controls use 4 or 6; cards 8; dialogs 12.
Pills and avatars use `full` (clamped by the renderer to half the short side).
Identity marks use their own diameter scale — 20, 26, 32, 40 — with 32 as the
default. It is fixed rather than theme-driven, and never follows density: a
circle is content, not a control.

Two border roles:

- `border` is decorative — dividers and card edges. It is intentionally subtle.
- `borderStrong` is functional — a control's boundary, and the edge a field
  owes (§8). It meets 3:1
  against every surface a control can sit on — the canvas, a card, a field, a
  toolbar strip, a secondary fill and a floating surface (a dialog's footer or a
  popover's form, where the ring was measured before the edge) — and on the
  `hover`/`active` wash a bordered control tints while it is hovered or pressed,
  because the secondary action keeps that edge while its fill moves. That strip
  found four shipped misses (both base themes, high-contrast dark and Linux
  light), so the edge is perceivable in every state without relying on fill
  alone. It is also what carries an action inside a message: an `Alert` fills
  its tone's soft tint and its description holds the action, and the neutral
  fill band shares the pale tints' lightness (a `secondary` action reads
  1.01–1.04:1 on the green and amber tints), so the four tints joined the same
  contract — thirteen of the sixteen styles missed it, the worst at 2.23:1.

A **field is carried by its edge, not its fill.** A field sits on the page, a
card, a popover and a `muted` toolbar, and in the light palettes the page
(`#F6F8FA`) and a card (`#FFFFFF`) are only 1.06:1 apart — less than the
perceptibility floor applied twice, so no single fill clears it against both, let
alone against the toolbar as well. Light `input` is `#FFFFFF`, the same value as
`card` and `popover` (1.00:1). Its edge is the boundary,
which means `borderStrong`, the role the contrast table measures on a field's own
fill (`input`) as well as on those four strips. **The shipped field is the one
control that still rests on the decorative role** — `fieldVariant` in
`packages/primitives/src/core/variants.ts` and `FieldInput` in
`packages/components/src/field.tsx` both paint `border` (1.19:1 on the light
page) and reach `borderStrong` only on hover — so a resting field inside a card
is a fill that matches the card and an edge a reader has to look for. The tokens
ship and measure the boundary; the adoption is `TODO.md` → Interlocks.

A field paints one of **two fills**, and the text inside it is measured against
the fill it chose. A plain field paints `input`. A composite field — a search,
tag or mention field, the chat composer, the inline edit, the colour picker's hex
field — paints the page role as its own fill and keeps `inputForeground` as its
value, so both roles and the placeholder are measured on `background` as well as
on `input`; that pair found two shipped misses, Aero light's placeholder at
4.35:1 on its own window and macOS light's inherited value at 4.49:1 on its,
both under the 4.5:1 floor, so both palettes moved. The native text engine draws
those fields, and a host given no theme falls back to the runtime's **built-in
dark** palette, so its caret would be chosen for a dark surface in a light theme:
`nativeTextTheme(theme, fill)` hands the host the theme for the fill the field
paints (`docs/tokens.md` §Native text hosts). **The runtime does not let the
theme colour an empty field's placeholder** — at the pinned release it shapes the
hint with a fixed `#8F8F8F` (`custom_elements/input.rs`), so no token can move it
and a component that needs a themed hint paints the text itself.

A control with **no** border — the `secondary` variant paints `border-0` — is
carried by its fill instead, so that fill is measured: `secondary` is held to the
perceptibility floor (1.05:1) on the page, a card, a popover and a muted toolbar,
the strips a button can sit on. It is the same claim the state washes make, one
control over, and it found the shipped alias: light `secondary` *was* `muted`, so
a secondary button in a toolbar was a label with no button around it, and each
platform window was 1.015–1.049:1 from it. The base light fill is now `#E1E5EC`,
its pressed wash `#D6DBE4` (so a resting control is not the value of a pressed
ghost) and `borderStrong` `#6A7483` (so the boundary keeps its 3:1 on the new
fill and on the pressed wash); each affected platform style and look owns its control face. §9 lists the
placement, `docs/tokens.md` §Decorative surfaces the measurements.

Elevation is a semantic level, not a literal shadow: `sm` for a card raised with
`variant="elevated"`, `md` for the surfaces whose recipe names `shadow-md` and
takes no level of its own (the toast card, the preview card, the navigation-menu
panel), and `lg` for dialogs (and the command palette, which is one), popovers,
menus and the drawer. A level is
designed as **one** shadow, read with `elevationShadow(theme, level)`; the
runtime also accepts a shadow list, but the scale does not use one, so a level
cannot render half of itself. A level the theme does not carry resolves to
`undefined` — a flat surface the audit has already named, not a throw on first
paint (§9). Each level paints the `shadow` role at its designed
strength — 8%, 12% and 16% over a pale canvas, 40%, 65% and 80% over a dark one —
so retinting that one role retints every shadow a theme inherits. The high-contrast
themes carry the same geometry in their own role's tint.
Overlay layering is paint order, not a shadow or a weight: the runtime has no
`zIndex`, so a surface paints above the page by being mounted after it, and the
`overlay` scrim role is what recedes the content behind a modal. §Layering in
`docs/tokens.md` is the model — the five mount layers, the topmost-layer
dismissal stack, and why `elevation.overlay` stays a reserved, empty level. Dark
shadows are stronger because contrast between surfaces is lower — but stronger is
not the same as visible. The deepest level is held to the perceptibility floor
against the strips a raised surface falls on — the page, card, popover and
toolbar, the segmented `secondary` panel and a field's `input` fill the veil
already names, every wash a surface can open over (the
`selected` a chosen row holds, the `accent` a list row tints under the pointer,
the `active` a row keeps while the press is down and the `hover` a click leaves
on the trigger it was opened from) and the four soft tints a message is painted
on, because an alert's documented action can open a menu over its own surface —
the same `decorativeFailures` call a divider and a wash answer to (§9). A shadow
is a blurred geometry, so the composite is a ceiling rather
than what the eye receives: a shadow that passes may still read faint at its
edge, and the contract reports only one that cannot be seen at all. It found
exactly that twice: the high-contrast dark theme tinted its shadows with black on
a pure-black page, so every level was 1.00:1 there and a dialog or a full-width
card had no shadow, and the grey that replaced it matched the same theme's
`secondary` face, so a dialog over a segmented panel still painted 1.00:1. Its
tint is lighter than the faces it can fall on now, and the deepest level reads
1.17–1.87:1 across all fourteen strips.

A level is a rung on the same kind of ladder as a radius: the surface a reader
raises must cast a shadow that reaches further below its box than the level
beneath it, which `invalidScales` measures as
`offsetY + blurRadius + spreadRadius` of the painted shadow (§6). A brand that
copies a design-tool export level by level can hand `md` the dialog's geometry
and paint a dialog shallower than the menu under it; the report names both
levels.

## 8. Interaction states

| State | Role / mechanism |
| ----- | ---------------- |
| hover | `hover` wash on ghost and subtle surfaces; a filled role — an action, or a toggle's `accent` on-state — moves to `filledHover(theme, role)` |
| pressed | `active` wash; a filled role moves to `filledPressed(theme, role)`, a step further than its hover unless the label's floor stops it |
| selected | `selected` + `selectedForeground` |
| disabled | `disabled` + `disabledForeground`, plus a non-colour cue where possible; held to `contrastFloors.disabled` so the state stays visible rather than to a readability floor, and its fill is held apart from every enabled control face (§8/§9) |
| invalid | the `destructive` role as the field's edge and as its `focusVisible` line; the fill and text roles do not change, so the value and placeholder stay readable |
| link | `brandText(theme)` — the brand derived into a text colour that reads on all eight surfaces it can sit on, with `hover` / `active` washes behind it and the `accent` / `selected` washes a row paints under it; never the raw `primary` fill role |
| loading | a mark — `primary`, or a status tone's readable role — never the disabled fade: a busy control keeps its label, its tab stop and its announcement |
| focus | `keyboardFocusRing(theme)` — an `outline` in the runtime's `focusVisible` state, painted only after keyboard input; `focusRing(theme)` — the unconditional shadow for a programmatic focus (a mouse-opened overlay); `controlFocusRing(theme, { disabled, invalid })` — what a control declares: the same outline recoloured to `destructive` while invalid, and none at all while disabled (the runtime keeps the focus of an element it disables) |
| dimmed | `keyboardFocusDimOpacity` — every other focusable keeps 40% of itself while one control has keyboard focus, except that a focused `input`/`textarea` dims nothing (typing is keyboard input too); a control whose text must stay readable opts out with `keyboardFocusDim: false` |
| text selection | `selection` translucent wash, measured by `selectionFailures` — visible on its surface, and the text it covers still at the body floor (secondary text at the secondary floor) |
| status | a family (`info`/`success`/`warning`/`destructive`) via its solid role, or a soft pair through `statusTone(theme, tone)` |

A state wash is a surface with text on it, so it is measured like one: the
resting `foreground` clears the body floor on `hover`, `active` and `accent`,
and `mutedForeground` clears the secondary floor on all three. A ghost button or
a menu row tints its surface and leaves its label in its resting role, so a wash
that drifted toward its text would be unreadable with nothing else noticing. A
filled action keeps its label's floor when its fill moves: the pointer state is
the derived `filledHover`/`filledPressed`, and `styles.test.ts` holds the role's
on-colour on both fills — so the resting `secondaryForeground` on `secondary` is
this table's pair and the pointer is the derivation's. A
row floating on a popover keeps the *surface's* role instead — a menu row rests
in `popoverForeground`, a destructive row in the tone's readable role — so both
are measured on the same washes, and the popover's text role on the `selected`
wash a chosen row fills (`selectItemClass` is `text-popover-foreground` over
`bg-selected`); that check found the two light looks' pressed washes at 6.93:1
and 6.77:1, so every light theme carries red 900 as
`destructiveSoftForeground` — the same value the deeper soft surface needs for
its label, rather than flattening press into hover. A **list** row is the other
row and it wears the other two washes: `list.tsx` fills `selected` once a row is
chosen and tints `accent` under the pointer, and a destructive status caption
(`Text tone="destructive"`) keeps the tone's readable role, so that role is
measured on both — the tightest shipped placement is the Luna look's chosen row
at 7.97:1.

A **filled role's pointer feedback** is derived, never a lifted alpha: a
half-alpha fill shows the surface behind the control, so the same face reads as
two colours on a card and on a dialog. `filledHover` / `filledPressed` take a
`FilledRole` — the three actions plus a toggle's `accent` on-state — and move the
role 12% / 18% of the way toward `foreground`, clamped so the role's on-colour
keeps the floor its theme declares. The accent face is the one that needs the
clamp: pressed at the full step its label lands at 4.13:1 in macOS dark (under
4.5) and 6.90 / 6.94:1 in the two high-contrast themes (under 7), so those three
styles press at 14% and 17%. Every action keeps the full step everywhere.

The step must also be **seen**, so the eight placements (four roles × hover and
press) are measured against the fill they replace at the decorative floor —
`actionFeedbackPlacements` and `actionFeedbackFailures` in §9 — because the
contrast table measures role pairs and a derived fill is not a role. That found
Windows dark's `#60CDFF` primary hovered at 1.05:1 (a primary button that never
answered the pointer; the platform carries `#59C9FF` now, 1.059:1) and it holds
the catalogue's one-hue brand, whose page copy and `primary` are the same navy so
its hover lands on its own fill. The components package's `Button` derives the fills for all three actions, and
its **`secondary` variant** does too: it swapped in the `hover` / `active` washes
until the contract measured **15 of its 32 pointer placements** under the floor —
hovered **1.000:1** in High contrast light, High contrast dark and Light · macOS,
pressed **1.000:1** in Dark · Windows — because a wash is often the fill it
replaces. The derived step clears the floor in all 16 shipped styles.

A **selected row** is the fourth wash, and the one a row's *title* is painted on.
`ListItemTitle` overrides its recipe's colour with the row's own role
(`selectedForeground`), and the row paints the `selected` fill behind it, so that
is the title's body-floor pair; `foreground` on `selected` stays measured for the
primitives' `surface="selected"` + default `Text` in the same slot. The row also
tints a wash under itself as the pointer arrives (`accent` on hover, `active` on
press) and the title keeps its role there, so `selectedForeground` is held to the
body floor on all four surfaces; the tightest is the base dark theme's pressed
wash at 7.31:1. Every shipped, high-contrast, platform and authored style clears
it, so no palette moved: the pairs close the gap a brand could fall into, where a
selection close to its page — or a wash close to the text the row keeps — erases
the label it just selected while every other report passes.

It is also measured as a surface, because a wash with no contrast against the row
it tints is a state nobody sees: `decorativeFailures` holds each of `hover`,
`active`, `selected` and `accent` to 1.05:1 on `background`, `card`, `popover`
and a `muted` toolbar. The base themes had shipped the alias — dark `hover` *was*
`popover`, so a hovered menu row repainted the surface it already sat on, and
light `hover` was its `muted` strip — and macOS light, Windows light and Linux
dark were within a step of one. Each now carries a wash a reader can see; the
tokens and the paragraph above are the same rule from its two ends, legibility of
the text and visibility of the tint. The **filled action's resting fill** is
measured on the same four strips (`filledAction` in `decorative.ts`), because the
tonal variant's fill is its whole shape (§7); light `secondary` had shipped as
the `muted` value and every platform window sat within a step of it, so the base
fill and each affected style's own control face moved with that contract.

**An invalid control changes its edge, not its fill.** Validation failure paints
the field's border and its focus line in the `destructive` role, and leaves the
field's fill alone — so the value and the placeholder keep the roles the contrast
table measures for them (`inputForeground` and `placeholder` on the fill the
field paints: `input`, or the page role a composite field uses). The
edge is a boundary: `destructive` is held to `contrastFloors.boundary` on the page,
a card, a popover, a `muted` toolbar, a field's own fill and a segmented
`secondary` panel, the last two through `contrastPairs` (§9). A destructive
**fill** is a different role with a different job — it is designed to carry
`destructiveForeground`, not `inputForeground` — so painting one behind a field's
value is not a variation of this state: the value lands at 3.31:1 in the light
theme, 2.45:1 in the dark and 2.08:1 in high contrast, and no floor rescues a
text role painted on the wrong surface. Both painters keep the fill today: the
primitives' field recipe's invalid class is `aria-invalid:border-destructive`
alone, and the components package's `FieldInput` paints the destructive edge
under `input`. `packages/primitives/src/recipe/recipe.test.ts` holds the painted
roles and `runtime/fields.runtime.test.tsx` reads them back off a window.

**Disabled ships two ways, and only one of them is the contract.** A disabled
field, a select's value and a fieldset legend paint the role pair —
`disabled` behind `disabledForeground` — which is what `contrastFloors.disabled`
measures. A **filled action** paints it too: `paintsFilledSurface` (`primary`,
`secondary`, `destructive`) resolves to `disabledAction(theme)` in
`packages/primitives/src/core/style.ts`, the recipe's disabled bucket is
`disabled:bg-disabled disabled:text-disabled-foreground`, and a menu row
(`packages/components/src/menu/item.tsx`) paints `disabledForeground`. The
deviation that remains fades the control with a 50% opacity: the
`disabled:opacity-50` utility in the `@gpuixui/tw` recipes, the `opacity = 0.5`
a field, a slider and a rating's part still take in
`packages/primitives/src/core/style.ts`, and the components package's own
`Button` for its unfilled variants (`packages/components/src/internal/button.tsx`,
`opacity: disabledOpacity`) — its filled variants wear `disabledAction(theme)`
and pin their hover and press to the resting fill. An unfilled action has no
fill to collapse into and keeps the fade. That share
is `disabledOpacity`, and
`disabledFadeFailures` measures the fade by compositing it — twice, because the
label is faded over the *faded* fill. Measured: a filled action's label lands at
1.51:1–2.83:1, and in a high-contrast theme at 1.74:1–2.23:1, under the 3:1 that
variant's disabled floor asks for, so the fade cannot carry the state there. The
role pair is therefore the contract and the fade is the deviation; the filled
action and the menu row have adopted it, and the remaining replacement is
recorded in `TODO.md` → Interlocks. The fade is measured by the gate as
`audit.disabledFade`, at `contrastFloors.disabled` in every variant — a brand
whose label composites into its own faded fill fails by name even while every
enabled pair passes.

**The fade is also a page mechanism.** Its result belongs to the strip behind the
control, and a filled action's does not survive the move onto a card: measured,
the faded `primary` label lands at **1.47:1–1.49:1** on a card in four of the
light styles — Linux, macOS, Windows XP (Luna) and Windows 7 (Aero) — under the
floor the page clears. So the fade is measured on `background` for a filled
action, and a disabled action on a card, a popover or a group strip paints the
neutral pair instead: `disabledAction(theme)` is `disabled` behind
`disabledForeground`, the pair the contrast table already measures on every
surface a control sits on. **A field is measured on all four strips it sits on**,
with both fills and both labels: a plain field paints `input`, a composite field
— a search, tag or mention field, the inline edit, the chat composer, the colour
picker's hex field — paints the page role as its own fill, and each carries a
value and a hint. The strips are the page, a card, a popover and the `muted`
toolbar or sidebar a search or filter field lives in — the last one is where a
fade is decided rather than a copy of the page, so a brand with a dark sidebar and
a light content area composes its hint down to 1.30:1 while the page placement
still reads 2.03:1. The tightest of those placements is the Windows 7 (Aero)
look's composite hint on its `muted` toolbar at **1.96:1**, above its floor; the
pairs are coverage, so a brand that tints its page cannot ship a hint nobody can
read. A filled action and the menu row already paint the pair; the two recipe
sets and the components' own `Button` remain the interlock in `TODO.md` →
Interlocks.

**The disabled fill must not wear an enabled control's face.** A disabled
control does not sit on a strip, it replaces the control, so the neutral fill is
measured against `primary`, `secondary`, `destructive`, `accent` and `input` at
the same 1.05:1 perceptibility floor (§9). It caught both high-contrast themes:
`disabled` was `secondary`'s own value, so an unavailable action and an enabled
tonal action painted the same box in the variant a reader selects *for* clarity,
and high-contrast light's disabled face was also 1.03:1 from the `accent` a
checked toggle wears. The quiet step (`#F2F2F2` / `#1A1A1A`) clears all five.
The strip behind the control is deliberately not measured: the base light
theme's `disabled` *is* its `muted`, the base dark theme's is its `popover`, and
both high-contrast variants' is their `muted` — a quiet fill on
a quiet strip is the design, a quiet fill on an enabled face is the defect.

**Keyboard focus dims every other control, and that is a paint too.** While one
element has keyboard focus, `@gpuix/native` multiplies every other focusable
element's opacity by `keyboardFocusDimOpacity` (`0.4`, on by default and per
element; `keyboardFocusDim: false` opts out). One element is exempt: a focused
`input`/`textarea` dims nothing, because typing is keyboard input too, so a
filled action beside a form keeps its label while a reader types. It is a
where-can-Tab-go cue, not a reading mode: dimming a saturated fill toward a light
page closes it on its label, and
the tightest shipped placement is Linux light's `primary` over a card at 1.27:1
(`#C8DDF5` on `#A4C6EF`). So the contract is the same one the disabled state
carries — the label is still seen — at `decorativeFloor` (1.05:1), not a
readability floor, and a control whose text must stay readable while the focus
is elsewhere opts out of the dim. `keyboardDimFailures` measures the 40
placements the three filled actions, a field (both of its fills, its value and
its placeholder), a focusable row and a selected row sit on; the composite is
the disabled fade's, with the label over the *dimmed*
fill — the `keyboard-focus-dim` window capture measured both the share and that
model; against the shipped dark palette the pair is the `muted` fill `#1E222A`
painted as `#161A20` and the `foreground` text `#EEF1F5` as `#6C7075` over it.
The lowest field placement is macOS light's
composite hint on a muted strip at **1.68:1**, still above the cue's floor.
It is the gate's tenth report (`audit.keyboardDim`): the dim and the
disabled fade are the same composite with two shares, so no palette fails the
dim alone — the dim's band sits inside the fade's — and what the report adds is
the placement and the mechanism, so a consumer knows which control has to
declare the opt-out.

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
the border box, so neither reflows the layout. The ring is read on every strip a
control sits on — the page, a card, a popover, a toolbar, a secondary panel, the
`input`/`selected`/`hover`/`active`/`accent` fill it hugs, and the soft status
tint an action inside a message is drawn on, where the light ring used to read
2.84:1 on the red tint; the tightest placement is the Aero look's red message
tint at 3.09:1 against the 3:1 boundary floor.

What a *control* declares is `controlFocusRing(theme, { disabled, invalid })`:
the same outline while it can act, the `destructive` role while it failed
validation (so its focus line and its edge agree), and **no ring** while it is
disabled — the runtime does not move the focus off an element that becomes
disabled, so a declaration made anyway would stay painted on a control that
refuses every key. The helper is the tokens package's statement of the rule both
component packages already apply in their own seam.

Selection never relies on colour alone for meaning: selected rows also carry
`aria-selected` where the runtime exposes it.

Components that cannot express hover or active in the runtime (for example
`virtual-list`, whose GPUI list has no pressed or hovered style) put the state
on a wrapping element instead of faking it.

## 9. Accessibility

Colour is checked, not assumed. `packages/tokens/src/color.test.ts` enforces:

| Pair class | Default | High contrast |
| ---------- | ------- | ------------- |
| body text on background/card/popover/muted, on the accent and selected washes, and on the `secondary` group strip a control sits in | 7:1 | 7:1 |
| text typed into an input, on `input` and on the page role a composite field paints its fill with | 7:1 | 7:1 |
| secondary text on background/card/muted/popover, on a selected row, inside a field's own fill (`input`), and on a control's `secondary` group strip | 4.5:1 | 7:1 |
| a selected row's title on its own selection and on the `hover`/`active`/`accent` wash it tints (the `selectedForeground` it paints, held to the body floor), the `foreground` a default `Text` keeps on a selected surface, and a chosen row inside a popover resting in its surface's role (`popoverForeground` on `selected`) | 7:1 | 7:1 |
| on-colour text, placeholder (on `input` and on the page fill) | 4.5:1 | 7:1 |
| a secondary action's resting label (`secondaryForeground` on the `secondary` fill) | 4.5:1 | 7:1 |
| brand text — a link or text action — on background, card, popover, muted, the hover/active washes it tints and the `accent`/`selected` washes a row paints under it (`brandText`) | 4.5:1 | 7:1 |
| soft status text (`xSoftForeground` on `xSoft`) | 7:1 | 7:1 |
| the page role an alert's copy and dismiss glyph paint on a soft status tint (`foreground` on `xSoft`) | 7:1 | 7:1 |
| status text on `background`/`card`/`popover`/a `muted` strip and on the `hover`/`active` wash a floating row tints (a field error, an inline warning, a message in a muted sidebar, a destructive menu row) | 7:1 | 7:1 |
| disabled text on its own `disabled` fill, on `background`/`card`/`popover` and on a `muted` toolbar or `secondary` panel (WCAG-exempt, still visible) | 1.5:1 | 3:1 |
| the dim another focusable keeps while one has keyboard focus (`keyboardFocusDimOpacity`) | 1.05:1 | 1.05:1 |
| a filled role's derived pointer step (`filledHover` / `filledPressed` through `actionFeedbackPlacements`) against the fill it replaces | 1.05:1 | 1.05:1 |
| focus ring on background, card, popover, muted and secondary, on the `input`/`selected`/`hover`/`active`/`accent` fill it hugs, and on the four soft status tints an action inside a message draws it on; and `borderStrong` on those same strips (a floating surface included), on the field, on a soft status tint, on the `hover`/`active` wash a bordered control tints, and on the `accent`/`selected` wash a row paints under the same action | 3:1 | 4.5:1 |
| the invalid edge — `destructive` as a field's border and focus line — on background, card, popover, input, muted and secondary | 3:1 | 4.5:1 |
| an indicator mark — a progress fill, spinner dot, slider fill, presence dot, a checked row's tick or a field's caret — on background, card, popover, a muted strip, a field's `input` fill, and on the four washes a row wears (`hover`/`active` on a menu or combobox row; `accent`/`selected` on a list row) | 3:1 | 4.5:1 |
| soft status surface and its edge against `background`, `card`, `popover` and a muted strip | 1.05:1 | 1.05:1 |
| decorative surfaces: divider, skeleton fill, modal veil, status edge, scrollbar thumb, state wash, rail, elevation shadow (at its deepest level) | 1.05:1 | 1.05:1 |
| a filled action's resting fill (`secondary`, which paints no border) on background, card, popover and a muted strip | 1.05:1 | 1.05:1 |
| a bar's rail (`muted`) on background, card and popover — never on the muted strip it is made of | 1.05:1 | 1.05:1 |
| a disabled action's fill against each face an enabled control wears (`primary`, `secondary`, `destructive`, `accent`, `input`) | 1.05:1 | 1.05:1 |
| filled action label on its derived hover and press fill | 4.5:1 | 7:1 |
| text inside the selection wash (input, page, card, popover, a message bubble's muted fill) | 7:1 | 7:1 |
| secondary text inside the selection wash (page, card, popover) | 4.5:1 | 7:1 |
| the selection wash against the surface it covers | 1.05:1 | 1.05:1 |
| data series on `background`, `card`, `popover` and `muted` (a look's chart on its own quiet strip is measured by the same report with `surfaces` named) | 3:1 | 4.5:1 |
| any two data series apart from each other (OKLab distance) | 0.06 | 0.06 |
| any two data series apart after protanopia, deuteranopia and tritanopia (OKLab distance) | 0.05 | 0.05 |

The test runs for every shipped colour set — light, dark, both high-contrast
variants and all six platform themes — and is part of the normal test suite. It
can fail: a palette edit that reduces contrast fails the gate.

A **message bubble** is the fifth content surface in the selection contract. A
user message is painted on the `muted` fill and its body copy keeps
`foreground`, so a selectable run inside it is washed over the bubble rather
than the page. Measured, Aero dark's 30% share left it at 6.74:1; the look
carries the 24% its siblings use (7.49:1), and the tightest bubble in the
library is Windows XP (Luna) dark at 7.20:1. The bubble paints no secondary
line of its own, so it is measured for the body role alone.

A **saturated state tone** is not a selection surface. A box also paints
`accent` and `selected`, and a selectable run inside either is washed over that
fill — but both tones are drawn from the same accent family as the wash, so the
selection moves the fill toward the text instead of away from it. Measured, the
wash costs contrast in every one of the 80 placements on those two tones and
leaves 39 of them under the floor the unwashed pair already met — the selected
row's title, now at the body floor on the same role, accounts for the increase.
The tightest is Windows XP (Luna) dark's secondary line on a selected row at
3.78:1; the tightest body placement is the base dark theme's selected row title
at 5.33:1. One translucent role cannot be strong
enough for the page and weak enough for a saturated fill, so a selectable run
belongs on a content tone and a state row that needs selectable text paints it
on one. The exclusion is measured: `selection.test.ts` reads the tones the box
resolves and fails when one is neither measured nor recorded.

The **second field fill** was the last surface a field's text had no pair on:
a composite field paints the page role, so its value and placeholder sit on
`background` while the table measured only `input`. Measuring it found Aero
light's placeholder at 4.35:1 on its own window and macOS light's inherited value
at 4.49:1 on its, both under the 4.5:1 floor, so those values moved (§7). The
faint role then had to clear the same floor on a **chrome stripe**: a `<diff>`
hunk header is `muted` and its text is the faint role, which measured 4.29:1 on
the dark base's own toolbar, so the whole faint scale moved a step. The caret
joined the mark contract on the same fill: `indicatorSurfaces` names `input` as
its last strip, because the native text host paints the caret there.

The mark contract names the **four washes a row wears**, because a tick or a dot
is read on the row it sits in and not on the surface the row rests on. A menu or
combobox row tints `hover` under the pointer and `active` while pressed; a
**list** row tints `accent`, keeps `active` while the press is down and fills
`selected` once chosen — and its `leading` slot is documented for an `Avatar`,
whose presence dot is a mark. The selected wash was measured by nothing, and
Luna light's shared success step landed at 2.99:1 on it: a conversation's
presence dot vanished exactly when the reader selected that conversation. The
look carries the next green step as its `success` (4.37:1 there). The tightest
placement in the whole set is now macOS dark's primary mark on a list row's
`accent` wash, at 3.06:1.

A field's own fill holds a **third** text role besides the value and the
placeholder: the muted line. A time picker paints its separator and its clear
glyph `mutedForeground` inside a root filled `input`, a number field's stepper
chevrons take the same role, and the native host's `textMuted` is the same role
over the same fill. It was measured on every surface around a field and on none
inside one, so a brand that tints its field fill could swallow the colon between
two time segments with every report empty; the pair is measured now at the
secondary floor, and the tightest shipped placement is Windows XP (Luna) light's
line inside its own fill at 7.64:1.

The **status text** is measured the same way, on every strip a message can be
written on. A `FieldError` paints the tone's readable role and no fill of its
own, so the strip its form sits on is the surface it is read against: the page, a
card, a popover and a `muted` sidebar are all in the table, and the muted strip
was the one missing — the decorative half already put that tone's tint and edge
there. The tightest placement in the library is Luna light's warning text on its
beige toolbar at 8.78:1, so no palette moved.

An alert's **own copy** is the tint's second ink. `ALERT_DESCRIPTION` is
`text-foreground` and `AlertDismiss` paints its glyph the same role, so the body
copy and the close control are read on the tone's soft tint in the page's ink,
while the title and icon keep the tone's readable role. The paint is deliberate —
the page role is the most readable text a theme has — so `foreground` on each of
the four soft tints is in the table at the body floor, and the tightest shipped
placement is Windows XP (Luna) dark's `warningSoft` at 7.14:1. A brand that
repaints `foreground` or authors its own tint is measured there.

The surfaces that carry no text are measured too, because "subtle" is not
"invisible": a divider, a skeleton fill, the modal veil, a status message's soft
tint and its edge, the scrollbar thumb, the wash a row is hovered, pressed,
selected or accented with, the resting fill of a tonal action, the rail a bar
draws its value inside, the face a
disabled control wears and the shadow of a
raised surface are held to 1.05:1 against what they are painted on. A loading
dialog's skeleton is measured on the dialog's own `popover` fill, not only on
the page, a card and a muted list. The rail is measured on the page, a card and
a popover — never on the `muted` strip it is made of — and the five dark quiet
surfaces moved a step so a bar in a dialog has a total to read: the base dark
theme's `muted` **was** its `popover` at 1.000:1, and Windows dark's rail was
1.014:1 on its card, macOS dark's 1.028:1 and Aero dark's 1.013:1 on their
dialogs. The tightest rail is Windows 7 (Aero) dark's on its dialog fill at
1.052:1. The veil is composited over its surface rather than rejected as
translucent, and it is measured on every content strip a window holds behind a
modal — a card, a popover, a sidebar's `muted` toolbar, a segmented `secondary`
panel, a field's `input` fill, the `selected` wash a chosen row wears, the
`hover` wash a click leaves on the control the surface opened from and the
four soft status tints (a confirmation opened from an alert's retry covers the
message that asked for it); the
page's own void is exempt, because a black
page cannot be darkened and a high-contrast theme separates its dialog with a
border instead. The status edge is measured at the share
`statusTone` paints, on the tint it bounds, on the four strips a message sits on
and on the four washes a row tints under a badge — so a warning alert in a
confirmation dialog's body, a soft badge in a muted sidebar, and the same badge
in a hovered or selected row all have their boundary measured where they are
painted.
`decorativeFailures(theme, floor?)` runs the check, and `decorative.test.ts` holds
every shipped and platform theme to it. The status-tint half found the surface a message sits in: the page promised this
row, and the code measured only the edge, so a tint equal to its strip passed.
The base light theme's `successSoft` was 1.006:1 on its `muted` toolbar, Luna
light's `infoSoft` was its beige page at 1.00:1, macOS light's success tint
1.022:1 from its window, and the three lighter dark popovers were within 5%; the
light tints now sit one ramp step deeper with their text at 900, the dark tints
one step lighter with their text at 100, and Luna carries a lighter tint of its
own. It found two platform styles whose
inherited skeleton matched their own surfaces — macOS light's on a muted strip
(1.045:1) and Linux dark's on its card (1.004:1) — which now carry a `skeleton`
of their own, and the floating surface a loading dialog paints is a placement
too: macOS dark sat 1.049:1, Linux dark 1.031:1 and Windows dark 1.039:1 from
their own `popover`, so all three carry a placeholder fill now (the tightest
placement is the Luna dark look's dialog at 1.054:1). The state-wash half found
five aliases: the base dark theme's
`hover` was its `popover`, the base light theme's was its `muted` strip, and
macOS light's, Windows light's and Linux dark's were within one step of the
strips they tint (the Linux dark wash now sits at 1.06 on both the card and the
popover it can land on). The filled-action half found the same defect one control
over: `secondary` paints no border, so its fill is the whole button, and light
`secondary` was the `muted` value exactly (1.00:1) while macOS light, Linux
light, Windows light and the dark platform/look popovers sat 1.004–1.049:1 from
it. The base fill, its pressed wash, `borderStrong` and every affected style's
own control face moved with the contract. The boundary half of the same table
found the state the fill changes into: a bordered control keeps `borderStrong`
while its fill moves to the wash, and both base themes, high-contrast dark and
Linux light were under the floor there — the four values moved stronger, and the
message-tint pairs moved the neutral edge again.

The elevation tint is measured on the same floor, as a **ceiling**: the deepest
level is composited over the strips a raised surface can fall on — the page,
card, popover and toolbar, the `secondary` panel and `input` fill the veil names,
every wash a surface can open over when a context menu or a dialog opens
(`selected`, `accent`, `active`, and the `hover` a click leaves on its trigger)
and the four soft tints a message's own action
can open a surface over — so a shadow that passes may still read faint at its
blurred edge and one a reader cannot see is reported. That is how the
high-contrast dark page's black-on-black scale was found, and how the grey that
replaced it was found to match the same theme's `secondary` face (1.00:1 over a
segmented panel); the one-shadow rule and the role-owned tint stay
`elevation.test.ts`'s.

One pair class is measured by a helper rather than by the table, because it is
**derived** rather than stored: a link's colour. `primary` is a fill, so
`brandText(theme)` returns the brand where it already reads and steps it toward
the theme's foreground where it does not, and `brand-text.test.ts` holds all 16
shipped styles to the floor on the eight surfaces a link can sit on (§3).

Nothing else escapes: `coverage.test.ts` holds every role in `colorRoles` to at
least one measurement, so a role cannot ship unmeasured — it found
`disabledForeground` (now on the disabled floor) and `scrollbar` (now measured as
a decorative surface, because a thumb nobody can find is a scroller nobody can
find). The only role with no pair is `selection`, measured by `selectionFailures`
on the text inside the wash (body and secondary text); `shadow` is a decorative
placement now, and its exemption went with the placement.

A value the renderer cannot paint is the other silent failure: GPUix ignores a
colour string it cannot parse, so a typo keeps the property's previous value or
paints black. `invalidColorRoles(theme)` reports every role outside the grammar
the runtime's own parser reads — CSS Color 4 (`csscolorparser` 0.8.3 in the
pinned release): hex in any of its four lengths, a CSS named colour or a colour
function. It is what found the documented brand example pairing a saturated
violet with the dark theme's near-black on-colour — 4.24:1, below the floor. The
example now ships a white label with its violet, and the audit runs over it in
`theme.test.ts`. The measurement dialect is hex: the contracts read every length
the renderer paints — shorthand `#fff` widens, with or without the `#`, and a
fully opaque `FF` alpha byte is the colour it is rather than a share, which is
the form `alpha(color, 1)` produces — so a brand written the way a hand-written
theme usually is, is measured; a brand in `hsl()` or a colour name paints and its
pairs are reported unmeasurable (`docs/tokens.md` §Paint-ready values). An
elevation level a brand supplies is outside that report — it reads `colors` —
and an unpaintable shadow colour paints no shadow, so
`invalidShadowColors(theme)` names the level and position (§7).

A theme restored from storage can be **incomplete**: it may predate a role or an
elevation level the library has added since. The reports carry the absence rather
than throwing — `invalidColorRoles` returns the role with `value: undefined`,
`invalidShadowColors` returns the level once at position `0` with no colour, and
every contract that measures a pair reports it unmeasurable — so the gate returns
a failing report that names the role instead of a `TypeError`
(`docs/tokens.md` §Paint-ready values). The paint follows the same rule: a role
the theme lost paints nothing, and `elevationShadow` returns `undefined` for a
level it does not carry, so no surface throws on the defect the report just
explained (§7). A numeric group — and every numeric step
inside one — is not treated this way: adding either is a breaking change rather
than an additive one, because the components read every step, so the gate refuses
a theme missing one and names the group or the path (`typography.codeBlock`,
`density.controlHeight.sm`); such a theme is rebuilt from a shipped one with
`extendTheme`.

A value it cannot **lay out** is the third: a style batch is JSON, so `NaN` and
`Infinity` arrive as `null`, the property is dropped, and the element paints as
if the value were never set. Measured in the runtime's test renderer, a `NaN`
radius beside a valid border, type size and fill left those three on the element
and dropped only the radius; a negative size is accepted instead and paints
nothing usable (`fontSize: -4` laid text out at height 0). `invalidNumbers(theme)`
names the group, path, value and rule for every numeric token that cannot be
laid out — a shadow offset may be negative, a type size must be positive, a
control height and a row height must reach the pressable-target floor,
a type role's leading must reach its own size, because a shorter one starts
the next line inside this line's glyph box (§10, `docs/tokens.md` §Numbers),
a type role's weight must be finite, because the runtime clamps a real number
into its 1–1000 range while `NaN` is dropped and the role paints at the default
weight,
and the strong body role must share the body's size and leading and weigh more
than it, because the pair is one emphasis at one size — a plain weight
difference applied to two different measures is two roles, not one (§5).
A zero `borderWidth.strong` is the same silent class, not a flat design choice:
that width is the width of both focus rings, so the outline is zero pixels wide
and the fallback shadow has no spread — the only keyboard focus cue the library
paints would be invisible while every colour report stayed clean. The rule for
the strong border is therefore `positive`; the decorative `thin` divider may
still be zero. It is
also the one report that compares two groups: a control height that cannot
contain the `label` or `body` leading a control paints, or the `iconSize.md`
glyph it draws, is reported as `fits`, because the box is exactly that height
and the text or the icon would spill or clip while every number is still layable
(§6).

The contract is public, so a brand theme runs the same checks: `auditTheme(theme)`
reports all ten in one call — `invalidRoles`, `invalidShadows`,
`invalidNumbers`, `contrast`, `decorative`, `series`, `selection`,
`indicators`, `disabledFade` and `keyboardDim` — and `passed` is true only
when every list is empty. The contrast half
is measured against the theme's own `contrast` variant through
`contrastFloorsFor(theme)`, so a brand derived from a high-contrast theme is held
to AAA without the caller naming a floor set; an explicit `ContrastFloors`
overrides it. Every report that takes floors reads them that way — the contrast,
selection and indicator reports select the theme's variant themselves, and the
series surface floor comes from the same rule — so calling one of them on its own
cannot answer with different floors than the gate (§9). Two reports ignore those
floors: the disabled fade is a
mechanism, so it is held to `contrastFloors.disabled` in every variant
(§8 records why the fade cannot carry a high-contrast theme), and the keyboard
dim is a where-can-Tab-go cue rather than a reading mode, so it is held to
`decorativeFloor` (1.05:1) in every variant (§8). The parts are
public too: `contrastRatio(foreground, background)`
measures two opaque roles, `contrastPairs` with `contrastFloors` /
`highContrastFloors` names the text and boundary pairs and their floors,
`decorativeFailures(theme, floor?)` measures the subtle surfaces,
`seriesFailures(theme)` measures a categorical scale — on its plot, against
itself and after each colour-vision deficiency — while
`selectionFailures(theme, floors?)`
measures the body and secondary text a selected run sits in,
`indicatorFailures(theme, floors?)` measures the marks a component shows and
`keyboardDimFailures(theme)` the label the runtime's keyboard dim erases.
Nothing about the requirement is private to this repo.

### Target sizes

Colour is not the only measured contract. Every pointer target keeps
`targetSize.minimum` — 24px — and a touch-first surface may raise it to
`targetSize.comfortable`, 44px. Every shipped control height and every shipped
row height is at or above the first floor; an icon-sized part — a checkbox's
16px box, a 12px chevron — keeps
its drawing and reserves the difference as padding with `targetInset`, so the
look does not change and the target still reaches the floor. The floor is fixed
rather than theme-owned: a brand can restyle the control, not lower the target.
`target.test.ts` holds the helper and every density against it; adoption by the
component packages is recorded in `TODO.md`.

Not covered, deliberately:

- disabled text (WCAG exempts inactive controls); it stays visibly dimmed;
- a field's placeholder inside a selection — it is painted only while the field
  is empty, so there is no run for a reader to select;
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
| a leading shorter than its type is accepted | the renderer advances the baseline less than the glyphs are tall, so consecutive lines collide; `invalidNumbers` reports the role's `lineHeight` as `leading` |
| a non-finite font weight is dropped before it reaches native | the role paints at the runtime's default weight, so a heading loses its emphasis; `invalidNumbers` reports the role's `fontWeight` as `finite` |
| a strong role at the body's weight is accepted | the two roles share a size and a leading, so the emphasis paints as plain text; `invalidNumbers` reports `bodyStrong.fontWeight` as `emphasis` |
| a strong role that does not follow a raised body is accepted | the pair is one emphasis at one size, so a title becomes the smaller or looser line; `invalidNumbers` reports `bodyStrong.fontSize` or `bodyStrong.lineHeight` as `emphasis` |

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

Overrides merge by group; typography merges field by field; a density preset's
`controlHeight` and `controlPaddingX` merge size by size, so a brand that raises
one size keeps the others; elevation levels are replaced as whole arrays; the
mode is immutable. Nothing mutates the base, so a theme can be created once at
startup and shared. `bodyStrong` is its own role, so a brand that changes the
body size names it too — the pair is one emphasis at one size, and
`invalidNumbers` reports a strong role that does not follow as `emphasis`.

A brand may change any value but should not remove roles: every component
expects the full role set. A theme restored from storage can still be missing a
role it predates — the library adds roles additively. That is a report, not a
crash: `invalidColorRoles` names it with `value: undefined`, its pairs measure
unmeasurable, and `passed` is false (§9), so the repair is one `extendTheme` call
over the stored values. A brand that needs a different structure should add
roles in the tokens package, not fork components.

Overrides are plain data, so `extendTheme` cannot reject a colour the renderer
would ignore or a number it cannot lay out. The audit is the gate: `auditTheme(theme)`
runs all ten checks — an unpaintable role, an unpaintable shadow in a level the
brand supplied, a size, length or shadow geometry the renderer would drop, every
pair below the floor its variant asks for, every decorative surface too close to
its background — including the derived hover and press a filled role paints
(§8) — a data series lost on its plot or to a colour-vision deficiency,
a selection wash that hides the body or secondary text inside it, an indicator
mark nobody can find, a disabled label the fade erases, and a label the
keyboard dim erases while another control holds the focus; run it over the
resolved theme before it ships and assert `passed` in the package's own tests.

One contract sits beside the gate rather than inside it: `invalidScales(theme)`
holds every named ladder to its order — spacing, radii, border weights, icons,
the type hierarchy, the control sizes and the elevation levels — because a scale
is selected by name, and a brand whose `sm` control is taller than its `lg` has
a `size` prop that lies while every value is still layable. The audit's report
list is printed by the docs site's readout, which words each report, so folding
this in is one coordinated change with that page (`TODO.md` → Interlocks); until
then a brand runs `invalidScales` beside `auditTheme`. §6 and
[`tokens.md`](./tokens.md#scale-order) carry the rule and the shipped style it
corrected.

## 12. Non-goals

- No component-level token catalogue. Semantic roles plus scales are enough; a
  per-component token file would duplicate the same decisions.
- No theme-authoring UI in the library. The docs site's `/docs/themes` editor is a
  consumer of the same `Theme` shape; the library ships the API, not the editor.
- No motion tokens here. `@gpuixui/motion` owns durations, easings, springs and
  inertia; this package stays colour, type, space, radius and elevation.
- No web preview pretending to be native. The playground is the visual proof.

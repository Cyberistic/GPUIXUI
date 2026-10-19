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
carry a solid role with a readable foreground, a soft pair (`xSoft`,
`xSoftForeground`) with a designed edge (`xSoftBorder`) for alerts, badges and
toasts, and a text role (`xText`) for labels, icons and indicator dots on a plain
surface or the wash a row paints. `info` has its own blue ramp, so an
informational message can never be mistaken for a primary action. A component
names a status family and reads its roles; it never mixes a readable text colour
out of a solid status colour at runtime, and never special-cases a mode to make a
tint readable. The solid roles are fills: light `warning` is 1.78:1 against the
canvas, so it is never the colour of text or a dot.

This keeps a brand theme small: overriding `primary` changes every primary
action in the library. A brand that also uses its accent as text overrides
`primaryText` beside it, because a fill and a foreground carry different
contrast obligations: `primary` is a surface with `primaryForeground` on it, and
`primaryText` is the readable step for a link, label or icon on the plain
surfaces and the washes a link paints.

A brand that changes a fill moves the whole family: `primaryForeground`,
`primaryHover`, `primaryActive` and `primaryText` belong beside `primary`, and
`accentForeground`, `accentHover` and `accentActive` belong beside `accent`. A
fill that is also a value indicator moves `track` with it, because a progress
segment paints the fill on the groove. An inherited state keeps the base theme's
hue running the interaction, and an inherited foreground can miss the on-colour
floor — the dark example's inherited foreground measured 4.24:1 on its brand
fill. The executed example in `packages/tokens/src/brand-theme.example.ts`
carries the complete palette, and `themeContrastFailures` holds it to the same
floors as the shipped themes.

## 4. Light and dark

Dark mode is designed, not inverted:

| Concern | Light | Dark |
| ------- | ----- | ---- |
| canvas | `#F6F8FA` | `#11141A` |
| raised surface | `#FFFFFF` | `#191D25` |
| floating surface | `#FFFFFF` | `#222730` |
| primary | dark iris `#5F4BDB`, white text | light iris `#A7A9FF`, near-black text |
| destructive | `#CC3439`, white text | `#FF6B6B`, near-black red text |
| shadow | graphite tint | black tint |

Both themes expose exactly the same 70 roles; the type system and the colour
test enforce it. On-colour text switches with the surface — primary text is not
always white. Warning is amber in both modes with near-black text because white
on amber cannot reach 4.5:1.

Each mode also has a **high-contrast variant** that raises secondary and
on-colour text to 7:1 and focus rings and essential boundaries to 4.5:1, using
pure black and white canvases. It is a value variant of the same roles, so no
component changes; it also declares `contrast: "high"`, so the contract in §9 is
the one its own themes are checked against. See §9 and §11.

There is no automatic OS appearance detection: GPUix exposes no appearance
query. The application chooses `lightTheme` or `darkTheme` and passes the
result.

The quiet `muted` panel is a grouping surface, not a second canvas. In light mode
it sits one step toward the card — canvas, panel, card — so the `hover`,
`accent`, `selected` and filled-control values painted on a sidebar row or a
settings-group control stay perceivable; in dark mode the panel is a raised
neutral and the `hover` wash is a designed step between it and the `active`
press (plan `309`). A fill that matches its panel is not a state. A design that
draws a panel edge uses `border`, whose floor already covers the panel.

## 5. Typography

Ten roles, one job each:

- `display` / `h1` / `h2` / `h3` — hierarchy; semibold, generous leading.
- `body` / `bodyStrong` — reading and emphasis at 14/20.
- `label` — controls and form labels at 13/18, medium weight.
- `caption` — metadata and helper text at 12/16.
- `code` / `codeBlock` — mono at 13/20 and 12/18.

The scale is two ladders: prose (`display` → `caption`) and code (`code` →
`codeBlock`). `bodyStrong` shares `body`'s size and is a weight variant, so it is
on neither ladder. `textRoles` is the index of all ten roles in documentation
order; the package test holds it, the `Typography` interface and the docs table
in agreement, so the type scale is enumerated in one place.

The numeric contract holds an edited theme to the same two ladders and to the
weight-variant rule: `body` → `bodyStrong` may not shrink and must gain weight,
so a copied theme cannot flatten emphasis or render a lower role larger than the
one above it.

The three shipped weights — `400`, `500` and `600` — are a scale choice, not a
type restriction: `FontWeight` is a number in the CSS range `1…1000`, and
`themeMetricFailures` holds a copied theme's weights to that range, so a
variable family can name its own step.

Why 14px body: it is the smallest size that stays comfortable in long desktop
sessions while leaving more room for data density than a 16px web default.
Labels are one step smaller because controls are scanned, not read.

Sans is GPUI's `.SystemUIFont` sentinel, which GPUI resolves to the operating
system's own UI font, so the reading face follows the platform without the
library naming a face the machine may not have. Mono comes from the platform
table (`platformTypes`): `Menlo` on macOS, `DejaVu Sans Mono` on Linux,
`Consolas` on Windows, `Menlo` for a platform the library does not know. The type
scale is shared by both themes and is not changed by density.

A platform style is a **real theme**, not a docs-only style sheet:
`getPlatformTheme(platform, mode, contrast?)` derives one from the identity with
`extendTheme`. The three real variants — macOS, Linux and Windows — change the
families, radii, density, motion, surfaces, accent and shadows so a preview reads
as that platform; the Default variant returns the identity unchanged. The shared
status, disabled and scale tokens stay put, so the default identity remains the
system and the platform looks are variants of it, never four design systems. At
high contrast the families and shape apply — each platform's radii, density,
motion and elevation geometry — while the AAA colour set, the `shadow` tint
included, and the opacity that tint was designed with win over platform
resemblance. A high request on a default theme builds that AAA palette too, so
the requested level is the level the result carries; a platform's colours are
designed at the default floors and never repaint it. The docs toggle and a native
build call the same function.

Two **recipes** ship beside those variants: Windows XP (Luna) and Windows 7
(Aero), in `platformRecipes`. A recipe is an edition of a platform, not a fifth
platform: `getPlatformRecipeTheme(recipe, mode, contrast?)` resolves it through
the same path, and `platformNames` stays the four-variant axis. The recipes also
show the honest limit of the role model: XP's filled blue selection bar is an
application composition, because a `selected` row is a measured surface that
secondary text, a status label, a disabled label and a control edge must
survive. Aero's glass is solid layers, not blur.

An application can name an **installed** family the same way, with
`extendTheme(base, { typography: { sans: … } })`, so a brand face that every target
machine has can travel in the theme. A face shipped **with** the application
cannot: GPUix 0.10.0 has no `registerFont`, and the capability is unreleased on the
GPUix main branch. The identity therefore stops at the operating system's fonts
today. The library ships no font file; choosing and licensing a face is the
consumer's.

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

It changes control height, horizontal padding and row height only. Type sizes
and the spacing scale stay fixed, so a density switch cannot reflow text
unexpectedly. Components read `controlHeight(theme, size)` and
`controlPaddingX(theme, size)` instead of hardcoding numbers.

A control's horizontal padding is a shape: it stays positive and at least the
theme's own hairline (`spacing["2xs"]`, 2px), because it is the only space
between the label and the border the control paints inside its own box — a flush
inset renders the glyph on the edge, and the numeric contract reports it.

Icon and avatar sizes are **fixed tiers**, not density metrics: icons run
12/14/16/20/24 and avatars 20/26/32/40, read by name from `theme.iconSize` and
`theme.avatarSize`. A person chip is a size tier, not a spacing decision, so it
does not move when the workspace gets denser.

Icon size is a tier; alignment is a rule. An icon shares the horizontal flex row
of the text it belongs to and is centred on the cross axis — never
baseline-aligned, because the runtime's line box and the SVG's own box do not
share a baseline. The gap between icon and label is `spacing.sm` (6px). An
icon-only control is square at the control's height and takes no horizontal
padding, so its hit target stays the size the density preset promises. Inline
icons take `xs` so they do not raise the line box, control icons `md`, and
toolbar or navigation icons `lg` or `xl`. The icon set owns its markup rules; the
design system owns the size tier and the alignment.

The inline avatar follows the same rule one row over: `avatarSize.xs` is
bounded by `density.rowHeight`, because a dense `ListItem` fixes its height at
`rowHeight` and documents its leading slot for an avatar. A mark taller than
the row it leads is not inline; the `md` tier is the default face for a card
header or a message, not a row mark.

Component dimensions are **fixed**, not density metrics: overlay surfaces take a
180px minimum and a 220px default width, and a long list scrolls at 320px; a
toast is 380px wide, a preview card runs 240–360px, and an icon or clear control
inside a field is 16px. They live in `theme.dimensions` so a brand can widen a
dialog or a toast without touching component source. A keycap is 20px and holds
one `caption` line plus its two borders; the metric contract reports a theme
whose caption leading outgrows it. A drawer opens 320/400/560px wide, or
240/320/420px tall from the bottom; a message viewport never shrinks below 160px,
and a carousel's active dot is 18px beside an idle 8px one. A dialog's surface is
360/480/640px wide at `sm`/`md`/`lg`, a calendar day cell is 34px, a two-digit
time segment is 26px, and an avatar's presence dot is 10px — at most half the
smallest avatar the theme carries. A notification inbox is 320px wide and 380px
tall at most, its scrolling list holds 280px, and its unread marker is 6px — the
panel contains the list, and the list holds one row. A date trigger is 220px
wide and holds its insets, gap, disclosure glyph and one `label` glyph; its
calendar grid is seven 34px cells (238px) before the popover's padding, so it is
content-sized, not an `overlayWidth` surface.

## 7. Radii, borders and elevation

Radii: 0, 4, 6, 8, 12, full. Small controls use 4 or 6; cards 8; dialogs 12.
Pills and avatars use `full` (clamped by the renderer to half the short side).
The numeric contract holds `full` to the largest corner step the theme carries
and to at least half of the larger of the largest control and the largest avatar
— each read from the theme's own scale, so a brand that adds a step moves the
bound — so a theme that shrinks it cannot turn a 40px avatar into a rounded
square.

Two border roles:

- `border` is decorative — dividers and card edges. It is intentionally subtle,
  but held to a 1.05:1 perceivability floor (3:1 at high contrast), so subtle
  never means invisible. A bordered control paints it on the fill behind it —
  `secondary` at rest, the `secondaryHover`/`secondaryActive` steps of a filled
  neutral control, the generic `hover` and `active` washes, and the `accent`,
  `accentHover` and `accentActive` fills of an outline toggle that is on
  (`controlFillRoles`) — so the floor covers those eight fills as well, and a
  pointer state never turns the fill into the divider's own value. A status
  panel that separates a footer or an action row with a line paints it on a soft
  status fill, so those four fills carry the same floor; `xSoftBorder` is the
  edge around the surface, not a divider inside it.
- `borderStrong` is functional — input and control boundaries. It meets 3:1
  against the `background` canvas, a `card`, a `popover`, the `input` fill a
  field paints, the `muted` panel, the `hover`/`active`/`accent`/`selected`
  washes a row paints and the `infoSoft`/`successSoft`/`warningSoft`/
  `destructiveSoft` fills a tone-tinted Alert paints, so a checkbox or field is
  perceivable without relying on fill alone.
  The numeric contract holds `borderWidth.strong` at least `thin`: the focus
  ring may match the default border but never be thinner than a divider, or the
  only focus indicator is less prominent than the decoration it surrounds.

Elevation is a semantic level, not a literal shadow: `sm` for resting cards,
`md` for menus and popovers, `lg` for dialogs and the command palette. The
runtime paints one shadow per element — no `inset` and no shadow list — so a
level is a list a web renderer can composite, a shipped level carries at most
one entry, and the entry the runtime paints is read with
`elevationShadow(theme, level)` (`elevationShadows` resolves the whole list).
The level names are an order, not a label: the numeric contract holds each
level's painted feather (`blurRadius`) to be no smaller than the defined level
below it, in `elevationLevels` order — a theme that defines the reserved
`overlay` level places it above `lg` — so a copied theme cannot make a dialog
sit closer to the surface than a resting card. Opacity stays a mode decision — a large shadow may be fainter and a flat
theme may zero the feather at every level. A level is geometry plus an alpha;
the tint is the single `shadow` role, so a
brand retints every level by editing one value. Overlay layering uses the
`overlay` scrim colour, a translucent wash a Dialog paints across the window.
The scrim is held to the same 1.05:1 perceivability floor as every other painted
value, on the eighteen surfaces it covers — the four base surfaces
(`background`, `card`, `muted`, `popover`), the `input` fill a form paints, the
persistent `selected` fill a table or list keeps, the four resting filled
actions (`primary`, `secondary`, `accent`, `destructive`), the three solid status
chips a Badge paints (`info`, `success`, `warning`), the raised action a status
panel carries (`softAction`) and the four soft
status panels (`infoSoft`, `successSoft`, `warningSoft`, `destructiveSoft`) —
because a scrim that composites to the surface beneath it is an invisible modal
backdrop. The transient pointer states are the exclusion: `hover`, `active` and
the filled families' `xHover`/`xActive` steps are gone by the time the pointer
reaches the dialog, so a scrim over one is not a composition the system
supports. On the high-contrast dark theme's pure black canvas a dark veil cannot
darken anything, so that theme veils with light: the modal is separated by a
light wash, its own edge and elevation instead of a darker backdrop. Its
elevation is light too: `highContrastDarkElevation` applies 10%, 14% and 18% of
the `#FFFFFF` tint, because a black tint measured **1.000:1** at every level on
that canvas while the AAA modal claims elevation. `elevationSurfaces` is the
six persistent page surfaces a raised card, menu, popover or preview card floats
over — the canvas, a card, the quiet `muted` panel, the `input` fill a flipped
popover opens over, the `selected` fill a context menu opens over and a floating
surface — and every defined level
is measured composited over them. A menu or popover (`md`) also opens across the
resting content fills `elevationContentSurfaces` names — the four filled
actions, the three solid status chips, the raised panel action and the four soft
status panels — because a dropdown opens across the button beside its trigger;
the `sm` and `lg` walks stay on the page surfaces. The tightest shipped pair is
**1.058:1** (AAA dark, `md` on `info`); over the page surfaces alone it is
**1.061:1** (identity dark, `sm` on `background`) and the AAA dark page pair is
**1.207:1**. At high
contrast a platform style contributes a level's geometry and the AAA set keeps
the opacity its tint was designed with; a dark-mode platform's 40–80% over the
light tint would paint a near-white halo.
`elevation.overlay` is a different concern — a reserved shadow level, empty so
the shape stays stable; a consumer who defines one is held to the same finite
geometry and alpha as `sm`, `md` and `lg`, because `elevationShadow` will
paint it.
Dark shadows are darker and more opaque because contrast between surfaces is
lower.

A raised element normally floats over the page, which `elevationSurfaces` names —
including the persistent `selected` fill a context menu opens over and the
`input` fill a popover flipped above its trigger opens over.
A modal is the exception: its face and its shadow sit on the scrim, so the face
is measured through it — `dialogSurfacePairs` composites `overlay` over every
surface `overlaySurfaces` names, the six layout surfaces and the twelve resting
content fills, and holds `popover` to the 1.05:1 perceivability floor, because a
theme whose scrim meets its own floating surface ships a dialog with no face.
The tightest shipped pair is **1.079:1** (Linux dark on `destructive`). The
shadow is not a modal separation in the default dark sets and cannot be made one:
on the identity dark scrim (`#060709`) the `lg` tint paints **1.035:1**, and pure
black over the same scrim reaches only **1.042:1**, under the floor. The edge is
not a fallback either: macOS dark's face met the scrim over its `primary` at
**1.021:1** until plan `526`, and a dialog's `border` measures **1.006:1** over a
scrimmed status chip — under the divider floor — while the AAA light edge would
need 3:1 against a scrimmed canvas it meets at 1.074:1. The face is the carrier,
so the macOS dark scrim is 82% (`#000000D0`).

Motion is a scale beside elevation, not a component detail: `step` (a spinner's
frame) and `pulse` (a skeleton's half cycle) drive interval indicators, and
`fast`/`normal`/`slow` align with the `sm`/`md`/`lg` surface classes, so a
tooltip, a menu and a dialog move at the pace their elevation suggests. The
tokens hold milliseconds because that is what a timer takes;
`motionTransition(theme, level, phase)` converts to the seconds the runtime's
`motion` prop takes. GPUix animates only `width`, `height`, `opacity`,
`top`/`right`/`bottom`/`left` and `borderRadius` — there is no transform, no
rotation and no colour interpolation — so the design never promises them. A
cubic-bezier easing is four finite control points with both x values inside
`0…1`; the runtime rejects a transition it cannot interpolate, so
`themeMetricFailures` holds the tuple the way it holds every timing.

Overlays are ordered by tree order, because the runtime has no stacking context:
the mounting rule and its no-portal limitation are documented once, under
[Layering](./tokens.md#layering).

## 8. Interaction states

| State | Role / mechanism |
| ----- | ---------------- |
| hover | `hover` wash on ghost and subtle surfaces, held to the 1.05:1 perceivability floor on `background`, `card`, `popover`, the quiet `muted` panel it paints on and the field's `input` fill, where a stepper or an adornment action paints it; a ghost or outline control paints no fill at rest, so its ladder is `surface` → `hover` → `active`; filled actions step to their family's `xHover` — opaque, contrast-checked, one 1.05:1 step from the resting fill — instead of compositing an alpha fill; an action on a soft status panel paints `softActionHover`/`softActionActive` instead, because a canvas-tuned wash has the tint's own luminance (plan `394`) |
| pressed | `active` wash on ghost and subtle surfaces, held to the same floor on `background`, `card`, `popover`, `muted` and the field's `input` fill and one 1.05:1 step from the `hover` that precedes it (`washStepPairs`); filled actions step to `xActive`, one 1.05:1 step past their hover; the panel action's press is `softActionActive`, one step past `softActionHover` (`softActionStepPairs`) |
| loading | `skeleton` fill with `pulse` (or `step`) motion, held to the 1.05:1 perceivability floor on `background`, `card`, `popover`, the `muted` panel and the four row washes it fills — `hover`, `active`, the `accent` wash a selectable row hovers and `selected`; the identity and high-contrast skeletons were the `active` fill until plan 094; the primitive paints the role at `skeletonPulseOpacity` (0.6) for half of every cycle, so `skeletonPulsePairs` holds that dim frame to the same floor on the same surfaces and reports it with the fraction as `opacity`; the active indicator uses `primary` |
| selected | `selected` + `selectedForeground`: the fill is held to the perceivability floor on `background`, `card`, `popover`, `muted` and the field's `input` fill and one 1.05:1 step past the `accent` wash a selectable row hovers with (`selectionStepPairs`); the label is held on `selected`, the `hover`/`active` pointer washes and the `accent` wash; a toggle that is on steps `accent` → `accentHover` → `accentActive` with `accentForeground` on all three |
| link | `primaryText` on `background`, `card`, `popover`, the `muted` panel, the `hover`/`active` washes a link paints, the `accent`/`selected` fills a selectable row paints under it and the four soft status fills a link in a status panel sits on, through a text selection too; `primary` is a fill and is never the colour of text |
| disabled | `disabled` fill + `disabledForeground`, which keeps a readable dim (3:1, 4.5:1 at AAA) while staying well below secondary text, on the `disabled` fill, `background`, `card`, `popover`, the `muted` panel, the `hover`/`active`/`accent`/`selected` washes, the four soft status fills, and through the composited `selection` wash on the same surfaces; the control paints its `border` edge on that fill so its shape survives on any panel, plus a non-colour cue where possible. A filled action inside a tone-tinted status panel is the one surface where the canvas `disabled` fill is not a shape — it measures 1.0066:1 on XP light's `warningSoft` — so it keeps the resting `softAction` fill and paints `disabledForeground` (`inactivePanelActionPairs`), a step below the enabled `softActionForeground`; because that fill is opaque, the label is also held through the inverse `selectionOnFill` veil (`selectionFillInactivePairs`); a disabled control does not step, and a ghost disabled action keeps no fill |
| invalid | a `destructive` edge on the `input` fill a field paints and on the `background` canvas a transparent field paints, held to the essential-boundary floor (3:1, 4.5:1 at AAA); the message itself uses `destructiveText`, not the fill |
| focus | `focusRing(theme)`: a zero-offset, zero-blur `boxShadow` spread by `borderWidth.strong`, painted from `ring` while the control is focused, on `background`, `card`, `popover`, the `muted` panel, `accent`, the `hover`/`active`/`selected` washes, the four soft status fills and the `track` groove a slider's thumb is centred on (`ringTrackPairs`); an invalid control recolours it with `destructive` on the same surfaces except the canvas, which the invalid field edge already covers, while an invalid slider keeps the accent ring |
| text selection | `selection` wash via `selectionColor`; body and secondary text keep their floors through the composited wash on every surface a glyph is selected on, including the four soft status fills (`xSoftForeground`, `foreground`, `softActionForeground` and `mutedForeground`), a card's own `cardForeground` beside its default `foreground`, a selected row's title (`foreground`) beside its inherited label, a status label (`xText`) on the same nine surfaces, a brand-toned link (`primaryText`) on those nine and the four soft fills, and an unavailable label (`disabledForeground` on the thirteen surfaces `inactiveSurfaces` names), and the wash itself stays perceivable, including on the `disabled` fill an unavailable label keeps; content painted on an opaque filled surface — a filled action such as `softAction`, or a solid status chip — uses `selectionOnFill`, a neutral 15% veil, because the accent-tinted wash cannot be seen on those fills (1.000:1 on `primary` in six shipped palettes, and under 1.05:1 on a solid `success` or `info` chip); the veil is measured on each fill's resting value, and a filled control's `xHover`/`xActive` fills are outside its reach (60 of 360 labels miss the on-colour floor, worst 3.353:1, and no neutral alpha clears both floors at AAA light), so its chrome sets `userSelect: "none"`; that same property opts any other chrome out |
| status | a family (`info`/`success`/`warning`/`destructive`) via its solid role for a fill — held to 1.05:1 on the eight surfaces a status chip sits on (`statusFillPairs`), because a solid role is a fill — its soft pair and designed edge through `statusTone(theme, tone)`, or its `xText` role for labels, icons and dots on `background`, `card`, `popover`, the `muted` panel or the `hover`/`active`/`accent`/`selected` wash a row paints; a tone from untrusted data narrows with `isStatusTone`. The shipped Toast is the one exception: it paints its glyph and 3px bar with `xSoftForeground` on the `popover` card, so that pair is held at the secondary floor until the `components` migration to `xText` lands (plan 348) |

Focus never changes layout: the ring is a shadow, painted outside the border box,
so gaining focus reflows nothing. GPUix 0.10.0 has **no `outline*` properties and
no `focusVisible` state** — a nested style offers only `hover` and `active`, and
`boxShadow` is a single shadow — so `focusRing(theme)` is the one shape the
runtime can draw. The component applies it while it holds focus, which means a
mouse press shows the ring too: there is no `:focus-visible` to distinguish a Tab
from a click. A design that needs that distinction must keep a press from
focusing the control (that limitation is real and is not worked around). An
invalid field's ring takes `destructive`; the runtime can draw only one ring, so
the error colour *is* the focus indicator and the boundary floor applies where it
is painted, not on the field's own fill.

A field is not a filled action: at rest its edge is `border`, under the pointer
`borderStrong`, and while pressed `ring`, all three painted on its own `input`
fill. The focus shadow still surrounds the field, so the two uses of the ring
role are measured separately: the shadow on the surface behind the control, the
pressed edge on the field's fill. The pressed edge was the last field pair to
join the contract (plan `343`); every shipped theme already cleared it, so no
colour moved.

A native field's caret is the accent's **readable ink** (`primaryText`), not the
`primary` fill: a caret is a 1px mark, and the fill was tuned for a label on top
of it. `nativeFieldTheme(theme)` is the `theme` prop GPUix 0.10.0 reads for
`caret`; `caretPairs` holds `primaryText` on the field's `input` fill, and the
four surface tones and four row washes an in-place editor paints are already
held by the `primaryText` text pairs. On macOS dark the fill measures **2.748:1**
on a selected row and **2.836:1** on a pressed one, under the 3:1 mark floor.
Without the prop the built-in dark caret measures **2.795:1** on the AAA light
quiet panel, under the 4.5:1 mark floor.

A filled control steps through its own family — `x` → `xHover` → `xActive` — so
the state is an editable, measured fill, not a translucent tint that takes its
colour from the surface behind it. `primary`, `secondary`, `destructive` and
`accent` each
carry the full trio, and the on-colour foreground is held to its floor on all
three. The generic `hover` and `active` roles are the washes a ghost or outline
control paints; they are not a filled control's states. The outlined neutral
family keeps its `border` edge through all three steps, so the press is a fill
change rather than an edge erasure. The neutral fill needs
its own roles most: `secondary` is only just distinguishable from the canvas, so
a 90% alpha "hover" changed it by 1.009:1, and the press came out lighter than
the hover. A filled control is still a surface in its own right, so every fill
and wash is also held to 1.05:1 against the five surfaces it paints on —
`background`, `card`, `popover`, the quiet `muted` panel and the field's
`input` fill (plan `309`). A field hosts its own controls — the `NumberField`
steppers paint `hover`/`active` inside it — so a theme whose `input` equals its
`hover` erased the stepper's state while every check returned `[]` (plan `595`).
The audit found the identity light panel was the same value as its `hover`,
`secondary`, `accent` and `selected` fills, so a sidebar row had no pointer
feedback and a selected row was invisible; the identity dark `hover` was its
`muted` and `popover`; macOS light `selected` was 1.021:1 on its canvas and
Linux light `accent` 1.001:1 on the panel. The light panel now sits one step
toward the card and the two light accents and the AAA dark accent move one
designed step; no text, edge, ring, selection or tint pair changes.

The inverse selection veil is measured on each fill's **resting** value, because
that is the fill content keeps while it is selected. A filled control is
different: it steps to `xHover`/`xActive` under the pointer, and **60 of 360**
shipped filled-family label pairs miss the on-colour floor at the 15% veil (worst
**3.353:1**, macOS dark `accentActive`), while no single neutral alpha clears both
that floor and the 1.05:1 veil floor on the high-contrast light set. A state-fill
pair would publish a guarantee the AAA palette cannot meet, so a control opts its
label out with `userSelect: "none"` — the same rule as any chrome — and the
resting pairs cover content that keeps its fill.

The generic `hover`/`active` pair is a ladder of two, not two unrelated washes:
a ghost or outline control paints no fill at rest, so `active` is held one
1.05:1 step from `hover` (`washStepPairs`), and a consumer theme that collapses
the press is reported the way a collapsed filled family is (plan `357`).

A selectable row adds one state to that ladder: it paints `accent` under the
pointer and keeps `selected` once chosen, so `selected` is held one 1.05:1 step
from `accent` too (`selectionStepPairs`, plan `381`). In the identity — both
modes and both contrast levels — and macOS light the two roles were the same
fill, so hovering one row looked like selecting another and the click changed
nothing; Windows light, macOS dark and XP light were under the step floor. The
selected fill moved one designed step in those eight sets, and macOS light's
`selectedForeground` moved with its deeper fill. A selected row keeps its fill
under the pointer: the shipped `List` still paints the unselected `accent` wash
over a selected row, which is recorded cross-team.

The designed family is the preferred state, but the contract also guards the
composition that ships today: the secondary Button still keeps
`secondaryForeground` while its fill becomes the generic `hover` or `active`
wash, so both pairs are held to the secondary floor (plan `334`). A migrated
consumer paints `secondaryHover`/`secondaryActive` and the extra pairs are
simply no longer exercised.

A status panel's action is the one place no canvas family can go. The four soft
status fills sit in a narrow luminance band in each mode — light `0.742–0.765`,
dark `0.012–0.039` — and `hover`, `active` and `secondary` are designed to be
perceivable against `background`, `card`, `popover` and the quiet panel, whose
values are in the same band: **80 of the 288** shipped fill-on-tint pairs measure
under 1.05:1, the worst Windows light `active` on `destructiveSoft` at
**1.0042:1**. Moving the washes would break the canvas pairs and the neutral
control in every set, and moving the tints would break their surface, text and
selection floors, so the panel gets a designed raised family instead:
`softAction` at rest, `softActionHover` and `softActionActive` as its ladder, and
one `softActionForeground` readable on all three. A filled action paints all
four; a ghost action — a dismiss control — skips the rest step and paints
`softActionHover`/`softActionActive` on the panel with the same
`softActionForeground`. `softAction(theme)`
returns the family in one call, and the four lists
(`softActionPairs`, `softActionStepPairs`, `softActionLabelPairs` and the label's
pairs in `selectionSoftPairs`) hold it to the
surface, step, secondary and body floors in every shipped set (plans `394` and
`512`). A disabled filled action keeps the resting `softAction` fill and paints
`disabledForeground` — the raised fill is the action's shape, and the canvas
`disabled` fill measures **1.0066:1** on XP light's `warningSoft` — so
`inactivePanelActionPairs` measures the resting label and a `textTiers` entry
keeps it a step below `softActionForeground`; it does not step, because a
disabled control receives no pointer state.

A Toast is a `popover` card, not a tinted panel: `toast/viewport.tsx` paints the
card `popover` and tones only the glyph and the 3px bar. `softAction` equals that
card in every light shipped set (**1.0000:1**), so a Toast action paints the
canvas neutral family — `filledControl(theme, "secondary")` — which is measured
on `popover`.

The brand families have not migrated either, and their cost is the label rather
than the fill: `components` hovers a primary action at 50% and `primitives` at
90% and 80%, which drops the label to **2.06:1** on a Linux light card at 50%
and **3.40:1** at 80%, under the 4.5:1 every designed step clears. No palette
can make a half-alpha fill carry its own label — even a black fill over a white
card reaches only 4.00:1 — so `filledControl(theme, family)` returns the designed
trio and its one foreground, and the consumer migration is recorded in
`TODO.md`.

An inactive control is not an opacity composite. It paints the `disabled` fill
with `disabledForeground` on it and its `border` edge around it: the label keeps a
readable dim (3:1, 4.5:1 at AAA) and the edge keeps the shape, because the fill
is allowed to sit within the panel's own value — no neutral clears a white card
and the quiet panel at once. A filled primary action at 50% opacity measures
**1.575:1** on the identity light canvas, which is the state a designed pair
replaces: GPUI composites an element and its children as one group, so the label
is dimmed with the fill it sits on, not only the fill.

A row's metadata keeps its `mutedForeground` role on every wash the row paints —
`hover` and `active` for pointer state, `accent` where a selectable row hovers,
and `selected` when it is selected. That is why the secondary floor covers the
washes, not only the plain surfaces: a description is read while the row moves.
A value indicator's unfilled groove is `track`, not `muted`: identity dark's
`muted` equals its `popover` and every platform dark style's equals its card, so
a track painted with it vanished on the surface it sat on — and an indeterminate
progress bar, which is only its track, painted nothing at all. The role is
measured on the four base surfaces, the persistent `accent`/`selected` row fills,
the `hover`/`active` washes a row or a slider paints under the pointer and the
four soft status fills a status panel provides, and its four progress fills are
marks against it (plans `347` and `503`). A rail that disappears while the row
is hovered or inside an Alert erases an indeterminate indicator, because the
groove *is* the value until the fill moves.
A bordered control keeps its `border` edge on the fill it paints, so the divider
floor covers `secondary`, `secondaryHover`, `secondaryActive`, `hover`, `active`,
`accent`, `accentHover` and `accentActive`; a state fill never takes the
divider's own value, or the edge would disappear as the pointer lands. An
outline action inside a selected row paints the same edge on the row's
persistent `selected` fill — the one row fill the control does not paint itself —
so that fill is held to the floor too. The audit found the defect plan `080` had already
fixed for the generic washes on the three light platform pressed steps (1.000:1
on macOS and Windows, 1.009:1 on Linux) and on both AAA sets, whose 3:1 divider
floor the neutral press sat under at 2.31:1 and 2.57:1; the three pressed steps
and the two AAA dividers moved, and plan `318` records the values.

Selection never relies on colour alone for meaning: selected rows also carry
`aria-selected` where the runtime exposes it.

Components that cannot express hover or active in the runtime (for example
`virtual-list`, whose GPUI list has no pressed or hovered style) put the state
on a wrapping element instead of faking it.

## 9. Accessibility

Colour is checked, not assumed. The token suite enforces every
`ContrastPairClass` — the `contrastPairClasses` index owns the list and the
order the ledger's floor table uses — against the floor for the class:

| Pair class | Default | High contrast |
| ---------- | ------- | ------------- |
| body text on `background`/`card`/`muted`/`popover`/`input`, the `hover`/`active`/`accent`/`selected` washes and the four soft status fills an Alert's description paints; typed text on `input` and on the `background`/`card`/`popover`/`muted` surfaces a transparent field sits on | 7:1 | 7:1 |
| a menu row's label (`popoverForeground` on `hover`/`active`, and on `selected` for a selected `Select` option) | 7:1 | 7:1 |
| selected row label (`selectedForeground` on `selected`, the `accent` wash a hovered selectable row paints and the `hover`/`active` pointer washes) | 4.5:1 | 7:1 |
| secondary text (`mutedForeground` on plain surfaces, on the `input` fill a field paints for its own chrome, on the `hover`, `active`, `accent` and `selected` washes and on the four soft status fills a status panel's caption sits on), on-colour text, placeholder text on the `input` fill, the `background`/`card`/`popover`/`muted` surfaces a transparent field sits on and the `hover`/`active`/`accent`/`selected` washes a field inside a row paints, ghost text on the `hover`/`active` washes | 4.5:1 | 7:1 |
| filled-control states (`primaryForeground`/`secondaryForeground`/`destructiveForeground`/`accentForeground` on each family's `x`, `xHover` and `xActive`) | 4.5:1 | 7:1 |
| status-panel action (`softAction`/`softActionHover`/`softActionActive` on `infoSoft`/`successSoft`/`warningSoft`/`destructiveSoft`, `softActionHover` from `softAction` and `softActionActive` from `softActionHover`, and `softActionForeground` on the three fills and the four soft fills) | 1.05:1 / 1.05:1 / 4.5:1 / 7:1 | 1.05:1 / 1.05:1 / 7:1 / 7:1 |
| interactive fills and washes (`hover`, `active`, `accent`, `selected`, and each filled family's `x`/`xHover`/`xActive`) on `background`/`card`/`popover`/`muted`/`input` | 1.05:1 | 1.05:1 |
| solid status fill (`info`/`success`/`warning`/`destructive`) on `background`, `card`, `popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes | 1.05:1 | 1.05:1 |
| state steps (`xHover` from `x` and `xActive` from `xHover` for `primary`/`secondary`/`destructive`/`accent`, the generic wash's `active` from `hover`, and the selected row's `selected` from the `accent` hover wash) | 1.05:1 | 1.05:1 |
| soft status text (`xSoftForeground` on `xSoft`) | 7:1 | 7:1 |
| a Toast's tone glyph and bar (`infoSoftForeground`/`successSoftForeground`/`warningSoftForeground`/`destructiveSoftForeground` on `popover`, the shipped composition until `components` paints `xText`) | 4.5:1 | 7:1 |
| status text (`xText`) on `background`/`card`/`popover`, the `muted` panel and the `hover`/`active`/`accent`/`selected` washes | 4.5:1 | 7:1 |
| brand-toned text (`primaryText`) on `background`/`card`/`popover`/`muted`, the `hover`/`active` washes, the `accent`/`selected` row fills and the four soft status fills a link in a status panel sits on | 4.5:1 | 7:1 |
| text selection (body text over the composited `selection` wash on `background`/`card`/`muted`/`hover`/`active`/`accent`/`popover`/`input`, a card's own `cardForeground` on `card` and a selected row's title `foreground` on `selected`) | 7:1 | 7:1 |
| text selection on a soft status fill (`xSoftForeground`, `foreground`, `softActionForeground` and `mutedForeground` over the wash on `infoSoft`/`successSoft`/`warningSoft`/`destructiveSoft`) | 7:1 / 4.5:1 | 7:1 / 7:1 |
| text selection of a selected row's inherited label (`selectedForeground` over the wash on `selected`, the `accent` wash a hovered selectable row paints and the `hover`/`active` pointer washes) | 4.5:1 | 7:1 |
| text selection of a menu row's label (`popoverForeground` over the composited `selection` wash on `hover`/`active`/`selected`) | 4.5:1 | 7:1 |
| text selection of secondary text (`mutedForeground` over the composited `selection` wash on `background`/`card`/`muted`/`hover`/`active`/`accent`/`popover`/`input`/`selected`) | 4.5:1 | 7:1 |
| text selection of a status label (`xText` over the composited `selection` wash on `background`/`card`/`muted`/`hover`/`active`/`accent`/`popover`/`input`/`selected`) | 4.5:1 | 7:1 |
| text selection of brand-toned text (`primaryText` over the composited `selection` wash on `background`/`card`/`muted`/`hover`/`active`/`accent`/`popover`/`input`/`selected` and on `infoSoft`/`successSoft`/`warningSoft`/`destructiveSoft`) | 4.5:1 | 7:1 |
| text selection wash (`selection` composited over `background`/`card`/`muted`/`hover`/`active`/`accent`/`popover`/`input`/`selected`, the `disabled` fill and the four soft status fills) | 1.05:1 | 1.05:1 |
| text selection on an opaque filled surface (`primaryForeground`/`secondaryForeground`/`destructiveForeground`/`accentForeground`/`infoForeground`/`successForeground`/`warningForeground`/`softActionForeground` over the composited `selectionOnFill` veil, on each fill's resting value) | 4.5:1 | 7:1 |
| text selection veil on an opaque filled surface (`selectionOnFill` over `primary`/`secondary`/`destructive`/`accent`/`info`/`success`/`warning`/`softAction`, on each fill's resting value) | 1.05:1 | 1.05:1 |
| focus ring (`ring`) on `background`/`card`/`popover`/`muted`/`accent`, the `hover`/`active`/`selected` washes, the four soft status fills and the `track` groove a focused slider's thumb sits on, the `destructive` ring an invalid control paints on the same surfaces, essential boundaries (`borderStrong`) on `background`/`card`/`popover`/`muted` and the `input` fill a field sits on, the four state washes and the four soft status fills, plus the invalid field edge (`destructive` on `input`/`background`) and the field's pressed edge (`ring` on `input`) | 3:1 | 4.5:1 |
| graphic marks (`primary`/`success`/`destructive` on `background`/`card`/`popover`/`muted`, `primary` and `destructive` on the `input` fill a slider thumb rings, `primaryText` on the `input` fill the native caret paints, and `primary` on the `hover` wash a highlighted combobox option paints its check on) | 3:1 | 4.5:1 |
| value indicator groove (`track`) on `background`/`card`/`popover`/`muted`, the `hover`/`active`/`accent`/`selected` washes and the `infoSoft`/`successSoft`/`warningSoft`/`destructiveSoft` fills | 1.05:1 | 1.05:1 |
| value indicator marks (`primary`/`success`/`destructive`/`mutedForeground` on `track`) | 3:1 | 4.5:1 |
| soft status surface (`xSoft`) on `background`/`card`/`popover`/`muted` | 1.05:1 | 1.05:1 |
| soft status edge (`xSoftBorder` on `xSoft` and on the eight surfaces a chip sits on) | 1.05:1 | 3:1 |
| inactive label (`disabledForeground` on the `disabled` fill, `background`/`card`/`popover`/`muted`, the `hover`/`active`/`accent`/`selected` washes and the four soft status fills, and through the composited `selection` wash on the same thirteen surfaces) | 3:1 | 4.5:1 |
| loading skeleton (`skeleton`) on `background`/`card`/`popover`/`muted` and the `hover`/`active`/`accent`/`selected` washes, and its dim pulse frame at `skeletonPulseOpacity` on the same eight surfaces (`skeletonPulsePairs`) | 1.05:1 | 1.05:1 |
| decorative dividers (`border`) on `background`/`card`/`popover`/`muted`, the `input` fill a field sits on, the `secondary`/`secondaryHover`/`secondaryActive`/`hover`/`active`/`accent`/`accentHover`/`accentActive` fills a bordered control paints, the `selected` fill an outline action sits on in a selected row, the `disabled` fill a disabled control keeps its edge on and the four soft status fills a status panel divides | 1.05:1 | 3:1 |
| modal scrim (`overlay` composited over `background`/`card`/`muted`/`input`/`selected`/`popover`, the four resting filled actions `primary`/`secondary`/`accent`/`destructive`, the three solid status chips `info`/`success`/`warning`, the raised action a status panel carries (`softAction`) and the four soft status panels `infoSoft`/`successSoft`/`warningSoft`/`destructiveSoft`) | 1.05:1 | 1.05:1 |
| dialog face (`popover` over the composited `overlay` on `background`/`card`/`muted`/`input`/`selected`/`popover`, the four resting filled actions `primary`/`secondary`/`accent`/`destructive`, the three solid status chips `info`/`success`/`warning`, the raised action a status panel carries (`softAction`) and the four soft status panels `infoSoft`/`successSoft`/`warningSoft`/`destructiveSoft` — every surface `overlaySurfaces` names, `dialogSurfacePairs`) | 1.05:1 | 1.05:1 |
| elevation shadow (each defined level of `sm`/`md`/`lg` — the reserved `overlay` is empty — painted on `background`/`card`/`muted`/`input`/`selected`/`popover`, the surfaces `elevationSurfaces` names, and — for `md` — the resting content fills `primary`/`secondary`/`accent`/`destructive`/`info`/`success`/`warning`/`softAction`/`infoSoft`/`successSoft`/`warningSoft`/`destructiveSoft`, the surfaces `elevationContentSurfaces` names) | 1.05:1 | 1.05:1 |

Find highlighting is the one painted wash held below the text tier it covers. A
find wash is transient chrome over code, and no perceivable wash keeps every
syntax token at body strength — the only neutral candidate is invisible at its
weakest and still leaves syntax under the body floor. `nativeHighlight(theme)`
is the prop a find bar passes: the `selection` role, plus one
`nativeHighlightStep` stronger for the active match. `themeHighlightFailures`
holds every matchable role to the **secondary** floor on `background`, `card`,
`popover` and `muted` while body text keeps the body floor. The runtime paints a
code block on that tone under a fixed 3.5% ink wash, so the check measures every
pair again through the painted surface — a find inside fenced code sits behind
both washes. The runtime's own default seeds the wash from
`nativeTextTheme`'s `accent`, which is an ink, not a wash; the catalogue's
[Find highlighting](tokens.md#find-highlighting) section states the measured
evidence.

The test runs for every shipped colour set — platform variants included, each on
its own canvas — and is part of the normal test suite. The elevation shadow is
measured composited, like the scrim: each defined level's painted shadow over the
six persistent page surfaces a raised card, menu, popover or preview card floats
over, and a floating `md` menu's shadow also over the twelve resting content
fills `elevationContentSurfaces` names, because a shadow that paints its own
surface is not a raised surface. The AAA dark set measured **1.000:1** at every
level until plan `505` gave it a light tint. The modal scrim is
measured composited rather than as a value: `overlay` over the eighteen surfaces
a dialog covers — the four base surfaces, the `input` fill a form paints, the
persistent `selected` fill, the four resting filled actions, the three solid
status chips a Badge paints, the raised action a
status panel carries (`softAction`) and the four soft status panels a window
shows — which caught the AAA dark backdrop painting
**1.000:1** on its own canvas until plan `099` gave it a light veil, and the
macOS light `selected` fill used as a scrim painting **1.000:1** on a selected row
until plan `359` measured it. Plan `375` closed the same gap for the page's
filled actions and status panels: a scrim equal to `primary` or to `infoSoft`
left the control or the Alert undimmed while the checker returned `[]`, and plan
`508` closed it for a solid status chip, which a Badge keeps on screen. The
tightest of the eighteen pairs is **1.060:1** (high-contrast dark, `overlay` on
`info`), so no colour moves. A soft status surface is measured on
the quiet panel as well as the canvas, card and popover: a status badge or small
Alert in a sidebar is a real composition, and the platform light variants change
`muted` while inheriting the identity's pastel tints — macOS, Linux and Windows
light measured 1.036:1, 1.023:1 and 1.043:1 until plan `300` moved the four light
tints one small step deeper.
The dialog's own face is measured on that scrim: `dialogSurfacePairs` composites
`overlay` over every surface `overlaySurfaces` names — the six layout surfaces
and the twelve resting content fills — and holds `popover` to 1.05:1, because a
theme whose scrim meets its own floating surface ships a dialog with no face
(tightest shipped **1.079:1**). The layout alone was not enough: macOS dark's
face met the scrim over its own `primary` action at **1.021:1**, and the edge is
not a fallback — a dialog's `border` measures **1.006:1** over Windows dark's
scrimmed `success` chip, under the divider floor, and the AAA light edge would
need 3:1 against a scrimmed canvas it meets at 1.074:1. The face is the carrier,
so macOS dark's scrim is 82% and the scrimmed content sits below the face —
macOS dark's brightest content fill, `warning`, clears at 1.083:1. The
shadow is still not a separation: on the identity dark scrim the `lg` tint paints
1.035:1 and pure black reaches only 1.042:1.
The inactive state is measured too, and it is the one floor that is **not** a
WCAG requirement: 1.4.3 exempts inactive components, but an unavailable control
is still read — a reader has to find out what they cannot do — so the library
requires 3:1 for a disabled label (4.5:1 at AAA) while keeping it far below
secondary text. What is exempt is the `disabled` fill's distance from the panel:
no neutral can clear both a white card and the quiet panel, so a disabled control
keeps its shape with its `border` edge, held to the divider floor on `disabled`
itself. The audit found the opposite in the shipped library: a disabled `Select`
item painted its label straight onto the menu's `popover` at **1.99:1** on Linux
dark, the designed pair measured 2.09:1, and `disabled` was exactly the value of
`muted` and `hover` — a disabled control with neither a readable label nor a
visible shape until plan `306`. Every disabled control in the component packages
still reaches the state through `opacity: 0.5`, which composites the label with
the dimmed fill and that fill with the panel behind it — the primary label
measures **1.468:1** on a Linux light card, under the 3:1 floor — while the
designed pair is what a control should paint instead:
[`src/disabled-state.example.ts`](../packages/tokens/src/disabled-state.example.ts)
returns the three roles.

The label is read while it is selected, too. `selectionColor` inherits into a
disabled control's text, and the accent-tinted wash composites over the surface
beneath it: on a light surface it darkens the ground toward the disabled grey,
on a dark surface it lifts the ground toward it. No pair measured the
composition, so the previous light `#6E7787` measured **2.586:1** on Windows
light's `selected` fill and 2.604–2.945:1 on the other default light sets while
every check returned `[]`, and the AAA sets measured **3.430:1** (light,
`destructiveSoft`) and **4.357:1** (dark, `active`) under 4.5:1.
`selectionInactivePairs` holds `disabledForeground` through the wash on the same
thirteen surfaces at the same floor, and three values move one designed step
away from the panel — `#6E7787` → `#545D6C`, `#5A5A5A` → `#444444`, `#A9A9A9` →
`#B0B0B0` — staying 1.301:1 (identity dark) and 1.168:1 (AAA dark) below
secondary text at the tightest. The tightest washed pair is now **3.177:1**
(Aero light `destructiveSoft`) and **4.722:1** at AAA (plan `510`).

A disabled raised action keeps its `softAction` fill, so its label is content on
an opaque surface and uses the inverse `selectionOnFill` veil rather than the
accent wash. No pair measured that composition: identity dark measured
**2.799:1** and high-contrast dark **3.304:1** through the veil, under the 3:1 /
4.5:1 `inactive` floor, while every check returned `[]`.
`selectionFillInactivePairs` publishes the one resting composition, and
`disabledForeground` moves one designed step in the two sets that failed —
identity dark `#A1A9B7` → `#B0B8C6` (3.317:1) and AAA dark `#B0B0B0` →
`#D0D0D0` (4.645:1) — so every shipped set passes (plan `520`).

The inactive label is not merely above its floor; it stays **below** the
secondary text it sits beside. The same is true of a field's hint. Those three
relationships are part of the text hierarchy, and so is the body role each
surface paints: `foreground` on the canvas and the row washes, `cardForeground`
on a card, `popoverForeground` on a menu, dialog or toast and `inputForeground`
in a field. `themeTextTierFailures` holds an edited theme to all of them: each
tier must sit one `contrastFloors[level].step` (1.05:1) below the tier above it,
measured on the same surface. The surfaces come from `contrastPairs`, so the
comparison follows the pair lists. A theme that raises `disabledForeground` to
body strength passes every floor and still makes an unavailable control look
enabled; so does one that sets `popoverForeground` to `mutedForeground`, which
renders every menu label at secondary strength. This is the check that reports
both, and every shipped set clears it — secondary text sits 1.274:1 below
`foreground`, `cardForeground`, `popoverForeground` and `inputForeground`; the
unavailable label 1.168:1 and the hint 1.157:1 below secondary text; and the
disabled label of a status-panel action 1.542:1 below the enabled one.
`selectedForeground` is deliberately not a body tier: it is the
secondary-strength tint an inherited label keeps inside a selected row, whose
title is `foreground`.

A role painted through an alpha needs the composited pair, not only the opaque
one. The loading skeleton's dim frame is `skeleton` at `skeletonPulseOpacity`
(0.6), and identity dark measured **1.008:1** on `selected` — the placeholder
vanished for half of every pulse — until plan `393` moved the dark skeleton a
half-step; `skeletonPulsePairs` holds the frame on the same eight surfaces and
reports the fraction as `opacity`.

A fill is not automatically a surface. A solid role painted as a bar, a glyph or
a dot — a progress segment, a slider fill, a slider thumb's ring, a rating star,
a combobox check, a timeline dot — is a **mark**, held to 3:1 (4.5:1 at AAA).
The 1.05:1 floor plan `309` gives an interactive fill is a wash's floor: it says
a hover is visible, not that a 4px bar is. Status marks are `xText`, never the
solid status fill, because the light `warning` fill is **1.78:1** on the canvas;
the avatar's presence dot and the timeline's pending dot are two shipped marks
the ledger records for the components workstream to move onto the designed role.
A third is the menu row's 2px highlight bar: it paints `accent`, which measures
1.118–1.392:1 on the menu's `popover` and 1.000–1.113:1 on the `hover` fill the
row also paints, so the bar that exists to show the highlight is invisible. The
functional boundary it needs is `borderStrong`, already measured on the
`popover`, `hover` and `active` fills.

It can fail: a palette edit that reduces contrast fails the gate. The same check
is public: `themeContrastFailures(theme)` returns every pair an edited theme
misses, so a brand theme or copied platform style can be held to these floors in
its own test suite.

The floors are the colour half. `themeMetricFailures` is the numeric half: an
edited theme cannot zero the focus ring (`borderWidth.strong` is the spread of
the only focus indicator GPUix 0.10.0 can draw), clip a type role's leading,
shrink the smallest control below one label line or one body line plus its
borders, paint a control size's matching icon tier larger than that control's
content box, raise an inline icon above the caption or label line it sits in, raise
an inline avatar above the dense row it leads, clip a
row
below the default `md` control it holds, round a "square" corner, leave the
largest avatar a rounded square, invert a named size ladder, name a zero-size
icon or avatar, ship a zero-width surface metric, hand the renderer a
non-finite shadow offset, ship a non-finite type size, spacing step, radius,
border width, dimension, icon or avatar, or hand
`elevationShadow` an alpha the colour helper cannot parse — each of which
returned `[]` from the colour check. Every shipped theme, platform variant and
recipe passes, so the checker exists for the theme a consumer edits, not to
change a value. Every numeric metric must be a **finite** number: the renderer
casts each to a 32-bit float, and an infinity is invalid layout it paints as
nothing, silently. The check walks each group's values rather than a
hand-written list, so a member added to a group is governed when it ships, and
`metricMembers` is the published index of that domain.

The **format** check is `themeColorFailures(theme)`: every one of the 70 roles
must be a six- or eight-digit hex colour, because `alpha`, `compositeOver` and
`contrastRatio` parse only that form. The runtime is broader — GPUix accepts
CSS names and functional colours — so a copied theme can be paintable and still
invisible to the token maths. A measured role in another form fails the contrast
check as `NaN`; `scrollbar` has no pair. `shadow` is the case that
matters: plan `085` applies each elevation level's alpha to it through `alpha()`,
and an unparseable tint is returned unchanged, so `shadow: "black"` painted a
**fully opaque** shadow at every level — the 0.08, 0.12 and 0.16 gone — while the
metric check returned `[]`. Plan `505` measures the shadow, so that tint also
fails the contrast check as `NaN`; the colour check remains the one that names
the form. Every shipped set is hex, so the check moves no
value; `isHexColor` is the predicate for a single stored role.

The form has a second half. `themeOpacityFailures` asks for the alpha the role is
painted with: the three veils — `selection`, `overlay` and `selectionOnFill` —
composite over content, so each needs a byte strictly between `00` and `FF`, and
every other role is opaque. `shadow` is the opposite case: each level's alpha
writes the tint's fourth byte, so an eight-digit tint is a value the paint
discards, and a solid `overlay` hides the window the scrim exists to keep
recognisable. `roleForm` is the rule, `colorForms` the ordered index of the two
forms and `translucentRoles` the index of the three veils; every
shipped set carries the form it needs, so no colour moves.

`packages/tokens/src/docs.test.ts` holds this page's machine-checkable claims —
the identity metrics, the shipped role count, the theme surfaces, the type
summary, and the spacing, density, radius, icon and avatar scales — to the same
implementation, as it does for the catalogue in [`tokens.md`](./tokens.md).

Brand-toned text is measured through the wash as well: `primaryText` over the
composited `selection` wash, tightest **4.729:1** (Windows dark, on `selected`)
and **7.484:1** at AAA (high-contrast light, on `destructiveSoft`). A link is
selected with the copy around it, so an accent-toned link is guaranteed on the
same surfaces as the body, secondary and status text beside it.

Not covered, deliberately:

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
| no `letterSpacing` | no display tracking or all-caps tracking |
| no OS appearance query | the app owns the mode |
| no `outline*`, no `focusVisible`, one `boxShadow` | the focus ring is a spread shadow; overlays and menus cannot animate |
| `selectionColor` and `userSelect` inherit | set the selection wash once on the app root; chrome opts out locally |
| no `scrollbarColor`/`scrollbarWidth` in 0.10.0 | a scroll thumb cannot be tinted, so `scrollbar` is reserved |
| `virtual-list` has no hover/active style | wrap it and style the wrapper |
| shadows are structured objects | elevation tokens are geometry plus an alpha over the `shadow` tint, not CSS strings |
| invalid colour strings are ignored per property | a role outside the six- or eight-digit hex form the helpers parse is reported by `themeColorFailures`; the runtime would paint it while the token maths cannot. The channel is the other half: `themeOpacityFailures` reports a veil without an alpha byte and an opaque role with a partial one |
| native `<code>`, `<diff>` and `<markdown>` default to a dark Comet theme | pass `nativeTextTheme(theme)`; its `appearance` selects the light or dark base, and its colours, syntax palette and metrics come from the semantic roles and scales — the gutters and table floors scale with the code and body roles, so a larger type does not overlap line numbers or squeeze columns |

The native text bridge is one call: `nativeTextTheme(theme)` maps `text`,
`textMuted`, `textFaint` and `textDim` to the body, secondary, hint and secondary
roles; `accent` and the caret to `primaryText` (the ink, not the fill); inline
code to `primaryText` on the `accent` wash, held to the body floor through
`nativeInlineCode` because it is body copy (four sets measured
6.506–6.960:1 there and took one ink step); diff add/delete to the status **text**
roles; and every syntax capture to a text role, never a solid fill. The layout
comes from `codeBlock`, `body`, `h1`–`h3`, spacing and the small/large radii,
and the code/diff gutters and table floors are the runtime's shipped proportions
resolved against those roles. The runtime's two chrome metrics without a token —
the code gutter's 28px floor (`codeGutterMinWidth`) and the 3px diff accent bar
(`diffAccentBarWidth`) — stay at their defaults and are optional members of
`NativeTextMetrics`, so a brand can set either on the returned object. The diff's
own chrome is fixed type the theme cannot change: a meta line at 10.5px, the
gutter, hunk header, notice and file counts at 11px and the file path at 12px,
each on GPUI's golden-ratio line box. `nativeTextChrome` and
`nativeTextLineRatio` publish them, and the four derived boxes are floored at
those lines (19 / 18 / 18 / 18) and the marker column at one code em, because a
compact theme that passes every check otherwise resolved 8px boxes and a 0px
marker. The runtime fades
some values at fixed fractions a theme cannot change, so
`themeNativeTextFailures` holds the chosen roles through every composite on all
four `Surface` tones a document may paint on; the syntax palette is held to the
body floor both opaque (`nativeSyntaxPairs`) and through the 3.5% ink wash the
code block paints over each, and the word-level 28% diff wash is documented as
an omission because a changed token's own colour sits on a wash of its own
family. A changed diff line is its own surface: its gutter, number, marker, 3px
bar and syntax runs sit on a 5.5% tint of the add/delete status role, so
`nativeSyntaxTints` and the row entries of `nativeTextOverFades` hold both on
every tone; five light pairs missed the body floor there and took one designed
step in their own family. The runtime's two fixed neutral hairlines — a diff
file header's 4% top
edge and a markdown table's 10% rule — are the other omissions: they are ink,
not a theme role, so no edit can move them. The runtime's own chrome is held
too: a code block's body frame (the
theme's `border` on the 3.5% body wash), its language header and separator
(`textMuted` and the theme's `border` on the 2% header wash), and a diff file
header (2.5%, and 5% under the pointer, under `textMuted`, `diffAdd` and
`diffDel`) are `nativeTextWashes`, measured on every tone a document may paint
on. The find highlight is held on that tone and on the
same painted surface, and its active match one `step` above the match, so an
edited near-opaque `selection` that paints both washes the same colour is
reported. A document painted directly on the canvas overrides
only `bg`. The light platform styles name their own status text steps where the
inherited ink missed the body floor through the wash.

## 11. Extension

The extension mechanism is deliberately small:

- `createTheme({ mode, contrast, ...overrides })` — start from a built-in
  variant; `contrast` selects the palette it builds on.
- `extendTheme(base, overrides)` — derive from any theme, including another
  brand theme, a high-contrast theme or a platform variant.
- `getPlatformTheme(platform, mode, contrast?)` — resolve a shipped platform
  variant; the result is a normal theme, so a consumer can edit it with
  `extendTheme`.
- `getPlatformRecipeTheme(recipe, mode, contrast?)` — resolve a shipped recipe
  (Windows XP, Windows 7); `isPlatformRecipeName` narrows a stored choice.
- `ThemeProvider theme={…}` — scope a theme to a subtree; nested providers
  allow a branded panel inside a neutral shell.

A choice that survives a restart — the mode, the contrast variant, the density,
the platform style — arrives as `unknown`. Narrow it with `isThemeMode`,
`isThemeContrast`, `isDensityName`, `isPlatformName` and
`isPlatformRecipeName`, or hand the whole row to `resolveThemeChoice(choice)`:
it narrows the five axes and composes them, applying the stored density after
the platform style (macOS's preset is `compact`) and preferring a recipe over a
stray platform key. Every unknown axis keeps a readable default, including an
unknown density, which keeps the resolved theme's preset. The package owns those
unions, so no consumer should retype them. `themeModes` and `themeContrasts` are
the ordered indexes a settings row or a docs toggle iterates. A whole theme
object from a file is a different boundary: decode it with the application's
`Schema`.

A choice that travels in a URL is the same row. `themeChoiceFromParams(source)`
reads the five keys through the same guards — a real `URLSearchParams` satisfies
the structural `ThemeParamSource` — and treats an unknown value as absent, so a
hand-edited link resolves to a readable theme. `themeChoiceParams(choice)` writes
the canonical axes only: `mode=dark`, `contrast=high`, a non-`default` platform,
a valid recipe, and every valid density, because the platform supplies the
density fallback; a recipe suppresses the platform it overrides.
`themeChoiceKeys` is both the key order and the list a consumer clears before
writing a new choice, so a stale axis cannot survive beside its replacement. No
theme, role or pair changes.

A theme carries its contrast level the way it carries its mode: `extendTheme`
keeps the base's declaration and `applyPlatformStyle` and
`themeContrastFailures` default to it, so the short call is the safe one. A
requested level decides the palette, and the palette decides the name, the
declaration and the elevation's opacity: `"high"` always builds the AAA set — a
platform's colours are designed at the default floors and never repaint it, and
the AAA tint keeps the opacity designed against it — while `"default"` builds the
default palette when the style contributes colours, the roles it does not name
coming from the identity at that level. A shape-only style changes no colour, so
it keeps the base's level, and a base already at the requested level keeps its
own colours, edits included. A forced default palette is whole, not half of one,
and the theme's name always names the palette it carries and never appends the
label it already ends with — re-applying that style changes nothing, while a
different style appends its own label because the unnamed roles survive. A
declaration is a claim; `themeContrastFailures` is what proves it.

A style is also an override set over the base it is applied to, so it names the
canvas-tuned roles it owns: the dark styles name `destructiveSoft` beside their
dark `skeleton`, and every shipped base and style pair is applied and held to
every check (`platform-composition.test.ts`, plan `374`). A style applied over
another platform's theme therefore keeps its own canvas's tint rather than the
previous one's. A platform style also carries the **numeric scales** — type
roles, spacing, border widths, icon and avatar sizes and component dimensions —
so copying a style file owns the whole look, not only its palette. The shipped
styles name none of them, so their resolved values are the identity's; the
`platform-extension.example.ts` file is a complete copyable example.

Overrides merge by group; typography merges field by field, density metrics size
by size, motion timing by timing and easing by easing; elevation levels are
replaced as whole arrays; the mode is immutable. An explicit `undefined` is
treated as omitted in every group, so a partial config spread cannot erase a
role, a metric or a shadow level. Nothing mutates the base, so a theme can be
created once at startup and shared.

Verify an edited theme with `themeFailures(theme)`: it composes every check in
`themeChecks`, checks contrast at the level the theme declares, and tags every
entry with the `kind` that found it. An empty array is the library's guarantee,
and a non-empty one names every pair, tier, role, ladder or metric that needs
fixing. The direction half is `themeDirectionFailures`: a pointer ladder must
step away from the canvas — darker in light, lighter in dark — so a light
`primaryHover` that is lighter than its `primary` is reported even though it
clears the 1.05:1 step, the on-colour floor and the surface floor. Each part is
available on its own — `themeColorFailures`, `themeOpacityFailures`,
`themeTypefaceFailures`,
`themeContrastFailures`, `themeHighlightFailures`, `themeNativeTextFailures`,
`themeTextTierFailures`, `themeDirectionFailures` and `themeMetricFailures` — but
a consumer that runs only one has not run the guarantee: a zero focus-ring spread,
an unparseable `shadow` tint or a translucent one the paint discards passes the
contrast check alone. `themeChecks`
is the ordered index of those parts. A family name is one exact, non-empty
family — not a CSS comma stack, not a CSS generic keyword, not a CSS-quoted name
and not a padded name
— because `StyleDesc.fontFamily` is a single string and an unknown name falls
back silently, so `themeTypefaceFailures` reports those forms and an empty name
that no other check can see.

The set those checks run over is `shippedThemes` — every identity variant,
platform variant and recipe at both modes and both contrasts, each with the axis
it came from. It derives from the same indexes the resolvers read, so
`shippedThemes.flatMap(({ theme }) => themeFailures(theme))` is the library's own
guarantee in one loop, and a gallery iterates the same list for every shipped
look. `platformVariants` is the styled subset: the `default` platform is the
identity, not a fourth look.

A brand may change any value but should not remove roles: every component
expects the full role set. A brand that needs a different structure should add
roles in the tokens package, not fork components.

## 12. Non-goals

- No component-level token catalogue. Semantic roles plus scales are enough; a
  per-component token file would duplicate the same decisions.
- No theme editor or theme marketplace.
- No animation the runtime cannot draw. Motion goes through `motion` props and
  the eight `MotionStyle` properties; a design that needs a transform, a
  rotation or colour interpolation is out of scope until GPUix supports it.
- No web preview pretending to be native. The playground is the visual proof.

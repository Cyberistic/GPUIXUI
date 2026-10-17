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
`primaryHover`, `primaryActive` and `primaryText` belong beside `primary`. An
inherited state keeps the base theme's hue running the interaction, and an
inherited foreground can miss the on-colour floor — the dark example's inherited
foreground measured 4.24:1 on its brand fill. The executed example in
`packages/tokens/src/brand-theme.example.ts` carries the complete family, and
`themeContrastFailures` holds it to the same floors as the shipped themes.

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

Both themes expose exactly the same 62 roles; the type system and the colour
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
high contrast only families and shape are applied: the AAA colour set wins over
platform resemblance. The docs toggle and a native build call the same function.

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

## 7. Radii, borders and elevation

Radii: 0, 4, 6, 8, 12, full. Small controls use 4 or 6; cards 8; dialogs 12.
Pills and avatars use `full` (clamped by the renderer to half the short side).

Two border roles:

- `border` is decorative — dividers and card edges. It is intentionally subtle,
  but held to a 1.05:1 perceivability floor (3:1 at high contrast), so subtle
  never means invisible. A bordered control paints it on the fill behind it —
  `secondary` at rest, the `hover` and `active` washes, and `accent` for an
  outline toggle that is on — so the floor covers those fills as well, and a
  pointer state never turns the fill into the divider's own value. A status
  panel that separates a footer or an action row with a line paints it on a soft
  status fill, so those four fills carry the same floor; `xSoftBorder` is the
  edge around the surface, not a divider inside it.
- `borderStrong` is functional — input and control boundaries. It meets 3:1
  against the canvas, the `muted` panel, the `hover`/`active`/`accent`/
  `selected` washes a row paints and the four soft status fills an Alert or Toast
  paints, so a checkbox or field is perceivable without relying on fill alone.

Elevation is a semantic level, not a literal shadow: `sm` for resting cards,
`md` for menus and popovers, `lg` for dialogs and the command palette. The
runtime paints one shadow per element — no `inset`, no shadow list — so a level
is exactly one shadow, read with `elevationShadow(theme, level)`. A level is
geometry plus an alpha; the tint is the single `shadow` role, so a brand retints
every level by editing one value. Overlay layering uses the `overlay` scrim
colour, a translucent wash a Dialog paints across the window. The scrim is held
to the same 1.05:1 perceivability floor as every other painted value, on the four
base surfaces it covers (`background`, `card`, the `muted` panel and `popover`),
because a scrim that composites to the surface beneath it is an invisible modal
backdrop. On the high-contrast dark theme's pure black canvas a dark veil cannot
darken anything, so that theme veils with light: the modal is separated by a
light wash, its own edge and elevation instead of a darker backdrop.
`elevation.overlay` is a different concern — a reserved shadow level, empty so
the shape stays stable.
Dark shadows are darker and more opaque because contrast between surfaces is
lower.

Motion is a scale beside elevation, not a component detail: `step` (a spinner's
frame) and `pulse` (a skeleton's half cycle) drive interval indicators, and
`fast`/`normal`/`slow` align with the `sm`/`md`/`lg` surface classes, so a
tooltip, a menu and a dialog move at the pace their elevation suggests. The
tokens hold milliseconds because that is what a timer takes;
`motionTransition(theme, level, phase)` converts to the seconds the runtime's
`motion` prop takes. GPUix animates only `width`, `height`, `opacity`,
`top`/`right`/`bottom`/`left` and `borderRadius` — there is no transform, no
rotation and no colour interpolation — so the design never promises them.

Overlays are ordered by tree order, because the runtime has no stacking context:
the mounting rule and its no-portal limitation are documented once, under
[Layering](./tokens.md#layering).

## 8. Interaction states

| State | Role / mechanism |
| ----- | ---------------- |
| hover | `hover` wash on ghost and subtle surfaces, held to the 1.05:1 perceivability floor on the canvas, card, popover and quiet panel it paints on; filled actions step to their family's `xHover` (opaque, contrast-checked) instead of compositing an alpha fill |
| pressed | `active` wash on ghost and subtle surfaces, held to the same floor on the same four surfaces; filled actions step to `xActive`, one step past their hover |
| loading | `skeleton` fill with `pulse` (or `step`) motion, held to the 1.05:1 perceivability floor on every surface and row wash a placeholder fills — the identity and high-contrast skeletons were the `active` fill until plan 094; the active indicator uses `primary` |
| selected | `selected` + `selectedForeground`, the fill held to the perceivability floor on the surface it marks |
| link | `primaryText` on the plain surfaces and the `hover`/`active` washes a link paints; `primary` is a fill and is never the colour of text |
| disabled | `disabled` fill + `disabledForeground`, which keeps a readable dim (3:1, 4.5:1 at AAA) while staying well below secondary text; the control paints its `border` edge on that fill so its shape survives on any panel, plus a non-colour cue where possible |
| focus | `focusRing(theme)`: a zero-offset, zero-blur `boxShadow` spread by `borderWidth.strong`, painted from `ring` while the control is focused |
| text selection | `selection` wash via `selectionColor`; body and secondary text keep their floors through the composited wash on every surface a glyph is selected on, including the four soft status fills (`xSoftForeground`), and the wash itself stays perceivable; `userSelect: "none"` opts chrome out |
| status | a family (`info`/`success`/`warning`/`destructive`) via its solid role for a fill, its soft pair and designed edge through `statusTone(theme, tone)`, or its `xText` role for labels, icons and dots on a plain surface or the `hover`/`active`/`accent`/`selected` wash a row paints; a tone from untrusted data narrows with `isStatusTone` |

Focus never changes layout: the ring is a shadow, painted outside the border box,
so gaining focus reflows nothing. GPUix 0.10.0 has **no `outline*` properties and
no `focusVisible` state** — a nested style offers only `hover` and `active`, and
`boxShadow` is a single shadow — so `focusRing(theme)` is the one shape the
runtime can draw. The component applies it while it holds focus, which means a
mouse press shows the ring too: there is no `:focus-visible` to distinguish a Tab
from a click. A design that needs that distinction must keep a press from
focusing the control (that limitation is real and is not worked around).

A filled control steps through its own family — `x` → `xHover` → `xActive` — so
the state is an editable, measured fill, not a translucent tint that takes its
colour from the surface behind it. `primary`, `secondary` and `destructive` each
carry the full trio, and the on-colour foreground is held to its floor on all
three. The generic `hover` and `active` roles are the washes a ghost or outline
control paints; they are not a filled control's states. The neutral fill needs
its own roles most: `secondary` is only just distinguishable from the canvas, so
a 90% alpha "hover" changed it by 1.009:1, and the press came out lighter than
the hover. A filled control is still a surface in its own right, so every fill
and wash is also held to 1.05:1 against the four surfaces it paints on —
`background`, `card`, `popover` and the quiet `muted` panel (plan `309`). The
audit found the identity light panel was the same value as its `hover`,
`secondary`, `accent` and `selected` fills, so a sidebar row had no pointer
feedback and a selected row was invisible; the identity dark `hover` was its
`muted` and `popover`; macOS light `selected` was 1.021:1 on its canvas and
Linux light `accent` 1.001:1 on the panel. The light panel now sits one step
toward the card and the two light accents and the AAA dark accent move one
designed step; no text, edge, ring, selection or tint pair changes.

An inactive control is not an opacity composite. It paints the `disabled` fill
with `disabledForeground` on it and its `border` edge around it: the label keeps a
readable dim (3:1, 4.5:1 at AAA) and the edge keeps the shape, because the fill
is allowed to sit within the panel's own value — no neutral clears a white card
and the quiet panel at once. A filled primary action at 50% opacity measures
2.25:1 on the light canvas, which is the state a designed pair replaces.

A row's metadata keeps its `mutedForeground` role on every wash the row paints —
`hover` and `active` for pointer state, `accent` where a selectable row hovers,
and `selected` when it is selected. That is why the secondary floor covers the
washes, not only the plain surfaces: a description is read while the row moves.
A bordered control keeps its `border` edge on the fill it paints, so the divider
floor covers `secondary`, `hover`, `active` and `accent`; a state fill never
takes the divider's own value, or the edge would disappear as the pointer lands.

Selection never relies on colour alone for meaning: selected rows also carry
`aria-selected` where the runtime exposes it.

Components that cannot express hover or active in the runtime (for example
`virtual-list`, whose GPUI list has no pressed or hovered style) put the state
on a wrapping element instead of faking it.

## 9. Accessibility

Colour is checked, not assumed. The token suite enforces:

| Pair class | Default | High contrast |
| ---------- | ------- | ------------- |
| body text on `background`/`card`/`muted`/`popover`/`input` and the `hover`/`active` washes | 7:1 | 7:1 |
| secondary text (`mutedForeground` on plain surfaces and on the `hover`, `active`, `accent` and `selected` washes), on-colour text, placeholder, ghost text on the `hover`/`active` washes | 4.5:1 | 7:1 |
| filled-control states (`primaryForeground`/`secondaryForeground`/`destructiveForeground` on each family's `x`, `xHover` and `xActive`) | 4.5:1 | 7:1 |
| interactive fills and washes (`hover`, `active`, `accent`, `selected`, and each filled family's `x`/`xHover`/`xActive`) on `background`/`card`/`popover`/`muted` | 1.05:1 | 1.05:1 |
| soft status text (`xSoftForeground` on `xSoft`) | 7:1 | 7:1 |
| status text (`xText`) on `background`/`card`/`popover` and the `hover`/`active`/`accent`/`selected` washes | 4.5:1 | 7:1 |
| brand-toned text (`primaryText`) on `background`/`card`/`popover`/`muted` and the `hover`/`active` washes | 4.5:1 | 7:1 |
| text selection (body text over the composited `selection` wash on `background`/`card`/`muted`/`hover`/`active`/`accent`/`popover`/`input`) | 7:1 | 7:1 |
| text selection on a soft status fill (`xSoftForeground` over the wash on `infoSoft`/`successSoft`/`warningSoft`/`destructiveSoft`) | 7:1 | 7:1 |
| text selection in a selected row (`selectedForeground` over the wash on `selected`) | 4.5:1 | 7:1 |
| text selection of secondary text (`mutedForeground` over the composited `selection` wash on `background`/`card`/`muted`/`hover`/`active`/`accent`/`popover`/`input`/`selected`) | 4.5:1 | 7:1 |
| text selection wash (`selection` composited over `background`/`card`/`muted`/`hover`/`active`/`accent`/`popover`/`input`/`selected` and the four soft status fills) | 1.05:1 | 1.05:1 |
| focus ring on `background`/`card`/`popover`/`muted`/`accent`, the `hover`/`active`/`selected` washes and the four soft status fills, and essential boundaries on `popover`, `muted`, the four state washes and the four soft status fills | 3:1 | 4.5:1 |
| soft status surface (`xSoft`) on `background`/`card`/`popover`/`muted` | 1.05:1 | 1.05:1 |
| soft status edge (`xSoftBorder` on `xSoft` and on the eight surfaces a chip sits on) | 1.05:1 | 3:1 |
| inactive label (`disabledForeground` on the `disabled` fill, `background`/`card`/`popover`/`muted`, the `hover`/`active`/`accent`/`selected` washes and the four soft status fills) | 3:1 | 4.5:1 |
| loading skeleton (`skeleton`) on `background`/`card`/`popover`/`muted` and the `hover`/`active`/`selected` washes | 1.05:1 | 1.05:1 |
| decorative dividers (`border`) on `background`/`card`/`popover`/`muted`, the `secondary`/`hover`/`active`/`accent` fills a bordered control paints, the `disabled` fill a disabled control keeps its edge on and the four soft status fills a status panel divides | 1.05:1 | 3:1 |
| modal scrim (`overlay` composited over `background`/`card`/`muted`/`popover`) | 1.05:1 | 1.05:1 |

The test runs for every shipped colour set — platform variants included, each on
its own canvas — and is part of the normal test suite. The modal scrim is
measured composited rather than as a value: `overlay` over the four base
surfaces, which caught the AAA dark backdrop painting **1.000:1** on its own
canvas until plan `099` gave it a light veil. A soft status surface is measured on
the quiet panel as well as the canvas, card and popover: a status badge or small
Alert in a sidebar is a real composition, and the platform light variants change
`muted` while inheriting the identity's pastel tints — macOS, Linux and Windows
light measured 1.036:1, 1.023:1 and 1.043:1 until plan `300` moved the four light
tints one small step deeper.
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
reaches the state through `opacity: 0.5`, which composites the label with
whatever is behind it (a disabled primary action measures 2.25:1 on the light
canvas); the designed pair is what a control should paint instead.
It can fail: a palette edit that reduces contrast fails the gate. The same check
is public: `themeContrastFailures(theme)` returns every pair an edited theme
misses, so a brand theme or copied platform style can be held to these floors in
its own test suite.

`packages/tokens/src/docs.test.ts` holds this page's machine-checkable claims —
the identity metrics, the shipped role count, the theme surfaces, the type
summary, and the spacing, density, radius, icon and avatar scales — to the same
implementation, as it does for the catalogue in [`tokens.md`](./tokens.md).

Not covered, deliberately:

- placeholder as a substitute for a label — placeholders are hints, labels are
  required;
- colour as the only status signal — status components pair colour with text or
  an icon;
- accent-toned text under a text selection — at AAA no wash that stays
  perceivable keeps a link or status tone at 7:1 (high-contrast light's
  `primaryText` measures 6.75:1 on the `muted` panel and 5.48:1 on `active`), so
  selection guarantees body and secondary text, not every tone;
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
| invalid colour strings are ignored per property | a typo paints the previous/black value; tests restrict roles to hex |

## 11. Extension

The extension mechanism is deliberately small:

- `createTheme({ mode, contrast, ...overrides })` — start from a built-in
  variant; `contrast` selects the palette it builds on.
- `extendTheme(base, overrides)` — derive from any theme, including another
  brand theme, a high-contrast theme or a platform variant.
- `getPlatformTheme(platform, mode, contrast?)` — resolve a shipped platform
  variant; the result is a normal theme, so a consumer can edit it with
  `extendTheme`.
- `ThemeProvider theme={…}` — scope a theme to a subtree; nested providers
  allow a branded panel inside a neutral shell.

A choice that survives a restart — the mode, the contrast variant, the density,
the platform style — arrives as `unknown`. Narrow it with `isThemeMode`,
`isThemeContrast`, `isDensityName` and `isPlatformName` before building or
resolving the theme; the package owns those unions, so no consumer should retype
them. `themeModes` and `themeContrasts` are the ordered indexes a settings row
or a docs toggle iterates. A whole theme object from a file is a different
boundary: decode it with the application's `Schema`.

A theme carries its contrast level the way it carries its mode: `extendTheme`
keeps the base's declaration and `applyPlatformStyle` and
`themeContrastFailures` default to it, so the short call is the safe one. An
applied style declares the level of the palette it ends with: asking for the
platform's default colours on an AAA base returns a `default` theme, because the
AAA palette is gone, while a style with no colour overrides keeps the base's
level. A declaration is a claim; `themeContrastFailures` is what proves it, and a
mixed palette is reported rather than silently repaired.

Overrides merge by group; typography merges field by field, density metrics size
by size, motion timing by timing and easing by easing; elevation levels are
replaced as whole arrays; the mode is immutable. Nothing mutates the base, so a
theme can be created once at startup and shared.

Verify an edited theme with `themeContrastFailures(theme)` — it checks at the
level the theme declares, so a high-contrast theme needs no second argument. An
empty array is the library's guarantee, and a non-empty one names every pair that
needs fixing.

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

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
`xSoftForeground`) for alerts, badges and toasts, and a text role (`xText`) for
labels, icons and indicator dots on a plain surface or the wash a row paints.
`info` has its own blue ramp, so an informational message can never be mistaken
for a primary action. A component names a status family and reads its roles; it
never mixes a readable text colour out of a solid status colour at runtime, and
never special-cases a mode to make a tint readable. The solid roles are fills: light
`warning` is 1.78:1 against the canvas, so it is never the colour of text or a
dot.

This keeps a brand theme small: overriding `primary` changes every primary
action in the library. A brand that also uses its accent as text overrides
`primaryText` beside it, because a fill and a foreground carry different
contrast obligations: `primary` is a surface with `primaryForeground` on it, and
`primaryText` is the readable step for a link, label or icon on the plain
surfaces and the washes a link paints.

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

Both themes expose exactly the same 54 roles; the type system and the colour
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
  pointer state never turns the fill into the divider's own value.
- `borderStrong` is functional — input and control boundaries. It meets 3:1
  against the canvas, the `muted` panel and the `hover`/`active`/`accent`/
  `selected` washes a row paints, so a checkbox or field is perceivable without
  relying on fill alone.

Elevation is a semantic level, not a literal shadow: `sm` for resting cards,
`md` for menus and popovers, `lg` for dialogs and the command palette. The
runtime paints one shadow per element — no `inset`, no shadow list — so a level
is exactly one shadow, read with `elevationShadow(theme, level)`. A level is
geometry plus an alpha; the tint is the single `shadow` role, so a brand retints
every level by editing one value. Overlay layering uses the `overlay` scrim
colour; `elevation.overlay` is reserved and empty so the shape stays stable.
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
| hover | `hover` wash on ghost and subtle surfaces; filled actions step to `primaryHover` / `destructiveHover` (opaque, contrast-checked) instead of compositing an alpha fill |
| pressed | `active` wash |
| loading | `skeleton` fill with `pulse` (or `step`) motion, held to the 1.05:1 perceivability floor on every shipped canvas; the active indicator uses `primary` |
| selected | `selected` + `selectedForeground` |
| link | `primaryText` on the plain surfaces and the `hover`/`active` washes a link paints; `primary` is a fill and is never the colour of text |
| disabled | `disabled` + `disabledForeground`, plus a non-colour cue where possible |
| focus | `focusRing(theme)`: a zero-offset, zero-blur `boxShadow` spread by `borderWidth.strong`, painted from `ring` while the control is focused |
| text selection | `selection` wash via `selectionColor`; body and secondary text keep their floors through the composited wash on every surface a glyph is selected on, and the wash itself stays perceivable; `userSelect: "none"` opts chrome out |
| status | a family (`info`/`success`/`warning`/`destructive`) via its solid role for a fill, its soft pair through `statusTone(theme, tone)`, or its `xText` role for labels, icons and dots on a plain surface or the `hover`/`active`/`accent`/`selected` wash a row paints; a tone from untrusted data narrows with `isStatusTone` |

Focus never changes layout: the ring is a shadow, painted outside the border box,
so gaining focus reflows nothing. GPUix 0.10.0 has **no `outline*` properties and
no `focusVisible` state** — a nested style offers only `hover` and `active`, and
`boxShadow` is a single shadow — so `focusRing(theme)` is the one shape the
runtime can draw. The component applies it while it holds focus, which means a
mouse press shows the ring too: there is no `:focus-visible` to distinguish a Tab
from a click. A design that needs that distinction must keep a press from
focusing the control (that limitation is real and is not worked around).

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

Colour is checked, not assumed. `packages/tokens/src/color.test.ts` enforces:

| Pair class | Default | High contrast |
| ---------- | ------- | ------------- |
| body text on `background`/`card`/`muted`/`popover`/`input` and the `hover`/`active` washes | 7:1 | 7:1 |
| secondary text (`mutedForeground` on plain surfaces and on the `hover`, `active`, `accent` and `selected` washes), on-colour text, placeholder, ghost text on the `hover`/`active` washes | 4.5:1 | 7:1 |
| soft status text (`xSoftForeground` on `xSoft`) | 7:1 | 7:1 |
| status text (`xText`) on `background`/`card`/`popover` and the `hover`/`active`/`accent`/`selected` washes | 4.5:1 | 7:1 |
| brand-toned text (`primaryText`) on `background`/`card`/`popover`/`muted` and the `hover`/`active` washes | 4.5:1 | 7:1 |
| text selection (body text over the composited `selection` wash on `background`/`card`/`muted`/`hover`/`active`/`accent`/`popover`/`input`) | 7:1 | 7:1 |
| text selection in a selected row (`selectedForeground` over the wash on `selected`) | 4.5:1 | 7:1 |
| text selection of secondary text (`mutedForeground` over the composited `selection` wash on `background`/`card`/`muted`/`hover`/`active`/`accent`/`popover`/`input`/`selected`) | 4.5:1 | 7:1 |
| text selection wash (`selection` composited over `background`/`card`/`muted`/`hover`/`active`/`accent`/`popover`/`input`/`selected`) | 1.05:1 | 1.05:1 |
| focus ring on `background`/`card`/`popover`/`muted`/`accent` and the `hover`/`active`/`selected` washes, and essential boundaries on `popover`, `muted` and the four state washes | 3:1 | 4.5:1 |
| soft status surface (`xSoft`) on `background`/`card`/`popover` | 1.05:1 | 1.05:1 |
| loading skeleton (`skeleton`) on `background`/`card`/`popover` | 1.05:1 | 1.05:1 |
| decorative dividers (`border`) on `background`/`card`/`popover` and the `secondary`/`hover`/`active`/`accent` fills a bordered control paints | 1.05:1 | 3:1 |

The test runs for every shipped colour set — platform variants included, each on
its own canvas — and is part of the normal test suite.
It can fail: a palette edit that reduces contrast fails the gate. The same check
is public: `themeContrastFailures(theme)` returns every pair an edited theme
misses, so a brand theme or copied platform style can be held to these floors in
its own test suite.

`packages/tokens/src/docs.test.ts` holds this page's machine-checkable claims —
the identity metrics, the shipped role count, the theme surfaces, the type
summary, and the spacing, density, radius, icon and avatar scales — to the same
implementation, as it does for the catalogue in [`tokens.md`](./tokens.md).

Not covered, deliberately:

- disabled text (WCAG exempts inactive controls); it stays visibly dimmed;
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

- `createTheme({ mode, ...overrides })` — start from a built-in theme.
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
them. A whole theme object from a file is a different boundary: decode it with
the application's `Schema`.

A theme carries its contrast level the way it carries its mode: `extendTheme`
keeps the base's declaration and `applyPlatformStyle` and
`themeContrastFailures` default to it, so the short call is the safe one. A
declaration is a claim; `themeContrastFailures` is what proves it.

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

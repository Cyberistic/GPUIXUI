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

A high-contrast theme is the one combination that keeps its own palette: it takes
the families, radii and density but no platform colour, because accessibility
outranks the platform look. `Theme.contrast` records which variant a theme
carries, so a consumer can branch on it. Every platform palette is measured on
the same contrast floors as the built-in themes, so "looks native" never means
"reads worse".

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

## 7. Radii, borders and elevation

Radii: 0, 4, 6, 8, 12, full. Small controls use 4 or 6; cards 8; dialogs 12.
Pills and avatars use `full` (clamped by the renderer to half the short side).
Identity marks use their own diameter scale — 20, 26, 32, 40 — with 32 as the
default. It is fixed rather than theme-driven, and never follows density: a
circle is content, not a control.

Two border roles:

- `border` is decorative — dividers and card edges. It is intentionally subtle.
- `borderStrong` is functional — input and control boundaries. It meets 3:1
  against the canvas so a control is perceivable without relying on fill alone.

Elevation is a semantic level, not a literal shadow: `sm` for resting cards,
`md` for menus and popovers, `lg` for dialogs and the command palette. A level is
designed as **one** shadow, read with `elevationShadow(theme, level)`; the
runtime also accepts a shadow list, but the scale does not use one, so a level
cannot render half of itself. Overlay layering uses the `overlay` scrim colour;
`elevation.overlay` is reserved and empty so the shape stays stable. Dark shadows
are darker and more opaque because contrast between surfaces is lower.

## 8. Interaction states

| State | Role / mechanism |
| ----- | ---------------- |
| hover | `hover` wash on ghost and subtle surfaces; a filled action moves to `filledHover(theme, action)` |
| pressed | `active` wash; a filled action moves to `filledPressed(theme, action)` |
| selected | `selected` + `selectedForeground` |
| disabled | `disabled` + `disabledForeground`, plus a non-colour cue where possible |
| focus | `keyboardFocusRing(theme)` — an `outline` in the runtime's `focusVisible` state, painted only after keyboard input; `focusRing(theme)` — the unconditional shadow for a programmatic focus (a mouse-opened overlay) |
| text selection | `selection` translucent wash |
| status | a family (`info`/`success`/`warning`/`destructive`) via its solid role, or a soft pair through `statusTone(theme, tone)` |

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
| secondary text on background/card/muted/popover | 4.5:1 | 7:1 |
| on-colour text, placeholder | 4.5:1 | 7:1 |
| soft status text (`xSoftForeground` on `xSoft`) | 7:1 | 7:1 |
| status text on `background`/`card` (a field error, an inline warning) | 7:1 | 7:1 |
| focus ring and essential boundaries | 3:1 | 4.5:1 |
| soft status surface against `background` and `card` | 1.05:1 | 1.05:1 |
| filled action label on its derived hover and press fill | 4.5:1 | 7:1 |

The test runs for every shipped colour set — light, dark, both high-contrast
variants and all six platform themes — and is part of the normal test suite. It
can fail: a palette edit that reduces contrast fails the gate.

A value the renderer cannot paint is the other silent failure: GPUix ignores a
colour string it cannot parse, so a typo keeps the property's previous value or
paints black. `invalidColorRoles(theme)` reports every role that is not a 6- or
8-digit hex colour, and it is what found the documented brand example pairing a
saturated violet with the dark theme's near-black on-colour — 4.24:1, below the
floor. The example now ships a white label with its violet, and the audit runs
over it in `theme.test.ts`.

The contract is public, so a brand theme runs the same checks:
`contrastRatio(foreground, background)` measures two opaque roles, and
`contrastPairs` with `contrastFloors` / `highContrastFloors` names the pairs and
the floors. Nothing about the requirement is private to this repo.

Not covered, deliberately:

- disabled text (WCAG exempts inactive controls); it stays visibly dimmed;
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
| elevation is one shadow per level by design | `boxShadow` accepts a list, but a level is designed as one shadow |
| `letterSpacing` absent | no display tracking or all-caps tracking |
| no OS appearance query | the app owns the mode |
| `virtual-list` has no hover/active style | wrap it and style the wrapper |
| shadows are structured objects | elevation tokens are objects, not CSS strings |
| invalid colour strings are ignored per property | a typo paints the previous/black value; `invalidColorRoles` reports it, and the shipped themes are held to the hex grammar by test |

## 11. Extension

The extension mechanism is deliberately small:

- `createTheme({ mode, ...overrides })` — start from a built-in theme.
- `extendTheme(base, overrides)` — derive from any theme, including another
  brand theme or a high-contrast theme.
- `ThemeProvider theme={…}` — scope a theme to a subtree; nested providers
  allow a branded panel inside a neutral shell.
- Every choice a consumer can persist — mode, contrast, platform, density,
  control size, status tone — has an ordered index beside a guard that takes
  `unknown` (`themeModes`/`isThemeMode`, `platformNames`/`isPlatformName`, …),
  so a settings row or a docs toggle iterates the axis and a restored value
  narrows without a cast.

Overrides merge by group; typography merges field by field; elevation levels are
replaced as whole arrays; the mode is immutable. Nothing mutates the base, so a
theme can be created once at startup and shared.

A brand may change any value but should not remove roles: every component
expects the full role set. A brand that needs a different structure should add
roles in the tokens package, not fork components.

Overrides are plain data, so `extendTheme` cannot reject a colour the renderer
would ignore. The audit is the gate: `invalidColorRoles` for paint-readiness and
`contrastFailures` for readability, run over the resolved theme before it ships
and asserted in the package's own tests.

## 12. Non-goals

- No component-level token catalogue. Semantic roles plus scales are enough; a
  per-component token file would duplicate the same decisions.
- No theme-authoring UI in the library. The docs site's `/docs/themes` editor is a
  consumer of the same `Theme` shape; the library ships the API, not the editor.
- No motion tokens here. `@gpuixui/motion` owns durations, easings, springs and
  inertia; this package stays colour, type, space, radius and elevation.
- No web preview pretending to be native. The playground is the visual proof.

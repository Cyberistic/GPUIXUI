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
labels, icons and indicator dots on `background` or `card`. `info` has its own
blue ramp, so an informational message can never be mistaken for a primary
action. A component names a status family and reads its roles; it never mixes a
readable text colour out of a solid status colour at runtime, and never
special-cases a mode to make a tint readable. The solid roles are fills: light
`warning` is 1.78:1 against the canvas, so it is never the colour of text or a
dot.

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

Both themes expose exactly the same 53 roles; the type system and the colour
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
`platformTheme(theme, platform)` derives one with `extendTheme`, keeping the
colours, scales, mode and density of its base and changing only the two
families, so the docs platform toggle previews exactly what a native build
renders. A platform is a font decision here, never a second design system.

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

## 7. Radii, borders and elevation

Radii: 0, 4, 6, 8, 12, full. Small controls use 4 or 6; cards 8; dialogs 12.
Pills and avatars use `full` (clamped by the renderer to half the short side).

Two border roles:

- `border` is decorative — dividers and card edges. It is intentionally subtle.
- `borderStrong` is functional — input and control boundaries. It meets 3:1
  against the canvas so a control is perceivable without relying on fill alone.

Elevation is a semantic level, not a literal shadow: `sm` for resting cards,
`md` for menus and popovers, `lg` for dialogs and the command palette. The
runtime paints one shadow per element — no `inset`, no shadow list — so a level
is exactly one shadow, read with `elevationShadow(theme, level)`. Overlay
layering uses the `overlay` scrim colour; `elevation.overlay` is reserved and
empty so the shape stays stable. Dark shadows are darker and more opaque because
contrast between surfaces is lower.

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
| selected | `selected` + `selectedForeground` |
| disabled | `disabled` + `disabledForeground`, plus a non-colour cue where possible |
| focus | `focusRing(theme)`: a zero-offset, zero-blur `boxShadow` spread by `borderWidth.strong`, painted from `ring` while the control is focused |
| text selection | `selection` translucent wash |
| status | a family (`info`/`success`/`warning`/`destructive`) via its solid role for a fill, its soft pair through `statusTone(theme, tone)`, or its `xText` role for labels, icons and dots on a plain surface |

Focus never changes layout: the ring is a shadow, painted outside the border box,
so gaining focus reflows nothing. GPUix 0.10.0 has **no `outline*` properties and
no `focusVisible` state** — a nested style offers only `hover` and `active`, and
`boxShadow` is a single shadow — so `focusRing(theme)` is the one shape the
runtime can draw. The component applies it while it holds focus, which means a
mouse press shows the ring too: there is no `:focus-visible` to distinguish a Tab
from a click. A design that needs that distinction must keep a press from
focusing the control (that limitation is real and is not worked around).

Selection never relies on colour alone for meaning: selected rows also carry
`aria-selected` where the runtime exposes it.

Components that cannot express hover or active in the runtime (for example
`virtual-list`, whose GPUI list has no pressed or hovered style) put the state
on a wrapping element instead of faking it.

## 9. Accessibility

Colour is checked, not assumed. `packages/tokens/src/color.test.ts` enforces:

| Pair class | Default | High contrast |
| ---------- | ------- | ------------- |
| body text on background/card/popover/input | 7:1 | 7:1 |
| secondary text (`mutedForeground` on plain surfaces), on-colour text, placeholder, ghost text on the `hover`/`active` washes | 4.5:1 | 7:1 |
| soft status text (`xSoftForeground` on `xSoft`) | 7:1 | 7:1 |
| status text (`xText`) on `background`/`card` | 4.5:1 | 7:1 |
| text selection (`foreground` over the composited `selection` wash) | 7:1 | 7:1 |
| focus ring and essential boundaries | 3:1 | 4.5:1 |
| soft status surface against `background` and `card` | 1.05:1 | 1.05:1 |

The test runs for every shipped colour set and is part of the normal test suite.
It can fail: a palette edit that reduces contrast fails the gate.

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
| `virtual-list` has no hover/active style | wrap it and style the wrapper |
| shadows are structured objects | elevation tokens are objects, not CSS strings |
| invalid colour strings are ignored per property | a typo paints the previous/black value; tests restrict roles to hex |

## 11. Extension

The extension mechanism is deliberately small:

- `createTheme({ mode, ...overrides })` — start from a built-in theme.
- `extendTheme(base, overrides)` — derive from any theme, including another
  brand theme or a high-contrast theme.
- `ThemeProvider theme={…}` — scope a theme to a subtree; nested providers
  allow a branded panel inside a neutral shell.

Overrides merge by group; typography merges field by field, motion timing by
timing and easing by easing; elevation levels are replaced as whole arrays; the
mode is immutable. Nothing mutates the base, so a theme can be created once at
startup and shared.

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

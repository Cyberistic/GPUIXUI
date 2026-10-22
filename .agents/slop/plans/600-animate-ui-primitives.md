# 600 — Animate UI animated primitives: gap analysis and phases

| Field | Value |
| ----- | ----- |
| Status | planned |
| Phase | D — after the core component tiers |
| Reference | `references/animate-ui` (`imskyleen/animate-ui`, MIT + Commons Clause) |
| Feeds | the `motion` workstream and the components inventory |
| Depends on | `@gpuixui/motion`, `@gpuixui/tw`, the runtime capability matrix |

The reference is read for **patterns and API shape only**. The Commons Clause
forbids redistributing its source, so every primitive here is re-implemented on
GPUix primitives; nothing is copied.

## 1. What we already ship

The non-animated v1 surface is the same shadcn set we have already ported:
accordion, avatar, breadcrumb, button, calendar, card, checkbox, dropdown-menu,
hover-card, input, label, popover, resizable, scroll-area, select, separator,
sheet, sidebar, skeleton, slider, switch, tabs, toggle, tooltip.

Direct overlaps with the animated catalogue: **Button**, **Tooltip**, **Tabs**,
**OTPField** (`input-otp`), **Avatar** (no group), and the overlay family
(`Dialog`, `Drawer`, `Popover`, `DropdownMenu`, `CommandMenu`, `Toast`).

## 2. Gaps — 47 primitives, grouped

### Text effects (12)

`splitting-text`, `typing-text`, `morphing-text`, `rotating-text`,
`swapping-text`, `sliding-text`, `rolling-text`, `scrolling-number`,
`sliding-number`, `counting-number`, `gradient-text`, `highlight-text`

### Reveal and scroll (8)

`blur`, `fade`, `zoom`, `slide`, `highlight`, `auto-height`, `scroll-fade`,
`scroll-progress`

### Interaction effects (8)

`magnetic`, `tilt`, `click`, `ripple-button`, `icon-button`, `flip-button`,
`liquid-button`, `shine`

### Media and collections (5)

`image-zoom`, `avatar-group`, `pinned-list`, `motion-grid`, `particles`

### Backgrounds (9)

`bubble`, `fireworks`, `glyph`, `gradient`, `gravity-stars`, `hexagon`, `hole`,
`stars`, `topography`

### Blocks (5)

`code-block`, `copy-button`, `page-transition`, `theme-toggler`, `github-stars`

`github-stars` is out of scope unless a consumer needs it; record it as
declined rather than planned.

## 3. Phase 0 — wire motion into the surfaces we already have

This is the prerequisite: without a house animation style the animated
primitives have nothing to compose with.

| Surface | Reference behaviour | GPUix mapping |
| ------- | ------------------- | ------------- |
| Dialog / Drawer | fade + small scale on enter, reverse on exit | **no `transform`** — fade `opacity` + offset `top`/`left` by 4–8px |
| Popover / Dropdown / Command | fade + slide toward the anchor, side-aware | fade + offset on the anchored layer |
| Toast | slide in from the edge + fade, slide out on dismiss | animate `left`/`right` + `opacity` |
| Accordion | height expand/collapse | animate `height` from measured content |
| Tabs | indicator slides between triggers | animate `left` + `width` |
| PreviewCard | fade + offset after a delay | fade + offset |

Rules:

- Presence is owned by GPUix's `AnimatePresence`; physics by `@gpuixui/motion`.
- Never animate `transform` — the runtime has no such style key (upstream
  issue #102). A scale or rotate effect degrades to fade + offset until the
  runtime ships it.
- Motion must respect the reduced-motion setting where the runtime exposes one.

## 4. Phases

1. **Text effects** — cheapest; pure text plus motion, no layout risk.
2. **Reveal and scroll** — `auto-height` and `scroll-progress` first, they unlock
   the rest.
3. **Interaction effects** — `magnetic`/`tilt` are blocked on `transform`; ship
   the honest fallback or defer them.
4. **Media and collections** — `image-zoom` and `motion-grid` also need
   `transform`; `avatar-group`, `pinned-list` and `particles` do not.
5. **Backgrounds** — decorative; lowest priority.
6. **Blocks** — `code-block`, `copy-button`, `theme-toggler` (we have a landing
   toggle but no component), `page-transition`.

## 5. Acceptance

- Every primitive lands with code, a test that can fail, a docs page, an example
  and a `COMPONENTS.md` row.
- Phase 0 is proven by behaviour tests: a dialog/drawer/toast/accordion/tab entry
  and exit is measured on the real renderer, not asserted from intent.
- `@gpuixui/motion` is imported by the surfaces Phase 0 touches.

# 719 — The sheet and drawer drawings open on the surface

Source: an owner report against the deployed docs. `/docs/components/sheet` and
`/docs/components/drawer` painted an empty stage: the drawer was mounted only
after a press, so the first paint was a geometry toolbar over a 340px box with
no surface in it, and the drawer page's frame hugged its content at 303px, so a
400px `md` panel could not read as anchored to a window edge.

Applies to `apps/docs` only: the shipped `Drawer`/`Sheet` are not changed. Where
the component is still wrong, this plan records it instead of hiding it.

## Measured before (headless Chrome, 1300 × 900)

| Page | `.gx-drawer-frame` | `.gx-drawer` | Controls |
| ---- | ------------------ | ------------ | -------- |
| `/docs/components/sheet` | 602 × 340 at (349, 378) | **null** | `From the right`, `From the left`, `From the bottom`, `Dismissible` |
| `/docs/components/drawer` | 303 × 340 at (499, 406) | **null** | `Filters` |

## Defects and causes

| # | Defect | Cause | Fix |
| - | ------ | ----- | --- |
| 1 | neither page paints a surface | `useDrawer` holds `useState(false)`; nothing mounts until a press | start open, and move focus only when the reader opened it (`openedByReader`) |
| 2 | the sheet floats in a ~600px box | the drawing sizes the surface from a hardcoded `PREVIEW_WINDOW` (560 × 340) inside a 602px card, so the box it anchors to is not the frame | the frame **is** the window (`width: 100%`, `height: 420px`) and the surface takes its box from the frame in CSS (`min(var(--gx-drawer-width), 100%)`, `min(var(--gx-drawer-height), 100%)`, edge margins) |
| 3 | the drawer's frame is 303px | the scene was not stretched (`.gx-demo` centres its children) and the frame had no width | `.gx-drawer-scene { align-items: stretch }` + `.gx-drawer-frame { width: 100% }` |
| 4 | the geometry control cannot change a mounted surface | the controls sit inside the frame, under the open veil | the controls move to a toolbar above the frame; the edge buttons are the trigger and replay the slide on a side change |
| 5 | the sheet has three edges | `DrawerSide` omits `top` although `DrawerSide` in `drawer.tsx` carries it | `top` in the model, the grabber, the CSS keyframes, the edge buttons and the source snippet |
| 6 | the grabber is a 10px literal | `theme.spacing.sm` is 6px, and the drawing hardcoded 10px | `top: var(--spacing-sm)` for a bottom sheet, `bottom: var(--spacing-sm)` for a top one |
| 7 | the lift is a literal that only matches the dark mode | `box-shadow: 0 24px 60px var(--shadow)` | the bridge writes `--elevation-<level>` from `elevationShadow`; `.gx-drawer` paints `var(--elevation-lg)` |
| 8 | the close control scrolls with the body | it sat in the scroller | `.gx-drawer` is the box (surface, lift, corners, clipping) and `.gx-drawer-panel` is the scroller; the close control and grabber are siblings of the panel, as in the component |
| 9 | reduced motion still slides from `left`, `bottom` and `top` | each edge's `animation-name` is one attribute selector more specific than the base `.gx-drawer`, so `animation: none` on the base lost the cascade | the reduced-motion block names each edge (and the test requires every animated drawer selector to be surrendered) |

## Files

- `apps/docs/src/components/docs/sheet-drawer-preview.tsx` (new) — both scenes,
  the shared `DrawerSurface`, the focus/Escape/Tab hook and the source strings;
  replaces `drawer-demo.tsx`.
- `apps/docs/src/components/docs/sheet-drawer-preview.test.tsx` (new) — the
  drawing guards below.
- `apps/docs/src/components/docs/drawer-preview.ts` — four edges + `isVertical`;
  the box arithmetic moves to the style sheet.
- `apps/docs/src/components/docs/drawer-preview.test.ts` — edge + dismiss +
  filter model (the box cases move to the CSS guard).
- `apps/docs/src/components/docs/{demos,overlay-motion,overlay-stage}.ts(x)` —
  registry imports, exact-selector block reader, frame-height guard.
- `apps/docs/src/lib/theme-css.ts` — `--elevation-{sm,md,lg}`, and
  `theme-css.test.ts` gains `publishes each elevation level's own shadow`.
- `apps/docs/src/styles/demos.css` — the frame, sizes, edges, keyframes,
  grabber, panel and close control.
- `apps/docs/README.md`; `apps/docs/content/docs/components/drawer.mdx`,
  `packages/components/docs/{drawer,sheet}.mdx` — one sentence each on the
  first paint; `TODO.md`; this plan's index row.

## Implementation

1. Delete `drawer-demo.tsx`; move both drawings into
   `sheet-drawer-preview.tsx`. Registry names stay `drawer-sides` (the sheet
   page, `packages/components/docs/sheet.mdx`) and `drawer-workflow` (the drawer
   page).
2. `useDrawer`: `useState(true)`; `openedByReader` gates the panel focus; every
   `focus()` passes `{ preventScroll: true }`; `usePreviewInteractive()` keeps a
   still tile from installing listeners.
3. `DrawerSurface`: backdrop `onClick={onBackdrop}`; `.gx-drawer` carries
   `data-side`/`data-size`, `role="dialog"`, `aria-modal`, `aria-label`,
   `tabIndex={-1}`; `isVertical(side)` paints the grabber; the panel scroller and
   the close control are siblings of the grabber.
4. CSS: the frame is the window; sizes are the component's tables as
   `--gx-drawer-*`; per-edge width/height clamp, margin and inner radius;
   four keyframes that travel 100% of the box; `top`/`bottom` grabber at
   `--spacing-sm`; reduced motion `animation: none`.
5. `toCssVars` writes `--elevation-<level>` for every level the theme carries.

## Test plan — each case is proven by inverting the fix

`nub run --filter @gpuixui/docs test src/components/docs/sheet-drawer-preview.test.tsx -t <case>`

| Case | Inversion | Recorded failure |
| ---- | --------- | ---------------- |
| open both pages on the surface, on the component's default edge | `useState(true)` → `useState(false)` | `expected +0 to be 1` |
| paints the surface inside a frame that is the window's box | drop `height: 420px` from `.gx-drawer-frame` | `expected '\n  position: relative;\n  width: 100…' to contain 'height: 420px'` |
| mirrors the component's size tables | `--gx-drawer-width: 400px` → `401px` | `expected '\n  --gx-drawer-width: 401px…' to contain '--gx-drawer-width: 400px'` |
| reads the slide's travel and duration out of the library | `@keyframes gx-sheet-in-bottom` from `translate: 0 100%` → `0 88%` | `bottom travels the wrong span: expected … to contain 'translate: 0 100%'` |
| paints the settled frame when the reader asks for less motion | drop `.gx-drawer[data-side="top"]` from the reduced-motion block | `expected [ '.gx-drawer[data-side="top"]' ] to deeply equal []` |
| wears the grabber only on a top or bottom edge | `isVertical(side)` → `side === "bottom"` | `expected +0 to be 1` |
| rounds the inner corners and lifts with the theme's `lg` | `box-shadow: var(--elevation-lg)` → a literal | `expected '\n  position: relative;\n  display: f…' to contain 'box-shadow: var(--elevation-lg)'` |
| dismisses on an outside press and focuses without scrolling | `focus({ preventScroll: true })` → `focus()` | `expected [ [ '.focus()', '', …(3) ] ] to deeply equal []` |

## Gates and browser pass

- `nub run --filter @gpuixui/docs test` — 221 files / 2 227 tests.
- `nub run check` — `check:tests`, `check:exports`, `oxlint`, `oxfmt`,
  `check-types` (the testing package's `dist` must exist: `nub run --filter
  @gpuixui/testing build` in a fresh clone).
- Real browser (`playwright-core` + the installed Chrome) against the dev
  server: first paint `.gx-drawer` with `data-side`, flush to the frame's inner
  edge, and a measured slide after a press.

## Measured after (same viewport)

| Page | Frame | `.gx-drawer` | Slide |
| ---- | ----- | ------------ | ----- |
| sheet | 602 × 420 at (349, 484) | 400 × 418 at (550, 485), `data-side="right"` | bottom: y 876 → 583 over ~320 ms (own 320px height) |
| drawer | 602 × 420 at (349, 456) | 400 × 418 at (550, 457), `data-side="right"` | right: x 916 → 550 over ~320 ms (own 400px width) |

Both server-render one `role="dialog"`; the sheet's `bottom`/`top` edges paint
the grabber 6px from the inner edge; the left, bottom and top edges each start
a whole span outside the frame.

## Component findings (not drawing bugs)

- `drawer.tsx`'s grabber is `theme.spacing.sm` from the **sliding box** while the
  surface's 1px border sits inside it; the drawing's border makes its grabber
  1px further in. Cosmetic, and recorded rather than “fixed” with a literal.
- Everything the component's own record lists still stands: no `aria-modal`
  labelled surface beyond `aria-label` (the drawing adds `aria-modal` because a
  browser can), no drag host, no `filter`, no `transform`.

## STOP

Stop if the fix needs a timer, a `transform`, a second copy of the component's
size tables outside the style sheet, or a literal that is not a theme role.

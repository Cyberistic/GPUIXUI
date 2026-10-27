# 717 — Overlay surfaces: motion, wash, placement, chevron, link trigger

Source: five owner reports against the overlay family (sheet, drawer, popover,
navigation menu, hover card). Applies to `packages/components` **and** the
browser drawings in `apps/docs`, which are reproductions of the native surfaces
and must mirror the component's constants.

## Defects and causes

| # | Report | Cause | Fix |
| - | ------ | ----- | --- |
| 1 | sheet is not animating in, needs the blur | the drawing is static; the native drawer travels 12px (barely a slide) | native: slide the surface its own width/height from the edge, clipped by the veil (`overflow: hidden`), moving surface + close control + grabber as one box; drawing: the same slide in CSS with the veil's wash+blur |
| 2 | drawer needs redoing | square surface, no radius, no grabber, no themed lift | side-aware inner radius (`radius.xl`), `DrawerGrabber` for top/bottom sheets, `overlayVeilStyle` + `elevation.lg`; state what the runtime cannot do (drag, snap points, full-width transform) |
| 3 | popover needs side examples | one example, default side only; and requested sides were wrong | fix `resolvePlacement` to choose by **room**, not by the surface's unplaced box (which sat on the trigger and always "overlapped"); add a four-side + collision drawing |
| 4 | navigation menu not smooth, layout shift on hover, wrong chevron | drawing swaps keyboard characters for the caret; the trigger has no chevron at all | hoist `internal/flip-mark.tsx` (accordion's cross-fade) and paint `chevron-down`/`chevron-up` in a fixed slot; drawing uses the lucide chevron in the same slot and animates the panel |
| 5 | hover card broken / not a link | drawing's card overflows the preview's scroller; trigger paints as a chip | reserve the card's box in the drawing; trigger defaults to the new `link` look (underline, no fill) |

## House behaviour

- The modal veil paints `alpha(theme.colors.background, 0.55)` (the wash) and
  dismisses on an outside press. **The runtime has no `filter`/`backdrop-filter`,
  so the native veil cannot blur**; the drawings blur 6px and say so.
- No `transform` anywhere in native code. The drawer slide is a numeric
  `left`/`top` offset; the chevron is a two-mark cross-fade.
- Reduced motion paints the settled frame at once (the seam's zero duration).

## Files

- `packages/components/src/internal/placement.ts` (+ `.test.ts`)
- `packages/components/src/internal/overlay.ts` (`OVERLAY_WASH`, `overlayVeilStyle`)
- `packages/components/src/internal/flip-mark.tsx` (new), `accordion.tsx`
- `packages/components/src/dialog.tsx`, `drawer.tsx`, `sheet.tsx`
- `packages/components/src/navigation-menu.tsx`, `hover-card.tsx`, `internal/button.tsx`
- `packages/components/src/behaviour/*.test.tsx` (placement, drawer, sheet,
  popover, navigation-menu, hover-card, overlays)
- `apps/docs/src/components/docs/{drawer,popover,hover-card,navigation-menu}-*`
- `apps/docs/src/styles/demos.css`; `demos.tsx`
- Docs rows: `packages/components/docs/{drawer,sheet,popover,navigation-menu,hover-card}.mdx`,
  `COMPONENTS.md`, `docs/component-api.md`, `apps/docs/src/lib/related.ts`

## Test plan

Every case fails on the inverted source (recorded in the report):

- `placement.test.ts`: side chosen by room with an unplaced surface box; the
  four sides survive; a bottom surface at the window foot flips up.
- `behaviour/popover.test.tsx`: each side's gap, and a right-edge bottom panel
  pulled back inside `collisionPadding`.
- `behaviour/drawer.test.tsx` + `sheet.test.tsx`: t=0 frame differs from the
  settled frame by the surface's own span; reduced motion paints settled at
  once; radius/grabber.
- `behaviour/overlays.test.tsx`: the veil wash behind Dialog, Drawer, Sheet,
  CommandMenu, ConfirmDialog; outside press dismisses.
- `behaviour/navigation-menu.test.tsx`: chevron marks + cross-fade; sibling
  bounds unchanged by a hover open.
- `behaviour/hover-card.test.tsx`: card inside the window frame; trigger paints
  as a link.
- `apps/docs`: drawing CSS carries the wash + 6px blur for every overlay family;
  drawer slide/grabber/radius constants read from the component; popover four
  sides; nav chevron; hover-card frame.

## Gates

`nub run --filter @gpuixui/components test`, `… test:behaviour`,
`nub run --filter @gpuixui/docs test`, `nub run check`; then a real browser pass
with `playwright-core` against `build` + `preview`.

## STOP

Stop if a fix needs a `transform`, a timer outside `internal/local-state.ts`, or
if the runtime refuses the slide's `left`/`top` frame — record it instead.

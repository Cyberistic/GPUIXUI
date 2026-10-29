# 720 — The image preview zooms with `ImageZoom`, and the log viewer is its surface

Source: an owner report against the deployed docs. `/docs/components/image-preview`
promises "a pointer zoom" and draws a centre-scaled hover instead; the drawing
never follows the pointer and its `160%` is a second magnification rule.
`/docs/components/log-viewer` draws a hand-rolled toolbar: the level chips collide,
`Follow tail` overlaps them, the rows have no level gutter and no row height, the
frame leaves an empty band under eight rows, and the readout sits inside the frame.

Applies to `apps/docs`, plus one subpath export in `packages/components` and one
constant moved into `packages/files`' existing pure module. No component behaviour
changes.

## What the components actually do

| Component | Rule the drawing must run |
| --------- | ------------------------- |
| `ImageZoom` (`packages/components/src/image-zoom.tsx`) | `zoomGeometry` resolves frame (240 × 160) and magnification (`1.6`, held `1…4`); `zoomRest` covers the frame; `zoomFollow` keeps the pointer's share of the frame under the pointer and pins an edge; `zoomFrames` is the four-field box. Reduced motion drops the tween, not the magnification. |
| `LogViewer` (`packages/files/src/log/log-viewer.tsx`) | `LEVEL_COLUMN_WIDTH = 56` is the level gutter; a row is the density's `rowHeight` (`--row-height`); the toolbar is `LOG_TOOLBAR` (a `ToggleGroup` and a `Toggle`); the viewport is the `height` the page's usage and example pass (`240`). The component has no timestamp gutter. |

## Files

- `packages/components/package.json` — `./image-zoom/logic` → `./src/image-zoom/logic.ts`.
- `packages/files/src/log/logic.ts` — owns `LEVEL_COLUMN_WIDTH`.
- `packages/files/src/log/log-viewer.tsx` — imports the constant; no behaviour change.
- `packages/files/src/index.ts` — exports the constant from `log/logic.js`.
- `apps/docs/src/components/docs/image-preview-demo.tsx` — the loaded state paints
  `zoomRest`/`zoomFollow`'s box from the pointer; the frame is pure in a
  `pointer` prop so a test can read a known position.
- `apps/docs/src/components/docs/log-viewer-demo.tsx` — the toolbar is
  `.gx-tgroup` + `.gx-btn gx-toggle` (levels, `Follow tail`), the gutter is
  `LEVEL_COLUMN_WIDTH`, the list is `LOG_FRAME_HEIGHT`, the readout is a caption
  under the frame.
- `apps/docs/src/styles/demos.css` — delete the `:hover` fake zoom; add the
  picture's `max-width: none` and the component's 200 ms transition; rebuild the
  log toolbar/row rules on theme variables (`--row-height`).
- Tests: `apps/docs/src/components/docs/media-demo.test.tsx`,
  `apps/docs/src/components/docs/log-viewer-demo.test.tsx`.
- `TODO.md`, the plan index, and the two package READMEs if they name the seam.

## Implementation

1. Export the zoom logic subpath; import `zoomFollow`, `zoomGeometry`, `zoomRest`
   and the two option constructors in the drawing. Build the geometry once from
   the preview frame and `Option.none()` for `scale` (the component's `1.6`).
2. `PreviewFrame` takes `pointer?: ZoomPointer` and the two pointer callbacks;
   the demo holds the pointer. The picture's `left`/`top`/`width`/`height` are
   the shared rule's box; no `transform`, no hover rule.
3. Move `LEVEL_COLUMN_WIDTH` into `log/logic.ts`; the component's row imports it,
   the drawing sets the gutter's width from it.
4. Rebuild the log drawing: a header strip (the toggle group with each level's
   pressed tone, `Follow tail` as the same toggle family), a `role="log"` list at
   `LOG_FRAME_HEIGHT` whose rows are `--row-height` tall with a 56px level gutter
   and the message, and the readout as a `.gx-demo-readout` caption outside the
   frame. `Append a line` stays a `gx-btn gx-btn-outline gx-btn-sm`.
5. The list keeps all filtered rows and scrolls to the tail while following, so
   the frame is never under-filled.

## Test plan — each case is proven by inverting the fix

| Case | Inversion | Recorded failure |
| ---- | --------- | ---------------- |
| the loaded picture's box is `zoomFollow`'s for a known pointer | replace the box with the old centre scale (`left: -30%`, `width: 160%`) | style is `-30%`/`160%`, not `-90px`/`384px` |
| at rest the picture is `zoomRest`'s exact frame box | restore `inset: 0` and `width:100%` | missing `width:240px;height:160px` |
| the drawing imports the shared rule | import a local copy | source case fails on the import |
| every row's level gutter is `LEVEL_COLUMN_WIDTH` | hardcode `40px` / CSS class only | rendered `width:56px` missing |
| a row is the density's `--row-height` | restore `line-height: 1.55` and no height | CSS block lacks `height: var(--row-height)` |
| the frame is the documented 240px | restore `height: 200px` | inline `height:240px` missing and the page's `height={240}` mismatch |
| the filter paints exactly its level | filter on the raw lines or the wrong set | a row of another level appears |

## Commands

```sh
nub run --filter @gpuixui/docs test
nub run --filter @gpuixui/components test
nub run --filter @gpuixui/files test
nub run check
```

## STOP

- If the zoom logic's subpath does not type-check under the docs' `tsconfig`,
  stop and report the resolver error; do not copy the arithmetic.
- If the log drawing cannot reach `LEVEL_COLUMN_WIDTH` from a pure subpath, stop;
  moving it out of the `.tsx` is the fix, a second literal is not.

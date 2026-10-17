# 161 — Plan: native content surfaces (`<svg>`, `<img>`, `<diff>`, `<canvas>`)

| Field | Value |
| ----- | ----- |
| Status | planned (measured facts land in §8) |
| Phase | B (feasibility) → feeds Tier 1 Icons, Tier 5 Diff viewer / Image preview, and charts |
| Owner | playground workstream (`apps/playground`, `packages/testing`) |
| Depends on | `100`, `110`, `120`, `140` |
| Feeds | `@gpuixui/components` (icon set, image preview, diff viewer), the colour picker and charts rows in `COMPONENTS.md` |

## 1. Goal

Three of the inventory rows rest on element types no scenario has measured yet:
**Icons** (`<svg>`), **Image preview** (`<img>`) and **Diff viewer** (`<diff>`).
A fourth, `<canvas>`, is the trap: it is in the published `ElementType` union and
the JSX types accept it, so a typed app can render one and see nothing. Charts
and the colour picker's saturation/value square depend on the answer.

This probe answers, on this host, with a run rather than a reading:

- does a `<svg source>` element reach the tree, lay out at its declared box, and
  paint?
- how does `<img>` behave for no `src`, an undecodable data URL, a valid data
  URL, and pixels uploaded through the `ImgInstance` ref?
- does `<diff>` paint its file header, hunk header and changed lines?
- what does `<canvas>` actually do — is it created, laid out, painted, and does
  it keep its children?

The honest limit up front: there is **no pixel-readback API**. Evidence is the
retained element type, `getElementBounds` (which only fires from GPUI's
`on_painted`, so it is paint evidence, not layout evidence) for leaf elements,
painted text for `<diff>`, and screenshots as artifacts — never assertions
(PLAN.md D14).

## 2. What the pinned source says (0.10.0)

Read from the scratch build tree, which is the pinned source the binding was
built from (ADR 0003), not from `references/gpuix` (ahead of the release).

- `packages/native/src/custom_elements/mod.rs` registers exactly seven custom
  element factories: `input`, `textarea`, `anchored`, `img`, `svg`, `code`,
  `diff`, `markdown`. **`canvas` has no factory.** `CustomElementRegistry.render`
  logs `Unknown element type: canvas` and returns `gpui::Empty`.
- `ElementType` in `host.d.ts` still lists `"canvas"`, and
  `@gpuix/react/jsx-runtime.d.ts` types `canvas: Props`. The trap is therefore
  type-safe and silent at the JS boundary.
- `<img>`: `ImgSource::Empty` paints a fallback surface whose chrome text is
  **`img: no src`**; `ImgSource::Invalid` paints **`img: load failed`**. Both go
  through `custom_surface`, so they have bounds. A valid source builds a
  `gpui::img` leaf tracked by `track_own_bounds`; a definite width and height
  become an `aspect_ratio` so a loaded bitmap cannot change the box.
  `setImagePixels` is the binary path on the `ImgInstance` ref (no JSON).
- `<svg>`: with `source` (or a decodable `src`) it builds a `gpui::svg` leaf,
  tinted by `style.color` (fallback `#e2e2e2`), tracked by `track_own_bounds`.
  With no source it paints an empty `custom_surface` div. Both branches lay out
  at the declared box, so **bounds cannot distinguish a sourced icon from an
  empty one**; that limitation is recorded, not papered over.
- `<diff>`: rows are `chrome_text` (file path, `+N`, `−N`, hunk header, gutter,
  marker) or selectable text (the line itself), and all of them go through the
  paint log that `getPaintedText()` reads. The whole surface goes through
  `custom_surface`, so a non-empty diff has bounds.
- `<code>` and `<markdown>` already have painted-text evidence in `text-native`,
  so this probe does not repeat them.

## 3. Scenario `native-surfaces` (capability `content`)

New view `apps/playground/src/scenarios/surfaces.tsx`, one scenario. Colours
from `useTheme`; `testId`s all start with `surface-`.

| Element | Props | Expected |
| ------- | ----- | -------- |
| `surface-svg` | `<svg source={searchSvg} style={{ width: 48, height: 48, color: theme.colors.foreground }} />` | retained type `svg`; bounds 48 × 48 |
| `surface-img-empty` | `<img style={{ width: 96, height: 64 }} />` (no `src`) | retained type `img`; bounds 96 × 64; painted text has one `img: no src` |
| `surface-img-broken` | `<img src="data:image/png;base64,AAAA" … />` | retained type `img`; painted text has one `img: load failed` |
| `surface-img-data` | `<img src={onePixelPng} style={{ width: 64, height: 64 }} />` | retained type `img`; bounds 64 × 64; adds no fallback text |
| `surface-img-live` | `<img ref>` with `setImagePixels(2, 2, 16 bytes)` in `useLayoutEffect` | retained type `img`; bounds 32 × 32; adds no fallback text |
| `surface-diff` | `<diff patch={patch} style={{ width: 640 }} />` | retained type `diff`; bounds 640 wide and > 0 tall; painted text contains `example.ts`, the hunk header, `const added = 1`, `const removed = 1` |
| `surface-canvas` | `<canvas testId="surface-canvas" style={{ width: 80, height: 80 }}><text>canvas-child</text></canvas>` | retained type `canvas`; **bounds `null`**; `host.text` sees `canvas-child` in the retained tree; `paintedText()` does **not** contain it |

Readout `surface-note`: `painted=<paintedText().length>`.

Steps:

1. `surface-svg`: `elementType` is `svg`; bounds `48 × 48` (`expectNear`, tolerance
   0.5).
2. `surface-img-empty`: `elementType` is `img`; bounds `96 × 64`; the painted
   text contains exactly one `img: no src`.
3. `surface-img-broken`: `elementType` is `img`; the painted text contains
   exactly one `img: load failed`.
4. `surface-img-data`: `elementType` is `img`; bounds `64 × 64`; the fallback
   counts are still 1 and 1 (a valid decode added none).
5. `surface-img-live`: `elementType` is `img`; bounds `32 × 32`; fallback counts
   unchanged — the ref upload reached the renderer.
6. `surface-diff`: `elementType` is `diff`; bounds width 640 and height > 0;
   painted text contains the file path, the hunk header, the added line and the
   removed line.
7. `surface-canvas`: `elementType` is `canvas`; `bounds` is `Option.None`; the
   retained subtree text is `canvas-child`; `paintedText()` does not contain
   `canvas-child`.

The fallback count is the discriminator. A single global "contains
`img: load failed`" check would pass because the deliberately broken image
produced it; counting occurrences is what makes a valid image that silently
failed to decode fail the probe.

## 4. Exact file changes

| File | Change |
| ---- | ------ |
| `.agents/slop/plans/161-native-content-surfaces.md` | this plan |
| `.agents/slop/plans/README.md` | index row for `161` |
| `packages/testing/src/smoke.ts` | `CAPABILITIES` gains `content`; `SmokeHost` gains `elementType: (testId: string) => string \| null` |
| `packages/testing/src/test-support.ts` | `nullHost.elementType` returns `null` |
| `apps/playground/src/smoke/host.ts` | `elementType` reads `renderer.findByTestId(testId)?.type`; the retained tree, not paint |
| `apps/playground/src/scenarios/surfaces.tsx` | the view + the scenario |
| `apps/playground/src/scenarios/index.ts` | import, register after `a11yScenario`, add `content` to `CORE_CAPABILITIES` |
| `apps/playground/src/smoke/run.test.ts` | the registry test expects `content` in the capability list |
| `apps/playground/README.md` | a "Native content surfaces" section; suite count 26 → 27 |
| `COMPONENTS.md` | capability table row; Icons/Image preview/Diff viewer and Charts/Color picker notes cite the measurement |
| `TODO.md` | the pending probe task is ticked with its result; suite count updated |

`elementType` is deliberately separate from `bounds`: it answers "did the
runtime retain this node?" while `bounds` answers "did it paint?". `<canvas>`
is exactly the case where the first is true and the second is false, and
without both the trap is invisible.

## 5. Commands and expected results

1. `nub run --filter @gpuixui/testing test` → exit `0`.
2. `nub run --filter playground check-types` → exit `0`.
3. `nub run --filter playground build` → exit `0`.
4. `nub apps/playground/dist/smoke/run.js --only native-surfaces` → `1/1`,
   exit `0`, `content=verified`.
5. `nub apps/playground/dist/smoke/run.js` → **27/27**, exit `0`.
6. `nub run check`, `nub run lint`, `nub run test` → all exit `0`.

## 6. STOP conditions

- **STOP** if a valid 1 × 1 PNG data URL does not paint (bounds `null` or the
  fallback text appears). Record the actual outcome; do not swap in a
  screenshot assertion to hide it. The alternative for Image preview would then
  be `setImagePixels` only, and that gets recorded.
- **STOP** if `setImagePixels` throws or paints nothing; record whether the ref
  path works and leave the check out if it cannot fail meaningfully.
- **STOP** if `<diff>` paints no text at all. Record what the paint log holds;
  a diff viewer with no measurable output needs a different evidence strategy.
- **STOP** if `<canvas>` panics or fails the whole render (not merely paints
  nothing). Capture the error; the trap is then worse than documented.
- **DO NOT** edit `references/`, the GPUix source, or `packages/components`;
  a defect found here becomes a task or an ADR note, not an upstream patch.

## 7. Test plan (two directions)

- The scenario fails if `elementType` stops reporting the retained type, if a
  fallback message changes, if a valid data URL or ref upload starts producing
  a fallback, if `<diff>` stops painting its rows, or if `<canvas>` starts
  painting (its child would appear in `paintedText()` — the trap is the
  assertion).
- Two-direction proof, recorded in §8:
  1. remove `source` from `surface-svg` and confirm the run still passes the
     bounds check — **this is the documented weakness**: bounds alone cannot see
     a sourced icon. The evidence is the element type plus the emitted frame.
     State it in §8 and `COMPONENTS.md`.
  2. change the `surface-img-data` `src` to the broken value and confirm the
     fallback count becomes 2 and the run exits `1`, naming the count check.
     Restore.
  3. change `<canvas>` to a `<div>` and confirm the "canvas is retained" check
     fails with the type it found. Restore.

## 8. Measured facts

_To be filled by the implementation run. Record: the suite count and exit code;
`elementType`/bounds for each surface; the exact painted text for the diff; the
fallback counts; whether the ref upload painted; what `<canvas>` reports; and
the two-direction outputs._

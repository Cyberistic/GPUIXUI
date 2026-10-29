# 720 — Three docs drawings: a dead slider, a clipped table, a grey chip

Phase D (docs drawings). Depends on: the shipped `Slider`/`RangeSlider`
primitives, `@gpuixui/data`'s table recipes and `@gpuixui/tw`'s tag recipes.
Status: implemented on `fix/slider-table-tag`.

Owner reports, one per page:

1. `/docs/components/slider` — nothing responds.
2. `/docs/components/table` — "can be displayed better" (the table is cut off).
3. `/docs/components/tag-input` — "bad contrast".

## 1. Slider: the Components page drew a picture

Measured before: `slider-values-demo.tsx` is a pure `Track` paint — no
`onPointerDown`, no keys, no state — and its fill is
`width: (last - first) / max`, which is **0** for a single value while the thumb
paints at `value / max`. The page printed `Quality · 62` over an empty track.

Files:

- `apps/docs/src/components/docs/slider-drawing.tsx` (new): one drawing for a
  single value and a pair, composing `pointerValue`, `nearestEnd`, `dragSpan`,
  `decideValueKey`, `moveSpanEnd` from `@gpuixui/primitives/core`. Pointer
  capture on the root; `Home`/`End`/`PageUp`/`PageDown`/arrows on the thumb.
- `apps/docs/src/components/docs/slider-values-demo.tsx`: Quality and Price use
  the drawing; `−`/`+` step through `stepValue` (the primitive's own step).
- `apps/docs/src/components/docs/slider-demo.tsx`, `range-slider-demo.tsx`:
  same drawing, their own readouts.
- `apps/docs/src/styles/demos.css`: `.gx-slider` gains the component's half-thumb
  inset (the hit area is padded, the rail is the usable span), and the thumb is
  positioned on the rail, not the root.
- `apps/docs/src/components/docs/slider-preview.ts`: `trackPaint` — the left
  offset and width of the filled span, from `valueFraction` — so the readout,
  the fill and the thumb cannot disagree.

Cases (`slider-preview.test.ts`, extended):

- `trackPaint([62], 0..100)` is `{left: 0, width: 0.62}` (fails if the fill is
  the span between the first and last value, which is what shipped).
- `trackPaint([20, 80], 0..200)` is `{left: 0.1, width: 0.3}`, and the thumb
  fractions are the same two numbers — the readout prints `20` at 10%.
- `stepValue` moves one `step` and clamps at both ends.
- Browser: press at 25% reports 25; a drag released 200px outside the rail still
  reports the last pointer position; a key press moves by one step.

## 2. Table: the tracks overran the card

Measured before (1440×900, default/dark): the card's table box is **625 px**
wide; the `<colgroup>` tracks are `40 + 250 + 150 + 110 + 90 + 48 = 688 px`, so
the Duration track is cut mid-word and the Actions track is invisible; the
caption (a table child) takes the 688 px content width and is clipped by
`.gx-table`'s `overflow: hidden`, which is the "stray truncated element" at the
bottom.

Files:

- `apps/docs/src/components/docs/table-preview.ts`: `COLUMN_TRACKS` — every
  track's percentage, no fixed pixels — and `trackStyle`.
- `apps/docs/src/components/docs/table-demo.tsx`: the workflow's `<colgroup>`
  and the states' tables paint from it; the footer is three labelled groups.
- `apps/docs/src/styles/demos.css`: a header with its own `muted` fill and a
  `foreground` label, `secondary` toolbar, tabular numbers, a fixed track for
  the select and actions columns, and a footer that reads as data.

Cases:

- `COLUMN_TRACKS` sums to exactly 100 and each track is a percentage string
  (before: pixel widths summing to 688 inside a 625 px box).
- The header's `th` count equals a row's `td` count for every visible column, so
  one track list is the only source of x (server-rendered markup).
- Browser: the table, caption and footer are inside the stage's padding box, the
  duration cell's right edge equals the header's, and the select column is one
  width in the header and in every row.

## 3. Tag chip: a label at the wrong floor on a fill that is not a chip

Before: `TAG_INPUT_CHIP = bg-muted`, `TAG_INPUT_CHIP_TEXT = text-muted-foreground`.
The label is the token a reader typed — body text — but `mutedForeground` on
`muted` is only measured at the **secondary** floor, and in the light styles the
measured pair is 6.40–6.83:1, under the 7:1 body floor. The chip fill
(`#1e222a`) is also a shade of the field's own (`#11141a`).

Fix, on the tokens' own axis:

- `TAG_INPUT_CHIP` → `bg-secondary` (the segmented-panel role, distinct from the
  field's `background`).
- `TAG_INPUT_CHIP_TEXT` → `text-foreground` (body role).
- `TAG_INPUT_CHIP_REMOVE` keeps `text-muted-foreground` (measured on
  `secondary` at 6.00–9.00:1, above the 4.5 boundary/secondary floor).
- The docs CSS mirrors the recipe; the budget line becomes a sentence
  (`describeBudget` / `describeRefusal`) instead of `2 of 5 · refused=0`.

Cases (`packages/components/src/tag-input/chip-contrast.test.ts`): read the two
class strings, map `text-*`/`bg-*` onto theme roles, and hold
`contrastRatio(label, fill) >= contrastFloorsFor(theme).body` in every shipped
theme and platform style (16 palettes). Before the fix the light styles fail.

## Gates

`nub run --filter @gpuixui/docs test`, `--filter @gpuixui/components test`,
`nub run check`. Screenshots at 1440×900 dark for all three pages, after.

/**
 * The generated line art `svg-pattern` drives, and the arithmetic a decorative
 * pattern field owes a real frame.
 *
 * A hexagon or a topography field is one generated `<path>` in a view box,
 * sized by the element that shows it. Whether that route works was open for
 * plan 600 (`hexagon`, `topography`): the icons prove small glyph paths paint,
 * not that a wide generated path is scaled from its view box, clipped at the
 * view box's edge, and re-laid-out when the box resizes. Each value here is
 * geometric, so the probe's expectations are computed by its unit suite on a
 * host with no binding.
 *
 * A `<svg>` paints one `style.color` mask, so every shape has its own tint: one
 * capture can then read each element's ink box without cropping a region whose
 * position is itself an assumption.
 */
import * as Arr from "effect/Array";
import { hexOf, type Rgb } from "./content.js";

const rgb = (r: number, g: number, b: number): Rgb => ({ r, g, b });

/** The view box the square, the overhang and the wide shape are written in. */
export const TILE = 100;

/** The `testId`s the view and the steps share, so a probe cannot address a ghost. */
export const PATTERN_IDS = {
  probe: "svg-pattern-probe",
  square: "pattern-square",
  overhang: "pattern-overhang",
  wide: "pattern-wide",
  tall: "pattern-tall",
  comb: "pattern-comb",
  resize: "pattern-resize",
  readout: "pattern-readout",
} as const;

/** The five shapes the probe mounts, in the order the frame reads them. */
export const PATTERN_SHAPES = [
  "square",
  "overhang",
  "wide",
  "tall",
  "comb",
] as const;

/** One shape's name. */
export type PatternShape = (typeof PATTERN_SHAPES)[number];

/**
 * The tint each shape paints, disjoint on purpose: `boundsOfColour` reads one
 * element's ink out of the whole capture, so two shapes sharing a tint would
 * report one box around both.
 */
export const PATTERN_TINTS = {
  square: rgb(0xff, 0x3d, 0xd7),
  overhang: rgb(0x00, 0xe5, 0xff),
  wide: rgb(0xff, 0xd5, 0x00),
  tall: rgb(0xff, 0x8a, 0x3d),
  comb: rgb(0x6b, 0xff, 0x5c),
} as const satisfies Readonly<Record<PatternShape, Rgb>>;

/** The inset and stroke of the square the scaling check reads. */
export const SQUARE = { inset: 20, stroke: 10 } as const;

/** The box the square starts in, and the box a press resizes it to. */
export const SQUARE_BOX = { width: 200, height: 200 } as const;
export const SQUARE_RESIZED_BOX = { width: 300, height: 100 } as const;

/**
 * The fraction of its box the square's ink spans.
 *
 * The stroke is centred on the path, so it reaches half its width past each
 * edge: `(100 - 2 × 20) + 10` view-box units, or 70% of the width it is scaled
 * to.
 */
export const squareFraction = (): number =>
  (TILE - 2 * SQUARE.inset + SQUARE.stroke) / TILE;

/** The horizontal band that runs past both view-box edges, and its box. */
export const OVERHANG = { stroke: 20, y: 50, from: -40, to: 140 } as const;

/** The overhang element's edge; its view box is `TILE`. */
export const OVERHANG_SIZE = 200;

/** The fraction of the overhang box the clipped band is tall. */
export const overhangFraction = (): number => OVERHANG.stroke / TILE;

/** A 3:1 box holding the square view box, and the band it draws. */
export const WIDE = { width: 300, height: 100, stroke: 10 } as const;

/** The same band in a 1:2 box, so the scale rule is measured on both axes. */
export const TALL = { width: 100, height: 200, stroke: 10 } as const;

/**
 * The scale a `<svg>` gives its view box: the element's **width** over the view
 * box's.
 *
 * Measured on 0.11.0, the width is the only axis consulted — a 100-unit view
 * box in a 300×100 element paints 300 wide, and the same view box in a 100×200
 * element paints 100 wide with a 10-point stroke. The content is centred on the
 * element, so an element whose aspect ratio differs from the view box's shows a
 * square content area that overflows it (the resize measures that overflow).
 */
export const patternScale = (width: number): number => width / TILE;

/** A stroke's painted weight: its authored width at the element's scale. */
export const strokeWeight = (stroke: number, width: number): number =>
  stroke * patternScale(width);

/**
 * The generated path: one `<path>` with twenty vertical subpaths.
 *
 * The count is the point. A field's path is generated, so a renderer that
 * stopped at the first subpath (or capped the command buffer) would still paint
 * something; sampling every stroke is what tells a whole path from its prefix.
 */
export const COMB = {
  strokes: 20,
  pitch: 12,
  stroke: 6,
  top: 20,
  bottom: 60,
  viewBox: { width: 240, height: 80 },
  scale: 2,
} as const;

/** The comb element's size: its view box at `COMB.scale`. */
export const COMB_SIZE = {
  width: COMB.viewBox.width * COMB.scale,
  height: COMB.viewBox.height * COMB.scale,
} as const;

/** A stroke's centre in view-box units, counted from the view box's left edge. */
export const combCentre = (index: number): number =>
  COMB.stroke / 2 + index * COMB.pitch;

/** The readout a press changes, so the probe reads the view it asserted on. */
export const patternReadout = (size: {
  readonly width: number;
  readonly height: number;
}): string => `size=${size.width}x${size.height}`;

/**
 * A capture region in the window's logical points.
 *
 * A capture is device-scaled (900×520 arrives as 1800×1040), so the ink's box
 * is comparable with an element's `bounds` only after this division.
 */
export const logicalRegion = (
  region: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
  scale: number,
): {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
} => ({
  x: region.x / scale,
  y: region.y / scale,
  width: region.width / scale,
  height: region.height / scale,
});

/** A point in the window's logical points, inside a painted box. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Where one comb stroke's ink sits in the window: its view-box `x` at the
 * element's scale, on the band's mid-line.
 */
export const combPoint = (
  origin: { readonly x: number; readonly y: number },
  index: number,
): Point => ({
  x: origin.x + combCentre(index) * COMB.scale,
  y: origin.y + ((COMB.top + COMB.bottom) / 2) * COMB.scale,
});

/** Every comb stroke's ink, in table order. */
export const combPoints = (origin: {
  readonly x: number;
  readonly y: number;
}): ReadonlyArray<Point> =>
  Arr.map(Arr.range(0, COMB.strokes - 1), (index) => combPoint(origin, index));

/**
 * One markup's opening tag.
 *
 * The markup's own size is its view box: the element's `style` decides how big
 * it paints, which is the question the probe asks.
 */
const open = (width: number, height: number): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

/**
 * Every shape is stroked in black: the runtime paints the markup as one mask in
 * `style.color`, so an author's `stroke` never reaches the frame (measured by
 * `content-surfaces`). The colour is written plainly rather than themed so a
 * reader cannot mistake it for the ink the probe asserts.
 */
const SHAPE_STROKE = "#000000";

/** A stroked square inset from the view box on every side. */
export const squareSvg = (): string =>
  `${open(TILE, TILE)}<path d="M ${SQUARE.inset} ${SQUARE.inset} H ${TILE - SQUARE.inset} V ${TILE - SQUARE.inset} H ${SQUARE.inset} Z" fill="none" stroke="${SHAPE_STROKE}" stroke-width="${SQUARE.stroke}"/></svg>`;

/** A band that starts left of the view box and ends right of it. */
export const overhangSvg = (): string =>
  `${open(TILE, TILE)}<path d="M ${OVERHANG.from} ${OVERHANG.y} H ${OVERHANG.to}" fill="none" stroke="${SHAPE_STROKE}" stroke-width="${OVERHANG.stroke}"/></svg>`;

/** A band across the whole view box, in the box that is three times as wide. */
export const wideSvg = (): string =>
  `${open(TILE, TILE)}<path d="M 0 ${OVERHANG.y} H ${TILE}" fill="none" stroke="${SHAPE_STROKE}" stroke-width="${WIDE.stroke}"/></svg>`;

/** The same band in the box that is twice as tall as it is wide. */
export const tallSvg = (): string =>
  `${open(TILE, TILE)}<path d="M 0 ${OVERHANG.y} H ${TILE}" fill="none" stroke="${SHAPE_STROKE}" stroke-width="${TALL.stroke}"/></svg>`;

/** One path with one vertical subpath per comb stroke. */
export const combSvg = (): string =>
  `${open(COMB.viewBox.width, COMB.viewBox.height)}<path d="${Arr.join(
    Arr.map(
      Arr.range(0, COMB.strokes - 1),
      (index) => `M ${combCentre(index)} ${COMB.top} V ${COMB.bottom}`,
    ),
    " ",
  )}" fill="none" stroke="${SHAPE_STROKE}" stroke-width="${COMB.stroke}"/></svg>`;

/** The markup one shape mounts. */
export const shapeSvg = (shape: PatternShape): string => sources[shape]();

/** One renderer per shape, so a shape added without markup is a compile error. */
const sources = {
  square: squareSvg,
  overhang: overhangSvg,
  wide: wideSvg,
  tall: tallSvg,
  comb: combSvg,
} as const satisfies Readonly<Record<PatternShape, () => string>>;

/** The tint one shape paints, as the `#rrggbb` its `style.color` takes. */
export const shapeTint = (shape: PatternShape): string =>
  hexOf(PATTERN_TINTS[shape]);

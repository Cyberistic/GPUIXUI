import * as Arr from "effect/Array";
import { hexOf, type Rgb } from "./content.js";

const rgb = (r: number, g: number, b: number): Rgb => ({ r, g, b });

export const TILE = 100;

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

export const PATTERN_SHAPES = [
  "square",
  "overhang",
  "wide",
  "tall",
  "comb",
] as const;

export type PatternShape = (typeof PATTERN_SHAPES)[number];

export const PATTERN_TINTS = {
  square: rgb(0xff, 0x3d, 0xd7),
  overhang: rgb(0x00, 0xe5, 0xff),
  wide: rgb(0xff, 0xd5, 0x00),
  tall: rgb(0xff, 0x8a, 0x3d),
  comb: rgb(0x6b, 0xff, 0x5c),
} as const satisfies Readonly<Record<PatternShape, Rgb>>;

export const SQUARE = { inset: 20, stroke: 10 } as const;

export const SQUARE_BOX = { width: 200, height: 200 } as const;
export const SQUARE_RESIZED_BOX = { width: 300, height: 100 } as const;

export const squareFraction = (): number =>
  (TILE - 2 * SQUARE.inset + SQUARE.stroke) / TILE;

export const OVERHANG = { stroke: 20, y: 50, from: -40, to: 140 } as const;

export const OVERHANG_SIZE = 200;

export const overhangFraction = (): number => OVERHANG.stroke / TILE;

export const WIDE = { width: 300, height: 100, stroke: 10 } as const;

export const TALL = { width: 100, height: 200, stroke: 10 } as const;

export const patternScale = (width: number): number => width / TILE;

export const strokeWeight = (stroke: number, width: number): number =>
  stroke * patternScale(width);

export const COMB = {
  strokes: 20,
  pitch: 12,
  stroke: 6,
  top: 20,
  bottom: 60,
  viewBox: { width: 240, height: 80 },
  scale: 2,
} as const;

export const COMB_SIZE = {
  width: COMB.viewBox.width * COMB.scale,
  height: COMB.viewBox.height * COMB.scale,
} as const;

export const combCentre = (index: number): number =>
  COMB.stroke / 2 + index * COMB.pitch;

export const patternReadout = (size: {
  readonly width: number;
  readonly height: number;
}): string => `size=${size.width}x${size.height}`;

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

export interface Point {
  readonly x: number;
  readonly y: number;
}

export const combPoint = (
  origin: { readonly x: number; readonly y: number },
  index: number,
): Point => ({
  x: origin.x + combCentre(index) * COMB.scale,
  y: origin.y + ((COMB.top + COMB.bottom) / 2) * COMB.scale,
});

export const combPoints = (origin: {
  readonly x: number;
  readonly y: number;
}): ReadonlyArray<Point> =>
  Arr.map(Arr.range(0, COMB.strokes - 1), (index) => combPoint(origin, index));

const open = (width: number, height: number): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

const SHAPE_STROKE = "#000000";

export const squareSvg = (): string =>
  `${open(TILE, TILE)}<path d="M ${SQUARE.inset} ${SQUARE.inset} H ${TILE - SQUARE.inset} V ${TILE - SQUARE.inset} H ${SQUARE.inset} Z" fill="none" stroke="${SHAPE_STROKE}" stroke-width="${SQUARE.stroke}"/></svg>`;

export const overhangSvg = (): string =>
  `${open(TILE, TILE)}<path d="M ${OVERHANG.from} ${OVERHANG.y} H ${OVERHANG.to}" fill="none" stroke="${SHAPE_STROKE}" stroke-width="${OVERHANG.stroke}"/></svg>`;

export const wideSvg = (): string =>
  `${open(TILE, TILE)}<path d="M 0 ${OVERHANG.y} H ${TILE}" fill="none" stroke="${SHAPE_STROKE}" stroke-width="${WIDE.stroke}"/></svg>`;

export const tallSvg = (): string =>
  `${open(TILE, TILE)}<path d="M 0 ${OVERHANG.y} H ${TILE}" fill="none" stroke="${SHAPE_STROKE}" stroke-width="${TALL.stroke}"/></svg>`;

export const combSvg = (): string =>
  `${open(COMB.viewBox.width, COMB.viewBox.height)}<path d="${Arr.join(
    Arr.map(
      Arr.range(0, COMB.strokes - 1),
      (index) => `M ${combCentre(index)} ${COMB.top} V ${COMB.bottom}`,
    ),
    " ",
  )}" fill="none" stroke="${SHAPE_STROKE}" stroke-width="${COMB.stroke}"/></svg>`;

export const shapeSvg = (shape: PatternShape): string => sources[shape]();

const sources = {
  square: squareSvg,
  overhang: overhangSvg,
  wide: wideSvg,
  tall: tallSvg,
  comb: combSvg,
} as const satisfies Readonly<Record<PatternShape, () => string>>;

export const shapeTint = (shape: PatternShape): string =>
  hexOf(PATTERN_TINTS[shape]);

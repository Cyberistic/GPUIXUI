/**
 * The hexagon grid a `Hexagon` field paints, as one generated path.
 *
 * Flat-top hexagons tile in columns: a hex is `2r` wide and `√3·r` tall, the
 * next column starts `1.5r` to the right, and odd columns sit half a row lower,
 * so the outlines share edges instead of leaving gaps. The grid starts at the
 * box's top-left corner with its first hex wholly inside, and continues until
 * the box's right and bottom edges are covered; the view box clips the rest.
 *
 * The arithmetic is pure, so the field's shape is checked without a window. The
 * caller's radius is honoured unless the box would need more cells than the cap
 * allows (each cell is path geometry the runtime has to paint), in which case
 * the radius grows to the smallest one that fits; a radius or stroke the
 * renderer could not paint falls back to the house value.
 */

import * as Arr from "effect/Array";
import { tenth } from "../internal/scatter.js";
import {
  paintableBox,
  svgPatternMarkup,
  type PatternBox,
} from "../internal/svg-pattern.js";

/** The house hexagon radius (centre to vertex), in pixels. */
export const hexagonRadius = 30;

/** The smallest and largest radius a caller may ask for, in pixels. */
export const hexagonMinRadius = 10;
export const hexagonMaxRadius = 160;

/** The house stroke weight, in pixels. */
export const hexagonStroke = 1;

/** The widest stroke that still reads as line art rather than a fill. */
export const hexagonMaxStroke = 6;

/** The most hexagons one field paints; each is a closed subpath. */
export const hexagonMaxCells = 900;

/** The area of one hexagon of radius `r`: `(3√3 / 2) r²`. */
const cellArea = (radius: number): number => 2.598_076_211 * radius * radius;

/** {@link HexagonFieldOptions.radius} as the field can paint it. */
export const hexagonRadiusOf = (radius: number): number =>
  Number.isFinite(radius) && radius > 0
    ? Math.min(Math.max(radius, hexagonMinRadius), hexagonMaxRadius)
    : hexagonRadius;

/** {@link HexagonFieldOptions.stroke} as the field can paint it. */
export const hexagonStrokeOf = (stroke: number): number =>
  Number.isFinite(stroke) && stroke > 0
    ? Math.min(Math.max(stroke, 0.5), hexagonMaxStroke)
    : hexagonStroke;

/** One field's inputs: the box it fills, and the two authored weights. */
export interface HexagonFieldOptions extends PatternBox {
  readonly radius: number;
  readonly stroke: number;
}

/** The generated field: its markup, and what it drew. */
export interface HexagonField {
  readonly markup: string;
  readonly cells: number;
  /** The radius actually drawn, which may exceed the caller's to honour the cap. */
  readonly radius: number;
}

/**
 * The radius that keeps a box at the cell cap.
 *
 * The area estimate is enough: the cap exists to bound the markup, not to make a
 * promise about the exact count, which the field reports.
 */
const radiusForCap = (box: PatternBox): number =>
  Math.sqrt((box.width * box.height) / (hexagonMaxCells * cellArea(1)));

/** One hexagon grid's layout at one radius. */
const gridOf = (
  box: PatternBox,
  radius: number,
): {
  readonly columns: number;
  readonly rows: number;
  readonly horizontal: number;
  readonly vertical: number;
} => {
  const horizontal = radius * 1.5;
  const vertical = Math.sqrt(3) * radius;
  return {
    columns: Math.ceil(box.width / horizontal) + 1,
    rows: Math.ceil(box.height / vertical) + 1,
    horizontal,
    vertical,
  };
};

/** The cells one grid draws. */
const cellsOf = (box: PatternBox, radius: number): number => {
  const { columns, rows } = gridOf(box, radius);
  return columns * rows;
};

/**
 * The radius the field actually draws.
 *
 * The area estimate is enough to start; the grid's real count depends on how
 * the edges fall, so grow the radius in small steps until the count fits. A box
 * so large that even the widest radius cannot fit keeps the widest radius rather
 * than painting nothing.
 */
const fitToCap = (box: PatternBox, radius: number): number =>
  cellsOf(box, radius) <= hexagonMaxCells || radius >= hexagonMaxRadius
    ? radius
    : fitToCap(box, Math.min(radius * 1.1, hexagonMaxRadius));

/** One flat-top hexagon's outline, as a closed subpath. */
const hexagonPath = (cx: number, cy: number, radius: number): string => {
  const vertices = Arr.map(Arr.range(0, 5), (vertex) => {
    const angle = (Math.PI / 3) * vertex;
    const command = vertex === 0 ? "M" : "L";
    return `${command} ${tenth(cx + radius * Math.cos(angle))} ${tenth(cy + radius * Math.sin(angle))}`;
  });
  return `${Arr.join(vertices, " ")} Z`;
};

/**
 * The hexagon grid for one measured box.
 *
 * A box with no paint returns no markup, so a field that has not been laid out
 * yet paints nothing rather than a degenerate grid at the origin.
 */
export const hexagonField = ({
  width,
  height,
  radius,
  stroke,
}: HexagonFieldOptions): HexagonField => {
  if (!paintableBox({ width, height })) {
    return { markup: "", cells: 0, radius: hexagonRadiusOf(radius) };
  }

  const box = { width, height };
  const requested = Math.max(hexagonRadiusOf(radius), radiusForCap(box));
  const drawn = fitToCap(box, requested);
  const { columns, rows, horizontal, vertical } = gridOf(box, drawn);

  const paths = Arr.flatMap(Arr.range(0, columns - 1), (column) => {
    const cx = drawn + column * horizontal;
    const offset = column % 2 === 1 ? vertical / 2 : 0;
    return Arr.map(Arr.range(0, rows - 1), (row) =>
      hexagonPath(cx, vertical / 2 + row * vertical + offset, drawn),
    );
  });

  return {
    markup: svgPatternMarkup(
      box,
      Arr.join(paths, " "),
      hexagonStrokeOf(stroke),
    ),
    cells: Arr.length(paths),
    radius: drawn,
  };
};

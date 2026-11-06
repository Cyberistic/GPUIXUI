import * as Arr from "effect/Array";
import {
  tenth,
  paintableBox,
  svgPatternMarkup,
  type PatternBox,
} from "@gpuixui/components/authoring";

export const hexagonRadius = 30;

export const hexagonMinRadius = 10;
export const hexagonMaxRadius = 160;

export const hexagonStroke = 1;

export const hexagonMaxStroke = 6;

export const hexagonMaxCells = 900;

const cellArea = (radius: number): number => 2.598_076_211 * radius * radius;

export const hexagonRadiusOf = (radius: number): number =>
  Number.isFinite(radius) && radius > 0
    ? Math.min(Math.max(radius, hexagonMinRadius), hexagonMaxRadius)
    : hexagonRadius;

export const hexagonStrokeOf = (stroke: number): number =>
  Number.isFinite(stroke) && stroke > 0
    ? Math.min(Math.max(stroke, 0.5), hexagonMaxStroke)
    : hexagonStroke;

export interface HexagonFieldOptions extends PatternBox {
  readonly radius: number;
  readonly stroke: number;
}

export interface HexagonField {
  readonly markup: string;
  readonly cells: number;

  readonly radius: number;
}

const radiusForCap = (box: PatternBox): number =>
  Math.sqrt((box.width * box.height) / (hexagonMaxCells * cellArea(1)));

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

const cellsOf = (box: PatternBox, radius: number): number => {
  const { columns, rows } = gridOf(box, radius);
  return columns * rows;
};

const fitToCap = (box: PatternBox, radius: number): number =>
  cellsOf(box, radius) <= hexagonMaxCells || radius >= hexagonMaxRadius
    ? radius
    : fitToCap(box, Math.min(radius * 1.1, hexagonMaxRadius));

const hexagonPath = (cx: number, cy: number, radius: number): string => {
  const vertices = Arr.map(Arr.range(0, 5), (vertex) => {
    const angle = (Math.PI / 3) * vertex;
    const command = vertex === 0 ? "M" : "L";
    return `${command} ${tenth(cx + radius * Math.cos(angle))} ${tenth(cy + radius * Math.sin(angle))}`;
  });
  return `${Arr.join(vertices, " ")} Z`;
};

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

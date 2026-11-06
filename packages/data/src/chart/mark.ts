import { Match } from "effect";
import * as Arr from "effect/Array";

export interface MarkFill {
  readonly color: string;
  readonly opacity?: number;
  readonly gradient?: string;
}

export interface MarkStroke {
  readonly color: string;
  readonly width: number;
  readonly opacity?: number;
  readonly dash?: string;
}

export interface MarkClip {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface MarkPaint {
  readonly fill?: MarkFill;
  readonly stroke?: MarkStroke;
  readonly clip?: MarkClip;
}

export interface RectMark extends MarkPaint {
  readonly kind: "rect";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rx?: number;
}

export interface PathMark extends MarkPaint {
  readonly kind: "path";
  readonly d: string;
}

/** A circle, with its paint. */
export interface CircleMark extends MarkPaint {
  readonly kind: "circle";
  readonly cx: number;
  readonly cy: number;
  readonly r: number;
}

/** An ellipse, with its paint. */
export interface EllipseMark extends MarkPaint {
  readonly kind: "ellipse";
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
}

export type ChartMark = RectMark | PathMark | CircleMark | EllipseMark;

export const num = (value: number): string =>
  Number.isFinite(value) ? `${Math.round(value * 100) / 100}` : "0";

/** The paint attributes a mark carries, as the markup spells them. */
const paintAttributes = (mark: ChartMark): string => {
  const parts: Array<string> = [];
  parts.push(
    mark.fill === undefined
      ? 'fill="none"'
      : `fill="${
          mark.fill.gradient === undefined
            ? mark.fill.color
            : `url(#${mark.fill.gradient})`
        }"`,
  );
  if (mark.fill?.opacity !== undefined && mark.fill.opacity < 1) {
    parts.push(`fill-opacity="${num(mark.fill.opacity)}"`);
  }
  if (mark.stroke !== undefined) {
    parts.push(`stroke="${mark.stroke.color}"`);
    parts.push(`stroke-width="${num(mark.stroke.width)}"`);
    if (mark.stroke.opacity !== undefined && mark.stroke.opacity < 1) {
      parts.push(`stroke-opacity="${num(mark.stroke.opacity)}"`);
    }
    if (mark.stroke.dash !== undefined) {
      parts.push(`stroke-dasharray="${mark.stroke.dash}"`);
    }
    parts.push('stroke-linecap="round"');
    parts.push('stroke-linejoin="round"');
  }
  return parts.join(" ");
};

export const markMarkup = (mark: ChartMark): string => {
  const paint = paintAttributes(mark);
  return Match.value(mark).pipe(
    Match.when({ kind: "rect" }, (shape) => {
      const radius = shape.rx === undefined ? "" : ` rx="${num(shape.rx)}"`;
      return `<rect x="${num(shape.x)}" y="${num(shape.y)}" width="${num(shape.width)}" height="${num(shape.height)}"${radius} ${paint}/>`;
    }),
    Match.when(
      { kind: "circle" },
      (shape) =>
        `<circle cx="${num(shape.cx)}" cy="${num(shape.cy)}" r="${num(shape.r)}" ${paint}/>`,
    ),
    Match.when(
      { kind: "ellipse" },
      (shape) =>
        `<ellipse cx="${num(shape.cx)}" cy="${num(shape.cy)}" rx="${num(shape.rx)}" ry="${num(shape.ry)}" ${paint}/>`,
    ),
    Match.when({ kind: "path" }, (shape) => `<path d="${shape.d}" ${paint}/>`),
    Match.exhaustive,
  );
};

export const marksMarkup = (
  marks: ReadonlyArray<ChartMark>,
): { readonly defs: string; readonly body: string } => {
  const indexed: ReadonlyArray<{
    readonly mark: ChartMark;
    readonly index: number;
  }> = Arr.map(marks, (mark, index) => ({ mark, index }));
  const defs = Arr.join(
    Arr.flatMap(indexed, (entry) =>
      entry.mark.clip === undefined
        ? []
        : [
            `<clipPath id="chart-clip-${entry.index}"><rect x="${num(entry.mark.clip.x)}" y="${num(entry.mark.clip.y)}" width="${num(entry.mark.clip.width)}" height="${num(entry.mark.clip.height)}"/></clipPath>`,
          ],
    ),
    "",
  );
  const body = Arr.join(
    Arr.map(marks, (mark, index) =>
      mark.clip === undefined
        ? markMarkup(mark)
        : `<g clip-path="url(#chart-clip-${index})">${markMarkup(mark)}</g>`,
    ),
    "",
  );
  return { defs, body };
};

export const flatMark = (mark: ChartMark): ChartMark => ({
  ...mark,
  fill:
    mark.fill === undefined ? undefined : { ...mark.fill, gradient: undefined },
});

export const FALLBACK_MARK_COLOUR = "#000000";

export const lineStroke = (width: number, dashed = false): MarkStroke => ({
  color: FALLBACK_MARK_COLOUR,
  width,
  dash: dashed ? `${num(width * 2)} ${num(width * 1.6)}` : undefined,
});

export const solidFill = (color: string, opacity?: number): MarkFill => ({
  color,
  opacity,
});

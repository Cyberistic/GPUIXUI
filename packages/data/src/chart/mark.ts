/**
 * The chart's marks: a shape, its paint, and nothing else.
 *
 * A mark is the smallest thing a chart draws. It is a pure value — no host
 * element, no theme, no colour lookup — so the geometry can be tested without
 * a renderer and the paint can be tested without a chart.
 *
 * The shape is one of four: a `rect`, a `path`, a `circle` or an `ellipse`.
 * The paint is a fill, a stroke, or both.
 *
 * The colours are **the caller's**, resolved before the mark is built: a mark
 * names `#2ECC71` or `none`, never a theme role. That is what lets the same
 * mark model feed two painters — the SVG document the runtime decodes and the
 * one-tint mask it cannot — without either of them knowing about the other.
 */

import { Match } from "effect";

/** How a shape is filled: a colour, or a gradient the document defines. */
export interface MarkFill {
  /** The colour, as the markup spells it. */
  readonly color: string;
  /** The fill's alpha, 0–1. */
  readonly opacity?: number;
  /**
   * The gradient the fill is painted with, when it is not a flat colour.
   *
   * The name is a gradient's id in the document's `defs`, so a mark is still
   * a pure value: the document that owns the gradient defines it.
   */
  readonly gradient?: string;
}

/** How a shape is stroked: a colour, a weight, and a dash. */
export interface MarkStroke {
  /** The stroke's colour. */
  readonly color: string;
  /** The stroke's weight in pixels. */
  readonly width: number;
  /** The stroke's alpha, 0–1. */
  readonly opacity?: number;
  /** The dash pattern, as the markup spells it (`"4 2"`). */
  readonly dash?: string;
}

/** The paint every shape carries. */
export interface MarkPaint {
  /** The shape's fill, when it has one. */
  readonly fill?: MarkFill;
  /** The shape's stroke, when it has one. */
  readonly stroke?: MarkStroke;
}

/** A rectangle, with its paint. */
export interface RectMark extends MarkPaint {
  readonly kind: "rect";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** The corner radius, when the shape is rounded. */
  readonly rx?: number;
}

/** A path, with its paint. */
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

/**
 * A shape with its paint.
 *
 * A mark with neither a fill nor a stroke paints nothing, and the markup says
 * so rather than the painter guessing a colour.
 */
export type ChartMark = RectMark | PathMark | CircleMark | EllipseMark;

/**
 * A number as the markup spells it: at most two decimals, never `NaN`.
 *
 * The markup is read by a human in a test failure, so `12.34567` is noise
 * and `NaN` is a lie.
 */
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

/**
 * One mark as the markup spells it.
 *
 * A path's `fill` is `none` unless the caller gives it one, so an open path
 * does not close itself with a fill the caller never asked for.
 */
export const markMarkup = (mark: ChartMark): string => {
  const paint = paintAttributes(mark);
  return Match.value(mark).pipe(
    Match.when({ kind: "rect" }, (shape) => {
      const radius = shape.rx === undefined ? "" : ` rx="${num(shape.rx)}"`;
      return `<rect x="${num(shape.x)}" y="${num(shape.y)}" width="${num(shape.width)}" height="${num(shape.height)}"${radius} ${paint}/>`;
    }),
    Match.when({ kind: "circle" }, (shape) =>
      `<circle cx="${num(shape.cx)}" cy="${num(shape.cy)}" r="${num(shape.r)}" ${paint}/>`,
    ),
    Match.when({ kind: "ellipse" }, (shape) =>
      `<ellipse cx="${num(shape.cx)}" cy="${num(shape.cy)}" rx="${num(shape.rx)}" ry="${num(shape.ry)}" ${paint}/>`,
    ),
    Match.when({ kind: "path" }, (shape) =>
      `<path d="${shape.d}" ${paint}/>`,
    ),
    Match.exhaustive,
  );
};

/**
 * A mark painted in one flat colour — the one-tint mask route's shape.
 *
 * The mask painter has no colour of its own: the runtime tints the whole
 * document through `style.color`, so a mark's own fill would be ignored.
 * This drops the gradient a flat colour cannot carry and leaves the fill.
 */
export const flatMark = (mark: ChartMark): ChartMark => ({
  ...mark,
  fill: mark.fill === undefined ? undefined : { ...mark.fill, gradient: undefined },
});

/**
 * The colour a mark's paint takes, when it has none yet.
 *
 * The geometry names a mark's **weight** and whether it is dashed; the
 * **colour** is resolved at paint time, because the colour belongs to the
 * series and the series' colour is a palette the frame owns. A mark built
 * without a colour is painted in the frame's fallback.
 */
export const FALLBACK_MARK_COLOUR = "#000000";

/**
 * The stroke a line paints: a weight, and the dash a dashed line carries.
 *
 * The dash is derived from the weight, so a dashed line's dashes scale with
 * its stroke rather than being a fixed pattern that a thin line drowns in.
 */
export const lineStroke = (
  width: number,
  dashed = false,
): MarkStroke => ({
  color: FALLBACK_MARK_COLOUR,
  width,
  dash: dashed ? `${num(width * 2)} ${num(width * 1.6)}` : undefined,
});

/**
 * The fill a shape paints, at an alpha.
 *
 * A fill with no colour takes the fallback, so a mark is never colourless by
 * accident.
 */
export const solidFill = (
  color: string,
  opacity?: number,
): MarkFill => ({
  color,
  opacity,
});

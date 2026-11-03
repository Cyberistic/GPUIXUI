/**
 * A whole chart, as one SVG document.
 *
 * This is the route the runtime can actually paint in colour. `<svg source>`
 * is rasterised through GPUI's **icon** element, so its whole markup becomes
 * one tinted mask — a chart drawn that way is one element per series, each a
 * single colour, with no gradient and no translucent mark over a mark
 * beneath it. `ImgInstance.setImage` decodes SVG bytes through GPUI's own
 * `SvgRenderer` instead, so one document can carry every series' own fill,
 * a real gradient, a stroke at its own weight and a mark at its own alpha.
 *
 * The document is a **pure value**: `chartSvg` takes the marks and the box
 * and returns a string. That is what makes it testable without a renderer,
 * and what lets the docs site paint the browser preview from the same
 * function the native chart paints from.
 *
 * The document carries the marks and nothing else. The axis, the category
 * labels and the legend are the runtime's own text hosts, because a reader's
 * accessibility tree names those and a raster carries only marks.
 */

import * as Arr from "effect/Array";
import type { ChartBox } from "./logic.js";
import type { ChartMark } from "./mark.js";
import { markMarkup, num } from "./mark.js";

/** One gradient the document defines. */
export interface ChartGradient {
  /** The gradient's id, the `defs` entry's name. */
  readonly id: string;
  /** The colour at the gradient's start. */
  readonly from: string;
  /** The colour at the gradient's end. */
  readonly to: string;
  /** The gradient's direction: `vertical` (top to bottom) or `horizontal`. */
  readonly direction?: "vertical" | "horizontal";
  /** The alpha at the start, 0–1. */
  readonly fromOpacity?: number;
  /** The alpha at the end, 0–1. */
  readonly toOpacity?: number;
}

/** The marks a chart's document paints, in paint order. */
export interface ChartDocument {
  /** The plot's box, in pixels. */
  readonly box: ChartBox;
  /** The marks, back to front. */
  readonly marks: ReadonlyArray<ChartMark>;
  /** The gradients the marks refer to. */
  readonly gradients?: ReadonlyArray<ChartGradient>;
  /**
   * The width the document is rasterised at, in device pixels.
   *
   * The runtime scales an image to its box, and the SVG decoder rasterises at
   * the document's own size, so a document drawn at one size and painted in a
   * box of another is scaled — and scaled **once**, which softens a stroke.
   * A document that knows the box it will be painted in draws its strokes at
   * that scale.
   */
  readonly scale?: number;
}

/**
 * One gradient's `defs` entry.
 *
 * The two colours are the same hue at two alphas for a fade, so the fade is
 * a real gradient rather than a stack of nested bands.
 */
export const gradientMarkup = (gradient: ChartGradient): string => {
  const horizontal = gradient.direction === "horizontal";
  const x1 = horizontal ? "0%" : "0%";
  const x2 = horizontal ? "100%" : "0%";
  const y1 = horizontal ? "0%" : "0%";
  const y2 = horizontal ? "0%" : "100%";
  const stops = [
    `<stop offset="0%" stop-color="${gradient.from}"${
      gradient.fromOpacity === undefined
        ? ""
        : ` stop-opacity="${num(gradient.fromOpacity)}"`
    }/>`,
    `<stop offset="100%" stop-color="${gradient.to}"${
      gradient.toOpacity === undefined
        ? ""
        : ` stop-opacity="${num(gradient.toOpacity)}"`
    }/>`,
  ].join("");
  return `<linearGradient id="${gradient.id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops}</linearGradient>`;
};

/**
 * The document's `defs`: the gradients the marks refer to.
 *
 * A document with no gradient has no `defs` at all, rather than an empty
 * one — the markup a human reads should say what is in it.
 */
export const defsMarkup = (gradients: ReadonlyArray<ChartGradient>): string =>
  gradients.length === 0
    ? ""
    : `<defs>${Arr.join(Arr.map(gradients, gradientMarkup), "")}</defs>`;

/**
 * The whole chart as one SVG document.
 *
 * The document's own size is the box it will be painted in, so a stroke is
 * drawn at the scale it will be read at: the runtime rasterises the document
 * at its own size and scales the result to the box, so a document that
 * declares a smaller box than the one it is painted in is scaled **up** and
 * its strokes soften.
 */
export const chartSvg = (document: ChartDocument): string => {
  const scale =
    document.scale === undefined || !Number.isFinite(document.scale)
      ? 1
      : Math.max(0.1, document.scale);
  const width = document.box.width * scale;
  const height = document.box.height * scale;
  const viewBox = `0 0 ${num(document.box.width)} ${num(document.box.height)}`;
  const body = Arr.join(Arr.map(document.marks, markMarkup), "");
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${num(width)}" height="${num(height)}" viewBox="${viewBox}">`,
    defsMarkup(document.gradients ?? []),
    body,
    "</svg>",
  ].join("");
};

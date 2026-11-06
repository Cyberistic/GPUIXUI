import * as Arr from "effect/Array";
import type { ChartBox } from "./logic.js";
import type { ChartMark } from "./mark.js";
import { marksMarkup, num } from "./mark.js";

export interface ChartGradient {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly direction?: "vertical" | "horizontal";
  readonly fromOpacity?: number;
  readonly toOpacity?: number;
}

export interface ChartDocument {
  /** The plot's box, in pixels. */
  readonly box: ChartBox;
  /** The marks, back to front. */
  readonly marks: ReadonlyArray<ChartMark>;
  /** The gradients the marks refer to. */
  readonly gradients?: ReadonlyArray<ChartGradient>;
  readonly scale?: number;
}

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

export const defsMarkup = (
  gradients: ReadonlyArray<ChartGradient>,
  clips = "",
): string =>
  gradients.length === 0 && clips.length === 0
    ? ""
    : `<defs>${Arr.join(Arr.map(gradients, gradientMarkup), "")}${clips}</defs>`;

export const chartSvg = (document: ChartDocument): string => {
  const scale =
    document.scale === undefined || !Number.isFinite(document.scale)
      ? 1
      : Math.max(0.1, document.scale);
  const width = document.box.width * scale;
  const height = document.box.height * scale;
  const viewBox = `0 0 ${num(document.box.width)} ${num(document.box.height)}`;
  const marks = marksMarkup(document.marks);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${num(width)}" height="${num(height)}" viewBox="${viewBox}">`,
    defsMarkup(document.gradients ?? [], marks.defs),
    marks.body,
    "</svg>",
  ].join("");
};

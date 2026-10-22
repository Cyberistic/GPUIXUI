/**
 * The `chart-raster` fixture, held to the arithmetic the probe reads its frame
 * with.
 *
 * The probe asserts exact bytes in a capture, so every claim it makes about
 * *where* a colour sits has to be true of the buffer first: a bar that overlaps
 * its neighbour, a margin with a colour in it, or a point converted as if the
 * capture were 1× would let the probe pass while measuring the wrong thing.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import { hexOf, type Rgb } from "./content.js";
import {
  ALPHA_BASE,
  ALPHA_OVER,
  ALPHA_POINTS,
  ALPHA_SHARE,
  BAR_PIXEL,
  MARGIN_PIXEL,
  PLOT,
  PLOT_BACKING,
  PLOT_SVG,
  REPLACEMENT,
  SERIES,
  VECTOR,
  alphaBands,
  alphaBasePixels,
  alphaOverPixels,
  barBand,
  compositeOver,
  plotPixels,
  pointIn,
} from "./chart.js";

/** How many pixels of `plot` carry exactly `colour`, alpha included. */
const countColour = (plot: Uint8Array, colour: Rgb): number =>
  Arr.reduce(
    Arr.makeBy(PLOT.width * PLOT.height, (at) => at),
    0,
    (total, at) =>
      plot[at * 4] === colour.r &&
      plot[at * 4 + 1] === colour.g &&
      plot[at * 4 + 2] === colour.b &&
      plot[at * 4 + 3] === 0xff
        ? total + 1
        : total,
  );

/** The colour of one buffer pixel, as the probe would sample it. */
const pixelAt = (
  plot: Uint8Array,
  pixel: { readonly x: number; readonly y: number },
): string => {
  const at = (pixel.y * PLOT.width + pixel.x) * 4;
  return `rgba(${plot[at]}, ${plot[at + 1]}, ${plot[at + 2]}, ${plot[at + 3]})`;
};

describe("the chart-raster fixture", () => {
  it("lays out one straight-RGBA quadruple per plot pixel", () => {
    expect(plotPixels(SERIES).length).toBe(PLOT.width * PLOT.height * 4);
  });

  it("gives each series its own band, and no series a pixel of another's", () => {
    const plot = plotPixels(SERIES);
    const barPixels = (PLOT.height - 10) * (barBand(0).right - barBand(0).left);
    expect(Arr.map(SERIES, (colour) => countColour(plot, colour))).toEqual(
      Arr.makeBy(SERIES.length, () => barPixels),
    );
  });

  it("leaves the margin transparent, so the frame shows what is behind it", () => {
    const plot = plotPixels(SERIES);
    const margin = PLOT.width * PLOT.height - 3 * (PLOT.height - 10) * 14;
    expect(countColour(plot, { r: 0, g: 0, b: 0 })).toBe(0);
    expect(
      Arr.filter(
        Arr.makeBy(PLOT.width * PLOT.height, (at) => at),
        (at) => plot[at * 4 + 3] === 0,
      ).length,
    ).toBe(margin);
    expect(pixelAt(plot, MARGIN_PIXEL)).toBe("rgba(0, 0, 0, 0)");
  });

  it("paints a bar pixel its own series colour", () => {
    expect(pixelAt(plotPixels(SERIES), BAR_PIXEL)).toBe(
      `rgba(${SERIES[0].r}, ${SERIES[0].g}, ${SERIES[0].b}, 255)`,
    );
  });

  it("shares no colour between the first frame and its replacement", () => {
    // The probe asserts the first buffer's colours are absent after the update;
    // one shared colour would let a stale frame pass that check.
    const first = Arr.map(SERIES, hexOf);
    const second = Arr.map(REPLACEMENT, hexOf);
    expect(Arr.filter(first, (colour) => Arr.contains(second, colour))).toEqual(
      [],
    );
    expect(Arr.filter(second, (colour) => Arr.contains(first, colour))).toEqual(
      [],
    );
  });

  it("names every vector colour in the markup the decoder is handed", () => {
    expect(
      Arr.map(VECTOR, (colour) => PLOT_SVG.includes(hexOf(colour))),
    ).toEqual(Arr.makeBy(VECTOR.length, () => true));
    expect(PLOT_SVG.split("<rect").length - 1).toBe(VECTOR.length);
    expect(PLOT_SVG.includes(hexOf(PLOT_BACKING))).toBe(false);
  });

  it("keeps the translucent layer inside its bands, half alpha over the base", () => {
    const under = alphaBasePixels();
    const over = alphaOverPixels();
    expect(pixelAt(under, ALPHA_POINTS.overBase)).toBe(
      `rgba(${ALPHA_BASE.r}, ${ALPHA_BASE.g}, ${ALPHA_BASE.b}, 255)`,
    );
    expect(pixelAt(over, ALPHA_POINTS.overBase)).toBe(
      `rgba(${ALPHA_OVER.r}, ${ALPHA_OVER.g}, ${ALPHA_OVER.b}, ${ALPHA_SHARE})`,
    );
    expect(pixelAt(over, ALPHA_POINTS.overBacking)).toBe(
      `rgba(${ALPHA_OVER.r}, ${ALPHA_OVER.g}, ${ALPHA_OVER.b}, ${ALPHA_SHARE})`,
    );
    expect(pixelAt(over, ALPHA_POINTS.opaque)).toBe(
      `rgba(${ALPHA_OVER.r}, ${ALPHA_OVER.g}, ${ALPHA_OVER.b}, 255)`,
    );
    // The base stops where the translucent over-mark continues: the sample
    // over the card would otherwise be a second read of the red mark.
    expect(pixelAt(under, ALPHA_POINTS.overBacking)).toBe("rgba(0, 0, 0, 0)");
    expect(ALPHA_POINTS.overBase.x).toBeGreaterThanOrEqual(alphaBands.base.left);
    expect(ALPHA_POINTS.overBase.x).toBeLessThan(alphaBands.base.right);
    expect(ALPHA_POINTS.opaque.x).toBeGreaterThanOrEqual(
      alphaBands.opaque.left,
    );
    expect(ALPHA_POINTS.opaque.x).toBeLessThan(alphaBands.opaque.right);
  });

  it("predicts the straight-alpha composite the probe holds a frame to", () => {
    const black = { r: 0, g: 0, b: 0 };
    const white = { r: 255, g: 255, b: 255 };
    expect(compositeOver({ r: 255, g: 0, b: 0 }, black, 128)).toEqual({
      r: 128,
      g: 0,
      b: 0,
    });
    expect(compositeOver(black, white, 128)).toEqual({
      r: 127,
      g: 127,
      b: 127,
    });
    // Both ends are the operands themselves, not a mixture.
    expect(compositeOver(ALPHA_OVER, ALPHA_BASE, 255)).toEqual(ALPHA_OVER);
    expect(compositeOver(ALPHA_OVER, ALPHA_BASE, 0)).toEqual(ALPHA_BASE);
    // The prediction is not symmetric: a probe that swapped the operands would
    // read a different colour.
    expect(
      compositeOver(ALPHA_OVER, ALPHA_BASE, ALPHA_SHARE),
    ).not.toEqual(compositeOver(ALPHA_BASE, ALPHA_OVER, ALPHA_SHARE));
  });

  it("converts a buffer pixel to a fraction of the painted box", () => {
    const box = { x: 100, y: 50, width: 120, height: 80 };
    expect(pointIn(box, { x: 0, y: 0 })).toEqual({ x: 101, y: 51 });
    expect(pointIn(box, { x: PLOT.width - 1, y: PLOT.height - 1 })).toEqual({
      x: 219,
      y: 129,
    });
    // A capture is device-scaled, so the same buffer pixel moves with the box:
    // a doubled element halves the fraction of the box it sits in.
    expect(
      pointIn({ ...box, width: 240, height: 160 }, { x: 0, y: 0 }),
    ).toEqual({ x: 102, y: 52 });
  });
});

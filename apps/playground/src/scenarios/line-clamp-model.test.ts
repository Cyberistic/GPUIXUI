/**
 * The multi-line clamp rules (plan `829`).
 *
 * The bug these guard: a probe that counts ink bands without checking *where*
 * the ink is would pass a run that paints below its clamp, and a tail metric
 * that accepts any short cluster would pass a clipped glyph as an ellipsis.
 * Each test places ink by hand in a synthetic frame, so the rule — not the
 * fixture — is what is measured.
 */
import { describe, expect, it } from "vitest";
import { Pixels, Smoke } from "@gpuixui/testing";
import {
  CLAMP_FIXTURES,
  CLAMP_LINE_HEIGHT,
  DOT_COUNT,
  bandPitches,
  clampFixtures,
  dotRun,
  expectedHeight,
  expectedLines,
  fixturesDistinct,
  glyphTail,
  hasInk,
  inkBands,
  inkInStrip,
  isEllipsis,
  lastLineOf,
  noInk,
  stripAfterLines,
  stripBelow,
  tailClusters,
  uniformPitch,
} from "./line-clamp-model.js";

const INK = new Pixels.Rgba({ r: 255, g: 255, b: 255, a: 255 });
const TOLERANCE = 6;
const LINE = 20;

const frameOf = (width: number, height: number): Pixels.Pixels =>
  new Pixels.Pixels({
    width,
    height,
    data: new Uint8Array(width * height * 4),
  });

const windowOf = (frame: Pixels.Pixels): Smoke.WindowSize =>
  new Smoke.WindowSize({ width: frame.width, height: frame.height });

const paint = (
  frame: Pixels.Pixels,
  x: number,
  y: number,
  width: number,
  height: number,
): Pixels.Pixels => {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      const offset = (row * frame.width + column) * 4;
      frame.data[offset] = INK.r;
      frame.data[offset + 1] = INK.g;
      frame.data[offset + 2] = INK.b;
      frame.data[offset + 3] = INK.a;
    }
  }
  return frame;
};

const BOX = { x: 0, y: 0, width: 40, height: 60 } as const;

const tailOf = (
  frame: Pixels.Pixels,
  bandPx = 60,
): ReadonlyArray<ReturnType<typeof tailClusters>[number]> =>
  tailClusters(
    frame,
    windowOf(frame),
    { x: 0, y: 0, width: frame.width, height: frame.height },
    INK,
    TOLERANCE,
    bandPx,
  );

describe("inkBands", () => {
  it("finds one band per ink strip, with the pitch between them", () => {
    const frame = paint(frameOf(40, 60), 0, 0, 40, 10);
    paint(frame, 0, 20, 40, 10);
    const bands = inkBands(frame, windowOf(frame), BOX, INK, TOLERANCE);
    expect(bands).toEqual([
      { top: 0, bottom: 9 },
      { top: 20, bottom: 29 },
    ]);
    expect(bandPitches(bands)).toEqual([20]);
    expect(uniformPitch(bandPitches(bands), 20)).toBe(true);
  });

  it("reports no band on a blank frame, so a blank capture cannot pass a count", () => {
    const frame = frameOf(40, 60);
    const bands = inkBands(frame, windowOf(frame), BOX, INK, TOLERANCE);
    expect(bands).toHaveLength(0);
    expect(bandPitches(bands)).toEqual([]);
    expect(uniformPitch(bandPitches(bands), 20)).toBe(false);
  });

  it("ignores ink outside the box", () => {
    const frame = paint(frameOf(40, 80), 0, 70, 40, 5);
    expect(inkBands(frame, windowOf(frame), BOX, INK, TOLERANCE)).toHaveLength(
      0,
    );
  });
});

describe("inkInStrip", () => {
  it("counts only the ink inside the strip", () => {
    const frame = paint(frameOf(40, 60), 0, 40, 40, 10);
    const strip = { x: 0, y: 30, width: 40, height: 30 } as const;
    const scan = inkInStrip(frame, windowOf(frame), strip, INK, TOLERANCE);
    expect(scan).toEqual({ sampled: 1200, ink: 400 });
    expect(hasInk(scan)).toBe(true);
    expect(noInk(scan)).toBe(false);
  });

  it("calls an empty strip no ink, and an off-frame strip unproven", () => {
    const frame = paint(frameOf(40, 60), 0, 40, 40, 10);
    const empty = { x: 0, y: 0, width: 40, height: 30 } as const;
    expect(
      noInk(inkInStrip(frame, windowOf(frame), empty, INK, TOLERANCE)),
    ).toBe(true);
    const outside = { x: 0, y: 200, width: 40, height: 30 } as const;
    const unproven = inkInStrip(
      frame,
      windowOf(frame),
      outside,
      INK,
      TOLERANCE,
    );
    expect(unproven.sampled).toBe(0);
    expect(noInk(unproven)).toBe(false);
  });
});

describe("the last line's tail", () => {
  it("groups three short low clusters into an ellipsis", () => {
    const frame = frameOf(60, LINE);
    paint(frame, 20, 14, 3, 3);
    paint(frame, 26, 14, 3, 3);
    paint(frame, 32, 14, 3, 3);
    const clusters = tailOf(frame);
    expect(clusters).toEqual([
      { left: 20, right: 22, top: 14, height: 3 },
      { left: 26, right: 28, top: 14, height: 3 },
      { left: 32, right: 34, top: 14, height: 3 },
    ]);
    const run = dotRun(clusters, LINE);
    expect(run.count).toBe(DOT_COUNT);
    expect(run.gaps).toEqual([3, 3]);
    expect(isEllipsis(run, LINE)).toBe(true);
  });

  it("reads a clipped glyph as a tall tail, not as dots", () => {
    const frame = paint(frameOf(60, LINE), 0, 2, 10, 17);
    const clusters = tailOf(frame);
    expect(dotRun(clusters, LINE).count).toBe(0);
    expect(glyphTail(clusters, LINE)).toBeCloseTo(0.85, 5);
  });

  it("rejects two or four dots", () => {
    const two = frameOf(60, LINE);
    paint(two, 20, 14, 3, 3);
    paint(two, 26, 14, 3, 3);
    expect(isEllipsis(dotRun(tailOf(two), LINE), LINE)).toBe(false);

    const four = frameOf(60, LINE);
    paint(four, 8, 14, 3, 3);
    paint(four, 14, 14, 3, 3);
    paint(four, 20, 14, 3, 3);
    paint(four, 26, 14, 3, 3);
    expect(dotRun(tailOf(four), LINE).count).toBe(4);
    expect(isEllipsis(dotRun(tailOf(four), LINE), LINE)).toBe(false);
  });

  it("rejects a dot that sits high on the line", () => {
    const frame = frameOf(60, LINE);
    paint(frame, 20, 0, 3, 3);
    paint(frame, 26, 0, 3, 3);
    paint(frame, 32, 0, 3, 3);
    expect(dotRun(tailOf(frame), LINE).count).toBe(0);
  });

  it("rejects three dots with a wide gap", () => {
    const frame = frameOf(60, LINE);
    paint(frame, 10, 14, 3, 3);
    paint(frame, 30, 14, 3, 3);
    paint(frame, 34, 14, 3, 3);
    const run = dotRun(tailOf(frame), LINE);
    expect(run.count).toBe(3);
    expect(run.gaps).toEqual([17, 1]);
    expect(isEllipsis(run, LINE)).toBe(false);
  });
});

describe("the fixture geometry", () => {
  it("places the last line and the strip after a line mark", () => {
    const box = { x: 5, y: 10, width: 40, height: 52 } as const;
    expect(lastLineOf(box)).toEqual({
      x: 5,
      y: 36,
      width: 40,
      height: 26,
    });
    const panel = { x: 0, y: 0, width: 280, height: 180 } as const;
    expect(stripBelow(box, panel)).toEqual({
      x: 5,
      y: 62,
      width: 40,
      height: 118,
    });
    expect(stripAfterLines(box, 2, panel)).toEqual({
      x: 5,
      y: 62,
      width: 40,
      height: 118,
    });
    expect(stripAfterLines(box, 1, panel).y).toBe(36);
  });

  it("derives the line count and height from the contract, not the clamp", () => {
    expect(expectedLines(clampFixtures.cut)).toBe(2);
    expect(expectedLines(clampFixtures.three)).toBe(3);
    expect(expectedLines(clampFixtures.free)).toBe(4);
    expect(expectedHeight(clampFixtures.cut)).toBe(2 * CLAMP_LINE_HEIGHT);
    expect(expectedLines({ ...clampFixtures.mark, clamp: 3 })).toBe(2);
  });

  it("refuses two fixtures that would share a text layout", () => {
    expect(fixturesDistinct(CLAMP_FIXTURES)).toBe(true);
    expect(
      fixturesDistinct([
        clampFixtures.cut,
        { ...clampFixtures.mark, run: clampFixtures.cut.run },
      ]),
    ).toBe(false);
    expect(
      fixturesDistinct([
        clampFixtures.cut,
        { ...clampFixtures.mark, testId: clampFixtures.cut.testId },
      ]),
    ).toBe(false);
  });
});

/**
 * Guards the premises of the text-decoration checks (plan `775`).
 *
 * The bug being guarded: `textDecoration` is declared by the pinned runtime and
 * shipped by the `link` Button variant and `tw`'s `underline`, but no check
 * samples the frame for a line. A runtime that accepted the property and drew
 * nothing would leave those surfaces invisible while the suite stayed green.
 * These tests pin the decoration metric — a **continuous near-full-width ink
 * row** — including its bands, its device-scale mapping, its refusal of a
 * mismatched frame, and its colour channel. Each can fail: count non-contiguous
 * pixels, ignore the device scale, or accept a line in the panel colour.
 */
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import {
  ANY_BAND,
  DECORATION_FIXTURES,
  DECORATION_SPAN,
  LINE_TOLERANCE,
  STRIKE_BAND,
  UNDERLINE_BAND,
  anyDecoration,
  bandOf,
  decorationFixtures,
  decorationFixturesDistinct,
  decorationPresent,
  scanDecoration,
} from "./text-decoration-model.js";

const rgba = (hex: string): Pixels.Rgba => {
  const parsed = Pixels.hexToRgba(hex);
  if (Option.isNone(parsed)) {
    throw new Error(`unparseable test colour ${hex}`);
  }
  return parsed.value;
};

const CARD = "#191D25";
const INK = "#EEF1F5";
const OTHER = "#3BC97F";

const windowOf = (width: number, height: number): Smoke.WindowSize =>
  new Smoke.WindowSize({ width, height });

const boxOf = (width: number, height: number): Smoke.Bounds => ({
  x: 0,
  y: 0,
  width,
  height,
});

interface Block {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly colour?: string;
}

/** A frame filled with `background`, then the given blocks painted in order. */
const frameWith = (
  width: number,
  height: number,
  blocks: ReadonlyArray<Block>,
  background = CARD,
): Pixels.Pixels => {
  const under = rgba(background);
  const channels = Array.from({ length: width * height }, (_, index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    const block = blocks.find(
      (candidate) =>
        x >= candidate.x &&
        x < candidate.x + candidate.width &&
        y >= candidate.y &&
        y < candidate.y + candidate.height,
    );
    const colour = block === undefined ? under : rgba(block.colour ?? INK);
    return [colour.r, colour.g, colour.b, colour.a];
  });
  return new Pixels.Pixels({
    width,
    height,
    data: Uint8Array.from(channels.flat()),
  });
};

const scanOf = (
  frame: Pixels.Pixels,
  width: number,
  height: number,
  expected: string = INK,
) =>
  scanDecoration(
    frame,
    windowOf(width, height),
    boxOf(width, height),
    rgba(expected),
    LINE_TOLERANCE,
  );

/** The widest row, for a test that must sample its colour. */
const widestOf = (scan: ReturnType<typeof scanOf>) => {
  const row = Option.getOrNull(scan.widest);
  if (row === null) {
    throw new Error("the fixture painted no ink row");
  }
  return row;
};

describe("scanDecoration", () => {
  it("finds a full-width line in the underline band", () => {
    const frame = frameWith(40, 20, [{ x: 5, y: 15, width: 30, height: 2 }]);
    const scan = scanOf(frame, 40, 20);
    expect(scan.sampled).toBe(800);
    expect(widestOf(scan).span).toBe(30);
    expect(widestOf(scan).y).toBeCloseTo(0.75);
    expect(decorationPresent(scan, 40, 1, UNDERLINE_BAND)).toBe(true);
    // check-tests-ok: the widest row's colour is the sampled ink, which the
    // metric must report for the colour check; it is not the input echoed back.
    expect(
      Pixels.rgbaNear(widestOf(scan).colour, rgba(INK), LINE_TOLERANCE),
    ).toBe(true);
  });

  it("does not mistake glyph stems for a line", () => {
    const stems = [5, 15, 25].map((x) => ({
      x,
      y: 4,
      width: 2,
      height: 8,
    }));
    const scan = scanOf(frameWith(40, 20, stems), 40, 20);
    expect(anyDecoration(scan, 40, 1)).toBe(false);
    expect(Option.getOrNull(scan.widest)?.span).toBe(2);
  });

  it("requires contiguity, so a dotted row is not a solid line", () => {
    const dots = Array.from({ length: 20 }, (_, index) => ({
      x: index * 2,
      y: 15,
      width: 1,
      height: 1,
    }));
    const scan = scanOf(frameWith(40, 20, dots), 40, 20);
    expect(Option.getOrNull(scan.widest)?.span).toBe(1);
    expect(decorationPresent(scan, 40, 1, UNDERLINE_BAND)).toBe(false);
  });

  it("classifies the row's band", () => {
    expect(bandOf(0.2)).toBe("elsewhere");
    expect(bandOf(0.45)).toBe("strike");
    expect(bandOf(0.7)).toBe("underline");
  });

  it("maps logical rows through the device scale", () => {
    const frame = frameWith(80, 40, [{ x: 10, y: 30, width: 60, height: 2 }]);
    const scan = scanDecoration(
      frame,
      windowOf(40, 20),
      boxOf(40, 20),
      rgba(INK),
      LINE_TOLERANCE,
    );
    expect(Option.getOrNull(scan.widest)?.span).toBe(60);
    expect(Option.getOrNull(scan.widest)?.y).toBeCloseTo(0.75);
    expect(decorationPresent(scan, 40, 2, UNDERLINE_BAND)).toBe(true);
  });

  it("refuses a frame whose size does not match the window", () => {
    const frame = frameWith(10, 6, []);
    const scan = scanDecoration(
      frame,
      windowOf(6, 6),
      boxOf(6, 6),
      rgba(INK),
      LINE_TOLERANCE,
    );
    expect(scan.sampled).toBe(0);
    expect(Option.isNone(scan.widest)).toBe(true);
    expect(anyDecoration(scan, 6, 1)).toBe(false);
  });

  it("only counts pixels in the run's own ink", () => {
    const frame = frameWith(40, 20, [{ x: 0, y: 15, width: 40, height: 2 }]);
    const red = scanOf(frame, 40, 20, OTHER);
    expect(Option.getOrNull(red.widest)).toBeNull();
    expect(anyDecoration(red, 40, 1)).toBe(false);
  });

  it("is a span threshold, not a non-empty test", () => {
    const short = scanOf(
      frameWith(100, 20, [{ x: 0, y: 15, width: 59, height: 2 }]),
      100,
      20,
    );
    const near = scanOf(
      frameWith(100, 20, [{ x: 0, y: 15, width: 61, height: 2 }]),
      100,
      20,
    );
    expect(decorationPresent(short, 100, 1, ANY_BAND)).toBe(false);
    expect(decorationPresent(near, 100, 1, ANY_BAND)).toBe(true);
    expect(DECORATION_SPAN).toBe(0.6);
  });

  it("classifies the strike band separately from the underline", () => {
    const frame = frameWith(40, 20, [{ x: 5, y: 9, width: 30, height: 2 }]);
    const scan = scanOf(frame, 40, 20);
    expect(decorationPresent(scan, 40, 1, STRIKE_BAND)).toBe(true);
    expect(decorationPresent(scan, 40, 1, UNDERLINE_BAND)).toBe(false);
  });
});

describe("decorationFixtures", () => {
  it("covers every declaration with unique ids", () => {
    expect(decorationFixturesDistinct(DECORATION_FIXTURES)).toBe(true);
    const duplicated = [...DECORATION_FIXTURES, decorationFixtures.none];
    expect(decorationFixturesDistinct(duplicated)).toBe(false);
  });
});

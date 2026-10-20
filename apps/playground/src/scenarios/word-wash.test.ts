/**
 * Guards the finder behind the diff's word-wash pixel checks (plan `707`).
 *
 * `diff-surface` and `live-diff` compare a `wordDiff` off/on frame pair with
 * `findWashRun`. That comparison is only evidence if the finder reports the
 * run that actually changed, at logical window coordinates, and refuses to
 * mistake glyph ink or a stationary frame for a wash. Each fixture is the
 * input; every expectation is a property of the answer, never the fixture
 * asserted back.
 */
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import { findWashRun } from "./word-wash.js";

const WINDOW = { width: 20, height: 10 } as const;

const colour = (hex: string): Pixels.Rgba =>
  Option.getOrElse(Pixels.hexToRgba(hex), () => {
    // A fixture literal that does not parse is a broken test, not a domain
    // failure, so it must stop the run rather than become a value.
    throw new Error(`fixture colour ${hex} must parse`);
  });

/** A frame at `scale`, uniformly filled with `hex`. */
const frame = (
  window: { readonly width: number; readonly height: number },
  scale: number,
  hex: string,
): Pixels.Pixels => {
  const width = window.width * scale;
  const height = window.height * scale;
  const data = new Uint8Array(width * height * 4);
  const fill = colour(hex);
  for (let offset = 0; offset < data.length; offset += 4) {
    data[offset] = fill.r;
    data[offset + 1] = fill.g;
    data[offset + 2] = fill.b;
    data[offset + 3] = 255;
  }
  return new Pixels.Pixels({ width, height, data });
};

/** Paint a logical rectangle, respecting the frame's device scale. */
const paint = (
  pixels: Pixels.Pixels,
  scale: number,
  x: number,
  y: number,
  width: number,
  height: number,
  hex: string,
): void => {
  const ink = colour(hex);
  for (let row = 0; row < height * scale; row += 1) {
    for (let column = 0; column < width * scale; column += 1) {
      const offset =
        (y * scale + row) * pixels.width * 4 + (x * scale + column) * 4;
      pixels.data[offset] = ink.r;
      pixels.data[offset + 1] = ink.g;
      pixels.data[offset + 2] = ink.b;
      pixels.data[offset + 3] = 255;
    }
  }
};

const row = { x: 0, y: 3, width: WINDOW.width, height: 1 };

describe("the word-wash finder", () => {
  it("finds a changed run on a uniform row and reports its colours", () => {
    const before = frame(WINDOW, 1, "#101010");
    const after = frame(WINDOW, 1, "#101010");
    paint(after, 1, 4, 3, 4, 1, "#2E5A2E");

    const run = Option.getOrUndefined(findWashRun(before, after, WINDOW, row));

    expect(run).toMatchObject({ x: 4, y: 3, width: 4 });
    expect(run?.before).toMatchObject({ r: 0x10, g: 0x10, b: 0x10 });
    expect(run?.after).toMatchObject({ r: 0x2e, g: 0x5a, b: 0x2e });
  });

  it("returns None when nothing changed", () => {
    const before = frame(WINDOW, 1, "#101010");
    const after = frame(WINDOW, 1, "#101010");

    expect(Option.isNone(findWashRun(before, after, WINDOW, row))).toBe(true);
  });

  it("ignores a single changed pixel below the minimum width", () => {
    const before = frame(WINDOW, 1, "#101010");
    const after = frame(WINDOW, 1, "#101010");
    paint(after, 1, 5, 3, 1, 1, "#2E5A2E");

    expect(Option.isNone(findWashRun(before, after, WINDOW, row))).toBe(true);
  });

  it("rejects a changed span that sits on ink, not one background", () => {
    const before = frame(WINDOW, 1, "#101010");
    const after = frame(WINDOW, 1, "#101010");
    for (let x = 2; x < 9; x += 1) {
      const ink = x % 2 === 0 ? "#101010" : "#303030";
      paint(before, 1, x, 3, 1, 1, ink);
      paint(after, 1, x, 3, 1, 1, x % 2 === 0 ? "#303030" : "#505050");
    }

    expect(Option.isNone(findWashRun(before, after, WINDOW, row))).toBe(true);
  });

  it("chooses the widest run when a row carries two", () => {
    const before = frame(WINDOW, 1, "#101010");
    const after = frame(WINDOW, 1, "#101010");
    paint(after, 1, 2, 3, 3, 1, "#2E5A2E");
    paint(after, 1, 12, 3, 7, 1, "#2E5A2E");

    const run = Option.getOrUndefined(findWashRun(before, after, WINDOW, row));

    expect(run?.x).toBe(12);
    expect(run?.width).toBe(7);
  });

  it("samples at logical coordinates on a device-scaled frame", () => {
    const window = { width: 20, height: 20 } as const;
    const before = frame(window, 2, "#101010");
    const after = frame(window, 2, "#101010");
    paint(after, 2, 6, 5, 4, 1, "#2E5A2E");

    const run = Option.getOrUndefined(
      findWashRun(before, after, window, {
        x: 0,
        y: 5,
        width: window.width,
        height: 1,
      }),
    );

    expect(run?.x).toBe(6);
    expect(run?.width).toBe(4);
  });
});

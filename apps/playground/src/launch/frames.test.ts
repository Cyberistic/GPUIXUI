// Guards the launch benchmark: blank or half-read frames never count, and even samples have a true median.
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { firstContentFrame, summarize } from "./frames.js";

describe("firstContentFrame", () => {
  const spawnedAtUs = 1_000_000;

  it("skips the blank frame a hidden window presents", () => {
    const output =
      "frame 0 1100000 0\nframe 1 1200000 2089\nframe 2 1300000 2089\n";
    expect(firstContentFrame(output, spawnedAtUs)).toEqual(
      Option.some({ frame: 1, milliseconds: 200, pixels: 2089 }),
    );
  });

  it("finds nothing when no frame has content", () => {
    expect(
      Option.isNone(
        firstContentFrame("frame 0 1100000 0\nnoise\n", spawnedAtUs),
      ),
    ).toBe(true);
  });

  it("waits for a record split across pipe chunks", () => {
    const partial = "frame 1 1200000 2";
    expect(Option.isNone(firstContentFrame(partial, spawnedAtUs))).toBe(true);
    expect(firstContentFrame(`${partial}089\n`, spawnedAtUs)).toEqual(
      Option.some({ frame: 1, milliseconds: 200, pixels: 2089 }),
    );
  });
});

describe("summarize", () => {
  it("reads quartiles from unsorted samples", () => {
    expect(summarize([50, 10, 40, 20, 30])).toEqual({
      median: 30,
      lowerQuartile: 20,
      upperQuartile: 40,
    });
  });

  it("interpolates between the middle samples of an even count", () => {
    expect(summarize([40, 10, 30, 20])).toEqual({
      median: 25,
      lowerQuartile: 17.5,
      upperQuartile: 32.5,
    });
  });
});

// Guards the launch benchmark: a blank frame must never count as content.
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { firstContentFrame, summarize } from "./frames.js";

describe("firstContentFrame", () => {
  const spawnedAtUs = 1_000_000;

  it("skips the blank frame a hidden window presents", () => {
    const lines = [
      "frame 0 1100000 0",
      "frame 1 1200000 2089",
      "frame 2 1300000 2089",
    ];
    expect(firstContentFrame(lines, spawnedAtUs)).toEqual(
      Option.some({ frame: 1, milliseconds: 200, pixels: 2089 }),
    );
  });

  it("finds nothing when no frame has content", () => {
    expect(
      Option.isNone(
        firstContentFrame(["frame 0 1100000 0", "noise"], spawnedAtUs),
      ),
    ).toBe(true);
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
});

/**
 * Guards the premises of the text-ink checks (plan `773`).
 *
 * The bug being guarded: a `<text>` run's `color` is proven only by the
 * **authored** style report and the source run — no suite samples a glyph. A
 * runtime that rasterised every run in its default ink would pass every
 * existing check while four roles painted identically. These tests pin the scan
 * (including its device-scale mapping and its refusal of a mismatched frame),
 * the evidence threshold, and the palette separation the cross checks rely on.
 * Each can fail: scan logical instead of device pixels, treat every pixel as
 * near, or collapse two roles.
 */
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import { palettes } from "../palettes.js";
import {
  INK_FIXTURES,
  INK_RUN,
  INK_TOLERANCE,
  MIN_INK_PIXELS,
  distinctInk,
  inkEvidence,
  inkFixtures,
  inkValues,
  nextRole,
  scanInk,
} from "./text-ink-model.js";

const rgba = (hex: string): Pixels.Rgba => {
  const parsed = Pixels.hexToRgba(hex);
  if (Option.isNone(parsed)) {
    throw new Error(`unparseable test colour ${hex}`);
  }
  return parsed.value;
};

const windowOf = (width: number, height: number): Smoke.WindowSize =>
  new Smoke.WindowSize({ width, height });

/** A frame filled with `background`, then one block of `ink`. */
const frameWithBlock = (
  width: number,
  height: number,
  background: string,
  ink: string,
  block: { x: number; y: number; width: number; height: number },
): Pixels.Pixels => {
  const under = rgba(background);
  const over = rgba(ink);
  const channels = Array.from({ length: width * height }, (_, index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    const inside =
      x >= block.x &&
      x < block.x + block.width &&
      y >= block.y &&
      y < block.y + block.height;
    const colour = inside ? over : under;
    return [colour.r, colour.g, colour.b, colour.a];
  });
  const data = Uint8Array.from(channels.flat());
  return new Pixels.Pixels({ width, height, data });
};

const box = {
  x: 2,
  y: 1,
  width: 6,
  height: 4,
} as const;

describe("scanInk", () => {
  it("counts the interior pixels that carry the token", () => {
    const frame = frameWithBlock(12, 6, "#191D25", "#EEF1F5", box);
    const scan = scanInk(
      frame,
      windowOf(12, 6),
      box,
      rgba("#EEF1F5"),
      INK_TOLERANCE,
    );
    expect(scan.sampled).toBe(24);
    expect(scan.near).toBe(24);
  });

  it("finds nothing when the run painted another role", () => {
    const frame = frameWithBlock(12, 6, "#191D25", "#EEF1F5", box);
    const scan = scanInk(
      frame,
      windowOf(12, 6),
      box,
      rgba("#FF6B6B"),
      INK_TOLERANCE,
    );
    expect(scan.near).toBe(0);
    expect(Pixels.rgbaNear(scan.closest, rgba("#EEF1F5"), 0)).toBe(true);
  });

  it("maps the logical box through the frame's device scale", () => {
    const scaled = frameWithBlock(24, 12, "#191D25", "#EEF1F5", {
      x: box.x * 2,
      y: box.y * 2,
      width: box.width * 2,
      height: box.height * 2,
    });
    const scan = scanInk(
      scaled,
      windowOf(12, 6),
      box,
      rgba("#EEF1F5"),
      INK_TOLERANCE,
    );
    expect(scan.near).toBe(24 * 4);
  });

  it("refuses a frame whose size does not match the window", () => {
    const frame = frameWithBlock(10, 6, "#191D25", "#EEF1F5", box);
    const scan = scanInk(
      frame,
      windowOf(6, 6),
      box,
      rgba("#EEF1F5"),
      INK_TOLERANCE,
    );
    expect(scan.sampled).toBe(0);
    expect(scan.near).toBe(0);
  });

  it("names the ink it actually found", () => {
    const frame = frameWithBlock(12, 6, "#191D25", "#010203", box);
    const scan = scanInk(
      frame,
      windowOf(12, 6),
      box,
      rgba("#EEF1F5"),
      INK_TOLERANCE,
    );
    expect(Pixels.rgbaNear(scan.closest, rgba("#010203"), 0)).toBe(true);
  });
});

describe("inkEvidence", () => {
  it("is a threshold, not a non-empty test", () => {
    const scan = (near: number) => ({
      sampled: 100,
      near,
      closest: rgba("#EEF1F5"),
    });
    expect(inkEvidence(scan(MIN_INK_PIXELS - 1), MIN_INK_PIXELS)).toBe(false);
    expect(inkEvidence(scan(MIN_INK_PIXELS), MIN_INK_PIXELS)).toBe(true);
  });
});

describe("the fixture roles", () => {
  it("keeps every role distinct under the dark palette", () => {
    expect(distinctInk(inkFixtures(palettes.dark.colors))).toBe(true);
  });

  it("refuses a palette edit that collapses two roles", () => {
    const fixtures = inkFixtures(palettes.dark.colors);
    expect(distinctInk({ ...fixtures, muted: fixtures.foreground })).toBe(
      false,
    );
  });

  it("separates every pair by more than twice the ink tolerance", () => {
    const parsed = inkValues(inkFixtures(palettes.dark.colors)).map(rgba);
    const pairs = parsed.flatMap((left, index) =>
      parsed.slice(index + 1).map((right) => [left, right] as const),
    );
    expect(pairs.length).toBe(6);
    expect(
      pairs.every(([left, right]) =>
        Pixels.rgbaNear(left, right, INK_TOLERANCE * 2),
      ),
    ).toBe(false);
  });

  it("cycles the cross-check successor and never points at itself", () => {
    expect(nextRole("foreground")).toBe("muted");
    expect(nextRole("muted")).toBe("destructive");
    expect(nextRole("destructive")).toBe("success");
    expect(nextRole("success")).toBe("foreground");
  });

  it("uses a dense run and a fixture id per role", () => {
    expect(INK_RUN.length).toBeGreaterThanOrEqual(4);
    expect(INK_FIXTURES.map((fixture) => fixture.role)).toEqual([
      "foreground",
      "muted",
      "destructive",
      "success",
    ]);
  });
});

/**
 * Guards the premises of the truncation pixel checks (plan `778`).
 *
 * The bug being guarded: plan `335` measured truncation as geometry and
 * recorded that the `…` was never asserted, so a runtime that clipped the run
 * instead of drawing an ellipsis — or painted past the layout box — would pass
 * every check. These tests pin the right-edge metric (a dot column is short, a
 * clipped capital is tall), the spill scan, the device-scale mapping and the
 * refusal of a frame that carries no evidence. Each can fail by flattening the
 * column ratio, ignoring the scale, counting ink inside the box as spill, or
 * accepting an unsampled strip.
 */
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import {
  DOT_COLUMN_CEILING,
  TRUNCATION_FIXTURES,
  edgeProfile,
  hasInk,
  looksClipped,
  looksLikeDots,
  noSpill,
  scanBox,
  spillScan,
  truncationFixtures,
  truncationFixturesDistinct,
  TRUNCATION_TOLERANCE,
} from "./truncation-model.js";

const rgba = (hex: string): Pixels.Rgba => {
  const parsed = Pixels.hexToRgba(hex);
  if (Option.isNone(parsed)) {
    throw new Error(`unparseable test colour ${hex}`);
  }
  return parsed.value;
};

const INK = "#EEF1F5";
const CARD = "#191D25";

const windowOf = (width: number, height: number): Smoke.WindowSize =>
  new Smoke.WindowSize({ width, height });

const boxOf = (
  x: number,
  y: number,
  width: number,
  height: number,
): Smoke.Bounds => ({ x, y, width, height });

interface Block {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A card-coloured frame with ink blocks painted on top. */
const frameWith = (
  width: number,
  height: number,
  blocks: ReadonlyArray<Block>,
): Pixels.Pixels => {
  const under = rgba(CARD);
  const ink = rgba(INK);
  const channels = Array.from({ length: width * height }, (_, index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    const painted = blocks.some(
      (block) =>
        x >= block.x &&
        x < block.x + block.width &&
        y >= block.y &&
        y < block.y + block.height,
    );
    const colour = painted ? ink : under;
    return [colour.r, colour.g, colour.b, colour.a];
  });
  return new Pixels.Pixels({
    width,
    height,
    data: Uint8Array.from(channels.flat()),
  });
};

describe("edgeProfile", () => {
  it("reads a dot run as a short right edge", () => {
    const frame = frameWith(40, 20, [
      { x: 34, y: 16, width: 2, height: 2 },
      { x: 37, y: 16, width: 2, height: 2 },
    ]);
    const profile = edgeProfile(
      frame,
      windowOf(40, 20),
      boxOf(0, 0, 40, 20),
      rgba(INK),
      TRUNCATION_TOLERANCE,
      6,
    );
    expect(profile.ink).toBe(8);
    expect(profile.columnRatio).toBeCloseTo(0.1);
    expect(looksLikeDots(profile)).toBe(true);
    expect(looksClipped(profile)).toBe(false);
  });

  it("reads a clipped capital as a tall right edge", () => {
    const frame = frameWith(40, 20, [{ x: 38, y: 2, width: 1, height: 16 }]);
    const profile = edgeProfile(
      frame,
      windowOf(40, 20),
      boxOf(0, 0, 40, 20),
      rgba(INK),
      TRUNCATION_TOLERANCE,
      6,
    );
    expect(profile.columnRatio).toBeCloseTo(0.8);
    expect(looksClipped(profile)).toBe(true);
    expect(looksLikeDots(profile)).toBe(false);
  });

  it("sits either side of the dot ceiling", () => {
    const atCeiling = frameWith(40, 20, [{ x: 38, y: 0, width: 1, height: 8 }]);
    const above = frameWith(40, 20, [{ x: 38, y: 0, width: 1, height: 9 }]);
    const profileOf = (frame: Pixels.Pixels) =>
      edgeProfile(
        frame,
        windowOf(40, 20),
        boxOf(0, 0, 40, 20),
        rgba(INK),
        TRUNCATION_TOLERANCE,
        6,
      );
    expect(profileOf(atCeiling).columnRatio).toBeCloseTo(DOT_COLUMN_CEILING);
    expect(looksLikeDots(profileOf(atCeiling))).toBe(true);
    expect(profileOf(above).columnRatio).toBeGreaterThan(DOT_COLUMN_CEILING);
    expect(looksLikeDots(profileOf(above))).toBe(false);
    // 9/20 = 0.45 is still below the clipped-capital floor.
    expect(looksClipped(profileOf(above))).toBe(false);
  });

  it("maps the band through the device scale", () => {
    const frame = frameWith(80, 40, [{ x: 76, y: 4, width: 2, height: 32 }]);
    const profile = edgeProfile(
      frame,
      windowOf(40, 20),
      boxOf(0, 0, 40, 20),
      rgba(INK),
      TRUNCATION_TOLERANCE,
      6,
    );
    expect(profile.columnRatio).toBeCloseTo(0.8);
    expect(looksClipped(profile)).toBe(true);
  });

  it("refuses a frame whose size does not match the window", () => {
    const profile = edgeProfile(
      frameWith(10, 6, [{ x: 8, y: 0, width: 1, height: 6 }]),
      windowOf(6, 6),
      boxOf(0, 0, 6, 6),
      rgba(INK),
      TRUNCATION_TOLERANCE,
      6,
    );
    expect(profile.sampled).toBe(0);
    expect(looksLikeDots(profile)).toBe(false);
    expect(looksClipped(profile)).toBe(false);
  });

  it("counts only the run's ink", () => {
    const frame = frameWith(40, 20, [{ x: 38, y: 2, width: 1, height: 16 }]);
    const profile = edgeProfile(
      frame,
      windowOf(40, 20),
      boxOf(0, 0, 40, 20),
      rgba("#3BC97F"),
      TRUNCATION_TOLERANCE,
      6,
    );
    expect(profile.ink).toBe(0);
    expect(looksLikeDots(profile)).toBe(false);
  });
});

describe("spillScan", () => {
  it("counts ink beside the box and inside the panel", () => {
    const frame = frameWith(60, 20, [
      { x: 12, y: 2, width: 1, height: 16 },
      { x: 50, y: 2, width: 1, height: 16 },
    ]);
    const scan = spillScan(
      frame,
      windowOf(60, 20),
      boxOf(0, 0, 10, 20),
      boxOf(0, 0, 40, 20),
      rgba(INK),
      TRUNCATION_TOLERANCE,
    );
    // x = 12 is beside the box (16 device rows); x = 50 is beyond the panel.
    expect(scan.ink).toBe(16);
    expect(noSpill(scan)).toBe(false);
  });

  it("does not count ink inside the box", () => {
    const frame = frameWith(60, 20, [{ x: 2, y: 2, width: 4, height: 16 }]);
    const scan = spillScan(
      frame,
      windowOf(60, 20),
      boxOf(0, 0, 10, 20),
      boxOf(0, 0, 40, 20),
      rgba(INK),
      TRUNCATION_TOLERANCE,
    );
    expect(scan.ink).toBe(0);
    expect(noSpill(scan)).toBe(true);
  });

  it("is not satisfied by an unsampled strip", () => {
    const scan = spillScan(
      frameWith(10, 6, [{ x: 8, y: 0, width: 1, height: 6 }]),
      windowOf(6, 6),
      boxOf(0, 0, 6, 6),
      boxOf(0, 0, 6, 6),
      rgba(INK),
      TRUNCATION_TOLERANCE,
    );
    expect(scan.sampled).toBe(0);
    expect(noSpill(scan)).toBe(false);
  });
});

describe("scanBox", () => {
  it("counts ink anywhere inside the box", () => {
    const frame = frameWith(40, 20, [{ x: 2, y: 2, width: 6, height: 16 }]);
    const box = scanBox(
      frame,
      windowOf(40, 20),
      boxOf(0, 0, 40, 20),
      rgba(INK),
      TRUNCATION_TOLERANCE,
    );
    expect(box.ink).toBe(96);
    expect(
      hasInk(
        { sampled: box.sampled, ink: box.ink, columnRatio: 0, rowRatio: 0 },
        32,
      ),
    ).toBe(true);
  });

  it("sees a blank box as no ink", () => {
    const box = scanBox(
      frameWith(40, 20, []),
      windowOf(40, 20),
      boxOf(0, 0, 40, 20),
      rgba(INK),
      TRUNCATION_TOLERANCE,
    );
    expect(box.ink).toBe(0);
  });
});

describe("the truncation fixtures", () => {
  it("are distinct and cover every kind", () => {
    expect(truncationFixturesDistinct(TRUNCATION_FIXTURES)).toBe(true);
    expect(TRUNCATION_FIXTURES.map((fixture) => fixture.kind)).toEqual([
      "ellipsis",
      "clip",
      "nowrap",
      "short",
    ]);
  });

  it("refuse a duplicate id", () => {
    const duplicated = [...TRUNCATION_FIXTURES, truncationFixtures.ellipsis];
    expect(truncationFixturesDistinct(duplicated)).toBe(false);
  });
});

/**
 * The shimmer's sweep arithmetic.
 *
 * The bugs these guard: a profile that starts or ends on the surface (a hard
 * band at the border), a peak that never crosses the surface, an alpha outside
 * 0…1, a counter that does not wrap, and a zero interval (a surface that ticks
 * every millisecond).
 */

import { describe, expect, it } from "vitest";
import {
  SHIMMER_STEPS,
  shimmerFrame,
  shimmerInk,
  shimmerInterval,
  shimmerLines,
} from "./logic.js";

const peakIndex = (step: number): number => {
  const { alphas } = shimmerFrame(step);
  return alphas.indexOf(Math.max(...alphas));
};

describe("shimmerFrame", () => {
  it("samples one alpha per strip edge", () => {
    expect(shimmerFrame(0).alphas).toHaveLength(SHIMMER_STEPS + 1);
  });

  it("starts and ends invisible", () => {
    expect(Math.max(...shimmerFrame(0).alphas)).toBe(0);
    expect(Math.max(...shimmerFrame(SHIMMER_STEPS - 1).alphas)).toBe(0);
  });

  it("travels one strip per frame and wraps", () => {
    const peaks = Array.from({ length: SHIMMER_STEPS }, (_, step) =>
      peakIndex(step),
    );
    const moving = peaks.slice(2, -2);
    expect(moving).toEqual([...moving].sort((a, b) => a - b));
    expect(peakIndex(SHIMMER_STEPS)).toBe(peakIndex(0));
    expect(peakIndex(-1)).toBe(peakIndex(SHIMMER_STEPS - 1));
  });

  it("keeps every alpha inside its range", () => {
    for (const step of Array.from({ length: SHIMMER_STEPS }, (_, i) => i)) {
      const { alphas, peak } = shimmerFrame(step);
      expect(alphas.every((alpha) => alpha >= 0 && alpha <= 1)).toBe(true);
      expect(peak).toBe(Math.max(...alphas));
    }
  });

  it("keeps a usable profile for a count it cannot read", () => {
    for (const steps of [0, -3, Number.NaN]) {
      const frame = shimmerFrame(2, steps);
      expect(frame.alphas.length).toBeGreaterThan(1);
      expect(frame.alphas.every(Number.isFinite)).toBe(true);
    }
  });
});

describe("shimmerInk", () => {
  it("rests at the source colour when the profile is dark", () => {
    expect(shimmerInk(shimmerFrame(0), 0.5, "#123456", "#abcdef")).toBe(
      "#123456",
    );
  });

  it("takes part of the accent at a peak that crosses the glyph", () => {
    const peak = shimmerFrame(4);
    const at = peak.alphas.indexOf(peak.peak) / (peak.alphas.length - 1);
    const lit = shimmerInk(peak, at, "#000000", "#ffffff");

    expect(lit).not.toBe("#000000");
    expect(lit).not.toBe("#ffffff");
  });

  it("inks a text run per glyph, in reading order", () => {
    const lines = shimmerLines(
      "Shop it",
      "#000000",
      "#ffffff",
      shimmerFrame(4),
    );
    const colors = lines.flatMap((line) =>
      line.words.flatMap((word) => word.glyphs.map((glyph) => glyph.color)),
    );
    const glyphs = lines.flatMap((line) =>
      line.words.flatMap((word) => word.glyphs.map((glyph) => glyph.text)),
    );

    expect(glyphs.join("")).toBe("Shopit");
    expect(new Set(colors).size).toBeGreaterThan(1);
  });
});

describe("shimmerInterval", () => {
  it("divides a sweep into its frames", () => {
    expect(shimmerInterval(2_000, 16)).toBe(125);
  });

  it("never returns a zero interval (negative control)", () => {
    expect(shimmerInterval(0)).toBe(125);
    expect(shimmerInterval(Number.NaN)).toBe(125);
    expect(shimmerInterval(1)).toBeGreaterThanOrEqual(1);
  });
});

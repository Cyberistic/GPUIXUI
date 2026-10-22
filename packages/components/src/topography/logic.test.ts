/**
 * The contour field's arithmetic, without a window.
 *
 * The bugs these guard: a map that reshuffles between two identical renders; a
 * seed that changes nothing; straight rules that still wander (an amplitude of
 * zero is a decision); a spacing so fine it generates thousands of lines, or one
 * so wide the field is a single rule; a box that has not been laid out yet still
 * generating geometry at the origin; and an override the renderer would refuse.
 */

import { describe, expect, it } from "vitest";
import {
  topographyAmplitude,
  topographyAmplitudeOf,
  topographyField,
  topographyMaxAmplitude,
  topographyMaxLines,
  topographyMaxStroke,
  topographySeed,
  topographySpacing,
  topographySpacingOf,
  topographyStroke,
  topographyStrokeOf,
} from "./logic.js";

/** Every sampled point's y, in command order. */
const ys = (markup: string): ReadonlyArray<number> =>
  Array.from(markup.matchAll(/[ML] [\d.]+ ([\d.]+)/g), (match) =>
    Number(match[1]),
  );

describe("the contour field", () => {
  it("generates one path in a view box the size of the box", () => {
    const field = topographyField({
      width: 300,
      height: 200,
      spacing: 32,
      amplitude: 8,
      stroke: 1,
      seed: 1,
    });

    expect(field.markup).toContain('viewBox="0 0 300 200"');
    expect(field.markup.match(/<path /g)).toHaveLength(1);
    expect(field.lines).toBe(8);
    expect(field.markup.split("M ").length - 1).toBe(8);
  });

  it("paints the same map for the same seed and settings", () => {
    const field = {
      width: 420,
      height: 260,
      spacing: 32,
      amplitude: 8,
      stroke: 1,
      seed: 7,
    };
    expect(topographyField(field).markup).toBe(topographyField(field).markup);
  });

  it("gives two seeds two maps", () => {
    const field = {
      width: 420,
      height: 260,
      spacing: 32,
      amplitude: 8,
      stroke: 1,
    };
    expect(topographyField({ ...field, seed: 1 }).markup).not.toBe(
      topographyField({ ...field, seed: 2 }).markup,
    );
  });

  it("honours a zero amplitude as straight rules", () => {
    const field = topographyField({
      width: 300,
      height: 200,
      spacing: 32,
      amplitude: 0,
      stroke: 1,
      seed: 1,
    });

    const bases = Array.from({ length: 8 }, (_, line) => line * 32);
    const sampled = ys(field.markup);
    expect(sampled).toHaveLength(8 * 31);
    // Each line's points share its own base; the lines are not all at zero.
    bases.forEach((base, line) => {
      const run = sampled.slice(line * 31, (line + 1) * 31);
      expect(run.every((y) => y === base)).toBe(true);
    });
  });

  it("bounds the line count by growing the spacing", () => {
    const field = topographyField({
      width: 400,
      height: 6_000,
      spacing: 12,
      amplitude: 8,
      stroke: 1,
      seed: 1,
    });

    expect(field.spacing).toBeGreaterThan(12);
    expect(field.lines).toBeLessThanOrEqual(topographyMaxLines);
  });

  it("falls back from a spacing, amplitude or stroke the renderer cannot paint", () => {
    expect(topographySpacingOf(Number.NaN)).toBe(topographySpacing);
    expect(topographySpacingOf(-2)).toBe(topographySpacing);
    expect(topographySpacingOf(1)).toBe(12);
    expect(topographySpacingOf(10_000)).toBe(120);

    expect(topographyAmplitudeOf(Number.POSITIVE_INFINITY)).toBe(
      topographyAmplitude,
    );
    expect(topographyAmplitudeOf(-1)).toBe(topographyAmplitude);
    expect(topographyAmplitudeOf(1_000)).toBe(topographyMaxAmplitude);

    expect(topographyStrokeOf(0)).toBe(topographyStroke);
    expect(topographyStrokeOf(0.1)).toBe(0.5);
    expect(topographyStrokeOf(100)).toBe(topographyMaxStroke);

    expect(
      topographyField({
        width: 300,
        height: 200,
        spacing: 32,
        amplitude: 8,
        stroke: 100,
        seed: 1,
      }).markup,
    ).toContain(`stroke-width="${topographyMaxStroke}"`);
  });

  it("falls back to the house seed for an unreadable seed", () => {
    const field = {
      width: 300,
      height: 200,
      spacing: 32,
      amplitude: 8,
      stroke: 1,
    };
    expect(topographyField({ ...field, seed: Number.NaN }).markup).toBe(
      topographyField({ ...field, seed: topographySeed }).markup,
    );
  });

  it("paints nothing before the box has a size", () => {
    expect(
      topographyField({
        width: 0,
        height: 200,
        spacing: 32,
        amplitude: 8,
        stroke: 1,
        seed: 1,
      }),
    ).toEqual({ markup: "", lines: 0, spacing: 32 });
  });
});

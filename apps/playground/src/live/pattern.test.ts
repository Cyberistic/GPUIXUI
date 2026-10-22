/**
 * Guards the generated geometry `svg-pattern` asserts against.
 *
 * A live run costs a window, so a mistake in the fixture would be reported as a
 * runtime defect (`expected 140 ± 4, got 200`) rather than as the stale
 * constant it is. Each case here holds one half of the probe's model:
 *
 * 1. two shapes sharing a tint, which would report one ink box around both;
 * 2. a fraction that does not match the path the markup actually strokes, so
 *    the scaling check would assert a box the renderer never painted;
 * 3. an overhang that no longer runs past the view box, which would turn the
 *    clipping check into a tautology;
 * 4. a comb path whose subpath count disagrees with the samples, so "every
 *    stroke painted" could pass on a path that lost its tail.
 *
 * `node:fs` is deliberate, as in `registry.test.ts`: the last case checks the
 * README's check count against the steps' assertion sites, which is repository
 * Markdown rather than a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Order from "effect/Order";
import { describe, expect, it } from "vitest";
import {
  COMB,
  COMB_SIZE,
  OVERHANG,
  OVERHANG_SIZE,
  PATTERN_SHAPES,
  PATTERN_TINTS,
  SQUARE,
  SQUARE_RESIZED_BOX,
  SQUARE_BOX,
  TALL,
  TILE,
  WIDE,
  combCentre,
  combPoints,
  combSvg,
  logicalRegion,
  overhangFraction,
  overhangSvg,
  patternReadout,
  shapeSvg,
  shapeTint,
  squareFraction,
  squareSvg,
  patternScale,
  strokeWeight,
  wideSvg,
} from "./pattern.js";

/** How many subpaths a markup's `d` attribute carries. */
const subpaths = (markup: string): number =>
  Arr.length(Arr.fromIterable(markup.matchAll(/M /g)));

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

/** The probe's steps, from their declaration to the body table that ends it. */
const steps = (() => {
  const start = scenarios.indexOf("const svgPatternSteps");
  if (start === -1) return "";
  const end = scenarios.indexOf("\n/** The bodies", start);
  return scenarios.slice(start, end === -1 ? scenarios.length : end);
})();

/** The count the README prints for this probe, if any. */
const printedCheckCount = (): number =>
  Number(/(\d+) checks, `--only svg-pattern`/.exec(readme)?.[1] ?? Number.NaN);

describe("the pattern fixture", () => {
  it("gives every shape its own tint so one capture reads one ink box", () => {
    const hexes = Arr.map(PATTERN_SHAPES, shapeTint);
    expect(Arr.dedupe(hexes)).toHaveLength(PATTERN_SHAPES.length);
    expect(PATTERN_TINTS.square).toEqual({ r: 0xff, g: 0x3d, b: 0xd7 });
  });

  it("writes the square its fraction is computed from", () => {
    // (100 − 2×20) + 10 = 70 view-box units of ink, half the 10-unit stroke
    // reaching past each of the path's edges.
    expect(squareFraction()).toBeCloseTo(0.7, 10);
    expect(squareSvg()).toContain(
      `M ${SQUARE.inset} ${SQUARE.inset} H ${TILE - SQUARE.inset} V ${TILE - SQUARE.inset}`,
    );
    expect(squareSvg()).toContain(`stroke-width="${SQUARE.stroke}"`);
    expect(SQUARE_BOX).toEqual({ width: 200, height: 200 });
    expect(SQUARE_RESIZED_BOX).toEqual({ width: 300, height: 100 });
  });

  it("draws the overhang past both view-box edges", () => {
    expect(OVERHANG.from).toBeLessThan(0);
    expect(OVERHANG.to).toBeGreaterThan(TILE);
    expect(overhangSvg()).toContain(
      `M ${OVERHANG.from} ${OVERHANG.y} H ${OVERHANG.to}`,
    );
    expect(overhangSvg()).toContain(`stroke-width="${OVERHANG.stroke}"`);
    expect(overhangFraction()).toBeCloseTo(0.2, 10);
    expect(OVERHANG_SIZE).toBe(200);
  });

  it("scales a view box by its element's width alone", () => {
    expect(patternScale(WIDE.width)).toBe(3);
    expect(patternScale(TALL.width)).toBe(1);
    expect(patternScale(OVERHANG_SIZE)).toBe(2);
    // The two boxes separate the width's scale from the height's: a stroke is
    // 30 points in the 300-wide box and 10 in the 200-tall one.
    expect(strokeWeight(WIDE.stroke, WIDE.width)).toBe(30);
    expect(strokeWeight(TALL.stroke, TALL.width)).toBe(10);
    expect(wideSvg()).toContain(`M 0 ${OVERHANG.y} H ${TILE}`);
  });

  it("generates one subpath per comb stroke, inside the view box", () => {
    expect(subpaths(combSvg())).toBe(COMB.strokes);
    expect(Arr.length(Arr.fromIterable(combSvg().matchAll(/<path /g)))).toBe(1);
    const centres = Arr.map(Arr.range(0, COMB.strokes - 1), combCentre);
    expect(Arr.sort(centres, Order.Number)).toEqual(centres);
    expect(
      Arr.every(
        centres,
        (centre) =>
          centre - COMB.stroke / 2 >= 0 &&
          centre + COMB.stroke / 2 <= COMB.viewBox.width,
      ),
    ).toBe(true);
    // The tail keeps the same margin as a gap: one pitch less the stroke.
    expect(
      COMB.viewBox.width - (combCentre(COMB.strokes - 1) + COMB.stroke / 2),
    ).toBe(COMB.pitch - COMB.stroke);
    expect(COMB_SIZE).toEqual({ width: 480, height: 160 });
  });

  it("puts every comb sample inside the box it is read from", () => {
    const origin = { x: 40, y: 360 };
    const points = combPoints(origin);
    expect(points).toHaveLength(COMB.strokes);
    expect(points[0]).toEqual({
      x: origin.x + (COMB.stroke / 2) * COMB.scale,
      y: origin.y + ((COMB.top + COMB.bottom) / 2) * COMB.scale,
    });
    expect(
      Arr.every(
        points,
        (point) =>
          point.x > origin.x &&
          point.x < origin.x + COMB_SIZE.width &&
          point.y > origin.y &&
          point.y < origin.y + COMB_SIZE.height,
      ),
    ).toBe(true);
  });

  it("converts a capture region into the window's logical points", () => {
    expect(logicalRegion({ x: 80, y: 20, width: 280, height: 40 }, 2)).toEqual({
      x: 40,
      y: 10,
      width: 140,
      height: 20,
    });
    expect(logicalRegion({ x: 40, y: 10, width: 140, height: 20 }, 1)).toEqual({
      x: 40,
      y: 10,
      width: 140,
      height: 20,
    });
  });

  it("prints the box a press switches to", () => {
    expect(patternReadout(SQUARE_BOX)).toBe("size=200x200");
    expect(patternReadout(SQUARE_RESIZED_BOX)).toBe("size=300x100");
    expect(shapeSvg("comb")).toBe(combSvg());
  });

  it("prints the check count the probe actually asserts", () => {
    // Three producers: a direct `ctx.expect*` call, `paintedBox` (which asserts
    // the element paints before handing its box back) and `patternInk` (which
    // asserts the shape's tint is in the frame), the last reached through the
    // `ink` shorthand for the first-frame shapes.
    const asserted =
      Arr.length(Arr.fromIterable(steps.matchAll(/ctx\.expect[A-Za-z]+\(/g))) +
      Arr.length(Arr.fromIterable(steps.matchAll(/paintedBox\(/g))) +
      Arr.length(Arr.fromIterable(steps.matchAll(/\bink\(/g))) +
      Arr.length(Arr.fromIterable(steps.matchAll(/yield\* patternInk\(/g)));
    expect(asserted).toBeGreaterThan(1);
    expect(printedCheckCount()).toBe(asserted);
  });
});

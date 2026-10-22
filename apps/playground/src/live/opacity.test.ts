/**
 * Holds the arithmetic the `opacity-paint` probe reads a frame with, and the
 * claims its README section prints.
 *
 * The probe's strongest check is a prediction: a half-opacity box should paint
 * the fill's channel and the page's added at the share, and the frame is allowed
 * one byte because it stores one. That prediction is easy to get subtly wrong in
 * either direction — a mix with the operands swapped reads the page at 0.5 too,
 * and a tolerance wide enough for comfort would pass a box at 0.4. The drawn
 * cases below hold both ends of that.
 *
 * `node:fs` is deliberate, as in `registry.test.ts`: this checks the repository's
 * own probe and prose, not a runtime path.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { liveRegistry } from "./registry.js";
import {
  mixedAt,
  OPACITY_ABOVE_ONE,
  OPACITY_FILL,
  OPACITY_HALF,
  OPACITY_HEIGHT,
  OPACITY_IDS,
  OPACITY_INK,
  OPACITY_QUARTER,
  OPACITY_SHADOW,
  OPACITY_WIDTH,
  withinBytes,
} from "./opacity.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

/** The section this probe's README heading opens. */
const section = (() => {
  const heading = "### `opacity-paint` — measured on 0.11.0 here";
  const start = readme.indexOf(heading);
  if (start === -1) return "";
  const end = readme.indexOf("\n### ", start + 1);
  const next = readme.indexOf("\n## ", start + 1);
  const stops = [end, next].filter((at) => at > start);
  return readme.slice(
    start,
    stops.length === 0 ? readme.length : Math.min(...stops),
  );
})();

/** The `opacitySteps` effect, bounded by the first declaration after it. */
const steps = (() => {
  const start = scenarios.indexOf("const opacitySteps");
  if (start === -1) return "";
  const after = [
    scenarios.indexOf("\nconst ", start + 1),
    scenarios.indexOf("\nexport const ", start + 1),
    scenarios.indexOf("\n/** The bodies", start + 1),
  ].filter((end) => end > start);
  return scenarios.slice(
    start,
    after.length === 0 ? scenarios.length : Math.min(...after),
  );
})();

const PAGE = { r: 17, g: 20, b: 26 };
const FILL = { r: 255, g: 59, b: 48 };

describe("the opacity-paint reader", () => {
  it("adds a fill and a page at the share it is given", () => {
    expect(mixedAt(FILL, PAGE, OPACITY_HALF)).toEqual({
      r: 136,
      g: 39.5,
      b: 37,
    });
    expect(mixedAt(FILL, PAGE, OPACITY_QUARTER)).toEqual({
      r: 76.5,
      g: 29.75,
      b: 31.5,
    });
    // The ends: none of the page, all of the page.
    expect(mixedAt(FILL, PAGE, 1)).toEqual(FILL);
    expect(mixedAt(FILL, PAGE, 0)).toEqual(PAGE);
  });

  it("accepts the byte a frame rounds and refuses a box at another share", () => {
    // The values the window painted: a half box reads 136,39,37 and a quarter
    // 76,30,31, so the frame's own conversion is what the tolerance covers.
    expect(
      withinBytes({ r: 136, g: 39, b: 37 }, mixedAt(FILL, PAGE, 0.5)),
    ).toBe(true);
    expect(
      withinBytes({ r: 76, g: 30, b: 31 }, mixedAt(FILL, PAGE, 0.25)),
    ).toBe(true);
    // A box painted at 0.4 where 0.5 was asked is 24 bytes out on red, and one
    // with the operands swapped asks the page for the fill and the fill for the
    // page — a different colour at any share but one half.
    const atForty = mixedAt(FILL, PAGE, 0.4);
    expect(withinBytes(atForty, mixedAt(FILL, PAGE, 0.5))).toBe(false);
    expect(
      withinBytes(mixedAt(PAGE, FILL, 0.25), mixedAt(FILL, PAGE, 0.25)),
    ).toBe(false);
  });
});

describe("the opacity-paint fixture", () => {
  it("registers one probe over the content capability", () => {
    expect(
      liveRegistry.filter((probe) => probe.id === "opacity-paint"),
    ).toEqual([
      {
        id: "opacity-paint",
        title: expect.stringContaining("opacity"),
        capability: "content",
      },
    ]);
    expect(Object.values(OPACITY_IDS)).toHaveLength(10);
  });

  it("asks for each share the checks read", () => {
    expect(scenarios).toContain("box(OPACITY_HALF)");
    expect(scenarios).toContain("box(OPACITY_QUARTER)");
    expect(scenarios).toContain("box(OPACITY_ABOVE_ONE)");
    expect(OPACITY_HALF).toBe(0.5);
    expect(OPACITY_QUARTER).toBe(0.25);
    expect(OPACITY_ABOVE_ONE).toBeGreaterThan(1);
    // The ink and the shadow are colours no role paints, so a count of the one
    // and a sample of the other say what the box did rather than the theme.
    expect(OPACITY_INK).toBe("#FFD60A");
    expect(OPACITY_SHADOW).toBe("#0A84FF");
    expect(OPACITY_FILL).toBe("#FF3B30");
  });

  it("fits its rows inside the window the live runner opens", () => {
    // Five boxes and four 40-point gaps in one row, inside the page's 16-point
    // inset each side; a box pushed past the frame would be read from the page.
    expect(OPACITY_WIDTH * 5 + 40 * 4).toBeLessThan(900 - 32);
    expect(OPACITY_HEIGHT).toBeLessThan(150);
  });
});

describe("the opacity-paint probe's record", () => {
  it("documents it under the version it was measured on", () => {
    expect(section).not.toBe("");
    expect(section).toContain("--only opacity-paint");
  });

  it("prints the check count the steps assert", () => {
    const asserted = steps.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0;
    expect(asserted).toBeGreaterThan(10);
    const printed = Number(
      /(\d+) checks, `--only opacity-paint`/.exec(section)?.[1] ?? Number.NaN,
    );
    expect(printed).toBe(asserted);
  });

  it("prints the values the frame read", () => {
    expect(section).toContain("`136,39,37`");
    expect(section).toContain("`76,30,31`");
    expect(section).toContain("`1091`");
    expect(section).toContain("`13,76,140`");
    expect(section).toContain("`17,20,26`");
  });
});

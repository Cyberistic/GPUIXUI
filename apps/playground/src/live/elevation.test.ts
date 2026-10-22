/**
 * Holds the arithmetic the `elevation-paint` probe reads a frame with, and the
 * claims its README section prints.
 *
 * Three things decide the whole probe and none is visible from a passing run:
 * the sample points are a fixed distance from an edge (a box that moved would
 * sample the page and read as "no shadow"), the page a shadow falls on is the
 * role the fixture paints (a probe comparing against a literal would pass while
 * the theme repainted), and the shipped level's shade is a handful of bytes
 * (which a tolerance compares as "the same paint", so the level check uses
 * `distanceFrom` instead). The drawn cases below make each failure visible.
 *
 * `node:fs` is deliberate, as in `registry.test.ts`: this checks the repository's
 * own probe and prose, not a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { Pixels } from "@gpuixui/testing";
import { palettes } from "../palettes.js";
import {
  COLOUR_TOLERANCE,
  colourAt,
  differs,
  distanceFrom,
  framePoint,
} from "./frame.js";
import { liveRegistry } from "./registry.js";
import {
  aroundBox,
  ELEVATION_BLUR,
  ELEVATION_DEPTH,
  ELEVATION_FADE_MID,
  ELEVATION_FADE_NEAR,
  ELEVATION_FAR,
  ELEVATION_FILL,
  ELEVATION_HEIGHT,
  ELEVATION_IDS,
  ELEVATION_INSIDE,
  ELEVATION_OFFSET,
  ELEVATION_RAISED,
  ELEVATION_ROW,
  ELEVATION_SECOND,
  ELEVATION_SHADOW,
  ELEVATION_SPREAD,
  ELEVATION_UNREADABLE,
  ELEVATION_WIDTH,
  type ShadowBox,
} from "./elevation.js";

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
  const heading = "### `elevation-paint` — measured on 0.11.0 here";
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

/** The `elevationSteps` effect, bounded by the first declaration after it. */
const steps = (() => {
  const start = scenarios.indexOf("const elevationSteps");
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

/** A 24×20 frame of the page colour, with one shadow-coloured pixel at (4, 4). */
const frame = (): Pixels.Pixels => {
  const width = 24;
  const height = 20;
  const page = new Pixels.Rgba({ r: 17, g: 20, b: 26, a: 255 });
  const shadow = new Pixels.Rgba({ r: 255, g: 59, b: 48, a: 255 });
  const data = Arr.flatMap(Arr.range(0, height - 1), (y) =>
    Arr.flatMap(Arr.range(0, width - 1), (x) => {
      const colour = x === 4 && y === 4 ? shadow : page;
      return [colour.r, colour.g, colour.b, colour.a];
    }),
  );
  return new Pixels.Pixels({ width, height, data: Uint8Array.from(data) });
};

const PAGE = new Pixels.Rgba({ r: 17, g: 20, b: 26, a: 255 });

/** An `Option` the drawn frame guarantees, as a value a test can read. */
const someOf = <A>(value: Option.Option<A>): A =>
  Option.match(value, {
    onNone: () => {
      throw new Error("the drawn frame carries what the reader asked for");
    },
    onSome: (found) => found,
  });

/** A shade the shipped level paints: five to eight bytes from the page. */
const LEVEL_SHADE = new Pixels.Rgba({ r: 12, g: 14, b: 18, a: 255 });

describe("the elevation-paint reader", () => {
  it("samples the frame at a logical point, and reports a point outside it", () => {
    const shadow = someOf(colourAt(frame(), { x: 4, y: 4 }, 1));
    expect([shadow.r, shadow.g, shadow.b]).toEqual([255, 59, 48]);
    expect(colourAt(frame(), { x: 40, y: 4 }, 1)).toEqual(Option.none());
    // The capture is device-scaled, so a logical point converts first.
    expect(someOf(colourAt(frame(), { x: 2, y: 2 }, 2)).r).toBe(255);
  });

  it("compares a level's shade as the same paint at a tolerance and as a different one by distance", () => {
    // The premise of the two level checks: a shipped level's composited shade is
    // a few bytes, which the tolerance every colour comparison uses calls "the
    // same", so "it paints" is measured as a non-zero distance instead.
    expect(differs(LEVEL_SHADE, PAGE)).toBe(false);
    expect(distanceFrom(LEVEL_SHADE, PAGE)).toBe(19);
    expect(distanceFrom(PAGE, PAGE)).toBe(0);
    // The shade is real: the sum of its channel gaps is wider than the tolerance
    // that calls it "the same colour", which is why the level reads a distance.
    expect(distanceFrom(LEVEL_SHADE, PAGE)).toBeGreaterThan(COLOUR_TOLERANCE);
  });

  it("places a sample the distance it is given outside each side of a box", () => {
    const box: ShadowBox = { x: 10, y: 20, width: 100, height: 40 };
    expect(aroundBox(box, 4)).toEqual({
      above: 16,
      below: 64,
      left: 6,
      right: 114,
      middleX: 60,
      middleY: 40,
    });
  });

  it("converts a logical point into the capture's own pixels", () => {
    expect(framePoint({ x: 3, y: 5 }, 2)).toEqual({ x: 6, y: 10 });
  });
});

describe("the elevation-paint fixture", () => {
  it("registers one probe over the content capability", () => {
    expect(
      liveRegistry.filter((probe) => probe.id === "elevation-paint"),
    ).toEqual([
      {
        id: "elevation-paint",
        title: expect.stringContaining("box shadow"),
        capability: "content",
      },
    ]);
    expect(Object.values(ELEVATION_IDS)).toHaveLength(9);
  });

  it("samples the page the fixture paints, not a literal", () => {
    // The steps compare against the theme's background role and the view paints
    // that same role, so a repainted palette moves both.
    expect(steps).toContain("palettes.dark.colors.background");
    expect(scenarios).toContain("backgroundColor: theme.colors.background");
    expect(palettes.dark.colors.background).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });

  it("keeps every shadow sample inside the cell its row reserves", () => {
    // A box sits at its row's top and the farthest sample is ELEVATION_FAR below
    // it, so the row must be taller than that point: a sample past the row would
    // land on the next row's box and read its fill as shade.
    expect(ELEVATION_HEIGHT + ELEVATION_FAR).toBeLessThan(ELEVATION_ROW);
    expect(ELEVATION_RAISED.height).toBeLessThan(ELEVATION_ROW);
    // The level sample sits under the box rather than inside its fill.
    expect(ELEVATION_DEPTH).toBeGreaterThan(0);
    expect(ELEVATION_FADE_NEAR).toBeLessThan(ELEVATION_FADE_MID);
    expect(ELEVATION_FADE_MID).toBeLessThan(ELEVATION_FAR);
    expect(scenarios).toContain("height: ELEVATION_ROW");
  });

  it("fits its widest row inside the window the live runner opens", () => {
    // Four boxes and three 60-point gaps, inside the page's 16-point inset each
    // side; a box pushed past the frame would be read from the wrong point.
    expect(ELEVATION_WIDTH * 4 + 60 * 3).toBeLessThan(900 - 32);
    expect(ELEVATION_UNREADABLE).toBe("notacolour");
    // Two entries, two colours: the list check reads a different one on each side.
    expect(ELEVATION_SECOND).not.toBe(ELEVATION_SHADOW);
  });

  it("asks the runtime for each property the section prints", () => {
    expect(scenarios).toContain("inset: true");
    expect(scenarios).toContain("blurRadius: ELEVATION_BLUR");
    expect(scenarios).toContain("spreadRadius: ELEVATION_SPREAD");
    expect(scenarios).toContain("color: ELEVATION_UNREADABLE");
    expect(scenarios).toContain("color: ELEVATION_SECOND");
    expect(scenarios).toContain("elevationShadow(theme, level)");
    expect(scenarios).toContain("ELEVATION_RAISED");
    // The numbers the section prints are the fixture's, not a second copy.
    expect(ELEVATION_OFFSET).toBe(16);
    expect(ELEVATION_BLUR).toBe(24);
    expect(ELEVATION_SPREAD).toBe(8);
    expect(ELEVATION_INSIDE).toBe(4);
    expect(ELEVATION_FILL).toBe("#E7E9EE");
    expect(ELEVATION_SHADOW).toBe("#FF3B30");
  });
});

describe("the elevation-paint probe's record", () => {
  it("documents it under the version it was measured on", () => {
    expect(section).not.toBe("");
    expect(section).toContain("--only elevation-paint");
  });

  it("prints the check count the steps assert", () => {
    const asserted = steps.match(/ctx\.expect[A-Za-z]+\(/g)?.length ?? 0;
    expect(asserted).toBeGreaterThan(20);
    const printed = Number(
      /(\d+) checks, `--only elevation-paint`/.exec(section)?.[1] ?? Number.NaN,
    );
    expect(printed).toBe(asserted);
  });

  it("prints the values the frame read", () => {
    // Each measurement the table states, so a re-run that reads something else
    // fails the sentence instead of leaving prose behind the paint.
    expect(section).toContain("`6608`");
    expect(section).toContain("`115,36,35`");
    expect(section).toContain("`74,29,31`");
    expect(section).toContain("`22,21,26`");
    expect(section).toContain("`12,14,18`");
    expect(section).toContain("`17,20,26`");
    expect(section).toContain("220×120");
  });
});

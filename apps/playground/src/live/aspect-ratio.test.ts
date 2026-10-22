/**
 * Holds the arithmetic the `aspect-ratio-paint` probe reads a window with, and
 * the claims its README section prints.
 *
 * The probe's whole answer is one pair of numbers per box, and both are easy to
 * get backwards: `aspectRatio` is width ÷ height, so a definite width divides
 * and a definite height multiplies, and a ratio below one makes the box taller
 * than it is wide rather than "smaller". The cases table below is the fixture's
 * expectation, so a probe that stops asking for one axis fails here before a
 * window is opened.
 *
 * `node:fs` is deliberate, as in `registry.test.ts`: this checks the
 * repository's own probe and prose, not a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { Order } from "effect";
import { describe, expect, it } from "vitest";
import {
  ASPECT_CASES,
  ASPECT_COLUMN_WIDTH,
  ASPECT_HEIGHT,
  ASPECT_IDS,
  ASPECT_PORTRAIT_RATIO,
  ASPECT_PORTRAIT_WIDTH,
  ASPECT_RATIO,
  ASPECT_ROW_HEIGHT,
  ASPECT_WIDTH,
  heightForWidth,
  widthForHeight,
} from "./aspect-ratio.js";
import { liveRegistry } from "./registry.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

/** The `aspectRatioSteps` effect, bounded by the first declaration after it. */
const steps = (() => {
  const start = scenarios.indexOf("const aspectRatioSteps");
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

describe("the aspect-ratio arithmetic", () => {
  it("derives a height from a width and a width from a height", () => {
    expect(heightForWidth(ASPECT_WIDTH, ASPECT_RATIO)).toBe(80);
    expect(widthForHeight(ASPECT_HEIGHT, ASPECT_RATIO)).toBe(120);
  });

  it("reads a ratio below one as a portrait box", () => {
    // A 0.5 ratio is not "half size": the width stays 100 and the height
    // doubles, which is the direction a thumbnail or a book cover needs.
    expect(heightForWidth(ASPECT_PORTRAIT_WIDTH, ASPECT_PORTRAIT_RATIO)).toBe(
      200,
    );
    expect(widthForHeight(ASPECT_PORTRAIT_WIDTH, ASPECT_PORTRAIT_RATIO)).toBe(
      50,
    );
  });

  it("builds one expectation per box from the constants it asks for", () => {
    expect(ASPECT_CASES).toEqual([
      { id: ASPECT_IDS.width, width: 160, height: 80, derives: "height" },
      { id: ASPECT_IDS.portrait, width: 100, height: 200, derives: "height" },
      { id: ASPECT_IDS.height, width: 120, height: 60, derives: "width" },
      { id: ASPECT_IDS.both, width: 160, height: 60, derives: "neither" },
      {
        id: ASPECT_IDS.column,
        width: ASPECT_COLUMN_WIDTH,
        height: 120,
        derives: "height",
      },
      {
        id: ASPECT_IDS.row,
        width: 0,
        height: ASPECT_ROW_HEIGHT,
        derives: "neither",
      },
    ]);
    expect(new Set(Arr.map(ASPECT_CASES, (box) => box.id)).size).toBe(
      ASPECT_CASES.length,
    );
    // Every axis answer is covered: a ratio that only ever derived a height
    // would leave the definite-height and stretch cases unmeasured.
    expect(
      Arr.sort(
        Arr.map(ASPECT_CASES, (box) => box.derives),
        Order.String,
      ),
    ).toEqual(["height", "height", "height", "neither", "neither", "width"]);
  });
});

describe("the aspect-ratio-paint probe's record", () => {
  it("registers the probe and its capability", () => {
    expect(
      liveRegistry.filter((probe) => probe.id === "aspect-ratio-paint"),
    ).toEqual([
      {
        id: "aspect-ratio-paint",
        title: expect.stringContaining("aspect ratio"),
        capability: "layout",
      },
    ]);
    expect(Object.values(ASPECT_IDS)).toHaveLength(8);
  });

  it("documents it under the version it was measured on", () => {
    expect(readme).toContain(
      "### `aspect-ratio-paint` — measured on 0.11.0 here",
    );
  });

  it("prints the number of checks the probe asserts", () => {
    // The steps assert the width and height of every case plus the two
    // container comparisons, so the printed total is derived from the table
    // rather than hand-maintained beside it.
    const printed = Number(
      /(\d+) checks, `--only aspect-ratio-paint`/.exec(readme)?.[1] ??
        Number.NaN,
    );
    expect(printed).toBe(ASPECT_CASES.length * 2 + 2);
    expect(steps).toContain("box.width");
    expect(steps).toContain("box.height");
  });

  it("asks the fixture for every property the section teaches", () => {
    // The section says which properties it measured; a fixture that stopped
    // asking for one would leave the sentence claiming a paint nobody asked
    // for. The reads below are the source's own expressions, not a copy.
    expect(scenarios).toContain("aspectRatio: ASPECT_RATIO");
    expect(scenarios).toContain("aspectRatio: ASPECT_PORTRAIT_RATIO");
    expect(scenarios).toContain("width: ASPECT_WIDTH");
    expect(scenarios).toContain("height: ASPECT_HEIGHT");
    expect(scenarios).toContain("width: ASPECT_COLUMN_WIDTH");
    expect(scenarios).toContain("height: ASPECT_ROW_HEIGHT");
    const boxes = [
      "width",
      "portrait",
      "height",
      "both",
      "column",
      "row",
    ] as const;
    Arr.forEach(boxes, (key) => {
      expect(scenarios).toContain(`box(ASPECT_IDS.${key},`);
    });
    expect(scenarios).toContain("testId={ASPECT_IDS.columnParent}");
    expect(scenarios).toContain("testId={ASPECT_IDS.rowParent}");
  });

  it("prints the geometry the fixture expects, not a remembered one", () => {
    // The README table is the evidence a reader cites; each row is held to the
    // case it describes, so a changed constant fails the sentence that prints
    // the old box.
    Arr.forEach(ASPECT_CASES, (box) => {
      const printed = new RegExp(
        `\\|\\s*\\\`${box.id}\\\`[^\\n]*?\\*\\*${box.width}×${box.height}\\*\\*`,
      );
      expect(readme).toMatch(printed);
    });
    expect(readme.replace(/\s+/g, " ")).toMatch(
      /a child stretched by a column/i,
    );
    expect(readme.replace(/\s+/g, " ")).toMatch(/a child stretched by a row/i);
  });
});

describe("the aspect-ratio case table is what the probe walks", () => {
  it("reads one box per case and both container comparisons", () => {
    expect(steps).toContain("Effect.forEach(ASPECT_CASES");
    expect(steps).toContain("expectation.width");
    expect(steps).toContain("expectation.height");
    expect(steps).toContain("ASPECT_IDS.column");
    expect(steps).toContain("ASPECT_IDS.columnParent");
    expect(steps).toContain("ASPECT_IDS.row");
    expect(steps).toContain("ASPECT_IDS.rowParent");
    expect(steps).not.toContain("ASPECT_CASES[");
  });

  it("keeps the probes' ids apart", () => {
    const ids = new Set<string>(Arr.map(liveRegistry, (probe) => probe.id));
    expect(ids.has("aspect-ratio-paint")).toBe(true);
    expect(
      Arr.filter(
        Arr.map(ASPECT_CASES, (box) => box.id),
        (id) => ids.has(id),
      ),
    ).toEqual([]);
    expect(
      Arr.filter(liveRegistry, (probe) => probe.capability === "layout").length,
    ).toBeGreaterThan(1);
  });
});

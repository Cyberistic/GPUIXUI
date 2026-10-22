/**
 * Holds the geometry the `image-box` probe reads a window with, and the claims
 * its README section prints.
 *
 * The one number that decides the probe is the bitmap's own ratio: the fixture's
 * data URL is an 8×8 square, so the loaded image asks for a height equal to a
 * definite width, while the style's `aspectRatio: 2` asks for half of it. A
 * window is the only place to see which wins, and the cases below are what the
 * probe asserts it saw.
 *
 * `node:fs` is deliberate, as in `registry.test.ts`: this checks the
 * repository's own probe and prose, not a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import { describe, expect, it } from "vitest";
import {
  IMAGE_BOX_CASES,
  IMAGE_BOX_IDS,
  IMAGE_HEIGHT,
  IMAGE_INTRINSIC_SIZE,
  IMAGE_RATIO,
  IMAGE_WIDTH,
  heightAtBitmapRatio,
} from "./image-box.js";
import { liveRegistry } from "./registry.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const scenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

/** The `imageBoxSteps` effect, bounded by the first declaration after it. */
const steps = (() => {
  const start = scenarios.indexOf("const imageBoxSteps");
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

describe("the image-box fixture", () => {
  it("uses the square bitmap's ratio for the width a style asks for", () => {
    expect(heightAtBitmapRatio(IMAGE_WIDTH)).toBe(120);
    expect(IMAGE_INTRINSIC_SIZE).toBe(8);
    // The style asks for twice the bitmap's ratio, so the two answers differ by
    // exactly the height the probe must be able to tell apart.
    expect(IMAGE_WIDTH / IMAGE_RATIO).toBe(60);
  });

  it("covers the intrinsic, style-ratio, width-only and both-definite cases", () => {
    expect(IMAGE_BOX_CASES).toEqual([
      { id: IMAGE_BOX_IDS.intrinsic, width: 8, height: 8 },
      { id: IMAGE_BOX_IDS.ratio, width: 120, height: 120 },
      { id: IMAGE_BOX_IDS.width, width: 120, height: 120 },
      { id: IMAGE_BOX_IDS.both, width: 120, height: IMAGE_HEIGHT },
    ]);
    expect(new Set(Arr.map(IMAGE_BOX_CASES, (box) => box.id)).size).toBe(
      IMAGE_BOX_CASES.length,
    );
  });
});

describe("the image-box probe's record", () => {
  it("registers the probe and its capability", () => {
    expect(liveRegistry.filter((probe) => probe.id === "image-box")).toEqual([
      {
        id: "image-box",
        title: expect.stringContaining("bitmap"),
        capability: "content",
      },
    ]);
  });

  it("documents it under the version it was measured on", () => {
    expect(readme).toContain("### `image-box` — measured on 0.11.0 here");
  });

  it("prints the number of checks the probe asserts", () => {
    // Two reads per case plus the three cross-checks and the intrinsic edge.
    const printed = Number(
      /(\d+) checks, `--only image-box`/.exec(readme)?.[1] ?? Number.NaN,
    );
    expect(printed).toBe(IMAGE_BOX_CASES.length * 2 + 4);
    expect(steps).toContain("box.width");
    expect(steps).toContain("box.height");
  });

  it("asks the fixture for every rule the section teaches", () => {
    expect(scenarios).toContain("src={IMAGE_DATA_URL}");
    expect(scenarios).toContain("aspectRatio: IMAGE_RATIO");
    expect(scenarios).toContain("width: IMAGE_WIDTH");
    expect(scenarios).toContain("height: IMAGE_HEIGHT");
    expect(steps).toContain("the style ratio is replaced");
    expect(steps).toContain("two definite dimensions keep the box");
    expect(steps).toContain("the loaded bitmap's own");
    expect(steps).toContain("intrinsic edge");
  });

  it("prints the geometry the fixture expects, not a remembered one", () => {
    Arr.forEach(IMAGE_BOX_CASES, (box) => {
      const printed = new RegExp(
        `\\|\\s*\\\`${box.id}\\\`[^\\n]*?\\*\\*${box.width}×${box.height}\\*\\*`,
      );
      expect(readme).toMatch(printed);
    });
  });
});

describe("the image-box case table is what the probe walks", () => {
  it("reads each case and settles the loaded bitmap before asserting", () => {
    expect(steps).toContain("Effect.forEach");
    expect(steps).toContain("IMAGE_BOX_CASES");
    expect(steps).toContain("settleUntil");
    // A bitmap arrives after the first layout, so a probe that read the mount
    // frame would measure an unsized image.
    expect(steps).toContain("found.width > 0 && found.height > 0");
    expect(steps).toContain("IMAGE_BOX_IDS.ratio");
    expect(steps).toContain("IMAGE_BOX_IDS.both");
    expect(steps).toContain("IMAGE_BOX_IDS.intrinsic");
  });

  it("keeps the probes' ids apart", () => {
    const ids = new Set<string>(Arr.map(liveRegistry, (probe) => probe.id));
    expect(ids.has("image-box")).toBe(true);
    expect(
      Arr.filter(
        Arr.map(IMAGE_BOX_CASES, (box) => box.id),
        (id) => ids.has(id),
      ),
    ).toEqual([]);
  });
});

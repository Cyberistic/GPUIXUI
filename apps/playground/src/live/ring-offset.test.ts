/**
 * Holds the arithmetic the `focus-ring-offset` probe samples and the claims it
 * prints.
 *
 * The bug this guards: an outline's sampled point is `outlineOffset +
 * outlineWidth / 2`, and a probe that samples the width alone measures the
 * theme's 2 pt line at offset 0 — the ring it is meant to distinguish from —
 * while a probe that samples the offset alone lands in the gap. Both look like
 * a painted ring in a sparse frame, so the measurement is held here without a
 * window.
 *
 * `node:fs` is deliberate, as in `field-ink.test.ts`: this reads the
 * repository's own probe and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import { getTheme } from "@gpuixui/tokens";
import { describe, expect, it } from "vitest";
import { liveRegistry } from "./registry.js";
import { bandPoint, leftOf, RING_OFFSET } from "./ring-offset.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const scenarios = read("./scenarios.tsx");
const readme = read("../../README.md");

const box = { x: 40, y: 20, width: 240, height: 40 };

describe("the point an outline is sampled at", () => {
  it("measures from the box edge at the middle of its height", () => {
    expect(leftOf(box, 1)).toEqual({ x: 39, y: 40 });
  });

  it("lands in the middle of a band that starts at the declared gap", () => {
    const line = getTheme("dark").borderWidth.strong;
    // Flush: the line's own width, so its middle is one point out.
    expect(bandPoint(box, 0, line)).toEqual({ x: 39, y: 40 });
    // Offset 2 plus a 2 pt line: the middle is three points out, not two.
    expect(bandPoint(box, RING_OFFSET, line)).toEqual({ x: 37, y: 40 });
  });

  it("follows a negative offset inside the box", () => {
    expect(bandPoint(box, -2, 2)).toEqual({ x: 41, y: 40 });
  });
});

describe("the probe's fixture", () => {
  it("separates the ring from the box by the width of the line", () => {
    // The gap and the line are both 2 pt, so a frame that confuses them reads
    // the wrong band rather than a plausible one.
    expect(RING_OFFSET).toBe(getTheme("dark").borderWidth.strong);
  });

  it("paints one flush sample and one at the declared offset", () => {
    const start = scenarios.indexOf("const FocusRingOffsetProbe");
    const probe = scenarios.slice(
      start,
      scenarios.indexOf("\n/** One sample with the runtime's default", start),
    );
    expect(probe).toContain('testId="ring-flush" offset={0}');
    expect(probe).toContain("offset={RING_OFFSET}");
  });
});

describe("the measurement the README prints", () => {
  it("records the offset, the gap and the layout proof", () => {
    expect(readme).toContain(
      "### `focus-ring-offset` — measured on 0.11.0 here",
    );
    expect(readme).toContain("`RING_OFFSET` 2");
    expect(readme).toContain("the point one point out is\n  the page");
    expect(readme).toContain("identical `x,y,width,height`");
  });

  it("names the negative control that fails when the offset is dropped", () => {
    expect(readme).toContain(
      "the ring is painted in the middle of the band the offset names",
    );
    expect(readme).toContain("`expected false, got true`, exit `1`");
  });

  it("registers the probe as a focus measurement", () => {
    expect(liveRegistry).toContainEqual({
      id: "focus-ring-offset",
      title:
        "Focus: an outline offset leaves a gap of the page and takes no layout space",
      capability: "focus",
    });
  });
});

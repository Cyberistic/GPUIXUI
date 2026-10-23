/**
 * Holds the `hover-routing-lifecycle` fixture and the claims it prints.
 *
 * The bug this guards: every list, table and tree row in the library paints its
 * pointer feedback through the runtime's native `style.hover`, and a Tier 3 row
 * nests a badge, a metric or a control inside it. The press rule was measured
 * (a painted child is the boundary a press stops at); the hover half was not,
 * and a fill between the pointer and the row can take the row's feedback away
 * without taking its press. The window measured that it does — the row misses
 * both the enter event and its hover fill — while an unfilled label and a
 * `pointerEvents: "none"` child leave both intact (the inert child still hears
 * its own listener, because opting out removes the fill's hitbox and not the
 * registered handler).
 *
 * `node:fs` is deliberate, as in `press-routing.test.ts`: this reads the
 * repository's own probe and prose, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import {
  decodeHoverCounts,
  formatHoverCounts,
  HOVER_CASES,
  HOVER_NESTINGS,
  HoverCounts,
  hoverCase,
  hoverChildId,
  hoverReadoutId,
  hoverRowId,
  pixelRegion,
} from "./hover-routing.js";
import { liveRegistry } from "./registry.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const probe = read("./hover-probe.tsx");
const readme = read("../../README.md");

describe("the counts a case's readout prints", () => {
  it("round-trips the three counts", () => {
    const counts = HoverCounts.make({ row: 2, child: 1, leave: 3 });
    expect(formatHoverCounts(counts)).toBe("row=2 child=1 leave=3");
    expect(decodeHoverCounts(formatHoverCounts(counts))).toEqual(
      Option.some(counts),
    );
  });

  it("refuses a word that is not a number and a lost field", () => {
    expect(Option.isNone(decodeHoverCounts("row=x child=1 leave=0"))).toBe(
      true,
    );
    expect(Option.isNone(decodeHoverCounts("row=1 leave=0"))).toBe(true);
  });
});

describe("the fixture", () => {
  it("has one case per nesting, in the frame's order", () => {
    expect(HOVER_CASES.map((entry) => entry.id)).toEqual([...HOVER_NESTINGS]);
  });

  it("holds the measured rule: a fill takes the row's hover, an unfilled child leaves it", () => {
    expect(hoverCase("text-unfilled")).toMatchObject({
      rowEnter: true,
      painted: true,
    });
    expect(hoverCase("text-filled")).toMatchObject({
      rowEnter: false,
      painted: false,
    });
    expect(hoverCase("div-filled")).toMatchObject({
      rowEnter: false,
      painted: false,
    });
    expect(hoverCase("inert-div")).toMatchObject({
      rowEnter: true,
      painted: true,
      childEnter: true,
    });
  });

  it("keeps the four ids apart", () => {
    Arr.forEach(HOVER_NESTINGS, (id) => {
      expect(
        new Set([hoverRowId(id), hoverChildId(id), hoverReadoutId(id)]).size,
      ).toBe(3);
    });
  });

  it("scales a painted box into a frame at the capture's device scale", () => {
    expect(pixelRegion({ x: 10, y: 20, width: 100, height: 40 }, 2)).toEqual({
      x: 20,
      y: 40,
      width: 200,
      height: 80,
    });
  });
});

describe("the probe's view", () => {
  it("paints the row's pointer feedback through the runtime's native hover state", () => {
    expect(probe).toContain(
      "hover: { backgroundColor: theme.colors[HOVER_PAINT.hover] }",
    );
    expect(probe).toContain('rest: "card"');
    expect(probe).toContain('hover: "accent"');
  });

  it("nests a filled child that opts out of the pointer in the inert case", () => {
    expect(probe).toContain(
      'pointerEvents: probeCase.id === "inert-div" ? "none" : undefined',
    );
  });

  it("counts the hover fill off the row's own crop", () => {
    expect(probe).toContain("Pixels.crop");
    expect(probe).toContain("Pixels.countColour");
    expect(probe).toContain("frame.width / Math.max(window.width, 1)");
  });
});

describe("the registry and the README", () => {
  it("registers the probe as an input measurement", () => {
    expect(liveRegistry).toContainEqual({
      id: "hover-routing-lifecycle",
      title:
        "Input: a filled child is the boundary a row's native hover stops at, while its unfilled and pointer-inert children leave the row's fill and its enter event intact",
      capability: "input",
    });
  });

  it("documents the measurement under the version it was made on", () => {
    expect(readme).toContain(
      "### `hover-routing-lifecycle` — measured on 0.11.0 here",
    );
    expect(readme).toContain("a fill is the boundary a hover stops at");
    expect(readme).toContain('`pointerEvents: "none"`');
  });
});

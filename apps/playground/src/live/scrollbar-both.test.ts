/**
 * Holds the arithmetic the `scrollbar-thumb-both` probe reads a window with, and
 * the claims its README section prints.
 *
 * The finding this file guards is a coupling, not a formula: once a scroller
 * shows both thumbs the binding shortens **each** track by the other thumb's
 * thickness (`paint_scrollbars` in the pinned binding: `height - thickness`,
 * `width - thickness`, the corner left to the vertical, which paints first)
 * while the content keeps moving a full viewport's worth. A vertical thumb on a
 * 120 px box with 400 px of content is therefore 31 px long, not 36, and the
 * window reads 30 against 31 — one point for the rounded cap, exactly as
 * `scrollbar.test.ts` records for the one-axis probe.
 *
 * `node:fs` is deliberate, as in `scrollbar.test.ts`: this reads the
 * repository's own probe, painter and Markdown, never a runtime path.
 */
import { readFileSync } from "node:fs";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { describe, expect, it } from "vitest";
import { liveRegistry } from "./registry.js";
import {
  BOTH_AXES,
  BOTH_CHECKS,
  BOTH_CONTENT,
  BOTH_IDS,
  BOTH_SHORT_CONTENT,
  BOTH_STOPS,
  BOTH_THICKNESS,
  BOTH_THUMBS,
  BOTH_VERTICAL_CLAMP,
  BOTH_VIEWPORT,
  BOTH_WHEEL_BY,
  bothBandOf,
  bothScroll,
  bothThumbOf,
  bothTrack,
  bothViewport,
} from "./scrollbar-both.js";
import { maxOffset, thumbBox, thumbOf } from "./scrollbar.js";

const readme = readFileSync(
  new URL("../../README.md", import.meta.url),
  "utf8",
);

const liveScenarios = readFileSync(
  new URL("./scenarios.tsx", import.meta.url),
  "utf8",
);

const fixture = readFileSync(
  new URL("./scrollbar-both.ts", import.meta.url),
  "utf8",
);

const scrollbar = readFileSync(
  new URL("./scrollbar.ts", import.meta.url),
  "utf8",
);

/** The section's prose on one line, so a wrapped sentence still reads whole. */
const flat = readme.replace(/\s+/g, " ");

describe("a two-axis scroller's thumbs", () => {
  it("leaves the corner to the other thumb, on both tracks", () => {
    expect(bothTrack("vertical")).toBe(BOTH_VIEWPORT.height - BOTH_THICKNESS);
    expect(bothTrack("horizontal")).toBe(BOTH_VIEWPORT.width - BOTH_THICKNESS);
    // The scroll distance is the viewport's, not the shortened track's: the
    // content still moves a full box's worth on each axis.
    expect(bothScroll("vertical")).toBe(
      BOTH_CONTENT.height - bothViewport("vertical"),
    );
    expect(bothScroll("horizontal")).toBe(
      BOTH_CONTENT.width - bothViewport("horizontal"),
    );
    // The two numbers cannot be conflated: deriving the scroll distance from
    // the shortened track would move the clamp 10 px further down.
    expect(bothScroll("vertical")).toBe(280);
    expect(maxOffset(BOTH_CONTENT.height, bothTrack("vertical"))).toBe(290);
  });

  it("sizes each thumb on the track the corner leaves it", () => {
    // A one-axis rule would answer 36 and 53; the corner costs the thickness's
    // share, and a component that sized from the viewport alone is wrong by it.
    expect(thumbOf(BOTH_VIEWPORT.height, BOTH_CONTENT.height, 0)).toEqual(
      Option.some({ start: 0, length: 36 }),
    );
    expect(thumbOf(BOTH_VIEWPORT.width, BOTH_CONTENT.width, 0)).toEqual(
      Option.some({ start: 0, length: 53 }),
    );
    expect(bothThumbOf("vertical")).toEqual(
      Option.some({
        axis: "vertical",
        track: 110,
        content: BOTH_CONTENT.height,
        box: { x: 150, y: 0, width: BOTH_THICKNESS, height: 31 },
      }),
    );
    expect(bothThumbOf("horizontal")).toEqual(
      Option.some({
        axis: "horizontal",
        track: 150,
        content: BOTH_CONTENT.width,
        box: { x: 0, y: 110, width: 48, height: BOTH_THICKNESS },
      }),
    );
  });

  it("moves each thumb on its own wheel and clamps at its own end", () => {
    expect(
      Arr.map(BOTH_STOPS, (stop) => [stop.label, stop.deltaX, stop.deltaY]),
    ).toEqual([
      ["one wheel down", 0, -BOTH_WHEEL_BY],
      ["a wheel past the end", 0, -100_000],
      ["one wheel right", -BOTH_WHEEL_BY, 0],
    ]);
    expect(Arr.map(BOTH_STOPS, (stop) => stop.offset)).toEqual([
      { x: 0, y: -BOTH_WHEEL_BY },
      { x: 0, y: BOTH_VERTICAL_CLAMP },
      { x: -BOTH_WHEEL_BY, y: BOTH_VERTICAL_CLAMP },
    ]);
    // A wheel on one axis leaves the other where it was: the vertical wheel
    // never reports a moved `x`, and the sideways one lands on a clamped `y`.
    expect(BOTH_VERTICAL_CLAMP).toBe(-280);
    expect(Arr.map(BOTH_STOPS, (stop) => stop.thumb.start)).toEqual([
      28, 79, 32,
    ]);
    expect(Arr.map(BOTH_STOPS, (stop) => stop.thumb.length)).toEqual([
      31, 31, 48,
    ]);
    // At the clamp the vertical thumb ends on its own track — the corner —
    // rather than on the box's bottom edge.
    const end = BOTH_STOPS[1];
    expect((end?.thumb.start ?? 0) + (end?.thumb.length ?? 0)).toBe(
      bothTrack("vertical"),
    );
  });

  it("paints no thumb when the content fits on both axes", () => {
    expect(
      thumbBox(
        bothTrack("vertical"),
        maxOffset(BOTH_SHORT_CONTENT.height, bothViewport("vertical")),
        0,
      ),
    ).toEqual(Option.none());
    expect(
      thumbBox(
        bothTrack("horizontal"),
        maxOffset(BOTH_SHORT_CONTENT.width, bothViewport("horizontal")),
        0,
      ),
    ).toEqual(Option.none());
  });

  it("keeps the two bands off each other's corner", () => {
    expect(bothBandOf("vertical")).toEqual({
      x: 150,
      y: 0,
      width: 10,
      height: 110,
    });
    expect(bothBandOf("horizontal")).toEqual({
      x: 0,
      y: 110,
      width: 150,
      height: 10,
    });
    // Neither band contains the corner point, so one thumb's paint cannot be
    // read as a short thumb on the other axis.
    const corner = { x: BOTH_VIEWPORT.width - 1, y: BOTH_VIEWPORT.height - 1 };
    const holds = (band: {
      x: number;
      y: number;
      width: number;
      height: number;
    }) => corner.x < band.x + band.width && corner.y < band.y + band.height;
    expect(holds(bothBandOf("vertical"))).toBe(false);
    expect(holds(bothBandOf("horizontal"))).toBe(false);
  });

  it("derives the resting table from its own constants", () => {
    expect(Arr.map(BOTH_THUMBS, (thumb) => thumb.axis)).toEqual([
      "vertical",
      "horizontal",
    ]);
    expect(Arr.map(BOTH_THUMBS, (thumb) => thumb.box)).toEqual([
      { x: 150, y: 0, width: 10, height: 31 },
      { x: 0, y: 110, width: 48, height: 10 },
    ]);
    // The order is the paint order: the vertical thumb is the one that reaches
    // the corner, so its box is the one that overlaps it.
    expect(BOTH_AXES).toEqual(["vertical", "horizontal"]);
  });

  it("keeps every locator apart", () => {
    const ids = Object.values(BOTH_IDS);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("counts the checks the probe asserts", () => {
    expect(BOTH_CHECKS).toBe(
      1 + 3 + 2 + BOTH_THUMBS.length * 4 + 2 + 1 + BOTH_STOPS.length * 6,
    );
    expect(BOTH_CHECKS).toBe(35);
  });
});

describe("the scrollbar-thumb-both probe's record", () => {
  it("registers the probe with the scroll capability", () => {
    expect(
      Arr.filter(liveRegistry, (probe) => probe.id === "scrollbar-thumb-both"),
    ).toEqual([
      {
        id: "scrollbar-thumb-both",
        title: expect.stringContaining("both axes"),
        capability: "scroll",
      },
    ]);
  });

  it("documents it under the version it was measured on", () => {
    expect(readme).toContain(
      "### `scrollbar-thumb-both` — measured on 0.11.0 here",
    );
    const printed = Number(
      /(\d+) checks, `--only scrollbar-thumb-both`/.exec(readme)?.[1] ??
        Number.NaN,
    );
    expect(printed).toBe(BOTH_CHECKS);
  });

  it("prints the reads the capture gave, not only the rule", () => {
    // The rounded caps cost a point of length and half a point of start, so the
    // section prints both numbers; a page printing the rule alone would claim a
    // measurement it does not have.
    Arr.forEach(
      [
        [31, 30],
        [48, 47],
      ] as const,
      ([rule, read]) => {
        expect(flat).toContain(`**${rule}** | from **0.5**, **${read}** long`);
      },
    );
    expect(flat).toContain("from **28.5**, **30** long");
    expect(flat).toContain("from **79.5**, **30** long");
    expect(flat).toContain("from **32.5**, **47** long");
  });

  it("states the corner's price and the scroll distance it does not move", () => {
    expect(flat).toContain(
      "the binding shortens **each** track by the other thumb's thickness",
    );
    expect(flat).toContain("not the 36 a viewport-only rule predicts");
    expect(flat).toContain("a wheel past the end leaves `y = -280`");
    expect(flat).toContain("not the `-290` a track-derived one would");
  });

  it("states the three negative controls it measured", () => {
    expect(flat).toContain(
      "sizing the two-axis thumb from the viewport alone fails `the vertical thumb is the length its content gives it` (`expected 36 ± 1, got 30`)",
    );
    expect(flat).toContain("`expected 31 ± 1, got 35`");
    expect(flat).toContain(
      "fails `the horizontal band paints a thumb` (`expected a value, got none`)",
    );
  });
});

describe("the probe asks the question the section answers", () => {
  it("mounts the shipped ScrollArea on both axes and a control that fits", () => {
    expect(liveScenarios).toContain("<ScrollArea");
    expect(liveScenarios).toContain('axis="both"');
    expect(liveScenarios).toContain("scrollbarColor={BOTH_TINT}");
    expect(liveScenarios).toContain("scrollbarWidth={BOTH_THICKNESS}");
    expect(liveScenarios).toContain("viewportTestId={id}");
    expect(liveScenarios).toContain(
      "{scroller(BOTH_IDS.scroller, BOTH_IDS.content, BOTH_CONTENT)}",
    );
    expect(liveScenarios).toContain(
      "{scroller(BOTH_IDS.short, BOTH_IDS.shortContent, BOTH_SHORT_CONTENT)}",
    );
    expect(liveScenarios).toMatch(/Effect\.forEach\(\s*BOTH_THUMBS/);
    expect(liveScenarios).toMatch(/Effect\.forEach\(\s*BOTH_STOPS/);
  });

  it("shares the rule with the one-axis probe instead of restating it", () => {
    // The two-axis case needs the track and the scroll distance apart, which is
    // why `scrollbar.ts` carries `thumbBox` and `thumbOf` delegates to it: one
    // statement of the binding's rule, not two that can drift.
    expect(fixture).toContain(
      'import { maxOffset, thumbBox, type ThumbBox } from "./scrollbar.js"',
    );
    expect(scrollbar).toContain("export const thumbBox");
    // The one-axis helper keeps no arithmetic of its own: it hands the rule the
    // two numbers it can derive.
    const oneAxis = scrollbar.slice(
      scrollbar.indexOf("export const thumbOf"),
      scrollbar.indexOf("export const thumbBox"),
    );
    expect(oneAxis).toContain(
      "thumbBox(track, maxOffset(content, track), offset)",
    );
    expect(fixture).not.toContain("export const thumbBox");
  });
});

/**
 * Guards the tooltip-fade fixture.
 *
 * The probe spends a window to assert a handful of pixels and two boxes, so a
 * stale constant in this module would be reported as a runtime defect rather
 * than as the arithmetic it is. The bugs these cases catch:
 *
 * 1. a box parser that accepts a short or empty readout, so a closed tip reads
 *    as a box at the origin and the offset check compares nothing;
 * 2. a level or travel that no longer matches `motionLevels.fast` or the
 *    component's own `TOOLTIP_OFFSET`, which would make both read windows
 *    meaningless;
 * 3. a sample point on the border or the text, where the pixel is not the
 *    surface the fade composites;
 * 4. a palette whose tip surface is too close to the strip it is painted over,
 *    which would leave the fade with nothing measurable to blend toward.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import { palettes } from "../palettes.js";
import {
  FADE_BACKING_RGBA,
  isFading,
  isSurface,
  surfaceFadeColour,
} from "./fade.js";
import {
  INK_MARGIN,
  TOOLTIP_ENTER_MS,
  TOOLTIP_LEVEL,
  TOOLTIP_PARTIAL_MS,
  TOOLTIP_REST_MS,
  TOOLTIP_SAMPLE_INSET,
  TOOLTIP_TRAVEL,
  formatTooltipBox,
  inkPeak,
  inkTopRow,
  parseTooltipBox,
  tooltipSample,
} from "./tooltip-fade.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

const readme = read("../../README.md");

/** The tip's resting surface colour; a black fallback fails loudly. */
const surface = Option.getOrElse(
  surfaceFadeColour(palettes.dark.colors.popover),
  () => new Pixels.Rgba({ r: 0, g: 0, b: 0, a: 0 }),
);

/** A straight composite of `top` over `bottom` at `alpha`. */
const mix = (
  top: Pixels.Rgba,
  bottom: Pixels.Rgba,
  alpha: number,
): Pixels.Rgba =>
  new Pixels.Rgba({
    r: Math.round(top.r * alpha + bottom.r * (1 - alpha)),
    g: Math.round(top.g * alpha + bottom.g * (1 - alpha)),
    b: Math.round(top.b * alpha + bottom.b * (1 - alpha)),
    a: 255,
  });

const SIZE = 40;
const SURFACE = new Pixels.Rgba({ r: 34, g: 39, b: 48, a: 255 });
const INK = new Pixels.Rgba({ r: 238, g: 241, b: 245, a: 255 });
/** A content box whose interior is rows 7–13 and columns 7–13 at scale 1. */
const BOX = { x: 5, y: 5, width: 10, height: 10 };

/** A capture built pixel by pixel from `paint`. */
const frameOf = (
  size: number,
  paint: (x: number, y: number) => Pixels.Rgba,
): Pixels.Pixels =>
  new Pixels.Pixels({
    width: size,
    height: size,
    data: Uint8Array.from({ length: size * size * 4 }, (_, index) => {
      const pixel = Math.floor(index / 4);
      const colour = paint(pixel % size, Math.floor(pixel / size));
      const channels = [colour.r, colour.g, colour.b, colour.a];
      return channels[index % 4] ?? 0;
    }),
  });

/** A surface with ink on the given rows, inside the box's interior. */
const inked = (rows: ReadonlyArray<number>, size = SIZE): Pixels.Pixels =>
  frameOf(size, (x, y) =>
    rows.includes(y) && x >= 8 && x <= 12 ? INK : SURFACE,
  );

describe("the tooltip-fade fixture", () => {
  it("parses the four fields a mounted tip publishes and refuses anything else", () => {
    expect(parseTooltipBox("240,120,60,24")).toEqual(
      Option.some({ x: 240, y: 120, width: 60, height: 24 }),
    );
    expect(Option.isNone(parseTooltipBox("none"))).toBe(true);
    expect(Option.isNone(parseTooltipBox("240,120,60"))).toBe(true);
    expect(Option.isNone(parseTooltipBox(""))).toBe(true);
    expect(Option.isNone(parseTooltipBox("240,120,0,24"))).toBe(true);
    expect(Option.isNone(parseTooltipBox("240,120,nan,24"))).toBe(true);
    expect(
      formatTooltipBox(Option.some({ x: 1.4, y: 2.6, width: 3, height: 4 })),
    ).toBe("1,3,3,4");
    expect(formatTooltipBox(Option.none())).toBe("none");
  });

  it("samples inside the surface's padding, clear of its border and its text", () => {
    const box = { x: 200, y: 100, width: 80, height: 24 };
    const point = tooltipSample(box);
    expect(point).toEqual({ x: 200 - TOOLTIP_SAMPLE_INSET, y: 100 + 12 });
    // The surface's left padding is `spacing.sm` (6) past a one-point border.
    expect(point.x).toBeGreaterThan(box.x - 7);
    expect(point.x).toBeLessThan(box.x);
    expect(point.y).toBeGreaterThan(box.y);
    expect(point.y).toBeLessThan(box.y + box.height);
  });

  it("waits an eighth of the level for the partial frame and past it for the rest", () => {
    expect(TOOLTIP_PARTIAL_MS).toBeGreaterThan(0);
    expect(TOOLTIP_PARTIAL_MS).toBeLessThan(TOOLTIP_ENTER_MS);
    expect(TOOLTIP_REST_MS).toBeGreaterThan(TOOLTIP_ENTER_MS);
    expect(TOOLTIP_REST_MS).toBeGreaterThan(TOOLTIP_PARTIAL_MS);
  });

  it("holds the level to the timing the tip enters with", () => {
    const timing = read("../../../../packages/motion/src/timing.ts");
    const duration = /fast:\s*(\d+)/.exec(timing)?.[1];
    expect(duration).toBe(`${TOOLTIP_ENTER_MS}`);
    expect(TOOLTIP_LEVEL).toBe("fast");
    const presence = read(
      "../../../../packages/primitives/src/core/presence.ts",
    );
    expect(presence).toContain(`motionTiming("${TOOLTIP_LEVEL}"`);
    // Both phases read the same level: an exit at another level would unmount
    // the tip before the entry the probe measures.
    expect(presence.match(/motionTiming\("fast"/g)).toHaveLength(2);
  });

  it("holds the travel to the offset the component paints", () => {
    const tooltip = read(
      "../../../../packages/primitives/src/components/Tooltip.tsx",
    );
    const offset = /const TOOLTIP_OFFSET = (\d+);/.exec(tooltip)?.[1];
    expect(offset).toBe(`${TOOLTIP_TRAVEL}`);
    expect(tooltip).toContain("fadeFromAnchor(side, TOOLTIP_OFFSET)");
  });

  it("finds the first row of ink, and none on a surface with no text", () => {
    expect(inkTopRow(inked([9, 10]), BOX, 1, SURFACE)).toEqual(Option.some(9));
    expect(inkTopRow(inked([]), BOX, 1, SURFACE)).toEqual(Option.none());
    // Ink outside the content box is not the tip's own text.
    expect(
      inkTopRow(
        frameOf(SIZE, (_, y) => (y === 2 ? INK : SURFACE)),
        BOX,
        1,
        SURFACE,
      ),
    ).toEqual(Option.none());
    // A pixel a few levels above the surface is the border, not ink.
    const border = new Pixels.Rgba({
      r: SURFACE.r + 10,
      g: SURFACE.g + 10,
      b: SURFACE.b + 10,
      a: 255,
    });
    expect(INK_MARGIN).toBeGreaterThan(30);
    expect(
      inkTopRow(
        frameOf(SIZE, (_, y) => (y === 9 ? border : SURFACE)),
        BOX,
        1,
        SURFACE,
      ),
    ).toEqual(Option.none());
  });

  it("scans the box in the capture's device rows and returns the brightest ink", () => {
    expect(
      inkTopRow(
        frameOf(SIZE * 2, (_, y) => (y === 30 ? INK : SURFACE)),
        { ...BOX, x: 10, y: 10 },
        2,
        SURFACE,
      ),
    ).toEqual(Option.some(30));
    expect(inkPeak(inked([9, 10]), BOX, 1)).toEqual(Option.some(INK));
    expect(inkPeak(inked([]), BOX, 1)).toEqual(Option.some(SURFACE));
    expect(inkPeak(inked([]), { ...BOX, x: 100 }, 1)).toEqual(Option.none());
  });

  it("calls the tip's own surface a fade over the strip, and both endpoints something else", () => {
    expect(
      isFading(
        mix(surface, FADE_BACKING_RGBA, 0.75),
        FADE_BACKING_RGBA,
        surface,
      ),
    ).toBe(true);
    expect(isSurface(surface, surface)).toBe(true);
    expect(isFading(FADE_BACKING_RGBA, FADE_BACKING_RGBA, surface)).toBe(false);
    expect(isFading(surface, FADE_BACKING_RGBA, surface)).toBe(false);
  });

  it("is the scene the probe drives: a white strip behind the trigger and a published box", () => {
    const scenarios = read("./scenarios.tsx");
    expect(scenarios).toContain('testId="tooltip-box"');
    expect(scenarios).toContain("backgroundColor: FADE_BACKING");
    expect(scenarios).toContain("parseTooltipBox");
    expect(scenarios).toContain("tooltipSample");
    expect(scenarios).toContain("inkTopRow");
    expect(scenarios).toContain("inkPeak");
  });

  it("prints the entry the window measured beside the lifecycle it belongs to", () => {
    const section = readme.slice(readme.indexOf("### `tooltip-lifecycle`"));
    expect(section).toContain("the entry");
    expect(section).toContain(`${TOOLTIP_ENTER_MS}ms`);
    expect(section).toContain(`${TOOLTIP_TRAVEL}`);
    expect(section).toContain("tooltip-fade");
  });
});

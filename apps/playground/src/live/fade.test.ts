/**
 * Guards the surface-fade fixture.
 *
 * The probe asserts only three pixels, and a run costs a window — so a mistake
 * in this module would be reported as a runtime defect rather than as the stale
 * constant it is. The bugs these cases catch:
 *
 * 1. a partial-frame predicate that accepts the page or the resting surface, so
 *    a fade that never painted would pass as "a mix";
 * 2. a read window that sits on the wrong side of the level, so the "partway"
 *    read actually measures a resting surface or the "settled" read measures the
 *    tween;
 * 3. a duration that no longer matches `motionLevels.slow` or a dialog that
 *    stopped entering at that level, which would make both windows meaningless;
 * 4. a white page that the palette's own popover colour happens to match, which
 *    would leave the fade with nothing to blend toward.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import { palettes } from "../palettes.js";
import {
  FADE_BACKING_RGBA,
  FADE_DURATION_MS,
  FADE_LEVEL,
  FADE_SAMPLE_INSET,
  fadeRead,
  fadeSample,
  isFading,
  isSurface,
  surfaceFadeColour,
} from "./fade.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

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

/** The surface colour the runner's palette paints; a black fallback fails loudly. */
const surface = Option.getOrElse(
  surfaceFadeColour(palettes.dark.colors.popover),
  () => new Pixels.Rgba({ r: 0, g: 0, b: 0, a: 0 }),
);

/** The same colour, with one channel moved, so a near miss is expressible. */
const colour = (overrides: Partial<Pixels.Rgba> = {}): Pixels.Rgba =>
  new Pixels.Rgba({
    r: surface.r,
    g: surface.g,
    b: surface.b,
    a: surface.a,
    ...overrides,
  });

describe("the surface-fade fixture", () => {
  it("enters at the level the motion table gives the dialog", () => {
    const timing = read("../../../../packages/motion/src/timing.ts");
    const duration = /slow:\s*(\d+)/.exec(timing)?.[1];
    expect(duration).toBe(`${FADE_DURATION_MS}`);
    expect(FADE_LEVEL).toBe("slow");
    expect(read("../../../../packages/components/src/dialog.tsx")).toContain(
      `useSurfaceTiming("${FADE_LEVEL}")`,
    );
  });

  it("reads the partial frame before the level ends and the settled one after", () => {
    const partial = fadeRead("partial");
    const settled = fadeRead("settled");
    expect(partial.atMs + partial.tolerance).toBeLessThan(FADE_DURATION_MS);
    expect(settled.atMs - settled.tolerance).toBeGreaterThanOrEqual(
      FADE_DURATION_MS,
    );
    expect(settled.atMs).toBeGreaterThan(partial.atMs);
  });

  it("samples inside the surface's own box, clear of its left edge", () => {
    const point = fadeSample({ x: 200, y: 100, width: 400, height: 220 });
    expect(point).toEqual({ x: 200 + FADE_SAMPLE_INSET, y: 100 + 110 });
    expect(point.x).toBeLessThan(200 + 400);
    expect(point.y).toBeGreaterThan(100);
    expect(point.y).toBeLessThan(100 + 220);
  });

  it("calls a partial composite a fade and both endpoints something else", () => {
    expect(
      isFading(
        mix(colour(), FADE_BACKING_RGBA, 0.5),
        FADE_BACKING_RGBA,
        surface,
      ),
    ).toBe(true);
    // A tenth of the way in is still a mix a reader can see.
    expect(
      isFading(
        mix(colour(), FADE_BACKING_RGBA, 0.1),
        FADE_BACKING_RGBA,
        surface,
      ),
    ).toBe(true);
  });

  it("refuses the unpainted page, the resting surface and a rounding sliver", () => {
    expect(isFading(FADE_BACKING_RGBA, FADE_BACKING_RGBA, surface)).toBe(false);
    expect(isFading(colour(), FADE_BACKING_RGBA, surface)).toBe(false);
    // One percent of the page left is two levels of paint: a fade, but not a
    // measurable one at this fixture's four-level floor.
    expect(
      isFading(
        mix(colour(), FADE_BACKING_RGBA, 0.99),
        FADE_BACKING_RGBA,
        surface,
      ),
    ).toBe(false);
    // A pixel darker than the surface is some other paint, not this fade.
    expect(
      isFading(colour({ r: 10, g: 10, b: 10 }), FADE_BACKING_RGBA, surface),
    ).toBe(false);
  });

  it("calls only the exact colour the resting surface", () => {
    expect(isSurface(colour(), surface)).toBe(true);
    expect(isSurface(colour({ b: surface.b + 1 }), surface)).toBe(false);
    expect(isSurface(colour({ a: 254 }), surface)).toBe(false);
  });

  it("keeps the page a colour the palette's surface cannot be mistaken for", () => {
    expect(surfaceFadeColour(palettes.dark.colors.popover)).toEqual(
      Option.some(surface),
    );
    expect(isSurface(FADE_BACKING_RGBA, surface)).toBe(false);
    expect(isFading(surface, FADE_BACKING_RGBA, surface)).toBe(false);
  });
});

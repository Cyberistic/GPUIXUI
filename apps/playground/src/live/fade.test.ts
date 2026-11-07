import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import { palettes } from "../palettes.js";
import {
  FADE_BACKING_RGBA,
  FADE_DURATION_MS,
  FADE_LEVEL,
  FADE_PARTIAL_MS,
  FADE_REST_MS,
  FADE_SAMPLE_INSET,
  fadeSample,
  isBacking,
  isFading,
  isSurface,
  surfaceFadeColour,
} from "./fade.js";

const read = (path: string): string =>
  readFileSync(new URL(path, import.meta.url), "utf8");

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

const surface = Option.getOrElse(
  surfaceFadeColour(palettes.dark.colors.popover),
  () => new Pixels.Rgba({ r: 0, g: 0, b: 0, a: 0 }),
);

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

  it("advances the frozen clock into the level for the partial frame and past it for the rest", () => {
    expect(FADE_PARTIAL_MS).toBeGreaterThan(0);
    expect(FADE_PARTIAL_MS).toBeLessThan(FADE_DURATION_MS);
    expect(FADE_REST_MS).toBeGreaterThan(FADE_DURATION_MS);
    expect(FADE_REST_MS).toBeGreaterThan(FADE_PARTIAL_MS);

    expect(FADE_PARTIAL_MS * 2).toBeLessThan(
      FADE_DURATION_MS + FADE_PARTIAL_MS,
    );
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

    expect(
      isFading(
        mix(colour(), FADE_BACKING_RGBA, 0.99),
        FADE_BACKING_RGBA,
        surface,
      ),
    ).toBe(false);

    expect(
      isFading(colour({ r: 10, g: 10, b: 10 }), FADE_BACKING_RGBA, surface),
    ).toBe(false);
  });

  it("calls only the exact colour the resting surface", () => {
    expect(isSurface(colour(), surface)).toBe(true);
    expect(isSurface(colour({ b: surface.b + 1 }), surface)).toBe(false);
    expect(isSurface(colour({ a: 254 }), surface)).toBe(false);
  });

  it("reads the unpainted page as the backing, not as the surface", () => {
    expect(isBacking(FADE_BACKING_RGBA, FADE_BACKING_RGBA)).toBe(true);
    expect(isBacking(surface, FADE_BACKING_RGBA)).toBe(false);
  });

  it("keeps the page a colour the palette's surface cannot be mistaken for", () => {
    expect(surfaceFadeColour(palettes.dark.colors.popover)).toEqual(
      Option.some(surface),
    );
    expect(isSurface(FADE_BACKING_RGBA, surface)).toBe(false);
    expect(isFading(surface, FADE_BACKING_RGBA, surface)).toBe(false);
  });
});

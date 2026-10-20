/**
 * Guards the premises of the content-surface theme checks (plan `784`).
 *
 * The bug being guarded: `<markdown>`, `<code>` and `<diff>` publish a `theme`
 * prop that no scenario passes, and the runtime's base is always dark. These
 * tests pin the token mapping (so a themed surface cannot silently lose a
 * field), the geometry the pixel scans depend on, the two hand-computed
 * composites, and the darkest-pixel scan — including its device-scale mapping
 * and its refusal of a mismatched frame.
 *
 * Each can fail: change one mapping, move the bullet by a pixel, drop a syntax
 * kind, point `bg` at the card, or scan logical instead of device pixels.
 */
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { Pixels, Smoke } from "@gpuixui/testing";
import { palettes } from "../palettes.js";
import {
  BULLET_ALPHA,
  DIFF_LINE,
  DIFF_TINT_ALPHA,
  LIGHT_INK_CEILING,
  DARK_INK_FLOOR,
  MIN_SURFACE_PIXELS,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  SURFACE_PANELS,
  bulletPaint,
  bulletPoint,
  diffRowPoints,
  diffTint,
  luminanceOf,
  nativeContentTheme,
  panelsOverlap,
  scanDarkest,
  syntaxKinds,
  syntaxPalette,
  type SurfacePanel,
} from "./surface-theme-model.js";

const rgba = (hex: string): Pixels.Rgba => {
  const parsed = Pixels.hexToRgba(hex);
  if (Option.isNone(parsed)) {
    throw new Error(`unparseable test colour ${hex}`);
  }
  return parsed.value;
};

const windowOf = (width: number, height: number): Smoke.WindowSize =>
  new Smoke.WindowSize({ width, height });

/** A frame filled with `plane`, with one `ink` block at device coordinates. */
const frameWithBlock = (
  width: number,
  height: number,
  plane: string,
  ink: string,
  block: { x: number; y: number; width: number; height: number },
): Pixels.Pixels => {
  const under = rgba(plane);
  const over = rgba(ink);
  const data = Uint8Array.from(
    Array.from({ length: width * height }, (_, index) => {
      const x = index % width;
      const y = Math.floor(index / width);
      const inside =
        x >= block.x &&
        x < block.x + block.width &&
        y >= block.y &&
        y < block.y + block.height;
      const colour = inside ? over : under;
      return [colour.r, colour.g, colour.b, colour.a];
    }).flat(),
  );
  return new Pixels.Pixels({ width, height, data });
};

describe("nativeContentTheme", () => {
  const dark = nativeContentTheme(palettes.dark);

  it("maps every field the runtime reads onto a semantic role", () => {
    const pairs = [
      [dark.bg, palettes.dark.colors.background],
      [dark.border, palettes.dark.colors.border],
      [dark.text, palettes.dark.colors.foreground],
      [dark.textMuted, palettes.dark.colors.mutedForeground],
      [dark.textFaint, palettes.dark.colors.placeholder],
      [dark.textDim, palettes.dark.colors.mutedForeground],
      [dark.accent, palettes.dark.colors.primary],
      [dark.caret, palettes.dark.colors.primary],
      [dark.codeText, palettes.dark.colors.primary],
      [dark.codeWash, palettes.dark.colors.muted],
      [dark.diffAdd, palettes.dark.colors.success],
      [dark.diffDel, palettes.dark.colors.destructive],
      [dark.diffHunkBg, palettes.dark.colors.muted],
      [dark.fontSans, palettes.dark.typography.sans],
      [dark.fontMono, palettes.dark.typography.mono],
    ] as const;
    pairs.forEach(([actual, expected]) => expect(actual).toBe(expected));
  });

  it("uses the canvas, not the card, as the content plane", () => {
    expect(dark.bg).toBe(palettes.dark.colors.background);
    expect(dark.bg).not.toBe(palettes.dark.colors.card);
  });

  it("selects the runtime's base from the mode", () => {
    expect(dark.appearance).toBe("dark");
    expect(nativeContentTheme(palettes.light).appearance).toBe("light");
  });

  it("carries a token for every published syntax kind", () => {
    const palette = syntaxPalette(palettes.dark.colors);
    syntaxKinds.forEach((kind) => {
      expect(palette[kind]).toBeTypeOf("string");
      expect(palette[kind]).not.toBe("");
    });
    expect(palette.keyword).toBe(palettes.dark.colors.primary);
    expect(palette.string).toBe(palettes.dark.colors.success);
    expect(palette.invalid).toBe(palettes.dark.colors.destructive);
  });
});

describe("the fixture grid", () => {
  it("keeps every panel inside the stage", () => {
    expect(
      SURFACE_PANELS.every(
        (panel) =>
          panel.left >= 0 &&
          panel.top >= 0 &&
          panel.left + panel.width <= STAGE_WIDTH &&
          panel.top + panel.height <= STAGE_HEIGHT,
      ),
    ).toBe(true);
  });

  it("never lands two panels on the same pixel", () => {
    expect(panelsOverlap(SURFACE_PANELS)).toBe(false);
  });

  it("detects an overlap, so the guard is not vacuous", () => {
    const first: SurfacePanel = {
      cardId: "a-card",
      testId: "a",
      left: 0,
      top: 0,
      width: 10,
      height: 10,
    };
    const second: SurfacePanel = {
      ...first,
      cardId: "b-card",
      testId: "b",
      left: 5,
      top: 5,
    };
    expect(panelsOverlap([first, second])).toBe(true);
    expect(panelsOverlap([first, { ...second, left: 20 }])).toBe(false);
  });

  it("has one unique testId and card per fixture", () => {
    expect(new Set(SURFACE_PANELS.map((panel) => panel.testId)).size).toBe(
      SURFACE_PANELS.length,
    );
    expect(new Set(SURFACE_PANELS.map((panel) => panel.cardId)).size).toBe(
      SURFACE_PANELS.length,
    );
  });
});

describe("the measured geometry", () => {
  it("places the bullet at the disc's centre", () => {
    expect(bulletPoint({ x: 100, y: 50, width: 420, height: 40 })).toEqual({
      x: 103.5,
      y: 61,
    });
  });

  it("reads the diff rows from the 36/28/21 metrics", () => {
    const points = diffRowPoints({ x: 10, y: 20, width: 420, height: 152 });
    const body = 20 + 36 + 28;
    expect(points.context).toEqual({ x: 406, y: body + DIFF_LINE / 2 });
    expect(points.deleted).toEqual({
      x: 406,
      y: body + DIFF_LINE + DIFF_LINE / 2,
    });
    expect(points.added).toEqual({
      x: 406,
      y: body + DIFF_LINE * 2 + DIFF_LINE / 2,
    });
  });

  it("composites the bullet at 85 % over the card", () => {
    const painted = bulletPaint(
      new Pixels.Rgba({ r: 255, g: 0, b: 0, a: 255 }),
      new Pixels.Rgba({ r: 0, g: 0, b: 255, a: 255 }),
    );
    expect(BULLET_ALPHA).toBe(0.85);
    expect(painted).toEqual(new Pixels.Rgba({ r: 217, g: 0, b: 38, a: 255 }));
  });

  it("composites a diff tint at 5.5 % over the plane", () => {
    const painted = diffTint(
      new Pixels.Rgba({ r: 0, g: 255, b: 0, a: 255 }),
      new Pixels.Rgba({ r: 0, g: 0, b: 0, a: 255 }),
    );
    expect(DIFF_TINT_ALPHA).toBe(0.055);
    expect(painted).toEqual(new Pixels.Rgba({ r: 0, g: 14, b: 0, a: 255 }));
  });
});

describe("luminanceOf", () => {
  it("is 0 for black and 1 for white", () => {
    expect(luminanceOf(rgba("#000000"))).toBe(0);
    expect(luminanceOf(rgba("#FFFFFF"))).toBeCloseTo(1, 10);
  });

  it("separates the two appearance inks by more than the thresholds", () => {
    const light = luminanceOf(rgba("#222222"));
    const dark = luminanceOf(rgba("#E5E5E5"));
    expect(light).toBeLessThan(LIGHT_INK_CEILING);
    expect(dark).toBeGreaterThan(DARK_INK_FLOOR);
  });
});

describe("scanDarkest", () => {
  const box = { x: 2, y: 1, width: 6, height: 4 };

  it("finds the ink and not the plane", () => {
    const frame = frameWithBlock(12, 6, "#FFFFFF", "#222222", box);
    const scan = scanDarkest(frame, windowOf(12, 6), box);
    expect(scan.sampled).toBe(24);
    expect(Pixels.rgbaNear(scan.darkest, rgba("#222222"), 0)).toBe(true);
    expect(scan.luminance).toBeLessThan(LIGHT_INK_CEILING);
  });

  it("reports a light ink as light", () => {
    const frame = frameWithBlock(12, 6, "#FFFFFF", "#E5E5E5", box);
    const scan = scanDarkest(frame, windowOf(12, 6), box);
    expect(Pixels.rgbaNear(scan.darkest, rgba("#E5E5E5"), 0)).toBe(true);
    expect(scan.luminance).toBeGreaterThan(DARK_INK_FLOOR);
  });

  it("maps the logical box through the device scale", () => {
    const frame = frameWithBlock(24, 12, "#FFFFFF", "#222222", {
      x: box.x * 2,
      y: box.y * 2,
      width: box.width * 2,
      height: box.height * 2,
    });
    const scan = scanDarkest(frame, windowOf(12, 6), box);
    expect(scan.sampled).toBe(24 * 4);
    expect(Pixels.rgbaNear(scan.darkest, rgba("#222222"), 0)).toBe(true);
  });

  it("refuses a frame whose size does not match the window", () => {
    const frame = frameWithBlock(10, 6, "#FFFFFF", "#222222", box);
    const scan = scanDarkest(frame, windowOf(6, 6), box);
    expect(scan.sampled).toBe(0);
    expect(scan.luminance).toBe(0);
  });

  it("is a threshold the assertions compare against", () => {
    expect(MIN_SURFACE_PIXELS).toBeGreaterThan(1);
  });
});

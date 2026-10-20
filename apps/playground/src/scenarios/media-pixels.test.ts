/**
 * Guards the premises of the media waveform's pixel checks (plan `722`).
 *
 * The bug being guarded: `media-surface` asserted the envelope's geometry and
 * its authored style only, so a bar that painted nothing, a gap filled by the
 * envelope layer, or an SVG image route that decoded to a blank bitmap passed
 * every check. These tests pin where the frame is sampled, that the samples sit
 * in the bar / the gap / above the bar for the whole fixture, and what the
 * played wash must composite to — so a hardcoded window point, an opaque wash
 * or a swapped blend cannot pass.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import { getTheme } from "@gpuixui/tokens";
import {
  ABOVE_GAP,
  PLAYED_ALPHA,
  aboveBarPoint,
  barPoint,
  gapPoint,
  imagePoint,
  type MediaPalette,
  playheadPoint,
  washPoint,
} from "./media-pixels.js";
import { BARS, BAR_WIDTH, SLOT, STAGE, barRect, xAt } from "./media-model.js";

const theme = getTheme("dark");
const palette: MediaPalette = {
  mutedForeground: theme.colors.mutedForeground,
  card: theme.colors.card,
  primary: theme.colors.primary,
  foreground: theme.colors.foreground,
};

/** A parse failure becomes an impossible colour, so an expectation fails loudly. */
const rgba = (hex: string): Pixels.Rgba =>
  Option.getOrElse(
    Pixels.hexToRgba(hex),
    () => new Pixels.Rgba({ r: -1, g: -1, b: -1, a: -1 }),
  );

/** The stage sits inside the shell; every point below is offset by it. */
const STAGE_BOX = { x: 312, y: 240, width: STAGE.width, height: STAGE.height };
/** The image route's box, as the runtime reports it. */
const IMAGE_BOX = { x: 312, y: 360, width: STAGE.width, height: STAGE.height };

/** A bar's reported box for one fixture slot, offset into the window. */
const boxAt = (index: number) => {
  const bar = barRect(index);
  return {
    x: STAGE_BOX.x + bar.x,
    y: STAGE_BOX.y + bar.top,
    width: BAR_WIDTH,
    height: bar.height,
  };
};

describe("the envelope's samples", () => {
  it("puts the gap sample strictly between a bar and the next slot", () => {
    const checks = Arr.map([0, 32, 63], (index) => {
      const bar = boxAt(index);
      const gap = gapPoint(bar);
      return (
        gap.x > bar.x + BAR_WIDTH &&
        gap.x < bar.x + SLOT &&
        gap.y === bar.y + bar.height / 2
      );
    });
    expect(checks).toEqual([true, true, true]);
  });

  it("moves the gap sample with the bar instead of a hardcoded point", () => {
    const bar = boxAt(0);
    const moved = gapPoint({ ...bar, x: bar.x + 15 });
    expect(moved.x - gapPoint(bar).x).toBe(15);
  });

  it("puts the bar sample at the bar's own centre", () => {
    expect(barPoint(boxAt(32))).toEqual({
      x: STAGE_BOX.x + barRect(32).x + BAR_WIDTH / 2,
      y: STAGE_BOX.y + barRect(32).top + barRect(32).height / 2,
    });
  });

  it("puts the above-slot sample above every fixture bar, inside the stage", () => {
    const above = Arr.every(Arr.range(0, BARS - 1), (index) => {
      const bar = boxAt(index);
      const point = aboveBarPoint(bar);
      return (
        point.y < bar.y &&
        point.y >= STAGE_BOX.y &&
        bar.y - point.y === ABOVE_GAP &&
        point.x === bar.x + BAR_WIDTH / 2
      );
    });
    expect(above).toBe(true);
  });
});

describe("the played wash", () => {
  it("samples inside the wash, above every bar and the playhead's own column", () => {
    const seconds = 30;
    const wash = washPoint(STAGE_BOX, seconds);
    const playhead = playheadPoint(STAGE_BOX, seconds);
    expect(wash.x).toBe(STAGE_BOX.x + xAt(seconds) / 2);
    expect(wash.y).toBe(STAGE_BOX.y + 4);
    expect(playhead.x).toBe(STAGE_BOX.x + xAt(seconds) + 1);
    expect(playhead.y).toBe(wash.y);
    // The tallest fixture bar is 59 px; both samples are above every bar.
    expect(wash.y - STAGE_BOX.y).toBeLessThan(STAGE.height - 59);
    expect(playhead.x - STAGE_BOX.x).toBeGreaterThan(xAt(seconds));
    expect(playhead.x - STAGE_BOX.x).toBeLessThan(xAt(seconds) + 2);
  });

  it("composites the primary token over the stage and over a bar, distinctly", () => {
    const blend = (under: string) =>
      Pixels.blendOver(rgba(palette.primary), PLAYED_ALPHA, rgba(under));
    const overCard = blend(palette.card);
    const overBar = blend(palette.mutedForeground);
    expect([overCard.r, overCard.g, overCard.b, overCard.a]).toEqual([
      68, 71, 102, 255,
    ]);
    expect([overBar.r, overBar.g, overBar.b, overBar.a]).toEqual([
      163, 169, 205, 255,
    ]);
    expect(overCard).not.toEqual(overBar);
    expect(overCard).not.toEqual(rgba(palette.card));
    expect(overBar).not.toEqual(rgba(palette.primary));
  });
});

describe("the image route's mapping", () => {
  it("maps the stage's corners and centre into the image's reported box", () => {
    expect(imagePoint(IMAGE_BOX, { x: 0, y: 0 })).toEqual({
      x: IMAGE_BOX.x,
      y: IMAGE_BOX.y,
    });
    expect(imagePoint(IMAGE_BOX, { x: STAGE.width, y: STAGE.height })).toEqual({
      x: IMAGE_BOX.x + IMAGE_BOX.width,
      y: IMAGE_BOX.y + IMAGE_BOX.height,
    });
    expect(
      imagePoint(IMAGE_BOX, { x: STAGE.width / 2, y: STAGE.height / 2 }),
    ).toEqual({
      x: IMAGE_BOX.x + IMAGE_BOX.width / 2,
      y: IMAGE_BOX.y + IMAGE_BOX.height / 2,
    });
    // An asymmetric point: the stage is 5:1, so a swapped axis cannot pass.
    expect(
      imagePoint(IMAGE_BOX, { x: STAGE.width / 4, y: STAGE.height / 2 }),
    ).toEqual({
      x: IMAGE_BOX.x + IMAGE_BOX.width / 4,
      y: IMAGE_BOX.y + IMAGE_BOX.height / 2,
    });
  });

  it("keeps the fixture's bar centre inside a rasterised image that insets", () => {
    const fixture = barRect(32);
    const inset = {
      x: IMAGE_BOX.x,
      y: IMAGE_BOX.y,
      width: IMAGE_BOX.width - 2,
      height: IMAGE_BOX.height - 2,
    };
    const point = imagePoint(inset, {
      x: fixture.x + BAR_WIDTH / 2,
      y: fixture.top + fixture.height / 2,
    });
    const top = imagePoint(inset, { x: 0, y: fixture.top });
    const bottom = imagePoint(inset, {
      x: 0,
      y: fixture.top + fixture.height,
    });
    expect(point.x).toBeGreaterThan(
      inset.x + (fixture.x / STAGE.width) * inset.width,
    );
    expect(point.x).toBeLessThan(
      inset.x + ((fixture.x + BAR_WIDTH) / STAGE.width) * inset.width,
    );
    expect(point.y).toBeGreaterThan(top.y);
    expect(point.y).toBeLessThan(bottom.y);
  });
});

describe("the media palette", () => {
  it("has four distinct tokens that parse", () => {
    const colours = [
      palette.mutedForeground,
      palette.card,
      palette.primary,
      palette.foreground,
    ];
    expect(
      Arr.every(colours, (colour) => Option.isSome(Pixels.hexToRgba(colour))),
    ).toBe(true);
    expect(new Set(colours).size).toBe(4);
  });
});

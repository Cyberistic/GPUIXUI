/**
 * Guards the premises of the crop-mask pixel checks (plan `713`).
 *
 * The bug being guarded: `crop-area` asserted the masks by geometry only, so a
 * mask `div` with **no background** passed every check. These tests pin the
 * composite the runtime must paint and the points the frame is sampled at, so a
 * transparent mask, an opaque assumption or a hardcoded point cannot pass.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import { getTheme } from "@gpuixui/tokens";
import type { CropRect, Stage } from "./crop-model.js";
import { initialCrop, maskRects } from "./crop-model.js";
import {
  cropSamples,
  IMAGE_LEFT,
  IMAGE_RIGHT,
  MASK_ALPHA,
} from "./crop-pixels.js";

const STAGE: Stage = { width: 320, height: 200 };
const RESIZED: CropRect = { x: 64, y: 40, width: 232, height: 140 };
const BACKGROUND = getTheme("dark").colors.background;

/** A parse failure becomes an impossible colour, so an expectation fails loudly. */
const rgba = (hex: string): Pixels.Rgba =>
  Option.getOrElse(
    Pixels.hexToRgba(hex),
    () => new Pixels.Rgba({ r: -1, g: -1, b: -1, a: -1 }),
  );

const inside = (
  rect: CropRect,
  point: { readonly x: number; readonly y: number },
): boolean =>
  point.x > rect.x &&
  point.x < rect.x + rect.width &&
  point.y > rect.y &&
  point.y < rect.y + rect.height;

const samplesFor = (crop: CropRect) => cropSamples(crop, STAGE);

describe("Pixels.blendOver", () => {
  it("composites the mask over the image in sRGB, not the reverse", () => {
    const overBlue = Pixels.blendOver(
      rgba(BACKGROUND),
      MASK_ALPHA,
      rgba(IMAGE_LEFT),
    );
    const overAmber = Pixels.blendOver(
      rgba(BACKGROUND),
      MASK_ALPHA,
      rgba(IMAGE_RIGHT),
    );
    expect([overBlue.r, overBlue.g, overBlue.b, overBlue.a]).toEqual([
      34, 64, 114, 255,
    ]);
    expect([overAmber.r, overAmber.g, overAmber.b, overAmber.a]).toEqual([
      108, 75, 20, 255,
    ]);
  });

  it("a masked colour is neither the token nor the image (the mask is translucent)", () => {
    const backdrop = rgba(BACKGROUND);
    const blended = Pixels.blendOver(backdrop, MASK_ALPHA, rgba(IMAGE_LEFT));
    expect(blended).not.toEqual(backdrop);
    expect(blended).not.toEqual(rgba(IMAGE_LEFT));
  });
});

describe("cropSamples", () => {
  it("every expected colour parses and the two halves differ", () => {
    const samples = samplesFor(initialCrop(STAGE));
    const all = [
      samples.leftHalf,
      samples.rightHalf,
      samples.leftMask,
      samples.rightMask,
    ];
    expect(
      Arr.every(
        Arr.flatMap(all, (sample) => [sample.image, BACKGROUND]),
        (colour) => Option.isSome(Pixels.hexToRgba(colour)),
      ),
    ).toBe(true);
    expect(IMAGE_LEFT).not.toBe(IMAGE_RIGHT);
  });

  it("the image samples sit inside the crop and the mask samples inside their mask", () => {
    Arr.forEach([initialCrop(STAGE), RESIZED], (crop) => {
      const samples = samplesFor(crop);
      const masks = maskRects(crop, STAGE);
      expect(inside(crop, samples.leftHalf.point)).toBe(true);
      expect(inside(crop, samples.rightHalf.point)).toBe(true);
      expect(inside(masks.left, samples.leftMask.point)).toBe(true);
      expect(inside(masks.right, samples.rightMask.point)).toBe(true);
      // The complement: a masked sample is never inside the crop.
      expect(inside(crop, samples.rightMask.point)).toBe(false);
    });
  });

  it("a resize moves the right-hand samples instead of reusing fixed points", () => {
    const before = samplesFor(initialCrop(STAGE));
    const after = samplesFor(RESIZED);
    expect(after.rightHalf.point.x).toBeGreaterThan(before.rightHalf.point.x);
    expect(after.rightMask.point.x).toBeGreaterThan(before.rightMask.point.x);
    expect(after.rightMask.point.x).toBeLessThan(STAGE.width);
  });
});

/**
 * Guards the premises of the live palette-pixel checks (plan `676`).
 *
 * `live-theme` samples two swatches per palette and compares each centre with
 * `palettePixels`. Those checks are only evidence if the expected colours are
 * real colours and if the three palettes actually differ — otherwise the
 * "switch repainted this swatch" assertion could hold while nothing visible
 * changed.
 */
import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import { paletteIds } from "../palettes.js";
import { palettePixels } from "./palette-pixels.js";

const coloursOf = (role: "background" | "primary"): ReadonlyArray<string> =>
  Arr.map(paletteIds, (palette) =>
    role === "background"
      ? palettePixels(palette)[0].colour
      : palettePixels(palette)[1].colour,
  );

const parses = (colour: string): boolean =>
  Option.isSome(Pixels.hexToRgba(colour));

describe("palettePixels", () => {
  it("every expected swatch colour parses", () => {
    const expected = Arr.flatMap(paletteIds, palettePixels);
    expect(Arr.length(expected)).toBe(6);
    expect(Arr.every(expected, (pixel) => parses(pixel.colour))).toBe(true);
  });

  it("a palette's background and primary are different colours", () => {
    expect(
      Arr.every(
        paletteIds,
        (palette) =>
          palettePixels(palette)[0].colour !== palettePixels(palette)[1].colour,
      ),
    ).toBe(true);
  });

  it("the three palettes paint distinct backgrounds and primaries", () => {
    expect(Arr.length(Arr.dedupe(coloursOf("background")))).toBe(3);
    expect(Arr.length(Arr.dedupe(coloursOf("primary")))).toBe(3);
  });
});

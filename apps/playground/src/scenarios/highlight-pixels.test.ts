/**
 * Guards the premises of the wash-pixel checks (plan `701`).
 *
 * `search-highlights` and `live-highlights` compare a captured frame with
 * `washColours`. That comparison is only evidence if the derivation reproduces
 * the runtime's measured defaults (`#31365F` / `#575EAF` over the playground
 * background) and if the library's own tokens are genuinely a different wash —
 * otherwise "pass `color` to get a token wash" would be a claim with no
 * observable difference.
 */
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import { palettes } from "../palettes.js";
import { RUNTIME_DARK_ACCENT, washColours } from "./highlight-pixels.js";

const colour = (hex: string): Pixels.Rgba =>
  Option.getOrElse(Pixels.hexToRgba(hex), () => {
    // A test fixture's literal; an unparseable one is a broken test, not a
    // domain failure, so it must stop the run rather than become a value.
    throw new Error(`fixture colour ${hex} must parse`);
  });

const hex = (rgba: Pixels.Rgba): string =>
  `#${[rgba.r, rgba.g, rgba.b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;

const background = colour(palettes.dark.colors.background);

describe("highlight wash pixels", () => {
  it("Pixels.blendOver is exact at both ends", () => {
    const foreground = colour("#FF8000");
    expect(hex(Pixels.blendOver(foreground, 1, background))).toBe("#ff8000");
    expect(hex(Pixels.blendOver(foreground, 0, background))).toBe("#11141a");
  });

  it("the runtime's default washes are the dark accent at 30 % and 65 %", () => {
    const washes = washColours(RUNTIME_DARK_ACCENT, background);
    expect(hex(washes.inactive)).toBe("#31365f");
    expect(hex(washes.active)).toBe("#575eaf");
  });

  it("the library's accent and selection are not the runtime default", () => {
    const runtime = washColours(RUNTIME_DARK_ACCENT, background);
    const accent = washColours(colour(palettes.dark.colors.accent), background);
    const selection = colour(palettes.dark.colors.selection);
    const selectionWash = Pixels.blendOver(
      selection,
      selection.a / 255,
      background,
    );
    expect(hex(accent.inactive)).not.toBe(hex(runtime.inactive));
    expect(hex(selectionWash)).not.toBe(hex(runtime.inactive));
  });

  it("an eight-digit token keeps its alpha", () => {
    const selection = colour(palettes.dark.colors.selection);
    expect(selection.a).toBe(61);
    expect(
      hex(Pixels.blendOver(selection, selection.a / 255, background)),
    ).toBe("#353851");
  });
});

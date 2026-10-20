/**
 * Guards the premises of the opacity pixel checks (plan `761`).
 *
 * The bug being guarded: eleven shipped surfaces express `disabled` as nothing
 * but `opacity: 0.5`, and no suite ever reads the frame — so a runtime that
 * dropped the property would leave every disabled control looking enabled.
 * These tests pin the blend the frame asserts, that nesting multiplies, that the
 * subtree expectation is not the undimmed child, and that a role collision is
 * refused before a frame is sampled. Each can fail: reverse the blend
 * arguments, make nesting additive, or collapse two roles.
 */
import { describe, expect, it } from "vitest";
import * as Option from "effect/Option";
import { Pixels } from "@gpuixui/testing";
import { palettes } from "../palettes.js";
import {
  DISABLED_OPACITY,
  distinctRoles,
  distinguishable,
  nestedOpacity,
  nestedPaint,
  opacityBlend,
  opacityFixtures,
} from "./opacity-pixels.js";

const rgba = (hex: string): Pixels.Rgba => {
  const parsed = Pixels.hexToRgba(hex);
  if (Option.isNone(parsed)) {
    throw new Error(`unparseable test colour ${hex}`);
  }
  return parsed.value;
};

describe("opacityBlend", () => {
  it("returns the fill at full opacity and the under colour at zero", () => {
    const fill = rgba("#A7A9FF");
    const under = rgba("#11141A");
    expect(Pixels.rgbaNear(opacityBlend(fill, 1, under), fill, 0)).toBe(true);
    expect(Pixels.rgbaNear(opacityBlend(fill, 0, under), under, 0)).toBe(true);
  });

  it("mixes channels with the disabled amount", () => {
    const blended = opacityBlend(
      rgba("#A7A9FF"),
      DISABLED_OPACITY,
      rgba("#11141A"),
    );
    expect([blended.r, blended.g, blended.b]).toEqual([0x5c, 0x5f, 0x8d]);
  });

  it("is not symmetric away from half, so reversed arguments cannot pass", () => {
    const blended = opacityBlend(rgba("#A7A9FF"), 0.25, rgba("#11141A"));
    const reversed = opacityBlend(rgba("#11141A"), 0.25, rgba("#A7A9FF"));
    expect(Pixels.rgbaNear(blended, reversed, 2)).toBe(false);
  });
});

describe("nestedOpacity", () => {
  it("multiplies a half inside a half to a quarter", () => {
    expect(nestedOpacity(DISABLED_OPACITY, DISABLED_OPACITY)).toBe(0.25);
  });

  it("leaves a single opacity alone on either side", () => {
    expect(nestedOpacity(1, DISABLED_OPACITY)).toBe(0.5);
    expect(nestedOpacity(DISABLED_OPACITY, 1)).toBe(0.5);
  });

  it("is not additive, which would make a nested pair fully opaque", () => {
    expect(nestedOpacity(DISABLED_OPACITY, DISABLED_OPACITY)).not.toBe(1);
  });
});

describe("distinguishable", () => {
  it("accepts a real colour difference and rejects slack-only noise", () => {
    expect(distinguishable(rgba("#A7A9FF"), rgba("#11141A"), 2)).toBe(true);
    expect(distinguishable(rgba("#A7A9FF"), rgba("#A8AAFF"), 2)).toBe(false);
  });

  it("keeps the subtree expectation away from the undimmed child", () => {
    const colors = palettes.dark.colors;
    const fixtures = opacityFixtures(colors);
    const child = rgba(fixtures.child);
    const dimmed = opacityBlend(
      child,
      DISABLED_OPACITY,
      rgba(colors.background),
    );
    expect(distinguishable(dimmed, child, 2)).toBe(true);
  });

  it("keeps a doubled opacity away from a single one", () => {
    const colors = palettes.dark.colors;
    const fill = rgba(colors.primary);
    const under = rgba(colors.background);
    const quarter = opacityBlend(fill, 0.25, under);
    const half = opacityBlend(fill, DISABLED_OPACITY, under);
    expect(distinguishable(quarter, half, 2)).toBe(true);
  });

  it("keeps the two-step nested paint within rounding of the ideal product", () => {
    const colors = palettes.dark.colors;
    const fill = rgba(colors.primary);
    const parent = rgba(colors.card);
    const under = rgba(colors.background);
    const stepped = nestedPaint(fill, parent, 0.5, 0.5, under);
    const product = opacityBlend(fill, 0.25, under);
    expect(Pixels.rgbaNear(stepped, product, 2)).toBe(true);
    expect(Pixels.rgbaNear(stepped, opacityBlend(fill, 0.5, under), 2)).toBe(
      false,
    );
  });
});

describe("opacityFixtures", () => {
  it("maps the roles the view paints", () => {
    const colors = palettes.dark.colors;
    const fixtures = opacityFixtures(colors);
    expect(fixtures).toEqual({
      rest: colors.primary,
      half: colors.primary,
      away: colors.card,
      parent: colors.card,
      child: colors.success,
      nested: colors.card,
      nestedChild: colors.primary,
    });
  });

  it("keeps the three sampled roles distinct in every palette", () => {
    const verdicts = Object.values(palettes).map((palette) =>
      distinctRoles(opacityFixtures(palette.colors)),
    );
    expect(verdicts.every(Boolean)).toBe(true);
  });
});

/**
 * The theme seam.
 *
 * The bugs these guard: `elevation` returned the theme's whole `BoxShadow[]`,
 * which `StyleDesc.boxShadow` cannot take, so a card rendered flat; the focus
 * ring was written with `outline*`, which 0.10.0 does not have, so no ring was
 * painted at all; and `focusRing` used a blur, which paints a halo instead of
 * the crisp ring a keyboard user needs.
 */

import { describe, expect, it } from "vitest";
import * as Arr from "effect/Array";
import { darkTheme, lightTheme, type Theme } from "@gpuixui/tokens";
import { elevation, focusRing } from "./theme.js";

const themes: ReadonlyArray<readonly [string, Theme]> = [
  ["light", lightTheme],
  ["dark", darkTheme],
];

describe("elevation", () => {
  it("returns one shadow, not the theme's list", () => {
    Arr.forEach(themes, ([, theme]) => {
      const shadow = elevation(theme, "md");
      expect(Arr.isArray(shadow)).toBe(false);
      expect(shadow).toEqual(theme.elevation.md[0]);
    });
  });

  it("is undefined for a level the theme leaves empty", () => {
    Arr.forEach(themes, ([, theme]) => {
      expect(elevation(theme, "overlay")).toBeUndefined();
    });
  });
});

describe("focusRing", () => {
  it("paints a crisp ring in the theme's ring colour", () => {
    Arr.forEach(themes, ([, theme]) => {
      const ring = focusRing(theme);
      expect(ring.boxShadow).toEqual({
        offsetX: 0,
        offsetY: 0,
        blurRadius: 0,
        spreadRadius: 2,
        color: theme.colors.ring,
      });
    });
  });

  it("uses no outline property, which 0.10.0 does not support", () => {
    const ring = focusRing(lightTheme);
    expect(Object.keys(ring)).toEqual(["boxShadow"]);
  });

  it("differs between themes", () => {
    expect(focusRing(lightTheme)).not.toEqual(focusRing(darkTheme));
  });
});

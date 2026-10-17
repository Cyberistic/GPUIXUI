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
import { elevation, focusRing, tone, withAlpha } from "./theme.js";

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

describe("withAlpha", () => {
  it("appends the alpha suffix to a six-digit hex colour", () => {
    expect(withAlpha("#158754", "4D")).toBe("#1587544D");
    expect(withAlpha("#000000", "12")).toBe("#00000012");
  });

  it("preserves the case of the colour", () => {
    expect(withAlpha("#abcdef", "12")).toBe("#abcdef12");
  });

  it("returns an unrecognised value unchanged, so it renders solid", () => {
    Arr.forEach(["red", "transparent", "", "#fff", "#1587544D"], (color) => {
      expect(withAlpha(color, "12")).toBe(color);
    });
  });
});

describe("tone", () => {
  it("uses the accent pair for info, which has no token role of its own", () => {
    Arr.forEach(themes, ([, theme]) => {
      const style = tone(theme, "info");
      expect(style.bg).toBe(theme.colors.accent);
      expect(style.fg).toBe(theme.colors.accentForeground);
      expect(style.border).toBe(withAlpha(theme.colors.accentForeground, "4D"));
    });
  });

  it("tints success and danger with their own role", () => {
    Arr.forEach(themes, ([, theme]) => {
      const success = tone(theme, "success");
      expect(success).toEqual({
        bg: withAlpha(theme.colors.success, "12"),
        border: withAlpha(theme.colors.success, "4D"),
        fg: theme.colors.success,
      });

      const danger = tone(theme, "danger");
      expect(danger.fg).toBe(theme.colors.destructive);
      expect(danger.bg).toBe(withAlpha(theme.colors.destructive, "12"));
    });
  });

  it("darkens the warning text in light mode, where the shade is too bright", () => {
    expect(tone(lightTheme, "warning").fg).toBe(
      lightTheme.colors.warningForeground,
    );
    expect(tone(darkTheme, "warning").fg).toBe(darkTheme.colors.warning);
  });

  it("reads the theme, so every tone changes between light and dark", () => {
    Arr.forEach(["info", "success", "warning", "danger"] as const, (value) => {
      expect(tone(lightTheme, value)).not.toEqual(tone(darkTheme, value));
    });
  });

  it("keeps text and fill distinct for every tone", () => {
    Arr.forEach(themes, ([, theme]) => {
      Arr.forEach(["info", "success", "warning", "danger"] as const, (value) => {
        const style = tone(theme, value);
        expect(style.fg).not.toBe(style.bg);
      });
    });
  });
});

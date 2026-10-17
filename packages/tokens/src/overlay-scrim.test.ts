/**
 * Guards the defect plan 099 fixed: `colors.overlay` — the modal scrim a Dialog
 * paints across the window — was exempt from the contrast contract, so
 * high-contrast dark's `#000000CC` scrim composited to `#000000` on its own pure
 * black canvas: a 1.000:1 backdrop that made a modal look like an ordinary
 * panel. The scrim is now composited over the four base surfaces and held to the
 * surface floor, and the AAA dark theme veils with light because no dark wash
 * can darken black.
 */
import { describe, expect, it } from "vitest";
import {
  compositeOver,
  contrastFloors,
  contrastRatio,
  darkTheme,
  extendTheme,
  getPlatformTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  lightTheme,
  overlaySurfaces,
  overlayWashPairs,
  themeContrastFailures,
  type Theme,
} from "./index.js";

const shipped: ReadonlyArray<readonly [string, Theme]> = [
  ["light", lightTheme],
  ["dark", darkTheme],
  ["high-contrast light", highContrastLightTheme],
  ["high-contrast dark", highContrastDarkTheme],
  ...(["darwin", "linux", "win32"] as const).flatMap((platform) =>
    (["light", "dark"] as const).map(
      (mode) =>
        [`${platform} ${mode}`, getPlatformTheme(platform, mode)] as const,
    ),
  ),
];

describe("modal scrim", () => {
  it("veils every base surface in every shipped colour set", () => {
    shipped.forEach(([label, theme]) => {
      overlaySurfaces.forEach((surface) => {
        const painted = compositeOver(
          theme.colors.overlay,
          theme.colors[surface],
        );
        expect(
          contrastRatio(painted, theme.colors[surface]),
          `${label}: overlay on ${surface}`,
        ).toBeGreaterThanOrEqual(contrastFloors[theme.contrast].surface);
      });
    });
  });

  it("reports the AAA dark scrim that painted nothing", () => {
    const regressed = extendTheme(highContrastDarkTheme, {
      colors: { overlay: "#000000CC" },
    });
    expect(themeContrastFailures(regressed)).toEqual([
      {
        foreground: "overlay",
        background: "background",
        wash: "overlay",
        pairClass: "surface",
        floor: contrastFloors.high.surface,
        ratio: 1,
      },
    ]);
  });

  it("keeps the AAA dark scrim a light veil, not the canvas", () => {
    expect(
      compositeOver(highContrastDarkTheme.colors.overlay, "#000000"),
    ).not.toBe("#000000");
  });

  it("covers the four base surfaces the scrim sits on", () => {
    expect(overlayWashPairs).toEqual([
      ["overlay", "background", "surface"],
      ["overlay", "card", "surface"],
      ["overlay", "muted", "surface"],
      ["overlay", "popover", "surface"],
    ]);
  });
});

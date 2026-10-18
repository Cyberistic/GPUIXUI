/**
 * Guards the defect plan 099 fixed: `colors.overlay` — the modal scrim a Dialog
 * paints across the window — was exempt from the contrast contract, so
 * high-contrast dark's `#000000CC` scrim composited to `#000000` on its own pure
 * black canvas: a 1.000:1 backdrop that made a modal look like an ordinary
 * panel. The scrim is composited over the surfaces a dialog covers and held to
 * the surface floor, and the AAA dark theme veils with light because no dark
 * wash can darken black.
 *
 * Plan 359 corrects the reasoning plan 099 used to leave the row washes out:
 * `hover`, `active` and `accent` are transient, but `selected` persists while a
 * modal opens over a table, list or tree, and `input` is the fill of every field
 * in the layout behind a form dialog. An `overlay` equal to macOS light's own
 * `selected` fill measured **1.000:1** on a selected row while this checker
 * returned `[]`, because the four base surfaces all passed.
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
  themeModes,
  type Theme,
} from "./index.js";

const shipped: ReadonlyArray<readonly [string, Theme]> = [
  ["light", lightTheme],
  ["dark", darkTheme],
  ["high-contrast light", highContrastLightTheme],
  ["high-contrast dark", highContrastDarkTheme],
  ...(["darwin", "linux", "win32"] as const).flatMap((platform) =>
    themeModes.map(
      (mode) =>
        [`${platform} ${mode}`, getPlatformTheme(platform, mode)] as const,
    ),
  ),
];

describe("modal scrim", () => {
  it("veils every surface a dialog covers in every shipped colour set", () => {
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

  it("covers the six surfaces a dialog sits on", () => {
    expect(overlayWashPairs).toEqual([
      ["overlay", "background", "surface"],
      ["overlay", "card", "surface"],
      ["overlay", "muted", "surface"],
      ["overlay", "input", "surface"],
      ["overlay", "selected", "surface"],
      ["overlay", "popover", "surface"],
    ]);
  });

  it("reports a scrim that disappears on a selected row", () => {
    const macos = getPlatformTheme("darwin", "light");
    const regressed = extendTheme(macos, {
      colors: { overlay: macos.colors.selected },
    });
    expect(themeContrastFailures(regressed)).toEqual([
      {
        foreground: "overlay",
        background: "selected",
        wash: "overlay",
        pairClass: "surface",
        floor: contrastFloors.default.surface,
        ratio: 1,
      },
    ]);
  });
});

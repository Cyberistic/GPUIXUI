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
 *
 * Plan 375 closes the same gap one composition over: a window also shows filled
 * actions and status panels, and a dialog opens over both. An `overlay` that
 * composites to a `primary` fill or to a soft status panel leaves that control
 * or Alert undimmed while the checker returns `[]`. The four resting filled
 * actions and the four soft status panels join the measured surfaces; the
 * transient pointer washes and the filled families' hover/press steps stay out.
 *
 * Plan 395 adds the resting fill plan 394 shipped: `softAction` is the raised
 * action an Alert or Toast paints, so a dialog opens over it too. Every shipped
 * set already clears the floor (AAA dark is tightest at 1.5519:1).
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  compositeOver,
  contrastFloors,
  contrastRatio,
  extendTheme,
  getPlatformTheme,
  highContrastDarkTheme,
  lightTheme,
  overlaySurfaces,
  overlayWashPairs,
  themeContrastFailures,
  type Theme,
  type ThemeColors,
} from "./index.js";

/** Every shipped colour set: identity, platform variants and recipes. */
const shipped: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

/** The persistent surfaces plan 375 adds to the scrim contract. */
const persistentSurfaces = [
  "primary",
  "secondary",
  "accent",
  "destructive",
  "softAction",
  "infoSoft",
  "successSoft",
  "warningSoft",
  "destructiveSoft",
] as const satisfies ReadonlyArray<keyof ThemeColors>;

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
    expect(
      themeContrastFailures(regressed).filter(
        ({ background }) => background === "background",
      ),
    ).toEqual([
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

  it("covers the surfaces a dialog sits over", () => {
    expect(overlayWashPairs).toEqual([
      ["overlay", "background", "surface"],
      ["overlay", "card", "surface"],
      ["overlay", "muted", "surface"],
      ["overlay", "input", "surface"],
      ["overlay", "selected", "surface"],
      ["overlay", "popover", "surface"],
      ["overlay", "primary", "surface"],
      ["overlay", "secondary", "surface"],
      ["overlay", "accent", "surface"],
      ["overlay", "destructive", "surface"],
      ["overlay", "softAction", "surface"],
      ["overlay", "infoSoft", "surface"],
      ["overlay", "successSoft", "surface"],
      ["overlay", "warningSoft", "surface"],
      ["overlay", "destructiveSoft", "surface"],
    ]);
  });

  it("reports a scrim that disappears on a selected row", () => {
    const macos = getPlatformTheme("darwin", "light");
    const regressed = extendTheme(macos, {
      colors: { overlay: macos.colors.selected },
    });
    expect(
      themeContrastFailures(regressed).filter(
        ({ background }) => background === "selected",
      ),
    ).toEqual([
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

  it("reports a scrim that disappears on a filled action or status panel", () => {
    persistentSurfaces.forEach((surface) => {
      const regressed = extendTheme(lightTheme, {
        colors: { overlay: lightTheme.colors[surface] },
      });
      expect(
        themeContrastFailures(regressed).filter(
          ({ background }) => background === surface,
        ),
        surface,
      ).toEqual([
        {
          foreground: "overlay",
          background: surface,
          wash: "overlay",
          pairClass: "surface",
          floor: contrastFloors.default.surface,
          ratio: 1,
        },
      ]);
    });
  });
});

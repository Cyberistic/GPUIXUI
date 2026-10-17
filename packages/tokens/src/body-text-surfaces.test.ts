/**
 * Guards the defect plan 088 fixed: default body text (`foreground`) was
 * measured on four of the six surfaces it paints. An avatar's fallback initials
 * sit on the `muted` disc (`components/avatar.tsx`) and a date picker's month
 * header sits on its `popover` (`components/date-picker.tsx`), and neither pair
 * was in the contrast contract — so an edited theme could make both unreadable
 * while every suite stayed green. The role-level completeness guard added by
 * plan 086 could not see this: `foreground` is measured *somewhere*.
 *
 * Every shipped set already clears the body floor on both surfaces, so no
 * colour moves. The pairs exist so a brand theme or a copied platform style that
 * darkens its quiet panel or floating surface is caught, and removing either
 * surface from the list makes the matching regression below fail.
 */
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getPlatformTheme,
  getTheme,
  themeContrastFailures,
  themeModes,
  type Theme,
} from "./index.js";

const bodyTextPairs = contrastPairs.filter(
  ([foreground, , pairClass]) =>
    foreground === "foreground" && pairClass === "body",
);

const themes: ReadonlyArray<readonly [string, Theme]> = [
  ["light", getTheme("light")],
  ["dark", getTheme("dark")],
  ["high-contrast light", getTheme("light", "high")],
  ["high-contrast dark", getTheme("dark", "high")],
  ...(["darwin", "linux", "win32"] as const).flatMap(
    (platform): ReadonlyArray<readonly [string, Theme]> =>
      themeModes.map((mode) => [
        `${platform} ${mode}`,
        getPlatformTheme(platform, mode),
      ]),
  ),
];

describe("default body text surfaces", () => {
  it("measures every surface foreground is painted on", () => {
    expect(bodyTextPairs.map(([, background]) => background)).toEqual([
      "background",
      "card",
      "muted",
      "popover",
      "hover",
      "active",
    ]);
  });

  it("clears the body floor on every shipped set and surface", () => {
    themes.forEach(([label, theme]) => {
      const floor = contrastFloors[theme.contrast].body;
      bodyTextPairs.forEach(([, surface]) => {
        expect(
          contrastRatio(theme.colors.foreground, theme.colors[surface]),
          `${label}: foreground on ${surface}`,
        ).toBeGreaterThanOrEqual(floor);
      });
    });
  });

  it("names the quiet-panel regression", () => {
    // A light theme whose quiet panel is dark: the avatar fallback disappears.
    const regressed = extendTheme(getTheme("light"), {
      colors: { muted: "#3D4552" },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground, background, wash }) =>
        wash === undefined &&
        foreground === "foreground" &&
        background === "muted",
    );

    expect(failures).toHaveLength(1);
    expect(failures[0]?.pairClass).toBe("body");
    expect(failures[0]?.floor).toBe(contrastFloors.default.body);
    expect(failures[0]?.ratio).toBeCloseTo(1.75, 2);
  });

  it("names the floating-surface regression", () => {
    const regressed = extendTheme(getTheme("light"), {
      colors: { popover: "#2A303B" },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground, background }) =>
        foreground === "foreground" && background === "popover",
    );

    expect(failures).toHaveLength(1);
    expect(failures[0]?.ratio).toBeCloseTo(1.27, 2);
  });
});

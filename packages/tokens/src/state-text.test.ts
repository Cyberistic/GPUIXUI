/**
 * Guards the defect plan 079 fixed: secondary text was measured on the plain
 * surfaces only, never on the washes a row paints behind it. macOS dark's
 * `mutedForeground` measured 4.41:1 on `hover` and 3.55:1 on `active` — under
 * the 4.5:1 floor the design system states — while every suite stayed green,
 * because no pair named a wash. The contract now holds `mutedForeground` on
 * `hover`, `active`, `accent` and `selected`, the four states a list row, a
 * combobox option and a menu item paint behind a description.
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

const washNames = ["hover", "active", "accent", "selected"] as const;

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

const secondaryWashPairs = contrastPairs.filter(
  ([foreground, background]) =>
    foreground === "mutedForeground" &&
    washNames.some((wash) => wash === background),
);

describe("secondary text on the state washes", () => {
  it("documents one pair per wash, so a theme cannot pass vacuously", () => {
    expect(
      secondaryWashPairs.map(([, background]) => background).toSorted(),
    ).toEqual([...washNames].toSorted());
  });

  it("clears the declared floor on every shipped theme", () => {
    themes.forEach(([label, theme]) => {
      const floor = contrastFloors[theme.contrast].secondary;
      secondaryWashPairs.forEach(([foreground, background]) => {
        expect(
          contrastRatio(theme.colors[foreground], theme.colors[background]),
          `${label}: ${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(floor);
      });
    });
  });

  it("keeps macOS dark readable on both pointer washes", () => {
    const macos = getPlatformTheme("darwin", "dark");
    const muted = macos.colors.mutedForeground;

    expect(contrastRatio(muted, macos.colors.hover)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(contrastRatio(muted, macos.colors.active)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(macos.colors.active).not.toBe(macos.colors.hover);
  });

  it("names the wash pair when a theme regresses", () => {
    const regressed = extendTheme(getPlatformTheme("darwin", "dark"), {
      // The pre-079 secondary grey: readable on the canvas, too quiet on a row.
      colors: { mutedForeground: "#A1A1A6" },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ background, wash }) =>
        wash === undefined && washNames.some((name) => name === background),
    );

    expect(failures.map(({ background }) => background).toSorted()).toEqual([
      "active",
      "hover",
      "selected",
    ]);
    expect(
      failures.every(
        ({ pairClass, floor }) => pairClass === "secondary" && floor === 4.5,
      ),
    ).toBe(true);
  });
});

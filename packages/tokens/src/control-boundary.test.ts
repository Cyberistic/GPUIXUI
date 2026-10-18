/**
 * Guards the defect plan 084 fixes: `borderStrong` is the edge of a field and of
 * an unchecked checkbox or radio, and those controls sit on a quiet panel and
 * inside rows whose fill changes with hover, press, selection and selection
 * accent. The contract measured it only on `background`, `card`, `input` and
 * `popover`, so a checkbox edge in a pressed row measured 2.62:1 on the identity
 * light set, 2.52:1 on macOS light, 2.81:1 on the identity dark and 4.15:1 on
 * high-contrast dark, under 3:1 / 4.5:1, while the suite stayed green.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getPlatformTheme,
  getTheme,
  lightTheme,
  themeContrastFailures,
  type Theme,
} from "./index.js";

const platforms = ["darwin", "linux", "win32"] as const;

const boundarySurfaces = [
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
] as const;

const variants: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

const boundaryPairs = contrastPairs.filter(
  ([foreground, background]) =>
    foreground === "borderStrong" &&
    boundarySurfaces.some((surface) => surface === background),
);

describe("the control boundary on the state washes", () => {
  it("keeps every shipped theme's boundary perceivable", () => {
    const failures = variants.flatMap(([label, theme]) =>
      boundaryPairs.flatMap(([foreground, background, pairClass]) => {
        const ratio = contrastRatio(
          theme.colors[foreground],
          theme.colors[background],
        );
        const floor = contrastFloors[theme.contrast][pairClass];
        return ratio >= floor
          ? []
          : [`${label}: ${foreground} on ${background} at ${ratio}`];
      }),
    );

    expect(failures).toEqual([]);
  });

  it("keeps a checkbox edge visible in a pressed row", () => {
    expect(lightTheme.colors.borderStrong).toBe("#737C8C");
    expect(getPlatformTheme("darwin", "light").colors.borderStrong).toBe(
      "#6E6E73",
    );

    const lightThemes: ReadonlyArray<readonly [string, Theme]> = [
      ["identity", getTheme("light")],
      ...platforms.map(
        (platform) => [platform, getPlatformTheme(platform, "light")] as const,
      ),
    ];

    lightThemes.forEach(([label, theme]) => {
      expect(
        contrastRatio(theme.colors.borderStrong, theme.colors.active),
        label,
      ).toBeGreaterThanOrEqual(contrastFloors.default.boundary);
    });
  });

  it("holds the high-contrast boundary to its floor on the pressed wash", () => {
    platforms.forEach((platform) => {
      const theme = getPlatformTheme(platform, "dark", "high");
      expect(theme.colors.borderStrong, platform).toBe("#AAAAAA");
      expect(
        contrastRatio(theme.colors.borderStrong, theme.colors.active),
        platform,
      ).toBeGreaterThanOrEqual(contrastFloors.high.boundary);
    });
  });

  it("names every wash when a theme regresses", () => {
    const regressed = extendTheme(getTheme("light"), {
      // Dim enough to fail on the quiet panel plan 309 lightened as well.
      colors: { borderStrong: "#9AA3B1" },
    });
    // The soft status fills have their own contract and suite (plan 092).
    const failures = themeContrastFailures(regressed).filter(({ background }) =>
      boundarySurfaces.some((surface) => surface === background),
    );

    expect(failures.map(({ background }) => background).toSorted()).toEqual(
      [...boundarySurfaces].toSorted(),
    );
    expect(
      failures.every(
        ({ foreground, pairClass, floor }) =>
          foreground === "borderStrong" &&
          pairClass === "boundary" &&
          floor === contrastFloors.default.boundary,
      ),
    ).toBe(true);
  });

  it("publishes one pair per boundary surface", () => {
    expect(boundaryPairs).toHaveLength(boundarySurfaces.length);
    expect(
      boundaryPairs.map(([, background]) => background).toSorted(),
    ).toEqual([...boundarySurfaces].toSorted());
  });
});

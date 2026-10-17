/**
 * Guards the defect plan 320 fixes: default body text (`foreground`) was
 * measured on the plain surfaces and the row washes, but not on the four soft
 * status fills. An Alert's description (`components/alert.tsx:181`) and its
 * ghost dismiss control (`internal/button.tsx:84`) paint `foreground` inside
 * the tone-tinted root (`toneSurface`, i.e. `xSoft`), so an edited theme could
 * erase the description while `themeContrastFailures` returned `[]`. The
 * role-level completeness guard could not see it: `foreground` is measured
 * somewhere.
 *
 * Every shipped identity, platform and recipe set clears the body floor on all
 * four fills, so no colour moves. The pairs exist so a brand theme or copied
 * platform style that darkens a soft fill is caught.
 */
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getPlatformRecipeTheme,
  getPlatformTheme,
  getTheme,
  platformNames,
  platformRecipeNames,
  themeContrastFailures,
  themeContrasts,
  themeModes,
  type Theme,
} from "./index.js";

const softSurfaces = [
  "infoSoft",
  "successSoft",
  "warningSoft",
  "destructiveSoft",
] as const;

const bodyTextPairs = contrastPairs.filter(
  ([foreground, , pairClass]) =>
    foreground === "foreground" && pairClass === "body",
);

const shippedThemes: ReadonlyArray<readonly [string, Theme]> = [
  ...themeModes.flatMap((mode) =>
    themeContrasts.map(
      (contrast) => [`${mode} ${contrast}`, getTheme(mode, contrast)] as const,
    ),
  ),
  ...platformNames.flatMap((platform) =>
    themeModes.map(
      (mode) =>
        [`${platform} ${mode}`, getPlatformTheme(platform, mode)] as const,
    ),
  ),
  ...platformRecipeNames.flatMap((recipe) =>
    themeModes.map(
      (mode) =>
        [`${recipe} ${mode}`, getPlatformRecipeTheme(recipe, mode)] as const,
    ),
  ),
];

describe("default body text on the soft status fills", () => {
  it("measures foreground on every soft status fill", () => {
    const measured = bodyTextPairs
      .map(([, background]) => background)
      .filter((background) =>
        softSurfaces.some((surface) => surface === background),
      );

    expect(measured).toEqual([...softSurfaces]);
  });

  it("clears the body floor on every shipped set", () => {
    shippedThemes.forEach(([label, theme]) => {
      const floor = contrastFloors[theme.contrast].body;
      softSurfaces.forEach((surface) => {
        expect(
          contrastRatio(theme.colors.foreground, theme.colors[surface]),
          `${label}: foreground on ${surface}`,
        ).toBeGreaterThanOrEqual(floor);
      });
    });
  });

  it("reports an Alert description erased by its own fill", () => {
    const regressions = [
      [
        "infoSoft",
        extendTheme(getTheme("light"), {
          colors: { infoSoft: "#191D25" },
        }),
      ],
      [
        "successSoft",
        extendTheme(getTheme("light"), {
          colors: { successSoft: "#191D25" },
        }),
      ],
      [
        "warningSoft",
        extendTheme(getTheme("light"), {
          colors: { warningSoft: "#191D25" },
        }),
      ],
      [
        "destructiveSoft",
        extendTheme(getTheme("light"), {
          colors: { destructiveSoft: "#191D25" },
        }),
      ],
    ] as const;

    regressions.forEach(([surface, theme]) => {
      const failures = themeContrastFailures(theme).filter(
        ({ foreground, background, wash }) =>
          wash === undefined &&
          foreground === "foreground" &&
          background === surface,
      );

      expect(failures, surface).toHaveLength(1);
      expect(failures[0]?.pairClass).toBe("body");
      expect(failures[0]?.floor).toBe(contrastFloors.default.body);
      expect(failures[0]?.ratio).toBeCloseTo(1, 5);
    });
  });
});

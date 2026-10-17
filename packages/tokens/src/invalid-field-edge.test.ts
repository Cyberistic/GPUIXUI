/**
 * Guards the defect plan 325 fixes: an invalid field signals its error with a
 * `destructive` border — `FieldInput` paints it on the `input` fill and the
 * ColorPicker hex field on the `background` canvas — but the contract measured
 * `destructive` only as a fill. An edited theme whose `destructive` approached
 * `input` could therefore erase the only error signal while
 * `themeContrastFailures` returned `[]`.
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
  platformRecipeNames,
  themeContrastFailures,
  themeContrasts,
  themeModes,
  type Theme,
} from "./index.js";

const platforms = ["darwin", "linux", "win32"] as const;

const variants: ReadonlyArray<readonly [string, Theme]> = themeModes.flatMap(
  (mode) =>
    themeContrasts.flatMap((contrast) => [
      [`identity ${mode} ${contrast}`, getTheme(mode, contrast)] as const,
      ...platforms.map(
        (platform) =>
          [
            `${platform} ${mode} ${contrast}`,
            getPlatformTheme(platform, mode, contrast),
          ] as const,
      ),
      ...platformRecipeNames.map(
        (recipe) =>
          [
            `${recipe} ${mode} ${contrast}`,
            getPlatformRecipeTheme(recipe, mode, contrast),
          ] as const,
      ),
    ]),
);

const invalidEdgePairs = contrastPairs.filter(
  ([foreground, , pairClass]) =>
    foreground === "destructive" && pairClass === "boundary",
);

describe("the invalid field edge", () => {
  it("publishes one boundary pair per field surface", () => {
    expect(
      invalidEdgePairs.map(([, background]) => background).toSorted(),
    ).toEqual(["background", "input"]);
    expect(new Set(invalidEdgePairs).size).toBe(invalidEdgePairs.length);
  });

  it("keeps every shipped theme's error edge perceivable", () => {
    const failures = variants.flatMap(([label, theme]) =>
      invalidEdgePairs.flatMap(([foreground, background, pairClass]) => {
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

  it("reports an edited theme whose error edge matches the field", () => {
    const base = getTheme("light");
    const regressed = extendTheme(base, {
      colors: { destructive: base.colors.input },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground, pairClass }) =>
        foreground === "destructive" && pairClass === "boundary",
    );

    expect(failures.map(({ background }) => background).toSorted()).toEqual([
      "background",
      "input",
    ]);
    expect(
      failures.every(({ floor }) => floor === contrastFloors.default.boundary),
    ).toBe(true);
  });
});

/**
 * Guards the defect plan 325 fixes: an invalid field signals its error with a
 * `destructive` border — `FieldInput` paints it on the `input` fill and the
 * ColorPicker hex field on the `background` canvas — but the contract measured
 * `destructive` only as a fill. An edited theme whose `destructive` approached
 * `input` could therefore erase the only error signal while
 * `themeContrastFailures` returned `[]`.
 *
 * Plan 340 later gives `destructive` boundary pairs on the surfaces an invalid
 * control's ring sits on, so this file reads only the two field surfaces the
 * edge itself paints.
 *
 * Plan 343 pins the complement: `primitives` currently paints an invalid field
 * with a solid `destructive` fill, and no shipped palette can carry the dark
 * `inputForeground` on it. The last case records that limitation and the
 * measured soft alternative while the cross-team fix lands.
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

const fieldSurfaces = ["background", "input"] as const;

const invalidEdgePairs = contrastPairs.filter(
  ([foreground, background, pairClass]) =>
    foreground === "destructive" &&
    pairClass === "boundary" &&
    fieldSurfaces.some((surface) => surface === background),
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
      ({ foreground, background, pairClass }) =>
        foreground === "destructive" &&
        pairClass === "boundary" &&
        fieldSurfaces.some((surface) => surface === background),
    );

    expect(failures.map(({ background }) => background).toSorted()).toEqual([
      "background",
      "input",
    ]);
    expect(
      failures.every(({ floor }) => floor === contrastFloors.default.boundary),
    ).toBe(true);
  });

  it("pins why the solid destructive fill cannot carry field text", () => {
    // Plan 343: `primitives` currently paints an invalid field with a solid
    // `destructive` fill behind `inputForeground`. No shipped palette can carry
    // that pair at the floors every designed invalid state needs, so the fix is
    // the input fill + destructive edge (or the measured soft pair), recorded
    // cross-team. If a future palette makes the solid fill legible, this fails
    // and the ledger row and design-system note must be revisited.
    const illegible = variants.flatMap(([label, theme]) => {
      const ratio = contrastRatio(
        theme.colors.inputForeground,
        theme.colors.destructive,
      );
      const floor = contrastFloors[theme.contrast].secondary;
      return ratio < floor ? [] : [`${label}: solid destructive at ${ratio}`];
    });
    const unreadableSoft = variants.flatMap(([label, theme]) => {
      const ratio = contrastRatio(
        theme.colors.destructiveSoftForeground,
        theme.colors.destructiveSoft,
      );
      const floor = contrastFloors[theme.contrast].body;
      return ratio >= floor ? [] : [`${label}: soft destructive at ${ratio}`];
    });

    expect(illegible).toEqual([]);
    expect(unreadableSoft).toEqual([]);
  });
});

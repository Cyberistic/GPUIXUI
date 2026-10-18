/**
 * Guards the defect plan 348 fixes: the shipped Toast paints its tone glyph and
 * its 3px tone bar with `statusTone(...).foreground` — `xSoftForeground`, the
 * role designed for its own `xSoft` fill — directly on the `popover` card
 * (`components/src/toast/viewport.tsx`). The contract measured each soft
 * foreground only on its own fill, so a copied theme that set
 * `warningSoftForeground` close to its `popover` erased the glyph and the bar
 * while `themeContrastFailures` returned `[]`.
 *
 * The pairs are the shipped composition, not the recommended one: the
 * `components` migration to `statusTone(...).text` (`xText`) is a cross-team
 * row, and plan 334 set the precedent of holding what is on screen until it
 * lands.
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
  lightTheme,
  platformNames,
  platformRecipeNames,
  statusTones,
  themeContrastFailures,
  themeContrasts,
  themeModes,
  toastTonePairs,
  type Theme,
} from "./index.js";

const realPlatforms = platformNames.filter((name) => name !== "default");

const variants: ReadonlyArray<readonly [string, Theme]> = themeModes.flatMap(
  (mode) =>
    themeContrasts.flatMap(
      (contrast): ReadonlyArray<readonly [string, Theme]> => [
        [`identity ${mode} ${contrast}`, getTheme(mode, contrast)],
        ...realPlatforms.map((platform): readonly [string, Theme] => [
          `${platform} ${mode} ${contrast}`,
          getPlatformTheme(platform, mode, contrast),
        ]),
        ...platformRecipeNames.map((recipe): readonly [string, Theme] => [
          `${recipe} ${mode} ${contrast}`,
          getPlatformRecipeTheme(recipe, mode, contrast),
        ]),
      ],
    ),
);

describe("the toast's tone on its floating card", () => {
  it("publishes the four tone pairs on the floating card", () => {
    expect(
      toastTonePairs.map(([foreground, background, pairClass]) => [
        foreground,
        background,
        pairClass,
      ]),
    ).toEqual(
      statusTones.map((tone) => [
        `${tone}SoftForeground`,
        "popover",
        "secondary",
      ]),
    );
    expect(contrastPairs).toEqual(expect.arrayContaining([...toastTonePairs]));
  });

  it("every shipped toast tone clears the secondary floor on its card", () => {
    const ratios = variants.flatMap(([name, theme]) =>
      statusTones.map((tone) => {
        const foreground = `${tone}SoftForeground` as const;
        const ratio = contrastRatio(
          theme.colors[foreground],
          theme.colors.popover,
        );
        expect(
          ratio,
          `${name} ${foreground} on popover`,
        ).toBeGreaterThanOrEqual(contrastFloors[theme.contrast].secondary);
        return ratio;
      }),
    );
    // The shipped margin is wide; pin it so a palette edit that shrinks it is
    // visible in the diff rather than silently approaching the floor.
    expect(Math.min(...ratios)).toBeGreaterThan(11);
  });

  it("reports a soft foreground that matches the floating card", () => {
    const erased = extendTheme(lightTheme, {
      colors: { warningSoftForeground: lightTheme.colors.popover },
    });

    expect(themeContrastFailures(erased)).toContainEqual({
      foreground: "warningSoftForeground",
      background: "popover",
      pairClass: "secondary",
      ratio: 1,
      floor: contrastFloors.default.secondary,
    });
  });

  it("the secondary floor covers the tone bar's mark floor at both levels", () => {
    expect(
      Object.values(contrastFloors).map(
        (floors) => floors.secondary >= floors.mark,
      ),
    ).toEqual([true, true]);
  });
});

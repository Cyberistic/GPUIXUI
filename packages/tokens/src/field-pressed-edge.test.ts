/**
 * Guards the defect plan 343 fixes: a pressed field repaints its border with
 * `ring` on its own `input` fill (`fieldVariant.active` in `primitives`), but
 * the contract measured `ring` only on the surfaces a focus shadow sits on —
 * outside the control. An edited theme whose `ring` equalled `input` could
 * therefore erase the pressed edge while `themeContrastFailures` returned `[]`.
 *
 * The hover edge (`borderStrong` on `input`) was already a boundary pair, so
 * this file closes the asymmetric half.
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

const pressedEdgePairs = contrastPairs.filter(
  ([foreground, background]) => foreground === "ring" && background === "input",
);

describe("the pressed field edge", () => {
  it("publishes one boundary pair on the field's own fill", () => {
    expect(pressedEdgePairs).toHaveLength(1);
    expect(pressedEdgePairs[0]?.[2]).toBe("boundary");
  });

  it("keeps every shipped theme's pressed edge perceivable", () => {
    const failures = variants.flatMap(([label, theme]) => {
      const ratio = contrastRatio(theme.colors.ring, theme.colors.input);
      const floor = contrastFloors[theme.contrast].boundary;
      return ratio >= floor
        ? []
        : [`${label}: ring on input at ${ratio.toFixed(3)}`];
    });

    expect(failures).toEqual([]);
  });

  it("reports an edited theme whose pressed edge matches the field", () => {
    const base = getTheme("light");
    const regressed = extendTheme(base, {
      colors: { ring: base.colors.input },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground, background }) =>
        foreground === "ring" && background === "input",
    );

    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      foreground: "ring",
      background: "input",
      pairClass: "boundary",
      floor: contrastFloors.default.boundary,
      ratio: 1,
    });
  });

  it("keeps the focus shadow and the pressed edge distinct", () => {
    const pairs = contrastPairs.map(([foreground, background, pairClass]) => [
      foreground,
      background,
      pairClass,
    ]);

    expect(pairs).toContainEqual(["ring", "card", "boundary"]);
    expect(pairs).toContainEqual(["ring", "input", "boundary"]);
    expect(pressedEdgePairs).toHaveLength(1);
  });
});

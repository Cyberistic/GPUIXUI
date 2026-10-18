/**
 * Guards the defect plan 506 fixes: a selected row paints two text roles — its
 * title is `foreground` (plan 312: `ListItemTitle` overrides the row's inherited
 * colour) and the label beside it keeps the secondary-strength
 * `selectedForeground` — but the selection contract measured only the second
 * through the composited wash. Dragging across a selected title therefore had no
 * pair behind it: identity dark measured **6.480:1**, Linux dark 6.648:1 and the
 * Windows palette 6.908:1 on the five dark sets (identity, Linux, Windows, XP and
 * Aero), under the 7:1 body floor, while `themeContrastFailures` returned `[]`.
 *
 * `selectionPairs` now carries `foreground` on `selected` beside the inherited
 * label, and three dark values move: the identity wash 20% → 14%, the Windows (and
 * XP and Aero) wash 40% → 26%, and Linux dark's selected fill one designed step
 * darker, because its wash cannot soften far enough without falling under the
 * 1.05:1 highlight floor.
 */

import { describe, expect, it } from "vitest";
import {
  alpha,
  compositeOver,
  contrastFloors,
  contrastRatio,
  extendTheme,
  getPlatformRecipeTheme,
  getPlatformTheme,
  getTheme,
  selectionPairs,
  selectionSurfaces,
  shippedThemes,
  themeContrastFailures,
  type Theme,
} from "./index.js";

const titleRatio = (theme: Theme): number =>
  contrastRatio(
    theme.colors.foreground,
    compositeOver(theme.colors.selection, theme.colors.selected),
  );

const washRatio = (theme: Theme): number =>
  Math.min(
    ...selectionSurfaces.map((surface) =>
      contrastRatio(
        compositeOver(theme.colors.selection, theme.colors[surface]),
        theme.colors[surface],
      ),
    ),
  );

const softSurfaces = [
  "infoSoft",
  "successSoft",
  "warningSoft",
  "destructiveSoft",
] as const;

const softWashRatio = (theme: Theme): number =>
  Math.min(
    ...softSurfaces.map((surface) =>
      contrastRatio(
        compositeOver(theme.colors.selection, theme.colors[surface]),
        theme.colors[surface],
      ),
    ),
  );

const moved: ReadonlyArray<readonly [string, Theme]> = [
  ["identity dark", getTheme("dark")],
  ["Linux dark", getPlatformTheme("linux", "dark")],
  ["Windows dark", getPlatformTheme("win32", "dark")],
  ["Windows XP dark", getPlatformRecipeTheme("xp", "dark")],
  ["Windows 7 dark", getPlatformRecipeTheme("aero", "dark")],
];

describe("a selected row's title through the selection wash", () => {
  it("keeps every shipped title at its body floor", () => {
    const failures = shippedThemes.flatMap(({ theme }) => {
      const ratio = titleRatio(theme);
      const floor = contrastFloors[theme.contrast].body;
      return ratio >= floor ? [] : [`${theme.name}: ${ratio.toFixed(3)}`];
    });

    expect(failures).toEqual([]);
    expect(titleRatio(getTheme("dark"))).toBeCloseTo(7.144, 3);
  });

  it("publishes the pair beside the inherited label", () => {
    const pair = ["foreground", "selected", "body"] as const;
    const matches = selectionPairs.filter(
      ([foreground, background, pairClass]) =>
        foreground === pair[0] &&
        background === pair[1] &&
        pairClass === pair[2],
    );

    expect(matches).toEqual([pair]);
    expect(selectionPairs).toHaveLength(20);
    expect(selectionPairs).toContainEqual([
      "selectedForeground",
      "selected",
      "secondary",
    ]);
  });

  it("reports a wash that erases the title", () => {
    const base = getTheme("dark");
    const erased = extendTheme(base, {
      colors: { selection: alpha(base.colors.foreground, 0.9) },
    });

    const failures = themeContrastFailures(erased).filter(
      (failure) =>
        failure.foreground === "foreground" &&
        failure.background === "selected" &&
        failure.wash === "selection",
    );

    expect(failures).toEqual([
      expect.objectContaining({
        foreground: "foreground",
        background: "selected",
        wash: "selection",
        pairClass: "body",
      }),
    ]);
  });

  it("keeps the moved washes perceivable highlights", () => {
    moved.forEach(([name, theme]) =>
      expect(washRatio(theme), name).toBeGreaterThanOrEqual(
        contrastFloors.default.surface,
      ),
    );
    moved.forEach(([name, theme]) =>
      expect(softWashRatio(theme), name).toBeGreaterThanOrEqual(
        contrastFloors.default.surface,
      ),
    );

    expect(washRatio(getTheme("dark"))).toBeCloseTo(1.264, 3);
    expect(washRatio(getPlatformTheme("linux", "dark"))).toBeCloseTo(1.125, 3);
    expect(washRatio(getPlatformTheme("win32", "dark"))).toBeCloseTo(1.136, 3);
    expect(softWashRatio(getPlatformTheme("win32", "dark"))).toBeCloseTo(
      1.071,
      3,
    );
  });

  it("keeps Linux dark's selected row a step past its accent wash", () => {
    const theme = getPlatformTheme("linux", "dark");
    expect(
      contrastRatio(theme.colors.selected, theme.colors.accent),
    ).toBeCloseTo(1.216, 3);
  });

  it("quotes the five moved titles", () => {
    expect(
      moved.map(([name, theme]) => [
        name,
        Number(titleRatio(theme).toFixed(3)),
      ]),
    ).toEqual([
      ["identity dark", 7.144],
      ["Linux dark", 7.389],
      ["Windows dark", 7.164],
      ["Windows XP dark", 7.164],
      ["Windows 7 dark", 7.164],
    ]);
  });
});

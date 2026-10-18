/**
 * Guards the gap plan 362 closes: a status panel carries three text roles — the
 * tone's own foreground, the body an `AlertDescription` or ghost dismiss control
 * paints, and the quiet caption plan 346 added — and the selection contract
 * measured only the tone's foreground through the wash. A reader copies an
 * Alert's description or a Toast's caption, so an edited theme whose wash,
 * accent or soft tint made either unreadable returned `[]` from
 * `themeContrastFailures` while the same edit on a plain surface was reported.
 *
 * `primaryText` stays out on purpose: plan 087 documents that accent-toned text
 * under a wash is not guaranteed at AAA, and this suite records the measured
 * reason (macOS light measures 4.32:1 through the wash on `infoSoft`, under the
 * 4.5:1 secondary floor).
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  compositeOver,
  contrastFloors,
  contrastRatio,
  extendTheme,
  getPlatformRecipeTheme,
  getPlatformTheme,
  getTheme,
  lightTheme,
  platformNames,
  platformRecipeNames,
  selectionSoftPairs,
  themeContrastFailures,
  themeModes,
  type PlatformName,
  type PlatformRecipeName,
  type Theme,
  type ThemeColors,
} from "./index.js";

const softFills = [
  "infoSoft",
  "successSoft",
  "warningSoft",
  "destructiveSoft",
] as const;

const platformLabels: Readonly<Record<PlatformName, string>> = {
  darwin: "macOS",
  linux: "Linux",
  win32: "Windows",
  default: "Default",
};

const recipeLabels: Readonly<Record<PlatformRecipeName, string>> = {
  xp: "XP",
  aero: "Aero",
};

type Case = readonly [string, Theme];

const shipped: ReadonlyArray<Case> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

/** The sets the catalogue quotes a tightest figure for. */
const quoted: ReadonlyArray<Case> = [
  ...themeModes.map((mode): Case => [`identity ${mode}`, getTheme(mode)]),
  ...platformNames
    .filter((platform) => platform !== "default")
    .flatMap((platform) =>
      themeModes.map(
        (mode): Case => [
          `${platformLabels[platform]} ${mode}`,
          getPlatformTheme(platform, mode),
        ],
      ),
    ),
  ...platformRecipeNames.map(
    (recipe): Case => [
      `${recipeLabels[recipe]} light`,
      getPlatformRecipeTheme(recipe, "light"),
    ],
  ),
];

const washed = (theme: Theme, fill: keyof ThemeColors): string =>
  compositeOver(theme.colors.selection, theme.colors[fill]);

const tightest = (
  foreground: keyof ThemeColors,
  background: keyof ThemeColors,
): readonly [string, number] =>
  quoted
    .map(
      ([label, theme]) =>
        [
          label,
          contrastRatio(theme.colors[foreground], washed(theme, background)),
        ] as const,
    )
    .reduce((worst, current) => (current[1] < worst[1] ? current : worst));

describe("text selection in a status panel", () => {
  it("keeps every shipped set above its floor", () => {
    const failures = shipped.flatMap(([label, theme]) =>
      selectionSoftPairs.flatMap(([foreground, background, pairClass]) => {
        const ratio = contrastRatio(
          theme.colors[foreground],
          washed(theme, background),
        );
        const floor = contrastFloors[theme.contrast][pairClass];
        return ratio >= floor
          ? []
          : [`${label}: ${foreground} on ${background} at ${ratio}`];
      }),
    );

    expect(failures).toEqual([]);
  });

  it("is the three text roles on the four soft fills", () => {
    expect(selectionSoftPairs).toHaveLength(12);
    expect(
      selectionSoftPairs.map(([foreground, background, pairClass]) => [
        foreground,
        background,
        pairClass,
      ]),
    ).toEqual(
      softFills.flatMap((fill) => [
        [`${fill}Foreground`, fill, "body"],
        ["foreground", fill, "body"],
        ["mutedForeground", fill, "secondary"],
      ]),
    );
  });

  it("quotes the tightest shipped body and caption", () => {
    const quotedFigures = [
      ["foreground", "infoSoft", "identity dark", 8.14],
      ["mutedForeground", "destructiveSoft", "Aero light", 4.78],
    ] as const;

    quotedFigures.forEach(([foreground, background, label, value]) => {
      const [actualLabel, ratio] = tightest(foreground, background);

      expect(
        [actualLabel, Number(ratio.toFixed(2))],
        `${foreground}/${background}`,
      ).toEqual([label, value]);
    });
  });

  it("reports a selected description that matches its soft fill", () => {
    const edited = extendTheme(lightTheme, {
      colors: { infoSoft: lightTheme.colors.foreground },
    });
    const reported = themeContrastFailures(edited).filter(
      (failure) =>
        failure.wash === "selection" &&
        failure.foreground === "foreground" &&
        failure.background === "infoSoft",
    );

    expect(reported).toEqual([
      {
        foreground: "foreground",
        background: "infoSoft",
        wash: "selection",
        pairClass: "body",
        floor: contrastFloors.default.body,
        ratio: contrastRatio(
          edited.colors.foreground,
          washed(edited, "infoSoft"),
        ),
      },
    ]);
  });

  it("reports a selected caption that matches its soft fill", () => {
    const edited = extendTheme(lightTheme, {
      colors: { warningSoft: lightTheme.colors.mutedForeground },
    });
    const reported = themeContrastFailures(edited).filter(
      (failure) =>
        failure.wash === "selection" &&
        failure.foreground === "mutedForeground" &&
        failure.background === "warningSoft",
    );

    expect(reported).toEqual([
      {
        foreground: "mutedForeground",
        background: "warningSoft",
        wash: "selection",
        pairClass: "secondary",
        floor: contrastFloors.default.secondary,
        ratio: contrastRatio(
          edited.colors.mutedForeground,
          washed(edited, "warningSoft"),
        ),
      },
    ]);
  });

  it("leaves accent-toned text out, with its measured reason", () => {
    expect(
      selectionSoftPairs.some(([foreground]) => foreground === "primaryText"),
    ).toBe(false);

    const macosLight = getPlatformTheme("darwin", "light");
    const washedLink = contrastRatio(
      macosLight.colors.primaryText,
      washed(macosLight, "infoSoft"),
    );

    expect(Number(washedLink.toFixed(2))).toBe(4.32);
    expect(washedLink).toBeLessThan(contrastFloors.default.secondary);
  });
});

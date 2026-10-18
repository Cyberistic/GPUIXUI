/**
 * Guards the gap plan 346 closes: the contrast contract measured body text,
 * soft tone text, the inactive label, the control boundary, the focus ring and
 * the divider on the four soft status fills, but not a status panel's caption
 * (`mutedForeground`) or its link/action (`primaryText`). `AlertDescription` is
 * documented as a container that may hold an action, and the primitives `Link`
 * paints `primaryText`, so an edited theme could set either role equal to a soft
 * fill while `themeContrastFailures` returned `[]`.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  contrastFloors,
  contrastRatio,
  extendTheme,
  getPlatformRecipeTheme,
  getPlatformTheme,
  getTheme,
  lightTheme,
  platformNames,
  platformRecipeNames,
  softPanelTextPairs,
  statusTones,
  themeContrastFailures,
  themeModes,
  type PlatformName,
  type PlatformRecipeName,
  type Theme,
  type ThemeColors,
} from "./index.js";
import { statusPanelTextStyles } from "./status-panel.example.js";

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

const quotedSets: ReadonlyArray<Case> = [
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

const tightest = (
  foreground: keyof ThemeColors,
  background: keyof ThemeColors,
): readonly [string, number] =>
  quotedSets
    .map(
      ([label, theme]) =>
        [
          label,
          contrastRatio(theme.colors[foreground], theme.colors[background]),
        ] as const,
    )
    .reduce((worst, current) => (current[1] < worst[1] ? current : worst));

describe("soft status panel text", () => {
  it("keeps every shipped set above the secondary floor", () => {
    const failures = shipped.flatMap(([label, theme]) =>
      softPanelTextPairs.flatMap(([foreground, background, pairClass]) => {
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

  it("quotes the weakest shipped caption and link", () => {
    const quoted = [
      ["mutedForeground", "destructiveSoft", "Aero light", 6.61],
      ["primaryText", "destructiveSoft", "identity light", 6.19],
    ] as const;

    quoted.forEach(([foreground, background, label, value]) => {
      const [actualLabel, ratio] = tightest(foreground, background);

      expect(
        [actualLabel, Number(ratio.toFixed(2))],
        `${foreground}/${background}`,
      ).toEqual([label, value]);
    });
  });

  it("reports a caption that matches its soft fill", () => {
    const edited = extendTheme(lightTheme, {
      colors: { infoSoft: lightTheme.colors.mutedForeground },
    });
    const reported = themeContrastFailures(edited).filter(
      (failure) =>
        failure.wash === undefined &&
        failure.foreground === "mutedForeground" &&
        failure.background === "infoSoft",
    );

    expect(reported).toEqual([
      {
        foreground: "mutedForeground",
        background: "infoSoft",
        pairClass: "secondary",
        floor: 4.5,
        ratio: 1,
      },
    ]);
  });

  it("reports a link that matches its soft fill", () => {
    const edited = extendTheme(lightTheme, {
      colors: { warningSoft: lightTheme.colors.primaryText },
    });
    const reported = themeContrastFailures(edited).filter(
      (failure) =>
        failure.wash === undefined &&
        failure.foreground === "primaryText" &&
        failure.background === "warningSoft",
    );

    expect(reported).toEqual([
      {
        foreground: "primaryText",
        background: "warningSoft",
        pairClass: "secondary",
        floor: 4.5,
        ratio: 1,
      },
    ]);
  });

  it("resolves the example's caption and link to the contract roles", () => {
    expect(softPanelTextPairs).toHaveLength(8);
    softPanelTextPairs.forEach(([foreground, background, pairClass]) => {
      expect(pairClass).toBe("secondary");
      expect(["mutedForeground", "primaryText"]).toContain(foreground);
      expect(softFills).toContain(background);
    });

    statusTones.forEach((tone) => {
      const styles = statusPanelTextStyles(lightTheme, tone);
      expect(styles.caption.color).toBe(lightTheme.colors.mutedForeground);
      expect(styles.link.color).toBe(lightTheme.colors.primaryText);
      expect(styles.body.color).toBe(lightTheme.colors.foreground);
      expect(styles.title.color).toBe(
        lightTheme.colors[`${tone}SoftForeground`],
      );
    });
  });
});

/**
 * Guards the gap plan 363 closes: a card carries two text roles — the default
 * `foreground` a `CardTitle` paints and its own `cardForeground`, which a
 * context menu trigger sets on its `card` fill — and the selection contract
 * named only `foreground`. The pair was measured on the card at rest but never
 * through the wash, so a theme whose card text passed statically could lose its
 * body floor once a selection covered it while `themeContrastFailures`
 * returned `[]`. The two roles are not aliases: both Windows recipes ship them
 * apart (`xp` light `#191D25`/`#1A1A1A`, `aero` light `#191D25`/`#101828`).
 */
import { describe, expect, it } from "vitest";
import {
  compositeOver,
  contrastFloors,
  contrastRatio,
  darkTheme,
  extendTheme,
  getPlatformRecipeTheme,
  getPlatformTheme,
  getTheme,
  platformNames,
  platformRecipeNames,
  selectionPairs,
  themeContrastFailures,
  themeContrasts,
  themeModes,
  type PlatformName,
  type PlatformRecipeName,
  type Theme,
} from "./index.js";

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

const shipped: ReadonlyArray<Case> = [
  ...themeModes.flatMap((mode) =>
    themeContrasts.map(
      (contrast): Case => [
        `identity ${mode} ${contrast}`,
        getTheme(mode, contrast),
      ],
    ),
  ),
  ...platformNames
    .filter((platform) => platform !== "default")
    .flatMap((platform) =>
      themeModes.flatMap((mode) =>
        themeContrasts.map(
          (contrast): Case => [
            `${platformLabels[platform]} ${mode} ${contrast}`,
            getPlatformTheme(platform, mode, contrast),
          ],
        ),
      ),
    ),
  ...platformRecipeNames.flatMap((recipe) =>
    themeModes.flatMap((mode) =>
      themeContrasts.map(
        (contrast): Case => [
          `${recipeLabels[recipe]} ${mode} ${contrast}`,
          getPlatformRecipeTheme(recipe, mode, contrast),
        ],
      ),
    ),
  ),
];

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

const selectedCard = (theme: Theme): number =>
  contrastRatio(
    theme.colors.cardForeground,
    compositeOver(theme.colors.selection, theme.colors.card),
  );

describe("the card's own foreground through a text selection", () => {
  it("measures both roles a card carries", () => {
    expect(selectionPairs).toHaveLength(19);
    expect(selectionPairs).toContainEqual(["foreground", "card", "body"]);
    expect(selectionPairs).toContainEqual(["cardForeground", "card", "body"]);
  });

  it("keeps every shipped set above the body floor", () => {
    const failures = shipped.flatMap(([label, theme]) => {
      const ratio = selectedCard(theme);
      const floor = contrastFloors[theme.contrast].body;
      return ratio >= floor
        ? []
        : [`${label}: cardForeground over selection on card at ${ratio}`];
    });

    expect(failures).toEqual([]);
  });

  it("quotes the tightest shipped figure", () => {
    const [label, theme] = quoted.reduce((worst, current) =>
      selectedCard(current[1]) < selectedCard(worst[1]) ? current : worst,
    );

    expect([label, Number(selectedCard(theme).toFixed(2))]).toEqual([
      "Windows dark",
      9.07,
    ]);
  });

  it("reports card text the wash erases", () => {
    const washed = compositeOver(
      darkTheme.colors.selection,
      darkTheme.colors.card,
    );
    const edited = extendTheme(darkTheme, {
      colors: { cardForeground: washed },
    });
    const reported = themeContrastFailures(edited).filter(
      (failure) =>
        failure.wash === "selection" &&
        failure.foreground === "cardForeground" &&
        failure.background === "card",
    );

    expect(reported).toEqual([
      {
        foreground: "cardForeground",
        background: "card",
        wash: "selection",
        pairClass: "body",
        floor: contrastFloors.default.body,
        ratio: contrastRatio(
          edited.colors.cardForeground,
          compositeOver(edited.colors.selection, edited.colors.card),
        ),
      },
    ]);
  });

  it("is a real difference in the shipped recipes", () => {
    platformRecipeNames.forEach((recipe) => {
      const theme = getPlatformRecipeTheme(recipe, "light");
      expect(
        theme.colors.cardForeground === theme.colors.foreground,
        recipe,
      ).toBe(false);
    });
  });
});

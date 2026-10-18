/**
 * Guards the gap plan 362 closes: a status panel carries text roles — the tone's
 * own foreground, the body an `AlertDescription` paints, and the quiet caption
 * plan 346 added — and the selection contract measured only the tone's
 * foreground through the wash. A reader copies an Alert's description or a
 * Toast's caption, so an edited theme whose wash, accent or soft tint made
 * either unreadable returned `[]` from `themeContrastFailures` while the same
 * edit on a plain surface was reported.
 *
 * Plan 394 later moved the ghost dismiss control's label to
 * `softActionForeground`; plan 362 could not have named that fourth role, so a
 * theme whose label was readable at rest could lose the body floor through the
 * wash while every check returned `[]`. Identity light with
 * `softActionForeground: "#444444"` measures 7.347–7.556:1 at rest and
 * 5.685–5.847:1 through the wash (plan 512).
 *
 * `primaryText` was out on purpose until plan 528: plan 087 documented that
 * accent-toned text under a wash was not guaranteed at AAA, with macOS light at
 * 4.32:1 through the wash on `infoSoft` — under the default secondary floor.
 * Plan 528 measured the role on all thirteen surfaces, moved seven values and
 * closed the omission (`selectionLinkPairs`), so the suite now asserts the link
 * is covered here too.
 */
import { readFileSync } from "node:fs";
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
  selectionLinkPairs,
  selectionSoftPairs,
  themeContrastFailures,
  themeFailures,
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

  it("is the four text roles on the four soft fills", () => {
    expect(selectionSoftPairs).toHaveLength(16);
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
        ["softActionForeground", fill, "body"],
        ["mutedForeground", fill, "secondary"],
      ]),
    );
  });

  it("reports the panel action's label a theme loses through the wash", () => {
    const faded = extendTheme(getTheme("light"), {
      colors: { softActionForeground: "#444444" },
    });

    softFills.forEach((fill) => {
      expect(
        contrastRatio(faded.colors.softActionForeground, faded.colors[fill]),
        `${fill} at rest`,
      ).toBeGreaterThanOrEqual(contrastFloors.default.body);
    });

    const failures = themeContrastFailures(faded).filter(
      ({ foreground, wash }) =>
        foreground === "softActionForeground" && wash === "selection",
    );

    expect(failures.map(({ background }) => background)).toEqual(softFills);
    expect(
      failures.every(
        ({ pairClass, floor }) =>
          pairClass === "body" && floor === contrastFloors.default.body,
      ),
    ).toBe(true);
    expect(
      failures.find(({ background }) => background === "destructiveSoft")
        ?.ratio,
    ).toBeCloseTo(5.69, 1);
    expect(
      themeFailures(faded).some(
        (failure) =>
          failure.kind === "contrast" &&
          failure.foreground === "softActionForeground",
      ),
    ).toBe(true);
  });

  it("keeps the ghost action on the designed washes in the public JSDoc", () => {
    // check-tests-ok: a documentation guard reads the source module as text.
    const styles = readFileSync(new URL("./styles.ts", import.meta.url), "utf8")
      .replace(/\s*\*\s*/g, " ")
      .replace(/\s+/g, " ");

    expect(styles).toContain(
      "paints `softActionHover` and `softActionActive` on the panel",
    );
    expect(styles).not.toContain("uses `hover` and `active` on the panel");
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

  it("covers the accent-toned link, since plan 528 closed the omission", () => {
    expect(
      selectionLinkPairs.some(([foreground]) => foreground === "primaryText"),
    ).toBe(true);

    const macosLight = getPlatformTheme("darwin", "light");
    const washedLink = contrastRatio(
      macosLight.colors.primaryText,
      washed(macosLight, "infoSoft"),
    );

    expect(washedLink).toBeGreaterThanOrEqual(contrastFloors.default.secondary);
  });
});

/**
 * Guards the gap plan 314 closed. The contract measured a row's own label on
 * the four washes (plan 312) and status text on those washes (plan 083), but
 * not the three surfaces a real composition paints:
 *
 * - a selected `Select` option paints `popoverForeground` on `selected`
 *   (`selectItemStyle` in `packages/primitives`), and `rowTextPairs` measured
 *   that role only on `hover`/`active`;
 * - a status label or indicator dot in a sidebar paints `xText` on the quiet
 *   `muted` panel — the surface plans 300 and 309 made first class — but plan
 *   083 measured only the four row washes;
 * - a `primaryText` link nested in a selectable list row sits on `accent` when
 *   the row is hovered and on `selected` when it is selected, and plan 082
 *   measured the role on six surfaces that stop at `hover`/`active`.
 *
 * An edited theme could erase any of them while `themeContrastFailures`
 * returned `[]`. All shipped sets pass, so no colour moves.
 */
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getPlatformTheme,
  getPlatformRecipeTheme,
  getTheme,
  lightColors,
  platformNames,
  platformRecipeNames,
  statusTones,
  themeContrastFailures,
  themeContrasts,
  themeModes,
  type ContrastPair,
  type Theme,
} from "./index.js";
import type { ThemeColors } from "./color.js";

const realPlatforms = platformNames.filter((name) => name !== "default");

const themes: ReadonlyArray<readonly [string, Theme]> = [
  ...themeModes.flatMap((mode) =>
    themeContrasts.flatMap(
      (contrast): ReadonlyArray<readonly [string, Theme]> => [
        [`identity ${mode} ${contrast}`, getTheme(mode, contrast)],
        ...realPlatforms.map((platform): readonly [string, Theme] => [
          `${platform} ${mode} ${contrast}`,
          getPlatformTheme(platform, mode, contrast),
        ]),
      ],
    ),
  ),
  ...themeModes.flatMap((mode) =>
    themeContrasts.flatMap((contrast) =>
      platformRecipeNames.map((recipe): readonly [string, Theme] => [
        `${recipe} ${mode} ${contrast}`,
        getPlatformRecipeTheme(recipe, mode, contrast),
      ]),
    ),
  ),
];

const pairsOf = (
  foreground: keyof ThemeColors,
  background: keyof ThemeColors,
) =>
  contrastPairs.filter(
    ([role, surface]) => role === foreground && surface === background,
  );

const hasFailure = (
  theme: Theme,
  foreground: keyof ThemeColors,
  background: keyof ThemeColors,
): boolean =>
  themeContrastFailures(theme).some(
    (failure) =>
      failure.foreground === foreground && failure.background === background,
  );

describe("row, sidebar and link surfaces", () => {
  it("documents one pair for each composition, in its class", () => {
    const expected: ReadonlyArray<
      readonly [keyof ThemeColors, keyof ThemeColors, ContrastPair[2]]
    > = [
      ["popoverForeground", "selected", "body"],
      ["infoText", "muted", "secondary"],
      ["successText", "muted", "secondary"],
      ["warningText", "muted", "secondary"],
      ["destructiveText", "muted", "secondary"],
      ["primaryText", "accent", "secondary"],
      ["primaryText", "selected", "secondary"],
    ];

    expected.forEach(([foreground, background, pairClass]) => {
      const pairs = pairsOf(foreground, background);
      expect(pairs, `${foreground} on ${background}`).toEqual([
        [foreground, background, pairClass],
      ]);
    });
  });

  it("keeps every shipped theme above its declared floor", () => {
    const candidates = [
      ...pairsOf("popoverForeground", "selected"),
      ...pairsOf("infoText", "muted"),
      ...pairsOf("successText", "muted"),
      ...pairsOf("warningText", "muted"),
      ...pairsOf("destructiveText", "muted"),
      ...pairsOf("primaryText", "accent"),
      ...pairsOf("primaryText", "selected"),
    ];

    const failures = themes.flatMap(([label, theme]) =>
      candidates.flatMap(([foreground, background, pairClass]) => {
        const floor = contrastFloors[theme.contrast][pairClass];
        const ratio = contrastRatio(
          theme.colors[foreground],
          theme.colors[background],
        );
        return ratio >= floor
          ? []
          : [`${label}: ${foreground} on ${background} at ${ratio} < ${floor}`];
      }),
    );

    expect(failures).toEqual([]);
  });

  it("reports a selected option whose label the edited fill erases", () => {
    const regressed = extendTheme(getTheme("light"), {
      colors: { selected: lightColors.popoverForeground },
    });

    expect(hasFailure(regressed, "popoverForeground", "selected")).toBe(true);
  });

  it("reports a sidebar status dot the edited panel erases", () => {
    const regressed = extendTheme(getTheme("light"), {
      colors: { muted: lightColors.warningText },
    });

    expect(hasFailure(regressed, "warningText", "muted")).toBe(true);
  });

  it("reports a link the edited row fill erases", () => {
    const onAccent = extendTheme(getTheme("light"), {
      colors: { accent: lightColors.primaryText },
    });
    const onSelected = extendTheme(getTheme("light"), {
      colors: { selected: lightColors.primaryText },
    });

    expect(hasFailure(onAccent, "primaryText", "accent")).toBe(true);
    expect(hasFailure(onSelected, "primaryText", "selected")).toBe(true);
  });

  it("keeps the sidebar pairs at the secondary floor", () => {
    const mutedPairs = contrastPairs.filter(
      ([foreground, background, pairClass]) =>
        background === "muted" &&
        pairClass === "secondary" &&
        statusTones.some((tone) => foreground === `${tone}Text`),
    );

    expect(mutedPairs).toHaveLength(4);
    expect(
      mutedPairs.every(([, , pairClass]) => pairClass === "secondary"),
    ).toBe(true);
  });
});

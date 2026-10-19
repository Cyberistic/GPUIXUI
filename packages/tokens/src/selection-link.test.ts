/**
 * Guards the gap plan 528 closes: an accent-toned link under a text selection
 * was the contract's one documented omission. `docs/tokens.md` said the shipped
 * `primaryText` "does not clear 7:1 at AAA" and named macOS light at 4.32:1 on
 * `infoSoft`, and plan 087 concluded no perceivable wash could keep a link at
 * 7:1 — which plan 366 had already disproved for the four status tones.
 * `primaryText` is a text role, and a link in a paragraph, a list row or an
 * Alert is selected with the copy around it, so the composition is a real one.
 *
 * The omission hid twelve failing shipped sets. With `selection` composited over
 * the thirteen surfaces a link can sit on, the AAA light link measured
 * **5.376:1** on `destructiveSoft` under its 7:1 floor, macOS dark **3.708:1**
 * on `selected`, Windows light 3.995:1, XP light 4.295:1, Aero light 4.022:1,
 * macOS light 4.106:1 and Linux dark 4.485:1 under 4.5:1 — while
 * `themeContrastFailures` returned `[]` for every one of them.
 */
import { describe, expect, it } from "vitest";
import {
  compositeOver,
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getPlatformRecipeTheme,
  getPlatformTheme,
  getTheme,
  selectionLinkPairs,
  selectionSurfaces,
  shippedThemes,
  themeContrastFailures,
  type Theme,
} from "./index.js";

const softFills = [
  "infoSoft",
  "successSoft",
  "warningSoft",
  "destructiveSoft",
] as const;

const linkSurfaces = [...selectionSurfaces, ...softFills] as const;

const washed = (theme: Theme, surface: keyof Theme["colors"]): string =>
  compositeOver(theme.colors.selection, theme.colors[surface]);

/** The tightest washed link pair a theme paints, or `undefined` with no pairs. */
const worstPair = (theme: Theme) =>
  linkSurfaces
    .map((surface) => ({
      surface,
      ratio: contrastRatio(theme.colors.primaryText, washed(theme, surface)),
    }))
    .reduce((worst, current) =>
      current.ratio < worst.ratio ? current : worst,
    );

describe("a brand-toned link through a text selection", () => {
  it("covers the nine selection surfaces and the four soft status fills", () => {
    expect(selectionLinkPairs).toHaveLength(13);
    expect(selectionLinkPairs.map(([, surface]) => surface)).toEqual([
      ...linkSurfaces,
    ]);
    expect(
      new Set(selectionLinkPairs.map(([, , pairClass]) => pairClass)),
    ).toEqual(new Set(["secondary"]));
  });

  it("keeps every shipped link above its floor through the wash", () => {
    const failures = shippedThemes.flatMap(({ theme }) =>
      linkSurfaces.flatMap((surface) => {
        const ratio = contrastRatio(
          theme.colors.primaryText,
          washed(theme, surface),
        );
        const floor = contrastFloors[theme.contrast].secondary;
        return ratio >= floor
          ? []
          : [`${theme.name}: primaryText on ${surface} at ${ratio}`];
      }),
    );

    expect(failures).toEqual([]);
  });

  it("quotes the tightest washed link in each contrast", () => {
    const tightest = (contrast: "default" | "high") =>
      shippedThemes
        .filter(({ theme }) => theme.contrast === contrast)
        .map(({ theme }) => ({ name: theme.name, ...worstPair(theme) }))
        .reduce((worst, current) =>
          current.ratio < worst.ratio ? current : worst,
        );

    const fallback = tightest("default");
    const high = tightest("high");

    expect([
      fallback.name,
      fallback.surface,
      fallback.ratio.toFixed(3),
    ]).toEqual(["Dark · Windows", "selected", "4.729"]);
    expect([high.name, high.surface, high.ratio.toFixed(3)]).toEqual([
      "High contrast light",
      "destructiveSoft",
      "7.484",
    ]);
  });

  /**
   * The seven values plan 528 moved, each restored on its own shipped set. A
   * set that stops moving one of them is caught here, and the reported failures
   * are the pre-528 evidence the plan cites.
   */
  it("records the pre-528 regressions", () => {
    const regressions: ReadonlyArray<
      readonly [string, Theme, string, number, string, string]
    > = [
      [
        "AAA light",
        getTheme("light", "high"),
        "#3B2C8F",
        9,
        "destructiveSoft",
        "5.376",
      ],
      [
        "macOS light",
        getPlatformTheme("darwin", "light"),
        "#0055B3",
        6,
        "active",
        "4.106",
      ],
      [
        "macOS dark",
        getPlatformTheme("darwin", "dark"),
        "#64B5FF",
        6,
        "selected",
        "3.708",
      ],
      [
        "Linux dark",
        getPlatformTheme("linux", "dark"),
        "#99C1F1",
        2,
        "selected",
        "4.485",
      ],
      [
        "Windows light",
        getPlatformTheme("win32", "light"),
        "#005BA1",
        8,
        "selected",
        "3.995",
      ],
      [
        "XP light",
        getPlatformRecipeTheme("xp", "light"),
        "#0046BD",
        2,
        "active",
        "4.295",
      ],
      [
        "Aero light",
        getPlatformRecipeTheme("aero", "light"),
        "#0F55A3",
        8,
        "destructiveSoft",
        "4.022",
      ],
    ];

    regressions.forEach(([name, theme, oldValue, count, surface, ratio]) => {
      const edited = extendTheme(theme, { colors: { primaryText: oldValue } });
      const failures = themeContrastFailures(edited).filter(
        (failure) =>
          failure.wash === "selection" && failure.foreground === "primaryText",
      );

      expect(failures, name).toHaveLength(count);
      expect(
        failures.map((failure) => failure.pairClass),
        name,
      ).toEqual(failures.map(() => "secondary"));
      expect(
        failures.map((failure) => failure.floor),
        name,
      ).toEqual(failures.map(() => contrastFloors[edited.contrast].secondary));

      const worst = failures.reduce((lowest, failure) =>
        failure.ratio < lowest.ratio ? failure : lowest,
      );
      expect([worst.background, worst.ratio.toFixed(3)], name).toEqual([
        surface,
        ratio,
      ]);
    });
  });

  it("keeps the at-rest link pairs and the primary family intact", () => {
    const atRest = shippedThemes.flatMap(({ theme }) =>
      contrastPairs
        .filter(([foreground]) => foreground === "primaryText")
        .map(([, background, pairClass]) => ({ theme, background, pairClass })),
    );

    const tightestOn = (surface: keyof Theme["colors"]) =>
      shippedThemes
        .map(({ theme }) => ({
          name: theme.name,
          ratio: contrastRatio(theme.colors.primaryText, theme.colors[surface]),
        }))
        .reduce((worst, current) =>
          current.ratio < worst.ratio ? current : worst,
        );

    expect(atRest.length).toBeGreaterThan(0);
    atRest.forEach(({ theme, background, pairClass }) => {
      expect(
        contrastRatio(theme.colors.primaryText, theme.colors[background]),
        `${theme.name} primaryText on ${background}`,
      ).toBeGreaterThanOrEqual(contrastFloors[theme.contrast][pairClass]);
    });

    const selected = tightestOn("selected");
    expect([selected.name, selected.ratio.toFixed(3)]).toEqual([
      "Dark · Windows",
      "5.688",
    ]);
  });

  it("reports a copied link that matches its own selection wash", () => {
    const theme = getTheme("light");
    const edited = extendTheme(theme, {
      colors: { primaryText: theme.colors.background },
    });
    const reported = themeContrastFailures(edited)
      .filter(
        (failure) =>
          failure.wash === "selection" && failure.foreground === "primaryText",
      )
      .map((failure) => failure.background);

    expect(reported).toEqual([...linkSurfaces]);
  });
});

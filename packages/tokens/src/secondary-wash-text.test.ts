/**
 * Guards the gap plan 334 closed. The shipped secondary Button
 * (`components/internal/button.tsx`) keeps `secondaryForeground` while its fill
 * steps onto the generic `hover` and `active` washes, not the designed
 * `secondaryHover`/`secondaryActive` family plan 097 added. `contrastPairs`
 * measured the label only on the designed family, so a copied platform style or
 * brand theme could retint a wash until a neutral button's label disappeared
 * mid-interaction while `themeContrastFailures` returned `[]`.
 *
 * The two pairs are a guard, not a palette fix: every shipped set already
 * clears the 4.5:1 secondary floor (10.42:1 on `hover` and 9.44:1 on `active`
 * at the tightest), so no colour moves. The designed family remains the target
 * for the cross-team consumer migration.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getTheme,
  themeContrastFailures,
  type Theme,
} from "./index.js";

const themes: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

const secondaryWashes = ["hover", "active"] as const;

const secondaryForegroundPairs = contrastPairs.filter(
  ([foreground]) => foreground === "secondaryForeground",
);

describe("the secondary control's label on the generic washes", () => {
  it("names every fill the label paints on, once each", () => {
    expect(
      secondaryForegroundPairs.map(([, background, pairClass]) => [
        background,
        pairClass,
      ]),
    ).toEqual([
      ["secondary", "secondary"],
      ["secondaryHover", "secondary"],
      ["secondaryActive", "secondary"],
      ["hover", "secondary"],
      ["active", "secondary"],
    ]);
  });

  it("keeps every shipped theme above its declared secondary floor", () => {
    const failures = themes.flatMap(([label, theme]) =>
      secondaryWashes.flatMap((background) => {
        const floor = contrastFloors[theme.contrast].secondary;
        const ratio = contrastRatio(
          theme.colors.secondaryForeground,
          theme.colors[background],
        );
        return ratio >= floor
          ? []
          : [
              `${label}: secondaryForeground on ${background} at ${ratio} < ${floor}`,
            ];
      }),
    );

    expect(failures).toEqual([]);
  });

  it("reports a label erased on an edited light wash", () => {
    const light = getTheme("light");

    secondaryWashes.forEach((background) => {
      const regressed = extendTheme(light, {
        colors: { secondaryForeground: light.colors[background] },
      });
      const failures = themeContrastFailures(regressed).filter(
        (failure) =>
          failure.foreground === "secondaryForeground" &&
          failure.background === background,
      );

      expect(failures, background).toHaveLength(1);
      expect(failures[0]?.pairClass, background).toBe("secondary");
      expect(failures[0]?.floor, background).toBe(
        contrastFloors.default.secondary,
      );
      expect(failures[0]?.ratio, background).toBeCloseTo(1, 5);
    });
  });

  it("checks the AAA theme at the level it declares", () => {
    const accessible = getTheme("dark", "high");
    const regressed = extendTheme(accessible, {
      colors: { secondaryForeground: accessible.colors.hover },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground, background }) =>
        foreground === "secondaryForeground" && background === "hover",
    );

    expect(failures).toHaveLength(1);
    expect(failures[0]?.floor).toBe(contrastFloors.high.secondary);
    expect(failures[0]?.ratio).toBeCloseTo(1, 5);
  });

  it("pins the tightest figures the catalogue quotes", () => {
    const tightest = secondaryWashes.map((background) => {
      const [themeLabel, ratio] = themes
        .map(
          ([label, theme]) =>
            [
              label,
              contrastRatio(
                theme.colors.secondaryForeground,
                theme.colors[background],
              ),
            ] as const,
        )
        .reduce((worst, current) => (current[1] < worst[1] ? current : worst));

      return [background, themeLabel, Number(ratio.toFixed(2))];
    });

    expect(tightest).toEqual([
      ["hover", "Dark · macOS", 10.42],
      ["active", "Dark · Linux", 9.44],
    ]);
  });
});

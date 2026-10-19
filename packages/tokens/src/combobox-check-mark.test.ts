/**
 * Guards the gap plan 341 closed. `ComboboxItem` marks the selected option with
 * a check glyph painted from `theme.colors.primary`, and `rowStyle` paints the
 * `hover` wash behind a highlighted row — so on a highlighted selected option
 * the check is `primary` on `hover`. `markPairs` (plan 332) measured `primary`
 * as a glyph on the plain surfaces and on the slider thumb's own `input` fill,
 * but not on the row wash, so a copied platform style could set `primary` close
 * to `hover` and erase the selection check exactly while the pointer is on the
 * row, while `themeContrastFailures` returned `[]`.
 *
 * The hover pair was a guard: every shipped set already cleared its declared
 * mark floor (3.639:1 on macOS dark at the tightest), so that pair moved no
 * colour. The menu checkbox's `accent` glyph is a different defect — the wrong
 * role, recorded cross-team by plan 339.
 *
 * Plan 698 closes the fill the check actually marks. A selected option at rest
 * sits on `selected`, and a chosen row presses to `selectedActive` (plan 651),
 * but only the highlighted `hover` wash was published. The shipped macOS dark
 * set measured **2.748:1** for `primary` on `selected`, under the 3:1 mark
 * floor, while `themeFailures` returned `[]`; the theme's accent family moves
 * one designed step (`#0A84FF` → `#2E93FF`, 3.214:1 on the fill the check marks)
 * and both selected fills join the list.
 */
import { describe, expect, it } from "vitest";
import { selectedOptionLight } from "./checked-control.example.js";
import { shippedThemes } from "./shipped-themes.js";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getPlatformTheme,
  getTheme,
  markPairs,
  themeContrastFailures,
  type Theme,
} from "./index.js";

const themes: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

const checkFailures = (theme: Theme) =>
  themeContrastFailures(theme).filter(
    ({ foreground, background, pairClass }) =>
      foreground === "primary" &&
      background === "hover" &&
      pairClass === "mark",
  );

describe("the combobox check on a highlighted option", () => {
  it("names the check on its row wash once", () => {
    const pair = ["primary", "hover", "mark"] as const;
    expect(
      contrastPairs.filter(
        ([foreground, background, pairClass]) =>
          foreground === pair[0] &&
          background === pair[1] &&
          pairClass === pair[2],
      ),
    ).toEqual([pair]);
    expect(
      markPairs.some(
        ([foreground, background, pairClass]) =>
          foreground === pair[0] &&
          background === pair[1] &&
          pairClass === pair[2],
      ),
    ).toBe(true);
  });

  it("keeps every shipped theme above its declared mark floor", () => {
    const failures = themes.flatMap(([label, theme]) => {
      const floor = contrastFloors[theme.contrast].mark;
      const ratio = contrastRatio(theme.colors.primary, theme.colors.hover);
      return ratio >= floor
        ? []
        : [`${label}: primary on hover at ${ratio} < ${floor}`];
    });

    expect(failures).toEqual([]);
  });

  it("reports a check erased on the light hover wash", () => {
    const light = getTheme("light");
    const regressed = extendTheme(light, {
      colors: { primary: light.colors.hover },
    });
    const failures = checkFailures(regressed);

    expect(failures).toHaveLength(1);
    expect(failures[0]?.floor).toBe(contrastFloors.default.mark);
    expect(failures[0]?.ratio).toBeCloseTo(1, 5);
  });

  it("checks the AAA theme at the level it declares", () => {
    const accessible = getTheme("dark", "high");
    const regressed = extendTheme(accessible, {
      colors: { primary: accessible.colors.hover },
    });
    const failures = checkFailures(regressed);

    expect(failures).toHaveLength(1);
    expect(failures[0]?.floor).toBe(contrastFloors.high.mark);
    expect(failures[0]?.ratio).toBeCloseTo(1, 5);
  });

  it("pins the tightest figures the catalogue quotes", () => {
    const worst = (contrast: "default" | "high") =>
      themes
        .filter(([, theme]) => theme.contrast === contrast)
        .map(
          ([label, theme]) =>
            [
              label,
              contrastRatio(theme.colors.primary, theme.colors.hover),
            ] as const,
        )
        .reduce((tightest, current) =>
          current[1] < tightest[1] ? current : tightest,
        );

    const [defaultLabel, defaultRatio] = worst("default");
    const [highLabel, highRatio] = worst("high");

    expect([defaultLabel, Number(defaultRatio.toFixed(3))]).toEqual([
      "Dark · macOS",
      3.639,
    ]);
    expect([highLabel, Number(highRatio.toFixed(3))]).toEqual([
      "High contrast dark",
      8.675,
    ]);
  });
});

const selectedFailures = (
  theme: Theme,
  background: "selected" | "selectedActive",
) =>
  themeContrastFailures(theme).filter(
    ({ foreground, background: fill, pairClass }) =>
      foreground === "primary" && fill === background && pairClass === "mark",
  );

describe("the combobox check on a selected option", () => {
  it("names the check on the selected and pressed fills once", () => {
    (["selected", "selectedActive"] as const).forEach((background) => {
      const pair = ["primary", background, "mark"] as const;
      expect(
        contrastPairs.filter(
          ([foreground, fill, pairClass]) =>
            foreground === pair[0] && fill === pair[1] && pairClass === pair[2],
        ),
      ).toEqual([pair]);
      expect(
        markPairs.some(
          ([foreground, fill, pairClass]) =>
            foreground === pair[0] && fill === pair[1] && pairClass === pair[2],
        ),
      ).toBe(true);
    });
  });

  it("keeps every shipped theme above its declared mark floor on the selected fills", () => {
    const failures = themes.flatMap(([label, theme]) => {
      const floor = contrastFloors[theme.contrast].mark;
      return (["selected", "selectedActive"] as const).flatMap((fill) => {
        const ratio = contrastRatio(theme.colors.primary, theme.colors[fill]);
        return ratio >= floor
          ? []
          : [`${label}: primary on ${fill} at ${ratio} < ${floor}`];
      });
    });

    expect(failures).toEqual([]);
  });

  it("reports a check erased on the selected fill", () => {
    const light = getTheme("light");
    const regressed = extendTheme(light, {
      colors: { selected: light.colors.primary },
    });
    const failures = selectedFailures(regressed, "selected");

    expect(failures).toHaveLength(1);
    expect(failures[0]?.floor).toBe(contrastFloors.default.mark);
    expect(failures[0]?.ratio).toBeCloseTo(1, 5);
  });

  it("pins the selected-fill figures the catalogue quotes", () => {
    const macos = getPlatformTheme("darwin", "dark");

    expect(
      Number(
        contrastRatio(macos.colors.primary, macos.colors.selected).toFixed(3),
      ),
    ).toBe(3.214);
    expect(
      Number(
        contrastRatio(
          macos.colors.primary,
          macos.colors.selectedActive,
        ).toFixed(3),
      ),
    ).toBe(4.121);
  });

  it("resolves the documented selected option from the theme", () => {
    expect(
      contrastRatio(selectedOptionLight.check, selectedOptionLight.background),
    ).toBeGreaterThanOrEqual(contrastFloors.default.mark);
    expect(
      contrastRatio(
        selectedOptionLight.check,
        selectedOptionLight.pressedBackground,
      ),
    ).toBeGreaterThanOrEqual(contrastFloors.default.mark);
    expect(selectedOptionLight.foreground).toBe(
      getTheme("light").colors.popoverForeground,
    );
  });
});

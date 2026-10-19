/**
 * Guards the gap plan 339 closed. `mutedForeground` is the secondary-text role,
 * and `contrastPairs` measured it on the four plain surfaces and the four row
 * washes — but not on the `input` fill a field paints for its own chrome. A
 * time picker paints the separator between its segments
 * (`TimePickerSeparator`) and its clear control (`TimePickerClear`) with that
 * role directly on `input`, so a copied platform style or brand theme could set
 * the two equal and erase both while `themeContrastFailures` returned `[]`.
 *
 * The pair is a guard, not a palette fix: every shipped set already clears its
 * declared secondary floor (8.376:1 on Windows dark at the tightest), so no
 * colour moves.
 *
 * The same audit found a composition no pair can fix: `MenuCheckboxItem` paints
 * its check glyph with `accent` — a pale row wash — on the menu's `popover`
 * (1.11–1.39:1) and on `hover`/`active` (1.00–1.08:1), under the 3:1 mark
 * floor. `accent` cannot become a mark without breaking its surface role; the
 * fix is the row's own `popoverForeground`, and it is recorded as a cross-team
 * `components` task rather than added here as a pair the shipped palette fails.
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

const secondaryPairs = contrastPairs.filter(
  ([foreground]) => foreground === "mutedForeground",
);

const fieldFailures = (theme: Theme) =>
  themeContrastFailures(theme).filter(
    ({ foreground, background, wash }) =>
      foreground === "mutedForeground" &&
      background === "input" &&
      wash === undefined,
  );

describe("secondary text on the field a time picker paints", () => {
  it("names every surface the secondary role paints on once", () => {
    expect(
      secondaryPairs.map(([, background, pairClass]) => [
        background,
        pairClass,
      ]),
    ).toEqual([
      ["muted", "secondary"],
      ["background", "secondary"],
      ["card", "secondary"],
      ["popover", "secondary"],
      ["infoSoft", "secondary"],
      ["successSoft", "secondary"],
      ["warningSoft", "secondary"],
      ["destructiveSoft", "secondary"],
      ["hover", "secondary"],
      ["active", "secondary"],
      ["accent", "secondary"],
      ["selected", "secondary"],
      ["input", "secondary"],
      // The progress groove is a different composition: `mutedForeground` is
      // the muted progress tone's fill, so it is a mark on `track`, not text.
      ["track", "mark"],
      ["selectedActive", "secondary"],
    ]);
  });

  it("keeps every shipped theme above its declared secondary floor", () => {
    const failures = themes.flatMap(([label, theme]) => {
      const floor = contrastFloors[theme.contrast].secondary;
      const ratio = contrastRatio(
        theme.colors.mutedForeground,
        theme.colors.input,
      );
      return ratio >= floor
        ? []
        : [`${label}: mutedForeground on input at ${ratio} < ${floor}`];
    });

    expect(failures).toEqual([]);
  });

  it("reports a time picker's separator erased on the light field", () => {
    const light = getTheme("light");
    const regressed = extendTheme(light, {
      colors: { mutedForeground: light.colors.input },
    });
    const failures = fieldFailures(regressed);

    expect(failures).toHaveLength(1);
    expect(failures[0]?.pairClass).toBe("secondary");
    expect(failures[0]?.floor).toBe(contrastFloors.default.secondary);
    expect(failures[0]?.ratio).toBeCloseTo(1, 5);
  });

  it("checks the AAA theme at the level it declares", () => {
    const accessible = getTheme("dark", "high");
    const regressed = extendTheme(accessible, {
      colors: { mutedForeground: accessible.colors.input },
    });
    const failures = fieldFailures(regressed);

    expect(failures).toHaveLength(1);
    expect(failures[0]?.floor).toBe(contrastFloors.high.secondary);
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
              contrastRatio(theme.colors.mutedForeground, theme.colors.input),
            ] as const,
        )
        .reduce((tightest, current) =>
          current[1] < tightest[1] ? current : tightest,
        );

    const [defaultLabel, defaultRatio] = worst("default");
    const [highLabel, highRatio] = worst("high");

    expect([defaultLabel, Number(defaultRatio.toFixed(3))]).toEqual([
      "Dark · Windows",
      8.376,
    ]);
    expect([highLabel, Number(highRatio.toFixed(3))]).toEqual([
      "High contrast dark",
      14.723,
    ]);
  });
});

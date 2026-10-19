/**
 * Guards the gap plan 366 closes: `xText` is the documented role for a status
 * label, icon or dot on the four washes a row paints, and a selectable row's
 * label is dragged over with the copy around it — but the selection contract
 * measured only body and secondary text through the composited wash. A status
 * label on a pressed row therefore measured **3.671:1** (XP light
 * `successText` on `active`), 3.721:1 on Aero light's selected fill and
 * 6.12–6.72:1 in every high-contrast light set under its 7:1 floor, while
 * `themeContrastFailures` returned `[]`. The six light status roles move one
 * designed half-step between the ramp steps they used, and
 * `selectionStatusPairs` publishes the four tones on the nine surfaces a glyph
 * is selected on.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  compositeOver,
  contrastFloors,
  contrastRatio,
  extendTheme,
  getPlatformRecipeTheme,
  lightTheme,
  selectionStatusPairs,
  selectionSurfaces,
  statusTones,
  themeContrastFailures,
  type Theme,
} from "./index.js";

type Case = readonly [string, Theme];

/** Every shipped set, so a platform's own wash is measured on its own canvas. */
const shipped: ReadonlyArray<Case> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

/** The ratio a status label paints through the selection wash. */
const washedRatio = (
  theme: Theme,
  tone: (typeof statusTones)[number],
  surface: (typeof selectionSurfaces)[number],
): number =>
  contrastRatio(
    theme.colors[`${tone}Text`],
    compositeOver(theme.colors.selection, theme.colors[surface]),
  );

describe("status text through a text selection", () => {
  it("keeps every status label readable in every shipped set", () => {
    shipped.forEach(([label, theme]) => {
      const floor = contrastFloors[theme.contrast].secondary;
      statusTones.forEach((tone) => {
        selectionSurfaces.forEach((surface) => {
          const ratio = washedRatio(theme, tone, surface);
          expect(
            ratio,
            `${label}: ${tone}Text on ${surface} through the wash`,
          ).toBeGreaterThanOrEqual(floor);
        });
      });
    });
  });

  it("records the two tightest shipped figures", () => {
    const tightest = (
      contrast: Theme["contrast"],
    ): readonly [string, number] => {
      let worst: readonly [string, number] = ["", Number.POSITIVE_INFINITY];
      shipped
        .filter(([, theme]) => theme.contrast === contrast)
        .forEach(([label, theme]) => {
          statusTones.forEach((tone) => {
            selectionSurfaces.forEach((surface) => {
              const ratio = washedRatio(theme, tone, surface);
              if (ratio < worst[1]) {
                worst = [`${label} ${tone}Text on ${surface}`, ratio];
              }
            });
          });
        });
      return worst;
    };

    const defaultWorst = tightest("default");
    expect(defaultWorst[0]).toBe("Light · Windows 7 successText on selected");
    expect(Number(defaultWorst[1].toFixed(3))).toBe(4.827);

    const highWorst = tightest("high");
    expect(highWorst[0]).toBe("High contrast light warningText on active");
    expect(Number(highWorst[1].toFixed(3))).toBe(7.37);
  });

  it("is the four tones on the nine surfaces a glyph is selected on", () => {
    expect(selectionStatusPairs).toHaveLength(
      statusTones.length * selectionSurfaces.length,
    );
    expect(selectionStatusPairs).toHaveLength(36);
    expect(selectionStatusPairs).toEqual(
      statusTones.flatMap((tone) =>
        selectionSurfaces.map(
          (surface) => [`${tone}Text`, surface, "secondary"] as const,
        ),
      ),
    );
    expect(selectionStatusPairs.some(([role]) => role === "primaryText")).toBe(
      false,
    );
  });

  it("reports a status label erased by the selection wash", () => {
    const hidden = extendTheme(lightTheme, {
      colors: {
        successText: compositeOver(
          lightTheme.colors.selection,
          lightTheme.colors.active,
        ),
      },
    });
    const failures = themeContrastFailures(hidden).filter(
      ({ foreground, wash }) =>
        foreground === "successText" && wash === "selection",
    );

    expect(failures).toHaveLength(selectionSurfaces.length);
    expect(failures).toContainEqual({
      foreground: "successText",
      background: "active",
      wash: "selection",
      pairClass: "secondary",
      floor: contrastFloors.default.secondary,
      ratio: 1,
    });
  });

  it("keeps the measured regression below the floor it closed", () => {
    const xp = getPlatformRecipeTheme("xp", "light");
    const washed = compositeOver(xp.colors.selection, xp.colors.active);

    expect(contrastRatio("#116A43", washed)).toBeLessThan(
      contrastFloors.default.secondary,
    );
    expect(contrastRatio(xp.colors.successText, washed)).toBeGreaterThanOrEqual(
      contrastFloors.default.secondary,
    );
  });
});

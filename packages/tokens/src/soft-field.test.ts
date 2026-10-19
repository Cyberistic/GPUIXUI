/**
 * Guards the gap plan 659 closes: a field inside a tone-tinted status panel had
 * its edge, body, caption and link measured, but not its own typed text or hint.
 *
 * `contrast.ts` records the composition in `controlBoundarySoftPairs` — "a
 * tone-tinted Alert carries an action — a field, a 'don't show again'
 * checkbox". A probe of the shipped identity light theme found its hint on
 * **4.4390:1** (`destructiveSoft`) and **4.4954:1** (`successSoft`), under the
 * library's 4.5:1 secondary floor, while `themeFailures` returned `[]`. The
 * pressed selected row plan 651 added carried the hint but not the typed text a
 * transparent `InlineEdit` paints there.
 */

import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getTheme,
  highContrastLightColors,
  lightColors,
  selectionPressPairs,
  shippedThemes,
  softFieldPairs,
  statusTones,
  themeContrastFailures,
  themeFailures,
  themeTextTierFailures,
  type ContrastPair,
  type ThemeColors,
} from "./index.js";

const softFills = statusTones.map((tone) => `${tone}Soft` as const);

const failuresFor = (
  theme: ReturnType<typeof getTheme>,
  [foreground, background, pairClass]: ContrastPair,
) =>
  themeContrastFailures(theme).filter(
    (failure) =>
      failure.foreground === foreground &&
      failure.background === background &&
      failure.pairClass === pairClass,
  );

describe("the field's content inside a soft status panel", () => {
  it("publishes the typed text and the hint on the four soft fills", () => {
    expect(softFieldPairs).toHaveLength(8);
    statusTones.forEach((tone) => {
      expect(
        softFieldPairs.filter(([, background]) => background === `${tone}Soft`),
      ).toEqual([
        ["inputForeground", `${tone}Soft`, "body"],
        ["placeholder", `${tone}Soft`, "secondary"],
      ]);
    });
    softFieldPairs.forEach((pair) => {
      expect(
        contrastPairs.filter((entry) => entry.join("|") === pair.join("|")),
      ).toHaveLength(1);
    });
  });

  it("carries typed text on a pressed selected row beside the hint", () => {
    expect(
      selectionPressPairs.filter(
        ([foreground, background]) =>
          foreground === "inputForeground" && background === "selectedActive",
      ),
    ).toEqual([["inputForeground", "selectedActive", "body"]]);
  });

  it("keeps every shipped theme above its declared floor", () => {
    const failures = shippedThemes.flatMap(({ theme }) =>
      softFieldPairs.flatMap(([foreground, background, pairClass]) => {
        const floor = contrastFloors[theme.contrast][pairClass];
        const ratio = contrastRatio(
          theme.colors[foreground],
          theme.colors[background],
        );
        return ratio >= floor
          ? []
          : [
              `${theme.name}: ${foreground} on ${background} at ${ratio} < ${floor}`,
            ];
      }),
    );

    expect(failures).toEqual([]);
  });

  it("clears the floor on every identity soft fill at both contrast levels", () => {
    const ratiosAt = (colors: ThemeColors, floor: number): void => {
      softFills.forEach((background) => {
        const ratio = contrastRatio(colors.placeholder, colors[background]);
        expect(ratio, background).toBeGreaterThanOrEqual(floor);
      });
    };

    ratiosAt(lightColors, 4.5);
    expect(
      Math.min(
        ...softFills.map((background) =>
          contrastRatio(lightColors.placeholder, lightColors[background]),
        ),
      ).toFixed(4),
    ).toBe("4.5753");

    ratiosAt(highContrastLightColors, 7);
    expect(
      Math.min(
        ...softFills.map((background) =>
          contrastRatio(
            highContrastLightColors.placeholder,
            highContrastLightColors[background],
          ),
        ),
      ).toFixed(4),
    ).toBe("7.2134");
  });

  it("reports the hint value this plan replaced, so the guard can fail", () => {
    const preFix = extendTheme(getTheme("light"), {
      colors: { placeholder: "#5C6574" },
    });
    const failures = themeContrastFailures(preFix).filter(
      ({ foreground, background }) =>
        foreground === "placeholder" && background.endsWith("Soft"),
    );

    expect(
      failures.map(({ background, ratio, pairClass, floor }) => ({
        background,
        ratio: ratio.toFixed(4),
        pairClass,
        floor,
      })),
    ).toEqual([
      {
        background: "successSoft",
        ratio: "4.4954",
        pairClass: "secondary",
        floor: 4.5,
      },
      {
        background: "destructiveSoft",
        ratio: "4.4390",
        pairClass: "secondary",
        floor: 4.5,
      },
    ]);
  });

  it("keeps the hint a perceivable step below secondary text", () => {
    const failures = shippedThemes.flatMap(({ theme }) =>
      themeTextTierFailures(theme),
    );

    expect(failures).toEqual([]);
    softFills.forEach((background) => {
      expect(
        contrastRatio(lightColors.mutedForeground, lightColors[background]) /
          contrastRatio(lightColors.placeholder, lightColors[background]),
      ).toBeGreaterThanOrEqual(contrastFloors.default.step);
    });
  });

  it("reports typed text erased on a soft fill", () => {
    const erased = extendTheme(getTheme("light"), {
      colors: { inputForeground: lightColors.infoSoft },
    });
    const failures = failuresFor(erased, [
      "inputForeground",
      "infoSoft",
      "body",
    ]);

    expect(failures).toHaveLength(2);
    // The at-rest pair comes from `softFieldPairs`, the washed one from
    // `selectionInputPairs` (plan 689); both read the same erased composition.
    expect(failures.map(({ wash }) => wash ?? "at-rest")).toEqual([
      "at-rest",
      "selection",
    ]);
    // The erased ink is the fill itself at rest; through the wash the fill
    // moves 1.292:1 away, which is still far under the body floor.
    expect(failures[0]?.ratio).toBe(1);
    expect(failures[1]?.ratio).toBeLessThan(contrastFloors.default.body);
    failures.forEach(({ floor }) =>
      expect(floor).toBe(contrastFloors.default.body),
    );
  });

  it("leaves every shipped set passing the whole guarantee", () => {
    expect(shippedThemes.flatMap(({ theme }) => themeFailures(theme))).toEqual(
      [],
    );
  });
});

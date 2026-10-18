/**
 * Guards the defect plan 306 fixed: the inactive state was exempt from the whole
 * contrast contract, so three failures shipped unnoticed. A disabled `Select`
 * item paints `disabledForeground` straight onto the menu's `popover` with no
 * fill behind it (`packages/primitives/src/components/Select.tsx:98`), measuring
 * **1.99:1** on Linux dark and 2.26:1 on the identity dark; the designed pair a
 * consumer would migrate to measured **2.09:1** on the light `disabled` fill;
 * `disabled` was the very value of `muted` and `hover` (1.000:1), so a disabled
 * control had no fill to see; and no edge pair held the shape that the fill
 * cannot carry. `inactive` is the floor, `border` on `disabled` is the edge.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  darkTheme,
  extendTheme,
  highContrastDarkTheme,
  highContrastLightTheme,
  inactivePairs,
  inactiveSurfaces,
  lightTheme,
  themeContrastFailures,
  type Theme,
} from "./index.js";

const shipped: ReadonlyArray<{
  readonly label: string;
  readonly theme: Theme;
}> = shippedThemes.map(({ theme }) => ({ label: theme.name, theme }));

describe("inactive state", () => {
  it("holds every shipped set to the inactive floor", () => {
    shipped.forEach(({ label, theme }) => {
      const floor = contrastFloors[theme.contrast].inactive;
      inactiveSurfaces.forEach((surface) => {
        expect(
          contrastRatio(theme.colors.disabledForeground, theme.colors[surface]),
          `${label}: disabledForeground on ${surface}`,
        ).toBeGreaterThanOrEqual(floor);
      });
    });
  });

  it("measures the label a disabled menu item paints on the popover", () => {
    expect(inactivePairs).toContainEqual([
      "disabledForeground",
      "popover",
      "inactive",
    ]);
    expect(lightTheme.colors.disabledForeground).toBe("#545D6C");
    expect(darkTheme.colors.disabledForeground).toBe("#A1A9B7");
    expect(highContrastLightTheme.colors.disabledForeground).toBe("#444444");
    expect(highContrastDarkTheme.colors.disabledForeground).toBe("#B0B0B0");
  });

  it("reports the pre-fix inactive label through the public checker", () => {
    const oldLight = extendTheme(lightTheme, {
      colors: { disabledForeground: "#A1A9B7" },
    });
    const lightInactive = themeContrastFailures(oldLight).filter(
      ({ pairClass }) => pairClass === "inactive",
    );
    expect(lightInactive[0]).toMatchObject({
      foreground: "disabledForeground",
      background: "disabled",
      pairClass: "inactive",
      floor: 3,
    });
    expect(contrastRatio("#A1A9B7", lightTheme.colors.disabled)).toBeCloseTo(
      2.09,
      2,
    );

    const oldDark = extendTheme(darkTheme, {
      colors: { disabledForeground: "#545D6C" },
    });
    expect(
      themeContrastFailures(oldDark)
        .filter(({ pairClass }) => pairClass === "inactive")
        .map(({ background }) => background),
    ).toContain("popover");
    expect(contrastRatio("#545D6C", darkTheme.colors.popover)).toBeCloseTo(
      2.26,
      2,
    );
  });

  it("keeps the fill exempt by measuring the edge that carries the shape", () => {
    expect(contrastPairs).toContainEqual(["border", "disabled", "divider"]);
    expect(contrastPairs).toContainEqual(["border", "muted", "divider"]);
    expect(
      contrastPairs.some(([foreground]) => foreground === "disabled"),
    ).toBe(false);
    shipped.forEach(({ label, theme }) => {
      const floor = contrastFloors[theme.contrast].divider;
      (["disabled", "muted"] as const).forEach((fill) => {
        expect(
          contrastRatio(theme.colors.border, theme.colors[fill]),
          `${label}: border on ${fill}`,
        ).toBeGreaterThanOrEqual(floor);
      });
    });
  });

  it("keeps the inactive label dimmer than secondary text", () => {
    shipped.forEach(({ label, theme }) => {
      const inactive = contrastRatio(
        theme.colors.disabledForeground,
        theme.colors.disabled,
      );
      const secondary = contrastRatio(
        theme.colors.mutedForeground,
        theme.colors.muted,
      );
      expect(inactive, label).toBeLessThan(secondary);
    });
  });
});

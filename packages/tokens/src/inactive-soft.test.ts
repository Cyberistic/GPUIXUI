/**
 * Guards the gap plan 307 closed: the inactive floor covered the nine surfaces of
 * plan 306 but not the four soft status fills a tone-tinted Alert's action sits
 * on. Plans 090–093 already treated those fills as surfaces a composition paints
 * on — the surface itself, its edge, the selection wash, the essential boundary
 * and the focus ring — but a disabled "Retry" had no pair behind it, so a brand
 * theme could erase it while `themeContrastFailures` stayed silent.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  contrastFloors,
  contrastRatio,
  extendTheme,
  inactiveSoftPairs,
  inactiveSurfaces,
  lightTheme,
  statusTones,
  themeContrastFailures,
  type Theme,
} from "./index.js";

const shipped: ReadonlyArray<{
  readonly label: string;
  readonly theme: Theme;
}> = shippedThemes.map(({ theme }) => ({ label: theme.name, theme }));

const softFills = statusTones.map((tone) => `${tone}Soft` as const);

describe("inactive label on a soft status fill", () => {
  it("measures the four fills in tone order", () => {
    expect(inactiveSoftPairs).toEqual(
      softFills.map((fill) => ["disabledForeground", fill, "inactive"]),
    );
    softFills.forEach((fill) => {
      expect(inactiveSurfaces, fill).toContain(fill);
    });
  });

  it("holds every shipped set to the inactive floor on a soft fill", () => {
    shipped.forEach(({ label, theme }) => {
      const floor = contrastFloors[theme.contrast].inactive;
      softFills.forEach((fill) => {
        expect(
          contrastRatio(theme.colors.disabledForeground, theme.colors[fill]),
          `${label}: disabledForeground on ${fill}`,
        ).toBeGreaterThanOrEqual(floor);
      });
    });
  });

  it("reports an inactive label that the soft fill erases", () => {
    const erased = extendTheme(lightTheme, {
      colors: { disabledForeground: lightTheme.colors.warningSoft },
    });
    const softFailures = themeContrastFailures(erased).filter(
      ({ pairClass, foreground, background }) =>
        pairClass === "inactive" &&
        foreground === "disabledForeground" &&
        softFills.some((fill) => fill === background),
    );

    expect(softFailures.map(({ background }) => background)).toEqual(softFills);
    expect(softFailures.every(({ ratio, floor }) => ratio < floor)).toBe(true);
    expect(
      softFailures.find(({ background }) => background === "warningSoft")
        ?.ratio,
    ).toBe(1);
  });
});

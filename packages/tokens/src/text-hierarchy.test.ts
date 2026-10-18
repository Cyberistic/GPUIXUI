/**
 * Guards the defect plan 392 fixes: the design system documents a text
 * hierarchy — an unavailable label and a field's hint sit below secondary text,
 * and secondary text sits below body copy — but every public check enforces only
 * minimums. Raising `disabledForeground` to `foreground`, setting
 * `mutedForeground` to `foreground` or setting `placeholder` to `foreground` all
 * returned `[]` from `themeFailures` while a disabled control's label looked
 * enabled and a caption looked like body copy. The rule survived only as two
 * shipped-theme assertions on a single surface each; nothing held an edited
 * theme.
 *
 * `themeTextTierFailures` compares the two roles on each surface where both
 * already have a documented pair and reports a tier that is not one 1.05:1 step
 * below the one above it. The surfaces are derived from `contrastPairs`, so this
 * suite derives its expectations the same way rather than retyping them.
 */

import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getTheme,
  shippedThemes,
  textTiers,
  themeContrastFailures,
  themeFailures,
  themeTextTierFailures,
  type Theme,
  type ThemeColors,
} from "./index.js";

/** The ratios a tier is judged on: both roles measured against one surface. */
const ratios = (
  theme: Theme,
  dimmer: keyof ThemeColors,
  brighter: keyof ThemeColors,
  surface: keyof ThemeColors,
) => ({
  dimmerRatio: contrastRatio(theme.colors[dimmer], theme.colors[surface]),
  brighterRatio: contrastRatio(theme.colors[brighter], theme.colors[surface]),
});

/** The surfaces a role is documented on, straight from the contract. */
const surfacesOf = (
  role: keyof ThemeColors,
): ReadonlyArray<keyof ThemeColors> =>
  contrastPairs
    .flatMap(([foreground, background]) =>
      foreground === role ? [background] : [],
    )
    .filter((surface, index, all) => all.indexOf(surface) === index);

/** The surfaces a tier is compared on: the ones both roles are painted on. */
const sharedSurfaces = (
  dimmer: keyof ThemeColors,
  brighter: keyof ThemeColors,
): ReadonlyArray<keyof ThemeColors> => {
  const brighterSurfaces = surfacesOf(brighter);
  return surfacesOf(dimmer).filter((surface) =>
    brighterSurfaces.includes(surface),
  );
};

describe("text hierarchy", () => {
  it("keeps every shipped set a hierarchy", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(themeTextTierFailures(theme), theme.name).toEqual([]);
    });
  });

  it("reports a tier raised to body strength through the one total call", () => {
    const identity = getTheme("light");
    const inverted = extendTheme(identity, {
      colors: { disabledForeground: identity.colors.foreground },
    });

    // The floors still pass — that is why the contrast check cannot see it.
    expect(themeContrastFailures(inverted)).toEqual([]);
    expect(
      themeFailures(inverted).some((failure) => failure.kind === "hierarchy"),
    ).toBe(true);
  });

  it("can fail every tier in the published list", () => {
    const identity = getTheme("light");

    textTiers.forEach(([dimmer, brighter]) => {
      const flattened = extendTheme(identity, {
        colors: { [dimmer]: identity.colors[brighter] },
      });

      const failures = themeTextTierFailures(flattened);
      expect(
        failures.some(
          (failure) =>
            failure.dimmer === dimmer && failure.brighter === brighter,
        ),
        `${dimmer} below ${brighter}`,
      ).toBe(true);
    });
  });

  it("carries both ratios and the step the tier missed", () => {
    const identity = getTheme("light");
    const flattened = extendTheme(identity, {
      colors: { disabledForeground: identity.colors.mutedForeground },
    });

    const failure = themeTextTierFailures(flattened).find(
      (candidate) =>
        candidate.dimmer === "disabledForeground" &&
        candidate.brighter === "mutedForeground",
    );
    expect(failure).toBeDefined();
    if (failure === undefined) {
      return;
    }

    expect(failure).toMatchObject(
      ratios(
        flattened,
        "disabledForeground",
        "mutedForeground",
        failure.surface,
      ),
    );
    expect(failure.step).toBe(contrastFloors.default.step);
    expect(failure.brighterRatio / failure.dimmerRatio).toBeLessThan(
      failure.step,
    );

    const high = getTheme("light", "high");
    const flattenedHigh = extendTheme(high, {
      colors: { disabledForeground: high.colors.mutedForeground },
    });
    expect(themeTextTierFailures(flattenedHigh)[0]?.step).toBe(
      contrastFloors.high.step,
    );
  });

  it("compares the two roles only where both are documented", () => {
    const identity = getTheme("light");
    const flattened = extendTheme(identity, {
      colors: { placeholder: identity.colors.mutedForeground },
    });

    const reported = themeTextTierFailures(flattened)
      .filter((failure) => failure.dimmer === "placeholder")
      .map((failure) => failure.surface);

    expect(reported).toEqual([
      ...sharedSurfaces("placeholder", "mutedForeground"),
    ]);
    expect(reported).toContain("input");
  });

  it("reports an equal tier and passes the shipped one", () => {
    const identity = getTheme("light");
    expect(themeTextTierFailures(identity)).toEqual([]);

    const equal = extendTheme(identity, {
      colors: { disabledForeground: identity.colors.mutedForeground },
    });
    expect(themeTextTierFailures(equal)).toContainEqual(
      expect.objectContaining({
        dimmer: "disabledForeground",
        brighter: "mutedForeground",
      }),
    );
  });
});

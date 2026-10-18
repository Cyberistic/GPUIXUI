/**
 * Guards the gap plans 309 and 394 left in the status family.
 *
 * The solid status roles are documented as fills — `ThemeColors.success` is
 * "success background and indicator" and the design system offers "its solid
 * role for a fill" — and each carries a measured on-colour foreground
 * (`xForeground` on `x`). `stateFillSurfacePairs` holds only the *interactive*
 * fills to their panel, and a status chip is not interactive, so a copied theme
 * whose status fill equalled its card erased a solid chip while every check
 * returned `[]`. The same audit found `statusTone` resolving the soft surface,
 * its edge and `xText` but not the solid pair, so a consumer retyped
 * `theme.colors[tone]` / `theme.colors[`${tone}Foreground`]` by hand.
 *
 * The mark is a different class (plan 332): a status dot or label is `xText`,
 * never the solid fill, because the light `warning` fill is 1.78:1 on the canvas
 * — under the 3:1 a mark needs. These cases hold both halves.
 */
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastRatio,
  markPairs,
  stateFillSurfacePairs,
  statusFillPairs,
  themeContrastFailures,
} from "./contrast.js";
import { extendTheme, getTheme } from "./theme.js";
import { themeFailures } from "./theme-check.js";
import { statusTone, statusTones } from "./styles.js";
import { statusSolidStyles } from "./status-tone.example.js";
import { shippedThemes } from "./shipped-themes.js";

/** The surfaces a status chip occupies, in pair order. */
const chipSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
] as const;

describe("the solid status family", () => {
  it("resolves the solid pair in every shipped set", () => {
    shippedThemes.forEach(({ theme }) => {
      statusTones.forEach((tone) => {
        expect(statusTone(theme, tone).solid, `${theme.name} ${tone}`).toEqual({
          background: theme.colors[tone],
          foreground: theme.colors[`${tone}Foreground`],
        });
      });
    });
  });

  it("measures every solid fill on every surface a chip sits on, once", () => {
    // `destructive` is an action fill too, so the four base surfaces it already
    // has through `stateFillSurfacePairs` are not repeated.
    const interactive = stateFillSurfacePairs.map(
      ([foreground, background]) => `${foreground}|${background}`,
    );
    const expected = statusTones
      .flatMap((tone) =>
        chipSurfaces.map((surface) => [tone, surface] as const),
      )
      .filter(([tone, surface]) => !interactive.includes(`${tone}|${surface}`));

    expect(
      statusFillPairs.map(([foreground, background]) => [
        foreground,
        background,
      ]),
    ).toEqual(expected);
    expect(statusFillPairs).toHaveLength(
      statusTones.length * chipSurfaces.length - 4,
    );
    statusFillPairs.forEach(([, , pairClass]) =>
      expect(pairClass).toBe("surface"),
    );
  });

  it("clears the floor in every shipped set", () => {
    shippedThemes.forEach(({ theme }) =>
      statusFillPairs.forEach(([fill, surface, pairClass]) => {
        const floor = contrastFloors[theme.contrast][pairClass];
        expect(
          contrastRatio(theme.colors[fill], theme.colors[surface]),
          `${theme.name} ${fill} on ${surface}`,
        ).toBeGreaterThanOrEqual(floor);
      }),
    );
  });

  it("reports a solid fill that vanishes into its surface", () => {
    const light = getTheme("light");
    const erased = extendTheme(light, {
      colors: { success: light.colors.card },
    });
    const failures = themeContrastFailures(erased).filter(
      ({ foreground, pairClass }) =>
        foreground === "success" && pairClass === "surface",
    );

    expect(failures).toContainEqual({
      foreground: "success",
      background: "card",
      pairClass: "surface",
      floor: contrastFloors.default.surface,
      ratio: 1,
    });
    expect(failures.map(({ background }) => background)).toContain("popover");
  });

  it("tags an erased solid fill through the total check", () => {
    const light = getTheme("light");
    const erased = extendTheme(light, {
      colors: { warning: light.colors.card },
    });

    expect(
      themeFailures(erased).some(
        (failure) =>
          failure.kind === "contrast" &&
          failure.foreground === "warning" &&
          failure.background === "card",
      ),
    ).toBe(true);
  });

  it("runs the solid chip example in every shipped set", () => {
    shippedThemes.forEach(({ theme }) =>
      statusTones.forEach((tone) => {
        const style = statusSolidStyles(theme, tone);
        expect(style.container.backgroundColor, `${theme.name} ${tone}`).toBe(
          theme.colors[tone],
        );
        expect(style.container.selectionColor, `${theme.name} ${tone}`).toBe(
          theme.colors.selectionOnFill,
        );
        expect(style.text.color, `${theme.name} ${tone}`).toBe(
          theme.colors[`${tone}Foreground`],
        );
      }),
    );
  });

  it("keeps the solid fill out of the mark class", () => {
    const markForegrounds = new Set(
      markPairs.map(([foreground]) => foreground),
    );
    expect(markForegrounds).toEqual(
      new Set(["primary", "success", "destructive"]),
    );
    markPairs.forEach(([, , pairClass]) => expect(pairClass).toBe("mark"));
  });
});

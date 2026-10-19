/**
 * Guards the inset focus indicator a filled control paints on its own fill.
 *
 * A clipped ButtonGroup member, a selected calendar day and a pressed selection
 * control cannot draw the outer `focusRing` shadow, so each paints a border
 * instead — and `focusRing`'s `ring` role is designed for the surface *behind* a
 * control. On the fill it is not a signal: against `primary` it measures exactly
 * 1.000:1 in sixteen shipped sets, and the best any set reaches is 1.374:1. The
 * designed alternative is the family's on-colour, which the on-colour pairs hold
 * on the resting, hover and pressed fill; this suite derives that for every
 * shipped set and pins the failure the helper exists to replace.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastFloors, contrastRatio } from "./contrast.js";
import { clippedFocusedButtonStyle } from "./inset-focus-ring.example.js";
import {
  controlHeight,
  controlPaddingX,
  filledControl,
  filledControlFamilies,
  insetFocusRing,
  type FilledControlStyle,
} from "./styles.js";
import { shippedThemes } from "./shipped-themes.js";
import { extendTheme, getTheme } from "./theme.js";
import type { Theme } from "./theme.js";

/** The three fills a family paints: resting, hover and pressed. */
const fills = (style: FilledControlStyle): ReadonlyArray<string> => [
  style.background,
  style.hover,
  style.active,
];

/** The three ratios of a family's inset indicator against its own fills. */
const familyRatios = (
  theme: Theme,
  family: (typeof filledControlFamilies)[number],
): ReadonlyArray<number> => {
  const style = filledControl(theme, family);
  const indicator = insetFocusRing(theme, family).borderColor;
  return fills(style).map((fill) => contrastRatio(indicator, fill));
};

/** The lowest family foreground ratio in one theme, and the family that owns it. */
const tightest = (
  theme: Theme,
): { readonly ratio: number; readonly family: string } =>
  filledControlFamilies.reduce(
    (worst, family) => {
      const ratio = Math.min(...familyRatios(theme, family));
      return ratio < worst.ratio ? { ratio, family } : worst;
    },
    { ratio: Number.POSITIVE_INFINITY, family: "none" },
  );

const docs = [
  new URL("../../../docs/tokens.md", import.meta.url),
  new URL("../../../docs/design-system.md", import.meta.url),
  new URL("../README.md", import.meta.url),
] as const;

describe("insetFocusRing", () => {
  it("is the family's on-colour at the outer ring's thickness", () => {
    [getTheme("light"), getTheme("dark")].forEach((theme) => {
      filledControlFamilies.forEach((family) => {
        const style = filledControl(theme, family);
        expect(
          insetFocusRing(theme, family),
          `${theme.name} ${family}`,
        ).toEqual({
          borderColor: style.foreground,
          borderWidth: theme.borderWidth.strong,
        });
      });
    });
  });

  it("clears the boundary on every fill of every shipped set", () => {
    const failures = shippedThemes.flatMap(({ theme }) =>
      filledControlFamilies.flatMap((family) => {
        const floor = contrastFloors[theme.contrast].boundary;
        return familyRatios(theme, family).flatMap((ratio, index) =>
          ratio < floor
            ? [
                `${theme.name} ${family} fill ${index}: ${ratio.toFixed(3)} < ${floor}`,
              ]
            : [],
        );
      }),
    );
    expect(failures).toEqual([]);
  });

  it("keeps the shipped tightest family foreground above 4.6:1", () => {
    const worst = shippedThemes
      .map(({ theme }) => ({ name: theme.name, ...tightest(theme) }))
      .toSorted((left, right) => left.ratio - right.ratio)[0];

    expect(worst?.ratio).toBeGreaterThan(4.6);
    expect(worst?.name).toBe("Light · macOS");
  });

  it("replaces a ring that is invisible on the fill in every shipped set", () => {
    const unperceivable = shippedThemes.filter(({ theme }) =>
      filledControlFamilies.some((family) => {
        const style = filledControl(theme, family);
        return fills(style).some(
          (fill) =>
            contrastRatio(theme.colors.ring, fill) <
            contrastFloors[theme.contrast].boundary,
        );
      }),
    );
    expect(unperceivable).toHaveLength(shippedThemes.length);

    const identical = shippedThemes
      .filter(
        ({ theme }) =>
          contrastRatio(theme.colors.ring, theme.colors.primary) === 1,
      )
      .map(({ theme }) => theme.name);
    expect(identical).toEqual([
      "Dark",
      "High contrast dark",
      "Light · macOS",
      "High contrast dark · macOS",
      "Light · Linux",
      "Dark · Linux",
      "High contrast dark · Linux",
      "Light · Windows",
      "Dark · Windows",
      "High contrast dark · Windows",
      "Light · Windows XP",
      "Dark · Windows XP",
      "High contrast dark · Windows XP",
      "Light · Windows 7",
      "Dark · Windows 7",
      "High contrast dark · Windows 7",
    ]);
  });

  it("follows a copied theme's family and ring thickness", () => {
    const copied = extendTheme(getTheme("light"), {
      borderWidth: { strong: 4 },
      colors: {
        primary: "#FFFFFF",
        primaryForeground: "#000000",
        primaryHover: "#F7F7F7",
        primaryActive: "#EFEFEF",
      },
    });
    expect(insetFocusRing(copied, "primary")).toEqual({
      borderColor: "#000000",
      borderWidth: 4,
    });
  });

  it("paints a real clipped control in the executed example", () => {
    [getTheme("light"), getTheme("dark")].forEach((theme) => {
      const ring = insetFocusRing(theme, "primary");
      const fill = filledControl(theme, "primary");
      (["sm", "md", "lg"] as const).forEach((size) => {
        const style = clippedFocusedButtonStyle(theme, size);
        expect(style, `${theme.name} ${size}`).toMatchObject({
          backgroundColor: fill.background,
          color: fill.foreground,
          borderColor: ring.borderColor,
          borderWidth: ring.borderWidth,
          height: controlHeight(theme, size),
          paddingLeft: controlPaddingX(theme, size),
          paddingRight: controlPaddingX(theme, size),
        });
      });
    });
  });

  it("names the call in both documents and the README", () => {
    const tightestShipped = Math.min(
      ...shippedThemes.map(({ theme }) => tightest(theme).ratio),
    );
    const identicalCount = shippedThemes.filter(
      ({ theme }) =>
        contrastRatio(theme.colors.ring, theme.colors.primary) === 1,
    ).length;
    const text = docs.map((url) => readFileSync(url, "utf8"));
    text.forEach((source) => {
      expect(source).toContain("insetFocusRing");
      expect(source).toContain("filled control");
    });
    expect(text[0]).toContain(
      `${tightestShipped.toFixed(3)}:1 at the tightest`,
    );
    expect(text[0]).toContain(
      `**1.000:1** in **${identicalCount}** shipped sets`,
    );
  });
});

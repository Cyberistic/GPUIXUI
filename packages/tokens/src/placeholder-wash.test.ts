/**
 * Guards the gap plan 527 closed. Plans 317 and 319 measured the placeholder and
 * typed text on the `input` fill and the four `Surface` tones a transparent field
 * sits on, and the reference called "a field on a row wash" deliberately out of
 * scope. It is not: `InlineEdit` swaps a row's text for a field in place, and a
 * row paints `hover`, `active`, `accent` and `selected` behind its own content.
 *
 * The missing composition hid a shipped defect. Every one of the twelve default
 * sets missed the 4.5:1 secondary floor for `placeholder` on at least one wash —
 * identity dark `#858F9F` measured **3.132:1** on `selected`, macOS light
 * 3.714:1 on `active`, Windows dark 3.939:1 and XP light 3.877:1 — while
 * `themeContrastFailures` returned `[]`. The twelve default hints move one
 * designed step; every shipped set now clears the floor, and the hint stays a
 * step below secondary text.
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
  themeTextTierFailures,
  type Theme,
} from "./index.js";

const rowWashes = ["hover", "active", "accent", "selected"] as const;

const rowWashSet: ReadonlySet<string> = new Set(rowWashes);

const themes: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

const pairsFor = (role: "placeholder" | "inputForeground") =>
  contrastPairs.filter(
    ([foreground, background]) =>
      foreground === role && rowWashSet.has(background),
  );

const failuresFor = (role: "placeholder" | "inputForeground") =>
  themes.flatMap(([label, theme]) =>
    pairsFor(role).flatMap(([foreground, background, pairClass]) => {
      const floor = contrastFloors[theme.contrast][pairClass];
      const ratio = contrastRatio(
        theme.colors[foreground],
        theme.colors[background],
      );
      return ratio >= floor
        ? []
        : [`${label}: ${foreground} on ${background} at ${ratio} < ${floor}`];
    }),
  );

describe("a field's text and hint on the row washes", () => {
  it("documents the four row washes for both roles", () => {
    expect(pairsFor("inputForeground")).toEqual(
      rowWashes.map((surface) => ["inputForeground", surface, "body"]),
    );
    expect(pairsFor("placeholder")).toEqual(
      rowWashes.map((surface) => ["placeholder", surface, "secondary"]),
    );
  });

  it("keeps every shipped hint above the secondary floor on the row washes", () => {
    expect(failuresFor("placeholder")).toEqual([]);

    const ratioOf = (theme: Theme, surface: (typeof rowWashes)[number]) =>
      contrastRatio(theme.colors.placeholder, theme.colors[surface]);

    const defaultThemes = themes.filter(
      ([, theme]) => theme.contrast === "default",
    );
    const tightest = defaultThemes
      .flatMap(([label, theme]) =>
        rowWashes.map((surface) => ({
          label,
          surface,
          ratio: ratioOf(theme, surface),
        })),
      )
      .reduce((worst, current) =>
        current.ratio < worst.ratio ? current : worst,
      );

    expect([tightest.label, tightest.surface]).toEqual([
      "Light · Windows XP",
      "active",
    ]);
    expect(tightest.ratio).toBeCloseTo(4.589, 3);

    const smallestAaa = Math.min(
      ...themes
        .filter(([, theme]) => theme.contrast === "high")
        .flatMap(([, theme]) =>
          rowWashes.map((surface) => ratioOf(theme, surface)),
        ),
    );
    expect(smallestAaa).toBeGreaterThanOrEqual(7.1);
  });

  it("keeps typed text above the body floor on the row washes", () => {
    expect(failuresFor("inputForeground")).toEqual([]);
  });

  it("reports the pre-527 hint erased on a selected row", () => {
    const regressed = extendTheme(getTheme("dark"), {
      colors: { placeholder: "#858F9F" },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground, background }) =>
        foreground === "placeholder" && rowWashSet.has(background),
    );

    expect(failures).toHaveLength(4);
    expect(new Set(failures.map(({ background }) => background))).toEqual(
      new Set(rowWashes),
    );
    const selected = failures.find(
      ({ background }) => background === "selected",
    );
    expect(selected?.pairClass).toBe("secondary");
    expect(selected?.floor).toBe(contrastFloors.default.secondary);
    expect(selected?.ratio).toBeCloseTo(3.132, 3);
  });

  it("reports typed text erased by a row fill", () => {
    const dark = getTheme("dark");
    const regressed = extendTheme(dark, {
      colors: { inputForeground: dark.colors.selected },
    });
    const failures = themeContrastFailures(regressed).filter(
      ({ foreground, background }) =>
        foreground === "inputForeground" && rowWashSet.has(background),
    );

    expect(new Set(failures.map(({ background }) => background))).toEqual(
      new Set(rowWashes),
    );
    failures.forEach(({ pairClass, floor }) => {
      expect(pairClass).toBe("body");
      expect(floor).toBe(contrastFloors.default.body);
    });
  });

  it("keeps the hint a step below secondary text on the row washes", () => {
    themes.forEach(([, theme]) => {
      expect(themeTextTierFailures(theme)).toEqual([]);
    });

    const tightest = Math.min(
      ...themes.flatMap(([, theme]) =>
        rowWashes.map(
          (surface) =>
            contrastRatio(theme.colors.mutedForeground, theme.colors[surface]) /
            contrastRatio(theme.colors.placeholder, theme.colors[surface]),
        ),
      ),
    );

    expect(tightest).toBeGreaterThanOrEqual(contrastFloors.default.step);
    expect(tightest).toBeCloseTo(1.157, 2);
  });
});

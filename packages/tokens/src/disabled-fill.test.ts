/**
 * Bug guarded: the `disabled` fill was the only role `disabledControl` returns
 * that no pair measured. Plan 306 exempted it with the reason "no neutral can
 * clear both a white card and the quiet panel", but the shipped light fill
 * cleared both at once (1.133:1 and 1.103:1 — the floor is 1.05:1, not 3:1), so
 * the excuse hid a real defect: the identity dark fill **was** its `muted` panel
 * and its `popover` (**1.000:1**), the identity light fill **was** its `hover`
 * wash, and four light platform variants painted a fill lighter than their own
 * window (macOS 1.015:1, Windows 1.021:1, Windows 7 1.025:1, Linux 1.040:1).
 * Eight shipped pairs in six sets sat under the 1.05:1 surface floor while every
 * check returned `[]`. `disabledFillPairs` measures the fill on the five
 * surfaces a control is placed on, and five values move one designed step.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  disabledFillPairs,
  extendTheme,
  getTheme,
  stateFillSurfaces,
  themeContrastFailures,
  type Theme,
} from "./index.js";

const shipped: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

/** The five surfaces a filled control is placed on, in index order. */
const surfaces = stateFillSurfaces;

/**
 * The fill a set shipped before plan 737, keyed by the set. A set that is absent
 * already cleared the floor and kept its value.
 */
const preFix: Readonly<Record<string, string>> = {
  Light: "#EEF1F5",
  "Light · macOS": "#EEF1F5",
  "Light · Linux": "#EEF1F5",
  "Light · Windows": "#EEF1F5",
  Dark: "#222730",
  "Dark · macOS": "#222730",
  "Dark · Linux": "#222730",
  "Light · Windows 7": "#EAF0F7",
};

/** The `set: surface` pairs a theme misses under the surface floor. */
const missedSurfaces = (label: string, theme: Theme): ReadonlyArray<string> => {
  const floor = contrastFloors[theme.contrast].surface;
  return disabledFillPairs.flatMap(([foreground, background]) =>
    contrastRatio(theme.colors[foreground], theme.colors[background]) >= floor
      ? []
      : [`${label}: ${background}`],
  );
};

/** A shipped set rebuilt with the fill it shipped before plan 737. */
const withPreFixFill = ([label, theme]: readonly [string, Theme]) => {
  const value = preFix[label];
  return value === undefined
    ? []
    : [
        {
          label,
          theme: extendTheme(theme, { colors: { disabled: value } }),
        },
      ];
};

describe("the disabled fill", () => {
  it("measures the fill on every surface a control is placed on", () => {
    expect(disabledFillPairs).toEqual(
      surfaces.map((surface) => ["disabled", surface, "surface"]),
    );
    disabledFillPairs.forEach((pair) => {
      expect(contrastPairs).toContainEqual(pair);
    });
  });

  it("keeps every shipped set above the surface floor", () => {
    const missed = shipped.flatMap(([label, theme]) =>
      missedSurfaces(label, theme),
    );
    expect(missed).toEqual([]);
  });

  it("reports the eight pairs the pre-737 palettes missed", () => {
    const missed = shipped.flatMap((entry) =>
      withPreFixFill(entry).flatMap(({ label, theme }) =>
        missedSurfaces(label, theme),
      ),
    );
    expect(missed).toEqual([
      "Dark: popover",
      "Dark: muted",
      "Light · macOS: background",
      "Light · Linux: background",
      "Dark · Linux: background",
      "Light · Windows: background",
      "Light · Windows 7: background",
      "Light · Windows 7: muted",
    ]);

    const dark = getTheme("dark");
    expect(
      themeContrastFailures(
        extendTheme(dark, { colors: { disabled: "#222730" } }),
      )
        .filter((failure) => failure.foreground === "disabled")
        .map((failure) => failure.background),
    ).toEqual(["popover", "muted"]);
  });

  it("records the two collisions plan 306 named as the defect", () => {
    expect(contrastRatio("#222730", getTheme("dark").colors.muted)).toBe(1);
    expect(contrastRatio("#EEF1F5", getTheme("light").colors.hover)).toBe(1);
    expect(
      contrastRatio("#EEF1F5", getTheme("light").colors.disabled),
    ).not.toBe(1);
  });

  it("gives the fill its own neutral instead of a panel or a wash", () => {
    const light = getTheme("light");
    const dark = getTheme("dark");
    expect(light.colors.disabled).not.toBe(light.colors.hover);
    expect(light.colors.disabled).not.toBe(light.colors.muted);
    expect(dark.colors.disabled).not.toBe(dark.colors.popover);
    expect(dark.colors.disabled).not.toBe(dark.colors.muted);
    expect(
      contrastRatio(light.colors.disabled, light.colors.hover),
    ).toBeGreaterThan(1.05);
    expect(
      contrastRatio(dark.colors.disabled, dark.colors.popover),
    ).toBeGreaterThan(1.05);
  });

  it("keeps the label and the edge on the fill it moved", () => {
    shipped.forEach(([label, theme]) => {
      const floor = contrastFloors[theme.contrast];
      expect(
        contrastRatio(theme.colors.disabledForeground, theme.colors.disabled),
        `${label}: label on the fill`,
      ).toBeGreaterThanOrEqual(floor.inactive);
      expect(
        contrastRatio(theme.colors.border, theme.colors.disabled),
        `${label}: edge on the fill`,
      ).toBeGreaterThanOrEqual(floor.divider);
    });
  });

  it("holds the tightest shipped margin and names the set", () => {
    const margins = shipped.flatMap(([label, theme]) =>
      disabledFillPairs.map(([foreground, background]) => ({
        label,
        ratio: contrastRatio(
          theme.colors[foreground],
          theme.colors[background],
        ),
      })),
    );
    const tightest = margins.reduce((lowest, entry) =>
      entry.ratio < lowest.ratio ? entry : lowest,
    );
    expect(tightest.ratio).toBeGreaterThanOrEqual(
      contrastFloors.default.surface,
    );
    // The recipe that keeps its beige canvas at 1.065:1 on `background`.
    expect(tightest.label).toBe("Light · Windows XP");
  });
});

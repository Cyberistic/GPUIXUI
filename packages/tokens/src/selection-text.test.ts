/**
 * Guards the defect plan 081 fixed: the selection wash was measured on
 * `background` and `card` only, while a selected glyph is also painted on a
 * dialog's body, in a field, on a quiet panel, on a row under the pointer, on
 * the accent a selectable row uses and inside a selected row. High-contrast dark
 * measured 6.48:1 on `hover` and 5.49:1 on `active`, Linux dark 6.92:1 and
 * Windows dark 6.84:1 on `active` — under the 7:1 body floor — while every suite
 * stayed green. Each dark variant carried its light accent as the wash base, so
 * the wash lightened the surface white text already sits on.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  compositeOver,
  contrastFloors,
  contrastRatio,
  extendTheme,
  getTheme,
  selectionPairs,
  selectionSurfaces,
  themeContrastFailures,
  type Theme,
} from "./index.js";

const surfaces = [
  "background",
  "card",
  "muted",
  "hover",
  "active",
  "accent",
  "popover",
  "input",
  "selected",
] as const;

const themes: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

const measure = (
  theme: Theme,
  foreground: keyof Theme["colors"],
  background: keyof Theme["colors"],
): number =>
  contrastRatio(
    theme.colors[foreground],
    compositeOver(theme.colors.selection, theme.colors[background]),
  );

describe("the selection wash on painted surfaces", () => {
  it("documents one pair per surface a selected glyph paints on", () => {
    expect(selectionSurfaces).toEqual([
      "background",
      "card",
      "muted",
      "hover",
      "active",
      "accent",
      "popover",
      "input",
      "selected",
    ]);
    expect(selectionPairs.map(([, background]) => background)).toEqual([
      ...surfaces,
      "card",
      "selected",
      ...surfaces,
    ]);
    expect(selectionPairs.map(([foreground]) => foreground)).toEqual([
      "foreground",
      "foreground",
      "foreground",
      "foreground",
      "foreground",
      "foreground",
      "popoverForeground",
      "inputForeground",
      "selectedForeground",
      "cardForeground",
      "foreground",
      "mutedForeground",
      "mutedForeground",
      "mutedForeground",
      "mutedForeground",
      "mutedForeground",
      "mutedForeground",
      "mutedForeground",
      "mutedForeground",
      "mutedForeground",
    ]);
  });

  it("clears the declared floor on every shipped theme", () => {
    themes.forEach(([label, theme]) => {
      const floors = contrastFloors[theme.contrast];
      selectionPairs.forEach(([foreground, background, pairClass]) => {
        expect(
          measure(theme, foreground, background),
          `${label}: ${foreground} over selection on ${background}`,
        ).toBeGreaterThanOrEqual(floors[pairClass]);
      });
    });
  });

  it("keeps selected text readable on a row that is already painted", () => {
    const namedDark = themes.filter(([, theme]) =>
      ["High contrast dark", "Dark · Linux", "Dark · Windows"].includes(
        theme.name,
      ),
    );
    expect(namedDark).toHaveLength(3);

    namedDark.forEach(([label, theme]) => {
      expect(
        measure(theme, "foreground", "active"),
        `${label}: foreground over selection on active`,
      ).toBeGreaterThanOrEqual(contrastFloors[theme.contrast].body);
      // The pre-081 washes were the light accent, which lightened the row.
      expect(theme.colors.selection, label).not.toBe("#C7CBFF4D");
      expect(theme.colors.selection, label).not.toBe("#78AEED33");
      expect(theme.colors.selection, label).not.toBe("#4CC2FF33");
    });
  });

  it("names the surface when a theme regresses", () => {
    const regressed = extendTheme(getTheme("dark", "high"), {
      // The pre-081 AAA wash: light iris, which lifts the row out from under
      // white text.
      colors: { selection: "#C7CBFF4D" },
    });
    const statusTextRoles = new Set([
      "infoText",
      "successText",
      "warningText",
      "destructiveText",
    ]);
    const failures = themeContrastFailures(regressed).filter(
      ({ wash, background, foreground }) =>
        wash === "selection" &&
        !statusTextRoles.has(foreground) &&
        selectionSurfaces.some((surface) => surface === background),
    );

    expect(failures.map(({ background }) => background)).toEqual([
      "hover",
      "active",
      "selected",
      "selected",
      "muted",
      "hover",
      "active",
      "accent",
      "popover",
      "selected",
    ]);
    expect(
      failures.map(({ foreground, pairClass, floor }) => ({
        foreground,
        pairClass,
        floor,
      })),
    ).toEqual([
      { foreground: "foreground", pairClass: "body", floor: 7 },
      { foreground: "foreground", pairClass: "body", floor: 7 },
      { foreground: "selectedForeground", pairClass: "secondary", floor: 7 },
      { foreground: "foreground", pairClass: "body", floor: 7 },
      { foreground: "mutedForeground", pairClass: "secondary", floor: 7 },
      { foreground: "mutedForeground", pairClass: "secondary", floor: 7 },
      { foreground: "mutedForeground", pairClass: "secondary", floor: 7 },
      { foreground: "mutedForeground", pairClass: "secondary", floor: 7 },
      { foreground: "mutedForeground", pairClass: "secondary", floor: 7 },
      { foreground: "mutedForeground", pairClass: "secondary", floor: 7 },
    ]);
  });
});

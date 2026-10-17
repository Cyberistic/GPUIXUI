/**
 * Guards the gap plan 312 closed: the contract measured secondary text, status
 * text and the focus ring on the four row washes, but not the default text role
 * a row paints. A selected list row's title is `foreground` on `selected`
 * because `ListItemTitle` overrides the row's inherited `selectedForeground`; a
 * hovered selectable row paints `foreground` on `accent`; a selected row under
 * the pointer keeps `selectedForeground` on `accent`/`active`; and a menu row
 * paints `popoverForeground` on `hover`/`active`. A text field's edge is
 * `border` on the `input` fill, which the divider contract never measured.
 *
 * Every shipped set clears its floor, so no colour moves. The pairs exist so an
 * edited theme or copied platform style cannot erase a row label on its own
 * state fill, or a field's edge on its own background, while the suite stays
 * green. Removing any pair from `contrastPairs` makes its regression below fail.
 */
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getPlatformTheme,
  getTheme,
  themeContrastFailures,
  themeModes,
  type Theme,
} from "./index.js";

const themes: ReadonlyArray<readonly [string, Theme]> = [
  ["light", getTheme("light")],
  ["dark", getTheme("dark")],
  ["high-contrast light", getTheme("light", "high")],
  ["high-contrast dark", getTheme("dark", "high")],
  ...(["darwin", "linux", "win32"] as const).flatMap(
    (platform): ReadonlyArray<readonly [string, Theme]> =>
      themeModes.map((mode) => [
        `${platform} ${mode}`,
        getPlatformTheme(platform, mode),
      ]),
  ),
];

const rowTextPairs = [
  ["foreground", "accent", "body"],
  ["foreground", "selected", "body"],
  ["popoverForeground", "hover", "body"],
  ["popoverForeground", "active", "body"],
  ["selectedForeground", "hover", "secondary"],
  ["selectedForeground", "active", "secondary"],
] as const;

const failureFor = (
  theme: Theme,
  foreground: string,
  background: string,
): ReturnType<typeof themeContrastFailures> =>
  themeContrastFailures(theme).filter(
    (failure) =>
      failure.wash === undefined &&
      failure.foreground === foreground &&
      failure.background === background,
  );

describe("the row's own text on the washes it paints", () => {
  it("documents each painted pair once, in its intended class", () => {
    rowTextPairs.forEach(([foreground, background, pairClass]) => {
      expect(
        contrastPairs.filter(
          ([pairForeground, pairBackground]) =>
            pairForeground === foreground && pairBackground === background,
        ),
        `${foreground} on ${background}`,
      ).toEqual([[foreground, background, pairClass]]);
    });
  });

  it("clears the declared floor on every shipped set", () => {
    themes.forEach(([label, theme]) => {
      rowTextPairs.forEach(([foreground, background, pairClass]) => {
        const floor = contrastFloors[theme.contrast][pairClass];
        expect(
          contrastRatio(theme.colors[foreground], theme.colors[background]),
          `${label}: ${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(floor);
      });
    });
  });

  it("reports a row title erased on the hover wash", () => {
    const regressed = extendTheme(getTheme("light"), {
      colors: { accent: "#191D25" },
    });
    const failures = failureFor(regressed, "foreground", "accent");

    expect(failures).toHaveLength(1);
    expect(failures[0]?.pairClass).toBe("body");
    expect(failures[0]?.ratio).toBeCloseTo(1, 4);
  });

  it("reports a selected title erased on its selected fill", () => {
    const regressed = extendTheme(getTheme("light"), {
      colors: { selected: "#191D25" },
    });
    const failures = failureFor(regressed, "foreground", "selected");

    expect(failures).toHaveLength(1);
    expect(failures[0]?.pairClass).toBe("body");
    expect(failures[0]?.ratio).toBeCloseTo(1, 4);
  });

  it("reports selected text erased while the row is hovered", () => {
    const regressed = extendTheme(getTheme("light"), {
      colors: { hover: "#3B2C8F" },
    });
    const failures = failureFor(regressed, "selectedForeground", "hover");

    expect(failures).toHaveLength(1);
    expect(failures[0]?.pairClass).toBe("secondary");
    expect(failures[0]?.floor).toBe(contrastFloors.default.secondary);
    expect(failures[0]?.ratio).toBeCloseTo(1, 4);
  });

  it("reports a menu row erased while pressed", () => {
    const regressed = extendTheme(getTheme("dark"), {
      colors: { active: "#F6F8FA" },
    });
    const failures = failureFor(regressed, "popoverForeground", "active");

    expect(failures).toHaveLength(1);
    expect(failures[0]?.pairClass).toBe("body");
    expect(failures[0]?.ratio).toBeCloseTo(1, 4);
  });

  it("holds the field edge to the divider floor on its own fill", () => {
    expect(
      contrastPairs.filter(
        ([foreground, background]) =>
          foreground === "border" && background === "input",
      ),
    ).toEqual([["border", "input", "divider"]]);

    themes.forEach(([label, theme]) => {
      const floor = contrastFloors[theme.contrast].divider;
      expect(
        contrastRatio(theme.colors.border, theme.colors.input),
        `${label}: border on input`,
      ).toBeGreaterThanOrEqual(floor);
    });

    const regressed = extendTheme(getTheme("light"), {
      colors: { input: "#D6DAE1" },
    });
    const failures = failureFor(regressed, "border", "input");

    expect(failures).toHaveLength(1);
    expect(failures[0]?.pairClass).toBe("divider");
    expect(failures[0]?.ratio).toBeCloseTo(1, 4);
  });
});

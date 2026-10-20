/**
 * Guards the defect plan 689 fixes: `inputForeground` is a text role with
 * at-rest pairs on fourteen surfaces, but the inherited selection wash measured
 * it on the `input` fill only (`selectionForegrounds` maps that surface), so a
 * theme that gives a field its own ink could erase selected typed text on every
 * other surface a field sits on while every check returned `[]`.
 *
 * The regression is measured on the dark identity with one role changed:
 * `inputForeground: "#D3D8E1"` returns `[]` from the pre-fix checker while the
 * selected text measures 5.657:1 on `selected` and 6.600:1 on `active`, under
 * the 7:1 body floor. The second case holds the list to the at-rest domain, so
 * a field surface added without its washed pair fails here.
 */
import { describe, expect, it } from "vitest";
import {
  compositeOver,
  contrastFloors,
  contrastPairs,
  contrastRatio,
  selectionInputPairs,
  themeContrastFailures,
} from "./contrast.js";
import { shippedThemes } from "./shipped-themes.js";
import { darkTheme, extendTheme } from "./theme.js";
import { themeFailures } from "./theme-check.js";

describe("a field's typed text through a text selection", () => {
  const errored = extendTheme(darkTheme, {
    colors: { inputForeground: "#D3D8E1" },
  });

  it("reports the selected text a theme erases on the surfaces a field sits on", () => {
    const failures = themeContrastFailures(errored).filter(
      ({ foreground, wash }) =>
        foreground === "inputForeground" && wash === "selection",
    );

    expect(new Set(failures.map(({ background }) => background))).toEqual(
      new Set([
        "active",
        "destructiveSoft",
        "infoSoft",
        "selected",
        "successSoft",
        "warningSoft",
      ]),
    );
    failures.forEach(({ ratio }) =>
      expect(ratio).toBeLessThan(contrastFloors.default.body),
    );
    // The defect is the total check's: the colour, typeface, hierarchy and
    // metric halves all accept this theme.
    expect(themeFailures(errored)).not.toEqual([]);
    expect(
      themeFailures(errored).every(({ kind }) => kind === "contrast"),
    ).toBe(true);
  });

  it("covers every field surface the at-rest contract measures", () => {
    const atRest = new Set(
      contrastPairs
        .filter(([role]) => role === "inputForeground")
        .map(([, surface]) => surface),
    );
    // The `input` fill is the `inputForeground` pair in `selectionPairs`; the
    // pressed row's own typed text lives at rest in `selectionPressPairs`, which
    // is the list that owns it (plan 723).
    atRest.delete("input");
    atRest.delete("selectedActive");

    expect(selectionInputPairs).toHaveLength(12);
    expect(new Set(selectionInputPairs.map(([, surface]) => surface))).toEqual(
      atRest,
    );
  });

  it("keeps every shipped set on its body floor", () => {
    shippedThemes.forEach(({ theme }) => {
      const floor = contrastFloors[theme.contrast].body;
      selectionInputPairs.forEach(([foreground, background]) => {
        const ratio = contrastRatio(
          theme.colors[foreground],
          compositeOver(theme.colors.selection, theme.colors[background]),
        );
        expect(
          ratio,
          `${theme.name}: ${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(floor);
      });
    });
  });
});

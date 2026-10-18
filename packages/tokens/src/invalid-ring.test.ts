/**
 * Guards the gap plan 340 closed. GPUix 0.10.0 has no `outline*` and no
 * `focusVisible`, so the focus ring is a zero-offset, zero-blur `boxShadow` — the
 * only focus indicator the runtime can draw. `controlFocusStyle`
 * (`packages/primitives/src/core/style.ts`) recolours that ring with
 * `destructive` when a field fails validation, and `otpCellStyle` /
 * `NumberField` call it for a focused invalid field.
 *
 * `contrastPairs` measured `destructive` as a fill and, since plan 325, as the
 * field's own edge on `input`/`background` — but never as the ring painted
 * *outside* the control, on the card, popover, quiet panel, row wash or soft
 * status fill behind it. So an edited theme could set the error colour close to
 * that surface and erase the focus indicator while `themeContrastFailures`
 * returned `[]`.
 *
 * The pairs are a guard, not a palette fix: every shipped set already clears its
 * declared boundary floor (3.048:1 on Linux dark at the tightest), so no colour
 * moves. `destructive` on `background` is not re-added: the ColorPicker hex
 * field's error edge already measures that composition.
 */
import { describe, expect, it } from "vitest";
import { shippedThemes } from "./shipped-themes.js";
import {
  contrastFloors,
  contrastPairs,
  contrastRatio,
  extendTheme,
  getTheme,
  invalidRingPairs,
  themeContrastFailures,
  type Theme,
} from "./index.js";

const themes: ReadonlyArray<readonly [string, Theme]> = shippedThemes.map(
  ({ theme }) => [theme.name, theme] as const,
);

const invalidRingSurfaces = [
  "card",
  "popover",
  "muted",
  "accent",
  "hover",
  "active",
  "selected",
  "infoSoft",
  "successSoft",
  "warningSoft",
  "destructiveSoft",
] as const;

const ringFailures = (theme: Theme, surface: keyof Theme["colors"]) =>
  themeContrastFailures(theme).filter(
    ({ foreground, background, pairClass, wash }) =>
      foreground === "destructive" &&
      background === surface &&
      pairClass === "boundary" &&
      wash === undefined,
  );

describe("the invalid control's focus ring", () => {
  it("names every added ring surface once", () => {
    expect(
      invalidRingPairs.map(([foreground, background, pairClass]) => [
        foreground,
        background,
        pairClass,
      ]),
    ).toEqual(
      invalidRingSurfaces.map((surface) => [
        "destructive",
        surface,
        "boundary",
      ]),
    );
    invalidRingPairs.forEach((pair) =>
      expect(contrastPairs, pair.join("/")).toContain(pair),
    );
    expect(
      invalidRingPairs.filter(([, background]) => background === "background"),
    ).toEqual([]);
  });

  it("keeps every shipped theme above its declared boundary floor", () => {
    const failures = themes.flatMap(([label, theme]) => {
      const floor = contrastFloors[theme.contrast].boundary;
      return invalidRingSurfaces.flatMap((surface) => {
        const ratio = contrastRatio(
          theme.colors.destructive,
          theme.colors[surface],
        );
        return ratio >= floor
          ? []
          : [`${label}: destructive on ${surface} at ${ratio} < ${floor}`];
      });
    });

    expect(failures).toEqual([]);
  });

  it("reports an invalid ring erased on a light card", () => {
    const light = getTheme("light");
    const regressed = extendTheme(light, {
      colors: { destructive: light.colors.card },
    });
    const failures = ringFailures(regressed, "card");

    expect(failures).toHaveLength(1);
    expect(failures[0]?.pairClass).toBe("boundary");
    expect(failures[0]?.floor).toBe(contrastFloors.default.boundary);
    expect(failures[0]?.ratio).toBeCloseTo(1, 5);
  });

  it("checks the AAA theme at the level it declares", () => {
    const accessible = getTheme("dark", "high");
    const regressed = extendTheme(accessible, {
      colors: { destructive: accessible.colors.popover },
    });
    const failures = ringFailures(regressed, "popover");

    expect(failures).toHaveLength(1);
    expect(failures[0]?.floor).toBe(contrastFloors.high.boundary);
    expect(failures[0]?.ratio).toBeCloseTo(1, 5);
  });

  it("covers the soft status fills an invalid cell can sit on", () => {
    expect(
      invalidRingPairs
        .map(([, background]) => background)
        .filter((background) => background.endsWith("Soft")),
    ).toEqual(["infoSoft", "successSoft", "warningSoft", "destructiveSoft"]);
  });

  it("pins the tightest figures the catalogue quotes", () => {
    const worst = (contrast: "default" | "high") =>
      themes
        .filter(([, theme]) => theme.contrast === contrast)
        .flatMap(([label, theme]) =>
          invalidRingSurfaces.map(
            (surface) =>
              [
                label,
                surface,
                contrastRatio(theme.colors.destructive, theme.colors[surface]),
              ] as const,
          ),
        )
        .reduce((tightest, current) =>
          current[2] < tightest[2] ? current : tightest,
        );

    const [defaultLabel, defaultSurface, defaultRatio] = worst("default");
    const [highLabel, highSurface, highRatio] = worst("high");

    expect([
      defaultLabel,
      defaultSurface,
      Number(defaultRatio.toFixed(3)),
    ]).toEqual(["Dark · Linux", "selected", 3.048]);
    expect([highLabel, highSurface, Number(highRatio.toFixed(3))]).toEqual([
      "High contrast dark",
      "active",
      5.502,
    ]);
  });
});

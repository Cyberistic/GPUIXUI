/**
 * Guards the bug plan 394 closes: an action inside a soft status panel paints
 * the canvas-tuned washes or the neutral fill, which cannot be perceived on a
 * tone tint — **84 of the 288 shipped `hover`/`active`/`secondary`-on-`xSoft`
 * pairs measured under 1.05:1**, the worst Windows light `active` on
 * `destructiveSoft` at **1.0042:1** — so an Alert's dismiss control had no press
 * state and the documented "Try again" action had no fill, while
 * `themeContrastFailures` returned `[]` because no pair existed. The raised
 * `softAction` family is the designed answer, and these cases hold it to the
 * contract, prove the rejected composition is still measured, and prove the
 * public checker reports an edited theme that erases it.
 *
 * Plan 397 guards the family's scope: a Toast is a `popover` card, not a
 * tone-tinted panel, and `softAction` equals that card in every light shipped
 * set (1.0000:1) — so the floating-card case measures the failure the documents
 * must not recommend, and the canvas case proves the neutral family the Toast
 * action actually paints clears the same floors.
 */
import { describe, expect, it } from "vitest";
import {
  contrastFloors,
  contrastRatio,
  extendTheme,
  filledControl,
  getTheme,
  highContrastThemes,
  softAction,
  softActionLabelPairs,
  softActionPairs,
  softActionStepPairs,
  themeContrastFailures,
  themeFailures,
  themes,
} from "./index.js";
import { shippedThemes } from "./shipped-themes.js";

const softSurfaces = softActionPairs
  .filter(([fill]) => fill === "softAction")
  .map(([, background]) => background);
const neutralFills = ["hover", "active", "secondary"] as const;
const family = ["softAction", "softActionHover", "softActionActive"] as const;

describe("the action inside a soft status panel", () => {
  it("clears every panel-action pair in every shipped set", () => {
    shippedThemes.forEach(({ theme }) => {
      [
        ...softActionPairs,
        ...softActionStepPairs,
        ...softActionLabelPairs,
      ].forEach(([foreground, background, pairClass]) => {
        expect(
          contrastRatio(theme.colors[foreground], theme.colors[background]),
          `${theme.name}: ${foreground} on ${background}`,
        ).toBeGreaterThanOrEqual(contrastFloors[theme.contrast][pairClass]);
      });
    });
  });

  it("states the rejected neutral composition and its worst pair", () => {
    const measured = shippedThemes.flatMap(({ theme }) =>
      neutralFills.flatMap((fill) =>
        softSurfaces.map((background) => ({
          theme,
          fill,
          background,
          ratio: contrastRatio(theme.colors[fill], theme.colors[background]),
        })),
      ),
    );
    const failing = measured.filter(
      ({ theme, ratio }) => ratio < contrastFloors[theme.contrast].surface,
    );

    expect(measured).toHaveLength(
      shippedThemes.length * neutralFills.length * softSurfaces.length,
    );
    expect(failing).toHaveLength(84);

    const worst = failing.toSorted((a, b) => a.ratio - b.ratio)[0];
    expect(worst?.theme.name).toContain("Windows");
    expect(worst?.fill).toBe("active");
    expect(worst?.background).toBe("destructiveSoft");
    expect(worst?.ratio).toBeLessThan(contrastFloors.default.surface);
  });

  it("reports an edited theme that erases the panel action", () => {
    const dark = getTheme("dark");
    const erased = extendTheme(dark, {
      colors: { softAction: dark.colors.infoSoft },
    });

    expect(themeContrastFailures(erased)).toContainEqual({
      foreground: "softAction",
      background: "infoSoft",
      pairClass: "surface",
      floor: contrastFloors.default.surface,
      ratio: 1,
    });
  });

  it("reports a collapsed press in the panel-action ladder", () => {
    const light = getTheme("light");
    const collapsed = extendTheme(light, {
      colors: { softActionActive: light.colors.softActionHover },
    });

    expect(themeContrastFailures(collapsed)).toContainEqual({
      foreground: "softActionActive",
      background: "softActionHover",
      pairClass: "step",
      floor: contrastFloors.default.step,
      ratio: 1,
    });
  });

  it("resolves the family for every shipped contrast level", () => {
    const light = themes.light;
    expect(softAction(light)).toEqual({
      background: light.colors.softAction,
      foreground: light.colors.softActionForeground,
      hover: light.colors.softActionHover,
      active: light.colors.softActionActive,
    });
    [
      light,
      themes.dark,
      highContrastThemes.light,
      highContrastThemes.dark,
    ].forEach((theme) => {
      const resolved = softAction(theme);
      expect(resolved.background).toBe(theme.colors.softAction);
      expect(resolved.active).toBe(theme.colors.softActionActive);
    });
  });

  it("keeps the three fills distinct in every shipped set", () => {
    shippedThemes.forEach(({ theme }) => {
      const values = family.map((role) => theme.colors[role]);
      expect(new Set(values).size, theme.name).toBe(family.length);
    });
  });

  it("reaches the total check as a contrast failure", () => {
    const dark = getTheme("dark");
    const erased = extendTheme(dark, {
      colors: { softAction: dark.colors.successSoft },
    });
    const failures = themeFailures(erased).filter(
      (failure) =>
        failure.kind === "contrast" && failure.foreground === "softAction",
    );

    expect(failures.length).toBeGreaterThan(0);
  });

  it("states the floating card the family cannot carry", () => {
    const lightSets = shippedThemes.filter(
      ({ theme }) => theme.mode === "light",
    );
    expect(lightSets).toHaveLength(12);

    const measured = lightSets.map(({ theme }) => ({
      theme,
      ratio: contrastRatio(theme.colors.softAction, theme.colors.popover),
    }));
    measured.forEach(({ theme, ratio }) => {
      expect(ratio, theme.name).toBeLessThan(
        contrastFloors[theme.contrast].surface,
      );
    });

    expect(measured.find(({ theme }) => theme.name === "Light")?.ratio).toBe(1);

    shippedThemes
      .filter(({ theme }) => theme.mode === "dark")
      .forEach(({ theme }) => {
        expect(
          contrastRatio(theme.colors.softAction, theme.colors.popover),
          theme.name,
        ).toBeGreaterThanOrEqual(contrastFloors[theme.contrast].surface);
      });
  });

  it("measures the canvas family a Toast action actually paints", () => {
    shippedThemes.forEach(({ theme }) => {
      const action = filledControl(theme, "secondary");
      const floors = contrastFloors[theme.contrast];

      expect(
        contrastRatio(action.background, theme.colors.popover),
        theme.name,
      ).toBeGreaterThanOrEqual(floors.surface);
      expect(
        contrastRatio(action.hover, action.background),
        `${theme.name} hover`,
      ).toBeGreaterThanOrEqual(floors.step);
      expect(
        contrastRatio(action.active, action.hover),
        `${theme.name} active`,
      ).toBeGreaterThanOrEqual(floors.step);
      [action.background, action.hover, action.active].forEach((fill) => {
        expect(
          contrastRatio(action.foreground, fill),
          `${theme.name} label on ${fill}`,
        ).toBeGreaterThanOrEqual(floors.secondary);
      });
    });
  });
});

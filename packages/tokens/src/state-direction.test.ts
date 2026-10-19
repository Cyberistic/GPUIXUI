/**
 * Guards the gap plan 502 closes: the step contract publishes each pointer
 * state's *distance* — `xHover` one 1.05:1 step from `x`, `xActive` from
 * `xHover` — but a ratio is symmetric, so it cannot see a step that moves the
 * wrong way. Plan 097's original defect was exactly that: the light primary's
 * hover and press came out *lighter* than its resting fill, toward the white
 * canvas. Every shipped theme now steps away from the canvas (darker in light,
 * lighter in dark) and `filled-states.test.ts` asserts it on the shipped
 * constants, but a copied theme could reintroduce the defect and still return
 * `[]` from all five checks. `themeDirectionFailures` publishes the rule; the
 * light and dark cases below are the two measured inversions.
 *
 * Equality is deliberately the step lists' defect, not this check's: a
 * collapsed pair is reported once, by `stateStepPairs` (or its siblings).
 */
import { describe, expect, it } from "vitest";
import {
  relativeLuminance,
  selectionStepPairs,
  shippedThemes,
  softActionStepPairs,
  stateLadders,
  stateStepPairs,
  themeContrastFailures,
  themeDirectionFailures,
  themeFailures,
  washStepPairs,
} from "./index.js";
import { extendTheme, getTheme } from "./theme.js";

/** A light family whose two steps move lighter, toward the canvas. */
const invertedLight = () =>
  extendTheme(getTheme("light"), {
    colors: {
      primary: "#3A2A9A",
      primaryHover: "#4A38AE",
      primaryActive: "#5A46C2",
    },
  });

/** The same inversion in dark mode: both steps move darker. */
const invertedDark = () =>
  extendTheme(getTheme("dark"), {
    colors: {
      primary: "#A7A9FF",
      primaryHover: "#948CFA",
      primaryActive: "#8377F6",
    },
  });

describe("interaction ladder direction", () => {
  shippedThemes.forEach(({ theme }) => {
    it(`${theme.name}: every ladder steps away from the canvas`, () => {
      expect(themeDirectionFailures(theme)).toEqual([]);
    });
  });

  it("reports a light family whose steps move lighter", () => {
    const inverted = invertedLight();

    // The step floor and every on-colour pair still pass: 1.248:1 and 1.252:1
    // between the fills, and white on them stays above 6.8:1.
    expect(themeContrastFailures(inverted)).toEqual([]);
    expect(
      themeDirectionFailures(inverted).map(
        ({ ladder, from, to, expected }) => ({
          ladder,
          from,
          to,
          expected,
        }),
      ),
    ).toEqual([
      {
        ladder: "primary",
        from: "primary",
        to: "primaryHover",
        expected: "darker",
      },
      {
        ladder: "primary",
        from: "primaryHover",
        to: "primaryActive",
        expected: "darker",
      },
    ]);
    expect(themeFailures(inverted).map(({ kind }) => kind)).toEqual([
      "direction",
      "direction",
    ]);
  });

  it("reports a dark family whose steps move darker", () => {
    const inverted = invertedDark();

    expect(themeContrastFailures(inverted)).toEqual([]);
    expect(
      themeDirectionFailures(inverted).map(({ from, to, expected }) => ({
        from,
        to,
        expected,
      })),
    ).toEqual([
      { from: "primary", to: "primaryHover", expected: "lighter" },
      { from: "primaryHover", to: "primaryActive", expected: "lighter" },
    ]);
  });

  it("leaves an equal pair to the step contract", () => {
    const identity = getTheme("light");
    const collapsed = extendTheme(identity, {
      colors: { primaryHover: identity.colors.primary },
    });

    expect(themeDirectionFailures(collapsed)).toEqual([]);
    expect(
      themeContrastFailures(collapsed).some(
        ({ foreground, background, pairClass }) =>
          foreground === "primaryHover" &&
          background === "primary" &&
          pairClass === "step",
      ),
    ).toBe(true);
  });

  it("measures relative luminance on the hex form the maths parses", () => {
    expect(relativeLuminance("#FFFFFF")).toBe(1);
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#FFFFFF")).toBeGreaterThan(
      relativeLuminance("#808080"),
    );
    expect(Number.isNaN(relativeLuminance("black"))).toBe(true);
  });

  it("publishes a distance for every ladder step", () => {
    const measured = new Set(
      [
        ...stateStepPairs,
        ...softActionStepPairs,
        ...washStepPairs,
        ...selectionStepPairs,
      ].map(([from, to]) => `${from}|${to}`),
    );
    const missing = stateLadders.flatMap(({ name, roles }) =>
      roles.flatMap((to, index) => {
        const from = roles[index - 1];
        return from === undefined || measured.has(`${to}|${from}`)
          ? []
          : [`${name}: ${from} → ${to}`];
      }),
    );

    expect(missing).toEqual([]);
  });
});

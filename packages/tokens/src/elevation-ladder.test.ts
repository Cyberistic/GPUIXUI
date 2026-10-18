/**
 * Guards the defect plan 390 fixes: `docs/design-system.md` publishes `sm` →
 * `md` → `lg` as increasing heights — resting cards, menus, dialogs — and
 * `elevationShadow` paints a level's first entry, but `themeMetricFailures`
 * compared only the range of one shadow. An edited theme could set `lg` to the
 * `sm` feather (or a 0px feather) and still get `[]`, so a dialog sat closer to
 * the surface than a resting card while every check stayed green.
 *
 * Each "reports" case fails without `featherLadder` in `metrics.ts`. The
 * shipped-theme case fails if a value moves out of the ladder, and the
 * "intended edit" cases hold the rule to the feather alone: opacity and a flat
 * theme stay designs.
 */
import { describe, expect, it } from "vitest";
import { themeContrastFailures } from "./contrast.js";
import type { ElevationShape } from "./elevation.js";
import { themeMetricFailures } from "./metrics.js";
import { shippedThemes } from "./shipped-themes.js";
import { extendTheme, lightTheme } from "./theme.js";

/** A complete level, so a case can vary the feather without shipped data. */
const feathered = (blurRadius: number): ElevationShape => ({
  offsetX: 0,
  offsetY: 4,
  blurRadius,
  spreadRadius: 0,
  alpha: 0.12,
});

const failuresOf = (overrides: Parameters<typeof extendTheme>[1]) =>
  themeMetricFailures(extendTheme(lightTheme, overrides));

describe("the elevation ladder", () => {
  it("reports a dialog that feathers less than the rest", () => {
    const edited = extendTheme(lightTheme, {
      elevation: {
        sm: [feathered(2)],
        md: [feathered(12)],
        lg: [feathered(2)],
      },
    });
    expect(themeContrastFailures(edited)).toEqual([]);
    expect(themeMetricFailures(edited)).toEqual([
      {
        group: "elevation",
        member: "lg[0].blurRadius",
        rule: "non-decreasing",
        actual: 2,
        bound: 12,
      },
    ]);
  });

  it("reports a hard-edged largest level", () => {
    expect(failuresOf({ elevation: { lg: [feathered(0)] } })).toEqual([
      {
        group: "elevation",
        member: "lg[0].blurRadius",
        rule: "non-decreasing",
        actual: 0,
        bound: 12,
      },
    ]);
  });

  it("reports the painted entry, not a later one", () => {
    expect(
      failuresOf({ elevation: { md: [feathered(0), feathered(100)] } }),
    ).toEqual([
      {
        group: "elevation",
        member: "md[0].blurRadius",
        rule: "non-decreasing",
        actual: 0,
        bound: 2,
      },
    ]);
  });

  it("keeps one failure for an empty level", () => {
    expect(failuresOf({ elevation: { md: [] } })).toEqual([
      {
        group: "elevation",
        member: "md",
        rule: "at-least",
        actual: 0,
        bound: 1,
      },
    ]);
  });

  it("allows equal feathers between levels", () => {
    expect(failuresOf({ elevation: { lg: [feathered(12)] } })).toEqual([]);
  });

  it("does not govern opacity", () => {
    const fainter = extendTheme(lightTheme, {
      elevation: { lg: [{ ...feathered(48), alpha: 0.05 }] },
    });
    expect(themeMetricFailures(fainter)).toEqual([]);
  });

  it("allows a flat theme", () => {
    expect(
      failuresOf({
        elevation: {
          sm: [feathered(0)],
          md: [feathered(0)],
          lg: [feathered(0)],
        },
      }),
    ).toEqual([]);
  });

  it("does not compare a feather the range rules reject", () => {
    expect(
      failuresOf({
        elevation: { md: [feathered(Number.POSITIVE_INFINITY)] },
      }),
    ).toEqual([
      {
        group: "elevation",
        member: "md[0].blurRadius",
        rule: "finite",
        actual: Number.POSITIVE_INFINITY,
        bound: 0,
      },
    ]);
  });

  it("passes every shipped set", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(themeMetricFailures(theme), theme.name).toEqual([]);
    });
  });
});

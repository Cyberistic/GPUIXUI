/**
 * Guards the defect plan 520 fixes: plan `514` gave the disabled action inside a
 * tone-tinted status panel a resting label (`disabledForeground` on `softAction`)
 * and plan `504` routes content on an opaque fill through the inverse
 * `selectionOnFill` veil, but no pair measured the disabled label through that
 * veil. Identity dark measured **2.799:1** and high-contrast dark **3.304:1**
 * there, under the 3:1 / 4.5:1 `inactive` floor, while all six `themeFailures`
 * checks returned `[]`.
 *
 * The composition is the intersection of two contracts: `inactivePanelActionPairs`
 * measures the resting fill and `selectionFillPairs` measures the fill's enabled
 * foreground. `selectionFillInactivePairs` holds the one disabled composition
 * through the same veil.
 */
import { describe, expect, it } from "vitest";
import {
  compositeOver,
  contrastFloors,
  contrastRatio,
  extendTheme,
  getTheme,
  selectionFillInactivePairs,
  shippedThemes,
  themeColorFailures,
  themeContrastFailures,
  themeDirectionFailures,
  themeFailures,
  themeMetricFailures,
  themeTextTierFailures,
  themeTypefaceFailures,
} from "./index.js";

const washedRatio = (theme: ReturnType<typeof getTheme>): number =>
  contrastRatio(
    theme.colors.disabledForeground,
    compositeOver(theme.colors.selectionOnFill, theme.colors.softAction),
  );

describe("the disabled panel action through the inverse selection veil", () => {
  it("publishes the one resting composition", () => {
    expect(selectionFillInactivePairs).toEqual([
      ["disabledForeground", "softAction", "inactive"],
    ]);
    // A disabled control does not step, and the enabled label is
    // `selectionFillPairs`' composition, not this one.
    expect(
      selectionFillInactivePairs.map(([, background]) => background),
    ).not.toContain("softActionHover");
    expect(
      selectionFillInactivePairs.map(([, background]) => background),
    ).not.toContain("softActionActive");
    expect(
      selectionFillInactivePairs.map(([foreground]) => foreground),
    ).not.toContain("softActionForeground");
  });

  it("holds every shipped set through the veil", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(
        washedRatio(theme),
        `${theme.name}: disabledForeground through selectionOnFill on softAction`,
      ).toBeGreaterThanOrEqual(contrastFloors[theme.contrast].inactive);
      expect(themeFailures(theme), theme.name).toEqual([]);
    });
  });

  it("pins the two pre-fix values", () => {
    const dark = extendTheme(getTheme("dark"), {
      colors: { disabledForeground: "#A1A9B7" },
    });
    const high = extendTheme(getTheme("dark", "high"), {
      colors: { disabledForeground: "#B0B0B0" },
    });

    expect(washedRatio(dark)).toBeCloseTo(2.799, 3);
    expect(washedRatio(high)).toBeCloseTo(3.304, 3);
    expect(washedRatio(dark)).toBeLessThan(contrastFloors.default.inactive);
    expect(washedRatio(high)).toBeLessThan(contrastFloors.high.inactive);
  });

  it("reports an edited theme through the public checker", () => {
    const base = getTheme("dark");
    const broken = extendTheme(base, {
      colors: {
        disabledForeground: compositeOver(
          base.colors.selectionOnFill,
          base.colors.softAction,
        ),
      },
    });
    const failures = themeFailures(broken).flatMap((failure) =>
      failure.kind === "contrast" &&
      failure.foreground === "disabledForeground" &&
      failure.background === "softAction" &&
      failure.wash === "selectionOnFill"
        ? [failure]
        : [],
    );

    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({
      kind: "contrast",
      foreground: "disabledForeground",
      background: "softAction",
      wash: "selectionOnFill",
      pairClass: "inactive",
      floor: contrastFloors.default.inactive,
      ratio: 1,
    });
  });

  it("is the only check that sees the erased label", () => {
    const base = getTheme("dark");
    const broken = extendTheme(base, {
      colors: {
        disabledForeground: compositeOver(
          base.colors.selectionOnFill,
          base.colors.softAction,
        ),
      },
    });
    const onSoftAction = themeContrastFailures(broken).filter(
      ({ foreground, background, wash }) =>
        foreground === "disabledForeground" &&
        background === "softAction" &&
        wash === "selectionOnFill",
    );

    expect(themeColorFailures(broken)).toEqual([]);
    expect(themeTypefaceFailures(broken)).toEqual([]);
    expect(themeTextTierFailures(broken)).toEqual([]);
    expect(themeDirectionFailures(broken)).toEqual([]);
    expect(themeMetricFailures(broken)).toEqual([]);
    expect(onSoftAction).toHaveLength(1);
    expect(onSoftAction[0]?.wash).toBe("selectionOnFill");
  });
});

/**
 * Guards the defect plan 650 fixes: the catalogue said a disabled field is out
 * of scope for the body pairs because the designed state reads
 * `disabledForeground`, "which `inactivePairs` measures", but the inactive
 * surface list omitted the field's `input` fill. `disabledControl(theme)` keeps
 * a field on its `input` fill and paints that label on it, so a copied theme
 * could erase a disabled field while `themeFailures` returned `[]`; the planted
 * theme below passes all ten checks on the pre-650 tree with its disabled label
 * at 2.494:1 on `input`.
 */
import { describe, expect, it } from "vitest";
import {
  compositeOver,
  contrastFloors,
  contrastRatio,
  extendTheme,
  getTheme,
  inactivePairs,
  inactiveSurfaces,
  selectionInactivePairs,
  selectionSurfaces,
  selectionWashPairs,
  shippedThemes,
  statusTones,
  themeContrastFailures,
  themeFailures,
  type ContrastPair,
  type Theme,
  type ThemeColors,
} from "./index.js";

/**
 * A theme that edits the field fill and every role painted on it coherently:
 * on the pre-650 tree it passes all ten checks, and its only defect is the
 * designed disabled field — `disabledForeground` on `input` at 2.494:1.
 */
const planted: Theme = extendTheme(getTheme("light"), {
  colors: {
    input: "#B0B0B0",
    inputForeground: "#0D0F13",
    placeholder: "#404040",
    mutedForeground: "#2A2A2A",
    disabledForeground: "#6A6A6A",
    borderStrong: "#4A4A4A",
    primary: "#1B45A8",
    primaryHover: "#163C95",
    primaryActive: "#12327D",
    destructive: "#A32017",
    destructiveHover: "#8B1B13",
    destructiveActive: "#75160F",
    infoText: "#0E356E",
    successText: "#0A3F2A",
    warningText: "#4A3000",
    destructiveText: "#5A1116",
    primaryText: "#241C5C",
  },
});

/**
 * The surfaces the pre-650 inactive list held: the `disabled` fill, the four
 * plain surfaces, the four row washes and the four soft status fills. It exists
 * only to show that the fixture was accepted before `input` joined the owner.
 */
const preFixSurfaces: ReadonlyArray<keyof ThemeColors> = [
  "disabled",
  "background",
  "card",
  "popover",
  "muted",
  "hover",
  "active",
  "accent",
  "selected",
  ...statusTones.map((tone) => `${tone}Soft` as const),
];

const atRest = (surface: keyof ThemeColors): number =>
  contrastRatio(planted.colors.disabledForeground, planted.colors[surface]);

const washed = (surface: keyof ThemeColors): number =>
  contrastRatio(
    planted.colors.disabledForeground,
    compositeOver(planted.colors.selection, planted.colors[surface]),
  );

const hasPair = (
  pairs: ReadonlyArray<ContrastPair>,
  foreground: keyof ThemeColors,
  background: keyof ThemeColors,
): boolean =>
  pairs.some(
    ([pairForeground, pairBackground]) =>
      pairForeground === foreground && pairBackground === background,
  );

describe("the disabled field's label on its input fill", () => {
  it("was accepted by every surface the pre-650 inactive list held", () => {
    preFixSurfaces.forEach((surface) => {
      expect(atRest(surface), surface).toBeGreaterThanOrEqual(
        contrastFloors.default.inactive,
      );
      expect(washed(surface), surface).toBeGreaterThanOrEqual(
        contrastFloors.default.inactive,
      );
    });
  });

  it("joins the inactive contract at rest and through the wash", () => {
    expect(inactiveSurfaces).toContain("input");
    expect(hasPair(inactivePairs, "disabledForeground", "input")).toBe(true);
    expect(hasPair(selectionInactivePairs, "disabledForeground", "input")).toBe(
      true,
    );
  });

  it("is reported on the fill it edits", () => {
    const failures = themeContrastFailures(planted).filter(
      (failure) => failure.pairClass === "inactive",
    );

    expect(failures).toHaveLength(2);
    failures.forEach((failure) => {
      expect(failure.foreground).toBe("disabledForeground");
      expect(failure.background).toBe("input");
      expect(failure.ratio).toBeLessThan(contrastFloors.default.inactive);
    });
    expect(
      failures.find((failure) => failure.wash === undefined)?.ratio,
    ).toBeCloseTo(2.494, 3);
    expect(
      failures.find((failure) => failure.wash === "selection")?.ratio,
    ).toBeLessThan(contrastFloors.default.inactive);
  });

  it("is the only defect the total check reports", () => {
    const failures = themeFailures(planted);
    const contrast = failures.filter((failure) => failure.kind === "contrast");

    expect(failures).toHaveLength(2);
    expect(contrast).toHaveLength(2);
    contrast.forEach((failure) => {
      expect(failure.background).toBe("input");
      expect(failure.pairClass).toBe("inactive");
    });
  });

  it("passes in every shipped set, at rest and through the wash", () => {
    shippedThemes.forEach(({ theme }) => {
      const floor = contrastFloors[theme.contrast].inactive;

      expect(
        contrastRatio(theme.colors.disabledForeground, theme.colors.input),
        theme.name,
      ).toBeGreaterThanOrEqual(floor);
      expect(
        contrastRatio(
          theme.colors.disabledForeground,
          compositeOver(theme.colors.selection, theme.colors.input),
        ),
        theme.name,
      ).toBeGreaterThanOrEqual(floor);
      expect(themeFailures(theme), theme.name).toEqual([]);
    });
  });

  it("keeps the washed pair on a measured wash", () => {
    expect(hasPair(selectionWashPairs, "selection", "input")).toBe(true);
    expect(selectionWashPairs).toHaveLength(selectionSurfaces.length + 1);
  });

  it("keeps the two inactive lists on one surface owner", () => {
    expect(inactivePairs).toHaveLength(inactiveSurfaces.length);
    expect(selectionInactivePairs).toHaveLength(inactiveSurfaces.length);
  });
});

/**
 * Bug guarded: both documents quoted **2.25:1** for a filled primary action at
 * 50% opacity, and `docs/tokens.md` claimed a disabled field "reads
 * `disabledForeground`". GPUI composites an element and its children as one
 * group (`opacity` in the GPUI style API), so the label is dimmed with the fill
 * it sits on: the primary label measures **1.575:1** on the identity light canvas
 * and **1.468:1** at worst (Linux light, a card), and a dimmed field's typed text
 * **3.273:1** on the macOS light `input` fill. The shipped component packages
 * still reach the state through `opacity: 0.5`, so the designed pair is what a
 * control should paint instead. This suite holds both directions: the designed
 * roles clear the inactive floor in every set, and the dim cannot be mistaken
 * for them — a filled brand label misses it in all 24 shipped sets.
 */
import { describe, expect, it } from "vitest";
import { alpha, type ThemeColors } from "./color.js";
import { compositeOver, contrastFloors, contrastRatio } from "./contrast.js";
import { disabledButtonStyle } from "./disabled-state.example.js";
import { disabledDimOpacity } from "./figures.js";
import { shippedThemes, type ShippedTheme } from "./shipped-themes.js";
import { disabledControl } from "./styles.js";
import { getTheme, type ThemeContrast } from "./theme.js";

/**
 * The ratio between a dimmed label and its own dimmed fill, the way GPUI paints
 * it: the fill composites onto the panel first, then the label onto the fill.
 */
const dimmedRatio = (label: string, fill: string, panel: string): number => {
  const paintedFill = compositeOver(alpha(fill, disabledDimOpacity), panel);
  const paintedLabel = compositeOver(
    alpha(label, disabledDimOpacity),
    paintedFill,
  );
  return contrastRatio(paintedLabel, paintedFill);
};

/** One control's dimmed label, on the panel the control paints on. */
const dimmedControl = (
  entry: ShippedTheme,
  fill: keyof ThemeColors,
  label: keyof ThemeColors,
  panel: keyof ThemeColors,
): number =>
  dimmedRatio(
    entry.theme.colors[label],
    entry.theme.colors[fill],
    entry.theme.colors[panel],
  );

const ofContrast = (contrast: ThemeContrast): ReadonlyArray<ShippedTheme> =>
  shippedThemes.filter((entry) => entry.theme.contrast === contrast);

/** The brand families whose dimmed label misses the floor in every shipped set. */
const brandFamilies = [
  ["primary", "primaryForeground"],
  ["destructive", "destructiveForeground"],
] as const;

describe("the disabled state a control paints", () => {
  it("paints the designed roles, not a fade", () => {
    (["light", "dark"] as const).forEach((mode) => {
      const theme = getTheme(mode);
      expect(disabledControl(theme), mode).toEqual({
        opacity: 1,
        backgroundColor: theme.colors.disabled,
        color: theme.colors.disabledForeground,
        borderColor: theme.colors.border,
      });
    });
  });

  it("holds the helper's label and edge to their floors in every shipped set", () => {
    shippedThemes.forEach(({ theme }) => {
      const style = disabledControl(theme);
      expect(
        contrastRatio(style.color, style.backgroundColor),
        `${theme.name}: disabledForeground on disabled`,
      ).toBeGreaterThanOrEqual(contrastFloors[theme.contrast].inactive);
      expect(
        contrastRatio(style.borderColor, style.backgroundColor),
        `${theme.name}: border on disabled`,
      ).toBeGreaterThanOrEqual(contrastFloors[theme.contrast].divider);
    });
  });

  it("builds a real disabled Button shape from the helper", () => {
    (["light", "dark"] as const).forEach((mode) => {
      const theme = getTheme(mode);
      const style = disabledButtonStyle(theme);
      expect(style).toEqual({
        ...disabledControl(theme),
        height: theme.density.controlHeight.md,
        paddingLeft: theme.density.controlPaddingX.md,
        paddingRight: theme.density.controlPaddingX.md,
        borderRadius: theme.radius.md,
      });
      expect(style.height).toBeGreaterThan(0);
    });
  });

  it("holds the designed pair to the inactive floor in every shipped set", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(
        contrastRatio(theme.colors.disabledForeground, theme.colors.disabled),
        `${theme.name}: disabledForeground on disabled`,
      ).toBeGreaterThanOrEqual(contrastFloors[theme.contrast].inactive);
    });
  });

  it("the dimmed brand label misses the inactive floor in all 24 shipped sets", () => {
    shippedThemes.forEach((entry) => {
      brandFamilies.forEach(([fill, label]) => {
        expect(
          dimmedControl(entry, fill, label, "card"),
          `${entry.theme.name}: ${label} dimmed on ${fill}`,
        ).toBeLessThan(contrastFloors[entry.theme.contrast].inactive);
      });
    });
  });

  it("the neutral label's dimmed readability depends on the set", () => {
    const ratios = shippedThemes.map((entry) =>
      dimmedControl(entry, "secondary", "secondaryForeground", "background"),
    );

    // The same control is 2.835:1 on one shipped canvas and 5.262:1 on another:
    // a dim takes its colour from behind the control, which is the defect.
    expect(Math.min(...ratios)).toBeLessThan(contrastFloors.default.inactive);
    expect(Math.max(...ratios)).toBeGreaterThan(contrastFloors.high.inactive);
  });

  it("a ghost's dim clears the default floor and misses AAA", () => {
    const defaultRatios = ofContrast("default").map((entry) =>
      dimmedControl(entry, "background", "foreground", "background"),
    );
    const highRatios = ofContrast("high").map((entry) =>
      dimmedControl(entry, "background", "foreground", "background"),
    );

    expect(Math.min(...defaultRatios)).toBeGreaterThanOrEqual(
      contrastFloors.default.inactive,
    );
    expect(Math.min(...highRatios)).toBeLessThan(contrastFloors.high.inactive);
  });

  it("the dimmed field's typed text misses the body floor in every shipped set", () => {
    shippedThemes.forEach(({ theme }) => {
      expect(
        dimmedRatio(
          theme.colors.inputForeground,
          theme.colors.input,
          theme.colors.input,
        ),
        `${theme.name}: inputForeground dimmed on the input fill`,
      ).toBeLessThan(contrastFloors[theme.contrast].body);
    });
  });
});

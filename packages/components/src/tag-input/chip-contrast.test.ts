import { describe, expect, it } from "vitest";
import {
  classesToStyle,
  TAG_INPUT_CHIP,
  TAG_INPUT_CHIP_TEXT,
} from "@gpuixui/tw";
import {
  applyStyle,
  contrastFloorsFor,
  contrastRatio,
  highContrastThemes,
  platformNames,
  platformStyles,
  themeModes,
  themes,
  type Theme,
} from "@gpuixui/tokens";

const palettes: ReadonlyArray<{
  readonly name: string;
  readonly theme: Theme;
}> = themeModes.flatMap((mode) =>
  [themes[mode], highContrastThemes[mode]].flatMap((base) =>
    platformNames.map((platform) => ({
      name: `${platform} ${mode}${base === themes[mode] ? "" : " high-contrast"}`,
      theme: applyStyle(base, platformStyles[platform]),
    })),
  ),
);

const paint = (
  recipe: string,
  theme: Theme,
): { readonly color?: string; readonly backgroundColor?: string } =>
  classesToStyle(recipe, theme).style;

describe("a tag chip's contrast", () => {
  it("prints the label on its own fill above the body floor in every style", () => {
    const under = palettes.flatMap(({ name, theme }) => {
      const chip = paint(TAG_INPUT_CHIP, theme);
      const label = paint(TAG_INPUT_CHIP_TEXT, theme);
      const ratio = contrastRatio(label.color, chip.backgroundColor);
      const floor = contrastFloorsFor(theme).body;
      return ratio !== undefined && ratio >= floor
        ? []
        : [`${name}: ${ratio?.toFixed(2) ?? "unmeasurable"} < ${floor}`];
    });

    expect(under).toEqual([]);
  });

  it("paints a fill a reader can see against the field it sits in", () => {
    const flats = palettes.flatMap(({ name, theme }) => {
      const chip = paint(TAG_INPUT_CHIP, theme);
      const ratio = contrastRatio(
        chip.backgroundColor,
        theme.colors.background,
      );
      return ratio !== undefined && ratio >= 1.1
        ? []
        : [`${name}: ${ratio?.toFixed(2) ?? "unmeasurable"} < 1.1`];
    });

    expect(flats).toEqual([]);
  });

  it("keeps the removal glyph above the floor it is measured at", () => {
    const faint = palettes.flatMap(({ name, theme }) => {
      const chip = paint(TAG_INPUT_CHIP, theme);
      const ratio = contrastRatio(
        theme.colors.mutedForeground,
        chip.backgroundColor,
      );
      const floor = contrastFloorsFor(theme).secondary;
      return ratio !== undefined && ratio >= floor
        ? []
        : [`${name}: ${ratio?.toFixed(2) ?? "unmeasurable"} < ${floor}`];
    });

    expect(faint).toEqual([]);
  });
});

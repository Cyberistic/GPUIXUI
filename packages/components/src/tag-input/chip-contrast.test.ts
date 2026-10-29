/**
 * The chip's label on the chip's own fill, in every style the library ships.
 *
 * Guarded bug: a chip was `bg-muted` with `text-muted-foreground`. The token
 * pair it painted is measured at the **secondary** floor (4.5), but the label is
 * the token a reader typed — body copy — and a chip is a surface of its own
 * rather than the field behind it. Measured over the four platform styles in
 * light mode the label reached 6.40:1 (macOS), 6.49:1 (Windows), 6.50:1 (Linux)
 * and 6.83:1 (Default): every one under the 7:1 body floor. The fill was also a
 * shade of the field — `muted` against `background` measured 1.06:1 in the
 * Default light style and 1.06:1 in the Default dark one, so a chip read as
 * text inside the field rather than as a token.
 *
 * The fix moves the label to `foreground` and the fill to `secondary`, both of
 * them roles the contrast table already holds, and this case compiles the
 * recipe the way the runtime does and re-measures it in every shipped theme.
 */

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

/** Every shipped palette: both modes, both contrast variants, every style. */
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
    // The bug: `muted-foreground` on `muted`, 6.40–6.83:1 in the light styles.
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
    // The other half of the complaint: a chip whose fill is the field's own
    // shade is text with padding. `secondary` is the segmented-panel role, so
    // it is a step off `background` rather than a tint of it.
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
    // The glyph is quieter than the label on purpose; `mutedForeground` on a
    // chip's fill is the pair the contrast table holds to the secondary floor.
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

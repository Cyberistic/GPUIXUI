/**
 * The swatches a palette switch must repaint, with the token colour each one
 * is expected to paint.
 *
 * Derived from `palettes`, never copied: a token change moves the expectation
 * with it, and the live scenario keeps comparing the frame against the theme
 * it just applied rather than against a frozen literal. The pure tests guard
 * the premise the live checks cannot: the three palettes must actually differ,
 * or "the switch repainted this swatch" would pass without a visible change.
 */
import { palettes, type PaletteId } from "../palettes.js";

/** One solid swatch and the colour its palette assigns it. */
export interface PalettePixel {
  readonly testId: string;
  readonly colour: string;
}

/** The sampled swatches for `palette`, in gallery order. */
export const palettePixels = (
  palette: PaletteId,
): readonly [PalettePixel, PalettePixel] => [
  {
    testId: "swatch-background",
    colour: palettes[palette].colors.background,
  },
  { testId: "swatch-primary", colour: palettes[palette].colors.primary },
];

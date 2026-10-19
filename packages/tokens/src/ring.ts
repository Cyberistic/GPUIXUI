import type { ThemeColors } from "./color.js";
import {
  contrastFloors,
  contrastRatio,
  type ContrastPairClass,
} from "./contrast.js";
import type { Theme, ThemeContrast } from "./theme.js";

/**
 * The two tones and the thickness of a ring that stays visible on content the
 * theme does not own — a colour swatch, a user-supplied preview, a custom theme
 * tile.
 */
export interface ContrastRing {
  /** The tone next to the content: the theme's `background`. */
  readonly inner: string;
  /** The tone outside it: the theme's `foreground`. */
  readonly outer: string;
  /** Thickness of each tone: `borderWidth.strong`. */
  readonly width: number;
}

/**
 * A two-tone ring whose worst case over an arbitrary content colour misses the
 * mark floor.
 */
export interface RingFailure {
  /** The tone next to the content. */
  readonly inner: keyof ThemeColors;
  /** The tone outside it. */
  readonly outer: keyof ThemeColors;
  /** The floor the worst case missed. */
  readonly pairClass: ContrastPairClass;
  /** The floor value at the theme's declared contrast level. */
  readonly floor: number;
  /** The worst-case ratio, `sqrt(contrast(outer, inner))`. */
  readonly ratio: number;
}

/**
 * The designed ring for content whose colour the theme cannot know.
 *
 * One role cannot ring every colour: a ring painted with `foreground` measures
 * **1.000:1** on a `foreground` swatch. Two tones fix that. The inner tone is
 * `background`, adjacent to the content; the outer is `foreground`, adjacent to
 * the surface. For a content colour `C`, the contrast against each tone is
 * `(max(C, tone) + 0.05) / (min(C, tone) + 0.05)`, so the two ratios multiply
 * to the tone pair's own ratio for every `C` between them. Their maximum is
 * smallest where they are equal, which makes the worst case over **every**
 * colour the square root of the tone pair's contrast. The shipped identity light
 * pair (15.86:1) guarantees **3.98:1**, the AAA pairs (21:1) **4.58:1**, and the
 * tightest shipped set (`Dark · Linux`) **3.70:1**, all above the mark floor
 * (`contrastFloors[level].mark`). {@link themeRingFailures} reports a theme that
 * falls below it.
 *
 * The outer tone's surface side is already measured: `foreground` is held at the
 * body floor on `background`, `card`, `popover`, `muted`, the row washes and the
 * soft status fills (`bodyTextPairs`, `rowTextPairs`, `softBodyPairs`).
 *
 * Paint the two tones as a border and a spread shadow on one element:
 * `borderColor: inner`, `borderWidth: width`, and a zero-offset, zero-blur
 * `boxShadow` in `outer` spread by `width`. That uses the runtime's single
 * shadow slot, so the ringed element cannot also carry an elevation shadow; a
 * wrapper painting `outer` with `padding: width` around an inner border is the
 * alternative. The executed composition is `src/contrast-ring.example.ts`.
 *
 * This is not the focus indicator: a control's keyboard ring is
 * `focusRing(theme)`, and a ring inside a filled control is
 * `insetFocusRing(theme, family)`.
 *
 * @example
 * ```ts
 * import { contrastRing, getTheme } from "@gpuixui/tokens";
 *
 * const ring = contrastRing(getTheme("light"));
 * ring.inner; // background
 * ring.outer; // foreground
 * ring.width; // borderWidth.strong
 * ```
 */
export function contrastRing(theme: Theme): ContrastRing {
  return {
    inner: theme.colors.background,
    outer: theme.colors.foreground,
    width: theme.borderWidth.strong,
  };
}

/**
 * Every shipped set's two-tone ring that misses its mark floor in a theme.
 *
 * The measured ratio is the guarantee's worst case, not a painted pair:
 * `sqrt(contrastRatio(foreground, background))`. The mark floor is 3:1 at the
 * default level and 4.5:1 at AAA, the non-text floor an indicator needs. A theme
 * can clear every documented pair with a 7:1 ink/canvas pair whose ring worst
 * case is only `sqrt(7) = 2.65:1`, so the contrast check alone cannot see a
 * collapsed ring. This is the tenth check composed by `themeFailures`.
 *
 * @example
 * ```ts
 * import { getTheme, themeRingFailures } from "@gpuixui/tokens";
 *
 * themeRingFailures(getTheme("dark")); // []
 * ```
 */
export function themeRingFailures(
  theme: Theme,
  contrast: ThemeContrast = theme.contrast,
): ReadonlyArray<RingFailure> {
  const { colors } = theme;
  const floor = contrastFloors[contrast].mark;
  const ratio = Math.sqrt(contrastRatio(colors.foreground, colors.background));
  return ratio >= floor
    ? []
    : [
        {
          inner: "background",
          outer: "foreground",
          pairClass: "mark",
          floor,
          ratio,
        },
      ];
}

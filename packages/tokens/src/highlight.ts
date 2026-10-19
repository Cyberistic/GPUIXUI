import { alpha, type ThemeColors } from "./color.js";
import {
  compositeOver,
  contrastFloors,
  contrastRatio,
  type ContrastPair,
} from "./contrast.js";
import { nativeSyntaxRoles } from "./native-text.js";
import type { Theme, ThemeContrast } from "./theme.js";

/**
 * The alpha step the active find match adds to the selection wash, `0…1`.
 *
 * It is an absolute step, not a multiplier, because an edited theme may carry a
 * `selection` at any alpha. The shipped sets sit between 14% and 33%, so the
 * active wash is 24–43%; the step keeps it a perceivable step above the match
 * (1.28:1 at the weakest, against the match's 1.17:1) while every highlighted
 * text role keeps the secondary floor.
 */
export const nativeHighlightStep = 0.1;

/**
 * The `highlight` prop for a native find bar — `color` for every match and
 * `activeColor` for the match under the cursor, in the shape the runtime reads.
 */
export interface NativeHighlight {
  /** The wash behind every match: the theme's `selection` role. */
  readonly color: string;
  /**
   * The wash behind the active match: the same RGB as `color`, one
   * {@link nativeHighlightStep} stronger.
   */
  readonly activeColor: string;
}

/** A find-highlight wash whose text misses its floor. */
export interface HighlightFailure {
  /** Which of the two washes was painted. */
  readonly wash: "match" | "active";
  /** The surface the document paints on. */
  readonly surface: keyof ThemeColors;
  /** The text role the wash sat behind. */
  readonly foreground: keyof ThemeColors;
  /** The floor the pair missed, at the theme's declared contrast level. */
  readonly floor: number;
  /** The measured ratio; `NaN` when a role is not a colour the maths parses. */
  readonly ratio: number;
}

const alphaByte = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})$/;

/** The alpha a translucent role carries; `1` for an opaque or unparseable one. */
const ownAlpha = (color: string): number => {
  const match = alphaByte.exec(color);
  const byte = match?.[1];
  return byte === undefined ? 1 : Number.parseInt(byte, 16) / 255;
};

/** The surfaces a native document can paint on: `card`, plus the three `Surface`
 * tones a canvas document may override `bg` with. */
const nativeHighlightSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
] as const;

/**
 * The text roles a find can match in a native document — the body and secondary
 * tiers plus every syntax capture — on each surface `bg` may name.
 *
 * The pair class is `secondary`, not `body`: a visible highlight washes code and
 * prose, and no perceivable wash can keep a syntax token at body strength. The
 * neutral `hover` wash, the only other visible candidate, is 1.06:1 at its
 * weakest and still leaves syntax at 6.30:1; the selection wash keeps every
 * shipped role at 5.34:1 (match) and 4.61:1 (active). Body text itself stays
 * above the body floor (9.65:1 match, 8.03:1 active).
 */
export const nativeHighlightPairs: readonly ContrastPair[] = [
  ...new Set([
    "foreground",
    "mutedForeground",
    ...Object.values(nativeSyntaxRoles),
  ] as const),
].flatMap((role) =>
  nativeHighlightSurfaces.map(
    (background): ContrastPair => [role, background, "secondary"],
  ),
);

const painted = (paint: string, surface: keyof ThemeColors, theme: Theme) =>
  compositeOver(paint, theme.colors[surface]);

/**
 * The find-highlight paints for a native text document.
 *
 * The pinned runtime seeds `highlight`'s colours from the text theme's `accent`
 * — 30% for a match and 65% for the active match — and applies an explicit
 * colour verbatim. `nativeTextTheme` maps `accent` to `primaryText`, the
 * accent's readable **ink**, so the default paints that ink as a wash behind the
 * document's own text: body text measures **2.81:1** through the active wash in
 * identity dark and **6.80:1** through the match wash, under the 7:1 body floor.
 *
 * This returns the `selection` role — the accent-tinted wash the package designs
 * and measures for text — and the same RGB one {@link nativeHighlightStep}
 * stronger for the active match. Every text role a find can reach is held at the
 * secondary floor on the four `Surface` tones a document paints on, because no
 * perceivable wash can keep a syntax token at body strength; see
 * `docs/tokens.md`.
 *
 * @example
 * ```tsx
 * import { getTheme, nativeHighlight, nativeTextTheme } from "@gpuixui/tokens";
 *
 * const theme = getTheme("dark");
 *
 * <markdown
 *   source={text}
 *   theme={nativeTextTheme(theme)}
 *   highlight={{ ...nativeHighlight(theme), query }}
 * />;
 * ```
 */
export function nativeHighlight(theme: Theme): NativeHighlight {
  const color = theme.colors.selection;
  return {
    color,
    activeColor: alpha(
      color,
      Math.min(1, ownAlpha(color) + nativeHighlightStep),
    ),
  };
}

/**
 * Every find-highlight pair that misses its floor in a theme.
 *
 * The match wash is the `selection` role at its own alpha; the active wash is
 * one {@link nativeHighlightStep} stronger. Both are composited over every
 * surface a document may name and measured against the `secondary` floor —
 * a highlight is transient chrome over code, and keeping every syntax token at
 * body strength would need a wash that paints nothing. The wash's own
 * visibility is the contrast check's `selection` pair: a selection that
 * vanishes into its surface is reported there.
 */
export function themeHighlightFailures(
  theme: Theme,
  contrast: ThemeContrast = theme.contrast,
): ReadonlyArray<HighlightFailure> {
  const floor = contrastFloors[contrast].secondary;
  const highlight = nativeHighlight(theme);
  const washes = [
    ["match", highlight.color],
    ["active", highlight.activeColor],
  ] as const;
  return washes.flatMap(([wash, paint]) =>
    nativeHighlightPairs.flatMap(([foreground, surface]) => {
      const ratio = contrastRatio(
        theme.colors[foreground],
        painted(paint, surface, theme),
      );
      return ratio >= floor
        ? []
        : [{ wash, surface, foreground, floor, ratio }];
    }),
  );
}

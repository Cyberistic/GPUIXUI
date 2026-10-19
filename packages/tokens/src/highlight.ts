import { alpha, type ThemeColors } from "./color.js";
import {
  compositeOver,
  contrastFloors,
  contrastRatio,
  type ContrastPair,
} from "./contrast.js";
import { nativeInk } from "./native-ink.js";
import { nativeSyntaxRoles, nativeTextSurfaces } from "./native-text.js";
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
  /**
   * The wash's corner radius: the theme's inline-mark step, `radius.sm` — the
   * same step inline code uses. The runtime defaults to 2px, a literal no
   * radius scale owns, so a copied platform style could not square or round a
   * find match; `radius.sm` is 0 in a square theme and 2 in the Windows style.
   */
  readonly radius: number;
}

/** A find-highlight pair that misses its floor. */
export type HighlightFailure =
  | {
      /** Highlighted text misses the `secondary` floor through the wash. */
      readonly pairClass: "secondary";
      /** Which of the two washes was painted. */
      readonly wash: "match" | "active";
      /** The document tone the match sits on; its code block paints an ink wash. */
      readonly surface: keyof ThemeColors;
      /** The text role the wash sat behind. */
      readonly foreground: keyof ThemeColors;
      /** The floor the pair missed, at the theme's declared contrast level. */
      readonly floor: number;
      /** The measured ratio; `NaN` when a role is not a colour the maths parses. */
      readonly ratio: number;
    }
  | {
      /** The active match is not a perceivable step above the match. */
      readonly pairClass: "step";
      /** The document tone the two washes were composited over. */
      readonly surface: keyof ThemeColors;
      /** The `step` floor for the theme's declared contrast level. */
      readonly floor: number;
      /** The measured ratio between the two painted washes. */
      readonly ratio: number;
    };

const alphaByte = /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})$/;

/** The alpha a translucent role carries; `1` for an opaque or unparseable one. */
const ownAlpha = (color: string): number => {
  const match = alphaByte.exec(color);
  const byte = match?.[1];
  return byte === undefined ? 1 : Number.parseInt(byte, 16) / 255;
};

/**
 * The text roles a find can match in a native document — the body and secondary
 * tiers plus every syntax capture — on each surface `bg` may name.
 *
 * The pair class is `secondary`, not `body`: a visible highlight washes code and
 * prose, and no perceivable wash can keep a syntax token at body strength. The
 * neutral `hover` wash, the only other visible candidate, is 1.06:1 at its
 * weakest and still leaves syntax at 6.30:1; on the plain tone the selection
 * wash keeps every shipped role at 5.59:1 (match) and 4.80:1 (active), and on
 * the code block's painted ink surface at 5.21:1 and 4.51:1. Body text itself
 * stays above the body floor (9.65:1 match, 8.03:1 active; 8.93:1 and 7.31:1
 * painted).
 */
export const nativeHighlightPairs: readonly ContrastPair[] = [
  ...new Set([
    "foreground",
    "mutedForeground",
    ...Object.values(nativeSyntaxRoles),
  ] as const),
].flatMap((role) =>
  nativeTextSurfaces.map(
    (background): ContrastPair => [role, background, "secondary"],
  ),
);

const painted = (paint: string, surface: keyof ThemeColors, theme: Theme) =>
  compositeOver(paint, nativeInk(theme, surface));

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
 * secondary floor on the four `Surface` tones a document paints on, and again
 * on the code block's painted ink surface, because no perceivable wash can keep
 * a syntax token at body strength; see `docs/tokens.md`.
 *
 * The wash's corner is `theme.radius.sm`, the inline-mark step inline code
 * uses: the runtime's 2px default is a literal no theme owns, so a square
 * copied style paints a square match and the Windows style keeps its 2px
 * corner.
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
    radius: theme.radius.sm,
  };
}

/**
 * Every find-highlight pair that misses its floor in a theme.
 *
 * The match wash is the `selection` role at its own alpha; the active wash is
 * one {@link nativeHighlightStep} stronger. Both are composited over the
 * surface the runtime actually paints — the document tone, and the code block's
 * 3.5% ink wash over that tone — and measured against the `secondary` floor.
 * A highlight is transient chrome over code, and keeping every syntax token at
 * body strength would need a wash that paints nothing. The wash's own
 * visibility is the contrast check's `selection` pair: a selection that
 * vanishes into its surface is reported there.
 *
 * The same walk reports the **step** between the two washes: an active match
 * that is not one `contrastFloors[level].step` above the match is reported on
 * the surface where the pair collapses. The step is an absolute alpha, so a
 * near-opaque `selection` paints both washes the same colour even though every
 * text pair still passes; the floor is the one the filled families and the
 * selected row publish. The code-block ink darkens or lightens both washes
 * together, so the step is measured on that painted surface too.
 */
export function themeHighlightFailures(
  theme: Theme,
  contrast: ThemeContrast = theme.contrast,
): ReadonlyArray<HighlightFailure> {
  const floors = contrastFloors[contrast];
  const highlight = nativeHighlight(theme);
  const washes = [
    ["match", highlight.color],
    ["active", highlight.activeColor],
  ] as const;
  const textFailures = washes.flatMap(([wash, paint]) =>
    nativeHighlightPairs.flatMap(([foreground, surface]) => {
      const ratio = contrastRatio(
        theme.colors[foreground],
        painted(paint, surface, theme),
      );
      return ratio >= floors.secondary
        ? []
        : [
            {
              pairClass: "secondary" as const,
              wash,
              surface,
              foreground,
              floor: floors.secondary,
              ratio,
            },
          ];
    }),
  );
  const stepFailures = nativeTextSurfaces.flatMap((surface) => {
    const ratio = contrastRatio(
      painted(highlight.activeColor, surface, theme),
      painted(highlight.color, surface, theme),
    );
    return ratio >= floors.step
      ? []
      : [
          {
            pairClass: "step" as const,
            surface,
            floor: floors.step,
            ratio,
          },
        ];
  });
  return [...textFailures, ...stepFailures];
}

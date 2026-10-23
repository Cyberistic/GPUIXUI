/**
 * The find-highlight wash, measured where a host paints it.
 *
 * A GPUix text host marks what a search found with a **wash behind the text**
 * (`highlight` on any host, `@gpuix/native@0.11.0`), and the glyphs keep the
 * colour they already had. A host given no colour paints one itself — the
 * runtime theme's `accent` at a **30%** share for every match and **65%** for
 * the active one, with a **2px** corner (`packages/native/src/text/search.rs` at
 * the pinned release). A library application passes no window theme, so that
 * accent is the runtime's built-in violet: the one text surface in the library
 * still painted from a palette this package does not own, and the share is not a
 * design decision a theme can read.
 *
 * Those default shares are also too strong for the text they mark at this
 * library's floors. Measured over the 18 shipped, high-contrast, platform
 * and authored styles, the 65% active wash left `foreground` at **2.72:1** on
 * Dark · Omarchy's `muted` strip and under the 7:1 body floor in **all 18**
 * styles, and the resting 30% wash was under it in 5 dark ones — the worst
 * being Dark · Linux at **6.14:1** on its popover. A reader who typed a query
 * and pressed Enter could be shown a result under the reading floor.
 *
 * {@link findHighlight} answers the pair the theme can carry: the runtime's own
 * two strengths, stepped down to the **largest** share that keeps the matched
 * text readable, and the tightest radius step. The resting match keeps the
 * theme's own body floor, because it is the text the reader asked for. The active
 * match is the only difference a host can paint between one match and the next,
 * so it takes the strongest wash that still clears the body floor, and the
 * strongest that clears the **secondary** floor when the accent has no stronger
 * body-safe share — a dark palette whose text is already near the floor. The
 * pair must still be told apart, which is the one job a wash in this system
 * cannot always do at AAA; {@link highlightFailures} reports it.
 *
 * Both washes are translucent (`alpha`), so the strip shows through the way the
 * runtime's own do; the colour a reader sees is the composite
 * {@link highlightFailures} measures.
 */

import {
  alpha,
  alphaOf,
  blend,
  themeColors,
  type ColourSource,
  type ThemeColors,
} from "./color.js";
import {
  contrastFloorsFor,
  contrastRatio,
  type ContrastFloors,
} from "./contrast.js";
import { decorativeFloor } from "./decorative.js";
import type { Theme, ThemeContrast } from "./theme.js";

/**
 * The shares a host paints when nobody names a colour: every match, and the
 * active one (`packages/native/src/text/search.rs` at `@gpuix/native@0.11.0`).
 * They are the fallback {@link findHighlight} starts from, not a contract — the
 * wash a theme hands over is derived, because no shipped style can carry the
 * active share at its own body floor.
 */
export const highlightShares = { match: 0.3, active: 0.65 } as const;

/**
 * The strips a find highlight is painted on. A search runs over content — a
 * rendered document or a virtualized list of results — and the library places
 * content on the page, a card, a floating surface and a `muted` toolbar, the
 * same content tones the selection wash is measured on.
 */
export const highlightSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
] as const;

/** One fill a find highlight can be painted over. */
export type HighlightSurface = (typeof highlightSurfaces)[number];

/**
 * What a `highlight` prop takes from the theme: the two wash colours and the
 * corner. Spread it into the spec so the host paints this package's colours
 * rather than the runtime's built-in accent.
 *
 * @example
 * ```tsx
 * import { findHighlight } from "@gpuixui/tokens";
 *
 * <text highlight={{ query, ...findHighlight(theme) }}>…</text>
 * ```
 */
export interface FindHighlight {
  /** Every match's wash, translucent, from the theme's `primary`. */
  readonly color: string;
  /** The active match's wash: the same hue, the strongest share the text holds. */
  readonly activeColor: string;
  /** The wash's corner: the tightest step the theme's radius scale carries. */
  readonly radius: number;
}

/**
 * The granularity of a derived share: 1% of the theme's `primary` per step, so a
 * wash stays as strong as the surface allows without inventing a value between
 * the steps the runtime and this package both read.
 */
const SHARES = 100;

const steps: ReadonlyArray<number> = Array.from(
  { length: SHARES + 1 },
  (_, index) => index / SHARES,
);

/**
 * The colour a reader sees where a wash meets a strip: the wash over that strip,
 * or `undefined` when the theme carries neither role. The wash is the painted
 * colour — `alpha` rounded to its byte — so the contract measures exactly what
 * the host draws rather than the share it was asked for.
 */
const composite = (
  colors: Partial<ThemeColors>,
  fill: HighlightSurface,
  share: number,
): string | undefined => {
  const surface = colors[fill];
  const accent = colors.primary;
  if (surface === undefined || accent === undefined) {
    return undefined;
  }
  const wash = alpha(accent, share);
  return blend(surface, wash, alphaOf(wash));
};

/**
 * Whether a share can carry every strip: visible against it, and the body ink
 * readable inside it at `floor`.
 */
const carries = (
  colors: Partial<ThemeColors>,
  share: number,
  floor: number,
): boolean =>
  highlightSurfaces.every((fill) => {
    const painted = composite(colors, fill, share);
    if (painted === undefined) {
      return false;
    }
    const visible = contrastRatio(painted, colors[fill]);
    const legible = contrastRatio(colors.foreground, painted);
    return (
      visible !== undefined &&
      visible >= decorativeFloor &&
      legible !== undefined &&
      legible >= floor
    );
  });

/** The strongest share that carries every strip at `floor`. */
const strongest = (
  colors: Partial<ThemeColors>,
  floor: number,
): number | undefined =>
  steps.filter((share) => carries(colors, share, floor)).at(-1);

/**
 * The two shares a theme can carry, from the runtime's own pair.
 *
 * The resting match is the runtime's 30% unless the body floor makes it step
 * down. The active match prefers the strongest wash that still keeps body text
 * at the theme's own floor, and falls back to the strongest the secondary floor
 * allows only when the accent cannot offer anything stronger than the resting
 * one — a dark palette whose text is already near the floor.
 */
const sharesFor = (
  colors: Partial<ThemeColors>,
  floors: ContrastFloors,
): { readonly match: number; readonly active: number } => {
  const bodyCeiling = strongest(colors, floors.body);
  const match = Math.min(
    highlightShares.match,
    bodyCeiling ?? highlightShares.match,
  );
  const active =
    bodyCeiling !== undefined && bodyCeiling > match
      ? bodyCeiling
      : (strongest(colors, floors.secondary) ?? highlightShares.active);
  return { match, active: Math.max(active, match) };
};

/**
 * The highlight a theme paints: the runtime's two strengths, held to the theme's
 * own floors, and the tightest corner the radius scale carries.
 *
 * The pair is derived from the theme's `primary`, so a brand's accent family
 * reaches a find bar the way it reaches every other mark. A theme is not
 * required to hold: {@link highlightFailures} reports a pair whose text, or whose
 * two strengths, the surfaces cannot carry, and the docs page says which floor
 * each one answers to.
 *
 * @example
 * ```tsx
 * import { findHighlight, useTheme } from "@gpuixui/tokens";
 *
 * const theme = useTheme();
 * <text highlight={{ query, ...findHighlight(theme) }}>{line}</text>
 * ```
 */
export function findHighlight(
  theme: Theme,
  floors: ContrastFloors = contrastFloorsFor(theme),
): FindHighlight {
  const { match, active } = sharesFor(theme.colors, floors);
  return {
    color: alpha(theme.colors.primary, match),
    activeColor: alpha(theme.colors.primary, active),
    // A wash hugs the glyphs it marks, so it takes the tightest corner the
    // scale carries rather than the runtime's own 2px, which is no step.
    radius: theme.radius.sm,
  };
}

/**
 * Which of a find wash's jobs it missed: being seen on the strip, keeping the
 * marked text readable, or telling the active match apart from the others.
 */
export interface HighlightFailure {
  /** `visibility`, `legibility`, or `distinct` — the active match is not stronger. */
  readonly kind: "visibility" | "legibility" | "distinct";
  /** Which wash: every match, or the active one. */
  readonly state: "match" | "active";
  /** The strip the wash is composited over. */
  readonly surface: HighlightSurface;
  /**
   * The colour a reader sees, or `undefined` when it could not be composited —
   * the theme carries no `primary`, or no such strip. For `distinct` it is the
   * active match's composite, the one that has to stand apart.
   */
  readonly wash: string | undefined;
  /** The measured ratio, or `undefined` when there was nothing to measure. */
  readonly ratio: number | undefined;
  /** The floor it had to reach. */
  readonly floor: number;
}

/**
 * Every find wash in a theme that misses one of its jobs.
 *
 * The resting match is held to the theme's body floor and the active match to
 * the secondary floor — the one exception this package makes for a text wash,
 * because a stronger wash is the only difference a host can paint between the
 * match a reader is on and the ones around it, and the pair must still be told
 * apart (the `distinct` line, at the 1.05:1 perceptibility floor). Everything a
 * theme derives passes by construction; the report exists for a brand whose
 * accent is too close to its surfaces or its ink to carry either strength.
 *
 * A theme restored from storage is read as the absence it is rather than
 * throwing: a missing role is composited to `undefined` and reported, and a
 * missing strip is reported the same way. `invalidColorRoles` names the role.
 *
 * @example
 * ```ts
 * import { highlightFailures } from "@gpuixui/tokens";
 *
 * highlightFailures(brandTheme); // [] when the accent can carry a find bar
 * ```
 */
export function highlightFailures(
  theme: ColourSource & { readonly contrast?: ThemeContrast },
  floors: ContrastFloors = contrastFloorsFor(theme),
): readonly HighlightFailure[] {
  const colors = themeColors(theme);
  const { match, active } = sharesFor(colors, floors);
  const states = [
    { state: "match", share: match, floor: floors.body },
    { state: "active", share: active, floor: floors.secondary },
  ] as const;
  const measured = highlightSurfaces.flatMap((surface) =>
    states.flatMap(({ state, share, floor }) => {
      const wash = composite(colors, surface, share);
      const failures: HighlightFailure[] = [];
      const visible = contrastRatio(wash, colors[surface]);
      if (visible === undefined || visible < decorativeFloor) {
        failures.push({
          kind: "visibility",
          state,
          surface,
          wash,
          ratio: visible,
          floor: decorativeFloor,
        });
      }
      const legible = contrastRatio(colors.foreground, wash);
      if (legible === undefined || legible < floor) {
        failures.push({
          kind: "legibility",
          state,
          surface,
          wash,
          ratio: legible,
          floor,
        });
      }
      return failures;
    }),
  );
  const apart = highlightSurfaces.flatMap((surface) => {
    const wash = composite(colors, surface, active);
    const rest = composite(colors, surface, match);
    const ratio = contrastRatio(wash, rest);
    return ratio !== undefined && ratio >= decorativeFloor
      ? []
      : [
          {
            kind: "distinct" as const,
            state: "active" as const,
            surface,
            wash,
            ratio,
            floor: decorativeFloor,
          },
        ];
  });
  return [...measured, ...apart];
}

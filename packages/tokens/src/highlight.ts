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
import type { Radius } from "./scale.js";
import type { Theme } from "./theme.js";

export const highlightShares = { match: 0.3, active: 0.65 } as const;

export const highlightSurfaces = [
  "background",
  "card",
  "popover",
  "muted",
] as const;

export type HighlightSurface = (typeof highlightSurfaces)[number];

export interface FindHighlight {
  readonly color: string;

  readonly activeColor: string;

  readonly radius: number;
}

const SHARES = 100;

const steps: ReadonlyArray<number> = Array.from(
  { length: SHARES + 1 },
  (_, index) => index / SHARES,
);

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

const strongest = (
  colors: Partial<ThemeColors>,
  floor: number,
): number | undefined =>
  steps.filter((share) => carries(colors, share, floor)).at(-1);

const standsApart = (
  colors: Partial<ThemeColors>,
  share: number,
  rest: number,
): boolean =>
  highlightSurfaces.every((fill) => {
    const wash = composite(colors, fill, share);
    const other = composite(colors, fill, rest);
    if (wash === undefined || other === undefined) {
      return false;
    }
    const ratio = contrastRatio(wash, other);
    return ratio !== undefined && ratio >= decorativeFloor;
  });

const sharesFor = (
  colors: Partial<ThemeColors>,
  floors: ContrastFloors,
): { readonly match: number; readonly active: number } => {
  const bodyCeiling = strongest(colors, floors.body);
  const match = Math.min(
    highlightShares.match,
    bodyCeiling ?? highlightShares.match,
  );
  const secondaryCeiling = strongest(colors, floors.secondary);
  const active =
    bodyCeiling !== undefined && standsApart(colors, bodyCeiling, match)
      ? bodyCeiling
      : secondaryCeiling !== undefined &&
          standsApart(colors, secondaryCeiling, match)
        ? secondaryCeiling
        : (bodyCeiling ?? secondaryCeiling ?? highlightShares.active);
  return { match, active: Math.max(active, match) };
};

export interface FindHighlightSource extends ColourSource {
  readonly contrast?: unknown;

  readonly radius?: Partial<Radius> | null;
}

export function findHighlight(
  theme: Theme,
  floors?: ContrastFloors,
): FindHighlight;
export function findHighlight(
  source: FindHighlightSource,
  floors?: ContrastFloors,
): FindHighlight | undefined;
export function findHighlight(
  source: FindHighlightSource,
  floors: ContrastFloors = contrastFloorsFor(source),
): FindHighlight | undefined {
  const colors = themeColors(source);
  const primary = colors.primary;

  const radius = source.radius?.sm;
  if (
    primary === undefined ||
    colors.foreground === undefined ||
    radius === undefined ||
    highlightSurfaces.some((fill) => colors[fill] === undefined)
  ) {
    return undefined;
  }
  const { match, active } = sharesFor(colors, floors);
  return {
    color: alpha(primary, match),
    activeColor: alpha(primary, active),
    radius,
  };
}

export interface HighlightFailure {
  readonly kind: "visibility" | "legibility" | "distinct";

  readonly state: "match" | "active";

  readonly surface: HighlightSurface;

  readonly wash: string | undefined;

  readonly ratio: number | undefined;

  readonly floor: number;
}

export function highlightFailures(
  theme: ColourSource & { readonly contrast?: unknown },
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

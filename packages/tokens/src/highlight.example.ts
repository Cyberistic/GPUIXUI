import {
  alphaOf,
  blend,
  contrastRatio,
  extendTheme,
  findHighlight,
  highlightFailures,
  lightTheme,
  type HighlightFailure,
  type HighlightSurface,
  type Theme,
} from "./index.js";

export const searchHighlight = (theme: Theme) => {
  const { color, activeColor, radius } = findHighlight(theme);
  return { color, activeColor, radius };
};

export const matchSeparation = (
  theme: Theme,
  surface: HighlightSurface,
): number | undefined => {
  const wash = findHighlight(theme).color;
  return contrastRatio(
    blend(theme.colors[surface], wash, alphaOf(wash)),
    theme.colors[surface],
  );
};

export const activeSeparation = (
  theme: Theme,
  surface: HighlightSurface,
): number | undefined => {
  const wash = findHighlight(theme).activeColor;
  return contrastRatio(
    blend(theme.colors[surface], wash, alphaOf(wash)),
    theme.colors[surface],
  );
};

export const invisibleHighlightBrand = extendTheme(lightTheme, {
  colors: { primary: lightTheme.colors.background },
});

export const lowHeadroomBrand = extendTheme(lightTheme, {
  colors: { foreground: "#555555" },
});

export const reportHighlights = (theme: Theme): ReadonlyArray<string> =>
  highlightFailures(theme).map(
    ({ kind, state, surface, ratio, floor }: HighlightFailure) =>
      `${state} ${kind} on ${surface}: ${
        ratio === undefined ? "unmeasurable" : ratio.toFixed(2)
      } (needs ${floor})`,
  );

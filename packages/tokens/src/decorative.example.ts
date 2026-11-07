import { decorativeFailures, type Theme } from "./index.js";
import { extendTheme, lightTheme } from "./theme.js";

export const decorativeSurfacesAreVisible = (theme: Theme): boolean =>
  decorativeFailures(theme).length === 0;

export const edgeLessBrand = extendTheme(lightTheme, {
  colors: { border: lightTheme.colors.card },
});

export const flatActionBrand = extendTheme(lightTheme, {
  colors: { secondary: lightTheme.colors.muted },
});

export const flatShadowBrand = extendTheme(lightTheme, {
  colors: { shadow: lightTheme.colors.background },
});

export const unavailableActionBrand = extendTheme(lightTheme, {
  colors: { disabled: lightTheme.colors.secondary },
});

export const flatSkeletonBrand = extendTheme(lightTheme, {
  colors: { skeleton: lightTheme.colors.popover },
});

export const panelShadowBrand = extendTheme(lightTheme, {
  colors: { shadow: lightTheme.colors.secondary },
});

export const flatSelectionBrand = extendTheme(lightTheme, {
  colors: { accent: lightTheme.colors.selected },
});

export const softRuleBrand = extendTheme(lightTheme, {
  colors: { border: "#F7F7F7", background: lightTheme.colors.card },
});

export const report = (theme: Theme): ReadonlyArray<string> =>
  decorativeFailures(theme).map(
    ({ surface, level, role, over, ratio }) =>
      `${surface}${level === undefined ? "" : `.${level}`}: ${role} on ${over} is ${ratio === undefined ? "unmeasurable" : ratio.toFixed(2)}`,
  );

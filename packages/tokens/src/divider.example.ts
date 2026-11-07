import {
  contrastRatio,
  dividerFailures,
  dividerOn,
  extendTheme,
  lightTheme,
  platformTheme,
  pointerWash,
  themes,
  type DividerWash,
  type PointerWashSurface,
  type Theme,
} from "./index.js";

export const rowRule = (theme: Theme, wash: DividerWash): string | undefined =>
  dividerOn(theme, theme.colors[wash]);

export const ruleSeparation = (
  theme: Theme,
  wash: DividerWash,
): number | undefined => {
  const rule = rowRule(theme, wash);
  return rule === undefined
    ? undefined
    : contrastRatio(rule, theme.colors[wash]);
};

export const pressRule = (
  theme: Theme,
  replaced: PointerWashSurface,
): string | undefined => {
  const wash = pointerWash(theme, "active", replaced);
  return wash === undefined ? undefined : dividerOn(theme, wash);
};

export const pressSeparation = (
  theme: Theme,
  replaced: PointerWashSurface,
): number | undefined => {
  const rule = pressRule(theme, replaced);
  const wash = pointerWash(theme, "active", replaced);
  return rule === undefined || wash === undefined
    ? undefined
    : contrastRatio(rule, wash);
};

export const swallowedRuleBrand = extendTheme(lightTheme, {
  colors: { borderStrong: lightTheme.colors.accent },
});

const authoredPress =
  pointerWash(platformTheme(themes.light, "darwin"), "active", "hover") ??
  lightTheme.colors.active;

export const swallowedPressBrand = extendTheme(
  platformTheme(themes.light, "darwin"),
  { colors: { border: authoredPress, borderStrong: authoredPress } },
);

export const reportRules = (theme: Theme): ReadonlyArray<string> =>
  dividerFailures(theme).map(
    ({ surface, role, over, ratio }) =>
      `${role} on ${surface === "pressedDivider" ? `the press over ${over}` : over} is ${
        ratio === undefined ? "unmeasurable" : ratio.toFixed(2)
      }`,
  );

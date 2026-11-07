import {
  contrastRatio,
  extendTheme,
  lightTheme,
  pointerWash,
  pointerWashFailures,
  type Theme,
} from "./index.js";

export const flatPressBrand = extendTheme(lightTheme, {
  colors: { active: lightTheme.colors.accent },
});

export const invisiblePressBrand = extendTheme(lightTheme, {
  colors: {
    active: lightTheme.colors.accent,
    foreground: lightTheme.colors.accent,
  },
});

export const pressWash = (
  theme: Theme,
  replaced: "accent" | "hover",
): string | undefined => pointerWash(theme, "active", replaced);

export const pressSeparation = (
  theme: Theme,
  replaced: "accent" | "hover",
): number | undefined => {
  const painted = pressWash(theme, replaced);
  return painted === undefined
    ? undefined
    : contrastRatio(painted, theme.colors[replaced]);
};

export const reportPointerWashes = (theme: Theme): ReadonlyArray<string> =>
  pointerWashFailures(theme).map(
    ({ role, over, ratio }) =>
      `${role} on ${over} is ${
        ratio === undefined ? "unmeasurable" : ratio.toFixed(2)
      }`,
  );
